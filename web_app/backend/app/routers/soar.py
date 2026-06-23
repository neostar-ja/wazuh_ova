import json
from collections import Counter
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import Any, Optional, List
import asyncio

from ..routers.auth import get_current_user
from ..models.database import get_db, CaseTask, CaseActivityLog, ShuffleActionHistory
from sqlalchemy.orm import Session
from ..services import opensearch_service
from ..services.soar_svc import (
    get_iris_stats, get_iris_alerts, get_iris_alert, get_iris_alert_detail, get_iris_alert_statuses, get_iris_severities, get_iris_cases, get_iris_case,
    get_iris_case_states,
    create_iris_alert, update_iris_alert, escalate_iris_alerts,
    create_iris_case, update_iris_case, set_iris_case_state, close_iris_case, reopen_iris_case,
    get_case_note_groups, add_case_note_group, get_case_note, add_case_note,
    get_case_iocs, add_case_ioc,
    get_case_timeline, add_case_timeline_event,
    get_shuffle_workflows, get_shuffle_stats, trigger_shuffle_webhook,
    search_misp_ioc, get_misp_stats,
)
from ..core.config import settings
from ..services.enrichment_service import detect_ioc_type

router = APIRouter(prefix="/soar", tags=["soar"])

LIVE_EVIDENCE_IOC_LIMIT = 5
LIVE_EVIDENCE_PER_SOURCE_LIMIT = 10
LIVE_EVIDENCE_MAX_ITEMS = 60


def _extract_iris_iocs(payload: object) -> list[dict]:
    if not isinstance(payload, dict):
        return []
    data = payload.get("data")
    if isinstance(data, list):
        return data
    if isinstance(data, dict):
        iocs = data.get("ioc")
        if isinstance(iocs, list):
            return iocs
    return []


def _extract_note_directory_id(payload: object) -> Optional[int]:
    if not isinstance(payload, dict):
        return None
    data = payload.get("data")
    if not isinstance(data, dict):
        return None
    value = data.get("group_id", data.get("id"))
    return value if isinstance(value, int) else None


def _trim_text(value: Any, limit: int = 320) -> Optional[str]:
    if value is None:
        return None
    text = str(value).strip()
    if not text:
        return None
    if len(text) <= limit:
        return text
    return f"{text[:limit - 1]}…"


def _json_preview(payload: Any, limit: int = 1600) -> Optional[str]:
    try:
        text = json.dumps(payload, ensure_ascii=False, indent=2, default=str)
    except Exception:
        text = str(payload)
    return _trim_text(text, limit=limit)


def _safe_int(value: Any) -> Optional[int]:
    try:
        return int(value)
    except Exception:
        return None


def _normalize_case_ioc_type(ioc: dict) -> str:
    raw_type = ioc.get("ioc_type")
    if isinstance(raw_type, dict):
        type_name = str(raw_type.get("type_name") or "").lower()
    else:
        type_name = str(raw_type or "").lower()
    if "ip" in type_name:
        return "ip"
    if "domain" in type_name:
        return "domain"
    if "url" in type_name:
        return "url"
    if "sha256" in type_name:
        return "hash_sha256"
    if "sha1" in type_name:
        return "hash_sha1"
    if "md5" in type_name:
        return "hash_md5"
    return detect_ioc_type(str(ioc.get("ioc_value") or ""))


def _build_case_ioc_seeds(iocs: list[dict]) -> list[dict]:
    seen: set[str] = set()
    seeds: list[dict] = []
    for ioc in iocs:
        value = str(ioc.get("ioc_value") or "").strip()
        if not value:
            continue
        lowered = value.lower()
        if lowered in seen:
            continue
        seen.add(lowered)
        seeds.append({
            "value": value,
            "type": _normalize_case_ioc_type(ioc),
            "description": ioc.get("ioc_description") or "",
        })
        if len(seeds) >= LIVE_EVIDENCE_IOC_LIMIT:
            break
    return seeds


def _format_misp_timestamp(value: Any) -> Optional[str]:
    ts = _safe_int(value)
    if not ts:
        return None
    return datetime.utcfromtimestamp(ts).isoformat() + "Z"


def _extract_misp_attributes(payload: object) -> list[dict]:
    if not isinstance(payload, dict):
        return []
    response = payload.get("response")
    if not isinstance(response, dict):
        return []
    attrs = response.get("Attribute")
    return attrs if isinstance(attrs, list) else []


def _evidence_sort_key(item: dict) -> tuple[int, str]:
    created_at = str(item.get("created_at") or "")
    severity = _safe_int(item.get("severity")) or 0
    return severity, created_at


def _dedupe_evidence(items: list[dict]) -> list[dict]:
    seen: set[tuple[str, str, str, str, str, str]] = set()
    deduped: list[dict] = []
    for item in items:
        key = (
            str(item.get("source") or ""),
            str(item.get("ev_type") or ""),
            str(item.get("source_ref") or ""),
            str(item.get("created_at") or ""),
            str(item.get("ioc_value") or ""),
            str(item.get("title") or ""),
        )
        if key in seen:
            continue
        seen.add(key)
        deduped.append(item)
    return deduped


def _source_status(source_id: str, label: str, configured: bool, count: int, error: Optional[str] = None, note: Optional[str] = None) -> dict:
    status = "connected"
    if not configured:
        status = "not_configured"
    elif error:
        status = "error"
    elif count == 0:
        status = "no_data"
    payload = {"id": source_id, "label": label, "status": status, "count": count}
    if error:
        payload["error"] = error
    if note:
        payload["note"] = note
    return payload


def _build_live_evidence_item(
    *,
    case_id: int,
    item_id: str,
    source: str,
    ev_type: str,
    title: str,
    description: Optional[str],
    created_at: Optional[str],
    ioc_value: str,
    ioc_type: str,
    severity: Optional[int] = None,
    source_ref: Optional[str] = None,
    source_url: Optional[str] = None,
    content_preview: Optional[str] = None,
    raw_json: Any = None,
    tags: Optional[list[str]] = None,
    metadata: Optional[dict[str, Any]] = None,
) -> dict:
    return {
        "id": item_id,
        "iris_case_id": case_id,
        "title": title,
        "description": description,
        "source": source,
        "ev_type": ev_type,
        "severity": severity,
        "sha256": None,
        "content_preview": content_preview,
        "raw_json": raw_json,
        "linked_task_id": None,
        "created_by": source.upper(),
        "created_at": created_at,
        "ioc_value": ioc_value,
        "ioc_type": ioc_type,
        "source_ref": source_ref,
        "source_url": source_url,
        "tags": tags or [],
        "metadata": metadata or {},
        "live": True,
    }


async def _collect_live_evidence(case_id: int) -> dict:
    case_iocs = _extract_iris_iocs(await get_case_iocs(case_id))
    seeds = _build_case_ioc_seeds(case_iocs)
    configured = {
        "wazuh": bool(settings.opensearch_host),
        "opensearch": bool(settings.opensearch_host),
        "misp": bool(settings.misp_url and settings.misp_api_key),
    }
    counts = Counter()
    errors: dict[str, str] = {}
    evidence_items: list[dict] = []

    for seed in seeds:
        value = seed["value"]
        ioc_type = seed["type"]
        coroutines: list[tuple[str, Any]] = [
            ("wazuh", opensearch_service.get_ioc_history(value, time_range="30d", limit=LIVE_EVIDENCE_PER_SOURCE_LIMIT)),
        ]

        if ioc_type == "ip":
            coroutines.extend([
                ("opensearch_raw", opensearch_service.investigate_entity(value, entity_type="ip", time_range="30d", size=LIVE_EVIDENCE_PER_SOURCE_LIMIT)),
                ("opensearch_dns", opensearch_service.query_dns_events(value, time_range="30d", size=LIVE_EVIDENCE_PER_SOURCE_LIMIT)),
                ("opensearch_dhcp", opensearch_service.query_dhcp_events(value, time_range="30d", size=LIVE_EVIDENCE_PER_SOURCE_LIMIT)),
                ("opensearch_nac", opensearch_service.query_nac_events(value, time_range="30d", size=LIVE_EVIDENCE_PER_SOURCE_LIMIT)),
            ])
        elif ioc_type == "domain":
            coroutines.append(
                ("opensearch_dns", opensearch_service.query_dns_events(value, time_range="30d", size=LIVE_EVIDENCE_PER_SOURCE_LIMIT)),
            )

        if configured["misp"]:
            coroutines.append(("misp", search_misp_ioc(value)))

        results = await asyncio.gather(*(coro for _, coro in coroutines), return_exceptions=True)

        for (label, _), result in zip(coroutines, results):
            if isinstance(result, Exception):
                if label.startswith("opensearch"):
                    errors.setdefault("opensearch", str(result))
                else:
                    errors.setdefault(label, str(result))
                continue

            if label == "wazuh":
                for idx, event in enumerate(result if isinstance(result, list) else []):
                    level = _safe_int(event.get("level"))
                    counts["wazuh"] += 1
                    evidence_items.append(_build_live_evidence_item(
                        case_id=case_id,
                        item_id=f"wazuh:{value}:{idx}:{event.get('timestamp') or ''}",
                        source="wazuh",
                        ev_type="alert",
                        title=f"Wazuh Alert L{level or 0}: {event.get('description') or 'Alert match'}",
                        description=_trim_text(
                            " • ".join(part for part in [
                                f"agent {event.get('agent')}" if event.get("agent") else "",
                                event.get("source") or "",
                                f"src {event.get('srcip')}" if event.get("srcip") else "",
                                f"dst {event.get('dstip')}" if event.get("dstip") else "",
                            ] if part),
                            limit=220,
                        ),
                        created_at=event.get("timestamp"),
                        ioc_value=value,
                        ioc_type=ioc_type,
                        severity=level,
                        source_ref=event.get("description"),
                        content_preview=_json_preview(event, limit=900),
                        raw_json=event,
                        metadata={"origin": "wazuh_alert_history"},
                    ))
                continue

            if label == "misp":
                if isinstance(result, dict) and result.get("error"):
                    errors.setdefault("misp", str(result.get("error")))
                    continue
                for idx, attr in enumerate(_extract_misp_attributes(result)[:LIVE_EVIDENCE_PER_SOURCE_LIMIT]):
                    counts["misp"] += 1
                    event_id = attr.get("event_id")
                    source_url = f"{settings.misp_url}/events/view/{event_id}" if event_id and settings.misp_url else None
                    misp_type = str(attr.get("type") or "")
                    evidence_items.append(_build_live_evidence_item(
                        case_id=case_id,
                        item_id=f"misp:{value}:{event_id or '0'}:{idx}",
                        source="misp",
                        ev_type="threat_intel",
                        title=f"MISP Match: {attr.get('value') or value}",
                        description=_trim_text(
                            " • ".join(part for part in [
                                misp_type,
                                str(attr.get("category") or ""),
                                f"event #{event_id}" if event_id else "",
                                "to_ids" if attr.get("to_ids") else "",
                            ] if part),
                            limit=220,
                        ),
                        created_at=_format_misp_timestamp(attr.get("timestamp")),
                        ioc_value=value,
                        ioc_type=ioc_type,
                        severity=8 if attr.get("to_ids") else 5,
                        source_ref=str(event_id or ""),
                        source_url=source_url,
                        content_preview=_json_preview(attr, limit=900),
                        raw_json=attr,
                        tags=[str(attr.get("category") or ""), misp_type],
                        metadata={"origin": "misp_attribute"},
                    ))
                continue

            raw_events = result if isinstance(result, list) else []
            if label == "opensearch_nac":
                nac_specific_fields = (
                    "mac", "dstuser", "srcuser", "switch_ip", "ap_name",
                    "interface", "auth_type", "auth_result", "posture_result",
                    "policy_name", "ac_msg_type", "nasip",
                )
                raw_events = [
                    event for event in raw_events
                    if isinstance(event, dict) and any((event.get("data") or {}).get(field) for field in nac_specific_fields)
                ]
            for idx, event in enumerate(raw_events):
                counts["opensearch"] += 1
                level = _safe_int(((event.get("rule") or {}).get("level")))
                program = ((event.get("predecoder") or {}).get("program_name"))
                agent_name = ((event.get("agent") or {}).get("name"))
                event_data = event.get("data") or {}

                if label == "opensearch_dns":
                    title = f"DNS Query: {event_data.get('query_name') or value}"
                    description = _trim_text(
                        " • ".join(part for part in [
                            event_data.get("response_code") or "",
                            f"client {event_data.get('client_ip') or event_data.get('src_ip')}" if (event_data.get("client_ip") or event_data.get("src_ip")) else "",
                            program or "",
                        ] if part),
                        limit=220,
                    )
                    ev_type = "dns"
                elif label == "opensearch_dhcp":
                    title = f"DHCP Event: {event_data.get('dhcp_action') or 'lease'}"
                    description = _trim_text(
                        " • ".join(part for part in [
                            event_data.get("dhcp_ip") or "",
                            event_data.get("dhcp_mac") or "",
                            event_data.get("dhcp_hostname") or "",
                        ] if part),
                        limit=220,
                    )
                    ev_type = "dhcp"
                elif label == "opensearch_nac":
                    title = f"NAC Event: {event_data.get('auth_result') or event_data.get('action') or 'access'}"
                    description = _trim_text(
                        " • ".join(part for part in [
                            event_data.get("dstuser") or event_data.get("srcuser") or "",
                            event_data.get("mac") or "",
                            event_data.get("switch_ip") or "",
                        ] if part),
                        limit=220,
                    )
                    ev_type = "nac"
                else:
                    title = f"OpenSearch Event L{level or 0}: {((event.get('rule') or {}).get('description')) or program or 'Raw event'}"
                    description = _trim_text(
                        " • ".join(part for part in [
                            program or "",
                            f"agent {agent_name}" if agent_name else "",
                            f"src {event_data.get('srcip')}" if event_data.get("srcip") else "",
                            f"dst {event_data.get('dstip')}" if event_data.get("dstip") else "",
                        ] if part),
                        limit=220,
                    )
                    ev_type = "raw_event"

                evidence_items.append(_build_live_evidence_item(
                    case_id=case_id,
                    item_id=f"{label}:{value}:{idx}:{event.get('@timestamp') or ''}",
                    source="opensearch",
                    ev_type=ev_type,
                    title=title,
                    description=description,
                    created_at=event.get("@timestamp"),
                    ioc_value=value,
                    ioc_type=ioc_type,
                    severity=level,
                    source_ref=str(((event.get("rule") or {}).get("id")) or ""),
                    content_preview=_trim_text(event.get("full_log")) or _json_preview(event, limit=900),
                    raw_json=event,
                    tags=[str(tag) for tag in (((event.get("rule") or {}).get("groups")) or []) if tag],
                    metadata={"origin": label, "agent": agent_name},
                ))

    deduped = _dedupe_evidence(evidence_items)
    deduped.sort(key=_evidence_sort_key, reverse=True)
    deduped = deduped[:LIVE_EVIDENCE_MAX_ITEMS]

    source_items = {
        "wazuh": sum(1 for item in deduped if item.get("source") == "wazuh"),
        "opensearch": sum(1 for item in deduped if item.get("source") == "opensearch"),
        "misp": sum(1 for item in deduped if item.get("source") == "misp"),
    }
    by_type = Counter(str(item.get("ev_type") or "unknown") for item in deduped)

    return {
        "evidence": deduped,
        "summary": {
            "live": True,
            "generated_at": datetime.utcnow().isoformat() + "Z",
            "time_range": "30d",
            "total": len(deduped),
            "by_source": dict(source_items),
            "by_type": dict(by_type),
            "ioc_total": len(case_iocs),
            "ioc_queried": len(seeds),
            "ioc_limit_applied": len(seeds) >= LIVE_EVIDENCE_IOC_LIMIT,
            "ioc_values": [seed["value"] for seed in seeds],
        },
        "sources": [
            _source_status("wazuh", "Wazuh Alerts", configured["wazuh"], source_items["wazuh"], errors.get("wazuh")),
            _source_status("opensearch", "OpenSearch Raw Logs", configured["opensearch"], source_items["opensearch"], errors.get("opensearch")),
            _source_status("misp", "MISP Threat Intel", configured["misp"], source_items["misp"], errors.get("misp")),
        ],
    }


async def _normalize_iris_note_groups(case_id: int, payload: object) -> dict:
    if not isinstance(payload, dict):
        return {"status": "success", "message": "", "data": []}

    directories = payload.get("data")
    if not isinstance(directories, list):
        return {"status": "success", "message": "", "data": []}

    # Old IRIS shape already matches the frontend contract.
    if directories and isinstance(directories[0], dict) and "group_title" in directories[0]:
        return payload

    note_ids: list[int] = []
    for directory in directories:
        if not isinstance(directory, dict):
            continue
        for note in directory.get("notes") or []:
            if not isinstance(note, dict):
                continue
            note_id = note.get("note_id", note.get("id"))
            if isinstance(note_id, int):
                note_ids.append(note_id)

    note_results = await asyncio.gather(
        *(get_case_note(case_id, note_id) for note_id in note_ids),
        return_exceptions=True,
    )
    note_details: dict[int, dict] = {}
    for note_id, result in zip(note_ids, note_results):
        if isinstance(result, Exception) or not isinstance(result, dict):
            continue
        detail = result.get("data")
        if isinstance(detail, dict):
            note_details[note_id] = detail

    normalized_groups: list[dict] = []
    for directory in directories:
        if not isinstance(directory, dict):
            continue
        directory_id = directory.get("group_id", directory.get("id"))
        group_notes: list[dict] = []
        for note in directory.get("notes") or []:
            if not isinstance(note, dict):
                continue
            note_id = note.get("note_id", note.get("id"))
            detail = note_details.get(note_id) if isinstance(note_id, int) else None
            if detail:
                group_notes.append({
                    "note_id": detail.get("note_id", note_id),
                    "note_title": detail.get("note_title", note.get("title", "")),
                    "note_content": detail.get("note_content", ""),
                    "note_creationdate": detail.get("note_creationdate", ""),
                    "note_lastupdate": detail.get("note_lastupdate", ""),
                    "modification_history": detail.get("modification_history") or {},
                })
            else:
                group_notes.append({
                    "note_id": note_id,
                    "note_title": note.get("note_title", note.get("title", "")),
                    "note_content": note.get("note_content", ""),
                    "note_creationdate": note.get("note_creationdate", ""),
                    "note_lastupdate": note.get("note_lastupdate", ""),
                    "modification_history": note.get("modification_history") or {},
                })

        normalized_groups.append({
            "group_id": directory_id,
            "group_title": directory.get("group_title", directory.get("name", "")),
            "group_uuid": directory.get("group_uuid", str(directory_id or "")),
            "notes": group_notes,
        })

    return {"status": "success", "message": payload.get("message", ""), "data": normalized_groups}


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


class UpdateCaseStatusBody(BaseModel):
    state_id: Optional[int] = None
    status_id: Optional[int] = None


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
    event_tz: Optional[str] = "+07:00"
    color: Optional[str] = "#1bfac3"


class TriggerBody(BaseModel):
    type: str  # "block" | "block_ip" | "block_port" | "escalate" | "triage" | "enrichment" | ...
    # Target fields
    ip: Optional[str] = None
    target_ip: Optional[str] = None
    port: Optional[int] = None
    protocol: Optional[str] = None
    target_value: Optional[str] = None
    target_type: Optional[str] = None    # ip/domain/hash/port/case/alert
    # Workflow metadata
    workflow_id: Optional[str] = None
    workflow_name: Optional[str] = None
    workflow_type: Optional[str] = None
    # Context fields
    case_id: Optional[int] = None
    analyst: Optional[str] = None
    reason: Optional[str] = None
    title: Optional[str] = None
    severity: Optional[str] = None
    source: Optional[str] = None         # Caller identifier for audit trail
    # Safety flags
    simulation: Optional[bool] = False   # True = simulation-only, no real action
    dry_run: Optional[bool] = False      # Alias for simulation


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
    severity_id: Optional[int] = None,
    q: Optional[str] = Query(None, max_length=200),
    _=Depends(get_current_user),
):
    return await get_iris_alerts(page=page, per_page=per_page, status_id=status_id, severity_id=severity_id, q=q)


@router.get("/iris/alerts/{alert_id}")
async def iris_alert_detail(alert_id: int, _=Depends(get_current_user)):
    return await get_iris_alert_detail(alert_id)


@router.get("/iris/alert-statuses")
async def iris_alert_statuses(_=Depends(get_current_user)):
    return await get_iris_alert_statuses()


@router.get("/iris/severities")
async def iris_severities(_=Depends(get_current_user)):
    return await get_iris_severities()


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


@router.get("/iris/case-states")
async def iris_case_states(_=Depends(get_current_user)):
    return await get_iris_case_states()


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

    iocs_data = _extract_iris_iocs(_safe(iocs_resp, {}))
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
    result = await create_iris_case(
        name=body.case_name,
        description=body.case_description,
        customer_id=body.customer_id,
    )
    # Normalise: extract case_id from various IRIS response shapes
    case_id = None
    alert_id = None
    if isinstance(result, dict):
        data = result.get("data") or {}
        if isinstance(data, dict):
            case_id = data.get("case_id") or data.get("case", {}).get("case_id") if isinstance(data.get("case"), dict) else data.get("case_id")
            alert_id = data.get("alert_id")
        # partial status = fallback alert was created
        if result.get("status") == "partial":
            result["_soc_fallback"] = True
            result["_soc_message_th"] = (
                "IRIS ไม่สามารถสร้าง Case โดยตรงได้ ระบบสร้าง IRIS Alert แทน "
                "กรุณาเปิด IRIS และ escalate alert เป็น Case ด้วยตนเอง"
            )
    if case_id:
        result["case_id"] = case_id
    if alert_id:
        result["alert_id"] = alert_id
    return result


@router.put("/iris/cases/{case_id}")
async def iris_update_case(case_id: int, body: UpdateCaseBody, _=Depends(get_current_user)):
    data = {k: v for k, v in body.dict().items() if v is not None}
    return await update_iris_case(case_id, data)


@router.put("/iris/cases/{case_id}/status")
async def iris_update_case_status(
    case_id: int,
    body: UpdateCaseStatusBody,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    target_state_id = body.state_id if body.state_id is not None else body.status_id
    if target_state_id is None:
        raise HTTPException(status_code=400, detail="state_id is required")

    before = await get_iris_case(case_id)
    before_data = before.get("data", {}) if isinstance(before, dict) else {}
    before_label = before_data.get("state_name") or ("Closed" if before_data.get("close_date") or before_data.get("case_close_date") else "Open")

    result = await set_iris_case_state(case_id, target_state_id)
    if isinstance(result, dict) and not result.get("error"):
        after_case = result.get("case", {})
        if not isinstance(after_case, dict):
            after_case = {}
        after_label = after_case.get("state_name") or ("Closed" if after_case.get("close_date") or after_case.get("case_close_date") else f"State {target_state_id}")
        _log_activity(db, case_id, "case_status_updated", f"เปลี่ยนสถานะเคส: {before_label} → {after_label}", current_user)
    return result


@router.post("/iris/cases/{case_id}/close")
async def iris_close_case(case_id: int, _=Depends(get_current_user)):
    return await close_iris_case(case_id)


@router.post("/iris/cases/{case_id}/reopen")
async def iris_reopen_case(case_id: int, _=Depends(get_current_user)):
    return await reopen_iris_case(case_id)


# ── Case Notes ─────────────────────────────────────────────────────────────────

@router.get("/iris/cases/{case_id}/notes")
async def iris_case_notes(case_id: int, _=Depends(get_current_user)):
    payload = await get_case_note_groups(case_id)
    return await _normalize_iris_note_groups(case_id, payload)


@router.post("/iris/cases/{case_id}/notes")
async def iris_add_case_note(case_id: int, body: AddNoteBody, _=Depends(get_current_user)):
    group_id = body.group_id
    if group_id is None:
        group_title = body.group_title or "SOC Notes"
        existing = await get_case_note_groups(case_id)
        if isinstance(existing, dict):
            for directory in existing.get("data") or []:
                if not isinstance(directory, dict):
                    continue
                title = directory.get("group_title", directory.get("name"))
                identifier = directory.get("group_id", directory.get("id"))
                if title == group_title and isinstance(identifier, int):
                    group_id = identifier
                    break

        if group_id is None:
            grp = await add_case_note_group(case_id, group_title)
            group_id = _extract_note_directory_id(grp) or 1
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
        event_tz=body.event_tz or "+07:00",
        event_color=body.color or "#1bfac3",
    )


# ── Shuffle ────────────────────────────────────────────────────────────────────

@router.get("/shuffle/workflows")
async def shuffle_workflows(_=Depends(get_current_user)):
    return await get_shuffle_workflows()


_BLOCK_TYPES = {"block", "block_ip", "block_port"}
_soar_log = __import__("logging").getLogger("soar")


async def _add_shuffle_iris_note(body: TriggerBody, wf_type: str, effective_target: Optional[str]) -> bool:
    """Add a note to the IRIS case after a Shuffle trigger. Returns True if added."""
    if not body.case_id:
        return False
    try:
        mode_label = "Simulation" if (body.simulation or body.dry_run) else "Production"
        ts = datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
        if wf_type in ("block_ip", "block"):
            content = (
                f"## {mode_label} Block IP Request — {ts}\n\n"
                f"**Target:** {effective_target or 'N/A'}\n"
                f"**Mode:** Simulation only — ไม่มีการเปลี่ยนแปลง firewall หรือ Wazuh Active Response จริง\n\n"
                f"> No firewall rule was created.\n"
                f"> No Wazuh Active Response was executed.\n\n"
                f"**Analyst:** {body.analyst or 'N/A'}\n"
                f"**Reason:** {body.reason or 'N/A'}\n"
                f"**Source:** {body.source or 'soar_shuffle_tab'}\n"
            )
        elif wf_type == "block_port":
            content = (
                f"## {mode_label} Block Port Request — {ts}\n\n"
                f"**Target IP:** {effective_target or 'N/A'}\n"
                f"**Port:** {body.port or 'N/A'}\n"
                f"**Protocol:** {body.protocol or 'N/A'}\n"
                f"**Mode:** Simulation only — ไม่มีการเปลี่ยนแปลง firewall หรือ Wazuh Active Response จริง\n\n"
                f"> No firewall rule was created.\n"
                f"> No Wazuh Active Response was executed.\n\n"
                f"**Analyst:** {body.analyst or 'N/A'}\n"
                f"**Reason:** {body.reason or 'N/A'}\n"
            )
        else:
            content = (
                f"## Shuffle Action: {wf_type} — {ts}\n\n"
                f"**Workflow:** {body.workflow_name or wf_type}\n"
                f"**Target:** {effective_target or 'N/A'}\n"
                f"**Mode:** {mode_label}\n"
                f"**Analyst:** {body.analyst or 'N/A'}\n"
                f"**Reason:** {body.reason or 'N/A'}\n"
                f"**Result:** {'Simulation completed' if (body.simulation or body.dry_run) else 'Trigger sent to Shuffle'}\n"
            )

        from ..services.soar_svc import add_case_note, get_case_note_groups, add_case_note_group

        existing = await get_case_note_groups(body.case_id)
        group_id: Optional[int] = None
        if isinstance(existing, dict):
            for directory in existing.get("data") or []:
                if not isinstance(directory, dict):
                    continue
                title = directory.get("group_title", directory.get("name"))
                if title == "Shuffle Actions":
                    identifier = directory.get("group_id", directory.get("id"))
                    if isinstance(identifier, int):
                        group_id = identifier
                        break
        if group_id is None:
            grp = await add_case_note_group(body.case_id, "Shuffle Actions")
            group_id = _extract_note_directory_id(grp) or 1

        note_title = f"[{mode_label}] {wf_type} @ {datetime.utcnow().strftime('%Y-%m-%d %H:%M')}"
        await add_case_note(case_id=body.case_id, title=note_title, content=content, group_id=group_id)
        return True
    except Exception as e:
        _soar_log.error("Failed to add IRIS case note for shuffle action: %s", e)
        return False


@router.post("/shuffle/trigger")
async def shuffle_trigger(
    body: TriggerBody,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Normalise type
    wf_type = body.type
    if wf_type == "block":
        wf_type = "block_ip"

    is_block = wf_type in _BLOCK_TYPES

    # ── SAFETY GUARD: block types are ALWAYS simulation ──────────────────────
    if is_block:
        if body.simulation is False and not body.dry_run:
            _soar_log.warning(
                "SAFETY OVERRIDE: simulation=false received for block type=%s — forcing simulation",
                wf_type,
            )
        body.simulation = True
        body.dry_run = True

    is_simulation = bool(body.simulation or body.dry_run)

    effective_ip = body.ip or body.target_ip or body.target_value
    effective_target = effective_ip

    # Build payload summary (no credentials)
    import json as _json
    payload_summary = _json.dumps({
        "workflow_type": wf_type,
        "workflow_name": body.workflow_name or wf_type,
        "workflow_id": body.workflow_id,
        "target": effective_target,
        "target_type": body.target_type,
        "port": body.port,
        "protocol": body.protocol,
        "case_id": body.case_id,
        "analyst": body.analyst,
        "reason": body.reason,
        "severity": body.severity,
        "simulation": is_simulation,
    }, ensure_ascii=False)

    # ── Execute action ────────────────────────────────────────────────────────
    result: dict = {}

    if is_block and is_simulation:
        _soar_log.info(
            "SIMULATION %s: target=%s port=%s source=%s case_id=%s analyst=%s — no real action",
            wf_type, effective_target, body.port, body.source, body.case_id, body.analyst,
        )
        if wf_type == "block_port":
            result = {
                "ok": True,
                "mode": "simulation",
                "action": "block_port",
                "target": effective_target,
                "ip": effective_ip,
                "port": body.port,
                "protocol": body.protocol,
                "case_id": body.case_id,
                "source": body.source,
                "message": "Simulation only. No firewall rule or Wazuh Active Response was executed.",
                "message_th": "จำลองการ Block Port เท่านั้น — ไม่มีการเปลี่ยนแปลง firewall หรือ Wazuh Active Response จริง",
                "execution_id": None,
            }
        else:
            result = {
                "ok": True,
                "mode": "simulation",
                "action": "block_ip",
                "target": effective_target,
                "ip": effective_ip,
                "case_id": body.case_id,
                "source": body.source,
                "message": "Simulation only. No firewall rule or Wazuh Active Response was executed.",
                "message_th": "จำลองการ Block IP เท่านั้น — ไม่มีการเปลี่ยนแปลง firewall หรือ Wazuh Active Response จริง",
                "execution_id": None,
            }
    else:
        url_map = {
            "block_ip": settings.shuffle_block_url or settings.shuffle_webhook_url,
            "block_port": settings.shuffle_block_url or settings.shuffle_webhook_url,
            "escalate": settings.shuffle_esc_url or settings.shuffle_webhook_url,
            "triage": settings.shuffle_webhook_url,
            "notify": settings.shuffle_webhook_url,
            "enrichment": settings.shuffle_webhook_url,
            "evidence": settings.shuffle_webhook_url,
        }
        url = url_map.get(wf_type) or settings.shuffle_webhook_url
        # Build payload compatible with both:
        # 1) Wazuh-alert-shaped Shuffle workflows (data.srcip, rule.level, agent.name)
        # 2) Generic SOC Center workflows (ip, target_value, type)
        shuffle_payload = {
            # SOC Center fields
            "type": wf_type,
            "workflow_type": wf_type,
            "workflow_id": body.workflow_id,
            "ip": effective_ip,
            "target_ip": body.target_ip or body.ip,
            "target_value": body.target_value or effective_ip,
            "target_type": body.target_type,
            "port": body.port,
            "protocol": body.protocol,
            "case_id": body.case_id,
            "analyst": body.analyst,
            "reason": body.reason or body.title,
            "severity": body.severity,
            "simulation": is_simulation,
            "dry_run": is_simulation,
            "source": body.source,
            # Wazuh-alert compatibility shim (used by existing Shuffle workflows)
            # Enables $exec.execution_argument.data.srcip in Shuffle expressions
            "data": {
                "srcip": effective_ip or "",
                "dstip": "",
                "target": body.target_value or effective_ip or "",
            },
            "rule": {
                "level": int(body.severity.replace("critical", "15").replace("high", "12")
                             .replace("medium", "8").replace("low", "5"))
                         if body.severity and body.severity.lower() in ("critical","high","medium","low")
                         else 10,
                "description": body.reason or f"SOC Investigation: {effective_ip or body.target_value}",
                "id": "soc_investigate",
            },
            "agent": {
                "name": body.source or "SOC Center",
                "id": "0",
                "ip": effective_ip or "",
            },
            "timestamp": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S+0700"),
        }
        webhook_result = await trigger_shuffle_webhook(url, shuffle_payload)
        ok = webhook_result.get("ok", False) or (
            isinstance(webhook_result.get("status"), int) and webhook_result["status"] < 400
        )
        result = {
            "ok": ok,
            "mode": "simulation" if is_simulation else "production",
            "action": wf_type,
            "target": effective_target,
            "case_id": body.case_id,
            "message": webhook_result.get("body", "Trigger sent to Shuffle"),
            "execution_id": webhook_result.get("execution_id"),
            **{k: v for k, v in webhook_result.items() if k not in ("ok",)},
        }

    # ── Auto-save action history ──────────────────────────────────────────────
    try:
        analyst_name = body.analyst or (
            current_user.username if hasattr(current_user, "username") else "soc"
        )
        history_row = ShuffleActionHistory(
            iris_case_id=body.case_id,
            action_type=wf_type,
            payload_summary=payload_summary,
            execution_id=result.get("execution_id"),
            response_mode="simulation" if is_simulation else "production",
            response_ok=bool(result.get("ok", True)),
            response_detail=_trim_text(result.get("message", ""), 400),
            created_by=current_user.username if hasattr(current_user, "username") else analyst_name,
            created_at=datetime.utcnow(),
        )
        db.add(history_row)
        db.commit()
        db.refresh(history_row)
        result["action_id"] = history_row.id
    except Exception as e:
        _soar_log.error("Failed to save shuffle action history: %s", e)

    # ── Add IRIS case note (non-blocking) ─────────────────────────────────────
    if body.case_id:
        iris_note_added = await _add_shuffle_iris_note(body, wf_type, effective_target)
        result["iris_note_added"] = iris_note_added

    return result


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


# ── Case Evidence (live aggregation from connected systems) ───────────────────

@router.get("/cases/{case_id}/evidence")
async def get_case_evidence(case_id: int, _=Depends(get_current_user)):
    return await _collect_live_evidence(case_id)


@router.post("/cases/{case_id}/evidence")
async def create_case_evidence(case_id: int, body: CreateEvidenceBody, _=Depends(get_current_user)):
    raise HTTPException(
        status_code=410,
        detail=(
            "Manual local evidence has been deprecated. "
            "Evidence is now aggregated live from IRIS IOC context, Wazuh/OpenSearch, and MISP."
        ),
    )


@router.delete("/cases/{case_id}/evidence/{ev_id}")
async def delete_case_evidence(case_id: int, ev_id: int, _=Depends(get_current_user)):
    raise HTTPException(
        status_code=410,
        detail=(
            "Live evidence is read-only in this workspace. "
            "Remove or change the source data in the connected system instead."
        ),
    )


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


def _sha_dict_extended(r: ShuffleActionHistory) -> dict:
    """Extended dict that parses payload_summary JSON for workflow metadata."""
    import json as _json
    base = _sha_dict(r)
    if r.payload_summary:
        try:
            summary = _json.loads(r.payload_summary)
            base["workflow_type"] = summary.get("workflow_type", r.action_type)
            base["workflow_name"] = summary.get("workflow_name", r.action_type)
            base["target"] = summary.get("target")
            base["port"] = summary.get("port")
            base["protocol"] = summary.get("protocol")
            base["analyst"] = summary.get("analyst")
            base["reason"] = summary.get("reason")
            base["severity"] = summary.get("severity")
            base["target_type"] = summary.get("target_type")
        except Exception:
            pass
    if "workflow_type" not in base:
        base["workflow_type"] = r.action_type
    if "workflow_name" not in base:
        base["workflow_name"] = r.action_type
    return base


# ── Shuffle Action History — standalone (all actions, not per-case) ───────────

@router.get("/shuffle/actions")
async def get_all_shuffle_actions(
    limit: int = Query(100, ge=1, le=500),
    case_id: Optional[int] = None,
    _=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(ShuffleActionHistory)
    if case_id is not None:
        q = q.filter(ShuffleActionHistory.iris_case_id == case_id)
    rows = q.order_by(ShuffleActionHistory.created_at.desc()).limit(limit).all()
    return {"actions": [_sha_dict_extended(r) for r in rows]}


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
