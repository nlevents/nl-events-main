import { useMemo } from "react";
import { Link } from "react-router-dom";
import usePageMeta from "../../hooks/usePageMeta";
import useReveal from "../../hooks/useReveal";
import useIsDesktop from "../../hooks/useIsDesktop";
import Breadcrumb from "./Breadcrumb";
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
export default function ProductTemplate({ node: product, trail }) {
  const { city } = useCity();
  const isDesktop = useIsDesktop(900);

  usePageMeta(
    product.name + " — Next Level Events",
    product.shortDesc || (product.name + " decor package from Next Level Events."),
  );
  useReveal([product.slug]);

  const crumbs = useMemo(() => {
    const items = [{ label: "Shop by Occasion", href: "/shop-by-occasion" }];
    trail.forEach((n, i) => {
      items.push({ label: n.label, href: i < trail.length - 1 ? pathFor(trail.slice(0, i + 1)) : null });
    });
    return items;
  }, [trail]);

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
  const originalPrice = !isQuoteOnly && typeof product.originalPrice === "number" ? cityPrice(product.originalPrice, city) : null;
  const discount = isQuoteOnly ? 0 : discountPercent(product);

  return (
    <>
      <section className="hero hero-sm">
        <div className="hero-media"><img src={product.image} alt={product.name}  onError={onImgError}/></div>
        <div className="hero-content">
          <span className="eyebrow">{parentNode ? parentNode.label : "Package"}</span>
          <h1>{product.name}</h1>
          <p>{product.shortDesc}</p>
        </div>
      </section>

      <section className="section-tight container">
        <Breadcrumb items={crumbs} />

        <div id="packageDetailsGrid">
          <div>
            {/* ---------- Gallery ---------- */}
            <ProductGallery images={product.gallery && product.gallery.length ? product.gallery : [product.image]} alt={product.name} />

            {/* ---------- Product info ---------- */}
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

            {/* ---------- Description ---------- */}
            <div className="reveal occ-block" style={{ paddingTop: 28, marginTop: 28 }}>
              <h2 style={{ fontSize: 22, marginBottom: 12 }}>Description</h2>
              <p style={{ color: "var(--text-secondary)", maxWidth: "68ch", lineHeight: 1.6 }}>{product.description}</p>
            </div>

            {/* ---------- Configure Your Booking (mobile: inline here; desktop: sticky sidebar below) ---------- */}
            {!isDesktop && !isQuoteOnly && (
              <div className="reveal">
                <BookingPanel
                  product={product}
                  productHref={pathFor(trail)}
                  addons={product.addons}
                  requiresTimeSlot={product.requiresTimeSlot !== false}
                  defaultEventType={
                    ({ birthday: "Birthday Party", wedding: "Wedding Ceremony", anniversary: "Anniversary", "baby-shower": "Baby Shower", "newborn-welcome": "Naming Ceremony", corporate: "Corporate Event" })[trail?.[0]?.slug] || "Custom Celebration"
                  }
                />
              </div>
            )}

            {/* ---------- What's Included ---------- */}
            {product.includes.length > 0 && (
              <div className="reveal occ-block">
                <h2 style={{ fontSize: 22, marginBottom: 12 }}>What's Included</h2>
                <ul className="included-list">
                  {product.includes.map((item) => (
                    <li key={item}><Icon name="check" />{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* ---------- What's Not Included ---------- */}
            {product.notIncluded && product.notIncluded.length > 0 && (
              <div className="reveal occ-block">
                <h2 style={{ fontSize: 22, marginBottom: 12 }}>What's Not Included</h2>
                <ul className="not-included-list">
                  {product.notIncluded.map((item) => (
                    <li key={item}><Icon name="close" />{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* ---------- Setup requirements & duration ---------- */}
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

            {/* ---------- Important information ---------- */}
            {product.importantInfo && product.importantInfo.length > 0 && (
              <div className="reveal occ-block">
                <h2 style={{ fontSize: 22, marginBottom: 12 }}>Important Information</h2>
                <ul className="important-info-list">
                  {product.importantInfo.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* ---------- FAQs ---------- */}
            {product.faqs && product.faqs.length > 0 && (
              <div className="reveal occ-block">
                <h2 style={{ fontSize: 22, marginBottom: 16 }}>Frequently Asked Questions</h2>
                <Faq items={product.faqs} />
              </div>
            )}
          </div>

          {isDesktop && !isQuoteOnly && (
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

      {similar.length > 0 && (
        <ProductRail
          title="Similar Products"
          viewAllHref={parentNode ? pathFor(parentTrail) : undefined}
          items={similar}
        />
      )}

      {related.length > 0 && (
        <ProductRail title="Related Packages" items={related} tone="surface" />
      )}

      {popular.length > 0 && (
        <ProductRail title={"Popular in " + city} items={popular} />
      )}

      <div className="bottom-cta">
        <Link to="/book-event" className="btn btn-ghost">Custom Enquiry</Link>
        {isQuoteOnly ? (
          <Link to="/book-event" className="btn btn-primary">Request a Quote</Link>
        ) : (
          <a href="#booking-panel" className="btn btn-primary">Book This Package</a>
        )}
      </div>
    </>
  );
}
