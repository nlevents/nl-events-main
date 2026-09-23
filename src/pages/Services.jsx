import { Link } from "react-router-dom";
import { IMAGES } from "../data/images";
import usePageMeta from "../hooks/usePageMeta";
import useReveal from "../hooks/useReveal";
import { onImgError } from "../lib/imageFallback";

const SERVICES = [
  { num: "01", tag: "Weddings", img: IMAGES.typeWedding, alt: "Indian wedding mandap decor", desc: "Mandap and stage design, floral styling, catering coordination and full-day management for every ceremony.", href: "/weddings", cta: "Explore Weddings" },
  { num: "02", tag: "Birthdays", img: IMAGES.typeBirthday, alt: "Birthday balloon backdrop", desc: "Themed backdrops, balloon art, cake tables and entertainment for milestone and kids' celebrations alike.", href: "/birthdays", cta: "Explore Birthdays" },
  { num: "03", tag: "Anniversaries", img: IMAGES.typeAnniversary, alt: "Anniversary floral setup", desc: "Intimate, romantic styling — candlelit décor, floral arches and personalised details for every milestone year.", href: "/occasion/anniversary", cta: "Explore Anniversaries" },
  { num: "04", tag: "Concerts & Shows", img: IMAGES.typeConcert, alt: "Concert stage lighting", desc: "Stage production, sound and lighting design, artist coordination and crowd-ready logistics.", href: "/concerts", cta: "Explore Concerts" },
  { num: "05", tag: "Corporate Events", img: IMAGES.typeCorporate, alt: "Corporate event stage setup", desc: "Product launches, conferences and offsites — branded staging, AV production and guest hospitality.", href: "/corporate", cta: "Explore Corporate" },
  { num: "06", tag: "Custom Events", img: IMAGES.typeCustom, alt: "Custom themed event decor", desc: "Anything outside the ordinary — from immersive themes to private experiences, designed from scratch.", href: "/custom-events", cta: "Explore Custom Events" },
];

export default function Services() {
  usePageMeta("Event Planning Services in Jharkhand — Next Level Events", "Explore weddings, birthdays, anniversaries, concerts, corporate and custom event planning services by Next Level Events, serving Ranchi and all of Jharkhand.");
  useReveal([]);
  return (
    <>
      <section className="page-head container">
        <p className="crumb"><Link to="/">Home</Link> / Services</p>
        <span className="eyebrow">What We Do</span>
        <h1>Services, built<br />around your occasion.</h1>
        <p>Six specialities. One coordinating team, from first call to final teardown.</p>
      </section>

      <section className="section-tight container">
        <div className="service-row">
          {SERVICES.map((s) => (
            <article className="service-item reveal" key={s.tag}>
              <div className="s-media"><img src={s.img} alt={s.alt}  loading="lazy" decoding="async" onError={onImgError}/></div>
              <div>
                <span className="s-num">{s.num} — {s.tag}</span>
                <h3>{s.tag}</h3>
                <p>{s.desc}</p>
                <Link to={s.href} className="btn btn-line">{s.cta}</Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="cta-band reveal">
        <div className="container">
          <h2>Not sure which service fits?</h2>
          <Link to="/book-event" className="btn btn-primary">Talk To Us</Link>
        </div>
      </section>
    </>
  );
}
