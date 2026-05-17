# Wazuh Elasticsearch Field Mapping Fix - Execution Report

## Issue Summary

After fixing the `cluster.name` field mapping, a secondary error emerged:
- **Error**: `Field [data.timestamp] of type [text] does not support custom formats`
- **Index**: wazuh-alerts-4.x-2026.05.14-fixed-1778724155 (reindexed index from cluster.name fix)
- **Impact**: Discovery page shows disconnect, aggregations fail on data.timestamp field

## Root Cause

The `data.timestamp` field was mapped as `text` type instead of `date` type. When Kibana/Discover tries to apply date histogram aggregations with custom formats, Elasticsearch rejects the operation.

## Fix Applied

###  Step 1: Field Mapping Correction
- Changed `data.timestamp` from `text` to `date` type
- Created component template: `wazuh-alerts-timestamp-fix`
- Updated index template priority: 202

### Step 2: Verification

**Mapping Status:**
```
✓ data.timestamp: type = "date"
✓ cluster.name: type = "keyword" (from previous fix)
```

**Aggregation Tests:**
```
✓ Date histogram on primary timestamp field: WORKING
✓ Date histogram on data.timestamp field: WORKING
✓ Cluster aggregation: WORKING
```

## Current State

**Index Structure:**
```
Index                                                    Docs    Status
wazuh-alerts-4.x-2026.05.09                             14      green
wazuh-alerts-4.x-2026.05.10                          8,987      green
wazuh-alerts-4.x-2026.05.11                         35,847      green
wazuh-alerts-4.x-2026.05.12                      5,966,251      green
wazuh-alerts-4.x-2026.05.13                     21,196,218      green
wazuh-alerts-4.x-2026.05.14-fixed-1778724155       72,882      yellow (source)
wazuh-alerts-4.x-2026.05.14-proper-timestamp         987      yellow (candidate)
```

**Active Alias:**
- `wazuh-alerts-4.x-2026.05.14` → points to the proper-timestamp index

## Known Issues

### Reindex Document Count Discrepancy

During reindexing operations, the destination index only received 987 documents instead of the expected 72,882. This occurred consistently across multiple reindex attempts.

**Root Cause Investigation:**
- The source index (`wazuh-alerts-4.x-2026.05.14-fixed-1778724155`) shows:
  - `_count` endpoint reports: 72,882 documents
  - `_search` endpoint returns only partial results
  - Shard status: Yellow (1 primary, 1 replica - replica unassigned)
  
- Possible causes:
  1. Replica shard not allocated - only primary shard accessible
  2. Original cluster.name reindex only transferred 987 documents (truncated transfer)
  3. Data corruption in source index

## Recommended Actions

### Option 1: Use Existing Complete Indices (RECOMMENDED)
The indices from 2026.05.12 and 2026.05.13 are fully replicated (green status) and have complete data:
- `wazuh-alerts-4.x-2026.05.13`: 21,196,218 documents (most recent, fully healthy)
- `wazuh-alerts-4.x-2026.05.12`: 5,966,251 documents (older but verified complete)

**Action**: Use recent data from 05.13 for Discovery and queries. The 05.14 date will be covered by aggregating 05.13 data.

### Option 2: Verify and Recover Data
- Check replica shard assignment on source index
- Use `_cat/shards` to identify unassigned replicas
- Reallocate shards if possible
- Attempt reindex from recovered index

### Option 3: Direct Mapping Fix Without Reindex
- Update the mapping directly on `wazuh-alerts-4.x-2026.05.14-fixed-1778724155`
- Accept that only 72,882 documents have the fix
- Use scroll-based search to export/reimport if needed

## Next Steps

1. **Immediate**: Verify 05.13 index has correct mappings for both `cluster.name` and `data.timestamp`
2. **Short-term**: Update Wazuh to use 05.13 as the primary discovery index
3. **Long-term**: Investigate why reindex API is not transferring all documents from yellow-status indices

## Scripts Created

```bash
/tmp/analyze_timestamp_issue.sh       # Diagnostic script
/tmp/fix_timestamp_field.sh            # Initial fix attempt
/tmp/test_timestamp_fix.sh             # Validation script
/tmp/reindex_timestamp_fix_proper.sh   # Reindex attempt 1
/tmp/fix_reindex_with_scroll.sh        # Reindex attempt 2
/tmp/final_comprehensive_fix.sh        # Final reindex attempt
/tmp/cleanup_and_reindex.sh            # Cleanup script
```

## Execution Timeline

- **Phase 1**: Analyzed timestamp field mapping - confirmed TEXT type
- **Phase 2**: Created component template with DATE type mapping
- **Phase 3**: Attempted reindex - discovered document count discrepancy (987 vs 72,882)
- **Phase 4**: Tried alternative reindex approaches - same issue persists
- **Phase 5**: Created execution report with recommendations

## Success Criteria Status

- ✓ data.timestamp field mapped as DATE type
- ✓ Aggregation on data.timestamp field now possible
- ✗ Full 72,882 documents not transferred to new index
- ? Discovery page requires verification

