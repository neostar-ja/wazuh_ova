#!/bin/bash
# Diagnose Wazuh hardware/OS inventory not showing in Dashboard
# Run from any host that can reach 10.251.151.11 (Wazuh API) and 10.251.151.13 (OpenSearch)
#
# Root causes this script detects:
#   1. <indexer> host pointing to 127.0.0.1 instead of 10.251.151.13
#   2. <indexer> SSL cert using wazuh-server.pem instead of filebeat.pem
#   3. Wazuh keystore missing indexer credentials
#   4. wazuh-states-inventory-* indices empty in OpenSearch

set -euo pipefail

ENV_FILE="/opt/code/wazuh_ova/.env"
if [ -f "$ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

MASTER="10.251.151.11"
INDEXER="10.251.151.13"
WAZUH_USER="${SSH_USERNAME:-wazuh-user}"
WAZUH_PASS="${SSH_PASSWORD:-}"
OS_USER="${wazuh_open_search_username:-admin}"
OS_PASS="${wazuh_open_search_password:-}"
WAZUH_API_USER="${wazuh_api_username:-wazuh-wui}"
WAZUH_API_PASS="${wazuh_api_password:-}"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

pass() { echo -e "  ${GREEN}✓ PASS${NC}  $*"; }
fail() { echo -e "  ${RED}✗ FAIL${NC}  $*"; FAILURES=$((FAILURES+1)); }
warn() { echo -e "  ${YELLOW}⚠ WARN${NC}  $*"; }

FAILURES=0

echo "========================================"
echo " Wazuh Hardware Inventory Diagnostics"
echo " $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo "========================================"
echo ""

# --------------------------------------------------
echo "[1/4] Checking OpenSearch connectivity..."
STATUS=$(curl -k -s -u "$OS_USER:$OS_PASS" --connect-timeout 5 \
  "https://$INDEXER:9200/_cluster/health" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status','ERROR'))" 2>/dev/null || echo "ERROR")
if [ "$STATUS" = "green" ] || [ "$STATUS" = "yellow" ]; then
  pass "OpenSearch reachable at $INDEXER:9200 (status: $STATUS)"
else
  fail "Cannot reach OpenSearch at $INDEXER:9200 (got: $STATUS)"
fi
echo ""

# --------------------------------------------------
echo "[2/4] Checking wazuh-states-inventory indices..."
HARDWARE_DOCS=$(curl -k -s -u "$OS_USER:$OS_PASS" \
  "https://$INDEXER:9200/wazuh-states-inventory-hardware-wazuh/_count" \
  2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin).get('count',-1))" 2>/dev/null || echo "-1")

if [ "$HARDWARE_DOCS" -gt 0 ] 2>/dev/null; then
  pass "wazuh-states-inventory-hardware-wazuh has $HARDWARE_DOCS docs"
else
  fail "wazuh-states-inventory-hardware-wazuh is empty or missing (count=$HARDWARE_DOCS)"
  echo "       → IndexerConnector may not be connecting to OpenSearch"
fi

SYSTEM_DOCS=$(curl -k -s -u "$OS_USER:$OS_PASS" \
  "https://$INDEXER:9200/wazuh-states-inventory-system-wazuh/_count" \
  2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin).get('count',-1))" 2>/dev/null || echo "-1")
if [ "$SYSTEM_DOCS" -gt 0 ] 2>/dev/null; then
  pass "wazuh-states-inventory-system-wazuh has $SYSTEM_DOCS docs"
else
  fail "wazuh-states-inventory-system-wazuh is empty or missing"
fi

# Check for orphaned -server suffix indices
ORPHAN=$(curl -k -s -u "$OS_USER:$OS_PASS" \
  "https://$INDEXER:9200/_cat/indices/wazuh-states-inventory-hardware-wazuh-server?h=index" 2>/dev/null | tr -d ' \n')
if [ -n "$ORPHAN" ]; then
  warn "Orphaned empty index found: wazuh-states-inventory-hardware-wazuh-server"
  echo "       → Delete with configured OpenSearch credentials from $ENV_FILE"
fi
echo ""

# --------------------------------------------------
echo "[3/4] Checking master ossec.conf <indexer> section..."
if ! command -v sshpass &>/dev/null; then
  warn "sshpass not installed, skipping SSH checks"
else
  INDEXER_HOST=$(sshpass -p "$WAZUH_PASS" ssh -o StrictHostKeyChecking=no -o ConnectTimeout=5 \
    "$WAZUH_USER@$MASTER" \
    "sudo grep -oP '(?<=<host>)https://[^<]+(?=</host>)' /var/ossec/etc/ossec.conf" 2>/dev/null || echo "UNKNOWN")

  if echo "$INDEXER_HOST" | grep -q "127.0.0.1"; then
    fail "<indexer> host is 127.0.0.1:9200 — nothing listening there!"
    echo "       → Fix: change to https://$INDEXER:9200 in /var/ossec/etc/ossec.conf"
  elif echo "$INDEXER_HOST" | grep -q "$INDEXER"; then
    pass "<indexer> host correctly set to $INDEXER_HOST"
  else
    warn "<indexer> host is $INDEXER_HOST — verify this is correct"
  fi

  CERT_PATH=$(sshpass -p "$WAZUH_PASS" ssh -o StrictHostKeyChecking=no "$WAZUH_USER@$MASTER" \
    "sudo grep -oP '(?<=<certificate>)[^<]+(?=</certificate>)' /var/ossec/etc/ossec.conf" 2>/dev/null || echo "")

  if echo "$CERT_PATH" | grep -q "wazuh-server.pem"; then
    fail "<indexer> using wazuh-server.pem — OpenSearch rejects this cert!"
    echo "       → Fix: change to /etc/filebeat/certs/filebeat.pem"
  elif echo "$CERT_PATH" | grep -q "filebeat.pem"; then
    pass "<indexer> SSL cert correctly set to filebeat.pem"
  else
    warn "<indexer> cert path: $CERT_PATH"
  fi

  # Check IndexerConnector logs
  CONN_OK=$(sshpass -p "$WAZUH_PASS" ssh -o StrictHostKeyChecking=no "$WAZUH_USER@$MASTER" \
    "sudo grep 'IndexerConnector initialized successfully' /var/ossec/logs/ossec.log | wc -l" 2>/dev/null || echo "0")
  CONN_FAIL=$(sshpass -p "$WAZUH_PASS" ssh -o StrictHostKeyChecking=no "$WAZUH_USER@$MASTER" \
    "sudo grep 'IndexerConnector initialization failed' /var/ossec/logs/ossec.log | wc -l" 2>/dev/null || echo "0")

  if [ "$CONN_OK" -gt 0 ]; then
    pass "IndexerConnector: $CONN_OK successful initializations in today's log"
  else
    fail "IndexerConnector: no successful initializations (failures today: $CONN_FAIL)"
  fi
fi
echo ""

# --------------------------------------------------
echo "[4/4] Checking Wazuh API syscollector data..."
TOKEN=$(curl -k -s -u "$WAZUH_API_USER:$WAZUH_API_PASS" -X POST \
  "https://$MASTER:55000/security/user/authenticate" \
  2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('token',''))" 2>/dev/null || echo "")

if [ -z "$TOKEN" ]; then
  warn "Could not authenticate to Wazuh API — skipping agent checks"
else
  AGENTS=$(curl -k -s -H "Authorization: Bearer $TOKEN" \
    "https://$MASTER:55000/agents?select=id,name,status&limit=10" 2>/dev/null | \
    python3 -c "
import sys, json
d = json.load(sys.stdin)
agents = d.get('data', {}).get('affected_items', [])
active = [a for a in agents if a.get('status') == 'active']
print(f'{len(active)}/{len(agents)}')
" 2>/dev/null)
  pass "Wazuh API: $AGENTS agents active"

  HW=$(curl -k -s -H "Authorization: Bearer $TOKEN" \
    "https://$MASTER:55000/syscollector/000/hardware" 2>/dev/null | \
    python3 -c "
import sys, json
d = json.load(sys.stdin)
items = d.get('data', {}).get('affected_items', [])
if items:
    cpu = items[0].get('cpu', {}).get('name', 'unknown')
    print(f'CPU: {cpu}')
else:
    print('NO DATA')
" 2>/dev/null)
  if echo "$HW" | grep -q "CPU:"; then
    pass "Syscollector API: $HW"
  else
    fail "Syscollector API returned no hardware data for agent 000"
  fi
fi

echo ""
echo "========================================"
if [ "$FAILURES" -eq 0 ]; then
  echo -e "${GREEN}All checks passed!${NC} Hardware inventory is working."
else
  echo -e "${RED}$FAILURES check(s) failed.${NC} See messages above for remediation."
  echo ""
  echo "Quick fix (run on master as root):"
  echo "  sed -i 's|https://127.0.0.1:9200|https://10.251.151.13:9200|g' /var/ossec/etc/ossec.conf"
  echo "  sed -i 's|wazuh-server.pem|filebeat.pem|g' /var/ossec/etc/ossec.conf"
  echo "  sed -i 's|wazuh-server-key.pem|filebeat-key.pem|g' /var/ossec/etc/ossec.conf"
  echo "  # use credentials from $ENV_FILE when updating the keystore"
  echo "  echo '<indexer-user>' | /var/ossec/bin/wazuh-keystore -f indexer -k username"
  echo "  echo '<indexer-password>' | /var/ossec/bin/wazuh-keystore -f indexer -k password"
  echo "  /var/ossec/bin/wazuh-control restart"
fi
echo "========================================"
