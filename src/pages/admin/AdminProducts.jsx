import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  getProducts,
  getOccasions,
  deleteProduct,
  duplicateProduct,
  bulkUpdateProducts,
  bulkDeleteProducts,
} from "../../lib/catalogStore";
import { fmtINR } from "../../lib/pricing";
import Icon from "../../components/Icon";
import usePageMeta from "../../hooks/usePageMeta";

export default function AdminProducts() {
  usePageMeta("Products & Packages — Admin", "Manage all catalog products and packages.");
  const navigate = useNavigate();

  const [products, setProducts] = useState(getProducts);
  const [occasions] = useState(getOccasions);
  const [search, setSearch] = useState("");
  const [occasionFilter, setOccasionFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkStatus, setBulkStatus] = useState("");
  const [bulkPricePct, setBulkPricePct] = useState("");
  const [feedback, setFeedback] = useState("");

  function refresh() {
    setProducts(getProducts());
  }

  useEffect(() => {
    function onCatalogUpdate() {
      refresh();
    }
    window.addEventListener("nle-catalog-updated", onCatalogUpdate);
    return () => window.removeEventListener("nle-catalog-updated", onCatalogUpdate);
  }, []);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (p.isAddon === true || p.occasionSlug === "event-add-ons" || (Array.isArray(p.categoryPath) && p.categoryPath[0] === "event-add-ons")) return false;
      const matchSearch =
        !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.slug.toLowerCase().includes(search.toLowerCase());

      const matchOccasion =
        occasionFilter === "all" || p.occasionSlug === occasionFilter || p.categorySlug === occasionFilter;

      const matchStatus = statusFilter === "all" || p.status === statusFilter;

      return matchSearch && matchOccasion && matchStatus;
    });
  }, [products, search, occasionFilter, statusFilter]);

  function handleSelectAll(e) {
    if (e.target.checked) {
      setSelectedIds(filtered.map((p) => p.id));
    } else {
      setSelectedIds([]);
    }
  }

  function handleToggleSelect(id) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function handleDelete(id, name) {
    if (window.confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
      deleteProduct(id);
      refresh();
      setFeedback(`Deleted "${name}".`);
      setTimeout(() => setFeedback(""), 3000);
    }
  }

  function handleDuplicate(id) {
    const dup = duplicateProduct(id);
    if (dup) {
      refresh();
      setFeedback(`Created copy "${dup.name}".`);
      setTimeout(() => setFeedback(""), 3000);
    }
  }

  function handleBulkStatusApply() {
    if (!selectedIds.length || !bulkStatus) return;
    const count = bulkUpdateProducts(selectedIds, { status: bulkStatus });
    refresh();
    setSelectedIds([]);
    setBulkStatus("");
    setFeedback(`Updated status for ${count} product(s) to "${bulkStatus}".`);
    setTimeout(() => setFeedback(""), 3500);
  }

  function handleBulkPriceApply() {
    const pct = parseFloat(bulkPricePct);
    if (!selectedIds.length || isNaN(pct)) return;
    const count = bulkUpdateProducts(selectedIds, { priceAdjustmentPercent: pct });
    refresh();
    setSelectedIds([]);
    setBulkPricePct("");
    setFeedback(`Adjusted prices for ${count} product(s) by ${pct > 0 ? "+" : ""}${pct}%.`);
    setTimeout(() => setFeedback(""), 3500);
  }

  function handleBulkDelete() {
    if (!selectedIds.length) return;
    if (window.confirm(`Delete ${selectedIds.length} selected products? This cannot be undone.`)) {
      bulkDeleteProducts(selectedIds);
      refresh();
      setSelectedIds([]);
      setFeedback(`Deleted selected products.`);
      setTimeout(() => setFeedback(""), 3000);
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <div>
          <h1>Products & Packages</h1>
          <p className="admin-hint">
            Full control to add, edit, duplicate, adjust pricing, and manage live products across all categories.
          </p>
        </div>
        <div className="admin-head-actions">
          <Link to="/admin/products/new" className="btn btn-primary">
            <Icon name="plus" /> Add New Product
          </Link>
        </div>
      </div>

      {feedback && <div className="admin-alert admin-alert--success">{feedback}</div>}

      <div className="admin-panel">
        <div className="admin-toolbar-row">
          <div className="admin-search-wrapper">
            <Icon name="search" />
            <input
              type="search"
              className="admin-search"
              placeholder="Search products by title or slug..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="admin-filters">
            <select
              value={occasionFilter}
              onChange={(e) => setOccasionFilter(e.target.value)}
              className="admin-select"
            >
              <option value="all">All Occasions</option>
              {occasions.map((o) => (
                <option key={o.slug} value={o.slug}>
                  {o.label}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="admin-select"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="featured">Featured</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>

        {/* Bulk Action Bar (Visible when items selected) */}
        {selectedIds.length > 0 && (
          <div className="admin-bulk-bar">
            <span>
              <strong>{selectedIds.length}</strong> selected
            </span>

            <div className="admin-bulk-group">
              <select
                value={bulkStatus}
                onChange={(e) => setBulkStatus(e.target.value)}
                className="admin-select admin-select-sm"
              >
                <option value="">Set Status...</option>
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="featured">Featured</option>
                <option value="archived">Archived</option>
              </select>
              <button
                type="button"
                className="btn btn-sm btn-outline"
                onClick={handleBulkStatusApply}
                disabled={!bulkStatus}
              >
                Apply Status
              </button>
            </div>

            <div className="admin-bulk-group">
              <input
                type="number"
                placeholder="+10% or -5%"
                value={bulkPricePct}
                onChange={(e) => setBulkPricePct(e.target.value)}
                className="admin-num-input"
              />
              <button
                type="button"
                className="btn btn-sm btn-outline"
                onClick={handleBulkPriceApply}
                disabled={!bulkPricePct}
              >
                Modify Prices %
              </button>
            </div>

            <button type="button" className="btn btn-sm btn-danger" onClick={handleBulkDelete}>
              <Icon name="trash" /> Delete Selected
            </button>
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="admin-empty">
            <p>No products match your search/filter criteria.</p>
            <Link to="/admin/products/new" className="btn btn-sm btn-primary" style={{ marginTop: "12px" }}>
              Create First Product
            </Link>
          </div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={{ width: "40px" }}>
                    <input
                      type="checkbox"
                      checked={selectedIds.length > 0 && selectedIds.length === filtered.length}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th style={{ width: "70px" }}>Picture</th>
                  <th>Product Name & Slug</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Rating</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((product) => {
                  const isSelected = selectedIds.includes(product.id);
                  return (
                    <tr key={product.id || product.slug} className={isSelected ? "row-selected" : ""}>
                      <td>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(product.id)}
                        />
                      </td>
                      <td>
                        <img
                          src={product.image}
                          alt={product.name}
                          className="admin-table-thumb"
                          loading="lazy"
                        />
                      </td>
                      <td>
                        <div className="admin-table-main-title">
                          <Link to={`/admin/products/${product.id || product.slug}/edit`}>
                            {product.name}
                          </Link>
                          {product.badge && <span className="admin-badge-mini">{product.badge}</span>}
                        </div>
                        <div className="admin-table-sub">
                          <code>{product.slug}</code>
                        </div>
                      </td>
                      <td>
                        <span className="admin-table-category">
                          {product.occasionSlug || product.categorySlug || "General"}
                        </span>
                      </td>
                      <td>
                        <div className="admin-price-cell">
                          <strong>{fmtINR(product.price)}</strong>
                          {product.originalPrice && (
                            <span className="admin-mrp-cut">{fmtINR(product.originalPrice)}</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className="admin-rating-badge">
                          ★ {product.rating || 4.8} ({product.reviewCount || 0})
                        </span>
                      </td>
                      <td>
                        <span className={`admin-badge admin-badge--${product.status || "active"}`}>
                          {product.status || "active"}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div className="admin-row-actions">
                          <button
                            type="button"
                            className="btn-icon"
                            title="Edit Product"
                            onClick={() => navigate(`/admin/products/${product.id || product.slug}/edit`)}
                          >
                            <Icon name="edit" />
                          </button>
                          <button
                            type="button"
                            className="btn-icon"
                            title="Duplicate (Clone) Product"
                            onClick={() => handleDuplicate(product.id || product.slug)}
                          >
                            <Icon name="copy" />
                          </button>
                          <a
                            href={`/occasion/${product.occasionSlug || "wedding"}/${product.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="btn-icon"
                            title="View on Live Site"
                          >
                            <Icon name="eye" />
                          </a>
                          <button
                            type="button"
                            className="btn-icon btn-icon-danger"
                            title="Delete Product"
                            onClick={() => handleDelete(product.id || product.slug, product.name)}
                          >
                            <Icon name="trash" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
