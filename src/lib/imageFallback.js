// Shared broken-image safety net.
//
// Some catalogue images are remote Unsplash photos. A remote image can be
// unavailable because of a deleted source, a network/carrier restriction, or
// a temporary CDN failure. Never leave a broken-image icon on the storefront:
// fall back to a stable event photo URL that is already used by the site.

const REMOTE_FALLBACKS = {
  wedding: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1100&q=75",
  birthday: "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&w=1100&q=75",
  kids: "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&w=1100&q=75",
  baby: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=1100&q=75",
  newborn: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=1100&q=75",
  anniversary: "https://images.unsplash.com/photo-1522673607200-164d1b6ce486?auto=format&fit=crop&w=1100&q=75",
  default: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1100&q=75",
};

const LOCAL_FALLBACKS = REMOTE_FALLBACKS;

export const PLACEHOLDER_IMAGE = LOCAL_FALLBACKS.default;

export function onImgError(e) {
  const img = e.currentTarget;
  if (!img || img.dataset.fallback) return;
  img.dataset.fallback = "1";

  const text = `${img.alt || ""} ${img.dataset.context || ""}`.toLowerCase();
  let fallback = LOCAL_FALLBACKS.default;
  if (/birthday|barbie|dinosaur|princess|kids|balloon|cake|party/.test(text)) fallback = LOCAL_FALLBACKS.birthday;
  else if (/baby shower|baby/.test(text)) fallback = LOCAL_FALLBACKS.baby;
  else if (/newborn|annaprashan|naming|welcome baby/.test(text)) fallback = LOCAL_FALLBACKS.newborn;
  else if (/anniversary|romantic|couple/.test(text)) fallback = LOCAL_FALLBACKS.anniversary;
  else if (/wedding|haldi|mehndi|sangeet|mandap|reception|ring ceremony|engagement|baraat/.test(text)) fallback = LOCAL_FALLBACKS.wedding;
  else if (/kids|family|corporate|sfx|artist|photography|festival|celebration|occasion/.test(text)) fallback = LOCAL_FALLBACKS.kids;

  img.src = fallback;
}
