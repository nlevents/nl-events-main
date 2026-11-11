import { getServerSupabase } from "../shared/supabase/serverClient.js";
import { readStates } from "../shared/stateStore.js";
import { randomUUID } from "node:crypto";
import { notifyBooking } from "./bookingNotifications.js";
import { rateLimit, isHoneypotTriggered, countRecent } from "../shared/utils/security.js";
import { ClientError, isClientError } from "../shared/utils/errors.js";

function clean(value, max) { return String(value ?? "").trim().slice(0, max); }
function cityPrice(base, city, cities) {
  const n = Number(base);
  if (!Number.isFinite(n)) return 0;
  const row = (cities || []).find((c) => String(c.name).toLowerCase() === String(city || "").toLowerCase());
  if (!row) throw new ClientError(`Service is not available in ${clean(city, 80) || "the selected city"}.`);
  const multiplier = Number(row.multiplier) || 1;
  return multiplier === 1 ? n : Math.round((n * multiplier) / 100) * 100;
}
// Match by id first, then slug. A name match is used only when it is unambiguous,
// so two products sharing a name can never be swapped for one another.
function findProduct(products, item) {
  const list = Array.isArray(products) ? products : [];
  const ids = [item.productId, item.id].filter(Boolean);
  const slugs = [item.productSlug, item.slug].filter(Boolean);
  // Guard against "undefined === undefined" matching a product that simply has no slug/id.
  const byId = ids.length ? list.find((p) => p && p.id && ids.includes(p.id)) : undefined;
  if (byId) return byId;
  const bySlug = slugs.length ? list.find((p) => p && p.slug && slugs.includes(p.slug)) : undefined;
  if (bySlug) return bySlug;
  const name = clean(item.name, 200);
  const byName = name ? list.filter((p) => p && p.name === name) : [];
  return byName.length === 1 ? byName[0] : undefined;
}
// Keep only flat, bounded values from the browser's cart line (no nested objects,
// no unsafe URL schemes). Prices and add-ons are rebuilt from the server catalog.
function sanitizeItemFields(item) {
  const out = {};
  let kept = 0;
  for (const [key, value] of Object.entries(item)) {
    if (kept >= 40) break;
    if (key === "addons" || !/^[A-Za-z][A-Za-z0-9_]{0,40}$/.test(key) || key === "constructor" || key === "prototype") continue;
    if (typeof value === "string") out[key] = clean(value, 600);
    else if (typeof value === "number" && Number.isFinite(value)) out[key] = value;
    else if (typeof value === "boolean" || value === null) out[key] = value;
    else continue;
    kept += 1;
  }
  if (out.href && !/^\/(?!\/)/.test(out.href)) delete out.href;
  if (out.image && !/^(https:\/\/|\/(?!\/))/.test(out.image)) delete out.image;
  return out;
}
function isRealDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}
const EVENT_TYPES = new Set(["Birthday Party", "Wedding Ceremony", "Reception", "Anniversary", "Baby Shower", "Naming Ceremony", "Corporate Event", "Custom Celebration"]);
const LOCATION_TYPES = new Set(["Home / Residence", "Banquet Hall / Venue", "Terrace / Rooftop", "Outdoor / Garden", "Community Hall", "Other"]);
const TIME_SLOTS = new Set(["Morning (8 AM – 11 AM)", "Midday (11 AM – 2 PM)", "Afternoon (2 PM – 5 PM)", "Evening (5 PM – 8 PM)", "Night (8 PM – 11 PM)"]);
const GUEST_COUNTS = new Set(["Under 50", "50–150", "150–300", "300–500", "500+"]);
function validateItem(item, cities) {
  const city = clean(item.city, 80);
  if (!city || !(cities || []).some((c) => String(c.name).toLowerCase() === city.toLowerCase())) throw new ClientError(`Service is not available in ${city || "the selected city"}.`);
  const eventDate = clean(item.eventDate, 10);
  if (!isRealDate(eventDate)) throw new ClientError(`Please select a valid event date for ${clean(item.name, 100) || "item"}.`);
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
  const picked = new Date(eventDate + "T00:00:00");
  if (Number.isNaN(picked.getTime()) || eventDate < today) throw new ClientError(`Event date cannot be in the past for ${clean(item.name, 100) || "item"}.`);
  if (!EVENT_TYPES.has(clean(item.eventType, 60))) throw new ClientError(`Please select a valid event type for ${clean(item.name, 100) || "item"}.`);
  if (!LOCATION_TYPES.has(clean(item.locationType, 80))) throw new ClientError(`Please select a valid location type for ${clean(item.name, 100) || "item"}.`);
  if (!GUEST_COUNTS.has(clean(item.guestCount, 60))) throw new ClientError(`Please select a valid guest count for ${clean(item.name, 100) || "item"}.`);
  if (clean(item.timeSlot, 80) && !TIME_SLOTS.has(clean(item.timeSlot, 80))) throw new ClientError(`Please select a valid time slot for ${clean(item.name, 100) || "item"}.`);
}
function normName(value) { return String(value ?? "").trim().toLowerCase(); }
// An add-on is valid when it is either one of the product's own embedded
// add-ons, or a live (non-archived/draft) service from the admin catalog.
// Price always comes from the server-side catalog, never from the browser.
function findAddon(product, products, addon) {
  const name = normName(addon?.name);
  const id = String(addon?.id || addon?.productId || "");
  const own = (product.addons || []).find((a) => normName(a.name) === name);
  if (own) return own;
  return (products || []).find((p) => {
    if (!p || p.status === "archived" || p.status === "draft") return false;
    const isService = p.catalogKind === "service" || p.isAddon === true || (Array.isArray(p.categoryPath) && p.categoryPath[0] === "event-services");
    if (!isService) return false;
    return (id && String(p.id) === id) || (name && normName(p.name) === name);
  }) || null;
}
function normalizeAndPrice(items, products, cities) {
  let total = 0;
  const normalized = [];
  for (const item of items) {
    if (!item || typeof item !== "object" || Array.isArray(item)) throw new ClientError("Your cart contains an invalid item.");
    validateItem(item, cities);
    const product = findProduct(products, item);
    if (!product || product.status === "archived" || product.status === "draft") throw new ClientError(`Product is no longer available: ${clean(item.name, 100) || "item"}.`);
    const qty = Math.min(20, Math.max(1, Number(item.quantity) || 1));
    const unitPrice = cityPrice(product.price, item.city, cities);
    let addonTotal = 0;
    const addons = [];
    for (const addon of Array.isArray(item.addons) ? item.addons : []) {
      const known = findAddon(product, products, addon);
      if (!known) throw new ClientError(`Invalid add-on selected for ${product.name}.`);
      addonTotal += cityPrice(known.price, item.city, cities);
      addons.push({ name: known.name, price: Number(known.price) || 0 });
    }
    total += Math.round((unitPrice + addonTotal) * qty);
    normalized.push({ ...sanitizeItemFields(item), productId: product.id, name: product.name, quantity: qty, unitPrice: Number(product.price) || 0, addons });
  }
  return { total: Math.round(total), items: normalized };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });
  try {
    const limit = rateLimit(req, "public-booking", { limit: 6, windowMs: 15 * 60 * 1000 });
    if (!limit.ok) {
      res.setHeader("Retry-After", String(limit.retryAfterSeconds));
      return res.status(429).json({ ok: false, error: "Too many booking attempts. Please wait a few minutes and try again." });
    }
    const payload = req.body && typeof req.body === "object" && !Array.isArray(req.body) ? req.body : {};
    const { items, customer } = payload;
    if (isHoneypotTriggered(payload.website)) return res.status(400).json({ ok: false, error: "Unable to submit this booking." });
    if (!Array.isArray(items) || items.length === 0 || items.length > 50) return res.status(400).json({ ok: false, error: "Your cart is empty or contains too many items." });
    const safeCustomer = customer && typeof customer === "object" ? customer : {};
    const fullName = clean(safeCustomer.fullName, 80);
    const phone = clean(safeCustomer.phone, 20);
    if (!fullName) return res.status(400).json({ ok: false, error: "Full name is required." });
    if (!/^\+?[0-9][0-9\s().-]{6,18}$/.test(phone)) return res.status(400).json({ ok: false, error: "Enter a valid phone number." });

    const requestId = clean(payload.requestId, 80);
    if (!/^[a-zA-Z0-9_-]{8,80}$/.test(requestId)) return res.status(400).json({ ok: false, error: "Invalid booking request. Please try again." });
    const db = getServerSupabase(process.env);
    if (!db) return res.status(500).json({ ok: false, error: "Booking service is not configured." });
    const existing = await db.query(`bookings?request_id=eq.${encodeURIComponent(requestId)}&select=id,ref,created_at,subtotal,discount,total,booking_status,items_json`, { method: "GET" });
    if (existing?.[0]) {
      const booking = existing[0];
      return res.status(200).json({ ok: true, bookingId: booking.id, ref: booking.ref, createdAt: booking.created_at, subtotal: Number(booking.subtotal), discount: Number(booking.discount), total: Number(booking.total), bookingStatus: booking.booking_status, items: booking.items_json });
    }

    // Database-backed abuse guard (holds across serverless instances); a genuine
    // retry of the same requestId already returned above and is never blocked.
    const [recentSamePhone, recentOverall] = await Promise.all([
      countRecent(db, "bookings", `&customer_phone=eq.${encodeURIComponent(phone)}`, 60 * 60 * 1000, 5),
      countRecent(db, "bookings", "", 10 * 60 * 1000, 100),
    ]);
    if (recentSamePhone >= 5 || recentOverall >= 100) {
      res.setHeader("Retry-After", "600");
      return res.status(429).json({ ok: false, error: "Too many booking attempts. Please wait a few minutes and try again." });
    }

    const state = await readStates(process.env, ["nle_catalog_v2_products", "nle_catalog_v2_cities"]);
    const { total, items: normalizedItems } = normalizeAndPrice(items, (Array.isArray(state.nle_catalog_v2_products) ? state.nle_catalog_v2_products : []).filter((p) => p && !p.isDemo && !String(p.id || "").startsWith("demo-prod-")), state.nle_catalog_v2_cities || []);
    if (total < 1) return res.status(400).json({ ok: false, error: "Invalid booking total." });

    const ref = `NLE-${new Date().getFullYear()}-${randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase()}`;
    const rows = await db.query("bookings", { method: "POST", body: {
      user_id: null,
      request_id: requestId,
      ref,
      customer_name: fullName,
      customer_phone: phone,
      alt_phone: clean(safeCustomer.altPhone, 20),
      city: clean(normalizedItems[0]?.city, 80),
      notes: clean(safeCustomer.notes, 400),
      items_json: normalizedItems,
      subtotal: total,
      discount: 0,
      total,
      payment_status: "not_required",
      booking_status: "pending",
    } });
    const booking = rows?.[0];
    if (!booking?.id) throw new Error("Booking was not created.");

    // Keep every submitted booking visible in the single CRM/Inquiries flow.
    const leadItem = normalizedItems[0] || {};
    try {
      await db.query("inquiries", {
        method: "POST",
        body: {
          name: fullName,
          phone,
          email: "",
          city: clean(leadItem.city, 80),
          event_type: clean(leadItem.eventType, 80) || "Event",
          event_date: clean(leadItem.eventDate, 10) || null,
          event_time: clean(leadItem.timeSlot, 80),
          event_venue: clean(leadItem.address, 160),
          event_location: clean(leadItem.locationType, 120) || clean(leadItem.city, 80),
          guest_count: clean(leadItem.guestCount, 60),
          budget: "",
          message: clean([leadItem.name, booking.notes].filter(Boolean).join(" — "), 2000) || "Booking submitted from the website.",
          status: "new_lead",
          admin_notes: `Booking reference: ${booking.ref}`,
          source: "booking",
          booking_id: booking.id,
        },
        prefer: "return=minimal",
      });
    } catch (leadError) {
      // Do not make a valid booking fail because the CRM mirror could not be created.
      console.error("Booking CRM lead creation failed:", leadError);
    }

    // The database write is authoritative. Notification failures are logged and
    // must never turn a successful booking into a customer-facing failure.
    try {
      await notifyBooking(booking, db);
    } catch (notifyError) {
      console.error("Booking notification error (booking was saved):", notifyError);
    }

    return res.status(201).json({ ok: true, bookingId: booking.id, ref, createdAt: booking.created_at, subtotal: total, discount: 0, total, bookingStatus: "pending", items: normalizedItems });
  } catch (err) {
    console.error("Create booking error:", err);
    // Only deliberate validation messages reach the browser; internal/database
    // error text is logged server-side and never echoed.
    if (isClientError(err)) return res.status(400).json({ ok: false, error: err.message });
    return res.status(500).json({ ok: false, error: "We couldn't complete your booking right now. Please try again in a moment." });
  }
}
