import { useEffect, useRef, useState } from "react";
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
  const [lightboxZoom, setLightboxZoom] = useState(1);
  const [lightboxPan, setLightboxPan] = useState({ x: 0, y: 0 });
  const lightboxDragRef = useRef(null);
  const lightboxPointersRef = useRef(new Map());
  const lightboxPinchRef = useRef(null);
  const lightboxDialogRef = useRef(null);
  const touchStartRef = useRef(null);

  useEffect(() => {
    setActive(0);
  }, [firstImage]);

  useEffect(() => {
    if (!lightbox) return undefined;
    const dialog = lightboxDialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    const previousOverflow = document.body.style.overflow;
    const previousTouchAction = document.body.style.touchAction;
    function onKey(e) {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") { resetLightboxZoom(); prev(); }
      if (e.key === "ArrowRight") { resetLightboxZoom(); next(); }
      if (e.key === "+" || e.key === "=") changeLightboxZoom(lightboxZoom + 0.5);
      if (e.key === "-" || e.key === "_") changeLightboxZoom(lightboxZoom - 0.5);
      if (e.key === "0") resetLightboxZoom();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      document.body.style.touchAction = previousTouchAction;
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

  function resetLightboxZoom() {
    setLightboxZoom(1);
    setLightboxPan({ x: 0, y: 0 });
    lightboxDragRef.current = null;
    lightboxPointersRef.current.clear();
    lightboxPinchRef.current = null;
  }

  function openLightbox() {
    resetLightboxZoom();
    setLightbox(true);
  }

  function closeLightbox() {
    resetLightboxZoom();
    setLightbox(false);
  }

  function changeLightboxZoom(nextZoom) {
    const value = Math.min(4, Math.max(1, Number(nextZoom) || 1));
    setLightboxZoom(value);
    if (value === 1) setLightboxPan({ x: 0, y: 0 });
  }

  function handleLightboxWheel(e) {
    e.preventDefault();
    e.stopPropagation();
    const direction = e.deltaY < 0 ? 0.25 : -0.25;
    changeLightboxZoom(Math.round((lightboxZoom + direction) * 100) / 100);
  }

  function pointerDistance() {
    const points = Array.from(lightboxPointersRef.current.values());
    if (points.length < 2) return 0;
    const dx = points[0].x - points[1].x;
    const dy = points[0].y - points[1].y;
    return Math.hypot(dx, dy);
  }

  function handleLightboxPointerDown(e) {
    lightboxPointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    e.currentTarget.setPointerCapture?.(e.pointerId);
    if (lightboxPointersRef.current.size >= 2) {
      lightboxDragRef.current = null;
      lightboxPinchRef.current = {
        distance: pointerDistance(),
        zoom: lightboxZoom,
      };
      return;
    }
    if (lightboxZoom > 1) {
      lightboxDragRef.current = { x: e.clientX, y: e.clientY, panX: lightboxPan.x, panY: lightboxPan.y };
    }
  }

  function handleLightboxPointerMove(e) {
    if (!lightboxPointersRef.current.has(e.pointerId)) return;
    lightboxPointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (lightboxPinchRef.current && lightboxPointersRef.current.size >= 2) {
      const start = lightboxPinchRef.current;
      const distance = pointerDistance();
      if (distance > 0 && start.distance > 0) {
        changeLightboxZoom(start.zoom * (distance / start.distance));
      }
      return;
    }
    const start = lightboxDragRef.current;
    if (!start || lightboxZoom <= 1) return;
    setLightboxPan({
      x: start.panX + e.clientX - start.x,
      y: start.panY + e.clientY - start.y,
    });
  }

  function handleLightboxPointerUp(e) {
    lightboxPointersRef.current.delete(e.pointerId);
    if (lightboxPointersRef.current.size < 2) lightboxPinchRef.current = null;
    if (lightboxPointersRef.current.size === 0) lightboxDragRef.current = null;
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
        <button type="button" className="pd-gallery-zoom" aria-label="View full-size image" onClick={openLightbox}>
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
              <img src={src} alt={`${alt} thumbnail`} loading="lazy" decoding="async" onError={onImgError}/>
            </button>
          ))}
        </div>
      )}

      {lightbox && (
        <dialog
          ref={lightboxDialogRef}
          className="pd-lightbox"
          aria-label="Full-size product image"
          onCancel={(e) => { e.preventDefault(); closeLightbox(); }}
          onClose={closeLightbox}
          onClick={(e) => { if (e.target === e.currentTarget) closeLightbox(); }}
        >
          <button type="button" className="pd-lightbox-close" aria-label="Close image viewer" title="Close image viewer" onClick={closeLightbox}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>

          <div className="pd-lightbox-stage">
            <div
              className="pd-lightbox-viewport"
              onWheel={handleLightboxWheel}
              onPointerDown={handleLightboxPointerDown}
              onPointerMove={handleLightboxPointerMove}
              onPointerUp={handleLightboxPointerUp}
              onPointerCancel={handleLightboxPointerUp}
              onDoubleClick={() => changeLightboxZoom(lightboxZoom > 1 ? 1 : 2)}
              onClick={(e) => e.stopPropagation()}
            >
              <img
                className={`pd-lightbox-image${lightboxZoom > 1 ? " is-zoomed" : ""}`}
                src={list[active]}
                alt={alt}
                loading="lazy"
                decoding="async"
                onError={onImgError}
                draggable="false"
                style={{ transform: `translate3d(${lightboxPan.x}px, ${lightboxPan.y}px, 0) scale(${lightboxZoom})` }}
              />
            </div>
          </div>

          {list.length > 1 && (
            <>
              <button type="button" className="pd-lightbox-nav prev" aria-label="Previous image" onClick={() => { resetLightboxZoom(); prev(); }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 6l-6 6 6 6" /></svg>
              </button>
              <button type="button" className="pd-lightbox-nav next" aria-label="Next image" onClick={() => { resetLightboxZoom(); next(); }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 6l6 6-6 6" /></svg>
              </button>
            </>
          )}

          <div className="pd-lightbox-controls" role="group" aria-label="Image zoom controls" onClick={(e) => e.stopPropagation()}>
            <button type="button" aria-label="Zoom out" onClick={() => changeLightboxZoom(lightboxZoom - 0.5)} disabled={lightboxZoom <= 1}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14" /></svg>
            </button>
            <button type="button" className="pd-lightbox-zoom-level" aria-label="Reset zoom" onClick={resetLightboxZoom}>
              {Math.round(lightboxZoom * 100)}%
            </button>
            <button type="button" aria-label="Zoom in" onClick={() => changeLightboxZoom(lightboxZoom + 0.5)} disabled={lightboxZoom >= 4}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
            </button>
          </div>
        </dialog>
      )}
    </div>
  );
}
