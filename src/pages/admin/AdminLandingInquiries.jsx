import { useEffect, useMemo, useState } from "react";
import { deleteAdminInquiry, fetchAdminInquiries, updateAdminInquiry } from "../../lib/adminApi";
import Icon from "../../components/Icon";
import usePageMeta from "../../hooks/usePageMeta";

function fmtDate(value) {
  if (!value) return "—";
  const d = new Date(String(value).length === 10 ? `${value}T00:00:00` : value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
function mapRecord(row) {
  return { ...row, id: row.id, name: row.name || "Anonymous Client", phone: row.phone || "", whatsapp: row.whatsapp_number || "", email: row.email || "", eventType: row.event_type || "Event", eventDate: row.event_date || "", eventLocation: row.event_location || row.city || "", guestCount: row.guest_count || "", message: row.message || "", status: row.status || "new_lead", adminNotes: row.admin_notes || "", createdAt: row.created_at || "" };
}
function parseMessage(message) {
  const lines = String(message || "").split("\n");
  const req = lines.find((line) => line.startsWith("Requirements:"))?.replace(/^Requirements:\s*/, "") || "None selected";
  const details = lines.find((line) => line.startsWith("Additional Details:"))?.replace(/^Additional Details:\s*/, "") || "—";
  return { req, details };
}

export default function AdminLandingInquiries() {
  usePageMeta("Landing Inquiries — Admin", "Manage enquiries submitted through /landing.", { noindex: true });
  const [records, setRecords] = useState([]);
  const [selected, setSelected] = useState(null);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [query, setQuery] = useState("");

  async function refresh() {
    try { setError(""); const result = await fetchAdminInquiries(); setRecords((result.inquiries || []).filter((r) => r.source === "landing").map(mapRecord)); }
    catch (err) { setError(err.message || "Unable to load landing inquiries."); }
    finally { setLoading(false); }
  }
  useEffect(() => { refresh(); const timer = setInterval(refresh, 15000); return () => clearInterval(timer); }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return records;
    return records.filter((r) => [r.name, r.phone, r.whatsapp, r.email, r.eventType, r.eventLocation, r.guestCount].some((v) => String(v).toLowerCase().includes(q)));
  }, [records, query]);

  function select(record) { setSelected(record); setNote(record.adminNotes || ""); }
  async function saveNote() {
    if (!selected) return;
    try { await updateAdminInquiry(selected.id, { adminNotes: note }); setFeedback("Saved admin notes."); await refresh(); setTimeout(() => setFeedback(""), 2500); }
    catch (err) { setError(err.message || "Unable to save notes."); }
  }
  async function remove(record) {
    if (!window.confirm(`Delete this landing enquiry from "${record.name}"?`)) return;
    try { await deleteAdminInquiry(record.id); setSelected(null); await refresh(); setFeedback("Landing enquiry deleted."); setTimeout(() => setFeedback(""), 2500); }
    catch (err) { setError(err.message || "Unable to delete enquiry."); }
  }

  return <div className="admin-page">
    <div className="admin-page-head"><div><h1>Landing Inquiries</h1><p className="admin-hint">Enquiries submitted through the standalone /landing form.</p></div><button className="btn btn-ghost" type="button" onClick={() => { setLoading(true); refresh(); }} disabled={loading}>{loading ? "Loading…" : "Refresh"}</button></div>
    {feedback && <div className="admin-alert admin-alert--success">{feedback}</div>}
    {error && <div className="admin-alert admin-alert--error">{error}</div>}
    <div className="admin-toolbar-row"><div className="admin-search-wrapper"><Icon name="search" /><input className="admin-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, phone, event or location…" /></div><span className="admin-hint">{filtered.length} of {records.length} enquiries</span></div>
    <div className="admin-inquiries-layout">
      <div className="admin-panel admin-inquiries-table-panel">
        {loading ? <p className="admin-empty">Loading landing inquiries…</p> : filtered.length === 0 ? <p className="admin-empty">No landing inquiries yet.</p> : <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Customer</th><th>Event</th><th>Date / Location</th><th>Guests</th><th>Received</th><th>Actions</th></tr></thead><tbody>{filtered.map((r) => <tr key={r.id} className={selected?.id === r.id ? "row-selected" : ""} onClick={() => select(r)} style={{ cursor: "pointer" }}><td><strong>{r.name}</strong><div className="admin-table-sub">{r.phone}</div></td><td><span className="admin-badge admin-badge--sent">{r.eventType}</span></td><td><div>{fmtDate(r.eventDate)}</div><div className="admin-hint">{r.eventLocation || "—"}</div></td><td>{r.guestCount}</td><td>{fmtDate(r.createdAt)}</td><td onClick={(e) => e.stopPropagation()}><button className="btn-icon btn-icon-danger" type="button" title="Delete" onClick={() => remove(r)}><Icon name="trash" /></button></td></tr>)}</tbody></table></div>}
      </div>
      {selected && <div className="admin-panel admin-inquiry-detail-panel"><div className="admin-panel-head"><h2>Landing Enquiry Details</h2><button type="button" className="btn-icon" onClick={() => setSelected(null)}><Icon name="close" /></button></div><div className="admin-lead-detail-body"><div className="admin-lead-head"><h3>{selected.name}</h3><span className="admin-table-sub">Received {fmtDate(selected.createdAt)}</span></div><div className="admin-lead-info-grid"><div><span className="admin-label">Mobile:</span><div><a href={`tel:${selected.phone}`}>{selected.phone || "—"}</a></div></div><div><span className="admin-label">WhatsApp:</span><div>{selected.whatsapp || "Same as mobile / —"}</div></div><div><span className="admin-label">Email:</span><div>{selected.email || "—"}</div></div><div><span className="admin-label">Event Type:</span><div>{selected.eventType}</div></div><div><span className="admin-label">Guests:</span><div>{selected.guestCount}</div></div><div><span className="admin-label">Event Date:</span><div>{fmtDate(selected.eventDate)}</div></div><div><span className="admin-label">Location:</span><div>{selected.eventLocation || "—"}</div></div></div><div style={{ marginTop: 18 }}><span className="admin-label">Requirements:</span><p className="admin-lead-message">{parseMessage(selected.message).req}</p></div><div style={{ marginTop: 16 }}><span className="admin-label">Additional Details:</span><p className="admin-lead-message" style={{ whiteSpace: "pre-line" }}>{parseMessage(selected.message).details}</p></div><div style={{ marginTop: 20 }}><span className="admin-label">Admin Notes</span><textarea className="admin-textarea" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Internal notes…" /><button className="btn btn-ghost btn-sm" type="button" style={{ marginTop: 8 }} onClick={saveNote}>Save Notes</button></div><div className="admin-row-actions" style={{ marginTop: 20 }}><button className="btn-icon btn-icon-danger" type="button" onClick={() => remove(selected)}><Icon name="trash" /> Delete</button></div></div></div>}
    </div>
  </div>;
}
