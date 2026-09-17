import { Link, useNavigate, useParams } from "react-router-dom";
import { getInvoice, getSettings, deleteInvoice, setInvoiceStatus, saveInvoice } from "../../lib/adminStore";
import { updateAdminInquiry } from "../../lib/adminApi";
import { fmtINR } from "../../lib/pricing";
import usePageMeta from "../../hooks/usePageMeta";
import NotFound from "../NotFound";

const STATUS_LABEL = { draft: "Draft", sent: "Sent", paid: "Paid", overdue: "Overdue", cancelled: "Cancelled" };

export default function AdminInvoiceView() {
  usePageMeta("Invoice — Admin", "Admin panel.", { noindex: true });
  const { id } = useParams();
  const navigate = useNavigate();
  const invoice = getInvoice(id);
  const settings = getSettings();
  const isQuotation = invoice?.documentType === "quotation";

  if (!invoice) return <NotFound />;

  function handleDelete() {
    if (!window.confirm(`Delete ${isQuotation ? "quotation" : "invoice"} ${invoice.number}? This can't be undone.`)) return;
    deleteInvoice(invoice.id);
    navigate("/admin/invoices");
  }

  function markPaid() {
    setInvoiceStatus(invoice.id, "paid");
    if (invoice.leadId) updateAdminInquiry(invoice.leadId, { paymentStatus: "paid" }).catch(() => {});
    navigate(0);
  }

  function convertToInvoice() {
    const converted = saveInvoice({
      ...invoice,
      id: undefined,
      number: undefined,
      documentType: "invoice",
      status: "draft",
      leadId: invoice.leadId || "",
      notes: invoice.notes,
    });
    if (invoice.leadId) updateAdminInquiry(invoice.leadId, { invoiceId: converted.id, status: "quotation_sent" }).catch(() => {});
    navigate("/admin/invoices/" + converted.id);
  }

  return (
    <div className="admin-page">
      <div className="admin-invoice-toolbar admin-print-hide">
        <Link to="/admin/invoices" className="btn btn-ghost btn-sm">← Back to invoices</Link>
        <div className="admin-row-actions">
          {isQuotation ? <button type="button" className="btn btn-primary btn-sm" onClick={convertToInvoice}>Convert to Invoice</button> : invoice.status !== "paid" && <button type="button" className="btn btn-line btn-sm" onClick={markPaid}>Record Payment</button>}
          <Link to={"/admin/invoices/" + invoice.id + "/edit"} className="btn btn-line btn-sm">Edit</Link>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => window.print()}>Print / Save as PDF</button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={handleDelete}>Delete</button>
        </div>
      </div>

      <div className="admin-invoice-sheet">
        <div className="admin-invoice-letterhead">
          <div>
            <h1>{settings.businessName}</h1>
            <p>{settings.address}</p>
            <p>{settings.phone} · {settings.email}</p>
            {settings.gstin && <p>GSTIN: {settings.gstin}</p>}
          </div>
          <div className="admin-invoice-id">
            <h2>{isQuotation ? "QUOTATION" : "INVOICE"}</h2>
            <p><strong>{invoice.number}</strong></p>
            <p>Issued: {invoice.issueDate}</p>
            {invoice.dueDate && <p>Due: {invoice.dueDate}</p>}
            <span className={"admin-badge admin-badge--" + invoice.status}>{STATUS_LABEL[invoice.status] || invoice.status}</span>
          </div>
        </div>

        <div className="admin-invoice-billto">
          <h3>Bill to</h3>
          <p><strong>{invoice.client?.name}</strong></p>
          {invoice.client?.address && <p>{invoice.client.address}</p>}
          {invoice.client?.city && <p>{invoice.client.city}</p>}
          {invoice.client?.phone && <p>{invoice.client.phone}</p>}
          {invoice.client?.email && <p>{invoice.client.email}</p>}
        </div>

        <table className="admin-invoice-items">
          <thead>
            <tr><th>Description</th><th>Qty</th><th>Rate</th><th>Amount</th></tr>
          </thead>
          <tbody>
            {invoice.items.map((it) => (
              <tr key={it.id}>
                <td>{it.description}</td>
                <td>{it.qty}</td>
                <td>{fmtINR(it.rate)}</td>
                <td>{fmtINR((Number(it.qty) || 0) * (Number(it.rate) || 0))}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="admin-invoice-totals">
          <div><span>Subtotal</span><b>{fmtINR(invoice.subtotal)}</b></div>
          {invoice.discount > 0 && <div><span>Discount</span><b>−{fmtINR(invoice.discount)}</b></div>}
          {invoice.taxRate > 0 && <div><span>Tax ({invoice.taxRate}%)</span><b>{fmtINR(invoice.taxAmount)}</b></div>}
          <div className="admin-totals-grand"><span>Total</span><b>{fmtINR(invoice.total)}</b></div>
        </div>

        {(settings.upiId || settings.bankDetails) && (
          <div className="admin-invoice-payment">
            <h3>Payment details</h3>
            {settings.upiId && <p>UPI: {settings.upiId}</p>}
            {settings.bankDetails && <p style={{ whiteSpace: "pre-line" }}>{settings.bankDetails}</p>}
          </div>
        )}

        {invoice.notes && <p className="admin-invoice-notes">{invoice.notes}</p>}
      </div>
    </div>
  );
}
