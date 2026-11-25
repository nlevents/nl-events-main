// Server-only cleanup of orphaned candidate resume PDFs in Cloudinary.
// Cloudinary API credentials never reach the browser. A file is deleted only if
// it lives in the managed resumes folder AND no saved candidate still uses it.
import { createHash } from "node:crypto";
import { requireAdmin } from "../../shared/auth/supabaseAuth.js";
import { readState } from "../../shared/stateStore.js";

const KEY = "nle-admin-candidates";

function bearerToken(req) {
  return String(req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();
}

// Returns the managed raw public id for a Cloudinary resume URL, or "".
function resumePublicId(url, cloudName) {
  try {
    const parsed = new URL(String(url || ""));
    if (parsed.protocol !== "https:" || parsed.hostname !== "res.cloudinary.com") return "";
    const match = parsed.pathname.match(/^\/([^/]+)\/raw\/upload\/(?:v\d+\/)?(next-level-events\/resumes\/[A-Za-z0-9_\-.]{1,150})$/);
    if (!match || match[1] !== cloudName || match[2].includes("..")) return "";
    return match[2];
  } catch { return ""; }
}

async function destroyRaw(cloudName, apiKey, apiSecret, publicId) {
  const timestamp = Math.floor(Date.now() / 1000);
  const toSign = `invalidate=true&public_id=${publicId}&timestamp=${timestamp}`;
  const signature = createHash("sha1").update(`${toSign}${apiSecret}`).digest("hex");
  const body = new URLSearchParams({ public_id: publicId, timestamp: String(timestamp), api_key: apiKey, signature, invalidate: "true" });
  const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/raw/destroy`, {
    method: "POST",
    signal: AbortSignal.timeout(15000),
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  let data = null;
  try { data = await response.json(); } catch { /* ignore */ }
  if (!response.ok) throw new Error(data?.error?.message || `Cloudinary deletion failed (${response.status}).`);
  return data;
}

export default async function handler(req, res) {
  const auth = await requireAdmin(process.env, req.headers.authorization);
  if (!auth.user) return res.status(401).json({ ok: false, error: auth.error });
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed." });

  const cloudName = String(process.env.CLOUDINARY_CLOUD_NAME || process.env.VITE_CLOUDINARY_CLOUD_NAME || "").trim();
  const apiKey = String(process.env.CLOUDINARY_API_KEY || "").trim();
  const apiSecret = String(process.env.CLOUDINARY_API_SECRET || "").trim();
  if (!cloudName || !apiKey || !apiSecret) {
    return res.status(503).json({ ok: false, error: "Cloudinary server credentials are not configured." });
  }

  // Signed, short-lived download link generated through Cloudinary's API, so
  // resumes open even when public PDF delivery is blocked on the account.
  if (req.body?.mode === "download") {
    const publicId = resumePublicId(req.body?.url, cloudName);
    if (!publicId) return res.status(400).json({ ok: false, error: "Invalid resume file." });
    const timestamp = Math.floor(Date.now() / 1000);
    const expiresAt = timestamp + 300;
    const toSign = `expires_at=${expiresAt}&public_id=${publicId}&timestamp=${timestamp}`;
    const signature = createHash("sha1").update(`${toSign}${apiSecret}`).digest("hex");
    const query = new URLSearchParams({ public_id: publicId, timestamp: String(timestamp), expires_at: String(expiresAt), api_key: apiKey, signature });
    return res.status(200).json({ ok: true, url: `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/raw/download?${query}` });
  }

  const requested = Array.isArray(req.body?.urls) ? req.body.urls.slice(0, 50) : [];
  const ids = Array.from(new Set(requested.map((url) => resumePublicId(url, cloudName)).filter(Boolean)));
  if (!ids.length) return res.status(400).json({ ok: false, error: "No valid resume files supplied." });

  try {
    const candidates = await readState(process.env, KEY, bearerToken(req));
    const inUse = new Set((Array.isArray(candidates) ? candidates : []).map((c) => resumePublicId(c?.resumeUrl, cloudName)).filter(Boolean));
    const results = [];
    for (const publicId of ids) {
      if (inUse.has(publicId)) { results.push({ publicId, status: "kept" }); continue; }
      try {
        const out = await destroyRaw(cloudName, apiKey, apiSecret, publicId);
        results.push({ publicId, status: out?.result === "ok" ? "deleted" : "not_deleted" });
      } catch (error) {
        console.error("Resume deletion failed:", error?.message || error);
        results.push({ publicId, status: "error" });
      }
    }
    return res.status(200).json({ ok: true, results });
  } catch (error) {
    console.error("Resume cleanup error:", error);
    return res.status(500).json({ ok: false, error: "Unable to clean up resume files." });
  }
}
