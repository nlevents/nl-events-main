import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getInvoices, getInvoiceBalance, recordInvoicePayment } from "../../lib/adminStore";
import { fmtINR } from "../../lib/pricing";
import usePageMeta from "../../hooks/usePageMeta";

export default function AdminPayments() {
  usePageMeta("Payments — Admin", "Payment records and installments.", { noindex: true });
  const [invoices, setInvoices] = useState(() => getInvoices());
  const [query, setQuery] = useState("");
  const [openInvoice, setOpenInvoice] = useState(null);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("Bank transfer");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0,10));
  const [error, setError] = useState("");

  const payments = useMemo(() => {
    const q = query.trim().toLowerCase();
    return invoices.flatMap((invoice) => (invoice.payments || []).map((payment) => ({ ...payment, invoice })))
      .filter((row) => !q || [row.invoice.number, row.invoice.client?.name, row.reference, row.method].some((v) => (v || "").toLowerCase().includes(q)))
      .sort((a, b) => (b.paymentDate || b.createdAt || "").localeCompare(a.paymentDate || a.createdAt || ""));
  }, [invoices, query]);

  const totalReceived = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  function refresh() { setInvoices(getInvoices()); }

  function openRecord(invoice) {
    setOpenInvoice(invoice);
    setAmount(String(Math.max(0, getInvoiceBalance(invoice)).toFixed(2)));
    setMethod("Bank transfer"); setReference(""); setNotes(""); setPaymentDate(new Date().toISOString().slice(0,10)); setError("");
  }

  function submitPayment() {
    try {
      if (!openInvoice) return;
      recordInvoicePayment(openInvoice.id, { amount, method, reference, notes, paymentDate });
      refresh();
      setOpenInvoice(null);
    } catch (err) { setError(err.message || "Unable to record payment."); }
  }

  const outstandingInvoices = invoices.filter((i) => i.documentType !== "quotation" && getInvoiceBalance(i) > 0.01);

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <div><h1>Payments</h1><p className="admin-hint">Every installment and payment recorded against an invoice.</p></div>
      </header>
      <div className="admin-toolbar">
        <input className="admin-search" placeholder="Search payment, invoice or client…" value={query} onChange={(e) => setQuery(e.target.value)} />
        <strong>Total received: {fmtINR(totalReceived)}</strong>
      </div>
      {payments.length === 0 ? <p className="admin-empty">No payment records yet.</p> : (
        <table className="admin-table">
          <thead><tr><th>Date</th><th>Invoice</th><th>Client</th><th>Method</th><th>Reference</th><th>Amount</th><th></th></tr></thead>
          <tbody>{payments.map((p) => <tr key={`${p.invoice.id}-${p.id}`}>
            <td>{p.paymentDate || "—"}</td>
            <td><Link to={`/admin/invoices/${p.invoice.id}`}>{p.invoice.number}</Link></td>
            <td>{p.invoice.client?.name || "—"}</td>
            <td>{p.method || "—"}</td>
            <td>{p.reference || "—"}</td>
            <td><strong>{fmtINR(p.amount)}</strong></td>
            <td><Link className="btn btn-line btn-sm" to={`/admin/invoices/${p.invoice.id}`}>View invoice</Link></td>
          </tr>)}</tbody>
        </table>
      )}
      <section className="admin-panel" style={{ marginTop: 24 }}>
        <h2>Outstanding invoices</h2>
        {outstandingInvoices.length === 0 ? <p className="admin-empty">No outstanding invoice balances.</p> : <div className="crm-detail-document-list">{outstandingInvoices.map((invoice) => <div key={invoice.id}>
          <b><Link to={`/admin/invoices/${invoice.id}`}>{invoice.number}</Link></b><span>{invoice.client?.name || "—"}</span><strong>{fmtINR(getInvoiceBalance(invoice))} due</strong><button type="button" className="btn btn-primary btn-sm" onClick={() => openRecord(invoice)}>Record Payment</button>
        </div>)}</div>}
      </section>

      {openInvoice && <div className="admin-modal-backdrop admin-print-hide" onClick={() => setOpenInvoice(null)}><div className="admin-modal-card" onClick={(e) => e.stopPropagation()}>
        <h2>Record Payment</h2><p className="admin-hint">{openInvoice.number} · {openInvoice.client?.name || "Client"} · Balance {fmtINR(getInvoiceBalance(openInvoice))}</p>
        <div className="form-group"><label>Amount *</label><input type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
        <div className="form-group"><label>Payment date</label><input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} /></div>
        <div className="form-group"><label>Payment method</label><select value={method} onChange={(e) => setMethod(e.target.value)}><option>Bank transfer</option><option>UPI</option><option>Cash</option><option>Card</option><option>Cheque</option><option>Other</option></select></div>
        <div className="form-group"><label>Reference</label><input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Transaction / receipt number" /></div>
        <div className="form-group"><label>Notes</label><textarea value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        {error && <p className="admin-error">{error}</p>}
        <div className="admin-modal-actions"><button className="btn btn-ghost" onClick={() => setOpenInvoice(null)}>Cancel</button><button className="btn btn-primary" onClick={submitPayment}>Record Payment</button></div>
      </div></div>}
    </div>
  );
}
