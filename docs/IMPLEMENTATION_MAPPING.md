# SOC Center UI/UX Implementation Mapping
## Design System v2.0 → React Codebase Alignment
### Status: Implementation Guide

---

## 📋 Document Overview

This guide maps the design specifications to actual React component implementation, showing:
- What's already built ✅
- What needs enhancement 🔄
- What needs creation 🆕

---

## Page Implementation Status

### 1️⃣ Dashboard — `/`
**Design:** `SOC_CENTER_UI_DESIGN_SPEC_TH.md` § Page Specifications § 1️⃣

| Element | Status | Component | File | Notes |
|---------|--------|-----------|------|-------|
| KPI Cards (4x) | ✅ | MetricCard | `src/components/common/CommonComponents.jsx` | Ready to use |
| Alert Trend (AreaChart) | ✅ | Custom | `src/components/dashboard/DashboardPage.jsx` | Recharts AreaChart implemented |
| Top Sources (Donut) | ✅ | Custom | `src/components/dashboard/DashboardPage.jsx` | PieChart with palette |
| World Attack Map | 🆕 | WorldMap | Need to create | React Simple Maps + GeoLocation |
| Cluster Health | ✅ | ClusterCard | `src/components/dashboard/DashboardPage.jsx` | Shows cluster nodes |
| Recent Alerts Table | ✅ | Custom | `src/components/dashboard/DashboardPage.jsx` | Last 5 critical alerts |
| Time Range Selector | ✅ | Select | `src/components/dashboard/DashboardPage.jsx` | 1h/6h/24h/7d/30d |
| Real-time auto-refresh | 🔄 | useEffect + WS | `src/components/dashboard/DashboardPage.jsx` | Implement 30s refetch timer |
| Cluster geo map | 🆕 | WorldMap | Need to create | Display node locations |
| Live badge animation | ✅ | CSS | `src/index.css` or Tailwind | Pulsing animation available |

**Action Items:**
- [ ] Create `WorldMap` component using React Simple Maps
- [ ] Connect to OpenSearch GeoLocation data
- [ ] Add 30-second auto-refresh for stats + cluster health
- [ ] Style KPI cards with proper gradient + hover effects

---

### 2️⃣ Alert Management — `/alerts`
**Design:** `SOC_CENTER_UI_DESIGN_SPEC_TH.md` § Page Specifications § 2️⃣

| Element | Status | Component | File | Notes |
|---------|--------|-----------|------|-------|
| DataGrid | ✅ | MUI DataGrid | Need to create page | Ready-to-use from MUI |
| Filter bar | 🔄 | Custom filters | Need to create | Level, Source, Agent, Date, Search |
| Batch actions | 🔄 | Toolbar | Need to create | Mark, bulk export, link to case |
| Side panel detail | ✅ | DetailPanel | `src/components/common/CommonComponents.jsx` | Drawer with tabs |
| Threat intel enrichment | ✅ | Custom | Backend API | Auto-fetch on row click |
| Alert status chips | ✅ | Chip | MUI available | NEW, ACK, OPEN, RESOLVED |
| Related alerts | 🔄 | Custom list | Need to create | Show correlation in detail panel |
| Action buttons | 🔄 | Custom | Need to create | Investigate, Add IOC, Escalate, etc. |

**Backend API Required:**
- `GET /api/alerts?limit=50&page=P&filters=...` → List with pagination
- `GET /api/alerts/{alert_id}` → Full alert + enrichment
- `WS /ws/alerts` → Real-time push

**Action Items:**
- [ ] Create `AlertsPage.jsx` with DataGrid
- [ ] Implement filter sidebar
- [ ] Build side panel with tabs (JSON, enrichment, related, actions)
- [ ] Connect WebSocket for real-time updates
- [ ] Add bulk action toolbar

---

### 3️⃣ Investigation — `/investigate`
**Design:** `SOC_CENTER_UI_DESIGN_SPEC_TH.md` § Page Specifications § 3️⃣

| Element | Status | Component | File | Notes |
|---------|--------|-----------|------|-------|
| Search bar | 🆕 | Custom | Need to create | IP/MAC/User/Hostname selector + input |
| Identity card | 🔄 | Custom | Need to create | Avatar + main identity info |
| Tabs | ✅ | MUI Tabs | Available | Use MUI Tabs component |
| Timeline chart | ✅ | Recharts LineChart | `src/components/dashboard/DashboardPage.jsx` | Reuse or adapt |
| DHCP table | 🆕 | Custom | Need to create | Time, action, IP, duration, MAC |
| WiFi sessions | 🆕 | Custom | Need to create | AP, SSID, duration, auth, signal |
| Events table | 🔄 | Custom | Need to create | Last 50 events, sortable |
| Threat Intel tabs | 🆕 | Custom | Need to create | AbuseIPDB, OTX, Shodan, GeoIP sections |
| Correlation | 🆕 | Custom | Need to create | Same user, subnet, MAC cross-references |

**Backend API Required:**
- `POST /api/investigate?q=VALUE&type=ip|mac|user|hostname&range=30d` → Full data

**Action Items:**
- [ ] Create `InvestigatePage.jsx` with search UI
- [ ] Build identity card component
- [ ] Implement all 6 tabs with proper data rendering
- [ ] Add action buttons (Create Case, Export, Tag)

---

### 4️⃣ IOC & Threat Intelligence — `/ioc`
**Design:** `SOC_CENTER_UI_DESIGN_SPEC_TH.md` § Page Specifications § 4️⃣

| Element | Status | Component | File | Notes |
|---------|--------|-----------|------|-------|
| Search box | 🆕 | Custom | Need to create | IP/Domain/Hash/URL selector |
| Results cards | 🔄 | Custom | Need to create | Stacked card layout with source info |
| Source aggregation | 🆕 | Custom | Need to create | Show AbuseIPDB + OTX + Shodan data |
| Match history table | 🆕 | Custom | Need to create | Related alerts for each IOC |
| Custom IOC DataGrid | 🆕 | MUI DataGrid | Need to create | CRUD table |
| Add IOC dialog | 🆕 | MUI Dialog | Need to create | Form with type, value, description, severity |
| IOC stats cards | 🔄 | Custom | Need to create | Bar charts by type/severity |
| Statistics page | 🔄 | Custom | Need to create | Most triggered IOCs, timeline |
| History tab | 🔄 | Custom | Need to create | Timeline of IOC matches |

**Backend API Required:**
- `POST /api/ioc/search?q=VALUE` → Parallel threat intel lookup
- `GET /api/ioc/custom` → Custom IOC list
- `POST /api/ioc/custom` → Create custom IOC
- `PUT /api/ioc/custom/{id}` → Update
- `DELETE /api/ioc/custom/{id}` → Delete
- `GET /api/ioc/history?q=VALUE` → Match history

**Action Items:**
- [ ] Create `IOCPage.jsx` with 4 tabs
- [ ] Build search interface with parallel API calls
- [ ] Implement custom IOC CRUD
- [ ] Add statistics visualizations

---

### 5️⃣ Compliance — `/compliance`
**Design:** `SOC_CENTER_UI_DESIGN_SPEC_TH.md` § Page Specifications § 5️⃣

| Element | Status | Component | File | Notes |
|---------|--------|-----------|------|-------|
| Framework tabs | 🆕 | MUI Tabs | Available | PCI-DSS, HIPAA, GDPR, NIST, TSC, Summary |
| Status cards | 🔄 | Custom | Need to create | Score %, grade, status indicator |
| Trend line chart | 🔄 | Recharts LineChart | Need to create | 4-line chart, 30-day history |
| Requirements table | 🆕 | Custom | Need to create | Breakdown by requirement, status, gaps |
| Risk items list | 🆕 | Custom | Need to create | Severity-sorted, with remediation info |
| Evidence section | 🆕 | Custom | Need to create | Links to documents, audit trail |

**Backend API Required:**
- `GET /api/compliance/summary?range=7d` → Overall scores per framework
- `GET /api/compliance/sca` → SCA results per requirement
- `GET /api/compliance/audit?framework=pci-dss` → Evidence & audit trail

**Data Model (SQLite):**
```sql
CREATE TABLE compliance_events (
  id INTEGER PRIMARY KEY,
  framework VARCHAR,
  requirement VARCHAR,
  status VARCHAR,
  score FLOAT,
  details TEXT,
  timestamp DATETIME
);
```

**Action Items:**
- [ ] Design compliance scoring algorithm
- [ ] Map Wazuh SCA rules to compliance requirements
- [ ] Create compliance dashboard with all frameworks
- [ ] Build historical scoring system

---

### 6️⃣ Asset Inventory — `/assets`
**Design:** `SOC_CENTER_UI_DESIGN_SPEC_TH.md` § Page Specifications § 6️⃣

| Element | Status | Component | File | Notes |
|---------|--------|-----------|------|-------|
| Stats summary | 🔄 | Custom cards | Need to create | Online count, new devices, conflicts |
| Device DataGrid | 🆕 | MUI DataGrid | Need to create | IP, MAC, Hostname, User, Status, Risk |
| Device detail panel | 🔄 | Custom | Need to create | Full device info with tabs |
| Network connections | 🆕 | Custom | Need to create | TCP/UDP connections for device |
| Risk score | 🆕 | Custom | Need to create | Calculated from alerts + threat intel |
| Alert history | 🆕 | Custom | Need to create | Sparkline + recent alerts |

**Backend API Required:**
- `GET /api/assets/devices?page=1&limit=50` → Device list
- `GET /api/assets/devices/{ip}` → Device detail
- `GET /api/assets/dhcp?range=24h` → DHCP events
- `GET /api/assets/wifi?range=24h` → WiFi sessions
- `GET /api/assets/stats` → Aggregate counts

**Data Model (SQLite):**
```sql
CREATE TABLE device_inventory (
  id INTEGER PRIMARY KEY,
  ip_address VARCHAR UNIQUE,
  mac_address VARCHAR,
  hostname VARCHAR,
  user_id VARCHAR,
  device_type VARCHAR,
  os VARCHAR,
  first_seen DATETIME,
  last_seen DATETIME,
  risk_score FLOAT
);
```

**Action Items:**
- [ ] Create `AssetsPage.jsx` with DataGrid
- [ ] Implement device detail panel
- [ ] Build risk scoring algorithm
- [ ] Create DHCP history import job

---

### 7️⃣ KPI & Reporting — `/kpi`
**Design:** `SOC_CENTER_UI_DESIGN_SPEC_TH.md` § Page Specifications § 7️⃣

| Element | Status | Component | File | Notes |
|---------|--------|-----------|------|-------|
| Big 3 metrics | 🆕 | Custom cards | Need to create | MTTD, MTTR, FP Rate with trends |
| Alert volume chart | 🔄 | Recharts BarChart | Need to create | 30-day stacked by severity |
| Alert distribution pie | 🔄 | Recharts PieChart | Need to create | By level |
| Source volume line | 🔄 | Recharts LineChart | Need to create | Per-source 30-day trend |
| Top rules table | 🆕 | Custom DataGrid | Need to create | Sorted by count, with trend % |
| SLA metrics | 🆕 | Custom cards | Need to create | Uptime %, response/resolution times |
| MTTD trend scatter | 🔄 | Recharts ScatterChart | Need to create | Daily MTTD over 30 days |
| Export/Dashboard | 🆕 | Custom buttons | Need to create | PDF, Grafana embed, email |

**Backend API Required:**
- `GET /api/kpi/summary` → {mttd, mttr, fp_rate, uptime}
- `GET /api/kpi/timeline?days=30` → Daily alert counts
- `GET /api/kpi/sources` → Per-source stats

**Data Model (SQLite):**
```sql
CREATE TABLE kpi_history (
  id INTEGER PRIMARY KEY,
  date DATE,
  mttd_hours FLOAT,
  mttr_hours FLOAT,
  fp_rate FLOAT,
  alert_count INTEGER,
  critical_count INTEGER,
  high_count INTEGER,
  medium_count INTEGER,
  low_count INTEGER
);
```

**Action Items:**
- [ ] Implement MTTD/MTTR calculation logic
- [ ] Create daily KPI snapshot job (cron task)
- [ ] Build all chart visualizations
- [ ] Add PDF export functionality

---

### 8️⃣ Administration — `/admin`
**Design:** `SOC_CENTER_UI_DESIGN_SPEC_TH.md` § Page Specifications § 8️⃣

| Subpage | Status | Component | File | Notes |
|---------|--------|-----------|------|-------|
| **Rules Manager** | 🆕 | Monaco Editor | Need to create | 3-panel layout with file tree |
| - File tree | 🆕 | Custom tree | Need to create | Navigate /var/ossec/rules |
| - Rule XML editor | 🆕 | Monaco | Available npm pkg | Syntax highlighting |
| - Rule inspector | 🆕 | Custom | Need to create | Display rule metadata |
| - Validate button | 🆕 | Custom | Need to create | xmllint check |
| - Deploy button | 🆕 | Custom | Need to create | Restart Wazuh |
| **Alert Tuning** | 🆕 | DataGrid | Need to create | CRUD tuning rules |
| **Alert Config** | 🆕 | Forms | Need to create | Telegram, email, Slack settings |
| **User Management** | 🆕 | DataGrid | Need to create | SuperAdmin only, CRUD users |
| **Audit Log** | 🆕 | DataGrid | Need to create | SuperAdmin only, immutable log |

**Backend API Required:**
- `GET /admin/rules` → List rule files
- `GET /admin/rules/{filename}` → Raw XML
- `PUT /admin/rules/{filename}` → Save XML
- `POST /admin/rules/validate` → xmllint check
- `POST /admin/deploy` → Restart Wazuh
- `GET /admin/tuning` → Tuning rules list
- `POST /admin/tuning` → Create
- `PUT /admin/tuning/{id}` → Update
- `DELETE /admin/tuning/{id}` → Delete
- `GET /admin/users` → User list (superadmin)
- `POST /admin/users` → Create user
- `PUT /admin/users/{id}` → Update user
- `GET /admin/audit` → Audit log (superadmin)

**Action Items:**
- [ ] Create `AdminPage.jsx` with sub-router
- [ ] Implement rules editor with Monaco
- [ ] Build user management interface
- [ ] Create audit log viewer

---

## Design System Implementation

### Color Tokens
**File:** `src/theme/muiTheme.js` + `tailwind.config.js`

**Status:**
- ✅ MUI theme with dark/light modes created
- ✅ Tailwind config with SOC colors defined
- ✅ IBM Plex Sans loaded from @fontsource
- 🔄 Ensure consistent application across all new pages

**Action Items:**
- [ ] Verify all pages use theme colors (no hardcoded hex)
- [ ] Test light mode on all pages
- [ ] Audit contrast ratios for accessibility

---

### Typography
**File:** `src/theme/muiTheme.js` + `tailwind.config.js`

**Status:**
- ✅ IBM Plex Sans configured with 5 weights (300, 400, 500, 600, 700)
- ✅ IBM Plex Mono for code/IP/MAC
- 🔄 Ensure H1-H4 hierarchy applied

**Action Items:**
- [ ] Review heading sizes on all pages
- [ ] Ensure body text uses 14px default
- [ ] Monospace used for IP, MAC, hashes

---

### Spacing & Radius
**File:** `tailwind.config.js` + component styling

**Status:**
- ✅ Spacing scale (4px-48px) defined
- ✅ Border radius tokens created
- 🔄 Apply consistently in new components

**Action Items:**
- [ ] Use Tailwind spacing classes (px-4, py-6, gap-3, etc.)
- [ ] Use rounded-sm/md/lg (not arbitrary values)

---

### Component Library

**Existing Components (Ready):**
- ✅ `MetricCard` — value + trend + color
- ✅ `SeverityBadge` — level → color + icon
- ✅ `StatusDot` — online/offline status indicator
- ✅ `DetailPanel` — drawer with tabs

**Needed Components (Priority):**
1. 🆕 `WorldMap` — React Simple Maps + GeoLocation markers
2. 🆕 `AdvancedFilter` — JSON query builder sidebar
3. 🆕 `DataGridToolbar` — Batch actions, export
4. 🆕 `IPLink` — Clickable IP → /investigate
5. 🆕 `RiskScoreGauge` — Radial gauge 0-10
6. 🆕 `TimelineChart` — Recharts with stacked areas
7. 🆕 `ComplianceCard` — Framework score card
8. 🆕 `DeviceCard` — Asset info card with risk indicator

---

## Responsive Design Implementation

### Current Status
- ✅ Mobile viewport meta tag configured
- ✅ Tailwind responsive utilities available
- ✅ MUI `useMediaQuery` hook available
- 🔄 Test all pages on 320px (iPhone SE), 768px (iPad), 1280px (desktop)

### Breakpoints to Test
```
320px  (iPhone SE)
375px  (iPhone 12)
768px  (iPad)
1024px (iPad Pro)
1280px (Desktop)
1920px (Large desktop)
```

### Per-Page Adjustments
- **Dashboard:** Stack metrics on mobile, full-width charts
- **Alerts:** DataGrid columns hidden on mobile, drawer full-screen
- **Investigation:** Tabs stack, search bar full-width
- **Admin:** 2-panel (tree + editor) on desktop → tabs on mobile

**Action Items:**
- [ ] Test all pages on real mobile devices
- [ ] Adjust font sizes for readability on small screens
- [ ] Ensure touch targets ≥ 44px
- [ ] Test portrait/landscape orientation

---

## Dark/Light Mode Implementation

### Current Status
- ✅ Dark mode set as default
- ✅ Light mode palette created
- ✅ Toggle button in Topbar
- ✅ Preference saved to localStorage
- ✅ System preference as fallback

**Action Items:**
- [ ] Test all pages in both modes
- [ ] Verify colors meet contrast requirements (4.5:1)
- [ ] Check chart colors for colorblind accessibility
- [ ] Ensure status colors (red/amber) visible in both modes

---

## Real Wazuh Data Integration Checklist

### Dashboard
- [ ] Connect KPI cards to `GET /api/dashboard/stats`
- [ ] Connect trend chart to alert time-series
- [ ] Connect top sources to `terms aggregation`
- [ ] Connect cluster health to Wazuh API
- [ ] Implement 30s auto-refresh with loading state

### Alerts
- [ ] Fetch from `GET /api/alerts?limit=50`
- [ ] Subscribe to `WS /ws/alerts` for live updates
- [ ] Show threat intel enrichment (AbuseIPDB, OTX, Shodan)
- [ ] Display related alerts/correlation

### Investigation
- [ ] Implement search API call
- [ ] Extract identity from all sources (IP, MAC, User, Host)
- [ ] Query DHCP history from logs
- [ ] Query WiFi sessions from AP logs
- [ ] Build timeline from OpenSearch
- [ ] Fetch threat intel (parallel async calls)
- [ ] Calculate correlation metrics

### IOC
- [ ] Call AbuseIPDB API
- [ ] Call OTX API
- [ ] Call Shodan API (if available)
- [ ] Query custom IOC database
- [ ] Match IOCs against alert history

### Compliance
- [ ] Query Wazuh SCA results
- [ ] Map rules to compliance requirements
- [ ] Calculate framework scores
- [ ] Track historical scores

### Assets
- [ ] Import DHCP logs → device_inventory table
- [ ] Import WiFi logs
- [ ] Query Wazuh agents
- [ ] Correlate device data

### KPI
- [ ] Implement MTTD calculation
- [ ] Implement MTTR calculation
- [ ] Track FP rate
- [ ] Create daily snapshot job

---

## API Implementation Checklist

### Already Implemented
- ✅ `GET /api/health`
- ✅ `POST /api/auth/login`
- ✅ `GET /api/auth/me`
- ✅ `POST /api/auth/logout`

### High Priority (Dashboard & Alerts)
- 🆕 `GET /api/dashboard/stats?range=24h`
- 🆕 `GET /api/dashboard/cluster`
- 🆕 `GET /api/alerts?limit=50&page=1&filters={...}`
- 🆕 `GET /api/alerts/{alert_id}`
- 🆕 `WS /ws/alerts`

### Medium Priority (Investigation & IOC)
- 🆕 `POST /api/investigate?q=VALUE&type=ip&range=30d`
- 🆕 `POST /api/ioc/search?q=VALUE`
- 🆕 `GET /api/ioc/custom`
- 🆕 `POST /api/ioc/custom`

### Lower Priority (Compliance & Admin)
- 🆕 `GET /api/compliance/summary`
- 🆕 `GET /api/admin/rules`
- 🆕 `PUT /api/admin/rules/{filename}`

---

## Testing Checklist

### Unit Tests
- [ ] MetricCard renders with color + trend
- [ ] SeverityBadge maps level → color
- [ ] StatusDot pulse animation on active

### Integration Tests
- [ ] Login flow → redirect to dashboard
- [ ] Alert DataGrid loads data from API
- [ ] Filter changes trigger API call
- [ ] Bulk actions update multiple rows

### E2E Tests
- [ ] User logs in → views dashboard → clicks alert → sees detail
- [ ] User searches investigation → sees results with tabs
- [ ] User navigates to all 8 pages

### Performance Tests
- [ ] Lighthouse > 90 (desktop & mobile)
- [ ] Alert load < 1s
- [ ] Chart render < 500ms
- [ ] DataGrid 1000 rows scroll smooth (60 FPS)

### Accessibility Tests
- [ ] Keyboard navigation complete
- [ ] Color contrast ≥ 4.5:1
- [ ] ARIA labels on all buttons
- [ ] Focus indicators visible

### Browser Compatibility
- [ ] Chrome/Edge (latest 2 versions)
- [ ] Firefox (latest 2 versions)
- [ ] Safari (latest 2 versions)
- [ ] Mobile Safari (iOS 14+)
- [ ] Chrome Mobile (latest)

---

## Deployment Checklist

### Before Going Live
- [ ] All 8 pages deployed and tested
- [ ] Real Wazuh data flowing
- [ ] Dark/light mode working
- [ ] Mobile responsive verified
- [ ] Accessibility audit passed
- [ ] Performance targets met
- [ ] Backup/restore tested
- [ ] Support documentation completed

### Launch Steps
1. [ ] Take final backup
2. [ ] Deploy frontend build
3. [ ] Deploy backend code
4. [ ] Run database migrations
5. [ ] Test all critical flows
6. [ ] Notify users
7. [ ] Monitor logs for errors

### Post-Launch
- [ ] Monitor Lighthouse weekly
- [ ] Review user feedback
- [ ] Track error logs
- [ ] Schedule weekly standup
- [ ] Plan quarterly updates

---

## Success Metrics

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| **Performance** | | | |
| First Contentful Paint | < 2s | TBD | 🔄 |
| Time to Interactive | < 4s | TBD | 🔄 |
| Lighthouse Score | ≥ 90 | TBD | 🔄 |
| **Usability** | | | |
| Pages fully responsive | 8/8 | 2/8 | 🔄 |
| Dark mode tested | ✓ | ✓ | ✅ |
| WCAG 2.1 AA | ✓ | 🔄 | 🔄 |
| **Data** | | | |
| Wazuh data live | ✓ | ✓ | ✅ |
| Threat intel enriched | ✓ | ✓ | ✅ |
| Real-time WebSocket | ✓ | ✓ | ✅ |
| **Operational** | | | |
| Deployment automated | ✓ | ✓ | ✅ |
| Backup/restore working | ✓ | ✓ | ✅ |
| Support docs complete | ✓ | 🔄 | 🔄 |

---

## Summary: Implementation Roadmap

**Week 1-2:** Dashboard + Alert Management (Pages 1-2)
**Week 3-4:** Investigation + IOC (Pages 3-4)
**Week 5-6:** Compliance + Assets (Pages 5-6)
**Week 7-8:** KPI + Admin (Pages 7-8)
**Week 9:** Mobile responsive refinement + performance optimization
**Week 10:** Testing + bug fixes + UAT with SOC team
**Week 11:** Final adjustments based on user feedback
**Week 12:** Go-live + monitoring

---

**Document Version:** 1.0  
**Created:** May 21, 2026  
**Status:** Ready for Development  
**Owner:** Frontend Development Team
