const SPREADSHEET_ID = "17WZGVKxZ2cfSxEGkLPRQazHNFU4iYBAqMDYy99ZfErM";
const SHEETS = {
  projects: "Projects",
  users: "Users",
  reports: "Reports",
  puantaj: "Puantaj",
  workers: "Workers",
  orders: "Orders"
};

function doGet(e) {
  const resource = (e && e.parameter && e.parameter.resource) || "bootstrap";

  if (resource === "bootstrap") {
    return jsonOutput({
      projects: readProjects(),
      users: readUsers(),
      reports: readReports(),
      puantaj: readPuantaj(),
      orders: readOrders()
    });
  }

  return jsonOutput({ error: "Unknown resource" });
}

function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    const action = body.action;
    const payload = body.payload || {};

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

function readUsers() {
  const rows = getSheetValues_(SHEETS.users);
  return rows.map(function(row) {
    return {
      id: row[0] || "",
      name: row[1] || "",
      username: row[2] || "",
      passwordHash: row[3] || "",
      role: row[4] || "",
      active: row[5] === "" ? true : row[5]
    };
  }).filter(function(item) { return item.id; });
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
      notes: row[7] || ""
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
      note: row[13] || ""
    };
  }).filter(function(item) { return item.id; });
}

function saveReport(payload) {
  getSheet_(SHEETS.reports).appendRow([
    payload.id || Utilities.getUuid(),
    payload.projectId || "",
    payload.date || "",
    payload.workingHours || "",
    payload.workSummary || "",
    payload.nextPlan || "",
    payload.incident || "",
    payload.notes || ""
  ]);
}

function savePuantaj(payload) {
  const puantajId = payload.id || Utilities.getUuid();
  getSheet_(SHEETS.puantaj).appendRow([
    puantajId,
    payload.date || "",
    payload.chiefId || ""
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
    payload.note || ""
  ]);
}

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
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error("Sheet not found: " + sheetName);
  return sheet;
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
