// Single source of truth for serviceable cities and their pricing multipliers.
//
// Previously the city list (nav.js) and the price multipliers (lib/pricing.js)
// were two separate hand-maintained lists keyed by the same city name string —
// easy to let drift out of sync (a typo in one place silently breaks pricing
// for that city). This file is now the only place city data is defined;
// everything else derives from it.
//
// Ranchi is home base (no travel/logistics overhead), so it's the baseline
// (×1.00). Every other district carries a small surcharge reflecting travel,
// vendor availability and setup logistics — bigger, better-connected cities
// carry a smaller surcharge than remote districts. These multipliers are
// placeholders; swap them for real numbers whenever available.

export const CITIES_DATA = [
  { name: "Ranchi", multiplier: 1.00 },
  { name: "Jamshedpur", multiplier: 1.05 },
  { name: "Deoghar", multiplier: 1.15 },
  { name: "Dumka", multiplier: 1.18 },
  { name: "Dhanbad", multiplier: 1.05 },
  { name: "Bokaro", multiplier: 1.08 },
  { name: "Chatra", multiplier: 1.20 },
  { name: "East Singhbhum", multiplier: 1.05 },
  { name: "Garhwa", multiplier: 1.20 },
  { name: "Giridih", multiplier: 1.15 },
  { name: "Godda", multiplier: 1.18 },
  { name: "Gumla", multiplier: 1.20 },
  { name: "Hazaribagh", multiplier: 1.10 },
  { name: "Jamtara", multiplier: 1.18 },
  { name: "Khunti", multiplier: 1.15 },
  { name: "Koderma", multiplier: 1.15 },
  { name: "Latehar", multiplier: 1.20 },
  { name: "Lohardaga", multiplier: 1.18 },
  { name: "Pakur", multiplier: 1.20 },
  { name: "Palamu", multiplier: 1.15 },
  { name: "Ramgarh", multiplier: 1.10 },
  { name: "Sahibganj (Sahebganj)", multiplier: 1.20 },
  { name: "Saraikela-Kharsawan", multiplier: 1.10 },
  { name: "Simdega", multiplier: 1.20 },
  { name: "West Singhbhum", multiplier: 1.15 },
];

export const DEFAULT_CITY = "Ranchi";
export const DEFAULT_CITY_MULTIPLIER = 1.15; // fallback for any city not in the list above

// Flat array of city names — used by the city picker UI and CityContext.
export const CITIES = CITIES_DATA.map((c) => c.name);

// name -> multiplier lookup, kept for any code that wants the raw map.
export const CITY_MULTIPLIERS = CITIES_DATA.reduce((acc, c) => {
  acc[c.name] = c.multiplier;
  return acc;
}, {});

export function isKnownCity(city) {
  return typeof city === "string" && Object.prototype.hasOwnProperty.call(CITY_MULTIPLIERS, city);
}

export function getCityMultiplier(city) {
  return isKnownCity(city) ? CITY_MULTIPLIERS[city] : DEFAULT_CITY_MULTIPLIER;
}
