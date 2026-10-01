import { useMemo, useState } from "react";

export default function ServiceCategoryPicker({ options = [], value = [], onChange }) {
  const [query, setQuery] = useState("");
  const selectedPath = Array.isArray(value) ? value.join("/") : String(value || "");

  const groups = useMemo(() => {
    const normalized = options.map((option) => {
      const path = option.value || (Array.isArray(option.path) ? option.path.join("/") : "");
      const parts = path.split("/").filter(Boolean);
      return { ...option, path, parts, label: option.displayLabel || option.label || parts[parts.length - 1] || "" };
    }).filter((option) => option.parts[0] === "event-services" && option.parts.length >= 2);

    return normalized.filter((option) => option.parts.length === 2).map((parent) => ({
      parent,
      children: normalized.filter((option) => option.parts.length > 2 && option.parts.slice(0, 2).join("/") === parent.path),
    }));
  }, [options]);

  const matches = (text) => !query.trim() || text.toLowerCase().includes(query.trim().toLowerCase());
  const visibleGroups = groups.filter(({ parent, children }) => matches(parent.label) || children.some((child) => matches(child.label)));

  function choose(option) {
    onChange(option.path.split("/").filter(Boolean));
  }

  return (
    <div className="service-category-picker">
      <div className="service-category-picker__search">
        <span aria-hidden="true">⌕</span>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search a service…" />
      </div>
      <div className="service-category-picker__grid">
        {visibleGroups.map(({ parent, children }) => {
          const parentSelected = selectedPath === parent.path;
          const selectedChild = children.find((child) => selectedPath === child.path);
          return (
            <div className={`service-category-group${parentSelected || selectedChild ? " selected" : ""}`} key={parent.path}>
              <button type="button" className={`service-category-main${parentSelected ? " selected" : ""}`} onClick={() => choose(parent)}>
                <span>{parent.label}</span>{parentSelected && <b>✓</b>}
              </button>
              {children.length > 0 && (
                <div className="service-category-children">
                  {children.filter((child) => matches(child.label)).map((child) => {
                    const selected = selectedPath === child.path;
                    return <button type="button" key={child.path} className={`service-category-child${selected ? " selected" : ""}`} onClick={() => choose(child)}><span>{child.label}</span>{selected && <b>✓</b>}</button>;
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {!visibleGroups.length && <div className="service-context-picker__empty">No matching service found.</div>}
    </div>
  );
}
