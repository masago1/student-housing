"use client";

import { useRouter, useSearchParams } from "next/navigation";

export default function BackToSearch({ city }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function normalizeCity(value = "") {
    return value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-");
  }

  function handleBack() {
    // URL-ul paginii de rezultate din care am venit
    const from = searchParams.get("from");

    // Acceptăm doar rute interne de chirii
    if (from && from.startsWith("/chirii/")) {
      router.push(from);
      return;
    }

    // Fallback: dacă proprietatea a fost deschisă direct
    const citySlug = normalizeCity(city);

    if (citySlug) {
      router.push(`/chirii/${citySlug}`);
      return;
    }

    // Ultimul fallback
    router.push("/");
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
