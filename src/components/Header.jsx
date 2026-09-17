import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Icon from "./Icon";
import { NAV_LINKS, SEARCH_INDEX } from "../data/nav";
import { CATEGORY_NAV } from "../data/megaMenu";
import { waLink } from "../data/images";
import { useTheme } from "../context/ThemeContext";
import { useCity } from "../context/CityContext";
import useActiveCities from "../hooks/useActiveCities";
import { useCart } from "../context/CartContext";
import CategoryNav from "./CategoryNav";

export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
  const { city, setCity } = useCity();
  const CITIES = useActiveCities();
  const cart = useCart();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);
  const [citySearch, setCitySearch] = useState("");
  const [query, setQuery] = useState("");
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [openMobileCat, setOpenMobileCat] = useState(null);
  const cityWrapRef = useRef(null);
  const searchWrapRef = useRef(null);

  function toggleMobileCat(key) {
    setOpenMobileCat((k) => (k === key ? null : key));
  }

  // close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
  }, [mobileOpen]);

  useEffect(() => {
    function onDocClick(e) {
      if (cityWrapRef.current && !cityWrapRef.current.contains(e.target)) {
        setCityOpen(false);
      }
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target)) {
        setSuggestOpen(false);
      }
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  const filteredCities = CITIES.filter((c) => c.toLowerCase().includes(citySearch.trim().toLowerCase()));

  const matches = query.trim()
    ? SEARCH_INDEX.filter(
        (e) => e.label.toLowerCase().includes(query.trim().toLowerCase()) || e.keywords.includes(query.trim().toLowerCase())
      ).slice(0, 7)
    : [];

  function goSearch(href) {
    setSuggestOpen(false);
    setQuery("");
    navigate(href);
  }

  function onSearchKeyDown(e) {
    if (e.key === "Escape") {
      setSuggestOpen(false);
      return;
    }
    if (!matches.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % matches.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + matches.length) % matches.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = activeIndex >= 0 ? matches[activeIndex] : matches[0];
      if (target) goSearch(target.href);
    }
  }

  const cartCount = cart ? cart.count : 0;

  return (
    <>
      <header className="site-header">
        <div className="container nav-row">
          <div className="nav-row-top">
            <button
              className="hamburger hamburger-lead"
              type="button"
              aria-label="Open menu"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((o) => !o)}
            >
              <span></span><span></span><span></span>
            </button>

            <Link to="/" className="brand-mark-link" aria-label="Next Level Events — Home">
              <span className="brand-mark">
                <img src="/assets/images/brand/logo.png" alt="Next Level Events logo" width="34" height="34" />
              </span>
              <span className="brand-name-full">Next Level Events<span>.</span></span>
            </Link>

            <div className="city-select-wrap" ref={cityWrapRef}>
              <button
                type="button"
                className="city-select"
                aria-haspopup="listbox"
                aria-expanded={cityOpen}
                onClick={(e) => { e.stopPropagation(); setCityOpen((o) => !o); }}
              >
                <span className="city-select-icon"><Icon name="pin" /></span>
                <span className="city-select-text">{city}</span>
                <span className="city-select-chevron"><Icon name="cityChevron" /></span>
              </button>
              <div className={"city-dropdown" + (cityOpen ? " is-open" : "")} role="listbox" aria-label="Select your city">
                <div className="city-dropdown-head">
                  <span className="cdd-title">Select your city</span>
                  <span className="cdd-sub">For accurate pricing &amp; vendor availability</span>
                </div>
                <div className="city-search">
                  <Icon name="search" />
                  <input
                    type="text"
                    placeholder="Search city"
                    autoComplete="off"
                    aria-label="Search city"
                    value={citySearch}
                    onChange={(e) => setCitySearch(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                <div className="city-dropdown-list">
                  {filteredCities.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={c === city ? "is-selected" : ""}
                      role="option"
                      aria-selected={c === city}
                      onClick={() => { setCity(c); setCityOpen(false); setCitySearch(""); }}
                    >
                      <span className="city-pin"><Icon name="pin" /></span>
                      <span className="city-name">{c}{c === "Ranchi" ? <em>HQ</em> : null}</span>
                      <span className="check">&#10003;</span>
                    </button>
                  ))}
                </div>
                {filteredCities.length === 0 && <p className="city-empty">No cities match your search.</p>}
              </div>
            </div>

            <nav className="nav-links" aria-label="Primary">
              {NAV_LINKS.map((l) => (
                <Link key={l.href} to={l.href} className={location.pathname === l.href ? "active" : ""}>
                  {l.label}
                </Link>
              ))}
            </nav>

            <div className="nav-actions">
              <button className="theme-toggle" type="button" aria-label="Toggle light and dark theme" onClick={toggle}>
                <Icon name="sun" /><Icon name="moon" />
              </button>
              <Link className="cart-btn" to="/cart" aria-label="View cart">
                <Icon name="cart" />
                <span className={"cart-badge" + (cartCount > 0 ? " has-items" : "")}>{cartCount}</span>
              </Link>
              <Link to="/book-event" className="btn btn-primary nav-cta">Book Event</Link>
            </div>
          </div>

          <div className="nav-search" ref={searchWrapRef}>
            <Icon name="search" />
            <input
              type="text"
              placeholder="Search weddings, birthdays, decor…"
              aria-label="Search events"
              autoComplete="off"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setSuggestOpen(!!e.target.value.trim()); setActiveIndex(-1); }}
              onFocus={() => { if (query.trim()) setSuggestOpen(true); }}
              onKeyDown={onSearchKeyDown}
            />
            <button
              type="button"
              className={"nav-search-clear" + (query ? " is-visible" : "")}
              aria-label="Clear search"
              onClick={() => { setQuery(""); setSuggestOpen(false); }}
            >
              &times;
            </button>
            <div className={"nav-search-suggest" + (suggestOpen ? " is-open" : "")} role="listbox">
              {suggestOpen && matches.length === 0 && (
                <div className="nav-search-suggest-empty">No results for "{query.trim()}". Try "wedding", "birthday" or "packages".</div>
              )}
              {suggestOpen && matches.map((entry, i) => (
                <button
                  key={entry.label}
                  type="button"
                  className={"nav-search-suggest-item" + (i === activeIndex ? " is-active" : "")}
                  role="option"
                  onClick={() => goSearch(entry.href)}
                >
                  <span className="nssi-icon"><Icon name="search" /></span>
                  <span className="nssi-text">
                    <span className="nssi-label">{entry.label}</span>
                    <span className="nssi-cat">{entry.cat}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
        <CategoryNav />
      </header>

      <div className={"mobile-menu" + (mobileOpen ? " is-open" : "")} aria-hidden={!mobileOpen}>
        <div className="container mobile-menu-top">
          <Link to="/" className="brand">
            <span className="brand-mark"><img src="/assets/images/brand/logo.png" alt="Next Level Events logo" width="34" height="34" /></span>
            <span>Next Level Events<span>.</span></span>
          </Link>
          <button className="hamburger" type="button" aria-label="Close menu" onClick={() => setMobileOpen(false)}>
            <span></span><span></span><span></span>
          </button>
        </div>
        <div className="container">
          <div className="mobile-menu-section-label">Shop by Category</div>
          <div className="mm-accordion">
            {CATEGORY_NAV.map((cat) => {
              const isOpen = openMobileCat === cat.key;
              return (
                <div className="mm-acc-item" key={cat.key}>
                  <button
                    type="button"
                    className="mm-acc-trigger"
                    aria-expanded={isOpen}
                    onClick={() => toggleMobileCat(cat.key)}
                  >
                    <span>{cat.label}</span>
                    <span className={"mm-acc-chevron" + (isOpen ? " is-open" : "")}><Icon name="chevronRight" /></span>
                  </button>
                  <div className={"mm-acc-panel" + (isOpen ? " is-open" : "")}>
                    {cat.type === "cities" ? (
                      <div className="mm-acc-cities">
                        {CITIES.map((c) => (
                          <button
                            key={c}
                            type="button"
                            className={"mm-acc-city" + (c === city ? " is-selected" : "")}
                            onClick={() => { setCity(c); setOpenMobileCat(null); setMobileOpen(false); }}
                          >
                            <Icon name="pin" /><span>{c}</span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      cat.columns.map((col) => (
                        <div className="mm-acc-col" key={col.heading}>
                          <h5>{col.heading}</h5>
                          <ul>
                            {col.links.map((l) => (
                              <li key={l.label}>
                                <Link to={l.href} onClick={() => setOpenMobileCat(null)}>{l.label}</Link>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mobile-menu-section-label">Menu</div>
          <nav className="mobile-menu-links" aria-label="Mobile">
            {NAV_LINKS.map((l) => (
              <Link key={l.href} to={l.href} className={"mobile-menu-link" + (location.pathname === l.href ? " active" : "")}>
                <span className={"mml-icon mml-icon--" + l.color}><Icon name={l.icon} /></span>
                <span className="mml-text">{l.label}</span>
                <span className="mml-chevron"><Icon name="chevronRight" /></span>
              </Link>
            ))}
          </nav>
          <div className="mobile-menu-foot">
            <Link to="/book-event" className="btn btn-primary btn-block">Book Event</Link>
            <p>+91 7903 133 317 &middot; nextlevel.events25@gmail.com<br />Kanke Road, Beside Chef's Chaupati, Jhigra Toli, Gandhi Nagar, Ranchi, Jharkhand 834002</p>
            <div className="mobile-menu-socials">
              <a href="https://www.instagram.com/nextlevelevents.in" target="_blank" rel="noopener noreferrer" aria-label="Instagram"><Icon name="insta" /></a>
              <a href="https://www.facebook.com/nextlevelevents.in" target="_blank" rel="noopener noreferrer" aria-label="Facebook"><Icon name="facebook" /></a>
              <a href="https://www.youtube.com/@nextlevelevents25" target="_blank" rel="noopener noreferrer" aria-label="YouTube"><Icon name="youtube" /></a>
              <a href={waLink()} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp"><Icon name="whatsapp" /></a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
