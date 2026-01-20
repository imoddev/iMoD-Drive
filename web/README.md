# iMoD Drive Stats (Static Web App)

เว็บนี้เป็นหน้าแสดงสถิติจาก Supabase โดยเรียกผ่าน RPC functions (เช่น `rpc_monthly_totals`) ที่ถูกสร้างไว้ในฐานข้อมูลแล้ว

## ตั้งค่า

1) สร้างไฟล์ `web/config.js` จากตัวอย่าง:
- คัดลอก `web/config.example.js` เป็น `web/config.js`
- ใส่ค่า `SUPABASE_URL` และ `SUPABASE_KEY` (แนะนำใช้ publishable key)

2) รัน static server (แนะนำ เพื่อให้ `import` ทำงาน ไม่ติดข้อจำกัด `file://`)
- ถ้ารันจากโฟลเดอร์โปรเจกต์ (มีโฟลเดอร์ `web/`):
  - `ruby -run -e httpd web -p 8001`
- ถ้ารันจากในโฟลเดอร์ `web/`:
  - `ruby -run -e httpd . -p 8001`
- ถ้าเจอ `Address already in use` ให้เปลี่ยนพอร์ตเป็น `8002`, `8003`, …

3) เปิดเว็บ
- `http://localhost:8001/`

## ต้องมีอะไรใน Supabase ก่อน

- Tables/migrations จาก `STATE_DATA_SUPABASE_SCHEMA.sql`
- RPC migration `state_data_public_rpc` (ผมสร้างให้แล้วในโปรเจกต์นี้)
- ต้องมีข้อมูลถูก “นำเข้าเข้า DB” แล้วอย่างน้อย 1 เดือน (ดู `public.ingestion_runs.status = 'succeeded'`)

## ทำไมอัปโหลดแล้วแต่หน้า “ภาพรวมตลาด” ยังไม่ขึ้น

หน้าเว็บไม่ได้อ่านไฟล์จาก Storage โดยตรง แต่เรียกสถิติจากตาราง `fact_registrations` ผ่าน RPC
ดังนั้นหลังอัปโหลดไฟล์เข้า Storage ต้องมีขั้นตอน ingest เพื่อ insert ลงตารางด้วย

ทางเลือกที่แนะนำ:
- ใช้ n8n (automation): trigger หลังอัปโหลด → download CSV → parse → insert/upsert ลงตาราง → อัปเดต `ingestion_runs`
- ใช้ backfill ครั้งเดียว (manual): รันสคริปต์ `scripts/backfill_state_data_to_supabase.rb` เพื่อโหลด CSV เข้า DB

ตัวอย่าง backfill (แนะนำใช้ service role key เฉพาะฝั่งเครื่องทีมงาน/เซิร์ฟเวอร์เท่านั้น):
- `SUPABASE_URL="https://<project_ref>.supabase.co" SUPABASE_SERVICE_ROLE_KEY="<service-role>" ruby scripts/backfill_state_data_to_supabase.rb "State Data/sttt_car_new_reg_mm_2568_05.csv" "raw/2568/05/sttt_car_new_reg_mm_2568_05.csv"`

## อัปโหลดไฟล์ผ่านหน้าเว็บ (UI Upload)

มีแท็บ **อัปโหลด** สำหรับทีมงานเพื่ออัปโหลด CSV เข้า Supabase Storage:
- bucket: `state-data`
- path: `raw/{year_be}/{month_num}/<filename>.csv`

### ดูประวัติการอัปโหลด

ในแท็บ **อัปโหลด** จะมีตาราง “ประวัติการอัปโหลด (Log)” แสดงรายการล่าสุด (50 รายการ)
โดยระบบจะบันทึกลงตาราง `public.upload_logs` หลังอัปโหลดสำเร็จ/ล้มเหลว

### อัปโหลดแล้ว “บันทึกเข้า DB” ทันที

หน้าอัปโหลดจะ:
1) อัปโหลดไฟล์ไปที่ `state-data/raw/...`
2) parse CSV ในเบราว์เซอร์
3) เรียก RPC `rpc_ingest_state_data` เพื่อ upsert ลงตาราง `dim_*` และ insert ลง `fact_registrations`
4) สร้าง `ingestion_runs` เป็น `succeeded` (ดูได้จากตาราง “ประวัติการนำเข้าข้อมูล (Ingestion)”)

หมายเหตุ: ถ้าเพิ่งอัปเดตระบบ ให้ apply migration ใน `STATE_DATA_SUPABASE_INGEST_UI_MIGRATION.sql` เพื่อ grant สิทธิ์ให้ role `authenticated` เรียก RPC ได้

### กรณีไฟล์อยู่ใน Storage แล้ว (ไม่อยากอัปโหลดซ้ำ)

ในแท็บ **อัปโหลด** มีบล็อก “นำเข้าข้อมูลจากไฟล์ที่อยู่ใน Storage แล้ว”:
- ใส่ object path เช่น `raw/2568/04/sttt_car_new_reg_mm_2568_04.csv`
- ระบบจะ download จาก Storage แล้ว ingest เข้า DB ให้

### สิ่งที่ต้องตั้งค่าใน Supabase

1) ต้องมี bucket `state-data` (และ `external-data` ถ้าจะใช้)
2) ต้องมี storage policies ให้ผู้ใช้ที่ login แล้ว upload ได้

ผมสร้าง migration ให้แล้วชื่อ `state_data_storage_buckets_policies` (ผ่าน MCP) ซึ่งจะ:
- สร้าง buckets: `state-data`, `external-data` (private)
- สร้าง policy ให้ role `authenticated`:
  - upload/read ใน `state-data/raw/*`
  - upload/read ใน `external-data/{manual,api,rss}/*`

### สิ่งที่ต้องมีใน Supabase Auth

- สร้างผู้ใช้ทีมงานใน Supabase Auth (Email/Password หรือ Magic link)
- แนะนำปิดการสมัครเอง (Disable public signups) ถ้าระบบเป็นหลังบ้านทีมงาน
