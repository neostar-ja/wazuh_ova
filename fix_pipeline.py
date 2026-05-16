import json
import subprocess

# get pipeline
out = subprocess.check_output(["sshpass", "-p", "wazuh", "ssh", "-o", "StrictHostKeyChecking=no", "wazuh-user@10.251.151.13", "curl -s -k -u admin:admin -X GET 'https://10.251.151.13:9200/_ingest/pipeline/filebeat-7.10.2-wazuh-alerts-pipeline'"])
data = json.loads(out)
pipeline = data['filebeat-7.10.2-wazuh-alerts-pipeline']

# check if dstip is already there
found = False
for p in pipeline['processors']:
    if 'geoip' in p and p['geoip'].get('field') == 'data.dstip':
        found = True
        break

if not found:
    pipeline['processors'].insert(4, {
        "geoip": {
            "field": "data.dstip",
            "target_field": "DestLocation",
            "properties": ["city_name", "country_name", "region_name", "location"],
            "ignore_missing": True,
            "ignore_failure": True
        }
    })
    
    # write to temp file
    with open('/tmp/new_pipeline.json', 'w') as f:
        json.dump(pipeline, f)
    print("Updating pipeline...")
    subprocess.run(["sshpass", "-p", "wazuh", "scp", "-o", "StrictHostKeyChecking=no", "/tmp/new_pipeline.json", "wazuh-user@10.251.151.13:/tmp/new_pipeline.json"])
    subprocess.run(["sshpass", "-p", "wazuh", "ssh", "-o", "StrictHostKeyChecking=no", "wazuh-user@10.251.151.13", "curl -s -k -u admin:admin -X PUT 'https://10.251.151.13:9200/_ingest/pipeline/filebeat-7.10.2-wazuh-alerts-pipeline' -H 'Content-Type: application/json' -d @/tmp/new_pipeline.json"])
else:
    print("Pipeline already updated.")
