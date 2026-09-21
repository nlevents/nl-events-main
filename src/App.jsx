import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import { ThemeProvider } from "./context/ThemeContext";
import { CityProvider } from "./context/CityContext";
import { CartProvider } from "./context/CartContext";
import { ToastProvider } from "./context/ToastContext";
import { ChatbotProvider } from "./context/ChatbotContext";
import { AdminAuthProvider } from "./context/AdminAuthContext";

// Route-level code splitting: each page is fetched only when visited,
// keeping the initial JS payload small.
const Landing = lazy(() => import("./pages/Landing"));
const Home = lazy(() => import("./pages/Home"));
const Services = lazy(() => import("./pages/Services"));
const Products = lazy(() => import("./pages/Products"));
const Packages = lazy(() => import("./pages/Packages"));
const PackageDetails = lazy(() => import("./pages/PackageDetails"));
const ShopByOccasion = lazy(() => import("./pages/ShopByOccasion"));
const OccasionBrowser = lazy(() => import("./pages/OccasionBrowser"));
const Wedding = lazy(() => import("./pages/Wedding"));
const Birthday = lazy(() => import("./pages/Birthday"));
const OccasionLanding = lazy(() => import("./pages/OccasionLanding"));
const Gallery = lazy(() => import("./pages/Gallery"));
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));
const BookEvent = lazy(() => import("./pages/BookEvent"));
import BookingSuccess from "./pages/BookingSuccess";
const Cart = lazy(() => import("./pages/Cart"));
const Checkout = lazy(() => import("./pages/Checkout"));
import BookingConfirmation from "./pages/BookingConfirmation";
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const NotFound = lazy(() => import("./pages/NotFound"));


// Admin panel — not linked from the public navigation.
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout"));
const AdminLogin = lazy(() => import("./pages/admin/AdminLogin"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminProducts = lazy(() => import("./pages/admin/AdminProducts"));
const AdminProductForm = lazy(() => import("./pages/admin/AdminProductForm"));
const AdminCategories = lazy(() => import("./pages/admin/AdminCategories"));
const AdminMedia = lazy(() => import("./pages/admin/AdminMedia"));
const AdminVideoContent = lazy(() => import("./pages/admin/AdminVideoContent"));
const AdminCoupons = lazy(() => import("./pages/admin/AdminCoupons"));
const AdminAddons = lazy(() => import("./pages/admin/AdminAddons"));
const AdminAvailability = lazy(() => import("./pages/admin/AdminAvailability"));
const AdminInquiries = lazy(() => import("./pages/admin/AdminInquiries"));
const AdminLeadDetails = lazy(() => import("./pages/admin/AdminLeadDetails"));
const AdminClients = lazy(() => import("./pages/admin/AdminClients"));
const AdminInvoices = lazy(() => import("./pages/admin/AdminInvoices"));
const AdminInvoiceForm = lazy(() => import("./pages/admin/AdminInvoiceForm"));
const AdminInvoiceView = lazy(() => import("./pages/admin/AdminInvoiceView"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminPlaceholder = lazy(() => import("./pages/admin/AdminPlaceholder"));

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
                    <Route path="products" element={<AdminProducts />} />
                    <Route path="products/new" element={<AdminProductForm />} />
                    <Route path="products/:id/edit" element={<AdminProductForm />} />
                    <Route path="categories" element={<AdminCategories />} />
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
                    <Route path="quotations" element={<AdminPlaceholder title="Quotations" />} />
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
