import { Link, useNavigate } from "react-router-dom";
import Icon from "../Icon";
import { useCity } from "../../context/CityContext";
import { cityPrice, fmtINR } from "../../lib/pricing";
import { discountPercent, isAvailableInCity } from "../../data/occasions";
import { onImgError } from "../../lib/imageFallback";

// Premium, conversion-focused listing card — image + quick-add, rating
// badge, price with strike-through + discount, city availability, and a
// View Details / Book Now action pair. Used by every product grid and
// every horizontal rail across the Shop-by-Occasion experience, so a
// single redesign here updates the whole site.
export default function ProductCard({ product, href, variant = "default" }) {
  const { city } = useCity();
  const navigate = useNavigate();

  const isQuoteOnly = Boolean(product.quoteOnly) || typeof product.price !== "number";
  const discount = isQuoteOnly ? 0 : discountPercent(product);
  const available = isAvailableInCity(product, city);
  const priceNow = isQuoteOnly ? "Contact for pricing" : fmtINR(cityPrice(product.price, city));
  const priceWas = !isQuoteOnly && product.originalPrice ? fmtINR(cityPrice(product.originalPrice, city)) : null;

  // Every cart line needs full booking details (city, date, time slot,
  // etc.), so quick-add and Book Now both take the shopper to the product's
  // own booking panel to configure those — nothing is ever added blind.
  function quickAdd(e) {
    e.preventDefault();
    e.stopPropagation();
    navigate(isQuoteOnly ? href : href + "#booking-panel");
  }

  function bookNow() {
    navigate(isQuoteOnly ? href : href + "#booking-panel");
  }

  return (
    <article className={"occ-prod-card reveal" + (variant === "occasion-market" ? " occ-prod-card--market" : "")}>
      <div className="occ-prod-media">
        <Link to={href} className="occ-prod-media-link" aria-label={"View " + product.name}>
          {discount > 0 && <span className="occ-prod-discount">{discount}% OFF</span>}
          <img src={product.image} alt={product.name} loading="lazy"  onError={onImgError}/>
        </Link>
        {variant !== "occasion-market" && (
          <button type="button" className="occ-prod-quick" aria-label={(isQuoteOnly ? "Request quote for " : "Book ") + product.name} onClick={quickAdd}>+</button>
        )}
      </div>

      <div className="occ-prod-body">
        <Link to={href} className="occ-prod-title-link"><h4>{product.name}</h4></Link>

        {variant === "occasion-market" ? (
          <>
            {product.rating ? (
              <div className="occ-prod-rating">
                <span className="occ-prod-rating-badge">{product.rating.toFixed(1)} <Icon name="star" /></span>
                {product.reviewCount ? <span className="occ-prod-reviews">{product.reviewCount} reviews</span> : null}
              </div>
            ) : null}

            <div className="occ-prod-price">
              <b>{priceNow}</b>
              {priceWas ? <s>{priceWas}</s> : null}
              {discount > 0 ? <span className="occ-prod-off">{discount}% OFF</span> : null}
            </div>
          </>
        ) : (
          <>
            <p>{product.shortDesc}</p>

            {product.rating ? (
              <div className="occ-prod-rating">
                <span className="occ-prod-rating-badge">{product.rating.toFixed(1)} <Icon name="star" /></span>
                {product.reviewCount ? <span className="occ-prod-reviews">{product.reviewCount} reviews</span> : null}
              </div>
            ) : null}

            <div className="occ-prod-price">
              <b>{priceNow}</b>
              {priceWas ? <s>{priceWas}</s> : null}
              {discount > 0 ? <span className="occ-prod-off">{discount}% off</span> : null}
            </div>

            <div className={"occ-prod-avail" + (available ? " ok" : " limited")}>
              {available ? "Available in " + city : "Custom quote for " + city + " — ask us"}
            </div>

            <div className="occ-prod-actions">
              <Link to={href} className="btn btn-ghost occ-btn-sm">View Details</Link>
              <button type="button" className="btn btn-primary occ-btn-sm" onClick={bookNow}>{isQuoteOnly ? "Request Quote" : "Book Now"}</button>
            </div>
          </>
        )}
      </div>
    </article>
  );
}
