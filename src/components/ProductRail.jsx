import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useCity } from "../context/CityContext";
import { cityPrice, fmtINR } from "../lib/pricing";
import { onImgError } from "../lib/imageFallback";

// Reusable horizontal product/package carousel: touch-swipe native scroll on
// mobile, arrow buttons on desktop, keyboard accessible. `items` must be
// plain objects (no HTML strings) — nothing here is ever rendered via
// dangerouslySetInnerHTML, so any text is auto-escaped by React.
export default function ProductRail({ title, viewAllHref, items, tone }) {
  const { city } = useCity();
  const trackRef = useRef(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  function updateArrows() {
    const el = trackRef.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }

  useEffect(() => {
    updateArrows();
    const el = trackRef.current;
    if (!el) return;
    const ro = new ResizeObserver(updateArrows);
    ro.observe(el);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  function scrollBy(dir) {
    const el = trackRef.current;
    if (!el) return;
    const card = el.querySelector(".rail-card");
    const step = card ? card.getBoundingClientRect().width + 12 : el.clientWidth * 0.8;
    el.scrollBy({ left: dir * step, behavior: "smooth" });
  }

  if (!Array.isArray(items) || items.length === 0) return null;

  return (
    <section className={"shop-section" + (tone === "surface" ? "" : "")} style={tone === "surface" ? { background: "var(--surface)" } : undefined}>
      <div className="container">
        <div className="shop-head">
          <h2>{title}</h2>
          {viewAllHref ? <Link to={viewAllHref}>See all</Link> : null}
        </div>
        <div className="rail">
          {canPrev && (
            <button type="button" className="rail-arrow rail-arrow-prev" aria-label="Scroll left" onClick={() => scrollBy(-1)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 6l-6 6 6 6" /></svg>
            </button>
          )}
          <div className="rail-track" ref={trackRef} onScroll={updateArrows}>
            {items.map((p) => {
              const price = typeof p.price === "number" ? fmtINR(cityPrice(p.price, city)) : p.price;
              const original = typeof p.originalPrice === "number" ? fmtINR(cityPrice(p.originalPrice, city)) : null;
              return (
                <Link className="rail-card" to={p.href} key={p.id || p.name}>
                  <div className="rail-card-media">
                    {p.badge ? <span className="special-badge">{p.badge}</span> : null}
                    <img src={p.img} alt={p.name} loading="lazy" decoding="async"  onError={onImgError}/>
                  </div>
                  <div className="rail-card-body">
                    <h4>{p.name}</h4>
                    {price ? (
                      <div className="rail-card-price">
                        <b>{price}</b>
                        {original ? <s>{original}</s> : null}
                      </div>
                    ) : null}
                  </div>
                </Link>
              );
            })}
          </div>
          {canNext && (
            <button type="button" className="rail-arrow rail-arrow-next" aria-label="Scroll right" onClick={() => scrollBy(1)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 6l6 6-6 6" /></svg>
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
