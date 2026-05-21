# SOC Center UI/UX Design System — Quick Reference Card
## One-Page Developer Cheat Sheet

---

## 🎯 The 8 Pages at a Glance

| # | Page | URL | Purpose | Status | Key Component |
|---|------|-----|---------|--------|----------------|
| 1 | Dashboard | `/` | Real-time overview | ✅ Partial | KPI cards + charts |
| 2 | Alerts | `/alerts` | Triage & response | 🆕 TODO | DataGrid + side panel |
| 3 | Investigate | `/investigate` | Deep-dive analysis | 🆕 TODO | Tabs + timeline |
| 4 | IOC | `/ioc` | IOC search & manage | 🆕 TODO | Multi-source search |
| 5 | Compliance | `/compliance` | Framework tracking | 🆕 TODO | Score cards + tables |
| 6 | Assets | `/assets` | Device inventory | 🆕 TODO | Device DataGrid |
| 7 | KPI | `/kpi` | Performance metrics | 🆕 TODO | Charts + big numbers |
| 8 | Admin | `/admin` | System config | 🆕 TODO | Rules editor + CRUD |

---

## 🎨 Design Tokens (Copy-Paste)

### Colors
```javascript
// Dark mode (default)
const colors = {
  bg: { 0: '#060c17', 1: '#0d1825', 2: '#132032', 3: '#1a2c45' },
  text: { primary: '#f0f4ff', secondary: '#8899bb', tertiary: '#445566' },
  severity: { critical: '#ef4444', high: '#f59e0b', medium: '#3b82f6', low: '#10b981' },
  status: { success: '#10b981', warning: '#f59e0b', error: '#ef4444', info: '#3b82f6' },
  accent: '#3b82f6'
}
```

### Spacing
```
4px | 8px | 12px | 16px | 24px | 32px | 48px
```

### Radius
```
4px (badges) | 8px (inputs) | 12px (cards) | 16px (modals)
```

---

## 📋 API Endpoints Quick Map

```
// Authentication
POST   /api/auth/login
GET    /api/auth/me
POST   /api/auth/logout

// Dashboard
GET    /api/dashboard/stats?range=24h
GET    /api/dashboard/cluster

// Alerts
GET    /api/alerts?limit=50&page=1
GET    /api/alerts/{id}
WS     /ws/alerts

// Investigation
POST   /api/investigate?q=VALUE&type=ip

// IOC
POST   /api/ioc/search?q=VALUE
GET    /api/ioc/custom
CRUD   /api/ioc/custom/*

// Compliance
GET    /api/compliance/summary?range=7d

// Assets
GET    /api/assets/devices?page=1

// KPI
GET    /api/kpi/summary
GET    /api/kpi/timeline?days=30

// Admin
GET    /api/admin/rules
CRUD   /api/admin/tuning/*
```

---

## 🔧 Component Import Template

```javascript
// Common components (use across all pages)
import { MetricCard, SeverityBadge, StatusDot, DetailPanel } from './components/common/CommonComponents'

// Specific page
import Page from './components/pages/[PageName]Page'

// Theme
import { useThemeMode } from './hooks/useThemeMode'

// API
import api from './utils/api'
```

---

## 📊 Real Wazuh Data Fields (Common)

```javascript
// Alert object (from OpenSearch)
{
  "@timestamp": "2026-05-21T14:23:45Z",
  "rule": { 
    "id": "5105", 
    "level": 12,
    "description": "...",
    "pci_dss": ["6.5.2", "10.2.1"],
    "mitre": { "id": "T1110", "tactic": "Brute Force" }
  },
  "data": {
    "srcip": "10.251.66.51",
    "dstip": "192.168.100.10",
    "dstuser": "admin",
    "mac": "A4:C3:F0:AB:CD:12"
  },
  "agent": { "name": "LAPTOP-01", "id": "001" },
  "GeoLocation": { 
    "country_name": "Thailand",
    "city_name": "Nakhon Si Thammarat",
    "location": { "lat": 8.5428, "lon": 100.3019 }
  }
}

// Device object
{
  "ip": "10.251.66.51",
  "mac": "A4:C3:F0:AB:CD:12",
  "hostname": "LAPTOP-WRK01",
  "user": "john.doe",
  "status": "online",
  "risk_score": 6.5,
  "last_seen": "2026-05-21T14:23:45Z"
}

// KPI object
{
  "mttd_hours": 2.3,
  "mttr_hours": 8.1,
  "fp_rate": 3.2,
  "uptime_percent": 99.8,
  "alert_count": 23456,
  "critical": 123
}
```

---

## 🚀 Common Developer Tasks

### Task: Add a new page
1. Create `src/components/pages/[Name]Page.jsx`
2. Import in `App.jsx`, add route
3. Add nav item in `Sidebar.jsx`
4. Create API endpoints in backend

### Task: Add a data field to table
1. Add column to DataGrid: `{ field: 'fieldName', headerName: 'Label', width: 100 }`
2. Ensure API returns that field
3. Test in browser

### Task: Add a chart
1. Import Recharts component: `import { BarChart, Bar } from 'recharts'`
2. Prepare data array: `[{date, value}, ...]`
3. Render chart component
4. Add legend, tooltip, label

### Task: Add authentication check
1. Use hook: `const { isAuthenticated } = useAuth()`
2. Return redirect if not authenticated
3. Or use `<Guard>` wrapper component

### Task: Make page responsive
1. Use Tailwind classes: `flex flex-col lg:flex-row`
2. Test on: 320px (mobile), 768px (tablet), 1280px (desktop)
3. Hide columns on mobile: `hidden lg:table-cell`

---

## 🐛 Debugging Checklist

### Frontend Issues
- [ ] Check console for errors/warnings
- [ ] Check Network tab for failed API calls (403/401/500?)
- [ ] Verify localStorage has JWT token
- [ ] Try clearing cache + hard refresh (Ctrl+Shift+R)
- [ ] Check theme mode: `document.documentElement.className`

### Backend Issues
- [ ] Check logs: `docker compose logs wazuhweb_backend`
- [ ] Test Wazuh API: `curl -sk -X POST https://10.251.151.11:55000/...`
- [ ] Test OpenSearch: `curl -sk -u admin:admin https://10.251.151.13:9200/...`
- [ ] Check database: `sqlite3 /app/data/soc_center.db "SELECT * FROM users;"`
- [ ] Verify .env variables loaded

### Performance Issues
- [ ] Check Lighthouse: DevTools → Lighthouse
- [ ] Profile in DevTools → Performance tab
- [ ] Check bundle size: `npm run build && npm list`
- [ ] Monitor API response times in Network tab

---

## 📁 File Locations Reference

```
Frontend
  ├─ Components: src/components/pages/*.jsx
  ├─ Common UI: src/components/common/*.jsx
  ├─ Hooks: src/hooks/*.js
  ├─ API: src/utils/api.js
  ├─ Theme: src/theme/muiTheme.js
  └─ Config: vite.config.js, tailwind.config.js

Backend
  ├─ Routes: app/api/*.py
  ├─ Services: app/services/*.py
  ├─ DB Models: app/models/db.py
  ├─ Config: app/core/config.py
  └─ Main: app/main.py

Docker
  ├─ Frontend: frontend/Dockerfile
  ├─ Backend: backend/Dockerfile
  ├─ Nginx: nginx/Dockerfile
  └─ Compose: docker/docker-compose.yml

Docs
  ├─ Design Spec: docs/SOC_CENTER_UI_DESIGN_SPEC_TH.md
  ├─ Implementation: docs/IMPLEMENTATION_MAPPING.md
  ├─ Architecture: docs/COMPONENT_ARCHITECTURE.md
  └─ This file: docs/README_DESIGN_SYSTEM.md
```

---

## 💡 Pro Tips

1. **Use React Query caching** → Reduce API calls by 50%
   ```javascript
   const { data } = useQuery({
     queryKey: ['alerts'],
     queryFn: () => api.get('/alerts'),
     staleTime: 30000  // Cache for 30 seconds
   })
   ```

2. **Lazy-load pages** → Faster initial load
   ```javascript
   const AlertsPage = lazy(() => import('./pages/AlertsPage'))
   ```

3. **Use WebSocket for real-time** → No polling overhead
   ```javascript
   const ws = new WebSocket('wss://..../ws/alerts?token=JWT')
   ```

4. **Batch API calls** → Load data faster
   ```javascript
   const results = await Promise.all([
     api.get('/dashboard/stats'),
     api.get('/dashboard/cluster'),
     api.get('/alerts')
   ])
   ```

5. **Use Tailwind responsive** → One CSS framework, all breakpoints
   ```jsx
   <div className="p-4 lg:p-8 grid grid-cols-1 lg:grid-cols-3 gap-4">
   ```

---

## ⏱️ Typical Development Timeline

| Phase | Duration | What | Owner |
|-------|----------|------|-------|
| Design Review | 1-2 days | Stakeholder feedback | PM + Design |
| Sprint 1 (Dashboard + Alerts) | 2 weeks | Pages 1-2 + backend APIs | Dev Team |
| Sprint 2 (Investigation + IOC) | 2 weeks | Pages 3-4 + enrichment services | Dev Team |
| Sprint 3 (Compliance + Assets) | 2 weeks | Pages 5-6 + data import jobs | Dev Team |
| Sprint 4 (KPI + Admin) | 2 weeks | Pages 7-8 + management features | Dev Team |
| Optimization | 1 week | Performance, mobile, accessibility | Dev Team + QA |
| Testing | 2 weeks | UAT with SOC team, bug fixes | QA + SOC |
| Launch | 1 day | Deploy to production | DevOps |

**Total: ~12 weeks to production-ready**

---

## 🎓 Learning Resources

### For React/Vite
- React docs: https://react.dev
- Vite guide: https://vitejs.dev
- Create a component: Component name must start with capital letter

### For Material-UI
- MUI docs: https://mui.com
- DataGrid: https://mui.com/x/api/data-grid/
- Examples: https://github.com/mui/material-ui

### For Recharts
- Recharts docs: https://recharts.org
- Common charts: AreaChart, BarChart, PieChart, LineChart
- Example: Copy from [chart name] docs page

### For FastAPI
- FastAPI docs: https://fastapi.tiangolo.com
- Auto Swagger UI: http://localhost:8000/docs
- WebSocket: https://fastapi.tiangolo.com/advanced/websockets/

---

## 🔗 Quick Links

| Link | Purpose |
|------|---------|
| [Design Spec](SOC_CENTER_UI_DESIGN_SPEC_TH.md) | Full design with layouts + colors |
| [Implementation](IMPLEMENTATION_MAPPING.md) | Dev checklist + API list |
| [Architecture](COMPONENT_ARCHITECTURE.md) | Data flows + database schema |
| [Deployment](DEPLOYMENT_REPORT_TH.md) | Thai deployment guide |
| [Deploy Script](../deploy.sh) | Automated deployment |
| [Wazuh API](https://documentation.wazuh.com/current/api/index.html) | Official Wazuh API docs |
| [OpenSearch Docs](https://opensearch.org/docs/) | OpenSearch query language |

---

## ✅ Pre-Commit Checklist

Before pushing code:
- [ ] Code follows Tailwind/MUI patterns
- [ ] No console errors/warnings
- [ ] Tests pass (if applicable)
- [ ] API responses match backend schema
- [ ] Component responsive on mobile
- [ ] Dark/light mode both work
- [ ] No hardcoded secrets in code
- [ ] Commit message is descriptive

---

## 🆘 Quick Support

**Problem: Page won't load**
- Check URL (typo in route?)
- Check browser console (errors?)
- Check Network tab (API call failed?)

**Problem: No data showing**
- Verify API endpoint returns data
- Check browser Network tab
- Check backend logs for errors
- Verify Wazuh/OpenSearch connectivity

**Problem: Styling looks wrong**
- Check theme colors loaded correctly
- Verify Tailwind classes applied
- Check for CSS conflicts
- Try hard refresh (Ctrl+Shift+R)

**Problem: Performance slow**
- Check Lighthouse score
- Profile in DevTools Performance tab
- Look for N+1 queries (too many API calls)
- Check for missing React.memo optimization

---

## 📞 Key Contacts

- **Architecture Lead:** [SOC Architecture Team]
- **Frontend Tech Lead:** [Frontend Dev Lead]
- **Backend Tech Lead:** [Backend Dev Lead]
- **DevOps/Deployment:** [DevOps Lead]

---

**Document Version:** 1.0  
**Last Updated:** May 21, 2026  
**Maintained By:** SOC Architecture Team  

🚀 **Happy Coding!**
