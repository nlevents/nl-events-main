import { Link } from "react-router-dom";
import Icon from "../Icon";

// Generic breadcrumb trail. `items` is an ordered array of
// { label, href } — the last item renders as plain text (current page).
export default function Breadcrumb({ items }) {
  if (!Array.isArray(items) || items.length === 0) return null;
  return (
    <nav className="occ-crumb reveal" aria-label="Breadcrumb">
      <Link to="/" className="occ-crumb-home"><Icon name="home" /></Link>
      {items.map((it, i) => {
        const isLast = i === items.length - 1;
        return (
          <span className="occ-crumb-item" key={it.href || it.label}>
            <Icon name="chevronRight" className="occ-crumb-sep" />
            {isLast || !it.href ? (
              <span aria-current="page">{it.label}</span>
            ) : (
              <Link to={it.href}>{it.label}</Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
