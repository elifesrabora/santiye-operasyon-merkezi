const fs = require('fs');
const file = 'assets/scripts/app.js';
let app = fs.readFileSync(file, 'utf8');

function mustReplace(from, to, label) {
  if (!app.includes(from)) throw new Error(`Pattern not found: ${label}`);
  app = app.replace(from, to);
}

mustReplace(
`async function boot() {
  clearLocalBusinessCache();
  wireNavigation();
  document.querySelectorAll("[data-view-jump]").forEach((button) => {
    button.addEventListener("click", () => setView(button.dataset.viewJump));
  });
  els.logoutBtn.addEventListener("click", doLogout);
  els.loginForm.addEventListener("submit", onLoginSubmit);
  hydrateForms();
  bindAppEvents();
  renderAuthMode();

  if (state.currentUser) {
    showApp();
  } else {
    showLogin();
  }

  if (state.settings.apiBaseUrl) {
    syncFromApi({ silent: true });
    window.setInterval(() => syncFromApi({ silent: true }), AUTO_SYNC_MS);
  } else {
    renderAll();
  }
}`,
`async function boot() {
  clearLocalBusinessCache();
  wireNavigation();
  document.querySelectorAll("[data-view-jump]").forEach((button) => {
    button.addEventListener("click", () => setView(button.dataset.viewJump));
  });
  els.logoutBtn.addEventListener("click", doLogout);
  els.loginForm.addEventListener("submit", onLoginSubmit);
  hydrateForms();
  bindAppEvents();
  setConnectionPill();

  if (state.settings.apiBaseUrl) {
    await syncFromApi({ silent: true });
    window.setInterval(() => syncFromApi({ silent: true }), AUTO_SYNC_MS);
  } else {
    state.apiHealth = "error";
    setConnectionPill();
  }

  renderAuthMode();
  if (state.currentUser) {
    showApp();
  } else {
    showLogin();
  }
}`,
'boot waits for Sheets sync'
);

app = app.replace(
`    const response = await fetch(state.settings.apiBaseUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },`,
`    const response = await fetchWithTimeout(state.settings.apiBaseUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },`
);

app = app.replace(
`    const response = await fetch(url.toString(), { method: "GET" });`,
`    const response = await fetchWithTimeout(url.toString(), { method: "GET" });`
);

app = app.replace(
`    const response = await fetch(state.settings.apiBaseUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action, token: state.settings.apiToken, payload })
    });`,
`    const response = await fetchWithTimeout(state.settings.apiBaseUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action, token: state.settings.apiToken, payload })
    });`
);

mustReplace(
`function setConnectionPill() {
  if (!state.settings.apiBaseUrl) return (els.connectionPill.textContent = "Sheets Ayarı Gerekli");
  if (!state.settings.apiToken) return (els.connectionPill.textContent = "Token Gerekli");
  if (state.apiHealth === "ok") return (els.connectionPill.textContent = "Sheets Canlı");
  if (state.apiHealth === "error") return (els.connectionPill.textContent = "Sheets Hatası");
  els.connectionPill.textContent = "Sheets Bağlanıyor";
}`,
`function setConnectionPill() {
  if (!state.settings.apiBaseUrl) return (els.connectionPill.textContent = "Sheets Ayarı Gerekli");
  if (!state.settings.apiToken) return (els.connectionPill.textContent = "Token Gerekli");
  if (state.apiHealth === "ok") return (els.connectionPill.textContent = "Sheets Canlı");
  if (state.apiHealth === "error") return (els.connectionPill.textContent = "Sheets Hatası");
  els.connectionPill.textContent = "Sheets Kontrol Ediliyor";
}`,
'connection text'
);

mustReplace(
`function loadJson(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}`,
`async function fetchWithTimeout(url, options = {}, timeoutMs = 15000) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function loadJson(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}`,
'fetch timeout helper'
);

if (/Sheets Bağlanıyor/.test(app)) throw new Error('Old Sheets Bağlanıyor text remains.');
fs.writeFileSync(file, app);
console.log('Sheets boot and timeout behavior fixed.');
