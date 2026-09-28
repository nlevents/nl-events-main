import { useEffect, useRef, useState } from "react";
import useAutoRail from "../hooks/useAutoRail";

export default function AutoScrollRail({ children, className = "", wrapperClassName = "", selector = null, interval = 4000 }) {
  const trackRef = useRef(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const update = () => {
    const el = trackRef.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  useAutoRail(trackRef, { selector, interval, enabled: true });

  useEffect(() => {
    update();
    const el = trackRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const move = (dir) => {
    const el = trackRef.current;
    if (!el) return;
    const card = selector ? el.querySelector(selector) : el.firstElementChild;
    const gap = parseFloat(getComputedStyle(el).gap || "0") || 0;
    const step = card ? card.getBoundingClientRect().width + gap : el.clientWidth * 0.8;
    const max = el.scrollWidth - el.clientWidth;
    const target = dir > 0 && el.scrollLeft >= max - 4 ? 0 : Math.max(0, el.scrollLeft + dir * step);
    el.scrollTo({ left: target, behavior: "smooth" });
  };

  return (
    <div className={`auto-rail-wrap ${wrapperClassName}`.trim()}>
      {canPrev && <button type="button" className="rail-arrow rail-arrow-prev" aria-label="Scroll left" onClick={() => move(-1)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 6l-6 6 6 6" /></svg></button>}
      <div className={className} ref={trackRef} onScroll={update}>{children}</div>
      {canNext && <button type="button" className="rail-arrow rail-arrow-next" aria-label="Scroll right" onClick={() => move(1)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 6l6 6-6 6" /></svg></button>}
    </div>
  );
}
