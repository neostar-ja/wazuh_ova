#!/usr/bin/env python3
"""
Wazuh custom integration for real-time MISP enrichment.

Wazuh integratord calls this script with the alert JSON path. The script queries
MISP for observable values in the alert and prints a compact enrichment event.
"""

from __future__ import annotations

import ipaddress
import json
import logging
import os
import sys
from pathlib import Path
from typing import Any

import requests
from urllib3.exceptions import InsecureRequestWarning

requests.packages.urllib3.disable_warnings(InsecureRequestWarning)

ENV_FILES = ("/opt/code/wazuh_ova/.env", "/etc/misp-integration.env")
LOG_FILE = os.environ.get("MISP_INTEGRATION_LOG", "/var/ossec/logs/integrations.log")


def setup_logging() -> None:
    handlers: list[logging.Handler] = [logging.StreamHandler(sys.stderr)]
    try:
        handlers.append(logging.FileHandler(LOG_FILE))
    except PermissionError:
        pass
    logging.basicConfig(level=logging.INFO, format="%(asctime)s custom-misp %(levelname)s %(message)s", handlers=handlers)


def load_env() -> dict[str, str]:
    env: dict[str, str] = {}
    for env_file in ENV_FILES:
        path = Path(env_file)
        if not path.exists():
            continue
        for raw in path.read_text().splitlines():
            line = raw.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            env[key.strip()] = value.strip().strip('"').strip("'")
    env.update({k: v for k, v in os.environ.items() if k.startswith("MISP_")})
    return env


def nested_get(data: dict[str, Any], *paths: str) -> str:
    for path in paths:
        cur: Any = data
        for part in path.split("."):
            if not isinstance(cur, dict):
                cur = None
                break
            cur = cur.get(part)
        if cur not in (None, ""):
            return str(cur)
    return ""


def is_public_ip(value: str) -> bool:
    try:
        ip = ipaddress.ip_address(value)
        return not (ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_multicast or ip.is_reserved)
    except ValueError:
        return False


def query_misp(misp_url: str, misp_key: str, value: str, search_type: str = "") -> list[dict[str, Any]]:
    headers = {
        "Authorization": misp_key,
        "Accept": "application/json",
        "Content-Type": "application/json",
    }
    payload: dict[str, Any] = {"returnFormat": "json", "value": value, "to_ids": 1, "enforceWarninglist": 1}
    if search_type:
        payload["type"] = search_type
    try:
        response = requests.post(
            f"{misp_url.rstrip('/')}/attributes/restSearch",
            headers=headers,
            json=payload,
            verify=False,
            timeout=10,
        )
        response.raise_for_status()
        data = response.json()
        attrs = data.get("response", {}).get("Attribute", [])
        return attrs if isinstance(attrs, list) else []
    except Exception as exc:
        logging.error("MISP query error for %s: %s", value, exc)
        return []


def observables(alert: dict[str, Any]) -> list[tuple[str, str]]:
    data = alert.get("data", {}) if isinstance(alert.get("data"), dict) else {}
    syscheck = alert.get("syscheck", {}) if isinstance(alert.get("syscheck"), dict) else {}

    found: list[tuple[str, str]] = []
    for field in ("srcip", "src_ip", "dstip", "dst_ip"):
        value = str(data.get(field, "")).strip()
        if value and is_public_ip(value):
            found.append((value, ""))

    for value in (
        nested_get(alert, "data.dns_domain", "data.hostname", "data.url"),
        nested_get(alert, "data.query", "data.fqdn"),
    ):
        if value:
            found.append((value, ""))

    for field in ("sha256_after", "sha256", "md5_after", "md5"):
        value = str(syscheck.get(field, "")).strip()
        if len(value) in (32, 64):
            found.append((value, ""))

    deduped = []
    seen = set()
    for value, search_type in found:
        key = (value, search_type)
        if key not in seen:
            seen.add(key)
            deduped.append(key)
    return deduped


def main() -> int:
    setup_logging()
    if len(sys.argv) < 2:
        return 0

    env = load_env()
    misp_url = env.get("MISP_URL") or (sys.argv[3] if len(sys.argv) > 3 else "https://10.251.151.15:4430")
    misp_key = env.get("MISP_API_KEY") or (sys.argv[2] if len(sys.argv) > 2 else "")
    if not misp_key:
        logging.error("No MISP API key configured")
        return 0

    try:
        alert = json.loads(Path(sys.argv[1]).read_text())
    except Exception as exc:
        logging.error("Cannot read alert file %s: %s", sys.argv[1], exc)
        return 0

    matches: list[dict[str, Any]] = []
    matched_value = ""
    for value, search_type in observables(alert):
        attrs = query_misp(misp_url, misp_key, value, search_type)
        if attrs:
            matches.extend(attrs)
            matched_value = value
            break

    if not matches:
        logging.debug("No MISP match for alert %s", alert.get("id", "?"))
        return 0

    first = matches[0]
    output = {
        "integration": "misp",
        "misp": {
            "value": first.get("value") or matched_value,
            "type": first.get("type"),
            "category": first.get("category"),
            "comment": first.get("comment", ""),
            "event_id": first.get("event_id"),
            "to_ids": first.get("to_ids"),
            "timestamp": first.get("timestamp"),
            "total_matches": len(matches),
        },
    }
    logging.info("MISP IOC found: %s category=%s matches=%d", output["misp"]["value"], output["misp"]["category"], len(matches))
    print(json.dumps(output, separators=(",", ":")))
    return 0


if __name__ == "__main__":
    sys.exit(main())
