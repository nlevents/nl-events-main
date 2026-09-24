import { useEffect, useState } from "react";
import { CITIES } from "../data/cities";

// Keep the header independent from the full admin/catalog store. The static
// city list is enough for the first paint; the live admin-controlled list is
// refreshed later when the browser is idle.
export default function useActiveCities() {
  const [cities, setCities] = useState(CITIES);

  useEffect(() => {
    let cancelled = false;
    const loadLiveCities = () =>
      import("../lib/catalogStore")
        .then(({ getActiveCityNames }) => {
          if (!cancelled) setCities(getActiveCityNames());
        })
        .catch(() => {});

    const schedule = () => {
      if ("requestIdleCallback" in window) {
        window.requestIdleCallback(loadLiveCities, { timeout: 7000 });
      } else {
        window.setTimeout(loadLiveCities, 7000);
      }
    };

    schedule();
    window.addEventListener("nle-catalog-updated", loadLiveCities);
    return () => {
      cancelled = true;
      window.removeEventListener("nle-catalog-updated", loadLiveCities);
    };
  }, []);

  return cities;
}
