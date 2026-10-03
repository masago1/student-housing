"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { normalizeLocation } from "../lib/rentalFilters.mjs";

export default function NeighborhoodFilter({ citySlug, value, onChange, inputStyle, labelStyle }) {
  const [options, setOptions] = useState([]);
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    setOptions([]);
    setError("");
    (async () => {
      try {
        const cities = await supabase.from("cities").select("id, name, slug");
        if (cities.error) throw cities.error;
        const city = (cities.data || []).find(item => normalizeLocation(item.slug || item.name) === normalizeLocation(citySlug));
        const result = city ? await supabase.from("neighborhoods").select("id, name, slug").eq("city_id", city.id).order("name") : { data: [] };
        if (result.error) throw result.error;
        if (!cancelled) setOptions(result.data || []);
      } catch {
        if (!cancelled) setError("Cartierele nu au putut fi încărcate.");
      }
    })();
    return () => { cancelled = true; };
  }, [citySlug]);
  return <div style={{ margin: "10px 0" }}>
    <label style={labelStyle}>Cartier
      <select aria-label="Cartier" value={value} onChange={event => onChange(event.target.value)} style={inputStyle}>
        <option value="">Toate cartierele</option>
        {value && !options.some(item => item.slug === value) && <option value={value}>{value}</option>}
        {options.map(item => <option key={item.id} value={item.slug}>{item.name}</option>)}
      </select>
    </label>
    {error && <p role="status">{error}</p>}
  </div>;
}
