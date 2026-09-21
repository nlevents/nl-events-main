import { Link, useNavigate } from "react-router-dom";
import usePageMeta from "../hooks/usePageMeta";
import { useCart } from "../context/CartContext";
import { useToast } from "../context/ToastContext";
import { fmtINR } from "../lib/pricing";
import { TIME_SLOT_OPTIONS, todayISO } from "../data/booking";
import Icon from "../components/Icon";
import {
  itemBasePrice,
  itemOriginalPrice,
  itemAddonsTotal,
  itemLineTotal,
  cartSubtotal,
  cartOriginalSubtotal,
  cartDiscount,
} from "../lib/cart";
import { onImgError } from "../lib/imageFallback";

function safeCartPath(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  const valueTrimmed = value.trim();
  // Never allow persisted local filesystem URLs into a web page. They can
  // trigger browser file:// security errors and are not portable between
  // machines.
  if (/^(file:|filesystem:|blob:)/i.test(valueTrimmed)) return null;
  if (/^(?:[a-zA-Z]:[\\/]|\\\\)/.test(valueTrimmed)) return null;
  return valueTrimmed;
}

export default function Cart() {
  usePageMeta("Your Cart — Next Level Events", "Review your selected event packages, booking details and pricing before checkout.");
  const cart = useCart();
  const showToast = useToast();
  const navigate = useNavigate();

  const items = cart ? cart.items : [];
  const subtotal = cartSubtotal(items);
  const originalSubtotal = cartOriginalSubtotal(items);
  const discount = cartDiscount(items);

  function goCheckout() {
    if (!items.length) {
      showToast("Your cart is empty — add a package first.");
      return;
    }
    navigate("/checkout");
  }

  return (
    <>
      <section className="page-head container">
        <p className="crumb"><Link to="/">Home</Link> / Cart</p>
        <span className="eyebrow">Step 1 of 3</span>
        <h1>Your Cart</h1>
        <p>Review your selected packages and services before submitting your booking.</p>
      </section>

      <section className="section-tight container">
        {items.length === 0 ? (
          <div style={{ padding: "30px 0", textAlign: "center" }}>
            <p style={{ color: "var(--text-secondary)", marginBottom: 18 }}>
              Your cart is empty. Configure a booking on any package to add it here.
            </p>
            <Link to="/shop-by-occasion" className="btn btn-primary">Browse Packages</Link>
          </div>
        ) : (
          <div id="packageDetailsGrid">
            <div className="cart-item-list">
              {items.map((it) => (
                <CartLine key={it.id} item={it} />
              ))}
            </div>

            <aside>
              <div className="summary-box booking-panel">
                <h3 style={{ fontSize: 17, marginBottom: 14 }}>Order Summary</h3>
                <div className="summary-row"><span>Items ({items.length})</span><span>{fmtINR(originalSubtotal)}</span></div>
                {discount > 0 && (
                  <div className="summary-row" style={{ color: "#2f8f5b" }}><span>Discount</span><span>-{fmtINR(discount)}</span></div>
                )}
                <div className="summary-row total"><span>Estimated Total</span><span className="amt">{fmtINR(subtotal)}</span></div>

                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16 }}>
                  <button type="button" className="btn btn-primary btn-block" onClick={goCheckout}>Proceed to Checkout</button>
                  <Link to="/shop-by-occasion" className="btn btn-ghost btn-block">Continue Browsing</Link>
                </div>

                <div className="cart-actions" style={{ marginTop: 14 }}>
                  <button type="button" className="btn btn-line btn-block" onClick={() => cart.checkoutWhatsApp(() => showToast("Your cart is empty."))}>
                    <Icon name="whatsapp" /><span>Enquire on WhatsApp Instead</span>
                  </button>
                </div>
                <p className="booking-disclaimer">No online payment is collected. Our team will review availability and confirm the final booking details with you.</p>
              </div>
            </aside>
          </div>
        )}
      </section>
    </>
  );
}

function CartLine({ item }) {
  const cart = useCart();
  const showToast = useToast();
  const base = itemBasePrice(item);
  const original = itemOriginalPrice(item);
  const addonsTotal = itemAddonsTotal(item);
  const lineTotal = itemLineTotal(item);

  function setQty(delta) {
    const next = Math.max(1, Math.min(20, (Number(item.quantity) || 1) + delta));
    cart.updateItem(item.id, { quantity: next });
  }

  function setDate(value) {
    cart.updateItem(item.id, { eventDate: value });
  }

  function setSlot(value) {
    cart.updateItem(item.id, { timeSlot: value });
  }

  function setGuestCount(value) {
    cart.updateItem(item.id, { guestCount: value });
  }

  function remove() {
    cart.removeItem(item.id);
    showToast(item.name + " removed from cart");
  }

  const safeImage = safeCartPath(item.image);
  const safeHref = safeCartPath(item.href);

  return (
    <div className="cart-line">
      {safeImage ? (
        safeHref ? <Link to={safeHref}><img src={safeImage} alt={item.name} className="cart-line-img" onError={onImgError}/></Link> : <img src={safeImage} alt={item.name} className="cart-line-img" onError={onImgError}/>
      ) : null}

      <div className="cart-line-body">
        <div className="cart-line-head">
          {safeHref ? <Link to={safeHref} className="cart-line-title">{item.name}</Link> : <span className="cart-line-title">{item.name}</span>}
          <button type="button" className="cart-line-remove" aria-label={"Remove " + item.name} onClick={remove}><Icon name="close" /></button>
        </div>

        <div className="cart-line-tags">
          {item.eventType ? <span className="tag-pill">{item.eventType}</span> : null}
          {item.city ? <span className="tag-pill">{item.city}</span> : null}
          {item.locationType ? <span className="tag-pill">{item.locationType}</span> : null}
        </div>
        {item.address ? <p className="cart-line-address"><Icon name="pin" />{item.address}</p> : null}

        <div className="cart-line-edit-row">
          <div className="form-group">
            <label htmlFor={"date-" + item.id}>Event Date</label>
            <input type="date" id={"date-" + item.id} min={todayISO()} value={item.eventDate || ""} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="form-group">
            <label htmlFor={"slot-" + item.id}>Event Time <span className="form-optional">(optional)</span></label>
            <select id={"slot-" + item.id} value={item.timeSlot || ""} onChange={(e) => setSlot(e.target.value)}>
              <option value="">Select a time slot (optional)</option>
              {TIME_SLOT_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor={"guest-" + item.id}>Guest Count</label>
            <select id={"guest-" + item.id} value={item.guestCount || ""} onChange={(e) => setGuestCount(e.target.value)}>
              <option value="">Select guest count</option>
              <option>Under 50</option>
              <option>50–150</option>
              <option>150–300</option>
              <option>300–500</option>
              <option>500+</option>
            </select>
          </div>
        </div>

        {item.addons && item.addons.length > 0 && (
          <p className="cart-line-addons">
            Services: {item.addons.map((a) => a.name).join(", ")}
          </p>
        )}
        {item.notes ? <p className="cart-line-addons">Note: {item.notes}</p> : null}

        <div className="cart-line-footer">
          <div className="qty-stepper">
            <button type="button" aria-label="Decrease quantity" onClick={() => setQty(-1)}>−</button>
            <span>{item.quantity || 1}</span>
            <button type="button" aria-label="Increase quantity" onClick={() => setQty(1)}>+</button>
          </div>
          <div className="cart-line-price">
            {addonsTotal > 0 ? <span className="cart-line-price-note">{fmtINR(base)} + {fmtINR(addonsTotal)} services</span> : null}
            {original && original > base ? <s>{fmtINR((original + addonsTotal) * (item.quantity || 1))}</s> : null}
            <b>{fmtINR(lineTotal)}</b>
          </div>
        </div>
      </div>
    </div>
  );
}
