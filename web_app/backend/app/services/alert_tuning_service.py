"""SOC Center alert severity tuning helpers.

These helpers apply local severity overrides to Wazuh alert documents returned
from OpenSearch. They do not mutate raw OpenSearch data or Wazuh rules.
"""


def _as_int(value: object, default: int = 0) -> int:
    try:
        return int(value or default)
    except (TypeError, ValueError):
        return default


def _compose_alert_id(alert: dict) -> str:
    rule = alert.get("rule") or {}
    agent = alert.get("agent") or {}
    return str(
        alert.get("id")
        or alert.get("_id")
        or f"{alert.get('@timestamp') or alert.get('timestamp') or ''}-{rule.get('id') or ''}-{agent.get('id') or agent.get('name') or ''}"
    )


def _apply_one(alert: dict, *, scope: str, original_level: int, tuned_level: int, reason: str) -> None:
    rule = alert.setdefault("rule", {})
    if not isinstance(rule, dict):
        return
    current_level = _as_int(rule.get("level"), original_level)
    rule["original_level"] = original_level or current_level
    rule["level"] = tuned_level
    alert["soc_tuning"] = {
        "scope": scope,
        "original_level": original_level or current_level,
        "tuned_level": tuned_level,
        "reason": reason,
    }


def _apply_alert_tuning(alerts: list[dict], rule_tunings: list[object], alert_overrides: list[object]) -> list[dict]:
    tuning_by_rule = {
        str(getattr(tuning, "rule_id", "")): tuning
        for tuning in rule_tunings
        if getattr(tuning, "rule_id", None)
    }
    override_by_alert = {
        str(getattr(override, "alert_id", "")): override
        for override in alert_overrides
        if getattr(override, "alert_id", None)
    }

    for alert in alerts:
        if not isinstance(alert, dict):
            continue
        alert_id = _compose_alert_id(alert)
        alert["soc_alert_id"] = alert_id
        rule = alert.get("rule") or {}
        rule_id = str(rule.get("id") or "")

        rule_tuning = tuning_by_rule.get(rule_id)
        if rule_tuning:
            _apply_one(
                alert,
                scope="rule",
                original_level=_as_int(getattr(rule_tuning, "original_level", None), _as_int(rule.get("level"))),
                tuned_level=_as_int(getattr(rule_tuning, "tuned_level", None), _as_int(rule.get("level"))),
                reason=str(getattr(rule_tuning, "reason", "") or ""),
            )

        single_override = override_by_alert.get(alert_id)
        if single_override:
            _apply_one(
                alert,
                scope="single",
                original_level=_as_int(getattr(single_override, "original_level", None), _as_int(rule.get("original_level") or rule.get("level"))),
                tuned_level=_as_int(getattr(single_override, "tuned_level", None), _as_int(rule.get("level"))),
                reason=str(getattr(single_override, "reason", "") or ""),
            )

    return alerts
