# Alert Tuning — Quick Reference

**ไฟล์ tuning:** `rules/1008-alert-tuning.xml`
**Full guide:** `docs/current/ALERT_TUNING_GUIDE.md`

---

## ทำ Tuning ใหม่ใน 7 ขั้น

```
1. หา Rule ID จาก Telegram alert (🆔 Rule ID: XXXXX)
2. ค้นหา rule เดิม:
   sshpass -p 'wazuh' ssh wazuh-user@10.251.151.11
   sudo grep -rn 'rule id="XXXXX"' /var/ossec/etc/rules/
3. เปิด 1008-alert-tuning.xml แล้ว copy template
4. กรอก tuning log + สร้าง <rule overwrite="yes">
5. python3 -c "import xml.etree.ElementTree as ET; ET.parse('rules/1008-alert-tuning.xml'); print('OK')"
6. Deploy: scp → ssh cp → restart Master (ดู Deploy Command ด้านล่าง)
7. ทดสอบ: Wazuh API logtest → ยืนยัน level ใหม่
```

---

## Level ที่ควร Tune มา

| ต้องการ | Tune เป็น Level |
|---------|-----------------|
| ลด noise Telegram แต่ยัง dashboard | 8-11 |
| แทบไม่อยากเห็น (แค่ archive) | 3-5 |
| ไม่ต้องการเลย | ใช้ frequency suppress แทน |

---

## Template XML (copy ใส่ในไฟล์)

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
  Ticket/Ref  : -
  Status      : active
-->
<rule id="XXXXX" level="YY" overwrite="yes">
  <if_sid>ORIGINAL_SID</if_sid>
  <description>ORIGINAL DESC (tuned: SHORT_REASON)</description>
  <group>ORIGINAL_GROUPS,tuned,</group>
</rule>
```

> **หมายเหตุ Wazuh 4.14.5:** compliance tags ต้องอยู่ใน `<group>` เช่น `nist_800_53_SC.5,tsc_CC7.2,`
> ห้ามใช้ standalone elements `<nist_800_53>`, `<tsc>` — parser จะ error

---

## Deploy Command (copy-paste ready)

```bash
sshpass -p 'wazuh' scp /opt/code/wazuh_ova/rules/1008-alert-tuning.xml \
    wazuh-user@10.251.151.11:/tmp/ && \
sshpass -p 'wazuh' ssh wazuh-user@10.251.151.11 "sudo bash -s" << 'EOF'
cp /tmp/1008-alert-tuning.xml /var/ossec/etc/rules/
chown root:wazuh /var/ossec/etc/rules/1008-alert-tuning.xml
chmod 660 /var/ossec/etc/rules/1008-alert-tuning.xml
xmllint --noout /var/ossec/etc/rules/1008-alert-tuning.xml && echo 'XML: OK'
/var/ossec/bin/wazuh-control restart && echo DONE
EOF
```

---

## Logtest Command (ตรวจสอบ level หลัง deploy)

```bash
TOKEN=$(curl -sk -u wazuh:wazuh \
  -X POST "https://10.251.151.11:55000/security/user/authenticate" | \
  python3 -c 'import sys,json; print(json.load(sys.stdin)["data"]["token"])')

curl -sk -X PUT "https://10.251.151.11:55000/logtest" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"event": "SAMPLE_LOG_HERE", "log_format": "syslog", "location": "test"}' | \
  python3 -c "
import sys,json
d=json.load(sys.stdin)
r=d.get('data',{}).get('output',{}).get('rule',{})
print(f'Rule {r.get(\"id\")}  Level: {r.get(\"level\")}  Groups: {r.get(\"groups\")}')
print(f'NIST: {r.get(\"nist_800_53\")}  TSC: {r.get(\"tsc\")}')
"
```

---

## Revert: Comment out + deploy ใหม่

```xml
<!-- REVERTED 2026-XX-XX: [reason]
<rule id="XXXXX" level="YY" overwrite="yes">...</rule>
-->
```

อัปเดต Status เป็น `reverted` ใน comment log แล้ว deploy ใหม่

---

## Active Tuning Register

| Rule ID | Original | Tuned | Review Date |
|---------|----------|-------|-------------|
| 120061 | level=13 | level=8 | 2026-08-19 |
