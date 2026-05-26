"""SOAR Integration Service — Shuffle SOAR, DFIR-IRIS, MISP"""
import asyncio
import logging
from typing import Optional

import httpx

from ..core.config import settings

logger = logging.getLogger(__name__)

_SSL = False  # all SOAR services use self-signed certs
_TIMEOUT = 15


def _iris_headers() -> dict:
    return {"Authorization": f"Bearer {settings.iris_api_key}", "Content-Type": "application/json"}


def _misp_headers() -> dict:
    return {
        "Authorization": settings.misp_api_key,
        "Accept": "application/json",
        "Content-Type": "application/json",
    }


def _shuffle_headers() -> dict:
    return {"Authorization": f"Bearer {settings.shuffle_token}"}


# ── DFIR-IRIS ──────────────────────────────────────────────────────────────────
# IRIS 2.4.x API paths (not /api/v2): /alerts/filter, /manage/cases/list, /alerts/add

async def _iris_get(path: str) -> dict:
    if not settings.iris_url or not settings.iris_api_key:
        return {"error": "IRIS not configured"}
    try:
        async with httpx.AsyncClient(verify=_SSL, timeout=_TIMEOUT) as c:
            r = await c.get(f"{settings.iris_url}{path}", headers=_iris_headers())
            return r.json()
    except Exception as e:
        logger.error("IRIS GET %s: %s", path, e)
        return {"error": str(e)}


async def _iris_post(path: str, data: dict) -> dict:
    if not settings.iris_url or not settings.iris_api_key:
        return {"error": "IRIS not configured"}
    try:
        async with httpx.AsyncClient(verify=_SSL, timeout=_TIMEOUT) as c:
            r = await c.post(f"{settings.iris_url}{path}", headers=_iris_headers(), json=data)
            return r.json()
    except Exception as e:
        logger.error("IRIS POST %s: %s", path, e)
        return {"error": str(e)}


async def get_iris_stats() -> dict:
    try:
        alerts_resp, cases_resp = await asyncio.gather(
            _iris_get("/alerts/filter"),
            _iris_get("/manage/cases/list"),
        )
        if "error" in alerts_resp:
            return {"connected": False, "error": alerts_resp["error"]}
        total = alerts_resp.get("data", {}).get("total", 0)
        # count open alerts (status_id=2 = New)
        open_alerts = sum(
            1 for a in alerts_resp.get("data", {}).get("alerts", [])
            if a.get("status", {}).get("status_id") in (2, 3)
        )
        total_cases = len(cases_resp.get("data", [])) if "data" in cases_resp else 0
        return {
            "connected": True,
            "total_alerts": total,
            "open_alerts": open_alerts,
            "total_cases": total_cases,
            "iris_url": settings.iris_url,
        }
    except Exception as e:
        return {"connected": False, "error": str(e)}


async def get_iris_alerts(page: int = 1, per_page: int = 20, status_id: Optional[int] = None) -> dict:
    params = f"?page={page}&per_page={per_page}"
    if status_id:
        params += f"&alert_status_id={status_id}"
    return await _iris_get(f"/alerts/filter{params}")


async def get_iris_cases(page: int = 1, per_page: int = 20) -> dict:
    return await _iris_get("/manage/cases/list")


async def create_iris_alert(
    title: str,
    description: str,
    severity_id: int = 2,
    tags: str = "",
    ioc_value: Optional[str] = None,
) -> dict:
    body: dict = {
        "alert_title": title,
        "alert_description": description,
        "alert_source": "SOC Web App",
        "alert_severity_id": severity_id,
        "alert_status_id": 2,
        "alert_customer_id": int(settings.iris_customer_id or 1),
        "alert_tags": tags,
    }
    if ioc_value:
        body["alert_iocs"] = [
            {"ioc_value": ioc_value, "ioc_description": "From SOC Web App", "ioc_tlp_id": 2, "ioc_type_id": 76}
        ]
    return await _iris_post("/alerts/add", body)


# ── Shuffle SOAR ───────────────────────────────────────────────────────────────

async def _shuffle_get(path: str) -> dict:
    if not settings.shuffle_url or not settings.shuffle_token:
        return {"error": "Shuffle not configured"}
    try:
        async with httpx.AsyncClient(verify=_SSL, timeout=_TIMEOUT) as c:
            r = await c.get(f"{settings.shuffle_url}{path}", headers=_shuffle_headers())
            return r.json()
    except Exception as e:
        logger.error("Shuffle GET %s: %s", path, e)
        return {"error": str(e)}


async def get_shuffle_workflows() -> list:
    data = await _shuffle_get("/api/v1/workflows")
    if isinstance(data, list):
        return data
    if "error" in data:
        return []
    return data.get("workflows", [])


async def get_shuffle_stats() -> dict:
    try:
        wfs = await get_shuffle_workflows()
        return {
            "connected": True,
            "total_workflows": len(wfs),
            "shuffle_url": settings.shuffle_url,
        }
    except Exception as e:
        return {"connected": False, "error": str(e)}


async def trigger_shuffle_webhook(url: str, payload: dict) -> dict:
    if not url:
        return {"error": "Webhook URL not configured"}
    try:
        async with httpx.AsyncClient(verify=_SSL, timeout=_TIMEOUT) as c:
            r = await c.post(url, json={"execution_argument": payload, "start": ""})
            return {"status": r.status_code, "ok": r.status_code < 400, "body": r.text[:200]}
    except Exception as e:
        return {"error": str(e)}


# ── MISP ───────────────────────────────────────────────────────────────────────

async def _misp_get(path: str, timeout: int = 90) -> dict:
    if not settings.misp_url or not settings.misp_api_key:
        return {"error": "MISP not configured"}
    try:
        async with httpx.AsyncClient(verify=_SSL, timeout=timeout) as c:
            r = await c.get(f"{settings.misp_url}{path}", headers=_misp_headers())
            return r.json()
    except Exception as e:
        logger.error("MISP GET %s: %s", path, e)
        return {"error": str(e)}


async def _misp_post(path: str, data: dict, timeout: int = 30) -> dict:
    if not settings.misp_url or not settings.misp_api_key:
        return {"error": "MISP not configured"}
    try:
        async with httpx.AsyncClient(verify=_SSL, timeout=timeout) as c:
            r = await c.post(f"{settings.misp_url}{path}", headers=_misp_headers(), json=data)
            return r.json()
    except Exception as e:
        logger.error("MISP POST %s: %s", path, e)
        return {"error": str(e)}


async def get_misp_stats() -> dict:
    try:
        raw = await _misp_get("/attributes/attributeStatistics")
        if isinstance(raw, dict) and "error" in raw:
            return {"connected": False, "error": raw["error"]}
        stats: dict = {}
        if isinstance(raw, list):
            for item in raw:
                stats.update(item)
        elif isinstance(raw, dict):
            stats = raw
        total = sum(int(v) for v in stats.values() if str(v).isdigit())
        top5 = dict(sorted(stats.items(), key=lambda x: -int(x[1]) if str(x[1]).isdigit() else 0)[:5])
        return {"connected": True, "total_iocs": total, "by_type": top5, "misp_url": settings.misp_url}
    except Exception as e:
        return {"connected": False, "error": str(e)}


async def search_misp_ioc(value: str, ioc_type: Optional[str] = None) -> dict:
    body: dict = {"returnFormat": "json", "value": value, "enforceWarninglist": 1, "limit": 50}
    if ioc_type:
        body["type"] = ioc_type
    return await _misp_post("/attributes/restSearch", body)
