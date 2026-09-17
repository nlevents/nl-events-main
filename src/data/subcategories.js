// Reusable subcategory structure, grouped by parent category slug (matches
// the keys in ./categories.js). This formalises subcategories that already
// existed informally as scattered links (Home.jsx tiles, nav.js search
// index) into one data source, so future UI (subcategory chips, filters,
// landing sections) can read from a single place instead of re-typing hrefs.
//
// `href` points at an in-page anchor on the parent category page for now
// (no new routes are introduced in this phase).

import { IMAGES } from "./images";

export const SUBCATEGORIES = {
  weddings: [
    { slug: "anniversaries", label: "Anniversaries", href: "/occasion/anniversary", img: IMAGES.typeAnniversary },
  ],
  birthdays: [
    { slug: "kids", label: "Kids Birthday", href: "/occasion/birthday/kids-birthday", img: IMAGES.typeKidsBirthday },
  ],
  concerts: [],
  corporate: [],
  "custom-events": [
    { slug: "baby-shower", label: "Baby Shower", href: "/occasion/baby-shower", img: IMAGES.typeBabyShower },
    { slug: "newborn-welcome", label: "Newborn Welcome", href: "/occasion/newborn-welcome", img: IMAGES.typeNewbornWelcome },
  ],
};

export function listSubcategories(categorySlug) {
  if (!Object.prototype.hasOwnProperty.call(SUBCATEGORIES, categorySlug)) return [];
  return SUBCATEGORIES[categorySlug];
}
