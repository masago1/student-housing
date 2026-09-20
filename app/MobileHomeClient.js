"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AccountButton from "./components/AccountButton";

export default function MobileHomeClient({
  universities = [],
  cities = [],
}) {
  const router = useRouter();

  const [selectedCity, setSelectedCity] =
    useState("");

  const [selectedUniversity, setSelectedUniversity] =
    useState("");

  const selectedCityObject = useMemo(() => {
    return cities.find(
      (city) =>
        String(city.slug || "")
          .toLowerCase() ===
        String(selectedCity || "")
          .toLowerCase()
    );
  }, [cities, selectedCity]);

  const cityUniversities = useMemo(() => {
    if (!selectedCityObject) {
      return [];
    }

    const selectedCityName = String(
      selectedCityObject.name || ""
    )
      .trim()
      .toLowerCase();

    return universities.filter(
      (university) =>
        String(university.city || "")
          .trim()
          .toLowerCase() ===
        selectedCityName
    );
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
        String(item.slug || "")
          .toLowerCase() ===
        String(selectedCity)
          .toLowerCase()
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

    const query =
      params.toString();

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
        background: "#F8FAFC",
        color: "#0F172A",
      }}
    >
      {/* HEADER */}

      <header
        style={{
          height: "58px",
          boxSizing: "border-box",
          background: "#FFFFFF",
          borderBottom:
            "1px solid #E2E8F0",
          display: "flex",
          alignItems: "center",
          justifyContent:
            "space-between",
          padding: "0 15px",
        }}
      >
        <a
          href="/"
          style={{
            color: "#172554",
            textDecoration: "none",
            fontSize: "22px",
            fontWeight: "900",
            letterSpacing: "-0.9px",
          }}
        >
          shaus
        </a>

        <AccountButton />
      </header>

      {/* HERO */}

      <section
        style={{
          padding:
            "48px 16px 35px",
          maxWidth: "560px",
          margin: "0 auto",
        }}
      >
        <h1
          style={{
            margin: 0,
            color: "#172554",
            fontSize: "32px",
            lineHeight: "1.08",
            letterSpacing: "-1.3px",
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
              "12px 0 24px",
            color: "#64748B",
            fontSize: "13px",
            lineHeight: "1.55",
          }}
        >
          Găsește chiria potrivită
          pentru tine, într-un singur
          loc.
        </p>

        {/* CĂUTARE */}

        <div
          style={{
            background: "#FFFFFF",
            border:
              "1px solid #E2E8F0",
            borderRadius: "14px",
            padding: "14px",
            boxShadow:
              "0 8px 25px rgba(15,23,42,0.06)",
          }}
        >
          {/* ORAȘ */}

          <label
            style={{
              display: "block",
              marginBottom: "6px",
              color: "#475569",
              fontSize: "10px",
              fontWeight: "800",
            }}
          >
            Oraș
          </label>

          <select
            value={selectedCity}
            onChange={
              handleCityChange
            }
            style={{
              width: "100%",
              height: "48px",
              boxSizing:
                "border-box",
              border:
                "1px solid #CBD5E1",
              borderRadius: "9px",
              background: "#FFFFFF",
              color: selectedCity
                ? "#0F172A"
                : "#94A3B8",
              padding: "0 12px",
              fontFamily:
                "inherit",
              fontSize: "12px",
              fontWeight: "700",
              outline: "none",
            }}
          >
            <option value="">
              Alege orașul
            </option>

            {cities.map(
              (city) => (
                <option
                  key={city.id}
                  value={city.slug}
                >
                  {city.name}
                </option>
              )
            )}
          </select>

          {/* UNIVERSITATE */}

          <label
            style={{
              display: "block",
              marginTop: "13px",
              marginBottom: "6px",
              color: "#475569",
              fontSize: "10px",
              fontWeight: "800",
            }}
          >
            Universitate
          </label>

          <select
            value={
              selectedUniversity
            }
            onChange={(event) =>
              setSelectedUniversity(
                event.target.value
              )
            }
            disabled={
              !selectedCity
            }
            style={{
              width: "100%",
              height: "48px",
              boxSizing:
                "border-box",
              border:
                "1px solid #CBD5E1",
              borderRadius: "9px",
              background:
                !selectedCity
                  ? "#F8FAFC"
                  : "#FFFFFF",
              color:
                selectedUniversity
                  ? "#0F172A"
                  : "#94A3B8",
              padding: "0 12px",
              fontFamily:
                "inherit",
              fontSize: "12px",
              fontWeight: "700",
              outline: "none",
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
            onClick={
              handleSearch
            }
            disabled={
              !selectedCity
            }
            style={{
              width: "100%",
              height: "48px",
              marginTop: "15px",
              border: "none",
              borderRadius: "9px",
              background:
                selectedCity
                  ? "#172554"
                  : "#CBD5E1",
              color: "#FFFFFF",
              fontFamily:
                "inherit",
              fontSize: "12px",
              fontWeight: "900",
              cursor:
                selectedCity
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
