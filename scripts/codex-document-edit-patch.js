const fs = require("fs");

function read(path) {
  return fs.readFileSync(path, "utf8");
}

function write(path, content) {
  fs.writeFileSync(path, content);
}

function replaceOnce(content, search, replacement, label) {
  if (!content.includes(search)) throw new Error(`Missing marker: ${label}`);
  return content.replace(search, replacement);
}

function replaceRegex(content, regex, replacement, label) {
  if (!regex.test(content)) throw new Error(`Missing pattern: ${label}`);
  return content.replace(regex, replacement);
}

function patchHtml() {
  let html = read("index.html");
  if (!html.includes('id="document-id"')) {
    html = replaceOnce(
      html,
      '<form id="document-form" class="panel-body form-grid">',
      '<form id="document-form" class="panel-body form-grid"><input type="hidden" id="document-id" name="id">',
      "document hidden id"
    );
  }
  if (!html.includes('id="document-submit-btn"')) {
    html = replaceOnce(
      html,
      '<div class="form-actions"><button type="reset" class="btn btn-secondary">Temizle</button><button type="submit" class="btn btn-primary">Evrakı Kaydet</button></div></form></div>',
      '<div class="form-actions"><button type="reset" class="btn btn-secondary">Temizle</button><button type="button" class="btn btn-secondary hidden" id="document-cancel-edit-btn">Düzenlemeyi İptal Et</button><button type="submit" class="btn btn-primary" id="document-submit-btn">Evrakı Kaydet</button></div></form></div>',
      "document form actions"
    );
  }
  write("index.html", html);
}

function patchApp() {
  let js = read("assets/scripts/app.js");
  if (!js.includes('documentId: document.getElementById("document-id")')) {
    js = replaceOnce(
      js,
      'documentForm: document.getElementById("document-form"),\n  documentProject: document.getElementById("document-project"),',
      'documentForm: document.getElementById("document-form"),\n  documentId: document.getElementById("document-id"),\n  documentProject: document.getElementById("document-project"),\n  documentTitle: document.getElementById("document-title"),\n  documentType: document.getElementById("document-type"),\n  documentUrl: document.getElementById("document-url"),\n  documentNote: document.getElementById("document-note"),\n  documentSubmitBtn: document.getElementById("document-submit-btn"),\n  documentCancelEditBtn: document.getElementById("document-cancel-edit-btn"),',
      "document els"
    );
  }
  if (!js.includes("clearDocumentEditState")) {
    js = replaceOnce(
      js,
      'els.documentForm.addEventListener("submit", onSaveDocument);\n  [els.documentProjectFilter, els.documentTypeFilter].forEach((el) => el.addEventListener("input", renderDocuments));',
      'els.documentForm.addEventListener("submit", onSaveDocument);\n  els.documentForm.addEventListener("reset", () => window.setTimeout(clearDocumentEditState, 0));\n  els.documentCancelEditBtn.addEventListener("click", resetDocumentForm);\n  [els.documentProjectFilter, els.documentTypeFilter].forEach((el) => el.addEventListener("input", renderDocuments));',
      "document events"
    );
  }
  if (!js.includes('sendToApi(existingId ? "updateDocument"')) {
    js = replaceRegex(
      js,
      /async function onSaveDocument\(event\) \{[\s\S]*?\n\}\n\nfunction renderDocuments\(\) \{/,
      `async function onSaveDocument(event) {
  event.preventDefault();
  if (!requireAuth() || !requireProjects()) return;
  const form = new FormData(els.documentForm);
  const title = String(form.get("title") || "").trim();
  if (!title) return showToast("Evrak adı gerekli.");
  const existingId = String(form.get("id") || "");
  const existingDocument = state.documents.find((item) => item.id === existingId);
  const payload = {
    id: existingId || crypto.randomUUID(),
    projectId: form.get("projectId"),
    title,
    type: form.get("type") || "",
    url: form.get("url") || "",
    note: form.get("note") || "",
    createdById: existingDocument?.createdById || state.currentUser.id,
    createdAt: existingDocument?.createdAt || new Date().toISOString(),
    updatedAt: existingId ? new Date().toISOString() : ""
  };
  const remoteSaved = await sendToApi(existingId ? "updateDocument" : "saveDocument", payload);
  if (existingId) {
    state.documents = state.documents.map((item) => item.id === existingId ? payload : item);
  } else {
    state.documents.push(payload);
  }
  persist(STORAGE_KEYS.documents, state.documents);
  renderAll();
  resetDocumentForm();
  showToast(remoteSaved ? "Evrak kaydedildi." : "Evrak yerelde kaydedildi.");
}

function renderDocuments() {`,
      "onSaveDocument"
    );
  }
  if (!js.includes("function editDocument(documentId)")) {
    js = replaceRegex(
      js,
      /function renderDocumentCard\(item\) \{[\s\S]*?\n\}\n\nasync function deleteDocument\(documentId\) \{/,
      `function renderDocumentCard(item) {
  const link = item.url ? \`<a class="btn btn-secondary" href="\${escapeHtml(item.url)}" target="_blank" rel="noreferrer" onclick="event.stopPropagation();">Aç</a>\` : "";
  return \`
    <article class="record-card" onclick="window.__somActions.editDocument('\${item.id}')">
      <div class="record-title">
        <strong>\${escapeHtml(item.title)}</strong>
        <span class="tag">\${escapeHtml(item.type || "Evrak")}</span>
      </div>
      <div class="record-meta">\${escapeHtml(projectName(item.projectId))} · \${escapeHtml(formatDateTime(item.createdAt))}</div>
      <div class="record-meta">\${escapeHtml(item.note || "-")}</div>
      <div class="record-footer">
        <button class="btn btn-secondary" type="button" onclick="event.stopPropagation(); window.__somActions.editDocument('\${item.id}')">Düzenle</button>
        \${link}
        <button class="btn btn-secondary" type="button" onclick="event.stopPropagation(); window.__somActions.deleteDocument('\${item.id}')">Sil</button>
      </div>
    </article>
  \`;
}

function editDocument(documentId) {
  const item = state.documents.find((documentItem) => documentItem.id === documentId);
  if (!item) return;
  setView("documents");
  els.documentId.value = item.id;
  els.documentProject.value = item.projectId || "";
  els.documentTitle.value = item.title || "";
  els.documentType.value = item.type || "Rapor";
  els.documentUrl.value = item.url || "";
  els.documentNote.value = item.note || "";
  els.documentSubmitBtn.textContent = "Evrakı Güncelle";
  els.documentCancelEditBtn.classList.remove("hidden");
  els.documentForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

function resetDocumentForm() {
  els.documentForm.reset();
  clearDocumentEditState();
}

function clearDocumentEditState() {
  els.documentId.value = "";
  els.documentSubmitBtn.textContent = "Evrakı Kaydet";
  els.documentCancelEditBtn.classList.add("hidden");
}

async function deleteDocument(documentId) {`,
      "document card/edit functions"
    );
  }
  if (!js.includes("  editDocument,\n  deleteDocument")) {
    js = replaceOnce(
      js,
      "  editOrder,\n  deleteDocument",
      "  editOrder,\n  editDocument,\n  deleteDocument",
      "som actions"
    );
  }
  write("assets/scripts/app.js", js);
}

function patchGas() {
  let gas = read("google-apps-script.gs");
  if (!gas.includes('action === "updateDocument"')) {
    gas = replaceOnce(
      gas,
      'if (action === "saveDocument") { saveDocument(payload); return jsonOutput({ ok: true }); }\n    if (action === "deleteDocument")',
      'if (action === "saveDocument") { saveDocument(payload); return jsonOutput({ ok: true }); }\n    if (action === "updateDocument") { updateDocument(payload); return jsonOutput({ ok: true }); }\n    if (action === "deleteDocument")',
      "updateDocument action"
    );
  }
  if (!gas.includes("function updateDocument(payload)")) {
    gas = replaceOnce(
      gas,
      'function saveDocument(payload) { getSheet_(SHEETS.documents).appendRow([payload.id || Utilities.getUuid(), payload.projectId || "", payload.title || "", payload.type || "", payload.url || "", payload.note || "", payload.createdById || "", payload.createdAt || new Date().toISOString()]); }\n\nfunction deleteDocument(payload) {',
      `function saveDocument(payload) { getSheet_(SHEETS.documents).appendRow([payload.id || Utilities.getUuid(), payload.projectId || "", payload.title || "", payload.type || "", payload.url || "", payload.note || "", payload.createdById || "", payload.createdAt || new Date().toISOString()]); }

function updateDocument(payload) {
  const sheet = getSheet_(SHEETS.documents);
  const rowIndex = findRowIndexById_(sheet, payload.id);
  if (!rowIndex) { saveDocument(payload); return; }
  sheet.getRange(rowIndex, 1, 1, 8).setValues([[payload.id || "", payload.projectId || "", payload.title || "", payload.type || "", payload.url || "", payload.note || "", payload.createdById || "", payload.createdAt || new Date().toISOString()]]);
}

function deleteDocument(payload) {`,
      "updateDocument function"
    );
  }
  write("google-apps-script.gs", gas);
}

patchHtml();
patchApp();
patchGas();
