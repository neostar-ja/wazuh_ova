#!/bin/bash
set -euo pipefail

TARGET="${TARGET:-10.251.151.12}"
MANAGER_TARGET="${MANAGER_TARGET:-10.251.151.11}"
USERNAME="${USERNAME:-wazuh-user}"
PASSWORD="${PASSWORD:-wazuh}"
MODE="${1:-inject}"
ATTEMPTS="${ATTEMPTS:-20}"
SLEEP_SECONDS="${SLEEP_SECONDS:-1}"

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

remote_auth_check() {
    sshpass -p "${PASSWORD}" ssh "${SSH_OPTS[@]}" "${USERNAME}@${TARGET}" "exit" >/dev/null 2>&1 || \
        die "SSH login failed for ${USERNAME}@${TARGET}. Check TARGET/USERNAME/PASSWORD or network reachability."
}

remote_sudo_check() {
    sshpass -p "${PASSWORD}" ssh "${SSH_OPTS[@]}" "${USERNAME}@${TARGET}" "sudo -n true" >/dev/null 2>&1 || \
        die "Remote sudo -n failed on ${TARGET}. Ensure ${USERNAME} has passwordless sudo for the test actions."
}

manager_auth_check() {
    sshpass -p "${PASSWORD}" ssh "${SSH_OPTS[@]}" "${USERNAME}@${MANAGER_TARGET}" "exit" >/dev/null 2>&1 || \
        die "SSH login failed for ${USERNAME}@${MANAGER_TARGET}. Check MANAGER_TARGET/USERNAME/PASSWORD or network reachability."
}

remote_scp() {
    local src="$1" dst="$2"
    sshpass -p "${PASSWORD}" scp "${SSH_OPTS[@]}" "${src}" "${USERNAME}@${TARGET}:${dst}"
}

manager_scp() {
    local src="$1" dst="$2"
    sshpass -p "${PASSWORD}" scp "${SSH_OPTS[@]}" "${src}" "${USERNAME}@${MANAGER_TARGET}:${dst}"
}

remote_ssh() {
    sshpass -p "${PASSWORD}" ssh "${SSH_OPTS[@]}" "${USERNAME}@${TARGET}" "$@"
}

manager_ssh() {
    sshpass -p "${PASSWORD}" ssh "${SSH_OPTS[@]}" "${USERNAME}@${MANAGER_TARGET}" "$@"
}

print_config() {
    echo "Mode           : ${MODE}"
    echo "Target         : ${TARGET}"
    echo "Manager target : ${MANAGER_TARGET}"
    echo "Username       : ${USERNAME}"
    echo "Attempts       : ${ATTEMPTS}"
    echo "Sleep seconds  : ${SLEEP_SECONDS}"
}

run_network_sim() {
    require_cmd sshpass ssh
    remote_auth_check

    echo "Starting SSH brute force network simulation against ${TARGET}..."
    echo "This mode is best-effort only. On the live worker it produces sshd failures,"
    echo "but it does not reliably trigger the local Suricata SYN-threshold rule."
    echo "--------------------------------------------------------"

    for ((i=1; i<=ATTEMPTS; i++)); do
        echo "[Attempt $i] Trying to login with fake password..."
        sshpass -p "FakePassword${i}!" ssh "${SSH_OPTS[@]}" \
            "${USERNAME}@${TARGET}" "exit" >/dev/null 2>&1 || true
        sleep "${SLEEP_SECONDS}"
    done

    echo "--------------------------------------------------------"
    echo "Network simulation completed. Check sshd journal and Suricata logs on ${TARGET}."
}

run_deterministic_injection() {
    require_cmd sshpass ssh scp hostname date mktemp
    remote_auth_check
    remote_sudo_check
    manager_auth_check

    local now_utc src_ip tmp_file manager_fixture
    now_utc="$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")"
    src_ip="$(hostname -I | awk '{print $1}')"
    src_ip="${src_ip:-10.251.150.222}"
    tmp_file="$(mktemp)"
    manager_fixture="$(mktemp)"
    trap 'rm -f "${tmp_file}" "${manager_fixture}"' EXIT

    cat > "${tmp_file}" <<EOF
{"timestamp":"${now_utc}","event_type":"alert","src_ip":"${src_ip}","src_port":55022,"dest_ip":"${TARGET}","dest_port":22,"proto":"TCP","alert":{"severity":3,"signature":"LOCAL SSH brute force attempt","category":"Authentication"}}
EOF

    cat > "${manager_fixture}" <<EOF
{"rule":{"level":12,"id":"200021","description":"Suricata: SSH brute force on Wazuh cluster from ${src_ip}","mitre":{"id":["T1110.001"]}},"data":{"src_ip":"${src_ip}","src_port":55022,"dest_ip":"${TARGET}","dest_port":22,"proto":"TCP","flow_id":123456,"alert":{"severity":3,"signature":"LOCAL SSH brute force attempt","category":"Authentication"}}}
EOF

    echo "Injecting deterministic Suricata EVE alert into ${TARGET}..."
    remote_scp "${tmp_file}" "/tmp/suricata_ssh_bruteforce_test.json" >/dev/null
    remote_ssh "
        sudo sh -c 'cat /tmp/suricata_ssh_bruteforce_test.json >> /var/log/suricata/eve.json' &&
        sleep 5 &&
        echo '--- EVE ENTRY ---' &&
        sudo tail -n 200 /var/log/suricata/eve.json | grep -F 'LOCAL SSH brute force attempt' | tail -n 1 &&
        rm -f /tmp/suricata_ssh_bruteforce_test.json
    "
    sleep 8
    echo "--- MANAGER ALERT ---"
    if manager_ssh "sudo python3 - <<'PY'
from collections import deque
import json
found = []
with open('/var/ossec/logs/alerts/alerts.json', 'r', encoding='utf-8', errors='ignore') as handle:
    for line in deque(handle, maxlen=500):
        line = line.strip()
        if not line.startswith('{'):
            continue
        try:
            obj = json.loads(line)
        except Exception:
            continue
        rule = obj.get('rule', {})
        desc = rule.get('description', '')
        if rule.get('id') in {'200021', '200090', '120004'} or 'Suricata: SSH brute force' in desc:
            found.append(line)
if found:
    print(found[-1])
    raise SystemExit(0)
print('(Alert not found in manager alerts.json)')
raise SystemExit(1)
PY"
    then
        :
    else
        echo "--- MANAGER FALLBACK ---"
        echo "No manager alert detected from eve.json path. Invoking custom-suricata-telegram directly on ${MANAGER_TARGET}..."
        manager_scp "${manager_fixture}" "/tmp/suricata_manager_fixture_alert.json" >/dev/null
        manager_ssh "
            sudo /var/ossec/integrations/custom-suricata-telegram /tmp/suricata_manager_fixture_alert.json dummy;
            rc=\$?;
            echo \"integration_rc=\${rc}\";
            sudo rm -f /tmp/suricata_manager_fixture_alert.json;
            exit \${rc}
        "
    fi
    echo "--- MANAGER TELEGRAM DEBUG ---"
    manager_ssh "
        if sudo test -f /var/ossec/logs/telegram_suricata_debug.log; then
            sudo tail -n 20 /var/ossec/logs/telegram_suricata_debug.log
        else
            echo '(Manager debug log not found - integration may not have been triggered yet)'
        fi
    "
    rm -f "${tmp_file}"
    rm -f "${manager_fixture}"
    trap - EXIT
}

case "${MODE}" in
    inject)
        print_config
        run_deterministic_injection
        ;;
    network)
        print_config
        run_network_sim
        ;;
    *)
        echo "Usage: $0 [inject|network]" >&2
        exit 1
        ;;
esac
