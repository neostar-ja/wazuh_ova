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


async def get_alerts(size=50, level_min=1, sources=None, time_range="24h", query_str=None):
    client = get_client()
    must = [{"range": {"@timestamp": {"gte": f"now-{time_range}"}}}]
    if level_min > 1:
        must.append({"range": {"rule.level": {"gte": level_min}}})
    if sources:
        must.append({"terms": {"predecoder.program_name.keyword": sources}})
    if query_str:
        must.append({"query_string": {"query": query_str}})
    body = {
        "size": size,
        "sort": [{"@timestamp": {"order": "desc"}}],
        "query": {"bool": {"must": must}},
        "_source": [
            "@timestamp", "rule.id", "rule.level", "rule.description",
            "rule.groups", "data.srcip", "data.dstip", "agent.name",
            "GeoLocation", "rule.pci_dss", "rule.nist_800_53",
            "predecoder.program_name", "rule.mitre",
        ],
    }
    try:
        resp = client.search(index=settings.opensearch_index, body=body)
        return [h["_source"] for h in resp["hits"]["hits"]]
    except Exception:
        return []


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


async def investigate_entity(value: str, entity_type: str = "auto", time_range: str = "30d"):
    client = get_client()
    q = (
        f'data.srcip:"{value}" OR data.dhcp_ip:"{value}" OR data.mac:"{value}" '
        f'OR data.dstuser:"{value}" OR data.dhcp_mac:"{value}" '
        f'OR data.dhcp_hostname:"{value}" OR src_ip:"{value}"'
    )
    body = {
        "size": 100,
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
            "@timestamp", "rule.description", "rule.groups", "rule.level",
            "data.srcip", "data.dstip", "data.dhcp_ip", "data.dhcp_mac",
            "data.dhcp_hostname", "data.dstuser", "data.mac", "data.ap_mac",
            "data.ac_msg_type", "data.dhcp_action", "GeoLocation",
            "predecoder.program_name", "agent.name",
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


async def get_asset_devices(time_range: str = "7d", limit: int = 250):
    events = await _search_entity_events(
        'data.dhcp_ip:* OR data.dhcp_mac:* OR data.srcip:* OR data.mac:*',
        time_range=time_range,
        size=max(500, min(limit * 8, 2000)),
    )
    grouped = {}
    for event in events:
        data = event.get("data", {})
        ip = data.get("dhcp_ip") or data.get("srcip")
        mac = data.get("dhcp_mac") or data.get("mac")
        if not ip and not mac:
          continue
        key = f"{ip or 'unknown'}::{mac or 'unknown'}"
        grouped.setdefault(key, []).append(event)

    devices = []
    for group_events in grouped.values():
        summary = summarize_entity_events(group_events)
        devices.append(summary)

    devices.sort(
        key=lambda item: (
            item.get("last_seen") or "",
            item.get("risk_score") or 0,
            item.get("event_count") or 0,
        ),
        reverse=True,
    )
    return devices[:limit]


async def get_asset_stats(time_range: str = "7d"):
    devices = await get_asset_devices(time_range=time_range, limit=500)
    total = len(devices)
    online = sum(1 for device in devices if device.get("status") == "online")
    stale = sum(1 for device in devices if device.get("status") == "stale")
    risky = sum(1 for device in devices if (device.get("risk_score") or 0) >= 7)
    new_24h = 0
    conflicts = 0
    for device in devices:
        first_seen = _parse_ts(device.get("first_seen"))
        if first_seen and first_seen >= datetime.now(timezone.utc) - timedelta(hours=24):
            new_24h += 1
        if device.get("ip_conflicts"):
            conflicts += 1
    return {
        "total_devices": total,
        "online_devices": online,
        "stale_devices": stale,
        "new_devices_24h": new_24h,
        "conflict_devices": conflicts,
        "high_risk_devices": risky,
    }


async def get_device_detail(identifier: str, time_range: str = "30d"):
    query = (
        f'data.dhcp_ip:"{identifier}" OR data.srcip:"{identifier}" OR data.dstip:"{identifier}" '
        f'OR data.dhcp_mac:"{identifier}" OR data.mac:"{identifier}"'
    )
    events = await _search_entity_events(query, time_range=time_range, size=300)
    summary = summarize_entity_events(events, entity_value=identifier)
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


async def get_asset_devices(time_range: str = "7d"):
    client = get_client()
    body = {
        "size": 0,
        "query": {
            "bool": {
                "must": [
                    {"range": {"@timestamp": {"gte": f"now-{time_range}"}}},
                    {"exists": {"field": "data.dhcp_ip"}},
                ]
            }
        },
        "aggs": {
            "devices": {
                "composite": {
                    "size": 200,
                    "sources": [
                        {"ip": {"terms": {"field": "data.dhcp_ip.keyword"}}},
                        {"mac": {"terms": {"field": "data.dhcp_mac.keyword"}}},
                    ],
                }
            }
        },
    }
    try:
        resp = client.search(index=settings.opensearch_index, body=body)
        return resp.get("aggregations", {}).get("devices", {}).get("buckets", [])
    except Exception:
        return []
