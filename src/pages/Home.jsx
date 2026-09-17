import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { IMAGES } from "../data/images";
import { useLiveProducts } from "../hooks/useLiveCatalog";
import usePageMeta from "../hooks/usePageMeta";
import useReveal from "../hooks/useReveal";
import HeroCarousel from "../components/HeroCarousel";
import PromoCarousel from "../components/PromoCarousel";
import ProductRail from "../components/ProductRail";
import ShortsRail from "../components/ShortsRail";
import VideoReviewGrid from "../components/VideoReviewGrid";
import { CATEGORY_LABELS } from "../data/categories";
import Faq from "../components/Faq";
import { useCity } from "../context/CityContext";
import { cityPrice, fmtINR } from "../lib/pricing";
import { onImgError } from "../lib/imageFallback";

const HERO_SLIDES = [
  { src: IMAGES.heroCompactHome, alt: "Elegant gold-lit wedding stage decorated by Next Level Events" },
  { src: IMAGES.typeBirthday, alt: "Vibrant themed birthday celebration by Next Level Events" },
  { src: IMAGES.typeConcert, alt: "Concert stage lighting design by Next Level Events" },
  { src: IMAGES.typeCorporate, alt: "Corporate event branding and staging by Next Level Events" },
];

// Data-driven Shop by Occasion tiles — each links into the occasion tree
// (see src/data/occasions.js). Adding a 7th/8th occasion later only means
// adding one entry here and one entry to OCCASIONS.
const CATEGORY_TILES = [
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

const PROMO_SLIDES = [
  { img: IMAGES.promo1, tag: "Limited", title: "Flat 15% Off Weddings", sub: "Book before 30 Sept" },
  { img: IMAGES.promo2, tag: "New", title: "Corporate Combo Deals", sub: "Stage + AV + Hospitality" },
  { img: IMAGES.promo3, tag: "Trending", title: "Concert Production", sub: "Lighting & sound bundles" },
  { img: IMAGES.promo4, tag: "Popular", title: "Birthday Combo Packs", sub: "Starting ₹19,999" },
];

const REVIEWS = [
  { initials: "AR", name: "Ananya & Rohan", where: "Wedding, Mumbai", tags: ["Great Décor", "Punctual Setup", "Worth the Price"], text: "Our wedding décor looked exactly like the mood board we shared — the team managed every vendor flawlessly." },
  { initials: "SK", name: "Sanjay Kapoor", where: "Corporate, Bengaluru", tags: ["Great Coordination", "On-Time"], text: "Corporate launch went off perfectly — stage, AV and hospitality were all handled by one coordinator." },
  { initials: "MP", name: "Meera Patil", where: "Birthday, Pune", tags: ["Creative Theming", "Kid-Friendly"], text: "My daughter's birthday theme was so detailed, from balloon arch to the cake table styling. Highly recommend." },
  { initials: "PV", name: "Priya Verma", where: "Haldi Ceremony, Ranchi", tags: ["Vibrant Setup", "Attention to Detail"], text: "The Haldi setup was so vibrant and every little detail — from the umbrellas to the flower rangoli — was exactly what we pictured." },
  { initials: "RD", name: "Rakesh & Deepa", where: "Anniversary, Delhi", tags: ["Romantic Setup", "On Budget"], text: "Booked them for our 25th anniversary and the candlelit rose heart backdrop made the evening unforgettable." },
  { initials: "VK", name: "Vikram Kumar", where: "Concert, Hyderabad", tags: ["Great Sound", "Minor Delay"], text: "Great concert production — lighting and sound were top notch, only the load-in ran a little late." },
  { initials: "SN", name: "Sneha Nair", where: "Baby Shower, Ranchi", tags: ["Instagrammable", "Kid-Friendly"], text: "Our baby shower backdrop was straight out of Pinterest. The bears and balloon garlands were adorable." },
  { initials: "AJ", name: "Amit & Jyoti", where: "Birthday, Kolkata", tags: ["Creative Theming", "Great with Kids"], text: "First birthday party for our son was a dream — the number balloon and dinosaur theme had every guest talking." },
  { initials: "KT", name: "Kavita Thakur", where: "Newborn Welcome, Ranchi", tags: ["Thoughtful Touches", "Professional Team"], text: "Welcomed our newborn home with the sweetest teddy bear themed setup. The team was warm and professional throughout." },
  { initials: "RG", name: "Rohit Gupta", where: "Corporate, Jamshedpur", tags: ["Great Décor", "Good Value"], text: "Custom Diwali themed office party — décor was beautiful, would've liked a bit more seating though." },
  { initials: "AS", name: "Arjun Singh", where: "Proposal, Ranchi", tags: ["Picture Perfect", "Punctual Setup"], text: "Our proposal setup with the rose heart arch and candles was straight out of a movie. She said yes before I even asked!" },
];

const FAQ_ITEMS = [
  { q: "How far in advance should I book?", a: "We recommend booking 6-8 weeks ahead for weddings and 2-3 weeks for birthdays or smaller celebrations, though we do accommodate shorter timelines when possible." },
  { q: "Can packages be customised?", a: "Yes — every package is a starting point. We tailor décor, catering, entertainment and guest count to your budget and vision." },
  { q: "Which cities do you operate in?", a: "We're based in Ranchi and primarily serve events across Jharkhand, with select bookings taken in nearby states. Reach out to check availability in your city." },
  { q: "What is the payment structure?", a: "A booking advance confirms your date, with the balance split across milestones leading up to your event — full details are shared in your quote." },
  { q: "Do you handle vendor coordination?", a: "Yes, everything from décor and catering to lighting and entertainment is coordinated by one dedicated point of contact." },
  { q: "Do you travel outside Ranchi for events?", a: "Yes — we regularly take bookings across Jharkhand and select nearby states. Share your city when you enquire and we'll confirm availability and any travel costs." },
  { q: "How do I get a quote?", a: "Use the \"Book Event\" flow or the enquiry form above with your event type, date, guest count and budget, and our team will get back to you with a tailored quote — usually within a couple of hours." },
];

function Stars({ rating = 5, small }) {
  return (
    <div className={small ? "stars-row stars-row--sm" : "stars-row"} aria-label={rating + " out of 5 stars"}>
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} viewBox="0 0 24 24" fill="currentColor" style={i >= Math.round(rating) ? { opacity: 0.28 } : undefined}>
          <path d="M12 2.5l2.9 6.4 6.9.7-5.2 4.7 1.5 6.9L12 17.8l-6.1 3.4 1.5-6.9-5.2-4.7 6.9-.7z" />
        </svg>
      ))}
    </div>
  );
}

export default function Home() {
  usePageMeta(
    "Next Level Events — Wedding, Birthday & Corporate Event Planners in Ranchi, Jharkhand",
    "Next Level Events plans and produces weddings, birthdays, concerts, corporate events and custom celebrations across Ranchi and all of Jharkhand. Premium décor, catering coordination and full-day management, end to end."
  );
  const navigate = useNavigate();
  const { city } = useCity();
  const [sort, setSort] = useState("popularity");
  const [aboutExpanded, setAboutExpanded] = useState(false);


  const products = useLiveProducts();
  const sortedProducts = useMemo(() => {
    const arr = [...products];
    if (sort === "popularity") arr.sort((a, b) => b.popularity - a.popularity);
    else if (sort === "new") arr.sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));
    else if (sort === "price-asc") arr.sort((a, b) => a.price - b.price);
    else if (sort === "price-desc") arr.sort((a, b) => b.price - a.price);
    return arr;
  }, [products, sort]);

  const recommended = useMemo(
    () => [...products].sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount),
    [products]
  );
  const popularInCity = useMemo(
    () => [...products].sort((a, b) => b.popularity - a.popularity),
    [products]
  );
  const categoryRails = useMemo(() => {
    return Object.keys(CATEGORY_LABELS)
      .map((key) => ({ key, label: CATEGORY_LABELS[key], items: products.filter((p) => p.category === key) }))
      .filter((c) => c.items.length > 0);
  }, [products]);

  const trendingDecorItems = useMemo(() => {
    return [...products]
      .sort((a, b) => b.popularity - a.popularity)
      .slice(0, 6)
      .map(p => ({
        id: p.id,
        href: "/package-details?id=" + p.id,
        img: p.image,
        name: p.name,
        price: p.price
      }));
  }, [products]);

  useReveal([sort]);


  return (
    <>
      <HeroCarousel slides={HERO_SLIDES} />

      <section className="shop-section" id="categories">
        <div className="container">
          <div className="shop-head reveal"><h2>Shop by Occasion</h2><Link to="/shop-by-occasion">See all</Link></div>
          <div className="cat9-grid reveal">
            {CATEGORY_TILES.map((c) => (
              <Link className="cat9-item" to={c.href} key={c.label}>
                <span className="cat9-pic"><img src={c.img} alt={c.label}  onError={onImgError}/></span>
                <span>{c.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="shop-section" id="promos" style={{ paddingTop: 6 }}>
        <div className="container">
          <PromoCarousel slides={PROMO_SLIDES} />
        </div>
      </section>

      <section className="shop-section" id="exclusive">
        <div className="container">
          <div className="shop-head reveal"><h2>Popular Packages</h2><Link to="/packages">View all</Link></div>
          <p className="shop-sub reveal">Curated starting points — fully customisable to your vision and guest count.</p>
          <div className="sort-row reveal" role="group" aria-label="Sort exclusive packages">
            <span className="sort-label">Sort by</span>
            <div className="sort-pills">
              {[
                { key: "popularity", label: "Popularity" },
                { key: "new", label: "New Arrivals" },
                { key: "price-asc", label: "Low to High" },
                { key: "price-desc", label: "High to Low" },
              ].map((s) => (
                <button
                  key={s.key}
                  type="button"
                  className={"sort-pill" + (sort === s.key ? " active" : "")}
                  onClick={() => setSort(s.key)}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <div className="special-grid reveal">
            {sortedProducts.map((p) => (
              <Link className="special-card" to={"/package-details?id=" + p.id} key={p.id}>
                <div className="special-media">
                  <span className="special-badge">{p.badge}</span>
                  <img src={p.image} alt={p.name + " package"}  onError={onImgError}/>
                  <button
                    type="button"
                    className="cart-add-btn"
                    aria-label={"Book " + p.name}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigate("/package-details?id=" + p.id + "#booking-panel"); }}
                  >
                    +
                  </button>
                </div>
                <div className="special-body">
                  <h3>{p.name}</h3>
                  <div className="special-price"><b>{fmtINR(cityPrice(p.price, city))}</b><s>{fmtINR(cityPrice(p.originalPrice, city))}</s></div>
                </div>
              </Link>
            ))}
            <Link className="special-card" to="/packages">
              <div className="special-media">
                <span className="special-badge">Custom</span>
                <img src={IMAGES.pkgCustomExperience} alt="Custom Experience package"  onError={onImgError}/>
                <button
                  type="button"
                  className="cart-add-btn"
                  aria-label="Explore Custom Experience packages"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigate("/packages"); }}
                >
                  +
                </button>
              </div>
              <div className="special-body">
                <h3>Custom Experience</h3>
                <div className="special-price"><b>{fmtINR(cityPrice(54999, city))}</b><s>{fmtINR(cityPrice(69999, city))}</s></div>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {trendingDecorItems.length > 0 && <ProductRail title="Trending Decorations" viewAllHref="/packages" items={trendingDecorItems} tone="surface" />}

      <ProductRail
        title="Recommended For You"
        viewAllHref="/packages"
        items={recommended.map((p) => ({ id: p.id, href: "/package-details?id=" + p.id, img: p.image, name: p.name, badge: p.badge, price: p.price, originalPrice: p.originalPrice }))}
      />

      <ProductRail
        title={"Popular in " + city}
        viewAllHref="/packages"
        items={popularInCity.map((p) => ({ id: p.id, href: "/package-details?id=" + p.id, img: p.image, name: p.name, badge: p.badge, price: p.price, originalPrice: p.originalPrice }))}
        tone="surface"
      />

      {categoryRails.map((c) => (
        <ProductRail
          key={c.key}
          title={c.label + " Picks"}
          viewAllHref="/services"
          items={c.items.map((p) => ({ id: p.id, href: "/package-details?id=" + p.id, img: p.image, name: p.name, badge: p.badge, price: p.price, originalPrice: p.originalPrice }))}
        />
      ))}

      <section className="shop-section" id="seasonal">
        <div className="container">
          <Link to="/custom-events" className="illus-band reveal">
            <img src={IMAGES.seasonalBand} alt="Festive celebration styling"  onError={onImgError}/>
            <div className="illus-band-copy">
              <span className="tag-pill">Festive Edit</span>
              <h3>Style Your Festive Celebration</h3>
              <p>Themed decor, lighting &amp; entertainment for every festival.</p>
              <span className="btn btn-primary" style={{ pointerEvents: "none" }}>Explore</span>
            </div>
          </Link>
        </div>
      </section>

      <section className="shop-section" id="gallery-preview">
        <div className="container">
          <div className="shop-head reveal"><h2>From Our Recent Events</h2><Link to="/gallery">Gallery</Link></div>
          <div className="gal-grid reveal">
            <div className="gal-item tall"><img src={IMAGES.showcase1} alt="Wedding stage decor"  onError={onImgError}/></div>
            <div className="gal-item"><img src={IMAGES.showcase2} alt="Birthday celebration setup"  onError={onImgError}/></div>
            <div className="gal-item"><img src={IMAGES.showcase3} alt="Corporate event stage"  onError={onImgError}/></div>
            <div className="gal-item"><img src={IMAGES.showcase4} alt="Concert lighting design"  onError={onImgError}/></div>
          </div>
        </div>
      </section>

      <section className="shop-section" id="stats" style={{ background: "var(--surface)", borderTop: "1px solid var(--border-soft)", borderBottom: "1px solid var(--border-soft)" }}>
        <div className="container">
          <div className="stat-strip reveal">
            <div className="si"><h3>150+</h3><p>Events Delivered</p></div>
            <div className="si"><h3>5+</h3><p>Years in Ranchi</p></div>
            <div className="si"><h3>4.9★</h3><p>Average Rating</p></div>
          </div>
        </div>
      </section>

      <ShortsRail />

      <section className="shop-section" id="reviews">
        <div className="container">
          <div className="shop-head reveal"><h2>Customer Reviews</h2></div>
          <div className="reviews-summary reveal">
            <div className="reviews-score">
              <h3>4.9</h3>
              <Stars rating={4.9} />
              <p>Based on 150+ verified reviews</p>
            </div>
            <div className="reviews-bars">
              {[[5, 92], [4, 6], [3, 2], [2, 0], [1, 0]].map(([star, pct]) => (
                <div className="rbar" key={star}>
                  <span>{star}★</span>
                  <div className="rbar-track"><div className="rbar-fill" style={{ width: pct + "%" }}></div></div>
                  <span>{pct}%</span>
                </div>
              ))}
            </div>
          </div>
          <div className="review-carousel reveal">
            {REVIEWS.map((r) => (
              <div className="review-card" key={r.name}>
                <Stars rating={5} small />
                <p>{r.text}</p>
                <div className="review-tags">{r.tags.map((t) => <span key={t}>{t}</span>)}</div>
                <div className="review-who">
                  <span className="review-avatar">{r.initials}</span>
                  <div><h5>{r.name}</h5><span>{r.where}</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <VideoReviewGrid />

      <section className="shop-section" id="why-different" style={{ background: "var(--surface)" }}>
        <div className="container">
          <div className="shop-head reveal"><h2>How We're Different</h2></div>
          <div className="diff-grid reveal">
            <div className="diff-card"><span className="why-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 3l2.2 5.3L20 9l-4.4 3.8L17 19l-5-3.2L7 19l1.4-6.2L4 9l5.8-.7z" /></svg></span><h4>Premium Décor</h4><p>Bespoke styling using premium florals, fabric and lighting.</p></div>
            <div className="diff-card"><span className="why-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 7h16M4 12h16M4 17h10" /></svg></span><h4>End-to-End Management</h4><p>One team for planning, vendors, décor and execution.</p></div>
            <div className="diff-card"><span className="why-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="8.5" /><path d="M12 8v4l2.6 2.6" /></svg></span><h4>On-Time Delivery</h4><p>Set-up completed and reviewed well before your first guest.</p></div>
            <div className="diff-card"><span className="why-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 19V6a2 2 0 0 1 2-2h9l5 5v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" /><path d="M14 4v5h5" /></svg></span><h4>24/7 Support</h4><p>A dedicated coordinator reachable through your event day.</p></div>
          </div>
        </div>
      </section>

      <section className="shop-section" id="process">
        <div className="container">
          <div className="shop-head reveal"><h2>Plan In 3 Simple Steps</h2></div>
          <div className="steps-illus reveal">
            <div className="process-step"><span className="process-num">1</span><div><h4>Tell Us Your Vision</h4><p>Share your event type, date and budget — we'll shortlist ideas.</p></div></div>
            <div className="process-step"><span className="process-num">2</span><div><h4>Choose &amp; Customise</h4><p>Pick a package and personalise décor, catering and entertainment.</p></div></div>
            <div className="process-step"><span className="process-num">3</span><div><h4>We Deliver</h4><p>Our team executes on-site, start to finish, so you can celebrate.</p></div></div>
          </div>
        </div>
      </section>

      <section className="shop-section" id="about-long" style={{ background: "var(--surface)" }}>
        <div className="container">
          <div className="shop-head reveal"><h2>About Next Level Events</h2></div>
          <div className={"about-long reveal" + (aboutExpanded ? " expanded" : "")}>
            <p><strong>Next Level Events</strong> is a Ranchi-based, full-service event management and décor company built around one idea — every celebration deserves a team that treats it like the only one they're working on. From intimate anniversaries to 500-guest weddings, we plan, style and run the day so you get to actually be present in it, instead of chasing vendors and timelines.</p>
            <h4>Who We Are</h4>
            <p>We're a team of planners, décor stylists, production managers and coordinators who've spent years learning what makes a celebration feel effortless: tight logistics hidden behind beautiful design. We work as one point of contact for you, and as the coordinating hub for every vendor — caterers, florists, lighting and sound crews, photographers, entertainers — so nothing falls through the cracks on the day itself.</p>
            <h4>What We Do</h4>
            <p>Our services span the full lifecycle of an event: concept and theme development, budgeting and vendor sourcing, décor design and fabrication, stage and lighting production, catering coordination, entertainment booking, guest management, and on-ground execution with a dedicated crew. Whether it's a wedding, birthday, anniversary, concert, corporate launch or a custom celebration that doesn't fit a category, we build the plan around your vision rather than fitting you into a template.</p>
            <h4>Weddings &amp; Milestone Celebrations</h4>
            <p>For weddings, anniversaries and milestone birthdays, we handle everything from mandap and stage design to floral styling, lighting design, guest hospitality and multi-day logistics for functions like sangeet, haldi and reception. Every wedding gets a dedicated coordinator who manages vendors and timelines so your family can focus on the celebration, not the spreadsheet.</p>
            <h4>Corporate &amp; Concert Production</h4>
            <p>On the corporate and concert side, we manage stage builds, AV and sound engineering, branding and signage, hospitality zones and audience flow — the kind of technical production that needs to run on a strict schedule without anyone in the crowd noticing the effort behind it.</p>
            <h4>Our Process</h4>
            <p>We keep it simple: you tell us your event type, date, guest count and budget; we shortlist ideas and a package that fits; you customise décor, catering and entertainment to your taste; and our team executes on-site from setup to teardown, with a coordinator reachable throughout your event day. There's no payment required just to start a conversation — enquiries are free and obligation-free.</p>
            <h4>Where We Operate</h4>
            <p>We're headquartered in Ranchi, Jharkhand, and primarily serve events across Jharkhand and nearby states, with select bookings taken further out depending on scale and lead time. If you're unsure whether we cover your city, reach out and we'll confirm availability.</p>
            <h4>Why Clients Come Back To Us</h4>
            <p>Premium décor using quality florals, fabric and lighting; one team managing planning, vendors and execution end-to-end; set-up completed and reviewed well before your first guest arrives; and a dedicated coordinator reachable through your event day. It's the same standard whether the guest list is 40 or 400.</p>
            <h4>Get In Touch</h4>
            <p>Ready to start planning, or just want to ask a question first? Reach us on WhatsApp or call directly, drop us an email, or fill out the enquiry form above — our team typically responds within a couple of hours.</p>
          </div>
          <button
            type="button"
            className="about-toggle"
            aria-expanded={aboutExpanded}
            onClick={() => setAboutExpanded((v) => !v)}
          >
            {aboutExpanded ? "Read Less" : "Read More"}<span></span>
          </button>
        </div>
      </section>

      <section className="shop-section" id="faq">
        <div className="container">
          <div className="shop-head reveal"><h2>Frequently Asked Questions</h2></div>
          <Faq items={FAQ_ITEMS} />
        </div>
      </section>

      <section className="cta-band reveal">
        <div className="container">
          <h2>Let's Create Something Unforgettable.</h2>
          <Link to="/book-event" className="btn btn-primary">Plan Your Event</Link>
        </div>
      </section>

      <section className="shop-section" id="enquiry">
        <div className="container">
          <div className="shop-head reveal"><h2>Get a Free Consultation</h2></div>
          <p className="shop-sub reveal">Share your event details through our complete inquiry flow. Your submission is saved directly to our CRM.</p>
          <div className="enquiry-card reveal" style={{ textAlign: "center" }}>
            <h3 style={{ marginBottom: 8 }}>Plan your event with us</h3>
            <p className="admin-hint" style={{ marginBottom: 18 }}>Event type → Event details + vision → Contact details → Review → Submit</p>
            <Link to="/book-event" className="btn btn-primary">Start Your Inquiry</Link>
          </div>
        </div>
      </section>
    </>
  );
}
