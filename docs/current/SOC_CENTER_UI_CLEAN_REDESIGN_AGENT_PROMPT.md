# SOC Center UI Clean Redesign — Agent Prompt

วันที่: 2026-06-11  
Repository: `neostar-ja/wazuh_ova`  
Scope: Web App UI/UX ทั้งโปรเจค โดยเฉพาะหน้า Dashboard, Alerts, Search, Investigate V2, IOC, SOAR, Compliance, Assets, KPI และ Admin

---

## เป้าหมายหลัก

ปรับปรุง UI ของ SOC Center ให้ **สวยงาม ทันสมัย มืออาชีพ ใช้งานง่าย สะอาดตา ชัดเจน และสอดคล้องกันทั้งระบบ** โดยใช้ความสามารถของ **MUI + Tailwind CSS + React + TanStack Query + Recharts/MUI X Charts** และ shared components ที่มีอยู่ในโปรเจค

ปัญหาที่ต้องแก้:

- UI บางหน้าดูรก มีการ์ด/ชาร์ท/ตารางมากเกินไปในจอเดียว
- หน้าบางหน้าดูเหมือนถูกออกแบบแยก ไม่สอดคล้องกับหน้าอื่น
- spacing, font-size, card radius, shadow, border, chip, badge และ action button ไม่สม่ำเสมอ
- บางจุดใช้ font เล็กเกินไปหรือข้อมูลแน่นเกินไป
- mobile/tablet บางหน้ามีโอกาส overflow หรืออ่านยาก
- dark/light mode ต้องตรวจ contrast ให้ครบ
- ควรลด visual noise และทำ information hierarchy ให้ชัดเจน

ผลลัพธ์สุดท้ายต้องเป็น **SOC Center ที่ดูเหมือน product เดียวกันทั้งระบบ** ไม่ใช่ collection ของหน้าต่าง ๆ ที่คนละสไตล์

---

## ไฟล์/โครงสร้างที่ต้องศึกษา

ก่อนแก้โค้ด ให้ศึกษาจริงจาก repository ปัจจุบัน:

```text
web_app/frontend/src/App.tsx
web_app/frontend/src/components/layout/
web_app/frontend/src/components/layout/sidebar/navItems.tsx
web_app/frontend/src/components/ui/
web_app/frontend/src/components/ui/layout/PageShell.tsx
web_app/frontend/src/components/ui/PageHeader.tsx
web_app/frontend/src/components/ui/tokens.ts
web_app/frontend/src/components/dashboard/DashboardPage.tsx
web_app/frontend/src/components/alerts/AlertsPage.tsx
web_app/frontend/src/components/search/LogSearchPage.tsx
web_app/frontend/src/components/search/
web_app/frontend/src/components/investigate/v2/InvestigatePageV2.tsx
web_app/frontend/src/components/ioc/IOCPage.tsx
web_app/frontend/src/components/soar/SOARPage.tsx
web_app/frontend/src/components/soar/CaseWorkspacePage.tsx
web_app/frontend/src/components/compliance/CompliancePage.tsx
web_app/frontend/src/components/assets/AssetsPage.tsx
web_app/frontend/src/components/kpi/KPIPage.tsx
web_app/frontend/src/components/admin/AdminPage.tsx
web_app/DESIGN_SYSTEM.md
docs/current/SEARCH_PAGE_ANALYSIS.md
web_app/docs/current/LOG_SEARCH_PAGE_UI_UX.md
```

ข้อมูลสำคัญที่ต้องยึด:

- หน้า `/search` มี route แล้วใน `App.tsx`
- เมนู `ค้นหา Log` อยู่ใน sidebar path `/search`
- `PageShell` เป็น layout wrapper หลักของทุกหน้า
- `PageHeader` ใช้กับ title/subtitle/actions/status
- `BRAND` และ `SEV_COLOR` อยู่ใน `components/ui/tokens.ts`
- Design system ใช้สีหลักม่วง `#7B5BA4` และสีรองส้ม `#F17422`
- Fonts: IBM Plex Sans Thai และ IBM Plex Mono

---

## หลักการออกแบบใหม่

### 1. Clean SOC Workbench Layout

ทุกหน้าควรมีโครงสร้างพื้นฐานใกล้เคียงกัน:

```text
PageShell
  ├─ PageHeader
  ├─ Primary Action / Search / Filter Zone
  ├─ Metric Summary Strip
  ├─ Main Content Area
  │    ├─ Primary panel/table/chart
  │    └─ Insight/Context rail เฉพาะหน้าที่จำเป็น
  └─ Detail Drawer / Dialog
```

ห้ามวางการ์ดจำนวนมากแบบไม่มีลำดับความสำคัญ ต้องแยกเป็น:

- ข้อมูลสำคัญที่สุด
- ข้อมูลช่วยตัดสินใจ
- ข้อมูล drill-down
- raw/detail ที่เปิดดูเมื่อจำเป็น

### 2. ลดความรก

ให้ลดสิ่งต่อไปนี้:

- chip จำนวนมากในแถวเดียว
- card ที่มี border/shadow/gradient มากเกินไป
- font-size เล็กกว่า 11px ในข้อมูลสำคัญ
- text uppercase เยอะเกินไป
- chart หลายตัวเกินความจำเป็นใน viewport แรก
- action buttons เยอะโดยไม่มี grouping
- สีหลายสีที่ไม่ได้สื่อความหมาย
- section ที่ซ้ำซ้อนกับ metric หรือ table

### 3. Visual Hierarchy

ให้ใช้ระดับชัดเจน:

- Page title: 22–26px, weight 800–900
- Section title: 15–18px, weight 700–800
- Body text: 13–15px
- Table text: 12.5–14px
- Metadata: 11.5–12.5px
- Mono values เช่น IP/port/hash/timestamp ใช้ IBM Plex Mono
- หลีกเลี่ยง `fontSize: 9` หรือ `10` สำหรับข้อมูลสำคัญ

### 4. Consistent Surfaces

กำหนดรูปแบบ card/panel ที่เหมือนกัน:

- radius: 16–20px สำหรับ major card
- radius: 10–14px สำหรับ controls/table rows/chips
- border: subtle, ใช้ theme-aware alpha
- shadow: เบา ไม่ฟุ้งเกิน
- background: ใช้ theme surface ไม่ hardcode ดำ/ขาว
- gradient ใช้อย่างประหยัด เฉพาะ accent หรือ hero เท่านั้น

### 5. Responsive First

ต้องรองรับ:

- 360px mobile
- 390px mobile
- 768px tablet
- 1024px laptop
- 1440px desktop
- 1920px wide monitor

บน mobile:

- filter ยาวให้ย้ายเป็น Drawer/Accordion
- table column เยอะให้เปลี่ยนเป็น card list หรือ compact layout
- action buttons ต้อง wrap หรือยุบเป็น menu
- ห้ามมี horizontal overflow ของทั้ง page
- touch target อย่างน้อย 40–44px

---

## Phase 1 — Design Audit & Shared UI Rules

### งานที่ต้องทำ

1. ทำ UI audit ของทุกหน้า:
   - Dashboard
   - Alerts
   - Search
   - Investigate V2
   - IOC
   - SOAR
   - Compliance
   - Assets
   - KPI
   - Admin
2. ระบุจุดที่ดูรก/ไม่สอดคล้อง:
   - spacing
   - font-size
   - card style
   - table density
   - chart density
   - dark/light contrast
   - responsive issue
3. สร้างเอกสาร:

```text
docs/current/SOC_CENTER_UI_CLEAN_REDESIGN_AUDIT.md
```

ต้องมี:

- Current issues per page
- Shared component gaps
- Recommended UI rules
- Priority list
- Screens/paths affected
- Risk of changes

### Acceptance Criteria

- มี audit document
- ระบุหน้าที่รกที่สุดและควรแก้ก่อน
- ระบุ shared component ที่ควรปรับ

---

## Phase 2 — Shared Components & Tokens Cleanup

### เป้าหมาย

ทำให้ทุกหน้าใช้ component และ token เดียวกันมากขึ้น

### งานที่ต้องทำ

1. ปรับ/เพิ่ม shared components ถ้าจำเป็น:

```text
components/ui/AppCard.tsx
components/ui/AppSection.tsx
components/ui/AppToolbar.tsx
components/ui/AppFilterBar.tsx
components/ui/AppDataTable.tsx
components/ui/AppMetricGrid.tsx
components/ui/AppStatusChip.tsx
components/ui/AppEmptyState.tsx
components/ui/AppErrorState.tsx
components/ui/AppDrawer.tsx
```

แต่ถ้ามี component เดิมที่ทำหน้าที่ใกล้เคียง เช่น `SectionCard`, `MetricCard`, `DataToolbar`, `DetailPanel`, `EmptyState`, `ErrorState` ให้ reuse/ปรับปรุงแทนการสร้างซ้ำ

2. เพิ่ม UI tokens ใน `components/ui/tokens.ts` ถ้าจำเป็น:

```text
SURFACE
BORDER
RADIUS
SHADOW
TYPOGRAPHY_SCALE
LAYOUT_GAP
TABLE_DENSITY
```

3. ห้าม hardcode สีซ้ำ ๆ ในแต่ละหน้า หากใช้ซ้ำควรย้ายเป็น token/helper
4. เพิ่ม helper สำหรับ theme-aware surface:

```ts
getSurface(theme, level)
getBorder(theme, emphasis)
getSoftBg(color, alpha)
```

5. ตรวจว่า PageShell/PageHeader ใช้งานได้ทุกหน้าและไม่บังคับ layout จนแคบ/รก

### Acceptance Criteria

- มี shared component/pattern ชัดเจน
- ลด hardcoded style ที่ซ้ำซ้อน
- UI token ใช้ร่วมกันได้
- ไม่ทำให้หน้าเดิมพัง

---

## Phase 3 — Global Layout Consistency

### งานที่ต้องทำ

1. ทุกหน้าหลักต้องใช้ `PageShell`
2. ทุกหน้าต้องมี PageHeader ที่สอดคล้องกัน:
   - title
   - subtitle
   - status ถ้ามี
   - actions ที่จัดระเบียบ
3. ลดจำนวน header actions ที่แสดงพร้อมกันเกิน 3–4 ปุ่ม
4. Actions ที่ไม่จำเป็นให้ย้ายไป More menu
5. ระยะห่างระหว่าง sections ต้องสม่ำเสมอ
6. หน้า wide monitor ต้องไม่ยืด content จนอ่านยาก
7. หน้า dashboard/search/investigate ที่เป็น workbench ใช้ maxWidth `wide` หรือ `full` อย่างเหมาะสม

### Acceptance Criteria

- PageHeader ทุกหน้าดูเป็น pattern เดียวกัน
- ไม่มี action button เบียดหรือ overflow
- layout ดูสะอาดขึ้นทั้ง desktop/tablet/mobile

---

## Phase 4 — Search Page Clean Redesign

หน้า `/search` สำคัญและมีข้อมูลเยอะ ต้องลดความรกเป็นพิเศษ

### งานที่ต้องทำ

1. ปรับ `LogSearchPage.tsx` และ components ใน `components/search/`
2. คงโครงสร้างดีเดิมไว้:
   - SearchHero
   - AdvancedFilters
   - ActiveFiltersDisplay
   - Metrics
   - SourceCoverage
   - TimelineChart
   - BreakdownCharts
   - SearchResultsGrid
   - PortListenersSection
   - SearchResultsTable
   - LogDetailDrawer
3. ลด visual noise:
   - ลด chip ที่แสดงพร้อมกันมากเกิน
   - จัด Quick Presets เป็น compact horizontal scroll บน mobile
   - Advanced Filters เป็น Accordion/Drawer บน mobile
   - Metric cards แสดงเฉพาะ 4–6 ค่าเด่นก่อน
   - Breakdown charts แสดงเป็น 2 columns desktop, 1 column mobile
4. Table:
   - desktop แสดงตารางเต็ม
   - mobile แสดงเป็น result cards
   - เพิ่ม density toggle ถ้ามีเวลา
5. Detail drawer:
   - แบ่ง section ชัดเจน
   - raw JSON ต้องอ่านง่าย ไม่กินพื้นที่
6. Export/Refresh/Clear actions ต้องไม่รกใน header
7. ใช้ font sizes ที่อ่านง่ายกว่าเดิม โดยเฉพาะ query/result row
8. เพิ่ม saved/recent searches แบบไม่ทำให้หน้าแน่น

### Acceptance Criteria

- หน้า Search ดูสะอาดและสอดคล้องกับ Investigate/SOAR
- mobile ไม่ overflow
- table/result อ่านง่าย
- filter ใช้งานง่าย
- ไม่มี mock data

---

## Phase 5 — Alerts & Investigate V2 Cleanup

### Alerts Page

1. ลดความแน่นของ filter bar
2. Summary cards ต้องเหมือน dashboard/search metric style
3. Alert table ใช้ badge/severity style เดียวกับระบบ
4. Row click เปิด detail drawer ที่อ่านง่าย
5. High/Critical default filter ถ้ามีให้แสดงชัด

### Investigate V2

1. คงความเป็น workbench แต่ลด section ที่แย่งสายตา
2. Data Source Coverage ต้อง compact
3. Entity Sidebar ต้องไม่รกบน tablet/mobile
4. Tabs ต้อง scroll ได้และ label ไม่ยาวเกิน
5. Actions Tab ต้องแสดง simulation-only ชัดเจน แต่ไม่ใหญ่เกินจำเป็น
6. Entity Graph/Risk/DNS/DHCP/NAC ต้องมี empty state ที่ดี

### Acceptance Criteria

- Alerts และ Investigate ดูเป็นระบบเดียวกับ Search
- ลดการ์ด/ชิปที่รกใน viewport แรก
- responsive ดีขึ้น

---

## Phase 6 — SOAR & Case Workspace Cleanup

### งานที่ต้องทำ

1. SOARPage:
   - IntegrationHealthPanel ให้ compact และอ่านง่าย
   - Metric cards ไม่สูง/ใหญ่เกิน
   - Tabs ใช้ style เดียวกับ Investigate/Search
2. IRIS Tab:
   - AlertsTable/CasesTable ต้องสะอาดขึ้น
   - actions ที่เยอะให้ใช้ menu/dropdown
3. CaseWorkspacePage:
   - ใช้ layout 2-column เฉพาะ desktop
   - mobile/tablet ใช้ single column
   - tabs ต้องจัดกลุ่มและไม่รก
4. Shuffle Tab:
   - workflow cards/table ต้องไม่รก
   - simulation-only chip ชัดแต่ไม่ใหญ่เกิน
5. MISP Tab:
   - search bar เด่น
   - result table อ่านง่าย

### Acceptance Criteria

- SOAR ดูเป็น professional case workbench
- ไม่มี card/action รกเกินในจอเดียว
- case workspace ใช้งานง่าย

---

## Phase 7 — IOC, Compliance, Assets, KPI, Admin Cleanup

### IOC

- Risk score/result cards ต้องดูสะอาด
- Feed cards ต้องมี hierarchy ชัด
- ไม่แสดงข้อมูลดิบเต็มจอโดยไม่จำเป็น

### Compliance

- Summary cards และ framework sections ต้องจัดระเบียบใหม่
- ตาราง SCA/Vulnerability ต้องอ่านง่าย

### Assets

- Asset cards/table ต้องลดความแน่น
- agent/detail drawer ต้องมี sections ชัดเจน

### KPI

- Chart layout ต้องไม่แน่น
- ใช้ chart cards ที่สอดคล้องกัน

### Admin

- Settings/tabs/forms ต้องจัด group ชัด
- หลีกเลี่ยง form ยาวไม่มี section

### Acceptance Criteria

- หน้าที่เหลือสอดคล้องกับ design system
- ไม่มีหน้าที่ดูแปลกแยก

---

## Phase 8 — Dark/Light, Responsive, Accessibility QA

### ต้องทดสอบ

1. Dark Mode
2. Light Mode
3. Mobile 360px
4. Mobile 390px
5. Tablet 768px
6. Laptop 1024px
7. Desktop 1440px
8. Wide 1920px

### ตรวจสิ่งเหล่านี้

- ไม่มี horizontal overflow
- ข้อความอ่านง่าย
- contrast เพียงพอ
- chip/table/button ไม่เล็กเกิน
- touch target พอ
- tooltip สำหรับ icon-only button
- keyboard focus มองเห็น
- Enter/Escape ทำงานใน search/dialog
- drawer/dialog ปิดได้
- chart ไม่ล้น
- table responsive

### Acceptance Criteria

- ใช้งานได้ดีทุกขนาดจอ
- dark/light contrast ดี
- ไม่มี UI แตก

---

## Phase 9 — Performance & Build QA

### งานที่ต้องทำ

1. ตรวจ render ที่หนักเกินไป
2. ใช้ memoization เฉพาะจุดที่จำเป็น
3. ตรวจ TanStack Query stale/refetch ที่เหมาะสม
4. หลีกเลี่ยง API refetch ซ้ำไม่จำเป็น
5. Table ขนาดใหญ่ต้องใช้ pagination/virtualization ถ้าจำเป็น
6. Chart ต้องจำกัด points หรือใช้ aggregation
7. รัน:

```bash
cd web_app/frontend
npm run build
```

8. รัน backend test ถ้ามี
9. ตรวจ console error
10. สร้างเอกสารสรุป:

```text
docs/current/SOC_CENTER_UI_CLEAN_REDESIGN_SUMMARY.md
```

### Acceptance Criteria

- frontend build ผ่าน
- ไม่มี console error สำคัญ
- UI ไม่หน่วงผิดปกติ
- มี summary document

---

## กฎสำคัญ

1. ห้ามเปลี่ยนข้อมูลจริงหรือ business logic โดยไม่จำเป็น
2. ห้ามลบฟีเจอร์เดิม
3. ห้ามใช้ mock data ใน production path
4. ห้าม hardcode credential
5. ห้ามเปลี่ยน API contract โดยไม่รักษา backward compatibility
6. ห้ามทำให้ระบบ response/block จริงเปิดใช้งานโดยไม่ตั้งใจ
7. ใช้ shared components ให้มากที่สุด
8. ถ้าสร้าง component ใหม่ ต้องมีเหตุผลชัดเจน
9. ถ้าต้องทำ breaking change ให้บันทึกใน docs
10. ต้อง commit เป็น phase ไม่ใช่ commit เดียวขนาดใหญ่

---

## Branch/Commit ที่แนะนำ

Branch:

```text
feature/ui-clean-redesign
```

Commit แนะนำ:

```text
phase1-ui-audit
phase2-shared-components-tokens
phase3-global-layout-cleanup
phase4-search-clean-redesign
phase5-alerts-investigate-cleanup
phase6-soar-cleanup
phase7-secondary-pages-cleanup
phase8-responsive-dark-light-qa
phase9-performance-build-docs
```

---

## Expected Final Result

หลังทำครบ ระบบต้องได้ UI ที่:

- สวยงาม ทันสมัย มืออาชีพ
- ใช้งานง่าย สะอาดตา ไม่รก
- เห็นลำดับความสำคัญของข้อมูลชัดเจน
- เหมาะกับ SOC hospital environment
- สอดคล้องกันทุกหน้า
- รองรับ dark/light mode จริง
- รองรับทุกขนาดหน้าจอ
- ตัวอักษรอ่านง่าย ไม่เล็ก/ใหญ่เกิน
- ใช้ MUI + Tailwind อย่างเป็นระบบ
- ใช้ Design System เดียวกัน
- ไม่มีหน้าใดดูแปลกแยกจากหน้าอื่น
- build ผ่านและมีเอกสารสรุป
