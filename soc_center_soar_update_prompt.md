# Agent Prompt: SOC Center Web App — SOAR + IRIS + MISP Integration Update
# Project: /opt/code/wazuh_ova/web_app/
# URL: https://10.251.150.222:3348/wazuh
# Mode: ADDITIVE ONLY — do not break existing pages
# Created: 2026-05-26

---

## SYSTEM CONTEXT

You are updating the existing SOC Center Web Application to integrate the newly
installed SOAR stack (Shuffle SOAR + DFIR-IRIS + MISP) that is running on
10.251.151.15. The web app already has 8 pages working. Your task is to ADD
new features WITHOUT breaking anything that exists.

```
Existing Web App (working, do not break):
  URL     : https://10.251.150.222:3348/wazuh
  Stack   : React + Vite + MUI v5 + Tailwind CSS v3
  Font    : IBM Plex Sans (@fontsource)
  Backend : FastAPI (Python) in Docker
  DB      : SQLite (wazuhweb_db volume)
  Auth    : JWT, roles: superadmin/admin/analyst/viewer

  Existing Pages (all working):
    /wazuh/           → Dashboard
    /wazuh/alerts     → Threat Alerts (live WebSocket)
    /wazuh/investigate→ Security Investigation
    /wazuh/ioc        → IOC Center
    /wazuh/compliance → Compliance
    /wazuh/assets     → Network Assets
    /wazuh/kpi        → KPI
    /wazuh/admin      → Admin Panel (Rules, Tuning, Users, Audit)

  SQLite tables: users, audit_log, custom_ioc, tuning_rules
  Existing containers: wazuhweb_nginx :3348, wazuhweb_backend, wazuhweb_frontend

SOAR Stack (newly installed, need to connect):
  Shuffle SOAR : SHUFFLE_URL, SHUFFLE_TOKEN       (from .env)
  DFIR-IRIS    : IRIS_URL, IRIS_API_KEY            (from .env)
  MISP         : MISP_URL, MISP_API_KEY            (from .env)

  Shuffle workflows (URLs in .env):
    SHUFFLE_WEBHOOK_URL  → Triage (auto-enrich)
    SHUFFLE_BLOCK_URL    → Manual block IP
    SHUFFLE_ESC_URL      → Manual escalate

All credentials: /opt/code/wazuh_ova/.env
Project root  : /opt/code/wazuh_ova/web_app/
```

---

## OPERATING RULES

- Read /opt/code/wazuh_ova/.env FIRST for all credentials
- NEVER delete or overwrite existing working files without backup
- ALL changes are ADDITIVE — new files, new routes, new API endpoints
- Existing pages must continue to work after changes
- Test existing pages before AND after making changes
- Use same MUI + Tailwind design language as existing UI
- IBM Plex Sans font already installed — reuse, do not reinstall
- Restart only wazuhweb_backend after backend changes
- Rebuild wazuhweb_frontend only after frontend changes
- Write Thai labels for all new navigation and UI elements
- Final test: all 8 existing pages + all new SOAR pages work

---

## PHASE 0 — AUDIT EXISTING STATE

### 0.1 Read credentials and verify SOAR services
```bash
source /opt/code/wazuh_ova/.env

echo "=== SOAR credentials check ==="
echo "SHUFFLE_URL:         ${SHUFFLE_URL:-NOT SET}"
echo "SHUFFLE_TOKEN:       ${SHUFFLE_TOKEN:0:8}****"
echo "SHUFFLE_WEBHOOK_URL: ${SHUFFLE_WEBHOOK_URL:-NOT SET}"
echo "SHUFFLE_BLOCK_URL:   ${SHUFFLE_BLOCK_URL:-NOT SET}"
echo "SHUFFLE_ESC_URL:     ${SHUFFLE_ESC_URL:-NOT SET}"
echo "IRIS_URL:            ${IRIS_URL:-NOT SET}"
echo "IRIS_API_KEY:        ${IRIS_API_KEY:0:8}****"
echo "IRIS_CUSTOMER_ID:    ${IRIS_CUSTOMER_ID:-NOT SET}"
echo "MISP_URL:            ${MISP_URL:-NOT SET}"
echo "MISP_API_KEY:        ${MISP_API_KEY:0:8}****"

echo ""
echo "=== Test SOAR connectivity ==="
curl -s -o /dev/null -w "Shuffle: HTTP %{http_code}\n" \
  "${SHUFFLE_URL}/api/v1/health" 2>/dev/null || echo "Shuffle: unreachable"
curl -sk -o /dev/null -w "DFIR-IRIS: HTTP %{http_code}\n" \
  -H "Authorization: Bearer ${IRIS_API_KEY}" \
  "${IRIS_URL}/api/ping" 2>/dev/null || echo "IRIS: unreachable"
curl -sk -o /dev/null -w "MISP: HTTP %{http_code}\n" \
  -H "Authorization: ${MISP_API_KEY}" \
  "${MISP_URL}/servers/getPyMISPVersion" 2>/dev/null || echo "MISP: unreachable"
```

### 0.2 Audit existing web app structure
```bash
PROJECT=/opt/code/wazuh_ova/web_app

echo "=== Backend API files ==="
find $PROJECT/backend/app -name "*.py" | sort

echo ""
echo "=== Frontend pages ==="
find $PROJECT/frontend/src/components -name "*.jsx" | sort

echo ""
echo "=== Existing .env SOAR entries ==="
grep -E "SHUFFLE|IRIS|MISP|SOAR" $PROJECT/.env 2>/dev/null || echo "None"
```

### 0.3 Verify existing pages work before touching anything
```bash
TOKEN=$(curl -sk -X POST https://10.251.150.222:3348/wazuh/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"W@zuhSOC2026!"}' | \
  python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token','FAIL'))")

echo "JWT: ${TOKEN:0:20}... ($([ ${#TOKEN} -gt 20 ] && echo OK || echo FAIL))"

echo ""
echo "=== Pre-change smoke test ==="
for ep in health dashboard/stats alerts compliance/summary assets/stats kpi/summary; do
  HTTP=$(curl -sk -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer $TOKEN" \
    "https://10.251.150.222:3348/wazuh/api/$ep")
  echo "  /api/$ep → HTTP $HTTP $([ $HTTP -lt 400 ] && echo '✅' || echo '❌')"
done
```
STOP if any existing endpoint returns error. Fix before proceeding.

### 0.4 Sync SOAR credentials to web_app/.env
```bash
source /opt/code/wazuh_ova/.env
WA_ENV=/opt/code/wazuh_ova/web_app/.env

for var in SHUFFLE_URL SHUFFLE_TOKEN SHUFFLE_WEBHOOK_URL SHUFFLE_BLOCK_URL \
           SHUFFLE_ESC_URL IRIS_URL IRIS_API_KEY IRIS_CUSTOMER_ID \
           MISP_URL MISP_API_KEY; do
  val="${!var}"
  if [ -n "$val" ] && ! grep -q "^${var}=" "$WA_ENV" 2>/dev/null; then
    echo "${var}=${val}" >> "$WA_ENV"
    echo "Added to web_app .env: $var"
  fi
done

echo ""
echo "SOAR vars in web_app/.env:"
grep -E "SHUFFLE|IRIS|MISP" "$WA_ENV"
```

---

## PHASE 1 — BACKEND: SOAR SERVICE + ROUTER

### 1.1 Append SOAR settings to existing config.py
Read the existing config.py first, then add only the SOAR fields to the Settings class:
```python
# ADD ONLY these lines inside the existing Settings class — do not replace file:
shuffle_url: str = ""
shuffle_token: str = ""
shuffle_webhook_url: str = ""
shuffle_block_url: str = ""
shuffle_esc_url: str = ""
iris_url: str = ""
iris_api_key: str = ""
iris_customer_id: str = "1"
misp_url: str = ""
misp_api_key: str = ""
```

### 1.2 Create NEW file: backend/app/services/soar_svc.py
```python
#!/usr/bin/env python3
"""
SOAR Integration Service — Shuffle SOAR, DFIR-IRIS, MISP
Reads credentials from settings (loaded from web_app/.env)
"""
import httpx, logging
from typing import Optional
from ..core.config import settings

logger = logging.getLogger(__name__)

# ── DFIR-IRIS helpers ───────────────────────────────────────────────
async def iris_get(path: str) -> dict:
    if not settings.iris_url or not settings.iris_api_key:
        return {"error": "IRIS not configured — check IRIS_URL and IRIS_API_KEY in .env"}
    try:
        async with httpx.AsyncClient(verify=False, timeout=15) as c:
            r = await c.get(f"{settings.iris_url}{path}",
                            headers={"Authorization": f"Bearer {settings.iris_api_key}"})
            return r.json()
    except Exception as e:
        logger.error(f"IRIS GET {path}: {e}")
        return {"error": str(e)}

async def iris_post(path: str, data: dict) -> dict:
    if not settings.iris_url or not settings.iris_api_key:
        return {"error": "IRIS not configured"}
    try:
        async with httpx.AsyncClient(verify=False, timeout=15) as c:
            r = await c.post(f"{settings.iris_url}{path}",
                             headers={"Authorization": f"Bearer {settings.iris_api_key}",
                                      "Content-Type": "application/json"},
                             json=data)
            return r.json()
    except Exception as e:
        return {"error": str(e)}

async def get_iris_alerts(page: int = 1, per_page: int = 20,
                           status: Optional[str] = None) -> dict:
    body = {"page": page, "per_page": per_page, "sort": "alert_source_event_time desc"}
    if status:
        body["alert_status_name"] = status
    return await iris_post("/api/v2/alerts/filter", body)

async def get_iris_cases(page: int = 1, per_page: int = 20) -> dict:
    return await iris_get(f"/api/v2/cases/list?page={page}&per_page={per_page}")

async def get_iris_stats() -> dict:
    try:
        a = await iris_post("/api/v2/alerts/filter", {"page":1,"per_page":1})
        open_a = await iris_post("/api/v2/alerts/filter",
                                  {"page":1,"per_page":1,"alert_status_name":"Unread"})
        c = await iris_get("/api/v2/cases/list?per_page=1")
        return {
            "total_alerts": a.get("data",{}).get("total", 0),
            "open_alerts": open_a.get("data",{}).get("total", 0),
            "total_cases": c.get("data",{}).get("total", 0),
            "iris_url": settings.iris_url,
            "connected": True
        }
    except Exception as e:
        return {"connected": False, "error": str(e)}

async def create_iris_alert(title: str, description: str,
                             severity_id: int = 2, tags: str = "",
                             ioc_value: Optional[str] = None) -> dict:
    body = {
        "alert_title": title, "alert_description": description,
        "alert_source": "SOC Web App", "alert_severity_id": severity_id,
        "alert_status_id": 2,
        "alert_customer_id": int(settings.iris_customer_id or 1),
        "alert_tags": tags
    }
    if ioc_value:
        body["alert_iocs"] = [{"ioc_value": ioc_value, "ioc_description": "From SOC Web App",
                                "ioc_tlp_id": 2, "ioc_type_id": 76}]
    return await iris_post("/api/v2/alerts/add", body)

# ── Shuffle helpers ─────────────────────────────────────────────────
async def shuffle_get(path: str) -> dict:
    if not settings.shuffle_url or not settings.shuffle_token:
        return {"error": "Shuffle not configured"}
    try:
        async with httpx.AsyncClient(verify=False, timeout=15) as c:
            r = await c.get(f"{settings.shuffle_url}{path}",
                            headers={"Authorization": f"Bearer {settings.shuffle_token}"})
            return r.json()
    except Exception as e:
        return {"error": str(e)}

async def get_shuffle_workflows() -> dict:
    return await shuffle_get("/api/v1/workflows")

async def get_shuffle_stats() -> dict:
    try:
        wf = await get_shuffle_workflows()
        wfs = wf if isinstance(wf, list) else wf.get("workflows", [])
        return {"total_workflows": len(wfs), "shuffle_url": settings.shuffle_url,
                "connected": "error" not in wf}
    except Exception as e:
        return {"connected": False, "error": str(e)}

async def trigger_shuffle_webhook(url: str, payload: dict) -> dict:
    if not url:
        return {"error": "Webhook URL not set"}
    try:
        async with httpx.AsyncClient(verify=False, timeout=15) as c:
            r = await c.post(url, json=payload)
            return {"status": r.status_code, "ok": r.status_code < 400}
    except Exception as e:
        return {"error": str(e)}

# ── MISP helpers ────────────────────────────────────────────────────
async def misp_post(path: str, data: dict) -> dict:
    if not settings.misp_url or not settings.misp_api_key:
        return {"error": "MISP not configured"}
    try:
        async with httpx.AsyncClient(verify=False, timeout=20) as c:
            r = await c.post(f"{settings.misp_url}{path}",
                             headers={"Authorization": settings.misp_api_key,
                                      "Accept": "application/json",
                                      "Content-Type": "application/json"},
                             json=data)
            return r.json()
    except Exception as e:
        return {"error": str(e)}

async def misp_get(path: str) -> dict:
    if not settings.misp_url or not settings.misp_api_key:
        return {"error": "MISP not configured"}
    try:
        async with httpx.AsyncClient(verify=False, timeout=20) as c:
            r = await c.get(f"{settings.misp_url}{path}",
                            headers={"Authorization": settings.misp_api_key,
                                     "Accept": "application/json"})
            return r.json()
    except Exception as e:
        return {"error": str(e)}

async def search_misp_ioc(value: str, ioc_type: Optional[str] = None) -> dict:
    body = {"returnFormat": "json", "value": value, "enforceWarninglist": 1, "limit": 20}
    if ioc_type:
        body["type"] = ioc_type
    return await misp_post("/attributes/restSearch", body)

async def get_misp_stats() -> dict:
    try:
        stats = await misp_get("/attributes/attributeStatistics")
        if "error" in (stats or {}):
            return {"connected": False, "error": stats["error"]}
        total = sum(int(v) for v in stats.values() if str(v).isdigit()) if isinstance(stats, dict) else 0
        top5 = dict(sorted(stats.items(), key=lambda x: -int(x[1]) if str(x[1]).isdigit() else 0)[:5]) \
               if isinstance(stats, dict) else {}
        return {"total_iocs": total, "by_type": top5,
                "misp_url": settings.misp_url, "connected": True}
    except Exception as e:
        return {"connected": False, "error": str(e)}
```

### 1.3 Create NEW file: backend/app/api/soar.py
```python
"""SOAR Router — exposes Shuffle, IRIS, MISP endpoints"""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
from ..services.soar_svc import (
    get_iris_alerts, get_iris_cases, get_iris_stats, create_iris_alert,
    get_shuffle_workflows, get_shuffle_stats, trigger_shuffle_webhook,
    search_misp_ioc, get_misp_stats
)
from ..core.config import settings

router = APIRouter(prefix="/soar", tags=["soar"])

# ── Combined stats ─────────────────────────────────────────────────
@router.get("/stats")
async def soar_stats():
    import asyncio
    iris, shuffle, misp = await asyncio.gather(
        get_iris_stats(), get_shuffle_stats(), get_misp_stats()
    )
    return {"iris": iris, "shuffle": shuffle, "misp": misp}

# ── IRIS ───────────────────────────────────────────────────────────
@router.get("/iris/alerts")
async def list_iris_alerts(page: int = 1, per_page: int = 20,
                            status: Optional[str] = None):
    return await get_iris_alerts(page=page, per_page=per_page, status=status)

@router.get("/iris/cases")
async def list_iris_cases(page: int = 1, per_page: int = 20):
    return await get_iris_cases(page=page, per_page=per_page)

@router.get("/iris/status")
async def iris_status():
    return await get_iris_stats()

class AlertBody(BaseModel):
    title: str
    description: str
    severity: int = 2
    tags: str = ""
    ioc_value: Optional[str] = None

@router.post("/iris/alerts")
async def create_alert(body: AlertBody):
    return await create_iris_alert(body.title, body.description,
                                    body.severity, body.tags, body.ioc_value)

# ── Shuffle ────────────────────────────────────────────────────────
@router.get("/shuffle/workflows")
async def list_shuffle_workflows():
    return await get_shuffle_workflows()

@router.get("/shuffle/status")
async def shuffle_status():
    return await get_shuffle_stats()

class TriggerBody(BaseModel):
    type: str           # "block" | "escalate"
    ip: Optional[str] = None
    case_id: Optional[str] = None
    analyst: str = "soc-analyst"
    reason: Optional[str] = None

@router.post("/shuffle/trigger")
async def trigger_webhook(body: TriggerBody):
    if body.type == "block":
        if not body.ip:
            raise HTTPException(400, "ip required for block")
        url = settings.shuffle_block_url
        payload = {"ip": body.ip, "case_id": body.case_id or "",
                   "analyst": body.analyst, "reason": body.reason or "Manual block"}
    elif body.type == "escalate":
        url = settings.shuffle_esc_url
        payload = {"case_id": body.case_id or "", "analyst": body.analyst,
                   "case_title": body.reason or "Escalation"}
    else:
        raise HTTPException(400, f"Unknown type: {body.type}")
    if not url:
        raise HTTPException(503, f"Shuffle {body.type} URL not configured")
    return await trigger_shuffle_webhook(url, payload)

# ── MISP ───────────────────────────────────────────────────────────
@router.get("/misp/search")
async def misp_search(q: str = Query(...), type: Optional[str] = None):
    return await search_misp_ioc(value=q, ioc_type=type)

@router.get("/misp/status")
@router.get("/misp/stats")
async def misp_status():
    return await get_misp_stats()
```

### 1.4 Register soar router in existing main.py (ADDITIVE)
```bash
MAIN=/opt/code/wazuh_ova/web_app/backend/app/main.py

# Backup first
cp "$MAIN" "${MAIN}.bak.$(date +%Y%m%d_%H%M%S)"

# Check already done
grep -q "soar" "$MAIN" && echo "soar already in main.py" && exit 0

# Add import — find the last "from .api import" line and append soar
python3 << PYEOF
import re
with open('$MAIN', 'r') as f:
    content = f.read()

# Add soar to imports
if 'from .api import' in content:
    content = re.sub(
        r'(from \.api import[^\n]+)',
        lambda m: m.group(0).rstrip() + ', soar' if 'soar' not in m.group(0) else m.group(0),
        content, count=1
    )

# Add include_router after last include_router line
if 'soar.router' not in content:
    content = re.sub(
        r'(app\.include_router\([^)]+\))',
        r'\1\napp.include_router(soar.router, prefix="/api")',
        content, count=0
    )
    # Only add once — fix if duplicated
    lines = content.split('\n')
    seen = False
    new_lines = []
    for line in lines:
        if 'soar.router' in line:
            if not seen:
                new_lines.append(line)
                seen = True
        else:
            new_lines.append(line)
    content = '\n'.join(new_lines)

with open('$MAIN', 'w') as f:
    f.write(content)
print("main.py updated")
PYEOF

echo "=== Verify main.py ==="
grep -n "soar\|include_router" "$MAIN" | head -15
```

### 1.5 Restart backend and test
```bash
cd /opt/code/wazuh_ova/web_app
docker compose -f docker/docker-compose.yml restart wazuhweb_backend
sleep 25

echo "=== Backend health ==="
docker exec wazuhweb_backend curl -s http://localhost:8000/api/health | python3 -m json.tool

echo ""
echo "=== Test SOAR endpoints ==="
TOKEN=$(curl -sk -X POST https://10.251.150.222:3348/wazuh/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"W@zuhSOC2026!"}' | \
  python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))")

for ep in soar/stats soar/iris/status soar/shuffle/status soar/misp/status; do
  HTTP=$(curl -sk -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer $TOKEN" \
    "https://10.251.150.222:3348/wazuh/api/$ep")
  echo "  /api/$ep → HTTP $HTTP $([ $HTTP -lt 400 ] && echo '✅' || echo '❌')"
done
```

---

## PHASE 2 — FRONTEND: NEW FILES ONLY

### 2.1 Add SOAR env vars to frontend .env
```bash
source /opt/code/wazuh_ova/.env
VITE_ENV=/opt/code/wazuh_ova/web_app/frontend/.env

grep -q "VITE_IRIS_URL" "$VITE_ENV" 2>/dev/null || cat >> "$VITE_ENV" << VITE_EOF

# SOAR Integration URLs — added $(date +%Y-%m-%d)
VITE_IRIS_URL=${IRIS_URL}
VITE_SHUFFLE_URL=${SHUFFLE_URL}
VITE_MISP_URL=${MISP_URL}
VITE_EOF

echo "Frontend .env:"
grep -E "VITE_IRIS|VITE_SHUFFLE|VITE_MISP" "$VITE_ENV"
```

### 2.2 Create NEW file: frontend/src/utils/soarApi.js
```javascript
/**
 * soarApi.js — SOAR integration API calls
 * Uses existing api.js (axios instance with JWT auto-attach)
 */
import api from './api'

// IRIS
export const getIrisAlerts = (params = {}) => api.get('/soar/iris/alerts', { params })
export const getIrisCases = (params = {}) => api.get('/soar/iris/cases', { params })
export const createIrisAlert = (data) => api.post('/soar/iris/alerts', data)
export const getIrisStatus = () => api.get('/soar/iris/status')

// Shuffle
export const getShuffleWorkflows = () => api.get('/soar/shuffle/workflows')
export const triggerBlock = (ip, caseId, analyst, reason) =>
  api.post('/soar/shuffle/trigger', { type: 'block', ip, case_id: caseId, analyst, reason })
export const triggerEscalate = (caseId, analyst, caseTitle) =>
  api.post('/soar/shuffle/trigger', { type: 'escalate', case_id: caseId, analyst, reason: caseTitle })

// MISP
export const searchMISP = (q, type = null) =>
  api.get('/soar/misp/search', { params: { q, ...(type ? { type } : {}) } })
export const getMISPStats = () => api.get('/soar/misp/stats')

// Combined
export const getSOARStats = () => api.get('/soar/stats')
```

### 2.3 Create NEW file: frontend/src/components/pages/SOARPage.jsx
```jsx
import React, { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import {
  Box, Tabs, Tab, Card, CardContent, Typography, Chip, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, TextField, MenuItem, LinearProgress, Alert, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Grid
} from '@mui/material'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import BlockIcon from '@mui/icons-material/Block'
import SearchIcon from '@mui/icons-material/Search'
import {
  getIrisAlerts, getIrisCases, getShuffleWorkflows,
  searchMISP, getMISPStats, getSOARStats,
  triggerBlock, triggerEscalate, createIrisAlert
} from '../../utils/soarApi'
import { useSnackbar } from 'notistack'

const SEV_COLOR = { 1:'error', 2:'warning', 3:'info', 4:'success' }

// ── Metric card ────────────────────────────────────────────────────
const Metric = ({ label, value, color='text.primary', sub }) => (
  <Card sx={{ flex:1, minWidth:130 }}>
    <CardContent sx={{ pb:'12px !important' }}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="h4" fontWeight={600} color={color}>{value ?? '—'}</Typography>
      {sub && <Typography variant="caption" color="text.secondary">{sub}</Typography>}
    </CardContent>
  </Card>
)

// ── Main page ──────────────────────────────────────────────────────
export default function SOARPage() {
  const [tab, setTab] = useState(0)
  const { enqueueSnackbar } = useSnackbar()

  const { data: stats } = useQuery({
    queryKey: ['soar-stats'],
    queryFn: () => getSOARStats().then(r => r.data),
    refetchInterval: 60000, retry: 1
  })

  return (
    <Box>
      <Typography variant="h6" fontWeight={500} mb={2}>
        ⚙️ SOAR & Incident Response
      </Typography>

      {/* Summary cards */}
      <Box display="flex" gap={2} mb={3} flexWrap="wrap">
        <Metric label="IRIS Alerts (เปิด)"
                value={stats?.iris?.open_alerts}
                color="error.main"
                sub={`รวม ${stats?.iris?.total_alerts ?? '?'} alerts`} />
        <Metric label="IRIS Cases"
                value={stats?.iris?.total_cases}
                color="warning.main" />
        <Metric label="MISP IOCs"
                value={stats?.misp?.total_iocs?.toLocaleString()}
                color="info.main"
                sub="ใน threat feeds" />
        <Metric label="Shuffle Workflows"
                value={stats?.shuffle?.total_workflows}
                color="success.main" />
      </Box>

      {/* Status indicators */}
      <Box display="flex" gap={1} mb={2} flexWrap="wrap">
        {['iris','shuffle','misp'].map(svc => (
          <Chip key={svc} size="small"
                label={`${svc.toUpperCase()}: ${stats?.[svc]?.connected ? '🟢 Connected' : '🔴 Error'}`}
                color={stats?.[svc]?.connected ? 'success' : 'error'}
                variant="outlined" />
        ))}
      </Box>

      {/* Tabs */}
      <Paper sx={{ mb: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 2 }}>
          <Tab label="🔵 DFIR-IRIS" />
          <Tab label="⚙️ Shuffle SOAR" />
          <Tab label="🟣 MISP IOC Search" />
        </Tabs>
      </Paper>

      {tab === 0 && <IRISTab enqueueSnackbar={enqueueSnackbar} />}
      {tab === 1 && <ShuffleTab />}
      {tab === 2 && <MISPTab />}
    </Box>
  )
}

// ── IRIS Tab ───────────────────────────────────────────────────────
function IRISTab({ enqueueSnackbar }) {
  const [view, setView] = useState('alerts')
  const [blockTarget, setBlockTarget] = useState(null)
  const irisUrl = import.meta.env.VITE_IRIS_URL || ''

  const { data: alertData, isLoading: aLoad } = useQuery({
    queryKey: ['iris-alerts'],
    queryFn: () => getIrisAlerts({ page:1, per_page:20 }).then(r => r.data),
    enabled: view === 'alerts', refetchInterval: 30000
  })
  const { data: caseData, isLoading: cLoad } = useQuery({
    queryKey: ['iris-cases'],
    queryFn: () => getIrisCases({ page:1, per_page:20 }).then(r => r.data),
    enabled: view === 'cases'
  })

  const blockMut = useMutation({
    mutationFn: ({ ip, caseId }) => triggerBlock(ip, caseId, 'analyst', 'Manual block'),
    onSuccess: () => { enqueueSnackbar('🚫 Block IP ส่งไปยัง Shuffle แล้ว', { variant:'success' }); setBlockTarget(null) },
    onError: () => enqueueSnackbar('❌ Block trigger ล้มเหลว', { variant:'error' })
  })
  const escMut = useMutation({
    mutationFn: ({ caseId, title }) => triggerEscalate(caseId, 'analyst', title),
    onSuccess: () => enqueueSnackbar('📢 Escalate ส่งแล้ว', { variant:'info' }),
    onError: () => enqueueSnackbar('❌ Escalate ล้มเหลว', { variant:'error' })
  })

  const alerts = alertData?.data?.alerts || []
  const cases  = caseData?.data?.cases  || []

  return (
    <Box>
      <Box display="flex" gap={1} mb={2} alignItems="center">
        {['alerts','cases'].map(v => (
          <Button key={v} size="small"
                  variant={view===v ? 'contained' : 'outlined'}
                  onClick={() => setView(v)}>
            {v === 'alerts' ? 'Alerts' : 'Cases'}
          </Button>
        ))}
        <Box flex={1}/>
        {irisUrl && (
          <Button size="small" endIcon={<OpenInNewIcon/>}
                  href={irisUrl} target="_blank">เปิด IRIS</Button>
        )}
      </Box>

      {view === 'alerts' && (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>เวลา</TableCell>
                <TableCell>ชื่อ Alert</TableCell>
                <TableCell>Severity</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Source</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {aLoad ? (
                <TableRow><TableCell colSpan={6}><LinearProgress/></TableCell></TableRow>
              ) : alerts.length === 0 ? (
                <TableRow><TableCell colSpan={6} align="center">
                  <Alert severity="info" sx={{m:1}}>ยังไม่มี alerts ใน IRIS</Alert>
                </TableCell></TableRow>
              ) : alerts.map(a => (
                <TableRow key={a.alert_id} hover>
                  <TableCell sx={{fontFamily:'monospace',fontSize:11}}>
                    {a.alert_source_event_time?.slice(0,16)}
                  </TableCell>
                  <TableCell sx={{maxWidth:260,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                    {a.alert_title}
                  </TableCell>
                  <TableCell>
                    <Chip size="small" label={a.alert_severity_name || `S${a.alert_severity_id}`}
                          color={SEV_COLOR[a.alert_severity_id] || 'default'}/>
                  </TableCell>
                  <TableCell>
                    <Chip size="small" label={a.alert_status_name} variant="outlined"/>
                  </TableCell>
                  <TableCell sx={{fontSize:11,color:'text.secondary'}}>{a.alert_source}</TableCell>
                  <TableCell>
                    <Box display="flex" gap={0.5}>
                      {irisUrl && (
                        <Tooltip title="ดูใน IRIS">
                          <IconButton size="small"
                            component="a" href={`${irisUrl}/case/${a.cases?.[0]?.case_id||''}`}
                            target="_blank">
                            <OpenInNewIcon fontSize="small"/>
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="Block IP (Manual)">
                        <IconButton size="small" color="error"
                          onClick={() => setBlockTarget({
                            ip: a.alert_iocs?.[0]?.ioc_value || '',
                            caseId: String(a.alert_id), title: a.alert_title
                          })}>
                          <BlockIcon fontSize="small"/>
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {view === 'cases' && (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>ชื่อ Case</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Owner</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {cLoad ? (
                <TableRow><TableCell colSpan={5}><LinearProgress/></TableCell></TableRow>
              ) : cases.map(c => (
                <TableRow key={c.case_id} hover>
                  <TableCell sx={{fontFamily:'monospace'}}>#{c.case_id}</TableCell>
                  <TableCell>{c.case_name}</TableCell>
                  <TableCell><Chip size="small" label={c.case_status||'Open'} variant="outlined"/></TableCell>
                  <TableCell sx={{fontSize:11}}>{c.owner_username||'—'}</TableCell>
                  <TableCell>
                    <Box display="flex" gap={0.5}>
                      {irisUrl && (
                        <Button size="small" endIcon={<OpenInNewIcon/>}
                                href={`${irisUrl}/case/${c.case_id}`} target="_blank">
                          เปิด
                        </Button>
                      )}
                      <Button size="small" color="warning" variant="outlined"
                              onClick={() => escMut.mutate({caseId:String(c.case_id), title:c.case_name})}>
                        Escalate
                      </Button>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Block IP Dialog */}
      <Dialog open={!!blockTarget} onClose={() => setBlockTarget(null)}>
        <DialogTitle>🚫 ยืนยัน Block IP</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{mb:2}}>
            Human-in-the-Loop — การ block จะส่งผ่าน Shuffle → Wazuh Active Response
          </Alert>
          <Typography variant="body2"><strong>IP:</strong> {blockTarget?.ip || '(ไม่มี IP)'}</Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>{blockTarget?.title}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBlockTarget(null)}>ยกเลิก</Button>
          <Button color="error" variant="contained"
                  disabled={blockMut.isLoading || !blockTarget?.ip}
                  onClick={() => blockMut.mutate({ip: blockTarget.ip, caseId: blockTarget.caseId})}>
            ยืนยัน Block
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

// ── Shuffle Tab ────────────────────────────────────────────────────
function ShuffleTab() {
  const shuffleUrl = import.meta.env.VITE_SHUFFLE_URL || ''
  const { data, isLoading } = useQuery({
    queryKey: ['shuffle-wf'],
    queryFn: () => getShuffleWorkflows().then(r => r.data),
    refetchInterval: 60000
  })
  const wfs = Array.isArray(data) ? data : data?.workflows || []

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" mb={2}>
        <Typography variant="subtitle2">Shuffle Workflows</Typography>
        {shuffleUrl && (
          <Button size="small" endIcon={<OpenInNewIcon/>} href={shuffleUrl} target="_blank">
            เปิด Shuffle
          </Button>
        )}
      </Box>
      {isLoading ? <LinearProgress/> : (
        <Grid container spacing={2}>
          {wfs.length === 0 ? (
            <Grid item xs={12}>
              <Alert severity="warning">ไม่พบ workflows — ตรวจสอบ SHUFFLE_TOKEN ใน .env</Alert>
            </Grid>
          ) : wfs.map(wf => (
            <Grid item xs={12} sm={6} md={4} key={wf.id}>
              <Card>
                <CardContent>
                  <Typography fontWeight={500} fontSize={13} noWrap mb={0.5}>{wf.name}</Typography>
                  <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                    {wf.id?.slice(0,12)}...
                  </Typography>
                  <Box display="flex" gap={0.5} flexWrap="wrap">
                    {wf.tags?.map(t => <Chip key={t} size="small" label={t} variant="outlined"/>)}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  )
}

// ── MISP Tab ───────────────────────────────────────────────────────
function MISPTab() {
  const [q, setQ] = useState('')
  const [iocType, setIocType] = useState('')
  const [triggered, setTriggered] = useState(false)
  const mispUrl = import.meta.env.VITE_MISP_URL || ''

  const { data: mispStats } = useQuery({
    queryKey: ['misp-stats'],
    queryFn: () => getMISPStats().then(r => r.data)
  })
  const { data: results, isLoading, refetch } = useQuery({
    queryKey: ['misp-search', q, iocType],
    queryFn: () => searchMISP(q, iocType || null).then(r => r.data),
    enabled: false
  })

  const doSearch = () => { setTriggered(true); refetch() }
  const attrs = results?.response?.Attribute || []

  return (
    <Box>
      {/* Stats */}
      {mispStats?.connected ? (
        <Box display="flex" gap={2} mb={3} flexWrap="wrap">
          <Metric label="IOCs ทั้งหมด" value={mispStats.total_iocs?.toLocaleString()} color="info.main"/>
          {Object.entries(mispStats.by_type || {}).slice(0,4).map(([t,c]) => (
            <Metric key={t} label={t} value={c}/>
          ))}
        </Box>
      ) : (
        <Alert severity="warning" sx={{mb:2}}>MISP ไม่ได้เชื่อมต่อ — ตรวจสอบ MISP_API_KEY ใน .env</Alert>
      )}

      {/* Search */}
      <Box display="flex" gap={1} mb={2} flexWrap="wrap">
        <TextField size="small" placeholder="ค้นหา IP, domain, hash, URL..."
                   value={q} onChange={e => setQ(e.target.value)}
                   onKeyDown={e => e.key === 'Enter' && doSearch()}
                   sx={{ flex:1, minWidth:250 }}/>
        <TextField select size="small" value={iocType}
                   onChange={e => setIocType(e.target.value)}
                   sx={{ minWidth:140 }} label="ประเภท IOC">
          {['','ip-dst','ip-src','domain','hostname','md5','sha256','url'].map(t => (
            <MenuItem key={t} value={t}>{t || 'ทุกประเภท'}</MenuItem>
          ))}
        </TextField>
        <Button variant="contained" startIcon={<SearchIcon/>}
                onClick={doSearch} disabled={!q.trim() || isLoading}>ค้นหา MISP</Button>
        {mispUrl && (
          <Button endIcon={<OpenInNewIcon/>} href={mispUrl} target="_blank">เปิด MISP</Button>
        )}
      </Box>

      {isLoading && <LinearProgress sx={{mb:2}}/>}
      {triggered && !isLoading && (attrs.length === 0 ? (
        <Alert severity="success">✅ ไม่พบ IOC "{q}" ใน MISP — Clean</Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Value</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Event ID</TableCell>
                <TableCell>IDS</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {attrs.slice(0,20).map((a,i) => (
                <TableRow key={i} hover
                          sx={a.to_ids ? {bgcolor:'rgba(239,68,68,0.05)'} : {}}>
                  <TableCell sx={{fontFamily:'monospace',fontSize:11}}>{a.value}</TableCell>
                  <TableCell><Chip size="small" label={a.type}/></TableCell>
                  <TableCell sx={{fontSize:11}}>{a.category}</TableCell>
                  <TableCell sx={{fontFamily:'monospace',fontSize:11}}>#{a.event_id}</TableCell>
                  <TableCell>
                    {a.to_ids && <Chip size="small" label="🚨 IDS" color="error"/>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {attrs.length > 20 && (
            <Typography p={1} variant="caption" color="text.secondary">
              แสดง 20/{attrs.length} รายการ
            </Typography>
          )}
        </TableContainer>
      ))}
    </Box>
  )
}
```

### 2.4 Add SOAR route to existing App.jsx (ADDITIVE)
Read App.jsx first, then add:
```bash
APPJSX=/opt/code/wazuh_ova/web_app/frontend/src/App.jsx
cp "$APPJSX" "${APPJSX}.bak.$(date +%Y%m%d_%H%M%S)"

grep -q "SOARPage" "$APPJSX" && echo "Already added" && exit 0

python3 << PYEOF
with open('$APPJSX', 'r') as f:
    content = f.read()

# Add import after last page import
import_line = "import SOARPage from './components/pages/SOARPage'"
if import_line not in content:
    content = content.replace(
        "import KPIPage",
        f"{import_line}\nimport KPIPage"
    )

# Add route after kpi route
route_line = '<Route path="soar" element={<SOARPage />} />'
if route_line not in content:
    content = content.replace(
        'path="kpi"',
        'path="kpi"'
    )
    # Find kpi route and add soar after it
    import re
    content = re.sub(
        r'(<Route path="kpi"[^/]*/>\s*)',
        r'\1<Route path="soar" element={<SOARPage />} />\n            ',
        content
    )

with open('$APPJSX', 'w') as f:
    f.write(content)
print("App.jsx updated")
PYEOF

echo "Verify App.jsx:"
grep -n "soar\|SOAR" "$APPJSX"
```

### 2.5 Add SOAR to sidebar in Layout.jsx (ADDITIVE)
Read Layout.jsx first to understand the nav item structure, then add:
```bash
LAYOUT=/opt/code/wazuh_ova/web_app/frontend/src/components/layout/Layout.jsx
cp "$LAYOUT" "${LAYOUT}.bak.$(date +%Y%m%d_%H%M%S)"

grep -q "soar" "$LAYOUT" && echo "SOAR nav already added" && exit 0

echo "Current nav items in Layout.jsx:"
grep -n "kpi\|path.*'/\|label\|href" "$LAYOUT" | head -20

echo ""
echo "Add SOAR nav item manually after KPI item in Layout.jsx"
echo "Pattern to find and add after:"
echo '  { path: "/kpi", label: "📈 KPI ประสิทธิภาพ" }'
echo "Add:"
echo '  { path: "/soar", label: "⚙️ SOAR & IR" }'
echo ""
echo "The exact syntax depends on the current Layout.jsx nav structure"
echo "Please read the file and add accordingly"
cat "$LAYOUT" | head -100
```

### 2.6 Add SOAR metric cards to existing DashboardPage.jsx (ADDITIVE)
Read DashboardPage.jsx to find the metric cards section, then:
```bash
DASH=/opt/code/wazuh_ova/web_app/frontend/src/components/pages/DashboardPage.jsx

echo "Current metric cards and queries in Dashboard:"
grep -n "useQuery\|MetricCard\|stat\|count\|total\|Critical\|High" "$DASH" | head -20
```

After reading, add SOAR stats query and 3 new metric cards. Do not touch existing cards.

### 2.7 Rebuild frontend
```bash
cd /opt/code/wazuh_ova/web_app
docker compose -f docker/docker-compose.yml build wazuhweb_frontend
docker compose -f docker/docker-compose.yml up -d
sleep 60

docker ps --filter "name=wazuhweb" --format "table {{.Names}}\t{{.Status}}"
```

---

## PHASE 3 — TEST EVERYTHING

### 3.1 Existing pages smoke test (must all pass)
```bash
TOKEN=$(curl -sk -X POST https://10.251.150.222:3348/wazuh/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"W@zuhSOC2026!"}' | \
  python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))")

echo "=== EXISTING pages (must all pass) ==="
for ep in health dashboard/stats alerts compliance/summary assets/stats kpi/summary; do
  HTTP=$(curl -sk -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer $TOKEN" \
    "https://10.251.150.222:3348/wazuh/api/$ep")
  STATUS=$([ $HTTP -lt 400 ] && echo '✅' || echo '❌ FAIL')
  echo "  /api/$ep → HTTP $HTTP $STATUS"
done

echo ""
echo "=== NEW SOAR endpoints ==="
for ep in "soar/stats" "soar/iris/status" "soar/shuffle/status" "soar/misp/status" \
          "soar/iris/alerts?per_page=5" "soar/shuffle/workflows" "soar/misp/search?q=1.1.1.1"; do
  HTTP=$(curl -sk -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer $TOKEN" \
    "https://10.251.150.222:3348/wazuh/api/$ep")
  STATUS=$([ $HTTP -lt 400 ] && echo '✅' || echo '❌')
  echo "  /api/$ep → HTTP $HTTP $STATUS"
done
```

### 3.2 SOAR stats content test
```bash
curl -sk -H "Authorization: Bearer $TOKEN" \
  "https://10.251.150.222:3348/wazuh/api/soar/stats" | \
  python3 -c "
import sys, json
d = json.load(sys.stdin)
for svc, info in d.items():
    connected = info.get('connected', '?')
    print(f'{svc}: connected={connected}', end='')
    if svc == 'iris':
        print(f' | alerts={info.get(\"total_alerts\")} | cases={info.get(\"total_cases\")}')
    elif svc == 'shuffle':
        print(f' | workflows={info.get(\"total_workflows\")}')
    elif svc == 'misp':
        print(f' | total_iocs={info.get(\"total_iocs\")}')
    else:
        print()
"
```

### 3.3 Frontend page routing test
```bash
echo "=== All page routes ==="
for path in "" "alerts" "investigate" "ioc" "compliance" "assets" "kpi" "admin" "soar"; do
  HTTP=$(curl -sk -o /dev/null -w "%{http_code}" \
    "https://10.251.150.222:3348/wazuh/$path")
  echo "  /wazuh/$path → HTTP $HTTP $([ $HTTP -eq 200 ] && echo '✅' || echo '⚠️')"
done
```

---

## PHASE 4 — FINAL REPORT

```
════════════════════════════════════════════════════════════════
  SOC Center Web App — SOAR Integration Update
  Date: [DATE]  URL: https://10.251.150.222:3348/wazuh
════════════════════════════════════════════════════════════════

NEW BACKEND FILES
  services/soar_svc.py         : [created/error]
  api/soar.py                  : [created/error]
  main.py (soar router added)  : [ok/error]
  wazuhweb_backend restarted   : [ok/error]

NEW FRONTEND FILES
  utils/soarApi.js             : [created/error]
  pages/SOARPage.jsx           : [created/error]
  App.jsx (/soar route added)  : [ok/error]
  Layout.jsx (nav item added)  : [ok/error]
  wazuhweb_frontend rebuilt    : [ok/error]

EXISTING PAGES (all must pass)
  /api/dashboard/stats         : [✅/❌]
  /api/alerts                  : [✅/❌]
  /api/compliance/summary      : [✅/❌]
  /api/assets/stats            : [✅/❌]
  /api/kpi/summary             : [✅/❌]

NEW SOAR API (all must pass)
  /api/soar/stats              : [✅/❌]
  /api/soar/iris/alerts        : [✅/❌] total=[N]
  /api/soar/iris/cases         : [✅/❌] total=[N]
  /api/soar/shuffle/workflows  : [✅/❌] total=[N]
  /api/soar/misp/search        : [✅/❌]
  /api/soar/misp/stats         : [✅/❌] iocs=[N]

SOAR PAGE (/wazuh/soar)
  IRIS tab accessible          : [✅/❌]
  Shuffle tab accessible       : [✅/❌]
  MISP tab + search            : [✅/❌]
  Block IP dialog              : [✅/❌]

CONNECTIVITY
  DFIR-IRIS                    : [connected/error]
  Shuffle SOAR                 : [connected/error]
  MISP                         : [connected/error]
════════════════════════════════════════════════════════════════
```
