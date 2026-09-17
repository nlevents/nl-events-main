// ============================================================================
// SERVER-SIDE SUPABASE REST CLIENT (Fetch-based, no SDK dependency required)
// Works seamlessly in Node.js, Vercel Serverless, and Cloudflare Workers
// ============================================================================

export function getServerSupabase(env) {
  const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY || "";

  if (!url || !key) {
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
          Authorization: `Bearer ${key}`,
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
