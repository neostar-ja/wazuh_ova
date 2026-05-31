"""
Web Push Notification Router (VAPID)
Handles push subscription management and VAPID public key distribution.
"""
import json
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import text
from ..models.database import get_db
from ..routers.auth import get_current_user
from ..core.config import settings

router = APIRouter(prefix="/push", tags=["push"])


class PushSubscription(BaseModel):
    endpoint: str
    keys: dict  # {"p256dh": "...", "auth": "..."}


@router.get("/vapid-key")
async def get_vapid_key():
    """Return VAPID public key for frontend subscription."""
    return {"publicKey": settings.vapid_public_key}


@router.post("/subscribe")
async def subscribe(
    sub: PushSubscription,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Save push subscription from browser."""
    p256dh = sub.keys.get("p256dh", "")
    auth = sub.keys.get("auth", "")
    if not sub.endpoint or not p256dh or not auth:
        raise HTTPException(status_code=400, detail="Invalid subscription object")

    db.execute(
        text("""
            INSERT INTO push_subscriptions (endpoint, p256dh, auth, user_id)
            VALUES (:endpoint, :p256dh, :auth, :user_id)
            ON CONFLICT(endpoint) DO UPDATE SET
                p256dh=excluded.p256dh, auth=excluded.auth, user_id=excluded.user_id
        """),
        {"endpoint": sub.endpoint, "p256dh": p256dh, "auth": auth, "user_id": current_user.id},
    )
    db.commit()
    return {"status": "subscribed"}


@router.delete("/subscribe")
async def unsubscribe(
    sub: PushSubscription,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Remove push subscription."""
    db.execute(
        text("DELETE FROM push_subscriptions WHERE endpoint = :endpoint"),
        {"endpoint": sub.endpoint},
    )
    db.commit()
    return {"status": "unsubscribed"}


def send_push_notification_sync(db: Session, title: str, body: str, url: str = "/wazuh/alerts"):
    """Send Web Push to all subscribed endpoints (synchronous, call from WS loop)."""
    if not settings.vapid_private_key or not settings.vapid_public_key:
        return

    try:
        from pywebpush import webpush, WebPushException
    except ImportError:
        return

    result = db.execute(text("SELECT endpoint, p256dh, auth FROM push_subscriptions"))
    subscriptions = result.fetchall()
    payload = json.dumps({"title": title, "body": body, "url": url})

    expired = []
    for row in subscriptions:
        endpoint, p256dh, auth = row
        try:
            webpush(
                subscription_info={"endpoint": endpoint, "keys": {"p256dh": p256dh, "auth": auth}},
                data=payload,
                vapid_private_key=settings.vapid_private_key,
                vapid_claims={"sub": settings.vapid_email},
            )
        except WebPushException as e:
            if e.response and e.response.status_code in (404, 410):
                expired.append(endpoint)
        except Exception:
            pass

    for ep in expired:
        db.execute(text("DELETE FROM push_subscriptions WHERE endpoint = :ep"), {"ep": ep})
    if expired:
        db.commit()
