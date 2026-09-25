// ===========================================================
// SHOP BY OCCASION — data-driven category tree.
//
// One recursive tree instead of separate hard-coded pages per category.
// Every node has a `type`: "occasion" | "category" | "theme" | "product".
// A node may have `children` (sub-nodes to browse) and/or `products`
// (leaf items to list/sell). Both templates that render this data
// (CategoryTemplate for browsing, ProductTemplate for a single product)
// read from the same shape, so the UI never needs a per-category layout.
//
// TO ADD A NEW OCCASION LATER: push one more object into OCCASIONS below.
// No routing, component, or template changes are required — OccasionBrowser
// resolves any depth of the tree generically from the URL path.
// ===========================================================

import { IMAGES } from "./images";

let uid = 0;
function nextId(prefix) {
  uid += 1;
  return prefix + "-" + uid;
}

function makeProduct(p) {
  return {
    type: "product",
    id: nextId("occ-prod"),
    rating: 4.6,
    reviewCount: 24,
    includes: [],
    addons: [],
    ...p,
  };
}
function makeTheme(t) {
  return { type: "theme", id: nextId("occ-theme"), ...t };
}
function makeCategory(c) {
  return { type: "category", id: nextId("occ-cat"), ...c };
}
function makeOccasion(o) {
  return { type: "occasion", id: nextId("occ-top"), ...o };
}

export const OCCASIONS = [
  // Event Services is a real catalog branch. It is intentionally hidden from
  // the normal Shop by Occasion browser, but it gives every service a proper
  // category hierarchy: Event Services → SFX → actual SFX products, etc.
  makeOccasion({
    slug: "event-services",
    label: "Event Services",
    tagline: "Enhance your event with specialist services.",
    description: "Browse services by category, then choose the actual package or service you need.",
    image: IMAGES.showcase7,
    heroImg: IMAGES.showcase7,
    addonOnly: true,
    children: [
      makeCategory({
        slug: "sfx",
        label: "SFX",
        description: "Special effects including cold pyro, fog and fireworks.",
        image: IMAGES.showcase7,
        products: [
          makeProduct({ slug: "cold-pyro", name: "Cold Pyro", setupType: "SFX", shortDesc: "Indoor-friendly cold spark special effects for entries and stages.", image: IMAGES.showcase7, price: 3499, originalPrice: 4499, includes: ["Cold pyro machines", "Operator", "Setup & takedown"] }),
          makeProduct({ slug: "fog-machine", name: "Fog Machine", setupType: "SFX", shortDesc: "Low-lying or atmospheric fog effects for stage and dance-floor moments.", image: IMAGES.showcase7, price: 3999, originalPrice: 4999, includes: ["Fog machine", "Fog fluid", "Operator"] }),
          makeProduct({ slug: "fireworks", name: "Fireworks", setupType: "SFX", shortDesc: "Celebration fireworks coordinated around your event schedule and venue rules.", image: IMAGES.showcase7, price: 5999, originalPrice: 7499, includes: ["Firework selection", "Professional operator", "Event coordination"] }),
        ],
      }),
      makeCategory({
        slug: "artists",
        label: "Artists",
        description: "Dancers, anchors, performers and live entertainment.",
        image: IMAGES.galConcert2,
        products: [
          makeProduct({ slug: "anchor-host", name: "Anchor / Host", setupType: "Artist", shortDesc: "Professional event host for guest engagement and stage flow.", image: IMAGES.galConcert2, price: 9999, originalPrice: 11999, includes: ["Professional anchor", "Event coordination", "Stage hosting"] }),
          makeProduct({ slug: "dance-performance", name: "Dance Performance", setupType: "Artist", shortDesc: "Live dance performance curated for your celebration.", image: IMAGES.galConcert2, price: 8999, originalPrice: 10999, includes: ["Dance performers", "Performance set", "Event coordination"] }),
        ],
      }),
      makeCategory({
        slug: "photography",
        label: "Photography",
        description: "Candid, cinematic, traditional and drone photography options.",
        image: IMAGES.typePhotography,
        products: [
          makeProduct({ slug: "candid-photography", name: "Candid Photography", setupType: "Photography", shortDesc: "Natural candid coverage focused on people, moments and details.", image: IMAGES.typePhotography, price: 14999, originalPrice: 17999, includes: ["Candid photographer", "Event coverage", "Edited photographs"] }),
          makeProduct({ slug: "cinematic-video", name: "Cinematic Video", setupType: "Photography", shortDesc: "Cinematic event film coverage with polished editing.", image: IMAGES.typePhotography, price: 19999, originalPrice: 23999, includes: ["Cinematic videographer", "Event coverage", "Edited highlight film"] }),
          makeProduct({ slug: "drone-coverage", name: "Drone Coverage", setupType: "Photography", shortDesc: "Aerial event footage where venue and regulations permit.", image: IMAGES.typePhotography, price: 9999, originalPrice: 11999, includes: ["Drone operator", "Aerial footage", "Edited clips"] }),
        ],
      }),
      makeCategory({
        slug: "wedding-activity",
        label: "Wedding Activity",
        description: "Games, rituals and guest-engagement experiences.",
        image: IMAGES.showcase3,
        products: [
          makeProduct({ slug: "wedding-games", name: "Wedding Games", setupType: "Wedding Activity", shortDesc: "Interactive games and activities to keep wedding guests engaged.", image: IMAGES.showcase3, price: 6999, originalPrice: 8499, includes: ["Curated games", "Activity coordination", "Host support"] }),
        ],
      }),
      makeCategory({
        slug: "baraat-procession",
        label: "Baraat Procession",
        description: "Dhol, band and entry styling for the baraat procession.",
        image: IMAGES.themeStageLights,
        products: [
          makeProduct({ slug: "dhol-baraat", name: "Dhol Baraat Entry", setupType: "Baraat", shortDesc: "Energetic dhol-led baraat entry support.", image: IMAGES.themeStageLights, price: 12999, originalPrice: 14999, includes: ["Dhol performers", "Entry coordination", "Procession support"] }),
          makeProduct({ slug: "band-baraat", name: "Band & Baraat Entry", setupType: "Baraat", shortDesc: "Band-led baraat procession with coordinated entry styling.", image: IMAGES.themeStageLights, price: 17999, originalPrice: 20999, includes: ["Band", "Entry coordination", "Procession support"] }),
        ],
      }),
    ],
  }),

  makeOccasion({
    slug: "dummy-event",
    label: "Dummy Event",
    tagline: "A test event.",
    description: "This is a dummy event added for testing purposes.",
    image: IMAGES.heroCustom,
    heroImg: IMAGES.heroCustom,
    children: [
      makeCategory({
        slug: "dummy-category",
        label: "Dummy Category",
        description: "A test category.",
        image: IMAGES.heroCustom,
        products: [
          makeProduct({
            slug: "dummy-product-1",
            name: "Dummy Product 1",
            setupType: "Test Setup",
            shortDesc: "A simple dummy product.",
            image: IMAGES.heroCustom,
            price: 999,
            originalPrice: 1299,
            includes: ["Dummy item 1", "Dummy item 2"]
          }),
          makeProduct({
            slug: "dummy-product-2",
            name: "Dummy Product 2",
            setupType: "Test Setup",
            shortDesc: "Another simple dummy product.",
            image: IMAGES.heroCustom,
            price: 1999,
            originalPrice: 2499,
            includes: ["Dummy item A", "Dummy item B"]
          })
        ]
      })
    ]
  }),
  makeOccasion({
    slug: "birthday",
    label: "Birthdays",
    tagline: "Themed birthday decor for kids, milestones and everything in between.",
    description: "From jungle safaris to princess castles, superhero squads to golden milestones — browse birthday themes and balloon setups, all customised for your city.",
    image: IMAGES.heroBirthday,
    heroImg: IMAGES.heroBirthday,
    children: [
      makeCategory({
        slug: "kids-birthday",
        label: "Kids Birthday",
        description: "Pick a theme your little one will love — every setup is fully customisable.",
        image: IMAGES.typeKidsBirthday,
        children: [
          makeCategory({
            slug: "animal-theme",
            label: "Animal Theme",
            description: "Jungle safari, horse, dinosaur and wild-animal birthday themes.",
            image: IMAGES.themeJungleLeaves,
            children: [
              makeTheme({
                slug: "jungle-safari",
                label: "Jungle Safari",
                description: "A leafy safari adventure with animal props and balloons.",
                image: IMAGES.themeJungleLeaves,
                products: [
                  makeProduct({
                    slug: "jungle-safari-theme-birthday",
                    name: "Jungle Safari Theme Birthday",
                    setupType: "Theme Decor",
                    shortDesc: "A wild jungle safari setup with animal cutouts, leafy backdrops and a safari-style balloon arch.",
                    description: "Turn the party into a jungle expedition — lush green backdrops, animal cutout standees, safari bunting and a balloon arch in earthy tones, finished with a matching cake table.",
                    image: IMAGES.themeJungleLeaves,
                    gallery: [IMAGES.themeJungleLeaves, IMAGES.themeDinosaurToy],
                    price: 14999,
                    originalPrice: 18999,
                    includes: ["Jungle-themed backdrop", "Animal cutout standees", "Safari balloon arch", "Themed cake table styling", "Fairy-light accents"],
                  }),
                ],
              }),
              makeTheme({
                slug: "horse-theme",
                label: "Horse Theme",
                description: "A playful horse and pony themed birthday setup.",
                image: IMAGES.themePony,
                products: [
                  makeProduct({
                    slug: "horse-theme-birthday",
                    name: "Horse Theme Birthday",
                    setupType: "Theme Decor",
                    shortDesc: "A playful horse-and-pony birthday setup with a themed backdrop and balloon styling.",
                    description: "A cheerful horse theme with a pony-inspired backdrop, coordinated balloons, cake table styling and a photo-ready party corner.",
                    image: IMAGES.themePony,
                    gallery: [IMAGES.themePony, IMAGES.themeJungleLeaves],
                    price: 13999,
                    originalPrice: 16999,
                    includes: ["Horse-themed backdrop", "Balloon styling", "Cake table styling", "Photo props"],
                  }),
                ],
              }),
              makeTheme({
                slug: "dinosaur-theme",
                label: "Dinosaur Theme",
                description: "Dino adventure styling for little explorers.",
                image: IMAGES.themeDinosaurToy,
                products: [
                  makeProduct({
                    slug: "wild-animal-kingdom-birthday",
                    name: "Wild Animal Kingdom Birthday",
                    setupType: "Theme Decor",
                    shortDesc: "A colourful wild-animal party setup with dino and jungle-friend props.",
                    description: "A playful animal-kingdom theme with dinosaur and jungle-friend props, leaf garlands and a bright balloon backdrop for full-room styling.",
                    image: IMAGES.themeDinosaurToy,
                    gallery: [IMAGES.themeDinosaurToy, IMAGES.themeJungleLeaves],
                    price: 12999,
                    originalPrice: 15999,
                    includes: ["Animal-themed backdrop", "Dino & jungle-friend props", "Balloon garland", "Cake table styling"],
                  }),
                ],
              }),
            ],
          }),
          makeCategory({
            slug: "car-theme",
            label: "Car Theme",
            description: "Racing, cars and transport-inspired birthday decorations for kids.",
            image: IMAGES.themeBalloonArch,
          }),
          makeCategory({
            slug: "frozen-theme",
            label: "Frozen Theme",
            description: "Blue, white and winter-wonderland birthday styling.",
            image: IMAGES.heroBirthday,
          }),
          makeCategory({
            slug: "barbie-theme",
            label: "Barbie Theme",
            description: "Pink, glam and playful Barbie-inspired birthday styling.",
            image: IMAGES.themePony,
          }),
          makeTheme({
            slug: "princess-theme",
            label: "Princess Theme",
            description: "Castles, tiaras and fairy-tale styling for the guest of honour.",
            image: IMAGES.themeTiaraCrown,
            products: [
              makeProduct({
                slug: "princess-castle-birthday",
                name: "Princess Castle Birthday",
                setupType: "Theme Decor",
                shortDesc: "A dreamy princess-castle backdrop with tiaras, pastel balloons and fairy lights.",
                description: "A fairy-tale princess setup with a castle backdrop, pastel balloon styling, tiara photo props and fairy-light drapes for a magical celebration.",
                image: IMAGES.themeTiaraCrown,
                gallery: [IMAGES.themeTiaraCrown, IMAGES.themePony],
                price: 15999,
                originalPrice: 19999,
                includes: ["Castle backdrop", "Pastel balloon styling", "Tiara photo props", "Fairy-light drape"],
              }),
              makeProduct({
                slug: "fairy-tale-princess-party",
                name: "Fairy Tale Princess Party",
                setupType: "Theme Decor",
                shortDesc: "Soft pastel florals and a pony/carriage photo corner for a fairy-tale feel.",
                description: "A soft, romantic princess theme with pastel florals, a pony-and-carriage photo corner and gold accents throughout.",
                image: IMAGES.themePony,
                gallery: [IMAGES.themePony, IMAGES.themeTiaraCrown],
                price: 13999,
                originalPrice: 17499,
                includes: ["Pastel floral styling", "Photo corner", "Balloon backdrop", "Cake table styling"],
              }),
            ],
          }),
          makeTheme({
            slug: "superhero-theme",
            label: "Superhero Theme",
            description: "Bold, action-packed styling for aspiring superheroes.",
            image: IMAGES.pkgBirthdayBash,
            products: [
              makeProduct({
                slug: "superhero-squad-birthday",
                name: "Superhero Squad Birthday",
                setupType: "Theme Decor",
                shortDesc: "Bold primary-colour balloon styling and action-comic backdrop panels.",
                description: "A high-energy superhero setup with bold primary-colour balloon arches, comic-style backdrop panels and a themed cake table.",
                image: IMAGES.pkgBirthdayBash,
                gallery: [IMAGES.pkgBirthdayBash, IMAGES.heroBirthday],
                price: 15499,
                originalPrice: 18999,
                includes: ["Comic-style backdrop", "Primary-colour balloon arch", "Themed cake table", "Photo props"],
              }),
              makeProduct({
                slug: "caped-crusader-party",
                name: "Caped Crusader Party",
                setupType: "Theme Decor",
                shortDesc: "A moodier dark-and-gold superhero styling with a city-skyline backdrop.",
                description: "A dramatic dark-and-gold superhero theme with a city-skyline backdrop, spotlight accents and matching balloon styling.",
                image: IMAGES.heroBirthday,
                gallery: [IMAGES.heroBirthday, IMAGES.pkgBirthdayBash],
                price: 16999,
                originalPrice: 20999,
                includes: ["Skyline backdrop", "Spotlight accents", "Balloon styling", "Cake table styling"],
              }),
            ],
          }),
        ],
      }),
      makeCategory({
        slug: "milestone-birthday",
        label: "Milestone Birthdays",
        description: "Elegant styling for 18th, 30th, 50th and other milestone celebrations.",
        image: IMAGES.pkgPremiumBirthday,
        products: [
          makeProduct({
            slug: "elegant-30th-milestone",
            name: "Elegant 30th Milestone",
            setupType: "Milestone Decor",
            shortDesc: "A sophisticated gold-and-white setup for a memorable 30th.",
            description: "A refined milestone setup in gold and white with premium florals, an elegant balloon backdrop and a styled photo corner — custom theme, premium florals and host coordination included.",
            image: IMAGES.pkgPremiumBirthday,
            gallery: [IMAGES.pkgPremiumBirthday, IMAGES.pkgCustomExperience],
            price: 39999,
            originalPrice: 47999,
            includes: ["Premium floral styling", "Elegant balloon backdrop", "Photo corner", "Host coordination"],
          }),
          makeProduct({
            slug: "golden-glam-birthday",
            name: "Golden Glam Birthday",
            setupType: "Milestone Decor",
            shortDesc: "Glam gold sequins, metallic balloons and a statement backdrop.",
            description: "A glamorous gold theme with sequin drapes, metallic balloon clusters and a statement backdrop, built for a milestone celebration to remember.",
            image: IMAGES.pkgCustomExperience,
            gallery: [IMAGES.pkgCustomExperience, IMAGES.pkgPremiumBirthday],
            price: 34999,
            originalPrice: 42999,
            includes: ["Sequin drape styling", "Metallic balloon clusters", "Statement backdrop", "Cake table styling"],
          }),
        ],
      }),
      makeCategory({
        slug: "balloon-decor-setups",
        label: "Balloon Decor Setups",
        description: "Arches, ceiling clouds and full-room balloon styling for any birthday.",
        image: IMAGES.themeBalloonArch,
        products: [
          makeProduct({
            slug: "balloon-arch-backdrop",
            name: "Balloon Arch Backdrop",
            setupType: "Balloon Decor",
            shortDesc: "An organic-style balloon arch backdrop in your choice of colours.",
            description: "A full-width organic balloon-arch backdrop, built in your choice of colour palette — the classic centrepiece for any birthday photo wall.",
            image: IMAGES.themeBalloonArch,
            gallery: [IMAGES.themeBalloonArch, IMAGES.themeBalloonCelebration],
            price: 8999,
            originalPrice: 10999,
            includes: ["Organic balloon arch", "Colour palette of your choice", "Backdrop stand", "Setup & takedown"],
          }),
          makeProduct({
            slug: "balloon-ceiling-cloud",
            name: "Balloon Ceiling Cloud",
            setupType: "Balloon Decor",
            shortDesc: "A floating balloon-cloud installation across the ceiling.",
            description: "A dense cluster of balloons floated across the ceiling like a cloud — a striking overhead feature for the whole room.",
            image: IMAGES.themeBalloonCelebration,
            gallery: [IMAGES.themeBalloonCelebration, IMAGES.themeBalloonArch],
            price: 11999,
            originalPrice: 14999,
            includes: ["Ceiling balloon cloud", "Colour palette of your choice", "Full-room installation", "Setup & takedown"],
          }),
        ],
      }),
    ],
  }),

  // Core occasions are intentionally represented as a real navigation tree.
  // Categories/themes are nodes; only nodes with type="product" are products.
  // Product assignment is handled by the admin catalog and can happen at any
  // depth, so these seed nodes stay useful even before the first package is
  // added to a new category.
  makeOccasion({
    slug: "wedding",
    label: "Weddings",
    tagline: "Wedding decor organised by ceremony, not mixed with products.",
    description: "Browse wedding packages by ceremony and styling category — Haldi, Mehndi, Sangeet, Mandap, Ring Ceremony and Reception.",
    image: IMAGES.typeWedding,
    heroImg: IMAGES.heroWedding,
    children: [
      makeCategory({ slug: "haldi", label: "Haldi", description: "Yellow, floral and vibrant Haldi ceremony setups.", image: IMAGES.themeJungleLeaves }),
      makeCategory({ slug: "mehndi", label: "Mehndi", description: "Mehndi lounge and floral styling packages.", image: IMAGES.themeMehndiHenna }),
      makeCategory({ slug: "sangeet-night", label: "Sangeet Night", description: "Stage, dance-floor and entertainment styling.", image: IMAGES.themeStageLights }),
      makeCategory({ slug: "mandap-ceremony-decor", label: "Mandap & Ceremony Decor", description: "Mandap, floral and ceremony styling packages.", image: IMAGES.heroWedding }),
      makeCategory({ slug: "ring-ceremony", label: "Ring Ceremony", description: "Engagement and ring ceremony decor packages.", image: IMAGES.showcase2 }),
      makeCategory({ slug: "reception-styling", label: "Reception Styling", description: "Reception stage, entrance and floral styling.", image: IMAGES.showcase1 }),
    ],
  }),

  makeOccasion({
    slug: "anniversary",
    label: "Anniversary",
    tagline: "Romantic celebrations, organised by setup and milestone.",
    description: "Browse anniversary decor by celebration type, surprise setup and milestone.",
    image: IMAGES.typeAnniversary,
    heroImg: IMAGES.typeAnniversary,
    children: [
      makeCategory({ slug: "candlelight-celebrations", label: "Candlelight Celebrations", description: "Candlelight dinners and romantic styling.", image: IMAGES.typeAnniversary }),
      makeCategory({ slug: "surprise-setups", label: "Surprise Setups", description: "Room, rooftop and surprise anniversary setups.", image: IMAGES.showcase8 }),
      makeCategory({ slug: "milestone-jubilees", label: "Milestone Jubilees", description: "Silver, golden and other milestone anniversary celebrations.", image: IMAGES.pkgPremiumBirthday }),
    ],
  }),

  makeOccasion({
    slug: "baby-shower",
    label: "Baby Shower",
    tagline: "Themed baby shower decor and celebration packages.",
    description: "Browse baby shower packages by theme and setup type.",
    image: IMAGES.typeBabyShower,
    heroImg: IMAGES.typeBabyShower,
    children: [
      makeCategory({ slug: "themed-baby-showers", label: "Themed Baby Showers", description: "Boho, floral and royal baby shower themes.", image: IMAGES.typeBabyShower, children: [
        makeTheme({ slug: "boho-themes", label: "Boho Themes", description: "Warm, neutral and floral boho styling.", image: IMAGES.themePampasGrass }),
        makeTheme({ slug: "royal-baby-themes", label: "Royal Baby Themes", description: "Little Prince and Little Princess styling.", image: IMAGES.themeTiaraCrown }),
      ]}),
      makeCategory({ slug: "photo-corner-setups", label: "Photo Corner Setups", description: "Instagrammable photo corners and balloon backdrops.", image: IMAGES.themeBalloonArch }),
    ],
  }),

  makeOccasion({
    slug: "newborn-welcome",
    label: "Newborn Welcome",
    tagline: "Warm, photo-ready welcome-home and naming decor.",
    description: "Browse newborn welcome packages by naming ceremony and welcome-home setup.",
    image: IMAGES.typeNewbornWelcome,
    heroImg: IMAGES.typeNewbornWelcome,
    children: [
      makeCategory({ slug: "naming-ceremony-decor", label: "Naming Ceremony Decor", description: "Traditional and modern naming ceremony styling.", image: IMAGES.typeNewbornWelcome }),
      makeCategory({ slug: "welcome-home-setups", label: "Welcome Home Setups", description: "Doorway and home welcome decorations.", image: IMAGES.typeNewbornWelcome }),
    ],
  }),

  makeOccasion({
    slug: "kids-family",
    label: "Kids and Family Event",
    tagline: "Family milestones and celebrations designed with care.",
    description: "Browse baby showers, Annaprashan, Mundan, naming ceremonies and family event setups.",
    image: IMAGES.typeBabyShower,
    heroImg: IMAGES.heroBirthday,
    children: [
      makeCategory({ slug: "baby-shower", label: "Baby Shower", description: "Warm, photo-ready baby shower celebrations.", image: IMAGES.typeBabyShower }),
      makeCategory({ slug: "annaprashan", label: "Annaprashan", description: "Traditional and modern first-food ceremony styling.", image: IMAGES.typeAnnaprashan }),
      makeCategory({ slug: "mundan-ceremony", label: "Mundan Ceremony", description: "A sacred family tradition, beautifully celebrated.", image: IMAGES.showcase5 }),
      makeCategory({ slug: "naming-ceremony", label: "Naming Ceremony", description: "Meaningful naming ceremony décor and planning.", image: IMAGES.typeNewbornWelcome }),
    ],
  }),

  makeOccasion({
    slug: "corporate",
    label: "Corporate Event",
    tagline: "Branded corporate events organised by event type.",
    description: "Browse corporate event packages for launches, conferences and office parties.",
    image: IMAGES.typeCorporate,
    heroImg: IMAGES.heroCorporate,
    children: [
      makeCategory({ slug: "product-launch", label: "Product Launch", description: "Branded launch stages and unveiling setups.", image: IMAGES.typeCorporate }),
      makeCategory({ slug: "conference-office-party", label: "Conference & Office Party", description: "Conference branding and office party decor.", image: IMAGES.showcase6 }),
    ],
  }),

  makeOccasion({
    slug: "festivals-culture",
    label: "Festival & Other Celebrations",
    tagline: "Festive decor grouped by celebration.",
    description: "Browse Diwali, Navratri, Holi and other cultural celebration setups.",
    image: IMAGES.typeFestival,
    heroImg: IMAGES.heroFestival,
    children: [
      makeCategory({ slug: "diwali-festive-decor", label: "Diwali Festive Decor", description: "Diya, rangoli and grand Diwali home decor.", image: IMAGES.typeFestival }),
      makeCategory({ slug: "navratri-holi-cultural", label: "Navratri, Holi & Cultural", description: "Garba, Holi and cultural celebration styling.", image: IMAGES.themeHoliColors }),
    ],
  }),

  makeOccasion({
    slug: "annaprashan",
    label: "Annaprashan",
    tagline: "Traditional and modern first-food ceremony decor.",
    description: "Browse Annaprashan packages by ceremony styling.",
    image: IMAGES.typeAnnaprashan,
    heroImg: IMAGES.heroAnnaprashan,
    children: [
      makeCategory({ slug: "traditional-annaprashan-decor", label: "Traditional Annaprashan Decor", description: "Classic and royal Annaprashan ceremony setups.", image: IMAGES.typeAnnaprashan }),
    ],
  }),
];


// ---------------------------------------------------------------------------
// REFERENCE HIERARCHY
// Mirrors the supplied reference site: categories are navigation nodes;
// products are only leaf records created by Admin. This is deliberately
// data-driven so the same tree works at any depth.
// ---------------------------------------------------------------------------
function makeRefNode(type, slug, label, image, description = "", children = []) {
  return { type, id: nextId(type === "theme" ? "occ-theme" : "occ-cat"), slug, label, image, description, children };
}

function stripSeedProducts(nodes) {
  (nodes || []).forEach((node) => {
    if (Array.isArray(node.products)) node.products = [];
    if (Array.isArray(node.children)) stripSeedProducts(node.children);
  });
}

function replaceChildren(occasionSlug, children) {
  const occ = OCCASIONS.find((o) => o.slug === occasionSlug);
  if (occ) occ.children = children;
}

// Exact website hierarchy requested by the business.
replaceChildren("birthday", [
  makeRefNode("category", "birthday-types", "Birthday Types", IMAGES.heroBirthday, "Browse birthdays by age and celebration type.", [
    makeRefNode("category", "kids-birthday", "Kids Birthday", IMAGES.typeKidsBirthday, "Age 1–12"),
    makeRefNode("category", "teen-birthday", "Teen Birthday", IMAGES.themeStageLights, "Age 13–18"),
    makeRefNode("category", "adult-birthday", "Adult Birthday", IMAGES.pkgPremiumBirthday, "Age 18+"),
    makeRefNode("category", "milestone-birthday", "Milestone Birthday", IMAGES.pkgPremiumBirthday, "20th, 30th, 40th and 50th birthdays.", [
      makeRefNode("category", "20th-birthday", "20th Birthday", IMAGES.pkgPremiumBirthday),
      makeRefNode("category", "30th-birthday", "30th Birthday", IMAGES.pkgPremiumBirthday),
      makeRefNode("category", "40th-birthday", "40th Birthday", IMAGES.pkgPremiumBirthday),
      makeRefNode("category", "50th-birthday", "50th Birthday", IMAGES.pkgPremiumBirthday),
    ]),
    makeRefNode("category", "surprise-birthday", "Surprise Birthday", IMAGES.galBirthday2),
    makeRefNode("category", "theme-party", "Theme Party", IMAGES.themeBalloonArch),
  ]),
  makeRefNode("category", "popular-birthday-themes", "Popular Birthday Themes", IMAGES.themeBalloonCelebration, "Popular birthday themes.", [
    makeRefNode("theme", "cocomelon-theme", "Cocomelon Theme", IMAGES.heroBirthday),
    makeRefNode("theme", "jungle-theme", "Jungle Theme", IMAGES.themeJungleLeaves),
    makeRefNode("theme", "princess-theme", "Princess Theme", IMAGES.themeTiaraCrown),
    makeRefNode("theme", "superhero-theme", "Superhero Theme", IMAGES.pkgBirthdayBash),
    makeRefNode("theme", "unicorn-theme", "Unicorn Theme", IMAGES.themePony),
    makeRefNode("theme", "car-theme", "Car Theme", IMAGES.pkgBirthdayBash),
  ]),
]);

replaceChildren("wedding", [
  makeRefNode("category", "wedding-events", "Wedding Events", IMAGES.heroWedding, "Wedding ceremonies and functions.", [
    makeRefNode("category", "haldi", "Haldi", IMAGES.themeJungleLeaves, "Haldi ceremony decoration packages.", [
      makeRefNode("theme", "traditional-haldi", "Traditional Haldi", IMAGES.themeJungleLeaves),
      makeRefNode("theme", "floral-haldi", "Floral Haldi", IMAGES.themeMehndiHenna),
      makeRefNode("theme", "boho-haldi", "Boho Haldi", IMAGES.themePampasGrass),
      makeRefNode("theme", "poolside-haldi", "Poolside Haldi", IMAGES.themeBalloonCelebration),
      makeRefNode("theme", "rustic-haldi", "Rustic Haldi", IMAGES.themePampasGrass),
      makeRefNode("theme", "theme-based-haldi", "Theme-Based Haldi", IMAGES.themeStageLights),
    ]),
    makeRefNode("category", "mehndi", "Mehndi", IMAGES.themeMehndiHenna, "Mehndi ceremony decoration packages.", [
      makeRefNode("theme", "traditional-mehndi", "Traditional Mehndi", IMAGES.themeMehndiHenna),
      makeRefNode("theme", "modern-mehndi", "Modern Mehndi", IMAGES.themeStageLights),
      makeRefNode("theme", "garden-mehndi", "Garden Mehndi", IMAGES.showcase8),
      makeRefNode("theme", "royal-mehndi", "Royal Mehndi", IMAGES.heroWedding),
      makeRefNode("theme", "poolside-mehndi", "Poolside Mehndi", IMAGES.themeBalloonCelebration),
      makeRefNode("theme", "theme-based-mehndi", "Theme-Based Mehndi", IMAGES.themeStageLights),
    ]),
    makeRefNode("category", "sangeet", "Sangeet", IMAGES.themeStageLights, "Sangeet stage and celebration packages.", [
      makeRefNode("theme", "bollywood-sangeet", "Bollywood Sangeet", IMAGES.themeStageLights),
      makeRefNode("theme", "royal-sangeet", "Royal Sangeet", IMAGES.heroWedding),
      makeRefNode("theme", "contemporary-sangeet", "Contemporary Sangeet", IMAGES.showcase2),
      makeRefNode("theme", "thematic-sangeet", "Thematic Sangeet", IMAGES.themeStageLights),
      makeRefNode("theme", "led-sangeet", "LED Sangeet", IMAGES.themeStageLights),
      makeRefNode("theme", "intimate-sangeet", "Intimate Sangeet", IMAGES.showcase8),
    ]),
    makeRefNode("category", "wedding", "Wedding", IMAGES.heroWedding, "Wedding ceremony decoration packages."),
    makeRefNode("category", "reception", "Reception", IMAGES.showcase1, "Wedding reception decoration packages.", [
      makeRefNode("theme", "classic-reception", "Classic Reception", IMAGES.showcase1),
      makeRefNode("theme", "modern-reception", "Modern Reception", IMAGES.showcase2),
      makeRefNode("theme", "floral-reception", "Floral Reception", IMAGES.galWedding1),
      makeRefNode("theme", "stage-focused-reception", "Stage-Focused Reception", IMAGES.showcase1),
      makeRefNode("theme", "theme-based-reception", "Theme-Based Reception", IMAGES.themeStageLights),
    ]),
    makeRefNode("category", "engagement", "Engagement", IMAGES.showcase2, "Engagement decoration packages.", [
      makeRefNode("theme", "classic-engagement", "Classic Engagement", IMAGES.showcase2),
      makeRefNode("theme", "floral-engagement", "Floral Engagement", IMAGES.galWedding2),
      makeRefNode("theme", "modern-engagement", "Modern Engagement", IMAGES.showcase2),
      makeRefNode("theme", "rooftop-engagement", "Rooftop Engagement", IMAGES.showcase8),
      makeRefNode("theme", "theme-based-engagement", "Theme-Based Engagement", IMAGES.themeStageLights),
    ]),
    makeRefNode("category", "maira", "Maira", IMAGES.showcase5, "Maira celebration setups.", [
      makeRefNode("theme", "traditional-maira", "Traditional Setup", IMAGES.showcase5),
      makeRefNode("theme", "colorful-maira", "Colorful Setup", IMAGES.themeHoliColors),
      makeRefNode("theme", "floral-maira", "Floral Setup", IMAGES.galWedding1),
      makeRefNode("theme", "rajasthani-maira", "Rajasthani Setup", IMAGES.showcase5),
      makeRefNode("theme", "theme-based-maira", "Theme-Based Setup", IMAGES.themeStageLights),
    ]),
    makeRefNode("category", "rituals", "Rituals", IMAGES.showcase5, "Wedding ritual decoration setups.", [
      makeRefNode("theme", "traditional-rituals", "Traditional Setup", IMAGES.showcase5),
      makeRefNode("theme", "colorful-rituals", "Colorful Setup", IMAGES.themeHoliColors),
      makeRefNode("theme", "floral-rituals", "Floral Setup", IMAGES.galWedding1),
      makeRefNode("theme", "rajasthani-rituals", "Rajasthani Setup", IMAGES.showcase5),
      makeRefNode("theme", "theme-based-rituals", "Theme-Based Setup", IMAGES.themeStageLights),
    ]),
  ]),
  makeRefNode("category", "services", "Services", IMAGES.showcase7, "Event services available for weddings.", [
    makeRefNode("category", "decor", "Decor", IMAGES.galDecor1),
    makeRefNode("category", "entertainment", "Entertainment", IMAGES.galConcert2),
    makeRefNode("category", "sound-technical", "Sound & Technical", IMAGES.themeStageLights),
    makeRefNode("category", "tent-furniture", "Tent & Furniture", IMAGES.showcase6),
    makeRefNode("category", "photography-videography", "Photography & Videography", IMAGES.typePhotography),
    makeRefNode("category", "catering", "Catering", IMAGES.showcase5),
    makeRefNode("category", "baraat-procession", "Baraat Procession", IMAGES.themeStageLights),
  ]),
]);

replaceChildren("anniversary", [
  makeRefNode("category", "anniversary-types", "Anniversary Types", IMAGES.typeAnniversary, "Anniversary celebrations by milestone and style.", [
    makeRefNode("category", "first-anniversary", "1st Anniversary", IMAGES.typeAnniversary),
    makeRefNode("category", "fifth-anniversary", "5th Anniversary", IMAGES.showcase8),
    makeRefNode("category", "tenth-anniversary", "10th Anniversary", IMAGES.showcase1),
    makeRefNode("category", "twenty-fifth-anniversary", "25th Anniversary", IMAGES.showcase2),
    makeRefNode("category", "fiftieth-anniversary", "50th Anniversary", IMAGES.pkgPremiumBirthday),
    makeRefNode("category", "romantic-anniversary", "Romantic Anniversary", IMAGES.galWedding2),
    makeRefNode("category", "anniversary-surprise", "Anniversary Surprise", IMAGES.showcase8),
  ]),
]);

replaceChildren("kids-family", [
  makeRefNode("category", "family-celebrations", "Family Celebrations", IMAGES.typeBabyShower, "Family milestones and traditional celebrations.", [
    makeRefNode("category", "baby-shower", "Baby Shower", IMAGES.typeBabyShower),
    makeRefNode("category", "annaprashan", "Annaprashan", IMAGES.typeAnnaprashan),
    makeRefNode("category", "mundan-ceremony", "Mundan Ceremony", IMAGES.showcase5),
    makeRefNode("category", "naming-ceremony", "Naming Ceremony", IMAGES.typeNewbornWelcome),
  ]),
  makeRefNode("category", "kids-family-second-section", "Second Section", IMAGES.showcase2, "Reserved for future Kids & Family categories."),
]);

replaceChildren("corporate", [
  makeRefNode("category", "annual-day", "Annual Day", IMAGES.galCorporate1),
  makeRefNode("category", "product-launch", "Product Launch", IMAGES.heroCorporate),
  makeRefNode("category", "conference", "Conference", IMAGES.galCorporate2),
  makeRefNode("category", "exhibition", "Exhibition", IMAGES.showcase6),
  makeRefNode("category", "awards-ceremony", "Awards Ceremony", IMAGES.showcase1),
  makeRefNode("category", "employee-engagement", "Employee Engagement", IMAGES.galCorporate3),
  makeRefNode("category", "dealer-partner-meet", "Dealer / Partner Meet", IMAGES.showcase4),
  makeRefNode("category", "corporate-party", "Corporate Party", IMAGES.themeStageLights),
  makeRefNode("category", "seminar-workshop", "Seminar & Workshop", IMAGES.galCorporate2),
  makeRefNode("category", "brand-activation", "Brand Activation", IMAGES.heroCorporate),
  makeRefNode("category", "corporate-celebration", "Corporate Celebration", IMAGES.showcase1),
]);

replaceChildren("festivals-culture", [
  makeRefNode("category", "festivals", "Festivals", IMAGES.typeFestival, "Festival celebrations.", [
    makeRefNode("category", "diwali", "Diwali", IMAGES.typeFestival),
    makeRefNode("category", "holi", "Holi", IMAGES.themeHoliColors),
    makeRefNode("category", "christmas", "Christmas", IMAGES.showcase7),
    makeRefNode("category", "new-year", "New Year", IMAGES.galConcert1),
    makeRefNode("category", "navratri", "Navratri", IMAGES.showcase8),
    makeRefNode("category", "eid", "Eid", IMAGES.showcase5),
    makeRefNode("category", "other-festivals", "Other Festivals", IMAGES.typeFestival),
  ]),
  makeRefNode("category", "other-celebrations", "Other Celebrations", IMAGES.showcase8, "Other celebrations and special events.", [
    makeRefNode("category", "housewarming", "Housewarming", IMAGES.showcase8),
    makeRefNode("category", "religious-event", "Religious Event", IMAGES.showcase5),
    makeRefNode("category", "get-together", "Get-Together", IMAGES.showcase8),
    makeRefNode("category", "farewell", "Farewell", IMAGES.showcase6),
    makeRefNode("category", "reunion", "Reunion", IMAGES.showcase8),
    makeRefNode("category", "custom-event", "Custom Event", IMAGES.pkgCustomExperience),
  ]),
]);

replaceChildren("event-services", [
  makeRefNode("category", "sfx", "SFX", IMAGES.showcase7, "Special effects: cold pyro, fog and fireworks.", [
    makeRefNode("category", "cold-pyro", "Cold Pyro", IMAGES.showcase7, "Cold spark effects for entries and stages."),
    makeRefNode("category", "fog", "Fog", IMAGES.showcase7, "Fog and atmospheric effects."),
    makeRefNode("category", "fireworks", "Fireworks", IMAGES.showcase7, "Fireworks and celebration effects."),
  ]),
  makeRefNode("category", "artists", "Artists", IMAGES.galConcert2, "Anchors, dancers and live performers."),
  makeRefNode("category", "photography", "Photography", IMAGES.typePhotography, "Photography and video coverage."),
  makeRefNode("category", "wedding-activity", "Wedding Activity", IMAGES.showcase3, "Games and guest activities for weddings."),
  makeRefNode("category", "baraat-procession", "Baraat Procession", IMAGES.themeStageLights, "Dhol, band and baraat entry services."),
]);

// Keep exactly the six public top-level website categories requested.
const PUBLIC_TOP_LEVEL_SLUGS = new Set([
  "wedding", "birthday", "corporate", "kids-family", "anniversary", "festivals-culture",
]);
for (let i = OCCASIONS.length - 1; i >= 0; i -= 1) {
  const occ = OCCASIONS[i];
  if (occ?.addonOnly) continue;
  if (!PUBLIC_TOP_LEVEL_SLUGS.has(occ?.slug)) OCCASIONS.splice(i, 1);
}

// Remove development products and the old dummy branch from the built-in
// reference tree. Real products are injected by catalogStore from Admin.
stripSeedProducts(OCCASIONS);
for (let i = OCCASIONS.length - 1; i >= 0; i -= 1) {
  if (OCCASIONS[i]?.slug === "dummy-event") OCCASIONS.splice(i, 1);
}

function mergeCategoryTree(existing, seed) {
  if (!Array.isArray(existing)) return seed;
  const clone = JSON.parse(JSON.stringify(existing));
  function mergeNode(target, source) {
    if (!target || !source) return;
    target.children = Array.isArray(target.children) ? target.children : [];
    (source.children || []).forEach((seedChild) => {
      const found = target.children.find((c) => c.slug === seedChild.slug);
      if (found) mergeNode(found, seedChild);
      else target.children.push(JSON.parse(JSON.stringify(seedChild)));
    });
  }
  (seed || []).forEach((seedOccasion) => {
    const found = clone.find((o) => o.slug === seedOccasion.slug);
    if (found) mergeNode(found, seedOccasion);
    else clone.push(JSON.parse(JSON.stringify(seedOccasion)));
  });
  return clone;
}

function normalizedLabel(value) {
  return String(value || "").toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "");
}

function isCategoryMarkerProduct(prod, rootTree) {
  if (!prod || !prod.slug) return false;
  let found = false;
  function walk(node) {
    if (!node || found) return;
    if (node.slug === prod.slug && normalizedLabel(node.label) === normalizedLabel(prod.name)) {
      found = node.type !== "product";
      return;
    }
    (node.children || []).forEach(walk);
  }
  (rootTree || []).forEach(walk);
  return found;
}

function findNodeByCategoryPath(rootNodes, categoryPath) {
  if (!Array.isArray(categoryPath) || categoryPath.length === 0) return null;
  let level = rootNodes || [];
  let node = null;
  for (const slug of categoryPath) {
    node = (level || []).find((n) => n && n.slug === slug);
    if (!node) return null;
    level = node.children || [];
  }
  return node;
}

const REAL_OCCASION_PHOTOS = [
  IMAGES.galWedding1, IMAGES.galWedding2, IMAGES.galWedding3,
  IMAGES.galDecor1, IMAGES.galDecor2, IMAGES.galDecor3,
  IMAGES.galBirthday1, IMAGES.galBirthday2, IMAGES.galBirthday3,
  IMAGES.galCorporate1, IMAGES.galCorporate2, IMAGES.galCorporate3,
  IMAGES.galConcert1, IMAGES.galConcert2, IMAGES.galConcert3,
];

function realOccasionImage(slug, index = 0) {
  const key = String(slug || "").toLowerCase();
  let pool = REAL_OCCASION_PHOTOS;
  if (/haldi|mehndi|ring-ceremony|reception|wedding|mandap|baraat|sangeet|anniversary|engagement/.test(key)) {
    pool = [IMAGES.galWedding1, IMAGES.galWedding2, IMAGES.galWedding3, IMAGES.galDecor1, IMAGES.galDecor2, IMAGES.galDecor3];
  } else if (/birthday|balloon|baby|kids|princess|barbie|dinosaur|jungle|animal|frozen|superhero|horse/.test(key)) {
    pool = [IMAGES.galBirthday1, IMAGES.galBirthday2, IMAGES.galBirthday3, IMAGES.showcase4, IMAGES.showcase6, IMAGES.showcase8];
  } else if (/corporate|conference|product-launch|office/.test(key)) {
    pool = [IMAGES.galCorporate1, IMAGES.galCorporate2, IMAGES.galCorporate3];
  } else if (/concert|artist|sfx|stage|sangeet-night/.test(key)) {
    pool = [IMAGES.galConcert1, IMAGES.galConcert2, IMAGES.galConcert3, IMAGES.showcase1, IMAGES.showcase2];
  }
  return pool[Math.abs(Number(index) || 0) % pool.length];
}

function applyCatalogImages(nodes) {
  let index = 0;
  function walk(list) {
    (list || []).forEach((node) => {
      node.image = realOccasionImage(node.slug, index++);
      if (node.heroImg && node.type !== "occasion") node.heroImg = node.image;
      if (Array.isArray(node.children)) walk(node.children);
    });
  }
  walk(nodes);
  return nodes;
}

let liveOccasionsCache = null;
let liveOccasionsCacheKey = "";

if (typeof window !== "undefined") {
  window.addEventListener("nle-catalog-updated", () => {
    liveOccasionsCache = null;
    liveOccasionsCacheKey = "";
  });
}

function getLiveOccasions() {
  if (typeof window === "undefined") return OCCASIONS;
  try {
    const rawOcc = localStorage.getItem("nle_catalog_v2_occasions");
    const rawProds = localStorage.getItem("nle_catalog_v2_products");
    const cacheKey = `${rawOcc || ""}\u0000${rawProds || ""}`;
    if (liveOccasionsCache && liveOccasionsCacheKey === cacheKey) return liveOccasionsCache;
    let parsedOcc = null;
    try { parsedOcc = rawOcc != null ? JSON.parse(rawOcc) : null; } catch { parsedOcc = null; }
    // The admin catalog is the source of truth. Do not merge the built-in
    // seed tree back into an existing admin tree: doing that resurrects
    // occasions/categories that an admin deliberately deleted. Only use the
    // seed tree when this browser has never received a catalog tree.
    const hasStoredTree = Array.isArray(parsedOcc);
    const baseOccasions = hasStoredTree ? parsedOcc : OCCASIONS;
    const clone = JSON.parse(JSON.stringify(baseOccasions));

    // The built-in occasion tree contains reference catalog products,
    // but the live catalog is admin-owned. If the live product store exists and
    // is empty, strip every embedded example product while preserving the full
    // category hierarchy. Products added by Admin are injected below.
    function stripEmbeddedProducts(nodes) {
      (nodes || []).forEach((node) => {
        node.products = [];
        stripEmbeddedProducts(node.children);
      });
    }

    // Preserve images stored by Admin. Seed presentation images are only
    // applied when there is no admin-owned catalog tree yet.
    if (!hasStoredTree) applyCatalogImages(clone);
    if (!rawProds) {
      liveOccasionsCacheKey = cacheKey;
      liveOccasionsCache = clone;
      return clone;
    }
    let allProds;
    try { allProds = JSON.parse(rawProds); } catch { allProds = []; }
    if (!Array.isArray(allProds) || allProds.length === 0) {
      stripEmbeddedProducts(clone);
      liveOccasionsCacheKey = cacheKey;
      liveOccasionsCache = clone;
      return clone;
    }
    allProds.forEach((rawProd) => {
      if (!rawProd || rawProd.status === "archived") return;
      // Defensive: force type="product" even for records saved by an
      // older build that didn't stamp it. Without this, resolvePath()
      // still finds the node but OccasionBrowser can't tell it's a leaf
      // product and renders CategoryTemplate on it instead — a blank
      // product page.
      const prod = rawProd.type === "product" ? rawProd : { ...rawProd, type: "product" };
      // A legacy catalog may have a navigation label such as "Haldi" saved
      // as a product. If the same slug/name is now a category/theme node,
      // never render that marker as a sellable package.
      if (isCategoryMarkerProduct(prod, clone)) return;
      let placed = false;
      const targetByPath = findNodeByCategoryPath(clone, prod.categoryPath);
      if (targetByPath) {
        targetByPath.products = targetByPath.products || [];
        const idx = targetByPath.products.findIndex((p) => p.slug === prod.slug || p.id === prod.id);
        if (idx !== -1) targetByPath.products[idx] = { ...targetByPath.products[idx], ...prod };
        else targetByPath.products.push(prod);
        placed = true;
      }
      function inject(node) {
        if (!node || placed) return;
        if (node.slug === prod.categorySlug || (!prod.categorySlug && node.slug === prod.occasionSlug)) {
          node.products = node.products || [];
          const idx = node.products.findIndex((p) => p.slug === prod.slug || p.id === prod.id);
          if (idx !== -1) node.products[idx] = { ...node.products[idx], ...prod };
          else node.products.push(prod);
          placed = true;
          return;
        }
        if (node.children) node.children.forEach(inject);
      }
      if (!placed) clone.forEach(inject);
      // Never place an orphaned product into an unrelated occasion. If its
      // admin-selected category/occasion was deleted, keep the product in
      // the admin catalog for re-categorisation, but do not expose it under
      // another public occasion.
    });
    if (!hasStoredTree) applyCatalogImages(clone);
    liveOccasionsCacheKey = cacheKey;
    liveOccasionsCache = clone;
    return clone;
  } catch {
    return OCCASIONS;
  }
}

export function listOccasions() {
  // Admin-managed occasions are the public source of truth. Every normal
  // occasion created in Catalog is therefore available in Shop by Occasion;
  // only internal Event Services branches marked addonOnly stay hidden.
  return getLiveOccasions().filter((o) => !o.addonOnly);
}

export function findOccasion(slug) {
  return getLiveOccasions().find((o) => o.slug === slug) || null;
}

export function weddingFunctionLinks() {
  const wedding = findOccasion("wedding");
  if (!wedding || !Array.isArray(wedding.children) || wedding.children.length === 0) {
    return [];
  }
  return wedding.children.map((child) => ({
    label: child.label,
    img: child.image || child.heroImg || IMAGES.heroWedding,
    image: child.image || child.heroImg || IMAGES.heroWedding,
    href: pathFor([wedding, child]),
    slug: child.slug,
  }));
}

function childOf(node, slug) {
  const kids = node.children || [];
  const found = kids.find((k) => k.slug === slug);
  if (found) return found;
  const prods = node.products || [];
  return prods.find((p) => p.slug === slug) || null;
}

// Resolves an array of URL path segments (e.g. from a splat route) against
// the tree. Returns { node, trail } where `trail` is the full ancestor
// chain (occasion first) including `node` itself, or null if unresolved.
const PATH_ALIASES = {
  "kids-special": "kids-birthday",
  "animal-themes": "animal-theme",
  "car-themes": "car-theme",
  "frozen-themes": "frozen-theme",
  "superhero-themes": "superhero-theme",
  "princess-themes": "princess-theme",
  "barbie-themes": "barbie-theme",
  "wedding-car-decoration": "wedding-car",
  "sangeet": "sangeet-night",
  "reception": "reception-styling",
  "wedding-ceremony": "mandap-ceremony-decor",
  "mandap": "mandap-ceremony-decor",
  "engagement": "ring-ceremony",
};

export function resolvePath(slugs) {
  if (!Array.isArray(slugs) || slugs.length === 0) return null;
  const normalizedSlugs = slugs.map((slug) => PATH_ALIASES[slug] || slug);
  const occasion = findOccasion(normalizedSlugs[0]);
  if (!occasion) return null;
  let node = occasion;
  const trail = [occasion];
  for (let i = 1; i < normalizedSlugs.length; i++) {
    const next = childOf(node, normalizedSlugs[i]);
    if (!next) return null;
    // A product must be the final segment — it never has children.
    if (next.type === "product" && i !== slugs.length - 1) return null;
    node = next;
    trail.push(next);
  }
  return { node, trail };
}

// Builds the href for a node given its trail (ancestor chain to it).
export function pathFor(trail) {
  return "/occasion/" + trail.map((n) => n.slug).join("/");
}

// Direct children to browse next (subcategories or themes) — empty array
// for a product leaf or a childless category.
export function childrenOf(node) {
  return (node && node.children) || [];
}

// Products listed directly at this node (a category/theme can list its own
// products even while also having child themes).
export function productsOf(node) {
  return (node && node.products) || [];
}

// Recursively gathers every product under a node, for "shop all" views and
// for similar-product recommendations.
export function allProductsOf(node) {
  if (!node) return [];
  if (node.type === "product") return [node];
  const own = node.products || [];
  const nested = (node.children || []).flatMap((c) => allProductsOf(c));
  return [...own, ...nested];
}

export function relatedOccasions(currentSlug, limit) {
  const max = typeof limit === "number" ? limit : 4;
  return getLiveOccasions()
    .filter((o) => o.slug !== currentSlug && !o.addonOnly)
    .slice(0, max);
}

// Total product count under a node — used for "N options" copy on cards.
export function countProducts(node) {
  return allProductsOf(node).length;
}

// Cheapest *listable* price under a node (skips draft/archived products),
// or null if it has no sellable products yet.
function cheapestPriceOf(node) {
  const prods = allProductsOf(node).filter((p) => p.status !== "archived" && p.status !== "draft");
  if (!prods.length) return null;
  return Math.min(...prods.map((p) => Number(p.price) || Infinity));
}

// Flattens the live occasion tree (admin-added products already merged in)
// into every browsable node — occasion, category, or theme, but never a
// leaf product. Used by Admin → Event Services so a service card always
// points at a real sub-category with real products, instead of a
// hand-typed link the catalog knows nothing about.
export function flattenCategoryTree() {
  const out = [];
  function walk(node, trail) {
    const nextTrail = [...trail, node];
    out.push({
      path: nextTrail.map((n) => n.slug),
      label: nextTrail.map((n) => n.label).join(" › "),
      productCount: countProducts(node),
      cheapestPrice: cheapestPriceOf(node),
      addonOnly: Boolean(node.addonOnly),
    });
    (node.children || []).forEach((child) => walk(child, nextTrail));
  }
  getLiveOccasions().forEach((occ) => walk(occ, []));
  return out;
}

// Resolves a stored [occasionSlug, ...] path back to its live node (with
// current products merged in), or null if that category was since renamed
// or deleted.
export function categoryByPath(path) {
  const resolved = resolvePath(path);
  return resolved ? resolved.node : null;
}

// ===========================================================
// MERCHANDISING DATA — deterministic per-product rating, review count,
// popularity, added-date and city availability, derived from each
// product's slug (stable across reloads, no manual bookkeeping needed for
// every one of ~40 products). Any field already set explicitly on a
// product wins over the derived value.
// ===========================================================

function hashSlug(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

const DATE_POOL = [
  "2025-09-02", "2025-10-11", "2025-10-28", "2025-11-15", "2025-12-05",
  "2025-12-22", "2026-01-08", "2026-01-19", "2026-02-02", "2026-02-14",
  "2026-02-26", "2026-03-04",
];

const MAJOR_CITIES = ["Ranchi", "Jamshedpur", "Dhanbad", "Bokaro", "Hazaribagh"];

// ---------- Generic product-detail-page content, derived per product so
// every one of ~40 products gets a full detail page (What's Not Included,
// Setup Requirements, Duration, Important Info, FAQs, Gallery) without
// hand-authoring each one. Anything already set explicitly on a product
// (see the horse-themed birthday example above) always wins. ----------

const NOT_INCLUDED_DEFAULT = [
  "Venue booking or rental charges",
  "Catering, cake or beverages",
  "Photography or videography",
  "Entry permits or society permissions (if required)",
];

const SETUP_INFO = {
  "Room Decoration": {
    requirements: "A clear wall space of at least 8 ft width, a nearby power outlet and 45–60 minutes of prior access for our team to set up.",
    duration: "Setup: 45–60 minutes • Decor stays fresh through the event",
  },
  "Terrace Decoration": {
    requirements: "Open terrace/rooftop access, a power point nearby, and a backup indoor space in case of rain. 60–90 minutes of prior access needed.",
    duration: "Setup: 60–90 minutes • Weather-dependent, indoor backup available",
  },
  "Stage Decoration": {
    requirements: "A stage or platform area of at least 10x8 ft, venue access 2 hours before the event, and coordination with the venue's electrician.",
    duration: "Setup: 90–120 minutes • Teardown included after the event",
  },
  "Full Venue Decoration": {
    requirements: "Full access to the venue at least 3 hours before guest arrival, and coordination with venue management for placement of decor elements.",
    duration: "Setup: 3–4 hours • Dedicated on-site crew for the full event",
  },
};
const DEFAULT_SETUP_INFO = {
  requirements: "Please share your space dimensions and preferred access timing while booking so our team can plan the setup accordingly.",
  duration: "Setup: 60–90 minutes • On-site support available on request",
};

function importantInfoFor(setupType) {
  const base = [
    "Final colours/props may vary slightly based on same-day availability of flowers and materials.",
    "We recommend booking at least 3–5 days in advance, earlier during peak wedding and festive season.",
    "Prices shown are for the base package — larger spaces or guest counts may attract additional charges.",
    "Our setup team will call to confirm access timing 24 hours before your event.",
  ];
  if (setupType === "Terrace Decoration") {
    base.push("In case of rain or unsafe weather, we'll help you shift to an indoor backup at no extra styling cost.");
  }
  return base;
}

function faqsFor(product) {
  const list = [
    { q: "How far in advance should I book this package?", a: "We recommend booking at least 3–5 days ahead. During festive or wedding season, 2 weeks' notice helps us guarantee your preferred date and time slot." },
    { q: "Can I customise the colour theme or props?", a: "Yes — share your preferred palette or must-have props in the customisation notes while booking, and our stylists will adapt the setup accordingly, subject to availability." },
    { q: "Is setup and teardown included in the price?", a: "Yes, the listed price includes setup by our team. Teardown timing is coordinated with you or the venue after the event." },
    { q: "What happens if I need to reschedule?", a: "You can request a date change up to 48 hours before the event, subject to slot availability, by reaching out to our support team." },
  ];
  if (product.setupType === "Terrace Decoration") {
    list.push({ q: "What if it rains on the day?", a: "We keep an indoor backup plan ready for terrace/rooftop setups and will help you shift the styling indoors at no extra cost." });
  }
  return list;
}

// Shared pool of decor photography used to assemble a believable multi-image
// gallery for any product that doesn't define its own `gallery` array.
const GALLERY_POOL = [
  IMAGES.showcase1, IMAGES.showcase2, IMAGES.showcase3, IMAGES.showcase4,
  IMAGES.showcase6, IMAGES.showcase8,
  IMAGES.galDecor1, IMAGES.galDecor2, IMAGES.galDecor3,
  IMAGES.galBirthday1, IMAGES.galBirthday2, IMAGES.galBirthday3,
  IMAGES.galWedding1, IMAGES.galWedding2, IMAGES.galWedding3,
  IMAGES.galCorporate1, IMAGES.galCorporate2, IMAGES.galCorporate3,
  IMAGES.galConcert1, IMAGES.galConcert2, IMAGES.galConcert3,
];

function buildGallery(product, h) {
  const pool = GALLERY_POOL.filter((img) => img !== product.image);
  if (pool.length === 0) return [product.image];
  // Deterministic seeded shuffle (Fisher–Yates), so the same product always
  // gets the same gallery order, but — unlike a fixed modular step — this
  // always terminates in O(pool.length) regardless of pool size. (A fixed
  // step of N over a pool whose length shares a common factor with N only
  // ever visits length/gcd distinct slots, which can under-fill forever.)
  const arr = [...pool];
  let seed = (h || 1) >>> 0;
  function nextRand() {
    seed = (Math.imul(seed, 1103515245) + 12345) >>> 0;
    return seed / 4294967296;
  }
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(nextRand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return [product.image, ...arr.slice(0, Math.min(4, arr.length))];
}

function finalizeProduct(p) {
  const h = hashSlug(p.slug);
  if (p.rating === undefined) p.rating = Math.round((4.3 + (h % 7) * 0.1) * 10) / 10;
  if (p.reviewCount === undefined) p.reviewCount = 18 + (h % 240);
  if (p.popularity === undefined) p.popularity = 40 + (h % 60);
  if (p.dateAdded === undefined) p.dateAdded = DATE_POOL[h % DATE_POOL.length];
  if (p.availableCities === undefined) {
    p.availableCities = p.price > 60000 && h % 3 === 0 ? MAJOR_CITIES : "all";
  }
  if (p.description === undefined) {
    p.description = (p.shortDesc || "") + " Styled by our in-house decor team and tailored to your space, guest count and colour preferences.";
  }
  if (p.notIncluded === undefined) p.notIncluded = NOT_INCLUDED_DEFAULT;
  const setupInfo = SETUP_INFO[p.setupType] || DEFAULT_SETUP_INFO;
  if (p.setupRequirements === undefined) p.setupRequirements = setupInfo.requirements;
  if (p.duration === undefined) p.duration = setupInfo.duration;
  if (p.importantInfo === undefined) p.importantInfo = importantInfoFor(p.setupType);
  if (p.faqs === undefined) p.faqs = faqsFor(p);
  if (p.gallery === undefined) p.gallery = buildGallery(p, h);
  if (p.requiresTimeSlot === undefined) p.requiresTimeSlot = true;
  return p;
}

OCCASIONS.forEach((occasion) => allProductsOf(occasion).forEach(finalizeProduct));

// Is this product bookable for the given city?
export function isAvailableInCity(product, city) {
  if (!product) return false;
  if (product.availableCities === "all") return true;
  return Array.isArray(product.availableCities) && product.availableCities.includes(city);
}

// Whole-percent discount for display ("34% OFF"). 0 if there's no discount.
export function discountPercent(product) {
  if (!product || !product.originalPrice || product.originalPrice <= product.price) return 0;
  return Math.round((1 - product.price / product.originalPrice) * 100);
}

// Sorts a copy of a product list. Unknown/omitted key defaults to "popular".
export function sortProducts(list, sortKey) {
  const arr = Array.isArray(list) ? [...list] : [];
  switch (sortKey) {
    case "newest":
      return arr.sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));
    case "price-asc":
      return arr.sort((a, b) => a.price - b.price);
    case "price-desc":
      return arr.sort((a, b) => b.price - a.price);
    case "popular":
    default:
      return arr.sort((a, b) => b.popularity - a.popularity);
  }
}

export const SORT_OPTIONS = [
  { key: "popular", label: "Popular" },
  { key: "newest", label: "Newest" },
  { key: "price-asc", label: "Price: Low to High" },
  { key: "price-desc", label: "Price: High to Low" },
];

// Price buckets used by the price filter across listing pages.
export const PRICE_BUCKETS = [
  { key: "all", label: "Any Price", min: 0, max: Infinity },
  { key: "u15", label: "Under ₹15k", min: 0, max: 15000 },
  { key: "15-30", label: "₹15k – ₹30k", min: 15000, max: 30000 },
  { key: "30-60", label: "₹30k – ₹60k", min: 30000, max: 60000 },
  { key: "60p", label: "Above ₹60k", min: 60000, max: Infinity },
];

// Recursively gathers { product, trail } pairs under a node, where `trail`
// is the FULL ancestor chain (starting from whatever `baseTrail` is passed
// in) down to that exact product — the one thing a flat allProductsOf()
// list can't give you, and what every cross-node product rail (Popular in
// Your City, Similar Products, the global listing) needs to build a
// correct href regardless of how deep the product actually sits.
export function collectProductEntries(node, baseTrail) {
  const trail = baseTrail || [node];
  const out = [];
  (node.products || []).forEach((p) => out.push({ product: p, trail: [...trail, p] }));
  (node.children || []).forEach((child) => {
    out.push(...collectProductEntries(child, [...trail, child]));
  });
  return out;
}

// Quick-link icons for the circular "Explore {Occasion}" row on a category
// page — the same visual pattern as the homepage's "Shop by Occasion" grid,
// scoped to what's actually inside this node. Uses a hand-curated
// `node.quickLinks` list where one is set (see the Wedding occasion above).
// Otherwise, if this node has real subcategories/themes, those are shown —
// each one is a nested listing page with its own group of products, not a
// single product — so "Explore" always drills down one level rather than
// jumping straight to one item. Only a node with no subcategories at all
// (a themed leaf like a single theme page) falls back to linking its own
// products directly, so every occasion still gets a relevant row with zero
// extra authoring.
function flattenQuickLinkNodes(node, trail, out = []) {
  if (!node) return out;
  const base = trail || [node];
  (node.children || []).forEach((child) => {
    const childTrail = [...base, child];
    out.push({
      label: child.label,
      image: child.image || child.heroImg,
      href: pathFor(childTrail),
      type: child.type,
      slug: child.slug,
    });
    if (Array.isArray(child.children) && child.children.length > 0) {
      flattenQuickLinkNodes(child, childTrail, out);
    }
  });
  return out;
}

// Returns the complete navigation set for the theme picker. The compact row
// intentionally shows only the first few cards, while the View all menu uses
// this function so deeper/nested theme data is never hidden by a six-card UI
// limit.
export function allQuickLinksFor(node, trail) {
  if (!node) return [];
  if (Array.isArray(node.quickLinks) && node.quickLinks.length > 0) {
    return node.quickLinks;
  }
  const base = trail || [node];
  const links = flattenQuickLinkNodes(node, base);

  // Kids Special is a catalogue-style theme collection. Keep the named
  // category/theme nodes first, then include every sellable item underneath
  // it. This means a large admin-managed theme catalogue (50+ items or more)
  // is fully discoverable from View all without making the compact row huge.
  if (node.slug === "kids-special" || node.slug === "kids-birthday") {
    const seen = new Set(links.map((item) => item.href));
    collectProductEntries(node, base).forEach((e) => {
      const href = pathFor(e.trail);
      if (seen.has(href)) return;
      seen.add(href);
      links.push({
        label: e.product.name,
        image: e.product.image,
        href,
        type: "product",
        slug: e.product.slug,
      });
    });
  }

  if (links.length > 0) return links;
  return collectProductEntries(node, base).map((e) => ({
    label: e.product.name,
    image: e.product.image,
    href: pathFor(e.trail),
    type: "product",
    slug: e.product.slug,
  }));
}

export function quickLinksFor(node, trail) {
  return allQuickLinksFor(node, trail).slice(0, 6);
}

// Birthday landing-page theme cards. These are resolved from the live
// catalog so an admin-created theme (for example, Spider-Man) opens the
// exact theme route instead of sending the visitor back to /occasion/birthday.
// Only real theme nodes are included here; each theme route then renders only
// the products attached to that theme.
export function birthdayThemeLinks(limit = 8) {
  const birthday = findOccasion("birthday");
  if (!birthday) return [];

  const out = [];
  function walk(node, trail) {
    if (!node || out.length >= limit) return;
    const nextTrail = [...trail, node];
    if (node.type === "theme") {
      out.push({
        label: node.label,
        image: node.image || node.heroImg,
        href: pathFor(nextTrail),
        slug: node.slug,
        type: node.type,
      });
      return;
    }
    (node.children || []).forEach((child) => walk(child, nextTrail));
  }

  walk(birthday, []);
  return out;
}

// Images for the auto-playing hero carousel at the top of a category page.
// Uses a hand-curated `node.heroGallery` where one is set (see Wedding),
// otherwise auto-derives 4-5 images starting with the node's own hero/cover
// shot, followed by distinct product images pulled from within the node, so
// every occasion page gets a relevant slideshow with zero extra authoring.
export function heroGalleryFor(node, trail) {
  if (!node) return [];
  if (Array.isArray(node.heroGallery) && node.heroGallery.length > 0) return node.heroGallery;
  const seen = new Set();
  const out = [];
  const cover = node.heroImg || node.image;
  if (cover) { out.push(cover); seen.add(cover); }
  const entries = collectProductEntries(node, trail || [node]);
  for (const e of entries) {
    if (out.length >= 5) break;
    const src = e.product.image;
    if (src && !seen.has(src)) { out.push(src); seen.add(src); }
  }
  return out;
}

// Flattens the ENTIRE tree into a single list of { product, occasion, theme,
// trail } entries — the data source for the site-wide "All Packages"
// listing, where facets like Occasion/Theme/City/Price/Popularity all
// apply across every occasion at once.
//
// Event Services (addonOnly branch) is intentionally excluded here: those
// products are only meant to surface (a) on their own product page, and
// (b) as "Popular Services" cards just under an occasion's subcategories
// (see CategoryTemplate). They must never appear in the generic site-wide
// packages grid, "Popular Packages", or "Popular in your city" rails.
export function listAllProducts() {
  const out = [];
  getLiveOccasions().forEach((occasion) => {
    if (occasion.addonOnly) return;
    collectProductEntries(occasion, [occasion]).forEach((entry) => {
      out.push({
        product: entry.product,
        occasion,
        theme: entry.trail[entry.trail.length - 2],
        trail: entry.trail,
      });
    });
  });
  return out;
}

// Shapes a product (+ its trail) into the plain-object shape ProductRail
// expects ({ id, img, name, price, originalPrice, badge, href }) — the one
// adapter every "Popular Products" / "Trending" / "Recommended" / "Popular
// in Your City" rail needs, wherever it's built from.
export function toRailItem(product, trail) {
  return {
    id: product.id,
    img: product.image,
    name: product.name,
    price: product.price,
    originalPrice: product.originalPrice,
    badge: discountPercent(product) > 0 ? discountPercent(product) + "% OFF" : null,
    href: pathFor(trail),
  };
}

// "Related Packages" — other products from across the SAME occasion (e.g.
// other Wedding categories), broader than "Similar Products" which only
// looks at the immediate sibling group. Sorted by popularity.
export function relatedPackagesFor(product, trail, limit) {
  const max = typeof limit === "number" ? limit : 4;
  const occasion = trail && trail[0];
  if (!occasion) return [];
  const entries = collectProductEntries(occasion, [occasion]).filter((e) => e.product.slug !== product.slug);
  const sorted = sortProducts(entries.map((e) => e.product), "popular");
  return sorted.slice(0, max).map((p) => {
    const entry = entries.find((e) => e.product.slug === p.slug);
    return toRailItem(p, entry.trail);
  });
}

// "Popular in Your City" — top products, site-wide, that are actually
// bookable in the given city, excluding the product currently being viewed.
export function popularInCity(city, excludeSlug, limit) {
  const max = typeof limit === "number" ? limit : 4;
  const all = listAllProducts().filter((e) => e.product.slug !== excludeSlug && isAvailableInCity(e.product, city));
  const sorted = [...all].sort((a, b) => b.product.popularity - a.product.popularity);
  return sorted.slice(0, max).map((e) => toRailItem(e.product, e.trail));
}

