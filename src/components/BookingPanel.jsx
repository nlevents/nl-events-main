import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCity } from "../context/CityContext";
import { useCart } from "../context/CartContext";
import { useToast } from "../context/ToastContext";
import { cityPrice, fmtINR } from "../lib/pricing";
import { LOCATION_TYPE_OPTIONS, TIME_SLOT_OPTIONS, DEFAULT_ADDONS, todayISO, nextDates } from "../data/booking";
import Icon from "./Icon";
import CitySelectModal from "./CitySelectModal";

const DATE_STRIP_DAYS = 10;

const EVENT_TYPE_BY_OCCASION = {
  birthday: "Birthday Party",
  wedding: "Wedding Ceremony",
  anniversary: "Anniversary",
  "baby-shower": "Baby Shower",
  "newborn-welcome": "Naming Ceremony",
  corporate: "Corporate Event",
  "dummy-event": "Custom Celebration",
  "event-add-ons": "Custom Celebration",
  "festivals-culture": "Custom Celebration",
  annaprashan: "Custom Celebration",
};

function detectEventType(product, explicitType) {
  if (explicitType) return explicitType;
  const occasionSlug = product?.occasionSlug || product?.occasion || product?.category;
  return EVENT_TYPE_BY_OCCASION[String(occasionSlug || "").toLowerCase()] || "Custom Celebration";
}

function formatPickedDate(iso) {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

// Reusable booking-configuration panel used by every product detail page
// (Shop-by-Occasion products and the flagship Packages). Fully self
// contained: manages its own form state and validation, then hands a
// complete, self-describing booking object to the cart — every field the
// cart/checkout/confirmation steps need travels with it from this point on.
//
// props:
//   product           { slug|id, name, image, price, originalPrice? } — base
//                      price is a Ranchi price; city pricing is applied
//                      wherever the item is displayed later.
//   productHref       path back to this product's detail page (stored on
//                      the cart item so "Edit" / "View product" can return here)
//   addons            [{ name, price }] — optional add-on services
//   requiresTimeSlot  whether a time slot must be chosen (default true)
//   defaultEventType  pre-selects the Event/Appointment Type dropdown
export default function BookingPanel({ product, productHref, addons, requiresTimeSlot = true, defaultEventType }) {
  const { city } = useCity();
  const cart = useCart();
  const showToast = useToast();
  const navigate = useNavigate();

  // Product-specific addons (set via Admin) come first; any default addon
  // not already offered by the product is appended after, so every booking
  // always has extra services the user can add — not just products that
  // happen to have their own addons configured.
  const addonList = useMemo(() => {
    const own = Array.isArray(addons) ? addons : [];
    const ownNames = new Set(own.map((a) => a.name));
    const extras = DEFAULT_ADDONS.filter((a) => !ownNames.has(a.name));
    return [...own, ...extras];
  }, [addons]);

  const [selectedAddons, setSelectedAddons] = useState({});
  const detectedEventType = detectEventType(product, defaultEventType);
  const [eventType, setEventType] = useState(detectedEventType);
  const [locationType, setLocationType] = useState("");
  const [address, setAddress] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [timeSlot, setTimeSlot] = useState("");
  const [guestCount, setGuestCount] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState({});
  const [cityModalOpen, setCityModalOpen] = useState(false);
  const dateInputRef = useRef(null);

  const dateStrip = useMemo(() => nextDates(DATE_STRIP_DAYS), []);
  const stripHasSelected = eventDate ? dateStrip.some((d) => d.iso === eventDate) : true;

  function openMoreDates() {
    const el = dateInputRef.current;
    if (!el) return;
    if (typeof el.showPicker === "function") {
      try { el.showPicker(); return; } catch { /* fall through */ }
    }
    el.focus();
    el.click();
  }

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
      }
      return next;
    });
  }

  function validate() {
    const next = {};
    if (!eventType) next.eventType = "Please select an event type.";
    if (!locationType) next.locationType = "Please select a location type.";
    if (!guestCount) next.guestCount = "Please select the guest count.";
    if (!eventDate) next.eventDate = "Please pick an event date.";
    else {
      const picked = new Date(eventDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (picked < today) next.eventDate = "Please pick a future date.";
    }
    setErrors(next);
    if (Object.keys(next).length > 0) {
      const first = Object.keys(next)[0];
      const idMap = { eventType: "bk-event-type", locationType: "bk-location-type", address: "bk-address", eventDate: "bk-event-date", timeSlot: "bk-slot", guestCount: "bk-guest-count" };
      const el = document.getElementById(idMap[first]);
      if (el) { el.scrollIntoView({ behavior: "smooth", block: "center" }); try { el.focus(); } catch {} }
    }
    return Object.keys(next).length === 0;
  }

  function handleAddToCart() {
    if (!cart || typeof cart.addBooking !== "function") {
      showToast("Cart is unavailable. Please refresh the page and try again.");
      return;
    }
    const complete = validate();
    const addonsArr = Object.keys(selectedAddons).map((name) => ({ name, price: selectedAddons[name] }));
    cart.addBooking({
      slug: product.slug || product.id,
      name: product.name,
      image: product.image,
      href: productHref,
      unitPrice: product.price,
      originalPrice: typeof product.originalPrice === "number" ? product.originalPrice : null,
      quantity: 1,
      city,
      locationType,
      address: address.trim(),
      eventDate,
      timeSlot: requiresTimeSlot ? timeSlot : "",
      guestCount,
      eventType,
      addons: addonsArr,
      notes: notes.trim(),
    });
    showToast(complete ? product.name + " added to your cart" : product.name + " added — complete the booking details in your cart");
    navigate("/cart");
  }

  function handleWhatsAppEnquiry() {
    const msg =
      "Hi Next Level Events! I'd like to enquire about:\n\n" +
      "• " + product.name + " (" + city + ")" +
      (eventDate ? "\nPreferred date: " + eventDate : "") +
      "\n\nCould you share availability and next steps?";
    window.open("https://wa.me/917903133317?text=" + encodeURIComponent(msg), "_blank", "noopener,noreferrer");
  }

  function errStyle(key) {
    return errors[key] ? { borderColor: "#d16a5a" } : undefined;
  }

  return (
    <div className="summary-box booking-panel" id="booking-panel">
      <h3 style={{ fontSize: 17, marginBottom: 4 }}>Configure Your Booking</h3>
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
        <label htmlFor="bk-event-type">Event / Appointment Type</label>
        <div className="booking-auto-field" id="bk-event-type" aria-label="Detected event or appointment type">
          <Icon name="check" />
          <span>{eventType}</span>
          <small>Detected automatically</small>
        </div>
        <p className="form-error">{errors.eventType}</p>
      </div>

      <div className="form-group">
        <label htmlFor="bk-location-type">Location Type</label>
        <select id="bk-location-type" value={locationType} style={errStyle("locationType")} onChange={(e) => setLocationType(e.target.value)}>
          <option value="">Select location type</option>
          {LOCATION_TYPE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <p className="form-error">{errors.locationType}</p>
      </div>

      <div className="form-group">
        <label htmlFor="bk-address">Venue / Address <span className="form-optional">(optional)</span></label>
        <input type="text" id="bk-address" maxLength={140} placeholder="Venue, hall, hotel, home, etc. (optional)" value={address} style={errStyle("address")} onChange={(e) => setAddress(e.target.value)} />
        <p className="form-error">{errors.address}</p>
      </div>

      <div className="form-row-2">
        <div className="form-group">
          <label htmlFor="bk-guest-count">Guest Count</label>
          <select id="bk-guest-count" value={guestCount} style={errStyle("guestCount")} onChange={(e) => setGuestCount(e.target.value)}>
            <option value="">Select guest count</option>
            <option>Under 50</option>
            <option>50–150</option>
            <option>150–300</option>
            <option>300–500</option>
            <option>500+</option>
          </select>
          <p className="form-error">{errors.guestCount}</p>
        </div>
        <div className="form-group">
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
      </div>

      <div className="form-group">
        <label>
          <Icon name="calendar" className="booking-appt-label-icon" />
          Choose Date &amp; Time
        </label>
        <p className="booking-appt-hint">When should our team arrive to set up?</p>

        <div className="date-strip" style={errStyle("eventDate")}>
          {dateStrip.map((d) => (
            <button
              type="button"
              key={d.iso}
              className={"date-chip" + (eventDate === d.iso ? " is-selected" : "")}
              onClick={() => setEventDate(d.iso)}
            >
              {d.isFast ? <span className="date-chip-fast">Fast</span> : null}
              <span className="date-chip-weekday">{d.label === "Today" || d.label === "Tomorrow" ? d.label : d.weekday}</span>
              <span className="date-chip-day">{d.day}</span>
            </button>
          ))}
          <button type="button" className={"date-chip date-chip-more" + (!stripHasSelected ? " is-selected" : "")} onClick={openMoreDates}>
            <Icon name="calendar" />
            <span className="date-chip-weekday">{!stripHasSelected ? formatPickedDate(eventDate) : "More"}</span>
          </button>
          <input
            id="bk-event-date"
            ref={dateInputRef}
            type="date"
            className="date-strip-native-input"
            min={todayISO()}
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            aria-label="Pick any date"
            tabIndex={-1}
          />
        </div>
        <p className="form-error">{errors.eventDate}</p>
      </div>

      {requiresTimeSlot && (
        <div className="form-group">
          <label htmlFor="bk-slot">Event Time <span className="form-optional">(optional)</span></label>
          {!eventDate ? (
            <p className="booking-appt-hint">Pick a date above to see available times.</p>
          ) : (
            <div className="time-chip-grid" style={errStyle("timeSlot")}>
              {TIME_SLOT_OPTIONS.map((o) => (
                <button
                  type="button"
                  key={o}
                  className={"time-chip" + (timeSlot === o ? " is-selected" : "")}
                  onClick={() => setTimeSlot(o)}
                >
                  {o}
                </button>
              ))}
            </div>
          )}
          <p className="form-error">{errors.timeSlot}</p>
        </div>
      )}

      {addonList.length > 0 && (
        <div className="form-group">
          <label>Add-On Services</label>
          <div className="addon-list">
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
      <p className="booking-disclaimer">No payment is taken now. Adding to cart reserves nothing — you'll review everything before checkout.</p>

      <CitySelectModal open={cityModalOpen} onClose={() => setCityModalOpen(false)} />
    </div>
  );
}
