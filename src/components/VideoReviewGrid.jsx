import { useEffect, useState } from "react";
import { getVideoReviews } from "../lib/catalogStore";
import { youtubeId } from "../lib/video";

function VideoReviewCard({ item }) {
  const ytId = youtubeId(item.url);
  const embedSrc = ytId
    ? `https://www.youtube-nocookie.com/embed/${ytId}${item.hideControls ? "?controls=0" : ""}`
    : null;
  return (
    <div className="video-review-card reveal">
      <div className="video-review-media">
        {embedSrc ? (
          <iframe
            src={embedSrc}
            title={item.name}
            loading="lazy"
            allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <video controls preload="none" poster={item.thumbnail || undefined} src={item.url} />
        )}
      </div>
      <div className="video-review-body">
        <h5>{item.name}</h5>
        {item.caption ? <p>{item.caption}</p> : null}
      </div>
    </div>
  );
}

export default function VideoReviewGrid() {
  const [items, setItems] = useState(getVideoReviews);

  useEffect(() => {
    function refresh() {
      setItems(getVideoReviews());
    }
    window.addEventListener("nle-catalog-updated", refresh);
    return () => window.removeEventListener("nle-catalog-updated", refresh);
  }, []);

  if (items.length === 0) return null;

  return (
    <section className="shop-section" id="video-reviews">
      <div className="container">
        <div className="shop-head reveal"><h2>YouTube Video</h2></div>
        <div className="video-review-grid reveal">
          {items.map((v) => (
            <VideoReviewCard key={v.id} item={v} />
          ))}
        </div>
      </div>
    </section>
  );
}
