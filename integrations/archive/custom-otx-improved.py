#!/usr/bin/env python3
import sys
import json
import requests
import ipaddress

def is_public_ip(ip_str):
    try:
        ip = ipaddress.ip_address(ip_str)
        return not (ip.is_private or ip.is_loopback or ip.is_multicast or ip.is_link_local)
    except Exception:
        return False

# ข้อมูลจาก Wazuh
alert_file = open(sys.argv[1])
alert_json = json.loads(alert_file.read())
alert_file.close()

# ดึง IP ทั้ง Source และ Destination
data = alert_json.get('data', {})
ips_to_check = []
for key in ['srcip', 'dstip']:
    ip = data.get(key)
    if ip and is_public_ip(ip):
        ips_to_check.append((key, ip))

if not ips_to_check:
    sys.exit(0)

api_key = sys.argv[2] # รับจาก ossec.conf
headers = {'X-OTX-API-KEY': api_key}

for ip_type, ip in ips_to_check:
    url = f"https://otx.alienvault.com/api/v1/indicators/IPv4/{ip}/reputation"
    try:
        response = requests.get(url, headers=headers, timeout=5)
        if response.status_code == 200:
            res_data = response.json()
            reputation = res_data.get("reputation", 0)
            if reputation and reputation > 0:
                # ส่งข้อมูลกลับไปที่ Wazuh
                print(json.dumps({
                    "otx_status": "malicious",
                    "otx_score": reputation,
                    "otx_ip": ip,
                    "otx_ip_type": ip_type,
                    "otx_original_description": alert_json.get("rule", {}).get("description")
                }))
    except Exception:
        pass
