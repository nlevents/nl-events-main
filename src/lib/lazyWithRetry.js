import { lazy } from "react";

const RECOVERY_KEY = "nle-lazy-chunk-recovery";

function isChunkLoadError(error) {
  const message = String(error?.message || error || "");
  return /chunk|dynamically imported module|failed to fetch|importing a module script failed|load failed/i.test(message);
}

function recoverFromStaleChunk() {
  if (typeof window === "undefined") return false;

  try {
    if (sessionStorage.getItem(RECOVERY_KEY) === "1") {
      sessionStorage.removeItem(RECOVERY_KEY);
      return false;
    }
    sessionStorage.setItem(RECOVERY_KEY, "1");
  } catch {
    return false;
  }

  // A deployment can leave an old index.html cached on a phone while its
  // hashed route chunks have already been replaced. A normal reload can then
  // keep serving that stale HTML. Adding a one-time cache-busting query makes
  // the browser request the current index.html and its current chunk names.
  const url = new URL(window.location.href);
  url.searchParams.set("nle_reload", String(Date.now()));
  window.location.replace(url.toString());
  return true;
}

export function lazyWithRetry(importer) {
  return lazy(async () => {
    try {
      const module = await importer();
      try { sessionStorage.removeItem(RECOVERY_KEY); } catch { /* cache only */ }
      return module;
    } catch (error) {
      if (isChunkLoadError(error) && recoverFromStaleChunk()) {
        // Keep React waiting while the browser navigates to the fresh document.
        return new Promise(() => {});
      }
      throw error;
    }
  });
}
