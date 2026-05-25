# Agent Prompt: MISP Installation + Wazuh Integration
# Target VM: 10.251.151.15 (existing Shuffle + IRIS VM)
# Project: /opt/code/wazuh_ova/
# Credentials: /opt/code/wazuh_ova/.env
# Created: 2026-05-25

---

## SYSTEM CONTEXT

You are a senior SOC engineer installing MISP (Malware Information Sharing Platform)
on the existing SOAR VM alongside Shuffle SOAR and DFIR-IRIS. You will then
integrate MISP with the Wazuh cluster using two methods:
  1. CDB List Sync — hourly IOC sync to Wazuh CDB lists
  2. Real-time Query — custom-misp.py for per-alert enrichment

```
SOAR VM (existing, adding MISP):
  IP   : 10.251.151.15
  OS   : Linux (check exact version)
  Running: Shuffle SOAR + DFIR-IRIS (Docker)
  New  : MISP (Docker, port 4430 web to avoid conflict)

Wazuh Cluster (DO NOT touch except ossec.conf + scripts):
  Master  : 10.251.151.11  Wazuh 4.14.5
  Worker  : 10.251.151.12
  Indexer : 10.251.151.13  OpenSearch 7.10.2

Credentials: /opt/code/wazuh_ova/.env
  (read MISP_URL, MISP_ADMIN_EMAIL, MISP_ADMIN_PASS, MISP_API_KEY from .env
   or generate/add them if not present)

Project scripts output: /opt/code/wazuh_ova/integrations/misp/
Project docs output   : /opt/code/wazuh_ova/docs/current/MISP_INTEGRATION.md
```

---

## OPERATING RULES

- Read /opt/code/wazuh_ova/.env FIRST — all credentials from here
- Check VM RAM and existing ports BEFORE installing MISP
- If RAM < 8GB free → WARN and ask before proceeding
- Port conflicts: check 4430, 3307 (MariaDB alt), 6380 (Redis alt) are free
- All MISP containers named with prefix `misp_` (misp_core, misp_db, misp_redis)
- MISP Docker project dir: /opt/misp-docker/
- Validate each phase before moving to next
- Do NOT restart Wazuh without xmllint validation
- Thai deployment report at the end

---

## PHASE 0 — RESOURCE CHECK AND .ENV AUDIT

### 0.1 Check VM resources on SOAR VM
```bash
SSH_HOST="10.251.151.15"
SSH_USER="ubuntu"  # adjust if different

ssh ${SSH_USER}@${SSH_HOST} "
  echo '=== OS and Kernel ==='
  cat /etc/os-release | grep -E 'NAME|VERSION'
  uname -r

  echo ''
  echo '=== RAM Available ==='
  free -h
  TOTAL_MEM=\$(free -m | awk '/^Mem:/{print \$2}')
  FREE_MEM=\$(free -m | awk '/^Mem:/{print \$7}')
  echo \"Total: \${TOTAL_MEM}MB | Available: \${FREE_MEM}MB\"
  [ \$FREE_MEM -lt 3500 ] && echo 'WARNING: Less than 3.5GB available — MISP may be unstable' || \
    echo 'OK: Sufficient RAM for MISP'

  echo ''
  echo '=== Disk Space ==='
  df -h / /var 2>/dev/null | head -5
  
  echo ''
  echo '=== Running Docker containers ==='
  docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' 2>/dev/null

  echo ''
  echo '=== Port availability ==='
  for port in 4430 8080 3307 6380 4433; do
    ss -tlnp 2>/dev/null | grep -q \":\$port \" && \
      echo \"Port \$port: BUSY\" || echo \"Port \$port: FREE\"
  done

  echo ''
  echo '=== Docker networks ==='
  docker network ls
"
```

If RAM < 6GB total OR < 3GB available → STOP and report:
"WARNING: VM may not have enough RAM to run MISP alongside Shuffle+IRIS.
 Current: [X]GB available. MISP needs at least 3.5GB additional.
 Options:
   1. Proceed anyway (MISP may be unstable)
   2. Add swap space (workaround)
   3. Use a separate VM instead
 Proceeding to add swap as safety net..."

### 0.2 Add swap if needed
```bash
ssh ${SSH_USER}@${SSH_HOST} "
  SWAP=\$(swapon --show | wc -l)
  if [ \$SWAP -le 1 ]; then
    echo 'No swap — creating 4GB swapfile...'
    sudo fallocate -l 4G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
    free -h
  else
    echo 'Swap already configured'
    swapon --show
  fi
"
```

### 0.3 Read and verify .env credentials
```bash
source /opt/code/wazuh_ova/.env

echo "=== .env MISP entries ==="
echo "MISP_URL:         ${MISP_URL:-NOT SET — will set after install}"
echo "MISP_ADMIN_EMAIL: ${MISP_ADMIN_EMAIL:-NOT SET}"
echo "MISP_ADMIN_PASS:  ${MISP_ADMIN_PASS:+SET (${#MISP_ADMIN_PASS} chars)}"
echo "MISP_API_KEY:     ${MISP_API_KEY:-NOT SET — will generate after install}"
echo "WAZUH_API_USER:   ${WAZUH_API_USER:+SET}"
echo "WAZUH_API_PASS:   ${WAZUH_API_PASS:+SET}"
echo "OPENSEARCH_USER:  ${OPENSEARCH_USER:+SET}"
echo "TELEGRAM_BOT_TOKEN:${TELEGRAM_BOT_TOKEN:+SET}"
echo "TELEGRAM_CHAT_ID: ${TELEGRAM_CHAT_ID:-NOT SET}"
```

If MISP_ADMIN_EMAIL or MISP_ADMIN_PASS not set, generate and add to .env:
```bash
grep -q "MISP_ADMIN_EMAIL" /opt/code/wazuh_ova/.env || \
  echo "MISP_ADMIN_EMAIL=misp-admin@hospital.wu.ac.th" >> /opt/code/wazuh_ova/.env

grep -q "MISP_ADMIN_PASS" /opt/code/wazuh_ova/.env || \
  echo "MISP_ADMIN_PASS=$(python3 -c "import secrets,string; print(''.join(secrets.choice(string.ascii_letters+string.digits+'@#%') for _ in range(20)))")" >> /opt/code/wazuh_ova/.env

source /opt/code/wazuh_ova/.env
echo "MISP credentials ready: ${MISP_ADMIN_EMAIL}"
```

---

## PHASE 1 — INSTALL MISP VIA DOCKER

### 1.1 Clone misp-docker on SOAR VM
```bash
source /opt/code/wazuh_ova/.env

ssh ${SSH_USER}@${SSH_HOST} "
  echo '=== Clone MISP Docker (official) ==='
  sudo git clone https://github.com/MISP/misp-docker /opt/misp-docker 2>/dev/null || \
    sudo git -C /opt/misp-docker pull

  ls /opt/misp-docker/
"
```

### 1.2 Create MISP .env with port adjustments
```bash
source /opt/code/wazuh_ova/.env

ssh ${SSH_USER}@${SSH_HOST} "
  cd /opt/misp-docker

  # Copy template
  sudo cp template.env .env

  # Configure — use ports that don't conflict with Shuffle/IRIS
  sudo tee .env > /dev/null << MISP_ENV
# MISP Docker Configuration
# Installed alongside Shuffle (3001) and DFIR-IRIS (8443)
# Web port: 4430 (HTTPS) to avoid IRIS 8443 conflict

# Base URL — accessible from internal network
BASE_URL=https://10.251.151.15:4430

# Admin credentials
ADMIN_EMAIL=${MISP_ADMIN_EMAIL:-misp-admin@hospital.wu.ac.th}
ADMIN_PASSWORD=${MISP_ADMIN_PASS:-MISPwhu2026!}
ADMIN_KEY=                # Will be set after first run

# Database (port 3307 to avoid standard 3306 conflicts)
MYSQL_ROOT_PASSWORD=$(python3 -c "import secrets; print(secrets.token_urlsafe(24))")
MYSQL_DATABASE=misp
MYSQL_USER=misp
MYSQL_PASSWORD=$(python3 -c "import secrets; print(secrets.token_urlsafe(24))")
MYSQL_HOST=misp_db
MYSQL_PORT=3306

# Redis (using internal container network, no port expose needed)
REDIS_BACKEND=misp_redis
REDIS_PORT=6379
REDIS_PASSWORD=

# Proxy (blank = no proxy)
PROXY_HOST=
PROXY_PORT=
PROXY_USER=
PROXY_PASSWORD=

# Email/SMTP (optional)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=

# Organisation
ORG_NAME=Walailak University Hospital SOC
ORG_UUID=

# Misc
PHP_MEMORY_LIMIT=2048M
WORKERS=2
DEBUG=false
ENABLE_DB_SETTINGS=true
MISP_ENV
  echo '.env created'
  sudo cat .env | grep -v PASSWORD | grep -v KEY
"
```

### 1.3 Create custom docker-compose.yml with named containers
```bash
ssh ${SSH_USER}@${SSH_HOST} "
  cat > /opt/misp-docker/docker-compose.override.yml << 'COMPOSE_OVERRIDE'
# Override: use misp_ prefix for containers, custom ports
services:
  misp-core:
    container_name: misp_core
    ports:
      - '4430:443'
      - '4480:80'
    restart: unless-stopped
    mem_limit: 2g
    memswap_limit: 4g
    networks:
      - misp_net

  misp-modules:
    container_name: misp_modules
    restart: unless-stopped
    mem_limit: 512m
    networks:
      - misp_net

  db:
    container_name: misp_db
    restart: unless-stopped
    mem_limit: 512m
    networks:
      - misp_net

  redis:
    container_name: misp_redis
    restart: unless-stopped
    mem_limit: 256m
    networks:
      - misp_net

networks:
  misp_net:
    name: misp_net
    driver: bridge
COMPOSE_OVERRIDE
  echo 'docker-compose.override.yml created'
"
```

### 1.4 Pull and start MISP
```bash
ssh ${SSH_USER}@${SSH_HOST} "
  cd /opt/misp-docker

  echo '=== Pulling MISP images (may take 5-10 minutes) ==='
  sudo docker compose pull

  echo '=== Starting MISP ==='
  sudo docker compose up -d

  echo 'Waiting 90 seconds for MISP to initialize...'
  sleep 90

  echo '=== Container status ==='
  sudo docker compose ps
  sudo docker ps --filter 'name=misp_' --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
"
```

### 1.5 Wait for MISP to become healthy
```bash
ssh ${SSH_USER}@${SSH_HOST} "
  echo 'Checking MISP health (max 5 minutes)...'
  for i in \$(seq 1 30); do
    STATUS=\$(sudo docker inspect misp_core --format '{{.State.Health.Status}}' 2>/dev/null)
    echo \"  Attempt \$i/30: \$STATUS\"
    [ \"\$STATUS\" = 'healthy' ] && echo 'MISP is healthy!' && break
    sleep 10
  done

  echo ''
  echo '=== MISP web check ==='
  curl -sk https://localhost:4430/users/login | grep -q 'MISP' && \
    echo 'MISP web: ACCESSIBLE' || echo 'MISP web: NOT ACCESSIBLE (check logs)'

  echo ''
  echo '=== MISP logs (last 20 lines) ==='
  sudo docker logs misp_core --tail 20 2>&1 | tail -20
"
```

---

## PHASE 2 — CONFIGURE MISP: API KEY AND FEEDS

### 2.1 Get MISP Admin API Key
```bash
source /opt/code/wazuh_ova/.env

echo '=== Getting MISP API Key ==='

# Method 1: From Docker container
MISP_KEY=$(ssh ${SSH_USER}@${SSH_HOST} "
  sudo docker exec misp_core \
    /var/www/MISP/app/Console/cake userInit 2>/dev/null | \
    grep -oP 'authkey.*\K[a-zA-Z0-9]{40}' | head -1
" 2>/dev/null)

# Method 2: Via API login
if [ -z "$MISP_KEY" ]; then
  MISP_KEY=$(curl -sk -X POST "https://10.251.151.15:4430/users/login" \
    -H "Content-Type: application/json" \
    -d "{\"User\":{\"email\":\"${MISP_ADMIN_EMAIL}\",\"password\":\"${MISP_ADMIN_PASS}\"}}" \
    -c /tmp/misp_cookies.txt \
    -b /tmp/misp_cookies.txt | \
    python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('User',{}).get('authkey',''))" 2>/dev/null)
fi

echo "API Key: ${MISP_KEY:0:8}****"

if [ -n "$MISP_KEY" ] && [ ${#MISP_KEY} -ge 40 ]; then
  # Save to .env
  if grep -q "MISP_API_KEY" /opt/code/wazuh_ova/.env; then
    sed -i "s|MISP_API_KEY=.*|MISP_API_KEY=${MISP_KEY}|" /opt/code/wazuh_ova/.env
  else
    echo "MISP_API_KEY=${MISP_KEY}" >> /opt/code/wazuh_ova/.env
  fi
  grep -q "MISP_URL" /opt/code/wazuh_ova/.env || \
    echo "MISP_URL=https://10.251.151.15:4430" >> /opt/code/wazuh_ova/.env
  echo "API key saved to .env"
  export MISP_API_KEY=$MISP_KEY
  export MISP_URL="https://10.251.151.15:4430"
else
  echo "WARNING: Could not retrieve API key automatically"
  echo "Manual step: Open https://10.251.151.15:4430"
  echo "  Login → My Profile → Auth key → Generate"
  echo "  Then add: MISP_API_KEY=<key> to /opt/code/wazuh_ova/.env"
fi
```

### 2.2 Test MISP API
```bash
source /opt/code/wazuh_ova/.env

echo "=== MISP API test ==="
curl -sk -H "Authorization: ${MISP_API_KEY}" \
  -H "Accept: application/json" \
  "https://10.251.151.15:4430/servers/getPyMISPVersion" | \
  python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print(f'MISP version: {d.get(\"version\",d)}')
except: print('API not ready yet')
"
```

### 2.3 Enable threat feeds (via API + UI guide)

Enable feeds programmatically via MISP API:
```bash
source /opt/code/wazuh_ova/.env
MISP_HOST="https://10.251.151.15:4430"

# Get list of available feeds
echo "=== Available feeds ==="
curl -sk -H "Authorization: ${MISP_API_KEY}" \
  -H "Accept: application/json" \
  "${MISP_HOST}/feeds/index" | \
  python3 -c "
import sys, json
d = json.load(sys.stdin)
feeds = d if isinstance(d, list) else d.get('response', [])
print(f'Total feeds: {len(feeds)}')
for f in feeds[:10]:
    feed = f.get('Feed', f)
    print(f'  ID={feed.get(\"id\",\"?\")} | {feed.get(\"name\",\"?\")} | enabled={feed.get(\"enabled\",False)}')
"

# Enable and cache recommended feeds (IDs may vary — get correct IDs first)
# CIRCL OSINT Feed, Abuse.ch URLhaus, Feodo Tracker, MalwareBazaar, BOTVRIJ.EU
echo ""
echo "=== Enable and cache top feeds ==="
for feed_name in "CIRCL OSINT Feed" "Abuse.ch URLhaus" "Feodo Tracker" "Malware Bazaar" "BOTVRIJ.EU"; do
  FEED_ID=$(curl -sk -H "Authorization: ${MISP_API_KEY}" \
    -H "Accept: application/json" \
    "${MISP_HOST}/feeds/index" | \
    python3 -c "
import sys, json
d = json.load(sys.stdin)
feeds = d if isinstance(d, list) else d.get('response', [])
for f in feeds:
    feed = f.get('Feed', f)
    if '${feed_name}'.lower() in feed.get('name','').lower():
        print(feed.get('id',''))
        break
")
  if [ -n "$FEED_ID" ]; then
    # Enable feed
    curl -sk -X POST \
      -H "Authorization: ${MISP_API_KEY}" \
      -H "Content-Type: application/json" \
      "${MISP_HOST}/feeds/enable/${FEED_ID}" > /dev/null
    
    # Enable caching
    curl -sk -X POST \
      -H "Authorization: ${MISP_API_KEY}" \
      -H "Content-Type: application/json" \
      "${MISP_HOST}/feeds/cacheFeeds/${FEED_ID}" > /dev/null
    
    echo "  ✅ ${feed_name} (ID: ${FEED_ID}) — enabled and caching"
  else
    echo "  ⚠️  ${feed_name} — not found (enable manually in MISP UI)"
  fi
done
```

**Manual fallback (if API doesn't work for feeds):**
```
1. Open: https://10.251.151.15:4430
2. Login: ${MISP_ADMIN_EMAIL} / ${MISP_ADMIN_PASS}
3. Go to: Sync Actions → List Feeds
4. Select ALL feeds → "Enable selected" → "Enable caching for selected"
5. Wait 5-10 minutes for initial cache download
```

### 2.4 Trigger initial feed cache
```bash
source /opt/code/wazuh_ova/.env

echo "=== Trigger feed cache download ==="
curl -sk -X POST \
  -H "Authorization: ${MISP_API_KEY}" \
  -H "Accept: application/json" \
  "${MISP_URL}/feeds/cacheFeeds/all" | \
  python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print(f'Cache status: {d}')
except: print('Cache triggered (check MISP UI for progress)')
"

echo "Waiting 30s for initial cache..."
sleep 30

echo "=== Check MISP stats ==="
curl -sk -H "Authorization: ${MISP_API_KEY}" \
  -H "Accept: application/json" \
  "${MISP_URL}/attributes/attributeStatistics" 2>/dev/null | \
  python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    total = sum(int(v) for v in d.values() if str(v).isdigit())
    print(f'Total IOC attributes: {total}')
    for k, v in sorted(d.items(), key=lambda x: -int(x[1]) if str(x[1]).isdigit() else 0)[:5]:
        print(f'  {k}: {v}')
except Exception as e:
    print(f'Stats not ready yet: {e}')
"
```

---

## PHASE 3 — WAZUH INTEGRATION: METHOD 1 (CDB LIST SYNC)

### 3.1 Create the IOC sync script
Create `/opt/code/wazuh_ova/integrations/misp/misp-to-cdb.py`:

```python
#!/usr/bin/env python3
"""
MISP to Wazuh CDB List Sync
Pulls IOCs from MISP API and writes to Wazuh CDB lists
Run via cron: every 1 hour

Usage: python3 misp-to-cdb.py
Environment: reads from /opt/code/wazuh_ova/.env
"""

import os
import sys
import json
import logging
import requests
import subprocess
from datetime import datetime
from pathlib import Path
from urllib3.exceptions import InsecureRequestWarning
requests.packages.urllib3.disable_warnings(InsecureRequestWarning)

# Load .env
def load_env(env_file="/opt/code/wazuh_ova/.env"):
    env = {}
    try:
        with open(env_file) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    k, v = line.split('=', 1)
                    env[k.strip()] = v.strip().strip('"').strip("'")
    except Exception as e:
        logging.error(f"Cannot read .env: {e}")
        sys.exit(1)
    return env

env = load_env()
MISP_URL = env.get('MISP_URL', 'https://10.251.151.15:4430')
MISP_KEY = env.get('MISP_API_KEY', '')
WAZUH_HOST = env.get('WAZUH_HOST', '10.251.151.11')
WAZUH_USER = env.get('WAZUH_API_USER', 'wazuh-wui')
WAZUH_PASS = env.get('WAZUH_API_PASS', '')

CDB_DIR = "/tmp/misp_cdb"
LOG_FILE = "/var/log/misp-cdb-sync.log"

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s %(levelname)s %(message)s',
    handlers=[
        logging.FileHandler(LOG_FILE),
        logging.StreamHandler()
    ]
)

def get_misp_iocs(ioc_type: str, limit: int = 5000) -> list:
    """Pull IOCs from MISP by attribute type"""
    headers = {
        "Authorization": MISP_KEY,
        "Accept": "application/json",
        "Content-Type": "application/json"
    }
    payload = {
        "returnFormat": "json",
        "type": ioc_type,
        "to_ids": 1,
        "limit": limit,
        "enforceWarninglist": 1
    }
    try:
        r = requests.post(
            f"{MISP_URL}/attributes/restSearch",
            headers=headers,
            json=payload,
            verify=False,
            timeout=60
        )
        data = r.json()
        attrs = data.get('response', {}).get('Attribute', [])
        return [a['value'] for a in attrs if a.get('value')]
    except Exception as e:
        logging.error(f"MISP query failed for {ioc_type}: {e}")
        return []

def write_cdb(name: str, values: list, dest: str) -> bool:
    """Write values to CDB format file"""
    try:
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        with open(dest, 'w') as f:
            for v in sorted(set(values)):
                f.write(f"{v}:\n")
        logging.info(f"CDB {name}: {len(values)} IOCs → {dest}")
        return True
    except Exception as e:
        logging.error(f"Write CDB {name} failed: {e}")
        return False

def deploy_to_wazuh(local_path: str, remote_name: str) -> bool:
    """Upload CDB file to Wazuh Master via API"""
    try:
        # Get JWT token
        r = requests.post(
            f"https://{WAZUH_HOST}:55000/security/user/authenticate",
            auth=(WAZUH_USER, WAZUH_PASS),
            verify=False,
            timeout=15
        )
        token = r.json()['data']['token']
        
        # Upload file
        with open(local_path, 'rb') as f:
            content = f.read()
        
        r = requests.put(
            f"https://{WAZUH_HOST}:55000/lists/files/{remote_name}",
            headers={"Authorization": f"Bearer {token}"},
            data=content,
            verify=False,
            timeout=30
        )
        if r.status_code in (200, 201):
            logging.info(f"Deployed {remote_name} to Wazuh")
            return True
        else:
            logging.error(f"Deploy {remote_name} failed: {r.status_code} {r.text[:200]}")
            return False
    except Exception as e:
        logging.error(f"Wazuh deploy failed: {e}")
        return False

def main():
    logging.info("=== MISP → Wazuh CDB Sync Started ===")
    os.makedirs(CDB_DIR, exist_ok=True)
    
    stats = {}
    
    # IOC types to sync: MISP type → CDB filename
    ioc_map = {
        "ip-dst": "misp-ip-dst",
        "ip-src": "misp-ip-src",
        "domain": "misp-domains",
        "hostname": "misp-hostnames",
        "md5": "misp-md5",
        "sha256": "misp-sha256",
        "url": "misp-urls",
    }
    
    for misp_type, cdb_name in ioc_map.items():
        iocs = get_misp_iocs(misp_type)
        if not iocs:
            logging.warning(f"No IOCs returned for type: {misp_type}")
            continue
        
        local_path = f"{CDB_DIR}/{cdb_name}"
        if write_cdb(cdb_name, iocs, local_path):
            deploy_to_wazuh(local_path, cdb_name)
            stats[cdb_name] = len(iocs)
    
    # Restart Wazuh analysisd to reload CDB (soft reload)
    try:
        r = requests.get(
            f"https://{WAZUH_HOST}:55000/security/user/authenticate",
        )
        # Note: just trigger a config validation, not full restart
        logging.info("CDB sync complete — Wazuh will reload on next alert processing")
    except Exception as e:
        logging.warning(f"Could not ping Wazuh after sync: {e}")
    
    logging.info(f"=== Sync complete: {stats} ===")
    return stats

if __name__ == "__main__":
    main()
```

### 3.2 Deploy sync script
```bash
mkdir -p /opt/code/wazuh_ova/integrations/misp/

# Copy script to project
cp /tmp/misp-to-cdb.py /opt/code/wazuh_ova/integrations/misp/
chmod +x /opt/code/wazuh_ova/integrations/misp/misp-to-cdb.py

# Also copy to Master for local execution
scp /opt/code/wazuh_ova/integrations/misp/misp-to-cdb.py \
    wazuh-user@10.251.151.11:/tmp/misp-to-cdb.py

ssh wazuh-user@10.251.151.11 "
  sudo cp /tmp/misp-to-cdb.py /opt/misp-to-cdb.py
  sudo chown root:wazuh /opt/misp-to-cdb.py
  sudo chmod 750 /opt/misp-to-cdb.py
  pip3 install requests --quiet 2>/dev/null || true
  echo 'Script deployed to Master'
"
```

### 3.3 Run initial sync
```bash
ssh wazuh-user@10.251.151.11 "
  echo '=== Running initial MISP CDB sync ==='
  sudo python3 /opt/misp-to-cdb.py
  
  echo ''
  echo '=== CDB files created ==='
  ls -lh /tmp/misp_cdb/ 2>/dev/null || echo 'CDB dir not found'
  
  echo ''
  echo '=== Wazuh lists dir ==='
  sudo ls -lh /var/ossec/etc/lists/ | grep misp | head -10
"
```

### 3.4 Set up hourly cron
```bash
ssh wazuh-user@10.251.151.11 "
  # Add to root crontab (needs access to wazuh API)
  CRON_LINE='0 * * * * /usr/bin/python3 /opt/misp-to-cdb.py >> /var/log/misp-cdb-sync.log 2>&1'
  (sudo crontab -l 2>/dev/null | grep -v misp-to-cdb; echo \"\$CRON_LINE\") | sudo crontab -
  sudo crontab -l | grep misp
  echo 'Cron job set: MISP sync every hour'
"
```

---

## PHASE 4 — WAZUH INTEGRATION: METHOD 2 (REAL-TIME QUERY)

### 4.1 Deploy custom-misp.py on Master
```bash
# Create real-time integration script
cat > /opt/code/wazuh_ova/integrations/misp/custom-misp.py << 'PYTHONSCRIPT'
#!/usr/bin/env python3
"""
Wazuh custom integration: real-time MISP query
Called by Wazuh integratord for each matching alert
Reads config from /opt/code/wazuh_ova/.env
"""
import sys
import json
import logging
import requests
from urllib3.exceptions import InsecureRequestWarning
requests.packages.urllib3.disable_warnings(InsecureRequestWarning)

LOG_FILE = "/var/ossec/logs/integrations.log"
logging.basicConfig(filename=LOG_FILE, level=logging.INFO,
                    format='%(asctime)s misp-custom %(message)s')

def load_env():
    env = {}
    for path in ["/opt/code/wazuh_ova/.env", "/etc/misp-integration.env"]:
        try:
            with open(path) as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#') and '=' in line:
                        k, v = line.split('=', 1)
                        env[k.strip()] = v.strip().strip('"').strip("'")
            break
        except:
            continue
    return env

def query_misp(misp_url, misp_key, value, search_type=None):
    """Query MISP for an IOC value"""
    headers = {
        "Authorization": misp_key,
        "Accept": "application/json",
        "Content-Type": "application/json"
    }
    payload = {"returnFormat": "json", "value": value, "enforceWarninglist": 1}
    if search_type:
        payload["type"] = search_type
    
    try:
        r = requests.post(
            f"{misp_url}/attributes/restSearch",
            headers=headers,
            json=payload,
            verify=False,
            timeout=10
        )
        data = r.json()
        attrs = data.get('response', {}).get('Attribute', [])
        return attrs
    except Exception as e:
        logging.error(f"MISP query error: {e}")
        return []

def send_alert(output_path, alert_data):
    """Write enriched alert back to Wazuh"""
    try:
        with open(output_path, 'w') as f:
            json.dump(alert_data, f)
    except Exception as e:
        logging.error(f"Cannot write output: {e}")

def main():
    # Args: alert_file api_key hook_url
    if len(sys.argv) < 2:
        sys.exit(0)
    
    alert_file = sys.argv[1]
    hook_url = sys.argv[3] if len(sys.argv) > 3 else ""
    
    env = load_env()
    misp_url = env.get('MISP_URL', hook_url or 'https://10.251.151.15:4430')
    misp_key = env.get('MISP_API_KEY', sys.argv[2] if len(sys.argv) > 2 else "")
    
    if not misp_key:
        logging.error("No MISP API key")
        sys.exit(0)
    
    try:
        with open(alert_file) as f:
            alert = json.load(f)
    except Exception as e:
        logging.error(f"Cannot read alert: {e}")
        sys.exit(0)
    
    data = alert.get("data", {})
    results = []
    
    # Check srcip
    srcip = data.get("srcip") or data.get("src_ip")
    if srcip and not _is_private(srcip):
        attrs = query_misp(misp_url, misp_key, srcip, "ip-dst")
        if not attrs:
            attrs = query_misp(misp_url, misp_key, srcip, "ip-src")
        results.extend(attrs)
    
    # Check DNS domain
    domain = data.get("dns_domain") or data.get("hostname")
    if domain:
        attrs = query_misp(misp_url, misp_key, domain, "domain")
        results.extend(attrs)
    
    # Check file hash from FIM
    for hash_field in ["sha256_after", "md5_after", "sha256", "md5"]:
        h = alert.get("syscheck", {}).get(hash_field)
        if h and len(h) in (32, 64):
            attrs = query_misp(misp_url, misp_key, h)
            results.extend(attrs)
            break
    
    if results:
        # Build enriched response
        first = results[0]
        output = {
            "integration": "misp",
            "misp": {
                "value": first.get("value"),
                "type": first.get("type"),
                "category": first.get("category"),
                "comment": first.get("comment", ""),
                "event_id": first.get("event_id"),
                "to_ids": first.get("to_ids"),
                "timestamp": first.get("timestamp"),
                "total_matches": len(results)
            }
        }
        logging.info(f"MISP IOC found: {first.get('value')} [{first.get('category')}]")
        print(json.dumps(output))
    else:
        logging.debug(f"No MISP match for alert {alert.get('id','?')}")

def _is_private(ip):
    import ipaddress
    try:
        return ipaddress.ip_address(ip).is_private
    except:
        return False

if __name__ == "__main__":
    main()
PYTHONSCRIPT

chmod +x /opt/code/wazuh_ova/integrations/misp/custom-misp.py

# Deploy to Master
scp /opt/code/wazuh_ova/integrations/misp/custom-misp.py \
    wazuh-user@10.251.151.11:/tmp/

ssh wazuh-user@10.251.151.11 "
  sudo cp /tmp/custom-misp.py /var/ossec/integrations/custom-misp.py
  sudo chown root:wazuh /var/ossec/integrations/custom-misp.py
  sudo chmod 750 /var/ossec/integrations/custom-misp.py
  echo 'custom-misp.py deployed'
"
```

### 4.2 Add Wazuh integration block for MISP real-time query
```bash
source /opt/code/wazuh_ova/.env

ssh wazuh-user@10.251.151.11 "sudo bash -s" << REMOTE
FILE='/var/ossec/etc/ossec.conf'
sudo sed -i 's|</ossec_config>||g' "\$FILE"

sudo tee -a "\$FILE" > /dev/null << 'MISP_BLOCK'

  <!-- ============================================================
       MISP REAL-TIME INTEGRATION — Added $(date +%Y-%m-%d)
       Queries MISP for IOC match on every alert with srcip
       Credentials: read from /opt/code/wazuh_ova/.env at runtime
  ============================================================ -->
  <integration>
    <name>custom-misp</name>
    <hook_url>${MISP_URL:-https://10.251.151.15:4430}</hook_url>
    <api_key>${MISP_API_KEY}</api_key>
    <group>syscheck,ids,fortigate,firewall_drop,authentication_failed,brute_force,infoblox_dns,</group>
    <alert_format>json</alert_format>
  </integration>

</ossec_config>
MISP_BLOCK
echo "MISP integration block added"
REMOTE
```

### 4.3 Add MISP Wazuh rules
```bash
cat > /opt/code/wazuh_ova/rules/1009-misp-rules.xml << 'RULES_XML'
<!-- MISP Integration Rules — Added to 1009-misp-rules.xml -->
<group name="misp,threat_intel,">

  <!-- Base MISP event -->
  <rule id="100620" level="10">
    <field name="integration">misp</field>
    <match>misp</match>
    <description>MISP: Threat Intelligence event</description>
    <options>no_full_log</options>
    <group>misp_alert,</group>
    <pci_dss>11.4</pci_dss>
    <nist_800_53>SI.4</nist_800_53>
  </rule>

  <!-- MISP API error -->
  <rule id="100621" level="3">
    <field name="misp.error">\.+</field>
    <description>MISP: Error connecting to MISP API</description>
    <options>no_full_log</options>
    <group>misp_error,</group>
  </rule>

  <!-- IOC found — critical alert -->
  <rule id="100622" level="12">
    <field name="misp.category">\.+</field>
    <description>MISP IOC Match: $(misp.category) — $(misp.value) [Event: $(misp.event_id)]</description>
    <options>no_full_log</options>
    <group>misp_match,threat_intel,</group>
    <pci_dss>11.4</pci_dss>
    <nist_800_53>SI.4</nist_800_53>
    <gdpr>IV_32</gdpr>
    <mitre>
      <id>T1071</id>
    </mitre>
  </rule>

  <!-- IOC match — malware category -->
  <rule id="100623" level="14">
    <if_sid>100622</if_sid>
    <field name="misp.category" type="pcre2">Malware|malware|C&C|c2|Payload|payload</field>
    <description>MISP: MALWARE IOC detected — $(misp.value) [$(misp.type)]</description>
    <group>misp_malware,malware,threat_intel,</group>
    <pci_dss>10.6</pci_dss>
    <nist_800_53>SI.3</nist_800_53>
  </rule>

  <!-- IOC match — multiple matches (high confidence) -->
  <rule id="100624" level="13">
    <if_sid>100622</if_sid>
    <field name="misp.total_matches" type="pcre2">^([5-9]|[1-9][0-9]+)$</field>
    <description>MISP: HIGH CONFIDENCE IOC — $(misp.value) found in $(misp.total_matches) MISP events</description>
    <group>misp_high_confidence,threat_intel,</group>
  </rule>

</group>
RULES_XML

# Deploy rules to Master
scp /opt/code/wazuh_ova/rules/1009-misp-rules.xml \
    wazuh-user@10.251.151.11:/tmp/

ssh wazuh-user@10.251.151.11 "
  sudo cp /tmp/1009-misp-rules.xml /var/ossec/etc/rules/
  sudo chown root:wazuh /var/ossec/etc/rules/1009-misp-rules.xml
  sudo chmod 660 /var/ossec/etc/rules/1009-misp-rules.xml
  echo '=== Validate XML ==='
  sudo xmllint --noout /var/ossec/etc/ossec.conf && echo 'ossec.conf: OK'
  sudo xmllint --noout /var/ossec/etc/rules/1009-misp-rules.xml && echo 'rules: OK'
"
```

### 4.4 Restart Wazuh Master
```bash
ssh wazuh-user@10.251.151.11 "
  sudo /var/ossec/bin/wazuh-control restart
  sleep 30
  sudo /var/ossec/bin/wazuh-control status | grep -E 'analysisd|integratord'
  echo ''
  echo '=== Integration log ==='
  sudo tail -10 /var/ossec/logs/integrations.log 2>/dev/null | \
    grep -E 'misp|error|ERROR' | head -10 || echo 'No integration log yet'
"
```

---

## PHASE 5 — ADD MISP TO SHUFFLE SOAR WORKFLOW

Add MISP as additional enrichment node in Workflow 1 (Triage):

### 5.1 Update Shuffle Triage workflow to include MISP check
```bash
source /opt/code/wazuh_ova/.env

TRIAGE_ID="${SHUFFLE_WORKFLOW_TRIAGE}"
if [ -z "$TRIAGE_ID" ]; then
  echo "WARNING: SHUFFLE_WORKFLOW_TRIAGE not in .env — find workflow ID manually in Shuffle UI"
  TRIAGE_ID=$(curl -s "${SHUFFLE_URL}/api/v1/workflows" \
    -H "Authorization: Bearer ${SHUFFLE_TOKEN}" | \
    python3 -c "
import sys, json
ws = json.load(sys.stdin)
for w in (ws if isinstance(ws,list) else ws.get('workflows',[])):
    if 'triage' in w.get('name','').lower() or 'wazuh' in w.get('name','').lower():
        print(w.get('id',''))
        break
" 2>/dev/null)
fi

echo "Triage Workflow ID: $TRIAGE_ID"
echo ""
echo "=== Add MISP node to Shuffle Triage Workflow ==="
echo "Manual step required — open Shuffle UI:"
echo "  URL: ${SHUFFLE_URL}"
echo ""
echo "In Workflow '${TRIAGE_ID}':"
echo "  1. Add new HTTP node after AbuseIPDB node"
echo "  2. Name: misp_check"
echo "  3. Method: POST"
echo "  4. URL: ${MISP_URL}/attributes/restSearch"
echo "  5. Headers:"
echo "     Authorization: ${MISP_API_KEY}"
echo "     Accept: application/json"
echo "     Content-Type: application/json"
echo "  6. Body:"
echo '     {"returnFormat":"json","value":"\$exec.data.srcip","to_ids":1,"enforceWarninglist":1}'
echo "  7. Connect output to IRIS case creation node"
echo "  8. Add misp_result to IRIS case description"
```

---

## PHASE 6 — END-TO-END TEST

### 6.1 Test CDB list query (known bad IP)
```bash
source /opt/code/wazuh_ova/.env

echo "=== Test 1: CDB list contains IOCs ==="
ssh wazuh-user@10.251.151.11 "
  echo 'CDB files:'
  sudo ls -lh /var/ossec/etc/lists/ | grep misp | head -10
  
  # Check a file exists and has content
  FIRST_CDB=\$(sudo ls /var/ossec/etc/lists/misp-* 2>/dev/null | head -1)
  if [ -n \"\$FIRST_CDB\" ]; then
    COUNT=\$(sudo wc -l < \"\$FIRST_CDB\" 2>/dev/null)
    echo \"First CDB: \$FIRST_CDB | Lines: \$COUNT\"
    sudo head -5 \"\$FIRST_CDB\"
  else
    echo 'No MISP CDB files yet (run sync script manually)'
  fi
"
```

### 6.2 Test real-time MISP query
```bash
source /opt/code/wazuh_ova/.env

echo "=== Test 2: MISP API query for known bad IP ==="
# Using a known C2 IP from Feodo Tracker feed
TEST_IP="194.165.16.72"  # known bad — adjust if needed

curl -sk -H "Authorization: ${MISP_API_KEY}" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -X POST "${MISP_URL}/attributes/restSearch" \
  -d "{\"returnFormat\":\"json\",\"value\":\"${TEST_IP}\",\"enforceWarninglist\":1}" | \
  python3 -c "
import sys, json
d = json.load(sys.stdin)
attrs = d.get('response', {}).get('Attribute', [])
print(f'MISP query result for ${TEST_IP}:')
if attrs:
    for a in attrs[:3]:
        print(f'  MATCH: type={a.get(\"type\")} | category={a.get(\"category\")} | event={a.get(\"event_id\")}')
    print(f'RESULT: ✅ MISP query working ({len(attrs)} matches)')
else:
    print('No match (IP not in current feeds — try another known bad IP)')
"
```

### 6.3 Test Wazuh → MISP integration end-to-end
```bash
echo "=== Test 3: Inject alert with srcip that will hit MISP ==="
ssh wazuh-user@10.251.151.12 "
  # Send FortiGate-style log with known bad IP
  logger -p local7.warning 'date=2026-05-25 time=10:01:00 devname=\"FGT-PROD\" \
    logid=\"0000000013\" type=\"traffic\" subtype=\"forward\" level=\"notice\" \
    action=\"deny\" srcip=194.165.16.72 dstip=10.251.151.11 dstport=22 \
    service=\"SSH\" policyname=\"implicit-deny\" msg=\"Traffic denied\"'
  echo 'Test alert sent'
"

echo "Waiting 30s for Wazuh to process..."
sleep 30

echo "=== Check OpenSearch for MISP alert ==="
curl -sk -u "${OPENSEARCH_USER:-admin}:${OPENSEARCH_PASS:-admin}" \
  "https://10.251.151.13:9200/wazuh-alerts-4.x-*/_search" \
  -H "Content-Type: application/json" \
  -d '{
    "size": 3,
    "sort": [{"@timestamp": {"order": "desc"}}],
    "query": {"match": {"rule.groups": "misp_match"}},
    "_source": ["@timestamp", "rule.id", "rule.level", "rule.description",
                "data.srcip", "misp.category", "misp.value", "misp.event_id"]
  }' | python3 -c "
import sys, json
d = json.load(sys.stdin)
hits = d.get('hits',{}).get('hits',[])
total = d.get('hits',{}).get('total',{}).get('value',0)
print(f'MISP match alerts in OpenSearch: {total}')
for h in hits:
    s = h['_source']
    r = s.get('rule',{})
    m = s.get('misp',{})
    print(f'  [{r.get(\"level\",\"?\")}] {r.get(\"description\",\"?\")[:60]}')
    print(f'    srcip={s.get(\"data\",{}).get(\"srcip\",\"?\")} | MISP: {m.get(\"category\",\"?\")} - {m.get(\"value\",\"?\")}')
"
```

### 6.4 Check Telegram notification
If TELEGRAM_BOT_TOKEN is set, verify Telegram received alert:
```bash
source /opt/code/wazuh_ova/.env
if [ -n "$TELEGRAM_BOT_TOKEN" ] && [ -n "$TELEGRAM_CHAT_ID" ]; then
  echo "=== Last Telegram messages ==="
  curl -s "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates?limit=3" | \
    python3 -c "
import sys, json
d = json.load(sys.stdin)
msgs = d.get('result', [])
for m in msgs[-3:]:
    text = m.get('message',{}).get('text','')[:100]
    print(f'  {text}')
"
fi
```

---

## PHASE 7 — DOCUMENTATION

Create `/opt/code/wazuh_ova/docs/current/MISP_INTEGRATION.md`:

```markdown
# MISP Integration — Wazuh SIEM
**วันที่:** [DATE]
**สถานะ:** ✅ Active
**MISP Version:** 2.4.x

## Infrastructure

| Component | Location | Port |
|-----------|----------|------|
| MISP Web | 10.251.151.15 | :4430 (HTTPS) |
| MISP DB (MariaDB) | Docker: misp_db | internal |
| MISP Redis | Docker: misp_redis | internal |
| MISP Modules | Docker: misp_modules | internal |

## Integration Methods

### Method 1: CDB List Sync (Batch)
- **Script:** /opt/misp-to-cdb.py (บน Master)
- **Cron:** ทุก 1 ชั่วโมง
- **CDB files:** /var/ossec/etc/lists/misp-*
- **IOC types:** ip-dst, ip-src, domain, hostname, md5, sha256, url

### Method 2: Real-time Query
- **Script:** /var/ossec/integrations/custom-misp.py
- **ossec.conf group:** syscheck, ids, fortigate, firewall_drop
- **Rules:** 1009-misp-rules.xml (IDs 100620-100624)
- **Alert level:** L10 (match), L12 (IOC found), L14 (malware)

## Threat Feeds Active
- CIRCL OSINT Feed
- Abuse.ch URLhaus
- Feodo Tracker (C2 IPs)
- MalwareBazaar
- BOTVRIJ.EU

## Maintenance

### Force manual CDB sync
```bash
ssh wazuh-user@10.251.151.11
sudo python3 /opt/misp-to-cdb.py
```

### Check MISP status
```bash
ssh ubuntu@10.251.151.15
docker ps --filter "name=misp_"
docker logs misp_core --tail 20
```

### Update feeds manually
```bash
source /opt/code/wazuh_ova/.env
curl -sk -X POST -H "Authorization: ${MISP_API_KEY}" \
  -H "Accept: application/json" "${MISP_URL}/feeds/cacheFeeds/all"
```

### Check IOC count
```bash
source /opt/code/wazuh_ova/.env
curl -sk -H "Authorization: ${MISP_API_KEY}" \
  -H "Accept: application/json" \
  "${MISP_URL}/attributes/attributeStatistics" | python3 -m json.tool
```
```

---

## PHASE 8 — FINAL STATUS REPORT

```
════════════════════════════════════════════════════════════════
  MISP Installation + Wazuh Integration — Final Status
  VM: 10.251.151.15 (shared with Shuffle + IRIS)
  Date: [DATE]
════════════════════════════════════════════════════════════════

MISP INSTALLATION
  misp_core container     : [running/error]
  misp_db container       : [running/error]
  misp_redis container    : [running/error]
  misp_modules container  : [running/error]
  Web accessible          : https://10.251.151.15:4430 [OK/FAIL]
  API key generated       : [YES/NO]
  Feeds enabled+cached    : [N feeds]
  Total IOCs              : [N attributes]

VM RESOURCES (after MISP)
  RAM used/total          : [X]GB / [Y]GB
  Disk used               : [X]GB
  Services coexisting     : Shuffle + DFIR-IRIS + MISP ✅

WAZUH INTEGRATION
  CDB sync script         : /opt/misp-to-cdb.py [OK/FAIL]
  CDB files in Wazuh      : [N files] [OK/FAIL]
  custom-misp.py deployed : /var/ossec/integrations/ [OK/FAIL]
  ossec.conf block        : added [OK/FAIL]
  Rules 1009-misp-rules   : deployed [OK/FAIL]
  Wazuh restart           : OK [OK/FAIL]
  Cron hourly sync        : set [OK/FAIL]

END-TO-END TEST
  MISP API query          : [OK/FAIL]
  CDB IOC lookup          : [OK/FAIL]
  Real-time alert match   : [OK/FAIL]
  OpenSearch MISP alert   : [OK/FAIL]
  Telegram notification   : [OK/FAIL]

DOCUMENTATION
  MISP_INTEGRATION.md     : docs/current/ [OK/FAIL]

LOGIN:
  MISP URL   : https://10.251.151.15:4430
  Email      : [MISP_ADMIN_EMAIL from .env]
  Password   : [MISP_ADMIN_PASS from .env]
  API Key    : saved to /opt/code/wazuh_ova/.env

NEXT ACTION:
  1. Login to MISP and verify feeds are caching
  2. Add MISP node to Shuffle Triage workflow manually
  3. Monitor /var/log/misp-cdb-sync.log for errors
════════════════════════════════════════════════════════════════
```
