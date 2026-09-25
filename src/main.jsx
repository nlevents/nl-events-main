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

  const hydrate = () =>
    import('./lib/catalogStore')
      .then(({ hydrateCatalogFromCloud }) => hydrateCatalogFromCloud())
      .catch(() => { /* best-effort background hydration */ })

  // Do not compete with the first interaction/navigation for CPU, JSON parsing,
  // localStorage writes, or network bandwidth. Public catalog hydration is only
  // a cache refresh; the storefront already has its local/seed fallback.
  const scheduleHydration = () => {
    if (document.visibilityState === "hidden") {
      document.addEventListener("visibilitychange", scheduleHydration, { once: true });
      return;
    }
    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(hydrate, { timeout: 1500 });
    } else {
      window.setTimeout(hydrate, 300);
    }
  };

  scheduleHydration();
}

createRoot(document.getElementById('root')).render(
  <ErrorBoundary fallback={rootFallback}>
    <App />
  </ErrorBoundary>,
)
