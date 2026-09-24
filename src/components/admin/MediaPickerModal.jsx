import { useEffect, useState } from "react";
import { getMediaItems, uploadMediaFile, saveMediaItemToCloud } from "../../lib/catalogStore";
import Icon from "../Icon";

export default function MediaPickerModal({ isOpen, onClose, onSelect, multiple = false }) {
  const [activeTab, setActiveTab] = useState("library"); // 'library' | 'upload' | 'url'
  const [urlInput, setUrlInput] = useState("");
  const [titleInput, setTitleInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);

  useEffect(() => {
    if (!isOpen) setSelectedIds([]);
  }, [isOpen]);

  if (!isOpen) return null;

  const mediaItems = getMediaItems();
  const filtered = mediaItems.filter(
    (m) =>
      m.title.toLowerCase().includes(search.toLowerCase()) ||
      (m.alt && m.alt.toLowerCase().includes(search.toLowerCase())) ||
      (m.tags && m.tags.some((t) => t.toLowerCase().includes(search.toLowerCase())))
  );

  async function handleFileUpload(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setError("");
    setUploading(true);
    try {
      const saved = [];
      for (const file of files) {
        saved.push(await uploadMediaFile(file, titleInput || file.name));
      }
      onSelect(multiple ? saved.map((item) => item.url) : saved[0].url);
      onClose();
    } catch (err) {
      setError(err.message || "Failed to upload image.");
    } finally {
      setUploading(false);
    }
  }

  async function handleUrlSubmit(e) {
    e.preventDefault();
    if (!urlInput.trim()) {
      setError("Please provide a valid image URL.");
      return;
    }
    try {
      const saved = await saveMediaItemToCloud({
        title: titleInput || "Imported Image",
        url: urlInput.trim(),
        alt: titleInput || "Imported photo",
        tags: ["url-import"],
      });
      onSelect(saved.url);
      onClose();
    } catch (err) {
      setError(err.message || "Unable to save this image to the cloud.");
    }
  }

  return (
    <div className="admin-modal-backdrop" onClick={onClose}>
      <div className="admin-modal-card admin-media-modal" onClick={(e) => e.stopPropagation()}>
        <div className="admin-modal-header">
          <h2>Select Picture / Media</h2>
          <button type="button" className="btn-icon" onClick={onClose}>
            <Icon name="close" />
          </button>
        </div>

        <div className="admin-tabs">
          <button
            type="button"
            className={`admin-tab ${activeTab === "library" ? "active" : ""}`}
            onClick={() => { setActiveTab("library"); setError(""); }}
          >
            <Icon name="image" /> Media Library ({mediaItems.length})
          </button>
          <button
            type="button"
            className={`admin-tab ${activeTab === "upload" ? "active" : ""}`}
            onClick={() => { setActiveTab("upload"); setError(""); }}
          >
            <Icon name="upload" /> Upload Picture
          </button>
          <button
            type="button"
            className={`admin-tab ${activeTab === "url" ? "active" : ""}`}
            onClick={() => { setActiveTab("url"); setError(""); }}
          >
            <Icon name="compass" /> Direct URL / CDN
          </button>
        </div>

        {error && <div className="admin-alert admin-alert--error">{error}</div>}

        {activeTab === "library" && (
          <div className="admin-media-picker-body">
            <input
              type="search"
              className="admin-search"
              placeholder="Search images by title or tag..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
            {filtered.length === 0 ? (
              <p className="admin-empty">No images found. Upload a picture or switch to URL tab.</p>
            ) : (
              <div className="admin-media-picker-grid">
                {filtered.map((item) => (
                  <div
                    key={item.id}
                    className={`admin-media-picker-item${selectedIds.includes(item.id) ? " selected" : ""}`}
                    onClick={() => {
                      if (!multiple) {
                        onSelect(item.url);
                        onClose();
                        return;
                      }
                      setSelectedIds((current) => current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id]);
                    }}
                    title={item.title}
                  >
                    <img src={item.url} alt={item.alt || item.title} loading="lazy" />
                    <span className="admin-media-picker-label">{item.title}</span>
                  </div>
                ))}
              </div>
            )}
            {multiple && filtered.length > 0 && (
              <div className="admin-modal-actions">
                <button type="button" className="btn btn-sm btn-ghost" onClick={() => setSelectedIds([])}>Clear</button>
                <button type="button" className="btn btn-sm btn-primary" disabled={!selectedIds.length} onClick={() => {
                  const urls = filtered.filter((item) => selectedIds.includes(item.id)).map((item) => item.url);
                  onSelect(urls);
                  onClose();
                }}>Use Selected ({selectedIds.length})</button>
              </div>
            )}
          </div>
        )}

        {activeTab === "upload" && (
          <div className="admin-media-upload-area">
            <label className="admin-form-label">Image Title (optional)</label>
            <input
              type="text"
              className="admin-search"
              placeholder="e.g. Grand Mandap Stage"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
            />
            <div className="admin-dropzone">
              <Icon name="upload" />
              <p>Choose an image from your device</p>
              <span>PNG, JPG, WebP, GIF up to 5MB</span>
              <input
                type="file"
                multiple={multiple}
                accept="image/png, image/jpeg, image/webp, image/gif"
                onChange={handleFileUpload}
                disabled={uploading}
              />
            </div>
            {uploading && <p className="admin-hint">Optimizing and saving picture...</p>}
          </div>
        )}

        {activeTab === "url" && (
          <form onSubmit={handleUrlSubmit} className="admin-media-url-form">
            <label className="admin-form-label">Image Title (optional)</label>
            <input
              type="text"
              className="admin-search"
              placeholder="e.g. Royal Wedding Decor"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
            />
            <label className="admin-form-label">Picture URL (https://...)</label>
            <input
              type="url"
              className="admin-search"
              placeholder="https://images.unsplash.com/..."
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              required
            />
            {urlInput && (
              <div className="admin-media-preview-box">
                <p className="admin-hint">Preview:</p>
                <img src={urlInput} alt="Preview" onError={() => setError("Unable to load image preview from this URL.")} />
              </div>
            )}
            <div className="admin-modal-actions">
              <button type="button" className="btn btn-sm btn-ghost" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-sm btn-primary">
                Use This Picture
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
