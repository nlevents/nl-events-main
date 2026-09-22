import { StrictMode } from 'react'
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
  // Supabase is the catalog source of truth. Hydrate immediately so the
  // storefront does not spend time showing stale/demo products, then poll
  // for changes so admin edits appear on other devices without a reload.
  import('./lib/catalogStore')
    .then(async ({ hydrateCatalogFromCloud }) => {
      try { await hydrateCatalogFromCloud(); } catch { /* keep empty/offline fallback */ }
      const { startPublicCatalogPolling } = await import('./lib/cloudStore');
      startPublicCatalogPolling(10000);
    })
    .catch(() => { /* offline fallback */ });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary fallback={rootFallback}>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
