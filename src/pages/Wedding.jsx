import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { IMAGES, CATALOG_IMAGES, waLink } from "../data/images";
import ProductCard from "../components/occasion/ProductCard";
import { pathFor, sortProducts, weddingFunctionLinks, findOccasion } from "../data/occasions";
import { useLiveEntries, useLiveProducts } from "../hooks/useLiveCatalog";
import usePageMeta from "../hooks/usePageMeta";
import { onImgError } from "../lib/imageFallback";
import AutoScrollRail from "../components/AutoScrollRail";
import EventServicesSection from "../components/occasion/EventServicesSection";

const FUNCTIONS = [
  { label: "Haldi", img: CATALOG_IMAGES.haldi, href: "/occasion/wedding/wedding-events/haldi" },
  { label: "Mehendi", img: CATALOG_IMAGES.mehndi, href: "/occasion/wedding/wedding-events/mehndi" },
  { label: "Sangeet", img: CATALOG_IMAGES.sangeet, href: "/occasion/wedding/wedding-events/sangeet" },
  { label: "Wedding", img: CATALOG_IMAGES.wedding, href: "/occasion/wedding/wedding-events/wedding" },
  { label: "Reception", img: CATALOG_IMAGES.reception, href: "/occasion/wedding/wedding-events/reception" },
  { label: "Engagement", img: CATALOG_IMAGES.engagement, href: "/occasion/wedding/wedding-events/engagement" },
  { label: "Mayra and Rituals", img: CATALOG_IMAGES.maira, href: "/occasion/wedding/wedding-events/mayra-and-rituals" },
];

const SERVICES = [
  ["Decor", "Packages & Elements", CATALOG_IMAGES.decor],
  ["Entry", "Grand & Unique Entries", CATALOG_IMAGES["wedding-activity"] || CATALOG_IMAGES["services"]],
  ["Entertainment", "Artists, DJ & Live Bands", CATALOG_IMAGES.entertainment],
  ["Sound & Technical", "Sound, Lighting, LED & Effects", CATALOG_IMAGES["sound-technical"]],
  ["Tent & Furniture", "Tents, Seating & Tables", CATALOG_IMAGES["tent-furniture"]],
  ["Photography", "Capture Every Moment", CATALOG_IMAGES["photography-videography"]],
  ["Catering", "Delicious Food Experiences", CATALOG_IMAGES.catering],
  ["Baraat / Procession", "Make an Unforgettable Entry", CATALOG_IMAGES["baraat-procession"]],
];


const MOMENTS = [
  ["Mandap & Ceremony", IMAGES.galWedding1, false],
  ["Wedding Entry", IMAGES.galWedding2, true],
  ["Night Celebration", IMAGES.galWedding3, false],
  ["Floral Reception", IMAGES.showcase1, false],
  ["Couple Portraits", IMAGES.showcase4, true],
];

const REVIEWS = [
  { name: "Priya & Karan", city: "Ranchi", quote: "Our wedding was beyond beautiful. The team understood our vision perfectly and made it a reality.", image: IMAGES.showcase4 },
  { name: "Ritika Sharma", city: "Ranchi", quote: "Professional, creative and so easy to work with. They handled everything so well, we just enjoyed our special days!", image: IMAGES.galWedding2 },
  { name: "Aman & Neha", city: "Ranchi", quote: "From décor to entertainment, everything was flawless. Truly next level experience!", image: IMAGES.galWedding1 },
];

const USPS = [
  ["✦", "Creative Themes", "Concepts built around your story"],
  ["◉", "Experienced Team", "People who know events inside out"],
  ["◎", "End-to-End Support", "Planning through execution"],
  ["◇", "Premium Quality", "Thoughtful details, polished finish"],
  ["◷", "On-Time Execution", "Clear timelines and coordination"],
  ["♢", "Personalized Planning", "Your budget, guests and vision"],
];

function SectionHead({ eyebrow, title, link, dark = false }) {
  return (
    <div className={`wedding-section-head ${dark ? "dark" : ""}`}>
      <div>
        {eyebrow && <span>{eyebrow}</span>}
        <h2>{title}</h2>
      </div>
      {link && <Link to={link.href}>{link.label} <b>→</b></Link>}
    </div>
  );
}

function HorizontalRail({ children, className = "" }) {
  return <AutoScrollRail className={`wedding-horizontal-rail ${className}`} interval={4000}>{children}</AutoScrollRail>;
}

function WeddingHero() {
  const [heroImg, setHeroImg] = useState(() => {
    const wedding = findOccasion("wedding");
    return wedding?.heroImg || wedding?.image || IMAGES.heroWedding;
  });

  useEffect(() => {
    const refresh = () => {
      const wedding = findOccasion("wedding");
      if (wedding?.heroImg || wedding?.image) {
        setHeroImg(wedding.heroImg || wedding.image);
      }
    };
    window.addEventListener("nle-catalog-updated", refresh);
    return () => window.removeEventListener("nle-catalog-updated", refresh);
  }, []);

  return (
    <section className="wedding-hero">
      <img src={heroImg} alt="Wedding celebration by Next Level Events" fetchPriority="high" decoding="async" onError={onImgError} />
      <div className="wedding-hero-overlay" />
      <div className="wedding-hero-content">
        <span>OUR WEDDING COLLECTION</span>
        <h1>Weddings, <em>Beautifully Planned.</em></h1>
        <p>From your first ceremony to the final farewell, we bring every wedding function together under one seamless plan.</p>
        <div className="wedding-hero-actions">
          <Link to="/book-event" className="wedding-gold-btn">Plan Your Wedding <b>→</b></Link>
          <Link to="/gallery" className="wedding-outline-btn">View Our Work</Link>
        </div>
        <div className="wedding-hero-stats">
          <span><b>500+</b>Events Planned</span>
          <span><b>100%</b>Client Satisfaction</span>
          <span><b>6+ Years</b>Experience</span>
          <span><b>End-to-End</b>Wedding Support</span>
        </div>
      </div>
    </section>
  );
}

function WeddingFunctions() {
  const [functions, setFunctions] = useState(() => {
    const live = weddingFunctionLinks();
    return live.length ? live : FUNCTIONS;
  });

  useEffect(() => {
    const refresh = () => {
      const live = weddingFunctionLinks();
      if (live.length) setFunctions(live);
    };
    refresh();
    window.addEventListener("nle-catalog-updated", refresh);
    return () => window.removeEventListener("nle-catalog-updated", refresh);
  }, []);

  return (
    <section className="wedding-white-section">
      <div className="wedding-container">
        <SectionHead eyebrow="OUR WEDDING FUNCTIONS" title="Every Function, Beautifully Curated" link={{ label: "View All Weddings", href: "/occasion/wedding" }} />
        <HorizontalRail>
          {functions.map((item) => (
            <Link to={item.href} className="wedding-function-card" key={item.label + (item.slug || "")}>
              <img src={item.img || item.image} alt={item.label} loading="lazy" decoding="async" onError={onImgError} />
              <span>{item.label}</span>
              <b>→</b>
            </Link>
          ))}
        </HorizontalRail>
      </div>
    </section>
  );
}

function WeddingServices() {
  return <EventServicesSection contextPath={["wedding"]} />;
}

function formatPackagePrice(price) {
  const amount = Number(price);
  if (!Number.isFinite(amount) || amount <= 0) return "Contact for pricing";
  return `Starting from ₹${amount.toLocaleString("en-IN")}`;
}

function FeaturedPackages() {
  const entries = useLiveEntries();
  const [index, setIndex] = useState(0);
  const packages = entries
    .filter((entry) => entry?.occasion?.slug === "wedding")
    .map((entry) => entry.product)
    .filter((product) => product?.catalogKind === "package" && product.status !== "archived")
    .filter((product, i, list) => list.findIndex((item) => (item?.id || item?.slug) === (product?.id || product?.slug)) === i);

  useEffect(() => {
    setIndex((value) => Math.min(value, Math.max(0, packages.length - 1)));
  }, [packages.length]);

  useEffect(() => {
    if (packages.length < 2) return undefined;
    const timer = window.setInterval(() => setIndex((value) => (value + 1) % packages.length), 1000);
    return () => window.clearInterval(timer);
  }, [packages.length]);

  const go = (next) => setIndex((next + packages.length) % packages.length);
  const active = packages[index];

  return (
    <section className="wedding-package-section">
      <div className="wedding-container">
        <SectionHead eyebrow="FEATURED WEDDING PACKAGES" title="Handpicked Wedding Packages" link={{ label: "View All Packages", href: "/packages" }} />
        {active ? (
          <div className="wedding-package-slider">
            <button type="button" className="wedding-slider-arrow prev" onClick={() => go(index - 1)} disabled={packages.length < 2} aria-label="Previous package">←</button>
            <article className="wedding-package-card">
              <div className="wedding-package-image-wrap">
                <img src={active.image} alt={active.name} loading="lazy" decoding="async" onError={onImgError} />
                <span className="wedding-package-count">{index + 1} / {packages.length}</span>
              </div>
              <div className="wedding-package-copy">
                <span className="wedding-package-kicker">COMPLETE WEDDING EXPERIENCE</span>
                <h3>{active.name}</h3>
                <p>{active.description || active.tagline || "A complete wedding experience, tailored to your celebration."}</p>
                <strong className="wedding-package-price">{formatPackagePrice(active.price)}</strong>
                <ul>
                  {(Array.isArray(active.includes) ? active.includes : []).slice(0, 6).map((item) => <li key={item}>✓ {item}</li>)}
                </ul>
                <div className="wedding-package-actions">
                  <Link to={`/package-details?id=${encodeURIComponent(active.id || active.slug)}`} className="wedding-gold-btn">View Package <b>→</b></Link>
                  <Link to="/book-event" className="wedding-text-btn">Enquire Now</Link>
                </div>
              </div>
            </article>
            <button type="button" className="wedding-slider-arrow next" onClick={() => go(index + 1)} disabled={packages.length < 2} aria-label="Next package">→</button>
          </div>
        ) : (
          <p className="wedding-featured-empty">No wedding packages are available yet.</p>
        )}
      </div>
    </section>
  );
}

function FeaturedPackageCarousel() {
  const entries = useLiveEntries();
  const liveProducts = useLiveProducts();
  const [startIndex, setStartIndex] = useState(0);
  const [visibleCount, setVisibleCount] = useState(5);

  useEffect(() => {
    const update = () => {
      if (window.innerWidth <= 640) setVisibleCount(1);
      else if (window.innerWidth <= 900) setVisibleCount(2);
      else if (window.innerWidth <= 1200) setVisibleCount(3);
      else setVisibleCount(5);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // The catalog can store the wedding relationship in slightly different
  // fields depending on whether the product came from the occasion tree, the
  // admin catalog, or the cloud database. Match the occasion itself first,
  // rather than restricting products to a hard-coded list of category slugs.
  // That was causing valid wedding products to disappear from this slider.
  const isWeddingValue = (value) => {
    const slug = String(value || "").trim().toLowerCase();
    return slug === "wedding" || slug === "weddings" || slug.startsWith("wedding-") || slug.startsWith("weddings-");
  };

  const isWeddingProduct = (product) => {
    if (!product) return false;
    if (isWeddingValue(product.occasionSlug) || isWeddingValue(product.occasion)) return true;
    if (Array.isArray(product.categoryPath) && product.categoryPath.some(isWeddingValue)) return true;
    return isWeddingValue(product.categoryPath);
  };

  const entryProducts = entries
    .filter((entry) => isWeddingValue(entry?.occasion?.slug) || isWeddingValue(entry?.product?.occasionSlug))
    .filter((entry) => entry.product && entry.product.catalogKind === "product" && !entry.product.isAddon && entry.product.status !== "archived")
    .map((entry) => entry.product);

  const catalogProducts = liveProducts
    .filter(isWeddingProduct)
    .filter((product) => product.catalogKind === "product" && !product.isAddon && product.status !== "archived")
    .map((product) => ({
      ...product,
      categorySlug: product.categorySlug || (Array.isArray(product.categoryPath) ? product.categoryPath[product.categoryPath.length - 1] : "wedding"),
    }));

  // Packages/products are admin-owned data only. Never fall back to bundled
  // reference records here: an empty cloud catalog must remain visibly empty
  // until an admin creates the real wedding products/packages.
  const mergedProducts = [...entryProducts, ...catalogProducts];
  const products = sortProducts(mergedProducts, "popular").reduce((unique, product) => {
    const key = product.slug || product.id;
    if (!unique.some((item) => (item.slug || item.id) === key)) unique.push(product);
    return unique;
  }, []);

  const productEntries = products.map((product) => {
    const existingEntry = entries.find(
      (entry) => entry.product && (entry.product.slug || entry.product.id) === (product.slug || product.id),
    );
    if (existingEntry) return existingEntry;

    return {
      product,
      trail: [
        { slug: "wedding" },
        { slug: product.categorySlug || "haldi" },
        product,
      ],
    };
  });

  const maxStart = Math.max(0, productEntries.length - visibleCount);
  const safeStart = Math.min(startIndex, maxStart);
  const gap = visibleCount === 1 ? 0 : 16;
  const translate = safeStart === 0 ? "translateX(0)" : `translateX(calc(-${safeStart * (100 / visibleCount)}% - ${safeStart * (gap / visibleCount)}px))`;
  const move = (delta) => setStartIndex((value) => Math.max(0, Math.min(maxStart, value + delta)));

  useEffect(() => {
    if (maxStart <= 0) return undefined;
    const timer = window.setInterval(() => {
      setStartIndex((value) => value >= maxStart ? 0 : value + 1);
    }, 4000);
    return () => window.clearInterval(timer);
  }, [maxStart]);

  return (
    <section className="wedding-featured-section">
      <div className="wedding-container">
        <SectionHead eyebrow="FEATURED PRODUCTS" title="Popular Wedding Products" link={{ label: "View All Products", href: "/products" }} />
        {productEntries.length > 0 ? (
          <div className="wedding-featured-products-wrap">
            <button
              type="button"
              className="wedding-slider-arrow prev"
              onClick={() => move(-1)}
              disabled={safeStart === 0}
              aria-label="Previous wedding package"
            >
              ←
            </button>
            <div className="wedding-featured-products-viewport">
              <div
                className="wedding-featured-products-track"
                style={{ transform: translate }}
              >
                {productEntries.map((entry) => (
                  <div className="wedding-featured-product-slide" key={entry.product.id || entry.product.slug}>
                    <ProductCard
                      product={entry.product}
                      href={pathFor(entry.trail)}
                      variant="occasion-market"
                    />
                  </div>
                ))}
              </div>
            </div>
            <button
              type="button"
              className="wedding-slider-arrow next"
              onClick={() => move(1)}
              disabled={safeStart >= maxStart}
              aria-label="Next wedding package"
            >
              →
            </button>
          </div>
        ) : (
          <p className="wedding-featured-empty">No wedding packages are available yet.</p>
        )}
      </div>
    </section>
  );
}

function WeddingUSP() {
  return (
    <section className="wedding-usp-section">
      <div className="wedding-container">
        <SectionHead eyebrow="WHY CHOOSE NEXT LEVEL EVENTS?" title="We Don't Just Plan Weddings. We Create Memories." dark />
        <div className="wedding-usp-grid">
          {USPS.map(([icon, title, text]) => (
            <div key={title}>
              <i>{icon}</i>
              <strong>{title}</strong>
              <span>{text}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function WeddingMoments() {
  return (
    <section className="wedding-white-section">
      <div className="wedding-container">
        <SectionHead eyebrow="REAL WEDDING MOMENTS" title="Celebrations We've Had the Honour to Create" link={{ label: "View Full Gallery", href: "/gallery" }} />
        <HorizontalRail className="wedding-moments-rail">
          {MOMENTS.map(([label, img, video]) => (
            <Link to="/gallery" className="wedding-moment-card" key={label}>
              <img src={img} alt={label} loading="lazy" decoding="async" />
              {video && <span className="wedding-play">▶</span>}
              <strong>{label}</strong>
            </Link>
          ))}
        </HorizontalRail>
      </div>
    </section>
  );
}

function WeddingReviews() {
  return (
    <section className="wedding-review-section">
      <div className="wedding-container">
        <SectionHead eyebrow="WHAT OUR CLIENTS SAY" title="Real Stories. Real Celebrations." link={{ label: "View All Reviews", href: "/about" }} />
        <div className="wedding-review-grid">
          {REVIEWS.map((review) => (
            <article className="wedding-review-card" key={review.name}>
              <div className="wedding-review-avatar" aria-hidden="true">
                <span>{review.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span>
                <img
                  src={review.image}
                  alt={`${review.name} review`}
                  loading="eager"
                  decoding="async"
                  referrerPolicy="no-referrer"
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                  }}
                />
              </div>
              <div>
                <strong>{review.name}</strong>
                <span>{review.city}</span>
                <div className="wedding-stars" aria-label="5 star review">★★★★★</div>
              </div>
              <p>“{review.quote}”</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function WeddingCTA() {
  return (
    <section className="wedding-final-cta">
      <img src={IMAGES.galWedding2} alt="Elegant wedding dinner setting" loading="lazy" decoding="async" />
      <div className="wedding-final-overlay" />
      <div className="wedding-container">
        <span>LET'S PLAN YOUR DREAM WEDDING</span>
        <h2>Your Dream Wedding.<br /><em>Our Team. One Perfect Celebration.</em></h2>
        <p>Tell us about your dates, guests and ideas. We'll take care of the planning, coordination and execution.</p>
        <div className="wedding-hero-actions">
          <Link to="/book-event" className="wedding-gold-btn">Get a Free Consultation <b>→</b></Link>
          <a href={waLink("Hi Next Level Events! I would like to plan my wedding.")} className="wedding-outline-btn">WhatsApp Us</a>
        </div>
      </div>
    </section>
  );
}

export default function Wedding() {
  usePageMeta("Wedding — Next Level Events", "Complete wedding planning, décor, entertainment and event management for every wedding function.");
  useEffect(() => window.scrollTo(0, 0), []);

  return (
    <main className="wedding-page">
      <WeddingHero />
      <WeddingFunctions />
      <WeddingServices />
      <FeaturedPackages />
      <FeaturedPackageCarousel />
      <WeddingUSP />
      <WeddingMoments />
      <WeddingReviews />
      <WeddingCTA />
    </main>
  );
}
