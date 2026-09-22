import { IMAGES } from "../data/images";
import { listOccasions } from "../data/occasions";
import usePageMeta from "../hooks/usePageMeta";
import useReveal from "../hooks/useReveal";
import Breadcrumb from "../components/occasion/Breadcrumb";
import OccasionCard from "../components/occasion/OccasionCard";
import { onImgError } from "../lib/imageFallback";

export default function ShopByOccasion() {
  usePageMeta(
    "Shop by Occasion — Next Level Events",
    "Browse weddings, birthdays, anniversaries, baby showers and more — themed decor and packages for every occasion.",
  );
  useReveal([]);

  const occasions = listOccasions();

  return (
    <>
      <section className="hero hero-sm occ-hero">
        <div className="hero-media"><img src={IMAGES.heroPackages} alt="Shop by Occasion — Next Level Events"  onError={onImgError}/></div>
        <div className="hero-content">
          <span className="eyebrow">Shop by Occasion</span>
          <h1>Find Your Celebration</h1>
          <p>Pick an occasion to browse themes, setups and ready-to-book packages — all fully customisable.</p>
        </div>
      </section>

      <section className="section-tight container">
        <Breadcrumb items={[{ label: "Shop by Occasion" }]} />
        <div className="occ-tile-grid reveal">
          {occasions.map((o) => <OccasionCard key={o.slug} occasion={o} />)}
        </div>
      </section>

      <section className="occ-page-review" aria-label="Customer review">
        <div className="occ-page-review-card">
          <div className="occ-page-review-stars" aria-label="5 star review">★★★★★</div>
          <p>“The team understood exactly what we wanted and made the entire celebration feel effortless.”</p>
          <strong>Happy Next Level Events Client</strong>
          <span>Verified Next Level Events Client</span>
        </div>
      </section>
    </>
  );
}
