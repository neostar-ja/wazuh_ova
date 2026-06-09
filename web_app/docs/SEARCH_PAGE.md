# Search & Hunt Console

อัปเดตล่าสุด: 9 มิถุนายน 2026

## วัตถุประสงค์

หน้า `/wazuh/search` ถูกพัฒนาใหม่ให้เป็น **Search & Hunt Console** สำหรับงานค้นหา traffic และ network evidence ข้ามหลาย log source โดยใช้ข้อมูลจริงจาก OpenSearch และ Wazuh inventory แทนการเป็นหน้า search แบบ query เดียว + ตารางผลลัพธ์เท่านั้น

use case หลัก:

- ค้นหาว่าเครื่องใดมี traffic ไปยัง `port 22`
- ค้นหาว่ามี `inbound traffic` เข้าหา `port 22` หรือไม่
- จำกัด scope การค้นหาไปยัง `firewall`, `IDS`, `SSH`, `DNS`, `DHCP`, `NAC`
- pivot จาก IP/Agent ที่พบ ไปยังหน้า `Investigate`
- export ผลลัพธ์การค้นหาเป็น JSON สำหรับ evidence / handoff

## ขอบเขตข้อมูล

หน้า search นี้ใช้ข้อมูลจาก:

- `OpenSearch / Wazuh alerts indices`
  - traffic events
  - firewall / IDS / SSH / DNS / DHCP / NAC logs ที่ถูก ingest เข้า OpenSearch
- `Wazuh port inventory`
  - ใช้ตรวจว่า agent ใดกำลัง listen port ที่ค้นหาอยู่จริง

ข้อสำคัญ:

- หน้า search **ไม่ได้** query ไปยัง Infoblox, NAC หรือ IRIS โดยตรง
- แต่ถ้า log จากระบบเหล่านั้นถูก ingest เข้า OpenSearch แล้ว หน้า search จะดึงมาแสดงได้ผ่าน `rule.groups`, `decoder`, และ aggregate ใหม่
- งาน deep-dive ระดับ entity ให้ pivot ต่อไปหน้า `/wazuh/investigate`

## แนวคิดการออกแบบ

ไม่สร้างหน้าใหม่ แต่ยกระดับหน้า search เดิมให้ทำหน้าที่ 3 อย่างในหน้าเดียว:

1. `Query-driven hunt`
   - รองรับ free-text เช่น `port 22`, `dstport:22`, `src:10.0.0.1`, `action:deny`, `source:firewall`
2. `Structured filters`
   - มีช่องกรองสำหรับ `srcip`, `dstip`, `srcport`, `dstport`, `proto`, `direction`, `action`, `agent`, `source_family`, `group`, `time range`
3. `Operational pivot`
   - Investigate จากผลลัพธ์
   - export JSON
   - ดู listener inventory ของ port ที่ค้นหา

## การเปลี่ยนแปลงฝั่ง Backend

ไฟล์หลัก:

- `backend/app/routers/search.py`
- `backend/app/services/opensearch_service.py`

### Search router

เพิ่มความสามารถของ query parser ให้รองรับ:

- `action:allow|deny|drop|block`
- `agent:<name>`
- `source:firewall|ids|ssh|dns|dhcp|nac|windows|linux|web`
- keyword direction เช่น `inbound`, `outbound`

เพิ่ม query params ใหม่ใน `/search/flow`:

- `action`
- `agent`
- `source_family`

### OpenSearch service

เพิ่ม filter และ aggregate ใหม่ใน `search_network_flow()`:

- filters:
  - `action`
  - `agent`
  - `source_family`
- metrics:
  - `unique_srcip`
  - `unique_dstip`
  - `unique_agent`
  - `matched_port`
- aggregations:
  - `top_proto`
  - `top_country`
  - `source_families`
  - `by_action`
  - `by_log_source`

`source_family` ถูก derive จาก pattern ของ `rule.groups`, `decoder.name`, `predecoder.program_name`

รองรับ family ต่อไปนี้:

- `firewall`
- `ids`
- `ssh`
- `dns`
- `dhcp`
- `nac`
- `windows`
- `linux`
- `web`

## การเปลี่ยนแปลงฝั่ง Frontend

ไฟล์หลัก:

- `frontend/src/components/search/LogSearchPage.tsx`
- `frontend/src/services/api.ts`

### ฟีเจอร์ใหม่ในหน้า Search

- hero search console แบบใหม่
- autocomplete suggestions
- quick hunt presets
- advanced filters แบบ structured
- active filter chips พร้อมลบรายตัว
- summary metric cards
- source coverage cards
- event timeline chart
- action breakdown chart
- top source / destination / agent / protocol / log source / country
- port listeners section จาก Wazuh inventory
- matched events table พร้อมปุ่ม `Investigate`
- export JSON

### แนวทาง UX

- หน้า search ใช้สำหรับ `global hunt`
- หน้า investigate ใช้สำหรับ `entity deep-dive`
- หน้า search จึงเน้น:
  - speed
  - scope narrowing
  - source coverage visibility
  - pivot workflow

## API Contract ที่หน้าใหม่ใช้

### `GET /api/search/flow`

params หลัก:

- `q`
- `port`
- `srcport`
- `dstport`
- `srcip`
- `dstip`
- `proto`
- `direction`
- `action`
- `agent`
- `source_family`
- `group`
- `time_range`
- `size`

response ที่หน้าใช้:

- `total`
- `events`
- `timeline`
- `matched_port`
- `unique_srcip`
- `unique_dstip`
- `unique_agent`
- `top_srcip`
- `top_dstip`
- `top_srcport`
- `top_dstport`
- `top_proto`
- `top_agent`
- `by_action`
- `by_log_source`
- `top_country`
- `source_families`
- `inbound_count`
- `outbound_count`
- `parsed_query`

### `GET /api/search/port-listeners`

ใช้เมื่อ query มี port ที่ชัดเจน เพื่อดึง:

- agent
- local IP
- local port
- protocol
- process
- pid
- updated_at

## พฤติกรรมสำคัญของหน้า

### ความหมายของ port search

- `port 22`
  - ค้นหาทั้ง srcport และ dstport
- `dstport:22`
  - เน้น inbound traffic ที่ไปยัง service ปลายทาง
- `srcport:22`
  - เน้น outbound / reply traffic ที่ต้นทางใช้ port 22

### การ pivot

ใน event table สามารถกด `Investigate` เพื่อเปิดหน้า:

- `/wazuh/investigate?q=<srcip|dstip|agent>`

## การทดสอบที่ทำ

### Static / Build validation

ผ่านแล้ว:

- `python3 -m py_compile backend/app/routers/search.py backend/app/services/opensearch_service.py`
- `npm run build`

### Runtime sanity check

ทดสอบเรียก `search_network_flow()` ผ่าน virtualenv ของโปรเจคโดยตรง:

- query: `dstport=22`, `proto=tcp`, `time_range=1h`, `size=5`
- ผลลัพธ์:
  - schema ใหม่ตอบกลับได้ครบ
  - `matched_port = 22`
  - `source_families` และ `top_proto` คืน field ตาม contract ใหม่
  - รอบที่ทดสอบนี้ไม่พบ event ในช่วง 1 ชั่วโมงล่าสุด แต่ service ตอบได้ปกติและไม่ error

## ข้อจำกัดปัจจุบัน

- source coverage แสดงเฉพาะสิ่งที่ ingest เข้า OpenSearch และ pattern สามารถจำแนกได้
- ถ้า data source ภายนอกยังไม่ได้ส่ง log เข้า OpenSearch หน้า search จะไม่เห็นข้อมูลนั้น
- หน้า search ยัง export เป็น `JSON` เท่านั้น ยังไม่มี CSV / saved search
- ยังไม่ได้เพิ่ม browser automation test

## แนวทางพัฒนาต่อ

แนะนำลำดับถัดไป:

1. เพิ่ม `saved searches` และ `shareable presets`
2. เพิ่ม `CSV export`
3. เพิ่ม `Create case / Add evidence` จาก selected event
4. แยก `source health` กับ `coverage` ให้เห็นว่า query นี้พลาดเพราะไม่มีข้อมูลหรือไม่มี match
5. ทำ E2E test สำหรับ workflow:
   - `dstport:22`
   - `source_family=firewall`
   - pivot ไป investigate
