import { Link } from "react-router-dom";
import Icon from "../Icon";
import { countProducts } from "../../data/occasions";
import { onImgError } from "../../lib/imageFallback";

// Card for a subcategory/theme node, used at every depth of the tree —
// same component renders "Kids Birthday" under Birthdays and "Animal
// Themes" under Kids Birthday.
export default function CategoryCard({ node, href }) {
  const count = countProducts(node);
  return (
    <Link className="occ-cat-card reveal" to={href}>
      <span className="occ-cat-pic">
        <img src={node.image} alt={node.label} loading="lazy"  onError={onImgError}/>
      </span>
      <span className="occ-cat-body">
        <h4>{node.label}</h4>
        {node.description ? <p>{node.description}</p> : null}
        <span className="occ-cat-count">{count} option{count === 1 ? "" : "s"} <Icon name="chevronRight" /></span>
      </span>
    </Link>
  );
}
