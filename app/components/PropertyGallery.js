"use client";

import { useEffect, useRef, useState } from "react";
import { ListingLightbox } from "./ListingImageGallery";

export default function PropertyGallery({ images = [], title = "Proprietate" }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(min-width: 769px)");
    const update = () => setIsDesktop(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  const touch = useRef(null);
  const suppressClick = useRef(false);
  const index = Math.min(currentIndex, Math.max(0, images.length - 1));
  const move = direction => setCurrentIndex(current =>
    (Math.min(current, images.length - 1) + direction + images.length) % images.length);
  const control = {
    position: "absolute", top: "50%", transform: "translateY(-50%)",
    width: "44px", height: "44px", borderRadius: "50%",
    border: "1px solid rgba(255,255,255,.35)", background: "rgba(15,23,42,.75)",
    color: "#ffffff", fontSize: "28px", cursor: "pointer",
  };

  const mosaic = isDesktop && images.length > 1;
  const visibleImages = images.slice(0, 5);
  function tile(image, imageIndex, style = {}) {
    const showAll = images.length >= 5 && imageIndex === visibleImages.length - 1;
    return <button key={imageIndex} type="button"
      aria-label={showAll ? `Toate imaginile (${images.length}) — deschide fotografia ${imageIndex + 1}` : `Deschide fotografia ${imageIndex + 1} în galeria fullscreen`}
      onClick={() => { setCurrentIndex(imageIndex); setIsOpen(true); }}
      style={{ position: "relative", display: "block", width: "100%", height: "100%", minWidth: 0,
        minHeight: 0, padding: 0, border: 0, overflow: "hidden", cursor: "pointer", background: "#0f172a", ...style }}>
      <img src={image} alt={`${title} — fotografia ${imageIndex + 1}`} draggable={false}
        style={{ display: "block", width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }} />
      {showAll && <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center",
        justifyContent: "center", padding: "12px", background: "rgba(15,23,42,.5)", color: "#fff",
        fontFamily: "inherit", fontSize: "15px", fontWeight: "800", pointerEvents: "none" }}>
        Toate imaginile ({images.length})
      </span>}
    </button>;
  }

  if (!images.length) {
    return <div style={{ width: "100%", height: "360px", borderRadius: "20px",
      background: "#e5e7eb", display: "flex", alignItems: "center",
      justifyContent: "center", color: "#6b7280", fontWeight: "700" }}>
      Fotografie indisponibilă
    </div>;
  }

  return <>
    <div role="region" aria-label="Fotografiile proprietății" aria-roledescription={mosaic ? "galerie" : "carusel"}
      style={{ position: "relative", width: "100%", height: "clamp(260px, 55vw, 560px)",
        borderRadius: "20px", overflow: "hidden", background: "#0f172a" }}>
      {mosaic ? <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.22fr) minmax(0, 1fr)", gap: "8px", height: "100%" }}>
        {tile(images[0], 0)}
        <div style={{ display: "grid", minWidth: 0, minHeight: 0, gap: "8px",
          gridTemplateColumns: images.length >= 4 ? "repeat(2, minmax(0, 1fr))" : "minmax(0, 1fr)",
          gridTemplateRows: images.length >= 3 ? "repeat(2, minmax(0, 1fr))" : "minmax(0, 1fr)" }}>
          {visibleImages.slice(1).map((image, i) => tile(image, i + 1,
            images.length === 4 && i === 2 ? { gridColumn: "1 / -1" } : {}))}
        </div>
      </div> : <>
      <button type="button" aria-label={`Deschide fotografia ${index + 1} în galeria fullscreen`}
        onClick={event => {
          // A swipe may produce a synthetic click; only a tap should open the viewer.
          if (suppressClick.current && event.detail !== 0) {
            suppressClick.current = false;
            return;
          }
          setIsOpen(true);
        }}
        onTouchStart={event => {
          suppressClick.current = false;
          touch.current = event.touches.length === 1
            ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : null;
        }}
        onTouchMove={event => {
          if (touch.current && event.touches.length === 1) {
            const point = event.touches[0];
            if (Math.abs(point.clientX - touch.current.x) > 10 || Math.abs(point.clientY - touch.current.y) > 10) {
              suppressClick.current = true;
            }
          } else touch.current = null;
        }}
        onTouchCancel={() => { touch.current = null; suppressClick.current = true; }}
        onTouchEnd={event => {
          const start = touch.current;
          touch.current = null;
          if (!start || !event.changedTouches.length) return;
          const dx = event.changedTouches[0].clientX - start.x;
          const dy = event.changedTouches[0].clientY - start.y;
          if (Math.abs(dx) > 10 || Math.abs(dy) > 10) suppressClick.current = true;
          if (images.length > 1 && Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) move(dx < 0 ? 1 : -1);
        }}
        style={{ display: "block", width: "100%", height: "100%", padding: 0,
          border: 0, background: "transparent", cursor: "pointer", touchAction: "pan-y pinch-zoom" }}>
        <img src={images[index]} alt={`${title} — fotografia ${index + 1}`} draggable={false}
          style={{ display: "block", width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", userSelect: "none" }} />
      </button>
      {images.length > 1 && <>
        <button type="button" aria-label="Fotografia anterioară" onClick={() => move(-1)}
          style={{ ...control, left: "12px" }}>‹</button>
        <button type="button" aria-label="Fotografia următoare" onClick={() => move(1)}
          style={{ ...control, right: "12px" }}>›</button>
      </>}
      <div aria-live="polite" aria-atomic="true" style={{ position: "absolute", right: "14px", bottom: "14px",
        padding: "8px 11px", borderRadius: "9px", background: "rgba(15,23,42,.82)",
        color: "#ffffff", fontSize: "12px", fontWeight: "800", pointerEvents: "none" }}>
        {index + 1} / {images.length}
      </div>
      </>}
    </div>
    {isOpen && <ListingLightbox images={images} initialIndex={index} title={title} onClose={() => setIsOpen(false)} />}
  </>;
}
