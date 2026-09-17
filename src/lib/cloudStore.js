// ============================================================================
// CLOUD DATA BRIDGE
// Keeps the existing synchronous UI stores fast while persisting business
// data to Supabase through the same-origin Vercel API. Browser localStorage is
// only a cache; the database is the source of truth in production.
// ============================================================================

export const PUBLIC_STATE_KEYS = [
  "nle_catalog_v2_products",
  "nle_catalog_v2_occasions",
  "nle_catalog_v2_media",
  "nle_catalog_v2_gallery",
  "nle_catalog_v2_insta_videos",
  "nle_catalog_v2_video_reviews",
  "nle_catalog_v2_cities",
  "nle_catalog_v2_addons",
];

export const ADMIN_STATE_KEYS = [
  ...PUBLIC_STATE_KEYS,
  "nle_catalog_v2_coupons",
  "nle_catalog_v2_inquiries",
  "nle_catalog_v2_blackouts",
  "nle-admin-clients",
  "nle-admin-invoices",
  "nle-admin-settings",
];

const ADMIN_SESSION_KEY = "nle-admin-supabase-session";
const API_BASE = import.meta.env.VITE_API_URL || "/api";

function getAdminAccessToken() {
  try {
    const raw = sessionStorage.getItem(ADMIN_SESSION_KEY);
    const session = raw ? JSON.parse(raw) : null;
    return session?.access_token || "";
  } catch {
    return "";
  }
}

async function request(url, options = {}) {
  let res;
  try {
    res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });
  } catch {
    throw new Error("Unable to reach the cloud data service.");
  }
  let data = null;
  try { data = await res.json(); } catch { /* empty */ }
  if (!res.ok) throw new Error(data?.error || data?.message || `Cloud request failed (${res.status}).`);
  return data;
}

// Fire-and-forget persistence. The UI remains responsive, while the server
// becomes the durable copy. Failures are logged instead of pretending the
// database write succeeded.
export async function syncCloudState(key, data) {
  const token = getAdminAccessToken();
  if (!token) throw new Error("Admin session expired. Please log in again.");
  if (!ADMIN_STATE_KEYS.includes(key)) throw new Error("This data bucket cannot be saved from the admin panel.");
  return request(`${API_BASE}/admin/state`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ key, data }),
  });
}

export function queueCloudSync(key, data) {
  const token = getAdminAccessToken();
  if (!token || !ADMIN_STATE_KEYS.includes(key)) return;
  request(`${API_BASE}/admin/state`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ key, data }),
  }).catch((err) => console.warn(`Cloud sync failed for ${key}:`, err.message));
}

export async function hydratePublicState() {
  const data = await request(`${API_BASE}/catalog`);
  const state = data?.state || {};
  Object.entries(state).forEach(([key, value]) => {
    if (PUBLIC_STATE_KEYS.includes(key)) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* cache only */ }
    }
  });
  window.dispatchEvent(new CustomEvent("nle-catalog-updated"));
  return state;
}

export async function hydrateAdminState() {
  const token = getAdminAccessToken();
  if (!token) return {};
  const data = await request(`${API_BASE}/admin/state`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const state = data?.state || {};
  Object.entries(state).forEach(([key, value]) => {
    if (ADMIN_STATE_KEYS.includes(key)) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* cache only */ }
    }
  });
  window.dispatchEvent(new CustomEvent("nle-catalog-updated"));
  return state;
}

export async function bootstrapAdminState() {
  const token = getAdminAccessToken();
  if (!token) return { bootstrapped: false };
  const payload = {};
  ADMIN_STATE_KEYS.forEach((key) => {
    try {
      const raw = localStorage.getItem(key);
      if (raw != null) payload[key] = JSON.parse(raw);
    } catch { /* skip corrupt cache */ }
  });
  return request(`${API_BASE}/admin/bootstrap`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ state: payload }),
  });
}
