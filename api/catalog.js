import { readStates } from "../shared/stateStore.js";

const PUBLIC_KEYS = [
  "nle_catalog_v2_products", "nle_catalog_v2_occasions",
  "nle_catalog_v2_gallery", "nle_catalog_v2_insta_videos", "nle_catalog_v2_video_reviews",
  "nle_catalog_v2_cities", "nle_catalog_v2_addons", "nle_catalog_v2_birthday_age_categories",
];

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ ok: false, error: "Method not allowed" });
  try {
    const state = await readStates(process.env, PUBLIC_KEYS);
    res.setHeader("Cache-Control", "public, max-age=15, s-maxage=15, stale-while-revalidate=60");
    return res.status(200).json({ ok: true, state });
  } catch (err) {
    console.error("Catalog API error:", err);
    return res.status(500).json({ ok: false, error: "Unable to load catalog." });
  }
}
