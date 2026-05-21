from fastapi import APIRouter, Depends, Query
from ..routers.auth import get_current_user
from ..services import opensearch_service, wazuh_service

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats")
async def stats(time_range: str = Query("24h"), current_user=Depends(get_current_user)):
    data = await opensearch_service.get_alert_stats(time_range)
    aggs = data.get("aggregations", {})
    level_buckets = aggs.get("by_level", {}).get("buckets", [])
    level_counts = {b.get("key", b.get("*-15.0", "")): b.get("doc_count", 0) for b in level_buckets}
    return {
        "total": data.get("hits", {}).get("total", {}).get("value", 0),
        "critical": next((b["doc_count"] for b in level_buckets if b.get("key") == "critical"), 0),
        "high": next((b["doc_count"] for b in level_buckets if b.get("key") == "high"), 0),
        "medium": next((b["doc_count"] for b in level_buckets if b.get("key") == "medium"), 0),
        "low": next((b["doc_count"] for b in level_buckets if b.get("key") == "low"), 0),
        "by_source": [
            {"name": b["key"], "count": b["doc_count"]}
            for b in aggs.get("by_source", {}).get("buckets", [])
        ],
        "by_country": [
            {"name": b["key"], "count": b["doc_count"]}
            for b in aggs.get("by_country", {}).get("buckets", [])
        ],
        "timeline": [
            {"time": b["key_as_string"], "count": b["doc_count"]}
            for b in aggs.get("timeline", {}).get("buckets", [])
        ],
    }


@router.get("/cluster")
async def cluster(current_user=Depends(get_current_user)):
    try:
        return await wazuh_service.get_cluster_health()
    except Exception as e:
        return {"error": str(e)}


@router.get("/sources")
async def sources(time_range: str = Query("24h"), current_user=Depends(get_current_user)):
    data = await opensearch_service.get_alert_stats(time_range)
    return data.get("aggregations", {}).get("by_source", {}).get("buckets", [])
