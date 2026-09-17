import { Link } from "react-router-dom";
import usePageMeta from "../hooks/usePageMeta";
import useReveal from "../hooks/useReveal";

const LAST_UPDATED = "September 3, 2026";

export default function Terms() {
  usePageMeta(
    "Terms of Service — Next Level Events",
    "The terms that apply when you browse nextlevelevents.in, request a package or book an event with Next Level Events, Ranchi."
  );
  useReveal([]);

  return (
    <>
      <section className="page-head container">
        <span className="eyebrow">Legal</span>
        <h1>Terms of Service</h1>
        <p>The terms that apply when you use this website or book an event with Next Level Events.</p>
        <p className="legal-meta">Last updated: {LAST_UPDATED}</p>
      </section>

      <section className="section container">
        <ul className="legal-toc reveal">
          <li><a href="#acceptance">1. Acceptance of terms</a></li>
          <li><a href="#who-we-are">2. Who we are</a></li>
          <li><a href="#using-the-site">3. Using this website</a></li>
          <li><a href="#bookings">4. Enquiries &amp; bookings</a></li>
          <li><a href="#pricing">5. Pricing &amp; payments</a></li>
          <li><a href="#cancellations">6. Cancellations &amp; rescheduling</a></li>
          <li><a href="#your-responsibilities">7. Your responsibilities</a></li>
          <li><a href="#ip">8. Content &amp; intellectual property</a></li>
          <li><a href="#third-party">9. Third-party links &amp; services</a></li>
          <li><a href="#liability">10. Liability</a></li>
          <li><a href="#law">11. Governing law</a></li>
          <li><a href="#changes">12. Changes to these terms</a></li>
          <li><a href="#contact">13. Contact us</a></li>
        </ul>

        <div className="legal-body reveal">
          <section id="acceptance">
            <h2>1. Acceptance of terms</h2>
            <p>These Terms of Service ("Terms") govern your use of nextlevelevents.in (the "Site") and any package enquiry, booking request or event planned through it with Next Level Events ("we", "us", "our"). By browsing the Site or submitting an enquiry, you agree to these Terms. If you don't agree, please don't use the Site.</p>
          </section>

          <section id="who-we-are">
            <h2>2. Who we are</h2>
            <p>Next Level Events is an event planning and production studio based in Ranchi, Jharkhand, India, taking bookings across all districts of Jharkhand. You can reach us any time using the details in <Link to="/contact">Contact</Link>.</p>
          </section>

          <section id="using-the-site">
            <h2>3. Using this website</h2>
            <p>You may browse the Site, view packages and pricing, and submit enquiries for personal, non-commercial use related to planning your own event. You agree not to misuse the Site — for example, by attempting to disrupt it, scrape it at scale, or submit false or fraudulent enquiries.</p>
            <p>Package photos are representative of the style and standard of our work; final décor, staging and inclusions are confirmed with you individually and may vary from what's shown.</p>
          </section>

          <section id="bookings">
            <h2>4. Enquiries &amp; bookings</h2>
            <p>Submitting the "Book Event" form or adding a package to your cart creates a <strong>booking request</strong>, not a final confirmed booking. Here's what happens when you use these on the Site:</p>
            <ul>
              <li>Package checkout submits the booking request to our secure backend, where the booking details are stored for our team to review. The package booking form does not require a customer email address.</li>
              <li>After the booking is stored, our configured internal email and WhatsApp notification channels may be used to alert our team.</li>
              <li>Once we receive your request, our team follows up to confirm availability, finalise scope, and share a formal quote.</li>
              <li>A booking is only confirmed once we've agreed on scope, pricing and a booking advance has been received.</li>
            </ul>
          </section>

          <section id="pricing">
            <h2>5. Pricing &amp; payments</h2>
            <p>Prices shown on the Site are starting prices for the city you have selected and are indicative, not final quotes — final pricing depends on guest count, add-ons, exact date and specific requirements. Prices outside Ranchi include a logistics adjustment, disclosed on the relevant page.</p>
            <p>At present, payment is coordinated directly with our team (for example by UPI or bank transfer) after your booking is confirmed, and receipts are issued separately. We do not currently collect or store card details through the Site.</p>
          </section>

          <section id="cancellations">
            <h2>6. Cancellations &amp; rescheduling</h2>
            <p>Cancellation and rescheduling terms (including any refund of the booking advance) are confirmed with you at the time of booking and may vary depending on how close to your event date you cancel, and work already committed on your behalf (bookings with vendors, custom décor production, etc.). If you need to cancel or reschedule, contact us as early as possible so we can discuss the options available for your booking.</p>
          </section>

          <section id="your-responsibilities">
            <h2>7. Your responsibilities</h2>
            <p>When booking with us, you agree to:</p>
            <ul>
              <li>Provide accurate event details (date, guest count, venue, contact information).</li>
              <li>Secure any venue permissions, permits or NOCs required for décor, staging, sound or fireworks at your chosen venue, unless we've specifically agreed to arrange these for you.</li>
              <li>Ensure your guests and any vendors you bring in behave reasonably towards our team and equipment on the day.</li>
            </ul>
          </section>

          <section id="ip">
            <h2>8. Content &amp; intellectual property</h2>
            <p>All text, design, photography and branding on the Site belong to Next Level Events unless credited otherwise, and may not be copied or reused without permission.</p>
            <p>Photos and videos taken at events we plan or produce may be used in our portfolio, Gallery page, and social media for promotional purposes. If you'd prefer your event isn't featured, just let us know in writing and we'll honour that.</p>
          </section>

          <section id="third-party">
            <h2>9. Third-party links &amp; services</h2>
            <p>The Site links to third-party services including WhatsApp and Instagram. These are operated independently of us and governed by their own terms and privacy policies — we're not responsible for their content or practices.</p>
          </section>

          <section id="liability">
            <h2>10. Liability</h2>
            <p>We plan events with care, but some things are outside anyone's control — weather, venue issues, third-party vendor delays, or circumstances beyond reasonable control (force majeure). Where something outside our control affects your event, we'll work with you in good faith to find a reasonable resolution. Nothing in these Terms limits liability that cannot be limited under applicable Indian law.</p>
          </section>

          <section id="law">
            <h2>11. Governing law</h2>
            <p>These Terms are governed by the laws of India, and any disputes are subject to the exclusive jurisdiction of the courts of Ranchi, Jharkhand.</p>
          </section>

          <section id="changes">
            <h2>12. Changes to these terms</h2>
            <p>We may update these Terms from time to time, for example as our services or pricing structure evolve. The "Last updated" date at the top of this page reflects the most recent revision. Continuing to use the Site after changes are posted means you accept the updated Terms.</p>
          </section>

          <section id="contact">
            <h2>13. Contact us</h2>
            <p>Questions about these Terms? Reach us via the details on our <Link to="/contact">Contact page</Link>.</p>
          </section>
        </div>

        <div className="legal-note reveal">
          This page is a general template reflecting how nextlevelevents.in currently operates — it is not a substitute for legal advice. Before relying on it for your business, especially once you add real online payment processing, please have it reviewed by a lawyer familiar with Indian consumer-protection and e-commerce law.
        </div>
      </section>
    </>
  );
}
