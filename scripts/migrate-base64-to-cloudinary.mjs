/**
 * One-time migration for legacy base64/data-URL images.
 *
 * Required environment variables:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   CLOUDINARY_CLOUD_NAME
 *   CLOUDINARY_API_KEY
 *   CLOUDINARY_API_SECRET
 *
 * Run:
 *   node scripts/migrate-base64-to-cloudinary.mjs
 *
 * The script only changes strings that are data:image/*;base64,... . It keeps
 * all other catalog data unchanged and writes the resulting Cloudinary HTTPS
 * URL back into the same JSON fields.
 */
import crypto from "node:crypto";

const env = process.env;
const required = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
];
const missing = required.filter((k) => !env[k]);
if (missing.length) {
  console.error(`Missing environment variables: ${missing.join(", ")}`);
  process.exit(1);
}

const supabaseBase = env.SUPABASE_URL.replace(/\/$/, "");
const cloudName = env.CLOUDINARY_CLOUD_NAME;
const cloudinaryUpload = `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/upload`;
const keys = [
  "nle_catalog_v2_products",
  "nle_catalog_v2_occasions",
  "nle_catalog_v2_gallery",
  "nle_catalog_v2_birthday_age_categories",
  "nle_catalog_v2_addons",
  "nle_catalog_v2_media",
];

async function supabase(path, options = {}) {
  const res = await fetch(`${supabaseBase}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: options.prefer || "return=representation",
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${typeof data === "string" ? data : JSON.stringify(data)}`);
  return data;
}

function sha1(value) {
  return crypto.createHash("sha1").update(value).digest("hex");
}

function sign(params) {
  const serialized = Object.keys(params)
    .filter((key) => params[key] !== undefined && params[key] !== null && params[key] !== "")
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
  return sha1(`${serialized}${env.CLOUDINARY_API_SECRET}`);
}

async function uploadDataUrl(dataUrl, publicId) {
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = "next-level-events/migrated";
  const params = { folder, public_id: publicId, timestamp };
  const form = new FormData();
  form.append("file", dataUrl);
  form.append("api_key", env.CLOUDINARY_API_KEY);
  form.append("timestamp", String(timestamp));
  form.append("folder", folder);
  form.append("public_id", publicId);
  form.append("signature", sign(params));

  const res = await fetch(cloudinaryUpload, { method: "POST", body: form });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.secure_url) throw new Error(`Cloudinary ${res.status}: ${data?.error?.message || "upload failed"}`);
  return data;
}

const cache = new Map();
let uploadedCount = 0;

async function migrateValue(value, path) {
  if (typeof value === "string") {
    const match = value.match(/^data:image\/(?:png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$/i);
    if (!match) return value;
    if (cache.has(value)) return cache.get(value);
    const publicId = `legacy-${sha1(value).slice(0, 20)}`;
    const uploaded = await uploadDataUrl(value, publicId);
    const url = uploaded.secure_url;
    cache.set(value, url);
    uploadedCount += 1;
    console.log(`  migrated ${path} -> ${url}`);
    return url;
  }
  if (Array.isArray(value)) {
    const out = [];
    for (let i = 0; i < value.length; i += 1) out.push(await migrateValue(value[i], `${path}[${i}]`));
    return out;
  }
  if (value && typeof value === "object") {
    const out = {};
    for (const [key, child] of Object.entries(value)) out[key] = await migrateValue(child, `${path}.${key}`);
    return out;
  }
  return value;
}

for (const key of keys) {
  const encoded = encodeURIComponent(key);
  const rows = await supabase(`app_state?key=eq.${encoded}&select=key,data`);
  if (!rows?.[0]) {
    console.log(`${key}: not present, skipped`);
    continue;
  }
  const original = rows[0].data;
  const migrated = await migrateValue(original, key);
  const changed = JSON.stringify(original) !== JSON.stringify(migrated);
  if (!changed) {
    console.log(`${key}: no base64 images found`);
    continue;
  }
  await supabase("app_state?on_conflict=key", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=representation",
    body: JSON.stringify({ key, data: migrated, updated_at: new Date().toISOString() }),
  });
  console.log(`${key}: saved`);
}

console.log(`Done. Cloudinary uploads: ${uploadedCount}`);
