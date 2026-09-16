import { supabase } from "./lib/supabase";
import SearchBox from "./components/SearchBox";
import AccountButton from "./components/AccountButton";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [
    { data: universities, error: universitiesError },
    { data: cities, error: citiesError },
    { data: neighborhoods, error: neighborhoodsError },
  ] = await Promise.all([
    supabase
      .from("universities")
      .select("*")
      .order("city")
      .order("name"),

    supabase
      .from("cities")
      .select("id, name, slug")
      .order("name"),

    supabase
      .from("neighborhoods")
      .select("id, city_id, name, slug")
      .order("name"),
  ]);

  const error =
    universitiesError ||
    citiesError ||
    neighborhoodsError;

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
            gap: "12px",
            alignItems: "center",
            fontSize: "14px",
            fontWeight: "700",
          }}
        >
          <AccountButton />

          <a
            href="/adaugaproprietate"
            style={{
              background: "#111827",
              color: "#ffffff",
              textDecoration: "none",
              borderRadius: "10px",
              padding: "12px 18px",
            }}
          >
            Adaugă proprietatea
          </a>
        </div>
      </header>

      {/* HERO */}
      <section
        style={{
          maxWidth: "1180px",
          margin: "0 auto",
          padding: "105px 30px 100px",
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
          Locuințe pentru viața de student
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

          <span
            style={{
              color: "#2563eb",
            }}
          >
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

        {/* SEARCH */}
        <SearchBox
          universities={universities || []}
          cities={cities || []}
          neighborhoods={neighborhoods || []}
        />

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
            marginTop: "32px",
            color: "#6b7280",
            fontSize: "14px",
            fontWeight: "500",
          }}
        >
          <span>Aproape de universitate</span>
          <span>Chirii într-un singur loc</span>
          <span>Direct de la proprietari</span>
        </div>
      </section>
    </main>
  );
}
