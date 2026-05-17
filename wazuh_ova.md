# Wazuh OVA — สรุปโปรเจกต์ฉบับปัจจุบัน

เอกสารนี้เป็น entrypoint ภาษาไทยของ repo หลังจัดระเบียบใหม่และตรวจเทียบกับ Wazuh server จริงเมื่อวันที่ `2026-05-17`

## สิ่งที่ต้องยึดเป็นหลัก

1. ถ้าข้อมูลในเอกสารเก่าขัดกับ `docs/current/LIVE_SERVER_BASELINE_2026-05-17.md` ให้ยึด baseline นี้
2. ถ้าไฟล์ใน `docs/archive/` ขัดกับ `README.md` หรือ `wazuh_ova.md` ให้ถือว่าไฟล์ใน archive เป็น historical record
3. ถ้าชื่อไฟล์เดิมในรายงานเก่าพูดถึง `1001-huawei_rules.xml` หรือ `1001-huawei_decoders.xml`
   ให้ใช้ชื่อที่ตรงกับ production ปัจจุบันคือ:
   - `rules/1000-huawei_rules.xml`
   - `decoders/local_decoder.xml`

## ภาพรวมระบบจริง

- Master: `10.251.151.11`
  - Wazuh `4.14.5`
  - ถือ rules/decoders และ master-side integrations
- Worker: `10.251.151.12`
  - Wazuh `4.14.5`
  - รับ syslog ที่ `UDP/1514`, `UDP/514`, `TCP/514`
  - มี Suricata `7.0.10`
  - ถือ worker-side Telegram integrations
- Indexer: `10.251.151.13`
  - OpenSearch `7.10.2`
- Dashboard: `10.251.151.14`
  - HTTPS `443`

## ไฟล์สำคัญที่ตรวจตรงกับ production แล้ว

### Decoders / Rules

- `decoders/local_decoder.xml`
- `decoders/0100-huawei-ac-decoders.xml`
- `decoders/1001-mikrotik_decoders.xml`
- `decoders/1003-infoblox-decoders.xml`
- `decoders/1004-fortigate-wuh-decoders.xml`
- `rules/1000-huawei_rules.xml`
- `rules/1001-mikrotik_rules.xml`
- `rules/1002-huawei-ac-rules.xml`
- `rules/1003-network-anomaly-rules.xml`
- `rules/1004-infoblox-rules.xml`
- `rules/1005-fortigate-wuh-rules.xml`
- `rules/1006-suricata-ids-rules.xml`
- `rules/local_abuseipdb_rules.xml`
- `rules/local_rules.xml`

### Integrations แยกตาม node

- Master:
  - `integrations/master/custom-abuseipdb.py`
  - `integrations/master/custom-otx.py`
  - `integrations/master/custom-telegram.py`
- Worker:
  - `integrations/worker/custom-telegram-anomaly.py`
  - `integrations/worker/custom-suricata-telegram`
  - `integrations/worker/custom-telegram.py`

หมายเหตุ: repo version ทำการ redacted secret/token ออกจาก Git แต่ logic และ threshold ถูก sync ให้ตรงกับ live server

## นโยบาย Telegram ปัจจุบัน

- generic Telegram ของ Wazuh ส่งเฉพาะ:
  - High: rule level `12-14`
  - Critical: rule level `15+`
- worker Suricata Telegram ใช้ threshold เดียวกัน คือ `12+`
- worker network-anomaly Telegram script ก็ enforce `12+` เช่นกัน
- แต่ rule network anomaly ชุด `100101-100108` ปัจจุบันยังเป็น level `7-8` จึงจะไม่ส่ง Telegram จนกว่าจะยกระดับ rule เอง
- CDB source-IP ตอนนี้แยกเพิ่ม:
  - `100300` คง `level 12` สำหรับกรณีปกติ/permit
  - `100303` ลดเป็น `level 10` เมื่อ raw log เป็น `deny/block/drop/reset/close`

## โครงสร้าง repo ใหม่

- `decoders/`, `rules/`, `lists/` คือ config หลัก
- `integrations/` คือสคริปต์ที่ deploy ไป `/var/ossec/integrations`
- `scripts/deploy/` คือสคริปต์ deploy ปัจจุบัน
- `scripts/archive/` คือสคริปต์เก่าที่ยังเก็บไว้แต่ไม่ถือเป็น current workflow
- `visualizations/` คือ dashboard ndjson
- `data/opensearch/` คือ JSON artifact ฝั่ง OpenSearch/template/mapping
- `docs/current/` คือเอกสารที่ต้องใช้อ้างอิงก่อน
- `docs/archive/` คือรายงานเก่าและบันทึกการแก้ก่อน reorganize

## เอกสารที่ควรอ่านต่อ

- `README.md`
- `docs/current/LIVE_SERVER_BASELINE_2026-05-17.md`
- `docs/current/REPO_LAYOUT.md`
- `docs/integrations/`
