import { useMemo } from "react";
import { Link } from "react-router-dom";
import { IMAGES } from "../data/images";
import { useLiveProducts } from "../hooks/useLiveCatalog";
import usePageMeta from "../hooks/usePageMeta";
import ProductRail from "../components/ProductRail";
import ShortsRail from "../components/ShortsRail";
import VideoReviewGrid from "../components/VideoReviewGrid";
import Faq from "../components/Faq";
import { useCity } from "../context/CityContext";
import { cityPrice, fmtINR } from "../lib/pricing";
import { onImgError } from "../lib/imageFallback";

const HOME_CATEGORIES = [
  { label: "Weddings", href: "/occasion/wedding", img: IMAGES.typeWedding },
  { label: "Birthdays", href: "/occasion/birthday", img: IMAGES.typeBirthday },
  { label: "Anniversaries", href: "/occasion/anniversary", img: IMAGES.typeAnniversary },
  { label: "Baby Shower", href: "/occasion/baby-shower", img: IMAGES.typeBabyShower },
  { label: "Kids Birthday", href: "/occasion/birthday/kids-birthday", img: IMAGES.typeKidsBirthday },
  { label: "Newborn Welcome", href: "/occasion/newborn-welcome", img: IMAGES.typeNewbornWelcome },
  { label: "Corporate", href: "/occasion/corporate", img: IMAGES.typeCorporate },
  { label: "Annaprashan", href: "/occasion/annaprashan", img: IMAGES.typeAnnaprashan },
  { label: "Festivals & Culture", href: "/occasion/festivals-culture", img: IMAGES.typeFestival },
];

const FALLBACK_ITEMS = [
  { id: "birthday", name: "Birthday Balloon Decoration", image: IMAGES.typeBirthday, price: 2499 },
  { id: "kids", name: "Kids Birthday Decoration", image: IMAGES.typeKidsBirthday, price: 3999 },
  { id: "baby", name: "Baby Shower Decoration", image: IMAGES.typeBabyShower, price: 4699 },
  { id: "anniversary", name: "Romantic Anniversary Decor", image: IMAGES.typeAnniversary, price: 3999 },
  { id: "wedding", name: "Wedding Decor", image: IMAGES.typeWedding, price: 7999 },
];


const HOME_FAQS = [
  { q: "How far in advance should I book?", a: "We recommend booking 6–8 weeks ahead for weddings and 2–3 weeks for birthdays or smaller celebrations, though we do accommodate shorter timelines when possible." },
  { q: "Can packages be customised?", a: "Yes — every package is a starting point. We tailor décor, catering, entertainment and guest count to your budget and vision." },
  { q: "Which cities do you operate in?", a: "We primarily serve Ranchi and can coordinate events in other cities depending on the event scope and requirements." },
  { q: "What is the payment structure?", a: "We share a clear quotation before booking and confirm the payment milestones with you before the event is locked." },
  { q: "Do you handle vendor coordination?", a: "Yes. Our team can coordinate décor, catering, photography, entertainment, lighting and other event vendors so you have one point of contact." },
  { q: "Do you travel outside Ranchi for events?", a: "Yes, we can travel outside Ranchi for selected events. Share your location and event details and we will confirm availability." },
  { q: "How do I get a quote?", a: "Start an enquiry with your event type, date, guest count and requirements. Our team will review the details and get back to you." },
];

const HOME_REVIEWS = [
  { initials: "AR", name: "Ananya & Rohan", meta: "Wedding, Mumbai", text: "Our wedding décor looked exactly like the mood board we shared — the team managed every vendor flawlessly.", tags: ["Great Décor", "Punctual Setup", "Worth the Price"] },
  { initials: "SK", name: "Sanjay Kapoor", meta: "Corporate, Bengaluru", text: "Corporate launch went off perfectly — stage, AV and hospitality were all handled by one coordinator.", tags: ["Great Coordination", "On-Time"] },
  { initials: "MP", name: "Meera Patil", meta: "Birthday, Pune", text: "My daughter's birthday theme was so well executed, from the balloon arch to the cake table styling. Highly recommended.", tags: ["Creative Theming", "Kid-Friendly"] },
];

function HomeStats() {
  return (
    <section className="video-home-stats">
      <div className="container">
        <div className="video-home-stat"><strong>150+</strong><span>Events Celebrated</span></div>
        <div className="video-home-stat"><strong>5+</strong><span>Years of Experience</span></div>
        <div className="video-home-stat"><strong>4.9</strong><span>Average Rating</span></div>
      </div>
    </section>
  );
}

function CustomerReviews() {
  return (
    <section className="video-home-reviews">
      <div className="container">
        <div className="video-home-section-head"><h2>Customer Reviews</h2></div>
        <div className="video-home-rating-summary">
          <div className="video-home-rating-score"><strong>4.9</strong><div className="stars">★★★★★</div><span>Based on 150+ verified reviews</span></div>
          <div className="video-home-rating-bars">
            {[['5★','92%'],['4★','6%'],['3★','2%'],['2★','0%'],['1★','0%']].map(([label,value]) => (
              <div className="rating-bar-row" key={label}><span>{label}</span><i><b style={{width:value}} /></i><em>{value}</em></div>
            ))}
          </div>
        </div>
        <div className="video-home-review-grid">
          {HOME_REVIEWS.map((review) => (
            <article className="video-home-review-card" key={review.name}>
              <div className="stars">★★★★★</div>
              <p>{review.text}</p>
              <div className="review-tags">{review.tags.map(tag => <span key={tag}>{tag}</span>)}</div>
              <div className="review-person"><b>{review.initials}</b><div><strong>{review.name}</strong><small>{review.meta}</small></div></div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function HomeTrustSections() {
  return (
    <>
      <section className="video-home-different">
        <div className="container">
          <div className="video-home-section-head"><h2>How We’re Different</h2></div>
          <div className="video-home-different-grid">
            <div><span>✦</span><h3>Premium Décor</h3><p>Bespoke styling using premium florals, fabric and lighting.</p></div>
            <div><span>☰</span><h3>End-to-End Management</h3><p>One team for planning, vendors, décor and execution.</p></div>
            <div><span>◷</span><h3>On-Time Delivery</h3><p>Set-up completed and reviewed well before your first guest.</p></div>
            <div><span>▱</span><h3>24/7 Support</h3><p>A dedicated coordinator reachable through your event day.</p></div>
          </div>
        </div>
      </section>

      <section className="video-home-steps">
        <div className="container">
          <div className="video-home-section-head"><h2>Plan In 3 Simple Steps</h2></div>
          <div className="video-home-step-list">
            <div><span>1</span><div><h3>Tell Us Your Vision</h3><p>Share your event type, date and budget — we’ll shortlist ideas.</p></div></div>
            <div><span>2</span><div><h3>Choose &amp; Customise</h3><p>Pick a package and personalise décor, catering and entertainment.</p></div></div>
            <div><span>3</span><div><h3>We Deliver</h3><p>Our team executes on-site, start to finish, so you can celebrate.</p></div></div>
          </div>
        </div>
      </section>

      <section className="video-home-about">
        <div className="container">
          <div className="video-home-section-head"><h2>About Next Level Events</h2></div>
          <p><strong>Next Level Events</strong> is a Ranchi-based, full-service event management and décor company built around one idea — every celebration deserves a team that treats it like the only one they’re working on. From intimate anniversaries to 500-guest weddings, we plan, style and run the day so you get to actually be present in it, instead of chasing vendors and timelines.</p>
          <h3>Who We Are</h3>
          <p>We're a team of planners, décor stylists, production managers and coordinators who've spent years learning what makes a celebration feel effortless: tight logistics hidden behind beautiful design. We work as one point of contact for you, and as the coordinating hub for every vendor — caterers, florists, lighting and sound crews, photographers and entertainers — so nothing falls through the cracks on the day itself.</p>
          <h3>What We Do</h3>
          <p className="about-more">We bring together décor, event planning, entertainment, vendor coordination and on-site execution into one experience. Whether you need a focused birthday setup or a complete wedding production, we shape the plan around your venue, guest count, budget and vision.</p>
          <Link to="/about" className="video-home-read-more">Read more <span>⌄</span></Link>
        </div>
      </section>

      <section className="video-home-faq">
        <div className="container">
          <div className="video-home-section-head"><h2>Frequently Asked Questions</h2></div>
          <Faq items={HOME_FAQS} />
        </div>
      </section>

      <section className="video-home-final-cta">
        <div className="container">
          <h2>Let's Create Something<br />Unforgettable.</h2>
          <Link to="/book-event">Plan Your Event</Link>
        </div>
      </section>

      <section className="video-home-consultation">
        <div className="container">
          <span>Get a Free Consultation</span>
          <p>Share your event details through our complete inquiry flow. Your submission is saved directly to our CRM.</p>
          <div className="video-home-consult-card">
            <h2>Plan your event with us</h2>
            <p>Event type → Event details + vision → Contact details → Review → Submit</p>
            <Link to="/book-event">Start Your Inquiry</Link>
          </div>
        </div>
      </section>
    </>
  );
}

function normalizeProduct(p) {
  return {
    id: p.id || p.slug,
    href: "/package-details?id=" + (p.id || p.slug),
    img: p.image || p.img || IMAGES.typeBirthday,
    name: p.name || "Event Decoration",
    badge: p.badge,
    price: typeof p.price === "number" ? p.price : undefined,
    originalPrice: typeof p.originalPrice === "number" ? p.originalPrice : undefined,
    popularity: Number(p.popularity || 0),
  };
}

function fallbackRail(prefix, items = FALLBACK_ITEMS) {
  return items.map((item, i) => ({
    ...item,
    id: prefix + "-" + item.id,
    href: "/packages",
    img: item.image,
    popularity: 100 - i,
  }));
}

function HomeHero() {
  return (
    <section className="video-home-hero">
      <div className="video-home-hero-bg">
        <img src={IMAGES.heroCompactHome} alt="Beautiful event decoration" onError={onImgError} />
      </div>
      <div className="video-home-hero-overlay" />
      <div className="video-home-hero-copy container">
        <span className="video-home-kicker">NEXT LEVEL EVENTS</span>
        <h1>Beautiful celebrations.<br /><strong>Made for your moment.</strong></h1>
        <p>Explore birthday, anniversary, baby shower and wedding decorations.</p>
        <Link to="/shop-by-occasion" className="video-home-hero-btn">Explore Decorations</Link>
      </div>
      <div className="video-home-hero-dots" aria-hidden="true"><i /><i className="active" /><i /><i /></div>
    </section>
  );
}

function CategoryStrip() {
  return (
    <section className="video-home-category-section">
      <div className="container">
        <div className="video-home-section-head">
          <div>
            <h2>Shop by Occasion</h2>
          </div>
          <Link to="/shop-by-occasion">See all</Link>
        </div>
        <div className="video-home-category-strip">
          {HOME_CATEGORIES.map((category) => (
            <Link className="video-home-category-card" to={category.href} key={category.label}>
              <span className="video-home-category-image"><img src={category.img} alt={category.label} onError={onImgError} /></span>
              <span>{category.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function PromoBanner({ image, eyebrow, title, text, href = "/book-event" }) {
  return (
    <div className="video-home-promo">
      <img src={image} alt="Event decoration promotion" onError={onImgError} />
      <div className="video-home-promo-copy">
        <span>{eyebrow}</span>
        <h3>{title}</h3>
        <p>{text}</p>
        <Link to={href}>Book now</Link>
      </div>
    </div>
  );
}

export default function Home() {
  usePageMeta(
    "Next Level Events — Event Decoration & Planning",
    "Explore birthday, anniversary, baby shower, kids birthday and wedding decoration packages from Next Level Events."
  );

  const products = useLiveProducts();
  const { city } = useCity();

  const live = useMemo(() => (Array.isArray(products) ? products.map(normalizeProduct) : []), [products]);

  const trending = useMemo(() => {
    const items = [...live].sort((a, b) => b.popularity - a.popularity).slice(0, 6);
    return items.length >= 4 ? items : fallbackRail("trending");
  }, [live]);

  const birthday = useMemo(() => {
    const items = live.filter((p) => /birthday|balloon|kids|dinosaur|barbie|princess|theme/i.test(p.name)).slice(0, 8);
    return items.length >= 4 ? items : fallbackRail("birthday", FALLBACK_ITEMS.slice(0, 4));
  }, [live]);

  const anniversary = useMemo(() => {
    const items = live.filter((p) => /anniversary|romantic|proposal|couple|love/i.test(p.name)).slice(0, 8);
    return items.length >= 4 ? items : fallbackRail("anniversary", [FALLBACK_ITEMS[3], FALLBACK_ITEMS[0], FALLBACK_ITEMS[4], FALLBACK_ITEMS[2]]);
  }, [live]);

  const babyShower = useMemo(() => {
    const items = live.filter((p) => /baby|shower|newborn|welcome|naming/i.test(p.name)).slice(0, 8);
    return items.length >= 4 ? items : fallbackRail("baby", [FALLBACK_ITEMS[2], FALLBACK_ITEMS[1], FALLBACK_ITEMS[0], FALLBACK_ITEMS[4]]);
  }, [live]);

  const carBoot = useMemo(() => {
    const items = live.filter((p) => /car|boot|surprise|proposal/i.test(p.name)).slice(0, 8);
    return items.length >= 4 ? items : fallbackRail("car", [FALLBACK_ITEMS[3], FALLBACK_ITEMS[0], FALLBACK_ITEMS[2], FALLBACK_ITEMS[4]]);
  }, [live]);

  return (
    <main className="video-home">
      <HomeHero />
      <HomeStats />
      <CategoryStrip />

      <ProductRail title="Birthday Balloon Decoration" viewAllHref="/occasion/birthday" items={trending} />
      <ProductRail title="Kids Special" viewAllHref="/occasion/birthday/kids-birthday" items={birthday} tone="surface" />
      <ProductRail title="Romantic Anniversary Decoration" viewAllHref="/occasion/anniversary" items={anniversary} />

      <section className="video-home-banner-section">
        <div className="container">
          <PromoBanner
            image={IMAGES.promo4}
            eyebrow="Kids' Birthday Activities"
            title="Make the party unforgettable"
            text="Clown, magician, face painting and fun activities for kids."
            href="/book-event"
          />
        </div>
      </section>

      <ProductRail title="Baby Shower Packages" viewAllHref="/occasion/baby-shower" items={babyShower} tone="surface" />
      <ProductRail title="Car Boot Surprise Decorations" viewAllHref="/shop-by-occasion" items={carBoot} />

      <ShortsRail />
      <CustomerReviews />
      <VideoReviewGrid />
      <HomeTrustSections />

      {/* Keep the city/pricing context available to the storefront without changing the reference layout. */}
      <div className="video-home-city-note" aria-hidden="true">
        {city && fmtINR(cityPrice(0, city)) === "₹0" ? null : null}
      </div>
    </main>
  );
}
