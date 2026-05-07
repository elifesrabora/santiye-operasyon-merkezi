const fs = require("fs");

function read(path) {
  return fs.readFileSync(path, "utf8");
}

function write(path, content) {
  fs.writeFileSync(path, content);
}

function replaceOnce(content, search, replacement, label) {
  if (!content.includes(search)) throw new Error(`Missing marker: ${label}`);
  return content.replace(search, replacement);
}

function replaceRegex(content, regex, replacement, label) {
  if (!regex.test(content)) throw new Error(`Missing pattern: ${label}`);
  return content.replace(regex, replacement);
}

function patchHtml() {
  let html = read("index.html");
  if (!html.includes('class="calendar-layout"')) {
    html = html.replace('<section><h3 class="section-title">Yaklaşan Görevler</h3><div class="records-list" id="project-detail-tasks"></div></section>', '<section><h3 class="section-title">Takvim İşleri</h3><div class="records-list" id="project-detail-tasks"></div></section>');
    html = replaceRegex(
      html,
      /<section class="view" id="view-calendar">[\s\S]*?<\/section>\n\n      <section class="view" id="view-documents">/,
      `<section class="view" id="view-calendar">
        <div class="calendar-layout">
          <div class="panel"><div class="panel-header"><div><div class="eyebrow">Planlama</div><h2>Takip Edilecek İş</h2></div><div class="header-actions"><button class="btn btn-secondary" type="button" id="notification-btn">Bildirim Aç</button></div></div>
            <form id="task-form" class="panel-body form-grid"><input type="hidden" id="task-id" name="id"><div class="form-row cols-2"><label class="field"><span>Proje</span><select id="task-project" name="projectId"></select></label><label class="field"><span>Bilgiyi Giren</span><input type="text" id="task-author-label" readonly placeholder="Oturumdaki kullanıcı"><select id="task-assignee" name="assignedToId" class="hidden"></select></label></div><div class="form-row cols-2"><label class="field"><span>Takip Edilecek İş</span><input type="text" id="task-title" name="title" placeholder="Beton dökümü, sevkiyat, kontrol..."></label><label class="field"><span>Tarih</span><input type="date" id="task-date" name="dueDate"></label></div><input type="hidden" id="task-status" name="status" value="Planlandı"><label class="field"><span>Bilgi / Not</span><textarea id="task-note" name="note" rows="4" placeholder="Takip edilecek işle ilgili bilgi"></textarea></label><div class="form-actions"><button type="reset" class="btn btn-secondary">Temizle</button><button type="submit" class="btn btn-primary">Takibe Ekle</button></div><div class="info-card hidden" id="whatsapp-links"></div></form>
          </div>
          <div class="panel"><div class="panel-header"><div><div class="eyebrow">Bu Ay</div><h2>Takvim</h2></div></div><div class="panel-body"><div class="calendar-grid" id="calendar-grid"></div></div></div>
        </div>
        <div class="panel" style="margin-top: 16px;"><div class="panel-header"><div><div class="eyebrow">İş Takibi</div><h2>Takvim Kayıtları</h2></div></div><div class="panel-body"><div class="records-list" id="task-records"></div></div></div>
      </section>

      <section class="view" id="view-documents">`,
      "calendar section"
    );
  }
  if (!html.includes('id="settings-whatsapp-numbers"')) {
    html = replaceOnce(
      html,
      '<label class="field">\n              <span>Drive / Sheet Notu</span>\n              <textarea name="sheetNote" id="settings-sheet-note" rows="4" placeholder="Bağlı sheet linki, tablo isimleri veya kurulum notları..."></textarea>\n            </label>',
      '<label class="field">\n              <span>Drive / Sheet Notu</span>\n              <textarea name="sheetNote" id="settings-sheet-note" rows="4" placeholder="Bağlı sheet linki, tablo isimleri veya kurulum notları..."></textarea>\n            </label>\n\n            <label class="field">\n              <span>WhatsApp Bildirim Numaraları</span>\n              <textarea name="whatsappNumbers" id="settings-whatsapp-numbers" rows="3" placeholder="905xxxxxxxxx, 905yyyyyyyyy"></textarea>\n            </label>',
      "whatsapp settings field"
    );
  }
  write("index.html", html);
}

function patchApp() {
  let js = read("assets/scripts/app.js");
  js = js.replace('sheetNote: "Ana Google Sheet: https://docs.google.com/spreadsheets/d/17WZGVKxZ2cfSxEGkLPRQazHNFU4iYBAqMDYy99ZfErM/edit?usp=sharing"\n};', 'sheetNote: "Ana Google Sheet: https://docs.google.com/spreadsheets/d/17WZGVKxZ2cfSxEGkLPRQazHNFU4iYBAqMDYy99ZfErM/edit?usp=sharing",\n  whatsappNumbers: ""\n};');
  js = js.replace('calendar: ["Takvim", "Şantiye görevlerini tarihe, projeye ve kişiye göre planlayın."]', 'calendar: ["Takvim", "Takip edilecek işleri tarihe, projeye ve bilgi girişine göre izleyin."]');
  if (!js.includes('taskAuthorLabel: document.getElementById("task-author-label")')) {
    js = replaceOnce(js, 'taskAssignee: document.getElementById("task-assignee"),\n  taskRecords:', 'taskAssignee: document.getElementById("task-assignee"),\n  taskAuthorLabel: document.getElementById("task-author-label"),\n  taskRecords:', "task author el");
  }
  if (!js.includes('whatsappLinks: document.getElementById("whatsapp-links")')) {
    js = replaceOnce(js, 'calendarGrid: document.getElementById("calendar-grid"),\n  notificationBtn:', 'calendarGrid: document.getElementById("calendar-grid"),\n  whatsappLinks: document.getElementById("whatsapp-links"),\n  notificationBtn:', "whatsapp links el");
  }
  if (!js.includes('settingsWhatsappNumbers: document.getElementById("settings-whatsapp-numbers")')) {
    js = replaceOnce(js, 'settingsSheetNote: document.getElementById("settings-sheet-note")', 'settingsSheetNote: document.getElementById("settings-sheet-note"),\n  settingsWhatsappNumbers: document.getElementById("settings-whatsapp-numbers")', "settings whatsapp el");
  }
  if (!js.includes("els.settingsWhatsappNumbers.value")) {
    js = replaceOnce(js, 'els.settingsSheetNote.value = state.settings.sheetNote;', 'els.settingsSheetNote.value = state.settings.sheetNote;\n  els.settingsWhatsappNumbers.value = state.settings.whatsappNumbers || "";', "hydrate whatsapp");
  }
  if (!js.includes("els.taskAuthorLabel.value")) {
    js = replaceOnce(js, 'els.orderByLabel.value = user?.name || "";', 'els.orderByLabel.value = user?.name || "";\n  els.taskAuthorLabel.value = user?.name || "";', "session task author");
  }
  js = replaceRegex(
    js,
    /async function onSaveTask\(event\) \{[\s\S]*?\n\}\n\nfunction renderCalendar\(\) \{/,
    `async function onSaveTask(event) {
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
  renderAll();
  els.taskForm.reset();
  renderWhatsappLinks(payload);
  showToast(remoteSaved ? "Takvim kaydı eklendi." : "Takvim kaydı yerelde tutuldu.");
}

function renderCalendar() {`,
    "onSaveTask"
  );
  js = replaceRegex(
    js,
    /function renderCalendar\(\) \{[\s\S]*?\n\}\n\nfunction renderTaskCard\(task\) \{/,
    `function renderCalendar() {
  if (!els.calendarGrid) return;
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const blanks = (first.getDay() + 6) % 7;
  const cells = [];
  ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"].forEach((day) => {
    cells.push(\`<div class="calendar-head">\${day}</div>\`);
  });
  for (let i = 0; i < blanks; i += 1) cells.push('<div class="calendar-cell muted"></div>');
  for (let day = 1; day <= last.getDate(); day += 1) {
    const date = \`\${year}-\${String(month + 1).padStart(2, "0")}-\${String(day).padStart(2, "0")}\`;
    const dayTasks = state.tasks.filter((task) => task.dueDate === date);
    cells.push(\`
      <div class="calendar-cell \${date === todayStr() ? "today" : ""}">
        <strong>\${day}</strong>
        \${dayTasks.slice(0, 4).map((task) => \`<span title="\${escapeHtml(task.title)}">\${escapeHtml(task.title)}</span>\`).join("")}
        \${dayTasks.length > 4 ? \`<em>+\${dayTasks.length - 4} kayıt</em>\` : ""}
      </div>
    \`);
  }
  els.calendarGrid.innerHTML = cells.join("");
  els.taskRecords.innerHTML = state.tasks.length
    ? state.tasks.slice().sort((a, b) => a.dueDate.localeCompare(b.dueDate)).map(renderTaskCard).join("")
    : emptyState("Henüz takvim kaydı yok.");
  notifyDueTasks();
}

function renderTaskCard(task) {`,
    "renderCalendar"
  );
  js = replaceRegex(
    js,
    /function renderTaskCard\(task\) \{[\s\S]*?\n\}\n\nasync function deleteDocument\(documentId\) \{/,
    `function renderTaskCard(task) {
  return \`
    <article class="record-card">
      <div class="record-title">
        <strong>\${escapeHtml(task.title)}</strong>
        <span class="tag">\${escapeHtml(task.dueDate || "-")}</span>
      </div>
      <div class="record-meta">\${escapeHtml(projectName(task.projectId))} · Giren: \${escapeHtml(userName(task.createdById || task.assignedToId))} · \${escapeHtml(formatDateTime(task.createdAt))}</div>
      <div class="record-meta">\${escapeHtml(task.note || "-")}</div>
    </article>
  \`;
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
  els.whatsappLinks.innerHTML = \`
    <strong>WhatsApp bildirimi hazır:</strong>
    <div class="whatsapp-link-list">
      \${numbers.map((number) => \`<a class="btn btn-secondary" href="https://wa.me/\${number}?text=\${encodeURIComponent(message)}" target="_blank" rel="noreferrer">Gönder: \${escapeHtml(number)}</a>\`).join("")}
    </div>
  \`;
}

function parseWhatsappNumbers(value) {
  return String(value || "")
    .split(/[\\s,;]+/)
    .map((item) => item.replace(/\\D/g, ""))
    .filter((item) => item.length >= 10);
}

function buildWhatsappMessage(task) {
  return [
    "Ayazlar Yapı Takvim Bildirimi",
    \`Proje: \${projectName(task.projectId)}\`,
    \`Tarih: \${task.dueDate || "-"}\`,
    \`Takip edilecek iş: \${task.title}\`,
    \`Bilgi: \${task.note || "-"}\`,
    \`Giren: \${userName(task.createdById)}\`,
    \`Kayıt zamanı: \${formatDateTime(task.createdAt)}\`
  ].join("\\n");
}

async function deleteDocument(documentId) {`,
    "task card and whatsapp"
  );
  js = js.replace('sheetNote: els.settingsSheetNote.value.trim()\n  };', 'sheetNote: els.settingsSheetNote.value.trim(),\n    whatsappNumbers: els.settingsWhatsappNumbers.value.trim()\n  };');
  js = js.replace('emptyState("Bu projeye ait görev yok.")', 'emptyState("Bu projeye ait takvim işi yok.")');
  js = js.replace('const openTasks = detail.tasks.filter((task) => task.status !== "Tamamlandı").length;', 'const openTasks = detail.tasks.length;');
  js = js.replace('<span>Açık Görev</span>', '<span>Takvim İşi</span>');
  js = js.replace('new Notification("Şantiye görev hatırlatması", {\n    body: `${dueTasks.length} açık görev bugün veya geçmiş tarihte bekliyor.`', 'new Notification("Şantiye iş takibi", {\n    body: `${dueTasks.length} takip edilecek iş bugün veya geçmiş tarihte bekliyor.`');
  write("assets/scripts/app.js", js);
}

function patchCss() {
  let css = read("assets/styles/main.css");
  if (!css.includes(".calendar-layout {")) {
    css = replaceOnce(css, ".panel-grid.two-up {\n  grid-template-columns: repeat(2, minmax(0, 1fr));\n}", ".panel-grid.two-up {\n  grid-template-columns: repeat(2, minmax(0, 1fr));\n}\n\n.calendar-layout {\n  display: grid;\n  grid-template-columns: minmax(280px, 0.85fr) minmax(620px, 1.65fr);\n  gap: 16px;\n  align-items: start;\n}", "calendar layout css");
  }
  css = css.replace(".calendar-head, .calendar-cell { border: 1px solid var(--border); border-radius: 12px; min-height: 70px; padding: 10px; }", ".calendar-head, .calendar-cell { border: 1px solid var(--border); border-radius: 12px; min-height: 118px; padding: 12px; }");
  css = css.replace(".calendar-cell { display: grid; align-content: start; gap: 6px; background: rgba(255, 255, 255, 0.035); }", `.calendar-cell { display: grid; align-content: start; gap: 7px; background: rgba(255, 255, 255, 0.035); }
.calendar-cell strong { font-size: 18px; }`);
  css = css.replace(".calendar-cell span { display: block; border-radius: 999px; padding: 3px 7px; background: rgba(237, 28, 36, 0.18); color: var(--text); font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }", `.calendar-cell span { display: block; border-radius: 8px; padding: 5px 7px; background: rgba(237, 28, 36, 0.18); color: var(--text); font-size: 12px; line-height: 1.3; white-space: normal; overflow: hidden; text-overflow: ellipsis; }
.calendar-cell em { color: var(--text-muted); font-size: 12px; font-style: normal; }
.whatsapp-link-list { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
.calendar-layout .panel-body { overflow-x: auto; }`);
  css = css.replace(".kpi-grid,\n  .panel-grid.two-up,\n  .records-grid {\n    grid-template-columns: 1fr;\n  }", ".kpi-grid,\n  .panel-grid.two-up,\n  .records-grid,\n  .calendar-layout {\n    grid-template-columns: 1fr;\n  }");
  css = css.replace(".project-progress-strip,\n  .calendar-grid {\n    grid-template-columns: 1fr;\n  }", ".project-progress-strip {\n    grid-template-columns: 1fr;\n  }\n\n  .calendar-grid {\n    min-width: 720px;\n  }");
  write("assets/styles/main.css", css);
}

patchHtml();
patchApp();
patchCss();
