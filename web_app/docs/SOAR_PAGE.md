# SOAR & Incident Response Page — เอกสารการดำเนินการ

**วันที่ดำเนินการ:** 2026-06-03  
**เวอร์ชัน:** 2.0 (Comprehensive Redesign)

---

## สรุปการพัฒนา

พัฒนาหน้า SOAR & Incident Response ใหม่ทั้งหมด จากไฟล์เดี่ยว 1,139 บรรทัด ให้เป็นสถาปัตยกรรม component-based ที่สมบูรณ์ พร้อมภาษาไทย และสามารถบริหารจัดการ DFIR-IRIS cases ได้โดยตรงจาก web app โดยไม่ต้องเปิด IRIS เว็บ

---

## โครงสร้าง Component ใหม่

```
src/components/soar/
├── SOARPage.tsx                  — หน้าหลัก (ลดจาก 1,139 → ~180 บรรทัด)
├── soarUtils.ts                  — helpers, constants, Thai labels
├── iris/
│   ├── AlertsTable.tsx          — ตารางการแจ้งเตือน IRIS พร้อม filters
│   ├── BlockIPDialog.tsx        — Dialog ยืนยันบล็อก IP via Shuffle
│   ├── CaseDetailDrawer.tsx     — Drawer จัดการเคสครบวงจร
│   ├── CasesTable.tsx           — ตารางเคสสอบสวน พร้อม filters
│   ├── CreateAlertDialog.tsx    — Dialog สร้าง Alert ใน IRIS
│   └── CreateCaseDialog.tsx     — Dialog สร้าง Case ใน IRIS
└── tabs/
    ├── IRISTab.tsx              — แท็บ DFIR-IRIS (alerts + cases)
    ├── MISPTab.tsx              — แท็บค้นหา IOC จาก MISP
    ├── OverviewTab.tsx          — แท็บภาพรวม + charts
    └── ShuffleTab.tsx           — แท็บ Shuffle SOAR workflows
```

---

## ฟีเจอร์ใหม่

### 1. UI ภาษาไทย
- ป้ายกำกับ แท็บ ปุ่ม และ status ทุกรายการแสดงเป็นภาษาไทย
- ระดับความรุนแรง: วิกฤต / สูง / ปานกลาง / ต่ำ / ไม่ระบุ
- สถานะ: ใหม่ / มอบหมายแล้ว / กำลังดำเนินการ / รอดำเนินการ / ปิดแล้ว
- Tooltip ทุกปุ่มเป็นภาษาไทย

### 2. DFIR-IRIS Case Management (ใหม่ทั้งหมด)

**ดำเนินการได้ทันทีจาก web app โดยไม่ต้องเปิด IRIS:**

#### การแจ้งเตือน (Alerts):
- ดูรายการ alerts ทั้งหมดพร้อม filter (ความรุนแรง, สถานะ, ค้นหา)
- **สร้าง Alert ใหม่** พร้อมระบุ title, description, severity, tags, IOC
- **บล็อก IP** จาก IOC ของ alert ไปยัง Shuffle SOAR
- **Escalate Alert เป็น Case ใหม่** โดยอัตโนมัติ
- Pagination รองรับรายการจำนวนมาก

#### เคสสอบสวน (Cases):
- ดูรายการ cases ทั้งหมดพร้อม filter (สถานะ, ค้นหา)
- **สร้าง Case ใหม่** พร้อมชื่อและรายละเอียด
- **เปิด Case Detail Drawer** สำหรับจัดการเคสโดยละเอียด

#### Case Detail Drawer (ใหม่):
- **บันทึก (Notes):** เพิ่ม/ดูบันทึกในเคส พร้อม group จัดหมวดหมู่
- **IOC:** เพิ่ม/ดู indicators of compromise (IP, domain, hash, URL, email, filename)
- **Timeline:** เพิ่ม/ดูเหตุการณ์ใน timeline พร้อม datetime
- **Evidence:** ดึงหลักฐานแบบสดจาก Wazuh/OpenSearch และ MISP โดยอิง IOC ใน IRIS case
- **ปิด/เปิดเคส:** ปิดหรือเปิดเคสใหม่ได้ทันที
- **Escalate via Shuffle:** ส่ง case ไปยัง Shuffle SOAR workflow

### 2.1 Live Evidence Aggregation (อัปเดต 2026-06-05)

แท็บ `Evidence` ไม่ใช้ local SQLite metadata แล้ว แต่ aggregate หลักฐานแบบสดจากระบบที่เชื่อมต่อจริงแทน:

1. ใช้ IOC ใน IRIS case เป็น seed
2. query `Wazuh alert history` จาก OpenSearch
3. query `OpenSearch raw logs` เพิ่มเติม เช่น raw event / DNS / DHCP / NAC ตามชนิด IOC
4. query `MISP` เพื่อหา threat-intel match ของ IOC เดียวกัน
5. รวมผลเป็น evidence กลางพร้อม `summary`, `sources`, `raw preview`, `source_ref`

พฤติกรรมสำคัญ:
- read-only: ไม่รองรับเพิ่ม/ลบ evidence แบบ local อีกแล้ว
- ถ้าเรียก `POST/DELETE /soar/cases/{id}/evidence` ระบบจะตอบ `410 Gone`
- จำกัด IOC ที่ query ต่อรอบไว้ 5 IOC แรกของเคส เพื่อคุมเวลา response
- หลักฐานแต่ละรายการมี `source`, `ev_type`, `severity`, `ioc_value`, `source_ref`, `raw_json`

### 3. Shuffle SOAR
- แสดง workflows ทั้งหมดในรูปแบบการ์ด
- ระบุประเภท: Webhook / Manual trigger
- ไอคอนแตกต่างกันตาม type (Block = แดง, Escalate = เหลือง, Webhook = เขียว)
- ปุ่ม "เริ่มต้น" สำหรับ webhook-type workflows
- ป้ายสถานะ ACTIVE แต่ละ workflow

### 4. MISP Threat Intelligence
- Card แสดงสถานะการเชื่อมต่อและเวอร์ชัน MISP
- ค้นหา IOC: IP, domain, hash, URL, email, filename
- Filter ตาม IOC type (11 ประเภท)
- ผลลัพธ์แสดง: ค่า IOC, ประเภท, หมวดหมู่, Event, IDS flag
- รองรับ Enter key สำหรับค้นหา

### 5. Overview Dashboard
- **Pie chart** การกระจาย severity (ป้ายภาษาไทย)
- **Pie chart** สถานะ open/closed
- **Bar chart** แหล่งที่มา top 5
- **Tag cloud** แสดง alert tags พร้อม count
- **Recent Alerts** 8 รายการล่าสุดพร้อม severity + status badge

---

## Backend API ใหม่

### IRIS Case Management Endpoints

| Method | Endpoint | คำอธิบาย |
|--------|----------|----------|
| GET | `/soar/iris/alerts/{id}` | ดู alert detail |
| PUT | `/soar/iris/alerts/{id}` | อัปเดต alert status/severity |
| POST | `/soar/iris/alerts/escalate` | Escalate alerts → case ใหม่ |
| GET | `/soar/iris/cases/{id}` | ดู case summary |
| POST | `/soar/iris/cases` | สร้าง case ใหม่ |
| PUT | `/soar/iris/cases/{id}` | อัปเดต case |
| POST | `/soar/iris/cases/{id}/close` | ปิด case |
| POST | `/soar/iris/cases/{id}/reopen` | เปิด case ใหม่ |
| GET | `/soar/iris/cases/{id}/notes` | ดู notes |
| POST | `/soar/iris/cases/{id}/notes` | เพิ่ม note |
| GET | `/soar/iris/cases/{id}/iocs` | ดู IOCs |
| POST | `/soar/iris/cases/{id}/iocs` | เพิ่ม IOC |
| GET | `/soar/iris/cases/{id}/timeline` | ดู timeline |
| POST | `/soar/iris/cases/{id}/timeline` | เพิ่ม event |
| GET | `/soar/cases/{id}/evidence` | ดึง live evidence จาก Wazuh/OpenSearch/MISP |
| POST | `/soar/cases/{id}/evidence` | deprecated, ตอบ 410 |
| DELETE | `/soar/cases/{id}/evidence/{ev_id}` | deprecated, ตอบ 410 |

### IRIS API Paths (DFIR-IRIS 2.4.x)

```
POST /manage/cases/add          — สร้าง case
GET  /case/summary?cid=X        — ดู case summary
POST /case/update               — อัปเดต case
GET  /manage/cases/X/close      — ปิด case
POST /manage/cases/X/reopen     — เปิด case ใหม่
GET  /case/notes/groups/list    — ดู note groups
POST /case/notes/groups/add     — สร้าง note group
POST /case/notes/add            — เพิ่ม note
GET  /case/ioc/list             — ดู IOCs
POST /case/ioc/add              — เพิ่ม IOC
GET  /case/timeline/events/list — ดู timeline
POST /case/timeline/events/add  — เพิ่ม event
POST /alerts/escalate           — Escalate alerts → case
PUT  /alerts/update/{id}        — อัปเดต alert
```

---

## ไฟล์ที่แก้ไข

### Backend
- `backend/app/services/soar_svc.py` — เพิ่มฟังก์ชัน case management 15+ ฟังก์ชัน
- `backend/app/routers/soar.py` — เพิ่ม 14 endpoints ใหม่ และ live evidence aggregation
- `backend/app/services/opensearch_service.py` — ใช้ query helpers สำหรับ raw evidence / DNS / DHCP / NAC

### Frontend
- `services/soarApi.ts` — เพิ่ม types (CaseNoteGroup, CaseNote, CaseIoc, CaseTimelineEvent, CaseEvidenceResponse) และ API calls ใหม่
- `components/soar/SOARPage.tsx` — Rewrite เป็น simplified 180 บรรทัด
- `components/soar/iris/EvidencePanel.tsx` — เปลี่ยนจาก local CRUD เป็น live evidence viewer พร้อม source status
- ไฟล์ใหม่ 10 ไฟล์ (ดูโครงสร้าง component ด้านบน)

---

## การทดสอบ

### ขั้นตอนทดสอบ IRIS Integration

1. เปิดหน้า SOAR ที่ `https://10.251.150.222:3348/wazuh`
2. ตรวจสอบ Status Pill ว่า IRIS เชื่อมต่อแล้ว (สีเขียว)
3. คลิกแท็บ **จัดการเคส (IRIS)**

**ทดสอบ Alerts:**
- [ ] เห็นรายการ alerts (ภาษาไทย)
- [ ] Filter ตามความรุนแรง/สถานะทำงาน
- [ ] ค้นหาด้วย keyword ทำงาน
- [ ] ปุ่ม "สร้างการแจ้งเตือน" เปิด dialog ได้
- [ ] สร้าง alert ใหม่สำเร็จ → เห็นใน list
- [ ] ปุ่ม Escalate → สร้าง case ใหม่อัตโนมัติ
- [ ] ปุ่ม Block IP → ส่งไปยัง Shuffle

**ทดสอบ Cases:**
- [ ] เห็นรายการ cases (ภาษาไทย)
- [ ] ปุ่ม "สร้างเคส" เปิด dialog ได้
- [ ] สร้าง case ใหม่สำเร็จ → เห็นใน list
- [ ] คลิก case name หรือปุ่ม Manage → เปิด Drawer

**ทดสอบ Case Drawer:**
- [ ] แสดง case info (ชื่อ, สถานะ, owner, dates)
- [ ] แท็บ บันทึก: เพิ่มบันทึกใหม่สำเร็จ
- [ ] แท็บ IOC: เพิ่ม IOC ใหม่สำเร็จ
- [ ] แท็บ Timeline: เพิ่มเหตุการณ์สำเร็จ
- [ ] แท็บ Evidence: แสดง `summary` และ `source status` จาก Wazuh/OpenSearch/MISP
- [ ] แท็บ Evidence: download JSON ของ evidence item ได้
- [ ] API `POST /soar/cases/{id}/evidence` ตอบ 410 เพื่อยืนยันว่า manual local evidence ถูกปิดแล้ว
- [ ] ปุ่มปิด/เปิดเคสทำงาน
- [ ] ปุ่ม Escalate via Shuffle ส่งไป Shuffle

### ผลทดสอบ Live Evidence ที่ยืนยันแล้ว

เคส `2`:
- IOC จาก IRIS: `71.6.199.23`
- `GET /soar/cases/2/evidence` ตอบ `200`
- summary:
  - `total: 20`
  - `by_source.wazuh: 10`
  - `by_source.opensearch: 10`
  - `by_source.misp: 0`
- source status:
  - `Wazuh Alerts = connected`
  - `OpenSearch Raw Logs = connected`
  - `MISP Threat Intel = no_data`
- `POST /soar/cases/2/evidence` ตอบ `410 Gone` ตาม design ใหม่

**ทดสอบ Shuffle:**
- [ ] เห็น workflow cards พร้อมสี/ไอคอน
- [ ] ปุ่ม "เริ่มต้น" บน webhook workflows ทำงาน

**ทดสอบ MISP:**
- [ ] Card แสดงสถานะเชื่อมต่อ
- [ ] ค้นหา IP เช่น `192.168.1.1` แสดงผล
- [ ] Filter ตาม IOC type ทำงาน

---

## Credentials (จาก .env)

```
IRIS_URL=https://10.251.151.15:443
IRIS_API_KEY=Fw9PvrqiEpISMORwj9BesBzKSfmIKpzBqc0x7jESL3uQ...
IRIS_CUSTOMER_ID=1

SHUFFLE_URL=http://10.251.151.15:3001
SHUFFLE_TOKEN=f58c3878-a71a-434e-8297-9f303a42379c

MISP_URL=https://10.251.151.15:4430
MISP_API_KEY=zZ9pC65VRLKimumsmVJJGH0yJCYFzxW8buPyfUPM
```

---

## หมายเหตุทางเทคนิค

### DFIR-IRIS 2.4.x API
- ใช้ Bearer token authentication (`Authorization: Bearer {API_KEY}`)
- SSL verify = False (self-signed certificate)
- Base URL: `https://10.251.151.15:443`
- Case notes ต้องสร้าง note group ก่อน → ใน backend จะสร้าง group อัตโนมัติถ้าไม่ระบุ group_id

### Shuffle SOAR
- 3 webhook URLs สำหรับ block / escalate / triage
- Payload format: `{"execution_argument": {...}, "start": ""}`

### MISP
- Aggregate stats ไม่พร้อมใช้งาน (attributeStatistics ช้า) — ใช้ live search แทน
- Search endpoint: POST `/attributes/restSearch` พร้อม `returnFormat: json`
