# DLT CKAN API Import Guide (กองขนส่ง)

เอกสารนี้สรุปวิธีดึงข้อมูลทะเบียนรถจาก CKAN API ของกรมการขนส่งทางบก (gdcatalog.dlt.go.th)
และนำเข้าไปยัง Supabase ผ่านสคริปต์ในโปรเจกต์นี้

## แหล่งข้อมูลหลัก

- Dataset: `stat_1_1_01_first_regis_vehicles_car`
- หน้า dataset:
  - https://gdcatalog.dlt.go.th/dataset/stat_1_1_01_first_regis_vehicles_car

## CKAN API ที่ใช้

1) ดูข้อมูล dataset + รายชื่อ resources
```
https://gdcatalog.dlt.go.th/api/3/action/package_show?id=stat_1_1_01_first_regis_vehicles_car
```

2) ดาวน์โหลด CSV ของ resource (ตัวอย่างรายเดือน)
```
https://gdcatalog.dlt.go.th/dataset/59a045dc-3ec4-4908-b035-ba789101b7f5/resource/<resource_id>/download/<filename>.csv
```

ตัวอย่างจริง (มกราคม 2567):
```
https://gdcatalog.dlt.go.th/dataset/59a045dc-3ec4-4908-b035-ba789101b7f5/resource/51414aa0-b764-4013-a540-87039a3b8070/download/sttt_car_new_reg_mm_2567_01.csv
```

## วิธีนำเข้าข้อมูลเข้า Supabase

### A) นำเข้า resource รายตัว (ใช้ CKAN datastore_search)

ใช้สคริปต์:
- `scripts/import_ckan_resource_to_supabase.rb`

ตัวอย่าง:
```
SUPABASE_URL="https://<project_ref>.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="<service-role-key>" \
ruby scripts/import_ckan_resource_to_supabase.rb 09bd50af-90ab-4d2e-b067-4589a621a241 raw/2568/06/ckan_09bd50af.json
```

### B) นำเข้ารายเดือนตามปี (2566-2567)

ใช้สคริปต์:
- `scripts/import_ckan_dataset_years.rb`

ตัวอย่าง:
```
SUPABASE_URL="https://<project_ref>.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="<service-role-key>" \
ruby scripts/import_ckan_dataset_years.rb stat_1_1_01_first_regis_vehicles_car 2566 2567
```

สคริปต์นี้จะ:
- เรียก `package_show` เพื่อหา resource รายเดือนของปีที่ระบุ
- ดาวน์โหลด CSV แต่ละไฟล์
- parse คอลัมน์ไทย (`ปี พ.ศ.`, `เดือน`, `ประเภทรถ`, `ยี่ห้อ`, `รุ่น`, `จำนวน`)
- เรียก RPC `rpc_ingest_state_data` เพื่อ upsert เข้าตารางหลัก

## ข้อควรระวัง

- ต้องใช้ `SUPABASE_SERVICE_ROLE_KEY` (ใช้ฝั่ง server เท่านั้น ห้ามเปิดเผยสาธารณะ)
- แหล่ง CKAN ส่ง CSV เป็น UTF-8 แต่บางครั้ง response จาก HTTP เป็น ASCII-8BIT
  สคริปต์จึง force UTF-8 และลบ BOM ก่อน parse

## ไฟล์ที่เกี่ยวข้อง

- `scripts/import_ckan_resource_to_supabase.rb`
- `scripts/import_ckan_dataset_years.rb`
- `STATE_DATA_SUPABASE_INGEST_UI_MIGRATION.sql` (RPC `rpc_ingest_state_data`)
