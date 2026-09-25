import { readState } from "../../shared/stateStore.js";

// Product data is deliberately isolated from the lightweight catalog bootstrap.
// It is only requested when the browser does not have the current version.
export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ ok: false, error: "Method not allowed" });
  try {
    const products = await readState(process.env, "nle_catalog_v2_products");
    // Products can be cached briefly by the browser/CDN. Admin writes update
    // app_state.updated_at, and the lightweight /api/catalog endpoint exposes
    // that version so clients know when to refresh.
    res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
    return res.status(200).json({ ok: true, data: products ?? [] });
  } catch (err) {
    console.error("Products API error:", err);
    return res.status(500).json({ ok: false, error: "Unable to load products." });
  }
}
