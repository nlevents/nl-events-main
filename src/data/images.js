// Centralized image bank — swap these for real client photos.
const UNSPLASH = "https://images.unsplash.com/";
function img(id, w) {
  return UNSPLASH + id + "?auto=format&fit=crop&w=" + (w || 1200) + "&q=80";
}

export const IMAGES = {
  heroHome: img("photo-1519741497674-611481863552", 1800),
  heroServices: img("photo-1519225421980-715cb0215aed", 1800),
  heroWedding: img("photo-1519741497674-611481863552", 1800),
  heroBirthday: img("photo-1530103862676-de8c9debad1d", 1800),
  heroConcert: img("photo-1470229722913-7c0e2dbbafd3", 1800),
  heroCorporate: img("photo-1511578314322-379afb476865", 1800),
  heroCustom: img("photo-1478146059778-26028b07395a", 1800),
  heroPackages: img("photo-1478146059778-26028b07395a", 1800),
  heroGallery: img("photo-1464366400600-7168b8af9bc3", 1800),
  heroAbout: img("photo-1522673607200-164d1b6ce486", 1800),
  heroContact: img("photo-1519671482749-fd09be7ccebf", 1800),
  heroBook: img("photo-1511795409834-ef04bbd61622", 1800),

  typeWedding: "/assets/images/categories/wedding.webp",
  typeBirthday: "/assets/images/categories/birthday-decor.webp",
  typeAnniversary: "/assets/images/categories/romance.webp",
  typeConcert: img("photo-1470229722913-7c0e2dbbafd3"),
  typeCorporate: img("photo-1511578314322-379afb476865"),
  typeCustom: img("photo-1478146059778-26028b07395a"),
  typePhotography: img("photo-1519741497674-611481863552"),
  typeCatering: img("photo-1414235077428-338989a2e8c0"),
  typeDecor: img("photo-1478146059778-26028b07395a"),
  typeBabyShower: "/assets/images/categories/babyshower.webp",
  typeNewbornWelcome: "/assets/images/categories/newborn-welcome.webp",
  typeKidsBirthday: "/assets/images/categories/kids-birthday.webp",
  typeAnnaprashan: img("photo-1478146059778-26028b07395a"),
  typeFestival: img("photo-1573455494060-c5595004fb6c"),
  heroAnnaprashan: img("photo-1478146059778-26028b07395a", 1800),
  heroFestival: img("photo-1573455494060-c5595004fb6c", 1800),

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
