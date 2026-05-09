const fs = require('fs');
const file = 'assets/scripts/app.js';
let text = fs.readFileSync(file, 'utf8');

text = text.replace(
`async function onLoginSubmit(event) {
  event.preventDefault();
  els.loginError.textContent = "";
  els.loginError.style.display = "none";

  if (state.users.length === 0) {
    await createFirstAdmin();
    return;
  }

  const username = els.loginUsername.value.trim();
  const password = els.loginPassword.value;
  const user = await findMatchingUser(username, password) || await loginWithApi(username, password);

  if (!user) {
    showLoginError("Kullanıcı adı veya şifre hatalı.");
    return;
  }

  state.currentUser = normalizeUser(user);
  persist(STORAGE_KEYS.session, state.currentUser);
  showApp();
  showToast("Giriş başarılı.");
}`,
`async function onLoginSubmit(event) {
  event.preventDefault();
  els.loginError.textContent = "";
  els.loginError.style.display = "none";

  const username = els.loginUsername.value.trim();
  const password = els.loginPassword.value;
  if (!username || !password) {
    showLoginError("Kullanıcı adı ve şifre gerekli.");
    return;
  }

  state.settings = normalizeSettings(state.settings);
  const user = await findMatchingUser(username, password) || await loginWithApi(username, password);

  if (!user && state.users.length === 0) {
    await createFirstAdmin();
    return;
  }

  if (!user) {
    showLoginError("Kullanıcı adı veya şifre hatalı.");
    return;
  }

  state.currentUser = normalizeUser(user);
  persist(STORAGE_KEYS.session, state.currentUser);
  showApp();
  showToast("Giriş başarılı.");
}`
);

text = text.replace(
`async function loginWithApi(username, password) {
  if (!state.settings.apiBaseUrl || !state.settings.apiToken) return null;`,
`async function loginWithApi(username, password) {
  state.settings = normalizeSettings(state.settings);
  persist(STORAGE_KEYS.settings, state.settings);
  if (!state.settings.apiBaseUrl || !state.settings.apiToken) return null;`
);

text = text.replace(
`function onSaveSettings(event) {
  event.preventDefault();
  state.settings = {
    apiBaseUrl: els.settingsApiUrl.value.trim(),
    apiToken: els.settingsApiToken.value.trim(),
    companyName: els.settingsCompanyName.value.trim(),
    sheetNote: els.settingsSheetNote.value.trim(),
    whatsappNumbers: els.settingsWhatsappNumbers.value.trim()
  };
  state.apiHealth = "unknown";
  persist(STORAGE_KEYS.settings, state.settings);
  setConnectionPill();
  showToast("Ayarlar kaydedildi.");
}`,
`function onSaveSettings(event) {
  event.preventDefault();
  state.settings = normalizeSettings({
    apiBaseUrl: els.settingsApiUrl.value.trim(),
    apiToken: els.settingsApiToken.value.trim(),
    companyName: els.settingsCompanyName.value.trim(),
    sheetNote: els.settingsSheetNote.value.trim(),
    whatsappNumbers: els.settingsWhatsappNumbers.value.trim()
  });
  state.apiHealth = "unknown";
  persist(STORAGE_KEYS.settings, state.settings);
  hydrateForms();
  setConnectionPill();
  showToast("Ayarlar kaydedildi.");
}`
);

text = text.replace(
`async function sendToApi(action, payload) {
  if (!state.settings.apiBaseUrl || !state.settings.apiToken) return false;`,
`async function sendToApi(action, payload) {
  state.settings = normalizeSettings(state.settings);
  persist(STORAGE_KEYS.settings, state.settings);
  if (!state.settings.apiBaseUrl || !state.settings.apiToken) return false;`
);

fs.writeFileSync(file, text);
console.log('Auth and settings guard patch applied.');
