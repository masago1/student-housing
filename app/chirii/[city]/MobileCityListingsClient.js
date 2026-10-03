"use client";

import { defaultFilters, readUrlFilters, filtersToSearchParams, filterListings, validateFilterValues } from "../../lib/rentalFilters.mjs";
import { filterFields } from "../../lib/rentalFilterFields.mjs";
import UniversityFilter from "../../components/UniversityFilter";
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
    function restoreFilters() {
    const filters = readUrlFilters(window.location.search);
    setDraftFilters(filters);
    setAppliedFilters(filters);
    }
    restoreFilters();
    window.addEventListener("popstate", restoreFilters);
    return () => window.removeEventListener("popstate", restoreFilters);
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

        <UniversityFilter citySlug={citySlug} filters={draftFilters} />

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
