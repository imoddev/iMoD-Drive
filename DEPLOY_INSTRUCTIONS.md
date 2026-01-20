# 🚀 Deploy Instructions

## ✅ สิ่งที่เสร็จแล้ว

- ✅ Project structure ready
- ✅ Git repository initialized
- ✅ Initial commit created
- ✅ `.gitignore` configured
- ✅ `vercel.json` configured
- ✅ Documentation complete

---

## 📋 ขั้นตอนที่เหลือ (ทำเองนอก VM)

### ขั้นตอนที่ 1: Push to GitHub

เนื่องจาก VM มี proxy blocking GitHub คุณต้อง push จากเครื่องของคุณเอง:

**Option A: Push จากเครื่อง Mac/PC**

```bash
# Clone จาก iMoD Drive folder ของคุณไปยังเครื่องที่มี internet
cd /path/to/your/iMoD\ Drive

# ตรวจสอบว่า git ready
git status

# Push ขึ้น GitHub
git push -u origin main
```

**Option B: ถ้ายังไม่มี git ในเครื่อง**

1. ไปที่ https://github.com/imoddev/iMoD-Drive
2. คลิก "uploading an existing file"
3. ลาก folder `iMoD Drive` ทั้งหมดมาวาง
4. Commit

---

### ขั้นตอนที่ 2: Deploy to Vercel

1. **เปิด Vercel dashboard:**
   https://vercel.com/new

2. **Import Git Repository:**
   - Click "Import Project"
   - Select "Import Git Repository"
   - Choose `imoddev/iMoD-Drive`

3. **Configure Build Settings:**
   ```
   Framework Preset: Other
   Build Command: (leave empty - static site)
   Output Directory: web
   Install Command: (leave empty)
   ```

4. **Deploy!**
   - Click "Deploy"
   - รอ 1-2 นาที
   - คุณจะได้ URL: `https://imoddrive-xxx.vercel.app`

---

### ขั้นตอนที่ 3: Configure Custom Domain

#### ใน Vercel:

1. Go to project settings
2. Click "Domains"
3. Add domain: `data.iphonemod.net`
4. Vercel will show DNS configuration needed

#### ใน Cloudflare:

1. เปิด https://dash.cloudflare.com/bbb18c09951f7eb08fde89fd60b6899f/iphonemod.net/dns
2. Add new record:
   ```
   Type: CNAME
   Name: data
   Target: cname.vercel-dns.com
   Proxy status: Proxied (orange cloud)
   TTL: Auto
   ```
3. Click "Save"

---

### ขั้นตอนที่ 4: Verify Domain

1. รอ DNS propagate (5-10 นาที)
2. ไปที่ Vercel dashboard
3. คลิก "Refresh" ข้างๆ domain status
4. เมื่อ verified แล้ว: ✅ `data.iphonemod.net` will be live!

---

## 🔍 Verification Checklist

- [ ] GitHub repository updated
- [ ] Vercel connected to GitHub
- [ ] Vercel deployment successful
- [ ] Custom domain added in Vercel
- [ ] CNAME record added in Cloudflare
- [ ] Domain verified in Vercel
- [ ] Site accessible at data.iphonemod.net
- [ ] Web app loading correctly
- [ ] Supabase connection working

---

## 🛠️ Troubleshooting

### Issue: Git push failed

**ใช้ GitHub Desktop หรือ upload ผ่านเว็บ:**
1. Go to https://github.com/imoddev/iMoD-Drive
2. Click "Add file" > "Upload files"
3. Drag entire folder

### Issue: Vercel build failed

**ตรวจสอบ:**
- Build Command: (empty)
- Output Directory: `web`
- Root Directory: `./`

### Issue: Domain not working

**ตรวจสอบ Cloudflare DNS:**
```
Type: CNAME
Name: data
Target: cname.vercel-dns.com
Proxy: ON (orange cloud)
```

**รอ DNS propagate:**
```bash
# Check DNS
dig data.iphonemod.net

# Or online
https://dnschecker.org/#CNAME/data.iphonemod.net
```

### Issue: 404 Not Found

**ตรวจสอบ vercel.json:**
- Routes ต้องชี้ไป `/web/` correctly
- Index route ต้องชี้ไป `/web/index.html`

---

## 📊 Expected Results

### After Deployment:

1. **GitHub:**
   - Repository: https://github.com/imoddev/iMoD-Drive
   - 32 files committed
   - Main branch deployed

2. **Vercel:**
   - Production deployment
   - Auto-deploy on git push
   - Custom domain configured

3. **Live Site:**
   - URL: https://data.iphonemod.net
   - Serving web/index.html
   - Connected to Supabase
   - Charts rendering correctly

---

## 🎉 Post-Deployment

### Monitor Your Site:

1. **Vercel Analytics:**
   https://vercel.com/imods-projects/imoddrive/analytics

2. **Deployment Logs:**
   https://vercel.com/imods-projects/imoddrive/deployments

3. **Domain Status:**
   https://vercel.com/imods-projects/imoddrive/settings/domains

### Update Site:

```bash
# Make changes
cd /path/to/iMoD\ Drive

# Commit
git add .
git commit -m "Update: description of changes"

# Push (auto-deploys to Vercel)
git push origin main
```

---

## 📝 Quick Reference

**GitHub Repo:** https://github.com/imoddev/iMoD-Drive
**Vercel Dashboard:** https://vercel.com/imods-projects
**Cloudflare DNS:** https://dash.cloudflare.com/bbb18c09951f7eb08fde89fd60b6899f/iphonemod.net/dns
**Live Site:** https://data.iphonemod.net

---

**ทุกอย่างพร้อมแล้ว! เหลือแค่ push ขึ้น GitHub และ connect Vercel** 🚀
