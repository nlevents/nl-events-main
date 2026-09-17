// City-based pricing.
//
// The city list and per-city multipliers now live in a single source of
// truth: ../data/cities.js. This module just applies that multiplier to a
// base (Ranchi) price. Everywhere a price is shown in the app, it should go
// through `cityPrice()` / `cityPriceLabel()` below so a single change in
// data/cities.js updates the whole site consistently.

import { CITY_MULTIPLIERS, getCityMultiplier } from "../data/cities";

export { CITY_MULTIPLIERS, getCityMultiplier };

// Adjusts a Ranchi base price for the given city, rounded to a clean ₹100.
// At Ranchi (multiplier ×1.00) the price passes through exactly unchanged —
// rounding only kicks in once a city's multiplier actually changes the price.
export function cityPrice(basePrice, city) {
  const n = Number(basePrice);
  if (!Number.isFinite(n)) return n;
  const multiplier = getCityMultiplier(city);
  if (multiplier === 1) return n;
  return Math.round((n * multiplier) / 100) * 100;
}

export function fmtINR(n) {
  return "₹" + Number(n).toLocaleString("en-IN");
}

// For fields that are sometimes a real number and sometimes a placeholder
// string like "Contact for pricing" — pass either through safely.
export function cityPriceLabel(price, city) {
  if (typeof price !== "number") return price; // e.g. "Contact for pricing"
  return fmtINR(cityPrice(price, city));
}
