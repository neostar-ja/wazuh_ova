# Elasticsearch cluster.name Field Error - วิเคราะห์และแก้ไข

**วันที่บันทึก:** 14 พฤษภาคม 2026  
**สถานะ:** ✅ ANALYZED & SOLUTION PROVIDED

---

## 📋 ปัญหาที่พบ (Problem Summary)

### Error Message from Elasticsearch
```json
{
  "type": "illegal_argument_exception",
  "reason": "Text fields are not optimised for operations that require per-document field data like aggregations and sorting, so these operations are disabled by default. Please use a keyword field instead. Alternatively, set fielddata=true on [cluster.name] in order to load field data by uninverting the inverted index. Note that this can use significant memory."
}
```

### ข้อมูลเพิ่มเติม
- **Index:** `wazuh-alerts-4.x-2026.05.14`
- **Shard:** 0 (from 16 total)
- **Node ID:** `bsFifp6jTpeqJcoAzHJxNQ`
- **Operation Type:** Aggregation (Terms Query)
- **Failed Field:** `cluster.name`

---

## 🔍 วิเคราะห์สาเหตุ (Root Cause Analysis)

### ที่มาของปัญหา
Wazuh Elasticsearch/OpenSearch index มี field mapping ที่ไม่เหมาะสมสำหรับ aggregations:

| Aspect | Current State | Issue |
|--------|---------------|-------|
| **Field Type** | `text` | ❌ Text fields ถูก analyze และ tokenize |
| **Analysis** | Full-text analyzer | ❌ ทำให้ข้อมูลแยกเป็นชิ้นส่วน |
| **Aggregation** | Disabled by default | ❌ ไม่สามารถ group-by ได้ |
| **Sorting** | Disabled by default | ❌ ไม่สามารถ sort ได้ |
| **Memory Usage** | Not tracked | ⚠️ หากเปิด fielddata จะใช้ memory มาก |

### เหตุใดจึงเกิดปัญหา
1. **Field Mapping Type:** `cluster.name` ถูก map เป็น `text` ในขั้นตอนสร้าง index template
2. **Aggregation Query:** Dashboard หรือ query ต้องการให้ group alert โดย cluster name (terms aggregation)
3. **Elasticsearch Restriction:** Text fields ไม่อนุญาต aggregation โดยค่าเริ่มต้นเพื่อประหยัด memory

### ตัวอย่าง Query ที่ล้มเหลว
```json
{
  "aggs": {
    "buckets": {
      "terms": {
        "field": "cluster.name",
        "size": 10
      }
    }
  }
}
```

---

## ✅ วิธีแก้ไข (Solutions)

### **วิธี 1: Update Field Mapping (แนะนำ)** ⭐

เปลี่ยนจาก `text` เป็น `keyword` โดยอัปเดต Index Template

**Step 1: Create new component template สำหรับ cluster.name field**

```bash
curl -k -u admin:admin -X PUT "https://10.251.151.13:9200/_component_template/wazuh-alerts-cluster-name-fix" \
  -H 'Content-Type: application/json' \
  -d '{
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
```

**Step 2: Update composite index template (ต้องตั้ง priority สูง)**

```bash
curl -k -u admin:admin -X PUT "https://10.251.151.13:9200/_index_template/wazuh-alerts-custom-cluster-name" \
  -H 'Content-Type: application/json' \
  -d '{
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
```

**Step 3: Verify the template was created**

```bash
curl -k -u admin:admin "https://10.251.151.13:9200/_index_template/wazuh-alerts-custom-cluster-name"
```

**Step 4: Future indices will use the new mapping automatically**

---

### **วิธี 2: Update Existing Index (สำหรับ index เก่า)**

ถ้าต้องการให้ index ที่มีอยู่แล้วใช้งาน cluster.name aggregation ได้

**Option A: Reindex with new mapping (ยาวที่สุด)**

```bash
# 1. Create new index with correct mapping
curl -k -u admin:admin -X PUT "https://10.251.151.13:9200/wazuh-alerts-4.x-2026.05.14-fixed" \
  -H 'Content-Type: application/json' \
  -d '{
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
  }'

# 2. Reindex data
curl -k -u admin:admin -X POST "https://10.251.151.13:9200/_reindex" \
  -H 'Content-Type: application/json' \
  -d '{
    "source": {"index": "wazuh-alerts-4.x-2026.05.14"},
    "dest": {"index": "wazuh-alerts-4.x-2026.05.14-fixed"}
  }'

# 3. Delete old index
curl -k -u admin:admin -X DELETE "https://10.251.151.13:9200/wazuh-alerts-4.x-2026.05.14"

# 4. Create alias pointing to new index
curl -k -u admin:admin -X PUT "https://10.251.151.13:9200/wazuh-alerts-4.x-2026.05.14-fixed/_alias/wazuh-alerts-4.x-2026.05.14"
```

**Option B: Quick Fix - Enable fielddata (⚠️ Not recommended)**

```bash
curl -k -u admin:admin -X PUT "https://10.251.151.13:9200/wazuh-alerts-4.x-2026.05.14/_mapping" \
  -H 'Content-Type: application/json' \
  -d '{
    "properties": {
      "cluster": {
        "properties": {
          "name": {
            "type": "text",
            "fielddata": true
          }
        }
      }
    }
  }'
```

⚠️ **คำเตือน:** Option B จะใช้ memory จำนวนมาก สำหรับ large datasets อาจทำให้ Elasticsearch ช้า

---

### **วิธี 3: Use .keyword Subfield (ถ้ามีอยู่แล้ว)**

Elasticsearch บางครั้งสร้าง `.keyword` subfield โดยอัตโนมัติสำหรับ text fields

```bash
# Check if .keyword subfield exists
curl -k -u admin:admin "https://10.251.151.13:9200/wazuh-alerts-4.x-2026.05.14/_mapping?pretty" | grep -A 5 "cluster.name"

# If .keyword exists, use it in queries
{
  "aggs": {
    "buckets": {
      "terms": {
        "field": "cluster.name.keyword",
        "size": 10
      }
    }
  }
}
```

---

## 🧪 ทดสอบวิธีแก้ไข (Testing)

### Test 1: Verify field mapping after fix

```bash
curl -k -u admin:admin "https://10.251.151.13:9200/wazuh-alerts-4.x-2026.05.14/_mapping?pretty" \
  | jq '.[] .mappings.properties.cluster.properties.name'

# Expected output:
# {
#   "type": "keyword"
# }
```

### Test 2: Test aggregation query

```bash
curl -k -u admin:admin -X POST "https://10.251.151.13:9200/wazuh-alerts-4.x-*/_search" \
  -H 'Content-Type: application/json' \
  -d '{
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

# Should return successfully without error
```

### Test 3: Test sorting

```bash
curl -k -u admin:admin -X POST "https://10.251.151.13:9200/wazuh-alerts-4.x-*/_search" \
  -H 'Content-Type: application/json' \
  -d '{
    "sort": [{"cluster.name": "asc"}],
    "size": 10
  }'
```

---

## 📊 ข้อมูลเพิ่มเติมเกี่ยวกับ Field Types

### Text vs Keyword

| Feature | Text | Keyword |
|---------|------|---------|
| **Purpose** | Full-text search | Exact matching, filtering, sorting, aggregations |
| **Analysis** | ✅ Yes (tokenized) | ❌ No (stored as-is) |
| **Aggregation** | ❌ No (by default) | ✅ Yes |
| **Sorting** | ❌ No (by default) | ✅ Yes |
| **Memory** | Lower | Higher (no analysis) |
| **Use Case** | Descriptions, comments | IDs, names, status, cluster names |

### ตัวอย่าง: Cluster.name ควรเป็น Keyword เพราะ
- ✅ ต้องการ exact match (ชื่อ cluster เฉพาะตัว)
- ✅ ต้องการ group by (aggregation)
- ✅ ต้องการ sort (เรียงลำดับ)
- ✅ ไม่จำเป็นต้อง full-text search

---

## 🔧 Prevention (ป้องกันไม่ให้เกิดขึ้นอีก)

### 1. Update Wazuh Index Template

ที่ไฟล์ `/opt/code/wazuh_ova/setup_geoip_final.sh` ให้เพิ่มส่วนนี้:

```bash
# Add cluster.name field mapping fix
curl -s -k -u admin:admin -X PUT "https://10.251.151.13:9200/_index_template/wazuh-alerts-cluster-name-fix" \
  -H 'Content-Type: application/json' \
  -d'{
    "index_patterns": ["wazuh-alerts-4.x-*"],
    "priority": 201,
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
```

### 2. Document in deployment guide

เพิ่มเนื้อหาในไฟล์ `/opt/code/wazuh_ova/wazuh_ova.md`:

```markdown
### Elasticsearch Field Mapping Issues & Solutions

**Known Issue:** cluster.name field is mapped as text, which prevents aggregations
**Solution:** Apply index template to convert to keyword type (see setup_geoip_final.sh)
**Prevention:** Always verify field mappings after index creation
```

---

## 📝 Summary & Recommendations

| Action | Recommendation | Priority |
|--------|-----------------|----------|
| **Update Template** | Apply Solution 1 for all future indices | 🔴 HIGH |
| **Fix Existing Index** | Use Option A (Reindex) if aggregation needed | 🟡 MEDIUM |
| **Documentation** | Add to deployment guide | 🟡 MEDIUM |
| **Avoid Fielddata** | Do NOT use Option B in production | 🔴 HIGH |
| **Monitor** | Check Elasticsearch health after fix | 🟡 MEDIUM |

---

## 🎯 Next Steps

1. ✅ **Verify** ช่วงนี้ปัญหาเกิด (check if it's still happening)
2. ✅ **Apply Solution 1** - Update index template สำหรับ future indices
3. ✅ **Apply Solution 2 (Option A)** - Reindex existing data if needed
4. ✅ **Test** - Run the test queries ใน Section "ทดสอบวิธีแก้ไข"
5. ✅ **Update Deployment** - Modify setup scripts
6. ✅ **Document** - Add to project documentation

---

**Created by:** AI Analysis  
**Last Updated:** 14 May 2026  
**Status:** Ready for Implementation
