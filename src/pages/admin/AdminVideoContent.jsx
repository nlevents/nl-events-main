import { useEffect, useState } from "react";
import {
  getInstaVideos,
  saveInstaVideo,
  deleteInstaVideo,
  getVideoReviews,
  saveVideoReview,
  deleteVideoReview,
} from "../../lib/catalogStore";
import Icon from "../../components/Icon";
import usePageMeta from "../../hooks/usePageMeta";

export default function AdminVideoContent() {
  usePageMeta("YouTube Shorts & Videos — Admin", "Manage the Shorts rail (Instagram reels or YouTube Shorts) and customer video reviews shown on the homepage.");

  const [activeTab, setActiveTab] = useState("insta"); // 'insta' | 'video'
  const [instaVideos, setInstaVideos] = useState(getInstaVideos);
  const [videoReviews, setVideoReviews] = useState(getVideoReviews);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  const [igUrl, setIgUrl] = useState("");
  const [igCaption, setIgCaption] = useState("");
  const [igThumb, setIgThumb] = useState("");

  const [vrUrl, setVrUrl] = useState("");
  const [vrName, setVrName] = useState("");
  const [vrCaption, setVrCaption] = useState("");
  const [vrThumb, setVrThumb] = useState("");

  function refresh() {
    setInstaVideos(getInstaVideos());
    setVideoReviews(getVideoReviews());
  }

  useEffect(() => {
    window.addEventListener("nle-catalog-updated", refresh);
    return () => window.removeEventListener("nle-catalog-updated", refresh);
  }, []);

  function flash(msg) {
    setFeedback(msg);
    setError("");
    setTimeout(() => setFeedback(""), 3000);
  }

  function handleAddInsta(e) {
    e.preventDefault();
    try {
      saveInstaVideo({ url: igUrl.trim(), caption: igCaption.trim(), thumbnail: igThumb.trim() });
      setIgUrl("");
      setIgCaption("");
      setIgThumb("");
      refresh();
      flash("Short added — now live above Customer Reviews.");
    } catch (err) {
      setError(err.message);
    }
  }

  function handleDeleteInsta(id) {
    if (window.confirm("Remove this short from the homepage?")) {
      deleteInstaVideo(id);
      refresh();
      flash("Short removed.");
    }
  }

  function handleAddVideo(e) {
    e.preventDefault();
    try {
      saveVideoReview({ url: vrUrl.trim(), name: vrName.trim(), caption: vrCaption.trim(), thumbnail: vrThumb.trim() });
      setVrUrl("");
      setVrName("");
      setVrCaption("");
      setVrThumb("");
      refresh();
      flash("Video review added — now live below Customer Reviews.");
    } catch (err) {
      setError(err.message);
    }
  }

  function handleDeleteVideo(id) {
    if (window.confirm("Remove this video review from the homepage?")) {
      deleteVideoReview(id);
      refresh();
      flash("Video review removed.");
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <div>
          <h1>YouTube Shorts &amp; Videos</h1>
          <p className="admin-hint">
            Manage the Shorts strip shown above Customer Reviews, and the video reviews shown below it — both on the homepage.
          </p>
        </div>
        <div className="admin-tabs" style={{ margin: 0 }}>
          <button type="button" className={`admin-tab ${activeTab === "insta" ? "active" : ""}`} onClick={() => setActiveTab("insta")}>
            <Icon name="sparkle" /> Shorts ({instaVideos.length})
          </button>
          <button type="button" className={`admin-tab ${activeTab === "video" ? "active" : ""}`} onClick={() => setActiveTab("video")}>
            <Icon name="package" /> Video Reviews ({videoReviews.length})
          </button>
        </div>
      </div>

      {feedback && <div className="admin-alert admin-alert--success">{feedback}</div>}
      {error && <div className="admin-alert admin-alert--error">{error}</div>}

      {activeTab === "insta" && (
        <>
          <div className="admin-panel">
            <form onSubmit={handleAddInsta} className="admin-form-row">
              <div className="admin-form-group" style={{ flex: 2 }}>
                <label className="admin-form-label">Video link (Instagram reel or YouTube Short) *</label>
                <input
                  type="url"
                  className="admin-input"
                  placeholder="https://www.instagram.com/reel/... or https://www.youtube.com/shorts/..."
                  value={igUrl}
                  onChange={(e) => setIgUrl(e.target.value)}
                  required
                />
              </div>
              <div className="admin-form-group" style={{ flex: 2 }}>
                <label className="admin-form-label">Thumbnail image URL</label>
                <input
                  type="url"
                  className="admin-input"
                  placeholder="https://... (a still frame from the reel)"
                  value={igThumb}
                  onChange={(e) => setIgThumb(e.target.value)}
                />
              </div>
              <div className="admin-form-group" style={{ flex: 2 }}>
                <label className="admin-form-label">Caption (optional)</label>
                <input
                  type="text"
                  className="admin-input"
                  placeholder="e.g. Behind the scenes — Ranchi wedding"
                  value={igCaption}
                  onChange={(e) => setIgCaption(e.target.value)}
                />
              </div>
              <button type="submit" className="btn btn-primary">Add Video</button>
            </form>
            <p className="admin-hint" style={{ marginTop: 10 }}>
              YouTube Shorts get a real thumbnail automatically. For Instagram reels, or to override a YouTube
              thumbnail, upload a still frame (via Media Library) and paste its URL here — otherwise the card
              shows a plain gradient placeholder until tapped.
            </p>
          </div>

          <div className="admin-panel" style={{ marginTop: 16 }}>
            {instaVideos.length === 0 ? (
              <p className="admin-empty">No Shorts added yet.</p>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr><th>Thumbnail</th><th>Link</th><th>Caption</th><th></th></tr>
                </thead>
                <tbody>
                  {instaVideos.map((v) => (
                    <tr key={v.id}>
                      <td>
                        {v.thumbnail ? (
                          <img src={v.thumbnail} alt="" className="admin-table-thumb" />
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td><a href={v.url} target="_blank" rel="noopener noreferrer">{v.url}</a></td>
                      <td>{v.caption || <span className="text-muted">—</span>}</td>
                      <td className="admin-row-actions">
                        <button type="button" className="btn btn-sm btn-outline" onClick={() => handleDeleteInsta(v.id)}>
                          <Icon name="close" /> Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {activeTab === "video" && (
        <>
          <div className="admin-panel">
            <form onSubmit={handleAddVideo} className="admin-form-row" style={{ flexWrap: "wrap" }}>
              <div className="admin-form-group" style={{ flex: 2 }}>
                <label className="admin-form-label">Video URL * (YouTube link or direct .mp4)</label>
                <input
                  type="url"
                  className="admin-input"
                  placeholder="https://youtu.be/XXXXXXXXXXX"
                  value={vrUrl}
                  onChange={(e) => setVrUrl(e.target.value)}
                  required
                />
              </div>
              <div className="admin-form-group" style={{ flex: 1 }}>
                <label className="admin-form-label">Client Name</label>
                <input type="text" className="admin-input" placeholder="Ananya & Rohan" value={vrName} onChange={(e) => setVrName(e.target.value)} />
              </div>
              <div className="admin-form-group" style={{ flex: 1 }}>
                <label className="admin-form-label">Thumbnail URL (optional, for .mp4 only)</label>
                <input type="url" className="admin-input" placeholder="https://..." value={vrThumb} onChange={(e) => setVrThumb(e.target.value)} />
              </div>
              <div className="admin-form-group" style={{ flex: 2 }}>
                <label className="admin-form-label">Caption</label>
                <input type="text" className="admin-input" placeholder="Wedding, Ranchi" value={vrCaption} onChange={(e) => setVrCaption(e.target.value)} />
              </div>
              <button type="submit" className="btn btn-primary">Add Video Review</button>
            </form>
          </div>

          <div className="admin-panel" style={{ marginTop: 16 }}>
            {videoReviews.length === 0 ? (
              <p className="admin-empty">No video reviews added yet.</p>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr><th>Client</th><th>Link</th><th>Caption</th><th></th></tr>
                </thead>
                <tbody>
                  {videoReviews.map((v) => (
                    <tr key={v.id}>
                      <td>{v.name}</td>
                      <td><a href={v.url} target="_blank" rel="noopener noreferrer">{v.url}</a></td>
                      <td>{v.caption || <span className="text-muted">—</span>}</td>
                      <td className="admin-row-actions">
                        <button type="button" className="btn btn-sm btn-outline" onClick={() => handleDeleteVideo(v.id)}>
                          <Icon name="close" /> Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
