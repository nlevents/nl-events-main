// Centralized image bank — swap these for real client photos.
import { clientImageFor } from "./clientImages";
import { cloudinaryAsset } from "../lib/cloudinaryAssets";

const UNSPLASH = "https://images.unsplash.com/";
function img(id, w) {
  return UNSPLASH + id + "?auto=format&fit=crop&w=" + (w || 1100) + "&q=75";
}

const CATALOG_ASSET = (name) => cloudinaryAsset(`/assets/images/catalog/${name}.webp`);

// Temporary hard-coded category artwork supplied by the project owner.
// These are local assets so category pages do not depend on the admin/catalog
// image records while the category hierarchy is being finalized.
export const CATALOG_IMAGES = {
  wedding: clientImageFor('wedding'),
  birthday: CATALOG_ASSET("birthday-root"),
  corporate: CATALOG_ASSET("corporate-event"),
  "kids-family": clientImageFor('kids-family'),
  anniversary: clientImageFor("engagement"),
  "festivals-culture": clientImageFor('festivals'),

  "birthday-types": CATALOG_ASSET("theme-party"),
  "kids-birthday": CATALOG_ASSET("birthday-kids-v2"),
  "teen-birthday": CATALOG_ASSET("birthday-teen-v2"),
  "adult-birthday": CATALOG_ASSET("birthday-adult-v2"),
  "milestone-birthday": CATALOG_ASSET("birthday-milestone-v2"),
  "20th-birthday": CATALOG_ASSET("milestone-birthday-2"),
  "30th-birthday": CATALOG_ASSET("milestone-birthday"),
  "40th-birthday": CATALOG_ASSET("milestone-birthday-2"),
  "50th-birthday": CATALOG_ASSET("milestone-birthday"),
  "surprise-birthday": CATALOG_ASSET("birthday-surprise-v2"),
  "theme-party": CATALOG_ASSET("birthday-theme-party-v2"),
  "cocomelon-theme": CATALOG_ASSET("theme-party-2"),
  "jungle-theme": CATALOG_ASSET("kids-birthday-2"),
  "princess-theme": CATALOG_ASSET("theme-party-2"),
  "superhero-theme": CATALOG_ASSET("kids-birthday-3"),
  "unicorn-theme": CATALOG_ASSET("theme-party-2"),
  "car-theme": clientImageFor('car-theme'),

  "wedding-events": clientImageFor('wedding-events'),
  haldi: clientImageFor('haldi'),
  "traditional-haldi": clientImageFor('haldi'),
  "floral-haldi": clientImageFor('haldi'),
  "boho-haldi": clientImageFor('haldi'),
  "poolside-haldi": clientImageFor('haldi'),
  "rustic-haldi": clientImageFor('haldi'),
  "theme-based-haldi": clientImageFor('haldi'),
  mehndi: clientImageFor('mehndi'),
  "traditional-mehndi": clientImageFor('mehndi'),
  "modern-mehndi": clientImageFor('mehndi'),
  "garden-mehndi": clientImageFor('mehndi'),
  "royal-mehndi": clientImageFor('mehndi'),
  "poolside-mehndi": clientImageFor('mehndi'),
  "theme-based-mehndi": clientImageFor('mehndi'),
  sangeet: clientImageFor('sangeet'),
  "bollywood-sangeet": clientImageFor('sangeet'),
  "royal-sangeet": clientImageFor('sangeet'),
  "contemporary-sangeet": clientImageFor('sangeet'),
  "thematic-sangeet": clientImageFor('sangeet'),
  "led-sangeet": clientImageFor('sangeet'),
  "intimate-sangeet": clientImageFor('sangeet'),
  wedding: clientImageFor('wedding'),
  reception: clientImageFor('reception'),
  "classic-reception": clientImageFor('reception'),
  "modern-reception": clientImageFor('reception'),
  "floral-reception": clientImageFor('reception'),
  "stage-focused-reception": clientImageFor('reception'),
  "theme-based-reception": clientImageFor('reception'),
  engagement: clientImageFor('engagement'),
  "classic-engagement": clientImageFor('engagement'),
  "floral-engagement": clientImageFor('engagement'),
  "modern-engagement": clientImageFor('engagement'),
  "rooftop-engagement": clientImageFor('engagement'),
  "theme-based-engagement": clientImageFor('engagement'),
  maira: clientImageFor('maira'),
  mayra: clientImageFor('maira'),
  "mayra-and-rituals": clientImageFor('maira'),
  rituals: clientImageFor('maira'),
  "traditional-maira": clientImageFor('maira'),
  "colorful-maira": clientImageFor('maira'),
  "floral-maira": clientImageFor('maira'),
  "rajasthani-maira": clientImageFor('maira'),
  "theme-based-maira": clientImageFor('maira'),
  "traditional-rituals": clientImageFor('maira'),
  "colorful-rituals": clientImageFor('maira'),
  "floral-rituals": clientImageFor('maira'),
  "rajasthani-rituals": clientImageFor('maira'),
  "theme-based-rituals": clientImageFor('maira'),
  services: clientImageFor('decor'),
  decor: clientImageFor('decor'),
  entertainment: CATALOG_ASSET("entertainment"),
  "sound-technical": clientImageFor('sound-technical'),
  "tent-furniture": clientImageFor('tent-furniture'),
  "photography-videography": CATALOG_ASSET("photography"),
  catering: clientImageFor('catering'),
  "baraat-procession": clientImageFor('baraat-procession'),

  "family-celebrations": clientImageFor('family-celebrations'),
  "baby-shower": clientImageFor('baby-shower'),
  annaprashan: clientImageFor('annaprashan'),
  "mundan-ceremony": clientImageFor('mundan-ceremony'),
  "naming-ceremony": clientImageFor('naming-ceremony'),
  "kids-family-second-section": CATALOG_ASSET("kids-birthday-2"),

  "annual-day": CATALOG_ASSET("annual-day"),
  "product-launch": CATALOG_ASSET("product-launch"),
  conference: CATALOG_ASSET("conference"),
  exhibition: CATALOG_ASSET("exhibition"),
  "awards-ceremony": CATALOG_ASSET("award-ceremony"),
  "employee-engagement": CATALOG_ASSET("employee-engagement"),
  "dealer-partner-meet": CATALOG_ASSET("corporate-event"),
  "corporate-party": CATALOG_ASSET("corporate-event"),
  "seminar-workshop": CATALOG_ASSET("conference"),
  "brand-activation": CATALOG_ASSET("corporate-event"),
  "corporate-celebration": CATALOG_ASSET("corporate-celebration"),

  "anniversary-types": CATALOG_ASSET("romance"),
  "first-anniversary": CATALOG_ASSET("romance"),
  "fifth-anniversary": CATALOG_ASSET("romance"),
  "tenth-anniversary": CATALOG_ASSET("romance"),
  "twenty-fifth-anniversary": CATALOG_ASSET("romance"),
  "fiftieth-anniversary": CATALOG_ASSET("romance"),
  "romantic-anniversary": CATALOG_ASSET("romance"),
  "anniversary-surprise": CATALOG_ASSET("romance"),

  festivals: clientImageFor('festivals'),
  diwali: clientImageFor('diwali'),
  holi: clientImageFor('holi'),
  christmas: clientImageFor('christmas'),
  "new-year": clientImageFor('new-year'),
  navratri: clientImageFor('navratri'),
  eid: CATALOG_ASSET("eid"),
  "other-festivals": CATALOG_ASSET("other-festivals"),
  "other-celebrations": CATALOG_ASSET("festival-offer-celebration"),
  housewarming: clientImageFor('housewarming'),
  "religious-event": CATALOG_ASSET("festival-offer-celebration"),
  "get-together": CATALOG_ASSET("event-entrance"),
  farewell: clientImageFor('farewell'),
  reunion: CATALOG_ASSET("event-entrance"),
  "custom-event": CATALOG_ASSET("event-entrance"),
  sfx: CATALOG_ASSET("event-entrance"),
  "cold-pyro": CATALOG_ASSET("event-entrance"),
  fog: CATALOG_ASSET("event-entrance"),
  fireworks: CATALOG_ASSET("event-entrance"),
  artists: CATALOG_ASSET("entertainment"),
  photography: CATALOG_ASSET("photography"),
  "wedding-activity": CATALOG_ASSET("event-entrance"),
};

export const IMAGES = {
  heroHome: img("photo-1519741497674-611481863552", 1600),
  heroServices: img("photo-1519225421980-715cb0215aed", 1600),
  heroWedding: img("photo-1519741497674-611481863552", 1600),
  heroBirthday: img("photo-1530103862676-de8c9debad1d", 1600),
  heroConcert: img("photo-1470229722913-7c0e2dbbafd3", 1600),
  heroCorporate: img("photo-1511578314322-379afb476865", 1600),
  heroCustom: img("photo-1478146059778-26028b07395a", 1600),
  heroPackages: img("photo-1478146059778-26028b07395a", 1600),
  heroGallery: img("photo-1464366400600-7168b8af9bc3", 1600),
  heroAbout: img("photo-1522673607200-164d1b6ce486", 1600),
  heroContact: img("photo-1519671482749-fd09be7ccebf", 1600),
  heroBook: img("photo-1511795409834-ef04bbd61622", 1600),

  typeWedding: CATALOG_IMAGES.wedding,
  typeBirthday: CATALOG_IMAGES.birthday,
  typeAnniversary: CATALOG_IMAGES.anniversary,
  typeConcert: img("photo-1470229722913-7c0e2dbbafd3"),
  typeCorporate: CATALOG_IMAGES.corporate,
  typeCustom: img("photo-1478146059778-26028b07395a"),
  typePhotography: CATALOG_IMAGES["photography-videography"],
  typeCatering: CATALOG_IMAGES.catering,
  typeDecor: CATALOG_IMAGES.decor,
  typeBabyShower: CATALOG_IMAGES["kids-family"],
  typeNewbornWelcome: cloudinaryAsset("/assets/images/categories/newborn-welcome.webp"),
  typeKidsBirthday: CATALOG_IMAGES["kids-birthday"],
  typeAnnaprashan: img("photo-1478146059778-26028b07395a"),
  typeFestival: CATALOG_IMAGES["festivals-culture"],
  heroAnnaprashan: img("photo-1478146059778-26028b07395a", 1600),
  heroFestival: img("photo-1573455494060-c5595004fb6c", 1600),

  heroCompactHome: img("photo-1519225421980-715cb0215aed", 1200),
  promo1: img("photo-1519741497674-611481863552", 1000),
  promo2: img("photo-1470229722913-7c0e2dbbafd3", 1000),
  promo3: img("photo-1511578314322-379afb476865", 1000),
  promo4: img("photo-1530103862676-de8c9debad1d", 1000),
  seasonalBand: img("photo-1478146059778-26028b07395a", 1400),
  portfolioWide: img("photo-1606216794074-735e91aa2c92", 1400),

  pkgDreamWedding: img("photo-1583939003579-730e3918a45a"),
  pkgBirthdayBash: img("photo-1464349095431-e9a21285b5f3"),
  pkgCorporateExcellence: img("photo-1505373877841-8d25f7d46678"),
  pkgRoyalWedding: img("photo-1606216794074-735e91aa2c92"),
  pkgPremiumBirthday: img("photo-1478146059778-26028b07395a"),
  pkgGrandConcert: img("photo-1459749411175-04bf5292ceea"),
  pkgCustomExperience: img("photo-1519671482749-fd09be7ccebf"),

  showcase1: img("photo-1519167758481-83f550bb49b3"),
  showcase2: img("photo-1560184897-ae75f418493e"),
  showcase3: img("photo-1522673607200-164d1b6ce486"),
  showcase4: img("photo-1527529482837-4698179dc6ce"),
  showcase5: img("photo-1544923246-77307dd654cb"),
  showcase6: img("photo-1533895328947-a8d5323b8bcf"),
  showcase7: img("photo-1571407970349-bc81e7e96d47"),
  showcase8: img("photo-1509228468518-180dd4864904"),

  galWedding1: img("photo-1519741497674-611481863552"),
  galWedding2: img("photo-1583939003579-730e3918a45a"),
  galWedding3: img("photo-1606800052052-a08af7148866"),
  galBirthday1: img("photo-1530103862676-de8c9debad1d"),
  galBirthday2: img("photo-1464349095431-e9a21285b5f3"),
  galBirthday3: img("photo-1558636508-e0db3814bd1d"),
  galCorporate1: img("photo-1511578314322-379afb476865"),
  galCorporate2: img("photo-1505373877841-8d25f7d46678"),
  galCorporate3: img("photo-1556761175-5973dc0f32e7"),
  galConcert1: img("photo-1470229722913-7c0e2dbbafd3"),
  galConcert2: img("photo-1459749411175-04bf5292ceea"),
  galConcert3: img("photo-1429962714451-bb934ecdc4ec"),
  galDecor1: img("photo-1478146059778-26028b07395a"),
  galDecor2: img("photo-1519167758481-83f550bb49b3"),
  galDecor3: img("photo-1522673607200-164d1b6ce486"),

  about1: img("photo-1519671482749-fd09be7ccebf", 1400),
  about2: img("photo-1511795409834-ef04bbd61622", 1400),

  // Theme-accurate photos for products that previously shared mismatched
  // stock images (verified against real Unsplash listings, not reused
  // generic slots).
  themeMehndiHenna: img("photo-1606216794074-735e91aa2c92"),
  themeDinosaurToy: img("photo-1464349095431-e9a21285b5f3"),
  themePony: img("photo-1558636508-e0db3814bd1d"),
  themeJungleLeaves: img("photo-1478146059778-26028b07395a"),
  themeTiaraCrown: img("photo-1530103862676-de8c9debad1d"),
  themeBalloonArch: img("photo-1558636508-e0db3814bd1d"),
  themeBalloonCelebration: img("photo-1464349095431-e9a21285b5f3"),
  themeHoliColors: img("photo-1522673607200-164d1b6ce486"),
  themeStageLights: img("photo-1470229722913-7c0e2dbbafd3"),
  themePampasGrass: img("photo-1519167758481-83f550bb49b3"),
};



// Local, category-specific catalog artwork. These are stable on-site assets
// used for dummy/demo catalog content so a category never falls back to an
// unrelated wedding, cake or generic stock photo.


export const WHATSAPP_NUMBER = "917903133317";
export const WA_DEFAULT_MSG =
  "Hi Next Level Events! I'd like to know more about your event planning services.";

export function waLink(customMsg) {
  const msg = customMsg || WA_DEFAULT_MSG;
  return "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(msg);
}

export function fmtINR(n) {
  return "₹" + Number(n).toLocaleString("en-IN");
}
