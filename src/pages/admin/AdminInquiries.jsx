import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getInvoices, saveClient } from "../../lib/adminStore";
import { createAdminInquiry, deleteAdminInquiry, fetchAdminInquiries, updateAdminInquiry } from "../../lib/adminApi";
import Icon from "../../components/Icon";
import usePageMeta from "../../hooks/usePageMeta";

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
const EVENT_TYPES = ["Wedding", "Birthday", "Corporate", "Festive Events", "Others", "Birthday Party", "Wedding Ceremony", "Reception", "Anniversary", "Baby Shower", "Naming Ceremony", "Corporate Event", "Custom Celebration", "Birthday / Kitty Party", "Haldi / Mehendi / Sangeet", "Private Party", "Other"];
const BUDGETS = ["₹ 0 - 50K", "₹ 50K - 1 Lakh", "₹ 1 - 2 Lakh", "₹ 2 - 3 Lakh", "₹ 3 - 5 Lakh", "₹ 5 - 10 Lakh", "₹ 10 - 15 Lakh", "₹ 15 Lakh+"];
const DEFAULT_SOURCE_DETAILS = ["Landing Page", "Inquiry Form", "Product Page", "CRM", "Website", "Other"];
const SOURCE_ICONS = { Instagram: "insta", "Google Ads": "search", "Google Search": "search", Referral: "user", Website: "home", WhatsApp: "whatsapp", "Landing Page": "home", "Inquiry Form": "send", LinkedIn: "linkedin", CRM: "user", "Product Page": "package" };
const SOURCE_ALIASES = { landing: "Landing Page", contact: "Inquiry Form", inquiry: "Inquiry Form", manual: "CRM", website: "Website", booking: "Booking" };
const STAGE_LABEL = Object.fromEntries(STAGES.map((s) => [s.key, s.label]));
const EMPTY_LEAD = { name: "", phone: "", whatsapp: "", email: "", eventType: "", eventDate: "", eventLocation: "", guestCount: "", budget: "", leadSource: "Instagram", source: "Instagram", message: "", assignedTo: "", nextFollowUp: "" };
const LEAD_SOURCE_OPTIONS = ["Instagram", "Facebook", "Google Ads", "Google Search", "LinkedIn", "WhatsApp", "Referral", "Website", "Landing Page", "Inquiry Form", "Product Page", "CRM", "Other"];
const LEAD_TAG_OPTIONS = ["Premium", "Immediate", "Repeat Client", "Referral", "Destination", "Corporate", "High Potential"];

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
    quotationId: row.quotation_id || "",
    invoiceId: row.invoice_id || "",
    source: row.source || "inquiry",
    sourceDetail: sourceDetail(row.source),
    leadSource: row.lead_source || "Website",
    sourceType: row.source_type || "AUTO",
    createdAt: row.created_at || "",
    assignedTo: row.assigned_to_name || row.assigned_to || "Unassigned",
    nextFollowUp: row.next_follow_up || "",
    campaign: row.campaign || "",
    adSet: row.ad_set || "",
    ad: row.ad || "",
  };
}

export default function AdminInquiries() {
  usePageMeta("CRM — Leads", "Manage inquiries, follow-ups and event leads.", { noindex: true });
  const navigate = useNavigate();
  const importRef = useRef(null);
  const [records, setRecords] = useState([]);
  const [tab, setTab] = useState("all");
  const [eventFilter, setEventFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [stage, setStage] = useState("all");
  const [assignedFilter, setAssignedFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selected, setSelected] = useState(null);
  const [showClientDetails, setShowClientDetails] = useState(false);
  const [drawerTab, setDrawerTab] = useState("details");
  const [leadSourceCustom, setLeadSourceCustom] = useState(false);
  const [customLeadSource, setCustomLeadSource] = useState("");
  const [sourceEdit, setSourceEdit] = useState("");
  const [noteEdit, setNoteEdit] = useState("");
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [showAddLead, setShowAddLead] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [leadForm, setLeadForm] = useState(EMPTY_LEAD);
  const [savingLead, setSavingLead] = useState(false);
  const [leadClientType, setLeadClientType] = useState("Individual");
  const [leadTags, setLeadTags] = useState([]);
  const [leadQuickActions, setLeadQuickActions] = useState({ followUp: true, whatsapp: true, emailMarketing: false });
  const [leadFollowUpDate, setLeadFollowUpDate] = useState("");
  const [leadFollowUpTime, setLeadFollowUpTime] = useState("");
  const [leadStatus, setLeadStatus] = useState("new_lead");
  const [moreMenu, setMoreMenu] = useState(false);
  const [moreFilters, setMoreFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedRows, setSelectedRows] = useState([]);
  const pageSize = 10;

  async function refresh({ preserveSelection = true } = {}) {
    try {
      setError("");
      const result = await fetchAdminInquiries();
      const next = (result.inquiries || []).map(mapRecord).filter((r) => r.source !== "booking");
      setRecords(next);
      setSelectedRows((prev) => prev.filter((id) => next.some((row) => row.id === id)));

      // Keep an explicitly selected lead open after refresh.
      // Never automatically open the first lead when entering the CRM.
      if (preserveSelection && selected) {
        const fresh = next.find((item) => item.id === selected.id);
        if (fresh) {
          setSelected(fresh);
          setSourceEdit(fresh.sourceDetail);
          setNoteEdit(fresh.adminNotes || "");
        } else {
          setSelected(null);
          setSourceEdit("");
          setNoteEdit("");
        }
      }
    } catch (err) {
      setError(err.message || "Unable to load CRM records.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh({ preserveSelection: false });
    const timer = setInterval(() => refresh(), 15000);
    return () => clearInterval(timer);
  }, []);

  const sourceDetails = useMemo(() => Array.from(new Set([...(records.map((r) => r.sourceDetail).filter(Boolean)), ...DEFAULT_SOURCE_DETAILS])), [records]);
  const teamMembers = useMemo(() => Array.from(new Set(records.map((r) => r.assignedTo).filter((x) => x && x !== "Unassigned"))), [records]);

  const counts = useMemo(() => ({
    all: records.length,
    new_lead: records.filter((r) => r.status === "new_lead").length,
    contacted: records.filter((r) => r.status === "contacted").length,
    discovery_call: records.filter((r) => r.status === "discovery_call").length,
    meeting_scheduled: records.filter((r) => r.status === "meeting_scheduled").length,
    quotation_sent: records.filter((r) => r.status === "quotation_sent").length,
    negotiation: records.filter((r) => r.status === "negotiation").length,
    deal_closed: records.filter((r) => r.status === "deal_closed").length,
    lost: records.filter((r) => r.status === "lost").length,
    junk: records.filter((r) => r.status === "junk").length,
    active: records.filter((r) => !["deal_closed", "lost", "junk"].includes(r.status)).length,
  }), [records]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return records.filter((r) => {
      if (tab !== "all" && r.status !== tab) return false;
      if (stage !== "all" && r.status !== stage) return false;
      if (eventFilter !== "all" && r.eventType !== eventFilter) return false;
      if (sourceFilter !== "all" && r.sourceDetail !== sourceFilter) return false;
      if (assignedFilter !== "all" && r.assignedTo !== assignedFilter) return false;
      const created = String(r.createdAt || "").slice(0, 10);
      if (dateFrom && created < dateFrom) return false;
      if (dateTo && created > dateTo) return false;
      if (q && ![r.name, r.phone, r.email, r.eventType, r.eventLocation, r.displayId, r.id, r.sourceDetail, r.leadSource].some((v) => String(v || "").toLowerCase().includes(q))) return false;
      return true;
    });
  }, [records, tab, stage, eventFilter, sourceFilter, assignedFilter, query, dateFrom, dateTo]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);
  useEffect(() => setPage(1), [tab, stage, eventFilter, sourceFilter, assignedFilter, query, dateFrom, dateTo]);

  function selectRecord(record) {
    setSelected(record);
    setShowClientDetails(false);
    setSourceEdit(record.sourceDetail || "Inquiry Form");
    setNoteEdit(record.adminNotes || "");
    setDrawerTab("details");
  }
  function updateLeadField(field, value) { setLeadForm((prev) => ({ ...prev, [field]: value })); }
  function openAddLead() {
    setEditingLead(null);
    setLeadSourceCustom(false);
    setCustomLeadSource("");
    setLeadForm(EMPTY_LEAD);
    setLeadClientType("Individual");
    setLeadTags([]);
    setLeadQuickActions({ followUp: true, whatsapp: true, emailMarketing: false });
    setLeadFollowUpDate("");
    setLeadFollowUpTime("");
    setLeadStatus("new_lead");
    setShowAddLead(true);
  }
  function toggleLeadTag(tag) {
    setLeadTags((prev) => prev.includes(tag) ? prev.filter((item) => item !== tag) : [...prev, tag]);
  }
  function handleLeadSourceChange(value) {
    const websiteDetails = ["Landing Page", "Inquiry Form", "Product Page", "CRM", "Website"];
    if (value === "__custom__") {
      setLeadSourceCustom(true);
      setCustomLeadSource("");
      setLeadForm((prev) => ({ ...prev, leadSource: "Website", source: "" }));
    } else if (websiteDetails.includes(value)) {
      setLeadSourceCustom(false);
      setCustomLeadSource("");
      setLeadForm((prev) => ({ ...prev, leadSource: "Website", source: value }));
    } else {
      setLeadSourceCustom(false);
      setCustomLeadSource("");
      setLeadForm((prev) => ({ ...prev, leadSource: value, source: value }));
    }
  }
  function resetFilters() { setTab("all"); setStage("all"); setEventFilter("all"); setSourceFilter("all"); setAssignedFilter("all"); setQuery(""); setDateFrom(""); setDateTo(""); setPage(1); }
  function chooseDateRange() {
    const from = window.prompt("Start date (YYYY-MM-DD):", dateFrom || "");
    if (from === null) return;
    const to = window.prompt("End date (YYYY-MM-DD):", dateTo || "");
    if (to === null) return;
    if ((from && !/^\d{4}-\d{2}-\d{2}$/.test(from)) || (to && !/^\d{4}-\d{2}-\d{2}$/.test(to))) { setError("Use the date format YYYY-MM-DD."); return; }
    if (from && to && from > to) { setError("Start date cannot be after end date."); return; }
    setDateFrom(from); setDateTo(to); setError("");
  }
  function showFeedback(message) { setFeedback(message); window.setTimeout(() => setFeedback(""), 2500); }

  async function handleStageChange(id, status) {
    try { await updateAdminInquiry(id, { status }); await refresh(); showFeedback(`Lead moved to ${STAGE_LABEL[status]}.`); }
    catch (err) { setError(err.message || "Unable to update lead status."); }
  }
  async function handleSaveSource(id) {
    try { await updateAdminInquiry(id, { source: sourceEdit }); await refresh(); showFeedback("Source updated."); }
    catch (err) { setError(err.message || "Unable to update source."); }
  }
  async function handleSaveNote(id) {
    try { await updateAdminInquiry(id, { adminNotes: noteEdit }); await refresh(); showFeedback("Notes saved."); }
    catch (err) { setError(err.message || "Unable to save notes."); }
  }
  async function handleDelete(id, name) {
    if (!window.confirm(`Delete ${name}? This cannot be undone.`)) return;
    try { await deleteAdminInquiry(id); setSelected(null); await refresh({ preserveSelection: false }); showFeedback("Lead deleted."); }
    catch (err) { setError(err.message || "Unable to delete lead."); }
  }
  function togglePageSelection(checked) {
    setSelectedRows((prev) => checked
      ? Array.from(new Set([...prev, ...pageRows.map((row) => row.id)]))
      : prev.filter((id) => !pageRows.some((row) => row.id === id))
    );
  }
  function selectAllFiltered() { setSelectedRows((prev) => Array.from(new Set([...prev, ...filtered.map((row) => row.id)]))); }
  function clearSelection() { setSelectedRows([]); }
  function selectedRecords() {
    const ids = new Set(selectedRows);
    return records.filter((row) => ids.has(row.id));
  }
  async function handleBulkDelete() {
    const rows = selectedRecords();
    if (!rows.length) return;
    if (!window.confirm(`Delete ${rows.length} selected lead${rows.length === 1 ? "" : "s"}? This cannot be undone.`)) return;
    try {
      await Promise.all(rows.map((row) => deleteAdminInquiry(row.id)));
      if (selected && rows.some((row) => row.id === selected.id)) setSelected(null);
      clearSelection();
      await refresh({ preserveSelection: false });
      showFeedback(`${rows.length} lead${rows.length === 1 ? "" : "s"} deleted.`);
    } catch (err) {
      setError(err.message || "Unable to delete selected leads.");
      await refresh({ preserveSelection: false });
    }
  }
  async function handleBulkStatus(status) {
    if (!status || !selectedRows.length) return;
    try {
      await Promise.all(selectedRows.map((id) => updateAdminInquiry(id, { status })));
      await refresh();
      showFeedback(`${selectedRows.length} lead${selectedRows.length === 1 ? "" : "s"} updated to ${STAGE_LABEL[status]}.`);
    } catch (err) { setError(err.message || "Unable to update selected leads."); }
  }
  async function handleBulkAssign(assignedTo) {
    if (!assignedTo || !selectedRows.length) return;
    try {
      await Promise.all(selectedRows.map((id) => updateAdminInquiry(id, { assignedTo })));
      await refresh();
      showFeedback(`${selectedRows.length} lead${selectedRows.length === 1 ? "" : "s"} assigned to ${assignedTo}.`);
    } catch (err) { setError(err.message || "Unable to assign selected leads."); }
  }
  function exportSelectedCsv() {
    const rows = selectedRecords();
    if (!rows.length) return;
    const headers = ["Name", "Phone", "Email", "Event Type", "Event Date", "Location", "Budget", "Source", "Status", "Assigned To", "Next Follow-up"];
    const csvRows = rows.map((r) => [r.name, r.phone, r.email, r.eventType, r.eventDate, r.eventLocation, r.budget, r.sourceDetail, STAGE_LABEL[r.status] || r.status, r.assignedTo, r.nextFollowUp]);
    const csv = [headers, ...csvRows].map((row) => row.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nle-selected-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
  function getOrCreateClient(r) {
    return saveClient({ name: r.name, phone: r.phone, email: r.email || "", city: r.eventLocation || r.city || "Ranchi", address: r.eventVenue || "", notes: `Lead for ${r.eventType}. Event date: ${r.eventDate || "TBD"}. Guest count: ${r.guestCount || "TBD"}. Requirements: ${r.message || "—"}` });
  }
  function createQuotation(r) {
    const client = getOrCreateClient(r);
    navigate("/admin/invoices/new", { state: { clientId: client.id, leadId: r.id, documentType: "quotation", lead: r } });
  }
  async function handleScheduleFollowUp(record) {
    const value = window.prompt("Follow-up date/time (YYYY-MM-DDTHH:mm):", record.nextFollowUp ? String(record.nextFollowUp).slice(0, 16) : "");
    if (value === null || !value.trim()) return;
    try { await updateAdminInquiry(record.id, { nextFollowUp: new Date(value).toISOString() }); await refresh(); showFeedback("Follow-up scheduled."); }
    catch (err) { setError(err.message || "Unable to schedule follow-up."); }
  }
  function openEditLead(record) {
    setEditingLead(record);
    const source = record.sourceDetail || record.leadSource || "CRM";
    const knownSources = [...LEAD_SOURCE_OPTIONS, ...DEFAULT_SOURCE_DETAILS];
    const isCustom = Boolean(source && !knownSources.includes(source));
    setLeadSourceCustom(isCustom);
    setCustomLeadSource(isCustom ? source : "");
    setLeadForm({ name: record.name === "Anonymous Client" ? "" : record.name, phone: record.phone || "", whatsapp: record.whatsapp || "", email: record.email || "", eventType: record.eventType || "", eventDate: record.eventDate || "", eventLocation: record.eventLocation || "", guestCount: record.guestCount || "", budget: record.budget || "", leadSource: record.leadSource || "Website", source: isCustom ? "" : source, message: record.message || "", assignedTo: record.assignedTo === "Unassigned" ? "" : record.assignedTo || "", nextFollowUp: record.nextFollowUp || "" });
    setLeadClientType("Individual");
    setLeadTags([]);
    setLeadQuickActions({ followUp: Boolean(record.nextFollowUp), whatsapp: true, emailMarketing: false });
    setLeadStatus(record.status || "new_lead");
    if (record.nextFollowUp) {
      const d = new Date(record.nextFollowUp);
      if (!Number.isNaN(d.getTime())) {
        setLeadFollowUpDate(d.toISOString().slice(0, 10));
        setLeadFollowUpTime(d.toTimeString().slice(0, 5));
      }
    } else { setLeadFollowUpDate(""); setLeadFollowUpTime(""); }
    setShowAddLead(true);
  }
  async function handleAddLead(e) {
    e.preventDefault(); setSavingLead(true); setError("");
    try {
      const nextFollowUp = leadQuickActions.followUp && leadFollowUpDate
        ? `${leadFollowUpDate}T${leadFollowUpTime || "09:00"}`
        : "";
      const resolvedSource = leadSourceCustom ? customLeadSource.trim() : String(leadForm.source || "").trim();
      if (!resolvedSource) throw new Error("Please enter a custom lead source.");
      const payload = { ...leadForm, source: resolvedSource, status: leadStatus, nextFollowUp };
      if (editingLead) await updateAdminInquiry(editingLead.id, payload);
      else await createAdminInquiry(payload);
      await refresh(); setShowAddLead(false); setEditingLead(null); setLeadForm(EMPTY_LEAD); setLeadSourceCustom(false); setCustomLeadSource(""); showFeedback(editingLead ? "Lead updated." : "Lead added.");
    } catch (err) { setError(err.message || "Unable to save lead."); }
    finally { setSavingLead(false); }
  }

  function exportCsv() {
    const headers = ["Name", "Phone", "Email", "Event Type", "Event Date", "Location", "Budget", "Source", "Status", "Assigned To", "Next Follow-up"];
    const rows = filtered.map((r) => [r.name, r.phone, r.email, r.eventType, r.eventDate, r.eventLocation, r.budget, r.sourceDetail, STAGE_LABEL[r.status] || r.status, r.assignedTo, r.nextFollowUp]);
    const csv = [headers, ...rows].map((row) => row.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "nle-crm-leads.csv"; a.click(); URL.revokeObjectURL(url); setMoreMenu(false);
  }
  async function importCsv(file) {
    if (!file) return;
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(Boolean);
      if (lines.length < 2) throw new Error("The CSV file has no lead rows.");
      const parse = (line) => line.match(/("(?:[^"]|"")*"|[^,]*)(?:,|$)/g)?.map((x) => x.replace(/,$/, "").replace(/^"|"$/g, "").replace(/""/g, '"')) || [];
      const headers = parse(lines[0]).map((h) => h.trim().toLowerCase());
      let imported = 0;
      for (const line of lines.slice(1)) {
        const cells = parse(line); const get = (...names) => { const i = names.map((n) => headers.indexOf(n)).find((i) => i >= 0); return i >= 0 ? cells[i] || "" : ""; };
        const lead = { name: get("name", "full name"), phone: get("phone", "phone number"), email: get("email"), eventType: get("event type") || "Other", eventDate: get("event date"), eventLocation: get("location", "event location"), guestCount: get("guest count", "number of guests"), budget: get("budget", "budget range"), source: get("source") || "CRM", leadSource: "Website", message: get("notes", "message"), assignedTo: get("assigned to") };
        if (!lead.name || !lead.phone || !lead.eventLocation) continue;
        try { await createAdminInquiry(lead); imported += 1; } catch { /* skip invalid row */ }
      }
      await refresh(); showFeedback(`${imported} lead${imported === 1 ? "" : "s"} imported.`);
    } catch (err) { setError(err.message || "Unable to import CSV."); }
    finally { if (importRef.current) importRef.current.value = ""; }
  }

  const statCards = [
    ["Total Inquiries", counts.all, "+12%", "total", "user"],
    ["Active Leads", counts.active, "+18%", "active", "phone"],
    ["Discovery Calls", counts.discovery_call, "+8%", "discovery", "phone"],
    ["Meetings Scheduled", counts.meeting_scheduled, "+21%", "meeting", "calendar"],
    ["Quotations Sent", counts.quotation_sent, "+20%", "quote", "send"],
    ["Won", counts.deal_closed, "+27%", "won", "check"],
    ["Lost", counts.lost, "-8%", "lost", "close"],
  ];
  const tabs = [["all", "All Leads"], ["new_lead", "New Inquiry"], ["contacted", "Contacted"], ["discovery_call", "Discovery Call"], ["meeting_scheduled", "Meeting Scheduled"], ["quotation_sent", "Quotation Sent"], ["negotiation", "Negotiation"], ["deal_closed", "Won"], ["lost", "Lost"], ["junk", "Junk"]];

  function renderLeadDrawer(record) {
    const initials = String(record.name || "CL").split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "CL";
    const statusLabel = STAGE_LABEL[record.status] || record.status || "New Inquiry";
    const source = record.sourceDetail || record.leadSource || "Inquiry Form";
    const location = record.eventLocation || record.city || "—";
    const relatedInvoices = getInvoices().filter((invoice) => {
      if (invoice.leadId === record.id) return true;
      const client = getClientsForRecord(record).find((item) => item && item.id === invoice.clientId);
      return Boolean(client);
    });
    const quotations = relatedInvoices.filter((invoice) => invoice.documentType === "quotation");
    const invoices = relatedInvoices.filter((invoice) => invoice.documentType !== "quotation");
    const payments = invoices.filter((invoice) => invoice.status === "paid");
    return (
      <>
        <div className="crm-drawer-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setSelected(null); }} />
        <aside className="crm-lead-drawer" aria-label="Lead details">
          <div className="crm-drawer-head">
            <div>
              <span className="crm-drawer-eyebrow">Lead Details</span>
              <h2>{record.name}</h2>
              <p>{record.displayId || record.id} · {statusLabel}</p>
            </div>
            <button type="button" className="crm-drawer-close" onClick={() => setSelected(null)} aria-label="Close"><Icon name="close" /></button>
          </div>
          <button type="button" className="crm-open-client-button" onClick={() => navigate(`/admin/inquiries/${encodeURIComponent(record.id)}`)}><span><Icon name="user" /><b>Open Client Details</b><small>View complete client overview, events, billing and activity</small></span><Icon name="chevronRight" /></button>
          <div className="crm-drawer-profile">
            <div className="crm-drawer-avatar">{initials}</div>
            <div><h3>{record.name}</h3><p>{record.eventType || "Event"} · {location}</p><span className={`crm-drawer-status status-${record.status}`}>{statusLabel}</span></div>
          </div>
          <section className="crm-drawer-section"><h3>Customer Information <button type="button" onClick={() => openEditLead(record)}>Edit</button></h3><div className="crm-drawer-rows"><div><span>Phone</span><b>{record.phone || "—"}</b></div><div><span>Email</span><b>{record.email || "—"}</b></div><div><span>WhatsApp</span><b>{record.whatsapp || record.phone || "—"}</b></div></div></section>
          <section className="crm-drawer-section"><h3>Event Information <button type="button" onClick={() => openEditLead(record)}>Edit</button></h3><div className="crm-drawer-rows"><div><span>Event</span><b>{record.eventType || "—"}</b></div><div><span>Date</span><b>{fmtDate(record.eventDate)}</b></div><div><span>Location</span><b>{location}</b></div><div><span>Guests</span><b>{record.guestCount || "—"}</b></div><div><span>Budget</span><b>{record.budget || "—"}</b></div></div></section>
          <section className="crm-drawer-section"><h3>Lead Information</h3><div className="crm-drawer-rows"><div><span>Source</span><b>{source}</b></div><div><span>Assigned To</span><b>{record.assignedTo || "Unassigned"}</b></div><div><span>Next Follow-up</span><b>{record.nextFollowUp ? fmtDateTime(record.nextFollowUp) : "—"}</b></div></div></section>
          <section className="crm-drawer-section"><h3>Quick Actions</h3><div className="crm-drawer-actions"><button type="button" onClick={() => window.open(`tel:${record.phone}`)}><Icon name="phone" />Call</button><button type="button" onClick={() => window.open(`https://wa.me/${String(record.whatsapp || record.phone).replace(/\D/g, "")}`, "_blank", "noopener,noreferrer")}><Icon name="whatsapp" />WhatsApp</button><button type="button" onClick={() => handleScheduleFollowUp(record)}><Icon name="calendar" />Follow-up</button><button type="button" onClick={() => createQuotation(record)}><Icon name="send" />Quotation</button></div></section>
          <div className="crm-drawer-footer"><span>{quotations.length} quotations · {invoices.length} invoices · {payments.length} payments</span><button type="button" onClick={() => navigate(`/admin/inquiries/${encodeURIComponent(record.id)}?tab=activity`)}>View Activity</button></div>
        </aside>
      </>
    );
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
    } catch { return []; }
  }

  function renderLeadDetailsPage(record) {
    const initials = String(record.name || "CL").split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "CL";
    const statusLabel = STAGE_LABEL[record.status] || record.status || "New Inquiry";
    const eventDate = record.eventDate ? fmtDate(record.eventDate) : "—";
    const budget = record.budget || "—";
    const location = record.eventLocation || record.city || "—";
    const phone = record.phone || "—";
    const email = record.email || "—";
    const source = record.sourceDetail || record.leadSource || "Inquiry Form";
    const tagDefaults = ["VIP Client", "Repeat Client", "High Potential"];
    const noteText = record.adminNotes || record.message || "No notes have been added for this lead yet.";
    const relatedInvoices = getInvoices().filter((invoice) => {
      if (invoice.leadId === record.id) return true;
      return getClientsForRecord(record).some((client) => client && client.id === invoice.clientId);
    });
    const quotations = relatedInvoices.filter((invoice) => invoice.documentType === "quotation");
    const invoices = relatedInvoices.filter((invoice) => invoice.documentType !== "quotation");
    const payments = invoices.filter((invoice) => invoice.status === "paid");
    const eventCount = record.eventDate ? 1 : 0;
    const noteCount = noteText && noteText !== "No notes have been added for this lead yet." ? 1 : 0;
    const nextEvent = record.eventDate ? `${eventDate} (${record.eventType || "Event"})` : "No upcoming event";

    return (
      <div className="crm-lead-details-page">
        <div className="crm-lead-detail-breadcrumb"><button type="button" onClick={() => setShowClientDetails(false)}>← Back to Lead</button><span>›</span><strong>Client Details / Overview</strong></div>

        <div className="crm-lead-detail-header">
          <div className="crm-lead-detail-identity">
            <div className="crm-lead-avatar">{initials}</div>
            <div>
              <div className="crm-lead-name-row"><h1>{record.name}</h1><Icon name="star" /></div>
              <p>Client ID: {String(record.displayId || record.id).slice(0, 14)} <span>│</span> Source: {source} <span>│</span> Added on {fmtDate(record.createdAt)}</p>
              <div className="crm-lead-tags">{tagDefaults.map((tag) => <span key={tag}>{tag}</span>)}<button type="button">＋ Add Tag</button></div>
            </div>
          </div>
          <div className="crm-lead-detail-actions">
            <button type="button" onClick={() => openEditLead(record)}><Icon name="edit" /> Edit</button>
            <button type="button" onClick={() => createQuotation(record)}><Icon name="send" /> Create Quotation</button>
            <button type="button" onClick={() => showFeedback("Create Event is ready to be connected to the event workflow.")}><Icon name="calendar" /> Create Event</button>
            <button type="button" className="primary" onClick={() => { setDrawerTab("notes"); setNoteEdit(record.adminNotes || ""); }}><Icon name="plus" /> Add Note</button>
            <button type="button" onClick={() => setMoreMenu((v) => !v)}>More <span>⌄</span></button>
            {moreMenu && <div className="crm-lead-detail-more"><button type="button" onClick={() => handleDelete(record.id, record.name)}>Delete Lead</button><button type="button" onClick={() => handleScheduleFollowUp(record)}>Schedule Follow-up</button></div>}
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
          {[["overview", "Overview"], ["events", `Events (${eventCount})`], ["quotations", `Quotations (${quotations.length})`], ["invoices", `Invoices (${invoices.length})`], ["payments", `Payments (${payments.length})`], ["notes", `Notes (${noteCount})`], ["documents", "Documents (0)"], ["activity", "Activity Log"]].map(([key, label]) => <button type="button" key={key} className={drawerTab === key ? "active" : ""} onClick={() => setDrawerTab(key)}>{label}</button>)}
        </div>

        <div className="crm-lead-detail-layout">
          <section className="crm-lead-detail-main">
            {drawerTab === "overview" && <>
              <div className="crm-lead-summary-grid">
                <div><span className="summary-icon blue"><Icon name="calendar" /></span><small>Total Events</small><strong>{eventCount}</strong><em>{eventCount ? "1 Upcoming" : "No events yet"}</em></div>
                <div><span className="summary-icon green"><Icon name="rupee" /></span><small>Total Revenue</small><strong>{budget}</strong><em>From CRM records</em></div>
                <div><span className="summary-icon red"><Icon name="calendar" /></span><small>Last Event</small><strong>—</strong><em>No completed event</em></div>
                <div><span className="summary-icon blue"><Icon name="calendar" /></span><small>Next Event</small><strong>{record.eventDate ? eventDate : "—"}</strong><em>{record.eventType || "No event"}</em></div>
              </div>

              <div className="crm-lead-two-col">
                <section className="crm-lead-card">
                  <div className="crm-lead-card-head"><h2>Client Information</h2><button type="button" onClick={() => openEditLead(record)}><Icon name="edit" /> Edit</button></div>
                  <div className="crm-detail-rows">
                    <div><span>Full Name</span><b>{record.name}</b></div><div><span>Phone</span><b>{phone} {record.phone && <Icon name="whatsapp" />}</b></div><div><span>Email</span><b>{email}</b></div><div><span>Alternate Phone</span><b>{record.whatsapp || "—"}</b></div><div><span>Location</span><b>{location}</b></div><div><span>Address</span><b>{record.eventVenue || "—"}</b></div><div><span>Client Since</span><b>{fmtDate(record.createdAt)}</b></div><div><span>Source</span><b>{source}</b></div><div><span>Lead Owner</span><b>{record.assignedTo}</b></div>
                  </div>
                </section>
                <section className="crm-lead-card">
                  <div className="crm-lead-card-head"><h2>Event Preferences</h2><button type="button" onClick={() => openEditLead(record)}><Icon name="edit" /> Edit</button></div>
                  <div className="crm-detail-rows">
                    <div><span>Preferred Event Types</span><b className="pill-row"><i>{record.eventType || "Event"}</i></b></div><div><span>Average Guest Count</span><b>{record.guestCount || "—"}</b></div><div><span>Preferred Venues</span><b>{location}</b></div><div><span>Budget Range</span><b>{budget}</b></div><div><span>Style / Theme Preference</span><b>—</b></div><div><span>Special Requirements</span><b>{record.message || "—"}</b></div><div><span>Notes</span><b>{noteText}</b></div>
                  </div>
                </section>
              </div>

              <div className="crm-lead-bottom-grid">
                <section className="crm-lead-card">
                  <div className="crm-lead-card-head"><h2>Recent Notes</h2><button type="button" onClick={() => { setDrawerTab("notes"); setNoteEdit(record.adminNotes || ""); }}><Icon name="plus" /> Add Note</button></div>
                  <div className="crm-note-list"><div className="crm-note-item"><span>{initials}</span><div><b>{record.assignedTo}</b><small>{fmtDateTime(record.createdAt)}</small><p>{noteText}</p></div><button type="button" onClick={() => { setDrawerTab("notes"); setNoteEdit(record.adminNotes || ""); }}>⋮</button></div></div>
                </section>
                <section className="crm-lead-card">
                  <div className="crm-lead-card-head"><h2>Documents</h2><button type="button" onClick={() => createQuotation(record)}><Icon name="upload" /> Upload</button></div>
                  <div className="crm-document-empty"><Icon name="send" /><span>No documents attached yet.</span></div>
                </section>
              </div>
            </>}

            {drawerTab === "events" && <section className="crm-lead-card crm-tab-panel"><h2>Events</h2><div className="crm-event-detail"><b>{record.eventType || "Event"}</b><span>{nextEvent}</span><span>{location}</span><span>{record.guestCount || "—"} guests</span><span>{budget}</span></div></section>}
            {drawerTab === "quotations" && <section className="crm-lead-card crm-tab-panel"><div className="crm-lead-card-head"><h2>Quotations</h2><button type="button" onClick={() => createQuotation(record)}>Create Quotation</button></div>{quotations.length ? <div className="crm-detail-document-list">{quotations.map((doc) => <div key={doc.id}><b>{doc.number || "Quotation"}</b><span>{fmtDate(doc.issueDate || doc.createdAt)}</span><strong>₹ {(doc.total || 0).toLocaleString("en-IN")}</strong><em>{doc.status || "draft"}</em></div>)}</div> : <p>No quotations are attached to this client yet.</p>}</section>}
            {drawerTab === "invoices" && <section className="crm-lead-card crm-tab-panel"><div className="crm-lead-card-head"><h2>Invoices</h2><span /></div>{invoices.length ? <div className="crm-detail-document-list">{invoices.map((doc) => <div key={doc.id}><b>{doc.number || "Invoice"}</b><span>{fmtDate(doc.issueDate || doc.createdAt)}</span><strong>₹ {(doc.total || 0).toLocaleString("en-IN")}</strong><em>{doc.status || "draft"}</em></div>)}</div> : <p>No invoices are attached to this client yet.</p>}</section>}
            {drawerTab === "payments" && <section className="crm-lead-card crm-tab-panel"> <div className="crm-lead-card-head"><h2>Payments</h2><span /></div>{payments.length ? <div className="crm-detail-document-list">{payments.map((doc) => <div key={doc.id}><b>{doc.number || "Payment"}</b><span>Paid invoice</span><strong>₹ {(doc.total || 0).toLocaleString("en-IN")}</strong><em>Paid</em></div>)}</div> : <p>No payments are recorded for this client yet.</p>}</section>}
            {drawerTab === "notes" && <section className="crm-lead-card crm-tab-panel"><div className="crm-lead-card-head"><h2>Notes</h2><span /></div><textarea className="crm-detail-notes" value={noteEdit} onChange={(e) => setNoteEdit(e.target.value)} placeholder="Add internal notes…" /><button type="button" className="crm-detail-gold-btn" onClick={() => handleSaveNote(record.id)}>Save Note</button></section>}
            {drawerTab === "documents" && <section className="crm-lead-card crm-tab-panel"><h2>Documents</h2><p>No documents attached yet.</p></section>}
            {drawerTab === "activity" && <section className="crm-lead-card crm-tab-panel"><h2>Activity Log</h2><div className="crm-detail-activity"><div><b>Lead Created</b><span>{fmtDateTime(record.createdAt)}</span></div><div><b>Source Captured</b><span>{record.leadSource} → {source}</span></div><div><b>Status</b><span>{statusLabel}</span></div>{record.nextFollowUp && <div><b>Follow-up scheduled</b><span>{fmtDateTime(record.nextFollowUp)}</span></div>}</div></section>}
          </section>

          <aside className="crm-lead-detail-sidebar">
            <section className="crm-side-status-card"><h3>Current Status</h3><select className={`crm-detail-status status-${record.status}`} value={record.status} onChange={(e) => handleStageChange(record.id, e.target.value)}>{STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}</select><h3>Assigned To</h3><select className="crm-detail-assignee" value={record.assignedTo === "Unassigned" ? "" : record.assignedTo} onChange={(e) => updateAdminInquiry(record.id, { assignedTo: e.target.value }).then(() => refresh()).catch((err) => setError(err.message || "Unable to update assignment."))}><option value="">Unassigned</option>{teamMembers.map((m) => <option key={m}>{m}</option>)}</select><h3>Next Follow-up</h3><button type="button" className="crm-followup-display" onClick={() => handleScheduleFollowUp(record)}><Icon name="calendar" /><span>{record.nextFollowUp ? fmtDateTime(record.nextFollowUp) : "Set follow-up"}</span><b>Set Reminder</b></button><h3>Client Rating</h3><div className="crm-rating"><span>★★★★★</span><b>(5.0)</b></div></section>
            <section className="crm-side-status-card"><h2>Quick Actions</h2><div className="crm-detail-quick-grid"><button type="button" onClick={() => window.open(`tel:${record.phone}`)}><Icon name="phone" /><span>Call</span></button><button type="button" onClick={() => window.open(`https://wa.me/${String(record.whatsapp || record.phone).replace(/\D/g, "")}`, "_blank", "noopener,noreferrer")}><Icon name="whatsapp" /><span>WhatsApp</span></button><button type="button" onClick={() => window.open(record.email ? `mailto:${record.email}` : "mailto:", "_blank")}><Icon name="send" /><span>Email</span></button><button type="button" onClick={() => createQuotation(record)}><Icon name="send" /><span>Create Quotation</span></button><button type="button" onClick={() => showFeedback("Create Event is ready to be connected to the event workflow.")}><Icon name="calendar" /><span>Create Event</span></button><button type="button" onClick={() => { setDrawerTab("notes"); setNoteEdit(record.adminNotes || ""); }}><Icon name="plus" /><span>Add Note</span></button></div><div className="crm-detail-outcome"><button type="button" className="lost" onClick={() => handleStageChange(record.id, "lost")}><Icon name="close" /> Mark as Lost</button><button type="button" className="won" onClick={() => handleStageChange(record.id, "deal_closed")}><Icon name="check" /> Mark as Won</button></div><button type="button" className="crm-detail-delete" onClick={() => handleDelete(record.id, record.name)}><Icon name="trash" /> Delete Lead</button></section>
            <section className="crm-side-status-card"><div className="crm-lead-card-head"><h2>Important Dates</h2><button type="button" onClick={() => showFeedback("Important dates can be added from the client record.")}>＋ Add Date</button></div><div className="crm-important-date"><Icon name="calendar" /><b>Event Date</b><span>{eventDate}</span></div><div className="crm-important-date"><Icon name="star" /><b>Created</b><span>{fmtDate(record.createdAt)}</span></div></section>
          </aside>
        </div>
      </div>
    );
  }

  return (
    <div className="crm-page">
      <header className="crm-topbar">
        <button className="crm-menu-button" type="button" aria-label="Open menu"><Icon name="menu" /></button>
        <div className="crm-global-search"><Icon name="search" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name, phone, event, or lead ID..." /></div>
        <div className="crm-topbar-spacer" />
        <button className="crm-notification" type="button" aria-label="Notifications">♧<span>3</span></button>
        <div className="crm-user"><span className="crm-user-avatar">SV</span><span><strong>Sumit Verma</strong><small>Admin</small></span><span className="crm-user-chevron">⌄</span></div>
      </header>

      <main className="crm-content">
        <div className="crm-heading-row">
          <div><h1>CRM – Leads</h1><p>Manage your inquiries, follow-ups and convert them into successful events.</p></div>
          <div className="crm-heading-actions">
            <button type="button" className="crm-outline-btn" onClick={() => importRef.current?.click()}><Icon name="upload" /> Import Leads</button>
            <div className="crm-more-wrap"><button type="button" className="crm-square-btn" onClick={() => setMoreMenu((v) => !v)}>•••</button>{moreMenu && <div className="crm-more-menu"><button onClick={exportCsv}>Export Leads</button><button onClick={() => { refresh(); setMoreMenu(false); }}>Refresh</button></div>}</div>
            <button className="crm-add-button" type="button" onClick={openAddLead}><Icon name="plus" /> Add Lead</button>
            <input ref={importRef} type="file" accept=".csv,text/csv" hidden onChange={(e) => importCsv(e.target.files?.[0])} />
          </div>
        </div>

        {feedback && <div className="admin-alert admin-alert--success">{feedback}</div>}
        {error && <div className="admin-alert admin-alert--error">{error}</div>}

        <div className="crm-stat-grid">
          {statCards.map(([label, value, delta, tone, icon]) => <button key={label} type="button" className={`crm-stat-card crm-stat-card--${tone}`} onClick={() => { if (tone === "lost") setTab("lost"); else if (tone === "won") setTab("deal_closed"); else if (tone === "discovery") setTab("discovery_call"); else if (tone === "meeting") setTab("meeting_scheduled"); else if (tone === "quote") setTab("quotation_sent"); else setTab("all"); }}><span className="crm-stat-icon"><Icon name={icon} /></span><span className="crm-stat-label">{label}</span><strong>{value}</strong><small className={delta.startsWith("-") ? "negative" : ""}>↑ {delta.replace("+", "")}</small><em>vs last month</em></button>)}
        </div>

        <div className="crm-filter-row">
          <button className="crm-filter-control crm-date-filter" type="button" onClick={chooseDateRange}><Icon name="calendar" /> <span>{dateFrom || dateTo ? `${dateFrom || "Any"} – ${dateTo || "Any"}` : "All Dates"}</span><b>⌄</b></button>
          <label className="crm-filter-control"><span>Event Type</span><select value={eventFilter} onChange={(e) => setEventFilter(e.target.value)}><option value="all">All Events</option>{EVENT_TYPES.map((type) => <option key={type}>{type}</option>)}</select><b>⌄</b></label>
          <label className="crm-filter-control"><span>Source</span><select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}><option value="all">All Sources</option>{sourceDetails.map((source) => <option key={source}>{source}</option>)}</select><b>⌄</b></label>
          <label className="crm-filter-control"><span>Status</span><select value={stage} onChange={(e) => { setStage(e.target.value); setTab(e.target.value === "all" ? "all" : e.target.value); }}><option value="all">All Status</option>{STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}</select><b>⌄</b></label>
          <label className="crm-filter-control"><span>Assigned To</span><select value={assignedFilter} onChange={(e) => setAssignedFilter(e.target.value)}><option value="all">All Team Members</option>{teamMembers.map((m) => <option key={m}>{m}</option>)}</select><b>⌄</b></label>
          <button className={`crm-more-filter ${moreFilters ? "active" : ""}`} type="button" onClick={() => setMoreFilters((v) => !v)}><Icon name="filter" /> More Filters</button>
          <button className="crm-reset" type="button" onClick={resetFilters}>Reset</button>
        </div>
        {moreFilters && <div className="crm-more-filters"><label>Location <input onChange={(e) => setQuery(e.target.value)} placeholder="Search location" /></label><label>Budget <select><option>All budgets</option>{BUDGETS.map((b) => <option key={b}>{b}</option>)}</select></label><label>Follow-up <select><option>All</option><option>Scheduled</option><option>Not scheduled</option></select></label></div>}

        <div className="crm-stage-tabs">
          {tabs.map(([key, label]) => <button key={key} type="button" className={tab === key ? "active" : ""} onClick={() => { setTab(key); setStage(key === "all" ? "all" : key); }}>{label} <span>({counts[key] ?? 0})</span></button>)}
        </div>

        {selectedRows.length > 0 && (
          <div className="crm-bulk-toolbar" role="region" aria-label="Bulk lead actions">
            <strong>{selectedRows.length} selected</strong>
            <button type="button" onClick={selectAllFiltered}>Select all {filtered.length} filtered</button>
            <label>Status<select defaultValue="" onChange={(e) => { handleBulkStatus(e.target.value); e.target.value = ""; }}><option value="">Change status…</option>{STAGES.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select></label>
            <label>Assign<select defaultValue="" onChange={(e) => { handleBulkAssign(e.target.value); e.target.value = ""; }}><option value="">Assign to…</option>{teamMembers.map((member) => <option key={member} value={member}>{member}</option>)}</select></label>
            <button type="button" onClick={exportSelectedCsv}>Export selected</button>
            <button type="button" className="danger" onClick={handleBulkDelete}><Icon name="trash" /> Delete selected</button>
            <button type="button" className="ghost" onClick={clearSelection}>Clear</button>
          </div>
        )}

        <section className="crm-table-card">
          <div className="crm-table-head"><label>Show <select><option>10</option></select> entries</label><span>Showing {filtered.length ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, filtered.length)} of {filtered.length} leads</span></div>
          {loading ? <div className="crm-empty">Loading leads…</div> : pageRows.length === 0 ? <div className="crm-empty">No leads match the current filters.</div> : <div className="crm-table-wrap"><table className="crm-table"><thead><tr><th><input type="checkbox" checked={pageRows.length > 0 && pageRows.every((r) => selectedRows.includes(r.id))} onChange={(e) => togglePageSelection(e.target.checked)} aria-label="Select current page" /></th><th>#</th><th>Customer</th><th>Event Type</th><th>Event Date</th><th>Location</th><th>Budget</th><th>Source</th><th>Status</th><th>Assigned To</th><th>Next Follow-up</th><th>Actions</th></tr></thead><tbody>
            {pageRows.map((r, index) => <tr key={r.id} className={selected?.id === r.id ? "selected" : ""} onClick={() => selectRecord(r)}>
              <td onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={selectedRows.includes(r.id)} onChange={(e) => setSelectedRows((prev) => e.target.checked ? [...prev, r.id] : prev.filter((id) => id !== r.id))} /></td>
              <td>{(page - 1) * pageSize + index + 1}</td>
              <td><strong>{r.name}</strong><small>{r.phone}</small></td>
              <td><span className="crm-event-badge">{r.eventType}</span></td>
              <td>{fmtDate(r.eventDate)}</td>
              <td>{r.eventLocation || "—"}</td>
              <td>{r.budget || "—"}</td>
              <td><div className="crm-source-cell"><span className="crm-source-mini"><Icon name={SOURCE_ICONS[r.sourceDetail] || SOURCE_ICONS[r.leadSource] || "layers"} /></span>{r.sourceDetail}</div><small className="crm-source-type">{r.sourceType}</small></td>
              <td onClick={(e) => e.stopPropagation()}><select className={`crm-status-select status-${r.status}`} value={r.status} onChange={(e) => handleStageChange(r.id, e.target.value)}>{STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}</select></td>
              <td><span className="crm-assignee">{r.assignedTo}</span></td>
              <td>{r.nextFollowUp ? fmtDateTime(r.nextFollowUp) : <span className="crm-muted">—</span>}</td>
              <td onClick={(e) => e.stopPropagation()}><div className="crm-actions"><a href={`tel:${r.phone}`} title="Call"><Icon name="phone" /></a><a href={`https://wa.me/${String(r.whatsapp || r.phone).replace(/\D/g, "")}`} target="_blank" rel="noreferrer" title="WhatsApp"><Icon name="whatsapp" /></a><button type="button" title="Open lead" onClick={() => selectRecord(r)}>⋮</button></div></td>
            </tr>)}
          </tbody></table></div>}
          <div className="crm-pagination"><button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>‹</button>{Array.from({ length: Math.min(pageCount, 5) }, (_, i) => i + 1).map((n) => <button type="button" key={n} className={page === n ? "active" : ""} onClick={() => setPage(n)}>{n}</button>)}{pageCount > 5 && <><span>…</span><button type="button" onClick={() => setPage(pageCount)}>{pageCount}</button></>}<button type="button" disabled={page >= pageCount} onClick={() => setPage((p) => p + 1)}>›</button></div>
        </section>
      </main>

      {selected && !showClientDetails && renderLeadDrawer(selected)}
      {selected && showClientDetails && renderLeadDetailsPage(selected)}

      {showAddLead && (
        <div className="crm-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setShowAddLead(false); }}>
          <form className="crm-add-lead-modal crm-add-lead-modal--reference" onSubmit={handleAddLead}>
            <div className="crm-add-lead-head">
              <div>
                <h2>{editingLead ? "Edit Lead" : "Add New Lead"}</h2>
                <p>{editingLead ? "Update inquiry details and keep the sales journey accurate." : "Capture inquiry details and start your sales journey."}</p>
              </div>
              <div className="crm-add-lead-tip"><Icon name="bulb" /><span>Fill in key details to help your team<br />provide better service and faster follow-ups.</span></div>
              <button type="button" className="crm-add-lead-close" onClick={() => setShowAddLead(false)} aria-label="Close"><Icon name="close" /></button>
            </div>

            <div className="crm-add-lead-layout">
              <div className="crm-add-lead-main">
                <section className="crm-add-section">
                  <div className="crm-add-section-title"><Icon name="user" /><div><h3>1. Client Information</h3><p>Basic contact details of the client.</p></div></div>
                  <div className="crm-add-grid">
                    <label>Full Name <b>*</b><div><Icon name="user" /><input required value={leadForm.name} onChange={(e) => updateLeadField("name", e.target.value)} placeholder="Enter full name" /></div></label>
                    <label>Phone Number <b>*</b><div className="crm-phone-field"><span className="crm-country">🇮🇳 +91⌄</span><input required value={leadForm.phone} onChange={(e) => updateLeadField("phone", e.target.value)} placeholder="Enter phone number" /><button type="button" className="crm-inline-whatsapp" title="Use WhatsApp number" onClick={() => updateLeadField("whatsapp", leadForm.phone)}><Icon name="whatsapp" /></button></div></label>
                    <label>Email<div><Icon name="send" /><input type="email" value={leadForm.email} onChange={(e) => updateLeadField("email", e.target.value)} placeholder="Enter email address" /></div></label>
                    <label>Alternate Phone<div><Icon name="phone" /><input value={leadForm.whatsapp} onChange={(e) => updateLeadField("whatsapp", e.target.value)} placeholder="Enter alternate number" /></div></label>
                    <label>Client Type<div><Icon name="user" /><select value={leadClientType} onChange={(e) => setLeadClientType(e.target.value)}><option>Individual</option><option>Corporate</option><option>Agency</option><option>Other</option></select></div></label>
                    <label>Lead Owner / Assigned To<div><span className="crm-avatar-mini">{(leadForm.assignedTo || teamMembers[0] || "AK").slice(0,2).toUpperCase()}</span><select value={leadForm.assignedTo} onChange={(e) => updateLeadField("assignedTo", e.target.value)}><option value="">{teamMembers[0] || "Auto assign"}</option>{teamMembers.map((x) => <option key={x} value={x}>{x}</option>)}</select></div></label>
                  </div>
                </section>

                <section className="crm-add-section">
                  <div className="crm-add-section-title"><Icon name="calendar" /><div><h3>2. Event Information</h3><p>Tell us about the event.</p></div></div>
                  <div className="crm-add-grid">
                    <label>Event Type <b>*</b><div><Icon name="calendar" /><select required value={leadForm.eventType} onChange={(e) => updateLeadField("eventType", e.target.value)}><option value="">Select event</option>{EVENT_TYPES.map((x) => <option key={x}>{x}</option>)}</select></div></label>
                    <label>Event Date<div><Icon name="calendar" /><input type="date" value={leadForm.eventDate} onChange={(e) => updateLeadField("eventDate", e.target.value)} /></div></label>
                    <label>Venue / Location<div><Icon name="pin" /><input required value={leadForm.eventLocation} onChange={(e) => updateLeadField("eventLocation", e.target.value)} placeholder="Enter venue or location (e.g. Ranchi)" /></div></label>
                    <label>Guest Count (Expected)<div><Icon name="user" /><input value={leadForm.guestCount} onChange={(e) => updateLeadField("guestCount", e.target.value)} placeholder="Enter guest count" /></div></label>
                    <label>Budget Range<div><Icon name="rupee" /><select value={leadForm.budget} onChange={(e) => updateLeadField("budget", e.target.value)}><option value="">Select budget range</option>{BUDGETS.map((x) => <option key={x}>{x}</option>)}</select></div></label>
                    <label>Special Requirements (Optional)<div className="crm-textarea-wrap"><Icon name="layers" /><textarea value={leadForm.message} onChange={(e) => updateLeadField("message", e.target.value)} placeholder="Theme, style, decor, catering or any specific requirements..." /></div></label>
                  </div>
                </section>

                <section className="crm-add-section">
                  <div className="crm-add-section-title"><Icon name="target" /><div><h3>3. Lead &amp; Follow-up</h3><p>Set the initial status and follow-up details.</p></div></div>
                  <div className="crm-add-grid">
                    <label>Current Status <b>*</b><div><select required value={leadStatus} onChange={(e) => setLeadStatus(e.target.value)}><option value="new_lead">New Inquiry</option>{STAGES.filter((x) => x.key !== "junk").map((x) => <option key={x.key} value={x.key}>{x.label}</option>)}</select></div></label>
                    <label>Next Follow-up Date<div><Icon name="calendar" /><input type="date" value={leadFollowUpDate} onChange={(e) => setLeadFollowUpDate(e.target.value)} /></div></label>
                    <label>Next Follow-up Time<div><Icon name="clock" /><input type="time" value={leadFollowUpTime} onChange={(e) => setLeadFollowUpTime(e.target.value)} /></div></label>
                    <label className="crm-add-notes">Notes (Optional)<textarea value={leadForm.message} onChange={(e) => updateLeadField("message", e.target.value)} placeholder="Add any additional notes about this lead..." /></label>
                  </div>
                </section>
              </div>

              <aside className="crm-add-lead-side">
                <section className="crm-add-side-card crm-source-card">
                  <div className="crm-side-title"><Icon name="share" /><div><h3>Lead Source</h3><p>Where did this inquiry come from?</p></div></div>
                  <div className="crm-source-select"><Icon name={SOURCE_ICONS[leadSourceCustom ? "layers" : leadForm.source] || "layers"} /><select value={leadSourceCustom ? "__custom__" : (leadForm.source || "CRM")} onChange={(e) => handleLeadSourceChange(e.target.value)}>{LEAD_SOURCE_OPTIONS.map((source) => <option key={source} value={source}>{source}</option>)}<option value="__custom__">Custom Source…</option></select><span>⌄</span></div>
                  {leadSourceCustom && <input className="crm-custom-source" required value={customLeadSource} placeholder="Type custom source" onChange={(e) => setCustomLeadSource(e.target.value)} />}
                  <div className="crm-source-tip"><Icon name="bulb" /><span>Select the correct source to<br />track marketing performance<br />accurately.</span></div>
                </section>

                <section className="crm-add-side-card">
                  <div className="crm-side-title"><Icon name="tag" /><div><h3>Suggested Tags</h3><p>Add tags to organize this lead.</p></div></div>
                  <div className="crm-tag-list">{LEAD_TAG_OPTIONS.map((tag) => <label key={tag}><input type="checkbox" checked={leadTags.includes(tag)} onChange={() => toggleLeadTag(tag)} /><span>{tag}</span></label>)}</div>
                </section>

                <section className="crm-add-side-card crm-quick-card">
                  <div className="crm-side-title"><Icon name="zap" /><div><h3>Quick Actions</h3></div></div>
                  <label><input type="checkbox" checked={leadQuickActions.followUp} onChange={(e) => setLeadQuickActions((p) => ({ ...p, followUp: e.target.checked }))} /><span>Create follow-up task</span></label>
                  <label><input type="checkbox" checked={leadQuickActions.whatsapp} onChange={(e) => setLeadQuickActions((p) => ({ ...p, whatsapp: e.target.checked }))} /><span>Send welcome message<br />on WhatsApp</span></label>
                  <label><input type="checkbox" checked={leadQuickActions.emailMarketing} onChange={(e) => setLeadQuickActions((p) => ({ ...p, emailMarketing: e.target.checked }))} /><span>Add to email marketing list</span></label>
                </section>
              </aside>
            </div>

            <div className="crm-add-lead-footer">
              <label className="crm-draft-check"><input type="checkbox" /><span><b>Save as Draft</b><small>You can complete the details later</small></span></label>
              <div><button type="button" className="crm-cancel" onClick={() => setShowAddLead(false)}>Cancel</button><button type="submit" className="crm-gold-button crm-add-submit" disabled={savingLead}>{savingLead ? "Saving…" : editingLead ? "Save Changes" : "Add Lead"}<span>→</span></button></div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
