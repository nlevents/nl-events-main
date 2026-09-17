import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { WHATSAPP_NUMBER } from "../data/images";
import { fmtINR } from "../lib/pricing";
import { genId, bookingLinesText, cartSubtotal, cartCount } from "../lib/cart";
import { validateCoupon } from "../lib/catalogStore";

const CartContext = createContext(null);
const CART_KEY = "nle-cart";
const COUPON_KEY = "nle-applied-coupon";

function isSafeWebUrl(value) {
  if (typeof value !== "string" || !value.trim()) return false;
  const url = value.trim();
  // Cart data can survive between local builds. Never carry a developer
  // machine's file:// path into the browser or production.
  if (/^(file:|filesystem:|blob:)/i.test(url)) return false;
  if (/^(?:[a-zA-Z]:[\\/]|\\\\)/.test(url)) return false;
  return true;
}

function sanitizeCartItems(items) {
  return items
    .filter((item) => item && typeof item === "object")
    .map((item) => ({
      ...item,
      image: isSafeWebUrl(item.image) ? item.image.trim() : null,
      href: isSafeWebUrl(item.href) ? item.href.trim() : null,
    }));
}

function readCart() {
  try {
    const raw = window.localStorage.getItem(CART_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? sanitizeCartItems(parsed) : [];
  } catch {
    return [];
  }
}
function writeCart(items) {
  try {
    window.localStorage.setItem(CART_KEY, JSON.stringify(items));
  } catch {
    /* ignore — private browsing / storage full */
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(readCart);
  const [pulse, setPulse] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState(() => {
    try {
      const raw = localStorage.getItem(COUPON_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    writeCart(items);
  }, [items]);

  useEffect(() => {
    try {
      if (appliedCoupon) localStorage.setItem(COUPON_KEY, JSON.stringify(appliedCoupon));
      else localStorage.removeItem(COUPON_KEY);
    } catch {}
  }, [appliedCoupon]);

  const addBooking = useCallback((booking) => {
    const item = { id: genId(), quantity: 1, addons: [], ...booking };
    setItems((prev) => [...prev, item]);
    setPulse(true);
    setTimeout(() => setPulse(false), 650);
    return item.id;
  }, []);

  const updateItem = useCallback((id, patch) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }, []);

  const removeItem = useCallback((id) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    setAppliedCoupon(null);
  }, []);

  const subtotal = cartSubtotal(items);

  const applyCoupon = useCallback(
    (code) => {
      const result = validateCoupon(code, subtotal);
      if (result.valid) {
        setAppliedCoupon({
          code: result.coupon.code,
          discountAmount: result.discountAmount,
          coupon: result.coupon,
        });
      }
      return result;
    },
    [subtotal]
  );

  const removeCoupon = useCallback(() => {
    setAppliedCoupon(null);
  }, []);

  const discountAmount = appliedCoupon ? Math.min(appliedCoupon.discountAmount, subtotal) : 0;
  const total = Math.max(0, subtotal - discountAmount);

  function checkoutWhatsApp(onEmpty) {
    if (!items.length) {
      onEmpty && onEmpty();
      return;
    }
    const msg =
      "Hi Next Level Events! I'd like to enquire about the following booking(s):\n\n" +
      bookingLinesText(items) +
      "\n\nSubtotal: " + fmtINR(subtotal) +
      (discountAmount > 0 ? `\nDiscount (${appliedCoupon.code}): -${fmtINR(discountAmount)}` : "") +
      `\nTotal: ${fmtINR(total)}` +
      "\n\nPlease share availability and next steps.";
    window.open("https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(msg), "_blank", "noopener,noreferrer");
  }

  function checkoutEmail(onEmpty) {
    if (!items.length) {
      onEmpty && onEmpty();
      return;
    }
    const subject = "Event Booking Enquiry — " + items.map((it) => it.name).join(", ");
    const body =
      "Hi Next Level Events team,\n\nI'd like to enquire about the following booking(s):\n\n" +
      bookingLinesText(items) +
      "\n\nSubtotal: " + fmtINR(subtotal) +
      (discountAmount > 0 ? `\nDiscount: -${fmtINR(discountAmount)}` : "") +
      `\nTotal: ${fmtINR(total)}` +
      "\n\nPlease share availability and next steps.\n\nThanks!";
    window.location.href = "mailto:nextlevel.events25@gmail.com?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
  }

  return (
    <CartContext.Provider
      value={{
        items,
        addBooking,
        updateItem,
        removeItem,
        clearCart,
        count: cartCount(items),
        subtotal,
        discountAmount,
        total,
        appliedCoupon,
        applyCoupon,
        removeCoupon,
        pulse,
        checkoutWhatsApp,
        checkoutEmail,
      }}
    >
      {children}
    </CartContext.Provider>
  );

}

export function useCart() {
  return useContext(CartContext);
}
