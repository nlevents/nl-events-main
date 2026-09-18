import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { saveClient } from "../../lib/adminStore";
import { deleteAdminInquiry, fetchAdminInquiries, updateAdminInquiry } from "../../lib/adminApi";
import Icon from "../../components/Icon";
import usePageMeta from "../../hooks/usePageMeta";

const STAGES = [
  { key: "new_lead", label: "New Lead" },
  { key: "discovery_call", label: "Discovery Call" },
  { key: "meeting_scheduled", label: "Meeting Scheduled" },
  { key: "quotation_sent", label: "Quotation Sent" },
  { key: "deal_closed", label: "Deal Closed" },
];
const TABS = [
  { key: "inquiries", label: "Inquiries" },
  { key: "leads", label: "Leads" },
  { key: "bookings", label: "Bookings" },
];
const stageLabel = Object.fromEntries(STAGES.map((s) => [s.key, s.label]));
function fmtDate(value) {
  if (!value) return "—";
  const d = new Date(String(value).length === 10 ? `${value}T00:00:00` : value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
function mapRecord(row) {
  return {
    ...row,
    id: row.id,
    name: row.name || "Anonymous Client",
    phone: row.phone || "",
    eventType: row.event_type || "Event",
    eventDate: row.event_date || "",
    eventTime: row.event_time || "",
    eventVenue: row.event_venue || "",
    eventLocation: row.event_location || row.city || "",
    guestCount: row.guest_count || "",
    message: row.message || "",
    status: row.status || "new_lead",
    adminNotes: row.admin_notes || "",
    quotationId: row.quotation_id || "",
    invoiceId: row.invoice_id || "",
    paymentStatus: row.payment_status || "pending",
    source: row.source || "inquiry",
    createdAt: row.created_at || "",
    booking: row.booking || null,
  };
}

export default function AdminInquiries() {
  usePageMeta("CRM — Admin", "Manage inquiries, leads and bookings.", { noindex: true });
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [tab, setTab] = useState("inquiries");
  const [stage, setStage] = useState("all");
  const [selected, setSelected] = useState(null);
  const [noteEdit, setNoteEdit] = useState("");
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function refresh() {
    try {
      setError("");
      const result = await fetchAdminInquiries();
      const next = (result.inquiries || []).map(mapRecord);
      setRecords(next);
      if (selected) {
        const fresh = next.find((i) => i.id === selected.id);
        if (fresh) setSelected(fresh);
      }
    } catch (err) { setError(err.message || "Unable to load CRM records."); }
    finally { setLoading(false); }
  }
  useEffect(() => { refresh(); const timer = setInterval(refresh, 15000); return () => clearInterval(timer); }, []);

  const inquiries = useMemo(() => records.filter((r) => r.source === "contact"), [records]);
  const leads = useMemo(() => records.filter((r) => r.source !== "contact" && r.source !== "booking" && r.source !== "landing"), [records]);
  const bookings = useMemo(() => records.filter((r) => r.source === "booking"), [records]);
  const visible = tab === "inquiries" ? inquiries : tab === "leads" ? leads : bookings;
  const filtered = tab === "leads" && stage !== "all" ? visible.filter((r) => r.status === stage) : visible;

  function selectRecord(record) { setSelected(record); setNoteEdit(record.adminNotes || ""); }
  async function handleStageChange(id, status) {
    try { await updateAdminInquiry(id, { status }); await refresh(); setFeedback(`Lead moved to ${stageLabel[status]}.`); setTimeout(() => setFeedback(""), 2500); }
    catch (err) { setError(err.message || "Unable to update lead stage."); }
  }
  async function handleSaveNote(id) {
    try { await updateAdminInquiry(id, { adminNotes: noteEdit }); await refresh(); setFeedback("Saved admin notes."); setTimeout(() => setFeedback(""), 2500); }
    catch (err) { setError(err.message || "Unable to save notes."); }
  }
  async function handleDelete(id, name) {
    if (!window.confirm(`Delete this record from "${name}"?`)) return;
    try { await deleteAdminInquiry(id); setSelected(null); await refresh(); setFeedback("Record deleted."); setTimeout(() => setFeedback(""), 2500); }
    catch (err) { setError(err.message || "Unable to delete record."); }
  }
  function getOrCreateClient(r) {
    return saveClient({ name: r.name, phone: r.phone, email: "", city: r.eventLocation || "Ranchi", address: r.eventVenue || "", notes: `Lead for ${r.eventType}. Event date: ${r.eventDate || "TBD"}. Guest count: ${r.guestCount || "TBD"}. Requirements: ${r.message || "—"}` });
  }
  function createQuotation(r) { const client = getOrCreateClient(r); navigate("/admin/invoices/new", { state: { clientId: client.id, leadId: r.id, documentType: "quotation", lead: r } }); }
  function createInvoice(r) { const client = getOrCreateClient(r); navigate("/admin/invoices/new", { state: { clientId: client.id, leadId: r.id, documentType: "invoice", lead: r } }); }

  const title = tab === "inquiries" ? "Inquiries" : tab === "leads" ? "Leads" : "Bookings";
  const subtitle = tab === "inquiries"
    ? "Contact-page submissions. These are general inquiries, separate from the sales lead pipeline."
    : tab === "leads"
      ? "Event inquiries that enter the sales pipeline: discovery call → meeting → quotation → deal."
      : "Product and package bookings submitted from the website.";

  return <div className="admin-page">
    <div className="admin-page-head"><div><h1>{title}</h1><p className="admin-hint">{subtitle}</p></div><button className="btn btn-ghost" type="button" onClick={() => { setLoading(true); refresh(); }} disabled={loading}>{loading ? "Loading…" : "Refresh"}</button></div>
    {feedback && <div className="admin-alert admin-alert--success">{feedback}</div>}
    {error && <div className="admin-alert admin-alert--error">{error}</div>}

    <div className="admin-tabs" role="tablist" aria-label="CRM sections">
      {TABS.map((item) => {
        const count = item.key === "inquiries" ? inquiries.length : item.key === "leads" ? leads.length : bookings.length;
        return <button key={item.key} type="button" role="tab" aria-selected={tab === item.key} className={`admin-tab ${tab === item.key ? "active" : ""}`} onClick={() => { setTab(item.key); setStage("all"); setSelected(null); }}>{item.label} ({count})</button>;
      })}
    </div>

    {tab === "leads" && <div className="admin-tabs admin-tabs--secondary">
      <button type="button" className={`admin-tab ${stage === "all" ? "active" : ""}`} onClick={() => setStage("all")}>All Leads ({leads.length})</button>
      {STAGES.map((s) => <button key={s.key} type="button" className={`admin-tab ${stage === s.key ? "active" : ""}`} onClick={() => setStage(s.key)}>{s.label} ({leads.filter((r) => r.status === s.key).length})</button>)}
    </div>}

    <div className="admin-inquiries-layout">
      <div className="admin-panel admin-inquiries-table-panel">
        {loading ? <p className="admin-empty">Loading {title.toLowerCase()}…</p> : filtered.length === 0 ? <p className="admin-empty">No {title.toLowerCase()} yet.</p> :
          <table className="admin-table"><thead><tr>
            <th>Customer</th><th>Event</th><th>Date / Location</th><th>{tab === "bookings" ? "Booking" : "Status"}</th><th>Actions</th>
          </tr></thead><tbody>
            {filtered.map((r) => <tr key={r.id} className={selected?.id === r.id ? "row-selected" : ""} onClick={() => selectRecord(r)} style={{ cursor: "pointer" }}>
              <td><strong>{r.name}</strong><div className="admin-table-sub">{r.phone}</div></td>
              <td><span className="admin-badge admin-badge--sent">{r.eventType}</span></td>
              <td><div>{fmtDate(r.eventDate)} · {r.eventTime || "Time TBD"}</div><div className="admin-hint">{r.eventLocation || "Location TBD"}</div></td>
              <td onClick={(e) => e.stopPropagation()}>{tab === "bookings" ? <span className="admin-badge">{r.booking?.booking_status || "pending"}</span> : tab === "leads" ? <select className="admin-select admin-select-sm" value={r.status} onChange={(e) => handleStageChange(r.id, e.target.value)}>{STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}</select> : <span className="admin-badge">New Inquiry</span>}</td>
              <td onClick={(e) => e.stopPropagation()}><div className="admin-row-actions">
                {tab === "leads" && <button className="btn btn-sm btn-primary" type="button" onClick={() => createQuotation(r)}>Quotation</button>}
                {tab === "bookings" && <button className="btn btn-sm btn-primary" type="button" onClick={() => createInvoice(r)}>Invoice</button>}
                <button className="btn-icon btn-icon-danger" type="button" title="Delete" onClick={() => handleDelete(r.id, r.name)}><Icon name="trash" /></button>
              </div></td>
            </tr>)}
          </tbody></table>}
      </div>

      {selected && <div className="admin-panel admin-inquiry-detail-panel">
        <div className="admin-panel-head"><h2>{tab === "inquiries" ? "Inquiry Details" : tab === "leads" ? "Lead Details" : "Booking Details"}</h2><button type="button" className="btn-icon" onClick={() => setSelected(null)}><Icon name="close" /></button></div>
        <div className="admin-lead-detail-body">
          <div className="admin-lead-head"><h3>{selected.name}</h3><span className="admin-table-sub">Received {fmtDate(selected.createdAt)}</span></div>
          <div className="admin-lead-info-grid">
            <div><span className="admin-label">Mobile:</span><div><a href={`tel:${selected.phone}`}>{selected.phone || "—"}</a></div></div>
            <div><span className="admin-label">Event Type:</span><div>{selected.eventType}</div></div>
            <div><span className="admin-label">Event Date:</span><div>{fmtDate(selected.eventDate)}</div></div>
            <div><span className="admin-label">Event Time:</span><div>{selected.eventTime || "—"}</div></div>
            <div><span className="admin-label">Venue:</span><div>{selected.eventVenue || "—"}</div></div>
            <div><span className="admin-label">Location:</span><div>{selected.eventLocation || "—"}</div></div>
            <div><span className="admin-label">Guest Count:</span><div>{selected.guestCount || "—"}</div></div>
            {tab !== "inquiries" && <div><span className="admin-label">Sales Stage:</span><div>{stageLabel[selected.status] || selected.status}</div></div>}
          </div>
          {tab === "bookings" && selected.booking && <div className="admin-lead-info-grid" style={{ marginTop: 16 }}>
            <div><span className="admin-label">Booking Ref:</span><div>{selected.booking.ref || "—"}</div></div>
            <div><span className="admin-label">Total:</span><div>₹{Number(selected.booking.total || 0).toLocaleString("en-IN")}</div></div>
            <div><span className="admin-label">Booking Status:</span><div>{selected.booking.booking_status || "pending"}</div></div>
            <div><span className="admin-label">Payment:</span><div>{selected.booking.payment_status || "not_required"}</div></div>
          </div>}
          <div style={{ marginTop: 16 }}><span className="admin-label">Vision / Requirements:</span><p className="admin-lead-message" style={{ whiteSpace: "pre-line" }}>{selected.message || "(No description provided)"}</p></div>
          {tab !== "inquiries" && <>
            <div style={{ marginTop: 16 }}><span className="admin-label">Accounting Flow:</span><div className="admin-flow-box"><span>Lead</span><span>→</span><span>Quotation</span><span>→</span><span>Invoice</span><span>→</span><span>Payment</span></div></div>
            <div className="admin-row-actions" style={{ marginTop: 16 }}><button className="btn btn-primary btn-sm" type="button" onClick={() => createQuotation(selected)}>Create Quotation</button><button className="btn btn-line btn-sm" type="button" onClick={() => createInvoice(selected)}>Create Invoice</button></div>
          </>}
          <div style={{ marginTop: 20 }}><span className="admin-label">Admin Notes</span><textarea className="admin-textarea" value={noteEdit} onChange={(e) => setNoteEdit(e.target.value)} placeholder="Internal notes…" /><button className="btn btn-ghost btn-sm" type="button" style={{ marginTop: 8 }} onClick={() => handleSaveNote(selected.id)}>Save Notes</button></div>
          <div className="admin-row-actions" style={{ marginTop: 20 }}><button className="btn-icon btn-icon-danger" type="button" onClick={() => handleDelete(selected.id, selected.name)}><Icon name="trash" /> Delete</button></div>
        </div>
      </div>}
    </div>
  </div>;
}
