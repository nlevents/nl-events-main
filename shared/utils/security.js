// Lightweight abuse protection for public serverless endpoints.
// This is intentionally dependency-free. Vercel instances are ephemeral, so
// this is best-effort protection; Supabase remains the source of truth.
const buckets = new Map();

function getClientIp(req) {
  const forwarded = req?.headers?.["x-forwarded-for"] || req?.headers?.["X-Forwarded-For"] || "";
  return String(forwarded).split(",")[0].trim() || String(req?.socket?.remoteAddress || "unknown");
}

export function rateLimit(req, key, { limit = 8, windowMs = 15 * 60 * 1000 } = {}) {
  const now = Date.now();
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

export function isHoneypotTriggered(value) {
  return String(value ?? "").trim().length > 0;
}

export function safeHeaderValue(value, max = 200) {
  return String(value ?? "").replace(/[\r\n]/g, " ").slice(0, max);
}
