"""
Alerts Router — Wazuh Security Alert Management
Endpoints: list, stats/aggregations, recent, export
"""
import io, csv
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from typing import Literal, Optional
from ..routers.auth import get_current_user
from ..models.database import AlertSeverityOverride, AlertTuning, get_db
from ..services import opensearch_service
from ..services.alert_tuning_service import _apply_alert_tuning, _compose_alert_id
from ..services.alert_tuning_history_service import record_tuning_history

router = APIRouter(prefix="/alerts", tags=["alerts"])

# Rule descriptions cache (populated from aggregation results)
_RULE_DESC_CACHE: dict[str, str] = {}

_GROUP_TO_SOURCE = [
    ("fortigate_wuh", "FortiGate WUH"),
    ("huawei_usg",    "Huawei USG/FW"),
    ("huawei_ac",     "Huawei Agile Controller"),
    ("mikrotik",      "MikroTik Router"),
    ("infoblox_dhcp", "Infoblox DHCP"),
    ("infoblox_dns",  "Infoblox DNS"),
    ("infoblox",      "Infoblox"),
    ("suricata",      "Suricata IDS"),
    ("ids",           "Suricata IDS"),
]


class SeverityOverrideBody(BaseModel):
    scope: Literal["single", "rule"]
    alert_id: Optional[str] = None
    rule_id: Optional[str] = None
    original_level: int = Field(..., ge=1, le=15)
    tuned_level: int = Field(..., ge=1, le=15)
    reason: str = Field(..., min_length=3, max_length=1000)


def require_alert_tuning_user(current_user=Depends(get_current_user)):
    if current_user.role not in ("admin", "superadmin"):
        raise HTTPException(status_code=403, detail="Admin role required for alert severity tuning")
    return current_user


def _resolve_source(alert: dict) -> str:
    """Derive human-readable source label from rule.groups or predecoder.program_name."""
    groups = alert.get("rule", {}).get("groups", [])
    for grp_key, label in _GROUP_TO_SOURCE:
        if grp_key in groups:
            return label
    prog = alert.get("predecoder", {}).get("program_name", "")
    return prog or "unknown"


def _active_rule_tunings(db: Session) -> list[AlertTuning]:
    return db.query(AlertTuning).filter(AlertTuning.status == "active").all()


def _active_alert_overrides(db: Session, alert_ids: list[str]) -> list[AlertSeverityOverride]:
    if not alert_ids:
        return []
    return (
        db.query(AlertSeverityOverride)
        .filter(AlertSeverityOverride.status == "active", AlertSeverityOverride.alert_id.in_(alert_ids))
        .all()
    )


# ── List alerts ────────────────────────────────────────────────────────────────

@router.get("")
async def get_alerts(
    level:        int = Query(1, ge=1, le=15),
    level_max:    Optional[int] = Query(None),
    source:       Optional[str] = None,
    agent:        Optional[str] = None,
    rule_id:      Optional[str] = None,
    country:      Optional[str] = None,
    mitre_tactic: Optional[str] = None,
    group:        Optional[str] = None,
    srcip:        Optional[str] = None,
    dstip:        Optional[str] = None,
    decoder:      Optional[str] = None,
    program:      Optional[str] = None,
    compliance:   Optional[str] = None,
    has_srcip:    Optional[bool] = None,
    has_mitre:    Optional[bool] = None,
    limit:        int = Query(200, ge=1, le=1000),
    time_range:   str = Query("24h"),
    q:            Optional[str] = None,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    sources = [source] if source else None
    alerts = await opensearch_service.get_alerts(
        size=limit,
        level_min=level,
        level_max=level_max,
        sources=sources,
        time_range=time_range,
        query_str=q,
        agent_name=agent or None,
        rule_id=rule_id or None,
        country=country or None,
        mitre_tactic=mitre_tactic or None,
        group=group or None,
        srcip=srcip or None,
        dstip=dstip or None,
        decoder=decoder or None,
        program=program or None,
        compliance=compliance or None,
        has_srcip=has_srcip,
        has_mitre=has_mitre,
    )
    alert_ids = [_compose_alert_id(alert) for alert in alerts if isinstance(alert, dict)]
    return _apply_alert_tuning(alerts, _active_rule_tunings(db), _active_alert_overrides(db, alert_ids))


@router.post("/severity-override")
async def set_severity_override(
    body: SeverityOverrideBody,
    current_user=Depends(require_alert_tuning_user),
    db: Session = Depends(get_db),
):
    if body.scope == "single":
        alert_id = (body.alert_id or "").strip()
        if not alert_id:
            raise HTTPException(status_code=400, detail="alert_id is required for single-alert tuning")
        entry = db.query(AlertSeverityOverride).filter(AlertSeverityOverride.alert_id == alert_id).first()
        action = "create"
        previous_tuned_level = None
        if entry is None:
            entry = AlertSeverityOverride(
                alert_id=alert_id,
                rule_id=(body.rule_id or "").strip() or None,
                original_level=body.original_level,
                tuned_level=body.tuned_level,
                reason=body.reason,
                added_by=current_user.username,
            )
            db.add(entry)
        else:
            action = "update"
            previous_tuned_level = entry.tuned_level
            entry.rule_id = (body.rule_id or "").strip() or entry.rule_id
            entry.original_level = body.original_level
            entry.tuned_level = body.tuned_level
            entry.reason = body.reason
            entry.added_by = current_user.username
            entry.status = "active"
        record_tuning_history(
            db,
            actor=current_user.username,
            action=action,
            scope="single",
            alert_id=alert_id,
            rule_id=(body.rule_id or "").strip() or None,
            original_level=body.original_level,
            tuned_level=body.tuned_level,
            previous_tuned_level=previous_tuned_level,
            reason=body.reason,
            status="active",
            commit=False,
        )
        db.commit()
        db.refresh(entry)
        return {"id": entry.id, "scope": "single", "alert_id": entry.alert_id, "tuned_level": entry.tuned_level}

    rule_id = (body.rule_id or "").strip()
    if not rule_id:
        raise HTTPException(status_code=400, detail="rule_id is required for rule tuning")
    entry = db.query(AlertTuning).filter(AlertTuning.rule_id == rule_id).first()
    action = "create"
    previous_tuned_level = None
    if entry is None:
        entry = AlertTuning(
            rule_id=rule_id,
            original_level=body.original_level,
            tuned_level=body.tuned_level,
            reason=body.reason,
            added_by=current_user.username,
        )
        db.add(entry)
    else:
        action = "update"
        previous_tuned_level = entry.tuned_level
        entry.original_level = body.original_level
        entry.tuned_level = body.tuned_level
        entry.reason = body.reason
        entry.added_by = current_user.username
        entry.status = "active"
    record_tuning_history(
        db,
        actor=current_user.username,
        action=action,
        scope="rule",
        rule_id=rule_id,
        original_level=body.original_level,
        tuned_level=body.tuned_level,
        previous_tuned_level=previous_tuned_level,
        reason=body.reason,
        status="active",
        commit=False,
    )
    db.commit()
    db.refresh(entry)
    return {"id": entry.id, "scope": "rule", "rule_id": entry.rule_id, "tuned_level": entry.tuned_level}


@router.get("/recent")
async def recent_alerts(
    limit: int = Query(20, le=100),
    level: int = Query(7),
    current_user=Depends(get_current_user),
):
    return await opensearch_service.get_alerts(size=limit, level_min=level, time_range="1h")


# ── Stats / Aggregations ───────────────────────────────────────────────────────

@router.get("/stats")
async def alert_stats(
    time_range: str = Query("24h"),
    level:      int = Query(1),
    current_user=Depends(get_current_user),
):
    """
    Returns aggregated statistics:
    - by_level (critical/high/medium/low counts)
    - timeline (per interval with severity breakdown)
    - by_source (top log programs)
    - by_rule (top rule IDs with descriptions)
    - by_agent (top Wazuh agents)
    - by_country (top source countries)
    - by_mitre (top MITRE tactics)
    - by_srcip (top attacking IPs)
    - total count
    """
    raw = await opensearch_service.get_alert_aggs(time_range=time_range, level_min=level)
    if not raw:
        return {"total": 0, "by_level": {}, "timeline": [], "by_source": [], "by_rule": [],
                "by_agent": [], "by_country": [], "by_mitre": [], "by_srcip": []}

    aggs  = raw.get("aggregations", {})
    total = raw.get("hits", {}).get("total", {}).get("value", 0)

    # by_level
    level_buckets = aggs.get("by_level", {}).get("buckets", [])
    by_level = {b["key"]: b["doc_count"] for b in level_buckets}

    # timeline with severity breakdown
    tl_buckets = aggs.get("timeline", {}).get("buckets", [])
    timeline = []
    for b in tl_buckets:
        sev = {sv["key"]: sv["doc_count"] for sv in b.get("by_severity", {}).get("buckets", [])}
        timeline.append({
            "time":     b["key_as_string"],
            "total":    b["doc_count"],
            "critical": sev.get("critical", 0),
            "high":     sev.get("high", 0),
            "medium":   sev.get("medium", 0),
        })

    def _buckets(key, n=10):
        return [{"name": b["key"], "count": b["doc_count"]}
                for b in aggs.get(key, {}).get("buckets", [])[:n]]

    def _source_buckets(key, n=10):
        raw = aggs.get(key, {}).get("buckets", {})
        result = [{"name": name, "count": b["doc_count"]} for name, b in raw.items() if b["doc_count"] > 0]
        result.sort(key=lambda x: x["count"], reverse=True)
        return result[:n]

    return {
        "total":      total,
        "by_level":   by_level,
        "timeline":   timeline,
        "by_source":  _source_buckets("by_source"),
        "by_rule":    _buckets("by_rule", 15),
        "by_agent":   _buckets("by_agent"),
        "by_country": _buckets("by_country"),
        "by_mitre":   _buckets("by_mitre"),
        "by_srcip":   _buckets("by_srcip"),
        "by_group":   _buckets("by_group", 15),
        "by_decoder": _buckets("by_decoder", 10),
    }


# ── Facets ─────────────────────────────────────────────────────────────────────

@router.get("/facets")
async def alert_facets(
    time_range: str = Query("24h"),
    level:      int = Query(12),
    current_user=Depends(get_current_user),
):
    """Filter facets: sources (with filter keys), groups, agents, countries, decoders, mitre, srcips."""
    raw = await opensearch_service.get_alert_aggs(time_range=time_range, level_min=level)
    if not raw:
        return {"sources": [], "groups": [], "agents": [], "countries": [], "decoders": [], "mitre": [], "srcips": [], "rules": []}

    aggs = raw.get("aggregations", {})

    _SOURCE_LABEL_TO_KEY = {
        "MikroTik Router":  "mikrotik",
        "FortiGate WUH":    "fortigate",
        "Huawei USG/FW":    "huawei_usg",
        "Huawei AC WiFi":   "huawei_ac",
        "Huawei Agile Controller": "huawei_ac",
        "Infoblox DNS":     "infoblox_dns",
        "Infoblox DHCP":    "infoblox_dhcp",
        "Suricata IDS":     "suricata",
        "Linux/SSH":        "sshd",
        "Linux/System":     "systemd",
    }
    raw_sources = aggs.get("by_source", {}).get("buckets", {})
    sources = []
    for label, bucket in (raw_sources.items() if isinstance(raw_sources, dict) else []):
        count = bucket.get("doc_count", 0)
        if count > 0:
            sources.append({
                "label": label,
                "key": _SOURCE_LABEL_TO_KEY.get(label, label.lower().replace(" ", "_")),
                "count": count,
            })
    sources.sort(key=lambda x: x["count"], reverse=True)

    def _buckets(key, n=15):
        return [{"name": b["key"], "count": b["doc_count"]}
                for b in aggs.get(key, {}).get("buckets", [])[:n]
                if b["doc_count"] > 0]

    return {
        "sources":   sources,
        "groups":    _buckets("by_group", 15),
        "agents":    _buckets("by_agent"),
        "countries": _buckets("by_country"),
        "decoders":  _buckets("by_decoder"),
        "mitre":     _buckets("by_mitre"),
        "srcips":    _buckets("by_srcip"),
        "rules":     _buckets("by_rule", 15),
    }


# ── Export ─────────────────────────────────────────────────────────────────────

@router.get("/export")
async def export_alerts(
    fmt:        str = Query("csv"),
    level:      int = Query(1),
    source:     Optional[str] = None,
    time_range: str = Query("24h"),
    q:          Optional[str] = None,
    limit:      int = Query(2000, le=5000),
    group:      Optional[str] = None,
    srcip:      Optional[str] = None,
    dstip:      Optional[str] = None,
    decoder:    Optional[str] = None,
    country:    Optional[str] = None,
    compliance: Optional[str] = None,
    agent:      Optional[str] = None,
    mitre_tactic: Optional[str] = None,
    current_user=Depends(get_current_user),
):
    sources = [source] if source else None
    alerts = await opensearch_service.get_alerts(
        size=limit, level_min=level, sources=sources, time_range=time_range, query_str=q,
        group=group or None, srcip=srcip or None, dstip=dstip or None,
        decoder=decoder or None, country=country or None, compliance=compliance or None,
        agent_name=agent or None, mitre_tactic=mitre_tactic or None,
    )

    if fmt == "json":
        import json
        content = json.dumps(alerts, default=str, ensure_ascii=False, indent=2)
        return Response(
            content=content,
            media_type="application/json",
            headers={"Content-Disposition": f'attachment; filename="alerts-{time_range}.json"'},
        )

    # CSV
    buf = io.StringIO()
    fields = ["timestamp", "level", "rule_id", "description", "source", "srcip", "dstip",
              "country", "agent", "groups"]
    writer = csv.DictWriter(buf, fieldnames=fields, extrasaction="ignore")
    writer.writeheader()
    for a in alerts:
        rule = a.get("rule", {})
        writer.writerow({
            "timestamp":   a.get("@timestamp", ""),
            "level":       rule.get("level", ""),
            "rule_id":     rule.get("id", ""),
            "description": rule.get("description", ""),
            "source":      _resolve_source(a),
            "srcip":       a.get("data", {}).get("srcip", ""),
            "dstip":       a.get("data", {}).get("dstip", ""),
            "country":     a.get("GeoLocation", {}).get("country_name", ""),
            "agent":       a.get("agent", {}).get("name", ""),
            "groups":      "|".join(rule.get("groups", [])),
        })
    content = buf.getvalue().encode("utf-8-sig")
    return StreamingResponse(
        io.BytesIO(content),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="alerts-{time_range}.csv"'},
    )
