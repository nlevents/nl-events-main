import { useEffect, useState } from "react";
import Icon from "../../components/Icon";
import usePageMeta from "../../hooks/usePageMeta";
import {
  getBirthdayAgeCategories,
  saveBirthdayAgeCategoriesToCloud,
  uploadMediaFile,
} from "../../lib/catalogStore";

function emptyCard() {
  return {
    id: "",
    title: "",
    subtitle: "",
    image: "",
    href: "/occasion/birthday",
    active: true,
  };
}

export default function AdminBirthdayAgeCategories() {
  usePageMeta("Birthday Celebrations — Admin", "Manage the Birthday Celebrations for Every Age section.", { noindex: true });
  const [items, setItems] = useState(getBirthdayAgeCategories);
  const [editing, setEditing] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function refresh() {
    setItems(getBirthdayAgeCategories());
  }

  useEffect(() => {
    const onUpdate = () => refresh();
    window.addEventListener("nle-catalog-updated", onUpdate);
    return () => window.removeEventListener("nle-catalog-updated", onUpdate);
  }, []);

  function flash(message) {
    setFeedback(message);
    window.setTimeout(() => setFeedback(""), 3000);
  }

  function openAdd() {
    setError("");
    setEditing(emptyCard());
  }

  function openEdit(item) {
    setError("");
    setEditing({ ...item });
  }

  async function save() {
    setError("");
    if (!editing?.title?.trim()) return setError("Card title is required.");
    if (!editing?.subtitle?.trim()) return setError("Card subtitle is required.");
    if (!editing?.image?.trim()) return setError("Card image is required.");
    if (!editing?.href?.trim()) return setError("Card link is required.");

    const next = [...items];
    const index = next.findIndex((item) => item.id === editing.id);
    if (index >= 0) next[index] = { ...next[index], ...editing };
    else next.push({ ...editing, id: `birthday-card-${Date.now().toString(36)}` });

    setBusy(true);
    try {
      await saveBirthdayAgeCategoriesToCloud(next);
      refresh();
      setEditing(null);
      flash("Birthday age card saved successfully.");
    } catch (err) {
      setError(err.message || "Unable to save the birthday age card.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(item) {
    if (!window.confirm(`Delete "${item.title}" from Birthday Celebrations for Every Age?`)) return;
    setBusy(true);
    try {
      await saveBirthdayAgeCategoriesToCloud(items.filter((entry) => entry.id !== item.id));
      refresh();
      flash(`Deleted "${item.title}".`);
    } catch (err) {
      setError(err.message || "Unable to delete the card.");
    } finally {
      setBusy(false);
    }
  }

  async function toggle(item) {
    setBusy(true);
    try {
      await saveBirthdayAgeCategoriesToCloud(items.map((entry) => entry.id === item.id ? { ...entry, active: !entry.active } : entry));
      refresh();
    } catch (err) {
      setError(err.message || "Unable to update card status.");
    } finally {
      setBusy(false);
    }
  }

  async function move(item, direction) {
    const index = items.findIndex((entry) => entry.id === item.id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    setBusy(true);
    try {
      await saveBirthdayAgeCategoriesToCloud(next);
      refresh();
    } catch (err) {
      setError(err.message || "Unable to reorder the cards.");
    } finally {
      setBusy(false);
    }
  }

  async function uploadImage(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const saved = await uploadMediaFile(file, file.name);
      setEditing((current) => ({ ...current, image: saved.url }));
    } catch (err) {
      setError(err.message || "Unable to upload image.");
    } finally {
      setBusy(false);
      event.target.value = "";
    }
  }

  return (
    <div className="admin-page birthday-age-admin-page">
      <div className="admin-page-head">
        <div>
          <div className="catalog-breadcrumb">Dashboard <span>›</span> Catalog <span>›</span> Birthday</div>
          <h1>Birthday Celebrations for Every Age</h1>
          <p className="admin-hint">Manage only the cards shown in the Birthday page's age/category strip. Changes here do not modify other birthday sections.</p>
        </div>
        <div className="admin-head-actions">
          <button type="button" className="btn btn-primary" onClick={openAdd} disabled={busy}><Icon name="plus" /> Add Card</button>
        </div>
      </div>

      {feedback && <div className="admin-alert admin-alert--success">{feedback}</div>}
      {error && <div className="admin-alert admin-alert--error">{error}</div>}

      <div className="admin-panel">
        <div className="admin-panel-head">
          <div>
            <h2>Age & Celebration Cards</h2>
            <p className="admin-hint">Reorder, edit, hide/show, or delete cards. The public page follows this order.</p>
          </div>
          <strong>{items.length} cards</strong>
        </div>

        <div className="birthday-age-admin-list">
          {items.map((item, index) => (
            <article className={`birthday-age-admin-item ${item.active ? "" : "is-inactive"}`} key={item.id}>
              <img src={item.image} alt="" className="birthday-age-admin-thumb" />
              <div className="birthday-age-admin-copy">
                <strong>{item.title}</strong>
                <span>{item.subtitle}</span>
                <code>{item.href}</code>
              </div>
              <div className="birthday-age-admin-actions">
                <button type="button" className="btn-icon" title="Move up" onClick={() => move(item, -1)} disabled={busy || index === 0}>↑</button>
                <button type="button" className="btn-icon" title="Move down" onClick={() => move(item, 1)} disabled={busy || index === items.length - 1}>↓</button>
                <button type="button" className="btn btn-sm btn-outline" onClick={() => toggle(item)} disabled={busy}>{item.active ? "Hide" : "Show"}</button>
                <button type="button" className="btn-icon" title="Edit" onClick={() => openEdit(item)} disabled={busy}><Icon name="edit" /></button>
                <button type="button" className="btn-icon btn-icon-danger" title="Delete" onClick={() => remove(item)} disabled={busy}><Icon name="trash" /></button>
              </div>
            </article>
          ))}
          {!items.length && <div className="admin-empty">No birthday age cards. Add the first card to restore this section.</div>}
        </div>
      </div>

      {editing && (
        <div className="admin-modal-backdrop" onMouseDown={() => !busy && setEditing(null)}>
          <div className="admin-modal-card birthday-age-admin-modal" onMouseDown={(event) => event.stopPropagation()}>
            <h2>{editing.id ? "Edit Birthday Age Card" : "Add Birthday Age Card"}</h2>
            <div className="admin-form-group">
              <label className="admin-form-label">Title</label>
              <input className="admin-input" value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} placeholder="e.g. Kids Birthday" />
            </div>
            <div className="admin-form-row">
              <div className="admin-form-group">
                <label className="admin-form-label">Subtitle</label>
                <input className="admin-input" value={editing.subtitle} onChange={(e) => setEditing({ ...editing, subtitle: e.target.value })} placeholder="e.g. Age 1–12" />
              </div>
              <div className="admin-form-group">
                <label className="admin-form-label">Status</label>
                <select className="admin-select" value={editing.active ? "active" : "hidden"} onChange={(e) => setEditing({ ...editing, active: e.target.value === "active" })}>
                  <option value="active">Visible</option>
                  <option value="hidden">Hidden</option>
                </select>
              </div>
            </div>
            <div className="admin-form-group">
              <label className="admin-form-label">Link</label>
              <input className="admin-input" value={editing.href} onChange={(e) => setEditing({ ...editing, href: e.target.value })} placeholder="/occasion/birthday/..." />
            </div>
            <div className="admin-form-group">
              <label className="admin-form-label">Image</label>
              <div className="birthday-age-admin-image-field">
                <div className="birthday-age-admin-preview">{editing.image ? <img src={editing.image} alt="Preview" /> : <Icon name="image" />}</div>
                <div>
                  <input className="admin-input" value={editing.image} onChange={(e) => setEditing({ ...editing, image: e.target.value })} placeholder="Image URL" />
                  <label className="btn btn-sm btn-outline" style={{ marginTop: 8 }}>
                    <Icon name="upload" /> Upload Image
                    <input hidden type="file" accept="image/*" onChange={uploadImage} disabled={busy} />
                  </label>
                </div>
              </div>
            </div>
            <div className="admin-modal-actions">
              <button type="button" className="btn btn-outline" onClick={() => setEditing(null)} disabled={busy}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save Card"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
