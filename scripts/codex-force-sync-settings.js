const fs = require('fs');
const file = 'assets/scripts/app.js';
let text = fs.readFileSync(file, 'utf8');

if (!text.includes('persist(STORAGE_KEYS.settings, state.settings);\n  hydrateForms();\n  if (!state.settings.apiBaseUrl)')) {
  text = text.replace(
`async function syncFromApi(options = {}) {
  const { silent = false } = options;
  if (!state.settings.apiBaseUrl) {`,
`async function syncFromApi(options = {}) {
  const { silent = false } = options;
  state.settings = normalizeSettings(state.settings);
  persist(STORAGE_KEYS.settings, state.settings);
  hydrateForms();
  if (!state.settings.apiBaseUrl) {`
  );
}

text = text.replace(
`    renderAll();
    refreshWorkerProjectOptions();
    if (!silent) showToast("Google Sheets verileri yüklendi.");`,
`    renderAll();
    refreshWorkerProjectOptions();
    if (!silent) {
      showToast(\`Sheets yüklendi: \${state.projects.length} proje, \${state.reports.length} rapor, \${state.puantaj.length} puantaj.\`);
    }`
);

fs.writeFileSync(file, text);
console.log('Forced sync settings patch applied.');
