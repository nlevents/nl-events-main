import { IMAGES } from "./images";

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

export function getProduct(id) {
  if (typeof id !== "string") return null;
  return Object.prototype.hasOwnProperty.call(PRODUCTS, id) ? PRODUCTS[id] : null;
}

export function listProducts() {
  const seen = new Set();
  return Object.keys(PRODUCTS)
    .map((key) => PRODUCTS[key])
    .filter((item) => {
      const id = item?.slug || item?.id;
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
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
