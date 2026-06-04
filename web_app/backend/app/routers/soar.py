from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from typing import Optional, List
import asyncio

from ..routers.auth import get_current_user
from ..services.soar_svc import (
    get_iris_stats, get_iris_alerts, get_iris_alert, get_iris_cases, get_iris_case,
    create_iris_alert, update_iris_alert, escalate_iris_alerts,
    create_iris_case, update_iris_case, close_iris_case, reopen_iris_case,
    get_case_note_groups, add_case_note_group, add_case_note,
    get_case_iocs, add_case_ioc,
    get_case_timeline, add_case_timeline_event,
    get_shuffle_workflows, get_shuffle_stats, trigger_shuffle_webhook,
    search_misp_ioc, get_misp_stats,
)
from ..core.config import settings

router = APIRouter(prefix="/soar", tags=["soar"])


# ── Request models ─────────────────────────────────────────────────────────────

class CreateAlertBody(BaseModel):
    title: str
    description: str
    severity_id: int = 2
    tags: str = ""
    ioc_value: Optional[str] = None


class UpdateAlertBody(BaseModel):
    alert_status_id: Optional[int] = None
    alert_severity_id: Optional[int] = None
    alert_note: Optional[str] = None


class EscalateAlertBody(BaseModel):
    alert_ids: List[int]
    case_title: str
    note: str = ""


class CreateCaseBody(BaseModel):
    case_name: str
    case_description: str = ""
    customer_id: int = 1


class UpdateCaseBody(BaseModel):
    case_name: Optional[str] = None
    case_description: Optional[str] = None


class AddNoteBody(BaseModel):
    title: str
    content: str
    group_id: Optional[int] = None
    group_title: Optional[str] = None


class AddIocBody(BaseModel):
    ioc_value: str
    ioc_type_id: int = 76
    ioc_tlp_id: int = 2
    ioc_description: str = ""


class AddTimelineEventBody(BaseModel):
    title: str
    content: str
    event_date: str


class TriggerBody(BaseModel):
    type: str  # "block" | "escalate" | "triage"
    ip: Optional[str] = None
    case_id: Optional[int] = None
    analyst: Optional[str] = None
    reason: Optional[str] = None
    title: Optional[str] = None
    simulation: Optional[bool] = False   # True = simulation-only, no real action
    dry_run: Optional[bool] = False      # Alias for simulation
    source: Optional[str] = None         # Caller identifier for audit trail


# ── Stats ──────────────────────────────────────────────────────────────────────

@router.get("/stats")
async def soar_stats(_=Depends(get_current_user)):
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


# ── IRIS Alerts ────────────────────────────────────────────────────────────────

@router.get("/iris/alerts")
async def iris_alerts(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    status_id: Optional[int] = None,
    _=Depends(get_current_user),
):
    return await get_iris_alerts(page=page, per_page=per_page, status_id=status_id)


@router.get("/iris/alerts/{alert_id}")
async def iris_alert_detail(alert_id: int, _=Depends(get_current_user)):
    return await get_iris_alert(alert_id)


@router.post("/iris/alerts")
async def iris_create_alert(body: CreateAlertBody, _=Depends(get_current_user)):
    return await create_iris_alert(
        title=body.title,
        description=body.description,
        severity_id=body.severity_id,
        tags=body.tags,
        ioc_value=body.ioc_value,
    )


@router.put("/iris/alerts/{alert_id}")
async def iris_update_alert(alert_id: int, body: UpdateAlertBody, _=Depends(get_current_user)):
    data = {k: v for k, v in body.dict().items() if v is not None}
    return await update_iris_alert(alert_id, data)


@router.post("/iris/alerts/escalate")
async def iris_escalate_alerts(body: EscalateAlertBody, _=Depends(get_current_user)):
    return await escalate_iris_alerts(
        alert_ids=body.alert_ids,
        case_title=body.case_title,
        note=body.note,
    )


# ── IRIS Cases ─────────────────────────────────────────────────────────────────

@router.get("/iris/cases")
async def iris_cases(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    _=Depends(get_current_user),
):
    return await get_iris_cases(page=page, per_page=per_page)


@router.get("/iris/cases/{case_id}")
async def iris_case_detail(case_id: int, _=Depends(get_current_user)):
    return await get_iris_case(case_id)


@router.post("/iris/cases")
async def iris_create_case(body: CreateCaseBody, _=Depends(get_current_user)):
    return await create_iris_case(
        name=body.case_name,
        description=body.case_description,
        customer_id=body.customer_id,
    )


@router.put("/iris/cases/{case_id}")
async def iris_update_case(case_id: int, body: UpdateCaseBody, _=Depends(get_current_user)):
    data = {k: v for k, v in body.dict().items() if v is not None}
    return await update_iris_case(case_id, data)


@router.post("/iris/cases/{case_id}/close")
async def iris_close_case(case_id: int, _=Depends(get_current_user)):
    return await close_iris_case(case_id)


@router.post("/iris/cases/{case_id}/reopen")
async def iris_reopen_case(case_id: int, _=Depends(get_current_user)):
    return await reopen_iris_case(case_id)


# ── Case Notes ─────────────────────────────────────────────────────────────────

@router.get("/iris/cases/{case_id}/notes")
async def iris_case_notes(case_id: int, _=Depends(get_current_user)):
    return await get_case_note_groups(case_id)


@router.post("/iris/cases/{case_id}/notes")
async def iris_add_case_note(case_id: int, body: AddNoteBody, _=Depends(get_current_user)):
    group_id = body.group_id
    if group_id is None:
        group_title = body.group_title or "SOC Notes"
        grp = await add_case_note_group(case_id, group_title)
        group_id = grp.get("data", {}).get("group_id", 1)
    return await add_case_note(
        case_id=case_id,
        title=body.title,
        content=body.content,
        group_id=group_id,
    )


# ── Case IOCs ──────────────────────────────────────────────────────────────────

@router.get("/iris/cases/{case_id}/iocs")
async def iris_case_iocs(case_id: int, _=Depends(get_current_user)):
    return await get_case_iocs(case_id)


@router.post("/iris/cases/{case_id}/iocs")
async def iris_add_case_ioc(case_id: int, body: AddIocBody, _=Depends(get_current_user)):
    return await add_case_ioc(
        case_id=case_id,
        value=body.ioc_value,
        type_id=body.ioc_type_id,
        tlp_id=body.ioc_tlp_id,
        description=body.ioc_description,
    )


# ── Case Timeline ──────────────────────────────────────────────────────────────

@router.get("/iris/cases/{case_id}/timeline")
async def iris_case_timeline(case_id: int, _=Depends(get_current_user)):
    return await get_case_timeline(case_id)


@router.post("/iris/cases/{case_id}/timeline")
async def iris_add_case_timeline_event(case_id: int, body: AddTimelineEventBody, _=Depends(get_current_user)):
    return await add_case_timeline_event(
        case_id=case_id,
        title=body.title,
        content=body.content,
        event_date=body.event_date,
    )


# ── Shuffle ────────────────────────────────────────────────────────────────────

@router.get("/shuffle/workflows")
async def shuffle_workflows(_=Depends(get_current_user)):
    return await get_shuffle_workflows()


@router.post("/shuffle/trigger")
async def shuffle_trigger(body: TriggerBody, _=Depends(get_current_user)):
    is_simulation = bool(body.simulation or body.dry_run)

    # Block IP in simulation mode: NEVER call real firewall or Wazuh Active Response
    if body.type == "block" and is_simulation:
        import logging
        logging.getLogger("soar").info(
            "SIMULATION block_ip: ip=%s source=%s case_id=%s — no real action taken",
            body.ip, body.source, body.case_id,
        )
        return {
            "ok": True,
            "mode": "simulation",
            "action": "block_ip",
            "ip": body.ip,
            "case_id": body.case_id,
            "source": body.source,
            "message": "Simulation only. No firewall rule or Wazuh Active Response was executed.",
            "message_th": "จำลองการ Block IP เท่านั้น — ไม่มีการเปลี่ยนแปลง firewall หรือ Wazuh Active Response จริง",
        }

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
        "simulation": is_simulation,
        "source": body.source,
    }
    return await trigger_shuffle_webhook(url, payload)


# ── MISP ───────────────────────────────────────────────────────────────────────

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
