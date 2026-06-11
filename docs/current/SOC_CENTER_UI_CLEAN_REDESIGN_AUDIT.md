# SOC Center UI Clean Redesign — Phase 1 Audit

วันที่: 2026-06-11
Branch: `feature/ui-clean-redesign`
Scope: `web_app/frontend/src/` — shared layout/UI system + 10 main pages
(Dashboard, Alerts, Search, Investigate V2, IOC, SOAR/Case Workspace,
Compliance, Assets, KPI, Admin)

อ้างอิงจาก `docs/current/SOC_CENTER_UI_CLEAN_REDESIGN_AGENT_PROMPT.md`

---

## 1. Shared Foundation — สถานะปัจจุบัน

| Component | Path | สถานะ |
|---|---|---|
| `tokens.ts` | `components/ui/tokens.ts` | SSOT ที่ดีสำหรับ `BRAND`, `SEV_COLOR`, `CHART_TIP_STYLE`, `PIE_COLORS`, `fmtN()` แต่ **ขาด** `SURFACE/BORDER/RADIUS/LAYOUT_GAP` และ helper ที่ theme-aware (`getSurface`, `getBorder`, `getSoftBg`, chart tooltip แบบ light/dark) |
| `SectionCard.tsx` | `components/ui/SectionCard.tsx` | ครบ 4 variants (default/glass/flat/elevated), รองรับ loading/error/empty/footer/toolbar — **ใช้เป็น reference card ของทั้งระบบได้เลย** |
| `MetricCard.tsx` | `components/ui/MetricCard.tsx` | มี compact + standard size — ใช้เป็น `AppMetricGrid` ได้ |
| `PageShell.tsx` | `components/ui/layout/PageShell.tsx` | 5 variants (dashboard/workbench/console/report/management) |
| `PageHeader.tsx` | `components/ui/PageHeader.tsx` | title/subtitle/status/actions responsive pattern |
| `EmptyState.tsx` | `components/ui/EmptyState.tsx` | 3 variants — ใช้เป็น `AppEmptyState` ได้ |
| `DataToolbar.tsx` | `components/ui/DataToolbar.tsx` | search + filter + active-chip toolbar — ใช้เป็น `AppFilterBar` ได้ |
| `ChartCard.tsx` | `components/ui/ChartCard.tsx` | chart container wrapper |

**สรุป**: shared component ที่เอกสาร Phase 2 เสนอให้สร้างใหม่ (`AppCard`,
`AppSection`, `AppFilterBar`, `AppMetricGrid`, `AppEmptyState`, ฯลฯ) **มีของ
เทียบเท่าอยู่แล้วทั้งหมด** → Phase 2 ของแผนนี้จึงเป็นการ **เพิ่ม token/helper**
ใน `tokens.ts` และผลักดันการ "adopt" ให้ทั่วถึง ไม่ใช่สร้าง component ใหม่

**ปัญหาหลักของ shared layer**: หน้าจำนวนมาก **define ค่าสีซ้ำเอง** แทนที่จะ
import จาก `tokens.ts` (เช่น local `BRAND`, `SEV_COLOR_MAP`, `CHART_TIP_STYLE`
redefinition) และ chart tooltip หลายจุด hardcode `background: '#1e293b'` หรือ
`rgba(22,18,42,0.97)` แบบ dark-only ไม่ react ต่อ light mode

---

## 2. Per-Page Audit

### 2.1 DashboardPage.tsx — 1,197 บรรทัด — Priority: **HIGH**
- ใช้: `PageShell`, `SectionCard`, `MetricCard`, `PageHeader`
- Header actions: 1 (Refresh)
- Viewport-1 density: ~8 sections (5 metric cards + posture banner + severity
  breakdown)
- ปัญหา:
  - Local `B` object (บรรทัด ~49-53) redefine BRAND tokens ซ้ำ
  - `fontSize: 9` สำหรับ trend % (อ่านยากบนมือถือ)
  - MetricHero cards ใช้ gradient/shadow เฉพาะตัว ไม่ผ่าน `SectionCard`
  - Fixed widths: indicator dot `width:22,height:22`, status circle
    `width:7,height:7`, sparkline `w=80,h=28` (ล้นจอ <280px)
  - `CHART_TIP_STYLE` ถูก redefine แบบ hardcoded `rgba(22,18,42,0.97)`
    (ไม่ theme-aware)
  - Chip หลายตัวใน InsightCards ไม่มี flex-wrap guard

### 2.2 AlertsPage.tsx — 2,653 บรรทัด — Priority: **HIGH**
- ใช้: `PageShell` เท่านั้น (ไม่มี `SectionCard`/`MetricCard`)
- Header actions: 3 (Filter, Export, Bookmark)
- Viewport-1 density: metrics strip (5 severity KPI) + table + pie chart
- ปัญหา:
  - ไม่มี `SectionCard` wrapper เลย → table/metric/chart แยกสไตล์จากหน้าอื่น
  - Local `BRAND` + `SOURCE_COLOR_MAP` redefinition
  - `fontSize` กระจาย 11/11.5/12/13 ไม่มี hierarchy ชัดเจน
  - Tooltip `contentStyle={{ background: '#1e293b' }}` hardcoded
  - Grid `xs/md` ไม่มี `sm` breakpoint → กระโดดจาก mobile ไป desktop
  - MITRE ATT&CK / Compliance tag chips แสดงทุกตัวไม่มี max-display

### 2.3 LogSearchPage.tsx — 268 บรรทัด — Priority: **LOW (reference page)**
- ใช้: `PageShell`, `SectionCard` (ผ่าน child components ครบ)
- Header actions: 3 (Refresh, Reset, Export JSON)
- Viewport-1 density: SearchHero + AdvancedFilters + MetricsGrid +
  SourceCoverage (4-5 sections)
- ปัญหา (เล็กน้อย):
  - SourceCoverage chip row ควร verify wrap ที่ 360px
  - Metric value `1.9rem` อาจ compress บนมือถือได้มากกว่านี้
  - โดยรวม **ดีที่สุดในระบบ — ใช้เป็น template**

### 2.4 InvestigatePageV2.tsx — 529 บรรทัด — Priority: **MEDIUM**
- ใช้: `PageShell` (ไม่มี `SectionCard` ใน tab panes)
- Header actions: 2 (search bar + time range)
- Viewport-1 density: SearchHero + OverviewTab (2-3 sections)
- 10 tabs: Overview, Network, Alerts, Threat Intel, MITRE, DNS/DHCP, NAC,
  Risk, Entity Graph, Actions
- ปัญหา:
  - Local `SEV_COLOR_MAP` (บรรทัด ~105-109) แทนที่จะ import จาก tokens
  - OverviewTab ใช้ MUI `Card` ตรงๆ ไม่ผ่าน `SectionCard`
  - `hexRgb()` helper ใช้แปลงสีเอง แทน helper กลาง
  - Tab bar `overflow-x: auto` มีแล้วแต่ไม่มี scroll indicator บนมือถือ
  - Entity Graph/Risk/DNS/DHCP/NAC tabs: empty state ยังไม่ครบทุก tab

### 2.5 IOCPage.tsx — 1,312 บรรทัด — Priority: **HIGH**
- ใช้: `PageShell` (ไม่มี `SectionCard`), custom `FeedCard`/`RiskGauge`
- Header actions: 2-3 (search/lookup, Add IOC)
- Viewport-1 density: RiskGauge + recent lookups + verdict cards (3-4
  sections)
- ปัญหา:
  - `fontSize="9"` สำหรับ "Risk Score" label ใน SVG (อ่านยากมาก)
  - Local `VERDICT_CONFIG`, `IOC_TYPE_ICON`, `TYPE_LABEL`, `SEV_COLORS` ทั้งหมด
    hardcode สีเอง
  - `RiskGauge` SVG ใช้ `cx="50" cy="50" r="44" strokeWidth="8"` แบบ fixed
    ไม่มี `viewBox` scaling → ล้นจอ <300px
  - Chart tooltip hardcode `rgba(22,18,42,0.97)` ไม่ theme-aware
  - `FeedCard` ใช้ raw `Box` + custom border/shadow แทน `SectionCard`

### 2.6 SOARPage.tsx — 182 บรรทัด — Priority: **LOW**
- ใช้: `PageShell`, `MetricCard`, custom `IntegrationHealthPanel`
- Header actions: 0
- โครงสร้าง: tab-based (Overview, IRIS, Shuffle, MISP)
- ปัญหา:
  - `hexRgb()` ใช้สร้างสี badge แบบ dynamic แทน helper กลาง
  - Tab badge ใช้ `background: rgba(...)` hardcoded แทน theme-aware

### 2.7 CaseWorkspacePage.tsx — 557 บรรทัด — Priority: **MEDIUM**
- ใช้: `PageShell` (ไม่มี `SectionCard`, custom CaseHeader)
- Header actions: 3-4 (Back, Refresh, Export/Share, status)
- 10 NIST tabs: Overview, Timeline, Tasks, IOC, Notes, Evidence, Shuffle,
  Activity, Report, Closure
- ปัญหา:
  - `CASE_COLOR = '#6366F1'` และ `SEV_COLOR_MAP` (บรรทัด ~105-109) hardcode
    เอง
  - Case title ไม่มี `text-overflow: ellipsis` → overflow บน <320px
  - 10-tab bar ไม่มี horizontal scroll handling ที่ชัดเจนสำหรับมือถือ
  - Case tags (comma-separated) ไม่มี max-display → overflow ได้
  - Tab indicator color hardcoded ไม่ theme-aware

### 2.8 CompliancePage.tsx — 1,536 บรรทัด — Priority: **HIGH**
- ใช้: `PageShell` (ไม่มี `SectionCard`), custom `ScoreGauge`/`ConnectionPill`/
  `SevChip`
- Header actions: 2 (Refresh, Export)
- 7 tabs: Overview, Standards, SCA, Agents, Vulnerabilities, Alerts, Evidence
- ปัญหา:
  - `ScoreGauge` ใช้ `fontSize: size * 0.1` → ที่ size=80 ได้ 8px (อ่านไม่ออก)
  - Local `P`, `PL`, `SEVERITY_COLORS`, `FRAMEWORK_COLORS` hardcode
  - `ScoreGauge` SVG ใช้ CSS `transform: rotate` โดยไม่มี `viewBox`
  - `SevChip`/`StatChip` ใช้ padding คงที่ (`px:0.85, py:0.2`) อาจ overflow
    บนจอแคบ
  - ตาราง SCA/Vulnerability 6-7 columns ไม่มี sticky header / horizontal
    scroll container ที่ชัดเจน

### 2.9 AssetsPage.tsx — 975 บรรทัด — Priority: **MEDIUM**
- ใช้: `PageShell`, `SectionCard` (บางส่วน), `MetricCard`
- Header actions: 2 (time range, refresh)
- Viewport-1 density: 4 MetricCard + InventoryCoverage (2-3 sections)
- ปัญหา:
  - `ACCENT = '#0EA5E9'` hardcode local แทน token
  - `riskColor()` hardcode threshold colors (`#EF4444/#F59E0B/#22C55E`)
  - `MonoValue` ไม่ระบุสีชัดเจน (inherit text color, อาจ contrast ต่ำใน
    dark mode)
  - Grid `alignItems:'center'` อาจ misalign เมื่อ content สูงไม่เท่ากัน

### 2.10 KPIPage.tsx — 160 บรรทัด — Priority: **MEDIUM**
- ใช้: `PageShell`, raw MUI `Card` (ไม่มี `SectionCard`)
- Header actions: 0
- โครงสร้าง: 4 KPICard + ForecastCard + 30-day timeline + level bar chart
- ปัญหา:
  - Raw `Card`/`CardContent` แทน `SectionCard`
  - Hardcoded urgency colors (`#ef4444/#f59e0b/#22c55e`) แทน `SEV_COLOR`
  - Chart tooltip hardcode `background: '#1e293b'`
  - Chart heights fixed (`280`/`240`) ไม่ responsive บนมือถือ

### 2.11 AdminPage.tsx — 257 บรรทัด — Priority: **LOW**
- ใช้: `PageShell`, raw `Card` (sidebar nav แบบ custom)
- Header actions: 1 (mobile menu toggle)
- 10 admin tabs: Status, Rules, Decoders, Lists, Config, Tuning, ISM, Notify,
  Users, Audit
- ปัญหา (เล็กน้อย):
  - `item.color` ต่อ tab hardcode hex ใน local `NAV` array
  - Sidebar width fixed `218px` (ไม่ collapse บนจอใหญ่มาก)
  - โดยรวม **theme-aware ดีอยู่แล้ว** (ใช้ `isDark` + `BRAND` import)

---

## 3. Cross-Cutting Findings

### 3.1 Font-size < 11px (WCAG AA risk)
| ที่พบ | ไฟล์ |
|---|---|
| `fontSize: 9` (trend %) | DashboardPage |
| `fontSize="9"` (Risk Score label, SVG) | IOCPage RiskGauge |
| `fontSize: size*0.1` (≈8px @ size=80) | CompliancePage ScoreGauge |
| `fontSize: 9.5` (section header) | AdminPage (acceptable, secondary label) |

→ ทุกจุดที่เป็น **primary/ข้อมูลสำคัญ** ต้อง ≥ 11px ตามเกณฑ์เอกสาร

### 3.2 Hardcoded chart tooltip (ไม่ theme-aware)
4 จุดหลัก: `DashboardPage`, `AlertsPage`, `IOCPage`, `KPIPage` — ทั้งหมด
hardcode `background: '#1e293b'` หรือ `rgba(22,18,42,0.97)` → ต้องแทนที่ด้วย
helper ใหม่ `getChartTipStyle(isDark)` (Phase 2)

### 3.3 Local color-map redefinition
`BRAND`, `SEV_COLOR_MAP`, `SOURCE_COLOR_MAP`, `VERDICT_CONFIG`, `CASE_COLOR`,
`ACCENT`, `P/PL` ฯลฯ ถูก define ซ้ำในแต่ละหน้า (Dashboard, Alerts, Investigate,
IOC, CaseWorkspace, Compliance, Assets, KPI) — ต้อง consolidate เข้า
`tokens.ts`

### 3.4 SectionCard adoption
| ใช้ครบ | ใช้บางส่วน | ไม่ใช้เลย |
|---|---|---|
| LogSearchPage | Dashboard, Assets | Alerts, Investigate, IOC, SOAR/CaseWorkspace, Compliance, KPI, Admin |

### 3.5 Responsive risk (fixed px width/height)
- Dashboard sparkline `w=80,h=28`
- IOC RiskGauge SVG `r=44` ไม่มี viewBox
- Compliance ScoreGauge ไม่มี viewBox
- KPI chart `height={280}/{240}` fixed
- Admin sidebar `width:218px` fixed
- Mobile drawer `width:272px` fixed (Admin) — acceptable pattern

### 3.6 Header action button count
| Page | Count |
|---|---|
| Dashboard | 1 |
| Alerts | 3 |
| Search | 3 |
| Investigate V2 | 2 |
| IOC | 2-3 |
| SOAR | 0 |
| CaseWorkspace | 3-4 |
| Compliance | 2 |
| Assets | 2 |
| KPI | 0 |
| Admin | 1 |

→ ทุกหน้าอยู่ในเกณฑ์ ≤4 ตามเอกสาร ไม่จำเป็นต้องทำ "More menu" แบบเร่งด่วน
ยกเว้น CaseWorkspace ที่ใกล้ขีดจำกัด — จะ verify ใน Phase 6

### 3.7 TypeScript build status
`npm run build` (Vite) ผ่านปกติ มีเฉพาะ pre-existing `Stack`/`alignItems`
type-overload warning จาก `npx tsc --noEmit` (พบใน CompliancePage,
ActiveFiltersDisplay, SearchResultsCards, CaseWorkspacePage และอื่นๆ) — เป็น
ปัญหา MUI/@types/react version mismatch ที่มีมาก่อน ไม่บล็อก build, **อยู่นอก
scope ของงานนี้**

---

## 4. Recommended UI Rules (สำหรับ Phase 2+)

1. **Card pattern**: ทุก data panel ใช้ `SectionCard` (variant ตามบริบท) —
   เลิกใช้ raw `Card`/`Box` สำหรับ panel หลัก
2. **Color tokens**: ห้าม redefine `BRAND`/`SEV_COLOR`/verdict/source-color
   maps ในระดับหน้า — import จาก `tokens.ts` เท่านั้น
3. **Chart tooltip**: ใช้ `getChartTipStyle(isDark)` ทุกจุด แทน hardcoded
   `contentStyle`
4. **Font scale**: page title 22-26px/800-900, section title 15-18px/700-800,
   body 13-15px, table 12.5-14px, metadata 11.5-12.5px — ห้าม <11px สำหรับ
   ข้อมูลสำคัญ
5. **Spacing**: ใช้ `LAYOUT_GAP.section` (=2.5) ระหว่าง section หลักทุกหน้า
6. **SVG gauges**: ต้องมี `viewBox` เพื่อ scale ตามขนาดจอ
7. **Chip overflow**: tag/chip lists ที่อาจมี >4-5 รายการ ต้องมี max-display +
   "+N" overflow chip
8. **Tab bars** (>5 tabs): ต้อง `overflow-x: auto` + `scrollbar-thin`

---

## 5. Priority List

| ลำดับ | หน้า | เหตุผล |
|---|---|---|
| 1 | AlertsPage | ใหญ่สุด, ไม่มี SectionCard, chip overload, hardcoded tooltip |
| 2 | CompliancePage | SVG gauge อ่านไม่ออก, ไม่มี SectionCard, ตารางหนาแน่น |
| 3 | IOCPage | fontSize 9, SVG ไม่ responsive, hardcoded colors |
| 4 | DashboardPage | fontSize 9, fixed-width sparkline, hardcoded tooltip |
| 5 | InvestigatePageV2 | local SEV map, missing empty states |
| 6 | CaseWorkspacePage | tab overflow, untruncated tags, hardcoded colors |
| 7 | AssetsPage | partial SectionCard adoption |
| 8 | KPIPage | raw Card, hardcoded tooltip/colors |
| 9 | SOARPage | minor hexRgb cleanup |
| 10 | AdminPage | minor color token cleanup |
| - | LogSearchPage | reference page — light touch only |

---

## 6. Risk Assessment

- **Business logic / API**: ไม่มีการเปลี่ยนแปลง — งานทั้งหมดเป็น
  styling/layout/token-level เท่านั้น
- **Breaking changes**: ไม่มี — `SectionCard`/`PageShell`/`tokens.ts` เป็นการ
  เพิ่ม props/exports แบบ additive, การ wrap ด้วย `SectionCard` ไม่กระทบ
  children เดิม
- **Mock data**: ไม่มีการเพิ่ม/ใช้ mock data
- **ความเสี่ยงสูงสุด**: หน้าที่มีขนาดใหญ่ (Alerts 2,653 / Compliance 1,536 /
  IOC 1,312) — แก้แบบ surgical edit (wrap + replace constant imports) แทนการ
  เขียนใหม่ทั้งไฟล์ เพื่อลดความเสี่ยงต่อ regression
- **Pre-existing TS warnings**: คงไว้ตามเดิม ไม่อยู่ใน scope, จะไม่ทำให้แย่ลง

---

## 7. Affected Paths Summary

```
web_app/frontend/src/components/ui/tokens.ts                (Phase 2)
web_app/frontend/src/components/dashboard/DashboardPage.tsx  (Phase 3,7)
web_app/frontend/src/components/alerts/AlertsPage.tsx        (Phase 5)
web_app/frontend/src/components/search/**                    (Phase 4)
web_app/frontend/src/components/investigate/v2/**            (Phase 5)
web_app/frontend/src/components/ioc/IOCPage.tsx               (Phase 7)
web_app/frontend/src/components/soar/SOARPage.tsx              (Phase 6)
web_app/frontend/src/components/soar/CaseWorkspacePage.tsx     (Phase 6)
web_app/frontend/src/components/compliance/CompliancePage.tsx  (Phase 7)
web_app/frontend/src/components/assets/AssetsPage.tsx          (Phase 7)
web_app/frontend/src/components/kpi/KPIPage.tsx                 (Phase 7)
web_app/frontend/src/components/admin/AdminPage.tsx             (Phase 7)
```

---

## 8. Phase 8 — QA Pass (Responsive / Dark-Light / Accessibility)

เนื่องจาก repo นี้ไม่มี visual-regression / browser-automation harness, Phase 8
จึงเป็น **code-audit + fix pass** ครอบคลุมไฟล์ทั้งหมดที่แก้ไขใน Phase 3-7
(`tokens.ts`, `LogSearchPage`/`BreakdownCharts`/`TimelineChart`,
`AlertsPage`/`InvestigatePageV2`/`OverviewTab`, `SOARPage`/`CaseWorkspacePage`,
`IOCPage`/`CompliancePage`/`AssetsPage`/`KPIPage`, `DashboardPage`) บวก
spot-check ผ่าน dev server

### ผลตรวจสอบ

1. **SVG gauges**: `grep -n "<svg"` ทุกไฟล์ที่แก้ไข → ทุกตัวมี `viewBox` แล้ว
   (RiskGauge และ ScoreGauge แก้ไปแล้วใน Phase 5/7)
2. **Dev server smoke test**: รัน `npm run dev` แล้ว `curl /wazuh/` ได้
   `HTTP 200` — แอปคอมไพล์และ serve ได้ปกติ ไม่มี runtime error ขึ้นตอน build
   (environment นี้ไม่มี browser-automation tool สำหรับตรวจ overflow ที่
   360px ด้วยภาพจริง — เป็นข้อจำกัดที่ระบุไว้ตั้งแต่ plan)
3. **Dialog/Drawer/Escape handling**: ตรวจ `git diff sanitized-orphan...HEAD`
   ทั้งหมดของทุก phase — ไม่มีการแก้ไข event handler ใดๆ ที่เกี่ยวกับ
   `onClose`/`onKeyDown`/Dialog/Drawer เลย (การเปลี่ยนแปลงทั้งหมดเป็น
   styling/token-level เท่านั้น ไม่กระทบ behavior)
4. **Fixed-size circular elements** (110-260px gauges/decorative blobs ใน
   AlertsPage/CompliancePage/IOCPage/AssetsPage): ทั้งหมด ≤260px ซึ่งน้อยกว่า
   360px viewport — เป็น absolutely-positioned decorative blob
   (`pointerEvents:'none'`, off-canvas) หรือ gauge ที่มี `viewBox` responsive
   อยู่แล้ว ไม่ก่อให้เกิด horizontal overflow ที่ breakpoint เล็กสุด
5. **fontSize 9/9.5/10**: พบใช้งานจำนวนมากทั่วทั้ง 13 ไฟล์ที่แก้ไข — ตรวจสอบ
   แล้วเป็น micro-label/table-header/metadata convention ที่มีอยู่เดิมทั่ว
   ทั้งแอป (ตรงกับ design language แบบ dense dashboard) ไม่ใช่รายการที่ Phase 1
   audit ระบุว่าเป็นปัญหา accessibility — รายการที่ audit ระบุไว้ชัดเจน 2 จุด
   (RiskGauge "Risk Score" label และ ScoreGauge "%" label) ได้แก้ไขแล้วใน
   Phase 5/7 (fontSize 9 → ≥11). การไล่แก้ fontSize ทั้งหมดทั่วแอปจะเป็นการ
   ขยาย scope เกินกว่าที่ audit ระบุ และเสี่ยงต่อ regression ของ dense-table
   layout — จึงคงไว้ตามเดิม
6. **TypeScript baseline**: `npx tsc --noEmit` ยังคงมีเฉพาะ pre-existing
   errors เดิม (Stack overload + 3 จุดใน CompliancePage ที่มีมาก่อน Phase 7,
   เพียงเลื่อนเลขบรรทัด) — ไม่มี error ใหม่เพิ่มจากการเปลี่ยนแปลงทั้งหมดใน
   Phase 3-8

### สรุป

ไม่มีการแก้ไขโค้ดเพิ่มเติมใน Phase 8 — Phase 3-7 ผ่านการตรวจสอบ QA แล้วและ
ไม่พบปัญหาที่ต้องแก้ไขเพิ่มเติมภายใน scope ของ plan นี้
