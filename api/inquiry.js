import { getServerSupabase } from "../shared/supabase/serverClient.js";
import { notifyInquiry } from "./bookingNotifications.js";
import { rateLimit, isHoneypotTriggered } from "../shared/utils/security.js";

function clean(value, max) { return String(value ?? "").trim().slice(0, max); }
const EVENT_TYPES = new Set(["Wedding", "Birthday", "Corporate", "Festive Events", "Others", "Birthday Party", "Wedding Ceremony", "Reception", "Anniversary", "Baby Shower", "Naming Ceremony", "Corporate Event", "Custom Celebration", "Birthday / Kitty Party", "Haldi / Mehendi / Sangeet", "Private Party", "Other"]);
const LANDING_EVENT_TYPES = new Set(["Wedding", "Birthday", "Birthday / Kitty Party", "Corporate Event", "Haldi / Mehendi / Sangeet", "Anniversary", "Private Party", "Other"]);
const STAGE = "new_lead";
const SOURCE_DETAILS = {
  landing: "Landing Page",
  contact: "Inquiry Form",
  inquiry: "Inquiry Form",
  website: "Website",
  crm: "CRM",
  product: "Product Page",
};
function detectSourceDetail(value) {
  const raw = clean(value, 120);
  return SOURCE_DETAILS[raw.toLowerCase()] || raw || "Inquiry Form";
}
const LEAD_SOURCES = new Set([
  "Website", "Meta Ads", "Google Ads", "Organic Social", "Google Organic",
  "WhatsApp", "Referral", "Venue", "Vendor", "Direct", "Repeat Client", "Other",
]);
const SOURCE_ALIASES = {
  landing: "Website",
  contact: "Website",
  inquiry: "Website",
  website: "Website",
  website_form: "Website",
  meta_ads: "Meta Ads",
  google_ads: "Google Ads",
  organic_social: "Organic Social",
  google_organic: "Google Organic",
  whatsapp: "WhatsApp",
  referral: "Referral",
  venue: "Venue",
  vendor: "Vendor",
  direct: "Direct",
  repeat_client: "Repeat Client",
  other: "Other",
};
function detectLeadSource(value) {
  const raw = clean(value, 40);
  return LEAD_SOURCES.has(raw) ? raw : SOURCE_ALIASES[raw.toLowerCase()] || "Website";
}
function normalizePhone(value) { return clean(value, 40).replace(/\D/g, "").replace(/^91(?=\d{10}$)/, ""); }
function normalizeEmail(value) { return clean(value, 160).toLowerCase(); }

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });
  try {
    const limit = rateLimit(req, "public-inquiry", { limit: 8, windowMs: 15 * 60 * 1000 });
    if (!limit.ok) {
      res.setHeader("Retry-After", String(limit.retryAfterSeconds));
      return res.status(429).json({ ok: false, error: "Too many submissions. Please wait a few minutes and try again." });
    }
    const body = req.body || {};
    if (isHoneypotTriggered(body.website)) return res.status(400).json({ ok: false, error: "Unable to submit this form." });
    const name = clean(body.name, 80);
    const phone = clean(body.phone, 20);
    const eventType = clean(body.eventType, 80);
    const eventDate = clean(body.eventDate, 10);
    const eventTime = clean(body.eventTime, 80);
    const whatsapp = clean(body.whatsapp, 20);
    const eventVenue = clean(body.eventVenue, 160);
    const eventLocation = clean(body.eventLocation, 120);
    const guestCount = clean(body.guestCount, 60);
    const message = clean(body.message, 2000);
    const source = clean(body.source, 30);
    const sourceDetail = detectSourceDetail(source);
    const leadSource = detectLeadSource(body.leadSource || source);
    const requestId = clean(body.requestId, 100);
    const isContact = source === "contact";
    const isLanding = source === "landing";

    if (!name || !/^\+?[0-9\s()\-.]{7,20}$/.test(phone) || (!isLanding && !message)) {
      return res.status(400).json({ ok: false, error: "Please complete the required fields." });
    }
    if (isLanding && (!LANDING_EVENT_TYPES.has(eventType) || !/^\d{4}-\d{2}-\d{2}$/.test(eventDate) || !eventLocation || !guestCount)) {
      return res.status(400).json({ ok: false, error: "Please complete all required inquiry details." });
    }
    if (!isContact && !isLanding && (!EVENT_TYPES.has(eventType) || !/^\d{4}-\d{2}-\d{2}$/.test(eventDate) || !eventLocation || !guestCount)) {
      return res.status(400).json({ ok: false, error: "Please complete all required inquiry details." });
    }

    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
    if (eventDate && eventDate < today) return res.status(400).json({ ok: false, error: "Event date cannot be in the past." });

    const db = getServerSupabase(process.env);
    if (!db) return res.status(500).json({ ok: false, error: "Inquiry service is not configured." });

    if (requestId && !/^[a-zA-Z0-9_-]{8,100}$/.test(requestId)) {
      return res.status(400).json({ ok: false, error: "Invalid inquiry request. Please try again." });
    }
    if (requestId) {
      try {
        const existing = await db.query(`inquiries?request_id=eq.${encodeURIComponent(requestId)}&select=*`, { method: "GET" });
        if (existing?.[0]) return res.status(200).json({ ok: true, data: existing[0], duplicate: true });
      } catch (requestLookupError) {
        // request_id is an optional migration column. A missing column must
        // never prevent a valid public inquiry from being created.
        console.warn("Inquiry request-id lookup skipped:", requestLookupError?.message || requestLookupError);
      }
    }

    // Duplicate protection is handled primarily by requestId. Avoid scanning
    // hundreds of recent inquiries here because this endpoint must stay fast
    // for a public form submission. A retry of the same browser submission
    // keeps the same requestId and is caught by the lookup above.

    const inquiryPayload = {
      name,
      phone,
      email: clean(body.email, 160),
      whatsapp_number: whatsapp,
      city: eventLocation,
      event_type: eventType || "General Inquiry",
      event_date: eventDate || null,
      event_time: eventTime,
      event_venue: eventVenue,
      event_location: eventLocation,
      guest_count: guestCount,
      budget: "",
      message,
      status: STAGE,
      admin_notes: "",
      source: sourceDetail,
      lead_source: leadSource,
      source_type: "AUTO",
      request_id: requestId || null,
    };

    let rows;
    let insertError = null;

    // Try the complete CRM schema first. If a deployment is missing one or
    // more optional migration columns, progressively fall back to payloads
    // that only use columns from the base inquiries table. This makes the
    // public inquiry endpoint resilient to partially migrated Supabase
    // projects instead of returning the generic 500 error.
    const insertAttempts = [
      inquiryPayload,
      {
        name: inquiryPayload.name,
        phone: inquiryPayload.phone,
        email: inquiryPayload.email,
        whatsapp_number: inquiryPayload.whatsapp_number,
        city: inquiryPayload.city,
        event_type: inquiryPayload.event_type,
        event_date: inquiryPayload.event_date,
        event_time: inquiryPayload.event_time,
        event_venue: inquiryPayload.event_venue,
        event_location: inquiryPayload.event_location,
        guest_count: inquiryPayload.guest_count,
        budget: inquiryPayload.budget,
        message: inquiryPayload.message,
        status: inquiryPayload.status,
        admin_notes: inquiryPayload.admin_notes,
        request_id: inquiryPayload.request_id,
      },
      {
        name: inquiryPayload.name,
        phone: inquiryPayload.phone,
        email: inquiryPayload.email,
        city: inquiryPayload.city,
        event_type: inquiryPayload.event_type,
        event_date: inquiryPayload.event_date,
        guest_count: inquiryPayload.guest_count,
        budget: inquiryPayload.budget,
        message: inquiryPayload.message,
        status: inquiryPayload.status,
        admin_notes: inquiryPayload.admin_notes,
      },
    ];

    for (const payload of insertAttempts) {
      try {
        rows = await db.query("inquiries", { method: "POST", body: payload });
        if (rows?.[0]?.id) break;
      } catch (error) {
        insertError = error;
      }
    }

    if (!rows?.[0]?.id) {
      const detail = String(insertError?.message || "");
      console.error("Inquiry insert failed after all schema-compatible attempts:", detail);
      throw new Error(detail || "Inquiry could not be saved.");
    }

    const inquiry = rows?.[0];
    if (!inquiry?.id) throw new Error("Inquiry was not created.");

    // The inquiry is already safely stored. Do not make the customer wait for
    // email/WhatsApp notifications or notification logging. Those providers
    // can take several seconds (or occasionally time out), which previously
    // made the Submit Enquiry button feel slow.
    const notifyTask = Promise.resolve()
      .then(() => notifyInquiry(inquiry, db))
      .catch((notificationError) => {
        console.error("Inquiry notification error (lead was saved):", notificationError);
      });

    if (typeof req.waitUntil === "function") req.waitUntil(notifyTask);
    else void notifyTask;

    return res.status(201).json({ ok: true, data: inquiry });
  } catch (err) {
    console.error("Inquiry API error:", err);
    return res.status(500).json({ ok: false, error: "Unable to submit your inquiry right now." });
  }
}
