from pathlib import Path


def read(path):
    return Path(path).read_text()


def write(path, text):
    Path(path).write_text(text)


def replace(text, old, new):
    if old not in text:
        raise SystemExit(f"Pattern not found:\n{old[:240]}")
    return text.replace(old, new, 1)


text = read("assets/scripts/app.js")
text = replace(text, '    projectId: form.get("projectId"),', '    projectId: form.get("projectId") || els.reportProject.value || state.selectedProjectId || state.projects[0]?.id || "",')
text = replace(text, '''  const inRange = (date) => (!from || date >= from) && (!to || date <= to);
  const reports = state.reports.filter((item) => item.projectId === projectId && inRange(item.date)).sort((a, b) => b.date.localeCompare(a.date));
  const orders = state.orders.filter((item) => item.projectId === projectId && inRange(item.date)).sort((a, b) => b.date.localeCompare(a.date));''', '''  const inRange = (date) => (!from || date >= from) && (!to || date <= to);
  const project = state.projects.find((item) => item.id === projectId);
  const reports = state.reports.filter((item) => reportBelongsToProject(item, project) && inRange(item.date)).sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  const orders = state.orders.filter((item) => item.projectId === projectId && inRange(item.date)).sort((a, b) => b.date.localeCompare(a.date));''')
text = replace(text, '''function buildProjectBrief(project, detail) {''', '''function reportBelongsToProject(report, project) {
  if (!project) return false;
  const reportProjectId = String(report.projectId || "").trim();
  if (reportProjectId === project.id) return true;
  if (reportProjectId && reportProjectId.toLocaleLowerCase("tr-TR") === String(project.name || "").trim().toLocaleLowerCase("tr-TR")) return true;
  return !reportProjectId && state.projects.length === 1;
}

function buildProjectBrief(project, detail) {''')
write("assets/scripts/app.js", text)

for cleanup in [".github/workflows/codex-project-reports.yml", ".github/scripts/codex_patch_project_reports.py", ".codex-project-reports-trigger"]:
    path = Path(cleanup)
    if path.exists():
        path.unlink()
