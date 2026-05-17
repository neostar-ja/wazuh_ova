# Suricata IDS Deployment (ใช้ Telegram เดิมของระบบ)

เอกสารนี้อธิบายการใช้งานสคริปต์ `scripts/deploy/deploy_suricata_ids.sh` ตามแนวทางใน `docs/integrations/suricata/suricata_ids_agent_prompt.md`

## ขอบเขต

สคริปต์ `scripts/deploy/deploy_suricata_ids.sh` ครอบคลุมงานหลัก Phase 1-9:

- ตรวจสภาพแวดล้อม Worker/Master
- ติดตั้งและตั้งค่า Suricata IDS (Worker)
- ตั้งค่า Wazuh localfile และกฎ Suricata (Master/Worker)
- ผูก Telegram integration
- สตาร์ทบริการและตรวจสอบผลลัพธ์เบื้องต้น

## ไฟล์ที่เกี่ยวข้อง

- `scripts/deploy/deploy_suricata_ids.sh`
- `suricata_ids_agent_prompt.md`
- `rules/1006-suricata-ids-rules.xml`
- `integrations/worker/custom-suricata-telegram`

## ลอจิก Telegram (สำคัญ)

สคริปต์เวอร์ชันปัจจุบัน deploy ดังนี้:

1. Deploy rules ไปที่ Master
   - `/var/ossec/etc/rules/1006-suricata-ids-rules.xml`

2. Deploy Telegram integration ไปที่ Worker
   - `/var/ossec/integrations/custom-suricata-telegram`
   - source ใน repo: `integrations/worker/custom-suricata-telegram`

3. เพิ่มหรือคง integration block ใน Worker `ossec.conf`
   - `group=suricata`
   - `level=12`

เฉพาะ alert ระดับ `12-14` จะถูกจัดเป็น High และ `15+` เป็น Critical ใน Telegram

แนวทางนี้ช่วยให้ใช้งาน Telegram token/chat id เดิมของระบบได้ทันที โดยไม่ต้องแก้ค่าซ้ำซ้อน

## วิธีรัน

จากเครื่องที่เข้าถึง Worker/Master ได้:

```bash
cd /opt/code/wazuh_ova
chmod +x scripts/deploy/deploy_suricata_ids.sh
./scripts/deploy/deploy_suricata_ids.sh
```

## สิ่งที่สคริปต์ทำแบบย่อ

1. ตรวจไฟล์และเครื่องมือที่ต้องใช้ (`sshpass`, `xmllint`)
2. Audit Worker (OS, network interface, Suricata/Wazuh status)
3. ติดตั้ง Suricata และ rules (ET)
4. เขียน `suricata.yaml`, `threshold.config`, `local.rules`
5. ตั้งค่า Worker `ossec.conf` ให้ ingest `/var/log/suricata/eve.json`
6. ส่งกฎ `1006-suricata-ids-rules.xml` ขึ้น Master
7. ผูก Telegram integration ด้วยลอจิก reuse-first
8. restart Wazuh ตามลำดับ Master -> Worker
9. ตรวจสอบสถานะบริการและ log สำคัญ

## จุดตรวจหลังรัน

ตรวจบน Worker:

```bash
sudo systemctl status suricata --no-pager
sudo ls -lh /var/log/suricata/eve.json
sudo tail -20 /var/log/suricata/eve.json
```

ตรวจบน Master:

```bash
sudo ls -l /var/ossec/etc/rules/1006-suricata-ids-rules.xml
sudo ls -l /var/ossec/integrations/custom-suricata-telegram
sudo tail -f /var/ossec/logs/alerts/alerts.json | grep -i suricata
```

## หมายเหตุ

- สคริปต์นี้ไม่ฝัง secret ลงโค้ด
- Telegram credentials ควรใช้งานผ่าน environment variable เดิมของระบบ
- หากมีการปรับ `ossec.conf` เพิ่มเติม ควรสำรองไฟล์ก่อนทุกครั้ง
