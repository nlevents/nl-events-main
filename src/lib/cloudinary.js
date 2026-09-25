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
