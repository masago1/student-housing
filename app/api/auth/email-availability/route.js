import { createClient } from "@supabase/supabase-js";
import { createHmac } from "node:crypto";
import { isIP } from "node:net";

export const runtime = "nodejs";

function reply(body, status) {
  return Response.json(body, { status, headers: {
    "Cache-Control": "no-store",
    ...(status === 429 ? { "Retry-After": "60" } : {}),
  } });
}

export async function POST(request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return reply({ error: "Request not allowed." }, 403);
  }
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return reply({ error: "Invalid request." }, 400);
  }
  let body;
  try {
    // Bound the body even when Content-Length is absent or inaccurate.
    const reader = request.body?.getReader();
    if (!reader) return reply({ error: "Invalid request." }, 400);
    const chunks = [];
    let size = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 1024) {
        await reader.cancel();
        return reply({ error: "Invalid request." }, 413);
      }
      chunks.push(Buffer.from(value));
    }
    body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return reply({ error: "Invalid request." }, 400);
  }
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!body || Object.keys(body).length !== 1 || email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return reply({ error: "Invalid email." }, 400);
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return reply({ error: "Email check unavailable." }, 503);

  // Only trust the platform-supplied IP on Vercel. Other hosts share a bucket
  // until a trusted proxy integration is configured; arbitrary headers cannot bypass it.
  const forwarded = process.env.VERCEL === "1"
    ? request.headers.get("x-vercel-forwarded-for")?.trim() : null;
  const client = forwarded && isIP(forwarded) ? forwarded : "shared";
  const requesterKey = createHmac("sha256", key).update(`email-check:${client}`).digest("hex");
  try {
    const admin = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const { data, error } = await admin.rpc("check_signup_email", {
      candidate_email: email, requester_key: requesterKey,
    });
    if (error) return reply({ error: "Email check unavailable." }, 503);
    if (data === null) return reply({ error: "Too many checks. Try again shortly." }, 429);
    if (typeof data !== "boolean") return reply({ error: "Email check unavailable." }, 503);
    return reply({ registered: data }, 200);
  } catch {
    return reply({ error: "Email check unavailable." }, 503);
  }
}
