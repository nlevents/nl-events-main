// Lightweight public fallback for the Birthday page.
// Kept separate from catalogStore so opening the page does not have to parse
// the full admin/catalog implementation before the first paint.
import { IMAGES } from "./images";

export const BIRTHDAY_AGE_CATEGORIES = [
  { id: "birthday-kids", title: "Kids Birthday", subtitle: "Age 1–12", image: IMAGES.typeKidsBirthday, href: "/occasion/birthday/kids-birthday", active: true, sortOrder: 1 },
  { id: "birthday-teen", title: "Teen Birthday", subtitle: "Age 13–18", image: IMAGES.themeStageLights, href: "/occasion/birthday", active: true, sortOrder: 2 },
  { id: "birthday-adult", title: "Adult Birthday", subtitle: "Age 18+", image: IMAGES.pkgPremiumBirthday, href: "/occasion/birthday/milestone-birthday", active: true, sortOrder: 3 },
  { id: "birthday-milestone", title: "Milestone Birthday", subtitle: "20th, 30th, 40th, 50th+", image: IMAGES.pkgPremiumBirthday, href: "/occasion/birthday/milestone-birthday", active: true, sortOrder: 4 },
  { id: "birthday-surprise", title: "Surprise Birthday", subtitle: "Make it Special", image: IMAGES.galBirthday2, href: "/occasion/birthday", active: true, sortOrder: 5 },
  { id: "birthday-themes", title: "Theme Parties", subtitle: "Custom Themes", image: IMAGES.themeBalloonArch, href: "/occasion/birthday/kids-birthday", active: true, sortOrder: 6 },
];
