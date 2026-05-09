const fs = require('fs');

function read(file) { return fs.readFileSync(file, 'utf8'); }
function write(file, text) { fs.writeFileSync(file, text); }
function mustReplace(text, from, to, label) {
  if (!text.includes(from)) throw new Error(`Pattern not found: ${label}`);
  return text.replace(from, to);
}

let app = read('assets/scripts/app.js');
let html = read('index.html');

app = mustReplace(app,
`const savedSettings = loadJson(STORAGE_KEYS.settings, {});

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
};`,
`const savedSettings = loadJson(STORAGE_KEYS.settings, {});
const BUSINESS_STORAGE_KEYS = [
  STORAGE_KEYS.projects,
  STORAGE_KEYS.users,
  STORAGE_KEYS.reports,
  STORAGE_KEYS.puantaj,
  STORAGE_KEYS.orders,
  STORAGE_KEYS.tasks,
  STORAGE_KEYS.documents
];

const state = {
  currentView: "dashboard",
  apiHealth: "unknown",
  selectedProjectId: null,
  calendarDate: new Date(),
  currentUser: loadJson(STORAGE_KEYS.session, null),
  settings: normalizeSettings(savedSettings),
  projects: [],
  users: [],
  reports: [],
  puantaj: [],
  orders: [],
  tasks: [],
  documents: []
};`, 'state initialization');

app = mustReplace(app,
`async function boot() {
  wireNavigation();`,
`async function boot() {
  clearLocalBusinessCache();
  wireNavigation();`, 'boot cleanup call');

app = mustReplace(app,
`  state.users.push(payload);
  persist(STORAGE_KEYS.users, state.users);
  state.currentUser = normalizeUser(payload);
  persist(STORAGE_KEYS.session, state.currentUser);
  showApp();
  showToast("İlk admin oluşturuldu.");`,
`  const remoteSaved = await sendToApi("saveUser", payload);
  if (!remoteSaved) return;
  state.users.push(payload);
  state.currentUser = normalizeUser(payload);
  persist(STORAGE_KEYS.session, state.currentUser);
  showApp();
  showToast("İlk admin Sheets'e kaydedildi.");`, 'first admin remote only');

const saveGuards = [
  [`  const remoteSaved = Boolean(apiResult);
`, `  const remoteSaved = Boolean(apiResult);
  if (!remoteSaved) return;
`],
  [`  const remoteSaved = await sendToApi(existingId ? "updatePuantaj" : "savePuantaj", payload);
`, `  const remoteSaved = await sendToApi(existingId ? "updatePuantaj" : "savePuantaj", payload);
  if (!remoteSaved) return;
`],
  [`  const remoteSaved = await sendToApi(existingId ? "updateOrder" : "saveOrder", payload);
`, `  const remoteSaved = await sendToApi(existingId ? "updateOrder" : "saveOrder", payload);
  if (!remoteSaved) return;
`],
  [`  const remoteSaved = await sendToApi("saveProject", payload);
`, `  const remoteSaved = await sendToApi("saveProject", payload);
  if (!remoteSaved) return;
`],
  [`  const remoteSaved = await sendToApi("saveUser", payload);
`, `  const remoteSaved = await sendToApi("saveUser", payload);
  if (!remoteSaved) return;
`],
  [`  const remoteSaved = await sendToApi("saveTask", payload);
`, `  const remoteSaved = await sendToApi("saveTask", payload);
  if (!remoteSaved) return;
`],
  [`  const remoteDeleted = await sendToApi("deleteDocument", { id: documentId });
`, `  const remoteDeleted = await sendToApi("deleteDocument", { id: documentId });
  if (!remoteDeleted) return;
`]
];
for (const [from, to] of saveGuards) app = mustReplace(app, from, to, from.trim());

app = app
  .replace(/\n\s*persist\(STORAGE_KEYS\.(projects|users|reports|puantaj|orders|tasks|documents), state\.\1\);/g, '')
  .replace(/showToast\(remoteSaved \? "Saha raporu kaydedildi\." : "Saha raporu yerelde kaydedildi\."\);/g, 'showToast("Saha raporu Sheets\'e kaydedildi.");')
  .replace(/showToast\(remoteSaved \? "Puantaj kaydedildi\." : "Puantaj yerelde kaydedildi\."\);/g, 'showToast("Puantaj Sheets\'e kaydedildi.");')
  .replace(/showToast\(remoteSaved \? "Sipariş kaydedildi\." : "Sipariş yerelde kaydedildi\."\);/g, 'showToast("Sipariş Sheets\'e kaydedildi.");')
  .replace(/showToast\(remoteSaved \? "Proje kaydedildi\." : "Proje yerelde kaydedildi\."\);/g, 'showToast("Proje Sheets\'e kaydedildi.");')
  .replace(/showToast\(remoteSaved \? "Kullanıcı kaydedildi\." : "Kullanıcı yerelde kaydedildi\."\);/g, 'showToast("Kullanıcı Sheets\'e kaydedildi.");')
  .replace(/showToast\(remoteSaved \? "Takvim kaydı eklendi\." : "Takvim kaydı yerelde tutuldu\."\);/g, 'showToast("Takvim kaydı Sheets\'e eklendi.");')
  .replace(/showToast\(remoteDeleted \? "Evrak silindi\." : "Evrak yerelden silindi\."\);/g, 'showToast("Evrak Sheets\'ten silindi.");')
  .replace(/showToast\("Sheets bağlantısına yazılamadı, veri yerelde tutuldu\."\);/g, 'showToast("Sheets bağlantısına yazılamadı. Kayıt oluşturulmadı.");');

app = mustReplace(app,
`    state.projects = payload.projects || state.projects;
    if (Array.isArray(payload.users) && payload.users.length > 0) {
      state.users = mergeUsersKeepingLocalSecrets(state.users, payload.users);
    }
    state.reports = mergeById(state.reports, payload.reports);
    state.puantaj = mergeById(state.puantaj, payload.puantaj);
    state.orders = mergeById(state.orders, payload.orders);
    state.tasks = mergeById(state.tasks, payload.tasks);
    state.documents = mergeById(state.documents, payload.documents);`,
`    state.projects = Array.isArray(payload.projects) ? payload.projects : [];
    state.users = Array.isArray(payload.users) && payload.users.length > 0
      ? mergeUsersKeepingLocalSecrets(state.users, payload.users)
      : [];
    state.reports = Array.isArray(payload.reports) ? payload.reports : [];
    state.puantaj = Array.isArray(payload.puantaj) ? payload.puantaj : [];
    state.orders = Array.isArray(payload.orders) ? payload.orders : [];
    state.tasks = Array.isArray(payload.tasks) ? payload.tasks : [];
    state.documents = Array.isArray(payload.documents) ? payload.documents : [];`, 'sync assignment from sheets only');

app = mustReplace(app,
`function setConnectionPill() {
  if (!state.settings.apiBaseUrl) return (els.connectionPill.textContent = "Yerel Kayıt");
  if (!state.settings.apiToken) return (els.connectionPill.textContent = "Token Gerekli");
  if (state.apiHealth === "ok") return (els.connectionPill.textContent = "Sheets Canlı");
  if (state.apiHealth === "error") return (els.connectionPill.textContent = "Sheets Hatası");
  els.connectionPill.textContent = "Sheets Bağlı";
}`,
`function setConnectionPill() {
  if (!state.settings.apiBaseUrl) return (els.connectionPill.textContent = "Sheets Ayarı Gerekli");
  if (!state.settings.apiToken) return (els.connectionPill.textContent = "Token Gerekli");
  if (state.apiHealth === "ok") return (els.connectionPill.textContent = "Sheets Canlı");
  if (state.apiHealth === "error") return (els.connectionPill.textContent = "Sheets Hatası");
  els.connectionPill.textContent = "Sheets Bağlanıyor";
}`,'connection pill');

app = mustReplace(app,
`function persist(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}`,
`function persist(key, value) {
  if (BUSINESS_STORAGE_KEYS.includes(key)) return;
  localStorage.setItem(key, JSON.stringify(value));
}

function clearLocalBusinessCache() {
  BUSINESS_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
}`,'persist guard');

html = html.replace('id="connection-pill">Yerel Kayıt</span>', 'id="connection-pill">Sheets Bağlanıyor</span>');

const forbidden = [/yerelde/i, /Yerel Kayıt/i, /veri yerelde/i, /yerelden/i, /loadJson\(STORAGE_KEYS\.(projects|users|reports|puantaj|orders|tasks|documents)/];
for (const pattern of forbidden) {
  if (pattern.test(app) || pattern.test(html)) throw new Error(`Forbidden local record reference remains: ${pattern}`);
}

write('assets/scripts/app.js', app);
write('index.html', html);
console.log('Local record mode removed; Sheets is the only business data source.');
