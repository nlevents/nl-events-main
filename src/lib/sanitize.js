// ============================================================================
// SECURITY & SANITIZATION UTILITIES
// Prevents XSS, script injection, prototype pollution, and URL scheme exploits.
// ============================================================================

/**
 * Escapes HTML characters to prevent XSS.
 * @param {string} str
 * @returns {string}
 */
export function sanitizeText(str) {
  if (typeof str !== "string") return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}

/**
 * Strips dangerous HTML tags while allowing plain text.
 * @param {string} str
 * @returns {string}
 */
export function stripHtml(str) {
  if (typeof str !== "string") return "";
  return str.replace(/<[^>]*>?/gm, "").trim();
}

/**
 * Validates and sanitizes a URL to ensure safe protocols (https, http, or safe data:image).
 * Blocks dangerous schemes like javascript:, vbscript:, data:text/html, etc.
 * @param {string} url
 * @returns {string} Safe URL or fallback placeholder
 */
export function sanitizeUrl(url) {
  if (typeof url !== "string") return "";
  const trimmed = url.trim();
  if (!trimmed) return "";

  // Allow relative paths starting with /
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
    return trimmed;
  }

  // Allow safe base64 images
  if (/^data:image\/(png|jpeg|jpg|webp|gif|svg\+xml);base64,[A-Za-z0-9+/=]+$/i.test(trimmed)) {
    return trimmed;
  }

  // Check protocol
  try {
    const origin = typeof window !== "undefined" && window.location ? window.location.origin : "http://localhost";
    const parsed = new URL(trimmed, origin);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return trimmed;
    }
  } catch {
    // Malformed URL
    return "";
  }

  return "";
}

/**
 * Validates an Instagram post/reel permalink. Only allows https URLs on the
 * real instagram.com host, so admins can't smuggle arbitrary embeds/scripts
 * in through this field.
 * @param {string} url
 * @returns {string} Safe Instagram URL, or "" if invalid.
 */
export function sanitizeInstagramUrl(url) {
  if (typeof url !== "string") return "";
  const trimmed = url.trim();
  if (!trimmed) return "";
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "https:") return "";
    const host = parsed.hostname.toLowerCase();
    if (host !== "instagram.com" && host !== "www.instagram.com") return "";
    if (!/^\/(p|reel|reels|tv)\//.test(parsed.pathname)) return "";
    return "https://www.instagram.com" + parsed.pathname.replace(/\/?$/, "/");
  } catch {
    return "";
  }
}

/**
 * Validates a link for the "Shorts" rail: either an Instagram post/reel
 * permalink, or a YouTube link (including Shorts). Only allows https URLs
 * on real instagram.com / youtube.com / youtu.be hosts, so admins can't
 * smuggle arbitrary embeds/scripts in through this field.
 * @param {string} url
 * @returns {string} Safe URL, or "" if invalid.
 */
export function sanitizeShortVideoUrl(url) {
  if (typeof url !== "string") return "";
  const trimmed = url.trim();
  if (!trimmed) return "";
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "https:") return "";
    const host = parsed.hostname.toLowerCase();

    if (host === "instagram.com" || host === "www.instagram.com") {
      if (!/^\/(p|reel|reels|tv)\//.test(parsed.pathname)) return "";
      return "https://www.instagram.com" + parsed.pathname.replace(/\/?$/, "/");
    }

    if (host === "youtube.com" || host === "www.youtube.com" || host === "m.youtube.com" || host === "youtu.be") {
      const isValidShape =
        /^\/(watch|shorts\/|embed\/)/.test(parsed.pathname) || host === "youtu.be";
      if (!isValidShape) return "";
      return trimmed;
    }

    return "";
  } catch {
    return "";
  }
}

/**
 * Validates a slug (alphanumeric and dashes only).
 * @param {string} slug
 * @returns {string}
 */
export function sanitizeSlug(slug) {
  if (typeof slug !== "string") return "";
  return slug
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Sanitizes numeric input, clamping within bounds.
 * @param {any} val
 * @param {number} min
 * @param {number} max
 * @param {number} fallback
 * @returns {number}
 */
export function sanitizeNumber(val, min = 0, max = 100000000, fallback = 0) {
  const num = Number(val);
  if (Number.isNaN(num) || !Number.isFinite(num)) return fallback;
  return Math.max(min, Math.min(max, num));
}

/**
 * Prevents prototype pollution when parsing or merging untrusted objects.
 * @param {any} obj
 * @returns {any}
 */
export function cleanObject(obj) {
  if (obj === null || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(cleanObject);

  const clean = {};
  for (const key of Object.keys(obj)) {
    if (key === "__proto__" || key === "constructor" || key === "prototype") {
      continue;
    }
    clean[key] = cleanObject(obj[key]);
  }
  return clean;
}
