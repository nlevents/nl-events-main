import { useEffect, useMemo, useState } from "react";
import Icon from "../../components/Icon";
import usePageMeta from "../../hooks/usePageMeta";
import {
  getOccasions,
  saveCategory,
  deleteCategory,
  saveOccasion,
  deleteOccasion,
  getProducts,
  getAddonCategoryOptions,
  saveProductToCloud,
  deleteProduct,
  duplicateProduct,
  uploadMediaFile,
} from "../../lib/catalogStore";
import { fmtINR } from "../../lib/pricing";
import { sanitizeSlug } from "../../lib/sanitize";

const KIND_LABELS = { product: "Product", package: "Package", service: "Service" };
const DEFAULT_IMAGE = "/assets/images/categories/wedding.webp";

function countAll(nodes = []) {
  return nodes.reduce((sum, node) => sum + 1 + countAll(node.children || []), 0);
}
function countProducts(node) {
  return (node.products || []).length + (node.children || []).reduce((n, child) => n + countProducts(child), 0);
}
function flattenTree(nodes = [], trail = []) {
  const out = [];
  nodes.forEach((node) => {
    const next = [...trail, node];
    out.push({ node, trail: next });
    out.push(...flattenTree(node.children || [], next));
  });
  return out;
}
function walkOptions(occasions) {
  const result = [];
  occasions.filter((o) => !o.addonOnly).forEach((o) => {
    flattenTree(o.children || []).forEach(({ node, trail }) => {
      result.push({
        value: [o.slug, ...trail.map((n) => n.slug)].join("/"),
        label: `${o.label} › ${trail.map((n) => n.label).join(" › ")}`,
        occasionSlug: o.slug,
        categorySlug: trail[trail.length - 1]?.slug || "",
      });
    });
  });
  return result;
}
function initialItem(kind = "product") {
  return {
    catalogKind: kind,
    name: "",
    slug: "",
    sku: "",
    shortDescription: "",
    description: "",
    image: "",
    occasionSlug: "wedding",
    categoryPath: [],
    priceType: kind === "package" ? "fixed" : "starting",
    price: "",
    originalPrice: "",
    discountPrice: "",
    unit: "Per Event",
    status: "active",
    occasions: ["wedding"],
    functions: [],
    serviceCategory: "",
    serviceType: "",
    coverageDuration: "",
    teamSize: "",
    deliverables: "",
    workflow: "",
    inclusionsText: "",
    exclusionsText: "",
    packageItems: [],
  };
}

function Field({ label, children, required }) {
  return <div className="catalog-field"><label>{label}{required ? <span> *</span> : null}</label>{children}</div>;
}

function ImagePicker({ value, onChange }) {
  const [busy, setBusy] = useState(false);
  async function upload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const saved = await uploadMediaFile(file, file.name);
      onChange(saved.url);
    } catch (err) {
      window.alert(err.message || "Unable to upload image.");
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  }
  return (
    <div className="catalog-image-picker">
      <div className="catalog-image-preview">
        {value ? <img src={value} alt="Preview" /> : <Icon name="image" />}
      </div>
      <div className="catalog-image-controls">
        <input value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder="Image URL" />
        <label className="btn btn-outline btn-sm"><Icon name="upload" /> {busy ? "Uploading…" : "Upload"}<input hidden type="file" accept="image/*" onChange={upload} disabled={busy} /></label>
      </div>
    </div>
  );
}

export default function AdminCatalog() {
  usePageMeta("Catalog — Admin", "Manage occasions, nested categories, products, services and packages.", { noindex: true });
  const [occasions, setOccasions] = useState(getOccasions);
  const [products, setProducts] = useState(getProducts);
  const [activeOccasion, setActiveOccasion] = useState("wedding");
  const [activeCategoryPath, setActiveCategoryPath] = useState([]);
  const [tab, setTab] = useState("overview");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("active");
  const [type, setType] = useState("all");
  const [view, setView] = useState("list");
  const [sort, setSort] = useState("latest");
  const [addMenu, setAddMenu] = useState(false);
  const [modal, setModal] = useState(null);
  const [categoryModal, setCategoryModal] = useState(null);
  const [expanded, setExpanded] = useState({});
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  function refresh() {
    setOccasions(getOccasions());
    setProducts(getProducts());
  }
  useEffect(() => {
    const fn = () => refresh();
    window.addEventListener("nle-catalog-updated", fn);
    return () => window.removeEventListener("nle-catalog-updated", fn);
  }, []);
  function flash(message) { setFeedback(message); setTimeout(() => setFeedback(""), 2800); }

  const currentOccasion = occasions.find((o) => o.slug === activeOccasion) || occasions[0];
  const displayOccasions = tab === "service-categories" ? occasions.filter((o) => o.addonOnly) : occasions.filter((o) => !o.addonOnly);
  const allCategoryOptions = useMemo(() => walkOptions(occasions), [occasions]);
  const activeCategory = useMemo(() => {
    let node = currentOccasion;
    for (const slug of activeCategoryPath) node = (node?.children || []).find((c) => c.slug === slug);
    return node || currentOccasion;
  }, [currentOccasion, activeCategoryPath]);
  const categoryProducts = useMemo(() => {
    const path = [activeOccasion, ...activeCategoryPath].join("/");
    return products.filter((p) => (p.categoryPath || []).join("/") === path || (!activeCategoryPath.length && p.occasionSlug === activeOccasion && !(p.categoryPath || []).length));
  }, [products, activeOccasion, activeCategoryPath]);
  const visibleProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return categoryProducts.filter((p) => {
      const kind = p.catalogKind || (p.isAddon ? "service" : "product");
      const matchQ = !q || [p.name, p.slug, p.sku].some((v) => String(v || "").toLowerCase().includes(q));
      const matchStatus = status === "all" || p.status === status;
      const matchType = type === "all" || kind === type;
      return matchQ && matchStatus && matchType;
    }).sort((a, b) => {
      if (sort === "name") return String(a.name || "").localeCompare(String(b.name || ""));
      if (sort === "price") return (Number(b.price) || 0) - (Number(a.price) || 0);
      return String(b.updatedAt || b.createdAt || "").localeCompare(String(a.updatedAt || a.createdAt || ""));
    });
  }, [categoryProducts, search, status, type, sort]);

  function selectOccasion(slug) { setActiveOccasion(slug); setActiveCategoryPath([]); }
  function selectCategory(path) { setActiveCategoryPath(path); }
  function openAdd(kind) {
    setAddMenu(false);
    const item = initialItem(kind);
    item.occasionSlug = kind === "service" ? "event-services" : activeOccasion;
    item.categoryPath = kind === "service" ? ((getAddonCategoryOptions()[0]?.path) || ["event-services"]) : [activeOccasion, ...activeCategoryPath];
    setModal({ mode: "create", kind, item });
  }
  function openEdit(product) {
    setModal({ mode: "edit", kind: product.catalogKind || (product.isAddon ? "service" : "product"), item: { ...initialItem(product.catalogKind || "product"), ...product, packageItems: product.packageItems || [] } });
  }
  async function saveItem(item) {
    setError("");
    if (!item.name.trim()) return setError("Name is required.");
    if (!item.price || Number(item.price) <= 0) return setError("Enter a valid price.");
    if (!item.categoryPath?.length) return setError("Choose a catalog category.");
    try {
      const saved = await saveProductToCloud({
        ...item,
        slug: sanitizeSlug(item.slug || item.name),
        catalogKind: modal.kind,
        isAddon: modal.kind === "service",
        occasionSlug: modal.kind === "service" ? "event-services" : item.categoryPath[0],
        categoryPath: modal.kind === "service" ? item.categoryPath : item.categoryPath,
        categorySlug: item.categoryPath[item.categoryPath.length - 1],
        image: item.image || DEFAULT_IMAGE,
        originalPrice: item.originalPrice || null,
        packageItems: modal.kind === "package" ? item.packageItems : [],
        includes: modal.kind === "package" ? item.packageItems.map((x) => x.name) : String(item.inclusionsText || "").split("\n").map((x) => x.trim()).filter(Boolean),
        notIncluded: String(item.exclusionsText || "").split("\n").map((x) => x.trim()).filter(Boolean),
        description: item.description || item.shortDescription,
      });
      refresh(); setModal(null); flash(`${KIND_LABELS[modal.kind]} "${saved.name}" saved successfully.`);
    } catch (err) { setError(err.message || "Unable to save item."); }
  }
  function removeItem(product) {
    if (!window.confirm(`Delete "${product.name}"? This cannot be undone.`)) return;
    deleteProduct(product.id || product.slug); refresh(); flash(`Deleted "${product.name}".`);
  }
  function duplicateItem(product) { const copy = duplicateProduct(product.id || product.slug); if (copy) { refresh(); flash(`Created copy "${copy.name}".`); } }

  function openOccasionEditor(occasion) {
    setCategoryModal({
      mode: "edit",
      isOccasion: true,
      occasionSlug: occasion.slug,
      parentCategorySlug: null,
      parentLabel: "Top-level occasion",
      cat: { ...occasion },
    });
  }
  function removeOccasion(occasion) {
    if (!window.confirm(`Delete "${occasion.label}" and all of its nested categories?`)) return;
    deleteOccasion(occasion.slug);
    const remaining = getOccasions().filter((o) => !o.addonOnly);
    if (activeOccasion === occasion.slug) {
      setActiveOccasion(remaining[0]?.slug || "wedding");
      setActiveCategoryPath([]);
    }
    refresh();
    flash(`Deleted "${occasion.label}".`);
  }
  function openCategoryEditor(occasionSlug, trail = [], mode = "create") {
    const node = trail[trail.length - 1];
    const parent = trail[trail.length - 2];
    setCategoryModal({
      mode,
      occasionSlug,
      parentCategorySlug: parent?.slug || null,
      parentLabel: parent ? trail.slice(0, -1).map((n) => n.label).join(" › ") : "Top level",
      cat: mode === "edit" ? { ...node } : { label: "", slug: "", description: "", image: node?.image || currentOccasion?.image || DEFAULT_IMAGE, type: "category", children: [] },
    });
  }
  function openChildEditor(occasionSlug, trail) {
    const parent = trail[trail.length - 1];
    setCategoryModal({ occasionSlug, parentCategorySlug: parent.slug, parentLabel: trail.map((n) => n.label).join(" › "), cat: { label: "", slug: "", description: "", image: parent.image || DEFAULT_IMAGE, type: "category", children: [] } });
  }
  function saveCategoryForm(e) {
    e.preventDefault(); setError("");
    const c = categoryModal.cat;
    if (!c.label.trim()) return setError(categoryModal.isOccasion ? "Occasion name is required." : "Category name is required.");
    try {
      if (categoryModal.isOccasion) {
        saveOccasion({ ...c, slug: sanitizeSlug(c.slug || c.label) });
      } else {
        saveCategory(categoryModal.occasionSlug, { ...c, slug: sanitizeSlug(c.slug || c.label), parentCategorySlug: categoryModal.parentCategorySlug || null });
      }
      refresh(); setCategoryModal(null); flash(`Saved ${categoryModal.isOccasion ? "occasion" : "category"} "${c.label}".`);
    } catch (err) { setError(err.message || "Unable to save category."); }
  }
  function removeCategory(occasionSlug, trail) {
    const node = trail[trail.length - 1];
    const parent = trail[trail.length - 2];
    if (!window.confirm(`Delete "${node.label}" and its nested categories?`)) return;
    deleteCategory(occasionSlug, node.slug, parent?.slug || null); refresh();
    if (activeCategoryPath.join("/") === trail.map((n) => n.slug).join("/")) setActiveCategoryPath(parent ? trail.slice(0, -1).map((n) => n.slug) : []);
    flash(`Deleted "${node.label}".`);
  }
  function toggleNode(key) { setExpanded((p) => ({ ...p, [key]: p[key] === false })); }

  function renderTree(nodes, trail = [], depth = 0) {
    return (nodes || []).map((node) => {
      const next = [...trail, node];
      const key = next.map((n) => n.slug).join("/");
      const open = expanded[key] !== false;
      const hasChildren = (node.children || []).length > 0;
      const selected = activeCategoryPath.join("/") === next.map((n) => n.slug).join("/") && activeOccasion === currentOccasion.slug;
      return <div key={key} className="catalog-tree-node" style={{ marginLeft: depth * 12 }}>
        <div className={`catalog-tree-row ${selected ? "selected" : ""}`}>
          <button type="button" className="catalog-tree-caret" onClick={() => hasChildren && toggleNode(key)}>{hasChildren ? (open ? "⌄" : "›") : ""}</button>
          <button type="button" className="catalog-tree-label" onClick={() => selectCategory(next.map((n) => n.slug))}><img src={node.image || DEFAULT_IMAGE} alt="" /><span>{node.label}</span><em>{countProducts(node)}</em></button>
          <button type="button" className="catalog-mini-action" title="Add child" onClick={() => openChildEditor(currentOccasion.slug, next)}><Icon name="plus" /></button>
          <button type="button" className="catalog-mini-action" title="Edit" onClick={() => openCategoryEditor(currentOccasion.slug, next, "edit")}><Icon name="edit" /></button>
          <button type="button" className="catalog-mini-action danger" title="Delete" onClick={() => removeCategory(currentOccasion.slug, next)}><Icon name="trash" /></button>
        </div>
        {open && hasChildren && renderTree(node.children, next, depth + 1)}
      </div>;
    });
  }

  const stats = {
    total: products.filter((p) => p.catalogKind !== "service" && p.isAddon !== true).length,
    occasions: occasions.filter((o) => !o.addonOnly).length,
    categories: occasions.filter((o) => !o.addonOnly).reduce((n, o) => n + countAll(o.children || []), 0),
    services: products.filter((p) => p.catalogKind === "service" || p.isAddon).length,
    packages: products.filter((p) => p.catalogKind === "package").length,
    active: products.filter((p) => p.status === "active").length,
  };

  return <div className="admin-page catalog-ref-page">
    <div className="catalog-ref-head">
      <div><div className="catalog-breadcrumb">Dashboard <span>›</span> Catalog</div><h1>Catalog</h1><p>Manage all your occasions, functions, services, packages and products in one place.</p></div>
      <div className="catalog-add-wrap">
        <button className="btn btn-primary" type="button" onClick={() => setAddMenu((v) => !v)}><Icon name="plus" /> Add New <span className="catalog-chevron">⌄</span></button>
        {addMenu && <div className="catalog-add-menu"><button onClick={() => openAdd("product")}><Icon name="package" /><span><strong>Product / Element</strong><small>Individual item like stage, sofa, light, tent</small></span></button><button onClick={() => openAdd("package")}><Icon name="layers" /><span><strong>Package</strong><small>Pre-defined bundle of products/services</small></span></button><button onClick={() => openAdd("service")}><Icon name="settings" /><span><strong>Service</strong><small>Photography, catering, artist, etc.</small></span></button></div>}
      </div>
    </div>

    {feedback && <div className="admin-alert admin-alert--success">{feedback}</div>}
    {error && !modal && !categoryModal && <div className="admin-alert admin-alert--error">{error}</div>}

    <div className="catalog-ref-tabs">
      {[["overview","Overview","grid"],["occasions","Occasions","calendar"],["functions","Functions / Themes","sparkle"],["service-categories","Service Categories","settings"],["packages","Packages","layers"],["products","Products / Elements","package"]].map(([key,label,icon]) => <button key={key} type="button" className={tab === key ? "active" : ""} onClick={() => { setTab(key); if (key === "service-categories") { setActiveOccasion("event-services"); setActiveCategoryPath([]); } else if (key !== "overview" && activeOccasion === "event-services") { setActiveOccasion("wedding"); setActiveCategoryPath([]); } if (key === "packages") setType("package"); else if (key === "products") setType("product"); else setType("all"); }} >{<Icon name={icon} />}{label}</button>)}
    </div>

    <div className="catalog-stat-grid">
      <div><span className="catalog-stat-icon"><Icon name="package" /></span><strong>{stats.total}</strong><small>Total Items</small><em>Packages + Products</em></div>
      <div><span className="catalog-stat-icon"><Icon name="calendar" /></span><strong>{stats.occasions}</strong><small>Occasions</small><em>Wedding, Birthday, Corporate…</em></div>
      <div><span className="catalog-stat-icon"><Icon name="layers" /></span><strong>{stats.categories}</strong><small>Functions / Themes</small><em>Nested catalog nodes</em></div>
      <div><span className="catalog-stat-icon"><Icon name="settings" /></span><strong>{stats.services}</strong><small>Services</small><em>Service products</em></div>
      <div><span className="catalog-stat-icon"><Icon name="layers" /></span><strong>{stats.packages}</strong><small>Packages</small><em>Pre-defined bundles</em></div>
      <div><span className="catalog-stat-ring">{stats.total ? Math.round((stats.active / Math.max(stats.total + stats.services, 1)) * 100) : 0}%</span><strong>{stats.active}</strong><small>Active Items</small><em>Visible on website</em></div>
    </div>

    {(tab === "overview" || tab === "occasions" || tab === "functions" || tab === "service-categories") ? <div className="catalog-workspace">
      <aside className="catalog-category-panel">
        <div className="catalog-panel-title"><div><h2>Category Tree</h2><p>Unlimited nesting</p></div><button className="btn btn-primary btn-sm" onClick={() => openCategoryEditor(activeOccasion, [])}><Icon name="plus" /> Add</button></div>
        <div className="catalog-occasion-list">
          {displayOccasions.map((o) => <div key={o.slug}>
            <div className={`catalog-occasion-row-wrap ${o.slug === activeOccasion ? "active" : ""}`}>
              <button type="button" className={`catalog-occasion-row ${o.slug === activeOccasion ? "active" : ""}`} onClick={() => selectOccasion(o.slug)}><span>{o.slug === "wedding" ? "◇" : "○"}</span>{o.label}<em>{countProducts(o)}</em></button>
              <div className="catalog-occasion-actions">
                <button type="button" title="Edit occasion" onClick={() => openOccasionEditor(o)}><Icon name="edit" /></button>
                <button type="button" title="Delete occasion" className="danger" onClick={() => removeOccasion(o)}><Icon name="trash" /></button>
              </div>
            </div>
            {o.slug === activeOccasion && renderTree(o.children || [])}
          </div>)}
        </div>
      </aside>
      <section className="catalog-items-panel">
        <div className="catalog-items-head"><div><div className="catalog-path">{currentOccasion?.label}{activeCategoryPath.map((slug, i) => <span key={slug}> › {flattenTree(currentOccasion?.children || []).find((x) => x.node.slug === slug)?.node.label || slug}</span>)}</div><h2>Items in {activeCategory?.label || currentOccasion?.label}</h2><p>Showing {visibleProducts.length} items</p></div><div className="catalog-item-actions"><button className={type === "package" ? "active" : ""} onClick={() => setType("package")}>Packages</button><button className={type === "product" ? "active" : ""} onClick={() => setType("product")}>Products</button><button className={type === "all" ? "active" : ""} onClick={() => setType("all")}>All Items</button><div className="catalog-inline-add-wrap"><button type="button" className="btn btn-primary" onClick={() => setAddMenu((v) => !v)}><Icon name="plus" /> Add Item <span>⌄</span></button>{addMenu && <div className="catalog-add-menu catalog-add-menu--inline"><button type="button" onClick={() => openAdd("product")}><Icon name="package" /><span><strong>Product / Element</strong><small>Individual catalog item</small></span></button><button type="button" onClick={() => openAdd("package")}><Icon name="layers" /><span><strong>Package</strong><small>Bundle products and services</small></span></button><button type="button" onClick={() => openAdd("service")}><Icon name="settings" /><span><strong>Service</strong><small>Photography, catering, artists, etc.</small></span></button></div>}</div></div></div>
        <div className="catalog-toolbar"><div className="catalog-search"><Icon name="search" /><input placeholder="Search items…" value={search} onChange={(e) => setSearch(e.target.value)} /></div><select value={type} onChange={(e) => setType(e.target.value)}><option value="all">Type: All</option><option value="product">Product</option><option value="package">Package</option><option value="service">Service</option></select><select value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">Status: All</option><option value="active">Status: Active</option><option value="draft">Status: Draft</option><option value="archived">Status: Archived</option></select><select value={sort} onChange={(e) => setSort(e.target.value)}><option value="latest">Sort By: Latest</option><option value="name">Name</option><option value="price">Price</option></select><button className={view === "grid" ? "view-active" : ""} onClick={() => setView("grid")}><Icon name="grid" /></button><button className={view === "list" ? "view-active" : ""} onClick={() => setView("list")}><Icon name="list" /></button></div>
        {view === "grid" ? <div className="catalog-product-grid">{visibleProducts.map((p) => <ProductCard key={p.id || p.slug} p={p} onEdit={openEdit} onDelete={removeItem} onDuplicate={duplicateItem} />)}</div> : <div className="catalog-product-table"><table><thead><tr><th></th><th>Image</th><th>Name</th><th>Type</th><th>Price</th><th>Status</th><th>Actions</th></tr></thead><tbody>{visibleProducts.map((p) => <ProductRow key={p.id || p.slug} p={p} onEdit={openEdit} onDelete={removeItem} onDuplicate={duplicateItem} />)}</tbody></table>{!visibleProducts.length && <div className="catalog-empty">No items here yet. Use <strong>Add New</strong> to create the first one.</div>}</div>}
      </section>
    </div> : <div className="catalog-simple-section"><h2>{tab === "packages" ? "Packages" : tab === "products" ? "Products / Elements" : tab === "service-categories" ? "Service Categories" : "Functions / Themes"}</h2><p>Use the category tree on the Catalog overview to organize this section. Add, edit, duplicate and delete records without leaving Catalog.</p><button className="btn btn-primary" onClick={() => openAdd(tab === "packages" ? "package" : tab === "service-categories" ? "service" : "product")}><Icon name="plus" /> Add New {tab === "packages" ? "Package" : tab === "service-categories" ? "Service" : "Item"}</button></div>}

    {modal && <ItemModal modal={modal} setModal={setModal} occasions={occasions} categoryOptions={[...allCategoryOptions, ...getAddonCategoryOptions()]} onSave={saveItem} error={error} setError={setError} />}
    {categoryModal && <CategoryModal data={categoryModal} setData={setCategoryModal} onSave={saveCategoryForm} error={error} setError={setError} />}
  </div>;
}

function ProductRow({ p, onEdit, onDelete, onDuplicate }) {
  const kind = p.catalogKind || (p.isAddon ? "service" : "product");
  return <tr><td><input type="checkbox" /></td><td><img className="catalog-thumb" src={p.image || DEFAULT_IMAGE} alt="" /></td><td><strong>{p.name}</strong><small>{p.shortDescription || p.description || ""}</small></td><td><span className={`catalog-type-badge ${kind}`}>{KIND_LABELS[kind]}</span></td><td><strong>{fmtINR(p.price)}</strong><small>{p.unit || "Per Event"}</small></td><td><span className={`catalog-status ${p.status}`}>{p.status === "active" ? "Active" : p.status}</span></td><td><div className="catalog-actions"><button title="Edit" onClick={() => onEdit(p)}><Icon name="edit" /></button><button title="Duplicate" onClick={() => onDuplicate(p)}><Icon name="copy" /></button><button className="danger" title="Delete" onClick={() => onDelete(p)}><Icon name="trash" /></button></div></td></tr>;
}
function ProductCard({ p, onEdit, onDelete, onDuplicate }) { const kind = p.catalogKind || (p.isAddon ? "service" : "product"); return <article className="catalog-card"><img src={p.image || DEFAULT_IMAGE} alt="" /><div><span className={`catalog-type-badge ${kind}`}>{KIND_LABELS[kind]}</span><h3>{p.name}</h3><p>{p.shortDescription || p.description}</p><strong>{fmtINR(p.price)}</strong><div><button onClick={() => onEdit(p)}>Edit</button><button onClick={() => onDuplicate(p)}>Duplicate</button><button onClick={() => onDelete(p)}>Delete</button></div></div></article>; }

function ItemModal({ modal, setModal, occasions, categoryOptions, onSave, error, setError }) {
  const [item, setItem] = useState(modal.item);
  const [packageSearch, setPackageSearch] = useState("");
  const products = getProducts().filter((p) => p.catalogKind !== "package");
  const set = (key, value) => setItem((p) => ({ ...p, [key]: value }));
  const isPackage = modal.kind === "package";
  const isService = modal.kind === "service";
  const options = isService ? categoryOptions.filter((x) => x.occasionSlug === "event-services" || String(x.value || "").startsWith("event-services/")) : categoryOptions;
  function chooseImage(url) { set("image", url); }
  function addPackageItem(product) { if (!item.packageItems.some((x) => x.id === product.id)) set("packageItems", [...item.packageItems, { id: product.id, name: product.name, qty: 1, price: product.price }]); }
  function updatePackageItem(id, key, value) { set("packageItems", item.packageItems.map((x) => x.id === id ? { ...x, [key]: key === "qty" ? Math.max(1, Number(value) || 1) : value } : x)); }
  function removePackageItem(id) { set("packageItems", item.packageItems.filter((x) => x.id !== id)); }
  return <div className="catalog-modal-backdrop" onMouseDown={() => setModal(null)}><div className="catalog-modal catalog-item-modal" onMouseDown={(e) => e.stopPropagation()}>
    <div className="catalog-modal-head"><div><h2>Add New Item</h2><p>Create a new {KIND_LABELS[modal.kind].toLowerCase()} for your catalog</p></div><button onClick={() => setModal(null)}><Icon name="close" /></button></div>
    <div className="catalog-kind-cards">{["product","package","service"].map((k) => <button type="button" key={k} className={modal.kind === k ? "selected" : ""} onClick={() => setModal({ ...modal, kind: k, item: { ...initialItem(k), ...item, catalogKind: k } })}><Icon name={k === "service" ? "settings" : k === "package" ? "layers" : "package"} /><span><strong>{KIND_LABELS[k]}{k === "product" ? " / Element" : ""}</strong><small>{k === "product" ? "Individual item like stage, sofa, backdrop, light" : k === "package" ? "Pre-defined package of multiple items" : "Non-tangible service such as photography or catering"}</small></span>{modal.kind === k && <b>✓</b>}</button>)}</div>
    {error && <div className="admin-alert admin-alert--error">{error}</div>}
    <form onSubmit={(e) => { e.preventDefault(); onSave(item); }}>
      <div className="catalog-form-tabs"><span className="active">Basic Details</span><span>{isPackage ? "Package Contents" : isService ? "Service Details" : "Pricing & Inventory"}</span><span>Media</span><span>SEO & Display</span><span>Additional Info</span></div>
      <section className="catalog-form-section"><h3>1. Basic Information</h3><div className="catalog-form-grid two"><Field label={`${KIND_LABELS[modal.kind]} Name`} required><input value={item.name} onChange={(e) => { const name = e.target.value; setItem((p) => ({ ...p, name, slug: !p.slug ? sanitizeSlug(name) : p.slug })); }} placeholder="e.g. Floral Stage Setup" /></Field><Field label="SKU"><input value={item.sku || ""} onChange={(e) => set("sku", e.target.value)} placeholder="e.g. NLE-DEC-001" /></Field></div><Field label="Short Description" required><textarea rows="2" maxLength={200} value={item.shortDescription} onChange={(e) => set("shortDescription", e.target.value)} placeholder="A short catchy description shown in list view" /></Field><Field label="Full Description"><textarea rows="4" value={item.description} onChange={(e) => set("description", e.target.value)} placeholder="Write detailed description, dimensions, materials, inclusions, deliverables, etc." /></Field></section>
      <section className="catalog-form-section"><h3>2. Occasion, Function & Service Category</h3><div className="catalog-form-grid three"><Field label="Occasions" required><select value={item.occasionSlug || "wedding"} onChange={(e) => set("occasionSlug", e.target.value)}>{(isService ? occasions : occasions.filter((o) => !o.addonOnly)).map((o) => <option key={o.slug} value={o.slug}>{o.label}</option>)}</select></Field><Field label="Category / Theme" required><select value={(item.categoryPath || []).join("/")} onChange={(e) => set("categoryPath", e.target.value.split("/").filter(Boolean))}><option value="">Select category</option>{options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></Field><Field label="Service Category"><input value={item.serviceCategory || ""} onChange={(e) => set("serviceCategory", e.target.value)} placeholder="e.g. Decor" /></Field></div></section>
      {isPackage && <section className="catalog-form-section"><h3>3. Package Contents</h3><div className="catalog-package-picker"><input placeholder="Search products to add…" value={packageSearch} onChange={(e) => setPackageSearch(e.target.value)} />{packageSearch && <div>{products.filter((p) => p.name.toLowerCase().includes(packageSearch.toLowerCase())).slice(0, 8).map((p) => <button type="button" key={p.id} onClick={() => addPackageItem(p)}><img src={p.image || DEFAULT_IMAGE} alt="" /><span>{p.name}</span><strong>{fmtINR(p.price)}</strong></button>)}</div>}</div><div className="catalog-package-table">{item.packageItems.length ? item.packageItems.map((x) => <div key={x.id}><span>{x.name}</span><input type="number" min="1" value={x.qty} onChange={(e) => updatePackageItem(x.id, "qty", e.target.value)} /><span>{fmtINR(Number(x.price) * Number(x.qty))}</span><button type="button" onClick={() => removePackageItem(x.id)}>×</button></div>) : <p>No items added yet.</p>}</div></section>}
      {isService && <section className="catalog-form-section"><h3>3. Service Details</h3><div className="catalog-form-grid three"><Field label="Service Type"><input value={item.serviceType} onChange={(e) => set("serviceType", e.target.value)} placeholder="Photography, Videography, Both" /></Field><Field label="Coverage Duration"><input value={item.coverageDuration} onChange={(e) => set("coverageDuration", e.target.value)} placeholder="e.g. 8 Hours / Full Day" /></Field><Field label="Team Size"><input value={item.teamSize} onChange={(e) => set("teamSize", e.target.value)} placeholder="e.g. 2 Photographers" /></Field></div><div className="catalog-form-grid two"><Field label="Deliverables"><textarea rows="3" value={item.deliverables} onChange={(e) => set("deliverables", e.target.value)} /></Field><Field label="Process / Workflow"><textarea rows="3" value={item.workflow} onChange={(e) => set("workflow", e.target.value)} /></Field></div></section>}
      <section className="catalog-form-section"><h3>{isPackage || isService ? "4" : "3"}. Pricing & Media</h3><div className="catalog-form-grid four"><Field label="Price Type" required><select value={item.priceType} onChange={(e) => set("priceType", e.target.value)}><option value="starting">Starting From</option><option value="fixed">Fixed Price</option></select></Field><Field label="Price (₹)" required><input type="number" min="1" value={item.price} onChange={(e) => set("price", e.target.value)} placeholder="e.g. 25000" /></Field><Field label="Unit"><select value={item.unit} onChange={(e) => set("unit", e.target.value)}><option>Per Event</option><option>Per Piece</option><option>Per Day</option><option>Per Hour</option></select></Field><Field label="Discount Price"><input type="number" value={item.discountPrice} onChange={(e) => set("discountPrice", e.target.value)} placeholder="e.g. 20000" /></Field></div><ImagePicker value={item.image} onChange={chooseImage} /></section>
      <section className="catalog-form-section"><h3>Status</h3><label className="catalog-switch"><input type="checkbox" checked={item.status === "active"} onChange={(e) => set("status", e.target.checked ? "active" : "draft")} /><span></span><strong>{item.status === "active" ? "Active" : "Draft"}</strong></label></section>
      <div className="catalog-modal-footer"><button type="button" className="btn btn-outline" onClick={() => setModal(null)}>Cancel</button><button className="btn btn-primary"><Icon name="plus" /> {modal.mode === "edit" ? `Save ${KIND_LABELS[modal.kind]}` : `Add ${KIND_LABELS[modal.kind]}`}</button></div>
    </form>
  </div></div>;
}

function CategoryModal({ data, setData, onSave, error }) {
  const cat = data.cat;
  const update = (key, value) => setData((p) => ({ ...p, cat: { ...p.cat, [key]: value } }));
  const isOccasion = Boolean(data.isOccasion);
  return <div className="catalog-modal-backdrop" onMouseDown={() => setData(null)}><div className="catalog-modal catalog-category-modal" onMouseDown={(e) => e.stopPropagation()}><div className="catalog-modal-head"><div><h2>{data.mode === "edit" ? `Edit ${cat.label}` : "Add Category / Theme"}</h2><p>{isOccasion ? "Edit this top-level occasion." : "Create categories at any depth. Every node can have children."}</p></div><button onClick={() => setData(null)}><Icon name="close" /></button></div>{error && <div className="admin-alert admin-alert--error">{error}</div>}<form onSubmit={onSave}><Field label="Parent"><div className="catalog-parent-box">{data.parentLabel || "Top level"}</div></Field><Field label={isOccasion ? "Occasion Name" : "Category / Theme Name"} required><input value={cat.label || ""} onChange={(e) => update("label", e.target.value)} placeholder={isOccasion ? "e.g. Annaprashan" : "e.g. Haldi"} /></Field><Field label="Slug" required><input value={cat.slug || ""} onChange={(e) => update("slug", sanitizeSlug(e.target.value))} placeholder={isOccasion ? "annaprashan" : "haldi"} /></Field>{!isOccasion && <Field label="Node Type"><select value={cat.type || "category"} onChange={(e) => update("type", e.target.value)}><option value="category">Category</option><option value="theme">Theme</option></select></Field>}<Field label="Description"><textarea rows="3" value={cat.description || ""} onChange={(e) => update("description", e.target.value)} /></Field><Field label={isOccasion ? "Occasion Image" : "Category Image"}><ImagePicker value={cat.image} onChange={(url) => update("image", url)} /></Field>{isOccasion && <><Field label="Tagline"><input value={cat.tagline || ""} onChange={(e) => update("tagline", e.target.value)} /></Field><Field label="Hero Image"><ImagePicker value={cat.heroImg || cat.image || ""} onChange={(url) => update("heroImg", url)} /></Field></>}<div className="catalog-modal-footer"><button type="button" className="btn btn-outline" onClick={() => setData(null)}>Cancel</button><button className="btn btn-primary">Save {isOccasion ? "Occasion" : "Category"}</button></div></form></div></div>;
}
