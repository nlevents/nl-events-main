import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getInvoices, deleteInvoice, setInvoiceStatus } from "../../lib/adminStore";
import { fmtINR } from "../../lib/pricing";
import usePageMeta from "../../hooks/usePageMeta";

const STATUSES = ["draft", "sent", "partially_paid", "paid", "overdue", "written_off", "cancelled"];
const STATUS_LABEL = { draft: "Draft", sent: "Sent", partially_paid: "Partially paid", paid: "Paid", overdue: "Overdue", written_off: "Written off", cancelled: "Cancelled" };

export default function AdminInvoices() {
  usePageMeta("Invoices — Admin", "Admin panel.", { noindex: true });
  const [invoices, setInvoices] = useState(() => getInvoices());
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  function refresh() {
    setInvoices(getInvoices());
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return invoices
      .filter((inv) => statusFilter === "all" || inv.status === statusFilter)
      .filter((inv) => !q || [inv.number, inv.client?.name].some((v) => (v || "").toLowerCase().includes(q)))
      .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  }, [invoices, query, statusFilter]);

  function handleDelete(inv) {
    if (!window.confirm(`Delete invoice ${inv.number}? This can't be undone.`)) return;
    deleteInvoice(inv.id);
    refresh();
  }

  function handleStatus(inv, status) {
    setInvoiceStatus(inv.id, status);
    refresh();
  }

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <h1>Invoices</h1>
        <Link to="/admin/invoices/new" className="btn btn-primary">+ New Invoice</Link>
      </header>

      <div className="admin-toolbar">
        <input className="admin-search" placeholder="Search by invoice # or client…" value={query} onChange={(e) => setQuery(e.target.value)} />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="admin-empty">{invoices.length === 0 ? "No invoices yet." : "No invoices match your filters."}</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr><th>Type</th><th>Number</th><th>Client</th><th>Issue date</th><th>Event date</th><th>Total</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {filtered.map((inv) => (
              <tr key={inv.id}>
                <td>{inv.documentType === "quotation" ? "Quotation" : "Invoice"}</td><td><Link to={"/admin/invoices/" + inv.id}>{inv.number}</Link></td>
                <td>{inv.client?.name || "—"}</td>
                <td>{inv.issueDate}</td>
                <td>{inv.eventDate || inv.dueDate || "—"}</td>
                <td>{fmtINR(inv.total)}</td>
                <td>
                  <select
                    className={"admin-badge admin-badge--" + inv.status + " admin-status-select"}
                    value={inv.status}
                    onChange={(e) => handleStatus(inv, e.target.value)}
                  >
                    {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                  </select>
                </td>
                <td className="admin-row-actions">
                  <Link to={"/admin/invoices/" + inv.id} className="btn btn-line btn-sm">View</Link>
                  <Link to={"/admin/invoices/" + inv.id + "/edit"} className="btn btn-line btn-sm">Edit</Link>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => handleDelete(inv)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
