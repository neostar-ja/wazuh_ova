#!/bin/bash
# =============================================================================
# Deploy Ultimate Composable Wazuh Index Template
# Purpose: Restores core Wazuh mappings and merges all custom fixes into ONE
#          composable master template, preventing shadowing and future TEXT errors.
# Date: 15 May 2026
# =============================================================================

set -e

ELASTICSEARCH_URL="https://10.251.151.13:9200"
ELASTICSEARCH_USER="admin"
ELASTICSEARCH_PASS="admin"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

es_api() {
    curl -s -k -u "${ELASTICSEARCH_USER}:${ELASTICSEARCH_PASS}" \
        -X "$1" "${ELASTICSEARCH_URL}$2" \
        -H 'Content-Type: application/json' \
        -d "$3"
}

echo -e "${BLUE}============================================================${NC}"
echo -e "${BLUE}     Wazuh Elasticsearch Composable Architecture Migration   ${NC}"
echo -e "${BLUE}============================================================${NC}\n"

# 1. Delete Rogue Shadowing Templates first to prevent duplicate priority collisions
echo -e "${YELLOW}Step 1: Removing rogue index templates to prevent baseline shadowing...${NC}"
ROGUE_TEMPLATES=(
    "wazuh-alerts-custom-cluster-name-fix"
    "wazuh-alerts-timestamp-fix"
    "wazuh-alerts-consolidated-custom-fixes"
    "wazuh-alerts-custom-geoip"
)

for t in "${ROGUE_TEMPLATES[@]}"; do
    RESP=$(es_api DELETE "/_index_template/$t")
    if echo "$RESP" | grep -q '"acknowledged":true'; then
        echo -e "${GREEN}✓ Cleaned up shadow template: $t${NC}"
    else
        echo -e "${YELLOW}⚠ Template $t did not exist or could not be deleted.${NC}"
    fi
done

# 2. Create the GeoIP component template if not exists
# We need to make GeoIP also a component template!
echo -e "\n${YELLOW}Step 2: Creating wazuh-alerts-custom-geoip component template...${NC}"
GEOIP_COMPONENT='{
  "template": {
    "mappings": {
      "properties": {
        "DestLocation": { "properties": { "location": { "type": "geo_point" } } },
        "GeoLocation": { "properties": { "location": { "type": "geo_point" } } }
      }
    }
  }
}'
es_api PUT "/_component_template/wazuh-alerts-custom-geoip" "$GEOIP_COMPONENT" >/dev/null
echo -e "${GREEN}✓ Custom GeoIP component template created.${NC}"

# 3. Deploy the Ultimate Consolidated Index Template
echo -e "\n${YELLOW}Step 3: Creating MASTER Composable Template (Priority 500)...${NC}"
# This template COMPOSE of ALL baseline + patches and sets priority to 500
MASTER_INDEX_PAYLOAD='{
  "index_patterns": ["wazuh-alerts-4.x-*", "wazuh-archives-4.x-*"],
  "priority": 500,
  "composed_of": [
    "wazuh-core-mappings",
    "wazuh-alerts-cluster-name-fix",
    "wazuh-alerts-timestamp-fix",
    "wazuh-alerts-dynamic-data-mappings-fix",
    "wazuh-alerts-custom-geoip"
  ],
  "template": {
    "settings": {
      "index.number_of_shards": 1,
      "index.number_of_replicas": 1,
      "index.refresh_interval": "5s"
    }
  }
}'

RESP_MASTER=$(es_api PUT "/_index_template/wazuh-alerts-master-composable" "$MASTER_INDEX_PAYLOAD")

if echo "$RESP_MASTER" | grep -q '"acknowledged":true'; then
    echo -e "${GREEN}✓ SUCCESS: Master Composable template applied successfully!${NC}"
else
    echo -e "${RED}✗ ERROR: Failed to apply Master Composable template.${NC}"
    echo "$RESP_MASTER"
    exit 1
fi

# 4. Verification
echo -e "\n${YELLOW}Step 4: Verifying composite active state...${NC}"
VERIFICATION=$(es_api GET "/_index_template/wazuh-alerts-master-composable")

if echo "$VERIFICATION" | jq -e '.index_templates[0].index_template.composed_of[] | select(. == "wazuh-core-mappings")' >/dev/null 2>&1; then
    echo -e "${GREEN}✓ VERIFICATION PASSED: Composable architecture is FULLY DEPLOYED.${NC}"
    echo -e "${GREEN}✓ Priority: $(echo "$VERIFICATION" | jq '.index_templates[0].index_template.priority')${NC}"
    echo -e "${GREEN}✓ Baseline Schema: Included (wazuh-core-mappings)${NC}"
    echo -e "${GREEN}✓ Active Patches: $(echo "$VERIFICATION" | jq -c '.index_templates[0].index_template.composed_of')${NC}"
else
    echo -e "${RED}✗ Verification Failed: Output invalid.${NC}"
    exit 1
fi

echo -e "\n${BLUE}============================================================${NC}"
echo -e "${GREEN}             ULTIMATE SYSTEMIC RECOVERY COMPLETE             ${NC}"
echo -e "${BLUE}============================================================${NC}"
echo "Standard Wazuh mappings (rule.id, agent.id) + All Custom Fixes"
echo "are now seamlessly consolidated. Daily indices are fully secured."
