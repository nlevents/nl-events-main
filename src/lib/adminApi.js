// Admin API. Authentication is the Supabase session created by
// AdminAuthContext; the server verifies that token and the configured admin
// email before touching business data.
const API_BASE = import.meta.env.VITE_API_URL || "/api";
const SESSION_KEY = "nle-admin-supabase-session";

function token() {
  try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null")?.access_token || ""; } catch { return ""; }
}

async function adminFetch(path, { method = "GET", body } = {}) {
  const accessToken = token();
  if (!accessToken) throw new Error("Please log in to the admin panel.");
  const res = await fetch(API_BASE + path, {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.message || `Request failed (${res.status}).`);
  return data;
}

export function getAdminCreds() { return token() ? { connected: true } : null; }
export function setAdminCreds() { return true; }
export function clearAdminCreds() { return true; }

export async function fetchAdminInquiries() {
  return adminFetch("/admin/inquiries");
}

export async function updateAdminInquiry(id, patch) {
  return adminFetch("/admin/inquiries", { method: "PATCH", body: { id, ...patch } });
}

export async function deleteAdminInquiry(id) {
  return adminFetch("/admin/inquiries", { method: "DELETE", body: { id } });
}
