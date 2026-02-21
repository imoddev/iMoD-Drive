import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.1";
import Chart from "https://esm.sh/chart.js@4.4.1/auto";

let SUPABASE_URL;
let SUPABASE_KEY;

async function loadConfig() {
  try {
    const cfg = await import("./config.js");
    SUPABASE_URL = cfg.SUPABASE_URL;
    SUPABASE_KEY = cfg.SUPABASE_KEY;
  } catch (e) {
    throw new Error(
      "ไม่พบไฟล์ web/config.js\nให้คัดลอก web/config.example.js เป็น web/config.js แล้วใส่ SUPABASE_URL / SUPABASE_KEY",
    );
  }
}

function setStatus(text) {
  document.getElementById("statusText").textContent = text;
}

function formatInt(value) {
  return new Intl.NumberFormat("th-TH").format(value ?? 0);
}

function show(elId, visible) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.classList.toggle("hidden", !visible);
}

function setActiveTab(tabName) {
  // Remove active from all tabs and dropdown items
  document.querySelectorAll(".tab").forEach((b) => {
    b.classList.toggle("tab--active", b.dataset.tab === tabName);
  });
  document.querySelectorAll(".tab-dropdown-item").forEach((b) => {
    b.classList.toggle("tab--active", b.dataset.tab === tabName);
  });
  // Also highlight dropdown toggle if any dropdown item is active
  const dropdownTabs = ["overview", "explore", "upload"];
  const dropdownToggle = document.querySelector(".tab-dropdown-toggle");
  if (dropdownToggle) {
    dropdownToggle.classList.toggle("tab--active", dropdownTabs.includes(tabName));
  }
  document.querySelectorAll(".tabpane").forEach((p) => {
    p.classList.toggle("tabpane--active", p.id === tabName);
  });
  
  // Hide/show main stats container based on active tab
  const statsContainer = document.querySelector(".main-stats-container");
  if (statsContainer) {
    // Show only for stats-related tabs (overview, explore, upload, about)
    const showStats = ["overview", "explore", "upload", "about"].includes(tabName);
    statsContainer.classList.toggle("hidden", !showStats);
  }
}

function installTabs() {
  document.querySelectorAll(".tab[data-tab]").forEach((b) => {
    b.addEventListener("click", () => setActiveTab(b.dataset.tab));
  });
  document.querySelectorAll(".tab-dropdown-item[data-tab]").forEach((b) => {
    b.addEventListener("click", () => setActiveTab(b.dataset.tab));
  });
}

function fillSelect(select, values, getLabel = (v) => String(v)) {
  select.innerHTML = "";
  values.forEach((v) => {
    const opt = document.createElement("option");
    opt.value = String(v);
    opt.textContent = getLabel(v);
    select.appendChild(opt);
  });
}

function renderTableRows(tbody, rows, renderRow) {
  tbody.innerHTML = "";
  rows.forEach((row, idx) => {
    tbody.appendChild(renderRow(row, idx));
  });
}

async function rpc(supabase, fn, args) {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw error;
  return data ?? [];
}

let monthlyTotalsChart;
let vehicleTypeShareChart;

function renderMonthlyTotalsChart(canvas, labels, values) {
  if (monthlyTotalsChart) monthlyTotalsChart.destroy();
  monthlyTotalsChart = new Chart(canvas, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "ยอดจดทะเบียน",
          data: values,
          borderColor: "#4aa3ff",
          backgroundColor: "rgba(74,163,255,0.18)",
          fill: true,
          tension: 0.35,
          pointRadius: 2.5,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => `${formatInt(ctx.raw)} คัน`,
          },
        },
      },
      scales: {
        y: {
          ticks: {
            callback: (v) => formatInt(v),
          },
          grid: { color: "rgba(255,255,255,0.06)" },
        },
        x: { grid: { color: "rgba(255,255,255,0.04)" } },
      },
    },
  });
}

function renderVehicleTypeShareChart(canvas, labels, values) {
  if (vehicleTypeShareChart) vehicleTypeShareChart.destroy();
  vehicleTypeShareChart = new Chart(canvas, {
    type: "doughnut",
    data: {
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: ["#4aa3ff", "#7c5cff", "#41d18a", "#ffcf5a", "#ff5a6a", "#a7b4c6"],
          borderWidth: 0,
        },
      ],
    },
    options: {
      plugins: {
        legend: { position: "bottom", labels: { color: "#eaf1ff" } },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.label}: ${formatInt(ctx.raw)} คัน`,
          },
        },
      },
      cutout: "62%",
    },
  });
}

async function loadOverview(supabase, year) {
  const yearBe = Number(year);

  const monthly = await rpc(supabase, "rpc_monthly_totals", { p_year_be: yearBe });
  const labels = monthly.map((r) => `${r.month_num}`);
  const values = monthly.map((r) => Number(r.total ?? 0));
  const yearTotal = values.reduce((a, b) => a + b, 0);
  const yearTotalLabel = document.getElementById("yearTotalLabel");
  if (yearTotalLabel) yearTotalLabel.textContent = `รวมทั้งปี: ${formatInt(yearTotal)}`;
  const hasMonthly = monthly.length > 0 && values.some((v) => v > 0);
  show("monthlyTotalsEmpty", !hasMonthly);
  if (hasMonthly) {
    renderMonthlyTotalsChart(document.getElementById("monthlyTotalsChart"), labels, values);
  }

  const latest = await rpc(supabase, "rpc_latest_month", { p_year_be: yearBe });
  const latestMonth = latest?.[0]?.month_num ?? null;
  const latestMonthTh = latest?.[0]?.month_th ?? null;
  document.getElementById("latestMonthLabel").textContent =
    latestMonth ? `เดือน ${latestMonth} (${latestMonthTh ?? "-"})` : "—";

  if (!latestMonth) {
    show("vehicleTypeEmpty", true);
  } else {
    const types = await rpc(supabase, "rpc_vehicle_type_share", {
      p_year_be: yearBe,
      p_month_num: Number(latestMonth),
    });
    const labels2 = types.map((r) => r.type_name);
    const values2 = types.map((r) => Number(r.total ?? 0));
    const hasTypes = types.length > 0 && values2.some((v) => v > 0);
    show("vehicleTypeEmpty", !hasTypes);
    if (hasTypes) {
      renderVehicleTypeShareChart(document.getElementById("vehicleTypeShareChart"), labels2, values2);
    }
  }

  const brands = await rpc(supabase, "rpc_top_brands", { p_year_be: yearBe, p_limit: 10, p_powertrain: null });
  const brandsTbody = document.querySelector("#topBrandsTable tbody");
  show("topBrandsEmpty", brands.length === 0);
  renderTableRows(brandsTbody, brands, (row, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${i + 1}</td><td>${row.brand_name}</td><td class=\"num\">${formatInt(row.total)}</td>`;
    return tr;
  });

  const models = await rpc(supabase, "rpc_top_models", { p_year_be: yearBe, p_limit: 10, p_powertrain: null });
  const modelsTbody = document.querySelector("#topModelsTable tbody");
  show("topModelsEmpty", models.length === 0);
  renderTableRows(modelsTbody, models, (row, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${i + 1}</td><td>${row.brand_name}</td><td>${row.model_name}</td><td class=\"num\">${formatInt(
      row.total,
    )}</td>`;
    return tr;
  });
}

async function loadExplore(supabase, params) {
  const yearBe = Number(params.year);
  const monthNum = params.month ? Number(params.month) : null;
  const type = params.type?.trim() || null;
  const brand = params.brand?.trim() || null;
  const powertrain = params.powertrain?.trim() || null;

  const rows = await rpc(supabase, "rpc_explore", {
    p_year_be: yearBe,
    p_month_num: monthNum,
    p_type: type,
    p_brand: brand,
    p_powertrain: powertrain,
    p_limit: 200,
    p_offset: 0,
  });

  const tbody = document.querySelector("#exploreTable tbody");
  show("exploreEmpty", rows.length === 0);
  renderTableRows(tbody, rows, (r) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${r.year_be}</td>
      <td>${r.month_num}</td>
      <td>${r.type_name}</td>
      <td>${r.brand_name}</td>
      <td>${r.model_name}</td>
      <td>${r.powertrain ?? ""}</td>
      <td class="num">${formatInt(r.total)}</td>
    `;
    return tr;
  });
}

async function main() {
  installTabs();

  await loadConfig();
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true },
  });

  setStatus(`เชื่อมต่อ: ${SUPABASE_URL}\nกำลังโหลดปีที่มีข้อมูล…`);

  // Upload/Auth UI wiring (works even if there is no data yet)
  await initUploadUi(supabase);

  const years = await rpc(supabase, "rpc_available_years", {});
  const yearValues = years.map((r) => r.year_be);

  if (yearValues.length === 0) {
    setStatus(
      "เชื่อมต่อสำเร็จ แต่ยังไม่พบข้อมูล (ยังไม่มี ingestion_runs ที่ status = 'succeeded')\nคุณยังสามารถใช้งานแท็บ “อัปโหลด” เพื่ออัปโหลดไฟล์ CSV ได้",
    );
    return;
  }

  const yearSelect = document.getElementById("yearSelect");
  const exploreYear = document.getElementById("exploreYear");
  fillSelect(yearSelect, yearValues);
  fillSelect(exploreYear, yearValues);

  const selectedYear = yearValues[yearValues.length - 1];
  yearSelect.value = String(selectedYear);
  exploreYear.value = String(selectedYear);

  setStatus(`พร้อมใช้งาน • ปีล่าสุด: ${selectedYear}`);

  await loadOverview(supabase, selectedYear);

  yearSelect.addEventListener("change", async () => {
    try {
      setStatus(`กำลังโหลดข้อมูลปี ${yearSelect.value}…`);
      await loadOverview(supabase, yearSelect.value);
      setStatus(`พร้อมใช้งาน • ปีที่เลือก: ${yearSelect.value}`);
    } catch (e) {
      setStatus(`เกิดข้อผิดพลาด: ${e.message ?? String(e)}`);
    }
  });

  const exploreForm = document.getElementById("exploreForm");
  exploreForm.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    try {
      setStatus("กำลังค้นหา…");
      await loadExplore(supabase, {
        year: exploreYear.value,
        month: document.getElementById("exploreMonth").value,
        type: document.getElementById("exploreType").value,
        brand: document.getElementById("exploreBrand").value,
        powertrain: document.getElementById("explorePowertrain").value,
      });
      setStatus("พร้อมใช้งาน");
      setActiveTab("explore");
    } catch (e) {
      setStatus(`เกิดข้อผิดพลาด: ${e.message ?? String(e)}`);
    }
  });
}

main().catch((e) => setStatus(`เกิดข้อผิดพลาด: ${e.message ?? String(e)}`));

async function initUploadUi(supabase) {
  const authSignedOut = document.getElementById("authSignedOut");
  const authSignedIn = document.getElementById("authSignedIn");
  const authUserEmail = document.getElementById("authUserEmail");

  const authEmail = document.getElementById("authEmail");
  const authPassword = document.getElementById("authPassword");
  const btnSignInPassword = document.getElementById("btnSignInPassword");
  const btnSendMagicLink = document.getElementById("btnSendMagicLink");
  const btnSignOut = document.getElementById("btnSignOut");

  const uploadFile = document.getElementById("uploadFile");
  const uploadYear = document.getElementById("uploadYear");
  const uploadMonth = document.getElementById("uploadMonth");
  const uploadFilename = document.getElementById("uploadFilename");
  const uploadOverwrite = document.getElementById("uploadOverwrite");
  const btnUpload = document.getElementById("btnUpload");
  const uploadResult = document.getElementById("uploadResult");
  const ingestObjectPath = document.getElementById("ingestObjectPath");
  const btnIngestFromStorage = document.getElementById("btnIngestFromStorage");
  const btnRefreshUploadLogs = document.getElementById("btnRefreshUploadLogs");
  const uploadLogsTbody = document.querySelector("#uploadLogsTable tbody");
  const btnRefreshIngestionRuns = document.getElementById("btnRefreshIngestionRuns");
  const ingestionRunsTbody = document.querySelector("#ingestionRunsTable tbody");

  function setUploadResult(text, kind = "info") {
    uploadResult.textContent = text;
    uploadResult.classList.remove("hidden", "callout--ok", "callout--err");
    if (kind === "ok") uploadResult.classList.add("callout--ok");
    if (kind === "err") uploadResult.classList.add("callout--err");
  }

  function formatErr(e) {
    if (!e) return "unknown error";
    if (typeof e === "string") return e;
    const message = e.message ?? String(e);
    const extras = [];
    if (e.code) extras.push(`code=${e.code}`);
    if (e.details) extras.push(`details=${e.details}`);
    if (e.hint) extras.push(`hint=${e.hint}`);
    return extras.length ? `${message}\n${extras.join("\n")}` : message;
  }

  function setAuthUi(user) {
    const signedIn = !!user;
    authSignedOut.classList.toggle("hidden", signedIn);
    authSignedIn.classList.toggle("hidden", !signedIn);
    authUserEmail.textContent = user?.email ?? "";
  }

  function formatBytes(bytes) {
    if (!bytes || bytes <= 0) return "";
    const units = ["B", "KB", "MB", "GB"];
    let v = bytes;
    let i = 0;
    while (v >= 1024 && i < units.length - 1) {
      v /= 1024;
      i += 1;
    }
    const fixed = i === 0 ? 0 : 1;
    return `${v.toFixed(fixed)} ${units[i]}`;
  }

  function renderUploadLogs(rows) {
    uploadLogsTbody.innerHTML = "";
    rows.forEach((r) => {
      const tr = document.createElement("tr");
      const dt = r.created_at ? new Date(r.created_at) : null;
      const time = dt ? dt.toLocaleString("th-TH") : "";
      const status = r.status || "";
      tr.innerHTML = `
        <td>${time}</td>
        <td>${r.user_email ?? ""}</td>
        <td>${r.bucket ?? ""}</td>
        <td><span class="mono">${r.object_path ?? ""}</span></td>
        <td class="num">${formatBytes(r.byte_size)}</td>
        <td>${status}</td>
      `;
      uploadLogsTbody.appendChild(tr);
    });
    show("uploadLogsEmpty", rows.length === 0);
  }

  async function refreshUploadLogs() {
    try {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session?.user) {
        renderUploadLogs([]);
        show("uploadLogsEmpty", true);
        return;
      }
      const { data: rows, error } = await supabase
        .from("upload_logs")
        .select("created_at,user_email,bucket,object_path,byte_size,status")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      renderUploadLogs(rows ?? []);
    } catch (e) {
      renderUploadLogs([]);
      setUploadResult(`โหลดประวัติไม่สำเร็จ: ${e.message ?? String(e)}`, "err");
    }
  }

  function renderIngestionRuns(rows) {
    ingestionRunsTbody.innerHTML = "";
    rows.forEach((r) => {
      const dtStart = r.started_at ? new Date(r.started_at) : null;
      const dtEnd = r.finished_at ? new Date(r.finished_at) : null;
      const start = dtStart ? dtStart.toLocaleString("th-TH") : "";
      const end = dtEnd ? dtEnd.toLocaleString("th-TH") : "";
      const month = r.month_num ? String(r.month_num).padStart(2, "0") : "";
      const file = r.object_path ?? "";
      const status = r.status ?? "";
      const rowCount = r.row_count ?? "";

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${start}</td>
        <td>${end}</td>
        <td>${status}</td>
        <td>${r.year_be ?? ""}</td>
        <td>${month}</td>
        <td><span class="mono">${file}</span></td>
        <td class="num">${rowCount === "" ? "" : formatInt(rowCount)}</td>
      `;
      ingestionRunsTbody.appendChild(tr);
    });
    show("ingestionRunsEmpty", rows.length === 0);
  }

  async function refreshIngestionRuns() {
    try {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session?.user) {
        renderIngestionRuns([]);
        show("ingestionRunsEmpty", true);
        return;
      }
      const data = await rpc(supabase, "rpc_ingestion_runs_recent", { p_limit: 30 });
      renderIngestionRuns(data ?? []);
    } catch (e) {
      renderIngestionRuns([]);
      setUploadResult(`โหลด ingestion run ไม่สำเร็จ: ${e.message ?? String(e)}`, "err");
    }
  }

  const { data } = await supabase.auth.getSession();
  setAuthUi(data?.session?.user ?? null);
  await refreshUploadLogs();
  await refreshIngestionRuns();

  supabase.auth.onAuthStateChange((_event, session) => {
    setAuthUi(session?.user ?? null);
    refreshUploadLogs().catch(() => {});
    refreshIngestionRuns().catch(() => {});
  });

  btnSignInPassword.addEventListener("click", async () => {
    try {
      const email = authEmail.value.trim();
      const password = authPassword.value;
      if (!email || !password) {
        setUploadResult("กรุณาใส่ Email และ Password", "err");
        return;
      }
      setUploadResult("กำลัง sign in…");
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      setUploadResult("เข้าสู่ระบบสำเร็จ", "ok");
    } catch (e) {
      setUploadResult(`เข้าสู่ระบบไม่สำเร็จ: ${e.message ?? String(e)}`, "err");
    }
  });

  btnSendMagicLink.addEventListener("click", async () => {
    try {
      const email = authEmail.value.trim();
      if (!email) {
        setUploadResult("กรุณาใส่ Email", "err");
        return;
      }
      setUploadResult("กำลังส่ง magic link…");
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin + window.location.pathname,
        },
      });
      if (error) throw error;
      setUploadResult("ส่งลิงก์แล้ว กรุณาเช็คอีเมลเพื่อยืนยันการเข้าสู่ระบบ", "ok");
    } catch (e) {
      setUploadResult(`ส่งลิงก์ไม่สำเร็จ: ${e.message ?? String(e)}`, "err");
    }
  });

  btnSignOut.addEventListener("click", async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUploadResult("ออกจากระบบแล้ว", "ok");
    } catch (e) {
      setUploadResult(`Sign out ไม่สำเร็จ: ${e.message ?? String(e)}`, "err");
    }
  });

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  async function sha256HexFromFile(file) {
    const buf = await file.arrayBuffer();
    const hash = await crypto.subtle.digest("SHA-256", buf);
    const bytes = new Uint8Array(hash);
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  async function sha256HexFromBlob(blob) {
    const buf = await blob.arrayBuffer();
    const hash = await crypto.subtle.digest("SHA-256", buf);
    const bytes = new Uint8Array(hash);
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  function parseCsv(text) {
    const out = [];
    let row = [];
    let field = "";
    let inQuotes = false;

    const pushField = () => {
      row.push(field);
      field = "";
    };
    const pushRow = () => {
      out.push(row);
      row = [];
    };

    const s = String(text ?? "").replace(/^\uFEFF/, "");
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (inQuotes) {
        if (c === '"') {
          const next = s[i + 1];
          if (next === '"') {
            field += '"';
            i += 1;
          } else {
            inQuotes = false;
          }
        } else {
          field += c;
        }
        continue;
      }

      if (c === '"') {
        inQuotes = true;
        continue;
      }
      if (c === ",") {
        pushField();
        continue;
      }
      if (c === "\r") continue;
      if (c === "\n") {
        pushField();
        pushRow();
        continue;
      }
      field += c;
    }
    pushField();
    pushRow();

    if (out.length && out[out.length - 1].every((v) => String(v ?? "").trim() === "")) out.pop();
    return out;
  }

  async function ingestCsvTextIntoDb({ csvText, bucket, objectPath, sha256Hex }) {
    const table = parseCsv(csvText);
    if (table.length < 2) throw new Error("CSV ไม่มีข้อมูล (มีแต่ header หรือว่าง)");

    const header = table[0].map((h) => String(h ?? "").trim());
    const required = ["ปี พ.ศ.", "เดือน", "ประเภทรถ", "ยี่ห้อ", "รุ่น", "จำนวน"];
    const missing = required.filter((c) => !header.includes(c));
    if (missing.length) throw new Error(`CSV ขาดคอลัมน์: ${missing.join(", ")}`);

    const idx = Object.fromEntries(header.map((h, i) => [h, i]));
    const rows = [];
    for (let r = 1; r < table.length; r++) {
      const line = table[r];
      const yearBe = Number(line[idx["ปี พ.ศ."]]);
      const monthTh = String(line[idx["เดือน"]] ?? "").trim();
      const vehicleType = String(line[idx["ประเภทรถ"]] ?? "").trim();
      const brand = String(line[idx["ยี่ห้อ"]] ?? "").trim();
      const modelRaw = line[idx["รุ่น"]];
      const model = modelRaw === undefined || modelRaw === null ? null : String(modelRaw).trim();
      const count = Number(line[idx["จำนวน"]]);

      if (!Number.isFinite(yearBe) || !monthTh || !vehicleType || !brand || !Number.isFinite(count)) continue;
      rows.push({
        year_be: yearBe,
        month_th: monthTh,
        vehicle_type: vehicleType,
        brand,
        model: model || null,
        count: Math.max(0, Math.trunc(count)),
      });
    }

    if (rows.length === 0) throw new Error("ไม่พบแถวข้อมูลที่ถูกต้องใน CSV");

    const { data: runId, error } = await supabase.rpc("rpc_ingest_state_data", {
      p_bucket: bucket,
      p_object_path: objectPath,
      p_file_sha256: sha256Hex,
      p_rows: rows,
    });
    if (error) throw error;
    return { runId, sha256: sha256Hex, rowCount: rows.length };
  }

  async function ingestCsvIntoDb({ file, bucket, objectPath }) {
    const csvText = await file.text();
    const sha256Hex = await sha256HexFromFile(file);
    return ingestCsvTextIntoDb({ csvText, bucket, objectPath, sha256Hex });
  }

  async function ingestFromStorage({ bucket, objectPath }) {
    const { data: blob, error } = await supabase.storage.from(bucket).download(objectPath);
    if (error) throw error;
    const csvText = await blob.text();
    const sha256Hex = await sha256HexFromBlob(blob);
    return ingestCsvTextIntoDb({ csvText, bucket, objectPath, sha256Hex });
  }

  function tryAutofillFromFilename(name) {
    const match = name.match(/_(\\d{4})_(\\d{2})\\.csv$/i);
    if (!match) return;
    const year = Number(match[1]);
    const month = Number(match[2]);
    if (!Number.isNaN(year)) uploadYear.value = String(year);
    if (!Number.isNaN(month)) uploadMonth.value = String(month);
    uploadFilename.value = name;
  }

  uploadFile.addEventListener("change", () => {
    const file = uploadFile.files?.[0] ?? null;
    if (!file) return;
    tryAutofillFromFilename(file.name);
  });

  btnUpload.addEventListener("click", async () => {
    try {
      uploadResult.classList.add("hidden");

      const session = (await supabase.auth.getSession()).data.session;
      if (!session?.user) {
        setUploadResult("กรุณาเข้าสู่ระบบก่อนอัปโหลด", "err");
        return;
      }

      const file = uploadFile.files?.[0] ?? null;
      if (!file) {
        setUploadResult("กรุณาเลือกไฟล์ CSV", "err");
        return;
      }

      const year = Number(uploadYear.value);
      const month = Number(uploadMonth.value);
      if (!year || year < 2500 || year > 3000) {
        setUploadResult("กรุณาใส่ปี พ.ศ. ให้ถูกต้อง", "err");
        return;
      }
      if (!month || month < 1 || month > 12) {
        setUploadResult("กรุณาใส่เดือนเป็นเลข 1-12", "err");
        return;
      }

      const filename = (uploadFilename.value || file.name).trim();
      if (!filename.toLowerCase().endsWith(".csv")) {
        setUploadResult("ชื่อไฟล์ต้องลงท้าย .csv", "err");
        return;
      }

      const objectPath = `raw/${year}/${pad2(month)}/${filename}`;
      setUploadResult(`กำลังอัปโหลดไปที่ ${objectPath} …`);

      const overwrite = !!uploadOverwrite?.checked;
      const { error } = await supabase.storage.from("state-data").upload(objectPath, file, {
        upsert: overwrite,
        contentType: "text/csv",
      });
      if (error) {
        const msg = formatErr(error);
        if (msg.toLowerCase().includes("already exists")) {
          setUploadResult(
            `อัปโหลดไม่สำเร็จ: ชื่อไฟล์ซ้ำ (ไฟล์มีอยู่แล้ว)\nทางเลือก:\n- เปลี่ยนชื่อไฟล์ปลายทาง\n- หรือเลือก “อนุญาตให้ทับไฟล์เดิม (overwrite)” แล้วอัปโหลดใหม่\n- หรือใช้ “Ingest from Storage” ถ้าไฟล์อยู่ใน Storage แล้ว`,
            "err",
          );
          return;
        }
        throw error;
      }

      setUploadResult(`อัปโหลดไฟล์สำเร็จ\nกำลังนำเข้าข้อมูลเข้า DB…`);

      let ingest;
      try {
        ingest = await ingestCsvIntoDb({ file, bucket: "state-data", objectPath });
      } catch (ingestError) {
        const msg = formatErr(ingestError);
        setUploadResult(`นำเข้าข้อมูลไม่สำเร็จ\npath: ${objectPath}\n${msg}`, "err");
        try {
          await supabase.from("upload_logs").insert({
            user_id: session.user.id,
            user_email: session.user.email,
            bucket: "state-data",
            object_path: objectPath,
            original_filename: file.name,
            byte_size: file.size,
            status: "failed",
            error_message: msg,
          });
          await refreshUploadLogs();
          await refreshIngestionRuns();
        } catch (_) {
          // ignore
        }
        return;
      }

      // Write upload log (DB) for history UI
      const { error: logError } = await supabase.from("upload_logs").insert({
        user_id: session.user.id,
        user_email: session.user.email,
        bucket: "state-data",
        object_path: objectPath,
        original_filename: file.name,
        byte_size: file.size,
        status: "uploaded",
      });
      if (logError) {
        setUploadResult(
          `นำเข้าข้อมูลสำเร็จ (run_id: ${ingest.runId}) แต่บันทึก Log ไม่สำเร็จ: ${logError.message}\npath: ${objectPath}`,
          "err",
        );
      }

      if (!logError) {
        setUploadResult(
          `สำเร็จ\nbucket: state-data\npath: ${objectPath}\nsha256: ${ingest.sha256}\nrows: ${ingest.rowCount}\ningestion run_id: ${ingest.runId}`,
          "ok",
        );
      }
      await refreshUploadLogs();
      await refreshIngestionRuns();
    } catch (e) {
      // best-effort log failure (if user is signed in and DB allows it)
      try {
        const session = (await supabase.auth.getSession()).data.session;
        const file = uploadFile.files?.[0] ?? null;
        if (session?.user && file) {
          await supabase.from("upload_logs").insert({
            user_id: session.user.id,
            user_email: session.user.email,
            bucket: "state-data",
            object_path: "",
            original_filename: file.name,
            byte_size: file.size,
            status: "failed",
            error_message: e.message ?? String(e),
          });
          await refreshUploadLogs();
        }
      } catch (_) {
        // ignore
      }
      setUploadResult(`อัปโหลดไม่สำเร็จ: ${formatErr(e)}`, "err");
    }
  });

  btnIngestFromStorage.addEventListener("click", async () => {
    try {
      uploadResult.classList.add("hidden");
      const session = (await supabase.auth.getSession()).data.session;
      if (!session?.user) {
        setUploadResult("กรุณาเข้าสู่ระบบก่อน ingest", "err");
        return;
      }
      const objectPath = (ingestObjectPath.value || "").trim();
      if (!objectPath || !objectPath.startsWith("raw/")) {
        setUploadResult("กรุณาใส่ object path ที่ขึ้นต้นด้วย raw/…", "err");
        return;
      }
      setUploadResult(`กำลังดาวน์โหลดจาก Storage: ${objectPath}\nกำลังนำเข้าข้อมูลเข้า DB…`);
      const ingest = await ingestFromStorage({ bucket: "state-data", objectPath });
      setUploadResult(
        `นำเข้าข้อมูลสำเร็จ\nbucket: state-data\npath: ${objectPath}\nsha256: ${ingest.sha256}\nrows: ${ingest.rowCount}\ningestion run_id: ${ingest.runId}`,
        "ok",
      );
      await refreshIngestionRuns();
    } catch (e) {
      setUploadResult(`Ingest ไม่สำเร็จ: ${e.message ?? String(e)}`, "err");
    }
  });

  btnRefreshUploadLogs.addEventListener("click", () => {
    refreshUploadLogs().catch(() => {});
  });

  btnRefreshIngestionRuns.addEventListener("click", () => {
    refreshIngestionRuns().catch(() => {});
  });
}
