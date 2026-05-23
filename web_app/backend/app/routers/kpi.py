import asyncio

from fastapi import APIRouter, Depends, Query
from ..routers.auth import get_current_user
from ..services.opensearch_service import get_client
from ..services.opensearch_management_service import get_storage_forecast
from ..core.config import settings

router = APIRouter(prefix="/kpi", tags=["kpi"])


@router.get("/summary")
async def kpi_summary(current_user=Depends(get_current_user)):
    client = get_client()
    body = {
        "size": 0,
        "query": {"range": {"@timestamp": {"gte": "now-30d"}}},
        "aggs": {
            "daily": {
                "date_histogram": {
                    "field": "@timestamp",
                    "calendar_interval": "1d",
                }
            },
            "by_level": {
                "range": {
                    "field": "rule.level",
                    "ranges": [
                        {"key": "critical", "from": 15},
                        {"key": "high", "from": 12, "to": 15},
                        {"key": "medium", "from": 7, "to": 12},
                    ],
                }
            },
        },
    }
    try:
        resp = client.search(index=settings.opensearch_index, body=body)
        aggs = resp.get("aggregations", {})
        daily = aggs.get("daily", {}).get("buckets", [])
        levels = aggs.get("by_level", {}).get("buckets", [])
        total = resp.get("hits", {}).get("total", {}).get("value", 0)
        avg_daily = total / 30 if total else 0
        return {
            "total_30d": total,
            "avg_daily": round(avg_daily, 1),
            "critical_30d": next((b["doc_count"] for b in levels if b.get("key") == "critical"), 0),
            "high_30d": next((b["doc_count"] for b in levels if b.get("key") == "high"), 0),
            "medium_30d": next((b["doc_count"] for b in levels if b.get("key") == "medium"), 0),
            "daily_trend": [
                {"date": b["key_as_string"][:10], "count": b["doc_count"]} for b in daily
            ],
        }
    except Exception as e:
        return {"error": str(e)}


@router.get("/storage-forecast")
async def storage_forecast(current_user=Depends(get_current_user)):
    try:
        return await asyncio.to_thread(get_storage_forecast, settings.opensearch_index)
    except Exception as e:
        return {"error": str(e)}


@router.get("/timeline")
async def kpi_timeline(days: int = Query(30), current_user=Depends(get_current_user)):
    client = get_client()
    body = {
        "size": 0,
        "query": {"range": {"@timestamp": {"gte": f"now-{days}d"}}},
        "aggs": {
            "daily": {
                "date_histogram": {
                    "field": "@timestamp",
                    "calendar_interval": "1d",
                },
                "aggs": {
                    "by_level": {
                        "range": {
                            "field": "rule.level",
                            "ranges": [
                                {"key": "critical", "from": 15},
                                {"key": "high", "from": 12, "to": 15},
                                {"key": "medium", "from": 7, "to": 12},
                            ],
                        }
                    }
                },
            }
        },
    }
    try:
        resp = client.search(index=settings.opensearch_index, body=body)
        buckets = resp.get("aggregations", {}).get("daily", {}).get("buckets", [])
        return [
            {
                "date": b["key_as_string"][:10],
                "total": b["doc_count"],
                "critical": next((l["doc_count"] for l in b["by_level"]["buckets"] if l.get("key") == "critical"), 0),
                "high": next((l["doc_count"] for l in b["by_level"]["buckets"] if l.get("key") == "high"), 0),
                "medium": next((l["doc_count"] for l in b["by_level"]["buckets"] if l.get("key") == "medium"), 0),
            }
            for b in buckets
        ]
    except Exception as e:
        return {"error": str(e)}
