"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../lib/supabase";
import FavoriteButton from "../../components/FavoriteButton";

export default function MobileCityListingsClient() {
  const params = useParams();

  const citySlug = Array.isArray(params?.city)
    ? params.city[0]
    : params?.city || "";

  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadListings() {
      setLoading(true);

      const { data, error } = await supabase
        .from("listings")
        .select(`
          id,
          title,
          city,
          price_monthly,
          rooms,
          bedrooms,
          surface_m2,
          furnished,
          image_url,
          active,
          created_at,
          neighborhoods (
            name
          )
        `)
        .eq("active", true)
        .order("created_at", {
          ascending: false,
        });

      if (!error) {
        const normalizedCity = decodeURIComponent(
          citySlug
        )
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .replace(/-/g, " ")
          .trim();

        const filtered = (data || []).filter(
          (listing) => {
            const listingCity = String(
              listing.city || ""
            )
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "")
              .toLowerCase()
              .trim();

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

        <a
          href="/cont"
          style={{
            color: "#172554",
            textDecoration: "none",
            fontSize: "11px",
            fontWeight: "800",
          }}
        >
          Contul meu
        </a>
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
              : `${listings.length} ${
                  listings.length === 1
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
              style={{
                flexShrink: 0,
                border:
                  "1px solid #CBD5E1",
                background: "#FFFFFF",
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

        {!loading &&
          listings.length === 0 && (
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
          {listings.map(
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
                    Vezi proprietatea
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
