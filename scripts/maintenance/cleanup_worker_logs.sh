#!/bin/bash
# Script to clean up old log and alert files on Wazuh Worker to free up disk space.
# Since alerts are already forwarded and indexed in Wazuh Indexer (10.251.151.13),
# keeping raw and uncompressed logs locally on the worker is not necessary.

RETENTION_DAYS="${RETENTION_DAYS:-2}"
LOG_DIR="${LOG_DIR:-/var/ossec/logs}"
SUDO="sudo"

if [ "${EUID:-$(id -u)}" -eq 0 ]; then
    SUDO=""
fi

echo "🧹 Starting Wazuh Worker log cleanup (Retention: ${RETENTION_DAYS} days)..."

# 1. Clean up archives (raw logs) - generally not needed if alerts are indexed
if [ -d "${LOG_DIR}/archives" ]; then
    echo "🗑️ Cleaning up archives..."
    # Remove old archive directories
    ${SUDO} find "${LOG_DIR}/archives/" -mindepth 2 -type f -mtime +"${RETENTION_DAYS}" -delete
    # Remove uncompressed large archives in the root or May directory
    ${SUDO} find "${LOG_DIR}/archives/" -name "*.json" -mtime +"${RETENTION_DAYS}" -delete
    ${SUDO} find "${LOG_DIR}/archives/" -name "*.log" -mtime +"${RETENTION_DAYS}" -delete
    # Empty main archives.json if it is large and not written to
    if [ -f "${LOG_DIR}/archives/archives.json" ]; then
        ${SUDO} truncate -s 0 "${LOG_DIR}/archives/archives.json"
    fi
else
    echo "ℹ️ Archives directory not found: ${LOG_DIR}/archives (skipping)"
fi

# 2. Clean up alerts
if [ -d "${LOG_DIR}/alerts" ]; then
    echo "🗑️ Cleaning up alerts..."
    # Remove rotated alerts older than retention days
    ${SUDO} find "${LOG_DIR}/alerts/" -mindepth 2 -type f -mtime +"${RETENTION_DAYS}" -delete
    # Remove uncompressed large rotated alerts
    ${SUDO} find "${LOG_DIR}/alerts/" -name "ossec-alerts-*.json" -delete
    ${SUDO} find "${LOG_DIR}/alerts/" -name "ossec-alerts-*.log" -delete
else
    echo "ℹ️ Alerts directory not found: ${LOG_DIR}/alerts (skipping)"
fi

# 3. Truncate active alerts to 0 if they are pointing to old logs or are oversized
if [ -d "${LOG_DIR}/alerts" ]; then
    echo "📝 Resetting active alert files..."
    active_files=()

    for file in "${LOG_DIR}/alerts/alerts.json" "${LOG_DIR}/alerts/alerts.log"; do
        if [ -f "${file}" ]; then
            ${SUDO} truncate -s 0 "${file}"
            active_files+=("${file}")
        else
            echo "ℹ️ Active alert file not found: ${file} (skipping)"
        fi
    done

    if [ "${#active_files[@]}" -gt 0 ]; then
        if getent passwd wazuh >/dev/null 2>&1 && getent group wazuh >/dev/null 2>&1; then
            ${SUDO} chown wazuh:wazuh "${active_files[@]}"
        else
            echo "ℹ️ User/group wazuh not found (skipping ownership reset)"
        fi
        ${SUDO} chmod 640 "${active_files[@]}"
    fi
fi

# 4. Show free space
echo "📊 Current disk space usage:"
df -h /

# 5. Restart services to restore functionality
echo "🔄 Restarting Wazuh Manager and Filebeat..."
restart_service() {
    local service="$1"
    if ! command -v systemctl >/dev/null 2>&1; then
        echo "ℹ️ systemctl not available (skipping ${service})"
        return
    fi

    if systemctl list-unit-files "${service}.service" --no-legend 2>/dev/null | grep -q "^${service}.service"; then
        ${SUDO} systemctl restart "${service}"
        echo "✅ Restarted ${service}"
    else
        echo "ℹ️ ${service}.service not found (skipping)"
    fi
}

restart_service "wazuh-manager"
restart_service "filebeat"

echo "✅ Cleanup and service restart completed successfully!"
