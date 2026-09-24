import { useState, useEffect } from "react";
import {
  getMediaItems,
  uploadMediaFile,
  saveMediaItemToCloud,
  deleteMediaItemFromCloud,
  getGalleryItems,
  saveGalleryItemToCloud,
  deleteGalleryItemFromCloud,
  getProducts,
} from "../../lib/catalogStore";
import Icon from "../../components/Icon";
import usePageMeta from "../../hooks/usePageMeta";

const GALLERY_CATEGORIES = [
  { key: "weddings", label: "Weddings" },
  { key: "birthdays", label: "Birthdays" },
  { key: "corporate", label: "Corporate" },
  { key: "concerts", label: "Concerts" },
  { key: "decor", label: "Décor" },
];

export default function AdminMedia() {
  usePageMeta("Media & Pictures Library — Admin", "Upload and manage photos, pictures, and gallery showcases.");

  const [activeTab, setActiveTab] = useState("media"); // 'media' | 'gallery'
  const [mediaItems, setMediaItems] = useState(getMediaItems);
  const [galleryItems, setGalleryItems] = useState(getGalleryItems);
  const [products] = useState(getProducts);

  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const [copiedId, setCopiedId] = useState("");
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  // New URL Import State
  const [urlInput, setUrlInput] = useState("");
  const [titleInput, setTitleInput] = useState("");

  // Gallery Add State
  const [newGalImg, setNewGalImg] = useState("");
  const [newGalAlt, setNewGalAlt] = useState("");
  const [newGalCat, setNewGalCat] = useState("weddings");
  const [newGalTall, setNewGalTall] = useState(false);

  function refresh() {
    setMediaItems(getMediaItems());
    setGalleryItems(getGalleryItems());
  }

  useEffect(() => {
    function onUpdate() {
      refresh();
    }
    window.addEventListener("nle-catalog-updated", onUpdate);
    return () => window.removeEventListener("nle-catalog-updated", onUpdate);
  }, []);

  async function handleFileUpload(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      const saved = await uploadMediaFile(file);
      refresh();
      setFeedback(`Uploaded "${saved.title}".`);
      setTimeout(() => setFeedback(""), 3000);
    } catch (err) {
      setError(err.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function handleImportUrl(e) {
    e.preventDefault();
    if (!urlInput.trim()) return;
    try {
      const saved = await saveMediaItemToCloud({
        title: titleInput || "Imported Photo",
        url: urlInput.trim(),
        alt: titleInput || "Photo",
        tags: ["cdn-import"],
      });
      refresh();
      setUrlInput("");
      setTitleInput("");
      setFeedback(`Added image "${saved.title}".`);
      setTimeout(() => setFeedback(""), 3000);
    } catch (err) {
      setError(err.message || "Failed to import image.");
    }
  }

  function handleCopy(url, id) {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(""), 2000);
  }

  async function handleDeleteMedia(id, title) {
    if (!window.confirm(`Delete "${title}" from Media Library?`)) return;
    try {
      await deleteMediaItemFromCloud(id);
      refresh();
      setFeedback(`Deleted picture.`);
      setTimeout(() => setFeedback(""), 3000);
    } catch (err) {
      setError(err.message || "Failed to delete picture from the cloud.");
    }
  }

  async function handleAddGalleryItem(e) {
    e.preventDefault();
    if (!newGalImg.trim()) {
      setError("Please provide an image URL for gallery item.");
      return;
    }
    try {
      await saveGalleryItemToCloud({
        img: newGalImg.trim(),
        alt: newGalAlt.trim() || "Event showcase",
        category: newGalCat,
        tall: newGalTall,
      });
      refresh();
      setNewGalImg("");
      setNewGalAlt("");
      setFeedback("Added photo to public Gallery!");
      setTimeout(() => setFeedback(""), 3000);
    } catch (err) {
      setError(err.message || "Failed to save gallery item to the cloud.");
    }
  }

  async function handleDeleteGallery(id) {
    if (window.confirm("Remove this photo from the public Gallery?")) {
      try {
        await deleteGalleryItemFromCloud(id);
      } catch (err) {
        setError(err.message || "Failed to remove gallery item from the cloud.");
        return;
      }
      refresh();
      setFeedback("Removed gallery photo.");
      setTimeout(() => setFeedback(""), 3000);
    }
  }

  const filteredMedia = mediaItems.filter(
    (m) =>
      m.title.toLowerCase().includes(search.toLowerCase()) ||
      (m.tags && m.tags.some((t) => t.toLowerCase().includes(search.toLowerCase())))
  );

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <div>
          <h1>Media & Pictures Manager</h1>
          <p className="admin-hint">
            Upload new event pictures, manage the media asset library, and curate the public showcase gallery.
          </p>
        </div>

        <div className="admin-tabs" style={{ margin: 0 }}>
          <button
            type="button"
            className={`admin-tab ${activeTab === "media" ? "active" : ""}`}
            onClick={() => setActiveTab("media")}
          >
            <Icon name="image" /> Asset Library ({mediaItems.length})
          </button>
          <button
            type="button"
            className={`admin-tab ${activeTab === "gallery" ? "active" : ""}`}
            onClick={() => setActiveTab("gallery")}
          >
            <Icon name="grid" /> Public Gallery ({galleryItems.length})
          </button>
        </div>
      </div>

      {feedback && <div className="admin-alert admin-alert--success">{feedback}</div>}
      {error && <div className="admin-alert admin-alert--error">{error}</div>}

      {activeTab === "media" && (
        <div className="admin-media-layout">
          {/* Uploader / Importer Bar */}
          <div className="admin-panel admin-media-quickbar">
            <div className="admin-media-upload-tile">
              <label className="btn btn-primary" style={{ cursor: "pointer" }}>
                <Icon name="upload" /> {uploading ? "Uploading..." : "Upload Local Picture"}
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/webp, image/gif"
                  style={{ display: "none" }}
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
              </label>
              <span className="admin-hint">JPG, PNG, WebP up to 5MB</span>
            </div>

            <div className="admin-divider-v" />

            <form onSubmit={handleImportUrl} className="admin-media-import-form">
              <input
                type="text"
                className="admin-input"
                placeholder="Title (e.g. Mandap Floral Arch)"
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
              />
              <input
                type="url"
                className="admin-input"
                placeholder="Image URL (https://...)"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                required
              />
              <button type="submit" className="btn btn-outline">
                Import from Web
              </button>
            </form>
          </div>

          {/* Media Grid */}
          <div className="admin-panel">
            <div className="admin-toolbar-row">
              <div className="admin-search-wrapper">
                <Icon name="search" />
                <input
                  type="search"
                  className="admin-search"
                  placeholder="Search pictures by title or tag..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            {filteredMedia.length === 0 ? (
              <p className="admin-empty">No pictures found.</p>
            ) : (
              <div className="admin-media-cards-grid">
                {filteredMedia.map((m) => {
                  const usedIn = products.filter((p) => p.image === m.url);
                  return (
                    <div key={m.id} className="admin-media-card">
                      <div className="admin-media-card-thumb">
                        <img src={m.url} alt={m.alt || m.title} loading="lazy" />
                      </div>
                      <div className="admin-media-card-body">
                        <strong title={m.title}>{m.title}</strong>
                        <div className="admin-media-card-meta">
                          {usedIn.length > 0 ? (
                            <span className="text-success">Used in {usedIn.length} package(s)</span>
                          ) : (
                            <span className="text-muted">Unused</span>
                          )}
                        </div>
                        <div className="admin-media-card-actions">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline"
                            onClick={() => handleCopy(m.url, m.id)}
                          >
                            <Icon name="copy" /> {copiedId === m.id ? "Copied!" : "Copy URL"}
                          </button>
                          <button
                            type="button"
                            className="btn-icon btn-icon-danger"
                            title="Delete Picture"
                            onClick={() => handleDeleteMedia(m.id, m.title)}
                          >
                            <Icon name="trash" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "gallery" && (
        <div className="admin-gallery-manager">
          <div className="admin-panel">
            <h2>Add Photo to Public Gallery (/gallery)</h2>
            <form onSubmit={handleAddGalleryItem} className="admin-form-row" style={{ alignItems: "flex-end" }}>
              <div className="admin-form-group" style={{ flex: "2" }}>
                <label className="admin-form-label">Photo URL *</label>
                <input
                  type="url"
                  className="admin-input"
                  placeholder="https://..."
                  value={newGalImg}
                  onChange={(e) => setNewGalImg(e.target.value)}
                  required
                />
              </div>

              <div className="admin-form-group" style={{ flex: "1.5" }}>
                <label className="admin-form-label">Alt Text / Caption</label>
                <input
                  type="text"
                  className="admin-input"
                  placeholder="e.g. Wedding reception stage lighting"
                  value={newGalAlt}
                  onChange={(e) => setNewGalAlt(e.target.value)}
                />
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">Gallery Filter</label>
                <select
                  className="admin-select"
                  value={newGalCat}
                  onChange={(e) => setNewGalCat(e.target.value)}
                >
                  {GALLERY_CATEGORIES.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="admin-form-group" style={{ display: "flex", alignItems: "center", paddingBottom: "10px" }}>
                <label className="admin-checkbox-label">
                  <input
                    type="checkbox"
                    checked={newGalTall}
                    onChange={(e) => setNewGalTall(e.target.checked)}
                  />
                  <span>Tall Aspect Ratio</span>
                </label>
              </div>

              <button type="submit" className="btn btn-primary" style={{ marginBottom: "14px" }}>
                <Icon name="plus" /> Add to Gallery
              </button>
            </form>
          </div>

          <div className="admin-panel">
            <h2>Active Showcase Items ({galleryItems.length})</h2>
            <div className="admin-gallery-curation-grid">
              {galleryItems.map((item, idx) => (
                <div key={item.id || idx} className="admin-gallery-curation-item">
                  <img src={item.img} alt={item.alt} loading="lazy" />
                  <div className="admin-gallery-item-overlay">
                    <span className="admin-badge admin-badge--paid">{item.category}</span>
                    {item.tall && <span className="admin-badge admin-badge--draft">Tall</span>}
                    <button
                      type="button"
                      className="btn-icon btn-icon-danger"
                      onClick={() => handleDeleteGallery(item.id || idx)}
                      title="Remove"
                    >
                      <Icon name="trash" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
