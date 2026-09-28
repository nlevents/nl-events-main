import { Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import { ThemeProvider } from "./context/ThemeContext";
import { CityProvider } from "./context/CityContext";
import { CartProvider } from "./context/CartContext";
import { ToastProvider } from "./context/ToastContext";
import { ChatbotProvider } from "./context/ChatbotContext";
import { AdminAuthProvider } from "./context/AdminAuthContext";
import { lazyWithRetry } from "./lib/lazyWithRetry";

// Route-level code splitting: each page is fetched only when visited,
// keeping the initial JS payload small.
const Landing = lazyWithRetry(() => import("./pages/Landing"));
import Home from "./pages/Home.jsx";
const Services = lazyWithRetry(() => import("./pages/Services"));
const Products = lazyWithRetry(() => import("./pages/Products"));
const Packages = lazyWithRetry(() => import("./pages/Packages"));
const PackageDetails = lazyWithRetry(() => import("./pages/PackageDetails"));
const ShopByOccasion = lazyWithRetry(() => import("./pages/ShopByOccasion"));
const OccasionBrowser = lazyWithRetry(() => import("./pages/OccasionBrowser"));
const Wedding = lazyWithRetry(() => import("./pages/Wedding"));
const Birthday = lazyWithRetry(() => import("./pages/Birthday"));
const OccasionLanding = lazyWithRetry(() => import("./pages/OccasionLanding"));
const Gallery = lazyWithRetry(() => import("./pages/Gallery"));
const About = lazyWithRetry(() => import("./pages/About"));
const Contact = lazyWithRetry(() => import("./pages/Contact"));
const BookEvent = lazyWithRetry(() => import("./pages/BookEvent"));
import BookingSuccess from "./pages/BookingSuccess";
const Cart = lazyWithRetry(() => import("./pages/Cart"));
const Checkout = lazyWithRetry(() => import("./pages/Checkout"));
import BookingConfirmation from "./pages/BookingConfirmation";
const Terms = lazyWithRetry(() => import("./pages/Terms"));
const Privacy = lazyWithRetry(() => import("./pages/Privacy"));
const NotFound = lazyWithRetry(() => import("./pages/NotFound"));


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
const AdminAddons = lazyWithRetry(() => import("./pages/admin/AdminAddons"));
const AdminAvailability = lazyWithRetry(() => import("./pages/admin/AdminAvailability"));
const AdminInquiries = lazyWithRetry(() => import("./pages/admin/AdminInquiries"));
const AdminLeadDetails = lazyWithRetry(() => import("./pages/admin/AdminLeadDetails"));
const AdminClients = lazyWithRetry(() => import("./pages/admin/AdminClients"));
const AdminInvoices = lazyWithRetry(() => import("./pages/admin/AdminInvoices"));
const AdminInvoiceForm = lazyWithRetry(() => import("./pages/admin/AdminInvoiceForm"));
const AdminInvoiceView = lazyWithRetry(() => import("./pages/admin/AdminInvoiceView"));
const AdminSettings = lazyWithRetry(() => import("./pages/admin/AdminSettings"));
const AdminPlaceholder = lazyWithRetry(() => import("./pages/admin/AdminPlaceholder"));

function RouteFallback() {
  return <div style={{ minHeight: "60vh" }} aria-hidden="true"></div>;
}

export default function App() {
  return (
    <ThemeProvider>
      <CityProvider>
        <ToastProvider>
          <CartProvider>
            <ChatbotProvider>
            <BrowserRouter>
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
                    <Route path="services" element={<AdminAddons />} />
                    <Route path="addons" element={<AdminAddons />} />
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
            </BrowserRouter>
            </ChatbotProvider>
          </CartProvider>
        </ToastProvider>
      </CityProvider>
    </ThemeProvider>
  );
}
