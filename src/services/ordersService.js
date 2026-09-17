// ============================================================================
// ORDERS & INVOICES SERVICE
// Interacts with Supabase orders and invoices
// ============================================================================

import { supabase, isSupabaseConfigured } from "../lib/supabase";

export async function fetchInvoices() {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase.from("invoices").select("*", {
    order: "created_at.desc",
  });
  return error ? [] : data || [];
}
