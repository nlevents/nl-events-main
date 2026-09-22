import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import usePageMeta from "../../hooks/usePageMeta";
import useReveal from "../../hooks/useReveal";
import Breadcrumb from "./Breadcrumb";
import CategoryCard from "./CategoryCard";
import ProductCard from "./ProductCard";
import OccasionQuickLinks from "./OccasionQuickLinks";
import EventAddons from "./EventAddons";
import HeroImageCarousel from "../HeroImageCarousel";
import ListingControls from "./ListingControls";
import ProductRail from "../ProductRail";
import { useCity } from "../../context/CityContext";
import {
  childrenOf, pathFor, countProducts,
  sortProducts, isAvailableInCity, PRICE_BUCKETS, toRailItem, collectProductEntries,
  quickLinksFor, heroGalleryFor,
} from "../../data/occasions";
import { getAddonsForOccasion } from "../../lib/catalogStore";

const SHOP_REVIEWS = {
  wedding: { quote: "The wedding setup looked exactly like the vision we shared. Every function felt beautifully coordinated.", name: "Priya & Karan" },
  birthday: { quote: "The birthday setup was colourful, organised and exactly what we wanted. The kids absolutely loved it!", name: "Ritika Sharma" },
  anniversary: { quote: "Everything was beautifully planned and the team made our anniversary feel truly special.", name: "A Happy Couple" },
  corporate: { quote: "Professional planning, clear coordination and a polished event from start to finish.", name: "Corporate Client" },
  festivals: { quote: "The festive setup transformed the venue and made the celebration feel genuinely special.", name: "Happy Client" },
  "kids-family": { quote: "The team handled all the details so our family could simply enjoy the celebration together.", name: "A Happy Family" },
};

function OccasionReview({ topSlug, label }) {
  const review = SHOP_REVIEWS[topSlug] || {
    quote: `The ${String(label || "celebration").toLowerCase()} setup was beautifully planned and delivered with great attention to detail.`,
    name: "Next Level Events Client",
  };
  return (
    <section className="occ-page-review" aria-label={`${label || "Occasion"} customer review`}>
      <div className="occ-page-review-card">
        <div className="occ-page-review-stars" aria-label="5 star review">★★★★★</div>
        <p>“{review.quote}”</p>
        <strong>{review.name}</strong>
        <span>Verified Next Level Events Client</span>
      </div>
    </section>
  );
}

// Renders ANY level of the tree that isn't a leaf product: the top-level
// occasion page, a subcategory page, or a theme page. Same component —
// what it shows (child cards vs. product grid vs. both) is driven purely
// by whether `node.children` / `node.products` exist.
export default function CategoryTemplate({ node, trail }) {
  const { city } = useCity();
  const [sortKey, setSortKey] = useState("popular");
  const [priceFilter, setPriceFilter] = useState("all");
  const [cityOnly, setCityOnly] = useState(false);
  const [topRatedOnly, setTopRatedOnly] = useState(false);

  usePageMeta(
    node.label + " — Shop by Occasion — Next Level Events",
    node.description || (node.label + " decor and packages from Next Level Events."),
  );
  useReveal([node.slug, sortKey, priceFilter, cityOnly, topRatedOnly]);

  const crumbs = useMemo(() => {
    const items = [{ label: "Shop by Occasion", href: "/shop-by-occasion" }];
    trail.forEach((n, i) => {
      items.push({ label: n.label, href: i < trail.length - 1 ? pathFor(trail.slice(0, i + 1)) : null });
    });
    return items;
  }, [trail]);

  const children = childrenOf(node);
  const parent = trail.length > 1 ? trail[trail.length - 2] : null;

  // Mixed/aggregated product grid: every product nested under this node
  // (own + every descendant category/theme), not just ones attached
  // directly to it. A top-level listing (e.g. Birthday) shows every theme's
  // products together; a leaf theme page naturally reduces to just its own
  // products since it has no descendants. Each product keeps its real
  // trail (__trail) so its card links to the correct nested URL.
  const productEntries = useMemo(() => collectProductEntries(node, trail), [node, trail]);
  const products = useMemo(
    () => productEntries.map((e) => ({ ...e.product, __trail: e.trail })),
    [productEntries],
  );
  const quickLinks = useMemo(() => quickLinksFor(node, trail), [node, trail]);

  // Services are admin-editable (Admin → Event Services), so they're read
  // from the catalog store rather than the static data file, and kept in
  // sync with "nle-catalog-updated" so admin edits show without a reload.
  const topSlug = Array.isArray(trail) && trail.length > 0 ? trail[0].slug : null;
  const [addonItems, setAddonItems] = useState(() => getAddonsForOccasion(topSlug));
  useEffect(() => {
    function refreshAddons() {
      setAddonItems(getAddonsForOccasion(topSlug));
    }
    refreshAddons();
    window.addEventListener("nle-catalog-updated", refreshAddons);
    return () => window.removeEventListener("nle-catalog-updated", refreshAddons);
  }, [topSlug]);
  const heroImages = useMemo(() => heroGalleryFor(node, trail), [node, trail]);


  const visibleProducts = useMemo(() => {
    let list = products;
    if (priceFilter !== "all") {
      const bucket = PRICE_BUCKETS.find((b) => b.key === priceFilter);
      if (bucket) list = list.filter((p) => p.price >= bucket.min && p.price < bucket.max);
    }
    if (cityOnly) list = list.filter((p) => isAvailableInCity(p, city));
    if (topRatedOnly) list = list.filter((p) => (p.rating || 0) >= 4.7);
    return sortProducts(list, sortKey);
  }, [products, priceFilter, cityOnly, topRatedOnly, sortKey, city]);

  function resetFilters() {
    setPriceFilter("all");
    setCityOnly(false);
    setTopRatedOnly(false);
  }

  const filterDescriptors = useMemo(() => {
    const list = [];
    list.push({
      key: "price", label: "Price", kind: "chips", value: priceFilter, onChange: setPriceFilter,
      options: PRICE_BUCKETS.map((b) => ({ key: b.key, label: b.label })),
    });
    list.push({ key: "city", label: "Available in " + city, kind: "toggle", value: cityOnly, onChange: setCityOnly });
    list.push({ key: "rating", label: "Top Rated (4.7★+)", kind: "toggle", value: topRatedOnly, onChange: setTopRatedOnly });
    return list;
  }, [priceFilter, cityOnly, topRatedOnly, city]);

  const relatedFromParent = parent ? childrenOf(parent).filter((n) => n.slug !== node.slug) : [];

  // "Popular in Your City" — top-rated/most-popular products bookable in
  // the shopper's current city, drawn from everywhere under this node.
  const popularInCity = useMemo(() => {
    const entries = collectProductEntries(node, trail).filter((e) => isAvailableInCity(e.product, city));
    const top = sortProducts(entries.map((e) => e.product), "popular").slice(0, 8);
    return top.map((p) => toRailItem(p, entries.find((e) => e.product.slug === p.slug).trail));
  }, [node, trail, city]);

  // "Similar Products" — items from sibling categories/themes that hold
  // products directly (not this node's own products), so it complements
  // rather than repeats the grid above.
  const similarProducts = useMemo(() => {
    if (!parent) return [];
    const entries = [];
    relatedFromParent.forEach((sib) => {
      entries.push(...collectProductEntries(sib, [...trail.slice(0, -1), sib]));
    });
    const top = sortProducts(entries.map((e) => e.product), "popular").slice(0, 8);
    return top.map((p) => toRailItem(p, entries.find((e) => e.product.slug === p.slug).trail));
  }, [parent, relatedFromParent, trail]);

  return (
    <>
      <section className="hero hero-sm occ-hero">
        <div className="hero-media"><HeroImageCarousel images={heroImages} alt={node.label} /></div>
        <div className="hero-content">
          <span className="eyebrow">{parent ? parent.label : "Shop by Occasion"}</span>
          <h1>{node.label}</h1>
          <p>{node.tagline || node.description}</p>
        </div>
      </section>

      <section className="section-tight container">
        <Breadcrumb items={crumbs} />

        {node.description && (
          <p className="occ-lead reveal">{node.description}</p>
        )}

        <OccasionQuickLinks title={node.label + " Decoration Themes"} items={quickLinks} node={node} trail={trail} />

        {!node.addonOnly && (
          <EventAddons title="Services Categories" occasionLabel={node.label} items={addonItems} />
        )}

        {products.length > 0 && (
          <div className="occ-block">
            <div className="section-head reveal">
              <h2>{children.length > 0 ? "Featured Packages" : "Packages & Setups"}</h2>
              <p>{visibleProducts.length} option{visibleProducts.length === 1 ? "" : "s"} for {node.label.toLowerCase()}, fully customisable.</p>
            </div>

            <ListingControls
              resultCount={visibleProducts.length}
              sortKey={sortKey}
              onSortChange={setSortKey}
              filters={filterDescriptors}
              onReset={resetFilters}
            />

            <div className="occ-prod-grid reveal">
              {visibleProducts.map((p) => (
                <ProductCard key={p.slug} product={p} href={pathFor(p.__trail)} variant="occasion-market" />
              ))}
            </div>
            {visibleProducts.length === 0 && (
              <p className="occ-empty reveal">No packages match these filters yet — try resetting them.</p>
            )}
          </div>
        )}
      </section>

      <ProductRail title="Popular in Your City" viewAllHref="/packages" items={popularInCity} />

      {similarProducts.length > 0 && <ProductRail title="Similar Products" viewAllHref={parent ? pathFor([...trail.slice(0, -1)]) : "/shop-by-occasion"} items={similarProducts} tone="surface" />}

      <section className="section-tight container">
        {parent && relatedFromParent.length > 0 && (
          <div className="occ-block" style={{ marginTop: 0, paddingTop: 0, borderTop: 0 }}>
            <div className="section-head reveal">
              <h2>Related Categories</h2>
            </div>
            <div className="occ-cat-grid reveal">
              {relatedFromParent.map((sib) => (
                <CategoryCard key={sib.slug} node={sib} href={pathFor([...trail.slice(0, -1), sib])} />
              ))}
            </div>
          </div>
        )}

        <div className="reveal" style={{ marginTop: 32 }}>
          <Link to="/book-event" className="btn btn-primary">Enquire About {node.label}</Link>
        </div>

      </section>

      <OccasionReview topSlug={topSlug} label={node.label} />
    </>
  );
}
