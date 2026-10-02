import { getServerSupabase } from "./supabase/serverClient.js";

export async function readState(env, key, accessToken = "") {
  const db = getServerSupabase(env, accessToken);
  if (!db) return null;
  const rows = await db.query(`app_state?key=eq.${encodeURIComponent(key)}&select=key,data,updated_at`, { method: "GET" });
  return rows?.[0]?.data ?? null;
}

export async function readStates(env, keys, accessToken = "") {
  const db = getServerSupabase(env, accessToken);
  if (!db) return {};
  const params = keys.map((k) => `"${String(k).replaceAll('"', '\\"')}"`).join(",");
  const rows = await db.query(`app_state?key=in.(${params})&select=key,data,updated_at`, { method: "GET" });
  return Object.fromEntries((rows || []).map((r) => [r.key, r.data]));
}


export async function readStateUpdatedAt(env, key, accessToken = "") {
  const db = getServerSupabase(env, accessToken);
  if (!db) return null;
  const rows = await db.query(`app_state?key=eq.${encodeURIComponent(key)}&select=key,updated_at`, { method: "GET" });
  return rows?.[0]?.updated_at ?? null;
}

export async function readStateVersions(env, keys, accessToken = "") {
  const db = getServerSupabase(env, accessToken);
  if (!db || !Array.isArray(keys) || !keys.length) return {};
  const params = keys.map((key) => `"${String(key).replaceAll('"', '\\"')}"`).join(",");
  const rows = await db.query(`app_state?key=in.(${params})&select=key,updated_at`, { method: "GET" });
  return Object.fromEntries((rows || []).filter((row) => row?.key && row?.updated_at).map((row) => [row.key, row.updated_at]));
}

export async function writeState(env, key, data, userId = null, expectedUpdatedAt = null, accessToken = "") {
  const db = getServerSupabase(env, accessToken);
  if (!db) throw new Error("Supabase is not configured on the server.");

  const updatedAt = new Date().toISOString();
  const body = { key, data, updated_at: updatedAt, updated_by: userId };

  // When the client knows the version it last read, use a conditional PATCH.
  // PostgREST evaluates the updated_at predicate in the database, preventing
  // one admin from silently overwriting another admin's newer catalog.
  if (expectedUpdatedAt) {
    const filter = `key=eq.${encodeURIComponent(key)}&updated_at=eq.${encodeURIComponent(expectedUpdatedAt)}`;
    const rows = await db.query(`app_state?${filter}`, {
      method: "PATCH",
      prefer: "return=representation",
      body: { data, updated_at: updatedAt, updated_by: userId },
    });
    if (!Array.isArray(rows) || rows.length === 0) {
      throw new Error("This catalog was changed by another admin. Please refresh the Admin Panel and try again.");
    }
    return { key, updatedAt: rows[0]?.updated_at || updatedAt };
  }

  // First-time writes still use an atomic upsert when there is no known
  // version (for example, a brand-new app_state bucket).
  await db.query("app_state?on_conflict=key", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=minimal",
    body,
  });
  return { key, updatedAt };
}

export async function writeMissingStates(env, state, userId = null, accessToken = "") {
  const db = getServerSupabase(env, accessToken);
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
