// SHA-256 hashing for the admin password gate, via the browser's built-in
// Web Crypto API — no external crypto library needed (zero dependencies,
// zero cost). See AdminAuthContext.jsx and /ADMIN_README.md for what this
// gate does and does NOT protect against — hashing the password just avoids
// storing it in plain text; it does not make a client-side-only gate secure
// against someone with devtools access to this browser.
export async function sha256Hex(text) {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
