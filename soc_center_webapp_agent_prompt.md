# Agent Prompt: SOC Center Web Application — Full Stack Build & Deploy
# Project: /opt/code/wazuh_ova/web_app
# URL: https://10.251.150.222:3348/wazuh
# Stack: React+MUI+Tailwind / FastAPI / SQLite / Docker
# Created: 2026-05-21

---

## SYSTEM CONTEXT

You are a senior full-stack engineer building a production-grade SOC Center
web application for a hospital security operations team (Walailak University
Hospital). The app provides a unified interface over Wazuh SIEM, OpenSearch,
and multiple threat intelligence sources.

```
Wazuh Cluster (existing, do NOT modify):
  Master    10.251.151.11  Wazuh 4.14.5, API :55000
  Worker    10.251.151.12  Wazuh 4.14.5, Suricata 7.0.10
  Indexer   10.251.151.13  OpenSearch 7.10.2 :9200
  Dashboard 10.251.151.14  Wazuh Dashboard :443
  Grafana   https://network.hospital.wu.ac.th/grafana (ds uid: dfmhsi3iylzb4d)

Credentials source: /opt/code/wazuh_ova/.env
Project root: /opt/code/wazuh_ova/web_app/

Deploy target:
  Host IP : 10.251.150.222
  Base URL: https://10.251.150.222:3348/wazuh
  Nginx   : reverse proxy HTTPS :3348 → frontend :5173, backend :8000

Docker container names:
  wazuhweb_frontend   — React SPA
  wazuhweb_backend    — FastAPI
  wazuhweb_nginx      — Nginx TLS reverse proxy
  wazuhweb_db         — SQLite (volume mount)

Design requirements:
  Font       : IBM Plex Sans (all weights) — load from Google Fonts
  UI Library : MUI (Material UI v5) + Tailwind CSS v3
  Responsive : mobile / tablet / desktop breakpoints
  Theme      : dark mode + light mode (user toggle, saved to localStorage)
  Language   : Thai UI labels, English technical terms
```

---

## OPERATING RULES

- Always read /opt/code/wazuh_ova/.env FIRST — extract all credentials from it
- Never hardcode credentials — always use environment variables
- Check if a Docker port is in use before assigning; find next available port
- All containers must be in network wazuhweb_net (create if not exists)
- Validate each service starts successfully before moving to the next step
- Write all files to /opt/code/wazuh_ova/web_app/ unless stated otherwise
- Show exact command output at every step
- Final report must be written in Thai, complete and deployable

---

## PHASE 0 — READ .env AND CHECK PORTS

### 0.1 Read all credentials from .env
```bash
set -a
source /opt/code/wazuh_ova/.env
set +a

echo "=== Credential check (masked) ==="
echo "WAZUH_API_USER:    ${WAZUH_API_USER:+SET}"
echo "WAZUH_API_PASS:    ${WAZUH_API_PASS:+SET}"
echo "OPENSEARCH_USER:   ${OPENSEARCH_USER:+SET}"
echo "OPENSEARCH_PASS:   ${OPENSEARCH_PASS:+SET}"
echo "GRAFANA_TOKEN:     ${GRAFANA_TOKEN:0:8}****"
echo "TELEGRAM_BOT_TOKEN:${TELEGRAM_BOT_TOKEN:+SET}"
echo "ABUSEIPDB_KEY:     ${ABUSEIPDB_KEY:+SET}"
echo "OTX_KEY:           ${OTX_KEY:+SET}"
echo "MAXMIND_LICENSE_KEY:${MAXMIND_LICENSE_KEY:0:4}****"
```

### 0.2 Check port availability
```bash
echo "=== Port availability check ==="
for port in 3348 8000 5173 5432; do
  if ss -tlnp | grep -q ":$port "; then
    echo "Port $port: IN USE"
  else
    echo "Port $port: AVAILABLE"
  fi
done

echo ""
echo "=== Existing Docker containers ==="
docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "=== Existing Docker networks ==="
docker network ls
```

If port 3348 or 8000 is in use, find next available ports:
```bash
find_free_port() {
  local port=$1
  while ss -tlnp | grep -q ":$port "; do
    port=$((port + 1))
  done
  echo $port
}
NGINX_PORT=$(find_free_port 3348)
BACKEND_PORT=$(find_free_port 8000)
echo "Will use: NGINX=$NGINX_PORT BACKEND=$BACKEND_PORT"
```

### 0.3 Create Docker network
```bash
docker network create wazuhweb_net 2>/dev/null || \
  echo "Network wazuhweb_net already exists"
docker network inspect wazuhweb_net | grep -E '"Name"|"Subnet"'
```

---

## PHASE 1 — PROJECT STRUCTURE SETUP

### 1.1 Create directory structure
```bash
PROJECT=/opt/code/wazuh_ova/web_app
mkdir -p $PROJECT/{frontend/src/{components/{layout,dashboard,alerts,investigate,ioc,compliance,assets,admin,kpi,auth},hooks,store,utils,theme},backend/{app/{routers,models,services,core}},nginx/ssl,docker}

echo "=== Directory structure created ==="
find $PROJECT -type d | head -40
```

### 1.2 Create web_app .env file
```bash
cat > /opt/code/wazuh_ova/web_app/.env << ENVEOF
# SOC Center Web Application — Environment Variables
# Generated: $(date +%Y-%m-%d)
# DO NOT COMMIT TO GIT

# Application
APP_NAME=SOC Center
APP_ENV=production
APP_URL=https://10.251.150.222:3348/wazuh
APP_BASE_PATH=/wazuh

# Backend
BACKEND_HOST=0.0.0.0
BACKEND_PORT=8000
SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(64))")
ACCESS_TOKEN_EXPIRE_MINUTES=480

# Database (SQLite)
DATABASE_URL=sqlite:////app/data/soc_center.db

# Wazuh Cluster
WAZUH_API_HOST=10.251.151.11
WAZUH_API_PORT=55000
WAZUH_API_USER=${WAZUH_API_USER:-wazuh-wui}
WAZUH_API_PASS=${WAZUH_API_PASS:-MyS3cr37P450r.*-}
WAZUH_VERIFY_SSL=false

# OpenSearch
OPENSEARCH_HOST=10.251.151.13
OPENSEARCH_PORT=9200
OPENSEARCH_USER=${OPENSEARCH_USER:-admin}
OPENSEARCH_PASS=${OPENSEARCH_PASS:-admin}
OPENSEARCH_VERIFY_SSL=false
OPENSEARCH_INDEX=wazuh-alerts-4.x-*

# Grafana
GRAFANA_URL=https://network.hospital.wu.ac.th/grafana
GRAFANA_DS_UID=dfmhsi3iylzb4d
GRAFANA_TOKEN=${GRAFANA_TOKEN:-}

# Threat Intelligence
ABUSEIPDB_KEY=${ABUSEIPDB_KEY:-}
OTX_KEY=${OTX_KEY:-}
SHODAN_KEY=${SHODAN_KEY:-}
VIRUSTOTAL_KEY=${VIRUSTOTAL_KEY:-}
MAXMIND_LICENSE_KEY=${MAXMIND_LICENSE_KEY:-}

# Telegram
TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN:-}
TELEGRAM_CHAT_ID=${TELEGRAM_CHAT_ID:-}

# Frontend
VITE_APP_NAME=SOC Center
VITE_API_BASE_URL=/wazuh/api
VITE_WS_URL=/wazuh/ws
VITE_BASE_PATH=/wazuh
ENVEOF

echo "web_app .env created"
```

---

## PHASE 2 — BACKEND: FastAPI Application

### 2.1 backend/requirements.txt
```
fastapi==0.111.0
uvicorn[standard]==0.29.0
sqlalchemy==2.0.30
aiosqlite==0.20.0
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.9
httpx==0.27.0
websockets==12.0
python-dotenv==1.0.1
pydantic-settings==2.2.1
opensearch-py==2.6.0
schedule==1.2.2
```

### 2.2 backend/app/core/config.py
```python
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    app_name: str = "SOC Center"
    app_env: str = "production"
    app_base_path: str = "/wazuh"
    secret_key: str
    access_token_expire_minutes: int = 480
    database_url: str = "sqlite:////app/data/soc_center.db"

    wazuh_api_host: str = "10.251.151.11"
    wazuh_api_port: int = 55000
    wazuh_api_user: str
    wazuh_api_pass: str
    wazuh_verify_ssl: bool = False

    opensearch_host: str = "10.251.151.13"
    opensearch_port: int = 9200
    opensearch_user: str
    opensearch_pass: str
    opensearch_verify_ssl: bool = False
    opensearch_index: str = "wazuh-alerts-4.x-*"

    grafana_url: str = ""
    grafana_ds_uid: str = "dfmhsi3iylzb4d"
    grafana_token: str = ""

    abuseipdb_key: str = ""
    otx_key: str = ""
    shodan_key: str = ""
    virustotal_key: str = ""

    telegram_bot_token: str = ""
    telegram_chat_id: str = ""

    class Config:
        env_file = "/opt/code/wazuh_ova/web_app/.env"
        case_sensitive = False

settings = Settings()
```

### 2.3 backend/app/core/security.py
```python
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from .config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
ALGORITHM = "HS256"

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=settings.access_token_expire_minutes))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.secret_key, algorithm=ALGORITHM)

def decode_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
    except JWTError:
        return None
```

### 2.4 backend/app/models/database.py
```python
from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
from ..core.config import settings
import os

os.makedirs("/app/data", exist_ok=True)
engine = create_engine(settings.database_url, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(100), unique=True, nullable=False)
    full_name = Column(String(100), nullable=False)
    hashed_password = Column(String(200), nullable=False)
    role = Column(String(20), default="viewer")  # superadmin|admin|analyst|viewer
    is_active = Column(Boolean, default=True)
    theme = Column(String(10), default="dark")
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login = Column(DateTime, nullable=True)

class AuditLog(Base):
    __tablename__ = "audit_log"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False)
    username = Column(String(50), nullable=False)
    action = Column(String(100), nullable=False)
    target = Column(String(200), nullable=True)
    detail = Column(Text, nullable=True)
    ip_address = Column(String(45), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

class CustomIOC(Base):
    __tablename__ = "custom_ioc"
    id = Column(Integer, primary_key=True, index=True)
    ioc_type = Column(String(20), nullable=False)  # ip|domain|hash|url
    value = Column(String(500), nullable=False, index=True)
    description = Column(Text, nullable=True)
    added_by = Column(String(50), nullable=False)
    added_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)
    severity = Column(String(20), default="high")

class AlertTuning(Base):
    __tablename__ = "alert_tuning"
    id = Column(Integer, primary_key=True, index=True)
    rule_id = Column(String(20), nullable=False, unique=True)
    original_level = Column(Integer, nullable=False)
    tuned_level = Column(Integer, nullable=False)
    reason = Column(Text, nullable=False)
    added_by = Column(String(50), nullable=False)
    added_at = Column(DateTime, default=datetime.utcnow)
    review_date = Column(DateTime, nullable=True)
    status = Column(String(20), default="active")  # active|expired|reverted

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    Base.metadata.create_all(bind=engine)
    from ..core.security import get_password_hash
    db = SessionLocal()
    if not db.query(User).filter(User.username == "admin").first():
        admin = User(
            username="admin",
            email="admin@hospital.wu.ac.th",
            full_name="SOC Administrator",
            hashed_password=get_password_hash("Wazuh@S0C2026!"),
            role="superadmin"
        )
        db.add(admin)
        db.commit()
        print("Default admin user created: admin / Wazuh@S0C2026!")
    db.close()
```

### 2.5 backend/app/services/opensearch_service.py
```python
from opensearchpy import OpenSearch, helpers
from ..core.config import settings
import json

def get_client():
    return OpenSearch(
        hosts=[{"host": settings.opensearch_host, "port": settings.opensearch_port}],
        http_auth=(settings.opensearch_user, settings.opensearch_pass),
        use_ssl=True,
        verify_certs=settings.opensearch_verify_ssl,
        ssl_show_warn=False,
        timeout=30
    )

async def get_alerts(size=50, level_min=1, sources=None, time_range="24h", query_str=None):
    client = get_client()
    must = [{"range": {"@timestamp": {"gte": f"now-{time_range}"}}}]
    if level_min > 1:
        must.append({"range": {"rule.level": {"gte": level_min}}})
    if sources:
        must.append({"terms": {"predecoder.program_name.keyword": sources}})
    if query_str:
        must.append({"query_string": {"query": query_str}})
    body = {
        "size": size,
        "sort": [{"@timestamp": {"order": "desc"}}],
        "query": {"bool": {"must": must}},
        "_source": ["@timestamp", "rule.id", "rule.level", "rule.description",
                    "rule.groups", "data.srcip", "data.dstip", "agent.name",
                    "GeoLocation", "rule.pci_dss", "rule.nist_800_53",
                    "predecoder.program_name", "rule.mitre"]
    }
    try:
        resp = client.search(index=settings.opensearch_index, body=body)
        return [h["_source"] for h in resp["hits"]["hits"]]
    except Exception as e:
        return []

async def get_alert_stats(time_range="24h"):
    client = get_client()
    body = {
        "size": 0,
        "query": {"range": {"@timestamp": {"gte": f"now-{time_range}"}}},
        "aggs": {
            "by_level": {"range": {"field": "rule.level",
                "ranges": [{"key": "critical", "from": 15},
                           {"key": "high",     "from": 12, "to": 15},
                           {"key": "medium",   "from": 7,  "to": 12},
                           {"key": "low",      "from": 1,  "to": 7}]}},
            "by_source": {"terms": {"field": "predecoder.program_name.keyword", "size": 10}},
            "by_country": {"terms": {"field": "GeoLocation.country_name.keyword", "size": 10}},
            "timeline": {"date_histogram": {"field": "@timestamp",
                         "calendar_interval": "1h",
                         "min_doc_count": 0,
                         "extended_bounds": {"min": f"now-{time_range}", "max": "now"}}}
        }
    }
    try:
        return client.search(index=settings.opensearch_index, body=body)
    except Exception as e:
        return {}

async def investigate_entity(value: str, entity_type: str = "auto", time_range: str = "30d"):
    """Search for IP/MAC/User/Hostname across all log sources"""
    client = get_client()
    q = (f'data.srcip:"{value}" OR data.dhcp_ip:"{value}" OR data.mac:"{value}" '
         f'OR data.dstuser:"{value}" OR data.dhcp_mac:"{value}" '
         f'OR data.dhcp_hostname:"{value}" OR src_ip:"{value}"')
    body = {
        "size": 100,
        "sort": [{"@timestamp": {"order": "desc"}}],
        "query": {"bool": {"must": [
            {"query_string": {"query": q}},
            {"range": {"@timestamp": {"gte": f"now-{time_range}"}}}
        ]}},
        "_source": ["@timestamp", "rule.description", "rule.groups", "rule.level",
                    "data.srcip", "data.dstip", "data.dhcp_ip", "data.dhcp_mac",
                    "data.dhcp_hostname", "data.dstuser", "data.mac", "data.ap_mac",
                    "data.ac_msg_type", "data.dhcp_action", "GeoLocation",
                    "predecoder.program_name", "agent.name"]
    }
    try:
        resp = client.search(index=settings.opensearch_index, body=body)
        return [h["_source"] for h in resp["hits"]["hits"]]
    except Exception as e:
        return []
```

### 2.6 backend/app/services/wazuh_service.py
```python
import httpx
from ..core.config import settings

BASE = f"https://{settings.wazuh_api_host}:{settings.wazuh_api_port}"

async def get_token() -> str:
    async with httpx.AsyncClient(verify=False, timeout=10) as c:
        r = await c.post(f"{BASE}/security/user/authenticate",
                         auth=(settings.wazuh_api_user, settings.wazuh_api_pass))
        return r.json()["data"]["token"]

async def wazuh_get(path: str) -> dict:
    token = await get_token()
    async with httpx.AsyncClient(verify=False, timeout=30) as c:
        r = await c.get(f"{BASE}{path}", headers={"Authorization": f"Bearer {token}"})
        return r.json()

async def wazuh_put(path: str, data: str) -> dict:
    token = await get_token()
    async with httpx.AsyncClient(verify=False, timeout=30) as c:
        r = await c.put(f"{BASE}{path}",
                        headers={"Authorization": f"Bearer {token}",
                                 "Content-Type": "application/xml"},
                        content=data.encode())
        return r.json()

async def get_agents():
    return await wazuh_get("/agents?limit=100")

async def get_rules_files():
    return await wazuh_get("/rules/files?limit=100")

async def get_rule_file(filename: str) -> str:
    data = await wazuh_get(f"/rules/files/{filename}?raw=true")
    return data if isinstance(data, str) else str(data)

async def put_rule_file(filename: str, content: str) -> dict:
    return await wazuh_put(f"/rules/files/{filename}", content)

async def restart_manager() -> dict:
    token = await get_token()
    async with httpx.AsyncClient(verify=False, timeout=60) as c:
        r = await c.put(f"{BASE}/manager/restart",
                        headers={"Authorization": f"Bearer {token}"})
        return r.json()

async def get_cluster_health():
    return await wazuh_get("/cluster/healthcheck")
```

### 2.7 backend/app/services/enrichment_service.py
```python
import httpx
from ..core.config import settings

async def check_abuseipdb(ip: str) -> dict:
    if not settings.abuseipdb_key:
        return {"error": "No API key"}
    async with httpx.AsyncClient(timeout=10) as c:
        r = await c.get("https://api.abuseipdb.com/api/v2/check",
                        headers={"Key": settings.abuseipdb_key, "Accept": "application/json"},
                        params={"ipAddress": ip, "maxAgeInDays": 30})
        return r.json().get("data", {})

async def check_otx(ip: str) -> dict:
    if not settings.otx_key:
        return {"error": "No API key"}
    async with httpx.AsyncClient(timeout=10) as c:
        r = await c.get(f"https://otx.alienvault.com/api/v1/indicators/IPv4/{ip}/reputation",
                        headers={"X-OTX-API-KEY": settings.otx_key})
        return r.json()

async def check_shodan(ip: str) -> dict:
    if not settings.shodan_key:
        return {"error": "No API key"}
    async with httpx.AsyncClient(timeout=10) as c:
        r = await c.get(f"https://api.shodan.io/shodan/host/{ip}",
                        params={"key": settings.shodan_key})
        return r.json()

async def enrich_ip(ip: str) -> dict:
    import asyncio, ipaddress
    try:
        if ipaddress.ip_address(ip).is_private:
            return {"is_private": True, "ip": ip}
    except:
        return {}
    abuse, otx, shodan = await asyncio.gather(
        check_abuseipdb(ip),
        check_otx(ip),
        check_shodan(ip),
        return_exceptions=True
    )
    return {
        "ip": ip,
        "is_private": False,
        "abuseipdb": abuse if not isinstance(abuse, Exception) else {},
        "otx": otx if not isinstance(otx, Exception) else {},
        "shodan": shodan if not isinstance(shodan, Exception) else {},
    }
```

### 2.8 backend/app/routers/ — create all routers

Create `/backend/app/routers/auth.py` with:
- POST /auth/login → returns JWT
- GET /auth/me → current user info
- POST /auth/logout

Create `/backend/app/routers/dashboard.py` with:
- GET /dashboard/stats?time_range=24h → alert counts by level, source, country, timeline
- GET /dashboard/cluster → Wazuh cluster health
- GET /dashboard/sources → log source activity

Create `/backend/app/routers/alerts.py` with:
- GET /alerts?level=7&source=fortigate&limit=50&time_range=24h → paginated alerts
- GET /alerts/{alert_id} → full alert detail
- GET /alerts/stream → WebSocket live feed
- POST /alerts/{alert_id}/tune → add to tuning

Create `/backend/app/routers/investigate.py` with:
- GET /investigate?q=10.251.66.51&type=ip&time_range=30d → multi-source lookup
- GET /investigate/enrich?ip=1.2.3.4 → AbuseIPDB + OTX + Shodan

Create `/backend/app/routers/ioc.py` with:
- GET /ioc/search?q=1.2.3.4 → cross-check all feeds
- GET /ioc/custom → list custom IOC
- POST /ioc/custom → add IOC
- DELETE /ioc/custom/{id} → remove IOC

Create `/backend/app/routers/admin.py` with:
- GET /admin/rules → list rule files
- GET /admin/rules/{filename} → get file content
- PUT /admin/rules/{filename} → save file content
- POST /admin/rules/validate → xmllint validation
- POST /admin/deploy → restart Wazuh Master
- GET /admin/tuning → list alert tuning entries
- POST /admin/tuning → add tuning entry
- GET /admin/users → list users (superadmin only)
- POST /admin/users → create user
- GET /admin/audit → audit log

Create `/backend/app/routers/compliance.py` with:
- GET /compliance/summary → counts per framework
- GET /compliance/sca → SCA results per agent
- GET /compliance/vulnerabilities → CVE findings

Create `/backend/app/routers/assets.py` with:
- GET /assets/devices → IP-MAC-User-Hostname table
- GET /assets/sessions → WiFi sessions (Huawei AC)
- GET /assets/dhcp → DHCP lease history

Create `/backend/app/routers/kpi.py` with:
- GET /kpi/summary → MTTD, alert volume, fp rate
- GET /kpi/timeline?days=30 → daily alert trend

Create `/backend/app/routers/ws.py` with WebSocket:
- WS /ws/alerts → push new alerts every 10s via OpenSearch polling

### 2.9 backend/app/main.py
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from contextlib import asynccontextmanager
from .models.database import init_db
from .routers import auth, dashboard, alerts, investigate, ioc, admin, compliance, assets, kpi, ws
from .core.config import settings

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    print(f"SOC Center API started — base path: {settings.app_base_path}")
    yield

app = FastAPI(
    title="SOC Center API",
    version="1.0.0",
    root_path=settings.app_base_path,
    lifespan=lifespan
)

app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(CORSMiddleware,
    allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"])

for router in [auth, dashboard, alerts, investigate, ioc, admin, compliance, assets, kpi, ws]:
    app.include_router(router.router, prefix="/api", tags=[router.__name__.split(".")[-1]])

@app.get("/api/health")
async def health():
    return {"status": "ok", "app": settings.app_name}
```

---

## PHASE 3 — FRONTEND: React Application

### 3.1 Frontend setup
```bash
cd /opt/code/wazuh_ova/web_app/frontend
npm create vite@latest . -- --template react --yes
npm install @mui/material @mui/icons-material @emotion/react @emotion/styled
npm install @mui/x-data-grid @mui/x-charts
npm install tailwindcss postcss autoprefixer
npx tailwindcss init -p
npm install react-router-dom axios @tanstack/react-query
npm install monaco-editor @monaco-editor/react
npm install react-simple-maps d3 d3-geo recharts
npm install notistack date-fns clsx
```

### 3.2 tailwind.config.js
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: 'class',
  ctype: 'media',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      colors: {
        soc: {
          dark: '#0f172a',
          panel: '#1e293b',
          border: '#334155',
          text: '#e2e8f0',
          muted: '#94a3b8',
          accent: '#3b82f6',
          critical: '#ef4444',
          high: '#f59e0b',
          medium: '#3b82f6',
          low: '#10b981',
        }
      }
    }
  },
  plugins: [],
}
```

### 3.3 src/main.jsx — IBM Plex Sans + MUI Theme + Dark/Light Mode
```jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { ThemeProvider } from './theme/ThemeContext'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SnackbarProvider } from 'notistack'
import '@fontsource/ibm-plex-sans/300.css'
import '@fontsource/ibm-plex-sans/400.css'
import '@fontsource/ibm-plex-sans/500.css'
import '@fontsource/ibm-plex-sans/600.css'
import '@fontsource/ibm-plex-sans/700.css'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30000 } }
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <SnackbarProvider maxSnack={4} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <App />
      </SnackbarProvider>
    </ThemeProvider>
  </QueryClientProvider>
)
```

### 3.4 src/theme/ThemeContext.jsx — MUI + Tailwind dark/light mode
Create ThemeContext that:
- Reads initial theme from localStorage ('dark'|'light')
- Creates MUI theme with IBM Plex Sans font family
- Dark theme: background #0f172a, paper #1e293b, primary #3b82f6
- Light theme: background #f1f5f9, paper #ffffff, primary #1d4ed8
- Syncs 'dark' class on <html> for Tailwind
- Exports useThemeMode() hook

### 3.5 src/App.jsx — Router with protected routes
```jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/layout/Layout'
import LoginPage from './components/auth/LoginPage'
import DashboardPage from './components/dashboard/DashboardPage'
import AlertsPage from './components/alerts/AlertsPage'
import InvestigatePage from './components/investigate/InvestigatePage'
import IOCPage from './components/ioc/IOCPage'
import CompliancePage from './components/compliance/CompliancePage'
import AssetsPage from './components/assets/AssetsPage'
import AdminPage from './components/admin/AdminPage'
import KPIPage from './components/kpi/KPIPage'
import { useAuth } from './hooks/useAuth'

const BASE = import.meta.env.VITE_BASE_PATH || '/wazuh'

function ProtectedRoute({ children, roles }) {
  const { user, isAuthenticated } = useAuth()
  if (!isAuthenticated) return <Navigate to={`${BASE}/login`} replace />
  if (roles && !roles.includes(user?.role)) return <Navigate to={`${BASE}/`} replace />
  return children
}

export default function App() {
  return (
    <BrowserRouter basename={BASE}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<DashboardPage />} />
          <Route path="alerts" element={<AlertsPage />} />
          <Route path="investigate" element={<InvestigatePage />} />
          <Route path="ioc" element={<IOCPage />} />
          <Route path="compliance" element={<CompliancePage />} />
          <Route path="assets" element={<AssetsPage />} />
          <Route path="kpi" element={<KPIPage />} />
          <Route path="admin/*" element={
            <ProtectedRoute roles={["admin","superadmin"]}><AdminPage /></ProtectedRoute>
          } />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
```

### 3.6 Layout component requirements
Create `src/components/layout/Layout.jsx`:
- Responsive sidebar (drawer on mobile, permanent on desktop ≥md)
- Topbar: SOC Center title, live alert badge (WebSocket count), theme toggle, user menu
- Sidebar nav items with Thai labels:
  - 🛡️ แดชบอร์ด → /
  - 🚨 แจ้งเตือนภัยคุกคาม → /alerts
  - 🔍 สืบสวน → /investigate
  - 🌐 ศูนย์ IOC → /ioc
  - 📋 ความสอดคล้อง → /compliance
  - 📊 สินทรัพย์เครือข่าย → /assets
  - 📈 KPI ประสิทธิภาพ → /kpi
  - ⚙️ ผู้ดูแลระบบ → /admin (admin/superadmin only)
- Status bar: cluster health indicators
- Mobile: hamburger menu, bottom navigation for main pages

### 3.7 Dashboard page requirements
`src/components/dashboard/DashboardPage.jsx`:
- Metric cards: Critical (red), High (amber), Medium (blue), Sources Active (green)
- Alert trend chart (line/area) using Recharts — split by Critical/High/Medium
- Source breakdown donut chart
- World attack map using react-simple-maps with GeoLocation data
- Recent alerts stream (last 10, auto-refresh 30s)
- Cluster health panel (Master/Worker/Indexer/Dashboard status)
- All using MUI components (Card, Chip, Tooltip, etc.) + Tailwind spacing

### 3.8 Alerts page requirements
`src/components/alerts/AlertsPage.jsx`:
- MUI DataGrid with columns: time, level badge, description, source, srcip, country, groups
- Filter bar: level range, source select, time range, full-text search
- Left color indicator per row (red=15+, amber=12-14, blue=7-11, gray<7)
- Click row → Alert Detail Drawer (full data + enrichment: AbuseIPDB, OTX, GeoIP)
- Action buttons in drawer: "Investigate IP", "Add to IOC", "Add Tuning Override"
- Real-time badge showing new alerts since last load
- Export to CSV button

### 3.9 Investigate page requirements
`src/components/investigate/InvestigatePage.jsx`:
- Search bar with type selector: IP Address / MAC Address / Username / Hostname
- Identity Card panel: IP ↔ MAC ↔ Hostname ↔ User ↔ AP (from Infoblox + Huawei AC)
- DHCP Lease History table (from Infoblox dhcp data)
- WiFi Sessions table (from Huawei AC: user, IP, MAC, AP, login/logout time)
- Threat Intelligence panel: AbuseIPDB score gauge, OTX match count, Shodan ports
- Event Timeline: all events from this entity across all sources
- GeoIP card: country, city, ISP, coordinates

### 3.10 IOC Center page requirements
`src/components/ioc/IOCPage.jsx`:
- Search bar: query IP/Domain/Hash against OTX + AbuseIPDB + Custom IOC list
- IOC results card: confidence score, first/last seen, tags, source feeds
- Custom IOC management table with add/remove/expire
- IOC match history: "ตรงกับ alert ไหนบ้างใน 30 วัน"

### 3.11 Compliance page requirements
`src/components/compliance/CompliancePage.jsx`:
- Framework tabs: PCI DSS | HIPAA | GDPR | NIST 800-53 | TSC
- Each tab: alert count by requirement, trend chart, top violations table
- SCA section: CIS Benchmark pass/fail per host (from Wazuh API)
- CVE Vulnerability summary table (from Wazuh vulnerability-detection)
- Grafana embed iframe (Compliance Executive dashboard)

### 3.12 Admin page requirements
`src/components/admin/AdminPage.jsx`:
- Sub-navigation: Rules | Decoders | Alert Tuning | Alert Config | Users | Audit Log
- Rules tab: file tree (left), Monaco editor XML (center), rule inspector (right)
  - Validate button → POST /api/admin/rules/validate
  - Save button → PUT /api/admin/rules/{filename}
  - Deploy button → POST /api/admin/deploy (restart)
- Alert Tuning tab: list of overrides from DB + form to add new
- Alert Config tab: form for Telegram token/chat_id/level threshold
- Users tab: CRUD user management (superadmin only)
- Audit Log tab: table of all admin actions

### 3.13 vite.config.js
```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/wazuh/',
  server: {
    port: 5173,
    proxy: {
      '/wazuh/api': { target: 'http://wazuhweb_backend:8000', changeOrigin: true },
      '/wazuh/ws':  { target: 'ws://wazuhweb_backend:8000', ws: true }
    }
  },
  build: { outDir: 'dist', sourcemap: false }
})
```

---

## PHASE 4 — DOCKER CONFIGURATION

### 4.1 backend/Dockerfile
```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app/ ./app/
RUN mkdir -p /app/data
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
```

### 4.2 frontend/Dockerfile (multi-stage)
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html/wazuh
COPY nginx-frontend.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

frontend/nginx-frontend.conf:
```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    location /wazuh {
        try_files $uri $uri/ /wazuh/index.html;
    }
    location /wazuh/api {
        proxy_pass http://wazuhweb_backend:8000/api;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    location /wazuh/ws {
        proxy_pass http://wazuhweb_backend:8000/api/ws;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### 4.3 nginx/Dockerfile (TLS reverse proxy)
```dockerfile
FROM nginx:alpine
COPY nginx.conf /etc/nginx/nginx.conf
COPY ssl/ /etc/nginx/ssl/
EXPOSE 3348
```

nginx/nginx.conf:
```nginx
events { worker_connections 1024; }
http {
    server {
        listen 3348 ssl;
        ssl_certificate     /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;

        location /wazuh {
            proxy_pass http://wazuhweb_frontend:80;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }

        location /wazuh/ws {
            proxy_pass http://wazuhweb_backend:8000/api/ws;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_read_timeout 86400;
        }
    }
}
```

### 4.4 docker/docker-compose.yml
```yaml
version: '3.8'

networks:
  wazuhweb_net:
    driver: bridge
    name: wazuhweb_net

volumes:
  wazuhweb_db_data:
    name: wazuhweb_db_data

services:
  wazuhweb_backend:
    build:
      context: ../backend
      dockerfile: Dockerfile
    container_name: wazuhweb_backend
    restart: unless-stopped
    env_file:
      - /opt/code/wazuh_ova/web_app/.env
    volumes:
      - wazuhweb_db_data:/app/data
      - /opt/code/wazuh_ova:/opt/code/wazuh_ova:ro
    networks:
      - wazuhweb_net
    extra_hosts:
      - "host.docker.internal:host-gateway"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    logging:
      driver: "json-file"
      options: { max-size: "10m", max-file: "3" }

  wazuhweb_frontend:
    build:
      context: ../frontend
      dockerfile: Dockerfile
    container_name: wazuhweb_frontend
    restart: unless-stopped
    depends_on:
      wazuhweb_backend:
        condition: service_healthy
    networks:
      - wazuhweb_net
    logging:
      driver: "json-file"
      options: { max-size: "10m", max-file: "3" }

  wazuhweb_nginx:
    build:
      context: ../nginx
      dockerfile: Dockerfile
    container_name: wazuhweb_nginx
    restart: unless-stopped
    ports:
      - "3348:3348"
    depends_on:
      - wazuhweb_frontend
      - wazuhweb_backend
    networks:
      - wazuhweb_net
    logging:
      driver: "json-file"
      options: { max-size: "10m", max-file: "3" }
```

---

## PHASE 5 — SSL CERTIFICATE + DEPLOY SCRIPT

### 5.1 Generate self-signed SSL certificate
```bash
mkdir -p /opt/code/wazuh_ova/web_app/nginx/ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /opt/code/wazuh_ova/web_app/nginx/ssl/key.pem \
  -out /opt/code/wazuh_ova/web_app/nginx/ssl/cert.pem \
  -subj "/C=TH/ST=NakhonSiThammarat/L=ThasalaDistrict/O=WalailakUniversityHospital/CN=soc.hospital.wu.ac.th" \
  -addext "subjectAltName=IP:10.251.150.222,DNS:soc.hospital.wu.ac.th,DNS:localhost"
echo "SSL certificate generated"
ls -lh /opt/code/wazuh_ova/web_app/nginx/ssl/
```

### 5.2 Create full deploy script
Create `/opt/code/wazuh_ova/web_app/deploy.sh`:
```bash
#!/bin/bash
# SOC Center — Full Deploy Script
# Hospital Walailak University
# Usage: bash deploy.sh [build|restart|logs|stop|status]

set -e
COMPOSE_FILE="/opt/code/wazuh_ova/web_app/docker/docker-compose.yml"
APP_URL="https://10.251.150.222:3348/wazuh"
LOG_FILE="/var/log/soc_center_deploy.log"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a $LOG_FILE; }

check_ports() {
  log "Checking port availability..."
  if ss -tlnp | grep -q ":3348 "; then
    log "WARNING: Port 3348 already in use"
    docker ps | grep -q "wazuhweb_nginx" && log "→ Used by wazuhweb_nginx (will be replaced)" || \
      log "→ Used by another service — update docker-compose.yml"
  fi
}

build_and_start() {
  log "=== SOC Center Full Deploy Started ==="
  check_ports
  docker network create wazuhweb_net 2>/dev/null || log "Network already exists"
  log "Building images..."
  docker compose -f $COMPOSE_FILE build --no-cache
  log "Starting services..."
  docker compose -f $COMPOSE_FILE up -d
  log "Waiting for services to be healthy..."
  sleep 20
  docker compose -f $COMPOSE_FILE ps
  log "=== Deploy Complete ==="
  log "URL: $APP_URL"
  log "Default login: admin / Wazuh@S0C2026!"
}

case "${1:-build}" in
  build|deploy) build_and_start ;;
  restart) docker compose -f $COMPOSE_FILE restart && log "Restarted" ;;
  stop)    docker compose -f $COMPOSE_FILE down && log "Stopped" ;;
  logs)    docker compose -f $COMPOSE_FILE logs -f --tail=100 ;;
  status)  docker compose -f $COMPOSE_FILE ps && docker compose -f $COMPOSE_FILE logs --tail=20 ;;
  *)       echo "Usage: $0 [build|restart|stop|logs|status]" ;;
esac
```
```bash
chmod +x /opt/code/wazuh_ova/web_app/deploy.sh
```

---

## PHASE 6 — BUILD AND VERIFY

### 6.1 Install npm dependencies for IBM Plex Sans font
```bash
cd /opt/code/wazuh_ova/web_app/frontend
npm install @fontsource/ibm-plex-sans @fontsource/ibm-plex-mono
```

### 6.2 Run full deploy
```bash
cd /opt/code/wazuh_ova/web_app
bash deploy.sh build
```

### 6.3 Verify all containers running
```bash
echo "=== Container Status ==="
docker ps --filter "name=wazuhweb" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "=== Backend health ==="
docker exec wazuhweb_backend curl -s http://localhost:8000/api/health | python3 -m json.tool

echo ""
echo "=== Nginx TLS test ==="
curl -sk https://10.251.150.222:3348/wazuh/api/health | python3 -m json.tool

echo ""
echo "=== SQLite DB initialized ==="
docker exec wazuhweb_backend python3 -c "
from app.models.database import SessionLocal, User
db = SessionLocal()
users = db.query(User).all()
print(f'Users: {len(users)}')
for u in users: print(f'  {u.username} ({u.role})')
db.close()
"
```

### 6.4 Test login API
```bash
curl -sk -X POST https://10.251.150.222:3348/wazuh/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Wazuh@S0C2026!"}' | \
  python3 -c "
import sys, json
d = json.load(sys.stdin)
if 'access_token' in d:
    print('Login: ✅ SUCCESS')
    print('Token:', d['access_token'][:30] + '...')
else:
    print('Login: ❌ FAILED')
    print(d)
"
```

### 6.5 Test OpenSearch connectivity through backend
```bash
TOKEN=$(curl -sk -X POST https://10.251.150.222:3348/wazuh/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Wazuh@S0C2026!"}' | \
  python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))")

curl -sk https://10.251.150.222:3348/wazuh/api/dashboard/stats \
  -H "Authorization: Bearer $TOKEN" | \
  python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print('Dashboard stats: ✅ OK')
    print(json.dumps(d, indent=2, ensure_ascii=False)[:500])
except Exception as e:
    print(f'Error: {e}')
"
```

---

## PHASE 7 — THAI DEPLOYMENT REPORT

After all phases complete and tests pass, write the complete Thai report:

Create `/opt/code/wazuh_ova/web_app/docs/DEPLOYMENT_REPORT_TH.md`:

```markdown
# รายงานการติดตั้ง SOC Center Web Application
**วันที่:** [วันที่จริง]
**เวอร์ชัน:** 1.0.0
**ผู้ดำเนินการ:** AI Agent (ภายใต้การดูแล)
**สถานะ:** [✅ สำเร็จ / ❌ มีปัญหา]

---

## 1. ภาพรวมระบบ

SOC Center เป็น Web Application สำหรับศูนย์ปฏิบัติการความปลอดภัย (SOC) ของ
โรงพยาบาลวลัยลักษณ์ ออกแบบมาเพื่อให้อินเทอร์เฟซที่ใช้งานง่ายสำหรับระบบ Wazuh SIEM
ที่มีอยู่แล้ว รองรับการทำงานบนทุกอุปกรณ์และทั้งสองโหมดสี (มืด/สว่าง)

**URL เข้าใช้งาน:** https://10.251.150.222:3348/wazuh

---

## 2. สถาปัตยกรรมระบบ

### Stack ที่ใช้
| ชั้น | เทคโนโลยี | เหตุผล |
|------|-----------|--------|
| Frontend | React + Vite | Fast, component-based |
| UI Library | MUI v5 + Tailwind CSS | ครบทั้ง component และ utility |
| Font | IBM Plex Sans | มืออาชีพ รองรับภาษาไทย |
| Backend | FastAPI (Python) | Async, เร็ว, เข้ากับ script ที่มีอยู่ |
| Database | SQLite | เบา ไม่ต้องการ server แยก |
| Proxy | Nginx | TLS termination, reverse proxy |
| Container | Docker Compose | Deploy ง่าย, portable |

### Docker Containers
| Container | หน้าที่ | Port |
|-----------|---------|------|
| wazuhweb_nginx | TLS Reverse Proxy | 3348:3348 |
| wazuhweb_frontend | React SPA (Nginx serve) | internal |
| wazuhweb_backend | FastAPI REST + WebSocket | internal |

---

## 3. หน้าที่ในระบบ

| หน้า | URL | ฟีเจอร์หลัก |
|------|-----|-------------|
| แดชบอร์ด | /wazuh/ | ภาพรวม alert, attack map, cluster health |
| แจ้งเตือนภัยคุกคาม | /wazuh/alerts | Live alerts, filter, enrichment detail |
| สืบสวน | /wazuh/investigate | ค้นหา IP/MAC/User/Hostname จากทุก source |
| ศูนย์ IOC | /wazuh/ioc | IOC search, custom blocklist |
| ความสอดคล้อง | /wazuh/compliance | PCI/HIPAA/GDPR/NIST/TSC dashboard |
| สินทรัพย์เครือข่าย | /wazuh/assets | IP-MAC-User binding, DHCP, WiFi |
| KPI | /wazuh/kpi | MTTD/MTTR, alert volume trend |
| ผู้ดูแลระบบ | /wazuh/admin | Rules, Tuning, Users, Audit |

---

## 4. บัญชีผู้ใช้เริ่มต้น

| Username | Password | Role | สิทธิ์ |
|----------|----------|------|--------|
| admin | Wazuh@S0C2026! | superadmin | ทุกอย่าง |

⚠️ **กรุณาเปลี่ยนรหัสผ่านทันทีหลังเข้าใช้งานครั้งแรก**

---

## 5. ไฟล์สำคัญ

| ไฟล์/โฟลเดอร์ | ตำแหน่ง | หมายเหตุ |
|---------------|---------|----------|
| Environment variables | /opt/code/wazuh_ova/web_app/.env | Credential ทั้งหมด |
| Database | Docker volume: wazuhweb_db_data | users, audit_log, custom_ioc |
| SSL Certificate | /opt/code/wazuh_ova/web_app/nginx/ssl/ | Self-signed, expire 365 วัน |
| Deploy script | /opt/code/wazuh_ova/web_app/deploy.sh | Full deployment |
| Docker Compose | /opt/code/wazuh_ova/web_app/docker/docker-compose.yml | Container config |

---

## 6. คำสั่งสำคัญ

### เริ่มต้น/หยุดระบบ
```bash
# Deploy ใหม่ทั้งหมด (build + start)
bash /opt/code/wazuh_ova/web_app/deploy.sh build

# Restart containers
bash /opt/code/wazuh_ova/web_app/deploy.sh restart

# ดู logs
bash /opt/code/wazuh_ova/web_app/deploy.sh logs

# ตรวจสอบสถานะ
bash /opt/code/wazuh_ova/web_app/deploy.sh status

# หยุดระบบ
bash /opt/code/wazuh_ova/web_app/deploy.sh stop
```

### ตรวจสอบระบบ
```bash
# สถานะ containers
docker ps --filter "name=wazuhweb"

# ดู log backend
docker logs wazuhweb_backend --tail=50

# ดู log frontend
docker logs wazuhweb_frontend --tail=50

# ทดสอบ API
curl -sk https://10.251.150.222:3348/wazuh/api/health
```

---

## 7. ผลการทดสอบ

| รายการทดสอบ | ผลลัพธ์ |
|-------------|---------|
| Container wazuhweb_nginx | [OK/FAIL] |
| Container wazuhweb_backend | [OK/FAIL] |
| Container wazuhweb_frontend | [OK/FAIL] |
| HTTPS :3348 accessible | [OK/FAIL] |
| API /health endpoint | [OK/FAIL] |
| Login API | [OK/FAIL] |
| OpenSearch connectivity | [OK/FAIL] |
| Wazuh API connectivity | [OK/FAIL] |
| SQLite DB initialized | [OK/FAIL] |
| Default admin user created | [OK/FAIL] |

---

## 8. ข้อควรระวัง

1. **SSL Certificate**: ใช้ self-signed certificate, browser จะแจ้ง warning ให้กด "Advanced → Proceed"
2. **Default Password**: เปลี่ยนรหัสผ่าน admin ทันทีหลัง deploy
3. **Network Access**: ให้เข้าถึงผ่าน VPN หรือ IP whitelist เท่านั้น
4. **Port 3348**: ถ้าใช้งาน firewall ให้เปิด port นี้เฉพาะ IP ที่อนุญาต

---

## 9. ขั้นตอนต่อไป

1. เปลี่ยนรหัสผ่าน admin
2. สร้าง user สำหรับทีม SOC แต่ละคน (role: analyst/viewer)
3. ทดสอบ dark/light mode toggle บนมือถือ
4. ตรวจสอบว่า Grafana iframe โหลดถูกต้อง
5. ทดสอบ WebSocket live alerts
6. Renew SSL certificate ก่อนครบ 365 วัน

---

*รายงานนี้สร้างโดย AI Agent อัตโนมัติ | วลัยลักษณ์ SOC Center v1.0.0*
```

---

## PHASE 8 — FINAL VERIFICATION SUMMARY

```
════════════════════════════════════════════════════════════
  SOC Center Deployment — Final Status
  URL: https://10.251.150.222:3348/wazuh
  Date: [DATE]
════════════════════════════════════════════════════════════

CONTAINERS
  wazuhweb_nginx     : [running/stopped] port 3348
  wazuhweb_backend   : [running/stopped] healthy
  wazuhweb_frontend  : [running/stopped]

CONNECTIVITY
  HTTPS :3348              : [OK/FAIL]
  Backend /api/health      : [OK/FAIL]
  OpenSearch (10.251.151.13): [OK/FAIL]
  Wazuh API (10.251.151.11) : [OK/FAIL]

FEATURES
  IBM Plex Sans font       : [loaded/missing]
  MUI + Tailwind           : [working/error]
  Dark/Light mode          : [working/error]
  Responsive (mobile)      : [working/error]
  WebSocket live alerts    : [working/error]
  JWT Authentication       : [working/error]

DATABASE
  SQLite initialized       : [OK/FAIL]
  Default admin created    : [OK/FAIL]
  Tables: users, audit_log, custom_ioc, alert_tuning

LOGIN
  URL      : https://10.251.150.222:3348/wazuh/login
  Username : admin
  Password : Wazuh@S0C2026!

DEPLOY SCRIPT : /opt/code/wazuh_ova/web_app/deploy.sh
REPORT (TH)   : /opt/code/wazuh_ova/web_app/docs/DEPLOYMENT_REPORT_TH.md
════════════════════════════════════════════════════════════
```
