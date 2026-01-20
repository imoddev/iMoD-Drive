# Quick Start: CKAN Data Import

## ขั้นตอนที่ 1: ตั้งค่า Environment Variables

### 1.1 Copy template file
```bash
cp .env.template .env
```

### 1.2 เปิด Supabase Dashboard
ไปที่: https://supabase.com/dashboard/project/rayaztyesqxnbsxpvuvl/settings/api-keys/legacy

### 1.3 Copy service_role key
1. คลิกปุ่ม **"Reveal"** ที่อยู่ข้างๆ `service_role` key
2. Copy key ทั้งหมด (ขึ้นต้นด้วย `eyJ...`)

### 1.4 แก้ไขไฟล์ .env
เปิดไฟล์ `.env` และวาง service_role key:

```bash
# ไฟล์ .env
SUPABASE_URL=https://rayaztyesqxnbsxpvuvl.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdX...
```

**⚠️ สำคัญ:** อย่า commit ไฟล์ `.env` เข้า git! (มี `.gitignore` ป้องกันอยู่แล้ว)

---

## ขั้นตอนที่ 2: Import ข้อมูล

### วิธีที่ 1: ใช้ wrapper script (แนะนำ)

```bash
# Import ปี 2567
./scripts/import_ckan.sh stat_1_1_01_first_regis_vehicles_car 2567

# Import หลายปี
./scripts/import_ckan.sh stat_1_1_01_first_regis_vehicles_car 2566 2567

# ไม่ระบุปี = default (2566, 2567)
./scripts/import_ckan.sh stat_1_1_01_first_regis_vehicles_car
```

### วิธีที่ 2: ใช้ Ruby script โดยตรง

```bash
# Load env vars ก่อน
source scripts/setup_env.sh

# แล้วค่อย run
ruby scripts/import_ckan_dataset_years.rb stat_1_1_01_first_regis_vehicles_car 2567
```

### วิธีที่ 3: ตั้งค่า env vars inline

```bash
SUPABASE_URL="https://rayaztyesqxnbsxpvuvl.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="eyJ..." \
ruby scripts/import_ckan_dataset_years.rb stat_1_1_01_first_regis_vehicles_car 2567
```

---

## ผลลัพธ์ที่คาดหวัง

### Import สำเร็จ ✅
```
==================================
CKAN Import Script
==================================
Project URL: https://rayaztyesqxnbsxpvuvl.supabase.co
Dataset: stat_1_1_01_first_regis_vehicles_car
Years: 2567
==================================

Download: stat_1_1_01_first_regis_vehicles_car_mm_2567_01.csv
Ingest OK: year=2567 month=01 rows=1234 run_id={"run_id"=>1}
Download: stat_1_1_01_first_regis_vehicles_car_mm_2567_02.csv
Ingest OK: year=2567 month=02 rows=1156 run_id={"run_id"=>2}
...

==================================
✅ Import completed successfully!
==================================
```

### Error: Missing .env file ❌
```
❌ Error: .env file not found!

Please follow these steps:

1. Copy the template:
   cp .env.template .env

2. Open Supabase dashboard:
   https://supabase.com/dashboard/project/rayaztyesqxnbsxpvuvl/settings/api-keys/legacy

3. Click 'Reveal' next to service_role key and copy it

4. Edit .env file and paste the key:
   SUPABASE_SERVICE_ROLE_KEY=<paste_your_key_here>
```

---

## ตรวจสอบข้อมูลที่ Import

### เข้า Supabase SQL Editor
https://supabase.com/dashboard/project/rayaztyesqxnbsxpvuvl/sql

### Query ตัวอย่าง

**1. นับจำนวน records ต่อปี/เดือน**
```sql
SELECT year_be, month_th, COUNT(*) as record_count
FROM state_data
GROUP BY year_be, month_th
ORDER BY year_be DESC, month_th;
```

**2. ดูข้อมูลล่าสุด**
```sql
SELECT *
FROM state_data
WHERE year_be = 2567
ORDER BY created_at DESC
LIMIT 10;
```

**3. ดู Top 10 brands ในปี 2567**
```sql
SELECT brand, SUM(count) as total_vehicles
FROM state_data
WHERE year_be = 2567
GROUP BY brand
ORDER BY total_vehicles DESC
LIMIT 10;
```

**4. ดู import history**
```sql
SELECT run_id, object_path, row_count,
       ingested_at AT TIME ZONE 'Asia/Bangkok' as ingested_time
FROM ingest_runs
ORDER BY ingested_at DESC
LIMIT 20;
```

---

## Troubleshooting

### ปัญหา: HTTP 403 from CKAN
**สาเหตุ:** Proxy หรือ firewall blocking

**แก้ไข:**
```bash
# ปิด proxy
unset http_proxy https_proxy

# ลองอีกครั้ง
./scripts/import_ckan.sh stat_1_1_01_first_regis_vehicles_car 2567
```

### ปัญหา: CSV parsing failed
**สาเหตุ:** Encoding issues หรือ CSV format เปลี่ยน

**แก้ไข:**
1. ดาวน์โหลดไฟล์มาดูด้วยตนเอง
2. ตรวจสอบ column headers
3. อ่าน `ENCODING_COMPARISON.md` สำหรับรายละเอียด

### ปัญหา: RPC FAILED
**สาเหตุ:**
- Service role key ไม่ถูกต้อง
- Function `rpc_ingest_state_data` ไม่มีใน Supabase

**แก้ไข:**
1. ตรวจสอบ service role key
2. ไปที่ SQL Editor และสร้าง function ตาม schema

---

## ไฟล์ที่เกี่ยวข้อง

📄 **เอกสาร:**
- `QUICK_START.md` (ไฟล์นี้) - เริ่มต้นใช้งาน
- `ENCODING_FIX_SUMMARY.md` - สรุปการแก้ encoding issue
- `ENCODING_COMPARISON.md` - รายละเอียดทางเทคนิค
- `scripts/USAGE_EXAMPLES.md` - ตัวอย่างการใช้งานเพิ่มเติม

🔧 **Scripts:**
- `scripts/import_ckan.sh` - Wrapper script (แนะนำ)
- `scripts/import_ckan_dataset_years.rb` - Main import script
- `scripts/setup_env.sh` - Load environment variables

⚙️ **Config:**
- `.env.template` - Template สำหรับ config
- `.env` - Config จริง (ต้องสร้างเอง, ไม่ commit)

🧪 **Testing:**
- `test_encoding_simple.rb` - ทดสอบ encoding fix

---

## ขั้นตอนถัดไป

1. ✅ ตั้งค่า `.env` file
2. ✅ Import ข้อมูลทดสอบ (ปี 2567)
3. ⏭️ ตรวจสอบข้อมูลใน Supabase
4. ⏭️ Import ข้อมูลย้อนหลัง (2566, 2565, ...)
5. ⏭️ ตั้ง cron job สำหรับ auto-import รายเดือน

---

## การติดต่อและ Support

- Supabase Dashboard: https://supabase.com/dashboard/project/rayaztyesqxnbsxpvuvl
- CKAN Data Catalog: https://gdcatalog.dlt.go.th
- Dataset: https://gdcatalog.dlt.go.th/dataset/stat_1_1_01_first_regis_vehicles_car
