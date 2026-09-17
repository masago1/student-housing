"use client";

import { useEffect, useState } from "react";

export default function PropertyGallery({
  images = [],
  title = "Proprietate",
}) {
  const [selectedIndex, setSelectedIndex] = useState(null);

  const hasImages = images.length > 0;
  const isOpen = selectedIndex !== null;

  function openImage(index) {
    setSelectedIndex(index);
  }

  function closeGallery() {
    setSelectedIndex(null);
  }

  function previousImage(event) {
    if (event) {
      event.stopPropagation();
    }

    setSelectedIndex((current) => {
      if (current === null) return null;

      return current === 0
        ? images.length - 1
        : current - 1;
    });
  }

  function nextImage(event) {
    if (event) {
      event.stopPropagation();
    }

    setSelectedIndex((current) => {
      if (current === null) return null;

      return current === images.length - 1
        ? 0
        : current + 1;
    });
  }

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        closeGallery();
      }

      if (event.key === "ArrowLeft" && images.length > 1) {
        setSelectedIndex((current) => {
          if (current === null) return null;

          return current === 0
            ? images.length - 1
            : current - 1;
        });
      }

      if (event.key === "ArrowRight" && images.length > 1) {
        setSelectedIndex((current) => {
          if (current === null) return null;

          return current === images.length - 1
            ? 0
            : current + 1;
        });
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [isOpen, images.length]);

  if (!hasImages) {
    return (
      <div
        style={{
          width: "100%",
          height: "360px",
          borderRadius: "20px",
          background: "#e5e7eb",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#6b7280",
          fontWeight: "700",
        }}
      >
        Fotografie indisponibilă
      </div>
    );
  }

  return (
    <>
      {/* GALERIA DIN PAGINĂ */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            images.length > 1
              ? "minmax(0, 2fr) minmax(0, 1fr)"
              : "1fr",
          gap: "10px",
          height: "360px",
          borderRadius: "20px",
          overflow: "hidden",
          background: "#e5e7eb",
        }}
      >
        {/* POZA PRINCIPALĂ */}
        <button
          type="button"
          onClick={() => openImage(0)}
          aria-label="Deschide fotografia principală"
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            minWidth: 0,
            padding: 0,
            border: "none",
            background: "#e5e7eb",
            cursor: "pointer",
            overflow: "hidden",
          }}
        >
          <img
            src={images[0]}
            alt={title}
            style={{
              width: "100%",
              height: "100%",
              display: "block",
              objectFit: "cover",
              transition: "transform 0.2s ease",
            }}
            onMouseEnter={(event) => {
              event.currentTarget.style.transform =
                "scale(1.015)";
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.transform =
                "scale(1)";
            }}
          />

          {/* NUMĂR TOTAL POZE */}
          <div
            style={{
              position: "absolute",
              right: "14px",
              bottom: "14px",
              padding: "8px 11px",
              borderRadius: "9px",
              background: "rgba(15, 23, 42, 0.82)",
              color: "#ffffff",
              fontSize: "12px",
              fontWeight: "800",
              pointerEvents: "none",
            }}
          >
            📷 {images.length}{" "}
            {images.length === 1
              ? "fotografie"
              : "fotografii"}
          </div>
        </button>

        {/* COLOANA DIN DREAPTA */}
        {images.length > 1 && (
          <div
            style={{
              display: "grid",
              gridTemplateRows: "1fr 1fr",
              gap: "10px",
              minWidth: 0,
              minHeight: 0,
            }}
          >
            {/* POZA 2 */}
            <button
              type="button"
              onClick={() => openImage(1)}
              aria-label="Deschide fotografia 2"
              style={{
                width: "100%",
                height: "100%",
                minHeight: 0,
                padding: 0,
                border: "none",
                background: "#e5e7eb",
                cursor: "pointer",
                overflow: "hidden",
              }}
            >
              <img
                src={images[1]}
                alt={`${title} - fotografia 2`}
                style={{
                  width: "100%",
                  height: "100%",
                  display: "block",
                  objectFit: "cover",
                  transition: "transform 0.2s ease",
                }}
                onMouseEnter={(event) => {
                  event.currentTarget.style.transform =
                    "scale(1.02)";
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.transform =
                    "scale(1)";
                }}
              />
            </button>

            {/* POZA 3 / VEZI TOATE */}
            {images[2] ? (
              <button
                type="button"
                onClick={() => openImage(2)}
                aria-label="Deschide fotografia 3"
                style={{
                  position: "relative",
                  width: "100%",
                  height: "100%",
                  minHeight: 0,
                  padding: 0,
                  border: "none",
                  background: "#e5e7eb",
                  cursor: "pointer",
                  overflow: "hidden",
                }}
              >
                <img
                  src={images[2]}
                  alt={`${title} - fotografia 3`}
                  style={{
                    width: "100%",
                    height: "100%",
                    display: "block",
                    objectFit: "cover",
                    transition: "transform 0.2s ease",
                  }}
                  onMouseEnter={(event) => {
                    event.currentTarget.style.transform =
                      "scale(1.02)";
                  }}
                  onMouseLeave={(event) => {
                    event.currentTarget.style.transform =
                      "scale(1)";
                  }}
                />

                {images.length > 3 && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background:
                        "rgba(15, 23, 42, 0.38)",
                      color: "#ffffff",
                      fontSize: "15px",
                      fontWeight: "800",
                      pointerEvents: "none",
                    }}
                  >
                    +{images.length - 3} fotografii
                  </div>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => openImage(0)}
                style={{
                  width: "100%",
                  height: "100%",
                  minHeight: 0,
                  padding: "20px",
                  border: "none",
                  background: "#e5e7eb",
                  color: "#475569",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontSize: "13px",
                  fontWeight: "800",
                }}
              >
                Vezi fotografiile
              </button>
            )}
          </div>
        )}
      </div>

      {/* LIGHTBOX */}
      {isOpen && (
        <div
          onClick={closeGallery}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(3, 7, 18, 0.94)",
            padding: "30px",
            boxSizing: "border-box",
          }}
        >
          {/* X */}
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              closeGallery();
            }}
            aria-label="Închide galeria"
            style={{
              position: "absolute",
              top: "22px",
              right: "26px",
              width: "44px",
              height: "44px",
              borderRadius: "50%",
              border:
                "1px solid rgba(255,255,255,0.25)",
              background: "rgba(255,255,255,0.1)",
              color: "#ffffff",
              fontSize: "25px",
              lineHeight: 1,
              cursor: "pointer",
              zIndex: 5,
            }}
          >
            ×
          </button>

          {/* CONTOR */}
          <div
            style={{
              position: "absolute",
              top: "28px",
              left: "50%",
              transform: "translateX(-50%)",
              padding: "7px 12px",
              borderRadius: "9px",
              background: "rgba(255,255,255,0.1)",
              color: "#ffffff",
              fontSize: "13px",
              fontWeight: "800",
              zIndex: 5,
            }}
          >
            {selectedIndex + 1} / {images.length}
          </div>

          {/* SĂGEATĂ STÂNGA */}
          {images.length > 1 && (
            <button
              type="button"
              onClick={previousImage}
              aria-label="Fotografia anterioară"
              style={{
                position: "absolute",
                left: "25px",
                top: "50%",
                transform: "translateY(-50%)",
                width: "50px",
                height: "50px",
                borderRadius: "50%",
                border:
                  "1px solid rgba(255,255,255,0.25)",
                background: "rgba(255,255,255,0.1)",
                color: "#ffffff",
                fontSize: "29px",
                cursor: "pointer",
                zIndex: 5,
              }}
            >
              ‹
            </button>
          )}

          {/* POZA MARE */}
          <div
            onClick={(event) => {
              event.stopPropagation();
            }}
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none",
            }}
          >
            <img
              src={images[selectedIndex]}
              alt={`${title} - fotografia ${
                selectedIndex + 1
              }`}
              style={{
                display: "block",
                maxWidth: "88vw",
                maxHeight: "84vh",
                width: "auto",
                height: "auto",
                objectFit: "contain",
                borderRadius: "12px",
                boxShadow:
                  "0 25px 80px rgba(0,0,0,0.45)",
                pointerEvents: "auto",
              }}
              onClick={(event) => {
                event.stopPropagation();
              }}
            />
          </div>

          {/* SĂGEATĂ DREAPTA */}
          {images.length > 1 && (
            <button
              type="button"
              onClick={nextImage}
              aria-label="Fotografia următoare"
              style={{
                position: "absolute",
                right: "25px",
                top: "50%",
                transform: "translateY(-50%)",
                width: "50px",
                height: "50px",
                borderRadius: "50%",
                border:
                  "1px solid rgba(255,255,255,0.25)",
                background: "rgba(255,255,255,0.1)",
                color: "#ffffff",
                fontSize: "29px",
                cursor: "pointer",
                zIndex: 5,
              }}
            >
              ›
            </button>
          )}
        </div>
      )}
    </>
  );
}
