import httpx
from ..core.config import settings

BASE = f"https://{settings.wazuh_api_host}:{settings.wazuh_api_port}"


async def get_token() -> str:
    async with httpx.AsyncClient(verify=False, timeout=10) as c:
        r = await c.post(
            f"{BASE}/security/user/authenticate",
            auth=(settings.wazuh_api_user, settings.wazuh_api_pass),
        )
        return r.json()["data"]["token"]


async def wazuh_get(path: str) -> dict:
    token = await get_token()
    async with httpx.AsyncClient(verify=False, timeout=30) as c:
        r = await c.get(f"{BASE}{path}", headers={"Authorization": f"Bearer {token}"})
        return r.json()


async def wazuh_put(path: str, data: str) -> dict:
    token = await get_token()
    async with httpx.AsyncClient(verify=False, timeout=30) as c:
        r = await c.put(
            f"{BASE}{path}",
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/xml"},
            content=data.encode(),
        )
        return r.json()


async def get_agents():
    return await wazuh_get("/agents?limit=100")


async def get_rules_files():
    return await wazuh_get("/rules/files?limit=100")


async def get_rule_file(filename: str) -> str:
    data = await wazuh_get(f"/rules/files/{filename}?raw=true")
    return data if isinstance(data, str) else str(data)


async def put_rule_file(filename: str, content: str) -> dict:
    return await wazuh_put(f"/rules/files/{filename}", content)


async def restart_manager() -> dict:
    token = await get_token()
    async with httpx.AsyncClient(verify=False, timeout=60) as c:
        r = await c.put(
            f"{BASE}/manager/restart",
            headers={"Authorization": f"Bearer {token}"},
        )
        return r.json()


async def get_cluster_health():
    return await wazuh_get("/cluster/healthcheck")


async def get_sca_results(agent_id: str = "000"):
    return await wazuh_get(f"/sca/{agent_id}?limit=100")


async def get_vulnerabilities(agent_id: str = "000"):
    return await wazuh_get(f"/vulnerability/{agent_id}?limit=100")
