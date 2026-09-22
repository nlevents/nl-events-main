import { useEffect, useRef, useState } from "react";
import { getInstaVideos } from "../lib/catalogStore";
import { youtubeId, youtubeThumbnail } from "../lib/video";

const IG_EMBED_SRC = "https://www.instagram.com/embed.js";

// Loads Instagram's official embed script once and (re)processes any
// .instagram-media blockquotes currently on the page. Safe: the script is
// Instagram's own, loaded from instagram.com, and only ever runs against
// permalinks that already passed sanitizeShortVideoUrl() on save.
function useInstagramEmbedScript(deps) {
  useEffect(() => {
    function process() {
      if (window.instgrm && window.instgrm.Embeds) window.instgrm.Embeds.process();
    }
    if (document.getElementById("ig-embed-script")) {
      process();
      return;
    }
    const script = document.createElement("script");
    script.id = "ig-embed-script";
    script.src = IG_EMBED_SRC;
    script.async = true;
    script.onload = process;
    document.body.appendChild(script);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

function PlayGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
      <path d="M8 5.5v13l11-6.5-11-6.5Z" />
    </svg>
  );
}

function ChevronGlyph({ direction }) {
  const d = direction === "left" ? "M14.5 5 8 12l6.5 7" : "M9.5 5 16 12l-6.5 7";
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

function ShortThumbCard({ video, onOpen }) {
  const ytId = youtubeId(video.url);
  const thumbSrc = video.thumbnail || (ytId ? youtubeThumbnail(ytId) : "");
  return (
    <button type="button" className="insta-card" onClick={() => onOpen(video)} aria-label="Play video">
      {thumbSrc ? (
        <img src={thumbSrc} alt={video.caption || "Short video"} loading="lazy" />
      ) : (
        <div className="insta-card-fallback" aria-hidden="true" />
      )}
      <span className="insta-card-play"><PlayGlyph /></span>
      {video.caption ? <span className="insta-card-caption">{video.caption}</span> : null}
    </button>
  );
}

function ShortsLightbox({ video, onClose }) {
  const ytId = video ? youtubeId(video.url) : null;
  useInstagramEmbedScript([video?.id]);

  if (!video) return null;

  return (
    <div className="insta-lightbox" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="insta-lightbox-inner" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="insta-lightbox-close" onClick={onClose} aria-label="Close">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="m5 5 14 14M19 5 5 19" />
          </svg>
        </button>
        {ytId ? (
          <div className="insta-lightbox-yt">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1`}
              title={video.caption || "Short video"}
              loading="lazy"
              allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          <blockquote
            className="instagram-media"
            data-instgrm-permalink={video.url}
            data-instgrm-version="14"
            style={{ margin: 0, width: "100%" }}
          >
            <a href={video.url} target="_blank" rel="noopener noreferrer">
              View on Instagram
            </a>
          </blockquote>
        )}
      </div>
    </div>
  );
}

export default function ShortsRail() {
  const [videos, setVideos] = useState(() => getInstaVideos().filter((v) => v.active !== false).sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0)));
  const [active, setActive] = useState(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const railRef = useRef(null);

  useEffect(() => {
    function refresh() {
      setVideos(getInstaVideos().filter((v) => v.active !== false).sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0)));
    }
    window.addEventListener("nle-catalog-updated", refresh);
    return () => window.removeEventListener("nle-catalog-updated", refresh);
  }, []);

  function updateEdges() {
    const el = railRef.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 4);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
  }

  useEffect(() => {
    updateEdges();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videos.length]);

  function scrollByCard(dir) {
    const el = railRef.current;
    if (!el) return;
    const card = el.querySelector(".insta-card");
    const step = card ? card.getBoundingClientRect().width + 18 : el.clientWidth * 0.8;
    el.scrollBy({ left: dir * step, behavior: "smooth" });
  }

  if (videos.length === 0) return null;

  return (
    <section className="shop-section" id="shorts">
      <div className="container">
        <div className="shop-head reveal"><h2>Shorts</h2></div>
        <div className="insta-rail-wrap reveal">
          <button
            type="button"
            className="insta-rail-nav insta-rail-nav--prev"
            onClick={() => scrollByCard(-1)}
            disabled={atStart}
            aria-label="Previous"
          >
            <ChevronGlyph direction="left" />
          </button>
          <div className="insta-rail" ref={railRef} onScroll={updateEdges}>
            {videos.map((v) => (
              <ShortThumbCard key={v.id} video={v} onOpen={setActive} />
            ))}
          </div>
          <button
            type="button"
            className="insta-rail-nav insta-rail-nav--next"
            onClick={() => scrollByCard(1)}
            disabled={atEnd}
            aria-label="Next"
          >
            <ChevronGlyph direction="right" />
          </button>
        </div>
      </div>
      <ShortsLightbox video={active} onClose={() => setActive(null)} />
    </section>
  );
}
