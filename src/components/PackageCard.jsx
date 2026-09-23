import { Link } from "react-router-dom";
import { useCity } from "../context/CityContext";
import { cityPrice, fmtINR } from "../lib/pricing";
import { onImgError } from "../lib/imageFallback";

// Shared card for a package/product shown in a grid (category pages,
// packages listing). `price: null` renders "Contact for pricing".
// `href` links to package details (or a custom destination like
// /custom-events for the bespoke, un-priced entry).
export default function PackageCard({ tag, img, alt, name, desc, price, href, linkLabel }) {
  const { city } = useCity();
  return (
    <article className="pkg-card">
      <div className="pkg-media">
        <span className="pkg-tag">{tag}</span>
        <img src={img} alt={alt || name + " package"}  loading="lazy" decoding="async" onError={onImgError}/>
      </div>
      <div className="pkg-body">
        <h3>{name}</h3>
        <p>{desc}</p>
        <div className="pkg-price-row">
          <div className="pkg-price">
            <small>Starting from</small>
            {price == null ? "Contact for pricing" : fmtINR(cityPrice(price, city))}
          </div>
          <Link to={href} className="btn btn-line">{linkLabel || "View Package"}</Link>
        </div>
      </div>
    </article>
  );
}
