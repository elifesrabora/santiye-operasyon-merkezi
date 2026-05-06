from pathlib import Path


def read(path):
    return Path(path).read_text()


def write(path, text):
    Path(path).write_text(text)


def replace(text, old, new):
    if old not in text:
        raise SystemExit(f"Pattern not found:\n{old[:240]}")
    return text.replace(old, new, 1)


html = read("index.html")
html = replace(html, '''            <div class="form-row cols-2">
              <label class="field">
                <span>PDF Yükle</span>
                <input type="file" id="report-pdf-file" name="pdfFile" accept="application/pdf">
              </label>
              <label class="field">
                <span>Google Drive PDF Linki</span>
                <input type="url" id="report-pdf-url" name="pdfUrl" placeholder="https://drive.google.com/...">
              </label>
            </div>''', '''            <div class="form-row cols-2">
              <label class="field">
                <span>PDF Yükle</span>
                <input type="file" id="report-pdf-file" name="pdfFile" accept="application/pdf">
              </label>
              <label class="field">
                <span>Google Drive PDF Linki</span>
                <input type="url" id="report-pdf-url" name="pdfUrl" placeholder="https://drive.google.com/...">
              </label>
            </div>
            <div class="info-card hidden" id="report-current-pdf"></div>''')
write("index.html", html)

app = read("assets/scripts/app.js")
app = replace(app, '  reportPdfUrl: document.getElementById("report-pdf-url"),', '  reportPdfUrl: document.getElementById("report-pdf-url"),\n  reportCurrentPdf: document.getElementById("report-current-pdf"),')
app = replace(app, '''  if (apiResult?.report) {
    Object.assign(payload, {
      attachmentName: apiResult.report.attachmentName || payload.attachmentName,
      attachmentUrl: apiResult.report.attachmentUrl || payload.attachmentUrl,
      attachmentSource: apiResult.report.attachmentSource || payload.attachmentSource,
      attachmentUploadedAt: apiResult.report.attachmentUploadedAt || payload.attachmentUploadedAt
    });
  }
  delete payload.attachmentFile;''', '''  if (apiResult?.report) {
    Object.assign(payload, {
      attachmentName: apiResult.report.attachmentName || payload.attachmentName,
      attachmentUrl: apiResult.report.attachmentUrl || payload.attachmentUrl,
      attachmentSource: apiResult.report.attachmentSource || payload.attachmentSource,
      attachmentUploadedAt: apiResult.report.attachmentUploadedAt || payload.attachmentUploadedAt
    });
  }
  if (attachment.file && !payload.attachmentUrl) {
    showToast("PDF Drive'a yüklenemedi. Apps Script'i güncel deploy edin.");
    return;
  }
  delete payload.attachmentFile;''')
app = replace(app, '  els.reportPdfUrl.value = report.attachmentSource === "drive" ? (report.attachmentUrl || "") : "";\n  els.reportPdfFile.value = "";', '  els.reportPdfUrl.value = report.attachmentUrl || "";\n  els.reportPdfFile.value = "";\n  renderCurrentReportPdf(report);')
app = replace(app, '''  els.reportPdfFile.value = "";
  els.reportPdfUrl.value = "";
  els.reportSubmitBtn.textContent = "Raporu Kaydet";''', '''  els.reportPdfFile.value = "";
  els.reportPdfUrl.value = "";
  renderCurrentReportPdf(null);
  els.reportSubmitBtn.textContent = "Raporu Kaydet";''')
app = replace(app, "\nfunction addWorker(worker = null) {", r'''
function renderCurrentReportPdf(report) {
  if (!els.reportCurrentPdf) return;
  if (!report?.attachmentUrl) {
    els.reportCurrentPdf.classList.add("hidden");
    els.reportCurrentPdf.innerHTML = "";
    return;
  }
  els.reportCurrentPdf.classList.remove("hidden");
  els.reportCurrentPdf.innerHTML = `
    <strong>Mevcut PDF:</strong>
    <a href="${escapeHtml(report.attachmentUrl)}" target="_blank" rel="noreferrer">${escapeHtml(report.attachmentName || "PDF dosyası")}</a>
  `;
}

function addWorker(worker = null) {''')
write("assets/scripts/app.js", app)

for cleanup in [".github/workflows/codex-report-pdf-persistence.yml", ".github/scripts/codex_patch_report_pdf_persistence.py", ".codex-report-pdf-persistence-trigger"]:
    path = Path(cleanup)
    if path.exists():
        path.unlink()
