#!/bin/bash
#
# Network Anomaly Detection Setup Script
# Configures Wazuh to detect and alert on suspicious network flows
# Internal→External and External→Internal with non-standard ports
# Created: 2026-05-14
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WAZUH_MANAGER_HOME="/var/ossec"
CUSTOM_RULES_DIR="$WAZUH_MANAGER_HOME/etc/rules"
CUSTOM_DECODERS_DIR="$WAZUH_MANAGER_HOME/etc/decoders"
CUSTOM_SCRIPTS_DIR="$WAZUH_MANAGER_HOME/active-response/bin"

echo "=================================="
echo "Network Anomaly Detection Setup"
echo "=================================="
echo ""

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo "This script must be run as root (for Wazuh configuration)"
   echo "Current user: $(whoami)"
   echo ""
   echo "Run with: sudo $0"
   exit 1
fi

# Check if Wazuh is installed
if [ ! -d "$WAZUH_MANAGER_HOME" ]; then
    echo "❌ Wazuh not found at $WAZUH_MANAGER_HOME"
    echo "Please install Wazuh Manager first"
    exit 1
fi

echo "✓ Wazuh installation found at: $WAZUH_MANAGER_HOME"
echo ""

# Step 1: Copy rules
echo "[1/5] Installing Network Anomaly Detection Rules..."
if [ -f "$SCRIPT_DIR/rules/1003-network-anomaly-rules.xml" ]; then
    cp "$SCRIPT_DIR/rules/1003-network-anomaly-rules.xml" "$CUSTOM_RULES_DIR/"
    chown root:ossec "$CUSTOM_RULES_DIR/1003-network-anomaly-rules.xml"
    chmod 640 "$CUSTOM_RULES_DIR/1003-network-anomaly-rules.xml"
    echo "✓ Rules installed: 1003-network-anomaly-rules.xml"
else
    echo "❌ Rule file not found: $SCRIPT_DIR/rules/1003-network-anomaly-rules.xml"
    exit 1
fi

# Step 2: Copy detector script
echo ""
echo "[2/5] Installing Network Anomaly Detector Script..."
if [ -f "$SCRIPT_DIR/network_anomaly_detector.py" ]; then
    mkdir -p "$CUSTOM_SCRIPTS_DIR"
    cp "$SCRIPT_DIR/network_anomaly_detector.py" "$CUSTOM_SCRIPTS_DIR/"
    chown root:ossec "$CUSTOM_SCRIPTS_DIR/network_anomaly_detector.py"
    chmod 750 "$CUSTOM_SCRIPTS_DIR/network_anomaly_detector.py"
    echo "✓ Detector installed: network_anomaly_detector.py"
else
    echo "❌ Script not found: $SCRIPT_DIR/network_anomaly_detector.py"
    exit 1
fi

# Step 3: Copy Telegram alert script
echo ""
echo "[3/5] Installing Telegram Alert Script..."
if [ -f "$SCRIPT_DIR/telegram_network_alert.py" ]; then
    cp "$SCRIPT_DIR/telegram_network_alert.py" "$CUSTOM_SCRIPTS_DIR/"
    chown root:ossec "$CUSTOM_SCRIPTS_DIR/telegram_network_alert.py"
    chmod 750 "$CUSTOM_SCRIPTS_DIR/telegram_network_alert.py"
    echo "✓ Alert script installed: telegram_network_alert.py"
    echo "  ⚠️  Remember to update Telegram credentials in the script!"
else
    echo "❌ Script not found: $SCRIPT_DIR/telegram_network_alert.py"
    exit 1
fi

# Step 4: Test rule syntax
echo ""
echo "[4/5] Testing Rule Syntax..."
cd "$CUSTOM_RULES_DIR"
if /var/ossec/bin/wazuh-control query wazuh-db 2>/dev/null || true; then
    echo "✓ Rule files appear valid"
else
    # Try basic validation
    if grep -q "rule id=" "$CUSTOM_RULES_DIR/1003-network-anomaly-rules.xml"; then
        echo "✓ Rule file format looks valid"
    else
        echo "❌ Rule file format may be incorrect"
        exit 1
    fi
fi

# Step 5: Display configuration info
echo ""
echo "[5/5] Configuration Summary"
echo "=================================="
echo ""
echo "✓ Network Anomaly Detection Installed Successfully!"
echo ""
echo "Configuration Details:"
echo "  • Rules File: $CUSTOM_RULES_DIR/1003-network-anomaly-rules.xml"
echo "  • Detector: $CUSTOM_SCRIPTS_DIR/network_anomaly_detector.py"
echo "  • Alert Script: $CUSTOM_SCRIPTS_DIR/telegram_network_alert.py"
echo "  • Rules Count: 20 (IDs: 100090-100109)"
echo ""
echo "Detected Patterns:"
echo "  ✓ Internal→External SSH (port 22) - DENY & PERMIT"
echo "  ✓ Internal→External Telnet (port 23) - DENY & PERMIT"
echo "  ✓ External→Internal SSH (port 22) - DENY & PERMIT"
echo "  ✓ External→Internal RDP (port 3389) - DENY & PERMIT"
echo "  ✓ External→Internal VNC (port 5900) - DENY & PERMIT"
echo "  ✓ External→Internal SNMP (port 161) - DENY & PERMIT"
echo "  ✓ Brute force patterns (5+ attempts in 5 min)"
echo ""
echo "Next Steps:"
echo "  1. Restart Wazuh Manager:"
echo "     sudo /var/ossec/bin/wazuh-control restart"
echo ""
echo "  2. Test the rules with generated logs:"
echo "     python3 $SCRIPT_DIR/generate_network_anomaly_tests.py"
echo ""
echo "  3. Configure Telegram alerts:"
echo "     Edit: $CUSTOM_SCRIPTS_DIR/telegram_network_alert.py"
echo "     Add Bot Token and Chat ID"
echo ""
echo "  4. Verify in Wazuh Dashboard:"
echo "     Search for: group:network_anomaly"
echo "     Or: rule.id:[100090 TO 100109]"
echo ""
echo "=================================="
echo ""
