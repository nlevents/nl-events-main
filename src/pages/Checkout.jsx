import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import usePageMeta from "../hooks/usePageMeta";
import { useCart } from "../context/CartContext";
import { createBooking } from "../lib/bookingApi";
import { fmtINR } from "../lib/pricing";
import { itemBasePrice, itemAddonsTotal, itemLineTotal, describeBooking, cartSubtotal, cartOriginalSubtotal, cartDiscount } from "../lib/cart";
import Icon from "../components/Icon";
import { onImgError } from "../lib/imageFallback";

const STEP_LABELS = ["Customer Details", "Review & Confirm"];
const ORDER_KEY = "nle-last-order";

function makeRequestId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return "req_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2);
}

export default function Checkout() {
  usePageMeta("Checkout — Next Level Events", "Confirm your customer details and submit your event booking request.", { noindex: true });
  const cart = useCart();
  const navigate = useNavigate();
  const formRef = useRef(null);

  const items = cart ? cart.items : [];
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState({});
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [altPhone, setAltPhone] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [requestId, setRequestId] = useState(makeRequestId);

  useEffect(() => {
    if (!cart) return;
    if (!items.length) navigate("/cart", { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart, items.length]);

  if (!cart || !items.length) return null;

  const subtotal = cartSubtotal(items);
  const originalSubtotal = cartOriginalSubtotal(items);
  const discount = cartDiscount(items);

  function validateStep(index) {
    const next = {};
    if (index === 0) {
      if (!fullName.trim()) next.fullName = "This field is required.";
      if (!phone.trim()) next.phone = "This field is required.";
      else if (!/^\+?[0-9][0-9\s().-]{6,18}$/.test(phone.trim())) next.phone = "Enter a valid phone number.";
    }
    if (index === 1 && !agreeTerms) next.agreeTerms = "Please accept the terms to continue.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function goNext() {
    if (!validateStep(step)) return;
    setStep((s) => Math.min(STEP_LABELS.length - 1, s + 1));
    setTimeout(() => formRef.current && window.scrollTo({ top: formRef.current.offsetTop - 90, behavior: "smooth" }), 30);
  }

  function goBack() {
    setStep((s) => Math.max(0, s - 1));
    setTimeout(() => formRef.current && window.scrollTo({ top: formRef.current.offsetTop - 90, behavior: "smooth" }), 30);
  }

  async function confirmBooking() {
    if (!validateStep(1)) return;
    setSubmitError("");
    setSubmitting(true);

    const customer = {
      fullName: fullName.trim(),
      phone: phone.trim(),
      altPhone: altPhone.trim(),
      notes: orderNotes.trim(),
    };

    try {
      const created = await createBooking({
        items,
        customer,
        requestId,
      });

      const order = {
        id: created.bookingId,
        ref: created.ref,
        createdAt: created.createdAt || new Date().toISOString(),
        customer,
        items: created.items || items,
        subtotal: Number(created.subtotal ?? subtotal),
        originalSubtotal,
        discount: Number(created.discount ?? discount),
        total: Number(created.total ?? subtotal),
        bookingStatus: created.bookingStatus || "pending",
      };

      // Persist the successful order before changing routes. Use localStorage as the
      // primary store so the confirmation survives a full page reload, a new tab,
      // and SPA/chunk navigation edge cases.
      try {
        const payload = JSON.stringify(order);
        window.localStorage.setItem(ORDER_KEY, payload);
        window.sessionStorage.setItem(ORDER_KEY, payload);
      } catch { /* best effort */ }
      cart.clearCart();

      // Use a normal browser navigation after persistence. This guarantees the
      // confirmation page renders even if the checkout component is replaced by
      // a production deployment or a stale SPA chunk.
      window.location.assign("/booking-confirmation");
    } catch (err) {
      setSubmitError(err?.message || "Unable to submit your booking. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <>
      <section className="page-head container">
        <p className="crumb"><Link to="/cart">Cart</Link> / Checkout</p>
        <span className="eyebrow">Step {step + 1} of {STEP_LABELS.length}</span>
        <h1>Checkout</h1>
        <p>Submit your booking request — no online payment is required.</p>
      </section>

      <section className="section-tight container" style={{ maxWidth: 720 }} ref={formRef}>
        <div className="progress-track" aria-hidden="true">
          {STEP_LABELS.map((_, i) => <div key={i} className={"progress-dot" + (i < step ? " done" : "") + (i === step ? " active" : "")} />)}
        </div>
        <div className="progress-labels">{STEP_LABELS.map((l) => <span key={l}>{l}</span>)}</div>

        <div id="packageDetailsGrid">
          <form onSubmit={(e) => e.preventDefault()} noValidate>
            <div className={"step-panel" + (step === 0 ? " active" : "")}>
              <h2 style={{ fontSize: 22, marginBottom: 18 }}>Your details</h2>
              <div className="form-group">
                <label htmlFor="co-name">Full Name</label>
                <input type="text" id="co-name" maxLength={80} autoComplete="name" style={errors.fullName ? { borderColor: "#d16a5a" } : undefined} value={fullName} onChange={(e) => setFullName(e.target.value)} />
                <p className="form-error">{errors.fullName}</p>
              </div>
              <div className="form-group">
                <label htmlFor="co-phone">Phone</label>
                <input type="tel" id="co-phone" maxLength={20} autoComplete="tel" style={errors.phone ? { borderColor: "#d16a5a" } : undefined} value={phone} onChange={(e) => setPhone(e.target.value)} />
                <p className="form-error">{errors.phone}</p>
              </div>
              <div className="form-group">
                <label htmlFor="co-alt-phone">Alternate Phone (optional)</label>
                <input type="tel" id="co-alt-phone" maxLength={20} value={altPhone} onChange={(e) => setAltPhone(e.target.value)} />
              </div>
              <div className="form-group">
                <label htmlFor="co-notes">Anything else our team should know? (optional)</label>
                <textarea id="co-notes" maxLength={400} placeholder="Special instructions for our booking team…" value={orderNotes} onChange={(e) => setOrderNotes(e.target.value)} />
              </div>
              <div className="form-nav">
                <Link to="/cart" className="btn btn-ghost">Back to Cart</Link>
                <button className="btn btn-primary btn-block" type="button" onClick={goNext}>Review Booking</button>
              </div>
            </div>

            <div className={"step-panel" + (step === 1 ? " active" : "")}>
              <h2 style={{ fontSize: 22, marginBottom: 18 }}>Review your booking</h2>
              {items.map((it) => (
                <div className="review-line" key={it.id}>
                  {it.image ? <img src={it.image} alt="" loading="lazy" decoding="async" onError={onImgError} /> : null}
                  <div className="review-line-body">
                    <h4>{it.name}{it.quantity > 1 ? " × " + it.quantity : ""}</h4>
                    <p>{describeBooking(it) || "—"}</p>
                    {it.address ? <p className="muted">{it.locationType ? it.locationType + " — " : ""}{it.address}</p> : null}
                    {it.addons?.length ? <p className="muted">Services: {it.addons.map((a) => a.name).join(", ")}</p> : null}
                    {it.notes ? <p className="muted">Notes: {it.notes}</p> : null}
                  </div>
                  <b>{fmtINR(itemLineTotal(it))}</b>
                </div>
              ))}

              <h3 style={{ fontSize: 16, margin: "22px 0 10px" }}>Price Breakdown</h3>
              <div className="review-list">
                {items.map((it) => <div className="review-row" key={it.id}><span>{it.name}{it.quantity > 1 ? " (×" + it.quantity + ")" : ""}</span><span>{fmtINR(itemBasePrice(it) * (it.quantity || 1))}</span></div>)}
                {items.some((it) => itemAddonsTotal(it) > 0) && <div className="review-row"><span>Services</span><span>{fmtINR(items.reduce((s, it) => s + itemAddonsTotal(it) * (it.quantity || 1), 0))}</span></div>}
                {discount > 0 && <div className="review-row" style={{ color: "#2f8f5b" }}><span>Discount</span><span>-{fmtINR(discount)}</span></div>}
                <div className="review-row" style={{ fontWeight: 700, fontSize: 15 }}><span>Estimated Total</span><span>{fmtINR(subtotal)}</span></div>
              </div>

              <h3 style={{ fontSize: 16, margin: "22px 0 10px" }}>Customer Details</h3>
              <div className="review-list">
                <div className="review-row"><span>Name</span><span>{fullName || "—"}</span></div>
                <div className="review-row"><span>Phone</span><span>{phone || "—"}</span></div>
              </div>

              <div className="form-group" style={{ marginTop: 18 }}>
                <label style={{ display: "flex", alignItems: "flex-start", gap: 10, textTransform: "none", fontSize: 13.5, letterSpacing: 0, fontWeight: 400, cursor: "pointer" }}>
                  <input type="checkbox" checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)} style={{ marginTop: 3, width: "auto" }} />
                  <span>I agree to the <Link to="/terms">Terms &amp; Conditions</Link> and cancellation policy, and confirm the booking details above are correct.</span>
                </label>
                <p className="form-error">{errors.agreeTerms}</p>
              </div>

              {submitError ? <p className="form-error" style={{ marginTop: 14 }} role="alert">{submitError}</p> : null}

              <div className="form-nav">
                <button className="btn btn-ghost" type="button" onClick={goBack} disabled={submitting}>Back</button>
                <button className="btn btn-primary btn-block" type="button" onClick={confirmBooking} disabled={submitting}>
                  {submitting ? "Submitting Booking…" : "Confirm Booking"}
                </button>
              </div>
              <p className="booking-disclaimer"><Icon name="check" /> No payment is taken online. Our team will review availability and contact you to confirm the booking and payment arrangements.</p>
            </div>
          </form>

          <aside className="reveal">
            <div className="summary-box booking-panel">
              <h3 style={{ fontSize: 15, marginBottom: 12 }}>Booking Summary</h3>
              {items.map((it) => <div className="summary-row" key={it.id}><span>{it.name}{it.quantity > 1 ? " ×" + it.quantity : ""}</span><span>{fmtINR(itemLineTotal(it))}</span></div>)}
              {discount > 0 && <div className="summary-row" style={{ color: "#2f8f5b" }}><span>Discount</span><span>-{fmtINR(discount)}</span></div>}
              <div className="summary-row total"><span>Estimated Total</span><span className="amt">{fmtINR(subtotal)}</span></div>
              <p className="booking-disclaimer" style={{ marginTop: 10 }}><Icon name="check" /> Booking request — payment handled separately</p>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
