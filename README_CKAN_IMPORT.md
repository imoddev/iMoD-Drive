# CKAN to Supabase Data Import System

ระบบนำเข้าข้อมูลสถิติรถจดทะเบียนใหม่จาก Thailand Government Data Catalog (CKAN) เข้าสู่ Supabase database

---

## 🎯 จุดเด่น

✅ **รองรับภาษาไทย** - แก้ปัญหา encoding UTF-8, BOM
✅ **Auto-deduplication** - ตรวจสอบ SHA256 ก่อน import
✅ **Storage integration** - เก็บไฟล์ต้นฉบับใน Supabase Storage
✅ **Error handling** - Skip ไฟล์ที่มีปัญหา แจ้งเตือนชัดเจน
✅ **Flexible** - เลือก import ปีใดก็ได้

---

## 📋 ข้อมูลที่รองรับ

**Dataset:** สถิติรถยนต์จดทะเบียนใหม่ตามยี่ห้อและรุ่น รายเดือน
- **CKAN ID:** `stat_1_1_01_first_regis_vehicles_car`
- **แหล่งที่มา:** กรมการขนส่งทางบก (DLT)
- **URL:** https://gdcatalog.dlt.go.th/dataset/stat_1_1_01_first_regis_vehicles_car

**ข้อมูลที่ import:**
- ปี พ.ศ.
- เดือน (ภาษาไทย)
- ประเภทรถ
- ยี่ห้อ
- รุ่น
- จำนวน

---

## 🚀 Quick Start

### 1. Setup credentials

```bash
# Copy template
cp .env.template .env

# Edit and add your Supabase service_role key
# Get key from: https://supabase.com/dashboard/project/rayaztyesqxnbsxpvuvl/settings/api-keys/legacy
```

### 2. Import data

```bash
# Import ปี 2567
./scripts/import_ckan.sh stat_1_1_01_first_regis_vehicles_car 2567

# Import หลายปี
./scripts/import_ckan.sh stat_1_1_01_first_regis_vehicles_car 2566 2567
```

### 3. Verify

```sql
-- Check imported data
SELECT year_be, COUNT(*)
FROM state_data
GROUP BY year_be
ORDER BY year_be DESC;
```

**📖 คำแนะนำละเอียด:** อ่าน [SETUP_INSTRUCTIONS.md](./SETUP_INSTRUCTIONS.md)

---

## 📁 โครงสร้างโปรเจค

```
.
├── README_CKAN_IMPORT.md          # ไฟล์นี้
├── QUICK_START.md                 # เริ่มต้นใช้งานแบบย่อ
├── SETUP_INSTRUCTIONS.md          # คู่มือตั้งค่าแบบละเอียด
├── ENCODING_FIX_SUMMARY.md        # สรุปการแก้ encoding issue
├── ENCODING_COMPARISON.md         # รายละเอียดทางเทคนิค
│
├── .env.template                  # Template สำหรับ config
├── .env                           # Config จริง (ต้องสร้างเอง)
│
├── scripts/
│   ├── import_ckan.sh             # 🔧 Wrapper script (แนะนำ)
│   ├── import_ckan_dataset_years.rb  # Main import script
│   ├── setup_env.sh               # Load environment variables
│   └── USAGE_EXAMPLES.md          # ตัวอย่างการใช้งานเพิ่มเติม
│
└── schema/                        # Database schema (ถ้ามี)
    ├── 01_create_tables.sql
    ├── 02_create_functions.sql
    └── 03_create_storage.sql
```

---

## 🔧 Requirements

### Software
- **Ruby** >= 2.7
- **curl** (for testing)
- **jq** (optional, for JSON parsing)

### Supabase Setup
- **Project URL:** `https://rayaztyesqxnbsxpvuvl.supabase.co`
- **Service Role Key:** (get from dashboard)
- **Tables:** `state_data`, `ingest_runs`
- **Function:** `rpc_ingest_state_data`
- **Storage Bucket:** `state-data`

---

## 🔑 Environment Variables

```bash
# Required
SUPABASE_URL=https://rayaztyesqxnbsxpvuvl.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# Optional
CKAN_BASE_URL=https://gdcatalog.dlt.go.th
```

---

## 💡 ตัวอย่างการใช้งาน

### Import ปีเดียว
```bash
./scripts/import_ckan.sh stat_1_1_01_first_regis_vehicles_car 2567
```

### Import หลายปี
```bash
./scripts/import_ckan.sh stat_1_1_01_first_regis_vehicles_car 2565 2566 2567
```

### Import แบบ default (2566, 2567)
```bash
./scripts/import_ckan.sh stat_1_1_01_first_regis_vehicles_car
```

### Dry run (ถ้าต้องการเพิ่มฟีเจอร์นี้)
```bash
DRY_RUN=true ruby scripts/import_ckan_dataset_years.rb stat_1_1_01_first_regis_vehicles_car 2567
```

---

## 🔍 การตรวจสอบข้อมูล

### ผ่าน Supabase Dashboard

**Table Editor:**
```
https://supabase.com/dashboard/project/rayaztyesqxnbsxpvuvl/editor
```

**SQL Editor:**
```
https://supabase.com/dashboard/project/rayaztyesqxnbsxpvuvl/sql
```

### SQL Queries

**จำนวน records ทั้งหมด:**
```sql
SELECT COUNT(*) FROM state_data;
```

**สรุปตามปี/เดือน:**
```sql
SELECT year_be, month_th, COUNT(*) as records, SUM(count) as total_vehicles
FROM state_data
GROUP BY year_be, month_th
ORDER BY year_be DESC, month_th;
```

**Top brands:**
```sql
SELECT brand, SUM(count) as total
FROM state_data
WHERE year_be = 2567
GROUP BY brand
ORDER BY total DESC
LIMIT 10;
```

**Import history:**
```sql
SELECT run_id, object_path, row_count,
       ingested_at AT TIME ZONE 'Asia/Bangkok' as ingested_time
FROM ingest_runs
ORDER BY ingested_at DESC
LIMIT 20;
```

---

## ⚠️ Troubleshooting

### Error: Missing .env file
```bash
cp .env.template .env
# แก้ไขใส่ service_role key
```

### Error: HTTP 403 from CKAN
```bash
# ปิด proxy
unset http_proxy https_proxy
# ลองใหม่
```

### Error: Function not found
```sql
-- ไปที่ SQL Editor และสร้าง function
-- ดู schema/02_create_functions.sql
```

### Error: CSV parsing failed
- อ่าน `ENCODING_COMPARISON.md`
- ตรวจสอบว่า encoding fix ใช้งานได้
- ดาวน์โหลดไฟล์มาตรวจสอบด้วยตนเอง

**เพิ่มเติม:** ดู [SETUP_INSTRUCTIONS.md - Common Issues](./SETUP_INSTRUCTIONS.md#common-issues-และวิธีแก้)

---

## 🎓 เอกสารประกอบ

### สำหรับผู้ใช้งาน
- **[QUICK_START.md](./QUICK_START.md)** - เริ่มต้นใช้งานแบบย่อ
- **[SETUP_INSTRUCTIONS.md](./SETUP_INSTRUCTIONS.md)** - คู่มือตั้งค่าแบบละเอียด
- **[scripts/USAGE_EXAMPLES.md](./scripts/USAGE_EXAMPLES.md)** - ตัวอย่างการใช้งาน

### สำหรับนักพัฒนา
- **[ENCODING_FIX_SUMMARY.md](./ENCODING_FIX_SUMMARY.md)** - สรุปการแก้ encoding issue
- **[ENCODING_COMPARISON.md](./ENCODING_COMPARISON.md)** - รายละเอียดทางเทคนิค (before/after)

---

## 🧪 Testing

### ทดสอบ encoding logic
```bash
ruby test_encoding_simple.rb
```

**ผลลัพธ์ที่คาดหวัง:**
```
✓ ALL TESTS PASSED!
✓ All year fields parsed correctly
✓ All month fields parsed correctly
✓ Thai headers are parsed correctly
```

---

## 🔒 Security Notes

**⚠️ สำคัญ:**
- **อย่า commit** ไฟล์ `.env` เข้า git
- **ห้ามแชร์** service_role key ในที่สาธารณะ
- service_role key มีสิทธิ์เต็มใน database
- ใช้ password manager เก็บ credentials

**Best practices:**
- เพิ่ม `.env` ใน `.gitignore` (ทำไว้แล้ว)
- Rotate keys เป็นระยะ
- ใช้ Row Level Security (RLS) ใน production

---

## 📊 Data Schema

### Table: `state_data`

| Column | Type | Description |
|--------|------|-------------|
| id | bigint | Primary key |
| year_be | integer | ปี พ.ศ. |
| month_th | text | เดือน (ภาษาไทย) |
| vehicle_type | text | ประเภทรถ |
| brand | text | ยี่ห้อ |
| model | text | รุ่น |
| count | integer | จำนวน |
| created_at | timestamp | วันที่สร้าง record |

### Table: `ingest_runs`

| Column | Type | Description |
|--------|------|-------------|
| run_id | bigint | Primary key |
| object_path | text | Path ใน Storage |
| file_sha256 | text | SHA256 hash |
| row_count | integer | จำนวน rows |
| ingested_at | timestamp | วันที่ import |

---

## 🚀 Next Steps

### 1. Import ข้อมูลย้อนหลัง
```bash
# Import ปี 2563-2567
for year in 2563 2564 2565 2566 2567; do
  ./scripts/import_ckan.sh stat_1_1_01_first_regis_vehicles_car $year
done
```

### 2. ตั้ง Automation
- Cron job สำหรับ monthly import
- หรือใช้ Supabase Edge Functions
- ตั้ง monitoring และ alerts

### 3. สร้าง API/Dashboard
- Supabase REST API (auto-generated)
- Supabase Realtime (optional)
- Build frontend dashboard

### 4. เพิ่ม Datasets อื่น
- ใช้ pattern เดียวกันสำหรับ datasets อื่นใน CKAN
- แก้ไข column mappings ตามต้องการ

---

## 📝 License

(ใส่ license ของโปรเจคที่นี่)

---

## 🤝 Contributing

(ถ้ามี contributing guidelines)

---

## 📧 Contact

- **Project:** Supabase Dashboard - https://supabase.com/dashboard/project/rayaztyesqxnbsxpvuvl
- **Data Source:** CKAN - https://gdcatalog.dlt.go.th
- **Email:** iphonemod.net@gmail.com

---

## 🙏 Acknowledgments

- **กรมการขนส่งทางบก (DLT)** - ผู้ให้ข้อมูล
- **Thailand Government Data Catalog** - แพลตฟอร์ม CKAN
- **Supabase** - Backend as a Service

---

**เวอร์ชัน:** 1.0.0
**อัปเดตล่าสุด:** January 2026
**สถานะ:** ✅ Production Ready
