import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import usePageMeta from "../hooks/usePageMeta";
import { submitInquiry } from "../services/customersService";

const EVENT_TYPES = [
  { type: "Wedding", icon: "💍" },
  { type: "Birthday", icon: "🎂" },
  { type: "Corporate", icon: "🏢" },
  { type: "Festive Events", icon: "🎉" },
  { type: "Others", icon: "✨" },
];

const STEP_LABELS = ["Event Type", "Event Details", "Contact", "Review"];

function AnalogTimePicker({ value, onChange, onClose }) {
  const parsed = value.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  const [hour, setHour] = useState(parsed ? Number(parsed[1]) : 7);
  const [minute, setMinute] = useState(parsed ? Number(parsed[2]) : 0);
  const [period, setPeriod] = useState(parsed ? parsed[3].toUpperCase() : "PM");
  const [mode, setMode] = useState("hour");

  const commit = (nextHour = hour, nextMinute = minute, nextPeriod = period) => {
    onChange(`${nextHour}:${String(nextMinute).padStart(2, "0")} ${nextPeriod}`);
  };

  const chooseHour = (h) => {
    setHour(h);
    setMode("minute");
  };

  const chooseMinute = (m) => {
    setMinute(m);
    commit(hour, m, period);
    setMode("hour");
  };

  return (
    <div className="analog-time-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="analog-time-picker" role="dialog" aria-modal="true" aria-labelledby="analog-time-title" onMouseDown={(e) => e.stopPropagation()}>
        <div className="analog-time-header">
          <div>
            <span className="analog-time-kicker">Select event time</span>
            <strong id="analog-time-title">{hour}:{String(minute).padStart(2, "0")} {period}</strong>
          </div>
          <div className="analog-time-periods">
            {['AM', 'PM'].map((p) => (
              <button key={p} type="button" className={period === p ? "active" : ""} onClick={() => { setPeriod(p); commit(hour, minute, p); }}>{p}</button>
            ))}
          </div>
        </div>
        <div className="analog-clock" aria-label={mode === "hour" ? "Select hour" : "Select minutes"}>
          <div className="analog-clock-face">
            <div className={"analog-clock-hand " + (mode === "hour" ? "hour-hand" : "minute-hand")} style={{ transform: `translate(-50%, -100%) rotate(${mode === "hour" ? ((hour % 12) * 30 + minute * 0.5) : minute * 6}deg)` }} />
            <div className="analog-clock-center" />
            {Array.from({ length: 12 }, (_, i) => {
              const n = mode === "hour" ? (i === 0 ? 12 : i) : i * 5;
              const angle = (i * 30 - 90) * Math.PI / 180;
              const radius = 38;
              const left = 50 + (Math.cos(angle) * radius / 100) * 100;
              const top = 50 + (Math.sin(angle) * radius / 100) * 100;
              const selected = mode === "hour" ? n === hour : n === minute;
              return (
                <button key={n} type="button" className={"analog-clock-number" + (selected ? " selected" : "")} style={{ left: `${left}%`, top: `${top}%` }} onClick={() => mode === "hour" ? chooseHour(n) : chooseMinute(n)}>{String(n).padStart(2, "0")}</button>
              );
            })}
          </div>
        </div>
        <div className="analog-time-footer">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn-primary" onClick={() => { commit(); onClose(); }}>Done</button>
        </div>
      </div>
    </div>
  );
}

export default function BookEvent() {
  usePageMeta("Inquiry — Next Level Events", "Tell Next Level Events about your upcoming event and our team will get in touch within 24 hours.");
  const formRef = useRef(null);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState({});
  const [eventType, setEventType] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [eventVenue, setEventVenue] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [guestCount, setGuestCount] = useState("");
  const [requirements, setRequirements] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [eventTypeError, setEventTypeError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [success, setSuccess] = useState(false);

  function validateStep(index) {
    const nextErrors = {};
    if (index === 0) {
      if (!eventType) {
        setEventTypeError(true);
        return false;
      }
      setEventTypeError(false);
    }
    if (index === 1) {
      if (!eventDate) nextErrors.eventDate = "This field is required.";
      else {
        const picked = new Date(eventDate + "T00:00:00");
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (picked < today) nextErrors.eventDate = "Please choose a future date.";
      }
      // Event time and venue are intentionally optional so customers can submit
      // an inquiry before those details are finalized.
      if (!eventLocation.trim()) nextErrors.eventLocation = "This field is required.";
      if (!guestCount) nextErrors.guestCount = "This field is required.";
      if (!requirements.trim()) nextErrors.requirements = "Please tell us about your vision or requirements.";
    }
    if (index === 2) {
      if (!fullName.trim()) nextErrors.fullName = "This field is required.";
      if (!phone.trim()) nextErrors.phone = "This field is required.";
      else if (!/^\+?[0-9][0-9\s().-]{6,18}$/.test(phone.trim())) nextErrors.phone = "Enter a valid phone number.";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function goNext() {
    if (!validateStep(step)) return;
    setStep((s) => Math.min(STEP_LABELS.length - 1, s + 1));
    setTimeout(() => formRef.current && window.scrollTo({ top: formRef.current.offsetTop - 90, behavior: "smooth" }), 30);
  }

  function goBack() {
    setStep((s) => Math.max(0, s - 1));
    setTimeout(() => formRef.current && window.scrollTo({ top: formRef.current.offsetTop - 90, behavior: "smooth" }), 30);
  }

  async function handleSubmit() {
    if (!validateStep(3)) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const result = await submitInquiry({
        name: fullName.trim(),
        phone: phone.trim(),
        eventType,
        eventDate,
        eventTime: eventTime.trim(),
        eventVenue: eventVenue.trim(),
        eventLocation: eventLocation.trim(),
        guestCount,
        message: requirements.trim(),
      });
      try {
        sessionStorage.setItem("nle-last-inquiry", JSON.stringify({ id: result?.data?.id, eventType, eventDate }));
      } catch { /* ignore */ }
      setSuccess(true);
    } catch (err) {
      setSubmitError(err.message || "Unable to submit your inquiry. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <section className="page-head container">
        <p className="crumb"><Link to="/">Home</Link> / Inquiry</p>
        <span className="eyebrow">Event Inquiry</span>
        <h1>Let's Start Planning.</h1>
        <p>Share your event details and our team will connect with you within 24 hours.</p>
      </section>

      <section className="section-tight container" style={{ maxWidth: 700 }} ref={formRef}>
        <div className="progress-track" aria-hidden="true">
          {STEP_LABELS.map((_, i) => <div key={i} className={"progress-dot" + (i < step ? " done" : "") + (i === step ? " active" : "")} />)}
        </div>
        <div className="progress-labels">{STEP_LABELS.map((label) => <span key={label}>{label}</span>)}</div>

        <form onSubmit={(e) => { e.preventDefault(); if (step === 3) handleSubmit(); }} noValidate>
          <div className={"step-panel" + (step === 0 ? " active" : "")}>
            <h2 style={{ fontSize: 22, marginBottom: 18 }}>Event Type</h2>
            <div className="event-type-grid" role="radiogroup" aria-label="Event type" style={eventTypeError ? { outline: "1px solid #d16a5a" } : undefined}>
              {EVENT_TYPES.map((item) => (
                <div key={item.type} className={"event-type-pick" + (eventType === item.type ? " selected" : "")} role="radio" aria-checked={eventType === item.type} tabIndex={0}
                  onClick={() => { setEventType(item.type); setEventTypeError(false); }}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setEventType(item.type); setEventTypeError(false); } }}>
                  <span className="icon">{item.icon}</span><span>{item.type}</span>
                </div>
              ))}
            </div>
            {eventTypeError && <p className="form-error">Please choose an event type.</p>}
            <div className="form-nav"><button className="btn btn-primary btn-block" type="button" onClick={goNext}>Next</button></div>
          </div>

          <div className={"step-panel" + (step === 1 ? " active" : "")}>
            <h2 style={{ fontSize: 22, marginBottom: 18 }}>Event Details</h2>
            <div className="form-row-2">
              <div className="form-group"><label htmlFor="eventDate">Event Date</label><input type="date" id="eventDate" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />{errors.eventDate && <p className="form-error">{errors.eventDate}</p>}</div>
              <div className="form-group"><label htmlFor="eventTime">Event Time <span className="form-optional">(optional)</span></label><button type="button" id="eventTime" className={"analog-time-input" + (!eventTime ? " placeholder" : "")} onClick={() => setShowTimePicker(true)} aria-haspopup="dialog" aria-expanded={showTimePicker}>{eventTime || "Select event time"}<span aria-hidden="true">◷</span></button>{errors.eventTime && <p className="form-error">{errors.eventTime}</p>}</div>
            </div>
            <div className="form-group"><label htmlFor="eventVenue">Venue / Address <span className="form-optional">(optional)</span></label><input type="text" id="eventVenue" maxLength={160} placeholder="Venue / hall / hotel / home (optional)" value={eventVenue} onChange={(e) => setEventVenue(e.target.value)} />{errors.eventVenue && <p className="form-error">{errors.eventVenue}</p>}</div>
            <div className="form-row-2">
              <div className="form-group"><label htmlFor="eventLocation">Event Location</label><input type="text" id="eventLocation" maxLength={120} placeholder="City / area" value={eventLocation} onChange={(e) => setEventLocation(e.target.value)} />{errors.eventLocation && <p className="form-error">{errors.eventLocation}</p>}</div>
              <div className="form-group"><label htmlFor="guestCount">Guest Count</label><select id="guestCount" value={guestCount} onChange={(e) => setGuestCount(e.target.value)}><option value="">Select guest count</option><option>Under 50</option><option>50–150</option><option>150–300</option><option>300–500</option><option>500+</option></select>{errors.guestCount && <p className="form-error">{errors.guestCount}</p>}</div>
            </div>
            <div className="form-group"><label htmlFor="requirements">Vision / Requirements / Description</label><textarea id="requirements" maxLength={2000} placeholder="Theme, colours, must-haves, inspiration, special requirements..." value={requirements} onChange={(e) => setRequirements(e.target.value)} />{errors.requirements && <p className="form-error">{errors.requirements}</p>}</div>
            <div className="form-nav"><button className="btn btn-ghost" type="button" onClick={goBack}>Back</button><button className="btn btn-primary btn-block" type="button" onClick={goNext}>Next</button></div>
          </div>

          <div className={"step-panel" + (step === 2 ? " active" : "")}>
            <h2 style={{ fontSize: 22, marginBottom: 18 }}>Contact Details</h2>
            <div className="form-group"><label htmlFor="fullName">Name</label><input type="text" id="fullName" maxLength={80} autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} />{errors.fullName && <p className="form-error">{errors.fullName}</p>}</div>
            <div className="form-group"><label htmlFor="phone">Mobile Number</label><input type="tel" id="phone" maxLength={20} autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />{errors.phone && <p className="form-error">{errors.phone}</p>}</div>
            <div className="form-nav"><button className="btn btn-ghost" type="button" onClick={goBack}>Back</button><button className="btn btn-primary btn-block" type="button" onClick={goNext}>Next</button></div>
          </div>

          <div className={"step-panel" + (step === 3 ? " active" : "")}>
            <h2 style={{ fontSize: 22, marginBottom: 18 }}>Review</h2>
            <p className="admin-hint" style={{ marginBottom: 18 }}>Review your inquiry before submitting. Use Back to correct any detail.</p>
            <div className="review-list">
              <div className="review-row"><span>Event Type</span><span>{eventType || "—"}</span></div>
              <div className="review-row"><span>Event Date</span><span>{eventDate || "—"}</span></div>
              <div className="review-row"><span>Event Time</span><span>{eventTime || "—"}</span></div>
              <div className="review-row"><span>Event Venue</span><span>{eventVenue || "—"}</span></div>
              <div className="review-row"><span>Event Location</span><span>{eventLocation || "—"}</span></div>
              <div className="review-row"><span>Guest Count</span><span>{guestCount || "—"}</span></div>
              <div className="review-row"><span>Vision / Requirements</span><span style={{ whiteSpace: "pre-line", textAlign: "right", maxWidth: "65%" }}>{requirements || "—"}</span></div>
              <div className="review-row"><span>Name</span><span>{fullName || "—"}</span></div>
              <div className="review-row"><span>Mobile Number</span><span>{phone || "—"}</span></div>
            </div>
            {submitError && <p className="form-error" style={{ marginTop: 14 }}>{submitError}</p>}
            <div className="form-nav"><button className="btn btn-ghost" type="button" onClick={goBack}>Back</button><button className="btn btn-primary btn-block" type="submit" disabled={submitting}>{submitting ? "Submitting…" : "Submit Inquiry"}</button></div>
          </div>
        </form>
      </section>

      {showTimePicker && (
        <AnalogTimePicker value={eventTime} onChange={setEventTime} onClose={() => setShowTimePicker(false)} />
      )}

      {success && (
        <div className="admin-modal-backdrop inquiry-success-backdrop" role="presentation">
          <div className="inquiry-success-modal" role="dialog" aria-modal="true" aria-labelledby="inquiry-success-title">
            <div className="inquiry-success-burst" aria-hidden="true">
              <span /><span /><span /><span /><span /><span /><span /><span />
            </div>
            <div className="inquiry-success-check" aria-hidden="true">
              <svg viewBox="0 0 52 52" fill="none">
                <path d="M14 27.5 22 35l16-18" />
              </svg>
            </div>
            <h2 id="inquiry-success-title">Inquiry Submitted Successfully!</h2>
            <p>Your inquiry has been submitted successfully. Our team will contact you within 24 hours.</p>
            <div className="inquiry-success-actions">
              <Link className="btn" to="/">Done</Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
