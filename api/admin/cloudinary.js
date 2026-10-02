// ============================================================================
// CLOUDINARY ADMIN ASSET MANAGEMENT
// Server-only deletion endpoint. Cloudinary API credentials NEVER reach the
// browser. Assets are deleted only when the current catalog no longer
// references them anywhere in the managed state.
// ============================================================================

import { createHash } from "node:crypto";
import { requireAdmin } from "../../shared/auth/supabaseAuth.js";
import { readStates, readStateVersions, writeState } from "../../shared/stateStore.js";

const REFERENCE_KEYS = [
  "nle_catalog_v2_products",
  "nle_catalog_v2_media",
  "nle_catalog_v2_gallery",
  "nle_catalog_v2_occasions",
  "nle_catalog_v2_addons",
  "nle_catalog_v2_birthday_age_categories",
];

function bearerToken(req) {
  return String(req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();
}

function collectStrings(value, out = []) {
  if (typeof value === "string") {
    out.push(value);
    return out;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => collectStrings(item, out));
    return out;
  }
  if (value && typeof value === "object") {
    Object.values(value).forEach((item) => collectStrings(item, out));
  }
  return out;
}

function isManagedPublicId(publicId) {
  // Only assets uploaded by this application are eligible for automatic
  // cleanup. Static nle-assets and unrelated Cloudinary assets are protected.
  return /^next-level-events\//.test(publicId);
}

function stateReferencesPublicId(state, publicId) {
  const needle = String(publicId || "").trim();
  if (!needle) return false;
  const urlsAndIds = collectStrings(state);
  return urlsAndIds.some((value) => {
    if (value === needle) return true;
    if (value.includes(`/${needle}.`)) return true;
    if (value.includes(`/${needle}/`)) return true;
    if (value.includes(`/${needle}?`)) return true;
    return false;
  });
}

async function destroyPublicId(cloudName, apiKey, apiSecret, publicId) {
  const timestamp = Math.floor(Date.now() / 1000);
  // Cloudinary signatures are SHA-1 hashes of the signed parameter string
  // plus the server-only API secret.
  const toSign = `invalidate=true&public_id=${publicId}&timestamp=${timestamp}`;
  const signature = createHash("sha1").update(`${toSign}${apiSecret}`).digest("hex");

  const body = new URLSearchParams({
    public_id: publicId,
    timestamp: String(timestamp),
    api_key: apiKey,
    signature,
    invalidate: "true",
  });

  const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/destroy`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  let data = null;
  try { data = await response.json(); } catch { /* ignore */ }
  if (!response.ok) throw new Error(data?.error?.message || `Cloudinary deletion failed (${response.status}).`);
  return data;
}

export default async function handler(req, res) {
  const user = await requireAdmin(process.env, req.headers.authorization);
  if (!user.user) return res.status(401).json({ ok: false, error: user.error });

  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed." });

  const cloudName = String(process.env.CLOUDINARY_CLOUD_NAME || process.env.VITE_CLOUDINARY_CLOUD_NAME || "").trim();
  const apiKey = String(process.env.CLOUDINARY_API_KEY || "").trim();
  const apiSecret = String(process.env.CLOUDINARY_API_SECRET || "").trim();
  if (!cloudName || !apiKey || !apiSecret) {
    return res.status(503).json({
      ok: false,
      error: "Cloudinary server credentials are not configured. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET to the server environment.",
    });
  }

  const requested = Array.isArray(req.body?.publicIds) ? req.body.publicIds : [];
  const publicIds = Array.from(new Set(requested.map((id) => String(id || "").trim()).filter(Boolean)));
  if (!publicIds.length) return res.status(400).json({ ok: false, error: "No Cloudinary public IDs supplied." });
  if (publicIds.length > 50) return res.status(400).json({ ok: false, error: "Too many assets in one cleanup request." });

  try {
    const token = bearerToken(req);
    const state = await readStates(process.env, REFERENCE_KEYS, token);
    const versions = await readStateVersions(process.env, ["nle_catalog_v2_media"], token);
    const results = [];

    for (const publicId of publicIds) {
      if (!isManagedPublicId(publicId)) {
        results.push({ publicId, status: "protected", reason: "Asset is outside the application's managed upload folder." });
        continue;
      }

      // The media library is metadata, not a reason to keep an otherwise
      // orphaned asset alive forever. If the asset is not referenced by any
      // product/gallery/category/etc., remove its matching media records first.
      const nonMediaState = { ...state, nle_catalog_v2_media: [] };
      if (stateReferencesPublicId(nonMediaState, publicId)) {
        results.push({ publicId, status: "kept", reason: "Asset is still referenced by the catalog." });
        continue;
      }

      const media = Array.isArray(state.nle_catalog_v2_media) ? state.nle_catalog_v2_media : [];
      const matchingMedia = media.filter((item) => {
        const itemId = String(item?.cloudinaryPublicId || "").trim();
        return itemId === publicId || String(item?.url || "").includes(`/${publicId}.`);
      });

      if (matchingMedia.length) {
        const currentVersion = versions.nle_catalog_v2_media || null;
        const remainingMedia = media.filter((item) => !matchingMedia.includes(item));
        try {
          await writeState(process.env, "nle_catalog_v2_media", remainingMedia, user.user.id, currentVersion, token);
          state.nle_catalog_v2_media = remainingMedia;
        } catch (error) {
          // A concurrent media edit means we cannot prove the asset is no
          // longer referenced. Keep the Cloudinary asset rather than risk loss.
          results.push({ publicId, status: "kept", reason: "Media library changed concurrently; cleanup was skipped safely." });
          continue;
        }
      }

      try {
        const result = await destroyPublicId(cloudName, apiKey, apiSecret, publicId);
        results.push({ publicId, status: result?.result === "ok" ? "deleted" : "not_deleted", result: result?.result || null });
      } catch (error) {
        results.push({ publicId, status: "error", reason: error?.message || "Cloudinary deletion failed." });
      }
    }

    const hasErrors = results.some((item) => item.status === "error");
    return res.status(hasErrors ? 207 : 200).json({ ok: !hasErrors, results });
  } catch (error) {
    console.error("Cloudinary cleanup error:", error);
    return res.status(500).json({ ok: false, error: error?.message || "Unable to clean up Cloudinary assets." });
  }
}
