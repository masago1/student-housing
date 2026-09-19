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
      <style>{`
        @media (max-width: 768px) {
          .home-header {
            height: auto !important;
            min-height: 64px !important;
            padding: 12px 18px !important;
            gap: 12px !important;
          }

          .home-header-actions {
            gap: 7px !important;
            font-size: 13px !important;
          }

          .home-header-add {
            padding: 10px 12px !important;
            border-radius: 9px !important;
            white-space: nowrap !important;
          }

          .home-hero {
            padding: 65px 18px 60px !important;
          }

          .home-title {
            font-size: 40px !important;
            line-height: 1.08 !important;
            letter-spacing: -1.7px !important;
            max-width: 100% !important;
          }

          .home-description {
            max-width: 100% !important;
            margin: 20px auto 30px !important;
            font-size: 16px !important;
            line-height: 1.55 !important;
          }

          .home-search {
            width: 100% !important;
            box-sizing: border-box !important;
          }
        }

        @media (max-width: 480px) {
          .home-header {
            padding: 11px 14px !important;
          }

          .home-logo {
            font-size: 22px !important;
          }

          .home-header-actions {
            gap: 5px !important;
          }

          .home-header-add {
            padding: 9px 10px !important;
            font-size: 12px !important;
          }

          .home-hero {
            padding: 55px 14px 50px !important;
          }

          .home-title {
            font-size: 36px !important;
            letter-spacing: -1.5px !important;
          }

          .home-description {
            font-size: 15px !important;
            margin-top: 18px !important;
            margin-bottom: 26px !important;
          }
        }
      `}</style>

      {/* HEADER */}
      <header
        className="home-header"
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
          className="home-logo"
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

        <div
          className="home-header-actions"
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
            className="home-header-add"
            style={{
              background: "#111827",
              color: "#ffffff",
              textDecoration: "none",
              borderRadius: "10px",
              padding: "12px 18px",
            }}
          >
            Adaugă anunț
          </a>
        </div>
      </header>

      {/* HERO */}
      <section
        className="home-hero"
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
        ></div>

        <h1
          className="home-title"
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
          className="home-description"
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
        <div className="home-search">
          <SearchBox
            universities={universities || []}
            cities={cities || []}
            neighborhoods={neighborhoods || []}
          />
        </div>

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
      </section>
    </main>
  );
}
