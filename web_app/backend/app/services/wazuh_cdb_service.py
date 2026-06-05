"""
Wazuh CDB (Custom Database) Sync Service
Syncs SOC Center Custom IOC Blocklist → Wazuh CDB list files
so that Wazuh alerts fire automatically when blocked IOCs appear in logs.

CDB files managed:
  etc/lists/soc-custom-ioc-ip      — IP addresses
  etc/lists/soc-custom-ioc-domain  — Domains
  etc/lists/soc-custom-ioc-hash    — File hashes
"""
import logging
from datetime import datetime
from typing import Optional

import httpx
from sqlalchemy.orm import Session

from ..core.config import settings
from ..models.database import CustomIOC

logger = logging.getLogger("wazuh_cdb")

_SSL = False
_TIMEOUT = 15

# CDB list names (stored in Wazuh etc/lists/)
CDB_IP     = "soc-custom-ioc-ip"
CDB_DOMAIN = "soc-custom-ioc-domain"
CDB_HASH   = "soc-custom-ioc-hash"

# Map IOC type → CDB list name
_TYPE_TO_CDB: dict[str, str] = {
    "ip":          CDB_IP,
    "domain":      CDB_DOMAIN,
    "hash":        CDB_HASH,
    "hash_md5":    CDB_HASH,
    "hash_sha1":   CDB_HASH,
    "hash_sha256": CDB_HASH,
    "url":         CDB_DOMAIN,  # URLs grouped with domains
}

# Wazuh detection rules for SOC CDB lists
_SOC_CDB_RULES_XML = """\
<!-- SOC Center Custom IOC Blocklist Rules — auto-generated, do not edit manually -->
<group name="soc_blocklist,threat_intel">

  <!-- Source IP matches SOC custom IOC blocklist -->
  <rule id="100500" level="13">
    <if_group>network</if_group>
    <list field="srcip" lookup="match_key">etc/lists/soc-custom-ioc-ip</list>
    <description>SOC Blocklist: Source IP $(srcip) is in custom IOC list</description>
    <group>soc_blocklist,blocklist_ip,attack</group>
    <mitre><id>T1071</id></mitre>
  </rule>

  <!-- Destination IP matches SOC custom IOC blocklist -->
  <rule id="100501" level="13">
    <if_group>network</if_group>
    <list field="dstip" lookup="match_key">etc/lists/soc-custom-ioc-ip</list>
    <description>SOC Blocklist: Destination IP $(dstip) is in custom IOC list</description>
    <group>soc_blocklist,blocklist_ip,attack</group>
    <mitre><id>T1071</id></mitre>
  </rule>

  <!-- Domain (from syslog/network logs) matches SOC domain blocklist -->
  <rule id="100502" level="12">
    <if_group>syslog</if_group>
    <list field="data.hostname" lookup="match_key">etc/lists/soc-custom-ioc-domain</list>
    <description>SOC Blocklist: Domain $(data.hostname) is in custom IOC list</description>
    <group>soc_blocklist,blocklist_domain,attack</group>
    <mitre><id>T1071</id></mitre>
  </rule>

  <!-- File hash (from FIM/syscheck) matches SOC hash blocklist -->
  <rule id="100503" level="14">
    <if_group>syscheck</if_group>
    <list field="data.syscheck.sha256_after" lookup="match_key">etc/lists/soc-custom-ioc-hash</list>
    <description>SOC Blocklist: File hash $(data.syscheck.sha256_after) matches known malware</description>
    <group>soc_blocklist,blocklist_hash,malware</group>
    <mitre><id>T1059</id></mitre>
  </rule>

</group>
"""


# ── Wazuh API helpers ──────────────────────────────────────────────────────────

async def _get_wazuh_token() -> Optional[str]:
    """Authenticate to Wazuh API and return JWT token."""
    if not settings.wazuh_api_host:
        return None
    try:
        base = f"https://{settings.wazuh_api_host}:{settings.wazuh_api_port}"
        async with httpx.AsyncClient(verify=_SSL, timeout=_TIMEOUT) as c:
            r = await c.post(
                f"{base}/security/user/authenticate",
                auth=(settings.wazuh_api_user, settings.wazuh_api_pass),
            )
            r.raise_for_status()
            return r.json()["data"]["token"]
    except Exception as e:
        logger.error("Wazuh auth failed: %s", e)
        return None


def _build_cdb_content(iocs: list[CustomIOC]) -> str:
    """Build CDB list file content from IOC records.
    Format: key:value  (one per line, no spaces around colon)
    value is a human-readable label: SEVERITY_description
    """
    lines: list[str] = []
    for ioc in iocs:
        key = ioc.value.strip().lower()
        sev = (ioc.severity or "high").upper()
        desc = (ioc.description or "soc_blocklist").strip()
        # sanitize: remove newlines/colons from description
        desc = desc.replace("\n", " ").replace(":", " ").replace(" ", "_")[:60]
        lines.append(f"{key}:{sev}_{desc}")
    # Wazuh CDB requires at least one entry; add placeholder if empty
    if not lines:
        lines.append("0.0.0.0:empty_placeholder")
    return "\n".join(lines) + "\n"


async def _upload_cdb_file(token: str, list_name: str, content: str) -> dict:
    """Upload (overwrite) a CDB list file to Wazuh."""
    base = f"https://{settings.wazuh_api_host}:{settings.wazuh_api_port}"
    try:
        async with httpx.AsyncClient(verify=_SSL, timeout=_TIMEOUT) as c:
            r = await c.put(
                f"{base}/lists/files/{list_name}",
                params={"overwrite": "true"},
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/octet-stream",
                },
                content=content.encode("utf-8"),
            )
        data = r.json()
        ok = r.status_code == 200 and data.get("error") == 0
        return {
            "ok": ok,
            "list_name": list_name,
            "status_code": r.status_code,
            "affected": data.get("data", {}).get("affected_items", []),
            "failed": data.get("data", {}).get("failed_items", []),
            "message": data.get("message", ""),
        }
    except Exception as e:
        logger.error("Upload CDB %s failed: %s", list_name, e)
        return {"ok": False, "list_name": list_name, "error": str(e)}


async def _upload_detection_rules(token: str) -> dict:
    """Upload SOC CDB detection rules via Wazuh /rules/files endpoint."""
    base = f"https://{settings.wazuh_api_host}:{settings.wazuh_api_port}"
    try:
        async with httpx.AsyncClient(verify=_SSL, timeout=_TIMEOUT) as c:
            r = await c.put(
                f"{base}/rules/files/soc_cdb_rules.xml",
                params={"overwrite": "true"},
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/octet-stream",
                },
                content=_SOC_CDB_RULES_XML.encode("utf-8"),
            )
        data = r.json()
        ok = r.status_code == 200 and data.get("error") == 0
        return {"ok": ok, "status_code": r.status_code, "message": data.get("message", ""),
                "affected": data.get("data", {}).get("affected_items", [])}
    except Exception as e:
        logger.error("Upload Wazuh rules failed: %s", e)
        return {"ok": False, "error": str(e)}


async def _reload_wazuh(token: str) -> dict:
    """Reload Wazuh manager to apply CDB changes (non-disruptive)."""
    base = f"https://{settings.wazuh_api_host}:{settings.wazuh_api_port}"
    try:
        async with httpx.AsyncClient(verify=_SSL, timeout=30) as c:
            r = await c.put(
                f"{base}/manager/restart",
                headers={"Authorization": f"Bearer {token}"},
            )
        data = r.json()
        ok = r.status_code == 202 and data.get("error") == 0
        return {"ok": ok, "status_code": r.status_code, "message": data.get("message", "")}
    except Exception as e:
        logger.error("Wazuh reload failed: %s", e)
        return {"ok": False, "error": str(e)}


# ── Public API ─────────────────────────────────────────────────────────────────

async def sync_cdb(db: Session, reload: bool = True) -> dict:
    """
    Full sync: read active CustomIOCs from SQLite → upload to Wazuh CDB files.
    Returns a dict with per-list results and optional reload status.
    """
    now_iso = datetime.utcnow().isoformat() + "Z"
    token = await _get_wazuh_token()
    if not token:
        return {
            "ok": False,
            "error": "Cannot authenticate to Wazuh API",
            "synced_at": now_iso,
        }

    # Fetch all active IOCs grouped by type
    all_iocs: list[CustomIOC] = (
        db.query(CustomIOC)
        .filter(CustomIOC.is_active == True)
        .all()
    )

    ip_iocs     = [i for i in all_iocs if i.ioc_type in ("ip",)]
    domain_iocs = [i for i in all_iocs if i.ioc_type in ("domain", "url")]
    hash_iocs   = [i for i in all_iocs if i.ioc_type in ("hash", "hash_md5", "hash_sha1", "hash_sha256")]

    results: dict = {}

    ip_result = await _upload_cdb_file(token, CDB_IP, _build_cdb_content(ip_iocs))
    results["ip"] = {**ip_result, "ioc_count": len(ip_iocs)}

    domain_result = await _upload_cdb_file(token, CDB_DOMAIN, _build_cdb_content(domain_iocs))
    results["domain"] = {**domain_result, "ioc_count": len(domain_iocs)}

    hash_result = await _upload_cdb_file(token, CDB_HASH, _build_cdb_content(hash_iocs))
    results["hash"] = {**hash_result, "ioc_count": len(hash_iocs)}

    # Ensure detection rules exist
    rules_result = await _upload_detection_rules(token)
    results["rules"] = rules_result

    # Reload Wazuh to apply CDB changes
    reload_result: dict = {"ok": True, "skipped": True}
    if reload:
        reload_result = await _reload_wazuh(token)
        results["reload"] = reload_result

    all_ok = all(v.get("ok", False) for v in results.values())

    logger.info(
        "CDB sync: ip=%d domain=%d hash=%d ok=%s",
        len(ip_iocs), len(domain_iocs), len(hash_iocs), all_ok
    )

    return {
        "ok": all_ok,
        "synced_at": now_iso,
        "total_iocs": len(all_iocs),
        "by_type": {
            "ip": len(ip_iocs),
            "domain": len(domain_iocs),
            "hash": len(hash_iocs),
        },
        "results": results,
    }


async def get_cdb_status(db: Session) -> dict:
    """Return current CDB sync status without doing a sync."""
    token = await _get_wazuh_token()
    if not token:
        return {"wazuh_reachable": False, "error": "Cannot authenticate to Wazuh API"}

    base = f"https://{settings.wazuh_api_host}:{settings.wazuh_api_port}"
    try:
        async with httpx.AsyncClient(verify=_SSL, timeout=_TIMEOUT) as c:
            r = await c.get(
                f"{base}/lists/files",
                headers={"Authorization": f"Bearer {token}"},
            )
        files_data = r.json().get("data", {}).get("affected_items", [])
        filenames = [f["filename"] for f in files_data]

        total_active = db.query(CustomIOC).filter(CustomIOC.is_active == True).count()

        return {
            "wazuh_reachable": True,
            "cdb_lists": {
                CDB_IP:     CDB_IP     in filenames,
                CDB_DOMAIN: CDB_DOMAIN in filenames,
                CDB_HASH:   CDB_HASH   in filenames,
            },
            "all_lists_created": all(n in filenames for n in [CDB_IP, CDB_DOMAIN, CDB_HASH]),
            "local_ioc_count": total_active,
        }
    except Exception as e:
        return {"wazuh_reachable": False, "error": str(e)}
