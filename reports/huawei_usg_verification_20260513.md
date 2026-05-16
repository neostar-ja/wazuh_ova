# รายงานตรวจสอบ Huawei USG Log - 2026-05-13

## Log ที่ตรวจสอบ

`May 13 2026 07:04:08 WUH-B-DC-USG6712E-1 %%01POLICY/6/POLICYPERMIT(l):vsys=public, protocol=17, source-ip=10.251.67.69, source-port=51770, destination-ip=172.64.155.209, destination-port=443, time=May 13 2026 14:04:08, source-zone=WUH_Staff, destination-zone=untrust, application-name=QUIC, rule-name=To-Internet.`

## ผลลัพธ์

- Log เข้า Wazuh แล้วจริงบน worker `10.251.151.12`
- Alert ที่พบ: rule `100053`, level `4`
- Decoder: `huawei-usg-custom`
- Source: `10.251.67.69:51770`
- Destination: `172.64.155.209:443`
- Protocol: `17`
- Application: `QUIC`
- Zones: `WUH_Staff -> untrust`
- Policy rule: `To-Internet.`
- Location ที่พบใน alert: `10.251.150.222`
- Dashboard API: import saved objects สำเร็จ `6` รายการ
- Dashboard: `Huawei USG - Policy Dashboard`
- Visualizations: `Huawei USG - Events by Rule`, `Huawei USG - Top Source IPs`, `Huawei USG - Applications`
- Saved search: `Huawei USG - Policy Events`
- Dashboard Advanced: `Huawei USG - Advanced Dashboard`
- Advanced widgets:
  - `Top Destinations`
  - `Top Policies`
  - `Top Source Deny`
  - `Top Destination Deny`
  - `Top Deny Policies`
  - `Top Destination Ports`
  - `Source Zones`
  - `Destination Zones`
  - `Protocol Split`
- GeoIP fields ใน index ปัจจุบัน: `ไม่มี`
- ตรวจแล้ว `geoip.location` และ `data.geoip.location` ให้ผล `0 documents`
- สรุป: dashboard เชิงแผนที่ยังทำไม่ได้ใน index ปัจจุบัน หากไม่เพิ่ม ingest pipeline สำหรับ enrichment

## ไฟล์ที่ใช้

- Decoder: `decoders/1001-huawei_decoders.xml`
- Rules: `rules/1001-huawei_rules.xml`
- Dashboard saved objects: `visualizations/huawei_usg_dashboard.ndjson`
- Analyzer report: `huawei_policypermit_real_20260513_report.json`
