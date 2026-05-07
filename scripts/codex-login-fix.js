const fs = require('fs');

function replaceOnce(file, before, after) {
  const text = fs.readFileSync(file, 'utf8');
  if (!text.includes(before)) {
    throw new Error(`Pattern not found in ${file}: ${before.slice(0, 120)}`);
  }
  fs.writeFileSync(file, text.replace(before, after));
}

replaceOnce(
  'assets/scripts/app.js',
`function normalizeUser(user) {
  return {
    id: user.id,
    name: user.name || user.ad || user.username,
    username: user.username || user.name,
    role: user.role || "kullanici",
    passwordHash: String(user.passwordHash ?? ""),
    active: user.active !== false
  };
}

async function findMatchingUser(username, password) {
  const hashed = await sha256(password);
  return state.users.find((item) => {
    if (item.username !== username || item.active === false) return false;
    const stored = String(item.passwordHash ?? "");
    if (!stored) return false;
    return stored === hashed || stored === password;
  }) || null;
}

async function loginWithApi(username, password) {
  if (!state.settings.apiBaseUrl || !state.settings.apiToken) return null;
  try {
    const response = await fetch(state.settings.apiBaseUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "login",
        token: state.settings.apiToken,
        payload: { username, passwordHash: await sha256(password) }
      })
    });`,
`function normalizeUser(user) {
  return {
    id: user.id,
    name: user.name || user.ad || user.username,
    username: user.username || user.name,
    role: user.role || "kullanici",
    passwordHash: String(user.passwordHash ?? ""),
    active: user.active !== false
  };
}

function mergeUsersKeepingLocalSecrets(localUsers, remoteUsers) {
  const localById = new Map((localUsers || []).map((user) => [user.id, user]));
  const localByUsername = new Map((localUsers || []).map((user) => [String(user.username || "").toLowerCase(), user]));
  return remoteUsers.map((remoteUser) => {
    const normalized = normalizeUser(remoteUser);
    const localMatch = localById.get(normalized.id) || localByUsername.get(String(normalized.username || "").toLowerCase());
    if (!normalized.passwordHash && localMatch?.passwordHash) {
      normalized.passwordHash = localMatch.passwordHash;
    }
    return normalized;
  });
}

async function findMatchingUser(username, password) {
  const loginName = String(username || "").trim().toLowerCase();
  const hashed = await sha256(password);
  return state.users.find((item) => {
    if (String(item.username || "").trim().toLowerCase() !== loginName || item.active === false) return false;
    const stored = String(item.passwordHash ?? "");
    if (!stored) return false;
    return stored === hashed || stored === password;
  }) || null;
}

async function loginWithApi(username, password) {
  if (!state.settings.apiBaseUrl || !state.settings.apiToken) return null;
  try {
    const response = await fetch(state.settings.apiBaseUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "login",
        token: state.settings.apiToken,
        payload: {
          username: String(username || "").trim(),
          password,
          passwordHash: await sha256(password)
        }
      })
    });`
);

replaceOnce(
  'assets/scripts/app.js',
`    if (Array.isArray(payload.users) && payload.users.length > 0) {
      state.users = payload.users.map(normalizeUser);
    }`,
`    if (Array.isArray(payload.users) && payload.users.length > 0) {
      state.users = mergeUsersKeepingLocalSecrets(state.users, payload.users);
    }`
);

replaceOnce(
  'google-apps-script.gs',
`function loginUser(payload) {
  const username = String(payload.username || "");
  const passwordHash = String(payload.passwordHash || "");
  if (!username || !passwordHash) return null;

  const user = readUsers(true).filter(function(item) {
    return item.username === username && item.active !== false && item.passwordHash === passwordHash;
  })[0];

  if (!user) return null;
  delete user.passwordHash;
  return user;
}`,
`function loginUser(payload) {
  const username = String(payload.username || "").trim().toLowerCase();
  const password = String(payload.password || "");
  const passwordHash = String(payload.passwordHash || "");
  if (!username || (!passwordHash && !password)) return null;

  const user = readUsers(true).filter(function(item) {
    const stored = String(item.passwordHash || "");
    return String(item.username || "").trim().toLowerCase() === username
      && item.active !== false
      && (stored === passwordHash || stored === password);
  })[0];

  if (!user) return null;
  delete user.passwordHash;
  return user;
}`
);

console.log('Login compatibility fix applied.');
