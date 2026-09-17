import { supabase } from "../../lib/supabase";
import MessageOwnerButton from "../../components/MessageOwnerButton";
import PhoneRevealButton from "../../components/PhoneRevealButton";
import PropertyGallery from "../../components/PropertyGallery";
import BackToSearch from "../../components/BackToSearch";

export const dynamic = "force-dynamic";

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
                        StudentHousing
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
    };

    const propertyType =
        propertyTypeLabels[listing.property_type] ||
        listing.property_type ||
        null;

    const formatMoney = (value) => {
        if (value === null || value === undefined || value === "") {
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

    const primaryDetails = [];

    if (listing.rooms !== null && listing.rooms !== undefined) {
        primaryDetails.push(
            `${listing.rooms} ${
                Number(listing.rooms) === 1 ? "cameră" : "camere"
            }`
        );
    }

    if (
        listing.bedrooms !== null &&
        listing.bedrooms !== undefined
    ) {
        primaryDetails.push(
            `${listing.bedrooms} ${
                Number(listing.bedrooms) === 1
                    ? "dormitor"
                    : "dormitoare"
            }`
        );
    }

    if (
        listing.bathrooms !== null &&
        listing.bathrooms !== undefined
    ) {
        primaryDetails.push(
            `${listing.bathrooms} ${
                Number(listing.bathrooms) === 1 ? "baie" : "băi"
            }`
        );
    }

    if (
        listing.surface_m2 !== null &&
        listing.surface_m2 !== undefined
    ) {
        primaryDetails.push(`${listing.surface_m2} m²`);
    }

    if (
        listing.floor !== null &&
        listing.floor !== undefined &&
        listing.total_floors !== null &&
        listing.total_floors !== undefined
    ) {
        primaryDetails.push(
            `Etaj ${listing.floor}/${listing.total_floors}`
        );
    } else if (
        listing.floor !== null &&
        listing.floor !== undefined
    ) {
        primaryDetails.push(`Etaj ${listing.floor}`);
    } else if (
        listing.total_floors !== null &&
        listing.total_floors !== undefined
    ) {
        primaryDetails.push(
            `${listing.total_floors} etaje`
        );
    }

    const facilities = [];

    if (listing.furnished === true) {
        facilities.push("Mobilat");
    }

    if (listing.air_conditioning === true) {
        facilities.push("Aer condiționat");
    }

    if (listing.balcony === true) {
        facilities.push("Balcon");
    }

    if (listing.parking === true) {
        facilities.push("Parcare");
    }

    const hasRentalConditions =
        listing.max_tenants !== null &&
            listing.max_tenants !== undefined ||
        listing.pets_allowed === true ||
        listing.smoking_allowed === true ||
        listing.utilities_included === true ||
        listing.deposit_amount !== null &&
            listing.deposit_amount !== undefined;

    const hasBuildingDetails =
        listing.construction_year !== null &&
            listing.construction_year !== undefined ||
        Boolean(listing.heating_type);

    const badgeStyle = {
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "36px",
        padding: "0 13px",
        border: "1px solid #e5e7eb",
        borderRadius: "10px",
        background: "#ffffff",
        color: "#111827",
        fontSize: "13px",
        fontWeight: "700",
        lineHeight: "1",
        whiteSpace: "nowrap",
    };

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
                    padding: "35px 30px 100px",
                }}
            >
                <div
                    style={{
                        marginBottom: "25px",
                    }}
                >
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
                        gridTemplateColumns:
                            "minmax(0, 1fr) 350px",
                        gap: "45px",
                        marginTop: "36px",
                        alignItems: "start",
                    }}
                >
                    <div
                        style={{
                            minWidth: 0,
                        }}
                    >
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

                        {/* DETALII PRINCIPALE */}

                        {primaryDetails.length > 0 && (
                            <div
                                style={{
                                    display: "flex",
                                    flexWrap: "wrap",
                                    gap: "10px",
                                    marginTop: "22px",
                                }}
                            >
                                {primaryDetails.map(
                                    (detail, index) => (
                                        <span
                                            key={`${detail}-${index}`}
                                            style={badgeStyle}
                                        >
                                            {detail}
                                        </span>
                                    )
                                )}
                            </div>
                        )}

                        {/* DOTĂRI */}

                        {facilities.length > 0 && (
                            <div
                                style={{
                                    display: "flex",
                                    flexWrap: "wrap",
                                    gap: "10px",
                                    marginTop: "10px",
                                }}
                            >
                                {facilities.map(
                                    (facility, index) => (
                                        <span
                                            key={`${facility}-${index}`}
                                            style={{
                                                ...badgeStyle,
                                                background: "#f8fafc",
                                            }}
                                        >
                                            {facility}
                                        </span>
                                    )
                                )}
                            </div>
                        )}

                        {/* DESPRE PROPRIETATE */}

                        {listing.description && (
                            <div
                                style={{
                                    marginTop: "34px",
                                    paddingTop: "30px",
                                    borderTop:
                                        "1px solid #e5e7eb",
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

                                {listing.rooms !== null &&
                                    listing.rooms !==
                                        undefined && (
                                        <DetailRow
                                            label="Camere"
                                            value={listing.rooms}
                                        />
                                    )}

                                {listing.bedrooms !== null &&
                                    listing.bedrooms !==
                                        undefined && (
                                        <DetailRow
                                            label="Dormitoare"
                                            value={
                                                listing.bedrooms
                                            }
                                        />
                                    )}

                                {listing.bathrooms !== null &&
                                    listing.bathrooms !==
                                        undefined && (
                                        <DetailRow
                                            label="Băi"
                                            value={
                                                listing.bathrooms
                                            }
                                        />
                                    )}

                                {listing.surface_m2 !== null &&
                                    listing.surface_m2 !==
                                        undefined && (
                                        <DetailRow
                                            label="Suprafață"
                                            value={`${listing.surface_m2} m²`}
                                        />
                                    )}

                                {listing.floor !== null &&
                                    listing.floor !==
                                        undefined && (
                                        <DetailRow
                                            label="Etaj"
                                            value={
                                                listing.total_floors !==
                                                    null &&
                                                listing.total_floors !==
                                                    undefined
                                                    ? `${listing.floor} / ${listing.total_floors}`
                                                    : listing.floor
                                            }
                                        />
                                    )}

                                {listing.furnished !== null &&
                                    listing.furnished !==
                                        undefined && (
                                        <DetailRow
                                            label="Mobilat"
                                            value={
                                                listing.furnished
                                                    ? "Da"
                                                    : "Nu"
                                            }
                                        />
                                    )}

                                {listing.air_conditioning !==
                                    null &&
                                    listing.air_conditioning !==
                                        undefined && (
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
                                    listing.balcony !==
                                        undefined && (
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
                                    listing.parking !==
                                        undefined && (
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
                                    {listing.construction_year !== null &&
                                        listing.construction_year !==
                                            undefined && (
                                            <DetailRow
                                                label="An construcție"
                                                value={
                                                    listing.construction_year
                                                }
                                            />
                                        )}

                                    {listing.heating_type && (
                                        <DetailRow
                                            label="Încălzire"
                                            value={listing.heating_type}
                                        />
                                    )}

                                    {listing.total_floors !== null &&
                                        listing.total_floors !==
                                            undefined && (
                                            <DetailRow
                                                label="Etaje clădire"
                                                value={
                                                    listing.total_floors
                                                }
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
                                    {listing.max_tenants !== null &&
                                        listing.max_tenants !==
                                            undefined && (
                                            <DetailRow
                                                label="Număr maxim chiriași"
                                                value={
                                                    listing.max_tenants
                                                }
                                            />
                                        )}

                                    {listing.pets_allowed !== null &&
                                        listing.pets_allowed !==
                                            undefined && (
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
                                        listing.smoking_allowed !==
                                            undefined && (
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
                                        listing.utilities_included !==
                                            undefined && (
                                            <DetailRow
                                                label="Utilități incluse"
                                                value={
                                                    listing.utilities_included
                                                        ? "Da"
                                                        : "Nu"
                                                }
                                            />
                                        )}

                                    {listing.deposit_amount !== null &&
                                        listing.deposit_amount !==
                                            undefined && (
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

                        {/* UNIVERSITĂȚI */}

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
                                Universități în apropiere
                            </h2>

                            {universities.length === 0 ? (
                                <p
                                    style={{
                                        margin: 0,
                                        color: "#6b7280",
                                        fontSize: "15px",
                                        lineHeight: "1.6",
                                    }}
                                >
                                    Nu există informații despre
                                    universitățile din apropiere.
                                </p>
                            ) : (
                                <div
                                    style={{
                                        display: "grid",
                                        gap: "12px",
                                    }}
                                >
                                    {universities.map((university) => (
                                        <div
                                            key={university.id}
                                            style={{
                                                background: "#ffffff",
                                                border:
                                                    "1px solid #e5e7eb",
                                                borderRadius: "13px",
                                                padding: "16px 18px",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent:
                                                    "space-between",
                                                gap: "20px",
                                            }}
                                        >
                                            <div>
                                                <div
                                                    style={{
                                                        fontSize: "15px",
                                                        fontWeight: "800",
                                                        color: "#111827",
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
                                                                    "13px",
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

                                            {(university.walking_minutes !==
                                                null &&
                                                university.walking_minutes !==
                                                    undefined) ||
                                            (university.distance_meters !==
                                                null &&
                                                university.distance_meters !==
                                                    undefined) ? (
                                                <div
                                                    style={{
                                                        flexShrink: 0,
                                                        textAlign: "right",
                                                        color: "#4b5563",
                                                        fontSize: "13px",
                                                        lineHeight: "1.5",
                                                    }}
                                                >
                                                    {university.walking_minutes !==
                                                        null &&
                                                        university.walking_minutes !==
                                                            undefined && (
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

                                                    {university.distance_meters !==
                                                        null &&
                                                        university.distance_meters !==
                                                            undefined && (
                                                            <div>
                                                                {Number(
                                                                    university.distance_meters
                                                                ) >= 1000
                                                                    ? `${(
                                                                          Number(
                                                                              university.distance_meters
                                                                          ) /
                                                                          1000
                                                                      ).toLocaleString(
                                                                          "ro-RO",
                                                                          {
                                                                              maximumFractionDigits: 1,
                                                                          }
                                                                      )} km`
                                                                    : `${Math.round(
                                                                          Number(
                                                                              university.distance_meters
                                                                          )
                                                                      )} m`}
                                                            </div>
                                                        )}
                                                </div>
                                            ) : null}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* CARD CONTACT */}

                    <aside
                        style={{
                            background: "#ffffff",
                            border: "1px solid #e5e7eb",
                            borderRadius: "18px",
                            padding: "25px",
                            boxShadow:
                                "0 12px 35px rgba(17,24,39,0.05)",
                            position: "sticky",
                            top: "25px",
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
                                    {formatDate(
                                        listing.available_from
                                    )}
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
                </div>
            </section>

            <style>{`
                @media (max-width: 900px) {
                    .property-content-grid {
                        grid-template-columns: 1fr !important;
                    }

                    .property-content-grid aside {
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
