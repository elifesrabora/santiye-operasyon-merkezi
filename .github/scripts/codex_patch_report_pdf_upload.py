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
    text = replace(
        text,
        '''            <div class="form-actions">
              <button type="reset" class="btn btn-secondary">Temizle</button>''',
        '''            <div class="form-row cols-2">
              <label class="field">
                <span>PDF Yükle</span>
                <input type="file" id="report-pdf-file" name="pdfFile" accept="application/pdf">
              </label>
              <label class="field">
                <span>Google Drive PDF Linki</span>
                <input type="url" id="report-pdf-url" name="pdfUrl" placeholder="https://drive.google.com/...">
              </label>
            </div>

            <div class="form-actions">
              <button type="reset" class="btn btn-secondary">Temizle</button>''',
    )
    write("index.html", text)


def patch_app():
    text = read("assets/scripts/app.js")
    text = replace(text, '  reportPdfBtn: document.getElementById("report-pdf-btn"),', '  reportPdfBtn: document.getElementById("report-pdf-btn"),\n  reportPdfFile: document.getElementById("report-pdf-file"),\n  reportPdfUrl: document.getElementById("report-pdf-url"),')
    text = replace(text, '      <div class="record-meta">Kaydı giren: ${escapeHtml(userName(item.createdById))}</div>\n      <div class="record-footer">', '      <div class="record-meta">Kaydı giren: ${escapeHtml(userName(item.createdById))}</div>\n      ${item.attachmentUrl ? `<div class="record-meta">Ek PDF: <a href="${escapeHtml(item.attachmentUrl)}" target="_blank" rel="noreferrer" onclick="event.stopPropagation();">${escapeHtml(item.attachmentName || "PDF dosyası")}</a></div>` : ""}\n      <div class="record-footer">')
    text = replace(text, '        <button class="btn btn-secondary" type="button" onclick="event.stopPropagation(); window.__somActions.editReport(\'${item.id}\')">Düzenle</button>\n        <button class="btn btn-secondary" type="button" onclick="event.stopPropagation(); window.__somPdf.exportReport(\'${item.id}\')">PDF Al</button>', '        <button class="btn btn-secondary" type="button" onclick="event.stopPropagation(); window.__somActions.editReport(\'${item.id}\')">Düzenle</button>\n        ${item.attachmentUrl ? `<a class="btn btn-secondary" href="${escapeHtml(item.attachmentUrl)}" target="_blank" rel="noreferrer" onclick="event.stopPropagation();">Yüklü PDF</a>` : ""}\n        <button class="btn btn-secondary" type="button" onclick="event.stopPropagation(); window.__somPdf.exportReport(\'${item.id}\')">PDF Al</button>')
    start = text.index("async function onSaveReport(event) {")
    end = text.index("function editReport", start)
    text = text[:start] + r'''async function onSaveReport(event) {
  event.preventDefault();
  if (!requireAuth() || !requireProjects()) return;
  const form = new FormData(els.reportForm);
  const existingId = String(form.get("id") || "");
  const existingReport = state.reports.find((item) => item.id === existingId);
  let attachment;
  try {
    attachment = await buildReportAttachment(existingReport);
  } catch (error) {
    showToast(error.message);
    return;
  }
  const payload = {
    id: existingId || crypto.randomUUID(),
    projectId: form.get("projectId"),
    date: form.get("date"),
    workingHours: form.get("workingHours"),
    workSummary: form.get("workSummary"),
    nextPlan: form.get("nextPlan"),
    incident: form.get("incident"),
    notes: form.get("notes"),
    attachmentName: attachment.name,
    attachmentUrl: attachment.url,
    attachmentSource: attachment.source,
    attachmentUploadedAt: attachment.uploadedAt,
    attachmentFile: attachment.file,
    createdById: existingId ? (existingReport?.createdById || state.currentUser.id) : state.currentUser.id,
    createdAt: existingId ? (existingReport?.createdAt || new Date().toISOString()) : new Date().toISOString(),
    updatedAt: existingId ? new Date().toISOString() : ""
  };
  const apiResult = await sendToApi(existingId ? "updateReport" : "saveReport", payload);
  const remoteSaved = Boolean(apiResult);
  if (apiResult?.report) {
    Object.assign(payload, {
      attachmentName: apiResult.report.attachmentName || payload.attachmentName,
      attachmentUrl: apiResult.report.attachmentUrl || payload.attachmentUrl,
      attachmentSource: apiResult.report.attachmentSource || payload.attachmentSource,
      attachmentUploadedAt: apiResult.report.attachmentUploadedAt || payload.attachmentUploadedAt
    });
  }
  delete payload.attachmentFile;
  if (existingId) state.reports = state.reports.map((item) => item.id === existingId ? payload : item);
  else state.reports.push(payload);
  persist(STORAGE_KEYS.reports, state.reports);
  renderAll();
  resetReportForm();
  showToast(remoteSaved ? "Saha raporu kaydedildi." : "Saha raporu yerelde kaydedildi.");
}

async function buildReportAttachment(existingReport = null) {
  const file = els.reportPdfFile.files?.[0] || null;
  const url = els.reportPdfUrl.value.trim();
  if (file && file.type !== "application/pdf") throw new Error("Sadece PDF dosyası yükleyebilirsiniz.");
  if (file && (!state.settings.apiBaseUrl || !state.settings.apiToken)) throw new Error("Bilgisayardan PDF yüklemek için Apps Script bağlantısı gerekli.");
  if (file) {
    return {
      name: file.name,
      url: existingReport?.attachmentUrl || "",
      source: "upload",
      uploadedAt: new Date().toISOString(),
      file: {
        name: file.name,
        mimeType: file.type || "application/pdf",
        data: await fileToBase64(file)
      }
    };
  }
  if (url) {
    return {
      name: existingReport?.attachmentName || "Drive PDF",
      url,
      source: "drive",
      uploadedAt: existingReport?.attachmentUploadedAt || new Date().toISOString(),
      file: null
    };
  }
  return {
    name: existingReport?.attachmentName || "",
    url: existingReport?.attachmentUrl || "",
    source: existingReport?.attachmentSource || "",
    uploadedAt: existingReport?.attachmentUploadedAt || "",
    file: null
  };
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || "").split(",")[1] || "");
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

''' + text[end:]
    text = replace(text, '  els.reportForm.elements.notes.value = report.notes || "";\n  els.reportSubmitBtn.textContent = "Raporu Güncelle";', '  els.reportForm.elements.notes.value = report.notes || "";\n  els.reportPdfUrl.value = report.attachmentSource === "drive" ? (report.attachmentUrl || "") : "";\n  els.reportPdfFile.value = "";\n  els.reportSubmitBtn.textContent = "Raporu Güncelle";')
    text = replace(text, '  els.reportDate.value = todayStr();\n  els.reportSubmitBtn.textContent = "Raporu Kaydet";', '  els.reportDate.value = todayStr();\n  els.reportPdfFile.value = "";\n  els.reportPdfUrl.value = "";\n  els.reportSubmitBtn.textContent = "Raporu Kaydet";')
    text = replace(text, '  pdfSectionTable(doc, "Ek Notlar", report.notes || "-", notesY);\n  doc.save(`SahaRaporu_${safeName(projectName(report.projectId))}_${report.date}.pdf`);', '  pdfSectionTable(doc, "Ek Notlar", report.notes || "-", notesY);\n  if (report.attachmentUrl) {\n    const attachmentY = getLastAutoTableY(doc, notesY) + 16;\n    pdfKeyValueTable(doc, attachmentY, [\n      ["Ek PDF", report.attachmentName || "PDF dosyası"],\n      ["PDF Linki", report.attachmentUrl]\n    ]);\n  }\n  doc.save(`SahaRaporu_${safeName(projectName(report.projectId))}_${report.date}.pdf`);')
    text = replace(text, '    if (!response.ok) throw new Error(`HTTP ${response.status}`);\n    state.apiHealth = "ok";\n    setConnectionPill();\n    return true;', '    if (!response.ok) throw new Error(`HTTP ${response.status}`);\n    const result = await response.json().catch(() => ({ ok: true }));\n    if (result.ok === false) throw new Error(result.error || "API hatası");\n    state.apiHealth = "ok";\n    setConnectionPill();\n    return result;')
    write("assets/scripts/app.js", text)


def patch_gas():
    text = read("google-apps-script.gs")
    text = replace(text, 'Reports: ["id", "projectId", "date", "workingHours", "workSummary", "nextPlan", "incident", "notes", "createdById", "createdAt"],', 'Reports: ["id", "projectId", "date", "workingHours", "workSummary", "nextPlan", "incident", "notes", "createdById", "createdAt", "attachmentName", "attachmentUrl", "attachmentSource", "attachmentUploadedAt"],')
    text = replace(text, '      saveReport(payload);\n      return jsonOutput({ ok: true });', '      return jsonOutput({ ok: true, report: saveReport(payload) });')
    text = replace(text, 'if (action === "updateReport") { updateReport(payload); return jsonOutput({ ok: true }); }', 'if (action === "updateReport") { return jsonOutput({ ok: true, report: updateReport(payload) }); }')
    text = replace(text, '      notes: row[7] || "",\n      createdById: row[8] || "",\n      createdAt: row[9] || ""', '      notes: row[7] || "",\n      createdById: row[8] || "",\n      createdAt: row[9] || "",\n      attachmentName: row[10] || "",\n      attachmentUrl: row[11] || "",\n      attachmentSource: row[12] || "",\n      attachmentUploadedAt: row[13] || ""')
    text = replace(text, "function saveReport(payload) {\n  getSheet_(SHEETS.reports).appendRow([", "function saveReport(payload) {\n  payload = prepareReportAttachment_(payload);\n  getSheet_(SHEETS.reports).appendRow([")
    text = replace(text, '    payload.createdById || "",\n    payload.createdAt || new Date().toISOString()\n  ]);\n}', '    payload.createdById || "",\n    payload.createdAt || new Date().toISOString(),\n    payload.attachmentName || "",\n    payload.attachmentUrl || "",\n    payload.attachmentSource || "",\n    payload.attachmentUploadedAt || ""\n  ]);\n  return sanitizeReportPayload_(payload);\n}')
    start = text.index("function updateReport(payload) {")
    end = text.index("\nfunction savePuantaj", start)
    text = text[:start] + r'''function updateReport(payload) {
  payload = prepareReportAttachment_(payload);
  const sheet = getSheet_(SHEETS.reports);
  const rowIndex = findRowIndexById_(sheet, payload.id);
  if (!rowIndex) return saveReport(payload);
  sheet.getRange(rowIndex, 1, 1, 14).setValues([[
    payload.id || "",
    payload.projectId || "",
    payload.date || "",
    payload.workingHours || "",
    payload.workSummary || "",
    payload.nextPlan || "",
    payload.incident || "",
    payload.notes || "",
    payload.createdById || "",
    payload.createdAt || new Date().toISOString(),
    payload.attachmentName || "",
    payload.attachmentUrl || "",
    payload.attachmentSource || "",
    payload.attachmentUploadedAt || ""
  ]]);
  return sanitizeReportPayload_(payload);
}
''' + text[end:]
    text = replace(text, "\nfunction savePuantaj(payload) {", r'''
function prepareReportAttachment_(payload) {
  if (!payload.attachmentFile || !payload.attachmentFile.data) return payload;
  const file = payload.attachmentFile;
  const bytes = Utilities.base64Decode(file.data);
  const blob = Utilities.newBlob(bytes, file.mimeType || "application/pdf", file.name || "saha-raporu.pdf");
  const driveFile = DriveApp.createFile(blob);
  try {
    driveFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (error) {}
  payload.attachmentName = file.name || payload.attachmentName || driveFile.getName();
  payload.attachmentUrl = driveFile.getUrl();
  payload.attachmentSource = "upload";
  payload.attachmentUploadedAt = payload.attachmentUploadedAt || new Date().toISOString();
  delete payload.attachmentFile;
  return payload;
}

function sanitizeReportPayload_(payload) {
  return {
    id: payload.id || "",
    attachmentName: payload.attachmentName || "",
    attachmentUrl: payload.attachmentUrl || "",
    attachmentSource: payload.attachmentSource || "",
    attachmentUploadedAt: payload.attachmentUploadedAt || ""
  };
}

function savePuantaj(payload) {''')
    write("google-apps-script.gs", text)


patch_html()
patch_app()
patch_gas()

for cleanup in [".github/workflows/codex-report-pdf-upload.yml", ".github/scripts/codex_patch_report_pdf_upload.py", ".codex-report-pdf-upload-trigger"]:
    path = Path(cleanup)
    if path.exists():
        path.unlink()
