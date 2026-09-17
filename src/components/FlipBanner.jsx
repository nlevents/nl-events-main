import { useEffect, useRef, useState, useCallback } from "react";
import { onImgError } from "../lib/imageFallback";

// Flipkart-style full-width banner slider: autoplay, swipe, arrows + dots.
// Slides are trusted, hard-coded site content only (never user input),
// so this stays XSS-safe by construction.
export default function FlipBanner({ slides, interval = 4200 }) {
  const [active, setActive] = useState(0);
  const timerRef = useRef(null);
  const touchStart = useRef(0);
  const count = Array.isArray(slides) ? slides.length : 0;

  const goTo = useCallback(
    (idx) => {
      if (!count) return;
      setActive(((idx % count) + count) % count);
    },
    [count]
  );

  useEffect(() => {
    if (count < 2) return undefined;
    timerRef.current = setInterval(() => goTo(active + 1), interval);
    return () => clearInterval(timerRef.current);
  }, [active, count, interval, goTo]);

  if (!count) return null;

  function onTouchStart(e) {
    touchStart.current = e.touches[0].clientX;
  }
  function onTouchEnd(e) {
    const dx = e.changedTouches[0].clientX - touchStart.current;
    if (Math.abs(dx) > 40) goTo(active + (dx < 0 ? 1 : -1));
  }

  return (
    <div className="fk-banner" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <div className="fk-banner-track" style={{ transform: `translateX(-${active * 100}%)` }}>
        {slides.map((s, i) => (
          <a
            key={i}
            href={s.href || "#"}
            className="fk-banner-slide"
            style={{ background: s.bg || "var(--surface)" }}
            aria-label={s.title}
          >
            <div className="fk-banner-copy">
              {s.eyebrow ? <span className="fk-banner-eyebrow">{s.eyebrow}</span> : null}
              <h3>{s.title}</h3>
              {s.sub ? <p>{s.sub}</p> : null}
            </div>
            <div className="fk-banner-media">
              <img src={s.img} alt={s.title} loading={i === 0 ? "eager" : "lazy"} draggable="false"  onError={onImgError}/>
            </div>
          </a>
        ))}
      </div>

      {count > 1 && (
        <>
          <button type="button" className="fk-banner-arrow fk-banner-prev" aria-label="Previous slide" onClick={() => goTo(active - 1)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 6l-6 6 6 6" /></svg>
          </button>
          <button type="button" className="fk-banner-arrow fk-banner-next" aria-label="Next slide" onClick={() => goTo(active + 1)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 6l6 6-6 6" /></svg>
          </button>
          <div className="fk-banner-dots">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                className={"fk-banner-dot" + (i === active ? " active" : "")}
                aria-label={`Go to slide ${i + 1}`}
                onClick={() => goTo(i)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
