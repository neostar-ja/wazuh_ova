#!/bin/bash
set -e

LICENSE_KEY="${MAXMIND_LICENSE_KEY:-<REPLACE_WITH_MAXMIND_LICENSE_KEY>}"
DB_DIR="/etc/wazuh-indexer/ingest-geoip"
TEMP_FILE="/tmp/GeoLite2-City.mmdb.tar.gz"
UPDATER_SCRIPT="/usr/local/bin/update-geoip.sh"

echo "Creating DB directory..."
mkdir -p $DB_DIR

echo "Downloading MaxMind GeoLite2 City database..."
curl -s -L -o $TEMP_FILE "https://download.maxmind.com/app/geoip_download?edition_id=GeoLite2-City&license_key=$LICENSE_KEY&suffix=tar.gz"

echo "Extracting database..."
tar -xzf $TEMP_FILE -C /tmp

echo "Moving mmdb file..."
find /tmp -name "GeoLite2-City.mmdb" -exec cp {} $DB_DIR/ \;

echo "Setting permissions..."
chown -R wazuh-indexer:wazuh-indexer $DB_DIR
chmod 644 $DB_DIR/GeoLite2-City.mmdb

echo "Cleaning up..."
rm -rf /tmp/GeoLite2*

echo "Creating auto-update script..."
cat << 'EOF' > $UPDATER_SCRIPT
#!/bin/bash
# Use environment variable MAXMIND_LICENSE_KEY to avoid embedding license keys in source control
LICENSE_KEY="${MAXMIND_LICENSE_KEY:-<REPLACE_WITH_MAXMIND_LICENSE_KEY>}"
DB_DIR="/etc/wazuh-indexer/ingest-geoip"
TEMP_FILE="/tmp/GeoLite2-City.mmdb.tar.gz"
mkdir -p $DB_DIR
curl -s -L -o $TEMP_FILE "https://download.maxmind.com/app/geoip_download?edition_id=GeoLite2-City&license_key=$LICENSE_KEY&suffix=tar.gz"
tar -xzf $TEMP_FILE -C /tmp
find /tmp -name "GeoLite2-City.mmdb" -exec cp {} $DB_DIR/ \;
chown -R wazuh-indexer:wazuh-indexer $DB_DIR
chmod 644 $DB_DIR/GeoLite2-City.mmdb
rm -rf /tmp/GeoLite2*
echo "GeoIP Database updated successfully!"
EOF

chmod +x $UPDATER_SCRIPT

echo "Adding to cron..."
# Remove old entry if exists and add new
(crontab -l 2>/dev/null | grep -v "update-geoip.sh"; echo "0 0 * * 0 $UPDATER_SCRIPT > /dev/null 2>&1") | crontab -

echo "Configuring OpenSearch API..."

# 1. Update Template
curl -s -k -u admin:admin -X PUT "https://localhost:9200/_index_template/wazuh-alerts-custom-geoip" -H 'Content-Type: application/json' -d'
{
  "index_patterns": [
    "wazuh-alerts-4.x-*"
  ],
  "priority": 150,
  "template": {
    "mappings": {
      "properties": {
        "GeoLocation": {
          "properties": {
            "location": {
              "type": "geo_point"
            }
          }
        },
        "DestLocation": {
          "properties": {
            "location": {
              "type": "geo_point"
            }
          }
        }
      }
    }
  }
}'
echo -e "\nTemplate updated."

# 2. Create Pipeline
curl -s -k -u admin:admin -X PUT "https://localhost:9200/_ingest/pipeline/wazuh-geoip-pipeline" -H 'Content-Type: application/json' -d'
{
  "description": "Enrich srcip and dstip with GeoIP data",
  "processors": [
    {
      "geoip": {
        "field": "data.srcip",
        "target_field": "GeoLocation",
        "properties": ["city_name", "country_name", "region_name", "location"],
        "ignore_missing": true,
        "ignore_failure": true
      }
    },
    {
      "geoip": {
        "field": "data.dstip",
        "target_field": "DestLocation",
        "properties": ["city_name", "country_name", "region_name", "location"],
        "ignore_missing": true,
        "ignore_failure": true
      }
    }
  ]
}'
echo -e "\nPipeline created."

# 3. Set Default Pipeline
curl -s -k -u admin:admin -X PUT "https://localhost:9200/_index_template/wazuh-alerts-default-pipeline" -H 'Content-Type: application/json' -d'
{
  "index_patterns": ["wazuh-alerts-4.x-*"],
  "priority": 200,
  "template": {
    "settings": {
      "index.default_pipeline": "wazuh-geoip-pipeline"
    }
  }
}'
echo -e "\nDefault pipeline set."
echo "Remote configuration completed successfully."
