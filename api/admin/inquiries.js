import { requireAdmin } from "../../shared/auth/supabaseAuth.js";
import { getServerSupabase } from "../../shared/supabase/serverClient.js";

const STAGES = ["new_lead", "discovery_call", "meeting_scheduled", "quotation_sent", "deal_closed", "lost", "junk"];
const LEAD_SOURCES = [
  "Website", "Meta Ads", "Google Ads", "Organic Social", "Google Organic",
  "WhatsApp", "Referral", "Venue", "Vendor", "Direct", "Repeat Client", "Other",
];
const EVENT_TYPES = ["Wedding", "Birthday", "Corporate", "Festive Events", "Others", "Birthday Party", "Wedding Ceremony", "Reception", "Anniversary", "Baby Shower", "Naming Ceremony", "Corporate Event", "Custom Celebration", "Birthday / Kitty Party", "Haldi / Mehendi / Sangeet", "Private Party", "Other"];
function clean(value, max = 1000) { return String(value ?? "").trim().slice(0, max); }
function normalizePhone(value) { return clean(value, 40).replace(/\D/g, "").replace(/^91(?=\d{10}$)/, ""); }
function normalizeEmail(value) { return clean(value, 160).toLowerCase(); }
function isValidSource(value) { return LEAD_SOURCES.includes(value); }

async function auth(req, res) {
  const result = await requireAdmin(process.env, req.headers?.authorization);
  if (!result.user) { res.status(401).json({ ok: false, error: result.error }); return null; }
  return result.user;
}

async function findDuplicateLead(db, { phone, email, eventType, eventDate }) {
  const normalizedPhone = normalizePhone(phone);
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedPhone && !normalizedEmail) return null;

  const rows = await db.query("inquiries?select=*&order=created_at.desc&limit=500", { method: "GET" });
  return (rows || []).find((row) => {
    if (row.source === "booking") return false;
    if (eventType && row.event_type && row.event_type !== eventType) return false;
    if (eventDate && row.event_date && row.event_date !== eventDate) return false;
    const rowPhone = normalizePhone(row.phone);
    const rowEmail = normalizeEmail(row.email);
    return (normalizedPhone && rowPhone && normalizedPhone === rowPhone) || (normalizedEmail && rowEmail && normalizedEmail === rowEmail);
  }) || null;
}

export default async function handler(req, res) {
  const user = await auth(req, res);
  if (!user) return;
  const db = getServerSupabase(process.env);
  if (!db) return res.status(503).json({ ok: false, error: "Supabase is not configured on the server." });

  try {
    if (req.method === "GET") {
      const inquiries = await db.query("inquiries?select=*&order=created_at.desc", { method: "GET" });
      const bookings = await db.query("bookings?select=*&order=created_at.desc", { method: "GET" });
      const bookingById = new Map((bookings || []).map((b) => [b.id, b]));
      const rows = (inquiries || []).map((row) => ({ ...row, booking: row.booking_id ? bookingById.get(row.booking_id) || null : null }));
      return res.status(200).json({ ok: true, inquiries: rows, bookings: bookings || [], leadSources: LEAD_SOURCES });
    }

    if (req.method === "POST") {
      const body = req.body || {};
      const name = clean(body.name, 80);
      const phone = clean(body.phone, 20);
      const email = clean(body.email, 160);
      const eventType = clean(body.eventType, 80);
      const eventDate = clean(body.eventDate, 10);
      const eventLocation = clean(body.eventLocation, 120);
      const guestCount = clean(body.guestCount, 60);
      const budget = clean(body.budget, 80);
      const message = clean(body.message, 2000);
      const leadSource = clean(body.leadSource, 40);

      if (!name || !/^\+?[0-9\s()\-.]{7,20}$/.test(phone) || !eventType || !eventLocation || !isValidSource(leadSource)) {
        return res.status(400).json({ ok: false, error: "Please complete the required lead fields." });
      }
      if (!EVENT_TYPES.includes(eventType)) return res.status(400).json({ ok: false, error: "Invalid event type." });
      if (eventDate && !/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) return res.status(400).json({ ok: false, error: "Invalid event date." });

      const duplicate = await findDuplicateLead(db, { phone, email, eventType, eventDate });
      if (duplicate) return res.status(200).json({ ok: true, inquiry: duplicate, duplicate: true });

      const rows = await db.query("inquiries", {
        method: "POST",
        body: {
          name,
          phone,
          email,
          whatsapp_number: clean(body.whatsapp, 20),
          city: eventLocation,
          event_type: eventType,
          event_date: eventDate || null,
          event_time: clean(body.eventTime, 80),
          event_venue: clean(body.eventVenue, 160),
          event_location: eventLocation,
          guest_count: guestCount,
          budget,
          message,
          status: "new_lead",
          admin_notes: "",
          source: "manual",
          lead_source: leadSource,
          source_type: "MANUAL",
          request_id: null,
        },
      });
      return res.status(201).json({ ok: true, inquiry: rows?.[0] || null });
    }

    if (req.method === "PATCH") {
      const body = req.body || {};
      const id = clean(body.id, 80);
      if (!id) return res.status(400).json({ ok: false, error: "Record id is required." });
      const patch = {};
      if (body.status !== undefined) {
        const status = clean(body.status, 40);
        if (!STAGES.includes(status)) return res.status(400).json({ ok: false, error: "Invalid lead stage." });
        patch.status = status;
      }
      if (body.adminNotes !== undefined) patch.admin_notes = clean(body.adminNotes, 2000);
      if (body.quotationId !== undefined) patch.quotation_id = clean(body.quotationId, 100);
      if (body.invoiceId !== undefined) patch.invoice_id = clean(body.invoiceId, 100);
      if (body.paymentStatus !== undefined) patch.payment_status = clean(body.paymentStatus, 30);
      if (body.leadSource !== undefined) {
        const leadSource = clean(body.leadSource, 40);
        if (!isValidSource(leadSource)) return res.status(400).json({ ok: false, error: "Invalid lead source." });
        patch.lead_source = leadSource;
        patch.source_type = "MANUAL";
      }
      patch.updated_at = new Date().toISOString();
      const rows = await db.query(`inquiries?id=eq.${encodeURIComponent(id)}`, { method: "PATCH", body: patch });
      return res.status(200).json({ ok: true, inquiry: rows?.[0] || null });
    }

    if (req.method === "DELETE") {
      const id = clean(req.body?.id, 80);
      if (!id) return res.status(400).json({ ok: false, error: "Record id is required." });
      await db.query(`inquiries?id=eq.${encodeURIComponent(id)}`, { method: "DELETE", prefer: "return=minimal" });
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (err) {
    console.error("Admin inquiries API error:", err);
    return res.status(500).json({ ok: false, error: err.message || "Unable to load CRM records." });
  }
}
