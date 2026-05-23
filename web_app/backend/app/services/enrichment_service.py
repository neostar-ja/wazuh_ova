"""
Enrichment Service — Multi-source Threat Intelligence
Sources: AbuseIPDB · AlienVault OTX · Shodan · VirusTotal
"""
import httpx
import asyncio
import ipaddress
import re
from ..core.config import settings

_TIMEOUT = httpx.Timeout(12.0)

# ── Helpers ────────────────────────────────────────────────────────────────────

def detect_ioc_type(value: str) -> str:
    """Auto-detect IOC type: ip | domain | hash | url | unknown"""
    value = value.strip()
    # URL
    if value.startswith(("http://", "https://", "ftp://")):
        return "url"
    # IP
    try:
        ipaddress.ip_address(value)
        return "ip"
    except ValueError:
        pass
    # MD5 / SHA1 / SHA256
    if re.fullmatch(r"[0-9a-fA-F]{32}", value):
        return "hash_md5"
    if re.fullmatch(r"[0-9a-fA-F]{40}", value):
        return "hash_sha1"
    if re.fullmatch(r"[0-9a-fA-F]{64}", value):
        return "hash_sha256"
    # Domain
    if re.fullmatch(r"[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z]{2,})+", value):
        return "domain"
    return "unknown"


# ── AbuseIPDB ──────────────────────────────────────────────────────────────────

async def check_abuseipdb(ip: str) -> dict:
    if not settings.abuseipdb_key:
        return {"error": "no_key"}
    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT, verify=False) as c:
            r = await c.get(
                "https://api.abuseipdb.com/api/v2/check",
                headers={"Key": settings.abuseipdb_key, "Accept": "application/json"},
                params={"ipAddress": ip, "maxAgeInDays": 90, "verbose": True},
            )
            data = r.json().get("data", {})
            return {
                "source": "abuseipdb",
                "available": True,
                "ipAddress":             data.get("ipAddress", ip),
                "abuseConfidenceScore":  data.get("abuseConfidenceScore", 0),
                "countryCode":           data.get("countryCode", ""),
                "countryName":           data.get("countryName", ""),
                "isp":                   data.get("isp", ""),
                "domain":                data.get("domain", ""),
                "usageType":             data.get("usageType", ""),
                "totalReports":          data.get("totalReports", 0),
                "numDistinctUsers":      data.get("numDistinctUsers", 0),
                "lastReportedAt":        data.get("lastReportedAt"),
                "isWhitelisted":         data.get("isWhitelisted", False),
                "isPublic":              data.get("isPublic", True),
                "hostnames":             data.get("hostnames", []),
                "reports": [
                    {
                        "reportedAt":  rep.get("reportedAt"),
                        "comment":     rep.get("comment", ""),
                        "categories":  rep.get("categories", []),
                    }
                    for rep in (data.get("reports") or [])[:5]
                ],
            }
    except Exception as e:
        return {"source": "abuseipdb", "available": False, "error": str(e)}


# ── AlienVault OTX ────────────────────────────────────────────────────────────

async def check_otx_ip(ip: str) -> dict:
    if not settings.otx_key:
        return {"source": "otx", "available": False, "error": "no_key"}
    hdrs = {"X-OTX-API-KEY": settings.otx_key}
    base = f"https://otx.alienvault.com/api/v1/indicators/IPv4/{ip}"
    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT, verify=False) as c:
            rep, geo, malware = await asyncio.gather(
                c.get(f"{base}/reputation", headers=hdrs),
                c.get(f"{base}/geo",        headers=hdrs),
                c.get(f"{base}/malware",    headers=hdrs),
                return_exceptions=True,
            )
        rep_data    = rep.json()    if not isinstance(rep, Exception)    else {}
        geo_data    = geo.json()    if not isinstance(geo, Exception)    else {}
        mal_data    = malware.json() if not isinstance(malware, Exception) else {}

        reputation  = rep_data.get("reputation") or {}
        pulse_info  = rep_data.get("pulse_info") or {}

        return {
            "source":        "otx",
            "available":     True,
            "reputation":    reputation,
            "pulse_count":   pulse_info.get("count", 0),
            "pulse_refs":    [
                {"name": p.get("name"), "tags": p.get("tags", []), "modified": p.get("modified")}
                for p in (pulse_info.get("pulses") or [])[:5]
            ],
            "country_code":  geo_data.get("country_code", ""),
            "country_name":  geo_data.get("country_name", ""),
            "city":          geo_data.get("city", ""),
            "asn":           geo_data.get("asn", ""),
            "malware_count": len(mal_data.get("data", [])),
            "malware_samples": [
                {"hash": m.get("hash"), "datetime": m.get("datetime")}
                for m in (mal_data.get("data") or [])[:3]
            ],
        }
    except Exception as e:
        return {"source": "otx", "available": False, "error": str(e)}


async def check_otx_domain(domain: str) -> dict:
    if not settings.otx_key:
        return {"source": "otx", "available": False, "error": "no_key"}
    hdrs = {"X-OTX-API-KEY": settings.otx_key}
    base = f"https://otx.alienvault.com/api/v1/indicators/domain/{domain}"
    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT, verify=False) as c:
            gen_resp = await c.get(f"{base}/general", headers=hdrs)
        gen = gen_resp.json()
        pulse_info = gen.get("pulse_info") or {}
        return {
            "source":       "otx",
            "available":    True,
            "pulse_count":  pulse_info.get("count", 0),
            "pulse_refs": [
                {"name": p.get("name"), "tags": p.get("tags", [])}
                for p in (pulse_info.get("pulses") or [])[:5]
            ],
            "validation":   gen.get("validation", []),
        }
    except Exception as e:
        return {"source": "otx", "available": False, "error": str(e)}


# ── Shodan ─────────────────────────────────────────────────────────────────────

async def check_shodan(ip: str) -> dict:
    if not settings.shodan_key:
        return {"source": "shodan", "available": False, "error": "no_key"}
    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT, verify=False) as c:
            r = await c.get(
                f"https://api.shodan.io/shodan/host/{ip}",
                params={"key": settings.shodan_key},
            )
        if r.status_code != 200:
            return {"source": "shodan", "available": False, "error": f"HTTP {r.status_code}"}
        d = r.json()
        ports = sorted(d.get("ports", []))
        services = []
        for item in (d.get("data") or [])[:10]:
            port_entry = {
                "port":      item.get("port"),
                "transport": item.get("transport", "tcp"),
                "product":   item.get("product", ""),
                "version":   item.get("version", ""),
                "banner":    (item.get("data") or "")[:200],
            }
            if item.get("ssl"):
                port_entry["ssl_cert"] = item["ssl"].get("cert", {}).get("subject", {})
            services.append(port_entry)
        return {
            "source":      "shodan",
            "available":   True,
            "ip":          d.get("ip_str", ip),
            "org":         d.get("org", ""),
            "isp":         d.get("isp", ""),
            "asn":         d.get("asn", ""),
            "country_code":d.get("country_code", ""),
            "country_name":d.get("country_name", ""),
            "city":        d.get("city", ""),
            "os":          d.get("os"),
            "ports":       ports,
            "services":    services,
            "hostnames":   d.get("hostnames", []),
            "domains":     d.get("domains", []),
            "tags":        d.get("tags", []),
            "vulns":       list(d.get("vulns", {}).keys())[:10],
            "last_update": d.get("last_update"),
        }
    except Exception as e:
        return {"source": "shodan", "available": False, "error": str(e)}


# ── VirusTotal ─────────────────────────────────────────────────────────────────

async def check_virustotal(value: str, ioc_type: str) -> dict:
    if not settings.virustotal_key:
        return {"source": "virustotal", "available": False, "error": "no_key"}
    hdrs = {
        "x-apikey": settings.virustotal_key,
        "Accept": "application/json",
    }
    base = "https://www.virustotal.com/api/v3"
    if ioc_type == "ip":
        endpoint = f"{base}/ip_addresses/{value}"
    elif ioc_type == "domain":
        endpoint = f"{base}/domains/{value}"
    elif ioc_type in ("hash_md5", "hash_sha1", "hash_sha256"):
        endpoint = f"{base}/files/{value}"
    elif ioc_type == "url":
        import base64 as b64
        url_id = b64.urlsafe_b64encode(value.encode()).decode().rstrip("=")
        endpoint = f"{base}/urls/{url_id}"
    else:
        return {"source": "virustotal", "available": False, "error": "unsupported_type"}

    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT, verify=False) as c:
            r = await c.get(endpoint, headers=hdrs)
        if r.status_code == 404:
            return {"source": "virustotal", "available": True, "found": False, "malicious": 0, "suspicious": 0, "undetected": 0, "total": 0}
        if r.status_code != 200:
            return {"source": "virustotal", "available": False, "error": f"HTTP {r.status_code}"}
        d = r.json().get("data", {}).get("attributes", {})
        stats = d.get("last_analysis_stats", {})
        results = d.get("last_analysis_results", {})
        malicious_engines = [
            {"engine": eng, "result": res.get("result", "")}
            for eng, res in results.items()
            if res.get("category") == "malicious"
        ][:10]
        return {
            "source":            "virustotal",
            "available":         True,
            "found":             True,
            "malicious":         stats.get("malicious", 0),
            "suspicious":        stats.get("suspicious", 0),
            "undetected":        stats.get("undetected", 0),
            "harmless":          stats.get("harmless", 0),
            "total":             sum(stats.values()),
            "reputation":        d.get("reputation", 0),
            "country":           d.get("country", ""),
            "asn":               d.get("asn"),
            "as_owner":          d.get("as_owner", ""),
            "network":           d.get("network", ""),
            "malicious_engines": malicious_engines,
            "tags":              d.get("tags", []),
            "last_analysis_date":d.get("last_analysis_date"),
            # Hash-specific
            "name":              d.get("meaningful_name") or d.get("name", ""),
            "type_description":  d.get("type_description", ""),
            "size":              d.get("size"),
        }
    except Exception as e:
        return {"source": "virustotal", "available": False, "error": str(e)}


# ── Main enrich function ───────────────────────────────────────────────────────

async def enrich_ip(ip: str) -> dict:
    try:
        is_private = ipaddress.ip_address(ip).is_private
    except Exception:
        return {}
    if is_private:
        return {"is_private": True, "ip": ip}
    abuse, otx, shodan, vt = await asyncio.gather(
        check_abuseipdb(ip),
        check_otx_ip(ip),
        check_shodan(ip),
        check_virustotal(ip, "ip"),
        return_exceptions=True,
    )
    return {
        "ip":         ip,
        "is_private": False,
        "abuseipdb":  abuse   if not isinstance(abuse, Exception)  else {"available": False},
        "otx":        otx     if not isinstance(otx, Exception)    else {"available": False},
        "shodan":     shodan  if not isinstance(shodan, Exception)  else {"available": False},
        "virustotal": vt      if not isinstance(vt, Exception)      else {"available": False},
    }


async def search_ioc(value: str) -> dict:
    """Full multi-source IOC lookup. Returns unified enrichment dict."""
    value   = value.strip()
    ioc_type = detect_ioc_type(value)
    results  = {
        "value":    value,
        "ioc_type": ioc_type,
        "sources":  {},
    }

    if ioc_type == "ip":
        try:
            is_private = ipaddress.ip_address(value).is_private
        except Exception:
            is_private = False
        results["is_private"] = is_private
        if is_private:
            return results
        abuse, otx, shodan, vt = await asyncio.gather(
            check_abuseipdb(value),
            check_otx_ip(value),
            check_shodan(value),
            check_virustotal(value, "ip"),
            return_exceptions=True,
        )
        results["sources"]["abuseipdb"]  = abuse   if not isinstance(abuse, Exception)  else {"available": False}
        results["sources"]["otx"]        = otx     if not isinstance(otx, Exception)    else {"available": False}
        results["sources"]["shodan"]     = shodan  if not isinstance(shodan, Exception)  else {"available": False}
        results["sources"]["virustotal"] = vt      if not isinstance(vt, Exception)      else {"available": False}

    elif ioc_type == "domain":
        otx, vt = await asyncio.gather(
            check_otx_domain(value),
            check_virustotal(value, "domain"),
            return_exceptions=True,
        )
        results["sources"]["otx"]        = otx  if not isinstance(otx, Exception)  else {"available": False}
        results["sources"]["virustotal"] = vt   if not isinstance(vt, Exception)    else {"available": False}

    elif ioc_type in ("hash_md5", "hash_sha1", "hash_sha256"):
        vt = await check_virustotal(value, ioc_type)
        results["sources"]["virustotal"] = vt

    elif ioc_type == "url":
        vt = await check_virustotal(value, "url")
        results["sources"]["virustotal"] = vt

    return results
