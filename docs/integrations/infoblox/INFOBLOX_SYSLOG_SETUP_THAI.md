# คู่มือตั้งค่า Infoblox NIOS ส่ง Syslog ไปยัง Wazuh

**วันที่:** 15 พฤษภาคม 2026  
**เวอร์ชัน Infoblox ที่รองรับ:** NIOS 8.x / 9.x  
**ปลายทาง Syslog:** Wazuh Worker `10.251.151.12:514 (UDP)`

---

## ภาพรวม: Infoblox ส่ง Log อะไรบ้าง?

| Log Category | Program Name | Port | Format |
|--------------|-------------|------|--------|
| DNS Queries | `named` | UDP 514 | RFC3164 |
| DNS Threats (RPZ) | `named` | UDP 514 | RFC3164 |
| DHCP Lifecycle | `dhcpd` | UDP 514 | RFC3164 |
| Admin Audit | `infoblox-syslog` | UDP 514 | RFC3164 |
| Grid Events | `infoblox-syslog` | UDP 514 | RFC3164 |

---

## ขั้นตอนที่ 1: ตั้งค่า Syslog Server ใน Infoblox Grid Manager

### วิธีที่ 1: ผ่าน Web UI (แนะนำ)

1. เข้าสู่ Infoblox Grid Manager: `https://INFOBLOX_IP/`
2. ไปที่ **Grid** → **Grid Properties** → **Monitoring** tab
3. ค้นหาส่วน **Syslog** หรือ **External Syslog Server**
4. คลิก **Add** เพื่อเพิ่ม Syslog Server ใหม่:

```
Server Address:  10.251.151.12    ← Wazuh Worker IP
Port:            514
Protocol:        UDP
Certificate:     (ปล่อยว่าง)
```

5. ในส่วน **Syslog Severity** ตั้งค่า:
   - Minimum Severity: **Informational** (จะได้ทุก log)

6. ในส่วน **Log Categories** ให้เปิดใช้งาน:

| Category | เปิด/ปิด | คำอธิบาย |
|----------|---------|----------|
| DNS Queries | ✅ เปิด | Log ทุก DNS query |
| DNS Threats | ✅ เปิด | RPZ blocks, threat events |
| DHCP | ✅ เปิด | DHCP lease lifecycle |
| Audit | ✅ เปิด | Admin actions |
| System | ✅ เปิด | Grid events |

7. คลิก **Save & Close** แล้วคลิก **Restart Services** เมื่อระบบถาม

---

### วิธีที่ 2: ผ่าน CLI (NIOS CLI)

SSH เข้า Infoblox แล้วรันคำสั่ง:

```bash
# เข้า CLI mode
Infoblox > set syslog_server_enabled true
Infoblox > set syslog_server_address 10.251.151.12
Infoblox > set syslog_server_port 514
Infoblox > set syslog_server_protocol UDP
Infoblox > set syslog_server_loglevel DEBUG
Infoblox > save
```

---

## ขั้นตอนที่ 2: ตั้งค่า DNS Query Logging

DNS Query Logging ต้องเปิดใน Named/BIND ก่อน:

1. ไปที่ **Data Management** → **DNS** → **Grid DNS Properties**
2. เลือก tab **Logging**
3. เปิดใช้งาน **Logging to Syslog**:

```
☑ Log DNS Queries
☑ Log DNS Responses
☑ Log DNS Threats (RPZ)
  Log Level: INFO
```

4. บน DNS Member แต่ละตัว ไปที่:
   **Members** → เลือก member → **Properties** → **DNS** → **Logging**
   ตรวจสอบว่าเปิด DNS query logging

---

## ขั้นตอนที่ 3: ตั้งค่า RPZ (Response Policy Zone) Logging

1. ไปที่ **Data Management** → **DNS** → **Response Policy Zones**
2. ตรวจสอบว่ามี RPZ policy อยู่แล้ว
3. ในแต่ละ RPZ zone → **Properties** → เปิด **Log all RPZ actions**

RPZ Categories ที่แนะนำให้สร้าง:
- `rpz.malware-domains` — domains ที่เกี่ยวข้องกับ malware
- `rpz.phishing` — phishing domains
- `rpz.c2-servers` — Command & Control servers
- `rpz.ip-blacklist` — IP reputation based blocking

---

## ขั้นตอนที่ 4: ตั้งค่า DHCP Logging

1. ไปที่ **Data Management** → **DHCP** → **Grid DHCP Properties**
2. เลือก tab **Logging** หรือ **Monitoring**
3. เปิด **Log DHCP to Syslog**:

```
☑ Log DHCPDISCOVER
☑ Log DHCPOFFER
☑ Log DHCPREQUEST
☑ Log DHCPACK
☑ Log DHCPRELEASE
☑ Log DHCPNAK
☑ Log DHCPDECLINE
```

---

## ขั้นตอนที่ 5: ยืนยันการส่ง Syslog

### บน Infoblox

```bash
# ตรวจสอบ syslog ที่ส่งออก
Infoblox > show syslog_server
```

### บน Wazuh Worker (10.251.151.12)

```bash
# ตรวจสอบว่าได้รับ syslog จาก Infoblox
ssh wazuh-user@10.251.151.12
sudo tcpdump -i any -n 'udp port 514 and src host INFOBLOX_IP' -c 10

# ดู log สด
sudo tail -f /var/ossec/logs/ossec.log | grep -i 'infoblox\|dhcpd\|named'
```

### บน Wazuh Master (10.251.151.11)

```bash
# ดู alerts ที่เข้ามา
ssh wazuh-user@10.251.151.11
sudo tail -f /var/ossec/logs/alerts/alerts.log | grep -E 'infoblox|DHCP|rpz|AXFR'

# นับ alerts วันนี้
sudo grep "$(date +%Y/%m/%d)" /var/ossec/logs/alerts/alerts.log | grep 'infoblox' | wc -l
```

---

## ขั้นตอนที่ 6: ทดสอบด้วย Script

```bash
# ส่ง test logs จาก machine นี้ไปยัง Wazuh Worker
python3 /opt/code/wazuh_ova/scripts/tests/test_infoblox_integration.py

# หรือทดสอบ dry-run (แสดงรายการเท่านั้น)
python3 /opt/code/wazuh_ova/scripts/tests/test_infoblox_integration.py --dry-run
```

---

## Syslog Format ที่ Wazuh รองรับ

### DNS Query (NIOS 8.x)
```
<134>May 15 11:23:09 infoblox-gm named[1234]: queries: info: client @0x7f8a 10.251.1.100#54321 (example.com): query: example.com IN A + (10.251.5.15)
```

### DNS Query (NIOS เก่า)
```
<134>May 15 11:23:09 infoblox-gm named[1234]: client 10.251.1.100#54321: query: example.com IN A
```

### RPZ Threat Block
```
<132>May 15 11:23:09 infoblox-gm named[1234]: client 10.251.1.100#54321: rpz QNAME Policy Rewrite malware.evil.com/A/IN via rpz.malware
```

### DHCPACK
```
<134>May 15 11:23:09 infoblox-gm dhcpd[5678]: DHCPACK on 10.251.100.50 to aa:bb:cc:dd:ee:ff (PC-NAME) via eth0
```

### DHCPDISCOVER
```
<134>May 15 11:23:09 infoblox-gm dhcpd[5678]: DHCPDISCOVER from aa:bb:cc:dd:ee:ff via eth0
```

---

## Rules ที่ Deploy แล้ว (Rule IDs 100400–100434)

| Rule ID | Level | เหตุการณ์ | Action |
|---------|-------|-----------|--------|
| 100400 | 3 | DNS A Record Query | Archive |
| 100401 | 3 | DNS Other Record Query | Archive |
| 100402 | **10** | AXFR Zone Transfer Denied | **Alert** |
| 100403 | 9 | IXFR Zone Transfer Denied | Alert |
| 100404 | 7 | DNS Dynamic Update Denied | Alert |
| 100405 | 3 | DNS Zone Notification | Archive |
| 100406 | 5 | DNS Query Cache Denied | Alert |
| 100411 | 3 | DHCPACK — Lease Confirmed | Archive |
| 100412 | 2 | DHCPOFFER | Archive |
| 100413 | 3 | DHCPDISCOVER | Archive |
| 100414 | 2 | DHCPREQUEST | Archive |
| 100415 | 3 | DHCPRELEASE | Archive |
| 100416 | 5 | DHCPNAK | Alert |
| 100417 | **8** | DHCPDECLINE (IP Conflict) | **Alert** |
| 100418 | **10** | DHCP Flood | **Alert** |
| 100420 | 0 | NIOS Audit Event | Base |
| 100421 | 3 | Admin Login | Archive |
| 100422 | 5 | Admin Login Failed | Alert |
| 100423 | **10** | Admin Brute Force | **Alert** |
| 100424 | 7 | DNS Record Changed | Alert |
| 100425 | 5 | Grid Event | Alert |
| 100426 | 8 | Threat Category Match | Alert |
| 100430 | **8** | RPZ QNAME Block | **Alert** |
| 100431 | **8** | RPZ IP Block | **Alert** |
| 100432 | **8** | RPZ CNAME Block | **Alert** |
| 100433 | **10** | RPZ Storm (10+ blocks) | **Alert** |
| 100434 | **10** | RPZ IP Storm | **Alert** |

---

## Dashboard — Import ใน Wazuh

1. เข้า Wazuh Dashboard: `https://10.251.151.14`
2. ไปที่ **☰** → **Stack Management** → **Saved Objects**
3. คลิก **Import**
4. เลือกไฟล์: `/opt/code/wazuh_ova/visualizations/infoblox_ddi_dashboard.ndjson`
5. คลิก **Import** และ **Confirm all conflicts**
6. ไปที่ **Dashboard** → ค้นหา **"Infoblox DDI"**

---

## Troubleshooting

### Infoblox ส่ง log แต่ Wazuh ไม่ได้รับ
```bash
# ตรวจสอบ firewall บน Worker
ssh wazuh-user@10.251.151.12
sudo iptables -L INPUT | grep 514
# ถ้าไม่มีกฎ → เพิ่ม:
sudo iptables -A INPUT -p udp --dport 514 -j ACCEPT
```

### Wazuh รับ syslog แต่ไม่สร้าง alert
```bash
# ทดสอบ decoder ด้วย wazuh-logtest บน Master
ssh wazuh-user@10.251.151.11
echo 'May 15 11:23:09 infoblox-gm dhcpd[1234]: DHCPACK on 10.0.0.50 to aa:bb:cc:dd:ee:ff (HOST) via eth0' | sudo /var/ossec/bin/wazuh-logtest
```

### Decoder ใหม่ไม่โหลด
```bash
# Restart Wazuh Manager บน Master
ssh wazuh-user@10.251.151.11
sudo /var/ossec/bin/wazuh-control restart

# ตรวจสอบ error
sudo grep -i 'error\|critical' /var/ossec/logs/ossec.log | tail -20
```

---

**ไฟล์ที่เกี่ยวข้อง:**
- Decoders: [`decoders/1003-infoblox-decoders.xml`](../decoders/1003-infoblox-decoders.xml)
- Rules: [`rules/1004-infoblox-rules.xml`](../rules/1004-infoblox-rules.xml)  
- Dashboard: [`visualizations/infoblox_ddi_dashboard.ndjson`](../../../visualizations/infoblox_ddi_dashboard.ndjson)
- Test Script: [`scripts/tests/test_infoblox_integration.py`](../../../scripts/tests/test_infoblox_integration.py)
