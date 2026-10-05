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
  PRICE_BUCKETS, pathFor, toRailItem,
} from "../data/occasions";
import { useLiveEntries } from "../hooks/useLiveCatalog";
import { onImgError } from "../lib/imageFallback";


export default function Packages() {
  usePageMeta(
    "All Packages — Next Level Events, Ranchi",
    "Browse every wedding, birthday, anniversary, baby shower and event package by Next Level Events, filterable by occasion, theme, city and price.",
  );
  const { city } = useCity();
  const liveEntries = useLiveEntries();
  const ALL_ENTRIES = useMemo(() => {
    const base = liveEntries.filter((entry) => entry?.product?.catalogKind === "package");
    getDisplayPlacementEntries("packages").forEach((entry) => {
      if (entry?.product) base.push(entry);
    });
    return base;
  }, [liveEntries]);
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

  const occasionOptions = useMemo(
    () => [{ key: "all", label: "All Occasions" }, ...listOccasions().map((o) => ({ key: o.slug, label: o.label }))],
    [ALL_ENTRIES],
  );

  const facetNodes = (entry) => (Array.isArray(entry?.trail) ? entry.trail.slice(0, -1) : []);
  const nodeSlug = (node) => String(node?.slug || "");
  const nodeLabel = (node) => node?.label || node?.name || nodeSlug(node);
  const nodesOfType = (entry, type) => facetNodes(entry).filter((node) => node?.type === type);
  const firstCategory = (entry) => nodesOfType(entry, "category")[0];
  const subcategoryNodes = (entry) => {
    const categories = nodesOfType(entry, "category");
    return categories.length > 1 ? categories.slice(1) : [];
  };

  const filteredForFacets = useMemo(() => ALL_ENTRIES.filter((entry) => {
    if (occasionFilter !== "all" && entry.occasion?.slug !== occasionFilter) return false;
    if (categoryFilter !== "all" && nodeSlug(firstCategory(entry)) !== categoryFilter) return false;
    if (subcategoryFilter !== "all" && !subcategoryNodes(entry).some((node) => nodeSlug(node) === subcategoryFilter)) return false;
    if (themeFilter !== "all" && !nodesOfType(entry, "theme").some((node) => nodeSlug(node) === themeFilter)) return false;
    return true;
  }), [ALL_ENTRIES, occasionFilter, categoryFilter, subcategoryFilter, themeFilter]);

  const facetOptions = useMemo(() => {
    const unique = (items) => {
      const map = new Map();
      items.forEach((item) => {
        const key = nodeSlug(item);
        if (key && !map.has(key)) map.set(key, { key, label: nodeLabel(item) });
      });
      return [...map.values()].sort((a, b) => a.label.localeCompare(b.label));
    };
    const occasionScoped = ALL_ENTRIES.filter((entry) => occasionFilter === "all" || entry.occasion?.slug === occasionFilter);
    const categoryScoped = occasionScoped.filter((entry) => categoryFilter === "all" || nodeSlug(firstCategory(entry)) === categoryFilter);
    const subcategoryScoped = categoryScoped.filter((entry) => subcategoryFilter === "all" || subcategoryNodes(entry).some((node) => nodeSlug(node) === subcategoryFilter));
    return {
      occasionOptions: unique(ALL_ENTRIES.map((entry) => entry.occasion).filter(Boolean)),
      categoryOptions: unique(occasionScoped.map(firstCategory).filter(Boolean)),
      subcategoryOptions: unique(categoryScoped.flatMap(subcategoryNodes)),
      themeOptions: unique(subcategoryScoped.flatMap((entry) => nodesOfType(entry, "theme"))),
    };
  }, [ALL_ENTRIES, occasionFilter, categoryFilter, subcategoryFilter]);

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
    const order = sortProducts(unique.map((e) => e.product), sortKey);
    return order.map((p) => unique.find((e) => e.product.slug === p.slug || e.product.id === p.id));
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
    { key: "occasion", label: "Occasion", kind: "select", value: occasionFilter, onChange: (v) => { setOccasionFilter(v); setCategoryFilter("all"); setSubcategoryFilter("all"); setThemeFilter("all"); }, options: [{ key: "all", label: "All Occasions" }, ...facetOptions.occasionOptions] },
    { key: "category", label: "Category", kind: "select", value: categoryFilter, onChange: (v) => { setCategoryFilter(v); setSubcategoryFilter("all"); setThemeFilter("all"); }, options: [{ key: "all", label: "All Categories" }, ...facetOptions.categoryOptions] },
    { key: "subcategory", label: "Subcategory", kind: "select", value: subcategoryFilter, onChange: (v) => { setSubcategoryFilter(v); setThemeFilter("all"); }, options: [{ key: "all", label: "All Subcategories" }, ...facetOptions.subcategoryOptions] },
    { key: "theme", label: "Theme", kind: "select", value: themeFilter, onChange: setThemeFilter, options: [{ key: "all", label: "All Themes" }, ...facetOptions.themeOptions] },
    { key: "price", label: "Price", kind: "select", value: priceFilter, onChange: setPriceFilter, options: PRICE_BUCKETS.map((b) => ({ key: b.key, label: b.label })) },
    { key: "city", label: "Available in " + city, kind: "toggle", value: cityOnly, onChange: setCityOnly },
    { key: "rating", label: "Top Rated (4.7★+)", kind: "toggle", value: topRatedOnly, onChange: setTopRatedOnly },
  ];

  const popularRail = useMemo(
    () => sortProducts(Array.from(new Map(ALL_ENTRIES.map((e) => [e.product.id || e.product.slug, e.product])).values()), "popular").slice(0, 8)
      .map((p) => { const e = ALL_ENTRIES.find((e) => e.product.slug === p.slug); return e ? toRailItem(p, e.trail) : null; })
      .filter(Boolean),
    [ALL_ENTRIES],
  );
  const newestRail = useMemo(
    () => sortProducts(Array.from(new Map(ALL_ENTRIES.map((e) => [e.product.id || e.product.slug, e.product])).values()), "newest").slice(0, 8)
      .map((p) => { const e = ALL_ENTRIES.find((e) => e.product.slug === p.slug); return e ? toRailItem(p, e.trail) : null; })
      .filter(Boolean),
    [ALL_ENTRIES],
  );
  const cityRail = useMemo(() => {
    const inCity = ALL_ENTRIES.filter((e) => isAvailableInCity(e.product, city));
    const unique = Array.from(new Map(inCity.map((e) => [e.product.id || e.product.slug, e])).values());
    return sortProducts(unique.map((e) => e.product), "popular").slice(0, 8)
      .map((p) => { const e = inCity.find((e) => e.product.slug === p.slug); return e ? toRailItem(p, e.trail) : null; })
      .filter(Boolean);
  }, [ALL_ENTRIES, city]);
  const recommendedRail = useMemo(() => {
    const byOccasion = new Map();
    sortProducts(ALL_ENTRIES.map((e) => e.product), "popular").forEach((p) => {
      const entry = ALL_ENTRIES.find((e) => e.product.slug === p.slug);
      if (!entry) return;
      const key = entry.occasion.slug;
      if (!byOccasion.has(key)) byOccasion.set(key, entry);
    });
    return Array.from(byOccasion.values()).map((e) => toRailItem(e.product, e.trail));
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

      <ProductRail title="Popular Products" items={popularRail} />

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
