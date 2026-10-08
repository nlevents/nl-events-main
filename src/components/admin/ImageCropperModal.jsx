import { useEffect, useMemo, useState } from "react";
import Icon from "../Icon";

const RATIOS = [
  { key: "recommended", label: "Recommended", value: null },
  { key: "free", label: "Free", value: null },
  { key: "1:1", label: "1:1", value: 1 },
  { key: "4:3", label: "4:3", value: 4 / 3 },
  { key: "5:4", label: "5:4", value: 5 / 4 },
  { key: "4:5", label: "4:5", value: 4 / 5 },
  { key: "16:9", label: "16:9", value: 16 / 9 },
];

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getCropRect(width, height, aspect, zoom, x, y) {
  const sourceAspect = width / height;
  let baseW = width;
  let baseH = height;
  if (aspect && sourceAspect > aspect) baseW = height * aspect;
  if (aspect && sourceAspect < aspect) baseH = width / aspect;
  const cropW = baseW / zoom;
  const cropH = baseH / zoom;
  const maxX = Math.max(0, width - cropW);
  const maxY = Math.max(0, height - cropH);
  return {
    x: clamp(x, 0, maxX),
    y: clamp(y, 0, maxY),
    width: cropW,
    height: cropH,
  };
}

function getCenteredPosition(width, height, aspect, zoom = 1) {
  const rect = getCropRect(width, height, aspect, zoom, 0, 0);
  return { x: Math.max(0, (width - rect.width) / 2), y: Math.max(0, (height - rect.height) / 2) };
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      resolve({ image, url });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Unable to read ${file.name || "the selected image"}.`));
    };
    image.src = url;
  });
}

async function cropFile(file, image, aspect, zoom, x, y) {
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  const rect = getCropRect(width, height, aspect, zoom, x, y);
  const maxOutput = 1600;
  const scale = Math.min(1, maxOutput / Math.max(rect.width, rect.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(rect.width * scale));
  canvas.height = Math.max(1, Math.round(rect.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Unable to process image.");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(image, rect.x, rect.y, rect.width, rect.height, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/webp", 0.88));
  if (!blob) throw new Error("Unable to encode the cropped image.");
  const baseName = (file.name || "image").replace(/\.[^/.]+$/, "");
  return new File([blob], `${baseName}.webp`, { type: "image/webp", lastModified: Date.now() });
}

export default function ImageCropperModal({ isOpen, files = [], recommendedRatio = "free", onCancel, onComplete }) {
  const [index, setIndex] = useState(0);
  const [images, setImages] = useState([]);
  const [ratioKey, setRatioKey] = useState(recommendedRatio);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [dragStart, setDragStart] = useState(null);
  const [results, setResults] = useState([]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setIndex(0);
    setRatioKey(recommendedRatio);
    setZoom(1);
    setPosition({ x: 0, y: 0 });
    setError("");
    setResults([]);
    Promise.all(files.map(async (file) => { const loaded = await loadImage(file); return { file, image: loaded.image, url: loaded.url }; }))
      .then((loaded) => {
        if (!cancelled) {
          setImages(loaded);
          const first = loaded[0]?.image;
          const firstWidth = first?.naturalWidth || first?.width || 1;
          const firstHeight = first?.naturalHeight || first?.height || 1;
          const firstAspect = typeof recommendedRatio === "number" ? recommendedRatio : (RATIOS.find((ratio) => ratio.key === recommendedRatio)?.value ?? null);
          setPosition(getCenteredPosition(firstWidth, firstHeight, firstAspect));
        }
      })
      .catch((err) => { if (!cancelled) setError(err.message || "Unable to load image."); });
    return () => { cancelled = true; };
  }, [isOpen, files, recommendedRatio]);

  useEffect(() => () => {
    images.forEach((entry) => { if (entry?.url) URL.revokeObjectURL(entry.url); });
  }, [images]);

  const current = images[index];
  const currentRatio = RATIOS.find((ratio) => ratio.key === ratioKey);
  const recommendedPreset = RATIOS.find((ratio) => ratio.key === recommendedRatio);
  const recommendedValue = typeof recommendedRatio === "number" ? recommendedRatio : (recommendedPreset?.value ?? null);
  const recommendedLabel = typeof recommendedRatio === "number" ? `Custom (${recommendedRatio.toFixed(2)}:1)` : (recommendedPreset?.label || "Free");
  const aspect = currentRatio?.key === "recommended" ? recommendedValue : currentRatio?.value;
  const sourceWidth = current?.image?.naturalWidth || current?.image?.width || 1;
  const sourceHeight = current?.image?.naturalHeight || current?.image?.height || 1;
  const crop = useMemo(
    () => getCropRect(sourceWidth, sourceHeight, aspect, zoom, position.x, position.y),
    [sourceWidth, sourceHeight, aspect, zoom, position.x, position.y]
  );
  const stageAspect = aspect || sourceWidth / sourceHeight;
  const previewStyle = {
    width: `${(sourceWidth / crop.width) * 100}%`,
    height: `${(sourceHeight / crop.height) * 100}%`,
    left: `${(-crop.x / crop.width) * 100}%`,
    top: `${(-crop.y / crop.height) * 100}%`,
  };

  if (!isOpen) return null;

  function resetPosition(nextZoom = 1) {
    setZoom(nextZoom);
    if (current) {
      const width = current.image.naturalWidth || current.image.width;
      const height = current.image.naturalHeight || current.image.height;
      setPosition(getCenteredPosition(width, height, aspect, nextZoom));
    } else {
      setPosition({ x: 0, y: 0 });
    }
  }

  function handlePointerDown(e) {
    if (!current) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setDragging(true);
    setDragStart({ clientX: e.clientX, clientY: e.clientY, x: position.x, y: position.y });
  }

  function handlePointerMove(e) {
    if (!dragging || !dragStart) return;
    const stageWidth = e.currentTarget.getBoundingClientRect().width;
    const scale = Math.max(0.2, stageWidth / crop.width);
    setPosition({
      x: dragStart.x - (e.clientX - dragStart.clientX) / scale,
      y: dragStart.y - (e.clientY - dragStart.clientY) / scale,
    });
  }

  function handlePointerUp() {
    setDragging(false);
    setDragStart(null);
  }

  async function finish() {
    if (!current || processing) return;
    setProcessing(true);
    setError("");
    try {
      const result = await cropFile(current.file, current.image, aspect, zoom, position.x, position.y);
      const nextResults = [...results, result];
      if (index + 1 < images.length) {
        setResults(nextResults);
        setIndex(index + 1);
        setRatioKey(recommendedRatio);
        setZoom(1);
        const nextWidth = images[index + 1]?.image?.naturalWidth || images[index + 1]?.image?.width || 1;
        const nextHeight = images[index + 1]?.image?.naturalHeight || images[index + 1]?.image?.height || 1;
        const nextPreset = typeof recommendedRatio === "number" ? recommendedRatio : (RATIOS.find((ratio) => ratio.key === recommendedRatio)?.value ?? null);
        setPosition(getCenteredPosition(nextWidth, nextHeight, nextPreset));
      } else {
        setResults([]);
        onComplete(nextResults);
      }
    } catch (err) {
      setError(err.message || "Unable to crop image.");
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="admin-modal-backdrop image-cropper-backdrop" onClick={onCancel}>
      <div className="admin-modal-card image-cropper-modal" onClick={(e) => e.stopPropagation()}>
        <div className="admin-modal-header">
          <div>
            <h2>Crop Image</h2>
            <p className="admin-hint">{files.length > 1 ? `Image ${index + 1} of ${files.length}` : "Adjust the image before uploading"}</p>
          </div>
          <button type="button" className="btn-icon" onClick={onCancel} disabled={processing}><Icon name="close" /></button>
        </div>

        {error && <div className="admin-alert admin-alert--error">{error}</div>}

        <div className="image-cropper-body">
          <div
            className="image-cropper-stage"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            style={{ cursor: dragging ? "grabbing" : "grab", aspectRatio: `${stageAspect}`, width: `min(700px, 100%, calc(${stageAspect * 62}vh))` }}
          >
            {current && <img className="image-cropper-preview" src={current.url} alt="Crop preview" style={previewStyle} draggable="false" />}
          </div>

          <div className="image-cropper-controls">
            <label className="admin-form-label">Aspect ratio</label>
            <div className="image-cropper-ratios">
              {RATIOS.map((ratio) => (
                <button
                  key={ratio.key}
                  type="button"
                  className={`btn btn-sm ${ratioKey === ratio.key ? "btn-primary" : "btn-ghost"}`}
                  onClick={() => { setRatioKey(ratio.key); resetPosition(1); }}
                  disabled={processing}
                >
                  {ratio.key === "recommended" ? `Recommended (${recommendedLabel})` : ratio.label}
                </button>
              ))}
            </div>
            <label className="admin-form-label" htmlFor="image-cropper-zoom">Zoom</label>
            <input id="image-cropper-zoom" type="range" min="1" max="3" step="0.01" value={zoom} onChange={(e) => setZoom(Number(e.target.value))} disabled={processing} />
            <div className="image-cropper-help">Drag the image to position it. Use the slider to zoom.</div>
          </div>
        </div>

        <div className="admin-modal-actions">
          <button type="button" className="btn btn-sm btn-ghost" onClick={onCancel} disabled={processing}>Cancel</button>
          <button type="button" className="btn btn-sm btn-primary" onClick={finish} disabled={!current || processing}>
            {processing ? "Processing…" : index + 1 < images.length ? "Crop & Next" : "Crop & Use"}
          </button>
        </div>
      </div>
    </div>
  );
}
