import httpx
import asyncio
import ipaddress
from ..core.config import settings


async def check_abuseipdb(ip: str) -> dict:
    if not settings.abuseipdb_key:
        return {"error": "No API key"}
    async with httpx.AsyncClient(timeout=10) as c:
        r = await c.get(
            "https://api.abuseipdb.com/api/v2/check",
            headers={"Key": settings.abuseipdb_key, "Accept": "application/json"},
            params={"ipAddress": ip, "maxAgeInDays": 30},
        )
        return r.json().get("data", {})


async def check_otx(ip: str) -> dict:
    if not settings.otx_key:
        return {"error": "No API key"}
    async with httpx.AsyncClient(timeout=10) as c:
        r = await c.get(
            f"https://otx.alienvault.com/api/v1/indicators/IPv4/{ip}/reputation",
            headers={"X-OTX-API-KEY": settings.otx_key},
        )
        return r.json()


async def check_shodan(ip: str) -> dict:
    if not settings.shodan_key:
        return {"error": "No API key"}
    async with httpx.AsyncClient(timeout=10) as c:
        r = await c.get(
            f"https://api.shodan.io/shodan/host/{ip}",
            params={"key": settings.shodan_key},
        )
        return r.json()


async def enrich_ip(ip: str) -> dict:
    try:
        if ipaddress.ip_address(ip).is_private:
            return {"is_private": True, "ip": ip}
    except Exception:
        return {}
    abuse, otx, shodan = await asyncio.gather(
        check_abuseipdb(ip),
        check_otx(ip),
        check_shodan(ip),
        return_exceptions=True,
    )
    return {
        "ip": ip,
        "is_private": False,
        "abuseipdb": abuse if not isinstance(abuse, Exception) else {},
        "otx": otx if not isinstance(otx, Exception) else {},
        "shodan": shodan if not isinstance(shodan, Exception) else {},
    }


async def search_ioc(value: str) -> dict:
    results = {"value": value, "sources": {}}
    try:
        ipaddress.ip_address(value)
        is_ip = True
    except Exception:
        is_ip = False

    if is_ip:
        abuse = await check_abuseipdb(value)
        otx = await check_otx(value)
        results["sources"]["abuseipdb"] = abuse
        results["sources"]["otx"] = otx
    return results
