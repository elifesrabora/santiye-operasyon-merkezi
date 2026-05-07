const fs = require('fs');

function read(file) { return fs.readFileSync(file, 'utf8'); }
function write(file, text) { fs.writeFileSync(file, text); }
function replaceOnce(file, before, after) {
  const text = read(file);
  if (!text.includes(before)) throw new Error(`Pattern not found in ${file}: ${before.slice(0, 120)}`);
  write(file, text.replace(before, after));
}

replaceOnce('index.html',
`                <div class="eyebrow">Bu Ay</div>
                <h2>Takvim</h2>
              </div>
            </div>
            <div class="panel-body">
              <div class="calendar-grid" id="calendar-grid"></div>
            </div>`,
`                <div class="eyebrow">Bu Ay</div>
                <h2 id="calendar-title">Takvim</h2>
              </div>
              <div class="header-actions">
                <button class="btn btn-secondary" type="button" id="calendar-prev-btn">Önceki Ay</button>
                <button class="btn btn-secondary" type="button" id="calendar-today-btn">Bugün</button>
                <button class="btn btn-secondary" type="button" id="calendar-next-btn">Sonraki Ay</button>
              </div>
            </div>
            <div class="panel-body">
              <div class="calendar-grid" id="calendar-grid"></div>
            </div>`);

let app = read('assets/scripts/app.js');
app = app.replace('  apiHealth: "unknown",\n  selectedProjectId: null,\n  currentUser: loadJson(STORAGE_KEYS.session, null),', '  apiHealth: "unknown",\n  selectedProjectId: null,\n  calendarDate: new Date(),\n  currentUser: loadJson(STORAGE_KEYS.session, null),');
app = app.replace('  taskRecords: document.getElementById("task-records"),\n  calendarGrid: document.getElementById("calendar-grid"),\n  whatsappLinks: document.getElementById("whatsapp-links"),', '  taskRecords: document.getElementById("task-records"),\n  calendarTitle: document.getElementById("calendar-title"),\n  calendarGrid: document.getElementById("calendar-grid"),\n  calendarPrevBtn: document.getElementById("calendar-prev-btn"),\n  calendarTodayBtn: document.getElementById("calendar-today-btn"),\n  calendarNextBtn: document.getElementById("calendar-next-btn"),\n  whatsappLinks: document.getElementById("whatsapp-links"),');
app = app.replace('  els.taskForm.addEventListener("submit", onSaveTask);\n  els.documentForm.addEventListener("submit", onSaveDocument);', '  els.taskForm.addEventListener("submit", onSaveTask);\n  els.calendarPrevBtn.addEventListener("click", () => changeCalendarMonth(-1));\n  els.calendarTodayBtn.addEventListener("click", () => {\n    state.calendarDate = new Date();\n    renderCalendar();\n  });\n  els.calendarNextBtn.addEventListener("click", () => changeCalendarMonth(1));\n  els.documentForm.addEventListener("submit", onSaveDocument);');
app = app.replace('  const remoteSaved = await sendToApi("saveTask", payload);\n  state.tasks.push(payload);\n  persist(STORAGE_KEYS.tasks, state.tasks);\n  renderAll();\n  els.taskForm.reset();\n  renderWhatsappLinks(payload);', '  const remoteSaved = await sendToApi("saveTask", payload);\n  state.tasks.push(payload);\n  persist(STORAGE_KEYS.tasks, state.tasks);\n  state.calendarDate = new Date(`${payload.dueDate}T12:00:00`);\n  renderAll();\n  els.taskForm.reset();\n  renderWhatsappLinks(payload);');
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
css = css.replace('grid-template-columns: minmax(280px, 0.85fr) minmax(620px, 1.65fr);', 'grid-template-columns: minmax(0, 1fr);');
css = css.replace('.calendar-grid {\n  display: grid;\n  grid-template-columns: repeat(7, minmax(0, 1fr));\n  gap: 8px;\n}', '.calendar-grid {\n  display: grid;\n  grid-template-columns: repeat(7, minmax(0, 1fr));\n  gap: 10px;\n  min-width: 860px;\n}');
css = css.replace('.calendar-head,\n.calendar-cell {\n  border: 1px solid var(--border);\n  border-radius: 12px;\n  min-height: 118px;\n  padding: 12px;\n}', '.calendar-head,\n.calendar-cell {\n  border: 1px solid var(--border);\n  border-radius: 12px;\n}\n\n.calendar-cell {\n  min-height: 150px;\n  padding: 14px;\n}');
css = css.replace('.calendar-cell strong {\n  font-size: 18px;\n}', '.calendar-day-number {\n  width: 32px;\n  height: 32px;\n  display: grid;\n  place-items: center;\n  border-radius: 999px;\n  font-size: 18px;\n  font-weight: 800;\n  background: rgba(255, 255, 255, 0.06);\n}');
css = css.replace('.calendar-cell.today {\n  border-color: var(--accent-2);\n}', '.calendar-cell.today {\n  border-color: var(--accent-2);\n  background: rgba(237, 28, 36, 0.1);\n}');
css = css.replace('padding: 5px 7px;\n  background: rgba(237, 28, 36, 0.18);\n  color: var(--text);\n  font-size: 12px;', 'padding: 7px 8px;\n  background: rgba(237, 28, 36, 0.18);\n  color: var(--text);\n  font-size: 13px;');
css = css.replace('  .calendar-grid {\n    min-width: 720px;\n  }', '  .calendar-grid {\n    min-width: 760px;\n  }');
write('assets/styles/main.css', css);

console.log('Monthly calendar layout fix applied.');
