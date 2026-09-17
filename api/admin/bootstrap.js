import { requireAdmin } from "../../shared/auth/supabaseAuth.js";
import { writeMissingStates } from "../../shared/stateStore.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });
  const result = await requireAdmin(process.env, req.headers.authorization);
  if (!result.user) return res.status(401).json({ ok: false, error: result.error });
  try {
    const inserted = await writeMissingStates(process.env, req.body?.state || {}, result.user.id);
    return res.status(200).json({ ok: true, inserted });
  } catch (err) {
    console.error("Admin bootstrap API error:", err);
    const message = String(err?.message || "");
    if (message.includes("Supabase is not configured on the server")) {
      return res.status(503).json({ ok: false, error: "Admin cloud storage is not configured. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to the Vercel environment variables, then redeploy." });
    }
    return res.status(500).json({ ok: false, error: message || "Unable to initialize cloud data." });
  }
}
