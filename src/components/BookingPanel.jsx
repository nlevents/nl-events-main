import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCity } from "../context/CityContext";
import { useCart } from "../context/CartContext";
import { useToast } from "../context/ToastContext";
import { cityPrice, fmtINR } from "../lib/pricing";
import Icon from "./Icon";
import CitySelectModal from "./CitySelectModal";

const EVENT_TYPE_BY_OCCASION = {
  birthday: "Birthday Party",
  wedding: "Wedding Ceremony",
  anniversary: "Anniversary",
  "baby-shower": "Baby Shower",
  "newborn-welcome": "Naming Ceremony",
  corporate: "Corporate Event",
  "dummy-event": "Custom Celebration",
  "event-services": "Custom Celebration",
  "festivals-culture": "Custom Celebration",
  annaprashan: "Custom Celebration",
};

function detectEventType(product, explicitType) {
  if (explicitType) return explicitType;
  const occasionSlug = product?.occasionSlug || product?.occasion || product?.category;
  return EVENT_TYPE_BY_OCCASION[String(occasionSlug || "").toLowerCase()] || "Custom Celebration";
}

// Lightweight add-to-cart panel used by every product detail page
// (Shop-by-Occasion products and the flagship Packages). It only collects
// optional services + notes and adds the item to the cart. Date, time,
// guests, location type and address are asked later, in the cart, before
// checkout — nothing here is required.
//
// props:
//   product           { slug|id, name, image, price, originalPrice? } — base
//                      price is a Ranchi price; city pricing is applied
//                      wherever the item is displayed later.
//   productHref       path back to this product's detail page (stored on
//                      the cart item so "Edit" / "View product" can return here)
//   addons            [{ name, price }] — optional services
//   requiresTimeSlot  whether a time slot must be chosen (default true)
//   defaultEventType  pre-selects the Event/Appointment Type dropdown
export default function BookingPanel({ product, productHref, addons, requiresTimeSlot = true, defaultEventType }) {
  const { city } = useCity();
  const cart = useCart();
  const showToast = useToast();
  const navigate = useNavigate();

  // Services are admin-created catalog products. Resolve them from the
  // current product's occasion/category context so booking never renders a
  // hardcoded service list. Explicit product addons remain supported for
  // backwards compatibility, but no static fallback is appended.
  const [catalogServices, setCatalogServices] = useState([]);
  useEffect(() => {
    let cancelled = false;
    const load = () => import("../lib/catalogStore").then(({ getServiceProductsForContext }) => {
      const categoryPath = Array.isArray(product?.categoryPath) ? product.categoryPath : [];
      const context = categoryPath[0] === "event-services"
        ? ["event-services"]
        : categoryPath.length
          ? categoryPath
          : [product?.occasionSlug].filter(Boolean);
      const services = getServiceProductsForContext(context);
      if (!cancelled) setCatalogServices(services);
    }).catch(() => { if (!cancelled) setCatalogServices([]); });
    load();
    window.addEventListener("nle-catalog-updated", load);
    return () => { cancelled = true; window.removeEventListener("nle-catalog-updated", load); };
  }, [product?.id, product?.slug, product?.occasionSlug, JSON.stringify(product?.categoryPath || [])]);

  const addonList = useMemo(() => {
    const own = Array.isArray(addons) ? addons : [];
    const ownNames = new Set(own.map((a) => a.name));
    const live = catalogServices.filter((service) => !ownNames.has(service.name));
    return [...own, ...live];
  }, [addons, catalogServices]);

  const [selectedAddons, setSelectedAddons] = useState({});
  const [showAllServices, setShowAllServices] = useState(false);
  const addonIds = useRef({});
  const detectedEventType = detectEventType(product, defaultEventType);
  const eventType = detectedEventType;
  const [notes, setNotes] = useState("");
  const [cityModalOpen, setCityModalOpen] = useState(false);

  const basePrice = cityPrice(product.price, city);
  const originalPrice = typeof product.originalPrice === "number" ? cityPrice(product.originalPrice, city) : null;
  const discount = originalPrice && originalPrice > basePrice ? Math.round((1 - basePrice / originalPrice) * 100) : 0;

  const addonsTotal = useMemo(
    () => Object.values(selectedAddons).reduce((s, p) => s + cityPrice(p, city), 0),
    [selectedAddons, city]
  );
  const total = basePrice + addonsTotal;

  function toggleAddon(addon) {
    setSelectedAddons((prev) => {
      const next = { ...prev };
      if (next[addon.name] !== undefined) {
        delete next[addon.name];
      } else {
        next[addon.name] = addon.price;
        if (addon.id) addonIds.current[addon.name] = addon.id;
      }
      return next;
    });
  }

  // Lets the "Add-on Services" section on the product page add/remove a
  // service in this booking panel, and keeps both in sync.
  useEffect(() => {
    const onToggle = (e) => {
      const a = e?.detail;
      if (a?.name) toggleAddon(a);
    };
    window.addEventListener("nle-toggle-addon", onToggle);
    return () => window.removeEventListener("nle-toggle-addon", onToggle);
  }, []);
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("nle-addons-selected", { detail: Object.keys(selectedAddons) }));
  }, [selectedAddons]);

  function handleAddToCart() {
    if (!cart || typeof cart.addBooking !== "function") {
      showToast("Cart is unavailable. Please refresh the page and try again.");
      return;
    }
    const addonsArr = Object.keys(selectedAddons).map((name) => ({ name, price: selectedAddons[name], ...(addonIds.current[name] ? { id: addonIds.current[name] } : {}) }));
    cart.addBooking({
      slug: product.slug || product.id,
      name: product.name,
      image: product.image,
      href: productHref,
      unitPrice: product.price,
      originalPrice: typeof product.originalPrice === "number" ? product.originalPrice : null,
      quantity: 1,
      city,
      locationType: "",
      address: "",
      eventDate: "",
      timeSlot: "",
      guestCount: "",
      eventType,
      addons: addonsArr,
      notes: notes.trim(),
    });
    showToast(product.name + " added to your cart");
    navigate("/cart");
  }

  // Lets the mobile bottom bar trigger the same actions (always latest state).
  const barActions = useRef({});
  barActions.current = { add: handleAddToCart, whatsapp: handleWhatsAppEnquiry };
  useEffect(() => {
    const onAdd = () => barActions.current.add && barActions.current.add();
    const onWhatsApp = () => barActions.current.whatsapp && barActions.current.whatsapp();
    window.addEventListener("nle-bar-add-to-cart", onAdd);
    window.addEventListener("nle-bar-whatsapp", onWhatsApp);
    return () => {
      window.removeEventListener("nle-bar-add-to-cart", onAdd);
      window.removeEventListener("nle-bar-whatsapp", onWhatsApp);
    };
  }, []);

  function handleWhatsAppEnquiry() {
    const msg =
      "Hi Next Level Events! I'd like to enquire about:\n\n" +
      "• " + product.name + " (" + city + ")" +
      "\n\nCould you share availability and next steps?";
    window.open("https://wa.me/917903133317?text=" + encodeURIComponent(msg), "_blank", "noopener,noreferrer");
  }

  return (
    <div className="summary-box booking-panel" id="booking-panel">
      <h3 style={{ fontSize: 17, marginBottom: 4 }}>Add to Your Cart</h3>
      <div className="pd-price-row">
        <b>{fmtINR(basePrice)}</b>
        {originalPrice ? <s>{fmtINR(originalPrice)}</s> : null}
        {discount > 0 ? <span className="occ-prod-off">{discount}% OFF</span> : null}
      </div>
      {city !== "Ranchi" && (
        <p style={{ color: "var(--text-secondary)", fontSize: 12, marginTop: 4 }}>
          Price adjusted for {city} over our Ranchi base rate.
        </p>
      )}

      <div className="form-group" style={{ marginTop: 18 }}>
        <label>Event Location</label>
        <div className="booking-location-card">
          <span className="booking-location-pin"><Icon name="pin" /></span>
          <div className="booking-location-body">
            <div className="booking-location-top"><b>{city}</b><span className="booking-location-available"><Icon name="check" />Available</span></div>
            <p>We set up within 30 km across {city}{city !== "Ranchi" ? " — pricing adjusted for this location" : ""}.</p>
          </div>
          <button type="button" className="booking-location-change" onClick={() => setCityModalOpen(true)}>Change<Icon name="chevronRight" /></button>
        </div>
      </div>

      {addonList.length > 0 && (
        <div className="form-group">
          <label>Services</label>
          <div className={"addon-list" + (showAllServices ? " addon-list-expanded" : "")}>
            {addonList.map((addon) => {
              const added = selectedAddons[addon.name] !== undefined;
              return (
                <div className="addon-item" key={addon.name}>
                  <div className="addon-info"><h4>{addon.name}</h4><span>{fmtINR(cityPrice(addon.price, city))}</span></div>
                  <button type="button" className={"addon-btn" + (added ? " added" : "")} onClick={() => toggleAddon(addon)}>
                    {added ? "Added" : "Add"}
                  </button>
                </div>
              );
            })}
          </div>
          {addonList.length > 5 && (
            <button
              type="button"
              className="addon-show-toggle"
              onClick={() => setShowAllServices((value) => !value)}
              aria-expanded={showAllServices}
            >
              <span>{showAllServices ? "Show Less" : `Show All ${addonList.length} Services`}</span>
              <span aria-hidden="true" className={"addon-show-chevron" + (showAllServices ? " is-open" : "")}>⌄</span>
            </button>
          )}
        </div>
      )}

      <div className="form-group">
        <label htmlFor="bk-notes">Customisation Notes (optional)</label>
        <textarea id="bk-notes" maxLength={400} placeholder="Colour theme, must-have props, special requests…" value={notes} onChange={(e) => setNotes(e.target.value)}></textarea>
      </div>

      <div className="summary-row"><span>{product.name}</span><span>{fmtINR(total)}</span></div>
      <div className="summary-row total"><span>Estimated Total</span><span className="amt">{fmtINR(total)}</span></div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
        <button className="btn btn-primary btn-block" type="button" onClick={handleAddToCart}>Add to Cart</button>
        <button className="btn btn-ghost btn-block" type="button" onClick={handleWhatsAppEnquiry}>
          <Icon name="whatsapp" /><span>Quick WhatsApp Enquiry</span>
        </button>
      </div>
      <p className="booking-disclaimer">No payment is taken now. Adding to cart reserves nothing — you'll choose date, time, guests and venue in your cart before checkout.</p>

      <CitySelectModal open={cityModalOpen} onClose={() => setCityModalOpen(false)} />
    </div>
  );
}
