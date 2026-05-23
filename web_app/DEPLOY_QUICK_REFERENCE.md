# 🚀 SOC Center Deployment — Quick Reference

## ⚡ Most Common Commands

```bash
# Initial Setup (first time only)
./deploy.sh fullbuild

# Update & Restart (for code changes)
./deploy.sh redeploy

# Check System Status
./deploy.sh status

# View Logs
./deploy.sh logs backend  # Backend only
./deploy.sh logs          # All services

# Health Check
./deploy.sh health

# Create Backup
./deploy.sh backup

# Stop / Start
./deploy.sh stop
./deploy.sh start
```

---

## 🎯 Decision Tree

### "I need to..."

#### Deploy the system for the first time?
```bash
./deploy.sh fullbuild
```

#### Update my code and redeploy?
```bash
./deploy.sh redeploy
```

#### Check if everything is working?
```bash
./deploy.sh health
./deploy.sh verify
```

#### View what's happening?
```bash
./deploy.sh status
./deploy.sh logs
```

#### Stop the system?
```bash
./deploy.sh stop
```

#### Backup before making changes?
```bash
./deploy.sh backup
```

---

## 📊 Commands by Category

### 🚀 Deployment
```
fullbuild   Complete fresh deployment
build       Build with cache
rebuild     Force clean rebuild  
redeploy    Quick update
start       Start containers
stop        Stop containers
restart     Restart containers
```

### 📈 Monitoring
```
status      Detailed status report
health      Health check
verify      Verify completeness
logs        Follow logs
ps          Container status
```

### 🛡️ Maintenance
```
backup      Create backup
clean       Remove everything
prune       Remove unused resources
```

### ℹ️ Information
```
check       Pre-flight checks
version     Version info
env         Environment config
help        Show this help
```

---

## 🔑 Key URLs & Credentials

**URL:** https://10.251.150.222:3348/wazuh

**Default Login:**
- Username: `admin`
- Password: `<SET_DEFAULT_ADMIN_PASSWORD>`

⚠️ Change password after first login!

---

## 🆘 Troubleshooting

### Backend not responding?
```bash
./deploy.sh logs backend | tail -30
./deploy.sh health
```

### Want to rebuild everything?
```bash
./deploy.sh rebuild
./deploy.sh start
```

### Database issues?
```bash
./deploy.sh backup          # Create backup first!
docker volume rm wazuhweb_db_data
./deploy.sh start           # Will recreate database
```

### Need to see what's happening?
```bash
./deploy.sh status          # Overall status
./deploy.sh logs            # All logs
./deploy.sh health          # Health check
```

---

## 📝 Log Location

```
/opt/code/wazuh_ova/web_app/logs/deploy.log
```

---

**Need help?** Run: `./deploy.sh help`
