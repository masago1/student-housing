"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

export default function AdaugaProprietatePage() {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        router.replace("/login");
        return;
      }

      setUser(user);
      setCheckingAuth(false);
    };

    checkUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        router.replace("/login");
      } else {
        setUser(session.user);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  if (checkingAuth) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#f7f8fa",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#6b7280",
          fontSize: "15px",
          fontWeight: "600",
        }}
      >
        Se verifică autentificarea...
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f7f8fa",
        color: "#111827",
      }}
    >
      {/* HEADER */}
      <header
        style={{
          height: "72px",
          background: "#ffffff",
          borderBottom: "1px solid #e5e7eb",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 7%",
        }}
      >
        <a
          href="/"
          style={{
            color: "#111827",
            textDecoration: "none",
            fontSize: "25px",
            fontWeight: "800",
            letterSpacing: "-1px",
          }}
        >
          StudentHousing
        </a>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "18px",
          }}
        >
          <span
            style={{
              color: "#6b7280",
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
              background: "#ffffff",
              color: "#111827",
              border: "1px solid #e5e7eb",
              borderRadius: "10px",
              padding: "10px 15px",
              fontFamily: "inherit",
              fontSize: "13px",
              fontWeight: "700",
              cursor: "pointer",
            }}
          >
            Deconectare
          </button>
        </div>
      </header>

      {/* CONTENT */}
      <section
        style={{
          maxWidth: "900px",
          margin: "0 auto",
          padding: "60px 30px 100px",
        }}
      >
        <div
          style={{
            marginBottom: "35px",
          }}
        >
          <div
            style={{
              display: "inline-block",
              background: "#e8f1ff",
              color: "#2563eb",
              padding: "7px 12px",
              borderRadius: "100px",
              fontSize: "13px",
              fontWeight: "700",
              marginBottom: "16px",
            }}
          >
            Publică o proprietate
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: "40px",
              lineHeight: "1.15",
              letterSpacing: "-1.5px",
              fontWeight: "800",
            }}
          >
            Adaugă proprietatea
          </h1>

          <p
            style={{
              margin: "13px 0 0",
              color: "#6b7280",
              fontSize: "16px",
              lineHeight: "1.6",
              maxWidth: "650px",
            }}
          >
            Completează informațiile proprietății tale. Anunțul va putea
            fi găsit de studenții care caută chirii în apropierea
            universităților.
          </p>
        </div>

        {/* FORM PLACEHOLDER */}
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: "20px",
            padding: "32px",
            boxShadow: "0 12px 35px rgba(17,24,39,0.05)",
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: "20px",
              fontWeight: "800",
            }}
          >
            Detalii proprietate
          </h2>

          <p
            style={{
              color: "#6b7280",
              fontSize: "14px",
              lineHeight: "1.6",
              margin: "10px 0 0",
            }}
          >
            Formularul pentru publicarea proprietății va fi adăugat în
            pasul următor.
          </p>
        </div>
      </section>
    </main>
  );
}
