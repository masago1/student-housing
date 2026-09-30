"use client";

import ListingImageGallery from "../../components/ListingImageGallery";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../lib/supabase";
import FavoriteButton from "../../components/FavoriteButton";
import AccountButton from "../../components/AccountButton";

// Match desktop city normalization for both the route slug and stored city name.
function normalizeCity(value = "") {
  return decodeURIComponent(String(value))
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const defaultFilters = {
  minPrice: "", maxPrice: "", rooms: "",
  minSurface: "", maxSurface: "", furnished: "",
  bedrooms: "", bathrooms: "", propertyType: "", listingType: "",
  availableFrom: "", sort: "newest", zone: "",
};

const filterFields = {
  "Preț": [
    { name: "minPrice", label: "Preț minim (€)", type: "number" },
    { name: "maxPrice", label: "Preț maxim (€)", type: "number" },
  ],
  "Camere": [
    { name: "rooms", label: "Număr de camere", options: [["", "Oricâte"], ["1", "1"], ["2", "2"], ["3", "3"], ["4", "4"], ["5", "5+"]] },
  ],
  "Suprafață": [
    { name: "minSurface", label: "Suprafață minimă (m²)", type: "number" },
    { name: "maxSurface", label: "Suprafață maximă (m²)", type: "number" },
  ],
  "Mobilat": [
    { name: "furnished", label: "Mobilat", options: [["", "Oricare"], ["yes", "Da"], ["no", "Nu"]] },
  ],
  "Mai multe": [
    { name: "zone", label: "Cartier", options: [["", "Toate cartierele"]] },
    { name: "bedrooms", label: "Dormitoare", options: [["", "Oricâte"], ["1", "1"], ["2", "2"], ["3", "3"], ["4", "4+"]] },
    { name: "bathrooms", label: "Băi", options: [["", "Oricâte"], ["1", "1"], ["2", "2"], ["3", "3+"]] },
    { name: "propertyType", label: "Tip proprietate", options: [["", "Toate"], ["apartment", "Apartament"], ["studio", "Garsonieră"], ["house", "Casă"], ["room", "Cameră"]] },
    { name: "listingType", label: "Tip închiriere", options: [["", "Toate"], ["entire", "Locuință întreagă"], ["room", "Cameră"]] },
    { name: "availableFrom", label: "Disponibilitate — disponibil până la", type: "date" },
    { name: "sort", label: "Sortare", options: [["newest", "Cele mai noi"], ["price_asc", "Preț crescător"], ["price_desc", "Preț descrescător"], ["surface_desc", "Suprafață descrescătoare"]] },
  ],
};

function readUrlFilters(search) {
  const params = new URLSearchParams(search);
  const filters = { ...defaultFilters };
  for (const key of Object.keys(filters)) {
    filters[key] = params.get(key === "zone" ? "zona" : key) || defaultFilters[key];
  }
  if (filters.listingType === "rent") filters.listingType = "entire";
  // The native mobile date input uses ISO; desktop displays this same date as DD/MM/YYYY.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(filters.availableFrom)) filters.availableFrom = "";
  return filters;
}

function filtersToSearchParams(filters) {
  const params = new URLSearchParams();
  for (const key of Object.keys(defaultFilters)) {
    if (filters[key]) params.set(key === "zone" ? "zona" : key, filters[key]);
  }
  return params;
}

function filterListings(listings, filters) {
  // Keep comparisons and numeric coercion identical to CityListingsClient.
  const result = listings.filter((listing) => {
    if (filters.zone && (listing.neighborhoods?.slug || "") !== filters.zone) return false;
    if (filters.minPrice && Number(listing.price_monthly) < Number(filters.minPrice)) return false;
    if (filters.maxPrice && Number(listing.price_monthly) > Number(filters.maxPrice)) return false;
    if (filters.rooms && Number(listing.rooms) !== Number(filters.rooms)) return false;
    if (filters.bedrooms && Number(listing.bedrooms) !== Number(filters.bedrooms)) return false;
    if (filters.bathrooms && Number(listing.bathrooms) !== Number(filters.bathrooms)) return false;
    if (filters.minSurface && Number(listing.surface_m2) < Number(filters.minSurface)) return false;
    if (filters.maxSurface && Number(listing.surface_m2) > Number(filters.maxSurface)) return false;
    if (filters.propertyType && listing.property_type !== filters.propertyType) return false;
    if (filters.listingType && listing.listing_type !== filters.listingType) return false;
    if (filters.furnished === "yes" && listing.furnished !== true) return false;
    if (filters.furnished === "no" && listing.furnished !== false) return false;
    if (filters.availableFrom && (!listing.available_from || listing.available_from > filters.availableFrom)) return false;
    return true;
  });

  return result.sort((a, b) => {
    switch (filters.sort) {
      case "price_asc": return Number(a.price_monthly) - Number(b.price_monthly);
      case "price_desc": return Number(b.price_monthly) - Number(a.price_monthly);
      case "surface_desc": return Number(b.surface_m2 || 0) - Number(a.surface_m2 || 0);
      case "newest":
      default: return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });
}

function validateFilterValues(filters) {
  for (const [min, max, label, limit] of [
    ["minPrice", "maxPrice", "Prețul", 100000],
    ["minSurface", "maxSurface", "Suprafața", 10000],
  ]) {
    if ([min, max].some((key) => filters[key] &&
      (!/^[1-9]\d*$/.test(filters[key]) || !Number.isInteger(Number(filters[key])) || Number(filters[key]) > limit))) {
      return `${label}: introdu numere întregi între 1 și ${limit}.`;
    }
    if (filters[min] && filters[max] && Number(filters[min]) > Number(filters[max])) {
      return `${label}: valoarea minimă nu poate depăși valoarea maximă.`;
    }
  }
  if (filters.availableFrom) {
    const [year, month, day] = filters.availableFrom.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(filters.availableFrom) ||
      date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
      return "Data disponibilității nu este validă.";
    }
  }
  return "";
}

export default function MobileCityListingsClient() {
  const params = useParams();

  const citySlug = Array.isArray(params?.city)
    ? params.city[0]
    : params?.city || "";

  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openFilter, setOpenFilter] = useState(null);
  const [draftFilters, setDraftFilters] = useState(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState(defaultFilters);
  const [filterError, setFilterError] = useState("");
  const [neighborhoods, setNeighborhoods] = useState([]);
  const [neighborhoodsLoading, setNeighborhoodsLoading] = useState(true);
  const [neighborhoodsError, setNeighborhoodsError] = useState("");
  const visibleListings = useMemo(
    () => filterListings(listings, appliedFilters),
    [listings, appliedFilters]
  );

  function updateFiltersUrl(filters) {
    const query = filters ? filtersToSearchParams(filters).toString() : "";
    window.history.pushState({}, "", `/chirii/${citySlug}${query ? `?${query}` : ""}`);
  }

  function applyFilters() {
    const error = validateFilterValues(draftFilters);
    if (error) {
      setFilterError(error);
      return;
    }
    setFilterError("");
    setAppliedFilters({ ...draftFilters });
    updateFiltersUrl(draftFilters);
    setOpenFilter(null);
  }

  function resetFilters() {
    setDraftFilters({ ...defaultFilters });
    setAppliedFilters({ ...defaultFilters });
    updateFiltersUrl(null);
    setFilterError("");
  }

  useEffect(() => {
    const filters = readUrlFilters(window.location.search);
    setDraftFilters(filters);
    setAppliedFilters(filters);
  }, [citySlug]);

  useEffect(() => {
    let cancelled = false;
    setNeighborhoods([]);
    setNeighborhoodsLoading(true);
    setNeighborhoodsError("");

    async function loadNeighborhoods() {
      try {
        const { data: city, error: cityError } = await supabase
          .from("cities")
          .select("id")
          .eq("slug", citySlug)
          .maybeSingle();
        if (cityError) throw cityError;
        const { data, error } = city
          ? await supabase.from("neighborhoods")
              .select("id, name, slug")
              .eq("city_id", city.id)
              .order("name")
          : { data: [], error: null };
        if (error) throw error;
        if (cancelled) return;
        const options = data || [];
        setNeighborhoods(options);
      } catch {
        if (!cancelled) setNeighborhoodsError("Cartierele nu au putut fi încărcate. Încearcă să reîncarci pagina.");
      } finally {
        if (!cancelled) setNeighborhoodsLoading(false);
      }
    }

    loadNeighborhoods();
    return () => { cancelled = true; };
  }, [citySlug]);

  useEffect(() => {
    async function loadListings() {
      setLoading(true);

      const { data, error } = await supabase
        .from("public_listings")
        .select(`
          id,
          title,
          city,
          price_monthly,
          rooms,
          bedrooms,
          bathrooms,
          surface_m2,
          property_type,
          listing_type,
          available_from,
          furnished,
          image_url,
          active,
          created_at,
          neighborhoods (
            name,
            slug
          )
        `)
        .eq("active", true)
        .order("created_at", {
          ascending: false,
        });

      if (!error) {
        const normalizedCity = normalizeCity(citySlug);

        const filtered = (data || []).filter(
          (listing) => {
            const listingCity = normalizeCity(listing.city);

            return listingCity === normalizedCity;
          }
        );

        setListings(filtered);
      }

      setLoading(false);
    }

    loadListings();
  }, [citySlug]);

  const cityName = decodeURIComponent(
    citySlug
  ).replace(/-/g, " ");

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#F8FAFC",
        color: "#0F172A",
      }}
    >
      <header
        style={{
          height: "58px",
          background: "#FFFFFF",
          borderBottom:
            "1px solid #E2E8F0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 14px",
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
        <a
          href="/"
          style={{
            color: "#172554",
            textDecoration: "none",
            fontSize: "21px",
            fontWeight: "900",
            letterSpacing: "-0.8px",
          }}
        >
          shaus
        </a>

        <div
          className="mobile-city-account"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            whiteSpace: "nowrap",
            fontSize: "11px",
            fontWeight: "800",
          }}
        >
          <AccountButton />
          <a className="mobile-city-add-listing" href="/adaugaproprietate" style={{ background: "#172554", color: "#FFFFFF", textDecoration: "none", borderRadius: "9px", padding: "10px 12px" }}>
            + Adaugă anunț
          </a>
          <style>{`
            .mobile-city-account > a:not(.mobile-city-add-listing) {
              color: #172554 !important;
              padding: 0 !important;
              border: 0 !important;
              background: transparent !important;
            }
          `}</style>
        </div>
      </header>

      <section
        style={{
          padding: "18px 12px 40px",
          maxWidth: "620px",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            marginBottom: "14px",
          }}
        >
          <h1
            style={{
              margin: 0,
              color: "#172554",
              fontSize: "24px",
              lineHeight: "1.15",
              fontWeight: "900",
              letterSpacing: "-0.6px",
              textTransform: "capitalize",
            }}
          >
            Chirii în {cityName}
          </h1>

          <p
            style={{
              margin:
                "6px 0 0",
              color: "#64748B",
              fontSize: "11px",
            }}
          >
            {loading
              ? "Se încarcă..."
              : `${visibleListings.length} ${
                  visibleListings.length === 1
                    ? "proprietate"
                    : "proprietăți"
                } disponibile`}
          </p>
        </div>

        <div
          style={{
            display: "flex",
            gap: "8px",
            overflowX: "auto",
            paddingBottom: "3px",
            marginBottom: "14px",
            scrollbarWidth: "none",
          }}
        >
          {[
            "Preț",
            "Camere",
            "Suprafață",
            "Mobilat",
            "Mai multe",
          ].map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setOpenFilter((current) => current === filter ? null : filter)}
              aria-expanded={openFilter === filter}
              aria-controls="mobile-city-filter-panel"
              style={{
                flexShrink: 0,
                border:
                  "1px solid #CBD5E1",
                background: openFilter === filter ? "#E2E8F0" : "#FFFFFF",
                color: "#172554",
                borderRadius: "999px",
                padding:
                  "9px 13px",
                fontFamily:
                  "inherit",
                fontSize: "10px",
                fontWeight: "800",
              }}
            >
              {filter}
            </button>
          ))}
        </div>

        <div id="mobile-city-filter-panel" hidden={!openFilter}>
          {openFilter && (
            <section
              aria-label={openFilter}
              style={{ display: "flex", flexDirection: "column", gap: "14px", padding: "16px", marginBottom: "14px", background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "12px" }}
            >
              {filterFields[openFilter].map((field) => {
                const options = field.name === "zone"
                  ? [["", "Toate cartierele"], ...neighborhoods.map((item) => [item.slug, item.name])]
                  : field.options;
                const inputProps = {
                  id: `mobile-filter-${field.name}`,
                  value: draftFilters[field.name],
                  onChange: (event) => {
                    setDraftFilters((current) => ({ ...current, [field.name]: event.target.value }));
                    setFilterError("");
                  },
                  style: { boxSizing: "border-box", width: "100%", minWidth: 0, minHeight: "44px", padding: "10px", border: "1px solid #CBD5E1", borderRadius: "9px", background: "#FFFFFF", color: "#172554", fontFamily: "inherit", fontSize: "16px" },
                };
                return (
                  <div key={field.name} style={{ display: "flex", flexDirection: "column", gap: "6px", minWidth: 0 }}>
                    <label htmlFor={inputProps.id} style={{ color: "#172554", fontSize: "12px", fontWeight: "800" }}>{field.label}</label>
                    {options ? (
                      <select {...inputProps} disabled={field.name === "zone" && neighborhoodsLoading}>
                        {options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                    ) : (
                      <input {...inputProps} type={field.type} min={field.type === "number" ? "0" : undefined} step={field.type === "number" ? "any" : undefined} inputMode={field.type === "number" ? "decimal" : undefined} />
                    )}
                    {field.name === "zone" && neighborhoodsError && <p role="status" style={{ margin: 0, fontSize: "12px", color: "#B91C1C" }}>{neighborhoodsError}</p>}
                  </div>
                );
              })}
            </section>
          )}
        </div>

        {filterError && <p role="alert" style={{ color: "#B91C1C", fontSize: "13px" }}>{filterError}</p>}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "14px" }}>
          <button type="button" onClick={applyFilters} style={{ minHeight: "44px", border: "none", borderRadius: "9px", background: "#172554", color: "#FFFFFF", fontFamily: "inherit", fontSize: "12px", fontWeight: "800" }}>
            Aplică filtrele
          </button>
          <button type="button" onClick={resetFilters} style={{ minHeight: "44px", border: "1px solid #CBD5E1", borderRadius: "9px", background: "#FFFFFF", color: "#172554", fontFamily: "inherit", fontSize: "12px", fontWeight: "800" }}>
            Resetează
          </button>
        </div>

        {!loading &&
          visibleListings.length === 0 && (
            <div
              style={{
                background:
                  "#FFFFFF",
                border:
                  "1px solid #E2E8F0",
                borderRadius:
                  "12px",
                padding:
                  "35px 18px",
                textAlign:
                  "center",
              }}
            >
              <div
                style={{
                  color:
                    "#172554",
                  fontSize:
                    "15px",
                  fontWeight:
                    "900",
                }}
              >
                Nu am găsit proprietăți
              </div>
            </div>
          )}

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          {visibleListings.map(
            (listing) => (
              <article
                key={listing.id}
                style={{
                  background:
                    "#FFFFFF",
                  border:
                    "1px solid #E2E8F0",
                  borderRadius:
                    "12px",
                  overflow:
                    "hidden",
                }}
              >
                <div
                  style={{
                    position:
                      "relative",
                    width: "100%",
                    height:
                      "220px",
                    background:
                      "#E2E8F0",
                  }}
                >
                  {listing.image_url ? (
                    <ListingImageGallery listingId={listing.id} cover={listing.image_url} title={listing.title}>
                    <img
                      src={
                        listing.image_url
                      }
                      alt={
                        listing.title ||
                        "Proprietate"
                      }
                      style={{
                        width:
                          "100%",
                        height:
                          "100%",
                        objectFit:
                          "cover",
                        display:
                          "block",
                      }}
                    />
                    </ListingImageGallery>
                  ) : (
                    <div
                      style={{
                        width:
                          "100%",
                        height:
                          "100%",
                        display:
                          "flex",
                        alignItems:
                          "center",
                        justifyContent:
                          "center",
                        color:
                          "#64748B",
                        fontSize:
                          "11px",
                        fontWeight:
                          "700",
                      }}
                    >
                      Fără imagine
                    </div>
                  )}

                  <div
                    style={{
                      position:
                        "absolute",
                      top: "10px",
                      right: "10px",
                    }}
                  >
                    <FavoriteButton
                      listingId={
                        listing.id
                      }
                    />
                  </div>
                </div>

                <div
                  style={{
                    padding:
                      "13px",
                  }}
                >
                  <div
                    style={{
                      display:
                        "flex",
                      justifyContent:
                        "space-between",
                      alignItems:
                        "flex-start",
                      gap: "10px",
                    }}
                  >
                    <div
                      style={{
                        minWidth: 0,
                        flex: 1,
                      }}
                    >
                      <h2
                        style={{
                          margin: 0,
                          color:
                            "#172554",
                          fontSize:
                            "15px",
                          lineHeight:
                            "1.35",
                          fontWeight:
                            "900",
                        }}
                      >
                        {listing.title ||
                          "Proprietate de închiriat"}
                      </h2>

                      <div
                        style={{
                          marginTop:
                            "5px",
                          color:
                            "#64748B",
                          fontSize:
                            "10px",
                          fontWeight:
                            "600",
                        }}
                      >
                        {listing
                          .neighborhoods
                          ?.name
                          ? `${listing.neighborhoods.name}, `
                          : ""}
                        {listing.city}
                      </div>
                    </div>

                    <div
                      style={{
                        color:
                          "#172554",
                        fontSize:
                          "18px",
                        fontWeight:
                          "900",
                        whiteSpace:
                          "nowrap",
                      }}
                    >
                      €
                      {Number(
                        listing.price_monthly ||
                          0
                      ).toLocaleString(
                        "ro-RO"
                      )}
                      <span
                        style={{
                          color:
                            "#64748B",
                          fontSize:
                            "9px",
                          fontWeight:
                            "700",
                        }}
                      >
                        /lună
                      </span>
                    </div>
                  </div>

                  <div
                    style={{
                      display:
                        "flex",
                      flexWrap:
                        "wrap",
                      gap: "6px",
                      marginTop:
                        "11px",
                    }}
                  >
                    {listing.rooms !=
                      null && (
                      <span
                        style={{
                          background:
                            "#F1F5F9",
                          color:
                            "#475569",
                          borderRadius:
                            "999px",
                          padding:
                            "5px 8px",
                          fontSize:
                            "9px",
                          fontWeight:
                            "800",
                        }}
                      >
                        {listing.rooms}{" "}
                        {Number(
                          listing.rooms
                        ) === 1
                          ? "cameră"
                          : "camere"}
                      </span>
                    )}

                    {listing.bedrooms !=
                      null && (
                      <span
                        style={{
                          background:
                            "#F1F5F9",
                          color:
                            "#475569",
                          borderRadius:
                            "999px",
                          padding:
                            "5px 8px",
                          fontSize:
                            "9px",
                          fontWeight:
                            "800",
                        }}
                      >
                        {
                          listing.bedrooms
                        }{" "}
                        {Number(
                          listing.bedrooms
                        ) === 1
                          ? "dormitor"
                          : "dormitoare"}
                      </span>
                    )}

                    {listing.surface_m2 !=
                      null && (
                      <span
                        style={{
                          background:
                            "#F1F5F9",
                          color:
                            "#475569",
                          borderRadius:
                            "999px",
                          padding:
                            "5px 8px",
                          fontSize:
                            "9px",
                          fontWeight:
                            "800",
                        }}
                      >
                        {
                          listing.surface_m2
                        }{" "}
                        m²
                      </span>
                    )}

                    {listing.furnished ===
                      true && (
                      <span
                        style={{
                          background:
                            "#F1F5F9",
                          color:
                            "#475569",
                          borderRadius:
                            "999px",
                          padding:
                            "5px 8px",
                          fontSize:
                            "9px",
                          fontWeight:
                            "800",
                        }}
                      >
                        Mobilat
                      </span>
                    )}
                  </div>

                  <a
                    href={`/proprietate/${listing.id}`}
                    style={{
                      marginTop:
                        "12px",
                      height:
                        "42px",
                      borderRadius:
                        "9px",
                      background:
                        "#172554",
                      color:
                        "#FFFFFF",
                      textDecoration:
                        "none",
                      fontSize:
                        "11px",
                      fontWeight:
                        "800",
                      display:
                        "flex",
                      alignItems:
                        "center",
                      justifyContent:
                        "center",
                    }}
                  >
                    Vezi anunțul
                  </a>
                </div>
              </article>
            )
          )}
        </div>
      </section>
    </main>
  );
}
