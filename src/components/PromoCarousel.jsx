import { useRef, useState } from "react";
import { onImgError } from "../lib/imageFallback";

export default function PromoCarousel({ slides }) {
  const trackRef = useRef(null);
  const [active, setActive] = useState(0);
  const touchStart = useRef({ x: 0, y: 0 });
  const isTouching = useRef(false);

  function onScroll() {
    const track = trackRef.current;
    if (!track) return;
    const itemWidth = track.clientWidth * 0.84 + 12; // slide width + gap
    const idx = Math.round(track.scrollLeft / itemWidth);
    setActive(Math.max(0, Math.min(slides.length - 1, idx)));
  }

  function scrollToIndex(idx) {
    const track = trackRef.current;
    if (!track) return;
    const targetIdx = Math.max(0, Math.min(slides.length - 1, idx));
    const itemWidth = track.clientWidth * 0.84 + 12;
    track.scrollTo({ left: targetIdx * itemWidth, behavior: "smooth" });
    setActive(targetIdx);
  }

  function handleTouchStart(e) {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    isTouching.current = true;
  }

  function handleTouchEnd(e) {
    if (!isTouching.current) return;
    isTouching.current = false;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStart.current.x;
    const dy = touch.clientY - touchStart.current.y;

    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 35) {
      if (dx < 0) {
        scrollToIndex(active + 1);
      } else {
        scrollToIndex(active - 1);
      }
    }
  }

  return (
    <div className="promo-carousel reveal">
      <div
        className="promo-track"
        ref={trackRef}
        onScroll={onScroll}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{ touchAction: "pan-y" }}
      >
        {slides.map((s, i) => (
          <div className="promo-slide" key={i} onClick={() => scrollToIndex(i)}>
            <img src={s.img} alt={s.alt} draggable="false" decoding="async"  onError={onImgError}/>
            <div className="promo-copy">
              <span className="tag-pill">{s.tag}</span>
              <h3>{s.title}</h3>
              <p>{s.sub}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="promo-dots">
        {slides.map((_, i) => (
          <button
            key={i}
            type="button"
            className={"promo-dot" + (i === active ? " active" : "")}
            aria-label={`Slide ${i + 1}`}
            onClick={() => scrollToIndex(i)}
          />
        ))}
      </div>
    </div>
  );
}
