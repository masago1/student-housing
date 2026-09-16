"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

export default function DashboardPage() {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [listings, setListings] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState("dashboard");
  const [error, setError] = useState("");

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);
      setError("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace("/login");
        return;
      }

      setUser(user);

      /*
        ANUNȚURILE UTILIZATORULUI
      */

      const { data, error: listingsError } = await supabase
        .from("listings")
        .select(`
          id,
          title,
          city,
          address,
          price_monthly,
          rooms,
          surface_m2,
          image_url,
          active,
          created_at
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (listingsError) {
        console.error(listingsError);
        setError("Anunțurile nu au putut fi încărcate.");
      } else {
        setListings(data || []);
      }

      /*
        FAVORITELE UTILIZATORULUI
      */

      const { data: favoriteRows, error: favoritesError } =
        await supabase
          .from("favorites")
          .select(`
            id,
            listing_id,
            created_at,
            listings (
              id,
              title,
              city,
              address,
              price_monthly,
              rooms,
              surface_m2,
              image_url,
              active,
              created_at
            )
          `)
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

      if (favoritesError) {
        console.error("Eroare favorite:", favoritesError);
        setError("Favoritele nu au putut fi încărcate.");
      } else {
        setFavorites(
          (favoriteRows || [])
            .filter((favorite) => favorite.listings)
            .map((favorite) => ({
              favoriteId: favorite.id,
              ...favorite.listings,
            }))
        );
      }

      setLoading(false);
    };

    loadDashboard();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        router.replace("/login");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  /*
    LOGOUT
  */

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  /*
    ACTIVEAZĂ / DEZACTIVEAZĂ ANUNȚ
  */

  const toggleListing = async (listing) => {
    setError("");

    const newStatus = !listing.active;

    const { error } = await supabase
      .from("listings")
      .update({
        active: newStatus,
      })
      .eq("id", listing.id)
      .eq("user_id", user.id);

    if (error) {
      console.error(error);
      setError("Statusul anunțului nu a putut fi modificat.");
      return;
    }

    setListings((current) =>
      current.map((item) =>
        item.id === listing.id
          ? {
              ...item,
              active: newStatus,
            }
          : item
      )
    );

    /*
      Dacă anunțul apare și la favorite,
      actualizăm și statusul de acolo.
    */

    setFavorites((current) =>
      current.map((item) =>
        item.id === listing.id
          ? {
              ...item,
              active: newStatus,
            }
          : item
      )
    );
  };

  /*
    ELIMINĂ DIN FAVORITE
  */

  const removeFavorite = async (listing) => {
    if (!user) return;

    setError("");

    const { error: deleteError } = await supabase
      .from("favorites")
      .delete()
      .eq("user_id", user.id)
      .eq("listing_id", listing.id);

    if (deleteError) {
      console.error("Eroare ștergere favorit:", deleteError);
      setError("Anunțul nu a putut fi eliminat din favorite.");
      return;
    }

    setFavorites((current) =>
      current.filter((item) => item.id !== listing.id)
    );
  };

  const activeListings = listings.filter(
    (listing) => listing.active
  ).length;

  /*
    STIL MENIU
  */

  const menuItemStyle = (section) => ({
    width: "100%",
    border: "none",
    borderRadius: "9px",
    padding: "13px 14px",
    textAlign: "left",
    fontFamily: "inherit",
    fontSize: "14px",
    fontWeight: activeSection === section ? "800" : "600",
    cursor: "pointer",
    background:
      activeSection === section ? "#EFF6FF" : "transparent",
    color:
      activeSection === section ? "#172554" : "#64748B",
  });

  /*
    LOADING
  */

  if (loading) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#F4F7FB",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#64748B",
          fontSize: "15px",
          fontWeight: "600",
        }}
      >
        Se încarcă panoul...
      </main>
    );
  }

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
          padding: "0 5%",
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
          <span style={{ color: "#172554" }}>Student</span>
          <span style={{ color: "#3B82F6" }}>Housing</span>
        </a>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "20px",
          }}
        >
          <span
            style={{
              color: "#64748B",
              fontSize: "13px",
              fontWeight: "600",
            }}
          >
            {user?.email}
          </span>

          <button
            type="button"
            onClick={handleLogout}
            style={{
              border: "1px solid #E2E8F0",
              background: "#FFFFFF",
              borderRadius: "9px",
              padding: "9px 14px",
              color: "#172554",
              fontFamily: "inherit",
              fontSize: "13px",
              fontWeight: "700",
              cursor: "pointer",
            }}
          >
            Ieșire
          </button>
        </div>
      </header>

      {/* DASHBOARD */}

      <div
        className="dashboard-layout"
        style={{
          minHeight: "calc(100vh - 73px)",
          display: "grid",
          gridTemplateColumns: "250px minmax(0, 1fr)",
        }}
      >
        {/* SIDEBAR */}

        <aside
          className="dashboard-sidebar"
          style={{
            background: "#FFFFFF",
            borderRight: "1px solid #E2E8F0",
            padding: "32px 20px",
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              fontSize: "11px",
              fontWeight: "800",
              color: "#94A3B8",
              letterSpacing: "0.7px",
              padding: "0 14px",
              marginBottom: "14px",
            }}
          >
            CONTUL MEU
          </div>

          <nav
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "5px",
            }}
          >
            <button
              type="button"
              onClick={() => setActiveSection("dashboard")}
              style={menuItemStyle("dashboard")}
            >
              Panou principal
            </button>

            <button
              type="button"
              onClick={() => setActiveSection("listings")}
              style={menuItemStyle("listings")}
            >
              Anunțurile tale
            </button>

            <button
              type="button"
              onClick={() => setActiveSection("messages")}
              style={menuItemStyle("messages")}
            >
              Mesaje
            </button>

            <button
              type="button"
              onClick={() => setActiveSection("favorites")}
              style={menuItemStyle("favorites")}
            >
              Favorite
              {favorites.length > 0
                ? ` (${favorites.length})`
                : ""}
            </button>
          </nav>

          <div
            style={{
              marginTop: "25px",
              paddingTop: "22px",
              borderTop: "1px solid #EFF6FF",
            }}
          >
            <button
              type="button"
              onClick={() => router.push("/adaugaproprietate")}
              style={{
                width: "100%",
                border: "none",
                borderRadius: "10px",
                padding: "13px",
                background: "#172554",
                color: "#FFFFFF",
                fontFamily: "inherit",
                fontSize: "14px",
                fontWeight: "800",
                cursor: "pointer",
                boxShadow:
                  "0 6px 16px rgba(23, 37, 84, 0.16)",
              }}
            >
              + Adaugă anunț
            </button>
          </div>
        </aside>

        {/* PARTEA DREAPTĂ */}

        <section
          className="dashboard-content"
          style={{
            padding: "45px 5% 80px",
            minWidth: 0,
          }}
        >
          {/* PANOU PRINCIPAL */}

          {activeSection === "dashboard" && (
            <>
              <div
                style={{
                  marginBottom: "32px",
                }}
              >
                <h1
                  style={{
                    margin: 0,
                    fontSize: "34px",
                    fontWeight: "800",
                    letterSpacing: "-1px",
                    color: "#172554",
                  }}
                >
                  Bun venit
                </h1>

                <p
                  style={{
                    margin: "9px 0 0",
                    color: "#64748B",
                    fontSize: "15px",
                  }}
                >
                  Administrează anunțurile și mesajele tale.
                </p>
              </div>

              {/* STATISTICI */}

              <div
                className="stats-grid"
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(3, minmax(160px, 230px))",
                  gap: "16px",
                  marginBottom: "42px",
                }}
              >
                <StatCard
                  number={listings.length}
                  title="Anunțuri"
                />

                <StatCard number="0" title="Mesaje" />

                <StatCard
                  number={activeListings}
                  title="Active"
                />
              </div>

              {/* ANUNȚURI RECENTE */}

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "16px",
                }}
              >
                <h2
                  style={{
                    margin: 0,
                    fontSize: "21px",
                    fontWeight: "800",
                    color: "#172554",
                  }}
                >
                  Anunțurile tale
                </h2>

                {listings.length > 3 && (
                  <button
                    type="button"
                    onClick={() =>
                      setActiveSection("listings")
                    }
                    style={{
                      border: "none",
                      background: "transparent",
                      color: "#3B82F6",
                      fontFamily: "inherit",
                      fontSize: "13px",
                      fontWeight: "700",
                      cursor: "pointer",
                    }}
                  >
                    Vezi toate
                  </button>
                )}
              </div>

              <ListingsList
                listings={listings.slice(0, 3)}
                router={router}
                toggleListing={toggleListing}
              />
            </>
          )}

          {/* ANUNȚURILE TALE */}

          {activeSection === "listings" && (
            <>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-end",
                  marginBottom: "30px",
                  gap: "20px",
                }}
              >
                <div>
                  <h1
                    style={{
                      margin: 0,
                      fontSize: "34px",
                      fontWeight: "800",
                      letterSpacing: "-1px",
                      color: "#172554",
                    }}
                  >
                    Anunțurile tale
                  </h1>

                  <p
                    style={{
                      margin: "9px 0 0",
                      color: "#64748B",
                      fontSize: "15px",
                    }}
                  >
                    Vezi și administrează toate anunțurile
                    publicate.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    router.push("/adaugaproprietate")
                  }
                  style={{
                    border: "none",
                    borderRadius: "10px",
                    padding: "12px 17px",
                    background: "#172554",
                    color: "#FFFFFF",
                    fontFamily: "inherit",
                    fontSize: "13px",
                    fontWeight: "800",
                    cursor: "pointer",
                    boxShadow:
                      "0 6px 16px rgba(23, 37, 84, 0.16)",
                  }}
                >
                  + Adaugă anunț
                </button>
              </div>

              <ListingsList
                listings={listings}
                router={router}
                toggleListing={toggleListing}
              />
            </>
          )}

          {/* MESAJE */}

          {activeSection === "messages" && (
            <>
              <h1
                style={{
                  margin: 0,
                  fontSize: "34px",
                  fontWeight: "800",
                  letterSpacing: "-1px",
                  color: "#172554",
                }}
              >
                Mesaje
              </h1>

              <p
                style={{
                  margin: "9px 0 28px",
                  color: "#64748B",
                  fontSize: "15px",
                }}
              >
                Mesajele persoanelor interesate de anunțurile
                tale vor apărea aici.
              </p>

              <EmptyCard
                title="Nu ai mesaje noi"
                text="Când cineva te contactează pentru un anunț, conversația va apărea aici."
              />
            </>
          )}

          {/* FAVORITE */}

          {activeSection === "favorites" && (
            <>
              <div
                style={{
                  marginBottom: "28px",
                }}
              >
                <h1
                  style={{
                    margin: 0,
                    fontSize: "34px",
                    fontWeight: "800",
                    letterSpacing: "-1px",
                    color: "#172554",
                  }}
                >
                  Favorite
                </h1>

                <p
                  style={{
                    margin: "9px 0 0",
                    color: "#64748B",
                    fontSize: "15px",
                  }}
                >
                  Anunțurile pe care le-ai salvat pentru mai
                  târziu.
                </p>
              </div>

              {favorites.length === 0 ? (
                <EmptyCard
                  title="Nu ai anunțuri favorite"
                  text="Poți salva anunțurile care te interesează pentru a reveni rapid la ele."
                />
              ) : (
                <FavoritesList
                  favorites={favorites}
                  router={router}
                  removeFavorite={removeFavorite}
                />
              )}
            </>
          )}

          {/* EROARE */}

          {error && (
            <div
              style={{
                marginTop: "22px",
                background: "#FEF2F2",
                border: "1px solid #FECACA",
                color: "#B91C1C",
                borderRadius: "11px",
                padding: "13px 15px",
                fontSize: "13px",
              }}
            >
              {error}
            </div>
          )}
        </section>
      </div>

      {/* RESPONSIVE */}

      <style>{`
        @media (max-width: 800px) {
          .dashboard-layout {
            grid-template-columns: 1fr !important;
          }

          .dashboard-sidebar {
            border-right: none !important;
            border-bottom: 1px solid #E2E8F0 !important;
          }

          .stats-grid {
            grid-template-columns: 1fr !important;
          }

          .dashboard-content {
            padding: 30px 20px 60px !important;
          }

          .dashboard-listing-card,
          .favorite-card {
            grid-template-columns: 110px minmax(0, 1fr) !important;
          }

          .dashboard-listing-image,
          .favorite-image {
            width: 110px !important;
          }
        }

        @media (max-width: 560px) {
          .dashboard-listing-card,
          .favorite-card {
            grid-template-columns: 1fr !important;
          }

          .dashboard-listing-image,
          .favorite-image {
            width: 100% !important;
            height: 190px !important;
          }

          .favorite-header,
          .listing-header {
            flex-direction: column !important;
          }
        }
      `}</style>
    </main>
  );
}

/*
  CARD STATISTICĂ
*/

function StatCard({ number, title }) {
  return (
    <div
      style={{
        background: "#FFFFFF",
        border: "1px solid #E2E8F0",
        boxShadow:
          "0 8px 24px rgba(15, 23, 42, 0.05)",
        borderRadius: "14px",
        padding: "22px",
        minHeight: "95px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          fontSize: "30px",
          lineHeight: "1",
          fontWeight: "800",
          letterSpacing: "-1px",
          color: "#172554",
        }}
      >
        {number}
      </div>

      <div
        style={{
          marginTop: "11px",
          color: "#64748B",
          fontSize: "13px",
          fontWeight: "700",
        }}
      >
        {title}
      </div>
    </div>
  );
}

/*
  ANUNȚURILE UTILIZATORULUI
*/

function ListingsList({
  listings,
  router,
  toggleListing,
}) {
  if (listings.length === 0) {
    return (
      <div
        style={{
          background: "#FFFFFF",
          border: "1px solid #E2E8F0",
          borderRadius: "16px",
          padding: "45px 25px",
          boxShadow:
            "0 8px 24px rgba(15, 23, 42, 0.04)",
        }}
      >
        <div
          style={{
            fontSize: "17px",
            fontWeight: "800",
            color: "#172554",
          }}
        >
          Nu ai publicat încă niciun anunț
        </div>

        <div
          style={{
            color: "#64748B",
            fontSize: "13px",
            marginTop: "7px",
          }}
        >
          Primul tău anunț va apărea aici după publicare.
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "12px",
      }}
    >
      {listings.map((listing) => (
        <div
          key={listing.id}
          className="dashboard-listing-card"
          style={{
            background: "#FFFFFF",
            border: "1px solid #E2E8F0",
            boxShadow:
              "0 8px 24px rgba(15, 23, 42, 0.04)",
            borderRadius: "15px",
            padding: "14px",
            display: "grid",
            gridTemplateColumns:
              "135px minmax(0, 1fr)",
            gap: "18px",
            maxWidth: "850px",
          }}
        >
          {/* POZA */}

          <div
            className="dashboard-listing-image"
            style={{
              width: "135px",
              height: "105px",
              background: "#F8FAFC",
              borderRadius: "10px",
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
                  fontSize: "11px",
                }}
              >
                Fără fotografie
              </div>
            )}
          </div>

          {/* INFO */}

          <div style={{ minWidth: 0 }}>
            <div
              className="listing-header"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: "15px",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <h3
                  style={{
                    margin: 0,
                    fontSize: "16px",
                    fontWeight: "800",
                    color: "#172554",
                  }}
                >
                  {listing.title}
                </h3>

                <div
                  style={{
                    color: "#64748B",
                    fontSize: "12px",
                    marginTop: "5px",
                  }}
                >
                  {listing.city}
                  {listing.address
                    ? ` · ${listing.address}`
                    : ""}
                </div>
              </div>

              <div
                style={{
                  fontSize: "18px",
                  fontWeight: "800",
                  color: "#172554",
                  whiteSpace: "nowrap",
                }}
              >
                {Number(
                  listing.price_monthly
                ).toLocaleString("ro-RO")}{" "}
                €

                <span
                  style={{
                    color: "#94A3B8",
                    fontSize: "11px",
                    fontWeight: "600",
                  }}
                >
                  {" "}
                  / lună
                </span>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "10px",
                marginTop: "11px",
              }}
            >
              <span
                style={{
                  background: listing.active
                    ? "#DCFCE7"
                    : "#F1F5F9",
                  color: listing.active
                    ? "#15803D"
                    : "#64748B",
                  borderRadius: "100px",
                  padding: "5px 8px",
                  fontSize: "10px",
                  fontWeight: "800",
                }}
              >
                {listing.active ? "Activ" : "Inactiv"}
              </span>

              {Number(listing.rooms) > 0 && (
                <span
                  style={{
                    color: "#64748B",
                    fontSize: "11px",
                  }}
                >
                  {listing.rooms}{" "}
                  {Number(listing.rooms) === 1
                    ? "cameră"
                    : "camere"}
                </span>
              )}

              {Number(listing.surface_m2) > 0 && (
                <span
                  style={{
                    color: "#64748B",
                    fontSize: "11px",
                  }}
                >
                  {listing.surface_m2} m²
                </span>
              )}
            </div>

            {/* ACȚIUNI */}

            <div
              style={{
                display: "flex",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "15px",
                marginTop: "14px",
              }}
            >
              <button
                type="button"
                onClick={() =>
                  router.push(
                    `/proprietate/${listing.id}`
                  )
                }
                style={actionButton}
              >
                Vezi
              </button>

              <button
                type="button"
                onClick={() =>
                  router.push(
                    `/editeaza-proprietate/${listing.id}`
                  )
                }
                style={actionButton}
              >
                Editează
              </button>

              <button
                type="button"
                onClick={() => toggleListing(listing)}
                style={{
                  ...actionButton,
                  color: listing.active
                    ? "#D97706"
                    : "#15803D",
                }}
              >
                {listing.active
                  ? "Dezactivează"
                  : "Activează"}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/*
  LISTA FAVORITE
*/

function FavoritesList({
  favorites,
  router,
  removeFavorite,
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "12px",
      }}
    >
      {favorites.map((listing) => (
        <div
          key={listing.id}
          className="favorite-card"
          style={{
            background: "#FFFFFF",
            border: "1px solid #E2E8F0",
            boxShadow:
              "0 8px 24px rgba(15, 23, 42, 0.04)",
            borderRadius: "15px",
            padding: "14px",
            display: "grid",
            gridTemplateColumns:
              "135px minmax(0, 1fr)",
            gap: "18px",
            maxWidth: "850px",
          }}
        >
          {/* POZA */}

          <div
            className="favorite-image"
            style={{
              width: "135px",
              height: "105px",
              background: "#F8FAFC",
              borderRadius: "10px",
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
                  fontSize: "11px",
                }}
              >
                Fără fotografie
              </div>
            )}
          </div>

          {/* INFO */}

          <div style={{ minWidth: 0 }}>
            <div
              className="favorite-header"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: "15px",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <h3
                  style={{
                    margin: 0,
                    fontSize: "16px",
                    fontWeight: "800",
                    color: "#172554",
                  }}
                >
                  {listing.title}
                </h3>

                <div
                  style={{
                    color: "#64748B",
                    fontSize: "12px",
                    marginTop: "5px",
                  }}
                >
                  {listing.city}
                  {listing.address
                    ? ` · ${listing.address}`
                    : ""}
                </div>
              </div>

              <div
                style={{
                  fontSize: "18px",
                  fontWeight: "800",
                  color: "#172554",
                  whiteSpace: "nowrap",
                }}
              >
                {Number(
                  listing.price_monthly
                ).toLocaleString("ro-RO")}{" "}
                €

                <span
                  style={{
                    color: "#94A3B8",
                    fontSize: "11px",
                    fontWeight: "600",
                  }}
                >
                  {" "}
                  / lună
                </span>
              </div>
            </div>

            {/* DETALII */}

            <div
              style={{
                display: "flex",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "10px",
                marginTop: "11px",
              }}
            >
              {Number(listing.rooms) > 0 && (
                <span
                  style={{
                    color: "#64748B",
                    fontSize: "11px",
                  }}
                >
                  {listing.rooms}{" "}
                  {Number(listing.rooms) === 1
                    ? "cameră"
                    : "camere"}
                </span>
              )}

              {Number(listing.surface_m2) > 0 && (
                <span
                  style={{
                    color: "#64748B",
                    fontSize: "11px",
                  }}
                >
                  {listing.surface_m2} m²
                </span>
              )}

              {listing.active === false && (
                <span
                  style={{
                    background: "#F1F5F9",
                    color: "#64748B",
                    borderRadius: "100px",
                    padding: "5px 8px",
                    fontSize: "10px",
                    fontWeight: "800",
                  }}
                >
                  Inactiv
                </span>
              )}
            </div>

            {/* ACȚIUNI */}

            <div
              style={{
                display: "flex",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "18px",
                marginTop: "18px",
              }}
            >
              <button
                type="button"
                onClick={() =>
                  router.push(
                    `/proprietate/${listing.id}`
                  )
                }
                style={{
                  border: "none",
                  background: "transparent",
                  padding: 0,
                  color: "#3B82F6",
                  fontFamily: "inherit",
                  fontSize: "12px",
                  fontWeight: "700",
                  cursor: "pointer",
                }}
              >
                Vezi anunțul
              </button>

              <button
                type="button"
                onClick={() =>
                  removeFavorite(listing)
                }
                style={{
                  border: "none",
                  background: "transparent",
                  padding: 0,
                  color: "#DC2626",
                  fontFamily: "inherit",
                  fontSize: "12px",
                  fontWeight: "700",
                  cursor: "pointer",
                }}
              >
                ♥ Elimină din favorite
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/*
  CARD GOL
*/

function EmptyCard({ title, text }) {
  return (
    <div
      style={{
        maxWidth: "850px",
        background: "#FFFFFF",
        border: "1px solid #E2E8F0",
        borderRadius: "16px",
        padding: "45px 25px",
        boxShadow:
          "0 8px 24px rgba(15, 23, 42, 0.04)",
      }}
    >
      <div
        style={{
          fontSize: "17px",
          fontWeight: "800",
          color: "#172554",
        }}
      >
        {title}
      </div>

      <div
        style={{
          color: "#64748B",
          fontSize: "13px",
          lineHeight: "1.6",
          marginTop: "7px",
        }}
      >
        {text}
      </div>
    </div>
  );
}

/*
  BUTOANE ACȚIUNI
*/

const actionButton = {
  border: "none",
  background: "transparent",
  padding: 0,
  color: "#3B82F6",
  fontFamily: "inherit",
  fontSize: "12px",
  fontWeight: "700",
  cursor: "pointer",
};
