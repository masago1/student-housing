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

  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selectedConversationId, setSelectedConversationId] =
    useState(null);
  const [messageText, setMessageText] = useState("");
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [conversationDetails, setConversationDetails] = useState({});

  const [profileName, setProfileName] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState("");
  const [phoneRequired, setPhoneRequired] = useState(false);

  /*
    ÎNCĂRCARE DASHBOARD
  */

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

      const { data: profileData, error: profileError } =
        await supabase
          .from("profiles")
          .select("name, phone")
          .eq("id", user.id)
          .maybeSingle();

      if (profileError) {
        console.error("Eroare profil:", profileError);
      } else {
        setProfileName(
          profileData?.name ||
            user.user_metadata?.name ||
            ""
        );
        setProfilePhone(profileData?.phone || "");
      }

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
        setError(
          "Anunțurile nu au putut fi încărcate."
        );
      } else {
        setListings(data || []);
      }

      const {
        data: favoriteRows,
        error: favoritesError,
      } = await supabase
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
        .order("created_at", {
          ascending: false,
        });

      if (favoritesError) {
        console.error(
          "Eroare favorite:",
          favoritesError
        );

        setError(
          "Favoritele nu au putut fi încărcate."
        );
      } else {
        setFavorites(
          (favoriteRows || [])
            .filter(
              (favorite) => favorite.listings
            )
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
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session?.user) {
          router.replace("/login");
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  /*
    PARAMETRI URL
  */

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(
      window.location.search
    );

    const sectionFromUrl =
      params.get("section");

    const conversationFromUrl =
      params.get("conversation");

    const requiredFromUrl =
      params.get("required");

    if (requiredFromUrl === "phone") {
      setPhoneRequired(true);
    }

    if (sectionFromUrl === "messages") {
      setActiveSection("messages");
    }

    if (sectionFromUrl === "favorites") {
      setActiveSection("favorites");
    }

    if (sectionFromUrl === "listings") {
      setActiveSection("listings");
    }

    if (sectionFromUrl === "profile") {
      setActiveSection("profile");
    }

    if (conversationFromUrl) {
      setSelectedConversationId(
        conversationFromUrl
      );

      setActiveSection("messages");
    }
  }, []);

  /*
    MESAJE NECITITE
  */

  const loadUnreadMessagesCount = async (
    conversationRows = conversations
  ) => {
    if (!user?.id) return;

    const conversationIds = (
      conversationRows || []
    ).map(
      (conversation) => conversation.id
    );

    if (conversationIds.length === 0) {
      setUnreadMessagesCount(0);
      return;
    }

    const {
      count,
      error: unreadError,
    } = await supabase
      .from("messages")
      .select("id", {
        count: "exact",
        head: true,
      })
      .in(
        "conversation_id",
        conversationIds
      )
      .neq("sender_id", user.id)
      .is("read_at", null);

    if (unreadError) {
      console.error(
        "Eroare mesaje necitite:",
        unreadError
      );

      return;
    }

    setUnreadMessagesCount(
      count || 0
    );
  };

  const markConversationAsRead =
    async (conversationId) => {
      if (
        !user?.id ||
        !conversationId
      ) {
        return;
      }

      const readAt =
        new Date().toISOString();

      const {
        error: readError,
      } = await supabase
        .from("messages")
        .update({
          read_at: readAt,
        })
        .eq(
          "conversation_id",
          conversationId
        )
        .neq(
          "sender_id",
          user.id
        )
        .is("read_at", null);

      if (readError) {
        console.error(
          "Eroare marcare mesaje ca citite:",
          readError
        );

        return;
      }

      setMessages((current) =>
        current.map((message) =>
          message.conversation_id ===
            conversationId &&
          message.sender_id !== user.id &&
          !message.read_at
            ? {
                ...message,
                read_at: readAt,
              }
            : message
        )
      );

      await Promise.all([
        loadUnreadMessagesCount(),
        loadConversationDetails(
          conversations
        ),
      ]);
    };

  /*
    DETALII CONVERSAȚII
  */

  const loadConversationDetails =
    async (conversationRows) => {
      if (
        !user?.id ||
        !conversationRows?.length
      ) {
        setConversationDetails({});
        return;
      }

      const otherUserIds = [
        ...new Set(
          conversationRows
            .map((conversation) =>
              conversation.owner_id ===
              user.id
                ? conversation.tenant_id
                : conversation.owner_id
            )
            .filter(Boolean)
        ),
      ];

      const conversationIds =
        conversationRows.map(
          (conversation) =>
            conversation.id
        );

      const [
        {
          data: profileRows,
          error: profilesError,
        },
        {
          data: messageRows,
          error: detailsMessagesError,
        },
      ] = await Promise.all([
        otherUserIds.length
          ? supabase
              .from("profiles")
              .select("id, name")
              .in(
                "id",
                otherUserIds
              )
          : Promise.resolve({
              data: [],
              error: null,
            }),

        supabase
          .from("messages")
          .select(`
            id,
            conversation_id,
            sender_id,
            content,
            created_at,
            read_at
          `)
          .in(
            "conversation_id",
            conversationIds
          )
          .order(
            "created_at",
            {
              ascending: false,
            }
          ),
      ]);

      if (profilesError) {
        console.error(
          "Eroare încărcare nume utilizatori:",
          profilesError
        );
      }

      if (detailsMessagesError) {
        console.error(
          "Eroare încărcare detalii conversații:",
          detailsMessagesError
        );
      }

      const profilesById = {};

      (profileRows || []).forEach(
        (profile) => {
          profilesById[
            profile.id
          ] = profile.name;
        }
      );

      const details = {};

      conversationRows.forEach(
        (conversation) => {
          const otherUserId =
            conversation.owner_id ===
            user.id
              ? conversation.tenant_id
              : conversation.owner_id;

          const conversationMessages =
            (messageRows || []).filter(
              (message) =>
                message.conversation_id ===
                conversation.id
            );

          const lastMessage =
            conversationMessages[0] ||
            null;

          const unreadCount =
            conversationMessages.filter(
              (message) =>
                message.sender_id !==
                  user.id &&
                !message.read_at
            ).length;

          details[
            conversation.id
          ] = {
            otherUserId,

            otherUserName:
              profilesById[
                otherUserId
              ] || "Utilizator",

            lastMessage,
            unreadCount,
          };
        }
      );

      setConversationDetails(
        details
      );
    };

  /*
    CONVERSAȚII
  */

  const loadConversations =
    async () => {
      if (!user?.id) return;

      const {
        data,
        error:
          conversationsError,
      } = await supabase
        .from("conversations")
        .select(`
          id,
          listing_id,
          tenant_id,
          owner_id,
          created_at,
          updated_at,
          listings (
            id,
            title,
            city,
            address,
            price_monthly,
            image_url,
            user_id
          )
        `)
        .or(
          `tenant_id.eq.${user.id},owner_id.eq.${user.id}`
        )
        .order(
          "updated_at",
          {
            ascending: false,
          }
        );

      if (
        conversationsError
      ) {
        console.error(
          "Eroare conversații:",
          conversationsError
        );

        setError(
          "Conversațiile nu au putut fi încărcate."
        );

        return;
      }

      const conversationRows =
        data || [];

      setConversations(
        conversationRows
      );

      await Promise.all([
        loadUnreadMessagesCount(
          conversationRows
        ),

        loadConversationDetails(
          conversationRows
        ),
      ]);
    };

  useEffect(() => {
    if (!user?.id) return;

    loadConversations();
  }, [user?.id]);

  useEffect(() => {
    if (
      activeSection ===
        "messages" &&
      !selectedConversationId &&
      conversations.length > 0
    ) {
      setSelectedConversationId(
        conversations[0].id
      );
    }
  }, [
    activeSection,
    conversations,
    selectedConversationId,
  ]);

  /*
    MESAJE
  */

  const loadMessages = async (
    conversationId
  ) => {
    if (!conversationId) {
      setMessages([]);
      return;
    }

    setMessagesLoading(true);

    const {
      data,
      error: messagesError,
    } = await supabase
      .from("messages")
      .select(`
        id,
        conversation_id,
        sender_id,
        content,
        created_at,
        read_at
      `)
      .eq(
        "conversation_id",
        conversationId
      )
      .order("created_at", {
        ascending: true,
      });

    if (messagesError) {
      console.error(
        "Eroare mesaje:",
        messagesError
      );

      setError(
        "Mesajele nu au putut fi încărcate."
      );

      setMessagesLoading(
        false
      );

      return;
    }

    setMessages(data || []);
    setMessagesLoading(false);

    await markConversationAsRead(
      conversationId
    );
  };

  useEffect(() => {
    if (
      !selectedConversationId
    ) {
      setMessages([]);
      return;
    }

    loadMessages(
      selectedConversationId
    );
  }, [
    selectedConversationId,
  ]);

  /*
    REALTIME
  */

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(
        `messages-user-${user.id}`
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        async (payload) => {
          const newMessage =
            payload.new;

          const belongsToUser =
            conversations.some(
              (conversation) =>
                conversation.id ===
                newMessage.conversation_id
            );

          if (!belongsToUser) {
            await loadConversations();
            return;
          }

          if (
            newMessage.conversation_id ===
            selectedConversationId
          ) {
            setMessages(
              (current) => {
                const exists =
                  current.some(
                    (message) =>
                      message.id ===
                      newMessage.id
                  );

                if (exists) {
                  return current;
                }

                return [
                  ...current,
                  newMessage,
                ];
              }
            );
          }

          if (
            newMessage.sender_id !==
              user.id &&
            activeSection ===
              "messages" &&
            newMessage.conversation_id ===
              selectedConversationId
          ) {
            await markConversationAsRead(
              newMessage.conversation_id
            );
          } else {
            await loadUnreadMessagesCount();
          }

          await loadConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(
        channel
      );
    };
  }, [
    user?.id,
    conversations,
    selectedConversationId,
    activeSection,
  ]);

  /*
    TRIMITE MESAJ
  */

  const sendMessage =
    async () => {
      if (
        !user?.id ||
        !selectedConversationId
      ) {
        return;
      }

      const cleanMessage =
        messageText.trim();

      if (!cleanMessage) return;

      setSendingMessage(true);
      setError("");

      const {
        data:
          insertedMessage,
        error: sendError,
      } = await supabase
        .from("messages")
        .insert({
          conversation_id:
            selectedConversationId,

          sender_id:
            user.id,

          content:
            cleanMessage,
        })
        .select(`
          id,
          conversation_id,
          sender_id,
          content,
          created_at,
          read_at
        `)
        .single();

      if (sendError) {
        console.error(
          "Eroare trimitere mesaj:",
          sendError
        );

        setError(
          "Mesajul nu a putut fi trimis."
        );

        setSendingMessage(
          false
        );

        return;
      }

      setMessages(
        (current) => {
          const exists =
            current.some(
              (message) =>
                message.id ===
                insertedMessage.id
            );

          if (exists) {
            return current;
          }

          return [
            ...current,
            insertedMessage,
          ];
        }
      );

      setMessageText("");

      const {
        error:
          conversationUpdateError,
      } = await supabase
        .from(
          "conversations"
        )
        .update({
          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          selectedConversationId
        );

      if (
        conversationUpdateError
      ) {
        console.error(
          "Eroare actualizare conversație:",
          conversationUpdateError
        );
      }

      await loadConversations();

      setSendingMessage(false);
    };

  const handleMessageKeyDown =
    (event) => {
      if (
        event.key === "Enter" &&
        !event.shiftKey
      ) {
        event.preventDefault();

        if (
          !sendingMessage
        ) {
          sendMessage();
        }
      }
    };

  const openConversation =
    (conversationId) => {
      setSelectedConversationId(
        conversationId
      );

      setActiveSection(
        "messages"
      );

      router.replace(
        `/dashboard?section=messages&conversation=${conversationId}`
      );
    };

  const selectedConversation =
    conversations.find(
      (conversation) =>
        conversation.id ===
        selectedConversationId
    ) || null;

  /*
    PROFIL
  */

  const saveProfile =
    async () => {
      if (!user?.id) return;

      const cleanName =
        profileName.trim();

      const cleanPhone =
        profilePhone.trim();

      setProfileSuccess("");
      setError("");

      if (!cleanName) {
        setError(
          "Introdu numele."
        );

        return;
      }

      if (
        cleanPhone &&
        cleanPhone.length < 7
      ) {
        setError(
          "Numărul de telefon nu este valid."
        );

        return;
      }

      setProfileSaving(true);

      const {
        error: profileError,
      } = await supabase
        .from("profiles")
        .upsert(
          {
            id: user.id,
            name: cleanName,
            phone:
              cleanPhone || null,
          },
          {
            onConflict: "id",
          }
        );

      if (profileError) {
        console.error(
          "Eroare salvare profil:",
          profileError
        );

        setError(
          "Profilul nu a putut fi salvat."
        );

        setProfileSaving(
          false
        );

        return;
      }

      const {
        error:
          metadataError,
      } =
        await supabase.auth.updateUser({
          data: {
            name: cleanName,
          },
        });

      if (metadataError) {
        console.error(
          "Eroare actualizare metadata:",
          metadataError
        );
      }

      setUser(
        (current) =>
          current
            ? {
                ...current,

                user_metadata: {
                  ...(current.user_metadata ||
                    {}),

                  name:
                    cleanName,
                },
              }
            : current
      );

      setProfileName(
        cleanName
      );

      setProfilePhone(
        cleanPhone
      );

      setProfileSuccess(
        "Profilul a fost actualizat."
      );

      if (cleanPhone) {
        setPhoneRequired(false);

        if (typeof window !== "undefined") {
          const params = new URLSearchParams(
            window.location.search
          );

          if (params.get("required") === "phone") {
            router.replace(
              "/dashboard?section=profile"
            );
          }
        }
      }

      setProfileSaving(
        false
      );

      await loadConversationDetails(
        conversations
      );
    };

  /*
    LOGOUT
  */

  const handleLogout =
    async () => {
      await supabase.auth.signOut();

      router.push("/");
      router.refresh();
    };

  /*
    ACTIVEAZĂ / DEZACTIVEAZĂ ANUNȚ
  */

  const toggleListing =
    async (listing) => {
      setError("");

      const newStatus =
        !listing.active;

      const { error } =
        await supabase
          .from("listings")
          .update({
            active: newStatus,
          })
          .eq(
            "id",
            listing.id
          )
          .eq(
            "user_id",
            user.id
          );

      if (error) {
        console.error(error);

        setError(
          "Statusul anunțului nu a putut fi modificat."
        );

        return;
      }

      setListings(
        (current) =>
          current.map(
            (item) =>
              item.id ===
              listing.id
                ? {
                    ...item,
                    active:
                      newStatus,
                  }
                : item
          )
      );

      setFavorites(
        (current) =>
          current.map(
            (item) =>
              item.id ===
              listing.id
                ? {
                    ...item,
                    active:
                      newStatus,
                  }
                : item
          )
      );
    };

  /*
    ELIMINĂ FAVORIT
  */

  const removeFavorite =
    async (listing) => {
      if (!user) return;

      setError("");

      const {
        error: deleteError,
      } = await supabase
        .from("favorites")
        .delete()
        .eq(
          "user_id",
          user.id
        )
        .eq(
          "listing_id",
          listing.id
        );

      if (deleteError) {
        console.error(
          "Eroare ștergere favorit:",
          deleteError
        );

        setError(
          "Anunțul nu a putut fi eliminat din favorite."
        );

        return;
      }

      setFavorites(
        (current) =>
          current.filter(
            (item) =>
              item.id !==
              listing.id
          )
      );
    };

  const activeListings =
    listings.filter(
      (listing) =>
        listing.active
    ).length;

  const menuItemStyle =
    (section) => ({
      width: "100%",
      border: "none",
      borderRadius: "9px",
      padding: "13px 14px",
      textAlign: "left",
      fontFamily: "inherit",
      fontSize: "14px",

      fontWeight:
        activeSection ===
        section
          ? "800"
          : "600",

      cursor: "pointer",

      background:
        activeSection ===
        section
          ? "#EFF6FF"
          : "transparent",

      color:
        activeSection ===
        section
          ? "#172554"
          : "#64748B",
    });

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
          borderBottom:
            "1px solid #E2E8F0",
          display: "flex",
          alignItems: "center",
          justifyContent:
            "space-between",
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
          <span
            style={{
              color: "#172554",
            }}
          >
            Student
          </span>

          <span
            style={{
              color: "#3B82F6",
            }}
          >
            Housing
          </span>
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
              border:
                "1px solid #E2E8F0",
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

      <div
        className="dashboard-layout"
        style={{
          minHeight:
            "calc(100vh - 73px)",
          display: "grid",
          gridTemplateColumns:
            "250px minmax(0, 1fr)",
        }}
      >
        {/* SIDEBAR */}

        <aside
          className="dashboard-sidebar"
          style={{
            background: "#FFFFFF",
            borderRight:
              "1px solid #E2E8F0",
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
              onClick={() => {
                setActiveSection(
                  "dashboard"
                );

                router.replace(
                  "/dashboard"
                );
              }}
              style={menuItemStyle(
                "dashboard"
              )}
            >
              Panou principal
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveSection(
                  "profile"
                );

                setPhoneRequired(false);

                router.replace(
                  "/dashboard?section=profile"
                );
              }}
              style={menuItemStyle(
                "profile"
              )}
            >
              Profilul meu
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveSection(
                  "listings"
                );

                router.replace(
                  "/dashboard?section=listings"
                );
              }}
              style={menuItemStyle(
                "listings"
              )}
            >
              Anunțurile tale
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveSection(
                  "messages"
                );

                if (
                  !selectedConversationId &&
                  conversations.length >
                    0
                ) {
                  openConversation(
                    conversations[0]
                      .id
                  );
                } else if (
                  selectedConversationId
                ) {
                  router.replace(
                    `/dashboard?section=messages&conversation=${selectedConversationId}`
                  );
                } else {
                  router.replace(
                    "/dashboard?section=messages"
                  );
                }
              }}
              style={menuItemStyle(
                "messages"
              )}
            >
              Mesaje
              {unreadMessagesCount >
              0
                ? ` (${unreadMessagesCount})`
                : ""}
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveSection(
                  "favorites"
                );

                router.replace(
                  "/dashboard?section=favorites"
                );
              }}
              style={menuItemStyle(
                "favorites"
              )}
            >
              Favorite
              {favorites.length > 0
                ? ` ${favorites.length}`
                : ""}
            </button>
          </nav>

          <div
            style={{
              marginTop: "25px",
              paddingTop: "22px",
              borderTop:
                "1px solid #EFF6FF",
            }}
          >
            <button
              type="button"
              onClick={() =>
                router.push(
                  "/adaugaproprietate"
                )
              }
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

        <section
          className="dashboard-content"
          style={{
            padding: "45px 5% 80px",
            minWidth: 0,
          }}
        >
          {activeSection ===
            "dashboard" && (
            <>
              <div
                style={{
                  marginBottom:
                    "32px",
                }}
              >
                <h1
                  style={{
                    margin: 0,
                    fontSize: "34px",
                    fontWeight: "800",
                    letterSpacing:
                      "-1px",
                    color: "#172554",
                  }}
                >
                  Bun venit
                </h1>

                <p
                  style={{
                    margin:
                      "9px 0 0",
                    color: "#64748B",
                    fontSize: "15px",
                  }}
                >
                  Administrează
                  anunțurile și
                  mesajele tale.
                </p>
              </div>

              <div
                className="stats-grid"
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(3, minmax(160px, 230px))",
                  gap: "16px",
                  marginBottom:
                    "42px",
                }}
              >
                <StatCard
                  number={
                    listings.length
                  }
                  title="Anunțuri"
                />

                <StatCard
                  number={
                    unreadMessagesCount
                  }
                  title="Mesaje"
                />

                <StatCard
                  number={
                    activeListings
                  }
                  title="Active"
                />
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  alignItems:
                    "center",
                  marginBottom:
                    "16px",
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

                {listings.length >
                  3 && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveSection(
                        "listings"
                      );

                      router.replace(
                        "/dashboard?section=listings"
                      );
                    }}
                    style={{
                      border: "none",
                      background:
                        "transparent",
                      color: "#3B82F6",
                      fontFamily:
                        "inherit",
                      fontSize:
                        "13px",
                      fontWeight:
                        "700",
                      cursor:
                        "pointer",
                    }}
                  >
                    Vezi toate
                  </button>
                )}
              </div>

              <ListingsList
                listings={listings.slice(
                  0,
                  3
                )}
                router={router}
                toggleListing={
                  toggleListing
                }
              />
            </>
          )}

          {activeSection ===
            "listings" && (
            <>
              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  alignItems:
                    "flex-end",
                  marginBottom:
                    "30px",
                  gap: "20px",
                }}
              >
                <div>
                  <h1
                    style={{
                      margin: 0,
                      fontSize:
                        "34px",
                      fontWeight:
                        "800",
                      letterSpacing:
                        "-1px",
                      color:
                        "#172554",
                    }}
                  >
                    Anunțurile tale
                  </h1>

                  <p
                    style={{
                      margin:
                        "9px 0 0",
                      color:
                        "#64748B",
                      fontSize:
                        "15px",
                    }}
                  >
                    Vezi și
                    administrează toate
                    anunțurile publicate.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      "/adaugaproprietate"
                    )
                  }
                  style={{
                    border: "none",
                    borderRadius:
                      "10px",
                    padding:
                      "12px 17px",
                    background:
                      "#172554",
                    color: "#FFFFFF",
                    fontFamily:
                      "inherit",
                    fontSize:
                      "13px",
                    fontWeight:
                      "800",
                    cursor:
                      "pointer",
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
                toggleListing={
                  toggleListing
                }
              />
            </>
          )}

          {activeSection ===
            "profile" && (
            <>
              <div
                style={{
                  marginBottom:
                    "28px",
                }}
              >
                <h1
                  style={{
                    margin: 0,
                    fontSize: "34px",
                    fontWeight: "800",
                    letterSpacing:
                      "-1px",
                    color: "#172554",
                  }}
                >
                  Profilul meu
                </h1>

                <p
                  style={{
                    margin:
                      "9px 0 0",
                    color: "#64748B",
                    fontSize: "15px",
                  }}
                >
                  Administrează datele
                  contului tău
                  StudentHousing.
                </p>
              </div>

              {phoneRequired && (
                <div
                  style={{
                    maxWidth: "620px",
                    marginBottom: "18px",
                    background: "#FFF7ED",
                    border:
                      "1px solid #FED7AA",
                    color: "#9A3412",
                    borderRadius: "12px",
                    padding: "15px 17px",
                    boxSizing: "border-box",
                  }}
                >
                  <div
                    style={{
                      fontSize: "13px",
                      fontWeight: "800",
                      marginBottom: "4px",
                    }}
                  >
                    Număr de telefon necesar
                  </div>

                  <div
                    style={{
                      fontSize: "12px",
                      lineHeight: "1.55",
                      fontWeight: "600",
                    }}
                  >
                    Actualizează-ți profilul cu un număr de telefon pentru a putea publica un anunț.
                  </div>
                </div>
              )}

              <div
                style={{
                  maxWidth: "620px",
                  background:
                    "#FFFFFF",
                  border:
                    "1px solid #E2E8F0",
                  borderRadius:
                    "16px",
                  padding: "28px",
                  boxShadow:
                    "0 8px 24px rgba(15, 23, 42, 0.05)",
                }}
              >
                <label
                  style={{
                    display: "block",
                    marginBottom:
                      "20px",
                  }}
                >
                  <span
                    style={{
                      display:
                        "block",
                      marginBottom:
                        "7px",
                      fontSize:
                        "12px",
                      fontWeight:
                        "800",
                      color:
                        "#334155",
                    }}
                  >
                    Nume
                  </span>

                  <input
                    type="text"
                    value={
                      profileName
                    }
                    onChange={(
                      event
                    ) =>
                      setProfileName(
                        event.target
                          .value
                      )
                    }
                    placeholder="Numele tău"
                    style={{
                      width: "100%",
                      height: "46px",
                      border:
                        "1px solid #CBD5E1",
                      borderRadius:
                        "10px",
                      padding:
                        "0 13px",
                      boxSizing:
                        "border-box",
                      outline: "none",
                      fontFamily:
                        "inherit",
                      fontSize:
                        "14px",
                      color:
                        "#0F172A",
                    }}
                  />
                </label>

                <label
                  style={{
                    display: "block",
                    marginBottom:
                      "20px",
                  }}
                >
                  <span
                    style={{
                      display:
                        "block",
                      marginBottom:
                        "7px",
                      fontSize:
                        "12px",
                      fontWeight:
                        "800",
                      color:
                        "#334155",
                    }}
                  >
                    Email
                  </span>

                  <input
                    type="email"
                    value={
                      user?.email || ""
                    }
                    readOnly
                    style={{
                      width: "100%",
                      height: "46px",
                      border:
                        "1px solid #E2E8F0",
                      borderRadius:
                        "10px",
                      padding:
                        "0 13px",
                      boxSizing:
                        "border-box",
                      outline: "none",
                      fontFamily:
                        "inherit",
                      fontSize:
                        "14px",
                      color:
                        "#64748B",
                      background:
                        "#F8FAFC",
                    }}
                  />
                </label>

                <label
                  style={{
                    display: "block",
                    marginBottom:
                      "22px",
                  }}
                >
                  <span
                    style={{
                      display:
                        "block",
                      marginBottom:
                        "7px",
                      fontSize:
                        "12px",
                      fontWeight:
                        "800",
                      color:
                        "#334155",
                    }}
                  >
                    Număr de telefon
                  </span>

                  <input
                    type="tel"
                    value={
                      profilePhone
                    }
                    onChange={(
                      event
                    ) =>
                      setProfilePhone(
                        event.target
                          .value
                      )
                    }
                    placeholder="Ex: 07xx xxx xxx"
                    style={{
                      width: "100%",
                      height: "46px",
                      border:
                        "1px solid #CBD5E1",
                      borderRadius:
                        "10px",
                      padding:
                        "0 13px",
                      boxSizing:
                        "border-box",
                      outline: "none",
                      fontFamily:
                        "inherit",
                      fontSize:
                        "14px",
                      color:
                        "#0F172A",
                    }}
                  />

                  <span
                    style={{
                      display:
                        "block",
                      marginTop:
                        "7px",
                      color:
                        "#94A3B8",
                      fontSize:
                        "11px",
                    }}
                  >
                    Telefonul va fi
                    folosit ulterior
                    pentru contactul
                    direct între
                    proprietar și
                    persoanele
                    interesate.
                  </span>
                </label>

                {profileSuccess && (
                  <div
                    style={{
                      marginBottom:
                        "16px",
                      background:
                        "#F0FDF4",
                      border:
                        "1px solid #BBF7D0",
                      color:
                        "#15803D",
                      borderRadius:
                        "10px",
                      padding:
                        "11px 13px",
                      fontSize:
                        "12px",
                      fontWeight:
                        "700",
                    }}
                  >
                    {profileSuccess}
                  </div>
                )}

                <button
                  type="button"
                  onClick={
                    saveProfile
                  }
                  disabled={
                    profileSaving
                  }
                  style={{
                    border: "none",
                    borderRadius:
                      "10px",
                    padding:
                      "12px 18px",
                    background:
                      profileSaving
                        ? "#94A3B8"
                        : "#172554",
                    color:
                      "#FFFFFF",
                    fontFamily:
                      "inherit",
                    fontSize:
                      "13px",
                    fontWeight:
                      "800",
                    cursor:
                      profileSaving
                        ? "not-allowed"
                        : "pointer",
                  }}
                >
                  {profileSaving
                    ? "Se salvează..."
                    : "Salvează modificările"}
                </button>
              </div>
            </>
          )}
          {activeSection ===
            "messages" && (
            <>
              <div
                style={{
                  marginBottom:
                    "28px",
                }}
              >
                <h1
                  style={{
                    margin: 0,
                    fontSize: "34px",
                    fontWeight: "800",
                    letterSpacing:
                      "-1px",
                    color: "#172554",
                  }}
                >
                  Mesaje
                </h1>

                <p
                  style={{
                    margin:
                      "9px 0 0",
                    color: "#64748B",
                    fontSize: "15px",
                  }}
                >
                  Discută direct cu
                  proprietarii sau cu
                  persoanele interesate
                  de anunțurile tale.
                </p>
              </div>

              {conversations.length ===
              0 ? (
                <EmptyCard
                  title="Nu ai conversații"
                  text="Când contactezi un proprietar sau cineva te contactează pentru un anunț, conversația va apărea aici."
                />
              ) : (
                <div
                  className="messages-layout"
                  style={{
                    width: "100%",
                    maxWidth:
                      "1050px",
                    height: "650px",
                    display: "grid",
                    gridTemplateColumns:
                      "320px minmax(0, 1fr)",
                    background:
                      "#FFFFFF",
                    border:
                      "1px solid #E2E8F0",
                    borderRadius:
                      "16px",
                    overflow:
                      "hidden",
                    boxShadow:
                      "0 8px 24px rgba(15, 23, 42, 0.05)",
                  }}
                >
                  <div
                    className="conversation-list"
                    style={{
                      borderRight:
                        "1px solid #E2E8F0",
                      overflowY:
                        "auto",
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        padding:
                          "18px 18px 14px",
                        borderBottom:
                          "1px solid #E2E8F0",
                        fontSize:
                          "13px",
                        fontWeight:
                          "800",
                        color:
                          "#172554",
                      }}
                    >
                      Conversații
                    </div>

                    {conversations.map(
                      (
                        conversation
                      ) => {
                        const listing =
                          conversation.listings;

                        const selected =
                          conversation.id ===
                          selectedConversationId;

                        const details =
                          conversationDetails[
                            conversation
                              .id
                          ] || {};

                        const lastMessage =
                          details.lastMessage;

                        const unreadCount =
                          details.unreadCount ||
                          0;

                        const hasUnread =
                          unreadCount > 0;

                        const otherUserName =
                          details.otherUserName ||
                          "Utilizator";

                        return (
                          <button
                            key={
                              conversation.id
                            }
                            type="button"
                            onClick={() =>
                              openConversation(
                                conversation.id
                              )
                            }
                            style={{
                              width:
                                "100%",
                              border:
                                "none",
                              borderBottom:
                                "1px solid #F1F5F9",
                              background:
                                selected
                                  ? "#EFF6FF"
                                  : hasUnread
                                  ? "#F8FBFF"
                                  : "#FFFFFF",
                              padding:
                                "15px",
                              cursor:
                                "pointer",
                              display:
                                "grid",
                              gridTemplateColumns:
                                "58px minmax(0, 1fr)",
                              gap:
                                "12px",
                              textAlign:
                                "left",
                              fontFamily:
                                "inherit",
                            }}
                          >
                            <div
                              style={{
                                width:
                                  "58px",
                                height:
                                  "58px",
                                borderRadius:
                                  "10px",
                                overflow:
                                  "hidden",
                                background:
                                  "#F1F5F9",
                              }}
                            >
                              {listing?.image_url ? (
                                <img
                                  src={
                                    listing.image_url
                                  }
                                  alt={
                                    listing?.title ||
                                    "Anunț"
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
                                      "#94A3B8",
                                    fontSize:
                                      "9px",
                                    textAlign:
                                      "center",
                                  }}
                                >
                                  Fără poză
                                </div>
                              )}
                            </div>

                            <div
                              style={{
                                minWidth:
                                  0,
                              }}
                            >
                              <div
                                style={{
                                  display:
                                    "flex",
                                  alignItems:
                                    "center",
                                  justifyContent:
                                    "space-between",
                                  gap:
                                    "8px",
                                }}
                              >
                                <div
                                  style={{
                                    minWidth:
                                      0,
                                    fontSize:
                                      "13px",
                                    fontWeight:
                                      hasUnread
                                        ? "900"
                                        : "800",
                                    color:
                                      "#172554",
                                    overflow:
                                      "hidden",
                                    textOverflow:
                                      "ellipsis",
                                    whiteSpace:
                                      "nowrap",
                                  }}
                                >
                                  {otherUserName}
                                </div>

                                {hasUnread && (
                                  <span
                                    style={{
                                      minWidth:
                                        "20px",
                                      height:
                                        "20px",
                                      padding:
                                        "0 6px",
                                      borderRadius:
                                        "999px",
                                      background:
                                        "#2563EB",
                                      color:
                                        "#FFFFFF",
                                      display:
                                        "inline-flex",
                                      alignItems:
                                        "center",
                                      justifyContent:
                                        "center",
                                      fontSize:
                                        "10px",
                                      fontWeight:
                                        "900",
                                      boxSizing:
                                        "border-box",
                                      flexShrink:
                                        0,
                                    }}
                                  >
                                    {unreadCount}
                                  </span>
                                )}
                              </div>

                              <div
                                style={{
                                  marginTop:
                                    "5px",
                                  color:
                                    hasUnread
                                      ? "#334155"
                                      : "#64748B",
                                  fontSize:
                                    "11px",
                                  fontWeight:
                                    hasUnread
                                      ? "800"
                                      : "600",
                                  overflow:
                                    "hidden",
                                  textOverflow:
                                    "ellipsis",
                                  whiteSpace:
                                    "nowrap",
                                }}
                              >
                                {lastMessage?.content ||
                                  "Conversație nouă"}
                              </div>

                              <div
                                style={{
                                  marginTop:
                                    "5px",
                                  color:
                                    "#94A3B8",
                                  fontSize:
                                    "10px",
                                  overflow:
                                    "hidden",
                                  textOverflow:
                                    "ellipsis",
                                  whiteSpace:
                                    "nowrap",
                                }}
                              >
                                {listing?.title ||
                                  "Anunț indisponibil"}

                                {lastMessage?.created_at
                                  ? ` · ${new Date(
                                      lastMessage.created_at
                                    ).toLocaleDateString(
                                      "ro-RO",
                                      {
                                        day: "2-digit",
                                        month:
                                          "2-digit",
                                      }
                                    )}`
                                  : ""}
                              </div>
                            </div>
                          </button>
                        );
                      }
                    )}
                  </div>

                  <div
                    className="chat-panel"
                    style={{
                      minWidth: 0,
                      display: "flex",
                      flexDirection: "column",
                      height: "650px",
                    }}
                  >
                    {!selectedConversation ? (
                      <div
                        style={{
                          flex: 1,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#94A3B8",
                          fontSize: "13px",
                        }}
                      >
                        Selectează o conversație.
                      </div>
                    ) : (
                      <>
                        {/* HEADER CHAT */}

                        <div
                          style={{
                            minHeight: "78px",
                            padding: "14px 20px",
                            boxSizing: "border-box",
                            borderBottom:
                              "1px solid #E2E8F0",
                            display: "flex",
                            alignItems: "center",
                            justifyContent:
                              "space-between",
                            gap: "15px",
                          }}
                        >
                          <div style={{ minWidth: 0 }}>
                            <div
                              style={{
                                fontSize: "15px",
                                fontWeight: "800",
                                color: "#172554",
                                overflow: "hidden",
                                textOverflow:
                                  "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {selectedConversation
                                .listings?.title ||
                                "Anunț indisponibil"}
                            </div>

                            <div
                              style={{
                                marginTop: "5px",
                                color: "#64748B",
                                fontSize: "11px",
                                overflow: "hidden",
                                textOverflow:
                                  "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {conversationDetails[
                                selectedConversation.id
                              ]?.otherUserName ||
                                "Utilizator"}

                              {selectedConversation
                                .listings?.city
                                ? ` · ${selectedConversation.listings.city}`
                                : ""}
                            </div>
                          </div>

                          {selectedConversation.listing_id && (
                            <button
                              type="button"
                              onClick={() =>
                                router.push(
                                  `/proprietate/${selectedConversation.listing_id}`
                                )
                              }
                              style={{
                                border:
                                  "1px solid #DBEAFE",
                                background:
                                  "#EFF6FF",
                                color: "#2563EB",
                                borderRadius:
                                  "9px",
                                padding:
                                  "9px 12px",
                                fontFamily:
                                  "inherit",
                                fontSize:
                                  "11px",
                                fontWeight:
                                  "800",
                                cursor:
                                  "pointer",
                                whiteSpace:
                                  "nowrap",
                              }}
                            >
                              Vezi anunțul
                            </button>
                          )}
                        </div>

                        {/* MESAJE */}

                        <div
                          className="messages-scroll"
                          style={{
                            flex: 1,
                            minHeight: 0,
                            overflowY: "auto",
                            padding: "22px",
                            background: "#F8FAFC",
                          }}
                        >
                          {messagesLoading ? (
                            <div
                              style={{
                                textAlign: "center",
                                color: "#94A3B8",
                                fontSize: "12px",
                                paddingTop: "30px",
                              }}
                            >
                              Se încarcă mesajele...
                            </div>
                          ) : messages.length ===
                            0 ? (
                            <div
                              style={{
                                height: "100%",
                                display: "flex",
                                flexDirection:
                                  "column",
                                alignItems: "center",
                                justifyContent:
                                  "center",
                                textAlign: "center",
                                color: "#94A3B8",
                              }}
                            >
                              <div
                                style={{
                                  fontSize: "14px",
                                  fontWeight: "800",
                                  color: "#64748B",
                                }}
                              >
                                Începe conversația
                              </div>

                              <div
                                style={{
                                  fontSize: "12px",
                                  marginTop: "5px",
                                }}
                              >
                                Trimite primul mesaj.
                              </div>
                            </div>
                          ) : (
                            <div
                              style={{
                                display: "flex",
                                flexDirection:
                                  "column",
                                gap: "10px",
                              }}
                            >
                              {messages.map(
                                (message) => {
                                  const mine =
                                    message.sender_id ===
                                    user?.id;

                                  return (
                                    <div
                                      key={message.id}
                                      style={{
                                        display:
                                          "flex",
                                        justifyContent:
                                          mine
                                            ? "flex-end"
                                            : "flex-start",
                                      }}
                                    >
                                      <div
                                        style={{
                                          maxWidth:
                                            "72%",
                                          background:
                                            mine
                                              ? "#172554"
                                              : "#FFFFFF",
                                          color: mine
                                            ? "#FFFFFF"
                                            : "#172554",
                                          border: mine
                                            ? "none"
                                            : "1px solid #E2E8F0",
                                          borderRadius:
                                            mine
                                              ? "15px 15px 4px 15px"
                                              : "15px 15px 15px 4px",
                                          padding:
                                            "10px 13px 8px",
                                          boxShadow:
                                            mine
                                              ? "none"
                                              : "0 2px 7px rgba(15,23,42,0.04)",
                                          wordBreak:
                                            "break-word",
                                        }}
                                      >
                                        <div
                                          style={{
                                            fontSize:
                                              "13px",
                                            lineHeight:
                                              "1.5",
                                            whiteSpace:
                                              "pre-wrap",
                                          }}
                                        >
                                          {
                                            message.content
                                          }
                                        </div>

                                        <div
                                          style={{
                                            marginTop:
                                              "5px",
                                            textAlign:
                                              "right",
                                            fontSize:
                                              "9px",
                                            color: mine
                                              ? "rgba(255,255,255,0.65)"
                                              : "#94A3B8",
                                          }}
                                        >
                                          {message.created_at
                                            ? new Date(
                                                message.created_at
                                              ).toLocaleTimeString(
                                                "ro-RO",
                                                {
                                                  hour: "2-digit",
                                                  minute:
                                                    "2-digit",
                                                }
                                              )
                                            : ""}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                }
                              )}
                            </div>
                          )}
                        </div>

                        {/* SCRIE MESAJ */}

                        <div
                          style={{
                            padding: "15px",
                            borderTop:
                              "1px solid #E2E8F0",
                            background: "#FFFFFF",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems:
                                "flex-end",
                              gap: "10px",
                            }}
                          >
                            <textarea
                              value={messageText}
                              onChange={(event) =>
                                setMessageText(
                                  event.target.value
                                )
                              }
                              onKeyDown={
                                handleMessageKeyDown
                              }
                              placeholder="Scrie un mesaj..."
                              maxLength={5000}
                              rows={1}
                              style={{
                                flex: 1,
                                minHeight: "43px",
                                maxHeight: "110px",
                                resize: "vertical",
                                border:
                                  "1px solid #CBD5E1",
                                borderRadius:
                                  "11px",
                                padding:
                                  "11px 13px",
                                boxSizing:
                                  "border-box",
                                outline: "none",
                                fontFamily:
                                  "inherit",
                                fontSize: "13px",
                                lineHeight: "1.5",
                                color: "#0F172A",
                              }}
                            />

                            <button
                              type="button"
                              onClick={sendMessage}
                              disabled={
                                sendingMessage ||
                                !messageText.trim()
                              }
                              style={{
                                height: "43px",
                                border: "none",
                                borderRadius:
                                  "10px",
                                padding:
                                  "0 18px",
                                background:
                                  sendingMessage ||
                                  !messageText.trim()
                                    ? "#CBD5E1"
                                    : "#172554",
                                color: "#FFFFFF",
                                fontFamily:
                                  "inherit",
                                fontSize: "12px",
                                fontWeight:
                                  "800",
                                cursor:
                                  sendingMessage ||
                                  !messageText.trim()
                                    ? "not-allowed"
                                    : "pointer",
                              }}
                            >
                              {sendingMessage
                                ? "Se trimite..."
                                : "Trimite"}
                            </button>
                          </div>

                          <div
                            style={{
                              marginTop: "6px",
                              color: "#94A3B8",
                              fontSize: "9px",
                            }}
                          >
                            Enter pentru trimitere ·
                            Shift + Enter pentru rând
                            nou
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* FAVORITE */}

          {activeSection ===
            "favorites" && (
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
                  Anunțurile pe care le-ai
                  salvat pentru a reveni
                  rapid la ele.
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
                  removeFavorite={
                    removeFavorite
                  }
                />
              )}
            </>
          )}

          {error && (
            <div
              style={{
                marginTop: "22px",
                background: "#FEF2F2",
                border:
                  "1px solid #FECACA",
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

      <style>{`
        @media (max-width: 900px) {
          .messages-layout {
            grid-template-columns: 260px minmax(0, 1fr) !important;
          }
        }

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

        @media (max-width: 700px) {
          .messages-layout {
            height: auto !important;
            grid-template-columns: 1fr !important;
          }

          .conversation-list {
            max-height: 250px !important;
            border-right: none !important;
            border-bottom: 1px solid #E2E8F0 !important;
          }

          .chat-panel {
            height: 570px !important;
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
          border:
            "1px solid #E2E8F0",
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
          Nu ai publicat încă niciun
          anunț
        </div>

        <div
          style={{
            color: "#64748B",
            fontSize: "13px",
            marginTop: "7px",
          }}
        >
          Publică primul tău anunț pentru
          a începe.
        </div>

        <button
          type="button"
          onClick={() =>
            router.push(
              "/adaugaproprietate"
            )
          }
          style={{
            marginTop: "18px",
            border: "none",
            borderRadius: "9px",
            padding: "11px 15px",
            background: "#172554",
            color: "#FFFFFF",
            fontFamily: "inherit",
            fontSize: "12px",
            fontWeight: "800",
            cursor: "pointer",
          }}
        >
          + Adaugă anunț
        </button>
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
            display: "grid",
            gridTemplateColumns:
              "150px minmax(0, 1fr)",
            minHeight: "145px",
            background: "#FFFFFF",
            border:
              "1px solid #E2E8F0",
            borderRadius: "14px",
            overflow: "hidden",
            boxShadow:
              "0 6px 18px rgba(15, 23, 42, 0.04)",
          }}
        >
          <div
            className="dashboard-listing-image"
            style={{
              width: "150px",
              minHeight: "145px",
              background: "#F1F5F9",
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
                  minHeight: "145px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#94A3B8",
                  fontSize: "11px",
                }}
              >
                Fără imagine
              </div>
            )}
          </div>

          <div
            style={{
              padding: "18px 20px",
              minWidth: 0,
            }}
          >
            <div
              className="listing-header"
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                alignItems:
                  "flex-start",
                gap: "15px",
              }}
            >
              <div
                style={{
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    flexWrap: "wrap",
                  }}
                >
                  <div
                    style={{
                      fontSize: "16px",
                      fontWeight: "800",
                      color: "#172554",
                    }}
                  >
                    {listing.title}
                  </div>

                  <span
                    style={{
                      display:
                        "inline-flex",
                      alignItems:
                        "center",
                      borderRadius:
                        "999px",
                      padding:
                        "4px 8px",
                      background:
                        listing.active
                          ? "#ECFDF5"
                          : "#F1F5F9",
                      color:
                        listing.active
                          ? "#047857"
                          : "#64748B",
                      fontSize:
                        "9px",
                      fontWeight:
                        "800",
                    }}
                  >
                    {listing.active
                      ? "ACTIV"
                      : "INACTIV"}
                  </span>
                </div>

                <div
                  style={{
                    marginTop: "7px",
                    color: "#64748B",
                    fontSize: "12px",
                  }}
                >
                  {listing.city}
                  {listing.address
                    ? ` · ${listing.address}`
                    : ""}
                </div>

                <div
                  style={{
                    marginTop: "12px",
                    display: "flex",
                    gap: "14px",
                    flexWrap: "wrap",
                    color: "#475569",
                    fontSize: "11px",
                    fontWeight: "600",
                  }}
                >
                  {listing.rooms ? (
                    <span>
                      {listing.rooms} camere
                    </span>
                  ) : null}

                  {listing.surface_m2 ? (
                    <span>
                      {listing.surface_m2} m²
                    </span>
                  ) : null}
                </div>
              </div>

              <div
                style={{
                  textAlign: "right",
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    fontSize: "17px",
                    fontWeight: "800",
                    color: "#172554",
                  }}
                >
                  {listing.price_monthly} €
                </div>

                <div
                  style={{
                    color: "#94A3B8",
                    fontSize: "10px",
                    marginTop: "2px",
                  }}
                >
                  / lună
                </div>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: "8px",
                flexWrap: "wrap",
                marginTop: "16px",
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
                  border:
                    "1px solid #DBEAFE",
                  background: "#EFF6FF",
                  color: "#2563EB",
                  borderRadius: "8px",
                  padding: "8px 11px",
                  fontFamily: "inherit",
                  fontSize: "10px",
                  fontWeight: "800",
                  cursor: "pointer",
                }}
              >
                Vezi anunțul
              </button>

              <button
                type="button"
                onClick={() =>
                  toggleListing(listing)
                }
                style={{
                  border:
                    "1px solid #E2E8F0",
                  background: "#FFFFFF",
                  color: "#475569",
                  borderRadius: "8px",
                  padding: "8px 11px",
                  fontFamily: "inherit",
                  fontSize: "10px",
                  fontWeight: "800",
                  cursor: "pointer",
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
          key={listing.favoriteId}
          className="favorite-card"
          style={{
            background: "#FFFFFF",
            border:
              "1px solid #E2E8F0",
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
                  justifyContent:
                    "center",
                  color: "#94A3B8",
                  fontSize: "11px",
                }}
              >
                Fără fotografie
              </div>
            )}
          </div>

          <div style={{ minWidth: 0 }}>
            <div
              className="favorite-header"
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                alignItems:
                  "flex-start",
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
                ).toLocaleString(
                  "ro-RO"
                )}{" "}
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
                  background:
                    listing.active
                      ? "#DCFCE7"
                      : "#F1F5F9",
                  color: listing.active
                    ? "#15803D"
                    : "#64748B",
                  borderRadius:
                    "100px",
                  padding: "5px 8px",
                  fontSize: "10px",
                  fontWeight: "800",
                }}
              >
                {listing.active
                  ? "Activ"
                  : "Inactiv"}
              </span>

              {listing.rooms && (
                <span
                  style={{
                    color: "#64748B",
                    fontSize: "11px",
                    fontWeight: "600",
                  }}
                >
                  {listing.rooms} camere
                </span>
              )}

              {listing.surface_m2 && (
                <span
                  style={{
                    color: "#64748B",
                    fontSize: "11px",
                    fontWeight: "600",
                  }}
                >
                  {listing.surface_m2} m²
                </span>
              )}
            </div>

            <div
              style={{
                display: "flex",
                gap: "8px",
                flexWrap: "wrap",
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
                style={{
                  border:
                    "1px solid #DBEAFE",
                  background: "#EFF6FF",
                  color: "#2563EB",
                  borderRadius: "8px",
                  padding: "7px 10px",
                  fontFamily: "inherit",
                  fontSize: "10px",
                  fontWeight: "800",
                  cursor: "pointer",
                }}
              >
                Vezi anunțul
              </button>

              <button
                type="button"
                onClick={() =>
                  removeFavorite(
                    listing
                  )
                }
                style={{
                  border:
                    "1px solid #FECACA",
                  background: "#FEF2F2",
                  color: "#B91C1C",
                  borderRadius: "8px",
                  padding: "7px 10px",
                  fontFamily: "inherit",
                  fontSize: "10px",
                  fontWeight: "800",
                  cursor: "pointer",
                }}
              >
                Elimină din favorite
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/*
  EMPTY CARD
*/

function EmptyCard({
  title,
  text,
}) {
  return (
    <div
      style={{
        maxWidth: "850px",
        background: "#FFFFFF",
        border:
          "1px solid #E2E8F0",
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
          marginTop: "7px",
          lineHeight: "1.6",
        }}
      >
        {text}
      </div>
    </div>
  );
}
          
