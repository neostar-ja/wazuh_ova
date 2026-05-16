#!/usr/bin/env python3
"""
Huawei Firewall Test Log Sender
Sends sample Huawei logs to Wazuh syslog port for testing
"""

import socket
import time
import sys
from datetime import datetime

def send_syslog(host, port, messages):
    """
    Send messages to syslog server (Wazuh)
    """
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    
    sent_count = 0
    for message in messages:
        try:
            # RFC 3164 format: <PRI>TAG: MESSAGE
            # Priority: LOCAL0 (16) * 8 + INFO (6) = 134
            syslog_msg = f"<134>Huawei-Firewall: {message}"
            
            sock.sendto(syslog_msg.encode('utf-8'), (host, port))
            sent_count += 1
            
            print(f"✓ [{sent_count}] Sent: {message[:60]}...")
            time.sleep(0.1)  # Small delay between messages
            
        except Exception as e:
            print(f"✗ Error sending message: {e}")
    
    sock.close()
    return sent_count

def read_sample_logs(filepath):
    """
    Read sample Huawei logs from file
    """
    logs = []
    try:
        with open(filepath, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#'):
                    logs.append(line)
    except FileNotFoundError:
        print(f"Error: File not found: {filepath}")
        sys.exit(1)
    
    return logs

def main():
    """
    Main function
    """
    # Configuration
    wazuh_host = "10.251.151.12"
    wazuh_port = 514
    sample_file = "/opt/code/wazuh_ova/samples/huawei_firewall_sample_logs.txt"
    
    print("=" * 60)
    print("Huawei Firewall Test Log Sender")
    print("=" * 60)
    print(f"Target: {wazuh_host}:{wazuh_port}")
    print(f"Sample logs: {sample_file}")
    print()
    
    # Read sample logs
    print("📋 Reading sample logs...")
    logs = read_sample_logs(sample_file)
    print(f"✓ Loaded {len(logs)} sample logs")
    print()
    
    # Send logs
    print("📤 Sending test logs to Wazuh...")
    print("-" * 60)
    try:
        sent = send_syslog(wazuh_host, wazuh_port, logs)
        print("-" * 60)
        print(f"✓ Successfully sent {sent} test logs")
    except ConnectionRefusedError:
        print("✗ Connection refused. Is Wazuh syslog receiver running?")
        sys.exit(1)
    except Exception as e:
        print(f"✗ Error: {e}")
        sys.exit(1)
    
    print()
    print("✓ Test completed!")
    print(f"Check Wazuh dashboard at: https://10.251.151.14")
    print(f"Look for events with decoder: huawei-usg")

if __name__ == "__main__":
    main()
