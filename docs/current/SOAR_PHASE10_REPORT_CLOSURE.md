# SOAR Phase 10: Report & Case Closure

**Status:** Implemented  
**Date:** 2026-06-04

## งานที่ทำ

### ReportPanel.tsx
- Generate Markdown report จาก: case summary, tasks, IOCs, timeline, evidence, shuffle actions, activity log
- Input: recommendations + lessons learned
- Export: Markdown (.md) + JSON (.json)
- Preview inline (safe `<pre>` render)

### ClosurePanel.tsx
- Checklist 11 รายการ (6 required, 5 optional)
- Warning ถ้า checklist required ยังไม่ครบ
- Warning ถ้า tasks critical/high ยังค้างอยู่
- Outcome selector: True Positive / False Positive / Benign True Positive / Inconclusive
- Final note → บันทึกเป็น IRIS Note group "Case Closure"
- เพิ่ม timeline event "Case Closed" ก่อนปิด
- Reopen case: ยืนยัน + invalidate cache

## Acceptance Criteria
- [x] Generate report ได้
- [x] Export Markdown/JSON ได้
- [x] Closure checklist warning ถ้า required ไม่ครบ
- [x] ปิดเคสพร้อม note/timeline
