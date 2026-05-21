#!/usr/bin/env bash
# SOC Center — Full Deploy Script
# โรงพยาบาลมหาวิทยาลัยวลัยลักษณ์ | Walailak University Hospital
# Usage: bash deploy.sh {build|start|stop|restart|logs|status|ps}
set -euo pipefail

APP_DIR="/opt/code/wazuh_ova/web_app"
COMPOSE="docker compose -f ${APP_DIR}/docker/docker-compose.yml"
APP_URL="https://10.251.150.222:3348/wazuh"

# ─── สี ───────────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
log()  { echo -e "${GREEN}[SOC]${NC} $1"; }
warn() { echo -e "${YELLOW}[SOC]${NC} $1"; }
err()  { echo -e "${RED}[SOC]${NC} $1" >&2; }

usage() {
  echo "Usage: $0 {build|start|stop|restart|logs [service]|status|ps}"
  echo ""
  echo "  build    — build Docker images (--no-cache)"
  echo "  start    — start containers"
  echo "  stop     — stop and remove containers"
  echo "  restart  — stop then start"
  echo "  logs     — follow logs (optional: service name)"
  echo "  status   — show container status + API health"
  echo "  ps       — docker compose ps"
  exit 1
}

# ─── ตรวจสอบ SSL cert ─────────────────────────────────────────────────────────
check_ssl() {
  if [[ ! -f "${APP_DIR}/nginx/ssl/cert.pem" || ! -f "${APP_DIR}/nginx/ssl/key.pem" ]]; then
    warn "SSL certificate not found — generating self-signed cert..."
    mkdir -p "${APP_DIR}/nginx/ssl"
    openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
      -keyout "${APP_DIR}/nginx/ssl/key.pem" \
      -out    "${APP_DIR}/nginx/ssl/cert.pem" \
      -subj "/C=TH/ST=Nakhon Si Thammarat/L=Tha Sala/O=Walailak University Hospital/OU=SOC/CN=10.251.150.222" \
      -addext "subjectAltName=IP:10.251.150.222" 2>/dev/null
    chmod 600 "${APP_DIR}/nginx/ssl/key.pem"
    log "SSL certificate generated"
  fi
}

# ─── ตรวจสอบ Docker network ───────────────────────────────────────────────────
check_network() {
  docker network inspect wazuhweb_net &>/dev/null || {
    log "Creating Docker network wazuhweb_net..."
    docker network create wazuhweb_net
  }
}

# ─── Build ────────────────────────────────────────────────────────────────────
cmd_build() {
  log "=== SOC Center — Build Started ==="
  check_ssl
  check_network
  log "Building Docker images (--no-cache)..."
  ${COMPOSE} build --no-cache
  log "=== Build Complete ==="
}

# ─── Start ────────────────────────────────────────────────────────────────────
cmd_start() {
  log "Starting SOC Center containers..."
  check_ssl
  check_network
  ${COMPOSE} up -d
  log "Waiting for backend to become healthy (up to 60s)..."
  local i=0
  while [[ $i -lt 12 ]]; do
    local health
    health=$(docker inspect --format='{{.State.Health.Status}}' wazuhweb_backend 2>/dev/null || echo "waiting")
    if [[ "$health" == "healthy" ]]; then
      log "Backend is healthy ✓"
      break
    fi
    sleep 5
    i=$((i + 1))
  done
  echo ""
  log "=== SOC Center is running ==="
  log "URL: ${APP_URL}"
  log "Login: admin / Wazuh@S0C2026!"
  warn "⚠  กรุณาเปลี่ยนรหัสผ่านหลังเข้าใช้งานครั้งแรก"
}

# ─── Stop ─────────────────────────────────────────────────────────────────────
cmd_stop() {
  log "Stopping SOC Center..."
  ${COMPOSE} down
  log "Stopped"
}

# ─── Restart ──────────────────────────────────────────────────────────────────
cmd_restart() {
  cmd_stop
  cmd_start
}

# ─── Logs ─────────────────────────────────────────────────────────────────────
cmd_logs() {
  local svc="${2:-}"
  if [[ -n "$svc" ]]; then
    ${COMPOSE} logs -f --tail=100 "$svc"
  else
    ${COMPOSE} logs -f --tail=100
  fi
}

# ─── Status ───────────────────────────────────────────────────────────────────
cmd_status() {
  echo ""
  echo "════════════════════════════════════════════════════"
  echo "  SOC Center — Status"
  echo "  URL: ${APP_URL}"
  echo "════════════════════════════════════════════════════"
  echo ""
  echo "--- Containers ---"
  docker ps --filter "name=wazuhweb_" \
    --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || echo "No containers found"
  echo ""
  echo "--- API Health ---"
  local result
  result=$(curl -sk --max-time 5 "${APP_URL}/api/health" 2>/dev/null) || true
  if [[ -n "$result" ]]; then
    echo "$result" | python3 -m json.tool 2>/dev/null || echo "$result"
  else
    err "API not reachable at ${APP_URL}/api/health"
  fi
  echo ""
  echo "--- Docker Network ---"
  docker network inspect wazuhweb_net --format \
    '{{range $k, $v := .Containers}}  {{$v.Name}}: {{$v.IPv4Address}}{{"\n"}}{{end}}' 2>/dev/null || echo "Network not found"
  echo "════════════════════════════════════════════════════"
}

# ─── PS ───────────────────────────────────────────────────────────────────────
cmd_ps() {
  ${COMPOSE} ps
}

# ─── Main ─────────────────────────────────────────────────────────────────────
ACTION="${1:-help}"
case "$ACTION" in
  build)         cmd_build ;;
  start)         cmd_start ;;
  stop)          cmd_stop ;;
  restart)       cmd_restart ;;
  logs)          cmd_logs "$@" ;;
  status)        cmd_status ;;
  ps)            cmd_ps ;;
  build+start)   cmd_build && cmd_start ;;
  *)             usage ;;
esac
