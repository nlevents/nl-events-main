import React, { Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import ErrorBoundary from "./components/ErrorBoundary";
import Layout from "./components/Layout";
import { ThemeProvider } from "./context/ThemeContext";
import { CityProvider } from "./context/CityContext";
import { CartProvider } from "./context/CartContext";
import { ToastProvider } from "./context/ToastContext";
import { ChatbotProvider } from "./context/ChatbotContext";
import { AdminAuthProvider } from "./context/AdminAuthContext";
import { lazyWithRetry } from "./lib/lazyWithRetry";
import { isAnalyticsPublicPath, trackEvent, trackPageView } from "./lib/siteEvents";

// Route-level code splitting: each page is fetched only when visited,
// keeping the initial JS payload small.
import Landing from "./pages/Landing.jsx";
import Home from "./pages/Home.jsx";
import Services from "./pages/Services.jsx";
import Products from "./pages/Products.jsx";
import Packages from "./pages/Packages.jsx";
import PackageDetails from "./pages/PackageDetails.jsx";
import ShopByOccasion from "./pages/ShopByOccasion.jsx";
import OccasionBrowser from "./pages/OccasionBrowser.jsx";
import Wedding from "./pages/Wedding.jsx";
import Birthday from "./pages/Birthday.jsx";
import OccasionLanding from "./pages/OccasionLanding.jsx";
import Gallery from "./pages/Gallery.jsx";
import About from "./pages/About.jsx";
import Contact from "./pages/Contact.jsx";
import BookEvent from "./pages/BookEvent.jsx";
import BookingSuccess from "./pages/BookingSuccess";
import Cart from "./pages/Cart.jsx";
import Checkout from "./pages/Checkout.jsx";
import BookingConfirmation from "./pages/BookingConfirmation";
import Terms from "./pages/Terms.jsx";
import Privacy from "./pages/Privacy.jsx";
import NotFound from "./pages/NotFound.jsx";


// Admin panel — not linked from the public navigation.
const AdminLayout = lazyWithRetry(() => import("./pages/admin/AdminLayout"));
const AdminLogin = lazyWithRetry(() => import("./pages/admin/AdminLogin"));
const AdminDashboard = lazyWithRetry(() => import("./pages/admin/AdminDashboard"));
const AdminProducts = lazyWithRetry(() => import("./pages/admin/AdminProducts"));
const AdminCatalog = lazyWithRetry(() => import("./pages/admin/AdminCatalog"));
const AdminFinancialReports = lazyWithRetry(() => import("./pages/admin/AdminFinancialReports"));
const AdminProductForm = lazyWithRetry(() => import("./pages/admin/AdminProductForm"));
const AdminCategories = lazyWithRetry(() => import("./pages/admin/AdminCategories"));
const AdminBirthdayAgeCategories = lazyWithRetry(() => import("./pages/admin/AdminBirthdayAgeCategories"));
const AdminMedia = lazyWithRetry(() => import("./pages/admin/AdminMedia"));
const AdminVideoContent = lazyWithRetry(() => import("./pages/admin/AdminVideoContent"));
const AdminCoupons = lazyWithRetry(() => import("./pages/admin/AdminCoupons"));
const AdminAvailability = lazyWithRetry(() => import("./pages/admin/AdminAvailability"));
const AdminInquiries = lazyWithRetry(() => import("./pages/admin/AdminInquiries"));
const AdminLeadDetails = lazyWithRetry(() => import("./pages/admin/AdminLeadDetails"));
const AdminClients = lazyWithRetry(() => import("./pages/admin/AdminClients"));
const AdminInvoices = lazyWithRetry(() => import("./pages/admin/AdminInvoices"));
const AdminInvoiceForm = lazyWithRetry(() => import("./pages/admin/AdminInvoiceForm"));
const AdminInvoiceView = lazyWithRetry(() => import("./pages/admin/AdminInvoiceView"));
const AdminSettings = lazyWithRetry(() => import("./pages/admin/AdminSettings"));
const AdminPlaceholder = lazyWithRetry(() => import("./pages/admin/AdminPlaceholder"));

function AnalyticsTracker() {
  const location = useLocation();

  React.useEffect(() => {
    if (!isAnalyticsPublicPath(location.pathname)) return;
    trackPageView(location);
  }, [location]);

  React.useEffect(() => {
    if (!isAnalyticsPublicPath(location.pathname)) return undefined;

    const onClick = (event) => {
      const target = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!target) return;
      const href = target.getAttribute("href") || "";
      const text = (target.textContent || "").replace(/\s+/g, " ").trim().slice(0, 100);
      const lowerHref = href.toLowerCase();
      const lowerText = text.toLowerCase();

      if (lowerHref.startsWith("tel:")) {
        trackEvent("phone_click", { source: "link", link_text: text || "phone" });
      } else if (lowerHref.includes("wa.me/") || lowerHref.includes("whatsapp.com/")) {
        trackEvent("whatsapp_click", { source: "link", link_text: text || "whatsapp" });
      } else if (href === "/book-event" || href.startsWith("/book-event?") || lowerText === "book event") {
        trackEvent("book_event_click", { source: "link", link_text: text || "Book Event" });
      }

      const isExternal = /^https?:\/\//i.test(href) && !href.startsWith(window.location.origin);
      if (isExternal && !lowerHref.includes("wa.me/") && !lowerHref.includes("whatsapp.com/")) {
        trackEvent("outbound_click", { link_url: href, link_text: text || undefined });
      }
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [location.pathname]);

  return null;
}

function RouteFallback() {
  return (
    <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }} aria-busy="true" aria-live="polite">
      <span style={{ color: "var(--text-secondary, #5b6b80)" }}>Loading…</span>
    </div>
  );
}

// Wraps every route (including admin and landing, which sit outside <Layout>).
// Resets on navigation so a failed lazy chunk or a crashing page never traps the
// user on an error screen.
function RouteBoundary({ children }) {
  const { pathname } = useLocation();
  return (
    <ErrorBoundary
      resetKey={pathname}
      autoRetry={2}
      fallback={({ reset }) => (
        <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 24, fontFamily: "system-ui, sans-serif" }} role="alert">
          <div>
            <p style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Something went wrong.</p>
            <p style={{ color: "#5b6b80", marginBottom: 16 }}>This page could not be loaded. Please try again.</p>
            <button type="button" onClick={reset} style={{ padding: "10px 20px", borderRadius: 999, border: 0, background: "#c19743", color: "#faf7f0", fontWeight: 600, cursor: "pointer" }}>Try again</button>
          </div>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <CityProvider>
        <ToastProvider>
          <CartProvider>
            <ChatbotProvider>
            <BrowserRouter>
              <AnalyticsTracker />
              <RouteBoundary>
              <Suspense fallback={<RouteFallback />}>
                <Routes>
                  <Route path="/admin/login" element={<AdminAuthProvider><AdminLogin /></AdminAuthProvider>} />
                  <Route path="/admin" element={<AdminAuthProvider><AdminLayout /></AdminAuthProvider>}>
                    <Route index element={<AdminDashboard />} />
                    <Route path="products" element={<AdminCatalog />} />
                    <Route path="products/new" element={<AdminProductForm />} />
                    <Route path="products/:id/edit" element={<AdminProductForm />} />
                    <Route path="categories" element={<AdminCategories />} />
                    <Route path="birthday-age-categories" element={<AdminBirthdayAgeCategories />} />
                    <Route path="media" element={<AdminMedia />} />
                    <Route path="video-content" element={<AdminVideoContent />} />
                    <Route path="coupons" element={<AdminCoupons />} />
                    <Route path="services" element={<Navigate to="/admin/products?tab=services" replace />} />
                    <Route path="addons" element={<Navigate to="/admin/products?tab=services" replace />} />
                    <Route path="services/products/new" element={<AdminProductForm />} />
                    <Route path="addons/products/new" element={<AdminProductForm />} />
                    <Route path="services/products/:id/edit" element={<AdminProductForm />} />
                    <Route path="addons/products/:id/edit" element={<AdminProductForm />} />
                    <Route path="availability" element={<AdminAvailability />} />
                    <Route path="calendar" element={<AdminAvailability />} />
                    <Route path="inquiries" element={<AdminInquiries />} />
                    <Route path="inquiries/:leadId" element={<AdminLeadDetails />} />
                    <Route path="clients" element={<AdminClients />} />
                    <Route path="invoices" element={<AdminInvoices />} />
                    <Route path="quotations" element={<AdminInvoices />} />
                    <Route path="quotations/new" element={<AdminInvoiceForm />} />
                    <Route path="quotations/:id" element={<AdminInvoiceView />} />
                    <Route path="quotations/:id/edit" element={<AdminInvoiceForm />} />
                    <Route path="invoices/new" element={<AdminInvoiceForm />} />
                    <Route path="invoices/:id" element={<AdminInvoiceView />} />
                    <Route path="invoices/:id/edit" element={<AdminInvoiceForm />} />
                    <Route path="events" element={<AdminPlaceholder title="All Events" />} />
                    <Route path="tasks" element={<AdminPlaceholder title="Tasks" />} />
                    <Route path="vendors" element={<AdminPlaceholder title="Vendors" />} />
                    <Route path="candidates" element={<AdminPlaceholder title="Candidates" />} />
                    <Route path="team" element={<AdminPlaceholder title="Team" />} />
                    <Route path="attendance" element={<AdminPlaceholder title="Attendance" />} />
                    <Route path="payroll" element={<AdminPlaceholder title="Salary & Payroll" />} />
                    <Route path="payments" element={<AdminPlaceholder title="Payments" />} />
                    <Route path="expenses" element={<AdminPlaceholder title="Expenses" />} />
                    <Route path="reports/sales" element={<AdminFinancialReports />} />
                    <Route path="settings" element={<AdminSettings />} />
                  </Route>
                  <Route path="/landing" element={<Landing />} />
                  <Route element={<Layout />}>
                    <Route path="/" element={<Home />} />
                    <Route path="/services" element={<Services />} />
                    <Route path="/products" element={<Products />} />
                    <Route path="/packages" element={<Packages />} />
                    <Route path="/package-details" element={<PackageDetails />} />
                    <Route path="/weddings" element={<Wedding />} />
                    <Route path="/birthdays" element={<Birthday />} />
                    <Route path="/concerts" element={<Navigate to="/occasion/corporate" replace />} />
                    <Route path="/corporate" element={<OccasionLanding type="corporate" />} />
                    <Route path="/custom-events" element={<Navigate to="/shop-by-occasion" replace />} />
                    <Route path="/shop-by-occasion" element={<ShopByOccasion />} />
                    <Route path="/occasion" element={<ShopByOccasion />} />
                    <Route path="/occasion/wedding" element={<Wedding />} />
                    <Route path="/occasion/birthday" element={<Birthday />} />
                    <Route path="/occasion/anniversary" element={<OccasionLanding type="anniversary" />} />
                    <Route path="/occasion/festivals-culture" element={<OccasionLanding type="festivals" />} />
                    <Route path="/occasion/kids-family" element={<OccasionLanding type="family" />} />
                    <Route path="/occasion/corporate" element={<OccasionLanding type="corporate" />} />
                    <Route path="/occasion/*" element={<OccasionBrowser />} />
                    <Route path="/gallery" element={<Gallery />} />
                    <Route path="/about" element={<About />} />
                    <Route path="/contact" element={<Contact />} />
                    <Route path="/book-event" element={<BookEvent />} />
                    <Route path="/booking-success" element={<BookingSuccess />} />
                    <Route path="/cart" element={<Cart />} />
                    <Route path="/checkout" element={<Checkout />} />
                    <Route path="/booking-confirmation" element={<BookingConfirmation />} />
                    <Route path="/terms" element={<Terms />} />
                    <Route path="/privacy" element={<Privacy />} />
                    <Route path="*" element={<NotFound />} />
                  </Route>
                </Routes>
              </Suspense>
              </RouteBoundary>
            </BrowserRouter>
            </ChatbotProvider>
          </CartProvider>
        </ToastProvider>
      </CityProvider>
    </ThemeProvider>
  );
}
