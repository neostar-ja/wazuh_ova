from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from ..routers.auth import get_current_user
from ..models.database import get_db, CustomIOC
from ..services import enrichment_service, opensearch_service

router = APIRouter(prefix="/ioc", tags=["ioc"])


class IOCCreate(BaseModel):
    ioc_type: str
    value: str
    description: Optional[str] = None
    severity: str = "high"
    expires_at: Optional[datetime] = None


@router.get("/search")
async def search(q: str = Query(...), current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    feed_results = await enrichment_service.search_ioc(q)
    custom = db.query(CustomIOC).filter(
        CustomIOC.value == q, CustomIOC.is_active == True
    ).first()
    return {
        "value": q,
        "custom_match": bool(custom),
        "custom_ioc": {
            "description": custom.description,
            "severity": custom.severity,
            "added_at": custom.added_at,
        } if custom else None,
        "feeds": feed_results.get("sources", {}),
    }


@router.get("/history")
async def history(
    q: str = Query(...),
    time_range: str = Query("30d"),
    limit: int = Query(100, le=500),
    current_user=Depends(get_current_user),
):
    events = await enrichment_service.search_ioc(q)
    matched_alerts = await opensearch_service.get_ioc_history(q, time_range=time_range, limit=limit)
    return {
        "value": q,
        "feed_summary": events.get("sources", {}),
        "matches": matched_alerts,
        "count": len(matched_alerts),
    }


@router.get("/custom")
async def list_custom(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    iocs = db.query(CustomIOC).filter(CustomIOC.is_active == True).all()
    return [
        {
            "id": i.id,
            "ioc_type": i.ioc_type,
            "value": i.value,
            "description": i.description,
            "severity": i.severity,
            "added_by": i.added_by,
            "added_at": i.added_at,
            "expires_at": i.expires_at,
        }
        for i in iocs
    ]


@router.post("/custom", status_code=201)
async def add_custom(ioc: IOCCreate, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    new_ioc = CustomIOC(
        ioc_type=ioc.ioc_type,
        value=ioc.value,
        description=ioc.description,
        severity=ioc.severity,
        added_by=current_user.username,
        expires_at=ioc.expires_at,
    )
    db.add(new_ioc)
    db.commit()
    db.refresh(new_ioc)
    return {"id": new_ioc.id, "value": new_ioc.value}


@router.delete("/custom/{ioc_id}")
async def delete_custom(ioc_id: int, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    ioc = db.query(CustomIOC).filter(CustomIOC.id == ioc_id).first()
    if not ioc:
        raise HTTPException(status_code=404, detail="IOC not found")
    ioc.is_active = False
    db.commit()
    return {"message": "IOC deactivated"}
