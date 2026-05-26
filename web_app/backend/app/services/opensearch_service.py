from opensearchpy import OpenSearch
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
from ..core.config import settings


def get_client():
    return OpenSearch(
        hosts=[{"host": settings.opensearch_host, "port": settings.opensearch_port}],
        http_auth=(settings.opensearch_user, settings.opensearch_pass),
        use_ssl=True,
        verify_certs=settings.opensearch_verify_ssl,
        ssl_show_warn=False,
        timeout=30,
    )


async def get_alerts(
    size=50,
    level_min=1,
    level_max=None,
    sources=None,
    time_range="24h",
    query_str=None,
    agent_name=None,
    rule_id=None,
    country=None,
    mitre_tactic=None,
):
    client = get_client()
    must = [{"range": {"@timestamp": {"gte": f"now-{time_range}"}}}]
    if level_min > 1:
        level_range = {"gte": level_min}
        if level_max:
            level_range["lte"] = level_max
        must.append({"range": {"rule.level": level_range}})
    if sources:
        must.append({"terms": {"predecoder.program_name.keyword": sources}})
    if query_str:
        must.append({"query_string": {"query": query_str, "default_operator": "AND"}})
    if agent_name:
        must.append({"term": {"agent.name.keyword": agent_name}})
    if rule_id:
        must.append({"term": {"rule.id": rule_id}})
    if country:
        must.append({"term": {"GeoLocation.country_name.keyword": country}})
    if mitre_tactic:
        must.append({"term": {"rule.mitre.tactic.keyword": mitre_tactic}})
    body = {
        "size": size,
        "sort": [{"@timestamp": {"order": "desc"}}],
        "query": {"bool": {"must": must}},
        "_source": [
            "@timestamp", "rule.id", "rule.level", "rule.description",
            "rule.groups", "rule.mitre", "rule.pci_dss", "rule.hipaa",
            "rule.nist_800_53", "rule.gdpr", "rule.tsc",
            "data.srcip", "data.dstip", "data.srcport", "data.dstport",
            "data.srcuser", "data.dstuser", "data.url", "data.command",
            "data.win.system.eventID", "data.win.eventdata.targetUserName",
            "agent.name", "agent.id",
            "GeoLocation", "predecoder.program_name", "full_log",
        ],
    }
    try:
        resp = client.search(index=settings.opensearch_index, body=body)
        return [h["_source"] for h in resp["hits"]["hits"]]
    except Exception:
        return []


async def get_alert_aggs(time_range: str = "24h", level_min: int = 1):
    """Aggregations for alerts stats page: timeline, top rules, top agents, top countries, top sources, MITRE."""
    client = get_client()
    must = [{"range": {"@timestamp": {"gte": f"now-{time_range}"}}}]
    if level_min > 1:
        must.append({"range": {"rule.level": {"gte": level_min}}})
    body = {
        "size": 0,
        "query": {"bool": {"must": must}},
        "aggs": {
            "by_level": {
                "range": {
                    "field": "rule.level",
                    "ranges": [
                        {"key": "critical", "from": 15},
                        {"key": "high",     "from": 12, "to": 15},
                        {"key": "medium",   "from": 7,  "to": 12},
                        {"key": "low",      "from": 1,  "to": 7},
                    ],
                }
            },
            "timeline": {
                "date_histogram": {
                    "field": "@timestamp",
                    "fixed_interval": _pick_interval(time_range),
                    "min_doc_count": 0,
                    "extended_bounds": {"min": f"now-{time_range}", "max": "now"},
                },
                "aggs": {
                    "by_severity": {
                        "range": {
                            "field": "rule.level",
                            "ranges": [
                                {"key": "critical", "from": 15},
                                {"key": "high",     "from": 12, "to": 15},
                                {"key": "medium",   "from": 7,  "to": 12},
                            ],
                        }
                    }
                },
            },
            "by_source":  {"terms": {"field": "predecoder.program_name.keyword", "size": 10}},
            "by_rule":    {"terms": {"field": "rule.id", "size": 15}},
            "by_agent":   {"terms": {"field": "agent.name.keyword", "size": 10}},
            "by_country": {"terms": {"field": "GeoLocation.country_name.keyword", "size": 10}},
            "by_mitre":   {"terms": {"field": "rule.mitre.tactic.keyword", "size": 10}},
            "by_srcip":   {"terms": {"field": "data.srcip.keyword", "size": 10}},
        },
    }
    try:
        return client.search(index=settings.opensearch_index, body=body)
    except Exception:
        return {}


def _pick_interval(time_range: str) -> str:
    mapping = {"1h": "5m", "6h": "15m", "24h": "1h", "7d": "6h", "30d": "1d", "90d": "3d"}
    return mapping.get(time_range, "1h")


async def get_alert_stats(time_range="24h"):
    client = get_client()
    body = {
        "size": 0,
        "query": {"range": {"@timestamp": {"gte": f"now-{time_range}"}}},
        "aggs": {
            "by_level": {
                "range": {
                    "field": "rule.level",
                    "ranges": [
                        {"key": "critical", "from": 15},
                        {"key": "high", "from": 12, "to": 15},
                        {"key": "medium", "from": 7, "to": 12},
                        {"key": "low", "from": 1, "to": 7},
                    ],
                }
            },
            "by_source": {"terms": {"field": "predecoder.program_name.keyword", "size": 10}},
            "by_country": {"terms": {"field": "GeoLocation.country_name.keyword", "size": 10}},
            "timeline": {
                "date_histogram": {
                    "field": "@timestamp",
                    "calendar_interval": "1h",
                    "min_doc_count": 0,
                    "extended_bounds": {"min": f"now-{time_range}", "max": "now"},
                }
            },
        },
    }
    try:
        return client.search(index=settings.opensearch_index, body=body)
    except Exception:
        return {}


async def investigate_entity(value: str, entity_type: str = "auto", time_range: str = "30d", size: int = 500):
    client = get_client()
    # Build query based on entity_type
    if entity_type == "ip":
        q = f'data.srcip:"{value}" OR data.dstip:"{value}" OR data.dhcp_ip:"{value}"'
    elif entity_type == "mac":
        q = f'data.mac:"{value}" OR data.dhcp_mac:"{value}" OR data.ap_mac:"{value}"'
    elif entity_type == "user":
        q = f'data.dstuser:"{value}" OR data.srcuser:"{value}"'
    elif entity_type == "host":
        q = f'data.dhcp_hostname:"{value}" OR agent.name:"{value}"'
    else:  # auto
        q = (
            f'data.srcip:"{value}" OR data.dstip:"{value}" OR data.dhcp_ip:"{value}" '
            f'OR data.mac:"{value}" OR data.dhcp_mac:"{value}" '
            f'OR data.dstuser:"{value}" OR data.srcuser:"{value}" '
            f'OR data.dhcp_hostname:"{value}" OR agent.name:"{value}"'
        )
    body = {
        "size": size,
        "sort": [{"@timestamp": {"order": "desc"}}],
        "query": {
            "bool": {
                "must": [
                    {"query_string": {"query": q}},
                    {"range": {"@timestamp": {"gte": f"now-{time_range}"}}},
                ]
            }
        },
        "_source": [
            "@timestamp", "rule.id", "rule.description", "rule.groups",
            "rule.level", "rule.mitre", "rule.pci_dss", "rule.hipaa",
            "data.srcip", "data.dstip", "data.srcport", "data.dstport",
            "data.dhcp_ip", "data.dhcp_mac", "data.dhcp_hostname",
            "data.dstuser", "data.srcuser", "data.mac", "data.ap_mac",
            "data.ac_msg_type", "data.dhcp_action", "data.url", "data.command",
            "data.action", "data.proto", "data.src_zone", "data.dst_zone",
            "data.app", "data.devname", "data.srcintf", "data.dstintf",
            "GeoLocation.country_name", "GeoLocation.city_name",
            "GeoLocation.longitude", "GeoLocation.latitude",
            "predecoder.program_name", "agent.name", "agent.id",
            "full_log",
        ],
    }
    try:
        resp = client.search(index=settings.opensearch_index, body=body)
        return [h["_source"] for h in resp["hits"]["hits"]]
    except Exception:
        return []


def _parse_ts(value):
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except Exception:
        return None


def _pick_primary(counter: Counter):
    return counter.most_common(1)[0][0] if counter else None


def _calc_risk_score(max_level: int, event_count: int):
    base = min(7.5, (max_level / 15) * 7.5) if max_level else 0
    volume = min(2.5, event_count / 20)
    return round(min(10, base + volume), 1)


def summarize_entity_events(events, entity_value: str | None = None):
    ips = Counter()
    macs = Counter()
    hostnames = Counter()
    users = Counter()
    agents = Counter()
    programs = Counter()
    rules = Counter()
    ip_to_macs = defaultdict(set)
    daily = Counter()
    first_seen = None
    last_seen = None
    max_level = 0

    for event in events:
        data = event.get("data", {})
        rule = event.get("rule", {})
        predecoder = event.get("predecoder", {})
        agent = event.get("agent", {})

        ts_raw = event.get("@timestamp")
        ts = _parse_ts(ts_raw)
        if ts:
            first_seen = ts if first_seen is None or ts < first_seen else first_seen
            last_seen = ts if last_seen is None or ts > last_seen else last_seen
            daily[ts.strftime("%Y-%m-%d")] += 1

        for key in ("dhcp_ip", "srcip", "dstip"):
            value = data.get(key)
            if value:
                ips[value] += 1
        for key in ("dhcp_mac", "mac", "ap_mac"):
            value = data.get(key)
            if value:
                macs[value] += 1
        for key in ("dhcp_hostname",):
            value = data.get(key)
            if value:
                hostnames[value] += 1
        for key in ("dstuser", "srcuser"):
            value = data.get(key)
            if value:
                users[value] += 1

        if data.get("dhcp_ip") and data.get("dhcp_mac"):
            ip_to_macs[data["dhcp_ip"]].add(data["dhcp_mac"])
        if data.get("srcip") and data.get("mac"):
            ip_to_macs[data["srcip"]].add(data["mac"])

        if agent.get("name"):
            agents[agent["name"]] += 1
        if predecoder.get("program_name"):
            programs[predecoder["program_name"]] += 1

        rule_id = rule.get("id")
        rule_desc = rule.get("description")
        if rule_id:
            rules[(rule_id, rule_desc or "-")] += 1

        level = int(rule.get("level") or 0)
        max_level = max(max_level, level)

    primary_ip = entity_value if entity_value in ips else _pick_primary(ips)
    primary_mac = entity_value if entity_value in macs else _pick_primary(macs)
    risk_score = _calc_risk_score(max_level, len(events))
    now = datetime.now(timezone.utc)
    if last_seen and last_seen >= now - timedelta(hours=24):
        status = "online"
    elif last_seen and last_seen >= now - timedelta(days=7):
        status = "stale"
    else:
        status = "offline"

    return {
        "ip": primary_ip,
        "mac": primary_mac,
        "hostname": _pick_primary(hostnames),
        "user": _pick_primary(users),
        "agent": _pick_primary(agents),
        "top_source": _pick_primary(programs),
        "status": status,
        "risk_score": risk_score,
        "event_count": len(events),
        "max_level": max_level,
        "first_seen": first_seen.isoformat() if first_seen else None,
        "last_seen": last_seen.isoformat() if last_seen else None,
        "ips": [{"value": k, "count": v} for k, v in ips.most_common(10)],
        "macs": [{"value": k, "count": v} for k, v in macs.most_common(10)],
        "hostnames": [{"value": k, "count": v} for k, v in hostnames.most_common(10)],
        "users": [{"value": k, "count": v} for k, v in users.most_common(10)],
        "agents": [{"value": k, "count": v} for k, v in agents.most_common(10)],
        "programs": [{"value": k, "count": v} for k, v in programs.most_common(10)],
        "ip_conflicts": {ip: sorted(list(macs_seen)) for ip, macs_seen in ip_to_macs.items() if len(macs_seen) > 1},
        "top_rules": [
            {"id": rule_id, "description": desc, "count": count}
            for (rule_id, desc), count in rules.most_common(10)
        ],
        "timeline": [{"date": date, "count": count} for date, count in sorted(daily.items())],
    }


async def get_entity_network_stats(ip: str, time_range: str = "30d") -> dict:
    """Aggregation-based network traffic analysis for a given IP (no raw events, fast)."""
    client = get_client()
    must = [
        {
            "bool": {
                "should": [
                    {"term": {"data.srcip.keyword": ip}},
                    {"term": {"data.dstip.keyword": ip}},
                ],
                "minimum_should_match": 1,
            }
        },
        {"range": {"@timestamp": {"gte": f"now-{time_range}"}}},
    ]
    body = {
        "size": 0,
        "query": {"bool": {"must": must}},
        "aggs": {
            "as_src_top_dst": {
                "filter": {"term": {"data.srcip.keyword": ip}},
                "aggs": {
                    "top_dst_ips": {"terms": {"field": "data.dstip.keyword", "size": 15}},
                    "top_dstports": {"terms": {"field": "data.dstport.keyword", "size": 10}},
                },
            },
            "as_dst_top_src": {
                "filter": {"term": {"data.dstip.keyword": ip}},
                "aggs": {
                    "top_src_ips": {"terms": {"field": "data.srcip.keyword", "size": 15}},
                },
            },
            "proto_dist":    {"terms": {"field": "data.protocol.keyword",          "size": 8}},
            "conn_state":    {"terms": {"field": "data.connection_state.keyword",  "size": 8}},
            "zone_src":      {"terms": {"field": "data.src_zone.keyword",          "size": 10}},
            "zone_dst":      {"terms": {"field": "data.dst_zone.keyword",          "size": 10}},
            "rule_names":    {"terms": {"field": "data.rule_name.keyword",         "size": 8}},
            "decoders":      {"terms": {"field": "decoder.name.keyword",           "size": 8}},
            "geo_countries": {"terms": {"field": "GeoLocation.country_name.keyword","size": 12}},
        },
    }
    try:
        resp = client.search(index=settings.opensearch_index, body=body)
        aggs = resp.get("aggregations", {})

        def _buckets(key: str) -> list:
            return [
                {"value": b["key"], "count": b["doc_count"]}
                for b in aggs.get(key, {}).get("buckets", [])
                if b["doc_count"] > 0
            ]

        def _nested(outer: str, inner: str) -> list:
            return [
                {"value": b["key"], "count": b["doc_count"]}
                for b in aggs.get(outer, {}).get(inner, {}).get("buckets", [])
                if b["doc_count"] > 0
            ]

        # Normalize protocol: "6"→"TCP", "17"→"UDP", "1"→"ICMP"; text "TCP"/"UDP" pass through
        PROTO_MAP = {"6": "TCP", "17": "UDP", "1": "ICMP", "47": "GRE", "50": "ESP", "89": "OSPF"}
        proto_dist = [
            {"value": PROTO_MAP.get(b["value"], b["value"]), "raw": b["value"], "count": b["count"]}
            for b in _buckets("proto_dist")
        ]

        return {
            "ip": ip,
            "total": resp["hits"]["total"]["value"],
            "top_dst_ips":  _nested("as_src_top_dst", "top_dst_ips"),
            "top_src_ips":  _nested("as_dst_top_src", "top_src_ips"),
            "top_dstports": _nested("as_src_top_dst", "top_dstports"),
            "proto_dist":    proto_dist,
            "conn_state":    _buckets("conn_state"),
            "zone_src":      _buckets("zone_src"),
            "zone_dst":      _buckets("zone_dst"),
            "rule_names":    _buckets("rule_names"),
            "decoders":      _buckets("decoders"),
            "geo_countries": _buckets("geo_countries"),
        }
    except Exception as e:
        return {"ip": ip, "total": 0, "error": str(e)}


async def _search_entity_events(query: str, time_range: str = "30d", size: int = 250):
    client = get_client()
    body = {
        "size": size,
        "sort": [{"@timestamp": {"order": "desc"}}],
        "query": {
            "bool": {
                "must": [
                    {"query_string": {"query": query}},
                    {"range": {"@timestamp": {"gte": f"now-{time_range}"}}},
                ]
            }
        },
        "_source": [
            "@timestamp", "rule.id", "rule.description", "rule.level", "rule.groups",
            "data.srcip", "data.dstip", "data.dhcp_ip", "data.dhcp_mac",
            "data.dhcp_hostname", "data.dstuser", "data.srcuser", "data.mac",
            "data.ap_mac", "data.ac_msg_type", "data.dhcp_action", "GeoLocation",
            "predecoder.program_name", "agent.name",
        ],
    }
    try:
        resp = client.search(index=settings.opensearch_index, body=body)
        return [hit["_source"] for hit in resp["hits"]["hits"]]
    except Exception:
        return []


def _first_ipv4(addresses):
    for address in addresses:
        if "." in address:
            return address
    return addresses[0] if addresses else None


def _normalize_asset_status(status: str | None):
    value = (status or "").lower()
    if value in {"active", "connected"}:
        return "online"
    if value in {"disconnected", "pending"}:
        return "stale"
    return "offline"


def _last_keepalive_value(value: str | None):
    if not value or value.startswith("9999-"):
        return None
    return value


async def _inventory_index_docs(index_name: str, source_fields=None, size: int = 500):
    client = get_client()
    body = {"size": size}
    if source_fields:
        body["_source"] = source_fields
    try:
        resp = client.search(index=index_name, body=body)
        return [hit.get("_source", {}) for hit in resp.get("hits", {}).get("hits", [])]
    except Exception:
        return []


async def _inventory_index_count(index_name: str):
    client = get_client()
    try:
        return int(client.count(index=index_name).get("count", 0))
    except Exception:
        return 0


async def _load_asset_inventory(time_range: str = "7d"):
    from . import wazuh_service

    agents_payload = await wazuh_service.get_agents()
    agents = agents_payload.get("data", {}).get("affected_items", [])

    system_docs = await _inventory_index_docs(
        "wazuh-states-inventory-system-wazuh",
        ["agent.id", "agent.name", "agent.version", "host.hostname", "host.os.name", "host.os.version", "host.architecture", "wazuh.cluster.node"],
        size=200,
    )
    hardware_docs = await _inventory_index_docs(
        "wazuh-states-inventory-hardware-wazuh",
        ["agent.id", "host.cpu.name", "host.cpu.cores", "host.cpu.speed", "host.memory.total", "host.memory.used", "host.memory.free", "host.memory.usage", "host.serial_number"],
        size=200,
    )
    interface_docs = await _inventory_index_docs(
        "wazuh-states-inventory-interfaces-wazuh",
        ["agent.id", "host.mac", "interface.name", "interface.state", "interface.type", "interface.mtu"],
        size=1000,
    )
    network_docs = await _inventory_index_docs(
        "wazuh-states-inventory-networks-wazuh",
        ["agent.id", "interface.name", "network.ip", "network.netmask", "network.type"],
        size=1000,
    )

    client = get_client()
    alert_body = {
        "size": 0,
        "query": {
            "bool": {
                "must": [
                    {"range": {"@timestamp": {"gte": f"now-{time_range}"}}},
                    {"range": {"rule.level": {"gte": 7}}},
                ]
            }
        },
        "aggs": {
            "agents": {
                "terms": {"field": "agent.id", "size": 200},
                "aggs": {
                    "agent_name": {"terms": {"field": "agent.name.keyword", "size": 1}},
                    "max_level": {"max": {"field": "rule.level"}},
                    "last_seen": {"max": {"field": "@timestamp"}},
                    "top_source": {"terms": {"field": "predecoder.program_name.keyword", "size": 1}},
                },
            }
        },
    }
    try:
        alert_resp = client.search(index=settings.opensearch_index, body=alert_body)
        alert_buckets = alert_resp.get("aggregations", {}).get("agents", {}).get("buckets", [])
    except Exception:
        alert_buckets = []

    system_map = {doc.get("agent", {}).get("id"): doc for doc in system_docs if doc.get("agent", {}).get("id")}
    hardware_map = {doc.get("agent", {}).get("id"): doc for doc in hardware_docs if doc.get("agent", {}).get("id")}
    interface_map = defaultdict(list)
    for doc in interface_docs:
        agent_id = doc.get("agent", {}).get("id")
        if agent_id:
            interface_map[agent_id].append(doc)
    network_map = defaultdict(list)
    for doc in network_docs:
        agent_id = doc.get("agent", {}).get("id")
        if agent_id:
            network_map[agent_id].append(doc)
    alert_map = {}
    for bucket in alert_buckets:
        key = bucket.get("key")
        if not key:
            continue
        top_source = bucket.get("top_source", {}).get("buckets", [])
        alert_map[key] = {
            "event_count": bucket.get("doc_count", 0),
            "max_level": int(bucket.get("max_level", {}).get("value") or 0),
            "last_seen": bucket.get("last_seen", {}).get("value_as_string"),
            "top_source": top_source[0]["key"] if top_source else None,
        }

    devices = []
    for agent in agents:
        agent_id = agent.get("id")
        if not agent_id or agent_id == "000":
            continue

        system_doc = system_map.get(agent_id, {})
        hardware_doc = hardware_map.get(agent_id, {})
        interface_entries = interface_map.get(agent_id, [])
        network_entries = network_map.get(agent_id, [])
        alert_data = alert_map.get(agent_id, {})

        host = system_doc.get("host", {})
        host_os = host.get("os", {})
        hardware_host = hardware_doc.get("host", {})
        cpu = hardware_host.get("cpu", {})
        memory = hardware_host.get("memory", {})

        addresses = []
        for entry in network_entries:
            address = entry.get("network", {}).get("ip")
            if address and address not in addresses:
                addresses.append(address)

        interface_names = []
        mac_addresses = []
        for entry in interface_entries:
            iface = entry.get("interface", {})
            host_mac = entry.get("host", {}).get("mac")
            if iface.get("name") and iface["name"] not in interface_names:
                interface_names.append(iface["name"])
            if host_mac and host_mac not in mac_addresses:
                mac_addresses.append(host_mac)

        agent_ip = agent.get("ip")
        primary_ip = agent_ip if agent_ip not in {"127.0.0.1", "any", None} else _first_ipv4(addresses)
        if primary_ip in {"127.0.0.1", "any"}:
            primary_ip = _first_ipv4(addresses)

        max_level = alert_data.get("max_level", 0)
        event_count = alert_data.get("event_count", 0)
        last_seen = _last_keepalive_value(agent.get("lastKeepAlive")) or alert_data.get("last_seen")

        devices.append({
            "asset_kind": "managed",
            "asset_id": agent_id,
            "agent_id": agent_id,
            "agent": agent.get("name"),
            "hostname": host.get("hostname") or agent.get("name"),
            "ip": primary_ip,
            "mac": mac_addresses[0] if mac_addresses else None,
            "ips": addresses,
            "macs": [{"value": value, "count": 1} for value in mac_addresses],
            "status": _normalize_asset_status(agent.get("status")),
            "agent_status": agent.get("status"),
            "group": ", ".join(agent.get("group", [])) if isinstance(agent.get("group"), list) else agent.get("group"),
            "manager": agent.get("manager"),
            "node": system_doc.get("wazuh", {}).get("cluster", {}).get("node") or agent.get("node_name"),
            "version": agent.get("version") or system_doc.get("agent", {}).get("version"),
            "architecture": host.get("architecture") or agent.get("os", {}).get("arch"),
            "os": host_os.get("name") or agent.get("os", {}).get("name"),
            "os_version": host_os.get("version") or agent.get("os", {}).get("version"),
            "cpu_name": cpu.get("name"),
            "cpu_cores": cpu.get("cores"),
            "cpu_speed_mhz": cpu.get("speed"),
            "memory_total": memory.get("total"),
            "memory_used": memory.get("used"),
            "memory_usage": memory.get("usage"),
            "serial_number": hardware_host.get("serial_number"),
            "interface_count": len(interface_names),
            "address_count": len(addresses),
            "event_count": event_count,
            "max_level": max_level,
            "risk_score": _calc_risk_score(max_level, event_count),
            "top_source": alert_data.get("top_source"),
            "first_seen": agent.get("dateAdd"),
            "last_seen": last_seen,
            "top_rules": [],
            "timeline": [],
            "users": [],
            "programs": [],
            "hostnames": [{"value": host.get("hostname") or agent.get("name"), "count": 1}],
            "agents": [{"value": agent.get("name"), "count": 1}],
            "ip_conflicts": {},
        })

    return devices


async def _load_dhcp_summary(time_range: str = "7d"):
    client = get_client()
    body = {
        "size": 2000,
        "sort": [{"@timestamp": {"order": "desc"}}],
        "query": {
            "bool": {
                "must": [
                    {"range": {"@timestamp": {"gte": f"now-{time_range}"}}},
                    {"exists": {"field": "data.dhcp_ip"}},
                ]
            }
        },
        "_source": ["@timestamp", "data.dhcp_ip", "data.dhcp_mac", "data.dhcp_hostname", "data.dhcp_action", "agent.name"],
        "aggs": {
            "unique_ips": {"cardinality": {"field": "data.dhcp_ip"}},
            "unique_macs": {"cardinality": {"field": "data.dhcp_mac"}},
        },
    }
    try:
        resp = client.search(index=settings.opensearch_index, body=body)
        hits = [hit.get("_source", {}) for hit in resp.get("hits", {}).get("hits", [])]
        unique_ips = int(resp.get("aggregations", {}).get("unique_ips", {}).get("value", 0))
        unique_macs = int(resp.get("aggregations", {}).get("unique_macs", {}).get("value", 0))
    except Exception:
        hits = []
        unique_ips = 0
        unique_macs = 0

    ip_to_macs = defaultdict(set)
    for event in hits:
        data = event.get("data", {})
        if data.get("dhcp_ip") and data.get("dhcp_mac"):
            ip_to_macs[data["dhcp_ip"]].add(data["dhcp_mac"])
    try:
        recent_24h = int(client.count(
            index=settings.opensearch_index,
            body={
                "query": {
                    "bool": {
                        "must": [
                            {"range": {"@timestamp": {"gte": "now-24h"}}},
                            {"exists": {"field": "data.dhcp_ip"}},
                        ]
                    }
                }
            },
        ).get("count", 0))
    except Exception:
        recent_24h = 0

    return {
        "events": hits,
        "unique_ips": unique_ips,
        "unique_macs": unique_macs,
        "recent_events_24h": recent_24h,
        "conflicts": sum(1 for macs in ip_to_macs.values() if len(macs) > 1),
    }


async def get_asset_devices(time_range: str = "7d", limit: int = 250):
    devices = await _load_asset_inventory(time_range=time_range)
    devices.sort(
        key=lambda item: (
            {"online": 2, "stale": 1, "offline": 0}.get(item.get("status"), 0),
            item.get("risk_score") or 0,
            item.get("last_seen") or "",
        ),
        reverse=True,
    )
    return devices[:limit]


async def get_asset_stats(time_range: str = "7d"):
    devices = await get_asset_devices(time_range=time_range, limit=500)
    dhcp_summary = await _load_dhcp_summary(time_range=time_range)
    total = len(devices)
    online = sum(1 for device in devices if device.get("status") == "online")
    stale = sum(1 for device in devices if device.get("status") == "stale")
    risky = sum(1 for device in devices if (device.get("risk_score") or 0) >= 7)
    os_breakdown = Counter((device.get("os") or "Unknown") for device in devices)
    inventory_counts = {
        "system": await _inventory_index_count("wazuh-states-inventory-system-wazuh"),
        "hardware": await _inventory_index_count("wazuh-states-inventory-hardware-wazuh"),
        "interfaces": await _inventory_index_count("wazuh-states-inventory-interfaces-wazuh"),
        "networks": await _inventory_index_count("wazuh-states-inventory-networks-wazuh"),
        "ports": await _inventory_index_count("wazuh-states-inventory-ports-wazuh"),
    }
    new_24h = 0
    for device in devices:
        first_seen = _parse_ts(device.get("first_seen"))
        if first_seen and first_seen >= datetime.now(timezone.utc) - timedelta(hours=24):
            new_24h += 1
    return {
        "total_devices": total,
        "online_devices": online,
        "stale_devices": stale,
        "new_devices_24h": new_24h,
        "conflict_devices": dhcp_summary["conflicts"],
        "high_risk_devices": risky,
        "managed_assets": total,
        "dhcp_unique_ips": dhcp_summary["unique_ips"],
        "dhcp_unique_macs": dhcp_summary["unique_macs"],
        "dhcp_events_24h": dhcp_summary["recent_events_24h"],
        "inventory_counts": inventory_counts,
        "os_breakdown": [{"label": key, "value": value} for key, value in os_breakdown.most_common(8)],
    }


async def get_device_detail(identifier: str, time_range: str = "30d"):
    managed_assets = await _load_asset_inventory(time_range=time_range)
    managed_device = next((
        item for item in managed_assets
        if identifier in {
            item.get("asset_id"),
            item.get("agent_id"),
            item.get("agent"),
            item.get("hostname"),
            item.get("ip"),
            item.get("mac"),
        }
    ), None)

    query_parts = [
        f'data.dhcp_ip:"{identifier}"',
        f'data.srcip:"{identifier}"',
        f'data.dstip:"{identifier}"',
        f'data.dhcp_mac:"{identifier}"',
        f'data.mac:"{identifier}"',
        f'agent.id:"{identifier}"',
        f'agent.name:"{identifier}"',
    ]
    if managed_device:
        if managed_device.get("agent_id") and managed_device.get("agent_id") != identifier:
            query_parts.append(f'agent.id:"{managed_device["agent_id"]}"')
        if managed_device.get("agent") and managed_device.get("agent") != identifier:
            query_parts.append(f'agent.name:"{managed_device["agent"]}"')
        if managed_device.get("ip") and managed_device.get("ip") != identifier:
            query_parts.extend([
                f'data.dhcp_ip:"{managed_device["ip"]}"',
                f'data.srcip:"{managed_device["ip"]}"',
                f'data.dstip:"{managed_device["ip"]}"',
            ])
        if managed_device.get("mac") and managed_device.get("mac") != identifier:
            query_parts.extend([
                f'data.dhcp_mac:"{managed_device["mac"]}"',
                f'data.mac:"{managed_device["mac"]}"',
            ])

    query = " OR ".join(dict.fromkeys(query_parts))
    events = await _search_entity_events(query, time_range=time_range, size=300)
    summary = summarize_entity_events(events, entity_value=identifier)
    if managed_device:
        summary.update({
            **managed_device,
            "event_count": max(summary.get("event_count", 0), managed_device.get("event_count", 0)),
            "top_rules": summary.get("top_rules", []),
            "timeline": summary.get("timeline", []),
            "users": summary.get("users", []),
            "programs": summary.get("programs", []),
            "ip_conflicts": summary.get("ip_conflicts", {}),
        })
    dhcp_history = [event for event in events if event.get("data", {}).get("dhcp_action")]
    wifi_sessions = [
        event for event in events
        if event.get("data", {}).get("ac_msg_type") or event.get("predecoder", {}).get("program_name") == "huawei-ac"
    ]
    recent_alerts = [
        {
            "timestamp": event.get("@timestamp"),
            "level": int(event.get("rule", {}).get("level") or 0),
            "rule_id": event.get("rule", {}).get("id"),
            "description": event.get("rule", {}).get("description"),
            "source": event.get("predecoder", {}).get("program_name"),
            "agent": event.get("agent", {}).get("name"),
            "srcip": event.get("data", {}).get("srcip"),
            "dstip": event.get("data", {}).get("dstip"),
        }
        for event in events[:30]
    ]
    return {
        "device": summary,
        "dhcp_history": dhcp_history[:50],
        "wifi_sessions": wifi_sessions[:50],
        "recent_alerts": recent_alerts,
        "top_rules": summary.get("top_rules", []),
        "timeline": summary.get("timeline", []),
    }


async def get_ioc_history(value: str, time_range: str = "30d", limit: int = 100):
    query = (
        f'data.srcip:"{value}" OR data.dstip:"{value}" OR data.dhcp_ip:"{value}" OR '
        f'data.mac:"{value}" OR data.dhcp_mac:"{value}" OR data.dstuser:"{value}" OR '
        f'data.dhcp_hostname:"{value}" OR rule.description:"{value}"'
    )
    events = await _search_entity_events(query, time_range=time_range, size=limit)
    return [
        {
            "timestamp": event.get("@timestamp"),
            "description": event.get("rule", {}).get("description"),
            "level": int(event.get("rule", {}).get("level") or 0),
            "source": event.get("predecoder", {}).get("program_name"),
            "agent": event.get("agent", {}).get("name"),
            "srcip": event.get("data", {}).get("srcip"),
            "dstip": event.get("data", {}).get("dstip"),
        }
        for event in events
    ]


async def get_compliance_stats(framework: str, time_range: str = "7d"):
    client = get_client()
    field_map = {
        "pci_dss": "rule.pci_dss",
        "hipaa": "rule.hipaa",
        "gdpr": "rule.gdpr",
        "nist": "rule.nist_800_53",
        "tsc": "rule.tsc",
    }
    field = field_map.get(framework, "rule.pci_dss")
    body = {
        "size": 0,
        "query": {"range": {"@timestamp": {"gte": f"now-{time_range}"}}},
        "aggs": {
            "by_requirement": {"terms": {"field": f"{field}.keyword", "size": 50}},
            "total": {"value_count": {"field": "rule.id"}},
        },
    }
    try:
        return client.search(index=settings.opensearch_index, body=body)
    except Exception:
        return {}
