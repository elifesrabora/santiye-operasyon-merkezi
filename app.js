const CONFIG = {
  spreadsheetId: "1brBxxE6agOvAhTSp26nkN7NrtoWRyQygce5sRcE3ZyI",
  driveFolderId: "1kay5Ri3t_vLbRMuG22_tXslRsmwk4lg4",
  defaultApiUrl: "https://script.google.com/macros/s/AKfycbyr8CyvG1ubgI9xUCR9esVIf7GLoSBFBtfXZCN3fNXB94QsvThEx6MX0qjVeO4nFZB3jw/exec",
  storageKey: "santiye-operasyon-data-v1",
  settingsKey: "santiye-operasyon-settings-v1",
};

const ORDER_UNITS = {
  Beton: "m³",
  Demir: "ton",
  Parke: "m²",
  Seramik: "m²",
  Fayans: "m²",
  Kum: "ton",
  Çimento: "torba",
  Tuğla: "adet",
  Gazbeton: "adet",
  Alçı: "torba",
  Boya: "lt",
  Kablo: "metre",
  Boru: "metre",
  Kereste: "m³",
  Diğer: "adet",
};

const TABLES = {
  projects: ["name", "client", "location", "startDate", "endDate", "budget", "status", "notes"],
  sites: ["projectId", "name", "location", "manager", "status"],
  tasks: ["projectId", "siteId", "title", "assignedTo", "dueDate", "status", "notes"],
  calendarEvents: ["projectId", "siteId", "date", "title", "status", "notes"],
  reports: ["projectId", "siteId", "date", "workingHours", "workDone", "nextPlan", "incident", "notes", "attachmentName", "attachmentUrl"],
  payments: ["projectId", "period", "amount", "status", "notes"],
  personnel: ["projectId", "siteId", "date", "name", "job", "attendance"],
  materials: ["projectId", "siteId", "date", "name", "spec", "quantity", "unit", "supplier", "unitPrice", "total", "status", "notes"],
  documents: ["projectId", "siteId", "title", "type", "fileName", "fileUrl", "mimeType", "notes"],
  users: ["name", "username", "email", "role", "status", "permissions"],
};

const TABLE_LABELS = {
  projects: ["Proje", "İşveren", "Konum", "Başlangıç", "Bitiş", "Bütçe", "Durum", "Not"],
  sites: ["Proje", "Şantiye", "Konum", "Şef", "Durum"],
  tasks: ["Proje", "Şantiye", "Görev", "Atanan", "Termin", "Durum", "Not"],
  calendarEvents: ["Proje", "Şantiye", "Tarih", "İş", "Durum", "Not"],
  reports: ["Proje", "Şantiye", "Tarih", "Saat", "Yapılan işler", "Sonraki plan", "Olay", "Not", "Ek", "Bağlantı"],
  payments: ["Proje", "Dönem", "Tutar", "Durum", "Not"],
  personnel: ["Proje", "Şantiye", "Tarih", "Personel", "Meslek", "Durum"],
  materials: ["Proje", "Şantiye", "Tarih", "Sipariş cinsi", "Özellik", "Miktar", "Birim", "Tedarikçi", "Birim fiyat", "Toplam", "Durum", "Not"],
  documents: ["Proje", "Şantiye", "Başlık", "Tür", "Dosya", "Bağlantı", "Mime", "Açıklama"],
  users: ["Ad", "Kullanıcı", "E-posta", "Rol", "Durum", "İzinler"],
};

let state = loadState();
let settings = loadSettings();
let calendarCursor = new Date();
let selectedSiteId = "";

document.addEventListener("DOMContentLoaded", () => {
  bindNavigation();
  bindForms();
  bindTableActions();
  bindOrderControls();
  bindCalendarControls();
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

function bindCalendarControls() {
  document.getElementById("calendarPrevBtn").addEventListener("click", () => {
    calendarCursor = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() - 1, 1);
    renderCalendar();
  });
  document.getElementById("calendarNextBtn").addEventListener("click", () => {
    calendarCursor = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() + 1, 1);
    renderCalendar();
  });
  document.getElementById("calendarTodayBtn").addEventListener("click", () => {
    calendarCursor = new Date();
    renderCalendar();
  });
  document.getElementById("calendarSiteFilter").addEventListener("change", renderCalendar);
  document.getElementById("calendarGrid").addEventListener("click", (event) => {
    const button = event.target.closest("[data-calendar-event]");
    if (!button) return;
    showCalendarEvent(button.dataset.calendarEvent);
  });
  document.getElementById("eventModalClose").addEventListener("click", closeCalendarEvent);
  document.getElementById("eventModal").addEventListener("click", (event) => {
    if (event.target.id === "eventModal") closeCalendarEvent();
  });
}

function bindForms() {
  document.querySelectorAll("form[data-form]").forEach((form) => {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const table = form.dataset.form;
      const item = await formToRecord(form, table);
      const editId = form.dataset.editId;
      if (editId) {
        const existingIndex = state[table].findIndex((record) => record.id === editId);
        if (existingIndex >= 0) {
          item.id = editId;
          item.createdAt = state[table][existingIndex].createdAt;
          item.createdBy = state[table][existingIndex].createdBy;
          state[table][existingIndex] = item;
        }
      } else {
        state[table].push(item);
      }
      saveState();
      render();
      form.reset();
      if (table === "sites") {
        selectedSiteId = item.id;
        clearSiteEditMode();
      } else {
        clearFormEditMode(form);
      }
      setDefaultDates();
      toast(editId ? "Kayıt güncellendi." : "Kayıt eklendi.");
      syncRecord(table, item);
    });
  });
}

function bindTableActions() {
  document.addEventListener("click", (event) => {
    const orderStatusButton = event.target.closest("[data-order-status]");
    if (orderStatusButton) {
      updateOrderStatus(orderStatusButton.dataset.orderId, orderStatusButton.dataset.orderStatus);
      return;
    }

    const openSiteButton = event.target.closest("[data-open-site]");
    if (openSiteButton) {
      selectedSiteId = openSiteButton.dataset.openSite;
      renderSiteDetail();
      document.getElementById("siteDetailPanel").scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    const editRecordButton = event.target.closest("[data-edit-record]");
    if (editRecordButton) {
      startRecordEdit(editRecordButton.dataset.editTable, editRecordButton.dataset.editRecord);
      return;
    }

    const detailToggle = event.target.closest("[data-site-detail-toggle]");
    if (detailToggle) {
      toggleSiteDetailGroup(detailToggle.dataset.siteDetailToggle);
      return;
    }

    const editButton = event.target.closest("[data-edit-site]");
    if (!editButton) return;
    startSiteEdit(editButton.dataset.editSite);
  });

  document.getElementById("siteCancelEditBtn").addEventListener("click", () => {
    const form = document.querySelector('form[data-form="sites"]');
    form.reset();
    clearSiteEditMode();
    setDefaultDates();
  });
}

function bindOrderControls() {
  document.getElementById("orderTypeSelect").addEventListener("change", (event) => {
    const form = event.target.closest("form");
    const unit = ORDER_UNITS[event.target.value] || "";
    if (unit) form.elements.namedItem("unit").value = unit;
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
    if (field === "fileName" || field === "mimeType") continue;
    record[field] = formData.get(field)?.toString().trim() || "";
  }

  if (table === "reports") {
    const file = formData.get("attachmentFile");
    if (file && file.size) {
      record.attachmentName = record.attachmentName || file.name;
      record.mimeType = file.type;
      record.fileName = file.name;
      record.fileData = await fileToBase64(file);
      record.attachmentUrl = record.attachmentUrl || "";
    }
    if (!record.workDone && record.attachmentName) {
      record.workDone = "Hazır PDF rapor yüklendi.";
    }
  }

  if (table === "materials" && !record.total && record.quantity && record.unitPrice) {
    record.total = String(Number(record.quantity) * Number(record.unitPrice));
  }

  if (table === "materials") {
    if (record.siteId) {
      record.projectId = state.sites.find((site) => site.id === record.siteId)?.projectId || record.projectId;
    }
    record.unit = record.unit || ORDER_UNITS[record.name] || "";
  }

  if (table === "calendarEvents" && record.siteId) {
    record.projectId = state.sites.find((site) => site.id === record.siteId)?.projectId || record.projectId;
  }

  if (table === "tasks" && record.siteId) {
    record.projectId = state.sites.find((site) => site.id === record.siteId)?.projectId || record.projectId;
  }

  if (table === "documents") {
    const file = formData.get("file");
    if (file && file.size) {
      record.fileName = file.name;
      record.mimeType = file.type;
      record.fileData = await fileToBase64(file);
      record.fileUrl = record.fileUrl || "";
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
  renderSiteDetail();
  renderActivity();
  renderGantt();
  renderCalendar();
}

function filtered(table) {
  const projectId = document.getElementById("projectFilter").value;
  if (!projectId || table === "projects" || table === "users") return state[table];
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
  document.querySelectorAll("[data-site-select], [data-calendar-site-select]").forEach((select) => {
    const current = select.value;
    const emptyLabel = select.id === "calendarSiteFilter" ? "Tüm şantiyeler" : "Şantiye seç";
    select.innerHTML = `<option value="">${emptyLabel}</option>${options}`;
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
    tasks: "task",
    calendarEvents: "calendarEvent",
    reports: "report",
    payments: "payment",
    personnel: "personnel",
    materials: "material",
    documents: "document",
    users: "user",
  }[table];
}

function tableMarkup(table, rows) {
  const labels = TABLE_LABELS[table];
  const fields = TABLES[table];
  const hasActions = table === "sites" || table === "materials";
  const head = `${labels.map((label) => `<th>${label}</th>`).join("")}${hasActions ? "<th>İşlem</th>" : ""}`;
  const body = rows.length
    ? rows
        .slice()
        .reverse()
        .map((row) => {
          const cells = fields.map((field) => `<td>${formatCell(table, field, row[field], row)}</td>`).join("");
          const actions = hasActions ? `<td>${tableActions(table, row)}</td>` : "";
          return `<tr>${cells}${actions}</tr>`;
        })
        .join("")
    : `<tr><td colspan="${fields.length + (hasActions ? 1 : 0)}">Henüz kayıt yok.</td></tr>`;
  return `<thead><tr>${head}</tr></thead><tbody>${body}</tbody>`;
}

function tableActions(table, row) {
  if (table === "sites") {
    return `<div class="row-actions"><button class="secondary table-action" type="button" data-open-site="${escapeHtml(row.id)}">Aç</button><button class="secondary table-action" type="button" data-edit-site="${escapeHtml(row.id)}">Düzenle</button></div>`;
  }
  if (table === "materials") {
    return `
      <div class="row-actions">
        ${["Sipariş verildi", "Sevkiyatta", "Teslim alındı"].map((status) => `
          <button class="secondary table-action ${row.status === status ? "active-action" : ""}" type="button" data-order-id="${escapeHtml(row.id)}" data-order-status="${escapeHtml(status)}">${escapeHtml(status)}</button>
        `).join("")}
        <button class="secondary table-action" type="button" data-edit-table="materials" data-edit-record="${escapeHtml(row.id)}">Düzenle</button>
      </div>
    `;
  }
  return "";
}

function updateOrderStatus(id, status) {
  const index = state.materials.findIndex((item) => item.id === id);
  if (index < 0) return;
  state.materials[index] = { ...state.materials[index], status };
  saveState();
  render();
  syncRecord("materials", state.materials[index]);
  toast("Sipariş durumu güncellendi.");
}

function renderSiteDetail() {
  const panel = document.getElementById("siteDetailPanel");
  if (!panel) return;
  const site = state.sites.find((item) => item.id === selectedSiteId);
  if (!site) {
    panel.innerHTML = `
      <div class="panel-header">
        <h2>Şantiye Detayı</h2>
        <span>Şantiye seç</span>
      </div>
      <div class="empty-state">Bir şantiyenin bağlı kayıtlarını görmek için Şantiyeler tablosundan <strong>Aç</strong> butonuna bas.</div>
    `;
    return;
  }

  const groups = [
    ["tasks", "Görevler"],
    ["calendarEvents", "Takvim İşleri"],
    ["reports", "Günlük Raporlar"],
    ["personnel", "Personel"],
    ["materials", "Siparişler"],
    ["documents", "Fotoğraf & PDF"],
  ];

  panel.innerHTML = `
    <div class="panel-header">
      <div>
        <h2>${escapeHtml(site.name)}</h2>
        <span>${escapeHtml(site.location || "Konum girilmemiş")} · ${escapeHtml(site.status || "-")}</span>
      </div>
      <button class="secondary" type="button" data-edit-site="${escapeHtml(site.id)}">Şantiyeyi Düzenle</button>
    </div>
    <div class="site-detail-grid">
      ${groups.map(([table, title]) => siteDetailGroup(table, title, site.id)).join("")}
    </div>
  `;
}

function siteDetailGroup(table, title, siteId) {
  const rows = state[table].filter((item) => item.siteId === siteId);
  const previewFields = TABLES[table].filter((field) => field !== "projectId" && field !== "siteId").slice(0, 4);
  const list = rows.length
    ? rows
        .slice()
        .reverse()
        .map((row) => {
          const summary = previewFields
            .map((field) => `<span><strong>${escapeHtml(fieldLabel(table, field))}</strong>${formatCell(table, field, row[field], row)}</span>`)
            .join("");
          return `
            <div class="related-item">
              <div>${summary}</div>
              <button class="secondary table-action" type="button" data-edit-table="${escapeHtml(table)}" data-edit-record="${escapeHtml(row.id)}">Düzenle</button>
            </div>
          `;
        })
        .join("")
    : `<div class="empty-state">Kayıt yok.</div>`;
  return `
    <section class="related-group">
      <button class="related-toggle" type="button" data-site-detail-toggle="${escapeHtml(table)}" aria-expanded="false">
        <span>${escapeHtml(title)}</span>
        <strong>${rows.length}</strong>
      </button>
      <div class="related-content hidden" id="site-detail-${escapeHtml(table)}">${list}</div>
    </section>
  `;
}

function toggleSiteDetailGroup(table) {
  const content = document.getElementById(`site-detail-${table}`);
  const button = document.querySelector(`[data-site-detail-toggle="${table}"]`);
  if (!content || !button) return;
  const willOpen = content.classList.contains("hidden");
  document.querySelectorAll(".related-content").forEach((item) => item.classList.add("hidden"));
  document.querySelectorAll("[data-site-detail-toggle]").forEach((item) => item.setAttribute("aria-expanded", "false"));
  if (willOpen) {
    content.classList.remove("hidden");
    button.setAttribute("aria-expanded", "true");
  }
}

function fieldLabel(table, field) {
  const index = TABLES[table].indexOf(field);
  return TABLE_LABELS[table][index] || field;
}

function startRecordEdit(table, id) {
  if (table === "sites") {
    startSiteEdit(id);
    return;
  }
  const record = state[table]?.find((item) => item.id === id);
  const form = document.querySelector(`form[data-form="${table}"]`);
  if (!record || !form) return;
  switchToView(viewForTable(table));
  form.dataset.editId = id;
  Object.entries(record).forEach(([key, value]) => {
    const field = form.elements.namedItem(key);
    if (field && field.type !== "file") field.value = value || "";
  });
  const submit = form.querySelector('button[type="submit"]');
  if (submit) {
    submit.dataset.defaultText = submit.dataset.defaultText || submit.textContent;
    submit.textContent = "Değişiklikleri Kaydet";
  }
  form.scrollIntoView({ behavior: "smooth", block: "start" });
}

function clearFormEditMode(form) {
  delete form.dataset.editId;
  const submit = form.querySelector('button[type="submit"]');
  if (submit?.dataset.defaultText) submit.textContent = submit.dataset.defaultText;
}

function switchToView(viewId) {
  const button = document.querySelector(`.nav-item[data-view="${viewId}"]`);
  const view = document.getElementById(viewId);
  if (!button || !view) return;
  document.querySelectorAll(".nav-item").forEach((item) => item.classList.remove("active"));
  document.querySelectorAll(".view").forEach((item) => item.classList.remove("active"));
  button.classList.add("active");
  view.classList.add("active");
  document.getElementById("pageTitle").textContent = button.textContent;
}

function viewForTable(table) {
  return {
    tasks: "tasks",
    calendarEvents: "calendar",
    reports: "reports",
    personnel: "personnel",
    materials: "materials",
    documents: "documents",
  }[table] || table;
}

function startSiteEdit(id) {
  const site = state.sites.find((item) => item.id === id);
  if (!site) return;
  const form = document.querySelector('form[data-form="sites"]');
  form.dataset.editId = id;
  Object.entries(site).forEach(([key, value]) => {
    const field = form.elements.namedItem(key);
    if (field) field.value = value || "";
  });
  document.getElementById("siteFormTitle").textContent = "Şantiye Düzenle";
  document.getElementById("siteSubmitBtn").textContent = "Değişiklikleri Kaydet";
  document.getElementById("siteCancelEditBtn").classList.remove("hidden");
  document.getElementById("sites").scrollIntoView({ behavior: "smooth", block: "start" });
}

function clearSiteEditMode() {
  const form = document.querySelector('form[data-form="sites"]');
  if (!form) return;
  delete form.dataset.editId;
  document.getElementById("siteFormTitle").textContent = "Şantiye Ekle";
  document.getElementById("siteSubmitBtn").textContent = "Şantiyeyi Kaydet";
  document.getElementById("siteCancelEditBtn").classList.add("hidden");
}

function formatCell(table, field, value, row) {
  if (field === "projectId") return escapeHtml(projectName(value));
  if (field === "siteId") return escapeHtml(siteName(value));
  if (field === "status" || field === "attendance") return `<span class="status">${escapeHtml(value || "-")}</span>`;
  if (field === "amount") return formatCurrency(Number(value || 0));
  if (field === "budget" || field === "unitPrice" || field === "total") return value ? formatCurrency(Number(value || 0)) : "-";
  if (field === "fileUrl" && row.fileUrl) return `<a href="${escapeHtml(row.fileUrl)}" target="_blank" rel="noreferrer">Aç</a>`;
  if (field === "fileUrl") return "-";
  if (field === "attachmentUrl" && row.attachmentUrl) return `<a href="${escapeHtml(row.attachmentUrl)}" target="_blank" rel="noreferrer">Aç</a>`;
  if (field === "attachmentUrl") return "-";
  return escapeHtml(value || "-");
}

function renderActivity() {
  const reports = filtered("reports").slice(-5).reverse();
  document.getElementById("recentReports").innerHTML = reports.length
    ? reports.map((report) => activityItem(`${projectName(report.projectId)} / ${siteName(report.siteId)}`, `${report.date} - ${report.workDone}`)).join("")
    : activityItem("Henüz rapor yok", "Günlük rapor eklediğinde burada görünür.");

  const alerts = filtered("materials").slice(-5).reverse();
  document.getElementById("materialAlerts").innerHTML = alerts.length
    ? alerts.map((item) => activityItem(`${siteName(item.siteId)} - ${item.name}`, `${item.quantity || 0} ${item.unit || ""} · ${item.status || "Sipariş verildi"}`)).join("")
    : activityItem("Sipariş yok", "Yeni sipariş eklediğinde burada görünür.");
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
  const selectedProjectId = document.getElementById("projectFilter").value;
  const selectedSiteId = document.getElementById("calendarSiteFilter").value;
  const start = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth(), 1);
  const days = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() + 1, 0).getDate();
  const blanks = (start.getDay() + 6) % 7;
  const monthLabel = new Intl.DateTimeFormat("tr-TR", { month: "long", year: "numeric" }).format(start);
  const events = state.calendarEvents
    .filter((item) => !selectedProjectId || item.projectId === selectedProjectId)
    .filter((item) => !selectedSiteId || item.siteId === selectedSiteId);
  const cells = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"].map((day) => `<div class="weekday">${day}</div>`);

  document.getElementById("calendarMonthTitle").textContent = monthLabel;
  document.getElementById("calendarEventCount").textContent = `${events.length} planlı iş`;

  for (let i = 0; i < blanks; i += 1) cells.push("<div></div>");
  for (let day = 1; day <= days; day += 1) {
    const date = `${calendarCursor.getFullYear()}-${String(calendarCursor.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const dayEvents = events.filter((item) => item.date === date);
    const isToday = date === today.toISOString().slice(0, 10);
    cells.push(`
      <div class="day ${isToday ? "today" : ""}">
        <strong>${day}</strong>
        <div class="day-events">
          ${dayEvents.map((item) => calendarEventButton(item)).join("")}
        </div>
      </div>
    `);
  }
  document.getElementById("calendarGrid").innerHTML = cells.join("");
  renderUpcomingCalendarEvents(events);
}

function calendarEventButton(item) {
  return `
    <button class="calendar-event" type="button" data-calendar-event="${escapeHtml(item.id)}" title="${escapeHtml(item.title)}">
      ${escapeHtml(siteName(item.siteId))}: ${escapeHtml(item.title)}
    </button>
  `;
}

function renderUpcomingCalendarEvents(events) {
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = events
    .filter((item) => item.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 8);
  document.getElementById("upcomingEvents").innerHTML = upcoming.length
    ? upcoming.map((item) => activityItem(`${item.date} - ${siteName(item.siteId)}`, item.title)).join("")
    : activityItem("Planlı iş yok", "Şantiye için yeni iş eklediğinde burada görünür.");
}

function showCalendarEvent(id) {
  const item = state.calendarEvents.find((event) => event.id === id);
  if (!item) return;
  document.getElementById("eventModalTitle").textContent = item.title || "Planlı iş";
  document.getElementById("eventModalBody").innerHTML = `
    <dl class="detail-list">
      <div><dt>Şantiye</dt><dd>${escapeHtml(siteName(item.siteId))}</dd></div>
      <div><dt>Proje</dt><dd>${escapeHtml(projectName(item.projectId))}</dd></div>
      <div><dt>Tarih</dt><dd>${escapeHtml(item.date || "-")}</dd></div>
      <div><dt>Durum</dt><dd>${escapeHtml(item.status || "-")}</dd></div>
      <div><dt>Not</dt><dd>${escapeHtml(item.notes || "-")}</dd></div>
    </dl>
  `;
  document.getElementById("eventModal").classList.remove("hidden");
}

function closeCalendarEvent() {
  document.getElementById("eventModal").classList.add("hidden");
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
    if (table === "reports" && result.record?.attachmentUrl) {
      const index = state.reports.findIndex((item) => item.id === record.id);
      if (index >= 0) state.reports[index] = { ...state.reports[index], attachmentUrl: result.record.attachmentUrl, fileData: "" };
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
