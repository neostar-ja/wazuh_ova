#!/usr/bin/env python3
"""
ทดสอบ Network Anomaly Detection แบบสมบูรณ์
- ส่ง test logs 
- ตรวจสอบการสร้าง alerts
- แสดงผลลัพธ์
ภาษา: Thai
"""

import socket
import json
import time
import sys
from datetime import datetime
from pathlib import Path

class WazuhAnomalyTester:
    """ทดสอบ Network Anomaly Detection"""
    
    def __init__(self, syslog_host='localhost', syslog_port=514):
        self.syslog_host = syslog_host
        self.syslog_port = syslog_port
        self.alerts_log = '/var/ossec/logs/alerts/alerts.log'
        self.test_results = {}
    
    def create_huawei_log(self, src_ip, src_port, dst_ip, dst_port, action, app):
        """สร้าง Huawei USG log entry"""
        timestamp = datetime.now().strftime('%b %d %H:%M:%S')
        hostname = 'WUH-B-DC-USG6712E-1'
        action_str = 'POLICYDENY' if action == 'deny' else 'POLICYPERMIT'
        src_zone = 'trust' if src_ip.startswith('10.') else 'untrust'
        dst_zone = 'untrust' if dst_ip.startswith('10.') else 'trust'
        
        return (
            f"{timestamp} {hostname} %%01POLICY/6/{action_str}(l): "
            f"protocol=TCP, source-ip={src_ip}, source-port={src_port}, "
            f"destination-ip={dst_ip}, destination-port={dst_port}, "
            f"time={timestamp}, "
            f"source-zone={src_zone}, destination-zone={dst_zone}, "
            f"application-name={app}, rule-name=test-policy."
        )
    
    def send_test_logs(self):
        """ส่ง test logs ไปยัง Wazuh syslog"""
        
        print("\n" + "="*70)
        print("📤 ส่ง Test Logs ไปยัง Wazuh Syslog")
        print("="*70 + "\n")
        
        test_cases = [
            {
                'name': '[1] ภายในไปภายนอก SSH (BLOCKED)',
                'src': '10.251.1.100', 'sport': 22,
                'dst': '8.8.8.8', 'dport': 443,
                'action': 'deny', 'app': 'SSH'
            },
            {
                'name': '[2] ภายในไปภายนอก SSH (ALLOWED)',
                'src': '10.251.1.101', 'sport': 22,
                'dst': '203.0.113.45', 'dport': 443,
                'action': 'permit', 'app': 'SSH'
            },
            {
                'name': '[3] ภายนอกเข้าภายใน SSH (BLOCKED)',
                'src': '192.0.2.1', 'sport': 51234,
                'dst': '10.251.1.100', 'dport': 22,
                'action': 'deny', 'app': 'SSH'
            },
            {
                'name': '[4] 🔴 CRITICAL: ภายนอก→ภายใน SSH (ALLOWED)',
                'src': '198.51.100.89', 'sport': 51235,
                'dst': '10.251.1.102', 'dport': 22,
                'action': 'permit', 'app': 'SSH'
            },
            {
                'name': '[5] ภายนอกเข้าภายใน RDP (BLOCKED)',
                'src': '208.67.222.222', 'sport': 51236,
                'dst': '10.251.2.50', 'dport': 3389,
                'action': 'deny', 'app': 'RDP'
            },
            {
                'name': '[6] ภายนอกเข้าภายใน Telnet (BLOCKED)',
                'src': '1.1.1.1', 'sport': 51237,
                'dst': '10.251.1.100', 'dport': 23,
                'action': 'deny', 'app': 'Telnet'
            },
            {
                'name': '[7] Legitimate HTTPS (Control)',
                'src': '10.251.1.100', 'sport': 51245,
                'dst': '8.8.8.8', 'dport': 443,
                'action': 'permit', 'app': 'HTTPS'
            },
        ]
        
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        sent = 0
        
        for case in test_cases:
            try:
                log = self.create_huawei_log(
                    case['src'], case['sport'],
                    case['dst'], case['dport'],
                    case['action'], case['app']
                )
                
                syslog_msg = f"<134>{log}"
                sock.sendto(syslog_msg.encode('utf-8'), (self.syslog_host, self.syslog_port))
                
                print(f"✅ {case['name']}")
                print(f"   {case['src']}:{case['sport']} → {case['dst']}:{case['dport']} ({case['action'].upper()})\n")
                
                sent += 1
                time.sleep(0.3)
                
            except Exception as e:
                print(f"❌ {case['name']}")
                print(f"   Error: {str(e)}\n")
        
        sock.close()
        print(f"📊 ส่งทั้งหมด {sent} logs สำเร็จ!\n")
        return sent

    def wait_for_processing(self, seconds=20):
        """รอให้ Wazuh ประมวลผล logs"""
        print("="*70)
        print(f"⏳ รอให้ Wazuh ประมวลผล ({seconds} วินาที)")
        print("="*70 + "\n")
        
        for i in range(seconds, 0, -1):
            print(f"\r   เวลาที่เหลือ: {i:2d} วินาที...", end="", flush=True)
            time.sleep(1)
        
        print(f"\r   ✅ เสร็จแล้ว!              \n")

    def check_alerts(self):
        """ตรวจสอบ alerts ที่ถูกสร้าง"""
        print("="*70)
        print("🔍 ตรวจสอบ Alerts ที่ถูกสร้าง")
        print("="*70 + "\n")
        
        alerts_file = Path(self.alerts_log)
        
        if not alerts_file.exists():
            print("⚠️  ไม่พบไฟล์ logs: /var/ossec/logs/alerts/alerts.log")
            print("   สาเหตุ:")
            print("   - Wazuh Manager ไม่ติดตั้งในเครื่องนี้")
            print("   - ต้องใช้ SSH เพื่อตรวจสอบบน remote server\n")
            return []
        
        try:
            # อ่าน logs
            with open(alerts_file, 'r') as f:
                lines = f.readlines()
            
            # ตรวจหา network_anomaly alerts
            anomaly_alerts = []
            for line in lines[-300:]:  # ตรวจ 300 บรรทัดล่าสุด
                try:
                    if line.strip() and '{' in line:
                        json_part = line[line.index('{'):]
                        alert = json.loads(json_part)
                        
                        if 'rule' in alert:
                            rule = alert['rule']
                            if 'network_anomaly' in rule.get('groups', []) or \
                               (100090 <= rule.get('id', 0) <= 100109):
                                anomaly_alerts.append(alert)
                except:
                    pass
            
            # แสดงผล
            if anomaly_alerts:
                print(f"✅ พบ {len(anomaly_alerts)} Network Anomaly Alerts:\n")
                
                for i, alert in enumerate(anomaly_alerts[-10:], 1):  # แสดง 10 อันสุดท้าย
                    rule = alert.get('rule', {})
                    data = alert.get('data', {})
                    
                    severity = 'CRITICAL' if rule.get('level', 0) >= 8 else \
                              'HIGH' if rule.get('level', 0) >= 6 else 'MEDIUM'
                    
                    print(f"[{i}] Rule ID: {rule.get('id')} | Severity: {severity}")
                    print(f"    Description: {rule.get('description')[:60]}...")
                    print(f"    Source: {data.get('srcip')}:{data.get('srcport', 'N/A')}")
                    print(f"    Destination: {data.get('dstip')}:{data.get('dstport', 'N/A')}")
                    print()
                
                return anomaly_alerts
            else:
                print("⚠️  ไม่พบ Network Anomaly Alerts ยัง")
                print("   สาเหตุ:")
                print("   - Wazuh ยังไม่ได้รับ logs")
                print("   - Rules ยังไม่ถูก reload")
                print("   - ต้องตรวจสอบ: sudo /var/ossec/bin/wazuh-control status\n")
                
                # แสดง recent alerts ทั้งหมด
                print("📋 Alerts ล่าสุดทั้งหมด:")
                with open(alerts_file, 'r') as f:
                    recent_lines = f.readlines()[-20:]
                
                for line in recent_lines:
                    if line.strip():
                        print(f"   {line.strip()[:80]}...")
                
                return []
        
        except Exception as e:
            print(f"❌ Error: {str(e)}\n")
            return []

    def print_summary(self, sent_logs, alerts_found):
        """แสดงสรุปผลการทดสอบ"""
        print("\n" + "="*70)
        print("📊 สรุปผลการทดสอบ")
        print("="*70 + "\n")
        
        print(f"✓ Logs ที่ส่ง: {sent_logs} logs")
        print(f"✓ Alerts ที่พบ: {len(alerts_found)} alerts")
        
        if alerts_found:
            print(f"✓ Success Rate: {len(alerts_found)/sent_logs*100:.0f}%")
        
        print()
        print("📋 คำสั่งสำหรับตรวจสอบเพิ่มเติม:")
        print()
        print("  1. ดู Alerts ทั้งหมด:")
        print("     tail -100 /var/ossec/logs/alerts/alerts.log")
        print()
        print("  2. ดู Network Anomaly Alerts:")
        print("     tail -100 /var/ossec/logs/alerts/alerts.log | grep 'network_anomaly'")
        print()
        print("  3. นับจำนวน Alerts:")
        print("     grep -c '100090\\|100091\\|100092' /var/ossec/logs/alerts/alerts.log")
        print()
        print("  4. ตรวจสอบสถานะ Wazuh:")
        print("     sudo /var/ossec/bin/wazuh-control status")
        print()
        print("  5. Restart Wazuh:")
        print("     sudo /var/ossec/bin/wazuh-control restart")
        print()

    def run(self):
        """รัน test ทั้งหมด"""
        print("\n" + "╔" + "="*68 + "╗")
        print("║" + " "*15 + "🧪 ทดสอบ Network Anomaly Detection" + " "*17 + "║")
        print("╚" + "="*68 + "╝")
        
        # ส่ง logs
        sent = self.send_test_logs()
        
        if sent == 0:
            print("❌ ไม่สามารถส่ง logs")
            return False
        
        # รอประมวลผล
        self.wait_for_processing(20)
        
        # ตรวจสอบ alerts
        alerts = self.check_alerts()
        
        # แสดงสรุป
        self.print_summary(sent, alerts)
        
        print("\n" + "="*70)
        print("✅ การทดสอบเสร็จสิ้น!")
        print("="*70 + "\n")
        
        return True


if __name__ == "__main__":
    tester = WazuhAnomalyTester()
    success = tester.run()
    sys.exit(0 if success else 1)
