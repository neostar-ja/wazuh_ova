# SOAR Phase 3: Case Workspace Upgrade

**Status:** Implemented  
**Date:** 2026-06-04

## งานที่ทำ

### CaseDetailDrawer.tsx ปรับใหม่ทั้งหมด
- Extract panels เป็นไฟล์แยก: `NotesPanel`, `IocPanel`, `TimelinePanel`
- เพิ่ม tabs: Tasks, Evidence, Shuffle Actions, Activity, Report, Closure
- Header: Open Full Workspace button → `/soar/cases/:id`
- Quick actions: Investigate V2, Open IRIS

### Panels ใหม่ที่ extract/สร้าง
| Panel | File | Description |
|-------|------|-------------|
| NotesPanel | `NotesPanel.tsx` | บันทึก + เพิ่ม note |
| IocPanel | `IocPanel.tsx` | IOC list + เพิ่ม IOC |
| TimelinePanel | `TimelinePanel.tsx` | Timeline events |

## Acceptance Criteria
- [x] Case Drawer มี workspace tabs ครบ 9 tabs
- [x] ทุก panel load data ได้เมื่อ caseId valid
- [x] ปุ่ม Full Workspace navigate ได้
