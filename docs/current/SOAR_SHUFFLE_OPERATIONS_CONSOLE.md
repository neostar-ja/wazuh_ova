# Shuffle SOAR Operations Console

## ภาพรวม

แท็บ **"ระบบอัตโนมัติ / Shuffle SOAR"** ในหน้า SOAR เป็น Shuffle Operations Console สำหรับ SOC ที่ช่วยให้ analyst สามารถ:

- ดู workflow inventory จาก Shuffle SOAR จริง
- จำแนก workflow ตามประเภทอัตโนมัติ
- Trigger workflow ผ่าน dialog พร้อม validation
- **Simulate Block IP / Block Port** โดยไม่มีการ block จริง
- ดู action history ย้อนหลัง
- ผูก action เข้ากับ DFIR-IRIS Case
- เตรียมโครงสร้าง approval workflow สำหรับอนาคต

---

## ข้อกำหนดสำคัญ (Safety Policy)

| ห้าม | ต้องทำ |
|------|--------|
| Block IP จริง | แสดง SIMULATION ONLY badge |
| Block Port จริง | บังคับ simulation=true, dry_run=true |
| สั่ง Wazuh Active Response จริง | บันทึก action history ทุกครั้ง |
| สร้าง Firewall Rule จริง | แสดงข้อความภาษาไทยชัดเจน |
| ใช้ข้อความว่า "Block สำเร็จ" | ใช้ "จำลองการ Block แล้ว" |

**Backend Safety Guard** ใน `soar.py` บังคับ `simulation=true` และ `dry_run=true` สำหรับ type ที่เป็น `block`, `block_ip`, `block_port` ทุกกรณี แม้ frontend ส่ง `simulation=false` มา

---

## Architecture

```
SOC Analyst
    │
    ▼
ShuffleTab.tsx (React)
    │
    ├── WorkflowTriggerDialog (per-type form + validation)
    │
    ▼
soarApi.ts → POST /soar/shuffle/trigger
    │
    ▼
soar.py (FastAPI Router)
    │
    ├── Safety Guard (block types → simulation=true always)
    ├── Execute (simulation response OR Shuffle webhook)
    ├── Auto-save ShuffleActionHistory (SQLite)
    └── Add IRIS Case Note (if case_id provided)
              │
              ▼
         DFIR-IRIS API
```

---

## Data Flow

```
SOAR UI
  │ 1. User เลือก workflow card
  │ 2. Dialog แสดง form (ต่างกันตาม workflow type)
  │ 3. User กรอก context (target, reason, case_id, analyst)
  │ 4. กด trigger → confirm dialog สำหรับ block type
  ▼
Backend /soar/shuffle/trigger
  │ 5. Safety guard: block types → simulation=true
  │ 6. Execute action (simulation response หรือ webhook)
  │ 7. Save ShuffleActionHistory (SQLite)
  │ 8. Add IRIS Case note (if case_id)
  ▼
Response → UI แสดงผล + Action History อัปเดต
```

---

## Integration Configuration

ตั้งค่าใน `.env` (อยู่ที่ `/opt/code/wazuh_ova/web_app/.env`):

```env
# Shuffle SOAR
SHUFFLE_URL=https://10.251.151.16:3443
SHUFFLE_TOKEN=your-shuffle-api-token

# Webhook URLs (สำหรับ trigger แต่ละประเภท)
SHUFFLE_WEBHOOK_URL=https://10.251.151.16:3443/api/v1/hooks/webhook_xxx
SHUFFLE_BLOCK_URL=https://10.251.151.16:3443/api/v1/hooks/webhook_block_xxx
SHUFFLE_ESC_URL=https://10.251.151.16:3443/api/v1/hooks/webhook_esc_xxx

# DFIR-IRIS (สำหรับ Case Note integration)
IRIS_URL=https://10.251.151.16:4443
IRIS_API_KEY=your-iris-api-key
```

---

## Workflow Types

| Type | ไทย | สี | Block? | Required Fields |
|------|-----|-----|--------|-----------------|
| `triage` | จัดประเภทแจ้งเตือน | เขียวน้ำทะเล | ❌ | reason |
| `escalate` | ยกระดับเคส | เหลืองอำพัน | ❌ | reason |
| `block_ip` | จำลอง Block IP | แดง | ✅ | target_value, reason |
| `block_port` | จำลอง Block Port | แดง | ✅ | target_value, port, protocol, reason |
| `enrichment` | ตรวจสอบ IOC | ม่วง | ❌ | target_value |
| `evidence` | เก็บ Evidence | ฟ้าคราม | ❌ | — |
| `notify` | แจ้งเตือน | คราม | ❌ | reason |
| `misp_push` | Push IOC ไป MISP | ชมพู | ❌ | target_value, target_type |
| `timeline` | เพิ่ม Timeline | เขียว | ❌ | title, reason |
| `investigate` | สืบสวน | ม่วงเข้ม | ❌ | target_value |

### การจำแนก Workflow Type อัตโนมัติ

ระบบจำแนกจากชื่อ workflow และ tags โดยตรวจหาคำสำคัญ:

- `block_port`, `blockport` → `block_port`
- `block` → `block_ip`
- `escalat` → `escalate`
- `triage`, `wazuh`, `siem` → `triage`
- `enrich`, `ioc check` → `enrichment`
- `evidence`, `collect` → `evidence`
- `notify`, `notification` → `notify`
- `misp` + `push/add` → `misp_push`
- `timeline` → `timeline`
- `investigate`, `playbook` → `investigate`

---

## Simulation-Only Policy

### Block IP
```json
{
  "type": "block",
  "ip": "80.82.77.139",
  "case_id": 123,
  "analyst": "SOC Analyst",
  "reason": "Suspicious external scanner",
  "source": "soar_shuffle_tab",
  "simulation": true,
  "dry_run": true
}
```

**Response:**
```json
{
  "ok": true,
  "mode": "simulation",
  "action": "block_ip",
  "ip": "80.82.77.139",
  "message": "Simulation only. No firewall rule or Wazuh Active Response was executed.",
  "message_th": "จำลองการ Block IP เท่านั้น — ไม่มีการเปลี่ยนแปลง firewall หรือ Wazuh Active Response จริง",
  "action_id": 42,
  "iris_note_added": true
}
```

### Block Port
```json
{
  "type": "block_port",
  "target_ip": "10.251.150.151",
  "port": 445,
  "protocol": "tcp",
  "case_id": 123,
  "analyst": "SOC Analyst",
  "reason": "Suspicious SMB exposure",
  "source": "soar_shuffle_tab",
  "simulation": true,
  "dry_run": true
}
```

---

## API Endpoints

| Method | Path | คำอธิบาย |
|--------|------|-----------|
| `GET` | `/soar/shuffle/workflows` | ดึง workflow list จาก Shuffle |
| `POST` | `/soar/shuffle/trigger` | Trigger workflow (block=simulation เสมอ) |
| `GET` | `/soar/shuffle/actions` | Action history ทั้งหมด (standalone) |
| `GET` | `/soar/cases/{id}/shuffle-actions` | Action history ของ Case |
| `GET` | `/soar/health` | Integration health (รวม Shuffle status) |

### GET /soar/shuffle/actions

```
GET /soar/shuffle/actions?limit=100&case_id=42
```

Response:
```json
{
  "actions": [
    {
      "id": 42,
      "iris_case_id": 123,
      "action_type": "block_ip",
      "workflow_type": "block_ip",
      "workflow_name": "Block IP Simulation",
      "target": "80.82.77.139",
      "analyst": "SOC Analyst",
      "reason": "Suspicious scanner",
      "response_mode": "simulation",
      "response_ok": true,
      "created_by": "soc_analyst",
      "created_at": "2026-06-05T10:30:00"
    }
  ]
}
```

---

## Test Cases

### Test Case 1: Shuffle not configured

**Setup:** SHUFFLE_URL และ SHUFFLE_TOKEN ไม่ได้ตั้งค่า

**Expected:**
- แสดง banner "ยังไม่ได้ตั้งค่า Shuffle SOAR"
- แสดงคำแนะนำ config

---

### Test Case 2: List workflows

**Setup:** Shuffle connected

**Expected:**
- เห็น workflow cards จาก Shuffle จริง
- แต่ละ card มี badge แสดง type
- Workflow ประเภท block มี badge "SIMULATION ONLY"

---

### Test Case 3: Trigger triage workflow

**Action:** กด workflow card ประเภท `triage` → กรอก reason → trigger

**Expected:**
- Dialog เปิดพร้อม form สำหรับ triage
- ส่ง webhook ไป Shuffle
- บันทึก action history
- snackbar แสดงว่าสำเร็จ

---

### Test Case 4: Simulate Block IP

**Input:**
- target: `80.82.77.139`
- reason: `Suspicious external scanner`
- case_id: ไม่ระบุ

**Expected:**
- Dialog แสดง "SIMULATION ONLY" alert
- ปุ่ม trigger ชื่อ "จำลอง Block IP"
- Confirm dialog ก่อน submit
- Response: `mode=simulation`, ไม่มี firewall change
- Action history บันทึก `response_mode=simulation`
- UI แสดง: "จำลองการ Block IP เท่านั้น — ไม่มีการเปลี่ยนแปลง firewall หรือ Wazuh Active Response จริง"

**Backend Safety Verification:**
```python
# แม้ frontend ส่ง simulation=false backend จะ override
body.simulation = True
body.dry_run = True
```

---

### Test Case 5: Simulate Block Port

**Input:**
- target_ip: `10.251.150.151`
- port: `445`
- protocol: `tcp`
- reason: `Suspicious SMB exposure`

**Expected:**
- Form มี field port และ protocol
- simulation=true, dry_run=true บังคับ
- Response mode=simulation
- ไม่มี firewall change

---

### Test Case 6: Escalate Case

**Input:**
- case_id: `42`
- reason: `Elevated threat level`

**Expected:**
- Payload มี case_id
- ส่ง trigger ไป Shuffle ESC webhook
- IRIS Case ได้รับ note ใน group "Shuffle Actions"

---

### Test Case 7: Execution Status

**Expected:**
- ถ้า Shuffle webhook response มี execution_id → แสดงใน result dialog
- ถ้าไม่มี execution_id → แสดง "Trigger sent to Shuffle" (ไม่บอกว่า workflow สำเร็จ)
- ต่อให้ webhook ส่งสำเร็จ ≠ workflow สำเร็จ

---

## Troubleshooting

### Shuffle ไม่ตอบสนอง (health=error)

1. ตรวจ SHUFFLE_URL ถูกต้องหรือไม่
2. ตรวจ SHUFFLE_TOKEN ถูกต้องหรือไม่
3. ตรวจ network: `curl -k https://<shuffle-url>/api/v1/workflows -H "Authorization: Bearer <token>"`
4. ดู backend log: `docker logs soc-backend 2>&1 | grep shuffle`

### Workflow ไม่แสดง

1. ตรวจว่า Shuffle มี workflow จริงหรือไม่
2. ตรวจ `GET /soar/shuffle/workflows` response
3. ถ้า Shuffle API ส่ง list ว่าง → สร้าง workflow ใน Shuffle ก่อน

### IRIS note ไม่ถูกเพิ่ม

1. ตรวจ IRIS_URL และ IRIS_API_KEY
2. ตรวจ case_id ถูกต้องหรือไม่
3. IRIS note เป็น non-blocking — trigger จะสำเร็จแม้ IRIS ล้มเหลว
4. ดู log: `docker logs soc-backend 2>&1 | grep "IRIS case note"`

### Action history ไม่แสดง

1. ตรวจ database: `sqlite3 /app/data/soc_center.db "SELECT COUNT(*) FROM shuffle_action_history;"`
2. ตรวจ `GET /soar/shuffle/actions` response

---

## Future: Production Response Approval Workflow

เมื่อพร้อมจะเปิด production block:

1. **Request Approval** — analyst ส่งคำขอพร้อม business_impact และ rollback_plan
2. **Approval Queue** — SOC Lead / Manager อนุมัติ/ปฏิเสธ
3. **Execution Window** — ดำเนินการใน time window ที่กำหนด
4. **Audit Trail** — บันทึกทุก step พร้อม approver
5. **Rollback** — สามารถ undo ได้ภายใน X นาที

**โครงสร้าง ApprovalRequest:**
```typescript
interface ApprovalRequest {
  request_id: number
  case_id: number
  action_type: string   // block_ip / block_port
  target: string
  reason: string
  requested_by: string
  requested_at: string
  approver?: string
  approval_status: 'pending' | 'approved' | 'rejected'
  approved_at?: string
  rollback_plan: string
  business_impact: string
}
```

**สถานะปัจจุบัน:** Production actions ยัง disabled ทั้งหมด section นี้แสดง UI placeholder เท่านั้น
