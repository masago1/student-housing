"use client";

import { useState } from "react";

export default function PhoneRevealButton({ phone }) {
  const [revealed, setRevealed] = useState(false);

  if (!phone) return null;

  const cleanPhone = phone.trim();
  const phoneHref = cleanPhone.replace(/[^\d+]/g, "");

  const maskedPhone =
    cleanPhone.length >= 2
      ? `${cleanPhone.slice(0, 2)}•• ••• •••`
      : "••••••••••";

  const handleClick = () => {
    // Primul click: arată numărul în ACELAȘI buton
    if (!revealed) {
      setRevealed(true);
      return;
    }

    // Al doilea click: sună
    window.location.href = `tel:${phoneHref}`;
  };

  return (
    <div
      style={{
        marginTop: "20px",
        paddingTop: "18px",
        borderTop: "1px solid #e5e7eb",
      }}
    >
      <div
        style={{
          fontSize: "12px",
          color: "#6b7280",
          fontWeight: "700",
          marginBottom: "9px",
        }}
      >
        Telefon proprietar
      </div>

      <button
        type="button"
        onClick={handleClick}
        style={{
          width: "100%",
          boxSizing: "border-box",
          border: revealed
            ? "1px solid #172554"
            : "1px solid #cbd5e1",
          borderRadius: "11px",
          padding: "13px 15px",
          background: revealed ? "#172554" : "#ffffff",
          color: revealed ? "#ffffff" : "#172554",
          fontFamily: "inherit",
          fontSize: "14px",
          fontWeight: "800",
          textAlign: "center",
          cursor: "pointer",
          transition: "0.15s ease",
        }}
      >
        ☎{" "}
        {revealed
          ? cleanPhone
          : `${maskedPhone} · Arată numărul`}
      </button>

      <div
        style={{
          textAlign: "center",
          marginTop: "9px",
          color: "#9ca3af",
          fontSize: "11px",
        }}
      >
        {revealed
          ? "Apasă pe număr pentru a suna proprietarul"
          : "Numărul este ascuns"}
      </div>
    </div>
  );
}
