#!/bin/bash
#
# สคริปต์ติดตั้ง Network Anomaly Detection บน Wazuh Manager (Remote)
# การดำเนินการ: ติดตั้งบน Wazuh server จริงและทดสอบการแจ้งเตือน
# วันที่: 2026-05-14
# ภาษา: Thai
#

set -e

# ข้อมูล Wazuh Server
# หมายเหตุ: Rules/Decoders ต้องติดตั้งบน Master Node (10.251.151.11)
# ไม่ใช่ Indexer (10.251.151.13)
WAZUH_SERVER="10.251.151.11"
WAZUH_USER="wazuh-user"
WAZUH_HOME="/var/ossec"

# ข้อมูลเฉพาะ
LOCAL_DIR="/opt/code/wazuh_ova"
REMOTE_RULES_DIR="$WAZUH_HOME/etc/rules"
REMOTE_SCRIPTS_DIR="$WAZUH_HOME/active-response/bin"
REMOTE_ALERTS_LOG="$WAZUH_HOME/logs/alerts/alerts.log"

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║   Network Anomaly Detection - ติดตั้งบน Wazuh Server จริง    ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "🔍 ข้อมูลการตั้งค่า:"
echo "  • Wazuh Server: $WAZUH_SERVER"
echo "  • User: $WAZUH_USER"
echo "  • Wazuh Home: $WAZUH_HOME"
echo "  • Rules Directory: $REMOTE_RULES_DIR"
echo ""

# ขั้นตอนที่ 1: ตรวจสอบการเชื่อมต่อ
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "[1/5] ✓ ตรวจสอบการเชื่อมต่อ SSH ไปยัง Wazuh Server"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if ssh -o ConnectTimeout=5 $WAZUH_USER@$WAZUH_SERVER "ls $WAZUH_HOME/etc/rules" &>/dev/null; then
    echo "✅ เชื่อมต่อ SSH สำเร็จ"
else
    echo "❌ ไม่สามารถเชื่อมต่อไปยัง $WAZUH_SERVER"
    echo "   ตรวจสอบ:"
    echo "   - IP address ถูกต้องหรือไม่"
    echo "   - SSH key หรือ password ถูกต้องหรือไม่"
    echo "   - Firewall ปล่อย port 22 หรือไม่"
    exit 1
fi

# ขั้นตอนที่ 2: อัปโหลด Rules
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "[2/5] ✓ อัปโหลด Detection Rules"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "กำลังอัปโหลด 1003-network-anomaly-rules.xml..."
scp "$LOCAL_DIR/rules/1003-network-anomaly-rules.xml" \
    $WAZUH_USER@$WAZUH_SERVER:$REMOTE_RULES_DIR/

# ตั้งค่า permissions
ssh $WAZUH_USER@$WAZUH_SERVER "chown root:ossec $REMOTE_RULES_DIR/1003-network-anomaly-rules.xml && \
                               chmod 640 $REMOTE_RULES_DIR/1003-network-anomaly-rules.xml"

echo "✅ Rules อัปโหลดสำเร็จ"

# ขั้นตอนที่ 3: อัปโหลด Scripts
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "[3/5] ✓ อัปโหลด Detector Scripts"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "กำลังอัปโหลด Python scripts..."
scp "$LOCAL_DIR/network_anomaly_detector.py" \
    $WAZUH_USER@$WAZUH_SERVER:$REMOTE_SCRIPTS_DIR/

scp "$LOCAL_DIR/telegram_network_alert.py" \
    $WAZUH_USER@$WAZUH_SERVER:$REMOTE_SCRIPTS_DIR/

# ตั้งค่า permissions
ssh $WAZUH_USER@$WAZUH_SERVER "chown root:ossec $REMOTE_SCRIPTS_DIR/network_anomaly_detector.py && \
                               chmod 750 $REMOTE_SCRIPTS_DIR/network_anomaly_detector.py && \
                               chown root:ossec $REMOTE_SCRIPTS_DIR/telegram_network_alert.py && \
                               chmod 750 $REMOTE_SCRIPTS_DIR/telegram_network_alert.py"

echo "✅ Scripts อัปโหลดสำเร็จ"

# ขั้นตอนที่ 4: ตรวจสอบ Rules
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "[4/5] ✓ ตรวจสอบ Rules"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

RULE_COUNT=$(ssh $WAZUH_USER@$WAZUH_SERVER "grep -c 'rule id=' $REMOTE_RULES_DIR/1003-network-anomaly-rules.xml")
echo "จำนวน Rules: $RULE_COUNT"

if [ "$RULE_COUNT" == "20" ]; then
    echo "✅ ทั้ง 20 rules ถูกโหลดสำเร็จ"
else
    echo "⚠️  ตรวจพบ $RULE_COUNT rules (ควรเป็น 20)"
fi

# ขั้นตอนที่ 5: Restart Wazuh Manager
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "[5/5] ✓ Restart Wazuh Manager"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "กำลัง restart Wazuh Manager..."
ssh $WAZUH_USER@$WAZUH_SERVER "$WAZUH_HOME/bin/wazuh-control restart"

echo "รอให้ Wazuh พร้อมใช้งาน... (10 วินาที)"
sleep 10

# ตรวจสอบสถานะ
STATUS=$(ssh $WAZUH_USER@$WAZUH_SERVER "$WAZUH_HOME/bin/wazuh-control status" 2>/dev/null || echo "")
if echo "$STATUS" | grep -q "running\|active"; then
    echo "✅ Wazuh Manager ทำงานแล้ว"
else
    echo "⚠️  ตรวจสอบสถานะ Wazuh"
    echo "$STATUS"
fi

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║            ✅ การติดตั้งเสร็จสมบูรณ์                          ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "🎯 ขั้นตอนถัดไป:"
echo "  1. ส่ง test logs:"
echo "     python3 $LOCAL_DIR/generate_network_anomaly_tests.py"
echo ""
echo "  2. ตรวจสอบ alerts:"
echo "     ssh $WAZUH_USER@$WAZUH_SERVER \"tail -50 $REMOTE_ALERTS_LOG | grep network_anomaly\""
echo ""
echo "  3. ตรวจสอบรายละเอียด alerts:"
echo "     ssh $WAZUH_USER@$WAZUH_SERVER \"tail -100 $REMOTE_ALERTS_LOG\""
echo ""
