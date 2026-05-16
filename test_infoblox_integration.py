#!/usr/bin/env python3
"""
Infoblox Integration Test Script
ทดสอบ Decoder + Rules ของ Infoblox ใน Wazuh ด้วยการส่ง log จำลองผ่าน UDP Syslog
วันที่: 15 พฤษภาคม 2026
"""

import socket
import time
import sys
from datetime import datetime

# ===== CONFIGURATION =====
WAZUH_WORKER_IP = "10.251.151.12"   # Worker Node ที่รับ Syslog
WAZUH_SYSLOG_PORT = 514              # UDP port
INFOBLOX_HOSTNAME = "infoblox-gm"   # Hostname ของ Infoblox ที่จำลอง

# Syslog Priority Values
PRI_LOCAL0_INFO    = "<134>"   # facility=local0(16), severity=info(6)  → 16*8+6=134
PRI_LOCAL0_WARNING = "<132>"   # facility=local0(16), severity=warning(4) → 16*8+4=132


def send_syslog(priority: str, hostname: str, program: str, pid: int, message: str):
    """ส่ง RFC3164 Syslog UDP packet"""
    ts = datetime.now().strftime("%b %d %H:%M:%S").replace(" 0", "  ")
    log_line = f"{priority}{ts} {hostname} {program}[{pid}]: {message}"
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.sendto(log_line.encode('utf-8'), (WAZUH_WORKER_IP, WAZUH_SYSLOG_PORT))
    sock.close()
    return log_line


def run_tests():
    print("=" * 65)
    print("  Infoblox DDI Integration Test — Wazuh SIEM")
    print(f"  Target: {WAZUH_WORKER_IP}:{WAZUH_SYSLOG_PORT}")
    print("=" * 65)
    print()

    tests = [
        # ===== DNS Tests =====
        {
            "category": "DNS",
            "name": "DNS A Record Query (NIOS 8.x format)",
            "program": "named",
            "pid": 1234,
            "priority": PRI_LOCAL0_INFO,
            "message": "queries: info: client @0x7f8aAbCd1234 10.251.1.100#54321 (google.com): query: google.com IN A + (10.251.5.15)",
            "expected_rule": "100400",
            "expected_level": 3,
        },
        {
            "category": "DNS",
            "name": "DNS AAAA Record Query",
            "program": "named",
            "pid": 1234,
            "priority": PRI_LOCAL0_INFO,
            "message": "queries: info: client @0x7f8aAbCd1234 10.251.1.101#54322 (ipv6.google.com): query: ipv6.google.com IN AAAA + (10.251.5.15)",
            "expected_rule": "100401",
            "expected_level": 3,
        },
        {
            "category": "DNS-THREAT",
            "name": "RPZ QNAME Block — Malware Domain",
            "program": "named",
            "pid": 1234,
            "priority": PRI_LOCAL0_WARNING,
            "message": "client 10.251.1.50#54323: rpz QNAME Policy Rewrite ransomware.evil.com/A/IN via rpz.malware-domains",
            "expected_rule": "100430",
            "expected_level": 8,
        },
        {
            "category": "DNS-THREAT",
            "name": "RPZ IP Block — Malicious IP",
            "program": "named",
            "pid": 1234,
            "priority": PRI_LOCAL0_WARNING,
            "message": "client 10.251.1.51#54324: rpz IP Policy Rewrite 1.2.3.4.rpz-ip/A/IN via rpz.ip-blacklist",
            "expected_rule": "100431",
            "expected_level": 8,
        },
        {
            "category": "DNS-ATTACK",
            "name": "AXFR Zone Transfer Attack",
            "program": "named",
            "pid": 1234,
            "priority": PRI_LOCAL0_WARNING,
            "message": "client 198.51.100.5#54325: denied AXFR from 198.51.100.5 for zone corp.internal",
            "expected_rule": "100402",
            "expected_level": 10,
        },
        {
            "category": "DNS-ATTACK",
            "name": "Dynamic DNS Update Denied",
            "program": "named",
            "pid": 1234,
            "priority": PRI_LOCAL0_WARNING,
            "message": "client 10.251.1.200#54326: denied update from 10.251.1.200 for zone corp.internal",
            "expected_rule": "100404",
            "expected_level": 7,
        },
        {
            "category": "DNS",
            "name": "DNS Query Cache Denied (Unauthorized resolver)",
            "program": "named",
            "pid": 1234,
            "priority": PRI_LOCAL0_WARNING,
            "message": "client 192.168.99.1#54327: query (cache) 'google.com/A/IN' denied",
            "expected_rule": "100406",
            "expected_level": 5,
        },
        # ===== DHCP Tests =====
        {
            "category": "DHCP",
            "name": "DHCPACK — IP Lease Assigned",
            "program": "dhcpd",
            "pid": 5678,
            "priority": PRI_LOCAL0_INFO,
            "message": "DHCPACK on 10.251.100.50 to aa:bb:cc:dd:ee:ff (PC-STAFF-01) via eth0",
            "expected_rule": "100411",
            "expected_level": 3,
        },
        {
            "category": "DHCP",
            "name": "DHCPDISCOVER — New Device",
            "program": "dhcpd",
            "pid": 5678,
            "priority": PRI_LOCAL0_INFO,
            "message": "DHCPDISCOVER from 11:22:33:44:55:66 (UNKNOWN-DEVICE) via eth0",
            "expected_rule": "100413",
            "expected_level": 3,
        },
        {
            "category": "DHCP",
            "name": "DHCPREQUEST — Lease Renewal",
            "program": "dhcpd",
            "pid": 5678,
            "priority": PRI_LOCAL0_INFO,
            "message": "DHCPREQUEST for 10.251.100.50 from aa:bb:cc:dd:ee:ff (PC-STAFF-01) via eth0",
            "expected_rule": "100414",
            "expected_level": 2,
        },
        {
            "category": "DHCP",
            "name": "DHCPRELEASE — IP Released",
            "program": "dhcpd",
            "pid": 5678,
            "priority": PRI_LOCAL0_INFO,
            "message": "DHCPRELEASE of 10.251.100.50 from aa:bb:cc:dd:ee:ff (PC-STAFF-01) via eth0",
            "expected_rule": "100415",
            "expected_level": 3,
        },
        {
            "category": "DHCP-ALERT",
            "name": "DHCPDECLINE — IP Conflict Detected",
            "program": "dhcpd",
            "pid": 5678,
            "priority": PRI_LOCAL0_WARNING,
            "message": "DHCPDECLINE of 10.251.100.51 from ff:ee:dd:cc:bb:aa via eth0",
            "expected_rule": "100417",
            "expected_level": 8,
        },
        {
            "category": "DHCP-ALERT",
            "name": "DHCPNAK — Lease Request Rejected",
            "program": "dhcpd",
            "pid": 5678,
            "priority": PRI_LOCAL0_WARNING,
            "message": "DHCPNAK on 10.251.100.52 to ff:ee:dd:cc:bb:aa via eth0",
            "expected_rule": "100416",
            "expected_level": 5,
        },
    ]

    success = 0
    failed = 0
    current_category = ""

    for i, test in enumerate(tests, 1):
        if test["category"] != current_category:
            current_category = test["category"]
            print(f"--- {current_category} ---")

        log_line = send_syslog(
            test["priority"],
            INFOBLOX_HOSTNAME,
            test["program"],
            test["pid"],
            test["message"]
        )

        print(f"[{i:02d}] {test['name']}")
        print(f"      Expected: Rule {test['expected_rule']} (Level {test['expected_level']})")
        print(f"      Sent:     {log_line[:100]}...")
        print()
        time.sleep(0.3)

    print("=" * 65)
    print(f"  Sent {len(tests)} test logs to {WAZUH_WORKER_IP}")
    print()
    print("  ตรวจสอบผลบน Wazuh Manager:")
    print(f"  ssh wazuh-user@10.251.151.11")
    print("  sudo tail -f /var/ossec/logs/alerts/alerts.log | grep -i 'infoblox\\|dhcp\\|rpz\\|axfr'")
    print()
    print("  หรือ query ผ่าน OpenSearch:")
    print("  curl -k -u admin:admin 'https://10.251.151.13:9200/wazuh-alerts-4.x-*/_search?q=rule.groups:infoblox&size=10'")
    print("=" * 65)


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--dry-run":
        print("[DRY RUN] — ไม่ได้ส่ง log จริง แต่แสดงรายการ test cases ทั้งหมด")
        print()
    run_tests()
