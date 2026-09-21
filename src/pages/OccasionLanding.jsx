import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { IMAGES } from "../data/images";
import usePageMeta from "../hooks/usePageMeta";
import ProductCard from "../components/occasion/ProductCard";
import { useLiveEntries, useLiveProducts } from "../hooks/useLiveCatalog";
import { pathFor, sortProducts } from "../data/occasions";

const ICONS = ["✧", "♢", "♫", "◉", "⌂", "✦", "⌖", "◷", "◇", "◎"];

const CONFIGS = {
  anniversary: {
    meta: ["Anniversary — Next Level Events", "Anniversary planning, romantic décor, milestone celebrations, surprise setups and complete event management."],
    hero: { eyebrow: "CELEBRATE YOUR JOURNEY", title: <>Anniversary <em>Moments That Last Forever</em></>, text: "Because every love story deserves a beautiful celebration.", image: IMAGES.typeAnniversary, primary: "Plan Your Anniversary", secondary: "Watch Our Story", stats: [["500+", "Anniversary Celebrations"], ["100%", "Happy Couples"], ["Memories", "That Last a Lifetime"], ["Ranchi, Jharkhand", "& Beyond"]] },
    tabs: ["All Anniversaries", "1st Anniversary", "5th Anniversary", "10th Anniversary", "25th Anniversary", "50th Anniversary", "Romantic Anniversary", "Anniversary Surprise"],
    tabsImages: [IMAGES.typeAnniversary, IMAGES.showcase8, IMAGES.showcase1, IMAGES.showcase2, IMAGES.pkgPremiumBirthday, IMAGES.showcase4, IMAGES.galWedding2, IMAGES.showcase8],
    intro: ["CHOOSE YOUR CELEBRATION", "Anniversary Celebrations", "Different milestones. Same beautiful feeling. Choose your special day and let us create an unforgettable celebration for you."],
    servicesTitle: "Complete Anniversary Solutions",
    servicesIntro: "From intimate dinners to grand celebrations, we handle every detail so you can focus on what truly matters — each other.",
    services: [["Decor & Setups", "Romantic styling", IMAGES.typeDecor], ["Candlelight & Ambience", "Warm, intimate setups", IMAGES.showcase8], ["Photography & Videography", "Capture every emotion", IMAGES.typePhotography], ["Catering", "Dinner & celebration", IMAGES.typeCatering], ["Entertainment", "Music & live experiences", IMAGES.galConcert2], ["Venue Selection", "Indoor & outdoor", IMAGES.showcase2], ["Personalized Elements", "Custom details", IMAGES.themeBalloonCelebration], ["Special Experiences", "Make it unforgettable", IMAGES.showcase1]],
    packagesTitle: "Featured Anniversary Packages", packagesIntro: "Carefully curated packages for every kind of love story.",
    packages: [
      ["Essential Package", "Beautiful celebrations with all the essentials.", IMAGES.showcase8, "Starting from ₹25,000"],
      ["Premium Package", "Enhanced décor and experiences for a memorable celebration.", IMAGES.pkgPremiumBirthday, "Starting from ₹55,000"],
      ["Luxury Package", "For larger celebrations with premium experiences.", IMAGES.showcase1, "Starting from ₹1,00,000"],
    ],
    momentsTitle: "Real Celebrations. Real Emotions.", moments: [["Love Celebration", IMAGES.showcase8], ["Romantic Entry", IMAGES.showcase2], ["Dinner Under Lights", IMAGES.showcase1], ["Milestone Night", IMAGES.pkgPremiumBirthday], ["25th Anniversary", IMAGES.showcase4], ["Couple Moments", IMAGES.galWedding2]],
    review: { quote: "Thank you Next Level Events for making our anniversary so special. It was beyond our expectations.", name: "A Happy Couple" },
    cta: ["LET'S CELEBRATE YOUR STORY", "Let’s Plan Your Next Anniversary", "Tell us your story and we’ll turn it into a beautiful celebration."]
  },
  festivals: {
    meta: ["Festivals & Other Celebrations — Next Level Events", "Festive décor, cultural celebrations and special occasion event planning."],
    hero: { eyebrow: "CELEBRATE EVERY OCCASION", title: <>Festivals & <em>Other Celebrations</em></>, text: "From festive joy to life's special moments, we create celebrations that bring people closer.", image: IMAGES.heroFestival, primary: "Plan Your Celebration", secondary: "Watch Our Story" },
    intro: ["POPULAR FESTIVALS", "Choose Your Festival Celebration", "Let’s make your favourite festivals even more special with beautiful setups and memorable experiences."],
    festivals: [["Diwali", "Lights. Happiness. Togetherness.", IMAGES.typeFestival], ["Holi", "Colours. Joy. Celebration.", IMAGES.themeHoliColors], ["Christmas", "Joy. Sharing. Magic.", IMAGES.showcase7], ["New Year", "New Beginnings. Grand Celebrations.", IMAGES.galConcert1], ["Navratri", "Devotion. Dance. Dandiya Nights.", IMAGES.showcase8], ["Eid", "Faith. Togetherness. Blessings.", IMAGES.showcase5], ["Other Festivals", "Every Festival Matters.", IMAGES.themeBalloonArch]],
    other: [["Housewarming", "New Home. New Beginnings.", IMAGES.showcase2], ["Religious Events", "Faith Brings Us Together.", IMAGES.showcase5], ["Get Together", "Friends. Fun. Memories.", IMAGES.showcase1], ["Farewell", "New Journeys. Cherished Moments.", IMAGES.themeStageLights], ["Reunion", "Reconnect. Relive. Celebrate.", IMAGES.galCorporate3], ["Custom Event", "Tell Us Your Idea.", IMAGES.showcase4]],
    servicesTitle: "Complete Event Solutions", servicesIntro: "From planning to execution, we handle every detail so you can simply enjoy the celebration.",
    services: [["Decor & Setups", "Theme and styling", IMAGES.typeDecor], ["Lighting & Ambience", "Create the mood", IMAGES.showcase8], ["Catering", "Food & hospitality", IMAGES.typeCatering], ["Entertainment", "Music & artists", IMAGES.galConcert2], ["Photography & Videography", "Capture the moments", IMAGES.typePhotography], ["Themed Elements", "Custom festival details", IMAGES.themeHoliColors], ["Logistics & Support", "Smooth execution", IMAGES.showcase2]],
    gallery: [["Diwali", IMAGES.typeFestival], ["Holi", IMAGES.themeHoliColors], ["Christmas", IMAGES.showcase7], ["New Year", IMAGES.galConcert1], ["Festive Setup", IMAGES.showcase8], ["Cultural Celebration", IMAGES.showcase5]],
    cta: ["LET'S CREATE SOMETHING SPECIAL", "Let’s Create Your Next Celebration Together", "Share your ideas with us, and we’ll turn them into beautiful memories."]
  },
  family: {
    meta: ["Kids & Family Events — Next Level Events", "Baby showers, Annaprashan, Mundan, naming ceremonies and family celebrations."],
    hero: { eyebrow: "LITTLE MOMENTS. BIG MEMORIES.", title: <>Kids & Family <em>Events</em></>, text: "Celebrations designed for your family's most special milestones.", image: IMAGES.heroBirthday, primary: "Plan Your Celebration", secondary: "Watch Our Story", stats: [["500+", "Family Celebrations"], ["100%", "Happy Families"], ["Memories", "That Last a Lifetime"], ["Ranchi, Jharkhand", "& Beyond"]] },
    intro: ["CHOOSE YOUR CELEBRATION", "Family Celebration", "From the joy of a new beginning to cherished family traditions, we make every moment special with thoughtful planning and beautiful execution."],
    family: [["Baby Shower", "Celebrate the journey to parenthood with love and joy.", IMAGES.typeBabyShower], ["Annaprashan", "Mark the first step towards a healthy and happy future.", IMAGES.typeAnnaprashan], ["Mundan Ceremony", "A sacred tradition, beautifully celebrated.", IMAGES.showcase5], ["Naming Ceremony", "A special occasion to announce a lifetime of happiness.", IMAGES.typeNewbornWelcome]],
    servicesTitle: "Complete Family Event Solutions", servicesIntro: "We take care of everything, so you can focus on what truly matters — being with your loved ones.",
    services: [["Decor & Setups", "Beautiful themes", IMAGES.typeDecor], ["Grand Entry", "Warm welcomes", IMAGES.showcase4], ["Photography & Videography", "Capture every milestone", IMAGES.typePhotography], ["Catering", "Delicious food", IMAGES.typeCatering], ["Entertainment", "Music and activities", IMAGES.galConcert2], ["Kids Activities", "Fun for little guests", IMAGES.themeBalloonCelebration], ["Special Experiences", "Personal touches", IMAGES.showcase1]],
    packagesTitle: "Featured Family Celebration Packages", packagesIntro: "Curated packages for stress-free and memorable celebrations.",
    packages: [["Essential Package", "Beautiful celebrations with essentials covered.", IMAGES.typeBabyShower, "Starting from ₹25,000"], ["Premium Package", "Enhanced décor and experiences for a memorable event.", IMAGES.showcase1, "Starting from ₹55,000"], ["Luxury Package", "Bigger, grander and truly unforgettable celebrations.", IMAGES.showcase4, "Starting from ₹1,00,000"]],
    momentsTitle: "Real Celebrations. Real Happiness.", moments: [["Baby Shower", IMAGES.typeBabyShower], ["Family Celebration", IMAGES.showcase1], ["Naming Ceremony", IMAGES.typeNewbornWelcome], ["Little Moments", IMAGES.themeBalloonCelebration], ["Beautiful Setup", IMAGES.showcase2]],
    review: { quote: "Thank you Next Level Events for making our special day so beautiful and stress-free!", name: "A Happy Family" },
    cta: ["LET'S CREATE FAMILY MEMORIES", "Let’s Plan Your Next Family Celebration", "Tell us what you’re celebrating and we’ll take care of the details."]
  },
  corporate: {
    meta: ["Corporate Events — Next Level Events", "Professional corporate event planning for launches, conferences, exhibitions, employee events and brand experiences."],
    hero: { eyebrow: "IDEAS | PEOPLE | EXPERIENCES | GROWTH", title: <>Corporate <em>Events</em></>, text: "Professional Events. Powerful Experiences.\nFrom product launches to annual celebrations, we plan and execute corporate events that reflect your brand, engage your audience and create lasting impact.", image: IMAGES.heroCorporate, primary: "Plan Your Corporate Event", secondary: "Watch Our Corporate Reel", stats: [["500+", "Corporate Events"], ["200+", "Happy Clients"], ["10+", "Years of Experience"], ["PAN India", "Event Execution"]] },
    intro: ["EXPLORE OUR", "Corporate Event Types", "Every business has a story. Choose your event type to explore themes, services and packages designed to bring your vision to life."],
    corporate: [["Annual Day", "Celebrate milestones with grandeur", IMAGES.galCorporate1], ["Product Launch", "Make your launch unforgettable", IMAGES.heroCorporate], ["Conference", "Ideas that inspire growth", IMAGES.galCorporate2], ["Exhibition", "Showcase. Connect. Grow.", IMAGES.showcase6], ["Awards Ceremony", "Recognize excellence in style", IMAGES.showcase1], ["Employee Engagement", "Stronger Teams. Brighter Futures", IMAGES.galCorporate3], ["Dealer / Partner Meet", "Build lasting relationships", IMAGES.showcase4], ["Corporate Party", "Work Hard. Celebrate Bigger!", IMAGES.themeStageLights], ["Seminar & Workshop", "Knowledge. Skills. Progress.", IMAGES.galCorporate2], ["Brand Activation", "Turn ideas into experiences", IMAGES.heroCorporate], ["Corporate Celebration", "Because Every Success Deserves a Celebration", IMAGES.showcase1]],
    servicesTitle: "Complete Corporate Event Solutions", servicesIntro: "From concept to execution, we manage the details that make professional events work.",
    services: [["Stage & Branding", "On-brand environments", IMAGES.heroCorporate], ["LED & AV Solutions", "Production and technology", IMAGES.galCorporate2], ["Corporate Decor", "Polished event styling", IMAGES.showcase1], ["Guest Management", "Seamless hospitality", IMAGES.showcase4], ["Entertainment", "Artists and experiences", IMAGES.themeStageLights], ["Photography & Videography", "Capture your event", IMAGES.typePhotography], ["Catering", "Professional hospitality", IMAGES.typeCatering], ["Special Effects", "Memorable moments", IMAGES.showcase6]],
    cta: ["IDEAS THAT ELEVATE BRANDS", "Let’s Plan Your Next Event", "Bring us your objective, audience and idea — we’ll build the experience around it."]
  }
};

function SectionHead({ eyebrow, title, text, link, dark = false }) {
  return <div className={`occasion-pro-head ${dark ? "is-dark" : ""}`}>
    <div><span>{eyebrow}</span><h2>{title}</h2></div>
    {text && <p>{text}</p>}
    {link && <Link to={link.href}>{link.label} <b>→</b></Link>}
  </div>;
}

function Hero({ config, type }) {
  return <section className={`occasion-pro-hero occasion-pro-${type}`}>
    <img src={config.image} alt="" fetchPriority="high" decoding="async" />
    <div className="occasion-pro-hero-overlay" />
    <div className="occasion-pro-container occasion-pro-hero-content">
      <span className="occasion-pro-eyebrow">{config.eyebrow}</span>
      <h1>{config.title}</h1>
      <p>{config.text}</p>
      <div className="occasion-pro-actions">
        <Link className="occasion-pro-gold" to="/book-event">{config.primary} <b>→</b></Link>
        <Link className="occasion-pro-watch" to="/gallery">◉ &nbsp;{config.secondary}</Link>
      </div>
      {config.stats && <div className="occasion-pro-stats">{config.stats.map(([big, small]) => <div key={big + small}><b>{big}</b><span>{small}</span></div>)}</div>}
      {!config.stats && <div className="occasion-pro-trust"><span>✧ Creative Setups</span><span>♧ Experienced Team</span><span>◇ Hassle-Free Planning</span><span>♡ Memorable Experiences</span></div>}
    </div>
  </section>;
}

function ImageCards({ items, className = "", large = false }) {
  return <div className={`occasion-pro-cards ${large ? "is-large" : ""} ${className}`}>
    {items.map(([title, text, image], i) => <Link className="occasion-pro-card" to="/book-event" key={title}>
      <div className="occasion-pro-card-img"><img src={image} alt="" loading="lazy" decoding="async" /><span>{ICONS[i % ICONS.length]}</span></div>
      <div className="occasion-pro-card-copy"><h3>{title}</h3>{text && <p>{text}</p>}<strong>Explore <b>→</b></strong></div>
    </Link>)}
  </div>;
}

function Services({ config }) {
  return <section className="occasion-pro-section occasion-pro-services"><div className="occasion-pro-container">
    <SectionHead eyebrow="OUR SERVICES" title={config.servicesTitle} text={config.servicesIntro} />
    <div className="occasion-pro-service-grid">{config.services.map(([name, sub, image], i) => <Link to="/services" className="occasion-pro-service" key={name}><span>{ICONS[i % ICONS.length]}</span><strong>{name}</strong><small>{sub}</small></Link>)}</div>
  </div></section>;
}

function Packages({ config }) {
  const [index, setIndex] = useState(0);
  if (!config.packages) return null;
  const active = config.packages[index];
  return <section className="occasion-pro-section occasion-pro-packages"><div className="occasion-pro-container occasion-pro-package-layout">
    <div className="occasion-pro-package-intro"><span>FEATURED</span><h2>{config.packagesTitle}</h2><p>{config.packagesIntro}</p><Link to="/packages" className="occasion-pro-gold">View All Packages <b>→</b></Link></div>
    <div className="occasion-pro-package-stage"><button onClick={() => setIndex((index - 1 + config.packages.length) % config.packages.length)} aria-label="Previous package">←</button><article><img src={active[2]} alt={active[0]} loading="lazy" /><div><h3>{active[0]}</h3><p>{active[1]}</p><strong>{active[3]}</strong><Link to="/packages">View Details →</Link></div></article><button onClick={() => setIndex((index + 1) % config.packages.length)} aria-label="Next package">→</button></div>
    <div className="occasion-pro-package-stats"><span>♧ <b>500+</b> Celebrations</span><span>◉ <b>100%</b> Happy Clients</span><span>◇ <b>Memories</b> That Last</span><span>⌖ <b>Ranchi, Jharkhand</b> & Beyond</span></div>
  </div></section>;
}

function FeaturedProducts({ type }) {
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

  const aliases = {
    anniversary: ["anniversary"],
    festivals: ["festivals-culture", "festivals", "festival"],
    family: ["kids-family", "kids", "family"],
    corporate: ["corporate"],
  };
  const wanted = aliases[type] || [type];
  const matches = (value) => wanted.includes(String(value || "").trim().toLowerCase());

  const entryProducts = entries
    .filter((entry) => matches(entry?.occasion?.slug))
    .filter((entry) => entry.product && !entry.product.isAddon && entry.product.status !== "archived")
    .map((entry) => entry.product);

  const catalogProducts = liveProducts
    .filter((product) => {
      if (!product || product.isAddon || product.status === "archived") return false;
      if (matches(product.occasionSlug) || matches(product.occasion)) return true;
      if (Array.isArray(product.categoryPath)) return product.categoryPath.some(matches);
      return matches(product.categoryPath);
    });

  const merged = [...entryProducts, ...catalogProducts];
  const products = sortProducts(merged, "popular").reduce((unique, product) => {
    const key = product.slug || product.id;
    if (key && !unique.some((item) => (item.slug || item.id) === key)) unique.push(product);
    return unique;
  }, []);

  const productEntries = products.map((product) => {
    const existing = entries.find(
      (entry) => entry.product && (entry.product.slug || entry.product.id) === (product.slug || product.id) && matches(entry?.occasion?.slug),
    );
    if (existing) return existing;
    return {
      product,
      trail: [
        { slug: wanted[0] },
        { slug: product.categorySlug || (Array.isArray(product.categoryPath) ? product.categoryPath[product.categoryPath.length - 1] : "packages") },
        product,
      ],
    };
  });

  const maxStart = Math.max(0, productEntries.length - visibleCount);
  const safeStart = Math.min(startIndex, maxStart);
  const gap = visibleCount === 1 ? 0 : 16;
  const translate = safeStart === 0
    ? "translateX(0)"
    : `translateX(calc(-${safeStart * (100 / visibleCount)}% - ${safeStart * (gap / visibleCount)}px))`;
  const move = (delta) => setStartIndex((value) => Math.max(0, Math.min(maxStart, value + delta)));

  const titles = {
    anniversary: ["FEATURED PRODUCTS", "Popular Anniversary Packages"],
    festivals: ["FEATURED PRODUCTS", "Popular Celebration Packages"],
    family: ["FEATURED PRODUCTS", "Popular Family Packages"],
    corporate: ["FEATURED PRODUCTS", "Popular Corporate Packages"],
  };
  const [eyebrow, title] = titles[type] || ["FEATURED PRODUCTS", "Popular Packages"];

  return (
    <section className={`occasion-pro-featured-section occasion-pro-featured-${type}`}>
      <div className="occasion-pro-container">
        <SectionHead eyebrow={eyebrow} title={title} link={{ label: "View All Packages", href: "/packages" }} />
        {productEntries.length > 0 ? (
          <div className="occasion-pro-featured-wrap">
            <button type="button" className="occasion-pro-featured-arrow prev" onClick={() => move(-1)} disabled={safeStart === 0} aria-label={`Previous ${type} package`}>←</button>
            <div className="occasion-pro-featured-viewport">
              <div className="occasion-pro-featured-track" style={{ transform: translate }}>
                {productEntries.map((entry) => (
                  <div className="occasion-pro-featured-slide" key={entry.product.id || entry.product.slug}>
                    <ProductCard product={entry.product} href={pathFor(entry.trail)} variant="occasion-market" />
                  </div>
                ))}
              </div>
            </div>
            <button type="button" className="occasion-pro-featured-arrow next" onClick={() => move(1)} disabled={safeStart >= maxStart} aria-label={`Next ${type} package`}>→</button>
          </div>
        ) : (
          <p className="occasion-pro-featured-empty">Featured packages will appear here as soon as they are added to the catalog.</p>
        )}
      </div>
    </section>
  );
}

function Moments({ config }) {
  if (!config.moments) return null;
  return <section className="occasion-pro-section occasion-pro-moments"><div className="occasion-pro-container">
    <div className="occasion-pro-moment-layout"><div><h2>{config.momentsTitle}</h2><Link to="/gallery">View Gallery →</Link></div><div className="occasion-pro-moment-rail">{config.moments.map(([name, image]) => <img key={name} src={image} alt={name} loading="lazy" decoding="async" />)}</div>{config.review && <blockquote><span>“</span><p>{config.review.quote}</p><footer>— {config.review.name} <b>♥</b></footer></blockquote>}</div>
  </div></section>;
}

function Review({ config }) {
  if (!config.review) return null;
  return <section className="occasion-pro-section occasion-pro-review"><div className="occasion-pro-container"><SectionHead eyebrow="WHAT OUR CLIENTS SAY" title="Real Stories. Real Celebrations." /><div className="occasion-pro-review-card"><div className="occasion-pro-stars">★★★★★</div><p>“{config.review.quote}”</p><strong>{config.review.name}</strong><span>Next Level Events Client</span></div></div></section>;
}

function Gallery({ config }) {
  if (!config.gallery) return null;
  return <section className="occasion-pro-section occasion-pro-gallery"><div className="occasion-pro-container"><SectionHead eyebrow="REAL MOMENTS" title="Our Celebration Gallery" link={{ label: "View All Gallery", href: "/gallery" }} /><div className="occasion-pro-gallery-grid">{config.gallery.map(([name, image]) => <img key={name} src={image} alt={name} loading="lazy" decoding="async" />)}</div></div></section>;
}

function CTA({ config, type }) {
  return <section className={`occasion-pro-cta occasion-pro-cta-${type}`}><img src={type === "corporate" ? IMAGES.heroCorporate : (type === "festivals" ? IMAGES.heroFestival : IMAGES.showcase1)} alt="" loading="lazy" /><div className="occasion-pro-cta-overlay"/><div className="occasion-pro-container"><span>{config.cta[0]}</span><h2>{config.cta[1]}</h2><p>{config.cta[2]}</p><Link className="occasion-pro-gold" to="/book-event">Enquire Now <b>→</b></Link></div></section>;
}

export default function OccasionLanding({ type }) {
  const config = CONFIGS[type] || CONFIGS.anniversary;
  usePageMeta(config.meta[0], config.meta[1]);
  useEffect(() => window.scrollTo(0, 0), []);

  return <main className={`occasion-pro-page occasion-pro-page-${type}`}>
    <Hero config={config.hero} type={type} />
    {config.tabs && <section className="occasion-pro-section occasion-pro-tabs"><div className="occasion-pro-container"><SectionHead eyebrow={config.intro[0]} title={config.intro[1]} text={config.intro[2]} /><div className="occasion-pro-tab-rail">{config.tabs.map((label, i) => <Link to="/book-event" key={label}><span>{ICONS[i % ICONS.length]}</span>{label}</Link>)}</div></div></section>}
    {config.festivals && <section className="occasion-pro-section occasion-pro-white"><div className="occasion-pro-container"><SectionHead eyebrow={config.intro[0]} title={config.intro[1]} text={config.intro[2]} /><ImageCards items={config.festivals} /></div></section>}
    {config.other && <section className="occasion-pro-section occasion-pro-soft"><div className="occasion-pro-container"><SectionHead eyebrow="BEYOND FESTIVALS" title="Other Special Occasions" text="Because every occasion, big or small, deserves a beautiful celebration." /><ImageCards items={config.other} /></div></section>}
    {config.family && <section className="occasion-pro-section occasion-pro-white"><div className="occasion-pro-container"><SectionHead eyebrow={config.intro[0]} title={config.intro[1]} text={config.intro[2]} /><ImageCards items={config.family} large /></div></section>}
    {config.corporate && <section className="occasion-pro-section occasion-pro-white"><div className="occasion-pro-container"><SectionHead eyebrow={config.intro[0]} title={config.intro[1]} text={config.intro[2]} link={{ label: "View All Corporate Events", href: "/occasion/corporate" }} /><ImageCards items={config.corporate} large /></div></section>}
    <Services config={config} />
    <Packages config={config} />
    <FeaturedProducts type={type} />
    <Gallery config={config} />
    <Moments config={config} />
    <Review config={config} />
    {type === "festivals" && <section className="occasion-pro-usp"><div className="occasion-pro-container"><span>WHY CHOOSE NEXT LEVEL EVENTS</span><div>{["Creative & Unique Setups", "Experienced Team", "End-to-End Management", "Personalized Experiences"].map((x, i) => <strong key={x}><b>{ICONS[i]}</b>{x}</strong>)}</div></div></section>}
    <CTA config={config} type={type} />
  </main>;
}
