/**
 * evspec.js — EV Spec Viewer for data.iphonemod.net
 * Tab: "สเปครถ EV" | Data: Google Sheets CSV
 * iMoD Drive © 2026
 */

(function () {
  const SHEET_URL =
    'https://docs.google.com/spreadsheets/d/1SphsQR8V9eKcWzonLXjPgXZcmyKids0WnYi_B-MiRl0/export?format=csv&gid=0';

  const FLAGS = {
    BYD: '🇨🇳', GWM: '🇨🇳', Volvo: '🇸🇪', MG: '🇨🇳',
    Tesla: '🇺🇸', Toyota: '🇯🇵', Lexus: '🇯🇵', BMW: '🇩🇪', MAXUS: '🇨🇳',
  };
  const COUNTRIES = {
    BYD: 'จีน', GWM: 'จีน', Volvo: 'สวีเดน', MG: 'จีน',
    Tesla: 'สหรัฐอเมริกา', Toyota: 'ญี่ปุ่น', Lexus: 'ญี่ปุ่น',
    BMW: 'เยอรมนี', MAXUS: 'จีน',
  };

  let allCars = [], filteredCars = [], loaded = false;
  let brandActive = new Set(), bodyActive = new Set();

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

  /* ── LOAD ── */
  async function loadData() {
    const res = await fetch(SHEET_URL);
    const text = await res.text();
    const rows = parseCSV(text);

    const brandRow  = rows[0];
    const modelRow  = findRow(rows, 'รุ่น') || rows[3];
    const subRow    = findRow(rows, 'รุ่นย่อย') || rows[4];
    const rangeRow  = findRowP(rows, 'ระยะทางสูงสุด (กม.)');
    const accelRow  = findRow(rows, 'อัตราเร่ง 0-100 (กม./ชม.)');
    const accel2Row = findRowP(rows, 'อัตราเร่ง 0 - 100');
    const motorKwR  = findRow(rows, 'กำลังมอเตอร์ (kw)') || findRowP(rows, 'กำลังมอเตอร์');
    const maxPowR   = findRowP(rows, 'กำลังสูงสุด');
    const hpRow     = findRowP(rows, 'แรงม้า (hp)') || findRowP(rows, 'แรงม้า');
    const battRow   = findRowP(rows, 'ขนาดแบตเตอรี่');
    const dcRow     = findRow(rows, 'การชาร์จ dc') || findRowP(rows, 'dc สูงสุด');
    const acRow     = findRow(rows, 'การชาร์จ ac') || findRowP(rows, 'ac สูงสุด');
    const priceRow  = findRowP(rows, 'ราคาเปิดตัวในไทย');
    const bodyRows  = rows.filter(r => r[0] && r[0].trim() === 'ประเภทตัวถัง');
    const bodyRow   = bodyRows[0];
    const segRow    = findRowP(rows, 'segment');
    const lenRow    = findRowP(rows, 'ความยาวตัวรถ');
    const widRow    = findRowP(rows, 'ความกว้างตัวรถ');
    const htRow     = findRowP(rows, 'ความสูงตัวรถ');
    const wbRow     = findRowP(rows, 'ระยะฐานล้อ');
    const gcRow     = findRowP(rows, 'ความสูงใต้ท้องรถ (มม.)');
    const seatsRow  = findRowP(rows, 'จำนวนที่นั่ง');
    const doorsRow  = findRowP(rows, 'จำนวนประตู');
    const wgtRow    = findRowP(rows, 'น้ำหนักรถเปล่า');
    const trunkRow  = findRowP(rows, 'พื้นที่เก็บสัมภาระท้ายรถ');
    const mtrTypeR  = findRowP(rows, 'ประเภทมอเตอร์');
    const driveRow  = findRowP(rows, 'ระบบขับเคลื่อน');
    const torqRow   = findRowP(rows, 'แรงบิดสูงสุด');
    const topSpRow  = findRowP(rows, 'ความเร็วสูงสุด');
    const battTypeR = findRowP(rows, 'ประเภทแบตเตอรี่');
    const v2lRow    = findRowP(rows, 'v2l');
    const consRow   = findRowP(rows, 'อัตราการบริโภค');
    const capRow    = findRowP(rows, 'ความจุแบตเตอรี่สูงสุด');
    const turnRow   = findRowP(rows, 'รัศมีวงเลี้ยว');
    const cycleRow  = findRowP(rows, 'รอบการชาร์จ');
    const trackRow  = findRowP(rows, 'ระยะห่างล้อ');
    const frtRow    = findRowP(rows, 'พื้นที่เก็บสัมภาระด้านหน้า');
    const foldRow   = findRowP(rows, 'ความจุพื้นที่เก็บสัมภาระเมื่อพับ');

    const numCols = Math.max(...rows.map(r => r.length));
    let prevBrand = '';
    const cars = [];

    for (let col = 1; col < numCols; col++) {
      const rawBrand = brandRow[col]?.trim();
      const brand = rawBrand || prevBrand;
      if (rawBrand) prevBrand = rawBrand;
      const model = modelRow?.[col]?.trim();
      if (!brand || !model || model === 'รุ่น') continue;

      const sub      = subRow?.[col]?.trim() || '';
      const range    = rangeRow?.[col]?.trim() || '';
      const priceStr = priceRow?.[col]?.trim() || '';
      const hp       = hpRow?.[col]?.trim() || '';
      const batt     = battRow?.[col]?.trim() || '';
      const dc       = dcRow?.[col]?.trim() || '';
      const ac       = acRow?.[col]?.trim() || '';
      const accel    = accelRow?.[col]?.trim() || accel2Row?.[col]?.trim() || '';
      const bodyType = bodyRow?.[col]?.trim() || '';
      if (!priceStr && !hp && !range && !batt) continue;

      cars.push({
        id: col, brand, model, sub,
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
        consumption: consRow?.[col]?.trim() || '',
        cap:       capRow?.[col]?.trim() || '',
        turning:   turnRow?.[col]?.trim() || '',
        motorKw:   motorKwR?.[col]?.trim() || maxPowR?.[col]?.trim() || '',
        cycles:    cycleRow?.[col]?.trim() || '',
        track:     trackRow?.[col]?.trim() || '',
        frtTrunk:  frtRow?.[col]?.trim() || '',
        fold:      foldRow?.[col]?.trim() || '',
        flag:      FLAGS[brand] || '🌐',
        country:   COUNTRIES[brand] || '',
      });
    }
    return cars;
  }

  /* ── RENDER CHIPS ── */
  function renderChips() {
    const brands = [...new Set(allCars.map(c => c.brand))].sort();
    const types  = [...new Set(allCars.map(c => (c.bodyType||'').split('/')[0].trim()).filter(Boolean))].sort();

    const bc = document.getElementById('evs-brand-chips');
    if (bc) {
      bc.innerHTML = brands.map(b =>
        `<span class="evs-chip active" data-brand="${b}" onclick="evsToggleBrand('${b}')">${FLAGS[b]||''} ${b}</span>`
      ).join('');
      brandActive = new Set(brands);
    }
    const tc = document.getElementById('evs-body-chips');
    if (tc) {
      tc.innerHTML = types.map(t =>
        `<span class="evs-chip active" data-body="${t}" onclick="evsToggleBody('${t}')">${t}</span>`
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

  function evsApply() {
    const q    = (document.getElementById('evs-search')?.value || '').toLowerCase();
    const pMin = parseFloat(document.getElementById('evs-pmin')?.value) || 0;
    const pMax = parseFloat(document.getElementById('evs-pmax')?.value) || Infinity;
    const sort = document.getElementById('evs-sort')?.value || 'default';

    filteredCars = allCars.filter(c => {
      if (q && !`${c.brand} ${c.model} ${c.sub}`.toLowerCase().includes(q)) return false;
      if (!brandActive.has(c.brand)) return false;
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
    brandActive = new Set(brands);
    bodyActive  = new Set(types);
    document.querySelectorAll('.evs-chip').forEach(el => el.classList.add('active'));
    evsApply();
  };

  /* ── GRID ── */
  function renderGrid() {
    const grid = document.getElementById('evs-grid');
    const cnt  = document.getElementById('evs-count');
    if (!grid) return;
    cnt.innerHTML = `<b>${filteredCars.length}</b> รุ่นที่พบ`;

    if (!filteredCars.length) {
      grid.innerHTML = '<div class="evs-empty"><div class="evs-empty-icon">🔍</div><div>ไม่พบรถที่ตรงกับเงื่อนไข</div></div>';
      return;
    }
    grid.innerHTML = filteredCars.map(c => {
      const bt = (c.bodyType || '').split('/')[0].trim();
      const pd = fmtPrice(c.priceStr, c.priceNum);
      return `
        <div class="evs-card" onclick="evsShowDetail(${c.id})">
          <div class="evs-card-top">
            <div class="evs-flag">${c.flag}</div>
            <div class="evs-brand-label">${c.brand}</div>
            <div class="evs-model-name">${c.model}</div>
            <div class="evs-sub-name">${c.sub || '—'}</div>
          </div>
          <div class="evs-img">🚗</div>
          <div class="evs-specs">
            ${c.range ? `<div class="evs-spec-row"><span class="evs-sk">ระยะทาง</span><span class="evs-sv">${c.range}</span></div>` : ''}
            ${c.hp ? `<div class="evs-spec-row"><span class="evs-sk">แรงม้า</span><span class="evs-sv">${c.hp} Hp</span></div>` : ''}
            ${c.batt ? `<div class="evs-spec-row"><span class="evs-sk">แบตเตอรี่</span><span class="evs-sv">${c.batt} kWh</span></div>` : ''}
            ${c.dc ? `<div class="evs-spec-row"><span class="evs-sk">DC Max</span><span class="evs-sv">${c.dc} kW</span></div>` : ''}
          </div>
          <div class="evs-card-footer">
            <div>${bt ? `<span class="evs-body-badge">${bt}</span>` : ''}</div>
            <div class="evs-price-wrap">
              ${pd ? `<div class="evs-price-sub">ราคาเริ่มต้น</div><div class="evs-price">${pd}</div>`
                   : `<div class="evs-no-price">ไม่ระบุราคา</div>`}
            </div>
          </div>
        </div>`;
    }).join('');
  }

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

    document.getElementById('evs-grid').style.display = 'none';
    document.getElementById('evs-detail').style.display = 'block';
    document.getElementById('evs-toolbar')?.style && (document.getElementById('evs-toolbar').style.display = 'none');
    document.getElementById('evs-filters-bar')?.style && (document.getElementById('evs-filters-bar').style.display = 'none');
    document.querySelector('.evspec-root')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  window.evsShowList = function() {
    document.getElementById('evs-detail').style.display = 'none';
    document.getElementById('evs-grid').style.display = 'grid';
    const tb = document.getElementById('evs-toolbar');
    const fb = document.getElementById('evs-filters-bar');
    if (tb) tb.style.display = '';
    if (fb) fb.style.display = '';
  };

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
