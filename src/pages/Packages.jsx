import { useMemo, useState } from "react";
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
  const ALL_ENTRIES = useLiveEntries();
  const [sortKey, setSortKey] = useState("popular");
  const [occasionFilter, setOccasionFilter] = useState("all");
  const [themeFilter, setThemeFilter] = useState("all");
  const [priceFilter, setPriceFilter] = useState("all");
  const [cityOnly, setCityOnly] = useState(false);
  const [topRatedOnly, setTopRatedOnly] = useState(false);
  useReveal([sortKey, occasionFilter, themeFilter, priceFilter, cityOnly, topRatedOnly]);

  const occasionOptions = useMemo(
    () => [{ key: "all", label: "All Occasions" }, ...listOccasions().map((o) => ({ key: o.slug, label: o.label }))],
    [ALL_ENTRIES],
  );

  const themeOptions = useMemo(() => {
    const pool = occasionFilter === "all" ? ALL_ENTRIES : ALL_ENTRIES.filter((e) => e.occasion.slug === occasionFilter);
    const seen = new Map();
    pool.forEach((e) => { if (e.theme) seen.set(e.theme.slug, e.theme.label); });
    return [{ key: "all", label: "All Themes" }, ...Array.from(seen, ([key, label]) => ({ key, label }))];
  }, [occasionFilter, ALL_ENTRIES]);

  const filteredEntries = useMemo(() => {
    let list = ALL_ENTRIES;
    if (occasionFilter !== "all") list = list.filter((e) => e.occasion.slug === occasionFilter);
    if (themeFilter !== "all") list = list.filter((e) => e.theme && e.theme.slug === themeFilter);
    if (priceFilter !== "all") {
      const bucket = PRICE_BUCKETS.find((b) => b.key === priceFilter);
      if (bucket) list = list.filter((e) => e.product.price >= bucket.min && e.product.price < bucket.max);
    }
    if (cityOnly) list = list.filter((e) => isAvailableInCity(e.product, city));
    if (topRatedOnly) list = list.filter((e) => (e.product.rating || 0) >= 4.7);
    return list;
  }, [ALL_ENTRIES, occasionFilter, themeFilter, priceFilter, cityOnly, topRatedOnly, city]);

  const sortedEntries = useMemo(() => {
    const order = sortProducts(filteredEntries.map((e) => e.product), sortKey);
    return order.map((p) => filteredEntries.find((e) => e.product.slug === p.slug));
  }, [filteredEntries, sortKey]);

  function resetFilters() {
    setOccasionFilter("all");
    setThemeFilter("all");
    setPriceFilter("all");
    setCityOnly(false);
    setTopRatedOnly(false);
  }

  const filterDescriptors = [
    { key: "occasion", label: "Occasion", kind: "select", value: occasionFilter, onChange: (v) => { setOccasionFilter(v); setThemeFilter("all"); }, options: occasionOptions },
    { key: "theme", label: "Theme", kind: "select", value: themeFilter, onChange: setThemeFilter, options: themeOptions },
    { key: "price", label: "Price", kind: "chips", value: priceFilter, onChange: setPriceFilter, options: PRICE_BUCKETS.map((b) => ({ key: b.key, label: b.label })) },
    { key: "city", label: "Available in " + city, kind: "toggle", value: cityOnly, onChange: setCityOnly },
    { key: "rating", label: "Top Rated (4.7★+)", kind: "toggle", value: topRatedOnly, onChange: setTopRatedOnly },
  ];

  const popularRail = useMemo(
    () => sortProducts(ALL_ENTRIES.map((e) => e.product), "popular").slice(0, 8)
      .map((p) => { const e = ALL_ENTRIES.find((e) => e.product.slug === p.slug); return e ? toRailItem(p, e.trail) : null; })
      .filter(Boolean),
    [ALL_ENTRIES],
  );
  const newestRail = useMemo(
    () => sortProducts(ALL_ENTRIES.map((e) => e.product), "newest").slice(0, 8)
      .map((p) => { const e = ALL_ENTRIES.find((e) => e.product.slug === p.slug); return e ? toRailItem(p, e.trail) : null; })
      .filter(Boolean),
    [ALL_ENTRIES],
  );
  const cityRail = useMemo(() => {
    const inCity = ALL_ENTRIES.filter((e) => isAvailableInCity(e.product, city));
    return sortProducts(inCity.map((e) => e.product), "popular").slice(0, 8)
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
        <div className="hero-media"><img src={IMAGES.heroPackages} alt="All packages — Next Level Events"  onError={onImgError}/></div>
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
          <p>{ALL_ENTRIES.length} packages across {occasionOptions.length - 1} occasions — narrow it down below.</p>
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
