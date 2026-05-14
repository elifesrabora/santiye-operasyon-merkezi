const DEFAULT_SPREADSHEET_ID = "1brBxxE6agOvAhTSp26nkN7NrtoWRyQygce5sRcE3ZyI";
const DEFAULT_DRIVE_FOLDER_ID = "1kay5Ri3t_vLbRMuG22_tXslRsmwk4lg4";

const SCHEMA = {
  projects: ["id", "createdAt", "createdBy", "name", "client", "startDate", "endDate", "status", "notes", "location", "budget"],
  sites: ["id", "createdAt", "createdBy", "projectId", "name", "location", "manager", "status"],
  tasks: ["id", "createdAt", "createdBy", "projectId", "siteId", "title", "assignedTo", "dueDate", "status", "notes"],
  calendarEvents: ["id", "createdAt", "createdBy", "projectId", "siteId", "date", "title", "status", "notes"],
  reports: ["id", "createdAt", "createdBy", "projectId", "siteId", "date", "workDone", "notes", "workingHours", "nextPlan", "incident", "attachmentName", "attachmentUrl"],
  payments: ["id", "createdAt", "createdBy", "projectId", "period", "amount", "status", "notes"],
  personnel: ["id", "createdAt", "createdBy", "projectId", "siteId", "date", "personType", "name", "attendance", "job"],
  materials: ["id", "createdAt", "createdBy", "projectId", "siteId", "date", "name", "deliveryNo", "spec", "concreteClass", "diameter", "pourArea", "quantity", "unit", "company", "contact", "supplier", "unitPrice", "total", "status", "notes"],
  documents: ["id", "createdAt", "createdBy", "projectId", "siteId", "date", "title", "fileName", "fileUrl", "mimeType", "notes", "type"],
  users: ["email", "name", "role", "status", "permissions", "id", "createdAt", "createdBy", "username"],
};

function doPost(event) {
  try {
    const payload = JSON.parse(event.postData.contents || "{}");
    const spreadsheetId = payload.spreadsheetId || DEFAULT_SPREADSHEET_ID;
    const driveFolderId = payload.driveFolderId || DEFAULT_DRIVE_FOLDER_ID;
    ensureSheets_(spreadsheetId);

    if (payload.action === "list") {
      return json_({ ok: true, tables: listTables_(spreadsheetId) });
    }

    if (payload.action === "upsert") {
      assertCanWrite_(spreadsheetId, payload.user, payload.table);
      const record = upsert_(spreadsheetId, driveFolderId, payload.table, payload.record);
      return json_({ ok: true, record });
    }

    return json_({ ok: false, error: "Bilinmeyen action." });
  } catch (error) {
    return json_({ ok: false, error: error.message });
  }
}

function doGet() {
  try {
    ensureSheets_(DEFAULT_SPREADSHEET_ID);
    return json_({ ok: true, tables: listTables_(DEFAULT_SPREADSHEET_ID) });
  } catch (error) {
    return json_({ ok: false, error: error.message });
  }
}

function setup() {
  ensureSheets_(DEFAULT_SPREADSHEET_ID);
}

function ensureSheets_(spreadsheetId) {
  const ss = SpreadsheetApp.openById(spreadsheetId);
  Object.keys(SCHEMA).forEach((name) => {
    const sheet = ss.getSheetByName(name) || ss.insertSheet(name);
    const headers = SCHEMA[name];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  });
}

function listTables_(spreadsheetId) {
  const ss = SpreadsheetApp.openById(spreadsheetId);
  return Object.keys(SCHEMA).reduce((tables, name) => {
    tables[name] = readSheet_(ss.getSheetByName(name), SCHEMA[name]);
    return tables;
  }, {});
}

function readSheet_(sheet, headers) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  const rows = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
  return rows
    .filter((row) => row.some((cell) => cell !== ""))
    .map((row) => {
      return headers.reduce((record, header, index) => {
        record[header] = row[index] instanceof Date ? formatDate_(row[index]) : row[index];
        return record;
      }, {});
    });
}

function upsert_(spreadsheetId, driveFolderId, table, record) {
  if (!SCHEMA[table]) throw new Error("Geçersiz tablo: " + table);
  const ss = SpreadsheetApp.openById(spreadsheetId);
  const sheet = ss.getSheetByName(table);
  const headers = SCHEMA[table];
  const cleanRecord = { ...record };

  if (table === "documents" && cleanRecord.fileData && cleanRecord.fileName) {
    cleanRecord.fileUrl = saveFile_(driveFolderId, cleanRecord);
    delete cleanRecord.fileData;
  }

  if (table === "reports" && cleanRecord.fileData && cleanRecord.fileName) {
    cleanRecord.attachmentUrl = saveFile_(driveFolderId, {
      ...cleanRecord,
      title: cleanRecord.attachmentName || cleanRecord.fileName,
    });
    delete cleanRecord.fileData;
  }

  const existingRow = table === "users" ? findRowByFirstColumn_(sheet, cleanRecord.email) : findRowById_(sheet, cleanRecord.id);
  const values = headers.map((header) => cleanRecord[header] || "");
  if (existingRow > 0) {
    sheet.getRange(existingRow, 1, 1, headers.length).setValues([values]);
  } else {
    sheet.appendRow(values);
  }

  return cleanRecord;
}

function saveFile_(driveFolderId, record) {
  const folder = DriveApp.getFolderById(driveFolderId);
  const bytes = Utilities.base64Decode(record.fileData);
  const blob = Utilities.newBlob(bytes, record.mimeType || MimeType.PLAIN_TEXT, record.fileName);
  const file = folder.createFile(blob);
  file.setDescription("Şantiye Operasyon Merkezi kaydı: " + (record.title || record.id));
  return file.getUrl();
}

function findRowById_(sheet, id) {
  return findRowByFirstColumn_(sheet, id);
}

function findRowByFirstColumn_(sheet, value) {
  if (!value || sheet.getLastRow() < 2) return -1;
  const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();
  const index = values.findIndex((row) => row[0] === value);
  return index >= 0 ? index + 2 : -1;
}

function assertCanWrite_(spreadsheetId, user, table) {
  const email = (user && user.email ? user.email : "").toLowerCase();
  const role = user && user.role ? user.role : "";
  if (role === "admin") return;

  const ss = SpreadsheetApp.openById(spreadsheetId);
  const users = readSheet_(ss.getSheetByName("users"), SCHEMA.users);
  const entry = users.find((item) => String(item.email).toLowerCase() === email && item.status !== "passive");
  if (!entry) throw new Error("Bu kullanıcı için izin bulunamadı.");
  if (entry.role === "admin" || entry.role === "editor") return;
  throw new Error(table + " tablosuna yazma yetkiniz yok.");
}

function formatDate_(date) {
  return Utilities.formatDate(date, Session.getScriptTimeZone(), "yyyy-MM-dd");
}

function json_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}
