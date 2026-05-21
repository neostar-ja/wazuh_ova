# 🔧 SOC Center Deployment — Troubleshooting Guide

**Version:** 1.0  
**Last Updated:** May 21, 2026

---

## 🆘 Quick Diagnosis

Run these commands to diagnose issues:

```bash
# Overall system health
./deploy.sh health

# Detailed verification
./deploy.sh verify

# Current status
./deploy.sh status

# All logs
./deploy.sh logs
```

---

## ❌ Common Issues & Solutions

### Issue 1: "Backend is NOT responding"

**Symptoms:**
```
✗ Backend API not responding
✗ Health check failed
✗ Service unavailable
```

**Diagnosis:**
```bash
# Check backend logs
./deploy.sh logs backend | tail -50

# Check container status
./deploy.sh status

# Check health
./deploy.sh health
```

**Solution 1: Wait for Startup**
```bash
# Backend may still be initializing
sleep 30
./deploy.sh health
```

**Solution 2: Check Container**
```bash
# Verify container is running
docker ps | grep wazuhweb_backend

# If not running, restart
./deploy.sh restart
```

**Solution 3: Check Logs**
```bash
# Look at backend logs for errors
./deploy.sh logs backend

# Common errors:
# - Database connection error → database volume issue
# - Port already in use → restart services
# - Memory error → insufficient resources
```

**Solution 4: Full Rebuild**
```bash
./deploy.sh rebuild
./deploy.sh start
./deploy.sh health
```

---

### Issue 2: "Docker Network Not Found"

**Symptoms:**
```
✗ wazuhweb_net not found
✗ Cannot connect containers
✗ Network error
```

**Solution:**
```bash
# Recreate network
docker network rm wazuhweb_net 2>/dev/null || true

# Run pre-flight check (will recreate)
./deploy.sh check

# Or full restart
./deploy.sh fullbuild
```

---

### Issue 3: "SSL Certificate Errors"

**Symptoms:**
```
ERR_SSL_PROTOCOL_ERROR
TLS handshake failed
Certificate not found
```

**Solution:**
```bash
# Regenerate certificate
rm -f /opt/code/wazuh_ova/web_app/nginx/ssl/*.pem
chmod 755 /opt/code/wazuh_ova/web_app/nginx/ssl

# Restart to regenerate
./deploy.sh restart

# Or full rebuild
./deploy.sh fullbuild
```

---

### Issue 4: "Database Corruption"

**Symptoms:**
```
Database locked
SQL error
Cannot read database
Corrupted data
```

**Solution 1: Restart Service**
```bash
./deploy.sh restart
```

**Solution 2: Backup and Restore**
```bash
# Create backup before any action
./deploy.sh backup

# Remove corrupted volume
docker volume rm wazuhweb_db_data

# Restart (will create fresh database)
./deploy.sh start
```

**Solution 3: Restore from Backup**
```bash
# If you have a backup
docker volume rm wazuhweb_db_data
tar -xzf /opt/code/wazuh_ova/backups/backup_YYYYMMDD_HHMMSS.tar.gz -C /var/lib/docker/volumes/wazuhweb_db_data/_data
./deploy.sh start
```

---

### Issue 5: "Port Already in Use"

**Symptoms:**
```
Error: Port 3348 already in use
Bind address already in use
```

**Solution:**
```bash
# Find what's using port 3348
lsof -i :3348
netstat -tulpn | grep 3348

# Stop the conflicting process
kill -9 <PID>

# Or use different port (modify docker-compose.yml)
# Change: "3348:3348" to "3349:3348"

# Restart
./deploy.sh restart
```

---

### Issue 6: "Out of Disk Space"

**Symptoms:**
```
No space left on device
Write error
Cannot write logs
```

**Solution:**
```bash
# Check disk space
df -h

# Clean up unused Docker resources
./deploy.sh prune

# Remove old backups
ls -lt /opt/code/wazuh_ova/backups/ | tail -n +6 | awk '{print $NF}' | xargs rm -f

# Check for large files
find /opt/code/wazuh_ova -type f -size +1G

# If still full, clean up system
docker system prune -a --volumes
```

---

### Issue 7: "Memory Issues"

**Symptoms:**
```
Out of memory
Container killed
OOMKilled
Service crashes
```

**Solution 1: Check Resources**
```bash
./deploy.sh status
# Look at resource usage

# Check system memory
free -h
```

**Solution 2: Increase Limits**
```bash
# Edit docker-compose.yml
# Add to services:
# deploy:
#   resources:
#     limits:
#       memory: 4G
```

**Solution 3: Restart Services**
```bash
./deploy.sh restart
```

---

### Issue 8: "API Health Check Stuck"

**Symptoms:**
```
Waiting for backend...
Health check timeout
Backend not becoming healthy
```

**Diagnosis:**
```bash
# Check logs
./deploy.sh logs backend | tail -100

# Check if port is open
curl -k https://localhost:8000/api/health 2>/dev/null

# Check container health directly
docker inspect wazuhweb_backend | grep -A 5 Health
```

**Solution:**
```bash
# Check logs for specific error
./deploy.sh logs backend

# Rebuild if needed
./deploy.sh rebuild

# Or clean start
./deploy.sh clean
./deploy.sh fullbuild
```

---

### Issue 9: "Cannot Connect to External Services"

**Symptoms:**
```
Wazuh API not reachable
OpenSearch connection failed
Cannot reach Grafana
```

**Solution:**
```bash
# Test connectivity from backend container
docker exec wazuhweb_backend curl -k https://10.251.151.11:55000

# Check environment variables
./deploy.sh env

# Verify firewall rules
ping 10.251.151.11
telnet 10.251.151.11 55000

# Check .env file
cat /opt/code/wazuh_ova/web_app/.env | grep WAZUH_
```

---

### Issue 10: "Deployment Takes Too Long"

**Symptoms:**
```
Build taking >10 minutes
Rebuild very slow
Network download issues
```

**Solution 1: Check Network**
```bash
# Test internet speed
timeout 10 curl -O https://example.com/largefile.bin

# Check Docker registry connectivity
docker pull alpine  # Quick test
```

**Solution 2: Use Cache**
```bash
# Use cached build (faster)
./deploy.sh build    # Uses cache

# Instead of
./deploy.sh rebuild  # No cache
```

**Solution 3: Check Resources**
```bash
# System might be busy
top -b -n 1 | head -10
iostat -x 1 2
```

---

## 🔍 Debugging Techniques

### Check Container Logs

```bash
# Latest 50 lines
./deploy.sh logs backend | tail -50

# Search for errors
./deploy.sh logs backend | grep -i error

# Follow in real-time
./deploy.sh logs backend
```

### Inspect Container

```bash
# Get detailed info
docker inspect wazuhweb_backend

# Check health status
docker inspect --format='{{.State.Health}}' wazuhweb_backend

# Check resource limits
docker inspect --format='{{.HostConfig.Memory}}' wazuhweb_backend

# Check networks
docker inspect --format='{{.NetworkSettings.Networks}}' wazuhweb_backend
```

### Execute Commands in Container

```bash
# Get shell access
docker exec -it wazuhweb_backend bash

# Run specific command
docker exec wazuhweb_backend curl localhost:8000/api/health

# Check disk usage
docker exec wazuhweb_backend du -sh /app/data
```

### Monitor in Real-Time

```bash
# Watch container stats
watch -n 1 docker stats wazuhweb_backend

# Or use deploy script
./deploy.sh status
```

---

## 📊 Health Check Details

### What Does Each Check Verify?

```bash
./deploy.sh verify
```

**Check 1: Docker daemon accessible**
- Verifies Docker service is running
- Tests `docker ps` command

**Check 2: Docker network wazuhweb_net exists**
- Confirms network was created
- Tests network isolation

**Check 3: All 3 containers are running**
- backend, frontend, nginx
- Checks `docker ps` output

**Check 4: Backend container is healthy**
- Checks health check status
- Verifies service readiness

**Check 5: Database volume wazuhweb_db_data exists**
- Confirms data persistence
- Checks volume creation

**Check 6: SSL certificates are present**
- Verifies cert.pem exists
- Verifies key.pem exists

**Check 7: API endpoint is responding**
- Tests `/api/health` endpoint
- Verifies connectivity

**Check 8: Environment variables are configured**
- Validates .env file
- Checks required variables

---

## 🔄 Recovery Procedures

### Complete System Reset

```bash
# 1. Create backup first
./deploy.sh backup

# 2. Stop everything
./deploy.sh stop

# 3. Remove containers
./deploy.sh clean

# 4. Remove all volumes
docker volume rm wazuhweb_db_data 2>/dev/null || true

# 5. Remove network
docker network rm wazuhweb_net 2>/dev/null || true

# 6. Fresh start
./deploy.sh fullbuild

# 7. Verify
./deploy.sh health
```

### Rollback from Backup

```bash
# 1. Create backup of current state
./deploy.sh backup

# 2. Stop services
./deploy.sh stop

# 3. Remove corrupted volume
docker volume rm wazuhweb_db_data

# 4. Restore from backup
tar -xzf /opt/code/wazuh_ova/backups/backup_YYYYMMDD_HHMMSS.tar.gz \
  -C /var/lib/docker/volumes/wazuhweb_db_data/_data

# 5. Start services
./deploy.sh start

# 6. Verify
./deploy.sh health
```

---

## 📈 Performance Tuning

### Optimize Build Time

```bash
# Use cache (faster)
./deploy.sh build

# Avoid rebuild unless needed
# Use redeploy for quick updates
./deploy.sh redeploy
```

### Monitor Resource Usage

```bash
# Check current usage
./deploy.sh status  # Shows CPU/memory

# Watch in real-time
docker stats --no-stream wazuhweb_*
```

### Optimize Logging

```bash
# Reduce log verbosity in docker-compose.yml
# Change: driver: json-file
# Add max-size and max-file

# Or manually
docker system prune -a --volumes
```

---

## 🆘 When All Else Fails

### Nuclear Option: Complete Rebuild

```bash
# WARNING: This removes everything and starts fresh

# 1. Create final backup
./deploy.sh backup

# 2. Nuclear clean
docker compose -f /opt/code/wazuh_ova/web_app/docker/docker-compose.yml down -v
docker network rm wazuhweb_net 2>/dev/null || true
docker volume rm wazuhweb_db_data 2>/dev/null || true

# 3. System prune
docker system prune -a -f --volumes

# 4. Fresh deployment
./deploy.sh fullbuild

# 5. Verify
./deploy.sh verify
```

### Get Support

If issues persist:

1. **Check logs:**
   ```bash
   ./deploy.sh logs > /tmp/deployment.log
   # Send deployment.log to support
   ```

2. **Collect system info:**
   ```bash
   uname -a
   docker version
   docker compose version
   free -h
   df -h
   ```

3. **Create detailed report:**
   ```bash
   ./deploy.sh health > /tmp/health_report.txt
   ./deploy.sh status > /tmp/status_report.txt
   ./deploy.sh verify > /tmp/verify_report.txt
   # Attach all reports when asking for help
   ```

---

## 📋 Troubleshooting Checklist

- [ ] Run `./deploy.sh health` — check all services
- [ ] Run `./deploy.sh status` — review container status
- [ ] Check logs: `./deploy.sh logs backend`
- [ ] Verify environment: `./deploy.sh env`
- [ ] Run pre-flight: `./deploy.sh check`
- [ ] Try restart: `./deploy.sh restart`
- [ ] Try rebuild: `./deploy.sh rebuild`
- [ ] Create backup: `./deploy.sh backup`
- [ ] Nuclear option: Complete reset with `fullbuild`

---

**Need Help?**
```bash
./deploy.sh help
./deploy.sh status
./deploy.sh health
./deploy.sh logs
```

**Version:** 1.0  
**Last Updated:** May 21, 2026
