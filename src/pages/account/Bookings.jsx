import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import usePageMeta from "../../hooks/usePageMeta";
import { useAuth } from "../../context/AuthContext";
import { fmtINR } from "../../lib/pricing";
import { describeBooking } from "../../lib/cart";

function earliestEventDate(order) {
  const dates = (order.items || []).map((it) => it.eventDate).filter(Boolean).sort();
  return dates[0] || null;
}

function BookingCard({ order }) {
  return (
    <div className="booking-history-card">
      <div className="booking-history-head">
        <div>
          <p className="booking-ref">{order.ref}</p>
          <p className="muted" style={{ fontSize: 12.5 }}>
            Placed {new Date(order.createdAt).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" })}
          </p>
        </div>
        <b>{fmtINR(order.total)}</b>
      </div>
      <ul className="booking-history-items">
        {(order.items || []).map((it) => (
          <li key={it.id}>
            <span>{it.name}{it.quantity > 1 ? " ×" + it.quantity : ""}</span>
            <span className="muted">{describeBooking(it) || "—"}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Bookings() {
  usePageMeta("My Bookings — Next Level Events", "View your bookings and booking history.", { noindex: true });
  const auth = useAuth();
  const [tab, setTab] = useState("upcoming");
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setError("");
    setOrders(null);
    auth
      .getBookings()
      .then((data) => {
        if (!cancelled) setOrders(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "Couldn't load your bookings.");
      });
    return () => {
      cancelled = true;
    };
  }, [auth]);

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = (orders || []).filter((o) => {
    const d = earliestEventDate(o);
    return !d || d >= today;
  });
  const past = (orders || []).filter((o) => {
    const d = earliestEventDate(o);
    return d && d < today;
  });
  const list = tab === "upcoming" ? upcoming : past;

  return (
    <div>
      <h2 className="account-panel-title">My Bookings</h2>
      <p className="account-panel-sub">Bookings placed while logged in appear here automatically.</p>

      <div className="account-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === "upcoming"} className={"account-tab" + (tab === "upcoming" ? " active" : "")} onClick={() => setTab("upcoming")}>
          Upcoming
        </button>
        <button type="button" role="tab" aria-selected={tab === "history"} className={"account-tab" + (tab === "history" ? " active" : "")} onClick={() => setTab("history")}>
          Booking History
        </button>
      </div>

      {orders === null && !error && (
        <div className="account-loading" aria-live="polite">Loading bookings…</div>
      )}

      {error && <p className="form-error">{error}</p>}

      {orders !== null && !error && list.length === 0 && (
        <div className="account-empty">
          <p>{tab === "upcoming" ? "No upcoming bookings yet." : "No past bookings yet."}</p>
          <Link to="/packages" className="btn btn-primary">Browse packages</Link>
        </div>
      )}

      {list.length > 0 && (
        <div className="booking-history-list">
          {list.map((o) => (
            <BookingCard key={o.id || o.ref} order={o} />
          ))}
        </div>
      )}
    </div>
  );
}
