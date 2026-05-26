from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from typing import Optional
import asyncio

from ..routers.auth import get_current_user
from ..services.soar_svc import (
    get_iris_stats, get_iris_alerts, get_iris_cases, create_iris_alert,
    get_shuffle_workflows, get_shuffle_stats, trigger_shuffle_webhook,
    search_misp_ioc, get_misp_stats,
)
from ..core.config import settings

router = APIRouter(prefix="/soar", tags=["soar"])


class CreateAlertBody(BaseModel):
    title: str
    description: str
    severity_id: int = 2
    tags: str = ""
    ioc_value: Optional[str] = None


class TriggerBody(BaseModel):
    type: str  # "block" | "escalate" | "triage"
    ip: Optional[str] = None
    case_id: Optional[int] = None
    analyst: Optional[str] = None
    reason: Optional[str] = None
    title: Optional[str] = None


@router.get("/stats")
async def soar_stats(_=Depends(get_current_user)):
    """Returns IRIS + Shuffle stats fast. MISP stats are loaded separately via /misp/stats."""
    results = await asyncio.gather(
        get_iris_stats(),
        get_shuffle_stats(),
        return_exceptions=True,
    )
    def _safe(r: object) -> dict:
        if isinstance(r, Exception):
            return {"connected": False, "error": str(r)}
        return r  # type: ignore[return-value]
    iris, shuffle = [_safe(r) for r in results]
    return {"iris": iris, "shuffle": shuffle}


# ── IRIS ──────────────────────────────────────────────────────────────────────

@router.get("/iris/alerts")
async def iris_alerts(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    status_id: Optional[int] = None,
    _=Depends(get_current_user),
):
    return await get_iris_alerts(page=page, per_page=per_page, status_id=status_id)


@router.get("/iris/cases")
async def iris_cases(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    _=Depends(get_current_user),
):
    return await get_iris_cases(page=page, per_page=per_page)


@router.post("/iris/alerts")
async def iris_create_alert(body: CreateAlertBody, _=Depends(get_current_user)):
    return await create_iris_alert(
        title=body.title,
        description=body.description,
        severity_id=body.severity_id,
        tags=body.tags,
        ioc_value=body.ioc_value,
    )


# ── Shuffle ───────────────────────────────────────────────────────────────────

@router.get("/shuffle/workflows")
async def shuffle_workflows(_=Depends(get_current_user)):
    return await get_shuffle_workflows()


@router.post("/shuffle/trigger")
async def shuffle_trigger(body: TriggerBody, _=Depends(get_current_user)):
    url_map = {
        "block": settings.shuffle_block_url,
        "escalate": settings.shuffle_esc_url,
        "triage": settings.shuffle_webhook_url,
    }
    url = url_map.get(body.type, settings.shuffle_webhook_url)
    payload = {
        "type": body.type,
        "ip": body.ip,
        "case_id": body.case_id,
        "analyst": body.analyst,
        "reason": body.reason or body.title,
    }
    return await trigger_shuffle_webhook(url, payload)


# ── MISP ──────────────────────────────────────────────────────────────────────

@router.get("/misp/stats")
async def misp_stats(_=Depends(get_current_user)):
    return await get_misp_stats()


@router.get("/misp/search")
async def misp_search(
    q: str = Query(..., min_length=1),
    type: Optional[str] = None,
    _=Depends(get_current_user),
):
    return await search_misp_ioc(value=q, ioc_type=type)
