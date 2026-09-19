import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function GET(request) {
  try {
    // Protejăm endpoint-ul ca să nu poată fi apelat de oricine.
    const authorization = request.headers.get("authorization");

    if (
      !process.env.CRON_SECRET ||
      authorization !== `Bearer ${process.env.CRON_SECRET}`
    ) {
      return Response.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!process.env.RESEND_API_KEY) {
      return Response.json(
        { error: "RESEND_API_KEY lipsește." },
        { status: 500 }
      );
    }

    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.SUPABASE_SECRET_KEY
    ) {
      return Response.json(
        { error: "Configurarea Supabase lipsește." },
        { status: 500 }
      );
    }

    // Luăm doar mesajele mai vechi de 2 minute.
    // Dacă între timp utilizatorul le-a citit, read_at nu mai este NULL
    // și nu vor intra aici.
    const twoMinutesAgo = new Date(
      Date.now() - 2 * 60 * 1000
    ).toISOString();

    const { data: unreadMessages, error: messagesError } =
      await supabaseAdmin
        .from("messages")
        .select(`
          id,
          conversation_id,
          sender_id,
          content,
          created_at,
          read_at,
          email_notified_at
        `)
        .is("read_at", null)
        .is("email_notified_at", null)
        .lte("created_at", twoMinutesAgo)
        .order("created_at", {
          ascending: true,
        });

    if (messagesError) {
      console.error(
        "Eroare citire mesaje:",
        messagesError
      );

      return Response.json(
        { error: "Nu am putut verifica mesajele." },
        { status: 500 }
      );
    }

    if (!unreadMessages?.length) {
      return Response.json({
        success: true,
        emailsSent: 0,
        message: "Nu există mesaje care necesită notificare.",
      });
    }

    /*
      Grupăm mesajele după conversație + destinatar.

      Astfel, dacă cineva trimite:
      "Salut"
      "Mai este disponibil?"
      "Mulțumesc"

      nu trimitem 3 emailuri.
    */
    const notificationGroups = new Map();

    for (const message of unreadMessages) {
      const { data: conversation, error: conversationError } =
        await supabaseAdmin
          .from("conversations")
          .select(`
            id,
            listing_id,
            tenant_id,
            owner_id
          `)
          .eq("id", message.conversation_id)
          .single();

      if (conversationError || !conversation) {
        console.error(
          "Conversație indisponibilă:",
          message.conversation_id
        );

        continue;
      }

      let recipientId = null;

      if (message.sender_id === conversation.tenant_id) {
        recipientId = conversation.owner_id;
      } else if (
        message.sender_id === conversation.owner_id
      ) {
        recipientId = conversation.tenant_id;
      } else {
        // Sender-ul nu face parte din conversație.
        continue;
      }

      if (!recipientId) continue;

      const groupKey =
        `${message.conversation_id}:${recipientId}`;

      if (!notificationGroups.has(groupKey)) {
        notificationGroups.set(groupKey, {
          conversation,
          recipientId,
          senderId: message.sender_id,
          messageIds: [],
        });
      }

      notificationGroups
        .get(groupKey)
        .messageIds.push(message.id);
    }

    let emailsSent = 0;

    for (const group of notificationGroups.values()) {
      const {
        conversation,
        recipientId,
        senderId,
        messageIds,
      } = group;

      /*
        Verificăm DIN NOU înainte de email.

        Dacă utilizatorul a deschis conversația chiar în timpul
        procesării, nu îi mai trimitem notificarea.
      */
      const { data: stillUnread, error: unreadCheckError } =
        await supabaseAdmin
          .from("messages")
          .select("id")
          .in("id", messageIds)
          .is("read_at", null)
          .is("email_notified_at", null);

      if (
        unreadCheckError ||
        !stillUnread?.length
      ) {
        continue;
      }

      // Emailul destinatarului din Supabase Auth.
      const {
        data: recipientAuth,
        error: recipientError,
      } =
        await supabaseAdmin.auth.admin.getUserById(
          recipientId
        );

      if (
        recipientError ||
        !recipientAuth?.user?.email
      ) {
        console.error(
          "Email destinatar indisponibil:",
          recipientId
        );

        continue;
      }

      const recipientEmail =
        recipientAuth.user.email;

      // Numele expeditorului.
      const { data: senderProfile } =
        await supabaseAdmin
          .from("profiles")
          .select("name")
          .eq("id", senderId)
          .maybeSingle();

      const senderName =
        senderProfile?.name?.trim() ||
        "Un utilizator";

      // Titlul anunțului.
      const { data: listing } =
        await supabaseAdmin
          .from("listings")
          .select("title")
          .eq("id", conversation.listing_id)
          .maybeSingle();

      const listingTitle =
        listing?.title ||
        "un anunț de pe shaus";

      const siteUrl =
        process.env.NEXT_PUBLIC_SITE_URL ||
        "https://student-housing-one.vercel.app";

      const conversationUrl =
        `${siteUrl}/dashboard?section=messages&conversation=` +
        encodeURIComponent(conversation.id);

      const resendResponse = await fetch(
        "https://api.resend.com/emails",
        {
          method: "POST",

          headers: {
            Authorization:
              `Bearer ${process.env.RESEND_API_KEY}`,

            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            from:
              "shaus <onboarding@resend.dev>",

            to: [recipientEmail],

            subject:
              "Ai primit un mesaj nou pe shaus",

            html: `
              <div style="
                font-family: Arial, sans-serif;
                background:#f4f7fb;
                padding:40px 20px;
              ">

                <div style="
                  max-width:560px;
                  margin:0 auto;
                  background:#ffffff;
                  border:1px solid #e2e8f0;
                  border-radius:14px;
                  padding:32px;
                ">

                  <div style="
                    font-size:24px;
                    font-weight:900;
                    color:#172554;
                    margin-bottom:24px;
                  ">
                    shaus
                  </div>

                  <h1 style="
                    color:#172554;
                    font-size:22px;
                    margin:0 0 16px;
                  ">
                    Ai primit un mesaj nou
                  </h1>

                  <p style="
                    color:#64748b;
                    font-size:15px;
                    line-height:1.6;
                  ">
                    <strong style="color:#172554;">
                      ${escapeHtml(senderName)}
                    </strong>
                    ți-a trimis un mesaj în legătură cu
                    <strong style="color:#172554;">
                      ${escapeHtml(listingTitle)}
                    </strong>.
                  </p>

                  <a
                    href="${conversationUrl}"
                    style="
                      display:inline-block;
                      margin-top:16px;
                      background:#172554;
                      color:#ffffff;
                      text-decoration:none;
                      padding:12px 18px;
                      border-radius:9px;
                      font-size:14px;
                      font-weight:700;
                    "
                  >
                    Vezi mesajul
                  </a>

                  <p style="
                    color:#94a3b8;
                    font-size:11px;
                    line-height:1.5;
                    margin-top:28px;
                  ">
                    Ai primit acest email deoarece ai un cont pe shaus.
                  </p>

                </div>
              </div>
            `,
          }),
        }
      );

      const resendData =
        await resendResponse.json();

      if (!resendResponse.ok) {
        console.error(
          "Resend error:",
          resendData
        );

        // IMPORTANT:
        // Nu marcăm mesajele ca notificate dacă emailul
        // nu a fost trimis.
        continue;
      }

      /*
        Email trimis cu succes.

        Marcăm TOATE mesajele necitite din grup ca notificate.
        Astfel nu trimitem câte un email pentru fiecare mesaj.
      */
      const notifiedAt =
        new Date().toISOString();

      const idsToMark =
        stillUnread.map(
          (message) => message.id
        );

      const { error: markError } =
        await supabaseAdmin
          .from("messages")
          .update({
            email_notified_at:
              notifiedAt,
          })
          .in("id", idsToMark);

      if (markError) {
        console.error(
          "Eroare email_notified_at:",
          markError
        );
      }

      emailsSent += 1;
    }

    return Response.json({
      success: true,
      emailsSent,
    });
  } catch (error) {
    console.error(
      "Message email cron error:",
      error
    );

    return Response.json(
      {
        error:
          "Eroare internă la verificarea notificărilor.",
      },
      {
        status: 500,
      }
    );
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
