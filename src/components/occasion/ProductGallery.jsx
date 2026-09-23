import { useEffect, useRef, useState } from "react";
import Icon from "../Icon";
import { onImgError } from "../../lib/imageFallback";

// Swipe distance (px) that counts as an intentional slide rather than a tap
// or a vertical-scroll gesture.
const SWIPE_THRESHOLD = 40;

// Reusable product image gallery: large image + thumbnail strip (scrolls on
// mobile, wraps on desktop) + a simple full-screen lightbox. `images` is a
// plain array of image URLs — nothing here uses dangerouslySetInnerHTML, so
// all text/alt content stays auto-escaped by React.
//
// The main image area is also a touch-swipeable carousel with dot
// indicators (mobile-first, Flipkart/marketplace-style product page), while
// still exposing the same prev/next arrows and thumbnail strip on desktop.
export default function ProductGallery({ images, alt }) {
  const list = Array.isArray(images) ? images.filter(Boolean) : [];
  const firstImage = list[0] || null;
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const touchStartRef = useRef(null);

  useEffect(() => {
    setActive(0);
  }, [firstImage]);

  useEffect(() => {
    if (!lightbox) return;
    function onKey(e) {
      if (e.key === "Escape") setLightbox(false);
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightbox, list.length]);

  if (!list.length) return null;

  function prev() {
    setActive((i) => (i - 1 + list.length) % list.length);
  }
  function next() {
    setActive((i) => (i + 1) % list.length);
  }

  function onTouchStart(e) {
    if (list.length < 2) return;
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY };
  }
  function onTouchEnd(e) {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start || list.length < 2) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    // Ignore mostly-vertical drags so page scrolling still works normally.
    if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dx) < Math.abs(dy)) return;
    if (dx < 0) next();
    else prev();
  }

  return (
    <div className="pd-gallery reveal">
      <div
        className="pd-gallery-main"
        style={{ touchAction: "pan-y" }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <button type="button" className="pd-gallery-zoom" aria-label="View full-size image" onClick={() => setLightbox(true)}>
          <img src={list[active]} alt={alt}  loading="lazy" decoding="async" onError={onImgError}/>
        </button>
        {list.length > 1 && (
          <>
            <button type="button" className="pd-gallery-nav prev" aria-label="Previous image" onClick={prev}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 6l-6 6 6 6" /></svg>
            </button>
            <button type="button" className="pd-gallery-nav next" aria-label="Next image" onClick={next}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 6l6 6-6 6" /></svg>
            </button>
            <span className="pd-gallery-count">{active + 1} / {list.length}</span>
            <div className="pd-gallery-dots" role="tablist" aria-label="Slide indicators">
              {list.map((src, i) => (
                <button
                  type="button"
                  key={"dot-" + src + i}
                  className={"pd-gallery-dot" + (i === active ? " active" : "")}
                  role="tab"
                  aria-selected={i === active}
                  aria-label={"Go to image " + (i + 1)}
                  onClick={() => setActive(i)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {list.length > 1 && (
        <div className="pd-gallery-thumbs" role="tablist" aria-label="Product images">
          {list.map((src, i) => (
            <button
              type="button"
              key={src + i}
              className={"pd-thumb" + (i === active ? " active" : "")}
              role="tab"
              aria-selected={i === active}
              onClick={() => setActive(i)}
            >
              <img src={src} alt=""  loading="lazy" decoding="async" onError={onImgError}/>
            </button>
          ))}
        </div>
      )}

      {lightbox && (
        <div className="pd-lightbox" role="dialog" aria-modal="true" onClick={(e) => { if (e.target === e.currentTarget) setLightbox(false); }}>
          <button type="button" className="pd-lightbox-close" aria-label="Close" onClick={() => setLightbox(false)}>
            <Icon name="close" />
          </button>
          <img src={list[active]} alt={alt}  loading="lazy" decoding="async" onError={onImgError}/>
          {list.length > 1 && (
            <>
              <button type="button" className="pd-lightbox-nav prev" aria-label="Previous image" onClick={prev}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 6l-6 6 6 6" /></svg>
              </button>
              <button type="button" className="pd-lightbox-nav next" aria-label="Next image" onClick={next}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 6l6 6-6 6" /></svg>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
