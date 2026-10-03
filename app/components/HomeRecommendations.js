"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";
import { normalizeLocation } from "../lib/rentalFilters.mjs";
import { universityListingIds } from "../lib/universityListings.mjs";
import { SEARCH_INTENT_KEY, readSearchIntent, recommendListings, loadRecommendationListings } from "../lib/recommendations.mjs";
import { recommendationCity } from "../lib/recommendationLocation.mjs";
import { useConsent } from "./ConsentProvider";
import FavoriteButton from "./FavoriteButton";
import ListingImageGallery from "./ListingImageGallery";
import styles from "./HomeRecommendations.module.css";

const propertyLabels = { apartment: "Apartament", studio: "Garsonieră", house: "Casă", room: "Cameră" };
const money = new Intl.NumberFormat("ro-RO");

export default function HomeRecommendations({ cities = [] }) {
  const { externalServices, openPreferences } = useConsent();
  const [intent, setIntent] = useState(null);
  const [listings, setListings] = useState([]);
  const [universityIds, setUniversityIds] = useState([]);
  const [location, setLocation] = useState(null);
  const [locating, setLocating] = useState(false);
  const [locationMessage, setLocationMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const locationRequest = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError(false);
      let saved = null;
      try { saved = readSearchIntent(window.localStorage.getItem(SEARCH_INTENT_KEY)); } catch {}
      const city = cities.find(item => [item.slug, item.name].some(value => normalizeLocation(value) === saved?.city));
      if (!city) saved = null;
      if (saved) saved = { ...saved, city: normalizeLocation(city.name) };
      try {
        const [rows, ids] = await Promise.all([
          loadRecommendationListings(supabase, controller.signal),
          saved?.university ? universityListingIds(supabase, city.slug || city.name, saved.university).catch(() => []) : [],
        ]);
        if (controller.signal.aborted) return;
        setIntent(saved);
        setUniversityIds(ids);
        // The existing city catalogue scopes the nationwide fallback to supported Romanian cities.
        const knownCities = new Set(cities.flatMap(item => [item.name, item.slug].map(normalizeLocation)));
        setListings(rows.filter(item => knownCities.has(normalizeLocation(item.city))));
      } catch {
        if (!controller.signal.aborted) setError(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    load();
    return () => controller.abort();
  }, [cities, attempt]);

  useEffect(() => {
    if (!externalServices) {
      locationRequest.current?.abort();
      setLocation(null);
      setLocating(false);
      setLocationMessage("");
    }
    return () => locationRequest.current?.abort();
  }, [externalServices]);

  async function locate() {
    if (!externalServices) { openPreferences(); return; }
    locationRequest.current?.abort();
    const controller = new AbortController();
    locationRequest.current = controller;
    setLocating(true);
    setLocationMessage("");
    try {
      const city = await recommendationCity({ allowed: externalServices, token: process.env.NEXT_PUBLIC_MAPBOX_TOKEN,
        cities, signal: controller.signal, geolocation: navigator.geolocation });
      if (controller.signal.aborted) return;
      setLocation(city);
      if (!city) setLocationMessage("Nu am putut identifica un oraș disponibil. Poți alege orașul în căutare.");
    } catch {
      if (!controller.signal.aborted) setLocationMessage("Locația nu este disponibilă. Poți alege orașul în căutare.");
    } finally {
      if (!controller.signal.aborted) setLocating(false);
    }
  }

  function clearPreferences() {
    try { window.localStorage.removeItem(SEARCH_INTENT_KEY); } catch {}
    locationRequest.current?.abort();
    setIntent(null);
    setLocation(null);
    setLocating(false);
    setLocationMessage("");
  }

  const selected = useMemo(() => recommendListings(listings, { intent, city: location?.name, universityIds }), [listings, intent, location, universityIds]);
  const heading = intent ? "Chirii pentru tine" : location ? `Chirii în ${location.name}` : "Chirii din toată România";

  return <section className={styles.section} aria-labelledby="recommendations-title" aria-busy={loading}>
    <div className={styles.header}>
      <div>
        <span className={styles.eyebrow}>DESCOPERĂ PE shaus</span>
        <h2 id="recommendations-title">{heading}</h2>
        <p>{intent ? "Pornim de la ultima ta căutare și îți arătăm și alternative." : location
          ? "Anunțuri recente din orașul tău și alternative din țară." : "Anunțuri recente, orașe diferite. Găsește locul potrivit pentru tine."}</p>
      </div>
      <div className={styles.actions}>
        {(intent || location) && <button type="button" onClick={clearPreferences}>Resetează recomandările</button>}
        {!intent && <button type="button" onClick={locate} disabled={locating}>
          {locating ? "Se caută orașul…" : "Folosește locația mea"}
        </button>}
      </div>
    </div>
    {!intent && <p className={styles.notice}>Locația este opțională. Cu acordul tău, Mapbox identifică orașul. Nu salvăm coordonatele.</p>}
    {locationMessage && <p role="status" className={styles.notice}>{locationMessage}</p>}
    {loading ? <div className={styles.grid} aria-label="Se încarcă recomandările">
      {Array.from({ length: 6 }, (_, index) => <div key={index} className={styles.skeleton} />)}
    </div> : error ? <div className={styles.empty} role="status">Anunțurile nu au putut fi încărcate. <button type="button" onClick={() => setAttempt(value => value + 1)}>Încearcă din nou</button></div>
      : selected.length === 0 ? <p className={styles.empty}>Nu sunt anunțuri active momentan. Revino curând pentru chirii noi.</p>
        : <div className={styles.grid}>{selected.map(listing => <article className={styles.card} key={listing.id}>
          <div className={styles.image}>
            {listing.image_url ? <ListingImageGallery listingId={listing.id} cover={listing.image_url} title={listing.title}>
              <img src={listing.image_url} alt={listing.title || "Locuință de închiriat"} loading="lazy" />
            </ListingImageGallery> : <Link className={styles.noImage} href={`/proprietate/${listing.id}`}>Imagine indisponibilă</Link>}
            <FavoriteButton listingId={listing.id} />
          </div>
          <div className={styles.content}>
            <p className={styles.price}>{money.format(Number(listing.price_monthly))} € <span>/ lună</span></p>
            <h3><Link href={`/proprietate/${listing.id}`}>{listing.title}</Link></h3>
            <p className={styles.location}>{[listing.city, listing.neighborhoods?.name].filter(Boolean).join(" · ")}</p>
            <ul className={styles.details} aria-label="Detalii locuință">
              {propertyLabels[listing.property_type] && <li>{propertyLabels[listing.property_type]}</li>}
              {listing.rooms > 0 && <li>{listing.rooms} {Number(listing.rooms) === 1 ? "cameră" : "camere"}</li>}
              {listing.surface_m2 > 0 && <li>{listing.surface_m2} m²</li>}
            </ul>
            <Link className={styles.cta} href={`/proprietate/${listing.id}`}>Vezi anunțul <span aria-hidden="true">↗</span></Link>
          </div>
        </article>)}</div>}
  </section>;
}
