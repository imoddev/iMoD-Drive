# ขั้นตอนการตั้งค่า: คู่มือแบบละเอียด

## ภาพรวม

คุณกำลังจะตั้งค่าระบบ import ข้อมูลจาก CKAN (Thailand Government Data Catalog) เข้า Supabase database โดยระบบจะ:
1. ดึงข้อมูล CSV จาก CKAN API
2. แปลง encoding (Thai UTF-8)
3. Parse และ validate ข้อมูล
4. Upload ไฟล์เข้า Supabase Storage
5. Insert records เข้า database table

---

## ส่วนที่ 1: เตรียม Supabase Credentials

### ขั้นตอนที่ 1: เปิด Supabase API Keys Page

คุณได้เปิดหน้านี้ไว้แล้ว:
```
https://supabase.com/dashboard/project/rayaztyesqxnbsxpvuvl/settings/api-keys/legacy
```

หรือเข้าผ่าน:
1. ไปที่ Supabase Dashboard
2. เลือก Project: "iphonemod.net@gmail.com's Project"
3. ไปที่ Settings > API Keys
4. เลือกแท็บ "Legacy anon, service_role API keys"

### ขั้นตอนที่ 2: Copy API Keys

คุณจะเห็น 2 keys:

**1. anon (public) key:**
```
eyJ3hbGc...
```
- Key นี้ใช้สำหรับ client-side (ไม่ต้องใช้ใน import script)
- สามารถเปิดเผยได้

**2. service_role key (ปุ่ม "Reveal"):**
```
eyJhbGc... (ถูกซ่อนอยู่)
```
- **Key นี้สำคัญมาก!** ใช้ใน import script
- คลิกปุ่ม "Reveal" เพื่อแสดง
- **ห้ามแชร์ในที่สาธารณะ**

### ขั้นตอนที่ 3: บันทึก Keys

**วิธีที่ 1: สร้างไฟล์ .env (แนะนำ)**

```bash
# ใน terminal
cd /path/to/your/project
cp .env.template .env
```

แก้ไขไฟล์ `.env`:
```bash
SUPABASE_URL=https://rayaztyesqxnbsxpvuvl.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdX...
```

**วิธีที่ 2: จดไว้ใน password manager**
- 1Password, LastPass, Bitwarden, etc.
- ตั้งชื่อ: "Supabase - rayaztyesqxnbsxpvuvl - service_role"

---

## ส่วนที่ 2: ตรวจสอบ Database Schema

### ขั้นตอนที่ 1: เปิด SQL Editor

```
https://supabase.com/dashboard/project/rayaztyesqxnbsxpvuvl/sql
```

### ขั้นตอนที่ 2: ตรวจสอบ Tables

Run query นี้:

```sql
-- ดู tables ทั้งหมด
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

**ต้องมี tables เหล่านี้:**
- `state_data` - เก็บข้อมูลรถจดทะเบียนใหม่
- `ingest_runs` - เก็บประวัติการ import

### ขั้นตอนที่ 3: ตรวจสอบ Function

```sql
-- ดู functions ทั้งหมด
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name LIKE 'rpc_%';
```

**ต้องมี function:**
- `rpc_ingest_state_data` - function สำหรับ import ข้อมูล

### ถ้าไม่มี Tables/Functions

**ต้องสร้างก่อน!** ดูไฟล์:
- `schema/01_create_tables.sql`
- `schema/02_create_functions.sql`
- `schema/03_create_storage.sql`

---

## ส่วนที่ 3: ตรวจสอบ Storage Bucket

### ขั้นตอนที่ 1: เปิด Storage

```
https://supabase.com/dashboard/project/rayaztyesqxnbsxpvuvl/storage/buckets
```

### ขั้นตอนที่ 2: ตรวจสอบ Bucket

**ต้องมี bucket:**
- `state-data` (หรือตามที่ตั้งค่าไว้)

**ถ้าไม่มี - สร้างใหม่:**
1. คลิก "New bucket"
2. Name: `state-data`
3. Public: **No** (private bucket)
4. File size limit: 50 MB (หรือตามต้องการ)
5. Allowed MIME types: `text/csv, application/csv`

---

## ส่วนที่ 4: ทดสอบ Import

### ขั้นตอนที่ 1: Setup Environment

```bash
cd /path/to/your/project

# ตรวจสอบว่ามีไฟล์ .env แล้ว
cat .env
```

### ขั้นตอนที่ 2: ทดสอบ Import ไฟล์เดียว

```bash
# Import เฉพาะเดือนมกราคม 2567
./scripts/import_ckan.sh stat_1_1_01_first_regis_vehicles_car 2567
```

**ถ้าสำเร็จจะเห็น:**
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
...
```

### ขั้นตอนที่ 3: ตรวจสอบใน Supabase

**ไปที่ Table Editor:**
```
https://supabase.com/dashboard/project/rayaztyesqxnbsxpvuvl/editor
```

**หรือใช้ SQL:**
```sql
-- นับจำนวน records
SELECT COUNT(*) FROM state_data;

-- ดูข้อมูลล่าสุด
SELECT * FROM state_data
ORDER BY created_at DESC
LIMIT 10;

-- ตรวจสอบ import runs
SELECT * FROM ingest_runs
ORDER BY ingested_at DESC;
```

---

## ส่วนที่ 5: Import ข้อมูลทั้งหมด

### ถ้าการทดสอบสำเร็จ - Import ข้อมูลเต็ม

```bash
# Import ทั้ง 2566 และ 2567 (24 ไฟล์)
./scripts/import_ckan.sh stat_1_1_01_first_regis_vehicles_car 2566 2567
```

**เวลาที่คาดว่าจะใช้:**
- ~1-2 นาทีต่อไฟล์
- รวม ~30-60 นาทีสำหรับ 24 ไฟล์

**จะได้ข้อมูล:**
- มกราคม 2566 - ธันวาคม 2567
- ประมาณ 200,000-500,000 records (ขึ้นกับข้อมูลจริง)

---

## Common Issues และวิธีแก้

### Issue 1: Missing .env file

**Error:**
```
❌ Error: .env file not found!
```

**แก้ไข:**
```bash
cp .env.template .env
# แล้วแก้ไขใส่ service_role key
```

### Issue 2: Invalid service_role key

**Error:**
```
RPC FAILED HTTP 401
```

**แก้ไข:**
- ตรวจสอบว่า key ใน `.env` ถูกต้อง
- ต้องขึ้นต้นด้วย `eyJ`
- ไม่มี space หรือ newline เพิ่มเติม

### Issue 3: Function not found

**Error:**
```
RPC FAILED HTTP 404
function public.rpc_ingest_state_data does not exist
```

**แก้ไข:**
- ไปที่ SQL Editor
- Run schema/02_create_functions.sql

### Issue 4: Bucket not found

**Error:**
```
RPC FAILED: Bucket 'state-data' not found
```

**แก้ไข:**
- ไปที่ Storage > Buckets
- สร้าง bucket ชื่อ `state-data`

### Issue 5: Network/Proxy issues

**Error:**
```
HTTP 403 Forbidden
```

**แก้ไข:**
```bash
# ปิด proxy
unset http_proxy https_proxy

# ลองใหม่
./scripts/import_ckan.sh stat_1_1_01_first_regis_vehicles_car 2567
```

### Issue 6: CSV encoding errors

**Error:**
```
Skip (no valid rows): filename.csv
```

**แก้ไข:**
- อ่าน `ENCODING_COMPARISON.md`
- ตรวจสอบว่า encoding fix ยังใช้งานได้
- ลองดาวน์โหลดไฟล์มาดูด้วยตนเอง

---

## Verification Checklist

ก่อนเริ่มใช้งานจริง ตรวจสอบ:

- [ ] ✅ มีไฟล์ `.env` และมี service_role key
- [ ] ✅ Supabase project เปิดใช้งานอยู่
- [ ] ✅ Table `state_data` และ `ingest_runs` มีอยู่
- [ ] ✅ Function `rpc_ingest_state_data` มีอยู่
- [ ] ✅ Storage bucket `state-data` มีอยู่
- [ ] ✅ Scripts มี execute permission (`chmod +x`)
- [ ] ✅ ทดสอบ import ไฟล์เดียวสำเร็จแล้ว
- [ ] ✅ ตรวจสอบข้อมูลใน database แล้ว

---

## ถัดไป: Automation

### ตั้ง Cron Job สำหรับ Auto-Import

```bash
# Edit crontab
crontab -e

# เพิ่มบรรทัดนี้: run ทุกวันที่ 1 ของเดือน เวลา 02:00
0 2 1 * * cd /path/to/project && ./scripts/import_ckan.sh stat_1_1_01_first_regis_vehicles_car $(date +\%Y -d "last month" | sed 's/20/25/')
```

### หรือใช้ Supabase Edge Functions

สร้าง Edge Function ที่:
1. Trigger ทุกเดือน
2. เรียก import script
3. ส่ง notification เมื่อเสร็จ

---

## สรุป

**เสร็จแล้ว! 🎉**

คุณได้ตั้งค่าระบบ import ข้อมูลจาก CKAN เข้า Supabase เรียบร้อยแล้ว

**ขั้นตอนสุดท้าย:**
1. Copy service_role key จาก Supabase Dashboard
2. ใส่ใน `.env` file
3. Run `./scripts/import_ckan.sh stat_1_1_01_first_regis_vehicles_car 2567`
4. ตรวจสอบข้อมูลใน Supabase

**ความช่วยเหลือเพิ่มเติม:**
- `QUICK_START.md` - เริ่มต้นใช้งานแบบย่อ
- `ENCODING_FIX_SUMMARY.md` - สรุปการแก้ encoding
- `scripts/USAGE_EXAMPLES.md` - ตัวอย่างการใช้งาน
