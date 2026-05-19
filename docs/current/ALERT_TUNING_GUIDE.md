# Alert Tuning System — คู่มือการดำเนินการและใช้งาน

**เวอร์ชัน:** 1.0
**วันที่สร้าง:** 2026-05-19
**ผู้ดูแล:** SOC Team
**ไฟล์ที่เกี่ยวข้อง:** `rules/1008-alert-tuning.xml`

---

## ภาพรวม

ระบบ Alert Tuning ช่วยให้ SOC สามารถปรับระดับความรุนแรงของ alert ได้อย่างมีมาตรฐาน
โดยไม่ต้องแก้ไขไฟล์ rule หลัก และมี audit trail ทุกการเปลี่ยนแปลง

### หลักการทำงาน

```
Rule หลัก (1000-1007)       1008-alert-tuning.xml
─────────────────────       ──────────────────────
Rule 120061 level=13   →    overwrite="yes" level=8
(ไม่แก้ไขไฟล์นี้เลย)        (เพิ่มที่นี่เท่านั้น)
                                      ↓
                            Wazuh โหลด 1008 ทีหลัง
                            → level 8 มีผลแทน level 13
```

### ผลต่อ Telegram

| Level | Telegram | Dashboard | Compliance | ใช้เมื่อ |
|-------|----------|-----------|------------|----------|
| 15+   | 🔴 CRITICAL ส่ง | ✅ | ✅ | เหตุการณ์วิกฤติ |
| 12-14 | 🟠 HIGH ส่ง | ✅ | ✅ | เหตุการณ์สำคัญ |
| 8-11  | ❌ ไม่ส่ง | ✅ | ✅ | **Tune มาที่นี่เพื่อลด Telegram noise** |
| 4-7   | ❌ ไม่ส่ง | ✅ | บางส่วน | เหตุการณ์ทั่วไป |
| 0-3   | ❌ ไม่ส่ง | ❌ | ❌ | Archive เท่านั้น |

---

## วิธีเพิ่ม Tuning Rule ใหม่ (Step-by-Step)

### ขั้น 1 — ระบุ Rule ID ที่ต้องการ tune

ดู Rule ID จาก Telegram alert หรือ Wazuh Dashboard:
```
🟠 Wazuh Alert — HIGH (Level 13)
📌 Description: NIST SC.5 / TSC CC7.2: DHCP pool exhausted
🆔 Rule ID: 120061   ← ID นี้
```

หาข้อมูล rule เดิมบน Master:
```bash
sshpass -p 'wazuh' ssh wazuh-user@10.251.151.11
sudo grep -rn 'rule id="RULE_ID"' /var/ossec/etc/rules/
```

บันทึก: description, level เดิม, groups, compliance tags, และ trigger condition (`if_sid` หรือ `if_matched_group`)

### ขั้น 2 — เปิดไฟล์ tuning ใน project

```bash
nano /opt/code/wazuh_ova/rules/1008-alert-tuning.xml
```

### ขั้น 3 — เพิ่ม override ใหม่ตาม template

วาง template ใน section `ACTIVE TUNING RULES` กรอกทุก field:

```xml
<!--
  Date        : YYYY-MM-DD
  Rule ID     : XXXXX
  Rule Desc   : [description จาก rule เดิม]
  Original    : level=XX
  Tuned to    : level=YY
  Reason      : [อธิบายสาเหตุ]
  Requester   : [ชื่อผู้ขอ]
  Approved by : [ชื่อผู้อนุมัติ]
  Review date : YYYY-MM-DD
  Ticket/Ref  : [เลข ticket หรือ -]
  Status      : active
-->
<rule id="XXXXX" level="YY" overwrite="yes">
  <if_sid>ORIGINAL_SID</if_sid>
  <description>ORIGINAL_DESCRIPTION (tuned: REASON_SHORT)</description>
  <group>ORIGINAL_GROUPS,tuned,</group>
</rule>
```

**กฎสำคัญสำหรับ Wazuh 4.14.5:**
- ต้องใส่ `overwrite="yes"` เสมอ
- ใช้ trigger ตรงกับ rule เดิม (`<if_sid>` หรือ `<if_matched_group>`)
- Compliance tags ต้องอยู่ใน `<group>` เป็น format `nist_800_53_SC.5,tsc_CC7.2,` — **ห้ามใช้** standalone `<nist_800_53>` elements (parser จะ error)
- ต้องเพิ่ม `tuned,` เข้าไปใน group เพื่อ filter ใน Dashboard
- ต้องกรอก tuning log ทุก field

### ขั้น 4 — Validate XML

```bash
python3 -c "import xml.etree.ElementTree as ET; ET.parse('rules/1008-alert-tuning.xml'); print('OK')"
# หรือถ้ามี xmllint:
xmllint --noout /opt/code/wazuh_ova/rules/1008-alert-tuning.xml && echo 'OK'
```

### ขั้น 5 — Deploy และ Restart

```bash
# Deploy ไป Master
sshpass -p 'wazuh' scp /opt/code/wazuh_ova/rules/1008-alert-tuning.xml \
    wazuh-user@10.251.151.11:/tmp/

sshpass -p 'wazuh' ssh wazuh-user@10.251.151.11 "sudo bash -s" << 'EOF'
cp /tmp/1008-alert-tuning.xml /var/ossec/etc/rules/
chown root:wazuh /var/ossec/etc/rules/1008-alert-tuning.xml
chmod 660 /var/ossec/etc/rules/1008-alert-tuning.xml
xmllint --noout /var/ossec/etc/rules/1008-alert-tuning.xml && echo 'XML: OK'
/var/ossec/bin/wazuh-control restart
EOF
```

### ขั้น 6 — ทดสอบด้วย Wazuh API Logtest

```bash
# Get token
TOKEN=$(curl -sk -u wazuh:wazuh \
  -X POST "https://10.251.151.11:55000/security/user/authenticate" | \
  python3 -c 'import sys,json; print(json.load(sys.stdin)["data"]["token"])')

# Run logtest
curl -sk -X PUT "https://10.251.151.11:55000/logtest" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"event": "SAMPLE_LOG", "log_format": "syslog", "location": "test"}' | \
  python3 -c "
import sys,json
d=json.load(sys.stdin)
r=d.get('data',{}).get('output',{}).get('rule',{})
print(f'Rule: {r.get(\"id\")}  Level: {r.get(\"level\")}  Groups: {r.get(\"groups\")}')
"
```

ตรวจสอบว่า level ตรงกับที่ tune ไว้

### ขั้น 7 — Commit ลง Git

```bash
cd /opt/code/wazuh_ova
git add rules/1008-alert-tuning.xml
git commit -m "tune: rule XXXXX DESC → level YY (90d review YYYY-MM-DD)"
```

---

## วิธี Revert Tuning (ยกเลิก override)

เมื่อต้องการให้ rule กลับไปใช้ level เดิม:

### ขั้น 1 — Comment out block (ไม่ลบ — เก็บเป็น audit trail)

```xml
<!-- REVERTED 2026-XX-XX: [reason]
<rule id="120061" level="8" overwrite="yes">
  ...
</rule>
-->
```

อัปเดต comment log:
```
Status      : reverted
Reverted on : 2026-XX-XX
Revert reason: [สาเหตุที่ revert]
```

### ขั้น 2 — Deploy และ Restart ตามปกติ (ขั้น 5 ด้านบน)

---

## วิธี Review Tuning ที่ครบ Review Date

ทุก 90 วัน หรือตาม review date ที่กำหนด:

```bash
# ดู tuning ที่ควร review
grep -A 12 'Status.*active' /opt/code/wazuh_ova/rules/1008-alert-tuning.xml | \
  grep -E 'Rule ID|Review date|Status'
```

สำหรับแต่ละ active rule ให้ตั้งคำถาม:
1. สาเหตุเดิมยังเป็นจริงอยู่ไหม?
2. เคยเกิดเหตุการณ์จริงระหว่างช่วงที่ suppress ไหม?
3. ควรคง tune ต่อ, revert, หรือปรับ level ใหม่?

บันทึกผลการ review ใน comment block:
```xml
<!--
  Review 2026-08-19: ยืนยันว่ายังคง tune ไว้ที่ level 8
    - DHCP pool ยังเกิดจาก normal device density
    - ไม่มี DHCP conflict หรือ starvation attack เกิดขึ้น
    - คง status=active ต่อ review date ใหม่: 2026-11-19
-->
```

---

## การ Monitor ว่า Tuning ทำงานถูกต้อง

### ดู tuned alerts ใน Dashboard

ไปที่: Wazuh Dashboard → Threat Hunting
เพิ่ม filter: `rule.groups: tuned`
ดูว่า alerts ที่ถูก tune ยังคงปรากฏที่ level ที่กำหนด

### Query ผ่าน OpenSearch API

```bash
# Count tuned alerts ในรอบ 7 วัน (จาก Master)
curl -sk -u admin:admin \
  'https://10.251.151.13:9200/wazuh-alerts-4.x-*/_count' \
  -H 'Content-Type: application/json' \
  -d '{
    "query": {
      "bool": {
        "must": [
          {"match": {"rule.groups": "tuned"}},
          {"range": {"@timestamp": {"gte": "now-7d"}}}
        ]
      }
    }
  }'

# ดู tuned alerts แยกตาม rule ID
curl -sk -u admin:admin \
  'https://10.251.151.13:9200/wazuh-alerts-4.x-*/_search' \
  -H 'Content-Type: application/json' \
  -d '{
    "size": 0,
    "query": {"match": {"rule.groups": "tuned"}},
    "aggs": {"by_rule": {"terms": {"field": "rule.id", "size": 20}}}
  }'
```

---

## Tuning Register ปัจจุบัน

| Rule ID | Description | Original | Tuned | Reason | Review Date | Status |
|---------|-------------|----------|-------|--------|-------------|--------|
| 120061 | DHCP pool exhausted | level=13 | level=8 | DHCP noise ไม่ใช่ attack | 2026-08-19 | active |

---

## กฎที่ห้ามทำ

- ❌ ห้ามแก้ไข level ใน 1000-1007.xml โดยตรง
- ❌ ห้ามใช้ sed หรือ vi แก้ rule หลักเพื่อ tune
- ❌ ห้ามลบ tuning entries เก่าออกจาก 1008 (เก็บเป็น audit trail)
- ❌ ห้ามเพิ่ม override โดยไม่กรอก tuning log ครบ
- ❌ ห้ามตั้ง review date เกิน 180 วัน
- ❌ ห้ามลด rule level ที่เป็น security critical จาก 15+ ลงต่ำกว่า 12
- ❌ ห้ามใช้ standalone `<nist_800_53>` หรือ `<tsc>` XML elements (Wazuh 4.14.5 จะ error)

---

## Troubleshooting

**Overwrite ไม่มีผล — rule ยัง level เดิม:**
```bash
# ตรวจสอบ load order (1008 ต้องอยู่หลัง rule ที่ override)
ls /var/ossec/etc/rules/*.xml | sort

# ตรวจสอบว่า overwrite="yes" มีอยู่
grep 'overwrite' /var/ossec/etc/rules/1008-alert-tuning.xml

# ทดสอบด้วย API logtest
# ดูหัวข้อ "ขั้น 6" ด้านบน
```

**XML Error หลัง restart:**
```bash
sudo grep -i 'error\|invalid' /var/ossec/logs/ossec.log | \
  grep -v deprecated | tail -20
# แก้ไข XML แล้ว deploy + restart ใหม่
```

**ต้องการดู tuning ทั้งหมดที่ active:**
```bash
grep -B 2 'Status.*active' /opt/code/wazuh_ova/rules/1008-alert-tuning.xml
```

**ตรวจสอบว่า compliance tags ถูกต้อง:**
```bash
# ใช้ API logtest แล้วดู nist_800_53 และ tsc fields ใน rule object
# (Wazuh 4.x แปลง nist_800_53_SC.5 ใน <group> เป็น rule.nist_800_53: ['SC.5'])
```
