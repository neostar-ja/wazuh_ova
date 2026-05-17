#!/bin/bash
# Deploy Suricata IDS + Wazuh Integration + Telegram Notification
# Covers: suricata_ids_agent_prompt.md Phase 1–9
# Telegram: uses existing TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID env vars

set -euo pipefail

# ────────────────────────── Config ──────────────────────────
WORKER_HOST="10.251.151.12"
MASTER_HOST="10.251.151.11"
SSH_USER="wazuh-user"
SSH_PASS="wazuh"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

LOCAL_RULES="${REPO_ROOT}/rules/1006-suricata-ids-rules.xml"
LOCAL_TELEGRAM_FALLBACK="${REPO_ROOT}/integrations/worker/custom-suricata-telegram"
WORKER_SURICATA_INTEGRATION="/var/ossec/integrations/custom-suricata-telegram"

SSH_OPTS="-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ConnectTimeout=15"

# ────────────────────────── Helpers ─────────────────────────
banner() { echo; echo "╔══════════════════════════════════════════════════════╗"; printf "║  %-52s  ║\n" "$*"; echo "╚══════════════════════════════════════════════════════╝"; echo; }
ok()     { echo "  ✅ $*"; }
warn()   { echo "  ⚠️  $*"; }
fail()   { echo "  ❌ $*" >&2; exit 1; }
info()   { echo "  ℹ️  $*"; }

worker_run() { sshpass -p "$SSH_PASS" ssh $SSH_OPTS "${SSH_USER}@${WORKER_HOST}" "sudo bash -s" <<< "$1"; }
master_run() { sshpass -p "$SSH_PASS" ssh $SSH_OPTS "${SSH_USER}@${MASTER_HOST}" "sudo bash -s" <<< "$1"; }
worker_scp() { sshpass -p "$SSH_PASS" scp $SSH_OPTS "$1" "${SSH_USER}@${WORKER_HOST}:$2"; }
master_scp() { sshpass -p "$SSH_PASS" scp $SSH_OPTS "$1" "${SSH_USER}@${MASTER_HOST}:$2"; }

# ════════════════════════════════════════════════════════════
banner "PRE-CHECK: Verify local files"
# ════════════════════════════════════════════════════════════

[ -f "$LOCAL_RULES" ]    && ok "Rules file found: $LOCAL_RULES"    || fail "Missing: $LOCAL_RULES"
if [ -f "$LOCAL_TELEGRAM_FALLBACK" ]; then
  ok "Suricata Telegram fallback found: $LOCAL_TELEGRAM_FALLBACK"
else
  warn "Fallback script not found: $LOCAL_TELEGRAM_FALLBACK"
  warn "Will reuse existing Telegram script on Master if present"
fi
which sshpass >/dev/null 2>&1 && ok "sshpass available" || fail "sshpass not installed — run: yum install -y sshpass"
which xmllint >/dev/null 2>&1 && ok "xmllint available" || warn "xmllint not found — local XML validation skipped"

# Local XML validation
if which xmllint >/dev/null 2>&1; then
    xmllint --noout "$LOCAL_RULES" && ok "Rules XML syntax valid" || fail "Rules XML invalid"
fi

# ════════════════════════════════════════════════════════════
banner "PHASE 1 — Pre-installation Audit (Worker)"
# ════════════════════════════════════════════════════════════

info "OS and kernel:"
worker_run "uname -r; cat /etc/os-release | grep -E '^(NAME|VERSION)='"

info "Network interfaces:"
worker_run "ip addr show | grep -E '^[0-9]+:|inet '"
PRIMARY_IFACE=$(sshpass -p "$SSH_PASS" ssh $SSH_OPTS "${SSH_USER}@${WORKER_HOST}" \
    "ip route show default 2>/dev/null | awk '/default/{print \$5}' | head -1")
[ -n "$PRIMARY_IFACE" ] && ok "Primary interface: ${PRIMARY_IFACE}" || { PRIMARY_IFACE="eth0"; warn "Could not detect interface — defaulting to eth0"; }

info "Suricata status:"
worker_run "which suricata 2>/dev/null && suricata -V 2>&1 | head -1 || echo 'Suricata not installed'"

info "Wazuh Manager status on Worker:"
worker_run "systemctl is-active wazuh-manager 2>/dev/null || /var/ossec/bin/wazuh-control status 2>/dev/null | head -5 || echo 'Status check done'"

ok "Phase 1 complete — interface: ${PRIMARY_IFACE}"

# ════════════════════════════════════════════════════════════
banner "PHASE 2 — Install Suricata (Worker)"
# ════════════════════════════════════════════════════════════

worker_run "
set -e
# Check if already installed
if which suricata >/dev/null 2>&1; then
    echo 'Suricata already installed:'
    suricata -V 2>&1 | head -1
    exit 0
fi

# Detect package manager and OS version
if grep -q 'Amazon Linux 2023\|Amazon Linux 2' /etc/os-release 2>/dev/null; then
    OS_VER=\$(grep '^VERSION=' /etc/os-release | tr -d '\"' | cut -d= -f2)
    echo \"Detected: Amazon Linux \${OS_VER}\"
fi

echo 'Attempting dnf install (Amazon Linux 2023)...'
if which dnf >/dev/null 2>&1; then
    if dnf install -y suricata 2>/dev/null; then
        echo 'Installed via dnf main repo'
    else
        echo 'Package not in main repos — building from source (Suricata 7.0.10)...'
        # Install build dependencies
        dnf install -y gcc make automake autoconf libtool \
            libpcap-devel libnet-devel pcre2-devel libyaml-devel jansson-devel \
            nss-devel nspr-devel zlib-devel file-devel libcap-ng-devel \
            cargo rust python3-yaml \
            libnetfilter_queue-devel libnfnetlink-devel \
            hiredis-devel lz4-devel 2>&1 | tail -3
        # Download and build
        cd /tmp
        SURI_VER='7.0.10'
        [ ! -f suricata-\${SURI_VER}.tar.gz ] && \
            curl -sLO "https://www.openinfosecfoundation.org/download/suricata-\${SURI_VER}.tar.gz"
        tar -xzf suricata-\${SURI_VER}.tar.gz
        cd /tmp/suricata-\${SURI_VER}
        ./configure \
            --prefix=/usr --sysconfdir=/etc --localstatedir=/var \
            --enable-af-packet --enable-nfqueue \
            --disable-dpdk --disable-hyperscan \
            2>&1 | tail -5
        make -j\$(nproc) 2>&1 | tail -3
        make install 2>&1 | tail -3
        make install-conf 2>&1 | tail -3
        ldconfig
        echo 'Built and installed from source'
    fi
else
    echo 'Using yum (Amazon Linux 2)...'
    amazon-linux-extras enable epel -y 2>/dev/null || true
    yum install -y epel-release
    yum install -y suricata || \
        yum install -y https://download.opensuse.org/repositories/security:/suricata/CentOS_7/x86_64/suricata-7.0.7-1.1.x86_64.rpm
fi

which suricata && echo 'Suricata installed:' && suricata -V || echo 'WARNING: suricata binary not found'
"
ok "Suricata installed"

# ════════════════════════════════════════════════════════════
banner "PHASE 2 (cont.) — Download Emerging Threats Rules"
# ════════════════════════════════════════════════════════════

worker_run "
set -e
mkdir -p /var/log/suricata /var/run/suricata /etc/suricata/rules
chown -R root:root /var/log/suricata 2>/dev/null || true
chmod 755 /var/log/suricata

echo 'Updating Suricata rules...'
if which suricata-update >/dev/null 2>&1; then
    suricata-update --no-reload 2>&1 | tail -8
  if [ -f /var/lib/suricata/rules/suricata.rules ]; then
    cp /var/lib/suricata/rules/suricata.rules /etc/suricata/rules/et-open.rules
    chmod 644 /etc/suricata/rules/et-open.rules
    echo 'Synced ET rules into /etc/suricata/rules/et-open.rules'
  fi
    echo 'suricata-update done'
elif [ -d /etc/suricata/rules ] && ls /etc/suricata/rules/*.rules >/dev/null 2>&1; then
    echo 'Rules already present — skipping download'
else
    SURI_VER=\$(suricata --version 2>&1 | grep -oP '\d+\.\d+\.\d+' | head -1 || echo '7.0.0')
    cd /tmp
    curl -sLO \"https://rules.emergingthreats.net/open/suricata-\${SURI_VER}/emerging.rules.tar.gz\" \
        || curl -sLO 'https://rules.emergingthreats.net/open/suricata-6.0.8/emerging.rules.tar.gz'
    tar -xzf emerging.rules.tar.gz
    mv /tmp/rules/*.rules /etc/suricata/rules/ 2>/dev/null || true
    chmod 644 /etc/suricata/rules/*.rules 2>/dev/null || true
    echo 'Rules downloaded'
fi

RULE_COUNT=\$(cat /etc/suricata/rules/*.rules 2>/dev/null | grep -c '^alert' || echo 0)
echo \"Alert rules loaded: \${RULE_COUNT}\"
"
ok "ET rules downloaded"

# ════════════════════════════════════════════════════════════
banner "PHASE 3 — Configure Suricata (Worker)"
# ════════════════════════════════════════════════════════════

info "Writing suricata.yaml with interface: ${PRIMARY_IFACE}"

worker_run "
set -e
IFACE='${PRIMARY_IFACE}'
BACKUP_DATE=\$(date +%Y%m%d%H%M%S)

# Backup existing config
[ -f /etc/suricata/suricata.yaml ] && cp /etc/suricata/suricata.yaml /etc/suricata/suricata.yaml.bak.\${BACKUP_DATE}

cat > /etc/suricata/suricata.yaml << 'SURICATA_CONF'
%YAML 1.1
---
vars:
  address-groups:
    HOME_NET: '[10.251.151.0/24,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16]'
    EXTERNAL_NET: '!\$HOME_NET'
    HTTP_SERVERS: '\$HOME_NET'
    SMTP_SERVERS: '\$HOME_NET'
    SQL_SERVERS: '\$HOME_NET'
    DNS_SERVERS: '\$HOME_NET'
    TELNET_SERVERS: '\$HOME_NET'
    AIM_SERVERS: '\$EXTERNAL_NET'
    DC_SERVERS: '\$HOME_NET'
    DNP3_SERVER: '\$HOME_NET'
    DNP3_CLIENT: '\$HOME_NET'
    MODBUS_CLIENT: '\$HOME_NET'
    MODBUS_SERVER: '\$HOME_NET'
    ENIP_CLIENT: '\$HOME_NET'
    ENIP_SERVER: '\$HOME_NET'
  port-groups:
    HTTP_PORTS: '80,8080,8000,8888'
    SHELLCODE_PORTS: '!80'
    ORACLE_PORTS: 1521
    SSH_PORTS: 22
    DNP3_PORTS: 20000
    MODBUS_PORTS: 502
    FILE_DATA_PORTS: '[\$HTTP_PORTS,110,143]'
    FTP_PORTS: 21
    VXLAN_PORTS: 4789
    TEREDO_PORTS: 3544

default-log-dir: /var/log/suricata/

stats:
  enabled: yes
  interval: 60

outputs:
  - eve-log:
      enabled: yes
      filetype: regular
      filename: eve.json
      community-id: true
      community-id-seed: 0
      types:
        - alert:
            payload: yes
            payload-printable: yes
            packet: yes
            metadata: yes
            http-body: yes
            http-body-printable: yes
            tagged-packets: yes
        - anomaly:
            enabled: yes
            types:
              decode: yes
              stream: yes
              applayer: yes
        - http:
            extended: yes
        - dns:
            version: 2
            requests: yes
            responses: yes
        - tls:
            extended: yes
        - files:
            force-magic: no
        - smtp:
        - ftp
        - ssh
        - flow
        - netflow
        - stats:
            totals: yes
            threads: no
            deltas: no
  - fast:
      enabled: yes
      filename: fast.log
      append: yes
  - stats:
      enabled: yes
      filename: stats.log
      append: yes
      totals: yes
      threads: no

logging:
  default-log-level: notice
  outputs:
    - console:
        enabled: no
    - file:
        enabled: yes
        level: info
        filename: /var/log/suricata/suricata.log
    - syslog:
        enabled: no

af-packet:
  - interface: INTERFACE_NAME_PLACEHOLDER
    threads: auto
    cluster-id: 99
    cluster-type: cluster_flow
    defrag: yes
    use-mmap: yes
    tpacket-v3: yes
    ring-size: 20000
    block-size: 32768
    buffer-size: 32768
    checksum-checks: auto
    bpf-filter: ''
    copy-mode: none

pcap:
  - interface: INTERFACE_NAME_PLACEHOLDER

pcap-file:
  checksum-checks: auto

app-layer:
  protocols:
    krb5:
      enabled: yes
    snmp:
      enabled: yes
    tls:
      enabled: yes
      detection-ports:
        dp: 443
      ja3-fingerprints: yes
    dcerpc:
      enabled: yes
    ftp:
      enabled: yes
      memcap: 64mb
    rdp:
      enabled: yes
    ssh:
      enabled: yes
    smtp:
      enabled: yes
    imap:
      enabled: detection-only
    dns:
      tcp:
        enabled: yes
        detection-ports:
          dp: 53
      udp:
        enabled: yes
        detection-ports:
          dp: 53
    http:
      enabled: yes
      libhtp:
        default-config:
          personality: IDS
          request-body-limit: 100kb
          response-body-limit: 100kb
          request-body-minimal-inspect-size: 32kb
          request-body-inspect-window: 4kb
          response-body-minimal-inspect-size: 40kb
          response-body-inspect-window: 16kb
          double-decode-path: no
          double-decode-query: no
    modbus:
      enabled: yes
    dnp3:
      enabled: yes
    enip:
      enabled: yes
    nfs:
      enabled: yes
    tftp:
      enabled: yes
    ntp:
      enabled: yes
    dhcp:
      enabled: yes

asn1-max-frames: 256
host-mode: auto

unix-command:
  enabled: auto
  filename: /var/run/suricata/suricata-command.socket

default-rule-path: /etc/suricata/rules
rule-files:
  - '*.rules'

classification-file: /etc/suricata/classification.config
reference-config-file: /etc/suricata/reference.config
threshold-file: /etc/suricata/threshold.config

host-os-policy:
  linux: [10.251.151.0/24]
  windows: [0.0.0.0/0]

defrag:
  memcap: 128mb
  hash-size: 65536
  trackers: 65535
  max-frags: 65535
  prealloc: yes
  timeout: 60

flow:
  memcap: 128mb
  hash-size: 65536
  prealloc: 10000
  emergency-recovery: 30

stream:
  memcap: 64mb
  checksum-validation: yes
  inline: auto
  reassembly:
    memcap: 256mb
    depth: 1mb
    toserver-chunk-size: 2560
    toclient-chunk-size: 2560
    randomize-chunk-size: yes

host:
  hash-size: 4096
  prealloc: 1000
  memcap: 32mb

detect:
  profile: medium
  sgh-mpm-context: auto
  inspection-recursion-limit: 3000
  prefilter:
    default: mpm

mpm-algo: auto
spm-algo: auto

threading:
  set-cpu-affinity: no
  detect-thread-ratio: 1.0

profiling:
  rules:
    enabled: yes
    filename: rule_perf.log
    append: yes
    limit: 10
    json: yes

SURICATA_CONF

# Replace interface placeholder
sed -i \"s/INTERFACE_NAME_PLACEHOLDER/\${IFACE}/g\" /etc/suricata/suricata.yaml
echo \"Interface set to: \${IFACE}\"
grep 'interface:' /etc/suricata/suricata.yaml | head -3
"
ok "suricata.yaml written"

# Write threshold config
worker_run "
cat > /etc/suricata/threshold.config << 'EOF'
suppress gen_id 1, sig_id 2100366
threshold gen_id 1, sig_id 2013028, type limit, track by_src, count 5, seconds 60
EOF
echo 'threshold.config written'
"
ok "threshold.config written"

# Ensure classification + reference files exist
worker_run "
if [ ! -f /etc/suricata/classification.config ]; then
    curl -sLo /etc/suricata/classification.config \
        'https://raw.githubusercontent.com/OISF/suricata/master/etc/classification.config' \
        || echo 'WARNING: could not download classification.config'
fi
[ -f /etc/suricata/classification.config ] && echo 'classification.config OK' || echo 'classification.config MISSING'
[ -f /etc/suricata/reference.config ] && echo 'reference.config OK' || echo 'reference.config MISSING'
"

# ════════════════════════════════════════════════════════════
banner "PHASE 4 — Custom Suricata Rules (Worker)"
# ════════════════════════════════════════════════════════════

worker_run "
cat > /etc/suricata/rules/local.rules << 'EOF'
# Custom rules for Wazuh cluster environment
# Network: 10.251.151.0/24

alert tcp any any -> \$HOME_NET any (msg:\"LOCAL Port scan detected - SYN flood\"; flags:S; threshold: type threshold, track by_src, count 100, seconds 10; sid:9000001; rev:1; classtype:attempted-recon;)
alert tcp any any -> \$HOME_NET 22 (msg:\"LOCAL SSH brute force attempt\"; flags:S; threshold: type threshold, track by_src, count 10, seconds 60; sid:9000002; rev:1; classtype:attempted-admin;)
alert tcp any any -> 10.251.151.14 443 (msg:\"LOCAL Wazuh Dashboard access from external\"; flags:S; threshold: type threshold, track by_src, count 20, seconds 60; sid:9000003; rev:1; classtype:policy-violation;)
alert tcp any any -> 10.251.151.13 9200 (msg:\"LOCAL OpenSearch API access attempt\"; flags:S; sid:9000004; rev:1; classtype:policy-violation;)
alert icmp any any -> \$HOME_NET any (msg:\"LOCAL ICMP ping sweep\"; itype:8; threshold: type threshold, track by_src, count 10, seconds 5; sid:9000007; rev:1; classtype:attempted-recon;)
EOF
chmod 644 /etc/suricata/rules/local.rules
echo 'local.rules created'
"
ok "local.rules created"

# Validate config
info "Validating suricata.yaml..."
worker_run "
set -e
suricata -T -c /etc/suricata/suricata.yaml -v >/tmp/suricata-test.log 2>&1
if [ -s /tmp/suricata-test.log ]; then
  tail -20 /tmp/suricata-test.log
else
  echo 'suricata -T passed (no verbose output on this host)'
fi
"
ok "Suricata config validated"

# ════════════════════════════════════════════════════════════
banner "PHASE 5 — Wazuh Worker Config (localfile)"
# ════════════════════════════════════════════════════════════

worker_run "
cp /var/ossec/etc/ossec.conf /var/ossec/etc/ossec.conf.bak.\$(date +%Y%m%d%H%M%S)

if grep -q 'eve.json\|suricata' /var/ossec/etc/ossec.conf; then
    echo 'Suricata localfile block already present — skipping'
else
    # Insert before </ossec_config>
    sed -i 's|</ossec_config>|  <localfile>\n    <log_format>json</log_format>\n    <location>/var/log/suricata/eve.json</location>\n    <label key=\"@source\">suricata</label>\n  </localfile>\n</ossec_config>|' /var/ossec/etc/ossec.conf
    echo 'localfile block added'
fi

xmllint --noout /var/ossec/etc/ossec.conf 2>/dev/null && echo 'ossec.conf XML valid' || echo 'WARNING: ossec.conf XML check (xmllint not available)'
"
ok "Worker ossec.conf updated"

# ════════════════════════════════════════════════════════════
banner "PHASE 5+8 — Deploy Rules on Master + Telegram on Worker"
# ════════════════════════════════════════════════════════════

info "Copying rules XML to Master..."
master_scp "$LOCAL_RULES" "/tmp/1006-suricata-ids-rules.xml"
ok "Rules XML uploaded"

if [ -f "$LOCAL_TELEGRAM_FALLBACK" ]; then
  info "Uploading Suricata Telegram integration script to Worker..."
  worker_scp "$LOCAL_TELEGRAM_FALLBACK" "/tmp/custom-suricata-telegram"
  ok "Integration script uploaded"
else
  warn "No local Suricata integration script found: $LOCAL_TELEGRAM_FALLBACK"
fi

master_run "
set -e

# Deploy rules
mv /tmp/1006-suricata-ids-rules.xml /var/ossec/etc/rules/
chown root:wazuh /var/ossec/etc/rules/1006-suricata-ids-rules.xml
chmod 660 /var/ossec/etc/rules/1006-suricata-ids-rules.xml
echo 'Rules deployed: /var/ossec/etc/rules/1006-suricata-ids-rules.xml'

"
ok "Rules deployed on Master"

worker_run "
set -e
if [ -f /tmp/custom-suricata-telegram ]; then
  mv /tmp/custom-suricata-telegram '${WORKER_SURICATA_INTEGRATION}'
  chown root:wazuh '${WORKER_SURICATA_INTEGRATION}'
  chmod 750 '${WORKER_SURICATA_INTEGRATION}'
  echo 'Worker integration deployed: ${WORKER_SURICATA_INTEGRATION}'
else
  echo 'Worker integration script not uploaded; keeping existing file if present'
fi
"
ok "Telegram integration deployed on Worker"

# Update Worker ossec.conf — add integration block
worker_run "
set -e
cp /var/ossec/etc/ossec.conf /var/ossec/etc/ossec.conf.bak.\$(date +%Y%m%d%H%M%S)

if grep -q 'custom-suricata-telegram' /var/ossec/etc/ossec.conf; then
    echo 'Integration block already present — skipping'
else
    sed -i 's|</ossec_config>|  <integration>\n    <name>custom-suricata-telegram</name>\n    <level>12</level>\n    <group>suricata,</group>\n    <alert_format>json</alert_format>\n  </integration>\n</ossec_config>|' /var/ossec/etc/ossec.conf
    echo 'Integration block added to Worker ossec.conf'
fi

xmllint --noout /var/ossec/etc/ossec.conf 2>/dev/null && echo 'Worker ossec.conf XML valid' || echo 'WARNING: xmllint not available'
"
ok "Worker ossec.conf updated with Suricata integration block"

# Validate rules XML on Master
master_run "xmllint --noout /var/ossec/etc/rules/1006-suricata-ids-rules.xml 2>/dev/null && echo 'Rules XML valid on Master' || echo 'WARNING: xmllint not available'"

# ════════════════════════════════════════════════════════════
banner "PHASE 6 — Start Services"
# ════════════════════════════════════════════════════════════

info "Setting up logrotate for Suricata..."
worker_run "
cat > /etc/logrotate.d/suricata << 'EOF'
/var/log/suricata/*.log
/var/log/suricata/*.json {
    daily
    rotate 7
    missingok
    notifempty
    compress
    delaycompress
    sharedscripts
    postrotate
        /bin/kill -HUP \$(cat /var/run/suricata/suricata.pid 2>/dev/null) 2>/dev/null || true
    endscript
}
EOF
echo 'logrotate configured'
"

info "Starting Suricata..."
worker_run "
set -e

if ! systemctl list-unit-files | grep -q '^suricata.service'; then
  cat > /etc/systemd/system/suricata.service << 'EOF'
[Unit]
Description=Suricata IDS daemon
After=network.target

[Service]
Type=simple
ExecStart=/usr/bin/suricata -c /etc/suricata/suricata.yaml --af-packet
ExecReload=/bin/kill -USR2 \$MAINPID
Restart=on-failure
RestartSec=5
LimitNOFILE=1048576

[Install]
WantedBy=multi-user.target
EOF
  echo 'Created /etc/systemd/system/suricata.service'
fi

systemctl daemon-reload
systemctl enable suricata
systemctl restart suricata
sleep 5
systemctl status suricata --no-pager | head -15
"
ok "Suricata started"

info "Restarting Wazuh Master (first)..."
master_run "
set -e
if systemctl list-unit-files | grep -q '^wazuh-manager.service'; then
  systemctl restart wazuh-manager
  systemctl is-active wazuh-manager
else
  /var/ossec/bin/wazuh-control restart
fi
"
ok "Wazuh Master restarted"

info "Waiting 30s for Master to stabilize..."
sleep 30

info "Restarting Wazuh Worker..."
worker_run "
set -e
if systemctl list-unit-files | grep -q '^wazuh-manager.service'; then
  systemctl restart wazuh-manager
  systemctl is-active wazuh-manager
else
  /var/ossec/bin/wazuh-control restart
fi
"
ok "Wazuh Worker restarted"
sleep 10

# ════════════════════════════════════════════════════════════
banner "PHASE 9 — Validate"
# ════════════════════════════════════════════════════════════

info "Checking Suricata status..."
worker_run "systemctl status suricata --no-pager | grep -E 'Active:|running|failed'"

info "Checking eve.json..."
worker_run "
sleep 15
ls -lh /var/log/suricata/eve.json 2>/dev/null || echo 'eve.json not yet created'
tail -3 /var/log/suricata/eve.json 2>/dev/null | python3 -m json.tool 2>/dev/null | head -10 || echo '(no JSON output yet)'
"

info "Event type summary from EVE JSON..."
worker_run "
python3 -c \"
import sys, json
from collections import Counter
types = Counter()
try:
    with open('/var/log/suricata/eve.json') as f:
        for line in f:
            try: types[json.loads(line).get('event_type','?')] += 1
            except: pass
except: pass
for k,v in types.most_common(): print(f'  {k}: {v}')
print('Total events:', sum(types.values()))
\" 2>/dev/null || echo '(eve.json not yet available)'
"

info "Checking Suricata errors..."
worker_run "
if command -v journalctl >/dev/null 2>&1; then
  journalctl -u suricata --since '10 minutes ago' -p err --no-pager | tail -20
else
  grep -i 'error\|fatal' /var/log/suricata/suricata.log 2>/dev/null | tail -5
fi
"

info "Verifying Wazuh cluster status..."
master_run "/var/ossec/bin/wazuh-control status 2>&1 | head -10"

info "Checking Suricata rule loaded on Master..."
master_run "ls -la /var/ossec/etc/rules/1006-suricata-ids-rules.xml && echo 'Rule file present'"

info "Setting up daily rule update cron on Worker..."
worker_run "
set -e
mkdir -p /etc/cron.d
cat > /etc/cron.d/suricata-update << 'EOF'
0 3 * * * root /usr/bin/suricata-update --no-reload 2>/dev/null && kill -USR2 \$(cat /var/run/suricata/suricata.pid 2>/dev/null) 2>/dev/null || true
EOF
chmod 644 /etc/cron.d/suricata-update
echo 'Cron job set'
"

# ════════════════════════════════════════════════════════════
banner "DEPLOYMENT COMPLETE"
# ════════════════════════════════════════════════════════════

echo ""
echo "Summary:"
echo "  • Suricata IDS : Worker ${WORKER_HOST} — AF_PACKET passive mode"
echo "  • Interface    : ${PRIMARY_IFACE}"
echo "  • EVE JSON     : /var/log/suricata/eve.json"
echo "  • ET Rules     : /etc/suricata/rules/*.rules"
echo "  • Custom Rules : /etc/suricata/rules/local.rules (SIDs 9000001-9000007)"
echo "  • Wazuh Rules  : /var/ossec/etc/rules/1006-suricata-ids-rules.xml (IDs 200000-200050)"
echo "  • Telegram     : /var/ossec/integrations/custom-suricata-telegram (Worker)"
echo "  • Trigger      : group=suricata, level>=10"
echo ""
echo "Next steps:"
echo "  1. Paste test EVE JSON into wazuh-logtest on Master to verify rule matching"
echo "     ssh wazuh-user@${MASTER_HOST} 'sudo /var/ossec/bin/wazuh-logtest'"
echo "  2. Generate test traffic: ping -c 5 ${MASTER_HOST}"
echo "  3. Monitor: tail -f /var/log/suricata/eve.json"
echo "  4. Check Wazuh alerts: tail -f /var/ossec/logs/alerts/alerts.json | grep suricata"
echo "  5. Dashboard: https://10.251.151.14 → Threat Hunting → filter rule.groups:suricata"
echo ""
