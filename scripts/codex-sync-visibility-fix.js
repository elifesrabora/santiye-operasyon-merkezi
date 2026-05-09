const fs = require('fs');
const file = 'assets/scripts/app.js';
let text = fs.readFileSync(file, 'utf8');

if (!text.includes('const savedSettings = loadJson(STORAGE_KEYS.settings, {});')) {
  text = text.replace(
`const FALLBACK_LOGIN_USERS = [{
  id: "elif-fallback-admin",
  name: "Elif Esra Bora",
  username: "elif",
  passwordHash: "44d0fad8d09b7456fdf663e8ec82524d86e78405c9891a7da8b275b45cf437ae",
  role: "admin",
  active: true
}];`,
`const FALLBACK_LOGIN_USERS = [{
  id: "elif-fallback-admin",
  name: "Elif Esra Bora",
  username: "elif",
  passwordHash: "44d0fad8d09b7456fdf663e8ec82524d86e78405c9891a7da8b275b45cf437ae",
  role: "admin",
  active: true
}];

const savedSettings = loadJson(STORAGE_KEYS.settings, {});`
  );
}

text = text.replace(
'  settings: loadJson(STORAGE_KEYS.settings, DEFAULT_SETTINGS),',
'  settings: normalizeSettings(savedSettings),'
);

if (!text.includes('if (payload.ok === false) throw new Error(payload.error || "API hatası");')) {
  text = text.replace(
'    const payload = await response.json();\n    state.projects = payload.projects || state.projects;',
'    const payload = await response.json();\n    if (payload.ok === false) throw new Error(payload.error || "API hatası");\n    state.projects = payload.projects || state.projects;'
  );
}

if (!text.includes('function normalizeSettings(settings)')) {
  text = text.replace(
`function loadJson(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}

function persist(key, value) {`,
`function loadJson(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}

function normalizeSettings(settings) {
  const merged = { ...DEFAULT_SETTINGS, ...(settings || {}) };
  if (!merged.apiBaseUrl || !String(merged.apiBaseUrl).includes("/macros/s/")) {
    merged.apiBaseUrl = DEFAULT_SETTINGS.apiBaseUrl;
  }
  if (!merged.apiToken) merged.apiToken = DEFAULT_SETTINGS.apiToken;
  return merged;
}

function persist(key, value) {`
  );
}

fs.writeFileSync(file, text);
console.log('Sync visibility fix applied.');
