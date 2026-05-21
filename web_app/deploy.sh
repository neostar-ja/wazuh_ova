#!/usr/bin/env bash
# ═════════════════════════════════════════════════════════════════════════════
#  SOC Center — Professional Full Build & Deploy Script
#  โรงพยาบาลมหาวิทยาลัยวลัยลักษณ์ | Walailak University Hospital
#  Comprehensive deployment management for production environment
# ═════════════════════════════════════════════════════════════════════════════

set -euo pipefail

# ─── Configuration ────────────────────────────────────────────────────────────
APP_DIR="/opt/code/wazuh_ova/web_app"
COMPOSE="docker compose -f ${APP_DIR}/docker/docker-compose.yml"
APP_URL="https://10.251.150.222:3348/wazuh"
BACKUP_DIR="/opt/code/wazuh_ova/backups"
LOG_FILE="${APP_DIR}/logs/deploy.log"
MAX_RETRIES=12
HEALTH_CHECK_TIMEOUT=60

# ─── Colors ───────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# ─── Logging Functions ────────────────────────────────────────────────────────
log()   { echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"; }
info()  { echo -e "${BLUE}[ℹ]${NC} $1"; }
warn()  { echo -e "${YELLOW}[⚠]${NC} $1" >&2; }
err()   { echo -e "${RED}[✗]${NC} $1" >&2; }
success() { echo -e "${GREEN}[✓]${NC} $1"; }

# ─── Helper Functions ─────────────────────────────────────────────────────────
separator() { echo -e "\n${CYAN}═══════════════════════════════════════════════════════════════════════════════${NC}\n"; }

usage() {
  cat <<EOF
╔════════════════════════════════════════════════════════════════════════════╗
║         SOC Center — Full Build & Deploy Management                        ║
╚════════════════════════════════════════════════════════════════════════════╝

Usage: $0 <command> [options]

🚀 DEPLOYMENT COMMANDS:
  fullbuild      — Full clean build + deploy (complete rebuild from scratch)
  build          — Build Docker images (with cache)
  rebuild        — Build Docker images (--no-cache, clean rebuild)
  start          — Start all containers
  stop           — Stop and remove all containers
  restart        — Stop then start containers
  redeploy       — Quick rebuild + restart (recommended for updates)

📊 MONITORING COMMANDS:
  logs [service] — Follow logs (backend|frontend|nginx|all)
  status         — Show detailed system status
  ps             — Docker compose ps output
  health         — Comprehensive health check
  verify         — Verify deployment completeness

🔧 MAINTENANCE COMMANDS:
  clean          — Stop and remove all containers + volumes
  prune          — Remove unused Docker images/networks/volumes
  backup         — Backup database and configurations
  restore        — Restore from backup
  rollback       — Rollback to previous image versions

ℹ️  INFORMATION COMMANDS:
  version        — Show version information
  check          — Pre-flight dependency check
  env            — Validate environment variables

EXAMPLES:
  $0 fullbuild              # Complete fresh deployment
  $0 redeploy               # Quick update and restart
  $0 logs backend           # Show backend logs
  $0 status                 # Show system status
  $0 health                 # Comprehensive health check

EOF
  exit "${1:-1}"
}

# ─── Pre-flight Checks ───────────────────────────────────────────────────────
check_dependencies() {
  log "Checking system dependencies..."
  local missing=()
  
  # Check Docker
  if ! command -v docker &> /dev/null; then
    missing+=("docker")
  else
    info "✓ Docker $(docker --version | awk '{print $3}' | sed 's/,//')"
  fi
  
  # Check Docker Compose
  if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    missing+=("docker-compose")
  else
    info "✓ Docker Compose available"
  fi
  
  # Check curl
  if ! command -v curl &> /dev/null; then
    missing+=("curl")
  else
    info "✓ curl available"
  fi
  
  # Check Python3
  if ! command -v python3 &> /dev/null; then
    missing+=("python3")
  else
    info "✓ Python3 available"
  fi
  
  if [[ ${#missing[@]} -gt 0 ]]; then
    err "Missing dependencies: ${missing[*]}"
    err "Please install the missing tools and try again"
    return 1
  fi
  
  success "All dependencies are available"
  return 0
}

# ─── Environment Validation ───────────────────────────────────────────────────
check_environment() {
  log "Validating environment variables..."
  
  if [[ ! -f "${APP_DIR}/.env" ]]; then
    err ".env file not found at ${APP_DIR}/.env"
    return 1
  fi
  
  local required_vars=(
    "APP_NAME"
    "APP_ENV"
    "APP_URL"
    "BACKEND_HOST"
    "BACKEND_PORT"
    "SECRET_KEY"
    "DATABASE_URL"
    "WAZUH_API_HOST"
    "WAZUH_API_PORT"
  )
  
  local missing_vars=()
  for var in "${required_vars[@]}"; do
    if ! grep -q "^${var}=" "${APP_DIR}/.env"; then
      missing_vars+=("$var")
    fi
  done
  
  if [[ ${#missing_vars[@]} -gt 0 ]]; then
    err "Missing environment variables: ${missing_vars[*]}"
    warn "Please configure .env file properly"
    return 1
  fi
  
  success "Environment variables validated"
  return 0
}

# ─── SSL Certificate Check ───────────────────────────────────────────────────
check_ssl() {
  log "Checking SSL certificates..."
  
  if [[ ! -f "${APP_DIR}/nginx/ssl/cert.pem" || ! -f "${APP_DIR}/nginx/ssl/key.pem" ]]; then
    warn "SSL certificate not found — generating self-signed certificate..."
    mkdir -p "${APP_DIR}/nginx/ssl"
    
    openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
      -keyout "${APP_DIR}/nginx/ssl/key.pem" \
      -out    "${APP_DIR}/nginx/ssl/cert.pem" \
      -subj "/C=TH/ST=Nakhon Si Thammarat/L=Tha Sala/O=Walailak University Hospital/OU=SOC/CN=10.251.150.222" \
      -addext "subjectAltName=IP:10.251.150.222" 2>/dev/null
    
    chmod 600 "${APP_DIR}/nginx/ssl/key.pem"
    success "SSL certificate generated"
  else
    success "SSL certificates found"
  fi
}

# ─── Docker Network Setup ────────────────────────────────────────────────────
check_network() {
  log "Checking Docker network..."
  
  if ! docker network inspect wazuhweb_net &>/dev/null; then
    log "Creating Docker network wazuhweb_net..."
    docker network create wazuhweb_net
  fi
  
  success "Docker network ready"
}

# ─── Create Backup ───────────────────────────────────────────────────────────
create_backup() {
  log "Creating backup..."
  
  mkdir -p "$BACKUP_DIR"
  local timestamp=$(date +%Y%m%d_%H%M%S)
  local backup_file="${BACKUP_DIR}/backup_${timestamp}.tar.gz"
  
  # Backup database volume
  if docker volume ls | grep -q wazuhweb_db_data; then
    tar --exclude='lost+found' -czf "$backup_file" \
      -C /var/lib/docker/volumes/wazuhweb_db_data/_data . 2>/dev/null || true
    
    if [[ -f "$backup_file" ]]; then
      success "Backup created: $backup_file"
      
      # Keep only last 5 backups
      ls -t "$BACKUP_DIR"/backup_*.tar.gz 2>/dev/null | tail -n +6 | xargs rm -f 2>/dev/null || true
      
      return 0
    fi
  fi
  
  warn "Database volume not found, skipping backup"
  return 0
}

# ─── Health Check ───────────────────────────────────────────────────────────
wait_for_health() {
  local service=$1
  local max_wait=${2:-$MAX_RETRIES}
  
  info "Waiting for ${service} to become healthy..."
  
  local i=0
  while [[ $i -lt $max_wait ]]; do
    local health_status
    health_status=$(docker inspect --format='{{.State.Health.Status}}' "wazuhweb_${service}" 2>/dev/null || echo "none")
    
    case $health_status in
      healthy)
        success "${service} is healthy"
        return 0
        ;;
      unhealthy)
        err "${service} is unhealthy"
        return 1
        ;;
      *)
        echo -n "."
        ;;
    esac
    
    sleep 5
    i=$((i + 1))
  done
  
  err "Timeout waiting for ${service} to become healthy"
  return 1
}

# ─── Comprehensive Health Check ──────────────────────────────────────────────
comprehensive_health_check() {
  separator
  info "Running comprehensive health check..."
  
  local all_healthy=true
  
  # Check containers are running
  info "Checking containers..."
  for container in backend frontend nginx; do
    if docker ps --filter "name=wazuhweb_${container}" --format "{{.Names}}" | grep -q "wazuhweb_${container}"; then
      success "  wazuhweb_${container} is running"
    else
      err "  wazuhweb_${container} is NOT running"
      all_healthy=false
    fi
  done
  
  # Check backend API
  info "Checking backend API..."
  if timeout 5 curl -sk "${APP_URL}/api/health" > /dev/null 2>&1; then
    success "  Backend API responding"
  else
    err "  Backend API not responding"
    all_healthy=false
  fi
  
  # Check network connectivity
  info "Checking Docker network..."
  local containers=$(docker network inspect wazuhweb_net \
    --format '{{range $k, $v := .Containers}}{{$v.Name}}:{{$v.IPv4Address}} {{end}}' 2>/dev/null)
  
  if [[ -n "$containers" ]]; then
    success "  Network services:"
    echo "    $containers" | tr ' ' '\n' | sed 's/^/    /'
  else
    warn "  No containers found on network"
    all_healthy=false
  fi
  
  # Check volumes
  info "Checking volumes..."
  if docker volume ls | grep -q wazuhweb_db_data; then
    success "  Database volume exists"
  else
    warn "  Database volume not found"
    all_healthy=false
  fi
  
  separator
  
  if [[ "$all_healthy" == true ]]; then
    success "All health checks passed!"
    return 0
  else
    warn "Some health checks failed"
    return 1
  fi
}



# ─── Build Commands ──────────────────────────────────────────────────────────
cmd_build() {
  separator
  log "Building Docker images (with cache)..."
  
  local start_time=$(date +%s)
  
  check_ssl
  check_network
  
  if ! ${COMPOSE} build --progress=plain; then
    err "Build failed!"
    return 1
  fi
  
  local end_time=$(date +%s)
  local duration=$((end_time - start_time))
  
  success "Build completed in ${duration}s"
  separator
}

cmd_rebuild() {
  separator
  log "Clean rebuild Docker images (--no-cache)..."
  
  local start_time=$(date +%s)
  
  check_ssl
  check_network
  
  warn "Building without cache — this may take several minutes..."
  
  if ! ${COMPOSE} build --no-cache --progress=plain; then
    err "Rebuild failed!"
    return 1
  fi
  
  local end_time=$(date +%s)
  local duration=$((end_time - start_time))
  
  success "Rebuild completed in ${duration}s"
  separator
}

# ─── Full Build & Deploy ─────────────────────────────────────────────────────
cmd_fullbuild() {
  separator
  log "STARTING FULL BUILD & DEPLOY (complete fresh start)"
  separator
  
  local start_time=$(date +%s)
  
  # Phase 1: Pre-flight checks
  info "Phase 1: Pre-flight checks"
  check_dependencies || { err "Dependency check failed"; return 1; }
  check_environment || { err "Environment validation failed"; return 1; }
  check_ssl
  check_network
  success "Pre-flight checks completed\n"
  
  # Phase 2: Backup current state
  info "Phase 2: Creating backup"
  create_backup
  success "Backup completed\n"
  
  # Phase 3: Stop running containers
  info "Phase 3: Stopping existing containers"
  ${COMPOSE} down 2>/dev/null || true
  sleep 2
  success "Containers stopped\n"
  
  # Phase 4: Clean rebuild
  info "Phase 4: Clean rebuild (no cache)"
  warn "This may take several minutes..."
  if ! ${COMPOSE} build --no-cache --progress=plain; then
    err "Build failed!"
    return 1
  fi
  success "Build completed\n"
  
  # Phase 5: Start containers
  info "Phase 5: Starting containers"
  if ! ${COMPOSE} up -d; then
    err "Failed to start containers!"
    return 1
  fi
  success "Containers started\n"
  
  # Phase 6: Wait for services to become healthy
  info "Phase 6: Waiting for services to become healthy"
  sleep 5
  
  if ! wait_for_health "backend" "$MAX_RETRIES"; then
    err "Backend health check failed"
    cmd_logs "backend" | tail -20
    return 1
  fi
  success "Backend is healthy\n"
  
  # Phase 7: Comprehensive health check
  info "Phase 7: Running comprehensive health check"
  if ! comprehensive_health_check; then
    warn "Some health checks failed - deployment may still be initializing"
  fi
  success "Health check completed\n"
  
  local end_time=$(date +%s)
  local total_duration=$((end_time - start_time))
  
  separator
  success "🎉 FULL BUILD & DEPLOY COMPLETED SUCCESSFULLY!"
  separator
  echo ""
  echo "📊 Deployment Summary:"
  echo "  ✓ Status: Ready for use"
  echo "  ✓ Total time: ${total_duration}s"
  echo "  ✓ URL: ${APP_URL}"
  echo "  ✓ Backend: http://localhost:8000 (internal)"
  echo "  ✓ Frontend: http://localhost:80 (internal)"
  echo ""
  echo "🔐 Default Credentials:"
  echo "  Username: admin"
  echo "  Password: Wazuh@S0C2026!"
  echo ""
  warn "⚠️  IMPORTANT: Please change default password after first login!"
  echo ""
  echo "📖 Useful commands:"
  echo "  • View logs:    $0 logs"
  echo "  • Check status: $0 status"
  echo "  • Health check: $0 health"
  echo ""
  separator
}

# ─── Start Containers ────────────────────────────────────────────────────────
cmd_start() {
  separator
  log "Starting SOC Center containers..."
  
  check_ssl
  check_network
  
  if ! ${COMPOSE} up -d; then
    err "Failed to start containers!"
    return 1
  fi
  
  info "Waiting for backend service to become healthy (up to 60s)..."
  
  if ! wait_for_health "backend" "$MAX_RETRIES"; then
    err "Backend health check failed!"
    err "Showing last 30 lines of backend logs:"
    cmd_logs "backend" | tail -30
    return 1
  fi
  
  separator
  success "🚀 SOC Center is now running!"
  separator
  echo ""
  echo "📍 Access Information:"
  echo "  URL:      ${APP_URL}"
  echo "  Username: admin"
  echo "  Password: Wazuh@S0C2026!"
  echo ""
  warn "⚠️  Please change your password after first login!"
  echo ""
}

# ─── Stop Containers ─────────────────────────────────────────────────────────
cmd_stop() {
  separator
  log "Stopping SOC Center containers..."
  
  ${COMPOSE} down
  
  sleep 2
  success "Containers stopped"
  separator
}

# ─── Restart Containers ──────────────────────────────────────────────────────
cmd_restart() {
  cmd_stop
  sleep 3
  cmd_start
}

# ─── Quick Redeploy ──────────────────────────────────────────────────────────
cmd_redeploy() {
  separator
  log "Quick redeploy (rebuild + restart)..."
  
  cmd_rebuild
  
  echo ""
  info "Restarting containers..."
  cmd_restart
  
  success "Redeploy completed!"
  separator
}



# ─── Logs ────────────────────────────────────────────────────────────────────
cmd_logs() {
  local service="${2:-all}"
  
  case "$service" in
    backend|frontend|nginx)
      info "Following logs for ${service}..."
      ${COMPOSE} logs -f --tail=100 "wazuhweb_${service}"
      ;;
    all)
      info "Following logs for all services..."
      ${COMPOSE} logs -f --tail=100
      ;;
    *)
      err "Unknown service: $service"
      echo "Available services: backend, frontend, nginx, all"
      return 1
      ;;
  esac
}

# ─── Status ───────────────────────────────────────────────────────────────────
cmd_status() {
  separator
  echo "  SOC Center — Detailed Status Report"
  separator
  
  echo ""
  echo "📦 Containers Status:"
  echo "─────────────────────────────────────────────"
  docker ps --filter "name=wazuhweb_" \
    --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || echo "  No containers found"
  
  echo ""
  echo "🔗 Docker Network:"
  echo "─────────────────────────────────────────────"
  local net_info=$(docker network inspect wazuhweb_net \
    --format '{{range $k, $v := .Containers}}  {{$v.Name}}: {{$v.IPv4Address}}\n{{end}}' 2>/dev/null)
  
  if [[ -n "$net_info" ]]; then
    echo -e "$net_info"
  else
    echo "  Network not found or no containers"
  fi
  
  echo ""
  echo "📊 Volumes:"
  echo "─────────────────────────────────────────────"
  docker volume ls --filter "name=wazuhweb_" \
    --format "  {{.Name}}: {{.Mountpoint}}" 2>/dev/null || echo "  No volumes found"
  
  echo ""
  echo "🌐 API Health:"
  echo "─────────────────────────────────────────────"
  if timeout 5 curl -sk "${APP_URL}/api/health" -o /tmp/health.json 2>/dev/null; then
    echo "  ✓ Backend API responding"
    if command -v python3 &> /dev/null; then
      python3 -m json.tool < /tmp/health.json 2>/dev/null | sed 's/^/  /'
    fi
    rm -f /tmp/health.json
  else
    echo "  ✗ Backend API not responding (might still be initializing)"
  fi
  
  echo ""
  echo "🔍 Resource Usage:"
  echo "─────────────────────────────────────────────"
  docker stats --no-stream --filter "name=wazuhweb_" \
    --format "  {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}" 2>/dev/null || echo "  Unable to get resource stats"
  
  separator
  echo "✨ Application URL: ${APP_URL}"
  separator
}

# ─── Process Status ──────────────────────────────────────────────────────────
cmd_ps() {
  ${COMPOSE} ps
}

# ─── Health Check ────────────────────────────────────────────────────────────
cmd_health() {
  comprehensive_health_check
}

# ─── Verification ────────────────────────────────────────────────────────────
cmd_verify() {
  separator
  log "Verifying deployment completeness..."
  
  local checks_passed=0
  local checks_total=8
  
  # Check 1: Docker daemon
  if docker ps &>/dev/null; then
    success "Docker daemon is accessible"
    checks_passed=$((checks_passed + 1))
  else
    err "Docker daemon is not accessible"
  fi
  
  # Check 2: Network exists
  if docker network inspect wazuhweb_net &>/dev/null; then
    success "Docker network wazuhweb_net exists"
    checks_passed=$((checks_passed + 1))
  else
    err "Docker network wazuhweb_net does not exist"
  fi
  
  # Check 3: All containers running
  local running_count=$(docker ps --filter "name=wazuhweb_" --format "{{.Names}}" | wc -l)
  if [[ $running_count -eq 3 ]]; then
    success "All 3 containers are running"
    checks_passed=$((checks_passed + 1))
  else
    err "Expected 3 containers, found $running_count"
  fi
  
  # Check 4: Backend healthcheck
  local backend_health=$(docker inspect --format='{{.State.Health.Status}}' wazuhweb_backend 2>/dev/null || echo "none")
  if [[ "$backend_health" == "healthy" ]]; then
    success "Backend container is healthy"
    checks_passed=$((checks_passed + 1))
  else
    warn "Backend health status: $backend_health"
  fi
  
  # Check 5: Database volume
  if docker volume ls | grep -q wazuhweb_db_data; then
    success "Database volume wazuhweb_db_data exists"
    checks_passed=$((checks_passed + 1))
  else
    err "Database volume wazuhweb_db_data not found"
  fi
  
  # Check 6: SSL certificates
  if [[ -f "${APP_DIR}/nginx/ssl/cert.pem" && -f "${APP_DIR}/nginx/ssl/key.pem" ]]; then
    success "SSL certificates are present"
    checks_passed=$((checks_passed + 1))
  else
    err "SSL certificates are missing"
  fi
  
  # Check 7: API endpoint
  if timeout 5 curl -sk "${APP_URL}/api/health" &>/dev/null; then
    success "API endpoint is responding"
    checks_passed=$((checks_passed + 1))
  else
    warn "API endpoint is not responding yet (might be initializing)"
  fi
  
  # Check 8: Environment variables
  if check_environment 2>/dev/null; then
    success "Environment variables are configured"
    checks_passed=$((checks_passed + 1))
  else
    err "Environment variables are not properly configured"
  fi
  
  separator
  echo "✅ Verification Results: ${checks_passed}/${checks_total} checks passed"
  
  if [[ $checks_passed -eq $checks_total ]]; then
    success "Deployment is complete and healthy!"
  else
    warn "Some checks failed - review above for details"
  fi
  separator
}

# ─── Maintenance Commands ────────────────────────────────────────────────────
cmd_clean() {
  separator
  warn "This will remove all containers, volumes, and networks"
  read -p "Are you sure? (type 'yes' to confirm): " -r confirm
  
  if [[ "$confirm" != "yes" ]]; then
    log "Operation cancelled"
    return 0
  fi
  
  log "Cleaning up all containers and volumes..."
  
  ${COMPOSE} down -v
  docker network rm wazuhweb_net 2>/dev/null || true
  
  success "Cleanup completed"
  separator
}

cmd_prune() {
  separator
  log "Pruning unused Docker resources..."
  warn "This will remove unused images, networks, and volumes"
  
  docker system prune -f --volumes
  
  success "Pruning completed"
  separator
}

cmd_backup() {
  separator
  log "Creating backup..."
  
  create_backup || { err "Backup failed"; return 1; }
  
  log "Listing recent backups:"
  ls -lh "$BACKUP_DIR"/backup_*.tar.gz 2>/dev/null | tail -5 | awk '{print "  " $9 " (" $5 ")"}'
  
  separator
}

cmd_rollback() {
  separator
  log "Rollback not yet implemented"
  warn "To rollback, restore from backup manually using:"
  echo "  tar -xzf ${BACKUP_DIR}/backup_YYYYMMDD_HHMMSS.tar.gz"
  separator
}

# ─── Information Commands ────────────────────────────────────────────────────
cmd_version() {
  separator
  echo "SOC Center — Version Information"
  separator
  
  echo ""
  echo "📦 Software Versions:"
  docker --version
  docker compose version | head -1
  python3 --version
  curl --version | head -1
  
  echo ""
  echo "🐳 Docker Image Information:"
  ${COMPOSE} images
  
  separator
}

cmd_check() {
  separator
  log "Running pre-flight checks..."
  echo ""
  
  check_dependencies || return 1
  echo ""
  check_environment || return 1
  echo ""
  check_ssl
  echo ""
  check_network
  
  separator
  success "All pre-flight checks passed!"
  separator
}

cmd_env() {
  separator
  log "Environment Configuration:"
  separator
  
  if [[ ! -f "${APP_DIR}/.env" ]]; then
    err ".env file not found"
    return 1
  fi
  
  echo ""
  echo "🔧 Application Settings:"
  grep -E "^APP_|^BACKEND_|^SECRET_KEY|^ACCESS_TOKEN" "${APP_DIR}/.env" | sed 's/^/  /'
  
  echo ""
  echo "🗄️  Database Settings:"
  grep -E "^DATABASE" "${APP_DIR}/.env" | sed 's/^/  /'
  
  echo ""
  echo "🔗 External Services:"
  grep -E "^WAZUH_|^OPENSEARCH_|^GRAFANA_" "${APP_DIR}/.env" | sed 's/^/  /'
  
  echo ""
  echo "🧠 Threat Intelligence APIs:"
  grep -E "^ABUSEIPDB_KEY|^OTX_KEY|^SHODAN_KEY|^VIRUSTOTAL_KEY" "${APP_DIR}/.env" | sed 's/^/  /'
  
  echo ""
  echo "📢 Notifications:"
  grep -E "^TELEGRAM_" "${APP_DIR}/.env" | sed 's/^/  /'
  
  separator
}



# ─── Main Dispatcher ─────────────────────────────────────────────────────────
main() {
  local action="${1:-help}"
  
  # Ensure log directory exists
  mkdir -p "$(dirname "$LOG_FILE")" 2>/dev/null || LOG_FILE="/tmp/soc_center.log"
  
  case "$action" in
    # Deployment commands
    fullbuild)  cmd_fullbuild ;;
    build)      cmd_build ;;
    rebuild)    cmd_rebuild ;;
    start)      cmd_start ;;
    stop)       cmd_stop ;;
    restart)    cmd_restart ;;
    redeploy)   cmd_redeploy ;;
    
    # Monitoring commands
    logs)       cmd_logs "$@" ;;
    status)     cmd_status ;;
    ps)         cmd_ps ;;
    health)     cmd_health ;;
    verify)     cmd_verify ;;
    
    # Maintenance commands
    clean)      cmd_clean ;;
    prune)      cmd_prune ;;
    backup)     cmd_backup ;;
    restore)    cmd_rollback ;;
    rollback)   cmd_rollback ;;
    
    # Information commands
    version)    cmd_version ;;
    check)      cmd_check ;;
    env)        cmd_env ;;
    
    # Help
    help|-h|--help)
      usage 0
      ;;
    
    *)
      err "Unknown command: $action"
      echo ""
      usage 1
      ;;
  esac
}

# ─── Entry Point ─────────────────────────────────────────────────────────────
main "$@"

