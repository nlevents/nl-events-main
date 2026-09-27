import { cloudinaryAsset } from "./cloudinaryAssets";

// Shared broken-image safety net.
//
// Some catalogue images are remote Unsplash photos. A remote image can be
// unavailable because of a deleted source, a network/carrier restriction, or
// a temporary CDN failure. Never leave a broken-image icon on the storefront:
// fall back to a real local event photo that is packaged with the site.

const LOCAL_FALLBACKS = {
  birthday: cloudinaryAsset("/assets/images/categories/birthday-decor.webp"),
  kids: cloudinaryAsset("/assets/images/categories/kids-birthday.webp"),
  baby: cloudinaryAsset("/assets/images/categories/babyshower.webp"),
  newborn: cloudinaryAsset("/assets/images/categories/newborn-welcome.webp"),
  anniversary: cloudinaryAsset("/assets/images/catalog/romance.webp"),
  wedding: cloudinaryAsset("/assets/images/categories/wedding.webp"),
  default: cloudinaryAsset("/assets/images/categories/wedding.webp"),
};

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
