import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { saveClient } from "../../lib/adminStore";
import { createAdminInquiry, deleteAdminInquiry, fetchAdminInquiries, updateAdminInquiry } from "../../lib/adminApi";
import Icon from "../../components/Icon";
import usePageMeta from "../../hooks/usePageMeta";

const STAGES = [
  { key: "new_lead", label: "New Lead" },
  { key: "discovery_call", label: "Discovery Call" },
  { key: "meeting_scheduled", label: "Meeting Scheduled" },
  { key: "quotation_sent", label: "Quotation Sent" },
  { key: "deal_closed", label: "Deal Closed" },
  { key: "lost", label: "Lost" },
  { key: "junk", label: "Junk" },
];
const PIPELINE_STAGES = STAGES.slice(0, 5);
const LEAD_SOURCES = [
  "Website", "Meta Ads", "Google Ads", "Organic Social", "Google Organic",
  "WhatsApp", "Referral", "Venue", "Vendor", "Direct", "Repeat Client", "Other",
];
const EVENT_TYPES = [
  "Wedding", "Birthday", "Corporate", "Festive Events", "Others", "Birthday Party",
  "Wedding Ceremony", "Reception", "Anniversary", "Baby Shower", "Naming Ceremony",
  "Corporate Event", "Custom Celebration", "Birthday / Kitty Party", "Haldi / Mehendi / Sangeet",
  "Private Party", "Other",
];
const BUDGETS = ["₹ 0 - 50K", "₹ 50K - 1 Lakh", "₹ 1 - 2 Lakh", "₹ 2 - 3 Lakh", "₹ 3 - 5 Lakh", "₹ 5 - 10 Lakh", "₹ 10 - 15 Lakh", "₹ 15 Lakh+"];
const SOURCE_ICONS = { Website: "home", "Meta Ads": "layers", "Google Ads": "layers", "Organic Social": "insta", "Google Organic": "search", WhatsApp: "whatsapp", Referral: "user", Venue: "home", Vendor: "package", Direct: "phone", "Repeat Client": "restart", Other: "layers" };
const EMPTY_LEAD = { name: "", phone: "", email: "", eventType: "", eventDate: "", eventLocation: "", guestCount: "", budget: "", leadSource: "", message: "" };
const STAGE_LABEL = Object.fromEntries(STAGES.map((s) => [s.key, s.label]));

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
function mapRecord(row) {
  return {
    ...row,
    id: row.id,
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
    quotationId: row.quotation_id || "",
    invoiceId: row.invoice_id || "",
    paymentStatus: row.payment_status || "pending",
    source: row.source || "inquiry",
    leadSource: row.lead_source || "Website",
    sourceType: row.source_type || "AUTO",
    createdAt: row.created_at || "",
    assignedTo: row.assigned_to_name || row.assigned_to || "Unassigned",
    campaign: row.campaign || "",
    adSet: row.ad_set || "",
    ad: row.ad || "",
    quotedAmount: row.quoted_amount || "",
    finalDealValue: row.final_deal_value || "",
    booking: row.booking || null,
  };
}

export default function AdminInquiries() {
  usePageMeta("CRM — Leads", "Manage leads, follow-ups, quotations and source attribution.", { noindex: true });
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [tab, setTab] = useState("all");
  const [stage, setStage] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [eventFilter, setEventFilter] = useState("all");
  const [assignedFilter, setAssignedFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [drawerTab, setDrawerTab] = useState("overview");
  const [noteEdit, setNoteEdit] = useState("");
  const [sourceEdit, setSourceEdit] = useState("");
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddLead, setShowAddLead] = useState(false);
  const [leadForm, setLeadForm] = useState(EMPTY_LEAD);
  const [savingLead, setSavingLead] = useState(false);
  const [page, setPage] = useState(1);
  const [moreFilters, setMoreFilters] = useState(false);

  async function refresh() {
    try {
      setError("");
      const result = await fetchAdminInquiries();
      const next = (result.inquiries || []).map(mapRecord);
      setRecords(next);
      if (selected) {
        const fresh = next.find((item) => item.id === selected.id);
        if (fresh) {
          setSelected(fresh);
          setSourceEdit(fresh.leadSource);
          setNoteEdit(fresh.adminNotes || "");
        } else setSelected(null);
      }
    } catch (err) {
      setError(err.message || "Unable to load CRM records.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 15000);
    return () => clearInterval(timer);
  }, []);

  const leads = useMemo(() => records.filter((r) => r.source !== "booking"), [records]);
  const bookings = useMemo(() => records.filter((r) => r.source === "booking"), [records]);
  const teamMembers = useMemo(() => Array.from(new Set(leads.map((r) => r.assignedTo).filter(Boolean))), [leads]);
  const sourceCounts = useMemo(() => LEAD_SOURCES.map((source) => ({ source, count: leads.filter((r) => r.leadSource === source).length })), [leads]);
  const filtered = useMemo(() => {
    const base = tab === "bookings" ? bookings : leads;
    const q = query.trim().toLowerCase();
    return base.filter((r) => {
      if (tab !== "bookings" && tab !== "all" && r.status !== tab) return false;
      if (stage !== "all" && r.status !== stage) return false;
      if (sourceFilter !== "all" && r.leadSource !== sourceFilter) return false;
      if (eventFilter !== "all" && r.eventType !== eventFilter) return false;
      if (assignedFilter !== "all" && r.assignedTo !== assignedFilter) return false;
      if (q && ![r.name, r.phone, r.email, r.eventType, r.eventLocation, r.id, r.leadSource].some((v) => String(v || "").toLowerCase().includes(q))) return false;
      return true;
    });
  }, [tab, leads, bookings, stage, sourceFilter, eventFilter, assignedFilter, query]);

  const pageSize = 10;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);
  useEffect(() => { setPage(1); }, [tab, stage, sourceFilter, eventFilter, assignedFilter, query]);

  const stats = [
    ["Total Inquiries", leads.length, "+12%", "total"],
    ["Active Leads", leads.filter((r) => !["deal_closed", "lost", "junk"].includes(r.status)).length, "+8%", "active"],
    ["Quotations Sent", leads.filter((r) => r.status === "quotation_sent").length, "+15%", "quote"],
    ["Bookings (Won)", leads.filter((r) => r.status === "deal_closed").length, "+20%", "won"],
    ["Lost", leads.filter((r) => r.status === "lost").length, "", "lost"],
    ["Junk", leads.filter((r) => r.status === "junk").length, "", "junk"],
  ];

  function selectRecord(record) {
    setSelected(record);
    setNoteEdit(record.adminNotes || "");
    setSourceEdit(record.leadSource || "Website");
    setDrawerTab("overview");
  }
  function updateLeadField(field, value) { setLeadForm((prev) => ({ ...prev, [field]: value })); }
  function resetFilters() { setStage("all"); setSourceFilter("all"); setEventFilter("all"); setAssignedFilter("all"); setQuery(""); setPage(1); }

  async function handleStageChange(id, status) {
    try {
      await updateAdminInquiry(id, { status });
      await refresh();
      setFeedback(`Lead moved to ${STAGE_LABEL[status] || status}.`);
      setTimeout(() => setFeedback(""), 2500);
    } catch (err) { setError(err.message || "Unable to update lead stage."); }
  }
  async function handleSaveNote(id) {
    try {
      await updateAdminInquiry(id, { adminNotes: noteEdit });
      await refresh();
      setFeedback("Saved admin notes.");
      setTimeout(() => setFeedback(""), 2500);
    } catch (err) { setError(err.message || "Unable to save notes."); }
  }
  async function handleSaveSource(id) {
    try {
      await updateAdminInquiry(id, { leadSource: sourceEdit });
      await refresh();
      setFeedback("Lead source updated and marked MANUAL.");
      setTimeout(() => setFeedback(""), 2500);
    } catch (err) { setError(err.message || "Unable to update lead source."); }
  }
  async function handleDelete(id, name) {
    if (!window.confirm(`Delete this record from "${name}"?`)) return;
    try {
      await deleteAdminInquiry(id);
      setSelected(null);
      await refresh();
      setFeedback("Record deleted.");
      setTimeout(() => setFeedback(""), 2500);
    } catch (err) { setError(err.message || "Unable to delete record."); }
  }
  function getOrCreateClient(r) {
    return saveClient({ name: r.name, phone: r.phone, email: r.email || "", city: r.eventLocation || "Ranchi", address: r.eventVenue || "", notes: `Lead for ${r.eventType}. Event date: ${r.eventDate || "TBD"}. Guest count: ${r.guestCount || "TBD"}. Requirements: ${r.message || "—"}` });
  }
  function createQuotation(r) {
    const client = getOrCreateClient(r);
    navigate("/admin/invoices/new", { state: { clientId: client.id, leadId: r.id, documentType: "quotation", lead: r } });
  }
  function createInvoice(r) {
    const client = getOrCreateClient(r);
    navigate("/admin/invoices/new", { state: { clientId: client.id, leadId: r.id, documentType: "invoice", lead: r } });
  }
  async function handleAddLead(e) {
    e.preventDefault();
    setSavingLead(true); setError("");
    try {
      const result = await createAdminInquiry(leadForm);
      await refresh();
      setShowAddLead(false);
      setLeadForm(EMPTY_LEAD);
      setFeedback(result.duplicate ? "Existing lead found. No duplicate lead was created." : "Lead created with MANUAL source attribution.");
      setTimeout(() => setFeedback(""), 3000);
    } catch (err) { setError(err.message || "Unable to create lead."); }
    finally { setSavingLead(false); }
  }

  return (
    <div className="crm-page">
      <header className="crm-topbar">
        <button className="crm-menu-button" type="button" aria-label="Open menu"><Icon name="menu" /></button>
        <div className="crm-global-search"><Icon name="search" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name, phone, event, or lead ID..." /><span className="crm-search-shortcut">⌘ K</span></div>
        <button className="crm-add-button" type="button" onClick={() => setShowAddLead(true)}><Icon name="plus" /> Add Lead</button>
        <button className="crm-notification" type="button" aria-label="Notifications"><span>3</span>♧</button>
        <div className="crm-user"><span className="crm-user-avatar">NL</span><span className="crm-user-name">Next Level Events</span><span className="crm-user-chevron">⌄</span></div>
      </header>

      <div className="crm-heading-row">
        <div><h1>CRM – Leads</h1><p>Manage your leads, follow-ups, quotations and bookings — all in one place.</p></div>
      </div>

      {feedback && <div className="admin-alert admin-alert--success">{feedback}</div>}
      {error && <div className="admin-alert admin-alert--error">{error}</div>}

      <div className="crm-stat-grid">
        {stats.map(([label, value, delta, tone]) => (
          <button key={label} type="button" className={`crm-stat-card crm-stat-card--${tone}`} onClick={() => { if (tone === "lost" || tone === "junk") setTab(tone); else setTab("all"); }}>
            <span className="crm-stat-icon"><Icon name={tone === "won" ? "check" : tone === "lost" ? "close" : tone === "junk" ? "trash" : tone === "quote" ? "send" : tone === "active" ? "phone" : "user"} /></span>
            <span className="crm-stat-label">{label}</span>
            <strong>{value}</strong>
            {delta ? <small>↑ {delta.replace("+", "")} </small> : <small>&nbsp;</small>}
          </button>
        ))}
      </div>

      <div className="crm-filter-row">
        <button className="crm-filter-control crm-date-filter" type="button"><Icon name="calendar" /> 18 Sep 2026 – 25 Sep 2026 <span>⌄</span></button>
        <label className="crm-filter-control"><span>Event Type</span><select value={eventFilter} onChange={(e) => setEventFilter(e.target.value)}><option value="all">All Events</option>{EVENT_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}</select></label>
        <label className="crm-filter-control"><span>Lead Source</span><select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}><option value="all">All Sources</option>{LEAD_SOURCES.map((source) => <option key={source} value={source}>{source}</option>)}</select></label>
        <label className="crm-filter-control"><span>Status</span><select value={stage} onChange={(e) => setStage(e.target.value)}><option value="all">All Status</option>{STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}</select></label>
        <label className="crm-filter-control"><span>Assigned To</span><select value={assignedFilter} onChange={(e) => setAssignedFilter(e.target.value)}><option value="all">All Team Members</option>{teamMembers.map((member) => <option key={member} value={member}>{member}</option>)}</select></label>
        <button className={`crm-more-filter ${moreFilters ? "active" : ""}`} type="button" onClick={() => setMoreFilters((v) => !v)}><Icon name="filter" /> More Filters</button>
        <button className="crm-reset" type="button" onClick={resetFilters}>Reset</button>
      </div>
      {moreFilters && <div className="crm-more-filters"><span>Event Date</span><span>Location</span><span>Next Follow-up</span><span>Created Date</span><span>Budget Range</span></div>}

      <div className="crm-source-strip">
        {sourceCounts.map(({ source, count }) => (
          <button key={source} type="button" className={`crm-source-pill ${sourceFilter === source ? "active" : ""}`} onClick={() => setSourceFilter(sourceFilter === source ? "all" : source)}>
            <span className="crm-source-dot"><Icon name={SOURCE_ICONS[source] || "layers"} /></span><span>{source}</span><strong>({count})</strong>
          </button>
        ))}
      </div>

      <div className="crm-stage-tabs">
        {[["all", "All Leads", leads.length], ...PIPELINE_STAGES.map((s) => [s.key, s.label, leads.filter((r) => r.status === s.key).length]), ["lost", "Lost", stats[4][1]], ["junk", "Junk", stats[5][1]]].map(([key, label, count]) => (
          <button key={key} type="button" className={tab === key ? "active" : ""} onClick={() => { setTab(key); setStage(key === "all" ? "all" : key); }}>{label} <span>({count})</span></button>
        ))}
      </div>

      <section className="crm-table-card">
        <div className="crm-table-head"><span>Showing {filtered.length ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, filtered.length)} of {filtered.length} leads</span><select value={pageSize} disabled><option>10 per page</option></select></div>
        {loading ? <div className="crm-empty">Loading leads…</div> : pageRows.length === 0 ? <div className="crm-empty">No leads match the current filters.</div> : (
          <div className="crm-table-wrap"><table className="crm-table"><thead><tr><th><input type="checkbox" aria-label="Select all" /></th><th>Customer</th><th>Event</th><th>Event Date</th><th>Location</th><th>Budget</th><th>Source</th><th>Status</th><th>Next Follow-up</th><th>Assigned To</th><th>Actions</th></tr></thead><tbody>
            {pageRows.map((r) => (
              <tr key={r.id} className={selected?.id === r.id ? "selected" : ""} onClick={() => selectRecord(r)}>
                <td onClick={(e) => e.stopPropagation()}><input type="checkbox" aria-label={`Select ${r.name}`} /></td>
                <td><strong>{r.name}</strong><small>{r.phone}</small></td>
                <td><span className="crm-event-badge">{r.eventType}</span></td>
                <td>{fmtDate(r.eventDate)}</td>
                <td>{r.eventLocation || "—"}</td>
                <td>{r.budget || "—"}</td>
                <td><div className="crm-source-cell"><span className="crm-source-mini"><Icon name={SOURCE_ICONS[r.leadSource] || "layers"} /></span>{r.leadSource}</div><small className="crm-source-type">{r.sourceType}</small></td>
                <td onClick={(e) => e.stopPropagation()}><select className={`crm-status-select status-${r.status}`} value={r.status} onChange={(e) => handleStageChange(r.id, e.target.value)}>{STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}</select></td>
                <td>{r.next_follow_up ? fmtDateTime(r.next_follow_up) : <span className="crm-muted">—</span>}</td>
                <td><span className="crm-assignee">{r.assignedTo}</span></td>
                <td onClick={(e) => e.stopPropagation()}><div className="crm-actions"><a href={`tel:${r.phone}`} title="Call" onClick={(e) => e.stopPropagation()}><Icon name="phone" /></a><a href={`https://wa.me/${String(r.whatsapp || r.phone).replace(/\D/g, "")}`} target="_blank" rel="noreferrer" title="WhatsApp" onClick={(e) => e.stopPropagation()}><Icon name="whatsapp" /></a><button type="button" title="More" onClick={() => selectRecord(r)}>⋮</button></div></td>
              </tr>
            ))}
          </tbody></table></div>
        )}
        <div className="crm-pagination"><button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>‹</button>{Array.from({ length: Math.min(pageCount, 5) }, (_, i) => i + 1).map((n) => <button key={n} type="button" className={page === n ? "active" : ""} onClick={() => setPage(n)}>{n}</button>)}{pageCount > 5 && <><span>…</span><button type="button" onClick={() => setPage(pageCount)}>{pageCount}</button></>}<button type="button" disabled={page >= pageCount} onClick={() => setPage((p) => p + 1)}>›</button></div>
      </section>

      {selected && (
        <aside className="crm-detail-drawer">
          <div className="crm-drawer-head"><div><h2>{selected.name}</h2><span className={`crm-drawer-status status-${selected.status}`}>{STAGE_LABEL[selected.status] || selected.status}</span></div><button type="button" onClick={() => setSelected(null)}><Icon name="close" /></button></div>
          <div className="crm-drawer-contact"><a href={`tel:${selected.phone}`}><Icon name="phone" /> {selected.phone || "—"}</a><a href={`https://wa.me/${String(selected.whatsapp || selected.phone).replace(/\D/g, "")}`} target="_blank" rel="noreferrer"><Icon name="whatsapp" /></a><a href={`mailto:${selected.email}`}><Icon name="send" /></a><button type="button">⋮</button></div>
          <div className="crm-drawer-tabs"><button className={drawerTab === "overview" ? "active" : ""} onClick={() => setDrawerTab("overview")}>Overview</button><button className={drawerTab === "notes" ? "active" : ""} onClick={() => setDrawerTab("notes")}>Notes {selected.adminNotes ? "(1)" : ""}</button><button className={drawerTab === "activity" ? "active" : ""} onClick={() => setDrawerTab("activity")}>Activity</button><button className={drawerTab === "quotations" ? "active" : ""} onClick={() => setDrawerTab("quotations")}>Quotations</button></div>
          <div className="crm-drawer-body">
            {drawerTab === "overview" && <>
              <section className="crm-info-section"><div className="crm-section-title">Customer Information <button type="button">Edit</button></div><div className="crm-info-grid"><div><small>Name</small><strong>{selected.name}</strong></div><div><small>Phone</small><strong>{selected.phone || "—"}</strong></div><div><small>Email</small><strong>{selected.email || "—"}</strong></div><div><small>City</small><strong>{selected.city || "—"}</strong></div></div></section>
              <section className="crm-info-section"><div className="crm-section-title">Event Information <button type="button">Edit</button></div><div className="crm-info-grid"><div><small>Event Type</small><strong>{selected.eventType}</strong></div><div><small>Event Date</small><strong>{fmtDate(selected.eventDate)}</strong></div><div><small>Location</small><strong>{selected.eventLocation || "—"}</strong></div><div><small>Guest Count</small><strong>{selected.guestCount || "—"}</strong></div><div><small>Budget Range</small><strong>{selected.budget || "—"}</strong></div><div className="crm-full"><small>Special Requirements</small><strong>{selected.message || "—"}</strong></div></div></section>
              <section className="crm-info-section"><div className="crm-section-title">Sales Information <button type="button">Edit</button></div><div className="crm-info-grid"><div><small>Lead Source</small><strong>{selected.leadSource} <em>{selected.sourceType}</em></strong></div><div><small>Campaign</small><strong>{selected.campaign || "—"}</strong></div><div><small>Ad Set</small><strong>{selected.adSet || "—"}</strong></div><div><small>Ad</small><strong>{selected.ad || "—"}</strong></div><div><small>Lead Created</small><strong>{fmtDateTime(selected.createdAt)}</strong></div><div><small>Assigned To</small><strong>{selected.assignedTo}</strong></div><div><small>Next Follow-up</small><strong>{selected.next_follow_up ? fmtDateTime(selected.next_follow_up) : "—"}</strong></div><div><small>Status</small><strong>{STAGE_LABEL[selected.status] || selected.status}</strong></div></div></section>
              <section className="crm-source-edit"><div><small>Lead Source</small><strong>{selected.leadSource} <em>{selected.sourceType}</em></strong></div><div className="crm-source-edit-row"><select value={sourceEdit} onChange={(e) => setSourceEdit(e.target.value)}>{LEAD_SOURCES.map((source) => <option key={source}>{source}</option>)}</select><button type="button" disabled={sourceEdit === selected.leadSource} onClick={() => handleSaveSource(selected.id)}>Save</button></div></section>
            </>}
            {drawerTab === "notes" && <section className="crm-info-section"><div className="crm-section-title">Notes</div><textarea value={noteEdit} onChange={(e) => setNoteEdit(e.target.value)} placeholder="Add internal notes…" /><button className="crm-gold-button" type="button" onClick={() => handleSaveNote(selected.id)}>Save Notes</button></section>}
            {drawerTab === "activity" && <section className="crm-info-section"><div className="crm-section-title">Activity Timeline</div><div className="crm-timeline"><div><b>Lead Created</b><small>{fmtDateTime(selected.createdAt)}</small></div><div><b>Source Captured</b><small>{selected.leadSource} · {selected.sourceType}</small></div><div><b>Current Status</b><small>{STAGE_LABEL[selected.status] || selected.status}</small></div></div></section>}
            {drawerTab === "quotations" && <section className="crm-info-section"><div className="crm-section-title">Quotations</div><p className="crm-muted">{selected.quotationId ? `Quotation ${selected.quotationId}` : "No quotation created yet."}</p><button className="crm-gold-button" type="button" onClick={() => createQuotation(selected)}>Create Quotation</button></section>}
          </div>
          <div className="crm-quick-actions"><button type="button" onClick={() => createQuotation(selected)}>▣ Create Quotation</button><button type="button">▣ Schedule Follow-up</button><button type="button">✓ Convert to Booking</button><button type="button" onClick={() => handleStageChange(selected.id, "lost")}>× Mark as Lost</button><button type="button" onClick={() => handleStageChange(selected.id, "junk")}>▢ Mark as Junk</button><button type="button">➤ Send Message</button></div>
        </aside>
      )}

      {showAddLead && (
        <div className="crm-modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setShowAddLead(false); }}>
          <form className="crm-add-lead-modal" onSubmit={handleAddLead}>
            <div className="crm-modal-heading"><div><h2>Add New Lead</h2><p>Capture enquiries from any source and convert them into beautiful events.</p></div><button type="button" onClick={() => setShowAddLead(false)}><Icon name="close" /></button></div>
            <div className="crm-entry-tabs"><span className="active">Manual Entry</span><span>From Website / Integrations</span></div>
            <div className="crm-form-grid">
              <label>Full Name *<div><Icon name="user" /><input value={leadForm.name} onChange={(e) => updateLeadField("name", e.target.value)} placeholder="Enter full name" required /></div></label>
              <label>Phone Number *<div><span className="crm-country">🇮🇳 +91</span><input value={leadForm.phone} onChange={(e) => updateLeadField("phone", e.target.value)} placeholder="Enter phone number" required /><Icon name="whatsapp" /></div></label>
              <label>Email (Optional)<div><Icon name="send" /><input type="email" value={leadForm.email} onChange={(e) => updateLeadField("email", e.target.value)} placeholder="Enter email address" /></div></label>
              <label>Event Type *<div><Icon name="calendar" /><select value={leadForm.eventType} onChange={(e) => updateLeadField("eventType", e.target.value)} required><option value="">Select event type</option>{EVENT_TYPES.map((type) => <option key={type}>{type}</option>)}</select></div></label>
              <label>Event Date<div><Icon name="calendar" /><input type="date" value={leadForm.eventDate} onChange={(e) => updateLeadField("eventDate", e.target.value)} /></div></label>
              <label>Location *<div><Icon name="pin" /><input value={leadForm.eventLocation} onChange={(e) => updateLeadField("eventLocation", e.target.value)} placeholder="Enter location (e.g. Ranchi)" required /></div></label>
              <label>Expected Guest Count (Optional)<div><Icon name="user" /><input value={leadForm.guestCount} onChange={(e) => updateLeadField("guestCount", e.target.value)} placeholder="Enter guest count" /></div></label>
              <label>Budget Range (Optional)<div><span className="crm-rupee">₹</span><select value={leadForm.budget} onChange={(e) => updateLeadField("budget", e.target.value)}><option value="">Select budget range</option>{BUDGETS.map((budget) => <option key={budget}>{budget}</option>)}</select></div></label>
              <label>Lead Source *<div><Icon name="send" /><select value={leadForm.leadSource} onChange={(e) => updateLeadField("leadSource", e.target.value)} required><option value="">Select source</option>{LEAD_SOURCES.map((source) => <option key={source}>{source}</option>)}</select></div></label>
              <label>Assign To<div><Icon name="user" /><select><option>Auto assign</option>{teamMembers.map((member) => <option key={member}>{member}</option>)}</select></div></label>
              <label className="crm-notes-field">Notes (Optional)<textarea value={leadForm.message} onChange={(e) => updateLeadField("message", e.target.value)} placeholder="Add any notes about the lead…" /></label>
            </div>
            <div className="crm-modal-actions"><button type="button" className="crm-cancel" onClick={() => setShowAddLead(false)}>Cancel</button><button type="submit" className="crm-gold-button" disabled={savingLead}>{savingLead ? "Adding…" : "Add Lead"}</button></div>
          </form>
        </div>
      )}
    </div>
  );
}
