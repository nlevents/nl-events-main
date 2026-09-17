import { useState } from "react";
import { Link } from "react-router-dom";
import usePageMeta from "../hooks/usePageMeta";
import useReveal from "../hooks/useReveal";
import { useToast } from "../context/ToastContext";
import { submitInquiry } from "../services/customersService";

const CARDS = [
  { icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 5h4l2 5-2.5 1.5a11 11 0 0 0 5 5L14 14l5 2v4a2 2 0 0 1-2 2C9.5 22 2 14.5 2 7a2 2 0 0 1 2-2z" /></svg>, title: "Phone", value: "+91 7903 133 317", href: "tel:+917903133317" },
  { icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>, title: "Email", value: "nextlevel.events25@gmail.com", href: "mailto:nextlevel.events25@gmail.com" },
  { icon: <svg viewBox="0 0 32 32" fill="currentColor"><path d="M16.02 3C9.4 3 4 8.37 4 15c0 2.34.66 4.53 1.9 6.44L4 29l7.76-1.83A11.9 11.9 0 0 0 16.02 27C22.63 27 28 21.63 28 15S22.63 3 16.02 3Zm0 21.8a9.7 9.7 0 0 1-4.95-1.36l-.36-.21-4.6 1.09 1.13-4.48-.24-.37A9.72 9.72 0 0 1 5.2 15c0-5.97 4.86-10.8 10.82-10.8 5.96 0 10.8 4.83 10.8 10.8 0 5.96-4.84 10.8-10.8 10.8Zm5.94-8.1c-.32-.16-1.9-.94-2.2-1.04-.3-.11-.51-.16-.73.16-.21.32-.84 1.04-1.03 1.25-.19.21-.38.24-.7.08-.32-.16-1.35-.5-2.57-1.6-.95-.85-1.6-1.9-1.78-2.22-.19-.32-.02-.49.14-.65.14-.14.32-.38.48-.56.16-.19.21-.32.32-.53.11-.21.05-.4-.03-.56-.08-.16-.73-1.76-1-2.41-.26-.63-.53-.55-.73-.56h-.62c-.21 0-.56.08-.85.4-.29.32-1.12 1.09-1.12 2.66 0 1.57 1.15 3.09 1.31 3.3.16.21 2.26 3.45 5.48 4.84.77.33 1.36.53 1.83.68.77.24 1.47.21 2.02.13.62-.09 1.9-.78 2.17-1.53.27-.75.27-1.4.19-1.53-.08-.13-.29-.21-.61-.37Z" /></svg>, title: "WhatsApp", value: "+91 7903 133 317", href: "https://wa.me/917903133317" },
  { icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /></svg>, title: "Instagram", value: "@nextlevelevents.in", href: "https://www.instagram.com/nextlevelevents.in" },
  { icon: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M13.5 21v-7.6h2.55l.38-2.96h-2.93V8.55c0-.86.24-1.44 1.47-1.44h1.57V4.46A21 21 0 0 0 14.3 4.3c-2.24 0-3.77 1.37-3.77 3.87v2.16H7.97v2.96h2.56V21z" /></svg>, title: "Facebook", value: "nextlevelevents.in", href: "https://www.facebook.com/nextlevelevents.in" },
  { icon: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M22 12s0-3.4-.43-5a2.78 2.78 0 0 0-1.96-2C17.9 4.5 12 4.5 12 4.5s-5.9 0-7.6.5a2.78 2.78 0 0 0-1.97 2C2 8.6 2 12 2 12s0 3.4.43 5c.26.98.98 1.72 1.97 2 1.7.5 7.6.5 7.6.5s5.9 0 7.6-.5a2.78 2.78 0 0 0 1.97-2c.43-1.6.43-5 .43-5Z" /><path d="M10 15.2V8.8L15.5 12z" fill="#fff" /></svg>, title: "YouTube", value: "@nextlevelevents25", href: "https://www.youtube.com/@nextlevelevents25" },
  { icon: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M7.1 9.6H4V20h3.1zM5.55 4.4a1.8 1.8 0 1 0 0 3.6 1.8 1.8 0 0 0 0-3.6ZM20 20v-5.9c0-3.15-1.68-4.62-3.92-4.62A3.38 3.38 0 0 0 13 11.05V9.6H9.9c.04.86 0 10.4 0 10.4H13v-5.8c0-.31.02-.62.11-.84.25-.62.8-1.26 1.74-1.26 1.23 0 1.72.94 1.72 2.31V20Z" /></svg>, title: "LinkedIn", value: "Connect with our founder", href: "https://www.linkedin.com/in/sumit-verma-kumar/" },
  { icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 21s-7-6-7-11a7 7 0 0 1 14 0c0 5-7 11-7 11z" /><circle cx="12" cy="10" r="2.4" /></svg>, title: "Studio", value: "Kanke Road, Beside Chef's Chaupati, Jhigra Toli, Gandhi Nagar, Ranchi, Jharkhand 834002" },
];

export default function Contact() {
  usePageMeta("Contact Us — Next Level Events, Ranchi", "Get in touch with Next Level Events in Ranchi, Jharkhand to plan your wedding, birthday, corporate event or custom celebration.");
  useReveal([]);
  const showToast = useToast();

  const [values, setValues] = useState({ cName: "", cPhone: "", cEventType: "", cMessage: "" });
  const [errors, setErrors] = useState({});
  const [sending, setSending] = useState(false);

  function set(field, v) {
    setValues((s) => ({ ...s, [field]: v }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    const name = values.cName.trim();
    const phone = values.cPhone.trim();
    const eventType = values.cEventType;
    const message = values.cMessage.trim();

    const nextErrors = {};
    if (!name) nextErrors.cName = "Please enter your name.";
    if (!/^[0-9+\-\s()]{7,15}$/.test(phone)) nextErrors.cPhone = "Enter a valid phone number.";
    if (!eventType) nextErrors.cEventType = "Please select an event type.";
    if (!message) nextErrors.cMessage = "Please add a short message.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSending(true);
    submitInquiry({ name, phone, eventType, message, source: "contact" })
      .then(() => {
        setValues({ cName: "", cPhone: "", cEventType: "", cMessage: "" });
        showToast("Message sent — we will reach out within one business day.");
      })
      .catch((err) => showToast(err.message || "We couldn't send your message. Please try again."))
      .finally(() => setSending(false));
  }

  return (
    <>
      <section className="page-head container">
        <p className="crumb"><Link to="/">Home</Link> / Contact</p>
        <span className="eyebrow">Get In Touch</span>
        <h1>Let's talk about<br />your next celebration.</h1>
        <p>Tell us a little about what you're planning and our team will get back within one business day.</p>
      </section>

      <section className="section-tight container">
        <div className="contact-grid reveal">
          <div>
            <div className="contact-cards">
              {CARDS.map((c) => (
                <div className="contact-card" key={c.title}>
                  <span className="ci">{c.icon}</span>
                  <div>
                    <h4>{c.title}</h4>
                    {c.href ? <a href={c.href} target={c.href.startsWith("tel:") || c.href.startsWith("mailto:") ? undefined : "_blank"} rel={c.href.startsWith("tel:") || c.href.startsWith("mailto:") ? undefined : "noopener noreferrer"}>{c.value}</a> : <p>{c.value}</p>}
                  </div>
                </div>
              ))}
            </div>
            <div className="map-preview" style={{ marginTop: 20 }}>
              <iframe
                title="Next Level Events Ranchi studio map"
                src="https://www.openstreetmap.org/export/embed.html?bbox=85.307%2C23.401%2C85.326%2C23.422&layer=mapnik&marker=23.4131%2C85.3160"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
              <a className="map-preview-link" href="https://www.openstreetmap.org/?mlat=23.4131&mlon=85.3160#map=16/23.4131/85.3160" target="_blank" rel="noopener noreferrer">Open map in a new tab</a>
            </div>
          </div>

          <div>
            <form onSubmit={handleSubmit} noValidate>
              <div className="form-row-2">
                <div className="form-group">
                  <label htmlFor="cName">Name</label>
                  <input type="text" id="cName" maxLength={80} value={values.cName} onChange={(e) => set("cName", e.target.value)} />
                  <p className="form-error">{errors.cName}</p>
                </div>
                <div className="form-group">
                  <label htmlFor="cPhone">Phone</label>
                  <input type="tel" id="cPhone" maxLength={15} value={values.cPhone} onChange={(e) => set("cPhone", e.target.value)} />
                  <p className="form-error">{errors.cPhone}</p>
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="cEventType">Event Type</label>
                <select id="cEventType" value={values.cEventType} onChange={(e) => set("cEventType", e.target.value)}>
                  <option value="">Select an event type</option>
                  <option>Wedding</option><option>Birthday</option><option>Anniversary</option>
                  <option>Concert / Show</option><option>Corporate Event</option><option>Custom Event</option>
                </select>
                <p className="form-error">{errors.cEventType}</p>
              </div>
              <div className="form-group">
                <label htmlFor="cMessage">Message</label>
                <textarea id="cMessage" maxLength={800} placeholder="Tell us about your event — date, city, guest count, ideas..." value={values.cMessage} onChange={(e) => set("cMessage", e.target.value)}></textarea>
                <p className="form-error">{errors.cMessage}</p>
              </div>
              <input name="website" tabIndex="-1" autoComplete="off" aria-hidden="true" style={{ position: "absolute", left: "-10000px", width: 1, height: 1, opacity: 0 }} />
            <button className="btn btn-primary btn-block" type="submit" disabled={sending}>{sending ? "Sending…" : "Send Message"}</button>
            </form>
          </div>
        </div>
      </section>
    </>
  );
}
