const fs = require('fs');

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function write(file, text) {
  fs.writeFileSync(file, text);
}

let app = read('assets/scripts/app.js');
let html = read('index.html');
let css = read('assets/styles/main.css');

app = app
  .replace(/,\n\s*whatsappNumbers:\s*""/g, '')
  .replace(/\n\s*whatsappLinks:\s*document\.getElementById\("whatsapp-links"\),/g, '')
  .replace(/,\n\s*settingsWhatsappNumbers:\s*document\.getElementById\("settings-whatsapp-numbers"\)/g, '')
  .replace(/\n\s*els\.settingsWhatsappNumbers\.value\s*=\s*state\.settings\.whatsappNumbers\s*\|\|\s*"";/g, '')
  .replace(/\n\s*renderWhatsappLinks\(payload\);/g, '')
  .replace(/,\n\s*whatsappNumbers:\s*els\.settingsWhatsappNumbers\.value\.trim\(\)/g, '')
  .replace(/\nfunction renderWhatsappLinks\(task\) \{[\s\S]*?\n\}\n\nfunction parseWhatsappNumbers\(value\) \{[\s\S]*?\n\}\n\nfunction buildWhatsappMessage\(task\) \{[\s\S]*?\n\}\n/g, '\n');

html = html
  .replace(/\s*<div class="info-card hidden" id="whatsapp-links"><\/div>/g, '')
  .replace(/\n\s*<label class="field">\n\s*<span>WhatsApp Bildirim Numaraları<\/span>\n\s*<textarea name="whatsappNumbers" id="settings-whatsapp-numbers" rows="3" placeholder="905xxxxxxxxx, 905yyyyyyyyy"><\/textarea>\n\s*<\/label>/g, '');

css = css.replace(/\.whatsapp-link-list\s*\{[^}]*\}\n?/g, '');

write('assets/scripts/app.js', app);
write('index.html', html);
write('assets/styles/main.css', css);

const combined = `${app}\n${html}\n${css}`;
if (/whatsapp|WhatsApp|wa\.me/i.test(combined)) {
  const matches = combined.match(/.{0,40}(?:whatsapp|WhatsApp|wa\.me).{0,80}/gi) || [];
  console.error(matches.join('\n'));
  throw new Error('WhatsApp references remain after cleanup.');
}
console.log('WhatsApp functionality removed from website files.');
