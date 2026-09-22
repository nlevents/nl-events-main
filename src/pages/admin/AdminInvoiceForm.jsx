import { useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { getClients, saveClient, getInvoice, saveInvoice, computeTotals, getSettings } from "../../lib/adminStore";
import { PACKAGE_SUMMARY } from "../../data/chatbotKnowledge";
import { cityPrice, fmtINR } from "../../lib/pricing";
import usePageMeta from "../../hooks/usePageMeta";
import { updateAdminInquiry } from "../../lib/adminApi";

function uidLocal() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function blankItem() {
  return { id: uidLocal(), description: "", qty: 1, rate: 0 };
}

export default function AdminInvoiceForm() {
  usePageMeta("Invoice form — Admin", "Admin panel.", { noindex: true });
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const settings = getSettings();
  // Support both explicit navigation state and direct /admin/quotations/* URLs.
  // This keeps quotation creation/editing working even after a refresh.
  const requestedType = location.state?.documentType || (location.pathname.startsWith("/admin/quotations") ? "quotation" : "invoice");
  const requestedLeadId = location.state?.leadId || "";
  const requestedLead = location.state?.lead || null;
  const existing = id ? getInvoice(id) : null;
  const documentType = existing?.documentType || requestedType;
  const leadId = existing?.leadId || requestedLeadId;

  const [clients, setClients] = useState(() => getClients());
  const [clientId, setClientId] = useState(existing?.clientId || location.state?.clientId || "");
  const [clientSnapshot, setClientSnapshot] = useState(existing?.client || (location.state?.clientId ? getClients().find((c) => c.id === location.state.clientId) || null : null));
  const [showNewClient, setShowNewClient] = useState(false);
  const [newClient, setNewClient] = useState({ name: "", phone: "", email: "", address: "", city: "Ranchi" });

  const [issueDate, setIssueDate] = useState(existing?.issueDate || today());
  const [eventDate, setEventDate] = useState(existing?.eventDate || existing?.dueDate || "");
  const [eventTime, setEventTime] = useState(existing?.eventTime || "");
  const [subject, setSubject] = useState(existing?.subject || "");
  const initialLeadItem = requestedLead ? [{ id: uidLocal(), description: `${requestedLead.eventType || "Event"} — event services`, qty: 1, rate: 0 }] : [blankItem()];
  const [items, setItems] = useState(existing?.items?.length ? existing.items : initialLeadItem);
  const [discount, setDiscount] = useState(existing?.discount || 0);
  const [taxRate, setTaxRate] = useState(existing?.taxRate ?? settings.defaultTaxRate);
  const [status, setStatus] = useState(existing?.status || "draft");
  const [notes, setNotes] = useState(existing?.notes ?? settings.invoiceNotes);
  const [terms, setTerms] = useState(existing?.terms ?? settings.defaultTerms);
  const [packagePick, setPackagePick] = useState("");
  const [error, setError] = useState("");

  const totals = useMemo(() => computeTotals(items, discount, taxRate), [items, discount, taxRate]);

  function updateItem(itemId, field, value) {
    setItems((list) => list.map((it) => (it.id === itemId ? { ...it, [field]: value } : it)));
  }

  function addItem() {
    setItems((list) => [...list, blankItem()]);
  }

  function removeItem(itemId) {
    setItems((list) => (list.length > 1 ? list.filter((it) => it.id !== itemId) : list));
  }

  function addPackageAsItem() {
    const pkg = PACKAGE_SUMMARY.find((p) => p.id === packagePick);
    if (!pkg) return;
    const city = clientSnapshot?.city || "Ranchi";
    const rate = typeof pkg.basePrice === "number" ? cityPrice(pkg.basePrice, city) : 0;
    setItems((list) => {
      const withoutBlank = list.filter((it) => it.description.trim() !== "");
      return [...withoutBlank, { id: uidLocal(), description: pkg.name + " package", qty: 1, rate }];
    });
    setPackagePick("");
  }

  function pickClient(id) {
    setClientId(id);
    const c = clients.find((cl) => cl.id === id);
    setClientSnapshot(c ? { name: c.name, phone: c.phone, email: c.email, address: c.address, city: c.city } : null);
  }

  function handleAddNewClient() {
    if (!newClient.name.trim()) return setError("New client needs a name.");
    const saved = saveClient(newClient);
    setClients(getClients());
    pickClient(saved.id);
    setShowNewClient(false);
    setNewClient({ name: "", phone: "", email: "", address: "", city: "Ranchi" });
    setError("");
  }

  function handleSave(e) {
    e.preventDefault();
    if (!clientSnapshot) return setError("Choose or add a client.");
    if (!subject.trim()) return setError("Subject is required.");
    if (!eventDate) return setError("Event date is required.");
    if (!eventTime) return setError("Event time is required.");
    const cleanItems = items.filter((it) => it.description.trim() !== "");
    if (cleanItems.length === 0) return setError("Add at least one line item.");
    setError("");

    const saved = saveInvoice({
      id: existing?.id,
      number: existing?.number,
      clientId,
      client: clientSnapshot,
      issueDate,
      eventDate,
      eventTime,
      subject: subject.trim(),
      items: cleanItems,
      discount: Number(discount) || 0,
      taxRate: Number(taxRate) || 0,
      status,
      notes,
      terms,
      documentType,
      leadId,
    });
    if (leadId) {
      updateAdminInquiry(leadId, documentType === "quotation"
        ? { quotationId: saved.id, status: "quotation_sent" }
        : { invoiceId: saved.id }
      ).catch(() => {});
    }
    navigate((documentType === "quotation" ? "/admin/quotations/" : "/admin/invoices/") + saved.id);
  }

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <h1>{existing ? (documentType === "quotation" ? "Edit quotation " : "Edit invoice ") + existing.number : (documentType === "quotation" ? "New quotation" : "New invoice")}</h1>
      </header>

      <form className="admin-invoice-form" onSubmit={handleSave}>
        <section className="admin-panel">
          <h2>Client</h2>
          {!showNewClient ? (
            <div className="form-row-2">
              <div className="form-group">
                <label>Choose an existing client</label>
                <select value={clientId} onChange={(e) => pickClient(e.target.value)}>
                  <option value="">— Select —</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ alignSelf: "end" }}>
                <button type="button" className="btn btn-line" onClick={() => setShowNewClient(true)}>+ New client instead</button>
              </div>
            </div>
          ) : (
            <div>
              <div className="form-row-2">
                <div className="form-group"><label>Name</label><input value={newClient.name} onChange={(e) => setNewClient((c) => ({ ...c, name: e.target.value }))} autoFocus /></div>
                <div className="form-group"><label>Phone</label><input value={newClient.phone} onChange={(e) => setNewClient((c) => ({ ...c, phone: e.target.value }))} /></div>
              </div>
              <div className="admin-modal-actions" style={{ justifyContent: "flex-start" }}>
                <button type="button" className="btn btn-primary btn-sm" onClick={handleAddNewClient}>Add &amp; select</button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowNewClient(false)}>Cancel</button>
              </div>
            </div>
          )}
          {clientSnapshot && (
            <p className="admin-hint">Billing: {clientSnapshot.name} · {clientSnapshot.phone || clientSnapshot.email || "no contact on file"} · {clientSnapshot.city}</p>
          )}
        </section>

        <section className="admin-panel">
          <h2>Event details &amp; status</h2>
          <div className="form-row-2">
            <div className="form-group"><label>Subject *</label><input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Wedding decoration package" required /></div>
            <div className="form-group"><label>Issue date</label><input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} /></div>
          </div>
          <div className="form-row-2">
            <div className="form-group"><label>Event date *</label><input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} required /></div>
            <div className="form-group"><label>Event time *</label><input type="time" value={eventTime} onChange={(e) => setEventTime(e.target.value)} required /></div>
          </div>
          <div className="form-group">
            <label>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="partially_paid">Partially paid</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
              <option value="written_off">Written off</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </section>

        <section className="admin-panel">
          <h2>Line items</h2>

          <div className="form-row-2" style={{ marginBottom: 16 }}>
            <div className="form-group">
              <label>Quick-add from a package {clientSnapshot ? "(priced for " + clientSnapshot.city + ")" : ""}</label>
              <select value={packagePick} onChange={(e) => setPackagePick(e.target.value)}>
                <option value="">— Choose a package —</option>
                {PACKAGE_SUMMARY.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ alignSelf: "end" }}>
              <button type="button" className="btn btn-line" disabled={!packagePick} onClick={addPackageAsItem}>Add to invoice</button>
            </div>
          </div>

          <table className="admin-table admin-line-items">
            <thead><tr><th>Description</th><th>Qty</th><th>Rate</th><th>Amount</th><th></th></tr></thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id}>
                  <td><input value={it.description} onChange={(e) => updateItem(it.id, "description", e.target.value)} placeholder="Description" /></td>
                  <td><input type="number" min="0" step="1" value={it.qty} onChange={(e) => updateItem(it.id, "qty", e.target.value)} className="admin-num-input" /></td>
                  <td><input type="number" min="0" step="1" value={it.rate} onChange={(e) => updateItem(it.id, "rate", e.target.value)} className="admin-num-input" /></td>
                  <td>{fmtINR((Number(it.qty) || 0) * (Number(it.rate) || 0))}</td>
                  <td><button type="button" className="btn btn-ghost btn-sm" onClick={() => removeItem(it.id)}>✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <button type="button" className="btn btn-line btn-sm" onClick={addItem}>+ Add line</button>

          <div className="admin-totals">
            <div className="form-row-2">
              <div className="form-group"><label>Discount (₹)</label><input type="number" min="0" value={discount} onChange={(e) => setDiscount(e.target.value)} className="admin-num-input" /></div>
              <div className="form-group"><label>Tax rate (%)</label><input type="number" min="0" step="0.1" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} className="admin-num-input" /></div>
            </div>
            <div className="admin-totals-summary">
              <div><span>Subtotal</span><b>{fmtINR(totals.subtotal)}</b></div>
              <div><span>Tax</span><b>{fmtINR(totals.taxAmount)}</b></div>
              <div className="admin-totals-grand"><span>Total</span><b>{fmtINR(totals.total)}</b></div>
            </div>
          </div>
        </section>

        <section className="admin-panel">
          <h2>Notes &amp; Terms and Conditions</h2>
          <div className="form-group"><label>Customer notes</label><textarea value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
          <div className="form-group"><label>Terms and conditions</label><textarea value={terms} onChange={(e) => setTerms(e.target.value)} rows="6" placeholder="Add terms and conditions for this quotation/invoice…" /></div>
        </section>

        {error && <p className="form-error">{error}</p>}
        <div className="admin-modal-actions">
          <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>Cancel</button>
          <button type="submit" className="btn btn-primary">{existing ? "Save changes" : (documentType === "quotation" ? "Create quotation" : "Create invoice")}</button>
        </div>
      </form>
    </div>
  );
}
