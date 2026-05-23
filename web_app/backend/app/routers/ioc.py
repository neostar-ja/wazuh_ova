"""
IOC Router — Indicator of Compromise endpoints
Supports: search, enrich, history, custom IOC CRUD, stats
"""
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

from ..routers.auth import get_current_user
from ..models.database import get_db, CustomIOC
from ..services import enrichment_service, opensearch_service

router = APIRouter(prefix="/ioc", tags=["ioc"])


# ── Pydantic models ────────────────────────────────────────────────────────────

class IOCCreate(BaseModel):
    ioc_type: str
    value: str
    description: Optional[str] = None
    severity: str = "high"
    expires_at: Optional[datetime] = None
    tags: Optional[List[str]] = None


# ── Search / Enrich ────────────────────────────────────────────────────────────

@router.get("/search")
async def search(
    q: str = Query(..., description="IP, domain, hash, or URL to lookup"),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Full multi-source threat intelligence lookup."""
    feed_results = await enrichment_service.search_ioc(q)
    custom = db.query(CustomIOC).filter(
        CustomIOC.value == q, CustomIOC.is_active == True
    ).first()

    # Compute overall risk score (0-100) from available sources
    risk_score = 0
    sources = feed_results.get("sources", {})

    abuse_score = 0
    if "abuseipdb" in sources and sources["abuseipdb"].get("available"):
        abuse_score = sources["abuseipdb"].get("abuseConfidenceScore", 0)
        risk_score = max(risk_score, abuse_score)

    vt = sources.get("virustotal", {})
    if vt.get("available") and vt.get("found"):
        vt_total = vt.get("total", 1) or 1
        vt_score = int((vt.get("malicious", 0) / vt_total) * 100)
        risk_score = max(risk_score, vt_score)

    otx = sources.get("otx", {})
    if otx.get("available") and otx.get("pulse_count", 0) > 0:
        risk_score = max(risk_score, min(otx["pulse_count"] * 10, 80))

    if custom:
        if custom.severity == "critical":
            risk_score = 100
        elif custom.severity == "high":
            risk_score = max(risk_score, 80)

    verdict = "clean"
    if custom:
        verdict = "blocked"
    elif risk_score >= 75:
        verdict = "malicious"
    elif risk_score >= 30:
        verdict = "suspicious"

    return {
        "value":       q,
        "ioc_type":    feed_results.get("ioc_type", "unknown"),
        "is_private":  feed_results.get("is_private", False),
        "risk_score":  risk_score,
        "verdict":     verdict,
        "custom_match": bool(custom),
        "custom_ioc":  {
            "id":          custom.id,
            "description": custom.description,
            "severity":    custom.severity,
            "added_by":    custom.added_by,
            "added_at":    custom.added_at,
            "expires_at":  custom.expires_at,
        } if custom else None,
        "feeds": sources,
    }


@router.get("/history")
async def history(
    q: str = Query(...),
    time_range: str = Query("30d"),
    limit: int = Query(100, le=500),
    current_user=Depends(get_current_user),
):
    """Get alert history from OpenSearch for a given IOC value."""
    feed_results    = await enrichment_service.search_ioc(q)
    matched_alerts  = await opensearch_service.get_ioc_history(
        q, time_range=time_range, limit=limit
    )
    ioc_type        = feed_results.get("ioc_type", "unknown")
    sources         = feed_results.get("sources", {})

    # Timeline: group by day
    from collections import defaultdict
    timeline = defaultdict(int)
    for alert in matched_alerts:
        if alert.get("timestamp"):
            try:
                day = alert["timestamp"][:10]
                timeline[day] += 1
            except Exception:
                pass
    timeline_data = [{"date": d, "count": c} for d, c in sorted(timeline.items())]

    return {
        "value":        q,
        "ioc_type":     ioc_type,
        "feed_summary": sources,
        "matches":      matched_alerts,
        "count":        len(matched_alerts),
        "timeline":     timeline_data,
    }


# ── Custom IOC CRUD ────────────────────────────────────────────────────────────

@router.get("/custom")
async def list_custom(
    ioc_type: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all active custom IOCs with optional filters."""
    q = db.query(CustomIOC).filter(CustomIOC.is_active == True)
    if ioc_type:
        q = q.filter(CustomIOC.ioc_type == ioc_type)
    if severity:
        q = q.filter(CustomIOC.severity == severity)
    iocs = q.order_by(CustomIOC.added_at.desc()).all()
    return [
        {
            "id":          i.id,
            "ioc_type":    i.ioc_type,
            "value":       i.value,
            "description": i.description,
            "severity":    i.severity,
            "added_by":    i.added_by,
            "added_at":    i.added_at,
            "expires_at":  i.expires_at,
        }
        for i in iocs
    ]


@router.post("/custom", status_code=201)
async def add_custom(
    ioc: IOCCreate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Auto-detect type if not specified correctly
    if not ioc.ioc_type:
        ioc.ioc_type = enrichment_service.detect_ioc_type(ioc.value)
    new_ioc = CustomIOC(
        ioc_type=ioc.ioc_type,
        value=ioc.value.strip(),
        description=ioc.description,
        severity=ioc.severity,
        added_by=current_user.username,
        expires_at=ioc.expires_at,
    )
    db.add(new_ioc)
    db.commit()
    db.refresh(new_ioc)
    return {"id": new_ioc.id, "value": new_ioc.value, "ioc_type": new_ioc.ioc_type}


@router.delete("/custom/{ioc_id}")
async def delete_custom(
    ioc_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ioc = db.query(CustomIOC).filter(CustomIOC.id == ioc_id).first()
    if not ioc:
        raise HTTPException(status_code=404, detail="IOC not found")
    ioc.is_active = False
    db.commit()
    return {"message": "IOC deactivated", "id": ioc_id}


# ── Statistics ─────────────────────────────────────────────────────────────────

@router.get("/stats")
async def stats(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Summary statistics for custom IOC database."""
    all_iocs = db.query(CustomIOC).filter(CustomIOC.is_active == True).all()
    by_type     = {}
    by_severity = {}
    by_user     = {}
    for i in all_iocs:
        by_type[i.ioc_type]       = by_type.get(i.ioc_type, 0) + 1
        by_severity[i.severity]   = by_severity.get(i.severity, 0) + 1
        by_user[i.added_by]       = by_user.get(i.added_by, 0) + 1

    expiring_soon = [
        {"id": i.id, "value": i.value, "expires_at": i.expires_at}
        for i in all_iocs
        if i.expires_at is not None
    ][:10]

    return {
        "total":         len(all_iocs),
        "by_type":       [{"name": k, "count": v} for k, v in sorted(by_type.items(), key=lambda x: -x[1])],
        "by_severity":   [{"name": k, "count": v} for k, v in sorted(by_severity.items(), key=lambda x: -x[1])],
        "by_user":       [{"name": k, "count": v} for k, v in sorted(by_user.items(), key=lambda x: -x[1])],
        "expiring_soon": expiring_soon,
    }
