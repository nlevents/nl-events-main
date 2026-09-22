// Sample review content for Shop-by-Occasion category pages.
// These are clearly marked as sample content in the UI and should be replaced
// with verified client testimonials before publishing as real reviews.
const CITY_POOL = ["Ranchi", "Dhanbad", "Bokaro", "Jamshedpur", "Deoghar", "Hazaribagh"];

const TOPIC_RULES = [
  { keys: ["haldi", "haldi ceremony"], topic: "Haldi ceremony", details: "The yellow-themed setup, seating and photo corner looked beautiful and the team handled the setup smoothly." },
  { keys: ["mehndi", "mehendi"], topic: "Mehndi ceremony", details: "The Mehndi decor felt colourful and elegant, and the setup matched the ceremony perfectly." },
  { keys: ["sangeet"], topic: "Sangeet night", details: "The stage, lighting and celebration setup made the Sangeet feel energetic without looking overdone." },
  { keys: ["mandap", "wedding ceremony", "wedding"], topic: "Wedding", details: "The wedding decor was well coordinated, from the main setup to the small guest-facing details." },
  { keys: ["reception"], topic: "Reception", details: "The reception styling looked polished and the team kept the venue setup organised throughout." },
  { keys: ["engagement", "ring ceremony"], topic: "Engagement", details: "The engagement setup looked elegant in photos and the team completed everything on time." },
  { keys: ["kids birthday", "birthday"], topic: "Birthday", details: "The birthday setup was colourful, neat and matched the chosen theme really well." },
  { keys: ["baby shower"], topic: "Baby shower", details: "The soft themed decor and photo area made the baby-shower setup feel warm and special." },
  { keys: ["anniversary"], topic: "Anniversary", details: "The anniversary setup was tasteful and gave us a lovely backdrop for family photos." },
  { keys: ["photography", "candid", "cinematic", "drone"], topic: "Photography", details: "The photography service was well organised and captured the important moments naturally." },
  { keys: ["artist", "anchor", "dance performance"], topic: "Artists & entertainment", details: "The performers were engaging and the coordination with the event schedule was smooth." },
  { keys: ["sfx", "pyro", "firework", "fog", "cold pyro"], topic: "Special effects", details: "The special-effects setup was coordinated carefully and added a strong highlight to the event." },
  { keys: ["baraat", "procession", "dhol", "band"], topic: "Baraat procession", details: "The baraat coordination was energetic and well timed, with the team keeping the procession organised." },
];

const VARIATIONS = [
  "The communication was clear from planning to completion, and the final setup matched what we discussed.",
  "Everything looked close to the reference we selected, and the team was punctual with the setup.",
  "The team was easy to coordinate with and the finished setup made the celebration feel more complete.",
];

const NAMES = ["Priya S.", "Aman K.", "Neha R.", "Rohit M.", "Sneha J.", "Vikash P."];

function pickRule(label = "") {
  const value = String(label).toLowerCase();
  return TOPIC_RULES.find((rule) => rule.keys.some((key) => value.includes(key))) || {
    topic: label || "Event setup",
    details: `The ${String(label || "event").toLowerCase()} setup was thoughtfully planned and looked great at the venue.`,
  };
}

export function reviewsForCategory(label = "") {
  const rule = pickRule(label);
  return CITY_POOL.map((city, index) => ({
    id: `${String(label).toLowerCase().replace(/[^a-z0-9]+/g, "-") || "category"}-${city.toLowerCase()}-${index}`,
    name: NAMES[index],
    city,
    topic: rule.topic,
    rating: 5,
    quote: `${rule.details} ${VARIATIONS[index % VARIATIONS.length]}`,
    sample: true,
  }));
}
