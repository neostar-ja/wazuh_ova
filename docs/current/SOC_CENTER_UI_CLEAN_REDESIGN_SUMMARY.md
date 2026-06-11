# SOC Center UI Clean Redesign — Summary

สรุปผลการดำเนินงานทั้ง 9 phase ตาม
`SOC_CENTER_UI_CLEAN_REDESIGN_AGENT_PROMPT.md` บน branch
`feature/ui-clean-redesign` (จาก `sanitized-orphan`)

ภาพรวม: **15 ไฟล์เปลี่ยนแปลง, +570/-173 บรรทัด, 8 commits** — ทุกการ
เปลี่ยนแปลงเป็น styling/layout/token-level เท่านั้น **ไม่มีการแก้ไข
business logic, API call, event handler, หรือ mock data**

## Commits

| Commit | Phase | สรุป |
|---|---|---|
| `dc61b0d` | 1 | เขียน audit doc — สำรวจ shared component, ทุกหน้า, priority list |
| `8ee5c74` | 2 | เพิ่ม `tokens.ts`: `RADIUS`, `LAYOUT_GAP`, `SURFACE`/`BORDER`, `getSurface`, `getBorder`, `getSoftBg`, `getChartTipStyle`, `TYPOGRAPHY_SCALE`, `TABLE_DENSITY` (additive only) |
| `e8bbe74` | 3 | Global layout: chart tooltip → `getChartTipStyle(isDark)` ใน Dashboard, ปรับ trend-label font size |
| `e5f21a2` | 4 | Search page: รวม tooltip style + ใช้ `LAYOUT_GAP` |
| `5c61f0f` | 5 | Alerts & Investigate V2: theme-aware borders, `getSoftBg`/`getChartTipStyle` |
| `ccb0048` | 6 | SOAR & CaseWorkspace: token-based colors (`getSoftBg`), capped tag chips (+N overflow), case title truncation/tooltip |
| `d8c9982` | 7 | IOC/Compliance/Assets/KPI: tokenize color maps, `SectionCard`/`MetricCard` adoption, responsive KPI chart heights, gauge label fontSize 9→11 |
| `f7afc39` | 8 | QA audit pass — ไม่พบปัญหาเพิ่มเติม, บันทึกผลใน audit doc section 8 |

## ไฮไลต์การเปลี่ยนแปลงต่อหน้า

- **IOCPage**: ใช้ `BRAND`/`SEV_COLOR` จาก `tokens.ts` แทนการ define ซ้ำในไฟล์
  (`VERDICT_CONFIG`, `SEV_COLORS`, `sevColors` duplicate), RiskGauge
  "Risk Score" label fontSize 9 → 11
- **CompliancePage**: `ScoreGauge` เพิ่ม `viewBox` + "%" label ขั้นต่ำ 11px,
  3 chart tooltip → `getChartTipStyle(isDark)`
- **AssetsPage**: `riskColor()` ใช้ `SEV_COLOR.critical`/`SEV_COLOR.low`
  สำหรับค่าที่ตรงกันแบบ exact match, chart tooltip → `getChartTipStyle`
- **KPIPage**: `KPICard` → shared `MetricCard`, 2 chart `Card` → `SectionCard`,
  สี severity/urgency มาจาก `SEV_COLOR`/`BRAND` (แก้ legend/bar สีไม่ตรงกัน),
  ความสูงกราฟ responsive (`180px` มือถือ / `240-280px` desktop) ผ่าน
  `useMediaQuery`
- **SOARPage / CaseWorkspacePage**: badge background ใช้ `getSoftBg()`,
  case title ตัด overflow + tooltip, tag chips จำกัด 5 + "+N"
- **AlertsPage / InvestigatePageV2 / OverviewTab / Search**: tooltip และสี
  อ้างอิง `tokens.ts` ทั้งหมด, spacing ใช้ `LAYOUT_GAP`

## Deferred (บันทึกเหตุผลไว้แล้วในแต่ละ commit)

รายการต่อไปนี้เป็นการเปลี่ยนแปลงเชิงโครงสร้างที่มีความเสี่ยงสูง/ผลตอบแทนต่ำ
เมื่อเทียบกับ scope ของรอบนี้ — คงไว้ตามเดิมโดยตั้งใจ:

- IOCPage: `FeedCard` (Abuse/OTX/Shodan/VirusTotal) → `SectionCard`
- CompliancePage: 7-tab raw `Card` → `SectionCard`
- CaseWorkspacePage: "Main workspace" tabs+content wrapper → `SectionCard`
  (เป็น custom card ที่ขัดเกลาแล้ว)
- AssetsPage: header hero gradient และ risk-queue card (custom decorative
  logic) คงไว้ตามเดิม

## Build & Performance QA (Phase 9)

- `npm run build` — **สำเร็จ** (`✓ built in ~9s`)
- Bundle warning `index-*.js ~1.95 MB (gzip 560 kB)` exceeds the 500 kB
  chunk-size guidance — **pre-existing**, ไม่ได้เกิดจากการเปลี่ยนแปลงรอบนี้
  (ไม่มีการเพิ่ม dependency ใหม่ มีแต่ import จาก local `tokens.ts`/
  `SectionCard`/`MetricCard` ที่มีอยู่แล้ว) — code-splitting/`manualChunks`
  อยู่นอก scope ของ UI redesign นี้
- `npx tsc --noEmit` — มีเฉพาะ pre-existing errors เดิม (MUI `Stack`
  overload + 3 จุดใน `CompliancePage.tsx`), ไม่มี error ใหม่
- ไม่มีการเพิ่ม computation หนักใน render body — ฟังก์ชันใหม่ที่เรียกใช้
  (`getSoftBg`, `getChartTipStyle`, `getSurface`/`getBorder`) เป็น pure
  function แบบ O(1) ทั้งหมด

## Known Follow-ups

- Pre-existing MUI `Stack`/`PaperProps`/`SelectProps` type-overload warnings
  (นอก scope ตาม plan, ไม่ได้แย่ลง)
- Phase 8 เป็น code-audit pass (ไม่มี visual-regression/browser-automation
  harness ใน environment) — แนะนำให้ทดสอบจริงบน browser ที่ breakpoint
  360/768/1024px ก่อน deploy จริง โดยเฉพาะหน้า KPI ที่เปลี่ยน layout
  (Card → SectionCard/MetricCard) มากที่สุดใน Phase 7
- รายการ "Deferred" ด้านบนสามารถนำมาทำต่อในรอบถัดไปได้หากต้องการความสม่ำเสมอ
  เพิ่มเติม

## Deploy

ยังไม่ได้ deploy ขึ้น live server (`https://10.251.150.222:3348/wazuh`) —
รอการยืนยันจากผู้ใช้
