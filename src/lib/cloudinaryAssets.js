const DEFAULT_CLOUD_NAME = "jh0tqpsv";
const LOCAL_PREFIX = "/assets/images/";

function getCloudName() {
  if (typeof import.meta !== "undefined" && import.meta.env) {
    return String(import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || DEFAULT_CLOUD_NAME).trim();
  }
  if (typeof window !== "undefined" && window.__ENV__) {
    return String(window.__ENV__.VITE_CLOUDINARY_CLOUD_NAME || DEFAULT_CLOUD_NAME).trim();
  }
  return DEFAULT_CLOUD_NAME;
}

function isEnabled() {
  if (typeof import.meta !== "undefined" && import.meta.env) {
    return String(import.meta.env.VITE_USE_CLOUDINARY_ASSETS || "true").toLowerCase() === "true";
  }
  if (typeof window !== "undefined" && window.__ENV__) {
    return String(window.__ENV__.VITE_USE_CLOUDINARY_ASSETS || "true").toLowerCase() === "true";
  }
  return false;
}

function defaultWidthFor(relative) {
  if (relative.startsWith("client-catalog/")) return 960;
  if (relative.startsWith("catalog/") || relative.startsWith("categories/")) return 640;
  if (relative.startsWith("brand/")) return 192;
  return 800;
}

export function cloudinaryAsset(localPath, { width, quality = "auto" } = {}) {
  if (!localPath || typeof localPath !== "string") return localPath;
  if (/^https?:\/\//i.test(localPath)) return localPath;
  if (!isEnabled() || !localPath.startsWith(LOCAL_PREFIX)) return localPath;

  const relative = localPath.slice(LOCAL_PREFIX.length).replace(/\.[^.\/]+$/, "");
  const publicId = `nle-assets/${relative}`;
  const targetWidth = width ?? defaultWidthFor(relative);
  const transform = `f_auto,q_${quality},c_limit,w_${targetWidth},dpr_auto`;
  return `https://res.cloudinary.com/${encodeURIComponent(getCloudName())}/image/upload/${transform}/${publicId}`;
}

export function cloudinaryEnabled() {
  return isEnabled();
}
