import { useState } from "react";
import { NavLink, Outlet, useLocation, Navigate } from "react-router-dom";
import { useAdminAuth } from "../../context/AdminAuthContext";
import AdminLogin from "./AdminLogin";
import Icon from "../../components/Icon";
import usePageMeta from "../../hooks/usePageMeta";

const NAV_GROUPS = [
  {
    title: "General",
    items: [
      { to: "/admin", label: "Dashboard", icon: "home", end: true },
    ],
  },
  {
    title: "Catalog & Media",
    items: [
      { to: "/admin/products", label: "Products & Packages", icon: "package" },
      { to: "/admin/categories", label: "Occasions & Categories", icon: "grid" },
      { to: "/admin/media", label: "Media & Pictures", icon: "image" },
      { to: "/admin/video-content", label: "Instagram & Video Reviews", icon: "sparkle" },
      { to: "/admin/addons", label: "Event Add-ons", icon: "tag" },
    ],
  },
  {
    title: "Sales & Bookings",
    items: [
      { to: "/admin/inquiries", label: "CRM", icon: "user" },
      { to: "/admin/availability", label: "Calendar & Blackout", icon: "calendar" },
      { to: "/admin/coupons", label: "Coupons & Promos", icon: "percent" },
      { to: "/admin/clients", label: "Clients", icon: "user" },
    ],
  },
  {
    title: "Billing & Settings",
    items: [
      { to: "/admin/invoices", label: "Invoices", icon: "send" },
      { to: "/admin/settings", label: "Settings & Backup", icon: "phone" },
    ],
  },
];

export default function AdminLayout() {
  usePageMeta("Admin — Next Level Events", "Admin panel.", { noindex: true });
  const auth = useAdminAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (!auth || !auth.ready) return null;
  if (!auth.authenticated) return <Navigate to="/admin/login" replace />;

  // Find active label for mobile header
  let activeTitle = "Admin Panel";
  for (const group of NAV_GROUPS) {
    for (const item of group.items) {
      if (item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)) {
        activeTitle = item.label;
        break;
      }
    }
  }

  const renderNavContent = () => (
    <>
      <div className="admin-sidebar-brand">
        Next Level <span>Admin</span>
      </div>
      <nav className="admin-nav">
        {NAV_GROUPS.map((group) => (
          <div key={group.title} className="admin-nav-group">
            <span className="admin-nav-group-title">{group.title}</span>
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  "admin-nav-link" + (isActive ? " active" : "")
                }
              >
                <Icon name={item.icon} />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
      <button
        type="button"
        className="admin-nav-link admin-logout"
        onClick={() => {
          setMobileMenuOpen(false);
          auth.logout();
        }}
      >
        <Icon name="close" />
        <span>Log out</span>
      </button>
    </>
  );

  return (
    <div className="admin-shell">
      {/* Mobile Top App Bar (Visible on phones <= 900px) */}
      <header className="admin-mobile-header">
        <button
          type="button"
          className="admin-mobile-menu-btn"
          aria-label="Toggle navigation menu"
          onClick={() => setMobileMenuOpen((prev) => !prev)}
        >
          <Icon name={mobileMenuOpen ? "close" : "menu"} />
        </button>
        <div className="admin-mobile-brand">
          Next Level <span>Admin</span> &bull; <small>{activeTitle}</small>
        </div>
        <button
          type="button"
          className="admin-mobile-logout-btn"
          title="Log out"
          onClick={auth.logout}
        >
          <Icon name="close" />
        </button>
      </header>

      {/* Mobile Backdrop & Sliding Drawer */}
      {mobileMenuOpen && (
        <div
          className="admin-mobile-backdrop"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
      <aside className={`admin-mobile-drawer ${mobileMenuOpen ? "is-open" : ""}`}>
        {renderNavContent()}
      </aside>

      {/* Desktop Sidebar (Hidden on mobile via CSS) */}
      <aside className="admin-sidebar admin-desktop-sidebar">
        {renderNavContent()}
      </aside>

      {/* Main Admin Area */}
      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
}
