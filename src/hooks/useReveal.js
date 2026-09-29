import { useEffect } from "react";

// Re-runs the reveal-on-scroll observer whenever the route/content changes.
// Hardened: if IntersectionObserver never fires (older/odd WebViews, a
// resize/layout race on first paint, observer support flags that lie, etc.)
// content must never stay permanently invisible — a hard fallback timer
// force-reveals everything left over.
export default function useReveal(deps = []) {
  useEffect(() => {
    const items = document.querySelectorAll(".reveal:not(.in)");
    if (!items.length) return undefined;

    const revealAll = () => items.forEach((i) => i.classList.add("in"));

    if (!("IntersectionObserver" in window)) {
      revealAll();
      return undefined;
    }

    let io;
    try {
      io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("in");
              io.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.1, rootMargin: "0px 0px -5% 0px" }
      );
      items.forEach((i) => io.observe(i));
    } catch {
      revealAll();
      return undefined;
    }

    // Safety net: guarantee visibility even if the observer never reports
    // (zero-size root during initial WebView layout, tab throttling, etc.)
    const fallback = window.setTimeout(revealAll, 1200);

    // Late-mounted `.reveal` nodes (async data) are picked up too, so they
    // can never be left hidden after the initial pass.
    let mo;
    try {
      mo = new MutationObserver(() => {
        document.querySelectorAll(".reveal:not(.in)").forEach((el) => {
          if (!el.__revObs) { el.__revObs = true; io.observe(el); }
        });
      });
      mo.observe(document.body, { childList: true, subtree: true });
    } catch { /* non-critical */ }
    const lateFallback = window.setTimeout(() => {
      document.querySelectorAll(".reveal:not(.in)").forEach((i) => i.classList.add("in"));
    }, 2500);

    return () => {
      if (mo) mo.disconnect();
      window.clearTimeout(lateFallback);
      io.disconnect();
      window.clearTimeout(fallback);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
