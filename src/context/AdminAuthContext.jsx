import { createContext, useCallback, useEffect, useContext, useState } from "react";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { hydrateAdminState, bootstrapAdminState } from "../lib/cloudStore";

const SESSION_KEY = "nle-admin-supabase-session";
const AdminAuthContext = createContext(null);

function readSession() {
  try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null"); } catch { return null; }
}
function writeSession(session) {
  try {
    if (session) sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else sessionStorage.removeItem(SESSION_KEY);
  } catch { /* private mode */ }
}

export function AdminAuthProvider({ children }) {
  const [ready, setReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [user, setUser] = useState(null);

  const establish = useCallback(async (session) => {
    if (!session?.access_token) return false;
    try {
      const current = await supabase.getUser(session.access_token);
      if (!current?.user) return false;
      writeSession(session);
      setUser(current.user);
      setAuthenticated(true);
      // Authentication is authoritative. Cloud-state hydration is optional and
      // must never turn a valid admin login into a logged-out state.
      try {
        await hydrateAdminState();
        await bootstrapAdminState();
        await hydrateAdminState();
      } catch (cloudError) {
        console.warn("Admin cloud-state sync skipped:", cloudError?.message || cloudError);
      }
      return true;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const saved = readSession();
      if (!saved) { if (!cancelled) setReady(true); return; }
      const ok = await establish(saved);
      if (!ok) writeSession(null);
      if (!cancelled) setReady(true);
    })();
    return () => { cancelled = true; };
  }, [establish]);

  const login = useCallback(async (email, password) => {
    if (!isSupabaseConfigured) {
      console.warn("Admin login blocked: Supabase environment variables are not configured.");
      return { ok: false, error: "Supabase is not configured. Fill in .env.local and restart Vite." };
    }
    try {
      const result = await supabase.signInWithPassword(email, password);
      const established = await establish(result.session);
      if (!established) return { ok: false, error: "These credentials are valid, but this account is not authorized for the admin panel." };
      return { ok: true };
    } catch (err) {
      console.warn("Admin login failed:", err.message);
      return { ok: false, error: err.message || "Invalid email or password." };
    }
  }, [establish]);

  useEffect(() => {
    if (!authenticated) return undefined;
    const id = window.setInterval(async () => {
      const saved = readSession();
      if (!saved?.refresh_token && !saved?.refreshToken) return;
      try {
        const refreshed = await supabase.refreshSession(saved.refresh_token || saved.refreshToken);
        writeSession(refreshed);
      } catch {
        // Session will be rejected by the server on the next admin request.
      }
    }, 45 * 60 * 1000);
    return () => window.clearInterval(id);
  }, [authenticated]);

  const logout = useCallback(async () => {
    const session = readSession();
    try { if (session?.access_token) await supabase.signOut(session.access_token); } catch { /* best effort */ }
    writeSession(null);
    setUser(null);
    setAuthenticated(false);
  }, []);

  const changePassword = useCallback(async (_oldPassword, newPassword) => {
    if (!newPassword || newPassword.length < 8) return false;
    try {
      const session = readSession();
      if (!session?.access_token) return false;
      await supabase.updateUser(session.access_token, { password: newPassword });
      return true;
    } catch { return false; }
  }, []);

  return (
    <AdminAuthContext.Provider value={{ ready, hasPassword: true, authenticated, user, setup: async () => false, login, logout, changePassword }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() { return useContext(AdminAuthContext); }
