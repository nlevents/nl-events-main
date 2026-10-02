// ============================================================================
// SERVER-SIDE SUPABASE REST CLIENT (Fetch-based, no SDK dependency required)
// Works seamlessly in Node.js, Vercel Serverless, and Cloudflare Workers
// ============================================================================

export function getServerSupabase(env, accessToken = "") {
  const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  // Prefer the server-only service-role key. When it is not available (for
  // example, a local/Vercel setup that only has the public Supabase vars),
  // fall back to the public anon key and, for authenticated admin requests,
  // the caller's access token. This keeps the service-role key out of the
  // browser while allowing the API to use the same Supabase project config.
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || "";
  const publicKey = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || "";
  const key = serviceKey || publicKey;
  const authorizationKey = serviceKey || accessToken || publicKey;

  if (!url || !key || !authorizationKey) {
    return null;
  }

  const base = url.replace(/\/$/, "");

  return {
    async query(path, options = {}) {
      const { method = "GET", body, headers = {}, params = {} } = options;
      const queryParams = new URLSearchParams(params).toString();
      const endpoint = `${base}/rest/v1/${path}${queryParams ? `?${queryParams}` : ""}`;

      const res = await fetch(endpoint, {
        method,
        headers: {
          apikey: key,
          Authorization: `Bearer ${authorizationKey}`,
          "Content-Type": "application/json",
          Prefer: options.prefer || "return=representation",
          ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!res.ok) {
        let errData = null;
        try {
          errData = await res.json();
        } catch {
          // ignore
        }
        throw new Error(errData?.message || `Supabase error (${res.status}): ${res.statusText}`);
      }

      try {
        return await res.json();
      } catch {
        return null;
      }
    },
  };
}
