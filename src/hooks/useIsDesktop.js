import { useEffect, useState } from "react";

// Tracks whether the viewport matches the given min-width breakpoint.
// Used to decide where the booking panel mounts in the product detail
// layout (inline after the description on mobile vs. sticky sidebar on
// desktop) without ever rendering two copies of the same form.
export default function useIsDesktop(minWidth = 900) {
  const query = "(min-width: " + minWidth + "px)";
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== "undefined" && window.matchMedia(query).matches
  );

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = (e) => setIsDesktop(e.matches);
    setIsDesktop(mql.matches);
    if (mql.addEventListener) mql.addEventListener("change", onChange);
    else mql.addListener(onChange);
    return () => {
      if (mql.removeEventListener) mql.removeEventListener("change", onChange);
      else mql.removeListener(onChange);
    };
  }, [query]);

  return isDesktop;
}
