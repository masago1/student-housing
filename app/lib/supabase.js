import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const recoveryStorageKey = "shaus-password-recovery-user";
// Capture the intent before Supabase consumes and removes the URL fragment.
const authFragment = new URLSearchParams(
  typeof window !== "undefined" ? window.location.hash.slice(1) : ""
);
let recoveryLink = authFragment.get("type") === "recovery" &&
  authFragment.has("access_token") && authFragment.has("refresh_token");
let recoveryUserId = null;

export function isPasswordRecoverySession(user) {
  if (typeof window === "undefined" || !user) return false;
  try {
    recoveryUserId = window.sessionStorage.getItem(recoveryStorageKey);
  } catch {
    // Keep the in-memory marker when browser storage is unavailable.
  }
  return recoveryLink || recoveryUserId === user.id;
}

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);

if (typeof window !== "undefined") {
  // Register before page effects so recovery is never treated as ordinary login.
  // Do not await Supabase calls inside an auth callback (the auth lock is held).
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === "PASSWORD_RECOVERY") {
      recoveryLink = true;
      recoveryUserId = session?.user?.id || null;
      try {
        if (recoveryUserId) window.sessionStorage.setItem(recoveryStorageKey, recoveryUserId);
      } catch {}
      if (window.location.pathname !== "/reset-password") {
        window.location.replace("/reset-password");
      }
    } else if (event === "SIGNED_OUT") {
      recoveryLink = false;
      recoveryUserId = null;
      try {
        window.sessionStorage.removeItem(recoveryStorageKey);
      } catch {}
    }
  });
}
