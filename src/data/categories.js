import { IMAGES } from "./images";

// Display label for each product/package category key (matches the
// `category` field used in ./products.js — e.g. "wedding", "birthday").
// Single place to change how a category reads in tags/filters/badges.
export const CATEGORY_LABELS = {
  wedding: "Wedding",
  birthday: "Kids Theme Decor",
  corporate: "Corporate",
  concert: "Concert",
};

export const CATEGORIES = {
  weddings: {
    title: "Weddings — Next Level Events",
    description: "Wedding planning and decor by Next Level Events — mandap styling, catering coordination and full-day management across India.",
    heroAlt: "Indian wedding mandap decorated with fresh flowers and gold lighting",
    heroImg: IMAGES.heroWedding,
    eyebrow: "Weddings",
    title1: "Weddings, Designed", title2: "Around Your Story.",
    lead: "Mandap and stage design, floral styling, catering coordination and full-day management — for ceremonies of every scale.",
    whatHead: "What We Create",
    whatBody: "From an intimate 50-guest mehendi to a 1,000-guest reception, we design mandaps, entrance décor, stage backdrops and lighting that hold your story together across every ceremony.",
    showcase: [
      { img: IMAGES.showcase1, alt: "Floral mandap installation" },
      { img: IMAGES.showcase2, alt: "Wedding reception stage lighting" },
      { img: IMAGES.pkgDreamWedding, alt: "Bridal entry decor with drapes" },
    ],
    packages: [
      { tag: "Wedding", img: IMAGES.pkgDreamWedding, name: "Dream Wedding", desc: "Venue styling, mandap décor, catering coordination and full-day management.", price: 99999 },
      { tag: "Wedding", img: IMAGES.pkgRoyalWedding, name: "Royal Wedding", desc: "Multi-day décor, celebrity-grade staging, premium catering and guest concierge.", price: 199999 },
      { tag: "Wedding", img: IMAGES.pkgCustomExperience, name: "Custom Experience", desc: "A fully bespoke wedding built to your theme, city and guest list.", price: null },
    ],
    addons: [
      { name: "Fireworks Show", price: 11999 }, { name: "Live Band", price: 9999 },
      { name: "Cold Pyro Entry", price: 5999 }, { name: "360° Photo Booth", price: 6999 },
    ],
    ctaTitle: "Ready to plan your wedding?",
  },
  birthdays: {
    title: "Birthdays — Next Level Events",
    description: "Birthday party planning and decoration by Next Level Events — themed backdrops, balloon styling and entertainment.",
    heroAlt: "Birthday celebration with themed balloon backdrop",
    heroImg: IMAGES.heroBirthday,
    eyebrow: "Kids Theme Decor",
    title1: "Birthdays That Feel", title2: "Like a Celebration.",
    lead: "Themed backdrops, balloon art, cake tables and entertainment for milestone birthdays and kids' parties alike.",
    whatHead: "What We Create",
    whatBody: "Character themes for kids, elegant milestone set-ups for adults, and everything from balloon arches to interactive entertainment corners.",
    showcase: [
      { img: IMAGES.pkgBirthdayBash, alt: "Birthday balloon arch backdrop" },
      { img: IMAGES.themeDinosaurToy, alt: "Kids birthday themed decor" },
      { img: IMAGES.pkgPremiumBirthday, alt: "Milestone birthday cake table styling" },
    ],
    packages: [
      { tag: "Birthday", img: IMAGES.pkgBirthdayBash, name: "Birthday Bash", desc: "Themed backdrop, balloon styling, cake table and entertainment add-ons.", price: 19999 },
      { tag: "Birthday", img: IMAGES.pkgPremiumBirthday, name: "Premium Birthday", desc: "Custom theme design, premium florals, photo corner and host coordination.", price: 39999 },
      { tag: "Birthday", img: IMAGES.pkgCustomExperience, name: "Custom Experience", desc: "A fully personalised birthday theme, built around the guest of honour.", price: null },
    ],
    addons: [
      { name: "Live Band", price: 9999 }, { name: "Cold Pyro Entry", price: 5999 },
      { name: "360° Photo Booth", price: 6999 }, { name: "Fireworks Show", price: 11999 },
    ],
    ctaTitle: "Let's plan a birthday to remember.",
  },
  concerts: {
    title: "Concerts & Shows — Next Level Events",
    description: "Concert and live show production by Next Level Events — stage, sound, lighting design and artist coordination.",
    heroAlt: "Concert stage with dramatic lighting design",
    heroImg: IMAGES.heroConcert,
    eyebrow: "Concerts & Shows",
    title1: "Shows Built For", title2: "Every Seat In The Room.",
    lead: "Stage production, sound and lighting design, artist coordination and crowd-ready logistics for concerts of any size.",
    whatHead: "What We Create",
    whatBody: "End-to-end production — stage rigging, line-array sound, lighting design, artist green rooms and crowd flow planning for a seamless show.",
    showcase: [
      { img: IMAGES.typeConcert, alt: "Concert stage production" },
      { img: IMAGES.pkgGrandConcert, alt: "Live show lighting rig" },
      { img: IMAGES.themeStageLights, alt: "Outdoor concert crowd setup" },
    ],
    packages: [
      { tag: "Concert", img: IMAGES.pkgGrandConcert, name: "Grand Concert", desc: "Full stage and sound production, lighting design and artist coordination.", price: 299999 },
      { tag: "Concert", img: IMAGES.pkgCorporateExcellence, name: "Corporate Excellence", desc: "Branded stage production for company events, launches and offsites.", price: 69999 },
      { tag: "Concert", img: IMAGES.pkgCustomExperience, name: "Custom Experience", desc: "A production plan scaled to your venue, artist and audience size.", price: null },
    ],
    addons: [
      { name: "Live Band", price: 9999 }, { name: "Cold Pyro Entry", price: 5999 },
      { name: "Fireworks Show", price: 11999 }, { name: "360° Photo Booth", price: 6999 },
    ],
    ctaTitle: "Planning a show or live event?",
  },
  corporate: {
    title: "Corporate Events — Next Level Events",
    description: "Corporate event management by Next Level Events — launches, conferences and offsites with branded staging and AV production.",
    heroAlt: "Corporate event stage with branded backdrop",
    heroImg: IMAGES.heroCorporate,
    eyebrow: "Corporate Events",
    title1: "Corporate Events That", title2: "Reflect Your Brand.",
    lead: "Product launches, conferences and offsites — branded staging, AV production and guest hospitality, delivered on schedule.",
    whatHead: "What We Create",
    whatBody: "Stage and set design carrying your brand system, AV and livestream production, registration and hospitality desks, and structured guest flow.",
    showcase: [
      { img: IMAGES.typeCorporate, alt: "Corporate stage branding" },
      { img: IMAGES.pkgCorporateExcellence, alt: "Conference hall setup" },
      { img: IMAGES.showcase6, alt: "Product launch event decor" },
    ],
    packages: [
      { tag: "Corporate", img: IMAGES.pkgCorporateExcellence, name: "Corporate Excellence", desc: "Stage design, AV production, hospitality desk and guest management.", price: 69999 },
      { tag: "Corporate", img: IMAGES.pkgGrandConcert, name: "Grand Concert", desc: "Full production for large-scale conferences, launches and live shows.", price: 299999 },
      { tag: "Corporate", img: IMAGES.pkgCustomExperience, name: "Custom Experience", desc: "A brand-led experience scaled to your headcount and venue.", price: null },
    ],
    addons: [
      { name: "Live Band", price: 9999 }, { name: "360° Photo Booth", price: 6999 },
      { name: "Fireworks Show", price: 11999 }, { name: "Cold Pyro Entry", price: 5999 },
    ],
    ctaTitle: "Let's design your next corporate event.",
  },
  "custom-events": {
    title: "Custom Events — Next Level Events",
    description: "Custom themed events by Next Level Events — bespoke experiences designed from scratch for any occasion.",
    heroAlt: "Custom themed event decor installation",
    heroImg: IMAGES.heroCustom,
    eyebrow: "Custom Events",
    title1: "For Everything", title2: "Outside The Ordinary.",
    lead: "Immersive themes, private experiences and one-off celebrations — designed from a blank page, built around your idea.",
    whatHead: "What We Create",
    whatBody: "Anniversaries, baby showers, festival celebrations, brand pop-ups — if it needs a theme and a plan, we design it from concept to teardown.",
    showcase: [
      { img: IMAGES.pkgCustomExperience, alt: "Custom themed decor installation" },
      { img: IMAGES.showcase8, alt: "Immersive event experience design" },
      { img: IMAGES.typeAnniversary, alt: "Personalised celebration setup" },
    ],
    packages: [
      { tag: "Custom", img: IMAGES.pkgCustomExperience, name: "Custom Experience", desc: "A fully bespoke event, scoped and priced around your specific brief.", price: null },
      { tag: "Custom", img: IMAGES.pkgPremiumBirthday, name: "Premium Birthday", desc: "Immersive themed milestone celebrations with custom set design.", price: 39999 },
      { tag: "Custom", img: IMAGES.pkgRoyalWedding, name: "Royal Wedding", desc: "Large-scale custom staging for milestone family celebrations.", price: 199999 },
    ],
    addons: [
      { name: "Fireworks Show", price: 11999 }, { name: "Live Band", price: 9999 },
      { name: "Cold Pyro Entry", price: 5999 }, { name: "360° Photo Booth", price: 6999 },
    ],
    ctaTitle: "Have an idea that doesn't fit a category?",
  },
};

export const GALLERY_ITEMS = [
  { img: IMAGES.galWedding1, alt: "Wedding mandap decor", category: "weddings", tall: true },
  { img: IMAGES.galBirthday1, alt: "Birthday balloon backdrop", category: "birthdays" },
  { img: IMAGES.galCorporate1, alt: "Corporate stage setup", category: "corporate" },
  { img: IMAGES.galConcert1, alt: "Concert stage lighting", category: "concerts" },
  { img: IMAGES.galDecor1, alt: "Premium floral decor", category: "decor" },
  { img: IMAGES.galWedding2, alt: "Wedding reception styling", category: "weddings", tall: true },
  { img: IMAGES.galBirthday2, alt: "Kids birthday theme decor", category: "birthdays" },
  { img: IMAGES.galCorporate2, alt: "Product launch event", category: "corporate" },
  { img: IMAGES.galConcert2, alt: "Live show production", category: "concerts" },
  { img: IMAGES.galDecor2, alt: "Entrance floral installation", category: "decor" },
  { img: IMAGES.galWedding3, alt: "Bridal entry decor", category: "weddings" },
  { img: IMAGES.galBirthday3, alt: "Milestone birthday setup", category: "birthdays" },
  { img: IMAGES.galCorporate3, alt: "Conference hall branding", category: "corporate" },
  { img: IMAGES.galConcert3, alt: "Outdoor concert setup", category: "concerts" },
  { img: IMAGES.galDecor3, alt: "Anniversary floral arch", category: "decor" },
];
