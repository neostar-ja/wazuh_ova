#!/usr/bin/env python3
"""
Simulate dangerous MikroTik RouterOS traffic and admin activity for Wazuh testing.

Modes:
  - list:    print all scenarios
  - logtest: validate decoder/rule matching through Wazuh API /logtest
  - live:    send RFC3164 syslog to the worker and verify indexed alerts in OpenSearch
  - auto:    run logtest, then live verification

This script intentionally includes scenarios that expose current detection gaps,
such as MikroTik ICMP/proto-only firewall formats that may decode incorrectly or
fail to alert. The summary makes those failures explicit.
"""

from __future__ import annotations

import argparse
import base64
import json
import socket
import ssl
import sys
import time
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_ENV = REPO_ROOT / ".env"
DEFAULT_WAZUH_API_URL = "https://10.251.151.11:55000"
DEFAULT_INDEXER_URL = "https://10.251.151.13:9200"
DEFAULT_WORKER_TARGET = "10.251.151.12"
DEFAULT_SYSLOG_PORT = 514


@dataclass(frozen=True)
class Scenario:
    scenario_id: str
    category: str
    name: str
    event: str
    expected_decoders: tuple[str, ...]
    expected_rules: tuple[str, ...]
    expected_min_level: int
    required_fields: tuple[str, ...]
    note: str


def parse_env(path: Path) -> dict[str, str]:
    env: dict[str, str] = {}
    if not path.exists():
        return env

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in {"'", '"'}:
            value = value[1:-1]
        env[key.strip()] = value
    return env


def basic_auth_header(username: str, password: str) -> str:
    token = base64.b64encode(f"{username}:{password}".encode("utf-8")).decode("ascii")
    return f"Basic {token}"


def request_text(
    url: str,
    method: str = "GET",
    headers: dict[str, str] | None = None,
    payload: bytes | None = None,
) -> str:
    request = Request(url, data=payload, headers=headers or {}, method=method)
    context = ssl._create_unverified_context()
    try:
        with urlopen(request, timeout=30, context=context) as response:
            return response.read().decode("utf-8")
    except HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"{method} {url} failed: HTTP {exc.code} {detail}") from exc
    except URLError as exc:
        raise RuntimeError(f"{method} {url} failed: {exc.reason}") from exc


def request_json(
    url: str,
    method: str = "GET",
    headers: dict[str, str] | None = None,
    payload: dict[str, Any] | None = None,
) -> dict[str, Any]:
    data = None
    req_headers = dict(headers or {})
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        req_headers.setdefault("Content-Type", "application/json")
    body = request_text(url, method=method, headers=req_headers, payload=data)
    return json.loads(body) if body else {}


def get_wazuh_token(base_url: str, username: str, password: str) -> str:
    return request_text(
        f"{base_url.rstrip('/')}/security/user/authenticate?raw=true",
        method="POST",
        headers={"Authorization": basic_auth_header(username, password)},
    ).strip()


def run_logtest(
    base_url: str,
    token: str,
    event: str,
    location: str,
) -> dict[str, Any]:
    return request_json(
        f"{base_url.rstrip('/')}/logtest",
        method="PUT",
        headers={"Authorization": f"Bearer {token}"},
        payload={
            "event": event,
            "log_format": "syslog",
            "location": location,
        },
    )


def search_alert_by_full_log(
    base_url: str,
    username: str,
    password: str,
    scenario: Scenario,
    start_time: str,
) -> dict[str, Any] | None:
    rule_filters: list[dict[str, Any]] = []
    if scenario.expected_rules:
        rule_filters = [{"terms": {"rule.id": list(scenario.expected_rules)}}]

    body = {
        "size": 5,
        "sort": [{"@timestamp": {"order": "desc"}}],
        "query": {
            "bool": {
                "must": [{"match_phrase": {"full_log": scenario.event}}],
                "filter": [{"range": {"@timestamp": {"gte": start_time}}}] + rule_filters,
            }
        },
        "_source": [
            "@timestamp",
            "rule.id",
            "rule.level",
            "rule.description",
            "decoder.name",
            "full_log",
            "data",
            "location",
        ],
    }
    response = request_json(
        f"{base_url.rstrip('/')}/wazuh-alerts-4.x-*/_search",
        method="POST",
        headers={"Authorization": basic_auth_header(username, password)},
        payload=body,
    )
    hits = response.get("hits", {}).get("hits", [])
    return hits[0].get("_source") if hits else None


def get_nested(data: dict[str, Any], dotted_path: str) -> Any:
    current: Any = data
    for part in dotted_path.split("."):
        if not isinstance(current, dict) or part not in current:
            return None
        current = current[part]
    return current


def scenario_nonce() -> str:
    return datetime.now(timezone.utc).strftime("%H%M%S")


def build_scenarios(tag: str) -> list[Scenario]:
    return [
        Scenario(
            scenario_id="fw_tcp_new_nat_c2",
            category="firewall",
            name="New TCP C2 connection via NAT",
            event=(
                f"firewall,info prerouting: in:LAN out:(unknown 0), connection-state:new,snat "
                f"src-mac b0:19:21:11:45:50, proto TCP (SYN), 10.252.0.66:{58000 + int(tag[-2:])}"
                f"->198.51.100.77:4444, NAT (10.252.0.66:{58000 + int(tag[-2:])}"
                f"->1.20.198.230:{58000 + int(tag[-2:])})->198.51.100.77:4444, len 60"
            ),
            expected_decoders=("mikrotik-firewall",),
            expected_rules=("101054",),
            expected_min_level=5,
            required_fields=(
                "data.protocol",
                "data.srcip",
                "data.srcport",
                "data.dstip",
                "data.dstport",
                "data.nat_public_ip",
                "data.connection_state",
            ),
            note="High-risk new outbound TCP session should be visible as a new connection alert.",
        ),
        Scenario(
            scenario_id="fw_tcp_established_nat_c2",
            category="firewall",
            name="Established TCP C2 beacon via NAT",
            event=(
                f"firewall,info prerouting: in:LAN out:(unknown 0), connection-state:established,snat "
                f"src-mac b0:19:21:11:45:50, proto TCP (ACK), 10.252.0.66:{58100 + int(tag[-2:])}"
                f"->203.0.113.88:8443, NAT (10.252.0.66:{58100 + int(tag[-2:])}"
                f"->1.20.198.230:{58100 + int(tag[-2:])})->203.0.113.88:8443, len 40"
            ),
            expected_decoders=("mikrotik-firewall",),
            expected_rules=("101053",),
            expected_min_level=4,
            required_fields=(
                "data.protocol",
                "data.srcip",
                "data.srcport",
                "data.dstip",
                "data.dstport",
                "data.nat_public_ip",
                "data.tcp_flags",
            ),
            note="Established TCP traffic should retain parsed fields for threat hunting and IOC enrichment.",
        ),
        Scenario(
            scenario_id="fw_udp_established_nat_dns_tunnel",
            category="firewall",
            name="Established UDP DNS tunneling style flow",
            event=(
                f"firewall,info prerouting: in:LAN out:(unknown 0), connection-state:established,snat "
                f"src-mac aa:bb:cc:dd:ee:01, proto UDP, 10.252.0.77:{53000 + int(tag[-2:])}"
                f"->198.51.100.53:53, NAT (10.252.0.77:{53000 + int(tag[-2:])}"
                f"->1.20.198.230:{53000 + int(tag[-2:])})->198.51.100.53:53, len 512"
            ),
            expected_decoders=("mikrotik-firewall",),
            expected_rules=("101052",),
            expected_min_level=4,
            required_fields=(
                "data.protocol",
                "data.srcip",
                "data.srcport",
                "data.dstip",
                "data.dstport",
                "data.nat_public_ip",
            ),
            note="UDP NAT flows must stay queryable for suspicious DNS activity analysis.",
        ),
        Scenario(
            scenario_id="fw_udp_new_nat_ntp_amp",
            category="firewall",
            name="New UDP amplification-style flow",
            event=(
                f"firewall,info prerouting: in:LAN out:(unknown 0), connection-state:new,snat "
                f"src-mac aa:bb:cc:dd:ee:02, proto UDP, 10.252.0.78:{54000 + int(tag[-2:])}"
                f"->203.0.113.123:123, NAT (10.252.0.78:{54000 + int(tag[-2:])}"
                f"->1.20.198.230:{54000 + int(tag[-2:])})->203.0.113.123:123, len 468"
            ),
            expected_decoders=("mikrotik-firewall",),
            expected_rules=("101054",),
            expected_min_level=5,
            required_fields=(
                "data.protocol",
                "data.srcip",
                "data.srcport",
                "data.dstip",
                "data.dstport",
                "data.nat_public_ip",
                "data.connection_state",
            ),
            note="A new outbound UDP flow should still surface as a new connection event.",
        ),
        Scenario(
            scenario_id="fw_icmp_nat_recon",
            category="firewall",
            name="ICMP recon through NAT",
            event=(
                "firewall,info prerouting: in:LAN out:(unknown 0), connection-state:new,snat "
                "src-mac e0:63:da:87:9f:93, proto ICMP (type 8, code 0), "
                "10.252.0.105->8.8.8.8, NAT (10.252.0.105->1.20.198.230)->8.8.8.8, len 84"
            ),
            expected_decoders=("mikrotik-firewall-icmp-nat",),
            expected_rules=("101050", "101054"),
            expected_min_level=3,
            required_fields=(
                "data.protocol",
                "data.srcip",
                "data.dstip",
                "data.nat_public_ip",
                "data.connection_state",
            ),
            note="ICMP NAT logs should decode with real IP fields, not a generic empty firewall alert.",
        ),
        Scenario(
            scenario_id="fw_tcp_no_nat_lateral",
            category="firewall",
            name="East-west lateral TCP movement",
            event=(
                f"firewall,info forward: in:LAN out:SERVERS, connection-state:new,snat "
                f"src-mac aa:bb:cc:dd:ee:10, proto TCP (SYN), 10.252.1.25:{59000 + int(tag[-2:])}"
                f"->10.252.1.40:3389, len 60"
            ),
            expected_decoders=("mikrotik-firewall-no-nat",),
            expected_rules=("101051",),
            expected_min_level=3,
            required_fields=(
                "data.protocol",
                "data.srcip",
                "data.srcport",
                "data.dstip",
                "data.dstport",
                "data.connection_state",
            ),
            note="Internal lateral movement must not disappear just because NAT fields are absent.",
        ),
        Scenario(
            scenario_id="fw_udp_no_nat_snmp_scan",
            category="firewall",
            name="East-west UDP scan",
            event=(
                f"firewall,info forward: in:LAN out:SERVERS, connection-state:established,snat "
                f"src-mac aa:bb:cc:dd:ee:11, proto UDP, 10.252.1.26:{59500 + int(tag[-2:])}"
                f"->10.252.1.50:161, len 128"
            ),
            expected_decoders=("mikrotik-firewall-no-nat",),
            expected_rules=("101051",),
            expected_min_level=3,
            required_fields=(
                "data.protocol",
                "data.srcip",
                "data.srcport",
                "data.dstip",
                "data.dstport",
                "data.connection_state",
            ),
            note="Internal UDP recon should stay visible as firewall-no-nat traffic.",
        ),
        Scenario(
            scenario_id="fw_proto_only_gre_tunnel",
            category="firewall",
            name="Protocol-only GRE tunnel attempt",
            event=(
                "firewall,info prerouting: in:LAN out:(unknown 0), connection-state:new "
                "src-mac 9c:7b:ef:4a:66:1e, proto 47, 10.252.0.60->198.51.100.200, len 124"
            ),
            expected_decoders=("mikrotik-firewall-proto",),
            expected_rules=("101050", "101051"),
            expected_min_level=3,
            required_fields=(
                "data.protocol",
                "data.srcip",
                "data.dstip",
                "data.connection_state",
            ),
            note="Proto-only firewall events are dangerous because tunneling attempts can hide here.",
        ),
        Scenario(
            scenario_id="fw_icmp_no_nat_ping_sweep",
            category="firewall",
            name="Internal ICMP sweep without NAT",
            event=(
                "firewall,info prerouting: in:LAN out:(unknown 0), connection-state:new "
                "src-mac ff:ff:ff:ff:ff:ff, proto ICMP (type 8, code 0), 10.252.1.90->10.252.1.1, len 84"
            ),
            expected_decoders=("mikrotik-firewall-icmp-nonat",),
            expected_rules=("101050", "101051"),
            expected_min_level=3,
            required_fields=(
                "data.protocol",
                "data.srcip",
                "data.dstip",
                "data.connection_state",
            ),
            note="ICMP no-NAT reconnaissance should generate a usable alert with parsed fields.",
        ),
        Scenario(
            scenario_id="auth_login_failure_winbox",
            category="auth",
            name="Winbox brute-force failure",
            event=f"system,error,critical login failure for user admin{tag} from 203.0.113.45 via winbox",
            expected_decoders=("mikrotik-user-login-failure",),
            expected_rules=("101003",),
            expected_min_level=11,
            required_fields=("data.srcip", "data.username", "data.access_method"),
            note="Failed Winbox logins are high-value auth events and should parse cleanly.",
        ),
        Scenario(
            scenario_id="auth_wireguard_remote_login",
            category="auth",
            name="Suspicious WireGuard remote login",
            event=f"wireguard user backup{tag} logged in from 198.51.100.60",
            expected_decoders=("mikrotik-wireguard",),
            expected_rules=("101004",),
            expected_min_level=10,
            required_fields=("data.srcip", "data.username", "data.action"),
            note="WireGuard access should be visible for post-compromise tracing.",
        ),
        Scenario(
            scenario_id="auth_ovpn_remote_login",
            category="auth",
            name="Suspicious OVPN remote login",
            event=f"eviladmin{tag} logged in, 10.8.0.66 from 198.51.100.61",
            expected_decoders=("mikrotik-ovpn",),
            expected_rules=("101005",),
            expected_min_level=10,
            required_fields=("data.srcip", "data.username", "data.localip", "data.action"),
            note="OpenVPN logins should preserve both remote and local tunnel IPs.",
        ),
        Scenario(
            scenario_id="cfg_filter_rule_backdoor",
            category="config",
            name="Firewall rule backdoor added",
            event=(
                f"filter rule added by tcp-msg(winbox):eviladmin{tag}@198.51.100.62 "
                f"(chain=forward action=accept src-address=0.0.0.0/0 dst-port=3389 comment=TEMP-OPEN-RDP-{tag})"
            ),
            expected_decoders=("mikrotik-filter-rule-change",),
            expected_rules=("101006",),
            expected_min_level=12,
            required_fields=("data.action", "data.srcip", "data.username", "data.rule_details"),
            note="A malicious admin opening RDP should be Telegram-eligible immediately.",
        ),
        Scenario(
            scenario_id="cfg_raw_notrack_bypass",
            category="config",
            name="RAW notrack bypass change",
            event=(
                f"raw rule changed by tcp-msg(winbox):eviladmin{tag}@198.51.100.63 "
                f"(chain=prerouting action=notrack src-address=198.51.100.0/24 comment=BYPASS-{tag})"
            ),
            expected_decoders=("mikrotik-raw-rule-change",),
            expected_rules=("101007",),
            expected_min_level=12,
            required_fields=("data.action", "data.srcip", "data.username", "data.rule_details"),
            note="RAW bypasses are strong indicators of defense evasion and must alert loudly.",
        ),
        Scenario(
            scenario_id="cfg_user_backdoor_added",
            category="config",
            name="Backdoor admin user added",
            event=(
                f"user backdoor{tag} added by tcp-msg(winbox):eviladmin{tag}@198.51.100.64 "
                f"(group=full address=0.0.0.0/0 comment=BACKDOOR-{tag})"
            ),
            expected_decoders=("mikrotik-user-change",),
            expected_rules=("101008",),
            expected_min_level=12,
            required_fields=("data.newuser", "data.action", "data.srcip", "data.username"),
            note="Unauthorized admin creation should be captured as identity tampering.",
        ),
        Scenario(
            scenario_id="cfg_generic_service_reenabled",
            category="config",
            name="Risky service re-enabled",
            event=(
                f"ip service changed by tcp-msg(winbox):eviladmin{tag}@198.51.100.65 "
                f"(name=api disabled=no address=0.0.0.0/0 comment=REOPEN-{tag})"
            ),
            expected_decoders=("mikrotik-log",),
            expected_rules=("101001",),
            expected_min_level=12,
            required_fields=("data.type", "data.target", "data.action", "data.srcip", "data.username"),
            note="Generic Winbox changes should still retain object type/target/action for triage.",
        ),
    ]


def evaluate_result(
    scenario: Scenario,
    source: dict[str, Any],
    *,
    alert_flag: bool | None,
) -> tuple[bool, list[str]]:
    failures: list[str] = []

    if alert_flag is False:
        failures.append("no alert generated")
        return False, failures

    decoder = get_nested(source, "decoder.name")
    rule_id = str(get_nested(source, "rule.id") or "")
    level = get_nested(source, "rule.level")

    if decoder not in scenario.expected_decoders:
        failures.append(
            f"decoder mismatch: expected one of {scenario.expected_decoders}, got {decoder or 'NONE'}"
        )
    if scenario.expected_rules and rule_id not in scenario.expected_rules:
        failures.append(
            f"rule mismatch: expected one of {scenario.expected_rules}, got {rule_id or 'NONE'}"
        )
    if not isinstance(level, int) or level < scenario.expected_min_level:
        failures.append(
            f"level too low: expected >= {scenario.expected_min_level}, got {level!r}"
        )

    missing_fields = [
        field for field in scenario.required_fields if get_nested(source, field) in (None, "", [])
    ]
    if missing_fields:
        failures.append(f"missing parsed fields: {', '.join(missing_fields)}")

    return not failures, failures


def send_syslog(worker_target: str, port: int, event: str) -> None:
    timestamp = datetime.now().strftime("%b %d %H:%M:%S").replace(" 0", "  ")
    packet = f"<134>{timestamp} mikrotik-test {event}"
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        sock.sendto(packet.encode("utf-8"), (worker_target, port))
    finally:
        sock.close()


def print_result(prefix: str, scenario: Scenario, passed: bool, details: str) -> None:
    status = "PASS" if passed else "FAIL"
    print(f"[{status}][{prefix}] {scenario.scenario_id}: {scenario.name}")
    print(f"  Category : {scenario.category}")
    print(f"  Note     : {scenario.note}")
    print(f"  Result   : {details}")


def select_scenarios(all_scenarios: list[Scenario], selectors: list[str]) -> list[Scenario]:
    if not selectors:
        return all_scenarios
    selected: list[Scenario] = []
    for scenario in all_scenarios:
        if scenario.scenario_id in selectors or scenario.category in selectors:
            selected.append(scenario)
    return selected


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--mode", choices=("list", "logtest", "live", "auto"), default="auto")
    parser.add_argument("--env-file", default=str(DEFAULT_ENV))
    parser.add_argument("--wazuh-api-url", default=DEFAULT_WAZUH_API_URL)
    parser.add_argument("--indexer-url", default=DEFAULT_INDEXER_URL)
    parser.add_argument("--worker-target", default=None)
    parser.add_argument("--syslog-port", type=int, default=DEFAULT_SYSLOG_PORT)
    parser.add_argument("--location", default="10.252.0.1")
    parser.add_argument("--wait-seconds", type=int, default=12)
    parser.add_argument("--retry-interval", type=float, default=1.0)
    parser.add_argument(
        "--scenario",
        action="append",
        default=[],
        help="Run only selected scenario IDs or categories. Repeatable.",
    )
    args = parser.parse_args()

    env = parse_env(Path(args.env_file))
    worker_target = args.worker_target or env.get("WORKER_TARGET") or DEFAULT_WORKER_TARGET
    wazuh_api_user = env.get("wazuh_api_username", "wazuh-wui")
    wazuh_api_pass = env.get("wazuh_api_password", "")
    indexer_user = env.get("wazuh_open_search_username", "admin")
    indexer_pass = env.get("wazuh_open_search_password", "")

    tag = scenario_nonce()
    scenarios = select_scenarios(build_scenarios(tag), args.scenario)
    if not scenarios:
        print("No scenarios matched --scenario filters.", file=sys.stderr)
        return 2

    if args.mode == "list":
        for scenario in scenarios:
            print(f"{scenario.scenario_id:28} {scenario.category:9} {scenario.name}")
        return 0

    failures = 0
    token = None
    if args.mode in {"logtest", "auto"}:
        token = get_wazuh_token(args.wazuh_api_url, wazuh_api_user, wazuh_api_pass)
        print(f"Running {len(scenarios)} MikroTik scenarios through Wazuh API /logtest")
        for scenario in scenarios:
            response = run_logtest(args.wazuh_api_url, token, scenario.event, args.location)
            output = response.get("data", {}).get("output", {})
            alert_flag = response.get("data", {}).get("alert")
            passed, reasons = evaluate_result(scenario, output, alert_flag=alert_flag)
            details = (
                f"decoder={get_nested(output, 'decoder.name') or 'NONE'} "
                f"rule={get_nested(output, 'rule.id') or 'NONE'} "
                f"level={get_nested(output, 'rule.level')!r}"
            )
            if reasons:
                details += f" | {'; '.join(reasons)}"
            print_result("logtest", scenario, passed, details)
            if not passed:
                failures += 1

    if args.mode in {"live", "auto"}:
        start_time = (datetime.now(timezone.utc) - timedelta(minutes=1)).isoformat()
        print(
            f"Injecting {len(scenarios)} MikroTik scenarios to {worker_target}:{args.syslog_port} "
            f"and verifying indexed alerts in OpenSearch"
        )
        for scenario in scenarios:
            send_syslog(worker_target, args.syslog_port, scenario.event)
            hit: dict[str, Any] | None = None
            deadline = time.time() + args.wait_seconds
            while time.time() < deadline:
                hit = search_alert_by_full_log(
                    args.indexer_url,
                    indexer_user,
                    indexer_pass,
                    scenario,
                    start_time,
                )
                if hit:
                    break
                time.sleep(args.retry_interval)
            passed, reasons = evaluate_result(scenario, hit or {}, alert_flag=bool(hit))
            details = (
                f"decoder={get_nested(hit or {}, 'decoder.name') or 'NONE'} "
                f"rule={get_nested(hit or {}, 'rule.id') or 'NONE'} "
                f"level={get_nested(hit or {}, 'rule.level')!r}"
            )
            if reasons:
                details += f" | {'; '.join(reasons)}"
            print_result("live", scenario, passed, details)
            if not passed:
                failures += 1

    if failures:
        print(f"Completed with {failures} failing scenario checks.", file=sys.stderr)
        return 1

    print("All selected MikroTik scenario checks passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
