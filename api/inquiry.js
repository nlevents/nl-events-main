import { getServerSupabase } from "../shared/supabase/serverClient.js";
import { notifyInquiry } from "./bookingNotifications.js";
import { rateLimit, isHoneypotTriggered } from "../shared/utils/security.js";

function clean(value, max) { return String(value ?? "").trim().slice(0, max); }
const EVENT_TYPES = new Set(["Wedding", "Birthday", "Corporate", "Festive Events", "Others", "Birthday Party", "Wedding Ceremony", "Reception", "Anniversary", "Baby Shower", "Naming Ceremony", "Corporate Event", "Custom Celebration", "Birthday / Kitty Party", "Haldi / Mehendi / Sangeet", "Private Party", "Other"]);
const LANDING_EVENT_TYPES = new Set(["Wedding", "Birthday / Kitty Party", "Corporate Event", "Haldi / Mehendi / Sangeet", "Anniversary", "Private Party", "Other"]);
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
      const existing = await db.query(`inquiries?request_id=eq.${encodeURIComponent(requestId)}&select=*`, { method: "GET" });
      if (existing?.[0]) return res.status(200).json({ ok: true, data: existing[0], duplicate: true });
    }

    // A single enquiry can arrive through more than one connected channel.
    // Reuse the existing lead when the core enquiry identity matches.
    const normalizedPhone = normalizePhone(phone);
    const normalizedEmail = normalizeEmail(body.email);
    if (normalizedPhone || normalizedEmail) {
      const recent = await db.query("inquiries?select=*&order=created_at.desc&limit=500", { method: "GET" });
      const duplicate = (recent || []).find((row) => {
        if (row.source === "booking") return false;
        if (eventType && row.event_type && row.event_type !== eventType) return false;
        if (eventDate && row.event_date && row.event_date !== eventDate) return false;
        const rowPhone = normalizePhone(row.phone);
        const rowEmail = normalizeEmail(row.email);
        return (normalizedPhone && rowPhone && normalizedPhone === rowPhone) || (normalizedEmail && rowEmail && normalizedEmail === rowEmail);
      });
      if (duplicate) return res.status(200).json({ ok: true, data: duplicate, duplicate: true });
    }

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

    // Notification delivery is intentionally non-blocking. A missing/broken
    // email or WhatsApp integration must never make a successfully saved lead
    // appear as a failed inquiry to the customer.
    try {
      await notifyInquiry(inquiry, db);
    } catch (notificationError) {
      console.error("Inquiry notification error (lead was saved):", notificationError);
    }

    return res.status(201).json({ ok: true, data: inquiry });
  } catch (err) {
    console.error("Inquiry API error:", err);
    return res.status(500).json({ ok: false, error: "Unable to submit your inquiry right now." });
  }
}
