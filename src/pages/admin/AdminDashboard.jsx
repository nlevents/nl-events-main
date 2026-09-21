import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getStats } from "../../lib/adminStore";
import { getProducts, getOccasions, getMediaItems, getCoupons, getInquiries } from "../../lib/catalogStore";
import { fmtINR } from "../../lib/pricing";
import Icon from "../../components/Icon";
import usePageMeta from "../../hooks/usePageMeta";

const STATUS_LABEL = { draft: "Draft", sent: "Sent", paid: "Paid", overdue: "Overdue", cancelled: "Cancelled" };

export default function AdminDashboard() {
  usePageMeta("Dashboard — Admin", "Admin panel.", { noindex: true });

  const [stats, setStats] = useState(getStats);
  const [products, setProducts] = useState(getProducts);
  const [occasions, setOccasions] = useState(getOccasions);
  const [media, setMedia] = useState(getMediaItems);
  const [coupons, setCoupons] = useState(getCoupons);
  const [inquiries, setInquiries] = useState(getInquiries);

  function refresh() {
    setStats(getStats());
    setProducts(getProducts());
    setOccasions(getOccasions());
    setMedia(getMediaItems());
    setCoupons(getCoupons());
    setInquiries(getInquiries());
  }

  useEffect(() => {
    function onUpdate() {
      refresh();
    }
    window.addEventListener("nle-catalog-updated", onUpdate);
    return () => window.removeEventListener("nle-catalog-updated", onUpdate);
  }, []);

  const addonProducts = products.filter((p) => p.isAddon === true || p.occasionSlug === "event-services" || (Array.isArray(p.categoryPath) && p.categoryPath[0] === "event-services"));
  const regularProducts = products.filter((p) => !addonProducts.includes(p));
  const activeProducts = regularProducts.filter((p) => p.status !== "archived");
  const newLeads = inquiries.filter((i) => i.status === "new");

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <div>
          <h1>Admin Control Center</h1>
          <p className="admin-hint">Complete control over products, categories, media, operations, and billing.</p>
        </div>
        <div className="admin-head-actions">
          <Link to="/admin/products/new" className="btn btn-primary">
            <Icon name="plus" /> Add Product
          </Link>
          <Link to="/admin/invoices/new" className="btn btn-outline">
            <Icon name="plus" /> New Invoice
          </Link>
        </div>
      </header>

      {/* Quick Actions Action Bar */}
      <div className="admin-quick-actions-bar">
        <Link to="/admin/products/new" className="admin-quick-action-item">
          <div className="admin-quick-icon"><Icon name="package" /></div>
          <span>Add Product</span>
        </Link>
        <Link to="/admin/categories" className="admin-quick-action-item">
          <div className="admin-quick-icon"><Icon name="grid" /></div>
          <span>Categories & Occasions</span>
        </Link>
        <Link to="/admin/media" className="admin-quick-action-item">
          <div className="admin-quick-icon"><Icon name="image" /></div>
          <span>Upload Picture</span>
        </Link>
        <Link to="/admin/coupons" className="admin-quick-action-item">
          <div className="admin-quick-icon"><Icon name="percent" /></div>
          <span>Create Coupon</span>
        </Link>
        <Link to="/admin/availability" className="admin-quick-action-item">
          <div className="admin-quick-icon"><Icon name="calendar" /></div>
          <span>Blackout Calendar</span>
        </Link>
        <Link to="/admin/inquiries" className="admin-quick-action-item">
          <div className="admin-quick-icon"><Icon name="user" /></div>
          <span>Leads & Inquiries {newLeads.length > 0 && `(${newLeads.length})`}</span>
        </Link>
      </div>

      {/* Catalog & Business Statistics Grid */}
      <div className="admin-stat-grid">
        <div className="admin-stat-card">
          <span>Catalog Products</span>
          <strong>{activeProducts.length}</strong>
          <span className="admin-stat-sub">{regularProducts.length - activeProducts.length} archived</span>
        </div>
        <div className="admin-stat-card">
          <span>Service Products</span>
          <strong>{addonProducts.filter((p) => p.status !== "archived").length}</strong>
          <span className="admin-stat-sub"><Link to="/admin/services">Manage in Event Services</Link></span>
        </div>
        <div className="admin-stat-card">
          <span>Occasions & Themes</span>
          <strong>{occasions.length}</strong>
          <span className="admin-stat-sub">Live category hubs</span>
        </div>
        <div className="admin-stat-card">
          <span>Media Assets</span>
          <strong>{media.length}</strong>
          <span className="admin-stat-sub">Photos & banners</span>
        </div>
        <div className="admin-stat-card">
          <span>Active Coupons</span>
          <strong>{coupons.filter((c) => c.isActive).length}</strong>
          <span className="admin-stat-sub">Checkout promos</span>
        </div>
        <div className="admin-stat-card">
          <span>Revenue This Month</span>
          <strong>{fmtINR(stats.revenueThisMonth)}</strong>
          <span className="admin-stat-sub">{stats.totalClients} clients</span>
        </div>
        <div className="admin-stat-card admin-stat-card--warn">
          <span>Outstanding Invoices ({stats.outstandingCount})</span>
          <strong>{fmtINR(stats.outstandingAmount)}</strong>
          <span className="admin-stat-sub">Pending payment</span>
        </div>
      </div>

      {/* Two Column Layout: Recent Inquiries & Recent Invoices */}
      <div className="admin-dashboard-split">
        {/* Left: Recent Inquiries / Leads */}
        <section className="admin-panel">
          <div className="admin-panel-head">
            <h2>Recent Leads & Quotes</h2>
            <Link to="/admin/inquiries">View All Leads →</Link>
          </div>
          {inquiries.length === 0 ? (
            <p className="admin-empty">No inquiries yet.</p>
          ) : (
            <table className="admin-table admin-table-sm">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Event</th>
                  <th>Budget</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {inquiries.slice(0, 5).map((inq) => (
                  <tr key={inq.id}>
                    <td>
                      <strong>{inq.name}</strong>
                      <div className="admin-hint">{inq.phone}</div>
                    </td>
                    <td>{inq.eventType || "Event"}</td>
                    <td>{inq.budget || "—"}</td>
                    <td>
                      <span className={`admin-badge admin-badge--${inq.status === "won" ? "paid" : inq.status === "new" ? "draft" : "sent"}`}>
                        {inq.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* Right: Recent Invoices */}
        <section className="admin-panel">
          <div className="admin-panel-head">
            <h2>Recent Invoices</h2>
            <Link to="/admin/invoices">View Invoices →</Link>
          </div>
          {stats.recentInvoices.length === 0 ? (
            <p className="admin-empty">No invoices yet. <Link to="/admin/invoices/new">Create invoice</Link>.</p>
          ) : (
            <table className="admin-table admin-table-sm">
              <thead>
                <tr>
                  <th>Number</th>
                  <th>Client</th>
                  <th>Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentInvoices.slice(0, 5).map((inv) => (
                  <tr key={inv.id}>
                    <td>
                      <Link to={"/admin/invoices/" + inv.id}><strong>{inv.number}</strong></Link>
                    </td>
                    <td>{inv.client?.name || "—"}</td>
                    <td><strong>{fmtINR(inv.total)}</strong></td>
                    <td>
                      <span className={"admin-badge admin-badge--" + inv.status}>
                        {STATUS_LABEL[inv.status] || inv.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  );
}
