"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import { normalizeLocation, universitiesForCity, findUniversity, universitySlug, searchUrl, readUrlFilters } from "../lib/rentalFilters.mjs";

export default function UniversityFilter({ citySlug, selected = "", filters, inputStyle, labelStyle }) {
  const router = useRouter();
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    setOptions([]);
    setLoading(true);
    setError("");
    (async () => {
      try {
        const [cities, universities] = await Promise.all([
          supabase.from("cities").select("id, name, slug"),
          supabase.from("universities").select("*"),
        ]);
        if (cities.error || universities.error) throw cities.error || universities.error;
        if (cancelled) return;
        const city = (cities.data || []).find(item => normalizeLocation(item.slug || item.name) === normalizeLocation(citySlug))
          || { name: citySlug, slug: citySlug };
        const items = universitiesForCity(universities.data || [], city);
        setOptions(items);
        // Older mobile home URLs used a university ID in this query parameter.
        const legacy = new URLSearchParams(window.location.search).get("universitate");
        if (legacy) {
          const university = findUniversity(items, selected || legacy) || { name: selected || legacy };
          router.replace(searchUrl(citySlug, university, readUrlFilters(window.location.search)));
        }
      } catch {
        if (!cancelled) setError("Universitățile nu au putut fi încărcate.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [citySlug, selected, router]);
  const value = findUniversity(options, selected);
  return <div style={{ marginBottom: "10px" }}>
    <label style={labelStyle}>Universitate
      <select aria-label="Universitate" value={value ? universitySlug(value) : selected} disabled={loading}
        onChange={event => router.push(searchUrl(citySlug, findUniversity(options, event.target.value), filters))}
        style={{ width: "100%", padding: "10px", border: "1px solid #CBD5E1", borderRadius: "9px", background: "white", color: "#172554", ...inputStyle }}>
        <option value="">Toate universitățile</option>
        {options.map(item => <option key={item.id} value={universitySlug(item)}>{item.short_name || item.name}</option>)}
      </select>
    </label>
    {error && <p role="status">{error}</p>}
  </div>;
}
