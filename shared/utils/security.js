// Abuse protection for public serverless endpoints.
// Layer 1 (here): best-effort in-memory limiter per instance, keyed on a
// client IP taken only from headers the hosting platform sets itself.
// Layer 2 (countRecent): database-backed counters that hold across instances.
const buckets = new Map();
const MAX_BUCKETS = 5000;

function headerValue(req, name) {
  const h = req?.headers || {};
  return String(h[name] ?? h[name.toLowerCase()] ?? "").trim();
}

// Prefer headers that the platform overwrites (Netlify / Vercel). The left-most
// X-Forwarded-For entry is client-controlled and spoofable, so the fallback
// uses the right-most entry, which is the one appended by the nearest proxy.
export function getClientIp(req) {
  for (const name of ["x-nf-client-connection-ip", "x-vercel-forwarded-for", "x-real-ip", "cf-connecting-ip"]) {
    const value = headerValue(req, name).split(",")[0].trim();
    if (value) return value.slice(0, 64);
  }
  const forwarded = headerValue(req, "x-forwarded-for").split(",").map((part) => part.trim()).filter(Boolean);
  if (forwarded.length) return forwarded[forwarded.length - 1].slice(0, 64);
  return String(req?.socket?.remoteAddress || "unknown").slice(0, 64);
}

function pruneBuckets(now) {
  if (buckets.size < MAX_BUCKETS) return;
  for (const [key, value] of buckets) if (value.resetAt <= now) buckets.delete(key);
  // Still too large (sustained flood): drop the oldest entries.
  if (buckets.size >= MAX_BUCKETS) {
    let remove = buckets.size - MAX_BUCKETS + 500;
    for (const key of buckets.keys()) { buckets.delete(key); if (--remove <= 0) break; }
  }
}

export function rateLimit(req, key, { limit = 8, windowMs = 15 * 60 * 1000 } = {}) {
  const now = Date.now();
  pruneBuckets(now);
  const bucketKey = `${key}:${getClientIp(req)}`;
  const existing = buckets.get(bucketKey);
  if (!existing || existing.resetAt <= now) {
    buckets.set(bucketKey, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSeconds: Math.ceil(windowMs / 1000) };
  }
  if (existing.count >= limit) {
    return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)) };
  }
  existing.count += 1;
  return { ok: true, retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)) };
}

// Counts rows created in the last `sinceMs` (stops counting at `cap`).
// Fails open: if the lookup errors, a real customer is never blocked.
export async function countRecent(db, table, extraQuery, sinceMs, cap) {
  try {
    const since = new Date(Date.now() - sinceMs).toISOString();
    const path = `${table}?created_at=gte.${encodeURIComponent(since)}${extraQuery || ""}&select=id&limit=${Number(cap) || 1}`;
    const rows = await db.query(path, { method: "GET" });
    return Array.isArray(rows) ? rows.length : 0;
  } catch (error) {
    console.warn(`Recent-count check skipped for ${table}:`, error?.message || error);
    return 0;
  }
}

export function isHoneypotTriggered(value) {
  return String(value ?? "").trim().length > 0;
}

export function safeHeaderValue(value, max = 200) {
  return String(value ?? "").replace(/[\r\n]/g, " ").slice(0, max);
}
