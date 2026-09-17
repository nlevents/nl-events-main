import { cityPrice, fmtINR } from "./pricing";

let seq = 0;
// Simple, collision-safe-enough id for client-only cart lines (no backend).
export function genId() {
  seq += 1;
  return "bk_" + Date.now().toString(36) + "_" + seq.toString(36);
}

// Every price stored on a cart item is the Ranchi base price. These helpers
// always re-derive the displayed amount from the item's OWN saved `city`
// (not whatever city the header happens to be set to right now), so a
// booking's price never silently changes after it's added to the cart.
export function itemBasePrice(item) {
  return cityPrice(item.unitPrice, item.city);
}
export function itemOriginalPrice(item) {
  if (typeof item.originalPrice !== "number") return null;
  return cityPrice(item.originalPrice, item.city);
}
export function itemAddonsTotal(item) {
  const addons = Array.isArray(item.addons) ? item.addons : [];
  return addons.reduce((sum, a) => sum + cityPrice(a.price, item.city), 0);
}
export function itemUnitTotal(item) {
  return itemBasePrice(item) + itemAddonsTotal(item);
}
export function itemLineTotal(item) {
  const qty = Number(item.quantity) > 0 ? Number(item.quantity) : 1;
  return itemUnitTotal(item) * qty;
}
export function itemOriginalLineTotal(item) {
  const original = itemOriginalPrice(item);
  if (original === null) return itemLineTotal(item);
  const qty = Number(item.quantity) > 0 ? Number(item.quantity) : 1;
  return (original + itemAddonsTotal(item)) * qty;
}

export function cartCount(items) {
  return items.reduce((sum, it) => sum + (Number(it.quantity) > 0 ? Number(it.quantity) : 1), 0);
}
export function cartSubtotal(items) {
  return items.reduce((sum, it) => sum + itemLineTotal(it), 0);
}
export function cartOriginalSubtotal(items) {
  return items.reduce((sum, it) => sum + itemOriginalLineTotal(it), 0);
}
export function cartDiscount(items) {
  const diff = cartOriginalSubtotal(items) - cartSubtotal(items);
  return diff > 0 ? diff : 0;
}

// Human-readable multi-line summary of a single booking item — used in the
// cart, the checkout review step, and the WhatsApp/email fallback.
export function describeBooking(item) {
  const bits = [];
  if (item.eventType) bits.push(item.eventType);
  if (item.city) bits.push(item.city);
  if (item.eventDate) bits.push(item.eventDate);
  if (item.timeSlot) bits.push(item.timeSlot);
  if (item.guestCount) bits.push(item.guestCount);
  if (item.address) bits.push(item.address);
  return bits.join(" • ");
}

export function bookingLinesText(items) {
  return items
    .map((it) => {
      const qty = Number(it.quantity) > 0 ? Number(it.quantity) : 1;
      const line = "• " + it.name + (qty > 1 ? " x" + qty : "") + " — " + fmtINR(itemLineTotal(it));
      const detail = describeBooking(it);
      return detail ? line + "\n   " + detail : line;
    })
    .join("\n");
}
