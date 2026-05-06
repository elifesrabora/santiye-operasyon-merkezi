from pathlib import Path


def read(path):
    return Path(path).read_text()


def write(path, text):
    Path(path).write_text(text)


def replace(text, old, new):
    if old not in text:
        raise SystemExit(f"Pattern not found:\n{old[:240]}")
    return text.replace(old, new, 1)


app = read("assets/scripts/app.js")
app = replace(app, '  const link = item.url ? `<a class="btn btn-secondary" href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">Aç</a>` : "";', '  const link = item.url ? `<a class="btn btn-secondary" href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer" onclick="event.stopPropagation();">Aç</a>` : "";')
app = replace(app, '      <div class="record-footer">${link}</div>', '''      <div class="record-footer">
        ${link}
        <button class="btn btn-secondary" type="button" onclick="event.stopPropagation(); window.__somActions.deleteDocument('${item.id}')">Sil</button>
      </div>''')
app = replace(app, "\nasync function requestNotifications() {", r'''
async function deleteDocument(documentId) {
  const item = state.documents.find((documentItem) => documentItem.id === documentId);
  if (!item) return;
  if (!window.confirm(`"${item.title}" evrak kaydı silinsin mi?`)) return;
  const remoteDeleted = await sendToApi("deleteDocument", { id: documentId });
  state.documents = state.documents.filter((documentItem) => documentItem.id !== documentId);
  persist(STORAGE_KEYS.documents, state.documents);
  renderAll();
  showToast(remoteDeleted ? "Evrak silindi." : "Evrak yerelden silindi.");
}

async function requestNotifications() {''')
app = replace(app, '''window.__somActions = {
  editReport,
  editPuantaj,
  editOrder
};''', '''window.__somActions = {
  editReport,
  editPuantaj,
  editOrder,
  deleteDocument
};''')
write("assets/scripts/app.js", app)

gas = read("google-apps-script.gs")
gas = replace(gas, '    if (action === "saveDocument") { saveDocument(payload); return jsonOutput({ ok: true }); }', '    if (action === "saveDocument") { saveDocument(payload); return jsonOutput({ ok: true }); }\n    if (action === "deleteDocument") { deleteDocument(payload); return jsonOutput({ ok: true }); }')
gas = replace(gas, "\nfunction saveProject(payload) {", r'''
function deleteDocument(payload) {
  deleteRowsByFirstColumn_(getSheet_(SHEETS.documents), payload.id);
}

function saveProject(payload) {''')
write("google-apps-script.gs", gas)

for cleanup in [".github/workflows/codex-delete-documents.yml", ".github/scripts/codex_patch_delete_documents.py", ".codex-delete-documents-trigger"]:
    path = Path(cleanup)
    if path.exists():
        path.unlink()
