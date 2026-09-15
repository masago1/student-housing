import { supabase } from "../lib/supabase";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { data: universities, error } = await supabase
    .from("universities")
    .select("*")
    .order("name");

  return (
    <main style={{ padding: "40px", fontFamily: "Arial" }}>
      <h1>Găsește chiria potrivită pentru facultatea ta 🏠</h1>

      <p>
        Apartamente și camere aproape de cele mai mari centre universitare
        din România.
      </p>

      <h2>Universități</h2>

      {error && (
        <p>Eroare la conectarea cu Supabase: {error.message}</p>
      )}

      {universities?.map((university) => (
        <div
          key={university.id}
          style={{
            border: "1px solid #ddd",
            borderRadius: "10px",
            padding: "16px",
            marginTop: "12px",
          }}
        >
          <strong>{university.short_name}</strong>
          <p>{university.name}</p>
          <p>📍 {university.city}</p>
        </div>
      ))}
    </main>
  );
}
