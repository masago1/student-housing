"use client";

import { useEffect, useState } from "react";
import { useConsent } from "./ConsentProvider";

export default function ApproximateLocationMap({ latitude, longitude }) {
  const { externalServices, saveChoice } = useConsent();
  const [MapComponent, setMapComponent] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!externalServices) return;
    let cancelled = false;
    setLoadError(false);
    // This is the only path to the module importing Mapbox GL JS.
    import("./MapboxLocationMap")
      .then((module) => { if (!cancelled) setMapComponent(() => module.default); })
      .catch(() => { if (!cancelled) setLoadError(true); });
    return () => { cancelled = true; };
  }, [externalServices, attempt]);

  if (externalServices && MapComponent) {
    return <MapComponent latitude={latitude} longitude={longitude} />;
  }

  return (
    <section aria-label="Locație aproximativă" style={{
      width: "100%", minHeight: "360px", boxSizing: "border-box",
      borderRadius: "16px", border: "1px solid #e5e7eb", background: "#f8fafc",
      padding: "24px", display: "flex", flexDirection: "column",
      justifyContent: "center", alignItems: "center", textAlign: "center", gap: "14px",
      overflowWrap: "anywhere",
    }}>
      <h3 style={{ fontSize: "18px", margin: 0 }}>Locație aproximativă</h3>
      {externalServices ? (
        <>
          <p role="status" style={{ margin: 0, color: "#475569" }}>
            {loadError ? "Harta nu a putut fi încărcată." : "Se încarcă harta…"}
          </p>
          {loadError && <button type="button" onClick={() => setAttempt((value) => value + 1)} style={buttonStyle}>Încearcă din nou</button>}
        </>
      ) : (
        <>
          <p style={{ margin: 0, color: "#475569", lineHeight: 1.6 }}>Pentru afișarea hărții interactive folosim Mapbox.</p>
          <p style={{ margin: 0, color: "#475569", fontSize: "14px", lineHeight: 1.6 }}>
            Prin activare, permiți serviciile externe pentru hărți pe shaus. Mapbox poate stoca identificatori în browser și primi date despre utilizarea hărții. Poți retrage acordul din „Preferințe cookies”.
          </p>
          <button type="button" onClick={() => saveChoice(true)} style={buttonStyle}>Activează harta</button>
        </>
      )}
    </section>
  );
}

const buttonStyle = {
  font: "inherit", fontWeight: 600, color: "#111827", background: "#fff",
  border: "1px solid #cbd5e1", borderRadius: "10px", padding: "12px 18px",
  minHeight: "44px", maxWidth: "100%", cursor: "pointer",
};
