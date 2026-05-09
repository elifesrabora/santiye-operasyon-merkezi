const fs = require('fs');

function replaceAllChecked(file, replacements) {
  let text = fs.readFileSync(file, 'utf8');
  for (const [from, to] of replacements) {
    if (!text.includes(from)) {
      console.warn(`Pattern not found in ${file}: ${from.slice(0, 80).replace(/\n/g, ' ')}`);
      continue;
    }
    text = text.replace(from, to);
  }
  fs.writeFileSync(file, text);
}

replaceAllChecked('assets/scripts/app.js', [
  [`,\n  whatsappNumbers: ""`, ``],
  [`  whatsappLinks: document.getElementById("whatsapp-links"),\n`, ``],
  [`,\n  settingsWhatsappNumbers: document.getElementById("settings-whatsapp-numbers")`, ``],
  [`  els.settingsWhatsappNumbers.value = state.settings.whatsappNumbers || "";\n`, ``],
  [`  renderWhatsappLinks(payload);\n`, ``],
  [`    sheetNote: els.settingsSheetNote.value.trim(),\n    whatsappNumbers: els.settingsWhatsappNumbers.value.trim()`, `    sheetNote: els.settingsSheetNote.value.trim()`],
  [`\nfunction renderWhatsappLinks(task) {\n  if (!els.whatsappLinks) return;\n  const numbers = parseWhatsappNumbers(state.settings.whatsappNumbers);\n  if (!numbers.length) {\n    els.whatsappLinks.classList.remove("hidden");\n    els.whatsappLinks.innerHTML = "WhatsApp bildirimi için Ayarlar bölümüne bildirim numaralarını girin.";\n    return;\n  }\n  const message = buildWhatsappMessage(task);\n  els.whatsappLinks.classList.remove("hidden");\n  els.whatsappLinks.innerHTML = `\n    <strong>WhatsApp bildirimi hazır:</strong>\n    <div class="whatsapp-link-list">\n      ${numbers.map((number) => `<a class="btn btn-secondary" href="https://wa.me/${number}?text=${encodeURIComponent(message)}" target="_blank" rel="noreferrer">Gönder: ${escapeHtml(number)}</a>`).join("")}\n    </div>\n  `;\n}\n\nfunction parseWhatsappNumbers(value) {\n  return String(value || "")\n    .split(/[\\s,;]+/)\n    .map((item) => item.replace(/\\D/g, ""))\n    .filter((item) => item.length >= 10);\n}\n\nfunction buildWhatsappMessage(task) {\n  return [\n    "Ayazlar Yapı Takvim Bildirimi",\n    `Proje: ${projectName(task.projectId)}`,\n    `Tarih: ${task.dueDate || "-"}`,\n    `Takip edilecek iş: ${task.title}`,\n    `Bilgi: ${task.note || "-"}`,\n    `Giren: ${userName(task.createdById)}`,\n    `Kayıt zamanı: ${formatDateTime(task.createdAt)}`\n  ].join("\\n");\n}\n`, `\n`]
]);

replaceAllChecked('index.html', [
  [`<div class="info-card hidden" id="whatsapp-links"></div>`, ``],
  [`\n            <label class="field">\n              <span>WhatsApp Bildirim Numaraları</span>\n              <textarea name="whatsappNumbers" id="settings-whatsapp-numbers" rows="3" placeholder="905xxxxxxxxx, 905yyyyyyyyy"></textarea>\n            </label>\n`, `\n`]
]);

replaceAllChecked('assets/styles/main.css', [
  [`.whatsapp-link-list { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }\n`, ``]
]);

const app = fs.readFileSync('assets/scripts/app.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('assets/styles/main.css', 'utf8');
const combined = `${app}\n${html}\n${css}`;
if (/whatsapp|WhatsApp|wa\.me/i.test(combined)) {
  throw new Error('WhatsApp references remain after cleanup.');
}
console.log('WhatsApp functionality removed from website files.');
