import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Icon from "../../components/Icon";
import usePageMeta from "../../hooks/usePageMeta";
import {
  DEPARTMENTS, LIMITS, STATUSES, STATUS_LABEL,
  csvCell, deleteCandidates, getCandidates, importCandidates, isSafeResumeUrl,
  parseCsv, setCandidatesStatus, upsertCandidate, uploadResume,
} from "../../lib/candidatesStore";
import "../../styles/candidates.css";

const PAGE_SIZE = 7;
const EMPTY_FORM = { name: "", phone: "", email: "", department: "", location: "", queryDate: "", status: "new_query", notes: "", resumeUrl: "", resumeName: "" };
const EMPTY_FILTERS = { department: "all", location: "all", status: "all", from: "", to: "" };
const AVATAR_COLORS = ["#fde7c8", "#e6dcff", "#d7f5e3", "#ffe0e8", "#d9ecff", "#fff1b8", "#d8f3f0"];
const DEPT_CLASS = { production: "prod", design: "design", operations: "ops", marketing: "mkt", hr: "hr" };
const IMPORT_MAX_BYTES = 1024 * 1024;
const IMPORT_MAX_ROWS = 500;

function initials(name) {
  const parts = String(name || "?").trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] || "?") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}
function avatarColor(name) {
  let h = 0;
  for (const ch of String(name)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
function fmtDate(value) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
function fmtTime(value) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}
function toInputValue(iso) {
  const d = new Date(iso || Date.now());
  if (Number.isNaN(d.getTime())) return "";
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
function localDay(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function telHref(phone) { const d = String(phone || "").replace(/[^\d+]/g, ""); return d ? `tel:${d}` : ""; }
function waHref(phone) {
  let d = String(phone || "").replace(/\D/g, "");
  if (d.length === 10) d = `91${d}`;
  return d.length >= 11 && d.length <= 15 ? `https://wa.me/${d}` : "";
}
function pageList(current, total) {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
  const set = new Set([1, total, current - 1, current, current + 1]);
  const nums = [...set].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
  const out = [];
  nums.forEach((n, i) => { if (i && n - nums[i - 1] > 1) out.push("…"); out.push(n); });
  return out;
}
function downloadCsv(filename, lines) {
  const blob = new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.rel = "noopener";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const STAT_CARDS = [
  { key: "all", label: "Total Candidates", icon: "users", tone: "blue" },
  { key: "new_query", label: "New Queries", icon: "clock", tone: "amber" },
  { key: "in_process", label: "In Process", icon: "calendar", tone: "violet" },
  { key: "shortlisted", label: "Shortlisted", icon: "check", tone: "green" },
  { key: "hired", label: "Hired", icon: "user", tone: "sky" },
  { key: "rejected", label: "Rejected", icon: "close", tone: "red" },
];

function ResumeLink({ url, name, onAdd }) {
  if (isSafeResumeUrl(url)) {
    return (
      <a className="cnd-pdf" href={url} target="_blank" rel="noopener noreferrer" title={name || "Open resume"} onClick={(e) => e.stopPropagation()}>
        <Icon name="file" /><span>PDF</span>
      </a>
    );
  }
  return <button type="button" className="cnd-pdf cnd-pdf--empty" onClick={onAdd} title="Upload resume">+ Add</button>;
}

function CandidateForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(() => ({ ...EMPTY_FORM, ...initial, queryDate: toInputValue(initial?.queryDate) }));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);
  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  async function pickFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(""); setBusy(true);
    try {
      const { url, name } = await uploadResume(file);
      setForm((f) => ({ ...f, resumeUrl: url, resumeName: name }));
    } catch (err) { setError(err.message || "Resume upload failed."); }
    finally { setBusy(false); }
  }

  function submit(e) {
    e.preventDefault();
    if (busy) return;
    const result = onSave({ ...form, queryDate: form.queryDate ? new Date(form.queryDate).toISOString() : "" });
    if (result?.error) setError(result.error);
  }

  return (
    <form className="cnd-modal" onSubmit={submit} noValidate>
      <div className="cnd-modal-head">
        <div><h2>{initial?.id ? "Edit Candidate" : "Add Candidate"}</h2><p>Enter candidate details and track them through the hiring pipeline.</p></div>
        <button type="button" className="cnd-icon-btn" onClick={onCancel} aria-label="Close"><Icon name="close" /></button>
      </div>
      <div className="cnd-form-grid">
        <label>Candidate Name *<input value={form.name} maxLength={LIMITS.name} onChange={(e) => set("name", e.target.value)} autoFocus placeholder="Full name" /></label>
        <label>Phone *<input value={form.phone} maxLength={LIMITS.phone} inputMode="tel" onChange={(e) => set("phone", e.target.value)} placeholder="+91 98765 43210" /></label>
        <label>Email (optional)<input type="email" value={form.email} maxLength={LIMITS.email} onChange={(e) => set("email", e.target.value)} placeholder="name@gmail.com" /></label>
        <label>Department *
          <select value={form.department} onChange={(e) => set("department", e.target.value)}>
            <option value="">Select department</option>
            {[...new Set([...DEPARTMENTS, form.department].filter(Boolean))].map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </label>
        <label>Location *<input value={form.location} maxLength={LIMITS.location} onChange={(e) => set("location", e.target.value)} placeholder="e.g. Ranchi" /></label>
        <label>Query Date<input type="datetime-local" value={form.queryDate} onChange={(e) => set("queryDate", e.target.value)} /></label>
        <label>Status
          <select value={form.status} onChange={(e) => set("status", e.target.value)}>
            {STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </label>
        <div className="cnd-field">
          <span>Resume (PDF, max 1 MB)</span>
          <div className="cnd-upload">
            <input ref={fileRef} type="file" accept="application/pdf,.pdf" hidden onChange={pickFile} />
            <button type="button" className="cnd-btn cnd-btn--line" disabled={busy} onClick={() => fileRef.current?.click()}><Icon name="upload" /> {busy ? "Uploading…" : form.resumeUrl ? "Replace" : "Upload"}</button>
            {form.resumeUrl && (
              <>
                <a href={form.resumeUrl} target="_blank" rel="noopener noreferrer" className="cnd-upload-name">{form.resumeName || "resume.pdf"}</a>
                <button type="button" className="cnd-link-danger" onClick={() => setForm((f) => ({ ...f, resumeUrl: "", resumeName: "" }))}>Remove</button>
              </>
            )}
          </div>
        </div>
        <label className="cnd-full">Notes<textarea value={form.notes} maxLength={LIMITS.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Screening notes, interview feedback…" /></label>
      </div>
      {error && <p className="cnd-error" role="alert">{error}</p>}
      <div className="cnd-modal-actions">
        <button type="button" className="cnd-btn cnd-btn--line" onClick={onCancel}>Cancel</button>
        <button type="submit" className="cnd-btn cnd-btn--dark" disabled={busy}>{initial?.id ? "Save Changes" : "Add Candidate"}</button>
      </div>
    </form>
  );
}

function ImportModal({ onClose, onDone }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);

  function template() {
    downloadCsv("candidates-template.csv", [
      "Name,Phone,Email,Department,Location,Query Date,Status,Notes",
      "Amit Rana,+91 98765 43210,amit@example.com,Production,Ranchi,2026-11-24,New Query,Initial screening pending",
    ].map((l) => l));
  }

  async function handle(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError("");
    if (!/\.csv$/i.test(file.name)) return setError("Please choose a .csv file.");
    if (file.size > IMPORT_MAX_BYTES) return setError("CSV must be 1 MB or smaller.");
    setBusy(true);
    try {
      const rows = parseCsv(await file.text());
      if (rows.length < 2) throw new Error("The CSV has no candidate rows.");
      if (rows.length - 1 > IMPORT_MAX_ROWS) throw new Error(`Import up to ${IMPORT_MAX_ROWS} candidates at a time.`);
      const head = rows[0].map((h) => h.trim().toLowerCase());
      const col = (...names) => head.findIndex((h) => names.includes(h));
      const idx = { name: col("name", "candidate name"), phone: col("phone", "contact", "mobile"), email: col("email"), department: col("department"), location: col("location", "position"), queryDate: col("query date", "date"), status: col("status"), notes: col("notes") };
      if (idx.name < 0) throw new Error("CSV needs a “Name” column.");
      const byLabel = Object.fromEntries(STATUSES.map((s) => [s.label.toLowerCase(), s.key]));
      const records = rows.slice(1).map((r) => {
        const get = (i) => (i >= 0 ? r[i] ?? "" : "");
        const raw = get(idx.status).trim().toLowerCase();
        return {
          name: get(idx.name), phone: get(idx.phone), email: get(idx.email),
          department: get(idx.department) || "Other", location: get(idx.location) || "Not specified",
          queryDate: get(idx.queryDate), status: byLabel[raw] || (STATUS_LABEL[raw] ? raw : "new_query"), notes: get(idx.notes),
        };
      });
      const result = importCandidates(records);
      if (result.error) throw new Error(result.error);
      onDone(`Imported ${result.added} candidate${result.added === 1 ? "" : "s"}${result.skipped ? `, skipped ${result.skipped} (invalid or duplicate)` : ""}.`);
    } catch (err) { setError(err.message || "Import failed."); }
    finally { setBusy(false); }
  }

  return (
    <div className="cnd-modal cnd-modal--sm">
      <div className="cnd-modal-head">
        <div><h2>Import Candidates</h2><p>Upload a CSV (max {IMPORT_MAX_ROWS} rows, 1 MB). Duplicates are skipped.</p></div>
        <button type="button" className="cnd-icon-btn" onClick={onClose} aria-label="Close"><Icon name="close" /></button>
      </div>
      <p className="cnd-hint">Columns: Name, Phone, Email, Department, Location, Query Date, Status, Notes.</p>
      <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={handle} />
      {error && <p className="cnd-error" role="alert">{error}</p>}
      <div className="cnd-modal-actions">
        <button type="button" className="cnd-btn cnd-btn--line" onClick={template}>Download template</button>
        <button type="button" className="cnd-btn cnd-btn--dark" disabled={busy} onClick={() => fileRef.current?.click()}><Icon name="upload" /> {busy ? "Importing…" : "Choose CSV"}</button>
      </div>
    </div>
  );
}

export default function AdminCandidates() {
  usePageMeta("Candidates — Admin", "Manage candidate applications and the hiring pipeline.", { noindex: true });
  const [records, setRecords] = useState(() => getCandidates());
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState(EMPTY_FILTERS);
  const [applied, setApplied] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState([]);
  const [modal, setModal] = useState(null); // {type:"form", record} | {type:"import"}
  const [view, setView] = useState(null);
  const [menuId, setMenuId] = useState(null);
  const [toast, setToast] = useState("");
  const toastTimer = useRef(null);

  const refresh = useCallback(() => setRecords(getCandidates()), []);
  useEffect(() => {
    window.addEventListener("nle-catalog-updated", refresh);
    window.addEventListener("nle-admin-data-updated", refresh);
    return () => { window.removeEventListener("nle-catalog-updated", refresh); window.removeEventListener("nle-admin-data-updated", refresh); };
  }, [refresh]);
  useEffect(() => () => clearTimeout(toastTimer.current), []);
  useEffect(() => {
    if (!menuId) return undefined;
    const close = () => setMenuId(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [menuId]);

  function notify(message) {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 3500);
  }

  const counts = useMemo(() => {
    const c = { all: records.length };
    STATUSES.forEach((s) => { c[s.key] = 0; });
    records.forEach((r) => { c[r.status] = (c[r.status] || 0) + 1; });
    return c;
  }, [records]);

  const locations = useMemo(() => {
    const map = new Map();
    records.forEach((r) => { const k = (r.location || "").trim().toLowerCase(); if (k && !map.has(k)) map.set(k, r.location); });
    return [...map.values()].sort((a, b) => a.localeCompare(b));
  }, [records]);
  const departments = useMemo(() => [...new Set([...DEPARTMENTS, ...records.map((r) => r.department).filter(Boolean)])], [records]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const qDigits = q.replace(/\D/g, "");
    return records
      .filter((r) => {
        if (applied.status !== "all" && r.status !== applied.status) return false;
        if (applied.department !== "all" && r.department !== applied.department) return false;
        if (applied.location !== "all" && (r.location || "").toLowerCase() !== applied.location.toLowerCase()) return false;
        const day = localDay(r.queryDate);
        if (applied.from && (!day || day < applied.from)) return false;
        if (applied.to && (!day || day > applied.to)) return false;
        if (!q) return true;
        if ([r.name, r.email, r.location, r.department, r.notes].some((v) => (v || "").toLowerCase().includes(q))) return true;
        return qDigits.length >= 3 && r.phone.replace(/\D/g, "").includes(qDigits);
      })
      .sort((a, b) => new Date(b.queryDate) - new Date(a.queryDate));
  }, [records, applied, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const rows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const allOnPageSelected = rows.length > 0 && rows.every((r) => selected.includes(r.id));

  function applyTab(key) {
    const next = { ...applied, status: key };
    setApplied(next); setDraft((d) => ({ ...d, status: key })); setPage(1); setSelected([]);
  }
  function changeFilter(patch) {
    const next = { ...draft, ...patch };
    setDraft(next); setApplied(next); setPage(1); setSelected([]);
  }
  function applyFilters() { setApplied(draft); setPage(1); setSelected([]); }
  function resetFilters() { setDraft(EMPTY_FILTERS); setApplied(EMPTY_FILTERS); setQuery(""); setPage(1); setSelected([]); }

  function handleSave(form) {
    const result = upsertCandidate(form);
    if (result.error) return result;
    refresh(); setModal(null);
    setView((v) => (v && v.id === result.record.id ? result.record : v));
    notify(form.id ? "Candidate updated." : "Candidate added.");
    return result;
  }
  function changeStatus(ids, status) {
    if (setCandidatesStatus(ids, status)) {
      refresh();
      setView((v) => (v && ids.includes(v.id) ? { ...v, status } : v));
      notify(`Marked as ${STATUS_LABEL[status]}.`);
    }
  }
  function remove(ids) {
    const msg = ids.length === 1 ? "Delete this candidate? This can't be undone." : `Delete ${ids.length} candidates? This can't be undone.`;
    if (!window.confirm(msg)) return;
    deleteCandidates(ids); refresh();
    setSelected((s) => s.filter((id) => !ids.includes(id)));
    setView((v) => (v && ids.includes(v.id) ? null : v));
    notify("Deleted.");
  }
  function exportCsv(list) {
    const header = ["Name", "Phone", "Email", "Department", "Location", "Query Date", "Status", "Notes", "Resume"];
    const lines = [header.map(csvCell).join(",")];
    list.forEach((r) => lines.push([r.name, r.phone, r.email, r.department, r.location, new Date(r.queryDate).toLocaleString("en-IN"), STATUS_LABEL[r.status], r.notes, r.resumeUrl].map(csvCell).join(",")));
    downloadCsv(`candidates-${new Date().toISOString().slice(0, 10)}.csv`, lines);
  }
  function toggleRow(id) { setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id])); }
  function togglePage() {
    setSelected((s) => (allOnPageSelected ? s.filter((id) => !rows.some((r) => r.id === id)) : [...new Set([...s, ...rows.map((r) => r.id)])]));
  }

  const hasFilters = JSON.stringify(applied) !== JSON.stringify(EMPTY_FILTERS) || query.trim();

  return (
    <div className="crm-page cnd-page">
      <header className="crm-topbar">
        <div className="cnd-heading">
          <h1>Candidates</h1>
          <p>Manage candidate applications, track status, and hiring pipeline.</p>
        </div>
        <div className="crm-topbar-spacer" />
        <div className="crm-global-search cnd-search"><Icon name="search" /><input value={query} maxLength={80} onChange={(e) => { setQuery(e.target.value); setPage(1); }} placeholder="Search by name, phone, or email..." aria-label="Search candidates" /></div>
      </header>

      <main className="cnd-content">
        <section className="cnd-stats" aria-label="Candidate summary">
          {STAT_CARDS.map((s) => (
            <button key={s.key} type="button" className={`cnd-stat cnd-stat--${s.tone}${applied.status === s.key ? " is-active" : ""}`} onClick={() => applyTab(s.key)}>
              <span className="cnd-stat-icon"><Icon name={s.icon} /></span>
              <span><small>{s.label}</small><strong>{counts[s.key] || 0}</strong></span>
            </button>
          ))}
        </section>

        <div className="cnd-tabbar">
          <nav className="cnd-tabs" aria-label="Candidate status">
            <button type="button" className={applied.status === "all" ? "active" : ""} onClick={() => applyTab("all")}>All Candidates</button>
            {STATUSES.map((s) => <button key={s.key} type="button" className={applied.status === s.key ? "active" : ""} onClick={() => applyTab(s.key)}>{s.key === "new_query" ? "New Queries" : s.label}</button>)}
          </nav>
          <div className="cnd-tab-actions">
            <button type="button" className="cnd-btn cnd-btn--dark" onClick={() => setModal({ type: "form", record: null })}><Icon name="plus" /> Add Candidate</button>
            <button type="button" className="cnd-btn cnd-btn--line" onClick={() => setModal({ type: "import" })}><Icon name="upload" /> Import</button>
          </div>
        </div>

        <section className="cnd-filters" aria-label="Filters">
          <label>Department
            <select value={draft.department} onChange={(e) => changeFilter({ department: e.target.value })}>
              <option value="all">All Departments</option>
              {departments.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </label>
          <label>Location
            <select value={draft.location} onChange={(e) => changeFilter({ location: e.target.value })}>
              <option value="all">All Locations</option>
              {locations.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </label>
          <label>Status
            <select value={draft.status} onChange={(e) => changeFilter({ status: e.target.value })}>
              <option value="all">All Status</option>
              {STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </label>
          <div className="cnd-date-filter">
            <span>Query Date</span>
            <div>
              <input type="date" value={draft.from} max={draft.to || undefined} onChange={(e) => changeFilter({ from: e.target.value })} aria-label="From date" />
              <em>to</em>
              <input type="date" value={draft.to} min={draft.from || undefined} onChange={(e) => changeFilter({ to: e.target.value })} aria-label="To date" />
            </div>
          </div>
          <div className="cnd-filter-actions">
            <button type="button" className="cnd-btn cnd-btn--line" onClick={resetFilters}><Icon name="restart" /> Reset</button>
            <button type="button" className="cnd-btn cnd-btn--dark" onClick={applyFilters}><Icon name="filter" /> Apply Filter</button>
          </div>
        </section>

        {selected.length > 0 && (
          <div className="cnd-bulk" role="toolbar" aria-label="Bulk actions">
            <strong>{selected.length} selected</strong>
            <select value="" onChange={(e) => { if (e.target.value) changeStatus(selected, e.target.value); }} aria-label="Change status of selected">
              <option value="">Change status…</option>
              {STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
            <button type="button" onClick={() => exportCsv(records.filter((r) => selected.includes(r.id)))}>Export CSV</button>
            <button type="button" className="danger" onClick={() => remove(selected)}>Delete</button>
            <button type="button" className="ghost" onClick={() => setSelected([])}>Clear</button>
          </div>
        )}

        <section className="cnd-card">
          <div className="cnd-table-wrap">
            <table className="cnd-table">
              <thead>
                <tr>
                  <th className="c-check"><input type="checkbox" checked={allOnPageSelected} onChange={togglePage} aria-label="Select all on this page" /></th>
                  <th>#</th><th>Candidate Name</th><th>Contact</th><th>Department</th><th>Location</th><th>Query Date</th><th>Status</th><th>Notes</th><th>Resume</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const wa = waHref(r.phone);
                  return (
                    <tr key={r.id} className={selected.includes(r.id) ? "is-selected" : ""}>
                      <td className="c-check"><input type="checkbox" checked={selected.includes(r.id)} onChange={() => toggleRow(r.id)} aria-label={`Select ${r.name}`} /></td>
                      <td className="c-num">{(safePage - 1) * PAGE_SIZE + i + 1}</td>
                      <td>
                        <button type="button" className="cnd-person" onClick={() => setView(r)}>
                          <span className="cnd-avatar" style={{ background: avatarColor(r.name) }}>{initials(r.name)}</span>
                          <b>{r.name}</b>
                        </button>
                      </td>
                      <td className="cnd-contact">
                        {r.phone && <span><Icon name="phone" />{r.phone}</span>}
                        {r.email && <span><Icon name="send" />{r.email}</span>}
                      </td>
                      <td><span className={`cnd-dept cnd-dept--${DEPT_CLASS[r.department.toLowerCase()] || "other"}`}>{r.department || "—"}</span></td>
                      <td>{r.location || "—"}</td>
                      <td className="cnd-date"><b>{fmtDate(r.queryDate)}</b><small>{fmtTime(r.queryDate)}</small></td>
                      <td>
                        <select className={`cnd-status cnd-status--${r.status}`} value={r.status} onChange={(e) => changeStatus([r.id], e.target.value)} aria-label={`Status of ${r.name}`}>
                          {STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                        </select>
                      </td>
                      <td className="cnd-notes" title={r.notes}>{r.notes || <span className="cnd-muted">—</span>}</td>
                      <td><ResumeLink url={r.resumeUrl} name={r.resumeName} onAdd={() => setModal({ type: "form", record: r })} /></td>
                      <td>
                        <div className="cnd-actions">
                          <button type="button" onClick={() => setView(r)} aria-label="View" title="View"><Icon name="eye" /></button>
                          <button type="button" onClick={() => setModal({ type: "form", record: r })} aria-label="Edit" title="Edit"><Icon name="edit" /></button>
                          <div className="cnd-more" onClick={(e) => e.stopPropagation()}>
                            <button type="button" onClick={() => setMenuId(menuId === r.id ? null : r.id)} aria-label="More actions" aria-expanded={menuId === r.id}>•••</button>
                            {menuId === r.id && (
                              <div className="cnd-menu" role="menu">
                                {telHref(r.phone) && <a role="menuitem" href={telHref(r.phone)}>Call</a>}
                                {wa && <a role="menuitem" href={wa} target="_blank" rel="noopener noreferrer">WhatsApp</a>}
                                {r.email && <a role="menuitem" href={`mailto:${r.email}`}>Email</a>}
                                <button type="button" role="menuitem" className="danger" onClick={() => { setMenuId(null); remove([r.id]); }}>Delete</button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {rows.length === 0 && (
              <div className="cnd-empty">
                {records.length === 0 ? "No candidates yet — click “Add Candidate” or import a CSV." : "No candidates match your filters."}
                {hasFilters && records.length > 0 && <button type="button" className="cnd-link" onClick={resetFilters}>Clear filters</button>}
              </div>
            )}
          </div>
        </section>

        <footer className="cnd-foot">
          <span>{filtered.length === 0 ? "Showing 0 candidates" : `Showing ${(safePage - 1) * PAGE_SIZE + 1} – ${(safePage - 1) * PAGE_SIZE + rows.length} of ${filtered.length} candidates`}</span>
          <nav className="cnd-pager" aria-label="Pagination">
            <button type="button" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)} aria-label="Previous page">‹</button>
            {pageList(safePage, totalPages).map((n, i) => (n === "…" ? <span key={`d${i}`}>…</span> : <button key={n} type="button" className={n === safePage ? "active" : ""} onClick={() => setPage(n)} aria-current={n === safePage ? "page" : undefined}>{n}</button>))}
            <button type="button" disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)} aria-label="Next page">›</button>
          </nav>
        </footer>
      </main>

      {modal && (
        <div className="cnd-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setModal(null); }}>
          {modal.type === "form" && <CandidateForm initial={modal.record} onSave={handleSave} onCancel={() => setModal(null)} />}
          {modal.type === "import" && <ImportModal onClose={() => setModal(null)} onDone={(msg) => { refresh(); setModal(null); setPage(1); notify(msg); }} />}
        </div>
      )}

      {view && (
        <>
          <div className="cnd-drawer-backdrop" onClick={() => setView(null)} />
          <aside className="cnd-drawer" role="dialog" aria-label="Candidate details">
            <div className="cnd-drawer-head">
              <span className="cnd-avatar cnd-avatar--lg" style={{ background: avatarColor(view.name) }}>{initials(view.name)}</span>
              <div><h2>{view.name}</h2><p>{view.location} · {view.department}</p></div>
              <button type="button" className="cnd-icon-btn" onClick={() => setView(null)} aria-label="Close"><Icon name="close" /></button>
            </div>
            <div className="cnd-drawer-body">
              <label className="cnd-drawer-status">Status
                <select className={`cnd-status cnd-status--${view.status}`} value={view.status} onChange={(e) => changeStatus([view.id], e.target.value)}>
                  {STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                </select>
              </label>
              <dl>
                <div><dt>Phone</dt><dd>{view.phone || "—"}</dd></div>
                <div><dt>Email</dt><dd>{view.email || "—"}</dd></div>
                <div><dt>Query Date</dt><dd>{fmtDate(view.queryDate)} {fmtTime(view.queryDate)}</dd></div>
                <div><dt>Added</dt><dd>{fmtDate(view.createdAt)}</dd></div>
                <div className="full"><dt>Notes</dt><dd>{view.notes || "—"}</dd></div>
                <div className="full"><dt>Resume</dt><dd><ResumeLink url={view.resumeUrl} name={view.resumeName} onAdd={() => setModal({ type: "form", record: view })} />{view.resumeName && isSafeResumeUrl(view.resumeUrl) && <span className="cnd-muted"> {view.resumeName}</span>}</dd></div>
              </dl>
              <div className="cnd-drawer-quick">
                {telHref(view.phone) && <a href={telHref(view.phone)}>Call</a>}
                {waHref(view.phone) && <a href={waHref(view.phone)} target="_blank" rel="noopener noreferrer">WhatsApp</a>}
                {view.email && <a href={`mailto:${view.email}`}>Email</a>}
              </div>
            </div>
            <div className="cnd-drawer-foot">
              <button type="button" className="cnd-btn cnd-btn--line" onClick={() => setModal({ type: "form", record: view })}><Icon name="edit" /> Edit</button>
              <button type="button" className="cnd-btn cnd-btn--danger" onClick={() => remove([view.id])}><Icon name="trash" /> Delete</button>
            </div>
          </aside>
        </>
      )}

      {toast && <div className="cnd-toast" role="status">{toast}</div>}
    </div>
  );
}
