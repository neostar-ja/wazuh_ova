# SOAR Phase 11: Full Case Workspace Page

**Status:** Implemented  
**Date:** 2026-06-04

## งานที่ทำ

### Route ใหม่
`/soar/cases/:caseId` → `CaseWorkspacePage.tsx`

### CaseWorkspacePage.tsx
- Case Summary Header: name, status, owner, dates, description
- Quick actions: Open IRIS, Investigate V2
- MUI Tabs ทุก workspace tabs: Notes/IOCs/Timeline/Tasks/Evidence/Shuffle/Activity/Report/Closure
- Tab badges: count สำหรับ Tasks, IOCs, Evidence
- Breadcrumb navigation
- Responsive (ใช้งานบน iPad ได้)
- Reuse panels เดียวกับ Drawer

### CasesTable.tsx อัปเดต
- ปุ่ม OpenInFullRoundedIcon → navigate `/soar/cases/:id`
- ปุ่ม ManageSearchRoundedIcon → Quick Drawer (เดิม)

## Acceptance Criteria
- [x] เปิด `/soar/cases/:id` ได้โดยตรง
- [x] Share URL กับทีมได้
- [x] Reuse panels ร่วมกับ drawer (no duplication)
- [x] Build ผ่าน (✓ built in 9.11s)
