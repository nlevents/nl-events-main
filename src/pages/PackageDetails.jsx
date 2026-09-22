import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { listProducts, listSimilar } from "../data/products";
import { useLiveProduct, useLiveProducts } from "../hooks/useLiveCatalog";
import { IMAGES } from "../data/images";
import { useCity } from "../context/CityContext";
import { cityPrice, fmtINR } from "../lib/pricing";
import usePageMeta from "../hooks/usePageMeta";
import useReveal from "../hooks/useReveal";
import useIsDesktop from "../hooks/useIsDesktop";
import Icon from "../components/Icon";
import RatingStars from "../components/RatingStars";
import ProductGallery from "../components/occasion/ProductGallery";
import BookingPanel from "../components/BookingPanel";
import ProductRail from "../components/ProductRail";
import Faq from "../components/Faq";
import { onImgError } from "../lib/imageFallback";

// Generic, category-based detail content for the flagship Packages system
// (products.js). Mirrors the richer per-product content in data/occasions.js
// so both product systems share the exact same detail-page building blocks.
const CATEGORY_META = {
  wedding: {
    notIncluded: ["Venue booking or rental charges", "Bridal/groom personal styling & attire", "Government permits or licenses (if applicable)", "Guest travel & accommodation"],
    setupRequirements: "Full access to the venue at least 3 hours before guest arrival, and coordination with venue management for placement of decor and staging elements.",
    duration: "Setup: 3–5 hours across ceremony/reception days • On-site coordination for the full event",
    importantInfo: [
      "Final decor tones may vary slightly based on same-day floral availability.",
      "Book at least 2–4 weeks in advance, earlier during wedding season.",
      "Prices shown are for the base guest count — larger weddings may need a custom quote.",
      "A dedicated coordinator will confirm venue access timing 48 hours before the event.",
    ],
    faqs: [
      { q: "How far in advance should we book?", a: "We recommend 4–6 weeks ahead for weddings, especially during peak season, to lock in your preferred date and vendor team." },
      { q: "Can the decor be customised to our theme colours?", a: "Yes — share your palette and inspiration and our design team will tailor the mandap and stage styling to match." },
      { q: "Is catering included?", a: "This package includes catering coordination; final menu selection and catering costs are confirmed separately with our partner caterers." },
      { q: "What if our guest count changes?", a: "Let us know as early as possible so we can requote any additional staging, seating or catering needs." },
    ],
  },
  birthday: {
    notIncluded: ["Venue booking or hall rental", "Cake, catering or beverages", "Party favours / return gifts", "Photography or videography"],
    setupRequirements: "A clear space of at least 8–10 ft width, one power outlet nearby, and 60–90 minutes of prior access for backdrop and table styling.",
    duration: "Setup: 60–90 minutes • Decor stays fresh through the entire party",
    importantInfo: [
      "Final prop styles may vary slightly based on same-day material availability.",
      "Book at least 3–5 days in advance — weekend slots fill up fast.",
      "Price covers a standard setup; larger halls or guest counts may need an adjusted quote.",
      "Our stylist will call 24 hours before the event to confirm access timing.",
    ],
    faqs: [
      { q: "Can I change the theme or colour palette?", a: "Yes — share your preferred theme in the customisation notes while booking and our stylist will adapt the setup, subject to availability." },
      { q: "Do you provide the birthday cake?", a: "Cake isn't included, but we're happy to coordinate placement and cake-table styling with your baker." },
      { q: "Is teardown included?", a: "Yes, our team returns to clear the setup after the event at a time coordinated with you." },
    ],
  },
  corporate: {
    notIncluded: ["Venue booking charges", "Speaker/artist fees", "Food & beverage catering", "Travel or accommodation for attendees"],
    setupRequirements: "Full venue access at least 3 hours before the event, plus coordination with the venue's AV and electrical teams.",
    duration: "Setup: 2–4 hours depending on stage/AV scale • On-site crew for the full event",
    importantInfo: [
      "Branding assets (logos, colours) should be shared at least a week in advance for signage production.",
      "AV requirements are finalised during a technical walkthrough before the event.",
      "Prices shown are for a standard guest count — larger events may need a custom quote.",
    ],
    faqs: [
      { q: "Can you match our brand guidelines?", a: "Yes — share your brand kit and our team will apply it across staging, signage and any digital displays." },
      { q: "Do you handle live streaming?", a: "Live streaming is available as a service where listed; let us know your platform requirements in advance." },
    ],
  },
  concert: {
    notIncluded: ["Venue/ground booking charges", "Artist or performer fees", "Ticketing platform charges", "Food & beverage stalls"],
    setupRequirements: "Full ground/venue access at least 4–6 hours before doors open, with clearance for stage, sound and lighting rigging.",
    duration: "Setup: 4–6 hours for stage & sound rigging • Full-event technical crew on standby",
    importantInfo: [
      "Sound and lighting plans are finalised during a technical walkthrough before the event.",
      "Security and crowd-management staffing scales with expected attendance — share your estimate early.",
      "Prices shown are for a standard production scale — larger productions may need a custom quote.",
    ],
    faqs: [
      { q: "Do you handle artist coordination?", a: "Yes, artist logistics and stage coordination are included; travel and performance fees are arranged separately." },
      { q: "Can you support outdoor venues?", a: "Yes — let us know the ground layout and expected weather conditions so we can plan rigging and backup accordingly." },
    ],
  },
};
const DEFAULT_META = {
  notIncluded: ["Venue booking or rental charges", "Catering, cake or beverages", "Photography or videography"],
  setupRequirements: "Please share your space dimensions and preferred access timing while booking so our team can plan the setup accordingly.",
  duration: "Setup: 60–90 minutes • On-site support available on request",
  importantInfo: ["Prices shown are for the base package — larger spaces or guest counts may attract additional charges."],
  faqs: [{ q: "How far in advance should I book?", a: "We recommend booking at least a week ahead, earlier during peak season." }],
};

const GALLERY_POOL = [
  IMAGES.showcase1, IMAGES.showcase2, IMAGES.showcase3, IMAGES.showcase4,
  IMAGES.showcase6, IMAGES.showcase8,
  IMAGES.galDecor1, IMAGES.galDecor2, IMAGES.galDecor3,
];
function hashStr(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}
function buildGallery(product) {
  const h = hashStr(product.id);
  const pool = GALLERY_POOL.filter((img) => img !== product.image);
  const picks = [0, 1, 2, 3, 4].map((i) => pool[(h + i * 7) % pool.length]);
  return [product.image, ...picks];
}

export default function PackageDetails() {
  const [params] = useSearchParams();
  const rawId = (params.get("id") || "").toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 60);
  const product = useLiveProduct(rawId);
  const allProducts = useLiveProducts();
  const { city } = useCity();
  const isDesktop = useIsDesktop(900);

  usePageMeta(
    product ? product.name + " Package — Next Level Events" : "Package Not Found — Next Level Events",
    "Package details, inclusions and services from Next Level Events."
  );
  useReveal([rawId]);

  const similar = useMemo(() => (product ? listSimilar(product.id, 4) : []), [product, allProducts]);
  const related = useMemo(() => {
    if (!product) return [];
    return allProducts
      .filter((p) => p.id !== product.id && p.category !== product.category)
      .slice(0, 4);
  }, [product, allProducts]);
  const popular = useMemo(() => {
    if (!product) return [];
    return allProducts
      .filter((p) => p.id !== product.id)
      .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
      .slice(0, 4);
  }, [product, allProducts]);

  if (!product) {
    return (
      <section className="section-tight container">
        <p className="crumb" style={{ marginBottom: 24 }}><Link to="/">Home</Link> / <Link to="/packages">Packages</Link> / <span>Not found</span></p>
        <div className="reveal" style={{ padding: "40px 0" }}>
          <h2>Package not found</h2>
          <p style={{ color: "var(--text-secondary)", marginTop: 8 }}>This package may have been renamed or removed.</p>
          <Link to="/packages" className="btn btn-primary" style={{ marginTop: 16, display: "inline-block" }}>Browse All Packages</Link>
        </div>
      </section>
    );
  }

  const meta = CATEGORY_META[product.category] || DEFAULT_META;
  const gallery = buildGallery(product);
  const price = cityPrice(product.price, city);
  const originalPrice = typeof product.originalPrice === "number" ? cityPrice(product.originalPrice, city) : null;
  const discount = originalPrice && originalPrice > price ? Math.round((1 - price / originalPrice) * 100) : 0;

  function toRail(p) {
    return { id: p.id, img: p.image, name: p.name, price: p.price, originalPrice: p.originalPrice, href: "/package-details?id=" + encodeURIComponent(p.id) };
  }

  const highlights = (product.includes || []).slice(0, 5);
  const addonList = Array.isArray(product.addons) ? product.addons.slice(0, 4) : [];
  const description = product.description || product.tagline || "A thoughtfully designed event package, prepared and delivered by the Next Level Events team.";

  return (
    <>
      <section className="section-tight container pd-page-top">
        <div id="packageDetailsGrid">
          <div className="pd-main-column">
            <ProductGallery images={gallery} alt={product.name} />

            <div className="reveal pd-market-info">
              {product.badge ? <span className="pd-market-badge">{product.badge}</span> : null}
              <h1 className="pd-title">{product.name}</h1>

              <div className="pd-rating-line">
                <span className="pd-rating-chip">
                  {Number(product.rating).toFixed(1)} <span aria-hidden="true">★</span>
                </span>
                <span className="pd-rating-reviews">{product.reviewCount}+ ratings &amp; reviews</span>
              </div>

              <div className="pd-market-price">
                <b>{fmtINR(price)}</b>
                {originalPrice ? <s>{fmtINR(originalPrice)}</s> : null}
                {discount > 0 ? <span>{discount}% off</span> : null}
              </div>

              {city !== "Ranchi" && (
                <p className="pd-city-note">
                  Price shown for {city} · includes a small logistics adjustment.
                </p>
              )}

              <div className="pd-offer-card">
                <div className="pd-offer-head">
                  <span className="pd-offer-icon">%</span>
                  <strong>Package benefits</strong>
                </div>
                <p>No payment is required to send an enquiry. Confirm the date and details with our team first.</p>
                <div className="pd-offer-points">
                  <span><Icon name="check" /> Easy booking</span>
                  <span><Icon name="check" /> Expert setup</span>
                  <span><Icon name="check" /> Clear pricing</span>
                </div>
              </div>

              <div className="pd-description" id="pd-description">
                <h2>Description</h2>
                <p>{description}</p>
              </div>
            </div>

            {!isDesktop && (
              <div className="reveal">
                <BookingPanel
                  product={product}
                  productHref={"/package-details?id=" + encodeURIComponent(product.id)}
                  addons={product.addons}
                  requiresTimeSlot
                  defaultEventType={
                    ({ wedding: "Wedding Ceremony", birthday: "Birthday Party", anniversary: "Anniversary", corporate: "Corporate Event" })[product.category] || "Custom Celebration"
                  }
                />
              </div>
            )}

            <section className="reveal pd-market-section pd-service-card" id="pd-service-details">
              <div className="pd-section-heading">
                <h2>Service details</h2>
                <span>For your event</span>
              </div>
              <div className="pd-service-grid">
                <div><Icon name="pin" /><div><b>{city}</b><small>Service location</small></div></div>
                <div><Icon name="calendar" /><div><b>Flexible date</b><small>Confirm availability before booking</small></div></div>
                <div><Icon name="clock" /><div><b>{meta.duration.split("•")[0]}</b><small>Setup &amp; service time</small></div></div>
              </div>
            </section>

            <section className="reveal pd-market-section pd-peace-card">
              <div className="pd-section-heading">
                <h2>Book with confidence</h2>
              </div>
              <div className="pd-peace-grid">
                <div><span>✓</span><b>Expert setup</b><small>Handled by our event team</small></div>
                <div><span>✓</span><b>Transparent pricing</b><small>No surprise package fee</small></div>
                <div><span>✓</span><b>Personal support</b><small>We'll confirm the details with you</small></div>
              </div>
            </section>

            {highlights.length > 0 && (
              <section className="reveal pd-market-section" id="pd-highlights">
                <div className="pd-section-heading">
                  <h2>Package highlights</h2>
                  <span>{highlights.length} included</span>
                </div>
                <ul className="pd-highlight-list">
                  {highlights.map((item) => <li key={item}><Icon name="check" /><span>{item}</span></li>)}
                </ul>
              </section>
            )}

            <section className="reveal pd-market-section pd-details-card" id="pd-details">
              <div className="pd-section-heading">
                <h2>All details</h2>
                <span>Package information</span>
              </div>
              <div className="pd-detail-tabs" role="tablist">
                <a href="#pd-description" className="is-active">Overview</a>
                <a href="#pd-included">What's included</a>
                <a href="#pd-not-included">Not included</a>
                <a href="#pd-faq">FAQs</a>
              </div>
            </section>

            <div className="reveal occ-block pd-market-section" id="pd-included">
              <div className="pd-section-heading"><h2>What's included</h2></div>
              <ul className="included-list">
                {product.includes.map((item) => <li key={item}><Icon name="check" />{item}</li>)}
              </ul>
            </div>

            <div className="reveal occ-block pd-market-section" id="pd-not-included">
              <div className="pd-section-heading"><h2>What's not included</h2></div>
              <ul className="not-included-list">
                {meta.notIncluded.map((item) => <li key={item}><Icon name="close" />{item}</li>)}
              </ul>
            </div>

            <div className="reveal pd-market-section pd-meta-grid">
              <div className="pd-meta-card">
                <h4><Icon name="compass" />Setup requirements</h4>
                <p>{meta.setupRequirements}</p>
              </div>
              <div className="pd-meta-card">
                <h4><Icon name="clock" />Duration</h4>
                <p>{meta.duration}</p>
              </div>
            </div>

            <div className="reveal pd-market-section">
              <div className="pd-section-heading"><h2>Important information</h2></div>
              <ul className="important-info-list">
                {meta.importantInfo.map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            </div>

            {similar.length > 0 && (
              <div className="pd-market-section pd-similar-wrap">
                <ProductRail title="Similar Packages" viewAllHref="/packages" items={similar.map(toRail)} />
              </div>
            )}

            {addonList.length > 0 && (
              <section className="reveal pd-market-section pd-addon-section">
                <div className="pd-section-heading">
                  <h2>Optional add-ons</h2>
                  <span>Customise your package</span>
                </div>
                <div className="pd-addon-list">
                  {addonList.map((addon) => (
                    <div className="pd-addon-item" key={addon.name}>
                      <div><b>{addon.name}</b><small>Add this service during booking</small></div>
                      <span>Available</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section className="reveal pd-market-section" id="pd-faq">
              <div className="pd-section-heading"><h2>Frequently asked questions</h2></div>
              <Faq items={meta.faqs} />
            </section>
          </div>

          {isDesktop && (
            <aside className="reveal">
              <BookingPanel
                product={product}
                productHref={"/package-details?id=" + encodeURIComponent(product.id)}
                addons={product.addons}
                requiresTimeSlot
                defaultEventType={
                  ({ wedding: "Wedding Ceremony", birthday: "Birthday Party", anniversary: "Anniversary", corporate: "Corporate Event" })[product.category] || "Custom Celebration"
                }
              />
            </aside>
          )}
        </div>

        <div className="pd-action-row" aria-label="Booking actions">
          <a href="#booking-panel" className="pd-action pd-action-secondary">Custom Enquiry</a>
          <a href="#booking-panel" className="pd-action pd-action-primary">Book This Package</a>
        </div>
      </section>

      {product.reviews && product.reviews.length > 0 && (
        <section className="section-tight container pd-reviews-section">
          <div className="pd-section-heading reveal"><h2>Ratings &amp; reviews</h2><span>{product.reviewCount}+ reviews</span></div>
          <div className="reviews-summary reveal">
            <div className="reviews-score">
              <h3>{Number(product.rating).toFixed(1)}</h3>
              <RatingStars rating={product.rating} />
              <p>Based on {product.reviewCount}+ customer reviews</p>
            </div>
            <div className="reviews-bars">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = product.reviews.filter((r) => r.rating === star).length;
                const pct = Math.round((count / product.reviews.length) * 100) || 0;
                return (
                  <div className="rbar" key={star}>
                    <span>{star}★</span>
                    <div className="rbar-track"><div className="rbar-fill" style={{ width: pct + "%" }}></div></div>
                    <span>{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="review-carousel reveal">
            {product.reviews.map((r) => (
              <div className="review-card" key={r.name}>
                <RatingStars rating={r.rating} size="sm" />
                <p>{r.text}</p>
                {r.tags && r.tags.length > 0 && <div className="review-tags">{r.tags.map((t) => <span key={t}>{t}</span>)}</div>}
                <div className="review-who">
                  <span className="review-avatar">{r.name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase()}</span>
                  <div><h5>{r.name}</h5><span>{r.location}</span></div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {related.length > 0 && <ProductRail title="Related Packages" items={related.map(toRail)} tone="surface" />}
      {popular.length > 0 && <ProductRail title={"Popular in " + city} items={popular.map(toRail)} />}
    </>
  );
}
