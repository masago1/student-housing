export async function POST(request) {
  try {
    const body = await request.json();

    const { to, senderName, listingTitle, conversationId } = body;

    if (!to) {
      return Response.json(
        { error: "Lipsește adresa de email." },
        { status: 400 }
      );
    }

    if (!process.env.RESEND_API_KEY) {
      return Response.json(
        { error: "RESEND_API_KEY nu este configurată." },
        { status: 500 }
      );
    }

    const safeSenderName = senderName || "Un utilizator";
    const safeListingTitle = listingTitle || "un anunț";

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      "https://student-housing-one.vercel.app";

    const conversationUrl = conversationId
      ? `${siteUrl}/dashboard?section=messages&conversation=${encodeURIComponent(
          conversationId
        )}`
      : `${siteUrl}/dashboard?section=messages`;

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "shaus <onboarding@resend.dev>",
        to: [to],
        subject: "Ai primit un mesaj nou pe shaus",
        html: `
          <div
            style="
              font-family: Arial, sans-serif;
              background: #f4f7fb;
              padding: 40px 20px;
            "
          >
            <div
              style="
                max-width: 560px;
                margin: 0 auto;
                background: #ffffff;
                border-radius: 14px;
                padding: 32px;
                border: 1px solid #e2e8f0;
              "
            >
              <div
                style="
                  font-size: 24px;
                  font-weight: 900;
                  color: #172554;
                  margin-bottom: 24px;
                "
              >
                shaus
              </div>

              <h1
                style="
                  margin: 0 0 14px;
                  color: #172554;
                  font-size: 22px;
                "
              >
                Ai primit un mesaj nou
              </h1>

              <p
                style="
                  color: #64748b;
                  font-size: 15px;
                  line-height: 1.6;
                  margin: 0 0 8px;
                "
              >
                <strong style="color: #172554;">
                  ${escapeHtml(safeSenderName)}
                </strong>
                ți-a trimis un mesaj în legătură cu:
              </p>

              <p
                style="
                  color: #172554;
                  font-size: 15px;
                  font-weight: 700;
                  margin: 0 0 26px;
                "
              >
                ${escapeHtml(safeListingTitle)}
              </p>

              <a
                href="${conversationUrl}"
                style="
                  display: inline-block;
                  background: #172554;
                  color: #ffffff;
                  text-decoration: none;
                  padding: 12px 18px;
                  border-radius: 9px;
                  font-size: 14px;
                  font-weight: 700;
                "
              >
                Vezi mesajul
              </a>

              <p
                style="
                  color: #94a3b8;
                  font-size: 11px;
                  line-height: 1.5;
                  margin: 28px 0 0;
                "
              >
                Ai primit acest email deoarece ai un cont pe shaus.
              </p>
            </div>
          </div>
        `,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Resend error:", data);

      return Response.json(
        {
          error: "Emailul nu a putut fi trimis.",
          details: data,
        },
        { status: response.status }
      );
    }

    return Response.json({
      success: true,
      id: data.id,
    });
  } catch (error) {
    console.error("Email notification error:", error);

    return Response.json(
      { error: "Eroare internă la trimiterea emailului." },
      { status: 500 }
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
