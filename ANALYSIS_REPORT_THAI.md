# 📋 ผลการวิเคราะห์ระบบ Network Anomaly Detection

## 🔴 ปัญหาที่พบ - ทำไมไม่ได้รับ Telegram Alerts

### ปัญหาที่ 1: Telegram Credentials ยังเป็น Placeholder
**ไฟล์:** `/opt/code/wazuh_ova/telegram_network_alert.py`
**บรรทัด:** 18-19

```python
TELEGRAM_BOT_TOKEN = "YOUR_BOT_TOKEN"  # ❌ ยังไม่ได้แทนที่
TELEGRAM_CHAT_ID = "YOUR_CHAT_ID"      # ❌ ยังไม่ได้แทนที่
```

**ผลกระทบ:**
- แม้ว่า rules จะสร้าง alerts ได้
- Telegram script จะไม่สามารถส่งข้อความได้
- API request จะล้มเหลว (invalid token)

---

### ปัญหาที่ 2: Wazuh OVA Architecture ไม่ตรงกับ wazuh_ova.md

**ที่ wazuh_ova.md บอก:**
```
| Role           | IP Address    | Port |
|----------------|---------------|------|
| Wazuh Master   | 10.251.151.11 | 1516 |
| Wazuh Worker   | 10.251.151.12 | 514  |
| Wazuh Indexer  | 10.251.151.13 | 9200 |
| Wazuh Dashboard| 10.251.151.14 | 443  |
```

**สิ่งที่ส่งมาจริง:**
- เครื่องปัจจุบันคือ Wazuh Agent (wuh-network)
- Test logs ส่งไปที่ port 514/UDP
- ไม่มี active response configuration สำหรับ Telegram

---

### ปัญหาที่ 3: ไม่มี Active Response Integration

**ปัญหา:** 
- Wazuh rules ไม่มีการกำหนดให้เรียก telegram script เมื่อ alert เกิด
- ต้องกำหนด `<active-response>` block ใน rules
- ต้องสร้าง Active Response command ใน ossec.conf

**ไฟล์ที่จำเป็น:**
- `/var/ossec/etc/rules/1003-network-anomaly-rules.xml` - ต้องมี `<active-response>`
- `/var/ossec/etc/ossec.conf` - ต้องมี `<commands>` และ `<active-response>`

---

## ✅ ขั้นตอนแก้ไข

### ขั้นตอนที่ 1: แทนที่ Telegram Credentials

เปิดไฟล์:
```bash
nano /opt/code/wazuh_ova/telegram_network_alert.py
```

หาบรรทัด 18-19 และแทนที่:
```python
TELEGRAM_BOT_TOKEN = "YOUR_BOT_TOKEN"  # เปลี่ยนเป็น token จริง
TELEGRAM_CHAT_ID = "YOUR_CHAT_ID"      # เปลี่ยนเป็น Chat ID จริง
```

เป็น:
```python
TELEGRAM_BOT_TOKEN = "1234567890:ABCdefGHIJKlmnoPQRstUVwxyZ123456789"  # ตัวอย่าง
TELEGRAM_CHAT_ID = "123456789"  # ตัวอย่าง
```

**วิธีหา:**
1. สร้าง bot ใน Telegram `@BotFather` - ได้ BOT_TOKEN
2. เขียนข้อมูลไปหา bot ของคุณ
3. เข้า `https://api.telegram.org/botXXX/getUpdates` - จะเห็น Chat ID

---

### ขั้นตอนที่ 2: เพิ่ม Active Response ในRules

แก้ไขไฟล์ rules:
```bash
nano /var/ossec/etc/rules/1003-network-anomaly-rules.xml
```

เพิ่ม `<active-response>` แต่ละ rule ที่ต้องส่ง Telegram:

```xml
<rule id="100090" level="8" description="CRITICAL: External to Internal SSH Allowed">
  <if_group>network_anomaly</if_group>
  <match>flow_type=inbound, action=permit, port=22</match>
  <!-- ✅ เพิ่มส่วนนี้ -->
  <active-response>
    <command>telegram-alert</command>
    <location>agent</location>
    <level>8</level>
  </active-response>
</rule>
```

---

### ขั้นตอนที่ 3: กำหนด Active Response Command ใน ossec.conf

```bash
sudo nano /var/ossec/etc/ossec.conf
```

ใส่ในส่วน `<commands>`:

```xml
<commands>
  <command name="telegram-alert">
    <program>telegram_network_alert.py</program>
    <tag>alert</tag>
  </command>
</commands>
```

และในส่วน `<active-response>`:

```xml
<active-response>
  <command>telegram-alert</command>
  <location>agent</location>
  <rules_group>network_anomaly</rules_group>
</active-response>
```

---

### ขั้นตอนที่ 4: Restart Wazuh

```bash
sudo systemctl restart wazuh-manager
```

---

## 📊 สรุปปัญหา vs. สาเหตุ

| ปัญหา | สาเหตุ | วิธีแก้ |
|------|--------|--------|
| ❌ ไม่ได้รับ Telegram | Credentials เป็น placeholder | แทนที่ด้วยค่าจริง |
| ❌ Rules ไม่เรียก Telegram | ไม่มี active-response tag | เพิ่ม `<active-response>` ในrules |
| ❌ Script ไม่ทำงาน | ไม่มี command definition | เพิ่มใน ossec.conf |
| ⚠️ IP Address ไม่ตรง | wazuh_ova.md vs. ระบบจริง | ใช้ 10.251.151.13 เท่านั้น |

---

## 🎯 ตรวจสอบ IP Address

### ที่ wazuh_ova.md:
```
Master:    10.251.151.11
Worker:    10.251.151.12
Indexer:   10.251.151.13  ← ใช้ IP นี้สำหรับทดสอบ
Dashboard: 10.251.151.14
```

### ที่ deploy_automated.sh:
```bash
MANAGER_HOST="10.251.151.13"
```

✅ **ตรงกันแล้ว** - แต่ 10.251.151.13 เป็น Indexer ไม่ใช่ Master

---

## 🔍 วิธีตรวจสอบว่าแก้ไขถูก

```bash
# 1. ตรวจสอบ Telegram credentials
grep "TELEGRAM_BOT_TOKEN\|TELEGRAM_CHAT_ID" /opt/code/wazuh_ova/telegram_network_alert.py

# 2. ส่งทดสอบ Telegram ด้วยตนเอง
python3 /opt/code/wazuh_ova/telegram_network_alert.py

# 3. ตรวจสอบ Wazuh logs
sudo tail -100 /var/ossec/logs/active-responses.log

# 4. ค้นหา Telegram alerts ใน alerts.log
grep "telegram" /var/ossec/logs/alerts/alerts.log
```

---

## ✨ ผลที่คาดหวัง (หลังแก้ไข)

✅ Deploy rules ไปยัง Manager
✅ ส่ง test logs
✅ Wazuh สร้าง alerts ✅ Active Response ทำงาน ✅ telegram_network_alert.py ถูกเรียก
✅ ได้รับ Telegram message ที่มี:
   - 🔴 NETWORK ANOMALY DETECTED
   - Flow Information (Source/Dest IP, Port)
   - Alert severity
   - Recommendation

---

## 📝 Notes

1. **BOT_TOKEN** ต้องมาจากการสร้าง bot ใน Telegram
2. **CHAT_ID** สามารถเป็น:
   - Group ID (negative number)
   - Personal Chat ID (positive number)
3. **Telegram API** ต้องเข้าถึงได้จาก Wazuh Manager
4. **Python requests library** ต้องติดตั้ง

