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
html = replace(html, '<div class="panel-body"><div class="records-list" id="document-records"></div></div>', '<div class="panel-body"><div class="form-row cols-2 compact-row"><label class="field"><span>Şantiye</span><select id="document-project-filter"></select></label><label class="field"><span>Evrak Türü</span><select id="document-type-filter"></select></label></div><div class="records-list" id="document-records"></div></div>')
write("index.html", html)

app = read("assets/scripts/app.js")
app = replace(app, '''  documentForm: document.getElementById("document-form"),
  documentProject: document.getElementById("document-project"),
  documentRecords:''', '''  documentForm: document.getElementById("document-form"),
  documentProject: document.getElementById("document-project"),
  documentProjectFilter: document.getElementById("document-project-filter"),
  documentTypeFilter: document.getElementById("document-type-filter"),
  documentRecords:''')
app = replace(app, '''  els.documentForm.addEventListener("submit", onSaveDocument);
  els.notificationBtn.addEventListener("click", requestNotifications);''', '''  els.documentForm.addEventListener("submit", onSaveDocument);
  [els.documentProjectFilter, els.documentTypeFilter].forEach((el) => el.addEventListener("input", renderDocuments));
  els.notificationBtn.addEventListener("click", requestNotifications);''')
app = replace(app, '''  els.recordProjectFilter.innerHTML = filterOptions;''', '''  els.recordProjectFilter.innerHTML = filterOptions;
  els.documentProjectFilter.innerHTML = filterOptions;
  renderDocumentTypeOptions();''')
start = app.index("function renderDocuments() {")
end = app.index("\nfunction renderDocumentCard", start)
app = app[:start] + r'''function renderDocuments() {
  if (!els.documentRecords) return;
  renderDocumentTypeOptions();
  const projectFilter = els.documentProjectFilter.value || "all";
  const typeFilter = els.documentTypeFilter.value || "all";
  const filteredDocuments = state.documents.filter((item) => {
    if (projectFilter !== "all" && item.projectId !== projectFilter) return false;
    if (typeFilter !== "all" && normalizeDocumentType(item.type) !== typeFilter) return false;
    return true;
  });
  els.documentRecords.innerHTML = filteredDocuments.length
    ? filteredDocuments.slice().sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")).map(renderDocumentCard).join("")
    : emptyState("Seçili filtrelere uygun evrak bulunamadı.");
}

function renderDocumentTypeOptions() {
  if (!els.documentTypeFilter) return;
  const current = els.documentTypeFilter.value || "all";
  const types = [...new Map(state.documents
    .map((item) => String(item.type || "Evrak").trim())
    .filter(Boolean)
    .map((type) => [normalizeDocumentType(type), type])).entries()]
    .sort((a, b) => a[1].localeCompare(b[1], "tr-TR"));
  els.documentTypeFilter.innerHTML = ['<option value="all">Tüm Evrak Türleri</option>']
    .concat(types.map(([value, label]) => `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`))
    .join("");
  els.documentTypeFilter.value = types.some(([value]) => value === current) ? current : "all";
}

function normalizeDocumentType(type) {
  return String(type || "Evrak").trim().toLocaleLowerCase("tr-TR");
}
''' + app[end:]
write("assets/scripts/app.js", app)

for cleanup in [".github/workflows/codex-document-filters.yml", ".github/scripts/codex_patch_document_filters.py", ".codex-document-filters-trigger"]:
    path = Path(cleanup)
    if path.exists():
        path.unlink()
