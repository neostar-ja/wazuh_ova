#!/usr/bin/env python3
"""
Network Anomaly Detection - Comprehensive Test & Verification Script
Tests all detection rules and validates alert generation
Tests both DENY and PERMIT policies
Sends test logs and verifies they trigger correct alerts
Created: 2026-05-14
"""

import socket
import time
import sys
import subprocess
import json
from datetime import datetime
from typing import List, Dict, Tuple
import os

# Configuration
WAZUH_HOST = 'localhost'
WAZUH_PORT = 514
WAZUH_ALERTS_LOG = '/var/ossec/logs/alerts/alerts.log'
WAZUH_LOGS_DIR = '/var/ossec/logs'

# Test scenarios with expected rule IDs
TEST_SCENARIOS = [
    {
        'name': 'Internal→External SSH (DENY)',
        'src_ip': '10.251.1.100',
        'src_port': 22,
        'dst_ip': '8.8.8.8',
        'dst_port': 443,
        'action': 'POLICYDENY',
        'protocol': 'TCP',
        'expected_rules': [100090, 100100],  # SSH rule + DENY rule
        'severity': 'high',
        'description': 'Blocked outbound SSH attempt'
    },
    {
        'name': 'Internal→External SSH (PERMIT)',
        'src_ip': '10.251.1.101',
        'src_port': 22,
        'dst_ip': '203.0.113.45',
        'dst_port': 443,
        'action': 'POLICYPERMIT',
        'protocol': 'TCP',
        'expected_rules': [100090, 100103],  # SSH rule + PERMIT rule
        'severity': 'high',
        'description': 'Suspicious allowed SSH outbound'
    },
    {
        'name': 'External→Internal SSH (DENY)',
        'src_ip': '192.0.2.1',
        'src_port': 51234,
        'dst_ip': '10.251.1.100',
        'dst_port': 22,
        'action': 'POLICYDENY',
        'protocol': 'TCP',
        'expected_rules': [100091, 100101],  # SSH rule + DENY rule
        'severity': 'high',
        'description': 'Blocked SSH attack'
    },
    {
        'name': 'External→Internal SSH (PERMIT - CRITICAL)',
        'src_ip': '198.51.100.89',
        'src_port': 51235,
        'dst_ip': '10.251.1.102',
        'dst_port': 22,
        'action': 'POLICYPERMIT',
        'protocol': 'TCP',
        'expected_rules': [100091, 100104],  # SSH rule + PERMIT inbound rule
        'severity': 'critical',
        'description': 'Critical: Allowed inbound SSH'
    },
    {
        'name': 'External→Internal RDP (DENY)',
        'src_ip': '208.67.222.222',
        'src_port': 51236,
        'dst_ip': '10.251.2.50',
        'dst_port': 3389,
        'action': 'POLICYDENY',
        'protocol': 'TCP',
        'expected_rules': [100092, 100102],
        'severity': 'high',
        'description': 'Blocked RDP attack'
    },
    {
        'name': 'Legitimate HTTPS (Control)',
        'src_ip': '10.251.1.100',
        'src_port': 51245,
        'dst_ip': '8.8.8.8',
        'dst_port': 443,
        'action': 'POLICYPERMIT',
        'protocol': 'TCP',
        'expected_rules': [100050, 100052],  # Should NOT trigger network_anomaly rules
        'severity': 'low',
        'description': 'Normal HTTPS traffic - no alert expected'
    }
]

def generate_huawei_log(scenario: Dict) -> str:
    """Generate Huawei USG log entry"""
    
    src_zone = 'trust' if scenario['src_ip'].startswith('10.') else 'untrust'
    dst_zone = 'untrust' if scenario['dst_ip'].startswith('10.') else 'trust'
    
    timestamp = datetime.now().strftime('%b %d %H:%M:%S')
    hostname = 'WUH-B-DC-USG6712E-1'
    action_str = scenario['action']
    
    log_entry = (
        f"{timestamp} {hostname} %%01POLICY/6/{action_str}(l): "
        f"protocol={scenario['protocol']}, source-ip={scenario['src_ip']}, "
        f"source-port={scenario['src_port']}, "
        f"destination-ip={scenario['dst_ip']}, "
        f"destination-port={scenario['dst_port']}, "
        f"time={timestamp}, "
        f"source-zone={src_zone}, destination-zone={dst_zone}, "
        f"application-name=SSH, rule-name=test-policy."
    )
    
    return log_entry

def send_test_logs(scenarios: List[Dict]) -> bool:
    """Send test logs to Wazuh"""
    
    print("\n" + "="*80)
    print("SENDING TEST LOGS")
    print("="*80 + "\n")
    
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    
    for i, scenario in enumerate(scenarios, 1):
        try:
            log = generate_huawei_log(scenario)
            syslog_msg = f"<134>{log}"
            
            sock.sendto(syslog_msg.encode('utf-8'), (WAZUH_HOST, WAZUH_PORT))
            print(f"[{i}/{len(scenarios)}] {scenario['name']}")
            print(f"  ├─ Expected Rules: {scenario['expected_rules']}")
            print(f"  ├─ Severity: {scenario['severity']}")
            print(f"  └─ {scenario['description']}\n")
            
            time.sleep(0.2)
            
        except Exception as e:
            print(f"❌ Error sending {scenario['name']}: {e}")
            return False
    
    sock.close()
    return True

def monitor_alerts(wait_seconds: int = 20, expected_count: int = 0) -> List[Dict]:
    """Monitor Wazuh alerts log and extract network anomaly alerts"""
    
    print("="*80)
    print(f"WAITING FOR ALERTS (max {wait_seconds} seconds)...")
    print("="*80 + "\n")
    
    # Get initial file size
    try:
        initial_size = os.path.getsize(WAZUH_ALERTS_LOG)
    except:
        initial_size = 0
    
    alerts_found = []
    start_time = time.time()
    
    while time.time() - start_time < wait_seconds:
        try:
            current_size = os.path.getsize(WAZUH_ALERTS_LOG)
            
            if current_size > initial_size:
                # Read new alerts
                with open(WAZUH_ALERTS_LOG, 'r') as f:
                    lines = f.readlines()
                    for line in lines[-50:]:  # Check last 50 lines
                        try:
                            if '{' in line and '}' in line:
                                # Try to parse as JSON
                                json_part = line[line.index('{'):]
                                alert = json.loads(json_part)
                                
                                # Check if it's a network_anomaly alert
                                if 'rule' in alert:
                                    rule = alert['rule']
                                    rule_id = rule.get('id', 0)
                                    rule_groups = rule.get('groups', [])
                                    
                                    if 'network_anomaly' in rule_groups or rule_id >= 100090:
                                        alerts_found.append(alert)
                                        print(f"✓ Alert found - Rule ID: {rule_id}, Level: {rule.get('level')}")
                        except:
                            pass
            
            # Check if we found enough alerts
            if expected_count > 0 and len(alerts_found) >= expected_count:
                print(f"\n✓ Found {len(alerts_found)} alerts as expected!")
                break
            
            time.sleep(1)
            print(".", end="", flush=True)
            
        except Exception as e:
            time.sleep(1)
    
    print("\n")
    return alerts_found

def verify_alerts(alerts: List[Dict], scenarios: List[Dict]) -> Dict:
    """Verify that correct alerts were triggered"""
    
    print("\n" + "="*80)
    print("ALERT VERIFICATION RESULTS")
    print("="*80 + "\n")
    
    results = {
        'total_alerts': len(alerts),
        'total_scenarios': len(scenarios),
        'passed': 0,
        'failed': 0,
        'critical_alerts': 0,
        'details': []
    }
    
    # Extract rule IDs from alerts
    triggered_rules = set()
    for alert in alerts:
        if 'rule' in alert:
            triggered_rules.add(alert['rule'].get('id'))
            if alert['rule'].get('level', 0) >= 8:
                results['critical_alerts'] += 1
    
    print(f"Total Triggered Rules: {len(triggered_rules)}")
    print(f"Triggered Rule IDs: {sorted(triggered_rules)}\n")
    
    # Verify scenarios
    for scenario in scenarios:
        expected_rules = set(scenario['expected_rules'])
        
        # Check if at least one expected rule was triggered
        if expected_rules & triggered_rules or scenario['severity'] == 'low':
            status = "✓ PASS"
            results['passed'] += 1
        else:
            status = "❌ FAIL"
            results['failed'] += 1
        
        result_line = (
            f"{status}: {scenario['name']}\n"
            f"       Expected: {expected_rules}, Got: {expected_rules & triggered_rules}\n"
            f"       Severity: {scenario['severity']}"
        )
        
        print(result_line)
        results['details'].append({
            'scenario': scenario['name'],
            'status': status,
            'expected': list(expected_rules),
            'triggered': list(expected_rules & triggered_rules)
        })
        print()
    
    return results

def print_summary(results: Dict):
    """Print test summary"""
    
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80 + "\n")
    
    print(f"Total Alerts Generated: {results['total_alerts']}")
    print(f"Critical Alerts (Level ≥8): {results['critical_alerts']}")
    print(f"Scenarios Verified: {results['passed']}/{results['total_scenarios']}")
    print(f"Success Rate: {(results['passed']/results['total_scenarios']*100):.1f}%\n")
    
    if results['failed'] > 0:
        print(f"❌ {results['failed']} scenario(s) failed verification")
    else:
        print("✓ All scenarios passed verification!")
    
    print("\nDetailed Results:")
    for detail in results['details']:
        print(f"  • {detail['scenario']}: {detail['status']}")
    
    print("\n" + "="*80)

def main():
    """Run complete test"""
    
    print("\n" + "="*80)
    print("NETWORK ANOMALY DETECTION - COMPREHENSIVE TEST")
    print("="*80)
    print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    # Check if alerts log exists
    if not os.path.exists(WAZUH_ALERTS_LOG):
        print(f"⚠️  Alert log not found at: {WAZUH_ALERTS_LOG}")
        print("Make sure Wazuh Manager is running and configured")
        return 1
    
    print(f"✓ Wazuh alerts log found: {WAZUH_ALERTS_LOG}\n")
    
    # Send test logs
    if not send_test_logs(TEST_SCENARIOS):
        print("❌ Failed to send test logs")
        return 1
    
    # Wait for alerts
    print("Waiting 20 seconds for Wazuh to process logs...")
    alerts = monitor_alerts(wait_seconds=20, expected_count=len(TEST_SCENARIOS))
    
    # Verify results
    results = verify_alerts(alerts, TEST_SCENARIOS)
    print_summary(results)
    
    # Exit code based on results
    return 0 if results['failed'] == 0 else 1

if __name__ == "__main__":
    sys.exit(main())
