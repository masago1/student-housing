"use client";

import { useRouter } from "next/navigation";

export default function BackToSearch({ city }) {
  const router = useRouter();

  function handleBack() {
    // Dacă utilizatorul a venit din lista de anunțuri,
    // îl întoarcem exact la pagina anterioară.
    if (window.history.length > 1) {
      router.back();
      return;
    }

    // Fallback dacă anunțul a fost deschis direct.
    const citySlug = city
      ? city
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .trim()
          .replace(/\s+/g, "-")
      : "";

    if (citySlug) {
      router.push(`/chirii/${citySlug}`);
    } else {
      router.push("/");
    }
  }

  return (
    <button
      type="button"
      onClick={handleBack}
      style={{
        border: "none",
        background: "transparent",
        padding: 0,
        color: "#374151",
        fontFamily: "inherit",
        fontSize: "14px",
        fontWeight: "700",
        cursor: "pointer",
      }}
    >
      Înapoi la căutare
    </button>
  );
}
