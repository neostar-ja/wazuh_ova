# SOC Center — Component Architecture & Data Flow
## Visual Reference Guide for Development

---

## 🏗️ Project File Structure

```
/opt/code/wazuh_ova/web_app/
│
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   │
│   ├── index.html
│   │
│   └── src/
│       ├── main.jsx                    (Entry point)
│       ├── index.css                   (Global styles — 3 Tailwind layers)
│       ├── App.jsx                     (Router + Auth Provider)
│       │
│       ├── components/
│       │   ├── auth/
│       │   │   └── LoginPage.jsx       (Login form + JWT exchange)
│       │   │
│       │   ├── layout/
│       │   │   ├── Layout.jsx          (Main page wrapper — Sidebar + Topbar + Outlet)
│       │   │   ├── Sidebar.jsx         (Nav items, cluster status footer)
│       │   │   └── Topbar.jsx          (Logo, alert badge, theme toggle, user menu)
│       │   │
│       │   ├── common/
│       │   │   ├── CommonComponents.jsx (MetricCard, SeverityBadge, StatusDot, DetailPanel, etc.)
│       │   │   ├── LoadingSpinner.jsx
│       │   │   ├── EmptyState.jsx
│       │   │   └── ErrorBoundary.jsx
│       │   │
│       │   ├── charts/
│       │   │   ├── AlertTimeline.jsx   (Recharts AreaChart, stacked by severity)
│       │   │   ├── AlertDonut.jsx      (Recharts PieChart for sources)
│       │   │   ├── WorldMap.jsx        (React Simple Maps with GeoLocation) — NEEDED
│       │   │   ├── KPIChart.jsx        (Various chart types)
│       │   │   └── ComplianceChart.jsx (Compliance framework progress)
│       │   │
│       │   ├── pages/
│       │   │   ├── DashboardPage.jsx           (1. Dashboard)
│       │   │   ├── AlertsPage.jsx              (2. Alert Management) — NEEDED
│       │   │   ├── InvestigatePage.jsx         (3. Investigation) — NEEDED
│       │   │   ├── IOCPage.jsx                 (4. IOC & Threat Intel) — NEEDED
│       │   │   ├── CompliancePage.jsx          (5. Compliance) — NEEDED
│       │   │   ├── AssetsPage.jsx              (6. Asset Inventory) — NEEDED
│       │   │   ├── KPIPage.jsx                 (7. KPI & Reporting) — NEEDED
│       │   │   └── AdminPage.jsx               (8. Administration) — NEEDED
│       │   │       ├── RulesManager.jsx        (Admin sub-page)
│       │   │       ├── AlertTuning.jsx
│       │   │       ├── AlertConfig.jsx
│       │   │       ├── UserManagement.jsx
│       │   │       └── AuditLog.jsx
│       │   │
│       │   └── examples/
│       │       └── ExampleDashboard.jsx (Reference component)
│       │
│       ├── hooks/
│       │   ├── useAuth.js              (AuthContext + login/logout)
│       │   ├── useThemeMode.js         (Dark/light mode toggle)
│       │   └── useWazuh.js             (Custom hook for Wazuh API calls) — OPTIONAL
│       │
│       ├── services/
│       │   ├── api.js                  (Axios instance + interceptors)
│       │   ├── wazuhApi.js             (Wazuh REST API wrapper) — NEEDED
│       │   ├── opensearchApi.js        (OpenSearch query builder) — NEEDED
│       │   └── enrichment.js           (AbuseIPDB, OTX, Shodan parallel calls) — NEEDED
│       │
│       ├── store/
│       │   └── (Optional: Redux, Zustand, or Context for state management)
│       │
│       ├── utils/
│       │   ├── formatters.js           (Format functions: IP, time, severity, etc.)
│       │   ├── validators.js           (Input validation)
│       │   ├── constants.js            (App-wide constants)
│       │   └── helpers.js              (Utility functions)
│       │
│       └── theme/
│           ├── ThemeContext.jsx        (Dark/light mode provider)
│           ├── muiTheme.js             (MUI theme factory)
│           └── colors.js               (Color token definitions)
│
├── backend/
│   ├── requirements.txt
│   ├── Dockerfile
│   │
│   └── app/
│       ├── main.py                    (FastAPI app initialization)
│       │
│       ├── core/
│       │   ├── config.py              (Settings from .env)
│       │   └── security.py            (JWT + password hashing)
│       │
│       ├── models/
│       │   └── db.py                  (SQLAlchemy models + session)
│       │
│       ├── api/
│       │   ├── auth.py                (POST /auth/login, /auth/me)
│       │   ├── dashboard.py           (GET /dashboard/stats, /dashboard/cluster)
│       │   ├── alerts.py              (GET /alerts, /alerts/{id}, WS /ws/alerts)
│       │   ├── investigate.py         (POST /investigate?q=...)
│       │   ├── ioc.py                 (GET /ioc/search, /ioc/custom CRUD)
│       │   ├── compliance.py          (GET /compliance/summary, /compliance/sca)
│       │   ├── assets.py              (GET /assets/devices, /assets/dhcp)
│       │   ├── kpi.py                 (GET /kpi/summary, /kpi/timeline)
│       │   └── admin.py               (Rules, tuning, users, audit)
│       │
│       ├── services/
│       │   ├── opensearch_svc.py      (OpenSearch queries)
│       │   ├── wazuh_svc.py           (Wazuh API wrapper)
│       │   ├── enrichment_svc.py      (Threat intel calls)
│       │   └── compliance_svc.py      (Compliance calculations)
│       │
│       └── scripts/
│           ├── init_db.py             (Database initialization)
│           └── import_dhcp.py         (DHCP log importer)
│
├── nginx/
│   ├── Dockerfile
│   └── nginx.conf                      (TLS proxy config)
│
├── docker/
│   └── docker-compose.yml              (Multi-container orchestration)
│
├── docs/
│   ├── SOC_CENTER_UI_DESIGN_SPEC_TH.md    (This design spec)
│   ├── IMPLEMENTATION_MAPPING.md           (Dev checklist)
│   ├── DEPLOYMENT_REPORT_TH.md            (Thai deployment report)
│   └── (Other documentation)
│
├── .env                                 (Runtime config)
└── deploy.sh                            (Deployment script)
```

---

## 🔄 Data Flow Architecture

### 1️⃣ Dashboard Data Flow

```
User Opens Dashboard
    ↓
App.jsx → DashboardPage.jsx
    ↓
useQuery hooks initialize:
├─ Query 1: GET /api/dashboard/stats?range=24h
│  └─ Response: {critical: 3, high: 47, medium: 312, low: 2156, sources: {...}, timeline: [...]}
│     ├─ MetricCard components render (KPI)
│     └─ Chart components update (trend, sources)
│
├─ Query 2: GET /api/dashboard/cluster
│  └─ Response: {nodes: [{name, status, type}, ...]}
│     └─ ClusterCard component renders
│
└─ Query 3: WebSocket /ws/alerts (optional real-time)
   └─ New alerts pushed → update badge count

┌─ Backend API Flow ──────────────────────────────────────────┐
│ GET /api/dashboard/stats                                     │
│ ├─ FastAPI route handler                                     │
│ ├─ Query OpenSearch: terms aggregation on rule.level        │
│ ├─ Query OpenSearch: date_histogram for timeline            │
│ ├─ Query OpenSearch: terms on agent.name for sources        │
│ ├─ Query Wazuh API: /cluster/status                         │
│ └─ Return aggregated JSON to frontend                       │
└─────────────────────────────────────────────────────────────┘
```

### 2️⃣ Alert Management Data Flow

```
User Clicks Alerts Tab
    ↓
AlertsPage.jsx initializes
    ↓
useQuery: GET /api/alerts?limit=50&page=1&filters={...}
    ├─ DataGrid loads rows
    └─ User selects row
       ↓
       Side panel opens
       ├─ GET /api/alerts/{alert_id} → full alert JSON
       ├─ Parallel: POST /api/investigate/enrich?ip={srcip}
       │  └─ Response: {abuseipdb: {...}, otx: {...}, shodan: {...}, geoip: {...}}
       │     → Display in "Threat Intel" tab
       └─ Render all alert data in tabs

┌─ Real-time Updates ─────────────────────────────────────────┐
│ WebSocket /ws/alerts                                         │
│ ├─ Server polls OpenSearch every 10s for new alerts         │
│ ├─ Pushes new alert objects to connected clients            │
│ └─ Frontend prepends to DataGrid + increments badge count   │
└─────────────────────────────────────────────────────────────┘
```

### 3️⃣ Investigation Data Flow

```
User Searches for 10.251.66.51
    ↓
InvestigatePage.jsx
    ↓
POST /api/investigate?q=10.251.66.51&type=ip&range=30d
    ↓
Backend Aggregates:
├─ DHCP History (OpenSearch, syslog, or custom table)
├─ WiFi Sessions (AP logs)
├─ Events Timeline (all sources filtered by IP)
├─ Threat Intel (AbuseIPDB, OTX, Shodan parallel calls)
└─ Correlation (same user, subnet, MAC)
    ↓
Return: {identity: {...}, dhcp: [...], wifi: [...], events: [...], ti: {...}, corr: {...}}
    ↓
Frontend renders:
├─ Identity card (top)
├─ Tabs: Timeline | DHCP | WiFi | Events | TI | Correlation
└─ Action buttons: Investigate, Add IOC, Create Case

┌─ Enrichment Service Flow ───────────────────────────────────┐
│ enrichment_svc.py: enrich_ip(ip)                             │
│ ├─ abuseipdb_client.check_ip(ip) → {score, reports, ...}   │
│ ├─ otx_client.get_indicator(ip) → {pulses, ...}            │
│ ├─ shodan_client.host(ip) → {ports, os, org, ...}          │
│ └─ Cache result 1 hour                                      │
│ (All 3 calls run in parallel with asyncio.gather)          │
└─────────────────────────────────────────────────────────────┘
```

### 4️⃣ IOC Search Data Flow

```
User Searches for 192.0.2.45 (IP)
    ↓
IOCPage.jsx → POST /api/ioc/search?q=192.0.2.45
    ↓
Backend Executes:
├─ Custom IOC DB query (SQLite)
├─ AbuseIPDB API call: check_ip()
├─ OTX API call: get_indicator()
├─ Shodan API call: host()
├─ VT API call (optional)
└─ Aggregate results with threat score
    ↓
Frontend Renders:
├─ Cards per source (AbuseIPDB, OTX, Shodan)
├─ Aggregated risk score
└─ Related alerts (from OpenSearch)

┌─ Match History ─────────────────────────────────────────────┐
│ GET /api/ioc/history?q=192.0.2.45                           │
│ └─ Query alerts where srcip=192.0.2.45 (last 30 days)     │
│    └─ Display in timeline + table                          │
└─────────────────────────────────────────────────────────────┘
```

### 5️⃣ Compliance Data Flow

```
User Opens Compliance → PCI-DSS Tab
    ↓
CompliancePage.jsx
    ↓
GET /api/compliance/summary?framework=pci-dss
    ↓
Backend Calculates:
├─ For each PCI requirement:
│  ├─ Query Wazuh SCA results
│  ├─ Map to rule results
│  ├─ Calculate pass/fail per requirement
│  └─ Aggregate score
│
└─ Query historical compliance_events table
   └─ Calculate 7-30 day trend
    ↓
Frontend Renders:
├─ Overall score card
├─ Trend line chart
├─ Requirements breakdown table
└─ Risk items with remediation

┌─ SCA Integration ───────────────────────────────────────────┐
│ Wazuh SCA Module:                                            │
│ ├─ Runs checks daily per agent                              │
│ └─ Results stored in wazuh-states-* index (OpenSearch)     │
│
│ Compliance Engine:                                          │
│ ├─ Maps SCA checks to PCI requirements                     │
│ ├─ Queries OpenSearch for check results                    │
│ ├─ Calculates per-requirement pass %                       │
│ └─ Stores daily snapshot in compliance_events table        │
└─────────────────────────────────────────────────────────────┘
```

### 6️⃣ Asset Inventory Data Flow

```
User Opens Assets
    ↓
AssetsPage.jsx
    ↓
GET /api/assets/devices?page=1&limit=50
    ↓
Backend Queries:
├─ Device inventory table (SQLite)
│  └─ Populated from DHCP logs import
├─ Active alerts count per IP
├─ Risk score calculation
└─ Last seen timestamp (from OpenSearch)
    ↓
Frontend Renders:
├─ Device DataGrid (IP, MAC, User, Status, Risk)
└─ Click device → detail panel with tabs

┌─ Device Data Sources ───────────────────────────────────────┐
│ 1. DHCP Logs (import job):                                  │
│    ├─ Parse DHCP server logs                                │
│    ├─ Extract IP-MAC bindings                               │
│    └─ Store in device_inventory table                       │
│
│ 2. WiFi Logs (real-time):                                   │
│    ├─ AP association/disassociation events                 │
│    ├─ Store in wifi_sessions table                          │
│    └─ Link by MAC address                                   │
│
│ 3. Wazuh Agents:                                            │
│    ├─ Query agent list                                      │
│    ├─ Get agent IP + hostname                               │
│    └─ Link to device                                        │
│
│ 4. Risk Calculation:                                        │
│    ├─ Alert count (last 7 days)                            │
│    ├─ Threat intel hits                                     │
│    ├─ Compliance violations                                 │
│    └─ Custom risk formula → 0-10 score                     │
└─────────────────────────────────────────────────────────────┘
```

### 7️⃣ KPI Data Flow

```
User Opens KPI Page
    ↓
KPIPage.jsx
    ↓
Parallel Queries:
├─ GET /api/kpi/summary
│  └─ Return: {mttd: 2.3, mttr: 8.1, fp_rate: 3.2, uptime: 99.8}
├─ GET /api/kpi/timeline?days=30
│  └─ Return: [{date: "2026-05-21", critical: 3, high: 47, ...}, ...]
└─ GET /api/kpi/sources
   └─ Return: [{source: "fortigate", count: 234}, ...]
    ↓
Frontend Renders:
├─ Big 3 metrics cards (MTTD, MTTR, FP)
├─ Alert volume bar chart (30 days)
├─ Alert distribution pie chart
├─ Source volume line chart
└─ Top rules table + SLA metrics

┌─ KPI Calculations ──────────────────────────────────────────┐
│ MTTD (Mean Time To Detect):                                 │
│ ├─ For each alert: calc (ack_time - alert_time)           │
│ ├─ Average per rule/source/level                           │
│ └─ Store in kpi_history table (daily snapshot)             │
│
│ MTTR (Mean Time To Remediate):                              │
│ ├─ For acknowledged alerts: calc (resolved_time - ack_time)│
│ ├─ Resolved determined by: manual flag OR auto-rule-deact  │
│ └─ Store in kpi_history table                              │
│
│ FP Rate (False Positive %):                                 │
│ ├─ Count tuned + marked-false-positive alerts               │
│ ├─ Divide by total alerts                                   │
│ └─ Store in kpi_history table                              │
│
│ Daily KPI Snapshot Job (Cron):                              │
│ ├─ Run every day at midnight UTC                            │
│ ├─ Calculate MTTD, MTTR, FP for that day                   │
│ └─ INSERT into kpi_history                                 │
└─────────────────────────────────────────────────────────────┘
```

### 8️⃣ Admin Data Flow

**Rules Manager:**
```
User clicks Edit Rule
    ↓
RulesManager.jsx
    ↓
GET /api/admin/rules/local_rules.xml
    ↓
Monaco Editor displays XML
    ↓
User clicks Save
    ↓
PUT /api/admin/rules/local_rules.xml
    ├─ Backend saves file to /var/ossec/rules/
    ├─ Validates XML structure
    └─ Returns result
    ↓
User clicks Deploy
    ↓
POST /api/admin/deploy
    └─ Backend runs: wazuh-control restart (or API call)
       └─ Wazuh restarts → new rules loaded
```

**Alert Tuning:**
```
User adds tuning rule
    ↓
POST /api/admin/tuning
│ {rule_id: "5105", original_level: 12, tuned_level: 7, reason: "FP in lab"}
    ↓
Backend creates TuningRule record
    ↓
On next alert match: rule 5105 → check TuningRule → use tuned_level
```

---

## 🎨 Component Hierarchy

### Layout Components
```
App.jsx (Root)
├─ ThemeContextProvider (Dark/light toggle)
├─ AuthProvider (Login/logout)
├─ QueryClientProvider (React Query)
├─ SnackbarProvider (Notifications)
└─ BrowserRouter
   └─ Layout.jsx (Main wrapper)
      ├─ Sidebar.jsx
      │  ├─ Logo/title
      │  ├─ Nav items (8 pages)
      │  └─ Cluster status footer
      │
      ├─ Topbar.jsx
      │ ├─ Logo/title
      │ ├─ Search bar (optional)
      │ ├─ Alert badge (pulsing)
      │ ├─ Theme toggle
      │ └─ User menu
      │
      └─ <Outlet /> → Page components
         ├─ DashboardPage
         ├─ AlertsPage
         ├─ InvestigatePage
         ├─ IOCPage
         ├─ CompliancePage
         ├─ AssetsPage
         ├─ KPIPage
         └─ AdminPage (with sub-routes)
```

### Common Components Used Across Pages
```
CommonComponents.jsx exports:
├─ MetricCard({title, value, trend, color, icon})
├─ SeverityBadge({level, size})
├─ StatusDot({status, animated})
├─ DetailPanel({open, onClose, tabs, data})
├─ AlertMessage({type, title, message})
├─ LoadingSpinner({size, message})
└─ EmptyState({icon, title, message})
```

### Chart Components
```
charts/ directory:
├─ AlertTimeline.jsx
│  └─ Recharts AreaChart (stacked by severity)
├─ AlertDonut.jsx
│  └─ Recharts PieChart (by source)
├─ WorldMap.jsx
│  └─ React Simple Maps (attack origins)
├─ KPIChart.jsx
│  └─ Various (bar, line, scatter)
└─ ComplianceChart.jsx
   └─ Progress bars + line chart
```

---

## 🔌 API Routes Map

### Authentication
```
POST /api/auth/login
  Input: {username, password}
  Output: {access_token, token_type, user: {username, role, email}}

GET /api/auth/me
  Output: {username, role, email, theme_pref}

POST /api/auth/logout
  Output: {message: "Logged out"}
```

### Dashboard
```
GET /api/dashboard/stats?range=24h|7d|30d
  Output: {critical, high, medium, low, total, sources, timeline, countries, cluster}

GET /api/dashboard/cluster
  Output: {nodes: [{name, status, type, ip}, ...]}
```

### Alerts
```
GET /api/alerts?limit=50&page=1&level=&source=&agent=&q=&sort=-timestamp
  Output: {items: [{id, timestamp, level, description, srcip, agent, ...}], total}

GET /api/alerts/{alert_id}
  Output: {alert: {...full JSON...}, enrichment: {abuseipdb, otx, shodan, geoip}}

WS /ws/alerts?token=JWT
  Pushes: {alert: {...}} (new alerts in real-time)
```

### Investigation
```
POST /api/investigate?q=VALUE&type=ip|mac|user|hostname&range=30d
  Output: {identity: {...}, dhcp_history: [...], wifi_sessions: [...], 
           events: [...], threat_intel: {...}, correlation: {...}}
```

### IOC
```
POST /api/ioc/search?q=VALUE
  Output: {custom_ioc: {...}, abuseipdb: {...}, otx: {...}, shodan: {...}, score: 0-100}

GET /api/ioc/custom
  Output: [{id, type, value, description, severity, added_by, added_at}, ...]

POST /api/ioc/custom
  Input: {type, value, description, severity}
  Output: {id, ...}

DELETE /api/ioc/custom/{id}
  Output: {message: "Deleted"}

GET /api/ioc/history?q=VALUE
  Output: [{timestamp, alert_id, description, level}, ...]
```

### Compliance
```
GET /api/compliance/summary?range=7d
  Output: {pci_dss: {score: 73, status: "warning"}, 
           hipaa: {score: 85, status: "ok"}, ...}

GET /api/compliance/sca?agent_id=000
  Output: [{requirement, pass_count, fail_count, score}, ...]

GET /api/compliance/vulnerabilities?agent_id=000
  Output: [{cve_id, cvss_score, description}, ...]
```

### Assets
```
GET /api/assets/devices?page=1&limit=50
  Output: {items: [{ip, mac, hostname, user, status, risk_score}, ...], total}

GET /api/assets/devices/{ip}
  Output: {ip, mac, hostname, user, status, connections: [...], 
           alert_count, risk_score, last_seen}

GET /api/assets/dhcp?range=24h
  Output: [{timestamp, action, ip, mac, hostname, duration}, ...]

GET /api/assets/wifi?range=24h
  Output: [{timestamp, ap, ssid, mac, user, duration, signal, speed}, ...]
```

### KPI
```
GET /api/kpi/summary
  Output: {mttd_hours: 2.3, mttr_hours: 8.1, fp_rate: 3.2, uptime_percent: 99.8}

GET /api/kpi/timeline?days=30
  Output: [{date: "2026-05-21", critical: 3, high: 47, medium: 312, low: 2156}, ...]

GET /api/kpi/sources
  Output: [{source: "fortigate", count: 234, level_dist: {...}}, ...]
```

### Admin
```
GET /admin/rules
  Output: [{filename, size, modified_date}, ...]

GET /admin/rules/{filename}
  Output: (raw XML content)

PUT /admin/rules/{filename}
  Input: (raw XML content)
  Output: {message: "Saved"}

POST /admin/rules/validate
  Input: (raw XML content)
  Output: {valid: true|false, errors: []}

POST /admin/deploy
  Output: {message: "Wazuh restarted"}

GET /admin/tuning
  Output: [{id, rule_id, original_level, tuned_level, reason, added_by, status}, ...]

POST /admin/tuning
  Input: {rule_id, original_level, tuned_level, reason}
  Output: {id, ...}

GET /admin/users
  Output: [{id, username, email, role, last_login}, ...]

POST /admin/users
  Input: {username, email, full_name, role}
  Output: {id, username, email, ...}

GET /admin/audit?page=1&limit=100
  Output: [{timestamp, username, action, target, ip_address, detail}, ...]
```

---

## 🗄️ Database Schema (SQLite)

```sql
-- Users
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  full_name VARCHAR(100),
  hashed_password VARCHAR(200),
  role VARCHAR(20) DEFAULT 'viewer',  -- superadmin|admin|analyst|viewer
  is_active BOOLEAN DEFAULT 1,
  theme_pref VARCHAR(10) DEFAULT 'dark',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login DATETIME
);

-- Audit Log
CREATE TABLE audit_log (
  id INTEGER PRIMARY KEY,
  username VARCHAR(50),
  action VARCHAR(100),
  target VARCHAR(200),
  detail TEXT,
  ip_address VARCHAR(45),
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Custom IOC
CREATE TABLE custom_ioc (
  id INTEGER PRIMARY KEY,
  ioc_type VARCHAR(20),  -- ip|domain|hash|url
  value VARCHAR(500) UNIQUE,
  description TEXT,
  severity VARCHAR(20) DEFAULT 'high',
  added_by VARCHAR(50),
  added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT 1,
  expires_at DATETIME
);

-- Alert Tuning Rules
CREATE TABLE tuning_rules (
  id INTEGER PRIMARY KEY,
  rule_id VARCHAR(20) UNIQUE,
  original_level INTEGER,
  tuned_level INTEGER,
  reason TEXT,
  added_by VARCHAR(50),
  added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  review_date DATETIME,
  status VARCHAR(20) DEFAULT 'active'
);

-- Device Inventory
CREATE TABLE device_inventory (
  id INTEGER PRIMARY KEY,
  ip_address VARCHAR(15) UNIQUE,
  mac_address VARCHAR(17),
  hostname VARCHAR(255),
  user_id VARCHAR(100),
  device_type VARCHAR(50),
  os VARCHAR(100),
  risk_score FLOAT DEFAULT 0,
  first_seen DATETIME,
  last_seen DATETIME,
  notes TEXT
);

-- Device Event History
CREATE TABLE device_events (
  id INTEGER PRIMARY KEY,
  ip_address VARCHAR(15),
  event_type VARCHAR(50),  -- login|login_fail|connect|disconnect|etc
  timestamp DATETIME,
  details TEXT,
  FOREIGN KEY (ip_address) REFERENCES device_inventory(ip_address)
);

-- KPI History (Daily Snapshots)
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
  low_count INTEGER,
  uptime_percent FLOAT
);

-- Compliance Events
CREATE TABLE compliance_events (
  id INTEGER PRIMARY KEY,
  framework VARCHAR(50),  -- pci-dss, hipaa, gdpr, nist, tsc
  requirement VARCHAR(100),
  score FLOAT,
  status VARCHAR(20),
  details TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Alert Status (for MTTD/MTTR tracking)
CREATE TABLE alert_status (
  id INTEGER PRIMARY KEY,
  alert_id VARCHAR(100),
  alert_timestamp DATETIME,
  ack_timestamp DATETIME,
  resolved_timestamp DATETIME,
  status VARCHAR(20),  -- new|ack|resolved|fp|tuned
  user_id VARCHAR(50)
);
```

---

## 🔐 Authentication Flow

```
1. User enters credentials on LoginPage
   ↓
2. POST /api/auth/login → Backend verifies against users table
   ↓
3. Backend returns {access_token, user}
   ↓
4. Frontend saves token to localStorage
   ↓
5. All subsequent requests include: Authorization: Bearer {token}
   ↓
6. Backend verifies token in middleware
   ├─ Valid → process request
   └─ Invalid → return 401 Unauthorized
   ↓
7. Frontend interceptor catches 401 → redirect to /login
```

---

## 🎯 Performance Optimization Strategies

### Frontend
1. **Code Splitting**
   - Lazy-load pages: `const AlertsPage = lazy(() => import('./pages/AlertsPage'))`
   - Suspense boundary: `<Suspense fallback={<Loading />}>`

2. **Caching**
   - React Query: `staleTime: 30000` (30s cache)
   - localStorage: User preferences, theme mode
   - Browser cache: CSS, fonts, static images

3. **Virtual Scrolling**
   - MUI DataGrid with 1000+ rows: use `virtualization`

4. **Image Optimization**
   - Use WebP format
   - Responsive images: `srcSet`

5. **Bundle Size**
   - Tree-shake unused MUI components
   - Lazy-load charts library

### Backend
1. **Database Indexing**
   - Index: `device_inventory.ip_address`, `custom_ioc.value`
   - Improves query speed 10-100x

2. **API Caching**
   - Cache Wazuh API responses (cluster health every 60s)
   - Cache threat intel (AbuseIPDB 1h)

3. **Async Processing**
   - Enrichment service: parallel async calls
   - Daily KPI snapshot: background job

4. **Connection Pooling**
   - SQLAlchemy: database connection pool
   - OpenSearch: persistent client connection

---

## 📊 Monitoring & Debugging

### Frontend Console
```javascript
// Check authentication
console.log(localStorage.getItem('soc_token'));

// Check theme
console.log(document.documentElement.className);

// Check React Query cache
window.queryClient.getQueryData(['alerts'])

// Network tab: Look for failed API calls
// Filter by /api/ to see backend requests
```

### Backend Logs
```bash
# Watch logs
docker compose -f docker/docker-compose.yml logs -f wazuhweb_backend

# Look for errors
grep ERROR logs/backend.log

# API response timing
grep "GET /api" logs/backend.log
```

### Health Checks
```bash
# Frontend
curl -sk https://10.251.150.222:3348/wazuh/

# Backend API
curl -sk https://10.251.150.222:3348/wazuh/api/health

# Wazuh connectivity
curl -sk -X POST https://10.251.151.11:55000/security/user/authenticate \
  -u wazuh-wui:PASSWORD

# OpenSearch
curl -sk -u admin:admin https://10.251.151.13:9200/_cluster/health
```

---

## 📚 Developer Quick Start

1. **Clone repo**
   ```bash
   git clone https://github.com/neostar-ja/wazuh_ova.git
   cd wazuh_ova/web_app
   ```

2. **Install dependencies**
   ```bash
   # Frontend
   cd frontend && npm install
   
   # Backend
   cd ../backend && pip install -r requirements.txt
   ```

3. **Start dev servers**
   ```bash
   # Terminal 1: Frontend (hot reload)
   cd frontend && npm run dev
   
   # Terminal 2: Backend (auto-restart)
   cd backend && uvicorn app.main:app --reload
   
   # Terminal 3: Docker containers (optional)
   docker compose -f docker/docker-compose.yml up
   ```

4. **Access locally**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000/api
   - Swagger docs: http://localhost:8000/docs

5. **Login**
   - Username: `admin`
   - Password: `Wazuh@S0C2026!`

---

**Document Version:** 1.0  
**Status:** Ready for Development  
**Last Updated:** May 21, 2026
