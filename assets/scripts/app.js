const STORAGE_KEYS = {
  settings: "som_settings",
  reports: "som_reports",
  puantaj: "som_puantaj",
  projects: "som_projects",
  users: "som_users",
  orders: "som_orders",
  session: "som_session"
};

const DEFAULT_SETTINGS = {
  apiBaseUrl: "https://script.google.com/macros/s/AKfycbxsGhQNPJLG2UpWBDr6iUntH_XPT2iSUukKvf2gttwTpwq2o-tYzloTja8HGEwLLLU5Cg/exec",
  companyName: "Ayazlar Yapı",
  sheetNote: "Ana Google Sheet: https://docs.google.com/spreadsheets/d/17WZGVKxZ2cfSxEGkLPRQazHNFU4iYBAqMDYy99ZfErM/edit?usp=sharing"
};

const state = {
  currentView: "dashboard",
  apiHealth: "unknown",
  currentUser: loadJson(STORAGE_KEYS.session, null),
  settings: loadJson(STORAGE_KEYS.settings, DEFAULT_SETTINGS),
  projects: loadJson(STORAGE_KEYS.projects, []),
  users: loadJson(STORAGE_KEYS.users, []),
  reports: loadJson(STORAGE_KEYS.reports, []),
  puantaj: loadJson(STORAGE_KEYS.puantaj, []),
  orders: loadJson(STORAGE_KEYS.orders, [])
};

const AUTO_SYNC_MS = 60000;

const viewMeta = {
  dashboard: ["Dashboard", "Saha, puantaj, sipariş ve şantiye özetini tek ekranda izleyin."],
  report: ["Günlük Saha Raporu", "Projeye ait günlük ilerleme, plan ve ramak kala kaydını girin."],
  puantaj: ["Puantaj", "Oturum açan kullanıcının adıyla günlük personel kaydı tutun."],
  orders: ["Siparişler", "Beton, demir ve diğer siparişlerin fiyat, kaynak ve giren kişi takibini yapın."],
  projects: ["Şantiyeler", "Projeleri ve kullanıcıları yönetin, proje bazlı toplu özetleri görün."],
  records: ["Kayıtlar", "Saha raporu, puantaj ve sipariş geçmişini bir arada inceleyin."],
  settings: ["Ayarlar", "GitHub Pages ve Google Sheets bağlantısını yönetin."]
};

const els = {
  loginScreen: document.getElementById("login-screen"),
  appShell: document.getElementById("app-shell"),
  loginForm: document.getElementById("login-form"),
  loginUsername: document.getElementById("login-username"),
  loginPassword: document.getElementById("login-password"),
  loginError: document.getElementById("login-error"),
  loginSubmit: document.getElementById("login-submit"),
  loginModeTitle: document.getElementById("login-mode-title"),
  loginCopy: document.getElementById("login-copy"),
  firstUserFields: document.getElementById("first-user-fields"),
  setupName: document.getElementById("setup-name"),
  sessionName: document.getElementById("session-name"),
  sessionRole: document.getElementById("session-role"),
  logoutBtn: document.getElementById("logout-btn"),
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
  puantajChiefLabel: document.getElementById("puantaj-chief-label"),
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
  orderByLabel: document.getElementById("order-by-label"),
  orderRecords: document.getElementById("order-records"),
  projectForm: document.getElementById("project-form"),
  userForm: document.getElementById("user-form"),
  userName: document.getElementById("user-name"),
  userUsername: document.getElementById("user-username"),
  userRole: document.getElementById("user-role"),
  userPassword: document.getElementById("user-password"),
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

async function boot() {
  wireNavigation();
  document.querySelectorAll("[data-view-jump]").forEach((button) => {
    button.addEventListener("click", () => setView(button.dataset.viewJump));
  });
  els.logoutBtn.addEventListener("click", doLogout);
  els.loginForm.addEventListener("submit", onLoginSubmit);
  hydrateForms();
  bindAppEvents();
  renderAuthMode();

  if (state.currentUser) {
    showApp();
  } else {
    showLogin();
  }

  if (state.settings.apiBaseUrl) {
    syncFromApi({ silent: true });
    window.setInterval(() => syncFromApi({ silent: true }), AUTO_SYNC_MS);
  } else {
    renderAll();
  }
}

function bindAppEvents() {
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
}

function wireNavigation() {
  els.navItems.forEach((item) => item.addEventListener("click", () => setView(item.dataset.view)));
}

function hydrateForms() {
  els.settingsApiUrl.value = state.settings.apiBaseUrl;
  els.settingsCompanyName.value = state.settings.companyName;
  els.settingsSheetNote.value = state.settings.sheetNote;
}

function renderAuthMode() {
  const hasUsers = state.users.length > 0;
  els.firstUserFields.classList.toggle("hidden", hasUsers);
  els.loginModeTitle.textContent = hasUsers ? "Giriş Yap" : "İlk Admin Kurulumu";
  els.loginCopy.textContent = hasUsers
    ? "Kullanıcı adınız ve şifreniz ile giriş yapın."
    : "Sistemi başlatmak için ilk admin hesabını oluşturun.";
  els.loginSubmit.textContent = hasUsers ? "Giriş Yap" : "İlk Admini Oluştur";
}

function showLogin() {
  els.loginScreen.classList.remove("hidden");
  els.appShell.classList.add("hidden");
  renderAuthMode();
}

function showApp() {
  els.loginScreen.classList.add("hidden");
  els.appShell.classList.remove("hidden");
  updateSessionUi();
  renderAll();
  setConnectionPill();
}

async function onLoginSubmit(event) {
  event.preventDefault();
  els.loginError.textContent = "";
  els.loginError.style.display = "none";

  if (state.users.length === 0) {
    await createFirstAdmin();
    return;
  }

  const username = els.loginUsername.value.trim();
  const password = els.loginPassword.value;
  const passwordHash = await sha256(password);
  const user = state.users.find((item) => item.username === username && item.passwordHash === passwordHash && item.active !== false);

  if (!user) {
    showLoginError("Kullanıcı adı veya şifre hatalı.");
    return;
  }

  state.currentUser = normalizeUser(user);
  persist(STORAGE_KEYS.session, state.currentUser);
  showApp();
  showToast("Giriş başarılı.");
}

async function createFirstAdmin() {
  const name = els.setupName.value.trim();
  const username = els.loginUsername.value.trim();
  const password = els.loginPassword.value;

  if (!name || !username || !password) {
    showLoginError("İlk admin için ad soyad, kullanıcı adı ve şifre gerekli.");
    return;
  }

  const payload = {
    id: crypto.randomUUID(),
    name,
    username,
    passwordHash: await sha256(password),
    role: "admin",
    active: true
  };

  state.users.push(payload);
  persist(STORAGE_KEYS.users, state.users);
  state.currentUser = normalizeUser(payload);
  persist(STORAGE_KEYS.session, state.currentUser);
  showApp();
  showToast("İlk admin oluşturuldu.");
}

function showLoginError(message) {
  els.loginError.textContent = message;
  els.loginError.style.display = "block";
}

function doLogout() {
  state.currentUser = null;
  localStorage.removeItem(STORAGE_KEYS.session);
  els.loginForm.reset();
  showLogin();
}

function updateSessionUi() {
  const user = state.currentUser;
  els.sessionName.textContent = user?.name || "—";
  els.sessionRole.textContent = roleLabel(user?.role || "");
  els.puantajChiefLabel.value = user?.name || "";
  els.orderByLabel.value = user?.name || "";
  const isAdmin = user?.role === "admin";
  els.userForm.closest(".panel").style.display = isAdmin ? "" : "none";
}

function normalizeUser(user) {
  return {
    id: user.id,
    name: user.name || user.ad || user.username,
    username: user.username || user.name,
    role: user.role || "kullanici",
    passwordHash: user.passwordHash,
    active: user.active !== false
  };
}

function setView(viewName) {
  state.currentView = viewName;
  els.navItems.forEach((item) => item.classList.toggle("active", item.dataset.view === viewName));
  els.views.forEach((view) => view.classList.toggle("active", view.id === `view-${viewName}`));
  const [title, subtitle] = viewMeta[viewName];
  els.title.textContent = title;
  els.subtitle.textContent = subtitle;
}

function renderAll() {
  renderProjectOptions();
  renderDashboard();
  renderOrders();
  renderProjectManagement();
  renderRecords();
  updateSessionUi();
}

function renderProjectOptions() {
  const projectOptions = state.projects.length
    ? state.projects.map((project) => `<option value="${project.id}">${escapeHtml(project.name)}</option>`).join("")
    : '<option value="">Önce proje ekleyin</option>';

  const filterOptions = ['<option value="all">Tüm Projeler</option>']
    .concat(state.projects.map((project) => `<option value="${project.id}">${escapeHtml(project.name)}</option>`))
    .join("");

  [els.reportProject, els.orderProject].forEach((select) => {
    select.innerHTML = projectOptions;
    select.disabled = state.projects.length === 0;
  });
  els.recordProjectFilter.innerHTML = filterOptions;
}

function renderDashboard() {
  const totalProjects = state.projects.length;
  const totalReports = state.reports.length;
  const totalOrders = state.orders.length;
  const totalOrderCost = state.orders.reduce((sum, item) => sum + Number(item.total || 0), 0);

  els.kpiGrid.innerHTML = [
    kpiCard("Aktif Proje", totalProjects, `${countToday(state.reports)} bugün rapor girişi`),
    kpiCard("Sipariş", totalOrders, `${formatCurrency(totalOrderCost)} toplam maliyet`),
    kpiCard("Puantaj", state.puantaj.length, `${totalPresentCount()} gelen personel kaydı`),
    kpiCard("Kullanıcı", state.users.length, "Tanımlı giriş hesabı")
  ].join("");

  els.projectList.innerHTML = state.projects.length
    ? buildProjectSummaries().map(renderProjectSummaryCard).join("")
    : emptyState("Henüz proje eklenmedi. Önce Şantiyeler sekmesinden proje girin.");

  const feed = [
    ...state.reports.map((item) => ({ type: "Rapor", date: item.date, text: `${projectName(item.projectId)} için saha raporu girildi.`, by: userName(item.createdById) })),
    ...state.puantaj.map((item) => ({ type: "Puantaj", date: item.date, text: `${userName(item.createdById)} tarafından ${item.workers.length} kişilik puantaj kaydı oluşturuldu.`, by: userName(item.createdById) })),
    ...state.orders.map((item) => ({ type: "Sipariş", date: item.date, text: `${projectName(item.projectId)} için ${item.material} siparişi oluşturuldu.`, by: userName(item.orderedById) }))
  ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);

  els.todayFeed.innerHTML = feed.length
    ? feed.map((item) => `
        <article class="timeline-item">
          <div class="record-title">
            <strong>${item.type}</strong>
            <span class="tag">${item.date}</span>
          </div>
          <p>${escapeHtml(item.text)}</p>
          <div class="record-meta">Girilen kullanıcı: ${escapeHtml(item.by || "-")}</div>
        </article>
      `).join("")
    : '<div class="timeline-item"><p>Henüz hareket yok. Önce proje, kullanıcı ve kayıt girişi yapın.</p></div>';
}

function renderProjectSummaryCard(summary) {
  return `
    <article class="project-item">
      <div class="record-title">
        <strong>${escapeHtml(summary.name)}</strong>
        <span class="tag">${summary.reportCount} rapor</span>
      </div>
      <div class="project-meta">${escapeHtml(summary.location || "Konum girilmedi")} · ${summary.durationText}</div>
      <div class="project-meta">Sipariş maliyeti: ${formatCurrency(summary.totalCost)} · Puantaj personeli: ${summary.workerCount}</div>
      <div class="progress"><span style="width:${summary.progress}%"></span></div>
    </article>
  `;
}

function renderOrders() {
  els.orderRecords.innerHTML = state.orders.length
    ? state.orders.slice().sort((a, b) => b.date.localeCompare(a.date)).map(renderOrderCard).join("")
    : emptyState("Henüz sipariş girilmedi.");
}

function renderProjectManagement() {
  els.userRecords.innerHTML = state.users.length
    ? state.users.map((user) => `
        <article class="record-card">
          <div class="record-title">
            <strong>${escapeHtml(user.name || user.ad || user.username)}</strong>
            <span class="tag">${escapeHtml(roleLabel(user.role || ""))}</span>
          </div>
          <div class="record-meta">@${escapeHtml(user.username || "-")}</div>
        </article>
      `).join("")
    : emptyState("Henüz kullanıcı eklenmedi.");

  els.siteSummaryList.innerHTML = state.projects.length
    ? buildProjectSummaries().map((summary) => `
        <article class="project-item">
          <div class="record-title">
            <strong>${escapeHtml(summary.name)}</strong>
            <span class="tag">${summary.progress}%</span>
          </div>
          <div class="project-meta">${escapeHtml(summary.location || "Konum girilmedi")} · ${summary.durationText}</div>
          <div class="project-meta">Bütçe: ${formatCurrency(summary.budget)} · Sipariş maliyeti: ${formatCurrency(summary.totalCost)}</div>
          <div class="project-meta">Rapor: ${summary.reportCount} · Puantaj: ${summary.puantajCount} · Personel: ${summary.workerCount}</div>
          <div class="progress"><span style="width:${summary.progress}%"></span></div>
        </article>
      `).join("")
    : emptyState("Henüz şantiye eklenmedi.");
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
    const target = `${userName(item.createdById)} ${item.workers.map((worker) => worker.name).join(" ")}`.toLocaleLowerCase("tr-TR");
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
    : emptyState("Filtreye uygun saha raporu bulunamadı.");
  els.puantajRecords.innerHTML = filteredPuantaj.length
    ? filteredPuantaj.slice().sort((a, b) => b.date.localeCompare(a.date)).map(renderPuantajRecord).join("")
    : emptyState("Filtreye uygun puantaj bulunamadı.");
  els.recordsOrderList.innerHTML = filteredOrders.length
    ? filteredOrders.slice().sort((a, b) => b.date.localeCompare(a.date)).map(renderOrderCard).join("")
    : emptyState("Filtreye uygun sipariş bulunamadı.");
}

function renderReportRecord(item) {
  return `
    <article class="record-card">
      <div class="record-title">
        <strong>${escapeHtml(projectName(item.projectId))}</strong>
        <span class="tag">${item.date}</span>
      </div>
      <div class="record-meta">Çalışma saati: ${escapeHtml(item.workingHours || "-")}</div>
      <p>${escapeHtml(item.workSummary || "Bugün yapılan iş bilgisi yok.")}</p>
      <div class="record-meta">Yarın planı: ${escapeHtml(item.nextPlan || "-")}</div>
      <div class="record-meta">Ramak kala: ${escapeHtml(item.incident || "-")}</div>
      <div class="record-meta">Kaydı giren: ${escapeHtml(userName(item.createdById))}</div>
    </article>
  `;
}

function renderPuantajRecord(item) {
  const present = item.workers.filter((worker) => worker.status === "present").length;
  return `
    <article class="record-card">
      <div class="record-title">
        <strong>${escapeHtml(userName(item.createdById))}</strong>
        <span class="tag">${item.date}</span>
      </div>
      <div class="record-meta">${item.workers.length} kişi · ${present} geldi · ${item.workers.length - present} gelmedi</div>
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
      <div class="record-meta">Tedarikçi: ${escapeHtml(item.supplier || "-")} · Giren: ${escapeHtml(userName(item.orderedById))}</div>
      <div class="record-meta">Birim fiyat: ${formatCurrency(item.unitPrice || 0)} · Toplam: ${formatCurrency(item.total || 0)}</div>
      <div class="record-meta">Kaynak: ${escapeHtml(item.priceSource || "-")} · Durum: ${escapeHtml(item.status || "-")}</div>
      ${item.note ? `<p>${escapeHtml(item.note)}</p>` : ""}
    </article>
  `;
}

async function onSaveReport(event) {
  event.preventDefault();
  if (!requireAuth() || !requireProjects()) return;
  const form = new FormData(els.reportForm);
  const payload = {
    id: crypto.randomUUID(),
    projectId: form.get("projectId"),
    date: form.get("date"),
    workingHours: form.get("workingHours"),
    workSummary: form.get("workSummary"),
    nextPlan: form.get("nextPlan"),
    incident: form.get("incident"),
    notes: form.get("notes"),
    createdById: state.currentUser.id
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
    : '<option value="">Önce proje ekleyin</option>';
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
  node.querySelectorAll(".status-btn").forEach((button) => button.addEventListener("click", () => setWorkerStatus(node, button.dataset.status)));
  els.workerList.appendChild(node);
}

function setWorkerStatus(node, status) {
  node.dataset.status = status;
  node.querySelectorAll(".status-btn").forEach((button) => button.classList.toggle("active", button.dataset.status === status));
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
  if (!requireAuth() || !requireProjects()) return;
  const workers = readWorkers();
  if (!workers.length) return showToast("Kaydetmek için en az bir personel girin.");
  const payload = {
    id: crypto.randomUUID(),
    date: els.puantajDate.value || todayStr(),
    chiefId: state.currentUser.id,
    createdById: state.currentUser.id,
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
  if (!workers.length) return showToast("CSV için önce personel ekleyin.");
  const rows = [
    ["tarih", "sef", "personel", "durum", "proje", "gorev"],
    ...workers.map((worker) => [els.puantajDate.value || todayStr(), state.currentUser?.name || "", worker.name, worker.status, projectName(worker.projectId), worker.job])
  ];
  downloadFile("puantaj.csv", toCsv(rows), "text/csv;charset=utf-8;");
  showToast("Puantaj CSV indirildi.");
}

async function onSaveOrder(event) {
  event.preventDefault();
  if (!requireAuth() || !requireProjects()) return;
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
    orderedById: state.currentUser.id,
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
  showToast(remoteSaved ? "Sipariş kaydedildi." : "Sipariş yerelde kaydedildi.");
}

async function onSaveProject(event) {
  event.preventDefault();
  if (!requireAdmin()) return;
  const form = new FormData(els.projectForm);
  const name = String(form.get("name") || "").trim();
  if (!name) return showToast("Proje adı gerekli.");
  const payload = {
    id: crypto.randomUUID(),
    name,
    location: String(form.get("location") || "").trim(),
    startDate: String(form.get("startDate") || ""),
    endDate: String(form.get("endDate") || ""),
    budget: Number(form.get("budget") || 0)
  };
  const remoteSaved = await sendToApi("saveProject", payload);
  state.projects.push(payload);
  persist(STORAGE_KEYS.projects, state.projects);
  renderAll();
  refreshWorkerProjectOptions();
  els.projectForm.reset();
  showToast(remoteSaved ? "Proje kaydedildi." : "Proje yerelde kaydedildi.");
}

async function onSaveUser(event) {
  event.preventDefault();
  if (!requireAdmin()) return;
  const name = els.userName.value.trim();
  const username = els.userUsername.value.trim();
  const password = els.userPassword.value;
  if (!name || !username || !password) return showToast("Ad soyad, kullanıcı adı ve şifre gerekli.");
  if (state.users.some((user) => user.username === username)) return showToast("Bu kullanıcı adı zaten kayıtlı.");
  const payload = {
    id: crypto.randomUUID(),
    name,
    username,
    passwordHash: await sha256(password),
    role: els.userRole.value,
    active: true
  };
  const remoteSaved = await sendToApi("saveUser", payload);
  state.users.push(payload);
  persist(STORAGE_KEYS.users, state.users);
  renderAll();
  els.userForm.reset();
  showToast(remoteSaved ? "Kullanıcı kaydedildi." : "Kullanıcı yerelde kaydedildi.");
}

function requireAuth() {
  if (state.currentUser) return true;
  showLogin();
  return false;
}

function requireAdmin() {
  if (state.currentUser?.role === "admin") return true;
  showToast("Bu işlem için admin yetkisi gerekiyor.");
  return false;
}

function requireProjects() {
  if (state.projects.length) return true;
  showToast("Önce proje ekleyin.");
  setView("projects");
  return false;
}

function exportAllJson() {
  const payload = {
    exportedAt: new Date().toISOString(),
    companyName: state.settings.companyName,
    projects: state.projects,
    users: state.users.map(({ passwordHash, ...rest }) => rest),
    reports: state.reports,
    puantaj: state.puantaj,
    orders: state.orders
  };
  downloadFile("santiye-operasyon-merkezi.json", JSON.stringify(payload, null, 2), "application/json");
  showToast("Tüm kayıtlar JSON olarak indirildi.");
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
    if (!silent) showToast("Önce Apps Script URL bilgisini ayarlara girin.");
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
    state.users = (payload.users || state.users).map(normalizeUser);
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
    renderAuthMode();
    if (state.currentUser) {
      const freshUser = state.users.find((user) => user.id === state.currentUser.id || user.username === state.currentUser.username);
      if (freshUser) {
        state.currentUser = normalizeUser(freshUser);
        persist(STORAGE_KEYS.session, state.currentUser);
      }
    }
    renderAll();
    refreshWorkerProjectOptions();
    if (!silent) showToast("Google Sheets verileri yüklendi.");
  } catch (error) {
    console.error(error);
    state.apiHealth = "error";
    setConnectionPill();
    if (!silent) showToast("Veri çekilirken hata oluştu.");
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
    showToast("Sheets bağlantısına yazılamadı, veri yerelde tutuldu.");
    return false;
  }
}

function refreshWorkerProjectOptions() {
  [...els.workerList.querySelectorAll(".worker-card")].forEach((card) => {
    const select = card.querySelector(".worker-project");
    const current = select.value;
    select.innerHTML = state.projects.length
      ? state.projects.map((project) => `<option value="${project.id}">${escapeHtml(project.name)}</option>`).join("")
      : '<option value="">Önce proje ekleyin</option>';
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
  if (!startDate && !endDate) return "Tarih aralığı girilmedi";
  if (!startDate || !endDate) return `${startDate || "?"} - ${endDate || "?"}`;
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diff = Math.max(0, Math.round((end - start) / 86400000));
  return `${startDate} - ${endDate} · ${diff} gün`;
}

function totalPresentCount() {
  return state.puantaj.reduce((sum, row) => sum + row.workers.filter((worker) => worker.status === "present").length, 0);
}

function userName(userId) {
  const user = state.users.find((item) => item.id === userId);
  return user?.name || user?.ad || user?.username || "Kullanıcı seçilmedi";
}

function projectName(projectId) {
  return state.projects.find((project) => project.id === projectId)?.name || "Proje seçilmedi";
}

function roleLabel(role) {
  const labels = { admin: "Admin", sef: "Şef", satinalma: "Satın Alma", kullanici: "Kullanıcı" };
  return labels[role] || role || "Kullanıcı";
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
  if (!state.settings.apiBaseUrl) return (els.connectionPill.textContent = "Yerel Kayıt");
  if (state.apiHealth === "ok") return (els.connectionPill.textContent = "Sheets Canlı");
  if (state.apiHealth === "error") return (els.connectionPill.textContent = "Sheets Hatası");
  els.connectionPill.textContent = "Sheets Bağlı";
}

async function sha256(text) {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function loadJson(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
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
  return rows.map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
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
