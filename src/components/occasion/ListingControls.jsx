import { SORT_OPTIONS } from "../../data/occasions";

// Generic listing controls: result count + sort dropdown, plus an optional
// row of facet filters. Each filter descriptor is:
//   { key, label, kind: "select"|"chips"|"toggle", options?, value, onChange }
// "select"  -> a labelled <select> (e.g. Occasion, Theme)
// "chips"   -> a row of single-select pill buttons (e.g. Price, Setup Type)
// "toggle"  -> a single on/off pill (e.g. "Available in my city", "Top rated only")
// Reused by the global Packages listing and every occasion/category/theme
// page so sorting + filtering behaves identically everywhere.
export default function ListingControls({ resultCount, sortKey, onSortChange, filters, onReset }) {
  return (
    <div className="listing-controls reveal">
      <div className="listing-toolbar">
        <p className="listing-count">{resultCount} option{resultCount === 1 ? "" : "s"}</p>
        <label className="listing-sort">
          Sort by
          <select value={sortKey} onChange={(e) => onSortChange(e.target.value)}>
            {SORT_OPTIONS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
          </select>
        </label>
      </div>

      {Array.isArray(filters) && filters.length > 0 && (
        <div className="listing-filters">
          {filters.map((f) => {
            if (f.kind === "select") {
              return (
                <label className="listing-filter-select" key={f.key}>
                  {f.label}
                  <select value={f.value} onChange={(e) => f.onChange(e.target.value)}>
                    {f.options.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
                  </select>
                </label>
              );
            }
            if (f.kind === "toggle") {
              return (
                <button
                  type="button"
                  key={f.key}
                  className={"occ-chip" + (f.value ? " active" : "")}
                  onClick={() => f.onChange(!f.value)}
                >
                  {f.label}
                </button>
              );
            }
            if (f.kind === "chips") {
              return (
                <div className="listing-filter-chips" key={f.key}>
                  <span className="listing-filter-label">{f.label}</span>
                  {f.options.map((o) => (
                    <button
                      type="button"
                      key={o.key}
                      className={"occ-chip" + (f.value === o.key ? " active" : "")}
                      onClick={() => f.onChange(o.key)}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              );
            }
            return null;
          })}
          {onReset ? <button type="button" className="listing-reset" onClick={onReset}>Reset Filters</button> : null}
        </div>
      )}
    </div>
  );
}
