"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AccountButton from "./components/AccountButton";

function normalizeText(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/ș/g, "s")
    .replace(/ț/g, "t")
    .replace(/ă/g, "a")
    .replace(/â/g, "a")
    .replace(/î/g, "i")
    .replace(/[^a-z0-9]+/g, "");
}

function normalizeSlug(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/ș/g, "s")
    .replace(/ț/g, "t")
    .replace(/ă/g, "a")
    .replace(/â/g, "a")
    .replace(/î/g, "i")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function MobileHomeClient({
  universities = [],
  cities = [],
}) {
  const router = useRouter();

  const [selectedCity, setSelectedCity] = useState("");
  const [selectedUniversity, setSelectedUniversity] =
    useState("");

  const selectedCityObject = useMemo(() => {
    if (!selectedCity) {
      return null;
    }

    const selectedNormalized =
      normalizeSlug(selectedCity);

    return (
      cities.find(
        (city) =>
          normalizeSlug(city.slug) ===
          selectedNormalized
      ) || null
    );
  }, [cities, selectedCity]);

  const cityUniversities = useMemo(() => {
    if (!selectedCityObject) {
      return [];
    }

    const cityName = normalizeText(
      selectedCityObject.name
    );

    const citySlug = normalizeSlug(
      selectedCityObject.slug
    );

    return universities.filter((university) => {
      const universityCity =
        normalizeText(university.city);

      const universityCitySlug =
        normalizeSlug(university.city);

      const universityCityName =
        normalizeText(
          university.city_name
        );

      const universityCitySlugValue =
        normalizeSlug(
          university.city_slug
        );

      const universityCityId =
        String(
          university.city_id || ""
        ).trim();

      const selectedCityId =
        String(
          selectedCityObject.id || ""
        ).trim();

      return (
        universityCity === cityName ||
        universityCitySlug === citySlug ||
        universityCityName === cityName ||
        universityCitySlugValue === citySlug ||
        (
          universityCityId &&
          selectedCityId &&
          universityCityId ===
            selectedCityId
        )
      );
    });
  }, [
    universities,
    selectedCityObject,
  ]);

  function handleCityChange(event) {
    const value = event.target.value;

    setSelectedCity(value);
    setSelectedUniversity("");
  }

  function handleSearch() {
    if (!selectedCity) {
      return;
    }

    const city = cities.find(
      (item) =>
        normalizeSlug(item.slug) ===
        normalizeSlug(selectedCity)
    );

    const citySlug =
      city?.slug || selectedCity;

    const params =
      new URLSearchParams();

    if (selectedUniversity) {
      params.set(
        "universitate",
        selectedUniversity
      );
    }

    const query = params.toString();

    router.push(
      `/chirii/${citySlug}${
        query
          ? `?${query}`
          : ""
      }`
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        margin: 0,
        background: "#F8FAFC",
        color: "#0F172A",
        fontFamily:
          "Arial, Helvetica, sans-serif",
      }}
    >
      {/* HEADER */}

      <header
        style={{
          minHeight: "60px",
          boxSizing: "border-box",
          background: "#FFFFFF",
          borderBottom:
            "1px solid #E2E8F0",
          display: "flex",
          alignItems: "center",
          justifyContent:
            "space-between",
          padding: "0 16px",
        }}
      >
        <a
          href="/"
          style={{
            color: "#172554",
            textDecoration: "none",
            fontSize: "24px",
            lineHeight: 1,
            fontWeight: "900",
            letterSpacing: "-1.2px",
          }}
        >
          shaus
        </a>

        <AccountButton mobile />
      </header>

      {/* HERO */}

      <section
        style={{
          width: "100%",
          maxWidth: "560px",
          boxSizing: "border-box",
          margin: "0 auto",
          padding:
            "52px 16px 40px",
        }}
      >
        <h1
          style={{
            margin: 0,
            color: "#172554",
            fontSize: "36px",
            lineHeight: "1.08",
            letterSpacing: "-1.5px",
            fontWeight: "900",
          }}
        >
          Chiria ta.
          <br />

          <span
            style={{
              color: "#2563EB",
            }}
          >
            Aproape de facultate.
          </span>
        </h1>

        <p
          style={{
            margin:
              "14px 0 28px",
            color: "#64748B",
            fontSize: "15px",
            lineHeight: "1.55",
            fontWeight: "400",
          }}
        >
          Găsește chiria potrivită
          pentru tine, într-un singur
          loc.
        </p>

        {/* SEARCH CARD */}

        <div
          style={{
            width: "100%",
            boxSizing: "border-box",
            background: "#FFFFFF",
            border:
              "1px solid #E2E8F0",
            borderRadius: "16px",
            padding: "16px",
            boxShadow:
              "0 8px 28px rgba(15,23,42,0.07)",
          }}
        >
          {/* ORAȘ */}

          <label
            style={{
              display: "block",
              marginBottom: "7px",
              color: "#334155",
              fontSize: "12px",
              lineHeight: 1.2,
              fontWeight: "800",
            }}
          >
            Oraș
          </label>

          <select
            value={selectedCity}
            onChange={handleCityChange}
            style={{
              width: "100%",
              height: "50px",
              boxSizing: "border-box",
              border:
                "1px solid #CBD5E1",
              borderRadius: "10px",
              background: "#FFFFFF",
              color: selectedCity
                ? "#0F172A"
                : "#94A3B8",
              padding:
                "0 13px",
              fontFamily:
                "Arial, Helvetica, sans-serif",
              fontSize: "14px",
              fontWeight: "600",
              outline: "none",
              appearance: "auto",
            }}
          >
            <option value="">
              Alege orașul
            </option>

            {cities.map((city) => (
              <option
                key={city.id}
                value={city.slug}
              >
                {city.name}
              </option>
            ))}
          </select>

          {/* UNIVERSITATE */}

          <label
            style={{
              display: "block",
              marginTop: "16px",
              marginBottom: "7px",
              color: "#334155",
              fontSize: "12px",
              lineHeight: 1.2,
              fontWeight: "800",
            }}
          >
            Universitate
          </label>

          <select
            value={selectedUniversity}
            onChange={(event) =>
              setSelectedUniversity(
                event.target.value
              )
            }
            disabled={!selectedCity}
            style={{
              width: "100%",
              height: "50px",
              boxSizing: "border-box",
              border:
                "1px solid #CBD5E1",
              borderRadius: "10px",
              background: !selectedCity
                ? "#F8FAFC"
                : "#FFFFFF",
              color:
                selectedUniversity
                  ? "#0F172A"
                  : "#94A3B8",
              padding:
                "0 13px",
              fontFamily:
                "Arial, Helvetica, sans-serif",
              fontSize: "14px",
              fontWeight: "600",
              outline: "none",
              appearance: "auto",
            }}
          >
            <option value="">
              Toate universitățile
            </option>

            {cityUniversities.map(
              (university) => (
                <option
                  key={university.id}
                  value={university.id}
                >
                  {university.name}
                </option>
              )
            )}
          </select>

          {/* BUTON */}

          <button
            type="button"
            onClick={handleSearch}
            disabled={!selectedCity}
            style={{
              width: "100%",
              height: "50px",
              marginTop: "16px",
              border: "none",
              borderRadius: "10px",
              background: selectedCity
                ? "#172554"
                : "#CBD5E1",
              color: "#FFFFFF",
              fontFamily:
                "Arial, Helvetica, sans-serif",
              fontSize: "14px",
              fontWeight: "800",
              cursor: selectedCity
                ? "pointer"
                : "not-allowed",
            }}
          >
            Vezi chiriile
          </button>
        </div>
      </section>
    </main>
  );
}
