import { useMemo, useState } from "react";
import { getClients, saveClient, deleteClient, getInvoices } from "../../lib/adminStore";
import { CITIES } from "../../data/nav";
import usePageMeta from "../../hooks/usePageMeta";

const EMPTY = { name: "", phone: "", email: "", address: "", city: "Ranchi", notes: "" };

function ClientForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial || EMPTY);
  const [error, setError] = useState("");

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) return setError("Name is required.");
    if (!form.phone.trim() && !form.email.trim()) return setError("Add a phone or email.");
    setError("");
    onSave(form);
  }

  return (
    <form className="admin-modal-card" onSubmit={handleSubmit}>
      <h2>{initial?.id ? "Edit client" : "New client"}</h2>
      <div className="form-row-2">
        <div className="form-group">
          <label>Name</label>
          <input value={form.name} onChange={(e) => set("name", e.target.value)} autoFocus required />
        </div>
        <div className="form-group">
          <label>City</label>
          <select value={form.city} onChange={(e) => set("city", e.target.value)}>
            {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <div className="form-row-2">
        <div className="form-group">
          <label>Phone</label>
          <input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+91 …" />
        </div>
        <div className="form-group">
          <label>Email</label>
          <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
        </div>
      </div>
      <div className="form-group">
        <label>Address</label>
        <input value={form.address} onChange={(e) => set("address", e.target.value)} />
      </div>
      <div className="form-group">
        <label>Notes</label>
        <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} />
      </div>
      {error && <p className="form-error">{error}</p>}
      <div className="admin-modal-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary">{initial?.id ? "Save changes" : "Add client"}</button>
      </div>
    </form>
  );
}

export default function AdminClients() {
  usePageMeta("Clients — Admin", "Admin panel.", { noindex: true });
  const [clients, setClients] = useState(() => getClients());
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState(null); // null | {} | client
  const invoiceCounts = useMemo(() => {
    const counts = {};
    getInvoices().forEach((inv) => { counts[inv.clientId] = (counts[inv.clientId] || 0) + 1; });
    return counts;
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) => [c.name, c.phone, c.email, c.city].some((v) => (v || "").toLowerCase().includes(q)));
  }, [clients, query]);

  function refresh() {
    setClients(getClients());
  }

  function handleSave(form) {
    saveClient(form);
    refresh();
    setEditing(null);
  }

  function handleDelete(client) {
    const count = invoiceCounts[client.id] || 0;
    const msg = count > 0
      ? `Delete ${client.name}? They have ${count} invoice(s) on file — those invoices will be kept, but will no longer be linked to a client record.`
      : `Delete ${client.name}? This can't be undone.`;
    if (!window.confirm(msg)) return;
    deleteClient(client.id);
    refresh();
  }

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <h1>Clients</h1>
        <button type="button" className="btn btn-primary" onClick={() => setEditing({})}>+ New Client</button>
      </header>

      <input
        className="admin-search"
        placeholder="Search by name, phone, email or city…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {filtered.length === 0 ? (
        <p className="admin-empty">{clients.length === 0 ? "No clients yet — add your first one above." : "No clients match your search."}</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr><th>Name</th><th>Phone</th><th>Email</th><th>City</th><th>Invoices</th><th></th></tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td>{c.phone || "—"}</td>
                <td>{c.email || "—"}</td>
                <td>{c.city || "—"}</td>
                <td>{invoiceCounts[c.id] || 0}</td>
                <td className="admin-row-actions">
                  <button type="button" className="btn btn-line btn-sm" onClick={() => setEditing(c)}>Edit</button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => handleDelete(c)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {editing && (
        <div className="admin-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setEditing(null); }}>
          <ClientForm initial={editing.id ? editing : null} onSave={handleSave} onCancel={() => setEditing(null)} />
        </div>
      )}
    </div>
  );
}
