import { lazy } from "react";

// ---------------------------------------------------------------------------
// Why this exists
// ---------------------------------------------------------------------------
// Vite content-hashes every JS chunk (Admin-AbC123.js). After a new deploy the
// old chunk files no longer exist on the server. A tab that was opened *before*
// the deploy still holds the old entry bundle, so its lazy imports point at
// files that are gone and fail with "Failed to fetch dynamically imported
// module". Two things can be true when an import fails:
//
//   1. The site was redeployed  -> retrying can never work; the tab must load
//      the new index.html (a single, guarded reload).
//   2. The network blipped      -> a short retry usually fixes it; reloading
//      would just throw away the user's state for nothing.
//
// So we retry first, and only reload when we can PROVE a newer build exists.
// We never reload blindly, never loop, and never touch the URL.
// ---------------------------------------------------------------------------

const RELOAD_AT_KEY = "nle-stale-build-reload-at";
const RELOAD_COOLDOWN_MS = 60 * 1000;
const RETRY_DELAYS_MS = [350, 900];

export function isChunkLoadError(error) {
  const message = String(error?.message || error || "");
  return /dynamically imported module|importing a module script failed|failed to fetch|load failed|loading chunk|loading css chunk|unable to preload|is not a valid javascript mime type|mime type/i.test(message);
}

function runningEntryPath() {
  if (typeof document === "undefined") return null;
  const script = Array.from(document.scripts).find((s) => /\/assets\/index-[^/]+\.js(\?|$)/.test(s.src || ""));
  if (!script) return null; // dev server, or an unusual host: nothing to compare
  try { return new URL(script.src).pathname; } catch { return null; }
}

// True only when the server now serves a different entry bundle than the one
// this tab is running, i.e. a new deployment has happened.
export async function newerBuildExists() {
  const running = runningEntryPath();
  if (!running) return false;
  try {
    const res = await fetch(`/index.html?nle_v=${Date.now()}`, { cache: "no-store", credentials: "same-origin" });
    if (!res.ok) return false;
    const html = await res.text();
    const match = html.match(/\/assets\/index-[^"'\s]+\.js/);
    return Boolean(match) && match[0] !== running;
  } catch {
    return false; // offline: not a stale-build problem
  }
}

// One guarded reload. The cool-down makes an endless reload loop impossible
// even if the server keeps returning a bundle that disagrees with itself.
function reloadOncePerCooldown() {
  if (typeof window === "undefined") return false;
  try {
    const last = Number(sessionStorage.getItem(RELOAD_AT_KEY) || 0);
    if (last && Date.now() - last < RELOAD_COOLDOWN_MS) return false;
    sessionStorage.setItem(RELOAD_AT_KEY, String(Date.now()));
  } catch {
    return false; // storage blocked: we can't guard against a loop, so don't reload
  }
  window.location.reload();
  return true;
}

export async function recoverIfNewBuild() {
  if (await newerBuildExists()) return reloadOncePerCooldown();
  return false;
}

export async function recoverFromChunkLoadError() {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return false;
  if (await newerBuildExists()) return reloadOncePerCooldown();
  return reloadOncePerCooldown();
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function lazyWithRetry(importer) {
  return lazy(async () => {
    let lastError;
    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
      try {
        return await importer();
      } catch (error) {
        lastError = error;
        if (!isChunkLoadError(error)) throw error; // a real bug in the page: surface it
        if (attempt < RETRY_DELAYS_MS.length) await sleep(RETRY_DELAYS_MS[attempt]);
      }
    }
    if (await recoverFromChunkLoadError()) {
      // The browser is navigating to the fresh document; keep React suspended.
      return new Promise(() => {});
    }
    throw lastError;
  });
}
