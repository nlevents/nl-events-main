import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getOccasions, getProducts, saveProductToCloud } from "../../lib/catalogStore";
import { fmtINR } from "../../lib/pricing";
import { sanitizeSlug } from "../../lib/sanitize";
import Icon from "../../components/Icon";
import usePageMeta from "../../hooks/usePageMeta";

function flatten(nodes, trail = [], out = []) {
  (nodes || []).forEach((node) => {
    const next = [...trail, node];
    if (node.type !== "product") out.push({ node, trail: next });
    flatten(node.children, next, out);
  });
  return out;
}

export default function AdminCatalogItemForm() {
  usePageMeta("Add New Item — Catalog", "Create a product, package or service.");
  const navigate = useNavigate();
  const occasions = getOccasions();
  const products = getProducts();
  const [itemType, setItemType] = useState("product");
  const [tab, setTab] = useState("basic");
  const [form, setForm] = useState({ name: "", sku: "", shortDesc: "", description: "", occasion: "wedding", categoryPath: [], price: "", originalPrice: "", discountPrice: "", unit: "Per Event", image: "", active: true, serviceType: "", duration: "", teamSize: "", deliverables: "", workflow: "", inclusions: "", exclusions: "", terms: "", includedItems: [] });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const occasion = occasions.find((o) => o.slug === form.occasion) || occasions[0];
  const categories = useMemo(() => flatten(occasion?.children || []), [occasion]);
  const selectedCategory = form.categoryPath.length ? form.categoryPath[form.categoryPath.length - 1] : "";
  const packageItems = products.filter((p) => !p.isAddon && p.status !== "archived");
  const estimated = form.includedItems.reduce((sum, id) => sum + Number(products.find((p) => p.id === id)?.price || 0), 0);

  function update(key, value) { setForm((prev) => ({ ...prev, [key]: value })); }
  function chooseType(type) { setItemType(type); setTab("basic"); }
  function save(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.shortDesc.trim() || !form.price) { setError("Name, short description and price are required."); return; }
    setSaving(true); setError("");
    const categoryPath = [form.occasion, ...form.categoryPath].filter(Boolean);
    const record = {
      name: form.name.trim(), slug: sanitizeSlug(form.name), sku: form.sku.trim(), shortDesc: form.shortDesc.trim(), description: form.description.trim(), image: form.image, price: Number(form.price), originalPrice: Number(form.originalPrice) || null, discountPrice: Number(form.discountPrice) || null, priceType: "Starting From", unit: form.unit, status: form.active ? "active" : "draft", occasionSlug: form.occasion, categorySlug: selectedCategory, categoryPath, type: "product", catalogItemType: itemType, isAddon: itemType === "service", includes: form.inclusions.split("\n").map((x) => x.trim()).filter(Boolean), notIncluded: form.exclusions.split("\n").map((x) => x.trim()).filter(Boolean), includedItems: form.includedItems, serviceType: form.serviceType, coverageDuration: form.duration, teamSize: form.teamSize, deliverables: form.deliverables, workflow: form.workflow, exclusions: form.exclusions, terms: form.terms,
    };
    saveProductToCloud(record).then(() => navigate("/admin/products")).catch((err) => setError(err.message || "Unable to save item.")).finally(() => setSaving(false));
  }

  const typeCards = [
    ["product", "◇", "Product / Element", "Individual item (e.g. stage, sofa, backdrop, light, tent etc.)"],
    ["package", "▱", "Package", "Pre-defined package (e.g. Haldi Decor Package)"],
    ["service", "⚙", "Service", "Non-tangible service (e.g. photography, catering, artist)"],
  ];
  const tabs = itemType === "package" ? [["basic", "Basic Details"], ["contents", "Package Contents"], ["pricing", "Pricing & Inventory"], ["media", "Media"], ["seo", "SEO & Display"], ["additional", "Additional Info"]] : itemType === "service" ? [["basic", "Basic Details"], ["service", "Service Details"], ["pricing", "Pricing"], ["media", "Media"], ["seo", "SEO & Display"], ["additional", "Additional Info"]] : [["basic", "Basic Details"], ["pricing", "Pricing & Inventory"], ["media", "Media"], ["seo", "SEO & Display"], ["additional", "Additional Info"]];

  return <div className="catalog-form-page">
    <div className="catalog-form-top"><div><h1>Add New Item</h1><p>Create a new product, element or package for your catalog</p></div><button onClick={() => navigate("/admin/products")} className="catalog-close">×</button></div>
    <div className="catalog-type-cards">{typeCards.map(([key, icon, title, desc]) => <button type="button" key={key} className={itemType === key ? "selected" : ""} onClick={() => chooseType(key)}><span>{icon}</span><strong>{title}</strong><small>{desc}</small>{itemType === key && <b>✓</b>}</button>)}</div>
    <div className="catalog-form-tabs">{tabs.map(([key, label]) => <button key={key} className={tab === key ? "active" : ""} onClick={() => setTab(key)} type="button">{label}</button>)}</div>
    <form onSubmit={save} className="catalog-form-grid">
      <main className="catalog-form-main">
        {error && <div className="catalog-form-error">{error}</div>}
        {(tab === "basic" || tab === "service") && <>
          <h2>1. Basic Information</h2>
          <div className="catalog-two-col"><label>{itemType === "service" ? "Service Name" : itemType === "package" ? "Package Name" : "Item Name"} *<input value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="e.g. Floral Stage Setup" required/></label><label>SKU (Optional)<input value={form.sku} onChange={(e) => update("sku", e.target.value)} placeholder="e.g. NLE-DEC-001"/></label></div>
          <label>Short Description *<textarea value={form.shortDesc} onChange={(e) => update("shortDesc", e.target.value)} maxLength={200} rows={3} placeholder="A short catchy description (shown in list view)" required/></label>
          <label>Full Description<textarea value={form.description} onChange={(e) => update("description", e.target.value)} rows={4} placeholder="Write detailed description, inclusions, dimensions, materials, workflow etc."/></label>
          <h2>2. Occasion, Function & Service Category</h2>
          <div className="catalog-three-col"><label>Occasions *<select value={form.occasion} onChange={(e) => { update("occasion", e.target.value); update("categoryPath", []); }}><option value="">Select occasion</option>{occasions.map((o) => <option key={o.slug} value={o.slug}>{o.label}</option>)}</select></label><label>Functions / Themes<select value={selectedCategory} onChange={(e) => update("categoryPath", e.target.value ? [e.target.value] : [])}><option value="">Select functions / themes</option>{categories.map(({ node, trail }) => <option key={trail.map((x) => x.slug).join("/")} value={trail[trail.length - 1].slug}>{trail.map((x) => x.label).join(" › ")}</option>)}</select></label><label>Service Category *<select value={selectedCategory} onChange={(e) => update("categoryPath", e.target.value ? [e.target.value] : [])}><option value="">Select service category</option>{categories.map(({ node, trail }) => <option key={`s-${trail.map((x) => x.slug).join("/")}`} value={trail[trail.length - 1].slug}>{trail.map((x) => x.label).join(" › ")}</option>)}</select></label></div>
        </>}
        {tab === "service" && <><h2>3. Service Details</h2><div className="catalog-three-col"><label>Service Type<select value={form.serviceType} onChange={(e) => update("serviceType", e.target.value)}><option value="">Select service type</option><option>Photography</option><option>Videography</option><option>Artist</option><option>Catering</option><option>SFX</option></select></label><label>Coverage Duration<input value={form.duration} onChange={(e) => update("duration", e.target.value)} placeholder="e.g. 8 Hours / Full Day"/></label><label>Team Size<input value={form.teamSize} onChange={(e) => update("teamSize", e.target.value)} placeholder="e.g. 2 Photographers"/></label></div><div className="catalog-two-col"><label>Deliverables<textarea value={form.deliverables} onChange={(e) => update("deliverables", e.target.value)} rows={3} placeholder="e.g. 500 edited photos, 2 min teaser"/></label><label>Process / Workflow<textarea value={form.workflow} onChange={(e) => update("workflow", e.target.value)} rows={3} placeholder="e.g. Shoot → Editing → Delivery"/></label></div></>}
        {tab === "contents" && <><h2>3. Package Contents</h2><p className="catalog-helper">Add products, elements or services included in this package.</p><div className="catalog-package-list">{packageItems.map((p) => <label key={p.id}><input type="checkbox" checked={form.includedItems.includes(p.id)} onChange={(e) => update("includedItems", e.target.checked ? [...form.includedItems, p.id] : form.includedItems.filter((id) => id !== p.id))}/><span>{p.name}</span><em>{fmtINR(p.price || 0)}</em></label>)}</div><div className="catalog-estimate">Estimated Value: <strong>{fmtINR(estimated)}</strong></div></>}
        {(tab === "pricing" || tab === "basic") && <><h2>{itemType === "package" ? "4" : "3"}. Pricing{itemType === "package" ? "" : ""}</h2><div className="catalog-four-col"><label>Price Type *<select><option>Starting From</option><option>Fixed Price</option></select></label><label>Price (₹) *<input type="number" value={form.price} onChange={(e) => update("price", e.target.value)} placeholder="25000" required/></label><label>Unit<select value={form.unit} onChange={(e) => update("unit", e.target.value)}><option>Per Event</option><option>Per Piece</option><option>Per Hour</option></select></label><label>Discount Price<input type="number" value={form.discountPrice} onChange={(e) => update("discountPrice", e.target.value)} placeholder="20000"/></label></div><h2>{itemType === "package" ? "5" : "4"}. Status</h2><label className="catalog-switch-row"><input type="checkbox" checked={form.active} onChange={(e) => update("active", e.target.checked)}/><span className="catalog-switch"/><strong>{form.active ? "Active" : "Draft"}</strong><small>{form.active ? "Item will be visible in website and available for use." : "Item will be hidden from the website."}</small></label></>}
        {tab === "media" && <><h2>Images & Media</h2><label>Cover Image URL<input value={form.image} onChange={(e) => update("image", e.target.value)} placeholder="https://..."/></label><div className="catalog-upload-box">☁<strong>Drag & drop images or click to upload</strong><small>JPG, PNG, WebP recommended</small></div></>}
        {(tab === "seo" || tab === "additional") && <><h2>{tab === "seo" ? "SEO & Display" : "Additional Information"}</h2><label>Notes / Additional Information<textarea rows={8} value={form.terms} onChange={(e) => update("terms", e.target.value)} placeholder="Add display notes, SEO description, internal notes, etc."/></label></>}
      </main>
      <aside className="catalog-preview"><h2>{itemType === "package" ? "Package Preview" : itemType === "service" ? "Service Preview" : "Product Preview"}</h2><div className="catalog-preview-image">{form.image ? <img src={form.image} alt=""/> : <Icon name="image"/>}</div><h3>{form.name || `New ${itemType}`}</h3><strong>{form.price ? fmtINR(Number(form.price)) : "₹ 0"}</strong><p>{form.shortDesc || "A short description will appear here."}</p><div className="catalog-preview-tags"><span>{occasion?.label || "Occasion"}</span>{selectedCategory && <span>{selectedCategory}</span>}</div>{itemType === "package" && <div className="catalog-preview-box"><b>Package Includes</b><small>{form.includedItems.length} item(s)</small></div>}<div className="catalog-preview-box"><b>Media Guidelines</b><small>Use high quality, well-lit images</small><small>Recommended size: 1920 × 1080 px</small></div></aside>
    </form>
    <div className="catalog-form-actions"><button type="button" onClick={() => navigate("/admin/products")}>Cancel</button><button className="catalog-add-button" onClick={save} disabled={saving}>＋ Add {itemType === "package" ? "Package" : itemType === "service" ? "Service" : "Item"}</button></div>
  </div>;
}
