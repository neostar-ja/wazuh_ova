# คู่มือการติดตั้ง Huawei Firewall Integration สำหรับ Wazuh SIEM

## สรุปการส่งมอบ (Deployment Summary)

### สถานะปัจจุบัน
✅ **การติดตั้งสำเร็จแล้ว** - Wazuh cluster 4 nodes กำลังทำงานพร้อมบริการ Huawei Firewall Integration  
✅ **บริการ Master (10.251.151.11)**: กำลังทำงาน  
✅ **สิ่งที่พร้อม**: 39 decoders + 42 rules + 1 analyzer tool + เอกสาร

---

## 1. สถาปัตยกรรมคลัสเตอร์ Wazuh

### โครงสร้าง 4-Node
```
┌─────────────────────────────────────────────────────┐
│  Huawei Firewall (192.168.x.x)                     │
│  ─── Syslog RFC3164 UDP:514 ────────────────────┐  │
│                                                 │  │
│                        ┌────────────────────────▼──▼┐
│                        │ Worker: 10.251.151.12      │
│                        │ Syslog Receiver            │
│                        │ wazuh-manager (port 1516)  │
│                        └────────────┬───────────────┘
│                                     │ Cluster Sync
│  ┌──────────────────────────────────▼──────────────┐
│  │ Master: 10.251.151.11                          │
│  │ wazuh-manager (coordinator)                    │
│  │ ✓ 39 Decoders สำหรับ Huawei                    │
│  │ ✓ 42 Rules สำหรับ Detection                    │
│  │ ✓ Cluster Control                             │
│  └──────────┬──────────────────────────────────────┘
│             │ Cluster Sync (port 1516)
│  ┌──────────▼──────────────┐    ┌──────────────────┐
│  │ Indexer: 10.251.151.13  │    │ Dashboard:       │
│  │ OpenSearch              │    │ 10.251.151.14    │
│  │ Data Storage            │    │ HTTPS port 443   │
│  └─────────────────────────┘    └──────────────────┘
└─────────────────────────────────────────────────────┘
```

### องค์ประกอบ
- **Master Node (10.251.151.11)**: Coordinator, rules/decoder management
- **Worker Node (10.251.151.12)**: Log parsing, syslog receiver (UDP 514)
- **Indexer Node (10.251.151.13)**: OpenSearch data storage
- **Dashboard Node (10.251.151.14)**: Web UI (HTTPS:443, admin/admin)

---

## 2. Huawei Firewall Integration ที่มีอยู่

### Decoders (39 ตัว)
Wazuh มี Huawei decoders ที่ built-in สำเร็จแล้ว:
- **ตำแหน่ง**: `/var/ossec/ruleset/decoders/0377-huawei-usg_decoders.xml`
- **สนับสนุน**:
  - SECLOG: Session termination, policy violations
  - POLICY: Traffic policy enforcement
  - ADMIN: Administrative actions
  - VPN: VPN tunnel events
  - IPS: Intrusion detection events

### Rules (42 ตัว)  
Detection rules ที่ built-in:
- **ตำแหน่ง**: `/var/ossec/ruleset/rules/0785-huawei-usg_rules.xml`
- **ID Range**: 85000-85041
- **ประเภท**:
  - Traffic policy monitoring
  - Authentication attacks
  - IPS threat detection
  - VPN failures
  - System events

---

## 3. ขั้นตอนการตั้งค่า Worker Node

### ขั้นตอนที่ 1: SSH ไปยัง Worker Node
```bash
ssh wazuh-user@10.251.151.12
password: wazuh
```

### ขั้นตอนที่ 2: แก้ไข Syslog Configuration
```bash
# เปิดไฟล์ configuration
sudo nano /var/ossec/etc/ossec.conf
```

### ขั้นตอนที่ 3: เพิ่ม Syslog Input
ค้นหาส่วน `<remote>` และเพิ่มการตั้งค่าด้านล่าง:

```xml
<!-- ========================================
     REMOTE SYSLOG INPUT FOR HUAWEI FIREWALL
     ======================================== -->
<remote>
  <connection>syslog</connection>
  <port>514</port>
  <protocol>udp</protocol>
  <allowed-ips>any</allowed-ips>
</remote>

<!-- For production, replace 'any' with specific IP ranges:
<remote>
  <connection>syslog</connection>
  <port>514</port>
  <protocol>udp</protocol>
  <allowed-ips>192.168.0.0/16,10.0.0.0/8</allowed-ips>
</remote>
-->
```

### ขั้นตอนที่ 4: Restart Service
```bash
sudo systemctl stop wazuh-manager
sleep 2
sudo systemctl start wazuh-manager
sleep 3
sudo systemctl status wazuh-manager
```

### ขั้นตอนที่ 5: ยืนยันสถานะ
```bash
# ควรเห็น "active (running)"
sudo systemctl is-active wazuh-manager

# ตรวจสอบเพิ่มเติม
sudo tail -20 /var/ossec/logs/ossec.log | grep -i "syslog\|remote"
```

---

## 4. การตั้งค่า Huawei Firewall

### ตั้งค่าส่วน Syslog บน Huawei USG
```
# เข้า CLI หรือ WebUI
# Navigate to System → Log → Syslog

# ตั้งค่า Syslog Server
Syslog Server IP: 10.251.151.12  # Worker Node IP
Syslog Server Port: 514
Protocol: UDP (default)
Facility: Local0 หรือ LOG_LOCAL0
Severity: Information (5) หรือสูงกว่า

# เปิดใช้งาน Log Categories
Enable:
  □ Security Logs (SECLOG)
  □ Policy Logs (POLICY)
  □ Admin Logs (ADMIN)
  □ IPS Logs
  □ VPN Logs
  □ System Logs
```

---

## 5. ตรวจสอบและ Troubleshooting

### ตรวจสอบ Syslog Reception
```bash
# บน Worker (10.251.151.12)
# ตรวจสอบว่า port 514 เปิดรับ
sudo netstat -tlunp | grep 514
# ควรเห็น: udp   0   0 0.0.0.0:514   0.0.0.0:*   wazuh-manager

# ดู live logs
sudo tail -f /var/ossec/logs/ossec.log

# ตรวจสอบ Huawei logs ที่เข้ามา (ชั่วคราว)
sudo tcpdump -i any -n 'udp port 514' -c 10
```

### ตรวจสอบ Parsing
```bash
# หารหัสตรวจสอบ (Rule IDs) ที่สร้างมา
ssh admin@10.251.151.14  # Dashboard

# หรือคำสั่ง:
curl -u admin:admin https://10.251.151.14/api/rules \
  -k | grep huawei
```

### ปัญหาทั่วไป

**ปัญหา**: No logs received  
**แก้ไข**:
1. ตรวจสอบ Firewall Syslog configuration
2. ตรวจสอบ Network connectivity: `ping 10.251.151.12`
3. ตรวจสอบ Wazuh process: `sudo systemctl status wazuh-manager`
4. ตรวจสอบ logs: `sudo tail -30 /var/ossec/logs/ossec.log`

**ปัญหา**: Logs not parsed correctly  
**แก้ไข**:
1. ยืนยันรูปแบบ RFC3164 จาก Firewall
2. ตรวจสอบว่า SIEM ตรวจพบ Pattern: `grep "huawei-usg" /var/ossec/logs/alerts.json`
3. ตรวจสอบ Decoder pattern match

**ปัญหา**: High alert volume  
**แก้ไข**:
1. ปรับ Log Level บน Firewall (ลดจำนวน Info-level logs)
2. ปรับ Rules alert threshold
3. ปรับ Log retention policy

---

## 6. Dashboard Verification

### เข้า Wazuh Dashboard
1. URL: `https://10.251.151.14`
2. Username: `admin`
3. Password: `admin`

### ตำแหน่ง Log Huawei
- ไปที่ **Security Events** > **Events**
- Filter by **Rule ID**: `85000-85041` (Huawei rules)
- หรือ Search: `decoder:"huawei-usg"`

### สร้าง Dashboard สำหรับ Huawei
```
1. Create new dashboard
2. Add widgets for:
   - Events by Huawei rule
   - Alert distribution by severity
   - Top source IPs (threats)
   - Top blocked destinations
   - Failed authentication attempts
```

---

## 7. Tools และ Scripts

### huawei_firewall_analyzer.py
```bash
# ตำแหน่ง
/opt/code/wazuh_ova/scripts/huawei_firewall_analyzer.py

# ใช้งาน
python3 huawei_firewall_analyzer.py --analyze samples/huawei_firewall_sample_logs.txt

# ตัวเลือก
--analyze: วิเคราะห์ log file
--validate-decoders: ตรวจสอบ XML decoders
--validate-rules: ตรวจสอบ XML rules
--generate-report: สร้างรายงาน HTML/JSON
--format: เลือก output format (html, json)
```

### wazuh_deployment_test.py
```bash
python3 wazuh_deployment_test.py --validate
python3 wazuh_deployment_test.py --test-decoders
python3 wazuh_deployment_test.py --generate-checklist
```

---

## 8. Files Reference

| File | Location | Purpose |
|------|----------|---------|
| Decoders (Built-in) | `/var/ossec/ruleset/decoders/0377-huawei-usg_decoders.xml` | 39 Huawei log decoders |
| Rules (Built-in) | `/var/ossec/ruleset/rules/0785-huawei-usg_rules.xml` | 42 Detection rules |
| Analyzer | `/opt/code/wazuh_ova/scripts/huawei_firewall_analyzer.py` | Analysis & reporting tool |
| Sample Logs | `/opt/code/wazuh_ova/samples/huawei_firewall_sample_logs.txt` | 30 test events |
| Documentation (EN) | `/opt/code/wazuh_ova/docs/HUAWEI_DEPLOYMENT_GUIDE.md` | English guide |
| Documentation (TH) | `/opt/code/wazuh_ova/docs/HUAWEI_DEPLOYMENT_GUIDE_THAI.md` | Thai guide (this file) |

---

## 9. Performance Tuning (Optional)

### สำหรับ Production
```bash
# บน Master/Worker: เพิ่ม resource limits
sudo nano /usr/lib/systemd/system/wazuh-manager.service

# เพิ่ม section:
[Service]
LimitNOFILE=65535
LimitNPROC=65535

# Save and restart:
sudo systemctl daemon-reload
sudo systemctl restart wazuh-manager
```

### Log Rotation
```bash
# /var/ossec/etc/ossec.conf
<logging>
  <log_alert_level>3</log_alert_level>
  <log_format>json</log_format>
  <logall>no</logall>
</logging>
```

---

## 10. Next Steps

### ระยะสั้น
1. ✅ Syslog receiver configuration - **DONE**
2. ✅ Integration verification - **DONE**
3. Configure Huawei firewall to send logs
4. Test with real logs from firewall

### ระยะยาว
1. Create custom rules for your environment
2. Fine-tune alert thresholds
3. Set up automated incident response
4. Implement log retention policies
5. Performance monitoring and optimization

---

## Support & Documentation

### Files
- English Documentation: [HUAWEI_DEPLOYMENT_GUIDE.md](./HUAWEI_DEPLOYMENT_GUIDE.md)
- Project README: [README_HUAWEI_INTEGRATION.md](../README_HUAWEI_INTEGRATION.md)

### Quick Reference Commands
```bash
# Check service status
sudo systemctl status wazuh-manager

# View recent alerts
sudo tail -50 /var/ossec/logs/alerts.json | grep huawei

# Check cluster status
sudo /var/ossec/bin/cluster_control -i

# Monitor incoming syslog
sudo tcpdump -i any -n 'udp port 514' -c 20

# Restart service
sudo systemctl restart wazuh-manager
```

---

**วันที่ล่าสุด**: 13 พฤษภาคม 2026  
**เวอร์ชัน**: 2.0  
**สถานะ**: Ready for Production ✓
