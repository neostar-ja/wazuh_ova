# SOAR Phase 2: Alert Operations

**Status:** Implemented  
**Date:** 2026-06-04

## งานที่ทำ

### AlertDetailDrawer.tsx (ใหม่)
- เปิด drawer เมื่อคลิกไอคอน ℹ️ ใน AlertsTable
- แสดง: alert_id, title, description, source, source_ref, timestamps, severity, status, owner, tags, IOCs
- Actions: Update status, Update severity, Add note, Escalate → Case, Open IRIS, Investigate V2, Search MISP inline
- MISP search embedded แสดงผลภายใน drawer
- Simulation notice ทุก action

### AlertsTable.tsx อัปเดต
- เพิ่ม checkbox สำหรับ bulk select
- Bulk escalate → Case เดียว
- Export selected alerts เป็น JSON
- คลิกไอคอน Info → AlertDetailDrawer

## Acceptance Criteria
- [x] คลิก alert → detail drawer เปิด
- [x] Update status/severity/note ได้
- [x] Escalate alert → IRIS Case ได้
- [x] Bulk select + export ได้
- [x] MISP search inline ใน drawer
