import { supabase } from "./lib/supabase";
import SearchBox from "./components/SearchBox";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { data: universities, error } = await supabase
    .from("universities")
    .select("*")
    .order("city")
    .order("name");

  return (
    <main
      style={{
        margin: 0,
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
        <div
          style={{
            fontSize: "25px",
            fontWeight: "800",
            letterSpacing: "-1px",
          }}
        >
          🏠 StudentHousing
        </div>

        <div
          style={{
            display: "flex",
            gap: "28px",
            alignItems: "center",
            fontSize: "15px",
            fontWeight: "600",
          }}
        >
          <span>Caută chirii</span>

          <button
            style={{
              background: "#111827",
              color: "#ffffff",
              border: "none",
              borderRadius: "10px",
              padding: "11px 18px",
              fontFamily: "inherit",
              fontSize: "14px",
              fontWeight: "700",
              cursor: "pointer",
            }}
          >
            Adaugă proprietatea
          </button>
        </div>
      </header>

      {/* HERO */}
      <section
        style={{
          maxWidth: "1180px",
          margin: "0 auto",
          padding: "90px 30px 75px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            display: "inline-block",
            background: "#e8f1ff",
            color: "#2563eb",
            padding: "8px 14px",
            borderRadius: "100px",
            fontSize: "14px",
            fontWeight: "700",
            marginBottom: "22px",
          }}
        >
          🎓 Locuințe pentru viața de student
        </div>

        <h1
          style={{
            fontSize: "58px",
            lineHeight: "1.05",
            letterSpacing: "-2.5px",
            maxWidth: "850px",
            margin: "0 auto",
            fontWeight: "800",
          }}
        >
          Chiria ta.
          <br />

          <span style={{ color: "#2563eb" }}>
            Aproape de facultate.
          </span>
        </h1>

        <p
          style={{
            maxWidth: "650px",
            margin: "25px auto 40px",
            fontSize: "19px",
            lineHeight: "1.6",
            color: "#6b7280",
          }}
        >
          Găsește apartamente și camere aproape de universitatea ta,
          într-un singur loc.
        </p>

        {/* SEARCH CU AUTOCOMPLETE */}
        <SearchBox universities={universities || []} />

        {error && (
          <p
            style={{
              marginTop: "20px",
              color: "#dc2626",
            }}
          >
            Eroare Supabase: {error.message}
          </p>
        )}

        {/* BENEFITS */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "35px",
            flexWrap: "wrap",
            marginTop: "30px",
            color: "#6b7280",
            fontSize: "14px",
          }}
        >
          <span>✓ Aproape de universitate</span>
          <span>✓ Chirii într-un singur loc</span>
          <span>✓ Direct de la proprietari</span>
        </div>
      </section>

      {/* UNIVERSITIES */}
      <section
        style={{
          background: "#ffffff",
          padding: "70px 7%",
        }}
      >
        <div
          style={{
            maxWidth: "1180px",
            margin: "0 auto",
          }}
        >
          <div style={{ marginBottom: "35px" }}>
            <h2
              style={{
                margin: 0,
                fontSize: "32px",
                fontWeight: "800",
                letterSpacing: "-1px",
              }}
            >
              Începe cu universitatea ta
            </h2>

            <p
              style={{
                color: "#6b7280",
                marginTop: "10px",
                fontSize: "16px",
              }}
            >
              Descoperă locuințe aflate la câteva minute de cursuri.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "18px",
            }}
          >
            {(universities || []).map((university) => (
              <div
                key={university.id}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: "16px",
                  padding: "22px",
                  background: "#ffffff",
                }}
              >
                <div
                  style={{
                    width: "46px",
                    height: "46px",
                    background: "#eff6ff",
                    borderRadius: "12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "22px",
                    marginBottom: "18px",
                  }}
                >
                  🎓
                </div>

                <div
                  style={{
                    fontSize: "20px",
                    fontWeight: "800",
                    marginBottom: "7px",
                  }}
                >
                  {university.short_name || university.name}
                </div>

                <div
                  style={{
                    color: "#6b7280",
                    lineHeight: "1.5",
                    minHeight: "48px",
                  }}
                >
                  {university.name}
                </div>

                <div
                  style={{
                    marginTop: "17px",
                    color: "#2563eb",
                    fontWeight: "700",
                    fontSize: "14px",
                  }}
                >
                  📍 {university.city}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
