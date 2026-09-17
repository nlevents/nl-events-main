import { useRef, useState } from "react";
import { getSettings, saveSettings, exportAllData, importAllData } from "../../lib/adminStore";
import { exportFullCatalogData } from "../../lib/catalogStore";
import { downloadXlsx } from "../../lib/excelExport";
import { useAdminAuth } from "../../context/AdminAuthContext";
import usePageMeta from "../../hooks/usePageMeta";

export default function AdminSettings() {
  usePageMeta("Settings — Admin", "Admin panel.", { noindex: true });
  const auth = useAdminAuth();
  const [settings, setSettings] = useState(() => getSettings());
  const [savedMsg, setSavedMsg] = useState("");
  const [importMsg, setImportMsg] = useState("");
  const fileInputRef = useRef(null);

  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [pwMsg, setPwMsg] = useState("");

  function set(field, value) {
    setSettings((s) => ({ ...s, [field]: value }));
  }

  function handleSave(e) {
    e.preventDefault();
    saveSettings(settings);
    setSavedMsg("Saved.");
    setTimeout(() => setSavedMsg(""), 2000);
  }

  function handleExport() {
    const json = exportAllData();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "nle-admin-backup-" + new Date().toISOString().slice(0, 10) + ".json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }


  function handleExcelExport() {
    const catalog = JSON.parse(exportFullCatalogData());
    const admin = { clients: adminClients(), invoices: adminInvoices(), settings: getSettings() };
    downloadXlsx(
      "nle-full-data-backup-" + new Date().toISOString().slice(0, 10) + ".xlsx",
      {
        Products: catalog.products || [],
        Categories: flattenCategories(catalog.occasions || []),
        Media: catalog.media || [],
        Gallery: catalog.gallery || [],
        "YouTube Shorts": catalog.instaVideos || [],
        "Video Reviews": catalog.videoReviews || [],
        Coupons: catalog.coupons || [],
        Inquiries: catalog.inquiries || [],
        Blackouts: catalog.blackouts || [],
        Cities: catalog.cities || [],
        "Event Add-ons": catalog.addons || [],
        Clients: admin.clients,
        Invoices: admin.invoices,
        Settings: [admin.settings],
      }
    );
    setSavedMsg("Excel backup downloaded.");
    setTimeout(() => setSavedMsg(""), 2500);
  }

  function adminClients() {
    try { return JSON.parse(localStorage.getItem("nle-admin-clients") || "[]"); } catch { return []; }
  }
  function adminInvoices() {
    try { return JSON.parse(localStorage.getItem("nle-admin-invoices") || "[]"); } catch { return []; }
  }
  function flattenCategories(occasions) {
    const rows = [];
    function walk(nodes, path, occasion) {
      (nodes || []).forEach((n) => {
        if (!n || n.type === "product") return;
        const next = [...path, n.label || n.slug];
        rows.push({ occasion, level: next.length, path: next.join(" › "), slug: n.slug, label: n.label || "", description: n.description || "" });
        walk(n.children, next, occasion);
      });
    }
    (occasions || []).forEach((o) => walk(o.children, [o.label || o.slug], o.label || o.slug));
    return rows;
  }

  function handleImportFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        importAllData(reader.result);
        setImportMsg("Backup imported successfully.");
        setSettings(getSettings());
      } catch {
        setImportMsg("That file couldn't be read as a valid backup.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    setPwMsg("");
    if (newPw.length < 6) return setPwMsg("New password must be at least 6 characters.");
    const ok = await auth.changePassword(oldPw, newPw);
    setPwMsg(ok ? "Password changed." : "Current password is incorrect.");
    if (ok) { setOldPw(""); setNewPw(""); }
  }

  return (
    <div className="admin-page">
      <header className="admin-page-head"><h1>Settings</h1></header>

      <form className="admin-panel" onSubmit={handleSave}>
        <h2>Business details (shown on invoices)</h2>
        <div className="form-row-2">
          <div className="form-group"><label>Business name</label><input value={settings.businessName} onChange={(e) => set("businessName", e.target.value)} /></div>
          <div className="form-group"><label>Phone</label><input value={settings.phone} onChange={(e) => set("phone", e.target.value)} /></div>
        </div>
        <div className="form-row-2">
          <div className="form-group"><label>Email</label><input value={settings.email} onChange={(e) => set("email", e.target.value)} /></div>
          <div className="form-group"><label>GSTIN (optional)</label><input value={settings.gstin} onChange={(e) => set("gstin", e.target.value)} placeholder="Leave blank if not registered" /></div>
        </div>
        <div className="form-group"><label>Address</label><input value={settings.address} onChange={(e) => set("address", e.target.value)} /></div>

        <h2 style={{ marginTop: 28 }}>Invoice defaults</h2>
        <div className="form-row-2">
          <div className="form-group"><label>Invoice number prefix</label><input value={settings.invoicePrefix} onChange={(e) => set("invoicePrefix", e.target.value)} /></div>
          <div className="form-group"><label>Default tax rate (%)</label><input type="number" min="0" step="0.1" value={settings.defaultTaxRate} onChange={(e) => set("defaultTaxRate", Number(e.target.value))} /></div>
        </div>
        <div className="form-row-2">
          <div className="form-group"><label>UPI ID (optional)</label><input value={settings.upiId} onChange={(e) => set("upiId", e.target.value)} /></div>
          <div className="form-group"><label>Bank details (optional)</label><input value={settings.bankDetails} onChange={(e) => set("bankDetails", e.target.value)} placeholder="Account name, number, IFSC" /></div>
        </div>
        <div className="form-group"><label>Default invoice note</label><textarea value={settings.invoiceNotes} onChange={(e) => set("invoiceNotes", e.target.value)} /></div>

        <div className="admin-modal-actions" style={{ justifyContent: "flex-start" }}>
          <button type="submit" className="btn btn-primary">Save settings</button>
          {savedMsg && <span className="admin-hint">{savedMsg}</span>}
        </div>
      </form>

      <section className="admin-panel">
        <h2>Data backup</h2>
        <p className="admin-hint">
          Download a complete Excel backup of your catalog, categories, products, media, cities, add-ons, videos, enquiries, clients, invoices, and settings. Keep a copy somewhere safe for your records.
        </p>
        <div className="admin-modal-actions" style={{ justifyContent: "flex-start", gap: 12 }}>
          <button type="button" className="btn btn-primary" onClick={handleExcelExport}>Download full Excel (.xlsx)</button>
          <button type="button" className="btn btn-line" onClick={handleExport}>Export backup (.json)</button>
          <button type="button" className="btn btn-line" onClick={() => fileInputRef.current?.click()}>Import backup…</button>
          <input ref={fileInputRef} type="file" accept="application/json" style={{ display: "none" }} onChange={handleImportFile} />
        </div>
        {importMsg && <p className="admin-hint">{importMsg}</p>}
      </section>

      <form className="admin-panel" onSubmit={handleChangePassword}>
        <h2>Change admin password</h2>
        <div className="form-row-2">
          <div className="form-group"><label>Current password</label><input type="password" value={oldPw} onChange={(e) => setOldPw(e.target.value)} /></div>
          <div className="form-group"><label>New password</label><input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} /></div>
        </div>
        {pwMsg && <p className="admin-hint">{pwMsg}</p>}
        <button type="submit" className="btn btn-line">Change password</button>
      </form>
    </div>
  );
}
