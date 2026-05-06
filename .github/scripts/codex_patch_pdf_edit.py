from pathlib import Path


def read(path):
    return Path(path).read_text()


def write(path, text):
    Path(path).write_text(text)


def replace(text, old, new):
    if old not in text:
        raise SystemExit(f"Pattern not found:\n{old[:240]}")
    return text.replace(old, new, 1)


def patch_html():
    text = read("index.html")
    text = replace(text, '<form id="report-form" class="panel-body form-grid">\n            <div class="info-card">', '<form id="report-form" class="panel-body form-grid">\n            <input type="hidden" id="report-id" name="id">\n            <div class="info-card">')
    text = replace(text, '              <button type="reset" class="btn btn-secondary">Temizle</button>\n              <button type="submit" class="btn btn-primary">Raporu Kaydet</button>', '              <button type="reset" class="btn btn-secondary">Temizle</button>\n              <button type="button" class="btn btn-secondary hidden" id="report-cancel-edit-btn">Düzenlemeyi İptal Et</button>\n              <button type="submit" class="btn btn-primary" id="report-submit-btn">Raporu Kaydet</button>')
    text = replace(text, '<form id="puantaj-meta-form" class="form-grid">\n              <div class="info-card">', '<form id="puantaj-meta-form" class="form-grid">\n              <input type="hidden" id="puantaj-id">\n              <div class="info-card">')
    text = replace(text, '              <button class="btn btn-secondary" id="export-puantaj-btn" type="button">CSV İndir</button>\n              <button class="btn btn-primary" id="save-puantaj-btn" type="button">Puantajı Kaydet</button>', '              <button class="btn btn-secondary" id="export-puantaj-btn" type="button">CSV İndir</button>\n              <button class="btn btn-secondary hidden" id="puantaj-cancel-edit-btn" type="button">Düzenlemeyi İptal Et</button>\n              <button class="btn btn-primary" id="save-puantaj-btn" type="button">Puantajı Kaydet</button>')
    write("index.html", text)


def patch_app():
    text = read("assets/scripts/app.js")
    text = replace(text, "const AUTO_SYNC_MS = 60000;", """const AUTO_SYNC_MS = 60000;
const PDF_FONT_FAMILY = "Roboto";
const PDF_FONT_FILES = {
  normal: {
    fileName: "Roboto-Regular.ttf",
    url: "https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/fonts/Roboto/Roboto-Regular.ttf"
  },
  bold: {
    fileName: "Roboto-Medium.ttf",
    url: "https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/fonts/Roboto/Roboto-Medium.ttf"
  }
};
let pdfFontPromise = null;
let pdfFontFamily = "helvetica";""")
    text = replace(text, '  reportForm: document.getElementById("report-form"),', '  reportForm: document.getElementById("report-form"),\n  reportId: document.getElementById("report-id"),')
    text = replace(text, '  reportPdfBtn: document.getElementById("report-pdf-btn"),', '  reportPdfBtn: document.getElementById("report-pdf-btn"),\n  reportSubmitBtn: document.getElementById("report-submit-btn"),\n  reportCancelEditBtn: document.getElementById("report-cancel-edit-btn"),')
    text = replace(text, '  puantajChiefLabel: document.getElementById("puantaj-chief-label"),', '  puantajChiefLabel: document.getElementById("puantaj-chief-label"),\n  puantajId: document.getElementById("puantaj-id"),')
    text = replace(text, '  savePuantajBtn: document.getElementById("save-puantaj-btn"),', '  savePuantajBtn: document.getElementById("save-puantaj-btn"),\n  puantajCancelEditBtn: document.getElementById("puantaj-cancel-edit-btn"),')
    text = replace(text, '  els.reportForm.addEventListener("submit", onSaveReport);\n  els.addWorkerBtn.addEventListener("click", () => addWorker());', '  els.reportForm.addEventListener("submit", onSaveReport);\n  els.reportForm.addEventListener("reset", () => window.setTimeout(clearReportEditState, 0));\n  els.reportCancelEditBtn.addEventListener("click", resetReportForm);\n  els.addWorkerBtn.addEventListener("click", () => addWorker());')
    text = replace(text, '  els.savePuantajBtn.addEventListener("click", onSavePuantaj);\n  els.exportPuantajBtn.addEventListener("click", exportPuantajCsv);', '  els.savePuantajBtn.addEventListener("click", onSavePuantaj);\n  els.puantajCancelEditBtn.addEventListener("click", resetPuantajForm);\n  els.exportPuantajBtn.addEventListener("click", exportPuantajCsv);')
    text = replace(text, '<article class="record-card">\n      <div class="record-title">\n        <strong>${escapeHtml(projectName(item.projectId))}</strong>', '<article class="record-card" onclick="window.__somActions.editReport(\'${item.id}\')">\n      <div class="record-title">\n        <strong>${escapeHtml(projectName(item.projectId))}</strong>')
    text = replace(text, '<button class="btn btn-secondary" type="button" onclick="window.__somPdf.exportReport(\'${item.id}\')">PDF Al</button>', '<button class="btn btn-secondary" type="button" onclick="event.stopPropagation(); window.__somActions.editReport(\'${item.id}\')">Düzenle</button>\n        <button class="btn btn-secondary" type="button" onclick="event.stopPropagation(); window.__somPdf.exportReport(\'${item.id}\')">PDF Al</button>')
    text = replace(text, '<article class="record-card">\n      <div class="record-title">\n        <strong>${escapeHtml(userName(item.createdById))}</strong>', '<article class="record-card" onclick="window.__somActions.editPuantaj(\'${item.id}\')">\n      <div class="record-title">\n        <strong>${escapeHtml(userName(item.createdById))}</strong>')
    text = replace(text, '<button class="btn btn-secondary" type="button" onclick="window.__somPdf.exportPuantaj(\'${item.id}\')">PDF Al</button>', '<button class="btn btn-secondary" type="button" onclick="event.stopPropagation(); window.__somActions.editPuantaj(\'${item.id}\')">Düzenle</button>\n        <button class="btn btn-secondary" type="button" onclick="event.stopPropagation(); window.__somPdf.exportPuantaj(\'${item.id}\')">PDF Al</button>')
    text = replace(text, '<article class="record-card">\n      <div class="record-title">\n        <strong>${escapeHtml(projectName(item.projectId))}</strong>', '<article class="record-card" onclick="window.__somActions.editOrder(\'${item.id}\')">\n      <div class="record-title">\n        <strong>${escapeHtml(projectName(item.projectId))}</strong>')
    text = replace(text, '<button class="btn btn-secondary" type="button" onclick="window.__somActions.editOrder(\'${item.id}\')">Düzenle</button>\n        <button class="btn btn-secondary" type="button" onclick="window.__somPdf.exportOrder(\'${item.id}\')">PDF Al</button>', '<button class="btn btn-secondary" type="button" onclick="event.stopPropagation(); window.__somActions.editOrder(\'${item.id}\')">Düzenle</button>\n        <button class="btn btn-secondary" type="button" onclick="event.stopPropagation(); window.__somPdf.exportOrder(\'${item.id}\')">PDF Al</button>')

    report_start = text.index("async function onSaveReport(event) {")
    report_end = text.index("function addWorker", report_start)
    text = text[:report_start] + r'''async function onSaveReport(event) {
  event.preventDefault();
  if (!requireAuth() || !requireProjects()) return;
  const form = new FormData(els.reportForm);
  const existingId = String(form.get("id") || "");
  const existingReport = state.reports.find((item) => item.id === existingId);
  const payload = {
    id: existingId || crypto.randomUUID(),
    projectId: form.get("projectId"),
    date: form.get("date"),
    workingHours: form.get("workingHours"),
    workSummary: form.get("workSummary"),
    nextPlan: form.get("nextPlan"),
    incident: form.get("incident"),
    notes: form.get("notes"),
    createdById: existingId ? (existingReport?.createdById || state.currentUser.id) : state.currentUser.id,
    createdAt: existingId ? (existingReport?.createdAt || new Date().toISOString()) : new Date().toISOString(),
    updatedAt: existingId ? new Date().toISOString() : ""
  };
  const remoteSaved = await sendToApi(existingId ? "updateReport" : "saveReport", payload);
  if (existingId) state.reports = state.reports.map((item) => item.id === existingId ? payload : item);
  else state.reports.push(payload);
  persist(STORAGE_KEYS.reports, state.reports);
  renderAll();
  resetReportForm();
  showToast(remoteSaved ? "Saha raporu kaydedildi." : "Saha raporu yerelde kaydedildi.");
}

function editReport(reportId) {
  const report = state.reports.find((item) => item.id === reportId);
  if (!report) return;
  setView("report");
  els.reportId.value = report.id;
  els.reportProject.value = report.projectId;
  els.reportDate.value = report.date || todayStr();
  els.reportForm.elements.workingHours.value = report.workingHours || "";
  els.reportForm.elements.workSummary.value = report.workSummary || "";
  els.reportForm.elements.nextPlan.value = report.nextPlan || "";
  els.reportForm.elements.incident.value = report.incident || "";
  els.reportForm.elements.notes.value = report.notes || "";
  els.reportSubmitBtn.textContent = "Raporu Güncelle";
  els.reportCancelEditBtn.classList.remove("hidden");
  els.reportForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

function resetReportForm() {
  els.reportForm.reset();
  clearReportEditState();
}

function clearReportEditState() {
  els.reportId.value = "";
  els.reportDate.value = todayStr();
  els.reportSubmitBtn.textContent = "Raporu Kaydet";
  els.reportCancelEditBtn.classList.add("hidden");
}

''' + text[report_end:]

    puantaj_start = text.index("async function onSavePuantaj() {")
    puantaj_end = text.index("function exportPuantajCsv()", puantaj_start)
    text = text[:puantaj_start] + r'''async function onSavePuantaj() {
  if (!requireAuth() || !requireProjects()) return;
  const workers = readWorkers();
  if (!workers.length) return showToast("Kaydetmek için en az bir personel girin.");
  const existingId = String(els.puantajId.value || "");
  const existingPuantaj = state.puantaj.find((item) => item.id === existingId);
  const payload = {
    id: existingId || crypto.randomUUID(),
    date: els.puantajDate.value || todayStr(),
    chiefId: existingId ? (existingPuantaj?.chiefId || state.currentUser.id) : state.currentUser.id,
    createdById: existingId ? (existingPuantaj?.createdById || state.currentUser.id) : state.currentUser.id,
    createdAt: existingId ? (existingPuantaj?.createdAt || new Date().toISOString()) : new Date().toISOString(),
    updatedAt: existingId ? new Date().toISOString() : "",
    workers
  };
  const remoteSaved = await sendToApi(existingId ? "updatePuantaj" : "savePuantaj", payload);
  if (existingId) state.puantaj = state.puantaj.map((item) => item.id === existingId ? payload : item);
  else state.puantaj.push(payload);
  persist(STORAGE_KEYS.puantaj, state.puantaj);
  renderAll();
  resetPuantajForm();
  showToast(remoteSaved ? "Puantaj kaydedildi." : "Puantaj yerelde kaydedildi.");
}

function editPuantaj(puantajId) {
  const item = state.puantaj.find((row) => row.id === puantajId);
  if (!item) return;
  setView("puantaj");
  els.puantajId.value = item.id;
  els.puantajDate.value = item.date || todayStr();
  els.workerList.innerHTML = "";
  (item.workers || []).forEach((worker) => addWorker(worker));
  if (!item.workers?.length) addWorker();
  els.savePuantajBtn.textContent = "Puantajı Güncelle";
  els.puantajCancelEditBtn.classList.remove("hidden");
  els.workerList.scrollIntoView({ behavior: "smooth", block: "start" });
}

function resetPuantajForm() {
  els.puantajId.value = "";
  els.puantajDate.value = todayStr();
  els.workerList.innerHTML = "";
  addWorker();
  els.savePuantajBtn.textContent = "Puantajı Kaydet";
  els.puantajCancelEditBtn.classList.add("hidden");
}

''' + text[puantaj_end:]

    create_start = text.index("async function createPdfDoc(subject) {")
    create_end = text.index("async function addPdfHeader", create_start)
    text = text[:create_start] + r'''async function createPdfDoc(subject) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  doc.setProperties({ title: subject, subject, author: state.currentUser?.name || "Ayazlar Yapı" });
  await registerPdfFonts(doc);
  try {
    doc.__logoDataUrl = await loadLogoDataUrl();
  } catch (error) {
    console.warn("Logo yüklenemedi.", error);
  }
  return doc;
}

async function registerPdfFonts(doc) {
  try {
    if (!pdfFontPromise) pdfFontPromise = Promise.all([loadPdfFont(PDF_FONT_FILES.normal), loadPdfFont(PDF_FONT_FILES.bold)]);
    const [regular, bold] = await pdfFontPromise;
    doc.addFileToVFS(PDF_FONT_FILES.normal.fileName, regular);
    doc.addFont(PDF_FONT_FILES.normal.fileName, PDF_FONT_FAMILY, "normal");
    doc.addFileToVFS(PDF_FONT_FILES.bold.fileName, bold);
    doc.addFont(PDF_FONT_FILES.bold.fileName, PDF_FONT_FAMILY, "bold");
    pdfFontFamily = PDF_FONT_FAMILY;
    doc.setFont(pdfFontFamily, "normal");
  } catch (error) {
    console.warn("PDF fontu yüklenemedi, varsayılan font kullanılacak.", error);
    pdfFontFamily = "helvetica";
  }
}

async function loadPdfFont(fontFile) {
  const response = await fetch(fontFile.url);
  if (!response.ok) throw new Error(`Font yüklenemedi: ${fontFile.url}`);
  return arrayBufferToBase64(await response.arrayBuffer());
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  return window.btoa(binary);
}

''' + text[create_end:]
    text = text.replace('doc.setFont("helvetica", "bold");', 'doc.setFont(pdfFontFamily, "bold");', 2)
    text = text.replace('doc.setFont("helvetica", "normal");', 'doc.setFont(pdfFontFamily, "normal");', 1)
    text = replace(text, '    font: "helvetica",', '    font: pdfFontFamily,')
    text = replace(text, "window.__somActions = {\n  editOrder\n};", "window.__somActions = {\n  editReport,\n  editPuantaj,\n  editOrder\n};")
    write("assets/scripts/app.js", text)


def patch_css():
    text = read("assets/styles/main.css")
    text = replace(text, ".record-card {\n  padding: 16px;\n  border: 1px solid var(--border);\n  border-radius: 16px;\n  background: linear-gradient(180deg, rgba(26, 34, 61, 0.88), rgba(18, 24, 43, 0.88));\n}", ".record-card {\n  padding: 16px;\n  border: 1px solid var(--border);\n  border-radius: 16px;\n  background: linear-gradient(180deg, rgba(26, 34, 61, 0.88), rgba(18, 24, 43, 0.88));\n  cursor: pointer;\n}")
    write("assets/styles/main.css", text)


def patch_gas():
    text = read("google-apps-script.gs")
    text = replace(text, '    if (action === "savePuantaj") {\n      savePuantaj(payload);\n      return jsonOutput({ ok: true });\n    }', '    if (action === "updateReport") { updateReport(payload); return jsonOutput({ ok: true }); }\n\n    if (action === "savePuantaj") {\n      savePuantaj(payload);\n      return jsonOutput({ ok: true });\n    }\n\n    if (action === "updatePuantaj") { updatePuantaj(payload); return jsonOutput({ ok: true }); }')
    text = replace(text, "function savePuantaj(payload) {", r'''function updateReport(payload) {
  const sheet = getSheet_(SHEETS.reports);
  const rowIndex = findRowIndexById_(sheet, payload.id);
  if (!rowIndex) { saveReport(payload); return; }
  sheet.getRange(rowIndex, 1, 1, 10).setValues([[payload.id || "", payload.projectId || "", payload.date || "", payload.workingHours || "", payload.workSummary || "", payload.nextPlan || "", payload.incident || "", payload.notes || "", payload.createdById || "", payload.createdAt || new Date().toISOString()]]);
}

function savePuantaj(payload) {''')
    text = replace(text, "function saveOrder(payload) {", r'''function updatePuantaj(payload) {
  const puantajSheet = getSheet_(SHEETS.puantaj);
  const puantajId = payload.id || Utilities.getUuid();
  const rowIndex = findRowIndexById_(puantajSheet, puantajId);
  if (!rowIndex) { savePuantaj(payload); return; }
  puantajSheet.getRange(rowIndex, 1, 1, 5).setValues([[puantajId, payload.date || "", payload.chiefId || "", payload.createdById || "", payload.createdAt || new Date().toISOString()]]);
  deleteRowsByFirstColumn_(getSheet_(SHEETS.workers), puantajId);
  (payload.workers || []).forEach(function(worker) { getSheet_(SHEETS.workers).appendRow([puantajId, worker.name || "", worker.projectId || "", worker.job || "", worker.status || "present"]); });
}

function saveOrder(payload) {''')
    text = replace(text, "function isAuthorized_(token) {", r'''function deleteRowsByFirstColumn_(sheet, value) {
  const lastRow = sheet.getLastRow();
  if (!value || lastRow < 2) return;
  const rows = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (var i = rows.length - 1; i >= 0; i -= 1) {
    if (String(rows[i][0]) === String(value)) sheet.deleteRow(i + 2);
  }
}

function isAuthorized_(token) {''')
    write("google-apps-script.gs", text)


patch_html()
patch_app()
patch_css()
patch_gas()

for cleanup in [".github/workflows/codex-pdf-edit-patch.yml", ".github/scripts/codex_patch_pdf_edit.py", ".codex-pdf-edit-trigger"]:
    path = Path(cleanup)
    if path.exists():
        path.unlink()
