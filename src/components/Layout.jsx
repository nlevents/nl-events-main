import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";
import BottomNav from "./BottomNav";
import Chatbot from "./Chatbot";
import ErrorBoundary from "./ErrorBoundary";

export default function Layout() {
  const location = useLocation();

  useEffect(() => {
    // A focused <input>/<textarea>/<select> from the page the person just
    // left (or from this same Header, which never unmounts between route
    // changes) otherwise stays focused straight through a client-side
    // navigation — React Router doesn't reset focus the way a full page
    // load would. That leaves the on-screen keyboard open (or makes it
    // pop back up) on whatever new page loads next, even though nothing
    // on the new page asked for it. Blur it before we jump the scroll
    // position back to the top.
    const el = document.activeElement;
    if (el && typeof el.blur === "function" && el !== document.body) {
      el.blur();
    }
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // Product detail pages intentionally use a distraction-free layout:
  // no global header or mobile bottom navigation. The booking controls remain
  // the primary navigation/action on these pages.
  const pathParts = location.pathname.split("/").filter(Boolean);
  const isProductDetail =
    location.pathname === "/package-details" ||
    (pathParts[0] === "occasion" && pathParts.length >= 3);

  return (
    <>
      {!isProductDetail && <Header />}
      <main className={isProductDetail ? "product-detail-shell" : undefined}>
        <Outlet />
      </main>
      <Footer />
      {!isProductDetail && <BottomNav />}
      <ErrorBoundary fallback={null}>
        <Chatbot />
      </ErrorBoundary>
    </>
  );
}
