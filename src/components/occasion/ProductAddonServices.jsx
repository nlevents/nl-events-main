import { useEffect, useState } from "react";
import { useCity } from "../../context/CityContext";
import { cityPrice, fmtINR } from "../../lib/pricing";
import { onImgError } from "../../lib/imageFallback";

// "Add-on Services" block on the product details page. It lists the live
// services (admin → Services) that apply to this product's occasion/function
// and lets the shopper add them to the booking in one tap. The booking panel
// owns the selection; this block talks to it through window events, so a
// service added here appears in the booking panel (and vice-versa).
function contextFor(product) {
  const categoryPath = Array.isArray(product?.categoryPath) ? product.categoryPath : [];
  if (categoryPath[0] === "event-services") return ["event-services"];
  if (categoryPath.length) return categoryPath;
  return [product?.occasionSlug].filter(Boolean);
}

export default function ProductAddonServices({ product }) {
  const { city } = useCity();
  const [services, setServices] = useState([]);
  const [selected, setSelected] = useState([]);
  const pathKey = JSON.stringify(product?.categoryPath || []);

  useEffect(() => {
    let cancelled = false;
    const load = () => import("../../lib/catalogStore").then(({ getServiceProductsForContext }) => {
      if (!cancelled) setServices(getServiceProductsForContext(contextFor(product)));
    }).catch(() => { if (!cancelled) setServices([]); });
    load();
    window.addEventListener("nle-catalog-updated", load);
    return () => { cancelled = true; window.removeEventListener("nle-catalog-updated", load); };
  }, [product?.id, product?.slug, product?.occasionSlug, pathKey]);

  useEffect(() => {
    const onSel = (e) => setSelected(Array.isArray(e?.detail) ? e.detail : []);
    window.addEventListener("nle-addons-selected", onSel);
    return () => window.removeEventListener("nle-addons-selected", onSel);
  }, []);

  if (!services.length) return null;

  return (
    <div className="pd-market-section reveal" id="product-addon-services">
      <div className="pd-section-heading"><h2>Add-on Services</h2></div>
      <div className="addon-list">
        {services.map((service) => {
          const added = selected.includes(service.name);
          return (
            <div className="addon-item" key={service.id || service.slug || service.name}>
              {service.image ? (
                <img
                  src={service.image}
                  alt={service.name}
                  loading="lazy"
                  decoding="async"
                  onError={onImgError}
                  style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 8, flex: "0 0 auto", marginRight: 12 }}
                />
              ) : null}
              <div className="addon-info" style={{ flex: "1 1 auto", minWidth: 0 }}>
                <h4>{service.name}</h4>
                <span>{fmtINR(cityPrice(service.price, city))}</span>
              </div>
              <button
                type="button"
                className={"addon-btn" + (added ? " added" : "")}
                onClick={() => window.dispatchEvent(new CustomEvent("nle-toggle-addon", { detail: { id: service.id, name: service.name, price: service.price } }))}
              >
                {added ? "Added" : "Add"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
