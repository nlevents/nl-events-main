import { lazy, Suspense, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { IMAGES, waLink } from "../data/images";
import { GLOBAL_ADDONS } from "../data/addons";
import { onImgError } from "../lib/imageFallback";
import usePageMeta from "../hooks/usePageMeta";
const ShortsRail = lazy(() => import("../components/ShortsRail"));
const VideoReviewGrid = lazy(() => import("../components/VideoReviewGrid"));
import Faq from "../components/Faq";
import ProductRail from "../components/ProductRail";

const CELEBRATIONS = [
  { label: "Weddings", href: "/occasion/wedding", img: IMAGES.typeWedding },
  { label: "Birthdays", href: "/occasion/birthday", img: IMAGES.typeBirthday },
  { label: "Corporate Events", href: "/occasion/corporate", img: IMAGES.typeCorporate },
  { label: "Kids & Family Events", href: "/occasion/kids-family", img: IMAGES.typeBabyShower },
  { label: "Anniversary", href: "/occasion/anniversary", img: IMAGES.typeAnniversary },
  { label: "Festivals & Other Celebrations", href: "/occasion/festivals-culture", img: IMAGES.typeFestival },
];

const WEDDING_CONCEPTS = [
  { label: "Haldi", img: IMAGES.showcase1 },
  { label: "Mehendi", img: IMAGES.themeMehndiHenna },
  { label: "Sangeet", img: IMAGES.showcase3 },
  { label: "Wedding", img: IMAGES.galWedding1 },
  { label: "Reception", img: IMAGES.galWedding2 },
  { label: "Engagement", img: IMAGES.showcase4 },
  { label: "Mayra / Rituals", img: IMAGES.showcase5 },
];

const WEDDING_SERVICES = [
  { label: "Décor", sub: "Packages & elements", img: IMAGES.typeDecor },
  { label: "Entry", sub: "Grand & unique entries", img: IMAGES.showcase4 },
  { label: "Entertainment", sub: "Artists, DJ, live bands", img: IMAGES.galConcert2 },
  { label: "Sound & Technical", sub: "Lighting, AV, effects", img: IMAGES.themeStageLights },
  { label: "Tent & Furniture", sub: "Tents, seating, tables", img: IMAGES.showcase2 },
  { label: "Photography & Videography", sub: "Capture every moment", img: IMAGES.typePhotography },
  { label: "Catering", sub: "Delicious food experiences", img: IMAGES.typeCatering },
  { label: "Baraat / Procession", sub: "Make an unforgettable entry", img: IMAGES.themeStageLights },
];

const BIRTHDAY_THEMES = [
  { label: "Jungle", img: IMAGES.themeJungleLeaves },
  { label: "Cocomelon", img: IMAGES.typeKidsBirthday },
  { label: "Fairy", img: IMAGES.themeTiaraCrown },
  { label: "Superhero", img: IMAGES.heroBirthday },
  { label: "Barbie", img: IMAGES.themePony },
  { label: "Frozen", img: IMAGES.heroBirthday },
  { label: "And Many More!", img: IMAGES.themeBalloonCelebration },
];

const RECENT_WORK = [
  { category: "Weddings", label: "Royal Wedding", img: IMAGES.galWedding1 },
  { category: "Weddings", label: "Reception Night", img: IMAGES.galWedding2 },
  { category: "Birthdays", label: "Kids Birthday", img: IMAGES.galBirthday1 },
  { category: "Birthdays", label: "Balloon Celebration", img: IMAGES.galBirthday2 },
  { category: "Corporate", label: "Success Together", img: IMAGES.galCorporate1 },
  { category: "Corporate", label: "Corporate Launch", img: IMAGES.galCorporate2 },
  { category: "Kids", label: "Jungle Theme", img: IMAGES.themeJungleLeaves },
  { category: "Kids", label: "Princess Theme", img: IMAGES.themeTiaraCrown },
  { category: "Other Events", label: "Outdoor Celebration", img: IMAGES.showcase4 },
  { category: "Other Events", label: "Festive Evening", img: IMAGES.galDecor3 },
];

const RECENT_FILTERS = ["All", "Weddings", "Birthdays", "Corporate", "Kids", "Other Events"];


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

const HOME_USPS = [
  ["✦", "Creative Themes & Concepts", "Unique ideas for every occasion."],
  ["◉", "Experienced Team", "Passionate professionals who manage every detail."],
  ["◎", "End-to-End Support", "From planning to execution, one trusted team."],
  ["◇", "Premium Quality", "We never compromise on the details."],
  ["♢", "Personalized Planning", "Tailored to your needs and budget."],
  ["✓", "One Point Solution", "All services under one roof."],
];

function HomeHero() {
  return (
    <section className="ref-home-hero">
      <img src={IMAGES.heroHome} alt="Wedding celebration by Next Level Events" fetchPriority="high" decoding="async" />
      <div className="ref-home-hero-overlay" />
      <div className="ref-home-hero-content">
        <span>WELCOME TO NEXT LEVEL EVENTS</span>
        <h1>We Create <em>Experiences,</em><br />Not Just Events.</h1>
        <p>Weddings • Birthdays • Corporate • Celebrations</p>
        <small>From intimate gatherings to grand celebrations, we bring your vision to life with creativity, precision and passion.</small>
        <div className="ref-home-hero-actions">
          <Link to="/book-event" className="ref-home-gold-btn">Plan Your Event <b>→</b></Link>
          <Link to="/gallery" className="ref-home-outline-btn">◉ &nbsp;Explore Our Work</Link>
        </div>
        <div className="ref-home-hero-stats">
          <span><b>500+</b>Events Planned</span>
          <span><b>100%</b>Client Satisfaction</span>
          <span><b>6+ Years</b>of Experience</span>
          <span><b>End-to-End</b>Event Support</span>
        </div>
      </div>
    </section>
  );
}

function RefSectionHead({ eyebrow, title, link }) {
  return (
    <div className="ref-home-head">
      <div>
        {eyebrow && <span>{eyebrow}</span>}
        <h2>{title}</h2>
      </div>
      {link && <Link to={link.href}>{link.label} →</Link>}
    </div>
  );
}

function HorizontalCards({ items, cardClass = "ref-home-card", dark = false }) {
  return (
    <div className={`ref-home-slider ${dark ? "is-dark" : ""}`}>
      {items.map((item) => (
        <Link className={cardClass} to={item.href || "/book-event"} key={item.label}>
          <img src={item.img} alt={item.label} data-context={item.label} loading="lazy" decoding="async" onError={onImgError} />
          <strong>{item.label}</strong>
          {item.sub && <span>{item.sub}</span>}
        </Link>
      ))}
    </div>
  );
}

function CelebrationSection() {
  return (
    <section className="ref-home-celebrations">
      <div className="ref-home-container">
        <div className="ref-home-occasion-head">
          <h2>Shop by Occasion</h2>
          <Link to="/shop-by-occasion">SEE ALL</Link>
        </div>
        <div className="ref-home-celebration-grid">
          {CELEBRATIONS.map((item) => (
            <Link to={item.href} className="ref-home-celebration-card" key={item.label}>
              <span className="ref-home-celebration-image">
                <img src={item.img} alt={item.label} data-context={item.label} loading="lazy" decoding="async" onError={onImgError} />
              </span>
              <b>{item.label}</b>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function WeddingSection() {
  return (
    <>
      <section className="ref-home-dark-section">
        <div className="ref-home-container">
          <RefSectionHead eyebrow="THE WEDDING COLLECTION" title="Weddings, Beautifully Planned" link={{ label: "Explore wedding functions", href: "/occasion/wedding" }} />
          <p className="ref-home-dark-copy">From Haldi to the grand Reception, we design every function with unique themes, stunning décor and seamless execution.</p>
          <HorizontalCards items={WEDDING_CONCEPTS} cardClass="ref-home-concept-card" dark />
        </div>
      </section>

      <section className="ref-home-light-section">
        <div className="ref-home-container">
          <RefSectionHead title="Everything You Need for Your Event" link={{ label: "Explore all services", href: "/services" }} />
          <p className="ref-home-intro">One team. All your event needs. Hassle-free planning, stunning execution.</p>
          <HorizontalCards items={WEDDING_SERVICES} cardClass="ref-home-service-card" />
        </div>
      </section>
    </>
  );
}

function BirthdaySection() {
  return (
    <section className="ref-home-birthday">
      <div className="ref-home-container">
        <RefSectionHead title="A World of Imagination for Little Celebrations" link={{ label: "Explore kids birthday themes", href: "/occasion/birthday/kids-birthday" }} />
        <p className="ref-home-intro">Magical themes, joyful setups and unforgettable moments for your little one.</p>
        <HorizontalCards items={BIRTHDAY_THEMES} cardClass="ref-home-theme-card" />
      </div>
    </section>
  );
}

function PopularPackagesSection() {
  const [popularPackages, setPopularPackages] = useState([]);

  useEffect(() => {
    let active = true;
    import("../data/occasions").then(({ listAllProducts, sortProducts, toRailItem }) => {
      const entries = listAllProducts();
      const seen = new Set();
      const items = sortProducts(entries.map((entry) => entry.product), "popular")
        .filter((product) => {
          const key = product?.slug || product?.id;
          if (!key || seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .slice(0, 8)
        .map((product) => {
          const key = product?.slug || product?.id;
          const entry = entries.find((item) => (item?.product?.slug || item?.product?.id) === key);
          return entry ? toRailItem(product, entry.trail) : null;
        })
        .filter(Boolean);
      if (active) setPopularPackages(items);
    }).catch(() => {});
    return () => { active = false; };
  }, []);

  if (!popularPackages.length) return null;
  return (
    <ProductRail
      title="Popular Packages"
      viewAllHref="/packages"
      items={popularPackages}
    />
  );
}

function AddonsSection() {
  const items = GLOBAL_ADDONS.map((item) => ({
    ...item,
    // Service data stores the thumbnail as `image`, while the shared
    // HorizontalCards component reads `img`.
    img: item.image,
    sub: item.subLabel,
    href: item.href,
  }));

  return (
    <section className="ref-home-addons">
      <div className="ref-home-container">
        <RefSectionHead title="Services to Elevate Your Celebration" link={{ label: "Explore services", href: "/occasion/event-services" }} />
        <p className="ref-home-intro">Create more magical moments with our wide range of services.</p>
        <HorizontalCards items={items} cardClass="ref-home-addon-card" />
      </div>
    </section>
  );
}

function HomeUSPs() {
  return (
    <section className="ref-home-usp">
      <div className="ref-home-container">
        <RefSectionHead title="The Next Level Difference" />
        <p className="ref-home-dark-copy">Why clients trust us, again and again.</p>
        <div className="ref-home-usp-grid">
          {HOME_USPS.map(([icon, title, text]) => (
            <div key={title}><i>{icon}</i><b>{title}</b><span>{text}</span></div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="ref-home-final-cta">
      <img src={IMAGES.heroWedding} alt="" loading="lazy" decoding="async" />
      <div className="ref-home-final-overlay" />
      <div className="ref-home-container">
        <div>
          <span>LET'S CREATE SOMETHING MAGICAL</span>
          <h2>Tell Us Your Dream.<br /><em>We'll Take It to the Next Level.</em></h2>
          <p>Share your ideas, and let our team create an unforgettable experience for you.</p>
          <div className="ref-home-cta-actions">
            <Link to="/book-event" className="ref-home-gold-btn">Get a Free Consultation →</Link>
            <a href={waLink("Hi Next Level Events! I'd like a free consultation for my event.")} target="_blank" rel="noreferrer" className="ref-home-outline-btn">◉ &nbsp;WhatsApp Us</a>
          </div>
        </div>
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

function DeferredHomeContent({ children, rootMargin = "900px" }) {
  const [ready, setReady] = useState(false);
  const [node, setNode] = useState(null);

  useEffect(() => {
    if (!node) return;
    if (!("IntersectionObserver" in window)) {
      setReady(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setReady(true);
          observer.disconnect();
        }
      },
      { rootMargin, threshold: 0 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [node, rootMargin]);

  return (
    <div ref={setNode} style={{ display: "contents" }}>
      {ready ? <Suspense fallback={null}>{children}</Suspense> : null}
    </div>
  );
}

export default function Home() {
  usePageMeta(
    "Next Level Events — Event Planning, Weddings, Birthdays & Celebrations",
    "Plan weddings, birthdays, corporate events and celebrations with Next Level Events."
  );

  return (
    <main className="video-home">
      <HomeHero />
      <CelebrationSection />
      <WeddingSection />
      <BirthdaySection />
      <PopularPackagesSection />
      <AddonsSection />
      <HomeUSPs />
      <FinalCTA />

      {/* Homepage media order is intentional: YouTube Shorts → Customer Reviews → Review Videos.
          Render these directly instead of observing a display:contents wrapper,
          so the media sections cannot be skipped by IntersectionObserver. */}
      <Suspense fallback={null}>
        <ShortsRail />
      </Suspense>
      <CustomerReviews />
      <Suspense fallback={null}>
        <VideoReviewGrid />
      </Suspense>
      <HomeTrustSections />
    </main>
  );
}
