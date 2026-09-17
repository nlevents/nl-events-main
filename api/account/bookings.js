import { getSupabaseUser } from "../../shared/auth/supabaseAuth.js";
import { getServerSupabase } from "../../shared/supabase/serverClient.js";
export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const user = await getSupabaseUser(process.env, req.headers.authorization);
  if (!user?.id) return res.status(401).json({ error: "Authentication required." });
  const db = getServerSupabase(process.env);
  if (!db) return res.status(500).json({ error: "Supabase is not configured." });
  try {
    const rows = await db.query(`bookings?user_id=eq.${encodeURIComponent(user.id)}&select=*&order=created_at.desc`, { method: "GET" });
    return res.status(200).json({ bookings: rows || [] });
  } catch (err) {
    console.error("Account bookings API error:", err);
    return res.status(500).json({ error: "Unable to load bookings." });
  }
}
