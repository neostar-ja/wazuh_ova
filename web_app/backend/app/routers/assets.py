from fastapi import APIRouter, Depends, Query
from ..routers.auth import get_current_user
from ..services import opensearch_service

router = APIRouter(prefix="/assets", tags=["assets"])


@router.get("/devices")
async def devices(time_range: str = Query("7d"), current_user=Depends(get_current_user)):
    buckets = await opensearch_service.get_asset_devices(time_range)
    return [
        {
            "ip": b.get("key", {}).get("ip", ""),
            "mac": b.get("key", {}).get("mac", ""),
            "count": b.get("doc_count", 0),
        }
        for b in buckets
    ]


@router.get("/dhcp")
async def dhcp_history(
    time_range: str = Query("7d"),
    limit: int = Query(100),
    current_user=Depends(get_current_user),
):
    from ..services.opensearch_service import get_client
    from ..core.config import settings
    client = get_client()
    body = {
        "size": limit,
        "sort": [{"@timestamp": {"order": "desc"}}],
        "query": {
            "bool": {
                "must": [
                    {"range": {"@timestamp": {"gte": f"now-{time_range}"}}},
                    {"exists": {"field": "data.dhcp_action"}},
                ]
            }
        },
        "_source": [
            "@timestamp", "data.dhcp_ip", "data.dhcp_mac", "data.dhcp_hostname",
            "data.dhcp_action", "agent.name",
        ],
    }
    try:
        resp = client.search(index=settings.opensearch_index, body=body)
        return [h["_source"] for h in resp["hits"]["hits"]]
    except Exception:
        return []


@router.get("/sessions")
async def wifi_sessions(
    time_range: str = Query("7d"),
    limit: int = Query(100),
    current_user=Depends(get_current_user),
):
    from ..services.opensearch_service import get_client
    from ..core.config import settings
    client = get_client()
    body = {
        "size": limit,
        "sort": [{"@timestamp": {"order": "desc"}}],
        "query": {
            "bool": {
                "must": [
                    {"range": {"@timestamp": {"gte": f"now-{time_range}"}}},
                    {"term": {"predecoder.program_name.keyword": "huawei-ac"}},
                ]
            }
        },
        "_source": [
            "@timestamp", "data.srcip", "data.mac", "data.ap_mac",
            "data.ac_msg_type", "data.dstuser", "agent.name",
        ],
    }
    try:
        resp = client.search(index=settings.opensearch_index, body=body)
        return [h["_source"] for h in resp["hits"]["hits"]]
    except Exception:
        return []
