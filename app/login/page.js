"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

export default function LoginPage() {
  const router = useRouter();

  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  /*
    VERIFICĂM DACĂ UTILIZATORUL ESTE DEJA LOGAT
  */

  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (!mounted) {
          return;
        }

        if (sessionError) {
          console.error(
            "Eroare la verificarea sesiunii:",
            sessionError
          );

          setCheckingSession(false);
          return;
        }

        if (session?.user) {
          router.replace("/dashboard");
          return;
        }

        setCheckingSession(false);
      } catch (sessionError) {
        console.error(
          "Eroare la verificarea sesiunii:",
          sessionError
        );

        if (mounted) {
          setCheckingSession(false);
        }
      }
    };

    checkSession();

    return () => {
      mounted = false;
    };
  }, [router]);

  /*
    LOGIN / REGISTER
  */

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (loading) {
      return;
    }

    setError("");
    setMessage("");

    const cleanName = name.trim();
    const cleanEmail = email.trim();

    if (mode === "register" && !cleanName) {
      setError("Completează numele.");
      return;
    }

    if (!cleanEmail || !password) {
      setError("Completează adresa de email și parola.");
      return;
    }

    if (mode === "register" && password.length < 6) {
      setError("Parola trebuie să aibă minimum 6 caractere.");
      return;
    }

    if (
      mode === "register" &&
      password !== confirmPassword
    ) {
      setError("Parolele nu coincid.");
      return;
    }

    setLoading(true);

    try {
      /*
        CREARE CONT
      */

      if (mode === "register") {
        const {
          data,
          error: signUpError,
        } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              name: cleanName,
            },
          },
        });

        if (signUpError) {
          setError(signUpError.message);
          return;
        }

        /*
          Dacă avem sesiune imediat după creare,
          salvăm profilul utilizatorului.
        */

        if (data?.user && data?.session) {
          const { error: profileError } = await supabase
            .from("profiles")
            .upsert(
              {
                id: data.user.id,
                name: cleanName,
              },
              {
                onConflict: "id",
              }
            );

          if (profileError) {
            console.error(
              "Eroare la salvarea profilului:",
              profileError
            );

            setError(
              "Contul a fost creat, dar numele nu a putut fi salvat."
            );
            return;
          }

          router.replace("/dashboard");
          return;
        }

        /*
          Dacă este necesară confirmarea emailului.
        */

        setMessage(
          "Contul a fost creat. Verifică emailul pentru confirmarea contului, apoi autentifică-te."
        );

        setName("");
        setEmail("");
        setPassword("");
        setConfirmPassword("");

        return;
      }

      /*
        LOGIN
      */

      const {
        data,
        error: signInError,
      } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (signInError) {
        setError("Email sau parolă incorectă.");
        return;
      }

      if (!data?.session || !data?.user) {
        setError(
          "Autentificarea a reușit, dar sesiunea nu a putut fi inițializată. Încearcă din nou."
        );
        return;
      }

      /*
        Dacă utilizatorul a fost creat cu confirmare email,
        ne asigurăm la primul login că profilul există.
      */

      const metadataName =
        data.user.user_metadata?.name?.trim();

      if (metadataName) {
        const { data: existingProfile } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", data.user.id)
          .maybeSingle();

        if (!existingProfile) {
          const { error: profileError } = await supabase
            .from("profiles")
            .insert({
              id: data.user.id,
              name: metadataName,
            });

          if (profileError) {
            console.error(
              "Eroare la crearea profilului:",
              profileError
            );
          }
        }
      }

      router.replace("/dashboard");
    } catch (loginError) {
      console.error(
        "Eroare autentificare:",
        loginError
      );

      setError(
        "A apărut o eroare. Încearcă din nou."
      );
    } finally {
      setLoading(false);
    }
  };

  /*
    SCHIMBARE LOGIN / REGISTER
  */

  const changeMode = (newMode) => {
    setMode(newMode);
    setError("");
    setMessage("");
    setName("");
    setPassword("");
    setConfirmPassword("");
  };

  /*
    LOADING SESIUNE
  */

  if (checkingSession) {
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
          shaus
        </a>

        <a
          href="/"
          style={{
            color: "#4b5563",
            textDecoration: "none",
            fontSize: "14px",
            fontWeight: "600",
          }}
        >
          Înapoi la căutare
        </a>
      </header>

      {/* LOGIN AREA */}

      <section
        style={{
          minHeight: "calc(100vh - 73px)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          padding: "50px 20px",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "460px",
            background: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: "20px",
            padding: "36px",
            boxShadow:
              "0 20px 50px rgba(17,24,39,0.08)",
            boxSizing: "border-box",
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: "30px",
              fontWeight: "800",
              letterSpacing: "-1px",
            }}
          >
            {mode === "login"
              ? "Intră în cont"
              : "Creează un cont"}
          </h1>

          <p
            style={{
              color: "#6b7280",
              fontSize: "15px",
              lineHeight: "1.6",
              margin: "10px 0 28px",
            }}
          >
            {mode === "login"
              ? "Autentifică-te pentru a-ți administra anunțurile și mesajele."
              : "Creează-ți contul pentru a putea publica și administra anunțuri."}
          </p>

          {/* TABS */}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              padding: "4px",
              background: "#f3f4f6",
              borderRadius: "12px",
              marginBottom: "25px",
            }}
          >
            <button
              type="button"
              onClick={() => changeMode("login")}
              style={{
                border: "none",
                borderRadius: "9px",
                padding: "11px",
                fontFamily: "inherit",
                fontSize: "14px",
                fontWeight: "700",
                cursor: "pointer",
                background:
                  mode === "login"
                    ? "#ffffff"
                    : "transparent",
                color:
                  mode === "login"
                    ? "#111827"
                    : "#6b7280",
                boxShadow:
                  mode === "login"
                    ? "0 1px 3px rgba(0,0,0,0.08)"
                    : "none",
              }}
            >
              Intră în cont
            </button>

            <button
              type="button"
              onClick={() => changeMode("register")}
              style={{
                border: "none",
                borderRadius: "9px",
                padding: "11px",
                fontFamily: "inherit",
                fontSize: "14px",
                fontWeight: "700",
                cursor: "pointer",
                background:
                  mode === "register"
                    ? "#ffffff"
                    : "transparent",
                color:
                  mode === "register"
                    ? "#111827"
                    : "#6b7280",
                boxShadow:
                  mode === "register"
                    ? "0 1px 3px rgba(0,0,0,0.08)"
                    : "none",
              }}
            >
              Creează cont
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            {/* NAME */}

            {mode === "register" && (
              <>
                <label
                  style={{
                    display: "block",
                    fontSize: "14px",
                    fontWeight: "700",
                    marginBottom: "8px",
                  }}
                >
                  Nume
                </label>

                <input
                  type="text"
                  value={name}
                  onChange={(event) =>
                    setName(event.target.value)
                  }
                  placeholder="Numele tău"
                  autoComplete="name"
                  disabled={loading}
                  maxLength={80}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    border: "1px solid #d1d5db",
                    borderRadius: "11px",
                    padding: "14px 15px",
                    fontFamily: "inherit",
                    fontSize: "15px",
                    outline: "none",
                    marginBottom: "19px",
                  }}
                />
              </>
            )}

            {/* EMAIL */}

            <label
              style={{
                display: "block",
                fontSize: "14px",
                fontWeight: "700",
                marginBottom: "8px",
              }}
            >
              Email
            </label>

            <input
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              placeholder="nume@email.com"
              autoComplete="email"
              disabled={loading}
              style={{
                width: "100%",
                boxSizing: "border-box",
                border: "1px solid #d1d5db",
                borderRadius: "11px",
                padding: "14px 15px",
                fontFamily: "inherit",
                fontSize: "15px",
                outline: "none",
                marginBottom: "19px",
              }}
            />

            {/* PASSWORD */}

            <label
              style={{
                display: "block",
                fontSize: "14px",
                fontWeight: "700",
                marginBottom: "8px",
              }}
            >
              Parolă
            </label>

            <input
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              placeholder="Minimum 6 caractere"
              autoComplete={
                mode === "login"
                  ? "current-password"
                  : "new-password"
              }
              disabled={loading}
              style={{
                width: "100%",
                boxSizing: "border-box",
                border: "1px solid #d1d5db",
                borderRadius: "11px",
                padding: "14px 15px",
                fontFamily: "inherit",
                fontSize: "15px",
                outline: "none",
                marginBottom:
                  mode === "register"
                    ? "19px"
                    : "22px",
              }}
            />

            {/* CONFIRM PASSWORD */}

            {mode === "register" && (
              <>
                <label
                  style={{
                    display: "block",
                    fontSize: "14px",
                    fontWeight: "700",
                    marginBottom: "8px",
                  }}
                >
                  Confirmă parola
                </label>

                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) =>
                    setConfirmPassword(
                      event.target.value
                    )
                  }
                  placeholder="Repetă parola"
                  autoComplete="new-password"
                  disabled={loading}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    border: "1px solid #d1d5db",
                    borderRadius: "11px",
                    padding: "14px 15px",
                    fontFamily: "inherit",
                    fontSize: "15px",
                    outline: "none",
                    marginBottom: "22px",
                  }}
                />
              </>
            )}

            {/* ERROR */}

            {error && (
              <div
                style={{
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  color: "#b91c1c",
                  borderRadius: "10px",
                  padding: "12px 14px",
                  fontSize: "13px",
                  lineHeight: "1.5",
                  marginBottom: "18px",
                }}
              >
                {error}
              </div>
            )}

            {/* SUCCESS */}

            {message && (
              <div
                style={{
                  background: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  color: "#166534",
                  borderRadius: "10px",
                  padding: "12px 14px",
                  fontSize: "13px",
                  lineHeight: "1.5",
                  marginBottom: "18px",
                }}
              >
                {message}
              </div>
            )}

            {/* SUBMIT */}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                border: "none",
                borderRadius: "11px",
                padding: "14px",
                background: loading
                  ? "#374151"
                  : "#111827",
                color: "#ffffff",
                fontFamily: "inherit",
                fontSize: "15px",
                fontWeight: "700",
                cursor: loading
                  ? "not-allowed"
                  : "pointer",
              }}
            >
              {loading
                ? "Se procesează..."
                : mode === "login"
                ? "Intră în cont"
                : "Creează cont"}
            </button>
          </form>

          <p
            style={{
              textAlign: "center",
              color: "#6b7280",
              fontSize: "13px",
              lineHeight: "1.5",
              margin: "22px 0 0",
            }}
          >
            {mode === "login"
              ? "Nu ai încă un cont? "
              : "Ai deja un cont? "}

            <button
              type="button"
              onClick={() =>
                changeMode(
                  mode === "login"
                    ? "register"
                    : "login"
                )
              }
              style={{
                border: "none",
                background: "transparent",
                padding: 0,
                color: "#2563eb",
                fontFamily: "inherit",
                fontSize: "13px",
                fontWeight: "700",
                cursor: "pointer",
              }}
            >
              {mode === "login"
                ? "Creează cont"
                : "Intră în cont"}
            </button>
          </p>
        </div>
      </section>
    </main>
  );
}
