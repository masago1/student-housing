"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

const invalidLinkMessage =
  "Linkul de resetare este invalid sau a expirat. Revino la autentificare și solicită un link nou.";

const labelStyle = {
  display: "block", fontSize: "14px", fontWeight: "700", marginBottom: "8px",
};
const inputStyle = {
  width: "100%", boxSizing: "border-box", border: "1px solid #d1d5db",
  borderRadius: "11px", padding: "14px 15px", fontFamily: "inherit",
  fontSize: "15px", marginBottom: "19px",
};
const buttonStyle = {
  width: "100%", border: "none", borderRadius: "11px", padding: "14px",
  background: "#111827", color: "#ffffff", fontFamily: "inherit",
  fontSize: "15px", fontWeight: "700", cursor: "pointer",
};

export default function ResetPasswordPage() {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);
  const [canReset, setCanReset] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    const url = new URL(window.location.href);
    const hash = new URLSearchParams(url.hash.slice(1));
    const hasLinkError = [url.searchParams, hash].some(
      (params) => params.has("error") || params.has("error_code")
    );

    async function checkRecoverySession() {
      try {
        if (hasLinkError) {
          if (mounted) setError(invalidLinkMessage);
          return;
        }

        // Wait for the shared client's automatic recovery-token handling.
        // Checking initialization also catches a rejected link when an older
        // session already exists in this browser.
        const { error: initializationError } = await supabase.auth.initialize();
        if (initializationError) {
          if (mounted) setError(invalidLinkMessage);
          return;
        }

        const { data, error: userError } = await supabase.auth.getUser();
        if (!mounted) return;
        if (userError || !data?.user) {
          setError(invalidLinkMessage);
          return;
        }
        setCanReset(true);
      } catch {
        if (mounted) {
          setError("Sesiunea nu a putut fi verificată. Verifică conexiunea și redeschide linkul din email.");
        }
      } finally {
        if (mounted) setCheckingSession(false);
      }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (mounted && event === "SIGNED_OUT") {
        setCanReset(false);
      }
    });
    checkRecoverySession();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    if (loading || checkingSession || !canReset || success) return;
    setError("");

    if (password.length < 6) {
      setError("Parola trebuie să aibă minimum 6 caractere.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Parolele nu coincid.");
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        if (updateError.status === 401 || updateError.status === 403 ||
          ["session_not_found", "session_expired", "refresh_token_not_found", "refresh_token_already_used"].includes(updateError.code)) {
          setCanReset(false);
          setError(invalidLinkMessage);
        } else if (updateError.code === "same_password") {
          setError("Alege o parolă diferită de parola actuală.");
        } else if (updateError.code === "weak_password") {
          setError("Alege o parolă mai puternică, cu litere, cifre și simboluri.");
        } else {
          setError("Parola nu a putut fi schimbată. Încearcă din nou peste câteva minute.");
        }
        return;
      }
      setPassword("");
      setConfirmPassword("");
      setSuccess(true);
    } catch {
      setError("Parola nu a putut fi schimbată. Verifică conexiunea și încearcă din nou.");
    } finally {
      setLoading(false);
    }
  }

  async function returnToLogin() {
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      // End only this browser's recovery session so /login shows its form
      // instead of redirecting the authenticated user to the dashboard.
      const { error: signOutError } = await supabase.auth.signOut({ scope: "local" });
      if (signOutError) throw signOutError;
      router.replace("/login");
    } catch {
      setError("Revenirea la autentificare nu a reușit. Încearcă din nou.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ minHeight: "100vh", background: "#f7f8fa", color: "#111827" }}>
      <header style={{ height: "72px", background: "#ffffff", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 7%" }}>
        <a href="/" style={{ color: "#111827", textDecoration: "none", fontSize: "25px", fontWeight: "800", letterSpacing: "-1px" }}>shaus</a>
        <a href="/" style={{ color: "#4b5563", textDecoration: "none", fontSize: "14px", fontWeight: "600" }}>Înapoi la căutare</a>
      </header>

      <section style={{ minHeight: "calc(100vh - 73px)", display: "flex", justifyContent: "center", alignItems: "center", padding: "50px 20px", boxSizing: "border-box" }}>
        <div style={{ width: "100%", maxWidth: "460px", background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "20px", padding: "36px", boxShadow: "0 20px 50px rgba(17,24,39,0.08)", boxSizing: "border-box" }}>
          <h1 style={{ margin: 0, fontSize: "30px", fontWeight: "800", letterSpacing: "-1px" }}>Resetează parola</h1>
          <p style={{ color: "#6b7280", fontSize: "15px", lineHeight: "1.6", margin: "10px 0 28px" }}>
            Alege o parolă nouă pentru contul tău shaus.
          </p>

          {checkingSession && <p role="status" style={{ color: "#6b7280", fontSize: "15px" }}>Se verifică linkul de resetare...</p>}

          {success && (
            <div role="status" style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534", borderRadius: "10px", padding: "12px 14px", fontSize: "13px", lineHeight: "1.5", marginBottom: "18px" }}>
              Parola a fost schimbată cu succes. Te poți autentifica folosind parola nouă.
            </div>
          )}

          {(error || (!checkingSession && !canReset && !success)) && (
            <div role="alert" style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c", borderRadius: "10px", padding: "12px 14px", fontSize: "13px", lineHeight: "1.5", marginBottom: "18px" }}>
              {error || invalidLinkMessage}
            </div>
          )}

          {!checkingSession && canReset && !success && (
            <form onSubmit={handleSubmit}>
              <label htmlFor="new-password" style={labelStyle}>Parolă nouă</label>
              <input id="new-password" type="password" autoComplete="new-password" required minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} disabled={loading} placeholder="Minimum 6 caractere" style={inputStyle} />
              <label htmlFor="confirm-new-password" style={labelStyle}>Confirmă parola nouă</label>
              <input id="confirm-new-password" type="password" autoComplete="new-password" required minLength={6} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} disabled={loading} placeholder="Repetă parola nouă" style={{ ...inputStyle, marginBottom: "22px" }} />
              <button type="submit" disabled={loading} style={{ ...buttonStyle, background: loading ? "#374151" : "#111827", cursor: loading ? "not-allowed" : "pointer" }}>
                {loading ? "Se procesează..." : "Schimbă parola"}
              </button>
            </form>
          )}

          {success ? (
            <button type="button" onClick={returnToLogin} disabled={loading} style={{ ...buttonStyle, background: loading ? "#374151" : "#111827", cursor: loading ? "not-allowed" : "pointer" }}>
              {loading ? "Se procesează..." : "Înapoi la autentificare"}
            </button>
          ) : (
            <p style={{ textAlign: "center", fontSize: "13px", lineHeight: "1.5", margin: "22px 0 0" }}>
              <a href="/login" style={{ color: "#2563eb", textDecoration: "none", fontWeight: "700" }}>Înapoi la autentificare</a>
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
