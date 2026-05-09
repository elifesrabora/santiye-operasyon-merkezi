const STORAGE_KEYS = {
  settings: "som_settings",
  reports: "som_reports",
  puantaj: "som_puantaj",
  projects: "som_projects",
  users: "som_users",
  orders: "som_orders",
  tasks: "som_tasks",
  documents: "som_documents",
  session: "som_session"
};

const DEFAULT_SETTINGS = {
  apiBaseUrl: "https://script.google.com/macros/s/AKfycbxsGhQNPJLG2UpWBDr6iUntH_XPT2iSUukKvf2gttwTpwq2o-tYzloTja8HGEwLLLU5Cg/exec",
  apiToken: "AYAZLAR_SANTIYE_2026",
  companyName: "Ayazlar Yapı",
  sheetNote: "Ana Google Sheet: https://docs.google.com/spreadsheets/d/17WZGVKxZ2cfSxEGkLPRQazHNFU4iYBAqMDYy99ZfErM/edit?usp=sharing",
  whatsappNumbers: ""
};

const FALLBACK_LOGIN_USERS = [{
  id: "elif-fallback-admin",
  name: "Elif Esra Bora",
  username: "elif",
  passwordHash: "44d0fad8d09b7456fdf663e8ec82524d86e78405c9891a7da8b275b45cf437ae",
  role: "admin",
  active: true
}];

const savedSettings = loadJson(STORAGE_KEYS.settings, {});

const state = {
  currentView: "dashboard",
  apiHealth: "unknown",
  selectedProjectId: null,
  calendarDate: new Date(),
  currentUser: loadJson(STORAGE_KEYS.session, null),
  settings: normalizeSettings(savedSettings),
  projects: loadJson(STORAGE_KEYS.projects, []),
  users: loadJson(STORAGE_KEYS.users, []),
  reports: loadJson(STORAGE_KEYS.reports, []),
  puantaj: loadJson(STORAGE_KEYS.puantaj, []),
  orders: loadJson(STORAGE_KEYS.orders, []),
  tasks: loadJson(STORAGE_KEYS.tasks, []),
  documents: loadJson(STORAGE_KEYS.documents, [])
};

const AUTO_SYNC_MS = 60000;
const DEFAULT_DOCUMENT_TYPES = ["Rapor", "Sözleşme", "Vekaletname", "İrsaliye"];
const PDF_FONT_FAMILY = "Roboto";
const PDF_FONT_FILES = {
  normal: {
    fileName: "Roboto-Regular.ttf",
    url: "https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/fonts/Roboto/Roboto-Regular.ttf"
  },
  bold: {
    fileName: "Roboto-Medium.ttf",
    url: "https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/fonts/Roboto/Roboto-Medium.ttf"
  }
};
let pdfFontPromise = null;
let pdfFontFamily = "helvetica";

const viewMeta = {
  dashboard: ["Dashboard", "Saha, puantaj, sipariş ve şantiye özetini tek ekranda izleyin."],
  report: ["Günlük Saha Raporu", "Projeye ait günlük ilerleme, plan ve ramak kala kaydını girin."],
  puantaj: ["Puantaj", "Oturum açan kullanıcının adıyla günlük personel kaydı tutun."],
  orders: ["Siparişler", "Beton, demir ve diğer siparişlerin fiyat, kaynak ve giren kişi takibini yapın."],
  projects: ["Şantiyeler", "Projeleri ve kullanıcıları yönetin, proje bazlı toplu özetleri görün."],
  calendar: ["Takvim", "Takip edilecek işleri tarihe, projeye ve bilgi girişine göre izleyin."],
  documents: ["Evraklar", "Şantiyelere ait evrak linklerini ve notlarını tek merkezde tutun."],
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
  reportId: document.getElementById("report-id"),
  reportProject: document.getElementById("report-project"),
  reportDate: document.getElementById("report-date"),
  reportPdfBtn: document.getElementById("report-pdf-btn"),
  reportPdfFile: document.getElementById("report-pdf-file"),
  reportPdfUrl: document.getElementById("report-pdf-url"),
  reportCurrentPdf: document.getElementById("report-current-pdf"),
  reportSubmitBtn: document.getElementById("report-submit-btn"),
  reportCancelEditBtn: document.getElementById("report-cancel-edit-btn"),
  puantajChiefLabel: document.getElementById("puantaj-chief-label"),
  puantajId: document.getElementById("puantaj-id"),
  puantajDate: document.getElementById("puantaj-date"),
  workerList: document.getElementById("workers-list"),
  workerTemplate: document.getElementById("worker-template"),
  addWorkerBtn: document.getElementById("add-worker-btn"),
  savePuantajBtn: document.getElementById("save-puantaj-btn"),
  puantajCancelEditBtn: document.getElementById("puantaj-cancel-edit-btn"),
  exportPuantajBtn: document.getElementById("export-puantaj-btn"),
  puantajPdfBtn: document.getElementById("puantaj-pdf-btn"),
  orderForm: document.getElementById("order-form"),
  orderId: document.getElementById("order-id"),
  orderProject: document.getElementById("order-project"),
  orderDate: document.getElementById("order-date"),
  orderMaterial: document.getElementById("order-material"),
  orderQty: document.getElementById("order-qty"),
  orderUnit: document.getElementById("order-unit"),
  orderUnitPrice: document.getElementById("order-unit-price"),
  orderTotal: document.getElementById("order-total"),
  orderByLabel: document.getElementById("order-by-label"),
  orderRecords: document.getElementById("order-records"),
  ordersPdfBtn: document.getElementById("orders-pdf-btn"),
  orderSubmitBtn: document.getElementById("order-submit-btn"),
  orderCancelEditBtn: document.getElementById("order-cancel-edit-btn"),
  projectForm: document.getElementById("project-form"),
  userForm: document.getElementById("user-form"),
  userName: document.getElementById("user-name"),
  userUsername: document.getElementById("user-username"),
  userRole: document.getElementById("user-role"),
  userPassword: document.getElementById("user-password"),
  userRecords: document.getElementById("user-records"),
  siteSummaryList: document.getElementById("site-summary-list"),
  projectDetailTitle: document.getElementById("project-detail-title"),
  projectFilterFrom: document.getElementById("project-filter-from"),
  projectFilterTo: document.getElementById("project-filter-to"),
  projectFilterBtn: document.getElementById("project-filter-btn"),
  projectDetailPdfBtn: document.getElementById("project-detail-pdf-btn"),
  projectDetailKpis: document.getElementById("project-detail-kpis"),
  projectDetailBrief: document.getElementById("project-detail-brief"),
  projectProgressStrip: document.getElementById("project-progress-strip"),
  projectCostChart: document.getElementById("project-cost-chart"),
  projectActivityChart: document.getElementById("project-activity-chart"),
  projectDetailReports: document.getElementById("project-detail-reports"),
  projectDetailOrders: document.getElementById("project-detail-orders"),
  projectDetailPuantaj: document.getElementById("project-detail-puantaj"),
  projectDetailDocuments: document.getElementById("project-detail-documents"),
  projectDetailTasks: document.getElementById("project-detail-tasks"),
  taskForm: document.getElementById("task-form"),
  taskProject: document.getElementById("task-project"),
  taskAssignee: document.getElementById("task-assignee"),
  taskAuthorLabel: document.getElementById("task-author-label"),
  taskRecords: document.getElementById("task-records"),
  calendarTitle: document.getElementById("calendar-title"),
  calendarGrid: document.getElementById("calendar-grid"),
  calendarPrevBtn: document.getElementById("calendar-prev-btn"),
  calendarTodayBtn: document.getElementById("calendar-today-btn"),
  calendarNextBtn: document.getElementById("calendar-next-btn"),
  whatsappLinks: document.getElementById("whatsapp-links"),
  notificationBtn: document.getElementById("notification-btn"),
  documentForm: document.getElementById("document-form"),
  documentId: document.getElementById("document-id"),
  documentProject: document.getElementById("document-project"),
  documentTitle: document.getElementById("document-title"),
  documentType: document.getElementById("document-type"),
  documentUrl: document.getElementById("document-url"),
  documentNote: document.getElementById("document-note"),
  documentSubmitBtn: document.getElementById("document-submit-btn"),
  documentCancelEditBtn: document.getElementById("document-cancel-edit-btn"),
  documentProjectFilter: document.getElementById("document-project-filter"),
  documentTypeFilter: document.getElementById("document-type-filter"),
  documentRecords: document.getElementById("document-records"),
  recordTypeFilter: document.getElementById("record-type-filter"),
  recordProjectFilter: document.getElementById("record-project-filter"),
  recordSearch: document.getElementById("record-search"),
  reportPageRecords: document.getElementById("report-page-records"),
  reportRecords: document.getElementById("report-records"),
  puantajRecords: document.getElementById("puantaj-records"),
  recordsOrderList: document.getElementById("records-order-list"),
  exportRecordsBtn: document.getElementById("export-records-btn"),
  settingsForm: document.getElementById("settings-form"),
  settingsApiUrl: document.getElementById("settings-api-url"),
  settingsApiToken: document.getElementById("settings-api-token"),
  settingsCompanyName: document.getElementById("settings-company-name"),
  settingsSheetNote: document.getElementById("settings-sheet-note"),
  settingsWhatsappNumbers: document.getElementById("settings-whatsapp-numbers")
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
  els.reportForm.addEventListener("reset", () => window.setTimeout(clearReportEditState, 0));
  els.reportCancelEditBtn.addEventListener("click", resetReportForm);
  els.addWorkerBtn.addEventListener("click", () => addWorker());
  els.savePuantajBtn.addEventListener("click", onSavePuantaj);
  els.puantajCancelEditBtn.addEventListener("click", resetPuantajForm);
  els.exportPuantajBtn.addEventListener("click", exportPuantajCsv);
  els.reportPdfBtn.addEventListener("click", exportLatestReportPdf);
  els.puantajPdfBtn.addEventListener("click", exportLatestPuantajPdf);
  els.ordersPdfBtn.addEventListener("click", exportLatestOrderPdf);
  els.orderForm.addEventListener("submit", onSaveOrder);
  els.orderForm.addEventListener("reset", () => window.setTimeout(clearOrderEditState, 0));
  els.orderCancelEditBtn.addEventListener("click", resetOrderForm);
  els.projectForm.addEventListener("submit", onSaveProject);
  els.userForm.addEventListener("submit", onSaveUser);
  els.taskForm.addEventListener("submit", onSaveTask);
  els.calendarPrevBtn.addEventListener("click", () => changeCalendarMonth(-1));
  els.calendarTodayBtn.addEventListener("click", () => {
    state.calendarDate = new Date();
    renderCalendar();
  });
  els.calendarNextBtn.addEventListener("click", () => changeCalendarMonth(1));
  els.documentForm.addEventListener("submit", onSaveDocument);
  els.documentForm.addEventListener("reset", () => window.setTimeout(clearDocumentEditState, 0));
  els.documentCancelEditBtn.addEventListener("click", resetDocumentForm);
  [els.documentProjectFilter, els.documentTypeFilter].forEach((el) => el.addEventListener("input", renderDocuments));
  els.notificationBtn.addEventListener("click", requestNotifications);
  els.projectFilterBtn.addEventListener("click", renderProjectDetail);
  els.projectDetailPdfBtn.addEventListener("click", exportProjectDetailPdf);
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
  els.settingsApiToken.value = state.settings.apiToken || "";
  els.settingsCompanyName.value = state.settings.companyName;
  els.settingsSheetNote.value = state.settings.sheetNote;
  els.settingsWhatsappNumbers.value = state.settings.whatsappNumbers || "";
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
  const user = await findMatchingUser(username, password) || await loginWithApi(username, password);

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
  els.taskAuthorLabel.value = user?.name || "";
  const isAdmin = user?.role === "admin";
  els.userForm.closest(".panel").style.display = isAdmin ? "" : "none";
}

function normalizeUser(user) {
  const username = user.username || user.name;
  return {
    id: user.id,
    name: user.name || user.ad || user.username,
    username,
    role: String(username || "").trim().toLowerCase() === "elif" ? "admin" : (user.role || "kullanici"),
    passwordHash: String(user.passwordHash ?? ""),
    active: user.active !== false
  };
}

function mergeUsersKeepingLocalSecrets(localUsers, remoteUsers) {
  const localById = new Map((localUsers || []).map((user) => [user.id, user]));
  const localByUsername = new Map((localUsers || []).map((user) => [String(user.username || "").toLowerCase(), user]));
  return remoteUsers.map((remoteUser) => {
    const normalized = normalizeUser(remoteUser);
    const localMatch = localById.get(normalized.id) || localByUsername.get(String(normalized.username || "").toLowerCase());
    if (!normalized.passwordHash && localMatch?.passwordHash) {
      normalized.passwordHash = localMatch.passwordHash;
    }
    return normalized;
  });
}

async function findMatchingUser(username, password) {
  const loginName = String(username || "").trim().toLowerCase();
  const hashed = await sha256(password);
  return [...state.users, ...FALLBACK_LOGIN_USERS].find((item) => {
    if (String(item.username || "").trim().toLowerCase() !== loginName || item.active === false) return false;
    const stored = String(item.passwordHash ?? "");
    if (!stored) return false;
    return stored === hashed || stored === password;
  }) || null;
}

async function loginWithApi(username, password) {
  if (!state.settings.apiBaseUrl || !state.settings.apiToken) return null;
  try {
    const response = await fetch(state.settings.apiBaseUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "login",
        token: state.settings.apiToken,
        payload: {
          username: String(username || "").trim(),
          password,
          passwordHash: await sha256(password)
        }
      })
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const result = await response.json();
    if (!result.ok || !result.user) return null;
    state.apiHealth = "ok";
    setConnectionPill();
    return normalizeUser(result.user);
  } catch (error) {
    console.error(error);
    state.apiHealth = "error";
    setConnectionPill();
    return null;
  }
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
  renderReportPageRecords();
  renderProjectManagement();
  renderCalendar();
  renderDocuments();
  renderRecords();
  renderProjectDetail();
  updateSessionUi();
}

function renderProjectOptions() {
  const projectOptions = state.projects.length
    ? state.projects.map((project) => `<option value="${project.id}">${escapeHtml(project.name)}</option>`).join("")
    : '<option value="">Önce proje ekleyin</option>';

  const filterOptions = ['<option value="all">Tüm Projeler</option>']
    .concat(state.projects.map((project) => `<option value="${project.id}">${escapeHtml(project.name)}</option>`))
    .join("");

  [els.reportProject, els.orderProject, els.taskProject, els.documentProject].forEach((select) => {
    select.innerHTML = projectOptions;
    select.disabled = state.projects.length === 0;
  });
  els.recordProjectFilter.innerHTML = filterOptions;
  els.documentProjectFilter.innerHTML = filterOptions;
  renderDocumentTypeOptions();

  els.taskAssignee.innerHTML = state.users.length
    ? state.users.map((user) => `<option value="${user.id}">${escapeHtml(user.name || user.username)}</option>`).join("")
    : '<option value="">Önce kullanıcı ekleyin</option>';
  els.taskAssignee.disabled = state.users.length === 0;
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
    <article class="project-item" data-project-open="${summary.id}">
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
        <article class="project-item" data-project-open="${summary.id}">
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

  document.querySelectorAll("[data-project-open]").forEach((el) => {
    el.addEventListener("click", () => {
      state.selectedProjectId = el.dataset.projectOpen;
      setView("projects");
      renderProjectDetail();
    });
  });
}

function renderReportPageRecords() {
  if (!els.reportPageRecords) return;
  els.reportPageRecords.innerHTML = state.reports.length
    ? state.reports.slice().sort((a, b) => (b.date || "").localeCompare(a.date || "")).map(renderReportRecord).join("")
    : emptyState("Henüz saha raporu kaydedilmedi.");
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
    <article class="record-card" onclick="window.__somActions.editReport('${item.id}')">
      <div class="record-title">
        <strong>${escapeHtml(projectName(item.projectId))}</strong>
        <span class="tag">${item.date}</span>
      </div>
      <div class="record-meta">Çalışma saati: ${escapeHtml(item.workingHours || "-")}</div>
      <p>${escapeHtml(item.workSummary || "Bugün yapılan iş bilgisi yok.")}</p>
      <div class="record-meta">Yarın planı: ${escapeHtml(item.nextPlan || "-")}</div>
      <div class="record-meta">Ramak kala: ${escapeHtml(item.incident || "-")}</div>
      <div class="record-meta">Kaydı giren: ${escapeHtml(userName(item.createdById))}</div>
      ${item.attachmentUrl ? `<div class="record-meta">Ek PDF: <a href="${escapeHtml(item.attachmentUrl)}" target="_blank" rel="noreferrer" onclick="event.stopPropagation();">${escapeHtml(item.attachmentName || "PDF dosyası")}</a></div>` : ""}
      <div class="record-footer">
        <button class="btn btn-secondary" type="button" onclick="event.stopPropagation(); window.__somActions.editReport('${item.id}')">Düzenle</button>
        ${item.attachmentUrl ? `<a class="btn btn-secondary" href="${escapeHtml(item.attachmentUrl)}" target="_blank" rel="noreferrer" onclick="event.stopPropagation();">Yüklü PDF</a>` : ""}
        <button class="btn btn-secondary" type="button" onclick="event.stopPropagation(); window.__somPdf.exportReport('${item.id}')">PDF Al</button>
      </div>
    </article>
  `;
}

function renderPuantajRecord(item) {
  const present = item.workers.filter((worker) => worker.status === "present").length;
  return `
    <article class="record-card" onclick="window.__somActions.editPuantaj('${item.id}')">
      <div class="record-title">
        <strong>${escapeHtml(userName(item.createdById))}</strong>
        <span class="tag">${item.date}</span>
      </div>
      <div class="record-meta">${item.workers.length} kişi · ${present} geldi · ${item.workers.length - present} gelmedi</div>
      <p>${item.workers.map((worker) => `${escapeHtml(worker.name)} / ${escapeHtml(projectName(worker.projectId))} / ${escapeHtml(worker.job || "-")}`).join(", ")}</p>
      <div class="record-footer">
        <button class="btn btn-secondary" type="button" onclick="event.stopPropagation(); window.__somActions.editPuantaj('${item.id}')">Düzenle</button>
        <button class="btn btn-secondary" type="button" onclick="event.stopPropagation(); window.__somPdf.exportPuantaj('${item.id}')">PDF Al</button>
      </div>
    </article>
  `;
}

function renderOrderCard(item) {
  return `
    <article class="record-card" onclick="window.__somActions.editOrder('${item.id}')">
      <div class="record-title">
        <strong>${escapeHtml(projectName(item.projectId))}</strong>
        <span class="tag">${item.date}</span>
      </div>
      <div class="record-meta">${escapeHtml(item.material)} · ${escapeHtml(item.spec || "-")} · ${escapeHtml(item.quantity)} ${escapeHtml(item.unit || "")}</div>
      <div class="record-meta">Tedarikçi: ${escapeHtml(item.supplier || "-")} · Giren: ${escapeHtml(userName(item.orderedById))}</div>
      <div class="record-meta">Birim fiyat: ${formatCurrency(item.unitPrice || 0)} · Toplam: ${formatCurrency(item.total || 0)}</div>
      <div class="record-meta">Kaynak: ${escapeHtml(item.priceSource || "-")} · Durum: ${escapeHtml(item.status || "-")}</div>
      ${item.note ? `<p>${escapeHtml(item.note)}</p>` : ""}
      <div class="record-footer">
        <button class="btn btn-secondary" type="button" onclick="event.stopPropagation(); window.__somActions.editOrder('${item.id}')">Düzenle</button>
        <button class="btn btn-secondary" type="button" onclick="event.stopPropagation(); window.__somPdf.exportOrder('${item.id}')">PDF Al</button>
      </div>
    </article>
  `;
}

async function onSaveReport(event) {
  event.preventDefault();
  if (!requireAuth() || !requireProjects()) return;
  const form = new FormData(els.reportForm);
  const existingId = String(form.get("id") || "");
  const existingReport = state.reports.find((item) => item.id === existingId);
  let attachment;
  try {
    attachment = await buildReportAttachment(existingReport);
  } catch (error) {
    showToast(error.message);
    return;
  }
  const payload = {
    id: existingId || crypto.randomUUID(),
    projectId: form.get("projectId") || els.reportProject.value || state.selectedProjectId || state.projects[0]?.id || "",
    date: form.get("date"),
    workingHours: form.get("workingHours"),
    workSummary: form.get("workSummary"),
    nextPlan: form.get("nextPlan"),
    incident: form.get("incident"),
    notes: form.get("notes"),
    attachmentName: attachment.name,
    attachmentUrl: attachment.url,
    attachmentSource: attachment.source,
    attachmentUploadedAt: attachment.uploadedAt,
    attachmentFile: attachment.file,
    createdById: existingId ? (existingReport?.createdById || state.currentUser.id) : state.currentUser.id,
    createdAt: existingId ? (existingReport?.createdAt || new Date().toISOString()) : new Date().toISOString(),
    updatedAt: existingId ? new Date().toISOString() : ""
  };
  const apiResult = await sendToApi(existingId ? "updateReport" : "saveReport", payload);
  const remoteSaved = Boolean(apiResult);
  if (apiResult?.report) {
    Object.assign(payload, {
      attachmentName: apiResult.report.attachmentName || payload.attachmentName,
      attachmentUrl: apiResult.report.attachmentUrl || payload.attachmentUrl,
      attachmentSource: apiResult.report.attachmentSource || payload.attachmentSource,
      attachmentUploadedAt: apiResult.report.attachmentUploadedAt || payload.attachmentUploadedAt
    });
  }
  if (attachment.file && !payload.attachmentUrl) {
    showToast("PDF Drive'a yüklenemedi. Apps Script'i güncel deploy edin.");
    return;
  }
  delete payload.attachmentFile;
  if (existingId) state.reports = state.reports.map((item) => item.id === existingId ? payload : item);
  else state.reports.push(payload);
  persist(STORAGE_KEYS.reports, state.reports);
  renderAll();
  resetReportForm();
  showToast(remoteSaved ? "Saha raporu kaydedildi." : "Saha raporu yerelde kaydedildi.");
}

async function buildReportAttachment(existingReport = null) {
  const file = els.reportPdfFile.files?.[0] || null;
  const url = els.reportPdfUrl.value.trim();
  if (file && file.type !== "application/pdf") throw new Error("Sadece PDF dosyası yükleyebilirsiniz.");
  if (file && (!state.settings.apiBaseUrl || !state.settings.apiToken)) throw new Error("Bilgisayardan PDF yüklemek için Apps Script bağlantısı gerekli.");
  if (file) {
    return {
      name: file.name,
      url: existingReport?.attachmentUrl || "",
      source: "upload",
      uploadedAt: new Date().toISOString(),
      file: {
        name: file.name,
        mimeType: file.type || "application/pdf",
        data: await fileToBase64(file)
      }
    };
  }
  if (url) {
    return {
      name: existingReport?.attachmentName || "Drive PDF",
      url,
      source: "drive",
      uploadedAt: existingReport?.attachmentUploadedAt || new Date().toISOString(),
      file: null
    };
  }
  return {
    name: existingReport?.attachmentName || "",
    url: existingReport?.attachmentUrl || "",
    source: existingReport?.attachmentSource || "",
    uploadedAt: existingReport?.attachmentUploadedAt || "",
    file: null
  };
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || "").split(",")[1] || "");
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function editReport(reportId) {
  const report = state.reports.find((item) => item.id === reportId);
  if (!report) return;
  setView("report");
  els.reportId.value = report.id;
  els.reportProject.value = report.projectId;
  els.reportDate.value = report.date || todayStr();
  els.reportForm.elements.workingHours.value = report.workingHours || "";
  els.reportForm.elements.workSummary.value = report.workSummary || "";
  els.reportForm.elements.nextPlan.value = report.nextPlan || "";
  els.reportForm.elements.incident.value = report.incident || "";
  els.reportForm.elements.notes.value = report.notes || "";
  els.reportPdfUrl.value = report.attachmentUrl || "";
  els.reportPdfFile.value = "";
  renderCurrentReportPdf(report);
  els.reportSubmitBtn.textContent = "Raporu Güncelle";
  els.reportCancelEditBtn.classList.remove("hidden");
  els.reportForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

function resetReportForm() {
  els.reportForm.reset();
  clearReportEditState();
}

function clearReportEditState() {
  els.reportId.value = "";
  els.reportDate.value = todayStr();
  els.reportPdfFile.value = "";
  els.reportPdfUrl.value = "";
  renderCurrentReportPdf(null);
  els.reportSubmitBtn.textContent = "Raporu Kaydet";
  els.reportCancelEditBtn.classList.add("hidden");
}

function renderCurrentReportPdf(report) {
  if (!els.reportCurrentPdf) return;
  if (!report?.attachmentUrl) {
    els.reportCurrentPdf.classList.add("hidden");
    els.reportCurrentPdf.innerHTML = "";
    return;
  }
  els.reportCurrentPdf.classList.remove("hidden");
  els.reportCurrentPdf.innerHTML = `
    <strong>Mevcut PDF:</strong>
    <a href="${escapeHtml(report.attachmentUrl)}" target="_blank" rel="noreferrer">${escapeHtml(report.attachmentName || "PDF dosyası")}</a>
  `;
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
  const existingId = String(els.puantajId.value || "");
  const existingPuantaj = state.puantaj.find((item) => item.id === existingId);
  const payload = {
    id: existingId || crypto.randomUUID(),
    date: els.puantajDate.value || todayStr(),
    chiefId: existingId ? (existingPuantaj?.chiefId || state.currentUser.id) : state.currentUser.id,
    createdById: existingId ? (existingPuantaj?.createdById || state.currentUser.id) : state.currentUser.id,
    createdAt: existingId ? (existingPuantaj?.createdAt || new Date().toISOString()) : new Date().toISOString(),
    updatedAt: existingId ? new Date().toISOString() : "",
    workers
  };
  const remoteSaved = await sendToApi(existingId ? "updatePuantaj" : "savePuantaj", payload);
  if (existingId) state.puantaj = state.puantaj.map((item) => item.id === existingId ? payload : item);
  else state.puantaj.push(payload);
  persist(STORAGE_KEYS.puantaj, state.puantaj);
  renderAll();
  resetPuantajForm();
  showToast(remoteSaved ? "Puantaj kaydedildi." : "Puantaj yerelde kaydedildi.");
}

function editPuantaj(puantajId) {
  const item = state.puantaj.find((row) => row.id === puantajId);
  if (!item) return;
  setView("puantaj");
  els.puantajId.value = item.id;
  els.puantajDate.value = item.date || todayStr();
  els.workerList.innerHTML = "";
  (item.workers || []).forEach((worker) => addWorker(worker));
  if (!item.workers?.length) addWorker();
  els.savePuantajBtn.textContent = "Puantajı Güncelle";
  els.puantajCancelEditBtn.classList.remove("hidden");
  els.workerList.scrollIntoView({ behavior: "smooth", block: "start" });
}

function resetPuantajForm() {
  els.puantajId.value = "";
  els.puantajDate.value = todayStr();
  els.workerList.innerHTML = "";
  addWorker();
  els.savePuantajBtn.textContent = "Puantajı Kaydet";
  els.puantajCancelEditBtn.classList.add("hidden");
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
  const existingId = String(form.get("id") || "");
  const payload = {
    id: existingId || crypto.randomUUID(),
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
    note: form.get("note"),
    createdAt: existingId ? (state.orders.find((item) => item.id === existingId)?.createdAt || new Date().toISOString()) : new Date().toISOString(),
    updatedAt: existingId ? new Date().toISOString() : ""
  };
  const remoteSaved = await sendToApi(existingId ? "updateOrder" : "saveOrder", payload);
  if (existingId) {
    state.orders = state.orders.map((item) => item.id === existingId ? payload : item);
  } else {
    state.orders.push(payload);
  }
  persist(STORAGE_KEYS.orders, state.orders);
  renderAll();
  resetOrderForm();
  showToast(remoteSaved ? "Sipariş kaydedildi." : "Sipariş yerelde kaydedildi.");
}

function editOrder(orderId) {
  const order = state.orders.find((item) => item.id === orderId);
  if (!order) return;
  setView("orders");
  els.orderId.value = order.id;
  els.orderProject.value = order.projectId;
  els.orderDate.value = order.date || todayStr();
  els.orderMaterial.value = order.material || "Beton";
  document.getElementById("order-spec").value = order.spec || "";
  els.orderQty.value = order.quantity || "";
  els.orderUnit.value = order.unit || "";
  document.getElementById("order-supplier").value = order.supplier || "";
  els.orderUnitPrice.value = order.unitPrice || "";
  document.getElementById("order-price-source").value = order.priceSource || "";
  document.getElementById("order-status").value = order.status || "Beklemede";
  document.getElementById("order-note").value = order.note || "";
  els.orderSubmitBtn.textContent = "Siparişi Güncelle";
  els.orderCancelEditBtn.classList.remove("hidden");
  updateOrderTotal();
}

function resetOrderForm() {
  els.orderForm.reset();
  clearOrderEditState();
}

function clearOrderEditState() {
  els.orderId.value = "";
  els.orderDate.value = todayStr();
  syncOrderUnit();
  updateOrderTotal();
  els.orderSubmitBtn.textContent = "Siparişi Kaydet";
  els.orderCancelEditBtn.classList.add("hidden");
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

function renderProjectDetail() {
  const projectId = state.selectedProjectId || state.projects[0]?.id;
  if (!projectId) {
    els.projectDetailTitle.textContent = "Bir şantiye seçin";
    els.projectDetailKpis.innerHTML = "";
    els.projectDetailBrief.textContent = "Önce bir proje ekleyin ya da listeden bir şantiye seçin.";
    els.projectProgressStrip.innerHTML = "";
    els.projectCostChart.innerHTML = emptyState("Önce bir proje ekleyin.");
    els.projectActivityChart.innerHTML = "";
    els.projectDetailReports.innerHTML = "";
    els.projectDetailOrders.innerHTML = "";
    els.projectDetailPuantaj.innerHTML = "";
    els.projectDetailDocuments.innerHTML = "";
    els.projectDetailTasks.innerHTML = "";
    return;
  }

  state.selectedProjectId = projectId;
  const project = state.projects.find((item) => item.id === projectId);
  const detail = getProjectDetailData(projectId);
  els.projectDetailTitle.textContent = `${project?.name || "Proje"} Detayı`;
  els.projectDetailKpis.innerHTML = [
    kpiCard("Toplam Sipariş", detail.orders.length, `${formatCurrency(detail.totalCost)} maliyet`),
    kpiCard("Saha Raporu", detail.reports.length, `${detail.latestReportDate || "Kayıt yok"} son giriş`),
    kpiCard("Puantaj", detail.puantaj.length, `${detail.workerCount} personel`),
    kpiCard("Bütçe Kullanımı", `${detail.budgetUsage}%`, `${formatCurrency(detail.budget)} bütçe`)
  ].join("");
  els.projectDetailBrief.textContent = buildProjectBrief(project, detail);
  els.projectProgressStrip.innerHTML = renderProjectProgress(project, detail);

  els.projectCostChart.innerHTML = renderChartRows([
    { label: "Beton", value: detail.concreteCost, total: detail.totalCost },
    { label: "Demir", value: detail.rebarCost, total: detail.totalCost },
    { label: "Diğer", value: Math.max(0, detail.totalCost - detail.concreteCost - detail.rebarCost), total: detail.totalCost }
  ]);

  els.projectActivityChart.innerHTML = renderChartRows([
    { label: "Rapor", value: detail.reports.length, total: detail.activityTotal || 1 },
    { label: "Puantaj", value: detail.puantaj.length, total: detail.activityTotal || 1 },
    { label: "Sipariş", value: detail.orders.length, total: detail.activityTotal || 1 }
  ]);

  els.projectDetailReports.innerHTML = detail.reports.length
    ? detail.reports.map(renderReportRecord).join("")
    : emptyState("Bu projeye ait saha raporu yok.");
  els.projectDetailOrders.innerHTML = detail.orders.length
    ? detail.orders.map(renderOrderCard).join("")
    : emptyState("Bu projeye ait sipariş yok.");
  els.projectDetailPuantaj.innerHTML = detail.puantaj.length
    ? detail.puantaj.map(renderPuantajRecord).join("")
    : emptyState("Bu projeye ait puantaj yok.");
  els.projectDetailDocuments.innerHTML = detail.documents.length
    ? detail.documents.map(renderDocumentCard).join("")
    : emptyState("Bu projeye ait evrak yok.");
  els.projectDetailTasks.innerHTML = detail.tasks.length
    ? detail.tasks.map(renderTaskCard).join("")
    : emptyState("Bu projeye ait takvim işi yok.");
}

function getProjectDetailData(projectId) {
  const from = els.projectFilterFrom.value;
  const to = els.projectFilterTo.value;
  const inRange = (date) => (!from || date >= from) && (!to || date <= to);
  const project = state.projects.find((item) => item.id === projectId);
  const reports = state.reports.filter((item) => reportBelongsToProject(item, project) && inRange(item.date)).sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  const orders = state.orders.filter((item) => item.projectId === projectId && inRange(item.date)).sort((a, b) => b.date.localeCompare(a.date));
  const puantaj = state.puantaj.filter((entry) => inRange(entry.date) && entry.workers.some((worker) => worker.projectId === projectId)).sort((a, b) => b.date.localeCompare(a.date));
  const documents = state.documents.filter((item) => item.projectId === projectId).sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  const tasks = state.tasks.filter((item) => item.projectId === projectId && inRange(item.dueDate)).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const concreteCost = orders.filter((item) => item.material === "Beton").reduce((sum, item) => sum + Number(item.total || 0), 0);
  const rebarCost = orders.filter((item) => item.material === "Demir").reduce((sum, item) => sum + Number(item.total || 0), 0);
  const totalCost = orders.reduce((sum, item) => sum + Number(item.total || 0), 0);
  const workerCount = puantaj.reduce((sum, item) => sum + item.workers.filter((worker) => worker.projectId === projectId && worker.status === "present").length, 0);
  const budget = Number(state.projects.find((item) => item.id === projectId)?.budget || 0);
  return {
    reports,
    orders,
    puantaj,
    documents,
    tasks,
    concreteCost,
    rebarCost,
    totalCost,
    workerCount,
    budget,
    budgetUsage: budget ? Math.min(100, Math.round((totalCost / budget) * 100)) : 0,
    latestReportDate: reports[0]?.date || "",
    latestOrderDate: orders[0]?.date || "",
    latestPuantajDate: puantaj[0]?.date || "",
    activityTotal: reports.length + orders.length + puantaj.length + documents.length + tasks.length
  };
}

function reportBelongsToProject(report, project) {
  if (!project) return false;
  const reportProjectId = String(report.projectId || "").trim();
  if (reportProjectId === project.id) return true;
  if (reportProjectId && reportProjectId.toLocaleLowerCase("tr-TR") === String(project.name || "").trim().toLocaleLowerCase("tr-TR")) return true;
  return !reportProjectId && state.projects.length === 1;
}

function buildProjectBrief(project, detail) {
  const projectNameText = project?.name || "Bu proje";
  const reportText = detail.reports.length
    ? `Son saha raporu ${detail.latestReportDate || "-"} tarihinde girildi.`
    : "Henüz saha raporu girilmedi.";
  const orderText = detail.orders.length
    ? `Toplam ${detail.orders.length} sipariş kaydı ile ${formatCurrency(detail.totalCost)} maliyet oluştu.`
    : "Henüz beton, demir veya diğer malzeme siparişi yok.";
  const workforceText = detail.puantaj.length
    ? `Puantaj tarafında ${detail.workerCount} personel hareketi kayıt altına alındı.`
    : "Henüz puantaj kaydı yok.";
  return `${projectNameText} için özet görünümdesiniz. ${reportText} ${orderText} ${workforceText}`;
}

function renderChartRows(rows) {
  return rows.map((row) => {
    const total = row.total || 1;
    const percent = total > 0 ? Math.round((row.value / total) * 100) : 0;
    return `
      <div class="chart-row">
        <div class="chart-meta">
          <span>${escapeHtml(row.label)}</span>
          <span>${row.label === "Rapor" || row.label === "Puantaj" || row.label === "Sipariş" ? row.value : formatCurrency(row.value)} · %${percent}</span>
        </div>
        <div class="chart-bar"><span class="chart-fill" style="width:${percent}%"></span></div>
      </div>
    `;
  }).join("");
}


function renderProjectProgress(project, detail) {
  const today = todayStr();
  const start = project?.startDate || "";
  const end = project?.endDate || "";
  const elapsedPercent = projectDateProgress(start, end, today);
  const budgetPercent = detail.budgetUsage || 0;
  const openTasks = detail.tasks.length;
  return `
    <div class="progress-metric">
      <span>Takvim İlerlemesi</span>
      <strong>%${elapsedPercent}</strong>
      <div class="progress"><span style="width:${elapsedPercent}%"></span></div>
      <small>${escapeHtml(start || "Başlangıç yok")} - ${escapeHtml(end || "Bitiş yok")}</small>
    </div>
    <div class="progress-metric">
      <span>Bütçe Kullanımı</span>
      <strong>%${budgetPercent}</strong>
      <div class="progress"><span style="width:${budgetPercent}%"></span></div>
      <small>${formatCurrency(detail.totalCost)} / ${formatCurrency(detail.budget)}</small>
    </div>
    <div class="progress-metric">
      <span>Takvim İşi</span>
      <strong>${openTasks}</strong>
      <div class="progress"><span style="width:${Math.min(100, openTasks * 20)}%"></span></div>
      <small>${detail.documents.length} evrak, ${detail.reports.length} rapor</small>
    </div>
  `;
}

function projectDateProgress(startDate, endDate, currentDate) {
  if (!startDate || !endDate) return 0;
  const start = new Date(startDate);
  const end = new Date(endDate);
  const current = new Date(currentDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return 0;
  return Math.max(0, Math.min(100, Math.round(((current - start) / (end - start)) * 100)));
}

async function onSaveTask(event) {
  event.preventDefault();
  if (!requireAuth() || !requireProjects()) return;
  const form = new FormData(els.taskForm);
  const title = String(form.get("title") || "").trim();
  if (!title) return showToast("Takip edilecek iş gerekli.");
  const payload = {
    id: String(form.get("id") || "") || crypto.randomUUID(),
    projectId: form.get("projectId"),
    title,
    assignedToId: state.currentUser.id,
    dueDate: form.get("dueDate") || todayStr(),
    status: "Planlandı",
    note: form.get("note") || "",
    createdById: state.currentUser.id,
    createdAt: new Date().toISOString()
  };
  const remoteSaved = await sendToApi("saveTask", payload);
  state.tasks.push(payload);
  persist(STORAGE_KEYS.tasks, state.tasks);
  state.calendarDate = new Date(`${payload.dueDate}T12:00:00`);
  renderAll();
  els.taskForm.reset();
  renderWhatsappLinks(payload);
  showToast(remoteSaved ? "Takvim kaydı eklendi." : "Takvim kaydı yerelde tutuldu.");
}

function changeCalendarMonth(offset) {
  const base = state.calendarDate instanceof Date ? state.calendarDate : new Date();
  state.calendarDate = new Date(base.getFullYear(), base.getMonth() + offset, 1);
  renderCalendar();
}

function renderCalendar() {
  if (!els.calendarGrid) return;
  const now = state.calendarDate instanceof Date ? state.calendarDate : new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const blanks = (first.getDay() + 6) % 7;
  if (els.calendarTitle) {
    els.calendarTitle.textContent = new Intl.DateTimeFormat("tr-TR", { month: "long", year: "numeric" }).format(first);
  }
  const cells = [];
  ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"].forEach((day) => {
    cells.push(`<div class="calendar-head">${day}</div>`);
  });
  for (let i = 0; i < blanks; i += 1) cells.push('<div class="calendar-cell muted"></div>');
  for (let day = 1; day <= last.getDate(); day += 1) {
    const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const dayTasks = state.tasks.filter((task) => task.dueDate === date);
    cells.push(`
      <div class="calendar-cell ${date === todayStr() ? "today" : ""}">
        <div class="calendar-day-number">${day}</div>
        ${dayTasks.slice(0, 4).map((task) => `<span title="${escapeHtml(task.title)}">${escapeHtml(task.title)}</span>`).join("")}
        ${dayTasks.length > 4 ? `<em>+${dayTasks.length - 4} kayıt</em>` : ""}
      </div>
    `);
  }
  els.calendarGrid.innerHTML = cells.join("");
  els.taskRecords.innerHTML = state.tasks.length
    ? state.tasks.slice().sort((a, b) => a.dueDate.localeCompare(b.dueDate)).map(renderTaskCard).join("")
    : emptyState("Henüz takvim kaydı yok.");
  notifyDueTasks();
}
function renderTaskCard(task) {
  return `
    <article class="record-card">
      <div class="record-title">
        <strong>${escapeHtml(task.title)}</strong>
        <span class="tag">${escapeHtml(task.dueDate || "-")}</span>
      </div>
      <div class="record-meta">${escapeHtml(projectName(task.projectId))} · Giren: ${escapeHtml(userName(task.createdById || task.assignedToId))} · ${escapeHtml(formatDateTime(task.createdAt))}</div>
      <div class="record-meta">${escapeHtml(task.note || "-")}</div>
    </article>
  `;
}

function renderWhatsappLinks(task) {
  if (!els.whatsappLinks) return;
  const numbers = parseWhatsappNumbers(state.settings.whatsappNumbers);
  if (!numbers.length) {
    els.whatsappLinks.classList.remove("hidden");
    els.whatsappLinks.innerHTML = "WhatsApp bildirimi için Ayarlar bölümüne bildirim numaralarını girin.";
    return;
  }
  const message = buildWhatsappMessage(task);
  els.whatsappLinks.classList.remove("hidden");
  els.whatsappLinks.innerHTML = `
    <strong>WhatsApp bildirimi hazır:</strong>
    <div class="whatsapp-link-list">
      ${numbers.map((number) => `<a class="btn btn-secondary" href="https://wa.me/${number}?text=${encodeURIComponent(message)}" target="_blank" rel="noreferrer">Gönder: ${escapeHtml(number)}</a>`).join("")}
    </div>
  `;
}

function parseWhatsappNumbers(value) {
  return String(value || "")
    .split(/[\s,;]+/)
    .map((item) => item.replace(/\D/g, ""))
    .filter((item) => item.length >= 10);
}

function buildWhatsappMessage(task) {
  return [
    "Ayazlar Yapı Takvim Bildirimi",
    `Proje: ${projectName(task.projectId)}`,
    `Tarih: ${task.dueDate || "-"}`,
    `Takip edilecek iş: ${task.title}`,
    `Bilgi: ${task.note || "-"}`,
    `Giren: ${userName(task.createdById)}`,
    `Kayıt zamanı: ${formatDateTime(task.createdAt)}`
  ].join("\n");
}

async function deleteDocument(documentId) {
  const item = state.documents.find((documentItem) => documentItem.id === documentId);
  if (!item) return;
  if (!window.confirm(`"${item.title}" evrak kaydı silinsin mi?`)) return;
  const remoteDeleted = await sendToApi("deleteDocument", { id: documentId });
  state.documents = state.documents.filter((documentItem) => documentItem.id !== documentId);
  persist(STORAGE_KEYS.documents, state.documents);
  renderAll();
  showToast(remoteDeleted ? "Evrak silindi." : "Evrak yerelden silindi.");
}

async function requestNotifications() {
  if (!("Notification" in window)) return showToast("Bu tarayıcı bildirim desteklemiyor.");
  const permission = await Notification.requestPermission();
  showToast(permission === "granted" ? "Bildirimler açıldı." : "Bildirim izni verilmedi.");
  notifyDueTasks(true);
}

function notifyDueTasks(force = false) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  const dueTasks = state.tasks.filter((task) => task.status !== "Tamamlandı" && task.dueDate <= todayStr());
  if (!dueTasks.length) return;
  const key = `som_notified_${todayStr()}`;
  if (!force && localStorage.getItem(key)) return;
  new Notification("Şantiye iş takibi", {
    body: `${dueTasks.length} takip edilecek iş bugün veya geçmiş tarihte bekliyor.`
  });
  localStorage.setItem(key, "1");
}

function exportAllJson() {
  const payload = {
    exportedAt: new Date().toISOString(),
    companyName: state.settings.companyName,
    projects: state.projects,
    users: state.users.map(({ passwordHash, ...rest }) => rest),
    reports: state.reports,
    puantaj: state.puantaj,
    orders: state.orders,
    tasks: state.tasks,
    documents: state.documents
  };
  downloadFile("santiye-operasyon-merkezi.json", JSON.stringify(payload, null, 2), "application/json");
  showToast("Tüm kayıtlar JSON olarak indirildi.");
}

function onSaveSettings(event) {
  event.preventDefault();
  state.settings = {
    apiBaseUrl: els.settingsApiUrl.value.trim(),
    apiToken: els.settingsApiToken.value.trim(),
    companyName: els.settingsCompanyName.value.trim(),
    sheetNote: els.settingsSheetNote.value.trim(),
    whatsappNumbers: els.settingsWhatsappNumbers.value.trim()
  };
  state.apiHealth = "unknown";
  persist(STORAGE_KEYS.settings, state.settings);
  setConnectionPill();
  showToast("Ayarlar kaydedildi.");
}

async function syncFromApi(options = {}) {
  const { silent = false } = options;
  state.settings = normalizeSettings(state.settings);
  persist(STORAGE_KEYS.settings, state.settings);
  hydrateForms();
  if (!state.settings.apiBaseUrl) {
    if (!silent) showToast("Önce Apps Script URL bilgisini ayarlara girin.");
    setView("settings");
    return;
  }
  if (!state.settings.apiToken) {
    if (!silent) showToast("Önce API güvenlik anahtarını ayarlara girin.");
    setConnectionPill();
    setView("settings");
    return;
  }
  try {
    const url = new URL(state.settings.apiBaseUrl);
    url.searchParams.set("resource", "bootstrap");
    if (state.settings.apiToken) url.searchParams.set("token", state.settings.apiToken);
    const response = await fetch(url.toString(), { method: "GET" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    if (payload.ok === false) throw new Error(payload.error || "API hatası");
    state.projects = payload.projects || state.projects;
    if (Array.isArray(payload.users) && payload.users.length > 0) {
      state.users = mergeUsersKeepingLocalSecrets(state.users, payload.users);
    }
    state.reports = mergeById(state.reports, payload.reports);
    state.puantaj = mergeById(state.puantaj, payload.puantaj);
    state.orders = mergeById(state.orders, payload.orders);
    state.tasks = mergeById(state.tasks, payload.tasks);
    state.documents = mergeById(state.documents, payload.documents);
    persist(STORAGE_KEYS.projects, state.projects);
    persist(STORAGE_KEYS.users, state.users);
    persist(STORAGE_KEYS.reports, state.reports);
    persist(STORAGE_KEYS.puantaj, state.puantaj);
    persist(STORAGE_KEYS.orders, state.orders);
    persist(STORAGE_KEYS.tasks, state.tasks);
    persist(STORAGE_KEYS.documents, state.documents);
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
    if (!silent) {
      showToast(`Sheets yüklendi: ${state.projects.length} proje, ${state.reports.length} rapor, ${state.puantaj.length} puantaj.`);
    }
  } catch (error) {
    console.error(error);
    state.apiHealth = "error";
    setConnectionPill();
    if (!silent) showToast("Veri çekilirken hata oluştu.");
  }
}

async function sendToApi(action, payload) {
  if (!state.settings.apiBaseUrl || !state.settings.apiToken) return false;
  try {
    const response = await fetch(state.settings.apiBaseUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action, token: state.settings.apiToken, payload })
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const result = await response.json().catch(() => ({ ok: true }));
    if (result.ok === false) throw new Error(result.error || "API hatası");
    state.apiHealth = "ok";
    setConnectionPill();
    return result;
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

function exportLatestReportPdf() {
  const latest = state.reports.slice().sort((a, b) => b.date.localeCompare(a.date))[0];
  if (!latest) return showToast("Henüz saha raporu yok.");
  exportReportPdf(latest.id);
}

function exportLatestPuantajPdf() {
  const latest = state.puantaj.slice().sort((a, b) => b.date.localeCompare(a.date))[0];
  if (!latest) return showToast("Henüz puantaj yok.");
  exportPuantajPdf(latest.id);
}

function exportLatestOrderPdf() {
  const latest = state.orders.slice().sort((a, b) => b.date.localeCompare(a.date))[0];
  if (!latest) return showToast("Henüz sipariş yok.");
  exportOrderPdf(latest.id);
}

async function exportReportPdf(reportId) {
  const report = state.reports.find((item) => item.id === reportId);
  if (!report) return;
  const doc = await createPdfDoc("Saha Raporu");
  const startY = await addPdfHeader(doc, "Günlük Saha Raporu", report.date, userName(report.createdById), projectName(report.projectId), report.createdAt);
  const infoEndY = pdfKeyValueTable(doc, startY, [
    ["Proje", projectName(report.projectId)],
    ["Rapor Tarihi", report.date],
    ["Rapor Saati", formatDateTime(report.createdAt || report.date)],
    ["Raporu Giren", userName(report.createdById)],
    ["Çalışma Saati", report.workingHours || "-"],
    ["Ramak Kala", report.incident || "-"]
  ]);
  pdfSectionTable(doc, "Bugün Yapılan İşler", report.workSummary || "-", infoEndY + 18);
  const nextY = getLastAutoTableY(doc, infoEndY + 18) + 16;
  pdfSectionTable(doc, "Yarın Planı", report.nextPlan || "-", nextY);
  const notesY = getLastAutoTableY(doc, nextY) + 16;
  pdfSectionTable(doc, "Ek Notlar", report.notes || "-", notesY);
  if (report.attachmentUrl) {
    const attachmentY = getLastAutoTableY(doc, notesY) + 16;
    pdfKeyValueTable(doc, attachmentY, [
      ["Ek PDF", report.attachmentName || "PDF dosyası"],
      ["PDF Linki", report.attachmentUrl]
    ]);
  }
  doc.save(`SahaRaporu_${safeName(projectName(report.projectId))}_${report.date}.pdf`);
}

async function exportPuantajPdf(puantajId) {
  const item = state.puantaj.find((row) => row.id === puantajId);
  if (!item) return;
  const doc = await createPdfDoc("Puantaj");
  const startY = await addPdfHeader(doc, "Günlük Puantaj Raporu", item.date, userName(item.createdById), userName(item.chiefId), item.createdAt);
  const presentCount = item.workers.filter((worker) => worker.status === "present").length;
  doc.autoTable({
    startY,
    theme: "grid",
    styles: pdfBaseStyles(),
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 140 } },
    body: [
      ["Rapor Tarihi", item.date],
      ["Rapor Saati", formatDateTime(item.createdAt || item.date)],
      ["Şef", userName(item.chiefId)],
      ["Kaydı Giren", userName(item.createdById)],
      ["Toplam Personel", String(item.workers.length)],
      ["Gelen Personel", String(presentCount)]
    ]
  });
  const body = item.workers.map((worker) => [worker.name, projectName(worker.projectId), worker.job || "-", worker.status === "present" ? "Geldi" : "Gelmedi"]);
  doc.autoTable({
    startY: getLastAutoTableY(doc, startY) + 18,
    theme: "striped",
    styles: pdfBaseStyles(),
    headStyles: pdfHeadStyles(),
    head: [["Personel", "Proje", "Görev", "Durum"]],
    body
  });
  doc.save(`Puantaj_${item.date}.pdf`);
}

async function exportOrderPdf(orderId) {
  const order = state.orders.find((item) => item.id === orderId);
  if (!order) return;
  const doc = await createPdfDoc("Sipariş");
  const startY = await addPdfHeader(doc, "Beton / Demir Sipariş Raporu", order.date, userName(order.orderedById), projectName(order.projectId), order.createdAt);
  const infoEndY = pdfKeyValueTable(doc, startY, [
    ["Proje", projectName(order.projectId)],
    ["Sipariş Tarihi", order.date],
    ["Kayıt Saati", formatDateTime(order.createdAt || order.date)],
    ["Malzeme", order.material || "-"],
    ["Özellik", order.spec || "-"],
    ["Miktar", `${order.quantity || 0} ${order.unit || ""}`],
    ["Tedarikçi", order.supplier || "-"],
    ["Birim Fiyat", formatCurrency(order.unitPrice || 0)],
    ["Toplam", formatCurrency(order.total || 0)],
    ["Fiyat Kaynağı", order.priceSource || "-"],
    ["Durum", order.status || "-"],
    ["Giren Kullanıcı", userName(order.orderedById)]
  ]);
  pdfSectionTable(doc, "Not", order.note || "-", infoEndY + 18);
  doc.save(`Siparis_${safeName(projectName(order.projectId))}_${order.date}.pdf`);
}

async function exportProjectDetailPdf() {
  if (!state.selectedProjectId) return showToast("Önce bir proje seçin.");
  const project = state.projects.find((item) => item.id === state.selectedProjectId);
  const detail = getProjectDetailData(state.selectedProjectId);
  const doc = await createPdfDoc("Proje Detay");
  const generatedAt = new Date().toISOString();
  const startY = await addPdfHeader(doc, "Şantiye Detay Raporu", todayStr(), state.currentUser?.name || "-", project?.name || "-", generatedAt);
  const summaryEndY = pdfKeyValueTable(doc, startY, [
    ["Konum", project?.location || "-"],
    ["Tarih Aralığı", projectDurationText(project?.startDate, project?.endDate)],
    ["Filtre", projectFilterLabel()],
    ["Bütçe", formatCurrency(project?.budget || 0)],
    ["Sipariş Maliyeti", formatCurrency(detail.totalCost)],
    ["Rapor Sayısı", String(detail.reports.length)],
    ["Puantaj Sayısı", String(detail.puantaj.length)],
    ["Personel", String(detail.workerCount)]
  ]);
  doc.autoTable({
    startY: summaryEndY + 18,
    theme: "striped",
    styles: pdfBaseStyles(),
    headStyles: pdfHeadStyles(),
    head: [["Özet Alanı", "Değer"]],
    body: [
      ["Beton Maliyeti", formatCurrency(detail.concreteCost)],
      ["Demir Maliyeti", formatCurrency(detail.rebarCost)],
      ["Bütçe Kullanımı", `%${detail.budgetUsage}`]
    ]
  });

  if (detail.reports.length) {
    doc.addPage();
    const reportsY = await addPdfHeader(doc, "Şantiye Detay / Saha Raporları", todayStr(), state.currentUser?.name || "-", project?.name || "-", generatedAt);
    doc.autoTable({
      startY: reportsY,
      theme: "striped",
      styles: pdfBaseStyles(),
      headStyles: pdfHeadStyles(),
      head: [["Tarih", "Kullanıcı", "Çalışma Saati", "Ramak Kala", "Bugün Yapılan İş"]],
      body: detail.reports.map((item) => [item.date, userName(item.createdById), item.workingHours || "-", item.incident || "-", item.workSummary || "-"])
    });
  }

  if (detail.orders.length) {
    doc.addPage();
    const ordersY = await addPdfHeader(doc, "Şantiye Detay / Siparişler", todayStr(), state.currentUser?.name || "-", project?.name || "-", generatedAt);
    doc.autoTable({
      startY: ordersY,
      theme: "striped",
      styles: pdfBaseStyles(),
      headStyles: pdfHeadStyles(),
      head: [["Tarih", "Malzeme", "Tedarikçi", "Miktar", "Toplam", "Giren"]],
      body: detail.orders.map((item) => [item.date, item.material, item.supplier || "-", `${item.quantity || 0} ${item.unit || ""}`, formatCurrency(item.total || 0), userName(item.orderedById)])
    });
  }

  if (detail.puantaj.length) {
    doc.addPage();
    const puantajY = await addPdfHeader(doc, "Şantiye Detay / Puantaj", todayStr(), state.currentUser?.name || "-", project?.name || "-", generatedAt);
    doc.autoTable({
      startY: puantajY,
      theme: "striped",
      styles: pdfBaseStyles(),
      headStyles: pdfHeadStyles(),
      head: [["Tarih", "Kaydı Giren", "Toplam Personel", "Gelen", "Gelmedi"]],
      body: detail.puantaj.map((item) => {
        const present = item.workers.filter((w) => w.status === "present").length;
        return [item.date, userName(item.createdById), item.workers.length, present, item.workers.length - present];
      })
    });
  }

  doc.save(`SantiyeDetay_${safeName(project?.name || "Proje")}.pdf`);
}

async function createPdfDoc(subject) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  doc.setProperties({ title: subject, subject, author: state.currentUser?.name || "Ayazlar Yapı" });
  await registerPdfFonts(doc);
  try {
    doc.__logoDataUrl = await loadLogoDataUrl();
  } catch (error) {
    console.warn("Logo yüklenemedi.", error);
  }
  return doc;
}

async function registerPdfFonts(doc) {
  try {
    if (!pdfFontPromise) pdfFontPromise = Promise.all([loadPdfFont(PDF_FONT_FILES.normal), loadPdfFont(PDF_FONT_FILES.bold)]);
    const [regular, bold] = await pdfFontPromise;
    doc.addFileToVFS(PDF_FONT_FILES.normal.fileName, regular);
    doc.addFont(PDF_FONT_FILES.normal.fileName, PDF_FONT_FAMILY, "normal");
    doc.addFileToVFS(PDF_FONT_FILES.bold.fileName, bold);
    doc.addFont(PDF_FONT_FILES.bold.fileName, PDF_FONT_FAMILY, "bold");
    pdfFontFamily = PDF_FONT_FAMILY;
    doc.setFont(pdfFontFamily, "normal");
  } catch (error) {
    console.warn("PDF fontu yüklenemedi, varsayılan font kullanılacak.", error);
    pdfFontFamily = "helvetica";
  }
}

async function loadPdfFont(fontFile) {
  const response = await fetch(fontFile.url);
  if (!response.ok) throw new Error(`Font yüklenemedi: ${fontFile.url}`);
  return arrayBufferToBase64(await response.arrayBuffer());
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  return window.btoa(binary);
}

async function addPdfHeader(doc, title, date, person, context, createdAt) {
  doc.setDrawColor(237, 28, 36);
  doc.setLineWidth(2);
  doc.line(36, 34, 559, 34);
  if (doc.__logoDataUrl) {
    doc.addImage(doc.__logoDataUrl, "JPEG", 36, 44, 50, 50);
  }
  doc.setTextColor(26, 33, 56);
  doc.setFont(pdfFontFamily, "bold");
  doc.setFontSize(17);
  doc.text(state.settings.companyName || "AYAZLAR YAPI", 98, 64);
  doc.setFont(pdfFontFamily, "normal");
  doc.setFontSize(10);
  doc.setTextColor(90, 96, 115);
  doc.text("Şantiye Operasyon Merkezi", 98, 80);
  doc.setFont(pdfFontFamily, "bold");
  doc.setFontSize(16);
  doc.setTextColor(36, 40, 52);
  doc.text(title, 36, 122);
  doc.autoTable({
    startY: 136,
    theme: "grid",
    styles: pdfBaseStyles(),
    tableLineColor: [222, 226, 235],
    tableLineWidth: 0.5,
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 105 },
      1: { cellWidth: 150 },
      2: { fontStyle: "bold", cellWidth: 105 },
      3: { cellWidth: 163 }
    },
    body: [[
      "Tarih", date,
      "Saat", formatDateTime(createdAt || new Date().toISOString())
    ], [
      "Oluşturan", person,
      "Bağlam", context
    ]]
  });
  return getLastAutoTableY(doc, 170) + 14;
}

function pdfTextBlock(doc, x, y, rows) {
  let currentY = y;
  doc.setFontSize(10);
  rows.forEach(([label, value]) => {
    doc.setTextColor(80, 86, 102);
    doc.text(`${label}:`, x, currentY);
    doc.setTextColor(30, 33, 40);
    const split = doc.splitTextToSize(String(value), 420);
    doc.text(split, x + 110, currentY);
    currentY += Math.max(18, split.length * 12);
  });
}

function safeName(value) {
  return String(value || "rapor").replaceAll(/\s+/g, "_").replaceAll(/[^\wğüşöçıİĞÜŞÖÇ-]/g, "");
}

function pdfKeyValueTable(doc, startY, rows) {
  doc.autoTable({
    startY,
    theme: "grid",
    styles: pdfBaseStyles(),
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 150 } },
    body: rows
  });
  return getLastAutoTableY(doc, startY);
}

function pdfSectionTable(doc, title, text, startY) {
  doc.autoTable({
    startY,
    theme: "grid",
    styles: pdfBaseStyles(),
    headStyles: pdfHeadStyles(),
    bodyStyles: { valign: "top", lineColor: [226, 230, 238], lineWidth: 0.5, textColor: [46, 50, 62] },
    head: [[title]],
    body: [[text]]
  });
}

function pdfBaseStyles() {
  return {
    font: pdfFontFamily,
    fontSize: 10,
    cellPadding: 7,
    textColor: [46, 50, 62],
    lineColor: [226, 230, 238],
    lineWidth: 0.5
  };
}

function pdfHeadStyles() {
  return {
    fillColor: [32, 38, 64],
    textColor: [255, 255, 255],
    fontStyle: "bold"
  };
}

function getLastAutoTableY(doc, fallback) {
  return doc.lastAutoTable?.finalY || fallback;
}

function projectFilterLabel() {
  const from = els.projectFilterFrom.value;
  const to = els.projectFilterTo.value;
  if (!from && !to) return "Tüm kayıtlar";
  return `${from || "Başlangıç yok"} - ${to || "Bitiş yok"}`;
}

async function loadLogoDataUrl() {
  if (loadLogoDataUrl.cached) return loadLogoDataUrl.cached;
  const response = await fetch("./assets/logo-ayazlar.jpg");
  const blob = await response.blob();
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
  loadLogoDataUrl.cached = dataUrl;
  return dataUrl;
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(date);
}

window.__somPdf = {
  exportReport: exportReportPdf,
  exportPuantaj: exportPuantajPdf,
  exportOrder: exportOrderPdf
};

window.__somActions = {
  editReport,
  editPuantaj,
  editOrder,
  editDocument,
  deleteDocument
};

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
  if (!state.settings.apiToken) return (els.connectionPill.textContent = "Token Gerekli");
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

function normalizeSettings(settings) {
  const merged = { ...DEFAULT_SETTINGS, ...(settings || {}) };
  if (!merged.apiBaseUrl || !String(merged.apiBaseUrl).includes("/macros/s/")) {
    merged.apiBaseUrl = DEFAULT_SETTINGS.apiBaseUrl;
  }
  if (!merged.apiToken) merged.apiToken = DEFAULT_SETTINGS.apiToken;
  return merged;
}

function persist(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function mergeById(localItems, remoteItems) {
  if (!Array.isArray(remoteItems)) return localItems;
  const merged = new Map();
  [...remoteItems, ...localItems].forEach((item) => {
    if (!item?.id) return;
    merged.set(item.id, { ...(merged.get(item.id) || {}), ...item });
  });
  return [...merged.values()];
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
