import { hasDisplayPlacement, DISPLAY_CATALOGS, normalizePlacementPath } from "./catalogPlacement";
// Pure, dependency-free service-context matching. Single source of truth for
// "does this service product belong in this occasion/function context?".
//
// Scope modes (product.serviceScopeMode):
//   "scoped"  -> explicit contexts in serviceScopes; matches ONLY those (and
//                their descendants). Empty list never matches anything.
//   "global"  -> admin explicitly made it available everywhere.
//   (absent)  -> LEGACY record saved before this field existed. Kept visible
//                with the old behaviour so the live site is not broken, but
//                it is handled separately and never applies to new saves.

export const SCOPE_MODE = Object.freeze({ SCOPED: "scoped", GLOBAL: "global", LEGACY: "legacy" });

export function slugPart(value) {
  return String(value ?? "").toLowerCase().trim()
    .replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
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
//
// Example: scope [wedding, wedding-events, sangeet, royal-sangeet] matches
// Wedding, Sangeet and Royal Sangeet, but not Bollywood Sangeet, Reception,
// Birthday or Anniversary.
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
  // This is additive: existing serviceScopes continue to work unchanged.
  if (hasDisplayPlacement(product, DISPLAY_CATALOGS.SERVICES, context)) return true;

  const mode = getScopeMode(product);

  if (mode === SCOPE_MODE.GLOBAL) return true;

  if (mode === SCOPE_MODE.SCOPED) {
    const scopes = normalizeScopeList(product.serviceScopes);
    return scopes.some((s) => isHierarchicallyRelated(s.split("/"), context)); // empty => false
  }

  // LEGACY (no mode recorded)
  const raw = legacyRawScopes(product);
  if (!raw.length) return true; // preserved: old records with no scopes stay visible
  const scopes = normalizeScopeList(raw);
  if (!scopes.length) return false; // only category paths stored -> never global
  return scopes.some((s) => legacyContains(s.split("/"), context));
}

// Decide the mode to persist on save. Throws if a NEW record has no context.

/**
 * Filter a service collection by the selected service category and event
 * context. Keeping this in the same module as the scope matcher prevents
 * storefront surfaces from implementing slightly different visibility rules.
 */
export function filterServiceProducts(products, { service = "", contextPath = [] } = {}) {
  const selectedServicePath = normalizePath(service);
  const context = normalizePath(contextPath);
  const seen = new Set();

  return (Array.isArray(products) ? products : []).filter((product) => {
    if (!product || product.status === "archived" || product.status === "draft") return false;

    const categoryPath = Array.isArray(product.categoryPath)
      ? product.categoryPath.map(slugPart).filter(Boolean)
      : [];
    const naturalService = categoryPath[0] === "event-services";
    const explicitServiceCategory = selectedServicePath.length
      ? hasDisplayPlacement(product, DISPLAY_CATALOGS.SERVICES, ["event-services", ...selectedServicePath])
      : hasDisplayPlacement(product, DISPLAY_CATALOGS.SERVICES);
    const anyServicePlacement = hasDisplayPlacement(product, DISPLAY_CATALOGS.SERVICES);
    if (!naturalService && !anyServicePlacement) return false;

    if (selectedServicePath.length) {
      if (explicitServiceCategory) return true;
      if (!naturalService) return false;
      const productServicePath = categoryPath.slice(1);
      const isSameOrDescendant = selectedServicePath.length <= productServicePath.length
        && selectedServicePath.every((part, index) => part === productServicePath[index]);
      if (!isSameOrDescendant) return false;
    }

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
