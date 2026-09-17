import { createContext, useContext, useEffect, useState } from "react";
import { CITIES } from "../data/nav";

const CityContext = createContext(null);
const CITY_KEY = "nle-city";

export function CityProvider({ children }) {
  const [city, setCityState] = useState(() => {
    try {
      const c = window.localStorage.getItem(CITY_KEY);
      return c && CITIES.indexOf(c) !== -1 ? c : "Ranchi";
    } catch {
      return "Ranchi";
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(CITY_KEY, city);
    } catch {
      /* ignore */
    }
  }, [city]);

  return <CityContext.Provider value={{ city, setCity: setCityState }}>{children}</CityContext.Provider>;
}

export function useCity() {
  return useContext(CityContext);
}
