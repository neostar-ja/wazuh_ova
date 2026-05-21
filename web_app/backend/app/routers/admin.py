from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from ..routers.auth import get_current_user
from ..models.database import get_db, User, AuditLog, AlertTuning
from ..core.security import get_password_hash
from ..services import wazuh_service

router = APIRouter(prefix="/admin", tags=["admin"])


def require_admin(current_user=Depends(get_current_user)):
    if current_user.role not in ("admin", "superadmin"):
        raise HTTPException(status_code=403, detail="Admin required")
    return current_user


def require_superadmin(current_user=Depends(get_current_user)):
    if current_user.role != "superadmin":
        raise HTTPException(status_code=403, detail="Superadmin required")
    return current_user


# --- Rules ---
@router.get("/rules")
async def list_rules(current_user=Depends(require_admin)):
    try:
        return await wazuh_service.get_rules_files()
    except Exception as e:
        return {"error": str(e)}


@router.get("/rules/{filename}")
async def get_rule(filename: str, current_user=Depends(require_admin)):
    try:
        content = await wazuh_service.get_rule_file(filename)
        return {"filename": filename, "content": content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/rules/{filename}")
async def save_rule(filename: str, request: Request, current_user=Depends(require_admin), db: Session = Depends(get_db)):
    body = await request.body()
    content = body.decode("utf-8")
    result = await wazuh_service.put_rule_file(filename, content)
    log = AuditLog(
        user_id=current_user.id,
        username=current_user.username,
        action="save_rule",
        target=filename,
        detail=f"Saved {len(content)} bytes",
        ip_address=request.client.host if request.client else None,
    )
    db.add(log)
    db.commit()
    return result


@router.post("/deploy")
async def deploy(request: Request, current_user=Depends(require_admin), db: Session = Depends(get_db)):
    result = await wazuh_service.restart_manager()
    log = AuditLog(
        user_id=current_user.id,
        username=current_user.username,
        action="deploy_restart",
        ip_address=request.client.host if request.client else None,
    )
    db.add(log)
    db.commit()
    return result


# --- Alert Tuning ---
class TuningCreate(BaseModel):
    rule_id: str
    original_level: int
    tuned_level: int
    reason: str
    review_date: Optional[datetime] = None


@router.get("/tuning")
async def list_tuning(current_user=Depends(require_admin), db: Session = Depends(get_db)):
    entries = db.query(AlertTuning).all()
    return [
        {
            "id": e.id, "rule_id": e.rule_id, "original_level": e.original_level,
            "tuned_level": e.tuned_level, "reason": e.reason, "added_by": e.added_by,
            "added_at": e.added_at, "review_date": e.review_date, "status": e.status,
        }
        for e in entries
    ]


@router.post("/tuning", status_code=201)
async def add_tuning(tuning: TuningCreate, current_user=Depends(require_admin), db: Session = Depends(get_db)):
    entry = AlertTuning(
        rule_id=tuning.rule_id,
        original_level=tuning.original_level,
        tuned_level=tuning.tuned_level,
        reason=tuning.reason,
        added_by=current_user.username,
        review_date=tuning.review_date,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return {"id": entry.id, "rule_id": entry.rule_id}


# --- Users ---
class UserCreate(BaseModel):
    username: str
    email: str
    full_name: str
    password: str
    role: str = "viewer"


@router.get("/users")
async def list_users(current_user=Depends(require_superadmin), db: Session = Depends(get_db)):
    users = db.query(User).all()
    return [
        {
            "id": u.id, "username": u.username, "email": u.email,
            "full_name": u.full_name, "role": u.role, "is_active": u.is_active,
            "created_at": u.created_at, "last_login": u.last_login,
        }
        for u in users
    ]


@router.post("/users", status_code=201)
async def create_user(user: UserCreate, current_user=Depends(require_superadmin), db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == user.username).first():
        raise HTTPException(status_code=400, detail="Username already exists")
    new_user = User(
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        hashed_password=get_password_hash(user.password),
        role=user.role,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"id": new_user.id, "username": new_user.username}


# --- Audit Log ---
@router.get("/audit")
async def audit_log(
    current_user=Depends(require_admin),
    db: Session = Depends(get_db),
    limit: int = 100,
):
    logs = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(limit).all()
    return [
        {
            "id": l.id, "username": l.username, "action": l.action,
            "target": l.target, "detail": l.detail, "ip_address": l.ip_address,
            "timestamp": l.timestamp,
        }
        for l in logs
    ]
