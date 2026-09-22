import { useMemo } from "react";
import { Link } from "react-router-dom";
import usePageMeta from "../../hooks/usePageMeta";
import useReveal from "../../hooks/useReveal";
import useIsDesktop from "../../hooks/useIsDesktop";
import ProductGallery from "./ProductGallery";
import Icon from "../Icon";
import RatingStars from "../RatingStars";
import BookingPanel from "../BookingPanel";
import ProductRail from "../ProductRail";
import Faq from "../Faq";
import { useCity } from "../../context/CityContext";
import { cityPrice, fmtINR } from "../../lib/pricing";
import {
  pathFor,
  allProductsOf,
  discountPercent,
  relatedPackagesFor,
  popularInCity,
} from "../../data/occasions";
import { onImgError } from "../../lib/imageFallback";

// Renders a single product/package leaf, wherever it sits in the occasion
// tree. One reusable template drives every product's detail page — new
// products need only be added to data/occasions.js, nothing here changes.
import ProductSearchBar from "./ProductSearchBar";
export default function ProductTemplate({ node: product, trail }) {
  const { city } = useCity();
  const isDesktop = useIsDesktop(900);

  usePageMeta(
    product.name + " — Next Level Events",
    product.shortDesc || (product.name + " decor package from Next Level Events."),
  );
  useReveal([product.slug]);

  const parentNode = trail.length > 1 ? trail[trail.length - 2] : null;
  const parentTrail = trail.slice(0, -1);

  const similar = useMemo(() => {
    const pool = parentNode ? allProductsOf(parentNode) : [product];
    return pool
      .filter((p) => p.slug !== product.slug)
      .slice(0, 4)
      .map((p) => ({
        id: p.id,
        img: p.image,
        name: p.name,
        price: p.price,
        originalPrice: p.originalPrice,
        badge: discountPercent(p) > 0 ? discountPercent(p) + "% OFF" : null,
        href: pathFor([...parentTrail, p]),
      }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parentNode, product]);

  const related = useMemo(() => relatedPackagesFor(product, trail, 4), [product, trail]);
  const popular = useMemo(() => popularInCity(city, product.slug, 4), [city, product.slug]);

  const isQuoteOnly = Boolean(product.quoteOnly) || typeof product.price !== "number";
  const price = isQuoteOnly ? null : cityPrice(product.price, city);
  const originalPrice = !isQuoteOnly && typeof product.originalPrice === "number"
    ? cityPrice(product.originalPrice, city)
    : null;
  const discount = isQuoteOnly ? 0 : discountPercent(product);

  const defaultEventType =
    ({
      birthday: "Birthday Party",
      wedding: "Wedding Ceremony",
      anniversary: "Anniversary",
      "baby-shower": "Baby Shower",
      "newborn-welcome": "Naming Ceremony",
      corporate: "Corporate Event",
    })[trail?.[0]?.slug] || "Custom Celebration";

  const bookingPanel = !isQuoteOnly ? (
    <BookingPanel
      product={product}
      productHref={pathFor(trail)}
      addons={product.addons}
      requiresTimeSlot={product.requiresTimeSlot !== false}
      defaultEventType={defaultEventType}
    />
  ) : null;

  const rails = (
    <>
      {similar.length > 0 && (
        <ProductRail
          title="Similar Products"
          viewAllHref={parentNode ? pathFor(parentTrail) : undefined}
          items={similar}
        />
      )}
      {related.length > 0 && <ProductRail title="Related Packages" items={related} tone="surface" />}
      {popular.length > 0 && <ProductRail title={"Popular in " + city} items={popular} />}
    </>
  );

  if (isDesktop) {
    // Desktop intentionally remains the original product-detail layout.
    return (
      <>
        <section className="section-tight container pd-page-top">
          <div className="pd-back-row">
            <Link to={parentNode ? pathFor(parentTrail) : "/shop-by-occasion"} className="pd-back-link">
              ← Back to {parentNode ? parentNode.label : "occasions"}
            </Link>
          </div>

          <div className="pd-conversion-strip">
            <div className="pd-conversion-main">
              <span className="eyebrow">{parentNode ? parentNode.label : "Curated package"}</span>
              <h1>{product.name}</h1>
              <p>{product.shortDesc}</p>
            </div>
            <div className="pd-trust-points" aria-label="Booking benefits">
              <span><Icon name="check" /> {Number(product.rating).toFixed(1)} rated</span>
              <span><Icon name="check" /> {product.reviewCount || 0}+ reviews</span>
              <span><Icon name="check" /> No payment now</span>
            </div>
          </div>

          <div id="packageDetailsGrid">
            <div>
              <ProductGallery
                images={product.gallery && product.gallery.length ? product.gallery : [product.image]}
                alt={product.name}
              />

              <div className="reveal pd-info-block">
                <h1 className="pd-title">{product.name}</h1>
                <div className="pd-rating-line">
                  <RatingStars rating={product.rating} />
                  <span className="pd-rating-num">{Number(product.rating).toFixed(1)}</span>
                  <span className="pd-rating-reviews">({product.reviewCount} reviews)</span>
                </div>
                <div className="pd-price-row">
                  <b>{isQuoteOnly ? "Contact for pricing" : fmtINR(price)}</b>
                  {originalPrice ? <s>{fmtINR(originalPrice)}</s> : null}
                  {discount > 0 ? <span className="occ-prod-off">{discount}% OFF</span> : null}
                </div>
                {!isQuoteOnly && city !== "Ranchi" && (
                  <p style={{ color: "var(--text-secondary)", fontSize: 12.5, marginTop: 4 }}>
                    Price shown for {city} — includes a small logistics adjustment over our Ranchi base rate.
                  </p>
                )}
              </div>

              <div className="reveal occ-block" style={{ paddingTop: 28, marginTop: 28 }}>
                <h2 style={{ fontSize: 22, marginBottom: 12 }}>Description</h2>
                <p style={{ color: "var(--text-secondary)", maxWidth: "68ch", lineHeight: 1.6 }}>{product.description}</p>
              </div>

              {product.includes.length > 0 && (
                <div className="reveal occ-block">
                  <h2 style={{ fontSize: 22, marginBottom: 12 }}>What's Included</h2>
                  <ul className="included-list">
                    {product.includes.map((item) => <li key={item}><Icon name="check" />{item}</li>)}
                  </ul>
                </div>
              )}

              {product.notIncluded && product.notIncluded.length > 0 && (
                <div className="reveal occ-block">
                  <h2 style={{ fontSize: 22, marginBottom: 12 }}>What's Not Included</h2>
                  <ul className="not-included-list">
                    {product.notIncluded.map((item) => <li key={item}><Icon name="close" />{item}</li>)}
                  </ul>
                </div>
              )}

              <div className="reveal occ-block pd-meta-grid">
                <div className="pd-meta-card">
                  <h4><Icon name="compass" />Setup Requirements</h4>
                  <p>{product.setupRequirements}</p>
                </div>
                <div className="pd-meta-card">
                  <h4><Icon name="clock" />Duration</h4>
                  <p>{product.duration}</p>
                </div>
              </div>

              {product.importantInfo && product.importantInfo.length > 0 && (
                <div className="reveal occ-block">
                  <h2 style={{ fontSize: 22, marginBottom: 12 }}>Important Information</h2>
                  <ul className="important-info-list">
                    {product.importantInfo.map((item, i) => <li key={i}>{item}</li>)}
                  </ul>
                </div>
              )}

              {product.faqs && product.faqs.length > 0 && (
                <div className="reveal occ-block">
                  <h2 style={{ fontSize: 22, marginBottom: 16 }}>Frequently Asked Questions</h2>
                  <Faq items={product.faqs} />
                </div>
              )}
            </div>

            {!isQuoteOnly && (
              <aside className="reveal">
                <BookingPanel
                  product={product}
                  productHref={pathFor(trail)}
                  addons={product.addons}
                  requiresTimeSlot={product.requiresTimeSlot !== false}
                />
              </aside>
            )}
          </div>
        </section>
        {rails}
        <div className="bottom-cta">
          {isQuoteOnly ? <Link to="/book-event" className="btn btn-ghost">Custom Enquiry</Link> : <a href="#booking-panel" className="btn btn-ghost">Custom Enquiry</a>}
          {isQuoteOnly ? <Link to="/book-event" className="btn btn-primary">Book This Package</Link> : <a href="#booking-panel" className="btn btn-primary">Book This Package</a>}
        </div>
      </>
    );
  }

  // Mobile-only redesign. Desktop above is intentionally untouched.
  return (
    <>
      <section className="section-tight container pd-page-top">
        <ProductSearchBar />

        <div id="packageDetailsGrid">
          <div className="pd-main-column">
            <ProductGallery
              images={product.gallery && product.gallery.length ? product.gallery : [product.image]}
              alt={product.name}
            />

            <div className="pd-market-info reveal">
              <Link
                to={parentNode ? pathFor(parentTrail) : "/shop-by-occasion"}
                className="pd-market-badge"
              >
                {parentNode ? parentNode.label : "Curated package"}
              </Link>
              <h1 className="pd-title">{product.name}</h1>
              <div className="pd-rating-line">
                <RatingStars rating={product.rating} />
                <span className="pd-rating-num">{Number(product.rating).toFixed(1)}</span>
                <span className="pd-rating-reviews">({product.reviewCount || 0} reviews)</span>
              </div>
              <div className="pd-market-price">
                <b>{isQuoteOnly ? "Contact for pricing" : fmtINR(price)}</b>
                {originalPrice ? <s>{fmtINR(originalPrice)}</s> : null}
                {discount > 0 ? <span>{discount}% OFF</span> : null}
              </div>
              {!isQuoteOnly && city !== "Ranchi" && (
                <p className="pd-city-note">
                  Price shown for {city} — includes a small logistics adjustment over our Ranchi base rate.
                </p>
              )}
              <div className="pd-trust-row" aria-label="Booking benefits">
                <span><Icon name="check" /> Professional setup</span>
                <span><Icon name="check" /> {product.reviewCount || 0}+ reviews</span>
                <span><Icon name="check" /> No payment now</span>
              </div>
            </div>

            <div className="pd-market-section pd-description reveal">
              <div className="pd-section-heading"><h2>Description</h2></div>
              <p>{product.description}</p>
            </div>

            {!isQuoteOnly && bookingPanel && <div className="pd-booking-inline reveal">{bookingPanel}</div>}

            {product.includes?.length > 0 && (
              <div className="pd-market-section reveal">
                <div className="pd-section-heading"><h2>What's Included</h2></div>
                <ul className="included-list">
                  {product.includes.map((item) => <li key={item}><Icon name="check" />{item}</li>)}
                </ul>
              </div>
            )}

            {product.notIncluded?.length > 0 && (
              <div className="pd-market-section reveal">
                <div className="pd-section-heading"><h2>What's Not Included</h2></div>
                <ul className="not-included-list">
                  {product.notIncluded.map((item) => <li key={item}><Icon name="close" />{item}</li>)}
                </ul>
              </div>
            )}

            <div className="pd-market-section reveal">
              <div className="pd-section-heading"><h2>Setup &amp; Duration</h2></div>
              <div className="pd-meta-grid">
                <div className="pd-meta-card"><h4><Icon name="compass" />Setup Requirements</h4><p>{product.setupRequirements}</p></div>
                <div className="pd-meta-card"><h4><Icon name="clock" />Duration</h4><p>{product.duration}</p></div>
              </div>
            </div>

            {product.importantInfo?.length > 0 && (
              <div className="pd-market-section reveal">
                <div className="pd-section-heading"><h2>Important Information</h2></div>
                <ul className="important-info-list">{product.importantInfo.map((item, i) => <li key={i}>{item}</li>)}</ul>
              </div>
            )}

            {product.faqs?.length > 0 && (
              <div className="pd-market-section reveal">
                <div className="pd-section-heading"><h2>Frequently Asked Questions</h2></div>
                <Faq items={product.faqs} />
              </div>
            )}
          </div>
        </div>
      </section>

      {rails}

      <div className="bottom-cta">
        {isQuoteOnly ? <Link to="/book-event" className="btn btn-ghost">Custom Enquiry</Link> : <a href="#booking-panel" className="btn btn-ghost">Custom Enquiry</a>}
        {isQuoteOnly ? <Link to="/book-event" className="btn btn-primary">Book This Package</Link> : <a href="#booking-panel" className="btn btn-primary">Book This Package</a>}
      </div>
    </>
  );
}
