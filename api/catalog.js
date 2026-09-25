import { readStates, readStateUpdatedAt } from "../shared/stateStore.js";

// Keep the public bootstrap response intentionally small. Products are the
// largest state bucket (~2.7 MB in production) and must not be downloaded on
// every page load. The browser fetches them separately only when its cached
// product version is missing or stale.
const PUBLIC_KEYS = [
  "nle_catalog_v2_occasions",
  "nle_catalog_v2_gallery", "nle_catalog_v2_insta_videos", "nle_catalog_v2_video_reviews",
  "nle_catalog_v2_cities", "nle_catalog_v2_addons", "nle_catalog_v2_birthday_age_categories",
];

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ ok: false, error: "Method not allowed" });
  try {
    const [state, productsUpdatedAt] = await Promise.all([
      readStates(process.env, PUBLIC_KEYS),
      readStateUpdatedAt(process.env, "nle_catalog_v2_products"),
    ]);

    // This endpoint is small enough to cache briefly. It only carries catalog
    // metadata/lightweight state; the product payload has its own endpoint.
    res.setHeader("Cache-Control", "public, max-age=15, stale-while-revalidate=60");
    return res.status(200).json({
      ok: true,
      state,
      versions: { products: productsUpdatedAt },
    });
  } catch (err) {
    console.error("Catalog API error:", err);
    return res.status(500).json({ ok: false, error: "Unable to load catalog." });
  }
}
