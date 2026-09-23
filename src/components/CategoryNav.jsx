import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Icon from "./Icon";
import { CATEGORY_NAV } from "../data/megaMenu";
import { useCity } from "../context/CityContext";
import useActiveCities from "../hooks/useActiveCities";
import { onImgError } from "../lib/imageFallback";

// Desktop-only mega menu bar. Rendered inside the sticky header; hidden
// below 1180px via CSS (mobile/tablet use the drawer accordion instead).
export default function CategoryNav() {
  const [openKey, setOpenKey] = useState(null);
  const [citySearch, setCitySearch] = useState("");
  const wrapRef = useRef(null);
  const closeTimer = useRef(null);
  const { city, setCity } = useCity();
  const CITIES = useActiveCities();
  const navigate = useNavigate();

  useEffect(() => {
    function onDocClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpenKey(null);
    }
    function onKeyDown(e) {
      if (e.key === "Escape") setOpenKey(null);
    }
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  function openNow(key) {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpenKey(key);
  }
  function closeSoon() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpenKey(null), 140);
  }
  function toggle(key) {
    setOpenKey((k) => (k === key ? null : key));
  }
  function pickCity(c) {
    setCity(c);
    setCitySearch("");
    setOpenKey(null);
    navigate("/");
  }

  const filteredCities = CITIES.filter((c) => c.toLowerCase().includes(citySearch.trim().toLowerCase()));

  return (
    <div className="category-nav" ref={wrapRef}>
      <div className="container category-nav-inner">
        <ul className="category-nav-list" role="menubar" aria-label="Shop by category">
          {CATEGORY_NAV.map((cat) => {
            const isOpen = openKey === cat.key;
            const hasPanel = cat.type !== "link";
            return (
              <li
                key={cat.key}
                className={"category-nav-item" + (cat.align === "right" ? " align-right" : "")}
                onMouseEnter={() => hasPanel && openNow(cat.key)}
                onMouseLeave={() => hasPanel && closeSoon()}
              >
                <button
                  type="button"
                  className={"category-nav-link" + (isOpen ? " is-open" : "")}
                  aria-haspopup={hasPanel ? "true" : undefined}
                  aria-expanded={hasPanel ? isOpen : undefined}
                  onClick={(e) => {
                    if (!hasPanel) return;
                    e.preventDefault();
                    toggle(cat.key);
                  }}
                >
                  {cat.label}
                  {hasPanel && <span className="cnl-caret"><Icon name="cityChevron" /></span>}
                </button>

                {hasPanel && (
                  <div className={"mega-panel" + (isOpen ? " is-open" : "") + (cat.type === "cities" ? " mega-panel--cities" : "") + (cat.type === "simple" ? " mega-panel--simple" : "")}>
                    {cat.type === "cities" ? (
                      <div className="mega-cities">
                        <div className="mega-cities-head">
                          <span className="cdd-title">Choose your city</span>
                          <span className="cdd-sub">Pricing & vendor availability adjust automatically</span>
                        </div>
                        <div className="city-search">
                          <Icon name="search" />
                          <input
                            type="text"
                            placeholder="Search city"
                            autoComplete="off"
                            value={citySearch}
                            onChange={(e) => setCitySearch(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                        <div className="mega-cities-grid">
                          {filteredCities.map((c) => (
                            <button
                              key={c}
                              type="button"
                              className={"mega-city-btn" + (c === city ? " is-selected" : "")}
                              onClick={() => pickCity(c)}
                            >
                              <Icon name="pin" />
                              <span>{c}</span>
                            </button>
                          ))}
                          {filteredCities.length === 0 && <p className="city-empty">No cities match your search.</p>}
                        </div>
                      </div>
                    ) : (
                      <div className="mega-panel-inner">
                        <div className="mega-columns">
                          {cat.columns.map((col) => (
                            <div className="mega-col" key={col.heading}>
                              <h4>{col.heading}</h4>
                              <ul>
                                {col.links.map((l) => (
                                  <li key={l.label}>
                                    <Link to={l.href} onClick={() => setOpenKey(null)}>{l.label}</Link>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                        {cat.featured && (
                          <Link to={cat.featured.href} className="mega-featured" onClick={() => setOpenKey(null)}>
                            <img src={cat.featured.img} alt={cat.featured.title} loading="lazy" decoding="async"  onError={onImgError}/>
                            <div className="mega-featured-copy">
                              <span>{cat.featured.title}</span>
                              <small>{cat.featured.subtitle}</small>
                            </div>
                          </Link>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
