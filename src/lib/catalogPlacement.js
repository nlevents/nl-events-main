// Reusable display assignments. One catalog record can be shown in multiple
// storefront catalogs without duplicating the underlying product/service.

export const DISPLAY_CATALOGS = Object.freeze({
  PRODUCTS: "products",
  SERVICES: "services",
  PACKAGES: "packages",
});

export function normalizePlacementPath(value) {
  const parts = Array.isArray(value) ? value : String(value ?? "").split("/");
  return parts.map((part) => String(part ?? "").toLowerCase().trim().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "")).filter(Boolean);
}

export function normalizeDisplayPlacements(list) {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  const out = [];
  for (const item of list) {
    if (!item || !item.catalog) continue;
    const catalog = String(item.catalog).toLowerCase().trim();
    if (!Object.values(DISPLAY_CATALOGS).includes(catalog)) continue;
    const path = normalizePlacementPath(item.path);
    const key = `${catalog}:${path.join("/")}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ catalog, path });
  }
  return out;
}

export function pathsRelated(a, b) {
  const left = normalizePlacementPath(a);
  const right = normalizePlacementPath(b);
  if (!left.length || !right.length) return true;
  const shorter = left.length <= right.length ? left : right;
  const longer = left.length <= right.length ? right : left;
  return shorter.every((part, index) => part === longer[index]);
}

export function hasDisplayPlacement(product, catalog, contextPath = []) {
  const placements = normalizeDisplayPlacements(product?.displayPlacements);
  if (!placements.length) return false;
  return placements.some((placement) => placement.catalog === catalog && pathsRelated(placement.path, contextPath));
}
