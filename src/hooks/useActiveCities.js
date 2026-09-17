import { useEffect, useState } from "react";
import { getActiveCityNames } from "../lib/catalogStore";

// Live list of cities that are currently switched "Active" in
// Admin → Calendar & Blackout → Service City Coverage. Re-reads whenever
// the catalog store changes, so disabling a city there immediately removes
// it from every customer-facing city picker without a page reload.
export default function useActiveCities() {
  const [cities, setCities] = useState(getActiveCityNames);

  useEffect(() => {
    function refresh() {
      setCities(getActiveCityNames());
    }
    window.addEventListener("nle-catalog-updated", refresh);
    return () => window.removeEventListener("nle-catalog-updated", refresh);
  }, []);

  return cities;
}
