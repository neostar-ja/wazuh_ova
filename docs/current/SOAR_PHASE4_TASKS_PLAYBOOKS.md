# SOAR Phase 4: Tasks & Playbook Templates

**Status:** Implemented  
**Date:** 2026-06-04

## งานที่ทำ

### TasksPanel.tsx
- CRUD: เพิ่ม/อัปเดต status (cycle)/ลบ task
- Priority: low/medium/high/critical พร้อม color coding
- Status cycle: todo → in_progress → done (คลิกที่ icon)
- Show grouped by status (in_progress → blocked → todo → done)
- Progress summary: count per status

### Playbook Templates (Backend)
8 templates ภาษาไทย:
1. IP น่าสงสัย (8 tasks)
2. Brute Force (9 tasks)
3. Malware (10 tasks)
4. Phishing (9 tasks)
5. Web Attack (8 tasks)
6. Compromised Account (9 tasks)
7. Data Exfiltration (10 tasks)
8. Policy Violation (6 tasks)

`POST /soar/cases/{id}/apply-template?template_id=<id>` → สร้าง tasks อัตโนมัติ

## Acceptance Criteria
- [x] เพิ่ม/อัปเดต/ลบ task ได้
- [x] Apply template → สร้าง tasks จริง
- [x] Task ผูกกับ iris_case_id ชัดเจน
