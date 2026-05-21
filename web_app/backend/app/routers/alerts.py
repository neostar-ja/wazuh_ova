from fastapi import APIRouter, Depends, Query
from typing import Optional, List
from ..routers.auth import get_current_user
from ..services import opensearch_service

router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.get("")
async def get_alerts(
    level: int = Query(1),
    source: Optional[str] = None,
    limit: int = Query(50, le=500),
    time_range: str = Query("24h"),
    q: Optional[str] = None,
    current_user=Depends(get_current_user),
):
    sources = [source] if source else None
    return await opensearch_service.get_alerts(
        size=limit,
        level_min=level,
        sources=sources,
        time_range=time_range,
        query_str=q,
    )


@router.get("/recent")
async def recent_alerts(
    limit: int = Query(20, le=100),
    current_user=Depends(get_current_user),
):
    return await opensearch_service.get_alerts(size=limit, level_min=1, time_range="1h")
