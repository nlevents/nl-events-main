import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Icon from "../../components/Icon";

const TABS = [
  { to: "/account", label: "Profile", icon: "user", end: true },
  { to: "/account/bookings", label: "My Bookings", icon: "calendar", end: false },
  { to: "/account/details", label: "Account Details", icon: "navContact", end: true },
];

export default function AccountLayout() {
  const auth = useAuth();

  async function handleLogout() {
    await auth.logout();
  }

  return (
    <section className="section-tight container account-shell">
      <aside className="account-sidebar">
        <div className="account-sidebar-head">
          <span className="account-avatar"><Icon name="user" /></span>
          <div>
            <p className="account-name">{auth.user?.name || "Your account"}</p>
            <p className="account-phone">{auth.user?.email || ""}</p>
          </div>
        </div>
        <nav className="account-nav">
          {TABS.map((t) => (
            <NavLink key={t.to} to={t.to} end={t.end} className={({ isActive }) => "account-nav-link" + (isActive ? " active" : "")}>
              <Icon name={t.icon} /> {t.label}
            </NavLink>
          ))}
        </nav>
        <button type="button" className="account-nav-link account-logout" onClick={handleLogout}>
          <Icon name="close" /> Log out
        </button>
      </aside>
      <div className="account-panel">
        <Outlet />
      </div>
    </section>
  );
}
