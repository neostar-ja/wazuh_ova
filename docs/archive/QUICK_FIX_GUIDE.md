# Wazuh Elasticsearch cluster.name Field Error - Quick Fix Guide

**วันที่:** 14 พฤษภาคม 2026  
**ปัญหา:** `Text fields are not optimised for operations that require per-document field data like aggregations`

---

## 🚀 การแก้ไขอย่างรวดเร็ว (Quick Fix)

### สำหรับ Future Indices (อนาคต)
อัปเดต Index Template เพื่อให้ cluster.name ใช้ keyword type:

```bash
# Make script executable and run
chmod +x /opt/code/wazuh_ova/fix_cluster_name_field.sh
/opt/code/wazuh_ova/fix_cluster_name_field.sh
```

### สำหรับ Existing Indices (ที่มีอยู่แล้ว)
Reindex ข้อมูลเก่าให้ใช้ mapping ที่ถูกต้อง:

```bash
# Make script executable and run
chmod +x /opt/code/wazuh_ova/reindex_cluster_name_fix.sh
/opt/code/wazuh_ova/reindex_cluster_name_fix.sh
```

---

## 📋 ขั้นตอนการแก้ไข (Step-by-Step)

### 1️⃣ ทำความเข้าใจปัญหา
- **สาเหตุ:** Field `cluster.name` ถูก map เป็น `text` แทนที่ `keyword`
- **ผลกระทบ:** ไม่สามารถ aggregate (group by) ได้
- **โซลูชั่น:** เปลี่ยน field type เป็น `keyword`

### 2️⃣ อัปเดต Index Template
```bash
# ใช้ script แรก
chmod +x /opt/code/wazuh_ova/fix_cluster_name_field.sh
/opt/code/wazuh_ova/fix_cluster_name_field.sh
```

**Script นี้จะ:**
- ✅ สร้าง component template
- ✅ อัปเดต index template (priority 201)
- ✅ ทดสอบ aggregation
- ✅ แสดง status

### 3️⃣ Reindex Existing Indices (ถ้าจำเป็น)
```bash
# ใช้ script ที่สอง
chmod +x /opt/code/wazuh_ova/reindex_cluster_name_fix.sh
/opt/code/wazuh_ova/reindex_cluster_name_fix.sh
```

**Script นี้จะ:**
- ✅ หาลาดดีเดก indices ที่มี text-type cluster.name
- ✅ สร้าง indices ใหม่ด้วย keyword mapping
- ✅ Reindex ข้อมูลทั้งหมด
- ✅ ลบ indices เก่า
- ✅ สร้าง aliases
- ✅ ทดสอบ aggregation

### 4️⃣ ตรวจสอบผลลัพธ์
```bash
# ทดสอบ aggregation
curl -k -u admin:admin -X POST "https://10.251.151.13:9200/_search" \
  -H 'Content-Type: application/json' \
  -d'{
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

# ตรวจสอบ field mapping
curl -k -u admin:admin "https://10.251.151.13:9200/wazuh-alerts-4.x-*/_mapping?pretty" \
  | jq '.[] .mappings.properties.cluster.properties.name'
```

---

## 📊 ก่อนและหลัง

### ❌ Before (ปัญหา)
```json
{
  "cluster": {
    "properties": {
      "name": {
        "type": "text"  // ❌ ไม่สามารถ aggregate
      }
    }
  }
}
```

### ✅ After (แก้ไข)
```json
{
  "cluster": {
    "properties": {
      "name": {
        "type": "keyword"  // ✅ สามารถ aggregate
      }
    }
  }
}
```

---

## ⚙️ Manual Commands (ถ้า Script ไม่ทำงาน)

### Option 1: Update Template Manually
```bash
# Create component template
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

# Create index template (high priority)
curl -k -u admin:admin -X PUT "https://10.251.151.13:9200/_index_template/wazuh-alerts-custom-cluster-name-fix" \
  -H 'Content-Type: application/json' \
  -d '{
    "index_patterns": ["wazuh-alerts-4.x-*"],
    "priority": 201,
    "composed_of": ["wazuh-alerts-cluster-name-fix"]
  }'
```

### Option 2: Reindex Existing Index Manually
```bash
# สำหรับ index: wazuh-alerts-4.x-2026.05.14

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

# 2. Reindex
curl -k -u admin:admin -X POST "https://10.251.151.13:9200/_reindex" \
  -H 'Content-Type: application/json' \
  -d '{
    "source": {"index": "wazuh-alerts-4.x-2026.05.14"},
    "dest": {"index": "wazuh-alerts-4.x-2026.05.14-fixed"}
  }'

# 3. Delete old index
curl -k -u admin:admin -X DELETE "https://10.251.151.13:9200/wazuh-alerts-4.x-2026.05.14"

# 4. Create alias (optional, for backward compatibility)
curl -k -u admin:admin -X PUT "https://10.251.151.13:9200/wazuh-alerts-4.x-2026.05.14-fixed/_alias/wazuh-alerts-4.x-2026.05.14"
```

---

## ⚠️ เหตุเตือน (Important Notes)

### ✅ ปลอดภัย
- ✓ Scripts ไม่ลบ index หากไม่มี backup
- ✓ Reindex preserves all data
- ✓ Aliases ช่วยให้ old queries ยังทำงาน

### ❌ อันตราย
- ✗ Reindex ใช้ memory และ CPU
- ✗ Aggregation ที่ใช้ fielddata=true ใช้ memory มาก
- ✗ การลบ index เก่าไม่สามารถ undo ได้

### 📌 Best Practices
1. **ทำ Backup ก่อน** - Snapshot index ก่อนทำ reindex
2. **ทดสอบใน Dev** - ลอง script บน non-production index ก่อน
3. **Monitor Memory** - ตรวจสอบ memory usage ระหว่าง reindex
4. **Update Dashboards** - อาจต้อง refresh dashboards หลังจาก reindex

---

## 📝 Files Created

| File | Purpose |
|------|---------|
| `fix_cluster_name_field.sh` | Fix future indices + test aggregation |
| `reindex_cluster_name_fix.sh` | Reindex existing indices |
| `ELASTICSEARCH_CLUSTER_NAME_ERROR_ANALYSIS.md` | Detailed technical analysis |
| `QUICK_FIX_GUIDE.md` | This file |

---

## 🆘 Troubleshooting

### Problem: Script permission denied
```bash
chmod +x /opt/code/wazuh_ova/fix_cluster_name_field.sh
chmod +x /opt/code/wazuh_ova/reindex_cluster_name_fix.sh
```

### Problem: Elasticsearch connection refused
```bash
# Check if Elasticsearch is running
curl -k -u admin:admin "https://10.251.151.13:9200/_cluster/health"

# Try with different credentials
# Edit the script and change ELASTICSEARCH_USER and ELASTICSEARCH_PASS
```

### Problem: Reindex takes too long
```bash
# You can monitor progress with:
curl -k -u admin:admin "https://10.251.151.13:9200/_tasks?actions=*reindex*"
```

### Problem: Aggregation still fails after fix
```bash
# Check if you're querying old indices (not reindexed)
# Verify the mapping:
curl -k -u admin:admin "https://10.251.151.13:9200/_mapping?filter_path=**.cluster.name"
```

---

## ✅ Verification Checklist

- [ ] Script executed successfully
- [ ] No errors in output
- [ ] Aggregation test shows results
- [ ] cluster.name field type is "keyword"
- [ ] Existing dashboards still work
- [ ] New indices being created with correct mapping

---

## 📞 Support

If you encounter issues:
1. Check the detailed analysis in `ELASTICSEARCH_CLUSTER_NAME_ERROR_ANALYSIS.md`
2. Run manual commands from "Option 1" or "Option 2" section
3. Monitor Elasticsearch logs: `/var/log/wazuh-indexer/wazuh-indexer.log`
4. Check cluster health: `https://10.251.151.13:9200/_cluster/health?pretty`

---

**Created:** 14 May 2026  
**Status:** Ready for Implementation
