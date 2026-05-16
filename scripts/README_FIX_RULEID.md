Fix rule.id mapping and reindex instructions

Purpose
-------
This folder contains `fix_ruleid_mapping.sh` — a safe helper to:
- check mapping for `rule.id`
- install an index template that adds `rule.id.keyword`
- create a new index with a mapping that includes `rule.id.keyword`
- start a `_reindex` job from the old index into the new index

Preconditions
-------------
- You must be able to reach Elasticsearch from the host where you run the script (typically the Wazuh Indexer `10.251.151.13`).
- The caller should have privileges to create index templates, create indices and run `_reindex`.

Recommended run (via SSH on Indexer)
------------------------------------
1) SSH to the Indexer:

```bash
ssh wazuh-user@10.251.151.13
sudo su -
cd /opt/code/wazuh_ova/scripts
chmod +x fix_ruleid_mapping.sh
```

2) Dry-run mapping check (replace source index name):

```bash
./fix_ruleid_mapping.sh --es http://localhost:9200 --src-index wazuh-alerts-4.x-2026.05.14-proper-timestamp --dst-index wazuh-alerts-2026.05.14-fixed
```

3) Monitor the reindex task:

```bash
curl -s 'http://localhost:9200/_tasks?detailed=true&actions=*reindex*' | jq '.'
```

4) When reindex finished, verify mapping on destination index and switch aliases or update Kibana index pattern to the new index (or create an alias to point to the new index and update repeated imports of NDJSON if needed).

Notes & safety
--------------
- The script does not delete the source index. It creates a new index and starts background reindexing.
- Consider running reindex during a maintenance window for large indices.
- If you prefer, I can attempt these commands remotely if you provide SSH access or run them interactively here (you must supply credentials or run the commands yourself and paste output).
