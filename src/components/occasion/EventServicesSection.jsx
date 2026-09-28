import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CATALOG_IMAGES, IMAGES } from "../../data/images";
import { onImgError } from "../../lib/imageFallback";
import AutoScrollRail from "../AutoScrollRail";
import { getAddonCategoryOptions } from "../../lib/catalogStore";

const FALLBACK_IMAGE = IMAGES.showcase7;

function loadServiceCategories() {
  try {
    return getAddonCategoryOptions()
      .filter((item) => Array.isArray(item.path) && item.path.length === 2)
      .filter((item) => item.active !== false)
      .map((item) => ({
        label: item.label || item.node?.label || "Service",
        sub: item.description || "Event service",
        img: item.image || CATALOG_IMAGES[item.slug] || FALLBACK_IMAGE,
        slug: item.slug,
        productCount: Number(item.productCount) || 0,
      }));
  } catch {
    return [];
  }
}

export default function EventServicesSection() {
  const [categories, setCategories] = useState(loadServiceCategories);

  useEffect(() => {
    const refresh = () => setCategories(loadServiceCategories());
    window.addEventListener("nle-catalog-updated", refresh);
    return () => window.removeEventListener("nle-catalog-updated", refresh);
  }, []);

  if (!categories.length) return null;

  return (
    <section className="occ-services-section">
      <div className="occ-services-container">
        <div className="occ-services-head">
          <h2>Everything You Need for Your Event</h2>
          <Link to="/occasion/event-services">Explore all services →</Link>
        </div>
        <p className="occ-services-intro">One team. All your event needs. Hassle-free planning, stunning execution.</p>

        <AutoScrollRail
          className="occ-services-rail"
          selector=".occ-service-card"
          interval={4000}
          wrapperClassName="occ-services-slider-wrap"
        >
          {categories.map((item) => (
            <Link className="occ-service-card" to={`/occasion/event-services/${item.slug}`} key={item.slug}>
              <img src={item.img} alt={item.label} loading="lazy" decoding="async" onError={onImgError} />
              <strong>{item.label}</strong>
              <span>{item.sub}</span>
            </Link>
          ))}
        </AutoScrollRail>
      </div>
    </section>
  );
}
