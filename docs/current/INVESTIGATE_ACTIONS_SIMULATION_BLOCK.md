# Investigate Actions — Simulate Block IP

**Ref:** [GitHub Issue #1](https://github.com/neostar-ja/wazuh_ova/issues/1)  
**Date:** 2026-06-04  
**Status:** Implemented

---

## วัตถุประสงค์

Action **Block IP** ในแท็บ Actions ของ Investigate V2 ต้องทำงานในโหมด **simulation เท่านั้น** เพื่อป้องกันการเปลี่ยนแปลง production firewall/Wazuh โดยไม่ได้รับอนุมัติ

---

## ข้อกำหนดด้านความปลอดภัย

| ข้อห้าม | รายละเอียด |
|---------|-----------|
| ห้าม block จริง | ไม่มีการสร้าง firewall rule ใน production |
| ห้ามยิง firewall API จริง | API call ไปยัง FortiGate/Palo Alto/ฯลฯ ไม่เกิดขึ้น |
| ห้ามรัน Wazuh Active Response | `wazuh-control` active-response ไม่ถูกเรียก |
| ห้ามส่งคำสั่งไป Shuffle block workflow จริง | ส่งเฉพาะ simulation payload หรือ return local result |

---

## ขั้นตอนการทำงาน (Flow)

```
User กดปุ่ม "จำลอง Block IP"
         │
         ▼
Confirm dialog: "ยืนยันการจำลอง Block IP: X.X.X.X ?
                 ระบบจะ SIMULATION เท่านั้น — ไม่มีการ block จริง"
         │
         ▼
Frontend: POST /api/soar/shuffle/trigger
  payload: {
    type: "block",
    ip: "80.82.77.139",
    simulation: true,
    dry_run: true,
    source: "investigate_v2_actions",
    case_id: <ถ้ามี IRIS case>
  }
         │
         ▼
Backend (soar.py):
  if type=="block" AND (simulation OR dry_run):
    → LOG: "SIMULATION block_ip: ip=... no real action taken"
    → return simulation response (ไม่เรียก trigger_shuffle_webhook)
         │
         ▼
Backend response:
  {
    "ok": true,
    "mode": "simulation",
    "action": "block_ip",
    "ip": "80.82.77.139",
    "message": "Simulation only. No firewall rule or Wazuh Active Response was executed.",
    "message_th": "จำลองการ Block IP เท่านั้น — ไม่มีการเปลี่ยนแปลง firewall หรือ Wazuh Active Response จริง"
  }
         │
         ▼
Frontend: (ถ้ามี IRIS Case)
  POST /api/soar/iris/cases/{id}/notes
  บันทึก audit trail: "Simulation Block IP requested — 80.82.77.139"
         │
         ▼
UI แสดง: "Simulation completed — ไม่มีการ block จริง" + badge "SIMULATION"
```

---

## API Payload

### Request

```http
POST /api/soar/shuffle/trigger
Content-Type: application/json

{
  "type": "block",
  "ip": "80.82.77.139",
  "reason": "Simulation block request from Investigation Workbench",
  "simulation": true,
  "dry_run": true,
  "source": "investigate_v2_actions",
  "case_id": 123
}
```

### Response (simulation mode)

```json
{
  "ok": true,
  "mode": "simulation",
  "action": "block_ip",
  "ip": "80.82.77.139",
  "case_id": 123,
  "source": "investigate_v2_actions",
  "message": "Simulation only. No firewall rule or Wazuh Active Response was executed.",
  "message_th": "จำลองการ Block IP เท่านั้น — ไม่มีการเปลี่ยนแปลง firewall หรือ Wazuh Active Response จริง"
}
```

### ตรวจสอบ: การ block จริงจะ NOT เกิดขึ้น

Backend route ตรวจสอบ `simulation or dry_run` **ก่อน** เรียก `trigger_shuffle_webhook()`:

```python
# web_app/backend/app/routers/soar.py
if body.type == "block" and is_simulation:
    logging.getLogger("soar").info(
        "SIMULATION block_ip: ip=%s source=%s — no real action taken", ...
    )
    return { "ok": True, "mode": "simulation", ... }
    # ← ออกจาก function ทันที — trigger_shuffle_webhook() ไม่ถูกเรียก
```

---

## IRIS Audit Trail

เมื่อผู้ใช้มี IRIS Case ที่สร้างในแท็บ Actions แล้ว การกด Simulate Block IP จะบันทึก note อัตโนมัติ:

```
POST /api/soar/iris/cases/{case_id}/notes

title: "[SIMULATION] Block IP requested — 80.82.77.139"
content:
  **Simulation Block IP Requested**

  - **IP:** 80.82.77.139
  - **Mode:** simulation only
  - **Time:** 04/06/2569 10:30:00
  - **Source:** Investigation Workbench (ActionsTab)

  > ไม่มีการสร้าง firewall rule จริง
  > ไม่มีการรัน Wazuh Active Response จริง
  > Backend response mode: simulation
```

---

## UI Changes

### ก่อน → หลัง

| ส่วน | ก่อน | หลัง |
|------|------|------|
| Card title | `Block IP` | `Simulate Block IP` |
| Card description | `ส่ง block request…ผ่าน Shuffle → Firewall` | `จำลองคำขอ Block IP…ไม่มีการ block จริง ไม่มีการเปลี่ยนแปลง firewall` |
| ปุ่ม | `Block IP` | `จำลอง Block IP` |
| Badge | (ไม่มี) | `SIMULATION ONLY` chip สีส้มทอง |
| Warning box | (ไม่มี) | `ยังไม่ดำเนินการ block จริง` ภายในการ์ด |
| Confirm dialog | `ยืนยันการ block IP: X.X.X.X ?` | `ยืนยันการจำลอง Block IP: X.X.X.X ?\nระบบจะ SIMULATION เท่านั้น — ไม่มีการ block จริง` |
| Success message | `ส่ง block request สำหรับ X.X.X.X แล้ว` | `Simulation completed — ไม่มีการ block จริง` + badge `SIMULATION` |

---

## Test Case: IP 80.82.77.139

### ขั้นตอนการทดสอบ

1. เปิดหน้า `/wazuh/investigate?q=80.82.77.139&range=30d`
2. รอให้ Data Source Coverage Panel โหลด
3. เปิดแท็บ **Actions**
4. **สร้าง IRIS Case**: กรอกชื่อ → กด "สร้าง Case"
   - ✅ ควรเห็น "Case #X สร้างแล้ว"
5. **แนบ Evidence**: กด "แนบ Evidence"
   - ✅ ควรเห็น "แนบ evidence N events แล้ว"
6. **เพิ่ม IOC**: กด "เพิ่ม IOC"
   - ✅ ควรเห็น "เพิ่ม IOC แล้ว"
7. **Simulate Block IP**: กด "จำลอง Block IP"
   - ✅ Confirm dialog ต้องระบุ "SIMULATION เท่านั้น"
   - ✅ หลังกด OK ต้องเห็น "Simulation completed — ไม่มีการ block จริง"
   - ✅ Badge "SIMULATION" ปรากฏถัดจากข้อความ success
   - ✅ ตรวจ IRIS Case → ต้องมี note `[SIMULATION] Block IP requested — 80.82.77.139`

### ตรวจสอบว่าไม่มีการ block จริง

```bash
# 1. ตรวจ server log
docker logs soc-backend 2>&1 | grep "SIMULATION block_ip"
# ต้องเห็น: SIMULATION block_ip: ip=80.82.77.139 source=investigate_v2_actions

# 2. ตรวจ Shuffle (ถ้า configured)
# → ไม่ควรมี workflow execution สำหรับ block_url ใน Shuffle UI

# 3. ตรวจ Wazuh Active Response
# → ไม่ควรมี entry ใน /var/ossec/logs/active-responses.log

# 4. ตรวจ API response โดยตรง (curl)
curl -s -X POST http://localhost:3349/wazuh/api/soar/shuffle/trigger \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"type":"block","ip":"80.82.77.139","simulation":true,"dry_run":true}' | jq .mode
# ต้องได้: "simulation"
```

---

## เหตุผลที่ยังไม่ block จริง

1. **ยังไม่มี approval workflow** — การ block IP ใน production ต้องผ่าน approval จาก security lead ก่อน
2. **ยังไม่ verify firewall integration** — Shuffle → FortiGate API ยังไม่ได้ test ใน environment จริง
3. **False positive risk** — IP อาจเป็น CDN, shared hosting, หรือ internal asset ที่ misidentified
4. **Irreversible impact** — การ block IP ผิด IP อาจทำให้บริการล่มได้

### เมื่อไรถึงจะ block จริงได้

- [ ] มี Shuffle workflow สำหรับ block ที่ verified แล้ว
- [ ] มี approval step ใน workflow (security lead sign-off)
- [ ] มี rollback mechanism (unblock ง่าย)
- [ ] มี IP whitelist ป้องกัน internal services
- [ ] ผ่าน UAT ใน test environment ก่อน

---

## Files Changed

| File | การเปลี่ยนแปลง |
|------|--------------|
| `web_app/frontend/src/components/investigate/v2/ActionsTab.tsx` | เปลี่ยน Block IP → Simulate Block IP, เพิ่ม SIMULATION ONLY badge, warning box, audit trail |
| `web_app/backend/app/routers/soar.py` | เพิ่ม `simulation`, `dry_run`, `source` ใน `TriggerBody`; block simulation path ใน `shuffle_trigger()` |
| `docs/current/INVESTIGATE_ACTIONS_SIMULATION_BLOCK.md` | เอกสารนี้ |
