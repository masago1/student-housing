"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { CONSENT_KEY, consentChoice, parseConsent } from "../lib/consent";
import styles from "./ConsentProvider.module.css";

const ConsentContext = createContext(null);

export function useConsent() {
  const context = useContext(ConsentContext);
  if (!context) throw new Error("useConsent requires ConsentProvider");
  return context;
}

export default function ConsentProvider({ children }) {
  const [choice, setChoice] = useState(null);
  const [ready, setReady] = useState(false);
  const [draftExternal, setDraftExternal] = useState(false);
  const [storageError, setStorageError] = useState("");
  const dialogRef = useRef(null);

  useEffect(() => {
    try { setChoice(parseConsent(localStorage.getItem(CONSENT_KEY))); } catch {}
    setReady(true);
    const syncChoice = (event) => {
      if (event.key === CONSENT_KEY || event.key === null) {
        try {
          if (event.storageArea !== localStorage) return;
          setChoice(parseConsent(localStorage.getItem(CONSENT_KEY)));
        } catch { setChoice(null); }
      }
    };
    window.addEventListener("storage", syncChoice);
    return () => window.removeEventListener("storage", syncChoice);
  }, []);

  function saveChoice(externalServices) {
    const next = consentChoice(externalServices);
    setStorageError("");
    try { localStorage.setItem(CONSENT_KEY, JSON.stringify(next)); } catch {
      setStorageError("Preferința se aplică acum, dar nu poate fi memorată în acest browser.");
    }
    setChoice(next);
    dialogRef.current?.close();
  }

  function openPreferences() {
    setDraftExternal(choice?.externalServices === true);
    dialogRef.current?.showModal();
  }

  return (
    <ConsentContext.Provider value={{ externalServices: ready && choice?.externalServices === true, saveChoice, openPreferences, storageError }}>
      {ready && !choice && (
        <section className={styles.banner} aria-labelledby="consent-banner-title">
          <div className={styles.inner}>
            <div className={styles.copy}>
              <h2 id="consent-banner-title">Preferințe de confidențialitate</h2>
              <p>Folosim tehnologii necesare pentru funcționarea shaus și, cu acordul tău, servicii externe precum Mapbox pentru afișarea hărților interactive.</p>
            </div>
            <div className={styles.actions}>
              <button type="button" onClick={() => saveChoice(true)}>Acceptă toate</button>
              <button type="button" onClick={() => saveChoice(false)}>Doar necesare</button>
              <button type="button" onClick={openPreferences}>Preferințe</button>
            </div>
          </div>
        </section>
      )}
      {children}
      <dialog ref={dialogRef} className={styles.dialog} aria-labelledby="consent-dialog-title">
        <h2 id="consent-dialog-title">Preferințe de confidențialitate</h2>
        <label className={styles.category}>
          <input type="checkbox" checked disabled />
          <span><strong>Necesare</strong><span>Necesare pentru autentificare și funcționarea de bază a site-ului.</span></span>
        </label>
        <label className={styles.category}>
          <input type="checkbox" checked={draftExternal} onChange={(event) => setDraftExternal(event.target.checked)} />
          <span><strong>Servicii externe / Hărți</strong><span>Permite încărcarea serviciilor Mapbox pentru hărți interactive.</span></span>
        </label>
        <p>Mapbox poate stoca identificatori în browser și primi date despre utilizarea hărții. Poți schimba alegerea oricând. Retragerea acordului nu șterge datele deja transmise.</p>
        <div className={styles.actions}>
          <button type="button" onClick={() => saveChoice(draftExternal)}>Salvează preferințele</button>
          <button type="button" onClick={() => dialogRef.current?.close()}>Anulează</button>
        </div>
      </dialog>
    </ConsentContext.Provider>
  );
}
