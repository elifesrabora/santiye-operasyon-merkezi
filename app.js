const CONFIG = {
  spreadsheetId: "1brBxxE6agOvAhTSp26nkN7NrtoWRyQygce5sRcE3ZyI",
  driveFolderId: "1kay5Ri3t_vLbRMuG22_tXslRsmwk4lg4",
  defaultApiUrl: "https://script.google.com/macros/s/AKfycbyr8CyvG1ubgI9xUCR9esVIf7GLoSBFBtfXZCN3fNXB94QsvThEx6MX0qjVeO4nFZB3jw/exec",
  storageKey: "santiye-operasyon-data-v1",
  settingsKey: "santiye-operasyon-settings-v1",
};

const TABLES = {
  projects: ["name", "client", "startDate", "endDate", "status", "notes"],
  sites: ["projectId", "name", "location", "manager", "status"],
  reports: ["projectId", "siteId", "date", "workDone", "notes"],
  payments: ["projectId", "period", "amount", "status", "notes"],
  personnel: ["projectId", "siteId", "date", "name", "attendance"],
  materials: ["projectId", "name", "quantity", "unit", "minimum", "status"],
  documents: ["projectId", "siteId", "title", "fileName", "fileUrl", "mimeType", "notes"],
};

const TABLE_LABELS = {
  projects: ["Proje", "İşveren", "Başlangıç", "Bitiş", "Durum", "Not"],
  sites: ["Proje", "Şantiye", "Konum", "Şef", "Durum"],
  reports: ["Proje", "Şantiye", "Tarih", "Yapılan işler", "Not"],
  payments: ["Proje", "Dönem", "Tutar", "Durum", "Not"],
  personnel: ["Proje", "Şantiye", "Tarih", "Personel", "Durum"],
  materials: ["Proje", "Malzeme", "Miktar", "Birim", "Minimum", "Durum"],
  documents: ["Proje", "Şantiye", "Başlık", "Dosya", "Bağlantı", "Tür", "Açıklama"],
};

let state = loadState();
let settings = loadSettings();

document.addEventListener("DOMContentLoaded", () => {
  bindNavigation();
  bindForms();
  bindSettings();
  setDefaultDates();
  render();
  syncFromRemote();
});

function emptyState() {
  return Object.keys(TABLES).reduce((acc, key) => {
    acc[key] = [];
    return acc;
  }, {});
}

function loadState() {
  const saved = localStorage.getItem(CONFIG.storageKey);
  if (!saved) return emptyState();
  return { ...emptyState(), ...JSON.parse(saved) };
}

function saveState() {
  localStorage.setItem(CONFIG.storageKey, JSON.stringify(state));
}

function loadSettings() {
  const saved = localStorage.getItem(CONFIG.settingsKey);
  return saved ? { apiUrl: CONFIG.defaultApiUrl, ...JSON.parse(saved) } : { apiUrl: CONFIG.defaultApiUrl, userEmail: "", role: "admin" };
}

function saveSettings() {
  localStorage.setItem(CONFIG.settingsKey, JSON.stringify(settings));
}

function bindNavigation() {
  document.querySelectorAll(".nav-item").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".nav-item").forEach((item) => item.classList.remove("active"));
      document.querySelectorAll(".view").forEach((view) => view.classList.remove("active"));
      button.classList.add("active");
      document.getElementById(button.dataset.view).classList.add("active");
      document.getElementById("pageTitle").textContent = button.textContent;
    });
  });

  document.getElementById("refreshBtn").addEventListener("click", syncFromRemote);
  document.getElementById("exportPdfBtn").addEventListener("click", () => window.print());
  document.getElementById("projectFilter").addEventListener("change", render);
}

function bindForms() {
  document.querySelectorAll("form[data-form]").forEach((form) => {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const table = form.dataset.form;
      const item = await formToRecord(form, table);
      state[table].push(item);
      saveState();
      render();
      form.reset();
      setDefaultDates();
      toast("Kayıt eklendi.");
      syncRecord(table, item);
    });
  });
}

function bindSettings() {
  const apiUrlInput = document.getElementById("apiUrlInput");
  const userEmailInput = document.getElementById("userEmailInput");
  const roleInput = document.getElementById("roleInput");
  apiUrlInput.value = settings.apiUrl || "";
  userEmailInput.value = settings.userEmail || "";
  roleInput.value = settings.role || "admin";
  document.getElementById("saveSettingsBtn").addEventListener("click", () => {
    settings = {
      apiUrl: apiUrlInput.value.trim(),
      userEmail: userEmailInput.value.trim(),
      role: roleInput.value,
    };
    saveSettings();
    renderSyncState();
    toast("Ayarlar kaydedildi.");
    syncFromRemote();
  });
}

function setDefaultDates() {
  const today = new Date().toISOString().slice(0, 10);
  document.querySelectorAll('input[type="date"]').forEach((input) => {
    if (!input.value) input.value = today;
  });
}

async function formToRecord(form, table) {
  const formData = new FormData(form);
  const record = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    createdBy: settings.userEmail || "local",
  };

  for (const field of TABLES[table]) {
    if (field === "fileName" || field === "fileUrl" || field === "mimeType") continue;
    record[field] = formData.get(field)?.toString().trim() || "";
  }

  if (table === "documents") {
    const file = formData.get("file");
    if (file && file.size) {
      record.fileName = file.name;
      record.mimeType = file.type;
      record.fileData = await fileToBase64(file);
      record.fileUrl = "";
    }
  }

  return record;
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function render() {
  renderSyncState();
  renderProjectOptions();
  renderMetrics();
  renderTables();
  renderActivity();
  renderGantt();
  renderCalendar();
}

function filtered(table) {
  const projectId = document.getElementById("projectFilter").value;
  if (!projectId || table === "projects") return state[table];
  return state[table].filter((item) => item.projectId === projectId);
}

function renderSyncState() {
  const dot = document.getElementById("syncDot");
  dot.className = "sync-dot";
  if (settings.apiUrl) {
    dot.classList.add("online");
    document.getElementById("syncTitle").textContent = "Sheets bağlantısı hazır";
    document.getElementById("syncDetail").textContent = settings.userEmail || "Kullanıcı e-posta bekleniyor";
  } else {
    document.getElementById("syncTitle").textContent = "Yerel mod";
    document.getElementById("syncDetail").textContent = "Apps Script URL bekleniyor";
  }
}

function renderProjectOptions() {
  const options = state.projects
    .map((project) => `<option value="${escapeHtml(project.id)}">${escapeHtml(project.name)}</option>`)
    .join("");

  document.querySelectorAll("[data-project-select]").forEach((select) => {
    const current = select.value;
    select.innerHTML = `<option value="">Proje seç</option>${options}`;
    select.value = current;
  });

  const filter = document.getElementById("projectFilter");
  const currentFilter = filter.value;
  filter.innerHTML = `<option value="">Tüm projeler</option>${options}`;
  filter.value = currentFilter;

  renderSiteOptions();
}

function renderSiteOptions() {
  const options = state.sites
    .map((site) => `<option value="${escapeHtml(site.id)}">${escapeHtml(site.name)}</option>`)
    .join("");
  document.querySelectorAll("[data-site-select]").forEach((select) => {
    const current = select.value;
    select.innerHTML = `<option value="">Şantiye seç</option>${options}`;
    select.value = current;
  });
}

function renderMetrics() {
  const today = new Date().toISOString().slice(0, 10);
  const todayPersonnel = state.personnel.filter((item) => item.date === today);
  const present = todayPersonnel.filter((item) => item.attendance === "Geldi").length;
  const openPayments = state.payments
    .filter((item) => item.status !== "Ödendi")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  document.getElementById("metricProjects").textContent = state.projects.filter((item) => item.status !== "Tamamlandı").length;
  document.getElementById("metricSites").textContent = state.sites.filter((item) => item.status === "Aktif").length;
  document.getElementById("metricPersonnel").textContent = `${present}/${todayPersonnel.length}`;
  document.getElementById("metricPayments").textContent = formatCurrency(openPayments);
}

function renderTables() {
  Object.keys(TABLES).forEach((table) => {
    const target = document.getElementById(`${table}Table`);
    if (!target) return;
    target.innerHTML = tableMarkup(table, filtered(table));
    const count = document.getElementById(`${singular(table)}Count`);
    if (count) count.textContent = `${filtered(table).length} kayıt`;
  });
}

function singular(table) {
  return {
    projects: "project",
    sites: "site",
    reports: "report",
    payments: "payment",
    personnel: "personnel",
    materials: "material",
    documents: "document",
  }[table];
}

function tableMarkup(table, rows) {
  const labels = TABLE_LABELS[table];
  const fields = TABLES[table];
  const head = labels.map((label) => `<th>${label}</th>`).join("");
  const body = rows.length
    ? rows
        .slice()
        .reverse()
        .map((row) => {
          const cells = fields.map((field) => `<td>${formatCell(table, field, row[field], row)}</td>`).join("");
          return `<tr>${cells}</tr>`;
        })
        .join("")
    : `<tr><td colspan="${fields.length}">Henüz kayıt yok.</td></tr>`;
  return `<thead><tr>${head}</tr></thead><tbody>${body}</tbody>`;
}

function formatCell(table, field, value, row) {
  if (field === "projectId") return escapeHtml(projectName(value));
  if (field === "siteId") return escapeHtml(siteName(value));
  if (field === "status" || field === "attendance") return `<span class="status">${escapeHtml(value || "-")}</span>`;
  if (field === "amount") return formatCurrency(Number(value || 0));
  if (field === "fileUrl" && row.fileUrl) return `<a href="${escapeHtml(row.fileUrl)}" target="_blank" rel="noreferrer">Aç</a>`;
  if (field === "fileUrl") return "-";
  return escapeHtml(value || "-");
}

function renderActivity() {
  const reports = filtered("reports").slice(-5).reverse();
  document.getElementById("recentReports").innerHTML = reports.length
    ? reports.map((report) => activityItem(`${projectName(report.projectId)} / ${siteName(report.siteId)}`, `${report.date} - ${report.workDone}`)).join("")
    : activityItem("Henüz rapor yok", "Günlük rapor eklediğinde burada görünür.");

  const alerts = filtered("materials").filter((item) => Number(item.minimum || 0) > 0 && Number(item.quantity || 0) <= Number(item.minimum || 0));
  document.getElementById("materialAlerts").innerHTML = alerts.length
    ? alerts.map((item) => activityItem(item.name, `${item.quantity || 0} ${item.unit || ""} kaldı`)).join("")
    : activityItem("Kritik stok yok", "Minimum seviyenin altına düşen malzeme görünür.");
}

function activityItem(title, detail) {
  return `<div class="activity-item"><strong>${escapeHtml(title)}</strong><span>${escapeHtml(detail)}</span></div>`;
}

function renderGantt() {
  const projects = state.projects.filter((project) => project.startDate && project.endDate);
  const html = projects.length ? projects.map(ganttRow).join("") : activityItem("Zaman çizelgesi boş", "Başlangıç ve bitiş tarihi olan projeler burada görünür.");
  document.getElementById("ganttBoard").innerHTML = html;
  document.getElementById("fullGanttBoard").innerHTML = html;
}

function ganttRow(project) {
  const dates = state.projects.flatMap((item) => [new Date(item.startDate), new Date(item.endDate)]).filter((date) => !Number.isNaN(date.getTime()));
  const min = Math.min(...dates.map((date) => date.getTime()));
  const max = Math.max(...dates.map((date) => date.getTime()));
  const start = new Date(project.startDate).getTime();
  const end = new Date(project.endDate).getTime();
  const span = Math.max(1, max - min);
  const left = ((start - min) / span) * 100;
  const width = Math.max(4, ((end - start) / span) * 100);
  return `
    <div class="gantt-row">
      <div class="gantt-label" title="${escapeHtml(project.name)}">${escapeHtml(project.name)}</div>
      <div class="gantt-track"><div class="gantt-bar" style="left:${left}%;width:${width}%"></div></div>
    </div>
  `;
}

function renderCalendar() {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  const days = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const blanks = (start.getDay() + 6) % 7;
  const cells = [];
  for (let i = 0; i < blanks; i += 1) cells.push("<div></div>");
  for (let day = 1; day <= days; day += 1) {
    const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const reportCount = state.reports.filter((report) => report.date === date).length;
    const projectStarts = state.projects.filter((project) => project.startDate === date).length;
    const label = [reportCount ? `${reportCount} rapor` : "", projectStarts ? `${projectStarts} başlangıç` : ""].filter(Boolean).join(" / ");
    cells.push(`<div class="day"><strong>${day}</strong>${label ? `<span>${label}</span>` : ""}</div>`);
  }
  document.getElementById("calendarGrid").innerHTML = cells.join("");
}

async function syncRecord(table, record) {
  if (!settings.apiUrl) return;
  try {
    const result = await apiRequest({ action: "upsert", table, record });
    if (table === "documents" && result.record?.fileUrl) {
      const index = state.documents.findIndex((item) => item.id === record.id);
      if (index >= 0) state.documents[index] = { ...state.documents[index], fileUrl: result.record.fileUrl, fileData: "" };
      saveState();
      renderTables();
    }
    toast("Google Sheets ile senkronize edildi.");
  } catch (error) {
    document.getElementById("syncDot").className = "sync-dot error";
    toast(`Senkron hatası: ${error.message}`);
  }
}

async function syncFromRemote() {
  if (!settings.apiUrl) {
    renderSyncState();
    return;
  }
  try {
    const data = await apiRequest({ action: "list" });
    state = { ...emptyState(), ...data.tables };
    saveState();
    render();
    toast("Google Sheets verileri alındı.");
  } catch (error) {
    document.getElementById("syncDot").className = "sync-dot error";
    toast(`Veri alınamadı: ${error.message}`);
  }
}

async function apiRequest(payload) {
  const response = await fetch(settings.apiUrl, {
    method: "POST",
    body: JSON.stringify({
      ...payload,
      user: { email: settings.userEmail, role: settings.role },
      spreadsheetId: CONFIG.spreadsheetId,
      driveFolderId: CONFIG.driveFolderId,
    }),
  });
  const result = await response.json();
  if (!result.ok) throw new Error(result.error || "Bilinmeyen hata");
  return result;
}

function projectName(id) {
  return state.projects.find((project) => project.id === id)?.name || "-";
}

function siteName(id) {
  return state.sites.find((site) => site.id === id)?.name || "-";
}

function formatCurrency(value) {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(value);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function toast(message) {
  const element = document.getElementById("toast");
  element.textContent = message;
  element.classList.add("show");
  clearTimeout(toast.timeout);
  toast.timeout = setTimeout(() => element.classList.remove("show"), 3000);
}
