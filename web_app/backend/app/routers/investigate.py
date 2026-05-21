from fastapi import APIRouter, Depends, Query
from ..routers.auth import get_current_user
from ..services import opensearch_service, enrichment_service

router = APIRouter(prefix="/investigate", tags=["investigate"])


@router.get("")
async def investigate(
    q: str = Query(...),
    type: str = Query("auto"),
    time_range: str = Query("30d"),
    current_user=Depends(get_current_user),
):
    events = await opensearch_service.investigate_entity(q, type, time_range)
    identity = opensearch_service.summarize_entity_events(events, entity_value=q)
    dhcp_events = [event for event in events if event.get("data", {}).get("dhcp_action")]
    wifi_events = [
        event for event in events
        if event.get("data", {}).get("ac_msg_type") or event.get("predecoder", {}).get("program_name") == "huawei-ac"
    ]
    correlation = {
        "related_ips": identity.get("ips", []),
        "related_macs": identity.get("macs", []),
        "related_users": identity.get("users", []),
        "related_agents": identity.get("agents", []),
        "top_rules": identity.get("top_rules", []),
    }
    return {
        "query": q,
        "type": type,
        "events": events,
        "count": len(events),
        "identity": identity,
        "dhcp": dhcp_events[:50],
        "wifi": wifi_events[:50],
        "correlation": correlation,
    }


@router.get("/enrich")
async def enrich(ip: str = Query(...), current_user=Depends(get_current_user)):
    return await enrichment_service.enrich_ip(ip)
