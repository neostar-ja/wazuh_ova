#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Huawei Firewall Log Analyzer & Wazuh Integration Tool
======================================================

Purpose: Analyze Huawei firewall logs, validate decoders/rules, and test Wazuh integration
Features:
  - Parse Huawei syslog format
  - Extract and categorize security events
  - Validate XML decoders/rules syntax
  - Generate security reports
  - Correlate attack patterns
  - Test log ingestion into Wazuh

Requirements:
  - Python 3.7+
  - pandas, requests, lxml
  
Usage:
  python3 huawei_firewall_analyzer.py --analyze logs.txt
  python3 huawei_firewall_analyzer.py --validate-decoders decoders.xml
  python3 huawei_firewall_analyzer.py --test-wazuh <logfile>

Author: Security Operations Team
Version: 2.0
Last Updated: 2024-05-13
"""

import sys
import json
import re
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta
from collections import defaultdict, Counter
from pathlib import Path
import argparse
import logging
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass, asdict
from enum import Enum

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/tmp/huawei_analyzer.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


class ThreatLevel(Enum):
    """Threat severity classification"""
    INFORMATIONAL = 1
    LOW = 2
    MEDIUM = 3
    HIGH = 4
    CRITICAL = 5


class EventType(Enum):
    """Huawei firewall event categories"""
    TRAFFIC_POLICY = "traffic_policy"
    IPS_ATTACK = "ips_attack"
    MALWARE = "malware"
    LOGIN = "login"
    VPN = "vpn"
    DDOS = "ddos"
    SYSTEM = "system"
    CERTIFICATE = "certificate"
    CONFIGURATION = "configuration"
    APPLICATION = "application"
    URL_FILTER = "url_filter"
    UNKNOWN = "unknown"


@dataclass
class HuaweiLogEvent:
    """Structured Huawei firewall log event"""
    timestamp: str
    hostname: str
    event_id: str
    module: str
    message_type: str
    event_type: EventType
    severity: ThreatLevel
    source_ip: Optional[str] = None
    source_port: Optional[int] = None
    dest_ip: Optional[str] = None
    dest_port: Optional[int] = None
    protocol: Optional[str] = None
    action: Optional[str] = None
    threat_type: Optional[str] = None
    threat_name: Optional[str] = None
    username: Optional[str] = None
    rule_name: Optional[str] = None
    raw_message: Optional[str] = None
    
    def to_dict(self):
        return asdict(self)


class HuaweiLogParser:
    """Parse Huawei firewall logs from syslog format"""
    
    # Supported Huawei formats:
    # 2024-05-13 14:23:45 huawei-usg-master [%%01SECURITY/4/ACCESSPOLICY_DENY(l):]: ...
    # May 13 2026 07:04:08 WUH-B-DC-USG6712E-1 %%01POLICY/6/POLICYPERMIT(l):...
    HUAWEI_PATTERNS = [
        r'^(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})\s+(\S+)\s+\[%%(\d+)(\w+)/(\d+)/([^\(]+)\(\w+\):\]:\s*(.*)',
        r'^([A-Z][a-z]{2}\s+\d{1,2}\s+\d{4}\s+\d{2}:\d{2}:\d{2})\s+(\S+)\s+%%(\d+)(\w+)/(\d+)/([^\(]+)\(\w+\):\s*(.*)',
        r'^(\d{4}/\d{2}/\d{2}\s+\d{2}:\d{2}:\d{2})\s+(\S+)\s+%%(\d+)(\w+)/(\d+)/([^\(]+)\(\w+\):\s*(.*)',
    ]
    
    SEVERITY_MAP = {
        '1': ThreatLevel.CRITICAL,
        '2': ThreatLevel.HIGH,
        '3': ThreatLevel.MEDIUM,
        '4': ThreatLevel.LOW,
        '5': ThreatLevel.INFORMATIONAL,
        '6': ThreatLevel.INFORMATIONAL,
    }
    
    EVENT_TYPE_PATTERNS = {
        EventType.TRAFFIC_POLICY: r'POLICYPERMIT|POLICYDENY|ACCESSPOLICY|URLFILTER_EVENT',
        EventType.IPS_ATTACK: r'ATTACK_DETECTED|IPS_EVENT',
        EventType.MALWARE: r'MALWARE_DETECTED',
        EventType.LOGIN: r'LOGIN_SUCCESS|LOGIN_FAILED|BRUTE_FORCE',
        EventType.VPN: r'IPSEC_TUNNEL|VPN_AUTH',
        EventType.DDOS: r'DDOS_DETECTED|DDOS_MITIGATED',
        EventType.SYSTEM: r'INTERFACE_|CPU_|MEMORY_|DISK_|REBOOT_|SYSTEM_',
        EventType.CERTIFICATE: r'CERTIFICATE_|SSL_HANDSHAKE',
        EventType.CONFIGURATION: r'CONFIG_CHANGED|CONFIG_SAVE',
        EventType.APPLICATION: r'APPCTRL|HIGH_BANDWIDTH_APP',
        EventType.URL_FILTER: r'BLOCKED_',
    }
    
    def __init__(self):
        self.events: List[HuaweiLogEvent] = []
        self.parse_errors = 0
        
    def parse_log_file(self, file_path: str) -> List[HuaweiLogEvent]:
        """Parse a Huawei log file"""
        logger.info(f"Parsing log file: {file_path}")
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                for line_num, line in enumerate(f, 1):
                    if not line.strip() or line.startswith('#'):
                        continue
                    
                    try:
                        event = self.parse_line(line.strip())
                        if event:
                            self.events.append(event)
                    except Exception as e:
                        logger.warning(f"Error parsing line {line_num}: {str(e)}")
                        self.parse_errors += 1
        except Exception as e:
            logger.error(f"Failed to open file {file_path}: {str(e)}")
            return []
        
        logger.info(f"Successfully parsed {len(self.events)} events, {self.parse_errors} errors")
        return self.events
    
    def parse_line(self, line: str) -> Optional[HuaweiLogEvent]:
        """Parse a single syslog line"""
        match = None
        for pattern in self.HUAWEI_PATTERNS:
            match = re.match(pattern, line)
            if match:
                break
        if not match:
            return None
        
        timestamp, hostname, event_id, module_id, level, msg_type, message = match.groups()
        
        # Determine event type
        event_type = self._classify_event_type(msg_type)
        severity = self.SEVERITY_MAP.get(level, ThreatLevel.LOW)
        
        # Extract fields from message
        fields = self._extract_fields(message)
        
        event = HuaweiLogEvent(
            timestamp=timestamp,
            hostname=hostname,
            event_id=event_id,
            module=module_id,
            message_type=msg_type,
            event_type=event_type,
            severity=severity,
            source_ip=fields.get('source_ip') or fields.get('source-ip'),
            source_port=self._safe_int(fields.get('source_port') or fields.get('source-port')),
            dest_ip=fields.get('dest_ip') or fields.get('destination_ip') or fields.get('destination-ip'),
            dest_port=self._safe_int(fields.get('dest_port') or fields.get('destination_port') or fields.get('destination-port')),
            protocol=fields.get('protocol'),
            action=fields.get('action'),
            threat_type=fields.get('threat_type') or fields.get('threat-type'),
            threat_name=fields.get('threat_name') or fields.get('threat-name'),
            username=fields.get('username'),
            rule_name=fields.get('rule_name') or fields.get('rule-name'),
            raw_message=message
        )
        
        return event
    
    def _classify_event_type(self, msg_type: str) -> EventType:
        """Classify event based on message type"""
        for event_type, pattern in self.EVENT_TYPE_PATTERNS.items():
            if re.search(pattern, msg_type):
                return event_type
        return EventType.UNKNOWN
    
    def _extract_fields(self, message: str) -> Dict[str, str]:
        """Extract key-value pairs from message"""
        fields = {}
        # Pattern: key=value (separated by comma or space)
        pattern = r'(\w+(?:-\w+)?)=([^,\s]+)'
        matches = re.findall(pattern, message)
        for key, value in matches:
            fields[key] = value
        return fields
    
    @staticmethod
    def _safe_int(value: Optional[str]) -> Optional[int]:
        """Safely convert string to int"""
        try:
            return int(value) if value else None
        except (ValueError, TypeError):
            return None


class SecurityAnalyzer:
    """Analyze security events for patterns and threats"""
    
    def __init__(self, events: List[HuaweiLogEvent]):
        self.events = events
        self.alerts = []
        
    def generate_report(self) -> Dict:
        """Generate comprehensive security report"""
        logger.info("Generating security report...")
        
        report = {
            'timestamp': datetime.now().isoformat(),
            'total_events': len(self.events),
            'event_count_by_type': self._count_by_type(),
            'event_count_by_severity': self._count_by_severity(),
            'top_source_ips': self._top_ips('source'),
            'top_dest_ips': self._top_ips('dest'),
            'failed_login_attempts': self._analyze_failed_logins(),
            'port_scan_activity': self._detect_port_scanning(),
            'ddos_attacks': self._detect_ddos(),
            'malware_alerts': self._detect_malware(),
            'vpn_events': self._analyze_vpn(),
            'security_alerts': self._generate_security_alerts(),
            'timeline': self._create_timeline(),
        }
        
        return report
    
    def _count_by_type(self) -> Dict:
        """Count events by type"""
        counts = Counter()
        for event in self.events:
            counts[event.event_type.value] += 1
        return dict(counts)
    
    def _count_by_severity(self) -> Dict:
        """Count events by severity"""
        counts = Counter()
        for event in self.events:
            counts[event.severity.name] += 1
        return dict(counts)
    
    def _top_ips(self, ip_type: str, limit: int = 10) -> List[Tuple]:
        """Find top source/destination IPs"""
        ips = Counter()
        for event in self.events:
            if ip_type == 'source' and event.source_ip:
                ips[event.source_ip] += 1
            elif ip_type == 'dest' and event.dest_ip:
                ips[event.dest_ip] += 1
        return ips.most_common(limit)
    
    def _analyze_failed_logins(self) -> Dict:
        """Analyze failed login attempts"""
        failed = defaultdict(lambda: {'count': 0, 'ips': set()})
        
        for event in self.events:
            if event.event_type == EventType.LOGIN and 'FAILED' in event.message_type:
                user = event.username or 'unknown'
                failed[user]['count'] += 1
                if event.source_ip:
                    failed[user]['ips'].add(event.source_ip)
        
        # Convert sets to lists for JSON serialization
        return {user: {'count': data['count'], 'ips': list(data['ips'])} 
                for user, data in failed.items()}
    
    def _detect_port_scanning(self) -> List[Dict]:
        """Detect port scanning patterns"""
        port_scans = []
        
        # Group by source IP
        by_src_ip = defaultdict(list)
        for event in self.events:
            if event.source_ip and event.event_type == EventType.TRAFFIC_POLICY:
                by_src_ip[event.source_ip].append(event)
        
        # Find sources with many different destination ports
        for src_ip, events in by_src_ip.items():
            dest_ports = set()
            for event in events:
                if event.dest_port:
                    dest_ports.add(event.dest_port)
            
            if len(dest_ports) > 5:  # Threshold for port scanning
                port_scans.append({
                    'source_ip': src_ip,
                    'unique_dest_ports': len(dest_ports),
                    'dest_ports': sorted(list(dest_ports))[:20],  # Top 20
                    'event_count': len(events)
                })
        
        return sorted(port_scans, key=lambda x: x['unique_dest_ports'], reverse=True)
    
    def _detect_ddos(self) -> List[Dict]:
        """Detect DDoS attacks"""
        ddos_events = []
        
        for event in self.events:
            if event.event_type == EventType.DDOS:
                ddos_events.append({
                    'timestamp': event.timestamp,
                    'attack_type': event.threat_type,
                    'source_ip': event.source_ip,
                    'dest_ip': event.dest_ip,
                    'dest_port': event.dest_port,
                    'action': event.action,
                    'severity': event.severity.name
                })
        
        return ddos_events
    
    def _detect_malware(self) -> List[Dict]:
        """Detect malware alerts"""
        malware_events = []
        
        for event in self.events:
            if event.event_type == EventType.MALWARE:
                malware_events.append({
                    'timestamp': event.timestamp,
                    'threat_name': event.threat_name,
                    'source_ip': event.source_ip,
                    'dest_ip': event.dest_ip,
                    'severity': event.severity.name
                })
        
        return malware_events
    
    def _analyze_vpn(self) -> Dict:
        """Analyze VPN events"""
        vpn_up = 0
        vpn_down = 0
        auth_failures = 0
        
        for event in self.events:
            if event.event_type == EventType.VPN:
                if 'UP' in event.message_type:
                    vpn_up += 1
                elif 'DOWN' in event.message_type:
                    vpn_down += 1
                elif 'FAILURE' in event.message_type:
                    auth_failures += 1
        
        return {'connections_up': vpn_up, 'connections_down': vpn_down, 'auth_failures': auth_failures}
    
    def _generate_security_alerts(self) -> List[Dict]:
        """Generate high-priority security alerts"""
        alerts = []
        
        for event in self.events:
            if event.severity in (ThreatLevel.CRITICAL, ThreatLevel.HIGH):
                alerts.append({
                    'timestamp': event.timestamp,
                    'severity': event.severity.name,
                    'event_type': event.event_type.value,
                    'description': f"{event.message_type}: {event.threat_name or 'N/A'}",
                    'source': event.source_ip,
                    'destination': event.dest_ip
                })
        
        return sorted(alerts, key=lambda x: x['timestamp'], reverse=True)
    
    def _create_timeline(self) -> List[Dict]:
        """Create chronological event timeline"""
        timeline = []
        
        for event in sorted(self.events, key=lambda e: e.timestamp):
            timeline.append({
                'timestamp': event.timestamp,
                'type': event.event_type.value,
                'severity': event.severity.name,
                'source': event.source_ip,
                'destination': event.dest_ip,
                'description': event.message_type
            })
        
        return timeline


class WazuhValidator:
    """Validate Wazuh decoder and rule files"""
    
    @staticmethod
    def validate_xml(xml_file: str, xml_type: str) -> Tuple[bool, List[str]]:
        """Validate XML syntax and structure"""
        errors = []
        
        try:
            tree = ET.parse(xml_file)
            root = tree.getroot()
            
            if xml_type == 'decoder':
                errors.extend(WazuhValidator._validate_decoders(root))
            elif xml_type == 'rule':
                errors.extend(WazuhValidator._validate_rules(root))
            
        except ET.ParseError as e:
            errors.append(f"XML Syntax Error: {str(e)}")
        except Exception as e:
            errors.append(f"Validation Error: {str(e)}")
        
        return len(errors) == 0, errors
    
    @staticmethod
    def _validate_decoders(root: ET.Element) -> List[str]:
        """Validate decoder elements"""
        errors = []
        
        for decoder in root.findall('.//decoder'):
            name = decoder.get('name')
            if not name:
                errors.append("Decoder missing 'name' attribute")
            
            # Check for valid child elements
            valid_children = {'prematch', 'regex', 'order', 'parent', 'plugin_decoder', 'type'}
            for child in decoder:
                if child.tag not in valid_children:
                    errors.append(f"Unknown decoder child element: {child.tag}")
        
        logger.info(f"Decoder validation: {len(errors)} issues found")
        return errors
    
    @staticmethod
    def _validate_rules(root: ET.Element) -> List[str]:
        """Validate rule elements"""
        errors = []
        
        for rule in root.findall('.//rule'):
            rule_id = rule.get('id')
            level = rule.get('level')
            
            if not rule_id:
                errors.append("Rule missing 'id' attribute")
            if not level:
                errors.append(f"Rule {rule_id} missing 'level' attribute")
            
            # Validate level is numeric
            try:
                level_int = int(level) if level else None
                if level_int is not None and not (0 <= level_int <= 15):
                    errors.append(f"Rule {rule_id} has invalid level: {level}")
            except ValueError:
                errors.append(f"Rule {rule_id} has non-numeric level: {level}")
        
        logger.info(f"Rule validation: {len(errors)} issues found")
        return errors


class ReportGenerator:
    """Generate formatted reports"""
    
    @staticmethod
    def generate_html_report(report: Dict, output_file: str):
        """Generate HTML report"""
        logger.info(f"Generating HTML report: {output_file}")
        
        html_content = f"""
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Huawei Firewall Security Report</title>
            <style>
                body {{ font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }}
                .header {{ background-color: #d32f2f; color: white; padding: 20px; border-radius: 5px; }}
                .section {{ background-color: white; margin: 20px 0; padding: 20px; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }}
                table {{ width: 100%; border-collapse: collapse; margin: 10px 0; }}
                th, td {{ padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }}
                th {{ background-color: #f2f2f2; font-weight: bold; }}
                tr:hover {{ background-color: #f9f9f9; }}
                .critical {{ color: #d32f2f; font-weight: bold; }}
                .high {{ color: #f57c00; font-weight: bold; }}
                .medium {{ color: #fbc02d; }}
                .low {{ color: #388e3c; }}
                .stat-box {{ display: inline-block; margin: 10px; padding: 15px; background-color: #f2f2f2; border-radius: 5px; }}
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Huawei Firewall Security Analysis Report</h1>
                <p>Generated: {report['timestamp']}</p>
            </div>
            
            <div class="section">
                <h2>Executive Summary</h2>
                <div class="stat-box">Total Events: <strong>{report['total_events']}</strong></div>
                <div class="stat-box">Critical Alerts: <strong>{len(report['security_alerts'])}</strong></div>
                <div class="stat-box">Port Scan Attempts: <strong>{len(report['port_scan_activity'])}</strong></div>
                <div class="stat-box">DDoS Attacks: <strong>{len(report['ddos_attacks'])}</strong></div>
                <div class="stat-box">Malware Detected: <strong>{len(report['malware_alerts'])}</strong></div>
            </div>
            
            <div class="section">
                <h2>Event Distribution by Type</h2>
                <table>
                    <tr><th>Event Type</th><th>Count</th></tr>
                    {''.join(f'<tr><td>{k}</td><td>{v}</td></tr>' for k, v in report['event_count_by_type'].items())}
                </table>
            </div>
            
            <div class="section">
                <h2>Event Distribution by Severity</h2>
                <table>
                    <tr><th>Severity</th><th>Count</th></tr>
                    {''.join(f'<tr><td>{k}</td><td>{v}</td></tr>' for k, v in report['event_count_by_severity'].items())}
                </table>
            </div>
            
            <div class="section">
                <h2>Top Source IPs</h2>
                <table>
                    <tr><th>IP Address</th><th>Event Count</th></tr>
                    {''.join(f'<tr><td>{ip}</td><td>{count}</td></tr>' for ip, count in report['top_source_ips'])}
                </table>
            </div>
            
            <div class="section">
                <h2>Critical Security Alerts</h2>
                <table>
                    <tr><th>Timestamp</th><th>Severity</th><th>Description</th><th>Source</th></tr>
                    {''.join(f'<tr><td>{a["timestamp"]}</td><td class="{a["severity"].lower()}">{a["severity"]}</td><td>{a["description"]}</td><td>{a["source"]}</td></tr>' for a in report['security_alerts'][:20])}
                </table>
            </div>
        </body>
        </html>
        """
        
        with open(output_file, 'w') as f:
            f.write(html_content)
        
        logger.info(f"HTML report saved to {output_file}")
    
    @staticmethod
    def generate_json_report(report: Dict, output_file: str):
        """Generate JSON report"""
        with open(output_file, 'w') as f:
            json.dump(report, f, indent=2)
        logger.info(f"JSON report saved to {output_file}")


def main():
    parser = argparse.ArgumentParser(
        description='Huawei Firewall Log Analyzer & Wazuh Integration Tool',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog='''
Examples:
  %(prog)s --analyze logs.txt
  %(prog)s --validate-decoders decoders.xml
  %(prog)s --validate-rules rules.xml
  %(prog)s --generate-report logs.txt --output report.html
        ''')
    
    parser.add_argument('--analyze', type=str, help='Analyze log file')
    parser.add_argument('--validate-decoders', type=str, help='Validate decoder XML file')
    parser.add_argument('--validate-rules', type=str, help='Validate rule XML file')
    parser.add_argument('--generate-report', type=str, help='Generate security report from log file')
    parser.add_argument('--output', type=str, default='report.html', help='Output report file')
    parser.add_argument('--format', choices=['html', 'json'], default='html', help='Report format')
    
    args = parser.parse_args()
    
    if args.validate_decoders:
        is_valid, errors = WazuhValidator.validate_xml(args.validate_decoders, 'decoder')
        if is_valid:
            print(f"✓ Decoder validation passed!")
        else:
            print(f"✗ Decoder validation failed:")
            for error in errors:
                print(f"  - {error}")
        sys.exit(0 if is_valid else 1)
    
    if args.validate_rules:
        is_valid, errors = WazuhValidator.validate_xml(args.validate_rules, 'rule')
        if is_valid:
            print(f"✓ Rule validation passed!")
        else:
            print(f"✗ Rule validation failed:")
            for error in errors:
                print(f"  - {error}")
        sys.exit(0 if is_valid else 1)
    
    if args.analyze or args.generate_report:
        log_file = args.analyze or args.generate_report
        parser_obj = HuaweiLogParser()
        events = parser_obj.parse_log_file(log_file)
        
        if args.generate_report:
            analyzer = SecurityAnalyzer(events)
            report = analyzer.generate_report()
            
            if args.format == 'json':
                ReportGenerator.generate_json_report(report, args.output)
            else:
                ReportGenerator.generate_html_report(report, args.output)
            
            print(f"Report generated: {args.output}")
        else:
            # Print summary
            print(f"\n{'='*60}")
            print(f"HUAWEI LOG ANALYSIS SUMMARY")
            print(f"{'='*60}")
            print(f"Total Events: {len(events)}")
            print(f"Parse Errors: {parser_obj.parse_errors}")
            
            analyzer = SecurityAnalyzer(events)
            report = analyzer.generate_report()
            
            print(f"\nEvent Types: {json.dumps(report['event_count_by_type'], indent=2)}")
            print(f"\nSeverity Distribution: {json.dumps(report['event_count_by_severity'], indent=2)}")
            print(f"\nTop Source IPs: {report['top_source_ips']}")
            print(f"\nCritical Alerts: {len(report['security_alerts'])}")
    
    else:
        parser.print_help()


if __name__ == '__main__':
    main()
