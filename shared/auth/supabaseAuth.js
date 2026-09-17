// Server-side Supabase JWT verification helpers.

export async function getSupabaseUser(env, authorization) {
  const url = (env.SUPABASE_URL || env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
  const key = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_SERVICE_ROLE_KEY || "";
  const token = String(authorization || "").replace(/^Bearer\s+/i, "").trim();
  if (!url || !key || !token) return null;
  const res = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: key, Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  try { return await res.json(); } catch { return null; }
}

export async function requireAdmin(env, authorization) {
  const user = await getSupabaseUser(env, authorization);
  if (!user?.id) return { user: null, error: "Authentication required." };
  const allowed = String(env.SUPABASE_ADMIN_EMAILS || "")
    .split(",").map((x) => x.trim().toLowerCase()).filter(Boolean);
  if (!allowed.includes(String(user.email || "").toLowerCase())) {
    return { user: null, error: "This account is not authorized for admin access." };
  }
  return { user, error: null };
}
