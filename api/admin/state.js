import { requireAdmin } from "../../shared/auth/supabaseAuth.js";
import { readStates, writeState } from "../../shared/stateStore.js";

const KEYS = [
  "nle_catalog_v2_products", "nle_catalog_v2_occasions", "nle_catalog_v2_media", "nle_catalog_v2_gallery",
  "nle_catalog_v2_insta_videos", "nle_catalog_v2_video_reviews", "nle_catalog_v2_cities", "nle_catalog_v2_addons",
  "nle_catalog_v2_coupons", "nle_catalog_v2_inquiries", "nle_catalog_v2_blackouts",
  "nle-admin-clients", "nle-admin-invoices", "nle-admin-settings",
  "nle_catalog_v2_birthday_age_categories",
];

async function auth(req, res) {
  const result = await requireAdmin(process.env, req.headers.authorization);
  if (!result.user) { res.status(401).json({ ok: false, error: result.error }); return null; }
  return result.user;
}

export default async function handler(req, res) {
  const user = await auth(req, res);
  if (!user) return;
  try {
    if (req.method === "GET") {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      return res.status(200).json({ ok: true, state: await readStates(process.env, KEYS) });
    }
    if (req.method === "PUT") {
      const { key, data } = req.body || {};
      if (!KEYS.includes(key)) return res.status(400).json({ ok: false, error: "Unknown state key." });
      if (data === undefined) return res.status(400).json({ ok: false, error: "Missing data." });
      await writeState(process.env, key, data, user.id);
      return res.status(200).json({ ok: true, key });
    }
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (err) {
    console.error("Admin state API error:", err);
    const message = String(err?.message || "");
    if (message.includes("Supabase is not configured on the server")) {
      return res.status(503).json({ ok: false, error: "Admin cloud storage is not configured. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to the Vercel environment variables, then redeploy." });
    }
    return res.status(500).json({ ok: false, error: message || "Unable to save admin data." });
  }
}
