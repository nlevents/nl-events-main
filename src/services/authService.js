// ============================================================================
// AUTH SERVICE (Supabase Auth Client)
// ============================================================================

import { supabase, isSupabaseConfigured } from "../lib/supabase";

export async function getCurrentUser() {
  if (!isSupabaseConfigured) return null;
  return null;
}
