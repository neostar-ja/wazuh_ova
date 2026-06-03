# Alerts Page Improvements — 2026-06-03

## สรุปการปรับปรุง

### 1. MetricHero Cards ด้านบน (แทนที่ Total+Severity เดิม)
**5 การ์ดใหม่สไตล์ MetricHero:**
- **Critical** (≥15): sparkline จาก timeline, คลิกกรอง level=15
- **High** (12–14): sparkline, คลิกกรอง level=12
- **High+ Total**: Critical+High รวมกัน, คลิก level=12
- **Top Source**: แหล่งข้อมูลที่มี alert สูงสุด, คลิกกรอง source
- **Top Attacker**: Source IP โจมตีสูงสุด, คลิกกรอง srcip

**ดีไซน์:** gradient background, top accent bar 3px, watermark icon, hover lift+glow, active ring

---

### 2. Actionable Insight Panel (แทน Timeline การแจ้งเตือน)
**3 panels แนวนอน:**

#### Threat Distribution
- Donut chart จาก `stats.by_source` จริง
- คลิกแต่ละ segment เพื่อกรอง source

#### Top Rules Requiring Review
- รายการ rule ID จาก `stats.by_rule`
- Progress bar แสดงสัดส่วน
- คลิกกรอง `rule_id`

#### Top Attack Surface
- Tabs: Source IPs / Countries / Agents
- Source IPs คลิกกรอง + ปุ่ม Investigate
- Countries คลิกกรอง country
- Agents คลิกกรอง agent

---

### 3. FILTER GROUP — Dynamic จาก OpenSearch จริง
**ก่อน:** hard-code chip list 8 ตัวคงที่  
**หลัง:** ดึงจาก `stats.by_group` — แสดงเฉพาะ group ที่มีข้อมูล พร้อม count badge

กฎ:
- แสดงเฉพาะ group ที่ `count > 0`
- ใช้ `GROUP_META` map สี/ชื่อ
- เพิ่ม entries ใน GROUP_META: `ids`, `huawei_ac`, `infoblox_dhcp`, `ossec`, `threat_intel`, `cdb_intel`, `web`, `pam`, `sshd`

---

### 4. แหล่งข้อมูล (Source Filter) — Dynamic + Key Mapping ถูกต้อง
**ก่อน:** hard-code `SOURCES` array, chip click ไม่ match backend filter  
**หลัง:** ดึงจาก `stats.by_source` พร้อม `SOURCE_LABEL_TO_KEY` map

```
"MikroTik Router" → "mikrotik"
"FortiGate WUH"   → "fortigate"
"Suricata IDS"    → "suricata"
... (ฯลฯ)
```

Source dropdown ใน filter bar ก็ dynamic ด้วย

---

### 5. Default Severity = High+ (level=12)
- เปิดหน้าครั้งแรก `level = 12`
- `handleClearAll` reset เป็น 12 ไม่ใช่ 1
- มี badge "High+ default" ในหัวหน้า
- มีปุ่ม "ดูทุกระดับ" ใต้ title สำหรับ override

---

### 6. Advanced Filters — Explicit Params (ปลอดภัย)
**ก่อน:** สร้าง Lucene query_string รวมทุก filter (injection risk)  
**หลัง:** ส่ง explicit params ทีละตัว

| Filter | Param | Backend Field |
|--------|-------|---------------|
| Group | `group` | `rule.groups` (term) |
| Source IP | `srcip` | `data.srcip.keyword` |
| Dest IP | `dstip` | `data.dstip.keyword` |
| Decoder | `decoder` | `decoder.name.keyword` |
| Country | `country` | `GeoLocation.country_name.keyword` |
| Compliance | `compliance` | `rule.pci_dss` / `rule.gdpr` / etc (exists) |
| Has MITRE | `has_mitre` | `rule.mitre.tactic` (exists) |

**Filter Dropdowns ใหม่:**
- Country: dynamic จาก `stats.by_country`
- Decoder: dynamic จาก `stats.by_decoder` (fix: ใช้ `decoder.name.keyword` แทน `rule.id`)

---

### 7. Empty State ปรับปรุง
- "ไม่พบ High+ alerts ในช่วงเวลานี้" เมื่อ level≥12 ไม่พบข้อมูล
- ปุ่มแนะนำ: "แสดงทุกระดับ", "ขยายเป็น 7 วัน", "ล้างตัวกรองทั้งหมด"

---

### 8. Export CSV/JSON ใช้ filter เดียวกัน
ทุก explicit filter ถูกส่งไปกับ export request ด้วย

---

## Backend Changes

### `opensearch_service.py`
- `get_alerts()`: เพิ่ม params `group`, `srcip`, `dstip`, `decoder`, `program`, `compliance`, `has_srcip`, `has_mitre`
- `get_alert_aggs()`: เพิ่ม `track_total_hits: True`
- `by_decoder` aggregation: แก้ field จาก `rule.id` → `decoder.name.keyword`

### `alerts.py`
- `GET /alerts`: รับ params ใหม่ทั้งหมด
- `GET /alerts/facets`: endpoint ใหม่ — คืน sources (พร้อม filter key), groups, agents, countries, decoders, mitre, srcips, rules
- `GET /alerts/export`: รับ params ใหม่ครบ

## Frontend Changes

### `types/alert.ts`
- เพิ่ม `by_group`, `by_rule`, `by_country`, `by_decoder` ใน `AlertStats`
- เพิ่ม interface `AlertFacets`

### `services/api.ts`
- เพิ่ม `alertsApi.facets()`
- `alertsApi.stats()` default level เป็น 12

### `AlertsPage.tsx`
- Constants: `SOURCE_LABEL_TO_KEY`, `SOURCE_COLOR_MAP`, extend `GROUP_META`
- Components: `AlertMetricCard`, `ThreatDistributionPanel`, `TopRulesPanel`, `AttackSurfacePanel`
- State: `countryFilter` เพิ่มมา, `level` default = 12
- ลบ `composedSearchQuery` ที่ซับซ้อน → ใช้ explicit params แทน
