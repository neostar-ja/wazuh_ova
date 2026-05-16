#!/usr/bin/env bash
set -euo pipefail

# fix_ruleid_mapping.sh
# Safely check mapping for rule.id, install template with rule.id.keyword,
# create a new index with correct mapping and reindex data from an old index.
# Usage:
#   ./fix_ruleid_mapping.sh --es http://localhost:9200 --src-index wazuh-alerts-4.x-2026.05.14-proper-timestamp --dst-index wazuh-alerts-2026.05.14-fixed --template-name wazuh-add-ruleid-keyword

ES="http://localhost:9200"
SRC_INDEX=""
DST_INDEX=""
TEMPLATE_NAME="wazuh-add-ruleid-keyword"

usage(){
  sed -n '1,120p' "$0" | sed -n '1,40p'
  cat <<EOF

Options:
  --es URL           Elasticsearch endpoint (default: http://localhost:9200)
  --src-index NAME   Source index to reindex from (required)
  --dst-index NAME   Destination index to create (required)
  --template-name N  Index template name to create (default: $TEMPLATE_NAME)
  --help             Show this help
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --es) ES="$2"; shift 2;;
    --src-index) SRC_INDEX="$2"; shift 2;;
    --dst-index) DST_INDEX="$2"; shift 2;;
    --template-name) TEMPLATE_NAME="$2"; shift 2;;
    --help) usage; exit 0;;
    *) echo "Unknown arg: $1"; usage; exit 1;;
  esac
done

if [[ -z "$SRC_INDEX" || -z "$DST_INDEX" ]]; then
  echo "--src-index and --dst-index are required"
  usage
  exit 2
fi

echo "Elasticsearch endpoint: $ES"
echo "Source index: $SRC_INDEX"
echo "Destination index: $DST_INDEX"
echo "Template name: $TEMPLATE_NAME"

echo "\n1) Checking ES connectivity..."
if ! curl -k -sS --fail "$ES" >/dev/null; then
  echo "Cannot connect to Elasticsearch at $ES" >&2
  exit 3
fi

echo "2) Show current mapping for rule.id (if present):"
curl -k -sS "$ES/$SRC_INDEX/_mapping/field/rule.id?pretty" || true

echo "\n3) Create/Update index template to add rule.id.keyword subfield"
cat > /tmp/${TEMPLATE_NAME}.json <<JSON
{
  "index_patterns": ["wazuh-alerts-*"],
  "template": {
    "mappings": {
      "properties": {
        "rule": {
          "properties": {
            "id": {
              "type": "text",
              "fields": {
                "keyword": { "type": "keyword", "ignore_above": 256 }
              }
            }
          }
        }
      }
    }
  }
}
JSON

echo "Uploading template $TEMPLATE_NAME"
curl -k -sS -X PUT "$ES/_index_template/$TEMPLATE_NAME" -H 'Content-Type: application/json' -d @/tmp/${TEMPLATE_NAME}.json | jq '.'

echo "\n4) Create destination index with explicit mapping (if it doesn't exist)"
if curl -k -sS --fail "$ES/$DST_INDEX" >/dev/null 2>&1; then
  echo "Destination index $DST_INDEX already exists — skipping creation"
else
  cat > /tmp/${DST_INDEX}_mapping.json <<JSON
{
  "mappings": {
    "properties": {
      "rule": {
        "properties": {
          "id": {
            "type": "text",
            "fields": {
              "keyword": { "type": "keyword", "ignore_above": 256 }
            }
          }
        }
      }
    }
  }
}
JSON
  echo "Creating index $DST_INDEX"
  curl -k -sS -X PUT "$ES/$DST_INDEX" -H 'Content-Type: application/json' -d @/tmp/${DST_INDEX}_mapping.json | jq '.'
fi

echo "\n5) Run _reindex from $SRC_INDEX -> $DST_INDEX (will run as task)"
REINDEX_PAYLOAD=$(cat <<-JSON
{
  "source": { "index": "$SRC_INDEX" },
  "dest": { "index": "$DST_INDEX" }
}
JSON
)

echo "$REINDEX_PAYLOAD" > /tmp/reindex_payload.json
curl -k -sS -X POST "$ES/_reindex?wait_for_completion=false&pretty" -H 'Content-Type: application/json' -d @/tmp/reindex_payload.json | jq '.'

echo "\n6) Reindex started as background task. To monitor tasks run:"
echo "  curl -k -sS '$ES/_tasks?detailed=true&actions=*reindex*' | jq '.'"
echo "When reindex completes, verify mapping on $DST_INDEX and then consider swapping aliases or updating Kibana index-pattern to point to new index."

echo "Script finished — review outputs above."
