# SOAR Phase 7: Evidence Management

**Status:** Implemented  
**Date:** 2026-06-04

## งานที่ทำ

### EvidencePanel.tsx
- เพิ่ม evidence metadata (ไม่รองรับ file upload จริง)
- Fields: title, description, source (wazuh/opensearch/investigate/ioc/misp/shuffle/manual), ev_type (json/text/screenshot/file_metadata/report), sha256, content_preview
- Expand/collapse content preview
- Download evidence JSON
- Delete with confirm

### Backend
- `GET/POST/DELETE /soar/cases/{id}/evidence`
- Activity log เมื่อเพิ่ม/ลบ evidence

## Safety
- Raw JSON viewer ใช้ `<pre>` เท่านั้น — ไม่ render HTML

## Acceptance Criteria
- [x] เพิ่ม evidence metadata ได้
- [x] ดู content preview ได้ (safe pre)
- [x] Download JSON ได้
