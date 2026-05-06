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
    text = replace(text, '''          </form>
        </div>
      </section>''', '''          </form>
        </div>

        <div class="panel" style="margin-top: 16px;">
          <div class="panel-header">
            <div>
              <div class="eyebrow">Kayıtlar</div>
              <h2>Rapor Geçmişi</h2>
            </div>
          </div>
          <div class="panel-body">
            <div class="records-list" id="report-page-records"></div>
          </div>
        </div>
      </section>''')
    write("index.html", text)


def patch_app():
    text = read("assets/scripts/app.js")
    text = replace(text, '  recordSearch: document.getElementById("record-search"),\n  reportRecords:', '  recordSearch: document.getElementById("record-search"),\n  reportPageRecords: document.getElementById("report-page-records"),\n  reportRecords:')
    text = replace(text, '''  renderOrders();
  renderProjectManagement();''', '''  renderOrders();
  renderReportPageRecords();
  renderProjectManagement();''')
    text = replace(text, "\nfunction renderRecords() {", r'''
function renderReportPageRecords() {
  if (!els.reportPageRecords) return;
  els.reportPageRecords.innerHTML = state.reports.length
    ? state.reports.slice().sort((a, b) => (b.date || "").localeCompare(a.date || "")).map(renderReportRecord).join("")
    : emptyState("Henüz saha raporu kaydedilmedi.");
}

function renderRecords() {''')
    text = replace(text, '''    state.reports = payload.reports || state.reports;
    state.puantaj = payload.puantaj || state.puantaj;
    state.orders = payload.orders || state.orders;
    state.tasks = payload.tasks || state.tasks;
    state.documents = payload.documents || state.documents;''', '''    state.reports = mergeById(state.reports, payload.reports);
    state.puantaj = mergeById(state.puantaj, payload.puantaj);
    state.orders = mergeById(state.orders, payload.orders);
    state.tasks = mergeById(state.tasks, payload.tasks);
    state.documents = mergeById(state.documents, payload.documents);''')
    text = replace(text, '''function persist(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}''', '''function persist(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function mergeById(localItems, remoteItems) {
  if (!Array.isArray(remoteItems)) return localItems;
  const merged = new Map();
  [...remoteItems, ...localItems].forEach((item) => {
    if (!item?.id) return;
    merged.set(item.id, { ...(merged.get(item.id) || {}), ...item });
  });
  return [...merged.values()];
}''')
    write("assets/scripts/app.js", text)


patch_html()
patch_app()

for cleanup in [".github/workflows/codex-report-visibility.yml", ".github/scripts/codex_patch_report_visibility.py", ".codex-report-visibility-trigger"]:
    path = Path(cleanup)
    if path.exists():
        path.unlink()
