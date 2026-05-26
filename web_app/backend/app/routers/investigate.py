"""
Investigate Router — Entity investigation & forensic analysis
Supports: IP · MAC · Username · Hostname (auto-detect)
"""
import ipaddress
from collections import Counter, defaultdict
from fastapi import APIRouter, Depends, Query
from ..routers.auth import get_current_user
from ..services import opensearch_service, enrichment_service
from ..services.soar_svc import get_iris_alerts

router = APIRouter(prefix="/investigate", tags=["investigate"])


def _detect_entity_type(value: str) -> str:
    value = value.strip()
    try:
        ipaddress.ip_address(value)
        return "ip"
    except ValueError:
        pass
    # MAC address  e.g. aa:bb:cc:dd:ee:ff or aa-bb-cc-dd-ee-ff
    import re
    if re.fullmatch(r"([0-9a-fA-F]{2}[:\-]){5}[0-9a-fA-F]{2}", value):
        return "mac"
    return "auto"


def _build_hourly_timeline(events: list) -> list:
    from datetime import datetime
    hourly: Counter = Counter()
    for e in events:
        ts = e.get("@timestamp")
        if ts:
            try:
                dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
                key = dt.strftime("%m/%d %H:00")
                hourly[key] += 1
            except Exception:
                pass
    return [{"time": k, "count": v} for k, v in sorted(hourly.items())]


def _extract_mitre(events: list) -> list:
    """Collect unique MITRE ATT&CK tactics/techniques from events."""
    tactics:    set = set()
    techniques: set = set()
    for e in events:
        rule = e.get("rule", {})
        mitre = rule.get("mitre", {})
        if isinstance(mitre, dict):
            for t in mitre.get("tactic", []):
                if t:
                    tactics.add(t)
            for t in mitre.get("technique", []):
                if t:
                    techniques.add(t)
        # Also check rule.groups
        for g in (rule.get("groups") or []):
            if g.startswith("attack."):
                techniques.add(g.replace("attack.", ""))
    return {
        "tactics":    sorted(tactics),
        "techniques": sorted(techniques),
    }


def _extract_level_dist(events: list) -> dict:
    dist = {"critical": 0, "high": 0, "medium": 0, "low": 0}
    for e in events:
        lv = int(e.get("rule", {}).get("level") or 0)
        if lv >= 15:   dist["critical"] += 1
        elif lv >= 12: dist["high"]     += 1
        elif lv >= 7:  dist["medium"]   += 1
        else:          dist["low"]      += 1
    return dist


@router.get("")
async def investigate(
    q:          str = Query(...),
    type:       str = Query("auto"),
    time_range: str = Query("30d"),
    size:       int = Query(500, le=1000),
    current_user=Depends(get_current_user),
):
    """
    Full entity investigation — returns events, identity summary,
    DHCP/WiFi breakdown, MITRE mapping, correlation, and hourly timeline.
    """
    # Auto-detect type if needed
    entity_type = type if type != "auto" else _detect_entity_type(q)

    events = await opensearch_service.investigate_entity(q, entity_type, time_range, size)
    identity = opensearch_service.summarize_entity_events(events, entity_value=q)

    dhcp_events = [e for e in events if e.get("data", {}).get("dhcp_action")]
    wifi_events = [
        e for e in events
        if e.get("data", {}).get("ac_msg_type")
        or e.get("predecoder", {}).get("program_name") == "huawei-ac"
    ]

    # Source programs breakdown
    prog_counter: Counter = Counter()
    for e in events:
        p = e.get("predecoder", {}).get("program_name")
        if p:
            prog_counter[p] += 1
    top_sources = [{"name": k, "count": v} for k, v in prog_counter.most_common(10)]

    return {
        "query":       q,
        "type":        entity_type,
        "time_range":  time_range,
        "events":      events,
        "count":       len(events),
        "identity":    identity,
        "dhcp":        dhcp_events[:100],
        "wifi":        wifi_events[:100],
        "mitre":       _extract_mitre(events),
        "level_dist":  _extract_level_dist(events),
        "hourly":      _build_hourly_timeline(events),
        "top_sources": top_sources,
        "correlation": {
            "related_ips":    identity.get("ips", []),
            "related_macs":   identity.get("macs", []),
            "related_users":  identity.get("users", []),
            "related_agents": identity.get("agents", []),
            "top_rules":      identity.get("top_rules", []),
            "ip_conflicts":   identity.get("ip_conflicts", {}),
        },
    }


@router.get("/enrich")
async def enrich(
    ip: str = Query(...),
    current_user=Depends(get_current_user),
):
    """Full threat intelligence enrichment for an IP address."""
    result = await enrichment_service.search_ioc(ip)
    return {
        "ip":         ip,
        "ioc_type":   result.get("ioc_type"),
        "is_private": result.get("is_private", False),
        "feeds":      result.get("sources", {}),
    }


@router.get("/netflow")
async def investigate_netflow(
    q: str = Query(...),
    time_range: str = Query("30d"),
    current_user=Depends(get_current_user),
):
    """Aggregation-based network traffic analysis for an IP — fast, no raw event fetch."""
    return await opensearch_service.get_entity_network_stats(q, time_range)


@router.get("/iris-context")
async def iris_context(
    q: str = Query(...),
    current_user=Depends(get_current_user),
):
    """Check if an entity (IP/hostname) appears in DFIR-IRIS alerts or IOCs."""
    iris_resp = await get_iris_alerts(per_page=100)
    alerts_data = iris_resp.get("data", {})
    all_alerts = alerts_data.get("alerts", []) if isinstance(alerts_data, dict) else []

    q_lower = q.lower()
    matched = []
    for a in all_alerts:
        # Check IOCs
        ioc_match = any(
            q_lower in (ioc.get("ioc_value") or "").lower()
            for ioc in (a.get("iocs") or [])
        )
        # Check description / title
        desc_match = (
            q_lower in (a.get("alert_description") or "").lower()
            or q_lower in (a.get("alert_title") or "").lower()
        )
        if ioc_match or desc_match:
            matched.append({
                "alert_id":    a.get("alert_id"),
                "alert_title": a.get("alert_title"),
                "severity":    a.get("severity", {}).get("severity_name"),
                "status":      a.get("status", {}).get("status_name"),
                "created":     a.get("alert_creation_time"),
                "iocs":        [i.get("ioc_value") for i in (a.get("iocs") or [])],
            })

    return {
        "query":       q,
        "found":       len(matched) > 0,
        "alert_count": len(matched),
        "alerts":      matched[:5],
    }
