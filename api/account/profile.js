import { getSupabaseUser } from "../../shared/auth/supabaseAuth.js";
import { getServerSupabase } from "../../shared/supabase/serverClient.js";

export default async function handler(req, res) {
  const user = await getSupabaseUser(process.env, req.headers.authorization);
  if (!user?.id) return res.status(401).json({ error: "Authentication required." });
  const db = getServerSupabase(process.env);
  if (!db) return res.status(500).json({ error: "Supabase is not configured." });
  try {
    if (req.method === "GET") {
      const rows = await db.query(`profiles?user_id=eq.${encodeURIComponent(user.id)}&select=user_id,name,email,phone`, { method: "GET" });
      const p = rows?.[0] || {};
      return res.status(200).json({ id: user.id, phone: user.phone || p.phone || "", name: p.name || user.user_metadata?.name || "", email: p.email || user.email || "" });
    }
    if (req.method === "POST") {
      const name = String(req.body?.name || "").trim().slice(0, 80);
      const email = String(req.body?.email || "").trim().slice(0, 120);
      if (email && !/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: "Enter a valid email address." });
      const rows = await db.query("profiles", { method: "POST", body: { user_id: user.id, phone: user.phone || "", name, email, updated_at: new Date().toISOString() }, prefer: "resolution=merge-duplicates,return=representation" });
      const p = rows?.[0] || {};
      return res.status(200).json({ id: user.id, phone: user.phone || p.phone || "", name, email });
    }
    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("Profile API error:", err);
    return res.status(500).json({ error: "Unable to update profile." });
  }
}
