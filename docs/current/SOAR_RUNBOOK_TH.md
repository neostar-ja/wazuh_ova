# คู่มือการใช้งาน SOAR + IRIS (SOC Runbook)

**สำหรับ:** ทีม SOC โรงพยาบาลวลัยลักษณ์  
**ระบบ:** Wazuh SIEM → Shuffle SOAR → DFIR-IRIS  
**SOAR VM:** 10.251.151.15 | Shuffle UI: http://10.251.151.15:3001 | IRIS UI: https://10.251.151.15

---

## ภาพรวมระบบ

เมื่อ Wazuh ตรวจพบภัยคุกคามระดับ L10 ขึ้นไป ระบบจะ:
1. ส่ง Alert ไปยัง **Shuffle SOAR** โดยอัตโนมัติ (Workflow 1: Triage)
2. Shuffle จะตรวจสอบ IP กับ **AbuseIPDB** และ **AlienVault OTX** เพื่อเพิ่มข้อมูล enrichment
3. สร้าง Alert ใน **DFIR-IRIS** โดยอัตโนมัติ
4. ส่งแจ้งเตือนไปยัง **Telegram** กลุ่ม WUH-Wazuh

---

## Workflow 1: Wazuh Triage (อัตโนมัติ)

**ทริกเกอร์:** Alert L10+ จาก Wazuh (ไม่ต้องดำเนินการเอง)

### ขั้นตอนที่ระบบทำงานให้อัตโนมัติ

```
Wazuh Alert (L10+)
    ↓
Shuffle รับ Alert
    ↓
ตรวจสอบ IP กับ AbuseIPDB (abuse confidence score)
    ↓
ตรวจสอบ IP กับ AlienVault OTX (threat intelligence)
    ↓
สร้าง Alert ใน DFIR-IRIS
    ↓
ส่งแจ้งเตือน Telegram
```

### การดูผลลัพธ์

1. เปิด IRIS UI: https://10.251.151.15 → เมนู **Alerts** → ดู Alert ที่เพิ่งสร้าง
2. เปิด Shuffle UI: http://10.251.151.15:3001 → Workflows → "Wazuh Triage" → **Runs** → ดูผล execution

---

## Workflow 2: Block IP (สถานะ: Simulation เท่านั้น)

> ⚠️ **สำคัญ:** WF2 ยังไม่ block IP จริง — ส่งแจ้งเตือน Telegram เท่านั้น  
> ต้องได้รับการอนุมัติจากผู้บริหารก่อนเปิดใช้ Active Response

**ทริกเกอร์:** SOC Analyst ทริกเกอร์ด้วยตนเอง

### วิธีใช้งาน (ทดสอบ/แจ้งเตือน)

```bash
# ทริกเกอร์ Block IP Simulation
curl -s -X POST "http://10.251.151.15:3001/api/v1/workflows/a44ec57c-90ed-4b32-b54d-4a546c8ecb97/execute" \
  -H "Authorization: Bearer f58c3878-a71a-434e-8297-9f303a42379c" \
  -H "Content-Type: application/json" \
  -d '{
    "execution_argument": {
      "ip": "1.2.3.4",
      "case_id": "IRIS-001",
      "analyst": "ชื่อ-analyst",
      "reason": "เหตุผลที่ต้อง block"
    },
    "start": ""
  }'
```

**ผลลัพธ์:** Telegram จะได้รับข้อความแจ้งว่า "Active Response is DISABLED — Simulation only"

---

## Workflow 3: Escalate to Senior Analyst

**ทริกเกอร์:** SOC Analyst ทริกเกอร์ด้วยตนเองเมื่อต้องการส่งเรื่องให้ผู้เชี่ยวชาญระดับสูง

### วิธีใช้งาน

```bash
curl -s -X POST "http://10.251.151.15:3001/api/v1/workflows/6d68ca79-1a8d-4a14-a709-a81715ab34fe/execute" \
  -H "Authorization: Bearer f58c3878-a71a-434e-8297-9f303a42379c" \
  -H "Content-Type: application/json" \
  -d '{
    "execution_argument": {
      "case_id": "IRIS-001",
      "case_title": "หัวข้อ incident",
      "severity": "High",
      "analyst": "ชื่อ-analyst"
    },
    "start": ""
  }'
```

---

## กระบวนการ Incident Response (ขั้นตอนเต็ม)

### ขั้นที่ 1: รับแจ้งเตือน (Telegram)
- ดูข้อความแจ้งเตือนใน Telegram กลุ่ม WUH-Wazuh
- ข้อมูลที่แสดง: Level, Rule Description, Agent Name, Source IP

### ขั้นที่ 2: ดู Alert ใน IRIS
- เข้า https://10.251.151.15 → **Alerts**
- username: `administrator` (ดู password ใน `.env`)
- ตรวจสอบ AbuseIPDB/OTX score ใน alert description

### ขั้นที่ 3: สร้าง Case ใน IRIS (ถ้าจำเป็น)
- ใน Alert → คลิก **Convert to Case**
- กรอกข้อมูล: Case title, Severity, Assignee

### ขั้นที่ 4: ตัดสินใจ

| Severity | Action |
|---|---|
| L7-9 | Monitor, บันทึกใน IRIS, ไม่ต้องดำเนินการเพิ่ม |
| L10-11 | สร้าง IRIS Case, ติดตาม, แจ้ง SOC Lead |
| L12-14 | สร้าง Case, trigger WF3 Escalate, รายงานผู้บริหาร |
| L15 (Critical) | Emergency response, ติดต่อ IT Security Manager ทันที |

### ขั้นที่ 5: Block IP (รอการอนุมัติ)
- WF2 ปัจจุบันเป็น Simulation Mode เท่านั้น
- หาก IP ถูก confirm ว่าเป็น attacker → รายงานให้ผู้บริหารอนุมัติการ block จริง

---

## การตรวจสอบระบบ (Health Check)

```bash
# ตรวจสอบ Shuffle
curl -s http://10.251.151.15:3001/api/v1/health

# ตรวจสอบ IRIS
curl -sk https://10.251.151.15/api/ping

# ตรวจสอบ Wazuh integratord
# SSH ไปที่ Master (10.251.151.11) แล้วรัน:
sudo /var/ossec/bin/wazuh-control status | grep integratord
sudo grep "integrat" /var/ossec/logs/ossec.log | tail -5
```

---

## ข้อมูล Credentials

| ระบบ | Username | Password |
|---|---|---|
| Shuffle | admin | ดู `.env` → `shuffle_password` |
| DFIR-IRIS | administrator | ดู `.env` → `iris_password` |
| Wazuh Dashboard | admin | ดู `.env` → `wazuh_dashboard_password` |

> ⚠️ ไม่เปิดเผย credentials ให้บุคคลอื่น — เก็บไว้ใน `/opt/code/wazuh_ova/.env` บนเครื่อง management

---

## Troubleshooting

| ปัญหา | สาเหตุ | วิธีแก้ |
|---|---|---|
| ไม่ได้รับ Telegram | Shuffle WF1 ไม่ทำงาน | ตรวจ Shuffle Runs ว่า execution status = FINISHED |
| IRIS ไม่มี alert ใหม่ | custom-iris หรือ Shuffle IRIS node ล้มเหลว | ดู Shuffle execution results → Create IRIS Alert node |
| integratord ไม่ส่ง alert | Alert level ต่ำกว่า L10 | ตรวจใน Wazuh alerts.log ว่า rule level เท่าไร |
| Shuffle execution ABORTED | Node มีข้อผิดพลาด | ดู execution details → ดูว่า node ไหน status=FAILURE |

---

## ไฟล์สำคัญบน Wazuh Master (10.251.151.11)

| ไฟล์ | ความสำคัญ |
|---|---|
| `/var/ossec/etc/ossec.conf` | Integration configuration |
| `/var/ossec/integrations/custom-shuffle` | Script ส่ง alert ไป Shuffle |
| `/var/ossec/integrations/custom-iris` | Script สร้าง IRIS alert โดยตรง |
| `/var/ossec/logs/integrations.log` | Log ของ integration calls |
| `/var/ossec/logs/alerts/alerts.json` | Wazuh alert JSON log |
