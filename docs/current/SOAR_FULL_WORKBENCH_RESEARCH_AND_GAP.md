# SOC Incident Response Workbench — Research & Gap Analysis

**Date:** 2026-06-04  
**Version:** 1.0  
**Project:** /opt/code/wazuh_ova

---

## 1. Current Architecture

```
Browser
  └── React SPA (/wazuh/*)
        ├── SOARPage.tsx          ← main SOAR page
        │   ├── OverviewTab       ← metrics + charts from /soar/stats
        │   ├── IRISTab           ← AlertsTable + CasesTable
        │   │   ├── AlertsTable   ← list, filter, escalate, block
        │   │   ├── CasesTable    ← list, search, open drawer
        │   │   └── CaseDetailDrawer ← notes, IOCs, timeline
        │   ├── ShuffleTab        ← workflow list + trigger
        │   └── MISPTab           ← IOC search
        └── soarApi.ts            ← API client

FastAPI Backend (/api/soar/*)
  ├── GET  /soar/stats            ← IRIS + Shuffle counts
  ├── CRUD /soar/iris/alerts/*    ← IRIS alert ops
  ├── CRUD /soar/iris/cases/*     ← IRIS case ops
  ├── POST /soar/shuffle/trigger  ← Shuffle webhook (w/ simulation guard)
  └── GET  /soar/misp/search      ← MISP IOC search

soar_svc.py
  ├── DFIR-IRIS: via REST API Bearer token
  ├── Shuffle: via webhook URL
  └── MISP: via REST API key
```

---

## 2. Existing API Endpoints

| Method | Path | Description | Status |
|--------|------|-------------|--------|
| GET | /soar/stats | IRIS+Shuffle aggregate stats | ✅ |
| GET | /soar/iris/alerts | List alerts (paged, status filter) | ✅ |
| GET | /soar/iris/alerts/{id} | Alert detail | ✅ |
| POST | /soar/iris/alerts | Create alert | ✅ |
| PUT | /soar/iris/alerts/{id} | Update alert (status/severity/note) | ✅ |
| POST | /soar/iris/alerts/escalate | Escalate alerts → case | ✅ |
| GET | /soar/iris/cases | List cases | ✅ |
| GET | /soar/iris/cases/{id} | Case detail | ✅ |
| POST | /soar/iris/cases | Create case | ✅ |
| PUT | /soar/iris/cases/{id} | Update case | ✅ |
| POST | /soar/iris/cases/{id}/close | Close case | ✅ |
| POST | /soar/iris/cases/{id}/reopen | Reopen case | ✅ |
| GET | /soar/iris/cases/{id}/notes | Get notes | ✅ |
| POST | /soar/iris/cases/{id}/notes | Add note | ✅ |
| GET | /soar/iris/cases/{id}/iocs | Get IOCs | ✅ |
| POST | /soar/iris/cases/{id}/iocs | Add IOC | ✅ |
| GET | /soar/iris/cases/{id}/timeline | Get timeline | ✅ |
| POST | /soar/iris/cases/{id}/timeline | Add timeline event | ✅ |
| GET | /soar/shuffle/workflows | List workflows | ✅ |
| POST | /soar/shuffle/trigger | Trigger action (w/ simulation) | ✅ |
| GET | /soar/misp/stats | MISP connectivity | ✅ |
| GET | /soar/misp/search | Search IOC | ✅ |
| GET | /soar/health | Integration health detail | ❌ MISSING |
| GET | /soar/integrations | Integration list+status | ❌ MISSING |
| CRUD | /soar/cases/{id}/tasks | Task management | ❌ MISSING |
| CRUD | /soar/cases/{id}/evidence | Evidence management | ❌ MISSING |
| GET | /soar/cases/{id}/activity | Activity log | ❌ MISSING |
| GET | /soar/cases/{id}/shuffle-actions | Shuffle action history | ❌ MISSING |
| GET | /soar/playbook-templates | Playbook templates | ❌ MISSING |
| POST | /soar/cases/{id}/apply-template | Apply playbook template | ❌ MISSING |

---

## 3. Existing Frontend Components

| Component | Lines | Status | Gaps |
|-----------|-------|--------|------|
| SOARPage.tsx | 176 | ✅ | Missing health panel, simulation warning |
| OverviewTab.tsx | 250 | ✅ | Minor gaps |
| IRISTab.tsx | 120 | ✅ | Tabs for alerts/cases |
| AlertsTable.tsx | 266 | ✅ | No detail drawer click |
| CasesTable.tsx | 207 | ✅ | No full-page link |
| CaseDetailDrawer.tsx | 573 | ⚠️ | Only Notes/IOCs/Timeline; missing Tasks, Evidence, Shuffle Actions, Activity, Report, Closure |
| BlockIPDialog.tsx | 66 | ⚠️ | No SIMULATION ONLY badge |
| ShuffleTab.tsx | 192 | ✅ | OK |
| MISPTab.tsx | 255 | ✅ | No "Add to Case" |
| AlertDetailDrawer | ❌ | MISSING | Full alert detail + operations |
| IntegrationHealthPanel | ❌ | MISSING | Phase 1 |
| TasksPanel | ❌ | MISSING | Phase 4 |
| EvidencePanel | ❌ | MISSING | Phase 7 |
| ShuffleActionsPanel | ❌ | MISSING | Phase 8 |
| ActivityPanel | ❌ | MISSING | Phase 3 |
| ReportPanel | ❌ | MISSING | Phase 10 |
| ClosurePanel | ❌ | MISSING | Phase 10 |
| CaseWorkspacePage | ❌ | MISSING | Phase 11 |

---

## 4. Existing Integrations

| Integration | Configured Via | Status | Notes |
|-------------|----------------|--------|-------|
| DFIR-IRIS | iris_url + iris_api_key | ✅ | Full CRUD |
| Shuffle SOAR | shuffle_url + shuffle_token + webhooks | ✅ | trigger only |
| MISP | misp_url + misp_api_key | ✅ | Read-only |
| Wazuh | wazuh_api_host + user/pass | ✅ | Via opensearch |
| OpenSearch | opensearch_host | ✅ | Core |
| AbuseIPDB | abuseipdb_key | ⚠️ | Via IOC check |
| OTX | otx_key | ⚠️ | Via IOC check |
| VirusTotal | virustotal_key | ⚠️ | Via IOC check |
| Shodan | shodan_key | ⚠️ | Via IOC check |
| Infoblox | infoblox_url | ❌ | Not configured |
| Huawei NAC | huawei_nac_url | ❌ | Not configured |
| Firewall API | (no config) | ❌ | Logs via Wazuh only |

---

## 5. Gap vs DFIR-IRIS Direct UI

### Missing from SOC Center vs IRIS UI

| Feature | IRIS UI | SOC Center |
|---------|---------|-----------|
| Alert detail drawer | ✅ | ❌ |
| Alert bulk operations | ✅ | Partial |
| Case Tasks management | ✅ | ❌ |
| Case Assets management | ✅ | ❌ |
| Case Evidence (files) | ✅ | ❌ (metadata only) |
| Case report generation | ✅ | ❌ |
| Case closure checklist | Manual | ❌ |
| Playbook templates | Via templates | ❌ |
| MISP push (write) | ✅ | ❌ |
| IOC enrichment embedded | ✅ | Partial |
| Full case workspace page | ✅ | ❌ |
| Activity/Audit log | ✅ | ❌ |

---

## 6. Gap vs NIST Incident Response

### NIST SP 800-61r3 Phases

| Phase | Required Capability | SOC Center |
|-------|--------------------|----|
| **Preparation** | Playbook templates, Asset inventory | ❌ Playbooks missing |
| **Detection & Analysis** | Alert triage, IOC check, MISP search | ✅ Partial |
| | Timeline reconstruction | ✅ |
| | Asset identification | ❌ |
| | Evidence collection | ❌ |
| **Containment** | Block IP (SIMULATION ONLY now) | ✅ Simulation |
| | NAC quarantine | ❌ |
| | Firewall rule | ❌ (future) |
| **Eradication** | Task tracking | ❌ |
| | Remediation verification | ❌ |
| **Recovery** | Asset re-verification | ❌ |
| | System restoration notes | Partial (notes) |
| **Post-Incident** | Report generation | ❌ |
| | Lessons learned | ❌ |
| | Case closure checklist | ❌ |

---

## 7. Gap vs MITRE ATT&CK Data Sources

| Data Source | Status |
|-------------|--------|
| Domain Name (DNS) | ⚠️ Via Infoblox (not configured) |
| Firewall | ⚠️ Logs via Wazuh; no API |
| Network Traffic | ✅ Via OpenSearch/Wazuh |
| Logon Session | ✅ Via Wazuh |
| User Account | ✅ Via Wazuh |
| Asset | ⚠️ Via Wazuh agents; no CMDB |
| Process | ✅ Via Wazuh |
| File | ✅ Via Wazuh FIM |
| Network Device (NAC) | ⚠️ Via Huawei NAC (not configured) |

---

## 8. Safety Considerations

### Block IP Safety Rules (IMMUTABLE)
1. ALL block actions default to `simulation=true, dry_run=true`
2. Backend: if `type=="block"` AND `simulation OR dry_run` → return simulation result, NO real call
3. UI: must display "SIMULATION ONLY" badge clearly
4. No production firewall change until: approval workflow + verified integration + explicit flag

### Destructive Action Policy
| Action | Requires |
|--------|---------|
| Close Case | Confirm button |
| Delete Task | Confirm dialog |
| Block IP | Simulation mode + confirm |
| Push IOC to MISP | Confirm + result feedback |
| Wazuh Active Response | NOT ENABLED — future only |

---

## 9. Implementation Roadmap

### Phase 1: Foundation & Safety (DONE in this PR)
- Backend: `/soar/health`, `/soar/integrations`
- DB models: CaseTask, CaseEvidence, CaseActivityLog, ShuffleActionHistory
- Frontend: IntegrationHealthPanel, update SOARPage

### Phase 2: Alert Operations (DONE in this PR)
- AlertDetailDrawer with full operations
- Bulk alert actions

### Phase 3: Case Workspace (DONE in this PR)
- CaseDetailDrawer expansion: Tasks, Evidence, Shuffle, Activity, Report, Closure tabs
- Local activity log

### Phase 4: Tasks & Playbooks (DONE in this PR)
- TasksPanel with CRUD
- Playbook templates (Thai)
- 8 IR scenario templates

### Phases 5–6: IOC Management, Assets
- IOC enrich + MISP search embedded in drawer
- Asset panel from Wazuh agents

### Phases 7–8: Evidence, Shuffle Actions
- EvidencePanel (metadata only, no file upload)
- ShuffleActionsPanel with full history

### Phases 9–10: MISP Workbench, Report/Closure
- MISP tab enhancement
- Report generator (Markdown/JSON)
- Closure checklist

### Phase 11: Full Case Page
- `/soar/cases/:caseId` route
- Reuse all drawer panels

### Phase 12: Log Source Expansion (Guide)
- Infoblox, Huawei NAC, Firewall integration guides

### Phase 13: QA & Final Docs
- Build verification
- Security review
- Complete docs

---

## 10. Test Checklist

### Integration Tests
- [ ] IRIS online → health shows "connected"
- [ ] IRIS offline → health shows "error", page not crash
- [ ] Shuffle offline → health shows "not_configured" or "error"
- [ ] MISP offline → health shows "error"

### Alert Operations
- [ ] Click alert row → detail drawer opens
- [ ] Update alert status
- [ ] Update alert severity
- [ ] Add alert note
- [ ] Escalate alert → creates IRIS case
- [ ] Open Investigate V2 from alert IOC
- [ ] Search MISP from alert IOC

### Case Operations
- [ ] Create case
- [ ] Add note
- [ ] Add IOC
- [ ] Add timeline event
- [ ] Add task + update status
- [ ] Apply playbook template
- [ ] Close case + confirm
- [ ] Reopen case

### Safety Tests
- [ ] Block IP button shows "SIMULATION ONLY"
- [ ] Simulate block → no real firewall call
- [ ] Backend returns mode=simulation
- [ ] IRIS audit note created after simulation

---

## 11. Schema: Local DB Extensions

```sql
-- Case Tasks (local, linked to iris_case_id)
CREATE TABLE case_tasks (
  id INTEGER PRIMARY KEY,
  iris_case_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'todo',  -- todo/in_progress/done/blocked
  priority TEXT DEFAULT 'medium', -- low/medium/high/critical
  assignee TEXT,
  due_date DATETIME,
  tags TEXT,
  template_id TEXT,
  created_by TEXT,
  created_at DATETIME,
  updated_at DATETIME
);

-- Case Evidence (metadata only)
CREATE TABLE case_evidence (
  id INTEGER PRIMARY KEY,
  iris_case_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  source TEXT,  -- wazuh/opensearch/investigate/ioc/misp/shuffle/manual
  ev_type TEXT, -- json/text/screenshot/file_metadata/report
  sha256 TEXT,
  content_preview TEXT,
  raw_json TEXT,
  created_by TEXT,
  created_at DATETIME,
  linked_task_id INTEGER,
  linked_timeline_id INTEGER
);

-- Case Activity Log
CREATE TABLE case_activity_log (
  id INTEGER PRIMARY KEY,
  iris_case_id INTEGER NOT NULL,
  action TEXT NOT NULL,
  detail TEXT,
  user_id INTEGER,
  username TEXT,
  created_at DATETIME
);

-- Shuffle Action History
CREATE TABLE shuffle_action_history (
  id INTEGER PRIMARY KEY,
  iris_case_id INTEGER,
  action_type TEXT,  -- block/escalate/triage/notify/collect
  payload_summary TEXT,
  execution_id TEXT,
  response_mode TEXT,  -- simulation/live
  response_ok BOOLEAN,
  response_detail TEXT,
  created_by TEXT,
  created_at DATETIME
);
```
