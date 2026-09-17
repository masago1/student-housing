import { supabase } from "../../lib/supabase";
import MessageOwnerButton from "../../components/MessageOwnerButton";
import PhoneRevealButton from "../../components/PhoneRevealButton";
import PropertyGallery from "../../components/PropertyGallery";

export const dynamic = "force-dynamic";

export default async function PropertyPage({ params }) {
  const { id } = await params;

  // Luăm proprietatea
  const { data: listing, error: listingError } = await supabase
    .from("listings")
    .select("*")
    .eq("id", id)
    .single();

  if (listingError || !listing) {
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
            Proprietatea nu a fost găsită
          </h1>

          <p
            style={{
              color: "#6b7280",
              fontSize: "17px",
              marginTop: "15px",
            }}
          >
            Este posibil ca anunțul să nu mai fie disponibil.
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

  // Luăm imaginile proprietății
  const { data: images } = await supabase
    .from("listing_images")
    .select("*")
    .eq("listing_id", id);

  // Luăm universitățile asociate
  const { data: universityLinks } = await supabase
    .from("listing_universities")
    .select(`
      distance_meters,
      walking_minutes,
      universities (
        id,
        name,
        short_name,
        city
      )
    `)
    .eq("listing_id", id)
    .order("walking_minutes", { ascending: true });

  const universities = (universityLinks || [])
    .filter((item) => item.universities)
    .map((item) => ({
      ...item.universities,
      distance_meters: item.distance_meters,
      walking_minutes: item.walking_minutes,
    }));

  // Construim lista completă de imagini
  const allImages = [];

  if (listing.image_url) {
    allImages.push(listing.image_url);
  }

  (images || []).forEach((image) => {
    const imageUrl =
      image.image_url ||
      image.url ||
      image.public_url;

    if (imageUrl && !allImages.includes(imageUrl)) {
      allImages.push(imageUrl);
    }
  });

  // Luăm numele și telefonul actual din profil
  const { data: ownerProfile, error: ownerProfileError } =
    await supabase
      .from("profiles")
      .select("name, phone")
      .eq("id", listing.user_id)
      .maybeSingle();

  if (ownerProfileError) {
    console.error(
      "Eroare încărcare profil utilizator:",
      ownerProfileError
    );
  }

  const ownerName =
    ownerProfile?.name?.trim() ||
    listing.owner_name?.trim() ||
    "";

  const ownerPhone =
    ownerProfile?.phone?.trim() ||
    listing.owner_phone?.trim() ||
    "";

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
          Înapoi la căutare
        </a>
      </header>

      <section
        style={{
          maxWidth: "1180px",
          margin: "0 auto",
          padding: "38px 30px 90px",
        }}
      >
        {/* GALERIE NOUĂ */}
        <PropertyGallery
          images={allImages}
          title={listing.title}
        />

        {/* CONȚINUT */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) 350px",
            gap: "45px",
            marginTop: "36px",
            alignItems: "start",
          }}
        >
          <div>
            <div
              style={{
                color: "#2563eb",
                fontSize: "14px",
                fontWeight: "800",
                marginBottom: "10px",
              }}
            >
              {listing.city}
            </div>

            <h1
              style={{
                margin: 0,
                fontSize: "38px",
                lineHeight: "1.15",
                letterSpacing: "-1px",
              }}
            >
              {listing.title}
            </h1>

            {listing.address && (
              <p
                style={{
                  marginTop: "12px",
                  color: "#6b7280",
                  fontSize: "16px",
                }}
              >
                {listing.address}
              </p>
            )}

            {/* DETALII */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "12px",
                marginTop: "25px",
              }}
            >
              {listing.rooms && (
                <DetailBox>
                  {listing.rooms} camere
                </DetailBox>
              )}

              {listing.bedrooms && (
                <DetailBox>
                  {listing.bedrooms} dormitoare
                </DetailBox>
              )}

              {listing.bathrooms && (
                <DetailBox>
                  {listing.bathrooms} băi
                </DetailBox>
              )}

              {listing.surface_m2 && (
                <DetailBox>
                  {listing.surface_m2} m²
                </DetailBox>
              )}

              {listing.furnished !== null &&
                listing.furnished !== undefined && (
                  <DetailBox>
                    {listing.furnished
                      ? "Mobilat"
                      : "Nemobilat"}
                  </DetailBox>
                )}
            </div>

            {/* DESCRIERE */}
            {listing.description && (
              <div
                style={{
                  marginTop: "40px",
                  paddingTop: "35px",
                  borderTop: "1px solid #e5e7eb",
                }}
              >
                <h2
                  style={{
                    margin: 0,
                    fontSize: "23px",
                  }}
                >
                  Despre proprietate
                </h2>

                <p
                  style={{
                    marginTop: "15px",
                    color: "#4b5563",
                    fontSize: "16px",
                    lineHeight: "1.8",
                    whiteSpace: "pre-line",
                  }}
                >
                  {listing.description}
                </p>
              </div>
            )}

            {/* UNIVERSITĂȚI */}
            <div
              style={{
                marginTop: "40px",
                paddingTop: "35px",
                borderTop: "1px solid #e5e7eb",
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontSize: "23px",
                }}
              >
                Universități în apropiere
              </h2>

              {universities.length > 0 ? (
                <div
                  style={{
                    display: "grid",
                    gap: "12px",
                    marginTop: "18px",
                  }}
                >
                  {universities.map((university) => (
                    <div
                      key={university.id}
                      style={{
                        background: "#ffffff",
                        border: "1px solid #e5e7eb",
                        borderRadius: "14px",
                        padding: "17px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: "20px",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontWeight: "800",
                            fontSize: "15px",
                          }}
                        >
                          {university.short_name ||
                            university.name}
                        </div>

                        {university.short_name && (
                          <div
                            style={{
                              color: "#6b7280",
                              fontSize: "13px",
                              marginTop: "4px",
                            }}
                          >
                            {university.name}
                          </div>
                        )}
                      </div>

                      <div
                        style={{
                          textAlign: "right",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {university.walking_minutes && (
                          <div
                            style={{
                              color: "#2563eb",
                              fontWeight: "800",
                              fontSize: "14px",
                            }}
                          >
                            {university.walking_minutes} min pe jos
                          </div>
                        )}

                        {university.distance_meters && (
                          <div
                            style={{
                              color: "#6b7280",
                              fontSize: "12px",
                              marginTop: "3px",
                            }}
                          >
                            {university.distance_meters} m
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p
                  style={{
                    color: "#6b7280",
                    marginTop: "15px",
                  }}
                >
                  Nu există informații despre universitățile din apropiere.
                </p>
              )}
            </div>
          </div>

          {/* CARD DREAPTA */}
          <aside
            style={{
              background: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: "18px",
              padding: "25px",
              position: "sticky",
              top: "25px",
              boxShadow:
                "0 10px 30px rgba(0,0,0,0.05)",
            }}
          >
            {/* PREȚ */}
            <div
              style={{
                fontSize: "32px",
                fontWeight: "800",
              }}
            >
              {Number(
                listing.price_monthly
              ).toLocaleString("ro-RO")}{" "}
              €

              <span
                style={{
                  color: "#6b7280",
                  fontSize: "14px",
                  fontWeight: "600",
                }}
              >
                {" "}
                / lună
              </span>
            </div>

            {/* DISPONIBILITATE */}
            {listing.available_from && (
              <div
                style={{
                  marginTop: "17px",
                  color: "#4b5563",
                  fontSize: "14px",
                  lineHeight: "1.5",
                }}
              >
                Disponibil din{" "}
                <strong>
                  {new Date(
                    listing.available_from
                  ).toLocaleDateString("ro-RO")}
                </strong>
              </div>
            )}

            {/* NUMELE CONTULUI */}
            {ownerName && (
              <div
                style={{
                  marginTop: "22px",
                  paddingTop: "20px",
                  borderTop: "1px solid #e5e7eb",
                  marginBottom: "0px",
                }}
              >
                <div
                  style={{
                    fontSize: "17px",
                    fontWeight: "800",
                    color: "#172554",
                    lineHeight: "1.3",
                  }}
                >
                  {ownerName}
                </div>
              </div>
            )}

            {/* MESAJ */}
            <MessageOwnerButton
              listingId={listing.id}
              ownerId={listing.user_id}
            />

            {/* TELEFON */}
            <PhoneRevealButton phone={ownerPhone} />
          </aside>
        </div>
      </section>
    </main>
  );
}

function DetailBox({ children }) {
  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: "10px",
        padding: "10px 14px",
        color: "#374151",
        fontSize: "14px",
        fontWeight: "700",
      }}
    >
      {children}
    </div>
  );
}
