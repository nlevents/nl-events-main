import { useEffect, useRef, useState } from "react";
import CategoryCard from "./CategoryCard";

// Horizontal, swipeable carousel for browsing themes/subcategories (e.g. the
// themes under Kids Birthday). Mirrors ProductRail's scroll-snap + arrow
// pattern so the whole site's carousels behave the same way.
export default function CategoryRail({ items, hrefFor }) {
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
    const card = el.querySelector(".cat-rail-card");
    const step = card ? card.getBoundingClientRect().width + 16 : el.clientWidth * 0.8;
    el.scrollBy({ left: dir * step, behavior: "smooth" });
  }

  if (!Array.isArray(items) || items.length === 0) return null;

  return (
    <div className="cat-rail">
      {canPrev && (
        <button type="button" className="rail-arrow rail-arrow-prev" aria-label="Scroll left" onClick={() => scrollBy(-1)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 6l-6 6 6 6" /></svg>
        </button>
      )}
      <div className="cat-rail-track" ref={trackRef} onScroll={updateArrows}>
        {items.map((node) => (
          <div className="cat-rail-card" key={node.slug}>
            <CategoryCard node={node} href={hrefFor(node)} />
          </div>
        ))}
      </div>
      {canNext && (
        <button type="button" className="rail-arrow rail-arrow-next" aria-label="Scroll right" onClick={() => scrollBy(1)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 6l6 6-6 6" /></svg>
        </button>
      )}
    </div>
  );
}
