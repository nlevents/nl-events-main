import { useRef, useState } from "react";
import { getSettings, saveSettings, exportAllData, importAllData } from "../../lib/adminStore";
import { exportFullCatalogData } from "../../lib/catalogStore";
import { useAdminAuth } from "../../context/AdminAuthContext";
import usePageMeta from "../../hooks/usePageMeta";

export default function AdminSettings() {
  usePageMeta("Settings — Admin", "Admin panel.", { noindex: true });
  const auth = useAdminAuth();
  const [settings, setSettings] = useState(() => getSettings());
  const [savedMsg, setSavedMsg] = useState("");
  const [importMsg, setImportMsg] = useState("");
  const [backupMsg, setBackupMsg] = useState("");
  const [backupBusy, setBackupBusy] = useState(false);
  const [includeMedia, setIncludeMedia] = useState(true);
  const fullBackupInputRef = useRef(null);
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


  async function handleFullBackup() {
    setBackupBusy(true);
    setBackupMsg("Preparing a complete backup…");
    try {
      const { createCompleteBackup } = await import("../../lib/backupService");
      const backup = await createCompleteBackup({ includeMedia });
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `nle-complete-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.nlebackup.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      const embedded = (backup.mediaAssets || []).filter((item) => item.status === "embedded").length;
      setBackupMsg(`Complete backup downloaded. ${embedded} media files were embedded.`);
    } catch (error) {
      setBackupMsg(error?.message || "Backup could not be created.");
    } finally {
      setBackupBusy(false);
    }
  }

  function handleFullRestoreFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const data = JSON.parse(reader.result);
        const ok = window.confirm("Restore this backup into the current admin data? Existing matching records will be replaced by the backup data. Make sure you have a current backup first.");
        if (!ok) return;
        setBackupBusy(true);
        setBackupMsg("Restoring backup…");
        const { restoreCompleteBackup } = await import("../../lib/backupService");
        await restoreCompleteBackup(data, { syncCloud: true });
        setBackupMsg("Backup restored successfully. Reload the admin panel to refresh every screen.");
      } catch (error) {
        setBackupMsg(error?.message || "This backup could not be restored.");
      } finally {
        setBackupBusy(false);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  function handleExcelExport() {
    const catalog = JSON.parse(exportFullCatalogData());
    const admin = { clients: adminClients(), invoices: adminInvoices(), settings: getSettings() };
    import("../../lib/excelExport").then(({ downloadXlsx }) => downloadXlsx(
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
        "Event Services": catalog.addons || [],
        Clients: admin.clients,
        Invoices: admin.invoices,
        Settings: [admin.settings],
      }
    ));
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
        <div className="form-row-2"><div className="form-group"><label>Quotation / Invoice logo URL</label><input value={settings.logoUrl || ""} onChange={(e) => set("logoUrl", e.target.value)} placeholder="/assets/images/landing/nle-logo.png" /><p className="admin-hint">This logo is printed on both quotations and invoices. You can use the built-in logo or a hosted image URL.</p></div><div className="form-group"><label>Logo preview</label>{settings.logoUrl ? <img src={settings.logoUrl} alt="Logo preview" style={{ maxHeight: 64, maxWidth: 220, objectFit: "contain", border: "1px solid var(--border-soft)", padding: 8, background: "#fff" }} /> : <p className="admin-hint">No logo configured.</p>}</div></div>

        <h2 style={{ marginTop: 28 }}>Invoice defaults</h2>
        <div className="form-row-2">
          <div className="form-group"><label>Invoice number prefix</label><input value={settings.invoicePrefix} onChange={(e) => set("invoicePrefix", e.target.value)} /></div>
          <div className="form-group"><label>Default tax rate (%)</label><input type="number" min="0" step="0.1" value={settings.defaultTaxRate} onChange={(e) => set("defaultTaxRate", Number(e.target.value))} /></div>
        </div>
        <div className="form-row-2">
          <div className="form-group"><label>UPI ID (optional)</label><input value={settings.upiId} onChange={(e) => set("upiId", e.target.value)} /></div>
          <div className="form-group"><label>Bank details (optional)</label><input value={settings.bankDetails} onChange={(e) => set("bankDetails", e.target.value)} placeholder="Account name, number, IFSC" /></div>
        </div>
        <div className="form-group"><label>Default invoice / quotation note</label><textarea value={settings.invoiceNotes} onChange={(e) => set("invoiceNotes", e.target.value)} /></div>
        <div className="form-group"><label>Default terms and conditions</label><textarea rows="6" value={settings.defaultTerms || ""} onChange={(e) => set("defaultTerms", e.target.value)} placeholder="These terms will be pre-filled on new quotations and invoices." /></div>

        <div className="admin-modal-actions" style={{ justifyContent: "flex-start" }}>
          <button type="submit" className="btn btn-primary">Save settings</button>
          {savedMsg && <span className="admin-hint">{savedMsg}</span>}
        </div>
      </form>

      <section className="admin-panel">
        <h2>Complete backup & restore</h2>
        <p className="admin-hint">
          Create a portable backup of leads, bookings, clients, quotations, invoices, payments, products, packages, services, categories, nested category structure, media metadata, links, page hierarchy, navigation, settings, and the current local/cloud catalog state.
        </p>
        <label className="admin-backup-option">
          <input type="checkbox" checked={includeMedia} onChange={(e) => setIncludeMedia(e.target.checked)} />
          <span>Include downloadable image/video files when they are accessible</span>
        </label>
        <div className="admin-modal-actions" style={{ justifyContent: "flex-start", gap: 12, flexWrap: "wrap" }}>
          <button type="button" className="btn btn-primary" onClick={handleFullBackup} disabled={backupBusy}>{backupBusy ? "Working…" : "Create complete backup"}</button>
          <button type="button" className="btn btn-line" onClick={() => fullBackupInputRef.current?.click()} disabled={backupBusy}>Restore complete backup…</button>
          <button type="button" className="btn btn-line" onClick={handleExcelExport}>Download Excel backup</button>
          <button type="button" className="btn btn-line" onClick={handleExport}>Export data JSON</button>
          <input ref={fullBackupInputRef} type="file" accept="application/json,.nlebackup" style={{ display: "none" }} onChange={handleFullRestoreFile} />
          <input ref={fileInputRef} type="file" accept="application/json" style={{ display: "none" }} onChange={handleImportFile} />
        </div>
        {backupMsg && <p className="admin-hint">{backupMsg}</p>}
        {importMsg && <p className="admin-hint">{importMsg}</p>}
        <div className="admin-backup-grid">
          <div><strong>Business data</strong><span>Leads · bookings · clients · quotations · invoices · payments · write-offs</span></div>
          <div><strong>Catalog</strong><span>Products · packages · services · categories · nested hierarchy · pricing</span></div>
          <div><strong>Media</strong><span>Gallery · banners · videos · thumbnails · image URLs · embedded files when accessible</span></div>
          <div><strong>Site structure</strong><span>Occasions · navigation · page hierarchy · category navigation · search index</span></div>
        </div>
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
