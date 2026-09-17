// ============================================================================
// CUSTOMER AUTH — Supabase Google OAuth
// Customer authentication uses Google only. Phone remains a booking/contact field.
// ============================================================================

import { supabase } from "./supabase";
const API_BASE = import.meta.env.VITE_API_URL || "/api";

async function buildProfile(session, fallbackUser = null) {
  const user = fallbackUser || session?.user;
  if (!session?.access_token || !user?.id) throw new Error("Authentication failed. Please try again.");
  let profile = {
    id: user.id,
    phone: user.phone || "",
    name: user.user_metadata?.full_name || user.user_metadata?.name || "",
    email: user.email || "",
    createdAt: user.created_at || "",
  };
  try {
    const res = await fetch(`${API_BASE}/account/profile`, { headers: { Authorization: `Bearer ${session.access_token}` } });
    if (res.ok) profile = await res.json();
  } catch { /* profile can be completed later */ }
  return { user: profile, token: session.access_token, refreshToken: session.refresh_token, session, isNewAccount: !profile.name };
}

export async function loginWithGoogle(redirectTo) {
  const target = redirectTo || `${window.location.origin}/login`;
  await supabase.signInWithGoogle(target);
}

export async function completeOAuthSession(accessToken, refreshToken) {
  if (!accessToken) throw new Error("Google sign-in did not return a session.");
  const { user } = await supabase.getUser(accessToken);
  return buildProfile({ access_token: accessToken, refresh_token: refreshToken }, user);
}

export async function refreshSession(refreshToken) {
  const session = await supabase.refreshSession(refreshToken);
  return { token: session.access_token, refreshToken: session.refresh_token };
}
export async function logoutRequest(token) { await supabase.signOut(token); return { ok: true }; }
export async function fetchProfile(token) {
  const res = await fetch(`${API_BASE}/account/profile`, { headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Session expired.");
  return data;
}
export async function updateProfile(token, _email, patch) {
  const clean = { name: String(patch.name || "").trim().slice(0, 80), email: String(patch.email || "").trim().slice(0, 120) };
  if (clean.email && !validateEmail(clean.email)) throw new Error("Enter a valid email address.");
  const res = await fetch(`${API_BASE}/account/profile`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(clean) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Unable to update profile.");
  return data;
}
export async function fetchBookings(token) {
  const res = await fetch(`${API_BASE}/account/bookings`, { headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Unable to load bookings.");
  return data.bookings || [];
}
