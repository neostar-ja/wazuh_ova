# SOAR Phase 1: Foundation & Safety

**Status:** Implemented  
**Date:** 2026-06-04

## งานที่ทำ

### Backend
- `GET /soar/health` — ตรวจ connectivity ของทุก integration (IRIS, Shuffle, MISP, Wazuh, OpenSearch, AbuseIPDB, OTX, VT, Infoblox, Huawei NAC, Firewall)
- `GET /soar/integrations` — alias คืน integration list+status
- `GET /soar/stats` อัปเดตให้รวม MISP stats ด้วย
- DB models ใหม่: `CaseTask`, `CaseEvidence`, `CaseActivityLog`, `ShuffleActionHistory`
- CRUD endpoints: `/soar/cases/{id}/tasks`, `/evidence`, `/activity`, `/shuffle-actions`
- `GET /soar/playbook-templates` + `POST /soar/cases/{id}/apply-template`

### Frontend
- `IntegrationHealthPanel.tsx` — chips แสดงสถานะทุก integration พร้อม SIMULATION MODE badge
- `SOARPage.tsx` อัปเดต: เพิ่ม IntegrationHealthPanel ด้านบน, เปลี่ยน title เป็น "SOC Incident Response Workbench"

### Safety
- Block IP = SIMULATION ONLY (ไม่เปลี่ยนแปลง — ยืนยันจาก Phase 1)
- Integration offline → แสดง error ที่อ่านได้ ไม่ทำให้หน้า crash

## Acceptance Criteria
- [x] เปิดหน้า SOAR แล้วเห็น health ของทุก integration
- [x] IRIS/Shuffle/MISP offline → แสดง error ที่อ่านได้
- [x] Block IP แสดง SIMULATION ONLY ชัดเจน
