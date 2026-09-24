import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { IMAGES, waLink } from "../data/images";
import usePageMeta from "../hooks/usePageMeta";
import { addonsFor } from "../data/addons";
import { BIRTHDAY_AGE_CATEGORIES } from "../data/birthdayAgeCategories";
import { birthdayThemeLinks } from "../data/occasions";


const SERVICES = [
  ["Decor", "Themes & Setups", "✧", IMAGES.typeDecor],
  ["Entry", "Grand & Unique", "♢", IMAGES.showcase4],
  ["Entertainment", "Artists, DJs, Games", "♫", IMAGES.galConcert2],
  ["Photography", "Capture Every Moment", "◉", IMAGES.typePhotography],
  ["Catering", "Delicious Food", "⌂", IMAGES.typeCatering],
  ["Return Gifts", "Customized Gifts", "✦", IMAGES.themeBalloonCelebration],
  ["Venue Setup", "Indoor / Outdoor", "⌖", IMAGES.showcase1],
  ["Planning & Coordination", "Hassle Free", "◷", IMAGES.showcase2],
];

const THEMES = [
  ["Cocomelon Theme", IMAGES.themeBalloonCelebration],
  ["Jungle Theme", IMAGES.themeJungleLeaves],
  ["Princess Theme", IMAGES.themeTiaraCrown],
  ["Superhero Theme", IMAGES.pkgBirthdayBash],
  ["Unicorn Theme", IMAGES.themePony],
  ["Cars Theme", IMAGES.pkgBirthdayBash],
  ["Dinosaur Theme", IMAGES.themeDinosaurToy],
  ["Golden Glam", IMAGES.pkgPremiumBirthday],
];

const PACKAGES = [
  {
    name: "Basic Birthday Package",
    image: IMAGES.pkgBirthdayBash,
    price: "₹15,000",
    subtitle: "A simple, beautiful setup for a memorable celebration.",
    includes: ["Theme Based Decor", "Basic Props", "Balloon Setup", "Setup & Dismantle"],
  },
  {
    name: "Standard Birthday Package",
    image: IMAGES.themeJungleLeaves,
    price: "₹35,000",
    subtitle: "A complete themed celebration with the essentials covered.",
    includes: ["Custom Theme Decor", "Entry Setup", "Photobooth", "Basic Entertainment", "Setup & Dismantle"],
  },
  {
    name: "Premium Birthday Package",
    image: IMAGES.pkgPremiumBirthday,
    price: "₹75,000",
    subtitle: "Premium styling and entertainment for a standout party.",
    includes: ["Unique & Premium Theme", "Grand Entry", "Entertainment (DJ / Artist)", "Photography", "Complete Event Management"],
  },
  {
    name: "Luxury Birthday Package",
    image: IMAGES.showcase1,
    price: "₹1,50,000",
    subtitle: "A fully managed birthday experience with bespoke details.",
    includes: ["Bespoke Theme Design", "Premium Props & Setup", "Live Entertainment", "Photography & Videography", "Full Event Planning"],
  },
];

const MOMENTS = [
  ["Kids Birthday Magic", IMAGES.galBirthday1, false],
  ["Themed Celebration", IMAGES.galBirthday2, true],
  ["Balloon & Cake Setup", IMAGES.galBirthday3, false],
  ["Premium Party Decor", IMAGES.showcase1, false],
  ["Fun & Entertainment", IMAGES.showcase6, true],
  ["Milestone Celebration", IMAGES.showcase8, false],
];

const REVIEWS = [
  { name: "Neha Gupta", city: "Ranchi", quote: "The birthday setup looked even better than we imagined. Every little detail was beautifully handled.", image: IMAGES.galBirthday1 },
  { name: "Rohit & Family", city: "Ranchi", quote: "From the theme to the entertainment, everything was smooth and stress-free. The kids absolutely loved it!", image: IMAGES.galBirthday2 },
  { name: "Ananya Sharma", city: "Ranchi", quote: "Creative, punctual and professional. They turned a simple birthday into a celebration everyone remembered.", image: IMAGES.galBirthday3 },
];

function SectionHead({ eyebrow, title, link }) {
  return (
    <div className="birthday-section-head">
      <div>
        {eyebrow && <span>{eyebrow}</span>}
        <h2>{title}</h2>
      </div>
      {link && <Link to={link.href}>{link.label} <b>→</b></Link>}
    </div>
  );
}

function Rail({ children, className = "" }) {
  return <div className={`birthday-rail ${className}`}>{children}</div>;
}

function BirthdayHero() {
  return (
    <section className="birthday-hero">
      <img src={IMAGES.heroBirthday} alt="Birthday celebration by Next Level Events" fetchPriority="high" decoding="async" />
      <div className="birthday-hero-overlay" />
      <div className="birthday-container birthday-hero-content">
        <span>OUR BIRTHDAY COLLECTION</span>
        <h1>Make Birthdays <em>Extra Special</em></h1>
        <p>Unique themes, creative setups and unforgettable celebrations for your little ones and loved ones.</p>
        <div className="birthday-actions">
          <Link to="/book-event" className="birthday-gold-btn">Plan a Birthday <b>→</b></Link>
          <Link to="/gallery" className="birthday-outline-btn">View Our Work</Link>
        </div>
        <div className="birthday-hero-features">
          <span><i>✧</i>Custom Themes</span>
          <span><i>☺</i>Kids & Adult Parties</span>
          <span><i>☆</i>Creative Props</span>
          <span><i>♡</i>Memorable Experiences</span>
        </div>
      </div>
    </section>
  );
}

function BirthdayCategories() {
  const [categories, setCategories] = useState(BIRTHDAY_AGE_CATEGORIES);

  useEffect(() => {
    let cancelled = false;
    const loadLiveCategories = () =>
      import("../lib/catalogStore")
        .then(({ getBirthdayAgeCategories }) => {
          if (!cancelled) setCategories(getBirthdayAgeCategories());
        })
        .catch(() => {});

    const schedule = () => {
      if ("requestIdleCallback" in window) {
        window.requestIdleCallback(loadLiveCategories, { timeout: 5000 });
      } else {
        window.setTimeout(loadLiveCategories, 1200);
      }
    };
    schedule();
    window.addEventListener("nle-catalog-updated", loadLiveCategories);
    return () => {
      cancelled = true;
      window.removeEventListener("nle-catalog-updated", loadLiveCategories);
    };
  }, []);

  const visibleCategories = categories.filter((item) => item.active !== false);

  return (
    <section className="birthday-white-section">
      <div className="birthday-container">
        <SectionHead eyebrow="BIRTHDAY CELEBRATIONS" title="Birthday Celebrations for Every Age" />
        <p className="birthday-intro">From kids' theme parties to milestone celebrations, we bring your ideas to life.</p>
        <Rail>
          {visibleCategories.map((item) => (
            <Link to={item.href} className="birthday-category-card" key={item.id} onPointerEnter={() => import("./OccasionBrowser").catch(() => {})} onFocus={() => import("./OccasionBrowser").catch(() => {})}>
              <img src={item.image} alt={item.title} loading="lazy" decoding="async" />
              <strong>{item.title}</strong>
              <span>{item.subtitle}</span>
              <b>→</b>
            </Link>
          ))}
        </Rail>
      </div>
    </section>
  );
}

function BirthdayServices() {
  const [services, setServices] = useState(() => addonsFor([{ slug: "birthday" }]));
  useEffect(() => {
    let cancelled = false;
    const refresh = () =>
      import("../lib/catalogStore")
        .then(({ getAddonsForOccasion }) => {
          if (!cancelled) setServices(getAddonsForOccasion("birthday"));
        })
        .catch(() => {});
    const schedule = () => {
      if ("requestIdleCallback" in window) {
        window.requestIdleCallback(refresh, { timeout: 5000 });
      } else {
        window.setTimeout(refresh, 1200);
      }
    };
    schedule();
    window.addEventListener("nle-catalog-updated", refresh);
    return () => {
      cancelled = true;
      window.removeEventListener("nle-catalog-updated", refresh);
    };
  }, []);
  const items = services.length ? services.map((service, i) => [service.label, service.subLabel, service.image || SERVICES[i % SERVICES.length]?.[3]]) : SERVICES;
  return (
    <section className="birthday-light-section">
      <div className="birthday-container">
        <SectionHead eyebrow="OUR BIRTHDAY SERVICES" title="Everything You Need for a Perfect Birthday" link={{ label: "View All Services", href: "/occasion/event-services" }} />
        <p className="birthday-intro">From first idea to the final photo, our team takes care of the details.</p>
        <div className="birthday-services-grid">
          {items.map(([title, sub, image]) => (
            <Link to="/occasion/event-services" className="birthday-service-card" key={title}>
              <div className="birthday-service-icon">✦</div>
              <strong>{title}</strong>
              <span>{sub}</span>
              <img src={image} alt="" loading="lazy" decoding="async" />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function PopularThemes() {
  const [liveThemes, setLiveThemes] = useState(() => birthdayThemeLinks());

  useEffect(() => {
    let cancelled = false;
    const refresh = () => {
      if (!cancelled) {
        const next = birthdayThemeLinks();
        if (next.length) setLiveThemes(next);
      }
    };
    const schedule = () => {
      if ("requestIdleCallback" in window) {
        window.requestIdleCallback(refresh, { timeout: 4000 });
      } else {
        window.setTimeout(refresh, 800);
      }
    };
    schedule();
    window.addEventListener("nle-catalog-updated", refresh);
    return () => {
      cancelled = true;
      window.removeEventListener("nle-catalog-updated", refresh);
    };
  }, []);

  const themes = liveThemes.length
    ? liveThemes.map((item) => [item.label, item.image, item.href])
    : THEMES.map(([title, image]) => [title, image, "/occasion/birthday"]);

  return (
    <section className="birthday-white-section">
      <div className="birthday-container">
        <SectionHead eyebrow="POPULAR BIRTHDAY THEMES" title="Themes They’ll Love" link={{ label: "View All Themes", href: "/occasion/birthday" }} />
        <p className="birthday-intro">Explore our most-loved themes for kids and adults.</p>
        <Rail className="birthday-theme-rail">
          {themes.map(([title, image, href]) => (
            <Link to={href} className="birthday-theme-card" key={href + title}>
              <img src={image} alt={title} loading="lazy" decoding="async" />
              <strong>{title}</strong>
              <b>→</b>
            </Link>
          ))}
        </Rail>
      </div>
    </section>
  );
}

function BirthdayPackages() {
  const [index, setIndex] = useState(0);
  const active = PACKAGES[index];
  const move = (delta) => setIndex((value) => (value + delta + PACKAGES.length) % PACKAGES.length);

  return (
    <section className="birthday-package-section">
      <div className="birthday-container">
        <SectionHead eyebrow="HANDPICKED BIRTHDAY PACKAGES" title="Ready-to-Celebrate Packages" link={{ label: "View All Packages", href: "/packages" }} />
        <p className="birthday-intro">Choose a package and let our team handle the setup, styling and coordination.</p>
        <div className="birthday-package-slider">
          <button type="button" className="birthday-slider-arrow" onClick={() => move(-1)} aria-label="Previous package">←</button>
          <article className="birthday-package-card">
            <div className="birthday-package-image">
              <img src={active.image} alt={active.name} loading="lazy" decoding="async" />
              <span>{index + 1} / {PACKAGES.length}</span>
            </div>
            <div className="birthday-package-copy">
              <span className="birthday-kicker">BIRTHDAY EXPERIENCE</span>
              <h3>{active.name}</h3>
              <p>{active.subtitle}</p>
              <strong className="birthday-price">{active.price} <small>Starting from</small></strong>
              <ul>{active.includes.map((item) => <li key={item}>✓ {item}</li>)}</ul>
              <div className="birthday-package-actions">
                <Link to="/packages" className="birthday-gold-btn">View Package <b>→</b></Link>
                <Link to="/book-event" className="birthday-text-btn">Enquire Now</Link>
              </div>
            </div>
          </article>
          <button type="button" className="birthday-slider-arrow" onClick={() => move(1)} aria-label="Next package">→</button>
        </div>
      </div>
    </section>
  );
}

function BirthdayMoments() {
  return (
    <section className="birthday-white-section">
      <div className="birthday-container">
        <SectionHead eyebrow="REAL BIRTHDAY MOMENTS" title="Celebrations We've Had the Honour to Create" link={{ label: "View Full Gallery", href: "/gallery" }} />
        <Rail className="birthday-moments-rail">
          {MOMENTS.map(([title, image, video]) => (
            <Link to="/gallery" className="birthday-moment-card" key={title}>
              <img src={image} alt={title} loading="lazy" decoding="async" />
              {video && <span className="birthday-play">▶</span>}
              <strong>{title}</strong>
            </Link>
          ))}
        </Rail>
      </div>
    </section>
  );
}

function BirthdayReviews() {
  return (
    <section className="birthday-review-section">
      <div className="birthday-container">
        <SectionHead eyebrow="WHAT OUR CLIENTS SAY" title="Real Stories. Real Celebrations." link={{ label: "View All Reviews", href: "/about" }} />
        <div className="birthday-review-grid">
          {REVIEWS.map((review) => (
            <article className="birthday-review-card" key={review.name}>
              <img src={review.image} alt="" loading="lazy" decoding="async" />
              <div>
                <strong>{review.name}</strong>
                <span>{review.city}</span>
                <div className="birthday-stars" aria-label="5 star review">★★★★★</div>
              </div>
              <p>“{review.quote}”</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function BirthdayCTA() {
  return (
    <section className="birthday-final-cta">
      <img src={IMAGES.galBirthday3} alt="Birthday celebration setup" loading="lazy" decoding="async" />
      <div className="birthday-final-overlay" />
      <div className="birthday-container birthday-final-content">
        <span>LET'S PLAN A MAGICAL BIRTHDAY</span>
        <h2>Let’s Plan a <em>Magical Birthday</em></h2>
        <p>Tell us your ideas and we'll take care of the rest — from creative themes and décor to entertainment and on-time execution.</p>
        <div className="birthday-actions">
          <Link to="/book-event" className="birthday-gold-btn">Get a Free Consultation <b>→</b></Link>
          <a href={waLink("Hi Next Level Events! I would like to plan a birthday celebration.")} className="birthday-outline-btn">Chat on WhatsApp</a>
        </div>
        <div className="birthday-usp-row">
          <span>✧ Creative Themes</span><span>♢ Skilled Team</span><span>◷ On-Time Setup</span><span>✦ End-to-End Support</span>
        </div>
      </div>
    </section>
  );
}

export default function Birthday() {
  usePageMeta("Birthday — Next Level Events", "Birthday planning, themed décor, entertainment, photography and complete birthday event management.");
  useEffect(() => window.scrollTo(0, 0), []);

  return (
    <main className="birthday-page">
      <BirthdayHero />
      <BirthdayCategories />
      <BirthdayServices />
      <PopularThemes />
      <BirthdayPackages />
      <BirthdayMoments />
      <BirthdayReviews />
      <BirthdayCTA />
    </main>
  );
}
