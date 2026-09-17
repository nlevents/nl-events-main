import { Link } from "react-router-dom";
import usePageMeta from "../hooks/usePageMeta";
import useReveal from "../hooks/useReveal";

const LAST_UPDATED = "September 3, 2026";

export default function Privacy() {
  usePageMeta(
    "Privacy Policy — Next Level Events",
    "How Next Level Events, Ranchi collects, uses and protects your information when you use nextlevelevents.in."
  );
  useReveal([]);

  return (
    <>
      <section className="page-head container">
        <span className="eyebrow">Legal</span>
        <h1>Privacy Policy</h1>
        <p>How we handle your information when you use this website or enquire about an event.</p>
        <p className="legal-meta">Last updated: {LAST_UPDATED}</p>
      </section>

      <section className="section container">
        <ul className="legal-toc reveal">
          <li><a href="#overview">1. Overview</a></li>
          <li><a href="#collect">2. Information we collect</a></li>
          <li><a href="#how-it-reaches-us">3. How your information reaches us</a></li>
          <li><a href="#storage">4. Local storage &amp; cookies</a></li>
          <li><a href="#use">5. How we use your information</a></li>
          <li><a href="#photos">6. Event photos &amp; portfolio use</a></li>
          <li><a href="#sharing">7. Sharing your information</a></li>
          <li><a href="#retention">8. Data retention</a></li>
          <li><a href="#rights">9. Your rights</a></li>
          <li><a href="#children">10. Children's privacy</a></li>
          <li><a href="#security">11. Security</a></li>
          <li><a href="#third-party">12. Third-party services</a></li>
          <li><a href="#changes">13. Changes to this policy</a></li>
          <li><a href="#contact">14. Contact us</a></li>
        </ul>

        <div className="legal-body reveal">
          <section id="overview">
            <h2>1. Overview</h2>
            <p>This policy explains what information Next Level Events ("we", "us", "our") collects through nextlevelevents.in (the "Site"), how it's used, and the choices you have. We built the Site to collect as little as possible — there's no analytics, no advertising trackers, and no account system.</p>
          </section>

          <section id="collect">
            <h2>2. Information we collect</h2>
            <p>We only collect information you choose to give us, through the "Book Event" form or by contacting us directly:</p>
            <ul>
              <li>Name and phone number</li>
              <li>Event details — type, date, city, guest count, budget range and any requirements you describe</li>
            </ul>
            <p>We don't collect payment card details through the Site — payment is currently coordinated directly with our team after your booking is confirmed.</p>
          </section>

          <section id="how-it-reaches-us">
            <h2>3. How your information reaches us</h2>
            <p>The Site uses a secure booking backend to store booking requests and related customer details. When you submit a package booking through checkout, the booking is sent to our backend and stored in our booking database. After the booking is saved, our server may send an internal notification to our configured email and WhatsApp business channels so our team can respond. The customer email address is not collected by the package booking form.</p>
          </section>

          <section id="storage">
            <h2>4. Local storage &amp; cookies</h2>
            <p>The Site does not use cookies, analytics, or advertising trackers of any kind. It does store a few small preferences in your browser's local storage, on your own device — your selected city, light/dark theme, and items in your cart. This stays on your device; it's never automatically transmitted to us or anyone else, and you can clear it any time via your browser settings.</p>
            <p>Our on-site event planning chat runs entirely in your browser too — it provides information from the Site and doesn't send your messages anywhere unless you tap a "Chat on WhatsApp" option, which follows the same send-it-yourself process described above.</p>
          </section>

          <section id="use">
            <h2>5. How we use your information</h2>
            <p>Information you send us is used only to:</p>
            <ul>
              <li>Respond to your enquiry and provide a quote</li>
              <li>Plan, coordinate and deliver your event, including with vendors involved in it</li>
              <li>Send you service-related updates about your own booking</li>
            </ul>
            <p>We don't use your information for advertising, and we don't sell it.</p>
          </section>

          <section id="photos">
            <h2>6. Event photos &amp; portfolio use</h2>
            <p>Photos and videos from events we plan may be used in our Gallery page, portfolio and social media for promotional purposes, as described in our <Link to="/terms">Terms of Service</Link>. If you'd prefer your event isn't featured, let us know in writing and we'll honour that.</p>
          </section>

          <section id="sharing">
            <h2>7. Sharing your information</h2>
            <p>We share event details with vendors, venues or contractors only where necessary to plan and deliver your event (for example, sharing your guest count with a caterer), and only what's needed for that purpose. We don't share your information with third parties for their own marketing.</p>
          </section>

          <section id="retention">
            <h2>8. Data retention</h2>
            <p>We keep enquiry and booking information for as long as reasonably needed to deliver your event, handle any follow-up, and meet our own record-keeping and legal obligations, after which it's deleted or anonymised.</p>
          </section>

          <section id="rights">
            <h2>9. Your rights</h2>
            <p>You can ask us to access, correct or delete the information we hold about you at any time — just contact us using the details below. We aim to handle these requests in line with the Digital Personal Data Protection Act, 2023 and other applicable Indian data-protection law.</p>
          </section>

          <section id="children">
            <h2>10. Children's privacy</h2>
            <p>The Site is intended for adults planning events and is not directed at children. We don't knowingly collect information from anyone under 18; if you believe a minor has shared information with us, contact us and we'll remove it.</p>
          </section>

          <section id="security">
            <h2>11. Security</h2>
            <p>We take reasonable steps to keep the information you send us secure. That said, once information is sent by email or WhatsApp, its security in transit is governed by those platforms — please use the same care you would with any personal information sent by email or messaging app.</p>
          </section>

          <section id="third-party">
            <h2>12. Third-party services</h2>
            <p>The Site links to WhatsApp and Instagram. Any information you share on those platforms is governed by their own privacy policies, not this one.</p>
          </section>

          <section id="changes">
            <h2>13. Changes to this policy</h2>
            <p>We may update this policy from time to time, for example as the Site's features change. The "Last updated" date at the top reflects the most recent revision.</p>
          </section>

          <section id="contact">
            <h2>14. Contact us</h2>
            <p>For any privacy question or request, reach us via the details on our <Link to="/contact">Contact page</Link>.</p>
          </section>
        </div>

        <div className="legal-note reveal">
          This page is a general template reflecting how nextlevelevents.in currently operates — it is not a substitute for legal advice. Before relying on it for your business, please have it reviewed by a lawyer familiar with Indian data-protection law (including the Digital Personal Data Protection Act, 2023).
        </div>
      </section>
    </>
  );
}
