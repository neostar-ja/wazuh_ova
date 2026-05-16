#!/bin/bash

###########################################################
# Wazuh Elasticsearch - cluster.name Field Mapping Fix
# Purpose: Convert cluster.name from text to keyword
# Date: 14 May 2026
###########################################################

set -e

# Configuration
ELASTICSEARCH_URL="https://10.251.151.13:9200"
ELASTICSEARCH_USER="admin"
ELASTICSEARCH_PASS="admin"
VERIFY_SSL=false

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Wazuh Elasticsearch Cluster.name Fix${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Function to make API calls
es_api() {
    local method=$1
    local endpoint=$2
    local data=$3
    
    if [ -z "$data" ]; then
        curl -s -k -u "${ELASTICSEARCH_USER}:${ELASTICSEARCH_PASS}" \
            -X "$method" "${ELASTICSEARCH_URL}${endpoint}" \
            -H 'Content-Type: application/json'
    else
        curl -s -k -u "${ELASTICSEARCH_USER}:${ELASTICSEARCH_PASS}" \
            -X "$method" "${ELASTICSEARCH_URL}${endpoint}" \
            -H 'Content-Type: application/json' \
            -d "$data"
    fi
}

# Step 1: Check current mapping
echo -e "${YELLOW}Step 1: Checking current cluster.name field mapping...${NC}"
CURRENT_MAPPING=$(es_api GET "/_index_template/wazuh-alerts*" 2>/dev/null)

if echo "$CURRENT_MAPPING" | grep -q "cluster.name"; then
    echo -e "${GREEN}✓ Found cluster.name in index template${NC}"
    echo "$CURRENT_MAPPING" | jq '.index_templates[0].template.mappings.properties.cluster.properties.name // empty' 2>/dev/null
else
    echo -e "${YELLOW}⚠ cluster.name not found in templates, checking indices...${NC}"
fi

# Step 2: List current indices with their mapping
echo -e "\n${YELLOW}Step 2: Listing wazuh-alerts indices...${NC}"
INDICES=$(es_api GET "/_cat/indices?format=json&index=wazuh-alerts*" 2>/dev/null)
echo "$INDICES" | jq '.[] | {index: .index, status: .status, docs: .docs_count}' 2>/dev/null

# Step 3: Create component template for cluster.name fix
echo -e "\n${YELLOW}Step 3: Creating component template for cluster.name field...${NC}"
COMPONENT_TEMPLATE='{
  "template": {
    "mappings": {
      "properties": {
        "cluster": {
          "properties": {
            "name": {
              "type": "keyword"
            }
          }
        }
      }
    }
  }
}'

es_api PUT "/_component_template/wazuh-alerts-cluster-name-fix" "$COMPONENT_TEMPLATE" > /dev/null
echo -e "${GREEN}✓ Component template created${NC}"

# Step 4: Create or update index template with high priority
echo -e "\n${YELLOW}Step 4: Creating index template (priority: 201)...${NC}"
INDEX_TEMPLATE='{
  "index_patterns": ["wazuh-alerts-4.x-*"],
  "priority": 201,
  "composed_of": ["wazuh-alerts-cluster-name-fix"],
  "template": {
    "settings": {
      "index.number_of_shards": 1,
      "index.number_of_replicas": 1
    }
  }
}'

es_api PUT "/_index_template/wazuh-alerts-custom-cluster-name-fix" "$INDEX_TEMPLATE" > /dev/null
echo -e "${GREEN}✓ Index template created with high priority${NC}"

# Step 5: Verify the fix
echo -e "\n${YELLOW}Step 5: Verifying the fix...${NC}"
VERIFICATION=$(es_api GET "/_index_template/wazuh-alerts-custom-cluster-name-fix" 2>/dev/null)

if echo "$VERIFICATION" | jq -e '.index_templates[0].template.composed_of[] | select(. == "wazuh-alerts-cluster-name-fix")' > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Template verification successful${NC}"
    echo "$VERIFICATION" | jq '.index_templates[0].priority'
else
    echo -e "${RED}✗ Template verification failed${NC}"
    exit 1
fi

# Step 6: Test aggregation on a new query
echo -e "\n${YELLOW}Step 6: Testing aggregation capability...${NC}"
TEST_QUERY='{
  "size": 0,
  "aggs": {
    "cluster_names": {
      "terms": {
        "field": "cluster.name",
        "size": 10
      }
    }
  }
}'

TEST_RESULT=$(es_api POST "/_search" "$TEST_QUERY" 2>/dev/null)

if echo "$TEST_RESULT" | jq -e '.aggregations' > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Aggregation test successful${NC}"
    echo "$TEST_RESULT" | jq '.aggregations.cluster_names'
else
    if echo "$TEST_RESULT" | jq -e '.error' > /dev/null 2>&1; then
        ERROR_MSG=$(echo "$TEST_RESULT" | jq '.error.root_cause[0].reason')
        echo -e "${YELLOW}⚠ Aggregation test on existing indices may still fail:${NC}"
        echo "$ERROR_MSG"
        echo -e "${YELLOW}This is expected for old indices. New indices will use correct mapping.${NC}"
    fi
fi

# Step 7: Recommendations for existing indices
echo -e "\n${BLUE}========================================${NC}"
echo -e "${BLUE}Fix Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✓ Index template has been updated${NC}"
echo -e "${GREEN}✓ New indices will use keyword type for cluster.name${NC}"
echo -e "${YELLOW}⚠ Existing indices may still need reindexing${NC}"

echo -e "\n${YELLOW}For existing indices that need aggregation support:${NC}"
echo "Option A (Recommended): Reindex data to new indices"
echo "Option B (Quick but not recommended): Enable fielddata (uses memory)"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo "1. Check which indices are affected"
echo "2. If you need to query old data with aggregations, use the reindex script"
echo "3. New indices created after this fix will work automatically"

# Step 8: Show which indices have the old mapping
echo -e "\n${YELLOW}Step 8: Checking indices with old mapping...${NC}"
CURRENT_INDICES=$(es_api GET "/_cat/indices?format=json&index=wazuh-alerts-4.x-*" 2>/dev/null)
echo "$CURRENT_INDICES" | jq '.[] | .index' 2>/dev/null | while read INDEX; do
    MAPPING=$(es_api GET "/${INDEX}/_mapping" 2>/dev/null)
    if echo "$MAPPING" | jq -e ".\"${INDEX}\".mappings.properties.cluster.properties.name.type" 2>/dev/null | grep -q "text"; then
        echo -e "${YELLOW}  - ${INDEX}: uses TEXT type (needs reindex for aggregation)${NC}"
    elif echo "$MAPPING" | jq -e ".\"${INDEX}\".mappings.properties.cluster.properties.name.type" 2>/dev/null | grep -q "keyword"; then
        echo -e "${GREEN}  - ${INDEX}: uses KEYWORD type ✓${NC}"
    fi
done

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}Fix completed successfully!${NC}"
echo -e "${GREEN}========================================${NC}"

# Exit successfully
exit 0
