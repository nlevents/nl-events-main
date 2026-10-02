// ============================================================================
// CLOUDINARY MEDIA UPLOADS
// Images/videos belong in Cloudinary; Supabase stores only their URLs/metadata.
// The upload preset must be configured as an unsigned preset with a safe
// folder and resource limits in the Cloudinary console.
// ============================================================================

const DEFAULT_CLOUD_NAME = "jh0tqpsv";
const DEFAULT_UPLOAD_PRESET = "nle_development";

function getCloudConfig() {
  const envCloudName =
    (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_CLOUDINARY_CLOUD_NAME) ||
    (typeof window !== "undefined" && window.__ENV__ && window.__ENV__.VITE_CLOUDINARY_CLOUD_NAME) ||
    "";
  const envUploadPreset =
    (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET) ||
    (typeof window !== "undefined" && window.__ENV__ && window.__ENV__.VITE_CLOUDINARY_UPLOAD_PRESET) ||
    "";

  const cloudName = String(envCloudName || DEFAULT_CLOUD_NAME).trim();
  const uploadPreset = String(envUploadPreset || DEFAULT_UPLOAD_PRESET).trim();
  return { cloudName, uploadPreset };
}

function configError() {
  return new Error(
    "Cloudinary is not configured. Set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET, then rebuild the website."
  );
}

async function uploadToCloudinary(file, resourceType = "image") {
  const { cloudName, uploadPreset } = getCloudConfig();
  if (!cloudName || !uploadPreset) throw configError();
  const endpoint = `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/${resourceType}/upload`;
  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", uploadPreset);
  form.append("folder", "next-level-events");

  const response = await fetch(endpoint, { method: "POST", body: form });
  let data = null;
  try { data = await response.json(); } catch { /* ignore */ }
  if (!response.ok || !data?.secure_url) {
    throw new Error(data?.error?.message || `Cloudinary upload failed (${response.status}).`);
  }
  return data;
}

export async function uploadImageBlob(blob, filename = "image.webp") {
  const file = blob instanceof File ? blob : new File([blob], filename, { type: blob.type || "image/webp" });
  return uploadToCloudinary(file, "image");
}

export async function uploadImageUrl(url) {
  const { cloudName, uploadPreset } = getCloudConfig();
  if (!cloudName || !uploadPreset) throw configError();
  const endpoint = `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/upload`;
  const form = new FormData();
  form.append("file", url);
  form.append("upload_preset", uploadPreset);
  form.append("folder", "next-level-events");

  const response = await fetch(endpoint, { method: "POST", body: form });
  let data = null;
  try { data = await response.json(); } catch { /* ignore */ }
  if (!response.ok || !data?.secure_url) {
    throw new Error(data?.error?.message || `Cloudinary URL import failed (${response.status}).`);
  }
  return data;
}


function getAdminAccessToken() {
  try {
    const raw = sessionStorage.getItem("nle-admin-supabase-session");
    const session = raw ? JSON.parse(raw) : null;
    return session?.access_token || "";
  } catch {
    return "";
  }
}

export function extractManagedCloudinaryPublicId(urlOrPublicId) {
  const raw = String(urlOrPublicId || "").trim();
  if (!raw) return "";
  if (/^next-level-events\//.test(raw)) return raw.replace(/\.[a-z0-9]+$/i, "");
  try {
    const url = new URL(raw);
    if (!/^(?:www\.)?res\.cloudinary\.com$/i.test(url.hostname)) return "";
    const marker = "/image/upload/";
    const index = url.pathname.indexOf(marker);
    if (index === -1) return "";
    const payload = url.pathname.slice(index + marker.length).replace(/^\/+/, "");
    const managedIndex = payload.indexOf("next-level-events/");
    if (managedIndex === -1) return "";
    return payload.slice(managedIndex).replace(/\.[a-z0-9]+$/i, "");
  } catch {
    return "";
  }
}

export async function cleanupUnusedCloudinaryAssets(publicIds = []) {
  const token = getAdminAccessToken();
  const ids = Array.from(new Set((Array.isArray(publicIds) ? publicIds : [])
    .map(extractManagedCloudinaryPublicId)
    .filter(Boolean)));
  if (!ids.length) return { ok: true, results: [] };
  if (!token) throw new Error("Admin session expired. Please log in again.");

  let response;
  try {
    response = await fetch("/api/admin/cloudinary", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ publicIds: ids }),
    });
  } catch {
    throw new Error("Unable to reach the Cloudinary cleanup service.");
  }
  let data = null;
  try { data = await response.json(); } catch { /* ignore */ }
  if (!response.ok && response.status !== 207) {
    throw new Error(data?.error || `Cloudinary cleanup failed (${response.status}).`);
  }
  return data || { ok: response.ok, results: [] };
}
