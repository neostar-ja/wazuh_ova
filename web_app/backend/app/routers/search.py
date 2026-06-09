"""
Log / Network Search Router
Unified search across all Wazuh log sources (firewall, IDS, SSH, syscheck, etc.)

Endpoints:
  GET /search/flow          - network traffic search (srcip, dstip, port, proto)
  GET /search/port-listeners - which agents listen on a given port (inventory)
  GET /search/suggest       - query autocomplete / suggestions
"""
import re
from fastapi import APIRouter, Depends, Query
from typing import Optional

from ..routers.auth import get_current_user
from ..services import opensearch_service

router = APIRouter(prefix="/search", tags=["search"])

# ── Query parser ───────────────────────────────────────────────────────────────

_PORT_NAMES = {
    "ssh": 22, "ftp": 21, "telnet": 23, "smtp": 25, "dns": 53,
    "http": 80, "https": 443, "smb": 445, "rdp": 3389, "mssql": 1433,
    "mysql": 3306, "postgres": 5432, "redis": 6379, "mongodb": 27017,
    "vnc": 5900, "winrm": 5985, "ldap": 389, "ldaps": 636,
    "snmp": 161, "ntp": 123, "tftp": 69, "pop3": 110, "imap": 143,
}


def parse_search_query(q: str) -> dict:
    """
    Parse natural-language-ish queries into structured filters.

    Supports:
      port 22               → port=22, direction=both
      dstport:22            → dstport=22
      srcport:22            → srcport=22
      src:10.0.0.1          → srcip=10.0.0.1
      dst:10.0.0.2          → dstip=10.0.0.2
      ip:10.0.0.1           → srcip OR dstip
      10.0.0.1:22           → srcip=10.0.0.1 port=22
      ssh                   → port=22
      tcp:443               → proto=tcp dstport=443
      proto:udp             → proto=udp
      rule:100050           → rule_id=100050
    """
    q = q.strip()
    result: dict = {"raw": q, "query_str": None, "port": None, "srcport": None,
                    "dstport": None, "srcip": None, "dstip": None, "proto": None,
                    "rule_id": None, "group": None, "agent": None, "action": None,
                    "source_family": None, "direction": "both"}

    # Named port
    ql = q.lower()
    if ql in _PORT_NAMES:
        result["port"] = _PORT_NAMES[ql]
        return result

    # key:value pairs
    tokens = q.split()
    free_terms = []
    for tok in tokens:
        low = tok.lower()

        # Explicit key:value
        if ":" in tok:
            key, _, val = tok.partition(":")
            key_l = key.lower()
            if key_l in ("dstport", "dst_port", "dp"):
                result["dstport"] = _safe_int(val)
            elif key_l in ("srcport", "src_port", "sp"):
                result["srcport"] = _safe_int(val)
            elif key_l in ("port", "p"):
                result["port"] = _safe_int(val)
            elif key_l in ("dst", "dstip", "dest"):
                result["dstip"] = val
            elif key_l in ("src", "srcip", "source"):
                result["srcip"] = val
            elif key_l in ("ip", "host"):
                # use query_str for OR matching
                result["query_str"] = (result["query_str"] or "") + f' data.srcip:"{val}" OR data.dstip:"{val}"'
            elif key_l in ("proto", "protocol", "transport"):
                result["proto"] = val.lower()
            elif key_l in ("tcp", "udp"):
                result["proto"] = key_l
                p = _safe_int(val)
                if p:
                    result["port"] = p
            elif key_l in ("rule", "rule_id", "ruleid"):
                result["rule_id"] = val
            elif key_l in ("group", "groups"):
                result["group"] = val
            elif key_l in ("agent", "host"):
                result["agent"] = val
                result["query_str"] = (result["query_str"] or "") + f' agent.name:"{val}"'
            elif key_l in ("action", "decision"):
                result["action"] = val.lower()
            elif key_l in ("source_family", "source", "family"):
                result["source_family"] = val.lower()
            else:
                free_terms.append(tok)
            continue

        # Named protocol shortcuts
        if low in ("tcp", "udp", "icmp"):
            result["proto"] = low
            continue

        # Pure integer → treat as port
        if re.fullmatch(r"\d{1,5}", tok):
            p = int(tok)
            if 1 <= p <= 65535:
                result["port"] = p
                continue

        # IP:port pattern (e.g. 10.0.0.1:22)
        m = re.fullmatch(r"(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}):(\d{1,5})", tok)
        if m:
            result["srcip"] = m.group(1)
            result["port"] = int(m.group(2))
            continue

        # Named port (ssh, rdp, ...)
        if low in _PORT_NAMES:
            result["port"] = _PORT_NAMES[low]
            continue

        # direction keywords
        if low in ("inbound", "to", "dst", "destination"):
            result["direction"] = "dst"
            continue
        if low in ("outbound", "from", "src", "source"):
            result["direction"] = "src"
            continue
        if low in ("allow", "accept", "deny", "block", "drop"):
            result["action"] = low
            continue

        free_terms.append(tok)

    if free_terms:
        result["query_str"] = (result["query_str"] or "") + " " + " ".join(free_terms)
        result["query_str"] = result["query_str"].strip()

    return result


def _safe_int(val: str) -> Optional[int]:
    try:
        return int(val)
    except (ValueError, TypeError):
        return None


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.get("/flow")
async def network_flow_search(
    q:          Optional[str] = Query(None, description="Free query: 'port 22', 'src:10.0.0.1', 'ssh', 'dstport:443'"),
    port:       Optional[int] = Query(None),
    srcport:    Optional[int] = Query(None),
    dstport:    Optional[int] = Query(None),
    srcip:      Optional[str] = Query(None),
    dstip:      Optional[str] = Query(None),
    proto:      Optional[str] = Query(None),
    action:     Optional[str] = Query(None),
    agent:      Optional[str] = Query(None),
    source_family: Optional[str] = Query(None, description="firewall|ids|ssh|dns|dhcp|nac|windows|linux|web"),
    direction:  str           = Query("both", description="both|src|dst"),
    rule_id:    Optional[str] = Query(None),
    group:      Optional[str] = Query(None),
    time_range: str           = Query("24h"),
    size:       int           = Query(200, ge=1, le=1000),
    _=Depends(get_current_user),
):
    """
    Unified network log search across all Wazuh log sources.
    Supports free text query OR structured parameters.
    """
    # Parse free query if provided
    parsed: dict = {}
    if q:
        parsed = parse_search_query(q)

    effective_port    = port    or parsed.get("port")
    effective_srcport = srcport or parsed.get("srcport")
    effective_dstport = dstport or parsed.get("dstport")
    effective_srcip   = srcip   or parsed.get("srcip")
    effective_dstip   = dstip   or parsed.get("dstip")
    effective_proto   = proto   or parsed.get("proto")
    effective_action  = action  or parsed.get("action")
    effective_agent   = agent   or parsed.get("agent")
    effective_family  = source_family or parsed.get("source_family")
    effective_dir     = direction if direction != "both" else parsed.get("direction", "both")
    effective_qs      = parsed.get("query_str") or None
    effective_rule_id = rule_id or parsed.get("rule_id")
    effective_group   = group   or parsed.get("group")

    if effective_rule_id:
        rule_qs = f'rule.id:"{effective_rule_id}"'
        effective_qs = f"{effective_qs} {rule_qs}".strip() if effective_qs else rule_qs
    if effective_group:
        group_qs = f'rule.groups:"{effective_group}"'
        effective_qs = f"{effective_qs} {group_qs}".strip() if effective_qs else group_qs

    result = await opensearch_service.search_network_flow(
        port=effective_port,
        srcip=effective_srcip,
        dstip=effective_dstip,
        srcport=effective_srcport,
        dstport=effective_dstport,
        proto=effective_proto,
        action=effective_action,
        agent=effective_agent,
        source_family=effective_family,
        query_str=effective_qs,
        direction=effective_dir,
        time_range=time_range,
        size=size,
    )

    # Attach parsed context for frontend
    result["parsed_query"] = {
        "port": effective_port,
        "srcport": effective_srcport,
        "dstport": effective_dstport,
        "srcip": effective_srcip,
        "dstip": effective_dstip,
        "proto": effective_proto,
        "action": effective_action,
        "agent": effective_agent,
        "source_family": effective_family,
        "direction": effective_dir,
        "query_str": effective_qs,
    }
    return result


@router.get("/port-listeners")
async def port_listeners(
    port:  Optional[int] = Query(None, description="Filter by listening port"),
    proto: Optional[str] = Query(None, description="tcp|udp"),
    _=Depends(get_current_user),
):
    """
    Return agents and processes currently listening on a given port
    (from Wazuh syscollector port inventory).
    """
    return await opensearch_service.get_port_listeners(port=port, proto=proto)


@router.get("/suggest")
async def suggest(
    q: str = Query(..., min_length=1),
    _=Depends(get_current_user),
):
    """Quick suggestions for the search bar."""
    # Static suggestions enriched with common ports
    suggestions = []
    ql = q.lower().strip()
    for name, port_num in sorted(_PORT_NAMES.items()):
        if ql in name or ql in str(port_num):
            suggestions.append({
                "label": f"{name.upper()} (port {port_num})",
                "query": f"port {port_num}",
                "port": port_num,
            })
    if ql.isdigit():
        p = int(ql)
        if 1 <= p <= 65535:
            suggestions.insert(0, {"label": f"Port {p} (all traffic)", "query": f"port {p}", "port": p})
            suggestions.insert(1, {"label": f"Inbound to port {p}", "query": f"dstport:{p}", "port": p})
            suggestions.insert(2, {"label": f"Outbound from port {p}", "query": f"srcport:{p}", "port": p})
    return {"suggestions": suggestions[:10]}
