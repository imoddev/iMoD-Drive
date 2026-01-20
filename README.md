# iMoD Drive - Thailand Vehicle Registration Data Platform

A web-based analytics platform for visualizing and analyzing vehicle registration statistics from the Department of Land Transport (DLT), Thailand.

🌐 **Live Site:** [data.iphonemod.net](https://data.iphonemod.net)

---

## 🎯 Features

- 📊 **Interactive Data Visualization** - Charts and graphs for vehicle registration trends
- 🚗 **Brand & Model Analytics** - Detailed breakdown by manufacturer and model
- 📅 **Historical Data** - Multi-year comparison (2566-2567 B.E.)
- 🔍 **Real-time Filtering** - Filter by year, month, vehicle type, brand
- 📱 **Responsive Design** - Works on desktop, tablet, and mobile
- ⚡ **Fast Performance** - Powered by Supabase backend

---

## 🏗️ Architecture

```
┌─────────────┐
│  CKAN API   │ Thailand Government Open Data
│  (DLT)      │
└──────┬──────┘
       │
       │ CSV Download + Import
       ▼
┌─────────────┐
│  Supabase   │ PostgreSQL Database + Storage
│  Database   │
└──────┬──────┘
       │
       │ REST API
       ▼
┌─────────────┐
│  Web App    │ Static HTML/CSS/JS
│  (Vercel)   │
└─────────────┘
```

---

## 📁 Project Structure

```
iMoD-Drive/
├── web/                          # Frontend application
│   ├── index.html               # Main application
│   ├── app.js                   # Application logic
│   ├── styles.css               # Styling
│   ├── config.js                # Supabase configuration
│   └── README.md                # Web app documentation
│
├── scripts/                     # Data import scripts
│   ├── import_ckan.sh          # Wrapper script
│   ├── import_ckan_dataset_years.rb  # Main import logic
│   └── USAGE_EXAMPLES.md       # Import examples
│
├── docs/                        # Documentation
│   ├── START_HERE.md           # Quick start guide
│   ├── QUICK_START.md          # Quick reference
│   ├── SETUP_INSTRUCTIONS.md   # Detailed setup
│   └── README_CKAN_IMPORT.md   # Import system docs
│
├── .gitignore                   # Git ignore rules
├── vercel.json                  # Vercel deployment config
└── README.md                    # This file
```

---

## 🚀 Quick Start

### For Users (View Data)

Simply visit: **[data.iphonemod.net](https://data.iphonemod.net)**

### For Developers (Setup Local)

1. **Clone the repository:**
   ```bash
   git clone https://github.com/imoddev/iMoD-Drive.git
   cd iMoD-Drive
   ```

2. **Serve locally:**
   ```bash
   cd web
   python3 -m http.server 8000
   ```

3. **Open browser:**
   ```
   http://localhost:8000
   ```

---

## 🔧 Data Import System

This project includes a complete system for importing vehicle registration data from CKAN.

### Quick Import

```bash
# Setup environment
cp .env.template .env
# Add your SUPABASE_SERVICE_ROLE_KEY to .env

# Import data for 2567
./scripts/import_ckan.sh stat_1_1_01_first_regis_vehicles_car 2567
```

📖 **Full Documentation:** See [START_HERE.md](./START_HERE.md)

---

## 📊 Data Source

**Dataset:** Thailand Vehicle First Registration Statistics (Monthly)
**Provider:** Department of Land Transport (DLT)
**CKAN URL:** https://gdcatalog.dlt.go.th/dataset/stat_1_1_01_first_regis_vehicles_car
**Update Frequency:** Monthly

---

## 🛠️ Technology Stack

### Frontend
- HTML5, CSS3, JavaScript (ES6+)
- Chart.js for data visualization
- Responsive design

### Backend
- Supabase (PostgreSQL)
- Supabase Storage
- REST API

### Deployment
- Vercel (frontend hosting)
- Cloudflare DNS
- GitHub repository

---

## 🌐 Deployment

### Automated Deployment

This project is configured for automatic deployment:

1. **Push to GitHub** → Triggers Vercel deployment
2. **Vercel builds** → Deploys to production
3. **Cloudflare DNS** → Routes data.iphonemod.net to Vercel

### Manual Setup

See [SETUP_INSTRUCTIONS.md](./SETUP_INSTRUCTIONS.md) for detailed deployment instructions.

---

## 📝 Documentation

- **[START_HERE.md](./START_HERE.md)** - New users start here
- **[QUICK_START.md](./QUICK_START.md)** - Quick reference
- **[SETUP_INSTRUCTIONS.md](./SETUP_INSTRUCTIONS.md)** - Detailed setup guide
- **[README_CKAN_IMPORT.md](./README_CKAN_IMPORT.md)** - Import system documentation
- **[README_ORIGINAL.md](./README_ORIGINAL.md)** - Original Thai documentation

---

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to your fork
5. Open a Pull Request

---

## 🙏 Acknowledgments

- **Department of Land Transport (DLT)** - Data provider
- **Thailand Government Data Catalog** - CKAN platform
- **Supabase** - Backend infrastructure
- **Vercel** - Frontend hosting

---

## 📧 Contact

- **Website:** [iphonemod.net](https://iphonemod.net)
- **Data Platform:** [data.iphonemod.net](https://data.iphonemod.net)
- **Email:** iphonemod.net@gmail.com
- **GitHub:** [@imoddev](https://github.com/imoddev)

---

**Version:** 1.0.0
**Last Updated:** January 2026
**Status:** 🟢 Production
