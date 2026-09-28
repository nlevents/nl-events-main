import { createRoot } from 'react-dom/client'
import './styles/style.css'
import './styles/responsive.css'
import './styles/shop.css'
import './styles/nav-mega.css'
import './styles/occasion.css'
import './styles/occasion-landing.css'
import './styles/products.css'
import './styles/chatbot.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { isChunkLoadError, recoverFromChunkLoadError } from './lib/lazyWithRetry'
const rootFallback = (
  <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 24, fontFamily: 'system-ui, sans-serif' }}>
    <div>
      <p style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Something went wrong.</p>
      <p style={{ color: '#5b6b80', marginBottom: 16 }}>Please refresh the page, or call us at +91 7903 133 317.</p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        style={{ padding: '10px 20px', borderRadius: 999, border: 0, background: '#c19743', color: '#faf7f0', fontWeight: 600, cursor: 'pointer' }}
      >
        Reload page
      </button>
    </div>
  </div>
)

if (typeof window !== "undefined") {
  // Older builds appended ?nle_reload=<timestamp> to the URL while trying to
  // bust a stale cache. Remove it so it never ends up in canonical URLs,
  // shared links or analytics.
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.has("nle_reload")) {
      url.searchParams.delete("nle_reload");
      window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
    }
  } catch { /* cosmetic only */ }

  // Vite fires this when a preloaded chunk/CSS file 404s — the signature of a
  // tab that was opened before a new deployment. Reload (once, and only when
  // the server really has a newer build) so it picks up the new index.html.
  window.addEventListener("vite:preloadError", () => { recoverFromChunkLoadError(); });
  window.addEventListener("unhandledrejection", (event) => {
    if (isChunkLoadError(event?.reason)) {
      event.preventDefault();
      recoverFromChunkLoadError();
    }
  });

  // The public storefront has a local/seed fallback, so cloud hydration does
  // not need to compete with the first render. Run it when the browser is idle.
  const PUBLIC_CATALOG_KEYS = new Set([
    "nle_catalog_v2_products",
    "nle_catalog_v2_occasions",
    "nle_catalog_v2_media",
    "nle_catalog_v2_gallery",
    "nle_catalog_v2_insta_videos",
    "nle_catalog_v2_video_reviews",
    "nle_catalog_v2_cities",
    "nle_catalog_v2_addons",
    "nle_catalog_v2_birthday_age_categories",
  ]);

  // Admin and public pages can be open in separate tabs. localStorage changes
  // already cross the tab boundary, but the existing UI refresh event does not.
  // Bridge that native browser event into the catalog's normal update event so
  // category/product additions, edits and deletions appear immediately.
  window.addEventListener("storage", (event) => {
    if (event.key && PUBLIC_CATALOG_KEYS.has(event.key)) {
      window.dispatchEvent(new CustomEvent("nle-catalog-updated"));
    }
  });

  // Keep the storefront connected to the admin catalog across tabs, browsers
  // and devices. Polling checks only tiny version metadata; the large product
  // catalog is downloaded only when its cloud version actually changes.
  const startCatalogSync = () =>
    import('./lib/cloudStore')
      .then(({ startPublicCatalogSync }) => startPublicCatalogSync({ intervalMs: 120000 }))
      .catch(() => { /* best-effort background synchronization */ });

  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(startCatalogSync, { timeout: 1500 });
  } else {
    window.setTimeout(startCatalogSync, 300);
  }
}

createRoot(document.getElementById('root')).render(
  <ErrorBoundary fallback={rootFallback}>
    <App />
  </ErrorBoundary>,
)
