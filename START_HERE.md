# 🚀 เริ่มต้นใช้งาน - CKAN Import System

คุณอยู่ที่ขั้นตอนสุดท้ายแล้ว! แค่ copy service_role key จาก Supabase แล้วก็พร้อมใช้งาน

---

## ขั้นตอนที่เหลือ (3 ขั้นตอนเท่านั้น!)

### 📋 ขั้นตอนที่ 1: Copy Service Role Key

คุณเปิดหน้า Supabase API Keys ไว้แล้วที่:
```
https://supabase.com/dashboard/project/rayaztyesqxnbsxpvuvl/settings/api-keys/legacy
```

**ทำตามนี้:**
1. ✅ คลิกปุ่ม "Reveal" ข้างๆ `service_role` (ทำแล้ว)
2. ✅ คลิกปุ่ม "Copy" เพื่อ copy key
3. ✅ Key ที่ copy มาจะขึ้นต้นด้วย `eyJhbGc...`

---

### ⚙️ ขั้นตอนที่ 2: สร้างไฟล์ .env

เลือก **วิธีใดวิธีหนึ่ง** ที่คุณสะดวก:

#### วิธีที่ 1: ใช้ Python Script (แนะนำ - ง่ายที่สุด)

```bash
cd "/sessions/lucid-wizardly-ride/mnt/iMoD Drive"
python3 ../create_env_from_clipboard.py
```

Script จะถามให้คุณ paste service_role key แล้วสร้างไฟล์ `.env` ให้อัตโนมัติ

#### วิธีที่ 2: แก้ไข Manual

```bash
cd "/sessions/lucid-wizardly-ride/mnt/iMoD Drive"

# Copy template
cp .env.template .env

# Edit with nano (หรือ text editor ที่คุณชอบ)
nano .env
```

แก้ไขบรรทัดนี้:
```
SUPABASE_SERVICE_ROLE_KEY=PASTE_YOUR_KEY_HERE
```

เป็น:
```
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...  # วาง key ที่ copy มา
```

บันทึกไฟล์ (Ctrl+O, Enter, Ctrl+X ถ้าใช้ nano)

#### วิธีที่ 3: ใช้ Bash Script

```bash
cd "/sessions/lucid-wizardly-ride/mnt/iMoD Drive"
./setup_env_interactive.sh
```

---

### 🚀 ขั้นตอนที่ 3: Run Import!

```bash
cd "/sessions/lucid-wizardly-ride/mnt/iMoD Drive"

# Import ข้อมูลปี 2567
./scripts/import_ckan.sh stat_1_1_01_first_regis_vehicles_car 2567
```

**ผลลัพธ์ที่คาดหวัง:**
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

---

## 🔍 ตรวจสอบว่าสำเร็จ

### ไปที่ Supabase Table Editor:
```
https://supabase.com/dashboard/project/rayaztyesqxnbsxpvuvl/editor
```

### หรือใช้ SQL Editor:
```
https://supabase.com/dashboard/project/rayaztyesqxnbsxpvuvl/sql
```

Run query:
```sql
-- นับจำนวน records
SELECT COUNT(*) FROM state_data;

-- ดูข้อมูลล่าสุด
SELECT * FROM state_data
ORDER BY created_at DESC
LIMIT 10;
```

---

## ❓ มีปัญหา?

### ปัญหา 1: ไม่มีไฟล์ .env
```bash
cd "/sessions/lucid-wizardly-ride/mnt/iMoD Drive"
python3 ../create_env_from_clipboard.py
```

### ปัญหา 2: Permission denied
```bash
chmod +x scripts/import_ckan.sh
./scripts/import_ckan.sh stat_1_1_01_first_regis_vehicles_car 2567
```

### ปัญหา 3: HTTP 403 from CKAN
```bash
unset http_proxy https_proxy
./scripts/import_ckan.sh stat_1_1_01_first_regis_vehicles_car 2567
```

### ปัญหา 4: RPC function not found
ไปที่ SQL Editor และ run:
```sql
-- ตรวจสอบว่ามี function
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'rpc_ingest_state_data';
```

ถ้าไม่มี - ต้องสร้าง function ก่อน (ดู schema/02_create_functions.sql)

---

## 📚 เอกสารเพิ่มเติม

- **[README_CKAN_IMPORT.md](./README_CKAN_IMPORT.md)** - ภาพรวมโปรเจค
- **[QUICK_START.md](./QUICK_START.md)** - คู่มือย่อ
- **[SETUP_INSTRUCTIONS.md](./SETUP_INSTRUCTIONS.md)** - คู่มือละเอียด
- **[ENCODING_FIX_SUMMARY.md](./ENCODING_FIX_SUMMARY.md)** - สรุปการแก้ encoding
- **[scripts/USAGE_EXAMPLES.md](./scripts/USAGE_EXAMPLES.md)** - ตัวอย่างการใช้งาน

---

## 🎯 Summary

1. ✅ Copy service_role key จาก Supabase (ทำแล้ว)
2. ⏭️ Run: `python3 ../create_env_from_clipboard.py`
3. ⏭️ Run: `./scripts/import_ckan.sh stat_1_1_01_first_regis_vehicles_car 2567`
4. ⏭️ ตรวจสอบใน Supabase Dashboard

**เวลาที่ใช้:** ~5-10 นาที (รวมการ import)

---

## 💡 Tips

- ถ้า import สำเร็จครั้งแรก ลอง import ทั้งสองปี:
  ```bash
  ./scripts/import_ckan.sh stat_1_1_01_first_regis_vehicles_car 2566 2567
  ```

- ตั้ง cron job สำหรับ auto-import รายเดือน:
  ```bash
  # Edit crontab
  crontab -e

  # Run on 1st of every month at 2 AM
  0 2 1 * * cd /path/to/project && ./scripts/import_ckan.sh stat_1_1_01_first_regis_vehicles_car $(date +\%Y | sed 's/20/25/')
  ```

---

**หากมีข้อสงสัย อ่านเอกสารข้างต้น หรือตรวจสอบ error messages ที่แสดง**

**🎉 พร้อมแล้ว! ขอให้โชคดี!**
