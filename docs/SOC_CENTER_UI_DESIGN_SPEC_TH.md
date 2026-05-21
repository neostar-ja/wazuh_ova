# ศูนย์ SOC/IOC Center — UI/UX Design Specification v2.0
## โรงพยาบาลมหาวิทยาลัยวลัยลักษณ์ | Walailak University Hospital
### Created: May 21, 2026 | Status: Approved for Implementation

---

## 📋 Table of Contents
1. [Executive Summary](#executive-summary)
2. [Information Architecture](#information-architecture)
3. [Design System & Tokens](#design-system--tokens)
4. [Page Specifications](#page-specifications)
5. [Data Integration Strategy](#data-integration-strategy)
6. [Navigation & Flows](#navigation--flows)
7. [Component Library](#component-library)
8. [Mobile & Responsive Design](#mobile--responsive-design)
9. [Dark/Light Mode](#darklight-mode)
10. [Performance & Accessibility](#performance--accessibility)

---

## Executive Summary

ศูนย์ SOC/IOC Center คือแพลตฟอร์มสำหรับ Security Operations Center ที่ใช้งานจริงกับ Wazuh SIEM และ OpenSearch

**วัตถุประสงค์:**
- ติดตามภัยคุกคามแบบ real-time 24/7
- วิเคราะห์เหตุการณ์ความปลอดภัยอย่างเชิงลึก
- จัดการ IOC (Indicators of Compromise) และ threat intelligence
- ให้ข้อมูลการปฏิบัติตามข้อกำหนด (Compliance) พบ PCI-DSS, HIPAA, GDPR
- สนับสนุนการตัดสินใจของผู้บริหาร ด้วย KPI และ metrics

**ผู้ใช้งาน:**
- Security Analysts (ชาวที่ 80%): ค้นหา, ตรวจสอบ, ตอบสนองต่อภัยคุกคาม
- SOC Manager (5-10%): ดูสถิติ, ประเมิน SLA, quorum alerts
- CISO / Management (5-10%): KPI, compliance status, trends

---

## Information Architecture

### Level 0: Entry Points
```
ผู้ใช้ → Browser → HTTPS :3348 → Nginx TLS Reverse Proxy
                                 ↓
                    ┌───────────────┬────────────────┐
                    ↓               ↓                ↓
              Frontend SPA    Backend API    WebSocket Alerts
              (React + MUI)   (FastAPI)      (Real-time push)
                    ↓               ↓                ↓
              ┌─────────────────────┴────────────────┐
              ↓                                      ↓
          SQLite DB              ┌──────────────────┴──────────────────┐
        (User, Audit,            ↓                                      ↓
         Custom IOC)      Wazuh API (:55000)          OpenSearch Index (:9200)
                          - agents                     - wazuh-alerts-4.x-*
                          - rules                      - wazuh-states-*
                          - cluster health             - custom-logs-*
```

### Level 1: Main Features (Core Domains)

| Domain | Primary Users | Core Functions |
|--------|---------------|-----------------|
| **Dashboard** | ทุกคน | Real-time threat overview, KPI summary, cluster health |
| **Alert Management** | Analyst, SOC Mgr | Alert triage, enrichment, correlation, escalation |
| **Investigation** | Analyst | IP/MAC/User/Hostname deep-dive, timeline, related events |
| **IOC & TI** | Analyst, Manager | IOC lookup, custom blocklist, threat score aggregation |
| **Compliance** | Manager, CISO | Framework tracking (PCI, HIPAA, GDPR, NIST, TSC), audit trail |
| **Asset Inventory** | Manager, Network Team | IP-MAC binding, DHCP history, WiFi sessions, device risk |
| **KPI & Reporting** | CISO, Management | MTTD, MTTR, FP rate, alert volume, top threats, trends |
| **Administration** | Admin, SuperAdmin | User management, rule editing, alert tuning, backup/restore |

---

## Design System & Tokens

### Typography

| Level | Font | Size | Weight | Use Case |
|-------|------|------|--------|----------|
| **H1** | IBM Plex Sans | 40px | 700 | Page titles (rare) |
| **H2** | IBM Plex Sans | 32px | 700 | Section headers |
| **H3** | IBM Plex Sans | 24px | 600 | Card titles |
| **H4** | IBM Plex Sans | 18px | 600 | Subsection headers |
| **Body Large** | IBM Plex Sans | 16px | 400 | Main body text |
| **Body Regular** | IBM Plex Sans | 14px | 400 | Default text, table cells |
| **Body Small** | IBM Plex Sans | 12px | 400 | Captions, help text |
| **Mono Code** | IBM Plex Mono | 13px | 400 | IP, MAC, hashes, code blocks |

### Color Palette

#### Dark Mode (Default for SOC)
```
Background:
  BG-0 (Page)      : #060c17   (near-black)
  BG-1 (Sidebar)   : #0d1825
  BG-2 (Cards)     : #132032
  BG-3 (Inputs)    : #1a2c45

Text:
  Text-Primary     : #f0f4ff   (almost white, 95%)
  Text-Secondary   : #8899bb   (muted blue-gray, 55%)
  Text-Tertiary    : #445566   (very muted, 30%)
  Text-Disabled    : #2d3f5f   (10% opacity effect)

Borders & Dividers:
  Border-Default   : rgba(255, 255, 255, 0.06)   (subtle)
  Border-Light     : rgba(255, 255, 255, 0.12)   (visible)
  Border-Active    : rgba(59, 130, 246, 0.5)     (interactive)

Alert Severity (Level):
  Critical (L15+)  : #ef4444   (red)
  High (L12-14)    : #f59e0b   (amber)
  Medium (L7-11)   : #3b82f6   (blue)
  Low (L1-6)       : #10b981   (emerald)

Status:
  Success          : #10b981   (green)
  Warning          : #f59e0b   (amber)
  Error            : #ef4444   (red)
  Info             : #3b82f6   (blue)

Accent:
  Primary          : #3b82f6   (blue)
  Secondary        : #8b5cf6   (purple)
  Tertiary         : #06b6d4   (cyan)
```

#### Light Mode
```
Background:
  BG-0 (Page)      : #f8fafc
  BG-1 (Sidebar)   : #f1f5f9
  BG-2 (Cards)     : #ffffff
  BG-3 (Inputs)    : #e2e8f0

Text:
  Text-Primary     : #1e293b
  Text-Secondary   : #64748b
  Text-Tertiary    : #94a3b8
  Text-Disabled    : #cbd5e1

Borders:
  Border-Default   : rgba(0, 0, 0, 0.06)
  Border-Light     : rgba(0, 0, 0, 0.12)
  Border-Active    : rgba(29, 78, 216, 0.5)
```

### Spacing Scale
```
4px    (0.25rem)  - Fine details
8px    (0.5rem)   - Tight spacing
12px   (0.75rem)  - Compact groups
16px   (1rem)     - Standard padding/margin
24px   (1.5rem)   - Spacious sections
32px   (2rem)     - Major section breaks
48px   (3rem)     - Page-level spacing
```

### Border Radius
```
4px    - Badges, small buttons
8px    - Form inputs, small components
12px   - Cards, medium buttons
16px   - Large panels, modals
```

### Shadows (for depth/elevation)
```
Subtle    : 0 1px 2px 0 rgba(0, 0, 0, 0.05)
Small     : 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)
Medium    : 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)
Large     : 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)
ExtraLarge: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)
```

---

## Page Specifications

### 1️⃣ **Dashboard** — `/`
**Purpose:** Real-time threat overview, executive summary, system health

#### Layout (12-column grid)
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Page Title: "ภาพรวมภัยคุกคาม" (Threat Overview) | Time Range Selector      │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ Top KPI Row (4 columns each)                                                │
├──────────────────┬──────────────────┬──────────────────┬──────────────────┤
│ 🔴 Critical      │ 🟠 High          │ 🟡 Medium        │ 🟢 Low           │
│ 3 alerts         │ 47 alerts        │ 312 alerts       │ 2,156 alerts     │
│ ↑ 2 since 1h     │ ↓ 5 since 1h     │ → 0 since 1h     │ ↑ 112 since 1h   │
└──────────────────┴──────────────────┴──────────────────┴──────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ Row 2: Alert Trend (6col) + Top Sources (6col)                              │
├──────────────────────────────────┬───────────────────────────────────────────┤
│ Alert Trend — 24h (AreaChart)    │ Top Alert Sources (6) — Pie/Donut       │
│ ┌────────────────────────────────┤   [Fortigate]        47 alerts           │
│ │ Recharts AreaChart, stacked:   │   [Suricata]         156 alerts          │
│ │  - Line: red (Critical)         │   [Syslog]           89 alerts           │
│ │  - Line: amber (High)           │   [DHCP]             23 alerts           │
│ │  - Line: blue (Medium)          │   [Windows Events]   12 alerts           │
│ │  - Line: green (Low)            │   [SSH]              8 alerts            │
│ │ Y-axis: alert count             │   Other              77 alerts           │
│ │ X-axis: time (hourly)           │                                         │
│ └────────────────────────────────┤                                         │
├──────────────────────────────────┴───────────────────────────────────────────┤
│ Row 3: World Attack Map (12col) — React Simple Maps + GeoLocation         │
├──────────────────────────────────────────────────────────────────────────────┤
│  [World Map with attack markers]                                            │
│  Top attacking regions: 🇨🇳 China (4523), 🇮🇳 India (2341), 🇷🇺 Russia (1876)│
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ Row 4: Cluster Health (4col) + Recent Critical (8col)                       │
├──────────┬───────────────────────────────────────┬──────────────────────────┤
│ Cluster  │ Cluster Status                        │ Last 5 Critical Alerts  │
│ Health   │  ● master-01 (● Active)              │  [Table: timestamp,     │
│          │  ● worker-01 (● Active)              │   agent, rule.desc,     │
│ Nodes: 2 │  ● indexer   (● Active)              │   srcip, action]        │
│ Status:  │                                       │                         │
│ GREEN    │ OpenSearch:                           │ Auto-refresh: 30s       │
│          │  Status: YELLOW (1 unassigned shard) │ Quick action: Investigate
│          │  Nodes: 1 | Shards: 18 / 18          │                         │
└──────────┴───────────────────────────────────────┴──────────────────────────┘
```

#### Data Sources (Real-time)
- **KPI Cards:** `GET /api/dashboard/stats?range=24h|7d|30d`
  - Count queries per level
  - Trend calculation (delta from previous period)
  - Sparkline data (hourly points)

- **Alert Trend:** OpenSearch aggregation
  - Query: `wazuh-alerts-4.x-*` filtered by `@timestamp` + level
  - Aggregation: `date_histogram(interval=1h)` → count per severity

- **Top Sources:** Recharts DonutChart
  - Query: `terms aggregation` on `agent.name` | `predecoder.program_name`
  - Top 6 + "Other"

- **World Map:** GeoLocation enrichment
  - Query: `wazuh-alerts-4.x-*` filtered by `GeoLocation.country_name` (srcip)
  - Aggregation: top 10 countries by alert count
  - Render: red circles on map with pulse animation

- **Cluster Health:** Wazuh API + OpenSearch
  - `GET /api/dashboard/cluster` → per-node health
  - `GET https://OS:9200/_cluster/health` → overall status

- **Recent Alerts:** WebSocket push + fallback query
  - WS: `ws://app/ws/alerts` for live push
  - Fallback: `GET /api/alerts?limit=5&sort=-timestamp`

#### Interactivity
- Time range selector (1h / 6h / 24h / 7d / 30d)
- Click alert card → open detail drawer with full JSON + enrichment
- Click country on map → filter alerts by that country
- Click agent in cluster → drill down to agent details
- Real-time auto-refresh every 30 seconds (with manual pause/resume)

---

### 2️⃣ **Alert Management** — `/alerts`
**Purpose:** Alert triage, enrichment, correlation, escalation workflow

#### Layout (Master-Detail)
```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Page Title: "แจ้งเตือนภัยคุกคาม" (Threat Alerts)                           │
│ Filter Bar: [Level ▼] [Source ▼] [Agent ▼] [Date Range ▼] [Search ▼]      │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ Batch Actions: [🔴 Mark Critical] [🟠 Mark High] [👁️ Mark as Read]        │
│ [📋 Bulk Export] [🔗 Link to Case] [🚫 Silence]                             │
├──────────────────────────────────────────────────────────────────────────────┤
│ MUI DataGrid — 50 rows per page (virtualized)                               │
├──────┬─────┬──────────────┬──────────┬──────────┬───────┬────────┬─────────┤
│ Select│Time │Description   │Agent     │SrcIP     │Level  │Status  │Actions  │
├──────┼─────┼──────────────┼──────────┼──────────┼───────┼────────┼─────────┤
│ ☐    │14:23│Brute force   │LAPTOP-01 │10.251... │🟠 12  │⏳ NEW  │👁️ 🔍   │
│ ☐    │14:22│IDS alert     │FW-01    │203.0.113│🔴 15  │✓ ACK  │👁️ 🔍   │
│ ☐    │14:21│Web app attack│WEB-01   │192.168.1│🟡 9   │□ OPEN │👁️ 🔍   │
│      │     │ ...          │          │          │       │        │         │
└──────┴─────┴──────────────┴──────────┴──────────┴───────┴────────┴─────────┘

Pagination: [◄] 1 2 3 ... 456 [►]  |  Showing 1-50 of 23,456 alerts
```

#### Side Panel (Detail View) — On Row Click
```
┌─────────────────────────────────────────────────────────────────┐
│ Timestamp: 2026-05-21 14:23:45 UTC                [X] Close    │
├─────────────────────────────────────────────────────────────────┤
│ 📌 Alert ID: evt.id_8765432                       [📋 Copy]    │
│
│ ┌─ Rule & Severity ─────────────────────────────┐
│ │ Rule ID: 5105 | Level: 12 (High)             │
│ │ Description: Possible brute force attack      │
│ │ Groups: [auth] [attempt_password] [brute_force]
│ │ MITRE ATT&CK: [T1110 - Brute Force]          │
│ └───────────────────────────────────────────────┘
│
│ ┌─ Source & Destination ────────────────────────┐
│ │ Source:                                       │
│ │  IP: 10.251.66.51 [🔍 Investigate] [📍 Map]  │
│ │  Agent: LAPTOP-WRK01                          │
│ │  User: john.doe                               │
│ │ Destination:                                  │
│ │  IP: 192.168.100.10 (SSH Port 22)            │
│ │  Service: OpenSSH 7.4                         │
│ └───────────────────────────────────────────────┘
│
│ ┌─ Threat Intelligence ─────────────────────────┐
│ │ 🟢 AbuseIPDB: 0% | 0 reports | ✅ Clean       │
│ │ 🟢 OTX: No pulses | ✅ Safe                    │
│ │ 🟡 Shodan: Open ports (22,80,443) | ⚠ Monitored
│ │ GeoIP: 🇹🇭 Thailand | Nakhon Si Thammarat    │
│ └───────────────────────────────────────────────┘
│
│ ┌─ Related Alerts (Correlation) ────────────────┐
│ │ 27 failed login attempts in last 10 minutes   │
│ │ 5 IP reputation hits                          │
│ │ Agent LAPTOP-WRK01 has 156 alerts today       │
│ └───────────────────────────────────────────────┘
│
│ ┌─ Full Alert JSON (collapsible) ───────────────┐
│ │ { "alert": {...}, "data": {...}, ...}        │
│ │ [📋 Copy] [💾 Save] [📤 Export]              │
│ └───────────────────────────────────────────────┘
│
│ ┌─ Actions ─────────────────────────────────────┐
│ │ [🔍 Investigate IP] [➕ Add IOC] [🏷️ Tuning] │
│ │ [⚠️ Escalate] [🔗 Create Case] [😐 Dismiss] │
│ └───────────────────────────────────────────────┘
└─────────────────────────────────────────────────────────────────┘
```

#### Data Sources
- **DataGrid rows:** `GET /api/alerts?limit=50&page=P&sort=-timestamp&filters=...`
- **Side panel:** `GET /api/alerts/{alert_id}` (full alert + auto-enrichment)
- **Real-time updates:** WS: `/ws/alerts` push new alerts to grid
- **Threat Intel:** Parallel queries to AbuseIPDB, OTX, Shodan (cached 1 hour)

#### Features
- Multi-select bulk actions (mark level, acknowledge, silence, export)
- Advanced filter sidebar (JSON query builder)
- Column reordering & hiding (saved to localStorage)
- Export to CSV / JSON
- Keyboard shortcuts (j/k for nav, enter for detail, d for dismiss)

---

### 3️⃣ **Investigation** — `/investigate`
**Purpose:** Deep-dive analysis by IP, MAC, User, or Hostname

#### Layout
```
┌──────────────────────────────────────────────────────────────────────────────┐
│ "สืบสวนภัยคุกคาม" (Threat Investigation) | Select by: [IP/MAC/User/Hostname]
├──────────────────────────────────────────────────────────────────────────────┤
│ Search: [____________________] [🔍 Search] | Date Range: [picker start] - [picker end]
│ (Type or paste value, e.g., 10.251.66.51, A4:C3:F0:AB:CD:12, john.doe)
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ Results appear below (initially empty)
│
│ ┌─ Identity Card (single subject) ───────────────────────────────────────────┐
│ │ [Avatar-circle] 10.251.66.51                              [🗺️ Map] [Export]
│ │ Found in 4 sources | 156 alerts | Seen last: 2m ago
│ │ IP: 10.251.66.51 | MAC: A4:C3:F0:AB:CD:12 | Hostname: LAPTOP-WRK01
│ │ User: john.doe | Default Gateway: 10.251.66.1 | AP: AP-2.4GHz-MAIN
│ │ DHCP Pool: STAFF-WIRED | VLAN: 100 (Guest Network)
│ │
│ │ Threat Indicators:
│ │ 🟢 AbuseIPDB: 0% | 🟢 OTX: Clean | 🟡 Shodan: 3 open ports
│ │ GeoIP: 🇹🇭 Thailand, Nakhon Si Thammarat | ISP: True Corporation
│ └────────────────────────────────────────────────────────────────────────────┘
│
│ ┌─ Tabs ────────────────────────────────────────────────────────────────────┐
│ │ [Timeline] [DHCP] [WiFi] [Events] [ThreatIntel] [Correlation]           │
│ ├────────────────────────────────────────────────────────────────────────────┤
│ │
│ │ TAB: Timeline (Recharts Timeline, all sources)
│ │ ┌──────────────────────────────────────────────────────────────────────────┐
│ │ │ [Line chart: stacked by source type]                                    │
│ │ │  Y-axis: Event count | X-axis: Time (30-day range)                      │
│ │ │  Color legend: [Auth] [Firewall] [DHCP] [SSH] [IDS] [Other]            │
│ │ └──────────────────────────────────────────────────────────────────────────┘
│ │
│ │ TAB: DHCP History (Table)
│ │ ┌──────────────────────────────────────────────────────────────────────────┐
│ │ │ [Table: Time | Action | IP | Duration | MAC | Hostname]                │
│ │ │  2026-05-21 09:00 | DISCOVER | 10.251.66.51 | 8h | A4:C3:F0... | ...   │
│ │ │  2026-05-20 17:35 | RELEASE  | 10.251.66.51 | -- | A4:C3:F0... | ...   │
│ │ │  ... (all leases, 30-day history)                                       │
│ │ └──────────────────────────────────────────────────────────────────────────┘
│ │
│ │ TAB: WiFi Sessions (Table)
│ │ ┌──────────────────────────────────────────────────────────────────────────┐
│ │ │ [Table: Time | AP | SSID | Duration | Auth | Signal | Speed]           │
│ │ │  2026-05-21 09:15 | AP-2.4GHz-MAIN | STAFF | 7h45m | WPA2 | -65dBm | 54M
│ │ │  2026-05-20 17:20 | AP-5GHz-MAIN   | STAFF | 8h30m | WPA2 | -58dBm | 150M
│ │ │  ... (WiFi sessions)                                                     │
│ │ └──────────────────────────────────────────────────────────────────────────┘
│ │
│ │ TAB: Events (Table — last 50 events)
│ │ ┌──────────────────────────────────────────────────────────────────────────┐
│ │ │ [Table: Time | Source | Type | Description | Agent | Level]            │
│ │ │  2026-05-21 14:23 | Syslog | Auth | Failed SSH login | LAPTOP-01 | 🟠 12
│ │ │  2026-05-21 14:12 | DHCP | Assignment | DHCP assign | DHCP-01 | 🟢 3
│ │ │  2026-05-21 14:01 | Firewall | Rule | INBOUND DROP | FW-01 | 🟡 7
│ │ │  ... (all events)                                                        │
│ │ └──────────────────────────────────────────────────────────────────────────┘
│ │
│ │ TAB: Threat Intel
│ │ ┌──────────────────────────────────────────────────────────────────────────┐
│ │ │ AbuseIPDB:                                                              │
│ │ │  Score: 0% | Reports: 0 | Country: TH | ISP: True Corporation          │
│ │ │
│ │ │ OTX AlienVault:                                                         │
│ │ │  Pulses: 0 | Tags: None | Last updated: never                           │
│ │ │
│ │ │ Shodan:                                                                 │
│ │ │  Ports: [22, 80, 443] (SSH, HTTP, HTTPS)                               │
│ │ │  Organization: Walailak University Hospital                             │
│ │ │  Operating System: Windows 10 Pro                                       │
│ │
│ │ │ GeoIP:                                                                  │
│ │ │  Country: 🇹🇭 Thailand | City: Nakhon Si Thammarat                     │
│ │ │  Coordinates: 8.5428°N, 100.3019°E | ISP: True Corporation             │
│ │ └──────────────────────────────────────────────────────────────────────────┘
│ │
│ │ TAB: Correlation (Related Activity)
│ │ ┌──────────────────────────────────────────────────────────────────────────┐
│ │ │ From same user (john.doe):                                              │
│ │ │  - 23 IPs used in last 30 days                                          │
│ │ │  - 5 suspicious activities flagged                                      │
│ │ │
│ │ │ From same subnet (10.251.66.0/24):                                      │
│ │ │  - 47 active hosts                                                      │
│ │ │  - 234 alerts in last 7 days                                            │
│ │ │  - Top threat: Brute force (4 IPs)                                      │
│ │ │
│ │ │ From same MAC:                                                          │
│ │ │  - First seen: 2026-03-15 | Last seen: 2 minutes ago                   │
│ │ │  - Used with 3 different usernames                                      │
│ │ │  - Device: Dell Latitude 5430 (Windows 10)                              │
│ │ └──────────────────────────────────────────────────────────────────────────┘
│
│ [🔗 Create Case] [📋 Export] [🔊 Alert] [🏷️ Tag]
└──────────────────────────────────────────────────────────────────────────────┘
```

#### Data Integration
1. **Search:** POST `/api/investigate?q=VALUE&type=ip|mac|user|hostname&range=30d`
   - Returns: `{identity: {...}, dhcp_history: [...], wifi_sessions: [...], events: [...], threat_intel: {...}, correlation: {...}}`

2. **Identity extraction:** Parse from all available sources:
   - IP ← OpenSearch: `data.srcip`, `data.dstip`, `GeoLocation.ip`
   - MAC ← `data.mac`, `data.dhcp_mac`, device inventory
   - User ← `data.dstuser`, syslog user field, WiFi AP
   - Hostname ← `data.dhcp_hostname`, agent name, reverse DNS

3. **DHCP History:** Filter `wazuh-states-*` or custom DHCP logs
4. **WiFi Sessions:** Filter WiFi/AP logs by MAC or user
5. **Threat Intel:** Parallel async calls to OTX, AbuseIPDB, Shodan (cache 1h)
6. **Correlation:** MongoDB-style aggregation queries on OpenSearch

---

### 4️⃣ **IOC & Threat Intelligence** — `/ioc`
**Purpose:** Search and manage indicators of compromise

#### Layout
```
┌──────────────────────────────────────────────────────────────────────────────┐
│ "ศูนย์ IOC" (IOC Center)                                                     │
│ Tabs: [🔍 Search Results] [🛡️ Custom IOC] [📊 Statistics] [📋 History]     │
└──────────────────────────────────────────────────────────────────────────────┘

┌─ TAB 1: Search Results ───────────────────────────────────────────────────────┐
│ Search: [IP/Domain/Hash/URL___________] [🔍 Search]                          │
│                    [Type▼: IP|Domain|Hash|URL]                              │
│
│ Results:
│ ┌──────────────────────────────────────────────────────────────────────────┐
│ │ 🌐 IP Address: 192.0.2.45                         [Map] [Investigate]   │
│ │ Found in 2 sources | Risk Score: 8/10 (⚠️ HIGH)                        │
│ │
│ │ Sources:
│ │  • AbuseIPDB: 72% abuse score | 145 reports | Last 24h: 3 reports      │
│ │    - Categories: [DDoS] [Brute Force] [SSH Scanning]                    │
│ │  • OTX AlienVault: 5 pulses | Tags: [trojan] [botnet] [c2]              │
│ │    - Pulse: "Emotet Banking Trojan" (updated 2h ago)                     │
│ │    - Pulse: "Mirai Botnet Scanning" (updated 1d ago)                     │
│ │
│ │ Threat Match History:
│ │  • 2026-05-21 14:30 - SSH Brute Force attempt (Alert ID: 5021)           │
│ │  • 2026-05-21 14:15 - Multiple failed login attempts (Alert ID: 5019)    │
│ │  • 2026-05-20 09:45 - IDS Alert: Suspicious traffic (Alert ID: 4982)    │
│ │
│ │ [🔴 Block] [🟡 Monitor] [➕ Add Custom] [📤 Export]
│ └──────────────────────────────────────────────────────────────────────────┘
│
│ (Multiple results for same search)
└──────────────────────────────────────────────────────────────────────────────┘

┌─ TAB 2: Custom IOC Management ────────────────────────────────────────────────┐
│ [➕ Add New IOC] [📤 Bulk Import] [📥 Export]                                │
│
│ MUI DataGrid:
│ ┌──┬────────┬────────┬──────────────┬──────────┬──────┬──────────────────┤
│ │☐ │Type    │Value   │Description   │Severity  │Added │Action            │
│ ├──┼────────┼────────┼──────────────┼──────────┼──────┼──────────────────┤
│ │☐ │IP      │10.0.0.1│Lab test      │Low       │2d ago│✏️ [Edit] [X]    │
│ │☐ │Domain  │evil.com│Known C2      │Critical  │1w ago│✏️ [Edit] [X]    │
│ │☐ │Hash    │d41d8cd │Malware sample│High      │3d ago│✏️ [Edit] [X]    │
│ └──┴────────┴────────┴──────────────┴──────────┴──────┴──────────────────┘
│
│ Add IOC Dialog:
│ ┌──────────────────────────────────────────────────────────────────────────┐
│ │ Type: [IP▼|Domain|Hash|URL]                                              │
│ │ Value: [_____________________]                                            │
│ │ Description: [_____________________________]                              │
│ │ Severity: [Critical▼ | High | Medium | Low]                              │
│ │ Expiry: [Date Picker] (or: Never)                                        │
│ │ Source: [Custom | STIX Feed | ...]                                       │
│ │ [Cancel] [Save]                                                           │
│ └──────────────────────────────────────────────────────────────────────────┘
└──────────────────────────────────────────────────────────────────────────────┘

┌─ TAB 3: IOC Statistics ───────────────────────────────────────────────────────┐
│ Total IOC: 2,341 | Active: 2,156 | Expired: 185                             │
│
│ By Type:
│ ┌─────────────────────────────────────────────────────────────────────────┐
│ │ IP Addresses: 1,234 (52%)     [████████████░░░░░░░░] ████ in alerts    │
│ │ Domains: 567 (24%)            [██████░░░░░░░░░░░░░░] ██ in alerts      │
│ │ Hashes: 432 (18%)             [█████░░░░░░░░░░░░░░░] █ in alerts       │
│ │ URLs: 108 (5%)                [█░░░░░░░░░░░░░░░░░░░] 0 in alerts       │
│ └─────────────────────────────────────────────────────────────────────────┘
│
│ By Severity:
│ │ Critical: 123 | High: 456 | Medium: 891 | Low: 871
│
│ Top 10 Most Triggered IOCs:
│ │ 1. 192.0.2.45 (IP) — 1,234 hits in 7 days
│ │ 2. malware.com (Domain) — 987 hits
│ │ 3. [hash] — 543 hits
│ │ ... (table with sparklines)
└──────────────────────────────────────────────────────────────────────────────┘

┌─ TAB 4: IOC Match History ────────────────────────────────────────────────────┐
│ Timeline of all IOC matches (last 30 days)
│ Filter: [Type▼] [Severity▼] [Date Range]
│
│ [Timeline chart showing IOC hits over time, colored by severity]
└──────────────────────────────────────────────────────────────────────────────┘
```

#### Data Integration
1. **Search:** POST `/api/ioc/search?q=VALUE`
   - Returns: AbuseIPDB, OTX, Shodan, VT, + CustomDB in parallel
   - Aggregated threat score (0-100)

2. **Custom IOC CRUD:** 
   - GET `/api/ioc/custom` → list
   - POST `/api/ioc/custom` → create
   - PUT `/api/ioc/custom/{id}` → update
   - DELETE `/api/ioc/custom/{id}` → delete

3. **Match History:** 
   - GET `/api/ioc/history?q=VALUE` → all alerts where this IOC appeared

---

### 5️⃣ **Compliance** — `/compliance`
**Purpose:** Track compliance frameworks and audit trails

#### Layout
```
┌──────────────────────────────────────────────────────────────────────────────┐
│ "ความสอดคล้องตามมาตรฐาน" (Compliance)                                      │
│ Framework Tabs: [PCI-DSS] [HIPAA] [GDPR] [NIST 800-53] [TSC] [Summary]    │
└──────────────────────────────────────────────────────────────────────────────┘

┌─ SUMMARY TAB ─────────────────────────────────────────────────────────────────┐
│ Status as of: 2026-05-21 14:00 UTC | Time Range: [Last 7 days ▼]            │
│
│ Framework Status Cards (4 columns):
│ ┌──────────────┬──────────────┬──────────────┬──────────────┐
│ │ 🔴 PCI-DSS   │ 🟡 HIPAA     │ 🟢 GDPR      │ 🔵 NIST      │
│ │ 73/100 (73%) │ 85/100 (85%) │ 92/100 (92%) │ 68/100 (68%) │
│ │ Status: ⚠️   │ Status: ✓~   │ Status: ✓    │ Status: ⚠️   │
│ │ [View]       │ [View]       │ [View]       │ [View]       │
│ └──────────────┴──────────────┴──────────────┴──────────────┘
│
│ ┌─ Overall Compliance Trend (30 days) ───────────────────────────────────────┐
│ │ [Recharts LineChart: 4 lines (PCI, HIPAA, GDPR, NIST)]                    │
│ │ Y-axis: Compliance % | X-axis: Days                                        │
│ └────────────────────────────────────────────────────────────────────────────┘
└──────────────────────────────────────────────────────────────────────────────┘

┌─ PCI-DSS TAB ─────────────────────────────────────────────────────────────────┐
│ Overall Score: 73% | Grade: C | Status: ⚠️ NON-COMPLIANT                    │
│ Last Assessment: 2026-05-15 | Next Due: 2026-06-15                           │
│
│ Requirements Breakdown:
│ ┌────────────────────────────────────────────────────────────────────────────┐
│ │ Requirement    │ Score │ Status │ Critical Gaps                           │
│ ├────────────────────────────────────────────────────────────────────────────┤
│ │ Req 1: Firewall│ 100%  │ ✓      │ None                                    │
│ │ Req 2: Default │ 95%   │ ✓      │ 1 device with default password         │
│ │ Req 3: Encrypt │ 60%   │ ⚠️      │ Data at rest NOT encrypted (5 servers) │
│ │ Req 4: Transport│95%   │ ✓      │ 1 API endpoint using HTTP              │
│ │ Req 5: Malware │ 85%   │ ✓      │ 15 endpoints not scanned yet           │
│ │ Req 6: Secure  │ 40%   │ ❌      │ Patch management incomplete (23 CVEs)  │
│ │ ... (all 12 requirements)                                                 │
│ └────────────────────────────────────────────────────────────────────────────┘
│
│ Risk Items (sorted by severity):
│ ┌────────────────────────────────────────────────────────────────────────────┐
│ │ [🔴 CRITICAL] Unencrypted data on 5 servers — CVE-2024-XXXXX             │
│ │  → Remediation: Enable encryption | Target: 2026-06-01 | Owner: DBA Team │
│ │
│ │ [🟠 HIGH] 23 vulnerabilities with CVSS > 7.0                              │
│ │  → Remediation: Apply patches | Target: 2026-05-28 | Owner: SysAdmin     │
│ │
│ │ [🟡 MEDIUM] Firewall logs retention only 30 days (req: 90)               │
│ │  → Remediation: Update retention | Target: 2026-06-15 | Owner: SOC Team  │
│ └────────────────────────────────────────────────────────────────────────────┘
│
│ Evidence & Audit Trail:
│ ┌────────────────────────────────────────────────────────────────────────────┐
│ │ [📋 Evidence Documents] [📊 Assessment Report] [🔒 Audit Log]             │
│ │ Recent activities:                                                         │
│ │  2026-05-21 10:30 - Config change: enable TLS on API (compliance+)        │
│ │  2026-05-20 15:45 - Vulnerability scan completed (23 findings)            │
│ │  2026-05-15 09:00 - Assessment started (admin@hospital.wu.ac.th)         │
│ └────────────────────────────────────────────────────────────────────────────┘
└──────────────────────────────────────────────────────────────────────────────┘

┌─ HIPAA TAB ────────────────────────────────────────────────────────────────────┐
│ (Similar to PCI-DSS, with HIPAA-specific requirements)
│ Security Rule: 85% | Privacy Rule: 88% | Breach Notification: 100%
│ ... (detailed requirement breakdown)
└──────────────────────────────────────────────────────────────────────────────────┘

┌─ GDPR TAB ─────────────────────────────────────────────────────────────────────┐
│ (Similar to PCI-DSS, with GDPR-specific articles)
│ Data Protection: 92% | Right of Access: 95% | Breach Notification: 90%
│ ... (detailed requirement breakdown)
└──────────────────────────────────────────────────────────────────────────────────┘
```

#### Data Integration
1. **Compliance scores:** Aggregated from:
   - Wazuh SCA (Security Configuration Assessment) results per agent
   - Custom compliance checks (rules mapped to PCI/HIPAA/GDPR)
   - OpenSearch alerts grouped by rule.pci_dss / rule.hipaa / rule.gdpr / rule.nist_800_53 / rule.tsc

2. **Each requirement:** 
   - Evaluate against Wazuh baseline
   - SCA agent results per server
   - Alert history related to that control

3. **Trend:** Historical compliance scores (7-30 day trend)

4. **Audit trail:** Custom compliance_events table in SQLite
   - Who changed what, when, why (tracked via API)

---

### 6️⃣ **Asset Inventory** — `/assets`
**Purpose:** Device inventory, IP-MAC binding, network sessions

#### Layout
```
┌──────────────────────────────────────────────────────────────────────────────┐
│ "สินทรัพย์เครือข่าย" (Network Assets)                                      │
│ Stats: 247 devices online | 12 new devices 24h | 3 IP conflicts | 8 warnings
└──────────────────────────────────────────────────────────────────────────────┘

┌─ MUI DataGrid: Device Inventory ──────────────────────────────────────────────┐
│ [Filter] [Search] [Export] [Bulk Action]                                    │
│
│ ┌──┬───────────┬─────────┬──────────────┬─────────┬────────┬──────────┬─────┤
│ │☐ │IP Address │MAC      │Hostname      │User     │Status  │Last Seen │Risk │
│ ├──┼───────────┼─────────┼──────────────┼─────────┼────────┼──────────┼─────┤
│ │☐ │10.251.60.1│A4:C3:F0 │LAPTOP-WRK01  │john.doe │● Online│2m ago    │🟢   │
│ │☐ │10.251.60.2│B5:D4:G1 │DESKTOP-ADM02 │admin    │● Online│1m ago    │🟡   │
│ │☐ │10.251.60.3│C6:E5:H2 │PRINTER-3     │         │● Online│5s ago    │🟢   │
│ │☐ │10.251.60.4│--       │UNKNOWN-01    │         │● Online│30s ago   │🔴   │
│ │☐ │10.251.60.5│D7:F6:I3 │SERVER-DB     │IT-Team  │● Online│Just now  │🟢   │
│ │  │           │         │ ...          │         │        │          │     │
│ └──┴───────────┴─────────┴──────────────┴─────────┴────────┴──────────┴─────┘
│
│ On row click: Side panel with device details
└──────────────────────────────────────────────────────────────────────────────┘

┌─ Device Detail Panel ─────────────────────────────────────────────────────────┐
│ Device: LAPTOP-WRK01 | 10.251.60.1 | A4:C3:F0:AB:CD:12
│
│ ┌─ Identity ────────────────────────┐  ┌─ Status ──────────────────────────┐
│ │ User: john.doe                    │  │ Status: ● Online                  │
│ │ DHCP Lease: Active                │  │ Last Seen: 2 minutes ago          │
│ │  Duration: 7h 45m                 │  │ Uptime: 5 days 12h 30m           │
│ │  Lease End: 2026-05-21 22:00 UTC  │  │ OS: Windows 10 Pro                │
│ │ Default GW: 10.251.60.1           │  │ Device: Dell Latitude 5430        │
│ │ VLAN: 100 (STAFF)                 │  │ Serial: 1A2B3C4D                  │
│ └───────────────────────────────────┘  └───────────────────────────────────┘
│
│ ┌─ Network ────────────────────────────────────────────────────────────────┐
│ │ AP Connected: AP-2.4GHz-MAIN | Signal: -65 dBm | Speed: 54 Mbps        │
│ │ Active Connections:                                                     │
│ │  - TCP 22 (SSH) ← 192.168.1.5 (Your admin box)                        │
│ │  - TCP 443 (HTTPS) → 10.251.151.13 (OpenSearch)                       │
│ │  - UDP 53 (DNS) → 10.251.1.1 (Internal DNS)                           │
│ └─────────────────────────────────────────────────────────────────────────┘
│
│ ┌─ Alert History ───────────────────────────────────────────────────────────┐
│ │ 156 alerts in last 7 days | Top: Brute Force (23), IDS (12), Other (121)│
│ │ [Timeline sparkline showing alert volume]                                │
│ │ Most recent: 14:23 UTC - SSH Failed Login (Level 7)                     │
│ └───────────────────────────────────────────────────────────────────────────┘
│
│ ┌─ Risk Score ──────────────────────────────────────────────────────────────┐
│ │ Overall Risk: 🟡 MEDIUM (6/10)                                          │
│ │ • Failed login attempts (3x in 24h) → +2                                │
│ │ • External IP in threat list → +2                                       │
│ │ • No EDR agent detected → +2                                            │
│ │ [Investigate] [Quarantine] [Block] [Monitor]                           │
│ └───────────────────────────────────────────────────────────────────────────┘
│
│ [🔍 Investigate] [🗺️ Map] [📋 Export] [⚠️ Alert] [🔒 Isolate]
└──────────────────────────────────────────────────────────────────────────────┘
```

#### Data Integration
1. **Device list:** 
   - DHCP logs (last assignment per MAC)
   - WiFi/AP logs (current sessions)
   - Syslog host discovery
   - Agent list from Wazuh

2. **Device details:**
   - MAC → IP-MAC binding history (SQLite table)
   - OS detection from Shodan or EDR
   - Network connections (netstat / tcpdump if available)
   - Alert history (last 7 days)

3. **Risk score:** 
   - Alert count + types
   - Threat intel hits
   - Compliance violations
   - Custom risk formula

---

### 7️⃣ **KPI & Reporting** — `/kpi`
**Purpose:** Executive-level metrics, trends, SLA reporting

#### Layout
```
┌──────────────────────────────────────────────────────────────────────────────┐
│ "KPI ประสิทธิภาพการทำงาน" (Performance Metrics)                              │
│ Time Range: [Last 7 days ▼] | [Apply] | Export: [CSV] [PDF] [Dashboard]   │
└──────────────────────────────────────────────────────────────────────────────┘

┌─ Big 3 Metrics (Hero Section) ────────────────────────────────────────────────┐
│
│ ┌──────────────────┬──────────────────┬──────────────────┐
│ │    MTTD          │     MTTR         │    FP Rate       │
│ │  (Mean Time To   │  (Mean Time To   │   (False Positive│
│ │   Detect)        │   Remediate)     │    Rate)         │
│ │                  │                  │                  │
│ │     2.3 h        │      8.1 h       │      3.2%        │
│ │   ↓ 12% vs last  │   ↑ 5% vs last   │   ↓ 0.5% vs last│
│ │   week           │   week           │   week           │
│ │                  │                  │                  │
│ │   🟢 Green       │   🟡 Yellow      │   🟢 Green       │
│ │  (Target: <4h)   │  (Target: <6h)   │  (Target: <5%)   │
│ └──────────────────┴──────────────────┴──────────────────┘
│
└──────────────────────────────────────────────────────────────────────────────┘

┌─ 30-Day Alert Volume (Bar Chart) ─────────────────────────────────────────────┐
│ [Recharts BarChart stacked by severity]                                      │
│ Y-axis: Count | X-axis: Date                                                 │
│ Legend: [🔴 Critical] [🟠 High] [🟡 Medium] [🟢 Low]                         │
│
│ Insight: Peak on 2026-05-15 (2,345 alerts total) — Wazuh scan day           │
└──────────────────────────────────────────────────────────────────────────────┘

┌─ Alert Distribution by Level (Pie Chart) ─────────────────────────────────────┐
│                    🟢 Low: 45,678 (82%)                                       │
│                    🟡 Medium: 8,234 (15%)                                     │
│                    🟠 High: 2,145 (3.8%)                                      │
│                    🔴 Critical: 123 (0.2%)                                    │
└──────────────────────────────────────────────────────────────────────────────┘

┌─ Alert Volume by Source (Line Chart — 30 days) ────────────────────────────────┐
│ [Recharts LineChart — multiple lines, one per source]                        │
│ Sources: [Fortigate] [Suricata] [Syslog] [SSH] [IDS] [Other]               │
│ Peak: Fortigate on 2026-05-10 (1,234 alerts)                                 │
└──────────────────────────────────────────────────────────────────────────────┘

┌─ Top 20 Alert Rules (Table) ──────────────────────────────────────────────────┐
│ ┌──┬───────┬─────────────────────┬──────┬──────┬────────┬──────┬──────────┤
│ │  │Rank   │Rule Description     │Level │Count │Trend   │MTTD  │Status   │
│ ├──┼───────┼─────────────────────┼──────┼──────┼────────┼──────┼──────────┤
│ │  │1      │Brute force attack   │12    │234   │↑↑ 45%  │1.2h  │🔴 Active│
│ │  │2      │IDS - Suspicious SQL │14    │178   │↓ 12%   │2.1h  │✓ Tuned  │
│ │  │3      │Failed FW rule       │5     │156   │→ 0%    │<1m   │→ Info   │
│ │  │...    │                     │      │      │        │      │         │
│ │  │20     │SSH key reuse        │7     │12    │↑ 8%    │0.5h  │□ Monitor│
│ └──┴───────┴─────────────────────┴──────┴──────┴────────┴──────┴──────────┘
└──────────────────────────────────────────────────────────────────────────────┘

┌─ SLA Compliance & Service Levels ─────────────────────────────────────────────┐
│ SLA Target: 99.5% availability | Current: 99.8% ✓                           │
│ Alert Response: <4h for Critical | Achieved: 100% ✓                         │
│ Alert Resolution: <6h for High | Achieved: 87% ⚠️                           │
│ System Uptime: 27 days 18h 45m (last reboot: 2026-04-23)                    │
└──────────────────────────────────────────────────────────────────────────────┘

┌─ MTTD Trend (Last 30 days, scatter plot) ─────────────────────────────────────┐
│ [Recharts ScatterChart — X: Date, Y: MTTD (hours)]                          │
│ Trend line: ↓ Improving over time (avg 2.3h, down from 3.1h last month)     │
└──────────────────────────────────────────────────────────────────────────────┘

┌─ Export & Actions ────────────────────────────────────────────────────────────┐
│ [📥 Download PDF Report] [📊 Embed in Grafana] [📧 Email to CISO]           │
│ [🔔 Set Alert Threshold] [📋 Scheduled Reports]                             │
└──────────────────────────────────────────────────────────────────────────────┘
```

#### Data Integration
1. **MTTD:** Avg time from first alert to analyst acknowledgment
   - Query: `(ack_time - alert_time)` for each alert, then average per rule

2. **MTTR:** Avg time from ack to resolution (manual field or auto-detection from rule deactivation)

3. **FP Rate:** % of alerts marked as false positive or tuned
   - Formula: `(fp_count / total_count) * 100`

4. **30-day trend:** Historical records in SQLite kpi_history table
   - Hourly or daily snapshots

5. **Top rules:** `terms aggregation` on `rule.id` in OpenSearch

---

### 8️⃣ **Administration** — `/admin`
**Purpose:** System configuration, rule management, user management

#### Subpages

**A. Rules Manager** (`/admin/rules`)
```
3-panel layout:
  [File tree (220px)] | [Monaco Editor (flex)] | [Inspector (260px)]

Left:  Rule XML files from /var/ossec/rules/
Mid:   Full rule XML with syntax highlighting
Right: Rule metadata (ID, level, groups, MITRE, compliance tags)
        + Validate button + Save + Deploy & Restart
```

**B. Alert Tuning** (`/admin/tuning`)
```
Manage rule threshold adjustments:
  - Original level vs tuned level
  - Reason + date added + review status
  - Revert button (restore to original)
```

**C. Alert Configuration** (`/admin/config`)
```
- Telegram bot settings (token, chat ID) ← masked input
- Alert level threshold for Telegram notification (e.g., ≥ 12)
- Email recipients
- Slack webhook
- Custom alert routing rules
```

**D. User Management** (`/admin/users`) — SuperAdmin only
```
MUI DataGrid:
  - username | email | role | last_login | actions
  - Add user dialog: username, email, role selector, send temp password
  - Edit: change role, disable/enable
  - Delete: soft delete with audit log
```

**E. Audit Log** (`/admin/audit`) — SuperAdmin only
```
MUI DataGrid:
  - timestamp | username | action | target | ip_address | details
  - Filter by user/action/date range
  - Export CSV
  - Cannot delete (immutable)
```

---

## Navigation & Flows

### Navigation Model
```
┌─ Top-level Navbar (64px) ─────────────────────────────────┐
│ [Logo] SOC Center | [Search] [Alerts Badge] [Theme] [User]│
└───────────────────────────────────────────────────────────┘

┌─ Left Sidebar (256px on desktop, collapsible on mobile) ───┐
│ [Hospital Logo] Walailak Hospital                         │
│ ┌──────────────────────────────────────┐                  │
│ │ 🛡️  แดชบอร์ด (Dashboard)    [badge]   │                  │
│ │ 🚨 แจ้งเตือน (Alerts)      [badge]   │                  │
│ │ 🔍 สืบสวน (Investigate)              │                  │
│ │ 🌐 IOC Center                         │                  │
│ │ 📋 Compliance                         │                  │
│ │ 📊 Assets                             │                  │
│ │ 📈 KPI                                │                  │
│ │ ⚙️  Admin                             │ (admin only)     │
│ └──────────────────────────────────────┘                  │
│ ┌──────────────────────────────────────┐                  │
│ │ Cluster Status                       │                  │
│ │  ● Master-01  ✓ Active              │                  │
│ │  ● Worker-01  ✓ Active              │                  │
│ └──────────────────────────────────────┘                  │
└───────────────────────────────────────────────────────────┘

Mobile (< 768px):
  - Sidebar hidden by default
  - Hamburger menu in navbar
  - Drawer slides from left
```

### Key User Flows

**Flow 1: Triage New Alert**
```
1. User sees badge on Alerts (3 critical alerts waiting)
2. Click Alerts tab → DataGrid loads with newest first
3. Click row → side panel shows full alert + auto-enrichment
4. Review: threat intel, related events, correlation
5. Action: Acknowledge → investigate → escalate → close
```

**Flow 2: Investigate Incident**
```
1. From alert side panel: Click "Investigate IP" button
2. Navigate to /investigate
3. Auto-populate search field with IP
4. Results show: DHCP, WiFi, events, timeline, threat intel
5. Click related IP → drill deeper
6. Create case → assign to team member
```

**Flow 3: Daily SOC Standup**
```
1. Open Dashboard
2. Review KPI cards: MTTD, MTTR, FP rate
3. Check cluster health
4. View recent critical alerts
5. Export report for management meeting
```

---

## Component Library

### Core UI Components

1. **MetricCard** 
   - Title, value, trend (↑/↓/→), sparkline
   - Colors: critical/high/medium/low/info

2. **AlertBadge**
   - Pulsing animation when count > 0
   - Colored by severity
   - Show count

3. **SeverityBadge**
   - Level number mapped to color + icon
   - Hover: show description

4. **StatusDot**
   - 8px circle, colored by status (active/offline/warning/error)
   - Optional pulse animation

5. **IPAddress**
   - Monospace font
   - Clickable → /investigate
   - Hover: show threat score

6. **DataGrid**
   - MUI DataGrid with custom styling
   - Sortable, filterable, selectable rows
   - Virtual scrolling for large datasets

7. **Timeline**
   - Recharts AreaChart or LineChart
   - Stacked by category/severity
   - Tooltip on hover

8. **WorldMap**
   - React Simple Maps
   - Markers for attack origins
   - Tooltip with country name + count

9. **DetailPanel**
   - MUI Drawer or modal-like panel
   - Tabs for different data sections
   - Action buttons at bottom

10. **AlertMessage**
    - Success/warning/error/info
    - Icon + message + dismiss button

### Design System Files (in codebase)
```
src/
  components/
    common/
      MetricCard.jsx
      AlertBadge.jsx
      SeverityBadge.jsx
      StatusDot.jsx
      IPAddress.jsx
      DetailPanel.jsx
      DataGrid.jsx
      AlertMessage.jsx
      LoadingSpinner.jsx
      EmptyState.jsx
    charts/
      AlertTimeline.jsx
      AlertDonut.jsx
      WorldMap.jsx
      KPIChart.jsx
    layout/
      Navbar.jsx
      Sidebar.jsx
      Layout.jsx
  theme/
    colors.js
    typography.js
    spacing.js
    createTheme.js
```

---

## Mobile & Responsive Design

### Breakpoints
```
Mobile    (< 640px)  : Stack all components vertically
Tablet    (640-1024) : 2-column layouts, mini-drawer
Desktop   (> 1024)   : Full 3-column, permanent drawer
```

### Responsive Adjustments per Page
- **Dashboard:** KPI cards stack on mobile, charts take full width, map hidden on small
- **Alerts:** DataGrid columns hidden (show only: time, level, description), side panel full-screen
- **Investigation:** Search bar full width, tabs below
- **KPI:** Charts smaller, tables scroll horizontally

### Touch-Friendly
- Buttons: min 48x48px
- Inputs: min 44px height
- Spacing: increased on mobile (16px → 24px)

---

## Dark/Light Mode

### Implementation
- Tailwind `darkMode: 'class'` strategy
- Class `.dark` on `<html>` toggles theme
- MUI theme with dark/light palettes
- User preference saved to `localStorage: 'soc_theme_mode'`
- System preference as fallback on first visit

### Colors per Theme
- **Dark mode (default):** BG-0 #060c17, text #f0f4ff
- **Light mode:** BG-0 #f8fafc, text #1e293b
- **Status colors:** Same in both modes (semantic, not theme-relative)

---

## Performance & Accessibility

### Performance Goals
- **First Contentful Paint:** < 2s
- **Time to Interactive:** < 4s
- **Lighthouse score:** ≥ 90

### Strategies
1. **Code splitting:** Lazy-load pages, load-on-demand modals
2. **Image optimization:** WebP format, responsive sizes
3. **API caching:** React Query with `staleTime: 30s`, localStorage for user prefs
4. **Virtual scrolling:** DataGrid with 1000+ rows
5. **Debounced search:** 300ms delay on /investigate search
6. **WebSocket pooling:** Single persistent connection for alerts

### Accessibility (WCAG 2.1 AA)
- Keyboard navigation: Tab, Enter, Escape, Arrow keys
- Color contrast: Minimum 4.5:1 for text
- ARIA labels on all interactive elements
- Focus indicators: 2px solid outline
- Error messages: Associated with inputs via `aria-describedby`
- Form labels: Explicit `<label htmlFor>` tags
- Semantic HTML: `<button>`, `<nav>`, `<main>`, `<aside>`

---

## Implementation Roadmap

### Phase 1 (Week 1-2)
- [ ] Dashboard fully functional with real Wazuh data
- [ ] Alert Management table with side panel
- [ ] Navigation complete, routing working

### Phase 2 (Week 3-4)
- [ ] Investigation page with all tabs
- [ ] IOC search and custom IOC management
- [ ] Compliance summary + PCI-DSS detail

### Phase 3 (Week 5-6)
- [ ] Asset inventory with device details
- [ ] KPI page with all charts
- [ ] Admin panel: Rules, Tuning, Users

### Phase 4 (Week 7-8)
- [ ] Mobile responsive refinement
- [ ] Performance optimization
- [ ] Accessibility audit & fixes
- [ ] User testing & feedback iteration

---

## Deployment & Monitoring

### Live Environment
```
URL:     https://10.251.150.222:3348/wazuh
Frontend: React SPA (Vite build)
Backend: FastAPI (Python 3.12)
Database: SQLite (Docker volume)
Proxy:   Nginx (TLS)
```

### Health Checks
- Endpoint: `GET /api/health` → `{"status":"ok","app":"SOC Center"}`
- Monitoring: Backend healthcheck every 30s
- Alert: If health check fails 3x, escalate to SOC

### Logging & Observability
- Backend logs: stdout (Docker Compose logs)
- Frontend errors: localStorage + send to backend
- Audit log: All user actions in SQLite audit_log table
- Metrics: Prometheus (optional future enhancement)

---

## Success Criteria

✅ **Functional:**
- All 8 pages load and display real data within < 4s
- Data updates in real-time via WebSocket
- Drill-down navigation (dashboard → alert → investigation) smooth
- Search and filters responsive (< 1s)

✅ **User Experience:**
- Dark mode default, toggle works instantly
- Mobile view fully functional on iPhone/Android
- No 404 or JS errors in console
- Keyboard navigation complete

✅ **Data Integrity:**
- All Wazuh fields displayed correctly (no truncation)
- Threat intel enrichment accurate (cross-verify with manual lookups)
- Compliance scores match backend calculations
- Audit log immutable

✅ **Performance:**
- Lighthouse > 90 (desktop & mobile)
- Alert load time < 1s
- DataGrid scroll smooth (60 FPS)

✅ **Security:**
- JWT auth required for all pages
- HTTPS only
- CORS headers correct
- No sensitive data in localStorage (token in httpOnly cookie)

---

## Support & Maintenance

- **Documentation:** README.md + API docs (Swagger)
- **Support Email:** soc-team@hospital.wu.ac.th
- **On-call:** SOC Manager on-call schedule
- **Backup:** Daily automated backup (demo: `/backups/`)
- **Updates:** Patch Tuesday (2nd Tuesday of month)

---

**Document Version:** 2.0  
**Last Updated:** May 21, 2026  
**Status:** ✅ Ready for Implementation  
**Approval:** SOC Manager + IT Director

---

*For questions or updates, contact: SOC Architecture Team*
