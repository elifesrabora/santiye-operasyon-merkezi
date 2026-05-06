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
html = replace(html, '<input type="text" id="document-type" name="type" placeholder="Ruhsat / İrsaliye / Fotoğraf">', '''<select id="document-type" name="type">
                  <option value="Rapor">Rapor</option>
                  <option value="Sözleşme">Sözleşme</option>
                  <option value="Vekaletname">Vekaletname</option>
                  <option value="İrsaliye">İrsaliye</option>
                </select>''')
write("index.html", html)

app = read("assets/scripts/app.js")
app = replace(app, "const AUTO_SYNC_MS = 60000;", 'const AUTO_SYNC_MS = 60000;\nconst DEFAULT_DOCUMENT_TYPES = ["Rapor", "Sözleşme", "Vekaletname", "İrsaliye"];')
app = replace(app, '''  const types = [...new Map(state.documents
    .map((item) => String(item.type || "Evrak").trim())''', '''  const types = [...new Map(DEFAULT_DOCUMENT_TYPES
    .concat(state.documents.map((item) => String(item.type || "Evrak").trim()))''')
write("assets/scripts/app.js", app)

for cleanup in [".github/workflows/codex-document-type-choices.yml", ".github/scripts/codex_patch_document_type_choices.py", ".codex-document-type-choices-trigger"]:
    path = Path(cleanup)
    if path.exists():
        path.unlink()
