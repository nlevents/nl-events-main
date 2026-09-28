import { IMAGES } from "./images";

import { getProducts as getLiveProducts, getProduct as getLiveProduct } from "../lib/catalogStore";

export const PRODUCTS = {};

export function getProduct(id) {
  if (typeof id !== "string" || !id) return null;
  return getLiveProduct(id);
}

export function listProducts() {
  return getLiveProducts();
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
