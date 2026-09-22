import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Icon from "../../components/Icon";
import usePageMeta from "../../hooks/usePageMeta";
import { getInvoices, saveClient } from "../../lib/adminStore";
import { fetchAdminInquiries, updateAdminInquiry, deleteAdminInquiry } from "../../lib/adminApi";

const STAGES = [
  { key: "new_lead", label: "New Inquiry" },
  { key: "contacted", label: "Contacted" },
  { key: "discovery_call", label: "Discovery Call" },
  { key: "meeting_scheduled", label: "Meeting Scheduled" },
  { key: "quotation_sent", label: "Quotation Sent" },
  { key: "negotiation", label: "Negotiation" },
  { key: "deal_closed", label: "Won" },
  { key: "lost", label: "Lost" },
  { key: "junk", label: "Junk" },
];
const STAGE_LABEL = Object.fromEntries(STAGES.map((item) => [item.key, item.label]));
const SOURCE_ALIASES = { landing: "Landing Page", contact: "Inquiry Form", inquiry: "Inquiry Form", manual: "CRM", website: "Website", booking: "Booking" };

function fmtDate(value) {
  if (!value) return "—";
  const d = new Date(String(value).length === 10 ? `${value}T00:00:00` : value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
function fmtDateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}
function sourceDetail(value) {
  const raw = String(value || "").trim();
  return SOURCE_ALIASES[raw.toLowerCase()] || raw || "Inquiry Form";
}
function mapRecord(row) {
  return {
    ...row,
    id: row.id,
    displayId: row.display_id || row.lead_id || row.id,
    name: row.name || "Anonymous Client",
    phone: row.phone || "",
    whatsapp: row.whatsapp_number || row.phone || "",
    email: row.email || "",
    city: row.city || row.event_location || "",
    eventType: row.event_type || "Event",
    eventDate: row.event_date || "",
    eventTime: row.event_time || "",
    eventVenue: row.event_venue || "",
    eventLocation: row.event_location || row.city || "",
    guestCount: row.guest_count || "",
    budget: row.budget || "",
    message: row.message || "",
    status: row.status || "new_lead",
    adminNotes: row.admin_notes || "",
    source: row.source || "inquiry",
    sourceDetail: sourceDetail(row.source),
    leadSource: row.lead_source || "Website",
    sourceType: row.source_type || "AUTO",
    createdAt: row.created_at || "",
    assignedTo: row.assigned_to_name || row.assigned_to || "Unassigned",
    nextFollowUp: row.next_follow_up || "",
  };
}

function getClientsForRecord(record) {
  try {
    const raw = window.localStorage.getItem("nle-admin-clients");
    const clients = raw ? JSON.parse(raw) : [];
    return (Array.isArray(clients) ? clients : []).filter((client) => {
      const samePhone = record.phone && client.phone && String(record.phone).replace(/\D/g, "") === String(client.phone).replace(/\D/g, "");
      const sameEmail = record.email && client.email && String(record.email).toLowerCase() === String(client.email).toLowerCase();
      return samePhone || sameEmail;
    });
  } catch {
    return [];
  }
}

export default function AdminLeadDetails() {
  usePageMeta("CRM — Client Details", "Full client details, events, quotations, invoices, payments, notes, documents and activity.", { noindex: true });
  const navigate = useNavigate();
  const { leadId } = useParams();
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("overview");
  const [noteEdit, setNoteEdit] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [moreMenu, setMoreMenu] = useState(false);
  const [feedback, setFeedback] = useState("");

  async function loadLead() {
    setLoading(true);
    setError("");
    try {
      const result = await fetchAdminInquiries();
      const found = (result.inquiries || []).map(mapRecord).find((item) => String(item.id) === String(leadId));
      if (!found) {
        setRecord(null);
        setError("Lead not found.");
        return;
      }
      setRecord(found);
      setNoteEdit(found.adminNotes || "");
    } catch (err) {
      setError(err.message || "Unable to load lead details.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadLead(); }, [leadId]);

  const relatedInvoices = useMemo(() => {
    if (!record) return [];
    return getInvoices().filter((invoice) => {
      if (invoice.leadId === record.id) return true;
      return getClientsForRecord(record).some((client) => client && client.id === invoice.clientId);
    });
  }, [record]);
  const quotations = relatedInvoices.filter((invoice) => invoice.documentType === "quotation");
  const invoices = relatedInvoices.filter((invoice) => invoice.documentType !== "quotation");
  const payments = invoices.filter((invoice) => invoice.status === "paid");

  if (loading) return <div className="crm-page"><div className="crm-empty">Loading client details…</div></div>;
  if (!record) return <div className="crm-page"><div className="crm-empty">{error || "Lead not found."}<br /><button type="button" className="crm-detail-gold-btn" onClick={() => navigate("/admin/inquiries")}>Back to Leads</button></div></div>;

  const initials = String(record.name || "CL").split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "CL";
  const statusLabel = STAGE_LABEL[record.status] || record.status || "New Inquiry";
  const eventDate = record.eventDate ? fmtDate(record.eventDate) : "—";
  const budget = record.budget || "—";
  const location = record.eventLocation || record.city || "—";
  const phone = record.phone || "—";
  const email = record.email || "—";
  const source = record.sourceDetail || record.leadSource || "Inquiry Form";
  const noteText = record.adminNotes || record.message || "No notes have been added for this lead yet.";
  const eventCount = record.eventDate ? 1 : 0;
  const noteCount = noteText && noteText !== "No notes have been added for this lead yet." ? 1 : 0;

  async function saveNote() {
    setSavingNote(true);
    try {
      await updateAdminInquiry(record.id, { adminNotes: noteEdit });
      setRecord((prev) => ({ ...prev, adminNotes: noteEdit }));
      setFeedback("Note saved.");
      setTimeout(() => setFeedback(""), 2200);
    } catch (err) {
      setError(err.message || "Unable to save note.");
    } finally {
      setSavingNote(false);
    }
  }

  async function changeStatus(status) {
    try {
      await updateAdminInquiry(record.id, { status });
      setRecord((prev) => ({ ...prev, status }));
      setFeedback(`Lead moved to ${STAGE_LABEL[status]}.`);
      setTimeout(() => setFeedback(""), 2200);
    } catch (err) {
      setError(err.message || "Unable to update lead status.");
    }
  }

  async function deleteLead() {
    if (!window.confirm(`Delete ${record.name}? This cannot be undone.`)) return;
    try {
      await deleteAdminInquiry(record.id);
      navigate("/admin/inquiries", { replace: true });
    } catch (err) {
      setError(err.message || "Unable to delete lead.");
    }
  }

  function createQuotation() {
    const client = saveClient({ name: record.name, phone: record.phone, email: record.email || "", city: location, address: record.eventVenue || "", notes: `Lead for ${record.eventType}. Event date: ${record.eventDate || "TBD"}. Guest count: ${record.guestCount || "TBD"}. Requirements: ${record.message || "—"}` });
    navigate("/admin/invoices/new", { state: { clientId: client.id, leadId: record.id, documentType: "quotation", lead: record } });
  }

  return (
    <div className="crm-page">
      <main className="crm-content">
        {feedback && <div className="crm-feedback">{feedback}</div>}
        {error && <div className="crm-error">{error}</div>}
        <div className="crm-lead-details-page">
          <div className="crm-lead-detail-breadcrumb">
            <button type="button" onClick={() => navigate("/admin/inquiries")}>← Back to Leads</button><span>›</span><strong>Client Details / Overview</strong>
          </div>

          <div className="crm-lead-detail-header">
            <div className="crm-lead-detail-identity">
              <div className="crm-lead-avatar">{initials}</div>
              <div>
                <div className="crm-lead-name-row"><h1>{record.name}</h1><Icon name="star" /></div>
                <p>Client ID: {String(record.displayId || record.id).slice(0, 20)} <span>│</span> Source: {source} <span>│</span> Added on {fmtDate(record.createdAt)}</p>
                <div className="crm-lead-tags"><span>VIP Client</span><span>Repeat Client</span><span>High Potential</span><button type="button">＋ Add Tag</button></div>
              </div>
            </div>
            <div className="crm-lead-detail-actions">
              <button type="button" onClick={() => navigate(`/admin/inquiries?edit=${encodeURIComponent(record.id)}`)}><Icon name="edit" /> Edit</button>
              <button type="button" onClick={createQuotation}><Icon name="send" /> Create Quotation</button>
              <button type="button" onClick={() => setFeedback("Create Event is ready to be connected to the event workflow.")}><Icon name="calendar" /> Create Event</button>
              <button type="button" className="primary" onClick={() => { setTab("notes"); setNoteEdit(record.adminNotes || ""); }}><Icon name="plus" /> Add Note</button>
              <button type="button" onClick={() => setMoreMenu((value) => !value)}>More <span>⌄</span></button>
              {moreMenu && <div className="crm-lead-detail-more"><button type="button" onClick={deleteLead}>Delete Lead</button><button type="button" onClick={() => setFeedback(record.nextFollowUp ? `Follow-up: ${fmtDateTime(record.nextFollowUp)}` : "No follow-up is scheduled.")}>Schedule Follow-up</button></div>}
            </div>
          </div>

          <div className="crm-lead-contact-strip">
            <a href={record.phone ? `tel:${record.phone}` : undefined}><span className="contact-icon"><Icon name="phone" /></span><span><b>{phone}</b><small>Call</small></span></a>
            <a href={record.phone ? `https://wa.me/${String(record.whatsapp || record.phone).replace(/\D/g, "")}` : undefined} target="_blank" rel="noreferrer"><span className="contact-icon whatsapp"><Icon name="whatsapp" /></span><span><b>Chat on WhatsApp</b><small>WhatsApp</small></span></a>
            <a href={record.email ? `mailto:${record.email}` : undefined}><span className="contact-icon"><Icon name="send" /></span><span><b>{email}</b><small>Email</small></span></a>
            <div><span className="contact-icon"><Icon name="pin" /></span><span><b>{location}</b><small>View on Map</small></span></div>
            <div className="crm-socials"><span><Icon name="insta" /></span><span><Icon name="facebook" /></span><span><Icon name="linkedin" /></span><small>View Social Profiles</small></div>
          </div>

          <div className="crm-lead-detail-tabs">
            {[["overview", "Overview"], ["events", `Events (${eventCount})`], ["quotations", `Quotations (${quotations.length})`], ["invoices", `Invoices (${invoices.length})`], ["payments", `Payments (${payments.length})`], ["notes", `Notes (${noteCount})`], ["documents", "Documents (0)"], ["activity", "Activity Log"]].map(([key, label]) => <button type="button" key={key} className={tab === key ? "active" : ""} onClick={() => setTab(key)}>{label}</button>)}
          </div>

          <div className="crm-lead-detail-layout">
            <section className="crm-lead-detail-main">
              {tab === "overview" && <>
                <div className="crm-lead-summary-grid">
                  <div><span className="summary-icon blue"><Icon name="calendar" /></span><small>Total Events</small><strong>{eventCount}</strong><em>{eventCount ? "1 Upcoming" : "No events yet"}</em></div>
                  <div><span className="summary-icon green"><Icon name="rupee" /></span><small>Estimated Budget</small><strong>{budget}</strong><em>From CRM record</em></div>
                  <div><span className="summary-icon red"><Icon name="calendar" /></span><small>Last Event</small><strong>—</strong><em>No completed event</em></div>
                  <div><span className="summary-icon blue"><Icon name="calendar" /></span><small>Next Event</small><strong>{record.eventDate ? eventDate : "—"}</strong><em>{record.eventType || "No event"}</em></div>
                </div>
                <div className="crm-lead-two-col">
                  <section className="crm-lead-card"><div className="crm-lead-card-head"><h2>Client Information</h2></div><div className="crm-detail-rows">
                    <div><span>Full Name</span><b>{record.name}</b></div><div><span>Phone</span><b>{phone}</b></div><div><span>Email</span><b>{email}</b></div><div><span>Alternate Phone</span><b>{record.whatsapp || "—"}</b></div><div><span>Location</span><b>{location}</b></div><div><span>Address</span><b>{record.eventVenue || "—"}</b></div><div><span>Client Since</span><b>{fmtDate(record.createdAt)}</b></div><div><span>Source</span><b>{source}</b></div><div><span>Lead Owner</span><b>{record.assignedTo}</b></div>
                  </div></section>
                  <section className="crm-lead-card"><div className="crm-lead-card-head"><h2>Event Preferences</h2></div><div className="crm-detail-rows">
                    <div><span>Preferred Event Types</span><b className="pill-row"><i>{record.eventType || "Event"}</i></b></div><div><span>Average Guest Count</span><b>{record.guestCount || "—"}</b></div><div><span>Preferred Venues</span><b>{location}</b></div><div><span>Budget Range</span><b>{budget}</b></div><div><span>Style / Theme Preference</span><b>—</b></div><div><span>Special Requirements</span><b>{record.message || "—"}</b></div><div><span>Notes</span><b>{noteText}</b></div>
                  </div></section>
                </div>
                <div className="crm-lead-bottom-grid">
                  <section className="crm-lead-card"><div className="crm-lead-card-head"><h2>Recent Notes</h2><button type="button" onClick={() => { setTab("notes"); setNoteEdit(record.adminNotes || ""); }}><Icon name="plus" /> Add Note</button></div><div className="crm-note-list"><div className="crm-note-item"><span>{initials}</span><div><b>{record.assignedTo}</b><small>{fmtDateTime(record.createdAt)}</small><p>{noteText}</p></div></div></div></section>
                  <section className="crm-lead-card"><div className="crm-lead-card-head"><h2>Documents</h2><button type="button" onClick={createQuotation}><Icon name="upload" /> Upload</button></div><div className="crm-document-empty"><Icon name="send" /><span>No documents attached yet.</span></div></section>
                </div>
              </>}

              {tab === "events" && <section className="crm-lead-card crm-tab-panel"><h2>Events</h2><div className="crm-event-detail"><b>{record.eventType || "Event"}</b><span>{eventDate}</span><span>{location}</span><span>{record.guestCount || "—"} guests</span><span>{budget}</span></div></section>}
              {tab === "quotations" && <section className="crm-lead-card crm-tab-panel"><div className="crm-lead-card-head"><h2>Quotations</h2><button type="button" onClick={createQuotation}>Create Quotation</button></div>{quotations.length ? <div className="crm-detail-document-list">{quotations.map((doc) => <div key={doc.id}><b>{doc.number || "Quotation"}</b><span>{fmtDate(doc.issueDate || doc.createdAt)}</span><strong>₹ {(doc.total || 0).toLocaleString("en-IN")}</strong><em>{doc.status || "draft"}</em></div>)}</div> : <p>No quotations are attached to this client yet.</p>}</section>}
              {tab === "invoices" && <section className="crm-lead-card crm-tab-panel"><div className="crm-lead-card-head"><h2>Invoices</h2><span /></div>{invoices.length ? <div className="crm-detail-document-list">{invoices.map((doc) => <div key={doc.id}><b>{doc.number || "Invoice"}</b><span>{fmtDate(doc.issueDate || doc.createdAt)}</span><strong>₹ {(doc.total || 0).toLocaleString("en-IN")}</strong><em>{doc.status || "draft"}</em></div>)}</div> : <p>No invoices are attached to this client yet.</p>}</section>}
              {tab === "payments" && <section className="crm-lead-card crm-tab-panel"><div className="crm-lead-card-head"><h2>Payments</h2><span /></div>{payments.length ? <div className="crm-detail-document-list">{payments.map((doc) => <div key={doc.id}><b>{doc.number || "Payment"}</b><span>Paid invoice</span><strong>₹ {(doc.total || 0).toLocaleString("en-IN")}</strong><em>Paid</em></div>)}</div> : <p>No payments are recorded for this client yet.</p>}</section>}
              {tab === "notes" && <section className="crm-lead-card crm-tab-panel"><div className="crm-lead-card-head"><h2>Notes</h2><span /></div><textarea className="crm-detail-notes" value={noteEdit} onChange={(e) => setNoteEdit(e.target.value)} placeholder="Add internal notes…" /><button type="button" className="crm-detail-gold-btn" onClick={saveNote} disabled={savingNote}>{savingNote ? "Saving…" : "Save Note"}</button></section>}
              {tab === "documents" && <section className="crm-lead-card crm-tab-panel"><h2>Documents</h2><p>No documents attached yet.</p></section>}
              {tab === "activity" && <section className="crm-lead-card crm-tab-panel"><h2>Activity Log</h2><div className="crm-detail-activity"><div><b>Lead Created</b><span>{fmtDateTime(record.createdAt)}</span></div><div><b>Source Captured</b><span>{record.leadSource} → {source}</span></div><div><b>Status</b><span>{statusLabel}</span></div>{record.nextFollowUp && <div><b>Follow-up scheduled</b><span>{fmtDateTime(record.nextFollowUp)}</span></div>}</div></section>}
            </section>

            <aside className="crm-lead-detail-sidebar">
              <section className="crm-side-status-card">
                <h3>Current Status</h3>
                <select className="crm-detail-status" value={record.status} onChange={(e) => changeStatus(e.target.value)}>{STAGES.map((stage) => <option key={stage.key} value={stage.key}>{stage.label}</option>)}</select>
                <h3>Assigned To</h3><div className="crm-detail-assignee">{record.assignedTo || "Unassigned"}</div>
                <h3>Next Follow-up</h3><button type="button" className="crm-followup-display" onClick={() => setFeedback(record.nextFollowUp ? fmtDateTime(record.nextFollowUp) : "No follow-up is scheduled.")}><Icon name="calendar" /><span>{record.nextFollowUp ? fmtDateTime(record.nextFollowUp) : "Not scheduled"}</span></button>
              </section>
              <section className="crm-side-status-card"><h2>Quick Actions</h2><div className="crm-detail-quick-grid"><button type="button" onClick={() => window.open(`tel:${record.phone}`)}><Icon name="phone" /><span>Call</span></button><button type="button" onClick={() => window.open(`https://wa.me/${String(record.whatsapp || record.phone).replace(/\D/g, "")}`, "_blank", "noopener,noreferrer")}><Icon name="whatsapp" /><span>WhatsApp</span></button><button type="button" onClick={() => window.open(record.email ? `mailto:${record.email}` : "mailto:", "_blank")}><Icon name="send" /><span>Email</span></button><button type="button" onClick={createQuotation}><Icon name="send" /><span>Create Quotation</span></button><button type="button" onClick={() => setFeedback("Create Event is ready to be connected to the event workflow.")}><Icon name="calendar" /><span>Create Event</span></button><button type="button" onClick={() => { setTab("notes"); setNoteEdit(record.adminNotes || ""); }}><Icon name="plus" /><span>Add Note</span></button></div><div className="crm-detail-outcome"><button type="button" className="lost" onClick={() => changeStatus("lost")}><Icon name="close" /> Mark as Lost</button><button type="button" className="won" onClick={() => changeStatus("deal_closed")}><Icon name="check" /> Mark as Won</button></div><button type="button" className="crm-detail-delete" onClick={deleteLead}><Icon name="trash" /> Delete Lead</button></section>
              <section className="crm-side-status-card"><div className="crm-lead-card-head"><h2>Important Dates</h2></div><div className="crm-important-date"><Icon name="calendar" /><b>Event Date</b><span>{eventDate}</span></div><div className="crm-important-date"><Icon name="star" /><b>Created</b><span>{fmtDate(record.createdAt)}</span></div></section>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}
