const SPREADSHEET_ID = '17WZGVKxZ2cfSxEGkLPRQazHNFU4iYBAqMDYy99ZfErM';
const SHEETS = {
  projects: 'Projects',
  reports: 'Reports',
  puantaj: 'Puantaj',
  workers: 'Workers'
};

function doGet(e) {
  const resource = (e && e.parameter && e.parameter.resource) || 'bootstrap';

  if (resource === 'bootstrap') {
    return jsonOutput({
      projects: readProjects(),
      reports: readReports(),
      puantaj: readPuantaj()
    });
  }

  return jsonOutput({ error: 'Unknown resource' }, 400);
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || '{}');
    const action = body.action;
    const payload = body.payload || {};

    if (action === 'saveReport') {
      saveReport(payload);
      return jsonOutput({ ok: true });
    }

    if (action === 'savePuantaj') {
      savePuantaj(payload);
      return jsonOutput({ ok: true });
    }

    return jsonOutput({ error: 'Unknown action' }, 400);
  } catch (error) {
    return jsonOutput({ error: String(error && error.message ? error.message : error) }, 500);
  }
}

function readProjects() {
  const rows = getSheetValues_(SHEETS.projects);
  return rows.map((row) => ({
    id: row[0] || '',
    name: row[1] || '',
    location: row[2] || '',
    progress: Number(row[3] || 0),
    budget: Number(row[4] || 0)
  })).filter((item) => item.id);
}

function readReports() {
  const rows = getSheetValues_(SHEETS.reports);
  return rows.map((row) => ({
    id: row[0] || '',
    projectId: row[1] || '',
    date: normalizeDate_(row[2]),
    shift: row[3] || '',
    weather: row[4] || '',
    temperature: String(row[5] || ''),
    workingHours: row[6] || '',
    workSummary: row[7] || '',
    nextPlan: row[8] || '',
    safetyPpe: row[9] || '',
    toolboxTalk: row[10] || '',
    incident: row[11] || '',
    notes: row[12] || ''
  })).filter((item) => item.id);
}

function readPuantaj() {
  const puantajRows = getSheetValues_(SHEETS.puantaj);
  const workerRows = getSheetValues_(SHEETS.workers);

  const workersByEntry = {};
  workerRows.forEach((row) => {
    const puantajId = row[0];
    if (!puantajId) return;
    if (!workersByEntry[puantajId]) workersByEntry[puantajId] = [];
    workersByEntry[puantajId].push({
      name: row[1] || '',
      projectId: row[2] || '',
      job: row[3] || '',
      status: row[4] || 'present'
    });
  });

  return puantajRows.map((row) => ({
    id: row[0] || '',
    date: normalizeDate_(row[1]),
    chief: row[2] || '',
    defaultProjectId: row[3] || '',
    workers: workersByEntry[row[0]] || []
  })).filter((item) => item.id);
}

function saveReport(payload) {
  const sheet = getSheet_(SHEETS.reports);
  sheet.appendRow([
    payload.id || Utilities.getUuid(),
    payload.projectId || '',
    payload.date || '',
    payload.shift || '',
    payload.weather || '',
    payload.temperature || '',
    payload.workingHours || '',
    payload.workSummary || '',
    payload.nextPlan || '',
    payload.safetyPpe || '',
    payload.toolboxTalk || '',
    payload.incident || '',
    payload.notes || ''
  ]);
}

function savePuantaj(payload) {
  const puantajId = payload.id || Utilities.getUuid();
  const puantajSheet = getSheet_(SHEETS.puantaj);
  const workersSheet = getSheet_(SHEETS.workers);

  puantajSheet.appendRow([
    puantajId,
    payload.date || '',
    payload.chief || '',
    payload.defaultProjectId || ''
  ]);

  (payload.workers || []).forEach((worker) => {
    workersSheet.appendRow([
      puantajId,
      worker.name || '',
      worker.projectId || '',
      worker.job || '',
      worker.status || 'present'
    ]);
  });
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
  if (!sheet) throw new Error('Sheet not found: ' + sheetName);
  return sheet;
}

function normalizeDate_(value) {
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value)) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  return value || '';
}

function jsonOutput(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

