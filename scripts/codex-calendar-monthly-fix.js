const fs = require('fs');

function replaceOnce(file, before, after) {
  const text = fs.readFileSync(file, 'utf8');
  if (!text.includes(before)) throw new Error(`Pattern not found in ${file}: ${before.slice(0, 120)}`);
  fs.writeFileSync(file, text.replace(before, after));
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

replaceOnce('assets/scripts/app.js',
`  apiHealth: "unknown",
  selectedProjectId: null,
  currentUser: loadJson(STORAGE_KEYS.session, null),`,
`  apiHealth: "unknown",
  selectedProjectId: null,
  calendarDate: new Date(),
  currentUser: loadJson(STORAGE_KEYS.session, null),`);

replaceOnce('assets/scripts/app.js',
`  taskRecords: document.getElementById("task-records"),
  calendarGrid: document.getElementById("calendar-grid"),
  whatsappLinks: document.getElementById("whatsapp-links"),`,
`  taskRecords: document.getElementById("task-records"),
  calendarTitle: document.getElementById("calendar-title"),
  calendarGrid: document.getElementById("calendar-grid"),
  calendarPrevBtn: document.getElementById("calendar-prev-btn"),
  calendarTodayBtn: document.getElementById("calendar-today-btn"),
  calendarNextBtn: document.getElementById("calendar-next-btn"),
  whatsappLinks: document.getElementById("whatsapp-links"),`);

replaceOnce('assets/scripts/app.js',
`  els.taskForm.addEventListener("submit", onSaveTask);
  els.documentForm.addEventListener("submit", onSaveDocument);`,
`  els.taskForm.addEventListener("submit", onSaveTask);
  els.calendarPrevBtn.addEventListener("click", () => changeCalendarMonth(-1));
  els.calendarTodayBtn.addEventListener("click", () => {
    state.calendarDate = new Date();
    renderCalendar();
  });
  els.calendarNextBtn.addEventListener("click", () => changeCalendarMonth(1));
  els.documentForm.addEventListener("submit", onSaveDocument);`);

replaceOnce('assets/scripts/app.js',
`  const remoteSaved = await sendToApi("saveTask", payload);
  state.tasks.push(payload);
  persist(STORAGE_KEYS.tasks, state.tasks);
  renderAll();
  els.taskForm.reset();
  renderWhatsappLinks(payload);`,
`  const remoteSaved = await sendToApi("saveTask", payload);
  state.tasks.push(payload);
  persist(STORAGE_KEYS.tasks, state.tasks);
  state.calendarDate = new Date(`${payload.dueDate}T12:00:00`);
  renderAll();
  els.taskForm.reset();
  renderWhatsappLinks(payload);`);

replaceOnce('assets/scripts/app.js',
`function renderCalendar() {
  if (!els.calendarGrid) return;
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const blanks = (first.getDay() + 6) % 7;
  const cells = [];`,
`function changeCalendarMonth(offset) {
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
  const cells = [];`);

replaceOnce('assets/scripts/app.js',
`      <div class="calendar-cell ${date === todayStr() ? "today" : ""}">
        <strong>${day}</strong>
        ${dayTasks.slice(0, 4).map((task) => `<span title="${escapeHtml(task.title)}">${escapeHtml(task.title)}</span>`).join("")}`, 
`      <div class="calendar-cell ${date === todayStr() ? "today" : ""}">
        <div class="calendar-day-number">${day}</div>
        ${dayTasks.slice(0, 4).map((task) => `<span title="${escapeHtml(task.title)}">${escapeHtml(task.title)}</span>`).join("")}`);

replaceOnce('assets/styles/main.css',
`.calendar-layout {
  display: grid;
  grid-template-columns: minmax(280px, 0.85fr) minmax(620px, 1.65fr);
  gap: 16px;
  align-items: start;
}`,
`.calendar-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}`);

replaceOnce('assets/styles/main.css',
`.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 8px;
}`,
`.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 10px;
  min-width: 860px;
}`);

replaceOnce('assets/styles/main.css',
`.calendar-head,
.calendar-cell {
  border: 1px solid var(--border);
  border-radius: 12px;
  min-height: 118px;
  padding: 12px;
}`,
`.calendar-head,
.calendar-cell {
  border: 1px solid var(--border);
  border-radius: 12px;
}

.calendar-cell {
  min-height: 150px;
  padding: 14px;
}`);

replaceOnce('assets/styles/main.css',
`.calendar-cell strong {
  font-size: 18px;
}`,
`.calendar-day-number {
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  border-radius: 999px;
  font-size: 18px;
  font-weight: 800;
  background: rgba(255, 255, 255, 0.06);
}`);

replaceOnce('assets/styles/main.css',
`.calendar-cell.today {
  border-color: var(--accent-2);
}`,
`.calendar-cell.today {
  border-color: var(--accent-2);
  background: rgba(237, 28, 36, 0.1);
}`);

replaceOnce('assets/styles/main.css',
`.calendar-cell span {
  display: block;
  border-radius: 8px;
  padding: 5px 7px;
  background: rgba(237, 28, 36, 0.18);
  color: var(--text);
  font-size: 12px;`,
`.calendar-cell span {
  display: block;
  border-radius: 8px;
  padding: 7px 8px;
  background: rgba(237, 28, 36, 0.18);
  color: var(--text);
  font-size: 13px;`);

replaceOnce('assets/styles/main.css',
`  .calendar-grid {
    min-width: 720px;
  }`,
`  .calendar-grid {
    min-width: 760px;
  }`);

console.log('Monthly calendar layout fix applied.');
