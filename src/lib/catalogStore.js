// ============================================================================
// CATALOG STORE — CENTRAL DATA MANAGER FOR PRODUCTS, CATEGORIES, MEDIA,
// COUPONS, INQUIRIES, AVAILABILITY & GALLERY
// ============================================================================

import { OCCASIONS as SEED_OCCASIONS, flattenCategoryTree, categoryByPath, resolvePath, pathFor, allProductsOf } from "../data/occasions";
import { GALLERY_ITEMS as SEED_GALLERY } from "../data/categories";
import { IMAGES, CATALOG_IMAGES } from "../data/images";
import { EVENT_SERVICES } from "../data/eventServices";
import { CITIES_DATA as SEED_CITIES } from "../data/cities";
import { sanitizeText, sanitizeSlug, sanitizeUrl, sanitizeShortVideoUrl, sanitizeNumber, cleanObject } from "./sanitize";
import { queueCloudSync, syncCloudState, syncCloudStateWithConflictResolver, hydratePublicState, hydrateAdminState, waitForCloudWrites } from "./cloudStore";
import { serviceMatchesContext, resolveScopeOnSave, getScopeMode, SCOPE_MODE } from "./serviceContext";
import { normalizeDisplayPlacements, DISPLAY_CATALOGS, hasDisplayPlacement } from "./catalogPlacement";
import { uploadImageBlob, uploadImageUrl, extractManagedCloudinaryPublicId, cleanupUnusedCloudinaryAssets } from "./cloudinary";

const STORE_KEY_PREFIX = "nle_catalog_v2_";
const KEYS = {
  products: STORE_KEY_PREFIX + "products",
  occasions: STORE_KEY_PREFIX + "occasions",
  media: STORE_KEY_PREFIX + "media",
  coupons: STORE_KEY_PREFIX + "coupons",
  inquiries: STORE_KEY_PREFIX + "inquiries",
  blackouts: STORE_KEY_PREFIX + "blackouts",
  gallery: STORE_KEY_PREFIX + "gallery",
  instaVideos: STORE_KEY_PREFIX + "insta_videos",
  videoReviews: STORE_KEY_PREFIX + "video_reviews",
  cities: STORE_KEY_PREFIX + "cities",
  addons: STORE_KEY_PREFIX + "addons",
  birthdayAgeCategories: STORE_KEY_PREFIX + "birthday_age_categories",
  version: STORE_KEY_PREFIX + "version",
  demoVideosPurged: STORE_KEY_PREFIX + "demo_videos_purged",
  realShortsSeeded: STORE_KEY_PREFIX + "real_shorts_seeded",
  realShortsSeededV2: STORE_KEY_PREFIX + "real_shorts_seeded_v2",
  demoProductsPurged: STORE_KEY_PREFIX + "demo_products_purged",
  referenceHierarchyMigration: STORE_KEY_PREFIX + "reference_hierarchy_migration",
  serviceOccasionSplitV1: STORE_KEY_PREFIX + "service_occasion_split_v1",
  adminOnlyServicesV1: STORE_KEY_PREFIX + "admin_only_services_v1",
};

const STORE_VERSION = "5.0-admin-catalog-only";
const REFERENCE_HIERARCHY_MIGRATION = "3";
let seedsInitialized = false;

const DEFAULT_BIRTHDAY_AGE_CATEGORIES = [
  { id: "birthday-kids", title: "Kids Birthday", subtitle: "Age 1–12", image: CATALOG_IMAGES["kids-birthday"], href: "/occasion/birthday/birthday-types/kids-birthday", active: true, sortOrder: 1 },
  { id: "birthday-teen", title: "Teen Birthday", subtitle: "Age 13–18", image: CATALOG_IMAGES["teen-birthday"], href: "/occasion/birthday/birthday-types/teen-birthday", active: true, sortOrder: 2 },
  { id: "birthday-adult", title: "Adult Birthday", subtitle: "Age 18+", image: CATALOG_IMAGES["adult-birthday"], href: "/occasion/birthday/birthday-types/adult-birthday", active: true, sortOrder: 3 },
  { id: "birthday-milestone", title: "Milestone Birthday", subtitle: "20th, 30th, 40th, 50th", image: CATALOG_IMAGES["milestone-birthday"], href: "/occasion/birthday/birthday-types/milestone-birthday", active: true, sortOrder: 4 },
  { id: "birthday-surprise", title: "Surprise Birthday", subtitle: "Make it Special", image: CATALOG_IMAGES["surprise-birthday"], href: "/occasion/birthday/birthday-types/surprise-birthday", active: true, sortOrder: 5 },
  { id: "birthday-themes", title: "Theme Party", subtitle: "Custom Themes", image: CATALOG_IMAGES["theme-party"], href: "/occasion/birthday/birthday-types/theme-party", active: true, sortOrder: 6 },
];


// Real-photo presentation bank used for the storefront catalogue. The supplied
// reference PDF uses photographic decoration cards; these URLs keep the same
// visual role without the previous illustration assets.
const REAL_CATALOG_PHOTOS = [
  IMAGES.galWedding1, IMAGES.galWedding2, IMAGES.galWedding3,
  IMAGES.galDecor1, IMAGES.galDecor2, IMAGES.galDecor3,
  IMAGES.galBirthday1, IMAGES.galBirthday2, IMAGES.galBirthday3,
  IMAGES.galCorporate1, IMAGES.galCorporate2, IMAGES.galCorporate3,
  IMAGES.galConcert1, IMAGES.galConcert2, IMAGES.galConcert3,
];

function realCatalogImageFor(slug, variant = 0) {
  const key = String(slug || "").toLowerCase();
  let pool = REAL_CATALOG_PHOTOS;
  if (/annaprashan|newborn|naming|baby-shower|baby-welcome|baby/.test(key)) {
    pool = [IMAGES.galDecor1, IMAGES.galDecor2, IMAGES.galDecor3, IMAGES.galWedding2];
  } else if (/haldi|mehndi|ring-ceremony|reception|wedding|mandap|baraat|sangeet|anniversary|engagement/.test(key)) {
    pool = [IMAGES.galWedding1, IMAGES.galWedding2, IMAGES.galWedding3, IMAGES.galDecor1, IMAGES.galDecor2, IMAGES.galDecor3];
  } else if (/birthday|balloon|kids|princess|barbie|dinosaur|jungle|animal|frozen|superhero|horse|barbie/.test(key)) {
    pool = [IMAGES.galBirthday1, IMAGES.galBirthday2, IMAGES.galBirthday3, IMAGES.showcase4, IMAGES.showcase6, IMAGES.showcase8];
  } else if (/corporate|conference|product-launch|office/.test(key)) {
    pool = [IMAGES.galCorporate1, IMAGES.galCorporate2, IMAGES.galCorporate3];
  } else if (/concert|artist|sfx|stage|sangeet-night|fireworks|fog|pyro/.test(key)) {
    pool = [IMAGES.galConcert1, IMAGES.galConcert2, IMAGES.galConcert3, IMAGES.showcase1, IMAGES.showcase2];
  }
  return pool[Math.abs(Number(variant) || 0) % pool.length];
}

function readStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed != null ? cleanObject(parsed) : fallback;
  } catch {
    return fallback;
  }
}

// Keys ordered from largest/most-evictable to smallest. Only non-critical
// cache keys are in this list — critical catalog state (occasions, products)
// is never auto-evicted.
const EVICTABLE_KEYS_ON_QUOTA = [
  STORE_KEY_PREFIX + "media",
  STORE_KEY_PREFIX + "gallery",
  STORE_KEY_PREFIX + "insta_videos",
  STORE_KEY_PREFIX + "video_reviews",
];

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
    if (err instanceof DOMException && (err.name === "QuotaExceededError" || err.name === "NS_ERROR_DOM_QUOTA_REACHED" || err.code === 22)) {
      // Evict large non-critical caches one-by-one and retry.
      for (const evictKey of EVICTABLE_KEYS_ON_QUOTA) {
        if (evictKey === key) continue; // never evict the key we're writing
        if (localStorage.getItem(evictKey) !== null) {
          localStorage.removeItem(evictKey);
          try {
            localStorage.setItem(key, JSON.stringify(value));
            console.warn(`Storage quota freed by evicting ${evictKey}. Write succeeded for ${key}.`);
            return true;
          } catch { /* keep evicting */ }
        }
      }
    }
    console.error("Storage write error:", err);
    return false;
  }
}

// Writes triggered by an admin action: cache locally AND push to Supabase so
// every other device/browser sees the change. Kept separate from the plain
// writeStorage() used by seed/migration logic below, which must stay local
// -only so a fresh browser's demo/seed data can never overwrite real cloud
// data before the admin has even logged in.
function persist(key, value) {
  const written = writeStorage(key, value);
  if (!written) {
    // If the local write still failed after quota eviction, throw so the
    // calling admin action can surface an error instead of silently losing data.
    throw new Error("Unable to save: local storage is full. Please clear your browser cache and try again.");
  }
  queueCloudSync(key, value);
}

function reviewCountForProduct(product) {
  const key = String(product?.id || product?.slug || product?.name || "product");
  let hash = 2166136261;
  for (let i = 0; i < key.length; i += 1) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return 6 + (Math.abs(hash >>> 0) % 65);
}

function uid(prefix = "item") {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export async function hydrateCatalogFromCloud() {
  try {
    return await hydratePublicState({ versionsOnly: true });
  } catch (err) {
    // Cloud hydration is intentionally best-effort: the storefront should
    // still boot from its local/seed cache when Supabase is not configured
    // yet or the network is temporarily unavailable.
    console.warn("Cloud catalog hydration skipped:", err?.message || err);
    return null;
  }
}

export async function refreshAdminCatalogFromCloud() {
  // Do not let an explicit reload race an in-flight save. Finish pending cloud
  // writes first, then pull the current authoritative snapshot from Supabase.
  await waitForCloudWrites();
  const state = await hydrateAdminState();
  return Array.isArray(state?.nle_catalog_v2_products) ? state.nle_catalog_v2_products : getProducts();
}

let productsCacheRaw = null;
let productsCacheValue = null;
let occasionsCacheRaw = null;
let occasionsCacheValue = null;
let birthdayAgeCacheRaw = null;
let birthdayAgeCacheValue = null;
let addonsCacheRaw = null;
let addonsCacheValue = null;

export function dispatchCatalogUpdate() {
  productsCacheRaw = null;
  productsCacheValue = null;
  occasionsCacheRaw = null;
  occasionsCacheValue = null;
  birthdayAgeCacheRaw = null;
  birthdayAgeCacheValue = null;
  addonsCacheRaw = null;
  addonsCacheValue = null;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("nle-catalog-updated"));
  }
}

// -----------------------------------------------------------------------------
// SEED INITIALIZATION
// -----------------------------------------------------------------------------
function extractAllSeedProducts() {
  const products = [];
  function walk(node, occasionSlug, categorySlug) {
    if (node.products && Array.isArray(node.products)) {
      node.products.forEach((p) => {
        products.push({
          ...p,
          id: p.id || uid("prod"),
          occasionSlug: occasionSlug || node.slug,
          categorySlug: categorySlug || node.slug,
          status: "active",
          createdAt: p.dateAdded || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      });
    }
    if (node.children && Array.isArray(node.children)) {
      node.children.forEach((child) => {
        walk(child, occasionSlug || node.slug, child.slug);
      });
    }
  }
  (SEED_OCCASIONS || []).forEach((occ) => walk(occ, occ.slug, ""));
  return products;
}

function hrefToCategoryPath(href) {
  if (typeof href !== "string") return [];
  return href.replace(/^\/occasion\//, "").split("/").filter(Boolean);
}

// One-time seed of the real Shorts/video links supplied for this site's
// launch content — guarded purely by its own flag (not STORE_VERSION), so
// it always runs exactly once no matter what version state a browser is
// already in. Never overwrites anything an admin has since added/removed.
function seedRealShortsIfNeeded() {
  if (localStorage.getItem(KEYS.realShortsSeededV2)) return;

  const realShortUrls = [
    "https://www.youtube.com/shorts/a-siuy_wkx0",
    "https://www.youtube.com/shorts/H7EhkKuHGWU",
    "https://www.youtube.com/shorts/8Ll1q_CRLRA",
    "https://www.youtube.com/shorts/z-PeklpQUdI",
    "https://www.youtube.com/shorts/BLlOtkPXf9E",
  ];
  const existingShorts = readStorage(KEYS.instaVideos, []);
  const seededShorts = [
    ...existingShorts,
    ...realShortUrls.map((url) => ({
      id: uid("igv"),
      url,
      caption: "",
      thumbnail: "",
      createdAt: new Date().toISOString(),
    })),
  ];
  writeStorage(KEYS.instaVideos, seededShorts);

  const existingReviews = readStorage(KEYS.videoReviews, []);
  const seededReviews = [
    ...existingReviews,
    {
      id: uid("vrv"),
      url: "https://youtu.be/P0BoBCBKfg0",
      name: "Client Review",
      caption: "",
      thumbnail: "",
      hideControls: true,
      createdAt: new Date().toISOString(),
    },
  ];
  writeStorage(KEYS.videoReviews, seededReviews);

  // If this seed runs while an authenticated admin session exists, push the
  // launch content to Supabase as well. This prevents the public catalog
  // hydration step from replacing the seeded local content with empty cloud
  // video buckets on the first deployment. Public visitors still use the
  // local seed safely; they never write to the database.
  queueCloudSync(KEYS.instaVideos, seededShorts);
  queueCloudSync(KEYS.videoReviews, seededReviews);

  localStorage.setItem(KEYS.realShortsSeededV2, "1");
}

function normalizeReferenceStoredTree(existing) {
  if (!Array.isArray(existing)) return existing;
  const aliases = {
    "kids-special": "kids-birthday",
    "animal-themes": "animal-theme",
    "car-themes": "car-theme",
    "frozen-themes": "frozen-theme",
    "superhero-themes": "superhero-theme",
    "princess-themes": "princess-theme",
    "barbie-themes": "barbie-theme",
  };
  function walk(nodes) {
    (nodes || []).forEach((node) => {
      if (aliases[node.slug]) node.slug = aliases[node.slug];
      if (Array.isArray(node.children)) walk(node.children);
    });
  }
  const clone = JSON.parse(JSON.stringify(existing));
  walk(clone);
  // Remove duplicate siblings created by an older hierarchy version.
  function dedupe(nodes) {
    if (!Array.isArray(nodes)) return;
    const seen = new Set();
    for (let i = nodes.length - 1; i >= 0; i -= 1) {
      const key = nodes[i]?.slug;
      if (key && seen.has(key)) nodes.splice(i, 1);
      else if (key) seen.add(key);
      dedupe(nodes[i]?.children);
    }
  }
  dedupe(clone);
  return clone;
}

function initializeSeedsIfNeeded() {
  if (seedsInitialized) return;
  seedsInitialized = true;
  // Migrate featured service cards from the old global scope to explicit
  // wedding/birthday availability. Pyro/SFX is wedding-only; photography and
  // artists are useful for both occasions. This keeps the storefront separated
  // without requiring admins to rebuild their service catalog.
  if (!localStorage.getItem(KEYS.serviceOccasionSplitV1)) {
    const existingAddons = readStorage(KEYS.addons, []);
    if (Array.isArray(existingAddons) && existingAddons.length) {
      const migrated = existingAddons.map((addon) => {
        if (addon.scope !== "global" && Array.isArray(addon.scopes) && addon.scopes.length) return addon;
        const slug = String(addon.slug || "").toLowerCase();
        const weddingOnly = new Set(["sfx", "baraat-procession", "wedding-activity"]);
        const birthdayOnly = new Set(["birthday-entertainment", "kids-activities"]);
        const scopes = weddingOnly.has(slug) ? ["wedding"] : (birthdayOnly.has(slug) ? ["birthday"] : ["wedding", "birthday"]);
        return { ...addon, scopes, scope: scopes[0] };
      });
      writeStorage(KEYS.addons, migrated);
    }
    localStorage.setItem(KEYS.serviceOccasionSplitV1, "1");
  }

  // Event Services are now available across every event context by default.
  // Older builds used a broad "wedding" scope, which unintentionally hid the
  // same services on Mehndi, Reception, Engagement, Birthday, etc. Convert only
  // that exact legacy top-level scope to the global (empty) scope. Specific
  // child/theme scopes remain untouched so admins can still target services to
  // Royal Mehndi, Cinematic Sangeet, etc.
  const SERVICE_ALL_CONTEXTS_MIGRATION = "nle-service-all-contexts-v1";
  if (!localStorage.getItem(SERVICE_ALL_CONTEXTS_MIGRATION)) {
    const existingAddons = readStorage(KEYS.addons, []);
    if (Array.isArray(existingAddons) && existingAddons.length) {
      let changed = false;
      const migratedAddons = existingAddons.map((addon) => {
        const scopes = Array.isArray(addon?.scopes) ? addon.scopes.map(sanitizeScopePath).filter(Boolean) : [];
        const legacyWeddingOnly = scopes.length === 1 && scopes[0] === "wedding";
        if (!legacyWeddingOnly) return addon;
        changed = true;
        return { ...addon, scopes: [], scope: "" };
      });
      if (changed) {
        writeStorage(KEYS.addons, migratedAddons);
        queueCloudSync(KEYS.addons, migratedAddons);
      }
    }

    const existingProducts = readStorage(KEYS.products, []);
    if (Array.isArray(existingProducts) && existingProducts.length) {
      let changed = false;
      const migratedProducts = existingProducts.map((product) => {
        const isService = product?.isAddon === true
          || product?.occasionSlug === "event-services"
          || (Array.isArray(product?.categoryPath) && product.categoryPath[0] === "event-services");
        const scopes = Array.isArray(product?.serviceScopes)
          ? product.serviceScopes.map(sanitizeScopePath).filter(Boolean)
          : [];
        // Only untouched legacy records: never rewrite explicit scoped/global products.
        const legacyWeddingOnly = isService && getScopeMode(product) === SCOPE_MODE.LEGACY && scopes.length === 1 && scopes[0] === "wedding";
        if (!legacyWeddingOnly) return product;
        changed = true;
        return { ...product, serviceScopes: [] };
      });
      if (changed) {
        writeStorage(KEYS.products, migratedProducts);
        queueCloudSync(KEYS.products, migratedProducts);
      }
    }
    localStorage.setItem(SERVICE_ALL_CONTEXTS_MIGRATION, "1");
  }
  // Backward-compatible rename: Event Add-ons -> Event Services.
  // Existing admin/catalog data is kept intact when users upgrade.
  // Repair the Wedding branch in older admin catalog snapshots. Some legacy
  // snapshots kept a standalone "Services" node under Wedding even though
  // services now have their own Event Services catalog, and a migration could
  // leave both `mehndi` and an older spelling such as `mehendi` while dropping
  // `haldi`. The admin Catalog must show the canonical Wedding Events tree.
  const WEDDING_HIERARCHY_REPAIR_V1 = "nle-wedding-hierarchy-repair-v1";
  if (!localStorage.getItem(WEDDING_HIERARCHY_REPAIR_V1)) {
    const storedTree = readStorage(KEYS.occasions, []);
    if (Array.isArray(storedTree) && storedTree.length) {
      const clone = JSON.parse(JSON.stringify(storedTree));
      const wedding = clone.find((occasion) => sanitizeSlug(occasion?.slug) === "wedding");
      const seedWedding = (SEED_OCCASIONS || []).find((occasion) => sanitizeSlug(occasion?.slug) === "wedding");
      const seedEvents = seedWedding?.children?.find((node) => sanitizeSlug(node?.slug) === "wedding-events");
      const events = wedding?.children?.find((node) => sanitizeSlug(node?.slug) === "wedding-events");
      let changed = false;

      const serviceSlugs = new Set(["services", "service", "event-services", "event-add-ons", "event-addon", "addons", "add-ons"]);
      const isServiceNode = (node) => {
        const slug = sanitizeSlug(node?.slug);
        const label = String(node?.label || "").trim().toLowerCase();
        return serviceSlugs.has(slug) || label === "services" || label === "event services" || label === "event add-ons";
      };

      if (wedding?.children?.length) {
        const filtered = wedding.children.filter((node) => !isServiceNode(node));
        if (filtered.length !== wedding.children.length) {
          wedding.children = filtered;
          changed = true;
        }
      }
      if (events && Array.isArray(events.children)) {
        const aliases = {
          mehendi: "mehndi",
          mehandi: "mehndi",
          "mehndi-decor": "mehndi",
          "haldi-ceremony": "haldi",
        };
        const mergeNodes = (target, source) => {
          if (!target || !source || target === source) return;
          if (!target.image && source.image) target.image = source.image;
          if (!target.description && source.description) target.description = source.description;
          if (!target.tagline && source.tagline) target.tagline = source.tagline;
          const targetChildren = Array.isArray(target.children) ? target.children : (target.children = []);
          const targetProducts = Array.isArray(target.products) ? target.products : (target.products = []);
          const childKeys = new Set(targetChildren.map((child) => sanitizeSlug(child?.slug)));
          (source.children || []).forEach((child) => {
            const key = sanitizeSlug(child?.slug);
            if (key && !childKeys.has(key)) {
              targetChildren.push(child);
              childKeys.add(key);
            }
          });
          const productKeys = new Set(targetProducts.map((product) => product?.id || product?.slug));
          (source.products || []).forEach((product) => {
            const key = product?.id || product?.slug;
            if (key && !productKeys.has(key)) {
              targetProducts.push(product);
              productKeys.add(key);
            }
          });
        };

        const canonicalBySlug = new Map();
        const repairedChildren = [];
        events.children.forEach((node) => {
          if (isServiceNode(node)) {
            changed = true;
            return;
          }
          const rawSlug = sanitizeSlug(node?.slug);
          const canonicalSlug = aliases[rawSlug] || rawSlug;
          if (!canonicalSlug) return;
          const existing = canonicalBySlug.get(canonicalSlug);
          if (existing) {
            mergeNodes(existing, node);
            changed = true;
            return;
          }
          if (node.slug !== canonicalSlug) {
            node.slug = canonicalSlug;
            if (canonicalSlug === "mehndi") node.label = "Mehndi";
            if (canonicalSlug === "haldi") node.label = "Haldi";
            changed = true;
          }
          canonicalBySlug.set(canonicalSlug, node);
          repairedChildren.push(node);
        });

        // Restore only missing canonical Wedding Events categories from the
        // existing seed hierarchy; never replace an admin-managed node.
        (seedEvents?.children || []).forEach((seedNode) => {
          const slug = sanitizeSlug(seedNode?.slug);
          if (!slug || canonicalBySlug.has(slug)) return;
          repairedChildren.push(JSON.parse(JSON.stringify(seedNode)));
          canonicalBySlug.set(slug, repairedChildren[repairedChildren.length - 1]);
          changed = true;
        });

        const canonicalOrder = (seedEvents?.children || []).map((node) => sanitizeSlug(node?.slug)).filter(Boolean);
        repairedChildren.sort((a, b) => {
          const ai = canonicalOrder.indexOf(sanitizeSlug(a?.slug));
          const bi = canonicalOrder.indexOf(sanitizeSlug(b?.slug));
          return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
        });
        if (JSON.stringify(events.children) !== JSON.stringify(repairedChildren)) {
          events.children = repairedChildren;
          changed = true;
        }
      }

      if (changed) {
        writeStorage(KEYS.occasions, clone);
        queueCloudSync(KEYS.occasions, clone);
      }
    }
    localStorage.setItem(WEDDING_HIERARCHY_REPAIR_V1, "1");
  }

  const serviceRenameKeys = [KEYS.occasions, KEYS.products, KEYS.addons];
  serviceRenameKeys.forEach((key) => {
    const raw = localStorage.getItem(key);
    if (!raw) return;
    try {
      const value = JSON.parse(raw);
      const renamed = JSON.parse(JSON.stringify(value).replaceAll("event-add-ons", "event-services"));
      localStorage.setItem(key, JSON.stringify(renamed));
    } catch {
      // Leave malformed/unknown storage untouched; normal validation handles it later.
    }
  });


  // Mayra & Rituals are one wedding-function category. Older catalog versions
  // accidentally stored the same branch twice under separate slugs (maira/mayra
  // and rituals), which made the admin context picker show duplicate functions.
  // Merge those legacy branches into the single canonical `mayra-and-rituals`
  // branch while preserving products, children, and existing service scopes.
  const MAYRA_RITUALS_MERGE_MIGRATION = "nle-mayra-rituals-merge-v1";
  if (!localStorage.getItem(MAYRA_RITUALS_MERGE_MIGRATION)) {
    const MAYRA_ALIASES = new Set(["maira", "mayra", "rituals", "mayra-and-rituals"]);
    const CHILD_ALIASES = {
      "traditional-rituals": "traditional-mayra",
      "colorful-rituals": "colorful-mayra",
      "floral-rituals": "floral-mayra",
      "rajasthani-rituals": "rajasthani-mayra",
      "theme-based-rituals": "theme-based-mayra",
      "traditional-maira": "traditional-mayra",
      "colorful-maira": "colorful-mayra",
      "floral-maira": "floral-mayra",
      "rajasthani-maira": "rajasthani-mayra",
      "theme-based-maira": "theme-based-mayra",
    };

    const mergeNode = (target, source) => {
      if (!source || source === target) return target;
      if (!target.label && source.label) target.label = source.label;
      if (!target.image && source.image) target.image = source.image;
      if (!target.description && source.description) target.description = source.description;
      const targetChildren = Array.isArray(target.children) ? target.children : (target.children = []);
      const targetProducts = Array.isArray(target.products) ? target.products : (target.products = []);
      const productIds = new Set(targetProducts.map((product) => product?.id || product?.slug || JSON.stringify(product)));
      (source.products || []).forEach((product) => {
        const id = product?.id || product?.slug || JSON.stringify(product);
        if (!productIds.has(id)) { targetProducts.push(product); productIds.add(id); }
      });
      (source.children || []).forEach((child) => {
        const canonicalSlug = CHILD_ALIASES[sanitizeSlug(child?.slug)] || sanitizeSlug(child?.slug);
        if (!canonicalSlug) return;
        child.slug = canonicalSlug;
        const existing = targetChildren.find((candidate) => sanitizeSlug(candidate?.slug) === canonicalSlug);
        if (existing) mergeNode(existing, child);
        else targetChildren.push(child);
      });
      if (!targetProducts.length) delete target.products;
      return target;
    };

    const mergeMayraRituals = (tree) => {
      if (!Array.isArray(tree)) return { tree, changed: false };
      const clone = JSON.parse(JSON.stringify(tree));
      let changed = false;
      const wedding = clone.find((occasion) => sanitizeSlug(occasion?.slug) === "wedding");
      const weddingEvents = wedding?.children?.find((node) => sanitizeSlug(node?.slug) === "wedding-events");
      if (weddingEvents && Array.isArray(weddingEvents.children)) {
        const legacyNodes = weddingEvents.children.filter((node) => MAYRA_ALIASES.has(sanitizeSlug(node?.slug)));
        if (legacyNodes.length > 0) {
          const needsMerge = legacyNodes.length > 1 || legacyNodes.some((node) => sanitizeSlug(node?.slug) !== "mayra-and-rituals");
          const canonical = legacyNodes.find((node) => sanitizeSlug(node?.slug) === "mayra-and-rituals") || legacyNodes[0];
          canonical.slug = "mayra-and-rituals";
          canonical.label = "Mayra and Rituals";
          legacyNodes.forEach((node) => { if (node !== canonical) mergeNode(canonical, node); });
          weddingEvents.children = weddingEvents.children.filter((node) => !MAYRA_ALIASES.has(sanitizeSlug(node?.slug)) || node === canonical);
          const canonicalIndex = weddingEvents.children.indexOf(canonical);
          if (canonicalIndex > -1) {
            weddingEvents.children.splice(canonicalIndex, 1);
            weddingEvents.children.push(canonical);
          }
          changed = needsMerge;
        }
      }
      return { tree: clone, changed };
    };

    const currentTree = readStorage(KEYS.occasions, []);
    const merged = mergeMayraRituals(currentTree);
    if (merged.changed) {
      writeStorage(KEYS.occasions, merged.tree);
      queueCloudSync(KEYS.occasions, merged.tree);
    }

    const normalizeMayraPath = (value) => {
      const parts = sanitizeScopePath(value).split("/").filter(Boolean);
      return parts.map((part) => {
        if (MAYRA_ALIASES.has(part)) return "mayra-and-rituals";
        return CHILD_ALIASES[part] || part;
      }).join("/");
    };

    const existingProducts = readStorage(KEYS.products, []);
    if (Array.isArray(existingProducts) && existingProducts.length) {
      let changed = false;
      const migratedProducts = existingProducts.map((product) => {
        let next = product;
        if (Array.isArray(product?.serviceScopes)) {
          const scopes = Array.from(new Set(product.serviceScopes.map(normalizeMayraPath).filter(Boolean)));
          if (JSON.stringify(scopes) !== JSON.stringify(product.serviceScopes)) { next = { ...next, serviceScopes: scopes }; changed = true; }
        }
        if (Array.isArray(product?.categoryPath)) {
          const path = product.categoryPath.map((part) => CHILD_ALIASES[sanitizeSlug(part)] || (MAYRA_ALIASES.has(sanitizeSlug(part)) ? "mayra-and-rituals" : part));
          if (JSON.stringify(path) !== JSON.stringify(product.categoryPath)) { next = { ...next, categoryPath: path }; changed = true; }
        }
        return next;
      });
      if (changed) { writeStorage(KEYS.products, migratedProducts); queueCloudSync(KEYS.products, migratedProducts); }
    }

    const existingAddons = readStorage(KEYS.addons, []);
    if (Array.isArray(existingAddons) && existingAddons.length) {
      let changed = false;
      const migratedAddons = existingAddons.map((addon) => {
        const scopes = Array.isArray(addon?.scopes) ? Array.from(new Set(addon.scopes.map(normalizeMayraPath).filter(Boolean))) : [];
        const scope = addon?.scope ? normalizeMayraPath(addon.scope) : addon?.scope;
        const categoryPath = Array.isArray(addon?.categoryPath)
          ? addon.categoryPath.map((part) => CHILD_ALIASES[sanitizeSlug(part)] || (MAYRA_ALIASES.has(sanitizeSlug(part)) ? "mayra-and-rituals" : part))
          : addon?.categoryPath;
        const next = { ...addon };
        if (JSON.stringify(scopes) !== JSON.stringify(addon.scopes || [])) { next.scopes = scopes; changed = true; }
        if (scope !== addon?.scope) { next.scope = scope; changed = true; }
        if (JSON.stringify(categoryPath) !== JSON.stringify(addon?.categoryPath)) { next.categoryPath = categoryPath; changed = true; }
        return next;
      });
      if (changed) { writeStorage(KEYS.addons, migratedAddons); queueCloudSync(KEYS.addons, migratedAddons); }
    }

    localStorage.setItem(MAYRA_RITUALS_MERGE_MIGRATION, "1");
  }

  // Canonical Event Services structure (data-only migration; no UI changes).
  // There is one Event Services page with exactly ten top-level service
  // categories. Older builds stored some of these as nested categories or
  // used temporary names such as "Entry", "Brass", or "Baraat Procession".
  const SERVICE_STRUCTURE_MIGRATION = "nle-service-structure-v4";
  if (localStorage.getItem(SERVICE_STRUCTURE_MIGRATION) !== "1") {
    const canonical = [
      ["decor", "Décor"],
      ["entry-concept", "Entry Concept"],
      ["entertainment", "Entertainment"],
      ["sound-technical", "Sound & Technical"],
      ["tent-furniture", "Tent & Furniture"],
      ["photography-videography", "Photography & Videography"],
      ["catering", "Catering"],
      ["baraat-procession", "Baraat / Procession"],
      ["wedding-activity", "Wedding Activity"],
      ["other-services", "Other Services"],
    ];
    const canonicalSlugs = new Set(canonical.map(([slug]) => slug));
    const aliases = {
      entry: "entry-concept",
      "entry-concept": "entry-concept",
      brass: "baraat-procession",
      baraat: "baraat-procession",
      "baraat-procession": "baraat-procession",
      artists: "entertainment",
      "dj-live-bands": "entertainment",
      "wedding-activity": "wedding-activity",
      "other": "other-services",
      "other-services": "other-services",
      "other-service": "other-services",
      sfx: "sound-technical",
      sound: "sound-technical",
      lighting: "sound-technical",
      "av-technical": "sound-technical",
      photography: "photography-videography",
      videography: "photography-videography",
      "tent-and-furniture": "tent-furniture",
      "tent-furnitures": "tent-furniture",
    };
    const descriptions = {
      decor: "Decoration packages, backdrops, stages and styling.",
      "entry-concept": "Grand and unique event entries.",
      entertainment: "Artists, DJs, live bands and guest entertainment.",
      "sound-technical": "Lighting, AV, sound and technical production.",
      "tent-furniture": "Tents, seating, tables and event furniture.",
      "photography-videography": "Photography and video coverage.",
      catering: "Food and beverage experiences for events.",
      "baraat-procession": "Dhol, band and baraat procession services.",
      "wedding-activity": "Games, rituals and guest-engagement experiences.",
      "other-services": "Additional event services that do not fit the main service categories.",
    };

    const migrateServiceTree = (tree) => {
      if (!tree || typeof tree !== "object" || tree.slug !== "event-services") return tree;
      const buckets = new Map(canonical.map(([slug]) => [slug, []]));
      const productSeen = new Set();

      const collectProducts = (node, target) => {
        if (!node || typeof node !== "object" || !target || !buckets.has(target)) return;
        const products = Array.isArray(node.products) ? node.products : [];
        products.forEach((product) => {
          const id = product?.id || `${target}:${product?.slug || product?.name || JSON.stringify(product)}`;
          if (!productSeen.has(id)) {
            productSeen.add(id);
            buckets.get(target).push(product);
          }
        });
      };

      const walk = (node, inheritedTarget = null) => {
        if (!node || typeof node !== "object") return;
        const rawSlug = sanitizeSlug(node.slug);
        // "Services" was only a legacy container. Do not turn the container
        // itself into Other Services; map its real children individually.
        const isLegacyContainer = rawSlug === "services";
        const target = isLegacyContainer
          ? inheritedTarget
          : (aliases[rawSlug] || (canonicalSlugs.has(rawSlug) ? rawSlug : (inheritedTarget || "other-services")));
        collectProducts(node, target);
        (node.children || []).forEach((child) => walk(child, target));
      };
      (tree.children || []).forEach((child) => walk(child));

      tree.children = canonical.map(([slug, label]) => ({
        id: `svc-${slug}`,
        slug,
        label,
        type: "category",
        description: descriptions[slug],
        image: (tree.children || []).find((node) => aliases[sanitizeSlug(node?.slug)] === slug || sanitizeSlug(node?.slug) === slug)?.image || "",
        children: [],
        ...(buckets.get(slug)?.length ? { products: buckets.get(slug) } : {}),
      }));
      tree.label = "Event Services";
      return tree;
    };

    const currentTree = readStorage(KEYS.occasions, []);
    const serviceTree = currentTree.find((item) => item?.slug === "event-services");
    if (serviceTree) {
      const migratedTree = JSON.parse(JSON.stringify(currentTree));
      const migratedService = migratedTree.find((item) => item?.slug === "event-services");
      migrateServiceTree(migratedService);
      writeStorage(KEYS.occasions, migratedTree);
      queueCloudSync(KEYS.occasions, migratedTree);
    }

    const existingProducts = readStorage(KEYS.products, []);
    if (Array.isArray(existingProducts) && existingProducts.length) {
      const pathMap = {
        entry: "entry-concept",
        "entry-concept": "entry-concept",
        brass: "baraat-procession",
        baraat: "baraat-procession",
        "baraat-procession": "baraat-procession",
        artists: "entertainment",
        "dj-live-bands": "entertainment",
        "wedding-activity": "wedding-activity",
        sfx: "sound-technical",
        sound: "sound-technical",
        lighting: "sound-technical",
        "av-technical": "sound-technical",
        photography: "photography-videography",
        videography: "photography-videography",
      };
      let changed = false;
      const migratedProducts = existingProducts.map((product) => {
        const path = Array.isArray(product?.categoryPath) ? product.categoryPath : [];
        if (path[0] !== "event-services" || path.length < 2) return product;
        const raw = path.slice(1).map((part) => sanitizeSlug(part)).filter(Boolean);
        const mapped = pathMap[raw[0]] || raw[0];
        if (!canonicalSlugs.has(mapped)) return product;
        const nextPath = ["event-services", mapped];
        if (JSON.stringify(nextPath) === JSON.stringify(path)) return product;
        changed = true;
        return { ...product, categoryPath: nextPath, categorySlug: mapped, occasionSlug: "event-services", isAddon: true };
      });
      if (changed) {
        writeStorage(KEYS.products, migratedProducts);
        queueCloudSync(KEYS.products, migratedProducts);
      }
    }
    localStorage.setItem(SERVICE_STRUCTURE_MIGRATION, "1");
  }

  if (!localStorage.getItem(KEYS.birthdayAgeCategories)) {
    writeStorage(KEYS.birthdayAgeCategories, JSON.parse(JSON.stringify(DEFAULT_BIRTHDAY_AGE_CATEGORIES)));
  }

  const currentVersion = localStorage.getItem(KEYS.version);
  // Keep video seeding independent from the main catalog version. Older builds
  // could already have the current store version while the separate YouTube
  // seed had never run, leaving the homepage Shorts/review sections empty.
  const videosSeeded = localStorage.getItem(KEYS.realShortsSeededV2) === "1";
  if (currentVersion === STORE_VERSION && localStorage.getItem(KEYS.referenceHierarchyMigration) === REFERENCE_HIERARCHY_MIGRATION && videosSeeded) return;

  // One-time cleanup when upgrading from an older build: earlier versions
  // auto-seeded placeholder Instagram reels and a placeholder YouTube video
  // review ("Demo Client — Sample Review" / a generic behind-the-scenes
  // reel). Those placeholder links don't belong to this business and often
  // fail to embed, which reads as "broken". Wipe them out on upgrade so the
  // homepage sections simply stay hidden until real content is added from
  // Admin → Instagram & Video Reviews — no demo content is ever reseeded.
  if (!localStorage.getItem(KEYS.demoVideosPurged)) {
    localStorage.removeItem(KEYS.instaVideos);
    localStorage.removeItem(KEYS.videoReviews);
    localStorage.setItem(KEYS.demoVideosPurged, "1");
  }

  // Start the live catalog empty. Older builds shipped demo products in localStorage;
  // clear them once so the admin can build the real catalog from scratch.
  if (!localStorage.getItem(KEYS.demoProductsPurged)) {
    localStorage.removeItem(KEYS.products);
    localStorage.setItem(KEYS.demoProductsPurged, "1");
  }

  // Seed the supplied YouTube launch content after the cleanup above. A separate
  // V2 flag prevents the old purge logic from wiping these links on upgrade.
  seedRealShortsIfNeeded();

  // Remove the old bundled Event Services branch when it is still untouched.
  // A customized/admin-created branch is preserved and can continue to sync
  // normally. This is a one-time cleanup of the old hardcoded catalog.
  const SERVICE_HARDCODED_CLEANUP = "nle-service-hardcoded-cleanup-v1";
  if (!localStorage.getItem(SERVICE_HARDCODED_CLEANUP)) {
    const currentTree = readStorage(KEYS.occasions, []);
    const currentService = currentTree.find((occasion) => occasion?.slug === "event-services");
    const bundledService = (SEED_OCCASIONS || []).find((occasion) => occasion?.slug === "event-services");
    if (currentService && bundledService && JSON.stringify(currentService) === JSON.stringify(bundledService)) {
      const cleaned = currentTree.filter((occasion) => occasion?.slug !== "event-services");
      writeStorage(KEYS.occasions, cleaned);
    }
    localStorage.setItem(SERVICE_HARDCODED_CLEANUP, "1");
  }

  // Apply the supplied reference hierarchy exactly once. Once the migration
  // marker exists, the saved catalog is the source of truth. Never merge the
  // seed tree again because doing so would resurrect categories that an admin
  // intentionally deleted (for example Annaprashan or Newborn Welcome).
  if (localStorage.getItem(KEYS.referenceHierarchyMigration) !== REFERENCE_HIERARCHY_MIGRATION) {
    // The business hierarchy is authoritative for this migration. Replace the
    // previous reference tree so the storefront and Admin Catalog use the same
    // six-category structure and nested nodes.
    // Service categories are no longer bundled into the runtime catalog. They
    // are stored in Supabase and must be managed from Admin -> Services.
    // Keep the normal occasion/category seed, but deliberately exclude the
    // event-services branch so it can never reappear as hardcoded UI data.
    const exactHierarchy = JSON.parse(JSON.stringify(SEED_OCCASIONS))
      .filter((occasion) => occasion?.slug !== "event-services");
    writeStorage(KEYS.occasions, exactHierarchy);
    writeStorage(KEYS.birthdayAgeCategories, JSON.parse(JSON.stringify(DEFAULT_BIRTHDAY_AGE_CATEGORIES)));
    localStorage.setItem(KEYS.referenceHierarchyMigration, REFERENCE_HIERARCHY_MIGRATION);
    queueCloudSync(KEYS.occasions, exactHierarchy);
    queueCloudSync(KEYS.birthdayAgeCategories, JSON.parse(JSON.stringify(DEFAULT_BIRTHDAY_AGE_CATEGORIES)));
  }

  // Refresh presentation images for the built-in hierarchy without replacing
  // admin-created category names, children or other custom fields.
  if (localStorage.getItem(KEYS.referenceHierarchyMigration) === REFERENCE_HIERARCHY_MIGRATION) {
    const currentTree = readStorage(KEYS.occasions, []);
    function refreshImages(nodes) {
      (nodes || []).forEach((node) => {
        // Never overwrite admin-configured or custom/Cloudinary images
        if (!node.image) {
          node.image = realCatalogImageFor(node.slug, 0);
        }
        refreshImages(node.children);
      });
    }
    refreshImages(currentTree);
    writeStorage(KEYS.occasions, currentTree);

    // Replace old illustration URLs on already-seeded demo/reference products,
    // while leaving admin-created products untouched.
    const storedProducts = readStorage(KEYS.products, []);
    if (Array.isArray(storedProducts) && storedProducts.length) {
      let changed = false;
      storedProducts.forEach((product, index) => {
        if (!product?.isDemo || (product.image && product.image.includes("cloudinary"))) return;
        const next = realCatalogImageFor(product.categorySlug || product.occasionSlug, index);
        if (product.image !== next) {
          product.image = next;
          product.gallery = [
            next,
            realCatalogImageFor(product.categorySlug || product.occasionSlug, index + 1),
            realCatalogImageFor(product.categorySlug || product.occasionSlug, index + 2),
          ];
          changed = true;
        }
      });
      if (changed) writeStorage(KEYS.products, storedProducts);
    }
  }

  // Products/packages are admin-owned data only. The old build seeded reference
  // products into the browser, which made the storefront appear to have a
  // hardcoded catalog. Keep the product bucket empty unless it came from the
  // admin/cloud catalog. Remove only known legacy seed records on upgrade;
  // never delete real admin-created products.
  {
    const storedProducts = readStorage(KEYS.products, []);
    const cleanedProducts = Array.isArray(storedProducts)
      ? storedProducts.filter((product) => {
          const id = String(product?.id || "");
          return !product?.isDemo && !id.startsWith("demo-prod-");
        })
      : [];
    if (!localStorage.getItem(KEYS.products) || JSON.stringify(cleanedProducts) !== JSON.stringify(storedProducts)) {
      writeStorage(KEYS.products, cleanedProducts);
    }
  }

  // Migrate any older service products into the explicit service namespace so
  // the normal Products & Packages screen can safely hide them.
  {
    const stored = readStorage(KEYS.products, []);
    let changed = false;
    stored.forEach((product) => {
      const addon = product?.occasionSlug === "event-services" || (Array.isArray(product?.categoryPath) && product.categoryPath[0] === "event-services");
      if (addon && !product.isAddon) { product.isAddon = true; changed = true; }
    });
    if (changed) writeStorage(KEYS.products, stored);
  }
  // Event Services categories remain available, but sellable service products
  // must also be created/managed by Admin. Never seed them into the product bucket.

  // Initialize Media
  if (!localStorage.getItem(KEYS.media)) {
    const seedMedia = Object.entries(IMAGES).slice(0, 30).map(([key, url]) => ({
      id: uid("img"),
      title: key.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase()),
      url,
      alt: key,
      tags: ["seed", key.startsWith("hero") ? "banner" : "package"],
      createdAt: new Date().toISOString(),
    }));
    writeStorage(KEYS.media, seedMedia);
  }

  // Initialize Gallery
  if (!localStorage.getItem(KEYS.gallery)) {
    writeStorage(KEYS.gallery, SEED_GALLERY.map((g) => ({ ...g, id: uid("gal") })));
  }

  // Shorts rail (YouTube Shorts) is shown above Customer Reviews and review
  // videos are shown below Customer Reviews. Real launch links are seeded once
  // by seedRealShortsIfNeeded(); admins can then edit/delete them normally.

  // Initialize Service Cities (coverage + pricing multiplier + on/off switch)
  if (!localStorage.getItem(KEYS.cities)) {
    writeStorage(
      KEYS.cities,
      SEED_CITIES.map((c) => ({ ...c, active: true }))
    );
  }

  // Event Services are admin-owned data only. Older builds seeded featured
  // service cards locally, which could make the storefront look populated
  // before the admin had created any real service products. Purge only the
  // known launch seed slugs once; future service cards come exclusively from
  // the admin catalog.
  if (!localStorage.getItem(KEYS.adminOnlyServicesV1)) {
    const legacySeedSlugs = new Set([
      "sfx", "artists", "photography", "birthday-entertainment",
      "kids-activities", "wedding-activity", "baraat-procession",
    ]);
    const existing = readStorage(KEYS.addons, []);
    if (Array.isArray(existing)) {
      const cleaned = existing.filter((addon) => !legacySeedSlugs.has(String(addon?.slug || "")));
      if (cleaned.length !== existing.length) writeStorage(KEYS.addons, cleaned);
    }
    localStorage.setItem(KEYS.adminOnlyServicesV1, "1");
  }

  // Initialize Sample Coupons
  if (!localStorage.getItem(KEYS.coupons)) {
    const sampleCoupons = [
      {
        id: uid("cpn"),
        code: "WELCOME10",
        discountType: "percent",
        value: 10,
        minOrder: 10000,
        maxDiscount: 5000,
        expiryDate: "2027-12-31",
        usageLimit: 500,
        usageCount: 14,
        isActive: true,
      },
      {
        id: uid("cpn"),
        code: "FESTIVE2500",
        discountType: "flat",
        value: 2500,
        minOrder: 25000,
        maxDiscount: 2500,
        expiryDate: "2027-06-30",
        usageLimit: 200,
        usageCount: 38,
        isActive: true,
      },
    ];
    writeStorage(KEYS.coupons, sampleCoupons);
  }

  // Initialize Sample Inquiries / Leads
  if (!localStorage.getItem(KEYS.inquiries)) {
    const sampleInquiries = [
      {
        id: uid("inq"),
        name: "Vikram Malhotra",
        phone: "+91 98765 43210",
        email: "vikram.m@example.com",
        city: "Ranchi",
        eventType: "Wedding",
        eventDate: "2026-11-20",
        guestCount: "400",
        budget: "₹2,50,000",
        message: "Looking for grand reception stage setup with floral chandeliers and entryway lighting.",
        status: "new",
        adminNotes: "Requested callback after 6 PM.",
        createdAt: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
      },
      {
        id: uid("inq"),
        name: "Shreya Sen",
        phone: "+91 94311 22334",
        email: "shreya.sen@example.com",
        city: "Jamshedpur",
        eventType: "Birthday",
        eventDate: "2026-10-15",
        guestCount: "80",
        budget: "₹45,000",
        message: "First birthday celebration with pastel balloon styling and custom photo corner.",
        status: "contacted",
        adminNotes: "Shared moodboard over WhatsApp.",
        createdAt: new Date(Date.now() - 3600000 * 24 * 5).toISOString(),
      },
    ];
    writeStorage(KEYS.inquiries, sampleInquiries);
  }

  writeStorage(KEYS.version, STORE_VERSION);
}

// Ensure store is ready
initializeSeedsIfNeeded();

// =============================================================================
// 1. PRODUCTS MANAGEMENT
// =============================================================================

export function getProducts() {
  initializeSeedsIfNeeded();
  const raw = localStorage.getItem(KEYS.products) || "";
  if (productsCacheValue && productsCacheRaw === raw) return productsCacheValue;
  productsCacheRaw = raw;
  const rawProducts = readStorage(KEYS.products, []);
  const byId = new Map(rawProducts.map((product) => [String(product?.id || ""), product]));
  productsCacheValue = rawProducts.map((product) => {
    const primaryImage = sanitizeUrl(product?.image) || (Array.isArray(product?.images) && sanitizeUrl(product.images[0])) || (Array.isArray(product?.gallery) && sanitizeUrl(product.gallery[0])) || IMAGES.pkgDreamWedding;
    const gallery = Array.from(new Set([
      primaryImage,
      ...(Array.isArray(product?.images) ? product.images : []),
      ...(Array.isArray(product?.gallery) ? product.gallery : []),
    ].map((url) => sanitizeUrl(url)).filter(Boolean)));

    // Package contents reference live product IDs. Rebuild the display snapshot
    // from the current product record so renames/prices/images never become
    // stale inside an existing package. Missing products are omitted rather
    // than leaving a dead package item behind.
    const packageItems = product?.catalogKind === "package" && Array.isArray(product.packageItems)
      ? product.packageItems.map((item) => {
          const source = byId.get(String(item?.productId || item?.id || ""));
          if (!source || source.catalogKind === "package") return null;
          return {
            productId: source.id,
            id: source.id,
            name: source.name,
            qty: Math.max(1, Number(item?.qty || item?.quantity || 1)),
            price: Number(source.price) || 0,
            image: source.image || "",
          };
        }).filter(Boolean)
      : product?.packageItems;

    const categoryPaths = Array.isArray(product?.categoryPaths) && product.categoryPaths.length
      ? product.categoryPaths
      : (Array.isArray(product?.categoryPath) && product.categoryPath.length ? [product.categoryPath] : []);
    return {
      ...product,
      image: primaryImage,
      images: gallery,
      gallery,
      categoryPaths,
      ...(product?.catalogKind === "package" ? { packageItems } : {}),
    };
  });
  return productsCacheValue;
}

export function getProduct(idOrSlug) {
  const list = getProducts();
  return list.find((p) => p.id === idOrSlug || p.slug === idOrSlug) || null;
}

function getProductImageAssetIds(product) {
  const ids = new Set();
  const media = getMediaItems();
  const urls = [
    product?.image,
    ...(Array.isArray(product?.images) ? product.images : []),
    ...(Array.isArray(product?.gallery) ? product.gallery : []),
  ].filter(Boolean);

  const storedAssets = Array.isArray(product?.imageAssets) ? product.imageAssets : [];
  storedAssets.forEach((asset) => {
    const id = extractManagedCloudinaryPublicId(asset?.publicId || asset?.cloudinaryPublicId || asset?.url || "");
    if (id) ids.add(id);
  });

  if (product?.cloudinaryPublicId) {
    const id = extractManagedCloudinaryPublicId(product.cloudinaryPublicId);
    if (id) ids.add(id);
  }

  urls.forEach((url) => {
    const mediaItem = media.find((item) => String(item?.url || "") === String(url));
    const id = extractManagedCloudinaryPublicId(mediaItem?.cloudinaryPublicId || url);
    if (id) ids.add(id);
  });

  return ids;
}

function buildProductImageAssets(galleryList) {
  const media = getMediaItems();
  const assets = [];
  const seen = new Set();
  (galleryList || []).forEach((url) => {
    const mediaItem = media.find((item) => String(item?.url || "") === String(url));
    const publicId = extractManagedCloudinaryPublicId(mediaItem?.cloudinaryPublicId || url);
    if (!publicId || seen.has(publicId)) return;
    seen.add(publicId);
    assets.push({ url, publicId });
  });
  return assets;
}

function normalizeProductCategoryPaths(product, catalogKind) {
  const source = Array.isArray(product?.categoryPaths) && product.categoryPaths.length
    ? product.categoryPaths
    : (Array.isArray(product?.categoryPath) && product.categoryPath.length ? [product.categoryPath] : []);
  const normalized = source
    .filter(Array.isArray)
    .map((path) => path.map(sanitizeSlug).filter(Boolean))
    .filter((path) => path.length);
  const unique = [];
  const seen = new Set();
  normalized.forEach((path) => {
    const key = path.join("/");
    if (!seen.has(key)) { seen.add(key); unique.push(path); }
  });
  if (catalogKind === "service") return unique.slice(0, 1);
  return unique;
}

export function saveProduct(product) {
  const list = getProducts();
  const now = new Date().toISOString();
  const catalogKind = ["product", "package", "service"].includes(product?.catalogKind)
    ? product.catalogKind
    : (product?.isAddon ? "service" : "product");
  const catalogKinds = Array.from(new Set([
    ...(Array.isArray(product?.catalogKinds) ? product.catalogKinds : []),
    catalogKind,
  ].filter((kind) => ["product", "package", "service"].includes(kind))));

  if (catalogKinds.includes("package")) {
    const items = Array.isArray(product?.packageItems) ? product.packageItems : [];
    if (!items.length) throw new Error("A package must contain at least one product or service.");
    const sourceIds = new Set(list.filter((p) => p.catalogKind !== "package").map((p) => String(p.id)));
    const invalid = items.some((item) => !sourceIds.has(String(item?.productId || item?.id || "")));
    if (invalid) throw new Error("One or more package products no longer exist. Refresh the catalog and select the products again.");
  }

    const primaryImage = sanitizeUrl(product.image) || (Array.isArray(product.images) && sanitizeUrl(product.images[0])) || (Array.isArray(product.gallery) && sanitizeUrl(product.gallery[0])) || IMAGES.pkgDreamWedding;
    const galleryList = Array.from(new Set([
      primaryImage,
      ...(Array.isArray(product.images) ? product.images : []),
      ...(Array.isArray(product.gallery) ? product.gallery : []),
    ].map((url) => sanitizeUrl(url)).filter(Boolean))).slice(0, 8);

    const safeProduct = {
      ...product,
      catalogKind,
      catalogKinds,
      type: "product",
      slug: sanitizeSlug(product.slug || product.name || "package"),
      name: sanitizeText(product.name || "Untitled Package"),
      price: sanitizeNumber(product.price, 0, 10000000, 9999),
      originalPrice: product.originalPrice ? sanitizeNumber(product.originalPrice, 0, 10000000) : null,
      costPrice: product.costPrice == null || product.costPrice === "" ? null : sanitizeNumber(product.costPrice, 0, 10000000, 0),
      discountPrice: product.discountPrice == null || product.discountPrice === "" ? null : sanitizeNumber(product.discountPrice, 0, 10000000, 0),
      profitAmount: product.costPrice == null || product.costPrice === "" ? null : sanitizeNumber(product.price, 0, 10000000, 0) - sanitizeNumber(product.costPrice, 0, 10000000, 0),
      profitMarginPercent: product.costPrice == null || product.costPrice === "" || !(Number(product.price) > 0) ? null : Math.round((((sanitizeNumber(product.price, 0, 10000000, 0) - sanitizeNumber(product.costPrice, 0, 10000000, 0)) / sanitizeNumber(product.price, 0, 10000000, 1)) * 1000)) / 10,
      rating: sanitizeNumber(product.rating, 1, 5, 4.8),
      reviewCount: (() => {
        const count = Number(product.reviewCount);
        return Number.isFinite(count) && count >= 6 && count <= 70 ? Math.round(count) : reviewCountForProduct(product);
      })(),
      description: sanitizeText(product.description || ""),
      quantity: product.quantity == null || product.quantity === "" ? null : sanitizeNumber(product.quantity, 0, 100000000, 0),
      unit: sanitizeText(product.unit || ""),
      setupRequirements: sanitizeText(product.setupRequirements || ""),
      duration: sanitizeText(product.duration || ""),
      requiresTimeSlot: product.requiresTimeSlot !== false,
      image: primaryImage,
      images: galleryList,
      gallery: galleryList,
      imageAssets: buildProductImageAssets(galleryList),
    status: ["active", "draft", "archived", "featured"].includes(product.status) ? product.status : "active",
    includes: Array.isArray(product.includes) ? product.includes.map(sanitizeText).filter(Boolean) : [],
    notIncluded: Array.isArray(product.notIncluded) ? product.notIncluded.map(sanitizeText).filter(Boolean) : [],
    importantInfo: Array.isArray(product.importantInfo) ? product.importantInfo.map(sanitizeText).filter(Boolean) : [],
    addons: Array.isArray(product.addons)
      ? product.addons.map((a) => ({ name: sanitizeText(a.name), price: sanitizeNumber(a.price) }))
      : [],
    packageItems: catalogKinds.includes("package")
      ? (Array.isArray(product.packageItems) ? product.packageItems.map((item) => {
          const productId = sanitizeText(item?.productId || item?.id || "");
          const source = list.find((entry) => String(entry?.id || "") === productId);
          return source ? {
            productId: source.id,
            id: source.id,
            name: sanitizeText(source.name),
            qty: Math.max(1, sanitizeNumber(item?.qty || item?.quantity, 1, 9999, 1)),
            price: sanitizeNumber(source.price, 0, 10000000, 0),
            image: sanitizeUrl(source.image) || "",
          } : null;
        }).filter(Boolean) : [])
      : [],
    cities: Array.isArray(product.cities) ? product.cities.map(sanitizeText) : [],
    categoryPath: Array.isArray(product.categoryPath) ? product.categoryPath.map(sanitizeSlug).filter(Boolean) : [],
    categoryPaths: normalizeProductCategoryPaths(product, catalogKind),
    isAddon: Boolean(product.isAddon || product.occasionSlug === "event-services" || (Array.isArray(product.categoryPath) && product.categoryPath[0] === "event-services")),
    updatedAt: now,
  };
  if (safeProduct.categoryPaths.length) {
    safeProduct.categoryPath = safeProduct.categoryPaths[0];
    safeProduct.categorySlug = safeProduct.categoryPath[safeProduct.categoryPath.length - 1] || "";
    if (!safeProduct.occasionSlug && safeProduct.categoryPath[0]) safeProduct.occasionSlug = safeProduct.categoryPath[0];
  }

  // Category hierarchy is the source of truth. setupType is intentionally
  // ignored so legacy records cannot recreate the old flat filter.
  delete safeProduct.setupType;
  delete safeProduct.isDemo;

  // A brand-new product (no id) must never overwrite another product that
  // happens to share its slug; give it a unique slug instead.
  if (!safeProduct.id && safeProduct.slug && list.some((p) => p.slug === safeProduct.slug)) {
    let n = 2;
    while (list.some((p) => p.slug === `${safeProduct.slug}-${n}`)) n += 1;
    safeProduct.slug = `${safeProduct.slug}-${n}`;
  }
  const existingIdx = list.findIndex((p) => (safeProduct.id && p.id === safeProduct.id) || (safeProduct.slug && p.slug === safeProduct.slug));
  // Services must carry an explicit context decision. A missing/empty
  // selection on a NEW service is rejected instead of silently going global.
  if (safeProduct.isAddon || catalogKinds.includes("service")) {
    const resolved = resolveScopeOnSave(product, existingIdx !== -1 ? list[existingIdx] : null);
    safeProduct.serviceScopes = resolved.serviceScopes;
    if (resolved.serviceScopeMode) safeProduct.serviceScopeMode = resolved.serviceScopeMode;
    else delete safeProduct.serviceScopeMode;
  } else {
    safeProduct.serviceScopes = [];
    delete safeProduct.serviceScopeMode;
  }
  if (existingIdx !== -1) {
    list[existingIdx] = { ...list[existingIdx], ...safeProduct };
  } else {
    safeProduct.id = safeProduct.id || uid("prod");
    safeProduct.createdAt = now;
    list.unshift(safeProduct);
  }

  persist(KEYS.products, list);
  dispatchCatalogUpdate();
  return safeProduct;
}


// Durable admin save: localStorage is updated immediately for a responsive UI,
// then the same catalog snapshot is written to Supabase and awaited. This is
// used by the product form so a failed cloud write can never look like a
// successful save.
export async function saveProductToCloud(product) {
  const existing = product?.id ? getProduct(product.id) : null;
  const previousImageIds = getProductImageAssetIds(existing);

  const saved = saveProduct(product);
  const list = getProducts();

  // The database write must succeed before any old Cloudinary asset can be
  // considered for deletion. If the write fails, the old asset remains safe.
  await syncCloudState(KEYS.products, list);

  const nextImageIds = getProductImageAssetIds(saved);
  const obsoleteImageIds = Array.from(previousImageIds).filter((id) => !nextImageIds.has(id));

  if (obsoleteImageIds.length) {
    try {
      await cleanupUnusedCloudinaryAssets(obsoleteImageIds);
    } catch (error) {
      // A failed cleanup must never turn a successful product save into a
      // broken product. The old asset is simply left for a later cleanup.
      console.warn("Cloudinary image cleanup deferred:", error?.message || error);
    }
  }

  return saved;
}

export async function deleteProduct(idOrSlug) {
  const list = getProducts();
  const target = list.find((p) => p.id === idOrSlug || p.slug === idOrSlug);
  const targetId = String(target?.id || idOrSlug);
  const referencingPackage = list.find((p) => p.catalogKind === "package" && Array.isArray(p.packageItems) && p.packageItems.some((item) => String(item?.productId || item?.id || "") === targetId));
  if (referencingPackage) {
    throw new Error(`Cannot delete this product because it is included in package "${referencingPackage.name}". Remove it from that package first.`);
  }
  const next = list.filter((p) => p.id !== idOrSlug && p.slug !== idOrSlug);
  const result = await syncCloudStateWithConflictResolver(KEYS.products, next, (_intended, latest) => {
    const latestList = Array.isArray(latest) ? latest : [];
    const latestPackage = latestList.find((p) => p.catalogKind === "package" && Array.isArray(p.packageItems) && p.packageItems.some((item) => String(item?.productId || item?.id || "") === targetId));
    if (latestPackage) {
      throw new Error(`Cannot delete this product because it is included in package "${latestPackage.name}". Remove it from that package first.`);
    }
    // Rebase the delete operation onto the newest cloud catalog so another
    // admin's unrelated additions/edits are preserved. If the product is
    // already gone, the operation is safely idempotent.
    return latestList.filter((p) => p.id !== targetId && p.slug !== idOrSlug);
  });
  const savedList = Array.isArray(result?.data) ? result.data : next;
  writeStorage(KEYS.products, savedList);
  dispatchCatalogUpdate();
  return true;
}

export async function duplicateProduct(idOrSlug) {
  const target = getProduct(idOrSlug);
  if (!target) return null;

  const clone = {
    ...target,
    id: uid("prod"),
    slug: `${target.slug}-copy-${Date.now().toString(36).slice(-4)}`,
    name: `${target.name} (Copy)`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const saved = saveProduct(clone);
  await syncCloudState(KEYS.products, getProducts());
  return saved;
}

export async function bulkUpdateProducts(ids, updates) {
  const list = getProducts();
  let count = 0;
  const next = list.map((p) => {
    if (ids.includes(p.id) || ids.includes(p.slug)) {
      count++;
      let nextPrice = p.price;
      if (updates.priceAdjustmentPercent) {
        const factor = 1 + updates.priceAdjustmentPercent / 100;
        nextPrice = Math.max(1, Math.round(p.price * factor));
      }
      return {
        ...p,
        ...(updates.status ? { status: updates.status } : {}),
        ...(updates.categorySlug ? { categorySlug: updates.categorySlug } : {}),
        ...(updates.priceAdjustmentPercent ? { price: nextPrice } : {}),
        updatedAt: new Date().toISOString(),
      };
    }
    return p;
  });

  persist(KEYS.products, next);
  dispatchCatalogUpdate();
  await syncCloudState(KEYS.products, next);
  return count;
}

export async function bulkDeleteProducts(ids) {
  const list = getProducts();
  const selected = new Set(ids.map(String));
  const referencingPackage = list.find((p) => p.catalogKind === "package" && Array.isArray(p.packageItems) && p.packageItems.some((item) => selected.has(String(item?.productId || item?.id || ""))));
  if (referencingPackage) {
    throw new Error(`Cannot delete selected products because package "${referencingPackage.name}" still uses one of them. Remove the item from that package first.`);
  }
  const next = list.filter((p) => !selected.has(String(p.id)) && !selected.has(String(p.slug)));
  const result = await syncCloudStateWithConflictResolver(KEYS.products, next, (_intended, latest) => {
    const latestList = Array.isArray(latest) ? latest : [];
    const latestPackage = latestList.find((p) => p.catalogKind === "package" && Array.isArray(p.packageItems) && p.packageItems.some((item) => selected.has(String(item?.productId || item?.id || ""))));
    if (latestPackage) {
      throw new Error(`Cannot delete selected products because package "${latestPackage.name}" still uses one of them. Remove the item from that package first.`);
    }
    return latestList.filter((p) => !selected.has(String(p.id)) && !selected.has(String(p.slug)));
  });
  const savedList = Array.isArray(result?.data) ? result.data : next;
  writeStorage(KEYS.products, savedList);
  dispatchCatalogUpdate();
  return true;
}

// =============================================================================
// 2. OCCASIONS & CATEGORIES MANAGEMENT
// =============================================================================

export function getCategories() {
  return flattenCategoryTree();
}

function sanitizeCategoryNode(node) {
  if (!node || typeof node !== "object") return node;
  return {
    ...node,
    image: sanitizeUrl(node.image) || IMAGES.typeWedding,
    heroImg: sanitizeUrl(node.heroImg) || IMAGES.heroWedding,
    children: Array.isArray(node.children) ? node.children.map(sanitizeCategoryNode) : node.children,
  };
}

export function getBirthdayAgeCategories() {
  initializeSeedsIfNeeded();
  const raw = localStorage.getItem(KEYS.birthdayAgeCategories) || "";
  if (birthdayAgeCacheValue && birthdayAgeCacheRaw === raw) return birthdayAgeCacheValue;
  birthdayAgeCacheRaw = raw;
  const stored = raw ? readStorage(KEYS.birthdayAgeCategories, null) : null;
  const list = Array.isArray(stored) ? stored : DEFAULT_BIRTHDAY_AGE_CATEGORIES;
  const canonicalBirthdayHrefs = {
    "birthday-kids": "/occasion/birthday/birthday-types/kids-birthday",
    "birthday-fifth": "/occasion/birthday/birthday-types/milestone-birthday",
    "birthday-teen": "/occasion/birthday/birthday-types/teen-birthday",
    "birthday-adult": "/occasion/birthday/birthday-types/adult-birthday",
    "birthday-milestone": "/occasion/birthday/birthday-types/milestone-birthday",
    "birthday-surprise": "/occasion/birthday/birthday-types/surprise-birthday",
    "birthday-themes": "/occasion/birthday/birthday-types/theme-party",
  };
  const canonicalBirthdayImages = {
    "birthday-kids": CATALOG_IMAGES["kids-birthday"],
    "birthday-teen": CATALOG_IMAGES["teen-birthday"],
    "birthday-adult": CATALOG_IMAGES["adult-birthday"],
    "birthday-milestone": CATALOG_IMAGES["milestone-birthday"],
    "birthday-surprise": CATALOG_IMAGES["surprise-birthday"],
    "birthday-themes": CATALOG_IMAGES["theme-party"],
  };
  birthdayAgeCacheValue = list
    .map((item, index) => ({
      id: item.id || uid("birthday-card"),
      title: sanitizeText(item.title || "Birthday Category"),
      subtitle: sanitizeText(item.subtitle || ""),
      image: canonicalBirthdayImages[item.id] || sanitizeUrl(item.image) || CATALOG_IMAGES["kids-birthday"],
      href: canonicalBirthdayHrefs[item.id] || sanitizeUrl(item.href) || "/occasion/birthday",
      active: item.active !== false,
      sortOrder: Number.isFinite(Number(item.sortOrder)) ? Number(item.sortOrder) : index + 1,
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder);
  return birthdayAgeCacheValue;
}

export function saveBirthdayAgeCategories(items) {
  const canonicalBirthdayHrefs = {
    "birthday-kids": "/occasion/birthday/birthday-types/kids-birthday",
    "birthday-fifth": "/occasion/birthday/birthday-types/milestone-birthday",
    "birthday-teen": "/occasion/birthday/birthday-types/teen-birthday",
    "birthday-adult": "/occasion/birthday/birthday-types/adult-birthday",
    "birthday-milestone": "/occasion/birthday/birthday-types/milestone-birthday",
    "birthday-surprise": "/occasion/birthday/birthday-types/surprise-birthday",
    "birthday-themes": "/occasion/birthday/birthday-types/theme-party",
  };
  const safe = (Array.isArray(items) ? items : [])
    .map((item, index) => ({
      id: item.id || uid("birthday-card"),
      title: sanitizeText(item.title || "Birthday Category"),
      subtitle: sanitizeText(item.subtitle || ""),
      image: sanitizeUrl(item.image) || IMAGES.typeKidsBirthday,
      href: canonicalBirthdayHrefs[item.id] || sanitizeUrl(item.href) || "/occasion/birthday",
      active: item.active !== false,
      sortOrder: index + 1,
    }));
  persist(KEYS.birthdayAgeCategories, safe);
  dispatchCatalogUpdate();
  return safe;
}

export async function saveBirthdayAgeCategoriesToCloud(items) {
  const saved = saveBirthdayAgeCategories(items);
  await syncCloudState(KEYS.birthdayAgeCategories, saved);
  return saved;
}

function repairEventServiceCategoryTree() {
  const current = getOccasion("event-services");
  const baseChildren = Array.isArray(current?.children) ? current.children : [];
  const bySlug = new Map(baseChildren.map((node) => [sanitizeSlug(node?.slug), node]));
  let changed = !current;

  const children = EVENT_SERVICES.map((service) => {
    const slug = sanitizeSlug(service.slug);
    const existing = bySlug.get(slug);
    if (existing) {
      return {
        ...existing,
        slug,
        label: existing.label || service.label,
        type: existing.type || "category",
        description: existing.description || service.sub || "",
        image: existing.image || service.image || "",
        children: Array.isArray(existing.children) ? existing.children : [],
      };
    }
    changed = true;
    return {
      id: `svc-${slug}`,
      slug,
      label: service.label,
      type: "category",
      description: service.sub || "",
      image: service.image || "",
      children: [],
    };
  });

  // Event Services is intentionally a fixed ten-category catalog. Preserve
  // existing category data/products, but do not expose legacy/unknown
  // top-level service buckets alongside the canonical ten.
  if (baseChildren.length !== children.length || baseChildren.some((node, index) => sanitizeSlug(node?.slug) !== children[index]?.slug)) {
    changed = true;
  }

  const repaired = {
    ...(current || {}),
    id: current?.id || "event-services",
    slug: "event-services",
    label: current?.label || "Event Services",
    addonOnly: true,
    children,
  };

  if (changed || JSON.stringify(current?.children || []) !== JSON.stringify(children)) {
    const list = getOccasions().filter((occasion) => occasion?.slug !== "event-services");
    const next = [...list, sanitizeCategoryNode(repaired)];
    persist(KEYS.occasions, next);
    occasionsCacheValue = null;
    occasionsCacheRaw = "";
    dispatchCatalogUpdate();
  }
  return repaired;
}

export function ensureEventServiceCategoryStructure() {
  initializeSeedsIfNeeded();
  return Boolean(repairEventServiceCategoryTree());
}

export function getOccasions() {
  initializeSeedsIfNeeded();
  const raw = localStorage.getItem(KEYS.occasions) || "";
  if (occasionsCacheValue && occasionsCacheRaw === raw) return occasionsCacheValue;
  occasionsCacheRaw = raw;
  const fallback = (SEED_OCCASIONS || []).filter((occasion) => occasion?.slug !== "event-services");
  let loadedOccasions = readStorage(KEYS.occasions, fallback)
    .filter((occasion) => occasion?.slug !== "event-services" || Array.isArray(occasion?.children))
    .map(sanitizeCategoryNode);

  // Always repair the Wedding product hierarchy before returning catalog data.
  // Older one-time migrations could leave duplicate Mehndi nodes or omit Haldi.
  // The repair is intentionally idempotent and only touches the known Wedding
  // Events structure; admin-created products and custom child nodes are kept.
  {
    const wedding = loadedOccasions.find((occasion) => sanitizeSlug(occasion?.slug) === "wedding");
    const seedWedding = (SEED_OCCASIONS || []).find((occasion) => sanitizeSlug(occasion?.slug) === "wedding");
    const seedEvents = seedWedding?.children?.find((node) => sanitizeSlug(node?.slug) === "wedding-events");
    if (wedding && seedEvents) {
      const clone = JSON.parse(JSON.stringify(loadedOccasions));
      const currentWedding = clone.find((occasion) => sanitizeSlug(occasion?.slug) === "wedding");
      const isServiceNode = (node) => {
        const slug = sanitizeSlug(node?.slug);
        const label = String(node?.label || "").trim().toLowerCase();
        return new Set(["services", "service", "event-services", "event-add-ons", "event-addon", "addons", "add-ons"]).has(slug)
          || label === "services" || label === "event services" || label === "event add-ons";
      };
      let changed = false;
      if (Array.isArray(currentWedding?.children)) {
        const cleanTop = currentWedding.children.filter((node) => !isServiceNode(node));
        if (cleanTop.length !== currentWedding.children.length) { currentWedding.children = cleanTop; changed = true; }
      }
      let events = currentWedding?.children?.find((node) => sanitizeSlug(node?.slug) === "wedding-events");
      if (!events) {
        events = JSON.parse(JSON.stringify(seedEvents));
        currentWedding.children = [events, ...(currentWedding.children || [])];
        changed = true;
      }
      const aliases = { mehendi: "mehndi", mehandi: "mehndi", "mehndi-decor": "mehndi", "haldi-ceremony": "haldi" };
      const mergeNodes = (target, source) => {
        if (!target || !source || target === source) return;
        if (!target.image && source.image) target.image = source.image;
        if (!target.description && source.description) target.description = source.description;
        if (!target.tagline && source.tagline) target.tagline = source.tagline;
        const children = Array.isArray(target.children) ? target.children : (target.children = []);
        const childKeys = new Set(children.map((child) => sanitizeSlug(child?.slug)));
        (source.children || []).forEach((child) => { const key = sanitizeSlug(child?.slug); if (key && !childKeys.has(key)) { children.push(child); childKeys.add(key); } });
        const targetProducts = Array.isArray(target.products) ? target.products : (target.products = []);
        const productKeys = new Set(targetProducts.map((product) => product?.id || product?.slug));
        (source.products || []).forEach((product) => { const key = product?.id || product?.slug; if (key && !productKeys.has(key)) { targetProducts.push(product); productKeys.add(key); } });
      };
      const bySlug = new Map();
      const repaired = [];
      (events.children || []).forEach((node) => {
        if (isServiceNode(node)) { changed = true; return; }
        const raw = sanitizeSlug(node?.slug);
        const canonical = aliases[raw] || raw;
        if (!canonical) return;
        const existing = bySlug.get(canonical);
        if (existing) { mergeNodes(existing, node); changed = true; return; }
        if (node.slug !== canonical) { node.slug = canonical; changed = true; }
        if (canonical === "mehndi") node.label = "Mehndi";
        if (canonical === "haldi") node.label = "Haldi";
        bySlug.set(canonical, node);
        repaired.push(node);
      });
      (seedEvents.children || []).forEach((seedNode) => {
        const slug = sanitizeSlug(seedNode?.slug);
        if (!slug || bySlug.has(slug)) return;
        repaired.push(JSON.parse(JSON.stringify(seedNode)));
        bySlug.set(slug, repaired[repaired.length - 1]);
        changed = true;
      });
      const order = (seedEvents.children || []).map((node) => sanitizeSlug(node?.slug)).filter(Boolean);
      repaired.sort((a, b) => (order.indexOf(sanitizeSlug(a?.slug)) < 0 ? 999 : order.indexOf(sanitizeSlug(a?.slug))) - (order.indexOf(sanitizeSlug(b?.slug)) < 0 ? 999 : order.indexOf(sanitizeSlug(b?.slug))));
      if (JSON.stringify(events.children || []) !== JSON.stringify(repaired)) { events.children = repaired; changed = true; }
      if (changed) {
        loadedOccasions = clone;
        writeStorage(KEYS.occasions, loadedOccasions);
        queueCloudSync(KEYS.occasions, loadedOccasions);
      }
    }
  }

  // Birthday theme migration: older catalog versions used a separate
  // `Popular Birthday Themes` branch. Theme Party is now the canonical
  // container. Merge legacy children into Theme Party in-place, preserving
  // order (canonical themes first, newly added themes after them), and remove
  // the legacy branch. This is idempotent and requires no SQL/schema change.
  {
    const birthday = loadedOccasions.find((occasion) => sanitizeSlug(occasion?.slug) === "birthday");
    const birthdayTypes = birthday?.children?.find((node) => sanitizeSlug(node?.slug) === "birthday-types");
    const themeParty = birthdayTypes?.children?.find((node) => sanitizeSlug(node?.slug) === "theme-party");
    const legacyThemeParty = birthdayTypes?.children?.find((node) => sanitizeSlug(node?.slug) === "popular-birthday-themes");
    if (birthdayTypes && themeParty && legacyThemeParty) {
      const existing = new Map((themeParty.children || []).filter((node) => node?.slug).map((node) => [sanitizeSlug(node.slug), node]));
      const merged = Array.isArray(themeParty.children) ? [...themeParty.children] : [];
      (legacyThemeParty.children || []).forEach((node) => {
        const slug = sanitizeSlug(node?.slug);
        if (!slug || existing.has(slug)) return;
        existing.set(slug, node);
        merged.push(node);
      });
      themeParty.children = merged;
      birthdayTypes.children = birthdayTypes.children.filter((node) => node !== legacyThemeParty && sanitizeSlug(node?.slug) !== "popular-birthday-themes");
      loadedOccasions = loadedOccasions.map((occasion) => occasion?.slug === birthday?.slug ? birthday : occasion);
      writeStorage(KEYS.occasions, loadedOccasions);
      queueCloudSync(KEYS.occasions, loadedOccasions);
      occasionsCacheRaw = JSON.stringify(loadedOccasions);
    }

    // Keep existing product assignments aligned with the canonical Theme Party
    // path too. This is a data-only migration: product IDs, names, prices and
    // images are untouched. It prevents an existing product such as the one
    // attached to Iron Man from becoming orphaned after the legacy branch is
    // removed.
    const rawProducts = readStorage(KEYS.products, []);
    let productsChanged = false;
    const normalizeBirthdayThemePath = (path) => {
      if (!Array.isArray(path) || path.length === 0) return path;
      const clean = path.map(sanitizeSlug).filter(Boolean);
      if (clean[0] !== "birthday") return clean;
      if (clean[1] === "birthday-types" && clean[2] === "popular-birthday-themes") {
        productsChanged = true;
        return ["birthday", "birthday-types", "theme-party", ...clean.slice(3)];
      }
      if (clean[1] === "popular-birthday-themes") {
        productsChanged = true;
        return ["birthday", "birthday-types", "theme-party", ...clean.slice(2)];
      }
      return clean;
    };
    const migratedProducts = rawProducts.map((product) => {
      const sourcePaths = Array.isArray(product?.categoryPaths) && product.categoryPaths.length
        ? product.categoryPaths
        : (Array.isArray(product?.categoryPath) && product.categoryPath.length ? [product.categoryPath] : []);
      if (!sourcePaths.length) return product;
      const nextPaths = [];
      const seen = new Set();
      sourcePaths.forEach((path) => {
        const next = normalizeBirthdayThemePath(path);
        const key = Array.isArray(next) ? next.join("/") : "";
        if (key && !seen.has(key)) { seen.add(key); nextPaths.push(next); }
      });
      if (!nextPaths.length) return product;
      const nextPrimary = nextPaths[0];
      const samePrimary = JSON.stringify(product.categoryPath || []) === JSON.stringify(nextPrimary);
      const samePaths = JSON.stringify(product.categoryPaths || []) === JSON.stringify(nextPaths);
      if (samePrimary && samePaths) return product;
      productsChanged = true;
      return { ...product, categoryPath: nextPrimary, categoryPaths: nextPaths };
    });
    if (productsChanged) {
      writeStorage(KEYS.products, migratedProducts);
      productsCacheRaw = JSON.stringify(migratedProducts);
      productsCacheValue = null;
      queueCloudSync(KEYS.products, migratedProducts);
    }
  }

  // The public catalog has six canonical top-level occasions. Older cloud/local
  // catalog snapshots can contain only five (for example, a snapshot created
  // before Kids & Family was added). The reference hierarchy migration is
  // intentionally one-time, so those older snapshots were never repaired.
  // Restore only a missing canonical top-level occasion from the seed without
  // replacing or changing any existing admin-created data.
  const requiredPublicSlugs = [
    "wedding",
    "birthday",
    "corporate",
    "kids-family",
    "anniversary",
    "festivals-culture",
  ];
  const loadedSlugs = new Set(loadedOccasions.map((occasion) => String(occasion?.slug || "").trim()));
  let repairedOccasions = false;
  requiredPublicSlugs.forEach((slug) => {
    if (loadedSlugs.has(slug)) return;
    const seedOccasion = (SEED_OCCASIONS || []).find((occasion) => occasion?.slug === slug);
    if (!seedOccasion) return;
    loadedOccasions.push(sanitizeCategoryNode(JSON.parse(JSON.stringify(seedOccasion))));
    loadedSlugs.add(slug);
    repairedOccasions = true;
  });

  if (repairedOccasions) {
    writeStorage(KEYS.occasions, loadedOccasions);
    // If this is the admin session, make the repaired canonical occasion
    // durable in the cloud as well. Without an admin token this is a no-op.
    queueCloudSync(KEYS.occasions, loadedOccasions);
    occasionsCacheRaw = JSON.stringify(loadedOccasions);
  }

  // Top-level occasion slugs are identity keys throughout the admin UI and
  // storefront. Older/imported catalog state can contain the same occasion
  // more than once (for example two `wedding` records), which causes React
  // duplicate-key warnings and inconsistent selection state. Keep the first
  // canonical record for each slug and persist the cleaned list.
  const seenSlugs = new Set();
  const dedupedOccasions = loadedOccasions.filter((occasion) => {
    const slug = String(occasion?.slug || "").trim();
    if (!slug || seenSlugs.has(slug)) return false;
    seenSlugs.add(slug);
    return true;
  });

  if (dedupedOccasions.length !== loadedOccasions.length) {
    writeStorage(KEYS.occasions, dedupedOccasions);
    occasionsCacheRaw = JSON.stringify(dedupedOccasions);
  }

  occasionsCacheValue = dedupedOccasions;
  return occasionsCacheValue;
}

export function getOccasion(slug) {
  return getOccasions().find((o) => o.slug === slug) || null;
}

function findCategoryNodeByIdOrSlug(root, id, slug) {
  if (!root) return null;
  if ((id && root.id === id) || (!id && slug && root.slug === slug)) return root;
  for (const child of (Array.isArray(root.children) ? root.children : [])) {
    const found = findCategoryNodeByIdOrSlug(child, id, slug);
    if (found) return found;
  }
  return null;
}

function getManagedImageIdsFromValues(values = []) {
  const ids = new Set();
  values.filter(Boolean).forEach((value) => {
    const id = extractManagedCloudinaryPublicId(value);
    if (id) ids.add(id);
  });
  return ids;
}

export function saveOccasion(occasion) {
  const list = getOccasions();
  const safe = {
    ...occasion,
    slug: sanitizeSlug(occasion.slug || occasion.label || "occasion"),
    label: sanitizeText(occasion.label || "Untitled Occasion"),
    tagline: sanitizeText(occasion.tagline || ""),
    description: sanitizeText(occasion.description || ""),
    image: sanitizeUrl(occasion.image) || IMAGES.typeWedding,
    heroImg: sanitizeUrl(occasion.heroImg) || IMAGES.heroWedding,
    children: Array.isArray(occasion.children) ? occasion.children : [],
    // When true, this occasion is only ever reached via an Event Service
    // card (Admin -> Event Services) — it's excluded from Shop by Occasion,
    // the main nav, and "Related Categories" everywhere else, so
    // categories like SFX/Artists/Photography don't get mistaken for
    // regular browsable occasions.
    addonOnly: Boolean(occasion.addonOnly),
  };

  const idx = list.findIndex((o) => o.slug === safe.slug || o.id === safe.id);
  if (idx !== -1) {
    list[idx] = { ...list[idx], ...safe };
  } else {
    safe.id = safe.id || uid("occ");
    list.push(safe);
  }

  persist(KEYS.occasions, list);
  dispatchCatalogUpdate();
  return safe;
}

export function deleteOccasion(slug) {
  const list = getOccasions();
  const next = list.filter((o) => o.slug !== slug);
  persist(KEYS.occasions, next);
  dispatchCatalogUpdate();
  return true;
}

export async function saveOccasionToCloud(occasion) {
  const existing = occasion?.id || occasion?.slug ? getOccasions().find((item) => item.id === occasion.id || item.slug === occasion.slug) : null;
  const previousImageIds = getManagedImageIdsFromValues([existing?.image, existing?.heroImg]);

  const saved = saveOccasion(occasion);
  await syncCloudState(KEYS.occasions, getOccasions());

  const nextImageIds = getManagedImageIdsFromValues([saved?.image, saved?.heroImg]);
  const obsolete = Array.from(previousImageIds).filter((id) => !nextImageIds.has(id));
  if (obsolete.length) {
    try { await cleanupUnusedCloudinaryAssets(obsolete); }
    catch (error) { console.warn("Cloudinary occasion image cleanup deferred:", error?.message || error); }
  }
  return saved;
}

export async function deleteOccasionFromCloud(slug) {
  const deleted = deleteOccasion(slug);
  await syncCloudState(KEYS.occasions, getOccasions());
  return deleted;
}

export function saveCategory(parentOccasionSlug, category) {
  const occasions = getOccasions();
  const occ = occasions.find((o) => o.slug === parentOccasionSlug);
  if (!occ) return null;

  const parentPath = Array.isArray(category.parentCategoryPath)
    ? category.parentCategoryPath.map(sanitizeSlug).filter(Boolean)
    : (category.parentCategorySlug ? [sanitizeSlug(category.parentCategorySlug)] : []);
  const safeSlug = sanitizeSlug(category.slug || category.label || "category");
  const safeCat = {
    ...category,
    slug: safeSlug,
    label: sanitizeText(category.label || "New Category"),
    description: sanitizeText(category.description || ""),
    image: sanitizeUrl(category.image) || IMAGES.pkgDreamWedding,
    heroImg: sanitizeUrl(category.heroImg) || IMAGES.heroWedding,
    type: category.type || "category",
    products: Array.isArray(category.products) ? category.products : [],
  };
  // Parent metadata is used only for locating the node. It must never become
  // part of the stored catalog node itself.
  delete safeCat.parentCategorySlug;
  delete safeCat.parentCategoryPath;

  const parentCat = parentPath.length ? findCategoryByPath(occ, parentPath) : null;
  if (parentPath.length && !parentCat) return null;

  const siblings = parentCat ? (parentCat.children || []) : (occ.children || []);
  const existingById = safeCat.id ? siblings.find((node) => node.id === safeCat.id) : null;
  const existingBySlug = siblings.find((node) => node.slug === safeSlug);

  if (existingById) {
    // Preserve the node identity and its descendants while updating editable
    // fields. This makes image/name/description edits deterministic even when
    // multiple branches happen to use the same label.
    const next = { ...existingById, ...safeCat, id: existingById.id };
    const idx = siblings.indexOf(existingById);
    siblings[idx] = next;
    persist(KEYS.occasions, occasions);
    occasionsCacheValue = null;
    occasionsCacheRaw = "";
    dispatchCatalogUpdate();
    return next;
  }

  if (existingBySlug) {
    throw new Error(`A category named "${safeCat.label}" already exists at this level.`);
  }

  safeCat.id = safeCat.id || uid("cat");
  if (parentCat) {
    parentCat.children = Array.isArray(parentCat.children) ? parentCat.children : [];
    parentCat.children.push(safeCat);
  } else {
    occ.children = Array.isArray(occ.children) ? occ.children : [];
    occ.children.push(safeCat);
  }

  persist(KEYS.occasions, occasions);
  occasionsCacheValue = null;
  occasionsCacheRaw = "";
  dispatchCatalogUpdate();
  return safeCat;
}

export function deleteCategory(parentOccasionSlug, categorySlug, parentCategorySlug = null, parentCategoryPath = []) {
  const occasions = getOccasions();
  const occ = occasions.find((o) => o.slug === parentOccasionSlug);
  if (!occ) return false;

  const normalizedParentPath = Array.isArray(parentCategoryPath)
    ? parentCategoryPath.map(sanitizeSlug).filter(Boolean)
    : (parentCategorySlug ? [sanitizeSlug(parentCategorySlug)] : []);
  const parentCat = normalizedParentPath.length ? findCategoryByPath(occ, normalizedParentPath) : null;
  if (normalizedParentPath.length && !parentCat) return false;

  const siblings = parentCat ? (parentCat.children || []) : (occ.children || []);
  const target = siblings.find((node) => node.slug === categorySlug);
  if (!target) return false;

  // Never orphan real products by deleting the category that owns them. The
  // admin must move/delete those products first, which keeps the storefront
  // and future category filters consistent.
  const targetPath = [parentOccasionSlug, ...normalizedParentPath, target.slug];
  const hasProducts = getProducts().some((product) => {
    const paths = Array.isArray(product.categoryPaths) && product.categoryPaths.length
      ? product.categoryPaths
      : (Array.isArray(product.categoryPath) ? [product.categoryPath] : []);
    return paths.some((path) => targetPath.every((slug, index) => path[index] === slug));
  });
  if (hasProducts) {
    throw new Error(`Cannot delete "${target.label}" while products are assigned to this category or one of its subcategories. Move or delete those products first.`);
  }

  const idx = siblings.indexOf(target);
  siblings.splice(idx, 1);
  persist(KEYS.occasions, occasions);
  dispatchCatalogUpdate();
  return true;
}

export async function saveCategoryToCloud(parentOccasionSlug, category) {
  const occasionsBefore = getOccasions();
  const occasionBefore = occasionsBefore.find((item) => item.slug === parentOccasionSlug);
  const existing = findCategoryNodeByIdOrSlug(occasionBefore, category?.id || "", category?.slug || "");
  const previousImageIds = getManagedImageIdsFromValues([existing?.image, existing?.heroImg]);

  const saved = saveCategory(parentOccasionSlug, category);
  if (!saved) throw new Error("Unable to save category.");
  await syncCloudState(KEYS.occasions, getOccasions());

  const nextImageIds = getManagedImageIdsFromValues([saved?.image, saved?.heroImg]);
  const obsolete = Array.from(previousImageIds).filter((id) => !nextImageIds.has(id));
  if (obsolete.length) {
    try { await cleanupUnusedCloudinaryAssets(obsolete); }
    catch (error) { console.warn("Cloudinary category image cleanup deferred:", error?.message || error); }
  }
  return saved;
}

export async function deleteCategoryFromCloud(parentOccasionSlug, categorySlug, parentCategorySlug = null, parentCategoryPath = []) {
  const deleted = deleteCategory(parentOccasionSlug, categorySlug, parentCategorySlug, parentCategoryPath);
  if (!deleted) throw new Error("Unable to delete category.");
  await syncCloudState(KEYS.occasions, getOccasions());
  return deleted;
}

/**
 * Recursively finds a category by slug within an occasion.
 * Returns the category object or null if not found.
 */
function findCategoryByPath(occurrence, path = []) {
  if (!occurrence || !Array.isArray(path)) return null;
  let nodes = Array.isArray(occurrence.children) ? occurrence.children : [];
  let current = null;
  for (const slug of path) {
    current = nodes.find((node) => sanitizeSlug(node?.slug) === sanitizeSlug(slug));
    if (!current) return null;
    nodes = Array.isArray(current.children) ? current.children : [];
  }
  return current;
}

function findCategoryRecursive(occurrence, slug) {
  if (!occurrence || !occurrence.children) return null;
  const stack = [...occurrence.children];
  while (stack.length) {
    const cat = stack.pop();
    if (cat.slug === slug) return cat;
    if (cat.children && cat.children.length) stack.push(...cat.children);
  }
  return null;
}

// =============================================================================
// 3. MEDIA LIBRARY & PICTURES MANAGEMENT
// =============================================================================

export function getMediaItems() {
  initializeSeedsIfNeeded();
  return readStorage(KEYS.media, [])
    .map((item) => ({ ...item, url: sanitizeUrl(item?.url) }))
    .filter((item) => Boolean(item.url));
}

export function saveMediaItem(item) {
  const media = getMediaItems();
  const safeItem = {
    ...item,
    id: item.id || uid("img"),
    title: sanitizeText(item.title || "Untitled Image"),
    url: sanitizeUrl(item.url),
    alt: sanitizeText(item.alt || item.title || ""),
    tags: Array.isArray(item.tags) ? item.tags.map(sanitizeText) : [],
    createdAt: item.createdAt || new Date().toISOString(),
  };

  const idx = media.findIndex((m) => m.id === safeItem.id);
  if (idx !== -1) {
    media[idx] = safeItem;
  } else {
    media.unshift(safeItem);
  }

  persist(KEYS.media, media);
  dispatchCatalogUpdate();
  return safeItem;
}

export function deleteMediaItem(id) {
  const media = getMediaItems();
  const next = media.filter((m) => m.id !== id);
  persist(KEYS.media, next);
  dispatchCatalogUpdate();
  return true;
}

export async function saveMediaItemToCloud(item) {
  const input = { ...item };
  if (input.url && !/^https:\/\/res\.cloudinary\.com\//i.test(String(input.url))) {
    // URL imports are copied into Cloudinary so the catalog never depends on
    // third-party image hosts for its managed media.
    if (/^https?:\/\//i.test(String(input.url))) {
      const uploaded = await uploadImageUrl(String(input.url));
      input.url = uploaded.secure_url;
      input.cloudinaryPublicId = uploaded.public_id || "";
      input.width = uploaded.width || input.width;
      input.height = uploaded.height || input.height;
      input.fileSize = uploaded.bytes || input.fileSize;
      input.mimeType = uploaded.secure_format ? `image/${uploaded.secure_format}` : input.mimeType;
      input.tags = [...(Array.isArray(input.tags) ? input.tags : []), "cloudinary"];
    }
  }
  const saved = saveMediaItem(input);
  await syncCloudState(KEYS.media, getMediaItems());
  return saved;
}

export async function deleteMediaItemFromCloud(id) {
  const deleted = deleteMediaItem(id);
  await syncCloudState(KEYS.media, getMediaItems());
  return deleted;
}

/**
 * Safely processes an uploaded file as WebP and stores only its Cloudinary URL in the catalog.
 */
export function uploadMediaFile(file, title = "") {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error("No file selected."));
      return;
    }

    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!validTypes.includes(file.type)) {
      reject(new Error("Invalid file type. Only JPEG, PNG, WebP, and GIF images are allowed."));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      reject(new Error("Image size exceeds maximum limit of 5MB."));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const source = new Image();
      source.onload = () => {
        const maxSide = 1600;
        const scale = Math.min(1, maxSide / Math.max(source.naturalWidth || source.width, source.naturalHeight || source.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round((source.naturalWidth || source.width) * scale));
        canvas.height = Math.max(1, Math.round((source.naturalHeight || source.height) * scale));
        const ctx = canvas.getContext("2d");
        if (!ctx) { reject(new Error("Unable to process image.")); return; }
        ctx.drawImage(source, 0, 0, canvas.width, canvas.height);

        // IMPORTANT: never put image bytes/base64 into app_state. Upload the
        // optimized blob to Cloudinary first, then persist only the URL.
        canvas.toBlob(async (blob) => {
          if (!blob) {
            reject(new Error("Unable to encode image."));
            return;
          }
          try {
            const uploaded = await uploadImageBlob(blob, `${(title || file.name).replace(/[^a-z0-9_-]+/gi, "-")}.webp`);
            const mediaItem = await saveMediaItemToCloud({
              title: title || file.name.replace(/\.[^/.]+$/, ""),
              url: uploaded.secure_url,
              cloudinaryPublicId: uploaded.public_id || "",
              alt: title || file.name,
              fileSize: uploaded.bytes || blob.size,
              mimeType: uploaded.secure_format ? `image/${uploaded.secure_format}` : "image/webp",
              width: uploaded.width || canvas.width,
              height: uploaded.height || canvas.height,
              tags: ["upload", "cloudinary"],
            });
            resolve(mediaItem);
          } catch (err) {
            reject(err);
          }
        }, "image/webp", 0.82);
      };
      source.onerror = () => reject(new Error("Failed to decode image file."));
      source.src = e.target.result;
    };
    reader.onerror = () => reject(new Error("Failed to read image file."));
    reader.readAsDataURL(file);
  });
}

// =============================================================================
// 4. PUBLIC GALLERY MANAGEMENT
// =============================================================================

export function getGalleryItems() {
  initializeSeedsIfNeeded();
  return readStorage(KEYS.gallery, SEED_GALLERY)
    .map((item) => ({ ...item, img: sanitizeUrl(item?.img) }))
    .filter((item) => Boolean(item.img));
}

export function saveGalleryItem(item) {
  const gallery = getGalleryItems();
  const safe = {
    ...item,
    id: item.id || uid("gal"),
    img: sanitizeUrl(item.img),
    alt: sanitizeText(item.alt || "Gallery moment"),
    category: sanitizeText(item.category || "weddings"),
    tall: !!item.tall,
  };

  const idx = gallery.findIndex((g) => g.id === safe.id);
  if (idx !== -1) {
    gallery[idx] = safe;
  } else {
    gallery.unshift(safe);
  }

  persist(KEYS.gallery, gallery);
  dispatchCatalogUpdate();
  return safe;
}

export function deleteGalleryItem(id) {
  const gallery = getGalleryItems();
  const next = gallery.filter((g) => g.id !== id);
  persist(KEYS.gallery, next);
  dispatchCatalogUpdate();
  return true;
}

export async function uploadGalleryImageFile(file, metadata = {}) {
  if (!file) throw new Error("No file selected.");

  const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!validTypes.includes(file.type)) {
    throw new Error("Invalid file type. Only JPEG, PNG, WebP, and GIF images are allowed.");
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Image size exceeds maximum limit of 5MB.");
  }

  const blob = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const source = new Image();
      source.onload = () => {
        const maxSide = 1600;
        const scale = Math.min(1, maxSide / Math.max(source.naturalWidth || source.width, source.naturalHeight || source.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round((source.naturalWidth || source.width) * scale));
        canvas.height = Math.max(1, Math.round((source.naturalHeight || source.height) * scale));
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Unable to process image."));
          return;
        }
        ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((output) => {
          if (!output) reject(new Error("Unable to encode image."));
          else resolve(output);
        }, "image/webp", 0.82);
      };
      source.onerror = () => reject(new Error("Failed to decode image file."));
      source.src = e.target.result;
    };
    reader.onerror = () => reject(new Error("Failed to read image file."));
    reader.readAsDataURL(file);
  });

  const uploaded = await uploadImageBlob(blob, `${(metadata.alt || file.name).replace(/[^a-z0-9_-]+/gi, "-")}.webp`);
  return saveGalleryItemToCloud({
    img: uploaded.secure_url,
    alt: metadata.alt || file.name.replace(/\.[^/.]+$/, ""),
    category: metadata.category || "weddings",
    tall: !!metadata.tall,
    cloudinaryPublicId: uploaded.public_id || "",
  });
}

export async function saveGalleryItemToCloud(item) {
  const saved = saveGalleryItem(item);
  await syncCloudState(KEYS.gallery, getGalleryItems());
  return saved;
}

export async function deleteGalleryItemFromCloud(id) {
  const deleted = deleteGalleryItem(id);
  await syncCloudState(KEYS.gallery, getGalleryItems());
  return deleted;
}

// =============================================================================
// 4b. INSTAGRAM VIDEOS (shown above Customer Reviews)
// =============================================================================

export function getInstaVideos() {
  initializeSeedsIfNeeded();
  return readStorage(KEYS.instaVideos, []);
}

export function saveInstaVideo(item) {
  const list = getInstaVideos();
  const safeUrl = sanitizeShortVideoUrl(item.url);
  if (!safeUrl) throw new Error("Please paste a valid Instagram reel/post link or a YouTube (Shorts) link.");

  const safe = {
    id: item.id || uid("igv"),
    url: safeUrl,
    caption: sanitizeText(item.caption || ""),
    thumbnail: sanitizeUrl(item.thumbnail || ""),
    occasion: sanitizeText(item.occasion || ""),
    location: sanitizeText(item.location || ""),
    active: item.active !== false,
    order: Math.max(0, Number(item.order) || 0),
    createdAt: item.createdAt || new Date().toISOString(),
  };

  const idx = list.findIndex((v) => v.id === safe.id);
  if (idx !== -1) list[idx] = safe;
  else list.unshift(safe);

  persist(KEYS.instaVideos, list);
  dispatchCatalogUpdate();
  return safe;
}

export function deleteInstaVideo(id) {
  const list = getInstaVideos();
  persist(KEYS.instaVideos, list.filter((v) => v.id !== id));
  dispatchCatalogUpdate();
  return true;
}

// =============================================================================
// 4c. VIDEO REVIEWS (shown below Customer Reviews)
// =============================================================================

export function getVideoReviews() {
  initializeSeedsIfNeeded();
  return readStorage(KEYS.videoReviews, []);
}

export function saveVideoReview(item) {
  const list = getVideoReviews();
  const safeUrl = sanitizeUrl(item.url);
  if (!safeUrl) throw new Error("Please provide a valid video URL (YouTube link or direct .mp4 link).");

  const safe = {
    id: item.id || uid("vrv"),
    url: safeUrl,
    name: sanitizeText(item.name || "Happy Client"),
    caption: sanitizeText(item.caption || ""),
    thumbnail: sanitizeUrl(item.thumbnail || ""),
    occasion: sanitizeText(item.occasion || ""),
    location: sanitizeText(item.location || ""),
    active: item.active !== false,
    order: Math.max(0, Number(item.order) || 0),
    hideControls: Boolean(item.hideControls),
    createdAt: item.createdAt || new Date().toISOString(),
  };

  const idx = list.findIndex((v) => v.id === safe.id);
  if (idx !== -1) list[idx] = safe;
  else list.unshift(safe);

  persist(KEYS.videoReviews, list);
  dispatchCatalogUpdate();
  return safe;
}

export function deleteVideoReview(id) {
  const list = getVideoReviews();
  persist(KEYS.videoReviews, list.filter((v) => v.id !== id));
  dispatchCatalogUpdate();
  return true;
}

// =============================================================================
// 5. COUPONS & PROMOTIONS MANAGEMENT
// =============================================================================

export function getCoupons() {
  initializeSeedsIfNeeded();
  return readStorage(KEYS.coupons, []);
}

export function saveCoupon(coupon) {
  const list = getCoupons();
  const safe = {
    ...coupon,
    id: coupon.id || uid("cpn"),
    code: (coupon.code || "").toUpperCase().trim().replace(/[^A-Z0-9_-]/g, ""),
    discountType: coupon.discountType === "flat" ? "flat" : "percent",
    value: sanitizeNumber(coupon.value, 1, 100000, 10),
    minOrder: sanitizeNumber(coupon.minOrder, 0, 1000000, 0),
    maxDiscount: coupon.maxDiscount ? sanitizeNumber(coupon.maxDiscount, 0, 1000000) : null,
    expiryDate: coupon.expiryDate || null,
    usageLimit: sanitizeNumber(coupon.usageLimit, 0, 100000, 100),
    usageCount: sanitizeNumber(coupon.usageCount, 0, 100000, 0),
    isActive: coupon.isActive !== false,
    updatedAt: new Date().toISOString(),
  };

  const idx = list.findIndex((c) => c.id === safe.id || c.code === safe.code);
  if (idx !== -1) {
    list[idx] = { ...list[idx], ...safe };
  } else {
    list.unshift(safe);
  }

  persist(KEYS.coupons, list);
  dispatchCatalogUpdate();
  return safe;
}

export function deleteCoupon(id) {
  const list = getCoupons();
  const next = list.filter((c) => c.id !== id && c.code !== id);
  persist(KEYS.coupons, next);
  dispatchCatalogUpdate();
  return true;
}

export function validateCoupon(code, subtotal) {
  if (!code) return { valid: false, message: "Please enter a coupon code." };
  const cleanCode = code.toUpperCase().trim();
  const coupons = getCoupons();
  const coupon = coupons.find((c) => c.code === cleanCode);

  if (!coupon) return { valid: false, message: "Invalid coupon code." };
  if (!coupon.isActive) return { valid: false, message: "This coupon is no longer active." };

  if (coupon.expiryDate) {
    const expiry = new Date(coupon.expiryDate);
    expiry.setHours(23, 59, 59, 999);
    if (new Date() > expiry) return { valid: false, message: "This coupon has expired." };
  }

  if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
    return { valid: false, message: "Coupon usage limit reached." };
  }

  if (coupon.minOrder && subtotal < coupon.minOrder) {
    return {
      valid: false,
      message: `Minimum order amount of ₹${coupon.minOrder.toLocaleString("en-IN")} required for this coupon.`,
    };
  }

  let discountAmount = 0;
  if (coupon.discountType === "percent") {
    discountAmount = Math.round((subtotal * coupon.value) / 100);
    if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
      discountAmount = coupon.maxDiscount;
    }
  } else {
    discountAmount = Math.min(coupon.value, subtotal);
  }

  return {
    valid: true,
    coupon,
    discountAmount,
    message: `Applied coupon ${coupon.code}! You saved ₹${discountAmount.toLocaleString("en-IN")}.`,
  };
}

// =============================================================================
// 6. INQUIRIES & LEADS PIPELINE
// =============================================================================

export function getInquiries() {
  initializeSeedsIfNeeded();
  return readStorage(KEYS.inquiries, []);
}

export function saveInquiry(inquiry) {
  const list = getInquiries();
  const safe = {
    ...inquiry,
    id: inquiry.id || uid("inq"),
    name: sanitizeText(inquiry.name || "Anonymous Client"),
    phone: sanitizeText(inquiry.phone || ""),
    email: sanitizeText(inquiry.email || ""),
    city: sanitizeText(inquiry.city || "Ranchi"),
    eventType: sanitizeText(inquiry.eventType || "General Event"),
    eventDate: inquiry.eventDate || "",
    guestCount: sanitizeText(inquiry.guestCount || ""),
    budget: sanitizeText(inquiry.budget || ""),
    message: sanitizeText(inquiry.message || ""),
    status: ["new", "contacted", "quoted", "won", "lost"].includes(inquiry.status) ? inquiry.status : "new",
    adminNotes: sanitizeText(inquiry.adminNotes || ""),
    createdAt: inquiry.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const idx = list.findIndex((i) => i.id === safe.id);
  if (idx !== -1) {
    list[idx] = safe;
  } else {
    list.unshift(safe);
  }

  persist(KEYS.inquiries, list);
  dispatchCatalogUpdate();
  return safe;
}

export function updateInquiryStatus(id, status, notes) {
  const list = getInquiries();
  const idx = list.findIndex((i) => i.id === id);
  if (idx === -1) return null;

  list[idx].status = status;
  if (notes !== undefined) list[idx].adminNotes = sanitizeText(notes);
  list[idx].updatedAt = new Date().toISOString();

  persist(KEYS.inquiries, list);
  dispatchCatalogUpdate();
  return list[idx];
}

export function deleteInquiry(id) {
  const list = getInquiries();
  const next = list.filter((i) => i.id !== id);
  persist(KEYS.inquiries, next);
  dispatchCatalogUpdate();
  return true;
}

// =============================================================================
// 7. AVAILABILITY & BLACKOUT DATES
// =============================================================================

export function getBlackoutDates() {
  initializeSeedsIfNeeded();
  return readStorage(KEYS.blackouts, []);
}

export function toggleBlackoutDate(dateStr, note = "Fully Booked") {
  const dates = getBlackoutDates();
  const cleanDate = dateStr.trim();
  const exists = dates.find((d) => d.date === cleanDate);

  let next;
  if (exists) {
    next = dates.filter((d) => d.date !== cleanDate);
  } else {
    next = [...dates, { date: cleanDate, note: sanitizeText(note) }].sort((a, b) => a.date.localeCompare(b.date));
  }

  persist(KEYS.blackouts, next);
  dispatchCatalogUpdate();
  return next;
}

export function isDateBlackedOut(dateStr) {
  const dates = getBlackoutDates();
  return dates.some((d) => d.date === dateStr);
}

// =============================================================================
// 8. SERVICE CITIES (coverage, pricing multiplier & availability switch)
// =============================================================================

export function getCities() {
  initializeSeedsIfNeeded();
  return readStorage(KEYS.cities, SEED_CITIES.map((c) => ({ ...c, active: true })));
}

// Names only, active cities — what the public city picker / booking flow
// should offer. Falls back to every seed city if the store is unreadable,
// so a corrupt/cleared store never leaves the site with zero cities.
export function getActiveCityNames() {
  const cities = getCities();
  const active = cities.filter((c) => c.active !== false).map((c) => c.name);
  return active.length ? active : SEED_CITIES.map((c) => c.name);
}

export function saveCity(city) {
  const list = getCities();
  const safe = {
    name: sanitizeText(city.name || "").trim(),
    multiplier: sanitizeNumber(city.multiplier, 0.5, 5, 1),
    active: city.active !== false,
  };
  if (!safe.name) throw new Error("City name is required.");

  const idx = list.findIndex((c) => c.name.toLowerCase() === safe.name.toLowerCase());
  if (idx !== -1) {
    list[idx] = { ...list[idx], ...safe };
  } else {
    list.push(safe);
  }

  persist(KEYS.cities, list);
  dispatchCatalogUpdate();
  return safe;
}

export function toggleCityActive(name) {
  const list = getCities();
  const idx = list.findIndex((c) => c.name === name);
  if (idx === -1) return null;
  list[idx] = { ...list[idx], active: !(list[idx].active !== false) };
  persist(KEYS.cities, list);
  dispatchCatalogUpdate();
  return list[idx];
}

export function deleteCity(name) {
  const list = getCities();
  const next = list.filter((c) => c.name !== name);
  persist(KEYS.cities, next);
  dispatchCatalogUpdate();
  return true;
}

// =============================================================================
// 9. EVENT SERVICES ("Popular Services" strip on Shop-by-Occasion pages)
// =============================================================================

function sanitizeScopePath(value) {
  return String(value || "")
    .split("/")
    .map((part) => sanitizeSlug(part))
    .filter(Boolean)
    .join("/");
}

function normalizeAddonScopes(addon) {
  const raw = Array.isArray(addon?.scopes) && addon.scopes.length
    ? addon.scopes
    : (addon?.scope && addon.scope !== "global" ? [addon.scope] : []);
  return raw.map(sanitizeScopePath).filter(Boolean);
}

function pathIsAncestorOrSelf(scopePath, contextPath) {
  const scope = sanitizeScopePath(scopePath).split("/").filter(Boolean);
  const context = (Array.isArray(contextPath) ? contextPath : String(contextPath || "").split("/"))
    .map((part) => sanitizeSlug(part))
    .filter(Boolean);
  if (!scope.length || !context.length || scope.length > context.length) return false;

  // Service scopes may be stored as an absolute occasion path
  // (wedding/wedding-events/haldi) or as a relative event path (haldi,
  // wedding-events/haldi). Treat either representation as the same context.
  // This is important for nested pages such as Traditional Haldi, Royal Mehndi
  // and Cinematic Sangeet: a service assigned to the parent event must inherit
  // down the entire branch regardless of how the admin originally saved it.
  for (let start = 0; start + scope.length <= context.length; start += 1) {
    const matches = scope.every((part, index) => part === context[start + index]);
    if (matches) return true;
  }
  return false;
}

export function serviceProductMatchesContext(product, contextPath) {
  // Strict matching lives in ./serviceContext (explicit scoped/global/legacy
  // modes, prefix-only path match, no silent global fallback).
  return serviceMatchesContext(product, contextPath);
}

export function getServiceScopeOptions() {
  return flattenCategoryTree()
    .filter((item) => !item.addonOnly && Array.isArray(item.path) && item.path.length > 0)
    .map((item) => ({
      path: item.path.join("/"),
      label: item.label,
      productCount: item.productCount,
    }));
}

// Returns the actual admin-created decoration products and packages that are
// available for a particular occasion/category context. This is the single
// source used by the Decor storefront surface; there is deliberately no
// hardcoded fallback catalog.
export function getDecorationProductsForContext(contextPath = []) {
  const context = Array.isArray(contextPath)
    ? contextPath.map((part) => sanitizeSlug(part)).filter(Boolean)
    : String(contextPath || "").split("/").map((part) => sanitizeSlug(part)).filter(Boolean);
  if (!context.length || context[0] === "event-services") return [];

  const isRelatedPath = (path) => {
    if (!path.length) return false;
    const shorter = path.length <= context.length ? path : context;
    const longer = path.length <= context.length ? context : path;
    return shorter.every((part, index) => part === longer[index]);
  };

  return getProducts()
    // Decor is also the storefront surface for packages placed in the same
    // occasion/function/theme. Packages use the normal catalog hierarchy, so
    // they must follow the same context matching as decoration products.
    .filter((product) => {
      const kinds = Array.isArray(product?.catalogKinds) && product.catalogKinds.length
        ? product.catalogKinds
        : [product?.catalogKind || "product"];
      return kinds.includes("product") || kinds.includes("package");
    })
    .filter((product) => product?.status !== "archived" && product?.status !== "draft")
    .filter((product) => {
      const basePaths = Array.isArray(product?.categoryPaths) ? product.categoryPaths : [];
      const productPaths = Array.isArray(product?.productCategoryPaths) ? product.productCategoryPaths : [];
      const packagePaths = Array.isArray(product?.packageCategoryPaths) ? product.packageCategoryPaths : [];
      const legacyPaths = Array.isArray(product?.categoryPath) && product.categoryPath.length ? [product.categoryPath] : [];
      const legacyPackagePaths = product?.catalogKind === "package" && Array.isArray(product?.packageOccasions)
        ? product.packageOccasions.map((slug) => [slug])
        : [];
      const rawPaths = [...basePaths, ...productPaths, ...packagePaths, ...legacyPaths, ...legacyPackagePaths]
        .filter((path) => Array.isArray(path) && path.length);
      // Older festival catalog saves could omit the `festivals` wrapper and
      // store a theme as `festivals-culture/holi`. Treat that legacy path as
      // the canonical `festivals-culture/festivals/holi` path for storefront
      // matching. Do not mutate the saved record.
      const paths = rawPaths.flatMap((path) => {
        const normalized = path.map((part) => sanitizeSlug(part)).filter(Boolean);
        if (normalized[0] === "festivals-culture" && normalized[1] && !["festivals", "other-celebrations"].includes(normalized[1])) {
          return [normalized, ["festivals-culture", "festivals", ...normalized.slice(1)]];
        }
        return [normalized];
      });

      // A product can reach Decor either through its normal occasion/category
      // assignment or through an explicit cross-display placement. The latter
      // is important for decoration themes: an item may be assigned directly
      // to Floral Haldi / Boho Haldi without changing its primary category.
      const categoryMatch = paths.some((path) => {
        const normalized = Array.isArray(path) ? path.map((part) => sanitizeSlug(part)).filter(Boolean) : [];
        return normalized[0] !== "event-services" && isRelatedPath(normalized, context);
      });
      if (categoryMatch) return true;

      return hasDisplayPlacement(product, DISPLAY_CATALOGS.PRODUCTS, context)
        || hasDisplayPlacement(product, DISPLAY_CATALOGS.SERVICES, context);
    });
}

// Products belonging to ONE Birthday theme (a child of Birthday -> Birthday
// Types -> Theme Party). Matching is done on the stored category hierarchy and
// display placements, never on product names. Older saves are recognised too:
// the Birthday Types / Theme Party wrapper segments (and the legacy
// "popular-birthday-themes" wrapper) may be absent in a stored path, so they
// are skipped before comparing the theme slug. A product counts when it is a
// sellable product (kind may be recorded in catalogKind OR catalogKinds).
export function getBirthdayThemeProducts(themeSlug) {
  const slug = sanitizeSlug(themeSlug);
  if (!slug) return [];
  const WRAPPERS = new Set(["birthday-types", "theme-party", "popular-birthday-themes"]);
  const hit = (rawPath) => {
    const parts = (Array.isArray(rawPath) ? rawPath : []).map((part) => sanitizeSlug(part)).filter(Boolean);
    if (parts[0] !== "birthday") return false;
    let i = 1;
    while (i < parts.length && WRAPPERS.has(parts[i])) i += 1;
    return parts[i] === slug;
  };
  return getProducts()
    .filter((product) => {
      const kinds = Array.isArray(product?.catalogKinds) && product.catalogKinds.length
        ? product.catalogKinds
        : [product?.catalogKind || "product"];
      return (product?.catalogKind === "product" || kinds.includes("product")) && product?.isAddon !== true;
    })
    .filter((product) => product?.status !== "archived" && product?.status !== "draft")
    .filter((product) => {
      const paths = Array.isArray(product?.categoryPaths) && product.categoryPaths.length
        ? product.categoryPaths
        : (Array.isArray(product?.categoryPath) && product.categoryPath.length ? [product.categoryPath] : []);
      if (paths.some(hit)) return true;
      return normalizeDisplayPlacements(product?.displayPlacements).some((placement) =>
        (placement.catalog === DISPLAY_CATALOGS.PRODUCTS || placement.catalog === DISPLAY_CATALOGS.SERVICES)
        && hit(placement.path));
    });
}

export function getServiceProductsForContext(contextPath = []) {
  const normalizedContext = Array.isArray(contextPath)
    ? contextPath.map((part) => sanitizeSlug(part)).filter(Boolean)
    : String(contextPath || "").split("/").map((part) => sanitizeSlug(part)).filter(Boolean);
  return getProducts()
    .filter((product) => {
      const kinds = Array.isArray(product?.catalogKinds) && product.catalogKinds.length
        ? product.catalogKinds
        : [product?.catalogKind || (product?.isAddon ? "service" : "product")];
      return kinds.includes("service") || product?.isAddon === true;
    })
    .filter((product) => product?.status !== "archived" && product?.status !== "draft")
    .filter((product) => {
      const categoryPath = Array.isArray(product?.categoryPath) ? product.categoryPath : [];
      const serviceCategoryPath = Array.isArray(product?.serviceCategoryPath) ? product.serviceCategoryPath : [];
      const naturalService = categoryPath[0] === "event-services" || serviceCategoryPath[0] === "event-services";
      const crossListedService = normalizeDisplayPlacements(product?.displayPlacements).some((placement) => placement.catalog === "services");
      if (!naturalService && !crossListedService) return false;
      return serviceProductMatchesContext(product, normalizedContext);
    })
    .map((product) => ({
      id: product.id,
      name: product.name,
      price: Number(product.price) || 0,
      image: product.image,
      slug: product.slug,
      serviceType: product.serviceType || "",
      coverageDuration: product.coverageDuration || "",
      categoryPath: Array.isArray(product.serviceCategoryPath) && product.serviceCategoryPath.length ? product.serviceCategoryPath : product.categoryPath,
    }));
}

export function getAddons() {
  initializeSeedsIfNeeded();
  const raw = localStorage.getItem(KEYS.addons) || "";
  if (addonsCacheValue && addonsCacheRaw === raw) return addonsCacheValue;
  addonsCacheRaw = raw;
  const list = raw ? readStorage(KEYS.addons, []) : [];
  addonsCacheValue = list.map((addon) => enrichAddon(addon));
  return addonsCacheValue;
}

// Attaches live data derived from the linked sub-category — current
// cheapest product price, how many products it holds, the browse link,
// and whether that category still exists (an admin may have renamed or
// deleted it after this service was linked to it).
function enrichAddon(addon, contextPath = null) {
  const path = Array.isArray(addon.categoryPath) ? addon.categoryPath : [];
  const category = path.length ? categoryByPath(path) : null;
  const scopedProducts = category
    ? allProductsOf(category).filter((product) => serviceProductMatchesContext(product, contextPath))
    : [];
  return {
    ...addon,
    scopes: normalizeAddonScopes(addon),
    price: category ? productPriceOf(category, contextPath) : null,
    productCount: category ? countProductsOf(category, contextPath) : 0,
    href: category ? pathFor(buildTrailFor(path)) : "",
    categoryLabel: category ? path.join(" / ") : "",
    linkBroken: path.length > 0 && !category,
  };
}

// occasions.js's pathFor() wants the ancestor trail (objects), but all we
// persist is the slug path — resolving through categoryByPath's own
// resolvePath already validated it exists, so rebuilding a trail of
// {slug} stand-ins is enough for pathFor's purposes (it only reads .slug).
function buildTrailFor(path) {
  return path.map((slug) => ({ slug }));
}

function productPriceOf(node, contextPath = null) {
  const sellable = allProductsOf(node)
    .filter((p) => p.status !== "archived" && p.status !== "draft")
    .filter((p) => serviceProductMatchesContext(p, contextPath));
  if (!sellable.length) return null;
  return Math.min(...sellable.map((p) => Number(p.price) || Infinity));
}

function countProductsOf(node, contextPath = null) {
  return allProductsOf(node).filter((p) => serviceProductMatchesContext(p, contextPath)).length;
}

// List of every existing occasion/category/theme a service can link to,
// with its live product count and cheapest price — powers the "Linked
// Category" picker in Admin → Event Services so a service can never point
// at a category that doesn't actually exist or has no products.
export function getAddonCategoryTree() {
  initializeSeedsIfNeeded();
  return repairEventServiceCategoryTree() || { children: [] };
}

export function getAddonCategories() {
  const eventAddons = getAddonCategoryTree();
  if (!eventAddons) return [];
  const out = [];
  function walk(nodes, trail = []) {
    (nodes || []).forEach((node) => {
      const next = [...trail, node];
      out.push({
        ...node,
        path: ["event-services", ...next.map((n) => n.slug)],
        label: next.map((n) => n.label).join(" › "),
        displayLabel: next.map((n) => n.label).join(" › "),
        productCount: countProductsOf(node),
      });
      walk(node.children, next);
    });
  }
  walk(eventAddons.children);
  return out;
}

export function getAddonCategoryOptions() {
  return getAddonCategories();
}

export function getDisplayPlacementOptions() {
  initializeSeedsIfNeeded();
  const normal = flattenCategoryTree()
    .filter((item) => !item.addonOnly && Array.isArray(item.path) && item.path.length)
    .map((item) => ({
      catalog: "normal",
      path: item.path,
      label: item.label,
      productCount: item.productCount,
    }));
  const services = getAddonCategories().map((item) => ({
    catalog: "service",
    path: item.path,
    label: item.label,
    productCount: item.productCount,
  }));
  return [...normal, ...services];
}

export function getDisplayPlacementEntries(catalog) {
  const wanted = String(catalog || "").toLowerCase();
  if (!["products", "packages"].includes(wanted)) return [];
  const out = [];
  const seen = new Set();
  getProducts().forEach((product) => {
    const placements = normalizeDisplayPlacements(product.displayPlacements)
      .filter((placement) => placement.catalog === wanted);
    placements.forEach((placement) => {
      const resolved = placement.path.length ? resolvePath(placement.path) : null;
      const trail = resolved?.trail?.length ? [...resolved.trail, product] : null;
      if (!trail) return;
      const key = `${product.id || product.slug}:${placement.path.join("/")}`;
      if (seen.has(key)) return;
      seen.add(key);
      out.push({
        product,
        occasion: trail[0],
        theme: trail[trail.length - 2],
        trail,
        displayPlacement: placement,
      });
    });
  });
  return out;
}

export function getAddonProducts() {
  return getProducts()
    .filter((p) => p && (
      p.isAddon === true
      || p.occasionSlug === "event-services"
      || (Array.isArray(p.categoryPath) && p.categoryPath[0] === "event-services")
      || (Array.isArray(p.serviceCategoryPath) && p.serviceCategoryPath[0] === "event-services")
      || (Array.isArray(p.catalogKinds) && p.catalogKinds.includes("service"))
    ))
    .map((p) => {
      const servicePath = Array.isArray(p.serviceCategoryPath) && p.serviceCategoryPath.length ? p.serviceCategoryPath : p.categoryPath;
      const category = categoryByPath(servicePath);
      return {
        ...p,
        addonCategoryLabel: category && Array.isArray(servicePath) ? servicePath.slice(1).join(" / ") : (p.categorySlug || "General"),
      };
    });
}

// Combines active global services with any active extras scoped to this
// occasion — mirrors the old static addonsFor(trail) helper but reads
// from the admin-editable store instead of the hardcoded data file. Cards
// whose linked category no longer resolves, or has zero live products,
// are dropped so the storefront never shows a dead "View Options" link.
function normalizeServiceCategoryPath(value) {
  const path = Array.isArray(value)
    ? value.map((part) => sanitizeSlug(part)).filter(Boolean)
    : String(value || "").split("/").map((part) => sanitizeSlug(part)).filter(Boolean);
  // Older records linked services beneath an occasion, e.g.
  // wedding/services/decor. Services now have one canonical catalog branch.
  if (path.length >= 3 && path[1] === "services") {
    return ["event-services", ...path.slice(2)];
  }
  return path;
}

export function getAddonsForOccasion(topSlug, contextPath = null) {
  // Service categories/products are now the single source of truth. The old
  // `addons` bucket only contained featured/legacy service cards and could
  // therefore make the storefront section render its heading with no items
  // even when Admin had valid service products. Build the cards directly from
  // the persisted Event Services category tree and its service products.
  if (!topSlug) return [];

  const eventServiceTree = getAddonCategoryTree();
  if (!eventServiceTree || !Array.isArray(eventServiceTree.children)) return [];

  const context = Array.isArray(contextPath) && contextPath.length
    ? contextPath
    : (topSlug === "event-services" ? ["event-services"] : [topSlug]);

  const topCategories = getAddonCategories()
    .map((category) => ({ ...category, path: normalizeServiceCategoryPath(category.path) }))
    .filter((category) => Array.isArray(category.path) && category.path.length === 2 && category.path[0] === "event-services")
    .filter((category) => category.active !== false);

  return topCategories.map((category) => {
    const node = categoryByPath(category.path);
    if (!node) return null;

    const products = allProductsOf(node)
      .filter((product) => product?.status !== "archived" && product?.status !== "draft")
      .filter((product) => serviceProductMatchesContext(product, context));

    const prices = products
      .map((product) => Number(product.price))
      .filter((price) => Number.isFinite(price) && price >= 0);

    const href = pathFor(buildTrailFor(category.path));
    return {
      id: `service-category-${category.path.join("-")}`,
      slug: category.path[category.path.length - 1],
      label: category.label?.split(" › ").slice(-1)[0] || node.label || "Service",
      subLabel: node.description || category.description || "Event service",
      description: node.description || category.description || "",
      image: node.image || category.image || IMAGES.showcase7,
      icon: "sparkle",
      price: prices.length ? Math.min(...prices) : null,
      productCount: products.length,
      href,
      categoryPath: category.path,
      active: true,
      scopes: products.flatMap((product) => Array.isArray(product.serviceScopes) ? product.serviceScopes : []),
    };
  }).filter((item) => item && item.productCount > 0);
}

export function saveAddon(addon) {
  const list = readStorage(KEYS.addons, []);
  const now = new Date().toISOString();
  const categoryPath = Array.isArray(addon.categoryPath) ? addon.categoryPath.filter(Boolean) : [];
  if (!categoryPath.length) throw new Error("Pick which category/sub-category this service links to.");

  const safe = {
    id: addon.id || uid("addon"),
    slug: sanitizeSlug(addon.slug || addon.label || "addon"),
    label: sanitizeText(addon.label || "New Service"),
    subLabel: sanitizeText(addon.subLabel || ""),
    image: sanitizeUrl(addon.image) || IMAGES.showcase7,
    icon: sanitizeText(addon.icon || "sparkle"),
    categoryPath,
    scopes: Array.isArray(addon.scopes) && addon.scopes.length
      ? addon.scopes.map(sanitizeScopePath).filter(Boolean)
      : (addon.scope && addon.scope !== "global" ? [sanitizeScopePath(addon.scope)] : []),
    scope: Array.isArray(addon.scopes) && addon.scopes.length ? sanitizeScopePath(addon.scopes[0]) : (sanitizeScopePath(addon.scope || "") || ""),
    active: addon.active !== false,
    updatedAt: now,
  };

  const idx = list.findIndex((a) => a.id === safe.id);
  if (idx !== -1) {
    list[idx] = { ...list[idx], ...safe };
  } else {
    safe.createdAt = now;
    list.unshift(safe);
  }

  persist(KEYS.addons, list);
  dispatchCatalogUpdate();
  return enrichAddon(safe);
}

export function deleteAddon(id) {
  const list = readStorage(KEYS.addons, []);
  const next = list.filter((a) => a.id !== id);
  persist(KEYS.addons, next);
  dispatchCatalogUpdate();
  return true;
}

export function duplicateAddon(id) {
  const target = readStorage(KEYS.addons, []).find((a) => a.id === id);
  if (!target) return null;
  const clone = {
    ...target,
    id: uid("addon"),
    slug: `${target.slug}-copy-${Date.now().toString(36).slice(-4)}`,
    label: `${target.label} (Copy)`,
  };
  return saveAddon(clone);
}

// =============================================================================
// 10. BACKUP & FULL RESTORE
// =============================================================================

export function exportFullCatalogData() {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      storeVersion: STORE_VERSION,
      products: getProducts(),
      occasions: getOccasions(),
      media: getMediaItems(),
      gallery: getGalleryItems(),
      instaVideos: getInstaVideos(),
      videoReviews: getVideoReviews(),
      coupons: getCoupons(),
      inquiries: getInquiries(),
      blackouts: getBlackoutDates(),
      cities: getCities(),
      addons: getAddons(),
    },
    null,
    2
  );
}

export function importFullCatalogData(jsonStr) {
  try {
    const raw = JSON.parse(jsonStr);
    const data = cleanObject(raw);

    if (!data || typeof data !== "object") throw new Error("Invalid catalog file.");

    if (Array.isArray(data.products)) persist(KEYS.products, data.products);
    if (Array.isArray(data.occasions)) persist(KEYS.occasions, data.occasions);
    if (Array.isArray(data.media)) persist(KEYS.media, data.media);
    if (Array.isArray(data.gallery)) persist(KEYS.gallery, data.gallery);
    if (Array.isArray(data.instaVideos)) persist(KEYS.instaVideos, data.instaVideos);
    if (Array.isArray(data.videoReviews)) persist(KEYS.videoReviews, data.videoReviews);
    if (Array.isArray(data.coupons)) persist(KEYS.coupons, data.coupons);
    if (Array.isArray(data.inquiries)) persist(KEYS.inquiries, data.inquiries);
    if (Array.isArray(data.blackouts)) persist(KEYS.blackouts, data.blackouts);
    if (Array.isArray(data.cities)) persist(KEYS.cities, data.cities);
    if (Array.isArray(data.addons)) persist(KEYS.addons, data.addons);

    dispatchCatalogUpdate();
    return true;
  } catch (err) {
    throw new Error(`Import failed: ${err.message}`);
  }
}

export function resetCatalogToDefaults() {
  localStorage.removeItem(KEYS.products);
  localStorage.removeItem(KEYS.occasions);
  localStorage.removeItem(KEYS.media);
  localStorage.removeItem(KEYS.gallery);
  localStorage.removeItem(KEYS.instaVideos);
  localStorage.removeItem(KEYS.videoReviews);
  localStorage.removeItem(KEYS.coupons);
  localStorage.removeItem(KEYS.inquiries);
  localStorage.removeItem(KEYS.blackouts);
  localStorage.removeItem(KEYS.cities);
  localStorage.removeItem(KEYS.addons);
  localStorage.removeItem(KEYS.version);
  initializeSeedsIfNeeded();
  dispatchCatalogUpdate();
  return true;
}
