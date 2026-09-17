import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { onImgError } from "../../lib/imageFallback";
import { allQuickLinksFor } from "../../data/occasions";

// Theme/category picker. Keep the first row compact, but when the visitor
// chooses "View all" the section itself expands and renders the complete
// theme list in the same grid. Nothing opens over the content below.
export default function OccasionQuickLinks({ title, items, node, trail }) {
  const [expanded, setExpanded] = useState(false);
  const allItems = useMemo(() => {
    if (node) return allQuickLinksFor(node, trail);
    return Array.isArray(items) ? items : [];
  }, [node, trail, items]);

  if (!Array.isArray(items) || items.length === 0) return null;

  const visibleItems = expanded ? allItems : items;
  const hasMore = allItems.length > items.length;

  return (
    <div className={`occ-block occ-quicklinks${expanded ? " occ-quicklinks-expanded" : ""}`}>
      <div className="section-head reveal occ-quicklinks-head">
        <h2>{title}</h2>
        {hasMore && (
          <button
            type="button"
            className="theme-view-all-button"
            aria-expanded={expanded}
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded ? "Show less" : `View all (${allItems.length})`}
            <span aria-hidden="true" className={`theme-view-all-chevron${expanded ? " is-open" : ""}`}>⌄</span>
          </button>
        )}
      </div>

      <div className={`cat9-grid${expanded ? " cat9-grid-expanded" : ""}`}>
        {visibleItems.map((it, index) => {
          const label = it?.label || it?.name || "Theme";
          const href = it?.href || "#";
          const image = it?.image || node?.image;
          return (
            <Link className="cat9-item" to={href} key={`${href}-${it?.slug || label}-${index}`}>
              <span className="cat9-pic">
                <img
                  src={image}
                  alt={label}
                  loading={index < 8 ? "eager" : "lazy"}
                  onError={onImgError}
                />
              </span>
              <span>{label}</span>
            </Link>
          );
        })}
      </div>

      {expanded && hasMore && (
        <div className="theme-list-count" aria-live="polite">
          Showing all {allItems.length} themes and categories
        </div>
      )}
    </div>
  );
}
