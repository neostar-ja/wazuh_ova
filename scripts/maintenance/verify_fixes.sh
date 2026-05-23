#!/bin/bash
# Quick Verification Script for Wazuh Elasticsearch Fixes
# Run this to verify both cluster.name and data.timestamp fixes are working

ENV_FILE="/opt/code/wazuh_ova/.env"
if [ -f "$ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

INDEXER="10.251.151.13"
USER="${wazuh_open_search_username:-admin}"
PASS="${wazuh_open_search_password:-}"

echo "========================================"
echo "Wazuh Elasticsearch Fix Verification"
echo "========================================"
echo ""

# Color codes for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

check_result() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ PASS${NC}"
        return 0
    else
        echo -e "${RED}✗ FAIL${NC}"
        return 1
    fi
}

echo "[1/4] Checking cluster.name field mapping..."
RESULT=$(curl -k -s -u "$USER:$PASS" "https://$INDEXER:9200/wazuh-alerts-4.x-*/_mapping" | \
  jq -r '.[] .mappings.properties.cluster.properties.name.type' | sort | uniq)
if echo "$RESULT" | grep -q "keyword"; then
    echo -e "${GREEN}✓ cluster.name is KEYWORD type${NC}"
else
    echo -e "${RED}✗ cluster.name mapping issue${NC} (found: $RESULT)"
fi

echo ""
echo "[2/4] Checking data.timestamp field mapping..."
RESULT=$(curl -k -s -u "$USER:$PASS" "https://$INDEXER:9200/wazuh-alerts-4.x-*/_mapping" | \
  jq -r '.[] .mappings.properties.data.properties.timestamp.type' | sort | uniq)
if echo "$RESULT" | grep -q "date"; then
    echo -e "${GREEN}✓ data.timestamp is DATE type${NC}"
else
    echo -e "${RED}✗ data.timestamp mapping issue${NC} (found: $RESULT)"
fi

echo ""
echo "[3/4] Testing cluster.name aggregation..."
QUERY=$(curl -k -s -u "$USER:$PASS" -X POST "https://$INDEXER:9200/wazuh-alerts-4.x-*/_search" \
  -H 'Content-Type: application/json' \
  -d '{"size":0,"aggs":{"clusters":{"terms":{"field":"cluster.name"}}}}')

if echo "$QUERY" | jq -e '.aggregations.clusters.buckets' > /dev/null; then
    BUCKETS=$(echo "$QUERY" | jq '.aggregations.clusters.buckets | length')
    echo -e "${GREEN}✓ Aggregation works ($BUCKETS clusters found)${NC}"
else
    echo -e "${RED}✗ Aggregation failed${NC}"
    echo "$QUERY" | jq '.error // .'
fi

echo ""
echo "[4/4] Testing data.timestamp aggregation..."
QUERY=$(curl -k -s -u "$USER:$PASS" -X POST "https://$INDEXER:9200/wazuh-alerts-4.x-*/_search" \
  -H 'Content-Type: application/json' \
  -d '{"size":0,"aggs":{"timeline":{"date_histogram":{"field":"data.timestamp","calendar_interval":"1d"}}}}')

if echo "$QUERY" | jq -e '.aggregations.timeline.buckets' > /dev/null; then
    echo -e "${GREEN}✓ Date histogram aggregation works${NC}"
else
    echo -e "${RED}✗ Date histogram failed${NC}"
    echo "$QUERY" | jq '.error // .'
fi

echo ""
echo "========================================"
echo "Verification Complete"
echo "========================================"
