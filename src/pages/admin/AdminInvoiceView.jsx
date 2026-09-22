import { Link, useNavigate, useParams } from "react-router-dom";
import { useState } from "react";
import { getInvoice, getSettings, deleteInvoice, setInvoiceStatus, saveInvoice, getInvoiceBalance, recordInvoicePayment, writeOffInvoice } from "../../lib/adminStore";
import { updateAdminInquiry } from "../../lib/adminApi";
import { fmtINR } from "../../lib/pricing";
import usePageMeta from "../../hooks/usePageMeta";
import NotFound from "../NotFound";

const STATUS_LABEL = { draft: "Draft", sent: "Sent", partially_paid: "Partially paid", paid: "Paid", overdue: "Overdue", written_off: "Written off", cancelled: "Cancelled" };

export default function AdminInvoiceView() {
  usePageMeta("Invoice — Admin", "Admin panel.", { noindex: true });
  const { id } = useParams();
  const navigate = useNavigate();
  const invoice = getInvoice(id);
  const settings = getSettings();
  const isQuotation = invoice?.documentType === "quotation";
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Bank transfer");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [writeOffOpen, setWriteOffOpen] = useState(false);
  const [writeOffReason, setWriteOffReason] = useState("");

  if (!invoice) return <NotFound />;

  function handleDelete() {
    if (!window.confirm(`Delete ${isQuotation ? "quotation" : "invoice"} ${invoice.number}? This can't be undone.`)) return;
    deleteInvoice(invoice.id);
    navigate("/admin/invoices");
  }

  function recordPayment() {
    try {
      recordInvoicePayment(invoice.id, { amount: paymentAmount, method: paymentMethod, reference: paymentReference, notes: paymentNotes });
      setPaymentOpen(false);
      navigate(0);
    } catch (err) { window.alert(err.message || "Unable to record payment."); }
  }

  function handleWriteOff() {
    try {
      writeOffInvoice(invoice.id, getInvoiceBalance(invoice), writeOffReason);
      setWriteOffOpen(false);
      navigate(0);
    } catch (err) { window.alert(err.message || "Unable to write off balance."); }
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
      payments: [],
      writeOff: null,
    });
    if (invoice.leadId) updateAdminInquiry(invoice.leadId, { invoiceId: converted.id, status: "quotation_sent" }).catch(() => {});
    navigate("/admin/invoices/" + converted.id);
  }

  return (
    <div className="admin-page">
      <div className="admin-invoice-toolbar admin-print-hide">
        <Link to="/admin/invoices" className="btn btn-ghost btn-sm">← Back to invoices</Link>
        <div className="admin-row-actions">
          {isQuotation ? <button type="button" className="btn btn-primary btn-sm" onClick={convertToInvoice}>Convert to Invoice</button> : getInvoiceBalance(invoice) > 0.01 && <><button type="button" className="btn btn-line btn-sm" onClick={() => { setPaymentAmount(String(getInvoiceBalance(invoice))); setPaymentOpen(true); }}>Record Payment</button><button type="button" className="btn btn-ghost btn-sm" onClick={() => setWriteOffOpen(true)}>Write Off</button></>}
          <Link to={"/admin/invoices/" + invoice.id + "/edit"} className="btn btn-line btn-sm">Edit</Link>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => window.print()}>Print / Save as PDF</button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={handleDelete}>Delete</button>
        </div>
      </div>

      <div className="admin-invoice-sheet">
        <div className="admin-invoice-letterhead">
          <div className="admin-invoice-brand">
            {settings.logoUrl && <img className="admin-invoice-logo" src={settings.logoUrl} alt={settings.businessName} />}
            <div>
              <h1>{settings.businessName}</h1>
              <p>{settings.address}</p>
              <p>{settings.phone} · {settings.email}</p>
              {settings.gstin && <p>GSTIN: {settings.gstin}</p>}
            </div>
          </div>
          <div className="admin-invoice-id">
            <h2>{isQuotation ? "QUOTATION" : "INVOICE"}</h2>
            <p><strong>{invoice.number}</strong></p>
            <p>Issued: {invoice.issueDate}</p>
            <p>Event date: {invoice.eventDate || "—"}</p>
            <p>Event time: {invoice.eventTime || "—"}</p>
            <span className={"admin-badge admin-badge--" + invoice.status}>{STATUS_LABEL[invoice.status] || invoice.status}</span>
          </div>
        </div>

        <div className="admin-invoice-billto">
          <h3>Subject</h3><p><strong>{invoice.subject || "—"}</strong></p>
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

        <div className="admin-invoice-balance">
          <div><span>Paid</span><b>{fmtINR((invoice.payments || []).reduce((sum, p) => sum + (Number(p.amount) || 0), 0))}</b></div>
          {invoice.writeOff?.amount ? <div><span>Written off</span><b>{fmtINR(invoice.writeOff.amount)}</b></div> : null}
          <div className="admin-totals-grand"><span>Balance due</span><b>{fmtINR(getInvoiceBalance(invoice))}</b></div>
        </div>

        {(invoice.payments || []).length > 0 && <div className="admin-invoice-payment-history">
          <h3>Payment history</h3>
          {invoice.payments.map((payment) => <div className="admin-payment-row" key={payment.id}><span>{payment.paymentDate} · {payment.method}{payment.reference ? ` · ${payment.reference}` : ""}</span><b>{fmtINR(payment.amount)}</b></div>)}
        </div>}

        {invoice.writeOff?.reason && <p className="admin-invoice-notes"><strong>Write-off:</strong> {invoice.writeOff.reason} ({invoice.writeOff.date})</p>}
        {invoice.notes && <p className="admin-invoice-notes"><strong>Notes:</strong><br />{invoice.notes}</p>}
        {invoice.terms && <p className="admin-invoice-notes"><strong>Terms and Conditions:</strong><br />{invoice.terms}</p>}
      </div>

      {paymentOpen && <div className="admin-modal-backdrop admin-print-hide" onClick={() => setPaymentOpen(false)}><div className="admin-modal-card" onClick={(e) => e.stopPropagation()}><h2>Record Payment</h2><div className="form-group"><label>Amount *</label><input type="number" min="0.01" step="0.01" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} /></div><div className="form-group"><label>Payment method</label><select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}><option>Bank transfer</option><option>UPI</option><option>Cash</option><option>Card</option><option>Cheque</option><option>Other</option></select></div><div className="form-group"><label>Reference</label><input value={paymentReference} onChange={(e) => setPaymentReference(e.target.value)} placeholder="Transaction / receipt number" /></div><div className="form-group"><label>Notes</label><textarea value={paymentNotes} onChange={(e) => setPaymentNotes(e.target.value)} /></div><div className="admin-modal-actions"><button className="btn btn-ghost" onClick={() => setPaymentOpen(false)}>Cancel</button><button className="btn btn-primary" onClick={recordPayment}>Record Payment</button></div></div></div>}
      {writeOffOpen && <div className="admin-modal-backdrop admin-print-hide" onClick={() => setWriteOffOpen(false)}><div className="admin-modal-card" onClick={(e) => e.stopPropagation()}><h2>Write Off Balance</h2><p className="admin-hint">This will write off the full remaining balance of {fmtINR(getInvoiceBalance(invoice))}.</p><div className="form-group"><label>Reason *</label><textarea value={writeOffReason} onChange={(e) => setWriteOffReason(e.target.value)} placeholder="Why is this balance being written off?" /></div><div className="admin-modal-actions"><button className="btn btn-ghost" onClick={() => setWriteOffOpen(false)}>Cancel</button><button className="btn btn-primary" onClick={handleWriteOff}>Write Off</button></div></div></div>}
    </div>
  );
}
