import { cloudinaryAsset } from "../../lib/cloudinaryAssets";
import { CATALOG_IMAGES } from "../../data/images";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Icon from "../../components/Icon";
import ServiceContextPicker from "../../components/admin/ServiceContextPicker";
import ServiceCategoryPicker from "../../components/admin/ServiceCategoryPicker";
import usePageMeta from "../../hooks/usePageMeta";
import {
  getOccasions,
  saveCategoryToCloud,
  deleteCategoryFromCloud,
  saveOccasionToCloud,
  deleteOccasionFromCloud,
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
const DEFAULT_IMAGE = cloudinaryAsset("/assets/images/categories/wedding.webp");

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
    serviceScopes: [],
    inclusionsText: "",
    exclusionsText: "",
    packageItems: [],
    packageOccasions: ["wedding"],
  };
}

function Field({ label, children, required }) {
  return <div className="catalog-field"><label>{label}{required ? <span> *</span> : null}</label>{children}</div>;
}

function ImagePicker({ value, onChange }) {
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  async function uploadFile(file) {
    if (!file) return;
    if (!file.type?.startsWith("image/")) return window.alert("Please choose an image file.");
    setBusy(true);
    try {
      const saved = await uploadMediaFile(file, file.name);
      onChange(saved.url);
    } catch (err) {
      window.alert(err.message || "Unable to upload image.");
    } finally {
      setBusy(false);
    }
  }
  function onFileChange(e) {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    e.target.value = "";
  }
  return (
    <div className={`catalog-image-uploader ${dragging ? "is-dragging" : ""}`}>
      <label
        className="catalog-image-dropzone"
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); uploadFile(e.dataTransfer.files?.[0]); }}
      >
        {value ? <img src={value} alt="Selected" /> : <span className="catalog-image-upload-icon"><Icon name="upload" /></span>}
        <span className="catalog-image-drop-copy"><strong>{busy ? "Uploading image…" : value ? "Change image" : "Upload product image"}</strong><small>{value ? "Click to choose a different image" : "Drag & drop or click to browse"}</small></span>
        <input hidden type="file" accept="image/*" onChange={onFileChange} disabled={busy} />
      </label>
      <div className="catalog-image-url-row">
        <input value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder="Or paste an image URL" aria-label="Image URL" />
        {value && <button type="button" className="catalog-image-clear" onClick={() => onChange("")} title="Remove image"><Icon name="close" /></button>}
      </div>
    </div>
  );
}

function CatalogTreeThumb({ node }) {
  const candidates = Array.from(new Set([node?.image, CATALOG_IMAGES[node?.slug], DEFAULT_IMAGE].filter(Boolean)));
  const [index, setIndex] = useState(0);
  const src = candidates[Math.min(index, Math.max(candidates.length - 1, 0))];
  if (!src) return <span className="catalog-tree-thumb catalog-tree-thumb--empty" aria-hidden="true"><Icon name="image" /></span>;
  return <img
    className="catalog-tree-thumb"
    src={src}
    alt=""
    loading="eager"
    onError={() => setIndex((current) => Math.min(current + 1, candidates.length - 1))}
  />;
}

export default function AdminCatalog() {
  usePageMeta("Catalog — Admin", "Manage occasions, nested categories, products, services and packages.", { noindex: true });
  const [occasions, setOccasions] = useState(getOccasions);
  const [products, setProducts] = useState(getProducts);
  const [activeOccasion, setActiveOccasion] = useState("wedding");
  const [activeCategoryPath, setActiveCategoryPath] = useState([]);
  const [showAllCatalog, setShowAllCatalog] = useState(false);
  const [tab, setTab] = useState("products");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("active");
  const [type, setType] = useState("all");
  const [view, setView] = useState("grid");
  const [sort, setSort] = useState("latest");
  const [addMenu, setAddMenu] = useState(false);
  const [modal, setModal] = useState(null);
  const [categoryModal, setCategoryModal] = useState(null);
  const [expanded, setExpanded] = useState({});
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [statFilter, setStatFilter] = useState("all");
  const [searchParams, setSearchParams] = useSearchParams();

  function refresh() {
    // Event Services is an admin-owned branch. The seed only provides the
    // initial structure; after that, saved cloud/local state is authoritative.
    setOccasions(getOccasions());
    setProducts(getProducts());
  }
  useEffect(() => {
    const fn = () => refresh();
    window.addEventListener("nle-catalog-updated", fn);
    return () => window.removeEventListener("nle-catalog-updated", fn);
  }, []);
  useEffect(() => {
    const requestedTab = searchParams.get("tab");
    if (!["products", "services", "packages"].includes(requestedTab || "")) return;
    setTab(requestedTab);
    setShowAllCatalog(true);
    setSearch("");
    setActiveCategoryPath([]);
    setType(requestedTab === "products" ? "all" : requestedTab === "services" ? "service" : "package");
    setStatFilter("all");
    setActiveOccasion(requestedTab === "services" ? "event-services" : (getOccasions().find((o) => !o.addonOnly)?.slug || "wedding"));
  }, [searchParams]);
  function flash(message) { setFeedback(message); setTimeout(() => setFeedback(""), 2800); }

  const currentOccasion = occasions.find((o) => o.slug === activeOccasion) || occasions[0];
  const displayOccasions = tab === "services" ? occasions.filter((o) => o.addonOnly) : occasions.filter((o) => !o.addonOnly);
  const allCategoryOptions = useMemo(() => walkOptions(occasions), [occasions]);
  const activeCategory = useMemo(() => {
    let node = currentOccasion;
    for (const slug of activeCategoryPath) node = (node?.children || []).find((c) => c.slug === slug);
    return node || currentOccasion;
  }, [currentOccasion, activeCategoryPath]);
  const categoryProducts = useMemo(() => {
    if (tab === "packages") {
      return products.filter((p) => p.catalogKind === "package");
    }
    const isServiceTab = tab === "services";
    const catalogProducts = products.filter((p) => {
      const kind = p.catalogKind || (p.isAddon ? "service" : "product");
      const isService = kind === "service" || p.isAddon === true || p.occasionSlug === "event-services" || (Array.isArray(p.categoryPath) && p.categoryPath[0] === "event-services");
      if (isServiceTab) return isService;
      if (tab === "products") return !isService && kind === "product";
      return !isService;
    });
    if (showAllCatalog) return catalogProducts;
    const path = [activeOccasion, ...activeCategoryPath].join("/");
    return catalogProducts.filter((p) => {
      const productPath = (p.categoryPath || []).join("/");
      if (productPath === path) return true;
      return !activeCategoryPath.length && p.occasionSlug === activeOccasion && !(p.categoryPath || []).length;
    });
  }, [products, activeOccasion, activeCategoryPath, showAllCatalog, tab]);
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

  function selectOccasion(slug) { setStatFilter("all"); setShowAllCatalog(false); setActiveOccasion(slug); setActiveCategoryPath([]); }
  function selectCategory(path) { setStatFilter("all"); setShowAllCatalog(false); setActiveCategoryPath(path); }
  function selectAllCatalog() {
    setStatFilter("all");
    setTab("products");
    setShowAllCatalog(true);
    setActiveCategoryPath([]);
    setType("all");
    setStatus("all");
    setSearch("");
    setActiveOccasion(getOccasions().find((o) => !o.addonOnly)?.slug || "wedding");
  }
  function selectStatFilter(filter) {
    setStatFilter(filter);
    setShowAllCatalog(true);
    setActiveCategoryPath([]);
    setStatus(filter === "active" ? "active" : "all");
    setSearch("");
    if (filter === "services") {
      setTab("services");
      setType("service");
    } else if (filter === "packages") {
      setTab("packages");
      setType("package");
    } else {
      setTab("products");
      setType("all");
    }
    setActiveOccasion(getOccasions().find((o) => !o.addonOnly)?.slug || "wedding");
  }
  function openAdd(kind) {
    setAddMenu(false);
    const item = initialItem(kind);
    item.occasionSlug = kind === "service" ? "event-services" : activeOccasion;
    item.categoryPath = kind === "service" ? ((getAddonCategoryOptions()[0]?.path) || ["event-services"]) : [activeOccasion, ...activeCategoryPath];
    if (kind === "package") {
      item.packageOccasions = [activeOccasion || "wedding"];
      item.categoryPath = [activeOccasion || "wedding"];
    }
    setModal({ mode: "create", kind, item });
  }
  function openEdit(product) {
    const kind = product.catalogKind || (product.isAddon ? "service" : "product");
    const packageOccasions = Array.isArray(product.packageOccasions) && product.packageOccasions.length
      ? product.packageOccasions
      : (Array.isArray(product.occasions) && product.occasions.length ? product.occasions : [product.occasionSlug || "wedding"]);
    setModal({ mode: "edit", kind, item: { ...initialItem(kind), ...product, packageItems: product.packageItems || [], packageOccasions } });
  }
  async function saveItem(item) {
    setError("");
    if (!item.name.trim()) return setError("Name is required.");
    if (!item.price || Number(item.price) <= 0) return setError("Enter a valid price.");
    if (modal.kind !== "package" && !item.categoryPath?.length) return setError(modal.kind === "service" ? "Choose a service category." : "Choose a catalog category.");
    if (modal.kind === "service" && item.categoryPath[0] !== "event-services") return setError("Choose a category from Event Services.");
    if (modal.kind === "package" && !item.packageItems?.length) return setError("Add at least one product or service to this package.");
    if (modal.kind === "package" && (!Array.isArray(item.packageOccasions) || !item.packageOccasions.length)) return setError("Select at least one occasion for this package.");
    try {
      const primaryImg = item.image || (Array.isArray(item.images) && item.images[0]) || (Array.isArray(item.gallery) && item.gallery[0]) || DEFAULT_IMAGE;
      const gallery = Array.from(new Set([
        primaryImg,
        ...(Array.isArray(item.images) ? item.images : []),
        ...(Array.isArray(item.gallery) ? item.gallery : []),
      ].filter(Boolean)));
      const saved = await saveProductToCloud({
        ...item,
        slug: sanitizeSlug(item.slug || item.name),
        catalogKind: modal.kind,
        isAddon: modal.kind === "service",
        occasionSlug: modal.kind === "service" ? "event-services" : (modal.kind === "package" ? (item.packageOccasions?.[0] || item.categoryPath?.[0] || "wedding") : item.categoryPath[0]),
        categoryPath: modal.kind === "service" ? item.categoryPath : (modal.kind === "package" ? [item.packageOccasions?.[0] || item.categoryPath?.[0] || "wedding"] : item.categoryPath),
        packageOccasions: modal.kind === "package" ? item.packageOccasions : [],
        categorySlug: item.categoryPath[item.categoryPath.length - 1],
        image: primaryImg,
        images: gallery,
        gallery: gallery,
        originalPrice: item.originalPrice || null,
        packageItems: modal.kind === "package" ? item.packageItems : [],
        includes: modal.kind === "package" ? item.packageItems.map((x) => x.name) : String(item.inclusionsText || "").split("\n").map((x) => x.trim()).filter(Boolean),
        notIncluded: String(item.exclusionsText || "").split("\n").map((x) => x.trim()).filter(Boolean),
        description: item.description || item.shortDescription,
      });
      refresh(); setModal(null); flash(`${KIND_LABELS[modal.kind]} "${saved.name}" saved successfully.`);
    } catch (err) { setError(err.message || "Unable to save item."); }
  }
  async function removeItem(product) {
    if (!window.confirm(`Delete "${product.name}"? This cannot be undone.`)) return;
    try {
      await deleteProduct(product.id || product.slug);
      refresh();
      flash(`Deleted "${product.name}".`);
    } catch (err) {
      setError(err.message || "Unable to delete product from the cloud.");
    }
  }
  async function duplicateItem(product) {
    try {
      const copy = await duplicateProduct(product.id || product.slug);
      if (copy) { refresh(); flash(`Created copy "${copy.name}".`); }
    } catch (err) {
      setError(err.message || "Unable to duplicate product in the cloud.");
    }
  }

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
  async function removeOccasion(occasion) {
    if (!window.confirm(`Delete "${occasion.label}" and all of its nested categories?`)) return;
    try {
      await deleteOccasionFromCloud(occasion.slug);
      const remaining = getOccasions().filter((o) => !o.addonOnly);
      if (activeOccasion === occasion.slug) {
        setActiveOccasion(remaining[0]?.slug || "wedding");
        setActiveCategoryPath([]);
      }
      refresh();
      flash(`Deleted "${occasion.label}".`);
    } catch (err) {
      setError(err.message || "Unable to delete occasion from the cloud.");
    }
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
  async function saveCategoryForm(e) {
    e.preventDefault(); setError("");
    const c = categoryModal.cat;
    if (!c.label.trim()) return setError(categoryModal.isOccasion ? "Occasion name is required." : "Category name is required.");
    try {
      if (categoryModal.isOccasion) {
        await saveOccasionToCloud({ ...c, slug: sanitizeSlug(c.slug || c.label) });
      } else {
        await saveCategoryToCloud(categoryModal.occasionSlug, { ...c, slug: sanitizeSlug(c.slug || c.label), parentCategorySlug: categoryModal.parentCategorySlug || null });
      }
      refresh(); setCategoryModal(null); flash(`Saved ${categoryModal.isOccasion ? "occasion" : "category"} "${c.label}".`);
    } catch (err) { setError(err.message || "Unable to save category to the cloud."); }
  }
  async function removeCategory(occasionSlug, trail) {
    const node = trail[trail.length - 1];
    const parent = trail[trail.length - 2];
    if (!window.confirm(`Delete "${node.label}" and its nested categories?`)) return;
    try {
      await deleteCategoryFromCloud(occasionSlug, node.slug, parent?.slug || null);
      refresh();
      if (activeCategoryPath.join("/") === trail.map((n) => n.slug).join("/")) setActiveCategoryPath(parent ? trail.slice(0, -1).map((n) => n.slug) : []);
      flash(`Deleted "${node.label}".`);
    } catch (err) {
      setError(err.message || "Unable to delete category from the cloud.");
    }
  }
  function toggleNode(key) { setExpanded((p) => ({ ...p, [key]: p[key] === false })); }

  function countProductsForPath(occasionSlug, categoryPath = []) {
    const isServiceTab = tab === "services";
    return products.filter((p) => {
      const isService = p.catalogKind === "service" || p.isAddon === true || p.occasionSlug === "event-services" || (Array.isArray(p.categoryPath) && p.categoryPath[0] === "event-services");
      if (isService !== isServiceTab) return false;
      const kind = p.catalogKind || (p.isAddon ? "service" : "product");
      if (tab === "products" && kind !== "product") return false;
      if (tab === "packages" && kind !== "package") return false;
      const path = Array.isArray(p.categoryPath) ? p.categoryPath : [];
      if (path[0] !== occasionSlug) return false;
      return categoryPath.every((slug, index) => path[index + 1] === slug);
    }).length;
  }

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
          <button type="button" className="catalog-tree-label" onClick={() => selectCategory(next.map((n) => n.slug))}><CatalogTreeThumb node={node} /><span>{node.label}</span><em>{countProductsForPath(currentOccasion.slug, next.map((n) => n.slug))}</em></button>
          <button type="button" className="catalog-mini-action" title="Add child" onClick={() => openChildEditor(currentOccasion.slug, next)}><Icon name="plus" /></button>
          <button type="button" className="catalog-mini-action" title="Edit" onClick={() => openCategoryEditor(currentOccasion.slug, next, "edit")}><Icon name="edit" /></button>
          <button type="button" className="catalog-mini-action danger" title="Delete" onClick={() => removeCategory(currentOccasion.slug, next)}><Icon name="trash" /></button>
        </div>
        {open && hasChildren && renderTree(node.children, next, depth + 1)}
      </div>;
    });
  }

  const catalogNodes = useMemo(() => {
    const out = [];
    const walk = (nodes, occasion, trail = []) => {
      (nodes || []).forEach((node) => {
        const next = [...trail, node];
        out.push({
          entityType: "function",
          id: `function:${occasion.slug}:${next.map((n) => n.slug).join("/")}`,
          name: node.label,
          typeLabel: node.type === "theme" ? "Theme" : "Function / Category",
          image: node.image || DEFAULT_IMAGE,
          occasionLabel: occasion.label,
          occasionSlug: occasion.slug,
          trail: next,
          status: "active",
        });
        walk(node.children, occasion, next);
      });
    };
    occasions.filter((o) => !o.addonOnly).forEach((occasion) => {
      out.push({
        entityType: "occasion",
        id: `occasion:${occasion.slug}`,
        name: occasion.label,
        typeLabel: "Occasion",
        image: occasion.image || DEFAULT_IMAGE,
        occasionLabel: occasion.label,
        occasionSlug: occasion.slug,
        trail: [],
        status: "active",
      });
      walk(occasion.children, occasion);
    });
    return out;
  }, [occasions]);

  const statEntities = useMemo(() => {
    const q = search.trim().toLowerCase();
    const sellables = products.filter((p) => {
      const kind = p.catalogKind || (p.isAddon ? "service" : "product");
      if (statFilter === "services") return kind === "service";
      if (statFilter === "packages") return kind === "package";
      if (statFilter === "active") return p.status === "active";
      return kind !== "service";
    });
    if (statFilter === "occasions" || statFilter === "functions") {
      return catalogNodes.filter((x) => statFilter === "occasions" ? x.entityType === "occasion" : x.entityType === "function")
        .filter((x) => !q || `${x.name} ${x.occasionLabel} ${x.typeLabel}`.toLowerCase().includes(q));
    }
    const structural = statFilter === "active" ? catalogNodes : [];
    const normalized = sellables
      .filter((p) => !q || [p.name, p.slug, p.sku, p.serviceCategory].some((v) => String(v || "").toLowerCase().includes(q)))
      .map((p) => ({ entityType: "item", product: p, id: p.id || p.slug }));
    return [...structural, ...normalized];
  }, [products, catalogNodes, statFilter, search]);

  const stats = {
    total: products.filter((p) => p.catalogKind !== "service" && p.isAddon !== true).length,
    occasions: occasions.filter((o) => !o.addonOnly).length,
    categories: occasions.filter((o) => !o.addonOnly).reduce((n, o) => n + countAll(o.children || []), 0),
    services: products.filter((p) => p.catalogKind === "service" || p.isAddon).length,
    packages: products.filter((p) => p.catalogKind === "package").length,
    active: products.filter((p) => p.status === "active").length,
  };

  const productCount = products.filter((p) => (p.catalogKind || (p.isAddon ? "service" : "product")) === "product" && !p.isAddon).length;
  const packageCount = products.filter((p) => (p.catalogKind || "product") === "package").length;
  const serviceCount = products.filter((p) => (p.catalogKind || (p.isAddon ? "service" : "product")) === "service" || p.isAddon).length;
  const activeCount = products.filter((p) => p.status === "active").length;
  const categoryLabel = activeCategoryPath.length
    ? activeCategoryPath.map((slug) => flattenTree(currentOccasion?.children || []).find((x) => x.node.slug === slug)?.node.label || slug).join(" / ")
    : "All categories";

  return <div className="admin-page catalog-modern-page">
    <div className="catalog-modern-head">
      <div>
        <div className="catalog-breadcrumb">Dashboard <span>›</span> Catalog</div>
        <div className="catalog-title-row">
          <div>
            <h1>{tab === "products" ? "Products" : tab === "packages" ? "Packages" : "Event Services"}</h1>
            <p>{tab === "products" ? "Add and manage every physical decor item, setup and product shown on your website." : tab === "packages" ? "Build reusable event packages from your products and services." : "Manage customer-facing event services in their dedicated catalog."}</p>
          </div>
          <div className="catalog-head-actions">
            <button type="button" className="btn btn-outline catalog-head-secondary" onClick={() => { setShowAllCatalog(true); setActiveCategoryPath([]); setSearch(""); }}><Icon name="search" /> Browse all</button>
            <div className="catalog-inline-add-wrap">
              <button type="button" className="btn btn-primary catalog-main-add" onClick={() => setAddMenu((v) => !v)}><Icon name="plus" /> {tab === "products" ? "Add Product" : tab === "packages" ? "Add Package" : "Add Service"} <span>⌄</span></button>
              {addMenu && <div className="catalog-add-menu catalog-add-menu--header">
                <button type="button" onClick={() => openAdd("product")}><Icon name="package" /><span><strong>Add Product</strong><small>Stage, sofa, backdrop, lighting, decor…</small></span></button>
                <button type="button" onClick={() => openAdd("package")}><Icon name="layers" /><span><strong>Add Package</strong><small>Bundle products and services</small></span></button>
                <button type="button" onClick={() => openAdd("service")}><Icon name="settings" /><span><strong>Add Event Service</strong><small>Photography, catering, artists…</small></span></button>
              </div>}
            </div>
          </div>
        </div>
      </div>
    </div>

    {feedback && <div className="admin-alert admin-alert--success">{feedback}</div>}
    {error && !modal && !categoryModal && <div className="admin-alert admin-alert--error">{error}</div>}

    <div className="catalog-modern-tabs" role="tablist" aria-label="Catalog type">
      {[['products','Products',productCount],['packages','Packages',packageCount],['services','Event Services',serviceCount]].map(([key,label,count]) => <button key={key} type="button" className={tab === key ? "active" : ""} onClick={() => {
        setTab(key); setSearchParams({ tab: key }); setShowAllCatalog(false); setSearch(""); setActiveCategoryPath([]); setStatFilter("all");
        setType(key === "products" ? "product" : key === "services" ? "service" : "package");
        setActiveOccasion(key === "services" ? "event-services" : (getOccasions().find((o) => !o.addonOnly)?.slug || "wedding"));
      }}><span>{label}</span><b>{count}</b></button>)}
    </div>

    <div className="catalog-modern-stats">
      <div><span className="catalog-stat-icon"><Icon name="package" /></span><div><strong>{productCount}</strong><small>Products</small></div></div>
      <div><span className="catalog-stat-icon"><Icon name="layers" /></span><div><strong>{packageCount}</strong><small>Packages</small></div></div>
      <div><span className="catalog-stat-icon"><Icon name="settings" /></span><div><strong>{serviceCount}</strong><small>Services</small></div></div>
      <div><span className="catalog-stat-icon catalog-stat-icon--success">✓</span><div><strong>{activeCount}</strong><small>Active listings</small></div></div>
    </div>

    <div className="catalog-modern-workspace">
      <aside className="catalog-modern-sidebar">
        <div className="catalog-modern-sidebar-head">
          <div><span>CATALOG STRUCTURE</span><h2>{tab === "services" ? "Service categories" : "Shop categories"}</h2></div>
          <button type="button" className="catalog-sidebar-add" title="Add category" onClick={() => openCategoryEditor(activeOccasion, [])}><Icon name="plus" /></button>
        </div>
        <div className="catalog-occasion-stack">
          {displayOccasions.map((o) => <div key={o.slug} className={`catalog-occasion-block ${o.slug === activeOccasion ? "active" : ""}`}>
            <div className="catalog-modern-occasion-row">
              <button type="button" onClick={() => selectOccasion(o.slug)} className="catalog-modern-occasion-select">
                <CatalogTreeThumb node={o} /><span>{o.label}</span><b>{countProductsForPath(o.slug, [])}</b>
              </button>
              <div className="catalog-occasion-actions">
                <button type="button" title="Edit occasion" onClick={() => openOccasionEditor(o)}><Icon name="edit" /></button>
              </div>
            </div>
            {o.slug === activeOccasion && <div className="catalog-modern-tree">{renderTree(o.children || [])}</div>}
          </div>)}
        </div>
        {tab !== "services" && <div className="catalog-sidebar-tip"><strong>Tip</strong><p>Select a function such as <b>Haldi</b> or <b>Mehndi</b> to see only the products assigned to it.</p></div>}
      </aside>

      <section className="catalog-modern-main">
        <div className="catalog-modern-main-head">
          <div>
            <div className="catalog-path">{currentOccasion?.label || "Catalog"} <span>›</span> {categoryLabel}</div>
            <h2>{showAllCatalog ? "All products" : tab === "services" ? (activeCategory?.label || "Event Services") : activeCategory?.label || currentOccasion?.label}</h2>
            <p>{visibleProducts.length} {tab === "products" ? "product" : tab === "packages" ? "package" : "service"}{visibleProducts.length === 1 ? "" : "s"} in this view</p>
          </div>
          <div className="catalog-main-quick-actions">
            {tab === "products" && <button type="button" className="catalog-quick-add" onClick={() => openAdd("product")}><Icon name="plus" /> Add product</button>}
            {tab === "packages" && <button type="button" className="catalog-quick-add" onClick={() => openAdd("package")}><Icon name="plus" /> Add package</button>}
            {tab === "services" && <button type="button" className="catalog-quick-add" onClick={() => openAdd("service")}><Icon name="plus" /> Add service</button>}
          </div>
        </div>

        <div className="catalog-modern-toolbar">
          <div className="catalog-modern-search"><Icon name="search" /><input aria-label="Search catalog" placeholder={tab === "products" ? "Search products by name or SKU…" : tab === "packages" ? "Search packages…" : "Search services…"} value={search} onChange={(e) => setSearch(e.target.value)} /></div>
          <div className="catalog-modern-filters">
            {tab !== "services" && <select value={type} onChange={(e) => setType(e.target.value)}><option value={tab === "packages" ? "package" : "product"}>{tab === "packages" ? "Packages" : "Products"}</option><option value="all">All types</option></select>}
            <select value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">All statuses</option><option value="active">Active</option><option value="draft">Draft</option><option value="archived">Archived</option></select>
            <select value={sort} onChange={(e) => setSort(e.target.value)}><option value="latest">Recently updated</option><option value="name">Name</option><option value="price">Price</option></select>
            <div className="catalog-view-toggle"><button type="button" className={view === "grid" ? "active" : ""} onClick={() => setView("grid")}><Icon name="grid" /></button><button type="button" className={view === "list" ? "active" : ""} onClick={() => setView("list")}><Icon name="list" /></button></div>
          </div>
        </div>

        {view === "grid" ? <div className="catalog-modern-grid">{visibleProducts.map((p) => <ProductCard key={p.id || p.slug} p={p} onEdit={openEdit} onDelete={removeItem} onDuplicate={duplicateItem} />)}</div> : <div className="catalog-product-table catalog-modern-table"><table><thead><tr><th>Product</th><th>Category</th><th>Type</th><th>Price</th><th>Status</th><th>Actions</th></tr></thead><tbody>{visibleProducts.map((p) => <ProductRow key={p.id || p.slug} p={p} onEdit={openEdit} onDelete={removeItem} onDuplicate={duplicateItem} />)}</tbody></table></div>}

        {!visibleProducts.length && <div className="catalog-modern-empty">
          <div className="catalog-empty-icon"><Icon name="package" /></div>
          <h3>{search ? "No matching products" : "This category is empty"}</h3>
          <p>{search ? "Try a different search term or clear the filters." : "Add the first product here. You can upload its image, choose its category and set the price in one simple form."}</p>
          {!search && tab === "products" && <button type="button" className="btn btn-primary" onClick={() => openAdd("product")}><Icon name="plus" /> Add your first product</button>}
        </div>}
      </section>
    </div>

    {modal && <ItemModal modal={modal} setModal={setModal} occasions={occasions} categoryOptions={[...allCategoryOptions, ...getAddonCategoryOptions()]} onSave={saveItem} error={error} setError={setError} />}
    {categoryModal && <CategoryModal data={categoryModal} setData={setCategoryModal} onSave={saveCategoryForm} error={error} setError={setError} />}
  </div>;
}

function ProductRow({ p, onEdit, onDelete, onDuplicate }) {
  const kind = p.catalogKind || (p.isAddon ? "service" : "product");
  const rawCategory = p.categorySlug || (Array.isArray(p.categoryPath) ? p.categoryPath[p.categoryPath.length - 1] : "");
  const category = String(rawCategory || "Uncategorised").replace(/[-_]+/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
  return <tr>
    <td><div className="catalog-table-product"><img className="catalog-thumb" src={p.image || DEFAULT_IMAGE} alt={p.name || "Product"} /><div><strong>{p.name}</strong><small>{p.shortDescription || p.description || "No description added"}</small></div></div></td>
    <td><span className="catalog-table-category">{category}</span></td>
    <td><span className={`catalog-type-badge ${kind}`}>{KIND_LABELS[kind]}</span></td>
    <td><strong>{fmtINR(p.price)}</strong><small>{p.unit || "Per Event"}</small></td>
    <td><span className={`catalog-status ${p.status}`}>{p.status === "active" ? "Active" : p.status}</span></td>
    <td><div className="catalog-actions"><button title="Edit" onClick={() => onEdit(p)}><Icon name="edit" /></button><button title="Duplicate" onClick={() => onDuplicate(p)}><Icon name="copy" /></button><button className="danger" title="Delete" onClick={() => onDelete(p)}><Icon name="trash" /></button></div></td>
  </tr>;
}
function ProductCard({ p, onEdit, onDelete, onDuplicate }) { const kind = p.catalogKind || (p.isAddon ? "service" : "product"); return <article className="catalog-card"><img src={p.image || DEFAULT_IMAGE} alt={p.name || "Product"} /><div><span className={`catalog-type-badge ${kind}`}>{KIND_LABELS[kind]}</span><h3>{p.name}</h3><p>{p.shortDescription || p.description}</p><strong>{fmtINR(p.price)}</strong><div><button onClick={() => onEdit(p)}>Edit</button><button onClick={() => onDuplicate(p)}>Duplicate</button><button onClick={() => onDelete(p)}>Delete</button></div></div></article>; }

function ItemModal({ modal, setModal, occasions, categoryOptions, onSave, error, setError }) {
  const [item, setItem] = useState(modal.item);
  const [packageSearch, setPackageSearch] = useState("");
  const products = getProducts().filter((p) => p.catalogKind !== "package");
  const set = (key, value) => setItem((p) => ({ ...p, [key]: value }));
  const isPackage = modal.kind === "package";
  const isService = modal.kind === "service";
  // Service categories come only from the persisted Event Services branch.
  // Add-on options use `path` rather than the normal occasion option shape.
  // Normalize both shapes here so every saved service category is selectable.
  const options = isService
    ? categoryOptions.filter((x) => (
        x.occasionSlug === "event-services"
        || String(x.value || "").startsWith("event-services/")
        || (Array.isArray(x.path) && x.path[0] === "event-services")
      ))
    : categoryOptions;
  function chooseImage(url) { set("image", url); }
  function addPackageItem(product) { if (!item.packageItems.some((x) => (x.productId || x.id) === product.id)) set("packageItems", [...item.packageItems, { productId: product.id, id: product.id, name: product.name, qty: 1, price: product.price, image: product.image || "" }]); }
  function updatePackageItem(id, key, value) { set("packageItems", item.packageItems.map((x) => x.id === id ? { ...x, [key]: key === "qty" ? Math.max(1, Number(value) || 1) : value } : x)); }
  function removePackageItem(id) { set("packageItems", item.packageItems.filter((x) => x.id !== id)); }
  const packageItemsTotal = item.packageItems.reduce((sum, x) => sum + (Number(x.price) || 0) * (Number(x.qty) || 1), 0);
  return <div className="catalog-modal-backdrop" onMouseDown={() => setModal(null)}><div className="catalog-modal catalog-item-modal" onMouseDown={(e) => e.stopPropagation()}>
    <div className="catalog-modal-head"><div><h2>{modal.mode === "edit" ? `Edit ${KIND_LABELS[modal.kind]}` : `Add New ${KIND_LABELS[modal.kind]}`}</h2><p>{modal.mode === "edit" ? "Update this catalog item and its placement." : `Create a new ${KIND_LABELS[modal.kind].toLowerCase()} for your catalog.`}</p></div><button onClick={() => setModal(null)}><Icon name="close" /></button></div>
    <div className="catalog-kind-cards">{["product","package","service"].map((k) => <button type="button" key={k} className={modal.kind === k ? "selected" : ""} onClick={() => setModal({ ...modal, kind: k, item: { ...initialItem(k), ...item, catalogKind: k } })}><Icon name={k === "service" ? "settings" : k === "package" ? "layers" : "package"} /><span><strong>{KIND_LABELS[k]}{k === "product" ? " / Element" : ""}</strong><small>{k === "product" ? "Individual item like stage, sofa, backdrop, light" : k === "package" ? "Pre-defined package of multiple items" : "Non-tangible service such as photography or catering"}</small></span>{modal.kind === k && <b>✓</b>}</button>)}</div>
    {error && <div className="admin-alert admin-alert--error">{error}</div>}
    <form onSubmit={(e) => { e.preventDefault(); onSave(item); }}>
      <div className="catalog-form-tabs"><span className="active">Basic Details</span><span>{isPackage ? "Package Contents" : isService ? "Service Details" : "Pricing & Inventory"}</span><span>Media</span><span>SEO & Display</span><span>Additional Info</span></div>
      <section className="catalog-form-section"><h3>1. Basic Information</h3><div className="catalog-form-grid two"><Field label={`${KIND_LABELS[modal.kind]} Name`} required><input value={item.name} onChange={(e) => { const name = e.target.value; setItem((p) => ({ ...p, name, slug: !p.slug ? sanitizeSlug(name) : p.slug })); }} placeholder="e.g. Floral Stage Setup" /></Field><Field label="SKU"><input value={item.sku || ""} onChange={(e) => set("sku", e.target.value)} placeholder="e.g. NLE-DEC-001" /></Field></div><Field label="Short Description" required><textarea rows="2" maxLength={200} value={item.shortDescription} onChange={(e) => set("shortDescription", e.target.value)} placeholder="A short catchy description shown in list view" /></Field><Field label="Full Description"><textarea rows="4" value={item.description} onChange={(e) => set("description", e.target.value)} placeholder="Write detailed description, dimensions, materials, inclusions, deliverables, etc." /></Field></section>
      {!isPackage && <section className="catalog-form-section"><h3>2. {isService ? "Service category" : "Occasion, Function & Category"}</h3><div className={`catalog-form-grid ${isService ? "two" : "three"}`}>{!isService && <Field label="Occasions" required><select value={item.occasionSlug || "wedding"} onChange={(e) => set("occasionSlug", e.target.value)}>{occasions.filter((o) => !o.addonOnly).map((o) => <option key={o.slug} value={o.slug}>{o.label}</option>)}</select></Field>}<Field label={isService ? "What service is this?" : "Category / Theme"} required>{isService ? <ServiceCategoryPicker options={options} value={item.categoryPath} onChange={(path) => { const selected = options.find((o) => (o.value || (Array.isArray(o.path) ? o.path.join("/") : "")) === path.join("/")); setItem((p) => ({ ...p, categoryPath: path, occasionSlug: "event-services", serviceCategory: selected?.label || selected?.displayLabel || "" })); }} /> : <select value={(item.categoryPath || []).join("/")} onChange={(e) => { const path = e.target.value.split("/").filter(Boolean); const selected = options.find((o) => (o.value || (Array.isArray(o.path) ? o.path.join("/") : "")) === e.target.value); setItem((p) => ({ ...p, categoryPath: path, occasionSlug: path[0] || p.occasionSlug, serviceCategory: selected?.label || p.serviceCategory })); }}><option value="">Select category</option>{options.map((o) => { const value = o.value || (Array.isArray(o.path) ? o.path.join("/") : ""); return <option key={value} value={value}>{o.label}</option>; })}</select>}{isService && <small className="catalog-field-help">Pick the category that describes this service. This is where the service belongs in the catalog.</small>}</Field>{!isService && <Field label="Service Category"><input value={item.serviceCategory || ""} onChange={(e) => set("serviceCategory", e.target.value)} placeholder="e.g. Decor" /></Field>}</div></section>}
      {isPackage && <section className="catalog-form-section"><h3>2. Package Occasions</h3><Field label="Show this package for occasions"><div className="catalog-occasion-checks" role="group" aria-label="Package occasions">{occasions.filter((o) => !o.addonOnly).map((occasion) => { const selected = Array.isArray(item.packageOccasions) && item.packageOccasions.includes(occasion.slug); return <label className={`catalog-occasion-check ${selected ? "selected" : ""}`} key={occasion.slug}><input type="checkbox" checked={selected} onChange={(e) => { const current = Array.isArray(item.packageOccasions) ? item.packageOccasions : []; const next = e.target.checked ? Array.from(new Set([...current, occasion.slug])) : current.filter((slug) => slug !== occasion.slug); set("packageOccasions", next); }} /><span className="catalog-check-box" aria-hidden="true">{selected ? "✓" : ""}</span><span>{occasion.label}</span></label>; })}</div><small className="catalog-field-help">Select every occasion where this package should be available.</small></Field></section>}
      {isPackage && <section className="catalog-form-section"><h3>3. Package Contents</h3><div className="catalog-package-picker"><input placeholder="Search products or services to add…" value={packageSearch} onChange={(e) => setPackageSearch(e.target.value)} />{packageSearch && <div>{products.filter((p) => p.catalogKind !== "package" && p.status === "active" && p.name.toLowerCase().includes(packageSearch.toLowerCase())).slice(0, 8).map((p) => { const isAdded = item.packageItems.some((x) => (x.productId || x.id) === p.id); return <button type="button" key={p.id} className={isAdded ? "added" : ""} onClick={() => addPackageItem(p)} disabled={isAdded}><img src={p.image || DEFAULT_IMAGE} alt={p.name || "Product"} /><span>{p.name}<small style={{ display: "block", opacity: 0.65 }}>{p.catalogKind === "service" || p.isAddon ? "Service" : "Product"}</small></span>{isAdded ? <strong className="catalog-package-added-label">Added</strong> : <strong>{fmtINR(p.price)}</strong>}</button>; })}</div>}</div><div className="catalog-package-table">{item.packageItems.length ? item.packageItems.map((x) => <div key={x.id}><span>{x.name}</span><input type="number" min="1" value={x.qty} onChange={(e) => updatePackageItem(x.id, "qty", e.target.value)} /><span>{fmtINR(Number(x.price) * Number(x.qty))}</span><button type="button" onClick={() => removePackageItem(x.id)}>×</button></div>) : <p>No items added yet.</p>}</div><div className="catalog-package-total"><span>Items Total</span><strong>{fmtINR(packageItemsTotal)}</strong></div></section>}
      {isService && <section className="catalog-form-section"><div className="service-visibility-heading"><div><h3>3. Customer visibility</h3><p className="service-simple-intro">Choose where customers will find this service. Select a whole occasion to include every function, or pick specific functions.</p></div><span className="service-visibility-badge">Shown on customer pages</span></div><ServiceContextPicker occasions={occasions} value={item.serviceScopes} onChange={(value) => set("serviceScopes", value)} /></section>}
      {isService && <section className="catalog-form-section"><h3>4. Optional service details</h3><div className="catalog-form-grid three"><Field label="Service Type"><input value={item.serviceType} onChange={(e) => set("serviceType", e.target.value)} placeholder="e.g. Photography" /></Field><Field label="Coverage Duration"><input value={item.coverageDuration} onChange={(e) => set("coverageDuration", e.target.value)} placeholder="e.g. 8 Hours / Full Day" /></Field><Field label="Team Size"><input value={item.teamSize} onChange={(e) => set("teamSize", e.target.value)} placeholder="e.g. 2 People" /></Field></div><div className="catalog-form-grid two"><Field label="Deliverables"><textarea rows="3" value={item.deliverables} onChange={(e) => set("deliverables", e.target.value)} /></Field><Field label="Process / Workflow"><textarea rows="3" value={item.workflow} onChange={(e) => set("workflow", e.target.value)} /></Field></div></section>}
      <section className="catalog-form-section"><h3>{isPackage ? "4" : isService ? "5" : "3"}. Pricing & Media</h3><div className="catalog-form-grid four"><Field label="Price Type" required><select value={item.priceType} onChange={(e) => set("priceType", e.target.value)}><option value="starting">Starting From</option><option value="fixed">Fixed Price</option></select></Field><Field label="Price (₹)" required><input type="number" min="1" value={item.price} onChange={(e) => set("price", e.target.value)} placeholder="e.g. 25000" /></Field><Field label="Unit"><select value={item.unit} onChange={(e) => set("unit", e.target.value)}><option>Per Event</option><option>Per Piece</option><option>Per Day</option><option>Per Hour</option></select></Field><Field label="Discount Price"><input type="number" value={item.discountPrice} onChange={(e) => set("discountPrice", e.target.value)} placeholder="e.g. 20000" /></Field></div><ImagePicker value={item.image} onChange={chooseImage} /></section>
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
