import { Link } from "react-router-dom";
import Icon from "../Icon";
import { countProducts } from "../../data/occasions";
import { onImgError } from "../../lib/imageFallback";

export default function OccasionCard({ occasion }) {
  const count = countProducts(occasion);
  return (
    <Link className="occ-tile reveal" to={"/occasion/" + occasion.slug}>
      <span className="occ-tile-pic">
        <img src={occasion.image} alt={occasion.label} loading="lazy"  onError={onImgError}/>
      </span>
      <span className="occ-tile-body">
        <h3>{occasion.label}</h3>
        <p>{occasion.description}</p>
        <span className="occ-tile-count">{count} option{count === 1 ? "" : "s"} <Icon name="chevronRight" /></span>
      </span>
    </Link>
  );
}
