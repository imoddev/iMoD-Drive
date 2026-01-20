# ตัวอย่างการใช้งาน CKAN Import Script

## เตรียม Environment Variables

สร้างไฟล์ `.env` หรือตั้งค่าใน shell:

```bash
export SUPABASE_URL="https://your-project-ref.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="eyJhbGc..."
```

หรือใช้ inline:

```bash
SUPABASE_URL="https://xxx.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="eyJhbGc..." \
ruby scripts/import_ckan_dataset_years.rb <dataset_id> [years...]
```

## ตัวอย่างการใช้งาน

### 1. Import ข้อมูลปี 2567 เท่านั้น

```bash
ruby scripts/import_ckan_dataset_years.rb stat_1_1_01_first_regis_vehicles_car 2567
```

**ผลลัพธ์ที่คาดหวัง:**
```
Download: stat_1_1_01_first_regis_vehicles_car_mm_2567_01.csv
Ingest OK: year=2567 month=01 rows=1234 run_id=...
Download: stat_1_1_01_first_regis_vehicles_car_mm_2567_02.csv
Ingest OK: year=2567 month=02 rows=1156 run_id=...
...
```

### 2. Import หลายปี (2566-2567)

```bash
ruby scripts/import_ckan_dataset_years.rb stat_1_1_01_first_regis_vehicles_car 2566 2567
```

### 3. Default behavior (ไม่ระบุปี)

ถ้าไม่ระบุปี จะ import 2566 และ 2567 โดยอัตโนมัติ:

```bash
ruby scripts/import_ckan_dataset_years.rb stat_1_1_01_first_regis_vehicles_car
```

### 4. เปลี่ยน CKAN base URL

```bash
CKAN_BASE_URL="https://other-ckan-server.com" \
ruby scripts/import_ckan_dataset_years.rb <dataset_id> 2567
```

## การจัดการ Error

### Error: Missing env vars

```
Missing env vars: SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY
```

**แก้ไข:** ตั้งค่า environment variables ให้ถูกต้อง

### Error: No CSV resources found

```
No CSV resources found for years 2567
```

**แก้ไข:**
- ตรวจสอบว่า dataset_id ถูกต้อง
- ตรวจสอบว่า CKAN มีข้อมูลสำหรับปีที่ระบุ
- ดู CKAN API ด้วย curl:
  ```bash
  curl -s "https://gdcatalog.dlt.go.th/api/3/action/package_show?id=stat_1_1_01_first_regis_vehicles_car" | jq '.result.resources[] | .url'
  ```

### Error: HTTP 403 or network issues

**แก้ไข:**
- ตรวจสอบ proxy settings
- ตรวจสอบ firewall
- ลอง curl ก่อน:
  ```bash
  curl -v "https://gdcatalog.dlt.go.th/api/3/action/package_show?id=stat_1_1_01_first_regis_vehicles_car"
  ```

### Error: CSV parsing failed

```
Skip (no valid rows): filename.csv
```

**สาเหตุที่เป็นไปได้:**
- CSV format เปลี่ยนไป (column names ไม่ตรง)
- Encoding issues (แม้จะมี fix แล้ว)
- ไฟล์เสียหาย

**แก้ไข:** ดาวน์โหลดไฟล์มาดูด้วยตนเอง:
```bash
curl -L -o test.csv "URL_ของ_CSV"
file test.csv
head -n 3 test.csv
```

## โครงสร้างข้อมูลที่ Import

### CSV Headers (ต้องมีทุก column)

- `ปี พ.ศ.` → `year_be` (integer)
- `เดือน` → `month_th` (string)
- `ประเภทรถ` → `vehicle_type` (string)
- `ยี่ห้อ` → `brand` (string)
- `รุ่น` → `model` (string)
- `จำนวน` → `count` (integer)

### ตัวอย่างข้อมูล

```csv
ปี พ.ศ.,เดือน,ประเภทรถ,ยี่ห้อ,รุ่น,จำนวน
2567,มกราคม,รถยนต์นั่งส่วนบุคคล,TOYOTA,CAMRY,150
2567,มกราคม,รถยนต์นั่งส่วนบุคคล,HONDA,CIVIC,120
```

## Monitoring & Verification

### ดูจำนวน records ที่ import

```sql
SELECT year_be, month_th, COUNT(*) as record_count, SUM(count) as total_vehicles
FROM state_data
GROUP BY year_be, month_th
ORDER BY year_be DESC,
  CASE month_th
    WHEN 'มกราคม' THEN 1
    WHEN 'กุมภาพันธ์' THEN 2
    WHEN 'มีนาคม' THEN 3
    WHEN 'เมษายน' THEN 4
    WHEN 'พฤษภาคม' THEN 5
    WHEN 'มิถุนายน' THEN 6
    WHEN 'กรกฎาคม' THEN 7
    WHEN 'สิงหาคม' THEN 8
    WHEN 'กันยายน' THEN 9
    WHEN 'ตุลาคม' THEN 10
    WHEN 'พฤศจิกายน' THEN 11
    WHEN 'ธันวาคม' THEN 12
  END;
```

### ดู Top brands ต่อปี

```sql
SELECT year_be, brand, SUM(count) as total
FROM state_data
WHERE year_be = 2567
GROUP BY year_be, brand
ORDER BY total DESC
LIMIT 10;
```

### ตรวจสอบ import history

```sql
SELECT run_id, object_path, file_sha256, row_count,
       ingested_at AT TIME ZONE 'Asia/Bangkok' as ingested_at_bangkok
FROM ingest_runs
ORDER BY ingested_at DESC
LIMIT 20;
```

### ตรวจสอบ duplicate files

```sql
SELECT file_sha256, COUNT(*) as import_count,
       array_agg(object_path) as files
FROM ingest_runs
GROUP BY file_sha256
HAVING COUNT(*) > 1;
```

## Performance Tips

### Import แบบ batch (parallel)

สร้าง wrapper script:

```bash
#!/bin/bash
# import_all_years.sh

for year in 2563 2564 2565 2566 2567; do
  echo "Importing year $year..."
  ruby scripts/import_ckan_dataset_years.rb stat_1_1_01_first_regis_vehicles_car $year
  if [ $? -ne 0 ]; then
    echo "Failed at year $year"
    exit 1
  fi
done

echo "All years imported successfully!"
```

### Dry run mode (อยากได้)

ถ้าต้องการเพิ่ม dry-run mode:

```ruby
dry_run = ENV["DRY_RUN"] == "true"

# แทนที่
run_id = supabase_rpc_post(...)

# ด้วย
if dry_run
  puts "DRY RUN: Would ingest #{rows.length} rows"
else
  run_id = supabase_rpc_post(...)
end
```

ใช้งาน:
```bash
DRY_RUN=true ruby scripts/import_ckan_dataset_years.rb stat_1_1_01_first_regis_vehicles_car 2567
```

## Troubleshooting Checklist

- [ ] Environment variables ตั้งค่าถูกต้อง
- [ ] Network connectivity ไปยัง CKAN และ Supabase
- [ ] Ruby version >= 2.7
- [ ] Supabase service role key มี permissions
- [ ] Function `rpc_ingest_state_data` มีอยู่ใน Supabase
- [ ] Bucket `state-data` มีอยู่และตั้งค่าถูกต้อง
- [ ] Table `state_data` และ `ingest_runs` มีอยู่

## ข้อมูลเพิ่มเติม

- CKAN API Docs: https://gdcatalog.dlt.go.th/api/3/action/help_show?name=package_show
- Supabase Storage: https://supabase.com/docs/guides/storage
- Ruby CSV: https://ruby-doc.org/stdlib-3.0.0/libdoc/csv/rdoc/CSV.html
