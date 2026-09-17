import { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import usePageMeta from "../hooks/usePageMeta";
import useReveal from "../hooks/useReveal";
import Icon from "../components/Icon";
import FlipBanner from "../components/FlipBanner";
import ProductCard from "../components/occasion/ProductCard";
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

  const filtered = useMemo(() => {
    let list = entries;
    if (occFilter !== "all") list = list.filter((e) => e.occasion.slug === occFilter);
    list = list.filter((e) => e.product.price >= bucket.min && e.product.price <= bucket.max);
    const sorted = sortProducts(list.map((e) => e.product), sortKey);
    return sorted.map((p) => {
      const entry = list.find((e) => e.product.slug === p.slug || e.product.id === p.id);
      return { product: p, href: entry ? pathFor(entry.trail) : "/shop-by-occasion" };
    });
  }, [entries, occFilter, bucket, sortKey]);

  useReveal([occFilter, priceKey, sortKey]);

  return (
    <>
      <section className="section-tight container fk-products-page">
        <Breadcrumb items={[{ label: "Products" }]} />

        <FlipBanner slides={BANNER_SLIDES} />

        <div className="fk-cat-row" role="navigation" aria-label="Shop by category">
          {occasions.map((o) => (
            <Link key={o.slug} to={"/occasion/" + o.slug} className="fk-cat-item">
              <span className="fk-cat-icon"><img src={o.image} alt="" loading="lazy"  onError={onImgError}/></span>
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

        <div className="fk-section-head fk-section-head--filters">
          <h2>All Products</h2>
          <div className="fk-filters">
            <select aria-label="Filter by occasion" value={occFilter} onChange={(e) => setOccFilter(e.target.value)}>
              <option value="all">All Occasions</option>
              {occasions.map((o) => (
                <option key={o.slug} value={o.slug}>{o.label}</option>
              ))}
            </select>
            <select aria-label="Filter by price" value={priceKey} onChange={(e) => setPriceKey(e.target.value)}>
              {PRICE_BUCKETS.map((b) => (
                <option key={b.key} value={b.key}>{b.label}</option>
              ))}
            </select>
            <select aria-label="Sort products" value={sortKey} onChange={(e) => setSortKey(e.target.value)}>
              {SORT_OPTIONS.map((s) => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="fk-empty">No products match these filters yet — try a different occasion or price range.</p>
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
