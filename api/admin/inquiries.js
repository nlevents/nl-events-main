import { requireAdmin } from "../../shared/auth/supabaseAuth.js";
import { getServerSupabase } from "../../shared/supabase/serverClient.js";

const STAGES = ["new_lead", "discovery_call", "meeting_scheduled", "quotation_sent", "deal_closed"];
function clean(value, max = 1000) { return String(value ?? "").trim().slice(0, max); }

async function auth(req, res) {
  const result = await requireAdmin(process.env, req.headers?.authorization);
  if (!result.user) { res.status(401).json({ ok: false, error: result.error }); return null; }
  return result.user;
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
      return res.status(200).json({ ok: true, inquiries: rows, bookings: bookings || [] });
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
