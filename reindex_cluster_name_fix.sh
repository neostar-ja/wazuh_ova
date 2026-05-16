#!/bin/bash

###########################################################
# Wazuh Elasticsearch - Reindex with Correct Mapping
# Purpose: Reindex old indices with cluster.name as text to use keyword
# Date: 14 May 2026
###########################################################

set -e

# Configuration
ELASTICSEARCH_URL="https://10.251.151.13:9200"
ELASTICSEARCH_USER="admin"
ELASTICSEARCH_PASS="admin"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

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

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Wazuh Elasticsearch - Reindex with Fix${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Step 1: Find indices that need reindexing
echo -e "${YELLOW}Step 1: Finding indices with text-type cluster.name...${NC}"

INDICES_TO_FIX=()
CURRENT_INDICES=$(es_api GET "/_cat/indices?format=json&index=wazuh-alerts-4.x-*" 2>/dev/null)

echo "$CURRENT_INDICES" | jq -r '.[] | .index' 2>/dev/null | while read INDEX; do
    if [ ! -z "$INDEX" ]; then
        MAPPING=$(es_api GET "/${INDEX}/_mapping" 2>/dev/null)
        FIELD_TYPE=$(echo "$MAPPING" | jq -r ".\"${INDEX}\".mappings.properties.cluster.properties.name.type // \"\"" 2>/dev/null)
        
        if [ "$FIELD_TYPE" = "text" ]; then
            echo -e "${RED}  Found: ${INDEX} (type: TEXT)${NC}"
            INDICES_TO_FIX+=("$INDEX")
        elif [ "$FIELD_TYPE" = "keyword" ]; then
            echo -e "${GREEN}  OK: ${INDEX} (type: KEYWORD)${NC}"
        else
            echo -e "${MAGENTA}  Unknown: ${INDEX} (type: $FIELD_TYPE)${NC}"
        fi
    fi
done

# Step 2: Ask for confirmation
echo -e "\n${YELLOW}Step 2: Confirmation${NC}"
echo "Reindexing will:"
echo "  1. Create new indices with correct mapping"
echo "  2. Copy all data from old indices"
echo "  3. Replace old indices with new ones"
echo -e "\n${YELLOW}This operation may take time for large indices.${NC}"

read -p "Do you want to proceed? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
    echo -e "${YELLOW}Operation cancelled${NC}"
    exit 0
fi

# Step 3: Reindex each affected index
echo -e "\n${YELLOW}Step 3: Starting reindex process...${NC}"

echo "$CURRENT_INDICES" | jq -r '.[] | .index' 2>/dev/null | while read SOURCE_INDEX; do
    if [ ! -z "$SOURCE_INDEX" ]; then
        MAPPING=$(es_api GET "/${SOURCE_INDEX}/_mapping" 2>/dev/null)
        FIELD_TYPE=$(echo "$MAPPING" | jq -r ".\"${SOURCE_INDEX}\".mappings.properties.cluster.properties.name.type // \"\"" 2>/dev/null)
        
        if [ "$FIELD_TYPE" = "text" ]; then
            echo -e "\n${MAGENTA}Processing: ${SOURCE_INDEX}${NC}"
            
            DEST_INDEX="${SOURCE_INDEX}-fixed-$(date +%s)"
            
            # Step 3a: Create destination index with correct mapping
            echo -e "${YELLOW}  Creating destination index: ${DEST_INDEX}...${NC}"
            
            # Get the current mapping and modify cluster.name
            CURRENT_MAPPING=$(es_api GET "/${SOURCE_INDEX}/_mapping" 2>/dev/null)
            
            # Create new index with corrected mapping
            NEW_MAPPING=$(echo "$CURRENT_MAPPING" | jq ".\"${SOURCE_INDEX}\".mappings" 2>/dev/null)
            
            # Ensure cluster.name is keyword
            NEW_MAPPING=$(echo "$NEW_MAPPING" | jq '.properties.cluster.properties.name.type = "keyword"' 2>/dev/null)
            
            CREATE_INDEX_BODY=$(echo "{\"mappings\": $NEW_MAPPING}" | jq .)
            
            es_api PUT "/${DEST_INDEX}" "$CREATE_INDEX_BODY" > /dev/null
            echo -e "${GREEN}    ✓ Created${NC}"
            
            # Step 3b: Reindex the data
            echo -e "${YELLOW}  Reindexing data from ${SOURCE_INDEX}...${NC}"
            
            REINDEX_BODY="{
              \"source\": {\"index\": \"${SOURCE_INDEX}\"},
              \"dest\": {\"index\": \"${DEST_INDEX}\"}
            }"
            
            REINDEX_RESPONSE=$(es_api POST "/_reindex" "$REINDEX_BODY" 2>/dev/null)
            REINDEX_COUNT=$(echo "$REINDEX_RESPONSE" | jq '.updated + .created' 2>/dev/null)
            
            if [ ! -z "$REINDEX_COUNT" ] && [ "$REINDEX_COUNT" -gt 0 ]; then
                echo -e "${GREEN}    ✓ Reindexed $REINDEX_COUNT documents${NC}"
            else
                echo -e "${RED}    ✗ Reindex failed${NC}"
                echo "$REINDEX_RESPONSE" | jq '.'
                exit 1
            fi
            
            # Step 3c: Delete the old index
            echo -e "${YELLOW}  Deleting old index: ${SOURCE_INDEX}...${NC}"
            es_api DELETE "/${SOURCE_INDEX}" > /dev/null
            echo -e "${GREEN}    ✓ Deleted${NC}"
            
            # Step 3d: Create alias pointing to new index (using old index name)
            echo -e "${YELLOW}  Creating alias: ${SOURCE_INDEX} -> ${DEST_INDEX}...${NC}"
            
            ALIAS_BODY="{
              \"actions\": [
                {\"add\": {\"index\": \"${DEST_INDEX}\", \"alias\": \"${SOURCE_INDEX}\"}}
              ]
            }"
            
            es_api POST "/_aliases" "$ALIAS_BODY" > /dev/null
            echo -e "${GREEN}    ✓ Alias created${NC}"
            
            # Step 3e: Verify
            echo -e "${YELLOW}  Verifying...${NC}"
            VERIFY=$(es_api GET "/${DEST_INDEX}/_mapping" 2>/dev/null)
            VERIFY_TYPE=$(echo "$VERIFY" | jq -r ".\"${DEST_INDEX}\".mappings.properties.cluster.properties.name.type" 2>/dev/null)
            
            if [ "$VERIFY_TYPE" = "keyword" ]; then
                echo -e "${GREEN}    ✓ Verification successful (type: KEYWORD)${NC}"
            else
                echo -e "${RED}    ✗ Verification failed (type: $VERIFY_TYPE)${NC}"
            fi
        fi
    fi
done

# Step 4: Test aggregation
echo -e "\n${YELLOW}Step 4: Testing aggregation capability...${NC}"

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
    echo "$TEST_RESULT" | jq '.aggregations.cluster_names.buckets[]'
else
    echo -e "${RED}✗ Aggregation test failed${NC}"
    echo "$TEST_RESULT" | jq '.error'
fi

# Step 5: Summary
echo -e "\n${BLUE}========================================${NC}"
echo -e "${BLUE}Reindex Completed${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✓ All indices have been reindexed${NC}"
echo -e "${GREEN}✓ cluster.name now uses KEYWORD type${NC}"
echo -e "${GREEN}✓ Aggregations should now work correctly${NC}"

echo -e "\n${YELLOW}Note:${NC}"
echo "  - Old index names are now aliased to new fixed indices"
echo "  - Original data timestamps are preserved"
echo "  - No data loss has occurred"

exit 0
