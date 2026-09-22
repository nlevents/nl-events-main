import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  getAddons,
  saveAddon,
  deleteAddon,
  duplicateAddon,
  getOccasions,
  getAddonCategoryOptions,
  getAddonCategoryTree,
  getAddonProducts,
  saveCategory,
  deleteCategory,
} from "../../lib/catalogStore";
import { fmtINR } from "../../lib/pricing";
import { sanitizeSlug } from "../../lib/sanitize";
import Icon from "../../components/Icon";
import usePageMeta from "../../hooks/usePageMeta";

const ICON_OPTIONS = ["sparkle", "user", "image", "package", "tag", "star", "compass", "layers", "sun", "moon"];

function emptyAddon() {
  return { label: "", subLabel: "", icon: "sparkle", image: "", categoryPath: [], scopes: ["wedding"], scope: "wedding", active: true };
}

function emptyCategory(parentTrail = [], image = "") {
  return {
    parentCategorySlug: parentTrail.length ? parentTrail[parentTrail.length - 1].slug : null,
    parentLabel: parentTrail.length ? parentTrail.map((n) => n.label).join(" › ") : "Top level",
    cat: {
      label: "",
      slug: "",
      description: "",
      image: image || "",
      type: "category",
      children: [],
    },
  };
}

function countProducts(node) {
  if (!node) return 0;
  return (node.products || []).length + (node.children || []).reduce((n, child) => n + countProducts(child), 0);
}

export default function AdminAddons() {
  usePageMeta("Event Services — Admin", "Manage service categories, service products, and featured service cards.");
  const navigate = useNavigate();
  const [tab, setTab] = useState("products");
  const [addons, setAddons] = useState(getAddons);
  const [occasions] = useState(() => getOccasions().filter((o) => !o.addonOnly));
  const [categoryOptions, setCategoryOptions] = useState(getAddonCategoryOptions);
  const [categoryTree, setCategoryTree] = useState(getAddonCategoryTree);
  const [addonProducts, setAddonProducts] = useState(getAddonProducts);
  const [scopeFilter, setScopeFilter] = useState("all");
  const [productSearch, setProductSearch] = useState("");
  const [productStatus, setProductStatus] = useState("all");
  const [productCategory, setProductCategory] = useState("all");
  const [editingAddon, setEditingAddon] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [expanded, setExpanded] = useState({});
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  function refresh() {
    setAddons(getAddons());
    setCategoryOptions(getAddonCategoryOptions());
    setCategoryTree(getAddonCategoryTree());
    setAddonProducts(getAddonProducts());
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

  const filteredAddons = addons.filter((a) => scopeFilter === "all" || (Array.isArray(a.scopes) ? a.scopes.includes(scopeFilter) : a.scope === scopeFilter));
  const filteredProducts = useMemo(() => addonProducts.filter((p) => {
    const q = productSearch.trim().toLowerCase();
    const matchSearch = !q || String(p.name || "").toLowerCase().includes(q) || String(p.slug || "").toLowerCase().includes(q);
    const matchStatus = productStatus === "all" || p.status === productStatus;
    const matchCategory = productCategory === "all" || (p.categoryPath || []).join("/") === productCategory;
    return matchSearch && matchStatus && matchCategory;
  }), [addonProducts, productSearch, productStatus, productCategory]);

  function scopeLabel(addon) {
    const scopes = Array.isArray(addon.scopes) && addon.scopes.length ? addon.scopes : (addon.scope ? [addon.scope] : []);
    if (!scopes.length) return "Not assigned";
    return scopes.map((scope) => occasions.find((o) => o.slug === scope)?.label || scope).join(" + ");
  }

  function handleSaveAddon(e) {
    e.preventDefault();
    setError("");
    if (!editingAddon.label.trim()) return setError("Service card title is required.");
    if (!editingAddon.categoryPath?.length) return setError("Select a service category for this featured card.");
    if (!Array.isArray(editingAddon.scopes) || editingAddon.scopes.length === 0) return setError("Select at least one occasion for this service.");
    try {
      saveAddon(editingAddon);
      refresh();
      setEditingAddon(null);
      flash(`Saved service card "${editingAddon.label}".`);
    } catch (err) { setError(err.message || "Failed to save service card."); }
  }

  function handleDeleteAddon(id, label) {
    if (!window.confirm(`Delete service card "${label}"? This only removes the featured card, not its products.`)) return;
    deleteAddon(id);
    refresh();
    flash(`Deleted service card "${label}".`);
  }

  function handleSaveCategory(e) {
    e.preventDefault();
    setError("");
    const cat = editingCategory?.cat;
    if (!cat?.label?.trim()) return setError("Service category name is required.");
    try {
      saveCategory("event-services", { ...cat, slug: sanitizeSlug(cat.slug || cat.label), parentCategorySlug: editingCategory.parentCategorySlug || null });
      refresh();
      setEditingCategory(null);
      flash(`Saved service category "${cat.label}".`);
    } catch (err) { setError(err.message || "Failed to save service category."); }
  }

  function handleDeleteCategory(trail) {
    const node = trail[trail.length - 1];
    const productCount = countProducts(node);
    if (productCount > 0) {
      setError(`Cannot delete "${node.label}" because it contains ${productCount} service product${productCount === 1 ? "" : "s"}. Move or delete those products first.`);
      return;
    }
    const parent = trail.length > 1 ? trail[trail.length - 2] : null;
    if (!window.confirm(`Delete service category "${node.label}" and its empty child categories?`)) return;
    deleteCategory("event-services", node.slug, parent?.slug || null);
    refresh();
    flash(`Deleted service category "${node.label}".`);
  }

  function renderCategoryTree(children, parentTrail = [], depth = 0) {
    return (children || []).map((node) => {
      const trail = [...parentTrail, node];
      const key = trail.map((n) => n.slug).join("/");
      const isOpen = expanded[key] !== false;
      const directProducts = (node.products || []).length;
      const totalProducts = countProducts(node);
      const hasChildren = Array.isArray(node.children) && node.children.length > 0;
      return (
        <div key={key} className="admin-nested-node" style={{ marginLeft: depth * 22 }}>
          <div className="admin-subcategory-item">
            <img src={node.image} alt={node.label} className="admin-sub-thumb" />
            <div className="admin-sub-info" style={{ flex: 1 }}>
              <strong>{node.label}</strong>
              <span className="admin-table-sub"><code>{trail.map((n) => n.slug).join(" / ")}</code> &bull; {directProducts} direct &bull; {totalProducts} total</span>
            </div>
            <div className="admin-row-actions">
              {hasChildren && <button type="button" className="btn-icon" title={isOpen ? "Collapse" : "Expand"} onClick={() => setExpanded((p) => ({ ...p, [key]: !isOpen }))}><span style={{ fontSize: 18 }}>{isOpen ? "−" : "+"}</span></button>}
              <button type="button" className="btn btn-sm btn-outline" onClick={() => setEditingCategory(emptyCategory(trail, node.image))}><Icon name="plus" /> Add child</button>
              <button type="button" className="btn-icon" title="Edit category" onClick={() => setEditingCategory({ parentCategorySlug: trail.length > 1 ? trail[trail.length - 2].slug : null, parentLabel: trail.length > 1 ? trail.slice(0, -1).map((n) => n.label).join(" › ") : "Top level", cat: { ...node } })}><Icon name="edit" /></button>
              <a href={`/occasion/event-services/${trail.map((n) => n.slug).join("/")}`} target="_blank" rel="noreferrer" className="btn-icon" title="View category"><Icon name="eye" /></a>
              <button type="button" className="btn-icon btn-icon-danger" title="Delete category" onClick={() => handleDeleteCategory(trail)}><Icon name="trash" /></button>
            </div>
          </div>
          {isOpen && hasChildren && renderCategoryTree(node.children, trail, depth + 1)}
        </div>
      );
    });
  }

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <div>
          <h1>Event Services</h1>
          <p className="admin-hint">Everything related to services is managed here. <strong>Service Categories</strong> define the catalog structure, <strong>Service Products</strong> are the sellable services inside those categories, and <strong>Featured Cards</strong> controls which categories appear in the Popular Services strip.</p>
        </div>
        <div className="admin-head-actions">
          {tab === "categories" && <button type="button" className="btn btn-primary" onClick={() => setEditingCategory(emptyCategory())}><Icon name="plus" /> Add Category</button>}
          {tab === "products" && <Link to="/admin/services/products/new" className="btn btn-primary"><Icon name="plus" /> Add Service Product</Link>}
          {tab === "featured" && <button type="button" className="btn btn-primary" onClick={() => setEditingAddon(emptyAddon())}><Icon name="plus" /> Add Featured Card</button>}
        </div>
      </div>

      {feedback && <div className="admin-alert admin-alert--success">{feedback}</div>}
      {error && <div className="admin-alert admin-alert--error">{error}</div>}

      <div className="admin-tabs">
        <button type="button" className={`admin-tab ${tab === "products" ? "active" : ""}`} onClick={() => setTab("products")}><Icon name="package" /> Service Products ({addonProducts.length})</button>
        <button type="button" className={`admin-tab ${tab === "categories" ? "active" : ""}`} onClick={() => setTab("categories")}><Icon name="grid" /> Service Categories ({categoryOptions.length})</button>
        <button type="button" className={`admin-tab ${tab === "featured" ? "active" : ""}`} onClick={() => setTab("featured")}><Icon name="tag" /> Featured Cards ({addons.length})</button>
      </div>

      {tab === "products" && (
        <div className="admin-panel">
          <div className="admin-toolbar-row">
            <div className="admin-search-wrapper"><Icon name="search" /><input type="search" className="admin-search" placeholder="Search service products..." value={productSearch} onChange={(e) => setProductSearch(e.target.value)} /></div>
            <div className="admin-filters">
              <select className="admin-select" value={productCategory} onChange={(e) => setProductCategory(e.target.value)}><option value="all">All Service Categories</option>{categoryOptions.map((c) => <option key={c.path.join("/")} value={c.path.join("/")}>{c.label}</option>)}</select>
              <select className="admin-select" value={productStatus} onChange={(e) => setProductStatus(e.target.value)}><option value="all">All Statuses</option><option value="active">Active</option><option value="draft">Draft</option><option value="featured">Featured</option><option value="archived">Archived</option></select>
            </div>
          </div>
          {filteredProducts.length === 0 ? <div className="admin-empty"><p>No service products match your filters.</p><Link to="/admin/services/products/new" className="btn btn-sm btn-primary" style={{ marginTop: 12 }}>Create Service Product</Link></div> : (
            <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th style={{ width: 70 }}>Picture</th><th>Product</th><th>Category</th><th>Price</th><th>Status</th><th style={{ textAlign: "right" }}>Actions</th></tr></thead><tbody>
              {filteredProducts.map((product) => <tr key={product.id || product.slug}>
                <td><img src={product.image} alt={product.name} className="admin-table-thumb" loading="lazy" /></td>
                <td><div className="admin-table-main-title"><Link to={`/admin/services/products/${product.id || product.slug}/edit`}>{product.name}</Link>{product.badge && <span className="admin-badge-mini">{product.badge}</span>}</div><div className="admin-table-sub"><code>{product.slug}</code></div></td>
                <td><span className="admin-table-category">{product.addonCategoryLabel || product.categorySlug || "General"}</span></td>
                <td><strong>{product.price != null ? fmtINR(product.price) : "Contact for pricing"}</strong>{product.originalPrice ? <span className="admin-mrp-cut">{fmtINR(product.originalPrice)}</span> : null}</td>
                <td><span className={`admin-badge ${product.status === "active" || product.status === "featured" ? "admin-badge--paid" : "admin-badge--cancelled"}`}>{product.status}</span></td>
                <td style={{ textAlign: "right" }}><div className="admin-row-actions" style={{ justifyContent: "flex-end" }}><Link className="btn-icon" title="Edit service product" to={`/admin/services/products/${product.id || product.slug}/edit`}><Icon name="edit" /></Link><a className="btn-icon" title="View" href={`/occasion/event-services/${(product.categoryPath || []).slice(1).join("/")}/${product.slug}`} target="_blank" rel="noreferrer"><Icon name="eye" /></a></div></td>
              </tr>)}
            </tbody></table></div>
          )}
        </div>
      )}

      {tab === "categories" && (
        <div className="admin-panel">
          <div className="admin-calc-box"><div className="admin-calc-item"><span>Category structure</span><strong>Event Services</strong></div><div className="admin-calc-item"><span>Categories / subcategories</span><strong>{categoryOptions.length}</strong></div><div className="admin-calc-item"><span>Sellable service products</span><strong>{addonProducts.length}</strong></div></div>
          <div className="admin-subcategory-list" style={{ marginTop: 18 }}>{renderCategoryTree(categoryTree.children || [])}</div>
        </div>
      )}

      {tab === "featured" && (
        <div className="admin-panel">
          <div className="admin-toolbar-row"><div className="admin-filters"><select value={scopeFilter} onChange={(e) => setScopeFilter(e.target.value)} className="admin-select"><option value="all">All Occasions</option>{occasions.filter((o) => ["wedding", "birthday"].includes(o.slug)).map((o) => <option key={o.slug} value={o.slug}>{o.label}</option>)}</select></div></div>
          {filteredAddons.length === 0 ? <div className="admin-empty"><p>No featured service cards match this filter.</p></div> : <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th style={{ width: 70 }}>Icon</th><th>Featured Card</th><th>Category</th><th>Scope</th><th>From Price</th><th>Status</th><th style={{ textAlign: "right" }}>Actions</th></tr></thead><tbody>
            {filteredAddons.map((addon) => <tr key={addon.id}><td><span className="admin-addon-icon-cell"><Icon name={addon.icon || "sparkle"} /></span></td><td><div className="admin-table-main-title">{addon.label}</div>{addon.subLabel && <div className="admin-table-sub">{addon.subLabel}</div>}</td><td>{addon.linkBroken ? <span className="admin-badge admin-badge--overdue">Category missing</span> : <><code>{addon.categoryLabel || "—"}</code><div className="admin-table-sub">{addon.productCount} product{addon.productCount === 1 ? "" : "s"}</div></>}</td><td><span className="admin-table-category">{scopeLabel(addon)}</span></td><td><strong>{addon.price != null ? fmtINR(addon.price) : "—"}</strong></td><td><button type="button" className={`admin-badge ${addon.active !== false ? "admin-badge--paid" : "admin-badge--cancelled"}`} onClick={() => { saveAddon({ ...addon, active: !addon.active }); refresh(); }}>{addon.active !== false ? "Active" : "Hidden"}</button></td><td style={{ textAlign: "right" }}><div className="admin-row-actions" style={{ justifyContent: "flex-end" }}><button type="button" className="btn-icon" title="Edit featured card" onClick={() => setEditingAddon({ ...addon })}><Icon name="edit" /></button><button type="button" className="btn-icon" title="Duplicate featured card" onClick={() => { const dup = duplicateAddon(addon.id); if (dup) { refresh(); flash(`Created copy "${dup.label}".`); } }}><Icon name="copy" /></button><button type="button" className="btn-icon btn-icon-danger" title="Delete featured card" onClick={() => handleDeleteAddon(addon.id, addon.label)}><Icon name="trash" /></button></div></td></tr>)}
          </tbody></table></div>}
        </div>
      )}

      {editingCategory && <div className="admin-modal-backdrop" onClick={() => setEditingCategory(null)}><div className="admin-modal-card" onClick={(e) => e.stopPropagation()}><div className="admin-modal-header"><h2>{editingCategory.cat.id ? `Edit ${editingCategory.cat.label}` : "Add Service Category"}</h2><button type="button" className="btn-icon" onClick={() => setEditingCategory(null)}><Icon name="close" /></button></div><form onSubmit={handleSaveCategory}><div className="admin-form-group"><label className="admin-form-label">Parent</label><div className="admin-calc-box"><strong>{editingCategory.parentLabel}</strong></div></div><div className="admin-form-group"><label className="admin-form-label">Category Name *</label><input className="admin-input" value={editingCategory.cat.label || ""} onChange={(e) => setEditingCategory((p) => ({ ...p, cat: { ...p.cat, label: e.target.value, slug: sanitizeSlug(e.target.value) } }))} required /></div><div className="admin-form-group"><label className="admin-form-label">Slug *</label><input className="admin-input" value={sanitizeSlug(editingCategory.cat.label || "")} readOnly required /><small className="admin-form-help">Generated automatically from the category name.</small></div><div className="admin-form-group"><label className="admin-form-label">Description</label><textarea className="admin-textarea" rows="3" value={editingCategory.cat.description || ""} onChange={(e) => setEditingCategory((p) => ({ ...p, cat: { ...p.cat, description: e.target.value } }))} /></div><div className="admin-form-group"><label className="admin-form-label">Image URL</label><input className="admin-input" value={editingCategory.cat.image || ""} onChange={(e) => setEditingCategory((p) => ({ ...p, cat: { ...p.cat, image: e.target.value } }))} /></div><div className="admin-modal-actions"><button type="button" className="btn btn-ghost" onClick={() => setEditingCategory(null)}>Cancel</button><button type="submit" className="btn btn-primary">Save Category</button></div></form></div></div>}

      {editingAddon && <div className="admin-modal-backdrop" onClick={() => setEditingAddon(null)}><div className="admin-modal-card" onClick={(e) => e.stopPropagation()}><div className="admin-modal-header"><h2>{editingAddon.id ? `Edit Featured Card: ${editingAddon.label}` : "New Featured Service Card"}</h2><button type="button" className="btn-icon" onClick={() => setEditingAddon(null)}><Icon name="close" /></button></div><form onSubmit={handleSaveAddon}><div className="admin-form-row"><div className="admin-form-group"><label className="admin-form-label">Card Title *</label><input className="admin-input" value={editingAddon.label} onChange={(e) => setEditingAddon({ ...editingAddon, label: e.target.value })} required /></div><div className="admin-form-group"><label className="admin-form-label">Subtitle</label><input className="admin-input" value={editingAddon.subLabel} onChange={(e) => setEditingAddon({ ...editingAddon, subLabel: e.target.value })} /></div></div><div className="admin-form-group"><label className="admin-form-label">Featured Service Category *</label><select className="admin-select" value={(editingAddon.categoryPath || []).join("/")} onChange={(e) => setEditingAddon({ ...editingAddon, categoryPath: e.target.value ? e.target.value.split("/") : [] })} required><option value="">Select a service category…</option>{categoryOptions.map((opt) => <option key={opt.path.join("/")} value={opt.path.join("/")}>{opt.label} ({opt.productCount} product{opt.productCount === 1 ? "" : "s"})</option>)}</select><p className="admin-hint" style={{ marginTop: 6 }}>This card points to the category. Manage the actual products in <strong>Service Products</strong>, not Products &amp; Packages.</p></div><div className="admin-form-row"><div className="admin-form-group"><label className="admin-form-label">Icon</label><select className="admin-select" value={editingAddon.icon} onChange={(e) => setEditingAddon({ ...editingAddon, icon: e.target.value })}>{ICON_OPTIONS.map((ic) => <option key={ic} value={ic}>{ic}</option>)}</select></div><div className="admin-form-group"><label className="admin-form-label">Available for *</label><div style={{ display: "flex", gap: 14, flexWrap: "wrap", paddingTop: 8 }}>{occasions.filter((o) => ["wedding", "birthday"].includes(o.slug)).map((o) => { const scopes = Array.isArray(editingAddon.scopes) ? editingAddon.scopes : (editingAddon.scope ? [editingAddon.scope] : []); return <label key={o.slug} className="admin-checkbox-label"><input type="checkbox" checked={scopes.includes(o.slug)} onChange={(e) => { const next = e.target.checked ? [...new Set([...scopes, o.slug])] : scopes.filter((s) => s !== o.slug); setEditingAddon({ ...editingAddon, scopes: next, scope: next[0] || "" }); }} /><span>{o.label}</span></label>; })}</div><p className="admin-hint">A service only appears on the selected occasion pages. Example: SFX / pyro can be Wedding-only.</p></div></div><div className="admin-form-group"><label className="admin-form-label">Card Image URL</label><input className="admin-input" value={editingAddon.image} onChange={(e) => setEditingAddon({ ...editingAddon, image: e.target.value })} /></div><label className="admin-checkbox-label"><input type="checkbox" checked={editingAddon.active !== false} onChange={(e) => setEditingAddon({ ...editingAddon, active: e.target.checked })} /><span>Visible on the live site</span></label><div className="admin-modal-actions"><button type="button" className="btn btn-ghost" onClick={() => setEditingAddon(null)}>Cancel</button><button type="submit" className="btn btn-primary">Save Featured Card</button></div></form></div></div>}
    </div>
  );
}
