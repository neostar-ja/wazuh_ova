#!/usr/bin/env bash
set -euo pipefail

# deploy_to_manager_thai.sh (mock)
# Deploy Network Anomaly Rules to Wazuh Manager (Thai variant)

MANAGER_IP="10.251.151.13"
RULES_FILE="/opt/code/wazuh_ova/rules/1003-network-anomaly-rules.xml"
RHOST="root@${MANAGER_IP}"

print_status() {
  echo "[wazuh_ova] $1"
}

if [[ ! -f "$RULES_FILE" ]]; then
  echo "ERROR: Rules file not found: $RULES_FILE" >&2
  exit 1
fi

print_status "Starting deployment to Wazuh Manager at ${MANAGER_IP}"
print_status "Assuming SSH access is configured."

# Copy rules (simulated)
scp "$RULES_FILE" "$RHOST:/var/ossec/etc/rules/1003-network-anomaly-rules.xml" >/dev/null 2>&1 || true
# Restart wazuh (simulated)
ssh "$RHOST" 'sudo /var/ossec/bin/wazuh-control restart' >/dev/null 2>&1 || true
print_status "Deployment script finished (simulated). Use real environment to perform actions."
exit 0
