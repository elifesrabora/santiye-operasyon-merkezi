const fs = require('fs');

function read(file) { return fs.readFileSync(file, 'utf8'); }
function write(file, text) { fs.writeFileSync(file, text); }

let html = read('index.html');
if (!html.includes('id="calendar-title"')) {
  html = html.replace(
    /(<div class="eyebrow">Bu Ay<\/div>\s*)<h2>Takvim<\/h2>(\s*<\/div>\s*)<\/div>/,
    '$1<h2 id="calendar-title">Takvim</h2>$2<div class="header-actions"><button class="btn btn-secondary" type="button" id="calendar-prev-btn">Önceki Ay</button><button class="btn btn-secondary" type="button" id="calendar-today-btn">Bugün</button><button class="btn btn-secondary" type="button" id="calendar-next-btn">Sonraki Ay</button></div></div>'
  );
}
write('index.html', html);

let app = read('assets/scripts/app.js');
if (!app.includes('calendarDate: new Date()')) {
  app = app.replace('  selectedProjectId: null,\n', '  selectedProjectId: null,\n  calendarDate: new Date(),\n');
}
if (!app.includes('calendarTitle: document.getElementById("calendar-title")')) {
  app = app.replace(
    '  taskRecords: document.getElementById("task-records"),\n  calendarGrid: document.getElementById("calendar-grid"),\n  whatsappLinks: document.getElementById("whatsapp-links"),',
    '  taskRecords: document.getElementById("task-records"),\n  calendarTitle: document.getElementById("calendar-title"),\n  calendarGrid: document.getElementById("calendar-grid"),\n  calendarPrevBtn: document.getElementById("calendar-prev-btn"),\n  calendarTodayBtn: document.getElementById("calendar-today-btn"),\n  calendarNextBtn: document.getElementById("calendar-next-btn"),\n  whatsappLinks: document.getElementById("whatsapp-links"),'
  );
}
if (!app.includes('changeCalendarMonth(-1)')) {
  app = app.replace(
    '  els.taskForm.addEventListener("submit", onSaveTask);\n  els.documentForm.addEventListener("submit", onSaveDocument);',
    '  els.taskForm.addEventListener("submit", onSaveTask);\n  els.calendarPrevBtn.addEventListener("click", () => changeCalendarMonth(-1));\n  els.calendarTodayBtn.addEventListener("click", () => {\n    state.calendarDate = new Date();\n    renderCalendar();\n  });\n  els.calendarNextBtn.addEventListener("click", () => changeCalendarMonth(1));\n  els.documentForm.addEventListener("submit", onSaveDocument);'
  );
}
if (!app.includes('state.calendarDate = new Date(`${payload.dueDate}T12:00:00`)')) {
  app = app.replace(
    '  persist(STORAGE_KEYS.tasks, state.tasks);\n  renderAll();',
    '  persist(STORAGE_KEYS.tasks, state.tasks);\n  state.calendarDate = new Date(`${payload.dueDate}T12:00:00`);\n  renderAll();'
  );
}
const start = app.indexOf('function renderCalendar() {');
const end = app.indexOf('function renderTaskCard(task) {');
if (start === -1 || end === -1 || end <= start) throw new Error('renderCalendar block not found');
const calendarBlock = [
'function changeCalendarMonth(offset) {',
'  const base = state.calendarDate instanceof Date ? state.calendarDate : new Date();',
'  state.calendarDate = new Date(base.getFullYear(), base.getMonth() + offset, 1);',
'  renderCalendar();',
'}',
'',
'function renderCalendar() {',
'  if (!els.calendarGrid) return;',
'  const now = state.calendarDate instanceof Date ? state.calendarDate : new Date();',
'  const year = now.getFullYear();',
'  const month = now.getMonth();',
'  const first = new Date(year, month, 1);',
'  const last = new Date(year, month + 1, 0);',
'  const blanks = (first.getDay() + 6) % 7;',
'  if (els.calendarTitle) {',
'    els.calendarTitle.textContent = new Intl.DateTimeFormat("tr-TR", { month: "long", year: "numeric" }).format(first);',
'  }',
'  const cells = [];',
'  ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"].forEach((day) => {',
'    cells.push(`<div class="calendar-head">${day}</div>`);',
'  });',
'  for (let i = 0; i < blanks; i += 1) cells.push(\'<div class="calendar-cell muted"></div>\');',
'  for (let day = 1; day <= last.getDate(); day += 1) {',
'    const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;',
'    const dayTasks = state.tasks.filter((task) => task.dueDate === date);',
'    cells.push(`',
'      <div class="calendar-cell ${date === todayStr() ? "today" : ""}">',
'        <div class="calendar-day-number">${day}</div>',
'        ${dayTasks.slice(0, 4).map((task) => `<span title="${escapeHtml(task.title)}">${escapeHtml(task.title)}</span>`).join("")}',
'        ${dayTasks.length > 4 ? `<em>+${dayTasks.length - 4} kayıt</em>` : ""}',
'      </div>',
'    `);',
'  }',
'  els.calendarGrid.innerHTML = cells.join("");',
'  els.taskRecords.innerHTML = state.tasks.length',
'    ? state.tasks.slice().sort((a, b) => a.dueDate.localeCompare(b.dueDate)).map(renderTaskCard).join("")',
'    : emptyState("Henüz takvim kaydı yok.");',
'  notifyDueTasks();',
'}',
'',
].join('\n');
app = app.slice(0, start) + calendarBlock + app.slice(end);
write('assets/scripts/app.js', app);

let css = read('assets/styles/main.css');
css = css.replace(/\.calendar-layout \{[\s\S]*?\n\}/, '.calendar-layout {\n  display: grid;\n  grid-template-columns: minmax(0, 1fr);\n  gap: 16px;\n  align-items: start;\n}');
css = css.replace(/\.calendar-grid \{[^}]*\}/, '.calendar-grid { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 10px; min-width: 860px; }');
css = css.replace(/\.calendar-head, \.calendar-cell \{[^}]*\}/, '.calendar-head, .calendar-cell { border: 1px solid var(--border); border-radius: 12px; }\n.calendar-cell { min-height: 150px; padding: 14px; }');
css = css.replace(/\.calendar-cell strong \{[^}]*\}/, '.calendar-day-number { width: 32px; height: 32px; display: grid; place-items: center; border-radius: 999px; font-size: 18px; font-weight: 800; background: rgba(255, 255, 255, 0.06); }');
css = css.replace(/\.calendar-cell\.today \{[^}]*\}/, '.calendar-cell.today { border-color: var(--accent-2); background: rgba(237, 28, 36, 0.1); }');
css = css.replace(/\.calendar-cell span \{[^}]*\}/, '.calendar-cell span { display: block; border-radius: 8px; padding: 7px 8px; background: rgba(237, 28, 36, 0.18); color: var(--text); font-size: 13px; line-height: 1.3; white-space: normal; overflow: hidden; text-overflow: ellipsis; }');
css = css.replace(/\.calendar-grid \{\s*min-width: 720px;\s*\}/, '.calendar-grid { min-width: 760px; }');
write('assets/styles/main.css', css);

console.log('Monthly calendar layout fix applied.');
