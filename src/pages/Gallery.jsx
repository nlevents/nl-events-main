import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getGalleryItems } from "../lib/catalogStore";
import usePageMeta from "../hooks/usePageMeta";
import useReveal from "../hooks/useReveal";
import { onImgError } from "../lib/imageFallback";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "weddings", label: "Weddings" },
  { key: "birthdays", label: "Birthdays" },
  { key: "corporate", label: "Corporate" },
  { key: "concerts", label: "Concerts" },
  { key: "decor", label: "Décor" },
];

export default function Gallery() {
  usePageMeta("Gallery — Next Level Events", "Browse photos from weddings, birthdays, corporate events, concerts and décor styled by Next Level Events.");
  const [galleryItems, setGalleryItems] = useState(getGalleryItems);
  const [filter, setFilter] = useState("all");
  const [lightboxIndex, setLightboxIndex] = useState(-1);
  useReveal([]);

  useEffect(() => {
    function onCatalogUpdate() {
      setGalleryItems(getGalleryItems());
    }
    window.addEventListener("nle-catalog-updated", onCatalogUpdate);
    return () => window.removeEventListener("nle-catalog-updated", onCatalogUpdate);
  }, []);

  const visible = useMemo(
    () => (filter === "all" ? galleryItems : galleryItems.filter((g) => g.category === filter)),
    [filter, galleryItems]
  );

  useEffect(() => {
    if (lightboxIndex < 0) return;
    document.body.style.overflow = "hidden";
    function onKey(e) {
      if (e.key === "Escape") setLightboxIndex(-1);
      if (e.key === "ArrowLeft") setLightboxIndex((i) => (i - 1 + visible.length) % visible.length);
      if (e.key === "ArrowRight") setLightboxIndex((i) => (i + 1) % visible.length);
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [lightboxIndex, visible.length]);

  useEffect(() => setLightboxIndex(-1), [filter]);

  const active = lightboxIndex >= 0 ? visible[lightboxIndex] : null;

  return (
    <>
      <section className="page-head container">
        <p className="crumb"><Link to="/">Home</Link> / Gallery</p>
        <span className="eyebrow">Gallery</span>
        <h1>Moments We've<br />Helped Create.</h1>
        <p>A selection of weddings, birthdays, corporate events, concerts and décor from recent celebrations.</p>
      </section>

      <section className="section-tight container">
        <div className="filter-row reveal" role="group" aria-label="Filter gallery by category">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              className={"filter-btn" + (filter === f.key ? " active" : "")}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="gal-grid reveal">
          {visible.map((item, i) => (
            <div
              className={"gal-item" + (item.tall ? " tall" : "")}
              key={item.img + i}
              role="button"
              tabIndex={0}
              onClick={() => setLightboxIndex(i)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setLightboxIndex(i); } }}
            >
              <img src={item.img} alt={item.alt}  onError={onImgError}/>
            </div>
          ))}
        </div>
      </section>

      <section className="cta-band reveal">
        <div className="container">
          <h2>Like what you see?</h2>
          <Link to="/book-event" className="btn btn-primary">Plan Your Event</Link>
        </div>
      </section>

      <div className={"lightbox" + (active ? " is-open" : "")} role="dialog" aria-modal="true" aria-label="Image viewer" onClick={(e) => { if (e.target === e.currentTarget) setLightboxIndex(-1); }}>
        <button className="lightbox-close" type="button" aria-label="Close" onClick={() => setLightboxIndex(-1)}>&times;</button>
        <button className="lightbox-nav lightbox-prev" type="button" aria-label="Previous image" onClick={() => setLightboxIndex((i) => (i - 1 + visible.length) % visible.length)}>&#8249;</button>
        {active && <img id="lightboxImg" src={active.img} alt={active.alt}  onError={onImgError}/>}
        <button className="lightbox-nav lightbox-next" type="button" aria-label="Next image" onClick={() => setLightboxIndex((i) => (i + 1) % visible.length)}>&#8250;</button>
        <div className="lightbox-caption">{active ? active.alt : ""}</div>
      </div>
    </>
  );
}
