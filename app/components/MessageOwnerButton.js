"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

export default function MessageOwnerButton({
  listingId,
  ownerId,
}) {
  const router = useRouter();

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [message, setMessage] = useState("");
  const [checking, setChecking] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  async function handleContactOwner() {
    if (checking) return;

    setChecking(true);
    setError("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error(
          "Eroare verificare utilizator:",
          userError
        );
      }

      if (!user) {
        setShowLoginModal(true);
        return;
      }

      if (user.id === ownerId) {
        setError("Acesta este propriul tău anunț.");
        setShowMessageModal(true);
        return;
      }

      setShowMessageModal(true);
    } catch (err) {
      console.error(
        "Eroare la verificarea autentificării:",
        err
      );

      setError(
        "A apărut o eroare. Încearcă din nou."
      );
    } finally {
      setChecking(false);
    }
  }

  async function handleSendMessage(event) {
    event.preventDefault();

    if (sending) return;

    const cleanMessage = message.trim();

    if (!cleanMessage) {
      setError("Scrie un mesaj înainte de trimitere.");
      return;
    }

    if (cleanMessage.length > 5000) {
      setError(
        "Mesajul poate avea maximum 5000 de caractere."
      );
      return;
    }

    setSending(true);
    setError("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        setShowMessageModal(false);
        setShowLoginModal(true);
        return;
      }

      if (user.id === ownerId) {
        setError(
          "Nu îți poți trimite mesaj propriului anunț."
        );
        return;
      }

      const {
        data: existingConversation,
        error: conversationSearchError,
      } = await supabase
        .from("conversations")
        .select("id")
        .eq("listing_id", listingId)
        .eq("tenant_id", user.id)
        .eq("owner_id", ownerId)
        .maybeSingle();

      if (conversationSearchError) {
        throw conversationSearchError;
      }

      let conversationId =
        existingConversation?.id || null;

      if (!conversationId) {
        const {
          data: newConversation,
          error: conversationCreateError,
        } = await supabase
          .from("conversations")
          .insert({
            listing_id: listingId,
            tenant_id: user.id,
            owner_id: ownerId,
          })
          .select("id")
          .single();

        if (conversationCreateError) {
          if (
            conversationCreateError.code === "23505"
          ) {
            const {
              data: conversationAfterConflict,
              error: conflictSearchError,
            } = await supabase
              .from("conversations")
              .select("id")
              .eq("listing_id", listingId)
              .eq("tenant_id", user.id)
              .eq("owner_id", ownerId)
              .single();

            if (conflictSearchError) {
              throw conflictSearchError;
            }

            conversationId =
              conversationAfterConflict.id;
          } else {
            throw conversationCreateError;
          }
        } else {
          conversationId = newConversation.id;
        }
      }

      const { error: messageError } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: cleanMessage,
        });

      if (messageError) {
        throw messageError;
      }

      const { error: updateError } = await supabase
        .from("conversations")
        .update({
          updated_at: new Date().toISOString(),
        })
        .eq("id", conversationId);

      if (updateError) {
        console.error(
          "Conversația nu a putut actualiza updated_at:",
          updateError
        );
      }

      setMessage("");
      setShowMessageModal(false);

      router.push(
        `/dashboard?section=messages&conversation=${conversationId}`
      );
    } catch (err) {
      console.error(
        "Eroare la trimiterea mesajului:",
        err
      );

      setError(
        err?.message
          ? `Mesajul nu a putut fi trimis: ${err.message}`
          : "Mesajul nu a putut fi trimis. Încearcă din nou."
      );
    } finally {
      setSending(false);
    }
  }

  function goToLogin(event) {
    event.preventDefault();
    event.stopPropagation();

    setShowLoginModal(false);
    router.push("/login");
  }

  function closeLoginModal(event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    setShowLoginModal(false);
  }

  function closeMessageModal(event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (sending) return;

    setShowMessageModal(false);
    setMessage("");
    setError("");
  }

  return (
    <>
      {/* BUTON PRINCIPAL */}

      <button
        type="button"
        onClick={handleContactOwner}
        disabled={checking}
        style={{
          width: "100%",
          marginTop: "25px",
          border: "none",
          borderRadius: "12px",
          padding: "16px",
          background: "#172554",
          color: "#FFFFFF",
          fontFamily: "inherit",
          fontSize: "15px",
          fontWeight: "800",
          cursor: checking ? "wait" : "pointer",
          boxShadow:
            "0 6px 16px rgba(23, 37, 84, 0.16)",
          opacity: checking ? 0.8 : 1,
          transition:
            "transform 0.15s ease, box-shadow 0.15s ease",
        }}
        onMouseEnter={(event) => {
          if (!checking) {
            event.currentTarget.style.transform =
              "translateY(-1px)";

            event.currentTarget.style.boxShadow =
              "0 8px 20px rgba(23, 37, 84, 0.22)";
          }
        }}
        onMouseLeave={(event) => {
          event.currentTarget.style.transform =
            "translateY(0)";

          event.currentTarget.style.boxShadow =
            "0 6px 16px rgba(23, 37, 84, 0.16)";
        }}
      >
        {checking
          ? "Se verifică..."
          : "Trimite mesaj proprietarului"}
      </button>

      {/* POPUP UTILIZATOR NELOGAT */}

      {showLoginModal && (
        <div
          onClick={closeLoginModal}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 999999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            background: "rgba(15, 23, 42, 0.48)",
            backdropFilter: "blur(2px)",
          }}
        >
          <div
            onClick={(event) => {
              event.stopPropagation();
            }}
            style={{
              width: "100%",
              maxWidth: "410px",
              background: "#FFFFFF",
              border: "1px solid #E2E8F0",
              borderRadius: "18px",
              padding: "27px",
              boxSizing: "border-box",
              boxShadow:
                "0 25px 70px rgba(15, 23, 42, 0.25)",
            }}
          >
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
                fontSize: "23px",
                marginBottom: "17px",
              }}
            >
              ✉
            </div>

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
              Contactează proprietarul
            </h3>

            <p
              style={{
                margin: "10px 0 22px",
                color: "#64748B",
                fontSize: "14px",
                lineHeight: "1.6",
              }}
            >
              Trebuie să te autentifici sau să îți creezi un cont
              pentru a contacta proprietarul.
            </p>

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

            <button
              type="button"
              onClick={closeLoginModal}
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

      {/* POPUP SCRIERE MESAJ */}

      {showMessageModal && (
        <div
          onClick={closeMessageModal}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 999999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            background: "rgba(15, 23, 42, 0.48)",
            backdropFilter: "blur(2px)",
          }}
        >
          <div
            onClick={(event) => {
              event.stopPropagation();
            }}
            style={{
              width: "100%",
              maxWidth: "500px",
              background: "#FFFFFF",
              border: "1px solid #E2E8F0",
              borderRadius: "18px",
              padding: "27px",
              boxSizing: "border-box",
              boxShadow:
                "0 25px 70px rgba(15, 23, 42, 0.25)",
            }}
          >
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
                fontSize: "23px",
                marginBottom: "17px",
              }}
            >
              ✉
            </div>

            <h3
              style={{
                margin: "0 0 20px",
                color: "#172554",
                fontSize: "20px",
                lineHeight: "1.3",
                fontWeight: "800",
                letterSpacing: "-0.4px",
              }}
            >
              Trimite un mesaj proprietarului
            </h3>

            {error &&
            error !== "Acesta este propriul tău anunț." ? (
              <div
                style={{
                  marginBottom: "14px",
                  background: "#FEF2F2",
                  border: "1px solid #FECACA",
                  color: "#B91C1C",
                  borderRadius: "10px",
                  padding: "11px 12px",
                  fontSize: "12px",
                  lineHeight: "1.5",
                }}
              >
                {error}
              </div>
            ) : null}

            {error === "Acesta este propriul tău anunț." ? (
              <>
                <div
                  style={{
                    background: "#EFF6FF",
                    border: "1px solid #DBEAFE",
                    color: "#172554",
                    borderRadius: "11px",
                    padding: "14px",
                    fontSize: "13px",
                    lineHeight: "1.6",
                  }}
                >
                  Acesta este propriul tău anunț. Nu îți poți
                  trimite un mesaj.
                </div>

                <button
                  type="button"
                  onClick={closeMessageModal}
                  style={{
                    width: "100%",
                    marginTop: "17px",
                    border: "none",
                    borderRadius: "10px",
                    background: "#172554",
                    color: "#FFFFFF",
                    padding: "13px 16px",
                    fontFamily: "inherit",
                    fontSize: "14px",
                    fontWeight: "800",
                    cursor: "pointer",
                  }}
                >
                  Închide
                </button>
              </>
            ) : (
              <form onSubmit={handleSendMessage}>
                <textarea
                  value={message}
                  onChange={(event) => {
                    setMessage(event.target.value);

                    if (error) {
                      setError("");
                    }
                  }}
                  placeholder="Bună! Sunt interesat de această proprietate. Mai este disponibilă?"
                  maxLength={5000}
                  rows={6}
                  autoFocus
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    resize: "vertical",
                    minHeight: "135px",
                    border: "1px solid #CBD5E1",
                    borderRadius: "11px",
                    padding: "13px 14px",
                    outline: "none",
                    color: "#0F172A",
                    background: "#FFFFFF",
                    fontFamily: "inherit",
                    fontSize: "14px",
                    lineHeight: "1.6",
                  }}
                />

                <div
                  style={{
                    marginTop: "7px",
                    textAlign: "right",
                    color: "#94A3B8",
                    fontSize: "11px",
                  }}
                >
                  {message.length} / 5000
                </div>

                <button
                  type="submit"
                  disabled={sending || !message.trim()}
                  style={{
                    width: "100%",
                    marginTop: "15px",
                    border: "none",
                    borderRadius: "10px",
                    background:
                      sending || !message.trim()
                        ? "#94A3B8"
                        : "#172554",
                    color: "#FFFFFF",
                    padding: "13px 16px",
                    fontFamily: "inherit",
                    fontSize: "14px",
                    fontWeight: "800",
                    cursor:
                      sending || !message.trim()
                        ? "not-allowed"
                        : "pointer",
                    opacity: sending ? 0.75 : 1,
                    boxShadow:
                      "0 5px 15px rgba(23, 37, 84, 0.16)",
                  }}
                >
                  {sending ? "Se trimite..." : "Trimite mesajul"}
                </button>

                <button
                  type="button"
                  disabled={sending}
                  onClick={closeMessageModal}
                  style={{
                    width: "100%",
                    border: "none",
                    background: "transparent",
                    color: "#64748B",
                    padding: "13px 16px 0",
                    fontFamily: "inherit",
                    fontSize: "13px",
                    fontWeight: "700",
                    cursor: sending ? "default" : "pointer",
                  }}
                >
                  Anulează
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
