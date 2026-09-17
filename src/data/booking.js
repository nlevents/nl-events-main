// Shared, reusable booking-configuration option lists. Kept as plain data
// (not free text) so every product detail page offers the same validated
// set of choices — nothing here is ever rendered as HTML, so it's safe by
// construction (no injection surface: React escapes all of it as text).

export const EVENT_TYPE_OPTIONS = [
  "Birthday Party",
  "Wedding Ceremony",
  "Reception",
  "Anniversary",
  "Baby Shower",
  "Naming Ceremony",
  "Corporate Event",
  "Custom Celebration",
];

export const LOCATION_TYPE_OPTIONS = [
  "Home / Residence",
  "Banquet Hall / Venue",
  "Terrace / Rooftop",
  "Outdoor / Garden",
  "Community Hall",
  "Other",
];

// Fallback add-on services offered on every booking, on top of whatever
// addons a specific product/package already defines (see BookingPanel).
// This guarantees the "Add-On Services" section always has something to
// offer, even for Shop-by-Occasion products that don't carry their own
// addons list. Prices are Ranchi base rates — cityPrice() adjusts them
// per-city the same way product prices are adjusted.
export const DEFAULT_ADDONS = [
  { name: "Photography (2 hrs)", price: 2500 },
  { name: "Videography (2 hrs)", price: 3500 },
  { name: "DJ & Music Setup", price: 4000 },
  { name: "LED Decor Lighting", price: 1500 },
  { name: "Cake (1 kg)", price: 900 },
  { name: "Return Gifts (pack of 10)", price: 1200 },
  { name: "Extra Balloon Decor", price: 1000 },
  { name: "Anchor / Host", price: 3000 },
];

export const TIME_SLOT_OPTIONS = [
  "Morning (8 AM – 11 AM)",
  "Midday (11 AM – 2 PM)",
  "Afternoon (2 PM – 5 PM)",
  "Evening (5 PM – 8 PM)",
  "Night (8 PM – 11 PM)",
];

// Today's date as YYYY-MM-DD, for the date input's `min` attribute — blocks
// picking a past date at the UI layer (still re-validated on submit).
export function todayISO() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
}

const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Builds the next `count` days (today first) as plain objects for the
// quick-pick date strip in BookingPanel — { iso, weekday, day, label,
// isFast }. `label` is "Today"/"Tomorrow" for the first two entries and the
// weekday name after that, matching the appointment-style date scroller.
export function nextDates(count = 14) {
  const out = [];
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  for (let i = 0; i < count; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    const pad = (n) => String(n).padStart(2, "0");
    const iso = d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
    out.push({
      iso,
      weekday: WEEKDAY_SHORT[d.getDay()],
      day: d.getDate(),
      label: i === 0 ? "Today" : i === 1 ? "Tomorrow" : WEEKDAY_SHORT[d.getDay()],
      isFast: i < 2,
    });
  }
  return out;
}
