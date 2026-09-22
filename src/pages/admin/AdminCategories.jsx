import { useEffect, useMemo, useState } from "react";
import {
  getOccasions,
  saveOccasion,
  deleteOccasion,
  saveCategory,
  deleteCategory,
  getProducts,
  PUBLIC_TOP_LEVEL_OCCASIONS,
} from "../../lib/catalogStore";
import { sanitizeSlug } from "../../lib/sanitize";
import MediaPickerModal from "../../components/admin/MediaPickerModal";
import Icon from "../../components/Icon";
import usePageMeta from "../../hooks/usePageMeta";

function countProducts(node) {
  if (!node) return 0;
  return (node.products || []).length + (node.children || []).reduce((n, child) => n + countProducts(child), 0);
}

function flattenNodes(children, trail = []) {
  const result = [];
  (children || []).forEach((node) => {
    const nextTrail = [...trail, node];
    result.push({ node, trail: nextTrail });
    result.push(...flattenNodes(node.children, nextTrail));
  });
  return result;
}

export default function AdminCategories() {
  usePageMeta("Occasions & Categories — Admin", "Manage an unlimited nested occasion and category hierarchy.");

  const [occasions, setOccasions] = useState(() => getOccasions().filter((o) => PUBLIC_TOP_LEVEL_OCCASIONS.has(o.slug)));
  const [products] = useState(getProducts);
  const [editingOccasion, setEditingOccasion] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [pickerField, setPickerField] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState({});

  function refresh() {
    setOccasions(getOccasions());
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

  function openAddCategory(occasionSlug, parentTrail = [], image = "") {
    setEditingCategory({
      occasionSlug,
      parentCategorySlug: parentTrail.length ? parentTrail[parentTrail.length - 1].slug : null,
      parentCategoryId: parentTrail.length ? parentTrail[parentTrail.length - 1].id : null,
      parentLabel: parentTrail.length ? parentTrail.map((n) => n.label).join(" › ") : "Top level",
      cat: {
        label: "",
        slug: "",
        description: "",
        image: image || "/assets/images/categories/wedding.webp",
        type: "category",
        children: [],
      },
    });
  }

  function openEditCategory(occasionSlug, trail) {
    const node = trail[trail.length - 1];
    const parent = trail.length > 1 ? trail[trail.length - 2] : null;
    setEditingCategory({
      occasionSlug,
      parentCategorySlug: parent?.slug || null,
      parentCategoryId: parent?.id || null,
      parentLabel: parent ? trail.slice(0, -1).map((n) => n.label).join(" › ") : "Top level",
      cat: { ...node },
    });
  }

  function handleSaveOccasion(e) {
    e.preventDefault();
    setError("");
    if (!editingOccasion?.label?.trim()) return setError("Occasion title is required.");
    try {
      saveOccasion({ ...editingOccasion, slug: sanitizeSlug(editingOccasion.slug || editingOccasion.label) });
      refresh();
      setEditingOccasion(null);
      flash(`Saved occasion "${editingOccasion.label}".`);
    } catch (err) {
      setError(err.message || "Failed to save occasion.");
    }
  }

  function handleSaveCategory(e) {
    e.preventDefault();
    setError("");
    const cat = editingCategory?.cat;
    if (!cat?.label?.trim()) return setError("Category label is required.");
    try {
      saveCategory(editingCategory.occasionSlug, {
        ...cat,
        slug: sanitizeSlug(cat.slug || cat.label),
        parentCategorySlug: editingCategory.parentCategorySlug || null,
        parentCategoryId: editingCategory.parentCategoryId || null,
      });
      refresh();
      setEditingCategory(null);
      flash(`Saved category "${cat.label}".`);
    } catch (err) {
      setError(err.message || "Failed to save category.");
    }
  }

  function handleDeleteCategory(occasionSlug, trail) {
    const node = trail[trail.length - 1];
    const parent = trail.length > 1 ? trail[trail.length - 2] : null;
    if (!window.confirm(`Delete "${node.label}" and everything nested under it? This cannot be undone.`)) return;
    deleteCategory(occasionSlug, node.slug, parent?.slug || null, node.id || null, parent?.id || null);
    refresh();
    flash(`Deleted "${node.label}".`);
  }

  const cityProductCount = useMemo(() => products.filter((p) => !p.isAddon && p.occasionSlug !== "event-services").length, [products]);

  function renderTree(children, occasionSlug, parentTrail = [], depth = 0) {
    return (children || []).map((node) => {
      const trail = [...parentTrail, node];
      const key = `${occasionSlug}/${trail.map((n) => n.slug).join("/")}`;
      const isOpen = expanded[key] !== false;
      const directProducts = (node.products || []).length;
      const nestedCount = countProducts(node);
      const hasChildren = Array.isArray(node.children) && node.children.length > 0;
      return (
        <div key={key} className="admin-nested-node" style={{ marginLeft: depth * 22 }}>
          <div className="admin-subcategory-item" style={{ borderLeft: depth ? "2px solid var(--border-soft)" : undefined }}>
            <img src={node.image} alt={node.label} className="admin-sub-thumb" />
            <div className="admin-sub-info" style={{ flex: 1 }}>
              <strong>{node.label}</strong>
              <span className="admin-table-sub">
                <code>{trail.map((n) => n.slug).join(" / ")}</code> &bull; {directProducts} direct products &bull; {nestedCount} total
              </span>
            </div>
            <div className="admin-row-actions">
              {hasChildren && (
                <button type="button" className="btn-icon" title={isOpen ? "Collapse" : "Expand"} onClick={() => setExpanded((p) => ({ ...p, [key]: !isOpen }))}>
                  <span style={{ fontSize: 18 }}>{isOpen ? "−" : "+"}</span>
                </button>
              )}
              <button type="button" className="btn btn-sm btn-outline" onClick={() => openAddCategory(occasionSlug, trail, node.image)}>
                <Icon name="plus" /> Add child
              </button>
              <button type="button" className="btn-icon" title="Edit" onClick={() => openEditCategory(occasionSlug, trail)}><Icon name="edit" /></button>
              <a href={`/occasion/${occasionSlug}/${trail.map((n) => n.slug).join("/")}`} target="_blank" rel="noreferrer" className="btn-icon" title="View"><Icon name="eye" /></a>
              <button type="button" className="btn-icon btn-icon-danger" title="Delete" onClick={() => handleDeleteCategory(occasionSlug, trail)}><Icon name="trash" /></button>
            </div>
          </div>
          {isOpen && hasChildren && renderTree(node.children, occasionSlug, trail, depth + 1)}
        </div>
      );
    });
  }

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <div>
          <h1>Occasions & Categories</h1>
          <p className="admin-hint">Build the same nested structure as the reference site. Categories are navigation nodes; only products are sellable.</p>
          <p className="admin-hint"><strong>{cityProductCount}</strong> live products currently exist. You can create as many hierarchy levels as needed.</p>
        </div>
        <div className="admin-head-actions">
          <span className="admin-hint">6 public occasion families • unlimited nested subcategories</span>
        </div>
      </div>

      {feedback && <div className="admin-alert admin-alert--success">{feedback}</div>}
      {error && <div className="admin-alert admin-alert--error">{error}</div>}

      <div className="admin-categories-tree">
        {occasions.filter((o) => !o.addonOnly && PUBLIC_TOP_LEVEL_OCCASIONS.has(o.slug)).map((occ) => (
          <div key={occ.slug} className="admin-panel admin-tree-node">
            <div className="admin-tree-head">
              <div className="admin-tree-info">
                <img src={occ.image} alt={occ.label} className="admin-tree-thumb" />
                <div>
                  <h3>{occ.label}</h3>
                  <div className="admin-table-sub"><code>/occasion/{occ.slug}</code> &bull; {occ.children?.length || 0} top-level categories &bull; <strong>{countProducts(occ)}</strong> products below</div>
                </div>
              </div>
              <div className="admin-row-actions">
                <button type="button" className="btn btn-sm btn-outline" onClick={() => openAddCategory(occ.slug, [], occ.image)}><Icon name="plus" /> Add category</button>
                <button type="button" className="btn-icon" title="Edit occasion" onClick={() => setEditingOccasion({ ...occ })}><Icon name="edit" /></button>
                <a href={`/occasion/${occ.slug}`} target="_blank" rel="noreferrer" className="btn-icon" title="View"><Icon name="eye" /></a>
                <button type="button" className="btn-icon btn-icon-danger" title="Delete occasion" onClick={() => { if (window.confirm(`Delete "${occ.label}" and all nested categories?`)) { deleteOccasion(occ.slug); refresh(); } }}><Icon name="trash" /></button>
              </div>
            </div>
            <div className="admin-subcategory-list">
              {renderTree(occ.children, occ.slug)}
              {(!occ.children || occ.children.length === 0) && <p className="admin-hint" style={{ padding: "14px 0" }}>No categories yet. Use “Add category” to create one.</p>}
            </div>
          </div>
        ))}
      </div>

      {editingOccasion && (
        <div className="admin-modal-backdrop" onClick={() => setEditingOccasion(null)}>
          <div className="admin-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header"><h2>{editingOccasion.id ? `Edit ${editingOccasion.label}` : "New Occasion"}</h2><button type="button" className="btn-icon" onClick={() => setEditingOccasion(null)}><Icon name="close" /></button></div>
            <form onSubmit={handleSaveOccasion}>
              <div className="admin-form-group"><label className="admin-form-label">Occasion Title *</label><input className="admin-input" value={editingOccasion.label || ""} onChange={(e) => setEditingOccasion({ ...editingOccasion, label: e.target.value, slug: sanitizeSlug(e.target.value) })} required /></div>
              <div className="admin-form-group"><label className="admin-form-label">Slug *</label><input className="admin-input" value={sanitizeSlug(editingOccasion.label || "")} readOnly required /><small className="admin-form-help">Generated automatically from the occasion name.</small></div>
              <div className="admin-form-group"><label className="admin-form-label">Tagline</label><input className="admin-input" value={editingOccasion.tagline || ""} onChange={(e) => setEditingOccasion({ ...editingOccasion, tagline: e.target.value })} /></div>
              <div className="admin-form-group"><label className="admin-form-label">Description</label><textarea className="admin-textarea" rows="3" value={editingOccasion.description || ""} onChange={(e) => setEditingOccasion({ ...editingOccasion, description: e.target.value })} /></div>
              <div className="admin-form-group"><label className="admin-form-label">Image URL</label><div style={{ display: "flex", gap: 8 }}><input className="admin-input" value={editingOccasion.image || ""} onChange={(e) => setEditingOccasion({ ...editingOccasion, image: e.target.value })} /><button type="button" className="btn btn-sm btn-outline" onClick={() => setPickerField("occ-image")}>Choose</button></div></div>
              <div className="admin-form-group"><label className="admin-form-label">Hero Image URL</label><div style={{ display: "flex", gap: 8 }}><input className="admin-input" value={editingOccasion.heroImg || ""} onChange={(e) => setEditingOccasion({ ...editingOccasion, heroImg: e.target.value })} /><button type="button" className="btn btn-sm btn-outline" onClick={() => setPickerField("occ-hero")}>Choose</button></div></div>
              <div className="admin-modal-footer"><button type="button" className="btn btn-outline" onClick={() => setEditingOccasion(null)}>Cancel</button><button className="btn btn-primary">Save Occasion</button></div>
            </form>
          </div>
        </div>
      )}

      {editingCategory && (
        <div className="admin-modal-backdrop" onClick={() => setEditingCategory(null)}>
          <div className="admin-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header"><h2>{editingCategory.cat.id ? `Edit ${editingCategory.cat.label}` : "Add Category / Theme"}</h2><button type="button" className="btn-icon" onClick={() => setEditingCategory(null)}><Icon name="close" /></button></div>
            <form onSubmit={handleSaveCategory}>
              <div className="admin-form-group"><label className="admin-form-label">Parent</label><div className="admin-calc-box"><strong>{editingCategory.parentLabel}</strong></div></div>
              <div className="admin-form-group"><label className="admin-form-label">Category / Theme Name *</label><input className="admin-input" value={editingCategory.cat.label || ""} onChange={(e) => setEditingCategory((p) => ({ ...p, cat: { ...p.cat, label: e.target.value, slug: sanitizeSlug(e.target.value) } }))} required /></div>
              <div className="admin-form-group"><label className="admin-form-label">Slug *</label><input className="admin-input" value={sanitizeSlug(editingCategory.cat.label || "")} readOnly required /><small className="admin-form-help">Generated automatically from the category name.</small></div>
              <div className="admin-form-group"><label className="admin-form-label">Node Type</label><select className="admin-select" value={editingCategory.cat.type || "category"} onChange={(e) => setEditingCategory((p) => ({ ...p, cat: { ...p.cat, type: e.target.value } }))}><option value="category">Category</option><option value="theme">Theme</option></select></div>
              <div className="admin-form-group"><label className="admin-form-label">Description</label><textarea className="admin-textarea" rows="3" value={editingCategory.cat.description || ""} onChange={(e) => setEditingCategory((p) => ({ ...p, cat: { ...p.cat, description: e.target.value } }))} /></div>
              <div className="admin-form-group"><label className="admin-form-label">Image URL</label><div style={{ display: "flex", gap: 8 }}><input className="admin-input" value={editingCategory.cat.image || ""} onChange={(e) => setEditingCategory((p) => ({ ...p, cat: { ...p.cat, image: e.target.value } }))} /><button type="button" className="btn btn-sm btn-outline" onClick={() => setPickerField("cat-image")}>Choose</button></div></div>
              <div className="admin-modal-footer"><button type="button" className="btn btn-outline" onClick={() => setEditingCategory(null)}>Cancel</button><button className="btn btn-primary">Save Category</button></div>
            </form>
          </div>
        </div>
      )}

      <MediaPickerModal isOpen={Boolean(pickerField)} onClose={() => setPickerField(null)} onSelect={(url) => {
        if (pickerField === "occ-image" && editingOccasion) setEditingOccasion((p) => ({ ...p, image: url }));
        if (pickerField === "occ-hero" && editingOccasion) setEditingOccasion((p) => ({ ...p, heroImg: url }));
        if (pickerField === "cat-image" && editingCategory) setEditingCategory((p) => ({ ...p, cat: { ...p.cat, image: url } }));
        setPickerField(null);
      }} />
    </div>
  );
}
