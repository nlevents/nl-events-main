import { useEffect, useRef } from "react";

/**
 * Adds a lightweight autoplay loop to a horizontal scroll rail.
 * The rail advances one card every `interval` milliseconds and loops back
 * to the beginning when it reaches the end. Native touch/drag scrolling is
 * preserved.
 */
export default function useAutoRail(trackRef, { selector = null, interval = 1000, enabled = true } = {}) {
  const timerRef = useRef(null);

  useEffect(() => {
    if (!enabled) return undefined;

    const advance = () => {
      const el = trackRef.current;
      if (!el || el.scrollWidth <= el.clientWidth + 4) return;

      const card = selector ? el.querySelector(selector) : el.firstElementChild;
      const step = card
        ? card.getBoundingClientRect().width + (parseFloat(getComputedStyle(el).columnGap || getComputedStyle(el).gap || "0") || 0)
        : el.clientWidth * 0.8;
      const max = el.scrollWidth - el.clientWidth;

      if (el.scrollLeft >= max - 4) {
        el.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        el.scrollBy({ left: step, behavior: "smooth" });
      }
    };

    timerRef.current = window.setInterval(advance, interval);
    return () => window.clearInterval(timerRef.current);
  }, [trackRef, selector, interval, enabled]);
}
