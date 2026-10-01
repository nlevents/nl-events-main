import { CATALOG_IMAGES, IMAGES } from "./images";

// Single source of truth for the service categories shown throughout the
// storefront. Every page uses this same list, labels, slugs and artwork.
export const EVENT_SERVICES = [
  { slug: "decor", label: "Décor", sub: "Packages & elements", image: CATALOG_IMAGES.decor },
  { slug: "entry-concept", label: "Entry Concept", sub: "Grand & unique entries", image: IMAGES.showcase4 },
  { slug: "entertainment", label: "Entertainment", sub: "Artists, DJ & live bands", image: CATALOG_IMAGES.entertainment },
  { slug: "sound-technical", label: "Sound & Technical", sub: "Lighting, AV, sound & effects", image: CATALOG_IMAGES["sound-technical"] },
  { slug: "tent-furniture", label: "Tent & Furniture", sub: "Tents, seating & tables", image: CATALOG_IMAGES["tent-furniture"] },
  { slug: "photography-videography", label: "Photography & Videography", sub: "Capture every moment", image: CATALOG_IMAGES["photography-videography"] },
  { slug: "catering", label: "Catering", sub: "Delicious food experiences", image: CATALOG_IMAGES.catering },
  { slug: "baraat-procession", label: "Baraat / Procession", sub: "Make an unforgettable entry", image: CATALOG_IMAGES["baraat-procession"] },
  { slug: "wedding-activity", label: "Wedding Activity", sub: "Games & guest experiences", image: IMAGES.showcase3 },
  { slug: "other-services", label: "Other Services", sub: "More event services", image: IMAGES.showcase8 },
];

export const EVENT_SERVICE_BY_SLUG = Object.fromEntries(EVENT_SERVICES.map((service) => [service.slug, service]));

export function eventServiceHref(slug, contextPath = []) {
  const params = new URLSearchParams();
  if (slug) params.set("service", slug);
  if (Array.isArray(contextPath) && contextPath.length) params.set("context", contextPath.join("/"));
  const query = params.toString();
  return `/occasion/event-services${query ? `?${query}` : ""}`;
}
