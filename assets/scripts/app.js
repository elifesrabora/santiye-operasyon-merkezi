const STORAGE_KEYS = {
  settings: "som_settings",
  reports: "som_reports",
  puantaj: "som_puantaj",
  projects: "som_projects",
  users: "som_users",
  orders: "som_orders"
};

const DEFAULT_SETTINGS = {
  apiBaseUrl: "https://script.google.com/macros/s/AKfycbxsGhQNPJLG2UpWBDr6iUntH_XPT2iSUukKvf2gttwTpwq2o-tYzloTja8HGEwLLLU5Cg/exec",
  companyName: "Ayazlar Yapi",
  sheetNote: "Ana Google Sheet: https://docs.google.com/spreadsheets/d/17WZGVKxZ2cfSxEGkLPRQazHNFU4iYBAqMDYy99ZfErM/edit?usp=sharing"
};

const state = {
  currentView: "dashboard",
  apiHealth: "unknown",
  settings: loadJson(STORAGE_KEYS.settings, DEFAULT_SETTINGS),
  projects: loadJson(STORAGE_KEYS.projects, []),
  users: loadJson(STORAGE_KEYS.users, []),
  reports: loadJson(STORAGE_KEYS.reports, []),
  puantaj: loadJson(STORAGE_KEYS.puantaj, []),
  orders: loadJson(STORAGE_KEYS.orders, [])
};

const AUTO_SYNC_MS = 60000;

const viewMeta = {
  dashboard: ["Dashboard", "Saha, puantaj, siparis ve santiye ozetini tek ekranda izleyin."],
  report: ["Gunluk Saha Raporu", "Projeye ait gunluk ilerleme, plan ve ramak kala kaydini girin."],
  puantaj: ["Puantaj", "Admin tarafindan tanimlanan sef ve projelerle gunluk personel kaydi tutun."],
  orders: ["Siparisler", "Beton, demir ve diger siparislerin fiyat, kaynak ve giren kisi takibini yapin."],
  projects: ["Santiyeler", "Projeleri ve kullanicilari yonetin, proje bazli toplu ozetleri gorun."],
  records: ["Kayitlar", "Saha raporu, puantaj ve siparis gecmisini bir arada inceleyin."],
  settings: ["Ayarlar", "Github Pages ve Google Sheets baglantisini yonetin."]
};

const els = {
  navItems: [...document.querySelectorAll(".nav-item")],
  views: [...document.querySelectorAll(".view")],
  title: document.getElementById("page-title"),
  subtitle: document.getElementById("page-subtitle"),
  toast: document.getElementById("toast"),
  connectionPill: document.getElementById("connection-pill"),
  syncBtn: document.getElementById("sync-btn"),
  kpiGrid: document.getElementById("kpi-grid"),
  projectList: document.getElementById("project-list"),
  todayFeed: document.getElementById("today-feed"),
  reportForm: document.getElementById("report-form"),
  reportProject: document.getElementById("report-project"),
  reportDate: document.getElementById("report-date"),
  puantajChief: document.getElementById("puantaj-chief"),
  puantajDate: document.getElementById("puantaj-date"),
  workerList: document.getElementById("workers-list"),
  workerTemplate: document.getElementById("worker-template"),
  addWorkerBtn: document.getElementById("add-worker-btn"),
  savePuantajBtn: document.getElementById("save-puantaj-btn"),
  exportPuantajBtn: document.getElementById("export-puantaj-btn"),
  orderForm: document.getElementById("order-form"),
  orderProject: document.getElementById("order-project"),
  orderDate: document.getElementById("order-date"),
  orderMaterial: document.getElementById("order-material"),
  orderQty: document.getElementById("order-qty"),
  orderUnit: document.getElementById("order-unit"),
  orderUnitPrice: document.getElementById("order-unit-price"),
  orderTotal: document.getElementById("order-total"),
  orderBy: document.getElementById("order-by"),
  orderRecords: document.getElementById("order-records"),
  projectForm: document.getElementById("project-form"),
  userForm: document.getElementById("user-form"),
  userRecords: document.getElementById("user-records"),
  siteSummaryList: document.getElementById("site-summary-list"),
  recordTypeFilter: document.getElementById("record-type-filter"),
  recordProjectFilter: document.getElementById("record-project-filter"),
  recordSearch: document.getElementById("record-search"),
  reportRecords: document.getElementById("report-records"),
  puantajRecords: document.getElementById("puantaj-records"),
  recordsOrderList: document.getElementById("records-order-list"),
  exportRecordsBtn: document.getElementById("export-records-btn"),
  settingsForm: document.getElementById("settings-form"),
  settingsApiUrl: document.getElementById("settings-api-url"),
  settingsCompanyName: document.getElementById("settings-company-name"),
  settingsSheetNote: document.getElementById("settings-sheet-note")
};

boot();

function boot() {
  wireNavigation();
  hydrateForms();
  renderAll();
  setConnectionPill();
  addWorker();

  els.reportDate.value = todayStr();
  els.puantajDate.value = todayStr();
  els.orderDate.value = todayStr();
  syncOrderUnit();
  updateOrderTotal();

  els.reportForm.addEventListener("submit", onSaveReport);
  els.addWorkerBtn.addEventListener("click", () => addWorker());
  els.savePuantajBtn.addEventListener("click", onSavePuantaj);
  els.exportPuantajBtn.addEventListener("click", exportPuantajCsv);
  els.orderForm.addEventListener("submit", onSaveOrder);
  els.projectForm.addEventListener("submit", onSaveProject);
  els.userForm.addEventListener("submit", onSaveUser);
  els.exportRecordsBtn.addEventListener("click", exportAllJson);
  els.settingsForm.addEventListener("submit", onSaveSettings);
  els.syncBtn.addEventListener("click", () => syncFromApi());
  [els.recordTypeFilter, els.recordProjectFilter, els.recordSearch].forEach((el) => el.addEventListener("input", renderRecords));
  [els.orderMaterial, els.orderQty, els.orderUnitPrice].forEach((el) => el.addEventListener("input", () => {
    syncOrderUnit();
    updateOrderTotal();
  }));
  els.orderMaterial.addEventListener("change", syncOrderUnit);

  if (state.settings.apiBaseUrl) {
    syncFromApi({ silent: true });
    window.setInterval(() => syncFromApi({ silent: true }), AUTO_SYNC_MS);
  }
}

function wireNavigation() {
  els.navItems.forEach((item) => {
    item.addEventListener("click", () => setView(item.dataset.view));
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

function renderAll() {
  renderProjectOptions();
  renderUserOptions();
  renderDashboard();
  renderOrders();
  renderProjectManagement();
  renderRecords();
}

function renderProjectOptions() {
  const projectOptions = state.projects.length
    ? state.projects.map((project) => `<option value="${project.id}">${escapeHtml(project.name)}</option>`).join("")
    : '<option value="">Once proje ekleyin</option>';

  const filterOptions = ['<option value="all">Tum Projeler</option>']
    .concat(state.projects.map((project) => `<option value="${project.id}">${escapeHtml(project.name)}</option>`))
    .join("");

  [els.reportProject, els.orderProject].forEach((select) => {
    select.innerHTML = projectOptions;
    select.disabled = state.projects.length === 0;
  });

  els.recordProjectFilter.innerHTML = filterOptions;
}

function renderUserOptions() {
  const userOptions = state.users.length
    ? state.users.map((user) => `<option value="${user.id}">${escapeHtml(user.name)}${user.role ? ` · ${escapeHtml(user.role)}` : ""}</option>`).join("")
    : '<option value="">Once kullanici ekleyin</option>';

  [els.puantajChief, els.orderBy].forEach((select) => {
    select.innerHTML = userOptions;
    select.disabled = state.users.length === 0;
  });
}

function renderDashboard() {
  const totalProjects = state.projects.length;
  const totalReports = state.reports.length;
  const totalOrders = state.orders.length;
  const totalOrderCost = state.orders.reduce((sum, item) => sum + Number(item.total || 0), 0);

  els.kpiGrid.innerHTML = [
    kpiCard("Aktif Proje", totalProjects, `${countToday(state.reports)} bugun rapor girisi`),
    kpiCard("Siparis", totalOrders, `${formatCurrency(totalOrderCost)} toplam maliyet`),
    kpiCard("Puantaj", state.puantaj.length, `${totalPresentCount()} gelen personel kaydi`),
    kpiCard("Kullanici", state.users.length, "Admin tarafindan tanimli sef ve ekip")
  ].join("");

  els.projectList.innerHTML = state.projects.length
    ? buildProjectSummaries()
        .map(
          (summary) => `
            <article class="project-item">
              <div class="record-title">
                <strong>${escapeHtml(summary.name)}</strong>
                <span class="tag">${summary.reportCount} rapor</span>
              </div>
              <div class="project-meta">${escapeHtml(summary.location || "Konum girilmedi")} · ${summary.durationText}</div>
              <div class="project-meta">Siparis maliyeti: ${formatCurrency(summary.totalCost)} · Puantaj personeli: ${summary.workerCount}</div>
              <div class="progress"><span style="width:${summary.progress}%"></span></div>
            </article>
          `
        )
        .join("")
    : emptyState("Henuz proje eklenmedi. Once Santiyeler sekmesinden proje girin.");

  const feed = [
    ...state.reports.map((item) => ({ type: "Rapor", date: item.date, text: `${projectName(item.projectId)} icin saha raporu girildi.` })),
    ...state.puantaj.map((item) => ({ type: "Puantaj", date: item.date, text: `${userName(item.chiefId)} tarafindan ${item.workers.length} kisilik puantaj kaydi olusturuldu.` })),
    ...state.orders.map((item) => ({ type: "Siparis", date: item.date, text: `${projectName(item.projectId)} icin ${item.material} siparisi olusturuldu.` }))
  ]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 8);

  els.todayFeed.innerHTML = feed.length
    ? feed
        .map(
          (item) => `
            <article class="timeline-item">
              <div class="record-title">
                <strong>${item.type}</strong>
                <span class="tag">${item.date}</span>
              </div>
              <p>${escapeHtml(item.text)}</p>
            </article>
          `
        )
        .join("")
    : '<div class="timeline-item"><p>Henuz hareket yok. Once proje, kullanici ve kayit girisi yapin.</p></div>';
}

function renderOrders() {
  els.orderRecords.innerHTML = state.orders.length
    ? state.orders
        .slice()
        .sort((a, b) => b.date.localeCompare(a.date))
        .map(renderOrderCard)
        .join("")
    : emptyState("Henuz siparis girilmedi.");
}

function renderProjectManagement() {
  els.userRecords.innerHTML = state.users.length
    ? state.users
        .map(
          (user) => `
            <article class="record-card">
              <div class="record-title">
                <strong>${escapeHtml(user.name)}</strong>
                <span class="tag">${escapeHtml(user.role || "Rol yok")}</span>
              </div>
            </article>
          `
        )
        .join("")
    : emptyState("Henuz kullanici eklenmedi.");

  els.siteSummaryList.innerHTML = state.projects.length
    ? buildProjectSummaries()
        .map(
          (summary) => `
            <article class="project-item">
              <div class="record-title">
                <strong>${escapeHtml(summary.name)}</strong>
                <span class="tag">${summary.progress}%</span>
              </div>
              <div class="project-meta">${escapeHtml(summary.location || "Konum girilmedi")} · ${summary.durationText}</div>
              <div class="project-meta">Butce: ${formatCurrency(summary.budget)} · Siparis maliyeti: ${formatCurrency(summary.totalCost)}</div>
              <div class="project-meta">Rapor: ${summary.reportCount} · Puantaj: ${summary.puantajCount} · Personel: ${summary.workerCount}</div>
              <div class="progress"><span style="width:${summary.progress}%"></span></div>
            </article>
          `
        )
        .join("")
    : emptyState("Henuz santiye eklenmedi.");
}

function renderRecords() {
  const typeFilter = els.recordTypeFilter.value;
  const projectFilter = els.recordProjectFilter.value;
  const search = els.recordSearch.value.trim().toLocaleLowerCase("tr-TR");

  const filteredReports = state.reports.filter((item) => {
    if (typeFilter !== "all" && typeFilter !== "report") return false;
    if (projectFilter !== "all" && item.projectId !== projectFilter) return false;
    const target = `${projectName(item.projectId)} ${item.workSummary} ${item.nextPlan} ${item.notes}`.toLocaleLowerCase("tr-TR");
    return !search || target.includes(search);
  });

  const filteredPuantaj = state.puantaj.filter((item) => {
    if (typeFilter !== "all" && typeFilter !== "puantaj") return false;
    if (projectFilter !== "all" && !item.workers.some((worker) => worker.projectId === projectFilter)) return false;
    const target = `${userName(item.chiefId)} ${item.workers.map((worker) => worker.name).join(" ")}`.toLocaleLowerCase("tr-TR");
    return !search || target.includes(search);
  });

  const filteredOrders = state.orders.filter((item) => {
    if (typeFilter !== "all" && typeFilter !== "order") return false;
    if (projectFilter !== "all" && item.projectId !== projectFilter) return false;
    const target = `${projectName(item.projectId)} ${item.material} ${item.spec} ${item.supplier} ${item.priceSource}`.toLocaleLowerCase("tr-TR");
    return !search || target.includes(search);
  });

  els.reportRecords.innerHTML = filteredReports.length
    ? filteredReports.slice().sort((a, b) => b.date.localeCompare(a.date)).map(renderReportRecord).join("")
    : emptyState("Filtreye uygun saha raporu bulunamadi.");

  els.puantajRecords.innerHTML = filteredPuantaj.length
    ? filteredPuantaj.slice().sort((a, b) => b.date.localeCompare(a.date)).map(renderPuantajRecord).join("")
    : emptyState("Filtreye uygun puantaj bulunamadi.");

  els.recordsOrderList.innerHTML = filteredOrders.length
    ? filteredOrders.slice().sort((a, b) => b.date.localeCompare(a.date)).map(renderOrderCard).join("")
    : emptyState("Filtreye uygun siparis bulunamadi.");
}

function renderReportRecord(item) {
  return `
    <article class="record-card">
      <div class="record-title">
        <strong>${escapeHtml(projectName(item.projectId))}</strong>
        <span class="tag">${item.date}</span>
      </div>
      <div class="record-meta">Calisma saati: ${escapeHtml(item.workingHours || "-")}</div>
      <p>${escapeHtml(item.workSummary || "Bugun yapilan is bilgisi yok.")}</p>
      <div class="record-meta">Yarin plani: ${escapeHtml(item.nextPlan || "-")}</div>
      <div class="record-meta">Ramak kala: ${escapeHtml(item.incident || "-")}</div>
    </article>
  `;
}

function renderPuantajRecord(item) {
  const present = item.workers.filter((worker) => worker.status === "present").length;
  return `
    <article class="record-card">
      <div class="record-title">
        <strong>${escapeHtml(userName(item.chiefId))}</strong>
        <span class="tag">${item.date}</span>
      </div>
      <div class="record-meta">${item.workers.length} kisi · ${present} geldi · ${item.workers.length - present} gelmedi</div>
      <p>${item.workers.map((worker) => `${escapeHtml(worker.name)} / ${escapeHtml(projectName(worker.projectId))} / ${escapeHtml(worker.job || "-")}`).join(", ")}</p>
    </article>
  `;
}

function renderOrderCard(item) {
  return `
    <article class="record-card">
      <div class="record-title">
        <strong>${escapeHtml(projectName(item.projectId))}</strong>
        <span class="tag">${item.date}</span>
      </div>
      <div class="record-meta">${escapeHtml(item.material)} · ${escapeHtml(item.spec || "-")} · ${escapeHtml(item.quantity)} ${escapeHtml(item.unit || "")}</div>
      <div class="record-meta">Tedarikci: ${escapeHtml(item.supplier || "-")} · Giren: ${escapeHtml(userName(item.orderedById))}</div>
      <div class="record-meta">Birim fiyat: ${formatCurrency(item.unitPrice || 0)} · Toplam: ${formatCurrency(item.total || 0)}</div>
      <div class="record-meta">Kaynak: ${escapeHtml(item.priceSource || "-")} · Durum: ${escapeHtml(item.status || "-")}</div>
      ${item.note ? `<p>${escapeHtml(item.note)}</p>` : ""}
    </article>
  `;
}

async function onSaveReport(event) {
  event.preventDefault();
  if (!state.projects.length) {
    showToast("Once proje ekleyin.");
    setView("projects");
    return;
  }

  const form = new FormData(els.reportForm);
  const payload = {
    id: crypto.randomUUID(),
    projectId: form.get("projectId"),
    date: form.get("date"),
    workingHours: form.get("workingHours"),
    workSummary: form.get("workSummary"),
    nextPlan: form.get("nextPlan"),
    incident: form.get("incident"),
    notes: form.get("notes")
  };

  const remoteSaved = await sendToApi("saveReport", payload);
  state.reports.push(payload);
  persist(STORAGE_KEYS.reports, state.reports);
  renderAll();
  els.reportForm.reset();
  els.reportDate.value = todayStr();
  showToast(remoteSaved ? "Saha raporu kaydedildi." : "Saha raporu yerelde kaydedildi.");
}

function addWorker(worker = null) {
  const node = els.workerTemplate.content.firstElementChild.cloneNode(true);
  const deleteBtn = node.querySelector(".worker-delete");
  const projectSelect = node.querySelector(".worker-project");
  const jobInput = node.querySelector(".worker-job");
  const nameInput = node.querySelector(".worker-name");

  projectSelect.innerHTML = state.projects.length
    ? state.projects.map((project) => `<option value="${project.id}">${escapeHtml(project.name)}</option>`).join("")
    : '<option value="">Once proje ekleyin</option>';
  projectSelect.disabled = state.projects.length === 0;

  if (worker) {
    nameInput.value = worker.name;
    projectSelect.value = worker.projectId;
    jobInput.value = worker.job;
    setWorkerStatus(node, worker.status);
  } else {
    setWorkerStatus(node, "present");
  }

  deleteBtn.addEventListener("click", () => node.remove());
  node.querySelectorAll(".status-btn").forEach((button) => {
    button.addEventListener("click", () => setWorkerStatus(node, button.dataset.status));
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
  if (!state.users.length) {
    showToast("Once kullanici / sef ekleyin.");
    setView("projects");
    return;
  }

  const workers = readWorkers();
  if (!workers.length) {
    showToast("Kaydetmek icin en az bir personel girin.");
    return;
  }

  const payload = {
    id: crypto.randomUUID(),
    date: els.puantajDate.value || todayStr(),
    chiefId: els.puantajChief.value,
    workers
  };

  const remoteSaved = await sendToApi("savePuantaj", payload);
  state.puantaj.push(payload);
  persist(STORAGE_KEYS.puantaj, state.puantaj);
  renderAll();
  resetPuantajForm();
  showToast(remoteSaved ? "Puantaj kaydedildi." : "Puantaj yerelde kaydedildi.");
}

function resetPuantajForm() {
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
      userName(els.puantajChief.value),
      worker.name,
      worker.status,
      projectName(worker.projectId),
      worker.job
    ])
  ];
  downloadFile("puantaj.csv", toCsv(rows), "text/csv;charset=utf-8;");
  showToast("Puantaj CSV indirildi.");
}

async function onSaveOrder(event) {
  event.preventDefault();
  if (!state.projects.length) {
    showToast("Once proje ekleyin.");
    setView("projects");
    return;
  }
  if (!state.users.length) {
    showToast("Once kullanici ekleyin.");
    setView("projects");
    return;
  }

  const form = new FormData(els.orderForm);
  const quantity = Number(form.get("quantity") || 0);
  const unitPrice = Number(form.get("unitPrice") || 0);
  const payload = {
    id: crypto.randomUUID(),
    projectId: form.get("projectId"),
    date: form.get("date"),
    material: form.get("material"),
    spec: form.get("spec"),
    quantity,
    unit: form.get("unit"),
    supplier: form.get("supplier"),
    unitPrice,
    total: quantity * unitPrice,
    priceSource: form.get("priceSource"),
    orderedById: form.get("orderedBy"),
    status: form.get("status"),
    note: form.get("note")
  };

  const remoteSaved = await sendToApi("saveOrder", payload);
  state.orders.push(payload);
  persist(STORAGE_KEYS.orders, state.orders);
  renderAll();
  els.orderForm.reset();
  els.orderDate.value = todayStr();
  syncOrderUnit();
  updateOrderTotal();
  showToast(remoteSaved ? "Siparis kaydedildi." : "Siparis yerelde kaydedildi.");
}

async function onSaveProject(event) {
  event.preventDefault();
  const form = new FormData(els.projectForm);
  const name = String(form.get("name") || "").trim();
  if (!name) {
    showToast("Proje adi gerekli.");
    return;
  }

  const payload = {
    id: crypto.randomUUID(),
    name,
    location: String(form.get("location") || "").trim(),
    startDate: String(form.get("startDate") || ""),
    endDate: String(form.get("endDate") || ""),
    budget: Number(form.get("budget") || 0)
  };

  state.projects.push(payload);
  persist(STORAGE_KEYS.projects, state.projects);
  renderAll();
  els.projectForm.reset();
  showToast("Proje eklendi.");
}

async function onSaveUser(event) {
  event.preventDefault();
  const form = new FormData(els.userForm);
  const name = String(form.get("name") || "").trim();
  if (!name) {
    showToast("Kullanici adi gerekli.");
    return;
  }

  const payload = {
    id: crypto.randomUUID(),
    name,
    role: String(form.get("role") || "").trim()
  };

  state.users.push(payload);
  persist(STORAGE_KEYS.users, state.users);
  renderAll();
  els.userForm.reset();
  showToast("Kullanici eklendi.");
}

function exportAllJson() {
  const payload = {
    exportedAt: new Date().toISOString(),
    companyName: state.settings.companyName,
    projects: state.projects,
    users: state.users,
    reports: state.reports,
    puantaj: state.puantaj,
    orders: state.orders
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
  state.apiHealth = "unknown";
  persist(STORAGE_KEYS.settings, state.settings);
  setConnectionPill();
  showToast("Ayarlar kaydedildi.");
}

async function syncFromApi(options = {}) {
  const { silent = false } = options;
  if (!state.settings.apiBaseUrl) {
    if (!silent) showToast("Once Apps Script URL bilgisini ayarlara girin.");
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
    state.users = payload.users || state.users;
    state.reports = payload.reports || state.reports;
    state.puantaj = payload.puantaj || state.puantaj;
    state.orders = payload.orders || state.orders;
    persist(STORAGE_KEYS.projects, state.projects);
    persist(STORAGE_KEYS.users, state.users);
    persist(STORAGE_KEYS.reports, state.reports);
    persist(STORAGE_KEYS.puantaj, state.puantaj);
    persist(STORAGE_KEYS.orders, state.orders);
    state.apiHealth = "ok";
    setConnectionPill();
    renderAll();
    refreshWorkerProjectOptions();
    if (!silent) showToast("Google Sheets verileri yuklendi.");
  } catch (error) {
    console.error(error);
    state.apiHealth = "error";
    setConnectionPill();
    if (!silent) showToast("Veri cekilirken hata olustu.");
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
    state.apiHealth = "ok";
    setConnectionPill();
    return true;
  } catch (error) {
    console.error(error);
    state.apiHealth = "error";
    setConnectionPill();
    showToast("Sheets baglantisina yazilamadi, veri yerelde tutuldu.");
    return false;
  }
}

function refreshWorkerProjectOptions() {
  [...els.workerList.querySelectorAll(".worker-card")].forEach((card) => {
    const select = card.querySelector(".worker-project");
    const current = select.value;
    select.innerHTML = state.projects.length
      ? state.projects.map((project) => `<option value="${project.id}">${escapeHtml(project.name)}</option>`).join("")
      : '<option value="">Once proje ekleyin</option>';
    select.disabled = state.projects.length === 0;
    if (state.projects.some((project) => project.id === current)) select.value = current;
  });
}

function syncOrderUnit() {
  els.orderUnit.value = els.orderMaterial.value === "Demir" ? "ton" : "m³";
}

function updateOrderTotal() {
  const quantity = Number(els.orderQty.value || 0);
  const unitPrice = Number(els.orderUnitPrice.value || 0);
  els.orderTotal.value = quantity && unitPrice ? formatCurrency(quantity * unitPrice) : "";
}

function buildProjectSummaries() {
  return state.projects.map((project) => {
    const projectReports = state.reports.filter((item) => item.projectId === project.id);
    const projectOrders = state.orders.filter((item) => item.projectId === project.id);
    const projectPuantaj = state.puantaj.filter((entry) => entry.workers.some((worker) => worker.projectId === project.id));
    const totalCost = projectOrders.reduce((sum, item) => sum + Number(item.total || 0), 0);
    const workerCount = projectPuantaj.reduce((sum, entry) => sum + entry.workers.filter((worker) => worker.projectId === project.id && worker.status === "present").length, 0);
    const budget = Number(project.budget || 0);
    const progress = budget > 0 ? Math.min(100, Math.round((totalCost / budget) * 100)) : 0;

    return {
      ...project,
      totalCost,
      workerCount,
      reportCount: projectReports.length,
      puantajCount: projectPuantaj.length,
      progress,
      durationText: projectDurationText(project.startDate, project.endDate),
      budget
    };
  });
}

function projectDurationText(startDate, endDate) {
  if (!startDate && !endDate) return "Tarih araligi girilmedi";
  if (!startDate || !endDate) return `${startDate || "?"} - ${endDate || "?"}`;
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diff = Math.max(0, Math.round((end - start) / 86400000));
  return `${startDate} - ${endDate} · ${diff} gun`;
}

function totalPresentCount() {
  return state.puantaj.reduce(
    (sum, row) => sum + row.workers.filter((worker) => worker.status === "present").length,
    0
  );
}

function userName(userId) {
  return state.users.find((user) => user.id === userId)?.name || "Kullanici secilmedi";
}

function projectName(projectId) {
  return state.projects.find((project) => project.id === projectId)?.name || "Proje secilmedi";
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

function setConnectionPill() {
  if (!state.settings.apiBaseUrl) {
    els.connectionPill.textContent = "Yerel Kayit";
    return;
  }
  if (state.apiHealth === "ok") {
    els.connectionPill.textContent = "Sheets Canli";
    return;
  }
  if (state.apiHealth === "error") {
    els.connectionPill.textContent = "Sheets Hatasi";
    return;
  }
  els.connectionPill.textContent = "Sheets Bagli";
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

function formatCurrency(value) {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(Number(value || 0));
}

function emptyState(message) {
  return `<article class="record-card"><div class="record-meta">${escapeHtml(message)}</div></article>`;
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  clearTimeout(showToast.timerId);
  showToast.timerId = setTimeout(() => els.toast.classList.remove("show"), 2400);
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
    .map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(","))
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
