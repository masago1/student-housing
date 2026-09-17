import { supabase } from "../../lib/supabase";
import FavoriteButton from "../../components/FavoriteButton";

export const dynamic = "force-dynamic";

function normalizeCity(value = "") {
  return decodeURIComponent(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-");
}

function formatFallbackCityName(city = "") {
  return decodeURIComponent(city)
    .replace(/-/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(date) {
  if (!date) return null;

  try {
    return new Intl.DateTimeFormat("ro-RO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(date));
  } catch {
    return null;
  }
}

function numberValue(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export default async function CityListingsPage({
  params,
  searchParams,
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  const citySlug = resolvedParams.city;
  const normalizedRequestedCity =
    normalizeCity(citySlug);

  const getParam = (name) => {
    const value = resolvedSearchParams?.[name];

    if (Array.isArray(value)) {
      return value[0] || "";
    }

    return value || "";
  };

  const filters = {
    minPrice: getParam("minPrice"),
    maxPrice: getParam("maxPrice"),
    rooms: getParam("rooms"),
    bedrooms: getParam("bedrooms"),
    bathrooms: getParam("bathrooms"),
    minSurface: getParam("minSurface"),
    maxSurface: getParam("maxSurface"),
    propertyType: getParam("propertyType"),
    furnished: getParam("furnished"),
    listingType: getParam("listingType"),
    availableFrom: getParam("availableFrom"),
    sort: getParam("sort") || "newest",
  };

  /*
    Luăm toate anunțurile active.
    Filtrarea după oraș se face mai jos pentru a păstra
    compatibilitatea cu diacriticele din baza de date.
  */

  const { data: listings, error } = await supabase
    .from("listings")
    .select(`
      id,
      title,
      description,
      city,
      address,
      price_monthly,
      rooms,
      bedrooms,
      bathrooms,
      surface_m2,
      property_type,
      listing_type,
      furnished,
      available_from,
      image_url,
      active,
      created_at
    `)
    .eq("active", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(
      "Eroare la încărcarea chiriilor:",
      error
    );
  }

  /*
    Mai întâi filtrăm după oraș.
  */

  let cityListings = (listings || []).filter(
    (listing) =>
      normalizeCity(listing.city) ===
      normalizedRequestedCity
  );

  /*
    FILTRE
  */

  const minPrice = numberValue(filters.minPrice);
  const maxPrice = numberValue(filters.maxPrice);
  const rooms = numberValue(filters.rooms);
  const bedrooms = numberValue(filters.bedrooms);
  const bathrooms = numberValue(filters.bathrooms);
  const minSurface = numberValue(filters.minSurface);
  const maxSurface = numberValue(filters.maxSurface);

  if (minPrice !== null) {
    cityListings = cityListings.filter(
      (listing) =>
        Number(listing.price_monthly) >= minPrice
    );
  }

  if (maxPrice !== null) {
    cityListings = cityListings.filter(
      (listing) =>
        Number(listing.price_monthly) <= maxPrice
    );
  }

  if (rooms !== null) {
    cityListings = cityListings.filter(
      (listing) =>
        Number(listing.rooms) === rooms
    );
  }

  if (bedrooms !== null) {
    cityListings = cityListings.filter(
      (listing) =>
        Number(listing.bedrooms) === bedrooms
    );
  }

  if (bathrooms !== null) {
    cityListings = cityListings.filter(
      (listing) =>
        Number(listing.bathrooms) === bathrooms
    );
  }

  if (minSurface !== null) {
    cityListings = cityListings.filter(
      (listing) =>
        Number(listing.surface_m2) >= minSurface
    );
  }

  if (maxSurface !== null) {
    cityListings = cityListings.filter(
      (listing) =>
        Number(listing.surface_m2) <= maxSurface
    );
  }

  if (filters.propertyType) {
    cityListings = cityListings.filter(
      (listing) =>
        listing.property_type ===
        filters.propertyType
    );
  }

  if (filters.listingType) {
    cityListings = cityListings.filter(
      (listing) =>
        listing.listing_type ===
        filters.listingType
    );
  }

  if (filters.furnished === "yes") {
    cityListings = cityListings.filter(
      (listing) =>
        listing.furnished === true
    );
  }

  if (filters.furnished === "no") {
    cityListings = cityListings.filter(
      (listing) =>
        listing.furnished === false
    );
  }

  if (filters.availableFrom) {
    cityListings = cityListings.filter(
      (listing) =>
        listing.available_from &&
        listing.available_from <=
          filters.availableFrom
    );
  }

  /*
    SORTARE
  */

  if (filters.sort === "price_asc") {
    cityListings.sort(
      (a, b) =>
        Number(a.price_monthly) -
        Number(b.price_monthly)
    );
  }

  if (filters.sort === "price_desc") {
    cityListings.sort(
      (a, b) =>
        Number(b.price_monthly) -
        Number(a.price_monthly)
    );
  }

  if (filters.sort === "surface_desc") {
    cityListings.sort(
      (a, b) =>
        Number(b.surface_m2 || 0) -
        Number(a.surface_m2 || 0)
    );
  }

  if (filters.sort === "newest") {
    cityListings.sort(
      (a, b) =>
        new Date(b.created_at) -
        new Date(a.created_at)
    );
  }

  const cityName =
    (listings || []).find(
      (listing) =>
        normalizeCity(listing.city) ===
        normalizedRequestedCity
    )?.city ||
    formatFallbackCityName(citySlug);

  /*
    Păstrăm pagina actuală pentru revenirea din anunț.
  */

  const currentParams = new URLSearchParams();

  Object.entries(filters).forEach(
    ([key, value]) => {
      if (value) {
        currentParams.set(key, value);
      }
    }
  );

  const queryString =
    currentParams.toString();

  const returnUrl =
    `/chirii/${citySlug}` +
    (queryString
      ? `?${queryString}`
      : "");

  const hasFilters =
    Object.entries(filters).some(
      ([key, value]) =>
        key !== "sort" &&
        value
    );

  const clearFiltersUrl =
    `/chirii/${citySlug}`;

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#F4F7FB",
        color: "#0F172A",
      }}
    >
      {/* HEADER */}

      <header
        style={{
          height: "72px",
          background: "#FFFFFF",
          borderBottom:
            "1px solid #E2E8F0",
          display: "flex",
          alignItems: "center",
          justifyContent:
            "space-between",
          padding: "0 6%",
          boxSizing: "border-box",
        }}
      >
        <a
          href="/"
          style={{
            textDecoration: "none",
            fontSize: "25px",
            fontWeight: "800",
            letterSpacing: "-1px",
          }}
        >
          <span
            style={{
              color: "#172554",
            }}
          >
            Student
          </span>

          <span
            style={{
              color: "#3B82F6",
            }}
          >
            Housing
          </span>
        </a>

        <a
          href="/"
          style={{
            color: "#64748B",
            textDecoration: "none",
            fontSize: "13px",
            fontWeight: "700",
          }}
        >
          Înapoi la căutare
        </a>
      </header>

      {/* CONȚINUT */}

      <section
        style={{
          maxWidth: "1080px",
          margin: "0 auto",
          padding: "42px 22px 80px",
          boxSizing: "border-box",
        }}
      >
        {/* TITLU */}

        <div
          style={{
            marginBottom: "25px",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              background: "#EFF6FF",
              color: "#3B82F6",
              borderRadius: "100px",
              padding: "6px 11px",
              fontSize: "11px",
              fontWeight: "800",
              marginBottom: "12px",
            }}
          >
            Chirii pentru studenți
          </div>

          <h1
            style={{
              margin: 0,
              color: "#172554",
              fontSize: "32px",
              lineHeight: "1.15",
              letterSpacing: "-1.1px",
              fontWeight: "800",
            }}
          >
            Chirii în {cityName}
          </h1>

          <p
            style={{
              margin: "9px 0 0",
              color: "#64748B",
              fontSize: "14px",
              lineHeight: "1.6",
            }}
          >
            Descoperă locuințele disponibile
            pentru închiriere în {cityName},
            indiferent de universitatea la care
            studiezi.
          </p>
        </div>

        {/* FILTRE */}

        <form
          method="GET"
          style={{
            background: "#FFFFFF",
            border: "1px solid #E2E8F0",
            borderRadius: "16px",
            padding: "20px",
            marginBottom: "15px",
            boxShadow:
              "0 5px 18px rgba(15, 23, 42, 0.04)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent:
                "space-between",
              gap: "15px",
              marginBottom: "17px",
            }}
          >
            <div>
              <div
                style={{
                  color: "#172554",
                  fontSize: "16px",
                  fontWeight: "800",
                }}
              >
                Filtre
              </div>

              <div
                style={{
                  color: "#94A3B8",
                  fontSize: "11px",
                  marginTop: "3px",
                }}
              >
                Găsește proprietatea potrivită
              </div>
            </div>

            {hasFilters && (
              <a
                href={clearFiltersUrl}
                style={{
                  color: "#64748B",
                  textDecoration: "none",
                  fontSize: "11px",
                  fontWeight: "700",
                }}
              >
                Resetează filtrele
              </a>
            )}
          </div>

          {/* RÂND 1 */}

          <div
            className="filters-grid"
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(4, minmax(0, 1fr))",
              gap: "10px",
            }}
          >
            <div>
              <label style={labelStyle}>
                Preț minim
              </label>

              <input
                name="minPrice"
                type="number"
                min="0"
                placeholder="De la €"
                defaultValue={
                  filters.minPrice
                }
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>
                Preț maxim
              </label>

              <input
                name="maxPrice"
                type="number"
                min="0"
                placeholder="Până la €"
                defaultValue={
                  filters.maxPrice
                }
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>
                Camere
              </label>

              <select
                name="rooms"
                defaultValue={
                  filters.rooms
                }
                style={inputStyle}
              >
                <option value="">
                  Oricare
                </option>
                <option value="1">
                  1 cameră
                </option>
                <option value="2">
                  2 camere
                </option>
                <option value="3">
                  3 camere
                </option>
                <option value="4">
                  4 camere
                </option>
                <option value="5">
                  5+ camere
                </option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>
                Tip proprietate
              </label>

              <select
                name="propertyType"
                defaultValue={
                  filters.propertyType
                }
                style={inputStyle}
              >
                <option value="">
                  Oricare
                </option>
                <option value="Apartament">
                  Apartament
                </option>
                <option value="Garsonieră">
                  Garsonieră
                </option>
                <option value="Casă">
                  Casă
                </option>
                <option value="Cameră">
                  Cameră
                </option>
              </select>
            </div>
          </div>

          {/* RÂND 2 */}

          <div
            className="filters-grid"
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(4, minmax(0, 1fr))",
              gap: "10px",
              marginTop: "10px",
            }}
          >
            <div>
              <label style={labelStyle}>
                Dormitoare
              </label>

              <select
                name="bedrooms"
                defaultValue={
                  filters.bedrooms
                }
                style={inputStyle}
              >
                <option value="">
                  Oricare
                </option>
                <option value="1">
                  1 dormitor
                </option>
                <option value="2">
                  2 dormitoare
                </option>
                <option value="3">
                  3 dormitoare
                </option>
                <option value="4">
                  4+ dormitoare
                </option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>
                Băi
              </label>

              <select
                name="bathrooms"
                defaultValue={
                  filters.bathrooms
                }
                style={inputStyle}
              >
                <option value="">
                  Oricare
                </option>
                <option value="1">
                  1 baie
                </option>
                <option value="2">
                  2 băi
                </option>
                <option value="3">
                  3+ băi
                </option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>
                Suprafață minimă
              </label>

              <input
                name="minSurface"
                type="number"
                min="0"
                placeholder="De la m²"
                defaultValue={
                  filters.minSurface
                }
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>
                Suprafață maximă
              </label>

              <input
                name="maxSurface"
                type="number"
                min="0"
                placeholder="Până la m²"
                defaultValue={
                  filters.maxSurface
                }
                style={inputStyle}
              />
            </div>
          </div>

          {/* RÂND 3 */}

          <div
            className="filters-grid"
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(4, minmax(0, 1fr))",
              gap: "10px",
              marginTop: "10px",
            }}
          >
            <div>
              <label style={labelStyle}>
                Mobilat
              </label>

              <select
                name="furnished"
                defaultValue={
                  filters.furnished
                }
                style={inputStyle}
              >
                <option value="">
                  Oricare
                </option>
                <option value="yes">
                  Da
                </option>
                <option value="no">
                  Nu
                </option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>
                Tip anunț
              </label>

              <select
                name="listingType"
                defaultValue={
                  filters.listingType
                }
                style={inputStyle}
              >
                <option value="">
                  Oricare
                </option>
                <option value="rent">
                  Închiriere
                </option>
                <option value="room">
                  Cameră
                </option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>
                Disponibil până la
              </label>

              <input
                name="availableFrom"
                type="date"
                defaultValue={
                  filters.availableFrom
                }
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>
                Sortare
              </label>

              <select
                name="sort"
                defaultValue={
                  filters.sort
                }
                style={inputStyle}
              >
                <option value="newest">
                  Cele mai noi
                </option>
                <option value="price_asc">
                  Preț crescător
                </option>
                <option value="price_desc">
                  Preț descrescător
                </option>
                <option value="surface_desc">
                  Suprafață descrescător
                </option>
              </select>
            </div>
          </div>

          {/* BUTON */}

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginTop: "15px",
            }}
          >
            <button
              type="submit"
              style={{
                border: "none",
                borderRadius: "10px",
                background: "#172554",
                color: "#FFFFFF",
                padding: "12px 23px",
                fontFamily: "inherit",
                fontSize: "13px",
                fontWeight: "800",
                cursor: "pointer",
              }}
            >
              Aplică filtrele
            </button>
          </div>
        </form>

        {/* BARĂ REZULTATE */}

        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #E2E8F0",
            borderRadius: "12px",
            padding: "12px 16px",
            marginBottom: "14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "15px",
          }}
        >
          <div
            style={{
              color: "#0F172A",
              fontSize: "13px",
              fontWeight: "700",
            }}
          >
            {cityListings.length === 1
              ? "1 anunț găsit"
              : `${cityListings.length} anunțuri găsite`}
          </div>

          <div
            style={{
              color: "#94A3B8",
              fontSize: "11px",
              fontWeight: "600",
            }}
          >
            {hasFilters
              ? "Filtre aplicate"
              : "Cele mai noi"}
          </div>
        </div>

        {/* FĂRĂ REZULTATE */}

        {cityListings.length === 0 && (
          <div
            style={{
              background: "#FFFFFF",
              border: "1px solid #E2E8F0",
              borderRadius: "14px",
              padding: "50px 25px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                color: "#172554",
                fontSize: "19px",
                fontWeight: "800",
              }}
            >
              {hasFilters
                ? "Nu există anunțuri care corespund filtrelor"
                : `Momentan nu există chirii în ${cityName}`}
            </div>

            <p
              style={{
                color: "#64748B",
                fontSize: "13px",
                margin: "8px 0 0",
                lineHeight: "1.6",
              }}
            >
              {hasFilters
                ? "Încearcă să modifici sau să elimini câteva filtre."
                : "Încearcă din nou mai târziu sau caută într-un alt oraș."}
            </p>

            {hasFilters && (
              <a
                href={clearFiltersUrl}
                style={{
                  display: "inline-block",
                  marginTop: "16px",
                  color: "#2563EB",
                  textDecoration: "none",
                  fontSize: "12px",
                  fontWeight: "800",
                }}
              >
                Resetează filtrele
              </a>
            )}
          </div>
        )}

        {/* LISTA ANUNȚURI */}

        {cityListings.length > 0 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "11px",
            }}
          >
            {cityListings.map((listing) => {
              const availableDate =
                formatDate(
                  listing.available_from
                );

              const createdDate =
                formatDate(
                  listing.created_at
                );

              const propertyUrl =
                `/proprietate/${listing.id}` +
                `?from=${encodeURIComponent(
                  returnUrl
                )}`;

              return (
                <div
                  key={listing.id}
                  className="listing-card"
                  style={{
                    background: "#FFFFFF",
                    border:
                      "1px solid #E2E8F0",
                    borderRadius: "14px",
                    overflow: "hidden",
                    color: "inherit",
                    display: "flex",
                    minHeight: "168px",
                    position: "relative",
                    transition:
                      "box-shadow 0.2s ease, border-color 0.2s ease, transform 0.2s ease",
                  }}
                >
                  {/* FOTOGRAFIE */}

                  <div
                    className="listing-image"
                    style={{
                      width: "235px",
                      minWidth: "235px",
                      height: "168px",
                      background: "#EFF6FF",
                      overflow: "hidden",
                      position: "relative",
                    }}
                  >
                    {listing.image_url ? (
                      <img
                        src={listing.image_url}
                        alt={listing.title}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          display: "block",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: "100%",
                          height: "100%",
                          display: "flex",
                          alignItems:
                            "center",
                          justifyContent:
                            "center",
                          color: "#94A3B8",
                          fontSize: "12px",
                          fontWeight: "700",
                        }}
                      >
                        Fără fotografie
                      </div>
                    )}

                    <FavoriteButton
                      listingId={listing.id}
                    />
                  </div>

                  {/* LINK ANUNȚ */}

                  <a
                    href={propertyUrl}
                    className="listing-main-link"
                    style={{
                      flex: 1,
                      minWidth: 0,
                      display: "flex",
                      textDecoration:
                        "none",
                      color: "inherit",
                    }}
                  >
                    <div
                      className="listing-content"
                      style={{
                        flex: 1,
                        minWidth: 0,
                        padding:
                          "17px 19px",
                        display: "flex",
                        flexDirection:
                          "column",
                        justifyContent:
                          "space-between",
                      }}
                    >
                      <div>
                        <h2
                          style={{
                            margin: 0,
                            color:
                              "#172554",
                            fontSize:
                              "17px",
                            lineHeight:
                              "1.35",
                            fontWeight:
                              "800",
                            overflow:
                              "hidden",
                            textOverflow:
                              "ellipsis",
                            whiteSpace:
                              "nowrap",
                          }}
                        >
                          {listing.title}
                        </h2>

                        <div
                          style={{
                            color:
                              "#64748B",
                            fontSize:
                              "12px",
                            lineHeight:
                              "1.5",
                            marginTop:
                              "6px",
                            overflow:
                              "hidden",
                            textOverflow:
                              "ellipsis",
                            whiteSpace:
                              "nowrap",
                          }}
                        >
                          {listing.city}

                          {listing.address
                            ? ` · ${listing.address}`
                            : ""}
                        </div>

                        <div
                          style={{
                            display:
                              "flex",
                            alignItems:
                              "center",
                            flexWrap:
                              "wrap",
                            gap: "7px",
                            marginTop:
                              "13px",
                          }}
                        >
                          {Number(
                            listing.rooms
                          ) > 0 && (
                            <span
                              style={
                                detailBadge
                              }
                            >
                              {
                                listing.rooms
                              }{" "}
                              {Number(
                                listing.rooms
                              ) === 1
                                ? "cameră"
                                : "camere"}
                            </span>
                          )}

                          {Number(
                            listing.surface_m2
                          ) > 0 && (
                            <span
                              style={
                                detailBadge
                              }
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
                              style={
                                detailBadge
                              }
                            >
                              Mobilat
                            </span>
                          )}

                          {Number(
                            listing.bathrooms
                          ) > 0 && (
                            <span
                              style={
                                detailBadge
                              }
                            >
                              {
                                listing.bathrooms
                              }{" "}
                              {Number(
                                listing.bathrooms
                              ) === 1
                                ? "baie"
                                : "băi"}
                            </span>
                          )}

                          {Number(
                            listing.bedrooms
                          ) > 0 && (
                            <span
                              style={
                                detailBadge
                              }
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
                        </div>
                      </div>

                      <div
                        style={{
                          display:
                            "flex",
                          alignItems:
                            "center",
                          flexWrap:
                            "wrap",
                          gap: "15px",
                          marginTop:
                            "13px",
                        }}
                      >
                        {availableDate && (
                          <span
                            style={{
                              color:
                                "#64748B",
                              fontSize:
                                "11px",
                              fontWeight:
                                "600",
                            }}
                          >
                            Disponibil din{" "}
                            {
                              availableDate
                            }
                          </span>
                        )}

                        {createdDate && (
                          <span
                            style={{
                              color:
                                "#94A3B8",
                              fontSize:
                                "11px",
                              fontWeight:
                                "600",
                            }}
                          >
                            Publicat la{" "}
                            {
                              createdDate
                            }
                          </span>
                        )}
                      </div>
                    </div>

                    {/* PREȚ */}

                    <div
                      className="listing-price"
                      style={{
                        width: "155px",
                        minWidth: "155px",
                        padding:
                          "18px 18px 16px 5px",
                        display: "flex",
                        flexDirection:
                          "column",
                        alignItems:
                          "flex-end",
                        justifyContent:
                          "space-between",
                        boxSizing:
                          "border-box",
                      }}
                    >
                      <div
                        style={{
                          textAlign:
                            "right",
                        }}
                      >
                        <div
                          style={{
                            color:
                              "#172554",
                            fontSize:
                              "21px",
                            lineHeight:
                              "1",
                            fontWeight:
                              "900",
                            letterSpacing:
                              "-0.5px",
                            whiteSpace:
                              "nowrap",
                          }}
                        >
                          {Number(
                            listing.price_monthly
                          ).toLocaleString(
                            "ro-RO"
                          )}
                          €
                        </div>

                        <div
                          style={{
                            color:
                              "#94A3B8",
                            fontSize:
                              "10px",
                            fontWeight:
                              "600",
                            marginTop:
                              "5px",
                          }}
                        >
                          pe lună
                        </div>
                      </div>

                      <span
                        style={{
                          color:
                            "#3B82F6",
                          fontSize:
                            "11px",
                          fontWeight:
                            "800",
                          whiteSpace:
                            "nowrap",
                        }}
                      >
                        Vezi anunțul →
                      </span>
                    </div>
                  </a>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <style>{`
        .listing-card:hover {
          border-color: #BFDBFE !important;
          box-shadow: 0 8px 25px rgba(15, 23, 42, 0.08);
          transform: translateY(-1px);
        }

        .listing-main-link {
          flex: 1;
          min-width: 0;
        }

        @media (max-width: 850px) {
          .filters-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
        }

        @media (max-width: 760px) {
          .listing-card {
            flex-direction: column !important;
          }

          .listing-image {
            width: 100% !important;
            min-width: 100% !important;
            height: 210px !important;
          }

          .listing-main-link {
            width: 100% !important;
            flex-direction: column !important;
          }

          .listing-content {
            padding: 16px !important;
          }

          .listing-price {
            width: 100% !important;
            min-width: 100% !important;
            padding: 0 16px 16px !important;
            flex-direction: row !important;
            align-items: flex-end !important;
          }
        }

        @media (max-width: 520px) {
          .filters-grid {
            grid-template-columns: 1fr !important;
          }

          .listing-image {
            height: 190px !important;
          }

          .listing-price {
            align-items: center !important;
          }
        }
      `}</style>
    </main>
  );
}

const labelStyle = {
  display: "block",
  color: "#475569",
  fontSize: "10px",
  fontWeight: "800",
  marginBottom: "5px",
};

const inputStyle = {
  width: "100%",
  height: "42px",
  border: "1px solid #CBD5E1",
  borderRadius: "9px",
  background: "#FFFFFF",
  color: "#172554",
  padding: "0 11px",
  boxSizing: "border-box",
  fontFamily: "inherit",
  fontSize: "12px",
  outline: "none",
};

const detailBadge = {
  background: "#F8FAFC",
  border: "1px solid #E2E8F0",
  color: "#475569",
  borderRadius: "7px",
  padding: "5px 8px",
  fontSize: "10px",
  fontWeight: "700",
};
