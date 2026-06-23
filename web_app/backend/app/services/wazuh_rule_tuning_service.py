import re
from typing import Any

from . import wazuh_service

MANAGED_TUNING_RULE_FILE = "soc_center_tuning_rules.xml"


def _value(obj: Any, key: str, default: Any = None) -> Any:
    if isinstance(obj, dict):
        return obj.get(key, default)
    return getattr(obj, key, default)


def _xml_comment(value: Any) -> str:
    text = str(value or "").replace("--", "- -").strip()
    return text or "-"


def _extract_rule_block(xml: str, rule_id: str) -> str:
    pattern = re.compile(
        rf'<rule\b(?=[^>]*\bid\s*=\s*["\']{re.escape(str(rule_id))}["\'])[^>]*>.*?</rule>',
        re.DOTALL,
    )
    match = pattern.search(xml or "")
    if not match:
        raise ValueError(f"Wazuh rule {rule_id} was not found in source XML")
    return match.group(0)


def _set_rule_attr(opening_tag: str, attr: str, value: str) -> str:
    attr_pattern = re.compile(rf'(\s{re.escape(attr)}\s*=\s*)(["\']).*?\2')
    if attr_pattern.search(opening_tag):
        return attr_pattern.sub(rf'\1"{value}"', opening_tag, count=1)
    return opening_tag[:-1].rstrip() + f' {attr}="{value}">'


def _tune_rule_block(rule_block: str, tuned_level: int) -> str:
    if tuned_level < 1 or tuned_level > 15:
        raise ValueError("Wazuh rule level must be between 1 and 15")

    opening_match = re.search(r"<rule\b[^>]*>", rule_block or "")
    if not opening_match:
        raise ValueError("Invalid Wazuh rule block")

    opening = opening_match.group(0)
    tuned_opening = _set_rule_attr(opening, "level", str(tuned_level))
    tuned_opening = _set_rule_attr(tuned_opening, "overwrite", "yes")
    return rule_block[:opening_match.start()] + tuned_opening + rule_block[opening_match.end():]


def build_wazuh_tuning_rules_xml(items: list[dict[str, Any]]) -> str:
    blocks = [
        "<!-- Managed by SOC Center. Do not edit by hand; use Admin > Alert Tuning. -->",
        '<group name="soc_center_tuning,">',
    ]
    for item in items:
        blocks.append(
            "  "
            + "<!-- "
            + f'rule_id={_xml_comment(item.get("rule_id"))}; '
            + f'level={_xml_comment(item.get("original_level"))}->{_xml_comment(item.get("tuned_level"))}; '
            + f'source={_xml_comment(item.get("source_file"))}; '
            + f'reason={_xml_comment(item.get("reason"))}'
            + " -->"
        )
        rule_block = str(item.get("rule_block") or "").strip()
        blocks.append("\n".join("  " + line if line.strip() else line for line in rule_block.splitlines()))
    blocks.append("</group>")
    return "\n".join(blocks) + "\n"


def _extract_rule_filenames(files_payload: Any) -> list[str]:
    data = files_payload.get("data", {}) if isinstance(files_payload, dict) else {}
    affected_items = data.get("affected_items", files_payload if isinstance(files_payload, list) else [])
    filenames: list[str] = []
    for item in affected_items or []:
        if isinstance(item, str):
            filename = item
        elif isinstance(item, dict):
            filename = item.get("filename") or item.get("file") or item.get("name") or item.get("path") or ""
        else:
            filename = ""
        filename = str(filename).strip()
        if filename and filename != MANAGED_TUNING_RULE_FILE and filename not in filenames:
            filenames.append(filename)
    return filenames


async def deploy_tunings_to_wazuh(tunings: list[Any]) -> dict[str, Any]:
    active_tunings = [t for t in tunings if _value(t, "status", "active") == "active"]
    if not active_tunings:
        raise RuntimeError("No active alert tuning entries to deploy")

    files_payload = await wazuh_service.get_rules_files()
    filenames = _extract_rule_filenames(files_payload)
    if not filenames:
        raise RuntimeError("Wazuh did not return any rule files")

    found: dict[str, dict[str, Any]] = {}
    remaining = {str(_value(t, "rule_id", "")).strip() for t in active_tunings}
    remaining.discard("")

    for filename in filenames:
        if not remaining:
            break
        content = await wazuh_service.get_rule_file(filename)
        for rule_id in list(remaining):
            try:
                original_block = _extract_rule_block(content, rule_id)
            except ValueError:
                continue
            found[rule_id] = {"source_file": filename, "rule_block": original_block}
            remaining.remove(rule_id)

    if remaining:
        missing = ", ".join(sorted(remaining))
        raise RuntimeError(f"Could not find Wazuh rule block(s): {missing}. No Wazuh rule file was changed.")

    items: list[dict[str, Any]] = []
    for tuning in active_tunings:
        rule_id = str(_value(tuning, "rule_id", "")).strip()
        tuned_level = int(_value(tuning, "tuned_level"))
        original_block = found[rule_id]["rule_block"]
        tuned_block = _tune_rule_block(original_block, tuned_level)
        items.append({
            "rule_id": rule_id,
            "original_level": int(_value(tuning, "original_level")),
            "tuned_level": tuned_level,
            "reason": _value(tuning, "reason", ""),
            "source_file": found[rule_id]["source_file"],
            "rule_block": tuned_block,
        })

    content = build_wazuh_tuning_rules_xml(items)
    upload_result = await wazuh_service.put_rule_file(MANAGED_TUNING_RULE_FILE, content)
    restart_result = await wazuh_service.restart_manager()

    return {
        "ok": True,
        "filename": MANAGED_TUNING_RULE_FILE,
        "deployed": [
            {
                "rule_id": item["rule_id"],
                "original_level": item["original_level"],
                "tuned_level": item["tuned_level"],
                "source_file": item["source_file"],
            }
            for item in items
        ],
        "upload": upload_result,
        "restart": restart_result,
    }
