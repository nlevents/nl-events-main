import { queueCloudSync } from "./cloudStore";

// Candidates (HR pipeline). localStorage is a cache; every write is also pushed
// to the admin-only cloud bucket through the authenticated /api/admin/state.
export const CANDIDATES_KEY = "nle-admin-candidates";

export const STATUSES = [
  { key: "new_query", label: "New Query" },
  { key: "in_process", label: "In Process" },
  { key: "shortlisted", label: "Shortlisted" },
  { key: "hired", label: "Hired" },
  { key: "rejected", label: "Rejected" },
];
export const STATUS_LABEL = Object.fromEntries(STATUSES.map((s) => [s.key, s.label]));
export const DEPARTMENTS = ["Production", "Design", "Operations", "Marketing", "HR", "Sales", "Finance", "Other"];

export const LIMITS = { name: 80, phone: 20, email: 120, department: 40, location: 80, notes: 1000, max: 5000, resumeBytes: 1024 * 1024 };
const RESUME_URL_RE = /^https:\/\/res\.cloudinary\.com\/[A-Za-z0-9_\-/.%]+$/;
const EMAIL_RE = /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']{2,}$/;

function clean(value, max) {
  return String(value ?? "")
    .replace(/<[^>]*>/g, "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, max);
}

function toIso(value) {
  const d = value ? new Date(value) : new Date();
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

function newId() {
  try { if (crypto?.randomUUID) return crypto.randomUUID(); } catch { /* fallback */ }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

export function isSafeResumeUrl(url) {
  return typeof url === "string" && url.length < 500 && RESUME_URL_RE.test(url);
}

// Whitelist-rebuild: unknown keys are dropped, every value is clamped/sanitized.
export function normalizeCandidate(input = {}) {
  const status = STATUS_LABEL[input.status] ? input.status : "new_query";
  const now = new Date().toISOString();
  return {
    id: clean(input.id, 64) || newId(),
    name: clean(input.name, LIMITS.name),
    phone: clean(input.phone, LIMITS.phone),
    email: clean(input.email, LIMITS.email).toLowerCase(),
    department: clean(input.department, LIMITS.department),
    location: clean(input.location ?? input.position, LIMITS.location),
    queryDate: toIso(input.queryDate),
    status,
    notes: clean(input.notes, LIMITS.notes),
    resumeUrl: isSafeResumeUrl(input.resumeUrl) ? input.resumeUrl : "",
    resumeName: clean(input.resumeName, 120),
    createdAt: input.createdAt ? toIso(input.createdAt) : now,
    updatedAt: now,
  };
}

export function validateCandidate(c) {
  if (!c.name) return "Candidate name is required.";
  if (!c.phone) return "Phone number is required.";
  if (c.phone && !/^\+?[0-9 ()\-]{7,20}$/.test(c.phone)) return "Enter a valid phone number.";
  if (c.phone && c.phone.replace(/\D/g, "").length < 7) return "Enter a valid phone number.";
  if (c.email && !EMAIL_RE.test(c.email)) return "Enter a valid email address.";
  if (!c.department) return "Select a department.";
  if (!c.location) return "Location is required.";
  return "";
}

export function getCandidates() {
  try {
    const parsed = JSON.parse(localStorage.getItem(CANDIDATES_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter((c) => c && typeof c === "object" && c.id).map((c) => ({ ...normalizeCandidate(c), updatedAt: c.updatedAt || c.createdAt || "" })) : [];
  } catch { return []; }
}

function persist(list) {
  const safe = list.slice(0, LIMITS.max);
  try {
    localStorage.setItem(CANDIDATES_KEY, JSON.stringify(safe));
  } catch { return false; }
  queueCloudSync(CANDIDATES_KEY, safe);
  window.dispatchEvent(new CustomEvent("nle-admin-data-updated", { detail: { key: CANDIDATES_KEY } }));
  return true;
}

export function upsertCandidate(input) {
  const list = getCandidates();
  const existing = input.id ? list.find((c) => c.id === input.id) : null;
  const record = normalizeCandidate({ ...existing, ...input });
  if (existing) record.createdAt = existing.createdAt || record.createdAt;
  const error = validateCandidate(record);
  if (error) return { error };
  if (!existing && list.length >= LIMITS.max) return { error: "Candidate limit reached." };
  const next = existing ? list.map((c) => (c.id === record.id ? record : c)) : [record, ...list];
  if (!persist(next)) return { error: "Could not save (browser storage is full)." };
  return { record };
}

export function setCandidatesStatus(ids, status) {
  if (!STATUS_LABEL[status]) return false;
  const set = new Set(ids);
  const now = new Date().toISOString();
  return persist(getCandidates().map((c) => (set.has(c.id) ? { ...c, status, updatedAt: now } : c)));
}

export function deleteCandidates(ids) {
  const set = new Set(ids);
  return persist(getCandidates().filter((c) => !set.has(c.id)));
}

// Bulk add (CSV import). Skips invalid rows and duplicates (same phone digits or email).
export function importCandidates(rows) {
  const list = getCandidates();
  const seen = new Set();
  list.forEach((c) => { if (c.email) seen.add(`e:${c.email}`); if (c.phone) seen.add(`p:${c.phone.replace(/\D/g, "").slice(-10)}`); });
  const added = [];
  let skipped = 0;
  for (const row of rows) {
    const rec = normalizeCandidate(row);
    const keys = [rec.email && `e:${rec.email}`, rec.phone && `p:${rec.phone.replace(/\D/g, "").slice(-10)}`].filter(Boolean);
    if (validateCandidate(rec) || keys.some((k) => seen.has(k)) || list.length + added.length >= LIMITS.max) { skipped += 1; continue; }
    keys.forEach((k) => seen.add(k));
    added.push(rec);
  }
  if (added.length && !persist([...added, ...list])) return { added: 0, skipped: rows.length, error: "Could not save (browser storage is full)." };
  return { added: added.length, skipped };
}

// ---- Resume upload (PDF only, magic-byte checked, stored in Cloudinary) ----
export async function uploadResume(file) {
  if (!file) throw new Error("No file selected.");
  if (file.size > LIMITS.resumeBytes) throw new Error("Resume must be 1 MB or smaller.");
  const head = new Uint8Array(await file.slice(0, 5).arrayBuffer());
  const isPdf = String.fromCharCode(...head) === "%PDF-";
  if (!isPdf) throw new Error("Only PDF resumes are allowed.");
  const cloudName = String(import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "jh0tqpsv").trim();
  const preset = String(import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "nle_development").trim();
  const safeName = (file.name || "resume.pdf").replace(/[^A-Za-z0-9._-]+/g, "_").slice(0, 80);
  const form = new FormData();
  form.append("file", new File([file], safeName.endsWith(".pdf") ? safeName : `${safeName}.pdf`, { type: "application/pdf" }));
  form.append("upload_preset", preset);
  form.append("folder", "next-level-events/resumes");
  let res;
  try {
    res = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/raw/upload`, { method: "POST", body: form });
  } catch { throw new Error("Unable to reach the upload service."); }
  let data = null;
  try { data = await res.json(); } catch { /* ignore */ }
  if (!res.ok || !isSafeResumeUrl(data?.secure_url)) throw new Error(data?.error?.message || `Resume upload failed (${res.status}).`);
  return { url: data.secure_url, name: file.name.replace(/[^\w.\- ]+/g, "").slice(0, 120) || "resume.pdf" };
}

// ---- CSV helpers ----
export function parseCsv(text) {
  const rows = [];
  let row = [], cell = "", quoted = false;
  const src = String(text).replace(/^\uFEFF/, "");
  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') { if (src[i + 1] === '"') { cell += '"'; i += 1; } else quoted = false; } else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") { if (ch === "\r" && src[i + 1] === "\n") i += 1; row.push(cell); cell = ""; if (row.some((v) => v.trim())) rows.push(row); row = []; }
    else cell += ch;
    if (rows.length > 5001) break;
  }
  if (cell || row.length) { row.push(cell); if (row.some((v) => v.trim())) rows.push(row); }
  return rows;
}

// Prevents spreadsheet formula injection when the CSV is opened in Excel/Sheets.
export function csvCell(value) {
  let v = String(value ?? "");
  if (/^[=+\-@\t\r]/.test(v)) v = `'${v}`;
  return `"${v.replace(/"/g, '""')}"`;
}
