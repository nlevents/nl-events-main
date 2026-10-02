import { requireAdmin } from "../../shared/auth/supabaseAuth.js";
import { readStates, readStateVersions, writeState } from "../../shared/stateStore.js";

const KEYS = [
  "nle_catalog_v2_products", "nle_catalog_v2_occasions", "nle_catalog_v2_media", "nle_catalog_v2_gallery",
  "nle_catalog_v2_insta_videos", "nle_catalog_v2_video_reviews", "nle_catalog_v2_cities", "nle_catalog_v2_addons",
  "nle_catalog_v2_coupons", "nle_catalog_v2_inquiries", "nle_catalog_v2_blackouts",
  "nle-admin-clients", "nle-admin-invoices", "nle-admin-settings",
  "nle_catalog_v2_birthday_age_categories",
];

function bearerToken(req) {
  return String(req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();
}

async function auth(req, res) {
  const result = await requireAdmin(process.env, req.headers.authorization);
  if (!result.user) { res.status(401).json({ ok: false, error: result.error }); return null; }
  return result.user;
}

function validateProductsPayload(data) {
  if (!Array.isArray(data)) throw new Error("Products catalog must be an array.");
  const products = data.filter((product) => {
    const id = String(product?.id || "");
    return !product?.isDemo && !id.startsWith("demo-prod-");
  });
  const ids = new Set(products.map((product) => String(product?.id || "")).filter(Boolean));
  const byId = new Map(products.map((product) => [String(product?.id || ""), product]));
  for (const product of products) {
    if (product?.catalogKind !== "package") continue;
    if (!Array.isArray(product.packageItems) || product.packageItems.length === 0) {
      throw new Error(`Package "${product.name || product.id || "Untitled"}" must contain at least one product.`);
    }
    for (const item of product.packageItems) {
      const productId = String(item?.productId || item?.id || "");
      if (!ids.has(productId)) throw new Error(`Package "${product.name || product.id || "Untitled"}" contains a product that no longer exists.`);
      if (byId.get(productId)?.catalogKind === "package") throw new Error(`Package "${product.name || product.id || "Untitled"}" cannot contain another package.`);
    }
  }
  return products;
}

export default async function handler(req, res) {
  const user = await auth(req, res);
  if (!user) return;
  try {
    if (req.method === "GET") {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      const token = bearerToken(req);
      const state = await readStates(process.env, KEYS, token);
      const versions = await readStateVersions(process.env, KEYS, token);
      const products = Array.isArray(state.nle_catalog_v2_products) ? state.nle_catalog_v2_products : [];
      const cleanProducts = products.filter((product) => {
        const id = String(product?.id || "");
        return !product?.isDemo && !id.startsWith("demo-prod-");
      });
      if (JSON.stringify(products) !== JSON.stringify(cleanProducts)) {
        state.nle_catalog_v2_products = cleanProducts;
        await writeState(process.env, "nle_catalog_v2_products", cleanProducts, user.id, null, token);
      }
      return res.status(200).json({ ok: true, state, versions });
    }
    if (req.method === "PUT") {
      const { key, data, expectedUpdatedAt } = req.body || {};
      if (!KEYS.includes(key)) return res.status(400).json({ ok: false, error: "Unknown state key." });
      if (data === undefined) return res.status(400).json({ ok: false, error: "Missing data." });
      const safeData = key === "nle_catalog_v2_products" ? validateProductsPayload(data) : data;
      const result = await writeState(process.env, key, safeData, user.id, expectedUpdatedAt || null, bearerToken(req));
      return res.status(200).json({ ok: true, key, updatedAt: result.updatedAt || null });
    }
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (err) {
    console.error("Admin state API error:", err);
    const message = String(err?.message || "");
    if (message.includes("catalog was changed by another admin")) {
      return res.status(409).json({ ok: false, error: message });
    }
    if (message.includes("must contain at least one product") || message.includes("contains a product that no longer exists") || message.includes("catalog must be an array")) {
      return res.status(400).json({ ok: false, error: message });
    }
    if (message.includes("Supabase is not configured on the server")) {
      return res.status(503).json({ ok: false, error: "Admin cloud storage is not configured. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to the Netlify environment variables, then redeploy." });
    }
    return res.status(500).json({ ok: false, error: message || "Unable to save admin data." });
  }
}
