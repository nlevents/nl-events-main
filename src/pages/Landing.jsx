import { useMemo, useRef, useState } from "react";
import "../styles/landing.css";

const EVENT_TYPES = [
  { label: "Wedding", icon: "rings" },
  { label: "Birthday / Kitty Party", icon: "cake" },
  { label: "Corporate Event", icon: "briefcase" },
  { label: "Haldi / Mehendi / Sangeet", icon: "leaf" },
  { label: "Anniversary", icon: "glasses" },
  { label: "Private Party", icon: "party" },
  { label: "Other", icon: "dots" },
];

const GUEST_RANGES = [
  { label: "Up to 50", description: "Small & intimate events", icon: "users3" },
  { label: "51 – 100", description: "Family & close gatherings", icon: "users3" },
  { label: "101 – 200", description: "Medium-sized celebrations", icon: "users3" },
  { label: "200+", description: "Large celebrations", icon: "users5" },
];

const SERVICES = [
  ["Décor", "flower"],
  ["Complete Event Management", "clipboard"],
  ["Entry Concept", "arch"],
  ["Photography & Videography", "camera"],
  ["Catering", "dish"],
  ["Entertainment", "music"],
];

function Icon({ name, size = 30 }) {
  const common = { width: size, height: size, viewBox: "0 0 32 32", fill: "none", stroke: "currentColor", strokeWidth: 1.65, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true };
  const paths = {
    rings: <><circle cx="12" cy="17" r="6.2"/><circle cx="20" cy="17" r="6.2"/><path d="M12 8.5c1.5-2.3 6.5-2.3 8 0"/></>,
    cake: <><path d="M5 14h22v11H5z"/><path d="M5 18c3 3 5 3 8 0 3 3 5 3 8 0 3 3 5 3 6 0"/><path d="M10 14V9M16 14V7M22 14V9"/><path d="M8.5 8.5h3M14.5 6.5h3M20.5 8.5h3"/></>,
    briefcase: <><rect x="4" y="9" width="24" height="17" rx="2.5"/><path d="M11 9V6.5A2.5 2.5 0 0 1 13.5 4h5A2.5 2.5 0 0 1 21 6.5V9M4 15h24M13 15v3h6v-3"/></>,
    leaf: <><path d="M16 28c0-8 3-14 11-20-1 8-4 14-11 20Z"/><path d="M16 28C9 24 6 18 6 11c7 1 11 5 10 17Z"/><path d="M10 16c2 1 4 3 6 6M22 13c-2 2-4 4-6 8"/></>,
    glasses: <><path d="M4 13h5l2 8H7a3 3 0 0 1-3-3zM28 13h-5l-2 8h4a3 3 0 0 0 3-3z"/><path d="M11 16h10M14 13h4"/></>,
    party: <><path d="m7 25 5-13 8 3-5 13z"/><path d="M12 12 17 5M20 15l6-6M10 18l-5-2M23 5l-1-3M26 13l3 1"/></>,
    dots: <><circle cx="8" cy="16" r="1.4" fill="currentColor"/><circle cx="16" cy="16" r="1.4" fill="currentColor"/><circle cx="24" cy="16" r="1.4" fill="currentColor"/></>,
    users3: <><circle cx="16" cy="9" r="4"/><circle cx="7.5" cy="12" r="3"/><circle cx="24.5" cy="12" r="3"/><path d="M8 26c.7-5.2 3.5-8 8-8s7.3 2.8 8 8M3 25c.3-3.6 2-5.8 5-6.4M29 25c-.3-3.6-2-5.8-5-6.4"/></>,
    users5: <><circle cx="16" cy="8.5" r="3.5"/><circle cx="8" cy="12" r="2.6"/><circle cx="24" cy="12" r="2.6"/><circle cx="5" cy="18" r="2.2"/><circle cx="27" cy="18" r="2.2"/><path d="M9 26c.8-5 3.2-7.5 7-7.5s6.2 2.5 7 7.5M3 26c.2-2.7 1.2-4.5 3-5.3M29 26c-.2-2.7-1.2-4.5-3-5.3"/></>,
    calendar: <><rect x="5" y="6" width="22" height="21" rx="2.5"/><path d="M10 3v6M22 3v6M5 12h22"/><path d="M10 17h.1M16 17h.1M22 17h.1M10 22h.1M16 22h.1" strokeWidth="2.5"/></>,
    pin: <><path d="M16 28s8-7.4 8-14a8 8 0 1 0-16 0c0 6.6 8 14 8 14Z"/><circle cx="16" cy="14" r="2.5"/></>,
    flower: <><circle cx="16" cy="16" r="2.4"/><circle cx="16" cy="8" r="4"/><circle cx="23" cy="12" r="4"/><circle cx="22" cy="20" r="4"/><circle cx="10" cy="20" r="4"/><circle cx="9" cy="12" r="4"/></>,
    clipboard: <><rect x="7" y="6" width="18" height="22" rx="2"/><path d="M12 6V4h8v2M11 13h10M11 18h10M11 23h6"/></>,
    arch: <><path d="M6 26V15c0-6 4-10 10-10s10 4 10 10v11"/><path d="M9 26V15c0-4 3-7 7-7s7 3 7 7v11M3 26h26"/><circle cx="10" cy="10" r="1.5"/><circle cx="22" cy="10" r="1.5"/></>,
    camera: <><path d="M5 10h5l2-3h8l2 3h5v15H5z"/><circle cx="16" cy="17.5" r="4.2"/><path d="M24 13h.1" strokeWidth="2.5"/></>,
    dish: <><path d="M6 20h20M8 20c.5-5 4-8 8-8s7.5 3 8 8M12 9h8M16 6v3"/></>,
    music: <><path d="M12 24V7l12-2v17"/><circle cx="8" cy="25" r="3"/><circle cx="20" cy="22" r="3"/><path d="M12 12l12-2"/></>,
    user: <><circle cx="16" cy="10" r="4.2"/><path d="M7 28c.8-5.6 4-8.5 9-8.5s8.2 2.9 9 8.5"/></>,
    phone: <><path d="M9 4h4l2 5-2.7 2.1a17 17 0 0 0 8.6 8.6L23 17l5 2v4c0 1.3-1.2 2.2-2.5 2A22 22 0 0 1 7 6.5C6.8 5.2 7.7 4 9 4Z"/></>,
    whatsapp: <><path d="M16 4a11 11 0 0 0-9.4 16.7L5 27l6.6-1.6A11 11 0 1 0 16 4Z"/><path d="M12 11c.4 3.1 2.1 5 5 6M12.2 11c.5-1.2-.1-2.1-1.1-2.1-1.4 0-1.6 2.3-.5 3.8 2.2 3.2 4.6 4.6 7.3 5.1 1.5.3 2.1-1.7 1.2-2.2l-1.8-.9"/></>,
    mail: <><rect x="4" y="7" width="24" height="18" rx="2"/><path d="m5 9 11 8 11-8"/></>,
    edit: <><path d="M19 4a2.8 2.8 0 0 1 4 4L11 20l-5 1 1-5z"/><path d="m17 6 4 4"/></>,
    info: <><circle cx="16" cy="16" r="12"/><path d="M16 14v7M16 10h.1" strokeWidth="2.4"/></>,
    arrow: <><path d="M5 16h20M18 9l7 7-7 7"/></>,
    back: <><path d="M27 16H5M12 9l-7 7 7 7"/></>,
    shield: <><path d="M16 3 27 7v8c0 6.4-4.2 11.1-11 14-6.8-2.9-11-7.6-11-14V7z"/><path d="m10.5 16 3.5 3.5 7-8"/></>,
    check: <path d="m7 17 5 5L26 8"/>,
    globe: <><circle cx="16" cy="16" r="12"/><path d="M4 16h24M16 4c3 3.4 4.5 7.4 4.5 12S19 24.6 16 28c-3-3.4-4.5-7.4-4.5-12S13 7.4 16 4Z"/></>,
    star: <path d="m16 3 3.1 7 7.4.7-5.6 4.9 1.7 7.3-6.6-3.8-6.6 3.8 1.7-7.3-5.6-4.9 7.4-.7z"/>,
    hand: <><path d="M8 17V8.5a1.8 1.8 0 0 1 3.6 0v5.2M11.6 12V6.8a1.8 1.8 0 0 1 3.6 0v6.1M15.2 12V8.1a1.8 1.8 0 0 1 3.6 0v6M18.8 14v-2a1.8 1.8 0 0 1 3.6 0v5.4c0 5.3-3.1 8.6-8.4 8.6h-1.4c-2.2 0-4.1-1-5.3-2.7L4.4 19c-.7-1.1-.3-2.6.8-3.3 1-.6 2.2-.4 3 .4l1.8 1.9"/></> ,
  };
  return <svg {...common}>{paths[name] || null}</svg>;
}

function LandingHeader() {
  return (
    <div className="landing-header">
      <div className="landing-brand-mark"><img src="/assets/images/landing/monogram.png" alt="Next Level Events" /></div>
      <div className="landing-brand-copy">
        <div className="landing-brand-name">NEXT LEVEL EVENTS</div>
        <div className="landing-brand-tagline">We Can Theme Your Dream</div>
      </div>
      <div className="landing-script">Events<br />That Create<br />Memories ♡</div>
    </div>
  );
}

function Progress({ step, onBack }) {
  return (
    <div className="landing-progress-area">
      <div className="landing-progress-top">
        <span>Step {step} of 5</span>
        {step > 1 && (
          <button type="button" onClick={onBack} className="landing-back"><Icon name="back" size={22} /> Back</button>
        )}
      </div>
      <div className="landing-progress" aria-label={`Step ${step} of 5`}>
        {Array.from({ length: 5 }, (_, i) => {
          const n = i + 1;
          return <div key={n} className={`landing-progress-node ${n < step ? "done" : n === step ? "current" : ""}`}><span /></div>;
        })}
      </div>
    </div>
  );
}

function ContinueButton({ children = "Continue", onClick, disabled = false }) {
  return <button type="button" className="landing-primary-btn" onClick={onClick} disabled={disabled}>{children} <Icon name="arrow" size={22} /></button>;
}

function SafeNote() {
  return <div className="landing-safe-note"><Icon name="shield" size={43} /><div><strong>Your information is safe with us.</strong><span>We will only contact you regarding your event enquiry.</span></div></div>;
}

export default function Landing() {
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const dateInputRef = useRef(null);
  const [form, setForm] = useState({ eventType: "Wedding", guestCount: "Up to 50", eventDate: "", eventLocation: "", services: [], message: "", name: "", phone: "", whatsapp: "", email: "" });

  const requestId = useMemo(() => {
    try { return crypto.randomUUID().replace(/-/g, ""); } catch { return `${Date.now()}${Math.random().toString(36).slice(2)}`; }
  }, []);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const toggleService = (service) => setForm((prev) => ({ ...prev, services: prev.services.includes(service) ? prev.services.filter((x) => x !== service) : [...prev.services, service] }));

  function validateCurrentStep() {
    if (step === 1 && !form.eventType) return "Please select your event type.";
    if (step === 2 && !form.guestCount) return "Please select the expected number of guests.";
    if (step === 3 && !form.eventDate) return "Please select your event date.";
    if (step === 4 && !form.eventLocation.trim()) return "Please enter your event location.";
    if (step === 5) {
      if (!form.name.trim()) return "Please enter your full name.";
      if (!/^\+?[0-9\s()\-.]{7,20}$/.test(form.phone.trim())) return "Please enter a valid mobile number.";
    }
    return "";
  }

  function next() {
    const validation = validateCurrentStep();
    if (validation) { setError(validation); return; }
    setError("");
    setStep((value) => Math.min(5, value + 1));
  }

  async function submit() {
    const validation = validateCurrentStep();
    if (validation) { setError(validation); return; }
    setLoading(true); setError("");
    const messageParts = [
      form.services.length ? `Requirements: ${form.services.join(", ")}` : "Requirements: None selected",
      form.message.trim() ? `Additional Details: ${form.message.trim()}` : "Additional Details: —",
      form.whatsapp.trim() ? `WhatsApp Number: ${form.whatsapp.trim()}` : "WhatsApp Number: Same as mobile / not provided",
    ];
    try {
      const response = await fetch("/api/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "landing",
          requestId,
          name: form.name,
          phone: form.phone,
          email: form.email,
          whatsapp: form.whatsapp,
          eventType: form.eventType,
          eventDate: form.eventDate,
          eventLocation: form.eventLocation,
          guestCount: form.guestCount,
          message: messageParts.join("\n"),
          website: "",
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.error || "Unable to submit your inquiry right now.");
      setSubmitted(true);
    } catch (err) {
      setError(err.message || "Unable to submit your inquiry right now.");
    } finally { setLoading(false); }
  }

  if (submitted) {
    return <div className="landing-page"><LandingHeader /><main className="landing-content landing-success-content">
      <div className="landing-success-icon" aria-hidden="true">
        <span className="landing-success-orbit landing-success-orbit-1" />
        <span className="landing-success-orbit landing-success-orbit-2" />
        <span className="landing-success-rays"><i /><i /><i /><i /><i /><i /><i /><i /></span>
        <span className="landing-success-ring"><span className="landing-success-ring-inner"><Icon name="check" size={54} /></span></span>
        <span className="landing-success-sparkles"><i /><i /><i /><i /><i /><i /></span>
      </div>
      <h1>Enquiry Submitted<br />Successfully!</h1>
      <p className="landing-success-lead">Thank you for choosing Next Level Events.</p>
      <p className="landing-success-copy">Our team will review your enquiry and get in touch<br className="desktop-break" /> with you within 24 hours.</p>
      <div className="landing-benefits">
        {[['◇', 'Premium', 'Décor'], ['♧', 'Professional', 'Team'], ['▦', 'Hassle-Free', 'Planning'], ['♡', 'Memorable', 'Experiences']].map(([icon, a, b]) => <div key={a}><span>{icon}</span><strong>{a}</strong><small>{b}</small></div>)}
      </div>
      <a className="landing-whatsapp-btn" href="https://wa.me/917903133317" target="_blank" rel="noreferrer"><Icon name="whatsapp" size={31} /><span><strong>Chat with Us on WhatsApp <b>→</b></strong><small>Get faster responses</small></span></a>
      <a className="landing-outline-btn" href="/" target="_self"><Icon name="globe" size={26} /><span><strong>Visit Our Website <b>→</b></strong><small>Explore our events, gallery and services</small></span></a>
      <button className="landing-outline-btn landing-start-again" type="button" onClick={() => { setSubmitted(false); setStep(1); }}><Icon name="back" size={26} /><span><strong>Back to Start <b>→</b></strong><small>Submit another enquiry</small></span></button>
      <div className="landing-quote">“We create experiences,<br /> not just events.”<small>— NEXT LEVEL EVENTS —</small></div>
      <div className="landing-trust-grid">
        {[['shield', 'Your information', 'is safe with us'], ['phone', "We’ll contact you", 'within 24 hours'], ['hand', 'Trusted by', '100+ happy clients'], ['star', 'Events That', 'Create Memories']].map(([icon, a, b]) => <div key={a}><Icon name={icon} size={36} /><span>{a}<br />{b}</span></div>)}
      </div>
      <div className="landing-mini-footer"><div><div className="mini-logo">NL</div><strong>NEXT LEVEL EVENTS</strong><small>We Can Theme Your Dream</small></div><nav><a href="/">Home</a><a href="/services">Our Events</a><a href="/gallery">Gallery</a><a href="/contact">Contact</a></nav><div className="landing-address">Ranchi, Jharkhand, India</div></div>
    </main></div>;
  }

  return <div className="landing-page">
    <LandingHeader />
    <main className="landing-content">
      <Progress step={step} onBack={() => { setError(""); setStep((value) => Math.max(1, value - 1)); }} />

      {step === 1 && <section className="landing-step landing-step-1">
        <h1>What type of event<br />are you planning?</h1>
        <p className="landing-subtitle">Let us know so we can serve you better.</p>
        <div className="landing-event-grid">{EVENT_TYPES.map((item) => <button key={item.label} type="button" className={`landing-event-card ${form.eventType === item.label ? "selected" : ""}`} onClick={() => setField("eventType", item.label)}><Icon name={item.icon} size={38} /><span>{item.label}</span><i /></button>)}</div>
      </section>}

      {step === 2 && <section className="landing-step landing-step-2">
        <div className="landing-step-icon"><Icon name="users5" size={66} /></div>
        <h1>How many guests<br />are you expecting?</h1>
        <p className="landing-subtitle">This helps us suggest the best options for your event.</p>
        <div className="landing-guest-grid">{GUEST_RANGES.map((item) => <button key={item.label} type="button" className={`landing-guest-card ${form.guestCount === item.label ? "selected" : ""}`} onClick={() => setField("guestCount", item.label)}><Icon name={item.icon} size={53} /><strong>{item.label}</strong><span>{item.description}</span><i /></button>)}</div>
      </section>}

      {step === 3 && <section className="landing-step landing-step-3">
        <div className="landing-step-icon"><Icon name="calendar" size={62} /></div>
        <h1>When is your<br />event?</h1>
        <p className="landing-subtitle">Select your preferred event date.</p>
        <div className={`landing-field landing-date-field ${form.eventDate ? "has-value" : ""}`} role="group" aria-label="Select event date" onClick={() => { const input = dateInputRef.current; if (!input) return; try { if (typeof input.showPicker === "function") input.showPicker(); else { input.focus(); input.click(); } } catch { input.focus(); input.click(); } }}><Icon name="calendar" size={27} /><input ref={dateInputRef} type="date" value={form.eventDate} min={new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10)} onChange={(e) => setField("eventDate", e.target.value)} required aria-label="Event date" /><span>{form.eventDate ? new Date(`${form.eventDate}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "Select Event Date *"}</span><b>⌄</b></div>
        <div className="landing-info-box"><Icon name="info" size={29} /><div><strong>Not sure about the exact date?</strong><span>You can select an approximate date. We’ll help you<br className="desktop-break" /> with the best options.</span></div></div>
      </section>}

      {step === 4 && <section className="landing-step landing-step-4">
        <h1>Where is your<br />event?</h1>
        <p className="landing-subtitle">Let us know the event location so we can plan better<br className="desktop-break" /> for you.</p>
        <label className="landing-field"><Icon name="pin" size={28} /><input value={form.eventLocation} onChange={(e) => setField("eventLocation", e.target.value)} placeholder="Enter City / Event Location *" /></label>
        <div className="landing-section-label">What do you need? <span>(Select all that apply)</span></div>
        <div className="landing-service-grid">{SERVICES.map(([label, icon]) => <button key={label} type="button" className={`landing-service-card ${form.services.includes(label) ? "selected" : ""}`} onClick={() => toggleService(label)}><Icon name={icon} size={31} /><span>{label}</span><i /></button>)}</div>
        <div className="landing-section-label landing-optional-label">Any specific requirements? <span>(Optional)</span></div>
        <label className="landing-textarea"><Icon name="edit" size={25} /><textarea value={form.message} onChange={(e) => setField("message", e.target.value)} placeholder="Tell us more about your event..." maxLength={2000} /></label>
      </section>}

      {step === 5 && <section className="landing-step landing-step-5">
        <div className="landing-step-icon"><Icon name="user" size={57} /></div>
        <h1>Almost Done!</h1>
        <p className="landing-subtitle">Tell us your details so we can get in touch.</p>
        <div className="landing-contact-grid">
          <label className="landing-field"><Icon name="user" size={26} /><input value={form.name} onChange={(e) => setField("name", e.target.value)} placeholder="Full Name *" /></label>
          <label className="landing-field"><Icon name="phone" size={26} /><input inputMode="tel" value={form.phone} onChange={(e) => setField("phone", e.target.value)} placeholder="Mobile Number *" /></label>
          <label className="landing-field"><Icon name="whatsapp" size={26} /><input inputMode="tel" value={form.whatsapp} onChange={(e) => setField("whatsapp", e.target.value)} placeholder="WhatsApp Number" /><small>(If different)</small></label>
          <label className="landing-field"><Icon name="mail" size={26} /><input type="email" value={form.email} onChange={(e) => setField("email", e.target.value)} placeholder="Email Address" /><small>(Optional)</small></label>
        </div>
        <div className="landing-review"><div className="landing-review-head"><Icon name="clipboard" size={31} /><div><strong>Review Your Details</strong><span>Please check your information before submitting.</span></div><button type="button" onClick={() => setStep(1)}><Icon name="edit" size={18} /> Edit</button></div>
          <ReviewRow label="Event Type" value={form.eventType} />
          <ReviewRow label="Number of Guests" value={form.guestCount} />
          <ReviewRow label="Event Date" value={form.eventDate ? new Date(`${form.eventDate}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"} />
          <ReviewRow label="Event Location" value={form.eventLocation || "—"} />
          <ReviewRow label="Requirements" value={form.services.length ? form.services.join(", ") : "None selected"} />
          <ReviewRow label="Additional Details" value={form.message || "—"} />
          <ReviewRow label="Full Name" value={form.name || "—"} />
          <ReviewRow label="Mobile Number" value={form.phone || "—"} />
          <ReviewRow label="Email Address" value={form.email || "—"} last />
        </div>
      </section>}

      {error && <div className="landing-error" role="alert">{error}</div>}
      <div className="landing-action-wrap">{step < 5 ? <ContinueButton onClick={next} /> : <ContinueButton onClick={submit} disabled={loading}>{loading ? "Submitting…" : "Submit Enquiry"}</ContinueButton>}</div>
      <SafeNote />
    </main>
  </div>;
}

function ReviewRow({ label, value, last = false }) {
  return <div className={`landing-review-row ${last ? "last" : ""}`}><span>{label}</span><strong>{value}</strong></div>;
}
