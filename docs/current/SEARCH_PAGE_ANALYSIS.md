# Log Search Page - Current State Analysis

**วันที่**: 2026-06-09  
**โปรเจค**: wazuh_ova - SOC Center  
**ส่วน**: Log Search / Network Hunt Console

---

## 1. Current Implementation Overview

### ที่ตั้ง

- **Frontend**: `/opt/code/wazuh_ova/web_app/frontend/src/components/search/LogSearchPage.tsx` (1422 lines)
- **Backend**: `/opt/code/wazuh_ova/web_app/backend/app/routers/search.py`
- **Route**: `/search`
- **Documentation**: `/opt/code/wazuh_ova/web_app/docs/SEARCH_PAGE.md`

### ทำหน้าที่ปัจจุบัน

หน้า Search ปัจจุบันเป็น **"Search & Hunt Console"** สำหรับค้นหา network traffic และ log ข้ามแหล่งข้อมูลหลายแหล่ง โดยมีคุณสมบัติ:

1. **Query-driven hunt** - ค้นหา free-text (port 22, dstport:22, src:10.0.0.1 ฯลฯ)
2. **Structured filters** - Advanced filters สำหรับ srcip, dstip, port, protocol, direction, action, agent ฯลฯ
3. **Operational pivot** - Investigate, export JSON, Wazuh port listeners inventory

---

## 2. ปัญหา / พื้นที่ปรับปรุง (Current Issues)

### Design & UX
- [ ] **ไม่สอดคล้องกับ Design System**: 
  - ใช้สี hardcoded (ไม่ใช่ tokens)
  - Spacing ไม่สม่ำเสมอ
  - Component pattern ต่างจากหน้า Dashboard, Alerts
  - ดูเหมือน "UI ที่สร้างแยกออกมา" ไม่ใช่ส่วนหนึ่งของ SOC Center

- [ ] **Dark/Light Mode**:
  - ส่วนหนึ่งใช้ theme tokens แต่บางส่วน hardcode
  - ต้องทดสอบ contrast ทั้ง 2 โหมด

- [ ] **Responsive Design**:
  - ตารางผลลัพธ์อาจ overflow บน mobile
  - Filter panel ยังไม่ได้ adjust สำหรับ mobile
  - การ์ดและ chart อาจบีบ

- [ ] **Typography**:
  - ใช้ font-size หลากหลาย ไม่สม่ำเสมอ
  - บางส่วนใช้ monospace ดีแต่บางส่วนไม่

### Functionality
- [x] **Query Parser** - รองรับ syntax ต่างๆ (port 22, dstport:22, src:IP, action:deny ฯลฯ)
- [x] **Backend Aggregation** - Top IPs, Agents, Protocols, Actions, Timeline
- [ ] **Missing Features**:
  - ไม่มี "Saved Searches" (local only)
  - ไม่มี "Search History" 
  - ไม่มี pagination detail control
  - Export ค่อนข้าง minimal (JSON เท่านั้น)
  - ไม่มี CSV export

### Performance
- [ ] Chart aggregation อาจช้าบน dataset ขนาดใหญ่
- [ ] ไม่มี debounce บน search input
- [ ] ไม่มี server-side pagination ที่เห็นได้ชัด

---

## 3. Backend API Analysis

### Endpoint: `GET /search/flow`

**Query Parameters**:
```
q                - Free query (optional)
port             - Port number
srcport, dstport - Source/Destination port
srcip, dstip     - IP addresses
proto            - Protocol (tcp/udp/icmp)
action           - Action (allow/deny/drop/block)
agent            - Agent name
source_family    - Log source (firewall|ids|ssh|dns|dhcp|nac|windows|linux|web)
direction        - Inbound/Outbound (both|src|dst)
rule_id, group   - Wazuh rule ID / group
time_range       - Time range (24h, 7d ฯลฯ)
size             - Result limit (1-1000, default 200)
```

**Response Structure**:
```json
{
  "total": 248,
  "events": [...],
  "matched_port": 22,
  "unique_srcip": 15,
  "unique_dstip": 8,
  "unique_agent": 3,
  "inbound_count": 120,
  "outbound_count": 128,
  "source_families": [{key: "firewall", count: 150}, ...],
  "by_log_source": [{key: "firewall_group", count: 80}, ...],
  "by_action": [{key: "deny", count: 100}, ...],
  "top_proto": [{key: "tcp", count: 200}, ...],
  "top_country": [{key: "TH", count: 50}, ...],
  "top_srcip": [{key: "192.168.1.100", count: 60}, ...],
  "top_dstip": [{key: "80.82.77.139", count: 45}, ...],
  "top_agent": [{key: "web-server", count: 70}, ...],
  "timeline": [{time: "2026-06-09T10:00:00Z", count: 42}, ...],
  "parsed_query": {port: 22, proto: "tcp", ...}
}
```

### Backend ที่ขาด
- [ ] CSV export endpoint (backend)
- [ ] Saved search storage (DB)
- [ ] Search history (Redis/DB)
- [ ] Aggregation caching strategy

---

## 4. Design System Information

### Colors (BRAND)
```typescript
// สีหลัก
purple:      '#7B5BA4'   // Primary
purpleLight: '#9B7DC4'   // Lighter shade
purpleDark:  '#5A3E85'   // Darker shade
orange:      '#F17422'   // Secondary / Accent
orangeLight: '#FF9642'   // Lighter orange
orangeDark:  '#D05810'   // Darker orange

// Severity
critical: '#EF4444'   // Red
high:     '#F17422'   // Orange (same as secondary)
medium:   '#EAB308'   // Yellow
low:      '#22C55E'   // Green
info:     '#38BDF8'   // Sky/Cyan
```

### Typography
```
Primary:  IBM Plex Sans Thai
Fallback: IBM Plex Sans → system-ui → sans-serif
Mono:     IBM Plex Mono (IP, Timestamp, Code)
```

### Dark Mode (theme.palette.mode === 'dark')
```typescript
background.default: '#0C0A14'
background.paper:  '#16122A'
sidebar:           '#130F22 → #0E0B18' (gradient)
divider:           rgba(123,91,164,0.15)
text.primary:      '#F1F5F9' / '#E6F5FF'
text.secondary:    '#94A3B8'
```

### Light Mode (theme.palette.mode === 'light')
```typescript
background.default: '#F5F3FF' (Purple tint)
background.paper:  '#FFFFFF'
text.primary:      '#1E293B'
text.secondary:    '#64748B'
```

---

## 5. Pages ที่ใช้เป็นอ้างอิง

### Dashboard (`/`)
- **File**: `src/components/dashboard/DashboardPage.tsx`
- **Pattern**:
  - PageShell wrapper
  - Grid layout เพื่อ responsive
  - KPI Cards กับ gradient backgrounds
  - Charts (Recharts) กับ Recharts Tooltip
  - ใช้ theme tokens อย่างสม่ำเสมอ
  - Severity colors ถูกใช้ตรงจุด

### Alerts (`/alerts`)
- **File**: `src/components/alerts/AlertsPage.tsx`
- **Pattern**:
  - Filter panel บนสุด
  - Table ผลลัพธ์ sticky header
  - Chip สำหรับ severity/status
  - Row hover effect
  - Responsive: table → cards on mobile

### Investigate (`/investigate`)
- **File**: `src/components/investigate/InvestigatePage.tsx`
- **Pattern**:
  - Search input ใหญ่ที่หน้าบน
  - Detail drawer / panel
  - Query suggestions
  - Timeline chart
  - Sidebar กับ filter

### IOC Page (`/ioc`)
- **File**: `src/components/ioc/IOCPage.tsx`
- **Pattern**:
  - Search bar + suggestions
  - Result cards
  - Detail modal / drawer

---

## 6. Current Log Search Component Structure

### ไฟล์หลัก
```
src/components/search/
├── LogSearchPage.tsx   (1422 lines - ทั้งหมด)
```

### Sub-components (inline)
- `MetricCard` - สำหรับแสดง KPI (Events, Matched Port, Unique IPs ฯลฯ)
- `CoverageCard` - สำหรับแสดง Log Source Coverage
- `TopList` - สำหรับแสดง Top 7 items พร้อม bar chart
- `DirectionPill` - สำหรับแสดง Inbound/Outbound/Lateral

### Main Sections
1. **Header & Hero** - Search bar + Time Range + Advanced Filters toggle
2. **Quick Filters** - Preset chips (SSH, RDP, SMB, DNS, Denied, ฯลฯ)
3. **Active Filters Display** - Chip list ของ filter ที่กำลังใช้
4. **Metrics Grid** - 7 metric cards
5. **Source Coverage** - Coverage cards + Wazuh Port Inventory
6. **Pivot Actions** - Buttons ไปยัง Investigate
7. **Timeline Chart** - Area chart จำนวน events ตามเวลา
8. **Action Breakdown** - Bar chart จำนวน Allow/Deny/Drop
9. **Top Lists** - 4 cards แสดง Top Source IPs, Dst IPs, Agents, Protocols
10. **Port Listeners** - Collapsible section แสดง Wazuh inventory
11. **Matched Events** - Collapsible section แสดง result table

---

## 7. ข้อมูล Data Flow

### ตัวอย่าง Query และการค้นหา

**User Input**: `port 22` + Time Range: 24h  
↓  
**Frontend**: Parse query → `/search/flow?q=port%2022&time_range=24h&size=200`  
↓  
**Backend**: Parse query string → Build OpenSearch query → Execute  
↓  
**Response**: 248 total events, 15 unique source IPs, timeline data ฯลฯ  
↓  
**Frontend**: Render metrics, charts, table

### Log Sources ที่ backend รองรับ
- Firewall logs
- IDS / Suricata
- SSH logs
- DNS logs
- DHCP logs
- NAC / RADIUS
- Windows / Sysmon
- Linux / Syslog
- Web / Reverse Proxy
- Unknown

---

## 8. Quality Assessment

### ✅ Strengths
- Query parser ที่ flexible
- Backend aggregation ที่ comprehensive
- Timeline chart ช่วยให้เห็น trend
- Port listeners inventory นี่ feature ที่ดี
- Pivot ไปยัง Investigate ได้
- Collapsible sections ประหยัด space

### ❌ Weaknesses / Missing
- Design System ยังไม่일관되 (inconsistent)
- Dark/Light mode ยังไม่ perfect
- Responsive design ยังมี gap
- ไม่มี Saved/Recent searches
- Typography size ยังไม่ standard
- Component reusability ต่ำ (ทั้งหมดใน 1 file)
- ไม่มี export CSV
- ไม่มี detailed pagination control

---

## 9. Plan untuk Perbaikan

### Phase 1: Architecture & Components
- [ ] Refactor LogSearchPage เป็น multiple component files
- [ ] Extract sub-components เป็น reusable components
- [ ] Create shared hooks (useLogSearch, useSavedSearches)
- [ ] Align ทุก component ให้ใช้ BRAND tokens

### Phase 2: Design System Alignment
- [ ] ลบ hardcoded colors → ใช้ tokens
- [ ] ปรับปรุง Typography sizes/weights
- [ ] Align spacing/padding/radius ให้ consistent
- [ ] Test Dark/Light mode ทั้ง 2 อย่างสมบูรณ์
- [ ] Create PageShell wrapper เหมือน pages อื่น

### Phase 3: UX Improvements
- [ ] เพิ่ม Saved Searches (localStorage สำหรับเริ่ม)
- [ ] เพิ่ม Search History
- [ ] ปรับปรุง Filter panel สำหรับ mobile
- [ ] Table → Cards conversion on mobile
- [ ] Enhanced Export (CSV, JSON, CSV with custom columns)

### Phase 4: Responsive & Accessibility
- [ ] ทดสอบ breakpoints: 360px, 390px, 768px, 1024px, 1280px, 1440px, 1920px
- [ ] ปรับปรุง keyboard navigation
- [ ] ARIA labels ทั้ง components
- [ ] Focus states visible

### Phase 5: Performance & Polish
- [ ] Debounce search input
- [ ] Server-side pagination handling
- [ ] Query execution time display
- [ ] Loading states ที่ชัดเจน
- [ ] Error boundaries

### Phase 6: Testing & Documentation
- [ ] Unit tests สำหรับ components
- [ ] E2E tests สำหรับ search flow
- [ ] Create LOG_SEARCH_PAGE_UI_UX.md
- [ ] Add JSDoc comments

---

## 10. Metrics & KPI การประเมิน

- **Design System Compliance**: 0% → 100%
- **Component Modularity**: 1 file → 8+ files
- **TypeScript Coverage**: Medium → High
- **Responsive Coverage**: ~60% → 100%
- **Dark/Light Mode Support**: ~70% → 100%
- **Accessibility**: ~60% → 90%+

---

## 11. Next Steps

1. **Review** findings นี้ กับ designer/team
2. **Prioritize** improvements ตาม business value
3. **Start Phase 1** - Component refactoring
4. **Parallel**: Phase 2 - Design System alignment
5. **Then**: Phase 3-5 ตามลำดับ
6. **QA**: Phase 6 - Testing & documentation

---

## Appendix: Resource Links

- **Design System**: `/opt/code/wazuh_ova/web_app/DESIGN_SYSTEM.md`
- **Tokens**: `/opt/code/wazuh_ova/web_app/frontend/src/components/ui/tokens.ts`
- **Theme**: `/opt/code/wazuh_ova/web_app/frontend/src/types/theme.ts`
- **Reference Pages**: 
  - Dashboard: `src/components/dashboard/DashboardPage.tsx`
  - Alerts: `src/components/alerts/AlertsPage.tsx`
  - Investigate: `src/components/investigate/InvestigatePage.tsx`
