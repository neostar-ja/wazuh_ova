import json
import re
from datetime import datetime

from sqlalchemy.orm import Session

from ..models.database import LogSourceState
from . import wazuh_service

# Only <rule> elements carry a level="N" attribute in these custom rule files,
# so a global replace is safe and leaves decoders/groups/if_sid untouched.
LEVEL_ATTR_RE = re.compile(r'level="\d+"')

LOG_SOURCES = [
    {
        "key": "mikrotik",
        "label": "MikroTik RouterOS",
        "description": "Firewall/NAT flow, VPN, login และ config-change logs จากอุปกรณ์ RouterOS",
        "rule_id_range": "101001-101054",
        "rules_files": ["1001-mikrotik_rules.xml"],
        "decoders_files": ["1001-mikrotik_decoders.xml"],
        "caveat": None,
    },
    {
        "key": "fortigate_wuh",
        "label": "FortiGate WUH (FW-WUH01/02)",
        "description": "Traffic, UTM, event และ admin logs จาก FortiGate HA pair",
        "rule_id_range": "110000-110045",
        "rules_files": ["1005-fortigate-wuh-rules.xml"],
        "decoders_files": ["1004-fortigate-wuh-decoders.xml"],
        "caveat": (
            "alert บางประเภท (deny / admin login / config change) อาจยังปรากฏแบบทั่วไป "
            "ผ่าน compliance overlay rules (1007) แต่ปริมาณ traffic/UTM ส่วนใหญ่จะถูกระงับ"
        ),
    },
    {
        "key": "huawei_usg",
        "label": "Huawei USG Firewall",
        "description": "Policy permit/deny logs จาก Huawei USG firewall",
        "rule_id_range": "100050-100053",
        "rules_files": ["1000-huawei_rules.xml"],
        "decoders_files": [],
        "caveat": (
            "alert บางประเภท (deny / authentication failed) อาจยังปรากฏแบบทั่วไป "
            "ผ่าน compliance overlay rules (1007)"
        ),
    },
    {
        "key": "huawei_ac",
        "label": "Huawei AgileController",
        "description": "802.1X/MAC auth, portal auth และ wireless online/offline events",
        "rule_id_range": "100070-100082",
        "rules_files": ["1002-huawei-ac-rules.xml"],
        "decoders_files": ["0100-huawei-ac-decoders.xml"],
        "caveat": (
            "alert บางประเภท (authentication failed / brute force) อาจยังปรากฏแบบทั่วไป "
            "ผ่าน compliance overlay rules (1007)"
        ),
    },
    {
        "key": "network_anomaly",
        "label": "Network Anomaly Detection",
        "description": "Suspicious flow / threat detection alerts จากระบบตรวจจับความผิดปกติของเครือข่าย",
        "rule_id_range": "100101-100121",
        "rules_files": ["1003-network-anomaly-rules.xml"],
        "decoders_files": [],
        "caveat": None,
    },
    {
        "key": "infoblox",
        "label": "Infoblox DDI",
        "description": "DNS, DHCP, RPZ และ pool exhaustion logs จาก Infoblox DDI",
        "rule_id_range": "100400-100442",
        "rules_files": ["1004-infoblox-rules.xml"],
        "decoders_files": ["1003-infoblox-decoders.xml"],
        "caveat": None,
    },
    {
        "key": "suricata",
        "label": "Suricata IDS (custom overlay)",
        "description": "Custom enrichment rules ต่อจาก Suricata EVE alerts",
        "rule_id_range": "200000-200050",
        "rules_files": ["1006-suricata-ids-rules.xml"],
        "decoders_files": [],
        "caveat": "alert พื้นฐานจาก Suricata built-in rules (86600/86601) ยังคงทำงานตามปกติ",
    },
    {
        "key": "misp",
        "label": "MISP Threat Intel",
        "description": "Threat intelligence match alerts จาก MISP",
        "rule_id_range": "100620-100624",
        "rules_files": ["1009-misp-rules.xml"],
        "decoders_files": [],
        "caveat": None,
    },
]

LOG_SOURCES_BY_KEY = {source["key"]: source for source in LOG_SOURCES}


def _suppress_all_levels(xml_content: str) -> str:
    """Force every rule level="N" to level="0" so the chain terminates with no alert."""
    return LEVEL_ATTR_RE.sub('level="0"', xml_content)


def get_log_source_status(db: Session) -> list[dict]:
    states = {s.source_key: s for s in db.query(LogSourceState).all()}
    result = []
    for source in LOG_SOURCES:
        state = states.get(source["key"])
        result.append({
            "key": source["key"],
            "label": source["label"],
            "description": source["description"],
            "rule_id_range": source["rule_id_range"],
            "rules_files": source["rules_files"],
            "decoders_files": source["decoders_files"],
            "caveat": source["caveat"],
            "enabled": state.enabled if state else True,
            "reason": state.reason if state else None,
            "updated_by": state.updated_by if state else None,
            "updated_at": state.updated_at if state else None,
        })
    return result


async def disable_log_source(db: Session, source_key: str, reason: str, username: str) -> dict:
    source = LOG_SOURCES_BY_KEY.get(source_key)
    if not source:
        raise ValueError(f"Unknown log source: {source_key}")

    state = db.query(LogSourceState).filter(LogSourceState.source_key == source_key).first()
    if state and not state.enabled:
        raise ValueError("Log source is already disabled")

    backup = {}
    for filename in source["rules_files"]:
        original = await wazuh_service.get_rule_file(filename)
        backup[filename] = original
        await wazuh_service.put_rule_file(filename, _suppress_all_levels(original))

    if state is None:
        state = LogSourceState(source_key=source_key)
        db.add(state)
    state.enabled = False
    state.reason = reason
    state.backup_content = json.dumps(backup)
    state.updated_by = username
    state.updated_at = datetime.utcnow()
    db.commit()

    restart_result = await wazuh_service.restart_manager()
    return {"source_key": source_key, "enabled": False, "restart": restart_result}


async def enable_log_source(db: Session, source_key: str, username: str) -> dict:
    source = LOG_SOURCES_BY_KEY.get(source_key)
    if not source:
        raise ValueError(f"Unknown log source: {source_key}")

    state = db.query(LogSourceState).filter(LogSourceState.source_key == source_key).first()
    if state is None or state.enabled:
        raise ValueError("Log source is already enabled")

    backup = json.loads(state.backup_content or "{}")
    for filename in source["rules_files"]:
        original = backup.get(filename)
        if original is None:
            continue
        await wazuh_service.put_rule_file(filename, original)

    state.enabled = True
    state.reason = None
    state.backup_content = None
    state.updated_by = username
    state.updated_at = datetime.utcnow()
    db.commit()

    restart_result = await wazuh_service.restart_manager()
    return {"source_key": source_key, "enabled": True, "restart": restart_result}
