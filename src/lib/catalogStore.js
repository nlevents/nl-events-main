// ============================================================================
// CATALOG STORE — CENTRAL DATA MANAGER FOR PRODUCTS, CATEGORIES, MEDIA,
// COUPONS, INQUIRIES, AVAILABILITY & GALLERY
// ============================================================================

import { OCCASIONS as SEED_OCCASIONS, flattenCategoryTree, categoryByPath, pathFor, allProductsOf } from "../data/occasions";
import { GALLERY_ITEMS as SEED_GALLERY } from "../data/categories";
import { IMAGES } from "../data/images";
import { PDF_REFERENCE_PRODUCTS } from "../data/pdfProducts";
import { CITIES_DATA as SEED_CITIES } from "../data/cities";
import { GLOBAL_ADDONS as SEED_GLOBAL_ADDONS, EXTRA_ADDONS_BY_OCCASION as SEED_EXTRA_ADDONS, SEED_ADDON_PRODUCTS } from "../data/addons";
import { sanitizeText, sanitizeSlug, sanitizeUrl, sanitizeShortVideoUrl, sanitizeNumber, cleanObject } from "./sanitize";
import { queueCloudSync, syncCloudState, hydratePublicState } from "./cloudStore";

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
  version: STORE_KEY_PREFIX + "version",
  demoVideosPurged: STORE_KEY_PREFIX + "demo_videos_purged",
  realShortsSeeded: STORE_KEY_PREFIX + "real_shorts_seeded",
  realShortsSeededV2: STORE_KEY_PREFIX + "real_shorts_seeded_v2",
  demoProductsPurged: STORE_KEY_PREFIX + "demo_products_purged",
  referenceHierarchyMigration: STORE_KEY_PREFIX + "reference_hierarchy_migration",
  referenceDemoProductsSeeded: STORE_KEY_PREFIX + "reference_demo_products_seeded_v1",
  referenceDemoProductsSeededV3: STORE_KEY_PREFIX + "reference_demo_products_seeded_v3",
  addonProductsSeededV1: STORE_KEY_PREFIX + "addon_products_seeded_v1",
};

const STORE_VERSION = "4.6-services-rename";
const REFERENCE_HIERARCHY_MIGRATION = "2";


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

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
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
  writeStorage(key, value);
  queueCloudSync(key, value);
}

function uid(prefix = "item") {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export async function hydrateCatalogFromCloud() {
  try {
    return await hydratePublicState();
  } catch (err) {
    // Cloud hydration is intentionally best-effort: the storefront should
    // still boot from its local/seed cache when Supabase is not configured
    // yet or the network is temporarily unavailable.
    console.warn("Cloud catalog hydration skipped:", err?.message || err);
    return null;
  }
}

export function dispatchCatalogUpdate() {
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

function extractAllSeedAddons() {
  const list = [];
  (SEED_GLOBAL_ADDONS || []).forEach((a) => {
    const { price: _price, href: _href, ...rest } = a;
    list.push({
      ...rest,
      id: uid("addon"),
      categoryPath: hrefToCategoryPath(_href),
      scope: "global",
      active: true,
      createdAt: new Date().toISOString(),
    });
  });
  Object.entries(SEED_EXTRA_ADDONS || {}).forEach(([occasionSlug, items]) => {
    (items || []).forEach((a) => {
      const { price: _price, href: _href, ...rest } = a;
      list.push({
        ...rest,
        id: uid("addon"),
        categoryPath: hrefToCategoryPath(_href),
        scope: occasionSlug,
        active: true,
        createdAt: new Date().toISOString(),
      });
    });
  });
  return list;
}

function seedAddonProductsIfNeeded() {
  if (localStorage.getItem(KEYS.addonProductsSeededV1)) return;
  const existing = readStorage(KEYS.products, []);
  const existingSlugs = new Set(existing.map((p) => p?.slug).filter(Boolean));
  const seeded = (SEED_ADDON_PRODUCTS || [])
    .filter((p) => !existingSlugs.has(p.slug))
    .map((p, i) => ({
      ...p,
      id: uid("addon-prod"),
      type: "product",
      occasionSlug: "event-services",
      categoryPath: ["event-services", p.categorySlug],
      isAddon: true,
      status: "active",
      rating: 4.7,
      reviewCount: 18 + i * 4,
      includes: Array.isArray(p.includes) ? p.includes : [],
      addons: [],
      cities: ["Ranchi", "Jamshedpur", "Patna"],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isDemo: true,
    }));
  if (seeded.length) writeStorage(KEYS.products, [...existing, ...seeded]);
  localStorage.setItem(KEYS.addonProductsSeededV1, "1");
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
  writeStorage(KEYS.instaVideos, [
    ...existingShorts,
    ...realShortUrls.map((url) => ({
      id: uid("igv"),
      url,
      caption: "",
      thumbnail: "",
      createdAt: new Date().toISOString(),
    })),
  ]);

  const existingReviews = readStorage(KEYS.videoReviews, []);
  writeStorage(KEYS.videoReviews, [
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
  ]);

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

function mergeSeedOccasions(existing, seed) {
  if (!Array.isArray(existing)) return seed;
  const clone = JSON.parse(JSON.stringify(existing));
  function mergeNode(target, source) {
    if (!target || !source) return;
    target.children = Array.isArray(target.children) ? target.children : [];
    (source.children || []).forEach((seedChild) => {
      const found = target.children.find((c) => c.slug === seedChild.slug);
      if (found) mergeNode(found, seedChild);
      else target.children.push(JSON.parse(JSON.stringify(seedChild)));
    });
  }
  (seed || []).forEach((seedOccasion) => {
    const found = clone.find((o) => o.slug === seedOccasion.slug);
    if (found) mergeNode(found, seedOccasion);
    else clone.push(JSON.parse(JSON.stringify(seedOccasion)));
  });
  return clone;
}


function referenceDemoProducts() {
  const common = (p) => ({
    id: uid("demo-prod"),
    status: "active",
    rating: p.rating || 4.7,
    reviewCount: p.reviewCount || 46,
    includes: p.includes || ["Professional setup", "Decoration materials", "Setup & takedown"],
    addons: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...p,
  });
  const img = IMAGES;
  const curated = [
    // Kids Birthday — names and examples visible in the supplied reference recording.
    common({ occasionSlug:"birthday", categorySlug:"kids-birthday", slug:"simple-birthday-room-decoration-for-kids", name:"Simple Birthday Room Decoration For Kids", shortDesc:"A cheerful room setup with balloons, backdrop styling and a cake corner.", image:img.themeBalloonCelebration, price:2899, originalPrice:3209 }),
    common({ occasionSlug:"birthday", categorySlug:"kids-birthday", slug:"dreamy-unicorn-birthday-setup", name:"Dreamy Unicorn Birthday Setup", shortDesc:"Pastel unicorn styling with a dreamy balloon backdrop.", image:img.themePony, price:7800, originalPrice:8200 }),
    common({ occasionSlug:"birthday", categorySlug:"kids-birthday", slug:"roblox-theme-birthday-decoration-with-blue-balloon-arch", name:"Roblox Theme Birthday Decoration with Blue Balloon Arch", shortDesc:"Blue balloon arch and gaming-inspired Roblox party styling.", image:img.pkgBirthdayBash, price:6499, originalPrice:7499 }),
    common({ occasionSlug:"birthday", categorySlug:"kids-birthday", slug:"premium-dinosaur-theme-birthday-decoration", name:"Premium Dinosaur Theme Birthday Decoration", shortDesc:"Premium dinosaur party setup with themed backdrop and props.", image:img.themeDinosaurToy, price:29500, originalPrice:32000 }),
    common({ occasionSlug:"birthday", categorySlug:"kids-birthday", slug:"harry-potter-theme-birthday-balloon-decoration", name:"Harry Potter Theme Birthday Balloon Decoration", shortDesc:"Wizarding-inspired balloon and backdrop decoration for kids.", image:img.themeStageLights, price:7400, originalPrice:8200 }),
    common({ occasionSlug:"birthday", categorySlug:"kids-birthday", slug:"pastel-unicorn-theme-birthday-balloon-decoration", name:"Pastel Unicorn Theme Birthday Balloon Decoration", shortDesc:"Soft pastel unicorn balloon styling for a magical birthday.", image:img.themePony, price:6799, originalPrice:7499 }),
    common({ occasionSlug:"birthday", categorySlug:"kids-birthday", slug:"barbie-theme-birthday-backdrop-decoration", name:"Barbie Theme Birthday Backdrop Decoration", shortDesc:"Pink Barbie-inspired backdrop with coordinated balloons.", image:img.themePony, price:3999, originalPrice:4509 }),
    common({ occasionSlug:"birthday", categorySlug:"kids-birthday", slug:"rainbow-theme-birthday-decoration-with-pastel-balloon-arch", name:"Rainbow Theme Birthday Decoration with Pastel Balloon Arch", shortDesc:"Colourful rainbow backdrop with a pastel balloon arch.", image:img.themeBalloonCelebration, price:6800, originalPrice:7509 }),

    // Car Theme — reference recording examples.
    common({ occasionSlug:"birthday", categorySlug:"car-theme", slug:"car-theme-decoration", name:"Car Theme Decoration", shortDesc:"Car-themed birthday backdrop and balloon decoration.", image:img.pkgBirthdayBash, price:22199, originalPrice:22400 }),
    common({ occasionSlug:"birthday", categorySlug:"car-theme", slug:"spiderman-theme-decoration", name:"Spiderman Theme Decoration", shortDesc:"Spiderman-inspired birthday backdrop and balloon styling.", image:img.pkgBirthdayBash, price:21799, originalPrice:22400 }),
    common({ occasionSlug:"birthday", categorySlug:"car-theme", slug:"super-hero-theme-decoration", name:"Super Hero Theme Decoration", shortDesc:"Superhero birthday decoration with bold comic styling.", image:img.pkgBirthdayBash, price:21799, originalPrice:22400 }),
    common({ occasionSlug:"birthday", categorySlug:"car-theme", slug:"car-theme-party-decoration", name:"Car Theme Party Decoration", shortDesc:"Racing-inspired car theme for a kids birthday party.", image:img.pkgBirthdayBash, price:6999, originalPrice:7999 }),

    // Frozen / Princess examples from the recording.
    common({ occasionSlug:"birthday", categorySlug:"frozen-theme", slug:"frozen-theme-decoration-for-kids-birthday", name:"Frozen Theme Decoration for Kids Birthday", shortDesc:"Blue and white winter-wonderland Frozen decoration.", image:img.heroBirthday, price:21999, originalPrice:25999 }),
    common({ occasionSlug:"birthday", categorySlug:"frozen-theme", slug:"disney-princess-theme-decoration", name:"Disney Princess Theme Decoration", shortDesc:"Princess-inspired birthday setup with elegant pastel styling.", image:img.themeTiaraCrown, price:21999, originalPrice:25099 }),
    common({ occasionSlug:"birthday", categorySlug:"princess-theme", slug:"premium-barbie-decoration", name:"Premium Barbie Decoration", shortDesc:"Premium Barbie-inspired party backdrop and balloon styling.", image:img.themePony, price:11999, originalPrice:13999 }),

    // Wedding Car — reference recording examples.
    common({ occasionSlug:"wedding", categorySlug:"wedding-car", slug:"white-car-decoration-for-wedding", name:"White Car Decoration For Wedding", shortDesc:"Elegant white floral wedding car decoration.", image:img.showcase1, price:35999, originalPrice:37999 }),
    common({ occasionSlug:"wedding", categorySlug:"wedding-car", slug:"car-dashboard-decoration-for-marriage", name:"Car Dashboard Decoration For Marriage", shortDesc:"Floral dashboard decoration for a wedding car.", image:img.showcase1, price:37999, originalPrice:42209 }),
    common({ occasionSlug:"wedding", categorySlug:"wedding-car", slug:"car-decor-with-rose", name:"Car Decor With Rose", shortDesc:"Rose-focused wedding car decoration.", image:img.showcase1, price:10999, originalPrice:12499 }),
    common({ occasionSlug:"wedding", categorySlug:"wedding-car", slug:"simple-car-flower-decoration", name:"Simple Car Flower Decoration", shortDesc:"Clean floral styling for a wedding car.", image:img.showcase1, price:36499, originalPrice:37309 }),
    common({ occasionSlug:"wedding", categorySlug:"wedding-car", slug:"car-marriage-decoration", name:"Car Marriage Decoration", shortDesc:"Traditional floral wedding car setup.", image:img.showcase1, price:33899, originalPrice:34509 }),
    common({ occasionSlug:"wedding", categorySlug:"wedding-car", slug:"ribbon-wedding-car-decoration", name:"Ribbon Wedding Car Decoration", shortDesc:"Ribbon and floral styling for wedding transportation.", image:img.showcase1, price:34999, originalPrice:35599 }),
    common({ occasionSlug:"wedding", categorySlug:"wedding-car", slug:"simple-car-ribbon-decoration", name:"Simple Car Ribbon Decoration", shortDesc:"Minimal ribbon-led wedding car decoration.", image:img.showcase1, price:34199, originalPrice:34709 }),
    common({ occasionSlug:"wedding", categorySlug:"wedding-car", slug:"classic-wedding-car-decoration", name:"Classic Wedding Car Decoration", shortDesc:"Classic floral wedding car styling.", image:img.showcase1, price:32999, originalPrice:34999 }),

    // Haldi — reference recording examples.
    common({ occasionSlug:"wedding", categorySlug:"haldi", slug:"simple-haldi-backdrop", name:"Simple Haldi Backdrop", shortDesc:"Bright marigold-inspired Haldi backdrop for an intimate ceremony.", image:img.themeJungleLeaves, price:14999, originalPrice:15709 }),
    common({ occasionSlug:"wedding", categorySlug:"haldi", slug:"flower-and-tassel-haldi", name:"Flower and Tassel Haldi", shortDesc:"Floral and tassel styling for a colourful Haldi ceremony.", image:img.themeJungleLeaves, price:12999, originalPrice:14299 }),
    common({ occasionSlug:"wedding", categorySlug:"haldi", slug:"mehndi-green-backdrop-setup", name:"Mehndi Green Backdrop Setup", shortDesc:"Green backdrop setup with floral and traditional accents.", image:img.themeMehndiHenna, price:16999, originalPrice:19999 }),
    common({ occasionSlug:"wedding", categorySlug:"haldi", slug:"elegant-mehndi-decoration", name:"Elegant Mehndi Decoration", shortDesc:"Elegant green and floral Mehndi ceremony styling.", image:img.themeMehndiHenna, price:27999, originalPrice:28999 }),
    common({ occasionSlug:"wedding", categorySlug:"haldi", slug:"home-flower-decoration", name:"Home Flower Decoration", shortDesc:"Floral home decoration for a pre-wedding ceremony.", image:img.themeJungleLeaves, price:15999, originalPrice:17499 }),
    common({ occasionSlug:"wedding", categorySlug:"haldi", slug:"elegant-haldi-setup", name:"Elegant Haldi Setup", shortDesc:"Premium Haldi setup with coordinated floral styling.", image:img.themeJungleLeaves, price:15999, originalPrice:17499 }),
    common({ occasionSlug:"wedding", categorySlug:"haldi", slug:"marigold-haldi-decoration", name:"Marigold Haldi Decoration", shortDesc:"Traditional marigold-led Haldi ceremony decoration.", image:img.themeJungleLeaves, price:21999, originalPrice:26399 }),
    common({ occasionSlug:"wedding", categorySlug:"haldi", slug:"premium-haldi-floral-setup", name:"Premium Haldi Floral Setup", shortDesc:"Premium floral Haldi backdrop and seating-area styling.", image:img.themeJungleLeaves, price:13999, originalPrice:15999 }),

    // Root birthday categories — enough mixed content to make the reference-style
    // Birthday page look populated without pretending these are real inventory.
    common({ occasionSlug:"birthday", categorySlug:"balloon-decor", slug:"simple-birthday-balloon-decoration", name:"Simple Birthday Balloon Decoration", shortDesc:"Classic balloon backdrop for birthdays.", image:img.themeBalloonCelebration, price:2499, originalPrice:2999 }),
    common({ occasionSlug:"birthday", categorySlug:"balloon-decor", slug:"elegant-birthday-balloon-decoration", name:"Elegant Birthday Balloon Decoration", shortDesc:"Elegant balloon styling with a photo-ready backdrop.", image:img.themeBalloonArch, price:4499, originalPrice:5499 }),
    common({ occasionSlug:"birthday", categorySlug:"canopy-decor", slug:"birthday-canopy-decoration", name:"Birthday Canopy Decoration", shortDesc:"Canopy-style birthday setup with balloons and lights.", image:img.themePony, price:5999, originalPrice:6999 }),
    common({ occasionSlug:"birthday", categorySlug:"car-boot-decor", slug:"birthday-car-boot-decoration", name:"Birthday Car Boot Decoration", shortDesc:"Car boot styling for a birthday surprise.", image:img.pkgBirthdayBash, price:4999, originalPrice:5999 }),
  ];


  const slugifyLocal = (value) => String(value || "item").toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const KNOWN_NESTED_PATHS = {
    "animal-theme": ["birthday", "kids-birthday", "animal-theme"],
    "car-theme": ["birthday", "kids-birthday", "car-theme"],
    "frozen-theme": ["birthday", "kids-birthday", "frozen-theme"],
    "superhero-theme": ["birthday", "kids-birthday", "superhero-theme"],
    "princess-theme": ["birthday", "kids-birthday", "princess-theme"],
    "barbie-theme": ["birthday", "kids-birthday", "barbie-theme"],
    "wedding-car": ["wedding", "wedding-car"],
  };
  const pathForCategory = (occasionSlug, categorySlug) => {
    if (KNOWN_NESTED_PATHS[categorySlug]) return KNOWN_NESTED_PATHS[categorySlug];
    let result = null;
    function walk(node, trail) {
      if (!node || result) return;
      const next = [...trail, node];
      if (node.slug === categorySlug && next[0]?.slug === occasionSlug) { result = next.map((n) => n.slug); return; }
      (node.children || []).forEach((child) => walk(child, next));
    }
    const occ = SEED_OCCASIONS.find((o) => o.slug === occasionSlug);
    if (occ) walk(occ, []);
    return result || [occasionSlug, categorySlug].filter(Boolean);
  };

  const imageFor = (slug, variant = 0) => realCatalogImageFor(slug, variant);

  // Preserve the named examples from the reference recording, but make every
  // product use the artwork for its actual category/theme and store the full
  // hierarchy path. This prevents unrelated cake/wedding images from appearing
  // under themes such as Car, Frozen, SFX, Haldi, etc.
  curated.forEach((p, i) => {
    const path = pathForCategory(p.occasionSlug, p.categorySlug);
    p.categoryPath = path;
    const leafSlug = path[path.length - 1] || p.categorySlug;
    p.image = imageFor(leafSlug, i);
    p.gallery = [imageFor(leafSlug, i), imageFor(leafSlug, i + 1), imageFor(leafSlug, i + 2)];
    p.isDemo = true;
  });

  // Add 4 believable dummy packages to every leaf category/theme in the tree.
  // Parents automatically aggregate these products, so every level of the
  // hierarchy has useful catalog content without duplicating inventory.
  const generated = [];
  const suffixes = [
    ["Classic", "Setup"],
    ["Premium", "Decoration"],
    ["Elegant", "Package"],
    ["Signature", "Experience"],
  ];
  function addLeafProducts(node, occasionSlug, trail) {
    const nextTrail = [...trail, node];
    const children = Array.isArray(node.children) ? node.children : [];
    if (children.length) {
      children.forEach((child) => addLeafProducts(child, occasionSlug, nextTrail));
      return;
    }
    if (!node.slug || node.slug === "dummy-event" || node.type === "product") return;
    const label = node.label || "Event";
    for (let i = 0; i < suffixes.length; i += 1) {
      const [adjective, noun] = suffixes[i];
      const slug = `${occasionSlug}-${node.slug}-${slugifyLocal(adjective)}-${slugifyLocal(noun)}`;
      if (curated.some((p) => p.slug === slug) || generated.some((p) => p.slug === slug)) continue;
      const base = 2499 + ((node.slug.length * 731 + i * 1733) % 27000);
      const path = nextTrail.map((n) => n.slug);
      generated.push(common({
        occasionSlug,
        categorySlug: node.slug,
        categoryPath: path,
        slug,
        name: `${adjective} ${label} ${noun}`,
        shortDesc: `${adjective} ${label.toLowerCase()} setup with coordinated styling, props and professional installation.`,
        description: `A ${adjective.toLowerCase()} ${label.toLowerCase()} package designed to match the theme, venue and celebration style.`,
        image: imageFor(node.slug, i),
        gallery: [imageFor(node.slug, i), imageFor(node.slug, i + 1), imageFor(node.slug, i + 2)],
        price: base,
        originalPrice: base + Math.max(500, Math.round(base * 0.14)),
        includes: ["Theme-specific backdrop/styling", "Coordinated props", "Balloon/floral accents where applicable", "Professional setup & takedown"],
        isDemo: true,
      }));
    }
  }
  (SEED_OCCASIONS || []).forEach((occ) => {
    if (occ.slug === "dummy-event") return;
    addLeafProducts(occ, occ.slug, []);
  });

  // Add every product/card transcribed from the supplied reference PDF.
  // Cards without a displayed price remain quote-only instead of inventing a price.
  const pdfProducts = (PDF_REFERENCE_PRODUCTS || []).map((p, i) => {
    const categoryPath = [p.occasionSlug, p.categorySlug].filter(Boolean);
    const leafSlug = p.categorySlug || p.occasionSlug;
    const baseImage = imageFor(leafSlug, i);
    return common({
      occasionSlug: p.occasionSlug,
      categorySlug: p.categorySlug,
      categoryPath,
      slug: `pdf-${p.page}-${slugifyLocal(p.occasionSlug)}-${slugifyLocal(p.categorySlug)}-${slugifyLocal(p.name)}-${i + 1}`,
      name: p.name,
      shortDesc: p.quoteOnly
        ? `${p.name} — reference design from the supplied catalog PDF. Contact us for the final customised quote.`
        : `${p.name} — reference package from the supplied catalog PDF.`,
      description: `Reference catalog item shown on page ${p.page} of the supplied PDF. Final styling, venue requirements and availability are confirmed before booking.`,
      image: baseImage,
      gallery: [baseImage, imageFor(leafSlug, i + 1), imageFor(leafSlug, i + 2)],
      price: p.quoteOnly ? null : p.price,
      originalPrice: null,
      quoteOnly: Boolean(p.quoteOnly),
      referencePage: p.page,
      includes: ["Reference design / package styling", "Professional setup", "Final customisation confirmed before event"],
      isDemo: true,
    });
  });

  return [...curated, ...generated, ...pdfProducts];
}

function seedReferenceDemoProductsIfNeeded() {
  if (localStorage.getItem(KEYS.referenceDemoProductsSeededV3)) return;
  const existing = readStorage(KEYS.products, []);
  // Only remove records created by our previous demo seeds. Admin-created
  // products are preserved untouched.
  const preserved = existing.filter((p) => !(p && (p.isDemo === true || String(p.id || "").startsWith("demo-prod"))));
  const demo = referenceDemoProducts();
  writeStorage(KEYS.products, [...preserved, ...demo]);
  localStorage.setItem(KEYS.referenceDemoProductsSeededV3, "1");
}

function initializeSeedsIfNeeded() {
  // Backward-compatible rename: Event Add-ons -> Event Services.
  // Existing admin/catalog data is kept intact when users upgrade.
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

  const currentVersion = localStorage.getItem(KEYS.version);
  if (currentVersion === STORE_VERSION && localStorage.getItem(KEYS.referenceHierarchyMigration) === REFERENCE_HIERARCHY_MIGRATION && localStorage.getItem(KEYS.referenceDemoProductsSeededV3) === "1") return;

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

  // Apply the supplied reference hierarchy once. The previous builds used a
  // partially different tree, so merging here would leave old category nodes
  // in place. After this one-time migration, all future admin edits are
  // preserved normally. Products are stored separately and remain empty until
  // an admin creates them.
  {
    // Always merge the improved seed hierarchy into the existing tree instead
    // of replacing it. This preserves categories and edits created by Admin.
    const storedOccasions = normalizeReferenceStoredTree(readStorage(KEYS.occasions, null));
    writeStorage(
      KEYS.occasions,
      Array.isArray(storedOccasions) && storedOccasions.length > 0
        ? mergeSeedOccasions(storedOccasions, SEED_OCCASIONS)
        : JSON.parse(JSON.stringify(SEED_OCCASIONS))
    );
    localStorage.setItem(KEYS.referenceHierarchyMigration, REFERENCE_HIERARCHY_MIGRATION);
  }

  // Refresh presentation images for the built-in hierarchy without replacing
  // admin-created category names, children or other custom fields.
  if (localStorage.getItem(KEYS.referenceHierarchyMigration) === REFERENCE_HIERARCHY_MIGRATION) {
    const currentTree = readStorage(KEYS.occasions, []);
    function refreshImages(nodes) {
      (nodes || []).forEach((node) => {
        node.image = realCatalogImageFor(node.slug, 0);
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
        if (!product?.isDemo) return;
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

  // Initialize the reference catalog. These products are copied
  // from the supplied reference recording so the hierarchy can be tested visually.
  // They are normal catalog records and can be edited/deleted from Admin.
  if (!localStorage.getItem(KEYS.products)) {
    writeStorage(KEYS.products, []);
  }
  seedReferenceDemoProductsIfNeeded();

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
  seedAddonProductsIfNeeded();

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

  // Shorts rail (Instagram reels or YouTube Shorts, shown above Customer
  // Reviews) and video reviews (shown below Customer Reviews) are NOT
  // auto-seeded content — both sections stay hidden
  // until real links are added. seedRealShortsIfNeeded() (called at the top
  // of this function) handles the one real launch-content seed.

  // Initialize Service Cities (coverage + pricing multiplier + on/off switch)
  if (!localStorage.getItem(KEYS.cities)) {
    writeStorage(
      KEYS.cities,
      SEED_CITIES.map((c) => ({ ...c, active: true }))
    );
  }

  // Initialize Event Services. Service cards are featured doorways into the
  // real Event Services catalog tree; they are not sellable products themselves.
  const storedAddons = readStorage(KEYS.addons, null);
  if (!Array.isArray(storedAddons)) {
    writeStorage(KEYS.addons, extractAllSeedAddons());
  } else {
    const legacyAddonSlugs = new Set(["sfx", "artists", "photography", "wedding-activity", "baraat-procession"]);
    const migratedAddons = storedAddons.map((a) => {
      const path = Array.isArray(a.categoryPath) ? a.categoryPath.filter(Boolean) : [];
      return path.length === 1 && legacyAddonSlugs.has(path[0])
        ? { ...a, categoryPath: ["event-services", path[0]] }
        : a;
    });
    const seeded = extractAllSeedAddons();
    const existingKeys = new Set(migratedAddons.map((a) => `${a.scope}:${a.slug}`));
    const missing = seeded.filter((a) => !existingKeys.has(`${a.scope}:${a.slug}`));
    writeStorage(KEYS.addons, [...missing, ...migratedAddons]);
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
  return readStorage(KEYS.products, []).map((product) => ({
    ...product,
    image: sanitizeUrl(product?.image) || IMAGES.pkgDreamWedding,
  }));
}

export function getProduct(idOrSlug) {
  const list = getProducts();
  return list.find((p) => p.id === idOrSlug || p.slug === idOrSlug) || null;
}

export function saveProduct(product) {
  const list = getProducts();
  const now = new Date().toISOString();

  const safeProduct = {
    ...product,
    // Must always be "product": the occasion tree walker uses this to
    // decide whether a node renders ProductTemplate (the product detail
    // page) or CategoryTemplate (a listing page). Without it, clicking a
    // product opens CategoryTemplate on an empty node — a blank page.
    type: "product",
    slug: sanitizeSlug(product.slug || product.name || "package"),
    name: sanitizeText(product.name || "Untitled Package"),
    price: sanitizeNumber(product.price, 0, 10000000, 9999),
    originalPrice: product.originalPrice ? sanitizeNumber(product.originalPrice, 0, 10000000) : null,
    rating: sanitizeNumber(product.rating, 1, 5, 4.8),
    reviewCount: sanitizeNumber(product.reviewCount, 0, 10000, 0),
    description: sanitizeText(product.description || ""),
    setupRequirements: sanitizeText(product.setupRequirements || ""),
    duration: sanitizeText(product.duration || ""),
    requiresTimeSlot: product.requiresTimeSlot !== false,
    image: sanitizeUrl(product.image) || IMAGES.pkgDreamWedding,
    status: ["active", "draft", "archived", "featured"].includes(product.status) ? product.status : "active",
    includes: Array.isArray(product.includes) ? product.includes.map(sanitizeText).filter(Boolean) : [],
    notIncluded: Array.isArray(product.notIncluded) ? product.notIncluded.map(sanitizeText).filter(Boolean) : [],
    importantInfo: Array.isArray(product.importantInfo) ? product.importantInfo.map(sanitizeText).filter(Boolean) : [],
    addons: Array.isArray(product.addons)
      ? product.addons.map((a) => ({ name: sanitizeText(a.name), price: sanitizeNumber(a.price) }))
      : [],
    cities: Array.isArray(product.cities) ? product.cities.map(sanitizeText) : [],
    categoryPath: Array.isArray(product.categoryPath) ? product.categoryPath.map(sanitizeSlug).filter(Boolean) : [],
    isAddon: Boolean(product.isAddon || product.occasionSlug === "event-services" || (Array.isArray(product.categoryPath) && product.categoryPath[0] === "event-services")),
    updatedAt: now,
  };
  // Category hierarchy is the source of truth. setupType is intentionally
  // ignored so legacy records cannot recreate the old flat filter.
  delete safeProduct.setupType;

  const existingIdx = list.findIndex((p) => p.id === safeProduct.id || (safeProduct.slug && p.slug === safeProduct.slug));
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
  const saved = saveProduct(product);
  const list = getProducts();
  await syncCloudState(KEYS.products, list);
  return saved;
}

export function deleteProduct(idOrSlug) {
  const list = getProducts();
  const next = list.filter((p) => p.id !== idOrSlug && p.slug !== idOrSlug);
  persist(KEYS.products, next);
  dispatchCatalogUpdate();
  return true;
}

export function duplicateProduct(idOrSlug) {
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

  return saveProduct(clone);
}

export function bulkUpdateProducts(ids, updates) {
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
  return count;
}

export function bulkDeleteProducts(ids) {
  const list = getProducts();
  const next = list.filter((p) => !ids.includes(p.id) && !ids.includes(p.slug));
  persist(KEYS.products, next);
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

export function getOccasions() {
  initializeSeedsIfNeeded();
  return readStorage(KEYS.occasions, SEED_OCCASIONS).map(sanitizeCategoryNode);
}

export function getOccasion(slug) {
  return getOccasions().find((o) => o.slug === slug) || null;
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

export function saveCategory(parentOccasionSlug, category) {
  const occasions = getOccasions();
  const occ = occasions.find((o) => o.slug === parentOccasionSlug);
  if (!occ) return null;

  const safeCat = {
    ...category,
    slug: sanitizeSlug(category.slug || category.label || "category"),
    label: sanitizeText(category.label || "New Category"),
    description: sanitizeText(category.description || ""),
    image: sanitizeUrl(category.image) || IMAGES.pkgDreamWedding,
    type: category.type || "category",
    products: Array.isArray(category.products) ? category.products : [],
  };

  // If parentCategorySlug is provided, insert under that category recursively
  if (category.parentCategorySlug) {
    const parentCat = findCategoryRecursive(occ, category.parentCategorySlug);
    if (!parentCat) return null;
    parentCat.children = parentCat.children || [];
    const idx = parentCat.children.findIndex((c) => c.slug === safeCat.slug || c.id === safeCat.id);
    if (idx !== -1) {
      parentCat.children[idx] = { ...parentCat.children[idx], ...safeCat };
    } else {
      safeCat.id = safeCat.id || uid("cat");
      parentCat.children.push(safeCat);
    }
  } else {
    // Direct child of occasion
    occ.children = occ.children || [];
    const idx = occ.children.findIndex((c) => c.slug === safeCat.slug || c.id === safeCat.id);
    if (idx !== -1) {
      occ.children[idx] = { ...occ.children[idx], ...safeCat };
    } else {
      safeCat.id = safeCat.id || uid("cat");
      occ.children.push(safeCat);
    }
  }

  persist(KEYS.occasions, occasions);
  dispatchCatalogUpdate();
  return safeCat;
}

export function deleteCategory(parentOccasionSlug, categorySlug, parentCategorySlug = null) {
  const occasions = getOccasions();
  const occ = occasions.find((o) => o.slug === parentOccasionSlug);
  if (!occ) return false;

  const removeFromArray = (arr, slug) => {
    const idx = arr.findIndex((c) => c.slug === slug);
    if (idx !== -1) arr.splice(idx, 1);
  };

  if (parentCategorySlug) {
    const parentCat = findCategoryRecursive(occ, parentCategorySlug);
    if (!parentCat || !parentCat.children) return false;
    removeFromArray(parentCat.children, categorySlug);
  } else {
    if (!occ.children) return false;
    removeFromArray(occ.children, categorySlug);
  }

  persist(KEYS.occasions, occasions);
  dispatchCatalogUpdate();
  return true;
}

/**
 * Recursively finds a category by slug within an occasion.
 * Returns the category object or null if not found.
 */
function findCategoryRecursive(occurrence, slug) {
  if (!occurrence || !occurrence.children) return null;
  const stack = [...occurrence.children];
  while (stack.length) {
    const cat = stack.pop();
    if (cat.slug === slug) return cat;
    if (cat.children && cat.children.length) {
      stack.push(...cat.children);
    }
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

/**
 * Safely processes and stores an uploaded file as a WebP / Data URL.
 */
export function uploadMediaFile(file, title = "") {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error("No file selected."));
      return;
    }

    // Validate MIME type
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!validTypes.includes(file.type)) {
      reject(new Error("Invalid file type. Only JPEG, PNG, WebP, and GIF images are allowed."));
      return;
    }

    // Max 5MB
    if (file.size > 5 * 1024 * 1024) {
      reject(new Error("Image size exceeds maximum limit of 5MB."));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      const mediaItem = saveMediaItem({
        title: title || file.name.replace(/\.[^/.]+$/, ""),
        url: dataUrl,
        alt: title || file.name,
        fileSize: file.size,
        mimeType: file.type,
        tags: ["upload"],
      });
      resolve(mediaItem);
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

export function getAddons() {
  initializeSeedsIfNeeded();
  const list = readStorage(KEYS.addons, []);
  return list.map(enrichAddon);
}

// Attaches live data derived from the linked sub-category — current
// cheapest product price, how many products it holds, the browse link,
// and whether that category still exists (an admin may have renamed or
// deleted it after this service was linked to it).
function enrichAddon(addon) {
  const path = Array.isArray(addon.categoryPath) ? addon.categoryPath : [];
  const category = path.length ? categoryByPath(path) : null;
  return {
    ...addon,
    price: category ? productPriceOf(category) : null,
    productCount: category ? countProductsOf(category) : 0,
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

function productPriceOf(node) {
  const sellable = allProductsOf(node).filter((p) => p.status !== "archived" && p.status !== "draft");
  if (!sellable.length) return null;
  return Math.min(...sellable.map((p) => Number(p.price) || Infinity));
}

function countProductsOf(node) {
  return allProductsOf(node).length;
}

// List of every existing occasion/category/theme a service can link to,
// with its live product count and cheapest price — powers the "Linked
// Category" picker in Admin → Event Services so a service can never point
// at a category that doesn't actually exist or has no products.
export function getAddonCategoryTree() {
  return getOccasion("event-services") || { children: [] };
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

export function getAddonProducts() {
  return getProducts()
    .filter((p) => p && (p.isAddon === true || p.occasionSlug === "event-services" || (Array.isArray(p.categoryPath) && p.categoryPath[0] === "event-services")))
    .map((p) => {
      const category = categoryByPath(p.categoryPath);
      return {
        ...p,
        addonCategoryLabel: category && Array.isArray(p.categoryPath) ? p.categoryPath.slice(1).join(" / ") : (p.categorySlug || "General"),
      };
    });
}

// Combines active global services with any active extras scoped to this
// occasion — mirrors the old static addonsFor(trail) helper but reads
// from the admin-editable store instead of the hardcoded data file. Cards
// whose linked category no longer resolves, or has zero live products,
// are dropped so the storefront never shows a dead "View Options" link.
export function getAddonsForOccasion(topSlug) {
  const all = getAddons().filter((a) => a.active !== false && !a.linkBroken && a.productCount > 0 && a.price != null);
  const globalOnes = all.filter((a) => a.scope === "global");
  const extras = topSlug ? all.filter((a) => a.scope === topSlug) : [];
  return [...globalOnes, ...extras];
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
    scope: sanitizeSlug(addon.scope || "global") || "global",
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
