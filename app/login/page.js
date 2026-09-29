"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, isPasswordRecoverySession } from "../lib/supabase";

const nicknameTakenMessage = "Acest username este deja folosit. Alege alt username.";
const emailTakenMessage = "Acest email este deja înregistrat. Folosește alt email sau intră în cont.";

async function checkEmailAvailability(value, signal) {
  const response = await fetch("/api/auth/email-availability", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: value }),
    cache: "no-store",
    signal: signal || AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error("Email check unavailable");
  const result = await response.json();
  if (typeof result.registered !== "boolean") throw new Error("Invalid email check");
  return result.registered;
}

function checkNicknameAvailability(value) {
  return supabase
    .from("public_profiles")
    .select("id")
    .eq("nickname", value)
    .limit(1)
    .maybeSingle();
}

export default function LoginPage() {
  const router = useRouter();

  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [nicknameCheck, setNicknameCheck] = useState(null);
  const cleanNicknameValue = nickname.trim();
  const nicknameTaken = nicknameCheck?.value === cleanNicknameValue &&
    nicknameCheck?.status === "taken";

  useEffect(() => {
    if (mode !== "register" || loading ||
        !/^[a-zA-Z0-9._-]{3,30}$/.test(cleanNicknameValue)) return;

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const { data, error: checkError } = await checkNicknameAvailability(cleanNicknameValue);
        if (!cancelled) {
          setNicknameCheck({
            value: cleanNicknameValue,
            status: checkError ? "error" : data ? "taken" : "available",
          });
        }
      } catch {
        if (!cancelled) setNicknameCheck({ value: cleanNicknameValue, status: "error" });
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [nickname, cleanNicknameValue, mode, loading]);

  const [emailCheck, setEmailCheck] = useState(null);
  const normalizedEmail = email.trim().toLowerCase();
  const emailTaken = emailCheck?.value === normalizedEmail && emailCheck?.status === "taken";

  useEffect(() => {
    if (mode !== "register" || loading || normalizedEmail.length > 254 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) return;
    let cancelled = false;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const registered = await checkEmailAvailability(normalizedEmail, controller.signal);
        if (!cancelled) setEmailCheck({ value: normalizedEmail, status: registered ? "taken" : "available" });
      } catch {
        if (!cancelled) setEmailCheck({ value: normalizedEmail, status: "error" });
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, [email, normalizedEmail, mode, loading]);

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
          router.replace(isPasswordRecoverySession(session.user) ? "/reset-password" : "/dashboard");
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

    if (mode === "register" && nicknameTaken) return;
    if (mode === "register" && emailTaken) return;

    setError("");
    setMessage("");

    const cleanName = name.trim();
    const cleanNickname = nickname.trim();
    const cleanEmail = email.trim();

    if (mode === "register" && !cleanName) {
      setError("Completează numele.");
      return;
    }

    if (mode === "register" && !cleanNickname) {
      setError("Alege un nickname.");
      return;
    }

    if (
      mode === "register" &&
      (cleanNickname.length < 3 ||
        cleanNickname.length > 30)
    ) {
      setError(
        "Nickname-ul trebuie să aibă între 3 și 30 de caractere."
      );
      return;
    }

    if (
      mode === "register" &&
      !/^[a-zA-Z0-9._-]+$/.test(cleanNickname)
    ) {
      setError(
        "Nickname-ul poate conține doar litere, cifre, punct, _ și -."
      );
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
        /*
          VERIFICĂM DACĂ NICKNAME-UL ESTE DEJA FOLOSIT
        */

        const {
          data: existingNickname,
          error: nicknameCheckError,
        } = await checkNicknameAvailability(cleanNickname);

        if (nicknameCheckError) {
          console.error(
            "Eroare verificare nickname:",
            nicknameCheckError
          );

          setError(
            "Nickname-ul nu a putut fi verificat. Încearcă din nou."
          );
          return;
        }

        if (existingNickname) {
          setNicknameCheck({ value: cleanNickname, status: "taken" });
          return;
        }

        try {
          if (await checkEmailAvailability(cleanEmail)) {
            setEmailCheck({ value: cleanEmail.toLowerCase(), status: "taken" });
            return;
          }
        } catch {
          setError("Email-ul nu a putut fi verificat. Încearcă din nou.");
          return;
        }

        /*
          CREĂM UTILIZATORUL
        */

        const {
          data,
          error: signUpError,
        } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              name: cleanName,
              nickname: cleanNickname,
            },
          },
        });

        if (signUpError) {
          if (["email_exists", "user_already_exists"].includes(signUpError.code) ||
              /^User already registered\.?$/i.test(signUpError.message || "")) {
            setEmailCheck({ value: cleanEmail.toLowerCase(), status: "taken" });
            return;
          }
          // Auth can hide a trigger's unique violation behind a generic error.
          const { data: nicknameOwner } = await checkNicknameAvailability(cleanNickname);
          if (signUpError.code === "23505" || nicknameOwner) {
            setNicknameCheck({ value: cleanNickname, status: "taken" });
            return;
          }
          setError(signUpError.message);
          return;
        }

        // With confirmation enabled, Auth may obscure an existing confirmed user.
        if (!data?.session && Array.isArray(data?.user?.identities) && data.user.identities.length === 0) {
          setEmailCheck({ value: cleanEmail.toLowerCase(), status: "taken" });
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
                nickname: cleanNickname,
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

            if (
              profileError.code === "23505"
            ) {
              setNicknameCheck({ value: cleanNickname, status: "taken" });
            } else {
              setError(
                "Contul a fost creat, dar profilul nu a putut fi salvat."
              );
            }

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
        setNickname("");
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

      const metadataNickname =
        data.user.user_metadata?.nickname?.trim();

      if (metadataName) {
        const { data: existingProfile } = await supabase
          .from("profiles")
          .select("id, nickname")
          .eq("id", data.user.id)
          .maybeSingle();

        if (!existingProfile) {
          const { error: profileError } = await supabase
            .from("profiles")
            .insert({
              id: data.user.id,
              name: metadataName,
              nickname: metadataNickname || null,
            });

          if (profileError) {
            console.error(
              "Eroare la crearea profilului:",
              profileError
            );
          }
        } else if (
          !existingProfile.nickname &&
          metadataNickname
        ) {
          const { error: nicknameUpdateError } =
            await supabase
              .from("profiles")
              .update({
                nickname: metadataNickname,
              })
              .eq("id", data.user.id);

          if (nicknameUpdateError) {
            console.error(
              "Eroare actualizare nickname:",
              nicknameUpdateError
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

  const handleRecovery = async (event) => {
    event.preventDefault();
    if (loading) return;

    setError("");
    setMessage("");
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError("Completează adresa de email.");
      return;
    }

    setLoading(true);
    try {
      const { error: recoveryError } = await supabase.auth.resetPasswordForEmail(
        cleanEmail,
        { redirectTo: `${window.location.origin}/reset-password` }
      );
      if (recoveryError) {
        setError("Linkul nu a putut fi trimis. Încearcă din nou peste câteva minute.");
        return;
      }
      setMessage("Dacă există un cont cu această adresă, vei primi un link pentru resetarea parolei. Verifică emailul.");
    } catch {
      setError("Linkul nu a putut fi trimis. Verifică conexiunea și încearcă din nou.");
    } finally {
      setLoading(false);
    }
  };

  /*
    SCHIMBARE LOGIN / REGISTER / RECOVERY
  */

  const changeMode = (newMode) => {
    setEmailCheck(null);
    setNicknameCheck(null);
    setMode(newMode);
    setError("");
    setMessage("");
    setName("");
    setNickname("");
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
              : mode === "recovery"
              ? "Ai uitat parola?"
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
              : mode === "recovery"
              ? "Introdu adresa de email a contului tău și îți trimitem un link pentru resetarea parolei."
              : "Creează-ți contul pentru a putea publica și administra anunțuri."}
          </p>

          {/* TABS */}

          {mode !== "recovery" && <div
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
          </div>}

          <form onSubmit={mode === "recovery" ? handleRecovery : handleSubmit}>
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
                  placeholder="Numele tău real"
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

                {/* NICKNAME */}

                <label
                  style={{
                    display: "block",
                    fontSize: "14px",
                    fontWeight: "700",
                    marginBottom: "8px",
                  }}
                >
                  Nickname
                </label>

                <input
                  type="text"
                  value={nickname}
                  onChange={(event) => {
                    setNicknameCheck(null);
                    setNickname(event.target.value);
                  }}
                  aria-invalid={nicknameTaken || undefined}
                  aria-describedby={nicknameTaken ? "nickname-error" : undefined}
                  placeholder="Ex: user1234"
                  autoComplete="username"
                  disabled={loading}
                  maxLength={30}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    border: "1px solid #d1d5db",
                    borderRadius: "11px",
                    padding: "14px 15px",
                    fontFamily: "inherit",
                    fontSize: "15px",
                    outline: "none",
                    marginBottom: "7px",
                  }}
                />

                {nicknameTaken && (
                  <div id="nickname-error" role="alert" style={{
                    color: "#dc2626", fontSize: "12px", lineHeight: "1.5", marginBottom: "7px",
                  }}>
                    {nicknameTakenMessage}
                  </div>
                )}

                <div
                  style={{
                    color: "#6b7280",
                    fontSize: "12px",
                    lineHeight: "1.5",
                    marginBottom: "19px",
                  }}
                >
                  Acesta este numele tău public pe shaus.
                  Va fi vizibil celorlalți utilizatori.
                </div>
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
              required={mode === "recovery"}
              value={email}
              onChange={(event) => {
                setEmailCheck(null);
                setEmail(event.target.value);
              }}
              aria-invalid={(mode === "register" && emailTaken) || undefined}
              aria-describedby={mode === "register" && emailTaken ? "email-error" : undefined}
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

            {mode === "register" && emailTaken && (
              <div id="email-error" role="alert" style={{
                color: "#dc2626", fontSize: "12px", lineHeight: "1.5", marginTop: "-12px", marginBottom: "19px",
              }}>
                {emailTakenMessage}
              </div>
            )}

            {mode !== "recovery" && <>
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
            </>}

            {mode === "login" && (
              <button
                type="button"
                disabled={loading}
                onClick={() => changeMode("recovery")}
                style={{ border: "none", background: "transparent", padding: "0 0 18px", borderRadius: "9px", color: "#2563eb", fontFamily: "inherit", fontSize: "13px", fontWeight: "600", cursor: "pointer" }}
              >
                Ai uitat parola?
              </button>
            )}

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
                role="alert"
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
                role="status"
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
              disabled={loading || (mode === "register" && (nicknameTaken || emailTaken))}
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
                : mode === "recovery"
                ? "Trimite linkul de resetare"
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
            {mode === "recovery" ? "" : mode === "login"
              ? "Nu ai încă un cont? "
              : "Ai deja un cont? "}

            <button
              type="button"
              disabled={mode === "recovery" && loading}
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
                : mode === "recovery"
                ? "Înapoi la autentificare"
                : "Intră în cont"}
            </button>
          </p>
        </div>
      </section>
    </main>
  );
}
