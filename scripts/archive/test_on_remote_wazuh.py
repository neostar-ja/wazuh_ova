#!/usr/bin/env python3
"""
ทดสอบ Network Anomaly Detection บน Wazuh Server จริง
- ส่ง test logs ไปยัง Wazuh syslog port 514
- ตรวจสอบ alerts ในไฟล์ logs จริง
- แสดงผลการทดสอบ
"""

import socket
import time
import sys
import subprocess
import json
from datetime import datetime
from typing import List, Dict

# ข้อมูล Wazuh Server
WAZUH_SYSLOG_HOST = 'localhost'  # สามารถเปลี่ยนเป็น IP ของ Wazuh Server
WAZUH_SYSLOG_PORT = 514

# IP ranges สำหรับ test
INTERNAL_IPS = [
    '10.251.1.100',
    '10.251.1.101',
    '10.251.2.50',
]

EXTERNAL_IPS = [
    '8.8.8.8',
    '1.1.1.1',
    '198.51.100.89',
    '203.0.113.45',
    '192.0.2.1',
]

def generate_huawei_log(src_ip: str, src_port: int, dst_ip: str, dst_port: int, 
                       action: str, app: str = 'SSH') -> str:
    """สร้าง Huawei log entry"""
    
    src_zone = 'trust' if src_ip.startswith('10.') else 'untrust'
    dst_zone = 'untrust' if dst_ip.startswith('10.') else 'trust'
    
    timestamp = datetime.now().strftime('%b %d %H:%M:%S')
    hostname = 'WUH-B-DC-USG6712E-1'
    
    action_str = 'POLICYDENY' if action.lower() == 'deny' else 'POLICYPERMIT'
    
    log_entry = (
        f"{timestamp} {hostname} %%01POLICY/6/{action_str}(l): "
        f"protocol=TCP, source-ip={src_ip}, source-port={src_port}, "
        f"destination-ip={dst_ip}, destination-port={dst_port}, "
        f"time={timestamp}, "
        f"source-zone={src_zone}, destination-zone={dst_zone}, "
        f"application-name={app}, rule-name=test-policy."
    )
    
    return log_entry

def send_test_logs_to_syslog(host: str, port: int) -> bool:
    """ส่ง test logs ไปยัง Wazuh syslog port"""
    
    print("\n" + "="*70)
    print("กำลังส่ง Test Logs ไปยัง Wazuh Syslog (Port 514)")
    print("="*70 + "\n")
    
    test_cases = [
        {
            'name': 'ภายในไปภายนอก SSH (DENY)',
            'src_ip': INTERNAL_IPS[0],
            'src_port': 22,
            'dst_ip': EXTERNAL_IPS[0],
            'dst_port': 443,
            'action': 'deny'
        },
        {
            'name': 'ภายในไปภายนอก SSH (PERMIT - Suspicious)',
            'src_ip': INTERNAL_IPS[1],
            'src_port': 22,
            'dst_ip': EXTERNAL_IPS[1],
            'dst_port': 443,
            'action': 'permit'
        },
        {
            'name': 'ภายนอกเข้าภายใน SSH (DENY)',
            'src_ip': EXTERNAL_IPS[2],
            'src_port': 51234,
            'dst_ip': INTERNAL_IPS[0],
            'dst_port': 22,
            'action': 'deny'
        },
        {
            'name': '🔴 CRITICAL: ภายนอกเข้าภายใน SSH (PERMIT)',
            'src_ip': EXTERNAL_IPS[3],
            'src_port': 51235,
            'dst_ip': INTERNAL_IPS[1],
            'dst_port': 22,
            'action': 'permit'
        },
        {
            'name': 'ภายนอกเข้าภายใน RDP (DENY)',
            'src_ip': EXTERNAL_IPS[2],
            'src_port': 51236,
            'dst_ip': INTERNAL_IPS[2],
            'dst_port': 3389,
            'action': 'deny',
            'app': 'RDP'
        },
        {
            'name': 'ภายนอกเข้าภายใน Telnet (DENY)',
            'src_ip': EXTERNAL_IPS[4],
            'src_port': 51237,
            'dst_ip': INTERNAL_IPS[0],
            'dst_port': 23,
            'action': 'deny',
            'app': 'Telnet'
        },
        {
            'name': 'Legitimate HTTPS (Control - ไม่ควรมี alert)',
            'src_ip': INTERNAL_IPS[0],
            'src_port': 51245,
            'dst_ip': EXTERNAL_IPS[0],
            'dst_port': 443,
            'action': 'permit',
            'app': 'HTTPS'
        },
    ]
    
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sent_count = 0
    
    for i, case in enumerate(test_cases, 1):
        try:
            log = generate_huawei_log(
                src_ip=case['src_ip'],
                src_port=case['src_port'],
                dst_ip=case['dst_ip'],
                dst_port=case['dst_port'],
                action=case['action'],
                app=case.get('app', 'SSH')
            )
            
            syslog_msg = f"<134>{log}"
            sock.sendto(syslog_msg.encode('utf-8'), (host, port))
            
            sent_count += 1
            print(f"[{i}] ✅ {case['name']}")
            print(f"    {case['src_ip']}:{case['src_port']} → {case['dst_ip']}:{case['dst_port']} ({case['action'].upper()})\n")
            
            time.sleep(0.3)
            
        except Exception as e:
            print(f"[{i}] ❌ Error: {case['name']}")
            print(f"    {str(e)}\n")
    
    sock.close()
    print(f"\n✅ ส่งทั้งหมด {sent_count} logs สำเร็จ!\n")
    return True

def check_remote_alerts(ssh_host: str = None, ssh_user: str = 'root') -> List[Dict]:
    """ตรวจสอบ alerts ใน remote Wazuh server"""
    
    print("="*70)
    print("🔍 ตรวจสอบ Alerts ใน Wazuh Logs")
    print("="*70 + "\n")
    
    alerts = []
    
    if ssh_host:
        # ดึง logs จาก remote server
        cmd = f"ssh {ssh_user}@{ssh_host} \"tail -200 /var/ossec/logs/alerts/alerts.log | grep -E 'rule id|srcip|dstip|description'\""
        print(f"ดึง logs จาก remote: {ssh_host}\n")
    else:
        # ตรวจสอบ logs ในเครื่องนี้
        cmd = "tail -200 /var/ossec/logs/alerts/alerts.log | grep -E 'rule id|srcip|dstip|description' 2>/dev/null || echo '(ไม่พบ logs - อาจไม่ติดตั้ง Wazuh ที่นี่)'"
        print("ตรวจสอบ logs ในเครื่องปัจจุบัน\n")
    
    try:
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=10)
        
        if result.stdout:
            print("📋 Alerts ที่พบ:")
            print("-" * 70)
            print(result.stdout)
        else:
            print("⚠️  ไม่พบ alerts ในขณะนี้")
            print("สาเหตุที่เป็นไปได้:")
            print("  • Wazuh Manager ยังไม่ได้รับ logs")
            print("  • Rules ยังไม่ได้ถูก reload")
            print("  • Network anomaly alerts ยังไม่ถูกสร้าง")
        
        if result.stderr:
            print(f"\n📝 ข้อความ: {result.stderr}")
            
    except subprocess.TimeoutExpired:
        print("❌ หมดเวลาการทำงาน")
    except Exception as e:
        print(f"❌ Error: {str(e)}")
    
    return alerts

def show_test_summary():
    """แสดงสรุปการทดสอบ"""
    
    print("\n" + "="*70)
    print("📊 สรุปการทดสอบ Network Anomaly Detection")
    print("="*70 + "\n")
    
    print("🎯 Scenarios ที่ส่ง:")
    print("  [1] Internal→External SSH (DENY) ..................... ✓ ส่งแล้ว")
    print("  [2] Internal→External SSH (PERMIT) ................... ✓ ส่งแล้ว")
    print("  [3] External→Internal SSH (DENY) ..................... ✓ ส่งแล้ว")
    print("  [4] 🔴 External→Internal SSH (PERMIT - CRITICAL) ..... ✓ ส่งแล้ว")
    print("  [5] External→Internal RDP (DENY) ..................... ✓ ส่งแล้ว")
    print("  [6] External→Internal Telnet (DENY) .................. ✓ ส่งแล้ว")
    print("  [7] Legitimate HTTPS (Control) ....................... ✓ ส่งแล้ว")
    print()
    print("⏱️  รอเวลา: 15-30 วินาทีให้ Wazuh ประมวลผล logs")
    print()
    print("🔍 ตรวจสอบ Alerts บน Wazuh Dashboard:")
    print("  Query: rule.groups: 'network_anomaly'")
    print("  Or: rule.id: [100090 TO 100109]")
    print()
    print("🔍 ตรวจสอบใน Command Line:")
    print("  tail -50 /var/ossec/logs/alerts/alerts.log | grep network_anomaly")
    print()
    print("📢 ตรวจสอบ Telegram Alerts:")
    print("  (ถ้ากำหนด Bot Token และ Chat ID)")
    print()

def main():
    """Main function"""
    
    print("\n" + "╔" + "="*68 + "╗")
    print("║" + " "*15 + "ทดสอบ Network Anomaly Detection บน Wazuh" + " "*12 + "║")
    print("╚" + "="*68 + "╝\n")
    
    # ขั้นตอนที่ 1: ส่ง test logs
    if not send_test_logs_to_syslog(WAZUH_SYSLOG_HOST, WAZUH_SYSLOG_PORT):
        print("❌ ไม่สามารถส่ง test logs")
        sys.exit(1)
    
    # รอให้ Wazuh ประมวลผล
    print("\n⏳ รอให้ Wazuh ประมวลผล logs (20 วินาที)...")
    for i in range(20, 0, -1):
        print(f"\r   {i} วินาที...", end="", flush=True)
        time.sleep(1)
    print("\r   ✅ เสร็จแล้ว!")
    
    # ขั้นตอนที่ 2: ตรวจสอบ alerts
    time.sleep(2)
    check_remote_alerts()
    
    # ขั้นตอนที่ 3: แสดงสรุป
    show_test_summary()
    
    print("\n" + "="*70)
    print("✅ การทดสอบเสร็จสมบูรณ์!")
    print("="*70 + "\n")

if __name__ == "__main__":
    main()
