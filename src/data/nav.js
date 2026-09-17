// City list now lives in ./cities.js (single source of truth, shared with
// lib/pricing.js). Re-exported here so existing imports of CITIES from this
// file keep working unchanged.
export { CITIES } from "./cities";

export const NAV_LINKS = [
  { href: "/", label: "Home", icon: "navHome", color: "gold" },
  { href: "/services", label: "Services", icon: "navServices", color: "terracotta" },
  { href: "/products", label: "Products", icon: "grid", color: "gold" },
  { href: "/packages", label: "Packages", icon: "navPackages", color: "teal" },
  { href: "/gallery", label: "Gallery", icon: "navGallery", color: "blue" },
  { href: "/about", label: "About", icon: "navAbout", color: "plum" },
  { href: "/contact", label: "Contact", icon: "navContact", color: "sage" },
];

export const BOTTOM_LINKS = [
  { href: "/", label: "Home", icon: "home" },
  { href: "__chatbot__", label: "Plan Event", icon: "botPremium", action: "chatbot" },
  { href: "__whatsapp__", label: "Chat", icon: "whatsapp", fab: true, external: true },
  { href: "tel:+917903133317", label: "Call", icon: "phone", external: true },
  { href: "/products", label: "Products", icon: "grid" },
];

export const SEARCH_INDEX = [
  // Occasions - top level
  { label: "Wedding", cat: "Category", href: "/occasion/wedding", keywords: "wedding weddings mandap bride groom haldi mehendi sangeet ring ceremony" },
  { label: "Kids Theme Decor", cat: "Category", href: "/occasion/birthday", keywords: "birthday birthdays kids theme decor balloon cake party" },
  { label: "Anniversary", cat: "Category", href: "/occasion/anniversary", keywords: "anniversary anniversaries romance candlelight surprise" },
  { label: "Baby Shower", cat: "Category", href: "/occasion/baby-shower", keywords: "baby shower maternity" },
  { label: "Kids Birthday", cat: "Category", href: "/occasion/birthday/kids-birthday", keywords: "kids birthday children theme cartoon princess superhero jungle" },
  { label: "Newborn Welcome", cat: "Category", href: "/occasion/newborn-welcome", keywords: "newborn welcome naming ceremony baby" },
  { label: "Corporate Events", cat: "Category", href: "/occasion/corporate", keywords: "corporate office launch conference av branding party" },
  { label: "Annaprashan", cat: "Category", href: "/occasion/annaprashan", keywords: "annaprashan rice ceremony mukhe bhaat first rice baby" },
  { label: "Festivals & Culture", cat: "Category", href: "/occasion/festivals-culture", keywords: "festival festivals culture diwali holi navratri garba cultural" },

  // Wedding subcategories
  { label: "Mandap & Ceremony Decor", cat: "Wedding", href: "/occasion/wedding/mandap-ceremony-decor", keywords: "mandap ceremony wedding flowers" },
  { label: "Haldi Decor", cat: "Wedding", href: "/occasion/wedding/haldi", keywords: "haldi wedding ceremony" },
  { label: "Mehndi Decor", cat: "Wedding", href: "/occasion/wedding/mehndi", keywords: "mehndi wedding ceremony" },
  { label: "Sangeet Night Setup", cat: "Wedding", href: "/occasion/wedding/sangeet-night", keywords: "sangeet night stage dance floor wedding" },
  { label: "Ring Ceremony Decor", cat: "Wedding", href: "/occasion/wedding/ring-ceremony", keywords: "ring ceremony engagement decor wedding" },
  { label: "Reception Styling", cat: "Wedding", href: "/occasion/wedding/reception-styling", keywords: "reception stage wedding night" },
  { label: "Haldi Floral Setup", cat: "Product", href: "/occasion/wedding/haldi/haldi-floral-setup", keywords: "haldi floral marigold yellow" },
  { label: "Mehendi Lounge Decor", cat: "Product", href: "/occasion/wedding/mehndi/mehendi-lounge-decor", keywords: "mehendi lounge decor" },
  { label: "Traditional Mandap Setup", cat: "Product", href: "/occasion/wedding/mandap-ceremony-decor/traditional-mandap-setup", keywords: "traditional mandap setup" },
  { label: "Floral Mandap Package", cat: "Product", href: "/occasion/wedding/mandap-ceremony-decor/floral-mandap-package", keywords: "floral mandap canopy" },
  { label: "Ring Ceremony Decor Setup", cat: "Product", href: "/occasion/wedding/ring-ceremony/ring-ceremony-decor-setup", keywords: "ring ceremony decor setup" },

  // Birthday subcategories
  { label: "Kids Birthday Themes", cat: "Kids Theme Decor", href: "/occasion/birthday/kids-birthday", keywords: "kids birthday themes cartoon princess superhero animal" },
  { label: "Milestone Birthday", cat: "Kids Theme Decor", href: "/occasion/birthday/milestone-birthday", keywords: "milestone birthday 18th 30th 50th gold silver" },
  { label: "Balloon Decor Setups", cat: "Kids Theme Decor", href: "/occasion/birthday/balloon-decor-setups", keywords: "balloon arch backdrop birthday" },
  { label: "Princess Theme Birthday", cat: "Product", href: "/occasion/birthday/kids-birthday/princess-themes/royal-princess-party", keywords: "princess castle throne birthday party" },
  { label: "Superhero Theme Birthday", cat: "Product", href: "/occasion/birthday/kids-birthday/superhero-themes/superhero-squad-party", keywords: "superhero spiderman avengers batman birthday" },
  { label: "Animal Theme Birthday", cat: "Kids Theme Decor", href: "/occasion/birthday/kids-birthday/animal-themes/jungle-safari-birthday", keywords: "jungle safari animal horse birthday" },
  { label: "Frozen Ice-Princess Party", cat: "Product", href: "/occasion/birthday/kids-birthday/princess-themes/frozen-ice-princess-party", keywords: "frozen ice princess elsa birthday" },
  { label: "Balloon Arch Backdrop", cat: "Product", href: "/occasion/birthday/balloon-decor-setups/balloon-arch-backdrop", keywords: "balloon arch backdrop birthday" },

  // Anniversary subcategories
  { label: "Candlelight Dinner Setup", cat: "Product", href: "/occasion/anniversary/candlelight-celebrations/candlelight-dinner-setup", keywords: "candlelight dinner anniversary romance" },
  { label: "Surprise Room Decor", cat: "Product", href: "/occasion/anniversary/surprise-setups/surprise-room-decor", keywords: "surprise room decor anniversary" },
  { label: "Silver Jubilee Decor", cat: "Product", href: "/occasion/anniversary/milestone-jubilees/silver-jubilee-decor", keywords: "silver jubilee 25th anniversary" },
  { label: "Golden Jubilee Setup", cat: "Product", href: "/occasion/anniversary/milestone-jubilees/golden-jubilee-grand-setup", keywords: "golden jubilee 50th anniversary" },

  // Corporate
  { label: "Brand Launch Stage Setup", cat: "Product", href: "/occasion/corporate/product-launch/brand-launch-stage-setup", keywords: "brand launch stage corporate" },
  { label: "Conference Hall Branding", cat: "Product", href: "/occasion/corporate/conference-office-party/conference-hall-branding", keywords: "conference hall branding corporate" },
  { label: "Office Party Decor", cat: "Product", href: "/occasion/corporate/conference-office-party/office-party-decor", keywords: "office party decor corporate" },

  // Festivals
  { label: "Diwali Diya & Rangoli Setup", cat: "Product", href: "/occasion/festivals-culture/diwali-festive-decor/diwali-diya-rangoli-setup", keywords: "diwali diya rangoli festival" },
  { label: "Navratri Garba Night Decor", cat: "Product", href: "/occasion/festivals-culture/navratri-holi-cultural/navratri-garba-night-decor", keywords: "navratri garba night festival" },
  { label: "Holi Color-Fest Setup", cat: "Product", href: "/occasion/festivals-culture/navratri-holi-cultural/holi-color-fest-setup", keywords: "holi colors gulal festival" },

  // Baby & Kids
  { label: "Boho Floral Baby Shower", cat: "Product", href: "/occasion/baby-shower/themed-baby-showers/boho-themes/boho-floral-baby-shower", keywords: "boho baby shower floral" },
  { label: "Traditional Naming Ceremony", cat: "Product", href: "/occasion/newborn-welcome/naming-ceremony-decor/traditional-naming-ceremony-decor", keywords: "naming ceremony newborn" },
  { label: "Welcome Home Doorway Decor", cat: "Product", href: "/occasion/newborn-welcome/welcome-home-setups/welcome-home-doorway-decor", keywords: "welcome home newborn doorway" },

  // Pages
  { label: "All Packages", cat: "Page", href: "/packages", keywords: "packages pricing plans" },
  { label: "Gallery", cat: "Page", href: "/gallery", keywords: "gallery photos portfolio work" },
  { label: "About Us", cat: "Page", href: "/about", keywords: "about us company story team" },
  { label: "Contact Us", cat: "Page", href: "/contact", keywords: "contact us phone email address location" },
  { label: "Book an Event", cat: "Page", href: "/book-event", keywords: "book event booking consultation enquiry" },
  { label: "Services", cat: "Page", href: "/services", keywords: "services what we do offerings" },
  { label: "Products", cat: "Page", href: "/products", keywords: "products shop catalog browse all" },
  { label: "Shop by Occasion", cat: "Page", href: "/shop-by-occasion", keywords: "shop occasion browse all categories" },
];
