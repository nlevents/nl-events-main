import { useMemo } from "react";
import { onImgError } from "../../lib/imageFallback";

const VENUES = [
  { key: "home", label: "Home" },
  { key: "banquet", label: "Banquet" },
  { key: "resort", label: "Resort" },
  { key: "rooftop", label: "Rooftop" },
  { key: "pool-area", label: "Pool Area" },
  { key: "lawn", label: "Lawn" },
];

function venueForProduct(product) {
  if (!product) return "all";
  if (product.venue) return product.venue;
  const text = [product.name, product.setupType, product.shortDesc].filter(Boolean).join(" ").toLowerCase();
  if (/rooftop|skyline|terrace/.test(text)) return "rooftop";
  if (/poolside|pool area|pool party|pool lounge|floating pool/.test(text)) return "pool-area";
  if (/banquet|ballroom|banquet hall/.test(text)) return "banquet";
  if (/resort|beachside|destination/.test(text)) return "resort";
  if (/lawn|garden|outdoor/.test(text)) return "lawn";
  if (/home|living room|balcony|staircase/.test(text)) return "home";
  return "all";
}

export function getVenueForProduct(product) {
  return venueForProduct(product);
}

export default function VenueRail({ products, activeVenue, onVenueChange, imageFallback }) {
  const venueImages = useMemo(() => {
    const map = {};
    (products || []).forEach((p) => {
      const key = venueForProduct(p);
      if (key !== "all" && !map[key] && p.image) map[key] = p.image;
    });
    return map;
  }, [products]);

  if (!Array.isArray(products) || products.length === 0) return null;

  const items = [...VENUES, { key: "all", label: "See All" }];
  const fallback = imageFallback || products[0]?.image;

  return (
    <section className="venue-picker occ-block" aria-label="Choose venue">
      <div className="section-head reveal">
        <h2>Choose Your Venue</h2>
        <p>Browse the same venue options used in our decoration catalogue.</p>
      </div>
      <div className="venue-rail reveal">
        {items.map((item) => {
          const active = activeVenue === item.key;
          const src = item.key === "all" ? fallback : (venueImages[item.key] || fallback);
          return (
            <button
              key={item.key}
              type="button"
              className={`venue-card${active ? " active" : ""}`}
              onClick={() => onVenueChange(item.key)}
              aria-pressed={active}
            >
              <span className="venue-card-image">
                <img src={src} alt={item.label} loading="lazy" onError={onImgError} />
              </span>
              <span className="venue-card-label">{item.label}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
