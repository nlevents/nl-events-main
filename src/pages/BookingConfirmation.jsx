import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import usePageMeta from "../hooks/usePageMeta";
import { fmtINR } from "../lib/pricing";
import { describeBooking, itemLineTotal } from "../lib/cart";
import { downloadBookingPdf } from "../lib/bookingPdf";

const ORDER_KEY = "nle-last-order";

export default function BookingConfirmation() {
  usePageMeta("Booking Confirmed — Next Level Events", "Your event booking request has been received by Next Level Events.", { noindex: true });
  const [order, setOrder] = useState(null);
  const [checked, setChecked] = useState(false);
  const location = useLocation();

  useEffect(() => {
    let record = location.state?.order || null;
    if (!record) {
      try {
        const raw = window.localStorage.getItem(ORDER_KEY) || window.sessionStorage.getItem(ORDER_KEY);
        if (raw) record = JSON.parse(raw);
      } catch {
        record = null;
      }
    }
    setOrder(record);
    setChecked(true);
  }, [location.state]);

  if (!checked) return null;

  if (!order) {
    return (
      <section className="container success-wrap">
        <div className="success-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 13l4 4L19 7" /></svg></div>
        <h1 style={{ fontSize: "clamp(26px,6vw,36px)" }}>Booking Received</h1>
        <p style={{ color: "var(--text-secondary)", marginTop: 12 }}>
          We couldn't find your latest order details in this browser session, but if you just completed checkout, our team already has it and will be in touch shortly.
        </p>
        <Link to="/" className="btn btn-primary" style={{ marginTop: 32 }}>Back to Home</Link>
      </section>
    );
  }

  return (
    <section className="container success-wrap">
      <div className="success-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 13l4 4L19 7" /></svg></div>
      <h1 style={{ fontSize: "clamp(26px,6vw,36px)" }}>Booking Request Confirmed</h1>
      <p style={{ color: "var(--text-secondary)", marginTop: 12 }}>
        Thanks{order.customer && order.customer.fullName ? ", " + order.customer.fullName.split(" ")[0] : ""} — we've received your booking request. No payment has been taken yet; our team will reach out shortly to confirm details and arrange payment.
      </p>

      <div className="success-details">
        <div className="row"><span>Booking Reference</span><span>{order.ref}</span></div>
        <div className="row"><span>Estimated Total</span><span>{fmtINR(order.total)}</span></div>
      </div>

      <div className="review-list" style={{ marginTop: 22, textAlign: "left" }}>
        {(order.items || []).map((it) => (
          <div className="review-row" key={it.id}>
            <span>
              <strong>{it.name}{it.quantity > 1 ? " × " + it.quantity : ""}</strong>
              <br />
              <small style={{ color: "var(--text-secondary)", fontWeight: 400 }}>{describeBooking(it)}</small>
              {it.locationType || it.address ? <><br /><small style={{ color: "var(--text-secondary)", fontWeight: 400 }}>{it.locationType || "Venue"}{it.address ? " — " + it.address : ""}</small></> : null}
              {it.addons?.length ? <><br /><small style={{ color: "var(--text-secondary)", fontWeight: 400 }}>Add-ons: {it.addons.map((a) => a.name).join(", ")}</small></> : null}
            </span>
            <span>{fmtINR(itemLineTotal(it))}</span>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginTop: 32 }}>
        <button type="button" className="btn btn-primary" onClick={() => downloadBookingPdf(order)}>Download Booking PDF</button>
        <button type="button" className="btn btn-ghost" onClick={() => window.print()}>Print / Save as PDF</button>
        <Link to="/" className="btn btn-ghost">Back to Home</Link>
        <Link to="/shop-by-occasion" className="btn btn-ghost">Book Another Package</Link>
      </div>
    </section>
  );
}
