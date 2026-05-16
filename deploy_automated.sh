#!/bin/bash
# ติดตั้ง Network Anomaly Detection อัตโนมัติด้วย sshpass

# หมายเหตุ: Rules ต้องติดตั้งบน Master Node (10.251.151.11) ไม่ใช่ Indexer (10.251.151.13)
MANAGER_HOST="10.251.151.11"
MANAGER_USER="wazuh-user"
MANAGER_PASS="wazuh"
LOCAL_RULES="/opt/code/wazuh_ova/rules/1003-network-anomaly-rules.xml"

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  🚀 ติดตั้ง Network Anomaly Detection บน Wazuh Manager"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# ขั้นตอนที่ 1: อัปโหลด Rules
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "[1/3] ✓ อัปโหลด Rules ไป Manager"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if sshpass -p "$MANAGER_PASS" scp -o StrictHostKeyChecking=no \
    "$LOCAL_RULES" "$MANAGER_USER@$MANAGER_HOST:/tmp/"; then
    echo "✅ Rules file อัปโหลดเสร็จแล้ว"
else
    echo "❌ ไม่สามารถอัปโหลด rules file"
    exit 1
fi

echo ""

# ขั้นตอนที่ 2: ติดตั้ง
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "[2/3] ✓ ติดตั้ง Rules บน Manager"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

sshpass -p "$MANAGER_PASS" ssh -o StrictHostKeyChecking=no "$MANAGER_USER@$MANAGER_HOST" << 'INSTALL_COMMANDS'
echo "ℹ️  ย้าย rules ไป /var/ossec/etc/rules/"
sudo cp /tmp/1003-network-anomaly-rules.xml /var/ossec/etc/rules/

echo "ℹ️  ตั้งค่า Permissions..."
sudo chown root:ossec /var/ossec/etc/rules/1003-network-anomaly-rules.xml
sudo chmod 640 /var/ossec/etc/rules/1003-network-anomaly-rules.xml

echo "ℹ️  ตรวจสอบ Rules Count..."
RULE_COUNT=$(sudo grep -c '<rule id' /var/ossec/etc/rules/1003-network-anomaly-rules.xml)
echo "✅ พบ $RULE_COUNT rules"

echo "ℹ️  Restart Wazuh Manager..."
sudo /var/ossec/bin/wazuh-control restart

echo "✅ ติดตั้งเสร็จแล้ว"
INSTALL_COMMANDS

echo ""

# ขั้นตอนที่ 3: ตรวจสอบ
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "[3/3] ✓ ตรวจสอบการติดตั้ง"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

sshpass -p "$MANAGER_PASS" ssh -o StrictHostKeyChecking=no "$MANAGER_USER@$MANAGER_HOST" \
    "sudo grep -c '<rule id' /var/ossec/etc/rules/1003-network-anomaly-rules.xml 2>/dev/null" | \
    while read COUNT; do
        if [ "$COUNT" -gt "0" ]; then
            echo "✅ พบ $COUNT Network Anomaly Rules บน Manager"
        fi
    done

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  🎉 ติดตั้งเสร็จสิ้น!"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "📋 ขั้นตอนถัดไป:"
echo "  1. ทดสอบการส่ง logs:"
echo "     python3 /opt/code/wazuh_ova/test_complete_thai.py"
echo ""
echo "  2. ตรวจสอบ alerts:"
echo "     sshpass -p 'wazuh' ssh -o StrictHostKeyChecking=no root@10.251.151.13 'tail -50 /var/ossec/logs/alerts/alerts.log'"
echo ""

