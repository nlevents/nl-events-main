import { Link } from "react-router-dom";
import usePageMeta from "../../hooks/usePageMeta";
import { useAuth } from "../../context/AuthContext";

export default function Profile() {
  usePageMeta("My Profile — Next Level Events", "View your account profile.", { noindex: true });
  const auth = useAuth();
  const user = auth?.user;

  if (!user) return null;

  return (
    <div>
      <h2 className="account-panel-title">Profile</h2>
      <p className="account-panel-sub">A quick look at your account. Update details anytime from Account Details.</p>

      <div className="account-info-grid">
        <div className="account-info-row">
          <span>Name</span>
          <b>{user.name || <em className="muted">Not set</em>}</b>
        </div>
        <div className="account-info-row">
          <span>Phone number</span>
          <b>{user.phone || <em className="muted">Not set</em>}</b>
        </div>
        <div className="account-info-row">
          <span>Email</span>
          <b>{user.email || <em className="muted">Not set</em>}</b>
        </div>
        <div className="account-info-row">
          <span>Member since</span>
          <b>{user.createdAt ? new Date(user.createdAt).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" }) : "—"}</b>
        </div>
      </div>

      <div className="account-cta-row">
        <Link to="/account/details" className="btn btn-ghost">Edit details</Link>
        <Link to="/account/bookings" className="btn btn-primary">View bookings</Link>
      </div>
    </div>
  );
}
