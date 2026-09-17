import { IMAGES } from "./images";
import { getProducts as getCatalogProducts } from "../lib/catalogStore";

export const CATEGORY_DATA = {
  weddings: {
    explore: [
      {
        name: "Haldi",
        products: [
          { id: "haldi1", name: "Haldi Design A", image: IMAGES.galWedding1 },
          { id: "haldi2", name: "Haldi Design B", image: IMAGES.galWedding2 }
        ]
      }
      // Add more explore categories as needed
    ],
    addons: [
      {
        name: "SFX",
        products: [
          { id: "fireworks", name: "Fireworks", image: IMAGES.galConcert1 }
        ]
      }
      // Add more addon categories as needed
    ]
  },
  birthday: {
    explore: [
      {
        name: "Barbie Themed",
        products: [
          { id: "barbie1", name: "Barbie Design 1", image: IMAGES.galBirthday3 }
        ]
      }
      // Add more explore categories as needed
    ],
    addons: [
      {
        name: "SFX",
        products: [
          { id: "birthdayFireworks", name: "Fireworks", image: IMAGES.galConcert1 }
        ]
      }
      // Add more addon categories as needed
    ]
  }
};

/* Products are managed by the production admin catalog.
   This file intentionally contains no hard-coded product data. */
export const PRODUCTS = {};

function getLiveProductsMap() {
  const map = { ...PRODUCTS };
  try {
    getCatalogProducts().forEach((p) => {
      if (!p) return;
      // Products filed under the "Event Add-ons" branch (occasionSlug or
      // categoryPath[0] === "event-add-ons") are add-ons, not standalone
      // packages. They must only appear on their own product page and in
      // the "Popular Add-ons" strip under an occasion's subcategories —
      // never in the generic Home "Popular Packages" rail or the flagship
      // Packages listing, both of which read from this flat map.
      const isAddon = p.occasionSlug === "event-add-ons" || (Array.isArray(p.categoryPath) && p.categoryPath[0] === "event-add-ons");
      if (isAddon) return;
      if (p.slug) map[p.slug] = { ...p, id: p.slug };
      if (p.id) map[p.id] = { ...p, id: p.id };
    });
  } catch { /* catalog falls back to its local seed/cache */ }
  return map;
}

export function getProduct(id) {
  if (typeof id !== "string") return null;
  const liveMap = getLiveProductsMap();
  return Object.prototype.hasOwnProperty.call(liveMap, id) ? liveMap[id] : null;
}

export function listProducts() {
  const liveMap = getLiveProductsMap();
  const seen = new Set();
  const list = [];
  for (const k of Object.keys(liveMap)) {
    const item = liveMap[k];
    const key = item.slug || item.id;
    if (!seen.has(key)) { seen.add(key); list.push(item); }
  }
  return list;
}

export function listSimilar(id, limit) {
  const current = getProduct(id);
  if (!current) return [];
  const max = typeof limit === "number" && limit > 0 ? limit : 4;
  return listProducts()
    .filter((p) => p.id !== current.id && p.category === current.category)
    .concat(listProducts().filter((p) => p.id !== current.id && p.category !== current.category))
    .slice(0, max);
}
