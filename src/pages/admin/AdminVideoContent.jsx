import { useEffect, useMemo, useState } from "react";
import {
  getInstaVideos,
  saveInstaVideo,
  deleteInstaVideo,
  getVideoReviews,
  saveVideoReview,
  deleteVideoReview,
} from "../../lib/catalogStore";
import { youtubeId, youtubeThumbnail } from "../../lib/video";
import Icon from "../../components/Icon";
import usePageMeta from "../../hooks/usePageMeta";

const OCCASIONS = [
  "Wedding",
  "Birthday",
  "Corporate Events",
  "Kids & Family Events",
  "Anniversary",
  "Festivals & Other Celebrations",
];

const EMPTY_SHORT = { id: "", url: "", caption: "", thumbnail: "", occasion: "", location: "", active: true, order: 0 };
const EMPTY_REVIEW = { id: "", url: "", name: "", caption: "", thumbnail: "", occasion: "", location: "", active: true, order: 0 };

function normalizeShort(item) {
  return { ...EMPTY_SHORT, ...item, active: item.active !== false, order: Number(item.order) || 0 };
}

function normalizeReview(item) {
  return { ...EMPTY_REVIEW, ...item, active: item.active !== false, order: Number(item.order) || 0 };
}

function isYouTube(url) {
  return Boolean(youtubeId(url));
}

export default function AdminVideoContent() {
  usePageMeta("YouTube Shorts & Review Videos — Admin", "Manage YouTube Shorts and customer review videos shown on the website.");

  const [activeTab, setActiveTab] = useState("shorts");
  const [shorts, setShorts] = useState(getInstaVideos);
  const [reviews, setReviews] = useState(getVideoReviews);
  const [shortForm, setShortForm] = useState(EMPTY_SHORT);
  const [reviewForm, setReviewForm] = useState(EMPTY_REVIEW);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  function refresh() {
    setShorts(getInstaVideos());
    setReviews(getVideoReviews());
  }

  useEffect(() => {
    window.addEventListener("nle-catalog-updated", refresh);
    return () => window.removeEventListener("nle-catalog-updated", refresh);
  }, []);

  function flash(message) {
    setFeedback(message);
    setError("");
    window.clearTimeout(flash.timer);
    flash.timer = window.setTimeout(() => setFeedback(""), 3000);
  }

  function updateShort(field, value) {
    setShortForm((f) => ({ ...f, [field]: value }));
  }

  function updateReview(field, value) {
    setReviewForm((f) => ({ ...f, [field]: value }));
  }

  function handleShortUrlChange(value) {
    const id = youtubeId(value);
    setShortForm((f) => ({
      ...f,
      url: value,
      thumbnail: id ? youtubeThumbnail(id) : f.thumbnail,
    }));
  }

  function handleReviewUrlChange(value) {
    const id = youtubeId(value);
    setReviewForm((f) => ({
      ...f,
      url: value,
      thumbnail: id ? youtubeThumbnail(id) : f.thumbnail,
    }));
  }

  function handleSaveShort(e) {
    e.preventDefault();
    setError("");
    if (!isYouTube(shortForm.url)) {
      setError("Please paste a valid YouTube Shorts URL.");
      return;
    }
    try {
      saveInstaVideo(shortForm);
      setShortForm(EMPTY_SHORT);
      refresh();
      flash(shortForm.id ? "YouTube Short updated." : "YouTube Short added.");
    } catch (err) {
      setError(err.message || "Could not save the Short.");
    }
  }

  function handleSaveReview(e) {
    e.preventDefault();
    setError("");
    if (!isYouTube(reviewForm.url)) {
      setError("Please paste a valid YouTube video URL.");
      return;
    }
    try {
      saveVideoReview(reviewForm);
      setReviewForm(EMPTY_REVIEW);
      refresh();
      flash(reviewForm.id ? "Review video updated." : "Review video added.");
    } catch (err) {
      setError(err.message || "Could not save the review video.");
    }
  }

  function editShort(item) {
    setActiveTab("shorts");
    setShortForm(normalizeShort(item));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function editReview(item) {
    setActiveTab("reviews");
    setReviewForm(normalizeReview(item));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function removeShort(id) {
    if (!window.confirm("Remove this YouTube Short from the website?")) return;
    deleteInstaVideo(id);
    refresh();
    flash("YouTube Short removed.");
  }

  function removeReview(id) {
    if (!window.confirm("Remove this review video from the website?")) return;
    deleteVideoReview(id);
    refresh();
    flash("Review video removed.");
  }

  const orderedShorts = useMemo(
    () => [...shorts].sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0)),
    [shorts]
  );
  const orderedReviews = useMemo(
    () => [...reviews].sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0)),
    [reviews]
  );

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <div>
          <h1>YouTube Shorts &amp; Review Videos</h1>
          <p className="admin-hint">
            Add, edit, preview, reorder, enable/disable, and remove YouTube Shorts and customer review videos.
            Thumbnails are generated automatically from YouTube when possible.
          </p>
        </div>
        <div className="admin-tabs" style={{ margin: 0 }}>
          <button type="button" className={`admin-tab ${activeTab === "shorts" ? "active" : ""}`} onClick={() => setActiveTab("shorts")}>
            <Icon name="youtube" /> YouTube Shorts ({shorts.length})
          </button>
          <button type="button" className={`admin-tab ${activeTab === "reviews" ? "active" : ""}`} onClick={() => setActiveTab("reviews")}>
            <Icon name="youtube" /> Review Videos ({reviews.length})
          </button>
        </div>
      </div>

      {feedback && <div className="admin-alert admin-alert--success">{feedback}</div>}
      {error && <div className="admin-alert admin-alert--error">{error}</div>}

      {activeTab === "shorts" && (
        <>
          <div className="admin-panel">
            <div className="admin-section-title">
              <div>
                <h2>{shortForm.id ? "Edit YouTube Short" : "Add YouTube Short"}</h2>
                <p className="admin-hint">Paste the normal YouTube Shorts link. Example: https://www.youtube.com/shorts/VIDEO_ID</p>
              </div>
              {shortForm.id && <button type="button" className="btn btn-outline" onClick={() => setShortForm(EMPTY_SHORT)}>Cancel Edit</button>}
            </div>
            <form onSubmit={handleSaveShort} className="admin-form-grid">
              <div className="admin-form-group admin-form-group--wide">
                <label className="admin-form-label">YouTube Shorts URL *</label>
                <input className="admin-input" type="url" value={shortForm.url} onChange={(e) => handleShortUrlChange(e.target.value)} placeholder="https://www.youtube.com/shorts/..." required />
              </div>
              <div className="admin-form-group">
                <label className="admin-form-label">Caption</label>
                <input className="admin-input" value={shortForm.caption} onChange={(e) => updateShort("caption", e.target.value)} placeholder="Haldi setup behind the scenes" />
              </div>
              <div className="admin-form-group">
                <label className="admin-form-label">Occasion</label>
                <select className="admin-input" value={shortForm.occasion} onChange={(e) => updateShort("occasion", e.target.value)}>
                  <option value="">All occasions</option>
                  {OCCASIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div className="admin-form-group">
                <label className="admin-form-label">Location</label>
                <input className="admin-input" value={shortForm.location} onChange={(e) => updateShort("location", e.target.value)} placeholder="Ranchi" />
              </div>
              <div className="admin-form-group">
                <label className="admin-form-label">Display Order</label>
                <input className="admin-input" type="number" min="0" value={shortForm.order} onChange={(e) => updateShort("order", e.target.value)} />
              </div>
              <div className="admin-form-group admin-form-group--wide">
                <label className="admin-form-label">Thumbnail URL</label>
                <input className="admin-input" type="url" value={shortForm.thumbnail} onChange={(e) => updateShort("thumbnail", e.target.value)} placeholder="Auto-filled from YouTube" />
              </div>
              <label className="admin-check-row"><input type="checkbox" checked={shortForm.active !== false} onChange={(e) => updateShort("active", e.target.checked)} /> Show this Short on the website</label>
              <div><button className="btn btn-primary" type="submit">{shortForm.id ? "Update Short" : "Add Short"}</button></div>
            </form>
            {youtubeId(shortForm.url) && <img src={shortForm.thumbnail || youtubeThumbnail(youtubeId(shortForm.url))} alt="YouTube thumbnail preview" className="admin-video-preview-thumb" />}
          </div>

          <div className="admin-panel" style={{ marginTop: 16 }}>
            <div className="admin-section-title"><h2>Managed Shorts</h2><span className="admin-hint">{orderedShorts.length} total</span></div>
            {orderedShorts.length === 0 ? <p className="admin-empty">No YouTube Shorts added yet.</p> : (
              <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Preview</th><th>Caption</th><th>Occasion</th><th>Location</th><th>Status</th><th>Order</th><th>Actions</th></tr></thead><tbody>
                {orderedShorts.map((item) => <tr key={item.id}>
                  <td>{youtubeId(item.url) ? <img src={item.thumbnail || youtubeThumbnail(youtubeId(item.url))} alt="" className="admin-table-thumb" /> : "—"}</td>
                  <td><a href={item.url} target="_blank" rel="noopener noreferrer">{item.caption || item.url}</a></td>
                  <td>{item.occasion || "All"}</td><td>{item.location || "—"}</td>
                  <td>{item.active === false ? <span className="text-muted">Hidden</span> : <span className="text-success">Live</span>}</td>
                  <td>{Number(item.order) || 0}</td>
                  <td className="admin-row-actions"><button className="btn btn-sm btn-outline" type="button" onClick={() => editShort(item)}>Edit</button><button className="btn btn-sm btn-outline" type="button" onClick={() => removeShort(item.id)}>Delete</button></td>
                </tr>)}
              </tbody></table></div>
            )}
          </div>
        </>
      )}

      {activeTab === "reviews" && (
        <>
          <div className="admin-panel">
            <div className="admin-section-title">
              <div>
                <h2>{reviewForm.id ? "Edit Review Video" : "Add Customer Review Video"}</h2>
                <p className="admin-hint">Paste a YouTube watch, youtu.be, or Shorts URL for a customer/event review.</p>
              </div>
              {reviewForm.id && <button type="button" className="btn btn-outline" onClick={() => setReviewForm(EMPTY_REVIEW)}>Cancel Edit</button>}
            </div>
            <form onSubmit={handleSaveReview} className="admin-form-grid">
              <div className="admin-form-group admin-form-group--wide">
                <label className="admin-form-label">YouTube Video URL *</label>
                <input className="admin-input" type="url" value={reviewForm.url} onChange={(e) => handleReviewUrlChange(e.target.value)} placeholder="https://youtu.be/..." required />
              </div>
              <div className="admin-form-group">
                <label className="admin-form-label">Customer Name</label>
                <input className="admin-input" value={reviewForm.name} onChange={(e) => updateReview("name", e.target.value)} placeholder="Ananya & Rohan" />
              </div>
              <div className="admin-form-group">
                <label className="admin-form-label">Caption</label>
                <input className="admin-input" value={reviewForm.caption} onChange={(e) => updateReview("caption", e.target.value)} placeholder="Wedding review — Ranchi" />
              </div>
              <div className="admin-form-group">
                <label className="admin-form-label">Occasion</label>
                <select className="admin-input" value={reviewForm.occasion} onChange={(e) => updateReview("occasion", e.target.value)}>
                  <option value="">All occasions</option>
                  {OCCASIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div className="admin-form-group">
                <label className="admin-form-label">Location</label>
                <input className="admin-input" value={reviewForm.location} onChange={(e) => updateReview("location", e.target.value)} placeholder="Jamshedpur" />
              </div>
              <div className="admin-form-group">
                <label className="admin-form-label">Display Order</label>
                <input className="admin-input" type="number" min="0" value={reviewForm.order} onChange={(e) => updateReview("order", e.target.value)} />
              </div>
              <div className="admin-form-group admin-form-group--wide">
                <label className="admin-form-label">Thumbnail URL</label>
                <input className="admin-input" type="url" value={reviewForm.thumbnail} onChange={(e) => updateReview("thumbnail", e.target.value)} placeholder="Auto-filled from YouTube" />
              </div>
              <label className="admin-check-row"><input type="checkbox" checked={reviewForm.active !== false} onChange={(e) => updateReview("active", e.target.checked)} /> Show this review video on the website</label>
              <div><button className="btn btn-primary" type="submit">{reviewForm.id ? "Update Review" : "Add Review Video"}</button></div>
            </form>
            {youtubeId(reviewForm.url) && <img src={reviewForm.thumbnail || youtubeThumbnail(youtubeId(reviewForm.url))} alt="YouTube thumbnail preview" className="admin-video-preview-thumb" />}
          </div>

          <div className="admin-panel" style={{ marginTop: 16 }}>
            <div className="admin-section-title"><h2>Managed Review Videos</h2><span className="admin-hint">{orderedReviews.length} total</span></div>
            {orderedReviews.length === 0 ? <p className="admin-empty">No review videos added yet.</p> : (
              <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Preview</th><th>Customer</th><th>Caption</th><th>Occasion</th><th>Location</th><th>Status</th><th>Order</th><th>Actions</th></tr></thead><tbody>
                {orderedReviews.map((item) => <tr key={item.id}>
                  <td>{youtubeId(item.url) ? <img src={item.thumbnail || youtubeThumbnail(youtubeId(item.url))} alt="" className="admin-table-thumb" /> : "—"}</td>
                  <td>{item.name || "Client"}</td><td><a href={item.url} target="_blank" rel="noopener noreferrer">{item.caption || item.url}</a></td>
                  <td>{item.occasion || "All"}</td><td>{item.location || "—"}</td>
                  <td>{item.active === false ? <span className="text-muted">Hidden</span> : <span className="text-success">Live</span>}</td><td>{Number(item.order) || 0}</td>
                  <td className="admin-row-actions"><button className="btn btn-sm btn-outline" type="button" onClick={() => editReview(item)}>Edit</button><button className="btn btn-sm btn-outline" type="button" onClick={() => removeReview(item.id)}>Delete</button></td>
                </tr>)}
              </tbody></table></div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
