// ============================================================================
// BOOKINGS SERVICE (Supabase + Fallback)
// ============================================================================

import { supabase, isSupabaseConfigured } from "../lib/supabase";

export async function createBookingRecord(bookingData) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from("bookings").insert({
      ref: bookingData.ref,
      customer_name: bookingData.customer?.fullName || "",
      customer_phone: bookingData.customer?.phone || "",
      alt_phone: bookingData.customer?.altPhone || "",
      city: bookingData.city || (bookingData.items?.[0]?.city) || "Ranchi",
      notes: bookingData.notes || "",
      items_json: bookingData.items || [],
      subtotal: bookingData.subtotal || 0,
      discount: bookingData.discount || 0,
      total: bookingData.total || 0,
      payment_status: "pending",
      booking_status: "pending",
    });

    if (error) {
      console.warn("Supabase booking insert notice:", error);
    } else if (data && data.id) {
      return { id: data.id, ref: data.ref };
    }
  }

  // Graceful fallback for offline / preview
  return { id: `bk_${Date.now()}`, ref: bookingData.ref };
}

export async function getBookingByRef(ref) {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase.from("bookings").select("*", {
    filters: { ref: `eq.${ref}` },
    limit: 1,
  });
  return error ? null : data?.[0] || null;
}
