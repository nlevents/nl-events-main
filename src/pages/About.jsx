import { Link } from "react-router-dom";
import { IMAGES } from "../data/images";
import usePageMeta from "../hooks/usePageMeta";
import useReveal from "../hooks/useReveal";
import { onImgError } from "../lib/imageFallback";

export default function About() {
  usePageMeta("About Us — Next Level Events", "Next Level Events was built on one belief: every important moment deserves to be unforgettable. Learn our story and philosophy.");
  useReveal([]);

  return (
    <>
      <section className="hero hero-sm">
        <div className="hero-media"><img src={IMAGES.heroAbout} alt="Next Level Events team styling a premium celebration"  onError={onImgError}/></div>
        <div className="hero-content">
          <span className="eyebrow">About Us</span>
          <h1>Our Story</h1>
          <p>Next Level Events was created with one belief: every important moment deserves to be unforgettable.</p>
        </div>
      </section>

      <section className="section container">
        <div className="about-story-grid reveal">
          <div>
            <span className="eyebrow">Since Day One</span>
            <h2 style={{ marginTop: 14, fontSize: "clamp(26px,6vw,38px)" }}>Built by people who care<br />about the details.</h2>
            <p style={{ color: "var(--text-secondary)", marginTop: 18 }}>We started Next Level Events with a simple frustration: too many "event planners" were really just vendor coordinators, passing risk and stress back to the family or team hosting the event. We wanted to build something different — a single team that owns planning, design and execution, so our clients experience their own event as a guest, not a project manager.</p>
            <p style={{ color: "var(--text-secondary)", marginTop: 14 }}>Today that means weddings across multiple cities, milestone birthdays, corporate launches and concerts — each one designed with the same editorial attention to detail, whatever the scale.</p>
          </div>
          <div className="gal-item" style={{ aspectRatio: "4/3", borderRadius: "var(--radius-m)", overflow: "hidden" }}>
            <img src={IMAGES.about2} alt="Event styling detail work"  onError={onImgError}/>
          </div>
        </div>

        <div className="stat-row reveal" style={{ marginTop: 56 }}>
          <div className="stat-item"><h3>96+</h3><p>Events</p></div>
          <div className="stat-item"><h3>900+</h3><p>Happy Clients</p></div>
          <div className="stat-item"><h3>100%</h3><p>Commitment</p></div>
        </div>
      </section>

      <section className="section-tight" style={{ background: "var(--surface)" }}>
        <div className="container">
          <div className="section-head reveal"><h2>What Makes Us Different</h2></div>
          <div className="why-grid reveal">
            <div className="why-item">
              <span className="why-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 7h16M4 12h16M4 17h10" /></svg></span>
              <div><h3>One Point of Contact</h3><p>A single coordinator owns your event from first call to teardown.</p></div>
            </div>
            <div className="why-item">
              <span className="why-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 3l2.2 5.3L20 9l-4.4 3.8L17 19l-5-3.2L7 19l1.4-6.2L4 9l5.8-.7z" /></svg></span>
              <div><h3>Design-Led Décor</h3><p>Every set is designed, not assembled from a catalogue.</p></div>
            </div>
            <div className="why-item">
              <span className="why-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="8.5" /><path d="M12 8v4l2.6 2.6" /></svg></span>
              <div><h3>Transparent Timelines</h3><p>You always know what happens next, and when.</p></div>
            </div>
            <div className="why-item">
              <span className="why-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 19V6a2 2 0 0 1 2-2h9l5 5v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" /><path d="M14 4v5h5" /></svg></span>
              <div><h3>Honest Pricing</h3><p>No hidden vendor mark-ups — you see what you're paying for.</p></div>
            </div>
          </div>
        </div>
      </section>

      <section className="cta-band reveal">
        <div className="container">
          <h2>Let's build your next celebration together.</h2>
          <Link to="/book-event" className="btn btn-primary">Start Planning</Link>
        </div>
      </section>
    </>
  );
}
