# 🔄 n8n Daily CKAN Import Setup

## Overview

Workflow นี้จะดึงข้อมูลจากกรมการขนส่งทางบก (DLT) ผ่าน CKAN API แล้ว import เข้า Supabase **ทุกวัน เวลา 06:00 น.**

---

## 📁 ไฟล์ที่เกี่ยวข้อง

- `n8n_daily_ckan_import.json` - Workflow สำหรับ import

---

## 🚀 วิธี Setup

### Step 1: Import Workflow

1. เปิด n8n Dashboard
2. ไปที่ **Workflows** → **Import from File**
3. เลือกไฟล์ `n8n_daily_ckan_import.json`

### Step 2: ตั้งค่า Credentials

#### Supabase Service Role (HTTP Header Auth)

1. ไปที่ **Credentials** → **New Credential**
2. เลือก **Header Auth**
3. ตั้งค่า:
   - **Name:** `Supabase Service Role`
   - **Header Name:** `apikey`
   - **Header Value:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJheWF6dHllc3F4bmJzeHB2dXZsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODQ1Nzg3NiwiZXhwIjoyMDg0MDMzODc2fQ.zZ9TFLRzJKkO5G81V4czuBcCCZJOn0mIp108Vo2fcmU`

4. เพิ่ม Header อีกอัน:
   - **Header Name:** `Authorization`
   - **Header Value:** `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJheWF6dHllc3F4bmJzeHB2dXZsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODQ1Nzg3NiwiZXhwIjoyMDg0MDMzODc2fQ.zZ9TFLRzJKkO5G81V4czuBcCCZJOn0mIp108Vo2fcmU`

### Step 3: เชื่อม Credential กับ Node

1. เปิด Workflow ที่ import มา
2. คลิกที่ node **"Insert to Supabase"**
3. เลือก Credential ที่สร้างไว้

### Step 4: Test Run

1. คลิก **Execute Workflow** (ปุ่ม Play)
2. ดูผลลัพธ์ที่แต่ละ node

### Step 5: Activate

1. Toggle **Active** เป็น ON
2. Workflow จะรันอัตโนมัติทุกวัน 06:00 น.

---

## 🔧 Workflow Flow

```
[Schedule: Daily 6 AM]
        ↓
[Prepare Parameters] → คำนวณปี/เดือน
        ↓
[Get Dataset Info] → ดึงรายการ resources จาก CKAN
        ↓
[Find Latest Resource] → หา CSV ล่าสุด
        ↓
[Download CSV] → ดาวน์โหลดไฟล์
        ↓
[Parse CSV] → แปลงเป็น JSON
        ↓
[Transform Data] → แปลง column names ให้ตรง schema
        ↓
[Insert to Supabase] → เรียก RPC function
        ↓
[Format Result] → สรุปผล
```

---

## ⚙️ การปรับแต่ง

### เปลี่ยนเวลา Trigger

แก้ไข node **"Daily 6 AM"**:
- `triggerAtHour: 6` → เปลี่ยนเป็นชั่วโมงที่ต้องการ (0-23)

### เพิ่ม Notification

สามารถเพิ่ม node เช่น:
- **Slack** - แจ้งเตือนเมื่อ import สำเร็จ/ล้มเหลว
- **Email** - ส่ง summary report

---

## 🐛 Troubleshooting

### Error: "No CSV resources found"
- CKAN อาจยังไม่มีข้อมูลเดือนล่าสุด
- รอกรมขนส่งอัพเดท (ปกติกลางเดือนถัดไป)

### Error: HTTP 403 from CKAN
- CKAN อาจมี rate limiting
- รอสักครู่แล้วลองใหม่

### Error: RPC function not found
- ตรวจสอบว่า Supabase มี function `rpc_ingest_state_data`
- Run SQL migration ถ้ายังไม่มี

---

## 📊 Monitoring

### ดู Execution History
1. n8n Dashboard → Executions
2. Filter by workflow name

### ดู Import History ใน Supabase
```sql
SELECT * FROM ingestion_runs 
ORDER BY started_at DESC 
LIMIT 10;
```

---

## 📞 Links

- **CKAN Dataset:** https://gdcatalog.dlt.go.th/dataset/stat_1_1_01_first_regis_vehicles_car
- **Supabase Dashboard:** https://supabase.com/dashboard/project/rayaztyesqxnbsxpvuvl
- **iMoD Drive:** https://data.iphonemod.net

---

*Last updated: 2026-01-31*
