import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
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
import { serviceProductMatchesContext } from "../../lib/catalogStore";
import { filterServiceProducts } from "../../lib/serviceContext";
import { EVENT_SERVICES } from "../../data/eventServices";
import { useCity } from "../../context/CityContext";
import { trackEvent } from "../../lib/siteEvents";
import {
  childrenOf, pathFor, countProducts,
  sortProducts, isAvailableInCity, PRICE_BUCKETS, toRailItem, collectProductEntries,
  quickLinksFor, heroGalleryFor, OCCASIONS,
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

function flattenServiceCategories(nodes = [], trail = []) {
  const out = [];
  (nodes || []).forEach((child) => {
    const next = [...trail, child];
    out.push({ path: next.map((item) => item.slug).join("/"), label: next.map((item) => item.label).join(" › ") });
    out.push(...flattenServiceCategories(child.children || [], next));
  });
  return out;
}

function flattenOccasionContexts(nodes = [], occasionSlug, trail = []) {
  const out = [];
  (nodes || []).forEach((child) => {
    const next = [...trail, child];
    out.push({
      path: [occasionSlug, ...next.map((item) => item.slug)].join("/"),
      label: next.map((item) => item.label).join(" › "),
    });
    out.push(...flattenOccasionContexts(child.children || [], occasionSlug, next));
  });
  return out;
}

function ServiceCatalogContent({ node, serviceContextPath = [] }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [liveTree, setLiveTree] = useState(null);
  const [liveProducts, setLiveProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [serviceFilter, setServiceFilter] = useState("");
  const [occasionFilter, setOccasionFilter] = useState("");
  const [functionFilter, setFunctionFilter] = useState("");
  const [priceFilter, setPriceFilter] = useState("all");
  const [sortKey, setSortKey] = useState("popular");

  useReveal([liveTree, liveProducts, loading, serviceFilter, occasionFilter, functionFilter, priceFilter, sortKey]);

  const syncFromUrl = () => {
    try {
      const params = new URLSearchParams(location.search);
      const context = (params.get("context") || "").split("/").map((part) => part.trim()).filter(Boolean);
      setServiceFilter(params.get("service") || "");
      setOccasionFilter(context[0] || "");
      setFunctionFilter(context.slice(1).join("/") || "");
    } catch {
      setServiceFilter("");
      setOccasionFilter("");
      setFunctionFilter("");
    }
  };

  useEffect(() => {
    syncFromUrl();
    // Keep the page in sync when a user follows a filter link with the browser.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  const updateFilters = (next = {}) => {
    const nextService = next.service !== undefined ? next.service : serviceFilter;
    const nextOccasion = next.occasion !== undefined ? next.occasion : occasionFilter;
    const nextFunction = next.functionPath !== undefined ? next.functionPath : functionFilter;
    const params = new URLSearchParams();
    if (nextService) params.set("service", nextService);
    const context = [nextOccasion, nextFunction].filter(Boolean).join("/");
    if (context) params.set("context", context);
    navigate({ pathname: "/occasion/event-services", search: params.toString() ? `?${params.toString()}` : "" }, { replace: true });
  };

  const refreshServiceCatalog = async () => {
    try {
      const { hydrateCatalogFromCloud, getAddonCategoryTree, getAddonProducts } = await import("../../lib/catalogStore");
      await hydrateCatalogFromCloud();
      setLiveTree(getAddonCategoryTree() || null);
      setLiveProducts(Array.isArray(getAddonProducts()) ? getAddonProducts() : []);
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
  }, []);

  const occasionOptions = useMemo(
    () => OCCASIONS.filter((occasion) => !occasion.addonOnly && occasion.slug !== "dummy-event"),
    [],
  );

  const functionOptions = useMemo(() => {
    const occasion = occasionOptions.find((item) => item.slug === occasionFilter);
    return occasion ? flattenOccasionContexts(occasion.children || [], occasion.slug) : [];
  }, [occasionFilter, occasionOptions]);

  const contextPath = useMemo(() => {
    if (occasionFilter && functionFilter) return [occasionFilter, ...functionFilter.split("/").filter(Boolean)];
    if (occasionFilter) return [occasionFilter];
    return [];
  }, [occasionFilter, functionFilter]);

  // The service filter is intentionally limited to the same ten canonical
  // top-level services used by every storefront service rail.
  const serviceCategories = useMemo(() => {
    // When an occasion/function is selected, only expose service categories
    // that have at least one live product matching that exact context. This
    // keeps the filter controls aligned with the same scoped product list.
    const available = new Set();
    filterServiceProducts(liveProducts, { contextPath }).forEach((product) => {
      const path = Array.isArray(product?.categoryPath) ? product.categoryPath : [];
      if (path[0] === "event-services" && path[1]) available.add(path[1]);
    });
    return EVENT_SERVICES
      .filter((service) => available.has(service.slug))
      .map((service) => ({ path: service.slug, label: service.label }));
  }, [liveProducts, contextPath]);

  useEffect(() => {
    // If a deep link or a previously selected filter points to a service
    // category that has no live service in the current context, clear that
    // stale category selection instead of leaving the catalog in an empty
    // state. During initial loading, keep the URL untouched until products
    // have been hydrated.
    if (!loading && serviceFilter && !serviceCategories.some((item) => item.path === serviceFilter)) {
      const params = new URLSearchParams(location.search);
      params.delete("service");
      navigate({ pathname: "/occasion/event-services", search: params.toString() ? `?${params.toString()}` : "" }, { replace: true });
    }
  }, [loading, serviceFilter, serviceCategories, location.search, navigate]);

  const orderedProducts = useMemo(() => {
    let list = filterServiceProducts(liveProducts, {
      service: serviceFilter,
      contextPath,
    });

    if (priceFilter !== "all") {
      const bucket = PRICE_BUCKETS.find((bucketItem) => bucketItem.key === priceFilter);
      if (bucket) list = list.filter((product) => Number(product.price) >= bucket.min && Number(product.price) < bucket.max);
    }

    return sortProducts(list, sortKey).map((product) => ({
      ...product,
      __contextPath: contextPath,
      __trail: [node, ...(Array.isArray(product.categoryPath) ? product.categoryPath.slice(1).map((slug) => ({ slug, label: slug })) : []), product],
    }));
  }, [liveProducts, serviceFilter, contextPath, priceFilter, sortKey, node]);

  const filterDescriptors = useMemo(() => [
    {
      key: "service",
      label: "Service",
      kind: "select",
      value: serviceFilter,
      onChange: (value) => updateFilters({ service: value }),
      options: [{ key: "", label: "All Services" }, ...serviceCategories.map((item) => ({ key: item.path, label: item.label }))],
    },
    {
      key: "occasion",
      label: "Occasion",
      kind: "select",
      value: occasionFilter,
      onChange: (value) => updateFilters({ occasion: value, functionPath: "" }),
      options: [{ key: "", label: "All Occasions" }, ...occasionOptions.map((item) => ({ key: item.slug, label: item.label }))],
    },
    {
      key: "function",
      label: "Function",
      kind: "select",
      value: functionFilter,
      onChange: (value) => updateFilters({ functionPath: value }),
      options: [{ key: "", label: occasionFilter ? "All Functions" : "Choose an occasion" }, ...functionOptions.map((item) => ({ key: item.path.slice(occasionFilter.length + 1), label: item.label }))],
    },
    {
      key: "price",
      label: "Price",
      kind: "chips",
      value: priceFilter,
      onChange: setPriceFilter,
      options: PRICE_BUCKETS.map((bucket) => ({ key: bucket.key, label: bucket.label })),
    },
  ], [serviceFilter, occasionFilter, functionFilter, priceFilter, serviceCategories, occasionOptions, functionOptions]);

  function resetFilters() {
    setPriceFilter("all");
    updateFilters({ service: "", occasion: "", functionPath: "" });
  }

  return (
    <>
      <div className="occ-block" style={{ paddingTop: 0, marginTop: 0, borderTop: 0 }}>
        <div className="section-head reveal">
          <h2>All Services</h2>
          <p>Choose a service, occasion and function to see exactly what is available.</p>
        </div>
        <ListingControls
          resultCount={orderedProducts.length}
          sortKey={sortKey}
          onSortChange={setSortKey}
          filters={filterDescriptors}
          onReset={resetFilters}
        />
      </div>

      {orderedProducts.length > 0 && (
        <div className="occ-block">
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

      {!loading && !orderedProducts.length && (
        <div className="occ-block">
          <div className="occ-empty reveal">
            <strong>No services match these filters.</strong>
            <p>Try another service, occasion, function or price range.</p>
          </div>
        </div>
      )}

      {loading && !orderedProducts.length && (
        <div className="occ-block">
          <div className="occ-empty reveal">
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

  useEffect(() => {
    if (topSlug && topSlug !== "event-services") {
      trackEvent("occasion_view", {
        occasion: topSlug,
        function_path: trail.slice(1).map((item) => item.slug).join("/"),
        page_name: node.label,
      });
    }
  }, [topSlug, node.label, trail]);

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
  // Listing scope is based on the selected node. Parent/category pages with
  // children can intentionally aggregate products from their descendants, but
  // a selected leaf/theme (for example Traditional Haldi, a Birthday theme,
  // a Reception theme, an Anniversary type, or a Corporate event type) must
  // show only products assigned to that exact node. This keeps the same strict
  // filtering rule across every occasion instead of special-casing Wedding.
  const productEntries = useMemo(() => {
    const hasChildren = Array.isArray(node?.children) && node.children.length > 0;
    const isExactListing = node?.type === "theme" || !hasChildren;

    if (isExactListing) {
      const currentPath = trail.map((item) => item.slug);
      const directProducts = Array.isArray(node.products) ? node.products : [];
      return directProducts
        .filter((product) => {
          const productPath = Array.isArray(product?.categoryPath)
            ? product.categoryPath.filter(Boolean)
            : [];
          if (productPath.length) {
            return productPath.length === currentPath.length &&
              productPath.every((part, index) => part === currentPath[index]);
          }

          // Older records may only have categorySlug. If that field points
          // to the parent category (e.g. `haldi`), do not show it on a
          // child theme (e.g. `traditional-haldi`).
          const categorySlug = String(product?.categorySlug || "").trim();
          return !categorySlug || categorySlug === node.slug;
        })
        .map((product) => ({ product, trail: [...trail, product] }));
    }

    return collectProductEntries(node, trail);
  }, [node, trail]);
  const products = useMemo(
    () => productEntries.map((e) => ({ ...e.product, __trail: e.trail })),
    [productEntries],
  );
  const contextProducts = useMemo(() => {
    if (!isServiceCatalog || !serviceContextPath.length) return products;
    return products.filter((product) => serviceProductMatchesContext(product, serviceContextPath));
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
  // "Services Categories" block is hidden on every subcategory of Wedding & Birthday.
  const hideServiceCategories = (topSlug === "wedding" || topSlug === "birthday") && trail.length > 1;
  // Add-on/service blocks mount asynchronously after the first reveal pass;
  // re-run so their `.reveal` nodes never stay at opacity:0 (the blank gap).
  useReveal([node.slug, addonItems.length, products.length]);

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
          <ServiceCatalogContent node={node} serviceContextPath={serviceContextPath} />
        </section>
      </div>
    );
  }

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

        {!node.addonOnly && <EventServicesSection contextPath={serviceContextPath} />}

        {!node.addonOnly && !hideServiceCategories && addonItems.length > 0 && (
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
