import Icon from "./Icon";

// Reusable 5-star rating display. `rating` is a number 0-5 (rounded to the
// nearest whole star for the fill). Purely presentational — no user input.
export default function RatingStars({ rating, size }) {
  const safe = Number.isFinite(Number(rating)) ? Number(rating) : 0;
  const filled = Math.round(safe);
  return (
    <span className={"rating-stars" + (size === "sm" ? " rating-stars--sm" : "")} aria-label={safe + " out of 5 stars"}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Icon key={i} name="star" className={i < filled ? "is-filled" : "is-empty"} />
      ))}
    </span>
  );
}
