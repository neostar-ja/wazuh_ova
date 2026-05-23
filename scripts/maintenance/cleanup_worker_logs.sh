#!/bin/bash
# Script to clean up old log and alert files on Wazuh Worker to free up disk space.
# Since alerts are already forwarded and indexed in Wazuh Indexer (10.251.151.13),
# keeping raw and uncompressed logs locally on the worker is not necessary.

RETENTION_DAYS=2
LOG_DIR="/var/ossec/logs"

echo "🧹 Starting Wazuh Worker log cleanup (Retention: ${RETENTION_DAYS} days)..."

# 1. Clean up archives (raw logs) - generally not needed if alerts are indexed
if [ -d "${LOG_DIR}/archives" ]; then
    echo "🗑️ Cleaning up archives..."
    # Remove old archive directories
    sudo find ${LOG_DIR}/archives/ -mindepth 2 -type f -mtime +${RETENTION_DAYS} -delete
    # Remove uncompressed large archives in the root or May directory
    sudo find ${LOG_DIR}/archives/ -name "*.json" -mtime +${RETENTION_DAYS} -delete
    sudo find ${LOG_DIR}/archives/ -name "*.log" -mtime +${RETENTION_DAYS} -delete
    # Empty main archives.json if it is large and not written to
    if [ -f "${LOG_DIR}/archives/archives.json" ]; then
        sudo truncate -s 0 ${LOG_DIR}/archives/archives.json
    fi
fi

# 2. Clean up alerts
if [ -d "${LOG_DIR}/alerts" ]; then
    echo "🗑️ Cleaning up alerts..."
    # Remove rotated alerts older than retention days
    sudo find ${LOG_DIR}/alerts/ -mindepth 2 -type f -mtime +${RETENTION_DAYS} -delete
    # Remove uncompressed large rotated alerts
    sudo find ${LOG_DIR}/alerts/ -name "ossec-alerts-*.json" -delete
    sudo find ${LOG_DIR}/alerts/ -name "ossec-alerts-*.log" -delete
fi

# 3. Truncate active alerts to 0 if they are pointing to old logs or are oversized
echo "📝 Resetting active alert files..."
sudo truncate -s 0 ${LOG_DIR}/alerts/alerts.json
sudo truncate -s 0 ${LOG_DIR}/alerts/alerts.log
sudo chown wazuh:wazuh ${LOG_DIR}/alerts/alerts.json ${LOG_DIR}/alerts/alerts.log
sudo chmod 640 ${LOG_DIR}/alerts/alerts.json ${LOG_DIR}/alerts/alerts.log

# 4. Show free space
echo "📊 Current disk space usage:"
df -h /

# 5. Restart services to restore functionality
echo "🔄 Restarting Wazuh Manager and Filebeat..."
sudo systemctl restart wazuh-manager
sudo systemctl restart filebeat

echo "✅ Cleanup and service restart completed successfully!"
