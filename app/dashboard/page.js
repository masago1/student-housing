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
  const [profileNickname, setProfileNickname] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState("");
  const [phoneRequired, setPhoneRequired] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // SINGURA ADĂUGARE: confirmare ieșire din cont
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [listingToDelete, setListingToDelete] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);

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
          .select("name, nickname, phone")
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
        setProfileNickname(
          profileData?.nickname ||
            user.user_metadata?.nickname ||
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
              .select("id, nickname, name")
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
          ] =
            profile.nickname?.trim() ||
            profile.name ||
            "Utilizator";
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

      const cleanNickname =
        profileNickname.trim();

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

      if (!cleanNickname) {
        setError(
          "Introdu un nickname."
        );

        return;
      }

      if (
        cleanNickname.length < 3 ||
        cleanNickname.length > 30
      ) {
        setError(
          "Nickname-ul trebuie să aibă între 3 și 30 de caractere."
        );

        return;
      }

      if (!/^[a-zA-Z0-9._-]+$/.test(cleanNickname)) {
        setError(
          "Nickname-ul poate conține doar litere, cifre, punct, _ și -."
        );

        return;
      }

      const {
        data: nicknameOwner,
        error: nicknameCheckError,
      } = await supabase
        .from("profiles")
        .select("id")
        .ilike("nickname", cleanNickname)
        .neq("id", user.id)
        .maybeSingle();

      if (nicknameCheckError) {
        console.error(
          "Eroare verificare nickname:",
          nicknameCheckError
        );

        setError(
          "Nickname-ul nu a putut fi verificat."
        );

        return;
      }

      if (nicknameOwner) {
        setError(
          "Acest nickname este deja folosit. Alege altul."
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
            nickname: cleanNickname,
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
          profileError.code === "23505"
            ? (
                profileError.message
                  ?.toLowerCase()
                  .includes("phone")
                ? "Acest număr de telefon este deja asociat altui cont."
                : "Acest nickname este deja folosit. Alege altul."
              )
            : "Profilul nu a putut fi salvat."
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
            nickname: cleanNickname,
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
                  nickname:
                    cleanNickname,
                },
              }
            : current
      );

      setProfileName(
        cleanName
      );

      setProfileNickname(
        cleanNickname
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
    SCHIMBĂ PAROLA
  */

  const changePassword =
    async () => {
      setPasswordSuccess("");
      setPasswordError("");

      if (!newPassword) {
        setPasswordError(
          "Introdu parola nouă."
        );

        return;
      }

      if (newPassword.length < 6) {
        setPasswordError(
          "Parola trebuie să aibă cel puțin 6 caractere."
        );

        return;
      }

      if (!confirmNewPassword) {
        setPasswordError(
          "Confirmă parola nouă."
        );

        return;
      }

      if (
        newPassword !==
        confirmNewPassword
      ) {
        setPasswordError(
          "Parolele nu coincid."
        );

        return;
      }

      setPasswordSaving(true);

      const {
        error: passwordUpdateError,
      } =
        await supabase.auth.updateUser({
          password: newPassword,
        });

      if (passwordUpdateError) {
        console.error(
          "Eroare schimbare parolă:",
          passwordUpdateError
        );

        setPasswordError(
  passwordUpdateError.message
    ?.toLowerCase()
    .includes("different from the old password")
    ? "Parola nouă trebuie să fie diferită de parola veche."
    : "Parola nu a putut fi schimbată."
);

        setPasswordSaving(false);

        return;
      }

      setNewPassword("");
      setConfirmNewPassword("");

      setPasswordSuccess(
        "Parola a fost schimbată cu succes."
      );

      setPasswordSaving(false);
    };

  /*
    LOGOUT
  */

  const handleLogout = async () => {
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error("Eroare la deconectare:", error);
    return;
  }

  setUser(null);
  setLogoutConfirmOpen(false);

  window.location.replace("/");
};

  // SINGURA ADĂUGARE: deschide confirmarea înainte de logout
  const requestLogout = () => {
    setLogoutConfirmOpen(true);
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
    async (listing) => {
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

      const listing = listingToDelete;

      setError("");

      const { error: deleteError } =
        await supabase
          .from("listings")
          .delete()
          .eq("id", listing.id)
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
          (item) => item.id !== listing.id
        )
      );

      setFavorites((current) =>
        current.filter(
          (item) => item.id !== listing.id
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
      className="dashboard-page"
      style={{
        minHeight: "100vh",
        background: "#F4F7FB",
        fontFamily:
          "Inter, Arial, sans-serif",
        color: "#172554",
      }}
    >
      <header
        className="dashboard-header"
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
          className="dashboard-header-account"
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
            onClick={requestLogout}
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

        <button
          type="button"
          className="dashboard-mobile-menu"
          aria-expanded={mobileMenuOpen}
          aria-controls="dashboard-navigation"
          onClick={() => setMobileMenuOpen((open) => !open)}
        >
          <span>Meniu cont</span>
          <span aria-hidden="true">{mobileMenuOpen ? "−" : "+"}</span>
        </button>

        <aside
          id="dashboard-navigation"
          className={`dashboard-sidebar${mobileMenuOpen ? " is-open" : ""}`}
          onClick={(event) => {
            if (event.target.closest("button")) setMobileMenuOpen(false);
          }}
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
                setMobileChatOpen(false);
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
                  {profileNickname?.trim()
                    ? `, ${profileNickname.trim()}!`
                    : profileName?.trim()
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
                className="dashboard-section-heading"
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
                className="dashboard-section-heading"
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
                    border: "none",
                    borderRadius: "10px",
                    padding: "11px 15px",
                    background: "#172554",
                    color: "#FFFFFF",
                    fontFamily: "inherit",
                    fontSize: "12px",
                    fontWeight: "800",
                    cursor: "pointer",
                    boxShadow:
                      "0 6px 16px rgba(23, 37, 84, 0.14)",
                    whiteSpace: "nowrap",
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
                  Profilul meu
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
                  Actualizează
                  informațiile
                  contului tău.
                </p>
              </div>

              {phoneRequired && (
                <div
                  style={{
                    maxWidth:
                      "620px",
                    marginBottom:
                      "18px",
                    background:
                      "#EFF6FF",
                    border:
                      "1px solid #BFDBFE",
                    color:
                      "#1E3A8A",
                    borderRadius:
                      "12px",
                    padding:
                      "14px 16px",
                    fontSize:
                      "13px",
                    fontWeight:
                      "700",
                    lineHeight:
                      "1.5",
                  }}
                >
                  Pentru a publica
                  un anunț,
                  actualizează
                  profilul cu
                  numărul tău de
                  telefon.
                </div>
              )}

              <div
                className="dashboard-profile-card"
                style={{
                  maxWidth:
                    "620px",
                  background:
                    "#FFFFFF",
                  border:
                    "1px solid #E2E8F0",
                  borderRadius:
                    "14px",
                  padding:
                    "24px",
                  boxShadow:
                    "0 5px 16px rgba(15, 23, 42, 0.04)",
                }}
              >
                <div
                  style={{
                    display:
                      "grid",
                    gap: "18px",
                  }}
                >
                  <div>
                    <label
                      style={{
                        display:
                          "block",
                        marginBottom:
                          "7px",
                        color:
                          "#172554",
                        fontSize:
                          "12px",
                        fontWeight:
                          "800",
                      }}
                    >
                      Nume
                    </label>

                    <input
                      type="text"
                      value={
                        profileName
                      }
                      onChange={(
                        event
                      ) => {
                        setProfileName(
                          event
                            .target
                            .value
                        );

                        setProfileSuccess(
                          ""
                        );
                      }}
                      placeholder="Numele tău"
                      style={{
                        width:
                          "100%",
                        height:
                          "44px",
                        boxSizing:
                          "border-box",
                        border:
                          "1px solid #CBD5E1",
                        borderRadius:
                          "9px",
                        padding:
                          "0 12px",
                        color:
                          "#172554",
                        fontFamily:
                          "inherit",
                        fontSize:
                          "13px",
                        outline:
                          "none",
                      }}
                    />
                  </div>

                  <div>
                    <label
                      style={{
                        display:
                          "block",
                        marginBottom:
                          "7px",
                        color:
                          "#172554",
                        fontSize:
                          "12px",
                        fontWeight:
                          "800",
                      }}
                    >
                      Nickname
                    </label>

                    <input
                      type="text"
                      value={
                        profileNickname
                      }
                      onChange={(
                        event
                      ) => {
                        setProfileNickname(
                          event
                            .target
                            .value
                        );

                        setProfileSuccess(
                          ""
                        );
                      }}
                      placeholder="Ex: user123"
                      maxLength={30}
                      style={{
                        width:
                          "100%",
                        height:
                          "44px",
                        boxSizing:
                          "border-box",
                        border:
                          "1px solid #CBD5E1",
                        borderRadius:
                          "9px",
                        padding:
                          "0 12px",
                        color:
                          "#172554",
                        fontFamily:
                          "inherit",
                        fontSize:
                          "13px",
                        outline:
                          "none",
                      }}
                    />

                    <div
                      style={{
                        marginTop:
                          "7px",
                        color:
                          "#94A3B8",
                        fontSize:
                          "11px",
                        lineHeight:
                          "1.5",
                      }}
                    >
                      Acesta este numele tău public pe shaus. Va fi
                      vizibil celorlalți utilizatori.
                    </div>
                  </div>

                  <div>
                    <label
                      style={{
                        display:
                          "block",
                        marginBottom:
                          "7px",
                        color:
                          "#172554",
                        fontSize:
                          "12px",
                        fontWeight:
                          "800",
                      }}
                    >
                      Email
                    </label>

                    <input
                      type="email"
                      value={
                        user?.email ||
                        ""
                      }
                      disabled
                      style={{
                        width:
                          "100%",
                        height:
                          "44px",
                        boxSizing:
                          "border-box",
                        border:
                          "1px solid #E2E8F0",
                        borderRadius:
                          "9px",
                        padding:
                          "0 12px",
                        color:
                          "#64748B",
                        background:
                          "#F8FAFC",
                        fontFamily:
                          "inherit",
                        fontSize:
                          "13px",
                      }}
                    />
                  </div>

                  <div>
                    <label
                      style={{
                        display:
                          "block",
                        marginBottom:
                          "7px",
                        color:
                          "#172554",
                        fontSize:
                          "12px",
                        fontWeight:
                          "800",
                      }}
                    >
                      Număr de
                      telefon
                    </label>

                    <input
                      type="tel"
                      value={
                        profilePhone
                      }
                      onChange={(
                        event
                      ) => {
                        setProfilePhone(
                          event
                            .target
                            .value
                        );

                        setProfileSuccess(
                          ""
                        );
                      }}
                      placeholder="Ex: 07xxxxxxxx"
                      style={{
                        width:
                          "100%",
                        height:
                          "44px",
                        boxSizing:
                          "border-box",
                        border:
                          phoneRequired
                            ? "1px solid #60A5FA"
                            : "1px solid #CBD5E1",
                        borderRadius:
                          "9px",
                        padding:
                          "0 12px",
                        color:
                          "#172554",
                        fontFamily:
                          "inherit",
                        fontSize:
                          "13px",
                        outline:
                          "none",
                        boxShadow:
                          phoneRequired
                            ? "0 0 0 3px rgba(59, 130, 246, 0.08)"
                            : "none",
                      }}
                    />

                    <div
                      style={{
                        marginTop:
                          "7px",
                        color:
                          "#94A3B8",
                        fontSize:
                          "11px",
                        lineHeight:
                          "1.5",
                      }}
                    >
                      Numărul de
                      telefon este
                      necesar pentru
                      publicarea unui
                      anunț și poate fi
                      folosit de
                      persoanele
                      interesate pentru
                      a te contacta.
                    </div>
                  </div>

                  {profileSuccess && (
                    <div
                      style={{
                        background:
                          "#F0FDF4",
                        border:
                          "1px solid #BBF7D0",
                        color:
                          "#15803D",
                        borderRadius:
                          "9px",
                        padding:
                          "10px 12px",
                        fontSize:
                          "12px",
                        fontWeight:
                          "700",
                      }}
                    >
                      {
                        profileSuccess
                      }
                    </div>
                  )}

                  <div>
                    <button
                      type="button"
                      onClick={
                        saveProfile
                      }
                      disabled={
                        profileSaving
                      }
                      style={{
                        border:
                          "none",
                        borderRadius:
                          "9px",
                        padding:
                          "11px 16px",
                        background:
                          profileSaving
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
                          profileSaving
                            ? "default"
                            : "pointer",
                      }}
                    >
                      {profileSaving
                        ? "Se salvează..."
                        : "Salvează modificările"}
                    </button>
                  </div>

                  {/* SCHIMBĂ PAROLA */}

                  <div
                    style={{
                      marginTop:
                        "8px",
                      paddingTop:
                        "24px",
                      borderTop:
                        "1px solid #E2E8F0",
                    }}
                  >
                    <div
                      style={{
                        color:
                          "#172554",
                        fontSize:
                          "16px",
                        fontWeight:
                          "900",
                        marginBottom:
                          "6px",
                      }}
                    >
                      Schimbă parola
                    </div>

                    <div
                      style={{
                        color:
                          "#64748B",
                        fontSize:
                          "12px",
                        lineHeight:
                          "1.5",
                        marginBottom:
                          "18px",
                      }}
                    >
                      Introdu parola nouă
                      pe care vrei să o
                      folosești pentru
                      contul tău.
                    </div>

                    <div
                      style={{
                        display:
                          "grid",
                        gap: "18px",
                      }}
                    >
                      <div>
                        <label
                          style={{
                            display:
                              "block",
                            marginBottom:
                              "7px",
                            color:
                              "#172554",
                            fontSize:
                              "12px",
                            fontWeight:
                              "800",
                          }}
                        >
                          Parolă nouă
                        </label>

                        <input
                          type="password"
                          value={
                            newPassword
                          }
                          onChange={(
                            event
                          ) => {
                            setNewPassword(
                              event
                                .target
                                .value
                            );

                            setPasswordError(
                              ""
                            );

                            setPasswordSuccess(
                              ""
                            );
                          }}
                          autoComplete="new-password"
                          placeholder="Introdu parola nouă"
                          style={{
                            width:
                              "100%",
                            height:
                              "44px",
                            boxSizing:
                              "border-box",
                            border:
                              "1px solid #CBD5E1",
                            borderRadius:
                              "9px",
                            padding:
                              "0 12px",
                            color:
                              "#172554",
                            fontFamily:
                              "inherit",
                            fontSize:
                              "13px",
                            outline:
                              "none",
                          }}
                        />
                      </div>

                      <div>
                        <label
                          style={{
                            display:
                              "block",
                            marginBottom:
                              "7px",
                            color:
                              "#172554",
                            fontSize:
                              "12px",
                            fontWeight:
                              "800",
                          }}
                        >
                          Confirmă parola
                          nouă
                        </label>

                        <input
                          type="password"
                          value={
                            confirmNewPassword
                          }
                          onChange={(
                            event
                          ) => {
                            setConfirmNewPassword(
                              event
                                .target
                                .value
                            );

                            setPasswordError(
                              ""
                            );

                            setPasswordSuccess(
                              ""
                            );
                          }}
                          autoComplete="new-password"
                          placeholder="Reintrodu parola nouă"
                          style={{
                            width:
                              "100%",
                            height:
                              "44px",
                            boxSizing:
                              "border-box",
                            border:
                              "1px solid #CBD5E1",
                            borderRadius:
                              "9px",
                            padding:
                              "0 12px",
                            color:
                              "#172554",
                            fontFamily:
                              "inherit",
                            fontSize:
                              "13px",
                            outline:
                              "none",
                          }}
                        />
                      </div>

                      {passwordError && (
                        <div
                          style={{
                            background:
                              "#FEF2F2",
                            border:
                              "1px solid #FECACA",
                            color:
                              "#B91C1C",
                            borderRadius:
                              "9px",
                            padding:
                              "10px 12px",
                            fontSize:
                              "12px",
                            fontWeight:
                              "700",
                          }}
                        >
                          {
                            passwordError
                          }
                        </div>
                      )}

                      {passwordSuccess && (
                        <div
                          style={{
                            background:
                              "#F0FDF4",
                            border:
                              "1px solid #BBF7D0",
                            color:
                              "#15803D",
                            borderRadius:
                              "9px",
                            padding:
                              "10px 12px",
                            fontSize:
                              "12px",
                            fontWeight:
                              "700",
                          }}
                        >
                          {
                            passwordSuccess
                          }
                        </div>
                      )}

                      <div>
                        <button
                          type="button"
                          onClick={
                            changePassword
                          }
                          disabled={
                            passwordSaving
                          }
                          style={{
                            border:
                              "none",
                            borderRadius:
                              "9px",
                            padding:
                              "11px 16px",
                            background:
                              passwordSaving
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
                              passwordSaving
                                ? "default"
                                : "pointer",
                          }}
                        >
                          {passwordSaving
                            ? "Se schimbă..."
                            : "Schimbă parola"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeSection ===
            "messages" && (
            <>
              <div
                style={{
                  marginBottom:
                    "24px",
                }}
              >
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
                  Mesaje
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
                  text="Conversațiile tale vor apărea aici."
                />
              ) : (
                <div
                  className={`messages-layout${mobileChatOpen ? " is-mobile-chat-open" : ""}`}
                  style={{
                    display:
                      "grid",
                    gridTemplateColumns:
                      "310px minmax(0, 1fr)",
                    height:
                      "650px",
                    maxWidth:
                      "1100px",
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
                    className="conversation-list"
                    style={{
                      borderRight:
                        "1px solid #E2E8F0",
                      overflowY:
                        "auto",
                      background:
                        "#FFFFFF",
                    }}
                  >
                    {conversations.map(
                      (
                        conversation
                      ) => {
                        const listing =
                          conversation.listings;

                        const details =
                          conversationDetails[
                            conversation
                              .id
                          ] || {};

                        const otherUserName =
                          details.otherUserName ||
                          "Utilizator";

                        const lastMessage =
                          details.lastMessage;

                        const unreadCount =
                          details.unreadCount ||
                          0;

                        const hasUnread =
                          unreadCount >
                          0;

                        const selected =
                          selectedConversationId ===
                          conversation.id;

                        return (
                          <button
                            key={
                              conversation.id
                            }
                            type="button"
                            onClick={() => {
                              openConversation(
                                conversation.id
                              );
                              setMobileChatOpen(true);
                            }}
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
                                  : "#FFFFFF",
                              padding:
                                "14px",
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
                                      hasUnread
                                        ? "900"
                                        : "800",
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
                                        "9px",
                                      fontWeight:
                                        "900",
                                      boxSizing:
                                        "border-box",
                                      flexShrink:
                                        0,
                                    }}
                                  >
                                    {
                                      unreadCount
                                    }
                                  </span>
                                )}
                              </div>

                              <div
                                style={{
                                  marginTop:
                                    "4px",
                                  color:
                                    "#64748B",
                                  fontSize:
                                    "10px",
                                  fontWeight:
                                    "700",
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
                                      ? "#334155"
                                      : "#94A3B8",
                                  fontSize:
                                    "10px",
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
                                {lastMessage
                                  ? lastMessage.content
                                  : "Conversație nouă"}
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
                      display:
                        "flex",
                      flexDirection:
                        "column",
                      background:
                        "#F8FAFC",
                    }}
                  >
                    <button
                      type="button"
                      className="dashboard-mobile-chat-back"
                      aria-label="Înapoi la conversații"
                      onClick={() => setMobileChatOpen(false)}
                    >
                      Înapoi
                    </button>
                    {selectedConversation ? (
                      <>
                        <div
                          className="dashboard-chat-header"
                          style={{
                            padding:
                              "16px 20px",
                            background:
                              "#FFFFFF",
                            borderBottom:
                              "1px solid #E2E8F0",
                            display:
                              "flex",
                            alignItems:
                              "center",
                            justifyContent:
                              "space-between",
                            gap:
                              "15px",
                          }}
                        >
                          <div
                            style={{
                              minWidth:
                                0,
                            }}
                          >
                            <div
                              style={{
                                color:
                                  "#172554",
                                fontSize:
                                  "14px",
                                fontWeight:
                                  "900",
                              }}
                            >
                              {conversationDetails[
                                selectedConversation
                                  .id
                              ]?.otherUserName ||
                                "Utilizator"}
                            </div>

                            <div
                              style={{
                                marginTop:
                                  "3px",
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
                              {selectedConversation
                                .listings
                                ?.title ||
                                "Anunț"}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              const listingId =
                                selectedConversation
                                  .listing_id;

                              if (
                                listingId
                              ) {
                                router.push(
                                  `/proprietate/${listingId}`
                                );
                              }
                            }}
                            style={{
                              border:
                                "1px solid #CBD5E1",
                              background:
                                "#FFFFFF",
                              borderRadius:
                                "9px",
                              padding:
                                "8px 11px",
                              color:
                                "#172554",
                              fontFamily:
                                "inherit",
                              fontSize:
                                "10px",
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
                        </div>

                        <div
                          className="dashboard-chat-messages"
                          style={{
                            flex: 1,
                            overflowY:
                              "auto",
                            padding:
                              "20px",
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
                                  "#94A3B8",
                                fontSize:
                                  "12px",
                                textAlign:
                                  "center",
                                padding:
                                  "30px 0",
                              }}
                            >
                              Se încarcă
                              mesajele...
                            </div>
                          ) : messages.length ===
                            0 ? (
                            <div
                              style={{
                                color:
                                  "#94A3B8",
                                fontSize:
                                  "12px",
                                textAlign:
                                  "center",
                                padding:
                                  "30px 0",
                              }}
                            >
                              Nu există încă
                              mesaje în această
                              conversație.
                            </div>
                          ) : (
                            messages.map(
                              (
                                message
                              ) => {
                                const isMine =
                                  message.sender_id ===
                                  user?.id;

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
                                      className="dashboard-message-bubble"
                                      style={{
                                        maxWidth:
                                          "72%",
                                        padding:
                                          "10px 13px",
                                        borderRadius:
                                          isMine
                                            ? "13px 13px 3px 13px"
                                            : "13px 13px 13px 3px",
                                        background:
                                          isMine
                                            ? "#172554"
                                            : "#FFFFFF",
                                        color:
                                          isMine
                                            ? "#FFFFFF"
                                            : "#334155",
                                        border:
                                          isMine
                                            ? "none"
                                            : "1px solid #E2E8F0",
                                        fontSize:
                                          "12px",
                                        lineHeight:
                                          "1.55",
                                        whiteSpace:
                                          "pre-wrap",
                                        wordBreak:
                                          "break-word",
                                        boxShadow:
                                          isMine
                                            ? "none"
                                            : "0 2px 6px rgba(15, 23, 42, 0.03)",
                                      }}
                                    >
                                      {
                                        message.content
                                      }
                                    </div>
                                  </div>
                                );
                              }
                            )
                          )}
                        </div>

                        <div
                          className="dashboard-chat-composer"
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
                                  event
                                    .target
                                    .value
                                )
                              }
                              onKeyDown={
                                handleMessageKeyDown
                              }
                              placeholder="Scrie un mesaj..."
                              rows={1}
                              style={{
                                flex: 1,
                                minHeight:
                                  "42px",
                                maxHeight:
                                  "120px",
                                resize:
                                  "vertical",
                                boxSizing:
                                  "border-box",
                                border:
                                  "1px solid #CBD5E1",
                                borderRadius:
                                  "10px",
                                padding:
                                  "11px 12px",
                                outline:
                                  "none",
                                fontFamily:
                                  "inherit",
                                fontSize:
                                  "12px",
                                color:
                                  "#172554",
                                lineHeight:
                                  "1.5",
                              }}
                            />

                            <button
                              type="button"
                              onClick={
                                sendMessage
                              }
                              disabled={
                                sendingMessage ||
                                !messageText.trim()
                              }
                              style={{
                                height:
                                  "42px",
                                border:
                                  "none",
                                borderRadius:
                                  "9px",
                                padding:
                                  "0 16px",
                                background:
                                  sendingMessage ||
                                  !messageText.trim()
                                    ? "#94A3B8"
                                    : "#172554",
                                color:
                                  "#FFFFFF",
                                fontFamily:
                                  "inherit",
                                fontSize:
                                  "11px",
                                fontWeight:
                                  "800",
                                cursor:
                                  sendingMessage ||
                                  !messageText.trim()
                                    ? "default"
                                    : "pointer",
                              }}
                            >
                              {sendingMessage
                                ? "Se trimite..."
                                : "Trimite"}
                            </button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div
                        style={{
                          flex: 1,
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
                        }}
                      >
                        Selectează o
                        conversație.
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
                  Favorite
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
                  Anunțurile pe care
                  le-ai salvat.
                </p>
              </div>

              {favorites.length ===
              0 ? (
                <EmptyCard
                  title="Nu ai anunțuri favorite"
                  text="Anunțurile salvate vor apărea aici."
                />
              ) : (
                <div
                  style={{
                    display:
                      "grid",
                    gap:
                      "12px",
                    maxWidth:
                      "1000px",
                  }}
                >
                  {favorites.map(
                    (listing) => (
                      <div
                        className="dashboard-property-card"
                        key={
                          listing.id
                        }
                        style={{
                          background:
                            "#FFFFFF",
                          border:
                            "1px solid #E2E8F0",
                          borderRadius:
                            "12px",
                          padding:
                            "14px",
                          display:
                            "grid",
                          gridTemplateColumns:
                            "90px minmax(0, 1fr) auto",
                          gap:
                            "14px",
                          alignItems:
                            "center",
                          boxShadow:
                            "0 4px 12px rgba(15, 23, 42, 0.03)",
                        }}
                      >
                        <div
                          style={{
                            width:
                              "90px",
                            height:
                              "72px",
                            borderRadius:
                              "9px",
                            overflow:
                              "hidden",
                            background:
                              "#F1F5F9",
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
                                  "10px",
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
                              color:
                                "#172554",
                              fontSize:
                                "14px",
                              fontWeight:
                                "900",
                              overflow:
                                "hidden",
                              textOverflow:
                                "ellipsis",
                              whiteSpace:
                                "nowrap",
                            }}
                          >
                            {
                              listing.title
                            }
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
                            }}
                          >
                            {listing.city ||
                              ""}
                            {listing.city &&
                            listing.address
                              ? " • "
                              : ""}
                            {listing.address ||
                              ""}
                          </div>

                          <div
                            style={{
                              marginTop:
                                "6px",
                              color:
                                "#172554",
                              fontSize:
                                "13px",
                              fontWeight:
                                "900",
                            }}
                          >
                            {listing.price_monthly
                              ? `${listing.price_monthly} € / lună`
                              : "Preț nespecificat"}
                          </div>
                        </div>

                        <div
                          style={{
                            display:
                              "flex",
                            gap:
                              "7px",
                            flexWrap:
                              "wrap",
                            justifyContent:
                              "flex-end",
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
                                "1px solid #CBD5E1",
                              background:
                                "#FFFFFF",
                              borderRadius:
                                "8px",
                              padding:
                                "8px 10px",
                              color:
                                "#172554",
                              fontFamily:
                                "inherit",
                              fontSize:
                                "10px",
                              fontWeight:
                                "800",
                              cursor:
                                "pointer",
                            }}
                          >
                            Vezi
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
                                "#FFFFFF",
                              borderRadius:
                                "8px",
                              padding:
                                "8px 10px",
                              color:
                                "#DC2626",
                              fontFamily:
                                "inherit",
                              fontSize:
                                "10px",
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
                    )
                  )}
                </div>
              )}
            </>
          )}

          {error && (
            <div
              style={{
                marginTop: "20px",
                maxWidth: "800px",
                background: "#FEF2F2",
                border:
                  "1px solid #FECACA",
                borderRadius: "10px",
                padding: "12px 14px",
                color: "#B91C1C",
                fontSize: "12px",
                fontWeight: "700",
              }}
            >
              {error}
            </div>
          )}
        </section>
      </div>

      {listingToDelete && (
        <div
          className="dashboard-modal"
          onClick={() =>
            setListingToDelete(null)
          }
          style={{
            position: "fixed",
            inset: 0,
            background:
              "rgba(15, 23, 42, 0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            zIndex: 9999,
          }}
        >
          <div
            onClick={(event) =>
              event.stopPropagation()
            }
            style={{
              width: "100%",
              maxWidth: "440px",
              background: "#FFFFFF",
              border:
                "1px solid #E2E8F0",
              borderRadius: "16px",
              padding: "24px",
              boxSizing:
                "border-box",
              boxShadow:
                "0 24px 60px rgba(15, 23, 42, 0.22)",
            }}
          >
            <div
              style={{
                color: "#172554",
                fontSize: "20px",
                fontWeight: "900",
                letterSpacing:
                  "-0.4px",
              }}
            >
              Șterge anunțul
            </div>

            <div
              style={{
                marginTop: "10px",
                color: "#64748B",
                fontSize: "14px",
                lineHeight: "1.6",
              }}
            >
              Ești sigur că dorești să
              ștergi definitiv anunțul „
              {listingToDelete.title ||
                "Anunț"}
              ”? Această acțiune nu
              poate fi anulată.
            </div>

            <div
              style={{
                marginTop: "22px",
                display: "flex",
                justifyContent:
                  "flex-end",
                gap: "10px",
              }}
            >
              <button
                type="button"
                onClick={() =>
                  setListingToDelete(
                    null
                  )
                }
                style={{
                  border:
                    "1px solid #CBD5E1",
                  background:
                    "#FFFFFF",
                  borderRadius:
                    "9px",
                  padding:
                    "10px 15px",
                  color:
                    "#172554",
                  fontFamily:
                    "inherit",
                  fontSize:
                    "12px",
                  fontWeight:
                    "800",
                  cursor:
                    "pointer",
                }}
              >
                Anulează
              </button>

              <button
                type="button"
                onClick={
                  confirmDeleteListing
                }
                style={{
                  border: "none",
                  background:
                    "#DC2626",
                  borderRadius:
                    "9px",
                  padding:
                    "10px 15px",
                  color:
                    "#FFFFFF",
                  fontFamily:
                    "inherit",
                  fontSize:
                    "12px",
                  fontWeight:
                    "800",
                  cursor:
                    "pointer",
                }}
              >
                Șterge definitiv
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SINGURA ADĂUGARE: modal confirmare ieșire din cont */}
      {logoutConfirmOpen && (
        <div
          className="dashboard-modal"
          onClick={() =>
            setLogoutConfirmOpen(
              false
            )
          }
          style={{
            position: "fixed",
            inset: 0,
            background:
              "rgba(15, 23, 42, 0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent:
              "center",
            padding: "20px",
            zIndex: 9999,
          }}
        >
          <div
            onClick={(event) =>
              event.stopPropagation()
            }
            style={{
              width: "100%",
              maxWidth: "420px",
              background:
                "#FFFFFF",
              border:
                "1px solid #E2E8F0",
              borderRadius:
                "16px",
              padding: "24px",
              boxSizing:
                "border-box",
              boxShadow:
                "0 24px 60px rgba(15, 23, 42, 0.22)",
            }}
          >
            <div
              style={{
                color:
                  "#172554",
                fontSize:
                  "20px",
                fontWeight:
                  "900",
                letterSpacing:
                  "-0.4px",
              }}
            >
              Ieșire din cont
            </div>

            <div
              style={{
                marginTop:
                  "10px",
                color:
                  "#64748B",
                fontSize:
                  "14px",
                lineHeight:
                  "1.6",
              }}
            >
              Ești sigur că
              dorești să ieși
              din cont?
            </div>

            <div
              style={{
                marginTop:
                  "22px",
                display:
                  "flex",
                justifyContent:
                  "flex-end",
                gap: "10px",
              }}
            >
              <button
                type="button"
                onClick={() =>
                  setLogoutConfirmOpen(
                    false
                  )
                }
                style={{
                  border:
                    "1px solid #CBD5E1",
                  background:
                    "#FFFFFF",
                  borderRadius:
                    "9px",
                  padding:
                    "10px 15px",
                  color:
                    "#172554",
                  fontFamily:
                    "inherit",
                  fontSize:
                    "12px",
                  fontWeight:
                    "800",
                  cursor:
                    "pointer",
                }}
              >
                Anulează
              </button>

              <button
                type="button"
                onClick={
                  handleLogout
                }
                style={{
                  border:
                    "none",
                  background:
                    "#172554",
                  borderRadius:
                    "9px",
                  padding:
                    "10px 15px",
                  color:
                    "#FFFFFF",
                  fontFamily:
                    "inherit",
                  fontSize:
                    "12px",
                  fontWeight:
                    "800",
                  cursor:
                    "pointer",
                }}
              >
                Ieși din cont
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .dashboard-mobile-menu,
        .dashboard-mobile-chat-back {
          display: none;
        }

        @media (max-width: 900px) {
          .dashboard-layout {
            grid-template-columns: 1fr !important;
          }

          .dashboard-sidebar {
            border-right: none !important;
            border-bottom: 1px solid #e2e8f0 !important;
          }

          .stats-grid {
            grid-template-columns: 1fr !important;
          }

          .messages-layout {
            grid-template-columns: 1fr !important;
            height: auto !important;
          }

          .conversation-list {
            max-height: 280px;
            border-right: none !important;
            border-bottom: 1px solid #e2e8f0;
          }

          .chat-panel {
            min-height: 500px;
          }
        }

        @media (max-width: 650px) {
          .dashboard-content {
            padding-left: 16px !important;
            padding-right: 16px !important;
          }
        }

        @media (max-width: 768px) {
          .dashboard-page,
          .dashboard-page * {
            box-sizing: border-box;
            min-width: 0;
          }

          .dashboard-page {
            width: 100%;
            overflow-wrap: anywhere;
          }

          .dashboard-page button,
          .dashboard-page input,
          .dashboard-page textarea {
            max-width: 100%;
          }

          .dashboard-page button {
            min-height: 44px;
          }

          .dashboard-header {
            height: auto !important;
            min-height: 72px;
            padding: 14px 16px !important;
            gap: 16px;
          }

          .dashboard-header > a {
            flex-shrink: 0;
          }

          .dashboard-header-account {
            flex: 1;
            justify-content: flex-end;
            gap: 10px !important;
          }

          .dashboard-header-account > span {
            overflow-wrap: anywhere;
            text-align: right;
            font-size: 12px !important;
          }

          .dashboard-header-account > button {
            flex-shrink: 0;
          }

          .dashboard-page .dashboard-layout {
            grid-template-columns: minmax(0, 1fr) !important;
            align-content: start;
          }

          .dashboard-mobile-menu {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            margin: 16px 16px 0;
            padding: 12px 14px;
            border: 1px solid #E2E8F0;
            border-radius: 10px;
            background: #FFFFFF;
            color: #172554;
            font: inherit;
            font-size: 14px;
            font-weight: 800;
            cursor: pointer;
          }

          .dashboard-page .dashboard-sidebar {
            display: none;
            padding: 12px !important;
            margin: 8px 16px 0;
            border: 1px solid #E2E8F0 !important;
            border-radius: 12px;
          }

          .dashboard-page .dashboard-sidebar.is-open {
            display: block;
          }

          .dashboard-sidebar > div:first-child {
            display: none;
          }

          .dashboard-sidebar > div:last-child {
            margin-top: 10px !important;
            padding-top: 12px !important;
          }

          .dashboard-page .dashboard-content {
            padding: 20px 16px 48px !important;
          }

          .dashboard-content h1 {
            font-size: 28px !important;
          }

          .dashboard-section-heading {
            align-items: flex-start !important;
            flex-direction: column;
            gap: 12px !important;
          }

          .dashboard-section-heading > button {
            white-space: normal !important;
          }

          .dashboard-page .stats-grid {
            grid-template-columns: minmax(0, 1fr) !important;
            gap: 12px !important;
            margin-bottom: 28px !important;
          }

          .dashboard-property-card {
            grid-template-columns: minmax(0, 1fr) !important;
            gap: 12px !important;
          }

          .dashboard-property-card > div:first-child {
            width: 100% !important;
            height: 180px !important;
          }

          .dashboard-property-card > div:nth-child(2) div {
            white-space: normal !important;
            overflow-wrap: anywhere;
          }

          .dashboard-property-card > div:last-child {
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 8px !important;
          }

          .dashboard-property-card > div:last-child button {
            font-size: 12px !important;
            white-space: normal;
          }

          .dashboard-profile-card {
            width: 100%;
            padding: 18px !important;
          }

          .dashboard-profile-card input,
          .dashboard-profile-card select {
            width: 100%;
            font-size: 16px !important;
          }

          .dashboard-profile-card label {
            font-size: 14px !important;
          }

          .dashboard-profile-card button {
            width: 100%;
            white-space: normal;
            font-size: 14px !important;
          }

          .dashboard-page .messages-layout {
            width: 100%;
            grid-template-columns: minmax(0, 1fr) !important;
          }

          .dashboard-page .conversation-list {
            max-height: none;
            border-bottom: none;
          }

          .dashboard-page .messages-layout:not(.is-mobile-chat-open) .chat-panel,
          .dashboard-page .messages-layout.is-mobile-chat-open .conversation-list {
            display: none !important;
          }

          .dashboard-mobile-chat-back {
            display: block;
            flex-shrink: 0;
            width: 100%;
            padding: 12px 14px;
            border: none;
            border-bottom: 1px solid #E2E8F0;
            background: #FFFFFF;
            color: #172554;
            text-align: left;
            font: inherit;
            font-size: 14px;
            font-weight: 800;
            cursor: pointer;
          }

          .dashboard-page .conversation-list button > div:last-child > div {
            white-space: normal !important;
            overflow-wrap: anywhere;
          }

          .dashboard-page .conversation-list button > div:last-child > div:last-child {
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
          }

          .dashboard-page .conversation-list button > div:last-child > div:first-child > div {
            white-space: normal !important;
          }

          .dashboard-page .chat-panel {
            height: 65vh;
            height: 65svh;
            min-height: 420px;
            max-height: 640px;
          }

          .dashboard-chat-header {
            padding: 14px !important;
            flex-wrap: wrap;
            flex-shrink: 0;
            gap: 10px !important;
          }

          .dashboard-chat-header > div {
            flex: 1 1 100%;
          }

          .dashboard-chat-header > div > div {
            white-space: normal !important;
          }

          .dashboard-chat-messages {
            min-height: 0;
            padding: 14px !important;
          }

          .dashboard-message-bubble {
            max-width: 90% !important;
            flex-shrink: 0;
            font-size: 14px !important;
          }

          .dashboard-chat-composer {
            flex-shrink: 0;
          }

          .dashboard-chat-composer > div {
            flex-direction: column;
            align-items: stretch !important;
          }

          .dashboard-chat-composer textarea {
            flex: auto !important;
            width: 100%;
            font-size: 16px !important;
          }

          .dashboard-chat-composer button {
            width: 100%;
            font-size: 13px !important;
          }

          .dashboard-modal {
            padding: 16px !important;
          }

          .dashboard-modal > div {
            max-height: calc(100dvh - 32px);
            overflow-y: auto;
            padding: 20px !important;
          }

          .dashboard-modal > div > div:last-child {
            flex-wrap: wrap;
          }

          .dashboard-modal button {
            flex: 1 1 120px;
            white-space: normal;
          }
        }
      `}</style>
    </main>
  );
}

/*
  CARD STATISTICĂ
*/

function StatCard({
  number,
  title,
}) {
  return (
    <div
      style={{
        background: "#FFFFFF",
        border:
          "1px solid #E2E8F0",
        borderRadius: "12px",
        padding: "20px",
        boxShadow:
          "0 5px 14px rgba(15, 23, 42, 0.04)",
      }}
    >
      <div
        style={{
          color: "#172554",
          fontSize: "28px",
          fontWeight: "900",
          lineHeight: 1,
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
  EMPTY CARD
*/

function EmptyCard({
  title,
  text,
}) {
  return (
    <div
      style={{
        maxWidth: "800px",
        background: "#FFFFFF",
        border:
          "1px solid #E2E8F0",
        borderRadius: "12px",
        padding: "28px",
        boxShadow:
          "0 5px 14px rgba(15, 23, 42, 0.04)",
      }}
    >
      <div
        style={{
          color: "#172554",
          fontSize: "15px",
          fontWeight: "900",
        }}
      >
        {title}
      </div>

      <div
        style={{
          marginTop: "7px",
          color: "#64748B",
          fontSize: "12px",
          lineHeight: "1.6",
        }}
      >
        {text}
      </div>
    </div>
  );
}

/*
  LISTĂ ANUNȚURI
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
  if (
    !listings ||
    listings.length === 0
  ) {
    return (
      <EmptyCard
        title="Nu ai anunțuri"
        text="Anunțurile tale vor apărea aici după ce publici prima proprietate."
      />
    );
  }

  return (
    <div
      style={{
        display: "grid",
        gap: "12px",
        maxWidth: "1050px",
      }}
    >
      {listings.map(
        (listing) => (
          <div
            className="dashboard-property-card"
            key={listing.id}
            style={{
              background:
                "#FFFFFF",
              border:
                "1px solid #E2E8F0",
              borderRadius:
                "12px",
              padding: "14px",
              display: "grid",
              gridTemplateColumns:
                "100px minmax(0, 1fr) auto",
              gap: "15px",
              alignItems:
                "center",
              boxShadow:
                "0 4px 12px rgba(15, 23, 42, 0.03)",
            }}
          >
            <div
              style={{
                width: "100px",
                height: "78px",
                borderRadius:
                  "9px",
                overflow:
                  "hidden",
                background:
                  "#F1F5F9",
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
                      "10px",
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
                  gap: "8px",
                  flexWrap:
                    "wrap",
                }}
              >
                <div
                  style={{
                    color:
                      "#172554",
                    fontSize:
                      "14px",
                    fontWeight:
                      "900",
                    overflow:
                      "hidden",
                    textOverflow:
                      "ellipsis",
                    whiteSpace:
                      "nowrap",
                  }}
                >
                  {
                    listing.title
                  }
                </div>

                <span
                  style={{
                    borderRadius:
                      "999px",
                    padding:
                      "4px 8px",
                    background:
                      listing.active
                        ? "#DCFCE7"
                        : "#F1F5F9",
                    color:
                      listing.active
                        ? "#15803D"
                        : "#64748B",
                    fontSize:
                      "9px",
                    fontWeight:
                      "900",
                  }}
                >
                  {listing.active
                    ? "ACTIV"
                    : "INACTIV"}
                </span>
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
                }}
              >
                {listing.city ||
                  ""}
                {listing.city &&
                listing.address
                  ? " • "
                  : ""}
                {listing.address ||
                  ""}
              </div>

              <div
                style={{
                  marginTop:
                    "6px",
                  color:
                    "#172554",
                  fontSize:
                    "13px",
                  fontWeight:
                    "900",
                }}
              >
                {listing.price_monthly
                  ? `${listing.price_monthly} € / lună`
                  : "Preț nespecificat"}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: "7px",
                flexWrap:
                  "wrap",
                justifyContent:
                  "flex-end",
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
                    "1px solid #CBD5E1",
                  background:
                    "#FFFFFF",
                  borderRadius:
                    "8px",
                  padding:
                    "8px 10px",
                  color:
                    "#172554",
                  fontFamily:
                    "inherit",
                  fontSize:
                    "10px",
                  fontWeight:
                    "800",
                  cursor:
                    "pointer",
                }}
              >
                Vezi
              </button>

              <button
                type="button"
                onClick={() => {
                  if (
                    !profilePhone?.trim()
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
                    `/editeaza-proprietate/${listing.id}`
                  );
                }}
                style={{
                  border:
                    "1px solid #BFDBFE",
                  background:
                    "#EFF6FF",
                  borderRadius:
                    "8px",
                  padding:
                    "8px 10px",
                  color:
                    "#1D4ED8",
                  fontFamily:
                    "inherit",
                  fontSize:
                    "10px",
                  fontWeight:
                    "800",
                  cursor:
                    "pointer",
                }}
              >
                Editează
              </button>

              <button
                type="button"
                onClick={() =>
                  toggleListing(
                    listing
                  )
                }
                style={{
                  border:
                    "1px solid #CBD5E1",
                  background:
                    "#FFFFFF",
                  borderRadius:
                    "8px",
                  padding:
                    "8px 10px",
                  color:
                    "#475569",
                  fontFamily:
                    "inherit",
                  fontSize:
                    "10px",
                  fontWeight:
                    "800",
                  cursor:
                    "pointer",
                }}
              >
                {listing.active
                  ? "Dezactivează"
                  : "Activează"}
              </button>

              <button
                type="button"
                onClick={() =>
                  deleteListing(
                    listing
                  )
                }
                style={{
                  border:
                    "1px solid #FECACA",
                  background:
                    "#FFFFFF",
                  borderRadius:
                    "8px",
                  padding:
                    "8px 10px",
                  color:
                    "#DC2626",
                  fontFamily:
                    "inherit",
                  fontSize:
                    "10px",
                  fontWeight:
                    "800",
                  cursor:
                    "pointer",
                }}
              >
                Șterge
              </button>
            </div>
          </div>
        )
      )}
    </div>
  );
}
