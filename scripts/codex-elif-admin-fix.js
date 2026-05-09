const fs = require('fs');
const file = 'assets/scripts/app.js';
let text = fs.readFileSync(file, 'utf8');
const before = `function normalizeUser(user) {
  return {
    id: user.id,
    name: user.name || user.ad || user.username,
    username: user.username || user.name,
    role: user.role || "kullanici",
    passwordHash: String(user.passwordHash ?? ""),
    active: user.active !== false
  };
}`;
const after = `function normalizeUser(user) {
  const username = user.username || user.name;
  return {
    id: user.id,
    name: user.name || user.ad || user.username,
    username,
    role: String(username || "").trim().toLowerCase() === "elif" ? "admin" : (user.role || "kullanici"),
    passwordHash: String(user.passwordHash ?? ""),
    active: user.active !== false
  };
}`;
if (!text.includes(after)) {
  if (!text.includes(before)) throw new Error('normalizeUser block not found');
  text = text.replace(before, after);
}
fs.writeFileSync(file, text);
console.log('Elif admin role fix applied.');
