import { Link } from "react-router-dom";
import Icon from "../Icon";
import { fmtINR } from "../../data/images";
import { onImgError } from "../../lib/imageFallback";

// Service strip shown right below "Explore {Occasion}" on every category
// page (top-level occasion, subcategory, or theme). Each card links into
// a real sub-category (e.g. SFX -> Fireworks, Cold Pyro, Fog Machine…),
// managed from Admin -> Event Services (see lib/catalogStore.js
// getAddonsForOccasion). "items" is passed in already resolved for the
// current occasion by CategoryTemplate.
export default function EventAddons({ title, occasionLabel, items }) {
  if (!Array.isArray(items) || items.length === 0) return null;

  // Service cards are category shortcuts, never cart items.

  return (
    <div className="occ-block occ-addons">
      <div className="section-head reveal">
        <h2>{title}</h2>
        <p>Browse these popular service categories{occasionLabel ? " for your " + occasionLabel.toLowerCase() : ""} and choose a package or service.</p>
      </div>
      <div className="occ-addon-grid reveal">
        {items.map((addon) => {
          return (
            <div className="occ-addon-card" key={addon.slug}>
              <span className="occ-addon-pic">
                <img src={addon.image} alt={addon.label} loading="lazy"  onError={onImgError}/>
                <span className="occ-addon-icon"><Icon name={addon.icon || "sparkle"} /></span>
              </span>
              <span className="occ-addon-body">
                <h4>{addon.label}</h4>
                {addon.subLabel ? <p>{addon.subLabel}</p> : null}
                <span className="occ-addon-price">From {fmtINR(addon.price)}</span>
                {addon.href ? (
                  <Link to={addon.href} className="addon-btn occ-addon-cta">
                    View Options
                  </Link>
                ) : null}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
