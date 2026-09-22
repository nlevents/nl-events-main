import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getOccasions, getProducts, deleteProduct, duplicateProduct, saveCategory, deleteCategory, saveOccasion, deleteOccasion } from "../../lib/catalogStore";
import { fmtINR } from "../../lib/pricing";
import { sanitizeSlug } from "../../lib/sanitize";
import Icon from "../../components/Icon";
import usePageMeta from "../../hooks/usePageMeta";

const TOP = ["wedding", "birthday", "corporate", "kids-family", "anniversary", "festivals-culture"];

function flatten(nodes, trail = [], out = []) {
  (nodes || []).forEach((node) => {
    const next = [...trail, node];
    if (node.type !== "product") out.push({ node, trail: next });
    flatten(node.children, next, out);
  });
  return out;
}

function findNode(occasion, path) {
  let node = occasion;
  for (const slug of path.slice(1)) {
    node = (node?.children || []).find((child) => child.slug === slug);
    if (!node) return null;
  }
  return node;
}

export default function AdminProducts() {
  usePageMeta("Catalog — Admin", "Manage occasions, categories, services, packages and products.");
  const navigate = useNavigate();
  const [occasions, setOccasions] = useState(getOccasions);
  const [products, setProducts] = useState(getProducts);
  const [selectedPath, setSelectedPath] = useState(["wedding"]);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("active");
  const [sort, setSort] = useState("latest");
  const [expanded, setExpanded] = useState(() => new Set(["wedding", "birthday"]));
  const [notice, setNotice] = useState("");
  const [categoryModal, setCategoryModal] = useState(null);
  const [catalogTab, setCatalogTab] = useState("overview");

  function refresh() {
    setOccasions(getOccasions());
    setProducts(getProducts());
  }

  useEffect(() => {
    const onUpdate = () => refresh();
    window.addEventListener("nle-catalog-updated", onUpdate);
    return () => window.removeEventListener("nle-catalog-updated", onUpdate);
  }, []);

  const selectedOccasion = occasions.find((o) => o.slug === selectedPath[0]) || occasions[0];
  const selectedNode = selectedOccasion ? findNode(selectedOccasion, selectedPath) : null;

  const visibleProducts = useMemo(() => {
    const needle = search.trim().toLowerCase();
    let list = products.filter((p) => {
      const pPath = Array.isArray(p.categoryPath) ? p.categoryPath : [p.occasionSlug, p.categorySlug].filter(Boolean);
      const inBranch = catalogTab === "services" ? true : selectedPath.every((part, i) => pPath[i] === part) || (selectedPath.length === 1 && p.occasionSlug === selectedPath[0]);
      const matchesSearch = !needle || String(p.name || "").toLowerCase().includes(needle) || String(p.slug || "").toLowerCase().includes(needle);
      const matchesType = type === "all" || (type === "package" ? p.catalogItemType === "package" : type === "product" ? p.catalogItemType !== "package" && !p.isAddon : p.isAddon);
      const matchesTab = catalogTab === "packages" ? p.catalogItemType === "package" : catalogTab === "products" ? p.catalogItemType !== "package" && !p.isAddon : catalogTab === "services" ? p.isAddon : true;
      const matchesStatus = status === "all" || p.status === status;
      return inBranch && matchesSearch && matchesType && matchesTab && matchesStatus;
    });
    if (sort === "price") list.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
    else if (sort === "name") list.sort((a, b) => String(a.name).localeCompare(String(b.name)));
    else list.sort((a, b) => String(b.updatedAt || b.createdAt || "").localeCompare(String(a.updatedAt || a.createdAt || "")));
    return list;
  }, [products, selectedPath, search, type, status, sort, catalogTab]);

  const sellableItems = products.filter((p) => !p.isAddon);
  const totalItems = sellableItems.length;
  const activeItems = sellableItems.filter((p) => p.status === "active").length;
  const allFunctions = flatten(occasions).filter(({ node }) => node.type === "theme").length;
  const serviceCount = products.filter((p) => p.isAddon).length;
  const selectedLabel = selectedNode?.label || selectedOccasion?.label || "Catalog";

  function toggle(slug) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug); else next.add(slug);
      return next;
    });
  }

  function choose(path) {
    setSelectedPath(path);
  }

  function renderTree(nodes, occasionSlug, parentPath = []) {
    return (nodes || []).filter((n) => n.type !== "product").map((node) => {
      const path = [occasionSlug, ...parentPath.map((n) => n.slug), node.slug];
      const hasChildren = (node.children || []).some((c) => c.type !== "product");
      const open = expanded.has(path.join("/"));
      const selected = selectedPath.join("/") === path.join("/");
      return (
        <div key={path.join("/")} className="catalog-tree-node">
          <div className={`catalog-tree-row ${selected ? "is-selected" : ""}`} style={{ paddingLeft: `${12 + parentPath.length * 18}px` }}>
            <button type="button" className="catalog-tree-chevron" onClick={() => hasChildren && toggle(path.join("/"))} aria-label={hasChildren ? "Toggle" : "No children"}>
              {hasChildren ? (open ? "⌄" : "›") : ""}
            </button>
            <button type="button" className="catalog-tree-label" onClick={() => choose(path)}>
              <span className="catalog-tree-icon"><Icon name={node.type === "theme" ? "sparkle" : "package"} /></span>
              <span>{node.label}</span>
            </button>
            <button type="button" className="catalog-tree-more" onClick={() => setCategoryModal({ mode: "add", occasionSlug, parentPath: path.slice(1), parentCategoryId: node.id, label: node.label })}>+</button><button type="button" className="catalog-tree-more" title="Edit category" onClick={() => setCategoryModal({ mode: "edit", occasionSlug, parentPath: path.slice(1, -1), parentCategoryId: parentPath.length ? parentPath[parentPath.length - 1].id : null, category: { ...node } })}>✎</button><button type="button" className="catalog-tree-more" title="Delete category" onClick={() => { if (window.confirm(`Delete “${node.label}” and nested categories?`)) { deleteCategory(occasionSlug, node.slug, parentPath.length ? parentPath[parentPath.length - 1].slug : null, node.id, parentPath.length ? parentPath[parentPath.length - 1].id : null); refresh(); } }}>×</button>
          </div>
          {open && hasChildren && <div>{renderTree(node.children, occasionSlug, [...parentPath, node])}</div>}
        </div>
      );
    });
  }

  function handleSaveCategory(e) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const label = String(form.get("label") || "").trim();
    const slug = sanitizeSlug(label);
    if (!label || !slug) return;
    saveCategory(categoryModal.occasionSlug, {
      ...(categoryModal.category || {}),
      label, slug,
      description: String(form.get("description") || ""),
      image: String(form.get("image") || ""),
      parentCategorySlug: categoryModal.parentPath?.length ? categoryModal.parentPath[categoryModal.parentPath.length - 1] : null,
      parentCategoryId: categoryModal.parentCategoryId || null,
    });
    refresh();
    setCategoryModal(null);
    setNotice(`Category “${label}” created.`);
    setTimeout(() => setNotice(""), 2500);
  }

  function handleDeleteCategory() {
    if (selectedPath.length <= 1) return;
    const parent = selectedPath.length > 2 ? selectedPath[selectedPath.length - 2] : null;
    const slug = selectedPath[selectedPath.length - 1];
    const selected = selectedNode;
    if (!window.confirm(`Delete “${selectedLabel}” and its nested categories?`)) return;
    deleteCategory(selectedPath[0], slug, parent, selected?.id || null, parent ? findNode(selectedOccasion, selectedPath.slice(0, -1))?.id || null : null);
    setSelectedPath(selectedPath.slice(0, -1));
    refresh();
  }

  return (
    <div className="catalog-page">
      <div className="catalog-head">
        <div><div className="catalog-breadcrumb">Dashboard <span>›</span> Catalog</div><h1>Catalog</h1><p>Manage all your occasions, functions, services, packages and products in one place.</p></div>
        <div className="catalog-head-actions"><button className="catalog-add-button" onClick={() => navigate("/admin/products/new")}>＋ Add New <span>⌄</span></button></div>
      </div>

      {notice && <div className="catalog-notice">{notice}</div>}

      <div className="catalog-top-tabs">
        {[["overview","▦","Overview"],["occasions","◫","Occasions"],["functions","✣","Functions / Themes"],["services","⚙","Service Categories"],["packages","◇","Packages"],["products","◇","Products / Elements"]].map(([key, icon, label]) => <button key={key} className={catalogTab === key ? "active" : ""} type="button" onClick={() => { setCatalogTab(key); if (key === "packages") setType("package"); else if (key === "products") setType("product"); else if (key === "services") setType("service"); else if (key === "functions") { setType("all"); const firstTheme = flatten(occasions).find(({ node }) => node.type === "theme"); if (firstTheme) setSelectedPath(firstTheme.trail.map((n) => n.slug)); } else setType("all"); }}><b>{icon}</b>{label}</button>)}
      </div>

      <div className="catalog-stats">
        <div><span className="catalog-stat-icon">◇</span><strong>{totalItems}</strong><small>Total Items</small><em>(Packages + Products)</em></div>
        <div><span className="catalog-stat-icon">◫</span><strong>{occasions.length}</strong><small>Occasions</small><em>Wedding, Birthday, Corporate...</em></div>
        <div><span className="catalog-stat-icon">✣</span><strong>{allFunctions}</strong><small>Functions / Themes</small></div>
        <div><span className="catalog-stat-icon">≋</span><strong>{serviceCount}</strong><small>Service Categories</small></div>
        <div><span className="catalog-stat-icon green">◔</span><strong>{totalItems ? Math.round((activeItems / totalItems) * 100) : 0}%</strong><small>Active Items</small><em>{activeItems} of {totalItems} items</em></div>
      </div>

      <div className="catalog-workspace">
        <aside className="catalog-tree-panel">
          <div className="catalog-panel-title"><h2>Category Tree</h2><button type="button" onClick={() => setCategoryModal({ mode: "add", occasionSlug: selectedPath[0] || "wedding", parentPath: [] })}>＋ Add</button></div>
          <div className="catalog-tree">
            {occasions.filter((o) => TOP.includes(o.slug)).map((occ) => {
              const open = expanded.has(occ.slug);
              const selected = selectedPath.length === 1 && selectedPath[0] === occ.slug;
              return <div key={occ.slug}>
                <div className={`catalog-tree-row occasion ${selected ? "is-selected" : ""}`}>
                  <button className="catalog-tree-chevron" type="button" onClick={() => toggle(occ.slug)}>{open ? "⌄" : "›"}</button>
                  <button className="catalog-tree-label" type="button" onClick={() => choose([occ.slug])}><span className="catalog-tree-icon"><Icon name={occ.slug === "birthday" ? "gift" : "package"} /></span><strong>{occ.label}</strong></button>
                  <button className="catalog-tree-more" type="button" title="Add category" onClick={() => setCategoryModal({ mode: "add", occasionSlug: occ.slug, parentPath: [] })}>+</button><button className="catalog-tree-more" type="button" title="Edit occasion" onClick={() => setCategoryModal({ mode: "edit-occasion", occasionSlug: occ.slug, occasion: { ...occ } })}>✎</button><button className="catalog-tree-more" type="button" title="Delete occasion" onClick={() => { if (window.confirm(`Delete “${occ.label}” and everything inside it?`)) { deleteOccasion(occ.slug); if (selectedPath[0] === occ.slug) { const next = getOccasions().find((o) => o.slug !== occ.slug); setSelectedPath(next ? [next.slug] : [occ.slug]); } refresh(); } }}>×</button>
                </div>
                {open && renderTree(occ.children, occ.slug)}
              </div>;
            })}
          </div>
        </aside>

        <section className="catalog-items-panel">
          <div className="catalog-items-head"><div><h2>Items in {selectedLabel}</h2><p>Showing {visibleProducts.length} items</p></div><div className="catalog-view-actions"><button className={type === "package" ? "active" : ""} onClick={() => setType(type === "package" ? "all" : "package")}>▱ Packages</button><button className={type === "product" ? "active" : ""} onClick={() => setType(type === "product" ? "all" : "product")}>◇ Products</button><button onClick={() => setType("all")}>▣ All Items</button><button className="catalog-add-button" onClick={() => navigate("/admin/products/new")}>＋ Add Item <span>⌄</span></button></div></div>
          <div className="catalog-filters"><div className="catalog-search"><Icon name="search"/><input placeholder="Search items..." value={search} onChange={(e) => setSearch(e.target.value)} /></div><select value={type} onChange={(e) => setType(e.target.value)}><option value="all">Type: All</option><option value="product">Products</option><option value="package">Packages</option><option value="service">Services</option></select><select value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">Status: All</option><option value="active">Status: Active</option><option value="draft">Status: Draft</option></select><select value={sort} onChange={(e) => setSort(e.target.value)}><option value="latest">Sort By: Latest</option><option value="name">Sort By: Name</option><option value="price">Sort By: Price</option></select><button className="catalog-icon-button">▦</button><button className="catalog-icon-button">☷</button></div>
          <div className="catalog-table-wrap"><table className="catalog-table"><thead><tr><th>□</th><th>Image</th><th>Name</th><th>Type</th><th>Price</th><th>Status</th><th>Actions</th></tr></thead><tbody>
            {visibleProducts.length ? visibleProducts.map((p) => <tr key={p.id}><td>□</td><td><img src={p.image} alt=""/></td><td><strong>{p.name}</strong><small>{p.shortDesc || p.description || ""}</small></td><td><span className={`catalog-type ${p.catalogItemType === "package" ? "package" : p.isAddon ? "service" : "product"}`}>{p.catalogItemType === "package" ? "Package" : p.isAddon ? "Service" : "Product"}</span></td><td><strong>{fmtINR(p.price || 0)}</strong><small>{p.priceType || "Starting from"}</small></td><td><span className="catalog-status">{p.status || "active"}</span></td><td><div className="catalog-row-actions"><Link to={`/admin/products/${p.id}/edit`}>✎</Link><button onClick={() => duplicateProduct(p.id)}>⧉</button><button onClick={() => { if (window.confirm(`Delete ${p.name}?`)) { deleteProduct(p.id); refresh(); } }}>⋮</button></div></td></tr>) : <tr><td colSpan="7"><div className="catalog-empty">No items in this category yet. Use <b>Add Item</b> to create one.</div></td></tr>}
          </tbody></table></div>
          <div className="catalog-footer"><span>Showing 1 to {visibleProducts.length} of {visibleProducts.length} items</span><div><button>‹</button><b>1</b><button>›</button><select><option>10 / page</option><option>25 / page</option><option>50 / page</option></select></div></div>
        </section>
      </div>

      {categoryModal?.mode === "edit-occasion" && <div className="catalog-modal-backdrop" onClick={() => setCategoryModal(null)}><form className="catalog-modal" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); saveOccasion({ ...categoryModal.occasion, label: String(f.get("label") || "").trim(), tagline: String(f.get("tagline") || ""), description: String(f.get("description") || "") }); refresh(); setCategoryModal(null); }} onClick={(e) => e.stopPropagation()}><div><h2>Edit Occasion</h2><button type="button" onClick={() => setCategoryModal(null)}>×</button></div><label>Name *<input name="label" defaultValue={categoryModal.occasion.label} required /></label><label>Tagline<input name="tagline" defaultValue={categoryModal.occasion.tagline || ""} /></label><label>Description<textarea name="description" defaultValue={categoryModal.occasion.description || ""} rows="3" /></label><footer><button type="button" onClick={() => setCategoryModal(null)}>Cancel</button><button className="catalog-add-button">Save Occasion</button></footer></form></div>}

      {categoryModal && categoryModal.mode !== "edit-occasion" && <div className="catalog-modal-backdrop" onClick={() => setCategoryModal(null)}><form className="catalog-modal" onSubmit={handleSaveCategory} onClick={(e) => e.stopPropagation()}><div><h2>{categoryModal.mode === "edit" ? "Edit Category" : "Add Subcategory"}</h2><button type="button" onClick={() => setCategoryModal(null)}>×</button></div><p>Parent: <strong>{categoryModal.parentPath?.length ? categoryModal.parentPath.join(" › ") : "Top level"}</strong></p><label>Name *<input name="label" value={categoryModal.category?.label || ""} onChange={(e) => setCategoryModal((p) => ({ ...p, category: { ...(p.category || {}), label: e.target.value, slug: sanitizeSlug(e.target.value) } }))} required placeholder="e.g. Decor" autoFocus /></label><label>Slug *<input name="slug" value={sanitizeSlug(categoryModal.category?.label || "")} readOnly placeholder="decor" /><small className="admin-form-help">Generated automatically from the name.</small></label><label>Description<textarea name="description" defaultValue={categoryModal.category?.description || ""} rows="3"/></label><label>Image URL<input name="image" defaultValue={categoryModal.category?.image || ""} placeholder="https://..."/></label><footer><button type="button" onClick={() => setCategoryModal(null)}>Cancel</button><button className="catalog-add-button">Save Category</button></footer></form></div>}
    </div>
  );
}
