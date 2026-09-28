import { useEffect, useMemo, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { resolvePath } from "../data/occasions";
import CategoryTemplate from "../components/occasion/CategoryTemplate";
import ProductTemplate from "../components/occasion/ProductTemplate";
import NotFound from "./NotFound";

// Single route (path="/occasion/*") for the entire Shop-by-Occasion tree.
// The splat param carries every segment after /occasion/ — e.g.
// "birthday/kids-birthday/animal-themes/horse-themed-birthday-party" — and
// resolvePath() walks the data tree to find the matching node at any depth.
// This is what lets new occasions/subcategories/themes/products appear
// automatically, with zero new routes or page files.
export default function OccasionBrowser() {
  const params = useParams();
  const slugs = (params["*"] || "").split("/").filter(Boolean);

  // Re-resolve the path whenever the admin catalog changes so deletions/additions
  // are reflected without a full page reload.
  const [catalogVersion, setCatalogVersion] = useState(0);
  useEffect(() => {
    const onUpdate = () => setCatalogVersion((v) => v + 1);
    window.addEventListener("nle-catalog-updated", onUpdate);
    return () => window.removeEventListener("nle-catalog-updated", onUpdate);
  }, []);

  // Resolve once per URL / catalog change so `node` and `trail` keep a stable
  // identity between renders (children memoise on them).
  const slugKey = slugs.join("/");

  // Older service cards used occasion-prefixed URLs such as
  // /occasion/wedding/services/decor. Service categories now belong to the
  // canonical Event Services catalog, so normalize the legacy URL before
  // resolving the page. This prevents a hard refresh from resolving a stale
  // wedding service node with no products and showing an apparently blank page.
  const isLegacyServiceUrl = slugs.length >= 3 && slugs[1] === "services";
  const canonicalServiceSlugs = isLegacyServiceUrl
    ? ["event-services", ...slugs.slice(2)]
    : slugs;
  const canonicalServicePath = isLegacyServiceUrl
    ? `/occasion/${canonicalServiceSlugs.join("/")}`
    : null;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const resolved = useMemo(() => resolvePath(canonicalServiceSlugs), [slugKey, catalogVersion]);

  if (isLegacyServiceUrl && resolved) {
    return <Navigate to={canonicalServicePath} replace />;
  }

  if (!resolved) return <NotFound />;

  const { node, trail } = resolved;
  return node.type === "product"
    ? <ProductTemplate node={node} trail={trail} />
    : <CategoryTemplate node={node} trail={trail} />;
}
