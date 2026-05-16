# Wazuh Cluster — Implementation & Troubleshooting Guide
**เวอร์ชันเอกสาร:** 2.0  
**ระบบเป้าหมาย:** Wazuh SIEM Cluster (OVA บน Amazon Linux 2)  
**อัปเดต:** 15 พฤษภาคม 2026

---

## 1. สภาพแวดล้อมและการเข้าถึง

ระบบติดตั้งผ่านไฟล์ OVA สำเร็จรูป (Amazon Linux 2) ข้อมูลการเข้าถึงพื้นฐาน:

| ช่องทาง | Username | Password | หมายเหตุ |
|---------|----------|----------|----------|
| **SSH (OS Level)** | `wazuh-user` | `wazuh` | ต้องใช้ `sudo su` สำหรับ root |
| **Wazuh Dashboard** | `admin` | `admin` | HTTPS port 443 |
| **OpenSearch API** | `admin` | `admin` | HTTPS port 9200 |

---

## 2. สถาปัตยกรรม Cluster (4 Nodes)

| Role | IP Address | Port | หน้าที่ |
|------|-----------|------|---------|
| **Master** | `10.251.151.11` | `1516` (Cluster), `1514` (Agent) | ควบคุม Cluster, จัดการ Rules/Decoders, ซิงค์ไปยัง Worker |
| **Worker** | `10.251.151.12` | `514` (Syslog UDP), `1514` (Agent) | รับ Syslog จากอุปกรณ์เครือข่าย, วิเคราะห์ Log |
| **Indexer** | `10.251.151.13` | `9200` (REST API) | เก็บข้อมูล (OpenSearch) |
| **Dashboard** | `10.251.151.14` | `443` (HTTPS) | Web UI |

> **สำคัญ:** Rules และ Decoders ต้องติดตั้งบน **Master Node เท่านั้น** (`10.251.151.11`)  
> Cluster จะซิงค์ไฟล์ไปยัง Worker อัตโนมัติผ่าน port 1516

---

## 3. กรณีศึกษาและการแก้ปัญหา

### กรณีที่ 1: Agent ไม่แสดงข้อมูล Syscollector (Hardware/OS Inventory)

**อาการ:** `agent_control -lc` แสดงสถานะ Active แต่ไม่มีข้อมูล Hardware บนเว็บ  
โฟลเดอร์ `/var/ossec/queue/syscollector/db/` บน Worker ไม่มีไฟล์ `.db` ของ Agent

**สาเหตุ:** Cluster มีปัญหาชั่วคราว ทำให้ Worker drop ไฟล์ที่ Agent ส่งมาตอนเปิดเครื่อง  
หลังจากนั้น Agent จะรอ 1 ชั่วโมงก่อนส่งรอบใหม่ตามรอบเวลา

**แก้ไข:** บังคับ Restart Agent เพื่อ trigger Scan on Start ทันที
```bash
# Linux Agent
sudo systemctl restart wazuh-agent

# Windows Agent
Restart-Service -Name WazuhSvc
```

---

### กรณีที่ 2: รับ Syslog จาก MikroTik

**ความต้องการ:** เก็บ Log และตรวจสอบการ Login / WireGuard VPN

**วิธีการ:**
1. **Master Node:** อัปโหลดไฟล์ `decoders/1001-mikrotik_decoders.xml` ไปที่ `/var/ossec/etc/decoders/`  
   และ `rules/1001-mikrotik_rules.xml` ไปที่ `/var/ossec/etc/rules/`
2. **Worker Node:** เปิดรับ Syslog UDP 514 (ดูกรณีที่ 3)
3. **MikroTik RouterOS:** ตั้งค่าส่ง Log ไปยัง Worker IP:
   ```routeros
   /system logging action add name=wazuh target=remote remote=10.251.151.12
   /system logging add action=wazuh topics=system,info
   ```

---

### กรณีที่ 3: Huawei USG Log เข้า Worker แต่ไม่แสดงบน Dashboard

**อาการ:** `tcpdump` บน Worker เห็น Log ของ Huawei เข้ามา แต่ไม่ปรากฏบน Dashboard  
และไฟล์ `alerts.json` ไม่มีการเปลี่ยนแปลง

**การวิเคราะห์สาเหตุ (3 ชั้น):**

1. **ไม่มี Decoder:** Wazuh ไม่มี Decoder สำหรับ Huawei USG ทำให้ขึ้น `No decoder matched`
2. **XML Syntax Error:** ไฟล์ Decoder มี Syntax ผิด ทำให้ `wazuh-analysisd` หยุดทำงาน  
   Cluster หยุดซิงค์ไปยัง Worker
3. **Syslog ถูก Reject:** Worker ไม่ได้เปิดรับ IP ของ Huawei ผ่าน port 514

**ขั้นตอนแก้ไข:**

**ขั้น 1: ตรวจสอบและแก้ไข XML บน Master**
```bash
# ทดสอบ Decoder ด้วย wazuh-logtest
sudo -u ossec /var/ossec/bin/wazuh-logtest

# ตรวจสอบ error log
sudo grep -i "error\|syntax" /var/ossec/logs/ossec.log | tail -20
```

**ขั้น 2: Force Cluster Sync**
```bash
# Restart Master ก่อน (Worker จะซิงค์อัตโนมัติ)
sudo /var/ossec/bin/wazuh-control restart

# รอ 30 วินาที แล้ว Restart Worker
ssh wazuh-user@10.251.151.12 "sudo /var/ossec/bin/wazuh-control restart"
```

**ขั้น 3: เปิด Syslog Port บน Worker**

แก้ไขไฟล์ `/var/ossec/etc/ossec.conf` บน Worker เพิ่ม:
```xml
<remote>
  <connection>syslog</connection>
  <port>514</port>
  <protocol>udp</protocol>
  <allowed-ips>any</allowed-ips>
</remote>
```
แล้ว Restart Worker:
```bash
sudo systemctl restart wazuh-manager
```

---

## 4. ตรรกะการสร้าง Decoder และ Rule

> Decoder และ Rule จริงอยู่ที่ `decoders/` และ `rules/` ในโปรเจคนี้  
> ดูคู่มือหลักได้ที่ [README.md](README.md)

**หลักการเขียน Decoder สำหรับ Syslog อุปกรณ์เครือข่าย:**

```xml
<!-- 1. Parent Decoder: จับรูปแบบส่วนที่ไม่เปลี่ยนแปลงของ Log -->
<decoder name="device-custom">
  <prematch type="pcre2">PATTERN_ที่ไม่เปลี่ยน</prematch>
</decoder>

<!-- 2. Child Decoder: ดึงฟิลด์จาก Log -->
<decoder name="device-custom-fields">
  <parent>device-custom</parent>
  <regex type="pcre2">source-ip=([^,]+), source-port=([0-9]+), destination-ip=([^,]+)</regex>
  <order>srcip, srcport, dstip</order>
</decoder>
```

**Field Names มาตรฐานของ Wazuh:**
- `srcip` — IP ต้นทาง
- `dstip` — IP ปลายทาง  
- `srcport` — Port ต้นทาง
- `dstport` — Port ปลายทาง
- `username` — ชื่อผู้ใช้
- `action` — การกระทำ (permit/deny/login/logout)

**ทดสอบ Decoder ก่อน Deploy:**
```bash
sudo -u ossec /var/ossec/bin/wazuh-logtest
# ป้อน log ตัวอย่างและตรวจสอบ output ว่า decoder ทำงานถูกต้อง
```

**ตัวอย่าง Rule ที่เชื่อมกับ Decoder:**
```xml
<group name="device_name,">
  <!-- Rule Base: รับทุก Event -->
  <rule id="NNNNN" level="3">
    <decoded_as>device-custom</decoded_as>
    <description>Device: General Event</description>
  </rule>

  <!-- Rule ย่อย: DENY Traffic -->
  <rule id="NNNNN1" level="5">
    <if_sid>NNNNN</if_sid>
    <match>DENY|denied</match>
    <description>Device: Traffic denied from $(srcip) to $(dstip):$(dstport)</description>
    <group>firewall_drop,</group>
  </rule>
</group>
```
