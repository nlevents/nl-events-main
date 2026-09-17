import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
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
  const [, setCatalogVersion] = useState(0);
  useEffect(() => {
    const onUpdate = () => setCatalogVersion((v) => v + 1);
    window.addEventListener("nle-catalog-updated", onUpdate);
    return () => window.removeEventListener("nle-catalog-updated", onUpdate);
  }, []);

  const resolved = resolvePath(slugs);

  if (!resolved) return <NotFound />;

  const { node, trail } = resolved;
  if (node.type === "product") return <ProductTemplate node={node} trail={trail} />;
  return <CategoryTemplate node={node} trail={trail} />;
}
