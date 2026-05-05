from pathlib import Path


def read(path):
    return Path(path).read_text()


def write(path, text):
    Path(path).write_text(text)


def replace(text, old, new):
    if old not in text:
        raise SystemExit(f"Pattern not found:\n{old[:240]}")
    return text.replace(old, new, 1)


def insert_before(text, marker, addition):
    if addition.strip() in text:
        return text
    return replace(text, marker, addition + marker)


def patch_app():
    path = "assets/scripts/app.js"
    text = read(path)

    text = replace(text, '  orders: "som_orders",\n  session: "som_session"', '  orders: "som_orders",\n  tasks: "som_tasks",\n  documents: "som_documents",\n  session: "som_session"')
    text = replace(text, '  orders: loadJson(STORAGE_KEYS.orders, [])\n};', '  orders: loadJson(STORAGE_KEYS.orders, []),\n  tasks: loadJson(STORAGE_KEYS.tasks, []),\n  documents: loadJson(STORAGE_KEYS.documents, [])\n};')
    text = replace(text, '  projects: ["Şantiyeler", "Projeleri ve kullanıcıları yönetin, proje bazlı toplu özetleri görün."],\n  records:', '  projects: ["Şantiyeler", "Projeleri ve kullanıcıları yönetin, proje bazlı toplu özetleri görün."],\n  calendar: ["Takvim", "Şantiye görevlerini tarihe, projeye ve kişiye göre planlayın."],\n  documents: ["Evraklar", "Şantiyelere ait evrak linklerini ve notlarını tek merkezde tutun."],\n  records:')
    text = replace(text, '  orderForm: document.getElementById("order-form"),\n  orderProject:', '  orderForm: document.getElementById("order-form"),\n  orderId: document.getElementById("order-id"),\n  orderProject:')
    text = replace(text, '  ordersPdfBtn: document.getElementById("orders-pdf-btn"),\n  projectForm:', '  ordersPdfBtn: document.getElementById("orders-pdf-btn"),\n  orderSubmitBtn: document.getElementById("order-submit-btn"),\n  orderCancelEditBtn: document.getElementById("order-cancel-edit-btn"),\n  projectForm:')
    text = replace(text, '  projectDetailBrief: document.getElementById("project-detail-brief"),\n  projectCostChart:', '  projectDetailBrief: document.getElementById("project-detail-brief"),\n  projectProgressStrip: document.getElementById("project-progress-strip"),\n  projectCostChart:')
    text = replace(text, '  projectDetailPuantaj: document.getElementById("project-detail-puantaj"),\n  recordTypeFilter:', '  projectDetailPuantaj: document.getElementById("project-detail-puantaj"),\n  projectDetailDocuments: document.getElementById("project-detail-documents"),\n  projectDetailTasks: document.getElementById("project-detail-tasks"),\n  taskForm: document.getElementById("task-form"),\n  taskProject: document.getElementById("task-project"),\n  taskAssignee: document.getElementById("task-assignee"),\n  taskRecords: document.getElementById("task-records"),\n  calendarGrid: document.getElementById("calendar-grid"),\n  notificationBtn: document.getElementById("notification-btn"),\n  documentForm: document.getElementById("document-form"),\n  documentProject: document.getElementById("document-project"),\n  documentRecords: document.getElementById("document-records"),\n  recordTypeFilter:')
    text = replace(text, '  els.orderForm.addEventListener("submit", onSaveOrder);\n  els.projectForm.addEventListener("submit", onSaveProject);', '  els.orderForm.addEventListener("submit", onSaveOrder);\n  els.orderForm.addEventListener("reset", () => window.setTimeout(clearOrderEditState, 0));\n  els.orderCancelEditBtn.addEventListener("click", resetOrderForm);\n  els.projectForm.addEventListener("submit", onSaveProject);')
    text = replace(text, '  els.userForm.addEventListener("submit", onSaveUser);\n  els.projectFilterBtn', '  els.userForm.addEventListener("submit", onSaveUser);\n  els.taskForm.addEventListener("submit", onSaveTask);\n  els.documentForm.addEventListener("submit", onSaveDocument);\n  els.notificationBtn.addEventListener("click", requestNotifications);\n  els.projectFilterBtn')
    text = replace(text, '  renderProjectManagement();\n  renderRecords();', '  renderProjectManagement();\n  renderCalendar();\n  renderDocuments();\n  renderRecords();')
    text = replace(text, '[els.reportProject, els.orderProject].forEach((select) => {', '[els.reportProject, els.orderProject, els.taskProject, els.documentProject].forEach((select) => {')
    text = replace(text, '  els.recordProjectFilter.innerHTML = filterOptions;\n}', '  els.recordProjectFilter.innerHTML = filterOptions;\n\n  els.taskAssignee.innerHTML = state.users.length\n    ? state.users.map((user) => `<option value="${user.id}">${escapeHtml(user.name || user.username)}</option>`).join("")\n    : \'<option value="">Önce kullanıcı ekleyin</option>\';\n  els.taskAssignee.disabled = state.users.length === 0;\n}')
    text = replace(text, '      <div class="record-footer">\n        <button class="btn btn-secondary" type="button" onclick="window.__somPdf.exportOrder', '      <div class="record-footer">\n        <button class="btn btn-secondary" type="button" onclick="window.__somActions.editOrder(\'${item.id}\')">Düzenle</button>\n        <button class="btn btn-secondary" type="button" onclick="window.__somPdf.exportOrder')

    start = text.index("async function onSaveOrder(event) {")
    end = text.index("async function onSaveProject(event) {", start)
    text = text[:start] + '''async function onSaveOrder(event) {
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

''' + text[end:]

    text = replace(text, '    els.projectDetailBrief.textContent = "Önce bir proje ekleyin ya da listeden bir şantiye seçin.";\n    els.projectCostChart', '    els.projectDetailBrief.textContent = "Önce bir proje ekleyin ya da listeden bir şantiye seçin.";\n    els.projectProgressStrip.innerHTML = "";\n    els.projectCostChart')
    text = replace(text, '    els.projectDetailPuantaj.innerHTML = "";\n    return;', '    els.projectDetailPuantaj.innerHTML = "";\n    els.projectDetailDocuments.innerHTML = "";\n    els.projectDetailTasks.innerHTML = "";\n    return;')
    text = replace(text, '  els.projectDetailBrief.textContent = buildProjectBrief(project, detail);\n\n  els.projectCostChart', '  els.projectDetailBrief.textContent = buildProjectBrief(project, detail);\n  els.projectProgressStrip.innerHTML = renderProjectProgress(project, detail);\n\n  els.projectCostChart')
    text = replace(text, '  els.projectDetailPuantaj.innerHTML = detail.puantaj.length\n    ? detail.puantaj.map(renderPuantajRecord).join("")\n    : emptyState("Bu projeye ait puantaj yok.");\n}', '  els.projectDetailPuantaj.innerHTML = detail.puantaj.length\n    ? detail.puantaj.map(renderPuantajRecord).join("")\n    : emptyState("Bu projeye ait puantaj yok.");\n  els.projectDetailDocuments.innerHTML = detail.documents.length\n    ? detail.documents.map(renderDocumentCard).join("")\n    : emptyState("Bu projeye ait evrak yok.");\n  els.projectDetailTasks.innerHTML = detail.tasks.length\n    ? detail.tasks.map(renderTaskCard).join("")\n    : emptyState("Bu projeye ait görev yok.");\n}')
    text = replace(text, '  const puantaj = state.puantaj.filter((entry) => inRange(entry.date) && entry.workers.some((worker) => worker.projectId === projectId)).sort((a, b) => b.date.localeCompare(a.date));\n  const concreteCost', '  const puantaj = state.puantaj.filter((entry) => inRange(entry.date) && entry.workers.some((worker) => worker.projectId === projectId)).sort((a, b) => b.date.localeCompare(a.date));\n  const documents = state.documents.filter((item) => item.projectId === projectId).sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));\n  const tasks = state.tasks.filter((item) => item.projectId === projectId && inRange(item.dueDate)).sort((a, b) => a.dueDate.localeCompare(b.dueDate));\n  const concreteCost')
    text = replace(text, '    puantaj,\n    concreteCost,', '    puantaj,\n    documents,\n    tasks,\n    concreteCost,')
    text = replace(text, '    activityTotal: reports.length + orders.length + puantaj.length', '    activityTotal: reports.length + orders.length + puantaj.length + documents.length + tasks.length')

    feature_block = r'''
function renderProjectProgress(project, detail) {
  const today = todayStr();
  const start = project?.startDate || "";
  const end = project?.endDate || "";
  const elapsedPercent = projectDateProgress(start, end, today);
  const budgetPercent = detail.budgetUsage || 0;
  const openTasks = detail.tasks.filter((task) => task.status !== "Tamamlandı").length;
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
      <span>Açık Görev</span>
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
  if (!title) return showToast("Görev başlığı gerekli.");
  const payload = {
    id: String(form.get("id") || "") || crypto.randomUUID(),
    projectId: form.get("projectId"),
    title,
    assignedToId: form.get("assignedToId"),
    dueDate: form.get("dueDate") || todayStr(),
    status: form.get("status") || "Planlandı",
    note: form.get("note") || "",
    createdById: state.currentUser.id,
    createdAt: new Date().toISOString()
  };
  const remoteSaved = await sendToApi("saveTask", payload);
  state.tasks.push(payload);
  persist(STORAGE_KEYS.tasks, state.tasks);
  renderAll();
  els.taskForm.reset();
  showToast(remoteSaved ? "Görev kaydedildi." : "Görev yerelde kaydedildi.");
}

function renderCalendar() {
  if (!els.calendarGrid) return;
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const blanks = (first.getDay() + 6) % 7;
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
        <strong>${day}</strong>
        ${dayTasks.slice(0, 3).map((task) => `<span>${escapeHtml(task.title)}</span>`).join("")}
      </div>
    `);
  }
  els.calendarGrid.innerHTML = cells.join("");
  els.taskRecords.innerHTML = state.tasks.length
    ? state.tasks.slice().sort((a, b) => a.dueDate.localeCompare(b.dueDate)).map(renderTaskCard).join("")
    : emptyState("Henüz görev yok.");
  notifyDueTasks();
}

function renderTaskCard(task) {
  return `
    <article class="record-card">
      <div class="record-title">
        <strong>${escapeHtml(task.title)}</strong>
        <span class="tag">${escapeHtml(task.status || "Planlandı")}</span>
      </div>
      <div class="record-meta">${escapeHtml(projectName(task.projectId))} · ${escapeHtml(task.dueDate || "-")} · ${escapeHtml(userName(task.assignedToId))}</div>
      <div class="record-meta">${escapeHtml(task.note || "-")}</div>
    </article>
  `;
}

async function onSaveDocument(event) {
  event.preventDefault();
  if (!requireAuth() || !requireProjects()) return;
  const form = new FormData(els.documentForm);
  const title = String(form.get("title") || "").trim();
  if (!title) return showToast("Evrak adı gerekli.");
  const payload = {
    id: crypto.randomUUID(),
    projectId: form.get("projectId"),
    title,
    type: form.get("type") || "",
    url: form.get("url") || "",
    note: form.get("note") || "",
    createdById: state.currentUser.id,
    createdAt: new Date().toISOString()
  };
  const remoteSaved = await sendToApi("saveDocument", payload);
  state.documents.push(payload);
  persist(STORAGE_KEYS.documents, state.documents);
  renderAll();
  els.documentForm.reset();
  showToast(remoteSaved ? "Evrak kaydedildi." : "Evrak yerelde kaydedildi.");
}

function renderDocuments() {
  if (!els.documentRecords) return;
  els.documentRecords.innerHTML = state.documents.length
    ? state.documents.slice().sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")).map(renderDocumentCard).join("")
    : emptyState("Henüz evrak kaydı yok.");
}

function renderDocumentCard(item) {
  const link = item.url ? `<a class="btn btn-secondary" href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">Aç</a>` : "";
  return `
    <article class="record-card">
      <div class="record-title">
        <strong>${escapeHtml(item.title)}</strong>
        <span class="tag">${escapeHtml(item.type || "Evrak")}</span>
      </div>
      <div class="record-meta">${escapeHtml(projectName(item.projectId))} · ${escapeHtml(formatDateTime(item.createdAt))}</div>
      <div class="record-meta">${escapeHtml(item.note || "-")}</div>
      <div class="record-footer">${link}</div>
    </article>
  `;
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
  new Notification("Şantiye görev hatırlatması", {
    body: `${dueTasks.length} açık görev bugün veya geçmiş tarihte bekliyor.`
  });
  localStorage.setItem(key, "1");
}

'''
    text = insert_before(text, "function exportAllJson() {", feature_block)
    text = replace(text, '    orders: state.orders\n  };', '    orders: state.orders,\n    tasks: state.tasks,\n    documents: state.documents\n  };')
    text = replace(text, '    state.orders = payload.orders || state.orders;\n    persist(STORAGE_KEYS.projects', '    state.orders = payload.orders || state.orders;\n    state.tasks = payload.tasks || state.tasks;\n    state.documents = payload.documents || state.documents;\n    persist(STORAGE_KEYS.projects')
    text = replace(text, '    persist(STORAGE_KEYS.orders, state.orders);\n    state.apiHealth', '    persist(STORAGE_KEYS.orders, state.orders);\n    persist(STORAGE_KEYS.tasks, state.tasks);\n    persist(STORAGE_KEYS.documents, state.documents);\n    state.apiHealth')
    text = replace(text, 'window.__somPdf = {\n  exportReport: exportReportPdf,\n  exportPuantaj: exportPuantajPdf,\n  exportOrder: exportOrderPdf\n};\n\nfunction kpiCard', 'window.__somPdf = {\n  exportReport: exportReportPdf,\n  exportPuantaj: exportPuantajPdf,\n  exportOrder: exportOrderPdf\n};\n\nwindow.__somActions = {\n  editOrder\n};\n\nfunction kpiCard')
    write(path, text)


def patch_html():
    path = "index.html"
    text = read(path)
    text = replace(text, '        <button class="nav-item" data-view="projects">Şantiyeler</button>\n        <button class="nav-item" data-view="records">', '        <button class="nav-item" data-view="projects">Şantiyeler</button>\n        <button class="nav-item" data-view="calendar">Takvim</button>\n        <button class="nav-item" data-view="documents">Evraklar</button>\n        <button class="nav-item" data-view="records">')
    text = replace(text, '          <form id="order-form" class="panel-body form-grid">\n            <div class="form-row cols-3">', '          <form id="order-form" class="panel-body form-grid">\n            <input type="hidden" id="order-id" name="id">\n            <div class="form-row cols-3">')
    text = replace(text, '              <button type="reset" class="btn btn-secondary">Temizle</button>\n              <button type="submit" class="btn btn-primary">Siparişi Kaydet</button>', '              <button type="reset" class="btn btn-secondary">Temizle</button>\n              <button type="button" class="btn btn-secondary hidden" id="order-cancel-edit-btn">Düzenlemeyi İptal Et</button>\n              <button type="submit" class="btn btn-primary" id="order-submit-btn">Siparişi Kaydet</button>')
    text = replace(text, '            <div class="info-card" id="project-detail-brief">\n              Seçilen proje için özet bilgi burada görünür.\n            </div>\n            <div class="panel-grid two-up">', '            <div class="info-card" id="project-detail-brief">\n              Seçilen proje için özet bilgi burada görünür.\n            </div>\n            <div class="project-progress-strip" id="project-progress-strip"></div>\n            <div class="panel-grid two-up">')
    text = replace(text, '            <section>\n              <h3 class="section-title">Puantaj</h3>\n              <div class="records-list" id="project-detail-puantaj"></div>\n            </section>\n          </div>\n        </div>\n      </section>\n\n      <section class="view" id="view-records">', '''            <section>
              <h3 class="section-title">Puantaj</h3>
              <div class="records-list" id="project-detail-puantaj"></div>
            </section>
            <div class="panel-grid two-up">
              <section><h3 class="section-title">Evraklar</h3><div class="records-list" id="project-detail-documents"></div></section>
              <section><h3 class="section-title">Yaklaşan Görevler</h3><div class="records-list" id="project-detail-tasks"></div></section>
            </div>
          </div>
        </div>
      </section>

      <section class="view" id="view-calendar">
        <div class="panel-grid two-up">
          <div class="panel"><div class="panel-header"><div><div class="eyebrow">Planlama</div><h2>Takvim / Görev Ata</h2></div><div class="header-actions"><button class="btn btn-secondary" type="button" id="notification-btn">Bildirim Aç</button></div></div>
            <form id="task-form" class="panel-body form-grid"><input type="hidden" id="task-id" name="id"><div class="form-row cols-2"><label class="field"><span>Proje</span><select id="task-project" name="projectId"></select></label><label class="field"><span>Atanacak Kişi</span><select id="task-assignee" name="assignedToId"></select></label></div><div class="form-row cols-2"><label class="field"><span>Görev</span><input type="text" id="task-title" name="title" placeholder="Beton dökümü takibi"></label><label class="field"><span>Tarih</span><input type="date" id="task-date" name="dueDate"></label></div><div class="form-row cols-2"><label class="field"><span>Durum</span><select id="task-status" name="status"><option value="Planlandı">Planlandı</option><option value="Devam Ediyor">Devam Ediyor</option><option value="Tamamlandı">Tamamlandı</option><option value="Ertelendi">Ertelendi</option></select></label><label class="field"><span>Not</span><input type="text" id="task-note" name="note" placeholder="Kısa görev notu"></label></div><div class="form-actions"><button type="reset" class="btn btn-secondary">Temizle</button><button type="submit" class="btn btn-primary">Görevi Kaydet</button></div></form>
          </div>
          <div class="panel"><div class="panel-header"><div><div class="eyebrow">Bu Ay</div><h2>Takvim</h2></div></div><div class="panel-body"><div class="calendar-grid" id="calendar-grid"></div></div></div>
        </div>
        <div class="panel" style="margin-top: 16px;"><div class="panel-header"><div><div class="eyebrow">Görevler</div><h2>Takvim Kayıtları</h2></div></div><div class="panel-body"><div class="records-list" id="task-records"></div></div></div>
      </section>

      <section class="view" id="view-documents">
        <div class="panel"><div class="panel-header"><div><div class="eyebrow">Evrak Merkezi</div><h2>Şantiye Evrakları</h2></div></div><form id="document-form" class="panel-body form-grid"><div class="form-row cols-3"><label class="field"><span>Proje</span><select id="document-project" name="projectId"></select></label><label class="field"><span>Evrak Adı</span><input type="text" id="document-title" name="title" placeholder="Ruhsat, irsaliye, sözleşme..."></label><label class="field"><span>Tür</span><input type="text" id="document-type" name="type" placeholder="Ruhsat / İrsaliye / Fotoğraf"></label></div><label class="field"><span>Link</span><input type="url" id="document-url" name="url" placeholder="Google Drive / PDF / görsel linki"></label><label class="field"><span>Not</span><textarea id="document-note" name="note" rows="3" placeholder="Evrakla ilgili kısa açıklama"></textarea></label><div class="form-actions"><button type="reset" class="btn btn-secondary">Temizle</button><button type="submit" class="btn btn-primary">Evrakı Kaydet</button></div></form></div>
        <div class="panel" style="margin-top: 16px;"><div class="panel-header"><div><div class="eyebrow">Arşiv</div><h2>Kayıtlı Evraklar</h2></div></div><div class="panel-body"><div class="records-list" id="document-records"></div></div></div>
      </section>

      <section class="view" id="view-records">''')
    write(path, text)


def patch_css():
    path = "assets/styles/main.css"
    text = read(path)
    block = '''
.project-progress-strip { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
.progress-metric { border: 1px solid var(--border); border-radius: 14px; padding: 14px; background: rgba(255, 255, 255, 0.04); display: grid; gap: 8px; }
.progress-metric span, .progress-metric small { color: var(--text-muted); }
.progress-metric strong { font-size: 24px; }
.calendar-grid { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 8px; }
.calendar-head, .calendar-cell { border: 1px solid var(--border); border-radius: 12px; min-height: 70px; padding: 10px; }
.calendar-head { min-height: auto; color: var(--text-muted); text-align: center; font-weight: 800; }
.calendar-cell { display: grid; align-content: start; gap: 6px; background: rgba(255, 255, 255, 0.035); }
.calendar-cell.today { border-color: var(--accent-2); }
.calendar-cell.muted { opacity: 0.35; }
.calendar-cell span { display: block; border-radius: 999px; padding: 3px 7px; background: rgba(237, 28, 36, 0.18); color: var(--text); font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

'''
    text = insert_before(text, ".chart-row {", block)
    text = replace(text, '  .records-grid {\n    grid-template-columns: 1fr;\n  }\n}', '  .records-grid {\n    grid-template-columns: 1fr;\n  }\n\n  .project-progress-strip,\n  .calendar-grid {\n    grid-template-columns: 1fr;\n  }\n}')
    write(path, text)


def patch_apps_script():
    path = "google-apps-script.gs"
    text = read(path)
    text = replace(text, '  workers: "Workers",\n  orders: "Orders"\n};', '''  workers: "Workers",
  orders: "Orders",
  tasks: "Tasks",
  documents: "Documents"
};
const HEADERS = {
  Projects: ["id", "name", "location", "startDate", "endDate", "budget"],
  Users: ["id", "name", "username", "passwordHash", "role", "active"],
  Reports: ["id", "projectId", "date", "workingHours", "workSummary", "nextPlan", "incident", "notes", "createdById", "createdAt"],
  Puantaj: ["id", "date", "chiefId", "createdById", "createdAt"],
  Workers: ["puantajId", "name", "projectId", "job", "status"],
  Orders: ["id", "projectId", "date", "material", "spec", "quantity", "unit", "supplier", "unitPrice", "total", "priceSource", "orderedById", "status", "note", "createdAt"],
  Tasks: ["id", "projectId", "title", "assignedToId", "dueDate", "status", "note", "createdById", "createdAt"],
  Documents: ["id", "projectId", "title", "type", "url", "note", "createdById", "createdAt"]
};''')
    text = replace(text, '      puantaj: readPuantaj(),\n      orders: readOrders()', '      puantaj: readPuantaj(),\n      orders: readOrders(),\n      tasks: readTasks(),\n      documents: readDocuments()')
    text = replace(text, '    if (action === "saveOrder") {\n      saveOrder(payload);\n      return jsonOutput({ ok: true });\n    }\n\n    if (action === "saveProject")', '''    if (action === "saveOrder") {
      saveOrder(payload);
      return jsonOutput({ ok: true });
    }

    if (action === "updateOrder") { updateOrder(payload); return jsonOutput({ ok: true }); }
    if (action === "saveTask") { saveTask(payload); return jsonOutput({ ok: true }); }
    if (action === "saveDocument") { saveDocument(payload); return jsonOutput({ ok: true }); }

    if (action === "saveProject")''')
    text = insert_before(text, "function saveReport(payload) {", '''function readTasks() { const rows = getSheetValues_(SHEETS.tasks); return rows.map(function(row) { return { id: row[0] || "", projectId: row[1] || "", title: row[2] || "", assignedToId: row[3] || "", dueDate: normalizeDate_(row[4]), status: row[5] || "", note: row[6] || "", createdById: row[7] || "", createdAt: row[8] || "" }; }).filter(function(item) { return item.id; }); }
function readDocuments() { const rows = getSheetValues_(SHEETS.documents); return rows.map(function(row) { return { id: row[0] || "", projectId: row[1] || "", title: row[2] || "", type: row[3] || "", url: row[4] || "", note: row[5] || "", createdById: row[6] || "", createdAt: row[7] || "" }; }).filter(function(item) { return item.id; }); }

''')
    text = insert_before(text, "function saveProject(payload) {", '''function updateOrder(payload) { const sheet = getSheet_(SHEETS.orders); const rowIndex = findRowIndexById_(sheet, payload.id); if (!rowIndex) { saveOrder(payload); return; } sheet.getRange(rowIndex, 1, 1, 15).setValues([[payload.id || "", payload.projectId || "", payload.date || "", payload.material || "", payload.spec || "", payload.quantity || 0, payload.unit || "", payload.supplier || "", payload.unitPrice || 0, payload.total || 0, payload.priceSource || "", payload.orderedById || "", payload.status || "", payload.note || "", payload.createdAt || new Date().toISOString()]]); }
function saveTask(payload) { getSheet_(SHEETS.tasks).appendRow([payload.id || Utilities.getUuid(), payload.projectId || "", payload.title || "", payload.assignedToId || "", payload.dueDate || "", payload.status || "Planlandı", payload.note || "", payload.createdById || "", payload.createdAt || new Date().toISOString()]); }
function saveDocument(payload) { getSheet_(SHEETS.documents).appendRow([payload.id || Utilities.getUuid(), payload.projectId || "", payload.title || "", payload.type || "", payload.url || "", payload.note || "", payload.createdById || "", payload.createdAt || new Date().toISOString()]); }

''')
    text = replace(text, '  const sheet = ss.getSheetByName(sheetName);\n  if (!sheet) throw new Error("Sheet not found: " + sheetName);\n  return sheet;', '  let sheet = ss.getSheetByName(sheetName);\n  if (!sheet) { sheet = ss.insertSheet(sheetName); }\n  if (sheet.getLastRow() === 0 && HEADERS[sheetName]) { sheet.appendRow(HEADERS[sheetName]); }\n  return sheet;')
    text = insert_before(text, "function isAuthorized_(token) {", '''function findRowIndexById_(sheet, id) { if (!id) return 0; const lastRow = sheet.getLastRow(); if (lastRow < 2) return 0; const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues(); for (var i = 0; i < ids.length; i += 1) { if (String(ids[i][0]) === String(id)) return i + 2; } return 0; }

''')
    write(path, text)


def patch_docs():
    setup = read("GOOGLE_SHEETS_SETUP.md")
    setup = replace(setup, "6. `Orders`\n", "6. `Orders`\n7. `Tasks`\n8. `Documents`\n")
    setup = insert_before(setup, "## Apps Script Kurulumu", '''### `Tasks`

1. `id`
2. `projectId`
3. `title`
4. `assignedToId`
5. `dueDate`
6. `status`
7. `note`
8. `createdById`
9. `createdAt`

### `Documents`

1. `id`
2. `projectId`
3. `title`
4. `type`
5. `url`
6. `note`
7. `createdById`
8. `createdAt`

''')
    write("GOOGLE_SHEETS_SETUP.md", setup)

    readme = read("README.md")
    readme = replace(readme, "- Puantaj girisi\n- Kayit listeleme", "- Puantaj girisi\n- Takvim ve gorev atama\n- Santiye evrak linkleri\n- Kayit listeleme")
    readme = replace(readme, '    "orders": []', '    "orders": [],\n    "tasks": [],\n    "documents": []')
    readme = replace(readme, "- `Orders`\n", "- `Orders`\n- `Tasks`\n- `Documents`\n")
    write("README.md", readme)


patch_app()
patch_html()
patch_css()
patch_apps_script()
patch_docs()

for path in [".github/workflows/codex-planning-patch.yml", ".github/scripts/codex_patch_planning.py", ".codex-planning-patch-trigger"]:
    Path(path).unlink(missing_ok=True)
