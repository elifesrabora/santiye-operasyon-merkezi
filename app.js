const CONFIG = {
  spreadsheetId: "1brBxxE6agOvAhTSp26nkN7NrtoWRyQygce5sRcE3ZyI",
  driveFolderId: "1kay5Ri3t_vLbRMuG22_tXslRsmwk4lg4",
  defaultApiUrl: "https://script.google.com/macros/s/AKfycbyr8CyvG1ubgI9xUCR9esVIf7GLoSBFBtfXZCN3fNXB94QsvThEx6MX0qjVeO4nFZB3jw/exec",
  storageKey: "santiye-operasyon-data-v1",
  settingsKey: "santiye-operasyon-settings-v1",
};

const ORDER_UNITS = {
  Beton: "m³",
  Demir: "kg",
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

const DEFAULT_CREWS = [
  "Elektrik tesisatı",
  "Sıhhi tesisat",
  "Parke ekibi",
  "Seramik ekibi",
  "Elektrik montaj ekibi",
  "Kaba inşaat ekibi",
  "Sıva ekibi",
  "Boya ekibi",
  "Temizlik ekibi",
  "Asansör ekibi",
];

const TABLES = {
  projects: ["name", "client", "location", "startDate", "endDate", "budget", "status", "notes"],
  sites: ["projectId", "name", "location", "manager", "status"],
  tasks: ["projectId", "siteId", "title", "assignedTo", "dueDate", "status", "notes"],
  calendarEvents: ["projectId", "siteId", "date", "title", "status", "notes"],
  reports: ["projectId", "siteId", "date", "workingHours", "workDone", "nextPlan", "incident", "notes", "attachmentName", "attachmentUrl"],
  payments: ["projectId", "period", "amount", "status", "notes"],
  personnel: ["projectId", "siteId", "date", "personType", "name", "job", "attendance"],
  materials: ["projectId", "siteId", "date", "name", "deliveryNo", "concreteClass", "diameter", "pourArea", "quantity", "unit", "company", "contact", "status", "notes"],
  documents: ["projectId", "siteId", "date", "title", "type", "fileName", "fileUrl", "mimeType", "notes"],
  users: ["name", "username", "email", "role", "status", "permissions"],
};

const TABLE_LABELS = {
  projects: ["Proje", "İşveren", "Konum", "Başlangıç", "Bitiş", "Bütçe", "Durum", "Not"],
  sites: ["Proje", "Şantiye", "Konum", "Şef", "Durum"],
  tasks: ["Proje", "Şantiye", "Görev", "Atanan", "Termin", "Durum", "Not"],
  calendarEvents: ["Proje", "Şantiye", "Tarih", "İş", "Durum", "Not"],
  reports: ["Proje", "Şantiye", "Tarih", "Saat", "Yapılan işler", "Sonraki plan", "Olay", "Not", "Ek", "Bağlantı"],
  payments: ["Proje", "Dönem", "Tutar", "Durum", "Not"],
  personnel: ["Proje", "Şantiye", "Tarih", "Tip", "İsim", "Meslek/Ekip", "Durum"],
  materials: ["Proje", "Şantiye", "Tarih", "Tür", "İrsaliye", "Beton sınıfı", "Çap", "Dökülecek alan", "Miktar", "Birim", "Firma", "Yetkili", "Durum", "Not"],
  documents: ["Proje", "Şantiye", "Tarih", "Başlık", "Tür", "Dosya", "Bağlantı", "Mime", "Açıklama"],
  users: ["Ad", "Kullanıcı", "E-posta", "Rol", "Durum", "İzinler"],
};

let state = loadState();
let settings = loadSettings();
let calendarCursor = new Date();
let calendarView = "week";
let selectedSiteId = "";
let personnelMode = "Sigortalı";
let materialMode = "Beton";
let orderListMode = "Beton";

document.addEventListener("DOMContentLoaded", () => {
  setupEntryPanels();
  bindNavigation();
  bindEntryTabs();
  bindForms();
  bindTableActions();
  bindOrderControls();
  bindPersonnelControls();
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
      if (button.dataset.view === "sites") {
        renderSiteTabs();
        renderSiteDetail();
      }
    });
  });

  document.getElementById("refreshBtn").addEventListener("click", syncFromRemote);
  document.getElementById("exportPdfBtn").addEventListener("click", () => window.print());
  document.getElementById("projectFilter").addEventListener("change", render);
}

function setupEntryPanels() {
  const moves = [
    ['form[data-form="sites"]', "entry-site"],
    ['form[data-form="reports"]', "entry-report"],
    ['form[data-form="materials"]', "entry-order-main"],
    ['form[data-form="otherMaterials"]', "entry-order-other"],
    ['form[data-form="personnel"]', "entry-personnel"],
    ['form[data-form="documents"]', "entry-document"],
    ['form[data-form="users"]', "entry-user"],
  ];
  moves.forEach(([selector, targetId]) => {
    const form = document.querySelector(selector);
    const target = document.getElementById(targetId);
    if (form && target) target.appendChild(form);
  });
  document.querySelectorAll(".entry-source").forEach((source) => {
    if (!source.closest("#materials")) source.remove();
  });
  const orderPanel = document.getElementById("entry-order");
  if (orderPanel && !orderPanel.querySelector("[data-entry-order-mode]")) {
    orderPanel.insertAdjacentHTML("afterbegin", `
      <div class="entry-order-tabs">
        <button class="active" type="button" data-entry-order-mode="Beton">Beton</button>
        <button type="button" data-entry-order-mode="Demir">Demir</button>
        <button type="button" data-entry-order-mode="Diğer">Diğer</button>
      </div>
    `);
  }
}

function bindEntryTabs() {
  document.querySelectorAll("[data-entry-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll("[data-entry-tab]").forEach((item) => item.classList.remove("active"));
      document.querySelectorAll(".entry-panel").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      document.getElementById(`entry-${button.dataset.entryTab}`)?.classList.add("active");
    });
  });
  document.querySelectorAll("[data-entry-order-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll("[data-entry-order-mode]").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      const mode = button.dataset.entryOrderMode;
      document.getElementById("entry-order-main").classList.toggle("hidden", mode === "Diğer");
      document.getElementById("entry-order-other").classList.toggle("hidden", mode !== "Diğer");
      if (mode !== "Diğer") {
        materialMode = mode;
        resetOrderForm();
      } else {
        resetOtherOrderForm();
      }
    });
  });
  document.getElementById("entry-order-other")?.classList.add("hidden");
}

function bindCalendarControls() {
  document.getElementById("calendarPrevBtn").addEventListener("click", () => {
    calendarCursor = calendarView === "week" ? addDays(calendarCursor, -7) : new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() - 1, 1);
    renderCalendar();
  });
  document.getElementById("calendarNextBtn").addEventListener("click", () => {
    calendarCursor = calendarView === "week" ? addDays(calendarCursor, 7) : new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() + 1, 1);
    renderCalendar();
  });
  document.getElementById("calendarTodayBtn").addEventListener("click", () => {
    calendarCursor = new Date();
    renderCalendar();
  });
  document.getElementById("calendarWeekViewBtn").addEventListener("click", () => {
    calendarView = "week";
    renderCalendar();
  });
  document.getElementById("calendarMonthViewBtn").addEventListener("click", () => {
    calendarView = "month";
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
      if (table === "otherMaterials") {
        const editId = form.dataset.editId;
        const records = formToOtherMaterialRecords(form, editId);
        if (!records.length) {
          toast("Diğer sipariş için en az bir malzeme ve miktar gir.");
          return;
        }
        records.forEach((item) => {
          const existingIndex = state.materials.findIndex((record) => record.id === item.id);
          if (existingIndex >= 0) {
            item.createdAt = state.materials[existingIndex].createdAt;
            item.createdBy = state.materials[existingIndex].createdBy;
            state.materials[existingIndex] = item;
          } else {
            state.materials.push(item);
          }
          syncRecord("materials", item);
        });
        saveState();
        render();
        form.reset();
        clearFormEditMode(form);
        resetOtherOrderForm();
        setDefaultDates();
        toast(editId ? "Diğer sipariş güncellendi." : "Diğer sipariş eklendi.");
        return;
      }
      if (table === "materials") {
        const editId = form.dataset.editId;
        const records = formToMaterialRecords(form, editId);
        if (!records.length) {
          toast("Sipariş için en az bir miktar gir.");
          return;
        }
        records.forEach((item) => {
          const existingIndex = state.materials.findIndex((record) => record.id === item.id);
          if (existingIndex >= 0) {
            item.createdAt = state.materials[existingIndex].createdAt;
            item.createdBy = state.materials[existingIndex].createdBy;
            state.materials[existingIndex] = item;
          } else {
            state.materials.push(item);
          }
          syncRecord("materials", item);
        });
        saveState();
        render();
        form.reset();
        clearFormEditMode(form);
        resetOrderForm();
        setDefaultDates();
        toast(editId ? "Sipariş güncellendi." : "Sipariş eklendi.");
        return;
      }
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
      } else if (table === "personnel") {
        const existingIndex = findPersonnelIndex(item.name, item.date, item.personType, item.siteId);
        if (existingIndex >= 0) {
          item.id = state.personnel[existingIndex].id;
          item.createdAt = state.personnel[existingIndex].createdAt;
          item.createdBy = state.personnel[existingIndex].createdBy;
          state.personnel[existingIndex] = item;
        } else {
          state[table].push(item);
        }
      } else {
        state[table].push(item);
      }
      if (table === "documents" && item.siteId) selectedSiteId = item.siteId;
      if (table === "sites") selectedSiteId = item.id;
      saveState();
      render();
      form.reset();
      if (table === "sites") {
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

    const removeRebarLineButton = event.target.closest("[data-remove-rebar-line]");
    if (removeRebarLineButton) {
      removeRebarLineButton.closest(".rebar-line")?.remove();
      return;
    }

    const removeOtherOrderLineButton = event.target.closest("[data-remove-other-order-line]");
    if (removeOtherOrderLineButton) {
      removeOtherOrderLineButton.closest(".other-order-line")?.remove();
      return;
    }

    const openSiteButton = event.target.closest("[data-open-site]");
    if (openSiteButton) {
      selectedSiteId = openSiteButton.dataset.openSite;
      renderSiteTabs();
      renderSiteDetail();
      document.getElementById("siteDetailPanel").scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    const siteTabButton = event.target.closest("[data-site-tab]");
    if (siteTabButton) {
      selectedSiteId = siteTabButton.dataset.siteTab;
      renderSiteTabs();
      renderSiteDetail();
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

    const calendarStatusButton = event.target.closest("[data-calendar-status]");
    if (calendarStatusButton) {
      updateCalendarEventStatus(calendarStatusButton.dataset.calendarEventId, calendarStatusButton.dataset.calendarStatus);
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
  onClick("concreteOrderBtn", () => {
    orderListMode = "Beton";
    renderMaterials();
  });
  onClick("rebarOrderBtn", () => {
    orderListMode = "Demir";
    renderMaterials();
  });
  onClick("otherOrderBtn", () => {
    orderListMode = "Diğer";
    renderMaterials();
  });
  onChange("orderSiteFilter", renderMaterials);
  onClick("addRebarLineBtn", () => addRebarLine());
  onClick("orderStatusButtons", (event) => {
    const button = event.target.closest("[data-form-status]");
    if (!button) return;
    setOrderFormStatus(button.dataset.formStatus);
  });
  onChange("otherOrderSiteFilter", renderOtherMaterials);
  onClick("addOtherOrderLineBtn", () => addOtherOrderLine());
  onClick("otherOrderStatusButtons", (event) => {
    const button = event.target.closest("[data-other-form-status]");
    if (!button) return;
    setOtherOrderFormStatus(button.dataset.otherFormStatus);
  });
}

function onClick(id, handler) {
  const element = document.getElementById(id);
  if (element) element.addEventListener("click", handler);
}

function onChange(id, handler) {
  const element = document.getElementById(id);
  if (element) element.addEventListener("change", handler);
}

function bindPersonnelControls() {
  const personnelSiteFilter = document.getElementById("personnelSiteFilter");
  const personnelFormSite = document.querySelector('form[data-form="personnel"] select[name="siteId"]');
  document.getElementById("insuredModeBtn").addEventListener("click", () => {
    personnelMode = "Sigortalı";
    renderPersonnel();
  });
  document.getElementById("crewModeBtn").addEventListener("click", () => {
    personnelMode = "Ekip";
    renderPersonnel();
  });
  document.getElementById("personnelMatrix").addEventListener("click", (event) => {
    const button = event.target.closest("[data-attendance-cell]");
    if (!button) return;
    updatePersonnelAttendance(button.dataset.name, button.dataset.date);
  });
  personnelSiteFilter.addEventListener("change", () => {
    if (personnelFormSite) personnelFormSite.value = personnelSiteFilter.value;
    renderPersonnel();
  });
  personnelFormSite?.addEventListener("change", () => {
    personnelSiteFilter.value = personnelFormSite.value;
    renderPersonnel();
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
  const today = localDateString(new Date());
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

  if (table === "personnel") {
    record.personType = personnelMode;
    if (record.siteId) record.projectId = state.sites.find((site) => site.id === record.siteId)?.projectId || record.projectId;
    if (personnelMode === "Ekip" && !record.job) record.job = "Ekip";
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
    if (record.siteId) {
      record.projectId = state.sites.find((site) => site.id === record.siteId)?.projectId || record.projectId;
    }
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
  renderSiteTabs();
  renderMaterials();
  renderOtherMaterials();
  renderPersonnel();
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
    const emptyLabel = select.id === "calendarSiteFilter" || select.id === "orderSiteFilter" || select.id === "otherOrderSiteFilter" ? "Tüm şantiyeler" : "Şantiye seç";
    select.innerHTML = `<option value="">${emptyLabel}</option>${options}`;
    select.value = current;
  });
  syncPersonnelSiteSelection();
}

function renderMetrics() {
  const today = localDateString(new Date());
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
    if (table === "materials") return;
    const target = document.getElementById(`${table}Table`);
    if (!target) return;
    target.innerHTML = tableMarkup(table, filtered(table));
    const count = document.getElementById(`${singular(table)}Count`);
    if (count) count.textContent = `${filtered(table).length} kayıt`;
  });
}

function renderSiteTabs() {
  const target = document.getElementById("siteTabs");
  if (!target) return;
  if (!selectedSiteId && state.sites.length) selectedSiteId = state.sites[0].id;
  target.innerHTML = state.sites.length
    ? state.sites.map((site) => `<button class="${site.id === selectedSiteId ? "active" : ""}" type="button" data-site-tab="${escapeHtml(site.id)}">${escapeHtml(site.name)}</button>`).join("")
    : `<div class="empty-state">Henüz kayıtlı şantiye yok. Kayıt Giriş bölümünden şantiye ekleyebilirsin.</div>`;
}

function renderMaterials() {
  const form = document.querySelector('form[data-form="materials"]');
  const table = document.getElementById("materialsTable");
  if (!form || !table) return;
  const isConcrete = materialMode === "Beton";
  const siteFilter = document.getElementById("orderSiteFilter");
  const rows = materialRows();

  document.getElementById("concreteOrderBtn").classList.toggle("active", orderListMode === "Beton");
  document.getElementById("rebarOrderBtn").classList.toggle("active", orderListMode === "Demir");
  document.getElementById("otherOrderBtn").classList.toggle("active", orderListMode === "Diğer");
  document.querySelectorAll(".concrete-field").forEach((item) => item.classList.toggle("hidden", !isConcrete));
  document.querySelectorAll(".rebar-field").forEach((item) => item.classList.toggle("hidden", isConcrete));
  form.elements.namedItem("name").value = materialMode;
  form.elements.namedItem("unit").value = ORDER_UNITS[materialMode];
  form.elements.namedItem("unit").setAttribute("value", ORDER_UNITS[materialMode]);
  document.getElementById("orderFormTitle").textContent = `${materialMode} Siparişi ${form.dataset.editId ? "Düzenle" : "Ekle"}`;
  document.getElementById("orderSubmitBtn").textContent = `${materialMode} Siparişini ${form.dataset.editId ? "Güncelle" : "Kaydet"}`;
  document.getElementById("orderTableTitle").textContent = `${orderListMode} Sipariş Tablosu`;
  document.getElementById("materialCount").textContent = `${rows.length} kayıt`;
  table.innerHTML = tableMarkup("materials", rows);

  const selectedSite = form.elements.namedItem("siteId").value || siteFilter.value;
  if (selectedSite) {
    form.elements.namedItem("siteId").value = selectedSite;
    const site = state.sites.find((item) => item.id === selectedSite);
    if (site) form.elements.namedItem("projectId").value = site.projectId || "";
  }
}

function renderOtherMaterials() {
  const form = document.querySelector('form[data-form="otherMaterials"]');
  const table = document.getElementById("otherMaterialsTable");
  if (!form || !table) return;
  const siteFilter = document.getElementById("otherOrderSiteFilter");
  const rows = otherMaterialRows();
  document.getElementById("otherMaterialCount").textContent = `${rows.length} kayıt`;
  table.innerHTML = tableMarkup("materials", rows);

  const selectedSite = form.elements.namedItem("siteId").value || siteFilter.value;
  if (selectedSite) {
    form.elements.namedItem("siteId").value = selectedSite;
    const site = state.sites.find((item) => item.id === selectedSite);
    if (site) form.elements.namedItem("projectId").value = site.projectId || "";
  }
}

function materialRows() {
  const siteId = document.getElementById("orderSiteFilter")?.value || "";
  return filtered("materials").filter((item) => {
    const itemName = item.name || "";
    const typeMatches = orderListMode === "Diğer" ? isOtherMaterial(item) : itemName === orderListMode;
    return typeMatches && (!siteId || item.siteId === siteId);
  });
}

function otherMaterialRows() {
  const siteId = document.getElementById("otherOrderSiteFilter")?.value || "";
  return filtered("materials").filter((item) => isOtherMaterial(item) && (!siteId || item.siteId === siteId));
}

function isOtherMaterial(item) {
  return item.name !== "Beton" && item.name !== "Demir";
}

function formToMaterialRecords(form, editId) {
  const formData = new FormData(form);
  const siteId = formData.get("siteId")?.toString().trim() || "";
  const site = state.sites.find((item) => item.id === siteId);
  const base = {
    createdAt: new Date().toISOString(),
    createdBy: settings.userEmail || "local",
    projectId: site?.projectId || formData.get("projectId")?.toString().trim() || "",
    siteId,
    date: formData.get("date")?.toString().trim() || "",
    name: materialMode,
    deliveryNo: formData.get("deliveryNo")?.toString().trim() || "",
    unit: ORDER_UNITS[materialMode],
    company: "",
    contact: "",
    status: formData.get("status")?.toString().trim() || "Sipariş verildi",
    notes: formData.get("notes")?.toString().trim() || "",
  };

  if (materialMode === "Beton") {
    return [{
      ...base,
      id: editId || crypto.randomUUID(),
      concreteClass: formData.get("concreteClass")?.toString().trim() || "",
      spec: formData.get("concreteClass")?.toString().trim() || "",
      pourArea: formData.get("pourArea")?.toString().trim() || "",
      quantity: formData.get("quantity")?.toString().trim() || "",
    }].filter((item) => item.quantity);
  }

  return Array.from(document.querySelectorAll("#rebarLines .rebar-line"))
    .map((line, index) => {
      const diameter = line.querySelector('[name="diameter"]')?.value.trim() || "";
      const quantity = line.querySelector('[name="rebarQuantity"]')?.value.trim() || "";
      return {
        ...base,
        id: editId && index === 0 ? editId : crypto.randomUUID(),
        diameter,
        spec: diameter,
        quantity,
      };
    })
    .filter((item) => item.diameter && item.quantity);
}

function formToOtherMaterialRecords(form, editId) {
  const formData = new FormData(form);
  const siteId = formData.get("siteId")?.toString().trim() || "";
  const site = state.sites.find((item) => item.id === siteId);
  const base = {
    createdAt: new Date().toISOString(),
    createdBy: settings.userEmail || "local",
    projectId: site?.projectId || formData.get("projectId")?.toString().trim() || "",
    siteId,
    date: formData.get("date")?.toString().trim() || "",
    deliveryNo: "",
    concreteClass: "",
    diameter: "",
    pourArea: "",
    company: formData.get("company")?.toString().trim() || "",
    contact: formData.get("contact")?.toString().trim() || "",
    status: formData.get("status")?.toString().trim() || "Sipariş verildi",
    notes: formData.get("notes")?.toString().trim() || "",
  };

  return Array.from(document.querySelectorAll("#otherOrderLines .other-order-line"))
    .map((line, index) => {
      const name = line.querySelector('[name="otherMaterialName"]')?.value.trim() || "";
      const quantity = line.querySelector('[name="otherQuantity"]')?.value.trim() || "";
      const unit = line.querySelector('[name="otherUnit"]')?.value.trim() || "";
      return {
        ...base,
        id: editId && index === 0 ? editId : crypto.randomUUID(),
        name,
        spec: name,
        quantity,
        unit,
      };
    })
    .filter((item) => item.name && item.quantity);
}

function addRebarLine(diameter = "", quantity = "") {
  const container = document.getElementById("rebarLines");
  const line = document.createElement("div");
  line.className = "rebar-line";
  line.innerHTML = `
    <label>Çap<input name="diameter" placeholder="Ø8, Ø10, Ø12" value="${escapeHtml(diameter)}" /></label>
    <label>Miktar<input name="rebarQuantity" type="number" min="0" step="0.01" value="${escapeHtml(quantity)}" /></label>
    <button class="secondary table-action" type="button" data-remove-rebar-line>Sil</button>
  `;
  container.appendChild(line);
}

function addOtherOrderLine(name = "", quantity = "", unit = "") {
  const container = document.getElementById("otherOrderLines");
  const line = document.createElement("div");
  line.className = "other-order-line";
  line.innerHTML = `
    <label>Malzeme türü<input name="otherMaterialName" value="${escapeHtml(name)}" /></label>
    <label>Miktar<input name="otherQuantity" type="number" min="0" step="0.01" value="${escapeHtml(quantity)}" /></label>
    <label>Birim<input name="otherUnit" placeholder="adet, m², paket" value="${escapeHtml(unit)}" /></label>
    <button class="secondary table-action" type="button" data-remove-other-order-line>Sil</button>
  `;
  container.appendChild(line);
}

function setOrderFormStatus(status) {
  const form = document.querySelector('form[data-form="materials"]');
  if (!form) return;
  form.elements.namedItem("status").value = status;
  document.querySelectorAll("[data-form-status]").forEach((button) => {
    button.classList.toggle("active-action", button.dataset.formStatus === status);
  });
}

function setOtherOrderFormStatus(status) {
  const form = document.querySelector('form[data-form="otherMaterials"]');
  if (!form) return;
  form.elements.namedItem("status").value = status;
  document.querySelectorAll("[data-other-form-status]").forEach((button) => {
    button.classList.toggle("active-action", button.dataset.otherFormStatus === status);
  });
}

function resetOrderForm() {
  const form = document.querySelector('form[data-form="materials"]');
  if (!form) return;
  form.elements.namedItem("name").value = materialMode;
  form.elements.namedItem("unit").value = ORDER_UNITS[materialMode];
  form.elements.namedItem("unit").setAttribute("value", ORDER_UNITS[materialMode]);
  document.getElementById("rebarLines").innerHTML = `
    <div class="rebar-line">
      <label>Çap<input name="diameter" placeholder="Ø8, Ø10, Ø12" /></label>
      <label>Miktar<input name="rebarQuantity" type="number" min="0" step="0.01" /></label>
    </div>
  `;
  setOrderFormStatus("Sipariş verildi");
  renderMaterials();
}

function resetOtherOrderForm() {
  const form = document.querySelector('form[data-form="otherMaterials"]');
  if (!form) return;
  document.getElementById("otherOrderLines").innerHTML = `
    <div class="other-order-line">
      <label>Malzeme türü<input name="otherMaterialName" required /></label>
      <label>Miktar<input name="otherQuantity" type="number" min="0" step="0.01" required /></label>
      <label>Birim<input name="otherUnit" placeholder="adet, m², paket" /></label>
    </div>
  `;
  setOtherOrderFormStatus("Sipariş verildi");
  renderOtherMaterials();
}


function renderPersonnel() {
  const matrix = document.getElementById("personnelMatrix");
  if (!matrix) return;
  syncPersonnelSiteSelection();
  const selectedSite = selectedPersonnelSiteId();
  const selectedSiteName = selectedSite ? siteName(selectedSite) : "Şantiye seç";
  const monthStart = new Date();
  const year = monthStart.getFullYear();
  const month = monthStart.getMonth();
  const days = new Date(year, month + 1, 0).getDate();
  const type = personnelMode;
  const records = state.personnel.filter((item) => personnelType(item) === type && item.siteId === selectedSite);
  const names = personnelNames(records, type);
  const header = Array.from({ length: days }, (_, index) => `<div class="personnel-head">${index + 1}</div>`).join("");
  const rows = names
    .map((name) => {
      const cells = Array.from({ length: days }, (_, index) => {
        const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(index + 1).padStart(2, "0")}`;
        const record = records.find((item) => item.name === name && item.date === date);
        const attendance = record?.attendance || "";
        return `<button class="attendance-cell ${attendanceClass(attendance)}" type="button" data-attendance-cell data-name="${escapeHtml(name)}" data-date="${date}" title="${escapeHtml(name)} - ${date}">${escapeHtml(attendanceLabel(attendance))}</button>`;
      }).join("");
      return `<div class="personnel-name">${escapeHtml(name)}</div>${cells}`;
    })
    .join("");

  document.getElementById("insuredModeBtn").classList.toggle("active", type === "Sigortalı");
  document.getElementById("crewModeBtn").classList.toggle("active", type === "Ekip");
  document.getElementById("personnelMatrixTitle").textContent = `${type === "Sigortalı" ? "Sigortalı Puantajı" : "Ekip Takibi"} - ${selectedSiteName}`;
  document.getElementById("personnelNameLabel").firstChild.textContent = type === "Sigortalı" ? "Personel adı" : "Ekip adı";
  const nameInput = document.getElementById("personnelNameInput");
  if (type === "Ekip") {
    nameInput.setAttribute("list", "crewNameOptions");
  } else {
    nameInput.removeAttribute("list");
  }
  document.getElementById("personnelCount").textContent = `${records.length} kayıt`;
  matrix.style.setProperty("--days", days);
  matrix.innerHTML = `
    <div class="personnel-corner">${new Intl.DateTimeFormat("tr-TR", { month: "long", year: "numeric" }).format(monthStart)}</div>
    ${header}
    ${rows || `<div class="empty-state personnel-empty">${selectedSite ? `Bu şantiye için henüz ${type === "Sigortalı" ? "personel" : "ekip"} kaydı yok.` : "Puantaj için önce şantiye seç."}</div>`}
  `;
}

function syncPersonnelSiteSelection() {
  const personnelSiteFilter = document.getElementById("personnelSiteFilter");
  const personnelFormSite = document.querySelector('form[data-form="personnel"] select[name="siteId"]');
  const personnelFormProject = document.querySelector('form[data-form="personnel"] select[name="projectId"]');
  if (!personnelSiteFilter || !personnelFormSite) return;
  const fallbackSiteId = state.sites[0]?.id || "";
  const selected = personnelSiteFilter.value || personnelFormSite.value || fallbackSiteId;
  personnelSiteFilter.value = selected;
  personnelFormSite.value = selected;
  const site = state.sites.find((item) => item.id === selected);
  if (site && personnelFormProject) personnelFormProject.value = site.projectId || personnelFormProject.value;
}

function selectedPersonnelSiteId() {
  return document.getElementById("personnelSiteFilter")?.value || document.querySelector('form[data-form="personnel"] select[name="siteId"]')?.value || state.sites[0]?.id || "";
}

function personnelType(item) {
  return item.personType || "Sigortalı";
}

function personnelNames(records, type) {
  const names = [...new Set(records.map((item) => item.name).filter(Boolean))].sort((a, b) => a.localeCompare(b, "tr"));
  if (type === "Ekip") return [...new Set([...DEFAULT_CREWS, ...names])];
  return names;
}

function updatePersonnelAttendance(name, date) {
  const siteId = selectedPersonnelSiteId();
  if (!siteId) return;
  const projectId = state.sites.find((site) => site.id === siteId)?.projectId || document.querySelector('form[data-form="personnel"] select[name="projectId"]')?.value || "";
  const index = findPersonnelIndex(name, date, personnelMode, siteId);
  const next = nextAttendance(index >= 0 ? state.personnel[index].attendance : "");
  if (index >= 0) {
    state.personnel[index] = { ...state.personnel[index], attendance: next };
    syncRecord("personnel", state.personnel[index]);
  } else {
    const record = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      createdBy: settings.userEmail || "local",
      projectId,
      siteId,
      date,
      personType: personnelMode,
      name,
      job: personnelMode === "Ekip" ? "Ekip" : "",
      attendance: next,
    };
    state.personnel.push(record);
    syncRecord("personnel", record);
  }
  saveState();
  renderPersonnel();
}

function findPersonnelIndex(name, date, type, siteId) {
  return state.personnel.findIndex((item) => item.name === name && item.date === date && personnelType(item) === type && item.siteId === siteId);
}

function nextAttendance(current) {
  if (current === "Geldi") return "Gelmedi";
  if (current === "Gelmedi") return "";
  return "Geldi";
}

function attendanceClass(attendance) {
  return {
    Geldi: "present",
    Gelmedi: "absent",
    İzinli: "leave",
    Raporlu: "leave",
  }[attendance] || "";
}

function attendanceLabel(attendance) {
  return {
    Geldi: "G",
    Gelmedi: "Y",
    İzinli: "İ",
    Raporlu: "R",
  }[attendance] || "";
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
    const statuses = isOtherMaterial(row) ? ["Sipariş verildi", "Ertelendi", "Sevkiyatta", "Teslim alındı"] : ["Sipariş verildi", "Ertelendi", "Tamamlandı"];
    return `
      <div class="row-actions">
        ${statuses.map((status) => `
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
    ["reports", "Günlük Rapor"],
    ["materials:Beton", "Beton"],
    ["materials:Demir", "Demir"],
    ["materials:other", "Diğer Siparişler"],
    ["calendarEvents", "Takvim"],
    ["documents", "Evraklar"],
  ];
  const concreteTotal = materialTotal(site.id, "Beton");
  const rebarTotal = materialTotal(site.id, "Demir");

  panel.innerHTML = `
    <div class="panel-header">
      <div>
        <h2>${escapeHtml(site.name)}</h2>
        <span>${escapeHtml(site.location || "Konum girilmemiş")} · ${escapeHtml(site.status || "-")}</span>
      </div>
      <button class="secondary" type="button" data-edit-site="${escapeHtml(site.id)}">Şantiyeyi Düzenle</button>
    </div>
    <section class="site-info-box">
      <h3>Şantiye Bilgileri</h3>
      <div>
        <span><strong>Proje</strong>${escapeHtml(projectName(site.projectId))}</span>
        <span><strong>Konum</strong>${escapeHtml(site.location || "-")}</span>
        <span><strong>Şantiye şefi</strong>${escapeHtml(site.manager || "-")}</span>
        <span><strong>Durum</strong>${escapeHtml(site.status || "-")}</span>
      </div>
    </section>
    <div class="site-material-summary">
      <div class="summary-box">
        <span>Toplam Beton</span>
        <strong>${formatNumber(concreteTotal)} m³</strong>
      </div>
      <div class="summary-box">
        <span>Toplam Demir</span>
        <strong>${formatNumber(rebarTotal)} kg</strong>
      </div>
    </div>
    <div class="site-detail-grid">
      ${groups.map(([table, title]) => table.startsWith("materials:") ? siteDetailMaterialGroup(table.split(":")[1], title, site.id) : siteDetailGroup(table, title, site.id)).join("")}
    </div>
  `;
}

function materialTotal(siteId, type) {
  return state.materials
    .filter((item) => item.siteId === siteId && item.name === type)
    .reduce((sum, item) => sum + Number(item.quantity || 0), 0);
}

function siteDetailMaterialGroup(type, title, siteId) {
  const rows = state.materials.filter((item) => item.siteId === siteId && (type === "other" ? isOtherMaterial(item) : item.name === type));
  return siteDetailRows(`materials-${type}`, "materials", title, rows);
}

function siteDetailGroup(table, title, siteId) {
  const rows = state[table].filter((item) => item.siteId === siteId);
  return siteDetailRows(table, table, title, rows);
}

function siteDetailRows(groupId, table, title, rows) {
  const previewFields = siteDetailFields(table);
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
              <div class="related-actions">
                ${siteDetailLinks(table, row)}
                <button class="secondary table-action" type="button" data-edit-table="${escapeHtml(table)}" data-edit-record="${escapeHtml(row.id)}">Düzenle</button>
              </div>
            </div>
          `;
        })
        .join("")
    : `<div class="empty-state">Kayıt yok.</div>`;
  return `
    <section class="related-group">
      <button class="related-toggle" type="button" data-site-detail-toggle="${escapeHtml(groupId)}" aria-expanded="false">
        <span>${escapeHtml(title)}</span>
        <strong>${rows.length}</strong>
      </button>
      <div class="related-content hidden" id="site-detail-${escapeHtml(groupId)}">${list}</div>
    </section>
  `;
}

function siteDetailFields(table) {
  const preferred = {
    reports: ["date", "workDone", "attachmentName"],
    documents: ["date", "title", "type", "fileName"],
    tasks: ["title", "dueDate", "status", "notes"],
    calendarEvents: ["date", "title", "status", "notes"],
    personnel: ["date", "name", "job", "attendance"],
    materials: ["date", "deliveryNo", "name", "quantity", "status"],
  }[table];
  return preferred || TABLES[table].filter((field) => field !== "projectId" && field !== "siteId").slice(0, 4);
}

function siteDetailLinks(table, row) {
  const links = [];
  if (table === "reports" && row.attachmentUrl) {
    links.push(`<a class="secondary table-action action-link" href="${escapeHtml(row.attachmentUrl)}" target="_blank" rel="noreferrer">PDF Aç</a>`);
  }
  if (table === "documents" && row.fileUrl) {
    links.push(`<a class="secondary table-action action-link" href="${escapeHtml(row.fileUrl)}" target="_blank" rel="noreferrer">Dosyayı Aç</a>`);
  }
  return links.join("");
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
  if (table === "materials") {
    startMaterialEdit(id);
    return;
  }
  const record = state[table]?.find((item) => item.id === id);
  const form = document.querySelector(`form[data-form="${table}"]`);
  if (!record || !form) return;
  switchToView(viewForTable(table));
  activateEntryTab(entryTabForTable(table));
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

function startMaterialEdit(id) {
  const record = state.materials.find((item) => item.id === id);
  if (!record) return;
  if (isOtherMaterial(record)) {
    startOtherMaterialEdit(record);
    return;
  }
  const form = document.querySelector('form[data-form="materials"]');
  if (!form) return;
  switchToView("entries");
  activateEntryTab("order");
  materialMode = record.name === "Demir" ? "Demir" : "Beton";
  activateEntryOrderMode(materialMode);
  form.dataset.editId = id;
  resetOrderForm();
  Object.entries(record).forEach(([key, value]) => {
    const field = form.elements.namedItem(key);
    if (field && field.type !== "file") field.value = value || "";
  });
  if (materialMode === "Demir") {
    document.getElementById("rebarLines").innerHTML = "";
    addRebarLine(record.diameter || record.spec || "", record.quantity || "");
  }
  setOrderFormStatus(record.status || "Sipariş verildi");
  renderMaterials();
  form.scrollIntoView({ behavior: "smooth", block: "start" });
}

function startOtherMaterialEdit(record) {
  const form = document.querySelector('form[data-form="otherMaterials"]');
  if (!form) return;
  switchToView("entries");
  activateEntryTab("order");
  activateEntryOrderMode("Diğer");
  form.dataset.editId = record.id;
  resetOtherOrderForm();
  Object.entries(record).forEach(([key, value]) => {
    const field = form.elements.namedItem(key);
    if (field && field.type !== "file") field.value = value || "";
  });
  document.getElementById("otherOrderLines").innerHTML = "";
  addOtherOrderLine(record.name || "", record.quantity || "", record.unit || "");
  setOtherOrderFormStatus(record.status || "Sipariş verildi");
  renderOtherMaterials();
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

function activateEntryTab(tab) {
  if (!tab) return;
  document.querySelector(`[data-entry-tab="${tab}"]`)?.click();
}

function activateEntryOrderMode(mode) {
  document.querySelector(`[data-entry-order-mode="${mode}"]`)?.click();
}

function viewForTable(table) {
  return {
    reports: "entries",
    personnel: "entries",
    materials: "entries",
    documents: "entries",
    users: "entries",
    calendarEvents: "calendar",
  }[table] || "entries";
}

function entryTabForTable(table) {
  return {
    sites: "site",
    reports: "report",
    personnel: "personnel",
    documents: "document",
    users: "user",
    materials: "order",
  }[table] || "";
}

function startSiteEdit(id) {
  const site = state.sites.find((item) => item.id === id);
  if (!site) return;
  const form = document.querySelector('form[data-form="sites"]');
  switchToView("entries");
  activateEntryTab("site");
  form.dataset.editId = id;
  Object.entries(site).forEach(([key, value]) => {
    const field = form.elements.namedItem(key);
    if (field) field.value = value || "";
  });
  document.getElementById("siteFormTitle").textContent = "Şantiye Düzenle";
  document.getElementById("siteSubmitBtn").textContent = "Değişiklikleri Kaydet";
  document.getElementById("siteCancelEditBtn").classList.remove("hidden");
  form.scrollIntoView({ behavior: "smooth", block: "start" });
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

  const tomorrow = localDateString(addDays(new Date(), 1));
  const tomorrowEvents = state.calendarEvents
    .filter((item) => item.date === tomorrow && item.status !== "Tamamlandı")
    .sort((a, b) => siteName(a.siteId).localeCompare(siteName(b.siteId), "tr"));
  document.getElementById("tomorrowEvents").innerHTML = tomorrowEvents.length
    ? tomorrowEvents.map((item) => activityItem(`${siteName(item.siteId)} - ${item.status || "Planlandı"}`, item.title)).join("")
    : activityItem("Yarın için planlı iş yok", "Takvime eklenen ve yarına kalan işler burada görünür.");

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
  const selectedProjectId = document.getElementById("projectFilter").value;
  const selectedSiteId = document.getElementById("calendarSiteFilter").value;
  const events = state.calendarEvents
    .filter((item) => !selectedProjectId || item.projectId === selectedProjectId)
    .filter((item) => !selectedSiteId || item.siteId === selectedSiteId);

  document.getElementById("calendarGrid").className = calendarView === "week" ? "calendar-grid week-view" : "calendar-grid month-view";
  document.getElementById("calendarWeekViewBtn").classList.toggle("active", calendarView === "week");
  document.getElementById("calendarMonthViewBtn").classList.toggle("active", calendarView === "month");
  document.getElementById("calendarEventCount").textContent = `${events.length} planlı iş`;

  if (calendarView === "week") {
    renderWeekCalendar(events);
  } else {
    renderMonthCalendar(events);
  }
  renderUpcomingCalendarEvents(events);
}

function renderMonthCalendar(events) {
  const today = localDateString(new Date());
  const start = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth(), 1);
  const days = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() + 1, 0).getDate();
  const monthLabel = new Intl.DateTimeFormat("tr-TR", { month: "long", year: "numeric" }).format(start);
  const monthDays = Array.from({ length: days }, (_, index) => new Date(calendarCursor.getFullYear(), calendarCursor.getMonth(), index + 1));

  document.getElementById("calendarMonthTitle").textContent = monthLabel;
  renderCalendarMatrix(monthDays, events, today);
}

function renderWeekCalendar(events) {
  const today = localDateString(new Date());
  const weekStart = startOfWeek(calendarCursor);
  const weekDays = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const formatter = new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short" });
  const label = `${formatter.format(weekDays[0])} - ${formatter.format(weekDays[6])} ${weekDays[6].getFullYear()}`;

  document.getElementById("calendarMonthTitle").textContent = label;
  renderCalendarMatrix(weekDays, events, today);
}

function renderCalendarMatrix(days, events, today) {
  const sites = visibleCalendarSites(events);
  const formatter = new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short" });
  const weekdayFormatter = new Intl.DateTimeFormat("tr-TR", { weekday: "short" });
  const siteColumns = sites.map((site) => `<div class="calendar-matrix-head site-head">${escapeHtml(site.name)}</div>`).join("");
  const rows = days
    .map((date) => {
      const iso = localDateString(date);
      const dayLabel = `${weekdayFormatter.format(date)} ${formatter.format(date)}`;
      const cells = sites
        .map((site) => {
          const cellEvents = events.filter((item) => item.date === iso && item.siteId === site.id);
          return `
            <div class="calendar-matrix-cell">
              ${cellEvents.length ? cellEvents.map((item) => calendarEventButton(item)).join("") : `<span class="empty-cell">-</span>`}
            </div>
          `;
        })
        .join("");
      return `
        <div class="calendar-matrix-day ${iso === today ? "today" : ""}">
          <strong>${escapeHtml(dayLabel)}</strong>
        </div>
        ${cells}
      `;
    })
    .join("");

  document.getElementById("calendarGrid").style.setProperty("--site-columns", sites.length);
  document.getElementById("calendarGrid").innerHTML = `
    <div class="calendar-matrix-head day-head">Gün</div>
    ${siteColumns}
    ${rows}
  `;
}

function visibleCalendarSites(events) {
  const selectedSiteId = document.getElementById("calendarSiteFilter").value;
  const selectedProjectId = document.getElementById("projectFilter").value;
  const eventSiteIds = new Set(events.map((item) => item.siteId).filter(Boolean));
  const baseSites = state.sites
    .filter((site) => !selectedProjectId || site.projectId === selectedProjectId)
    .filter((site) => !selectedSiteId || site.id === selectedSiteId);
  return baseSites.length ? baseSites : state.sites.filter((site) => eventSiteIds.has(site.id));
}

function calendarEventButton(item) {
  const colors = siteColor(item.siteId);
  return `
    <button class="calendar-event status-${statusSlug(item.status)}" type="button" data-calendar-event="${escapeHtml(item.id)}" title="${escapeHtml(item.title)}" style="--site-color:${colors.color};--site-soft:${colors.soft};">
      <span>${escapeHtml(siteName(item.siteId))}</span>
      ${escapeHtml(item.title)}
    </button>
  `;
}

function renderUpcomingCalendarEvents(events) {
  const today = localDateString(new Date());
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
    <div class="modal-actions">
      ${["Planlandı", "Ertelendi", "Tamamlandı"].map((status) => `
        <button class="secondary table-action ${item.status === status ? "active-action" : ""}" type="button" data-calendar-event-id="${escapeHtml(item.id)}" data-calendar-status="${escapeHtml(status)}">${escapeHtml(status)}</button>
      `).join("")}
    </div>
  `;
  document.getElementById("eventModal").classList.remove("hidden");
}

function updateCalendarEventStatus(id, status) {
  const index = state.calendarEvents.findIndex((item) => item.id === id);
  if (index < 0) return;
  state.calendarEvents[index] = { ...state.calendarEvents[index], status };
  saveState();
  render();
  syncRecord("calendarEvents", state.calendarEvents[index]);
  showCalendarEvent(id);
  toast("Takvim işi güncellendi.");
}

function closeCalendarEvent() {
  document.getElementById("eventModal").classList.add("hidden");
}

function siteColor(siteId) {
  const palette = [
    ["#236c5b", "#e7f3ee"],
    ["#9a4f1f", "#fff0e1"],
    ["#365f9f", "#e8f0ff"],
    ["#7c5a12", "#fff7d8"],
    ["#8a3f68", "#fdebf5"],
    ["#4f6f2a", "#edf5df"],
    ["#5b557a", "#efedf8"],
  ];
  const index = Math.abs(hashString(siteId || "")) % palette.length;
  const [color, soft] = palette[index];
  return { color, soft };
}

function hashString(value) {
  return String(value).split("").reduce((hash, char) => ((hash << 5) - hash + char.charCodeAt(0)) | 0, 0);
}

function statusSlug(status) {
  return {
    "Planlandı": "planned",
    "Ertelendi": "delayed",
    "Tamamlandı": "done",
    "Devam ediyor": "active",
  }[status] || "planned";
}

function addDays(date, days) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function localDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfWeek(date) {
  const copy = new Date(date);
  const day = (copy.getDay() + 6) % 7;
  copy.setDate(copy.getDate() - day);
  copy.setHours(0, 0, 0, 0);
  return copy;
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
      renderSiteDetail();
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

function formatNumber(value) {
  return new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 }).format(value || 0);
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
