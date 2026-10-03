"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../lib/supabase";

export function ListingLightbox({ images, initialIndex = 0, title, onClose, loading, error }) {
  const [index, setIndex] = useState(() => Math.min(initialIndex, images.length - 1));
  const dialog = useRef(null);
  const touch = useRef(null);
  const close = useRef(onClose);
  close.current = onClose;
  const move = direction => setIndex(current => (current + direction + images.length) % images.length);

  useEffect(() => {
    const previousFocus = document.activeElement;
    const body = document.body;
    const scrollY = window.scrollY;
    const scrollX = window.scrollX;
    const previous = { overflow: body.style.overflow, position: body.style.position,
      top: body.style.top, left: body.style.left, width: body.style.width };
    Object.assign(body.style, { overflow: "hidden", position: "fixed",
      top: `-${scrollY}px`, left: `-${scrollX}px`, width: "100%" });
    dialog.current?.querySelector("button")?.focus();
    const keydown = event => {
      if (event.key === "Escape") { event.preventDefault(); close.current(); }
      if (["ArrowLeft", "ArrowRight"].includes(event.key)) {
        event.preventDefault();
        const direction = event.key === "ArrowRight" ? 1 : -1;
        setIndex(current => (current + direction + images.length) % images.length);
      }
      if (event.key === "Tab") {
        const buttons = [...dialog.current.querySelectorAll("button:not(:disabled)")];
        const first = buttons[0], last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener("keydown", keydown);
    return () => {
      window.removeEventListener("keydown", keydown);
      Object.assign(body.style, previous);
      window.scrollTo(scrollX, scrollY);
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, [images.length]);

  const control = { position: "absolute", border: "1px solid rgba(255,255,255,.35)",
    background: "rgba(15,23,42,.75)", color: "white", borderRadius: "50%",
    width: "48px", height: "48px", fontSize: "30px", cursor: "pointer", zIndex: 2 };
  return createPortal(
    <div ref={dialog} role="dialog" aria-modal="true" aria-label={`Fotografii: ${title || "Anunț"}`}
      onClick={event => { event.stopPropagation(); if (event.target === event.currentTarget) onClose(); }}
      onTouchStart={event => {
        touch.current = event.touches.length === 1 && !event.target.closest("button")
          ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : null;
      }}
      onTouchCancel={() => { touch.current = null; }}
      onTouchEnd={event => {
        const start = touch.current;
        touch.current = null;
        if (!start || !event.changedTouches.length) return;
        const dx = event.changedTouches[0].clientX - start.x;
        const dy = event.changedTouches[0].clientY - start.y;
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) move(dx < 0 ? 1 : -1);
      }}
      style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(0,0,0,.94)",
        display: "flex", alignItems: "center", justifyContent: "center", touchAction: "pan-y pinch-zoom" }}>
      <button type="button" aria-label="Închide galeria" onClick={onClose}
        style={{ ...control, top: "max(16px, env(safe-area-inset-top))", right: "16px" }}>×</button>
      <img src={images[index]} alt={`${title || "Anunț"} — fotografia ${index + 1}`} draggable={false}
        style={{ maxWidth: "100%", width: "100%", height: "calc(100% - 140px)", objectFit: "contain", userSelect: "none" }} />
      {images.length > 1 && <>
        <button type="button" aria-label="Fotografia anterioară" onClick={() => move(-1)}
          style={{ ...control, left: "12px", top: "calc(50% - 24px)" }}>‹</button>
        <button type="button" aria-label="Fotografia următoare" onClick={() => move(1)}
          style={{ ...control, right: "12px", top: "calc(50% - 24px)" }}>›</button>
      </>}
      <div aria-live="polite" style={{ position: "absolute", bottom: "max(24px, env(safe-area-inset-bottom))",
        textAlign: "center", color: "white", fontSize: "15px", pointerEvents: "none" }}>
        <div>{index + 1} / {images.length}</div>
        {loading && <div>Se încarcă fotografiile…</div>}
        {error && <div>Fotografiile suplimentare nu au putut fi încărcate. Redeschide galeria pentru a reîncerca.</div>}
      </div>
    </div>, document.body
  );
}

// Keep the previous frame visible until the next image loads, then fade over it.
function CardFrame({ src, previous, title, onReady }) {
  const [ready, setReady] = useState(src === previous);
  const frame = { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", display: "block" };
  return <>
    {previous && <img src={previous} alt="" aria-hidden="true" draggable={false} style={frame} />}
    <img src={src} alt={title || "Proprietate"} draggable={false} loading="lazy"
      onLoad={() => { setReady(true); onReady(src); }}
      className="shaus-card-image-fade" style={{ ...frame, opacity: ready ? 1 : 0 }} />
  </>;
}

export default function ListingImageGallery({ images, listingId, cover, initialIndex = 0, title, children, carousel = false, onIndexChange }) {
  const [gallery, setGallery] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const open = gallery !== null;
  const [fetchedImages, setFetchedImages] = useState(null);
  const [cardIndex, setCardIndex] = useState(0);
  const touch = useRef(null);
  const suppressClickUntil = useRef(0);
  const lastFrame = useRef(cover || images?.[initialIndex] || null);
  const cardImages = images?.length ? images : fetchedImages || [cover].filter(Boolean);
  const index = Math.min(onIndexChange ? initialIndex : cardIndex, Math.max(0, cardImages.length - 1));
  const move = direction => {
    if (cardImages.length < 2) return;
    if (onIndexChange) onIndexChange(direction);
    else setCardIndex(current => (current + direction + cardImages.length) % cardImages.length);
  };

  useEffect(() => {
    if ((!open && !carousel) || images || !listingId || (carousel && fetchedImages)) return;
    let cancelled = false;
    setLoading(true);
    setError(false);
    (async () => {
      try {
        const { data, error: queryError } = await supabase.from("listing_images")
          .select("image_url").eq("listing_id", listingId);
        if (queryError) throw queryError;
        if (!cancelled) {
          const next = [...new Set([cover, ...(data || []).map(image => image.image_url)].filter(Boolean))];
          if (carousel) setFetchedImages(next);
          setGallery(current => current === null ? null : next);
        }
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, images, listingId, cover, carousel, fetchedImages]);

  return <>
    {carousel && <style>{`.shaus-card-image-fade { transition: opacity 180ms ease-out; } @media (prefers-reduced-motion: reduce) { .shaus-card-image-fade { transition: none; } }`}</style>}
    <button type="button" aria-label={`Deschide fotografiile: ${title || "Anunț"}`}
      onTouchStart={event => {
        touch.current = carousel && event.touches.length === 1
          ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : null;
      }}
      onTouchCancel={() => { touch.current = null; }}
      onTouchEnd={event => {
        const start = touch.current;
        touch.current = null;
        if (!start || !event.changedTouches.length) return;
        const dx = event.changedTouches[0].clientX - start.x;
        const dy = event.changedTouches[0].clientY - start.y;
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) && cardImages.length > 1) {
          suppressClickUntil.current = Date.now() + 400;
          move(dx < 0 ? 1 : -1);
        }
      }}
      onClick={event => {
        event.preventDefault(); event.stopPropagation();
        if (Date.now() < suppressClickUntil.current) return;
        setGallery(cardImages);
      }}
      style={{ position: carousel ? "relative" : undefined, overflow: carousel ? "hidden" : undefined, display: "block", width: "100%", height: "100%", padding: 0, border: 0, background: "transparent", cursor: "pointer", touchAction: carousel ? "pan-y pinch-zoom" : undefined }}>
      {carousel ? <CardFrame key={cardImages[index]} src={cardImages[index]} previous={lastFrame.current} title={title}
        onReady={src => { lastFrame.current = src; }} /> : children}
    </button>
    {carousel && !onIndexChange && cardImages.length > 1 && <>
      {[-1, 1].map(direction => <button key={direction} type="button"
        aria-label={direction < 0 ? "Imaginea precedentă" : "Imaginea următoare"}
        onClick={event => { event.preventDefault(); event.stopPropagation(); move(direction); }}
        style={{ position: "absolute", [direction < 0 ? "left" : "right"]: "9px", top: "50%", transform: "translateY(-50%)",
          width: "31px", height: "31px", border: 0, borderRadius: "50%", background: "rgba(255,255,255,.92)", color: "#172554",
          fontSize: "18px", fontWeight: 900, cursor: "pointer", zIndex: 4, boxShadow: "0 3px 10px rgba(15,23,42,.16)" }}>
        {direction < 0 ? "‹" : "›"}
      </button>)}
      <span aria-live="polite" style={{ position: "absolute", left: "50%", bottom: "9px", transform: "translateX(-50%)",
        padding: "4px 8px", borderRadius: "999px", background: "rgba(15,23,42,.72)", color: "white", fontSize: "11px", fontWeight: 800, zIndex: 4, pointerEvents: "none" }}>
        {index + 1} / {cardImages.length}
      </span>
    </>}
    {gallery?.length > 0 && <ListingLightbox images={gallery} initialIndex={carousel ? index : initialIndex}
      title={title} onClose={() => setGallery(null)} loading={loading} error={error} />}
  </>;
}
