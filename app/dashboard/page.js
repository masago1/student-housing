"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

export default function DashboardPage() {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [listings, setListings] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [listingToDelete, setListingToDelete] = useState(null);
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
    ȘTERGE ANUNȚ
  */

  const deleteListing =
    (listing) => {
      if (!user?.id || !listing?.id) {
        return;
      }

      setListingToDelete(listing);
    };

  const confirmDeleteListing =
    async () => {
      if (!user?.id || !listingToDelete?.id) {
        return;
      }

      setError("");

      const { error: deleteError } =
        await supabase
          .from("listings")
          .delete()
          .eq("id", listingToDelete.id)
          .eq("user_id", user.id);

      if (deleteError) {
        console.error(
          "Eroare ștergere anunț:",
          deleteError
        );

        setError(
          "Anunțul nu a putut fi șters."
        );

        return;
      }

      setListings((current) =>
        current.filter(
          (item) => item.id !== listingToDelete.id
        )
      );

      setFavorites((current) =>
        current.filter(
          (item) => item.id !== listingToDelete.id
        )
      );

      setListingToDelete(null);
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
        fontFamily:
          "Inter, Arial, sans-serif",
        color: "#172554",
      }}
    >
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
            fontSize: "22px",
            fontWeight: "900",
            letterSpacing: "-0.7px",
          }}
        >
          <span
            style={{
              color: "#172554",
            }}
          >
            shaus
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
              onClick={() => {
                if (!profilePhone.trim()) {
                  setPhoneRequired(true);
                  setActiveSection("profile");

                  router.push(
                    "/dashboard?section=profile&required=phone"
                  );

                  return;
                }

                router.push(
                  "/adaugaproprietate"
                );
              }}
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
            padding: "28px 5% 80px",
            minWidth: 0,
          }}
        >
          {/* BUTON GLOBAL ÎNAPOI */}

          <div
            style={{
              width: "100%",
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center",
              marginBottom: "18px",
            }}
          >
            <button
              type="button"
              onClick={() => router.back()}
              aria-label="Înapoi"
              style={{
                height: "38px",
                padding: "0 13px",
                border: "1px solid #E2E8F0",
                borderRadius: "9px",
                background: "#FFFFFF",
                color: "#172554",
                fontFamily: "inherit",
                fontSize: "13px",
                fontWeight: "700",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "7px",
                boxShadow:
                  "0 4px 12px rgba(15, 23, 42, 0.04)",
              }}
            >
              <span
                style={{
                  fontSize: "18px",
                  lineHeight: 1,
                }}
              >
                ←
              </span>

              Înapoi
            </button>
          </div>

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
                  {profileName?.trim()
                    ? `, ${profileName.trim()}!`
                    : "!"}
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
                deleteListing={
                  deleteListing
                }
                profilePhone={
                  profilePhone
                }
                setPhoneRequired={
                  setPhoneRequired
                }
                setActiveSection={
                  setActiveSection
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
                  onClick={() => {
                    if (
                      !profilePhone.trim()
                    ) {
                      setPhoneRequired(
                        true
                      );

                      setActiveSection(
                        "profile"
                      );

                      router.push(
                        "/dashboard?section=profile&required=phone"
                      );

                      return;
                    }

                    router.push(
                      "/adaugaproprietate"
                    );
                  }}
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
                deleteListing={
                  deleteListing
                }
                profilePhone={
                  profilePhone
                }
                setPhoneRequired={
                  setPhoneRequired
                }
                setActiveSection={
                  setActiveSection
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
                  shaus.
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
                      borderRadius: "10px",
                      padding: "11px 13px",
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
                                width: "58px",
                                height: "58px",
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
                                    listing.title ||
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
                                  }}
                                >
                                  Fără poză
                                </div>
                              )}
                            </div>

                            <div
                              style={{
                                minWidth: 0,
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
                                    overflow:
                                      "hidden",
                                    textOverflow:
                                      "ellipsis",
                                    whiteSpace:
                                      "nowrap",
                                    color:
                                      "#172554",
                                    fontSize:
                                      "13px",
                                    fontWeight:
                                      "800",
                                  }}
                                >
                                  {otherUserName}
                                </div>

                                {hasUnread && (
                                  <div
                                    style={{
                                      minWidth:
                                        "18px",
                                      height:
                                        "18px",
                                      padding:
                                        "0 5px",
                                      borderRadius:
                                        "999px",
                                      background:
                                        "#2563EB",
                                      color:
                                        "#FFFFFF",
                                      display:
                                        "flex",
                                      alignItems:
                                        "center",
                                      justifyContent:
                                        "center",
                                      fontSize:
                                        "9px",
                                      fontWeight:
                                        "800",
                                      flexShrink:
                                        0,
                                    }}
                                  >
                                    {unreadCount}
                                  </div>
                                )}
                              </div>

                              <div
                                style={{
                                  marginTop:
                                    "5px",
                                  color:
                                    "#64748B",
                                  fontSize:
                                    "11px",
                                  fontWeight:
                                    "600",
                                  overflow:
                                    "hidden",
                                  textOverflow:
                                    "ellipsis",
                                  whiteSpace:
                                    "nowrap",
                                }}
                              >
                                {listing?.title ||
                                  "Anunț"}
                              </div>

                              <div
                                style={{
                                  marginTop:
                                    "5px",
                                  color:
                                    hasUnread
                                      ? "#172554"
                                      : "#94A3B8",
                                  fontSize:
                                    "11px",
                                  fontWeight:
                                    hasUnread
                                      ? "700"
                                      : "500",
                                  overflow:
                                    "hidden",
                                  textOverflow:
                                    "ellipsis",
                                  whiteSpace:
                                    "nowrap",
                                }}
                              >
                                {lastMessage?.content ||
                                  "Niciun mesaj"}
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
                      display:
                        "flex",
                      flexDirection:
                        "column",
                      minWidth: 0,
                    }}
                  >
                    {selectedConversation ? (
                      <>
                        <div
                          style={{
                            padding:
                              "17px 20px",
                            borderBottom:
                              "1px solid #E2E8F0",
                            background:
                              "#FFFFFF",
                          }}
                        >
                          <div
                            style={{
                              color:
                                "#172554",
                              fontSize:
                                "14px",
                              fontWeight:
                                "800",
                            }}
                          >
                            {conversationDetails[
                              selectedConversation.id
                            ]?.otherUserName ||
                              "Utilizator"}
                          </div>

                          <div
                            style={{
                              marginTop:
                                "4px",
                              color:
                                "#64748B",
                              fontSize:
                                "11px",
                              fontWeight:
                                "600",
                            }}
                          >
                            {selectedConversation.listings?.title ||
                              "Anunț"}
                          </div>
                        </div>

                        <div
                          style={{
                            flex:
                              "1 1 auto",
                            overflowY:
                              "auto",
                            padding:
                              "20px",
                            background:
                              "#F8FAFC",
                            display:
                              "flex",
                            flexDirection:
                              "column",
                            gap:
                              "10px",
                          }}
                        >
                          {messagesLoading ? (
                            <div
                              style={{
                                color:
                                  "#64748B",
                                fontSize:
                                  "12px",
                                fontWeight:
                                  "600",
                              }}
                            >
                              Se încarcă mesajele...
                            </div>
                          ) : messages.length ===
                            0 ? (
                            <div
                              style={{
                                margin:
                                  "auto",
                                color:
                                  "#94A3B8",
                                fontSize:
                                  "12px",
                                fontWeight:
                                  "600",
                                textAlign:
                                  "center",
                              }}
                            >
                              Nu există încă mesaje.
                            </div>
                          ) : (
                            messages.map(
                              (message) => {
                                const isMine =
                                  message.sender_id ===
                                  user.id;

                                return (
                                  <div
                                    key={
                                      message.id
                                    }
                                    style={{
                                      display:
                                        "flex",
                                      justifyContent:
                                        isMine
                                          ? "flex-end"
                                          : "flex-start",
                                    }}
                                  >
                                    <div
                                      style={{
                                        maxWidth:
                                          "75%",
                                        padding:
                                          "10px 13px",
                                        borderRadius:
                                          isMine
                                            ? "14px 14px 4px 14px"
                                            : "14px 14px 14px 4px",
                                        background:
                                          isMine
                                            ? "#172554"
                                            : "#FFFFFF",
                                        color:
                                          isMine
                                            ? "#FFFFFF"
                                            : "#172554",
                                        fontSize:
                                          "12px",
                                        lineHeight:
                                          "1.5",
                                        boxShadow:
                                          "0 3px 10px rgba(15, 23, 42, 0.05)",
                                        whiteSpace:
                                          "pre-wrap",
                                        wordBreak:
                                          "break-word",
                                      }}
                                    >
                                      {message.content}
                                    </div>
                                  </div>
                                );
                              }
                            )
                          )}
                        </div>

                        <div
                          style={{
                            padding:
                              "14px",
                            borderTop:
                              "1px solid #E2E8F0",
                            background:
                              "#FFFFFF",
                          }}
                        >
                          <div
                            style={{
                              display:
                                "flex",
                              gap:
                                "9px",
                              alignItems:
                                "flex-end",
                            }}
                          >
                            <textarea
                              value={
                                messageText
                              }
                              onChange={(
                                event
                              ) =>
                                setMessageText(
                                  event.target
                                    .value
                                )
                              }
                              onKeyDown={
                                handleMessageKeyDown
                              }
                              placeholder="Scrie un mesaj..."
                              rows={2}
                              style={{
                                flex:
                                  "1 1 auto",
                                resize:
                                  "none",
                                border:
                                  "1px solid #CBD5E1",
                                borderRadius:
                                  "10px",
                                padding:
                                  "10px 12px",
                                fontFamily:
                                  "inherit",
                                fontSize:
                                  "12px",
                                color:
                                  "#0F172A",
                                outline:
                                  "none",
                              }}
                            />

                            <button
                              type="button"
                              onClick={
                                sendMessage
                              }
                              disabled={
                                sendingMessage
                              }
                              style={{
                                border:
                                  "none",
                                borderRadius:
                                  "10px",
                                padding:
                                  "10px 14px",
                                background:
                                  sendingMessage
                                    ? "#94A3B8"
                                    : "#172554",
                                color:
                                  "#FFFFFF",
                                fontFamily:
                                  "inherit",
                                fontSize:
                                  "12px",
                                fontWeight:
                                  "800",
                                cursor:
                                  sendingMessage
                                    ? "not-allowed"
                                    : "pointer",
                              }}
                            >
                              {sendingMessage
                                ? "..."
                                : "Trimite"}
                            </button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div
                        style={{
                          flex:
                            "1 1 auto",
                          display:
                            "flex",
                          alignItems:
                            "center",
                          justifyContent:
                            "center",
                          color:
                            "#94A3B8",
                          fontSize:
                            "12px",
                          fontWeight:
                            "600",
                        }}
                      >
                        Selectează o conversație.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {activeSection ===
            "favorites" && (
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
                  Favorite
                </h1>

                <p
                  style={{
                    margin:
                      "9px 0 0",
                    color: "#64748B",
                    fontSize: "15px",
                  }}
                >
                  Anunțurile pe care le-ai salvat.
                </p>
              </div>

              {favorites.length ===
              0 ? (
                <EmptyCard
                  title="Nu ai favorite"
                  text="Anunțurile salvate de tine vor apărea aici."
                />
              ) : (
                <div
                  style={{
                    display:
                      "grid",
                    gridTemplateColumns:
                      "repeat(auto-fill, minmax(280px, 1fr))",
                    gap:
                      "18px",
                  }}
                >
                  {favorites.map(
                    (listing) => (
                      <div
                        key={
                          listing.id
                        }
                        style={{
                          background:
                            "#FFFFFF",
                          border:
                            "1px solid #E2E8F0",
                          borderRadius:
                            "14px",
                          overflow:
                            "hidden",
                          boxShadow:
                            "0 5px 16px rgba(15, 23, 42, 0.04)",
                        }}
                      >
                        <div
                          style={{
                            height:
                              "190px",
                            background:
                              "#F1F5F9",
                            overflow:
                              "hidden",
                          }}
                        >
                          {listing.image_url ? (
                            <img
                              src={
                                listing.image_url
                              }
                              alt={
                                listing.title ||
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
                                  "12px",
                                fontWeight:
                                  "600",
                              }}
                            >
                              Fără poză
                            </div>
                          )}
                        </div>

                        <div
                          style={{
                            padding:
                              "17px",
                          }}
                        >
                          <div
                            style={{
                              color:
                                "#172554",
                              fontSize:
                                "15px",
                              fontWeight:
                                "800",
                            }}
                          >
                            {listing.title ||
                              "Anunț"}
                          </div>

                          <div
                            style={{
                              marginTop:
                                "6px",
                              color:
                                "#64748B",
                              fontSize:
                                "12px",
                              fontWeight:
                                "600",
                            }}
                          >
                            {listing.city ||
                              "Oraș necunoscut"}
                            {listing.address
                              ? ` • ${listing.address}`
                              : ""}
                          </div>

                          <div
                            style={{
                              marginTop:
                                "10px",
                              color:
                                "#172554",
                              fontSize:
                                "13px",
                              fontWeight:
                                "800",
                            }}
                          >
                            {listing.price_monthly
                              ? `${listing.price_monthly} € / lună`
                              : "Preț la cerere"}
                          </div>

                          <div
                            style={{
                              marginTop:
                                "14px",
                              display:
                                "flex",
                              justifyContent:
                                "space-between",
                              alignItems:
                                "center",
                              gap:
                                "10px",
                            }}
                          >
                            <button
                              type="button"
                              onClick={() =>
                                router.push(
                                  `/chirii/${encodeURIComponent(
                                    String(
                                      listing.city ||
                                        ""
                                    ).toLowerCase()
                                  )}`
                                )
                              }
                              style={{
                                border:
                                  "1px solid #E2E8F0",
                                background:
                                  "#FFFFFF",
                                borderRadius:
                                  "9px",
                                padding:
                                  "9px 12px",
                                color:
                                  "#172554",
                                fontFamily:
                                  "inherit",
                                fontSize:
                                  "11px",
                                fontWeight:
                                  "800",
                                cursor:
                                  "pointer",
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
                                background:
                                  "#FEF2F2",
                                borderRadius:
                                  "9px",
                                padding:
                                  "9px 12px",
                                color:
                                  "#DC2626",
                                fontFamily:
                                  "inherit",
                                fontSize:
                                  "11px",
                                fontWeight:
                                  "800",
                                cursor:
                                  "pointer",
                              }}
                            >
                              Elimină
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}
            </>
          )}

          {error && (
            <div
              style={{
                position:
                  "fixed",
                left: "50%",
                bottom:
                  "22px",
                transform:
                  "translateX(-50%)",
                background:
                  "#FEF2F2",
                border:
                  "1px solid #FECACA",
                color:
                  "#B91C1C",
                borderRadius:
                  "10px",
                padding:
                  "11px 15px",
                fontSize:
                  "12px",
                fontWeight:
                  "700",
                boxShadow:
                  "0 8px 24px rgba(15, 23, 42, 0.10)",
                zIndex:
                  9998,
              }}
            >
              {error}
            </div>
          )}

          <style>{`
        @media (max-width: 900px) {
          .dashboard-layout {
            grid-template-columns: 1fr !important;
          }

          .dashboard-sidebar {
            border-right: none !important;
            border-bottom: 1px solid #E2E8F0;
          }

          .stats-grid {
            grid-template-columns: repeat(3, 1fr) !important;
          }

          .messages-layout {
            grid-template-columns: 260px minmax(0, 1fr) !important;
          }
        }

        @media (max-width: 650px) {
          .stats-grid {
            grid-template-columns: 1fr !important;
          }

          .messages-layout {
            grid-template-columns: 1fr !important;
            height: auto !important;
          }

          .conversation-list {
            border-right: none !important;
            border-bottom: 1px solid #E2E8F0;
            max-height: 280px;
          }

          .chat-panel {
            min-height: 520px;
          }
        }
      `}</style>

      {listingToDelete && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            zIndex: 9999,
            boxSizing: "border-box",
          }}
          onClick={() => setListingToDelete(null)}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "430px",
              background: "#FFFFFF",
              borderRadius: "16px",
              padding: "26px",
              boxSizing: "border-box",
              boxShadow: "0 20px 50px rgba(15, 23, 42, 0.20)",
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div
              style={{
                color: "#172554",
                fontSize: "19px",
                fontWeight: "800",
                marginBottom: "9px",
              }}
            >
              Sigur vrei să ștergi anunțul?
            </div>

            <div
              style={{
                color: "#64748B",
                fontSize: "13px",
                lineHeight: "1.55",
                marginBottom: "22px",
              }}
            >
              Anunțul „{listingToDelete.title || "Anunț"}” va fi șters definitiv. Această acțiune nu poate fi anulată.
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
              }}
            >
              <button
                type="button"
                onClick={() => setListingToDelete(null)}
                style={{
                  border: "1px solid #E2E8F0",
                  background: "#FFFFFF",
                  borderRadius: "9px",
                  padding: "10px 15px",
                  color: "#172554",
                  fontFamily: "inherit",
                  fontSize: "12px",
                  fontWeight: "800",
                  cursor: "pointer",
                }}
              >
                Anulează
              </button>

              <button
                type="button"
                onClick={confirmDeleteListing}
                style={{
                  border: "none",
                  background: "#DC2626",
                  borderRadius: "9px",
                  padding: "10px 15px",
                  color: "#FFFFFF",
                  fontFamily: "inherit",
                  fontSize: "12px",
                  fontWeight: "800",
                  cursor: "pointer",
                }}
              >
                Șterge anunțul
              </button>
            </div>
          </div>
        </div>
      )}

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
        borderRadius: "14px",
        padding: "20px",
        boxShadow:
          "0 5px 16px rgba(15, 23, 42, 0.04)",
      }}
    >
      <div
        style={{
          color: "#172554",
          fontSize: "27px",
          lineHeight: 1,
          fontWeight: "900",
        }}
      >
        {number}
      </div>

      <div
        style={{
          marginTop: "8px",
          color: "#64748B",
          fontSize: "12px",
          fontWeight: "700",
        }}
      >
        {title}
      </div>
    </div>
  );
}

/*
  LISTA ANUNȚURI
*/

function ListingsList({
  listings,
  router,
  toggleListing,
  deleteListing,
  profilePhone,
  setPhoneRequired,
  setActiveSection,
}) {
  if (listings.length === 0) {
    return (
      <div
        style={{
          maxWidth: "900px",
          background: "#FFFFFF",
          border: "1px solid #E2E8F0",
          borderRadius: "14px",
          padding: "35px",
          textAlign: "center",
          boxShadow: "0 5px 16px rgba(15, 23, 42, 0.04)",
        }}
      >
        <div
          style={{
            color: "#172554",
            fontSize: "17px",
            fontWeight: "800",
          }}
        >
          Nu ai încă anunțuri
        </div>

        <div
          style={{
            marginTop: "7px",
            color: "#64748B",
            fontSize: "13px",
            lineHeight: "1.55",
          }}
        >
          Publică primul tău anunț pentru a-l vedea aici.
        </div>

        <button
          type="button"
          onClick={() => {
            if (!profilePhone.trim()) {
              setPhoneRequired(true);
              setActiveSection("profile");
              router.push(
                "/dashboard?section=profile&required=phone"
              );
              return;
            }

            router.push("/adaugaproprietate");
          }}
          style={{
            marginTop: "18px",
            border: "none",
            borderRadius: "10px",
            padding: "11px 16px",
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
        display: "grid",
        gridTemplateColumns:
          "repeat(auto-fill, minmax(280px, 1fr))",
        gap: "18px",
      }}
    >
      {listings.map((listing) => (
        <div
          key={listing.id}
          style={{
            background: "#FFFFFF",
            border: "1px solid #E2E8F0",
            borderRadius: "14px",
            overflow: "hidden",
            boxShadow:
              "0 5px 16px rgba(15, 23, 42, 0.04)",
          }}
        >
          <div
            style={{
              height: "190px",
              background: "#F1F5F9",
              overflow: "hidden",
            }}
          >
            {listing.image_url ? (
              <img
                src={listing.image_url}
                alt={listing.title || "Anunț"}
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
                  fontSize: "12px",
                  fontWeight: "600",
                }}
              >
                Fără poză
              </div>
            )}
          </div>

          <div
            style={{
              padding: "17px",
            }}
          >
            <div
              style={{
                color: "#172554",
                fontSize: "15px",
                fontWeight: "800",
              }}
            >
              {listing.title || "Anunț"}
            </div>

            <div
              style={{
                marginTop: "6px",
                color: "#64748B",
                fontSize: "12px",
                fontWeight: "600",
              }}
            >
              {listing.city || "Oraș necunoscut"}
              {listing.address
                ? ` • ${listing.address}`
                : ""}
            </div>

            <div
              style={{
                marginTop: "10px",
                color: "#172554",
                fontSize: "13px",
                fontWeight: "800",
              }}
            >
              {listing.price_monthly
                ? `${listing.price_monthly} € / lună`
                : "Preț la cerere"}
            </div>

            <div
              style={{
                marginTop: "14px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <button
                type="button"
                onClick={() =>
                  router.push(
                    `/chirii/${encodeURIComponent(
                      String(
                        listing.city || ""
                      ).toLowerCase()
                    )}`
                  )
                }
                style={{
                  border: "1px solid #E2E8F0",
                  background: "#FFFFFF",
                  borderRadius: "9px",
                  padding: "9px 12px",
                  color: "#172554",
                  fontFamily: "inherit",
                  fontSize: "11px",
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
                    listing.active
                      ? "1px solid #FED7AA"
                      : "1px solid #BBF7D0",
                  background:
                    listing.active
                      ? "#FFF7ED"
                      : "#F0FDF4",
                  borderRadius: "9px",
                  padding: "9px 12px",
                  color:
                    listing.active
                      ? "#C2410C"
                      : "#15803D",
                  fontFamily: "inherit",
                  fontSize: "11px",
                  fontWeight: "800",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {listing.active ? "Dezactivează" : "Activează"}
              </button>

              <button
                type="button"
                onClick={() => deleteListing(listing)}
                style={{
                  border: "1px solid #FECACA",
                  background: "#FEF2F2",
                  borderRadius: "9px",
                  padding: "9px 12px",
                  color: "#DC2626",
                  fontFamily: "inherit",
                  fontSize: "11px",
                  fontWeight: "800",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                ✕ Șterge anunțul
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
        borderRadius: "14px",
        padding: "35px",
        textAlign: "center",
        boxShadow:
          "0 5px 16px rgba(15, 23, 42, 0.04)",
      }}
    >
      <div
        style={{
          color: "#172554",
          fontSize: "17px",
          fontWeight: "800",
        }}
      >
        {title}
      </div>

      <div
        style={{
          marginTop: "7px",
          color: "#64748B",
          fontSize: "13px",
          lineHeight: "1.55",
        }}
      >
        {text}
      </div>
    </div>
  );
}
// CONTINUARE COD — 2/3

// acest bloc continuă exact după partea 1/3
// și păstrează restul funcționalităților existente

// MESAJELOR
// PROFIL
// FAVORITE
// STILURI RESPONSIVE

// Pentru a nu modifica accidental codul original, partea 2/3 trebuie
// continuată din fișierul original exact de la linia următoare.
// CONTINUARE COD — 3/3

// Păstrează exact restul codului original de aici.
// Nu trebuie adăugat nimic suplimentar.

// IMPORTANT:
// Modificarea pentru confirmarea ștergerii este deja făcută în partea 1/3:
// deleteListing() deschide confirmarea din pagină,
// iar confirmDeleteListing() efectuează ștergerea doar după confirmare.
