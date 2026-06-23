import json
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Query

from ..models.database import AlertTuningHistory


def _json_dumps(data: Any) -> str | None:
    if data is None:
        return None
    return json.dumps(data, ensure_ascii=False, sort_keys=True)


def _json_loads(data: str | None) -> Any:
    if not data:
        return None
    try:
        return json.loads(data)
    except Exception:
        return None


def record_tuning_history(
    db,
    *,
    actor: str,
    action: str,
    scope: str,
    alert_id: str | None = None,
    rule_id: str | None = None,
    original_level: int | None = None,
    tuned_level: int | None = None,
    previous_tuned_level: int | None = None,
    reason: str | None = None,
    status: str | None = None,
    deploy_snapshot: Any = None,
    commit: bool = True,
) -> AlertTuningHistory:
    entry = AlertTuningHistory(
        action=action,
        scope=scope,
        alert_id=alert_id,
        rule_id=rule_id,
        original_level=original_level,
        tuned_level=tuned_level,
        previous_tuned_level=previous_tuned_level,
        reason=reason,
        status=status,
        actor=actor,
        deploy_snapshot=_json_dumps(deploy_snapshot),
    )
    db.add(entry)
    if commit:
        db.commit()
        db.refresh(entry)
    return entry


def serialize_history_entry(entry: AlertTuningHistory) -> dict[str, Any]:
    created_at = entry.created_at
    if isinstance(created_at, datetime):
        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)
        created_at = created_at.isoformat().replace("+00:00", "Z")
    return {
        "id": entry.id,
        "action": entry.action,
        "scope": entry.scope,
        "alert_id": entry.alert_id,
        "rule_id": entry.rule_id,
        "original_level": entry.original_level,
        "tuned_level": entry.tuned_level,
        "previous_tuned_level": entry.previous_tuned_level,
        "reason": entry.reason,
        "status": entry.status,
        "actor": entry.actor,
        "deploy_snapshot": _json_loads(entry.deploy_snapshot),
        "created_at": created_at,
    }


def apply_tuning_history_filters(
    query: Query,
    *,
    scope: str | None = None,
    action: str | None = None,
    rule_id: str | None = None,
    alert_id: str | None = None,
    actor: str | None = None,
    original_level: int | None = None,
    tuned_level: int | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
) -> Query:
    if scope:
        query = query.filter(AlertTuningHistory.scope == scope)
    if action:
        query = query.filter(AlertTuningHistory.action == action)
    if rule_id:
        query = query.filter(AlertTuningHistory.rule_id == rule_id)
    if alert_id:
        query = query.filter(AlertTuningHistory.alert_id == alert_id)
    if actor:
        query = query.filter(AlertTuningHistory.actor == actor)
    if original_level is not None:
        query = query.filter(AlertTuningHistory.original_level == original_level)
    if tuned_level is not None:
        query = query.filter(AlertTuningHistory.tuned_level == tuned_level)
    if date_from is not None:
        query = query.filter(AlertTuningHistory.created_at >= date_from)
    if date_to is not None:
        query = query.filter(AlertTuningHistory.created_at <= date_to)
    return query
