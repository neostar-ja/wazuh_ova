# SOC Center — SOAR & IR Page

**Completed:** 2026-05-26  
**URL:** https://10.251.150.222:3348/wazuh/soar  
**Route:** `/soar` (9th page, added after kpi)

---

## Overview

The SOAR & IR page integrates three security orchestration tools into a single dashboard tab:

| Tab | Tool | URL |
|-----|------|-----|
| DFIR-IRIS | Incident Response | https://10.251.151.15:443 |
| Shuffle SOAR | Workflow Automation | http://10.251.151.15:3001 |
| MISP IOC Search | Threat Intelligence | https://10.251.151.15:4430 |

---

## Backend Changes

### New Files
| File | Purpose |
|------|---------|
| `backend/app/services/soar_svc.py` | Async IRIS/Shuffle/MISP client functions |
| `backend/app/routers/soar.py` | FastAPI router — all `/api/soar/*` endpoints |

### Modified Files
| File | Change |
|------|--------|
| `backend/app/core/config.py` | Added SOAR settings fields |
| `backend/app/main.py` | Added `soar` router to import and loop |

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/soar/stats` | IRIS + Shuffle combined status |
| GET | `/api/soar/iris/alerts` | Alert list (page, per_page, status_id) |
| GET | `/api/soar/iris/cases` | Case list |
| POST | `/api/soar/iris/alerts` | Create IRIS alert |
| GET | `/api/soar/shuffle/workflows` | Workflow list |
| POST | `/api/soar/shuffle/trigger` | Trigger Shuffle workflow |
| GET | `/api/soar/misp/stats` | MISP attribute statistics (slow, ~90s) |
| GET | `/api/soar/misp/search?q=VALUE` | Search MISP IOC |

### IRIS API Path Discovery
IRIS v2.4.29 uses non-standard API paths (not `/api/v2/`):
- Alerts: `GET /alerts/filter` → `{data: {total, alerts[]}}`
- Cases: `GET /manage/cases/list` → `{data: [...]}`
- Create alert: `POST /alerts/add`

### MISP Stats Timeout
`/attributes/attributeStatistics` takes 60–90 seconds with large IOC dataset.
`/api/soar/stats` only returns IRIS + Shuffle to stay under nginx 60s timeout.
MISP stats are loaded separately on the MISP tab via `/api/soar/misp/stats`.

---

## Frontend Changes

### New Files
| File | Purpose |
|------|---------|
| `frontend/src/services/soarApi.ts` | Typed axios wrappers for all SOAR endpoints |
| `frontend/src/components/soar/SOARPage.tsx` | Full SOAR page component |

### Modified Files
| File | Change |
|------|--------|
| `frontend/src/App.tsx` | Added `<Route path="soar" element={<SOARPage />} />` |
| `frontend/src/components/layout/sidebar/navItems.tsx` | Added `soar-ir` nav item (violet #8B5CF6) |

### Page Structure

```
SOARPage
├── PageShell (title, breadcrumbs, status badge)
├── Summary row — 4 MetricCards
│   ├── IRIS Alerts (violet)
│   ├── IRIS Cases (indigo)
│   ├── Shuffle Workflows (teal)
│   └── SOAR Status OK/ERR (green/rose)
└── SectionCard with 3 Tabs
    ├── Tab 0: DFIR-IRIS
    │   ├── Toggle: Alerts | Cases
    │   ├── Alert table: time, title, severity chip, status chip, source, IOC, actions
    │   ├── Case table: id, name, date, status, owner, actions
    │   └── Block IP Dialog (confirmation before trigger)
    ├── Tab 1: Shuffle SOAR
    │   └── Workflow cards grid (name, id, status, tags)
    └── Tab 2: MISP IOC Search
        ├── MISP stat MetricCards (total IOCs, top 3 types)
        ├── Search bar + IOC type dropdown
        └── Results table: value, type, category, event_id, IDS flag
```

---

## Environment Variables

All SOAR credentials in `/opt/code/wazuh_ova/web_app/.env`:

```
SHUFFLE_URL=http://10.251.151.15:3001
SHUFFLE_TOKEN=f58c3878-a71a-434e-8297-9f303a42379c
SHUFFLE_WEBHOOK_URL=http://10.251.151.15:3001/api/v1/workflows/3bf766d1.../execute
SHUFFLE_BLOCK_URL=http://10.251.151.15:3001/api/v1/workflows/a44ec57c.../execute
SHUFFLE_ESC_URL=http://10.251.151.15:3001/api/v1/workflows/6d68ca79.../execute
IRIS_URL=https://10.251.151.15:443
IRIS_API_KEY=Fw9PvrqiEpISMORwj9BesBzKSfmIKpzBqc0x7jESL3uQ_...
IRIS_CUSTOMER_ID=1
MISP_URL=https://10.251.151.15:4430
MISP_API_KEY=zZ9pC65VRLKimumsmVJJGH0yJCYFzxW8buPyfUPM
```

---

## Rebuild Commands

```bash
cd /opt/code/wazuh_ova/web_app

# Backend rebuild (after code changes)
docker compose -f docker/docker-compose.yml build wazuhweb_backend
docker compose -f docker/docker-compose.yml up -d wazuhweb_backend

# Frontend rebuild (after code changes)
docker compose -f docker/docker-compose.yml build wazuhweb_frontend
docker compose -f docker/docker-compose.yml up -d wazuhweb_frontend

# Quick backend file update (no rebuild)
docker cp backend/app/routers/soar.py wazuhweb_backend:/app/app/routers/soar.py
docker compose -f docker/docker-compose.yml restart wazuhweb_backend
```

---

## Known Limitations

- **MISP stats slow**: ~90s response time due to large IOC dataset. Only loaded on MISP tab click, not on page load.
- **Block IP simulation only**: Shuffle Block workflow sends Telegram notification but does NOT actually block on firewall. A real firewall Active Response would require additional configuration.
- **IRIS pagination**: Currently loads up to 50 alerts/cases. Pagination UI not implemented (all data fits on screen for typical SOC volume).
