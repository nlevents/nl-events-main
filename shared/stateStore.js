import { getServerSupabase } from "./supabase/serverClient.js";

export async function readState(env, key) {
  const db = getServerSupabase(env);
  if (!db) return null;
  const rows = await db.query(`app_state?key=eq.${encodeURIComponent(key)}&select=key,data,updated_at`, { method: "GET" });
  return rows?.[0]?.data ?? null;
}

export async function readStates(env, keys) {
  const db = getServerSupabase(env);
  if (!db) return {};
  const params = keys.map((k) => `"${String(k).replaceAll('"', '\\"')}"`).join(",");
  const rows = await db.query(`app_state?key=in.(${params})&select=key,data,updated_at`, { method: "GET" });
  return Object.fromEntries((rows || []).map((r) => [r.key, r.data]));
}

export async function writeState(env, key, data, userId = null) {
  const db = getServerSupabase(env);
  if (!db) throw new Error("Supabase is not configured on the server.");
  try {
    const rows = await db.query(`app_state?key=eq.${encodeURIComponent(key)}`, {
      method: "PATCH",
      body: { data, updated_at: new Date().toISOString(), updated_by: userId },
    });
    if (Array.isArray(rows) && rows.length) return rows[0];
  } catch { /* row may not exist */ }
  const rows = await db.query("app_state", {
    method: "POST",
    body: { key, data, updated_by: userId },
  });
  return rows?.[0] || rows;
}

export async function writeMissingStates(env, state, userId = null) {
  const db = getServerSupabase(env);
  if (!db) throw new Error("Supabase is not configured on the server.");
  const existing = await db.query("app_state?select=key", { method: "GET" });
  const keys = new Set((existing || []).map((r) => r.key));
  const inserted = [];
  for (const [key, data] of Object.entries(state || {})) {
    if (keys.has(key)) continue;
    await db.query("app_state", { method: "POST", body: { key, data, updated_by: userId } });
    inserted.push(key);
  }
  return inserted;
}
