# iMoD Drive • Thailand Vehicle Registration Stats (Supabase + n8n + Web)

ระบบนี้ทำเพื่อให้ iMoD Drive / `www.ev.iphonemod.net` แสดงสถิติการจดทะเบียนรถยนต์ในไทยแบบหลายมิติ (รายเดือน/รายปี/ประเภทรถ/ยี่ห้อ/รุ่น) และต่อยอดการวิเคราะห์ EV (ประเทศผู้ผลิต, EV vs non‑EV) ได้ในอนาคต

## โครงสร้างโปรเจกต์

- `State Data/` — ไฟล์ CSV ต้นทางตัวอย่าง (รายเดือน)
- `STATE_DATA_SUPABASE_SCHEMA.sql` — Schema หลัก (dim/fact + external tables)
- `STATE_DATA_SUPABASE_PUBLIC_RPC.sql` — RPC สำหรับหน้าเว็บ (อ่านสถิติแบบปลอดภัย)
- `STATE_DATA_SUPABASE_UPLOAD_LOGS.sql` — ตาราง log อัปโหลดจากหน้าเว็บ
- `STATE_DATA_SUPABASE_INGESTION_RUNS_RPC.sql` — RPC สำหรับดูประวัติ ingestion (ทีมงาน)
- `STATE_DATA_SUPABASE_INGEST_UI_MIGRATION.sql` — RPC ingest สำหรับหน้าอัปโหลด (authenticated)
- `STATE_DATA_SUPABASE_INGEST_FUNCTION.sql` — นิยามฟังก์ชัน ingest (เหมือนไฟล์ migration แต่แยกอ่านง่าย)
- `STATE_DATA_SUPABASE_N8N_PLAN.md` — แผนงานรวม (Storage/DB/n8n/หน้าเว็บ)
- `STATE_DATA_N8N_INGESTION_WORKFLOW.json` — workflow n8n (ไฟล์นำเข้าไป import ใน n8n)
- `scripts/backfill_state_data_to_supabase.rb` — backfill แบบ manual (โหลด CSV เข้า DB)
- `web/` — static web app (ภาพรวมตลาด/สำรวจข้อมูล/อัปโหลด/Log)

## แนวคิดสำคัญ (ต้องเข้าใจ)

1) อัปโหลดไฟล์เข้า **Supabase Storage** อย่างเดียว “ยังไม่ทำให้เว็บมีข้อมูล”
2) หน้าเว็บ “ภาพรวมตลาด” อ่านข้อมูลจาก **ตารางใน DB** (`fact_registrations`) ผ่าน RPC
3) ดังนั้นต้องมีขั้นตอน **Ingestion (parse CSV → insert/upsert ลงตาราง)** ก่อนเสมอ

## Supabase: โครงสร้างข้อมูล

### ตารางหลัก (สถิติ)
- `public.ingestion_runs` — log การ ingest ต่อไฟล์ (running/succeeded/failed)
- `public.dim_time` / `public.dim_vehicle_type` / `public.dim_brand` / `public.dim_model`
- `public.fact_registrations` — จำนวนจดทะเบียนต่อ (เดือน/ประเภทรถ/ยี่ห้อ/รุ่น)

### ตารางเสริม (ทำมิติ EV)
- `public.dim_country`, `public.brand_profile`, `public.model_profile`

### ตารางเสริม (แหล่งข้อมูลภายนอก Manual/API/RSS)
- `public.external_sources`, `public.external_runs`, `public.external_items`, `public.external_metrics`

### ความปลอดภัย (RLS)
- ระบบตั้งใจให้ “ตารางฐาน” ถูกเปิด RLS และหน้าเว็บอ่านผ่าน RPC เท่านั้น
- ฝั่ง ingest (n8n/backfill) ต้องใช้ service role / DB connection ฝั่งหลังบ้าน
- การ ingest จากหน้า “อัปโหลด” จะใช้ RPC `rpc_ingest_state_data` และให้สิทธิ์เฉพาะผู้ใช้ที่ล็อกอิน (role `authenticated`)

## Supabase Storage (สำหรับไฟล์ CSV)

### Buckets
- `state-data` (private) — เก็บไฟล์ CSV ต้นทาง
- `external-data` (private) — สำหรับ Manual/API/RSS (optional)

### Path ที่แนะนำ
- `state-data/raw/{year_be}/{month_num}/sttt_car_new_reg_mm_{year_be}_{month_num}.csv`
  - ตัวอย่าง: `raw/2568/05/sttt_car_new_reg_mm_2568_05.csv`

## เว็บแอป (Static)

### หน้าเว็บทำอะไรได้
- **ภาพรวมตลาด**: ยอดรวมรายเดือน, สัดส่วนประเภทรถ (เดือนล่าสุด), top brands/models
- **สำรวจข้อมูล**: drilldown/filter (ปี/เดือน/ประเภทรถ/ยี่ห้อ/powertrain)
- **อัปโหลด**: ล็อกอินทีมงาน → อัปโหลด CSV เข้า `state-data/raw/...`
- **Log**:
  - `upload_logs` (ประวัติอัปโหลดผ่านหน้าเว็บ)
  - `ingestion_runs` (ประวัติ ingest เพื่อตรวจว่าทำไมกราฟไม่ขึ้น)

### วิธีรันเว็บ (local)
- จากโฟลเดอร์โปรเจกต์:
  - `ruby -run -e httpd web -p 8001`
  - เปิด `http://localhost:8001/`
- ถ้าเจอ `Address already in use` ให้เปลี่ยนพอร์ตเป็น `8002`, `8003`, …

### ตั้งค่า Supabase สำหรับหน้าเว็บ
- `web/config.js` เก็บ `SUPABASE_URL` และ key สำหรับฝั่ง browser (แนะนำ publishable key)
- ถ้าต้องการแก้ไข: ดู `web/config.example.js`

## การนำข้อมูลจาก Storage เข้า DB (Ingestion)

### ทางเลือก A: n8n (แนะนำสำหรับการใช้งานจริง)
แนวคิด:
- Trigger หลังอัปโหลดไฟล์เข้า `state-data/raw/...`
- n8n download CSV → parse → upsert dims → insert facts → update `ingestion_runs` เป็น `succeeded`

ไฟล์สำหรับเริ่มต้น:
- `STATE_DATA_N8N_INGESTION_WORKFLOW.json` (นำไป import ใน n8n แล้วปรับ credentials/endpoint)

### ทางเลือก B: Manual backfill (เหมาะสำหรับเริ่มต้น/ทดสอบ)
ใช้สคริปต์:
- `scripts/backfill_state_data_to_supabase.rb`

ตัวอย่าง (แนะนำใช้ service role เฉพาะฝั่งทีมงาน/เซิร์ฟเวอร์เท่านั้น):
- `SUPABASE_URL="https://<project_ref>.supabase.co" SUPABASE_SERVICE_ROLE_KEY="<service-role>" ruby scripts/backfill_state_data_to_supabase.rb "State Data/sttt_car_new_reg_mm_2568_05.csv" "raw/2568/05/sttt_car_new_reg_mm_2568_05.csv"`

หมายเหตุ:
- สคริปต์นี้ “อ่านไฟล์ CSV จากเครื่อง” แล้วเรียก RPC `rpc_ingest_state_data` เพื่อ insert เข้า DB
- ไม่ได้ download จาก Storage (เหมาะสำหรับ backfill ครั้งแรก)

### การอัปโหลดผ่านหน้าเว็บแล้ว ingest อัตโนมัติ
- ในแท็บ **อัปโหลด** ของเว็บ ระบบจะ parse CSV ในเบราว์เซอร์และเรียก `rpc_ingest_state_data` ทันทีหลังอัปโหลดสำเร็จ
- ต้องล็อกอินเป็นทีมงาน (Supabase Auth) และมี permission เรียก RPC นี้ (เราให้เฉพาะ role `authenticated`)

## นำเข้าข้อมูลจาก CKAN Data API (datagov.mot.go.th)

ตัวอย่าง resource (มิถุนายน 2568):
- `https://datagov.mot.go.th/dataset/dataset_stat_1_001/resource/09bd50af-90ab-4d2e-b067-4589a621a241`

ทดสอบเรียก API:
- `https://datagov.mot.go.th/api/3/action/datastore_search?resource_id=09bd50af-90ab-4d2e-b067-4589a621a241&limit=1`

นำเข้าเข้า Supabase (ต้องใช้ service role key):
- `SUPABASE_URL="https://<project_ref>.supabase.co" SUPABASE_SERVICE_ROLE_KEY="<service-role>" ruby scripts/import_ckan_resource_to_supabase.rb 09bd50af-90ab-4d2e-b067-4589a621a241 raw/2568/06/ckan_09bd50af.json`

## Troubleshooting

### เว็บขึ้น “ไม่มีข้อมูล” ทั้งที่ Storage มีไฟล์แล้ว
- ตรวจว่า `public.ingestion_runs` มี `status='succeeded'` หรือยัง
- ถ้าไม่มี แปลว่ายังไม่ได้ ingest เข้า DB → ต้องตั้งค่า n8n หรือรัน backfill

### แท็บ “Log” ไม่มีข้อมูล
- `upload_logs` จะมีข้อมูลเมื่ออัปโหลดผ่านหน้าเว็บเท่านั้น (ถ้าอัปโหลดผ่าน Dashboard จะไม่เกิด log)

## ขั้นตอนแนะนำสำหรับใช้งานจริง (Production checklist)

- ตั้งค่า Supabase Auth ให้เป็น “ทีมงานเท่านั้น” (ปิด public signups หรือใช้ allowlist)
- ตั้งค่า n8n ให้ ingest อัตโนมัติเมื่อมีไฟล์ใหม่
- เติม `model_profile.powertrain` และ `brand_profile.origin_country_id` เพื่อทำหน้า EV analytics
- Deploy web แบบ static hosting (Cloudflare Pages / Vercel / Netlify) แล้วตั้งค่า URL redirect สำหรับ magic link ให้ถูกต้อง
