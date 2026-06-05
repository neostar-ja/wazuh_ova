import asyncio
import base64
import json
import time

import httpx
from ..core.config import settings

BASE = f"https://{settings.wazuh_api_host}:{settings.wazuh_api_port}"
VERIFY_SSL = settings.wazuh_verify_ssl
_TOKEN_CACHE: str | None = None
_TOKEN_EXPIRES_AT = 0.0
_TOKEN_LOCK = asyncio.Lock()


def _decode_token_expiry(token: str) -> float:
    try:
        payload = token.split(".")[1]
        payload += "=" * (-len(payload) % 4)
        data = json.loads(base64.urlsafe_b64decode(payload).decode("utf-8"))
        return float(data.get("exp", 0))
    except Exception:
        return 0.0


def _client(timeout_seconds: float) -> httpx.AsyncClient:
    return httpx.AsyncClient(
        verify=VERIFY_SSL,
        timeout=httpx.Timeout(timeout_seconds, connect=min(timeout_seconds, 5.0)),
    )


async def _request_token() -> str:
    async with _client(10) as c:
        r = await c.post(
            f"{BASE}/security/user/authenticate",
            auth=(settings.wazuh_api_user, settings.wazuh_api_pass),
        )
        r.raise_for_status()
        token = r.json().get("data", {}).get("token")
        if not token:
            raise RuntimeError("Wazuh authentication succeeded but no token was returned")
        return token


async def get_token(force_refresh: bool = False) -> str:
    global _TOKEN_CACHE, _TOKEN_EXPIRES_AT
    now = time.time()
    if not force_refresh and _TOKEN_CACHE and now < (_TOKEN_EXPIRES_AT - 30):
        return _TOKEN_CACHE

    async with _TOKEN_LOCK:
        now = time.time()
        if not force_refresh and _TOKEN_CACHE and now < (_TOKEN_EXPIRES_AT - 30):
            return _TOKEN_CACHE

        token = await _request_token()
        _TOKEN_CACHE = token
        _TOKEN_EXPIRES_AT = _decode_token_expiry(token) or (now + 300)
        return token


async def wazuh_get(path: str) -> dict:
    token = await get_token()
    async with _client(30) as c:
        r = await c.get(f"{BASE}{path}", headers={"Authorization": f"Bearer {token}"})
        if r.status_code == 401:
            token = await get_token(force_refresh=True)
            r = await c.get(f"{BASE}{path}", headers={"Authorization": f"Bearer {token}"})
        r.raise_for_status()
        return r.json()


async def wazuh_put(path: str, data: str) -> dict:
    token = await get_token()
    async with _client(30) as c:
        r = await c.put(
            f"{BASE}{path}",
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/xml"},
            content=data.encode(),
        )
        if r.status_code == 401:
            token = await get_token(force_refresh=True)
            r = await c.put(
                f"{BASE}{path}",
                headers={"Authorization": f"Bearer {token}", "Content-Type": "application/xml"},
                content=data.encode(),
            )
        r.raise_for_status()
        return r.json()


async def get_agents():
    return await wazuh_get("/agents?limit=100")


async def get_rules_files():
    return await wazuh_get("/rules/files?limit=500")


async def get_rule_file(filename: str) -> str:
    token = await get_token()
    async with _client(30) as c:
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
    async with _client(60) as c:
        r = await c.put(
            f"{BASE}/manager/restart",
            headers={"Authorization": f"Bearer {token}"},
        )
        r.raise_for_status()
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
        resp = await asyncio.to_thread(client.search, index="wazuh-states-vulnerabilities-wazuh", body=body)
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
    async with _client(30) as c:
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
    async with _client(30) as c:
        r = await c.get(
            f"{BASE}/lists/files/{filename}?raw=true",
            headers={"Authorization": f"Bearer {token}"},
        )
        return r.text


async def put_list_file(filename: str, content: str) -> dict:
    token = await get_token()
    async with _client(30) as c:
        r = await c.put(
            f"{BASE}/lists/files/{filename}?overwrite=true",
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/octet-stream"},
            content=content.encode(),
        )
        r.raise_for_status()
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
    async with _client(30) as c:
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
