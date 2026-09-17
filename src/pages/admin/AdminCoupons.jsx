import { useState, useEffect } from "react";
import { getCoupons, saveCoupon, deleteCoupon, validateCoupon } from "../../lib/catalogStore";
import { fmtINR } from "../../lib/pricing";
import Icon from "../../components/Icon";
import usePageMeta from "../../hooks/usePageMeta";

export default function AdminCoupons() {
  usePageMeta("Promotions & Coupons — Admin", "Create and manage promo codes and checkout discounts.");

  const [coupons, setCoupons] = useState(getCoupons);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [testCode, setTestCode] = useState("");
  const [testAmount, setTestAmount] = useState("50000");
  const [testResult, setTestResult] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  function refresh() {
    setCoupons(getCoupons());
  }

  useEffect(() => {
    function onUpdate() {
      refresh();
    }
    window.addEventListener("nle-catalog-updated", onUpdate);
    return () => window.removeEventListener("nle-catalog-updated", onUpdate);
  }, []);

  function handleSave(e) {
    e.preventDefault();
    setError("");
    if (!editingCoupon.code.trim()) {
      setError("Coupon code is required.");
      return;
    }

    try {
      saveCoupon(editingCoupon);
      refresh();
      setEditingCoupon(null);
      setFeedback(`Coupon "${editingCoupon.code.toUpperCase()}" saved successfully.`);
      setTimeout(() => setFeedback(""), 3000);
    } catch (err) {
      setError(err.message || "Failed to save coupon.");
    }
  }

  function handleDelete(id, code) {
    if (window.confirm(`Delete coupon "${code}"?`)) {
      deleteCoupon(id);
      refresh();
      setFeedback(`Deleted coupon "${code}".`);
      setTimeout(() => setFeedback(""), 3000);
    }
  }

  function handleToggleActive(coupon) {
    saveCoupon({ ...coupon, isActive: !coupon.isActive });
    refresh();
  }

  function handleTestCoupon(e) {
    e.preventDefault();
    const result = validateCoupon(testCode, Number(testAmount) || 0);
    setTestResult(result);
  }

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <div>
          <h1>Coupons & Promo Codes</h1>
          <p className="admin-hint">
            Create promotional discount codes that customers can apply during checkout or booking.
          </p>
        </div>
        <div className="admin-head-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() =>
              setEditingCoupon({
                code: "",
                discountType: "percent",
                value: 10,
                minOrder: 10000,
                maxDiscount: 5000,
                expiryDate: "",
                usageLimit: 100,
                usageCount: 0,
                isActive: true,
              })
            }
          >
            <Icon name="plus" /> Create Coupon
          </button>
        </div>
      </div>

      {feedback && <div className="admin-alert admin-alert--success">{feedback}</div>}
      {error && <div className="admin-alert admin-alert--error">{error}</div>}

      <div className="admin-coupons-grid">
        <div className="admin-panel admin-coupons-table-panel">
          <h2>Active Promotions ({coupons.length})</h2>
          {coupons.length === 0 ? (
            <p className="admin-empty">No coupons configured yet.</p>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Discount</th>
                  <th>Min Booking</th>
                  <th>Usage</th>
                  <th>Expiry</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {coupons.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <code className="admin-coupon-code">{c.code}</code>
                    </td>
                    <td>
                      <strong>
                        {c.discountType === "percent" ? `${c.value}% OFF` : fmtINR(c.value)}
                      </strong>
                      {c.maxDiscount && (
                        <div className="admin-hint">Cap: {fmtINR(c.maxDiscount)}</div>
                      )}
                    </td>
                    <td>{c.minOrder ? fmtINR(c.minOrder) : "No min"}</td>
                    <td>
                      {c.usageCount} / {c.usageLimit || "∞"}
                    </td>
                    <td>{c.expiryDate || "Never"}</td>
                    <td>
                      <button
                        type="button"
                        className={`admin-badge ${
                          c.isActive ? "admin-badge--paid" : "admin-badge--cancelled"
                        }`}
                        onClick={() => handleToggleActive(c)}
                        title="Click to toggle status"
                        style={{ cursor: "pointer", border: "none" }}
                      >
                        {c.isActive ? "Active" : "Paused"}
                      </button>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div className="admin-row-actions">
                        <button
                          type="button"
                          className="btn-icon"
                          title="Edit"
                          onClick={() => setEditingCoupon({ ...c })}
                        >
                          <Icon name="edit" />
                        </button>
                        <button
                          type="button"
                          className="btn-icon btn-icon-danger"
                          title="Delete"
                          onClick={() => handleDelete(c.id, c.code)}
                        >
                          <Icon name="trash" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Live Coupon Tester Widget */}
        <div className="admin-panel admin-coupon-tester">
          <h2>Test Coupon Validation</h2>
          <p className="admin-hint">Simulate a customer entering a promo code at checkout.</p>
          <form onSubmit={handleTestCoupon} className="admin-test-form">
            <div className="admin-form-group">
              <label className="admin-form-label">Coupon Code</label>
              <input
                type="text"
                className="admin-input"
                placeholder="e.g. WELCOME10"
                value={testCode}
                onChange={(e) => setTestCode(e.target.value)}
                required
              />
            </div>

            <div className="admin-form-group">
              <label className="admin-form-label">Cart Subtotal (₹)</label>
              <input
                type="number"
                className="admin-input"
                value={testAmount}
                onChange={(e) => setTestAmount(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn btn-outline" style={{ width: "100%" }}>
              Validate Code
            </button>
          </form>

          {testResult && (
            <div
              className={`admin-alert ${
                testResult.valid ? "admin-alert--success" : "admin-alert--error"
              }`}
              style={{ marginTop: "14px" }}
            >
              <strong>{testResult.valid ? "Valid Code!" : "Rejected"}</strong>
              <p style={{ margin: "4px 0 0 0", fontSize: "13px" }}>{testResult.message}</p>
            </div>
          )}
        </div>
      </div>

      {/* Edit / Create Modal */}
      {editingCoupon && (
        <div className="admin-modal-backdrop" onClick={() => setEditingCoupon(null)}>
          <div className="admin-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h2>{editingCoupon.id ? `Edit Coupon: ${editingCoupon.code}` : "New Coupon"}</h2>
              <button type="button" className="btn-icon" onClick={() => setEditingCoupon(null)}>
                <Icon name="close" />
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label className="admin-form-label">Coupon Code *</label>
                  <input
                    type="text"
                    className="admin-input"
                    placeholder="e.g. WEDDING2026"
                    value={editingCoupon.code}
                    onChange={(e) =>
                      setEditingCoupon({ ...editingCoupon, code: e.target.value.toUpperCase() })
                    }
                    required
                  />
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label">Type</label>
                  <select
                    className="admin-select"
                    value={editingCoupon.discountType}
                    onChange={(e) =>
                      setEditingCoupon({ ...editingCoupon, discountType: e.target.value })
                    }
                  >
                    <option value="percent">Percentage (%)</option>
                    <option value="flat">Flat Amount (₹)</option>
                  </select>
                </div>
              </div>

              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label className="admin-form-label">
                    Discount Value ({editingCoupon.discountType === "percent" ? "%" : "₹"}) *
                  </label>
                  <input
                    type="number"
                    className="admin-input"
                    min="1"
                    value={editingCoupon.value}
                    onChange={(e) =>
                      setEditingCoupon({ ...editingCoupon, value: Number(e.target.value) })
                    }
                    required
                  />
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label">Max Discount Cap (₹)</label>
                  <input
                    type="number"
                    className="admin-input"
                    placeholder="Optional max cap"
                    value={editingCoupon.maxDiscount || ""}
                    onChange={(e) =>
                      setEditingCoupon({
                        ...editingCoupon,
                        maxDiscount: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                  />
                </div>
              </div>

              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label className="admin-form-label">Minimum Order Amount (₹)</label>
                  <input
                    type="number"
                    className="admin-input"
                    min="0"
                    value={editingCoupon.minOrder}
                    onChange={(e) =>
                      setEditingCoupon({ ...editingCoupon, minOrder: Number(e.target.value) })
                    }
                  />
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label">Expiry Date</label>
                  <input
                    type="date"
                    className="admin-input"
                    value={editingCoupon.expiryDate || ""}
                    onChange={(e) =>
                      setEditingCoupon({ ...editingCoupon, expiryDate: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label className="admin-form-label">Usage Limit (Total uses)</label>
                  <input
                    type="number"
                    className="admin-input"
                    min="0"
                    value={editingCoupon.usageLimit}
                    onChange={(e) =>
                      setEditingCoupon({ ...editingCoupon, usageLimit: Number(e.target.value) })
                    }
                  />
                </div>

                <div className="admin-form-group" style={{ display: "flex", alignItems: "center" }}>
                  <label className="admin-checkbox-label">
                    <input
                      type="checkbox"
                      checked={editingCoupon.isActive}
                      onChange={(e) =>
                        setEditingCoupon({ ...editingCoupon, isActive: e.target.checked })
                      }
                    />
                    <span>Active and Redeemable</span>
                  </label>
                </div>
              </div>

              <div className="admin-modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setEditingCoupon(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Coupon
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
