from opensearchpy import OpenSearch
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
