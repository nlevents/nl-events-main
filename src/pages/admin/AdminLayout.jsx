import "../../styles/admin.css";
import { useState } from "react";
import { NavLink, Outlet, useLocation, Navigate } from "react-router-dom";
import { useAdminAuth } from "../../context/AdminAuthContext";
import AdminLogin from "./AdminLogin";
import Icon from "../../components/Icon";
import usePageMeta from "../../hooks/usePageMeta";


const CRM_NAV_GROUPS = [
  { title: null, items: [
    { to: "/admin", label: "Dashboard", icon: "home", end: true },
  ] },
  { title: "Sales & CRM", items: [
    { to: "/admin/inquiries", label: "CRM", icon: "users" },
    { to: "/admin/calendar", label: "Calendar", icon: "calendar" },
    { to: "/admin/clients", label: "Clients", icon: "users" },
  ] },
  { title: "Catalog", items: [
    { to: "/admin/products", label: "Catalog", icon: "package" },
    { to: "/admin/media", label: "Media", icon: "image" },
    { to: "/admin/video-content", label: "YouTube Shorts & Reviews", icon: "youtube" },
  ] },
  { title: "Events & Operations", items: [
    { to: "/admin/events", label: "All Events", icon: "clipboard" },
    { to: "/admin/availability", label: "Event Calendar", icon: "calendar" },
    { to: "/admin/tasks", label: "Tasks", icon: "list" },
    { to: "/admin/vendors", label: "Vendors", icon: "truck" },
  ] },
  { title: "HR & Team", items: [
    { to: "/admin/candidates", label: "Candidates", icon: "users" },
    { to: "/admin/team", label: "Team", icon: "users" },
    { to: "/admin/attendance", label: "Attendance", icon: "calendar" },
    { to: "/admin/payroll", label: "Salary & Payroll", icon: "card" },
  ] },
  { title: "Finance", items: [
    { to: "/admin/quotations", label: "Quotations", icon: "file" },
    { to: "/admin/invoices", label: "Invoices", icon: "file" },
    { to: "/admin/payments", label: "Payments", icon: "card" },
    { to: "/admin/expenses", label: "Expenses", icon: "pie" },
    { to: "/admin/reports/sales", label: "Financial Reports", icon: "chart" },
  ] },
  { title: "Settings", items: [
    { to: "/admin/settings", label: "Settings & Backup", icon: "settings" },
  ] },
];

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
      { to: "/admin/video-content", label: "YouTube Shorts & Reviews", icon: "sparkle" },
      { to: "/admin/services", label: "Event Services", icon: "tag" },
    ],
  },
  {
    title: "Sales & Bookings",
    items: [
      { to: "/admin/inquiries", label: "CRM", icon: "user" },
      { to: "/admin/availability", label: "Calendar & Blackout", icon: "calendar" },
      { to: "/admin/coupons", label: "Coupons & Promos", icon: "percent" },
      { to: "/admin/clients", label: "Clients", icon: "user" },
      { to: "/admin/coupons", label: "Coupons & Promos", icon: "percent" },
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
  // Keep one consistent CRM visual system across the entire admin panel.
  // Individual pages still render their own content, but the navigation/chrome
  // stays identical to the CRM reference design.
  const isCrm = true;

  if (!auth || !auth.ready) return null;
  if (!auth.authenticated) return <Navigate to="/admin/login" replace />;

  // Find active label for mobile header
  let activeTitle = "Admin Panel";
  for (const group of (location.pathname === "/admin/inquiries" ? CRM_NAV_GROUPS : NAV_GROUPS)) {
    for (const item of group.items) {
      if (item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)) {
        activeTitle = item.label;
        break;
      }
    }
  }

  const renderNavContent = () => {
    const groups = isCrm ? CRM_NAV_GROUPS : NAV_GROUPS;
    return (
    <>
      <div className="admin-sidebar-brand">
        {isCrm ? <img src="/assets/images/landing/nle-logo.png" alt="Next Level Events" /> : <>Next Level <span>Admin</span></>}
      </div>
      <nav className="admin-nav">
        {groups.map((group) => (
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
      {isCrm && <div className="crm-sidebar-tagline">Because<br /><strong>You Deserve</strong><br />the Next Level</div>}
    </>
    );
  };

  return (
    <div className={`admin-shell ${isCrm ? "crm-shell" : ""}`}>
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
