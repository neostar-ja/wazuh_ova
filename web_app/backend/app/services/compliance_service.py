import asyncio
import csv
import io
from collections import Counter, defaultdict
from datetime import datetime, timezone


TIME_RANGE_OPTIONS = {"24h", "7d", "30d", "90d"}

FRAMEWORK_METADATA = {
    "cis": {
        "frameworkId": "cis",
        "frameworkName": "CIS Benchmark",
        "description": "Security configuration baselines from CIS policies and SCA mappings.",
        "color": "#3b82f6",
    },
    "pci_dss": {
        "frameworkId": "pci_dss",
        "frameworkName": "PCI-DSS",
        "description": "Payment card security monitoring from Wazuh rule and SCA mappings.",
        "color": "#0ea5e9",
    },
    "gdpr": {
        "frameworkId": "gdpr",
        "frameworkName": "GDPR",
        "description": "Privacy and data protection evidence from compliance-mapped alerts.",
        "color": "#8b5cf6",
    },
    "hipaa": {
        "frameworkId": "hipaa",
        "frameworkName": "HIPAA",
        "description": "Healthcare compliance evidence related to protected information controls.",
        "color": "#10b981",
    },
    "nist": {
        "frameworkId": "nist",
        "frameworkName": "NIST 800-53",
        "description": "Control evidence mapped to NIST 800-53 and SCA content.",
        "color": "#f59e0b",
    },
    "tsc": {
        "frameworkId": "tsc",
        "frameworkName": "TSC",
        "description": "Trust Services Criteria evidence from Wazuh alert mappings.",
        "color": "#ec4899",
    },
    "iso27001": {
        "frameworkId": "iso27001",
        "frameworkName": "ISO 27001",
        "description": "Evidence derived from SCA compliance references to ISO 27001 controls.",
        "color": "#22c55e",
    },
    "mitre": {
        "frameworkId": "mitre",
        "frameworkName": "MITRE ATT&CK",
        "description": "Technique mappings related to hardening gaps and alert evidence.",
        "color": "#f97316",
    },
}

RAW_FRAMEWORK_MAP = {
    "cis": "cis",
    "pci_dss": "pci_dss",
    "pci_dss_v3.2.1": "pci_dss",
    "pci_dss_v3_2_1": "pci_dss",
    "pci_dss_v4.0": "pci_dss",
    "pci_dss_v4_0": "pci_dss",
    "gdpr": "gdpr",
    "hipaa": "hipaa",
    "nist": "nist",
    "nist_sp_800-53": "nist",
    "nist_sp_800-53": "nist",
    "nist_sp_800_53": "nist",
    "nist_800_53": "nist",
    "tsc": "tsc",
    "iso_27001-2013": "iso27001",
    "iso_27001_2013": "iso27001",
    "iso_27001": "iso27001",
    "mitre": "mitre",
    "mitre_attack": "mitre",
    "mitre_techniques": "mitre",
}

SEVERITY_ORDER = {"critical": 4, "high": 3, "medium": 2, "low": 1, "informational": 0, "unknown": -1}


def normalize_time_range(value: str | None) -> str:
    return value if value in TIME_RANGE_OPTIONS else "7d"


def clamp_limit(value: int | None, default: int = 100, maximum: int = 500) -> int:
    if not isinstance(value, int):
        return default
    return max(1, min(value, maximum))


def safe_text(value, limit: int = 120) -> str:
    if value is None:
        return ""
    text = str(value).strip()
    return text[:limit]


def safe_list(value) -> list:
    if isinstance(value, list):
        return value
    if value is None:
        return []
    return [value]


def parse_datetime(value: str | None):
    if not value or not isinstance(value, str):
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except Exception:
        return None


def iso_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def extract_affected_items(payload: dict | None) -> list:
    if not isinstance(payload, dict):
        return []
    data = payload.get("data")
    if isinstance(data, dict):
        items = data.get("affected_items")
        if isinstance(items, list):
            return items
    return []


def normalize_result_status(value) -> str:
    text = safe_text(value, 32).lower().replace(" ", "_")
    if text in {"passed", "pass"}:
        return "passed"
    if text in {"failed", "fail"}:
        return "failed"
    if text in {"not_applicable", "notapplicable", "n/a"}:
        return "not_applicable"
    if text in {"invalid"}:
        return "invalid"
    return "unknown"


def severity_from_level(level) -> str:
    try:
        level_value = int(level or 0)
    except Exception:
        level_value = 0
    if level_value >= 15:
        return "critical"
    if level_value >= 12:
        return "high"
    if level_value >= 7:
        return "medium"
    if level_value >= 1:
        return "low"
    return "informational"


def normalize_framework_key(raw_key: str | None) -> str | None:
    if not raw_key:
        return None
    key = safe_text(raw_key, 64).lower().replace(".", "_")
    return RAW_FRAMEWORK_MAP.get(key)


def split_control_values(value) -> list[str]:
    if value is None:
        return []
    text = str(value)
    return [item.strip() for item in text.split(",") if item.strip()]


def map_compliance_entries(entries) -> dict[str, list[str]]:
    mapped = defaultdict(list)
    for entry in safe_list(entries):
        if not isinstance(entry, dict):
            continue
        framework = normalize_framework_key(entry.get("key"))
        if not framework:
            continue
        for control in split_control_values(entry.get("value")):
            mapped[framework].append(control)
    return {key: values for key, values in mapped.items() if values}


def control_status_badge(score):
    if score is None:
        return "unknown"
    if score >= 85:
        return "good"
    if score >= 60:
        return "warning"
    return "critical"


def normalize_agent(agent: dict) -> dict:
    os_info = agent.get("os") if isinstance(agent.get("os"), dict) else {}
    last_seen = agent.get("lastKeepAlive")
    status = safe_text(agent.get("status"), 32).lower() or "unknown"
    raw_group = agent.get("group")
    if isinstance(raw_group, list):
        group = ", ".join(str(item) for item in raw_group if item) or agent.get("manager") or "ungrouped"
    else:
        group = raw_group or agent.get("manager") or "ungrouped"
    return {
        "agentId": str(agent.get("id") or ""),
        "name": agent.get("name") or "-",
        "ip": agent.get("ip") or "-",
        "os": os_info.get("name") or os_info.get("platform") or "-",
        "osVersion": os_info.get("version") or os_info.get("major") or "-",
        "status": status,
        "group": group,
        "version": agent.get("version") or "-",
        "lastSeen": last_seen,
        "lastScan": None,
        "score": None,
        "failedChecks": 0,
        "vulnerabilities": 0,
        "criticalAlerts": 0,
        "highAlerts": 0,
        "mediumAlerts": 0,
        "lowAlerts": 0,
    }


def normalize_sca_policy_summary(raw_policy: dict, agent_info: dict) -> dict:
    total_checks = int(raw_policy.get("total_checks") or 0)
    passed = int(raw_policy.get("pass") or 0)
    failed = int(raw_policy.get("fail") or 0)
    invalid = int(raw_policy.get("invalid") or 0)
    not_applicable = max(total_checks - passed - failed - invalid, 0)
    score = raw_policy.get("score")
    try:
        score_value = float(score) if score is not None else None
    except Exception:
        score_value = None
    return {
        "agentId": agent_info["agentId"],
        "agentName": agent_info["name"],
        "agentGroup": agent_info["group"],
        "agentOs": agent_info["os"],
        "policyId": raw_policy.get("policy_id") or "-",
        "policyName": raw_policy.get("name") or raw_policy.get("description") or "-",
        "description": raw_policy.get("description") or "",
        "references": raw_policy.get("references") or "",
        "score": score_value,
        "passed": passed,
        "failed": failed,
        "notApplicable": not_applicable,
        "invalid": invalid,
        "totalChecks": total_checks,
        "lastScan": raw_policy.get("end_scan") or raw_policy.get("start_scan"),
        "frameworks": [],
    }


def normalize_sca_check(raw_check: dict, agent_info: dict, policy_summary: dict) -> dict:
    compliance = map_compliance_entries(raw_check.get("compliance"))
    references = []
    raw_refs = raw_check.get("rules")
    for item in safe_list(raw_refs):
        if isinstance(item, dict):
            references.append(item.get("rule") or "")
        elif item:
            references.append(str(item))

    normalized = {
        "id": f"{agent_info['agentId']}:{policy_summary['policyId']}:{raw_check.get('id')}",
        "framework": next(iter(compliance.keys()), "cis"),
        "frameworks": list(compliance.keys()),
        "controlId": str(raw_check.get("id") or "-"),
        "policyId": policy_summary["policyId"],
        "policyName": policy_summary["policyName"],
        "title": raw_check.get("title") or "-",
        "description": raw_check.get("description") or "",
        "status": normalize_result_status(raw_check.get("result")),
        "severity": "unknown",
        "affectedAgents": [agent_info["name"]],
        "evidence": {
            "source": "wazuh_sca",
            "agentId": agent_info["agentId"],
            "agentName": agent_info["name"],
            "policyId": policy_summary["policyId"],
            "timestamp": policy_summary["lastScan"],
            "condition": raw_check.get("condition") or "",
            "reason": raw_check.get("reason") or "",
            "command": raw_check.get("command") or "",
        },
        "remediation": raw_check.get("remediation") or "",
        "references": references,
        "lastSeen": policy_summary["lastScan"],
        "rationale": raw_check.get("rationale") or "",
        "compliance": compliance,
    }
    return normalized


def normalize_vulnerability(raw_item: dict, agent_lookup: dict[str, dict]) -> dict:
    agent_info = raw_item.get("agent") if isinstance(raw_item.get("agent"), dict) else {}
    agent_id = str(agent_info.get("id") or raw_item.get("agent_id") or "")
    normalized_agent = agent_lookup.get(agent_id, {})
    score_data = raw_item.get("score")
    cvss = None
    if isinstance(score_data, dict):
        cvss = score_data.get("base") or score_data.get("version") or score_data.get("cvss3")
    elif score_data is not None:
        cvss = score_data

    references = safe_list(raw_item.get("reference") or raw_item.get("references"))
    return {
        "cve": raw_item.get("cve") or raw_item.get("id") or "-",
        "severity": safe_text(raw_item.get("severity") or "unknown", 24).lower() or "unknown",
        "cvss": cvss,
        "packageName": raw_item.get("name") or raw_item.get("package_name") or "-",
        "installedVersion": raw_item.get("version") or raw_item.get("package_version") or "-",
        "fixedVersion": raw_item.get("fix_version") or raw_item.get("fixed_version") or "-",
        "agentId": agent_id or normalized_agent.get("agentId") or "-",
        "agentName": agent_info.get("name") or normalized_agent.get("name") or "-",
        "references": references,
        "detectedAt": raw_item.get("detected_at") or raw_item.get("published") or raw_item.get("updated"),
        "status": safe_text(raw_item.get("status") or "open", 32).lower() or "open",
        "os": normalized_agent.get("os") or "-",
        "complianceImpact": [],
    }


def normalize_alert(raw_alert: dict) -> dict:
    rule = raw_alert.get("rule") if isinstance(raw_alert.get("rule"), dict) else {}
    data = raw_alert.get("data") if isinstance(raw_alert.get("data"), dict) else {}
    agent = raw_alert.get("agent") if isinstance(raw_alert.get("agent"), dict) else {}
    groups = safe_list(rule.get("groups"))
    compliance = {}
    field_mapping = {
        "pci_dss": rule.get("pci_dss"),
        "gdpr": rule.get("gdpr"),
        "hipaa": rule.get("hipaa"),
        "nist": rule.get("nist_800_53"),
        "tsc": rule.get("tsc"),
    }
    for framework, value in field_mapping.items():
        values = split_control_values(value)
        if values:
            compliance[framework] = values

    mitre_values = rule.get("mitre")
    if isinstance(mitre_values, dict):
        mitre_values = safe_list(mitre_values.get("id"))
    if mitre_values:
        compliance["mitre"] = split_control_values(",".join(map(str, safe_list(mitre_values))))

    severity = severity_from_level(rule.get("level"))
    return {
        "id": raw_alert.get("_id") or f"{rule.get('id')}-{raw_alert.get('@timestamp')}",
        "timestamp": raw_alert.get("@timestamp"),
        "ruleId": str(rule.get("id") or "-"),
        "level": int(rule.get("level") or 0),
        "severity": severity,
        "description": rule.get("description") or "-",
        "agent": agent.get("name") or "-",
        "agentId": agent.get("id") or "",
        "groups": groups,
        "compliance": compliance,
        "mitre": compliance.get("mitre", []),
        "fullLog": raw_alert.get("full_log") or "",
        "sourceIp": data.get("srcip"),
        "destinationIp": data.get("dstip"),
        "source": raw_alert.get("predecoder", {}).get("program_name") if isinstance(raw_alert.get("predecoder"), dict) else None,
    }


def build_framework_overview(checks: list[dict], alerts: list[dict]) -> list[dict]:
    by_framework = {
        framework_id: {
            **metadata,
            "score": None,
            "passed": 0,
            "failed": 0,
            "notApplicable": 0,
            "total": 0,
            "critical": 0,
            "high": 0,
            "medium": 0,
            "low": 0,
            "status": "unknown",
            "controls": [],
            "alertCount": 0,
        }
        for framework_id, metadata in FRAMEWORK_METADATA.items()
    }

    controls = defaultdict(Counter)
    for check in checks:
        frameworks = check.get("frameworks") or [check.get("framework")]
        for framework in frameworks:
            if framework not in by_framework:
                continue
            bucket = by_framework[framework]
            bucket["total"] += 1
            status = check.get("status")
            if status == "passed":
                bucket["passed"] += 1
            elif status == "failed":
                bucket["failed"] += 1
            elif status == "not_applicable":
                bucket["notApplicable"] += 1

            for control in check.get("compliance", {}).get(framework, []) or [check.get("controlId")]:
                controls[framework][control] += 1

    for alert in alerts:
        compliance = alert.get("compliance") or {}
        for framework in compliance.keys():
            if framework not in by_framework:
                continue
            bucket = by_framework[framework]
            bucket["alertCount"] += 1
            severity = alert.get("severity", "unknown")
            if severity == "critical":
                bucket["critical"] += 1
            elif severity == "high":
                bucket["high"] += 1
            elif severity == "medium":
                bucket["medium"] += 1
            elif severity == "low":
                bucket["low"] += 1

    results = []
    for framework_id, bucket in by_framework.items():
        effective_total = bucket["passed"] + bucket["failed"] + bucket["notApplicable"]
        score = round((bucket["passed"] / effective_total) * 100, 1) if effective_total else None
        bucket["score"] = score
        bucket["status"] = control_status_badge(score)
        bucket["controls"] = [
            {"controlId": control_id, "count": count}
            for control_id, count in controls[framework_id].most_common(10)
        ]
        results.append(bucket)

    return results


def build_top_failed_controls(checks: list[dict], framework_filter: str = "all") -> list[dict]:
    counter = Counter()
    samples = {}
    for check in checks:
        if check.get("status") != "failed":
            continue
        frameworks = check.get("frameworks") or [check.get("framework")]
        for framework in frameworks:
            if framework_filter != "all" and framework != framework_filter:
                continue
            control_ids = check.get("compliance", {}).get(framework, []) or [check.get("controlId")]
            for control_id in control_ids:
                key = (framework, control_id, check.get("title"))
                counter[key] += 1
                samples[key] = check

    results = []
    for (framework, control_id, title), count in counter.most_common(10):
        check = samples[(framework, control_id, title)]
        results.append(
            {
                "framework": framework,
                "controlId": control_id,
                "title": title,
                "count": count,
                "status": check.get("status"),
                "affectedAgents": check.get("affectedAgents", []),
                "remediation": check.get("remediation"),
                "lastSeen": check.get("lastSeen"),
            }
        )
    return results


def build_summary_cards(
    agents: list[dict],
    checks: list[dict],
    vulnerabilities: list[dict],
    alerts: list[dict],
    frameworks: list[dict],
):
    active_agents = sum(1 for agent in agents if agent.get("status") == "active")
    disconnected_agents = sum(1 for agent in agents if agent.get("status") == "disconnected")
    passed_controls = sum(1 for check in checks if check.get("status") == "passed")
    failed_controls = sum(1 for check in checks if check.get("status") == "failed")
    not_applicable = sum(1 for check in checks if check.get("status") == "not_applicable")

    severity_counter = Counter(alert.get("severity", "unknown") for alert in alerts)
    vuln_severity_counter = Counter(item.get("severity", "unknown") for item in vulnerabilities if item.get("status") != "resolved")
    for key, value in vuln_severity_counter.items():
        severity_counter[key] += value

    numeric_scores = [framework["score"] for framework in frameworks if isinstance(framework.get("score"), (int, float))]
    overall_score = round(sum(numeric_scores) / len(numeric_scores), 1) if numeric_scores else None

    top_groups = Counter(safe_text(agent.get("group") or "ungrouped", 128) or "ungrouped" for agent in agents)
    return {
        "totalAgents": len(agents),
        "activeAgents": active_agents,
        "disconnectedAgents": disconnected_agents,
        "overallScore": overall_score,
        "passedControls": passed_controls,
        "failedControls": failed_controls,
        "notApplicableControls": not_applicable,
        "criticalFindings": severity_counter.get("critical", 0),
        "highFindings": severity_counter.get("high", 0),
        "mediumFindings": severity_counter.get("medium", 0),
        "lowFindings": severity_counter.get("low", 0),
        "vulnerabilities": len([item for item in vulnerabilities if item.get("status") != "resolved"]),
        "relatedAlerts": len(alerts),
        "scaFailedChecks": failed_controls,
        "lastUpdated": iso_now(),
        "dataSourceStatus": "connected",
        "topDepartments": [{"name": name, "count": count} for name, count in top_groups.most_common(5)],
    }


def derive_data_source_status(status_map: dict[str, str]) -> str:
    statuses = set(status_map.values())
    if statuses == {"connected"}:
        return "connected"
    if "connected" in statuses and ("error" in statuses or "unavailable" in statuses):
        return "degraded"
    if "connected" in statuses:
        return "degraded"
    return "error"


def filter_search_match(values: list[str], query: str) -> bool:
    if not query:
        return True
    q = query.lower()
    return any(q in safe_text(value, 500).lower() for value in values if value is not None)


def normalize_filters(
    *,
    time_range: str = "7d",
    framework: str = "all",
    severity: str = "all",
    status: str = "all",
    agent_group: str = "all",
    agent_os: str = "all",
    search: str = "",
):
    return {
        "timeRange": normalize_time_range(time_range),
        "framework": framework if framework in FRAMEWORK_METADATA or framework == "all" else "all",
        "severity": severity if severity in {"all", "critical", "high", "medium", "low", "informational"} else "all",
        "status": status if status in {"all", "passed", "failed", "not_applicable", "invalid", "active", "disconnected"} else "all",
        "agentGroup": safe_text(agent_group or "all", 64) or "all",
        "agentOs": safe_text(agent_os or "all", 64) or "all",
        "search": safe_text(search, 120),
    }


async def _run_limited(tasks, limit: int = 8):
    semaphore = asyncio.Semaphore(limit)

    async def runner(coro):
        async with semaphore:
            return await coro

    return await asyncio.gather(*(runner(task) for task in tasks), return_exceptions=True)


async def fetch_agents_inventory() -> tuple[list[dict], dict[str, str]]:
    from . import wazuh_service

    try:
        payload = await wazuh_service.get_agents()
        agents = [normalize_agent(item) for item in extract_affected_items(payload)]
        return agents, {"wazuhApi": "connected"}
    except Exception:
        return [], {"wazuhApi": "error"}


async def fetch_sca_dataset(agents: list[dict]) -> tuple[list[dict], list[dict], dict[str, str]]:
    from . import wazuh_service

    if not agents:
        return [], [], {"sca": "unavailable"}

    policy_results = await _run_limited(
        [wazuh_service.get_sca_results(agent["agentId"]) for agent in agents],
        limit=6,
    )

    policies = []
    policy_jobs = []
    policy_refs = []
    sca_status = "connected"

    for agent, response in zip(agents, policy_results):
        if isinstance(response, Exception):
            sca_status = "error"
            continue
        items = extract_affected_items(response)
        if not items and response.get("error", 0):
            sca_status = "degraded"
        for raw_policy in items:
            policy = normalize_sca_policy_summary(raw_policy, agent)
            policies.append(policy)
            policy_jobs.append(
                wazuh_service.wazuh_get(f"/sca/{agent['agentId']}/checks/{policy['policyId']}")
            )
            policy_refs.append((agent, policy))

    if not policy_jobs:
        return policies, [], {"sca": sca_status if sca_status != "connected" else "unavailable"}

    detail_results = await _run_limited(policy_jobs, limit=4)
    checks = []
    for (agent, policy), response in zip(policy_refs, detail_results):
        if isinstance(response, Exception):
            sca_status = "degraded"
            continue
        items = extract_affected_items(response)
        if not items and response.get("error", 0):
            sca_status = "degraded"
        for raw_check in items:
            checks.append(normalize_sca_check(raw_check, agent, policy))

    return policies, checks, {"sca": sca_status}


async def fetch_vulnerabilities_dataset(agents: list[dict]) -> tuple[list[dict], dict[str, str]]:
    from . import wazuh_service

    if not agents:
        return [], {"vulnerabilities": "unavailable"}

    agent_lookup = {agent["agentId"]: agent for agent in agents}
    results = await _run_limited(
        [wazuh_service.get_vulnerabilities(agent["agentId"]) for agent in agents],
        limit=6,
    )

    items = []
    status = "connected"
    for response in results:
        if isinstance(response, Exception):
            status = "error"
            continue
        if response.get("title") == "Not Found":
            status = "unavailable"
            continue
        raw_items = extract_affected_items(response)
        for raw_item in raw_items:
            items.append(normalize_vulnerability(raw_item, agent_lookup))
    return items, {"vulnerabilities": status}


def _time_histogram_interval(time_range: str) -> str:
    if time_range == "24h":
        return "1h"
    if time_range == "7d":
        return "12h"
    return "1d"


async def fetch_compliance_alerts(
    time_range: str = "7d",
    framework: str = "all",
    severity: str = "all",
    limit: int = 200,
) -> tuple[list[dict], dict, dict[str, str]]:
    from ..core.config import settings
    from .opensearch_service import get_client

    client = get_client()
    should = [
        {"exists": {"field": "rule.pci_dss"}},
        {"exists": {"field": "rule.gdpr"}},
        {"exists": {"field": "rule.hipaa"}},
        {"exists": {"field": "rule.nist_800_53"}},
        {"exists": {"field": "rule.tsc"}},
        {"exists": {"field": "rule.mitre"}},
        {"terms": {"rule.groups.keyword": ["sca", "vulnerability-detector", "syscheck", "rootcheck", "policy_monitoring", "audit", "malware"]}},
    ]

    must = [{"range": {"@timestamp": {"gte": f"now-{time_range}"}}}]
    if severity != "all":
        severity_floor = {
            "critical": 15,
            "high": 12,
            "medium": 7,
            "low": 1,
            "informational": 0,
        }.get(severity, 0)
        must.append({"range": {"rule.level": {"gte": severity_floor}}})

    if framework != "all":
        field_map = {
            "pci_dss": "rule.pci_dss",
            "gdpr": "rule.gdpr",
            "hipaa": "rule.hipaa",
            "nist": "rule.nist_800_53",
            "tsc": "rule.tsc",
            "mitre": "rule.mitre",
        }
        framework_field = field_map.get(framework)
        if framework_field:
            must.append({"exists": {"field": framework_field}})

    body = {
        "size": clamp_limit(limit, default=200, maximum=500),
        "sort": [{"@timestamp": {"order": "desc"}}],
        "query": {
            "bool": {
                "must": must,
                "should": should,
                "minimum_should_match": 1,
            }
        },
        "_source": [
            "@timestamp",
            "rule.id",
            "rule.level",
            "rule.description",
            "rule.groups",
            "rule.pci_dss",
            "rule.gdpr",
            "rule.hipaa",
            "rule.nist_800_53",
            "rule.tsc",
            "rule.mitre",
            "agent.id",
            "agent.name",
            "data.srcip",
            "data.dstip",
            "predecoder.program_name",
            "full_log",
        ],
        "aggs": {
            "timeline": {
                "date_histogram": {
                    "field": "@timestamp",
                    "fixed_interval": _time_histogram_interval(time_range),
                    "min_doc_count": 0,
                }
            },
            "by_agent": {"terms": {"field": "agent.name.keyword", "size": 20}},
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
        },
    }

    try:
        response = client.search(index=settings.opensearch_index, body=body)
        items = []
        for hit in response.get("hits", {}).get("hits", []):
            source = hit.get("_source", {})
            source["_id"] = hit.get("_id")
            items.append(normalize_alert(source))
        return items, response.get("aggregations", {}), {"opensearch": "connected"}
    except Exception:
        return [], {}, {"opensearch": "error"}


def build_agent_posture(
    agents: list[dict],
    policies: list[dict],
    checks: list[dict],
    vulnerabilities: list[dict],
    alerts: list[dict],
) -> list[dict]:
    posture = {agent["agentId"]: {**agent} for agent in agents}
    policy_scores = defaultdict(list)
    failed_checks = Counter()
    last_scans = {}

    for policy in policies:
        agent_id = policy["agentId"]
        if policy.get("score") is not None:
            policy_scores[agent_id].append(policy["score"])
        failed_checks[agent_id] += int(policy.get("failed") or 0)
        last_scan = policy.get("lastScan")
        if last_scan and (agent_id not in last_scans or safe_text(last_scan, 64) > safe_text(last_scans[agent_id], 64)):
            last_scans[agent_id] = last_scan

    for agent_id, values in policy_scores.items():
        posture[agent_id]["score"] = round(sum(values) / len(values), 1)
        posture[agent_id]["failedChecks"] = failed_checks.get(agent_id, 0)
        posture[agent_id]["lastScan"] = last_scans.get(agent_id)

    vuln_counter = Counter(item.get("agentId") for item in vulnerabilities if item.get("status") != "resolved")
    for agent_id, count in vuln_counter.items():
        if agent_id in posture:
            posture[agent_id]["vulnerabilities"] = count

    alert_counter = defaultdict(Counter)
    for alert in alerts:
        agent_name = alert.get("agent")
        severity = alert.get("severity", "low")
        for agent_id, agent in posture.items():
            if agent["name"] == agent_name:
                alert_counter[agent_id][severity] += 1
                break

    for agent_id, severities in alert_counter.items():
        if agent_id not in posture:
            continue
        posture[agent_id]["criticalAlerts"] = severities.get("critical", 0)
        posture[agent_id]["highAlerts"] = severities.get("high", 0)
        posture[agent_id]["mediumAlerts"] = severities.get("medium", 0)
        posture[agent_id]["lowAlerts"] = severities.get("low", 0)

    items = list(posture.values())
    items.sort(
        key=lambda agent: (
            -SEVERITY_ORDER.get(
                "critical" if agent.get("criticalAlerts") else "high" if agent.get("highAlerts") else "low",
                -1,
            ),
            agent.get("score") is None,
            -(agent.get("score") or 0),
            -(agent.get("failedChecks") or 0),
            -(agent.get("vulnerabilities") or 0),
        )
    )
    return items


def build_evidence_rows(checks: list[dict], alerts: list[dict]) -> list[dict]:
    rows = []
    for check in checks:
        if check.get("status") not in {"failed", "passed"}:
            continue
        frameworks = check.get("frameworks") or [check.get("framework")]
        for framework in frameworks:
            control_ids = check.get("compliance", {}).get(framework, []) or [check.get("controlId")]
            for control_id in control_ids:
                rows.append(
                    {
                        "id": f"sca:{check['id']}:{framework}:{control_id}",
                        "source": "Wazuh SCA",
                        "framework": framework,
                        "controlId": control_id,
                        "requirement": check.get("title"),
                        "evidenceSource": check.get("policyName"),
                        "relatedAlerts": 0,
                        "relatedAgents": ",".join(check.get("affectedAgents", [])),
                        "status": check.get("status"),
                        "timestamp": check.get("lastSeen"),
                        "details": check.get("description"),
                    }
                )

    for alert in alerts:
        for framework, controls in (alert.get("compliance") or {}).items():
            for control_id in controls:
                rows.append(
                    {
                        "id": f"alert:{alert['id']}:{framework}:{control_id}",
                        "source": "Wazuh Alert",
                        "framework": framework,
                        "controlId": control_id,
                        "requirement": alert.get("description"),
                        "evidenceSource": alert.get("ruleId"),
                        "relatedAlerts": 1,
                        "relatedAgents": alert.get("agent"),
                        "status": "failed" if alert.get("level", 0) >= 7 else "warning",
                        "timestamp": alert.get("timestamp"),
                        "details": alert.get("fullLog") or alert.get("description"),
                    }
                )

    rows.sort(key=lambda row: safe_text(row.get("timestamp"), 64), reverse=True)
    return rows


def apply_common_filters(items: list[dict], filters: dict, item_type: str) -> list[dict]:
    framework = filters["framework"]
    severity = filters["severity"]
    status = filters["status"]
    agent_group = filters["agentGroup"]
    agent_os = filters["agentOs"]
    search = filters["search"]

    filtered = []
    for item in items:
        if framework != "all":
            if item_type == "framework":
                if item.get("frameworkId") != framework:
                    continue
            else:
                frameworks = item.get("frameworks") or [item.get("framework")]
                compliance = item.get("compliance", {})
                if framework not in frameworks and framework not in compliance:
                    continue

        if severity != "all" and item.get("severity") != severity:
            continue

        if status != "all" and item.get("status") != status:
            if item_type == "agent" and status in {"active", "disconnected"} and item.get("status") == status:
                pass
            else:
                continue

        if agent_group != "all":
            group_value = item.get("group") or item.get("agentGroup")
            if group_value != agent_group:
                continue

        if agent_os != "all":
            os_value = item.get("os") or item.get("agentOs")
            if os_value != agent_os:
                continue

        if not filter_search_match(
            [
                item.get("agent"),
                item.get("agentName"),
                item.get("name"),
                item.get("title"),
                item.get("description"),
                item.get("cve"),
                item.get("controlId"),
                item.get("policyName"),
                item.get("framework"),
                item.get("ruleId"),
            ],
            search,
        ):
            continue

        filtered.append(item)
    return filtered


async def build_compliance_summary(filters: dict) -> dict:
    agents, agent_status = await fetch_agents_inventory()
    policies, checks, sca_status = await fetch_sca_dataset(agents)
    vulnerabilities, vuln_status = await fetch_vulnerabilities_dataset(agents)
    alerts, aggs, alert_status = await fetch_compliance_alerts(
        time_range=filters["timeRange"],
        framework=filters["framework"],
        severity=filters["severity"],
        limit=300,
    )

    filtered_alerts = apply_common_filters(alerts, filters, "alert")
    frameworks = build_framework_overview(checks, filtered_alerts)
    filtered_frameworks = apply_common_filters(frameworks, filters, "framework")
    posture = build_agent_posture(agents, policies, checks, vulnerabilities, filtered_alerts)
    filtered_agents = apply_common_filters(posture, filters, "agent")
    filtered_checks = apply_common_filters(checks, filters, "check")
    filtered_vulns = apply_common_filters(vulnerabilities, filters, "vulnerability")

    summary = build_summary_cards(filtered_agents, filtered_checks, filtered_vulns, filtered_alerts, filtered_frameworks)
    status_map = {}
    status_map.update(agent_status)
    status_map.update(sca_status)
    status_map.update(vuln_status)
    status_map.update(alert_status)
    summary["dataSourceStatus"] = derive_data_source_status(status_map)

    severity_breakdown = [
        {"severity": key, "count": value}
        for key, value in Counter(alert.get("severity", "unknown") for alert in filtered_alerts).items()
    ]
    severity_breakdown.sort(key=lambda item: SEVERITY_ORDER.get(item["severity"], -1), reverse=True)

    framework_chart = [
        {
            "frameworkId": item["frameworkId"],
            "frameworkName": item["frameworkName"],
            "score": item["score"],
            "failed": item["failed"],
            "passed": item["passed"],
            "alertCount": item["alertCount"],
        }
        for item in filtered_frameworks
    ]

    timeline = []
    for bucket in aggs.get("timeline", {}).get("buckets", []):
        timeline.append({"timestamp": bucket.get("key_as_string"), "count": bucket.get("doc_count", 0)})

    return {
        "meta": {
            "lastUpdated": summary["lastUpdated"],
            "dataSourceStatus": summary["dataSourceStatus"],
            "sources": status_map,
            "filters": filters,
            "availableFrameworks": list(FRAMEWORK_METADATA.values()),
            "agentGroups": sorted({safe_text(agent.get("group") or "ungrouped", 128) or "ungrouped" for agent in agents}),
            "agentOs": sorted({agent.get("os") or "-" for agent in agents}),
        },
        "summary": summary,
        "frameworks": filtered_frameworks,
        "charts": {
            "findingsBySeverity": severity_breakdown,
            "findingsByFramework": framework_chart,
            "alertsTimeline": timeline,
            "topFailedControls": build_top_failed_controls(filtered_checks, filters["framework"]),
            "topRiskyAgents": filtered_agents[:10],
        },
        "highlights": {
            "topFailedControls": build_top_failed_controls(filtered_checks, filters["framework"]),
            "topRiskyAgents": filtered_agents[:10],
            "recentAlerts": filtered_alerts[:10],
        },
    }


async def build_agents_dataset(filters: dict) -> dict:
    agents, _ = await fetch_agents_inventory()
    policies, checks, _ = await fetch_sca_dataset(agents)
    vulnerabilities, _ = await fetch_vulnerabilities_dataset(agents)
    alerts, _, _ = await fetch_compliance_alerts(time_range=filters["timeRange"], limit=300)
    posture = build_agent_posture(agents, policies, checks, vulnerabilities, alerts)
    items = apply_common_filters(posture, filters, "agent")
    return {
        "meta": {"lastUpdated": iso_now(), "filters": filters, "total": len(items)},
        "items": items,
    }


async def build_sca_dataset(filters: dict, agent_id: str | None = None, policy_id: str | None = None, limit: int = 250) -> dict:
    agents, _ = await fetch_agents_inventory()
    if agent_id:
        agents = [agent for agent in agents if agent["agentId"] == agent_id]
    policies, checks, status = await fetch_sca_dataset(agents)
    policy_frameworks = defaultdict(set)
    for check in checks:
        for framework_name in check.get("frameworks") or []:
            policy_frameworks[(check.get("agentId"), check.get("policyId"))].add(framework_name)
    for policy in policies:
        policy["frameworks"] = sorted(policy_frameworks.get((policy["agentId"], policy["policyId"]), set()))
    if policy_id:
        policies = [policy for policy in policies if policy["policyId"] == policy_id]
        checks = [check for check in checks if check["policyId"] == policy_id]

    filtered_policies = apply_common_filters(policies, filters, "policy")
    filtered_checks = apply_common_filters(checks, filters, "check")
    filtered_checks = filtered_checks[: clamp_limit(limit, default=250, maximum=1000)]

    by_status = Counter(check.get("status") for check in filtered_checks)
    by_policy = Counter(f"{policy['policyName']}|{policy['agentName']}" for policy in filtered_policies)
    return {
        "meta": {
            "lastUpdated": iso_now(),
            "filters": filters,
            "sourceStatus": status.get("sca", "unknown"),
            "totalPolicies": len(filtered_policies),
            "totalChecks": len(filtered_checks),
        },
        "policies": filtered_policies,
        "checks": filtered_checks,
        "summary": {
            "passed": by_status.get("passed", 0),
            "failed": by_status.get("failed", 0),
            "notApplicable": by_status.get("not_applicable", 0),
            "invalid": by_status.get("invalid", 0),
            "topPolicies": [
                {"label": label.split("|")[0], "agentName": label.split("|")[1], "count": count}
                for label, count in by_policy.most_common(10)
            ],
        },
    }


async def build_vulnerabilities_dataset(filters: dict, agent_id: str | None = None, limit: int = 250) -> dict:
    agents, _ = await fetch_agents_inventory()
    vulnerabilities, status = await fetch_vulnerabilities_dataset(agents)
    if agent_id:
        vulnerabilities = [item for item in vulnerabilities if item.get("agentId") == agent_id]

    filtered_items = apply_common_filters(vulnerabilities, filters, "vulnerability")
    filtered_items = filtered_items[: clamp_limit(limit, default=250, maximum=1000)]
    by_severity = Counter(item.get("severity", "unknown") for item in filtered_items)
    top_agents = Counter(item.get("agentName") or "-" for item in filtered_items)
    top_packages = Counter(item.get("packageName") or "-" for item in filtered_items)

    return {
        "meta": {
            "lastUpdated": iso_now(),
            "filters": filters,
            "sourceStatus": status.get("vulnerabilities", "unknown"),
            "total": len(filtered_items),
        },
        "items": filtered_items,
        "summary": {
            "bySeverity": [{"severity": key, "count": value} for key, value in by_severity.items()],
            "topAgents": [{"name": key, "count": value} for key, value in top_agents.most_common(10)],
            "topPackages": [{"name": key, "count": value} for key, value in top_packages.most_common(10)],
        },
    }


async def build_alerts_dataset(filters: dict, agent_id: str | None = None, limit: int = 200) -> dict:
    alerts, aggs, status = await fetch_compliance_alerts(
        time_range=filters["timeRange"],
        framework=filters["framework"],
        severity=filters["severity"],
        limit=limit,
    )
    if agent_id:
        alerts = [alert for alert in alerts if alert.get("agentId") == agent_id or alert.get("agent") == agent_id]
    items = apply_common_filters(alerts, filters, "alert")
    items = items[: clamp_limit(limit, default=200, maximum=500)]
    group_counts = Counter(group for item in items for group in item.get("groups", []))

    return {
        "meta": {
            "lastUpdated": iso_now(),
            "filters": filters,
            "sourceStatus": status.get("opensearch", "unknown"),
            "total": len(items),
        },
        "items": items,
        "summary": {
            "timeline": [{"timestamp": bucket.get("key_as_string"), "count": bucket.get("doc_count", 0)} for bucket in aggs.get("timeline", {}).get("buckets", [])],
            "ruleGroups": [{"name": key, "count": value} for key, value in group_counts.most_common(12)],
        },
    }


async def build_evidence_dataset(filters: dict, limit: int = 250) -> dict:
    agents, _ = await fetch_agents_inventory()
    policies, checks, _ = await fetch_sca_dataset(agents)
    alerts, _, _ = await fetch_compliance_alerts(time_range=filters["timeRange"], limit=250)
    _ = policies
    evidence_rows = build_evidence_rows(checks, alerts)
    items = apply_common_filters(evidence_rows, filters, "evidence")
    items = items[: clamp_limit(limit, default=250, maximum=1000)]
    return {
        "meta": {"lastUpdated": iso_now(), "filters": filters, "total": len(items)},
        "items": items,
    }


def dataset_to_csv_bytes(dataset: list[dict]) -> bytes:
    buffer = io.StringIO()
    if not dataset:
        writer = csv.writer(buffer)
        writer.writerow(["message"])
        writer.writerow(["No data"])
        return buffer.getvalue().encode("utf-8")

    fieldnames = sorted({key for item in dataset for key in item.keys()})
    writer = csv.DictWriter(buffer, fieldnames=fieldnames)
    writer.writeheader()
    for item in dataset:
        row = {}
        for key in fieldnames:
            value = item.get(key)
            if isinstance(value, (list, dict)):
                row[key] = str(value)
            else:
                row[key] = value
        writer.writerow(row)
    return buffer.getvalue().encode("utf-8")
