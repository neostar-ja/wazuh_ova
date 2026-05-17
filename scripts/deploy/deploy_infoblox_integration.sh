#!/bin/bash
# =============================================================================
# deploy_infoblox_integration.sh
# Deploy Infoblox DDI Integration ไปยัง Wazuh Cluster
# ทำการ patch: Master (10.251.151.11) และ Worker (10.251.151.12)
# วันที่: 15 พฤษภาคม 2026
# =============================================================================

set -e

MASTER_IP="10.251.151.11"
WORKER_IP="10.251.151.12"
SSH_USER="wazuh-user"
SSH_PASS="wazuh"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
LOCAL_DIR="$REPO_ROOT"
WAZUH_HOME="/var/ossec"

ssh_cmd() {
    local host="$1"
    shift
    sshpass -p "$SSH_PASS" ssh -o StrictHostKeyChecking=no "$SSH_USER@$host" "$@"
}

scp_file() {
    local src="$1" dest_host="$2" dest_path="$3"
    sshpass -p "$SSH_PASS" scp -o StrictHostKeyChecking=no "$src" "$SSH_USER@$dest_host:$dest_path"
}

echo "════════════════════════════════════════════════════════════"
echo "  Infoblox DDI Integration — Wazuh Cluster Deployment"
echo "  Master: $MASTER_IP | Worker: $WORKER_IP"
echo "════════════════════════════════════════════════════════════"
echo ""

# =============================================================================
# PHASE 1: Patch Built-in Decoders บน MASTER
# =============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "[MASTER] Phase 1: Patch built-in named decoders"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

ssh_cmd "$MASTER_IP" "sudo cp $WAZUH_HOME/ruleset/decoders/0155-named_decoders.xml \
                          $WAZUH_HOME/ruleset/decoders/0155-named_decoders.xml.bak.\$(date +%Y%m%d) 2>/dev/null; echo backup done"

# Python patch script
PATCH_SCRIPT='
import sys
filepath = "/var/ossec/ruleset/decoders/0155-named_decoders.xml"
with open(filepath, "r") as f:
    lines = f.readlines()

new_lines = []
i = 0
while i < len(lines):
    line = lines[i]
    if "<decoder name=\"named-query\">" in line:
        new_lines += [
            "<decoder name=\"named-query\">\n",
            "  <parent>named</parent>\n",
            "  <prematch>: query: </prematch>\n",
            "  <!-- Universal Infoblox NIOS: all formats + dns_response -->\n",
            "  <regex type=\"pcre2\">client\\\\s+(?:@\\\\S+\\\\s+)?([\\\\d\\\\.]+)#(\\\\d+).*?:\\\\s*query:\\\\s+(\\\\S+)\\\\s+(\\\\S+)\\\\s+(\\\\S+)(?:\\\\s+response:\\\\s+(\\\\S+))?</regex>\n",
            "  <order>srcip, srcport, dns_domain, dns_class, dns_type, dns_response</order>\n",
            "</decoder>\n"
        ]
        while "</decoder>" not in lines[i]:
            i += 1
        i += 1
        continue
    if "<decoder name=\"named_client\">" in line:
        new_lines += [
            "<decoder name=\"named_client\">\n",
            "  <parent>named</parent>\n",
            "  <prematch>^client </prematch>\n",
            "  <!-- รองรับ client IP#PORT และ client @handle IP#PORT (Infoblox NIOS) -->\n",
            "  <regex type=\"pcre2\">client\\\\s+(?:@\\\\S+\\\\s+)?(\\\\d[\\\\d\\\\.]+)#(\\\\d+)</regex>\n",
            "  <order>srcip, srcport</order>\n",
            "</decoder>\n"
        ]
        while "</decoder>" not in lines[i]:
            i += 1
        i += 1
        continue
    if "<decoder name=\"named-infoblox-fields\">" in line:
        new_lines += [
            "<decoder name=\"named-infoblox-fields\">\n",
            "  <parent>named</parent>\n",
            "  <!-- รองรับ NIOS เก่า และ NIOS 8.x (queries: info: client @handle) -->\n",
            "  <prematch type=\"pcre2\">queries:.*client</prematch>\n",
            "  <regex type=\"pcre2\">queries:\\\\s+(?:\\\\S+:\\\\s+)?client\\\\s+(?:@\\\\S+\\\\s+)?([\\\\d\\\\.]+)#(\\\\d+)[^)]*(?:\\\\([^)]*\\\\))?:\\\\s+query:\\\\s+(\\\\S+)\\\\s+(\\\\S+)\\\\s+(\\\\S+)</regex>\n",
            "  <order>srcip, srcport, dns_domain, dns_class, dns_type</order>\n",
            "</decoder>\n"
        ]
        while "</decoder>" not in lines[i]:
            i += 1
        i += 1
        continue
    new_lines.append(line)
    i += 1

with open(filepath, "w") as f:
    f.writelines(new_lines)
print("SUCCESS")
'

ssh_cmd "$MASTER_IP" "sudo python3 -c '$PATCH_SCRIPT'" && echo "✅ Master: named decoder patched"

# =============================================================================
# PHASE 2: Deploy Custom Decoder บน MASTER
# =============================================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "[MASTER] Phase 2: Deploy custom Infoblox decoder"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

scp_file "$LOCAL_DIR/decoders/1003-infoblox-decoders.xml" "$MASTER_IP" "/tmp/"
ssh_cmd "$MASTER_IP" "sudo cp /tmp/1003-infoblox-decoders.xml $WAZUH_HOME/etc/decoders/1003-infoblox-decoders.xml && \
                      sudo chown wazuh:wazuh $WAZUH_HOME/etc/decoders/1003-infoblox-decoders.xml && \
                      sudo chmod 640 $WAZUH_HOME/etc/decoders/1003-infoblox-decoders.xml"
echo "✅ Master: custom decoder deployed"

# =============================================================================
# PHASE 3: Deploy Rules บน MASTER
# =============================================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "[MASTER] Phase 3: Deploy Infoblox rules"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

scp_file "$LOCAL_DIR/rules/1004-infoblox-rules.xml" "$MASTER_IP" "/tmp/"
ssh_cmd "$MASTER_IP" "sudo cp /tmp/1004-infoblox-rules.xml $WAZUH_HOME/etc/rules/1004-infoblox-rules.xml && \
                      sudo chown wazuh:wazuh $WAZUH_HOME/etc/rules/1004-infoblox-rules.xml && \
                      sudo chmod 640 $WAZUH_HOME/etc/rules/1004-infoblox-rules.xml"
echo "✅ Master: rules deployed"

# =============================================================================
# PHASE 4: Restart MASTER (sync rules to Worker)
# =============================================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "[MASTER] Phase 4: Restart Wazuh (sync to Worker)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

ssh_cmd "$MASTER_IP" "sudo $WAZUH_HOME/bin/wazuh-control restart 2>&1 | grep -E 'ERROR|CRITICAL|OK' | head -3"
echo "รอ Wazuh พร้อม..."
ssh_cmd "$MASTER_IP" "until sudo $WAZUH_HOME/bin/wazuh-control status 2>/dev/null | grep -q 'wazuh-analysisd is running'; do sleep 3; done; echo 'Master ready'"

# =============================================================================
# PHASE 5: Patch Built-in Decoders บน WORKER
# =============================================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "[WORKER] Phase 5: Patch built-in named decoders on Worker"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

ssh_cmd "$WORKER_IP" "sudo cp $WAZUH_HOME/ruleset/decoders/0155-named_decoders.xml \
                          $WAZUH_HOME/ruleset/decoders/0155-named_decoders.xml.bak.\$(date +%Y%m%d) 2>/dev/null; echo backup done"
ssh_cmd "$WORKER_IP" "sudo python3 -c '$PATCH_SCRIPT'" && echo "✅ Worker: named decoder patched"

# =============================================================================
# PHASE 6: Restart WORKER
# =============================================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "[WORKER] Phase 6: Restart Worker"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

ssh_cmd "$WORKER_IP" "sudo $WAZUH_HOME/bin/wazuh-control restart 2>&1 | grep -E 'ERROR|CRITICAL|OK' | head -3"
ssh_cmd "$WORKER_IP" "until sudo $WAZUH_HOME/bin/wazuh-control status 2>/dev/null | grep -q 'wazuh-analysisd is running'; do sleep 3; done; echo 'Worker ready'"

# =============================================================================
# PHASE 7: Verification
# =============================================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Phase 7: Verification"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "ทดสอบ DNS Format 1 (@handle):"
ssh_cmd "$MASTER_IP" "printf 'May 15 19:23:47 10.251.1.244 named[692227]: client @0x7f108c 10.251.66.51#59072 (example.com): query: example.com IN A + (10.251.1.244)\n' | sudo $WAZUH_HOME/bin/wazuh-logtest 2>&1 | grep -E 'id:|level:|Alert'" 2>/dev/null

echo ""
echo "ทดสอบ DHCPACK:"
ssh_cmd "$MASTER_IP" "printf 'May 15 11:23:09 infoblox-gm dhcpd[1234]: DHCPACK on 10.0.0.50 to aa:bb:cc:dd:ee:ff (HOST) via eth0\n' | sudo $WAZUH_HOME/bin/wazuh-logtest 2>&1 | grep -E 'id:|level:|Alert'" 2>/dev/null

echo ""
echo "════════════════════════════════════════════════════════════"
echo "  ✅ Infoblox DDI Integration Deployment Complete!"
echo ""
echo "  Next steps:"
echo "  1. Import dashboard: visualizations/infoblox_ddi_dashboard.ndjson"
echo "     → Wazuh Dashboard: https://10.251.151.14"
echo "     → Stack Management → Saved Objects → Import"
echo ""
echo "  2. Configure Infoblox NIOS to send syslog:"
echo "     → Server: 10.251.151.12, Port: 514, Protocol: UDP"
echo "     → เปิด: DNS Queries, RPZ Threats, DHCP, Audit"
echo ""
echo "  3. คู่มือตั้งค่า: docs/integrations/infoblox/INFOBLOX_SYSLOG_SETUP_THAI.md"
echo "  4. Test script:  scripts/tests/test_infoblox_integration.py"
echo "════════════════════════════════════════════════════════════"
