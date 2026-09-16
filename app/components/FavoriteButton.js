"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

export default function FavoriteButton({ listingId }) {
  const router = useRouter();

  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  useEffect(() => {
    let active = true;

    async function checkFavorite() {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          console.error(
            "Eroare la verificarea utilizatorului:",
            userError
          );
        }

        if (!active) return;

        if (!user) {
          setIsFavorite(false);
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from("favorites")
          .select("id")
          .eq("user_id", user.id)
          .eq("listing_id", listingId)
          .maybeSingle();

        if (!active) return;

        if (error) {
          console.error(
            "Eroare la verificarea favoritei:",
            error
          );
          setLoading(false);
          return;
        }

        setIsFavorite(Boolean(data));
        setLoading(false);
      } catch (error) {
        console.error(
          "Eroare neașteptată la verificarea favoritei:",
          error
        );

        if (active) {
          setLoading(false);
        }
      }
    }

    checkFavorite();

    return () => {
      active = false;
    };
  }, [listingId]);

  async function toggleFavorite(event) {
    event.preventDefault();
    event.stopPropagation();

    if (saving || loading) return;

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error(
          "Eroare la verificarea utilizatorului:",
          userError
        );
      }

      /*
        UTILIZATOR NEAUTENTIFICAT
      */

      if (!user) {
        setShowLoginModal(true);
        return;
      }

      setSaving(true);

      /*
        ȘTERGEM DIN FAVORITE
      */

      if (isFavorite) {
        const { error } = await supabase
          .from("favorites")
          .delete()
          .eq("user_id", user.id)
          .eq("listing_id", listingId);

        if (error) {
          throw error;
        }

        setIsFavorite(false);
        return;
      }

      /*
        ADĂUGĂM LA FAVORITE
      */

      const { error } = await supabase
        .from("favorites")
        .insert({
          user_id: user.id,
          listing_id: listingId,
        });

      /*
        23505 = deja există combinația
        user_id + listing_id.

        Dacă se întâmplă din cauza unui click dublu
        sau a unei stări întârziate, considerăm
        anunțul deja favorit.
      */

      if (error && error.code !== "23505") {
        throw error;
      }

      setIsFavorite(true);
    } catch (error) {
      console.error(
        "Eroare la modificarea favoritei:",
        error
      );

      alert(
        "Nu am putut modifica favoritele. Încearcă din nou."
      );
    } finally {
      setSaving(false);
    }
  }

  function closeModal(event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    setShowLoginModal(false);
  }

  function goToLogin(event) {
    event.preventDefault();
    event.stopPropagation();

    setShowLoginModal(false);
    router.push("/login");
  }

  return (
    <>
      {/* BUTON FAVORITE */}

      <button
        type="button"
        onClick={toggleFavorite}
        disabled={saving}
        aria-label={
          isFavorite
            ? "Șterge din favorite"
            : "Adaugă la favorite"
        }
        title={
          isFavorite
            ? "Șterge din favorite"
            : "Adaugă la favorite"
        }
        style={{
          position: "absolute",
          top: "10px",
          right: "10px",

          width: "38px",
          height: "38px",

          display: "flex",
          alignItems: "center",
          justifyContent: "center",

          padding: 0,

          border: "1px solid rgba(226, 232, 240, 0.95)",
          borderRadius: "50%",

          background: "#FFFFFF",

          color: isFavorite
            ? "#EF4444"
            : "#475569",

          fontSize: "23px",
          lineHeight: "1",

          cursor: saving
            ? "wait"
            : "pointer",

          boxShadow:
            "0 4px 14px rgba(15, 23, 42, 0.15)",

          zIndex: 30,

          opacity: loading ? 0.75 : 1,

          transition:
            "transform 0.15s ease, box-shadow 0.15s ease, color 0.15s ease",
        }}
        onMouseEnter={(event) => {
          event.currentTarget.style.transform =
            "scale(1.07)";

          event.currentTarget.style.boxShadow =
            "0 6px 18px rgba(15, 23, 42, 0.20)";
        }}
        onMouseLeave={(event) => {
          event.currentTarget.style.transform =
            "scale(1)";

          event.currentTarget.style.boxShadow =
            "0 4px 14px rgba(15, 23, 42, 0.15)";
        }}
      >
        {isFavorite ? "♥" : "♡"}
      </button>

      {/* MODAL LOGIN */}

      {showLoginModal && (
        <div
          onClick={closeModal}
          style={{
            position: "fixed",
            inset: 0,

            display: "flex",
            alignItems: "center",
            justifyContent: "center",

            padding: "20px",

            background:
              "rgba(15, 23, 42, 0.48)",

            backdropFilter: "blur(2px)",

            zIndex: 999999,
          }}
        >
          <div
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
            style={{
              width: "100%",
              maxWidth: "400px",

              background: "#FFFFFF",

              border:
                "1px solid #E2E8F0",

              borderRadius: "18px",

              padding: "27px",

              boxSizing: "border-box",

              boxShadow:
                "0 25px 70px rgba(15, 23, 42, 0.25)",

              textAlign: "left",
            }}
          >
            {/* ICON */}

            <div
              style={{
                width: "48px",
                height: "48px",

                display: "flex",
                alignItems: "center",
                justifyContent: "center",

                borderRadius: "50%",

                background: "#EFF6FF",
                color: "#3B82F6",

                fontSize: "27px",

                marginBottom: "17px",
              }}
            >
              ♡
            </div>

            {/* TITLU */}

            <h3
              style={{
                margin: 0,

                color: "#172554",

                fontSize: "20px",
                lineHeight: "1.3",

                fontWeight: "800",

                letterSpacing: "-0.4px",
              }}
            >
              Salvează anunțul la favorite
            </h3>

            {/* TEXT */}

            <p
              style={{
                margin:
                  "10px 0 22px",

                color: "#64748B",

                fontSize: "14px",
                lineHeight: "1.6",
              }}
            >
              Trebuie să te autentifici sau să îți
              creezi un cont pentru a salva anunțuri
              la favorite.
            </p>

            {/* LOGIN */}

            <button
              type="button"
              onClick={goToLogin}
              style={{
                width: "100%",

                border: "none",
                borderRadius: "10px",

                background: "#172554",
                color: "#FFFFFF",

                padding: "13px 16px",

                fontFamily: "inherit",
                fontSize: "14px",
                fontWeight: "800",

                cursor: "pointer",

                boxShadow:
                  "0 5px 15px rgba(23, 37, 84, 0.16)",
              }}
            >
              Intră în cont sau creează cont
            </button>

            {/* ÎNCHIDERE */}

            <button
              type="button"
              onClick={closeModal}
              style={{
                width: "100%",

                border: "none",

                background: "transparent",
                color: "#64748B",

                padding: "13px 16px 0",

                fontFamily: "inherit",
                fontSize: "13px",
                fontWeight: "700",

                cursor: "pointer",
              }}
            >
              Mai târziu
            </button>
          </div>
        </div>
      )}
    </>
  );
}
