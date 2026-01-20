# CKAN CSV Encoding Fix - สรุปผลการแก้ไข

## ปัญหา

เมื่อดาวน์โหลด CSV จาก CKAN API ผ่าน `Net::HTTP`:
- Response body มี encoding เป็น `ASCII-8BIT` (binary)
- CSV มี BOM (Byte Order Mark) ที่จุดเริ่มต้น: `\xEF\xBB\xBF`
- Header columns เป็นภาษาไทย เช่น "ปี พ.ศ.", "เดือน", "ประเภทรถ"
- การ parse ด้วย CSV library ล้มเหลวเพราะ encoding ไม่ตรง

## วิธีแก้ไข

แก้ไขไฟล์: `scripts/import_ckan_dataset_years.rb` (บรรทัด 114-116)

```ruby
csv_text = http_get_bytes(url)
csv_text = csv_text.force_encoding("UTF-8")
csv_text = csv_text.encode("UTF-8", invalid: :replace, undef: :replace, replace: "")
csv_text.sub!(/\A\uFEFF/, "")
```

### อธิบายขั้นตอน

1. **`force_encoding("UTF-8")`**
   - บังคับเปลี่ยน encoding จาก ASCII-8BIT เป็น UTF-8
   - ไม่ได้แปลงข้อมูล แค่บอก Ruby ว่าให้ตีความเป็น UTF-8

2. **`encode("UTF-8", invalid: :replace, ...)`**
   - ทำการ encode ใหม่เพื่อจัดการกับ byte sequences ที่ invalid
   - ถ้ามี invalid/undefined characters จะถูกแทนที่ด้วย empty string
   - ทำให้มั่นใจว่า string เป็น valid UTF-8

3. **`sub!(/\A\uFEFF/, "")`**
   - ลบ BOM (U+FEFF) ออกจากจุดเริ่มต้นของ string
   - BOM อาจทำให้ CSV parser สับสน

## การทดสอบ

### Test 1: Simple Mock Data Test ✅
```bash
ruby test_encoding_simple.rb
```

**ผลลัพธ์:**
- ✓ Simulated ASCII-8BIT data with BOM
- ✓ Applied encoding fix correctly
- ✓ Removed BOM successfully
- ✓ Parsed Thai headers correctly
- ✓ All fields extracted properly

### Test 2: Real CKAN API Test (ต้องการ Supabase credentials)

```bash
SUPABASE_URL="https://xxx.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="xxx" \
ruby scripts/import_ckan_dataset_years.rb stat_1_1_01_first_regis_vehicles_car 2567
```

## ไฟล์ที่แก้ไข

- ✅ `scripts/import_ckan_dataset_years.rb` - เพิ่ม encoding fix (บรรทัด 114-116)

## ไฟล์ทดสอบ

- `test_encoding_simple.rb` - ทดสอบ encoding logic ด้วย mock data
- `test_ckan_encoding.rb` - ทดสอบ download จาก CKAN API จริง (ต้องการ network access)

## ขั้นตอนต่อไป

### 1. เพิ่ม User-Agent ใน import script

สคริปต์หลักยังไม่มี User-Agent header ซึ่งบางเซิร์ฟเวอร์อาจต้องการ:

```ruby
def http_get_json(url)
  uri = URI(url)
  http = Net::HTTP.new(uri.host, uri.port)
  http.use_ssl = uri.scheme == "https"
  req = Net::HTTP::Get.new(uri.request_uri)
  req["accept"] = "application/json"
  req["user-agent"] = "Mozilla/5.0 (compatible; DataImporter/1.0)"  # เพิ่มบรรทัดนี้
  # ...
end
```

### 2. ทดสอบกับ Supabase

เมื่อพร้อมแล้ว ให้รัน:

```bash
# ตั้งค่า environment variables
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Import ข้อมูล 2567 (ปีปัจจุบัน)
ruby scripts/import_ckan_dataset_years.rb stat_1_1_01_first_regis_vehicles_car 2567

# Import ทั้ง 2566 และ 2567
ruby scripts/import_ckan_dataset_years.rb stat_1_1_01_first_regis_vehicles_car 2566 2567
```

### 3. ตรวจสอบข้อมูลใน Supabase

```sql
-- ดูจำนวน records ที่ import
SELECT year_be, COUNT(*)
FROM state_data
GROUP BY year_be
ORDER BY year_be DESC;

-- ดูตัวอย่างข้อมูล
SELECT *
FROM state_data
WHERE year_be = 2567
LIMIT 10;
```

## สรุป

✅ **การแก้ไข encoding สำเร็จแล้ว**

- สามารถ parse CSV ที่มี Thai headers ได้
- จัดการกับ BOM ได้ถูกต้อง
- แปลง ASCII-8BIT จาก HTTP response เป็น UTF-8
- ทดสอบกับ mock data ผ่านแล้ว

🎯 **พร้อมใช้งานจริงเมื่อมี Supabase credentials**

## หมายเหตุ

- การ import จะข้ามไฟล์ที่มี SHA256 hash ซ้ำกัน (duplicate detection)
- แต่ละ CSV file จะถูกเก็บใน storage bucket: `state-data/raw/{year}/{month}/{filename}`
- ข้อมูลจะถูก parse และเก็บใน table `state_data`
- Function `rpc_ingest_state_data` จะจัดการ upsert และ deduplication
