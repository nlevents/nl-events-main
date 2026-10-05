import { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import usePageMeta from "../hooks/usePageMeta";
import useReveal from "../hooks/useReveal";
import Icon from "../components/Icon";
import FlipBanner from "../components/FlipBanner";
import ProductCard from "../components/occasion/ProductCard";
import ListingControls from "../components/occasion/ListingControls";
import Breadcrumb from "../components/occasion/Breadcrumb";
import { IMAGES } from "../data/images";
import {
  listOccasions,
  listAllProducts,
  pathFor,
  sortProducts,
  SORT_OPTIONS,
  PRICE_BUCKETS,
  discountPercent,
} from "../data/occasions";
import { useLiveEntries } from "../hooks/useLiveCatalog";
import { onImgError } from "../lib/imageFallback";

const BANNER_SLIDES = [
  { eyebrow: "Wedding Season", title: "Dream Weddings, Sorted", sub: "Décor, catering & staging — from ₹99,999", img: IMAGES.pkgDreamWedding, href: "/weddings", bg: "linear-gradient(135deg,#fff4e0,#ffe4c4)" },
  { eyebrow: "Trending", title: "Birthday Bash Packages", sub: "Themed backdrops & balloon styling", img: IMAGES.pkgBirthdayBash, href: "/birthdays", bg: "linear-gradient(135deg,#e6f7f2,#c9ede0)" },
  { eyebrow: "Premium", title: "Royal Wedding Experience", sub: "Multi-day staging, celebrity-grade décor", img: IMAGES.pkgRoyalWedding, href: "/package-details?id=royal-wedding", bg: "linear-gradient(135deg,#f1e9ff,#e0d1fb)" },
  { eyebrow: "Corporate", title: "Corporate Excellence", sub: "Stage design, AV & guest management", img: IMAGES.pkgCorporateExcellence, href: "/corporate", bg: "linear-gradient(135deg,#e7f0ff,#cfe2ff)" },
];

// "On everybody's list" — a small curated strip in the Flipkart homepage
// style: square image, a coloured pill overlay, then a two-line caption.
function SpotlightCard({ product, href }) {
  const off = discountPercent(product);
  return (
    <Link to={href} className="fk-spot-card reveal">
      <span className="fk-spot-pic">
        <img src={product.image} alt={product.name} loading="lazy"  onError={onImgError}/>
        <span className="fk-spot-pill">{off > 0 ? `${off}% OFF` : `${(product.rating || 4.5).toFixed(1)} ★ RATED`}</span>
      </span>
      <span className="fk-spot-cap">
        <em>{product.popularity >= 90 ? "Most Loved" : product.dateAdded && Date.parse(product.dateAdded) > Date.now() - 7776000000 ? "New In" : "Best Deals"}</em>
        <b>{product.name}</b>
      </span>
    </Link>
  );
}

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

  const [occasions, setOccasions] = useState(listOccasions);
  const entries = useLiveEntries();

  useEffect(() => {
    const onUpdate = () => setOccasions(listOccasions());
    window.addEventListener("nle-catalog-updated", onUpdate);
    return () => window.removeEventListener("nle-catalog-updated", onUpdate);
  }, []);

  const spotlight = useMemo(
    () => sortProducts(entries.map((e) => e.product), "popular").slice(0, 8),
    [entries]
  );
  const spotlightHref = (p) => {
    const entry = entries.find((e) => e.product.slug === p.slug || e.product.id === p.id);
    return entry ? pathFor(entry.trail) : "/shop-by-occasion";
  };

  const bucket = PRICE_BUCKETS.find((b) => b.key === priceKey) || PRICE_BUCKETS[0];

  // Products already carry their complete catalog trail. Build the filter
  // facets from that trail instead of maintaining a second hard-coded filter
  // list, so new admin-created categories/themes automatically appear here.
  const facetNodes = (entry) => (Array.isArray(entry?.trail) ? entry.trail.slice(0, -1) : []);
  const nodeSlug = (node) => String(node?.slug || "");
  const nodeLabel = (node) => node?.label || node?.name || nodeSlug(node);
  const nodesOfType = (entry, type) => facetNodes(entry).filter((node) => node?.type === type);
  const firstCategory = (entry) => nodesOfType(entry, "category")[0];
  const subcategoryNodes = (entry) => {
    const categories = nodesOfType(entry, "category");
    return categories.length > 1 ? categories.slice(1) : [];
  };

  const filteredForFacets = useMemo(() => {
    return entries.filter((entry) => {
      if (occFilter !== "all" && entry.occasion?.slug !== occFilter) return false;
      if (categoryFilter !== "all" && nodeSlug(firstCategory(entry)) !== categoryFilter) return false;
      if (subcategoryFilter !== "all" && !subcategoryNodes(entry).some((node) => nodeSlug(node) === subcategoryFilter)) return false;
      if (themeFilter !== "all" && !nodesOfType(entry, "theme").some((node) => nodeSlug(node) === themeFilter)) return false;
      return true;
    });
  }, [entries, occFilter, categoryFilter, subcategoryFilter, themeFilter]);

  const facetOptions = useMemo(() => {
    const unique = (items) => {
      const map = new Map();
      items.forEach((item) => {
        const key = nodeSlug(item);
        if (key && !map.has(key)) map.set(key, { key, label: nodeLabel(item) });
      });
      return [...map.values()].sort((a, b) => a.label.localeCompare(b.label));
    };

    // Each facet is built from its parent facets only, not from itself. This
    // keeps the dropdown useful when a value is already selected and lets the
    // user switch directly from one category/theme to another.
    const occasionScoped = entries.filter((entry) => occFilter === "all" || entry.occasion?.slug === occFilter);
    const categoryScoped = occasionScoped.filter((entry) => categoryFilter === "all" || nodeSlug(firstCategory(entry)) === categoryFilter);
    const subcategoryScoped = categoryScoped.filter((entry) => subcategoryFilter === "all" || subcategoryNodes(entry).some((node) => nodeSlug(node) === subcategoryFilter));

    const occasionOptions = unique(entries.map((entry) => entry.occasion).filter(Boolean));
    const categoryOptions = unique(occasionScoped.map(firstCategory).filter(Boolean));
    const subcategoryOptions = unique(categoryScoped.flatMap(subcategoryNodes));
    const themeOptions = unique(subcategoryScoped.flatMap((entry) => nodesOfType(entry, "theme")));
    return { occasionOptions, categoryOptions, subcategoryOptions, themeOptions };
  }, [entries, occFilter, categoryFilter, subcategoryFilter]);

  // If a parent facet changes, clear child selections that no longer exist.
  useEffect(() => {
    if (categoryFilter !== "all" && !facetOptions.categoryOptions.some((o) => o.key === categoryFilter)) setCategoryFilter("all");
    if (subcategoryFilter !== "all" && !facetOptions.subcategoryOptions.some((o) => o.key === subcategoryFilter)) setSubcategoryFilter("all");
    if (themeFilter !== "all" && !facetOptions.themeOptions.some((o) => o.key === themeFilter)) setThemeFilter("all");
  }, [facetOptions, categoryFilter, subcategoryFilter, themeFilter]);

  const filtered = useMemo(() => {
    const list = filteredForFacets.filter((entry) => entry.product.price >= bucket.min && entry.product.price <= bucket.max);
    const sorted = sortProducts(list.map((e) => e.product), sortKey);
    return sorted.map((p) => {
      const entry = list.find((e) => e.product.slug === p.slug || e.product.id === p.id);
      return { product: p, href: entry ? pathFor(entry.trail) : "/shop-by-occasion" };
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

        <FlipBanner slides={BANNER_SLIDES} />

        <div className="fk-cat-row" role="navigation" aria-label="Shop by category">
          {occasions.map((o) => (
            <Link key={o.slug} to={"/occasion/" + o.slug} className="fk-cat-item">
              <span className="fk-cat-icon"><img src={o.image} alt={o.label} loading="lazy"  onError={onImgError}/></span>
              <span>{o.label}</span>
            </Link>
          ))}
        </div>

        <div className="fk-section-head">
          <h2>On everybody&apos;s list</h2>
        </div>
        <div className="fk-spot-grid">
          {spotlight.map((p) => (
            <SpotlightCard key={p.id || p.slug} product={p} href={spotlightHref(p)} />
          ))}
        </div>

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
