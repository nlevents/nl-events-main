import { useEffect, useMemo, useState } from "react";
import usePageMeta from "../hooks/usePageMeta";
import useReveal from "../hooks/useReveal";
import ProductCard from "../components/occasion/ProductCard";
import ListingControls from "../components/occasion/ListingControls";
import Breadcrumb from "../components/occasion/Breadcrumb";
import {
  pathFor,
  sortProducts,
  PRICE_BUCKETS,
  flattenCategoryTree,
} from "../data/occasions";
import { useLiveEntries } from "../hooks/useLiveCatalog";
import { onImgError } from "../lib/imageFallback";
import { getCatalogEntriesForKind } from "../lib/catalogStore";
import { catalogEntryPath, getCatalogFacetOptions, pathStartsWith } from "../lib/catalogFacets";

export default function Products() {
  usePageMeta(
    "Products — Next Level Events",
    "Browse every décor package and event product in one place — filter by occasion, sort by price or popularity, and book instantly.",
  );

  const [occFilter, setOccFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [subcategoryFilter, setSubcategoryFilter] = useState("all");
  const [themeFilter, setThemeFilter] = useState("all");
  const [priceKey, setPriceKey] = useState("all");
  const [sortKey, setSortKey] = useState("popular");

  const liveEntries = useLiveEntries();
  const entries = useMemo(() => getCatalogEntriesForKind("products", liveEntries).filter((entry) => {
    // Event Services is a dedicated service catalog, not a public product occasion.
    const occasionSlug = String(entry?.occasion?.slug || entry?.trail?.[0]?.slug || "");
    return occasionSlug !== "event-services" && !entry?.occasion?.addonOnly && !entry?.trail?.[0]?.addonOnly;
  }), [liveEntries]);

  const bucket = PRICE_BUCKETS.find((b) => b.key === priceKey) || PRICE_BUCKETS[0];

  const filteredForFacets = useMemo(() => {
    return entries.filter((entry) => {
      const path = catalogEntryPath(entry);
      if (occFilter !== "all" && path[0] !== occFilter) return false;
      if (categoryFilter !== "all" && !pathStartsWith(path, categoryFilter)) return false;
      if (subcategoryFilter !== "all" && !pathStartsWith(path, subcategoryFilter)) return false;
      if (themeFilter !== "all" && !pathStartsWith(path, themeFilter)) return false;
      return true;
    });
  }, [entries, occFilter, categoryFilter, subcategoryFilter, themeFilter]);

  // Cache the live taxonomy once per catalog refresh. Facets include valid
  // categories/themes with no products, which then use the existing empty state.
  const taxonomyNodes = useMemo(() => flattenCategoryTree(), [entries]);
  const facetOptions = useMemo(() => getCatalogFacetOptions({
    occasionFilter: occFilter,
    categoryFilter,
    subcategoryFilter,
    taxonomyNodes,
  }), [taxonomyNodes, occFilter, categoryFilter, subcategoryFilter]);

  // If a parent facet changes, clear child selections that no longer exist.
  useEffect(() => {
    if (categoryFilter !== "all" && !facetOptions.categoryOptions.some((o) => o.key === categoryFilter)) setCategoryFilter("all");
    if (subcategoryFilter !== "all" && !facetOptions.subcategoryOptions.some((o) => o.key === subcategoryFilter)) setSubcategoryFilter("all");
    if (themeFilter !== "all" && !facetOptions.themeOptions.some((o) => o.key === themeFilter)) setThemeFilter("all");
  }, [facetOptions, categoryFilter, subcategoryFilter, themeFilter]);

  const filtered = useMemo(() => {
    const list = filteredForFacets.filter((entry) => entry.product.price >= bucket.min && entry.product.price <= bucket.max);
    const unique = [];
    const seen = new Set();
    list.forEach((entry) => {
      const key = String(entry?.product?.id || entry?.product?.slug || "");
      if (!key || seen.has(key)) return;
      seen.add(key);
      unique.push(entry);
    });
    const entryByIdentity = new Map();
    unique.forEach((entry) => {
      entryByIdentity.set(String(entry.product.id || entry.product.slug), entry);
      if (entry.product.slug) entryByIdentity.set(String(entry.product.slug), entry);
    });
    const sorted = sortProducts(unique.map((e) => e.product), sortKey);
    return sorted.map((product) => {
      const entry = entryByIdentity.get(String(product.id || product.slug)) || entryByIdentity.get(String(product.slug));
      return { product, href: entry ? pathFor(entry.trail) : "/shop-by-occasion" };
    });
  }, [filteredForFacets, bucket, sortKey]);

  const resetFilters = () => {
    setOccFilter("all");
    setCategoryFilter("all");
    setSubcategoryFilter("all");
    setThemeFilter("all");
    setPriceKey("all");
  };

  useReveal([occFilter, categoryFilter, subcategoryFilter, themeFilter, priceKey, sortKey]);

  return (
    <>
      <section className="section-tight container fk-products-page">
        <Breadcrumb items={[{ label: "Products" }]} />

        <ListingControls
          resultCount={filtered.length}
          sortKey={sortKey}
          onSortChange={setSortKey}
          filters={[
            { key: "occasion", label: "Occasion", kind: "select", value: occFilter, onChange: (v) => { setOccFilter(v); setCategoryFilter("all"); setSubcategoryFilter("all"); setThemeFilter("all"); }, options: [{ key: "all", label: "All Occasions" }, ...facetOptions.occasionOptions] },
            { key: "category", label: "Category", kind: "select", value: categoryFilter, onChange: (v) => { setCategoryFilter(v); setSubcategoryFilter("all"); setThemeFilter("all"); }, options: [{ key: "all", label: "All Categories" }, ...facetOptions.categoryOptions] },
            { key: "subcategory", label: "Subcategory", kind: "select", value: subcategoryFilter, onChange: (v) => { setSubcategoryFilter(v); setThemeFilter("all"); }, options: [{ key: "all", label: "All Subcategories" }, ...facetOptions.subcategoryOptions] },
            { key: "theme", label: "Theme", kind: "select", value: themeFilter, onChange: setThemeFilter, options: [{ key: "all", label: "All Themes" }, ...facetOptions.themeOptions] },
            { key: "price", label: "Price", kind: "select", value: priceKey, onChange: setPriceKey, options: PRICE_BUCKETS.map((b) => ({ key: b.key, label: b.label })) },
          ]}
          onReset={resetFilters}
        />

        {filtered.length === 0 ? (
          <p className="fk-empty">No products match these filters yet — try a different combination or reset the filters.</p>
        ) : (
          <div className="occ-prod-grid">
            {filtered.map(({ product, href }) => (
              <ProductCard key={product.id || product.slug} product={product} href={href} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
