# 🚀 SOC Center — Comprehensive Deployment Guide

**Last Updated**: May 21, 2026  
**Version**: 2.0.0  
**Environment**: Production

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Deployment Commands](#deployment-commands)
4. [Monitoring & Status](#monitoring--status)
5. [Maintenance & Backup](#maintenance--backup)
6. [Troubleshooting](#troubleshooting)
7. [Advanced Usage](#advanced-usage)

---

## Overview

The improved `deploy.sh` script provides **professional-grade deployment and operational management** for the SOC Center application. It includes:

✅ **Full Build & Deploy** — Complete rebuild from scratch  
✅ **Pre-flight Checks** — Verify dependencies and configuration  
✅ **Health Monitoring** — Comprehensive system health checks  
✅ **Backup & Recovery** — Automated backup and restore  
✅ **Logging & Status** — Detailed logs and status reports  
✅ **Environment Validation** — Verify all required configurations  
✅ **Multiple Deployment Strategies** — Choose your deployment approach  

---

## Quick Start

### 1. First-Time Complete Deployment

```bash
# Full clean build + deployment (complete fresh start)
./deploy.sh fullbuild

# This will:
# ✓ Verify all dependencies
# ✓ Validate environment configuration
# ✓ Create backup of current state
# ✓ Stop any running containers
# ✓ Clean rebuild Docker images
# ✓ Start all containers
# ✓ Wait for services to be healthy
# ✓ Run comprehensive health checks
```

### 2. Update & Redeploy

```bash
# Quick rebuild + restart (for code updates)
./deploy.sh redeploy

# This will:
# ✓ Rebuild images (with cache)
# ✓ Stop containers
# ✓ Start containers
# ✓ Wait for health checks
```

### 3. Check System Status

```bash
# Detailed status report
./deploy.sh status

# Shows:
# ✓ Container status
# ✓ Docker network info
# ✓ Volume information
# ✓ API health
# ✓ Resource usage
```

### 4. Start/Stop Services

```bash
./deploy.sh start      # Start all containers
./deploy.sh stop       # Stop all containers
./deploy.sh restart    # Stop then start
```

---

## Deployment Commands

### 🚀 Main Deployment Commands

#### `fullbuild` — Complete Fresh Deployment
```bash
./deploy.sh fullbuild
```

**What it does:**
1. Verifies all system dependencies (Docker, curl, Python3)
2. Validates environment variables
3. Checks SSL certificates (generates if missing)
4. Creates Docker network
5. Creates backup of current state
6. Stops all running containers
7. Clean rebuild images (no cache)
8. Starts all containers
9. Waits for backend to be healthy
10. Runs comprehensive health checks

**Use when:**
- Setting up for the first time
- Completely rebuilding the system
- Recovering from failed deployment
- Making significant changes

**Typical duration:** 5-10 minutes (depending on image size)

#### `build` — Build with Cache
```bash
./deploy.sh build
```

**What it does:**
- Builds Docker images using Docker layer cache
- Faster than clean rebuild for incremental changes

**Use when:**
- Updating a small part of the code
- Only one service has changed

**Typical duration:** 1-3 minutes

#### `rebuild` — Clean Rebuild
```bash
./deploy.sh rebuild
```

**What it does:**
- Force clean rebuild without using cache
- Ensures all dependencies are fresh

**Use when:**
- Dependencies may be outdated
- Need to ensure clean build
- Experiencing caching issues

**Typical duration:** 5-10 minutes

#### `redeploy` — Quick Update
```bash
./deploy.sh redeploy
```

**What it does:**
1. Rebuild images (with cache)
2. Restart containers
3. Wait for health checks

**Use when:**
- Making quick code updates
- Need fast deployment cycle

**Typical duration:** 2-5 minutes

#### `start` — Start Containers
```bash
./deploy.sh start
```

**What it does:**
- Starts all containers
- Waits for backend to be healthy
- Shows access information

#### `stop` — Stop Containers
```bash
./deploy.sh stop
```

**What it does:**
- Stops and removes all containers
- Preserves volumes and networks

#### `restart` — Restart
```bash
./deploy.sh restart
```

**What it does:**
- Stops all containers
- Waits 3 seconds
- Starts all containers again

---

## Monitoring & Status

### 📊 Status Commands

#### `status` — Detailed Status Report
```bash
./deploy.sh status
```

**Shows:**
- Container status and uptime
- Docker network information
- Volume information
- API health (JSON response)
- Resource usage (CPU, memory)

#### `health` — Comprehensive Health Check
```bash
./deploy.sh health
```

**Checks:**
- All 3 containers are running
- Backend API responding
- Docker network services
- Database volume exists

#### `verify` — Deployment Verification
```bash
./deploy.sh verify
```

**Verifies:** (8 checks total)
- Docker daemon accessibility
- Docker network exists
- All containers running
- Backend health status
- Database volume exists
- SSL certificates present
- API endpoint responding
- Environment variables configured

**Output:**
```
✅ Verification Results: 8/8 checks passed
✓ Deployment is complete and healthy!
```

#### `logs` — Follow Logs
```bash
./deploy.sh logs [service]

# Examples:
./deploy.sh logs backend    # Backend logs only
./deploy.sh logs frontend   # Frontend logs only
./deploy.sh logs nginx      # Nginx logs only
./deploy.sh logs all        # All services (default)
```

#### `ps` — Container Status
```bash
./deploy.sh ps

# Shows: docker compose ps output
```

---

## Maintenance & Backup

### 🛡️ Backup & Recovery

#### `backup` — Create Backup
```bash
./deploy.sh backup
```

**What it does:**
- Backs up database volume to tar.gz
- Stores in `/opt/code/wazuh_ova/backups/`
- Keeps last 5 backups automatically
- Shows backup file location

**Backup location:**
```
/opt/code/wazuh_ova/backups/backup_YYYYMMDD_HHMMSS.tar.gz
```

#### `restore` — Restore from Backup
```bash
./deploy.sh restore
```

**Manual restore process:**
```bash
# List available backups
ls -lh /opt/code/wazuh_ova/backups/

# Restore from backup
tar -xzf /opt/code/wazuh_ova/backups/backup_YYYYMMDD_HHMMSS.tar.gz
```

### 🧹 Cleanup Commands

#### `clean` — Full Cleanup
```bash
./deploy.sh clean
```

**What it does:**
- Stops all containers
- Removes all containers
- Removes all volumes
- Removes all networks

**⚠️ Warning:** This removes all data!

#### `prune` — Remove Unused Resources
```bash
./deploy.sh prune
```

**What it does:**
- Removes unused Docker images
- Removes unused networks
- Removes unused volumes

---

## Information & Configuration

### ℹ️ Information Commands

#### `check` — Pre-flight Checks
```bash
./deploy.sh check
```

**Verifies:**
- Docker installed
- Docker Compose available
- curl available
- Python3 available
- Environment variables set
- SSL certificates exist
- Docker network ready

#### `version` — Version Information
```bash
./deploy.sh version
```

**Shows:**
- Docker version
- Docker Compose version
- Python version
- curl version
- Docker images

#### `env` — Environment Configuration
```bash
./deploy.sh env
```

**Shows:**
- Application settings
- Database configuration
- External service settings
- Threat intelligence APIs
- Notification settings

---

## Troubleshooting

### ❌ Common Issues & Solutions

#### Issue: "Backend is not responding"

**Solution:**
```bash
# Check backend container logs
./deploy.sh logs backend | tail -50

# Verify API health
./deploy.sh health

# Rebuild backend
./deploy.sh redeploy
```

#### Issue: "API endpoint not responding"

**Solution:**
```bash
# Check if containers are running
./deploy.sh status

# Check health of backend
./deploy.sh health

# Check detailed status
docker compose -f /opt/code/wazuh_ova/web_app/docker/docker-compose.yml logs backend
```

#### Issue: "SSL certificate errors"

**Solution:**
```bash
# Regenerate SSL certificate
rm -f /opt/code/wazuh_ova/web_app/nginx/ssl/*.pem
./deploy.sh fullbuild
```

#### Issue: "Docker network not found"

**Solution:**
```bash
# Recreate network
docker network rm wazuhweb_net 2>/dev/null || true
./deploy.sh check
```

#### Issue: "Database corruption"

**Solution:**
```bash
# Create backup first
./deploy.sh backup

# Remove volume
docker volume rm wazuhweb_db_data

# Restart
./deploy.sh start
```

### 🔍 Debug Commands

```bash
# View Docker compose status
docker compose -f /opt/code/wazuh_ova/web_app/docker/docker-compose.yml ps

# Inspect specific container
docker inspect wazuhweb_backend

# Check container health
docker inspect --format='{{.State.Health}}' wazuhweb_backend

# View container stats
docker stats --no-stream wazuhweb_backend

# Access container shell
docker exec -it wazuhweb_backend bash
```

---

## Advanced Usage

### 🔧 Custom Deployments

#### Deploy on Specific Host

```bash
# From any directory
/opt/code/wazuh_ova/web_app/deploy.sh fullbuild
```

#### Background Deployment

```bash
# Run deployment in background
nohup ./deploy.sh fullbuild > deploy.log 2>&1 &

# Check progress
tail -f deploy.log
```

#### Scheduled Backups

```bash
# Add to crontab for daily backups at 2 AM
0 2 * * * /opt/code/wazuh_ova/web_app/deploy.sh backup
```

### 📝 Log Management

**Log file location:**
```
/opt/code/wazuh_ova/web_app/logs/deploy.log
```

**View deployment log:**
```bash
cat /opt/code/wazuh_ova/web_app/logs/deploy.log

# Follow log in real-time
tail -f /opt/code/wazuh_ova/web_app/logs/deploy.log
```

### 🔐 Security Considerations

1. **Change Default Password** — Change admin password immediately after first login
2. **SSL Certificates** — Use proper certificates in production (not self-signed)
3. **Environment Variables** — Keep .env file secure and protected
4. **Backups** — Store backups in secure location with proper permissions
5. **Network Access** — Limit access to SOC Center to authorized personnel only

### 📊 Performance Optimization

1. **Use cache for incremental builds:**
   ```bash
   ./deploy.sh build  # faster, uses cache
   ```

2. **Monitor resource usage:**
   ```bash
   ./deploy.sh status  # shows CPU/memory usage
   ```

3. **Optimize images:**
   ```bash
   ./deploy.sh prune  # remove unused resources
   ```

---

## 📞 Support & Help

### Get Help

```bash
./deploy.sh help       # Show usage information
./deploy.sh check      # Verify system configuration
./deploy.sh status     # Show current status
./deploy.sh health     # Run health checks
```

### Log Locations

- **Deployment log:** `/opt/code/wazuh_ova/web_app/logs/deploy.log`
- **Backend logs:** Via `./deploy.sh logs backend`
- **All logs:** Via `./deploy.sh logs`

### Default Credentials

```
Username: admin
Password: Wazuh@S0C2026!
```

⚠️ **IMPORTANT:** Change password after first login!

---

## 📋 Summary

| Task | Command |
|------|---------|
| Initial Setup | `./deploy.sh fullbuild` |
| Update Code | `./deploy.sh redeploy` |
| Check Status | `./deploy.sh status` |
| View Logs | `./deploy.sh logs` |
| Health Check | `./deploy.sh health` |
| Create Backup | `./deploy.sh backup` |
| Stop Services | `./deploy.sh stop` |
| Start Services | `./deploy.sh start` |
| Get Help | `./deploy.sh help` |

---

**Version:** 2.0.0  
**Last Updated:** May 21, 2026  
**Environment:** Production  
**Support:** IT Department — Walailak University Hospital
