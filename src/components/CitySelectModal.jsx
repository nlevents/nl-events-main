import { createPortal } from "react-dom";
import { useEffect, useMemo, useState } from "react";
import { useCity } from "../context/CityContext";
import { getCityMultiplier } from "../lib/pricing";
import useActiveCities from "../hooks/useActiveCities";
import Icon from "./Icon";

// Bottom-sheet city picker used anywhere a "Change" location action is
// offered on a product page (see BookingPanel). Setting the city here goes
// straight through CityContext, so every price on the page (via cityPrice())
// re-renders with the new location's multiplier immediately on close —
// this is what gives the "dynamic pricing based on location" behaviour.
export default function CitySelectModal({ open, onClose }) {
  const { city, setCity } = useCity();
  const CITIES = useActiveCities();
  const [search, setSearch] = useState("");

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  function handleClose() {
    setSearch("");
    onClose();
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return CITIES;
    return CITIES.filter((c) => c.toLowerCase().includes(q));
  }, [search, CITIES]);

  function pick(c) {
    setCity(c);
    handleClose();
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className={"modal-backdrop" + (open ? " is-open" : "")} onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
      <div className="modal-sheet city-modal-sheet" role="dialog" aria-modal="true" aria-labelledby="city-modal-title">
        <div className="modal-head city-modal-head">
          <div className="city-modal-head-icon"><Icon name="pin" /></div>
          <div className="city-modal-head-text">
            <h3 id="city-modal-title">Select your city</h3>
            <p>Prices &amp; slots are tailored to your location</p>
          </div>
          <button className="modal-close" type="button" aria-label="Close" onClick={handleClose}>&times;</button>
        </div>

        <div className="city-modal-search">
          <Icon name="search" />
          <input
            type="text"
            placeholder="Search for your city…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        </div>

        <div className="city-modal-list" role="listbox" aria-label="Cities">
          {filtered.map((c) => {
            const mult = getCityMultiplier(c);
            const selected = c === city;
            return (
              <button
                type="button"
                key={c}
                className={"city-modal-item" + (selected ? " is-selected" : "")}
                role="option"
                aria-selected={selected}
                onClick={() => pick(c)}
              >
                <span className="city-modal-item-pin"><Icon name="pin" /></span>
                <span className="city-modal-item-body">
                  <span className="city-modal-item-name">{c}{c === "Ranchi" ? <em>HQ</em> : null}</span>
                  <span className="city-modal-item-note">
                    {mult === 1 ? "Base pricing" : "+" + Math.round((mult - 1) * 100) + "% area logistics"}
                  </span>
                </span>
                {selected ? <span className="city-modal-item-check"><Icon name="check" /></span> : null}
              </button>
            );
          })}
          {filtered.length === 0 && <p className="city-empty">No cities match your search.</p>}
        </div>
      </div>
    </div>,
    document.body
  );
}
