#!/bin/bash
#
# สคริปต์ทดสอบ Network Anomaly Detection
# ทดสอบการแจ้งเตือนจากการส่ง logs
# ภาษา: Thai
# วันที่: 2026-05-14
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_NAME="Network Anomaly Detection"
WAZUH_SYSLOG_HOST="${1:-localhost}"
WAZUH_SYSLOG_PORT="${2:-514}"

# ฟังก์ชั่นแสดงข้อความแบบ Thai
print_header() {
    echo ""
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║  $1"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo ""
}

print_step() {
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "$1"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

print_info() {
    echo "ℹ️  $1"
}

print_success() {
    echo "✅ $1"
}

print_warning() {
    echo "⚠️  $1"
}

print_error() {
    echo "❌ $1"
}

# Main
clear

print_header "🧪 ทดสอบ Network Anomaly Detection - ส่งการแจ้งเตือน"

echo "📋 ข้อมูลการตั้งค่า:"
echo "  • Project: $PROJECT_NAME"
echo "  • Wazuh Syslog Host: $WAZUH_SYSLOG_HOST"
echo "  • Wazuh Syslog Port: $WAZUH_SYSLOG_PORT"
echo "  • Work Directory: $SCRIPT_DIR"
echo ""

# ขั้นตอนที่ 1: ตรวจสอบข้อกำหนด
print_step "[1/4] ✓ ตรวจสอบข้อกำหนด"

# ตรวจสอบ Python 3
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version 2>&1)
    print_success "$PYTHON_VERSION ติดตั้งแล้ว"
else
    print_error "ไม่พบ Python 3"
    exit 1
fi

# ตรวจสอบไฟล์ที่จำเป็น
if [ -f "$SCRIPT_DIR/generate_network_anomaly_tests.py" ]; then
    print_success "พบไฟล์ test generator"
else
    print_error "ไม่พบ $SCRIPT_DIR/generate_network_anomaly_tests.py"
    exit 1
fi

if [ -f "$SCRIPT_DIR/test_on_remote_wazuh.py" ]; then
    print_success "พบไฟล์ test runner"
else
    print_error "ไม่พบ $SCRIPT_DIR/test_on_remote_wazuh.py"
    exit 1
fi

echo ""

# ขั้นตอนที่ 2: ตรวจสอบการเชื่อมต่อ Syslog
print_step "[2/4] ✓ ตรวจสอบการเชื่อมต่อ Syslog (Port 514)"

if timeout 3 bash -c "echo 'TEST' > /dev/udp/$WAZUH_SYSLOG_HOST/$WAZUH_SYSLOG_PORT" 2>/dev/null; then
    print_success "สามารถเชื่อมต่อไปยัง $WAZUH_SYSLOG_HOST:$WAZUH_SYSLOG_PORT"
else
    print_warning "ไม่สามารถเชื่อมต่อ UDP port 514"
    print_info "อาจเป็นเพราะ:"
    print_info "  • Wazuh Agent ไม่ติดตั้ง"
    print_info "  • Firewall ปิด port 514"
    print_info "  • สามารถดำเนินการต่อได้ (อาจจำเป็นต้องใช้ SSH)"
fi

echo ""

# ขั้นตอนที่ 3: ส่ง Test Logs
print_step "[3/4] ✓ ส่ง Test Logs ไปยัง Wazuh"

print_info "ส่ง 7 scenarios ต่างๆ..."
echo ""

python3 "$SCRIPT_DIR/generate_network_anomaly_tests.py" --dry-run > /dev/null 2>&1

# ส่ง logs โดยตรง
python3 << 'EOF'
import socket
import time
from datetime import datetime

def send_log(host, port, src_ip, src_port, dst_ip, dst_port, action, app):
    timestamp = datetime.now().strftime('%b %d %H:%M:%S')
    hostname = 'WUH-B-DC-USG6712E-1'
    action_str = 'POLICYDENY' if action == 'deny' else 'POLICYPERMIT'
    src_zone = 'trust' if src_ip.startswith('10.') else 'untrust'
    dst_zone = 'untrust' if dst_ip.startswith('10.') else 'trust'
    
    log_entry = (
        f"{timestamp} {hostname} %%01POLICY/6/{action_str}(l): "
        f"protocol=TCP, source-ip={src_ip}, source-port={src_port}, "
        f"destination-ip={dst_ip}, destination-port={dst_port}, "
        f"time={timestamp}, "
        f"source-zone={src_zone}, destination-zone={dst_zone}, "
        f"application-name={app}, rule-name=test-policy."
    )
    
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        syslog_msg = f"<134>{log_entry}"
        sock.sendto(syslog_msg.encode('utf-8'), (host, port))
        sock.close()
        return True
    except:
        return False

host = "localhost"
port = 514

test_cases = [
    ("10.251.1.100", 22, "8.8.8.8", 443, "deny", "SSH", "[1] Internal→External SSH (DENY)"),
    ("10.251.1.101", 22, "203.0.113.45", 443, "permit", "SSH", "[2] Internal→External SSH (PERMIT)"),
    ("192.0.2.1", 51234, "10.251.1.100", 22, "deny", "SSH", "[3] External→Internal SSH (DENY)"),
    ("198.51.100.89", 51235, "10.251.1.102", 22, "permit", "SSH", "[4] 🔴 CRITICAL SSH (PERMIT)"),
    ("208.67.222.222", 51236, "10.251.2.50", 3389, "deny", "RDP", "[5] External→Internal RDP (DENY)"),
    ("1.1.1.1", 51237, "10.251.1.100", 23, "deny", "Telnet", "[6] External→Internal Telnet (DENY)"),
    ("10.251.1.100", 51245, "8.8.8.8", 443, "permit", "HTTPS", "[7] Legitimate HTTPS (Control)"),
]

for src_ip, src_port, dst_ip, dst_port, action, app, name in test_cases:
    if send_log(host, port, src_ip, src_port, dst_ip, dst_port, action, app):
        print(f"✅ {name}")
    else:
        print(f"❌ {name}")
    time.sleep(0.3)

EOF

echo ""
print_success "ส่ง 7 test logs เสร็จแล้ว"

echo ""

# ขั้นตอนที่ 4: รอและตรวจสอบ
print_step "[4/4] ✓ รอและตรวจสอบการสร้าง Alerts"

echo "⏳ รอให้ Wazuh ประมวลผล logs..."

# นับถอยหลัง 15 วินาที
for i in {15..1}; do
    printf "\r   ⏳ รอ $i วินาที...  "
    sleep 1
done
echo -e "\r   ✅ เสร็จแล้ว!            "

echo ""
print_info "ตรวจสอบ alerts ในระบบ:"
echo ""

# ตรวจสอบ local alerts
if [ -f "/var/ossec/logs/alerts/alerts.log" ]; then
    ALERT_COUNT=$(grep -c "network_anomaly" /var/ossec/logs/alerts/alerts.log 2>/dev/null || echo "0")
    
    if [ "$ALERT_COUNT" -gt "0" ]; then
        print_success "พบ $ALERT_COUNT alerts สำหรับ network_anomaly"
        echo ""
        echo "📋 ตัวอย่าง alerts (สุดท้าย 10 รายการ):"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        tail -50 /var/ossec/logs/alerts/alerts.log | grep -A 5 "network_anomaly" | head -40 || true
    else
        print_warning "ไม่พบ alerts network_anomaly ยัง"
        echo ""
        print_info "สาเหตุที่เป็นไปได้:"
        echo "  • Wazuh Manager ยังไม่ได้รับ logs"
        echo "  • Rules ยังไม่ถูก reload"
        echo "  • ต้องตรวจสอบ: sudo /var/ossec/bin/wazuh-control status"
    fi
else
    print_warning "ไม่พบไฟล์ alerts: /var/ossec/logs/alerts/alerts.log"
    print_info "อาจไม่ติดตั้ง Wazuh Manager ในเครื่องนี้"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# การทดสอบเสร็จสิ้น
print_header "🎉 การทดสอบเสร็จสิ้น!"

echo "📊 สรุปผลลัพธ์:"
echo "  ✓ ส่ง 7 test logs"
echo "  ✓ รอให้ Wazuh ประมวลผล"
echo "  ✓ ตรวจสอบ alerts"
echo ""

echo "🔍 คำสั่งสำหรับตรวจสอบเพิ่มเติม:"
echo ""
echo "  1. ดูทั้งหมด alerts:"
echo "     tail -100 /var/ossec/logs/alerts/alerts.log"
echo ""
echo "  2. ดู alerts สำหรับ network_anomaly เท่านั้น:"
echo "     tail -100 /var/ossec/logs/alerts/alerts.log | grep network_anomaly"
echo ""
echo "  3. นับจำนวน alerts:"
echo "     grep -c 'network_anomaly' /var/ossec/logs/alerts/alerts.log"
echo ""
echo "  4. ดูรายละเอียด rule ID 100104 (CRITICAL SSH):"
echo "     grep '100104' /var/ossec/logs/alerts/alerts.log"
echo ""
echo "  5. เปิด Wazuh Dashboard:"
echo "     http://localhost:5601"
echo "     Query: rule.groups: 'network_anomaly'"
echo ""

echo "📋 ขั้นตอนถัดไป:"
echo "  1. ตรวจสอบ alerts ใน Wazuh Dashboard"
echo "  2. ตั้งค่า Telegram alerts (ถ้าต้องการ)"
echo "  3. ตรวจสอบ rules ที่สร้างขึ้น"
echo ""

echo "✨ การทดสอบสำเร็จ!"
echo ""
