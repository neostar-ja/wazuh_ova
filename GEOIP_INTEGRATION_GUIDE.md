# 🌍 Wazuh GeoIP Integration Guide (MaxMind GeoLite2)

คู่มือนี้จะอธิบายขั้นตอนการตั้งค่า Wazuh Indexer (OpenSearch) เพื่อให้สามารถดึงข้อมูลที่ตั้งทางภูมิศาสตร์ (GeoIP) จาก `data.srcip` และ `data.dstip` โดยใช้ฐานข้อมูล GeoLite2 ของ MaxMind 

## 1. การดาวน์โหลดและตั้งค่าอัปเดต GeoLite2 อัตโนมัติ (บน Wazuh Indexer)

คุณจำเป็นต้องมีบัญชี MaxMind (ฟรี) เพื่อรับ License Key สำหรับดาวน์โหลดฐานข้อมูล `GeoLite2-City`

### 1.1 สร้างสคริปต์ดาวน์โหลดและอัปเดตอัตโนมัติ

สร้างไฟล์สคริปต์ `/usr/local/bin/update-geoip.sh` บนเครื่อง Wazuh Indexer:

```bash
sudo nano /usr/local/bin/update-geoip.sh
```

ใส่โค้ดต่อไปนี้ลงในไฟล์ (อย่าลืมเปลี่ยน `YOUR_LICENSE_KEY` เป็น License Key ของคุณ):

```bash
#!/bin/bash

LICENSE_KEY="YOUR_LICENSE_KEY"
DB_DIR="/etc/wazuh-indexer/ingest-geoip"
TEMP_FILE="/tmp/GeoLite2-City.mmdb.tar.gz"

mkdir -p $DB_DIR

# Download the latest database
curl -L -o $TEMP_FILE "https://download.maxmind.com/app/geoip_download?edition_id=GeoLite2-City&license_key=$LICENSE_KEY&suffix=tar.gz"

# Extract the database
tar -xzf $TEMP_FILE -C /tmp

# Move the mmdb file to the opensearch config directory
find /tmp -name "GeoLite2-City.mmdb" -exec cp {} $DB_DIR/ \;

# Set permissions
chown -R wazuh-indexer:wazuh-indexer $DB_DIR
chmod 644 $DB_DIR/GeoLite2-City.mmdb

# Clean up
rm -rf /tmp/GeoLite2*

echo "GeoIP Database updated successfully!"
```

### 1.2 กำหนดสิทธิ์และตั้งเวลาอัปเดต (Cron Job)

ให้สิทธิ์ Execute และเพิ่ม Cron Job เพื่อดาวน์โหลดอัปเดตใหม่ทุกสัปดาห์ (วันอาทิตย์เที่ยงคืน):

```bash
sudo chmod +x /usr/local/bin/update-geoip.sh
sudo /usr/local/bin/update-geoip.sh # รันครั้งแรก

# เพิ่มเข้า Cron
(crontab -l 2>/dev/null; echo "0 0 * * 0 /usr/local/bin/update-geoip.sh > /dev/null 2>&1") | crontab -
```

---

## 2. การกำหนด OpenSearch Index Template สำหรับ DestLocation

ตามค่าเริ่มต้นของ Wazuh ฟิลด์ `GeoLocation.location` ถูกตั้งเป็นพิกัด (geo_point) อยู่แล้ว แต่เราต้องกำหนดให้ `DestLocation.location` เป็น `geo_point` ด้วย เพื่อใช้แสดงในแผนที่

รันคำสั่ง API ต่อไปนี้ที่ OpenSearch Dashboards (เมนู Dev Tools) หรือผ่าน curl เพื่ออัปเดต Template:

```json
PUT _index_template/wazuh-alerts-custom-geoip
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
}
```

---

## 3. การสร้าง Ingest Pipeline สำหรับ Source และ Destination IP

ต้องตั้งค่า Ingest Pipeline ใน Wazuh Indexer (OpenSearch) ให้ทำการแปลง IP เป็นพิกัด 

ไปที่เมนู **Dev Tools** ใน Wazuh Dashboard แล้วรันคำสั่งต่อไปนี้เพื่อสร้าง Pipeline ชื่อ `wazuh-geoip-pipeline`:

```json
PUT _ingest/pipeline/wazuh-geoip-pipeline
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
}
```

---

## 4. เชื่อมต่อ Pipeline ให้ใช้งานกับ Index อัตโนมัติ

เปิดการทำงาน Pipeline เป็นค่าตั้งต้นสำหรับดัชนี wazuh-alerts โดยรัน:

```json
PUT _index_template/wazuh-alerts-default-pipeline
{
  "index_patterns": ["wazuh-alerts-4.x-*"],
  "priority": 200,
  "template": {
    "settings": {
      "index.default_pipeline": "wazuh-geoip-pipeline"
    }
  }
}
```

**หมายเหตุ**: หลังจากตั้งค่าเสร็จสิ้น ข้อมูล Log ที่เข้ามาใหม่จะมีฟิลด์ `GeoLocation` และ `DestLocation` เพิ่มเติม และจะปรากฏในแผนที่ภูมิศาสตร์ (Geo Map) ตามที่สร้างไว้ใน Dashboard ของอุปกรณ์ต่างๆ
