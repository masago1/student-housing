import { createClient } from "@supabase/supabase-js";
import { deleteAccount } from "../../../lib/server/deleteAccount";

export const runtime = "nodejs";
export const maxDuration = 60;

function reply(body, status) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return reply({ error: "Cererea nu este permisă." }, 403);
  }
  const match = /^Bearer ([^\s]+)$/i.exec(request.headers.get("authorization") || "");
  if (!match) return reply({ error: "Autentifică-te pentru a șterge contul." }, 401);

  let body;
  try { body = await request.json(); } catch {
    return reply({ error: "Confirmarea ștergerii lipsește." }, 400);
  }
  // Accept confirmation only. Never accept an account identifier from the client.
  if (!body || body.confirmation !== "delete-account" || Object.keys(body).length !== 1) {
    return reply({ error: "Confirmarea ștergerii nu este validă." }, 400);
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anonKey || !serviceKey) {
    return reply({ error: "Ștergerea contului nu este disponibilă momentan." }, 503);
  }
  const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
  try {
    const authClient = createClient(url, anonKey, options);
    const { data, error } = await authClient.auth.getUser(match[1]);
    if (error || !data?.user) {
      return reply({ error: "Sesiunea a expirat. Autentifică-te din nou." }, 401);
    }
    const admin = createClient(url, serviceKey, options);
    await deleteAccount(admin, data.user.id);
    return reply({ success: true }, 200);
  } catch {
    // Never log credentials, tokens, or raw provider responses.
    return reply({ error: "Ștergerea nu a fost finalizată. Unele date pot fi deja șterse, iar accesul la cont poate fi restricționat. Încearcă din nou; dacă eroarea persistă, contactează echipa shaus." }, 500);
  }
}
