#!/usr/bin/env python3
"""
MISP to Wazuh CDB list sync.

Reads configuration from /opt/code/wazuh_ova/.env or /etc/misp-integration.env,
pulls selected IOC types from MISP, writes CDB-formatted files, and uploads them
to the Wazuh manager through the Wazuh API.
"""

from __future__ import annotations

import logging
import os
import sys
from pathlib import Path
from typing import Iterable

import requests
from urllib3.exceptions import InsecureRequestWarning

requests.packages.urllib3.disable_warnings(InsecureRequestWarning)

ENV_FILES = ("/opt/code/wazuh_ova/.env", "/etc/misp-integration.env")
CDB_DIR = Path(os.environ.get("MISP_CDB_DIR", "/tmp/misp_cdb"))
LOG_FILE = os.environ.get("MISP_CDB_LOG", "/var/log/misp-cdb-sync.log")


def load_env() -> dict[str, str]:
    env: dict[str, str] = {}
    for env_file in ENV_FILES:
        path = Path(env_file)
        if not path.exists():
            continue
        for raw in path.read_text().splitlines():
            line = raw.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            env[key.strip()] = value.strip().strip('"').strip("'")
    env.update({k: v for k, v in os.environ.items() if k.startswith(("MISP_", "WAZUH_", "wazuh_"))})
    return env


def first(env: dict[str, str], *names: str, default: str = "") -> str:
    for name in names:
        value = env.get(name)
        if value:
            return value
    return default


def setup_logging() -> None:
    handlers: list[logging.Handler] = [logging.StreamHandler()]
    try:
        handlers.append(logging.FileHandler(LOG_FILE))
    except PermissionError:
        pass
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
        handlers=handlers,
    )


env = load_env()
MISP_URL = first(env, "MISP_URL", default="https://10.251.151.15:4430").rstrip("/")
MISP_KEY = first(env, "MISP_API_KEY")
WAZUH_HOST = first(env, "WAZUH_HOST", "WAZUH_MANAGER", default="10.251.151.11")
WAZUH_USER = first(env, "WAZUH_API_USER", "wazuh_api_username", default="wazuh-wui")
WAZUH_PASS = first(env, "WAZUH_API_PASS", "wazuh_api_password")


def unique_clean(values: Iterable[str]) -> list[str]:
    cleaned = []
    seen = set()
    for value in values:
        item = str(value).strip()
        if not item or item in seen or ":" in item:
            continue
        seen.add(item)
        cleaned.append(item)
    return sorted(cleaned)


def get_misp_iocs(ioc_type: str, limit: int = 5000) -> list[str]:
    headers = {
        "Authorization": MISP_KEY,
        "Accept": "application/json",
        "Content-Type": "application/json",
    }
    payload = {
        "returnFormat": "json",
        "type": ioc_type,
        "to_ids": 1,
        "limit": limit,
        "enforceWarninglist": 1,
    }
    try:
        response = requests.post(
            f"{MISP_URL}/attributes/restSearch",
            headers=headers,
            json=payload,
            verify=False,
            timeout=60,
        )
        response.raise_for_status()
        data = response.json()
        attrs = data.get("response", {}).get("Attribute", [])
        return unique_clean(attr.get("value", "") for attr in attrs)
    except Exception as exc:
        logging.error("MISP query failed for %s: %s", ioc_type, exc)
        return []


def write_cdb(name: str, values: list[str]) -> Path | None:
    try:
        CDB_DIR.mkdir(parents=True, exist_ok=True)
        dest = CDB_DIR / name
        dest.write_text("".join(f"{value}:\n" for value in values))
        logging.info("CDB %s: wrote %d IOCs to %s", name, len(values), dest)
        return dest
    except Exception as exc:
        logging.error("Write CDB %s failed: %s", name, exc)
        return None


def wazuh_token() -> str | None:
    if not WAZUH_PASS:
        logging.error("Wazuh API password is not configured")
        return None
    try:
        response = requests.post(
            f"https://{WAZUH_HOST}:55000/security/user/authenticate",
            auth=(WAZUH_USER, WAZUH_PASS),
            verify=False,
            timeout=15,
        )
        response.raise_for_status()
        return response.json()["data"]["token"]
    except Exception as exc:
        logging.error("Wazuh authentication failed: %s", exc)
        return None


def deploy_to_wazuh(local_path: Path, remote_name: str, token: str) -> bool:
    try:
        response = requests.put(
            f"https://{WAZUH_HOST}:55000/lists/files/{remote_name}",
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/octet-stream"},
            data=local_path.read_bytes(),
            verify=False,
            timeout=30,
        )
        if response.status_code in (200, 201):
            logging.info("Deployed %s to Wazuh", remote_name)
            return True
        logging.error("Deploy %s failed: %s %s", remote_name, response.status_code, response.text[:300])
        return False
    except Exception as exc:
        logging.error("Deploy %s failed: %s", remote_name, exc)
        return False


def main() -> int:
    setup_logging()
    if not MISP_KEY:
        logging.error("MISP_API_KEY is not configured")
        return 2

    logging.info("=== MISP to Wazuh CDB sync started ===")
    token = wazuh_token()
    if not token:
        return 2

    ioc_map = {
        "ip-dst": "misp-ip-dst",
        "ip-src": "misp-ip-src",
        "domain": "misp-domains",
        "hostname": "misp-hostnames",
        "md5": "misp-md5",
        "sha256": "misp-sha256",
        "url": "misp-urls",
    }
    stats: dict[str, int] = {}
    failures = 0

    for misp_type, cdb_name in ioc_map.items():
        iocs = get_misp_iocs(misp_type)
        if not iocs:
            logging.warning("No IOCs returned for type: %s", misp_type)
            continue
        local_path = write_cdb(cdb_name, iocs)
        if not local_path:
            failures += 1
            continue
        if deploy_to_wazuh(local_path, cdb_name, token):
            stats[cdb_name] = len(iocs)
        else:
            failures += 1

    logging.info("=== Sync complete: %s failures=%d ===", stats, failures)
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
