// Lightweight browser client for Supabase REST + Auth. Only the public
// project URL and anon key are ever bundled into the browser.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
const isPlaceholder = (value) => !value || /YOUR_PROJECT|YOUR_SUPABASE|your-project|fillyour/i.test(String(value));
export const isSupabaseConfigured = !isPlaceholder(SUPABASE_URL) && !isPlaceholder(SUPABASE_ANON_KEY);

function requireConfigured() {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured. Open .env.local and set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY with your real Supabase project values, then restart Vite.");
  }
}

class SupabaseClient {
  constructor(url, anonKey) { this.url = (url || "").replace(/\/$/, ""); this.anonKey = anonKey || ""; }
  getHeaders(token) { return { apikey: this.anonKey, Authorization: `Bearer ${token || this.anonKey}`, "Content-Type": "application/json", Prefer: "return=representation" }; }

  async from(table) {
    const self = this;
    return {
      async select(query = "*", { filters = {}, order = null, limit = null } = {}) {
        if (!self.url || !self.anonKey) return { data: [], error: null };
        const params = new URLSearchParams({ select: query, ...filters });
        if (order) params.set("order", order); if (limit) params.set("limit", String(limit));
        try { const res = await fetch(`${self.url}/rest/v1/${table}?${params}`, { headers: self.getHeaders() }); if (!res.ok) throw new Error(`Fetch failed (${res.status})`); return { data: await res.json(), error: null }; }
        catch (error) { return { data: null, error }; }
      },
      async insert(row) {
        try { const res = await fetch(`${self.url}/rest/v1/${table}`, { method: "POST", headers: self.getHeaders(), body: JSON.stringify(row) }); if (!res.ok) throw new Error(`Insert failed (${res.status})`); const data = await res.json(); return { data: data[0] || data, error: null }; }
        catch (error) { return { data: null, error }; }
      },
      async update(matchField, matchValue, patch) {
        try { const res = await fetch(`${self.url}/rest/v1/${table}?${matchField}=eq.${encodeURIComponent(matchValue)}`, { method: "PATCH", headers: self.getHeaders(), body: JSON.stringify(patch) }); if (!res.ok) throw new Error(`Update failed (${res.status})`); return { data: await res.json(), error: null }; }
        catch (error) { return { data: null, error }; }
      },
    };
  }

  async getUser(token) {
    requireConfigured();
    const res = await fetch(`${this.url}/auth/v1/user`, { headers: { apikey: this.anonKey, Authorization: `Bearer ${token}` } });
    const data = await res.json().catch(() => ({})); if (!res.ok) throw new Error(data.message || "Session expired."); return { user: data };
  }
  async signOut(token) { if (!token) return; await fetch(`${this.url}/auth/v1/logout`, { method: "POST", headers: { apikey: this.anonKey, Authorization: `Bearer ${token}` } }); }
  async updateUser(token, patch) {
    const res = await fetch(`${this.url}/auth/v1/user`, { method: "PUT", headers: { apikey: this.anonKey, Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(patch) });
    const data = await res.json().catch(() => ({})); if (!res.ok) throw new Error(data.message || "Unable to update account."); return data;
  }
  async signUpWithPassword(email, password, options = {}) {
    requireConfigured();
    const res = await fetch(`${this.url}/auth/v1/signup`, {
      method: "POST",
      headers: { apikey: this.anonKey, "Content-Type": "application/json" },
      body: JSON.stringify({ email: String(email || "").trim().toLowerCase(), password, data: options.data || {} }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data.error_description || data.msg || data.message || data.error;
      throw new Error(msg || `Unable to create account (HTTP ${res.status}).`);
    }
    return { session: data, user: data.user || null };
  }
  async signInWithPassword(email, password) {
    requireConfigured();
    const res = await fetch(`${this.url}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: this.anonKey, "Content-Type": "application/json" }, body: JSON.stringify({ email: String(email || "").trim().toLowerCase(), password }) });
    const data = await res.json().catch(() => ({})); if (!res.ok) throw new Error(data.error_description || data.msg || "Invalid email or password."); return { session: data, user: data.user || null };
  }
  async signInWithGoogle(redirectTo = window.location.href) {
    requireConfigured();
    const target = String(redirectTo || window.location.href);
    const url = new URL(`${this.url}/auth/v1/authorize`);
    url.searchParams.set("provider", "google");
    url.searchParams.set("redirect_to", target);
    window.location.assign(url.toString());
  }

  async resetPasswordForEmail(email) {
    requireConfigured();
    const res = await fetch(`${this.url}/auth/v1/recover`, {
      method: "POST",
      headers: { apikey: this.anonKey, "Content-Type": "application/json" },
      body: JSON.stringify({ email: String(email || "").trim().toLowerCase() }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error_description || data.msg || data.message || "Unable to send password reset email.");
    return data;
  }
  async refreshSession(refreshToken) {
    requireConfigured();
    const res = await fetch(`${this.url}/auth/v1/token?grant_type=refresh_token`, { method: "POST", headers: { apikey: this.anonKey, "Content-Type": "application/json" }, body: JSON.stringify({ refresh_token: refreshToken }) });
    const data = await res.json().catch(() => ({})); if (!res.ok) throw new Error(data.error_description || "Session expired."); return data;
  }
}
export const supabase = new SupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY);
