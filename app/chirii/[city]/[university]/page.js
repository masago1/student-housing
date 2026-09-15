import { supabase } from "../../../lib/supabase";

export const dynamic = "force-dynamic";

export default async function ListingsPage({ params }) {
  const { city, university: universitySlug } = await params;

  // Găsim universitatea selectată
  const { data: university, error: universityError } =
    await supabase
      .from("universities")
      .select("*")
      .ilike("short_name", universitySlug)
      .single();

  if (universityError || !university) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#f7f8fa",
          color: "#111827",
        }}
      >
        <header
          style={{
            height: "72px",
            background: "#ffffff",
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 7%",
          }}
        >
          <a
            href="/"
            style={{
              color: "#111827",
              textDecoration: "none",
              fontSize: "25px",
              fontWeight: "800",
              letterSpacing: "-1px",
            }}
          >
            StudentHousing
          </a>
        </header>

        <section
          style={{
            maxWidth: "1180px",
            margin: "0 auto",
            padding: "80px 30px",
          }}
        >
          <h1
            style={{
              fontSize: "38px",
              margin: 0,
            }}
          >
            Universitatea nu a fost găsită
          </h1>

          <p
            style={{
              color: "#6b7280",
              fontSize: "17px",
              marginTop: "15px",
            }}
          >
            Verifică universitatea selectată și încearcă din nou.
          </p>

          <a
            href="/"
            style={{
              display: "inline-block",
              marginTop: "20px",
              color: "#2563eb",
              fontWeight: "700",
              textDecoration: "none",
            }}
          >
            Înapoi la căutare
          </a>
        </section>
      </main>
    );
  }

  // Luăm toate chiriile asociate universității
  const { data: listingLinks, error: listingsError } =
    await supabase
      .from("listing_universities")
      .select(`
        distance_meters,
        walking_minutes,
        listings (
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
          image_url
        )
      `)
      .eq("university_id", university.id)
      .order("walking_minutes", { ascending: true });

  const listings = (listingLinks || [])
    .filter((item) => item.listings)
    .map((item) => ({
      ...item.listings,
      distance_meters: item.distance_meters,
      walking_minutes: item.walking_minutes,
    }));

  return (
    <main
      style={{
        margin: 0,
        minHeight: "100vh",
        background: "#f7f8fa",
        color: "#111827",
      }}
    >
      {/* HEADER */}
      <header
        style={{
          height: "72px",
          background: "#ffffff",
          borderBottom: "1px solid #e5e7eb",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 7%",
        }}
      >
        <a
          href="/"
          style={{
            color: "#111827",
            textDecoration: "none",
            fontSize: "25px",
            fontWeight: "800",
            letterSpacing: "-1px",
          }}
        >
          StudentHousing
        </a>

        <a
          href="/"
          style={{
            color: "#374151",
            textDecoration: "none",
            fontSize: "14px",
            fontWeight: "700",
          }}
        >
          Schimbă căutarea
        </a>
      </header>

      {/* CONTENT */}
      <section
        style={{
          maxWidth: "1180px",
          margin: "0 auto",
          padding: "55px 30px 90px",
        }}
      >
        <div
          style={{
            marginBottom: "40px",
          }}
        >
          <div
            style={{
              color: "#2563eb",
              fontSize: "14px",
              fontWeight: "700",
              marginBottom: "12px",
            }}
          >
            {university.city}
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: "42px",
              lineHeight: "1.15",
              letterSpacing: "-1.5px",
              fontWeight: "800",
            }}
          >
            Chirii aproape de {university.short_name || university.name}
          </h1>

          <p
            style={{
              color: "#6b7280",
              fontSize: "17px",
              lineHeight: "1.6",
              marginTop: "14px",
              maxWidth: "750px",
            }}
          >
            {university.name}
          </p>

          <div
            style={{
              marginTop: "22px",
              fontSize: "14px",
              fontWeight: "700",
              color: "#374151",
            }}
          >
            {listings.length === 1
              ? "1 proprietate disponibilă"
              : `${listings.length} proprietăți disponibile`}
          </div>
        </div>

        {listingsError && (
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #fecaca",
              borderRadius: "14px",
              padding: "20px",
              color: "#b91c1c",
            }}
          >
            Nu am putut încărca proprietățile.
          </div>
        )}

        {!listingsError && listings.length === 0 && (
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: "18px",
              padding: "55px 35px",
              textAlign: "center",
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: "24px",
                fontWeight: "800",
              }}
            >
              Momentan nu sunt chirii disponibile aici
            </h2>

            <p
              style={{
                color: "#6b7280",
                margin: "12px auto 0",
                maxWidth: "500px",
                lineHeight: "1.6",
              }}
            >
              Proprietățile noi care sunt adăugate în apropierea acestei
              universități vor apărea aici.
            </p>
          </div>
        )}

        {/* LISTINGS */}
        {!listingsError && listings.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fill, minmax(300px, 1fr))",
              gap: "22px",
            }}
          >
            {listings.map((listing) => (
              <a
                key={listing.id}
                href={`/proprietate/${listing.id}`}
                style={{
                  display: "block",
                  background: "#ffffff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "18px",
                  overflow: "hidden",
                  textDecoration: "none",
                  color: "#111827",
                  cursor: "pointer",
                  boxShadow: "0 4px 15px rgba(0,0,0,0.03)",
                  transition:
                    "transform 150ms ease, box-shadow 150ms ease",
                }}
              >
                {/* IMAGINE */}
                <div
                  style={{
                    height: "210px",
                    background: "#e5e7eb",
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
                        color: "#9ca3af",
                        fontSize: "14px",
                        fontWeight: "600",
                      }}
                    >
                      Fotografie indisponibilă
                    </div>
                  )}
                </div>

                {/* INFORMAȚII */}
                <div
                  style={{
                    padding: "20px",
                  }}
                >
                  {listing.walking_minutes && (
                    <div
                      style={{
                        display: "inline-block",
                        background: "#eff6ff",
                        color: "#2563eb",
                        borderRadius: "100px",
                        padding: "6px 10px",
                        fontSize: "12px",
                        fontWeight: "800",
                        marginBottom: "13px",
                      }}
                    >
                      {listing.walking_minutes} min pe jos
                    </div>
                  )}

                  <h2
                    style={{
                      margin: 0,
                      fontSize: "19px",
                      lineHeight: "1.35",
                      fontWeight: "800",
                    }}
                  >
                    {listing.title}
                  </h2>

                  {listing.address && (
                    <div
                      style={{
                        marginTop: "9px",
                        color: "#6b7280",
                        fontSize: "14px",
                        lineHeight: "1.5",
                      }}
                    >
                      {listing.address}
                    </div>
                  )}

                  <div
                    style={{
                      display: "flex",
                      gap: "14px",
                      flexWrap: "wrap",
                      marginTop: "15px",
                      color: "#4b5563",
                      fontSize: "13px",
                      fontWeight: "600",
                    }}
                  >
                    {listing.rooms && (
                      <span>
                        {listing.rooms}{" "}
                        {listing.rooms === 1 ? "cameră" : "camere"}
                      </span>
                    )}

                    {listing.surface_m2 && (
                      <span>{listing.surface_m2} m²</span>
                    )}

                    {listing.distance_meters && (
                      <span>{listing.distance_meters} m</span>
                    )}
                  </div>

                  {/* PREȚ */}
                  <div
                    style={{
                      marginTop: "20px",
                      paddingTop: "18px",
                      borderTop: "1px solid #f3f4f6",
                      fontSize: "23px",
                      fontWeight: "800",
                    }}
                  >
                    {Number(listing.price_monthly).toLocaleString("ro-RO")} €

                    <span
                      style={{
                        fontSize: "13px",
                        fontWeight: "600",
                        color: "#6b7280",
                      }}
                    >
                      {" "}
                      / lună
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
