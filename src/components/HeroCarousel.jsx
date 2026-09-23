import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

const AUTOPLAY_MS = 5000;
const RESUME_MS = 6000;
const SWIPE_THRESHOLD = 35; // minimum horizontal px to register a swipe

export default function HeroCarousel({ slides }) {
  const list = Array.isArray(slides) ? slides.filter((s) => s && s.src) : [];
  const count = list.length;
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef(null);
  const resumeRef = useRef(null);

  // Touch tracking refs for robust mobile touch-swiping
  const touchStart = useRef({ x: 0, y: 0 });
  const touchCurrent = useRef({ x: 0, y: 0 });
  const isTouching = useRef(false);

  const clear = useCallback((ref) => {
    if (ref.current) {
      clearInterval(ref.current);
      clearTimeout(ref.current);
    }
    ref.current = null;
  }, []);

  useEffect(() => {
    if (count < 2 || paused) return undefined;
    timerRef.current = setInterval(() => setIdx((i) => (i + 1) % count), AUTOPLAY_MS);
    return () => clear(timerRef);
  }, [count, paused, clear]);

  useEffect(() => () => { clear(timerRef); clear(resumeRef); }, [clear]);

  function pauseThenResume() {
    setPaused(true);
    clear(resumeRef);
    resumeRef.current = setTimeout(() => setPaused(false), RESUME_MS);
  }

  function goTo(i) {
    if (count === 0) return;
    setIdx(((i % count) + count) % count);
    pauseThenResume();
  }

  function handleTouchStart(e) {
    if (count < 2) return;
    const touch = e.touches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY };
    touchCurrent.current = { x: touch.clientX, y: touch.clientY };
    isTouching.current = true;
    setPaused(true);
  }

  function handleTouchMove(e) {
    if (!isTouching.current) return;
    const touch = e.touches[0];
    touchCurrent.current = { x: touch.clientX, y: touch.clientY };
  }

  function handleTouchEnd() {
    if (!isTouching.current) return;
    isTouching.current = false;

    const dx = touchCurrent.current.x - touchStart.current.x;
    const dy = touchCurrent.current.y - touchStart.current.y;

    // Check if horizontal swipe dominates vertical movement and exceeds threshold
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) >= SWIPE_THRESHOLD) {
      if (dx < 0) {
        // Swiped left -> next slide
        goTo(idx + 1);
      } else {
        // Swiped right -> prev slide
        goTo(idx - 1);
      }
    } else {
      pauseThenResume();
    }
  }

  function handleTouchCancel() {
    isTouching.current = false;
    pauseThenResume();
  }

  if (count === 0) return null;

  return (
    <section
      className="hero-compact reveal"
      aria-roledescription="carousel"
      aria-label="Featured events"
      style={{ touchAction: "pan-y" }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
    >
      <div
        className="hero-carousel-track"
        style={{ transform: `translateX(-${idx * 100}%)`, touchAction: "pan-y" }}
      >
        {list.map((s, i) => (
          <div className="hero-carousel-slide" key={i} aria-hidden={i === idx ? undefined : "true"}>
            {s.href ? (
              <Link to={s.href} tabIndex={i === idx ? 0 : -1}>
                <img
                  src={s.src}
                  alt={s.alt || ""}
                  draggable="false"
                  loading={i === 0 ? "eager" : "lazy"}
                  fetchpriority={i === 0 ? "high" : undefined}
                  decoding="async"
                />
              </Link>
            ) : (
              <img
                src={s.src}
                alt={s.alt || ""}
                draggable="false"
                loading={i === 0 ? "eager" : "lazy"}
                decoding="async"
                fetchpriority={i === 0 ? "high" : undefined}
              />
            )}
          </div>
        ))}
      </div>

      <div className="hero-compact-content">
        <span className="eyebrow">Next Level Events</span>
        <h1>Your Dream. Our Creation.</h1>
        <div className="hero-compact-actions">
          <Link to="/services" className="btn btn-primary">
            Explore Events
          </Link>
          <Link to="/book-event" className="btn btn-ghost">
            Book Consultation
          </Link>
        </div>
      </div>

      {count > 1 && (
        <>
          <button
            type="button"
            className="hero-arrow hero-arrow-prev"
            aria-label="Previous slide"
            onClick={() => goTo(idx - 1)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 6l-6 6 6 6" />
            </svg>
          </button>
          <button
            type="button"
            className="hero-arrow hero-arrow-next"
            aria-label="Next slide"
            onClick={() => goTo(idx + 1)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </button>
          <div className="hero-carousel-dots" role="tablist">
            {list.map((_, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={i === idx}
                className={"hero-carousel-dot" + (i === idx ? " is-active" : "")}
                aria-label={"Go to slide " + (i + 1)}
                onClick={() => goTo(i)}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
