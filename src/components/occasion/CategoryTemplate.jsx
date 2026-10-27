import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { PLACEHOLDER_IMAGE } from "../../lib/imageFallback";
import usePageMeta from "../../hooks/usePageMeta";
import useReveal from "../../hooks/useReveal";
import Breadcrumb from "./Breadcrumb";
import CategoryCard from "./CategoryCard";
import ProductCard from "./ProductCard";
import OccasionQuickLinks from "./OccasionQuickLinks";
import EventServicesSection from "./EventServicesSection";
import HeroImageCarousel from "../HeroImageCarousel";
import ListingControls from "./ListingControls";
import ProductRail from "../ProductRail";
import { getBirthdayThemeProducts, getDecorationProductsForContext, getAssignedCatalogCategoryPaths, getAddonCategoryTree, getAddonProducts, getOccasion, hydrateCatalogFromCloud, serviceProductMatchesContext } from "../../lib/catalogStore";
import { DISPLAY_CATALOGS, normalizeDisplayPlacements } from "../../lib/catalogPlacement";
import { filterServiceProducts, normalizeServiceSlug, SERVICE_ALIASES } from "../../lib/serviceContext";
import { EVENT_SERVICES } from "../../data/eventServices";
import { BirthdayCategories } from "../../pages/Birthday";
import { useCity } from "../../context/CityContext";
import { trackEvent } from "../../lib/siteEvents";
import {
  childrenOf, pathFor, countProducts,
  sortProducts, isAvailableInCity, PRICE_BUCKETS, toRailItem, collectProductEntries,
  quickLinksFor, allQuickLinksFor, heroGalleryFor, OCCASIONS, findOccasion, normalizeCategoryPath,
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
  const [themeFilter, setThemeFilter] = useState("");
  const [priceFilter, setPriceFilter] = useState("all");
  const [sortKey, setSortKey] = useState("popular");

  useReveal([liveTree, liveProducts, loading, serviceFilter, occasionFilter, functionFilter, themeFilter, priceFilter, sortKey]);

  const syncFromUrl = () => {
    try {
      const params = new URLSearchParams(location.search);
      const rawService = params.get("service") || params.get("category") || "";
      const canonicalService = normalizeServiceSlug(rawService);

      const contextParam = params.get("context") || "";
      const context = contextParam.split("/").map((part) => part.trim()).filter(Boolean);

      const occasionParam = params.get("occasion") || params.get("occ") || context[0] || "";
      const functionParam = params.get("function") || params.get("func") || context.slice(1).join("/") || "";

      setServiceFilter(canonicalService);
      setOccasionFilter(occasionParam);
      setFunctionFilter(functionParam);
      setThemeFilter(params.get("theme") || "");
      setPriceFilter(params.get("price") || "all");
      setSortKey(params.get("sort") || "popular");
    } catch {
      setServiceFilter("");
      setOccasionFilter("");
      setFunctionFilter("");
      setThemeFilter("");
      setPriceFilter("all");
      setSortKey("popular");
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
    const nextTheme = next.theme !== undefined ? next.theme : themeFilter;
    const nextPrice = next.price !== undefined ? next.price : priceFilter;
    const nextSort = next.sort !== undefined ? next.sort : sortKey;

    const params = new URLSearchParams(location.search);
    if (nextService) params.set("service", nextService);
    else params.delete("service");

    const context = [nextOccasion, nextFunction].filter(Boolean).join("/");
    if (context) params.set("context", context);
    else params.delete("context");

    params.delete("occasion");
    params.delete("occ");
    params.delete("function");
    params.delete("func");
    params.delete("category");

    if (nextTheme && nextService === "decor") params.set("theme", nextTheme);
    else params.delete("theme");

    if (nextPrice && nextPrice !== "all") params.set("price", nextPrice);
    else params.delete("price");

    if (nextSort && nextSort !== "popular") params.set("sort", nextSort);
    else params.delete("sort");

    navigate({ pathname: "/occasion/event-services", search: params.toString() ? `?${params.toString()}` : "" }, { replace: true });
  };

  const refreshServiceCatalog = async () => {
    try {
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
    // When no occasion is selected (unfiltered browse), all canonical services are available.
    if (!contextPath.length) {
      return EVENT_SERVICES.map((service) => ({ path: service.slug, label: service.label }));
    }
    // When an occasion/function is selected, expose service categories
    // that have at least one live product matching that exact context.
    const available = new Set();
    filterServiceProducts(liveProducts, { contextPath }).forEach((product) => {
      const paths = [
        product?.categoryPath,
        product?.serviceCategoryPath,
        ...(Array.isArray(product?.categoryPaths) ? product.categoryPaths : []),
      ];
      paths.forEach((p) => {
        if (Array.isArray(p) && p[0] === "event-services" && p[1]) {
          available.add(normalizeServiceSlug(p[1]));
        }
      });
      (Array.isArray(product?.displayPlacements) ? product.displayPlacements : []).forEach((placement) => {
        const placementPath = Array.isArray(placement?.path) ? placement.path : [];
        if (placement?.catalog === "services" && placementPath[0] === "event-services" && placementPath[1]) {
          available.add(normalizeServiceSlug(placementPath[1]));
        }
      });
      if (product?.serviceCategory) {
        available.add(normalizeServiceSlug(product.serviceCategory));
      }
    });
    if (contextPath.length && getDecorationProductsForContext(contextPath).length) available.add("decor");
    // If user explicitly selected a valid canonical service, keep it available in the dropdown options
    if (serviceFilter && EVENT_SERVICES.some((s) => s.slug === serviceFilter)) {
      available.add(serviceFilter);
    }
    return EVENT_SERVICES
      .filter((service) => available.has(service.slug))
      .map((service) => ({ path: service.slug, label: service.label }));
  }, [liveProducts, contextPath, serviceFilter]);

  useEffect(() => {
    const isValidService = EVENT_SERVICES.some((item) => item.slug === serviceFilter);
    if (!loading && serviceFilter && !isValidService) {
      const params = new URLSearchParams(location.search);
      params.delete("service");
      navigate({ pathname: "/occasion/event-services", search: params.toString() ? `?${params.toString()}` : "" }, { replace: true });
    }
  }, [loading, serviceFilter, location.search, navigate]);

  const orderedProducts = useMemo(() => {
    // Once a decoration theme is selected, it is a filter inside the Decor
    // catalog — not a new service/category page. Only the decoration products
    // belonging to that theme are shown; the generic service list is hidden.
    if (serviceFilter === "decor" && contextPath.length && themeFilter) {
      // Birthday age cards live inside Decor but the canonical catalog path
      // keeps the Birthday Types wrapper. Resolve the filter to that exact
      // catalog path so selecting an age/theme returns the matching products.
      const liveBirthday = contextPath[0] === "birthday" ? getOccasion("birthday") : null;
      const birthdayTypes = liveBirthday
        ? childrenOf(liveBirthday).find((child) => child?.slug === "birthday-types")
        : null;
      const themePartyNode = birthdayTypes?.children?.find((child) => child?.slug === "theme-party");
      const isBirthdayTheme = Boolean(themePartyNode?.children?.some((child) => child?.slug === themeFilter));

      const liveAnniversary = contextPath[0] === "anniversary" ? getOccasion("anniversary") : null;
      const anniversaryTypes = liveAnniversary
        ? childrenOf(liveAnniversary).find((child) => child?.slug === "anniversary-types")
        : null;
      const isAnniversaryType = Boolean(anniversaryTypes?.children?.some((child) => child?.slug === themeFilter));

      const findThemePath = (nodes, slug, trail = []) => {
        for (const child of nodes || []) {
          const nextTrail = [...trail, child];
          if (child?.slug === slug) return nextTrail.map((item) => item.slug);
          const nested = findThemePath(child?.children || [], slug, nextTrail);
          if (nested) return nested;
        }
        return null;
      };
      const canonicalThemePath = findThemePath(
        contextPath[0] ? childrenOf(getOccasion(contextPath[0])) : [],
        themeFilter,
        [],
      );
      const themeContext = contextPath[0] === "birthday"
        ? (isBirthdayTheme
          ? ["birthday", "birthday-types", "theme-party", themeFilter]
          : ["birthday", "birthday-types", themeFilter])
        : contextPath[0] === "anniversary" && isAnniversaryType
          ? ["anniversary", "anniversary-types", themeFilter]
          : (contextPath[contextPath.length - 1] === themeFilter
            ? contextPath
            : (canonicalThemePath ? [contextPath[0], ...canonicalThemePath] : [...contextPath, themeFilter]));
      const matchesThemePath = (product) => {
        const kinds = Array.isArray(product?.catalogKinds) && product.catalogKinds.length
          ? product.catalogKinds
          : [product?.catalogKind || "product"];
        const requestedKinds = ["product", "package"].filter((kind) => kinds.includes(kind));
        const assignedPaths = getAssignedCatalogCategoryPaths(product, requestedKinds);
        const legacyPackagePaths = product?.catalogKind === "package" && Array.isArray(product?.packageOccasions)
          ? product.packageOccasions.map((slug) => [slug])
          : [];
        const rawPaths = [...assignedPaths, ...legacyPackagePaths]
          .filter((path) => Array.isArray(path) && path.length);
        // Older festival catalog saves may omit the `festivals` wrapper.
        // Match those paths to the current canonical festival theme path
        // without changing the stored catalog record.
        const paths = rawPaths.flatMap((path) => {
          const normalized = path.map((part) => String(part || "").toLowerCase().trim()).filter(Boolean);
          if (normalized[0] === "festivals-culture" && normalized[1] && !["festivals", "other-celebrations"].includes(normalized[1])) {
            return [normalized, ["festivals-culture", "festivals", ...normalized.slice(1)]];
          }
          return [normalized];
        });
        const categoryMatch = paths.some((rawPath) => {
          const path = rawPath.map((part) => String(part || "").toLowerCase().trim()).filter(Boolean);
          return path.length >= themeContext.length && themeContext.every((part, index) => path[index] === part);
        });
        if (categoryMatch) return true;

        // Theme cards behave like filters. A product explicitly placed at the
        // selected decoration theme should match even when its primary
        // category remains elsewhere in the catalog. The placement must sit AT
        // or BELOW the selected theme: a placement on a parent node (for
        // example Theme Party itself) belongs to no single theme and must not
        // leak into every sibling theme's result.
        return normalizeDisplayPlacements(product?.displayPlacements).some((placement) =>
          (placement.catalog === DISPLAY_CATALOGS.PRODUCTS || placement.catalog === DISPLAY_CATALOGS.SERVICES)
          && placement.path.length >= themeContext.length
          && themeContext.every((part, index) => placement.path[index] === part));
      };
      // A Birthday theme (child of Theme Party) is resolved by the shared
      // theme matcher so older saved paths and product-kind variants are not
      // silently dropped; every other filter keeps the original matcher.
      let list = (isBirthdayTheme
        ? getBirthdayThemeProducts(themeFilter)
        : getDecorationProductsForContext(themeContext).filter(matchesThemePath))
        .map((product) => ({
          ...product,
          __decorationContextProduct: true,
        }));

      if (priceFilter !== "all") {
        const bucket = PRICE_BUCKETS.find((bucketItem) => bucketItem.key === priceFilter);
        if (bucket) list = list.filter((product) => Number(product.price) >= bucket.min && Number(product.price) < bucket.max);
      }

      return sortProducts(list, sortKey).map((product) => ({
        ...product,
        __contextPath: themeContext,
        __trail: Array.isArray(product.categoryPath) && product.categoryPath.length
          ? [...product.categoryPath.map((slug) => ({ slug, label: slug })), product]
          : [node, product],
      }));
    }

    let list = filterServiceProducts(liveProducts, {
      service: serviceFilter,
      contextPath,
    });

    // Décor is also the storefront home for the decoration/theme products
    // belonging to the selected occasion/function. Reuse the existing
    // catalog records; never create a second copy just for the service view.
    if (serviceFilter === "decor" && contextPath.length) {
      const decorationProducts = getDecorationProductsForContext(contextPath);
      const existingIds = new Set(list.map((product) => String(product?.id || product?.slug || "")));
      decorationProducts.forEach((product) => {
        const key = String(product?.id || product?.slug || "");
        if (!key || existingIds.has(key)) return;
        existingIds.add(key);
        list.push({ ...product, __decorationContextProduct: true });
      });
    }

    if (priceFilter !== "all") {
      const bucket = PRICE_BUCKETS.find((bucketItem) => bucketItem.key === priceFilter);
      if (bucket) list = list.filter((product) => Number(product.price) >= bucket.min && Number(product.price) < bucket.max);
    }

    return sortProducts(list, sortKey).map((product) => {
      let svcMidSlugs;
      if (product.__decorationContextProduct && Array.isArray(product.categoryPath) && product.categoryPath.length) {
        // Decoration products use their own categoryPath (e.g. wedding/haldi/...)
        // to build the full trail — they are not anchored under event-services.
        return { ...product, __contextPath: contextPath, __trail: [...product.categoryPath.map((slug) => ({ slug, label: slug })), product] };
      }
      // For service products, find the canonical event-services path.
      // categoryPaths may contain multiple entries (cross-listed products); use
      // the first one that starts with "event-services" so the generated URL
      // matches where getLiveOccasions actually placed the product in the tree.
      const eventServicesCategoryPath = (
        (Array.isArray(product.categoryPaths) ? product.categoryPaths : [])
          .find((p) => Array.isArray(p) && p[0] === "event-services")
        ?? (Array.isArray(product.serviceCategoryPath) && product.serviceCategoryPath[0] === "event-services"
          ? product.serviceCategoryPath
          : null)
        ?? (Array.isArray(product.categoryPath) && product.categoryPath[0] === "event-services"
          ? product.categoryPath
          : null)
        ?? (Array.isArray(product.categoryPath) ? product.categoryPath : [])
      );
      svcMidSlugs = eventServicesCategoryPath.slice(1).map((slug) => ({ slug, label: slug }));
      return { ...product, __contextPath: contextPath, __trail: [node, ...svcMidSlugs, product] };
    });
  }, [liveProducts, serviceFilter, contextPath, themeFilter, priceFilter, sortKey, node]);

  // Theme Party is a parent filter, not a product-less browser page.
  // Keep its child-theme links visible, but allow the normal Decor product
  // listing to render all products under Birthday → Birthday Types → Theme Party.
  const isThemePartyBrowser = false;

  const decorationContext = useMemo(() => {
    if (serviceFilter !== "decor" || !contextPath.length) return null;
    const root = OCCASIONS.find((item) => item.slug === contextPath[0]);
    if (!root) return null;
    const trail = [root];
    let current = root;
    for (const slug of contextPath.slice(1)) {
      const next = childrenOf(current).find((child) => child.slug === slug);
      if (!next) return null;
      trail.push(next);
      current = next;
    }
    return { node: current, trail };
  }, [serviceFilter, contextPath]);

  const decorationThemeLinks = useMemo(() => {
    if (!decorationContext) return [];

    // Theme Party is a parent filter. Opening it should show its live child
    // themes first; selecting one of those children then filters products.
    const liveBirthday = contextPath[0] === "birthday" ? getOccasion("birthday") : null;
    const birthdayTypes = liveBirthday
      ? childrenOf(liveBirthday).find((child) => child?.slug === "birthday-types")
      : null;
    const themePartyNode = birthdayTypes?.children?.find((child) => child?.slug === "theme-party");
    const isBirthdayThemeChild = Boolean(themePartyNode?.children?.some((child) => child?.slug === themeFilter));

    // Anniversary milestones live under the structural Anniversary Types
    // node. On the Decor service page, expose those direct children as filters
    // rather than sending the visitor to separate category pages.
    const liveAnniversary = contextPath[0] === "anniversary" ? getOccasion("anniversary") : null;
    const anniversaryTypes = liveAnniversary
      ? childrenOf(liveAnniversary).find((child) => child?.slug === "anniversary-types")
      : null;
    let sourceNode = decorationContext.node;
    let sourceTrail = decorationContext.trail;
    let includeAllAnniversaries = false;

    if ((themeFilter === "theme-party" || isBirthdayThemeChild) && themePartyNode) {
      sourceNode = themePartyNode;
      sourceTrail = [liveBirthday || decorationContext.trail[0], birthdayTypes, themePartyNode];
    } else if (contextPath[0] === "anniversary" && anniversaryTypes) {
      sourceNode = anniversaryTypes;
      sourceTrail = [liveAnniversary || decorationContext.trail[0], anniversaryTypes];
      includeAllAnniversaries = true;
    }

    const links = allQuickLinksFor(sourceNode, sourceTrail).map((item) => {
      const params = new URLSearchParams();
      params.set("service", "decor");
      params.set("context", contextPath.join("/"));
      if (item.slug) params.set("theme", item.slug);
      return { ...item, href: `/occasion/event-services?${params.toString()}` };
    });

    if (includeAllAnniversaries && sourceNode === anniversaryTypes) {
      const allParams = new URLSearchParams();
      allParams.set("service", "decor");
      allParams.set("context", contextPath.join("/"));
      links.unshift({
        label: "All Anniversaries",
        image: liveAnniversary?.image || liveAnniversary?.heroImg || decorationContext.trail[0]?.image,
        type: "category",
        slug: "",
        href: `/occasion/event-services?${allParams.toString()}`,
      });
    }

    return links;
    // liveTree/liveProducts change on every catalog refresh (including the
    // existing nle-catalog-updated event), so the list is never stale.
  }, [decorationContext, contextPath, themeFilter, liveTree, liveProducts]);

  // The theme list is shown for Theme Party itself and while one of its child
  // themes is selected (so another theme can be chosen without going back).
  const showBirthdayThemeList = useMemo(() => {
    if (serviceFilter !== "decor" || contextPath[0] !== "birthday" || !themeFilter) return false;
    if (themeFilter === "theme-party") return true;
    const types = childrenOf(getOccasion("birthday")).find((child) => child?.slug === "birthday-types");
    const party = types?.children?.find((child) => child?.slug === "theme-party");
    return Boolean(party?.children?.some((child) => child?.slug === themeFilter));
  }, [serviceFilter, contextPath, themeFilter, liveTree, liveProducts]);

  const showAnniversaryFilterList = useMemo(() => {
    if (serviceFilter !== "decor" || contextPath[0] !== "anniversary") return false;
    const anniversary = getOccasion("anniversary");
    const types = anniversary ? childrenOf(anniversary).find((child) => child?.slug === "anniversary-types") : null;
    return Boolean(types?.children?.length);
  }, [serviceFilter, contextPath, liveTree, liveProducts]);

  useEffect(() => {
    const birthdayThemeIsValid = contextPath[0] === "birthday"
      && decorationContext?.node?.slug === "birthday"
      && Boolean((decorationContext.node.children || [])
        .find((child) => child?.slug === "birthday-types")
        ?.children?.some((child) => child?.slug === themeFilter));
    const liveBirthday = contextPath[0] === "birthday" ? getOccasion("birthday") : null;
    const liveBirthdayTypes = liveBirthday ? childrenOf(liveBirthday).find((child) => child?.slug === "birthday-types") : null;
    const liveThemeParty = liveBirthdayTypes?.children?.find((child) => child?.slug === "theme-party");
    const birthdayThemeChildIsValid = Boolean(liveThemeParty?.children?.some((child) => child?.slug === themeFilter));
    const liveAnniversary = contextPath[0] === "anniversary" ? getOccasion("anniversary") : null;
    const liveAnniversaryTypes = liveAnniversary ? childrenOf(liveAnniversary).find((child) => child?.slug === "anniversary-types") : null;
    const anniversaryTypeIsValid = Boolean(liveAnniversaryTypes?.children?.some((child) => child?.slug === themeFilter));
    const themeIsValid = themeFilter === ""
      || decorationThemeLinks.some((item) => item.slug === themeFilter)
      || birthdayThemeIsValid
      || birthdayThemeChildIsValid
      || anniversaryTypeIsValid;
    if (themeFilter && (serviceFilter !== "decor" || !themeIsValid)) {
      updateFilters({ theme: "" });
    }
  }, [themeFilter, serviceFilter, decorationThemeLinks, contextPath, decorationContext]);

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
      onChange: (value) => { setPriceFilter(value); updateFilters({ price: value }); },
      options: PRICE_BUCKETS.map((bucket) => ({ key: bucket.key, label: bucket.label })),
    },
  ], [serviceFilter, occasionFilter, functionFilter, priceFilter, serviceCategories, occasionOptions, functionOptions]);

  function resetFilters() {
    setPriceFilter("all");
    setSortKey("popular");
    updateFilters({ service: "", occasion: "", functionPath: "", theme: "", price: "all", sort: "popular" });
  }

  return (
    <>
      {decorationContext && contextPath.length === 1 && contextPath[0] === "birthday" ? (
        <>
          <BirthdayCategories />
          {/* Theme Party is a parent filter: keep the Birthday filters visible and
              list every live child theme beneath them. Choosing one filters the
              products below; the list stays so another theme can be picked. */}
          {showBirthdayThemeList && (
            <OccasionQuickLinks
              title="Birthday Themes"
              items={decorationThemeLinks}
              slider
            />
          )}
        </>
      ) : showAnniversaryFilterList ? (
        <OccasionQuickLinks
          title="Anniversary Celebrations"
          items={decorationThemeLinks}
          slider
        />
      ) : isThemePartyBrowser ? (
        <OccasionQuickLinks
          title="Birthday Themes"
          items={decorationThemeLinks}
          slider
        />
      ) : decorationContext ? (
        <OccasionQuickLinks
          title={`${decorationContext.node.label} Decoration Themes`}
          items={decorationThemeLinks}
        />
      ) : null}

      {!themeFilter && !isThemePartyBrowser && (
        <div className="occ-block" style={{ paddingTop: 0, marginTop: 0, borderTop: 0 }}>
          <div className="section-head reveal">
            <h2>All Services</h2>
            <p>Choose a service, occasion and function to see exactly what is available.</p>
          </div>
          <ListingControls
            resultCount={orderedProducts.length}
            sortKey={sortKey}
            onSortChange={(val) => { setSortKey(val); updateFilters({ sort: val }); }}
            filters={filterDescriptors}
            onReset={resetFilters}
          />
        </div>
      )}

      {!isThemePartyBrowser && orderedProducts.length > 0 && (
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

      {!loading && !isThemePartyBrowser && !orderedProducts.length && (
        <div className="occ-block">
          <div className="occ-empty reveal">
            <strong>{themeFilter ? "No decoration items match this theme." : "No services match these filters."}</strong>
            <p>{themeFilter ? "Try another decoration theme." : "Try another service, occasion, function or price range."}</p>
          </div>
        </div>
      )}

      {loading && !isThemePartyBrowser && !orderedProducts.length && (
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
  const [searchParams, setSearchParams] = useSearchParams();
  const topSlug = Array.isArray(trail) && trail.length > 0 ? trail[0].slug : null;
  const isServiceCatalog = topSlug === "event-services";

  const sortKey = searchParams.get("sort") || "popular";
  const priceFilter = searchParams.get("price") || "all";
  const cityOnly = searchParams.get("city") === "1" || searchParams.get("city") === "true";
  const topRatedOnly = searchParams.get("rating") === "1" || searchParams.get("rating") === "top" || searchParams.get("rating") === "true";

  const setSortKey = (val) => {
    const next = new URLSearchParams(searchParams);
    if (val && val !== "popular") next.set("sort", val);
    else next.delete("sort");
    setSearchParams(next, { replace: true });
  };
  const setPriceFilter = (val) => {
    const next = new URLSearchParams(searchParams);
    if (val && val !== "all") next.set("price", val);
    else next.delete("price");
    setSearchParams(next, { replace: true });
  };
  const setCityOnly = (val) => {
    const next = new URLSearchParams(searchParams);
    if (val) next.set("city", "1");
    else next.delete("city");
    setSearchParams(next, { replace: true });
  };
  const setTopRatedOnly = (val) => {
    const next = new URLSearchParams(searchParams);
    if (val) next.set("rating", "top");
    else next.delete("rating");
    setSearchParams(next, { replace: true });
  };

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
      const currentPath = normalizeCategoryPath(trail.map((item) => item.slug));
      const currentPathKey = currentPath.join("/");
      const candidates = [];

      trail.forEach((trailNode) => {
        (Array.isArray(trailNode?.products) ? trailNode.products : []).forEach((product) => {
          candidates.push(product);
        });
      });

      const seen = new Set();
      return candidates
        .filter((product) => {
          const productPathCandidates = Array.isArray(product?.categoryPaths) && product.categoryPaths.length
            ? product.categoryPaths
            : (Array.isArray(product?.categoryPath) && product.categoryPath.length ? [product.categoryPath] : []);
          if (productPathCandidates.length) {
            return productPathCandidates.some((rawPath) => {
              const productPath = normalizeCategoryPath(rawPath.filter(Boolean));
              if (!productPath.length || productPath[0] !== currentPath[0]) return false;
              // For leaf/theme node: ensure exact path match (not parent category leaking in)
              if (productPath.length < currentPath.length) return false;
              return currentPath.every((part, index) => part === productPath[index]);
            });
          }

          // Older records may only have categorySlug.
          const categorySlug = String(product?.categorySlug || "").trim();
          if (categorySlug) {
            return categorySlug === node.slug || currentPath[currentPath.length - 1] === categorySlug;
          }

          // If assigned directly on this node
          return Array.isArray(node?.products) && node.products.some((p) => (p.id && p.id === product?.id) || (p.slug && p.slug === product?.slug));
        })
        .filter((product) => {
          const key = String(product?.id || product?.slug || product?.name || currentPathKey);
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .map((product) => ({ product, trail: [...trail, product] }));
    }

    return collectProductEntries(node, trail);
  }, [node, trail]);
  const products = useMemo(() => {
    const seen = new Set();
    return productEntries
      .filter((entry) => {
        const key = String(entry?.product?.id || entry?.product?.slug || entry?.product?.name || "");
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((e) => ({ ...e.product, __trail: e.trail }));
  }, [productEntries]);
  const contextProducts = useMemo(() => {
    if (!isServiceCatalog || !serviceContextPath.length) return products;
    return products.filter((product) => serviceProductMatchesContext(product, serviceContextPath));
  }, [products, isServiceCatalog, serviceContextPath]);
  const quickLinks = useMemo(() => quickLinksFor(node, trail), [node, trail]);

  const heroImages = useMemo(() => heroGalleryFor(node, trail), [node, trail]);
  // Add-on/service blocks mount asynchronously after the first reveal pass;
  // re-run so their `.reveal` nodes never stay at opacity:0 (the blank gap).
  useReveal([node.slug, products.length]);

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
    const next = new URLSearchParams(searchParams);
    next.delete("price");
    next.delete("city");
    next.delete("rating");
    setSearchParams(next, { replace: true });
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

        {!node.addonOnly && <EventServicesSection contextPath={serviceContextPath} />}

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
