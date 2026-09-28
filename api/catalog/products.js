import { readState } from "../../shared/stateStore.js";

// Product data is deliberately isolated from the lightweight catalog bootstrap.
// It is only requested when the browser does not have the current version.
export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ ok: false, error: "Method not allowed" });
  try {
    const products = await readState(process.env, "nle_catalog_v2_products");
    const cleanProducts = Array.isArray(products)
      ? products.filter((product) => {
          const id = String(product?.id || "");
          return !product?.isDemo && !id.startsWith("demo-prod-") && !id.startsWith("addon-prod-");
        })
      : [];
    // Product data is admin-owned and must never be served from a browser seed.
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    return res.status(200).json({ ok: true, data: cleanProducts });
  } catch (err) {
    console.error("Products API error:", err);
    return res.status(500).json({ ok: false, error: "Unable to load products." });
  }
}
