# Vercel Deployment Issue - 404 NOT_FOUND

## สถานการณ์ปัจจุบัน

เว็บไซต์ https://imoddrive.vercel.app/ แสดง **404: NOT_FOUND** เพราะ:

1. **GitHub repository ยังเกือบว่างเปล่า** - มีแค่ README.md เท่านั้น
2. **ไฟล์ทั้งหมดยังไม่ได้ถูก push ขึ้น GitHub**
3. **Vercel ไม่มีไฟล์ให้ deploy** เพราะดึงจาก GitHub ที่ว่างเปล่า

## ทำไมไม่สามารถ push จาก VM ได้

VM environment มี proxy ที่บล็อก GitHub:
```
fatal: unable to access 'https://github.com/imoddev/iMoD-Drive.git/':
Received HTTP code 403 from proxy after CONNECT
```

## วิธีแก้ไข (ต้องทำจากเครื่องของคุณ)

### Option 1: Push ผ่าน Terminal (แนะนำ)

```bash
# 1. Clone repository ที่มีอยู่
git clone https://github.com/imoddev/iMoD-Drive.git
cd iMoD-Drive

# 2. Copy ไฟล์ทั้งหมดจาก project เดิม (ยกเว้น .git)
# คุณจะต้อง copy ไฟล์เหล่านี้จาก folder ที่คุณเลือก:
# - web/
# - scripts/
# - *.sql
# - *.md
# - vercel.json
# - .gitignore
# และไฟล์อื่นๆ

# 3. Add, commit และ push
git add .
git commit -m "Add all project files for Vercel deployment"
git push origin main
```

### Option 2: Upload ผ่าน GitHub Web Interface

1. ไปที่ https://github.com/imoddev/iMoD-Drive
2. คลิก "Add file" > "Upload files"
3. Drag & Drop หรือเลือกไฟล์ทั้งหมดจาก project folder
4. Commit changes

## ไฟล์ที่ต้อง Push

```
iMoD-Drive/
├── web/                          # ← สำคัญที่สุด! (HTML, CSS, JS)
│   ├── index.html
│   ├── app.js
│   ├── styles.css
│   └── config.js
├── scripts/                      # Ruby import scripts
│   └── import_ckan_dataset_years.rb
├── vercel.json                   # ← สำคัญ! (Vercel configuration)
├── .gitignore
├── README.md
├── QUICK_START.md
├── SETUP_INSTRUCTIONS.md
└── *.sql files
```

## Vercel Configuration ที่ถูกต้อง

ไฟล์ `vercel.json` ปัจจุบันมีปัญหา ใช้แทนด้วย:

```json
{
  "buildCommand": "echo 'No build needed'",
  "outputDirectory": "web",
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Access-Control-Allow-Origin",
          "value": "*"
        },
        {
          "key": "Access-Control-Allow-Methods",
          "value": "GET, POST, OPTIONS"
        },
        {
          "key": "Access-Control-Allow-Headers",
          "value": "X-Requested-With, Content-Type, Authorization"
        }
      ]
    }
  ]
}
```

## หลังจาก Push ไฟล์แล้ว

1. **Vercel จะ auto-deploy** ทันทีที่ detect commit ใหม่
2. ตรวจสอบ deployment ที่: https://vercel.com/imods-projects/imoddrive/deployments
3. เว็บจะพร้อมใช้งานที่: https://imoddrive.vercel.app/
4. Custom domain จะพร้อมเมื่อ DNS propagate เสร็จ: https://data.iphonemod.net/

## ตรวจสอบความถูกต้อง

หลังจาก push แล้ว ให้ตรวจสอบว่า GitHub repository มี:
- ✅ โฟลเดอร์ `web/` พร้อมไฟล์ HTML, CSS, JS
- ✅ ไฟล์ `vercel.json` ที่ root
- ✅ โฟลเดอร์ `scripts/` สำหรับ Ruby scripts

## สรุป

**ปัญหาหลัก**: ไฟล์ยังไม่ได้ถูก push ขึ้น GitHub
**วิธีแก้**: Push ไฟล์ทั้งหมดจากเครื่องของคุณ (ไม่ใช่ผ่าน VM)
**ผลลัพธ์**: Vercel จะ auto-deploy และเว็บจะใช้งานได้ทันที
