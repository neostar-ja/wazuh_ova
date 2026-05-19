#!/bin/bash
set -euo pipefail

WORKER_TARGET="${WORKER_TARGET:-10.251.151.12}"
MANAGER_TARGET="${MANAGER_TARGET:-10.251.151.11}"
USERNAME="${USERNAME:-wazuh-user}"
PASSWORD="${PASSWORD:-wazuh}"
SYSLOG_PORT="${SYSLOG_PORT:-514}"
INFOBLOX_HOSTNAME="${INFOBLOX_HOSTNAME:-infoblox-gm}"
PROGRAM_NAME="${PROGRAM_NAME:-named}"
PROGRAM_PID="${PROGRAM_PID:-1234}"
CLIENT_IP="${CLIENT_IP:-10.251.1.50}"
CLIENT_PORT="${CLIENT_PORT:-54323}"
DOMAIN="${DOMAIN:-ransomware.evil.com}"
RPZ_POLICY="${RPZ_POLICY:-rpz.malware-domains}"
WAIT_SECONDS="${WAIT_SECONDS:-6}"
TELEGRAM_RULE_LEVEL="${TELEGRAM_RULE_LEVEL:-12}"
MODE="${1:-auto}"

EXPECTED_RULE_PRIMARY="120050"
EXPECTED_RULE_SECONDARY="100430"

SSH_OPTS=(
    -o StrictHostKeyChecking=no
    -o UserKnownHostsFile=/dev/null
    -o LogLevel=ERROR
    -o ConnectTimeout=10
    -o PubkeyAuthentication=no
    -o PreferredAuthentications=password
    -o NumberOfPasswordPrompts=1
)

die() {
    echo "ERROR: $*" >&2
    exit 1
}

require_cmd() {
    local cmd
    for cmd in "$@"; do
        command -v "${cmd}" >/dev/null 2>&1 || die "Missing required command: ${cmd}"
    done
}

worker_ssh() {
    sshpass -p "${PASSWORD}" ssh "${SSH_OPTS[@]}" "${USERNAME}@${WORKER_TARGET}" "$@"
}

manager_ssh() {
    sshpass -p "${PASSWORD}" ssh "${SSH_OPTS[@]}" "${USERNAME}@${MANAGER_TARGET}" "$@"
}

manager_scp() {
    local src="$1" dst="$2"
    sshpass -p "${PASSWORD}" scp "${SSH_OPTS[@]}" "${src}" "${USERNAME}@${MANAGER_TARGET}:${dst}"
}

worker_auth_check() {
    worker_ssh "exit" >/dev/null 2>&1 || \
        die "SSH login failed for ${USERNAME}@${WORKER_TARGET}. Check WORKER_TARGET/USERNAME/PASSWORD."
}

manager_auth_check() {
    manager_ssh "exit" >/dev/null 2>&1 || \
        die "SSH login failed for ${USERNAME}@${MANAGER_TARGET}. Check MANAGER_TARGET/USERNAME/PASSWORD."
}

print_config() {
    echo "Mode           : ${MODE}"
    echo "Worker target  : ${WORKER_TARGET}"
    echo "Manager target : ${MANAGER_TARGET}"
    echo "Username       : ${USERNAME}"
    echo "Client IP      : ${CLIENT_IP}"
    echo "Domain         : ${DOMAIN}"
    echo "RPZ policy     : ${RPZ_POLICY}"
    echo "Wait seconds   : ${WAIT_SECONDS}"
    echo "Telegram level : ${TELEGRAM_RULE_LEVEL}"
}

build_syslog_line() {
    python3 - <<'PY'
from datetime import datetime
import os
pri = "<132>"
ts = datetime.now().strftime("%b %d %H:%M:%S").replace(" 0", "  ")
host = os.environ["INFOBLOX_HOSTNAME"]
program = os.environ["PROGRAM_NAME"]
pid = os.environ["PROGRAM_PID"]
client_ip = os.environ["CLIENT_IP"]
client_port = os.environ["CLIENT_PORT"]
domain = os.environ["DOMAIN"]
policy = os.environ["RPZ_POLICY"]
message = f"client {client_ip}#{client_port}: rpz QNAME Policy Rewrite {domain}/A/IN via {policy}"
print(f"{pri}{ts} {host} {program}[{pid}]: {message}")
PY
}

send_live_syslog() {
    local syslog_line="$1"
    export SYSLOG_LINE="${syslog_line}" WORKER_TARGET SYSLOG_PORT
    python3 - <<'PY'
import os
import socket
line = os.environ["SYSLOG_LINE"]
host = os.environ["WORKER_TARGET"]
port = int(os.environ["SYSLOG_PORT"])
sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
sock.sendto(line.encode("utf-8"), (host, port))
sock.close()
print(line)
PY
}

check_live_alerts() {
    manager_ssh "
        sudo python3 - <<'PY'
from collections import deque
import json

targets = {'${EXPECTED_RULE_PRIMARY}', '${EXPECTED_RULE_SECONDARY}'}
domain = '${DOMAIN}'
paths = [
    '/var/ossec/logs/alerts/alerts.json',
    '/var/ossec/logs/archives/archives.json',
]

found = []
for path in paths:
    try:
        with open(path, 'r', encoding='utf-8', errors='ignore') as handle:
            lines = deque(handle, maxlen=600)
    except FileNotFoundError:
        continue
    for line in lines:
        line = line.strip()
        if not line.startswith('{'):
            continue
        try:
            obj = json.loads(line)
        except Exception:
            continue
        rule = obj.get('rule', {})
        desc = rule.get('description', '')
        if rule.get('id') in targets or domain in line or domain in desc:
            found.append(line)

if found:
    print(found[-1])
    raise SystemExit(0)

print('(Live alert not found in manager alerts/archives)')
raise SystemExit(1)
PY
    "
}

run_logtest() {
    local syslog_line="$1" clean_line tmp_file
    clean_line="$(printf '%s\n' "${syslog_line}" | sed -E 's/^<[^>]+>//')"
    tmp_file="$(mktemp)"
    printf '%s\n' "${clean_line}" > "${tmp_file}"
    manager_scp "${tmp_file}" "/tmp/malicious_domain_access_test.log" >/dev/null
    manager_ssh "
        sudo bash -lc '
            /var/ossec/bin/wazuh-logtest < /tmp/malicious_domain_access_test.log
            rc=\$?
            rm -f /tmp/malicious_domain_access_test.log
            exit \${rc}
        '
    "
    rm -f "${tmp_file}"
}

run_generic_telegram_test() {
    local fixture_file
    fixture_file="$(mktemp)"
    cat > "${fixture_file}" <<EOF
{"rule":{"id":"${EXPECTED_RULE_PRIMARY}","level":${TELEGRAM_RULE_LEVEL},"description":"PCI 11.4 / NIST SI.4: DNS Firewall blocked malicious domain [TEST] ${DOMAIN}","groups":["compliance","dns","infoblox_dns","infoblox_threat"]},"agent":{"name":"infoblox-gm"},"data":{"srcip":"${CLIENT_IP}","dns_domain":"${DOMAIN}","rpz_policy":"${RPZ_POLICY}"}} 
EOF
    manager_scp "${fixture_file}" "/tmp/malicious_domain_telegram_fixture.json" >/dev/null
    rm -f "${fixture_file}"
    manager_ssh "
        sudo python3 - <<'PY'
import re
import subprocess
import sys

with open('/var/ossec/etc/ossec.conf', 'r', encoding='utf-8') as handle:
    content = handle.read()

match = re.search(
    r'<integration>\\s*'
    r'<name>\\s*custom-telegram\\.py\\s*</name>.*?'
    r'<hook_url>\\s*(?P<hook>[^<]+)\\s*</hook_url>.*?'
    r'<api_key>\\s*(?P<chat>[^<]+)\\s*</api_key>.*?'
    r'</integration>',
    content,
    re.DOTALL,
)

if not match:
    print('Telegram integration config not found in ossec.conf', file=sys.stderr)
    raise SystemExit(1)

hook = match.group('hook').strip()
chat = match.group('chat').strip()
rc = subprocess.call([
    '/var/ossec/integrations/custom-telegram.py',
    '/tmp/malicious_domain_telegram_fixture.json',
    chat,
    hook,
])
print(f'integration_rc={rc}')
raise SystemExit(rc)
PY
        rc=\$?
        sudo rm -f /tmp/malicious_domain_telegram_fixture.json
        exit \${rc}
    "
    echo "--- MANAGER GENERIC TELEGRAM DEBUG ---"
    manager_ssh "
        if sudo test -f /var/ossec/logs/telegram_generic_debug.log; then
            sudo tail -n 20 /var/ossec/logs/telegram_generic_debug.log
        else
            echo '(Manager generic telegram debug log not found)'
        fi
    "
}

main() {
    local syslog_line
    require_cmd sshpass ssh scp python3
    worker_auth_check
    manager_auth_check
    print_config
    export INFOBLOX_HOSTNAME PROGRAM_NAME PROGRAM_PID CLIENT_IP CLIENT_PORT DOMAIN RPZ_POLICY
    syslog_line="$(build_syslog_line)"

    case "${MODE}" in
        auto|live)
            echo "Sending simulated Infoblox RPZ block to ${WORKER_TARGET}:${SYSLOG_PORT}..."
            send_live_syslog "${syslog_line}"
            sleep "${WAIT_SECONDS}"
            echo "--- MANAGER LIVE CHECK ---"
            if check_live_alerts; then
                echo "Live path matched on manager."
                exit 0
            fi
            if [ "${MODE}" = "live" ]; then
                die "Live syslog path did not produce a visible alert within ${WAIT_SECONDS}s."
            fi
            echo "--- LOGTEST FALLBACK ---"
            echo "Live path not visible yet. Validating decoder/rule chain via wazuh-logtest on ${MANAGER_TARGET}..."
            run_logtest "${syslog_line}"
            echo "--- TELEGRAM TEST ---"
            run_generic_telegram_test
            ;;
        logtest)
            echo "Running deterministic wazuh-logtest validation on ${MANAGER_TARGET}..."
            run_logtest "${syslog_line}"
            echo "--- TELEGRAM TEST ---"
            run_generic_telegram_test
            ;;
        *)
            echo "Usage: $0 [auto|live|logtest]" >&2
            exit 1
            ;;
    esac
}

main "$@"
