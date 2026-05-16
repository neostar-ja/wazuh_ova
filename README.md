# Wazuh OVA — คู่มือการใช้งานและ Remote Deployment

**เวอร์ชัน:** 2.0  
**วันที่อัปเดต:** 15 พฤษภาคม 2026  
**ระบบเป้าหมาย:** Wazuh SIEM Cluster (OVA บน Amazon Linux 2)

---

## ภาพรวมโปรเจค

โปรเจคนี้เป็นชุดของ Rules, Decoders, Scripts และ Deployment Tools สำหรับ **Wazuh SIEM** ที่ติดตั้งผ่านไฟล์ OVA โดยมีวัตถุประสงค์หลักคือ:

1. **Remote Deployment** — อัปโหลดและติดตั้ง Rules/Decoders ไปยัง Wazuh Manager ผ่าน SSH/SCP
2. **Network Device Integration** — รองรับ Huawei Firewall, Huawei AgileController, MikroTik RouterOS, Infoblox DDI
3. **Network Anomaly Detection** — ตรวจจับ traffic ผิดปกติ (Internal↔External ผ่าน port อันตราย)
4. **Telegram Alerting** — ส่งการแจ้งเตือนแบบ Real-time ผ่าน Telegram
5. **Elasticsearch Template Management** — บริหารจัดการ Index Template ของ OpenSearch

---

## สถาปัตยกรรม Cluster (4 Nodes)

```
อุปกรณ์เครือข่าย (Huawei / MikroTik / Infoblox)
        │
        │  Syslog UDP:514
        ▼
┌─────────────────────────────────┐
│  Worker: 10.251.151.12          │
│  - รับ Syslog (UDP port 514)    │
│  - วิเคราะห์ Log เบื้องต้น     │
│  - ส่งข้อมูลให้ Master          │
└──────────────┬──────────────────┘
               │ Cluster Sync (TCP port 1516)
               ▼
┌─────────────────────────────────┐
│  Master: 10.251.151.11          │
│  - ควบคุม Cluster (Coordinator) │
│  - จัดการ Rules & Decoders      │
│  - รับข้อมูลจาก Agents          │
│  - ซิงค์ไฟล์ตั้งค่าไป Worker   │
└──────┬─────────────┬────────────┘
       │             │
       ▼             ▼
┌──────────────┐  ┌─────────────────┐
│  Indexer:    │  │  Dashboard:     │
│10.251.151.13 │  │ 10.251.151.14   │
│  OpenSearch  │  │  HTTPS :443     │
│  (เก็บข้อมูล)│  │  Web UI         │
└──────────────┘  └─────────────────┘
```

| Node | IP | Port | บทบาท |
|------|----|------|--------|
| Master | `10.251.151.11` | `1516` (Cluster), `1514` (Agent) | ควบคุม Cluster, จัดการ Rules/Decoders |
| Worker | `10.251.151.12` | `514` (Syslog UDP), `1514` (Agent) | รับ Syslog จากอุปกรณ์เครือข่าย |
| Indexer | `10.251.151.13` | `9200` (REST API) | เก็บข้อมูล (OpenSearch) |
| Dashboard | `10.251.151.14` | `443` (HTTPS) | Web UI |

### ข้อมูลการเข้าถึง

| ช่องทาง | Username | Password |
|---------|----------|----------|
| SSH (OS Level) | `wazuh-user` | `wazuh` |
| Wazuh Dashboard (Web) | `admin` | `admin` |
| OpenSearch API | `admin` | `admin` |

> **หมายเหตุ:** ต้องใช้ `sudo su` หรือ `sudo [command]` สำหรับคำสั่งระดับ Root

---

## โครงสร้างไฟล์โปรเจค

```
wazuh_ova/
│
├── decoders/                          # Custom Decoders (ติดตั้งบน Master)
│   ├── 1001-huawei_decoders.xml       # Huawei USG Firewall (POLICY/SECURITY logs)
│   ├── 1002-huawei-ac-decoders.xml    # Huawei AgileController (RADIUS/PORTAL logs)
│   ├── 1001-mikrotik_decoders.xml     # MikroTik RouterOS (login, VPN, firewall)
│   └── 1003-infoblox-decoders.xml     # Infoblox DDI (DHCP logs)
│
├── rules/                             # Custom Rules (ติดตั้งบน Master)
│   ├── 1001-huawei_rules.xml          # Huawei USG (Rule IDs: 100050–100053)
│   ├── 1002-huawei-ac-rules.xml       # Huawei AC (Rule IDs: 100070–100082)
│   ├── 1001-mikrotik_rules.xml        # MikroTik (Rule IDs: 101001–101054)
│   ├── 1003-network-anomaly-rules.xml # Network Anomaly (Rule IDs: 100101–100121)
│   └── 1004-infoblox-rules.xml        # Infoblox DDI (Rule IDs: 100401, 100410–100415)
│
├── lists/                             # CDB Whitelist Lists
│   ├── network-whitelist-sources      # IP ต้นทางที่ไม่ต้อง alert (เช่น 10.251.74.211)
│   └── network-whitelist-destinations # IP ปลายทางที่ไม่ต้อง alert (เช่น GitHub)
│
├── scripts/                           # เครื่องมือวิเคราะห์และทดสอบ
│   ├── huawei_firewall_analyzer.py    # วิเคราะห์ log และสร้างรายงาน
│   ├── wazuh_deployment_test.py       # ทดสอบ deployment
│   └── fix_ruleid_mapping.sh          # แก้ไข Rule ID mapping
│
├── visualizations/                    # Wazuh Dashboard (ndjson import)
│   ├── huawei_usg_dashboard.ndjson    # Dashboard สำหรับ Huawei USG
│   ├── huawei_ac_dashboard.ndjson     # Dashboard สำหรับ Huawei AC
│   ├── mikrotik_routeros_dashboard.ndjson # Dashboard สำหรับ MikroTik
│   └── infoblox_ddi_dashboard.ndjson  # Dashboard สำหรับ Infoblox
│
├── samples/                           # Log ตัวอย่างสำหรับทดสอบ
│   ├── huawei_firewall_sample_logs.txt
│   ├── huawei_policypermit_real_20260513.txt
│   └── mikrotik_firewall_sample_20260513.log
│
├── remote_execution/                  # เครื่องมือ Discovery (อ่านข้อมูลเท่านั้น)
│   ├── discovery.py                   # สำรวจโครงสร้างไฟล์ใน wazuh_ova
│   └── discovery_nodes.py             # แสดงรายการไฟล์ทั้งหมด
│
├── docs/                              # เอกสารเพิ่มเติม
│   ├── HUAWEI_DEPLOYMENT_GUIDE.md     # คู่มือ Huawei (ภาษาอังกฤษ)
│   └── HUAWEI_DEPLOYMENT_GUIDE_THAI.md # คู่มือ Huawei (ภาษาไทย)
│
├── network_anomaly_detector.py        # ตรวจจับ flow ผิดปกติ (Active Response)
├── telegram_network_alert.py          # ส่ง alert ผ่าน Telegram
├── generate_network_anomaly_tests.py  # สร้าง test log สำหรับทดสอบ
├── install_on_remote_wazuh.sh         # ติดตั้งผ่าน SSH (ใช้ SSH key)
├── deploy_automated.sh                # ติดตั้งผ่าน SSH (ใช้ sshpass)
├── deploy_wazuh_ultimate_composable.sh # ตั้งค่า Elasticsearch Index Template
├── setup_geoip_remote.sh              # ติดตั้ง GeoIP บน Wazuh
└── README.md                          # เอกสารหลัก (ไฟล์นี้)
```

---

## Integration ที่รองรับ

### 1. Huawei USG Firewall

**Decoder:** [decoders/1001-huawei_decoders.xml](decoders/1001-huawei_decoders.xml)  
**Rules:** [rules/1001-huawei_rules.xml](rules/1001-huawei_rules.xml)

รองรับ Log รูปแบบ:
```
May 13 2026 07:04:08 WUH-B-DC-USG6712E-1 %%01POLICY/6/POLICYPERMIT(l): ...
```

| Rule ID | Level | เหตุการณ์ |
|---------|-------|-----------|
| 100050 | 3 | Base: Huawei USG Event (ทุกประเภท) |
| 100051 | 5 | Traffic ถูก DENY โดย Policy |
| 100052 | 3 | Traffic ถูก PERMIT โดย Policy |
| 100053 | 4 | พบ QUIC Protocol |

**ตั้งค่าบน Huawei USG:**
```
System → Log → Syslog
  Server IP:   10.251.151.12  (Worker Node)
  Port:        514
  Protocol:    UDP
```

---

### 2. Huawei AgileController (Wireless AC/NAC)

**Decoder:** [decoders/1002-huawei-ac-decoders.xml](decoders/1002-huawei-ac-decoders.xml)  
**Rules:** [rules/1002-huawei-ac-rules.xml](rules/1002-huawei-ac-rules.xml)

รองรับ Log จาก IP: `10.251.5.15` ประเภท:
- `%%01RADIUSLOG/6/AUTHENTICATION` — ตรวจสอบ 802.1X/MAC Auth
- `%%01RADIUSLOG/6/LOGONOROFF` — ผู้ใช้เชื่อมต่อ/ตัดการเชื่อมต่อ
- `%%01PORTALLOG/6/LOGONOROFF` — Portal Web Auth

| Rule ID | Level | เหตุการณ์ |
|---------|-------|-----------|
| 100070 | 3 | Base: ทุก Huawei AC Event |
| 100071 | 5 | Authentication ล้มเหลว |
| 100072 | 4 | MAC ไม่รู้จัก (Error 153) |
| 100073 | 7 | รหัสผ่านผิด (Error 116/117) |
| 100074 | 10 | Brute Force: ล้มเหลว 5 ครั้งใน 120 วินาที |
| 100075 | 3 | Authentication สำเร็จ |
| 100076 | 3 | User เชื่อมต่อ (Online) |
| 100077 | 3 | User ตัดการเชื่อมต่อ (Offline) |
| 100078 | 3 | User Roaming (เปลี่ยน IP) |
| 100080 | 3 | Portal Logon สำเร็จ |
| 100081 | 5 | Portal Logon ล้มเหลว |
| 100082 | 3 | Portal Logoff |

---

### 3. MikroTik RouterOS

**Decoder:** [decoders/1001-mikrotik_decoders.xml](decoders/1001-mikrotik_decoders.xml)  
**Rules:** [rules/1001-mikrotik_rules.xml](rules/1001-mikrotik_rules.xml)

รองรับ Log จาก RouterOS ประเภท: Login, WireGuard VPN, OpenVPN, Firewall, Config Change

| Rule ID | Level | เหตุการณ์ |
|---------|-------|-----------|
| 101001 | 10 | Config เปลี่ยนแปลง (ทั่วไป) |
| 101002 | 10 | User Login สำเร็จ |
| 101003 | 11 | Login ล้มเหลว |
| 101004 | 10 | WireGuard VPN Login |
| 101005 | 10 | OpenVPN Login |
| 101006 | 12 | Filter Rule เปลี่ยนแปลง |
| 101007 | 12 | Raw Rule เปลี่ยนแปลง |
| 101008 | 12 | User Account เปลี่ยนแปลง |
| 101050 | 3 | Firewall Log (มี NAT) |
| 101051 | 3 | Firewall Log (ไม่มี NAT) |
| 101052 | 4 | UDP Flow ผ่าน NAT |
| 101053 | 4 | TCP Flow ผ่าน NAT |
| 101054 | 5 | New Connection เริ่มต้น |

**ตั้งค่าบน MikroTik RouterOS:**
```routeros
/system logging action add name=wazuh target=remote remote=10.251.151.12
/system logging add action=wazuh topics=system,info
```

---

### 4. Infoblox DDI (DNS/DHCP)

**Decoder:** [decoders/1003-infoblox-decoders.xml](decoders/1003-infoblox-decoders.xml)  
**Rules:** [rules/1004-infoblox-rules.xml](rules/1004-infoblox-rules.xml)

| Rule ID | Level | เหตุการณ์ |
|---------|-------|-----------|
| 100401 | 3 | DNS Query (ต่อจาก built-in rule 12100) |
| 100410 | 0 | Base: DHCP Event |
| 100411 | 3 | DHCP Lease Acknowledged (ACK) |
| 100412 | 3 | DHCP Lease Offer |
| 100413 | 3 | DHCP Discover |
| 100414 | 3 | DHCP Lease Request |
| 100415 | 3 | DHCP Lease Released |

> **หมายเหตุ:** DNS Decoder ต้องแก้ไขไฟล์ Built-in ที่ `/var/ossec/ruleset/decoders/0155-named_decoders.xml` บน Master โดยตรง

---

### 5. Network Anomaly Detection

**Rules:** [rules/1003-network-anomaly-rules.xml](rules/1003-network-anomaly-rules.xml)  
**Detector Script:** [network_anomaly_detector.py](network_anomaly_detector.py)  
**Telegram Alert:** [telegram_network_alert.py](telegram_network_alert.py)

ตรวจจับ Traffic ผิดปกติจาก Log ของ Huawei USG โดยแยกเป็น 2 ประเภท:

**Inbound (ภายนอก → ภายใน) — PERMIT เท่านั้น:**

| Rule ID | Level | เหตุการณ์ |
|---------|-------|-----------|
| 100101 | 8 | Inbound SSH (port 22) ถูก PERMIT — อันตราย |
| 100102 | 8 | Inbound RDP (port 3389) ถูก PERMIT — อันตราย |
| 100103 | 8 | Inbound Telnet (port 23) ถูก PERMIT — อันตราย |
| 100104 | 8 | Inbound VNC (port 5900) ถูก PERMIT — อันตราย |

**Outbound (ภายใน → ภายนอก) — PERMIT เท่านั้น:**

| Rule ID | Level | เหตุการณ์ |
|---------|-------|-----------|
| 100105 | 7 | Outbound SSH (port 22) ถูก PERMIT — ต้องตรวจสอบ |
| 100106 | 7 | Outbound RDP (port 3389) ถูก PERMIT — ต้องตรวจสอบ |
| 100107 | 7 | Outbound Telnet (port 23) ถูก PERMIT — ไม่ปลอดภัย |
| 100108 | 7 | Outbound VNC (port 5900) ถูก PERMIT — ต้องตรวจสอบ |

**Whitelist (ลด Alert เมื่อเป็น IP ที่รู้จัก):**

| Rule ID | Level | เหตุการณ์ |
|---------|-------|-----------|
| 100120 | 3 | Outbound จาก IP ต้นทางที่ Whitelist แล้ว |
| 100121 | 3 | Outbound ไปยัง IP ปลายทางที่ Whitelist แล้ว |

**Port ที่ตรวจจับ:**

| Port | Protocol | ความเสี่ยง |
|------|----------|------------|
| 22 | SSH | สูง |
| 23 | Telnet | วิกฤต (ไม่เข้ารหัส) |
| 3389 | RDP | สูง |
| 5900 | VNC | สูง |
| 25 | SMTP | กลาง |
| 135 | Windows RPC | สูง |
| 139 | NetBIOS | สูง |
| 445 | SMB | สูง |
| 161 | SNMP | กลาง |
| 3306 | MySQL | กลาง |
| 5432 | PostgreSQL | กลาง |

---

## ขั้นตอน Remote Deployment

### ข้อกำหนดเบื้องต้น

- SSH access ไปยัง Master Node (`10.251.151.11`) หรือ Worker Node
- Python 3 และ package `requests` (สำหรับ Telegram alerts)
- `sshpass` (กรณีใช้ password-based SSH)

### วิธีที่ 1: ใช้ SSH Key (แนะนำ)

สคริปต์ [install_on_remote_wazuh.sh](install_on_remote_wazuh.sh) ใช้สำหรับติดตั้ง Network Anomaly Detection:

```bash
# แก้ไขค่าตัวแปรก่อนรัน
WAZUH_SERVER="10.251.151.11"   # Master Node (ไม่ใช่ Indexer!)
WAZUH_USER="wazuh-user"        # หรือ root หากมีสิทธิ์
WAZUH_HOME="/var/ossec"

# รันสคริปต์
chmod +x /opt/code/wazuh_ova/install_on_remote_wazuh.sh
./install_on_remote_wazuh.sh
```

> **คำเตือน:** สคริปต์ปัจจุบันตั้งค่าปลายทางเป็น `10.251.151.13` (Indexer) ซึ่งไม่ถูกต้อง  
> Rules และ Decoders ต้องติดตั้งบน **Master Node** (`10.251.151.11`) เท่านั้น

### วิธีที่ 2: ใช้ sshpass (Password-based)

สคริปต์ [deploy_automated.sh](deploy_automated.sh):

```bash
# แก้ไขค่าก่อนรัน
MANAGER_HOST="10.251.151.11"   # Master Node
MANAGER_USER="wazuh-user"
MANAGER_PASS="wazuh"

chmod +x /opt/code/wazuh_ova/deploy_automated.sh
./deploy_automated.sh
```

### วิธีที่ 3: ติดตั้งด้วยตนเอง (Manual)

**ขั้นตอนที่ 1: เชื่อมต่อ Master Node**
```bash
ssh wazuh-user@10.251.151.11
# หลังจากเข้าแล้ว
sudo su
```

**ขั้นตอนที่ 2: อัปโหลด Decoders**
```bash
# จากเครื่อง Local ไปยัง Master
scp /opt/code/wazuh_ova/decoders/1001-huawei_decoders.xml \
    wazuh-user@10.251.151.11:/tmp/
scp /opt/code/wazuh_ova/decoders/1002-huawei-ac-decoders.xml \
    wazuh-user@10.251.151.11:/tmp/
scp /opt/code/wazuh_ova/decoders/1001-mikrotik_decoders.xml \
    wazuh-user@10.251.151.11:/tmp/

# บน Master: ย้ายไปยังตำแหน่งที่ถูกต้อง
sudo cp /tmp/*_decoders.xml /var/ossec/etc/decoders/
sudo chown root:ossec /var/ossec/etc/decoders/*_decoders.xml
sudo chmod 640 /var/ossec/etc/decoders/*_decoders.xml
```

**ขั้นตอนที่ 3: อัปโหลด Rules**
```bash
# จากเครื่อง Local
scp /opt/code/wazuh_ova/rules/*.xml \
    wazuh-user@10.251.151.11:/tmp/

# บน Master
sudo cp /tmp/*_rules.xml /var/ossec/etc/rules/
sudo chown root:ossec /var/ossec/etc/rules/*_rules.xml
sudo chmod 640 /var/ossec/etc/rules/*_rules.xml
```

**ขั้นตอนที่ 4: อัปโหลด CDB Lists**
```bash
scp /opt/code/wazuh_ova/lists/network-whitelist-sources \
    wazuh-user@10.251.151.11:/tmp/
scp /opt/code/wazuh_ova/lists/network-whitelist-destinations \
    wazuh-user@10.251.151.11:/tmp/

# บน Master
sudo cp /tmp/network-whitelist-* /var/ossec/etc/lists/
sudo chown root:ossec /var/ossec/etc/lists/network-whitelist-*
sudo chmod 640 /var/ossec/etc/lists/network-whitelist-*
```

**ขั้นตอนที่ 5: ทดสอบ XML Syntax ก่อน Restart**
```bash
# บน Master
sudo -u ossec /var/ossec/bin/wazuh-logtest
# พิมพ์ log ตัวอย่างและตรวจสอบว่า decoder ทำงาน
```

**ขั้นตอนที่ 6: Restart Wazuh Manager**
```bash
# บน Master (จะซิงค์ไปยัง Worker อัตโนมัติ)
sudo /var/ossec/bin/wazuh-control restart

# ตรวจสอบสถานะ
sudo /var/ossec/bin/wazuh-control status
```

---

## การตั้งค่า Worker Node รับ Syslog

Worker Node (`10.251.151.12`) ต้องเปิดรับ Syslog UDP port 514:

```bash
ssh wazuh-user@10.251.151.12
sudo nano /var/ossec/etc/ossec.conf
```

เพิ่มในส่วน `<ossec_config>`:

```xml
<remote>
  <connection>syslog</connection>
  <port>514</port>
  <protocol>udp</protocol>
  <allowed-ips>any</allowed-ips>
</remote>
```

> สำหรับ Production ควรระบุ IP เฉพาะ แทน `any`:
> ```xml
> <allowed-ips>10.0.0.0/8,192.168.0.0/16</allowed-ips>
> ```

Restart Worker:
```bash
sudo systemctl restart wazuh-manager
sudo systemctl is-active wazuh-manager
```

ตรวจสอบว่า port เปิด:
```bash
sudo netstat -tlunp | grep 514
# ควรเห็น: udp  0  0 0.0.0.0:514  0.0.0.0:*
```

---

## การตั้งค่า Telegram Alerts

แก้ไขไฟล์ [telegram_network_alert.py](telegram_network_alert.py) บรรทัด 16-17:

```python
TELEGRAM_BOT_TOKEN = "YOUR_BOT_TOKEN"   # จาก @BotFather
TELEGRAM_CHAT_ID = "YOUR_CHAT_ID"       # Chat ID ของ Group/Channel
```

> **ความปลอดภัย:** อย่า commit Token จริงลงใน Git  
> ใช้ environment variable แทน:
> ```python
> import os
> TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
> TELEGRAM_CHAT_ID = os.environ.get("TELEGRAM_CHAT_ID", "")
> ```

วิธีหา Chat ID:
1. สร้าง Bot ผ่าน [@BotFather](https://t.me/BotFather)
2. เพิ่ม Bot เข้า Group
3. ส่งข้อความใน Group แล้วเรียก API:
   ```
   https://api.telegram.org/bot<TOKEN>/getUpdates
   ```

ทดสอบ Telegram:
```bash
python3 -c "
import requests
TOKEN = 'YOUR_TOKEN'
CHAT_ID = 'YOUR_CHAT_ID'
r = requests.post(f'https://api.telegram.org/bot{TOKEN}/sendMessage',
                  json={'chat_id': CHAT_ID, 'text': 'Wazuh Test Alert'})
print(r.status_code, r.json())
"
```

---

## Elasticsearch / OpenSearch Index Template

สคริปต์ [deploy_wazuh_ultimate_composable.sh](deploy_wazuh_ultimate_composable.sh) ใช้จัดการ Index Template ของ OpenSearch บน Indexer Node:

```bash
# เชื่อมต่อ Indexer (10.251.151.13:9200)
chmod +x /opt/code/wazuh_ova/deploy_wazuh_ultimate_composable.sh
./deploy_wazuh_ultimate_composable.sh
```

สคริปต์นี้:
1. ลบ Template ที่ทับกัน (Rogue Templates)
2. สร้าง GeoIP Component Template
3. สร้าง Master Composable Template (Priority 500)
4. ตรวจสอบผลลัพธ์

---

## การทดสอบระบบ

### ทดสอบ Decoder ด้วย wazuh-logtest

```bash
# บน Master Node
sudo -u ossec /var/ossec/bin/wazuh-logtest

# ป้อน log ตัวอย่าง Huawei USG:
May 13 2026 07:04:08 WUH-B-DC-USG6712E-1 %%01POLICY/6/POLICYPERMIT(l): protocol=TCP, source-ip=10.251.1.100, source-port=12345, destination-ip=8.8.8.8, destination-port=443, time=May 13 2026 07:04:08, source-zone=trust, destination-zone=untrust, application-name=ssl, rule-name=allow-internet.
```

คาดหวังว่าจะเห็น: `decoder: 'huawei-usg-custom'` และ rule ที่ match

### ทดสอบ Network Anomaly Detection

```bash
# สร้าง test logs
python3 /opt/code/wazuh_ova/generate_network_anomaly_tests.py

# ดู alerts บน Manager
ssh wazuh-user@10.251.151.11 "sudo tail -50 /var/ossec/logs/alerts/alerts.log | grep network_anomaly"
```

### ตรวจสอบ Cluster Sync

```bash
# บน Master
sudo /var/ossec/bin/cluster_control -i

# ตรวจสอบว่า Worker ซิงค์ Rules แล้ว
ssh wazuh-user@10.251.151.12 "ls /var/ossec/etc/rules/*.xml"
```

### ตรวจสอบ Syslog ด้วย tcpdump

```bash
# บน Worker: ดู Syslog ที่เข้ามา
ssh wazuh-user@10.251.151.12 "sudo tcpdump -i any -n 'udp port 514' -c 10"
```

---

## การแก้ปัญหา (Troubleshooting)

### กรณี 1: Agent ไม่แสดงข้อมูล Syscollector

**อาการ:** Agent Active แต่ไม่มีข้อมูล Hardware/OS ในหน้า Inventory

**สาเหตุ:** Cluster มีปัญหาชั่วคราว ทำให้ Worker drop ไฟล์ตอน Agent ส่งมา Agent รอ 1 ชั่วโมงก่อนส่งใหม่

**แก้ไข:** Restart Wazuh Agent บนเครื่องนั้นเพื่อ trigger Scan on Start:
```bash
# Linux Agent
sudo systemctl restart wazuh-agent

# Windows Agent
Restart-Service -Name WazuhSvc
```

---

### กรณี 2: Huawei Log เข้า Worker แต่ไม่แสดงบน Dashboard

**ตรวจสอบ 3 ชั้น:**

**ชั้น 1: Decoder ถูกต้องหรือไม่?**
```bash
# บน Master ทดสอบด้วย logtest
sudo -u ossec /var/ossec/bin/wazuh-logtest
```
ถ้า output แสดง `No decoder matched` → อัปโหลด Decoder ใหม่

**ชั้น 2: XML Syntax Error?**
```bash
# บน Master ตรวจสอบ error log
sudo grep -i "error\|syntax" /var/ossec/logs/ossec.log | tail -20
```
ถ้ามี XML Error → แก้ไขไฟล์แล้ว Restart Master

**ชั้น 3: Worker รับ Syslog หรือไม่?**
```bash
# บน Worker
sudo netstat -tlunp | grep 514
sudo tcpdump -i any -n 'udp port 514' -c 5
```
ถ้า port ไม่เปิด → ดูหัวข้อ "การตั้งค่า Worker Node รับ Syslog"

---

### กรณี 3: Cluster ไม่ Sync หลังแก้ไข Rules

```bash
# บน Master: Force Restart เพื่อ sync
sudo /var/ossec/bin/wazuh-control restart

# รอ 30 วินาที แล้วตรวจสอบ Worker
ssh wazuh-user@10.251.151.12 "sudo /var/ossec/bin/wazuh-control status"
```

---

### กรณี 4: Alerts ไม่เข้า Indexer

```bash
# ตรวจสอบการเชื่อมต่อ Indexer
curl -k -u admin:admin https://10.251.151.13:9200/_cat/health?v

# ดู alerts ที่เพิ่งสร้าง
curl -k -u admin:admin "https://10.251.151.13:9200/wazuh-alerts-*/_search?size=5&sort=timestamp:desc"
```

---

## คำสั่งที่ใช้บ่อย

```bash
# สถานะ Wazuh ทั้ง Cluster
sudo /var/ossec/bin/cluster_control -i

# ดู alerts ล่าสุด (บน Master)
sudo tail -50 /var/ossec/logs/alerts/alerts.log

# นับ alerts วันนี้
sudo grep "$(date +%Y/%m/%d)" /var/ossec/logs/alerts/alerts.log | wc -l

# ทดสอบ Decoder ด้วย log file
cat /opt/code/wazuh_ova/samples/huawei_firewall_sample_logs.txt | \
  sudo -u ossec /var/ossec/bin/wazuh-logtest

# ตรวจสอบ Rules ที่ loaded
sudo grep -r "rule id=" /var/ossec/etc/rules/ | wc -l

# Backup Rules ก่อนแก้ไข
sudo cp /var/ossec/etc/rules/local_rules.xml \
        /var/ossec/etc/rules/local_rules.xml.bak.$(date +%Y%m%d)
```

---

## Wazuh Dashboard

เข้าถึงได้ที่: `https://10.251.151.14`

**ดู Alerts ตามประเภท:**
- Huawei USG: `decoder.name: "huawei-usg-custom"`
- Huawei AC: `decoder.name: "huawei-ac*"`
- MikroTik: `decoder.name: "mikrotik*"`
- Network Anomaly: `rule.groups: "network_anomaly"`

**Import Dashboard:**
```
Stack Management → Saved Objects → Import
เลือกไฟล์ใน: /opt/code/wazuh_ova/visualizations/*.ndjson
```

---

## ข้อควรระวัง

| ประเด็น | รายละเอียด |
|---------|-----------|
| **Target Node** | Rules/Decoders ต้องติดตั้งบน **Master (10.251.151.11)** ไม่ใช่ Indexer |
| **Telegram Token** | อย่า commit Token จริงลง Git ใช้ environment variable แทน |
| **Whitelist** | ตรวจสอบ `lists/network-whitelist-*` ให้ตรงกับ IP จริงในองค์กร |
| **sshpass** | ไม่แนะนำใน Production — ใช้ SSH Key แทน |
| **XML Syntax** | ทดสอบด้วย `wazuh-logtest` ทุกครั้งก่อน Restart Wazuh |
| **Cluster Restart** | Restart Master ก่อนเสมอ Worker จะซิงค์ Config อัตโนมัติ |

---

## Rule ID Reference สรุป

| ช่วง ID | Integration | จำนวน |
|---------|-------------|--------|
| 100050–100053 | Huawei USG Firewall | 4 rules |
| 100070–100082 | Huawei AgileController (AC) | 10 rules |
| 100101–100121 | Network Anomaly Detection | 8 rules (active), 2 whitelist |
| 100401, 100410–100415 | Infoblox DDI | 7 rules |
| 101001–101054 | MikroTik RouterOS | 11 rules |

---

## ไฟล์เอกสารเพิ่มเติม

| ไฟล์ | เนื้อหา |
|------|---------|
| [wazuh_ova.md](wazuh_ova.md) | คู่มือเดิม (Cluster Architecture + Case Studies) |
| [docs/HUAWEI_DEPLOYMENT_GUIDE_THAI.md](docs/HUAWEI_DEPLOYMENT_GUIDE_THAI.md) | คู่มือ Huawei Integration (ภาษาไทย) |
| [NETWORK_ANOMALY_SETUP_GUIDE.md](NETWORK_ANOMALY_SETUP_GUIDE.md) | คู่มือ Network Anomaly Detection |
| [GEOIP_INTEGRATION_GUIDE.md](GEOIP_INTEGRATION_GUIDE.md) | คู่มือ GeoIP Enrichment |
| [REMOTE_EXECUTION_PLAN.md](REMOTE_EXECUTION_PLAN.md) | แผนการ Remote Operations |

---

**ผู้รับผิดชอบ:** Security/Ops Team  
**วันที่สร้าง:** 13 พฤษภาคม 2026  
**วันที่อัปเดต:** 15 พฤษภาคม 2026
