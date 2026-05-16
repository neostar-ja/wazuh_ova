# รายงานตรวจสอบ MikroTik Log - 2026-05-13

## สถานะเริ่มต้น

- MikroTik `10.252.0.1` ส่ง log เข้า Wazuh แล้วจริง
- Log ปรากฏใน `archives.json`
- แต่ `decoder:{}` ว่าง และไม่มี alert ใน `alerts.json`
- สาเหตุคือ decoder/rule เดิมรองรับเฉพาะ `login/wireguard/winbox change` ไม่ครอบคลุม `firewall,info prerouting ... NAT ...`

## Log ตัวอย่างที่ใช้ตรวจสอบ

`firewall,info prerouting: in:LAN out:(unknown 0), connection-state:established,snat src-mac b0:19:21:11:45:50, proto TCP (ACK), 10.252.0.66:50419->103.4.158.96:16000, NAT (10.252.0.66:50419->1.20.198.230:50419)->103.4.158.96:16000, len 40`

## ผลลัพธ์หลังแก้ไข

- Decoder ที่ match: `mikrotik-firewall`
- Rule ที่ match: `101053`
- Level: `4`
- Location: `10.252.0.1`
- Parse fields ได้ครบ:
  - `srcip`, `srcport`, `dstip`, `dstport`
  - `protocol`, `tcp_flags`
  - `chain`, `in_iface`, `out_iface`, `connection_state`
  - `nat_public_ip`, `nat_public_port`
  - `srcmac`, `length`
- Alert จริงจาก live traffic ปรากฏใน `alerts.json` แล้ว

## Dashboard

- Imported saved objects สำเร็จ
- Dashboard: `MikroTik RouterOS - Traffic Dashboard`
- Saved search: `MikroTik RouterOS - Events`
- Visualizations:
  - `MikroTik - Events by Rule`
  - `MikroTik - Top Source IPs`
  - `MikroTik - Top Destinations`

## ไฟล์ที่ใช้

- Decoder: `decoders/1001-mikrotik_decoders.xml`
- Rules: `rules/1001-mikrotik_rules.xml`
- Sample log: `samples/mikrotik_firewall_sample_20260513.log`
- Dashboard saved objects: `visualizations/mikrotik_routeros_dashboard.ndjson`
