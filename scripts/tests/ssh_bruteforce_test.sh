#!/bin/bash
set -euo pipefail

TARGET="10.251.151.12"
USERNAME="wazuh-user"
PASSWORD="wazuh"
MODE="${1:-inject}"

run_network_sim() {
    echo "Starting SSH brute force network simulation against ${TARGET}..."
    echo "This mode is best-effort only. On the live worker it produces sshd failures,"
    echo "but it does not reliably trigger the local Suricata SYN-threshold rule."
    echo "--------------------------------------------------------"

    for i in {1..20}; do
        echo "[Attempt $i] Trying to login with fake password..."
        sshpass -p "FakePassword${i}!" ssh \
            -o StrictHostKeyChecking=no \
            -o PubkeyAuthentication=no \
            -o PreferredAuthentications=password \
            "${USERNAME}@${TARGET}" "exit" &>/dev/null || true
        sleep 1
    done

    echo "--------------------------------------------------------"
    echo "Network simulation completed. Check sshd journal and Suricata logs on ${TARGET}."
}

run_deterministic_injection() {
    local now_utc src_ip tmp_file
    now_utc="$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")"
    src_ip="$(hostname -I | awk '{print $1}')"
    src_ip="${src_ip:-10.251.150.222}"
    tmp_file="$(mktemp)"

    cat > "${tmp_file}" <<EOF
{"timestamp":"${now_utc}","event_type":"alert","src_ip":"${src_ip}","src_port":55022,"dest_ip":"10.251.151.12","dest_port":22,"proto":"TCP","alert":{"severity":3,"signature":"LOCAL SSH brute force attempt","category":"Authentication"}}
EOF

    echo "Injecting deterministic Suricata EVE alert into ${TARGET}..."
    sshpass -p "${PASSWORD}" scp -o StrictHostKeyChecking=no "${tmp_file}" "${USERNAME}@${TARGET}:/tmp/suricata_ssh_bruteforce_test.json" >/dev/null
    sshpass -p "${PASSWORD}" ssh -o StrictHostKeyChecking=no "${USERNAME}@${TARGET}" "
        sudo rm -f /var/ossec/logs/telegram_suricata_debug.log &&
        sudo sh -c 'cat /tmp/suricata_ssh_bruteforce_test.json >> /var/log/suricata/eve.json' &&
        sleep 5 &&
        echo '--- EVE ENTRY ---' &&
        sudo tail -n 200 /var/log/suricata/eve.json | grep -F 'LOCAL SSH brute force attempt' | tail -n 1 &&
        echo '--- TELEGRAM DEBUG ---' &&
        sudo tail -n 20 /var/ossec/logs/telegram_suricata_debug.log &&
        rm -f /tmp/suricata_ssh_bruteforce_test.json
    "

    rm -f "${tmp_file}"
}

case "${MODE}" in
    inject)
        run_deterministic_injection
        ;;
    network)
        run_network_sim
        ;;
    *)
        echo "Usage: $0 [inject|network]" >&2
        exit 1
        ;;
esac
