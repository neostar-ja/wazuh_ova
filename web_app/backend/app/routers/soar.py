from datetime import datetime
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from typing import Optional, List
import asyncio

from ..routers.auth import get_current_user
from ..models.database import get_db, CaseTask, CaseEvidence, CaseActivityLog, ShuffleActionHistory
from sqlalchemy.orm import Session
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


# ── Local extension models ──────────────────────────────────────────────────────

class CreateTaskBody(BaseModel):
    title: str
    description: Optional[str] = None
    status: str = "todo"
    priority: str = "medium"
    assignee: Optional[str] = None
    due_date: Optional[str] = None
    tags: Optional[str] = None
    template_id: Optional[str] = None


class UpdateTaskBody(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    assignee: Optional[str] = None
    due_date: Optional[str] = None
    tags: Optional[str] = None


class CreateEvidenceBody(BaseModel):
    title: str
    description: Optional[str] = None
    source: str = "manual"
    ev_type: str = "text"
    sha256: Optional[str] = None
    content_preview: Optional[str] = None
    raw_json: Optional[str] = None
    linked_task_id: Optional[int] = None


class RecordShuffleActionBody(BaseModel):
    iris_case_id: Optional[int] = None
    action_type: str
    payload_summary: Optional[str] = None
    execution_id: Optional[str] = None
    response_mode: str = "simulation"
    response_ok: bool = True
    response_detail: Optional[str] = None


# ── Health & Integrations ───────────────────────────────────────────────────────

def _integration_status(configured: bool, connected: bool, error: Optional[str] = None) -> dict:
    if not configured:
        return {"status": "not_configured", "label": "ยังไม่ได้เชื่อมต่อ"}
    if error:
        return {"status": "error", "label": f"ข้อผิดพลาด: {error[:60]}"}
    if connected:
        return {"status": "connected", "label": "เชื่อมต่อแล้ว"}
    return {"status": "degraded", "label": "ไม่สามารถเชื่อมต่อได้"}


@router.get("/health")
async def soar_health(_=Depends(get_current_user)):
    """Detailed health check for all SOAR integrations."""
    iris_r, shuffle_r, misp_r = await asyncio.gather(
        get_iris_stats(),
        get_shuffle_stats(),
        get_misp_stats(),
        return_exceptions=True,
    )

    def _safe(r: object) -> dict:
        if isinstance(r, Exception):
            return {"connected": False, "error": str(r)}
        return r  # type: ignore[return-value]

    iris    = _safe(iris_r)
    shuffle = _safe(shuffle_r)
    misp    = _safe(misp_r)

    def _cfg(*vals):
        return any(bool((v or "").strip()) for v in vals)

    integrations = [
        {
            "id": "dfir_iris",
            "name": "DFIR-IRIS",
            "category": "case_management",
            "icon": "case",
            "configured": _cfg(settings.iris_url, settings.iris_api_key),
            "connected": bool(iris.get("connected")),
            "detail": iris,
            **_integration_status(
                _cfg(settings.iris_url, settings.iris_api_key),
                bool(iris.get("connected")),
                iris.get("error"),
            ),
        },
        {
            "id": "shuffle",
            "name": "Shuffle SOAR",
            "category": "soar",
            "icon": "soar",
            "configured": _cfg(settings.shuffle_url, settings.shuffle_token),
            "connected": bool(shuffle.get("connected")),
            "detail": shuffle,
            "simulation_only": True,
            **_integration_status(
                _cfg(settings.shuffle_url, settings.shuffle_token),
                bool(shuffle.get("connected")),
                shuffle.get("error"),
            ),
        },
        {
            "id": "misp",
            "name": "MISP",
            "category": "threat_intel",
            "icon": "threat",
            "configured": _cfg(settings.misp_url, settings.misp_api_key),
            "connected": bool(misp.get("connected")),
            "detail": misp,
            **_integration_status(
                _cfg(settings.misp_url, settings.misp_api_key),
                bool(misp.get("connected")),
                misp.get("error"),
            ),
        },
        {
            "id": "wazuh",
            "name": "Wazuh SIEM",
            "category": "siem",
            "icon": "shield",
            "configured": _cfg(settings.wazuh_api_host),
            "connected": True,
            **_integration_status(True, True),
        },
        {
            "id": "opensearch",
            "name": "OpenSearch",
            "category": "log_store",
            "icon": "search",
            "configured": _cfg(settings.opensearch_host),
            "connected": True,
            **_integration_status(True, True),
        },
        {
            "id": "abuseipdb",
            "name": "AbuseIPDB",
            "category": "threat_intel",
            "icon": "threat",
            "configured": _cfg(settings.abuseipdb_key),
            "connected": _cfg(settings.abuseipdb_key),
            **_integration_status(_cfg(settings.abuseipdb_key), _cfg(settings.abuseipdb_key)),
        },
        {
            "id": "otx",
            "name": "OTX AlienVault",
            "category": "threat_intel",
            "icon": "threat",
            "configured": _cfg(settings.otx_key),
            "connected": _cfg(settings.otx_key),
            **_integration_status(_cfg(settings.otx_key), _cfg(settings.otx_key)),
        },
        {
            "id": "virustotal",
            "name": "VirusTotal",
            "category": "threat_intel",
            "icon": "threat",
            "configured": _cfg(settings.virustotal_key),
            "connected": _cfg(settings.virustotal_key),
            **_integration_status(_cfg(settings.virustotal_key), _cfg(settings.virustotal_key)),
        },
        {
            "id": "infoblox",
            "name": "Infoblox DNS/DHCP",
            "category": "network",
            "icon": "dns",
            "configured": _cfg(settings.infoblox_url),
            "connected": False,
            "simulation_only": False,
            **_integration_status(_cfg(settings.infoblox_url), False),
        },
        {
            "id": "huawei_nac",
            "name": "Huawei Agile Controller / NAC",
            "category": "network",
            "icon": "nac",
            "configured": _cfg(settings.huawei_nac_url),
            "connected": False,
            **_integration_status(_cfg(settings.huawei_nac_url), False),
        },
        {
            "id": "firewall",
            "name": "Firewall (ผ่าน Wazuh)",
            "category": "network",
            "icon": "firewall",
            "configured": True,
            "connected": True,
            "simulation_only": True,
            "note": "Block actions เป็น SIMULATION ONLY — ไม่มีการเปลี่ยนแปลง firewall จริง",
            **_integration_status(True, True),
        },
    ]

    connected_count = sum(1 for i in integrations if i.get("connected"))
    configured_count = sum(1 for i in integrations if i.get("configured"))
    return {
        "integrations": integrations,
        "total": len(integrations),
        "configured": configured_count,
        "connected": connected_count,
        "checked_at": datetime.utcnow().isoformat(),
        "block_mode": "simulation_only",
        "production_actions_enabled": False,
    }


@router.get("/integrations")
async def soar_integrations(_=Depends(get_current_user)):
    """Alias for /health — returns integration list only."""
    h = await soar_health(_)
    return {"integrations": h["integrations"], "block_mode": h["block_mode"]}


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
    misp = await get_misp_stats()
    return {"iris": iris, "shuffle": shuffle, "misp": misp}


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


@router.get("/iris/cases/{case_id}/full")
async def iris_case_full(case_id: int, _=Depends(get_current_user)):
    """Load case summary + related counts in a single call for the workspace page."""
    summary, iocs_resp, timeline_resp, notes_resp = await asyncio.gather(
        get_iris_case(case_id),
        get_case_iocs(case_id),
        get_case_timeline(case_id),
        get_case_note_groups(case_id),
        return_exceptions=True,
    )
    def _safe(r, fallback):
        return fallback if isinstance(r, Exception) else r

    iocs_data    = _safe(iocs_resp,    {}).get("data", []) or []
    timeline_data= _safe(timeline_resp,{}).get("data", {})
    notes_data   = _safe(notes_resp,   {}).get("data", []) or []
    timeline_events = timeline_data.get("timeline", []) if isinstance(timeline_data, dict) else []
    note_count = sum(len(g.get("notes") or []) for g in notes_data)

    summary_safe = _safe(summary, {})
    case_info = summary_safe.get("data", {}) or {}

    return {
        "case": case_info,
        "counts": {
            "iocs": len(iocs_data),
            "timeline_events": len(timeline_events),
            "notes": note_count,
        },
    }


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


# ── Case Tasks (local SQLite) ───────────────────────────────────────────────────

@router.get("/cases/{case_id}/tasks")
async def get_case_tasks(case_id: int, _=Depends(get_current_user), db: Session = Depends(get_db)):
    tasks = db.query(CaseTask).filter(CaseTask.iris_case_id == case_id).order_by(CaseTask.created_at).all()
    return {"tasks": [_task_dict(t) for t in tasks]}


@router.post("/cases/{case_id}/tasks")
async def create_case_task(case_id: int, body: CreateTaskBody, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    task = CaseTask(
        iris_case_id=case_id,
        title=body.title,
        description=body.description,
        status=body.status,
        priority=body.priority,
        assignee=body.assignee,
        tags=body.tags,
        template_id=body.template_id,
        created_by=current_user.username if hasattr(current_user, "username") else "soc",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    _log_activity(db, case_id, "task_created", f"สร้าง task: {body.title}", current_user)
    return {"task": _task_dict(task)}


@router.put("/cases/{case_id}/tasks/{task_id}")
async def update_case_task(case_id: int, task_id: int, body: UpdateTaskBody, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    task = db.query(CaseTask).filter(CaseTask.id == task_id, CaseTask.iris_case_id == case_id).first()
    if not task:
        from fastapi import HTTPException
        raise HTTPException(404, "Task not found")
    for field, val in body.dict(exclude_none=True).items():
        setattr(task, field, val)
    task.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(task)
    _log_activity(db, case_id, "task_updated", f"อัปเดต task #{task_id}: {task.title} → {body.status or task.status}", current_user)
    return {"task": _task_dict(task)}


@router.delete("/cases/{case_id}/tasks/{task_id}")
async def delete_case_task(case_id: int, task_id: int, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    task = db.query(CaseTask).filter(CaseTask.id == task_id, CaseTask.iris_case_id == case_id).first()
    if not task:
        from fastapi import HTTPException
        raise HTTPException(404, "Task not found")
    title = task.title
    db.delete(task)
    db.commit()
    _log_activity(db, case_id, "task_deleted", f"ลบ task: {title}", current_user)
    return {"ok": True}


def _task_dict(t: CaseTask) -> dict:
    return {
        "id": t.id, "iris_case_id": t.iris_case_id,
        "title": t.title, "description": t.description,
        "status": t.status, "priority": t.priority,
        "assignee": t.assignee, "tags": t.tags,
        "template_id": t.template_id,
        "created_by": t.created_by,
        "created_at": t.created_at.isoformat() if t.created_at else None,
        "updated_at": t.updated_at.isoformat() if t.updated_at else None,
    }


# ── Case Evidence (local SQLite, metadata only) ────────────────────────────────

@router.get("/cases/{case_id}/evidence")
async def get_case_evidence(case_id: int, _=Depends(get_current_user), db: Session = Depends(get_db)):
    items = db.query(CaseEvidence).filter(CaseEvidence.iris_case_id == case_id).order_by(CaseEvidence.created_at.desc()).all()
    return {"evidence": [_ev_dict(e) for e in items]}


@router.post("/cases/{case_id}/evidence")
async def create_case_evidence(case_id: int, body: CreateEvidenceBody, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    ev = CaseEvidence(
        iris_case_id=case_id,
        title=body.title,
        description=body.description,
        source=body.source,
        ev_type=body.ev_type,
        sha256=body.sha256,
        content_preview=body.content_preview,
        raw_json=body.raw_json,
        linked_task_id=body.linked_task_id,
        created_by=current_user.username if hasattr(current_user, "username") else "soc",
        created_at=datetime.utcnow(),
    )
    db.add(ev)
    db.commit()
    db.refresh(ev)
    _log_activity(db, case_id, "evidence_added", f"เพิ่ม evidence: {body.title}", current_user)
    return {"evidence": _ev_dict(ev)}


@router.delete("/cases/{case_id}/evidence/{ev_id}")
async def delete_case_evidence(case_id: int, ev_id: int, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    ev = db.query(CaseEvidence).filter(CaseEvidence.id == ev_id, CaseEvidence.iris_case_id == case_id).first()
    if not ev:
        from fastapi import HTTPException
        raise HTTPException(404, "Evidence not found")
    title = ev.title
    db.delete(ev)
    db.commit()
    _log_activity(db, case_id, "evidence_deleted", f"ลบ evidence: {title}", current_user)
    return {"ok": True}


def _ev_dict(e: CaseEvidence) -> dict:
    return {
        "id": e.id, "iris_case_id": e.iris_case_id,
        "title": e.title, "description": e.description,
        "source": e.source, "ev_type": e.ev_type,
        "sha256": e.sha256, "content_preview": e.content_preview,
        "raw_json": e.raw_json,
        "linked_task_id": e.linked_task_id,
        "created_by": e.created_by,
        "created_at": e.created_at.isoformat() if e.created_at else None,
    }


# ── Case Activity Log ──────────────────────────────────────────────────────────

@router.get("/cases/{case_id}/activity")
async def get_case_activity(case_id: int, _=Depends(get_current_user), db: Session = Depends(get_db)):
    logs = db.query(CaseActivityLog).filter(CaseActivityLog.iris_case_id == case_id).order_by(CaseActivityLog.created_at.desc()).limit(100).all()
    return {"activity": [_log_dict(l) for l in logs]}


def _log_dict(l: CaseActivityLog) -> dict:
    return {
        "id": l.id, "iris_case_id": l.iris_case_id,
        "action": l.action, "detail": l.detail,
        "username": l.username,
        "created_at": l.created_at.isoformat() if l.created_at else None,
    }


def _log_activity(db: Session, case_id: int, action: str, detail: str, current_user) -> None:
    try:
        username = current_user.username if hasattr(current_user, "username") else "soc"
        log = CaseActivityLog(
            iris_case_id=case_id, action=action, detail=detail,
            username=username, user_id=getattr(current_user, "id", None),
            created_at=datetime.utcnow(),
        )
        db.add(log)
        db.commit()
    except Exception:
        pass


# ── Shuffle Action History ─────────────────────────────────────────────────────

@router.get("/cases/{case_id}/shuffle-actions")
async def get_shuffle_action_history(case_id: int, _=Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.query(ShuffleActionHistory).filter(ShuffleActionHistory.iris_case_id == case_id).order_by(ShuffleActionHistory.created_at.desc()).all()
    return {"actions": [_sha_dict(r) for r in rows]}


@router.post("/cases/{case_id}/shuffle-actions")
async def record_shuffle_action(case_id: int, body: RecordShuffleActionBody, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    row = ShuffleActionHistory(
        iris_case_id=case_id,
        action_type=body.action_type,
        payload_summary=body.payload_summary,
        execution_id=body.execution_id,
        response_mode=body.response_mode,
        response_ok=body.response_ok,
        response_detail=body.response_detail,
        created_by=current_user.username if hasattr(current_user, "username") else "soc",
        created_at=datetime.utcnow(),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    _log_activity(db, case_id, "shuffle_action", f"{body.action_type} [{body.response_mode}]", current_user)
    return {"action": _sha_dict(row)}


def _sha_dict(r: ShuffleActionHistory) -> dict:
    return {
        "id": r.id, "iris_case_id": r.iris_case_id,
        "action_type": r.action_type,
        "payload_summary": r.payload_summary,
        "execution_id": r.execution_id,
        "response_mode": r.response_mode,
        "response_ok": r.response_ok,
        "response_detail": r.response_detail,
        "created_by": r.created_by,
        "created_at": r.created_at.isoformat() if r.created_at else None,
    }


# ── Playbook Templates ─────────────────────────────────────────────────────────

PLAYBOOK_TEMPLATES = [
    {
        "id": "suspicious_ip",
        "name": "IP น่าสงสัย",
        "description": "สำหรับ external IP ที่มีพฤติกรรมน่าสงสัยหรือ threat intel score สูง",
        "category": "network",
        "tasks": [
            {"title": "ตรวจสอบ IP ด้วย Threat Intelligence (AbuseIPDB, OTX, VirusTotal)", "priority": "high", "status": "todo"},
            {"title": "ดู Wazuh alerts ที่เกี่ยวข้องกับ IP นี้", "priority": "high", "status": "todo"},
            {"title": "ตรวจ DNS query history จาก IP (ถ้ามี Infoblox)", "priority": "medium", "status": "todo"},
            {"title": "ตรวจ firewall log: allow/deny, bytes, session count", "priority": "medium", "status": "todo"},
            {"title": "ระบุ asset ที่ติดต่อกับ IP นี้", "priority": "high", "status": "todo"},
            {"title": "ประเมิน risk และตัดสินใจ: Simulate Block หรือ Monitor", "priority": "critical", "status": "todo"},
            {"title": "บันทึก findings ใน Case Notes", "priority": "medium", "status": "todo"},
            {"title": "สรุปและปิด Case พร้อม recommendation", "priority": "low", "status": "todo"},
        ],
    },
    {
        "id": "brute_force",
        "name": "Brute Force / การเข้าถึงซ้ำผิดปกติ",
        "description": "สำหรับการตรวจพบ authentication failure ซ้ำหลายครั้ง",
        "category": "access",
        "tasks": [
            {"title": "ระบุ source IP และ target account/service", "priority": "high", "status": "todo"},
            {"title": "ตรวจว่า account ถูก lock out หรือไม่", "priority": "critical", "status": "todo"},
            {"title": "ตรวจ IP ด้วย Threat Intelligence", "priority": "high", "status": "todo"},
            {"title": "ตรวจว่ามี successful login หลังจาก brute force หรือไม่", "priority": "critical", "status": "todo"},
            {"title": "ระบุช่วงเวลาของการโจมตี", "priority": "medium", "status": "todo"},
            {"title": "แจ้ง IT Owner ของ account/service ที่ถูกโจมตี", "priority": "high", "status": "todo"},
            {"title": "ดำเนินการ containment: reset password / lock account ถ้าจำเป็น", "priority": "high", "status": "todo"},
            {"title": "Simulate Block IP ถ้า external IP", "priority": "medium", "status": "todo"},
            {"title": "บันทึก evidence และปิด Case", "priority": "low", "status": "todo"},
        ],
    },
    {
        "id": "malware",
        "name": "Malware / ซอฟต์แวร์อันตราย",
        "description": "สำหรับการตรวจพบ malware, ransomware, trojan บน endpoint",
        "category": "endpoint",
        "tasks": [
            {"title": "ระบุ host ที่ติดเชื้อจาก alert", "priority": "critical", "status": "todo"},
            {"title": "เก็บ hash ของไฟล์ที่น่าสงสัยจาก Wazuh FIM", "priority": "high", "status": "todo"},
            {"title": "ตรวจ hash กับ VirusTotal และ MISP", "priority": "high", "status": "todo"},
            {"title": "ตรวจ network connection จาก host ที่ติดเชื้อ (C2?)", "priority": "critical", "status": "todo"},
            {"title": "แยก host ออกจาก network (ประสาน IT/NAC)", "priority": "critical", "status": "todo"},
            {"title": "เก็บ evidence: process list, network connections, file changes", "priority": "high", "status": "todo"},
            {"title": "ดำเนินการ eradication: scan + clean หรือ reimaging", "priority": "high", "status": "todo"},
            {"title": "ตรวจ lateral movement ไปยัง host อื่น", "priority": "high", "status": "todo"},
            {"title": "สร้าง MITRE ATT&CK timeline", "priority": "medium", "status": "todo"},
            {"title": "Recovery: restore + verify และปิด Case พร้อม lessons learned", "priority": "low", "status": "todo"},
        ],
    },
    {
        "id": "phishing",
        "name": "Phishing / Email หลอกลวง",
        "description": "สำหรับ phishing email ที่รายงานหรือตรวจพบ",
        "category": "email",
        "tasks": [
            {"title": "รวบรวม email header และ body", "priority": "high", "status": "todo"},
            {"title": "ตรวจ sender domain และ IP กับ Threat Intel", "priority": "high", "status": "todo"},
            {"title": "ตรวจ URL/link ใน email กับ VirusTotal และ MISP", "priority": "high", "status": "todo"},
            {"title": "ระบุผู้รับที่ได้รับ email เดียวกัน", "priority": "medium", "status": "todo"},
            {"title": "ตรวจว่ามีผู้คลิก link หรือเปิด attachment หรือไม่", "priority": "critical", "status": "todo"},
            {"title": "หาก click → escalate เป็น malware/compromise case", "priority": "critical", "status": "todo"},
            {"title": "แจ้ง IT ลบ email จาก mailbox ทั้งหมด", "priority": "high", "status": "todo"},
            {"title": "เพิ่ม IOC (domain, URL, IP, hash) เข้า MISP/blacklist", "priority": "medium", "status": "todo"},
            {"title": "บันทึกและปิด Case พร้อมคำแนะนำ", "priority": "low", "status": "todo"},
        ],
    },
    {
        "id": "web_attack",
        "name": "Web Attack / SQL Injection / XSS",
        "description": "สำหรับการโจมตี web application",
        "category": "web",
        "tasks": [
            {"title": "ระบุ web server และ URL ที่ถูกโจมตีจาก WAF/Wazuh log", "priority": "high", "status": "todo"},
            {"title": "ตรวจ source IP และ User-Agent", "priority": "high", "status": "todo"},
            {"title": "ประเมินว่าการโจมตีสำเร็จหรือไม่ (HTTP response code)", "priority": "critical", "status": "todo"},
            {"title": "ตรวจ database log สำหรับ SQL Injection", "priority": "high", "status": "todo"},
            {"title": "ตรวจ data exfiltration ในช่วงเวลาโจมตี", "priority": "critical", "status": "todo"},
            {"title": "ปิด vulnerability ชั่วคราวถ้าจำเป็น (ประสาน dev team)", "priority": "high", "status": "todo"},
            {"title": "Simulate Block source IP", "priority": "medium", "status": "todo"},
            {"title": "บันทึก evidence และรายงานตาม PDPA ถ้าจำเป็น", "priority": "low", "status": "todo"},
        ],
    },
    {
        "id": "compromised_account",
        "name": "บัญชีถูกบุกรุก / Compromised Account",
        "description": "สำหรับ account ที่สงสัยว่าถูก compromise",
        "category": "identity",
        "tasks": [
            {"title": "ระบุ account และ IP ที่ใช้ล็อกอิน", "priority": "critical", "status": "todo"},
            {"title": "ตรวจ login time และตำแหน่งที่ผิดปกติ", "priority": "high", "status": "todo"},
            {"title": "Reset password ทันทีและ force logout sessions ทั้งหมด", "priority": "critical", "status": "todo"},
            {"title": "ตรวจ activity log ว่า account ทำอะไรบ้างหลัง compromise", "priority": "critical", "status": "todo"},
            {"title": "ตรวจว่ามีการ escalate privilege หรือเข้าถึง sensitive data", "priority": "critical", "status": "todo"},
            {"title": "ตรวจ lateral movement จาก account นี้", "priority": "high", "status": "todo"},
            {"title": "แจ้งเจ้าของ account และ supervisor", "priority": "high", "status": "todo"},
            {"title": "ตรวจสอบว่า MFA เปิดใช้งานหรือไม่", "priority": "medium", "status": "todo"},
            {"title": "บันทึกและปิด Case", "priority": "low", "status": "todo"},
        ],
    },
    {
        "id": "data_exfiltration",
        "name": "Data Exfiltration / การรั่วไหลของข้อมูล",
        "description": "สำหรับสัญญาณของการขโมยข้อมูลออกนอกองค์กร",
        "category": "data",
        "tasks": [
            {"title": "ระบุ source host และ destination IP/domain", "priority": "critical", "status": "todo"},
            {"title": "ประเมินปริมาณข้อมูลที่ส่งออก (bytes, files)", "priority": "critical", "status": "todo"},
            {"title": "ระบุประเภทข้อมูลที่อาจรั่วไหล (PII, PHI, financial)", "priority": "critical", "status": "todo"},
            {"title": "ตรวจ destination IP ด้วย Threat Intel", "priority": "high", "status": "todo"},
            {"title": "แยก host ออกจาก network ทันที", "priority": "critical", "status": "todo"},
            {"title": "Simulate Block destination IP", "priority": "high", "status": "todo"},
            {"title": "เก็บ evidence: network log, process list, file list", "priority": "high", "status": "todo"},
            {"title": "ประเมินว่าต้องรายงานตาม PDPA/HIPAA/PCI-DSS หรือไม่", "priority": "critical", "status": "todo"},
            {"title": "แจ้ง DPO และ management", "priority": "critical", "status": "todo"},
            {"title": "บันทึก full timeline และปิด Case พร้อม lessons learned", "priority": "medium", "status": "todo"},
        ],
    },
    {
        "id": "policy_violation",
        "name": "Policy Violation / การละเมิดนโยบาย",
        "description": "สำหรับการใช้งาน IT ที่ผิดนโยบายองค์กร",
        "category": "compliance",
        "tasks": [
            {"title": "ระบุ user และ action ที่ละเมิดนโยบาย", "priority": "high", "status": "todo"},
            {"title": "รวบรวม log evidence", "priority": "high", "status": "todo"},
            {"title": "ตรวจว่าเป็น intentional หรือ accidental", "priority": "medium", "status": "todo"},
            {"title": "ประเมิน risk และ impact", "priority": "high", "status": "todo"},
            {"title": "แจ้ง HR หรือ supervisor ตามกระบวนการ", "priority": "medium", "status": "todo"},
            {"title": "บันทึกและปิด Case", "priority": "low", "status": "todo"},
        ],
    },
]


@router.get("/playbook-templates")
async def get_playbook_templates(_=Depends(get_current_user)):
    return {"templates": PLAYBOOK_TEMPLATES}


@router.post("/cases/{case_id}/apply-template")
async def apply_playbook_template(case_id: int, template_id: str, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    tpl = next((t for t in PLAYBOOK_TEMPLATES if t["id"] == template_id), None)
    if not tpl:
        from fastapi import HTTPException
        raise HTTPException(404, f"Template '{template_id}' not found")
    created = []
    for t in tpl["tasks"]:
        task = CaseTask(
            iris_case_id=case_id,
            title=t["title"],
            status=t.get("status", "todo"),
            priority=t.get("priority", "medium"),
            template_id=template_id,
            created_by=current_user.username if hasattr(current_user, "username") else "soc",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db.add(task)
        created.append(task)
    db.commit()
    _log_activity(db, case_id, "template_applied", f"ใช้ playbook template: {tpl['name']} ({len(tpl['tasks'])} tasks)", current_user)
    return {"ok": True, "template": tpl["name"], "tasks_created": len(created)}
