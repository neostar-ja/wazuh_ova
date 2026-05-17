#!/usr/bin/env python3
"""
Network Anomaly Test Log Generator
Generates realistic Huawei USG firewall logs for testing network anomaly detection
Tests various scenarios:
  - Internal to External with suspicious ports (DENY and PERMIT)
  - External to Internal with suspicious ports (DENY and PERMIT)
  - Brute force patterns
  - Both normal and malicious activities
Created: 2026-05-14
"""

import socket
import time
import sys
from datetime import datetime
from typing import List
import random

# Wazuh syslog receiver
WAZUH_HOST = 'localhost'
WAZUH_PORT = 514

# Test IP ranges
INTERNAL_IPS = [
    '10.251.1.100',
    '10.251.1.101',
    '10.251.1.102',
    '10.251.2.50',
    '10.251.5.10',
    '192.168.1.100',
    '172.16.0.100'
]

EXTERNAL_IPS = [
    '8.8.8.8',
    '1.1.1.1',
    '208.67.222.222',
    '192.0.2.1',
    '203.0.113.45',
    '198.51.100.89'
]

# Suspicious ports
SUSPICIOUS_PORTS = {
    22: 'SSH',
    23: 'Telnet',
    3389: 'RDP',
    5900: 'VNC',
    25: 'SMTP',
    161: 'SNMP',
    135: 'RPC',
    139: 'NetBIOS',
    445: 'SMB',
}

def generate_huawei_log(
    src_ip: str,
    src_port: int,
    dst_ip: str,
    dst_port: int,
    action: str,
    protocol: str = 'TCP',
    app: str = 'SSH',
    rule_name: str = 'default-policy'
) -> str:
    """Generate a realistic Huawei USG log entry"""
    
    # Use realistic source/destination zones
    src_zone = 'trust' if src_ip in INTERNAL_IPS else 'untrust'
    dst_zone = 'untrust' if dst_ip not in INTERNAL_IPS else 'trust'
    
    timestamp = datetime.now().strftime('%b %d %H:%M:%S')
    hostname = 'WUH-B-DC-USG6712E-1'
    
    # Policy action format
    if action.lower() == 'deny':
        action_str = 'POLICYDENY'
    else:
        action_str = 'POLICYPERMIT'
    
    # Build log entry
    log_entry = (
        f"{timestamp} {hostname} %%01POLICY/6/{action_str}(l): "
        f"protocol={protocol}, source-ip={src_ip}, source-port={src_port}, "
        f"destination-ip={dst_ip}, destination-port={dst_port}, "
        f"time={timestamp}, "
        f"source-zone={src_zone}, destination-zone={dst_zone}, "
        f"application-name={app}, rule-name={rule_name}."
    )
    
    return log_entry

def send_syslog(host: str, port: int, messages: List[str]) -> int:
    """Send messages to syslog server (Wazuh)"""
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    
    sent_count = 0
    for message in messages:
        try:
            # RFC 3164 format: <PRI>HOSTNAME: MESSAGE
            # Priority: LOCAL0 (16) * 8 + INFO (6) = 134
            syslog_msg = f"<134>{message}"
            
            sock.sendto(syslog_msg.encode('utf-8'), (host, port))
            sent_count += 1
            
            print(f"✓ [{sent_count}] Sent: {message[:70]}...")
            time.sleep(0.15)  # Delay between messages
            
        except Exception as e:
            print(f"✗ Error sending message: {e}")
    
    sock.close()
    return sent_count

def generate_test_scenarios() -> List[str]:
    """Generate comprehensive test scenarios"""
    
    logs = []
    
    print("\n" + "="*80)
    print("NETWORK ANOMALY TEST SCENARIO GENERATOR")
    print("="*80 + "\n")
    
    # Scenario 1: Internal -> External with SSH (DENY) - Good block
    print("[1/10] Internal → External SSH attempt (BLOCKED)...")
    logs.append(generate_huawei_log(
        src_ip='10.251.1.100',
        src_port=22,
        dst_ip='8.8.8.8',
        dst_port=443,
        action='deny',
        app='SSH',
        rule_name='deny-outbound-ssh'
    ))
    
    # Scenario 2: Internal -> External with SSH (PERMIT) - Suspicious
    print("[2/10] Internal → External SSH attempt (ALLOWED) - Suspicious...")
    logs.append(generate_huawei_log(
        src_ip='10.251.1.101',
        src_port=22,
        dst_ip='203.0.113.45',
        dst_port=443,
        action='permit',
        app='SSH',
        rule_name='allow-outbound-ssh'
    ))
    
    # Scenario 3: External -> Internal with SSH (DENY) - Attack blocked
    print("[3/10] External → Internal SSH attack (BLOCKED) - Intrusion attempt...")
    logs.append(generate_huawei_log(
        src_ip='192.0.2.1',
        src_port=51234,
        dst_ip='10.251.1.100',
        dst_port=22,
        action='deny',
        app='SSH',
        rule_name='deny-inbound-ssh'
    ))
    
    # Scenario 4: External -> Internal with SSH (PERMIT) - CRITICAL
    print("[4/10] External → Internal SSH attack (ALLOWED) - CRITICAL...")
    logs.append(generate_huawei_log(
        src_ip='198.51.100.89',
        src_port=51235,
        dst_ip='10.251.1.102',
        dst_port=22,
        action='permit',
        app='SSH',
        rule_name='management-ssh-policy'
    ))
    
    # Scenario 5: External -> Internal with RDP (DENY)
    print("[5/10] External → Internal RDP attack (BLOCKED)...")
    logs.append(generate_huawei_log(
        src_ip='208.67.222.222',
        src_port=51236,
        dst_ip='10.251.2.50',
        dst_port=3389,
        action='deny',
        app='RDP',
        rule_name='deny-inbound-rdp'
    ))
    
    # Scenario 6: External -> Internal with Telnet (DENY) 
    print("[6/10] External → Internal Telnet attack (BLOCKED)...")
    logs.append(generate_huawei_log(
        src_ip='1.1.1.1',
        src_port=51237,
        dst_ip='10.251.1.100',
        dst_port=23,
        action='deny',
        app='Telnet',
        rule_name='deny-inbound-telnet'
    ))
    
    # Scenario 7: Multiple SSH attempts (Brute force pattern)
    print("[7/10] Multiple inbound SSH attempts (Brute force pattern)...")
    for i in range(4):
        logs.append(generate_huawei_log(
            src_ip='203.0.113.45',
            src_port=51240 + i,
            dst_ip='10.251.1.100',
            dst_port=22,
            action='deny',
            app='SSH',
            rule_name='deny-inbound-ssh'
        ))
    
    # Scenario 8: Internal -> External with RDP (Allowed)
    print("[8/10] Internal → External RDP (ALLOWED) - Suspicious outbound...")
    logs.append(generate_huawei_log(
        src_ip='10.251.1.100',
        src_port=3389,
        dst_ip='198.51.100.89',
        dst_port=443,
        action='permit',
        app='RDP',
        rule_name='allow-outbound-rdp'
    ))
    
    # Scenario 9: External -> Internal with VNC (Denied)
    print("[9/10] External → Internal VNC attack (BLOCKED)...")
    logs.append(generate_huawei_log(
        src_ip='192.0.2.1',
        src_port=51244,
        dst_ip='10.251.5.10',
        dst_port=5900,
        action='deny',
        app='VNC',
        rule_name='deny-inbound-vnc'
    ))
    
    # Scenario 10: Legitimate traffic (for control - should NOT trigger)
    print("[10/10] Legitimate HTTPS traffic (Control - should not alert)...")
    logs.append(generate_huawei_log(
        src_ip='10.251.1.100',
        src_port=51245,
        dst_ip='8.8.8.8',
        dst_port=443,
        action='permit',
        app='HTTPS',
        rule_name='allow-outbound-https'
    ))
    
    return logs

def print_test_info():
    """Print test information and expected outcomes"""
    
    print("\n" + "="*80)
    print("EXPECTED DETECTION OUTCOMES")
    print("="*80 + "\n")
    
    test_cases = [
        ("1", "Internal→External SSH (DENY)", "✅ Should alert (SSH outbound attempt)", "Medium"),
        ("2", "Internal→External SSH (PERMIT)", "✅ Should alert (Suspicious allow)", "High"),
        ("3", "External→Internal SSH (DENY)", "✅ Should alert (Attack blocked)", "High"),
        ("4", "External→Internal SSH (PERMIT)", "🔴 CRITICAL - Should alert immediately", "CRITICAL"),
        ("5", "External→Internal RDP (DENY)", "✅ Should alert (RDP attack blocked)", "High"),
        ("6", "External→Internal Telnet (DENY)", "✅ Should alert (Deprecated proto)", "Medium"),
        ("7", "Brute force pattern (4x SSH)", "✅ Should detect as brute force", "CRITICAL"),
        ("8", "Internal→External RDP (PERMIT)", "✅ Should alert (Outbound RDP)", "Medium"),
        ("9", "External→Internal VNC (DENY)", "✅ Should alert (VNC attack blocked)", "High"),
        ("10", "HTTPS traffic (normal)", "⚪ Should NOT alert (legitimate)", "Low"),
    ]
    
    for num, scenario, detection, severity in test_cases:
        print(f"[{num}] {scenario}")
        print(f"    Expected: {detection}")
        print(f"    Severity: {severity}\n")

if __name__ == "__main__":
    
    # Generate test scenarios
    logs = generate_test_scenarios()
    
    print_test_info()
    
    # Send to Wazuh
    print("="*80)
    print("SENDING TEST LOGS TO WAZUH")
    print(f"Target: {WAZUH_HOST}:{WAZUH_PORT}")
    print("="*80 + "\n")
    
    if len(sys.argv) > 1 and sys.argv[1] == '--dry-run':
        print("DRY RUN MODE - Logs generated but not sent\n")
        for i, log in enumerate(logs, 1):
            print(f"{i}. {log}\n")
    else:
        sent = send_syslog(WAZUH_HOST, WAZUH_PORT, logs)
        print(f"\n✓ Successfully sent {sent} test logs to Wazuh!")
        print("\nWait 10-15 seconds for Wazuh to process and generate alerts...")
        print("Then check the Wazuh Dashboard or /var/ossec/logs/alerts/alerts.log")
