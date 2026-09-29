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

export default function ListingImageGallery({ images, listingId, cover, initialIndex = 0, title, children }) {
  const [gallery, setGallery] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const open = gallery !== null;

  useEffect(() => {
    if (!open || images || !listingId) return;
    let cancelled = false;
    setLoading(true);
    setError(false);
    (async () => {
      try {
        const { data, error: queryError } = await supabase.from("listing_images")
          .select("image_url").eq("listing_id", listingId);
        if (queryError) throw queryError;
        if (!cancelled) setGallery([...new Set([cover, ...(data || []).map(image => image.image_url)].filter(Boolean))]);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, images, listingId, cover]);

  return <>
    <button type="button" aria-label={`Deschide fotografiile: ${title || "Anunț"}`}
      onClick={event => {
        event.preventDefault(); event.stopPropagation();
        setGallery(images?.length ? images : [cover].filter(Boolean));
      }}
      style={{ display: "block", width: "100%", height: "100%", padding: 0, border: 0, background: "transparent", cursor: "pointer" }}>
      {children}
    </button>
    {gallery?.length > 0 && <ListingLightbox images={gallery} initialIndex={initialIndex}
      title={title} onClose={() => setGallery(null)} loading={loading} error={error} />}
  </>;
}
