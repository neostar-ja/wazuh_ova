"""SOAR Integration Service — Shuffle SOAR, DFIR-IRIS, MISP"""
import asyncio
import logging
import re
from datetime import datetime, timedelta, timezone
from typing import Optional, List
from urllib.parse import urlencode, urlparse

import httpx

from ..core.config import settings

logger = logging.getLogger(__name__)

_SSL = False  # all SOAR services use self-signed certs
_TIMEOUT = 15

_IRIS_DATETIME_MINUTE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$")
_IRIS_DATETIME_SECOND_RE = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$")
_WAZUH_SOURCE_HINTS = ("wazuh", "opensearch", "dashboard")


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


# ── DFIR-IRIS helpers ──────────────────────────────────────────────────────────

async def _iris_get(path: str, timeout: int = _TIMEOUT) -> dict:
    if not settings.iris_url or not settings.iris_api_key:
        return {"error": "IRIS not configured"}
    try:
        async with httpx.AsyncClient(verify=_SSL, timeout=timeout) as c:
            r = await c.get(f"{settings.iris_url}{path}", headers=_iris_headers())
            r.raise_for_status()
            return r.json()
    except httpx.HTTPStatusError as e:
        logger.error("IRIS GET %s HTTP %s", path, e.response.status_code)
        return {"error": f"HTTP {e.response.status_code}", "status_code": e.response.status_code}
    except Exception as e:
        logger.error("IRIS GET %s: %s", path, e)
        return {"error": str(e)}


async def _iris_post(path: str, data: dict, timeout: int = _TIMEOUT) -> dict:
    if not settings.iris_url or not settings.iris_api_key:
        return {"error": "IRIS not configured"}
    try:
        async with httpx.AsyncClient(verify=_SSL, timeout=timeout) as c:
            r = await c.post(f"{settings.iris_url}{path}", headers=_iris_headers(), json=data)
            r.raise_for_status()
            return r.json()
    except httpx.HTTPStatusError as e:
        logger.error("IRIS POST %s HTTP %s: %s", path, e.response.status_code, e.response.text[:200])
        return {"error": f"HTTP {e.response.status_code}: {e.response.text[:200]}"}
    except Exception as e:
        logger.error("IRIS POST %s: %s", path, e)
        return {"error": str(e)}


# ── IRIS Stats ─────────────────────────────────────────────────────────────────

async def get_iris_stats() -> dict:
    try:
        alerts_resp, cases_resp = await asyncio.gather(
            _iris_get("/alerts/filter"),
            _iris_get("/manage/cases/list"),
        )
        if "error" in alerts_resp:
            return {"connected": False, "error": alerts_resp["error"]}
        total = alerts_resp.get("data", {}).get("total", 0)
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


# ── IRIS Alerts ────────────────────────────────────────────────────────────────

async def get_iris_alerts(
    page: int = 1,
    per_page: int = 20,
    status_id: Optional[int] = None,
    severity_id: Optional[int] = None,
    q: Optional[str] = None,
) -> dict:
    params: dict[str, object] = {"page": page, "per_page": per_page}
    if status_id:
        params["alert_status_id"] = status_id
    if severity_id:
        params["alert_severity_id"] = severity_id
    if q and q.strip():
        # IRIS ignores generic q/search on this deployment; alert_title is the
        # native filter that searches the title text generated from Wazuh alerts.
        params["alert_title"] = q.strip()
    return await _iris_get(f"/alerts/filter?{urlencode(params)}")


async def get_iris_alert(alert_id: int) -> dict:
    return await _iris_get(f"/alerts/filter?alert_id={alert_id}")


async def get_iris_alert_statuses() -> dict:
    return await _iris_get("/manage/alert-status/list")


async def get_iris_severities() -> dict:
    return await _iris_get("/manage/severities/list")


def extract_iris_alert_detail(payload: object) -> dict:
    if not isinstance(payload, dict):
        return {}
    data = payload.get("data")
    if not isinstance(data, dict):
        return {}
    alerts = data.get("alerts")
    if not isinstance(alerts, list) or not alerts:
        return {}
    first = alerts[0]
    return first if isinstance(first, dict) else {}


def _parse_iris_datetime(value: object) -> Optional[datetime]:
    text = str(value or "").strip()
    if not text:
        return None
    normalized = text.replace("Z", "+00:00")
    if re.search(r"[+-]\d{4}$", normalized):
        normalized = f"{normalized[:-5]}{normalized[-5:-2]}:{normalized[-2:]}"
    try:
        parsed = datetime.fromisoformat(normalized)
    except ValueError:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def _extract_first_ioc_value(alert: dict) -> Optional[str]:
    iocs = alert.get("iocs")
    if not isinstance(iocs, list):
        return None
    for ioc in iocs:
        if not isinstance(ioc, dict):
            continue
        value = str(ioc.get("ioc_value") or "").strip()
        if value:
            return value
    return None


def _infer_source_type(alert: dict) -> Optional[str]:
    source_link = str(alert.get("alert_source_link") or "").lower()
    alert_source = str(alert.get("alert_source") or "").lower()
    combined = f"{source_link} {alert_source}"
    if any(hint in combined for hint in _WAZUH_SOURCE_HINTS):
        return "wazuh"
    return None


def _describe_source_status(alert: dict) -> dict:
    source_link = str(alert.get("alert_source_link") or "").strip()
    source_type = _infer_source_type(alert)
    notes: list[str] = []
    if not source_link:
        notes.append("IRIS alert has no source link")
        return {
            "status": "not_found",
            "source_type": source_type,
            "match_strategy": "none",
            "source_url": None,
            "source_ref": alert.get("alert_source_ref"),
            "event_time": alert.get("alert_source_event_time"),
            "notes": notes,
        }
    if source_type != "wazuh":
        notes.append("Source link is present but not recognized as a Wazuh source")
        return {
            "status": "unsupported",
            "source_type": source_type,
            "match_strategy": "none",
            "source_url": source_link,
            "source_ref": alert.get("alert_source_ref"),
            "event_time": alert.get("alert_source_event_time"),
            "notes": notes,
        }
    parsed = urlparse(source_link)
    if parsed.netloc:
        notes.append(f"Wazuh source host: {parsed.netloc}")
    return {
        "status": "not_found",
        "source_type": "wazuh",
        "match_strategy": "none",
        "source_url": source_link,
        "source_ref": alert.get("alert_source_ref"),
        "event_time": alert.get("alert_source_event_time"),
        "notes": notes,
    }


def _score_wazuh_event(event: dict, *, rule_id: Optional[str], ioc_value: Optional[str], event_time: Optional[datetime]) -> int:
    score = 0
    event_rule_id = str(((event.get("rule") or {}).get("id")) or "")
    if rule_id and event_rule_id == rule_id:
        score += 50
    data = event.get("data") or {}
    srcip = str(data.get("srcip") or "")
    dstip = str(data.get("dstip") or "")
    full_log = str(event.get("full_log") or "")
    if ioc_value and ioc_value in {srcip, dstip}:
        score += 40
    elif ioc_value and ioc_value in full_log:
        score += 20

    if event_time:
        matched_time = _parse_iris_datetime(event.get("@timestamp"))
        if matched_time:
            delta = abs((matched_time - event_time).total_seconds())
            if delta <= 30:
                score += 30
            elif delta <= 120:
                score += 20
            elif delta <= 300:
                score += 10
    return score


def _build_wazuh_summary(primary_event: Optional[dict]) -> dict:
    event = primary_event or {}
    rule = event.get("rule") or {}
    data = event.get("data") or {}
    decoder = event.get("decoder") or {}
    mitre = rule.get("mitre") or {}
    agent = event.get("agent") or {}
    return {
        "agent_name": agent.get("name"),
        "rule_id": str(rule.get("id")) if rule.get("id") is not None else None,
        "rule_level": rule.get("level"),
        "srcip": data.get("srcip"),
        "dstip": data.get("dstip"),
        "decoder": decoder.get("name") or ((event.get("predecoder") or {}).get("program_name")),
        "groups": rule.get("groups") or [],
        "mitre": {
            "tactic": mitre.get("tactic") or [],
            "technique": mitre.get("technique") or [],
        },
    }


async def search_alert_context_candidates(
    rule_id: Optional[str],
    event_time: Optional[str],
    ioc_value: Optional[str],
    size: int = 8,
) -> list[dict]:
    from ..services import opensearch_service

    return await opensearch_service.search_alert_context_candidates(rule_id, event_time, ioc_value, size=size)


async def get_iris_alert_detail(alert_id: int) -> dict:
    raw = await get_iris_alert(alert_id)
    alert = extract_iris_alert_detail(raw)
    if not alert:
        return raw

    source_context = _describe_source_status(alert)
    primary_event: Optional[dict] = None
    related_events: list[dict] = []

    if source_context.get("source_type") == "wazuh":
        rule_id = str(alert.get("alert_source_ref") or "").strip() or None
        event_time = _parse_iris_datetime(alert.get("alert_source_event_time"))
        ioc_value = _extract_first_ioc_value(alert)

        try:
            candidates = await search_alert_context_candidates(
                rule_id,
                alert.get("alert_source_event_time"),
                ioc_value,
                size=8,
            )
            ranked = sorted(
                (event for event in candidates if isinstance(event, dict)),
                key=lambda event: _score_wazuh_event(event, rule_id=rule_id, ioc_value=ioc_value, event_time=event_time),
                reverse=True,
            )
            if ranked:
                primary_event = ranked[0]
                related_events = ranked[1:5]
                best_score = _score_wazuh_event(primary_event, rule_id=rule_id, ioc_value=ioc_value, event_time=event_time)
                source_context["status"] = "matched" if best_score >= 50 else "partial"
                source_context["match_strategy"] = "rule_ioc_time" if rule_id and ioc_value else "rule_time" if rule_id else "ioc_time" if ioc_value else "none"
            else:
                source_context["status"] = "not_found"
                source_context["notes"] = [*source_context.get("notes", []), "No Wazuh events matched the alert correlation window"]
        except Exception as exc:
            logger.error("IRIS alert %s Wazuh enrichment failed: %s", alert_id, exc)
            source_context["status"] = "error"
            source_context["notes"] = [*source_context.get("notes", []), f"OpenSearch lookup failed: {exc}"]

    return {
        "status": raw.get("status", "success") if isinstance(raw, dict) else "success",
        "message": raw.get("message", "") if isinstance(raw, dict) else "",
        "data": {
            "alert": alert,
            "source_context": source_context,
            "wazuh_context": {
                "primary_event": primary_event,
                "related_events": related_events,
                "summary": _build_wazuh_summary(primary_event),
            },
        },
    }


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


async def update_iris_alert(alert_id: int, data: dict) -> dict:
    return await _iris_post(f"/alerts/update/{alert_id}", data)


async def escalate_iris_alerts(
    alert_ids: List[int],
    case_title: str,
    note: str = "",
    customer_id: int = 1,
) -> dict:
    return await _iris_post("/alerts/escalate", {
        "alert_ids": alert_ids,
        "iocs_import_mode": "as_event",
        "assets_import_mode": "as_event",
        "note": note,
        "case_title": case_title,
        "case_customer_id": customer_id,
    })


# ── IRIS Cases ─────────────────────────────────────────────────────────────────

async def get_iris_cases(page: int = 1, per_page: int = 20) -> dict:
    return await _iris_get("/manage/cases/list")


async def get_iris_case(case_id: int) -> dict:
    return await _iris_get(f"/manage/cases/{case_id}")


async def get_iris_case_states() -> dict:
    return await _iris_get("/manage/case-states/list")


async def create_iris_case(
    name: str,
    description: str,
    customer_id: int = 1,
) -> dict:
    import time as _time
    soc_id = f"SOC-{int(_time.time())}"

    # Primary path: direct case creation
    result = await _iris_post("/manage/cases/add", {
        "case_name": name,
        "case_description": description,
        "case_customer_id": customer_id,
        "case_soc_id": soc_id,
    })

    # If direct creation succeeds, return it
    if isinstance(result, dict) and result.get("status") == "success":
        return result
    if isinstance(result, dict) and isinstance(result.get("data"), dict) and result["data"].get("case_id"):
        return result

    # Fallback: create alert then escalate → creates case via IRIS internal path
    logger.warning("create_iris_case direct path failed (%s), trying alert→escalation fallback", result.get("error", result))
    try:
        alert_resp = await _iris_post("/alerts/add", {
            "alert_title": name,
            "alert_description": description,
            "alert_source": "SOC Center",
            "alert_source_ref": soc_id,
            "alert_source_event_time": __import__("datetime").datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S"),
            "alert_severity_id": 5,
            "alert_status_id": 2,
            "alert_customer_id": customer_id,
            "alert_tags": "soc-center,auto-case",
        })
        alert_id = None
        if isinstance(alert_resp, dict):
            alert_id = alert_resp.get("data", {}).get("alert_id") if isinstance(alert_resp.get("data"), dict) else None

        if alert_id:
            esc_resp = await _iris_post("/alerts/escalate", {
                "alert_ids": [alert_id],
                "case_title": name,
                "case_customer_id": customer_id,
                "iocs_import_mode": "as_event",
                "assets_import_mode": "as_event",
                "note": description,
            })
            if isinstance(esc_resp, dict) and esc_resp.get("status") == "success":
                return esc_resp
            # Return alert_id as a pseudo-case reference if escalation also fails
            return {
                "status": "partial",
                "message": "Case creation failed; IRIS alert created as substitute",
                "data": {"alert_id": alert_id, "case_id": None},
                "error_detail": str(result.get("error", "")),
            }
    except Exception as e:
        logger.error("create_iris_case fallback path failed: %s", e)

    return result


async def update_iris_case(case_id: int, data: dict) -> dict:
    return await _iris_post(f"/manage/cases/update/{case_id}", data)


def _extract_iris_case(payload: object) -> dict:
    if not isinstance(payload, dict):
        return {}
    data = payload.get("data")
    return data if isinstance(data, dict) else {}


def _extract_iris_case_states(payload: object) -> list[dict]:
    if not isinstance(payload, dict):
        return []
    data = payload.get("data")
    if not isinstance(data, list):
        return []
    return [state for state in data if isinstance(state, dict)]


def _iris_ok(payload: object) -> bool:
    if not isinstance(payload, dict):
        return False
    if payload.get("error"):
        return False
    status = str(payload.get("status") or "").lower()
    if status in {"success", "ok"}:
        return True
    data = payload.get("data")
    if isinstance(data, dict) and (data.get("case_id") or data.get("status") == "success"):
        return True
    return False


async def set_iris_case_status(case_id: int, status_id: int) -> dict:
    return await set_iris_case_state(case_id, status_id)


async def set_iris_case_state(case_id: int, state_id: int) -> dict:
    states_payload = await get_iris_case_states()
    states = _extract_iris_case_states(states_payload)
    closed_state_id = next(
        (
            int(state["state_id"])
            for state in states
            if str(state.get("state_name") or "").strip().lower() == "closed"
        ),
        9,
    )

    current = await get_iris_case(case_id)
    current_data = _extract_iris_case(current)
    is_closed = bool(current_data.get("close_date") or current_data.get("case_close_date"))
    current_state_name = str(current_data.get("state_name") or "").strip().lower()
    if current_state_name == "closed" or current_data.get("state_id") == closed_state_id:
        is_closed = True

    if state_id == closed_state_id:
        result = await close_iris_case(case_id)
        if _iris_ok(result):
            detail = await get_iris_case(case_id)
            case_data = _extract_iris_case(detail)
            if case_data:
                result["case"] = case_data
            result["state_id"] = state_id
        return result

    if is_closed:
        reopen_result = await reopen_iris_case(case_id)
        if not _iris_ok(reopen_result):
            return reopen_result

    if current_data.get("state_id") == state_id and not is_closed:
        return {
            "status": "success",
            "message": "unchanged",
            "data": current_data,
            "case": current_data,
            "state_id": state_id,
        }

    result = await update_iris_case(case_id, {"state_id": state_id})
    if _iris_ok(result):
        detail = await get_iris_case(case_id)
        case_data = _extract_iris_case(detail)
        if case_data:
            result["case"] = case_data
        result["state_id"] = state_id
    return result


async def close_iris_case(case_id: int) -> dict:
    return await _iris_post(f"/manage/cases/close/{case_id}", {})


async def reopen_iris_case(case_id: int) -> dict:
    return await _iris_post(f"/manage/cases/reopen/{case_id}", {})


# ── Case Notes ─────────────────────────────────────────────────────────────────

async def get_case_note_groups(case_id: int) -> dict:
    return await _iris_get(f"/case/notes/directories/filter?cid={case_id}")


async def add_case_note_group(case_id: int, title: str) -> dict:
    return await _iris_post(f"/case/notes/directories/add?cid={case_id}", {
        "name": title,
        "parent_id": None,
    })


async def get_case_note(case_id: int, note_id: int) -> dict:
    return await _iris_get(f"/case/notes/{note_id}?cid={case_id}")


async def add_case_note(case_id: int, title: str, content: str, group_id: int) -> dict:
    return await _iris_post(f"/case/notes/add?cid={case_id}", {
        "note_title": title,
        "note_content": content,
        "directory_id": group_id,
    })


# ── Case IOCs ──────────────────────────────────────────────────────────────────

async def get_case_iocs(case_id: int) -> dict:
    return await _iris_get(f"/case/ioc/list?cid={case_id}")


async def add_case_ioc(
    case_id: int,
    value: str,
    type_id: int = 76,
    tlp_id: int = 2,
    description: str = "",
) -> dict:
    return await _iris_post(f"/case/ioc/add?cid={case_id}", {
        "ioc_value": value,
        "ioc_type_id": type_id,
        "ioc_tlp_id": tlp_id,
        "ioc_description": description,
    })


# ── Case Timeline ──────────────────────────────────────────────────────────────

async def get_case_timeline(case_id: int) -> dict:
    return await _iris_get(f"/case/timeline/events/list?cid={case_id}")


async def add_case_timeline_event(
    case_id: int,
    title: str,
    content: str,
    event_date: str,
    event_tz: str = "+07:00",
    event_color: str = "#1bfac3",
) -> dict:
    normalized_event_date = event_date.strip()
    if _IRIS_DATETIME_MINUTE_RE.match(normalized_event_date):
        normalized_event_date = f"{normalized_event_date}:00.000"
    elif _IRIS_DATETIME_SECOND_RE.match(normalized_event_date):
        normalized_event_date = f"{normalized_event_date}.000"

    return await _iris_post(f"/case/timeline/events/add?cid={case_id}", {
        "event_title": title,
        "event_content": content,
        "event_date": normalized_event_date,
        "event_tz": event_tz,
        "event_category_id": 1,
        "event_assets": [],
        "event_iocs": [],
        "event_in_summary": False,
        "event_color": event_color,
    })


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
        return {"ok": False, "error": "Webhook URL not configured", "error_th": "ยังไม่ได้ตั้งค่า Shuffle Webhook URL"}
    try:
        async with httpx.AsyncClient(verify=_SSL, timeout=_TIMEOUT) as c:
            r = await c.post(
                url,
                json={"execution_argument": payload, "start": ""},
                headers=_shuffle_headers(),
            )

        # Shuffle returns {"success": true/false} in body; use that to determine ok
        body_text = r.text[:400]
        execution_id: Optional[str] = None
        shuffle_success: Optional[bool] = None
        try:
            body_json = r.json()
            if isinstance(body_json, dict):
                if "success" in body_json:
                    shuffle_success = bool(body_json["success"])
                execution_id = body_json.get("execution_id") or body_json.get("id")
        except Exception:
            body_json = {}

        http_ok = r.status_code < 400
        # If Shuffle explicitly says success=false with HTTP 200, treat as failure
        ok = http_ok if shuffle_success is None else (http_ok and shuffle_success)

        result: dict = {"status": r.status_code, "ok": ok, "body": body_text}
        if execution_id:
            result["execution_id"] = str(execution_id)
        if shuffle_success is False:
            result["shuffle_message"] = "Shuffle workflow execution failed (success=false)"
        return result
    except Exception as e:
        logger.error("Shuffle webhook %s: %s", url, e)
        return {"ok": False, "error": str(e)}


# ── MISP ───────────────────────────────────────────────────────────────────────

def _json_or_error(response: httpx.Response, service: str) -> dict:
    try:
        response.raise_for_status()
        return response.json()
    except httpx.HTTPStatusError as e:
        return {"error": f"{service} HTTP {e.response.status_code}"}
    except ValueError:
        return {"error": f"{service} returned non-JSON response"}


async def _misp_get(path: str, timeout: int = _TIMEOUT) -> dict:
    if not settings.misp_url or not settings.misp_api_key:
        return {"error": "MISP not configured"}
    try:
        async with httpx.AsyncClient(verify=_SSL, timeout=timeout) as c:
            r = await c.get(f"{settings.misp_url}{path}", headers=_misp_headers())
            return _json_or_error(r, "MISP")
    except httpx.TimeoutException:
        logger.warning("MISP GET %s timed out after %ss", path, timeout)
        return {"error": f"MISP request timed out after {timeout}s"}
    except Exception as e:
        logger.error("MISP GET %s: %s", path, e)
        return {"error": str(e)}


async def _misp_post(path: str, data: dict, timeout: int = 30) -> dict:
    if not settings.misp_url or not settings.misp_api_key:
        return {"error": "MISP not configured"}
    try:
        async with httpx.AsyncClient(verify=_SSL, timeout=timeout) as c:
            r = await c.post(f"{settings.misp_url}{path}", headers=_misp_headers(), json=data)
            return _json_or_error(r, "MISP")
    except httpx.TimeoutException:
        logger.warning("MISP POST %s timed out after %ss", path, timeout)
        return {"error": f"MISP request timed out after {timeout}s"}
    except Exception as e:
        logger.error("MISP POST %s: %s", path, e)
        return {"error": str(e)}


async def get_misp_stats() -> dict:
    try:
        version_resp, sample_resp = await asyncio.gather(
            _misp_get("/servers/getVersion", timeout=5),
            _misp_post("/attributes/restSearch", {"returnFormat": "json", "limit": 1, "page": 1}, timeout=5),
        )
        version_ok = isinstance(version_resp, dict) and "error" not in version_resp
        sample_ok = isinstance(sample_resp, dict) and "error" not in sample_resp
        if not version_ok:
            return {
                "connected": False,
                "total_iocs": 0,
                "by_type": {},
                "misp_url": settings.misp_url,
                "stats_available": False,
                "search_available": sample_ok,
                "error": version_resp.get("error", "MISP version check failed"),
            }

        return {
            "connected": True,
            "total_iocs": None,
            "by_type": {},
            "misp_url": settings.misp_url,
            "version": version_resp.get("version"),
            "stats_available": False,
            "search_available": sample_ok,
            "stats_note": "Live IOC search is available. Aggregate statistics are skipped because attributeStatistics is slow on this instance.",
        }
    except Exception as e:
        return {"connected": False, "error": str(e)}


async def search_misp_ioc(value: str, ioc_type: Optional[str] = None) -> dict:
    body: dict = {"returnFormat": "json", "value": value, "enforceWarninglist": 1, "limit": 50}
    if ioc_type:
        body["type"] = ioc_type
    return await _misp_post("/attributes/restSearch", body)
