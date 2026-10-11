// ============================================================================
// CLOUD DATA BRIDGE
// Keeps the existing synchronous UI stores fast while persisting business
// data to Supabase through the same-origin Netlify Function API. Browser localStorage is
// only a cache; the database is the source of truth in production.
// ============================================================================

export const PUBLIC_STATE_KEYS = [
  "nle_catalog_v2_products",
  "nle_catalog_v2_occasions",
  "nle_catalog_v2_gallery",
  "nle_catalog_v2_insta_videos",
  "nle_catalog_v2_video_reviews",
  "nle_catalog_v2_cities",
  "nle_catalog_v2_addons",
  "nle_catalog_v2_birthday_age_categories",
];

export const ADMIN_STATE_KEYS = [
  ...PUBLIC_STATE_KEYS,
  "nle_catalog_v2_coupons",
  "nle_catalog_v2_inquiries",
  "nle_catalog_v2_blackouts",
  "nle_catalog_v2_media",
  "nle-admin-clients",
  "nle-admin-invoices",
  "nle-admin-settings",
];

const ADMIN_SESSION_KEY = "nle-admin-supabase-session";
const API_BASE = import.meta.env.VITE_API_URL || "/api";
const CLOUD_VERSION_PREFIX = "nle_catalog_v2_cloud_version_";
const CLOUD_SNAPSHOT_PREFIX = "nle_catalog_v2_cloud_snapshot_";
// Bumped because older builds incorrectly discarded real products whose IDs
// happened to start with `addon-prod-`. This forces one clean product refresh
// in browsers that already have the old filtered cache.
const PRODUCT_CACHE_FORMAT = "products-v2";
const PRODUCT_CACHE_FORMAT_KEY = "nle_catalog_v2_products_cache_format";

function cloudVersionKey(key) { return `${CLOUD_VERSION_PREFIX}${key}`; }
function cloudSnapshotKey(key) { return `${CLOUD_SNAPSHOT_PREFIX}${key}`; }

function getCloudSnapshot(key) {
  try {
    const raw = localStorage.getItem(cloudSnapshotKey(key));
    return raw == null ? undefined : JSON.parse(raw);
  } catch { return undefined; }
}

function setCloudSnapshot(key, value) {
  try { localStorage.setItem(cloudSnapshotKey(key), JSON.stringify(value)); } catch { /* cache only */ }
}

function sameValue(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return a === b;
  try { return JSON.stringify(a) === JSON.stringify(b); } catch { return false; }
}

function itemIdentity(item) {
  if (!item || typeof item !== "object") return null;
  for (const field of ["id", "slug", "productId", "key"]) {
    if (item[field] != null && String(item[field]) !== "") return `${field}:${String(item[field])}`;
  }
  return null;
}

// Three-way merge: apply local changes since the last cloud snapshot on top
// of the latest server value. Conflicting edits to the same field are rejected
// rather than silently overwriting either administrator's work.
function mergeConcurrentState(base, local, remote, path = "catalog") {
  if (sameValue(local, base)) return remote;
  if (sameValue(remote, base)) return local;
  if (sameValue(local, remote)) return local;

  const isRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
  if (isRecord(base) && isRecord(local) && isRecord(remote)) {
    const result = {};
    const keys = new Set([...Object.keys(base), ...Object.keys(local), ...Object.keys(remote)]);
    for (const key of keys) {
      const value = mergeConcurrentState(base[key], local[key], remote[key], `${path}.${key}`);
      if (value !== undefined) result[key] = value;
    }
    return result;
  }

  if (Array.isArray(base) && Array.isArray(local) && Array.isArray(remote)) {
    const keyedArrays = [base, local, remote].every((items) => {
      const ids = items.map(itemIdentity);
      return ids.every(Boolean) && new Set(ids).size === ids.length;
    });
    if (keyedArrays) {
      const baseMap = new Map(base.map((item) => [itemIdentity(item), item]));
      const localMap = new Map(local.map((item) => [itemIdentity(item), item]));
      const remoteMap = new Map(remote.map((item) => [itemIdentity(item), item]));
      const order = [...remote.map(itemIdentity), ...local.map(itemIdentity).filter((id) => !remoteMap.has(id))];
      const merged = [];
      for (const id of order) {
        const value = mergeConcurrentState(baseMap.get(id), localMap.get(id), remoteMap.get(id), `${path}[${id}]`);
        if (value !== undefined) merged.push(value);
      }
      return merged;
    }
  }

  throw new Error("This catalog was changed by another admin. Please refresh the Admin Panel and try again.");
}

function getCloudVersion(key) {
  try { return localStorage.getItem(cloudVersionKey(key)) || ""; } catch { return ""; }
}

function setCloudVersion(key, value) {
  if (!value) return;
  try { localStorage.setItem(cloudVersionKey(key), value); } catch { /* cache only */ }
}

function removeLegacySeedProducts(products) {
  if (!Array.isArray(products)) return [];
  return products.filter((product) => {
    const id = String(product?.id || "");
    return !product?.isDemo && !id.startsWith("demo-prod-");
  });
}


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
  if (!res.ok) {
    const error = new Error(data?.error || data?.message || `Cloud request failed (${res.status}).`);
    error.status = res.status;
    error.payload = data;
    throw error;
  }
  return data;
}

// Fire-and-forget persistence. The UI remains responsive, while the server
// becomes the durable copy. Failures are logged instead of pretending the
// database write succeeded.
// Serialize writes per state key. Several admin actions can update the same
// catalog bucket in quick succession (and the local optimistic write also
// triggers a background sync). Without a per-key queue, an older request can
// finish after a newer request and put stale data back into Supabase.
const cloudWriteChains = new Map();

function enqueueCloudWrite(key, data, { onConflict } = {}) {
  const token = getAdminAccessToken();
  if (!token) return Promise.reject(new Error("Admin session expired. Please log in again."));
  if (!ADMIN_STATE_KEYS.includes(key)) return Promise.reject(new Error("This data bucket cannot be saved from the admin panel."));

  const previous = cloudWriteChains.get(key) || Promise.resolve();
  const next = previous
    .catch(() => {})
    .then(async () => {
      const expectedUpdatedAt = getCloudVersion(key) || undefined;
      try {
        const result = await request(`${API_BASE}/admin/state`, {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify({ key, data, expectedUpdatedAt }),
        });
        setCloudVersion(key, result?.updatedAt || "");
        setCloudSnapshot(key, data);
        return { ...result, data };
      } catch (error) {
        if (error?.status !== 409) throw error;

        const latest = await request(`${API_BASE}/admin/state`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        const latestData = latest?.state?.[key];
        const latestVersion = latest?.versions?.[key] || "";
        const baseline = getCloudSnapshot(key);
        // Deletions and other explicit operations can provide a purpose-built
        // resolver. All other writes use a field-aware three-way merge.
        let rebasedData;
        try {
          rebasedData = typeof onConflict === "function"
            ? await onConflict(data, latestData)
            : baseline === undefined
              ? (() => { throw new Error("This catalog was changed by another admin. Please refresh the Admin Panel and try again."); })()
              : mergeConcurrentState(baseline, data, latestData, key);
        } catch (mergeError) {
          // Keep a recoverable copy separate from the live cache. A later
          // hydration can refresh authoritative data without destroying the
          // administrator's draft. This is storage-only; no UI is added.
          try {
            localStorage.setItem(`${CLOUD_SNAPSHOT_PREFIX}conflict_${key}`, JSON.stringify({ data, savedAt: new Date().toISOString() }));
          } catch { /* best-effort draft preservation */ }
          throw mergeError;
        }
        let retry;
        try {
          retry = await request(`${API_BASE}/admin/state`, {
            method: "PUT",
            headers: { Authorization: `Bearer ${token}` },
            body: JSON.stringify({ key, data: rebasedData, expectedUpdatedAt: latestVersion || undefined }),
          });
        } catch (retryError) {
          if (retryError?.status === 409) {
            try {
              localStorage.setItem(`${CLOUD_SNAPSHOT_PREFIX}conflict_${key}`, JSON.stringify({ data: rebasedData, savedAt: new Date().toISOString() }));
            } catch { /* best-effort draft preservation */ }
          }
          throw retryError;
        }
        setCloudVersion(key, retry?.updatedAt || latestVersion);
        setCloudSnapshot(key, rebasedData);
        try { localStorage.setItem(key, JSON.stringify(rebasedData)); } catch { /* cache only */ }
        if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("nle-catalog-updated"));
        return { ...retry, data: rebasedData, rebased: true };
      }
    });

  cloudWriteChains.set(key, next);
  next.finally(() => {
    if (cloudWriteChains.get(key) === next) cloudWriteChains.delete(key);
  }).catch(() => {});
  return next;
}

export function syncCloudState(key, data) {
  return enqueueCloudWrite(key, data);
}

export function syncCloudStateWithConflictResolver(key, data, onConflict) {
  return enqueueCloudWrite(key, data, { onConflict });
}

export async function waitForCloudWrites() {
  const pending = Array.from(cloudWriteChains.values());
  if (!pending.length) return;
  await Promise.allSettled(pending);
}

export function queueCloudSync(key, data) {
  const token = getAdminAccessToken();
  if (!token || !ADMIN_STATE_KEYS.includes(key)) return Promise.resolve(null);
  return enqueueCloudWrite(key, data).catch((err) => {
    console.warn(`Cloud sync failed for ${key}:`, err.message);
    return null;
  });
}

export async function hydratePublicState({ versionsOnly = false } = {}) {
  // Never overwrite the local cache while an admin save is still being written
  // to the cloud; the cloud copy is older at that moment and would wipe the
  // items that were just added.
  if (cloudWriteChains.size > 0) return {};
  // The metadata request is tiny and is used for polling. The full request is
  // reserved for first load or when an actual catalog version changed.
  const data = await request(`${API_BASE}/catalog${versionsOnly ? "?meta=1" : ""}`, { cache: "no-store" });
  const versions = data?.versions || {};

  if (versionsOnly) {
    let changed = false;
    Object.entries(versions).forEach(([key, value]) => {
      const previous = getCloudVersion(key);
      if (value && previous && previous !== value) changed = true;
      if (value && !previous) changed = true;
    });
    // Products missing locally while the cloud has them (e.g. an earlier fetch failed): refetch.
    try {
      const lp = localStorage.getItem("nle_catalog_v2_products");
      if (versions.nle_catalog_v2_products && (!lp || lp === "[]")) changed = true;
    } catch { /* cache only */ }
    if (changed) return hydratePublicState();
    Object.entries(versions).forEach(([key, value]) => setCloudVersion(key, value));
    return { versions };
  }

  const state = data?.state || {};
  let changed = false;
  const previousVersions = Object.fromEntries(Object.keys(versions).map((key) => [key, getCloudVersion(key)]));

  Object.entries(versions).forEach(([key, value]) => setCloudVersion(key, value));

  Object.entries(state).forEach(([key, value]) => {
    if (!PUBLIC_STATE_KEYS.includes(key) || key === "nle_catalog_v2_products") return;
    try {
      const nextRaw = JSON.stringify(value);
      if (localStorage.getItem(key) !== nextRaw) {
        localStorage.setItem(key, nextRaw);
        changed = true;
      }
      setCloudSnapshot(key, value);
    } catch { /* cache only */ }
  });

  const cloudProductVersion = versions.nle_catalog_v2_products || "";
  const localProductVersion = previousVersions.nle_catalog_v2_products || "";
  const localProducts = (() => {
    try { return localStorage.getItem("nle_catalog_v2_products"); } catch { return null; }
  })();
  const localProductCacheFormat = (() => {
    try { return localStorage.getItem(PRODUCT_CACHE_FORMAT_KEY) || ""; } catch { return ""; }
  })();

  if (!localProducts || (cloudProductVersion && localProductVersion !== cloudProductVersion) || localProductCacheFormat !== PRODUCT_CACHE_FORMAT) {
    const productPayload = await request(`${API_BASE}/catalog/products?v=${encodeURIComponent(cloudProductVersion || Date.now())}`, { cache: "no-store" });
    const products = productPayload?.data;
    if (products !== undefined) {
      const cleanProducts = removeLegacySeedProducts(products);
      try {
        const nextRaw = JSON.stringify(cleanProducts);
        if (localProducts !== nextRaw) {
          localStorage.setItem("nle_catalog_v2_products", nextRaw);
          changed = true;
        }
        localStorage.setItem(PRODUCT_CACHE_FORMAT_KEY, PRODUCT_CACHE_FORMAT);
        setCloudSnapshot("nle_catalog_v2_products", cleanProducts);
      } catch { /* cache only */ }
    }
  }

  if (changed) window.dispatchEvent(new CustomEvent("nle-catalog-updated"));
  return { ...state, versions };
}

// Keep an already-open storefront synchronized with admin changes made in
// another tab, browser, or device. Same-browser changes are already covered
// by the storage event in main.jsx; this lightweight polling only fetches the
// small catalog bootstrap, and the large products payload is fetched only
// when its updated_at version changes.
let publicSyncTimer = null;
let publicSyncInFlight = false;
let publicSyncLastRun = 0;

export function startPublicCatalogSync({ intervalMs = 120000, minRunGapMs = 5000 } = {}) {
  if (typeof window === "undefined") return () => {};
  if (publicSyncTimer) return () => stopPublicCatalogSync();

  const run = async (force = false) => {
    if (document.visibilityState === "hidden") return;
    const now = Date.now();
    if (!force && now - publicSyncLastRun < minRunGapMs) return;
    if (publicSyncInFlight) return;
    publicSyncLastRun = now;
    publicSyncInFlight = true;
    try {
      await hydratePublicState({ versionsOnly: true });
    } catch {
      // The storefront keeps its last-known local cache if the cloud is temporarily unavailable.
    } finally {
      publicSyncInFlight = false;
    }
  };

  const onVisibility = () => {
    if (document.visibilityState === "visible") run(true);
  };
  const onFocus = () => run(true);

  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("focus", onFocus);
  publicSyncTimer = window.setInterval(() => run(false), intervalMs);
  run(true);

  return () => stopPublicCatalogSync();
}

export function stopPublicCatalogSync() {
  if (typeof window === "undefined") return;
  if (publicSyncTimer) {
    window.clearInterval(publicSyncTimer);
    publicSyncTimer = null;
  }
}

export async function hydrateAdminState() {
  const token = getAdminAccessToken();
  if (!token) return {};
  const data = await request(`${API_BASE}/admin/state`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const state = data?.state || {};
  Object.entries(data?.versions || {}).forEach(([key, value]) => setCloudVersion(key, value));
  Object.entries(state).forEach(([key, value]) => {
    if (ADMIN_STATE_KEYS.includes(key)) {
      const nextValue = key === "nle_catalog_v2_products"
        ? removeLegacySeedProducts(value)
        : value;
      try { localStorage.setItem(key, JSON.stringify(nextValue)); } catch { /* cache only */ }
      setCloudSnapshot(key, nextValue);
      // Clean known legacy seed records out of the durable cloud catalog too.
      if (key === "nle_catalog_v2_products" && JSON.stringify(nextValue) !== JSON.stringify(value)) {
        enqueueCloudWrite(key, nextValue).catch((err) => console.warn("Legacy product cleanup failed:", err?.message || err));
      }
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
