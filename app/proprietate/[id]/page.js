import { supabase } from "../../lib/supabase";
import MessageOwnerButton from "../../components/MessageOwnerButton";
import PhoneRevealButton from "../../components/PhoneRevealButton";
import PropertyGallery from "../../components/PropertyGallery";
import BackToSearch from "../../components/BackToSearch";
import ApproximateLocationMap from "../../components/ApproximateLocationMap";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
    const { id } = await params;

    const { data: listing } = await supabase
        .from("listings")
        .select(
            "title, city, address, property_type, rooms, surface_m2, price_monthly, image_url"
        )
        .eq("id", id)
        .maybeSingle();

    if (!listing) {
        return {
            title: "Proprietate | shaus",
            description:
                "Vezi proprietăți de închiriat pe shaus.",
            robots: {
                index: false,
                follow: true,
            },
        };
    }

    const propertyTypeLabels = {
        apartment: "Apartament",
        studio: "Garsonieră",
        room: "Cameră",
        house: "Casă",
        apartament: "Apartament",
        garsoniera: "Garsonieră",
        camera: "Cameră",
        casa: "Casă",
    };

    const propertyType =
        propertyTypeLabels[listing.property_type] ||
        listing.property_type ||
        "Proprietate";

    const city = listing.city?.trim() || "";

    const titleParts = [
        propertyType,
        listing.rooms
            ? `${listing.rooms} camere`
            : null,
        city
            ? `de închiriat în ${city}`
            : "de închiriat",
    ].filter(Boolean);

    const title = `${titleParts.join(" ")} | shaus`;

    const descriptionParts = [
        propertyType,
        city
            ? `de închiriat în ${city}`
            : "de închiriat",
        listing.surface_m2
            ? `${listing.surface_m2} m²`
            : null,
        listing.price_monthly
            ? `${Number(
                  listing.price_monthly
              ).toLocaleString("ro-RO")} € / lună`
            : null,
        "Vezi fotografii, detalii și informații despre proprietate pe shaus.",
    ].filter(Boolean);

    const description =
        descriptionParts.join(". ") + ".";

    return {
        title,
        description,

        alternates: {
            canonical: `/proprietate/${id}`,
        },

        keywords: [
            propertyType,
            city
                ? `${propertyType.toLowerCase()} ${city}`
                : null,
            city
                ? `chirie ${city}`
                : null,
            city
                ? `apartamente de închiriat ${city}`
                : null,
            city
                ? `garsoniere de închiriat ${city}`
                : null,
            "chirii studenți",
            "chirii pentru studenți",
            "cazare studenți",
            "shaus",
        ].filter(Boolean),

        openGraph: {
            type: "website",
            locale: "ro_RO",
            siteName: "shaus",
            title,
            description,
            url: `https://shaus.ro/proprietate/${id}`,
            images: listing.image_url
                ? [
                      {
                          url: listing.image_url,
                          width: 1200,
                          height: 630,
                          alt:
                              listing.title ||
                              `${propertyType} de închiriat`,
                      },
                  ]
                : undefined,
        },

        twitter: {
            card: "summary_large_image",
            title,
            description,
            images: listing.image_url
                ? [listing.image_url]
                : undefined,
        },

        robots: {
            index: true,
            follow: true,
        },
    };
}

export default async function PropertyPage({ params }) {
    const { id } = await params;

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
                        shaus
                    </a>
                </header>

                <section
                    style={{
                        maxWidth: "1100px",
                        margin: "0 auto",
                        padding: "70px 30px",
                    }}
                >
                    <h1
                        style={{
                            fontSize: "32px",
                            marginBottom: "12px",
                        }}
                    >
                        Proprietatea nu a fost găsită
                    </h1>

                    <p
                        style={{
                            color: "#6b7280",
                            marginBottom: "24px",
                        }}
                    >
                        Anunțul nu există sau nu mai este disponibil.
                    </p>

                    <a
                        href="/"
                        style={{
                            color: "#2563eb",
                            textDecoration: "none",
                            fontWeight: "700",
                        }}
                    >
                        ← Înapoi la pagina principală
                    </a>
                </section>
            </main>
        );
    }

    const { data: images } = await supabase
        .from("listing_images")
        .select("*")
        .eq("listing_id", id);

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
        .map((link) => ({
            ...link.universities,
            distance_meters: link.distance_meters,
            walking_minutes: link.walking_minutes,
        }))
        .filter((university) => university?.id);

    const imageUrls = [];

    if (listing.image_url) {
        imageUrls.push(listing.image_url);
    }

    for (const image of images || []) {
        const url =
            image.image_url ||
            image.url ||
            image.public_url ||
            null;

        if (url) {
            imageUrls.push(url);
        }
    }

    const allImages = [...new Set(imageUrls)];

    const { data: ownerProfile, error: ownerProfileError } =
        await supabase
            .from("profiles")
            .select("name, phone")
            .eq("id", listing.user_id)
            .maybeSingle();

    if (ownerProfileError) {
        console.error(
            "Eroare la încărcarea profilului proprietarului:",
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

    const propertyTypeLabels = {
        apartment: "Apartament",
        studio: "Garsonieră",
        room: "Cameră",
        house: "Casă",
        apartament: "Apartament",
        garsoniera: "Garsonieră",
        camera: "Cameră",
        casa: "Casă",
    };

    const propertyType =
        propertyTypeLabels[listing.property_type] ||
        listing.property_type ||
        null;

    const hasValue = (value) => {
        return (
            value !== null &&
            value !== undefined &&
            String(value).trim() !== ""
        );
    };

    const formatMoney = (value) => {
        if (!hasValue(value)) {
            return null;
        }

        return Number(value).toLocaleString("ro-RO");
    };

    const formatDate = (date) => {
        if (!date) return null;

        return new Intl.DateTimeFormat("ro-RO", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        }).format(new Date(`${date}T00:00:00`));
    };

    const hasBuildingDetails =
        hasValue(listing.construction_year) ||
        hasValue(listing.heating_type) ||
        hasValue(listing.total_floors);

    const hasRentalConditions =
        hasValue(listing.max_tenants) ||
        listing.pets_allowed !== null ||
        listing.smoking_allowed !== null ||
        listing.utilities_included !== null ||
        hasValue(listing.deposit_amount);

    const hasLocation =
        hasValue(listing.latitude) &&
        hasValue(listing.longitude) &&
        Number.isFinite(Number(listing.latitude)) &&
        Number.isFinite(Number(listing.longitude));

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
                    shaus
                </a>
            </header>

            <section
                style={{
                    maxWidth: "1180px",
                    margin: "0 auto",
                    padding: "35px 30px 100px",
                }}
            >
                <div style={{ marginBottom: "25px" }}>
                    <BackToSearch city={listing.city} />
                </div>

                <PropertyGallery
                    images={allImages}
                    title={listing.title}
                />

                <div
                    className="property-content-grid"
                    style={{
                        display: "grid",
                        gridTemplateColumns: "minmax(0, 1fr) 350px",
                        gap: "45px",
                        marginTop: "36px",
                        alignItems: "start",
                    }}
                >
                    {/* COLOANA STÂNGA */}

                    <div style={{ minWidth: 0 }}>
                        {listing.city && (
                            <div
                                style={{
                                    color: "#2563eb",
                                    fontSize: "14px",
                                    fontWeight: "800",
                                    marginBottom: "8px",
                                }}
                            >
                                {listing.city}
                            </div>
                        )}

                        <h1
                            style={{
                                margin: 0,
                                color: "#111827",
                                fontSize: "36px",
                                lineHeight: "1.15",
                                fontWeight: "800",
                                letterSpacing: "-1px",
                            }}
                        >
                            {listing.title}
                        </h1>

                        {listing.address && (
                            <div
                                style={{
                                    marginTop: "13px",
                                    color: "#6b7280",
                                    fontSize: "15px",
                                    lineHeight: "1.5",
                                }}
                            >
                                {listing.address}
                            </div>
                        )}

                        {/* DESCRIERE */}

                        {listing.description && (
                            <div
                                style={{
                                    marginTop: "34px",
                                    paddingTop: "30px",
                                    borderTop: "1px solid #e5e7eb",
                                }}
                            >
                                <h2
                                    style={{
                                        margin: "0 0 15px",
                                        fontSize: "22px",
                                        fontWeight: "800",
                                        color: "#111827",
                                    }}
                                >
                                    Despre proprietate
                                </h2>

                                <p
                                    style={{
                                        margin: 0,
                                        color: "#4b5563",
                                        fontSize: "15px",
                                        lineHeight: "1.8",
                                        whiteSpace: "pre-line",
                                    }}
                                >
                                    {listing.description}
                                </p>
                            </div>
                        )}

                        {/* DETALII PROPRIETATE */}

                        <div
                            style={{
                                marginTop: "34px",
                                paddingTop: "30px",
                                borderTop: "1px solid #e5e7eb",
                            }}
                        >
                            <h2
                                style={{
                                    margin: "0 0 20px",
                                    fontSize: "22px",
                                    fontWeight: "800",
                                    color: "#111827",
                                }}
                            >
                                Detalii proprietate
                            </h2>

                            <div
                                className="details-grid"
                                style={{
                                    display: "grid",
                                    gridTemplateColumns:
                                        "repeat(2, minmax(0, 1fr))",
                                    gap: "12px",
                                }}
                            >
                                {propertyType && (
                                    <DetailRow
                                        label="Tip proprietate"
                                        value={propertyType}
                                    />
                                )}

                                {hasValue(listing.rooms) && (
                                    <DetailRow
                                        label="Număr camere"
                                        value={listing.rooms}
                                    />
                                )}

                                {hasValue(listing.bedrooms) && (
                                    <DetailRow
                                        label="Dormitoare"
                                        value={listing.bedrooms}
                                    />
                                )}

                                {hasValue(listing.bathrooms) && (
                                    <DetailRow
                                        label="Băi"
                                        value={listing.bathrooms}
                                    />
                                )}

                                {hasValue(listing.surface_m2) && (
                                    <DetailRow
                                        label="Suprafață"
                                        value={`${listing.surface_m2} m²`}
                                    />
                                )}

                                {hasValue(listing.floor) && (
                                    <DetailRow
                                        label="Etaj"
                                        value={
                                            hasValue(listing.total_floors)
                                                ? `${listing.floor} / ${listing.total_floors}`
                                                : listing.floor
                                        }
                                    />
                                )}

                                {listing.furnished !== null &&
                                    listing.furnished !== undefined && (
                                        <DetailRow
                                            label="Mobilat"
                                            value={
                                                listing.furnished
                                                    ? "Da"
                                                    : "Nu"
                                            }
                                        />
                                    )}

                                {listing.air_conditioning !== null &&
                                    listing.air_conditioning !== undefined && (
                                        <DetailRow
                                            label="Aer condiționat"
                                            value={
                                                listing.air_conditioning
                                                    ? "Da"
                                                    : "Nu"
                                            }
                                        />
                                    )}

                                {listing.balcony !== null &&
                                    listing.balcony !== undefined && (
                                        <DetailRow
                                            label="Balcon"
                                            value={
                                                listing.balcony
                                                    ? "Da"
                                                    : "Nu"
                                            }
                                        />
                                    )}

                                {listing.parking !== null &&
                                    listing.parking !== undefined && (
                                        <DetailRow
                                            label="Parcare"
                                            value={
                                                listing.parking
                                                    ? "Da"
                                                    : "Nu"
                                            }
                                        />
                                    )}
                            </div>
                        </div>

                        {/* CLĂDIRE */}

                        {hasBuildingDetails && (
                            <div
                                style={{
                                    marginTop: "34px",
                                    paddingTop: "30px",
                                    borderTop: "1px solid #e5e7eb",
                                }}
                            >
                                <h2
                                    style={{
                                        margin: "0 0 20px",
                                        fontSize: "22px",
                                        fontWeight: "800",
                                        color: "#111827",
                                    }}
                                >
                                    Clădire
                                </h2>

                                <div
                                    className="details-grid"
                                    style={{
                                        display: "grid",
                                        gridTemplateColumns:
                                            "repeat(2, minmax(0, 1fr))",
                                        gap: "12px",
                                    }}
                                >
                                    {hasValue(listing.construction_year) && (
                                        <DetailRow
                                            label="An construcție"
                                            value={listing.construction_year}
                                        />
                                    )}

                                    {hasValue(listing.heating_type) && (
                                        <DetailRow
                                            label="Tip încălzire"
                                            value={listing.heating_type}
                                        />
                                    )}

                                    {hasValue(listing.total_floors) && (
                                        <DetailRow
                                            label="Număr total de etaje"
                                            value={listing.total_floors}
                                        />
                                    )}
                                </div>
                            </div>
                        )}
                        {/* CONDIȚII DE ÎNCHIRIERE */}

                        {hasRentalConditions && (
                            <div
                                style={{
                                    marginTop: "34px",
                                    paddingTop: "30px",
                                    borderTop: "1px solid #e5e7eb",
                                }}
                            >
                                <h2
                                    style={{
                                        margin: "0 0 20px",
                                        fontSize: "22px",
                                        fontWeight: "800",
                                        color: "#111827",
                                    }}
                                >
                                    Condiții de închiriere
                                </h2>

                                <div
                                    className="details-grid"
                                    style={{
                                        display: "grid",
                                        gridTemplateColumns:
                                            "repeat(2, minmax(0, 1fr))",
                                        gap: "12px",
                                    }}
                                >
                                    {hasValue(listing.max_tenants) && (
                                        <DetailRow
                                            label="Număr maxim de chiriași"
                                            value={listing.max_tenants}
                                        />
                                    )}

                                    {listing.pets_allowed !== null &&
                                        listing.pets_allowed !== undefined && (
                                            <DetailRow
                                                label="Animale de companie"
                                                value={
                                                    listing.pets_allowed
                                                        ? "Acceptate"
                                                        : "Nu sunt acceptate"
                                                }
                                            />
                                        )}

                                    {listing.smoking_allowed !== null &&
                                        listing.smoking_allowed !== undefined && (
                                            <DetailRow
                                                label="Fumat"
                                                value={
                                                    listing.smoking_allowed
                                                        ? "Permis"
                                                        : "Nu este permis"
                                                }
                                            />
                                        )}

                                    {listing.utilities_included !== null &&
                                        listing.utilities_included !== undefined && (
                                            <DetailRow
                                                label="Utilități incluse"
                                                value={
                                                    listing.utilities_included
                                                        ? "Da"
                                                        : "Nu"
                                                }
                                            />
                                        )}

                                    {hasValue(listing.deposit_amount) && (
                                        <DetailRow
                                            label="Garanție"
                                            value={`${formatMoney(
                                                listing.deposit_amount
                                            )} €`}
                                        />
                                    )}
                                </div>
                            </div>
                        )}

                        {/* LOCAȚIE APROXIMATIVĂ */}

                        {hasLocation && (
                            <div
                                style={{
                                    marginTop: "34px",
                                    paddingTop: "30px",
                                    borderTop: "1px solid #e5e7eb",
                                }}
                            >
                                <h2
                                    style={{
                                        margin: "0 0 17px",
                                        fontSize: "22px",
                                        fontWeight: "800",
                                        color: "#111827",
                                    }}
                                >
                                    Locație
                                </h2>

                                {listing.address && (
                                    <div
                                        style={{
                                            marginBottom: "16px",
                                            color: "#4b5563",
                                            fontSize: "15px",
                                            lineHeight: "1.5",
                                        }}
                                    >
                                        {listing.address}
                                    </div>
                                )}

                                <ApproximateLocationMap
                                    latitude={listing.latitude}
                                    longitude={listing.longitude}
                                />
                            </div>
                        )}
                    </div>

                    {/* COLOANA DREAPTA STICKY */}

                    <div
                        className="property-sticky-column"
                        style={{
                            position: "sticky",
                            top: "25px",
                            display: "flex",
                            flexDirection: "column",
                            gap: "22px",
                            alignSelf: "start",
                        }}
                    >
                        {/* CARD CONTACT */}

                        <aside
                            style={{
                                background: "#ffffff",
                                border: "1px solid #e5e7eb",
                                borderRadius: "18px",
                                padding: "25px",
                                boxShadow:
                                    "0 12px 35px rgba(17,24,39,0.05)",
                            }}
                        >
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "baseline",
                                    gap: "7px",
                                }}
                            >
                                <div
                                    style={{
                                        color: "#111827",
                                        fontSize: "31px",
                                        fontWeight: "800",
                                        letterSpacing: "-0.7px",
                                    }}
                                >
                                    {formatMoney(listing.price_monthly)} €
                                </div>

                                <div
                                    style={{
                                        color: "#6b7280",
                                        fontSize: "13px",
                                        fontWeight: "600",
                                    }}
                                >
                                    / lună
                                </div>
                            </div>

                            {listing.available_from && (
                                <div
                                    style={{
                                        marginTop: "17px",
                                        color: "#6b7280",
                                        fontSize: "13px",
                                        lineHeight: "1.5",
                                    }}
                                >
                                    Disponibil din{" "}
                                    <strong
                                        style={{
                                            color: "#4b5563",
                                        }}
                                    >
                                        {formatDate(listing.available_from)}
                                    </strong>
                                </div>
                            )}

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

                            <MessageOwnerButton
                                listingId={listing.id}
                                ownerId={listing.user_id}
                            />

                            <PhoneRevealButton phone={ownerPhone} />
                        </aside>

                        {/* UNIVERSITĂȚI ÎN COLOANA DREAPTĂ */}

                        <div
                            style={{
                                background: "#ffffff",
                                border: "1px solid #e5e7eb",
                                borderRadius: "18px",
                                padding: "22px",
                                boxShadow:
                                    "0 12px 35px rgba(17,24,39,0.04)",
                            }}
                        >
                            <h2
                                style={{
                                    margin: "0 0 17px",
                                    fontSize: "19px",
                                    fontWeight: "800",
                                    color: "#111827",
                                }}
                            >
                                Universități în apropiere
                            </h2>

                            {universities.length === 0 ? (
                                <p
                                    style={{
                                        margin: 0,
                                        color: "#6b7280",
                                        fontSize: "14px",
                                        lineHeight: "1.6",
                                    }}
                                >
                                    Nu există informații despre universitățile
                                    din apropiere.
                                </p>
                            ) : (
                                <div
                                    style={{
                                        display: "grid",
                                        gap: "10px",
                                    }}
                                >
                                    {universities.map((university) => {
                                        const hasWalking =
                                            university.walking_minutes !==
                                                null &&
                                            university.walking_minutes !==
                                                undefined;

                                        const hasDistance =
                                            university.distance_meters !==
                                                null &&
                                            university.distance_meters !==
                                                undefined;

                                        let distanceText = null;

                                        if (hasDistance) {
                                            const meters = Number(
                                                university.distance_meters
                                            );

                                            distanceText =
                                                meters >= 1000
                                                    ? `${(
                                                          meters / 1000
                                                      ).toLocaleString(
                                                          "ro-RO",
                                                          {
                                                              maximumFractionDigits: 1,
                                                          }
                                                      )} km`
                                                    : `${Math.round(
                                                          meters
                                                      )} m`;
                                        }

                                        return (
                                            <div
                                                key={university.id}
                                                style={{
                                                    border:
                                                        "1px solid #e5e7eb",
                                                    borderRadius: "12px",
                                                    padding: "14px",
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        display: "flex",
                                                        alignItems:
                                                            "flex-start",
                                                        justifyContent:
                                                            "space-between",
                                                        gap: "12px",
                                                    }}
                                                >
                                                    <div
                                                        style={{
                                                            minWidth: 0,
                                                        }}
                                                    >
                                                        <div
                                                            style={{
                                                                fontSize:
                                                                    "14px",
                                                                fontWeight:
                                                                    "800",
                                                                color:
                                                                    "#111827",
                                                            }}
                                                        >
                                                            {university.short_name ||
                                                                university.name}
                                                        </div>

                                                        {university.short_name &&
                                                            university.name && (
                                                                <div
                                                                    style={{
                                                                        marginTop:
                                                                            "4px",
                                                                        color:
                                                                            "#6b7280",
                                                                        fontSize:
                                                                            "12px",
                                                                        lineHeight:
                                                                            "1.4",
                                                                    }}
                                                                >
                                                                    {
                                                                        university.name
                                                                    }
                                                                </div>
                                                            )}
                                                    </div>

                                                    {(hasWalking ||
                                                        hasDistance) && (
                                                        <div
                                                            style={{
                                                                flexShrink: 0,
                                                                textAlign:
                                                                    "right",
                                                                color:
                                                                    "#4b5563",
                                                                fontSize:
                                                                    "12px",
                                                                lineHeight:
                                                                    "1.5",
                                                            }}
                                                        >
                                                            {hasWalking && (
                                                                <div
                                                                    style={{
                                                                        fontWeight:
                                                                            "700",
                                                                    }}
                                                                >
                                                                    {
                                                                        university.walking_minutes
                                                                    }{" "}
                                                                    min pe jos
                                                                </div>
                                                            )}

                                                            {hasDistance && (
                                                                <div>
                                                                    {
                                                                        distanceText
                                                                    }
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            <style>{`
                @media (max-width: 900px) {
                    .property-content-grid {
                        grid-template-columns: 1fr !important;
                    }

                    .property-sticky-column {
                        position: static !important;
                    }
                }

                @media (max-width: 620px) {
                    .details-grid {
                        grid-template-columns: 1fr !important;
                    }
                }
            `}</style>
        </main>
    );
}

function DetailRow({ label, value }) {
    return (
        <div
            style={{
                background: "#ffffff",
                border: "1px solid #e5e7eb",
                borderRadius: "12px",
                padding: "15px 16px",
                minWidth: 0,
            }}
        >
            <div
                style={{
                    color: "#6b7280",
                    fontSize: "12px",
                    fontWeight: "700",
                    marginBottom: "6px",
                }}
            >
                {label}
            </div>

            <div
                style={{
                    color: "#111827",
                    fontSize: "14px",
                    fontWeight: "800",
                    lineHeight: "1.4",
                    overflowWrap: "break-word",
                }}
            >
                {value}
            </div>
        </div>
    );
}
