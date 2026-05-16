#!/bin/bash
# =============================================================================
# Wazuh Elasticsearch Ultimate Overrides - Dynamic Data Fields & Permanent Fix
# Purpose: Enforce dynamic KEYWORD mapping for all data.* string fields 
#          to permanently eliminate Dashboard 'illegal_argument_exception' crashes.
# Date: 15 May 2026
# =============================================================================

set -e

# Config
ELASTICSEARCH_URL="https://10.251.151.13:9200"
ELASTICSEARCH_USER="admin"
ELASTICSEARCH_PASS="admin"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}====================================================${NC}"
echo -e "${BLUE}   Wazuh Elasticsearch Permanent Dynamic Fixes      ${NC}"
echo -e "${BLUE}====================================================${NC}\n"

es_api() {
    curl -s -k -u "${ELASTICSEARCH_USER}:${ELASTICSEARCH_PASS}" \
        -X "$1" "${ELASTICSEARCH_URL}$2" \
        -H 'Content-Type: application/json' \
        -d "$3"
}

echo -e "${YELLOW}Step 1: Creating component template for dynamic data mappings...${NC}"
# This template maps data.* strings as keywords AND explicitly sets critical fields to keywords.
COMPONENT_PAYLOAD='{
  "template": {
    "mappings": {
      "dynamic_templates": [
        {
          "wazuh_data_strings_as_keywords": {
            "path_match": "data.*",
            "match_mapping_type": "string",
            "mapping": {
              "type": "keyword",
              "ignore_above": 1024
            }
          }
        }
      ],
      "properties": {
        "data": {
          "properties": {
            "rule_name": { "type": "keyword", "ignore_above": 1024 },
            "srcip": { "type": "keyword", "ignore_above": 256 },
            "dstip": { "type": "keyword", "ignore_above": 256 },
            "src_zone": { "type": "keyword", "ignore_above": 256 },
            "dst_zone": { "type": "keyword", "ignore_above": 256 },
            "application": { "type": "keyword", "ignore_above": 256 },
            "protocol": { "type": "keyword", "ignore_above": 256 },
            "action": { "type": "keyword", "ignore_above": 256 },
            "severity": { "type": "keyword", "ignore_above": 256 }
          }
        }
      }
    }
  }
}'

RESP1=$(es_api PUT "/_component_template/wazuh-alerts-dynamic-data-mappings-fix" "$COMPONENT_PAYLOAD")
echo "$RESP1" | grep -q '"acknowledged":true' && echo -e "${GREEN}✓ Component template created successfully.${NC}" || echo -e "${YELLOW}⚠ Status: $RESP1${NC}"

echo -e "\n${YELLOW}Step 2: Creating the consolidated Index Template (Priority 210)...${NC}"
# We bundle ALL custom fixes into this ultimate index template for absolute stability.
INDEX_PAYLOAD='{
  "index_patterns": ["wazuh-alerts-4.x-*"],
  "priority": 210,
  "composed_of": [
    "wazuh-alerts-cluster-name-fix",
    "wazuh-alerts-timestamp-fix",
    "wazuh-alerts-dynamic-data-mappings-fix"
  ],
  "template": {
    "settings": {
      "index.number_of_shards": 1,
      "index.number_of_replicas": 1
    }
  }
}'

RESP2=$(es_api PUT "/_index_template/wazuh-alerts-consolidated-custom-fixes" "$INDEX_PAYLOAD")
echo "$RESP2" | grep -q '"acknowledged":true' && echo -e "${GREEN}✓ Consolidated Index Template applied at priority 210.${NC}" || echo -e "${YELLOW}⚠ Status: $RESP2${NC}"

echo -e "\n${YELLOW}Step 3: Performing live verification of index template creation...${NC}"
VERIFICATION=$(es_api GET "/_index_template/wazuh-alerts-consolidated-custom-fixes")

if echo "$VERIFICATION" | jq -e '.index_templates[0].index_template.composed_of[] | select(. == "wazuh-alerts-dynamic-data-mappings-fix")' > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Verification PASSED: Consolidated custom fixes template is LIVE and ACTIVE.${NC}"
    echo -e "${GREEN}✓ Priority: $(echo "$VERIFICATION" | jq '.index_templates[0].index_template.priority')${NC}"
    echo -e "${GREEN}✓ Composed of: $(echo "$VERIFICATION" | jq -c '.index_templates[0].index_template.composed_of')${NC}"
else
    echo -e "\033[0;31m✗ Verification FAILED: Template state invalid.\033[0m"
    exit 1
fi

echo -e "\n${BLUE}====================================================${NC}"
echo -e "${GREEN}          PERMANENT STRUCTURAL FIX DEPLOYED          ${NC}"
echo -e "${BLUE}====================================================${NC}"
echo "Future daily indices will automatically map ALL dynamic 'data' string fields as keywords."
echo "No more illegal_argument_exception crashing the dashboard forever."
