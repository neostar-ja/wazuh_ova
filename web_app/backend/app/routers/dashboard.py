"""
Dashboard Router — Real-time SOC overview
Returns: alert stats, timeline (per-severity), top rules, top agents,
         top countries, top sources, MITRE tactics, cluster health, agent list
"""
import asyncio
from fastapi import APIRouter, Depends, Query
from ..routers.auth import get_current_user
from ..services import opensearch_service, wazuh_service

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


def _buckets(aggs: dict, key: str, n: int = 10):
    return [
        {"name": b["key"], "count": b["doc_count"]}
        for b in aggs.get(key, {}).get("buckets", [])[:n]
    ]


def _source_buckets(aggs: dict, key: str, n: int = 10) -> list:
    """Convert filters-aggregation buckets (name→count dict) to sorted list."""
    raw = aggs.get(key, {}).get("buckets", {})
    result = [
        {"name": name, "count": bucket["doc_count"]}
        for name, bucket in raw.items()
        if bucket["doc_count"] > 0
    ]
    result.sort(key=lambda x: x["count"], reverse=True)
    return result[:n]


@router.get("/stats")
async def stats(
    time_range: str = Query("24h"),
    current_user=Depends(get_current_user),
):
    """
    Full dashboard aggregation — returns all panels data in one call:
    - by_level (critical/high/medium/low)
    - timeline with per-severity breakdown
    - by_source, by_country, by_rule, by_agent, by_mitre, by_srcip
    - total, eps estimate
    """
    raw = await opensearch_service.get_alert_aggs(time_range=time_range, level_min=1)
    if not raw:
        return _empty()

    aggs  = raw.get("aggregations", {})
    total = raw.get("hits", {}).get("total", {}).get("value", 0)

    # by_level
    level_buckets = aggs.get("by_level", {}).get("buckets", [])
    def _lv(key): return next((b["doc_count"] for b in level_buckets if b.get("key") == key), 0)

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

    # EPS — rough estimate from last 5-min bucket
    eps = 0
    if tl_buckets:
        last = tl_buckets[-1].get("doc_count", 0)
        # interval seconds
        interval_sec = {"5m": 300, "15m": 900, "1h": 3600, "6h": 21600, "1d": 86400, "3d": 259200}
        from ..services.opensearch_service import _pick_interval
        iv  = _pick_interval(time_range)
        sec = interval_sec.get(iv, 3600)
        eps = round(last / sec, 2) if sec > 0 else 0

    return {
        "total":      total,
        "critical":   _lv("critical"),
        "high":       _lv("high"),
        "medium":     _lv("medium"),
        "low":        _lv("low"),
        "eps":        eps,
        "timeline":   timeline,
        "by_source":  _source_buckets(aggs, "by_source"),
        "by_country": _buckets(aggs, "by_country"),
        "by_rule":    _buckets(aggs, "by_rule", 12),
        "by_agent":   _buckets(aggs, "by_agent"),
        "by_mitre":   _buckets(aggs, "by_mitre"),
        "by_srcip":   _buckets(aggs, "by_srcip"),
    }


@router.get("/cluster")
async def cluster(current_user=Depends(get_current_user)):
    """Wazuh cluster health check."""
    try:
        return await wazuh_service.get_cluster_health()
    except Exception as e:
        return {"error": str(e)}


@router.get("/agents")
async def agents(current_user=Depends(get_current_user)):
    """
    Active Wazuh agents summary:
    total, active, disconnected, never_connected, by_os, by_group
    """
    try:
        data = await wazuh_service.get_agents()
        items = data.get("data", {}).get("affected_items", [])
        if not items:
            items = data.get("affected_items", [])

        by_status = {"active": 0, "disconnected": 0, "never_connected": 0, "pending": 0}
        by_os:  dict[str, int] = {}
        by_group: dict[str, int] = {}
        recent_agents = []

        for ag in items:
            st = (ag.get("status") or "unknown").lower()
            if st in by_status:
                by_status[st] += 1

            os_name = ag.get("os", {}).get("platform") or ag.get("os", {}).get("name") or "unknown"
            by_os[os_name] = by_os.get(os_name, 0) + 1

            for grp in (ag.get("group") or []):
                by_group[grp] = by_group.get(grp, 0) + 1

            recent_agents.append({
                "id":            ag.get("id"),
                "name":          ag.get("name"),
                "ip":            ag.get("ip"),
                "status":        ag.get("status"),
                "os_name":       os_name,
                "os_version":    ag.get("os", {}).get("version"),
                "version":       ag.get("version"),
                "last_keepalive":ag.get("lastKeepAlive"),
                "group":         ag.get("group", []),
            })

        return {
            "total":           len(items),
            "active":          by_status["active"],
            "disconnected":    by_status["disconnected"],
            "never_connected": by_status["never_connected"],
            "pending":         by_status["pending"],
            "by_os":           [{"name": k, "count": v} for k, v in sorted(by_os.items(), key=lambda x: -x[1])],
            "by_group":        [{"name": k, "count": v} for k, v in sorted(by_group.items(), key=lambda x: -x[1])],
            "agents":          sorted(recent_agents, key=lambda x: x.get("last_keepalive") or "", reverse=True)[:20],
        }
    except Exception as e:
        return {"error": str(e), "total": 0, "active": 0, "disconnected": 0, "never_connected": 0, "pending": 0, "by_os": [], "by_group": [], "agents": []}


@router.get("/sources")
async def sources(time_range: str = Query("24h"), current_user=Depends(get_current_user)):
    data = await opensearch_service.get_alert_stats(time_range)
    return data.get("aggregations", {}).get("by_source", {}).get("buckets", [])


def _empty():
    return {
        "total": 0, "critical": 0, "high": 0, "medium": 0, "low": 0, "eps": 0,
        "timeline": [], "by_source": [], "by_country": [], "by_rule": [],
        "by_agent": [], "by_mitre": [], "by_srcip": [],
    }
