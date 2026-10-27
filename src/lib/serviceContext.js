import { hasDisplayPlacement, DISPLAY_CATALOGS, normalizeDisplayPlacements } from "./catalogPlacement";

// Pure, dependency-free service-context matching. Single source of truth for
// "does this service product belong in this occasion/function context?".

export const SCOPE_MODE = Object.freeze({ SCOPED: "scoped", GLOBAL: "global", LEGACY: "legacy" });

export const SERVICE_ALIASES = Object.freeze({
  "entry": "entry-concept",
  "entry-concept": "entry-concept",
  "entry-concepts": "entry-concept",
  "entry_concept": "entry-concept",
  "entry_concepts": "entry-concept",
  "entry concepts": "entry-concept",
  "entry concept": "entry-concept",
  "decor": "decor",
  "decorations": "decor",
  "decoration": "decor",
  "entertainment": "entertainment",
  "artist": "entertainment",
  "artists": "entertainment",
  "dj": "entertainment",
  "dj-live-bands": "entertainment",
  "live-band": "entertainment",
  "live-bands": "entertainment",
  "sound": "sound-technical",
  "lighting": "sound-technical",
  "lights": "sound-technical",
  "sfx": "sound-technical",
  "sound-technical": "sound-technical",
  "sound-and-technical": "sound-technical",
  "av-technical": "sound-technical",
  "av": "sound-technical",
  "tent": "tent-furniture",
  "furniture": "tent-furniture",
  "tent-furniture": "tent-furniture",
  "tent-and-furniture": "tent-furniture",
  "tent-furnitures": "tent-furniture",
  "photography": "photography-videography",
  "videography": "photography-videography",
  "photo": "photography-videography",
  "video": "photography-videography",
  "photography-videography": "photography-videography",
  "photography-and-videography": "photography-videography",
  "catering": "catering",
  "food": "catering",
  "baraat": "baraat-procession",
  "brass": "baraat-procession",
  "baraat-procession": "baraat-procession",
  "wedding-activity": "wedding-activity",
  "wedding-activities": "wedding-activity",
  "activities": "wedding-activity",
  "other": "other-services",
  "other-service": "other-services",
  "other-services": "other-services",
});

export function slugPart(value) {
  return String(value ?? "").toLowerCase().trim()
    .replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

export function normalizeServiceSlug(value) {
  const clean = slugPart(value);
  return SERVICE_ALIASES[clean] || clean;
}

export function normalizePath(value) {
  const parts = Array.isArray(value) ? value : String(value ?? "").split("/");
  return parts.map(slugPart).filter(Boolean);
}

export function normalizeScopeList(list) {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  const out = [];
  for (const item of list) {
    const path = normalizePath(item);
    if (!path.length || path[0] === "event-services") continue; // category paths are not contexts
    const key = path.join("/");
    if (!seen.has(key)) { seen.add(key); out.push(key); }
  }
  return out;
}

function legacyRawScopes(product) {
  if (Array.isArray(product?.serviceScopes)) return product.serviceScopes;
  if (Array.isArray(product?.scopes) && product.scopes.length) return product.scopes;
  if (Array.isArray(product?.occasions) && product.occasions.length) return product.occasions;
  if (product?.occasionSlug) return [product.occasionSlug];
  if (Array.isArray(product?.packageOccasions) && product.packageOccasions.length) return product.packageOccasions;
  return product?.scope && product.scope !== "global" ? [product.scope] : [];
}

export function getScopeMode(product) {
  const m = product?.serviceScopeMode;
  if (m === SCOPE_MODE.SCOPED || m === SCOPE_MODE.GLOBAL) return m;
  return SCOPE_MODE.LEGACY;
}

// Hierarchical context matching for explicitly scoped services. A service
// selected at a leaf must be visible while browsing that leaf, its parent
// function/category, and its top-level occasion. Conversely, selecting a
// parent makes the service available to every descendant. Two sibling
// branches never match.
function isHierarchicallyRelated(scope, context) {
  if (!scope.length || !context.length) return false;
  const shorter = scope.length <= context.length ? scope : context;
  const longer = scope.length <= context.length ? context : scope;
  return shorter.every((part, index) => part === longer[index]);
}

// Legacy-only: old records may hold relative scopes (e.g. "haldi").
function legacyContains(scope, context) {
  if (!scope.length || scope.length > context.length) return false;
  for (let s = 0; s + scope.length <= context.length; s += 1) {
    if (scope.every((p, i) => p === context[s + i])) return true;
  }
  return false;
}

export function serviceMatchesContext(product, contextPath) {
  const context = normalizePath(contextPath);
  if (!context.length) return true; // no context selected = unfiltered browse

  // A cross-listed item may be explicitly assigned to a service context.
  if (hasDisplayPlacement(product, DISPLAY_CATALOGS.SERVICES, context)) return true;
  if (hasDisplayPlacement(product, DISPLAY_CATALOGS.PRODUCTS, context)) return true;
  if (hasDisplayPlacement(product, DISPLAY_CATALOGS.PACKAGES, context)) return true;

  const mode = getScopeMode(product);

  if (mode === SCOPE_MODE.GLOBAL) return true;

  if (mode === SCOPE_MODE.SCOPED) {
    const scopes = normalizeScopeList(product.serviceScopes);
    if (scopes.some((s) => isHierarchicallyRelated(s.split("/"), context))) return true;
    const occasions = Array.isArray(product?.occasions)
      ? product.occasions
      : (product?.occasionSlug ? [product.occasionSlug] : []);
    if (occasions.some((occ) => isHierarchicallyRelated([slugPart(occ)], context))) return true;
    return false;
  }

  // LEGACY (no mode recorded)
  const raw = legacyRawScopes(product);
  if (!raw.length) return true; // preserved: old records with no scopes stay visible
  const scopes = normalizeScopeList(raw);
  if (!scopes.length) return false; // only category paths stored -> never global
  return scopes.some((s) => legacyContains(s.split("/"), context) || isHierarchicallyRelated(s.split("/"), context));
}

/**
 * Filter a service collection by the selected service category and event
 * context. Keeping this in the same module as the scope matcher prevents
 * storefront surfaces from implementing slightly different visibility rules.
 */
export function filterServiceProducts(products, { service = "", explicitServiceCategory = "", contextPath = [], context: contextAlias = [] } = {}) {
  const rawService = String(service || explicitServiceCategory || "").toLowerCase().trim();
  const canonicalServiceSlug = normalizeServiceSlug(rawService);
  const selectedServicePath = normalizePath(canonicalServiceSlug);
  const rawContext = contextPath && contextPath.length ? contextPath : contextAlias;
  const context = normalizePath(rawContext);
  const seen = new Set();

  return (Array.isArray(products) ? products : []).filter((product) => {
    if (!product || product.status === "archived" || product.status === "draft") return false;

    const kinds = Array.isArray(product.catalogKinds) && product.catalogKinds.length
      ? product.catalogKinds
      : [product.catalogKind || (product.isAddon ? "service" : "product")];

    // Collect all candidate service paths/slugs for this product
    const candidateServicePaths = [];

    // 1. serviceCategoryPath
    if (Array.isArray(product.serviceCategoryPath) && product.serviceCategoryPath.length) {
      const p = product.serviceCategoryPath.map(slugPart).filter(Boolean);
      candidateServicePaths.push(p[0] === "event-services" ? p.slice(1) : p);
    }
    // 2. categoryPath
    if (Array.isArray(product.categoryPath) && product.categoryPath.length) {
      const p = product.categoryPath.map(slugPart).filter(Boolean);
      if (p[0] === "event-services") candidateServicePaths.push(p.slice(1));
    }
    // 3. categoryPaths
    if (Array.isArray(product.categoryPaths)) {
      product.categoryPaths.forEach((cp) => {
        if (Array.isArray(cp) && cp.length) {
          const p = cp.map(slugPart).filter(Boolean);
          if (p[0] === "event-services") candidateServicePaths.push(p.slice(1));
        }
      });
    }
    // 4. displayPlacements under services
    const placements = normalizeDisplayPlacements(product.displayPlacements);
    placements.forEach((placement) => {
      if (placement.catalog === DISPLAY_CATALOGS.SERVICES && placement.path.length) {
        candidateServicePaths.push(placement.path[0] === "event-services" ? placement.path.slice(1) : placement.path);
      }
    });
    // 5. serviceCategory / categorySlug
    if (product.serviceCategory) {
      candidateServicePaths.push([slugPart(product.serviceCategory)]);
    }
    if ((kinds.includes("service") || product.isAddon) && product.categorySlug) {
      candidateServicePaths.push([slugPart(product.categorySlug)]);
    }

    const isServiceItem = candidateServicePaths.length > 0 || kinds.includes("service") || product.isAddon === true;
    if (!isServiceItem) return false;

    // Normalize candidate parts with SERVICE_ALIASES
    const normalizedCandidates = candidateServicePaths.map((parts) => parts.map(normalizeServiceSlug).filter(Boolean));

    // If a service filter was requested, verify product belongs to that service category
    if (selectedServicePath.length) {
      const matchesService = normalizedCandidates.some((cand) => {
        if (!cand.length) return false;
        return selectedServicePath.length <= cand.length
          && selectedServicePath.every((part, idx) => part === cand[idx]);
      });
      if (!matchesService) return false;
    }

    // Context filter check
    if (context.length && !serviceMatchesContext(product, context)) return false;

    const key = String(product.id || product.slug || product.name || "");
    if (key && seen.has(key)) return false;
    if (key) seen.add(key);
    return true;
  });
}

export function resolveScopeOnSave(input, existing) {
  const scopes = normalizeScopeList(input?.serviceScopes);
  if (input?.serviceScopeMode === SCOPE_MODE.GLOBAL) return { serviceScopeMode: SCOPE_MODE.GLOBAL, serviceScopes: [] };
  if (scopes.length) return { serviceScopeMode: SCOPE_MODE.SCOPED, serviceScopes: scopes };
  // Empty selection: only an already-existing global/legacy record may keep its mode.
  if (existing && getScopeMode(existing) !== SCOPE_MODE.SCOPED) {
    return { serviceScopeMode: existing.serviceScopeMode === SCOPE_MODE.GLOBAL ? SCOPE_MODE.GLOBAL : undefined, serviceScopes: [] };
  }
  throw new Error("Select at least one occasion or function where this service should appear.");
}
