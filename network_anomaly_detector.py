#!/usr/bin/env python3
"""
Network Anomaly Detector - Enhanced Alert Processor
Purpose: Detect suspicious internal->external and external->internal network flows
Checks:
  - Internal IP (RFC1918 + company ranges) to External IP with suspicious ports
  - External IP to Internal IP with suspicious ports
  - Both DENY and PERMIT policies
Integrates with Wazuh for advanced threat detection
Created: 2026-05-14
"""

import sys
import json
import ipaddress
from typing import Tuple, Dict, Any

# Company-specific internal IP ranges (can be configured)
COMPANY_INTERNAL_RANGES = [
    ipaddress.ip_network('10.0.0.0/8'),
    ipaddress.ip_network('172.16.0.0/12'),
    ipaddress.ip_network('192.168.0.0/16'),
    ipaddress.ip_network('10.251.0.0/16'),  # Huawei network
    ipaddress.ip_network('192.0.2.0/24'),   # Customer test range
]

# High-risk ports for different scenarios
HIGH_RISK_PORTS = {
    22: {'protocol': 'SSH', 'severity': 'high', 'description': 'Secure Shell'},
    23: {'protocol': 'Telnet', 'severity': 'critical', 'description': 'Unencrypted remote access'},
    3389: {'protocol': 'RDP', 'severity': 'high', 'description': 'Remote Desktop Protocol'},
    5900: {'protocol': 'VNC', 'severity': 'high', 'description': 'Virtual Network Computing'},
    25: {'protocol': 'SMTP', 'severity': 'medium', 'description': 'Unencrypted email'},
    161: {'protocol': 'SNMP', 'severity': 'medium', 'description': 'Simple Network Management'},
    135: {'protocol': 'RPC', 'severity': 'high', 'description': 'Windows RPC'},
    139: {'protocol': 'NetBIOS', 'severity': 'high', 'description': 'NetBIOS Session Service'},
    445: {'protocol': 'SMB', 'severity': 'high', 'description': 'Windows File Sharing'},
    3306: {'protocol': 'MySQL', 'severity': 'medium', 'description': 'MySQL Database'},
    5432: {'protocol': 'PostgreSQL', 'severity': 'medium', 'description': 'PostgreSQL Database'},
}

def is_internal_ip(ip_str: str) -> bool:
    """Check if IP is internal (RFC1918 or company range)"""
    try:
        ip = ipaddress.ip_address(ip_str)
        
        # Check against internal ranges
        for network in COMPANY_INTERNAL_RANGES:
            if ip in network:
                return True
        
        return False
    except Exception:
        return False

def is_external_ip(ip_str: str) -> bool:
    """Check if IP is external (public)"""
    try:
        ip = ipaddress.ip_address(ip_str)
        # External = not private, not loopback, not multicast, not link-local
        return not (ip.is_private or ip.is_loopback or ip.is_multicast or ip.is_link_local or ip.is_reserved)
    except Exception:
        return False

def analyze_flow(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Analyze network flow for anomalies
    Returns enriched alert data
    """
    result = {
        'anomaly_detected': False,
        'flow_type': 'unknown',
        'severity_boost': 0,
        'threat_description': '',
        'recommendation': ''
    }
    
    srcip = data.get('srcip', '')
    dstip = data.get('dstip', '')
    srcport = int(data.get('srcport', 0)) if data.get('srcport') else 0
    dstport = int(data.get('dstport', 0)) if data.get('dstport') else 0
    policy_action = data.get('action', '').lower()
    
    # Validate IPs
    if not srcip or not dstip:
        return result
    
    src_internal = is_internal_ip(srcip)
    dst_internal = is_internal_ip(dstip)
    src_external = is_external_ip(srcip)
    dst_external = is_external_ip(dstip)
    
    # Check for internal -> external flow
    if src_internal and dst_external:
        result['flow_type'] = 'outbound'
        
        # Check destination port
        if dstport in HIGH_RISK_PORTS:
            port_info = HIGH_RISK_PORTS[dstport]
            result['anomaly_detected'] = True
            result['threat_description'] = (
                f"Outbound {port_info['protocol']} ({dstport}) from internal IP {srcip} "
                f"to external IP {dstip} - {port_info['description']}"
            )
            result['severity_boost'] = 2 if port_info['severity'] == 'critical' else 1
            
            if policy_action == 'permit':
                result['threat_description'] += " [ALLOWED]"
                result['recommendation'] = "Verify if this outbound connection is authorized"
                result['severity_boost'] += 1
            else:
                result['threat_description'] += " [BLOCKED]"
                result['recommendation'] = "Connection was blocked by policy (good)"
    
    # Check for external -> internal flow
    elif src_external and dst_internal:
        result['flow_type'] = 'inbound'
        
        # Check destination port
        if dstport in HIGH_RISK_PORTS:
            port_info = HIGH_RISK_PORTS[dstport]
            result['anomaly_detected'] = True
            result['threat_description'] = (
                f"INBOUND ATTACK PATTERN: {port_info['protocol']} ({dstport}) from external IP {srcip} "
                f"targeting internal IP {dstip} - {port_info['description']}"
            )
            result['severity_boost'] = 3 if port_info['severity'] == 'critical' else 2
            
            if policy_action == 'permit':
                result['threat_description'] += " [ALLOWED]"
                result['recommendation'] = "URGENT: Inbound attack is being allowed. Verify authorization immediately"
                result['severity_boost'] += 2
            else:
                result['threat_description'] += " [BLOCKED]"
                result['recommendation'] = "Attack was blocked by policy (good)"
    
    # Also check source port for outbound suspicious activity
    elif src_internal and dst_external and srcport in HIGH_RISK_PORTS:
        result['flow_type'] = 'outbound'
        port_info = HIGH_RISK_PORTS[srcport]
        result['anomaly_detected'] = True
        result['threat_description'] = (
            f"Outbound service on suspicious port {srcport} ({port_info['protocol']}) from internal IP {srcip} "
            f"to external IP {dstip}"
        )
        result['severity_boost'] = 1
        result['recommendation'] = "Verify if this is a legitimate service"
    
    return result

def process_alert(alert_file_path: str, api_key: str = None) -> bool:
    """
    Main function: Read Wazuh alert and process for anomalies
    """
    try:
        with open(alert_file_path, 'r') as f:
            alert_json = json.load(f)
    except Exception as e:
        print(json.dumps({
            'error': f'Failed to read alert file: {str(e)}',
            'status': 'error'
        }))
        return False
    
    # Extract relevant fields
    data = alert_json.get('data', {})
    rule = alert_json.get('rule', {})
    
    alert_data = {
        'srcip': data.get('srcip'),
        'dstip': data.get('dstip'),
        'srcport': data.get('srcport'),
        'dstport': data.get('dstport'),
        'action': 'deny' if 'DENY' in rule.get('description', '') else 'permit',
    }
    
    # Analyze flow
    analysis = analyze_flow(alert_data)
    
    if analysis['anomaly_detected']:
        output = {
            'status': 'anomaly_detected',
            'flow_type': analysis['flow_type'],
            'threat_description': analysis['threat_description'],
            'severity_boost': analysis['severity_boost'],
            'recommendation': analysis['recommendation'],
            'original_rule': rule.get('id'),
            'original_description': rule.get('description'),
            'srcip': alert_data['srcip'],
            'dstip': alert_data['dstip'],
            'srcport': alert_data['srcport'],
            'dstport': alert_data['dstport'],
        }
        print(json.dumps(output))
        return True
    else:
        # Return empty output if no anomaly
        return False

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({
            'error': 'Usage: network_anomaly_detector.py <alert_file> [otx_api_key]',
            'status': 'error'
        }))
        sys.exit(1)
    
    alert_file = sys.argv[1]
    api_key = sys.argv[2] if len(sys.argv) > 2 else None
    
    success = process_alert(alert_file, api_key)
    sys.exit(0 if success else 1)
