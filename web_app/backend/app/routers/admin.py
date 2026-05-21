from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from ..routers.auth import get_current_user
from ..models.database import get_db, User, AuditLog, AlertTuning, AlertConfig
from ..core.security import get_password_hash
from ..services import wazuh_service

router = APIRouter(prefix="/admin", tags=["admin"])

DEFAULT_CONFIG_KEYS = [
    "telegram_bot_token",
    "telegram_chat_id",
    "alert_level_threshold",
]


def require_admin(current_user=Depends(get_current_user)):
    if current_user.role not in ("admin", "superadmin"):
        raise HTTPException(status_code=403, detail="Admin required")
    return current_user


def require_superadmin(current_user=Depends(get_current_user)):
    if current_user.role != "superadmin":
        raise HTTPException(status_code=403, detail="Superadmin required")
    return current_user


def _write_audit(db, user, action, target=None, detail=None, ip=None):
    db.add(AuditLog(
        user_id=user.id,
        username=user.username,
        action=action,
        target=target,
        detail=detail,
        ip_address=ip,
    ))
    db.commit()


# ─── Rules ───────────────────────────────────────────────────────────────────

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
async def save_rule(
    filename: str,
    request: Request,
    current_user=Depends(require_admin),
    db: Session = Depends(get_db),
):
    body = await request.body()
    content = body.decode("utf-8")
    result = await wazuh_service.put_rule_file(filename, content)
    _write_audit(db, current_user, "save_rule", filename,
                 f"Saved {len(content)} bytes",
                 request.client.host if request.client else None)
    return result


@router.post("/deploy")
async def deploy(
    request: Request,
    current_user=Depends(require_admin),
    db: Session = Depends(get_db),
):
    result = await wazuh_service.restart_manager()
    _write_audit(db, current_user, "deploy_restart",
                 ip=request.client.host if request.client else None)
    return result


# ─── Alert Tuning ─────────────────────────────────────────────────────────────

class TuningCreate(BaseModel):
    rule_id: str
    original_level: int
    tuned_level: int
    reason: str
    review_date: Optional[datetime] = None


class TuningStatusUpdate(BaseModel):
    status: str  # active | expired | reverted


@router.get("/tuning")
async def list_tuning(current_user=Depends(require_admin), db: Session = Depends(get_db)):
    entries = db.query(AlertTuning).order_by(AlertTuning.added_at.desc()).all()
    return [
        {
            "id": e.id, "rule_id": e.rule_id,
            "original_level": e.original_level, "tuned_level": e.tuned_level,
            "reason": e.reason, "added_by": e.added_by,
            "added_at": e.added_at, "review_date": e.review_date, "status": e.status,
        }
        for e in entries
    ]


@router.post("/tuning", status_code=201)
async def add_tuning(
    tuning: TuningCreate,
    current_user=Depends(require_admin),
    db: Session = Depends(get_db),
):
    if db.query(AlertTuning).filter(AlertTuning.rule_id == tuning.rule_id).first():
        raise HTTPException(status_code=400, detail="Rule ID already exists in tuning")
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


@router.patch("/tuning/{tuning_id}")
async def update_tuning_status(
    tuning_id: int,
    body: TuningStatusUpdate,
    current_user=Depends(require_admin),
    db: Session = Depends(get_db),
):
    entry = db.query(AlertTuning).filter(AlertTuning.id == tuning_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Tuning entry not found")
    if body.status not in ("active", "expired", "reverted"):
        raise HTTPException(status_code=400, detail="Invalid status")
    entry.status = body.status
    db.commit()
    return {"id": entry.id, "status": entry.status}


@router.delete("/tuning/{tuning_id}", status_code=204)
async def delete_tuning(
    tuning_id: int,
    request: Request,
    current_user=Depends(require_admin),
    db: Session = Depends(get_db),
):
    entry = db.query(AlertTuning).filter(AlertTuning.id == tuning_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Tuning entry not found")
    rule_id = entry.rule_id
    db.delete(entry)
    _write_audit(db, current_user, "delete_tuning", rule_id,
                 ip=request.client.host if request.client else None)


# ─── Users ────────────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    username: str
    email: str
    full_name: str
    password: str
    role: str = "viewer"


class UserUpdate(BaseModel):
    is_active: Optional[bool] = None
    role: Optional[str] = None
    password: Optional[str] = None
    full_name: Optional[str] = None
    email: Optional[str] = None


@router.get("/users")
async def list_users(current_user=Depends(require_superadmin), db: Session = Depends(get_db)):
    users = db.query(User).order_by(User.created_at.desc()).all()
    return [
        {
            "id": u.id, "username": u.username, "email": u.email,
            "full_name": u.full_name, "role": u.role, "is_active": u.is_active,
            "created_at": u.created_at, "last_login": u.last_login,
        }
        for u in users
    ]


@router.post("/users", status_code=201)
async def create_user(
    user: UserCreate,
    request: Request,
    current_user=Depends(require_superadmin),
    db: Session = Depends(get_db),
):
    if db.query(User).filter(User.username == user.username).first():
        raise HTTPException(status_code=400, detail="Username already exists")
    if db.query(User).filter(User.email == user.email).first():
        raise HTTPException(status_code=400, detail="Email already exists")
    valid_roles = ("viewer", "analyst", "admin", "superadmin")
    if user.role not in valid_roles:
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {valid_roles}")
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
    _write_audit(db, current_user, "create_user", user.username,
                 f"role={user.role}",
                 request.client.host if request.client else None)
    return {"id": new_user.id, "username": new_user.username}


@router.patch("/users/{user_id}")
async def update_user(
    user_id: int,
    update: UserUpdate,
    request: Request,
    current_user=Depends(require_superadmin),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == current_user.id and update.is_active is False:
        raise HTTPException(status_code=400, detail="Cannot deactivate yourself")

    changes = []
    if update.is_active is not None:
        user.is_active = update.is_active
        changes.append(f"is_active={update.is_active}")
    if update.role is not None:
        valid_roles = ("viewer", "analyst", "admin", "superadmin")
        if update.role not in valid_roles:
            raise HTTPException(status_code=400, detail="Invalid role")
        user.role = update.role
        changes.append(f"role={update.role}")
    if update.password is not None:
        user.hashed_password = get_password_hash(update.password)
        changes.append("password_reset")
    if update.full_name is not None:
        user.full_name = update.full_name
        changes.append(f"full_name={update.full_name}")
    if update.email is not None:
        user.email = update.email
        changes.append(f"email={update.email}")

    db.commit()
    _write_audit(db, current_user, "update_user", user.username,
                 ", ".join(changes),
                 request.client.host if request.client else None)
    return {
        "id": user.id, "username": user.username, "role": user.role,
        "is_active": user.is_active, "full_name": user.full_name,
    }


# ─── Alert Config ─────────────────────────────────────────────────────────────

@router.get("/config")
async def get_config(current_user=Depends(require_admin), db: Session = Depends(get_db)):
    rows = db.query(AlertConfig).all()
    config = {r.key: r.value for r in rows}
    # ensure all known keys present
    for k in DEFAULT_CONFIG_KEYS:
        if k not in config:
            config[k] = ""
    return config


@router.put("/config")
async def save_config(
    request: Request,
    current_user=Depends(require_admin),
    db: Session = Depends(get_db),
):
    body = await request.json()
    allowed = set(DEFAULT_CONFIG_KEYS)
    for key, value in body.items():
        if key not in allowed:
            continue
        row = db.query(AlertConfig).filter(AlertConfig.key == key).first()
        if row:
            row.value = str(value) if value is not None else ""
            row.updated_at = datetime.utcnow()
            row.updated_by = current_user.username
        else:
            db.add(AlertConfig(key=key, value=str(value) if value is not None else "",
                               updated_by=current_user.username))
    db.commit()
    _write_audit(db, current_user, "save_config",
                 detail=f"keys={list(body.keys())}",
                 ip=request.client.host if request.client else None)
    return {"message": "Config saved", "keys": list(body.keys())}


# ─── Audit Log ────────────────────────────────────────────────────────────────

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
