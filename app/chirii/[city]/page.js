import { supabase } from "../../lib/supabase";

export const dynamic = "force-dynamic";

/*
  Normalizăm numele orașului DOAR intern pentru comparație.

  Exemple:
  Timișoara    -> timisoara
  București    -> bucuresti
  Iași         -> iasi
  Brașov       -> brasov
  Constanța    -> constanta
  Târgu Mureș  -> targu-mures

  Utilizatorul NU vede această variantă.
*/
function normalizeCity(value = "") {
  return decodeURIComponent(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-");
}

/*
  Folosit doar dacă nu avem încă niciun anunț
  din care să putem lua numele real al orașului.
*/
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

export default async function CityListingsPage({ params }) {
  const resolvedParams = await params;
  const citySlug = resolvedParams.city;

  const normalizedRequestedCity = normalizeCity(citySlug);

  /*
    Luăm toate anunțurile active.

    Filtrarea după oraș o facem mai jos, după normalizare,
    ca /chirii/timisoara să găsească "Timișoara",
    /chirii/iasi să găsească "Iași" etc.
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
    Filtrăm după oraș ignorând diacriticele.

    Exemplu:
    URL: timisoara
    DB:  Timișoara
    => MATCH
  */
  const cityListings = (listings || []).filter(
    (listing) =>
      normalizeCity(listing.city) ===
      normalizedRequestedCity
  );

  /*
    Pentru afișare folosim numele REAL din baza de date,
    cu diacritice.

    /chirii/timisoara -> "Timișoara"
  */
  const cityName =
    cityListings.length > 0
      ? cityListings[0].city
      : formatFallbackCityName(citySlug);

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
          borderBottom: "1px solid #E2E8F0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
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
          <span style={{ color: "#172554" }}>
            Student
          </span>

          <span style={{ color: "#3B82F6" }}>
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
            marginBottom: "28px",
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
            Descoperă locuințele disponibile pentru
            închiriere în {cityName}, indiferent de
            universitatea la care studiezi.
          </p>
        </div>

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
            Cele mai noi
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
              Momentan nu există chirii în {cityName}
            </div>

            <p
              style={{
                color: "#64748B",
                fontSize: "13px",
                margin: "8px 0 0",
                lineHeight: "1.6",
              }}
            >
              Încearcă din nou mai târziu sau caută într-un
              alt oraș.
            </p>
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
              const availableDate = formatDate(
                listing.available_from
              );

              const createdDate = formatDate(
                listing.created_at
              );

              return (
                <a
                  key={listing.id}
                  href={`/proprietate/${listing.id}`}
                  className="listing-card"
                  style={{
                    background: "#FFFFFF",
                    border: "1px solid #E2E8F0",
                    borderRadius: "14px",
                    overflow: "hidden",
                    textDecoration: "none",
                    color: "inherit",
                    display: "flex",
                    minHeight: "168px",
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
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#94A3B8",
                          fontSize: "12px",
                          fontWeight: "700",
                        }}
                      >
                        Fără fotografie
                      </div>
                    )}
                  </div>

                  {/* INFORMAȚII PRINCIPALE */}

                  <div
                    className="listing-content"
                    style={{
                      flex: 1,
                      minWidth: 0,
                      padding: "17px 19px",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                    }}
                  >
                    <div>
                      {/* TITLU ANUNȚ */}

                      <h2
                        style={{
                          margin: 0,
                          color: "#172554",
                          fontSize: "17px",
                          lineHeight: "1.35",
                          fontWeight: "800",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {listing.title}
                      </h2>

                      {/* LOCAȚIE */}

                      <div
                        style={{
                          color: "#64748B",
                          fontSize: "12px",
                          lineHeight: "1.5",
                          marginTop: "6px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        📍 {listing.city}
                        {listing.address
                          ? ` · ${listing.address}`
                          : ""}
                      </div>

                      {/* CARACTERISTICI */}

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          flexWrap: "wrap",
                          gap: "7px",
                          marginTop: "13px",
                        }}
                      >
                        {listing.rooms && (
                          <span style={detailBadge}>
                            {listing.rooms}{" "}
                            {Number(listing.rooms) === 1
                              ? "cameră"
                              : "camere"}
                          </span>
                        )}

                        {listing.surface_m2 && (
                          <span style={detailBadge}>
                            {listing.surface_m2} m²
                          </span>
                        )}

                        {listing.furnished && (
                          <span style={detailBadge}>
                            Mobilat
                          </span>
                        )}

                        {listing.bathrooms && (
                          <span style={detailBadge}>
                            {listing.bathrooms}{" "}
                            {Number(listing.bathrooms) === 1
                              ? "baie"
                              : "băi"}
                          </span>
                        )}

                        {listing.bedrooms && (
                          <span style={detailBadge}>
                            {listing.bedrooms}{" "}
                            {Number(listing.bedrooms) === 1
                              ? "dormitor"
                              : "dormitoare"}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* INFORMAȚII SECUNDARE */}

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: "15px",
                        marginTop: "13px",
                      }}
                    >
                      {availableDate && (
                        <span
                          style={{
                            color: "#64748B",
                            fontSize: "11px",
                            fontWeight: "600",
                          }}
                        >
                          Disponibil din {availableDate}
                        </span>
                      )}

                      {createdDate && (
                        <span
                          style={{
                            color: "#94A3B8",
                            fontSize: "11px",
                            fontWeight: "600",
                          }}
                        >
                          Publicat la {createdDate}
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
                      padding: "18px 18px 16px 5px",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-end",
                      justifyContent: "space-between",
                      boxSizing: "border-box",
                    }}
                  >
                    <div
                      style={{
                        textAlign: "right",
                      }}
                    >
                      <div
                        style={{
                          color: "#172554",
                          fontSize: "21px",
                          lineHeight: "1",
                          fontWeight: "900",
                          letterSpacing: "-0.5px",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {Number(
                          listing.price_monthly
                        ).toLocaleString("ro-RO")}
                        €
                      </div>

                      <div
                        style={{
                          color: "#94A3B8",
                          fontSize: "10px",
                          fontWeight: "600",
                          marginTop: "5px",
                        }}
                      >
                        pe lună
                      </div>
                    </div>

                    <span
                      style={{
                        color: "#3B82F6",
                        fontSize: "11px",
                        fontWeight: "800",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Vezi anunțul →
                    </span>
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </section>

      {/* RESPONSIVE + HOVER */}

      <style>{`
        .listing-card:hover {
          border-color: #BFDBFE !important;
          box-shadow: 0 8px 25px rgba(15, 23, 42, 0.08);
          transform: translateY(-1px);
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

        @media (max-width: 480px) {
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

const detailBadge = {
  background: "#F8FAFC",
  border: "1px solid #E2E8F0",
  color: "#475569",
  borderRadius: "7px",
  padding: "5px 8px",
  fontSize: "10px",
  fontWeight: "700",
};
