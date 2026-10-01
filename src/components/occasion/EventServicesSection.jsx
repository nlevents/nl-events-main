import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { onImgError } from "../../lib/imageFallback";
import AutoScrollRail from "../AutoScrollRail";
import { EVENT_SERVICES, eventServiceHref } from "../../data/eventServices";
import { getServiceProductsForContext, getAddonsForOccasion } from "../../lib/catalogStore";
import { trackServiceCategoryClick } from "../../lib/siteEvents";

function availableServiceSlugs(contextPath = []) {
  const slugs = new Set();
  try {
    getServiceProductsForContext(contextPath).forEach((product) => {
      const path = Array.isArray(product?.categoryPath) ? product.categoryPath : [];
      if (path[0] === "event-services" && path[1]) slugs.add(path[1]);
    });
  } catch {
    // Keep the storefront safe if catalog hydration is temporarily unavailable.
  }
  return slugs;
}

// Shared storefront service rail. Categories are still defined by the same
// canonical ten-service list, but only categories with at least one live
// service matching the current occasion/function context are rendered.
export default function EventServicesSection({ contextPath = [] }) {
  const contextKey = Array.isArray(contextPath) ? contextPath.join("/") : "";
  const [visibleSlugs, setVisibleSlugs] = useState(() => availableServiceSlugs(contextPath));

  useEffect(() => {
    const refresh = () => setVisibleSlugs(availableServiceSlugs(contextPath));
    refresh();
    window.addEventListener("nle-catalog-updated", refresh);
    return () => window.removeEventListener("nle-catalog-updated", refresh);
  }, [contextKey]);

  const liveServiceCards = (() => {
    try {
      const topSlug = Array.isArray(contextPath) && contextPath.length ? contextPath[0] : "event-services";
      return getAddonsForOccasion(topSlug, contextPath).reduce((map, item) => {
        if (item?.slug) map.set(item.slug, item);
        return map;
      }, new Map());
    } catch {
      return new Map();
    }
  })();

  // Keep the canonical service list/order/labels, but use the admin-managed
  // category image when one exists. Previously this rail always used the
  // static EVENT_SERVICES image, so changing a service category image in
  // Admin -> Event Services never reached the public website.
  const visibleServices = EVENT_SERVICES
    .filter((service) => visibleSlugs.has(service.slug))
    .map((service) => {
      const live = liveServiceCards.get(service.slug);
      return live?.image ? { ...service, image: live.image } : service;
    });
  if (!visibleServices.length) return null;

  return (
    <section className="occ-services-section">
      <div className="occ-services-container">
        <div className="occ-services-head">
          <h2>Everything You Need for Your Event</h2>
          <Link to={eventServiceHref("", contextPath)}>Explore all services →</Link>
        </div>
        <p className="occ-services-intro">One team. All your event needs. Hassle-free planning, stunning execution.</p>

        <AutoScrollRail
          className="occ-services-rail"
          selector=".occ-service-card"
          interval={4000}
          wrapperClassName="occ-services-slider-wrap"
        >
          {visibleServices.map((service) => (
            <Link
              className="occ-service-card"
              to={eventServiceHref(service.slug, contextPath)}
              key={service.slug}
              onClick={() => trackServiceCategoryClick({
                serviceCategory: service.slug,
                occasion: contextPath[0],
                functionPath: contextPath.slice(1).join("/"),
              })}
            >
              <img src={service.image} alt={service.label} loading="lazy" decoding="async" onError={onImgError} />
              <strong>{service.label}</strong>
              <span>{service.sub}</span>
            </Link>
          ))}
        </AutoScrollRail>
      </div>
    </section>
  );
}
