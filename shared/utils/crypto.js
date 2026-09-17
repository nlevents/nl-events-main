// ============================================================================
// CROSS-PLATFORM CRYPTO UTILITIES (Node.js & Web Crypto standard)
// Compatible with Node 18+, Vercel Serverless, and Cloudflare Workers runtime
// ============================================================================

/**
 * Computes HMAC-SHA256 hex digest using standard Web Crypto API.
 * @param {string} key
 * @param {string} data
 * @returns {Promise<string>} Hex encoded HMAC signature
 */
export async function createHmacSha256(key, data) {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key);
  const messageData = encoder.encode(data);

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signatureBuffer = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
  const signatureBytes = new Uint8Array(signatureBuffer);

  return Array.from(signatureBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Constant-time equality comparison to protect against timing attacks.
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
export function timingSafeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
