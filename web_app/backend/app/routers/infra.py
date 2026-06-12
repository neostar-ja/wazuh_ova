from fastapi import APIRouter, Depends

from ..routers.auth import get_current_user
from ..services import infra_monitor_service

router = APIRouter(prefix="/infra", tags=["infra"])


@router.get("/nodes")
async def infra_nodes(current_user=Depends(get_current_user)):
    return infra_monitor_service.NODES


@router.get("/status")
async def infra_status(current_user=Depends(get_current_user)):
    try:
        return await infra_monitor_service.get_all_nodes_status()
    except Exception as e:
        return {"error": str(e)}
