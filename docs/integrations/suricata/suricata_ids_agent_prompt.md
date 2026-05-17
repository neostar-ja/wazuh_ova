# Agent Prompt: Suricata IDS — End-to-End Installation
# Target: Wazuh Worker Node (10.251.151.12) — Amazon Linux 2
# Mode: IDS only (AF_PACKET, passive monitoring)
# Created: 2026-05-16

---

## SYSTEM CONTEXT

You are a senior Linux security engineer specializing in network intrusion detection.
You will install and fully configure Suricata IDS on the Wazuh Worker Node,
then integrate it with the existing Wazuh cluster.

```
Infrastructure:
  Master Node   : 10.251.151.11  (Rules, Decoders — config goes here)
  Worker Node   : 10.251.151.12  (Suricata installs HERE)
  Indexer Node  : 10.251.151.13  (OpenSearch :9200)
  Dashboard     : 10.251.151.14  (HTTPS :443)

SSH credentials : user=wazuh-user, password=wazuh  (use sudo su for root)
Wazuh API/UI   : admin / admin
OS             : Amazon Linux 2
Mode           : IDS only — passive monitoring, NO packet dropping
```

---

## OPERATING RULES

- Run READ-ONLY inspection commands first — show exact output before any changes
- Never assume command results — always display actual output
- If any step fails, STOP and report the exact error before continuing
- Validate all config files before restarting services
- All Wazuh Rules/Decoders go on Master Node (10.251.151.11) ONLY
- All Suricata and Wazuh localfile config go on Worker Node (10.251.151.12)
- Create backups before modifying any existing file
- Wazuh restart order: Master first → wait 30s → Worker

---

## PHASE 1 — PRE-INSTALLATION AUDIT

Connect to Worker Node (10.251.151.12). Run all checks and show full output.

### 1.1 System information
```bash
uname -r
cat /etc/os-release
free -h
nproc
df -h /var /etc
```

### 1.2 Network interfaces
```bash
ip addr show
ip link show
# Identify the primary interface receiving monitored traffic
# Note the exact interface name (e.g. eth0, ens3, enp0s3)
```

### 1.3 Check if Suricata already installed
```bash
which suricata 2>/dev/null && suricata --version || echo "Suricata not installed"
rpm -qa | grep -i suricata || echo "No suricata RPM found"
```

### 1.4 Check existing Wazuh setup on Worker
```bash
sudo systemctl status wazuh-manager
sudo /var/ossec/bin/wazuh-control status
cat /var/ossec/etc/ossec.conf | grep -A5 "<remote>"
```

### 1.5 Check available repos
```bash
sudo yum repolist
sudo amazon-linux-extras list | grep -i epel
```

### 1.6 Report Phase 1 Summary
State:
- OS version + kernel
- Primary network interface name (SAVE THIS — used in all configs)
- RAM and CPU count (for Suricata threading config)
- Suricata: installed or not
- Wazuh Manager: running or not

---

## PHASE 2 — INSTALL SURICATA

### 2.1 Enable EPEL and install Suricata
```bash
# Enable EPEL on Amazon Linux 2
sudo amazon-linux-extras enable epel
sudo yum install -y epel-release
sudo yum update -y epel-release

# Install Suricata
sudo yum install -y suricata

# Verify installation
suricata --version
which suricata
ls -la /etc/suricata/
ls -la /var/log/suricata/ 2>/dev/null || echo "Log dir not yet created"
```

If EPEL method fails, try alternative:
```bash
# Alternative: install from source repo
sudo yum install -y https://download.opensuse.org/repositories/security:/suricata/CentOS_7/x86_64/suricata-7.0.7-1.1.x86_64.rpm
```

### 2.2 Create required directories
```bash
sudo mkdir -p /var/log/suricata
sudo mkdir -p /var/run/suricata
sudo mkdir -p /etc/suricata/rules
sudo chown -R suricata:suricata /var/log/suricata 2>/dev/null || \
  sudo chown -R root:root /var/log/suricata
sudo chmod 755 /var/log/suricata
```

### 2.3 Download Emerging Threats ruleset
```bash
# Method 1: suricata-update (preferred)
sudo suricata-update

# If suricata-update not available, download directly
SURI_VER=$(suricata --version 2>&1 | grep -oP '\d+\.\d+\.\d+' | head -1)
echo "Suricata version: ${SURI_VER}"

cd /tmp
curl -LO https://rules.emergingthreats.net/open/suricata-${SURI_VER}/emerging.rules.tar.gz

# If version-specific URL fails, use generic
curl -LO https://rules.emergingthreats.net/open/suricata-6.0.8/emerging.rules.tar.gz

sudo tar -xvzf emerging.rules.tar.gz
sudo mv rules/*.rules /etc/suricata/rules/ 2>/dev/null || \
  sudo mv /tmp/rules/*.rules /etc/suricata/rules/
sudo chmod 644 /etc/suricata/rules/*.rules

# Count rules loaded
ls /etc/suricata/rules/*.rules | wc -l
cat /etc/suricata/rules/*.rules | grep "^alert" | wc -l
```

### 2.4 Set up automatic rule updates via cron
```bash
sudo tee /etc/cron.d/suricata-update > /dev/null << 'EOF'
# Update Suricata ET rules daily at 03:00
0 3 * * * root /usr/bin/suricata-update --no-reload && \
  kill -USR2 $(cat /var/run/suricata/suricata.pid 2>/dev/null) 2>/dev/null || true
EOF
sudo chmod 644 /etc/cron.d/suricata-update
```

---

## PHASE 3 — CONFIGURE SURICATA

### 3.1 Backup original config
```bash
sudo cp /etc/suricata/suricata.yaml /etc/suricata/suricata.yaml.bak.$(date +%Y%m%d)
```

### 3.2 Detect system parameters for config
```bash
# Get primary interface (replace with actual name from Phase 1)
PRIMARY_IFACE=$(ip route show default | awk '/default/{print $5}' | head -1)
echo "Primary interface: ${PRIMARY_IFACE}"

# Get Worker IP
WORKER_IP=$(ip addr show ${PRIMARY_IFACE} | grep "inet " | awk '{print $2}' | cut -d/ -f1)
echo "Worker IP: ${WORKER_IP}"

# Get CPU count for threading
CPU_COUNT=$(nproc)
echo "CPU count: ${CPU_COUNT}"
```

### 3.3 Write Suricata configuration
Replace INTERFACE_NAME with actual interface from Phase 1.
Replace WORKER_IP with actual Worker IP.

```bash
sudo tee /etc/suricata/suricata.yaml > /dev/null << 'SURICATA_CONF'
%YAML 1.1
---

# Suricata IDS Configuration
# Mode: Passive IDS (AF_PACKET) — NO packet dropping
# Installed on: Wazuh Worker Node 10.251.151.12
# Date: 2026-05-16

vars:
  address-groups:
    HOME_NET: "[10.251.151.0/24,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16]"
    EXTERNAL_NET: "!$HOME_NET"
    HTTP_SERVERS: "$HOME_NET"
    SMTP_SERVERS: "$HOME_NET"
    SQL_SERVERS: "$HOME_NET"
    DNS_SERVERS: "$HOME_NET"
    TELNET_SERVERS: "$HOME_NET"
    AIM_SERVERS: "$EXTERNAL_NET"
    DC_SERVERS: "$HOME_NET"
    DNP3_SERVER: "$HOME_NET"
    DNP3_CLIENT: "$HOME_NET"
    MODBUS_CLIENT: "$HOME_NET"
    MODBUS_SERVER: "$HOME_NET"
    ENIP_CLIENT: "$HOME_NET"
    ENIP_SERVER: "$HOME_NET"

  port-groups:
    HTTP_PORTS: "80,8080,8000,8888"
    SHELLCODE_PORTS: "!80"
    ORACLE_PORTS: 1521
    SSH_PORTS: 22
    DNP3_PORTS: 20000
    MODBUS_PORTS: 502
    FILE_DATA_PORTS: "[$HTTP_PORTS,110,143]"
    FTP_PORTS: 21
    VXLAN_PORTS: 4789
    TEREDO_PORTS: 3544

default-log-dir: /var/log/suricata/

stats:
  enabled: yes
  interval: 60

outputs:
  # EVE JSON — primary output for Wazuh integration
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
            session-resumption: no
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

  # Fast log for quick review
  - fast:
      enabled: yes
      filename: fast.log
      append: yes

  # Stats log
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
    bpf-filter: ""
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
    ikev2:
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
      raw-extraction: no
      mime:
        decode-mime: yes
        decode-base64: yes
        decode-quoted-printable: yes
        header-value-depth: 2000
        extract-urls: yes
        body-md5: no
      inspected-tracker:
        content-limit: 100755
        content-inspect-min-size: 32768
        content-inspect-window: 4096
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
          response-body-decompress-layer-limit: 2
          http-body-inline: auto
          swf-decompression:
            enabled: yes
            type: both
            compress-depth: 0
            decompress-depth: 0
          double-decode-path: no
          double-decode-query: no
    modbus:
      enabled: no
    dnp3:
      enabled: no
    enip:
      enabled: no
    nfs:
      enabled: yes
    ikev2:
      enabled: yes
    tftp:
      enabled: yes
    ntp:
      enabled: yes
    dhcp:
      enabled: yes

asn1-max-frames: 256

coredump:
  max-dump: unlimited

host-mode: auto

unix-command:
  enabled: auto
  filename: /var/run/suricata/suricata-command.socket

legacy:
  uricontent: enabled

engine-analysis:
  rules-fast-pattern: yes
  rules: yes

pcre:
  match-limit: 3500
  match-limit-recursion: 1500

app-layer-heuristics: enabled

default-rule-path: /etc/suricata/rules
rule-files:
  - "*.rules"

classification-file: /etc/suricata/classification.config
reference-config-file: /etc/suricata/reference.config

threshold-file: /etc/suricata/threshold.config

host-os-policy:
  windows: [0.0.0.0/0]
  bsd: []
  bsd-right: []
  old-linux: []
  linux: [10.251.151.0/24]
  old-solaris: []
  solaris: []
  hpux10: []
  hpux11: []
  irix: []
  macos: []
  vista: []
  windows2k3: []

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

vlan:
  use-for-tracking: true

flow-timeouts:
  default:
    new: 30
    established: 300
    closed: 0
    bypassed: 100
    emergency-new: 10
    emergency-established: 100
    emergency-closed: 0
    emergency-bypassed: 50
  tcp:
    new: 60
    established: 600
    closed: 60
    bypassed: 100
    emergency-new: 5
    emergency-established: 100
    emergency-closed: 10
    emergency-bypassed: 50
  udp:
    new: 30
    established: 300
    bypassed: 100
    emergency-new: 10
    emergency-established: 100
    emergency-bypassed: 50
  icmp:
    new: 30
    established: 300
    bypassed: 100
    emergency-new: 10
    emergency-established: 100
    emergency-bypassed: 50

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

decoder:
  teredo:
    enabled: true
  vxlan:
    enabled: true
  vlan:
    vlans-max: 2

detect:
  profile: medium
  custom-values:
    toclient-groups: 3
    toserver-groups: 25
  sgh-mpm-context: auto
  inspection-recursion-limit: 3000
  prefilter:
    default: mpm
  grouping:
  rules-fast-pattern:

mpm-algo: auto
spm-algo: auto

threading:
  set-cpu-affinity: no
  cpu-affinity:
    - management-cpu-set:
        cpu: [ 0 ]
    - receive-cpu-set:
        cpu: [ 0 ]
    - worker-cpu-set:
        cpu: [ "all" ]
        mode: "balanced"
  detect-thread-ratio: 1.0

luajit:
  states: 128

profiling:
  rules:
    enabled: yes
    filename: rule_perf.log
    append: yes
    limit: 10
    json: yes
  keywords:
    enabled: yes
    filename: keyword_perf.log
    append: yes
  rulegroups:
    enabled: yes
    filename: rule_group_perf.log
    append: yes
  packets:
    enabled: yes
    filename: packet_stats.log
    append: yes
    csv:
      enabled: no
      filename: packet_stats.csv
  locks:
    enabled: no
    filename: lock_stats.log
    append: yes
  pcap-log:
    enabled: no
    filename: pcaplog_stats.log
    append: yes

nfq:

nflog:
  - group: 2
    buffer-size: 18432
  - group: default
    qthreshold: 1
    qtimeout: 100
    max-size: 20000

capture:

netmap:
 - interface: eth2
 - interface: default

pfring:
  - interface: eth0
    threads: auto
    cluster-id: 99
    cluster-type: cluster_flow
  - interface: default

ipfw:

napatech:
    hba: -1
    use-all-streams: yes
    streams: ["0-3"]

mpipe:
  load-balance: dynamic
  iqueue-packets: 2048
  inputs:
    - interface: xgbe2
    - interface: xgbe3
    - interface: xgbe4

cuda:
  mpm:
    data-chunk-size-for-packet-buffer: "default"
SURICATA_CONF
```

### 3.4 Replace INTERFACE_NAME_PLACEHOLDER with actual interface
```bash
# Get actual interface name
IFACE=$(ip route show default | awk '/default/{print $5}' | head -1)
echo "Using interface: ${IFACE}"

# Replace placeholder in config
sudo sed -i "s/INTERFACE_NAME_PLACEHOLDER/${IFACE}/g" /etc/suricata/suricata.yaml

# Verify replacement
grep "interface:" /etc/suricata/suricata.yaml | head -5
```

### 3.5 Create threshold config (reduce false positive noise)
```bash
sudo tee /etc/suricata/threshold.config > /dev/null << 'EOF'
# Threshold config — reduce noisy rules
# Format: threshold gen_id <gid>, sig_id <sid>, type <threshold|limit|both>, \
#         track <by_src|by_dst|by_rule>, count <N>, seconds <T>

# Suppress ICMP noise
suppress gen_id 1, sig_id 2100366

# Suppress DNS lookup noise (common)
threshold gen_id 1, sig_id 2013028, type limit, track by_src, count 5, seconds 60
EOF
```

### 3.6 Verify classification and reference files exist
```bash
ls -la /etc/suricata/classification.config
ls -la /etc/suricata/reference.config
# If missing, create minimal versions
[ ! -f /etc/suricata/classification.config ] && \
  sudo curl -o /etc/suricata/classification.config \
  https://raw.githubusercontent.com/OISF/suricata/master/etc/classification.config
```

### 3.7 Test configuration
```bash
sudo suricata -T -c /etc/suricata/suricata.yaml -v 2>&1 | tail -20
```
Expected output should end with: `Configuration provided was successfully loaded. Exiting.`
If any ERROR appears — STOP and fix before continuing.

---

## PHASE 4 — CREATE CUSTOM SURICATA RULES

### 4.1 Create custom rules file for network environment
```bash
sudo tee /etc/suricata/rules/local.rules > /dev/null << 'EOF'
# Custom rules for Wazuh cluster environment
# Network: 10.251.151.0/24

# Detect port scan targeting Wazuh cluster
alert tcp any any -> $HOME_NET any (msg:"LOCAL Port scan detected - SYN flood"; \
  flags:S; threshold: type threshold, track by_src, count 100, seconds 10; \
  sid:9000001; rev:1; classtype:attempted-recon;)

# Detect SSH brute force
alert tcp any any -> $HOME_NET 22 (msg:"LOCAL SSH brute force attempt"; \
  flags:S; threshold: type threshold, track by_src, count 10, seconds 60; \
  sid:9000002; rev:1; classtype:attempted-admin;)

# Detect unauthorized access to Wazuh Dashboard
alert tcp any any -> 10.251.151.14 443 (msg:"LOCAL Wazuh Dashboard access from external"; \
  flags:S; threshold: type threshold, track by_src, count 20, seconds 60; \
  sid:9000003; rev:1; classtype:policy-violation;)

# Detect Wazuh API access attempts
alert tcp any any -> 10.251.151.13 9200 (msg:"LOCAL OpenSearch API access attempt"; \
  flags:S; sid:9000004; rev:1; classtype:policy-violation;)

# DNS tunneling detection (long queries)
alert dns any any -> any any (msg:"LOCAL DNS query unusually long - possible tunneling"; \
  dns.query; content:"."; isdataat:50,relative; \
  sid:9000005; rev:1; classtype:policy-violation;)

# Detect Nmap scan signatures
alert tcp any any -> $HOME_NET any (msg:"LOCAL Nmap SYN scan"; \
  flags:S12; sid:9000006; rev:1; classtype:attempted-recon;)

# ICMP ping sweep
alert icmp any any -> $HOME_NET any (msg:"LOCAL ICMP ping sweep"; \
  itype:8; threshold: type threshold, track by_src, count 10, seconds 5; \
  sid:9000007; rev:1; classtype:attempted-recon;)
EOF
```

### 4.2 Validate custom rules
```bash
sudo suricata -T -c /etc/suricata/suricata.yaml -v 2>&1 | grep -E "ERROR|OK|loaded"
```

---

## PHASE 5 — CONFIGURE WAZUH INTEGRATION

### 5.1 Configure Wazuh to read EVE JSON on Worker Node
Add localfile block to `/var/ossec/etc/ossec.conf` on Worker:
```bash
# Backup first
sudo cp /var/ossec/etc/ossec.conf /var/ossec/etc/ossec.conf.bak.$(date +%Y%m%d)

# Check if suricata block already exists
sudo grep -c "suricata\|eve.json" /var/ossec/etc/ossec.conf && \
  echo "Suricata block already present" || echo "Need to add block"
```

If not present, add before closing `</ossec_config>` tag:
```xml
<ossec_config>
  <localfile>
    <log_format>json</log_format>
    <location>/var/log/suricata/eve.json</location>
    <label key="@source">suricata</label>
  </localfile>
</ossec_config>
```

```bash
# Validate ossec.conf XML
sudo xmllint --noout /var/ossec/etc/ossec.conf && echo "ossec.conf OK"
```

### 5.2 Configure Wazuh rules on Master Node (10.251.151.11)

SSH to Master and create custom Suricata rules:
```bash
ssh wazuh-user@10.251.151.11
sudo su
```

Backup existing rules:
```bash
ls /var/ossec/etc/rules/ | grep -i suricata
# Check if built-in suricata rules exist
grep -l "suricata\|Suricata" /var/ossec/ruleset/rules/*.xml | head -5
```

Create custom rules file `/var/ossec/etc/rules/local_suricata_rules.xml`:
```xml
<group name="suricata,ids,">

  <!-- ===== BASE RULE ===== -->
  <rule id="200000" level="3">
    <decoded_as>json</decoded_as>
    <field name="event_type">alert</field>
    <description>Suricata: IDS Alert — $(alert.signature)</description>
    <group>suricata,ids,</group>
  </rule>

  <!-- ===== SEVERITY-BASED RULES ===== -->

  <!-- Severity 1: Critical -->
  <rule id="200001" level="14">
    <if_sid>200000</if_sid>
    <field name="alert.severity">1</field>
    <description>Suricata: CRITICAL alert [$(alert.category)] — $(alert.signature) | $(src_ip):$(src_port) → $(dest_ip):$(dest_port)</description>
    <group>suricata,ids,attack,critical,</group>
    <mitre><id>T1190</id></mitre>
  </rule>

  <!-- Severity 2: High -->
  <rule id="200002" level="12">
    <if_sid>200000</if_sid>
    <field name="alert.severity">2</field>
    <description>Suricata: HIGH alert [$(alert.category)] — $(alert.signature) | $(src_ip) → $(dest_ip)</description>
    <group>suricata,ids,attack,</group>
    <mitre><id>T1190</id></mitre>
  </rule>

  <!-- Severity 3: Medium -->
  <rule id="200003" level="7">
    <if_sid>200000</if_sid>
    <field name="alert.severity">3</field>
    <description>Suricata: MEDIUM alert [$(alert.category)] — $(alert.signature)</description>
    <group>suricata,ids,</group>
  </rule>

  <!-- Severity 4: Low / Informational -->
  <rule id="200004" level="3">
    <if_sid>200000</if_sid>
    <field name="alert.severity">4</field>
    <description>Suricata: LOW alert — $(alert.signature)</description>
    <group>suricata,ids,</group>
  </rule>

  <!-- ===== CATEGORY-BASED RULES ===== -->

  <!-- Malware / Trojan / C2 -->
  <rule id="200010" level="14">
    <if_sid>200000</if_sid>
    <field name="alert.signature" type="pcre2">(?i)ET MALWARE|ET TROJAN|ET CNC|Malware|Backdoor|RAT\b</field>
    <description>Suricata: MALWARE detected — $(alert.signature) | src: $(src_ip)</description>
    <group>suricata,ids,malware,attack,</group>
    <mitre><id>T1071</id></mitre>
  </rule>

  <!-- Exploit attempts -->
  <rule id="200011" level="12">
    <if_sid>200000</if_sid>
    <field name="alert.category" type="pcre2">(?i)Attempted Administrator Privilege Gain|Exploit|Web Application Attack</field>
    <description>Suricata: Exploit attempt — $(alert.signature) | $(src_ip) → $(dest_ip):$(dest_port)</description>
    <group>suricata,ids,exploit,attack,</group>
    <mitre><id>T1190</id></mitre>
  </rule>

  <!-- Port scan / Reconnaissance -->
  <rule id="200012" level="8">
    <if_sid>200000</if_sid>
    <field name="alert.category" type="pcre2">(?i)Attempted Information Leak|Reconnaissance|Network Scan|Port Scan</field>
    <description>Suricata: Reconnaissance — $(alert.signature) from $(src_ip)</description>
    <group>suricata,ids,recon,</group>
    <mitre><id>T1046</id></mitre>
  </rule>

  <!-- Brute force -->
  <rule id="200013" level="10">
    <if_sid>200000</if_sid>
    <field name="alert.category" type="pcre2">(?i)Brute Force|Authentication|Login Failure</field>
    <description>Suricata: Brute force detected — $(alert.signature) from $(src_ip)</description>
    <group>suricata,ids,brute_force,authentication_failed,</group>
    <mitre><id>T1110</id></mitre>
  </rule>

  <!-- DNS Anomaly / Tunneling -->
  <rule id="200014" level="10">
    <if_sid>200000</if_sid>
    <field name="alert.signature" type="pcre2">(?i)DNS Tunnel|DNS Exfil|ET DNS</field>
    <description>Suricata: DNS anomaly — $(alert.signature) from $(src_ip)</description>
    <group>suricata,ids,dns,exfiltration,</group>
    <mitre><id>T1071.004</id></mitre>
  </rule>

  <!-- TLS/SSL suspicious -->
  <rule id="200015" level="8">
    <if_sid>200000</if_sid>
    <field name="alert.signature" type="pcre2">(?i)ET SSL|TLS|HTTPS|JA3</field>
    <description>Suricata: Suspicious TLS/SSL — $(alert.signature) from $(src_ip)</description>
    <group>suricata,ids,tls,</group>
    <mitre><id>T1573</id></mitre>
  </rule>

  <!-- Policy violation -->
  <rule id="200016" level="6">
    <if_sid>200000</if_sid>
    <field name="alert.category" type="pcre2">(?i)Policy Violation|Misc Activity|Potentially Bad Traffic</field>
    <description>Suricata: Policy violation — $(alert.signature) from $(src_ip)</description>
    <group>suricata,ids,policy,</group>
  </rule>

  <!-- ===== CUSTOM LOCAL RULES ===== -->

  <!-- Local: Port scan -->
  <rule id="200020" level="10">
    <if_sid>200000</if_sid>
    <field name="alert.signature">LOCAL Port scan detected</field>
    <description>Suricata: Port scan targeting Wazuh cluster from $(src_ip)</description>
    <group>suricata,ids,recon,local,</group>
    <mitre><id>T1046</id></mitre>
  </rule>

  <!-- Local: SSH brute force -->
  <rule id="200021" level="12">
    <if_sid>200000</if_sid>
    <field name="alert.signature">LOCAL SSH brute force</field>
    <description>Suricata: SSH brute force on Wazuh cluster from $(src_ip)</description>
    <group>suricata,ids,brute_force,ssh,authentication_failed,local,</group>
    <mitre><id>T1110.001</id></mitre>
  </rule>

  <!-- ===== NON-ALERT EVENT TYPES ===== -->

  <!-- Anomaly events -->
  <rule id="200030" level="5">
    <decoded_as>json</decoded_as>
    <field name="event_type">anomaly</field>
    <description>Suricata: Network anomaly detected — $(anomaly.type)</description>
    <group>suricata,ids,anomaly,</group>
  </rule>

  <!-- Stats (low level, informational only) -->
  <rule id="200040" level="0">
    <decoded_as>json</decoded_as>
    <field name="event_type">stats</field>
    <description>Suricata: Statistics event</description>
    <group>suricata,ids,stats,</group>
  </rule>

  <!-- ===== CORRELATION WITH EXISTING INTEL ===== -->

  <!-- Suricata alert matches AbuseIPDB known malicious -->
  <rule id="200050" level="15">
    <if_sid>200001,200002,200010,200011</if_sid>
    <field name="src_ip" type="pcre2">\d+\.\d+\.\d+\.\d+</field>
    <description>Suricata: HIGH CONFIDENCE attack — $(alert.signature) from known bad IP $(src_ip)</description>
    <group>suricata,ids,threat_intel,attack,critical,</group>
    <mitre><id>T1190</id></mitre>
  </rule>

</group>
```

### 5.3 Validate rules XML on Master
```bash
sudo xmllint --noout /var/ossec/etc/rules/local_suricata_rules.xml && echo "Rules XML OK"

# Test with wazuh-logtest — paste a sample EVE JSON alert
sudo -u ossec /var/ossec/bin/wazuh-logtest
```

Paste this test EVE JSON alert in wazuh-logtest:
```json
{"timestamp":"2026-05-16T10:00:00.000000+0000","flow_id":123456,"in_iface":"eth0","event_type":"alert","src_ip":"198.51.100.1","src_port":45000,"dest_ip":"10.251.151.12","dest_port":22,"proto":"TCP","alert":{"action":"allowed","gid":1,"signature_id":2001219,"rev":20,"signature":"ET SCAN Potential SSH Scan","category":"Attempted Information Leak","severity":2},"flow":{"pkts_toserver":1,"pkts_toclient":0,"bytes_toserver":78,"bytes_toclient":0},"host":"wazuh-worker"}
```

Expected: Rule 200002 or 200012 should match at level 12 or 8.

---

## PHASE 6 — START SERVICES AND VALIDATE

### 6.1 Start Suricata
```bash
# On Worker Node
sudo systemctl daemon-reload
sudo systemctl enable suricata
sudo systemctl start suricata
sleep 5
sudo systemctl status suricata

# Check for errors
sudo tail -30 /var/log/suricata/suricata.log
sudo grep -i "error\|warn\|fatal" /var/log/suricata/suricata.log | head -20
```

If suricata fails to start:
```bash
# Common issue: interface name wrong
sudo grep "interface:" /etc/suricata/suricata.yaml
ip link show

# Common issue: rule file syntax error
sudo suricata -T -c /etc/suricata/suricata.yaml 2>&1

# Common issue: permission denied on log dir
sudo ls -la /var/log/suricata/
sudo chown -R $(whoami):$(whoami) /var/log/suricata/
```

### 6.2 Restart Wazuh (in correct order)
```bash
# Master first
ssh wazuh-user@10.251.151.11 "sudo /var/ossec/bin/wazuh-control restart"
sleep 30

# Then Worker
sudo /var/ossec/bin/wazuh-control restart
sleep 10
sudo /var/ossec/bin/wazuh-control status
```

### 6.3 Verify EVE JSON is being written
```bash
# Wait 30 seconds then check
sleep 30
ls -lh /var/log/suricata/eve.json
tail -5 /var/log/suricata/eve.json | python3 -m json.tool 2>/dev/null | head -20

# Verify Wazuh is reading it
sudo tail -f /var/ossec/logs/archives/archives.log | grep -i "suricata\|event_type" &
sleep 10
kill %1 2>/dev/null
```

### 6.4 Generate test traffic
```bash
# Test 1: ICMP ping sweep — should trigger rule 9000007
ping -c 5 10.251.151.11
ping -c 5 10.251.151.13
ping -c 5 10.251.151.14

# Test 2: Port scan simulation using nmap (if available)
which nmap && sudo nmap -sS -p 1-1000 10.251.151.11 2>/dev/null || \
  echo "nmap not available — using curl for HTTP test"

# Test 3: HTTP traffic — generate flow events
curl -sk https://10.251.151.14 -o /dev/null -w "%{http_code}\n" || true
curl -sk http://10.251.151.14 -o /dev/null || true

# Test 4: DNS lookup — generate DNS events
dig google.com @8.8.8.8 2>/dev/null || nslookup google.com 2>/dev/null || true
```

### 6.5 Verify alerts in EVE JSON
```bash
# Check for any alert events
sleep 15
cat /var/log/suricata/eve.json | python3 -c "
import sys, json
for line in sys.stdin:
    try:
        e = json.loads(line)
        if e.get('event_type') == 'alert':
            print('ALERT:', e.get('alert',{}).get('signature','?'),
                  '| src:', e.get('src_ip','?'),
                  '→ dst:', e.get('dest_ip','?'))
    except: pass
" | tail -20

# Check total events by type
cat /var/log/suricata/eve.json | python3 -c "
import sys, json
from collections import Counter
types = Counter()
for line in sys.stdin:
    try: types[json.loads(line).get('event_type','?')] += 1
    except: pass
for k,v in types.most_common(): print(f'{k}: {v}')
"
```

### 6.6 Verify Wazuh alerts
```bash
# On Master Node
ssh wazuh-user@10.251.151.11
sudo tail -f /var/ossec/logs/alerts/alerts.json | python3 -c "
import sys, json
for line in sys.stdin:
    try:
        a = json.loads(line)
        rule = a.get('rule', {})
        if 'suricata' in str(rule.get('groups', [])):
            print('WAZUH ALERT:', rule.get('id'), 'Level:', rule.get('level'))
            print('  Description:', rule.get('description'))
            print()
    except: pass
" &
sleep 30
kill %1 2>/dev/null
```

---

## PHASE 7 — CONFIGURE DASHBOARD VISUALIZATIONS

### 7.1 Verify data in OpenSearch
```bash
# Check Suricata data indexed in OpenSearch
curl -sk -u admin:admin https://10.251.151.13:9200/wazuh-alerts-*/_count \
  -H "Content-Type: application/json" \
  -d '{"query":{"match":{"rule.groups":"suricata"}}}' | python3 -m json.tool
```

### 7.2 Dashboard panels to create
Via Wazuh Dashboard UI (https://10.251.151.14):

Go to: Modules → Threat Hunting → Add filters:
```
rule.groups: suricata
```

Create a new Dashboard named: "Suricata IDS Overview"
Add these panels using the Visualize tool:

**Panel 1: Alert Timeline (Area chart)**
- Index: wazuh-alerts-*
- Query: rule.groups:suricata AND event_type:alert
- X-axis: @timestamp (30min interval)
- Y-axis: Count
- Split: alert.severity.keyword

**Panel 2: Top Source IPs (Data table)**
- Query: rule.groups:suricata AND event_type:alert
- Bucket: Terms on src_ip.keyword (Top 20)
- Columns: src_ip, Count, alert.category

**Panel 3: Alert Category Distribution (Pie)**
- Query: rule.groups:suricata AND event_type:alert
- Slices: Terms on alert.category.keyword (Top 10)

**Panel 4: Top Signatures (Horizontal bar)**
- Query: rule.groups:suricata AND event_type:alert
- Y-axis: Terms on alert.signature.keyword (Top 15)
- X-axis: Count

**Panel 5: Severity Gauge (Metric)**
- Severity 1+2 count: rule.groups:suricata AND alert.severity:[1 TO 2]
- Show as: Big number with red background when > 0

**Panel 6: Protocol Distribution (Pie)**
- Query: rule.groups:suricata
- Slices: Terms on proto.keyword

**Panel 7: Destination Ports Targeted (Tag cloud)**
- Query: rule.groups:suricata AND event_type:alert
- Field: dest_port

**Panel 8: Event Types Timeline**
- Query: rule.groups:suricata
- Split: event_type.keyword (alert, flow, http, dns, tls, anomaly)

---

## PHASE 8 — CONFIGURE ALERTS AND ACTIVE RESPONSE

### 8.1 Email alert for critical Suricata events
Add to `/var/ossec/etc/ossec.conf` on Master:
```xml
<email_alerts>
  <email_to>soc@yourdomain.com</email_to>
  <level>12</level>
  <group>suricata,</group>
  <do_not_delay/>
</email_alerts>
```

### 8.2 Active Response — block IPs detected by Suricata IDS
Even in IDS mode, Wazuh Active Response can block at the OS level:
```xml
<active-response>
  <command>firewall-drop</command>
  <location>local</location>
  <rules_id>200001,200002,200010,200011,200021</rules_id>
  <timeout>3600</timeout>
</active-response>
```

### 8.3 Webhook notification for high-severity alerts
Create `/var/ossec/integrations/custom-suricata-notify.py` on Master:
```python
#!/usr/bin/env python3
import sys, json, requests

alert_file = open(sys.argv[1])
webhook_url = sys.argv[2]
alert = json.load(alert_file)
alert_file.close()

rule = alert.get("rule", {})
data = alert.get("data", {})
level = rule.get("level", 0)

if level < 10:
    sys.exit(0)

sig     = data.get("alert", {}).get("signature", "N/A")
cat     = data.get("alert", {}).get("category", "N/A")
sev     = data.get("alert", {}).get("severity", "?")
src_ip  = data.get("src_ip", "N/A")
dst_ip  = data.get("dest_ip", "N/A")
dst_port= data.get("dest_port", "N/A")
proto   = data.get("proto", "N/A")

emoji = "🔴" if level >= 12 else "🟠"
msg = {
    "text": (
        f"{emoji} *Suricata IDS Alert — Level {level}*\n"
        f"Rule: {rule.get('id')} — {rule.get('description','N/A')}\n"
        f"Signature: `{sig}`\n"
        f"Category: `{cat}` | Severity: `{sev}`\n"
        f"Traffic: `{src_ip}` → `{dst_ip}:{dst_port}` ({proto})"
    )
}

try:
    resp = requests.post(webhook_url, json=msg, timeout=10)
    if resp.status_code != 200:
        print(f"Webhook error: {resp.status_code}", file=sys.stderr)
except Exception as e:
    print(f"Webhook failed: {e}", file=sys.stderr)
```

```bash
sudo chmod 750 /var/ossec/integrations/custom-suricata-notify*
sudo chown root:wazuh /var/ossec/integrations/custom-suricata-notify*
```

Add to `ossec.conf` on Master:
```xml
<integration>
  <name>custom-suricata-notify</name>
  <hook_url>https://hooks.slack.com/services/YOUR/WEBHOOK/URL</hook_url>
  <level>10</level>
  <group>suricata,</group>
  <alert_format>json</alert_format>
</integration>
```

### 8.4 Final restart after all config changes
```bash
# Validate all XML on Master
sudo xmllint --noout /var/ossec/etc/ossec.conf && echo "ossec.conf OK"
sudo xmllint --noout /var/ossec/etc/rules/local_suricata_rules.xml && echo "Rules OK"

# Restart Master
sudo /var/ossec/bin/wazuh-control restart
sleep 30

# Restart Worker
ssh wazuh-user@10.251.151.12 "sudo /var/ossec/bin/wazuh-control restart"
```

---

## PHASE 9 — VERIFY SURICATA PERFORMANCE

### 9.1 Check resource usage
```bash
# On Worker Node
ps aux | grep suricata
top -b -n 1 -p $(pgrep suricata) 2>/dev/null | tail -5

# Suricata internal stats
sudo cat /var/log/suricata/stats.log | tail -30

# EVE JSON file size (should be growing)
watch -n 5 "ls -lh /var/log/suricata/eve.json"
```

### 9.2 Check Suricata counters
```bash
sudo suricatasc -c "dump-counters" 2>/dev/null | python3 -m json.tool | \
  grep -E "capture|alert|decoder" | head -20
```

### 9.3 Check rule performance
```bash
sudo tail -50 /var/log/suricata/rule_perf.log 2>/dev/null | head -30
```

### 9.4 Log rotation setup
```bash
sudo tee /etc/logrotate.d/suricata > /dev/null << 'EOF'
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
        /bin/kill -HUP $(cat /var/run/suricata/suricata.pid 2>/dev/null) 2>/dev/null || true
    endscript
}
EOF
```

---

## PHASE 10 — FINAL REPORT

After completing all phases, produce a complete report:

### Report sections:

**10.1 Installation Summary**
- Suricata version installed
- Installation method (EPEL/RPM/source)
- Network interface monitored
- Rules loaded (ET rules count + custom rules count)
- EVE JSON location

**10.2 Configuration Summary**
- HOME_NET defined
- Log outputs enabled: list all (eve-log, fast, stats)
- Protocol decoders enabled: list (HTTP, DNS, TLS, SSH, SMTP, FTP, etc.)
- Custom rules created: list rule IDs and descriptions

**10.3 Wazuh Integration**
- localfile directive: added to Worker ossec.conf (yes/no)
- Custom Wazuh rules: deployed to Master (yes/no)
- Rule IDs deployed: list all (200000–200050)
- Highest rule level: 15

**10.4 Test Results**
| Test | Expected Event | EVE JSON | Wazuh Alert | Rule ID |
|------|---------------|----------|-------------|---------|
| ICMP ping | event_type:alert | yes/no | yes/no | - |
| HTTP traffic | event_type:http | yes/no | - | - |
| DNS lookup | event_type:dns | yes/no | - | - |
| Port scan (if run) | Reconnaissance alert | yes/no | yes/no | 200012 |

**10.5 Active Response & Alerts**
- Email alert: configured (yes/no)
- Slack webhook: configured (yes/no)
- Active Response block: configured for rules (list rule IDs)

**10.6 Performance Baseline**
- CPU usage: X%
- Memory usage: X MB
- Packets per second: X (from stats.log)
- Alerts per minute: X (average)

**10.7 Issues Encountered and Fixes**
List any issues encountered during installation and how they were resolved.

**10.8 Recommendations for Next Steps**
Provide the top 5 recommendations for improving Suricata coverage, such as:
1. Tune threshold.config to reduce false positives in this environment
2. Enable additional protocol decoders (e.g. Modbus if OT/SCADA present)
3. Add mirror port / SPAN port from MikroTik to capture more traffic
4. Consider upgrading to IPS mode after 2 weeks of IDS tuning
5. Integrate Suricata community-id with FortiGate logs for flow correlation

---

## REFERENCE: Key File Locations

| File | Node | Purpose |
|------|------|---------|
| /etc/suricata/suricata.yaml | Worker | Main config |
| /etc/suricata/rules/*.rules | Worker | ET + Custom rules |
| /etc/suricata/rules/local.rules | Worker | Custom environment rules |
| /etc/suricata/threshold.config | Worker | Noise suppression |
| /var/log/suricata/eve.json | Worker | Primary output → Wazuh reads this |
| /var/log/suricata/fast.log | Worker | Quick alert review |
| /var/log/suricata/suricata.log | Worker | Service log |
| /var/ossec/etc/rules/local_suricata_rules.xml | Master | Wazuh rules |
| /var/ossec/etc/ossec.conf | Worker | localfile directive |
| /var/ossec/integrations/custom-suricata-notify.py | Master | Webhook |

## REFERENCE: Suricata Commands

```bash
# Test config
sudo suricata -T -c /etc/suricata/suricata.yaml -v

# Update rules
sudo suricata-update

# Reload rules without restart (live)
sudo kill -USR2 $(cat /var/run/suricata/suricata.pid)

# Interactive socket control
sudo suricatasc -c "version"
sudo suricatasc -c "iface-list"
sudo suricatasc -c "dump-counters"

# Read a pcap file (offline test)
sudo suricata -r /path/to/test.pcap -c /etc/suricata/suricata.yaml -l /tmp/suricata-test/

# Check EVE JSON for specific event types
cat /var/log/suricata/eve.json | python3 -c "
import sys, json
for line in sys.stdin:
    try:
        e = json.loads(line)
        if e.get('event_type') == 'alert':
            print(json.dumps(e, indent=2))
    except: pass
" | head -100
```
