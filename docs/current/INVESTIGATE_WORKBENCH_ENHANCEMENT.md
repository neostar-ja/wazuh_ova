# SOC Investigation Workbench Enhancement

**Version:** 2.0  
**Date:** 2026-06-04  
**Status:** Implemented

---

## Overview

เพิ่มความสามารถของ Investigate Page จาก Entity Forensics ธรรมดาไปเป็น **SOC Investigation Workbench** ที่รวม data source ทั้งหมดเข้าด้วยกัน พร้อม panels ใหม่ 7 ชิ้น

---

## Data Flow

```
User ค้นหา entity (IP/MAC/User/Host)
         │
         ▼
┌─────────────────────────────────────────┐
│        InvestigatePageV2 (React)        │
│  parallel queries:                      │
│  1. GET /investigate          (main)    │
│  2. GET /investigate/iris-context       │
│  3. GET /investigate/enrich             │
│  4. GET /investigate/sources/health     │
│  5. GET /investigate/sources/coverage   │
│  (lazy) GET /investigate/netflow        │
│  (lazy) GET /investigate/dns            │
│  (lazy) GET /investigate/dhcp           │
│  (lazy) GET /investigate/nac            │
│  (lazy) GET /investigate/risk           │
└─────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│        Backend (FastAPI)                │
│  routers/investigate.py                 │
│  services/opensearch_service.py         │
│  services/enrichment_service.py         │
│  services/soar_svc.py                   │
└─────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  Data Sources                           │
│  • OpenSearch (wazuh-alerts-4.x-*)      │
│    - Wazuh alerts (all)                 │
│    - Infoblox DNS (predecoder=named)    │
│    - Infoblox DHCP (data.dhcp_action)   │
│    - Huawei NAC (predecoder=huawei-ac)  │
│    - Firewall logs (FortiGate)          │
│  • DFIR-IRIS API                        │
│  • AbuseIPDB / OTX / VT / Shodan       │
│  • MISP                                 │
│  • Shuffle SOAR                         │
└─────────────────────────────────────────┘
```

---

## Network Identity Schema

Field ต่อไปนี้ใช้เป็น schema กลางสำหรับ correlate events ข้าม sources:

| Field | Source | Description |
|-------|--------|-------------|
| `dns.question.name` | Infoblox DNS | Domain queried |
| `dns.response_code` | Infoblox DNS | NOERROR, NXDOMAIN, SERVFAIL |
| `dhcp.lease_ip` | DHCP server | Assigned IP |
| `client.ip` | Any | Client IP address |
| `client.mac` | DHCP/NAC | MAC address |
| `client.hostname` | DHCP | Hostname registered |
| `user.name` | Wazuh/NAC | Authenticated username |
| `network.vlan.id` | NAC | VLAN assignment |
| `network.device.name` | NAC | Switch/AP name |
| `network.interface.name` | NAC | Port/SSID |
| `event.dataset` | Any | Log source dataset |
| `observer.vendor` | Any | Infoblox/Huawei/FortiGate |
| `observer.product` | Any | NIOS/Agile-Controller/etc |

---

## New API Endpoints

### GET /api/investigate/sources/health

ตรวจสอบ configuration status ของทุก data source

**Response:**
```json
{
  "sources": [
    {
      "id": "infoblox_dns",
      "name": "Infoblox DNS",
      "vendor": "Infoblox",
      "configured": true,
      "status": "online",
      "label": "1,234 events",
      "event_count_7d": 1234
    }
  ],
  "total": 13,
  "configured": 8,
  "not_configured": 5,
  "checked_at": "2026-06-04T10:00:00"
}
```

### GET /api/investigate/sources/coverage?q=&type=&range=

ตรวจสอบว่า entity ที่ค้นหามีข้อมูลใน source ใดบ้าง

**Parameters:**
- `q` – entity value (IP, MAC, user, etc.)
- `type` – ip|mac|auto
- `range` – time range (default: 7d)

**Response:**
```json
{
  "query": "10.251.65.217",
  "coverage": {
    "wazuh":         { "has_data": true,  "count": 145 },
    "infoblox_dns":  { "has_data": true,  "count": 23  },
    "infoblox_dhcp": { "has_data": false, "count": 0   },
    "huawei_nac":    { "has_data": true,  "count": 8   }
  }
}
```

### GET /api/investigate/dns?q=&range=

Query DNS logs สำหรับ entity

**Response:**
```json
{
  "count": 23,
  "events": [...],
  "top_query_names": [{"name": "evil.com", "count": 5}],
  "response_codes": [{"code": "NXDOMAIN", "count": 3}],
  "rpz_blocks": [{"timestamp": "...", "query_name": "evil.com", "action": "BLOCK"}],
  "has_malicious": true
}
```

### GET /api/investigate/dhcp?q=&range=

Query DHCP lease history

**Response:**
```json
{
  "count": 8,
  "leases": [{"timestamp": "...", "action": "ACK", "ip": "10.1.2.3", "mac": "aa:bb:...", "hostname": "host01"}],
  "ip_history": [{"ip": "10.1.2.3", "count": 5}],
  "mac_history": [{"mac": "aa:bb:cc:dd:ee:ff", "count": 5}]
}
```

### GET /api/investigate/nac?q=&range=

Query Huawei Agile Controller / NAC authentication logs

**Response:**
```json
{
  "count": 8,
  "sessions": [{
    "timestamp": "...",
    "auth_result": "success",
    "ip": "10.1.2.3",
    "mac": "aa:bb:cc:dd:ee:ff",
    "user": "john.doe",
    "vlan": "100",
    "switch": "10.1.1.1",
    "policy": "Employee-Access"
  }],
  "has_posture_fail": false
}
```

### GET /api/investigate/risk?q=&time_range=

คำนวณ Risk Score แบบ explainable

**Response:**
```json
{
  "query": "10.251.65.217",
  "score": 7.5,
  "level": "high",
  "factors": [
    {
      "key": "alert_severity",
      "label": "ความรุนแรงของ Alert",
      "description": "Critical 3 · High 8 · Medium 12",
      "score": 35,
      "max": 40,
      "color": "#EF4444"
    }
  ]
}
```

---

## Infoblox Integration

### Architecture

```
Infoblox NIOS → syslog → Wazuh Agent → OpenSearch
                         (decoder: infoblox)
```

### Wazuh Decoder Setup (ถ้ายังไม่ได้ตั้งค่า)

สร้างไฟล์ `/var/ossec/etc/decoders/infoblox.xml`:
```xml
<decoder name="infoblox-dns">
  <program_name>named</program_name>
  <regex>client @0x\S+ (\S+)#\d+ \(\S+\): query: (\S+) IN (\S+)</regex>
  <order>src_ip, query_name, query_type</order>
</decoder>

<decoder name="infoblox-dhcp">
  <program_name>dhcpd</program_name>
  <regex>DHCPACK on (\S+) to (\S+) \((\S+)\)</regex>
  <order>dhcp_ip, dhcp_mac, dhcp_hostname</order>
</decoder>
```

### Environment Variables

```env
INFOBLOX_URL=https://infoblox.hospital.wu.ac.th
INFOBLOX_USER=admin
INFOBLOX_PASS=your_password
```

### OpenSearch Index Mapping

DNS events จะอยู่ใน `wazuh-alerts-4.x-*` โดยมี:
- `predecoder.program_name`: `named` หรือ `infoblox-dns`
- `data.src_ip`: client IP
- `data.query_name`: domain ที่ query
- `data.query_type`: A, AAAA, MX, TXT, etc.
- `data.response_code`: NOERROR, NXDOMAIN, SERVFAIL
- `data.action`: ALLOW, BLOCK (RPZ)
- `data.policy`: RPZ policy name

---

## Huawei Agile Controller / NAC Integration

### Architecture

```
Huawei Agile Controller → syslog → Wazuh Agent → OpenSearch
                          (decoder: huawei-ac)
```

### Wazuh Decoder Setup (ตัวอย่าง)

สร้างไฟล์ `/var/ossec/etc/decoders/huawei_nac.xml`:
```xml
<decoder name="huawei-nac-auth">
  <program_name>huawei-nac</program_name>
  <regex>User (\S+) MAC (\S+) IP (\S+) auth-result (\S+) policy (\S+)</regex>
  <order>dstuser, mac, srcip, auth_result, policy_name</order>
</decoder>
```

### Environment Variables

```env
HUAWEI_NAC_URL=https://nac.hospital.wu.ac.th:8443
HUAWEI_NAC_USER=admin
HUAWEI_NAC_PASS=your_password
```

### OpenSearch Fields

- `predecoder.program_name`: `huawei-nac` หรือ `huawei-ac`
- `data.srcip`: Client IP
- `data.mac`: Client MAC address
- `data.dstuser` หรือ `data.srcuser`: Username
- `data.vlan_id` หรือ `data.vlan_name`: VLAN assignment
- `data.switch_ip` หรือ `data.nasip`: NAS/Switch IP
- `data.ap_name`: AP name (สำหรับ WiFi)
- `data.auth_type`: 802.1X, MAC, Web Portal
- `data.auth_result`: success, fail, reject, timeout
- `data.posture_result`: pass, fail, quarantine
- `data.policy_name`: NAC policy name
- `data.ac_msg_type`: auth, deauth, roam, reassoc

---

## UI Panels

### 1. Data Source Coverage Panel
- แสดงสถานะทุก source (13 sources)
- Legend: มีข้อมูล / พร้อมใช้งาน / ไม่พบข้อมูล / ยังไม่เชื่อมต่อ
- ถ้า source ยังไม่ configured แสดง "ยังไม่ได้เชื่อมต่อ" — **ห้ามแสดงข้อมูลปลอม**

### 2. DNS / DHCP Tab (Tab 5)
- Sub-tab: DNS Queries | DHCP Leases
- DNS: RPZ block list, top queries, response code distribution
- DHCP: lease history table, action breakdown, IP/MAC association
- Alert badge เมื่อพบ RPZ blocks

### 3. Network Access Tab (Tab 6)
- NAC session table (timestamp, auth result, user, IP, MAC, VLAN, switch/AP)
- Auth result breakdown chart
- Quarantine/Block events highlight
- Posture result summary
- Alert badge เมื่อพบ posture failure

### 4. Risk Analysis Tab (Tab 7)
- Semi-circular gauge แสดงคะแนน 0.0-10.0
- Factor breakdown แต่ละปัจจัย (ภาษาไทย)
- 6 factors: Alert Severity, Threat Intel, MISP, DNS Block, NAC Posture, Critical CVE
- Formula explanation

### 5. Entity Graph Tab (Tab 8)
- SVG hub-and-spoke graph
- Center: entity ที่ค้นหา
- Inner ring: IP, MAC, User, Agent
- Outer ring: VLAN, Switch, MITRE tactic, IRIS case
- คลิก node → drill-down investigation

### 6. Actions Tab (Tab 9)
- IRIS: Create Case, Attach Evidence, Add IOC
- Shuffle: Run Playbook, Escalate, Block IP
- แสดง "ยังไม่ได้ตั้งค่า" ถ้า integration ยังไม่ configured

---

## IOC Enrichment Cache

Table `ioc_enrichment_cache` ใน SQLite:

```sql
CREATE TABLE ioc_enrichment_cache (
  id INTEGER PRIMARY KEY,
  ioc_value TEXT UNIQUE NOT NULL,
  ioc_type TEXT NOT NULL,
  abuseipdb_score INTEGER,
  otx_pulse_count INTEGER,
  virustotal_detections INTEGER,
  misp_matched BOOLEAN DEFAULT 0,
  shodan_ports TEXT,      -- JSON list
  raw_data TEXT,          -- JSON blob
  source_statuses TEXT,   -- JSON: {source: 'ok'|'error'|'not_configured'}
  created_at DATETIME,
  expires_at DATETIME     -- TTL: 6 hours default
);
```

- `/api/investigate/enrich` ตรวจสอบ cache ก่อน
- ถ้า cache hit (expires_at > now) → return cached data พร้อม `"cached": true`
- ถ้า cache miss → ดึงข้อมูลใหม่ แล้ว upsert cache
- Response รวม `cached_at`, `expires_at`, `source_statuses`

---

## Risk Score Formula

| Factor | Max Points | Source |
|--------|-----------|--------|
| Alert Severity | 40 | Wazuh level_dist |
| Threat Intel | 20 | AbuseIPDB score/100 × 20 |
| MISP Match | 10 | MISP API |
| DNS Block (RPZ) | 10 | Infoblox DNS |
| NAC Posture Fail | 10 | Huawei NAC |
| Critical CVE | 10 | Wazuh Vulnerability |
| **Total** | **100** | |

**Final Score = raw_score / 10** (0.0 – 10.0)

| Score | Level | Label |
|-------|-------|-------|
| ≥ 8.0 | critical | วิกฤต |
| ≥ 6.0 | high | สูง |
| ≥ 4.0 | medium | ปานกลาง |
| < 4.0 | low | ต่ำ |

---

## Test Cases

### TC-01: External Malicious IP

**Query:** `139.59.170.85`  
**Expected:**
- Wazuh: มี alerts (firewall deny/allow)
- Threat Intel: AbuseIPDB score สูง, OTX มี pulse
- DNS: อาจพบใน DNS query จาก internal hosts
- Risk: score สูง (≥6.0)
- Entity Graph: center=IP, branch=agents ที่เห็น IP นี้

### TC-02: Internal IP

**Query:** `10.251.65.217`  
**Expected:**
- Wazuh: alerts ตามปกติ
- DHCP: เห็น lease history
- NAC: เห็น auth sessions
- Threat Intel: is_private=true, score=0
- Risk: score ต่ำ (ถ้าไม่มี anomaly)

### TC-03: MAC Address

**Query:** `AA:BB:CC:DD:EE:FF`  
**Expected:**
- DHCP: lease history สำหรับ MAC นี้
- NAC: auth sessions สำหรับ MAC นี้
- Identity: related IPs ที่ MAC นี้เคยใช้
- Entity Graph: center=MAC, branches=IPs ที่ assigned

### TC-04: Username

**Query:** `john.doe`  
**Expected:**
- Wazuh: login/auth events
- NAC: network access sessions
- Entity Graph: center=user, branches=IPs และ MACs ที่ใช้

### TC-05: Domain

**Query:** `evil.com`  
**Expected:**
- DNS: query history จาก internal hosts
- Threat Intel: VirusTotal/OTX check
- RPZ: อาจถูก block

### TC-06: File Hash

**Query:** `d41d8cd98f00b204e9800998ecf8427e`  
**Expected:**
- Threat Intel: VirusTotal hash lookup
- Wazuh: FIM events ที่ match hash นี้
- Risk: คำนวณจาก VT detections

---

## Files Changed

### Backend
- `web_app/backend/app/core/config.py` — เพิ่ม Infoblox, Huawei NAC settings
- `web_app/backend/app/models/database.py` — เพิ่ม `IOCEnrichmentCache` model
- `web_app/backend/app/services/opensearch_service.py` — เพิ่ม `query_dns_events`, `query_dhcp_events`, `query_nac_events`, `count_source_events`
- `web_app/backend/app/routers/investigate.py` — เพิ่ม 5 endpoints ใหม่, update /enrich ให้ใช้ cache

### Frontend
- `web_app/frontend/src/types/investigate.ts` — เพิ่ม types ใหม่ทั้งหมด
- `web_app/frontend/src/components/investigate/v2/InvestigatePageV2.tsx` — เพิ่ม 5 tabs ใหม่
- **New files:**
  - `DataSourceCoveragePanel.tsx` — Source health + coverage panel
  - `DNSDHCPTab.tsx` — DNS query + DHCP lease tabs
  - `NACTab.tsx` — Network Access Control context
  - `RiskAnalysisTab.tsx` — Explainable risk scoring
  - `EntityGraphTab.tsx` — SVG entity relationship graph
  - `ActionsTab.tsx` — SOAR/IRIS actions panel

### Documentation
- `docs/current/INVESTIGATE_WORKBENCH_ENHANCEMENT.md` (this file)
