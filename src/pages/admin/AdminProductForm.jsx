import { useState, useEffect } from "react";
import { useParams, useNavigate, Link, useLocation } from "react-router-dom";
import { getProduct, saveProductToCloud, getOccasions, getAddonCategoryOptions } from "../../lib/catalogStore";
import { sanitizeSlug } from "../../lib/sanitize";
import { fmtINR } from "../../lib/pricing";
import { CITIES } from "../../data/cities";
import MediaPickerModal from "../../components/admin/MediaPickerModal";
import Icon from "../../components/Icon";
import usePageMeta from "../../hooks/usePageMeta";

const BADGES = ["", "Bestseller", "Premium", "Popular", "Trending", "New", "Limited"];

export default function AdminProductForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isEditing = Boolean(id);
  const isAddonMode = (location.pathname.startsWith("/admin/services/products") || location.pathname.startsWith("/admin/addons/products"));

  usePageMeta(
    isEditing ? "Edit Product — Admin" : "New Product — Admin",
    "Configure product details, inclusions, services, pricing, and pictures."
  );

  const occasions = getOccasions();
  const addonCategoryOptions = getAddonCategoryOptions();

  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    occasionSlug: isAddonMode ? "event-services" : (occasions[0]?.slug || "wedding"),
    categorySlug: "",
    isAddon: isAddonMode,
    categoryPath: [],
    badge: "",
    shortDesc: "",
    tagline: "",
    description: "",
    price: 49999,
    originalPrice: 59999,
    rating: 4.8,
    reviewCount: 32,
    image: "/assets/images/categories/wedding.webp",
    images: ["/assets/images/categories/wedding.webp"],
    status: "active",
    includes: [
      "Full Stage & Mandap Setup",
      "Fresh Floral Accents",
      "Ambient Lighting Setup",
      "On-Day Event Coordinator",
    ],
    notIncluded: [],
    importantInfo: [],
    setupRequirements: "",
    duration: "",
    requiresTimeSlot: true,
    addons: [
      { name: "Live Music / Band", price: 9999 },
      { name: "360° Photo Booth", price: 6999 },
    ],
    cities: ["Ranchi", "Jamshedpur", "Patna"],
  });

  const [newInclusion, setNewInclusion] = useState("");
  const [newExclusion, setNewExclusion] = useState("");
  const [newImportantInfo, setNewImportantInfo] = useState("");
  const [newAddonName, setNewAddonName] = useState("");
  const [newAddonPrice, setNewAddonPrice] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [savedMessage, setSavedMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEditing) {
      const p = getProduct(id);
      if (p) {
        const galleryImages = Array.from(new Set([
          ...(Array.isArray(p.gallery) ? p.gallery : []),
          ...(Array.isArray(p.images) ? p.images : []),
          ...(p.image ? [p.image] : []),
        ].filter(Boolean)));
        setFormData({
          ...p,
          images: galleryImages,
          gallery: galleryImages,
          image: galleryImages[0] || p.image || "/assets/images/categories/wedding.webp",
          isAddon: Boolean(p.isAddon || p.occasionSlug === "event-services" || (Array.isArray(p.categoryPath) && p.categoryPath[0] === "event-services")),
          price: p.price || 0,
          originalPrice: p.originalPrice || "",
          includes: Array.isArray(p.includes) ? p.includes : [],
          notIncluded: Array.isArray(p.notIncluded) ? p.notIncluded : [],
          importantInfo: Array.isArray(p.importantInfo) ? p.importantInfo : [],
          setupRequirements: p.setupRequirements || "",
          duration: p.duration || "",
          requiresTimeSlot: p.requiresTimeSlot !== false,
          rating: typeof p.rating === "number" ? p.rating : 4.8,
          reviewCount: typeof p.reviewCount === "number" ? p.reviewCount : 0,
          description: p.description || "",
          addons: Array.isArray(p.addons) ? p.addons : [],
          cities: Array.isArray(p.cities) ? p.cities : ["Ranchi", "Jamshedpur"],
          categoryPath: Array.isArray(p.categoryPath) ? p.categoryPath : (p.categorySlug ? [p.occasionSlug, p.categorySlug] : []),
        });
      } else {
        setError(`Product with ID/slug "${id}" not found.`);
      }
    }
  }, [id, isEditing]);

  // Handle auto-slug when typing name if new product
  function handleNameChange(e) {
    const val = e.target.value;
    setFormData((prev) => ({
      ...prev,
      name: val,
      slug: !isEditing && (!prev.slug || prev.slug === sanitizeSlug(prev.name)) ? sanitizeSlug(val) : prev.slug,
    }));
  }

  // Margin and Discount Calculation
  const discountPercent =
    formData.originalPrice && formData.originalPrice > formData.price
      ? Math.round(((formData.originalPrice - formData.price) / formData.originalPrice) * 100)
      : 0;

  function handleAddInclusion(e) {
    e.preventDefault();
    if (!newInclusion.trim()) return;
    setFormData((prev) => ({ ...prev, includes: [...prev.includes, newInclusion.trim()] }));
    setNewInclusion("");
  }

  function handleRemoveInclusion(index) {
    setFormData((prev) => ({
      ...prev,
      includes: prev.includes.filter((_, i) => i !== index),
    }));
  }

  function handleAddExclusion(e) {
    e.preventDefault();
    if (!newExclusion.trim()) return;
    setFormData((prev) => ({ ...prev, notIncluded: [...prev.notIncluded, newExclusion.trim()] }));
    setNewExclusion("");
  }

  function handleRemoveExclusion(index) {
    setFormData((prev) => ({
      ...prev,
      notIncluded: prev.notIncluded.filter((_, i) => i !== index),
    }));
  }

  function handleAddImportantInfo(e) {
    e.preventDefault();
    if (!newImportantInfo.trim()) return;
    setFormData((prev) => ({ ...prev, importantInfo: [...prev.importantInfo, newImportantInfo.trim()] }));
    setNewImportantInfo("");
  }

  function handleRemoveImportantInfo(index) {
    setFormData((prev) => ({
      ...prev,
      importantInfo: prev.importantInfo.filter((_, i) => i !== index),
    }));
  }

  function handleAddAddon(e) {
    e.preventDefault();
    if (!newAddonName.trim() || !newAddonPrice) return;
    setFormData((prev) => ({
      ...prev,
      addons: [...prev.addons, { name: newAddonName.trim(), price: Number(newAddonPrice) || 0 }],
    }));
    setNewAddonName("");
    setNewAddonPrice("");
  }

  function handleRemoveAddon(index) {
    setFormData((prev) => ({
      ...prev,
      addons: prev.addons.filter((_, i) => i !== index),
    }));
  }

  function handleToggleCity(cityName) {
    setFormData((prev) => {
      const has = prev.cities.includes(cityName);
      return {
        ...prev,
        cities: has ? prev.cities.filter((c) => c !== cityName) : [...prev.cities, cityName],
      };
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (saving) return;
    setError("");

    if (!formData.name.trim()) {
      setError("Product name is required.");
      return;
    }
    if (!formData.slug.trim()) {
      setError("Product slug is required.");
      return;
    }
    if (!formData.price || formData.price <= 0) {
      setError("Please specify a valid product price.");
      return;
    }

    try {
      setSaving(true);
      const galleryImages = Array.from(new Set([
        ...(Array.isArray(formData.gallery) ? formData.gallery : []),
        ...(Array.isArray(formData.images) ? formData.images : []),
        ...(formData.image ? [formData.image] : []),
      ].filter(Boolean)));
      const saved = await saveProductToCloud({
        ...formData,
        image: galleryImages[0] || formData.image,
        images: galleryImages,
        gallery: galleryImages,
        ...(isAddonMode ? { isAddon: true, occasionSlug: "event-services" } : {}),
        id: formData.id || (isEditing ? id : undefined),
      });

      setSavedMessage(`Successfully saved "${saved.name}" to the live catalog.`);
      setTimeout(() => {
        navigate(isAddonMode ? "/admin/services" : "/admin/products");
      }, 1000);
    } catch (err) {
      setError(err.message || "Failed to save product.");
    } finally {
      setSaving(false);
    }
  }

  // Category choices are intentionally different for service products.
  // Services always live under Event Services and never mix with normal
  // occasion/package categories.
  const currentOccasion = occasions.find((o) => o.slug === formData.occasionSlug);
  const availableCategories = isAddonMode
    ? addonCategoryOptions.map((c) => ({ ...c, displayLabel: c.label }))
    : [];
  if (!isAddonMode) {
    function collectCategoryNodes(nodes, parentTrail = []) {
      (nodes || []).forEach((node) => {
        const trail = [...parentTrail, node];
        if (node.type !== "product") {
          availableCategories.push({
            ...node,
            path: [formData.occasionSlug, ...trail.map((n) => n.slug)],
            displayLabel: trail.map((n) => n.label).join(" › "),
          });
        }
        collectCategoryNodes(node.children, trail);
      });
    }
    collectCategoryNodes(currentOccasion?.children || []);
  }

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <div>
          <p className="admin-crumb">
            <Link to={isAddonMode ? "/admin/services" : "/admin/products"}>← Back to {isAddonMode ? "Event Services" : "Products"}</Link>
          </p>
          <h1>{isEditing ? `Edit: ${formData.name || "Product"}` : `Create New ${isAddonMode ? "Service Product" : "Product"}`}</h1>
        </div>
        <div className="admin-head-actions">
          <button type="button" className="btn btn-outline" onClick={() => setPreviewOpen(true)}>
            <Icon name="eye" /> Live Preview
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
            <Icon name="check" /> {saving ? "Saving…" : (isAddonMode ? "Save Service Product" : "Save Product")}
          </button>
        </div>
      </div>

      {savedMessage && <div className="admin-alert admin-alert--success">{savedMessage}</div>}
      {error && <div className="admin-alert admin-alert--error">{error}</div>}

      <form onSubmit={handleSubmit} className="admin-form-grid">
        {/* Left Column: Core Info, Pricing, Media */}
        <div className="admin-form-main">
          {/* Section 1: General Details */}
          <section className="admin-panel">
            <h2>1. General Information</h2>
            <div className="admin-form-group">
              <label className="admin-form-label">Product / Package Title *</label>
              <input
                type="text"
                className="admin-input"
                placeholder="e.g. Royal Heritage Mandap"
                value={formData.name}
                onChange={handleNameChange}
                required
              />
            </div>

            <div className="admin-form-row">
              <div className="admin-form-group">
                <label className="admin-form-label">Slug (URL Path) *</label>
                <input
                  type="text"
                  className="admin-input"
                  placeholder="e.g. royal-heritage-mandap"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: sanitizeSlug(e.target.value) })}
                  required
                />
                <span className="admin-hint">Unique identifier used in URL paths.</span>
              </div>
            </div>

            <div className="admin-form-group">
              <label className="admin-form-label">Short Description</label>
              <textarea
                className="admin-textarea"
                rows="2"
                placeholder="Crisp 1-2 sentence description shown on package cards..."
                value={formData.shortDesc}
                onChange={(e) => setFormData({ ...formData, shortDesc: e.target.value })}
              />
            </div>

            <div className="admin-form-group">
              <label className="admin-form-label">Tagline (Extended description)</label>
              <textarea
                className="admin-textarea"
                rows="3"
                placeholder="Detailed summary highlighting the styling, lighting, and guest experience..."
                value={formData.tagline}
                onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
              />
            </div>

            <div className="admin-form-group">
              <label className="admin-form-label">Full Description</label>
              <textarea
                className="admin-textarea"
                rows="4"
                placeholder="Long-form description shown on the product detail page..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="admin-form-row">
              <div className="admin-form-group">
                <label className="admin-form-label">Rating (1–5)</label>
                <input
                  type="number"
                  className="admin-input"
                  min="1"
                  max="5"
                  step="0.1"
                  value={formData.rating}
                  onChange={(e) => setFormData({ ...formData, rating: Number(e.target.value) })}
                />
              </div>
              <div className="admin-form-group">
                <label className="admin-form-label">Review Count</label>
                <input
                  type="number"
                  className="admin-input"
                  min="0"
                  step="1"
                  value={formData.reviewCount}
                  onChange={(e) => setFormData({ ...formData, reviewCount: Number(e.target.value) })}
                />
              </div>
            </div>
          </section>

          {/* Section 2: Pricing & Economics */}
          <section className="admin-panel">
            <h2>2. Pricing & Commercials</h2>
            <div className="admin-form-row">
              <div className="admin-form-group">
                <label className="admin-form-label">Selling Price (₹) *</label>
                <input
                  type="number"
                  className="admin-input"
                  min="0"
                  step="100"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                  required
                />
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">Original Price / MRP (₹)</label>
                <input
                  type="number"
                  className="admin-input"
                  min="0"
                  step="100"
                  placeholder="Leave empty if no discount"
                  value={formData.originalPrice}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      originalPrice: e.target.value ? Number(e.target.value) : "",
                    })
                  }
                />
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">Badge</label>
                <select
                  className="admin-select"
                  value={formData.badge}
                  onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
                >
                  {BADGES.map((b) => (
                    <option key={b} value={b}>
                      {b || "(No Badge)"}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Pricing Simulator / Margin Bar */}
            <div className="admin-calc-box">
              <div className="admin-calc-item">
                <span>Display Price:</span>
                <strong>{fmtINR(formData.price)}</strong>
              </div>
              {discountPercent > 0 && (
                <div className="admin-calc-item">
                  <span>Customer Savings:</span>
                  <strong className="text-success">
                    {discountPercent}% OFF ({fmtINR(formData.originalPrice - formData.price)})
                  </strong>
                </div>
              )}
              <div className="admin-calc-item">
                <span>Estimated GST (18%):</span>
                <span>{fmtINR(Math.round(formData.price * 0.18))}</span>
              </div>
            </div>
          </section>

          {/* Section 3: Inclusions & Addons */}
          <section className="admin-panel">
            <h2>3. Package Inclusions & Services</h2>

            <div className="admin-form-group">
              <label className="admin-form-label">What's Included</label>
              <div className="admin-tags-list">
                {formData.includes.map((inc, i) => (
                  <span key={i} className="admin-tag-item">
                    {inc}
                    <button type="button" onClick={() => handleRemoveInclusion(i)}>
                      ×
                    </button>
                  </span>
                ))}
              </div>

              <div className="admin-inline-add">
                <input
                  type="text"
                  className="admin-input"
                  placeholder="Add an inclusion (e.g. Mandap Floral Drapes)"
                  value={newInclusion}
                  onChange={(e) => setNewInclusion(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddInclusion(e)}
                />
                <button type="button" className="btn btn-sm btn-outline" onClick={handleAddInclusion}>
                  Add Inclusion
                </button>
              </div>
            </div>

            <div className="admin-form-group" style={{ marginTop: "20px" }}>
              <label className="admin-form-label">Recommended Services</label>
              {formData.addons.length > 0 && (
                <table className="admin-table admin-table-sm" style={{ marginBottom: "14px" }}>
                  <thead>
                    <tr>
                      <th>Service Name</th>
                      <th>Price (₹)</th>
                      <th style={{ width: "60px" }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.addons.map((a, i) => (
                      <tr key={i}>
                        <td>{a.name}</td>
                        <td>{fmtINR(a.price)}</td>
                        <td>
                          <button
                            type="button"
                            className="btn-icon btn-icon-danger"
                            onClick={() => handleRemoveAddon(i)}
                          >
                            <Icon name="trash" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              <div className="admin-addon-row">
                <input
                  type="text"
                  className="admin-input"
                  placeholder="Addon title (e.g. Fireworks Show)"
                  value={newAddonName}
                  onChange={(e) => setNewAddonName(e.target.value)}
                />
                <input
                  type="number"
                  className="admin-input admin-num-input"
                  placeholder="Price"
                  value={newAddonPrice}
                  onChange={(e) => setNewAddonPrice(e.target.value)}
                />
                <button type="button" className="btn btn-sm btn-outline" onClick={handleAddAddon}>
                  Add
                </button>
              </div>
            </div>
          </section>

          {/* Section 3b: What's Not Included */}
          <section className="admin-panel">
            <h2>4. What's Not Included</h2>
            <div className="admin-form-group">
              <div className="admin-tags-list">
                {formData.notIncluded.map((exc, i) => (
                  <span key={i} className="admin-tag-item">
                    {exc}
                    <button type="button" onClick={() => handleRemoveExclusion(i)}>
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="admin-inline-add">
                <input
                  type="text"
                  className="admin-input"
                  placeholder="Add an exclusion (e.g. Catering / Food & Beverages)"
                  value={newExclusion}
                  onChange={(e) => setNewExclusion(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddExclusion(e)}
                />
                <button type="button" className="btn btn-sm btn-outline" onClick={handleAddExclusion}>
                  Add Exclusion
                </button>
              </div>
            </div>
          </section>

          {/* Section 3c: Setup Requirements, Duration & Important Info */}
          <section className="admin-panel">
            <h2>5. Setup, Duration &amp; Important Information</h2>
            <div className="admin-form-row">
              <div className="admin-form-group">
                <label className="admin-form-label">Setup Requirements</label>
                <input
                  type="text"
                  className="admin-input"
                  placeholder="e.g. Requires a flat 20×20 ft area with power access"
                  value={formData.setupRequirements}
                  onChange={(e) => setFormData({ ...formData, setupRequirements: e.target.value })}
                />
              </div>
              <div className="admin-form-group">
                <label className="admin-form-label">Duration</label>
                <input
                  type="text"
                  className="admin-input"
                  placeholder="e.g. Setup takes 3-4 hours before the event"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                />
              </div>
            </div>

            <div className="admin-form-group">
              <label className="admin-checkbox-label" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={formData.requiresTimeSlot}
                  onChange={(e) => setFormData({ ...formData, requiresTimeSlot: e.target.checked })}
                />
                <span>Requires a time slot selection at booking</span>
              </label>
            </div>

            <div className="admin-form-group" style={{ marginTop: 10 }}>
              <label className="admin-form-label">Important Information</label>
              <div className="admin-tags-list">
                {formData.importantInfo.map((info, i) => (
                  <span key={i} className="admin-tag-item">
                    {info}
                    <button type="button" onClick={() => handleRemoveImportantInfo(i)}>
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="admin-inline-add">
                <input
                  type="text"
                  className="admin-input"
                  placeholder="e.g. Advance booking of 48 hours required"
                  value={newImportantInfo}
                  onChange={(e) => setNewImportantInfo(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddImportantInfo(e)}
                />
                <button type="button" className="btn btn-sm btn-outline" onClick={handleAddImportantInfo}>
                  Add Note
                </button>
              </div>
            </div>
          </section>
        </div>

        {/* Right Column: Taxonomy, Picture, Availability, Status */}
        <div className="admin-form-side">
          {/* Section 4: Picture / Media */}
          <section className="admin-panel">
            <h2>Product Picture</h2>
            <div className="admin-image-preview-card">
              <img src={formData.image} alt={formData.name || "Preview"} className="admin-preview-img" />
              <div className="admin-image-actions">
                <button
                  type="button"
                  className="btn btn-sm btn-outline"
                  onClick={() => setPickerOpen(true)}
                >
                  <Icon name="image" /> Choose / Upload Picture
                </button>
              </div>
            </div>

            {(formData.images || []).length > 0 && (
              <div className="admin-image-gallery" aria-label="Product images">
                {(formData.images || []).map((url, index) => (
                  <div key={`${url}-${index}`} className={`admin-image-gallery-item${url === formData.image ? " active" : ""}`}>
                    <button type="button" title="Use as main image" onClick={() => { const reordered = [url, ...(formData.images || []).filter((img) => img !== url)]; setFormData({ ...formData, image: url, images: reordered, gallery: reordered }); }}>
                      <img src={url} alt={`${formData.name || "Product"} ${index + 1}`} />
                    </button>
                    {(formData.images || []).length > 1 && (
                      <button type="button" className="admin-image-gallery-remove" title="Remove image" onClick={() => {
                        const next = formData.images.filter((_, i) => i !== index);
                        setFormData({ ...formData, images: next, gallery: next, image: formData.image === url ? (next[0] || "") : formData.image });
                      }}>×</button>
                    )}
                  </div>
                ))}
              </div>
            )}

            <p className="admin-hint" style={{ marginTop: 8 }}>Add multiple product pictures. The first/main picture is used as the product thumbnail.</p>

            <div className="admin-form-group" style={{ marginTop: "12px" }}>
              <label className="admin-form-label">Image URL</label>
              <input
                type="text"
                className="admin-input admin-input-sm"
                value={formData.image}
                onChange={(e) => setFormData({ ...formData, image: e.target.value })}
              />
            </div>
          </section>

          {/* Section 5: Category & Hierarchy */}
          <section className="admin-panel">
            <h2>{isAddonMode ? "Service Category" : "Occasion & Category"}</h2>
            {isAddonMode ? (
              <>
                <div className="admin-calc-box"><strong>Event Services</strong><span className="admin-table-sub">This product will appear only in the Service catalog.</span></div>
                {availableCategories.length > 0 && (
                  <div className="admin-form-group">
                    <label className="admin-form-label">Service Category *</label>
                    <select className="admin-select" value={(formData.categoryPath || []).join("/")} onChange={(e) => { const selected = availableCategories.find((c) => c.path.join("/") === e.target.value); setFormData({ ...formData, occasionSlug: "event-services", categorySlug: selected ? selected.slug : "", categoryPath: selected ? selected.path : [], isAddon: true }); }} required>
                      <option value="">Select Service Category</option>
                      {availableCategories.map((c) => <option key={c.path.join("/")} value={c.path.join("/")}>{c.displayLabel}</option>)}
                    </select>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="admin-form-group"><label className="admin-form-label">Occasion</label><select className="admin-select" value={formData.occasionSlug} onChange={(e) => setFormData({ ...formData, occasionSlug: e.target.value, categorySlug: "", categoryPath: [], isAddon: false })}>{occasions.filter((o) => !o.addonOnly).map((o) => <option key={o.slug} value={o.slug}>{o.label}</option>)}</select></div>
                {availableCategories.length > 0 && <div className="admin-form-group"><label className="admin-form-label">Subcategory / Theme</label><select className="admin-select" value={(formData.categoryPath || []).join("/")} onChange={(e) => { const selected = availableCategories.find((c) => c.path.join("/") === e.target.value); setFormData({ ...formData, categorySlug: selected ? selected.slug : "", categoryPath: selected ? selected.path : [] }); }}><option value="">(Select Subcategory)</option>{availableCategories.map((c) => <option key={c.path.join("/")} value={c.path.join("/")}>{c.displayLabel}</option>)}</select></div>}
              </>
            )}
            <div className="admin-form-group"><label className="admin-form-label">Publishing Status</label><select className="admin-select" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}><option value="active">Active (Visible to customers)</option><option value="draft">Draft (Hidden)</option><option value="featured">Featured (Top of listings)</option><option value="archived">Archived</option></select></div>
          </section>

          {/* Section 6: City Availability */}
          <section className="admin-panel">
            <h2>City Availability</h2>
            <p className="admin-hint">Select cities where this package can be delivered.</p>
            <div className="admin-checkbox-grid">
              {CITIES.map((c) => (
                <label key={c} className="admin-checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.cities.includes(c)}
                    onChange={() => handleToggleCity(c)}
                  />
                  <span>{c}</span>
                </label>
              ))}
            </div>
          </section>
        </div>
      </form>

      {/* Picture Picker Modal */}
      <MediaPickerModal
        isOpen={pickerOpen}
        multiple
        onClose={() => setPickerOpen(false)}
        onSelect={(selection) => {
          const urls = Array.isArray(selection) ? selection : [selection];
          const next = Array.from(new Set([...(formData.images || []), ...urls].filter(Boolean)));
          setFormData({ ...formData, images: next, gallery: next, image: next[0] || formData.image });
        }}
      />

      {/* Live Preview Modal */}
      {previewOpen && (
        <div className="admin-modal-backdrop" onClick={() => setPreviewOpen(false)}>
          <div className="admin-modal-card admin-preview-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h2>Customer View Preview</h2>
              <button type="button" className="btn-icon" onClick={() => setPreviewOpen(false)}>
                <Icon name="close" />
              </button>
            </div>

            <div className="admin-customer-preview-card">
              <div className="occ-card-media" style={{ position: "relative", height: "240px" }}>
                <img src={formData.image} alt={formData.name} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "8px" }} />
                {formData.badge && <span className="admin-badge-mini" style={{ position: "absolute", top: "12px", left: "12px" }}>{formData.badge}</span>}
              </div>
              <div style={{ padding: "18px 0" }}>
                <h3 style={{ fontSize: "20px", margin: "6px 0" }}>{formData.name || "Untitled Package"}</h3>
                <p style={{ color: "var(--text-secondary)", fontSize: "14px", lineHeight: "1.5" }}>{formData.shortDesc || "No description."}</p>
                <div style={{ display: "flex", alignItems: "baseline", gap: "10px", margin: "14px 0" }}>
                  <span style={{ fontSize: "22px", fontWeight: "700", color: "var(--accent)" }}>{fmtINR(formData.price)}</span>
                  {formData.originalPrice && <span style={{ textDecoration: "line-through", color: "var(--text-secondary)", fontSize: "14px" }}>{fmtINR(formData.originalPrice)}</span>}
                  {discountPercent > 0 && <span className="admin-badge admin-badge--paid">{discountPercent}% OFF</span>}
                </div>
                <div style={{ borderTop: "1px solid var(--border-soft)", paddingTop: "12px" }}>
                  <strong style={{ fontSize: "13px" }}>Includes:</strong>
                  <ul style={{ margin: "8px 0 0 18px", fontSize: "13px", color: "var(--text-secondary)" }}>
                    {formData.includes.map((it, idx) => (
                      <li key={idx}>{it}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div className="admin-modal-actions">
              <button type="button" className="btn btn-primary" onClick={() => setPreviewOpen(false)}>
                Looks Great
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
