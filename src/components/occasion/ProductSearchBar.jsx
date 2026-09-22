import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "../Icon";
import { SEARCH_INDEX } from "../../data/nav";

export default function ProductSearchBar() {
  const navigate = useNavigate();
  const wrapRef = useRef(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const matches = query.trim()
    ? SEARCH_INDEX.filter(
        (entry) =>
          entry.label.toLowerCase().includes(query.trim().toLowerCase()) ||
          entry.keywords.includes(query.trim().toLowerCase())
      ).slice(0, 7)
    : [];

  useEffect(() => {
    function onDocumentClick(event) {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) setOpen(false);
    }
    document.addEventListener("click", onDocumentClick);
    return () => document.removeEventListener("click", onDocumentClick);
  }, []);

  function goSearch(href) {
    setOpen(false);
    setQuery("");
    navigate(href);
  }

  function onKeyDown(event) {
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }
    if (event.key === "ArrowDown" && matches.length) {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % matches.length);
      return;
    }
    if (event.key === "ArrowUp" && matches.length) {
      event.preventDefault();
      setActiveIndex((index) => (index - 1 + matches.length) % matches.length);
      return;
    }
    if (event.key === "Enter" && matches.length) {
      event.preventDefault();
      goSearch(matches[activeIndex >= 0 ? activeIndex : 0].href);
    }
  }

  return (
    <div className="pd-search-wrap" ref={wrapRef}>
      <div className="pd-search" role="search">
        <Icon name="search" />
        <input
          value={query}
          type="search"
          placeholder="Search weddings, birthdays, decor…"
          aria-label="Search products and events"
          autoComplete="off"
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(Boolean(event.target.value.trim()));
            setActiveIndex(-1);
          }}
          onFocus={() => { if (query.trim()) setOpen(true); }}
          onKeyDown={onKeyDown}
        />
        {query && (
          <button
            type="button"
            className="pd-search-clear"
            aria-label="Clear search"
            onClick={() => { setQuery(""); setOpen(false); }}
          >
            ×
          </button>
        )}
      </div>

      {open && (
        <div className="pd-search-suggestions" role="listbox">
          {matches.length === 0 ? (
            <div className="pd-search-empty">No results for “{query.trim()}”.</div>
          ) : (
            matches.map((entry, index) => (
              <button
                key={entry.label}
                type="button"
                className={"pd-search-result" + (index === activeIndex ? " is-active" : "")}
                role="option"
                onClick={() => goSearch(entry.href)}
              >
                <Icon name="search" />
                <span>
                  <b>{entry.label}</b>
                  <small>{entry.cat}</small>
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
