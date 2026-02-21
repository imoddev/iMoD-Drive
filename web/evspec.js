/**
 * evspec.js — EV Spec Viewer for data.iphonemod.net
 * Tab: "สเปครถ EV" | Data: Google Sheets CSV (multi-tab)
 * iMoD Drive © 2026
 */

(function () {
  const SHEET_ID = '1SphsQR8V9eKcWzonLXjPgXZcmyKids0WnYi_B-MiRl0';
  
  // Brand tabs: name → gid
  const BRAND_TABS = {
    'BYD': 1248635741,
    'MG': 537545962,
    'Volvo': 684902357,
    'Zeekr': 816947032,
    'Tesla': 660597803,
    'GWM': 40163670,
    'Deepal': 1021728758,
    'AVATR': 2036383534,
    'HYPTEC': 1258340992,
    'Xpeng': 1759530012,
    'AION': 875112136,
    'Mercedes-Benz': 102650194,
    'Kia': 596321324,
    'Hyundai': 346696962,
    'BMW': 1958764800,
    'Audi': 145641940,
    'Porsche': 979936496,
    'Toyota': 1262403275,
    'Lexus': 431039414,
    'Honda': 414822744,
    'Nissan': 1773433033,
    'Lotus': 1504159861,
    'MINI': 57731534,
    'JAECOO-OMODA': 989044380,
    'Denza': 1293661774,
    'Maserati': 1062914600,
    'Lumin': 724272663,
    'Wuling': 1166005171,
    'GAC': 2047597204,
  };

  const FLAGS = {
    BYD: '🇨🇳', GWM: '🇨🇳', Volvo: '🇸🇪', MG: '🇨🇳',
    Tesla: '🇺🇸', Toyota: '🇯🇵', Lexus: '🇯🇵', BMW: '🇩🇪', MAXUS: '🇨🇳',
    Zeekr: '🇨🇳', Deepal: '🇨🇳', AVATR: '🇨🇳', HYPTEC: '🇨🇳', Xpeng: '🇨🇳',
    AION: '🇨🇳', 'Mercedes-Benz': '🇩🇪', Kia: '🇰🇷', Hyundai: '🇰🇷',
    Audi: '🇩🇪', Porsche: '🇩🇪', Honda: '🇯🇵', Nissan: '🇯🇵',
    Lotus: '🇬🇧', MINI: '🇬🇧', 'JAECOO-OMODA': '🇨🇳', Denza: '🇨🇳',
    Maserati: '🇮🇹', Lumin: '🇨🇳', Wuling: '🇨🇳', GAC: '🇨🇳',
  };
  const COUNTRIES = {
    BYD: 'จีน', GWM: 'จีน', Volvo: 'สวีเดน', MG: 'จีน',
    Tesla: 'สหรัฐอเมริกา', Toyota: 'ญี่ปุ่น', Lexus: 'ญี่ปุ่น',
    BMW: 'เยอรมนี', MAXUS: 'จีน', Zeekr: 'จีน', Deepal: 'จีน',
    AVATR: 'จีน', HYPTEC: 'จีน', Xpeng: 'จีน', AION: 'จีน',
    'Mercedes-Benz': 'เยอรมนี', Kia: 'เกาหลีใต้', Hyundai: 'เกาหลีใต้',
    Audi: 'เยอรมนี', Porsche: 'เยอรมนี', Honda: 'ญี่ปุ่น', Nissan: 'ญี่ปุ่น',
    Lotus: 'อังกฤษ', MINI: 'อังกฤษ', 'JAECOO-OMODA': 'จีน', Denza: 'จีน',
    Maserati: 'อิตาลี', Lumin: 'จีน', Wuling: 'จีน', GAC: 'จีน',
  };

  let allCars = [], filteredCars = [], loaded = false;
  let brandActive = new Set(), bodyActive = new Set(), countryActive = new Set();
  let currentPage = 1;
  const ITEMS_PER_PAGE = 15;

  /* ── Accordion Toggle ── */
  window.evsToggleSection = function(btn) {
    const section = btn.parentElement;
    section.classList.toggle('collapsed');
  };

  /* ── CSV ── */
  function parseCSVLine(line) {
    const res = []; let f = '', q = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') { if (q && line[i + 1] === '"') { f += '"'; i++; } else q = !q; }
      else if (c === ',' && !q) { res.push(f.trim()); f = ''; }
      else f += c;
    }
    res.push(f.trim()); return res;
  }
  function parseCSV(t) {
    return t.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').map(parseCSVLine);
  }
  function findRow(rows, lbl) {
    const lo = lbl.toLowerCase();
    return rows.find(r => r[0] && r[0].trim().toLowerCase() === lo);
  }
  function findRowP(rows, lbl) {
    const lo = lbl.toLowerCase();
    return rows.find(r => r[0] && r[0].trim().toLowerCase().includes(lo));
  }
  function pNum(s) { if (!s) return null; const m = s.match(/[\d.]+/); return m ? parseFloat(m[0]) : null; }
  function pPrice(s) {
    if (!s) return 0;
    const n = parseInt(s.split('/')[0].trim().replace(/[^0-9]/g, ''));
    return isNaN(n) ? 0 : n;
  }
  function fmtPrice(str, num) {
    if (!str && !num) return '';
    if (str) {
      const p = parseInt(str.split('/')[0].replace(/[^0-9]/g, ''));
      if (!p) return str;
      return '฿' + p.toLocaleString('th-TH') + (str.includes('/') ? '+' : '');
    }
    return '฿' + num.toLocaleString('th-TH');
  }

  /* ── LOAD (multi-tab) ── */
  function getSheetURL(gid) {
    return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${gid}`;
  }

  function getRowValue(rows, label) {
    const lo = label.toLowerCase();
    const row = rows.find(r => r[0] && r[0].trim().toLowerCase().includes(lo));
    return row || null;
  }

  async function loadBrandData(brand, gid) {
    try {
      const res = await fetch(getSheetURL(gid));
      const text = await res.text();
      const rows = parseCSV(text);
      if (rows.length < 3) return [];

      // New structure: Column A = spec labels, Columns B+ = model data
      // Row 0 = สเปก header with model names
      const headerRow = rows[0];
      const rangeRow  = getRowValue(rows, 'ระยะทางสูงสุด');
      const accelRow  = getRowValue(rows, 'อัตราเร่ง');
      const motorKwR  = getRowValue(rows, 'กำลังมอเตอร์');
      const hpRow     = getRowValue(rows, 'แรงม้า');
      const battRow   = getRowValue(rows, 'ขนาดแบตเตอรี่');
      const dcRow     = getRowValue(rows, 'การชาร์จ DC') || getRowValue(rows, 'DC');
      const acRow     = getRowValue(rows, 'การชาร์จ AC') || getRowValue(rows, 'AC');
      const priceRow  = getRowValue(rows, 'ราคาเปิดตัว') || getRowValue(rows, 'ราคา');
      const bodyRow   = getRowValue(rows, 'ประเภทตัวถัง');
      const segRow    = getRowValue(rows, 'segment') || getRowValue(rows, 'เซกเมนต์');
      const lenRow    = getRowValue(rows, 'ความยาว');
      const widRow    = getRowValue(rows, 'ความกว้าง');
      const htRow     = getRowValue(rows, 'ความสูงตัวรถ') || getRowValue(rows, 'ความสูง');
      const wbRow     = getRowValue(rows, 'ระยะฐานล้อ');
      const gcRow     = getRowValue(rows, 'ความสูงใต้ท้อง') || getRowValue(rows, 'Ground');
      const seatsRow  = getRowValue(rows, 'จำนวนที่นั่ง');
      const doorsRow  = getRowValue(rows, 'จำนวนประตู');
      const wgtRow    = getRowValue(rows, 'น้ำหนัก');
      const trunkRow  = getRowValue(rows, 'พื้นที่เก็บสัมภาระ') || getRowValue(rows, 'ท้ายรถ');
      const mtrTypeR  = getRowValue(rows, 'ประเภทมอเตอร์');
      const driveRow  = getRowValue(rows, 'ระบบขับเคลื่อน');
      const torqRow   = getRowValue(rows, 'แรงบิด');
      const topSpRow  = getRowValue(rows, 'ความเร็วสูงสุด');
      const battTypeR = getRowValue(rows, 'ประเภทแบตเตอรี่');
      const v2lRow    = getRowValue(rows, 'v2l');

      const cars = [];
      const numCols = Math.max(...rows.map(r => r.length));

      for (let col = 1; col < numCols; col++) {
        const modelName = headerRow[col]?.trim();
        if (!modelName || modelName === 'สเปก') continue;

        const range    = rangeRow?.[col]?.trim() || '';
        const priceStr = priceRow?.[col]?.trim() || '';
        const hp       = hpRow?.[col]?.trim() || '';
        const batt     = battRow?.[col]?.trim() || '';
        const dc       = dcRow?.[col]?.trim() || '';
        const ac       = acRow?.[col]?.trim() || '';
        const accel    = accelRow?.[col]?.trim() || '';
        const bodyType = bodyRow?.[col]?.trim() || '';

        // Skip empty columns
        if (!priceStr && !hp && !range && !batt && !modelName.includes(brand)) continue;

        // Parse model name: "BYD Dolphin Standard Range" → model="Dolphin", sub="Standard Range"
        let model = modelName.replace(brand, '').trim();
        let sub = '';
        const parts = model.split(/\s+/);
        if (parts.length > 1) {
          model = parts[0];
          sub = parts.slice(1).join(' ');
        }

        cars.push({
          id: `${brand}-${col}`,
          brand,
          model: model || modelName,
          sub,
          range, rangeNum: pNum(range),
          hp, hpNum: pNum(hp),
          batt, battNum: pNum(batt),
          dc, ac, accel, accelNum: pNum(accel),
          priceStr, priceNum: pPrice(priceStr),
          bodyType,
          segment:   segRow?.[col]?.trim() || '',
          length:    lenRow?.[col]?.trim() || '',
          width:     widRow?.[col]?.trim() || '',
          height:    htRow?.[col]?.trim() || '',
          wheelbase: wbRow?.[col]?.trim() || '',
          gc:        gcRow?.[col]?.trim() || '',
          seats:     seatsRow?.[col]?.trim() || '',
          doors:     doorsRow?.[col]?.trim() || '',
          weight:    wgtRow?.[col]?.trim() || '',
          trunk:     trunkRow?.[col]?.trim() || '',
          motorType: mtrTypeR?.[col]?.trim() || '',
          drive:     driveRow?.[col]?.trim() || '',
          torque:    torqRow?.[col]?.trim() || '',
          topSpeed:  topSpRow?.[col]?.trim() || '',
          battType:  battTypeR?.[col]?.trim() || '',
          v2l:       v2lRow?.[col]?.trim() || '',
          motorKw:   motorKwR?.[col]?.trim() || '',
          flag:      FLAGS[brand] || '🌐',
          country:   COUNTRIES[brand] || '',
        });
      }
      return cars;
    } catch (err) {
      console.warn(`[evspec] Failed to load ${brand}:`, err);
      return [];
    }
  }

  async function loadData() {
    const allCarsPromises = Object.entries(BRAND_TABS).map(([brand, gid]) => 
      loadBrandData(brand, gid)
    );
    const results = await Promise.all(allCarsPromises);
    const cars = results.flat();
    // Assign unique numeric ids
    cars.forEach((c, i) => c.id = i + 1);
    return cars;
  }

  /* ── RENDER CHIPS ── */
  function renderChips() {
    const brands = [...new Set(allCars.map(c => c.brand))].sort();
    const types  = [...new Set(allCars.map(c => (c.bodyType||'').split('/')[0].trim()).filter(Boolean))].sort();
    const countries = [...new Set(allCars.map(c => c.country).filter(Boolean))].sort();

    // Brand chips
    const bc = document.getElementById('evs-brand-chips');
    if (bc) {
      bc.innerHTML = `<div class="evs-check-all" onclick="evsCheckAllBrands()">☑ เลือกทั้งหมด</div>` +
        brands.map(b =>
          `<span class="evs-chip active" data-brand="${b}" onclick="evsToggleBrand('${b}')">
            <span class="evs-chip-text"><span class="evs-chip-flag">${FLAGS[b]||'🌐'}</span> ${b}</span>
          </span>`
        ).join('');
      brandActive = new Set(brands);
    }

    // Country chips
    const cc = document.getElementById('evs-country-chips');
    if (cc) {
      const countryFlags = {
        'จีน': '🇨🇳', 'สหรัฐอเมริกา': '🇺🇸', 'เยอรมนี': '🇩🇪', 'ญี่ปุ่น': '🇯🇵',
        'เกาหลีใต้': '🇰🇷', 'สวีเดน': '🇸🇪', 'อังกฤษ': '🇬🇧', 'อิตาลี': '🇮🇹'
      };
      cc.innerHTML = `<div class="evs-check-all" onclick="evsCheckAllCountries()">☑ เลือกทั้งหมด</div>` +
        countries.map(c =>
          `<span class="evs-chip active" data-country="${c}" onclick="evsToggleCountry('${c}')">
            <span class="evs-chip-text"><span class="evs-chip-flag">${countryFlags[c]||'🌐'}</span> ${c}</span>
          </span>`
        ).join('');
      countryActive = new Set(countries);
    }

    // Body type chips
    const tc = document.getElementById('evs-body-chips');
    if (tc) {
      tc.innerHTML = `<div class="evs-check-all" onclick="evsCheckAllBody()">☑ เลือกทั้งหมด</div>` +
        types.map(t =>
          `<span class="evs-chip active" data-body="${t}" onclick="evsToggleBody('${t}')"><span class="evs-chip-text">${t}</span></span>`
        ).join('');
      bodyActive = new Set(types);
    }
  }

  /* ── FILTERS ── */
  window.evsToggleBrand = function(b) {
    if (brandActive.has(b)) brandActive.delete(b); else brandActive.add(b);
    document.querySelectorAll(`[data-brand="${b}"]`).forEach(el => el.classList.toggle('active', brandActive.has(b)));
    evsApply();
  };
  window.evsToggleBody = function(t) {
    if (bodyActive.has(t)) bodyActive.delete(t); else bodyActive.add(t);
    document.querySelectorAll(`[data-body="${t}"]`).forEach(el => el.classList.toggle('active', bodyActive.has(t)));
    evsApply();
  };
  window.evsToggleCountry = function(c) {
    if (countryActive.has(c)) countryActive.delete(c); else countryActive.add(c);
    document.querySelectorAll(`[data-country="${c}"]`).forEach(el => el.classList.toggle('active', countryActive.has(c)));
    evsApply();
  };

  // Check All functions
  window.evsCheckAllBrands = function() {
    const brands = [...new Set(allCars.map(c => c.brand))];
    const allChecked = brands.every(b => brandActive.has(b));
    if (allChecked) {
      brandActive.clear();
    } else {
      brandActive = new Set(brands);
    }
    document.querySelectorAll('[data-brand]').forEach(el => {
      el.classList.toggle('active', brandActive.has(el.dataset.brand));
    });
    evsApply();
  };

  window.evsCheckAllCountries = function() {
    const countries = [...new Set(allCars.map(c => c.country).filter(Boolean))];
    const allChecked = countries.every(c => countryActive.has(c));
    if (allChecked) {
      countryActive.clear();
    } else {
      countryActive = new Set(countries);
    }
    document.querySelectorAll('[data-country]').forEach(el => {
      el.classList.toggle('active', countryActive.has(el.dataset.country));
    });
    evsApply();
  };

  window.evsCheckAllBody = function() {
    const types = [...new Set(allCars.map(c => (c.bodyType||'').split('/')[0].trim()).filter(Boolean))];
    const allChecked = types.every(t => bodyActive.has(t));
    if (allChecked) {
      bodyActive.clear();
    } else {
      bodyActive = new Set(types);
    }
    document.querySelectorAll('[data-body]').forEach(el => {
      el.classList.toggle('active', bodyActive.has(el.dataset.body));
    });
    evsApply();
  };

  function evsApply() {
    const q    = (document.getElementById('evs-search')?.value || '').toLowerCase();
    const pMin = parseFloat(document.getElementById('evs-pmin')?.value) || 0;
    const pMax = parseFloat(document.getElementById('evs-pmax')?.value) || Infinity;
    const sort = document.getElementById('evs-sort')?.value || 'default';

    filteredCars = allCars.filter(c => {
      if (q && !`${c.brand} ${c.model} ${c.sub}`.toLowerCase().includes(q)) return false;
      if (!brandActive.has(c.brand)) return false;
      if (c.country && countryActive.size && !countryActive.has(c.country)) return false;
      const bt = (c.bodyType || '').split('/')[0].trim();
      if (bt && bodyActive.size && !bodyActive.has(bt)) return false;
      if (c.priceNum > 0 && (c.priceNum < pMin || c.priceNum > pMax)) return false;
      return true;
    });

    if (sort === 'price-asc')   filteredCars.sort((a, b) => (a.priceNum||9e8) - (b.priceNum||9e8));
    else if (sort === 'price-desc')  filteredCars.sort((a, b) => (b.priceNum||0) - (a.priceNum||0));
    else if (sort === 'range-desc')  filteredCars.sort((a, b) => (b.rangeNum||0) - (a.rangeNum||0));
    else if (sort === 'hp-desc')     filteredCars.sort((a, b) => (b.hpNum||0) - (a.hpNum||0));
    else if (sort === 'accel-asc')   filteredCars.sort((a, b) => (a.accelNum||99) - (b.accelNum||99));

    currentPage = 1; // Reset to first page when filter changes
    renderGrid();
  }
  window.evsApply = evsApply;

  window.evsReset = function() {
    if (document.getElementById('evs-search')) document.getElementById('evs-search').value = '';
    if (document.getElementById('evs-pmin')) document.getElementById('evs-pmin').value = '';
    if (document.getElementById('evs-pmax')) document.getElementById('evs-pmax').value = '';
    if (document.getElementById('evs-sort')) document.getElementById('evs-sort').value = 'default';
    const brands = [...new Set(allCars.map(c => c.brand))];
    const types  = [...new Set(allCars.map(c => (c.bodyType||'').split('/')[0].trim()).filter(Boolean))];
    const countries = [...new Set(allCars.map(c => c.country).filter(Boolean))];
    brandActive = new Set(brands);
    bodyActive  = new Set(types);
    countryActive = new Set(countries);
    document.querySelectorAll('.evs-chip').forEach(el => el.classList.add('active'));
    evsApply();
  };

  /* ── GRID ── */
  function renderGrid() {
    const grid = document.getElementById('evs-grid');
    const cnt  = document.getElementById('evs-count');
    if (!grid) return;

    const totalPages = Math.ceil(filteredCars.length / ITEMS_PER_PAGE);
    if (currentPage > totalPages) currentPage = Math.max(1, totalPages);
    
    const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIdx = startIdx + ITEMS_PER_PAGE;
    const pageCars = filteredCars.slice(startIdx, endIdx);

    cnt.innerHTML = `<b>${filteredCars.length}</b> รุ่นที่พบ | หน้า ${currentPage}/${totalPages || 1}`;

    if (!filteredCars.length) {
      grid.innerHTML = '<div class="evs-empty"><div class="evs-empty-icon">🔍</div><div>ไม่พบรถที่ตรงกับเงื่อนไข</div></div>';
      renderPagination(0);
      return;
    }
    
    grid.innerHTML = pageCars.map(c => {
      const bt = (c.bodyType || '').split('/')[0].trim();
      const pd = fmtPrice(c.priceStr, c.priceNum);
      return `
        <div class="evs-card" onclick="evsShowDetail(${c.id})">
          <div class="evs-img">
            🚗
            <span class="evs-flag">${c.flag}</span>
          </div>
          <div class="evs-card-content">
            <div class="evs-brand-label">${c.brand}</div>
            <div class="evs-model-name">${c.model}</div>
            <div class="evs-sub-name">${c.sub || ''}</div>
            
            <div class="evs-price-section">
              ${pd ? `<div class="evs-price">${pd}</div>` : `<div class="evs-no-price">ราคายังไม่ประกาศ</div>`}
            </div>
            
            <div class="evs-specs">
              ${c.range ? `<div class="evs-spec-item"><span class="evs-spec-label">ระยะทาง</span><span class="evs-spec-value">${c.range} กม.</span></div>` : ''}
              ${c.hp ? `<div class="evs-spec-item"><span class="evs-spec-label">แรงม้า</span><span class="evs-spec-value">${c.hp} Hp</span></div>` : ''}
              ${c.batt ? `<div class="evs-spec-item"><span class="evs-spec-label">แบตเตอรี่</span><span class="evs-spec-value">${c.batt} kWh</span></div>` : ''}
              ${c.dc ? `<div class="evs-spec-item"><span class="evs-spec-label">ชาร์จ DC</span><span class="evs-spec-value">${c.dc} kW</span></div>` : ''}
            </div>
            
            ${bt ? `<span class="evs-body-badge">${bt}</span>` : ''}
          </div>
        </div>`;
    }).join('');
    
    renderPagination(totalPages);
  }

  function renderPagination(totalPages) {
    let paginationEl = document.getElementById('evs-pagination');
    if (!paginationEl) {
      paginationEl = document.createElement('div');
      paginationEl.id = 'evs-pagination';
      paginationEl.className = 'evs-pagination';
      document.getElementById('evs-grid')?.parentNode?.appendChild(paginationEl);
    }
    
    if (totalPages <= 1) {
      paginationEl.innerHTML = '';
      return;
    }

    let pages = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    paginationEl.innerHTML = `
      <button class="evs-page-btn" onclick="evsGoPage(1)" ${currentPage === 1 ? 'disabled' : ''}>«</button>
      <button class="evs-page-btn" onclick="evsGoPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>‹</button>
      ${pages.map(p => `<button class="evs-page-btn ${p === currentPage ? 'active' : ''}" onclick="evsGoPage(${p})">${p}</button>`).join('')}
      <button class="evs-page-btn" onclick="evsGoPage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>›</button>
      <button class="evs-page-btn" onclick="evsGoPage(${totalPages})" ${currentPage === totalPages ? 'disabled' : ''}>»</button>
    `;
  }

  window.evsGoPage = function(page) {
    const totalPages = Math.ceil(filteredCars.length / ITEMS_PER_PAGE);
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    renderGrid();
    document.querySelector('.evs-main')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  /* ── DETAIL ── */
  function specRow(label, val) {
    if (!val) return '';
    return `<tr><td>${label}</td><td>${val}</td></tr>`;
  }

  window.evsShowDetail = function(id) {
    const c = allCars.find(x => x.id === id);
    if (!c) return;
    const pd  = fmtPrice(c.priceStr, c.priceNum);
    const bt  = (c.bodyType || '').split('/')[0].trim();
    const qs  = [
      c.rangeNum ? { icon: '🛣️', val: c.rangeNum + ' กม.', lbl: 'ระยะทาง' } : null,
      c.hpNum    ? { icon: '⚡',  val: c.hpNum + ' Hp',    lbl: 'แรงม้า' } : null,
      c.accel    ? { icon: '⏱️', val: c.accel + ' วิ',    lbl: '0-100 กม./ชม.' } : null,
      c.battNum  ? { icon: '🔋', val: c.battNum + ' kWh',  lbl: 'แบตเตอรี่' } : null,
    ].filter(Boolean).slice(0, 4);

    const dc = document.getElementById('evs-detail-content');
    if (!dc) return;
    dc.innerHTML = `
      <div class="evs-detail-card">
        <div class="evs-detail-hero">
          <div class="evs-hero-img">🚗</div>
          <div class="evs-hero-info">
            <div class="evs-hero-brand">
              <span class="evs-hero-flag">${c.flag}</span>
              ${c.brand}${c.country ? ' · ' + c.country : ''}
            </div>
            <div class="evs-hero-model">${c.model}</div>
            <div class="evs-hero-sub">${c.sub || ''}</div>
            ${bt ? `<span class="evs-hero-badge">${bt}${c.segment ? ' · ' + c.segment : ''}</span>` : ''}
            <div class="evs-hero-price-label">ราคาเปิดตัวในไทย</div>
            <div class="evs-hero-price">${pd || 'ไม่ระบุ'}</div>
          </div>
        </div>

        ${qs.length ? `
        <div class="evs-qs">
          ${qs.map(q => `<div class="evs-qs-item"><div class="evs-qs-icon">${q.icon}</div><div class="evs-qs-val">${q.val}</div><div class="evs-qs-label">${q.lbl}</div></div>`).join('')}
        </div>` : ''}

        <div class="evs-sections">
          <div class="evs-section">
            <div class="evs-section-title">📋 ภาพรวม</div>
            <table class="evs-table">
              ${specRow('แบรนด์', c.brand)}
              ${specRow('รุ่น', c.model)}
              ${specRow('รุ่นย่อย', c.sub)}
              ${specRow('ประเทศผู้ผลิต', c.country)}
              ${specRow('ราคาเปิดตัวในไทย', c.priceStr ? '฿' + c.priceStr : '')}
              ${specRow('ระยะทางสูงสุด', c.range)}
              ${specRow('อัตราเร่ง 0-100 กม./ชม.', c.accel ? c.accel + ' วินาที' : '')}
              ${specRow('ความเร็วสูงสุด', c.topSpeed ? c.topSpeed + ' กม./ชม.' : '')}
            </table>
          </div>
          <div class="evs-section">
            <div class="evs-section-title">⚙️ มอเตอร์และแบตเตอรี่</div>
            <table class="evs-table">
              ${specRow('กำลังมอเตอร์', c.motorKw ? c.motorKw + ' kW' : '')}
              ${specRow('แรงม้า', c.hp ? c.hp + ' Hp' : '')}
              ${specRow('แรงบิดสูงสุด', c.torque ? c.torque + ' Nm' : '')}
              ${specRow('ระบบขับเคลื่อน', c.drive)}
              ${specRow('ประเภทมอเตอร์', c.motorType)}
              ${specRow('ขนาดแบตเตอรี่', c.batt ? c.batt + ' kWh' : '')}
              ${specRow('ความจุแบตเตอรี่', c.cap ? c.cap + ' kWh' : '')}
              ${specRow('ประเภทแบตเตอรี่', c.battType)}
              ${specRow('รอบการชาร์จ', c.cycles)}
            </table>
          </div>
          <div class="evs-section">
            <div class="evs-section-title">🔌 การชาร์จ</div>
            <table class="evs-table">
              ${specRow('DC ชาร์จ สูงสุด', c.dc ? c.dc + ' kW' : '')}
              ${specRow('AC ชาร์จ สูงสุด', c.ac ? c.ac + ' kW' : '')}
              ${specRow('V2L', c.v2l ? c.v2l + ' kW' : '')}
              ${specRow('อัตราการบริโภคพลังงาน', c.consumption ? c.consumption + ' kWh/100km' : '')}
            </table>
          </div>
          <div class="evs-section">
            <div class="evs-section-title">📐 ขนาดและน้ำหนัก</div>
            <table class="evs-table">
              ${specRow('ประเภทตัวถัง', c.bodyType)}
              ${specRow('Segment', c.segment)}
              ${specRow('จำนวนที่นั่ง', c.seats ? c.seats + ' ที่นั่ง' : '')}
              ${specRow('จำนวนประตู', c.doors ? c.doors + ' ประตู' : '')}
              ${specRow('ความยาว', c.length ? c.length + ' มม.' : '')}
              ${specRow('ความกว้าง', c.width ? c.width + ' มม.' : '')}
              ${specRow('ความสูง', c.height ? c.height + ' มม.' : '')}
              ${specRow('ระยะฐานล้อ', c.wheelbase ? c.wheelbase + ' มม.' : '')}
              ${specRow('ระยะห่างล้อ', c.track)}
              ${specRow('รัศมีวงเลี้ยว', c.turning ? c.turning + ' ม.' : '')}
              ${specRow('ความสูงใต้ท้องรถ', c.gc ? c.gc + ' มม.' : '')}
              ${specRow('น้ำหนักรถเปล่า', c.weight ? c.weight + ' กก.' : '')}
              ${specRow('พื้นที่เก็บสัมภาระหน้า', c.frtTrunk ? c.frtTrunk + ' ลิตร' : '')}
              ${specRow('พื้นที่เก็บสัมภาระท้าย', c.trunk ? c.trunk + ' ลิตร' : '')}
              ${specRow('พื้นที่เมื่อพับเบาะหลัง', c.fold ? c.fold + ' ลิตร' : '')}
            </table>
          </div>
        </div>
      </div>`;

    // Hide layout, show detail full width
    const layout = document.querySelector('.evs-layout');
    if (layout) layout.style.display = 'none';
    document.getElementById('evs-detail').style.display = 'block';
    
    // Update URL with car slug
    const slug = `${c.brand}-${c.model}${c.sub ? '-' + c.sub : ''}`.replace(/\s+/g, '-');
    history.pushState({ carId: id }, '', `#${encodeURIComponent(slug)}`);
    
    document.querySelector('.evspec-root')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  window.evsShowList = function() {
    document.getElementById('evs-detail').style.display = 'none';
    const layout = document.querySelector('.evs-layout');
    if (layout) layout.style.display = 'grid';
    
    // Clear URL hash
    history.pushState({}, '', window.location.pathname);
  };
  
  // Handle browser back/forward
  window.addEventListener('popstate', function(e) {
    if (e.state && e.state.carId) {
      const c = allCars.find(x => x.id === e.state.carId);
      if (c) evsShowDetail(c.id);
    } else {
      evsShowList();
    }
  });
  
  // Check URL hash on load
  function checkUrlHash() {
    const hash = decodeURIComponent(window.location.hash.slice(1));
    if (hash && allCars.length) {
      // Try to find car by slug (Brand-Model-Sub)
      const car = allCars.find(c => {
        const slug = `${c.brand}-${c.model}${c.sub ? '-' + c.sub : ''}`.replace(/\s+/g, '-');
        return slug.toLowerCase() === hash.toLowerCase();
      });
      if (car) {
        setTimeout(() => evsShowDetail(car.id), 100);
      }
    }
  }

  /* ── EVENT LISTENERS (lazy bind) ── */
  function bindListeners() {
    const si = document.getElementById('evs-search');
    const ss = document.getElementById('evs-sort');
    const pm = document.getElementById('evs-pmin');
    const px = document.getElementById('evs-pmax');
    if (si) si.addEventListener('input', evsApply);
    if (ss) ss.addEventListener('change', evsApply);
    if (pm) pm.addEventListener('input', evsApply);
    if (px) px.addEventListener('input', evsApply);
  }

  /* ── INIT on tab click (lazy load) ── */
  function initEvSpec() {
    if (loaded) return;
    loaded = true;
    loadData().then(cars => {
      allCars = cars;
      filteredCars = [...cars];
      document.getElementById('evs-loading').style.display = 'none';
      document.getElementById('evs-grid').style.display = 'grid';
      renderChips();
      bindListeners();
      evsApply();
      checkUrlHash(); // Check if URL has car slug
    }).catch(err => {
      console.error('[evspec] load error:', err);
      const el = document.getElementById('evs-loading');
      if (el) el.textContent = '⚠️ โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่';
    });
  }

  /* observe tab button click */
  document.addEventListener('click', function(e) {
    if (e.target && e.target.dataset && e.target.dataset.tab === 'evspec') {
      setTimeout(initEvSpec, 50);
    }
  });

  /* also init if tab is already active on page load */
  if (document.getElementById('evspec')?.classList.contains('tabpane--active')) {
    initEvSpec();
  }
})();
