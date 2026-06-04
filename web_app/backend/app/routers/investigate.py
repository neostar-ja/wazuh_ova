"""
Investigate Router — SOC Investigation Workbench
Supports: IP · MAC · Username · Hostname · Domain · Hash (auto-detect)

Data sources: Wazuh/OpenSearch · Infoblox DNS/DHCP · Huawei NAC · DFIR-IRIS · MISP · Shuffle
"""
import asyncio
import ipaddress
import json
from collections import Counter, defaultdict
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from ..routers.auth import get_current_user
from ..models.database import get_db, IOCEnrichmentCache
from ..services import opensearch_service, enrichment_service
from ..services.soar_svc import get_iris_alerts
from ..core.config import settings

router = APIRouter(prefix="/investigate", tags=["investigate"])


# ─── Entity type detection ───────────────────────────────────────────────────

def _detect_entity_type(value: str) -> str:
    value = value.strip()
    try:
        ipaddress.ip_address(value)
        return "ip"
    except ValueError:
        pass
    import re
    if re.fullmatch(r"([0-9a-fA-F]{2}[:\-]){5}[0-9a-fA-F]{2}", value):
        return "mac"
    return "auto"


# ─── Event aggregation helpers ───────────────────────────────────────────────

def _build_hourly_timeline(events: list) -> list:
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


def _extract_mitre(events: list) -> dict:
    tactics: set = set()
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
        for g in (rule.get("groups") or []):
            if g.startswith("attack."):
                techniques.add(g.replace("attack.", ""))
    return {"tactics": sorted(tactics), "techniques": sorted(techniques)}


def _extract_level_dist(events: list) -> dict:
    dist = {"critical": 0, "high": 0, "medium": 0, "low": 0}
    for e in events:
        lv = int(e.get("rule", {}).get("level") or 0)
        if lv >= 15:   dist["critical"] += 1
        elif lv >= 12: dist["high"]     += 1
        elif lv >= 7:  dist["medium"]   += 1
        else:          dist["low"]      += 1
    return dist


# ─── Source health helpers ───────────────────────────────────────────────────

def _is_configured(url: str, key: str = "") -> bool:
    return bool((url or "").strip()) or bool((key or "").strip())


def _source_status(configured: bool, event_count: int = -1) -> dict:
    if not configured:
        return {"status": "not_configured", "label": "ยังไม่ได้เชื่อมต่อ"}
    if event_count == 0:
        return {"status": "no_data", "label": "ไม่พบข้อมูล"}
    if event_count > 0:
        return {"status": "online", "label": f"{event_count:,} events"}
    return {"status": "configured", "label": "พร้อมใช้งาน"}


# ─── Risk scoring ────────────────────────────────────────────────────────────

def _compute_risk_score(
    level_dist: dict,
    threat_score: int = 0,
    misp_matched: bool = False,
    has_dns_block: bool = False,
    nac_posture_fail: bool = False,
    critical_cves: int = 0,
    asset_criticality: str = "",
) -> dict:
    factors = []
    total = 0

    # 1. Alert severity (max 40)
    w = (
        (level_dist.get("critical", 0) * 10) +
        (level_dist.get("high", 0) * 6) +
        (level_dist.get("medium", 0) * 3)
    )
    sev_score = min(40, w)
    total += sev_score
    if sev_score > 0:
        factors.append({
            "key": "alert_severity",
            "label": "ความรุนแรงของ Alert",
            "description": (
                f"Critical {level_dist.get('critical', 0)} · High {level_dist.get('high', 0)} · "
                f"Medium {level_dist.get('medium', 0)}"
            ),
            "score": sev_score,
            "max": 40,
            "color": "#EF4444" if sev_score >= 25 else "#F17422" if sev_score >= 12 else "#EAB308",
        })

    # 2. Threat intel (max 20)
    ti_score = min(20, int(threat_score / 5))
    total += ti_score
    if ti_score > 0 or threat_score > 0:
        factors.append({
            "key": "threat_intel",
            "label": "Threat Intelligence",
            "description": f"คะแนน Threat Intel: {threat_score}/100",
            "score": ti_score,
            "max": 20,
            "color": "#EF4444" if ti_score >= 14 else "#F17422" if ti_score >= 8 else "#EAB308",
        })

    # 3. MISP (max 10)
    misp_score = 10 if misp_matched else 0
    total += misp_score
    if misp_score > 0:
        factors.append({
            "key": "misp",
            "label": "MISP Threat Intelligence",
            "description": "พบใน MISP database — IOC ที่รายงานโดย community",
            "score": misp_score,
            "max": 10,
            "color": "#EF4444",
        })

    # 4. DNS Block (max 10)
    dns_score = 10 if has_dns_block else 0
    total += dns_score
    if dns_score > 0:
        factors.append({
            "key": "dns_block",
            "label": "DNS Malicious Query",
            "description": "พบ DNS query ที่ถูก RPZ block หรือ query ไปยัง malicious domain",
            "score": dns_score,
            "max": 10,
            "color": "#EF4444",
        })

    # 5. NAC Posture (max 10)
    nac_score = 10 if nac_posture_fail else 0
    total += nac_score
    if nac_score > 0:
        factors.append({
            "key": "nac_posture",
            "label": "NAC Posture Failure",
            "description": "อุปกรณ์ไม่ผ่าน posture check หรือถูก quarantine โดย Huawei NAC",
            "score": nac_score,
            "max": 10,
            "color": "#F17422",
        })

    # 6. Critical CVEs (max 10)
    cve_score = min(10, critical_cves * 3)
    total += cve_score
    if cve_score > 0:
        factors.append({
            "key": "cve",
            "label": "Critical CVE",
            "description": f"พบ {critical_cves} รายการ Critical CVE ที่ยังไม่ได้แก้ไข",
            "score": cve_score,
            "max": 10,
            "color": "#F17422",
        })

    # 7. Asset criticality (max 10)
    crit_map = {"critical": 10, "high": 7, "medium": 4, "low": 2}
    asset_score = crit_map.get((asset_criticality or "").lower(), 0)
    total += asset_score
    if asset_score > 0:
        factors.append({
            "key": "asset_criticality",
            "label": "ความสำคัญของ Asset",
            "description": f"Asset ระดับ {asset_criticality or 'unknown'} — มีผลต่อ risk score",
            "score": asset_score,
            "max": 10,
            "color": "#EAB308" if asset_score <= 4 else "#F17422",
        })

    final_score = round(min(100, total) / 10, 1)
    risk_level = (
        "critical" if final_score >= 8 else
        "high" if final_score >= 6 else
        "medium" if final_score >= 4 else
        "low"
    )
    return {
        "score": final_score,
        "raw_score": total,
        "max_raw": 100,
        "level": risk_level,
        "factors": factors,
    }


# ─── Endpoints ───────────────────────────────────────────────────────────────

@router.get("")
async def investigate(
    q:          str = Query(...),
    type:       str = Query("auto"),
    time_range: str = Query("30d"),
    size:       int = Query(500, le=1000),
    current_user=Depends(get_current_user),
):
    """Full entity investigation — events, identity summary, DHCP/WiFi, MITRE, correlation."""
    entity_type = type if type != "auto" else _detect_entity_type(q)
    events = await opensearch_service.investigate_entity(q, entity_type, time_range, size)
    identity = opensearch_service.summarize_entity_events(events, entity_value=q)

    dhcp_events = [e for e in events if e.get("data", {}).get("dhcp_action")]
    wifi_events = [
        e for e in events
        if e.get("data", {}).get("ac_msg_type")
        or e.get("predecoder", {}).get("program_name") == "huawei-ac"
    ]

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
    db: Session = Depends(get_db),
):
    """Threat intelligence enrichment for an IP — with local enrichment cache."""
    now = datetime.utcnow()

    # Check cache first
    cached = db.query(IOCEnrichmentCache).filter(
        IOCEnrichmentCache.ioc_value == ip
    ).first()
    if cached and cached.expires_at and cached.expires_at > now:
        raw = json.loads(cached.raw_data or "{}")
        return {
            "ip": ip,
            "ioc_type": cached.ioc_type,
            "is_private": raw.get("is_private", False),
            "feeds": raw.get("sources", {}),
            "cached": True,
            "cached_at": cached.created_at.isoformat(),
            "expires_at": cached.expires_at.isoformat(),
            "source_statuses": json.loads(cached.source_statuses or "{}"),
        }

    result = await enrichment_service.search_ioc(ip)

    # Update cache
    expires = now + timedelta(hours=6)
    source_statuses = {
        src: ("ok" if data and data.get("score") is not None else "not_configured")
        for src, data in (result.get("sources") or {}).items()
    }
    if cached:
        cached.raw_data = json.dumps(result)
        cached.abuseipdb_score = result.get("sources", {}).get("abuseipdb", {}).get("score")
        cached.source_statuses = json.dumps(source_statuses)
        cached.created_at = now
        cached.expires_at = expires
    else:
        db.add(IOCEnrichmentCache(
            ioc_value=ip,
            ioc_type=result.get("ioc_type", "ip"),
            abuseipdb_score=result.get("sources", {}).get("abuseipdb", {}).get("score"),
            raw_data=json.dumps(result),
            source_statuses=json.dumps(source_statuses),
            created_at=now,
            expires_at=expires,
        ))
    try:
        db.commit()
    except Exception:
        db.rollback()

    return {
        "ip": ip,
        "ioc_type": result.get("ioc_type"),
        "is_private": result.get("is_private", False),
        "feeds": result.get("sources", {}),
        "cached": False,
        "cached_at": now.isoformat(),
        "expires_at": expires.isoformat(),
        "source_statuses": source_statuses,
    }


@router.get("/netflow")
async def investigate_netflow(
    q: str = Query(...),
    time_range: str = Query("30d"),
    current_user=Depends(get_current_user),
):
    """Aggregation-based network traffic analysis — fast, no raw event fetch."""
    return await opensearch_service.get_entity_network_stats(q, time_range)


@router.get("/iris-context")
async def iris_context(
    q: str = Query(...),
    current_user=Depends(get_current_user),
):
    """Check if an entity appears in DFIR-IRIS alerts or IOCs."""
    iris_resp = await get_iris_alerts(per_page=100)
    alerts_data = iris_resp.get("data", {})
    all_alerts = alerts_data.get("alerts", []) if isinstance(alerts_data, dict) else []

    q_lower = q.lower()
    matched = []
    for a in all_alerts:
        ioc_match = any(
            q_lower in (ioc.get("ioc_value") or "").lower()
            for ioc in (a.get("iocs") or [])
        )
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


@router.get("/sources/health")
async def sources_health(current_user=Depends(get_current_user)):
    """
    Check configuration and connectivity status for all integrated data sources.
    Returns status per source without making live connections (config-check only).
    """
    s = settings

    # OpenSearch event counts (fast count query, not heavy)
    os_count, dns_count, dhcp_count, nac_count = await asyncio.gather(
        opensearch_service.count_source_events("wazuh", "1d"),
        opensearch_service.count_source_events("infoblox_dns", "7d"),
        opensearch_service.count_source_events("infoblox_dhcp", "7d"),
        opensearch_service.count_source_events("huawei_nac", "7d"),
    )

    def _cfg(url="", key="", user="", extra_keys=None):
        keys = [url, key, user] + (extra_keys or [])
        return any(bool((v or "").strip()) for v in keys)

    sources = [
        {
            "id": "wazuh",
            "name": "Wazuh SIEM",
            "vendor": "Wazuh",
            "icon": "shield",
            "configured": True,
            "event_count_24h": os_count,
            **_source_status(True, os_count),
        },
        {
            "id": "opensearch",
            "name": "OpenSearch",
            "vendor": "OpenSearch",
            "icon": "search",
            "configured": True,
            "event_count_24h": os_count,
            **_source_status(True, os_count),
        },
        {
            "id": "ioc_abuseipdb",
            "name": "AbuseIPDB",
            "vendor": "AbuseIPDB",
            "icon": "threat",
            "configured": _cfg(key=s.abuseipdb_key),
            **_source_status(_cfg(key=s.abuseipdb_key)),
        },
        {
            "id": "ioc_otx",
            "name": "OTX AlienVault",
            "vendor": "AlienVault",
            "icon": "threat",
            "configured": _cfg(key=s.otx_key),
            **_source_status(_cfg(key=s.otx_key)),
        },
        {
            "id": "ioc_virustotal",
            "name": "VirusTotal",
            "vendor": "Google",
            "icon": "threat",
            "configured": _cfg(key=s.virustotal_key),
            **_source_status(_cfg(key=s.virustotal_key)),
        },
        {
            "id": "ioc_shodan",
            "name": "Shodan",
            "vendor": "Shodan",
            "icon": "scan",
            "configured": _cfg(key=s.shodan_key),
            **_source_status(_cfg(key=s.shodan_key)),
        },
        {
            "id": "misp",
            "name": "MISP",
            "vendor": "MISP",
            "icon": "threat",
            "configured": _cfg(url=s.misp_url, key=s.misp_api_key),
            **_source_status(_cfg(url=s.misp_url, key=s.misp_api_key)),
        },
        {
            "id": "iris",
            "name": "DFIR-IRIS",
            "vendor": "DFIR-IRIS",
            "icon": "case",
            "configured": _cfg(url=s.iris_url, key=s.iris_api_key),
            **_source_status(_cfg(url=s.iris_url, key=s.iris_api_key)),
        },
        {
            "id": "shuffle",
            "name": "Shuffle SOAR",
            "vendor": "Shuffle",
            "icon": "soar",
            "configured": _cfg(url=s.shuffle_url, key=s.shuffle_token),
            **_source_status(_cfg(url=s.shuffle_url, key=s.shuffle_token)),
        },
        {
            "id": "infoblox_dns",
            "name": "Infoblox DNS",
            "vendor": "Infoblox",
            "icon": "dns",
            "configured": _cfg(url=s.infoblox_url, user=s.infoblox_user) or dns_count > 0,
            "event_count_7d": dns_count,
            **_source_status(
                _cfg(url=s.infoblox_url, user=s.infoblox_user) or dns_count > 0,
                dns_count,
            ),
        },
        {
            "id": "infoblox_dhcp",
            "name": "Infoblox DHCP",
            "vendor": "Infoblox",
            "icon": "dhcp",
            "configured": _cfg(url=s.infoblox_url, user=s.infoblox_user) or dhcp_count > 0,
            "event_count_7d": dhcp_count,
            **_source_status(
                _cfg(url=s.infoblox_url, user=s.infoblox_user) or dhcp_count > 0,
                dhcp_count,
            ),
        },
        {
            "id": "huawei_nac",
            "name": "Huawei Agile Controller",
            "vendor": "Huawei",
            "icon": "nac",
            "configured": _cfg(url=s.huawei_nac_url) or nac_count > 0,
            "event_count_7d": nac_count,
            **_source_status(
                _cfg(url=s.huawei_nac_url) or nac_count > 0,
                nac_count,
            ),
        },
        {
            "id": "firewall",
            "name": "Firewall",
            "vendor": "FortiGate/Multi",
            "icon": "firewall",
            "configured": True,
            "event_count_24h": os_count,
            **_source_status(True, os_count),
        },
    ]

    configured_count = sum(1 for s in sources if s["configured"])
    return {
        "sources": sources,
        "total": len(sources),
        "configured": configured_count,
        "not_configured": len(sources) - configured_count,
        "checked_at": datetime.utcnow().isoformat(),
    }


@router.get("/sources/coverage")
async def sources_coverage(
    q:     str = Query(...),
    type:  str = Query("auto"),
    range: str = Query("7d"),
    current_user=Depends(get_current_user),
):
    """
    Check which data sources have data about a specific entity.
    Used to show the coverage panel in the investigation workbench.
    """
    entity_type = type if type != "auto" else _detect_entity_type(q)

    # Run parallel coverage checks
    dns_events, dhcp_events, nac_events, main_events = await asyncio.gather(
        opensearch_service.query_dns_events(q, range, size=10),
        opensearch_service.query_dhcp_events(q, range, size=10),
        opensearch_service.query_nac_events(q, range, size=10),
        opensearch_service.investigate_entity(q, entity_type, range, size=20),
    )

    def _cov(events: list, label: str):
        return {
            "has_data": len(events) > 0,
            "count": len(events),
            "label": label,
            "first_seen": events[-1].get("@timestamp") if events else None,
            "last_seen": events[0].get("@timestamp") if events else None,
        }

    return {
        "query": q,
        "type": entity_type,
        "range": range,
        "coverage": {
            "wazuh":        _cov(main_events, "Wazuh Alerts"),
            "infoblox_dns": _cov(dns_events,  "Infoblox DNS"),
            "infoblox_dhcp":_cov(dhcp_events, "Infoblox DHCP"),
            "huawei_nac":   _cov(nac_events,  "Huawei NAC"),
        },
    }


@router.get("/dns")
async def investigate_dns(
    q:     str = Query(...),
    range: str = Query("7d"),
    size:  int = Query(200, le=500),
    current_user=Depends(get_current_user),
):
    """
    Query DNS logs (Infoblox/named) for a given entity.
    Returns DNS query history, RPZ blocks, and response code distribution.
    """
    events = await opensearch_service.query_dns_events(q, range, size)

    # Aggregate
    query_names: Counter = Counter()
    response_codes: Counter = Counter()
    rpz_blocks = []
    categories: Counter = Counter()

    for e in events:
        data = e.get("data", {})
        qname = data.get("query_name")
        if qname:
            query_names[qname] += 1
        rcode = data.get("response_code")
        if rcode:
            response_codes[rcode] += 1
        action = data.get("action", "").upper()
        if action in {"BLOCK", "DENY", "RPZ"}:
            rpz_blocks.append({
                "timestamp": e.get("@timestamp"),
                "query_name": qname,
                "action": action,
                "policy": data.get("policy"),
                "reason": data.get("reason"),
                "rule_level": e.get("rule", {}).get("level"),
            })
        cat = data.get("category")
        if cat:
            categories[cat] += 1

    return {
        "query": q,
        "range": range,
        "count": len(events),
        "events": events,
        "top_query_names": [{"name": k, "count": v} for k, v in query_names.most_common(20)],
        "response_codes": [{"code": k, "count": v} for k, v in response_codes.most_common()],
        "rpz_blocks": rpz_blocks[:50],
        "categories": [{"name": k, "count": v} for k, v in categories.most_common(10)],
        "has_malicious": len(rpz_blocks) > 0,
    }


@router.get("/dhcp")
async def investigate_dhcp(
    q:     str = Query(...),
    range: str = Query("30d"),
    size:  int = Query(200, le=500),
    current_user=Depends(get_current_user),
):
    """
    Query DHCP lease history for an IP, MAC, or hostname.
    Returns lease timeline, IP assignments, and association history.
    """
    events = await opensearch_service.query_dhcp_events(q, range, size)

    # Build lease history
    actions: Counter = Counter()
    ip_assignments: Counter = Counter()
    mac_assignments: Counter = Counter()
    hostname_assignments: Counter = Counter()

    for e in events:
        data = e.get("data", {})
        action = data.get("dhcp_action", "").lower()
        if action:
            actions[action] += 1
        ip = data.get("dhcp_ip")
        if ip:
            ip_assignments[ip] += 1
        mac = data.get("dhcp_mac")
        if mac:
            mac_assignments[mac] += 1
        hostname = data.get("dhcp_hostname")
        if hostname:
            hostname_assignments[hostname] += 1

    # Build lease timeline (most recent first, structured)
    leases = []
    for e in events[:100]:
        data = e.get("data", {})
        leases.append({
            "timestamp": e.get("@timestamp"),
            "action": data.get("dhcp_action"),
            "ip": data.get("dhcp_ip"),
            "mac": data.get("dhcp_mac"),
            "hostname": data.get("dhcp_hostname"),
            "lease_time": data.get("dhcp_lease_time"),
            "server": data.get("dhcp_server"),
            "rule_level": e.get("rule", {}).get("level"),
        })

    return {
        "query": q,
        "range": range,
        "count": len(events),
        "leases": leases,
        "actions": [{"action": k, "count": v} for k, v in actions.most_common()],
        "ip_history": [{"ip": k, "count": v} for k, v in ip_assignments.most_common(20)],
        "mac_history": [{"mac": k, "count": v} for k, v in mac_assignments.most_common(20)],
        "hostname_history": [{"hostname": k, "count": v} for k, v in hostname_assignments.most_common(10)],
    }


@router.get("/nac")
async def investigate_nac(
    q:     str = Query(...),
    range: str = Query("7d"),
    size:  int = Query(200, le=500),
    current_user=Depends(get_current_user),
):
    """
    Query Huawei Agile Controller / NAC authentication, authorization, and posture logs.
    Returns access history, VLAN assignments, and posture results.
    """
    events = await opensearch_service.query_nac_events(q, range, size)

    auth_results: Counter = Counter()
    actions: Counter = Counter()
    vlans: Counter = Counter()
    switches: Counter = Counter()
    policies: Counter = Counter()
    posture_results: Counter = Counter()
    auth_types: Counter = Counter()
    quarantine_events = []

    for e in events:
        data = e.get("data", {})
        result = data.get("auth_result", "").lower()
        if result:
            auth_results[result] += 1
        action = data.get("action", "").lower() or data.get("ac_msg_type", "").lower()
        if action:
            actions[action] += 1
        vlan = data.get("vlan_id") or data.get("vlan_name")
        if vlan:
            vlans[str(vlan)] += 1
        sw = data.get("switch_ip") or data.get("nasip") or data.get("ap_name")
        if sw:
            switches[sw] += 1
        pol = data.get("policy_name")
        if pol:
            policies[pol] += 1
        posture = data.get("posture_result", "").lower()
        if posture:
            posture_results[posture] += 1
        auth_type = data.get("auth_type", "").lower()
        if auth_type:
            auth_types[auth_type] += 1
        if "quarantine" in action or "block" in result:
            quarantine_events.append({
                "timestamp": e.get("@timestamp"),
                "action": action,
                "ip": data.get("srcip"),
                "mac": data.get("mac"),
                "user": data.get("dstuser") or data.get("srcuser"),
                "policy": pol,
                "reason": data.get("reason"),
                "rule_level": e.get("rule", {}).get("level"),
            })

    # Build structured session list
    sessions = []
    for e in events[:100]:
        data = e.get("data", {})
        sessions.append({
            "timestamp": e.get("@timestamp"),
            "action": data.get("action") or data.get("ac_msg_type"),
            "auth_result": data.get("auth_result"),
            "auth_type": data.get("auth_type"),
            "ip": data.get("srcip"),
            "mac": data.get("mac"),
            "user": data.get("dstuser") or data.get("srcuser"),
            "vlan": data.get("vlan_id") or data.get("vlan_name"),
            "switch": data.get("switch_ip") or data.get("nasip"),
            "ap": data.get("ap_name"),
            "interface": data.get("interface"),
            "policy": data.get("policy_name"),
            "posture": data.get("posture_result"),
            "rule_level": e.get("rule", {}).get("level"),
        })

    has_posture_fail = any(
        "fail" in k or "reject" in k or "quarantine" in k
        for k in list(posture_results.keys()) + list(auth_results.keys())
    )

    return {
        "query": q,
        "range": range,
        "count": len(events),
        "sessions": sessions,
        "auth_results": [{"result": k, "count": v} for k, v in auth_results.most_common()],
        "actions": [{"action": k, "count": v} for k, v in actions.most_common()],
        "vlans": [{"vlan": k, "count": v} for k, v in vlans.most_common(10)],
        "switches": [{"switch": k, "count": v} for k, v in switches.most_common(10)],
        "policies": [{"policy": k, "count": v} for k, v in policies.most_common(10)],
        "posture_results": [{"result": k, "count": v} for k, v in posture_results.most_common()],
        "auth_types": [{"type": k, "count": v} for k, v in auth_types.most_common()],
        "quarantine_events": quarantine_events[:20],
        "has_posture_fail": has_posture_fail,
    }


@router.get("/risk")
async def investigate_risk(
    q:          str = Query(...),
    time_range: str = Query("30d"),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Compute explained risk score for an entity from all available sources.
    Returns score 0-10 with per-factor breakdown in Thai.
    """
    entity_type = _detect_entity_type(q)

    # Gather data in parallel
    events, dns_data, nac_data = await asyncio.gather(
        opensearch_service.investigate_entity(q, entity_type, time_range, 200),
        opensearch_service.query_dns_events(q, time_range, 50),
        opensearch_service.query_nac_events(q, time_range, 50),
    )

    level_dist = _extract_level_dist(events)

    # Threat intel from cache
    threat_score = 0
    cached = db.query(IOCEnrichmentCache).filter(
        IOCEnrichmentCache.ioc_value == q
    ).first()
    if cached and cached.abuseipdb_score is not None:
        threat_score = cached.abuseipdb_score

    # DNS block check
    has_dns_block = any(
        e.get("data", {}).get("action", "").upper() in {"BLOCK", "DENY", "RPZ"}
        for e in dns_data
    )

    # NAC posture check
    nac_posture_fail = any(
        "fail" in (e.get("data", {}).get("posture_result") or "").lower() or
        "quarantine" in (e.get("data", {}).get("action") or "").lower()
        for e in nac_data
    )

    risk = _compute_risk_score(
        level_dist=level_dist,
        threat_score=threat_score,
        misp_matched=False,
        has_dns_block=has_dns_block,
        nac_posture_fail=nac_posture_fail,
    )
    risk["query"] = q
    risk["entity_type"] = entity_type
    risk["computed_at"] = datetime.utcnow().isoformat()
    return risk
