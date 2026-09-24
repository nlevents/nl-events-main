import { IMAGES } from "./images";

// ===========================================================
// EVENT SERVICES — shown below "Explore {Occasion}" on every
// Shop-by-Occasion page (CategoryTemplate, all depths).
//
// GLOBAL_ADDONS appear on every single category/theme/occasion page.
// EXTRA_ADDONS_BY_OCCASION appends occasion-specific extras, keyed by
// the top-level occasion slug (trail[0].slug) — e.g. Wedding gets
// "Wedding Activities" and "Baraat Entry" on top of the global three.
// ===========================================================

// Every service below is a subcategory (browse & pick a specific product),
// not a flat single item — `href` means "navigate to that occasion node",
// not "add to cart". See data/occasions.js for the matching node + its
// products (each service's slug matches an occasion/category slug there).
export const GLOBAL_ADDONS = [
  {
    slug: "sfx",
    label: "SFX",
    subLabel: "Cold pyro, fog & fireworks",
    image: IMAGES.showcase7,
    price: 3499,
    icon: "sparkle",
    href: "/occasion/event-services/sfx",
  },
  {
    slug: "artists",
    label: "Artists",
    subLabel: "Dancers, anchors & live acts",
    image: IMAGES.galConcert2,
    price: 9999,
    icon: "user",
    href: "/occasion/event-services/artists",
  },
  {
    slug: "photography",
    label: "Photography",
    subLabel: "Candid, cinematic & drone",
    image: IMAGES.typePhotography,
    price: 14999,
    icon: "image",
    href: "/occasion/event-services/photography",
  },
];

export const EXTRA_ADDONS_BY_OCCASION = {
  birthday: [
    {
      slug: "birthday-entertainment",
      label: "Birthday Entertainment",
      subLabel: "Hosts, games & kids entertainment",
      image: IMAGES.galConcert2,
      price: 0,
      icon: "sparkle",
      href: "/occasion/event-services/artists",
    },
    {
      slug: "kids-activities",
      label: "Kids Activities",
      subLabel: "Games, activities & fun zones",
      image: IMAGES.themeBalloonCelebration,
      price: 0,
      icon: "star",
      href: "/occasion/event-services/wedding-activity",
    },
  ],
  wedding: [
    {
      slug: "wedding-activity",
      label: "Wedding Activity",
      subLabel: "Games, rituals & guest engagement",
      image: IMAGES.showcase3,
      price: 6999,
      icon: "sparkle",
      href: "/occasion/event-services/wedding-activity",
    },
    {
      slug: "baraat-procession",
      label: "Baraat Procession",
      subLabel: "Dhol, band & entry styling",
      image: IMAGES.themeStageLights,
      price: 12999,
      icon: "compass",
      href: "/occasion/event-services/baraat-procession",
    },
  ],
};


// These are the actual sellable service products. They live in the Event Services
// catalog branch and are intentionally separate from normal decoration packages.
export const SEED_ADDON_PRODUCTS = [
  { slug: "cold-pyro", name: "Cold Pyro", categorySlug: "sfx", price: 3499, originalPrice: 4499, shortDesc: "Indoor-friendly cold spark special effects for entries and stages.", image: IMAGES.showcase7, includes: ["Cold pyro machines", "Operator", "Setup & takedown"] },
  { slug: "fog-machine", name: "Fog Machine", categorySlug: "sfx", price: 3999, originalPrice: 4999, shortDesc: "Atmospheric fog effects for stage and dance-floor moments.", image: IMAGES.showcase7, includes: ["Fog machine", "Fog fluid", "Operator"] },
  { slug: "fireworks", name: "Fireworks", categorySlug: "sfx", price: 5999, originalPrice: 7499, shortDesc: "Celebration fireworks coordinated around your event schedule and venue rules.", image: IMAGES.showcase7, includes: ["Firework selection", "Professional operator", "Event coordination"] },
  { slug: "anchor-host", name: "Anchor / Host", categorySlug: "artists", price: 9999, originalPrice: 11999, shortDesc: "Professional event host for guest engagement and stage flow.", image: IMAGES.galConcert2, includes: ["Professional anchor", "Event coordination", "Stage hosting"] },
  { slug: "dance-performance", name: "Dance Performance", categorySlug: "artists", price: 8999, originalPrice: 10999, shortDesc: "Live dance performance curated for your celebration.", image: IMAGES.galConcert2, includes: ["Dance performers", "Performance set", "Event coordination"] },
  { slug: "candid-photography", name: "Candid Photography", categorySlug: "photography", price: 14999, originalPrice: 17999, shortDesc: "Natural candid coverage focused on people, moments and details.", image: IMAGES.typePhotography, includes: ["Candid photographer", "Event coverage", "Edited photographs"] },
  { slug: "cinematic-video", name: "Cinematic Video", categorySlug: "photography", price: 19999, originalPrice: 23999, shortDesc: "Cinematic event film coverage with polished editing.", image: IMAGES.typePhotography, includes: ["Cinematic videographer", "Event coverage", "Edited highlight film"] },
  { slug: "drone-coverage", name: "Drone Coverage", categorySlug: "photography", price: 9999, originalPrice: 11999, shortDesc: "Aerial event footage where venue and regulations permit.", image: IMAGES.typePhotography, includes: ["Drone operator", "Aerial footage", "Edited clips"] },
  { slug: "wedding-games", name: "Wedding Games", categorySlug: "wedding-activity", price: 6999, originalPrice: 8499, shortDesc: "Interactive games and activities to keep wedding guests engaged.", image: IMAGES.showcase3, includes: ["Curated games", "Activity coordination", "Host support"] },
  { slug: "baraat-dhol-band", name: "Baraat Dhol & Band", categorySlug: "baraat-procession", price: 12999, originalPrice: 14999, shortDesc: "Dhol, band and coordinated baraat entry entertainment.", image: IMAGES.themeStageLights, includes: ["Dhol / band performers", "Entry coordination", "Event support"] },
];

// Combines global services with any extras for this occasion tree. `trail`
// is the ancestor chain from the resolved node, so trail[0] is always the
// top-level occasion regardless of how deep the current page sits.
export function addonsFor(trail) {
  const topSlug = Array.isArray(trail) && trail.length > 0 ? trail[0].slug : null;
  const extras = (topSlug && EXTRA_ADDONS_BY_OCCASION[topSlug]) || [];
  return [...GLOBAL_ADDONS, ...extras];
}
