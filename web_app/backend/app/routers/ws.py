import asyncio
import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from ..services.opensearch_service import get_alerts

router = APIRouter(prefix="/ws", tags=["websocket"])


@router.websocket("/alerts")
async def ws_alerts(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            alerts = await get_alerts(size=10, level_min=7, time_range="5m")
            await websocket.send_json({"type": "alerts", "data": alerts, "count": len(alerts)})
            await asyncio.sleep(10)
    except WebSocketDisconnect:
        pass
    except Exception:
        pass
