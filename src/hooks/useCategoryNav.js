import { useEffect, useState } from "react";
import { getCategoryNav } from "../data/megaMenu";

// Mega-menu config with live birthday themes; refreshes when the admin
// catalogue changes.
export default function useCategoryNav() {
  const [nav, setNav] = useState(() => getCategoryNav());
  useEffect(() => {
    const refresh = () => setNav(getCategoryNav());
    window.addEventListener("nle-catalog-updated", refresh);
    return () => window.removeEventListener("nle-catalog-updated", refresh);
  }, []);
  return nav;
}
