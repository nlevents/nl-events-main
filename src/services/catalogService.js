// ============================================================================
// CATALOG SERVICE (Supabase + Local Catalog Fallback)
// Provides products, categories, and packages
// ============================================================================

import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { getProducts as getLocalProducts, getCategories as getLocalCategories } from "../lib/catalogStore";

export async function fetchAllProducts() {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from("products").select("*", {
      filters: { status: "eq.active" },
    });
    if (!error && Array.isArray(data) && data.length > 0) {
      return data;
    }
  }
  // Local store fallback
  return getLocalProducts();
}

export async function fetchAllCategories() {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from("categories").select("*");
    if (!error && Array.isArray(data) && data.length > 0) {
      return data;
    }
  }
  return getLocalCategories();
}
