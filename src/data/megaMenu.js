// Data-driven category navigation + mega menu configuration.
// Every href here points at an EXISTING route (see App.jsx) or an in-page
// anchor on an existing route — no new routes are introduced. Keeping this
// as one config object means the desktop mega menu bar and the mobile
// drawer accordion can both render from the same source without drifting.

import { IMAGES } from "./images";

// type: "mega"   -> multi-column dropdown with an optional featured image
// type: "simple" -> single-column flat link list (no featured image)
// type: "cities" -> special panel driven by CITIES / CityContext
export const CATEGORY_NAV = [
  {
    key: "birthday",
    label: "Kids Theme Decor",
    href: "/occasion/birthday",
    type: "mega",
    featured: { img: IMAGES.pkgPremiumBirthday, title: "Premium Birthday", subtitle: "Custom theme, premium florals & host coordination", href: "/occasion/birthday/milestone-birthday/elegant-30th-milestone" },
    columns: [
      {
        heading: "Birthday Decoration",
        links: [
          { label: "All Birthday Decorations", href: "/occasion/birthday" },
          { label: "Kids Birthday", href: "/occasion/birthday/kids-birthday" },
          { label: "Milestone Birthdays", href: "/occasion/birthday/milestone-birthday" },
          { label: "Balloon Decor Setups", href: "/occasion/birthday/balloon-decor-setups" },
        ],
      },
      {
        heading: "Kids Theme Birthday",
        links: [
          { label: "All Themes", href: "/occasion/birthday/kids-birthday" },
          { label: "Animal Themes", href: "/occasion/birthday/kids-birthday/animal-themes" },
          { label: "Princess Themes", href: "/occasion/birthday/kids-birthday/princess-themes" },
          { label: "Superhero Themes", href: "/occasion/birthday/kids-birthday/superhero-themes" },
        ],
      },
      {
        heading: "Party Setups",
        links: [
          { label: "Balloon Arch Backdrop", href: "/occasion/birthday/balloon-decor-setups/balloon-arch-backdrop" },
          { label: "Balloon Ceiling Cloud", href: "/occasion/birthday/balloon-decor-setups/balloon-ceiling-cloud" },
          { label: "Elegant 30th Milestone", href: "/occasion/birthday/milestone-birthday/elegant-30th-milestone" },
          { label: "Golden Glam Birthday", href: "/occasion/birthday/milestone-birthday/golden-glam-birthday" },
        ],
      },
      {
        heading: "Packages",
        links: [
          { label: "Birthday Bash", href: "/packages" },
          { label: "Premium Birthday", href: "/packages" },
          { label: "View All Packages", href: "/packages" },
        ],
      },
    ],
  },
  {
    key: "balloon-decor",
    label: "Balloon Decor",
    href: "/occasion/birthday/balloon-decor-setups",
    type: "mega",
    featured: { img: IMAGES.pkgBirthdayBash, title: "Themed Balloon Setups", subtitle: "Arches, bouquets & full-room balloon styling", href: "/occasion/birthday/balloon-decor-setups/balloon-arch-backdrop" },
    columns: [
      {
        heading: "Balloon Styles",
        links: [
          { label: "Balloon Arch Backdrop", href: "/occasion/birthday/balloon-decor-setups/balloon-arch-backdrop" },
          { label: "Balloon Ceiling Cloud", href: "/occasion/birthday/balloon-decor-setups/balloon-ceiling-cloud" },
          { label: "All Balloon Setups", href: "/occasion/birthday/balloon-decor-setups" },
        ],
      },
      {
        heading: "By Occasion",
        links: [
          { label: "Birthday Balloon Decor", href: "/occasion/birthday/balloon-decor-setups" },
          { label: "Anniversary Balloon Decor", href: "/occasion/anniversary/surprise-setups" },
          { label: "Baby Shower Balloon Decor", href: "/occasion/baby-shower/photo-corner-setups/balloon-photo-corner" },
          { label: "Newborn Welcome Decor", href: "/occasion/newborn-welcome" },
        ],
      },
      {
        heading: "Services",
        links: [
          { label: "360° Photo Booth", href: "/packages" },
          { label: "Cold Pyro Entry", href: "/packages" },
          { label: "Fireworks Show", href: "/packages" },
        ],
      },
    ],
  },
  {
    key: "wedding",
    label: "Wedding",
    href: "/occasion/wedding",
    type: "mega",
    featured: { img: IMAGES.pkgDreamWedding, title: "Dream Wedding", subtitle: "Mandap styling, catering coordination & full-day management", href: "/packages" },
    columns: [
      {
        heading: "Wedding Ceremonies",
        links: [
          { label: "All Wedding Decor", href: "/occasion/wedding" },
          { label: "Mandap & Ceremony Decor", href: "/occasion/wedding/mandap-ceremony-decor" },
          { label: "Haldi", href: "/occasion/wedding/haldi" },
          { label: "Mehndi", href: "/occasion/wedding/mehndi" },
          { label: "Sangeet Night", href: "/occasion/wedding/sangeet-night" },
          { label: "Ring Ceremony", href: "/occasion/wedding/ring-ceremony" },
          { label: "Reception Styling", href: "/occasion/wedding/reception-styling" },
        ],
      },
      {
        heading: "Wedding Products",
        links: [
          { label: "Traditional Mandap Setup", href: "/occasion/wedding/mandap-ceremony-decor/traditional-mandap-setup" },
          { label: "Floral Mandap Package", href: "/occasion/wedding/mandap-ceremony-decor/floral-mandap-package" },
          { label: "Haldi Floral Setup", href: "/occasion/wedding/haldi/haldi-floral-setup" },
          { label: "Mehendi Lounge Decor", href: "/occasion/wedding/mehndi/mehendi-lounge-decor" },
          { label: "Ring Ceremony Decor", href: "/occasion/wedding/ring-ceremony/ring-ceremony-decor-setup" },
          { label: "Sangeet Night Stage", href: "/occasion/wedding/sangeet-night/sangeet-night-stage-setup" },
        ],
      },
      {
        heading: "Packages",
        links: [
          { label: "Dream Wedding", href: "/packages" },
          { label: "Royal Wedding", href: "/packages" },
          { label: "Custom Experience", href: "/book-event" },
          { label: "View All Packages", href: "/packages" },
        ],
      },
    ],
  },
  {
    key: "anniversary",
    label: "Anniversary",
    href: "/occasion/anniversary",
    type: "mega",
    featured: { img: IMAGES.typeAnniversary, title: "Anniversary Celebrations", subtitle: "Candlelight setups & romantic room decor", href: "/occasion/anniversary/candlelight-celebrations/candlelight-dinner-setup" },
    columns: [
      {
        heading: "Celebrations",
        links: [
          { label: "All Anniversary Decor", href: "/occasion/anniversary" },
          { label: "Candlelight Dinner Setup", href: "/occasion/anniversary/candlelight-celebrations/candlelight-dinner-setup" },
          { label: "Rose Heart Candle Path", href: "/occasion/anniversary/candlelight-celebrations/rose-heart-candle-path" },
          { label: "Surprise Room Decor", href: "/occasion/anniversary/surprise-setups/surprise-room-decor" },
          { label: "Rooftop Anniversary Setup", href: "/occasion/anniversary/surprise-setups/rooftop-anniversary-setup" },
        ],
      },
      {
        heading: "Milestones",
        links: [
          { label: "Silver Jubilee Decor", href: "/occasion/anniversary/milestone-jubilees/silver-jubilee-decor" },
          { label: "Golden Jubilee Grand Setup", href: "/occasion/anniversary/milestone-jubilees/golden-jubilee-grand-setup" },
          { label: "All Milestones", href: "/occasion/anniversary/milestone-jubilees" },
        ],
      },
      {
        heading: "Packages",
        links: [
          { label: "Dream Wedding", href: "/packages" },
          { label: "Custom Experience", href: "/book-event" },
        ],
      },
    ],
  },
  {
    key: "baby-kids",
    label: "Baby & Kids",
    href: "/occasion/baby-shower",
    type: "mega",
    featured: { img: IMAGES.typeBabyShower, title: "Baby Shower Styling", subtitle: "Themed decor for baby showers & naming ceremonies", href: "/occasion/baby-shower/themed-baby-showers" },
    columns: [
      {
        heading: "Baby Shower",
        links: [
          { label: "All Baby Shower Decor", href: "/occasion/baby-shower" },
          { label: "Boho Floral Baby Shower", href: "/occasion/baby-shower/themed-baby-showers/boho-themes/boho-floral-baby-shower" },
          { label: "Little Prince Baby Shower", href: "/occasion/baby-shower/themed-baby-showers/royal-baby-themes/little-prince-baby-shower" },
          { label: "Little Princess Baby Shower", href: "/occasion/baby-shower/themed-baby-showers/royal-baby-themes/little-princess-baby-shower" },
          { label: "Photo Corner Setups", href: "/occasion/baby-shower/photo-corner-setups" },
        ],
      },
      {
        heading: "Newborn Welcome",
        links: [
          { label: "All Newborn Welcome", href: "/occasion/newborn-welcome" },
          { label: "Traditional Naming Ceremony", href: "/occasion/newborn-welcome/naming-ceremony-decor/traditional-naming-ceremony-decor" },
          { label: "Modern Naming Ceremony", href: "/occasion/newborn-welcome/naming-ceremony-decor/modern-naming-ceremony-setup" },
          { label: "Welcome Home Doorway Decor", href: "/occasion/newborn-welcome/welcome-home-setups/welcome-home-doorway-decor" },
        ],
      },
      {
        heading: "Kids Birthday",
        links: [
          { label: "All Kids Themes", href: "/occasion/birthday/kids-birthday" },
          { label: "Princess Themes", href: "/occasion/birthday/kids-birthday/princess-themes" },
          { label: "Superhero Themes", href: "/occasion/birthday/kids-birthday/superhero-themes" },
          { label: "Jungle Themes", href: "/occasion/birthday/kids-birthday/jungle-themes" },
        ],
      },
    ],
  },
  {
    key: "corporate",
    label: "Corporate",
    href: "/occasion/corporate",
    type: "mega",
    featured: { img: IMAGES.typeCorporate, title: "Corporate Excellence", subtitle: "Branded staging, AV production & guest hospitality", href: "/packages" },
    columns: [
      {
        heading: "Corporate Events",
        links: [
          { label: "All Corporate Events", href: "/occasion/corporate" },
          { label: "Brand Launch Stage Setup", href: "/occasion/corporate/product-launch/brand-launch-stage-setup" },
          { label: "Premium Product Unveiling", href: "/occasion/corporate/product-launch/premium-product-unveiling" },
          { label: "Conference Hall Branding", href: "/occasion/corporate/conference-office-party/conference-hall-branding" },
          { label: "Office Party Decor", href: "/occasion/corporate/conference-office-party/office-party-decor" },
        ],
      },
      {
        heading: "Packages",
        links: [
          { label: "Corporate Excellence", href: "/packages" },
          { label: "Grand Concert", href: "/packages" },
          { label: "View All Packages", href: "/packages" },
        ],
      },
    ],
  },
  {
    key: "festivals",
    label: "Festivals",
    href: "/occasion/festivals-culture",
    type: "mega",
    featured: { img: IMAGES.typeFestival, title: "Festive Decor", subtitle: "Diwali, Navratri, Holi & cultural celebrations", href: "/occasion/festivals-culture" },
    columns: [
      {
        heading: "Festival Decor",
        links: [
          { label: "All Festivals & Culture", href: "/occasion/festivals-culture" },
          { label: "Diwali Diya & Rangoli Setup", href: "/occasion/festivals-culture/diwali-festive-decor/diwali-diya-rangoli-setup" },
          { label: "Grand Diwali Home Decor", href: "/occasion/festivals-culture/diwali-festive-decor/grand-diwali-home-decor" },
          { label: "Navratri Garba Night Decor", href: "/occasion/festivals-culture/navratri-holi-cultural/navratri-garba-night-decor" },
          { label: "Holi Color-Fest Setup", href: "/occasion/festivals-culture/navratri-holi-cultural/holi-color-fest-setup" },
        ],
      },
      {
        heading: "More Occasions",
        links: [
          { label: "Annaprashan Decor", href: "/occasion/annaprashan" },
          { label: "Classic Annaprashan Setup", href: "/occasion/annaprashan/traditional-annaprashan-decor/classic-annaprashan-setup" },
          { label: "Royal Annaprashan Decor", href: "/occasion/annaprashan/traditional-annaprashan-decor/royal-annaprashan-decor" },
        ],
      },
    ],
  },
  {
    key: "cities",
    label: "Cities",
    href: "/contact",
    type: "cities",
    align: "right",
  },
  {
    key: "more",
    label: "More",
    href: "/gallery",
    type: "simple",
    align: "right",
    columns: [
      {
        heading: "Explore",
        links: [
          { label: "Gallery", href: "/gallery" },
          { label: "All Packages", href: "/packages" },
          { label: "All Products", href: "/products" },
          { label: "Shop by Occasion", href: "/shop-by-occasion" },
          { label: "About Us", href: "/about" },
          { label: "Contact Us", href: "/contact" },
          { label: "Book an Event", href: "/book-event" },
        ],
      },
    ],
  },
];
