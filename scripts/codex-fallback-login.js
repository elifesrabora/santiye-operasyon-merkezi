const fs = require('fs');
const file = 'assets/scripts/app.js';
let text = fs.readFileSync(file, 'utf8');

const settingsBlock = `const DEFAULT_SETTINGS = {
  apiBaseUrl: "https://script.google.com/macros/s/AKfycbxsGhQNPJLG2UpWBDr6iUntH_XPT2iSUukKvf2gttwTpwq2o-tYzloTja8HGEwLLLU5Cg/exec",
  apiToken: "AYAZLAR_SANTIYE_2026",
  companyName: "Ayazlar Yapı",
  sheetNote: "Ana Google Sheet: https://docs.google.com/spreadsheets/d/17WZGVKxZ2cfSxEGkLPRQazHNFU4iYBAqMDYy99ZfErM/edit?usp=sharing",
  whatsappNumbers: ""
};`;

const withFallback = `${settingsBlock}

const FALLBACK_LOGIN_USERS = [{
  id: "elif-fallback-admin",
  name: "Elif Esra Bora",
  username: "elif",
  passwordHash: "44d0fad8d09b7456fdf663e8ec82524d86e78405c9891a7da8b275b45cf437ae",
  role: "admin",
  active: true
}];`;

if (!text.includes('const FALLBACK_LOGIN_USERS')) {
  if (!text.includes(settingsBlock)) throw new Error('settings block not found');
  text = text.replace(settingsBlock, withFallback);
}

const before = `  return state.users.find((item) => {
    if (String(item.username || "").trim().toLowerCase() !== loginName || item.active === false) return false;`;
const after = `  return [...state.users, ...FALLBACK_LOGIN_USERS].find((item) => {
    if (String(item.username || "").trim().toLowerCase() !== loginName || item.active === false) return false;`;
if (!text.includes(after)) {
  if (!text.includes(before)) throw new Error('login lookup block not found');
  text = text.replace(before, after);
}

fs.writeFileSync(file, text);
console.log('Fallback login applied.');
