# Agent Prompt: FortiGate → Wazuh Integration
# ใช้กับ: Claude Code / AI Agent ที่มี SSH access
# วันที่สร้าง: 2026-05-16

---

## SYSTEM CONTEXT

You are a senior Linux security engineer and Wazuh SIEM specialist.
You have SSH access to the following infrastructure:

```
Cluster Architecture:
  Master Node   : 10.251.151.11  (Rules, Decoders, Cluster control)
  Worker Node   : 10.251.151.12  (Syslog receiver — target for FortiGate)
  Indexer Node  : 10.251.151.13  (OpenSearch :9200)
  Dashboard     : 10.251.151.14  (HTTPS :443)

SSH credentials : user=wazuh-user, password=wazuh
                  use `sudo su` for root operations
Wazuh API/UI   : admin / admin

FortiGate syslog config (already set on device):
  Destination   : 10.251.151.12
  Port          : 1514
  Protocol      : UDP
  Facility      : local7
  Format        : default (key=value pairs)
  Log types     : traffic, utm, event, system
```

## OPERATING RULES (follow strictly)

- Run READ-ONLY commands first, report exact output before making any changes
- Never assume — show actual command output at every step
- If a required file or service is missing, STOP and report — do not skip
- Validate all XML with `xmllint --noout` before deploying
- Restart order is ALWAYS: Master first → wait 30s → Worker
- All Rules and Decoders go on Master Node (10.251.151.11) ONLY
- All Syslog receiver config goes on Worker Node (10.251.151.12) ONLY
- Create backups before modifying any existing file
- Test with `wazuh-logtest` before every restart

---

## PHASE 1 — VERIFY LOG INGESTION ON WORKER NODE

Connect to Worker Node (10.251.151.12) and run the following checks.
Show full output of each command before proceeding.

### 1.1 Check if UDP 1514 is open and listening
```bash
sudo ss -ulnp | grep 1514
sudo netstat -ulnp | grep 1514
```

### 1.2 Capture live FortiGate packets (run for 30 seconds)
```bash
sudo tcpdump -i any udp port 1514 -nn -c 50 -A 2>/dev/null | head -100
```
> If no packets appear after 30 seconds, report: "No FortiGate packets detected on UDP 1514"
> Do NOT proceed to Phase 2 until packets are confirmed.

### 1.3 Check Wazuh remote config on Worker
```bash
sudo grep -A 10 "<remote>" /var/ossec/etc/ossec.conf
```
If port 1514 / UDP / syslog block is missing, add it:
```xml
<remote>
  <connection>syslog</connection>
  <port>1514</port>
  <protocol>udp</protocol>
  <allowed-ips>any</allowed-ips>
</remote>
```
Then restart Worker:
```bash
sudo systemctl restart wazuh-manager
sudo systemctl status wazuh-manager
```

### 1.4 Confirm logs reaching Wazuh archives
```bash
sudo tail -50 /var/ossec/logs/archives/archives.log | grep -i "fortigate\|devname\|logid\|type=traffic\|type=event"
```
> Save 10 sample raw log lines for Phase 2 research. Copy exact format.

### 1.5 Report Phase 1 Summary
State clearly:
- UDP 1514 is open: yes/no
- FortiGate packets detected: yes/no
- Logs in archives.log: yes/no
- Sample raw log line (exact copy):

---

## PHASE 2 — RESEARCH AND AUDIT EXISTING FORTIGATE SUPPORT

### 2.1 Check Wazuh built-in FortiGate decoder
On Master Node (10.251.151.11):
```bash
ls -la /var/ossec/ruleset/decoders/ | grep -i "forti\|fortigate"
ls -la /var/ossec/ruleset/rules/ | grep -i "forti\|fortigate"
cat /var/ossec/ruleset/decoders/0100-fortigate_decoders.xml | head -80
cat /var/ossec/ruleset/rules/0391-fortigate_rules.xml | head -80
```

### 2.2 Test built-in decoder with real log sample
Use the sample log captured in Phase 1:
```bash
sudo -u ossec /var/ossec/bin/wazuh-logtest
```
Paste 3 different log types (traffic, event, utm) one at a time.
Record for each:
- Phase 1: pre-decoding result
- Phase 2: decoder matched (which decoder name)
- Phase 3: rule matched (rule ID, level, description)
- Whether alert would be generated

### 2.3 Identify FortiGate log structure from samples
From the captured logs, identify which fields are present:
- `date=`, `time=`, `devname=`, `devid=`, `logid=`
- `type=` (traffic / utm / event / system)
- `subtype=` (forward / local / vpn / webfilter / antivirus / ips / etc.)
- `action=` (accept / deny / block / close / etc.)
- `srcip=`, `dstip=`, `srcport=`, `dstport=`
- `policyid=`, `policyname=`, `service=`
- `app=`, `appcat=`, `apprisk=`
- `user=`, `authserver=`
- `msg=` (for event logs)
- `virus=`, `url=` (for UTM logs)

### 2.4 Research GitHub community decoders
Search and evaluate:
  https://github.com/alextibor/wazuh-fortigate-rules-decoders
  (738 decoders for FortiOS 7.0.14 / 7.2.x / 7.4.x)

Compare community decoders vs built-in. Report:
- Which version of FortiOS the built-in decoders support
- Which fields the built-in decoders miss
- Whether community decoders cover the log format in your captures

---

## PHASE 3 — DEPLOY / IMPROVE DECODERS AND RULES

Work on Master Node (10.251.151.11) only.

### 3.1 Backup existing files
```bash
sudo cp /var/ossec/ruleset/decoders/0100-fortigate_decoders.xml \
        /var/ossec/ruleset/decoders/0100-fortigate_decoders.xml.bak.$(date +%Y%m%d)
sudo cp /var/ossec/ruleset/rules/0391-fortigate_rules.xml \
        /var/ossec/ruleset/rules/0391-fortigate_rules.xml.bak.$(date +%Y%m%d)
```

### 3.2 Decision logic
- If built-in decoder matches all sample logs correctly → keep built-in, only add custom rules
- If built-in decoder misses fields or fails to match → create custom decoder at:
  `/var/ossec/etc/decoders/1002-fortigate_custom_decoders.xml`
- Custom files always take priority over ruleset files

### 3.3 Required custom decoder structure
Create `/var/ossec/etc/decoders/1002-fortigate_custom_decoders.xml`:

```xml
<!-- Parent: match all FortiGate logs by date= devname= pattern -->
<decoder name="fortigate">
  <prematch>^date=\d\d\d\d-\d\d-\d\d\s+time=\d\d:\d\d:\d\d\s+devname=</prematch>
</decoder>

<!-- Extract base fields common to all types -->
<decoder name="fortigate-base">
  <parent>fortigate</parent>
  <regex type="pcre2">devname="?([^"\s]+)"?\s+devid="?([^"\s]+)"?\s+logid="?(\d+)"?\s+type="?(\w+)"?\s+subtype="?(\w+)"?</regex>
  <order>hostname, extra_data, id, type, extra_data2</order>
</decoder>

<!-- Traffic logs: extract network 5-tuple + action + policy -->
<decoder name="fortigate-traffic">
  <parent>fortigate</parent>
  <regex type="pcre2">type="?traffic"?.*?srcip=([^\s]+).*?srcport=(\d+).*?dstip=([^\s]+).*?dstport=(\d+).*?action="?(\w+)"?</regex>
  <order>srcip, srcport, dstip, dstport, action</order>
</decoder>

<!-- Traffic with policy and service -->
<decoder name="fortigate-traffic-policy">
  <parent>fortigate</parent>
  <regex type="pcre2">policyid=(\d+).*?policyname="?([^"]+)"?.*?service="?([^"\s]+)"?</regex>
  <order>id, extra_data, protocol</order>
</decoder>

<!-- UTM / Security logs: virus, webfilter, ips, app control -->
<decoder name="fortigate-utm">
  <parent>fortigate</parent>
  <regex type="pcre2">type="?utm"?.*?subtype="?(\w+)"?.*?action="?(\w+)"?.*?srcip=([^\s]+).*?dstip=([^\s]+)</regex>
  <order>extra_data, action, srcip, dstip</order>
</decoder>

<!-- UTM with URL and user -->
<decoder name="fortigate-utm-url">
  <parent>fortigate</parent>
  <regex type="pcre2">url="([^"]+)".*?user="?([^"\s]+)"?</regex>
  <order>url, username</order>
</decoder>

<!-- Event logs: system events, VPN, admin login -->
<decoder name="fortigate-event">
  <parent>fortigate</parent>
  <regex type="pcre2">type="?event"?.*?subtype="?(\w+)"?.*?msg="([^"]+)"</regex>
  <order>extra_data, extra_data2</order>
</decoder>

<!-- Event with user auth fields -->
<decoder name="fortigate-event-auth">
  <parent>fortigate</parent>
  <regex type="pcre2">subtype="?(vpn|system|admin)"?.*?user="?([^"\s]+)"?.*?srcip=([^\s]+)</regex>
  <order>extra_data, username, srcip</order>
</decoder>
```

### 3.4 Required custom rules
Create `/var/ossec/etc/rules/1002-fortigate_custom_rules.xml`:

```xml
<group name="fortigate,firewall,">

  <!-- ===== BASE RULES ===== -->

  <rule id="110000" level="3">
    <decoded_as>fortigate</decoded_as>
    <description>FortiGate: General event</description>
    <group>fortigate,</group>
  </rule>

  <!-- ===== TRAFFIC RULES ===== -->

  <rule id="110010" level="3">
    <if_sid>110000</if_sid>
    <field name="type">traffic</field>
    <description>FortiGate: Traffic log - $(action) $(srcip):$(srcport) → $(dstip):$(dstport)</description>
    <group>fortigate,firewall_traffic,</group>
  </rule>

  <rule id="110011" level="5">
    <if_sid>110010</if_sid>
    <field name="action">deny|block|close</field>
    <description>FortiGate: Traffic DENIED $(srcip):$(srcport) → $(dstip):$(dstport) [policy: $(extra_data)]</description>
    <group>fortigate,firewall_drop,</group>
    <mitre>
      <id>T1046</id>
    </mitre>
  </rule>

  <rule id="110012" level="3">
    <if_sid>110010</if_sid>
    <field name="action">accept|pass</field>
    <description>FortiGate: Traffic ALLOWED $(srcip) → $(dstip):$(dstport)</description>
    <group>fortigate,firewall_allowed,</group>
  </rule>

  <!-- VPN Traffic -->
  <rule id="110013" level="5">
    <if_sid>110010</if_sid>
    <field name="protocol">udp</field>
    <match>dstport=500|dstport=4500|service="IKE"|service="IKE-NAT-T"</match>
    <description>FortiGate: IPSec VPN traffic detected from $(srcip)</description>
    <group>fortigate,vpn,</group>
    <mitre>
      <id>T1133</id>
    </mitre>
  </rule>

  <!-- ===== UTM / SECURITY RULES ===== -->

  <rule id="110020" level="3">
    <if_sid>110000</if_sid>
    <field name="type">utm</field>
    <description>FortiGate: UTM security event [$(extra_data)]</description>
    <group>fortigate,utm,</group>
  </rule>

  <!-- Antivirus -->
  <rule id="110021" level="12">
    <if_sid>110020</if_sid>
    <field name="extra_data">antivirus|av</field>
    <field name="action">blocked|detected</field>
    <description>FortiGate: VIRUS DETECTED and blocked from $(srcip) → $(dstip)</description>
    <group>fortigate,antivirus,malware,</group>
    <mitre>
      <id>T1204</id>
    </mitre>
  </rule>

  <!-- IPS -->
  <rule id="110022" level="10">
    <if_sid>110020</if_sid>
    <field name="extra_data">ips</field>
    <field name="action">dropped|blocked|reset</field>
    <description>FortiGate: IPS attack blocked from $(srcip) → $(dstip)</description>
    <group>fortigate,ips,attack,</group>
    <mitre>
      <id>T1190</id>
    </mitre>
  </rule>

  <!-- Web Filter: blocked -->
  <rule id="110023" level="5">
    <if_sid>110020</if_sid>
    <field name="extra_data">webfilter</field>
    <field name="action">blocked|denied</field>
    <description>FortiGate: Web access BLOCKED for $(username) - $(url)</description>
    <group>fortigate,webfilter,</group>
  </rule>

  <!-- App Control: risky app -->
  <rule id="110024" level="7">
    <if_sid>110020</if_sid>
    <field name="extra_data">app-ctrl|appctrl</field>
    <match>apprisk="critical"\|apprisk="high"</match>
    <description>FortiGate: High-risk application detected from $(srcip)</description>
    <group>fortigate,appcontrol,</group>
    <mitre>
      <id>T1071</id>
    </mitre>
  </rule>

  <!-- ===== EVENT RULES ===== -->

  <rule id="110030" level="3">
    <if_sid>110000</if_sid>
    <field name="type">event</field>
    <description>FortiGate: System event [$(extra_data)]</description>
    <group>fortigate,event,</group>
  </rule>

  <!-- Admin login success -->
  <rule id="110031" level="5">
    <if_sid>110030</if_sid>
    <field name="extra_data">system</field>
    <match>subtype="admin"</match>
    <match>action="login"</match>
    <description>FortiGate: Admin login by $(username) from $(srcip)</description>
    <group>fortigate,admin_login,authentication_success,</group>
    <mitre>
      <id>T1078</id>
    </mitre>
  </rule>

  <!-- Admin login failed -->
  <rule id="110032" level="7">
    <if_sid>110030</if_sid>
    <match>login failure\|loginfail\|authfailure</match>
    <description>FortiGate: Admin login FAILED from $(srcip)</description>
    <group>fortigate,authentication_failed,</group>
    <mitre>
      <id>T1110</id>
    </mitre>
  </rule>

  <!-- Brute force detection: 5 failed logins in 60 seconds -->
  <rule id="110033" level="12">
    <if_sid>110032</if_sid>
    <same_source_ip/>
    <timeframe>60</timeframe>
    <frequency>5</frequency>
    <description>FortiGate: BRUTE FORCE detected from $(srcip) - $(frequency) failed logins in 60s</description>
    <group>fortigate,brute_force,authentication_failed,</group>
    <mitre>
      <id>T1110.001</id>
    </mitre>
  </rule>

  <!-- VPN login success -->
  <rule id="110034" level="5">
    <if_sid>110030</if_sid>
    <field name="extra_data">vpn</field>
    <match>action="tunnel-up"\|action="ssl-login-pass"</match>
    <description>FortiGate: VPN tunnel established by $(username) from $(srcip)</description>
    <group>fortigate,vpn,authentication_success,</group>
    <mitre>
      <id>T1133</id>
    </mitre>
  </rule>

  <!-- VPN login failed -->
  <rule id="110035" level="8">
    <if_sid>110030</if_sid>
    <field name="extra_data">vpn</field>
    <match>action="ssl-login-fail"\|action="tunnel-down".*?reason="auth"</match>
    <description>FortiGate: VPN authentication FAILED for $(username) from $(srcip)</description>
    <group>fortigate,vpn,authentication_failed,</group>
    <mitre>
      <id>T1110</id>
    </mitre>
  </rule>

  <!-- Config change -->
  <rule id="110036" level="8">
    <if_sid>110030</if_sid>
    <match>action="set"\|action="delete"\|action="add"\|action="edit"</match>
    <match>subtype="config"</match>
    <description>FortiGate: Configuration CHANGED by $(username) from $(srcip)</description>
    <group>fortigate,config_changed,</group>
    <mitre>
      <id>T1562</id>
    </mitre>
  </rule>

  <!-- ===== THREAT INTELLIGENCE COMBINATION RULES ===== -->

  <!-- AbuseIPDB High Score + FortiGate deny -->
  <rule id="110040" level="14">
    <if_sid>110011</if_sid>
    <match>abuseipdb.score</match>
    <description>FortiGate: KNOWN MALICIOUS IP $(srcip) denied - correlated with AbuseIPDB</description>
    <group>fortigate,threat_intel,attack,</group>
  </rule>

</group>
```

### 3.5 Validate XML on Master
```bash
sudo xmllint --noout /var/ossec/etc/decoders/1002-fortigate_custom_decoders.xml && echo "Decoder OK"
sudo xmllint --noout /var/ossec/etc/rules/1002-fortigate_custom_rules.xml && echo "Rules OK"
```

### 3.6 Test with wazuh-logtest before restart
```bash
sudo -u ossec /var/ossec/bin/wazuh-logtest
```
Test these 4 log types (paste each one):
1. Traffic DENY log
2. Traffic ACCEPT log
3. UTM antivirus/IPS log
4. Event admin login log

All 4 must show decoder match + rule match before proceeding.

### 3.7 Restart cluster
```bash
# Master first
sudo /var/ossec/bin/wazuh-control restart
sudo /var/ossec/bin/wazuh-control status
sleep 30

# Then Worker
ssh wazuh-user@10.251.151.12 "sudo /var/ossec/bin/wazuh-control restart"
sleep 10
ssh wazuh-user@10.251.151.12 "sudo /var/ossec/bin/wazuh-control status"
```

### 3.8 Verify alerts are generating
```bash
sudo tail -f /var/ossec/logs/alerts/alerts.json | python3 -m json.tool | grep -A5 "fortigate"
```

---

## PHASE 4 — CREATE WAZUH DASHBOARD

Connect to Dashboard Node (10.251.151.14) or use Wazuh API.

### 4.1 Create Index Pattern (if not exists)
Via Wazuh Dashboard UI:
- Go to: Stack Management → Index Patterns → Create
- Pattern: `wazuh-alerts-*`
- Time field: `@timestamp`

### 4.2 Create FortiGate Dashboard via API
Use the Wazuh/OpenSearch Dashboard API to create saved objects.
Create a dashboard with these panels:

**Panel 1: FortiGate Traffic Overview (Last 24h)**
- Visualization type: Area chart
- Query: `rule.groups:fortigate AND data.type:traffic`
- X-axis: `@timestamp` (1 hour interval)
- Y-axis: Count of events
- Split series by: `data.action.keyword`
- Colors: green=accept, red=deny

**Panel 2: Top Denied Source IPs**
- Visualization type: Data Table
- Query: `rule.groups:firewall_drop AND agent.name:*`
- Metrics: Count
- Bucket: Terms on `data.srcip.keyword` (Top 20)
- Columns: srcip, Count, dstip, dstport

**Panel 3: UTM Security Events by Subtype**
- Visualization type: Pie chart
- Query: `rule.groups:fortigate AND data.type:utm`
- Split slices: Terms on `data.extra_data.keyword`

**Panel 4: FortiGate Alert Level Heatmap**
- Visualization type: Heat map
- Query: `rule.groups:fortigate`
- Y-axis: `rule.level` ranges (3-5 / 6-9 / 10-12 / 13-15)
- X-axis: `@timestamp` (1h buckets)

**Panel 5: VPN Connections Map**
- Visualization type: Coordinate map
- Query: `rule.groups:fortigate AND rule.groups:vpn`
- Geo field: `GeoLocation.location` (from srcip)

**Panel 6: Admin Activity Timeline**
- Visualization type: Timeline
- Query: `rule.groups:fortigate AND (rule.groups:authentication_success OR rule.groups:config_changed)`

**Panel 7: Brute Force Alerts**
- Visualization type: Metric (count)
- Query: `rule.id:110033`
- Background: red when count > 0

**Panel 8: Top Applications (AppControl)**
- Visualization type: Horizontal bar
- Query: `rule.groups:fortigate AND data.extra_data:app-ctrl`
- X-axis: Count, Y-axis: Terms on `data.extra_data2.keyword` (app name)

### 4.3 Dashboard settings
- Name: `FortiGate Security Overview`
- Time range default: Last 24 hours
- Auto-refresh: Every 5 minutes
- Save to: `/var/ossec/etc/` as JSON for backup

---

## PHASE 5 — CONFIGURE ALERTS AND NOTIFICATIONS

Work on Master Node (10.251.151.11).

### 5.1 Email alerts for critical FortiGate events
Add to `/var/ossec/etc/ossec.conf`:
```xml
<email_alerts>
  <email_to>soc@yourdomain.com</email_to>
  <level>10</level>
  <group>fortigate,</group>
  <do_not_delay/>
</email_alerts>
```

### 5.2 Active Response — Auto-block brute force IPs
```xml
<active-response>
  <command>firewall-drop</command>
  <location>local</location>
  <rules_id>110033</rules_id>
  <timeout>3600</timeout>
</active-response>
```

### 5.3 Webhook to Slack/Line/Teams
Create `/var/ossec/integrations/custom-fortigate-notify`:
```bash
#!/bin/sh
WPYTHON_BIN="framework/python/bin/python3"
WAZUH_PATH="$(cd $(dirname $0)/..; pwd)"
${WAZUH_PATH}/${WPYTHON_BIN} ${WAZUH_PATH}/integrations/custom-fortigate-notify.py "$@"
```

Create `/var/ossec/integrations/custom-fortigate-notify.py`:
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

srcip  = data.get("srcip", "N/A")
dstip  = data.get("dstip", "N/A")
action = data.get("action", "N/A")
desc   = rule.get("description", "N/A")
rule_id = rule.get("id", "N/A")

emoji = "🔴" if level >= 12 else "🟠"
msg = {
    "text": f"{emoji} *FortiGate Alert Level {level}*\n"
            f"Rule: {rule_id} — {desc}\n"
            f"Source: `{srcip}` → Destination: `{dstip}`\n"
            f"Action: `{action}`"
}

try:
    requests.post(webhook_url, json=msg, timeout=10)
except:
    pass
```

Add to `ossec.conf`:
```xml
<integration>
  <name>custom-fortigate-notify</name>
  <hook_url>https://hooks.slack.com/services/YOUR/WEBHOOK/URL</hook_url>
  <level>10</level>
  <group>fortigate,</group>
  <alert_format>json</alert_format>
</integration>
```

```bash
sudo chmod 750 /var/ossec/integrations/custom-fortigate-notify*
sudo chown root:wazuh /var/ossec/integrations/custom-fortigate-notify*
```

### 5.4 AbuseIPDB correlation for FortiGate IPs
Ensure existing AbuseIPDB integration also triggers on FortiGate alerts:
```xml
<!-- Update existing AbuseIPDB integration to include fortigate group -->
<integration>
  <name>custom-abuseipdb</name>
  <api_key>YOUR_ABUSEIPDB_KEY</api_key>
  <group>fortigate,firewall_drop,</group>
  <alert_format>json</alert_format>
</integration>
```

---

## PHASE 6 — END-TO-END TESTING

### 6.1 Verify log flow
```bash
# On Worker — check FortiGate logs arriving
sudo tail -f /var/ossec/logs/archives/archives.log | grep devname

# On Master — check alerts generating
sudo tail -f /var/ossec/logs/alerts/alerts.json | python3 -m json.tool
```

### 6.2 Simulate events (inject test logs via logger)
Run these on Worker Node to simulate FortiGate logs:
```bash
# Simulate Traffic DENY
logger -p local7.warning 'date=2026-05-16 time=10:00:00 devname="FGT-PROD" devid="FGT123456" logid="0000000001" type="traffic" subtype="forward" level="warning" vd="root" srcip=203.0.113.99 srcport=54321 dstip=10.251.151.11 dstport=22 proto=6 action="deny" policyid=0 policyname="Implicit Deny" service="SSH" sentbyte=0 rcvdbyte=0'

# Simulate Admin Login
logger -p local7.warning 'date=2026-05-16 time=10:01:00 devname="FGT-PROD" devid="FGT123456" logid="0100032001" type="event" subtype="system" level="information" vd="root" srcip=192.168.1.10 user="admin" action="login" status="success" msg="Administrator admin logged in successfully from 192.168.1.10"'

# Simulate Virus Detected
logger -p local7.warning 'date=2026-05-16 time=10:02:00 devname="FGT-PROD" devid="FGT123456" logid="0211008192" type="utm" subtype="antivirus" level="warning" vd="root" srcip=10.0.0.50 srcport=12345 dstip=93.184.216.34 dstport=80 action="blocked" virus="Eicar-Test-Signature" service="HTTP" url="http://evil.example.com/eicar.txt"'

# Simulate Brute Force (run 6 times)
for i in {1..6}; do
  logger -p local7.warning "date=2026-05-16 time=10:0${i}:00 devname=\"FGT-PROD\" devid=\"FGT123456\" logid=\"0100032002\" type=\"event\" subtype=\"system\" level=\"warning\" vd=\"root\" srcip=198.51.100.77 user=\"hacker\" action=\"login\" status=\"failed\" msg=\"Administrator hacker login failure from 198.51.100.77\""
  sleep 5
done
```

### 6.3 Validate each test
For each simulated log:
```bash
sudo grep -i "198.51.100.77\|203.0.113.99\|Eicar" /var/ossec/logs/alerts/alerts.json | tail -20
```
Confirm:
- [ ] Traffic DENY → Rule 110011 triggered (level 5)
- [ ] Admin Login → Rule 110031 triggered (level 5)
- [ ] Virus Blocked → Rule 110021 triggered (level 12)
- [ ] Brute Force → Rule 110033 triggered (level 12) after 5 fails

### 6.4 Validate Dashboard
- Open https://10.251.151.14
- Navigate to FortiGate Security Overview dashboard
- Confirm all 8 panels show data
- Verify time range shows last 15 minutes (simulated events should appear)

### 6.5 Validate active response
```bash
# After brute force test, check if IP was blocked
sudo iptables -L | grep 198.51.100.77
# or
sudo /var/ossec/bin/manage_agents -l | grep blocked
```

---

## PHASE 7 — FINAL REPORT AND RECOMMENDATIONS

After completing all phases, produce a structured final report:

### Report Structure

**7.1 Log Ingestion Status**
- FortiGate → Worker Node (UDP 1514): ✓/✗
- Log format confirmed: key=value pairs
- Log types received: traffic / utm / event / system

**7.2 Decoder Status**
- Built-in decoder (0100-fortigate_decoders.xml): compatible / needs enhancement
- Custom decoder deployed: yes/no — path
- Fields successfully decoded: list all field names

**7.3 Rules Deployed**
| Rule ID | Level | Description | MITRE |
|---------|-------|-------------|-------|
| 110000  | 3     | Base FortiGate | - |
| 110011  | 5     | Traffic Denied | T1046 |
| 110021  | 12    | Virus Detected | T1204 |
| 110033  | 12    | Brute Force    | T1110.001 |
| ...     | ...   | ...            | ... |

**7.4 Dashboard Status**
- Dashboard name: FortiGate Security Overview
- Panels created: list all 8
- URL: https://10.251.151.14/app/dashboards

**7.5 Alerts Configured**
- Email alert: level 10+ on fortigate group
- Slack/webhook: level 10+ on fortigate group
- Active Response: auto-block brute force (rule 110033)
- AbuseIPDB: enabled for fortigate + firewall_drop groups

**7.6 Test Results**
| Test Case | Expected Rule | Triggered? | Level |
|-----------|--------------|------------|-------|
| Traffic DENY | 110011 | yes/no | - |
| Admin Login | 110031 | yes/no | - |
| Virus Blocked | 110021 | yes/no | - |
| Brute Force | 110033 | yes/no | - |

**7.7 Issues Found and Fixed**
List any issues encountered and how they were resolved.

**7.8 Remaining Recommendations**
List items not yet done, prioritized:
1. Items requiring FortiGate CLI access (enable IPS/AV logs)
2. Geo-IP enrichment for srcip
3. Correlation rules with OTX/AbuseIPDB
4. Retention policy for FortiGate indexes
5. Any decoder gaps found for specific log types

---

## REFERENCE: FortiGate Log Types and Expected Rule IDs

| FortiGate Log Type | subtype | Wazuh Rule | Level |
|-------------------|---------|-----------|-------|
| traffic | forward | 110010/110011/110012 | 3/5 |
| traffic | local | 110010 | 3 |
| utm | antivirus | 110021 | 12 |
| utm | ips | 110022 | 10 |
| utm | webfilter | 110023 | 5 |
| utm | app-ctrl | 110024 | 7 |
| event | system/admin | 110031/110032 | 5/7 |
| event | vpn | 110034/110035 | 5/8 |
| event | config | 110036 | 8 |
| brute-force | (auto) | 110033 | 12 |

## REFERENCE: Key File Paths

| File | Node | Purpose |
|------|------|---------|
| /var/ossec/etc/decoders/1002-fortigate_custom_decoders.xml | Master | Custom decoders |
| /var/ossec/etc/rules/1002-fortigate_custom_rules.xml | Master | Custom rules |
| /var/ossec/etc/ossec.conf | Master + Worker | Main config |
| /var/ossec/integrations/custom-fortigate-notify.py | Master | Webhook script |
| /var/ossec/logs/alerts/alerts.json | Master | Alert output |
| /var/ossec/logs/archives/archives.log | Worker | Raw log archive |
| /var/ossec/logs/ossec.log | All | Service logs |
