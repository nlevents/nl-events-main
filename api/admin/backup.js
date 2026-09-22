import { requireAdmin } from "../../shared/auth/supabaseAuth.js";
import { readStates } from "../../shared/stateStore.js";
import { getServerSupabase } from "../../shared/supabase/serverClient.js";

const STATE_KEYS = [
  "nle_catalog_v2_products", "nle_catalog_v2_occasions", "nle_catalog_v2_media", "nle_catalog_v2_gallery",
  "nle_catalog_v2_insta_videos", "nle_catalog_v2_video_reviews", "nle_catalog_v2_cities", "nle_catalog_v2_addons",
  "nle_catalog_v2_coupons", "nle_catalog_v2_inquiries", "nle_catalog_v2_blackouts",
  "nle-admin-clients", "nle-admin-invoices", "nle-admin-settings",
];

async function auth(req, res) {
  const result = await requireAdmin(process.env, req.headers?.authorization);
  if (!result.user) { res.status(401).json({ ok: false, error: result.error }); return null; }
  return result.user;
}

export default async function handler(req, res) {
  const user = await auth(req, res);
  if (!user) return;
  const db = getServerSupabase(process.env);
  if (!db) return res.status(503).json({ ok: false, error: "Supabase is not configured on the server." });

  try {
    if (req.method !== "GET") return res.status(405).json({ ok: false, error: "Method not allowed" });
    const state = await readStates(process.env, STATE_KEYS);
    const inquiries = await db.query("inquiries?select=*&order=created_at.desc", { method: "GET" });
    const bookings = await db.query("bookings?select=*&order=created_at.desc", { method: "GET" });
    return res.status(200).json({
      ok: true,
      exportedAt: new Date().toISOString(),
      exportedBy: user.email || user.id,
      state,
      crm: { inquiries: inquiries || [], bookings: bookings || [] },
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err?.message || "Unable to create cloud backup." });
  }
}
