import asyncio
import json
import time

import asyncssh

from ..core.config import settings

# Static topology of the Wazuh / SOC cluster nodes to monitor.
NODES = [
    {
        "id": "master",
        "name": "Wazuh Manager (Master)",
        "ip": "10.251.151.11",
        "role": "Wazuh Manager - Master",
        "services": ["wazuh-manager", "filebeat"],
    },
    {
        "id": "worker",
        "name": "Wazuh Manager (Worker)",
        "ip": "10.251.151.12",
        "role": "Wazuh Manager - Worker",
        "services": ["wazuh-manager", "filebeat"],
    },
    {
        "id": "indexer",
        "name": "Wazuh Indexer",
        "ip": "10.251.151.13",
        "role": "OpenSearch Indexer",
        "services": ["wazuh-indexer"],
    },
    {
        "id": "dashboard",
        "name": "Wazuh Dashboard",
        "ip": "10.251.151.14",
        "role": "Dashboard / Kibana UI",
        "services": ["wazuh-dashboard"],
    },
    {
        "id": "soar",
        "name": "SOAR / TIP",
        "ip": "10.251.151.15",
        "role": "Shuffle / DFIR-IRIS / MISP",
        "services": ["docker"],
    },
]

# Remote Python collector script. Sent over stdin to `python3 -` so there is
# no shell-quoting to worry about. {SERVICES} is replaced with a JSON list of
# systemd unit names to probe with `systemctl is-active`.
_REMOTE_SCRIPT_TEMPLATE = """
import json, os, socket, subprocess, time

def cpu_percent():
    def read():
        with open('/proc/stat') as f:
            parts = f.readline().split()[1:8]
        return [int(x) for x in parts]
    a = read()
    time.sleep(0.6)
    b = read()
    idle1, idle2 = a[3] + a[4], b[3] + b[4]
    total1, total2 = sum(a), sum(b)
    totald, idled = total2 - total1, idle2 - idle1
    if totald <= 0:
        return 0.0
    return round((totald - idled) / totald * 100, 1)

def mem_info():
    info = {{}}
    with open('/proc/meminfo') as f:
        for line in f:
            k, v = line.split(':', 1)
            info[k.strip()] = int(v.strip().split()[0]) * 1024
    total = info.get('MemTotal', 0)
    avail = info.get('MemAvailable', info.get('MemFree', 0))
    return total, total - avail, avail

def disk_info(path='/'):
    st = os.statvfs(path)
    total = st.f_frsize * st.f_blocks
    free = st.f_frsize * st.f_bavail
    used = total - free
    pct = round(used / total * 100, 1) if total else 0.0
    return total, used, free, pct

def service_status(name):
    try:
        r = subprocess.run(['systemctl', 'is-active', name], capture_output=True, text=True, timeout=5)
        return (r.stdout.strip() or 'unknown')
    except Exception:
        return 'unknown'

mem_total, mem_used, mem_avail = mem_info()
disk_total, disk_used, disk_free, disk_pct = disk_info('/')
load1, load5, load15 = os.getloadavg()
with open('/proc/uptime') as f:
    uptime = float(f.readline().split()[0])

services = {SERVICES}
svc_status = {{name: service_status(name) for name in services}}

print(json.dumps({{
    'hostname': socket.gethostname(),
    'cpu_percent': cpu_percent(),
    'cores': os.cpu_count(),
    'mem_total': mem_total,
    'mem_used': mem_used,
    'mem_avail': mem_avail,
    'disk_total': disk_total,
    'disk_used': disk_used,
    'disk_free': disk_free,
    'disk_percent': disk_pct,
    'load1': round(load1, 2),
    'load5': round(load5, 2),
    'load15': round(load15, 2),
    'uptime_seconds': int(uptime),
    'services_status': svc_status,
}}))
"""


async def _collect_node(node: dict) -> dict:
    start = time.monotonic()
    script = _REMOTE_SCRIPT_TEMPLATE.format(SERVICES=json.dumps(node["services"]))
    try:
        async with asyncssh.connect(
            node["ip"],
            port=settings.infra_ssh_port,
            username=settings.infra_ssh_user,
            password=settings.infra_ssh_pass,
            known_hosts=None,
            connect_timeout=5,
        ) as conn:
            result = await asyncio.wait_for(
                conn.run("python3 -", input=script, check=False), timeout=10
            )
            latency_ms = round((time.monotonic() - start) * 1000)
            if result.exit_status != 0 or not result.stdout:
                return {
                    **node,
                    "status": "error",
                    "latency_ms": latency_ms,
                    "error": (result.stderr or "no output").strip()[:300],
                }
            data = json.loads(result.stdout.strip().splitlines()[-1])
            return {**node, "status": "online", "latency_ms": latency_ms, **data}
    except (OSError, asyncssh.Error, asyncio.TimeoutError) as e:
        return {**node, "status": "offline", "error": str(e)[:300]}
    except Exception as e:
        return {**node, "status": "error", "error": str(e)[:300]}


async def get_all_nodes_status() -> list[dict]:
    return list(await asyncio.gather(*[_collect_node(n) for n in NODES]))
