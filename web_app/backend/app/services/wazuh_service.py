import httpx
from ..core.config import settings

BASE = f"https://{settings.wazuh_api_host}:{settings.wazuh_api_port}"


async def get_token() -> str:
    async with httpx.AsyncClient(verify=False, timeout=10) as c:
        r = await c.post(
            f"{BASE}/security/user/authenticate",
            auth=(settings.wazuh_api_user, settings.wazuh_api_pass),
        )
        return r.json()["data"]["token"]


async def wazuh_get(path: str) -> dict:
    token = await get_token()
    async with httpx.AsyncClient(verify=False, timeout=30) as c:
        r = await c.get(f"{BASE}{path}", headers={"Authorization": f"Bearer {token}"})
        return r.json()


async def wazuh_put(path: str, data: str) -> dict:
    token = await get_token()
    async with httpx.AsyncClient(verify=False, timeout=30) as c:
        r = await c.put(
            f"{BASE}{path}",
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/xml"},
            content=data.encode(),
        )
        return r.json()


async def get_agents():
    return await wazuh_get("/agents?limit=100")


async def get_rules_files():
    return await wazuh_get("/rules/files?limit=500")


async def get_rule_file(filename: str) -> str:
    token = await get_token()
    async with httpx.AsyncClient(verify=False, timeout=30) as c:
        r = await c.get(
            f"{BASE}/rules/files/{filename}?raw=true",
            headers={"Authorization": f"Bearer {token}"},
        )
        # ?raw=true returns XML text directly (Content-Type: application/xml or text/xml)
        ct = r.headers.get("content-type", "")
        if r.status_code == 200 and ("xml" in ct or "text" in ct):
            return r.text
        # Fallback: JSON response with error
        try:
            return r.json().get("data", {}).get("affected_items", [{}])[0].get("content", "")
        except Exception:
            return r.text


async def put_rule_file(filename: str, content: str) -> dict:
    return await wazuh_put(f"/rules/files/{filename}", content)


async def restart_manager() -> dict:
    token = await get_token()
    async with httpx.AsyncClient(verify=False, timeout=60) as c:
        r = await c.put(
            f"{BASE}/manager/restart",
            headers={"Authorization": f"Bearer {token}"},
        )
        return r.json()


async def get_cluster_health():
    return await wazuh_get("/cluster/healthcheck")


async def get_sca_results(agent_id: str = "000"):
    return await wazuh_get(f"/sca/{agent_id}?limit=100")


async def get_vulnerabilities(agent_id: str = "000"):
    """Query OpenSearch vulnerability index (Wazuh API /vulnerability endpoint removed in 4.x)."""
    from opensearchpy import OpenSearch
    from ..core.config import settings
    client = OpenSearch(
        hosts=[{"host": settings.opensearch_host, "port": settings.opensearch_port}],
        http_auth=(settings.opensearch_user, settings.opensearch_pass),
        use_ssl=True, verify_certs=settings.opensearch_verify_ssl, ssl_show_warn=False, timeout=20,
    )
    try:
        body = {
            "size": 200,
            "query": {"term": {"agent.id": agent_id}},
            "_source": ["agent", "package", "vulnerability", "host"],
        }
        resp = client.search(index="wazuh-states-vulnerabilities-wazuh", body=body)
        items = []
        for hit in resp.get("hits", {}).get("hits", []):
            src = hit["_source"]
            vuln = src.get("vulnerability") or {}
            pkg  = src.get("package") or {}
            score = vuln.get("score") or {}
            items.append({
                "agent":   src.get("agent") or {},
                "cve":     vuln.get("id") or vuln.get("cve") or "-",
                "severity": vuln.get("severity") or "unknown",
                "name":    pkg.get("name") or "-",
                "version": pkg.get("version") or "-",
                "score":   {"base": score.get("base"), "version": score.get("version")},
                "detected_at": vuln.get("detected_at"),
                "status":  "open",
            })
        return {"data": {"affected_items": items, "total_affected_items": len(items), "total_failed_items": 0, "failed_items": []}, "error": 0}
    except Exception:
        return {"data": {"affected_items": [], "total_affected_items": 0, "total_failed_items": 0, "failed_items": []}, "error": 1}


# ─── Decoders ────────────────────────────────────────────────────────────────

async def get_decoders_files():
    return await wazuh_get("/decoders/files?limit=500")


async def get_decoder_file(filename: str) -> str:
    token = await get_token()
    async with httpx.AsyncClient(verify=False, timeout=30) as c:
        r = await c.get(
            f"{BASE}/decoders/files/{filename}?raw=true",
            headers={"Authorization": f"Bearer {token}"},
        )
        ct = r.headers.get("content-type", "")
        if r.status_code == 200 and ("xml" in ct or "text" in ct):
            return r.text
        try:
            return r.json().get("data", {}).get("affected_items", [{}])[0].get("content", "")
        except Exception:
            return r.text


async def put_decoder_file(filename: str, content: str) -> dict:
    return await wazuh_put(f"/decoders/files/{filename}", content)


# ─── CDB Lists ────────────────────────────────────────────────────────────────

async def get_lists_files():
    return await wazuh_get("/lists/files?limit=500")


async def get_list_file(filename: str) -> str:
    token = await get_token()
    async with httpx.AsyncClient(verify=False, timeout=30) as c:
        r = await c.get(
            f"{BASE}/lists/files/{filename}?raw=true",
            headers={"Authorization": f"Bearer {token}"},
        )
        return r.text


async def put_list_file(filename: str, content: str) -> dict:
    token = await get_token()
    async with httpx.AsyncClient(verify=False, timeout=30) as c:
        r = await c.put(
            f"{BASE}/lists/files/{filename}?overwrite=true",
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/octet-stream"},
            content=content.encode(),
        )
        data = r.json()
        if data.get("error"):
            failed = data.get("data", {}).get("failed_items", [])
            detail = data.get("message") or "Could not upload CDB list file"
            if failed:
                detail = failed[0].get("error", {}).get("message", detail)
            raise RuntimeError(detail)
        return data


# ─── Manager Config ───────────────────────────────────────────────────────────

async def get_manager_config_raw() -> str:
    token = await get_token()
    async with httpx.AsyncClient(verify=False, timeout=30) as c:
        r = await c.get(
            f"{BASE}/manager/configuration?raw=true",
            headers={"Authorization": f"Bearer {token}"},
        )
        return r.text


async def put_manager_config(content: str) -> dict:
    return await wazuh_put("/manager/configuration", content)


# ─── Manager Status & Info ────────────────────────────────────────────────────

async def get_manager_status() -> dict:
    return await wazuh_get("/manager/status")


async def get_manager_info() -> dict:
    return await wazuh_get("/manager/info")


async def get_agents_summary() -> dict:
    return await wazuh_get("/agents/summary/status")
