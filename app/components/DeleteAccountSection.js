"use client";

import { useRef, useState } from "react";
import { supabase } from "../lib/supabase";

const buttonStyle = {
  border: "1px solid #CBD5E1", borderRadius: "9px", padding: "11px 16px",
  fontFamily: "inherit", fontSize: "13px", fontWeight: "800", cursor: "pointer",
};

export default function DeleteAccountSection() {
  const dialogRef = useRef(null);
  const triggerRef = useRef(null);
  const deletingRef = useRef(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  function close() {
    if (!deletingRef.current) dialogRef.current?.close();
  }

  async function confirmDeletion() {
    if (deletingRef.current) return;
    deletingRef.current = true;
    setDeleting(true);
    setError("");
    try {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !data?.session?.access_token) {
        setError("Sesiunea a expirat. Autentifică-te din nou pentru a șterge contul.");
        return;
      }
      const response = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session.access_token}` },
        body: JSON.stringify({ confirmation: "delete-account" }),
      });
      const result = await response.json();
      if (!response.ok || result.success !== true) {
        setError(result.error || "Ștergerea nu a fost finalizată. Încearcă din nou.");
        return;
      }
      // The account is gone server-side. Attempt SDK local cleanup even if its
      // request encounters a network error; never keep the user on the dashboard.
      try { await supabase.auth.signOut({ scope: "local" }); } finally {
        window.location.replace("/");
      }
    } catch {
      setError("Nu am putut confirma finalizarea ștergerii. Verifică conexiunea și încearcă din nou. Unele date pot fi deja șterse.");
    } finally {
      deletingRef.current = false;
      setDeleting(false);
    }
  }

  return (
    <section style={{ maxWidth: "620px", boxSizing: "border-box", marginTop: "24px", padding: "20px", border: "1px solid #FECACA", borderRadius: "12px", background: "#FFF7F7" }}>
      <h2 style={{ margin: "0 0 8px", color: "#991B1B", fontSize: "18px" }}>Șterge contul</h2>
      <p style={{ color: "#64748B", fontSize: "13px", lineHeight: "1.5" }}>Ștergerea contului este permanentă.</p>
      <button ref={triggerRef} type="button" onClick={() => { setError(""); dialogRef.current?.showModal(); }} style={{ ...buttonStyle, background: "#B91C1C", color: "#FFFFFF", borderColor: "#B91C1C" }}>Șterge contul</button>
      <dialog
        ref={dialogRef}
        className="delete-account-dialog"
        aria-labelledby="delete-account-title"
        aria-describedby="delete-account-description"
        aria-busy={deleting}
        onCancel={(event) => { if (deletingRef.current) event.preventDefault(); }}
        onClose={() => triggerRef.current?.focus()}
        style={{ width: "min(460px, calc(100% - 32px))", maxHeight: "calc(100dvh - 32px)", overflowY: "auto", boxSizing: "border-box", border: "1px solid #E2E8F0", borderRadius: "16px", padding: "24px", color: "#172554", overflowWrap: "anywhere" }}
      >
        <h2 id="delete-account-title" style={{ margin: "0 0 14px", fontSize: "22px" }}>Ștergi contul?</h2>
        <p id="delete-account-description" style={{ fontSize: "14px", lineHeight: "1.6" }}>Această acțiune este permanentă. Contul, anunțurile, fotografiile, favoritele și conversațiile tale vor fi șterse și nu vor putea fi recuperate.</p>
        <p style={{ fontSize: "12px", color: "#64748B", lineHeight: "1.5" }}>Conversațiile vor dispărea și pentru ceilalți participanți.</p>
        {error && <p role="alert" style={{ color: "#B91C1C", fontSize: "13px", lineHeight: "1.5" }}>{error}</p>}
        {deleting && <p role="status" style={{ fontSize: "13px" }}>Se șterge contul… Nu închide această pagină.</p>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", flexWrap: "wrap", marginTop: "20px" }}>
          <button type="button" autoFocus disabled={deleting} onClick={close} style={{ ...buttonStyle, background: "#FFFFFF", color: "#172554" }}>Anulează</button>
          <button type="button" disabled={deleting} onClick={confirmDeletion} style={{ ...buttonStyle, background: "#B91C1C", borderColor: "#B91C1C", color: "#FFFFFF", opacity: deleting ? 0.65 : 1 }}>Șterge definitiv contul</button>
        </div>
      </dialog>
      <style>{`.delete-account-dialog::backdrop { background: rgba(15, 23, 42, 0.5); }`}</style>
    </section>
  );
}
