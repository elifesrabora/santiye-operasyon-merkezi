const STORAGE_KEYS = {
  settings: "som_settings",
  reports: "som_reports",
  puantaj: "som_puantaj",
  projects: "som_projects"
};

const DEFAULT_PROJECTS = [
  { id: "P-001", name: "Maslak Rezidans Blok A", location: "Istanbul / Sariyer", progress: 68, budget: 12500000 },
  { id: "P-002", name: "Bahcesehir Konutlari", location: "Istanbul / Basaksehir", progress: 42, budget: 8400000 },
  { id: "P-003", name: "Ankara AVM Genisleme", location: "Ankara / Cankaya", progress: 91, budget: 15200000 }
];

const DEFAULT_SETTINGS = {
  apiBaseUrl: "",
  companyName: "Ayazlar Yapi",
  sheetNote: "Ana Google Sheet: https://docs.google.com/spreadsheets/d/17WZGVKxZ2cfSxEGkLPRQazHNFU4iYBAqMDYy99ZfErM/edit?usp=sharing"
};

const state = {
  currentView: "dashboard",
  settings: loadJson(STORAGE_KEYS.settings, DEFAULT_SETTINGS),
  projects: loadJson(STORAGE_KEYS.projects, DEFAULT_PROJECTS),
  reports: loadJson(STORAGE_KEYS.reports, []),
  puantaj: loadJson(STORAGE_KEYS.puantaj, [])
};

const viewMeta = {
  dashboard: ["Dashboard", "Saha, puantaj ve proje verilerini tek ekranda yonetin."],
  report: ["Gunluk Saha Raporu", "Sahadan gelen gunluk ilerleme ve ISG verilerini kaydedin."],
  puantaj: ["Puantaj", "Gunluk personel girislerini tek merkezde toplayin."],
  records: ["Kayitlar", "Tum girisleri filtreleyin, inceleyin ve disa aktarın."],
  settings: ["Ayarlar", "Github Pages ve Google Sheets baglantisini yonetin."]
};

const els = {
  navItems: [...document.querySelectorAll(".nav-item")],
  views: [...document.querySelectorAll(".view")],
  title: document.getElementById("page-title"),
  subtitle: document.getElementById("page-subtitle"),
  toast: document.getElementById("toast"),
  connectionPill: document.getElementById("connection-pill"),
  projectList: document.getElementById("project-list"),
  todayFeed: document.getElementById("today-feed"),
  kpiGrid: document.getElementById("kpi-grid"),
  reportForm: document.getElementById("report-form"),
  reportProject: document.getElementById("report-project"),
  reportDate: document.getElementById("report-date"),
  puantajProject: document.getElementById("puantaj-project"),
  puantajDate: document.getElementById("puantaj-date"),
  puantajChief: document.getElementById("puantaj-chief"),
  workerList: document.getElementById("workers-list"),
  workerTemplate: document.getElementById("worker-template"),
  reportRecords: document.getElementById("report-records"),
  puantajRecords: document.getElementById("puantaj-records"),
  recordTypeFilter: document.getElementById("record-type-filter"),
  recordProjectFilter: document.getElementById("record-project-filter"),
  recordSearch: document.getElementById("record-search"),
  settingsForm: document.getElementById("settings-form"),
  settingsApiUrl: document.getElementById("settings-api-url"),
  settingsCompanyName: document.getElementById("settings-company-name"),
  settingsSheetNote: document.getElementById("settings-sheet-note"),
  syncBtn: document.getElementById("sync-btn"),
  seedDemoBtn: document.getElementById("seed-demo-btn"),
  addWorkerBtn: document.getElementById("add-worker-btn"),
  savePuantajBtn: document.getElementById("save-puantaj-btn"),
  exportPuantajBtn: document.getElementById("export-puantaj-btn"),
  exportRecordsBtn: document.getElementById("export-records-btn")
};

boot();

function boot() {
  wireNavigation();
  hydrateForms();
  renderProjectOptions();
  renderDashboard();
  renderRecords();
  setConnectionPill();
  addWorker();

  els.reportDate.value = todayStr();
  els.puantajDate.value = todayStr();

  els.reportForm.addEventListener("submit", onSaveReport);
  els.settingsForm.addEventListener("submit", onSaveSettings);
  els.addWorkerBtn.addEventListener("click", addWorker);
  els.savePuantajBtn.addEventListener("click", onSavePuantaj);
  els.exportPuantajBtn.addEventListener("click", exportPuantajCsv);
  els.exportRecordsBtn.addEventListener("click", exportAllJson);
  els.seedDemoBtn.addEventListener("click", seedDemoData);
  els.syncBtn.addEventListener("click", syncFromApi);
  [els.recordTypeFilter, els.recordProjectFilter, els.recordSearch].forEach((el) =>
    el.addEventListener("input", renderRecords)
  );
}

function wireNavigation() {
  els.navItems.forEach((item) => {
    item.addEventListener("click", () => {
      setView(item.dataset.view);
    });
  });
}

function setView(viewName) {
  state.currentView = viewName;
  els.navItems.forEach((item) => item.classList.toggle("active", item.dataset.view === viewName));
  els.views.forEach((view) => view.classList.toggle("active", view.id === `view-${viewName}`));
  const [title, subtitle] = viewMeta[viewName];
  els.title.textContent = title;
  els.subtitle.textContent = subtitle;
}

function hydrateForms() {
  els.settingsApiUrl.value = state.settings.apiBaseUrl;
  els.settingsCompanyName.value = state.settings.companyName;
  els.settingsSheetNote.value = state.settings.sheetNote;
}

function renderProjectOptions() {
  const options = state.projects
    .map((project) => `<option value="${project.id}">${project.name}</option>`)
    .join("");
  const filters = ['<option value="all">Tum Projeler</option>', options].join("");
  els.reportProject.innerHTML = options;
  els.puantajProject.innerHTML = options;
  els.recordProjectFilter.innerHTML = filters;
}

function renderDashboard() {
  const totalProjects = state.projects.length;
  const totalReports = state.reports.length;
  const totalPuantaj = state.puantaj.length;
  const totalWorkers = state.puantaj.reduce((sum, row) => sum + row.workers.length, 0);
  const avgProgress = totalProjects
    ? Math.round(state.projects.reduce((sum, item) => sum + item.progress, 0) / totalProjects)
    : 0;

  els.kpiGrid.innerHTML = [
    kpiCard("Aktif Proje", totalProjects, `${avgProgress}% ortalama ilerleme`),
    kpiCard("Saha Raporu", totalReports, `${countToday(state.reports)} bugun girildi`),
    kpiCard("Puantaj", totalPuantaj, `${countToday(state.puantaj)} bugun girildi`),
    kpiCard("Toplam Personel", totalWorkers, "Kayitli puantaj personel toplamı")
  ].join("");

  els.projectList.innerHTML = state.projects
    .map(
      (project) => `
        <article class="project-item">
          <div class="record-title">
            <strong>${project.name}</strong>
            <span class="tag">%${project.progress}</span>
          </div>
          <div class="project-meta">${project.location} · Butce: ${formatCurrency(project.budget)}</div>
          <div class="progress"><span style="width:${project.progress}%"></span></div>
        </article>
      `
    )
    .join("");

  const feed = [
    ...state.reports.map((item) => ({ type: "Rapor", date: item.date, text: `${projectName(item.projectId)} icin rapor girildi` })),
    ...state.puantaj.map((item) => ({ type: "Puantaj", date: item.date, text: `${item.chief || "Sef belirtilmedi"} tarafindan ${item.workers.length} kisilik puantaj kaydi` }))
  ]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 6);

  els.todayFeed.innerHTML = feed.length
    ? feed
        .map(
          (item) => `
            <article class="timeline-item">
              <div class="record-title">
                <strong>${item.type}</strong>
                <span class="tag">${item.date}</span>
              </div>
              <p>${item.text}</p>
            </article>
          `
        )
        .join("")
    : '<div class="timeline-item"><p>Henuz hareket yok. Ilk saha raporunu veya puantaji girerek baslayin.</p></div>';
}

function renderRecords() {
  const typeFilter = els.recordTypeFilter.value;
  const projectFilter = els.recordProjectFilter.value;
  const search = els.recordSearch.value.trim().toLocaleLowerCase("tr-TR");

  const filteredReports = state.reports.filter((item) => {
    if (typeFilter !== "all" && typeFilter !== "report") return false;
    if (projectFilter !== "all" && item.projectId !== projectFilter) return false;
    const target = `${projectName(item.projectId)} ${item.workSummary} ${item.notes}`.toLocaleLowerCase("tr-TR");
    return !search || target.includes(search);
  });

  const filteredPuantaj = state.puantaj.filter((item) => {
    if (typeFilter !== "all" && typeFilter !== "puantaj") return false;
    if (projectFilter !== "all" && !item.workers.some((worker) => worker.projectId === projectFilter)) return false;
    const target = `${item.chief} ${item.workers.map((worker) => worker.name).join(" ")}`.toLocaleLowerCase("tr-TR");
    return !search || target.includes(search);
  });

  els.reportRecords.innerHTML = filteredReports.length
    ? filteredReports
        .sort((a, b) => b.date.localeCompare(a.date))
        .map(renderReportRecord)
        .join("")
    : emptyState("Filtreye uygun saha raporu bulunamadi.");

  els.puantajRecords.innerHTML = filteredPuantaj.length
    ? filteredPuantaj
        .sort((a, b) => b.date.localeCompare(a.date))
        .map(renderPuantajRecord)
        .join("")
    : emptyState("Filtreye uygun puantaj bulunamadi.");
}

function renderReportRecord(item) {
  return `
    <article class="record-card">
      <div class="record-title">
        <strong>${projectName(item.projectId)}</strong>
        <span class="tag">${item.date}</span>
      </div>
      <div class="record-meta">${item.shift} · ${item.weather} · ${item.temperature || "-"} C</div>
      <p>${escapeHtml(item.workSummary || "Ozet girilmedi.")}</p>
      <div class="record-meta">Yarin plani: ${escapeHtml(item.nextPlan || "-")}</div>
    </article>
  `;
}

function renderPuantajRecord(item) {
  const present = item.workers.filter((worker) => worker.status === "present").length;
  return `
    <article class="record-card">
      <div class="record-title">
        <strong>${escapeHtml(item.chief || "Sef belirtilmedi")}</strong>
        <span class="tag">${item.date}</span>
      </div>
      <div class="record-meta">${item.workers.length} kisi · ${present} geldi · ${item.workers.length - present} gelmedi</div>
      <p>${item.workers.map((worker) => `${worker.name} (${worker.job || "-"})`).join(", ")}</p>
    </article>
  `;
}

async function onSaveReport(event) {
  event.preventDefault();
  const form = new FormData(els.reportForm);
  const payload = Object.fromEntries(form.entries());
  payload.id = crypto.randomUUID();

  const remoteSaved = await sendToApi("saveReport", payload);
  state.reports.push(payload);
  persist(STORAGE_KEYS.reports, state.reports);
  renderDashboard();
  renderRecords();
  els.reportForm.reset();
  els.reportDate.value = todayStr();
  renderProjectOptions();
  showToast(remoteSaved ? "Saha raporu Sheets ve yerel hafizada kaydedildi." : "Saha raporu yerel hafizada kaydedildi.");
}

function addWorker(worker = null) {
  const node = els.workerTemplate.content.firstElementChild.cloneNode(true);
  const nameInput = node.querySelector(".worker-name");
  const deleteBtn = node.querySelector(".worker-delete");
  const projectSelect = node.querySelector(".worker-project");
  const jobInput = node.querySelector(".worker-job");
  const statusButtons = [...node.querySelectorAll(".status-btn")];

  projectSelect.innerHTML = state.projects
    .map((project) => `<option value="${project.id}">${project.name}</option>`)
    .join("");

  if (worker) {
    nameInput.value = worker.name;
    projectSelect.value = worker.projectId;
    jobInput.value = worker.job;
    setWorkerStatus(node, worker.status);
  } else {
    projectSelect.value = els.puantajProject.value || state.projects[0]?.id || "";
  }

  deleteBtn.addEventListener("click", () => {
    node.remove();
  });

  statusButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setWorkerStatus(node, button.dataset.status);
    });
  });

  els.workerList.appendChild(node);
}

function setWorkerStatus(node, status) {
  node.dataset.status = status;
  node.querySelectorAll(".status-btn").forEach((button) => {
    button.classList.toggle("active", button.dataset.status === status);
  });
}

function readWorkers() {
  return [...els.workerList.querySelectorAll(".worker-card")]
    .map((node) => ({
      name: node.querySelector(".worker-name").value.trim(),
      projectId: node.querySelector(".worker-project").value,
      job: node.querySelector(".worker-job").value.trim(),
      status: node.dataset.status || "present"
    }))
    .filter((worker) => worker.name);
}

async function onSavePuantaj() {
  const workers = readWorkers();
  if (!workers.length) {
    showToast("Kaydetmek icin en az bir personel girin.");
    return;
  }

  const payload = {
    id: crypto.randomUUID(),
    date: els.puantajDate.value || todayStr(),
    chief: els.puantajChief.value.trim(),
    defaultProjectId: els.puantajProject.value,
    workers
  };

  const remoteSaved = await sendToApi("savePuantaj", payload);
  state.puantaj.push(payload);
  persist(STORAGE_KEYS.puantaj, state.puantaj);
  renderDashboard();
  renderRecords();
  resetPuantajForm();
  showToast(remoteSaved ? "Puantaj Sheets ve yerel hafizada kaydedildi." : "Puantaj yerel hafizada kaydedildi.");
}

function resetPuantajForm() {
  els.puantajChief.value = "";
  els.puantajDate.value = todayStr();
  els.workerList.innerHTML = "";
  addWorker();
}

function exportPuantajCsv() {
  const workers = readWorkers();
  if (!workers.length) {
    showToast("CSV icin once personel ekleyin.");
    return;
  }

  const rows = [
    ["tarih", "sef", "personel", "durum", "proje", "gorev"],
    ...workers.map((worker) => [
      els.puantajDate.value || todayStr(),
      els.puantajChief.value.trim(),
      worker.name,
      worker.status,
      projectName(worker.projectId),
      worker.job
    ])
  ];
  downloadFile("puantaj.csv", toCsv(rows), "text/csv;charset=utf-8;");
  showToast("Puantaj CSV indirildi.");
}

function exportAllJson() {
  const payload = {
    exportedAt: new Date().toISOString(),
    companyName: state.settings.companyName,
    projects: state.projects,
    reports: state.reports,
    puantaj: state.puantaj
  };
  downloadFile("santiye-operasyon-merkezi.json", JSON.stringify(payload, null, 2), "application/json");
  showToast("Tum kayitlar JSON olarak indirildi.");
}

function onSaveSettings(event) {
  event.preventDefault();
  state.settings = {
    apiBaseUrl: els.settingsApiUrl.value.trim(),
    companyName: els.settingsCompanyName.value.trim(),
    sheetNote: els.settingsSheetNote.value.trim()
  };
  persist(STORAGE_KEYS.settings, state.settings);
  setConnectionPill();
  showToast("Ayarlar kaydedildi.");
}

async function syncFromApi() {
  if (!state.settings.apiBaseUrl) {
    showToast("Once Apps Script URL bilgisini ayarlara girin.");
    setView("settings");
    return;
  }

  try {
    const url = new URL(state.settings.apiBaseUrl);
    url.searchParams.set("resource", "bootstrap");
    const response = await fetch(url.toString(), { method: "GET" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    state.projects = payload.projects || state.projects;
    state.reports = payload.reports || state.reports;
    state.puantaj = payload.puantaj || state.puantaj;
    persist(STORAGE_KEYS.projects, state.projects);
    persist(STORAGE_KEYS.reports, state.reports);
    persist(STORAGE_KEYS.puantaj, state.puantaj);
    renderProjectOptions();
    renderDashboard();
    renderRecords();
    showToast("Google Sheets verileri yuklendi.");
  } catch (error) {
    console.error(error);
    showToast("Veri cekilirken hata olustu.");
  }
}

async function sendToApi(action, payload) {
  if (!state.settings.apiBaseUrl) return false;

  try {
    const response = await fetch(state.settings.apiBaseUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action, payload })
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return true;
  } catch (error) {
    console.error(error);
    showToast("Sheets baglantisina yazilamadi, veri yerelde tutuldu.");
    return false;
  }
}

function seedDemoData() {
  state.reports = [
    {
      id: crypto.randomUUID(),
      projectId: "P-001",
      date: todayStr(),
      shift: "Gunduz",
      weather: "Acik / Gunesli",
      temperature: "18",
      workingHours: "08:00 - 18:00",
      workSummary: "Temel kalibi tamamlandi, demir baglama yuzde 75 seviyesine geldi.",
      nextPlan: "Temel beton oncesi son kontrol ve eksik tamamlama.",
      safetyPpe: "Evet",
      toolboxTalk: "Evet",
      incident: "Yok",
      notes: "Hazir beton sevki icin tedarikci teyidi bekleniyor."
    }
  ];
  state.puantaj = [
    {
      id: crypto.randomUUID(),
      date: todayStr(),
      chief: "Ahmet Usta",
      defaultProjectId: "P-001",
      workers: [
        { name: "Mehmet Kaya", projectId: "P-001", job: "Demirci", status: "present" },
        { name: "Ali Can", projectId: "P-001", job: "Kalipci", status: "present" },
        { name: "Serkan Demir", projectId: "P-002", job: "Sivaci", status: "absent" }
      ]
    }
  ];
  persist(STORAGE_KEYS.reports, state.reports);
  persist(STORAGE_KEYS.puantaj, state.puantaj);
  renderDashboard();
  renderRecords();
  showToast("Demo veri yuklendi.");
}

function setConnectionPill() {
  els.connectionPill.textContent = state.settings.apiBaseUrl ? "Sheets Hazir" : "Demo Modu";
}

function loadJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
}

function persist(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function countToday(items) {
  return items.filter((item) => item.date === todayStr()).length;
}

function projectName(projectId) {
  return state.projects.find((project) => project.id === projectId)?.name || projectId || "-";
}

function kpiCard(label, value, note) {
  return `
    <article class="kpi-card">
      <div class="kpi-label">${label}</div>
      <div class="kpi-value">${value}</div>
      <div class="kpi-note">${note}</div>
    </article>
  `;
}

function formatCurrency(value) {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(value);
}

function emptyState(message) {
  return `<article class="record-card"><div class="record-meta">${message}</div></article>`;
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  clearTimeout(showToast.timerId);
  showToast.timerId = setTimeout(() => {
    els.toast.classList.remove("show");
  }, 2400);
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function toCsv(rows) {
  return rows
    .map((row) =>
      row
        .map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`)
        .join(",")
    )
    .join("\n");
}

function downloadFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
}
