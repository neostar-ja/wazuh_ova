# SOAR Phase 8: Shuffle Actions & Simulation

**Status:** Implemented  
**Date:** 2026-06-04

## งานที่ทำ

### ShuffleActionsPanel.tsx
- Actions: Simulate Block IP, Escalate Case, Run Triage Playbook, Notify IT Owner
- Block IP = SIMULATION ONLY (simulation=true, dry_run=true เสมอ)
- Confirm dialog ระบุ "SIMULATION ONLY" ชัดเจน
- หลัง trigger: บันทึก IRIS Note + activity log + shuffle_action_history
- Action history แสดงใน panel (response_mode badge SIM/LIVE)

### Backend Safety Guard (ยืนยันอีกครั้ง)
```python
if body.type == "block" and is_simulation:
    return {"ok": True, "mode": "simulation", ...}
    # ← NEVER calls trigger_shuffle_webhook
```

## Acceptance Criteria
- [x] Simulate Block IP ไม่ block จริง (mode=simulation)
- [x] Action history บันทึกครบ
- [x] IRIS Note สร้างหลัง action
- [x] UI ไม่แสดงข้อความว่า block สำเร็จจริง
