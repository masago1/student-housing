import { supabase } from "../../lib/supabase";

export const dynamic = "force-dynamic";

/*
  Transformă orice text într-o formă comparabilă pentru URL.

  Exemple:
  Timișoara  -> timisoara
  București  -> bucuresti
  Iași       -> iasi
  Brașov     -> brasov
  Constanța  -> constanta
  Târgu Mureș -> targu-mures
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
  Numele afișat în pagină.
  Folosim numele real din baza de date atunci când îl găsim,
  deci va apărea "Timișoara", nu "Timisoara".
*/
function formatFallbackCityName(city = "") {
  return decodeURIComponent(city)
    .replace(/-/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default async function CityListingsPage({ params }) {
  const resolvedParams = await params;
  const citySlug = resolvedParams.city;

  const normalizedRequestedCity = normalizeCity(citySlug);

  /*
    Luăm toate anunțurile active.

    După aceea comparăm orașul într-o formă normalizată,
    astfel încât diacriticele să nu afecteze căutarea.
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
    Păstrăm doar anunțurile al căror oraș corespunde
    orașului din URL după eliminarea diacriticelor.
  */
  const cityListings = (listings || []).filter(
    (listing) =>
      normalizeCity(listing.city) ===
      normalizedRequestedCity
  );

  /*
    Pentru titlu folosim numele real din baza de date.

    De exemplu:
    URL: /chirii/timisoara
    DB:  Timișoara
    Titlu: "Chirii în Timișoara"
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

      {/* CONTENT */}

      <section
        style={{
          maxWidth: "1180px",
          margin: "0 auto",
          padding: "55px 24px 90px",
        }}
      >
        {/* TITLU */}

        <div
          style={{
            marginBottom: "35px",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              background: "#EFF6FF",
              color: "#3B82F6",
              borderRadius: "100px",
              padding: "7px 12px",
              fontSize: "12px",
              fontWeight: "800",
              marginBottom: "15px",
            }}
          >
            Chirii pentru studenți
          </div>

          <h1
            style={{
              margin: 0,
              color: "#172554",
              fontSize: "38px",
              lineHeight: "1.15",
              letterSpacing: "-1.4px",
              fontWeight: "800",
            }}
          >
            Chirii în {cityName}
          </h1>

          <p
            style={{
              margin: "12px 0 0",
              color: "#64748B",
              fontSize: "15px",
              lineHeight: "1.6",
              maxWidth: "650px",
            }}
          >
            Descoperă toate locuințele disponibile pentru
            închiriere în {cityName}, indiferent de
            universitatea la care studiezi.
          </p>
        </div>

        {/* NUMĂR REZULTATE */}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
          }}
        >
          <div
            style={{
              color: "#64748B",
              fontSize: "14px",
              fontWeight: "600",
            }}
          >
            {cityListings.length === 1
              ? "1 proprietate disponibilă"
              : `${cityListings.length} proprietăți disponibile`}
          </div>
        </div>

        {/* FĂRĂ REZULTATE */}

        {cityListings.length === 0 && (
          <div
            style={{
              background: "#FFFFFF",
              border: "1px solid #E2E8F0",
              borderRadius: "18px",
              padding: "55px 30px",
              textAlign: "center",
              boxShadow:
                "0 8px 30px rgba(15, 23, 42, 0.04)",
            }}
          >
            <div
              style={{
                color: "#172554",
                fontSize: "20px",
                fontWeight: "800",
              }}
            >
              Momentan nu există chirii în {cityName}
            </div>

            <p
              style={{
                color: "#64748B",
                fontSize: "14px",
                margin: "10px auto 0",
                lineHeight: "1.6",
              }}
            >
              Încearcă din nou mai târziu sau caută
              într-un alt oraș.
            </p>
          </div>
        )}

        {/* GRID ANUNȚURI */}

        {cityListings.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fill, minmax(290px, 1fr))",
              gap: "22px",
            }}
          >
            {cityListings.map((listing) => (
              <a
                key={listing.id}
                href={`/proprietate/${listing.id}`}
                style={{
                  display: "block",
                  background: "#FFFFFF",
                  border: "1px solid #E2E8F0",
                  borderRadius: "18px",
                  overflow: "hidden",
                  textDecoration: "none",
                  color: "inherit",
                  boxShadow:
                    "0 8px 30px rgba(15, 23, 42, 0.05)",
                }}
              >
                {/* IMAGINE */}

                <div
                  style={{
                    height: "205px",
                    background: "#EFF6FF",
                    overflow: "hidden",
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
                        fontSize: "13px",
                        fontWeight: "600",
                      }}
                    >
                      Fără fotografie
                    </div>
                  )}
                </div>

                {/* INFORMAȚII */}

                <div
                  style={{
                    padding: "19px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: "15px",
                    }}
                  >
                    <h2
                      style={{
                        margin: 0,
                        color: "#0F172A",
                        fontSize: "17px",
                        lineHeight: "1.35",
                        fontWeight: "800",
                      }}
                    >
                      {listing.title}
                    </h2>

                    <div
                      style={{
                        color: "#172554",
                        fontSize: "18px",
                        fontWeight: "800",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {Number(
                        listing.price_monthly
                      ).toLocaleString("ro-RO")}
                      €
                    </div>
                  </div>

                  <div
                    style={{
                      color: "#64748B",
                      fontSize: "12px",
                      marginTop: "7px",
                      lineHeight: "1.5",
                    }}
                  >
                    {listing.city}

                    {listing.address
                      ? ` · ${listing.address}`
                      : ""}
                  </div>

                  {/* DETALII */}

                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      alignItems: "center",
                      gap: "8px",
                      marginTop: "15px",
                    }}
                  >
                    {listing.rooms && (
                      <span style={detailBadge}>
                        {listing.rooms} camere
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
                  </div>

                  <div
                    style={{
                      borderTop: "1px solid #F1F5F9",
                      marginTop: "17px",
                      paddingTop: "15px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <span
                      style={{
                        color: "#64748B",
                        fontSize: "11px",
                        fontWeight: "600",
                      }}
                    >
                      {listing.price_monthly
                        ? "Preț lunar"
                        : ""}
                    </span>

                    <span
                      style={{
                        color: "#3B82F6",
                        fontSize: "12px",
                        fontWeight: "800",
                      }}
                    >
                      Vezi proprietatea →
                    </span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

const detailBadge = {
  background: "#F8FAFC",
  border: "1px solid #E2E8F0",
  color: "#475569",
  borderRadius: "100px",
  padding: "5px 9px",
  fontSize: "11px",
  fontWeight: "700",
};
