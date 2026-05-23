# SOC Center — Design System Documentation

> Version 2.0 · โรงพยาบาลวลัยลักษณ์ มหาวิทยาลัยวลัยลักษณ์

---

## 1. Brand Colors (ธีมสี)

| Token | Value | ความหมาย |
|-------|-------|----------|
| **Primary (Purple)** | `#7B5BA4` | สีหลักของแบรนด์ |
| Primary Light | `#9B7DC4` | สีหลักอ่อน |
| Primary Dark | `#5A3E85` | สีหลักเข้ม |
| **Secondary (Orange)** | `#F17422` | สีรองของแบรนด์ |
| Secondary Light | `#FF9642` | สีรองอ่อน |
| Secondary Dark | `#D05810` | สีรองเข้ม |

### Severity Colors (ระดับความรุนแรง Wazuh)

| ระดับ | สี | Wazuh Rule Level |
|-------|-----|-----------------|
| Critical | `#EF4444` (Red) | 15+ |
| High | `#F17422` (Orange) | 12–14 |
| Medium | `#EAB308` (Yellow) | 7–11 |
| Low | `#22C55E` (Green) | 1–6 |
| Info | `#38BDF8` (Sky) | — |

---

## 2. Typography (ฟอนต์)

```
Primary Font:  IBM Plex Sans Thai (Thai subset)
Fallback:      IBM Plex Sans → system-ui → sans-serif
Monospace:     IBM Plex Mono (สำหรับ IP, Timestamp, Code)
```

แพ็กเกจ: `@fontsource/ibm-plex-sans-thai@5.2.8` (self-hosted, ไม่ต้อง internet)

---

## 3. Dark / Light Mode

รองรับ 3 รูปแบบ:
1. **Toggle** — ปุ่มใน Topbar (dark ↔ light)
2. **System** — ตาม `prefers-color-scheme` อัตโนมัติ
3. **Persistent** — จำสถานะใน `localStorage` (key: `soc-theme-mode`)

### Dark Mode Surfaces
| Token | Color | ใช้กับ |
|-------|-------|--------|
| `background.default` | `#0C0A14` | พื้นหลังหลัก |
| `background.paper` | `#16122A` | Card/Panel |
| Sidebar | `#130F22 → #0E0B18` | Gradient |
| Divider | `rgba(123,91,164,0.15)` | เส้นแบ่ง |

### Light Mode Surfaces
| Token | Color | ใช้กับ |
|-------|-------|--------|
| `background.default` | `#F5F3FF` | พื้นหลักหลัก (Purple tint) |
| `background.paper` | `#FFFFFF` | Card/Panel |

---

## 4. หน้า (Pages) และเมนู

| เมนู (Thai) | เมนู (EN) | Path | ความหมาย |
|-------------|-----------|------|---------|
| **ภาพรวม** | Dashboard | `/` | สรุปสถานะระบบทั้งหมดแบบ Real-time |
| **การแจ้งเตือน** | Threat Alerts | `/alerts` | รายการ Alert จาก Wazuh (filter ได้ตาม level/time) |
| **วิเคราะห์เหตุการณ์** | Investigate | `/investigate` | ค้นหา IP/Hash/Domain เจาะลึก event log |
| **ตรวจจับภัยคุกคาม** | IOC Lookup | `/ioc` | ตรวจสอบ Indicator of Compromise (IOC) |
| **มาตรฐาน & Compliance** | Compliance | `/compliance` | ตรวจสอบมาตรฐาน PCI-DSS, HIPAA, NIST, CIS |
| **อุปกรณ์เครือข่าย** | Network Assets | `/assets` | รายการ Agent/Device ใน Wazuh |
| **ตัวชี้วัดผลงาน** | KPI & Metrics | `/kpi` | กราฟแนวโน้ม Alert 30 วัน |
| **ตั้งค่าระบบ** | Administration | `/admin` | จัดการผู้ใช้, Rule Editor (Admin เท่านั้น) |

---

## 5. ข้อมูลจาก Wazuh ที่แสดงผล

### Dashboard
- **Alert Stats**: total, critical, high, medium, low (จาก OpenSearch aggregation)
- **Timeline Chart**: จำนวน alert รายชั่วโมง/วัน
- **Attack Map**: ประเทศต้นทางโจมตี (GeoIP)
- **Source Pie**: แหล่งที่มา log (Firewall, Syslog, etc.)
- **Cluster Health**: สถานะ Wazuh Manager nodes

### Alerts
- Rule Level 1–15 พร้อม filter
- MITRE ATT&CK tags
- Source IP, Destination, Agent name
- Real-time via WebSocket (`/ws/alerts`)

### Compliance
- **Framework**: PCI-DSS, HIPAA, NIST 800-53, CIS Benchmarks
- **SCA** (Security Configuration Assessment): ผลตรวจสอบ config ของ Agent
- **Vulnerabilities**: CVE ที่พบใน Agent
- Export CSV/JSON

### Assets
- Wazuh Agents (active/disconnected/never connected)
- DHCP history (IP lease tracking)
- Wi-Fi sessions (Huawei AC log)

---

## 6. Component Architecture

```
src/
├── components/
│   ├── auth/         LoginPage.jsx       — หน้า Login (split-screen design)
│   ├── layout/       Layout, Sidebar, Topbar  — โครงสร้างหลัก
│   ├── dashboard/    DashboardPage.jsx   — ภาพรวม
│   ├── alerts/       AlertsPage.jsx      — การแจ้งเตือน
│   ├── investigate/  InvestigatePage.jsx — วิเคราะห์เหตุการณ์
│   ├── ioc/          IOCPage.jsx         — ตรวจจับภัยคุกคาม
│   ├── compliance/   CompliancePage.jsx  — มาตรฐาน & Compliance
│   ├── assets/       AssetsPage.jsx      — อุปกรณ์เครือข่าย
│   ├── kpi/          KPIPage.jsx         — ตัวชี้วัดผลงาน
│   └── admin/        AdminPage.jsx       — ตั้งค่าระบบ
├── theme/
│   ├── muiTheme.js   — MUI theme (purple/orange palette)
│   └── ThemeContext.jsx — Dark/Light mode context
├── services/
│   └── api.js        — Axios API client
├── hooks/
│   └── useAuth.js    — Authentication hook
└── index.css         — IBM Plex Sans Thai, CSS variables
```

---

## 7. Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend Framework | React 18 + Vite 5 |
| Type Support | TypeScript (tsconfig added) |
| UI Library | MUI v9 (Material UI) |
| Styling | Tailwind CSS v3 |
| State/Cache | TanStack Query v5 |
| Routing | React Router v7 |
| Charts | Recharts v3 + MUI X Charts v9 |
| Map | React Leaflet v4 |
| Font | IBM Plex Sans Thai (fontsource) |
| HTTP | Axios v1 |
| Backend | FastAPI + Wazuh API + OpenSearch |

---

## 8. Role-Based Access Control

| Role | ภาษาไทย | สิทธิ์ |
|------|---------|--------|
| `superadmin` | Super Admin | ทุกหน้า รวม Admin |
| `admin` | ผู้ดูแลระบบ | ทุกหน้า รวม Admin |
| `analyst` | นักวิเคราะห์ | ทุกหน้า ยกเว้น Admin |
| `viewer` | ผู้ชม | Dashboard, Alerts, KPI |

---

## 9. Build & Deploy

```bash
# Development
cd web_app/frontend
npm run dev

# Production build
npm run build

# Build output → dist/
# Deploy via Nginx (nginx/nginx.conf)
```

### Environment Variables
```
VITE_API_BASE_URL=/wazuh/api
VITE_BASE_PATH=/wazuh
```

---

## 10. Test Results

```
Backend (pytest):  5/5 PASSED
Frontend (build):  ✓ Built successfully (no errors)
```
