from fastapi import APIRouter, Depends, Query
from typing import Optional
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
    return {"query": q, "type": type, "events": events, "count": len(events)}


@router.get("/enrich")
async def enrich(ip: str = Query(...), current_user=Depends(get_current_user)):
    return await enrichment_service.enrich_ip(ip)
