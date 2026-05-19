# Agent Prompt: Alert Tuning System — Setup, Deploy & Document
# Target: /opt/code/wazuh_ova/rules/1008-alert-tuning.xml
# Project: /opt/code/wazuh_ova/
# Created: 2026-05-18

---

## SYSTEM CONTEXT

You are a senior Wazuh SIEM engineer creating a standardized Alert Tuning
system for this production cluster. The goal is to provide a single, auditable
place for all rule level overrides — eliminating ad-hoc edits to core rule
files and creating a clear operational process for future tuning.

```
Cluster:
  Master     10.251.151.11  (Wazuh 4.14.5, role=master — ALL rules here)
  Worker     10.251.151.12  (Wazuh 4.14.5, role=worker, Suricata 7.0.10)
  Indexer    10.251.151.13  (OpenSearch 7.10.2)
  Dashboard  10.251.151.14  (HTTPS :443)

SSH  : user=wazuh-user  password=wazuh  (sudo su for root)

Project root: /opt/code/wazuh_ova/

Telegram integration thresholds (from LIVE_SERVER_BASELINE_2026-05-17.md):
  Level < 12   → NOT sent to Telegram (silent in Dashboard only)
  Level 12-14  → 🟠 HIGH  (sent to Telegram)
  Level 15+    → 🔴 CRITICAL (sent to Telegram)

Existing rule ID ranges (DO NOT conflict):
  100060-100302 : OTX + CDB threat intel  (local_rules.xml)
  100101-100108 : Network anomaly          (1003-network-anomaly-rules.xml)
  110000-110040 : FortiGate WUH            (1005-fortigate-wuh-rules.xml)
  120001-120074 : Compliance               (1007-compliance-tags.xml)
  200000-200050 : Suricata IDS             (1006-suricata-ids-rules.xml)

Tuning file to create: rules/1008-alert-tuning.xml
  → Rule IDs reserved: NONE (overwrite="yes" reuses existing IDs)
  → File load order: 1008 loads AFTER all custom rules, overrides take effect

First tuning entry to add:
  Rule 120061 (DHCP pool exhausted) : level 12 → level 8
  Reason: DHCP pool exhaustion caused by normal device density, not attack
```

---

## OPERATING RULES

- Show exact command output before every change
- Never modify files 1000-1007 or local_rules.xml in this task
- All overrides go EXCLUSIVELY in 1008-alert-tuning.xml
- Validate XML with xmllint before every restart
- Restart order: Master first → 30s wait → Worker
- Verify test: confirm rule 120061 fires at level 8 (not 12) in wazuh-logtest
- Write documentation ONLY after all tests pass
- Keep rule 120061 compliance tags (nist_800_53, tsc) intact in the override

---

## PHASE 1 — AUDIT BEFORE CREATING ANYTHING

### 1.1 Verify current state of rule 120061 on Master
```bash
ssh wazuh-user@10.251.151.11 "
  echo '=== Current rule 120061 ==='
  sudo grep -A 12 'rule id=\"120061\"' /var/ossec/etc/rules/1007-compliance-tags.xml

  echo ''
  echo '=== Check 1008 file already exists ==='
  ls -la /var/ossec/etc/rules/1008-alert-tuning.xml 2>/dev/null || \
    echo '1008-alert-tuning.xml does not exist yet'

  echo ''
  echo '=== All current rule files (to verify load order) ==='
  ls -la /var/ossec/etc/rules/*.xml | sort

  echo ''
  echo '=== All rules with overwrite=yes (existing overrides) ==='
  sudo grep -rn 'overwrite=\"yes\"' /var/ossec/etc/rules/ 2>/dev/null || \
    echo 'No existing overwrite rules found'
"
```

### 1.2 Test current behavior in wazuh-logtest (BEFORE tuning)
```bash
ssh wazuh-user@10.251.151.11 "
  echo '=== Simulating DHCP pool exhausted log to confirm current level ==='
  echo 'May 18 10:00:00 infoblox infoblox-syslog: DHCP pool for network 10.0.0.0/24 is exhausted.' | \
    sudo -u ossec /var/ossec/bin/wazuh-logtest 2>/dev/null | \
    grep -E 'Rule|Level|Description|id:' | head -10 || \
    echo 'Manual wazuh-logtest required'
"
```
Note the current level (should be 12). This is the BEFORE state for documentation.

### 1.3 Verify Telegram threshold from ossec.conf
```bash
ssh wazuh-user@10.251.151.11 "
  echo '=== Telegram integration level threshold ==='
  sudo grep -A 3 'custom-telegram' /var/ossec/etc/ossec.conf | grep level || \
    echo 'No explicit level tag (using script default)'

  echo ''
  echo '=== Script threshold ==='
  sudo grep 'MIN_ALERT_LEVEL' /var/ossec/integrations/custom-telegram.py | head -5
"
```
Confirm: MIN_ALERT_LEVEL=12 and integration level=12.

---

## PHASE 2 — CREATE 1008-alert-tuning.xml LOCALLY

Create file `/opt/code/wazuh_ova/rules/1008-alert-tuning.xml` with this exact content:

```xml
<!--
════════════════════════════════════════════════════════════════════════════════
  WAZUH ALERT TUNING REGISTER
  ไฟล์   : rules/1008-alert-tuning.xml
  โหลดหลัง: 1007-compliance-tags.xml (load order ทำให้ override มีผล)
  หน้าที่ : รวม rule level overrides ทั้งหมดไว้ที่เดียว
  หลักการ :
    1. ห้ามแก้ไขไฟล์ rule หลัก (1000-1007, local_rules.xml) โดยตรง
    2. ทุก override ต้องใช้ overwrite="yes" ในไฟล์นี้เท่านั้น
    3. ทุก override ต้องมี tuning log ครบถ้วน (ดู template ด้านล่าง)
    4. Review date ต้องกรอกทุกครั้ง (แนะนำ 30-90 วัน)
    5. ต้องคัดลอก compliance tags จาก rule เดิมทุกตัว
  ผู้ดูแล : SOC Team
════════════════════════════════════════════════════════════════════════════════

  LEVEL GUIDE — ผลต่อ Telegram:
    Level 15+    → 🔴 CRITICAL  ส่ง Telegram ทันที
    Level 12-14  → 🟠 HIGH      ส่ง Telegram
    Level 8-11   → 📋 MEDIUM    Dashboard + Compliance เท่านั้น (ไม่ส่ง Telegram)
    Level 4-7    → 🔵 LOW       Dashboard เท่านั้น
    Level 0-3    → ⚪ INFO      Archives เท่านั้น (ไม่ขึ้น Dashboard)

  TUNING LOG TEMPLATE — คัดลอกและกรอกทุกครั้งที่เพิ่ม override ใหม่:

    Date        : YYYY-MM-DD
    Rule ID     : XXXXX
    Rule Desc   : [description จาก rule เดิม]
    Original    : level=XX
    Tuned to    : level=YY
    Reason      : [อธิบายว่าทำไม — false positive? noise? environment-specific?]
    Requester   : [ชื่อหรือ role ของผู้ขอ]
    Approved by : [ชื่อผู้อนุมัติ ถ้ามี]
    Review date : YYYY-MM-DD [วันที่ควร review — แนะนำ 90 วัน]
    Ticket/Ref  : [เลข ticket หรือ - ถ้าไม่มี]
    Status      : active | expired | reverted

════════════════════════════════════════════════════════════════════════════════
-->

<group name="tuned,">

  <!-- ════════════════════════════════════════════════════════════
       ACTIVE TUNING RULES
       ════════════════════════════════════════════════════════════ -->

  <!--
    Date        : 2026-05-18
    Rule ID     : 120061
    Rule Desc   : NIST SC.5 / TSC CC7.2: DHCP pool exhausted — Active starvation attack
    Original    : level=12 (ส่ง Telegram 🟠 HIGH)
    Tuned to    : level=8  (Dashboard + Compliance เท่านั้น ไม่ส่ง Telegram)
    Reason      : DHCP pool exhaustion เกิดจากจำนวน IP device ปกติใน network
                  ไม่ใช่ DHCP starvation attack จริง เหตุการณ์เกิดซ้ำทุกวัน
                  ยังต้องการ visibility ใน Dashboard และ Compliance แต่ไม่ต้องการ
                  Telegram notification ที่รบกวน ควร review อีกครั้งถ้า network
                  topology เปลี่ยน หรือถ้าเห็น DHCP conflict ร่วมด้วย
    Requester   : SOC Admin
    Approved by : SOC Admin
    Review date : 2026-08-18
    Ticket/Ref  : -
    Status      : active
  -->
  <rule id="120061" level="8" overwrite="yes">
    <if_matched_group>dhcp_pool_exhausted,</if_matched_group>
    <description>NIST SC.5 / TSC CC7.2: DHCP pool exhausted (tuned: infra noise, not attack)</description>
    <group>nist_800_53_SC.5,tsc_CC7.2,compliance,dhcp,dos,tuned,</group>
    <nist_800_53>SC.5</nist_800_53>
    <tsc>CC7.2</tsc>
  </rule>

  <!-- ════════════════════════════════════════════════════════════
       EXPIRED / REVERTED TUNING RULES
       (เก็บไว้เป็น audit trail — ห้ามลบ)
       ════════════════════════════════════════════════════════════ -->

  <!-- [ยังไม่มี expired entries] -->

</group>
```

### 2.1 Validate XML locally before deploy
```bash
xmllint --noout /opt/code/wazuh_ova/rules/1008-alert-tuning.xml && echo 'Local XML: OK'
```

---

## PHASE 3 — DEPLOY TO MASTER NODE

### 3.1 Copy file to Master
```bash
scp /opt/code/wazuh_ova/rules/1008-alert-tuning.xml \
    wazuh-user@10.251.151.11:/tmp/1008-alert-tuning.xml

echo 'Transfer complete. Deploying...'

ssh wazuh-user@10.251.151.11 "
  sudo cp /tmp/1008-alert-tuning.xml /var/ossec/etc/rules/1008-alert-tuning.xml
  sudo chown root:wazuh /var/ossec/etc/rules/1008-alert-tuning.xml
  sudo chmod 660 /var/ossec/etc/rules/1008-alert-tuning.xml

  echo '=== File deployed ==='
  ls -lh /var/ossec/etc/rules/1008-alert-tuning.xml

  echo ''
  echo '=== Validate XML on Master ==='
  sudo xmllint --noout /var/ossec/etc/rules/1008-alert-tuning.xml && echo 'XML: OK'

  echo ''
  echo '=== Confirm overwrite rule exists ==='
  sudo grep -A 8 'rule id=\"120061\"' /var/ossec/etc/rules/1008-alert-tuning.xml

  echo ''
  echo '=== Load order verified ==='
  ls /var/ossec/etc/rules/*.xml | sort | grep -E '100[0-9]-|local_'
"
```

### 3.2 Restart Master and verify
```bash
ssh wazuh-user@10.251.151.11 "
  echo '=== Restarting Master ==='
  sudo /var/ossec/bin/wazuh-control restart
  sleep 30

  echo '=== Service status ==='
  sudo /var/ossec/bin/wazuh-control status | grep -E 'analysisd|integratord'

  echo ''
  echo '=== Check no rule errors ==='
  sudo grep -i 'error\|invalid\|duplicate' /var/ossec/logs/ossec.log | \
    grep -v 'deprecated' | tail -10

  echo ''
  echo '=== Confirm overwrite rule loaded ==='
  sudo grep -i '120061\|tuning' /var/ossec/logs/ossec.log | tail -5 || \
    echo 'No tuning-specific log (normal — errors would appear if failed)'
"
```

---

## PHASE 4 — TEST: VERIFY RULE 120061 NOW FIRES AT LEVEL 8

### 4.1 Test with wazuh-logtest on Master
```bash
ssh wazuh-user@10.251.151.11 "
  echo 'Testing rule 120061 level after tuning...'
  echo '--- Expected: Level 8, NOT Level 12 ---'
"

# Run wazuh-logtest interactively
# Paste the following log sample when prompted:
# May 18 10:00:00 infoblox infoblox-syslog: DHCP pool for network 10.0.0.0/24 is exhausted.

ssh wazuh-user@10.251.151.11 "
  echo 'May 18 10:00:00 infoblox infoblox-syslog: DHCP pool for network 10.0.0.0/24 is exhausted.' | \
    sudo -u ossec /var/ossec/bin/wazuh-logtest 2>/dev/null | \
    grep -E 'Rule|Level|Description|Groups|id:' || \
    echo 'Use wazuh-logtest interactively to test'
"
```

Expected output must show:
- `Rule ID: 120061`
- `Level: 8` ← ต้องเป็น 8 ไม่ใช่ 12
- `Groups: nist_800_53_SC.5, tsc_CC7.2, compliance, dhcp, dos, tuned`
- `Description: NIST SC.5 / TSC CC7.2: DHCP pool exhausted (tuned: infra noise, not attack)`

### 4.2 Inject test log via logger on Worker
```bash
ssh wazuh-user@10.251.151.12 "
  logger -p daemon.warning \
    'May 18 10:01:00 infoblox infoblox-syslog: DHCP pool for network 10.0.0.0/24 is exhausted.'
  echo 'Test log sent. Checking in 20 seconds...'
  sleep 20
"

ssh wazuh-user@10.251.151.13 "
  curl -sk -u admin:admin \
    'https://localhost:9200/wazuh-alerts-4.x-*/_search' \
    -H 'Content-Type: application/json' \
    -d '{
      \"size\": 1,
      \"sort\": [{\"@timestamp\": {\"order\": \"desc\"}}],
      \"query\": {\"match\": {\"rule.id\": \"120061\"}}
    }' | python3 -c \"
import sys, json
d = json.load(sys.stdin)
hits = d.get('hits',{}).get('hits',[])
if not hits:
    print('No alert found — wait longer or check decoder')
else:
    s = hits[0]['_source']
    r = s.get('rule', {})
    print(f'Rule ID   : {r.get(\\\"id\\\",\\\"?\\\")}')
    print(f'Level     : {r.get(\\\"level\\\",\\\"?\\\")}  ← must be 8')
    print(f'Groups    : {r.get(\\\"groups\\\",[])}')
    print(f'Description: {r.get(\\\"description\\\",\\\"?\\\")[:80]}')
    level = int(r.get('level', 0))
    if level <= 11:
        print('\\nTELEGRAM: ✅ NOT sent (level < 12) — tuning SUCCESSFUL')
    else:
        print('\\nTELEGRAM: ❌ WOULD BE SENT (level >= 12) — tuning FAILED')
\"
"
```

### 4.3 Verify Compliance tags are preserved
```bash
ssh wazuh-user@10.251.151.13 "
  curl -sk -u admin:admin \
    'https://localhost:9200/wazuh-alerts-4.x-*/_search' \
    -H 'Content-Type: application/json' \
    -d '{
      \"size\": 1,
      \"sort\": [{\"@timestamp\": {\"order\": \"desc\"}}],
      \"query\": {\"match\": {\"rule.id\": \"120061\"}},
      \"_source\": [\"rule.id\",\"rule.level\",\"rule.nist_800_53\",\"rule.tsc\",\"rule.groups\"]
    }' | python3 -c \"
import sys, json
d = json.load(sys.stdin)
hits = d.get('hits',{}).get('hits',[])
if not hits: print('No data'); sys.exit(0)
s = hits[0]['_source']
r = s.get('rule', {})
print('Compliance tag verification:')
print(f'  rule.nist_800_53 : {r.get(\\\"nist_800_53\\\", \\\"MISSING ❌\\\")}')
print(f'  rule.tsc         : {r.get(\\\"tsc\\\", \\\"MISSING ❌\\\")}')
print(f'  rule.groups      : {r.get(\\\"groups\\\", [])}')
tuned_in_groups = 'tuned' in str(r.get('groups', []))
print(f'  tuned tag        : {\\\"✅ present\\\" if tuned_in_groups else \\\"❌ missing\\\"}')
\"
"
```
Both nist_800_53 and tsc must be present. Compliance Dashboard continues to show this event.

---

## PHASE 5 — WRITE OPERATIONAL MANUAL

After all tests in Phase 4 pass, create both documentation files.

### 5.1 Create main operational manual

Create `/opt/code/wazuh_ova/docs/current/ALERT_TUNING_GUIDE.md`:

```markdown
# Alert Tuning System — คู่มือการดำเนินการและใช้งาน
**เวอร์ชัน:** 1.0
**วันที่สร้าง:** 2026-05-18
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
Rule 120061 level=12   →    overwrite="yes" level=8
(ไม่แก้ไขไฟล์นี้เลย)        (เพิ่มที่นี่เท่านั้น)
                                      ↓
                            Wazuh load 1008 ทีหลัง
                            → level 8 มีผลแทน level 12
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
ssh wazuh-user@10.251.151.11
sudo grep -rn 'rule id="RULE_ID"' /var/ossec/etc/rules/
```
บันทึก: description, level เดิม, groups, และ compliance tags ทั้งหมด

### ขั้น 2 — เปิดไฟล์ tuning ใน project

```bash
# บน local machine
nano /opt/code/wazuh_ova/rules/1008-alert-tuning.xml
```

### ขั้น 3 — เพิ่ม override ใหม่ตาม template

วาง template ใน section "ACTIVE TUNING RULES" กรอกทุก field:

```xml
<!--
  Date        : 2026-XX-XX
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
  <if_matched_group>ORIGINAL_GROUP,</if_matched_group>
  <description>ORIGINAL_DESCRIPTION (tuned: REASON_SHORT)</description>
  <group>ORIGINAL_GROUPS,tuned,</group>
  <!-- คัดลอก compliance tags จาก rule เดิมทุกตัว -->
  <pci_dss>X.X</pci_dss>
  <nist_800_53>XX.X</nist_800_53>
</rule>
```

**กฎสำคัญ:**
- ต้องใส่ `overwrite="yes"` เสมอ
- ต้องคัดลอก compliance tags ทั้งหมดจาก rule เดิม
- ต้องเพิ่ม `tuned,` เข้าไปใน group
- ต้องกรอก tuning log ทุก field

### ขั้น 4 — Validate XML

```bash
xmllint --noout /opt/code/wazuh_ova/rules/1008-alert-tuning.xml && echo 'OK'
```

### ขั้น 5 — Deploy และ Restart

```bash
# Deploy
scp /opt/code/wazuh_ova/rules/1008-alert-tuning.xml \
    wazuh-user@10.251.151.11:/tmp/

ssh wazuh-user@10.251.151.11 "
  sudo cp /tmp/1008-alert-tuning.xml /var/ossec/etc/rules/
  sudo chown root:wazuh /var/ossec/etc/rules/1008-alert-tuning.xml
  sudo chmod 660 /var/ossec/etc/rules/1008-alert-tuning.xml
  sudo xmllint --noout /var/ossec/etc/rules/1008-alert-tuning.xml && echo 'OK'
  sudo /var/ossec/bin/wazuh-control restart
"

# รอ 30 วินาที แล้วตรวจสอบ
sleep 30
ssh wazuh-user@10.251.151.11 "
  sudo /var/ossec/bin/wazuh-control status | grep analysisd
  sudo grep -i 'error' /var/ossec/logs/ossec.log | \
    grep -v deprecated | tail -5
"
```

### ขั้น 6 — ทดสอบ

```bash
# ทดสอบด้วย wazuh-logtest
ssh wazuh-user@10.251.151.11
echo 'SAMPLE_LOG' | sudo -u ossec /var/ossec/bin/wazuh-logtest
# ตรวจสอบว่า Level ตรงกับที่ tune ไป
```

### ขั้น 7 — Commit ลง Git

```bash
cd /opt/code/wazuh_ova
git add rules/1008-alert-tuning.xml
git commit -m "tune: rule XXXXX DESC → level YY (90d review YYYY-MM-DD)"
git push
```

---

## วิธี Revert Tuning (ยกเลิก override)

เมื่อต้องการให้ rule กลับไปใช้ level เดิม:

### ขั้น 1 — เปลี่ยน Status เป็น reverted (ไม่ลบ — เก็บเป็น audit trail)

```xml
<!--
  ...
  Status      : reverted ← เปลี่ยนจาก active
  Reverted on : 2026-XX-XX
  Revert reason: [สาเหตุที่ revert]
-->
<!-- REVERTED 2026-XX-XX: [reason]
<rule id="120061" level="8" overwrite="yes">
  ...
</rule>
-->
```

วิธีที่ถูกต้องคือ comment out ทั้ง block โดยไม่ลบ เพื่อเก็บ audit trail ไว้

### ขั้น 2 — Deploy และ Restart ตามปกติ

---

## วิธี Review Tuning ที่ครบ Review Date

ทุก 30 วัน หรือตาม review date ที่กำหนด:

```bash
# ดู tuning ที่ควร review
grep -A 10 'Review date' /opt/code/wazuh_ova/rules/1008-alert-tuning.xml | \
  grep -E 'Rule ID|Review date|Status'
```

สำหรับแต่ละ active rule ให้ตั้งคำถาม:
1. สาเหตุเดิมยังเป็นจริงอยู่ไหม?
2. เคยเกิดเหตุการณ์จริงระหว่างช่วงที่ suppress ไหม?
3. ควรคง tune ต่อ, revert, หรือปรับ level ใหม่?

บันทึกผลการ review ใน comment block:
```xml
<!--
  Review 2026-08-18: ยืนยันว่ายังคง tune ไว้ที่ level 8
    - DHCP pool ยังเกิดจาก normal device density
    - ไม่มี DHCP conflict หรือ starvation attack เกิดขึ้น
    - คง status=active ต่อ review date ใหม่: 2026-11-18
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
# Count tuned alerts ในรอบ 7 วัน
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
  }' | python3 -c 'import sys,json; d=json.load(sys.stdin); print(f"Tuned alerts (7d): {d[\"count\"]}")'

# ดู tuned alerts แยกตาม rule ID
curl -sk -u admin:admin \
  'https://10.251.151.13:9200/wazuh-alerts-4.x-*/_search' \
  -H 'Content-Type: application/json' \
  -d '{
    "size": 0,
    "query": {"match": {"rule.groups": "tuned"}},
    "aggs": {"by_rule": {"terms": {"field": "rule.id", "size": 20}}}
  }' | python3 -c "
import sys, json
d = json.load(sys.stdin)
buckets = d.get('aggregations',{}).get('by_rule',{}).get('buckets',[])
print('Tuned rule activity:')
for b in buckets: print(f'  Rule {b[\"key\"]}: {b[\"doc_count\"]} alerts')
"
```

---

## Tuning Register ปัจจุบัน

| Rule ID | Description | Original | Tuned | Reason | Review Date | Status |
|---------|-------------|----------|-------|--------|-------------|--------|
| 120061 | DHCP pool exhausted | level=12 | level=8 | DHCP noise ไม่ใช่ attack | 2026-08-18 | active |

---

## กฎที่ห้ามทำ

❌ ห้ามแก้ไข level ใน 1000-1007.xml โดยตรง
❌ ห้ามใช้ sed หรือ vi แก้ rule หลักเพื่อ tune
❌ ห้ามลบ tuning entries เก่าออกจาก 1008 (เก็บเป็น audit trail)
❌ ห้ามเพิ่ม override โดยไม่กรอก tuning log ครบ
❌ ห้ามตั้ง review date เกิน 180 วัน
❌ ห้ามลด rule level ที่เป็น security critical จาก 15+ ลงต่ำกว่า 12

---

## Troubleshooting

**Overwrite ไม่มีผล — rule ยัง level เดิม:**
```bash
# ตรวจสอบ load order
ls /var/ossec/etc/rules/*.xml | sort
# 1008 ต้องอยู่หลัง rule ที่ override

# ตรวจสอบว่า overwrite="yes" มีอยู่
grep 'overwrite' /var/ossec/etc/rules/1008-alert-tuning.xml

# ตรวจสอบ rule ID ตรงกัน
grep 'rule id="120061"' /var/ossec/etc/rules/*.xml
```

**XML Error หลัง restart:**
```bash
sudo grep -i 'error\|invalid' /var/ossec/logs/ossec.log | \
  grep -v deprecated | tail -20
# แก้ไข XML แล้ว restart ใหม่
```

**ต้องการดู tuning ทั้งหมดที่ active:**
```bash
grep -B 2 'Status.*active' /opt/code/wazuh_ova/rules/1008-alert-tuning.xml
```
```

### 5.2 Create Tuning Quick Reference Card

Create `/opt/code/wazuh_ova/docs/current/ALERT_TUNING_QUICK_REF.md`:

```markdown
# Alert Tuning — Quick Reference
**ไฟล์ tuning:** `rules/1008-alert-tuning.xml`

## ทำ Tuning ใหม่ใน 7 ขั้น

```
1. หา Rule ID จาก Telegram alert (🆔 Rule ID: XXXXX)
2. ค้นหา rule เดิม: grep -rn 'rule id="XXXXX"' /var/ossec/etc/rules/
3. เปิด 1008-alert-tuning.xml แล้ว copy template
4. กรอก tuning log + สร้าง <rule overwrite="yes">
5. xmllint --noout 1008-alert-tuning.xml
6. Deploy: scp → ssh cp → restart Master
7. ทดสอบ: wazuh-logtest → ยืนยัน level ใหม่
```

## Level ที่ควร Tune มา

| ต้องการ | Tune เป็น Level |
|---------|-----------------|
| ลด noise Telegram แต่ยัง dashboard | 8-11 |
| แทบไม่อยากเห็น (แค่ archive) | 3-5 |
| ไม่ต้องการเลย | ใช้ frequency suppress แทน |

## Template XML (copy ใส่ในไฟล์)

```xml
<!--
  Date        : YYYY-MM-DD
  Rule ID     : XXXXX
  Rule Desc   : 
  Original    : level=XX
  Tuned to    : level=YY
  Reason      : 
  Requester   : 
  Approved by : 
  Review date : YYYY-MM-DD
  Ticket/Ref  : -
  Status      : active
-->
<rule id="XXXXX" level="YY" overwrite="yes">
  <if_matched_group>GROUP,</if_matched_group>
  <description>ORIGINAL DESC (tuned: SHORT_REASON)</description>
  <group>ORIGINAL_GROUPS,tuned,</group>
  <!-- compliance tags จาก rule เดิม -->
</rule>
```

## Deploy Command (copy-paste ready)

```bash
scp /opt/code/wazuh_ova/rules/1008-alert-tuning.xml \
    wazuh-user@10.251.151.11:/tmp/ && \
ssh wazuh-user@10.251.151.11 "
  sudo cp /tmp/1008-alert-tuning.xml /var/ossec/etc/rules/ && \
  sudo chown root:wazuh /var/ossec/etc/rules/1008-alert-tuning.xml && \
  sudo chmod 660 /var/ossec/etc/rules/1008-alert-tuning.xml && \
  sudo xmllint --noout /var/ossec/etc/rules/1008-alert-tuning.xml && \
  sudo /var/ossec/bin/wazuh-control restart && echo DONE
"
```

## Revert: Comment out + deploy ใหม่

```xml
<!-- REVERTED 2026-XX-XX: [reason]
<rule id="XXXXX" level="YY" overwrite="yes">...</rule>
-->
```
```

### 5.3 Update README.md

Add to `/opt/code/wazuh_ova/README.md` under Authoritative Files:
```markdown
### Alert Tuning System

- `rules/1008-alert-tuning.xml` — Alert level overrides (audit trail)
  - Load order: after all 1000-1007 files, overwrite="yes" takes effect
  - Current active tuning: Rule 120061 (DHCP pool) level 12 → level 8
  - Full guide: `docs/current/ALERT_TUNING_GUIDE.md`
  - Quick ref: `docs/current/ALERT_TUNING_QUICK_REF.md`
```

### 5.4 Update Live Server Baseline

Append to `docs/current/LIVE_SERVER_BASELINE_2026-05-17.md`:
```markdown
## Alert Tuning System (added 2026-05-18)

- **File**: `/var/ossec/etc/rules/1008-alert-tuning.xml` on Master
- **Load order**: After 1000-1007, overwrite="yes" rules apply last
- **Active tuning**:
  - Rule 120061 (DHCP pool exhausted): level 12 → level 8 | Review: 2026-08-18
- **Docs**: `docs/current/ALERT_TUNING_GUIDE.md`
- **Dashboard filter**: `rule.groups: tuned` shows all tuned alerts
```

---

## PHASE 6 — FINAL VERIFICATION REPORT

```
════════════════════════════════════════════════════════════
  Alert Tuning System — Final Status Report
  Date: [DATE]
════════════════════════════════════════════════════════════

FILE
  /var/ossec/etc/rules/1008-alert-tuning.xml    [OK/FAIL]
  Local: /opt/code/wazuh_ova/rules/1008-alert-tuning.xml
  Permissions: root:wazuh 660                   [OK/FAIL]
  XML valid: xmllint --noout                    [OK/FAIL]

OVERRIDE VERIFICATION
  Rule 120061 original level  : 12
  Rule 120061 tuned level     : 8              [OK/FAIL]
  wazuh-logtest shows level   : [VALUE]
  OpenSearch alert level      : [VALUE]
  Compliance tags preserved   : nist_800_53 + tsc [OK/FAIL]
  'tuned' group tag present   : [OK/FAIL]
  Telegram NOT sent           : [CONFIRMED/UNKNOWN]

DOCUMENTATION
  ALERT_TUNING_GUIDE.md       : docs/current/  [OK/FAIL]
  ALERT_TUNING_QUICK_REF.md   : docs/current/  [OK/FAIL]
  README.md updated           :                [OK/FAIL]
  LIVE_SERVER_BASELINE updated:                [OK/FAIL]

OPERATIONAL SUMMARY
  Tuning file active entries  : 1 (Rule 120061)
  Review date earliest        : 2026-08-18
  Next review                 : Set calendar reminder for 2026-08-18

OVERALL: ✅ ALERT TUNING SYSTEM OPERATIONAL / ❌ ISSUES FOUND
════════════════════════════════════════════════════════════
```
