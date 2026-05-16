# Huawei Firewall Wazuh Integration - Deployment & Implementation Guide

**Version:** 2.0  
**Last Updated:** 2024-05-13  
**Status:** Production Ready  

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [System Architecture](#system-architecture)
3. [File Deployment](#file-deployment)
4. [Validation & Testing](#validation--testing)
5. [Troubleshooting](#troubleshooting)
6. [Dashboard Configuration](#dashboard-configuration)
7. [Monitoring & Alerting](#monitoring--alerting)
8. [Performance Tuning](#performance-tuning)

---

## Quick Start

### For the Impatient

```bash
# 1. SSH to Master node
ssh wazuh-user@10.251.151.11
sudo su

# 2. Copy files
cp /path/to/1001-huawei_decoders.xml /var/ossec/etc/decoders/
cp /path/to/1001-huawei_rules.xml /var/ossec/etc/rules/

# 3. Fix permissions
chown root:wazuh /var/ossec/etc/decoders/1001-huawei_decoders.xml
chown root:wazuh /var/ossec/etc/rules/1001-huawei_rules.xml
chmod 640 /var/ossec/etc/decoders/1001-huawei_decoders.xml
chmod 640 /var/ossec/etc/rules/1001-huawei_rules.xml

# 4. Restart and verify
systemctl restart wazuh-manager
sleep 5
/var/ossec/bin/cluster_control -i

# 5. Check Dashboard at https://10.251.151.14
```

---

## System Architecture

### Current Setup

```
┌─────────────────────────────────────────────────────────────────┐
│                    HUAWEI FIREWALL CLUSTER                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                         Syslog UDP 514
                              │
                    ┌─────────▼──────────┐
                    │  WAZUH WORKER      │
                    │ 10.251.151.12      │
                    │  - Parser          │
                    │  - Analyzer        │
                    │  - Alert Gen       │
                    └─────────┬──────────┘
                              │
                     TCP 1516 (Cluster)
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
    ┌─────────┐          ┌─────────┐          ┌──────────┐
    │ MASTER  │          │INDEXER  │          │DASHBOARD │
    │10.x.11  │          │10.x.13  │          │ 10.x.14  │
    └─────────┘          └─────────┘          └──────────┘
    - Rules/Decoders    - Storage (ES)      - Web UI (443)
    - Config Sync       - Long-term logs    - Visualization
```

### Data Flow

```
Huawei Logs → UDP 514 → Worker Parser → Rule Matching → Alert Generation
                           ↓                               ↓
                      Decoders extract fields      Rule ID + Level
                           ↓                               ↓
                      JSON Parsing           → Indexer Storage
                                                      ↓
                                          Dashboard Visualization
```

---

## File Deployment

### 1. Prepare Files on Master Node

```bash
# Create backup
sudo mkdir -p /var/ossec/etc/decoders.backup_$(date +%Y%m%d)
sudo cp /var/ossec/etc/decoders/* /var/ossec/etc/decoders.backup_$(date +%Y%m%d)/

# Copy Huawei decoders
sudo cp 1001-huawei_decoders.xml /var/ossec/etc/decoders/

# Copy Huawei rules
sudo cp 1001-huawei_rules.xml /var/ossec/etc/rules/
```

### 2. Set Proper Permissions

```bash
# Owner and group
sudo chown root:wazuh /var/ossec/etc/decoders/1001-huawei_decoders.xml
sudo chown root:wazuh /var/ossec/etc/rules/1001-huawei_rules.xml

# Permissions (read-only for wazuh user)
sudo chmod 640 /var/ossec/etc/decoders/1001-huawei_decoders.xml
sudo chmod 640 /var/ossec/etc/rules/1001-huawei_rules.xml
```

### 3. Verify File Syntax

```bash
# Test decoders
sudo /var/ossec/bin/wazuh-logtest -d 1001-huawei_decoders.xml -t

# Test rules
# (Note: Wazuh doesn't have a rule test without decoders, next step)
```

### 4. Restart Manager Services

```bash
# Master node
sudo systemctl restart wazuh-manager
sleep 3

# Verify service is running
sudo systemctl status wazuh-manager
sudo /var/ossec/bin/wazuh-control status
```

---

## Validation & Testing

### Step 1: Verify Cluster Sync

```bash
# On Master
sudo /var/ossec/bin/cluster_control -i

# Expected output:
# Cluster name      : wazuh
# Node name         : master
# Node type         : master
# Healthy           : yes
# Connected nodes   : 1 (worker)
# Last sync         : 2024-05-13 10:30:45
```

### Step 2: Test Decoder with Sample Logs

```bash
# Copy sample logs to Worker
sudo cat /path/to/huawei_firewall_sample_logs.txt | \
  nc -w 1 localhost 514

# Alternative: Use our Python analyzer
python3 huawei_firewall_analyzer.py --validate-decoders 1001-huawei_decoders.xml
```

### Step 3: Monitor Alerts in Real-Time

```bash
# On Worker node - watch for new alerts
sudo tail -f /var/ossec/logs/alerts/alerts.json | jq '.'

# Alternative: Check ossec.log for errors
sudo tail -f /var/ossec/logs/ossec.log | grep -i "huawei\|decoder\|rule"
```

### Step 4: Generate Test Report

```bash
# Run comprehensive analysis
python3 huawei_firewall_analyzer.py \
  --generate-report samples/huawei_firewall_sample_logs.txt \
  --output deployment_report.html \
  --format html

# Generate validation checklist
python3 wazuh_deployment_test.py --generate-checklist
```

### Step 5: Verify Dashboard Integration

1. **Access Wazuh Dashboard**
   - URL: https://10.251.151.14
   - Username: admin
   - Password: admin

2. **Check Huawei Events**
   - Navigate to: Analytics → Security Events
   - Filter by: `agent.name = huawei-usg-master`
   - Verify events with `decoder.name = huawei-*`

3. **View Alerts**
   - Navigate to: Alerts → Security Alerts
   - Filter by: Rule ID range 100001-100500
   - Verify severity levels match expected

---

## Validation Checklist

Run this comprehensive validation:

```bash
# Syntax validation
./scripts/wazuh_deployment_test.py \
  --validate decoders/1001-huawei_decoders.xml rules/1001-huawei_rules.xml

# Decoder testing
./scripts/wazuh_deployment_test.py \
  --test-decoders samples/huawei_firewall_sample_logs.txt \
  --test-logfile decoders/1001-huawei_decoders.xml

# Generate report
./scripts/wazuh_deployment_test.py \
  --report deployment_validation.json
```

---

## Troubleshooting

### Issue 1: Logs Received but No Alerts

**Symptom:** tcpdump shows logs arriving, but no alerts in dashboard

**Diagnosis:**

```bash
# Step 1: Check if Worker is listening
sudo ss -ulpn | grep 514
# Expected: wazuh-remoted   0  0  0.0.0.0:514  0.0.0.0:*

# Step 2: Check if IP is in allowed list
sudo cat /var/ossec/etc/ossec.conf | grep -A 10 "<remote>"
# Check for: <allowed-ips>any</allowed-ips> or your Huawei IP

# Step 3: Check analysis engine
sudo tail -100 /var/ossec/logs/ossec.log | grep -i "decoder\|error"
# Look for: "No decoder matched"

# Step 4: Test with logtest
echo "YOUR_LOG_LINE_HERE" | sudo /var/ossec/bin/wazuh-logtest
# Should show: "Alert to be generated" in Phase 3
```

**Solution:**

```bash
# If Syslog not listening:
# Edit /var/ossec/etc/ossec.conf, add under <remote>:
<remote>
  <connection>syslog</connection>
  <port>514</port>
  <protocol>udp</protocol>
  <allowed-ips>any</allowed-ips>
</remote>

# Restart manager
sudo systemctl restart wazuh-manager
```

### Issue 2: "No Decoder Matched" Errors

**Symptom:** Logs in ossec.log show: "No decoder matched"

**Diagnosis:**

```bash
# Check if decoder file is valid XML
sudo xmllint --noout /var/ossec/etc/decoders/1001-huawei_decoders.xml

# Check if decoder is loaded
sudo grep "huawei" /var/ossec/logs/ossec.log

# Manually test a sample log
echo "2024-05-13 14:23:45 huawei-usg-master [%%01SECURITY/4/ACCESSPOLICY_DENY(l):]: source-ip=192.168.1.100" | \
  sudo /var/ossec/bin/wazuh-logtest
```

**Solution:**

```bash
# Check decoder syntax
# Look for: Missing parent decoders, typos in regex, invalid XML

# Force cluster sync
sudo /var/ossec/bin/cluster_control -r

# Restart
sudo systemctl restart wazuh-manager
```

### Issue 3: Cluster Sync Failing

**Symptom:** `cluster_control -i` shows "n/a" for Worker

**Diagnosis:**

```bash
# Check Master-Worker connectivity
nc -zv 10.251.151.12 1516

# Check cluster status on Worker
sudo /var/ossec/bin/cluster_control -i

# Check logs
sudo grep -i "cluster" /var/ossec/logs/ossec.log | tail -20
```

**Solution:**

```bash
# On Master
sudo /var/ossec/bin/cluster_control -r

# On Worker  
sudo /var/ossec/bin/cluster_control -r

# Monitor sync
watch "sudo /var/ossec/bin/cluster_control -i"
```

### Issue 4: High CPU/Memory Usage

**Symptom:** Wazuh processes using high resources

**Solution:**

```bash
# Limit rule evaluation
# Edit /var/ossec/etc/ossec.conf:

<remote>
  <connection>syslog</connection>
  <port>514</port>
  <protocol>udp</protocol>
  <max_clients>1000</max_clients>
  <queue_size>160000</queue_size>
</remote>

# Restart
sudo systemctl restart wazuh-manager
```

---

## Dashboard Configuration

### Create Custom Widget

1. **Security Events by Source**
   - Navigate to Dashboard
   - Create new visualization
   - Type: Table
   - Index: wazuh-alerts-*
   - Filter: decoder.name = "huawei*"
   - Aggregation: Top 10 source IPs

2. **Attack Timeline**
   - Type: Time Series
   - Filter: rule.level >= 7
   - Aggregation: Count over time

3. **Threat Level Distribution**
   - Type: Pie Chart
   - Aggregation: rule.level (critical=7+, high=5-6, etc.)

---

## Monitoring & Alerting

### Set Up Email Alerts

```bash
# Edit /var/ossec/etc/ossec.conf

<global>
  <email_notification>yes</email_notification>
  <smtp_server>smtp.company.com</smtp_server>
  <email_from>wazuh@company.com</email_from>
</global>

# Add alert rule
<alert>
  <email_notification>yes</email_notification>
  <group>attack</group>
  <level>8</level>
  <frequency>60</frequency>
</alert>
```

### Create Wazuh Agent Alert

Configure in `/var/ossec/etc/ossec.conf`:

```xml
<group name="alert,email">
  <rule id="100500" level="9">
    <if_matched_rule>100130</if_matched_rule>
    <description>CRITICAL: Advanced threat detected</description>
    <action>email</action>
  </rule>
</group>
```

---

## Performance Tuning

### Optimize for High-Volume Logs

```bash
# Edit /var/ossec/etc/ossec.conf

<remote>
  <connection>syslog</connection>
  <port>514</port>
  <protocol>udp</protocol>
  <buffer_size>1000</buffer_size>
  <max_clients>10000</max_clients>
  <queue_size>200000</queue_size>
</remote>

<logcollector>
  <max_lines>10000</max_lines>
  <log_alert_level>3</log_alert_level>
</logcollector>
```

### Monitor Performance

```bash
# Check active connections
sudo netstat -an | grep 514 | wc -l

# Check queue depth
sudo tail -f /var/ossec/logs/ossec.log | grep queue

# Check disk I/O
iostat -x 1
```

---

## Next Steps

1. ✅ Deploy decoders and rules
2. ✅ Validate with test logs
3. ✅ Configure Huawei firewall to send logs
4. ✅ Verify alerts on dashboard
5. ⏳ Fine-tune rules based on environment
6. ⏳ Create custom dashboards and reports
7. ⏳ Set up automated responses
8. ⏳ Plan for log retention and archival

---

## Support & Reference

- Wazuh Official Docs: https://documentation.wazuh.com
- Huawei USG Docs: https://www.huawei.com/en/products/enterprise-networking
- GitHub Issues: /opt/code/wazuh_ova/issues

---

**Created:** 2024-05-13  
**Last Updated:** 2024-05-13  
**Maintained By:** Security Operations Team
