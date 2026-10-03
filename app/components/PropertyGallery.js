"use client";

import { useRef, useState } from "react";
import { ListingLightbox } from "./ListingImageGallery";

export default function PropertyGallery({ images = [], title = "Proprietate" }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
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

  if (!images.length) {
    return <div style={{ width: "100%", height: "360px", borderRadius: "20px",
      background: "#e5e7eb", display: "flex", alignItems: "center",
      justifyContent: "center", color: "#6b7280", fontWeight: "700" }}>
      Fotografie indisponibilă
    </div>;
  }

  return <>
    <div role="region" aria-label="Fotografiile proprietății" aria-roledescription="carusel"
      style={{ position: "relative", width: "100%", height: "clamp(260px, 55vw, 560px)",
        borderRadius: "20px", overflow: "hidden", background: "#0f172a" }}>
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
    </div>
    {isOpen && <ListingLightbox images={images} initialIndex={index} title={title} onClose={() => setIsOpen(false)} />}
  </>;
}
