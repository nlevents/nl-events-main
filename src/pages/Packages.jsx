import { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { IMAGES } from "../data/images";
import { useCity } from "../context/CityContext";
import usePageMeta from "../hooks/usePageMeta";
import useReveal from "../hooks/useReveal";
import Breadcrumb from "../components/occasion/Breadcrumb";
import ListingControls from "../components/occasion/ListingControls";
import ProductCard from "../components/occasion/ProductCard";
import OccasionCard from "../components/occasion/OccasionCard";
import ProductRail from "../components/ProductRail";
import {
  listOccasions, listAllProducts, sortProducts, isAvailableInCity,
  PRICE_BUCKETS, pathFor, toRailItem, flattenCategoryTree,
} from "../data/occasions";
import { useLiveEntries } from "../hooks/useLiveCatalog";
import { onImgError } from "../lib/imageFallback";
import { getCatalogEntriesForKind } from "../lib/catalogStore";
import { catalogEntryPath, getCatalogFacetOptions, pathStartsWith } from "../lib/catalogFacets";


export default function Packages() {
  usePageMeta(
    "All Packages — Next Level Events, Ranchi",
    "Browse every wedding, birthday, anniversary, baby shower and event package by Next Level Events, filterable by occasion, theme, city and price.",
  );
  const { city } = useCity();
  const liveEntries = useLiveEntries();
  const ALL_ENTRIES = useMemo(() => getCatalogEntriesForKind("packages", liveEntries).filter((entry) => {
    // Event Services is a dedicated service catalog, not a public package occasion.
    const occasionSlug = String(entry?.occasion?.slug || entry?.trail?.[0]?.slug || "");
    return occasionSlug !== "event-services" && !entry?.occasion?.addonOnly && !entry?.trail?.[0]?.addonOnly;
  }), [liveEntries]);
  const [sortKey, setSortKey] = useState("popular");
  const [occasionFilter, setOccasionFilter] = useState("all");
  const [themeFilter, setThemeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [subcategoryFilter, setSubcategoryFilter] = useState("all");
  const [priceFilter, setPriceFilter] = useState("all");
  const [cityOnly, setCityOnly] = useState(false);
  const [topRatedOnly, setTopRatedOnly] = useState(false);
  const uniquePackageCount = useMemo(() => new Set(ALL_ENTRIES.map((entry) => entry?.product?.id || entry?.product?.slug)).size, [ALL_ENTRIES]);
  useReveal([sortKey, occasionFilter, categoryFilter, subcategoryFilter, themeFilter, priceFilter, cityOnly, topRatedOnly]);

  const taxonomyNodes = useMemo(() => flattenCategoryTree(), [ALL_ENTRIES]);
  const facetOptions = useMemo(() => getCatalogFacetOptions({
    occasionFilter,
    categoryFilter,
    subcategoryFilter,
    taxonomyNodes,
  }), [taxonomyNodes, occasionFilter, categoryFilter, subcategoryFilter]);
  const occasionOptions = facetOptions.occasionOptions;

  const filteredForFacets = useMemo(() => ALL_ENTRIES.filter((entry) => {
    const path = catalogEntryPath(entry);
    if (occasionFilter !== "all" && path[0] !== occasionFilter) return false;
    if (categoryFilter !== "all" && !pathStartsWith(path, categoryFilter)) return false;
    if (subcategoryFilter !== "all" && !pathStartsWith(path, subcategoryFilter)) return false;
    if (themeFilter !== "all" && !pathStartsWith(path, themeFilter)) return false;
    return true;
  }), [ALL_ENTRIES, occasionFilter, categoryFilter, subcategoryFilter, themeFilter]);

  useEffect(() => {
    if (categoryFilter !== "all" && !facetOptions.categoryOptions.some((o) => o.key === categoryFilter)) setCategoryFilter("all");
    if (subcategoryFilter !== "all" && !facetOptions.subcategoryOptions.some((o) => o.key === subcategoryFilter)) setSubcategoryFilter("all");
    if (themeFilter !== "all" && !facetOptions.themeOptions.some((o) => o.key === themeFilter)) setThemeFilter("all");
  }, [facetOptions, categoryFilter, subcategoryFilter, themeFilter]);

  const filteredEntries = useMemo(() => {
    let list = filteredForFacets;
    if (priceFilter !== "all") {
      const bucket = PRICE_BUCKETS.find((b) => b.key === priceFilter);
      if (bucket) list = list.filter((e) => e.product.price >= bucket.min && e.product.price < bucket.max);
    }
    if (cityOnly) list = list.filter((e) => isAvailableInCity(e.product, city));
    if (topRatedOnly) list = list.filter((e) => (e.product.rating || 0) >= 4.7);
    return list;
  }, [filteredForFacets, priceFilter, cityOnly, topRatedOnly, city]);

  const sortedEntries = useMemo(() => {
    const unique = [];
    const seen = new Set();
    filteredEntries.forEach((entry) => {
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
    const order = sortProducts(unique.map((e) => e.product), sortKey);
    return order.map((product) => entryByIdentity.get(String(product.id || product.slug)) || entryByIdentity.get(String(product.slug))).filter(Boolean);
  }, [filteredEntries, sortKey]);

  function resetFilters() {
    setOccasionFilter("all");
    setThemeFilter("all");
    setCategoryFilter("all");
    setSubcategoryFilter("all");
    setPriceFilter("all");
    setCityOnly(false);
    setTopRatedOnly(false);
  }

  const filterDescriptors = [
    { key: "occasion", label: "Occasion", kind: "select", value: occasionFilter, onChange: (v) => { setOccasionFilter(v); setCategoryFilter("all"); setSubcategoryFilter("all"); setThemeFilter("all"); }, options: [{ key: "all", label: "All Occasions" }, ...occasionOptions] },
    { key: "category", label: "Category", kind: "select", value: categoryFilter, onChange: (v) => { setCategoryFilter(v); setSubcategoryFilter("all"); setThemeFilter("all"); }, options: [{ key: "all", label: "All Categories" }, ...facetOptions.categoryOptions] },
    { key: "subcategory", label: "Subcategory", kind: "select", value: subcategoryFilter, onChange: (v) => { setSubcategoryFilter(v); setThemeFilter("all"); }, options: [{ key: "all", label: "All Subcategories" }, ...facetOptions.subcategoryOptions] },
    { key: "theme", label: "Theme", kind: "select", value: themeFilter, onChange: setThemeFilter, options: [{ key: "all", label: "All Themes" }, ...facetOptions.themeOptions] },
    { key: "price", label: "Price", kind: "select", value: priceFilter, onChange: setPriceFilter, options: PRICE_BUCKETS.map((b) => ({ key: b.key, label: b.label })) },
    { key: "city", label: "Available in " + city, kind: "toggle", value: cityOnly, onChange: setCityOnly },
    { key: "rating", label: "Top Rated (4.7★+)", kind: "toggle", value: topRatedOnly, onChange: setTopRatedOnly },
  ];

  const newestRail = useMemo(
    () => {
      const entryByIdentity = new Map();
      const productsByIdentity = new Map();
      ALL_ENTRIES.forEach((entry) => {
        const key = String(entry.product.id || entry.product.slug);
        if (!productsByIdentity.has(key)) productsByIdentity.set(key, entry.product);
        if (!entryByIdentity.has(key)) entryByIdentity.set(key, entry);
        if (entry.product.slug && !entryByIdentity.has(String(entry.product.slug))) entryByIdentity.set(String(entry.product.slug), entry);
      });
      return sortProducts(Array.from(productsByIdentity.values()), "newest").slice(0, 8)
        .map((product) => {
          const entry = entryByIdentity.get(String(product.id || product.slug)) || entryByIdentity.get(String(product.slug));
          return entry ? toRailItem(product, entry.trail) : null;
        }).filter(Boolean);
    },
    [ALL_ENTRIES],
  );
  const cityRail = useMemo(() => {
    const inCity = ALL_ENTRIES.filter((entry) => isAvailableInCity(entry.product, city));
    const unique = Array.from(new Map(inCity.map((entry) => [String(entry.product.id || entry.product.slug), entry])).values());
    const entryByIdentity = new Map();
    unique.forEach((entry) => {
      entryByIdentity.set(String(entry.product.id || entry.product.slug), entry);
      if (entry.product.slug) entryByIdentity.set(String(entry.product.slug), entry);
    });
    return sortProducts(unique.map((entry) => entry.product), "popular").slice(0, 8)
      .map((product) => {
        const entry = entryByIdentity.get(String(product.id || product.slug)) || entryByIdentity.get(String(product.slug));
        return entry ? toRailItem(product, entry.trail) : null;
      }).filter(Boolean);
  }, [ALL_ENTRIES, city]);
  const recommendedRail = useMemo(() => {
    const entryByIdentity = new Map();
    const uniqueProducts = new Map();
    ALL_ENTRIES.forEach((entry) => {
      const key = String(entry.product.id || entry.product.slug);
      if (!uniqueProducts.has(key)) uniqueProducts.set(key, entry.product);
      if (!entryByIdentity.has(key)) entryByIdentity.set(key, entry);
      if (entry.product.slug && !entryByIdentity.has(String(entry.product.slug))) entryByIdentity.set(String(entry.product.slug), entry);
    });
    const byOccasion = new Map();
    sortProducts(Array.from(uniqueProducts.values()), "popular").forEach((product) => {
      const entry = entryByIdentity.get(String(product.id || product.slug)) || entryByIdentity.get(String(product.slug));
      if (!entry) return;
      const key = String(entry.occasion?.slug || entry.trail?.[0]?.slug || "");
      if (key && !byOccasion.has(key)) byOccasion.set(key, entry);
    });
    return Array.from(byOccasion.values()).map((entry) => toRailItem(entry.product, entry.trail));
  }, [ALL_ENTRIES]);

  return (
    <>
      <section className="hero hero-sm occ-hero">
        <div className="hero-media"><img src={IMAGES.heroPackages} alt="All packages — Next Level Events"  loading="eager" fetchPriority="high" decoding="async" onError={onImgError}/></div>
        <div className="hero-content">
          <span className="eyebrow">Packages</span>
          <h1>All Packages</h1>
          <p>Every wedding, birthday, anniversary and celebration package we offer — filter by occasion, theme, city and budget, all fully customisable.</p>
          {city !== "Ranchi" && (
            <p style={{ opacity: .85, fontSize: 13, marginTop: 6 }}>Prices shown for {city}, including a small logistics adjustment over our Ranchi base rate.</p>
          )}
        </div>
      </section>

      <section className="section-tight container">
        <Breadcrumb items={[{ label: "Packages" }]} />
      </section>

      <section className="section-tight container">
        <div className="section-head reveal">
          <h2>Browse All Packages</h2>
          <p>{uniquePackageCount} packages across {occasionOptions.length - 1} occasions — narrow it down below.</p>
        </div>

        <ListingControls
          resultCount={sortedEntries.length}
          sortKey={sortKey}
          onSortChange={setSortKey}
          filters={filterDescriptors}
          onReset={resetFilters}
        />

        <div className="occ-prod-grid reveal">
          {sortedEntries.map((e) => (
            <ProductCard key={e.product.slug} product={e.product} href={pathFor(e.trail)} />
          ))}
        </div>
        {sortedEntries.length === 0 && (
          <p className="occ-empty reveal">No packages match these filters yet — try resetting them.</p>
        )}
      </section>

      <ProductRail title="Trending Packages" items={newestRail} tone="surface" />
      <ProductRail title={"Popular in " + city} items={cityRail} />
      <ProductRail title="Recommended For You" items={recommendedRail} tone="surface" />

      <section className="section-tight container" style={{ borderTop: "1px solid var(--border-soft)" }}>
        <div className="section-head reveal">
          <h2>Explore by Occasion</h2>
          <p>Prefer to browse by celebration instead? Start with an occasion.</p>
        </div>
        <div className="occ-tile-grid reveal">
          {listOccasions().map((o) => <OccasionCard key={o.slug} occasion={o} />)}
        </div>
      </section>

      <section className="cta-band reveal">
        <div className="container">
          <h2>Want something not listed here?</h2>
          <Link to="/custom-events" className="btn btn-primary">Explore Custom Events</Link>
        </div>
      </section>
    </>
  );
}
