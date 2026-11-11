import { Link, useNavigate } from "react-router-dom";
import Icon from "../Icon";
import { useCity } from "../../context/CityContext";
import { cityPrice, fmtINR } from "../../lib/pricing";
import { discountPercent } from "../../data/occasions";
import { onImgError } from "../../lib/imageFallback";
import { trackServiceView } from "../../lib/siteEvents";
import { useCart } from "../../context/CartContext";
import { useToast } from "../../context/ToastContext";

// Single marketplace-style listing card (image, rating badge, price with
// strike-through + discount, circular cart button). Used by every product
// grid on the site, so one change here updates all of them.
export default function ProductCard({ product, href }) {
  const { city } = useCity();
  const navigate = useNavigate();
  const cart = useCart();
  const showToast = useToast();

  const isQuoteOnly = Boolean(product.quoteOnly) || typeof product.price !== "number";
  const discount = isQuoteOnly ? 0 : discountPercent(product);
  const priceNow = isQuoteOnly ? "Contact for pricing" : fmtINR(cityPrice(product.price, city));
  const priceWas = !isQuoteOnly && product.originalPrice ? fmtINR(cityPrice(product.originalPrice, city)) : null;

  // Add-to-cart only stores the item. Date, guests, location etc. are
  // collected later in the cart, before checkout. One line per product+city.
  const productKey = String(product.slug || product.id || "");
  const inCart = Boolean(productKey) && Array.isArray(cart?.items) && cart.items.some((it) => String(it.slug) === productKey && it.city === city);
  const serviceCategory = Array.isArray(product.categoryPath) && product.categoryPath[0] === "event-services"
    ? product.categoryPath[1]
    : undefined;
  const contextPath = Array.isArray(product.__contextPath) ? product.__contextPath : [];

  function trackProductInteraction() {
    trackServiceView({
      serviceName: product.name,
      serviceCategory,
      occasion: contextPath[0],
      functionPath: contextPath.slice(1).join("/"),
      itemId: product.id || product.slug,
    });
  }

  function quickAdd(e) {
    e.preventDefault();
    e.stopPropagation();
    trackProductInteraction();
    // Quote-only items have no price to add — keep sending them to the page.
    if (isQuoteOnly) { navigate(href); return; }
    if (inCart) { navigate("/cart"); return; }
    if (!cart || typeof cart.addBooking !== "function" || !productKey) {
      showToast("Cart is unavailable. Please refresh the page and try again.");
      return;
    }
    cart.addBooking({
      slug: productKey,
      name: product.name,
      image: product.image || product.images?.[0] || null,
      href,
      unitPrice: product.price,
      originalPrice: typeof product.originalPrice === "number" ? product.originalPrice : null,
      quantity: 1,
      city,
      locationType: "",
      address: "",
      eventDate: "",
      timeSlot: "",
      guestCount: "",
      eventType: "",
      addons: [],
      notes: "",
    });
    showToast(product.name + " added to your cart");
  }

  return (
    <article className="occ-prod-card occ-prod-card--market reveal">
      <div className="occ-prod-media">
        <Link to={href} className="occ-prod-media-link" aria-label={"View " + product.name} onClick={trackProductInteraction}>
          {discount > 0 && <span className="occ-prod-discount">{discount}% OFF</span>}
          <img src={product.image} alt={product.name} loading="lazy" decoding="async"  onError={onImgError}/>
        </Link>
        <button type="button" className="occ-prod-quick" aria-label={(isQuoteOnly ? "Request quote for " : inCart ? "Go to cart: " : "Add to cart: ") + product.name} title={isQuoteOnly ? "Request quote" : inCart ? "In cart — view cart" : "Add to cart"} onClick={quickAdd}>
          <Icon name={inCart && !isQuoteOnly ? "check" : "cart"} />
        </button>
      </div>

      <div className="occ-prod-body">
        <Link to={href} className="occ-prod-title-link" onClick={trackProductInteraction}><h4>{product.name}</h4></Link>

        {product.rating ? (
          <div className="occ-prod-rating">
            <span className="occ-prod-rating-badge">{Number(product.rating).toFixed(1)} <Icon name="star" /></span>
            {product.reviewCount ? <span className="occ-prod-reviews">{product.reviewCount} reviews</span> : null}
          </div>
        ) : null}

        <div className="occ-prod-price">
          <b>{priceNow}</b>
          {priceWas ? <s>{priceWas}</s> : null}
          {discount > 0 ? <span className="occ-prod-off">{discount}% OFF</span> : null}
        </div>
      </div>
    </article>
  );
}
