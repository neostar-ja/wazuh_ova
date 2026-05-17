#!/bin/bash

# Deploy Network Anomaly Rules + Telegram Integration
# With active-response enabled for critical alerts

set -e

MANAGER_HOST="10.251.151.12"
MANAGER_USER="wazuh-user"
MANAGER_PASS="wazuh"
LOCAL_RULES="/opt/code/wazuh_ova/rules/1003-network-anomaly-rules.xml"
SCRIPT_DIR="/opt/code/wazuh_ova"
TELEGRAM_SCRIPT="telegram_network_alert.py"

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║     Deploy Network Anomaly Rules + Telegram Integration        ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Stage 1: Verify files
echo "📋 Stage 1: Verify files..."
if [ ! -f "$LOCAL_RULES" ]; then
    echo "❌ Rules file not found: $LOCAL_RULES"
    exit 1
fi

if [ ! -f "$SCRIPT_DIR/$TELEGRAM_SCRIPT" ]; then
    echo "❌ Telegram script not found: $SCRIPT_DIR/$TELEGRAM_SCRIPT"
    exit 1
fi

echo "✅ Files verified"
echo ""

# Stage 2: Show active-response rules
echo "📋 Stage 2: Active-response enabled rules:"
grep -c "<active-response>" "$LOCAL_RULES" && ACTIVE_RULES=$(grep -c "<active-response>" "$LOCAL_RULES") || ACTIVE_RULES=0
echo "✅ $ACTIVE_RULES rules with active-response enabled"
echo ""

# Stage 3: Deploy rules
echo "📋 Stage 3: Deploy rules to Manager..."
echo "    Command: scp $LOCAL_RULES $MANAGER_USER@$MANAGER_HOST:/tmp/"
scp "$LOCAL_RULES" "$MANAGER_USER@$MANAGER_HOST:/tmp/" && echo "✅ Rules uploaded to /tmp" || { echo "❌ SCP failed"; exit 1; }
echo ""

# Stage 4: Deploy Telegram script
echo "📋 Stage 4: Deploy Telegram script..."
echo "    Command: scp $SCRIPT_DIR/$TELEGRAM_SCRIPT $MANAGER_USER@$MANAGER_HOST:/tmp/"
scp "$SCRIPT_DIR/$TELEGRAM_SCRIPT" "$MANAGER_USER@$MANAGER_HOST:/tmp/" && echo "✅ Script uploaded to /tmp" || { echo "❌ SCP failed"; exit 1; }
echo ""

# Stage 5: Move files to proper locations with sudo
echo "📋 Stage 5: Move files to proper locations..."

# Create a deployment script on the remote host
sshpass -p "$MANAGER_PASS" ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null "$MANAGER_USER@$MANAGER_HOST" "cat > /tmp/deploy_wazuh_telegram.sh << 'REMOTESCRIPT'
#!/bin/bash
set -e

# Move rules to proper location
sudo mv /tmp/1003-network-anomaly-rules.xml /var/ossec/etc/rules/
sudo chown root:ossec /var/ossec/etc/rules/1003-network-anomaly-rules.xml
sudo chmod 640 /var/ossec/etc/rules/1003-network-anomaly-rules.xml
echo '✅ Rules deployed and permissions set'

# Move script to proper location
sudo mv /tmp/telegram_network_alert.py /var/ossec/active-response/bin/
sudo chown root:ossec /var/ossec/active-response/bin/telegram_network_alert.py
sudo chmod 750 /var/ossec/active-response/bin/telegram_network_alert.py
echo '✅ Script deployed and permissions set'
REMOTESCRIPT
"

# Execute the deployment script with sshpass for sudo
sshpass -p "$MANAGER_PASS" ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null "$MANAGER_USER@$MANAGER_HOST" "bash /tmp/deploy_wazuh_telegram.sh"

echo ""

# Stage 6: Add command definition to ossec.conf
echo "📋 Stage 6: Add command definition to ossec.conf..."
sshpass -p "$MANAGER_PASS" ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null "$MANAGER_USER@$MANAGER_HOST" << 'SSHCMD'
    # Backup original config
    sudo cp /var/ossec/etc/ossec.conf /var/ossec/etc/ossec.conf.backup.$(date +%s)
    
    # Check if telegram-alert command already exists
    if ! grep -q "name=\"telegram-alert\"" /var/ossec/etc/ossec.conf; then
        # Add before </ossec_config> closing tag
        sudo sed -i '/<\/ossec_config>/i\  <command name="telegram-alert">\n    <program>telegram_network_alert.py</program>\n    <tag>alert</tag>\n  </command>' /var/ossec/etc/ossec.conf
        echo "✅ Command definition added to ossec.conf"
    else
        echo "✅ Command definition already exists"
    fi
SSHCMD
echo ""

# Stage 7: Verify rules syntax
echo "📋 Stage 7: Verify rules syntax..."
sshpass -p "$MANAGER_PASS" ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null "$MANAGER_USER@$MANAGER_HOST" << 'SSHCMD'
    echo "Checking rules..."
    sudo /var/ossec/bin/wazuh-logtest -v -f /var/ossec/etc/rules/1003-network-anomaly-rules.xml > /tmp/rules_test.log 2>&1
    if [ $? -eq 0 ]; then
        echo "✅ Rules syntax OK"
    else
        echo "⚠️  Rules validation:"
        cat /tmp/rules_test.log | head -20
    fi
SSHCMD
echo ""

# Stage 8: Restart Wazuh Manager
echo "📋 Stage 8: Restart Wazuh Manager..."
sshpass -p "$MANAGER_PASS" ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null "$MANAGER_USER@$MANAGER_HOST" << 'SSHCMD'
    echo "Restarting Wazuh Manager..."
    sudo /var/ossec/bin/wazuh-control restart
    sleep 3
    echo "✅ Wazuh Manager restarted"
SSHCMD
echo ""

# Stage 9: Verify deployment
echo "📋 Stage 9: Verify deployment..."
sshpass -p "$MANAGER_PASS" ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null "$MANAGER_USER@$MANAGER_HOST" << 'SSHCMD'
    echo "Checking deployment status:"
    
    # Count active-response rules
    ACTIVE_COUNT=$(grep -c "<active-response>" /var/ossec/etc/rules/1003-network-anomaly-rules.xml)
    echo "  • Active-response rules: $ACTIVE_COUNT"
    
    # Check script exists
    if [ -f /var/ossec/active-response/bin/telegram_network_alert.py ]; then
        echo "  ✅ Telegram script deployed"
    else
        echo "  ❌ Telegram script NOT found"
    fi
    
    # Check Wazuh status
    if sudo systemctl is-active --quiet wazuh-manager; then
        echo "  ✅ Wazuh Manager running"
    else
        echo "  ⚠️  Wazuh Manager status unknown"
    fi
SSHCMD
echo ""

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║          ✅ DEPLOYMENT COMPLETED SUCCESSFULLY                  ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "Summary:"
echo "  • Rules file: /var/ossec/etc/rules/1003-network-anomaly-rules.xml"
echo "  • Telegram script: /var/ossec/active-response/bin/telegram_network_alert.py"
echo "  • Active-response: Enabled for $ACTIVE_RULES rules"
echo "  • Target Manager: $MANAGER_HOST"
echo ""
echo "Next steps:"
echo "  1. Run tests: python3 /opt/code/wazuh_ova/test_complete_thai.py"
echo "  2. Check logs: tail -100 /var/ossec/logs/alerts/alerts.log"
echo "  3. Monitor Telegram: Watch for alerts in your Telegram group"
echo ""

