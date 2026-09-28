import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { PLACEHOLDER_IMAGE } from "../../lib/imageFallback";
import usePageMeta from "../../hooks/usePageMeta";
import useReveal from "../../hooks/useReveal";
import Breadcrumb from "./Breadcrumb";
import CategoryCard from "./CategoryCard";
import ProductCard from "./ProductCard";
import OccasionQuickLinks from "./OccasionQuickLinks";
import EventAddons from "./EventAddons";
import EventServicesSection from "./EventServicesSection";
import HeroImageCarousel from "../HeroImageCarousel";
import ListingControls from "./ListingControls";
import ProductRail from "../ProductRail";
import { useCity } from "../../context/CityContext";
import {
  childrenOf, pathFor, countProducts,
  sortProducts, isAvailableInCity, PRICE_BUCKETS, toRailItem, collectProductEntries,
  quickLinksFor, heroGalleryFor,
} from "../../data/occasions";

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

function ServiceCatalogContent({ node, trail }) {
  const [liveTree, setLiveTree] = useState(null);
  const [liveProducts, setLiveProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const servicePath = useMemo(
    () => (Array.isArray(trail) ? trail.map((item) => item.slug).filter(Boolean) : []),
    [trail],
  );

  // Service content is hydrated asynchronously. The parent category page's
  // reveal observer runs before these nodes exist, which can leave dynamically
  // inserted `.reveal` elements at opacity:0 forever. Re-run the same existing
  // reveal behavior whenever the live service tree/products arrive.
  useReveal([servicePath.join("/"), liveTree, liveProducts, loading]);

  const refreshServiceCatalog = async () => {
    try {
      // Force a fresh public-catalog read on service pages. This prevents a
      // hard refresh from rendering a cached category before the latest
      // Supabase service products have reached localStorage.
      const { hydrateCatalogFromCloud, getAddonCategoryTree, getAddonProducts } = await import("../../lib/catalogStore");
      await hydrateCatalogFromCloud();
      const tree = getAddonCategoryTree();
      const products = getAddonProducts();
      setLiveTree(tree || null);
      setLiveProducts(Array.isArray(products) ? products : []);
    } catch {
      try {
        const { getAddonCategoryTree, getAddonProducts } = await import("../../lib/catalogStore");
        setLiveTree(getAddonCategoryTree() || null);
        setLiveProducts(getAddonProducts() || []);
      } catch {
        setLiveTree(null);
        setLiveProducts([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      try {
        const { getAddonCategoryTree, getAddonProducts, hydrateCatalogFromCloud } = await import("../../lib/catalogStore");
        // Read the cache immediately so the page is never an empty white area.
        if (!cancelled) {
          setLiveTree(getAddonCategoryTree() || null);
          setLiveProducts(getAddonProducts() || []);
        }
        await hydrateCatalogFromCloud();
        if (!cancelled) {
          setLiveTree(getAddonCategoryTree() || null);
          setLiveProducts(getAddonProducts() || []);
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    };

    refresh();
    window.addEventListener("nle-catalog-updated", refreshServiceCatalog);
    return () => {
      cancelled = true;
      window.removeEventListener("nle-catalog-updated", refreshServiceCatalog);
    };
  }, [servicePath.join("/")]);

  const activeNode = useMemo(() => {
    if (!liveTree || !servicePath.length) return node;
    let current = liveTree;
    for (const slug of servicePath.slice(1)) {
      current = (current?.children || []).find((child) => child.slug === slug);
      if (!current) return node;
    }
    return current;
  }, [liveTree, servicePath, node]);

  const children = Array.isArray(activeNode?.children) ? activeNode.children : [];
  const orderedProducts = useMemo(() => {
    if (!servicePath.length) return [];
    const prefix = servicePath.join("/");
    const seen = new Set();
    return liveProducts.filter((product) => {
      if (!product || product.status === "archived" || product.status === "draft") return false;
      const path = Array.isArray(product.categoryPath)
        ? product.categoryPath.filter(Boolean)
        : [];
      const pathKey = path.join("/");
      const matches = pathKey === prefix || pathKey.startsWith(`${prefix}/`);
      if (!matches) return false;
      const key = String(product.id || product.slug || product.name || "");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).map((product) => {
      // Rebuild the real category trail from the persisted categoryPath so a
      // product nested under a service sub-category keeps the correct URL.
      let categoryTrail = [...trail];
      if (liveTree && Array.isArray(product.categoryPath) && product.categoryPath[0] === "event-services") {
        let current = liveTree;
        const rebuilt = [liveTree];
        for (const slug of product.categoryPath.slice(1)) {
          const child = (current?.children || []).find((item) => item.slug === slug);
          if (!child) break;
          rebuilt.push(child);
          current = child;
        }
        if (rebuilt.length === product.categoryPath.length) categoryTrail = rebuilt;
      }
      return { ...product, __trail: [...categoryTrail, product] };
    });
  }, [liveProducts, liveTree, servicePath, trail]);

  const isRoot = activeNode?.slug === "event-services";
  const childCards = children.filter((child) => child && child.active !== false);

  return (
    <>
      {childCards.length > 0 && (
        <div className="occ-block" style={{ paddingTop: 0, marginTop: 0, borderTop: 0 }}>
          <div className="section-head reveal">
            <h2>{isRoot ? "Services Categories" : "More in " + activeNode.label}</h2>
            <p>{isRoot ? "Browse the services available for your event." : "Choose a service category to explore."}</p>
          </div>
          <div className="occ-cat-grid reveal">
            {childCards.map((child) => (
              <CategoryCard
                key={child.slug}
                node={{ ...child, image: child.image || child.heroImg || PLACEHOLDER_IMAGE }}
                href={pathFor([...trail, child])}
              />
            ))}
          </div>
        </div>
      )}

      {orderedProducts.length > 0 && (
        <div className="occ-block">
          <div className="section-head reveal">
            <div>
              <h2>{isRoot ? "All Services" : activeNode.label + " Services"}</h2>
              <p>{orderedProducts.length} service{orderedProducts.length === 1 ? "" : "s"} available.</p>
            </div>
          </div>
          <div className="occ-prod-grid reveal">
            {orderedProducts.map((product, index) => (
              <ProductCard
                key={`${product.id || product.slug || "service"}-${index}`}
                product={{ ...product, image: product.image || product.images?.[0] || product.gallery?.[0] || PLACEHOLDER_IMAGE }}
                href={pathFor(product.__trail)}
                variant="occasion-market"
              />
            ))}
          </div>
        </div>
      )}

      {!loading && !childCards.length && !orderedProducts.length && (
        <div className="occ-block">
          <div className="occ-empty reveal">
            <strong>No services are available here yet.</strong>
            <p>This service category is ready for products from Admin → Catalog → Services.</p>
          </div>
        </div>
      )}

      {loading && !childCards.length && !orderedProducts.length && (
        <div className="occ-block">
          <div className="occ-empty reveal" aria-live="polite">
            <strong>Loading services…</strong>
            <p>Getting the latest services from the catalog.</p>
          </div>
        </div>
      )}
    </>
  );
}

export default function CategoryTemplate({ node, trail }) {
  const { city } = useCity();
  const location = useLocation();
  const topSlug = Array.isArray(trail) && trail.length > 0 ? trail[0].slug : null;
  const isServiceCatalog = topSlug === "event-services";
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

  // Services are admin-editable (Admin → Event Services), so they're read
  // from the catalog store rather than the static data file, and kept in
  // sync with "nle-catalog-updated" so admin edits show without a reload.
  const serviceContextPath = useMemo(() => {
    if (topSlug !== "event-services") {
      return Array.isArray(trail) && trail.length ? trail.map((n) => n.slug) : [];
    }
    try {
      const raw = new URLSearchParams(location.search).get("context") || "";
      return raw.split("/").map((part) => part.trim()).filter(Boolean);
    } catch {
      return [];
    }
  }, [topSlug, trail, location.search]);
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
  const contextProducts = useMemo(() => {
    if (!isServiceCatalog || !serviceContextPath.length) return products;
    const isPrefix = (scope, context) => {
      const a = String(scope || "").split("/").filter(Boolean);
      const b = context;
      if (!a.length || a.length > b.length) return false;
      return a.every((part, index) => part === b[index]);
    };
    return products.filter((product) => {
      const scopes = Array.isArray(product.serviceScopes) ? product.serviceScopes : [];
      return !scopes.length || scopes.some((scope) => isPrefix(scope, serviceContextPath));
    });
  }, [products, isServiceCatalog, serviceContextPath]);
  const quickLinks = useMemo(() => quickLinksFor(node, trail), [node, trail]);

  // Event services are admin-owned data. Start empty and load only the live
  // catalog; never show bundled placeholder services when the cloud catalog is empty.
  const [addonItems, setAddonItems] = useState([]);
  useEffect(() => {
    let cancelled = false;
    const refreshAddons = () =>
      import("../../lib/catalogStore")
        .then(({ getAddonsForOccasion }) => {
          if (cancelled) return;
          let items = [];
          try { items = getAddonsForOccasion(topSlug, serviceContextPath); } catch { items = []; }
          setAddonItems(Array.isArray(items) ? items.filter((a) => a && typeof a === "object") : []);
        })
        .catch(() => {});
    refreshAddons();
    window.addEventListener("nle-catalog-updated", refreshAddons);
    return () => {
      cancelled = true;
      window.removeEventListener("nle-catalog-updated", refreshAddons);
    };
  }, [topSlug, serviceContextPath.join("/")]);
  const heroImages = useMemo(() => heroGalleryFor(node, trail), [node, trail]);

  if (isServiceCatalog) {
    return (
      <div className="occ-category-page">
        <section className="hero hero-sm occ-hero">
          <div className="hero-media"><HeroImageCarousel images={heroImages?.length ? heroImages : [node.heroImg || node.image || PLACEHOLDER_IMAGE]} alt={node.label} /></div>
          <div className="hero-content">
            <span className="eyebrow">{trail.length > 1 ? trail[trail.length - 2].label : "Event Services"}</span>
            <h1>{node.label}</h1>
            <p>{node.tagline || node.description}</p>
          </div>
        </section>
        <section className="section-tight container occ-category-content">
          <Breadcrumb items={crumbs} />
          {node.description && <p className="occ-lead reveal">{node.description}</p>}
          <ServiceCatalogContent node={node} trail={trail} />
        </section>
      </div>
    );
  }



  const visibleProducts = useMemo(() => {
    let list = contextProducts;
    if (priceFilter !== "all") {
      const bucket = PRICE_BUCKETS.find((b) => b.key === priceFilter);
      if (bucket) list = list.filter((p) => p.price >= bucket.min && p.price < bucket.max);
    }
    if (cityOnly) list = list.filter((p) => isAvailableInCity(p, city));
    if (topRatedOnly) list = list.filter((p) => (p.rating || 0) >= 4.7);
    return sortProducts(list, sortKey);
  }, [contextProducts, priceFilter, cityOnly, topRatedOnly, sortKey, city]);

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
    const trailBySlug = new Map(entries.map((e) => [e.product.slug, e.trail]));
    const top = sortProducts(entries.map((e) => e.product), "popular").slice(0, 8);
    return top.map((p) => {
      const itemTrail = trailBySlug.get(p.slug);
      return itemTrail ? toRailItem(p, itemTrail) : null;
    }).filter(Boolean);
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
    const trailBySlug = new Map(entries.map((e) => [e.product.slug, e.trail]));
    const top = sortProducts(entries.map((e) => e.product), "popular").slice(0, 8);
    return top.map((p) => {
      const itemTrail = trailBySlug.get(p.slug);
      return itemTrail ? toRailItem(p, itemTrail) : null;
    }).filter(Boolean);
  }, [parent, relatedFromParent, trail]);

  return (
    <div className="occ-category-page">
      <section className="hero hero-sm occ-hero">
        <div className="hero-media"><HeroImageCarousel images={heroImages} alt={node.label} /></div>
        <div className="hero-content">
          <span className="eyebrow">{parent ? parent.label : "Shop by Occasion"}</span>
          <h1>{node.label}</h1>
          <p>{node.tagline || node.description}</p>
        </div>
      </section>

      <section className="section-tight container occ-category-content">
        <Breadcrumb items={crumbs} />

        {node.description && (
          <p className="occ-lead reveal">{node.description}</p>
        )}

        <OccasionQuickLinks title={node.label + " Decoration Themes"} items={quickLinks} node={node} trail={trail} />

        {!node.addonOnly && <EventServicesSection />}

        {!node.addonOnly && addonItems.length > 0 && (
          <EventAddons title="Services Categories" occasionLabel={node.label} items={addonItems} contextPath={serviceContextPath} />
        )}

        {products.length > 0 && (
          <div className="occ-block">
            <div className="section-head reveal">
              <h2>{children.length > 0 ? "Featured Packages" : "Packages & Setups"}</h2>
              <p>{visibleProducts.length} option{visibleProducts.length === 1 ? "" : "s"} for {String(node.label || "").toLowerCase()}, fully customisable.</p>
            </div>

            <ListingControls
              resultCount={visibleProducts.length}
              sortKey={sortKey}
              onSortChange={setSortKey}
              filters={filterDescriptors}
              onReset={resetFilters}
            />

            <div className="occ-prod-grid reveal">
              {visibleProducts.map((p, i) => (
                <ProductCard key={`${p.slug || p.id || "p"}-${i}`} product={p} href={`${pathFor(p.__trail)}${isServiceCatalog && serviceContextPath.length ? `?context=${encodeURIComponent(serviceContextPath.join("/"))}` : ""}`} variant="occasion-market" />
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

      <section className="section-tight container occ-category-related">
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
    </div>
  );
}
