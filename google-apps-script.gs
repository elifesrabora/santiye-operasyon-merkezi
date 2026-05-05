const SPREADSHEET_ID = "17WZGVKxZ2cfSxEGkLPRQazHNFU4iYBAqMDYy99ZfErM";
const API_TOKEN = "AYAZLAR_SANTIYE_2026";
const SHEETS = {
  projects: "Projects",
  users: "Users",
  reports: "Reports",
  puantaj: "Puantaj",
  workers: "Workers",
  orders: "Orders",
  tasks: "Tasks",
  documents: "Documents"
};
const HEADERS = {
  Projects: ["id", "name", "location", "startDate", "endDate", "budget"],
  Users: ["id", "name", "username", "passwordHash", "role", "active"],
  Reports: ["id", "projectId", "date", "workingHours", "workSummary", "nextPlan", "incident", "notes", "createdById", "createdAt"],
  Puantaj: ["id", "date", "chiefId", "createdById", "createdAt"],
  Workers: ["puantajId", "name", "projectId", "job", "status"],
  Orders: ["id", "projectId", "date", "material", "spec", "quantity", "unit", "supplier", "unitPrice", "total", "priceSource", "orderedById", "status", "note", "createdAt"],
  Tasks: ["id", "projectId", "title", "assignedToId", "dueDate", "status", "note", "createdById", "createdAt"],
  Documents: ["id", "projectId", "title", "type", "url", "note", "createdById", "createdAt"]
};

function doGet(e) {
  const resource = (e && e.parameter && e.parameter.resource) || "bootstrap";

  if (resource === "bootstrap") {
    if (!isAuthorized_((e && e.parameter && e.parameter.token) || "")) {
      return jsonOutput({ ok: false, error: "Unauthorized" });
    }

    return jsonOutput({
      projects: readProjects(),
      users: readUsers(false),
      reports: readReports(),
      puantaj: readPuantaj(),
      orders: readOrders(),
      tasks: readTasks(),
      documents: readDocuments()
    });
  }

  return jsonOutput({ error: "Unknown resource" });
}

function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    const action = body.action;
    const payload = body.payload || {};

    if (!isAuthorized_(body.token || "")) {
      return jsonOutput({ ok: false, error: "Unauthorized" });
    }

    if (action === "login") {
      const user = loginUser(payload);
      if (!user) return jsonOutput({ ok: false, error: "Invalid credentials" });
      return jsonOutput({ ok: true, user: user });
    }

    if (action === "saveReport") {
      saveReport(payload);
      return jsonOutput({ ok: true });
    }

    if (action === "savePuantaj") {
      savePuantaj(payload);
      return jsonOutput({ ok: true });
    }

    if (action === "saveOrder") {
      saveOrder(payload);
      return jsonOutput({ ok: true });
    }

    if (action === "updateOrder") { updateOrder(payload); return jsonOutput({ ok: true }); }
    if (action === "saveTask") { saveTask(payload); return jsonOutput({ ok: true }); }
    if (action === "saveDocument") { saveDocument(payload); return jsonOutput({ ok: true }); }

    if (action === "saveProject") {
      saveProject(payload);
      return jsonOutput({ ok: true });
    }

    if (action === "saveUser") {
      saveUser(payload);
      return jsonOutput({ ok: true });
    }

    return jsonOutput({ error: "Unknown action" });
  } catch (error) {
    return jsonOutput({ error: String(error && error.message ? error.message : error) });
  }
}

function readProjects() {
  const rows = getSheetValues_(SHEETS.projects);
  return rows.map(function(row) {
    return {
      id: row[0] || "",
      name: row[1] || "",
      location: row[2] || "",
      startDate: normalizeDate_(row[3]),
      endDate: normalizeDate_(row[4]),
      budget: Number(row[5] || 0)
    };
  }).filter(function(item) { return item.id; });
}

function readUsers(includeSecrets) {
  const rows = getSheetValues_(SHEETS.users);
  return rows.map(function(row) {
    const user = {
      id: row[0] || "",
      name: row[1] || "",
      username: row[2] || "",
      role: row[4] || "",
      active: row[5] === "" ? true : row[5]
    };
    if (includeSecrets) user.passwordHash = row[3] || "";
    return user;
  }).filter(function(item) { return item.id; });
}

function loginUser(payload) {
  const username = String(payload.username || "");
  const passwordHash = String(payload.passwordHash || "");
  if (!username || !passwordHash) return null;

  const user = readUsers(true).filter(function(item) {
    return item.username === username && item.active !== false && item.passwordHash === passwordHash;
  })[0];

  if (!user) return null;
  delete user.passwordHash;
  return user;
}

function readReports() {
  const rows = getSheetValues_(SHEETS.reports);
  return rows.map(function(row) {
    return {
      id: row[0] || "",
      projectId: row[1] || "",
      date: normalizeDate_(row[2]),
      workingHours: row[3] || "",
      workSummary: row[4] || "",
      nextPlan: row[5] || "",
      incident: row[6] || "",
      notes: row[7] || "",
      createdById: row[8] || "",
      createdAt: row[9] || ""
    };
  }).filter(function(item) { return item.id; });
}

function readPuantaj() {
  const puantajRows = getSheetValues_(SHEETS.puantaj);
  const workerRows = getSheetValues_(SHEETS.workers);
  const workersByEntry = {};

  workerRows.forEach(function(row) {
    const puantajId = row[0];
    if (!puantajId) return;
    if (!workersByEntry[puantajId]) workersByEntry[puantajId] = [];
    workersByEntry[puantajId].push({
      name: row[1] || "",
      projectId: row[2] || "",
      job: row[3] || "",
      status: row[4] || "present"
    });
  });

  return puantajRows.map(function(row) {
    return {
      id: row[0] || "",
      date: normalizeDate_(row[1]),
      chiefId: row[2] || "",
      createdById: row[3] || "",
      createdAt: row[4] || "",
      workers: workersByEntry[row[0]] || []
    };
  }).filter(function(item) { return item.id; });
}

function readOrders() {
  const rows = getSheetValues_(SHEETS.orders);
  return rows.map(function(row) {
    return {
      id: row[0] || "",
      projectId: row[1] || "",
      date: normalizeDate_(row[2]),
      material: row[3] || "",
      spec: row[4] || "",
      quantity: Number(row[5] || 0),
      unit: row[6] || "",
      supplier: row[7] || "",
      unitPrice: Number(row[8] || 0),
      total: Number(row[9] || 0),
      priceSource: row[10] || "",
      orderedById: row[11] || "",
      status: row[12] || "",
      note: row[13] || "",
      createdAt: row[14] || ""
    };
  }).filter(function(item) { return item.id; });
}

function readTasks() { const rows = getSheetValues_(SHEETS.tasks); return rows.map(function(row) { return { id: row[0] || "", projectId: row[1] || "", title: row[2] || "", assignedToId: row[3] || "", dueDate: normalizeDate_(row[4]), status: row[5] || "", note: row[6] || "", createdById: row[7] || "", createdAt: row[8] || "" }; }).filter(function(item) { return item.id; }); }
function readDocuments() { const rows = getSheetValues_(SHEETS.documents); return rows.map(function(row) { return { id: row[0] || "", projectId: row[1] || "", title: row[2] || "", type: row[3] || "", url: row[4] || "", note: row[5] || "", createdById: row[6] || "", createdAt: row[7] || "" }; }).filter(function(item) { return item.id; }); }

function saveReport(payload) {
  getSheet_(SHEETS.reports).appendRow([
    payload.id || Utilities.getUuid(),
    payload.projectId || "",
    payload.date || "",
    payload.workingHours || "",
    payload.workSummary || "",
    payload.nextPlan || "",
    payload.incident || "",
    payload.notes || "",
    payload.createdById || "",
    payload.createdAt || new Date().toISOString()
  ]);
}

function savePuantaj(payload) {
  const puantajId = payload.id || Utilities.getUuid();
  getSheet_(SHEETS.puantaj).appendRow([
    puantajId,
    payload.date || "",
    payload.chiefId || "",
    payload.createdById || "",
    payload.createdAt || new Date().toISOString()
  ]);

  (payload.workers || []).forEach(function(worker) {
    getSheet_(SHEETS.workers).appendRow([
      puantajId,
      worker.name || "",
      worker.projectId || "",
      worker.job || "",
      worker.status || "present"
    ]);
  });
}

function saveOrder(payload) {
  getSheet_(SHEETS.orders).appendRow([
    payload.id || Utilities.getUuid(),
    payload.projectId || "",
    payload.date || "",
    payload.material || "",
    payload.spec || "",
    payload.quantity || 0,
    payload.unit || "",
    payload.supplier || "",
    payload.unitPrice || 0,
    payload.total || 0,
    payload.priceSource || "",
    payload.orderedById || "",
    payload.status || "",
    payload.note || "",
    payload.createdAt || new Date().toISOString()
  ]);
}

function updateOrder(payload) { const sheet = getSheet_(SHEETS.orders); const rowIndex = findRowIndexById_(sheet, payload.id); if (!rowIndex) { saveOrder(payload); return; } sheet.getRange(rowIndex, 1, 1, 15).setValues([[payload.id || "", payload.projectId || "", payload.date || "", payload.material || "", payload.spec || "", payload.quantity || 0, payload.unit || "", payload.supplier || "", payload.unitPrice || 0, payload.total || 0, payload.priceSource || "", payload.orderedById || "", payload.status || "", payload.note || "", payload.createdAt || new Date().toISOString()]]); }
function saveTask(payload) { getSheet_(SHEETS.tasks).appendRow([payload.id || Utilities.getUuid(), payload.projectId || "", payload.title || "", payload.assignedToId || "", payload.dueDate || "", payload.status || "Planlandı", payload.note || "", payload.createdById || "", payload.createdAt || new Date().toISOString()]); }
function saveDocument(payload) { getSheet_(SHEETS.documents).appendRow([payload.id || Utilities.getUuid(), payload.projectId || "", payload.title || "", payload.type || "", payload.url || "", payload.note || "", payload.createdById || "", payload.createdAt || new Date().toISOString()]); }

function saveProject(payload) {
  getSheet_(SHEETS.projects).appendRow([
    payload.id || Utilities.getUuid(),
    payload.name || "",
    payload.location || "",
    payload.startDate || "",
    payload.endDate || "",
    payload.budget || 0
  ]);
}

function saveUser(payload) {
  getSheet_(SHEETS.users).appendRow([
    payload.id || Utilities.getUuid(),
    payload.name || "",
    payload.username || "",
    payload.passwordHash || "",
    payload.role || "kullanici",
    payload.active === false ? false : true
  ]);
}

function getSheetValues_(sheetName) {
  const sheet = getSheet_(sheetName);
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow < 2 || lastCol === 0) return [];
  return sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
}

function getSheet_(sheetName) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) { sheet = ss.insertSheet(sheetName); }
  if (sheet.getLastRow() === 0 && HEADERS[sheetName]) { sheet.appendRow(HEADERS[sheetName]); }
  return sheet;
}

function findRowIndexById_(sheet, id) { if (!id) return 0; const lastRow = sheet.getLastRow(); if (lastRow < 2) return 0; const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues(); for (var i = 0; i < ids.length; i += 1) { if (String(ids[i][0]) === String(id)) return i + 2; } return 0; }

function isAuthorized_(token) {
  return Boolean(API_TOKEN) && API_TOKEN !== "BURAYA_GUCLU_BIR_ANAHTAR_YAZIN" && token === API_TOKEN;
}

function normalizeDate_(value) {
  if (Object.prototype.toString.call(value) === "[object Date]" && !isNaN(value)) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), "yyyy-MM-dd");
  }
  return value || "";
}

function jsonOutput(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
