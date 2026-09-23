import { useEffect, useRef, useState } from "react";
import { onImgError } from "../lib/imageFallback";

const AUTOPLAY_MS = 3800;

// Auto-playing crossfade slideshow for a hero banner's background — drop-in
// replacement for a single static <img onError={onImgError}>. Renders inside whatever
// position:relative/absolute wrapper the caller provides (e.g. .hero-media);
// fills it edge-to-edge exactly like the img it replaces.
export default function HeroImageCarousel({ images, alt }) {
  const list = Array.isArray(images) ? images.filter(Boolean) : [];
  const [idx, setIdx] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    if (list.length < 2) return undefined;
    timerRef.current = setInterval(() => setIdx((i) => (i + 1) % list.length), AUTOPLAY_MS);
    return () => clearInterval(timerRef.current);
  }, [list.length]);

  if (list.length === 0) return null;

  return (
    <div className="hero-media-carousel" aria-hidden="true">
      {list.map((src, i) => (
        <div className={"hero-media-slide" + (i === idx ? " is-active" : "")} key={src + i}>
          <img src={src} alt={i === 0 ? alt || "" : ""} draggable="false" loading={i === 0 ? "eager" : "lazy"} decoding="async" onError={onImgError}/>
        </div>
      ))}
      {list.length > 1 && (
        <div className="hero-media-dots" role="presentation">
          {list.map((_, i) => (
            <span key={i} className={"hero-media-dot" + (i === idx ? " is-active" : "")} />
          ))}
        </div>
      )}
    </div>
  );
}
