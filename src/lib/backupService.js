import { exportFullCatalogData, importFullCatalogData } from "./catalogStore";
import { getClients, getInvoices, getSettings, saveSettings } from "./adminStore";
import { fetchAdminInquiries } from "./adminApi";
import { fetchAdminCloudState, syncCloudState } from "./cloudStore";
import { OCCASIONS } from "../data/occasions";
import { NAV_LINKS, BOTTOM_LINKS, CATEGORY_NAV, SEARCH_INDEX } from "../data/nav";
import { IMAGES } from "../data/images";

const EXCLUDED_KEYS = new Set([
  "nle-admin-supabase-session",
  "nle-auth-session",
  "nle-cart",
  "nle-loader",
  "nle-applied-coupon",
  "nle-last-inquiry",
  "nle-last-order",
]);

function safeParse(value) {
  try { return JSON.parse(value); } catch { return value; }
}

function collectLocalStorage() {
  const data = {};
  if (typeof localStorage === "undefined") return data;
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (!key || EXCLUDED_KEYS.has(key)) continue;
    data[key] = safeParse(localStorage.getItem(key));
  }
  return data;
}

function collectUrls(value, urls = new Set(), seen = new Set()) {
  if (value == null) return urls;
  if (typeof value === "string") {
    if (/^(https?:\/\/|data:image\/|\/assets\/|\/images\/)/i.test(value)) urls.add(value);
    return urls;
  }
  if (typeof value !== "object") return urls;
  if (seen.has(value)) return urls;
  seen.add(value);
  if (Array.isArray(value)) value.forEach((item) => collectUrls(item, urls, seen));
  else Object.values(value).forEach((item) => collectUrls(item, urls, seen));
  return urls;
}

async function fetchAsDataUrl(url) {
  if (!url || url.startsWith("data:")) return { url, dataUrl: url, status: "embedded" };
  try {
    const absolute = new URL(url, window.location.origin).href;
    const response = await fetch(absolute, { credentials: "omit" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const blob = await response.blob();
    if (!blob.type.startsWith("image/") && !blob.type.startsWith("video/")) return { url, status: "skipped", reason: "not-media" };
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    return { url, dataUrl, status: "embedded", size: blob.size, type: blob.type };
  } catch (error) {
    return { url, status: "url-only", reason: error?.message || "Unable to fetch media" };
  }
}

async function captureMedia(catalog, includeMedia) {
  const urls = Array.from(collectUrls(catalog));
  if (!includeMedia) return urls.map((url) => ({ url, status: "url-only" }));
  const results = [];
  for (let i = 0; i < urls.length; i += 4) {
    const batch = await Promise.all(urls.slice(i, i + 4).map(fetchAsDataUrl));
    results.push(...batch);
  }
  return results;
}

export async function createCompleteBackup({ includeMedia = false } = {}) {
  const catalog = JSON.parse(exportFullCatalogData());
  let cloud = {};
  let crm = { inquiries: [], bookings: [] };
  try { cloud = await fetchAdminCloudState(); } catch { cloud = {}; }
  try { crm = await fetchAdminInquiries(); } catch { crm = { inquiries: [], bookings: [] }; }

  const rawResources = safeParse(localStorage.getItem("nle-admin-resources") || "{}");
  const media = await captureMedia({ catalog, occasions: OCCASIONS, publicAssets: IMAGES }, includeMedia);

  return {
    backupFormat: "nle-complete-backup",
    backupVersion: 2,
    exportedAt: new Date().toISOString(),
    app: { name: "Next Level Events", source: "admin-backup", formatVersion: 2 },
    cloudState: cloud,
    crm: { inquiries: crm.inquiries || [], bookings: crm.bookings || [] },
    admin: {
      clients: getClients(),
      invoices: getInvoices(),
      settings: getSettings(),
      resources: rawResources || {},
    },
    catalog,
    publicAssets: IMAGES,
    pageHierarchy: {
      occasions: OCCASIONS,
      navigation: NAV_LINKS,
      bottomNavigation: BOTTOM_LINKS,
      categoryNavigation: CATEGORY_NAV,
      searchIndex: SEARCH_INDEX,
    },
    localStorage: collectLocalStorage(),
    mediaAssets: media,
    included: {
      leads: true,
      bookings: true,
      clients: true,
      invoices: true,
      payments: true,
      quotations: true,
      products: true,
      packages: true,
      services: true,
      categories: true,
      mediaMetadata: true,
      mediaFiles: includeMedia,
      pageHierarchy: true,
      navigation: true,
      settings: true,
      localCache: true,
    },
  };
}

export async function restoreCompleteBackup(data, { syncCloud = true } = {}) {
  if (!data || data.backupFormat !== "nle-complete-backup") throw new Error("This is not a valid Next Level Events backup.");
  if (data.catalog) importFullCatalogData(JSON.stringify(data.catalog));
  if (data.admin?.clients) localStorage.setItem("nle-admin-clients", JSON.stringify(data.admin.clients));
  if (data.admin?.invoices) localStorage.setItem("nle-admin-invoices", JSON.stringify(data.admin.invoices));
  if (data.admin?.settings) saveSettings(data.admin.settings);
  if (data.admin?.resources) localStorage.setItem("nle-admin-resources", JSON.stringify(data.admin.resources));
  Object.entries(data.localStorage || {}).forEach(([key, value]) => {
    if (!EXCLUDED_KEYS.has(key)) localStorage.setItem(key, JSON.stringify(value));
  });

  if (syncCloud && data.cloudState && typeof data.cloudState === "object") {
    const keys = Object.keys(data.cloudState);
    for (const key of keys) await syncCloudState(key, data.cloudState[key]);
  }
  window.dispatchEvent(new CustomEvent("nle-catalog-updated"));
  window.dispatchEvent(new CustomEvent("nle-admin-backup-restored"));
  return true;
}
