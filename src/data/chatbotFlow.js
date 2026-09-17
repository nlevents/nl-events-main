// ===========================================================
// Guided chatbot flow — data only.
//
// This file is the single place to edit the *questions and options* the
// guided assistant asks (Step 1 → occasion, Step 2 → "for whom", Step 3 →
// style/preference). None of it is wired to UI or matching logic — see
// src/lib/chatbotFlowEngine.js for that. Occasion options themselves are
// NOT hard-coded here; they're read live from src/data/occasions.js so the
// bot always mirrors whatever's on the Shop-by-Occasion pages.
//
// TO ADD A NEW OCCASION: nothing to do here — it's picked up automatically
// from occasions.js. Optionally add a WHOM_QUESTIONS / STYLE_OPTIONS_BY_OCCASION
// entry for it (keyed by the occasion's slug) for more tailored questions;
// otherwise it falls back to DEFAULT_WHOM_OPTIONS / DEFAULT_STYLES below.
// ===========================================================

export const OTHER_EVENT_VALUE = "__other__";

// Shown as the extra tile after the real occasions on Step 1.
export const OTHER_EVENT_OPTION = { label: "Other Event", value: OTHER_EVENT_VALUE, emoji: "\u2728" };

// Emoji shown next to each occasion tile on Step 1 (keyed by occasion slug).
export const OCCASION_EMOJI = {
  wedding: "\uD83D\uDC8D",
  birthday: "\uD83C\uDF82",
  anniversary: "\uD83D\uDC96",
  "baby-shower": "\uD83C\uDF80",
  "kids-birthday": "\uD83E\uDDF8",
  "newborn-welcome": "\uD83D\uDC76",
  corporate: "\uD83C\uDFE2",
  annaprashan: "\uD83E\uDD63",
  "festivals-culture": "\uD83E\uDED5",
};

// ---------- Step 2: "Who is this for?" ----------
// Keyed by occasion slug (see src/data/occasions.js). `question` is optional —
// falls back to a generic phrasing if omitted.
export const WHOM_QUESTIONS = {
  wedding: {
    question: "Who's the wedding for?",
    options: [
      { label: "Myself", value: "self", phrase: "you", emoji: "\uD83E\uDD35" },
      { label: "Family Member", value: "family", phrase: "your family", emoji: "\uD83D\uDC6A" },
      { label: "A Friend", value: "friend", phrase: "your friend", emoji: "\uD83D\uDE4B" },
      { label: "A Client", value: "client", phrase: "your client", emoji: "\uD83D\uDCBC" },
    ],
  },
  birthday: {
    question: "Who's the birthday celebration for?",
    options: [
      { label: "Wife", value: "wife", phrase: "your wife", emoji: "\uD83D\uDC69" },
      { label: "Husband", value: "husband", phrase: "your husband", emoji: "\uD83D\uDC68" },
      { label: "Parents", value: "parents", phrase: "your parents", emoji: "\uD83D\uDC6A" },
      { label: "Myself", value: "self", phrase: "you", emoji: "\uD83E\uDD73" },
      { label: "A Friend", value: "friend", phrase: "your friend", emoji: "\uD83D\uDE4B" },
    ],
  },
  anniversary: {
    question: "Whose anniversary are we celebrating?",
    options: [
      { label: "My Partner & Me", value: "couple", phrase: "you two", emoji: "\uD83D\uDC91" },
      { label: "Parents", value: "parents", phrase: "your parents", emoji: "\uD83D\uDC6A" },
      { label: "Grandparents", value: "grandparents", phrase: "your grandparents", emoji: "\uD83D\uDC74" },
      { label: "Friends' Couple", value: "friends", phrase: "your friends", emoji: "\uD83D\uDC95" },
    ],
  },
  "baby-shower": {
    question: "Who's the baby shower for?",
    options: [
      { label: "Me / My Partner", value: "self", phrase: "you", emoji: "\uD83E\uDD30" },
      { label: "A Family Member", value: "family", phrase: "your family", emoji: "\uD83D\uDC6A" },
      { label: "A Friend", value: "friend", phrase: "your friend", emoji: "\uD83D\uDE4B" },
    ],
  },
  "kids-birthday": {
    question: "Who's the little one turning a year older?",
    options: [
      { label: "My Son", value: "son", phrase: "your son", emoji: "\uD83D\uDC66" },
      { label: "My Daughter", value: "daughter", phrase: "your daughter", emoji: "\uD83D\uDC67" },
      { label: "A Relative's Child", value: "relative", phrase: "their little one", emoji: "\uD83D\uDC76" },
    ],
  },
  "newborn-welcome": {
    question: "Whose newborn are we welcoming?",
    options: [
      { label: "Our Baby", value: "self", phrase: "your little one", emoji: "\uD83D\uDC76" },
      { label: "A Family Member's Baby", value: "family", phrase: "their little one", emoji: "\uD83D\uDC6A" },
      { label: "A Friend's Baby", value: "friend", phrase: "their little one", emoji: "\uD83D\uDE4B" },
    ],
  },
  corporate: {
    question: "What kind of corporate event is this?",
    options: [
      { label: "Product Launch", value: "launch", phrase: "your product launch", emoji: "\uD83D\uDE80" },
      { label: "Conference", value: "conference", phrase: "your conference", emoji: "\uD83C\uDFA4" },
      { label: "Office Party", value: "office-party", phrase: "your office party", emoji: "\uD83C\uDF89" },
      { label: "Client Event", value: "client-event", phrase: "your client event", emoji: "\uD83E\uDD1D" },
    ],
  },
  annaprashan: {
    question: "Whose Annaprashan are we celebrating?",
    options: [
      { label: "Our Baby", value: "self", phrase: "your little one", emoji: "\uD83D\uDC76" },
      { label: "A Family Member's Baby", value: "family", phrase: "their little one", emoji: "\uD83D\uDC6A" },
      { label: "A Friend's Baby", value: "friend", phrase: "their little one", emoji: "\uD83D\uDE4B" },
    ],
  },
  "festivals-culture": {
    question: "Which festival are we decorating for?",
    options: [
      { label: "Diwali", value: "diwali", phrase: "Diwali", emoji: "\uD83E\uDE94" },
      { label: "Navratri / Garba", value: "navratri", phrase: "Navratri", emoji: "\uD83D\uDC83" },
      { label: "Holi", value: "holi", phrase: "Holi", emoji: "\uD83C\uDFA8" },
      { label: "Another Festival", value: "other-festival", phrase: "your festival", emoji: "\u2728" },
    ],
  },
};

export const DEFAULT_WHOM_OPTIONS = [
  { label: "Myself", value: "self", phrase: "you", emoji: "\uD83E\uDD73" },
  { label: "Family", value: "family", phrase: "your family", emoji: "\uD83D\uDC6A" },
  { label: "A Friend", value: "friend", phrase: "your friend", emoji: "\uD83D\uDE4B" },
  { label: "Someone Else", value: "other", phrase: "them", emoji: "\u2728" },
];

// ---------- Step 3: style / preference ----------
// One shared catalogue of styles, each with keywords used to score
// categories/themes/products from the occasions tree (see
// scoreForStyle() in chatbotFlowEngine.js). `label` is what's shown;
// `blurb` personalises the recommendation message.
export const STYLE_LIBRARY = {
  simple: {
    label: "Simple & Sweet", emoji: "\uD83C\uDF3F",
    keywords: ["balloon", "photo corner", "doorway", "basic"],
    blurb: "clean, budget-friendly styling that still looks lovely",
    priceTier: "low",
  },
  premium: {
    label: "Premium", emoji: "\uD83D\uDC8E",
    keywords: ["grand", "royal", "premium", "full venue", "golden", "elegant", "luxury", "glam"],
    blurb: "a grander, full-venue look with premium finishes",
    priceTier: "high",
  },
  romantic: {
    label: "Romantic", emoji: "\uD83C\uDF39",
    keywords: ["romantic", "candle", "candlelight", "rose", "floral", "rooftop", "heart", "intimate"],
    blurb: "candlelight, florals and an intimate, romantic mood",
  },
  theme: {
    label: "Theme-based", emoji: "\uD83C\uDFA8",
    keywords: ["theme", "themed", "cartoon", "superhero", "princess", "jungle", "safari", "boho", "royal-baby", "animal", "character", "carnival"],
    blurb: "a fun, fully themed setup built around a character or story",
  },
  surprise: {
    label: "Surprise Setup", emoji: "\uD83C\uDF81",
    keywords: ["surprise", "reveal", "discreet", "quick-turnaround"],
    blurb: "a quiet, quick-turnaround setup perfect for a surprise reveal",
  },
};

// Which styles make sense to offer for a given occasion, and in what order.
// Falls back to DEFAULT_STYLE_ORDER when an occasion isn't listed.
export const STYLE_OPTIONS_BY_OCCASION = {
  wedding: ["premium", "theme", "romantic", "simple"],
  birthday: ["simple", "theme", "premium", "surprise"],
  anniversary: ["romantic", "surprise", "premium", "simple"],
  "baby-shower": ["theme", "simple", "premium"],
  "kids-birthday": ["theme", "simple", "premium"],
  "newborn-welcome": ["simple", "theme", "premium"],
  corporate: ["premium", "simple", "theme"],
  annaprashan: ["simple", "theme", "premium"],
  "festivals-culture": ["theme", "premium", "simple"],
};

export const DEFAULT_STYLE_ORDER = ["simple", "premium", "theme", "romantic", "surprise"];

export function whomStepFor(occasionSlug) {
  return WHOM_QUESTIONS[occasionSlug] || { question: "Who's this celebration for?", options: DEFAULT_WHOM_OPTIONS };
}

export function styleStepFor(occasionSlug) {
  const order = STYLE_OPTIONS_BY_OCCASION[occasionSlug] || DEFAULT_STYLE_ORDER;
  return order.map((key) => ({ value: key, ...STYLE_LIBRARY[key] }));
}
