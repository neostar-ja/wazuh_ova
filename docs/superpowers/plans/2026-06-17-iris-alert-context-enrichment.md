# IRIS Alert Context Enrichment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the IRIS alert detail drawer so it reads the correct IRIS detail payload and enriches it with real Wazuh/OpenSearch context instead of showing incomplete placeholder data.

**Architecture:** Keep the detail contract server-side. The backend will normalize the list-shaped IRIS detail response, correlate the alert back to OpenSearch using `alert_source_link`, `alert_source_ref`, IOC, and `alert_source_event_time`, and return a single enriched payload. The frontend drawer will render that enriched payload directly and keep the existing update/escalate actions.

**Tech Stack:** FastAPI, Python unittest, OpenSearch service helpers, React, TypeScript, MUI, TanStack Query

---

### Task 1: Normalize IRIS alert detail and enrich it with source context

**Files:**
- Modify: `/opt/code/wazuh_ova/web_app/backend/tests/test_soar_service.py`
- Modify: `/opt/code/wazuh_ova/web_app/backend/app/services/opensearch_service.py`
- Modify: `/opt/code/wazuh_ova/web_app/backend/app/services/soar_svc.py`
- Modify: `/opt/code/wazuh_ova/web_app/backend/app/routers/soar.py`

- [ ] **Step 1: Write the failing backend tests**

```python
class SoarServiceAlertDetailTests(unittest.IsolatedAsyncioTestCase):
    def test_extract_iris_alert_detail_returns_first_alert(self):
        payload = {"data": {"alerts": [{"alert_id": 99, "alert_title": "Test"}]}}
        self.assertEqual(soar_svc.extract_iris_alert_detail(payload)["alert_id"], 99)

    def test_extract_iris_alert_detail_returns_empty_dict_for_missing_alerts(self):
        self.assertEqual(soar_svc.extract_iris_alert_detail({"data": {"alerts": []}}), {})

    async def test_get_iris_alert_detail_enriches_wazuh_context(self):
        iris_payload = {
            "status": "success",
            "data": {
                "alerts": [{
                    "alert_id": 42,
                    "alert_title": "Matched alert",
                    "alert_source_link": "https://10.251.151.14/app/wazuh",
                    "alert_source_ref": "100300",
                    "alert_source_event_time": "2026-06-17T01:22:49.939000",
                    "iocs": [{"ioc_value": "80.82.77.202"}],
                }]
            },
        }
        matched_event = {
            "@timestamp": "2026-06-17T01:22:50.000Z",
            "rule": {"id": "100300", "level": 10, "description": "Rule match", "groups": ["threat_intel"]},
            "agent": {"name": "wazuh-worker"},
            "data": {"srcip": "80.82.77.202"},
            "full_log": "full log",
        }

        with (
            patch.object(soar_svc, "_iris_get", new=AsyncMock(return_value=iris_payload)),
            patch.object(opensearch_service, "search_alert_context_candidates", new=AsyncMock(return_value=[matched_event])),
        ):
            result = await soar_svc.get_iris_alert_detail(42)

        self.assertEqual(result["data"]["alert"]["alert_id"], 42)
        self.assertEqual(result["data"]["source_context"]["status"], "matched")
        self.assertEqual(result["data"]["wazuh_context"]["summary"]["rule_id"], "100300")

    async def test_get_iris_alert_detail_returns_not_found_when_no_wazuh_match(self):
        iris_payload = {
            "status": "success",
            "data": {"alerts": [{"alert_id": 7, "alert_source_link": "https://10.251.151.14/app/wazuh"}]},
        }
        with (
            patch.object(soar_svc, "_iris_get", new=AsyncMock(return_value=iris_payload)),
            patch.object(opensearch_service, "search_alert_context_candidates", new=AsyncMock(return_value=[])),
        ):
            result = await soar_svc.get_iris_alert_detail(7)

        self.assertEqual(result["data"]["source_context"]["status"], "not_found")
        self.assertIsNone(result["data"]["wazuh_context"]["primary_event"])
```

- [ ] **Step 2: Run the backend tests to verify they fail**

Run: `cd /opt/code/wazuh_ova/web_app/backend && python3 -m unittest tests.test_soar_service -v`
Expected: FAIL with missing `extract_iris_alert_detail`, missing `get_iris_alert_detail`, or missing `search_alert_context_candidates`

- [ ] **Step 3: Write the minimal backend implementation**

```python
# app/services/opensearch_service.py
async def search_alert_context_candidates(rule_id: str | None, event_time: str | None, ioc_value: str | None, size: int = 8) -> list[dict]:
    ...

# app/services/soar_svc.py
def extract_iris_alert_detail(payload: object) -> dict:
    ...

async def get_iris_alert_detail(alert_id: int) -> dict:
    raw = await _iris_get(f"/alerts/filter?alert_id={alert_id}")
    alert = extract_iris_alert_detail(raw)
    ...
    return {
        "status": raw.get("status", "success"),
        "message": raw.get("message", ""),
        "data": {
            "alert": alert,
            "source_context": source_context,
            "wazuh_context": wazuh_context,
        },
    }

# app/routers/soar.py
@router.get("/iris/alerts/{alert_id}")
async def iris_alert_detail(alert_id: int, _=Depends(get_current_user)):
    return await get_iris_alert_detail(alert_id)
```

- [ ] **Step 4: Run the backend tests to verify they pass**

Run: `cd /opt/code/wazuh_ova/web_app/backend && python3 -m unittest tests.test_soar_service -v`
Expected: PASS for the new alert-detail tests and the existing case-state tests

- [ ] **Step 5: Commit the backend detail enrichment**

```bash
cd /opt/code/wazuh_ova
git add web_app/backend/tests/test_soar_service.py web_app/backend/app/services/opensearch_service.py web_app/backend/app/services/soar_svc.py web_app/backend/app/routers/soar.py
git commit -m "feat: enrich IRIS alert detail with Wazuh context"
```

### Task 2: Update the React drawer to consume the enriched payload

**Files:**
- Modify: `/opt/code/wazuh_ova/web_app/frontend/src/services/soarApi.ts`
- Modify: `/opt/code/wazuh_ova/web_app/frontend/src/components/soar/iris/AlertDetailDrawer.tsx`

- [ ] **Step 1: Add the failing frontend shape assumptions in code**

```ts
export interface IrisAlertDetailResponse {
  status: string
  message?: string
  data: {
    alert: IrisAlert | null
    source_context: IrisAlertSourceContext
    wazuh_context: IrisAlertWazuhContext
  }
}
```

The failure here is practical rather than test-run based: the current drawer reads `resp?.data` as the alert object, but the enriched API will return `resp.data.alert`. Keep this contract mismatch explicit while editing.

- [ ] **Step 2: Run a build to verify the current frontend contract is still broken**

Run: `cd /opt/code/wazuh_ova/web_app/frontend && npm run build`
Expected: Either PASS before edits with a still-broken runtime drawer, or FAIL after type additions until the drawer is updated to the new contract

- [ ] **Step 3: Write the minimal frontend implementation**

```tsx
const { data: resp, isLoading } = useQuery({
  queryKey: ['alert-detail', alertId],
  queryFn: () => soarApi.getIrisAlert(alertId!).then(r => r.data),
  enabled: open && !!alertId,
})

const alert = resp?.data?.alert ?? null
const sourceContext = resp?.data?.source_context ?? null
const wazuhContext = resp?.data?.wazuh_context ?? null
```

Render additions:

```tsx
<SectionLabel>SOURCE CONTEXT</SectionLabel>
<Typography>{sourceContext?.status ?? 'unknown'}</Typography>

<SectionLabel>WAZUH EVENT CONTEXT</SectionLabel>
<Typography>{wazuhContext?.summary?.rule_id ?? '—'}</Typography>
<Typography>{wazuhContext?.primary_event?.full_log ?? '—'}</Typography>
```

Remove misleading static-only behavior where real source context should be shown, but keep the existing `SIMULATION ONLY` notice for firewall/block actions.

- [ ] **Step 4: Run the frontend build to verify it passes**

Run: `cd /opt/code/wazuh_ova/web_app/frontend && npm run build`
Expected: PASS

- [ ] **Step 5: Commit the frontend drawer update**

```bash
cd /opt/code/wazuh_ova
git add web_app/frontend/src/services/soarApi.ts web_app/frontend/src/components/soar/iris/AlertDetailDrawer.tsx
git commit -m "feat: render enriched IRIS alert detail drawer"
```

### Task 3: Final verification of the complete flow

**Files:**
- No new code changes expected

- [ ] **Step 1: Run backend verification**

Run: `cd /opt/code/wazuh_ova/web_app/backend && python3 -m unittest tests.test_soar_service -v`
Expected: PASS

- [ ] **Step 2: Run frontend verification**

Run: `cd /opt/code/wazuh_ova/web_app/frontend && npm run build`
Expected: PASS

- [ ] **Step 3: Check the changed files**

Run: `cd /opt/code/wazuh_ova && git diff -- web_app/backend/app/services/soar_svc.py web_app/backend/app/services/opensearch_service.py web_app/backend/app/routers/soar.py web_app/frontend/src/services/soarApi.ts web_app/frontend/src/components/soar/iris/AlertDetailDrawer.tsx web_app/backend/tests/test_soar_service.py`
Expected: Only the planned enrichment and drawer changes appear

- [ ] **Step 4: Commit any final polish if needed**

```bash
cd /opt/code/wazuh_ova
git add web_app/backend/tests/test_soar_service.py web_app/backend/app/services/opensearch_service.py web_app/backend/app/services/soar_svc.py web_app/backend/app/routers/soar.py web_app/frontend/src/services/soarApi.ts web_app/frontend/src/components/soar/iris/AlertDetailDrawer.tsx
git commit -m "chore: finalize IRIS alert context enrichment"
```
