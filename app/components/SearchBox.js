"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export default function SearchBox({ universities = [] }) {
  const router = useRouter();

  const [cityQuery, setCityQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);

  const [universityQuery, setUniversityQuery] = useState("");
  const [selectedUniversity, setSelectedUniversity] = useState(null);
  const [showUniversitySuggestions, setShowUniversitySuggestions] =
    useState(false);

  const normalizeText = (text = "") =>
    text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();

  const slugify = (text = "") =>
    text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  /* =========================
     ORAȘE
  ========================= */

  const cities = useMemo(() => {
    return [
      ...new Set(
        universities
          .map((university) => university.city)
          .filter(Boolean)
      ),
    ].sort((a, b) => a.localeCompare(b, "ro"));
  }, [universities]);

  const filteredCities = useMemo(() => {
    const query = normalizeText(cityQuery);

    if (!query || selectedCity === cityQuery) {
      return cities;
    }

    return cities.filter((city) =>
      normalizeText(city).includes(query)
    );
  }, [cityQuery, selectedCity, cities]);

  /* =========================
     UNIVERSITĂȚI
  ========================= */

  const universitiesForCity = useMemo(() => {
    if (!selectedCity) {
      return [];
    }

    return universities.filter(
      (university) => university.city === selectedCity
    );
  }, [universities, selectedCity]);

  const filteredUniversities = useMemo(() => {
    const query = normalizeText(universityQuery);

    if (!selectedCity) {
      return [];
    }

    if (!query || selectedUniversity) {
      return universitiesForCity;
    }

    return universitiesForCity.filter((university) => {
      const searchableText = normalizeText(
        `${university.short_name || ""} ${university.name || ""}`
      );

      return searchableText.includes(query);
    });
  }, [
    universityQuery,
    selectedCity,
    selectedUniversity,
    universitiesForCity,
  ]);

  /* =========================
     SELECTARE ORAȘ
  ========================= */

  const chooseCity = (city) => {
    setSelectedCity(city);
    setCityQuery(city);

    setSelectedUniversity(null);
    setUniversityQuery("");

    setShowCitySuggestions(false);
    setShowUniversitySuggestions(false);
  };

  /* =========================
     SELECTARE UNIVERSITATE
  ========================= */

  const chooseUniversity = (university) => {
    setSelectedUniversity(university);

    setUniversityQuery(
      university.short_name
        ? `${university.short_name} — ${university.name}`
        : university.name
    );

    setShowUniversitySuggestions(false);
  };

  /* =========================
     CĂUTARE
  ========================= */

  const handleSearch = () => {
    if (!selectedCity || !selectedUniversity) {
      return;
    }

    const citySlug = slugify(selectedCity);

    const universitySlug = slugify(
      selectedUniversity.short_name || selectedUniversity.name
    );

    router.push(`/chirii/${citySlug}/${universitySlug}`);
  };

  return (
    <div
      style={{
        maxWidth: "900px",
        margin: "0 auto",
        background: "#ffffff",
        borderRadius: "18px",
        padding: "12px",
        boxShadow: "0 15px 45px rgba(0,0,0,0.10)",
        display: "grid",
        gridTemplateColumns: "1fr 1.6fr auto",
        gap: "10px",
        position: "relative",
        textAlign: "left",
      }}
    >
      {/* =========================
          ORAȘ
      ========================= */}

      <div
        style={{
          position: "relative",
          minWidth: 0,
        }}
      >
        <input
          type="text"
          value={cityQuery}
          placeholder="Alege orașul"
          autoComplete="off"
          onFocus={() => {
            setShowCitySuggestions(true);
            setShowUniversitySuggestions(false);
          }}
          onClick={() => {
            setShowCitySuggestions(true);
            setShowUniversitySuggestions(false);
          }}
          onChange={(event) => {
            const value = event.target.value;

            setCityQuery(value);
            setSelectedCity("");
            setSelectedUniversity(null);
            setUniversityQuery("");

            setShowCitySuggestions(true);
            setShowUniversitySuggestions(false);
          }}
          style={{
            width: "100%",
            boxSizing: "border-box",
            border: "1px solid #e5e7eb",
            borderRadius: "12px",
            padding: "17px",
            fontSize: "15px",
            fontFamily: "inherit",
            fontWeight: "500",
            color: "#111827",
            outline: "none",
            background: "#ffffff",
          }}
        />

        {/* DROPDOWN ORAȘE */}

        {showCitySuggestions && (
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 8px)",
              left: 0,
              right: 0,
              background: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: "12px",
              boxShadow: "0 12px 30px rgba(0,0,0,0.12)",
              zIndex: 9999,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                maxHeight: "300px",
                overflowY: "auto",
                overflowX: "hidden",
                overscrollBehavior: "contain",
                WebkitOverflowScrolling: "touch",
                scrollbarGutter: "stable",
                scrollBehavior: "smooth",
              }}
            >
              {filteredCities.length > 0 ? (
                filteredCities.map((city) => (
                  <button
                    key={city}
                    type="button"
                    onMouseDown={(event) => {
                      event.preventDefault();
                    }}
                    onClick={() => chooseCity(city)}
                    style={{
                      width: "100%",
                      minHeight: "46px",
                      display: "block",
                      border: "none",
                      borderBottom: "1px solid #f3f4f6",
                      background:
                        selectedCity === city
                          ? "#eff6ff"
                          : "#ffffff",
                      padding: "13px 16px",
                      textAlign: "left",
                      fontFamily: "inherit",
                      fontSize: "14px",
                      fontWeight:
                        selectedCity === city ? "800" : "600",
                      color: "#111827",
                      cursor: "pointer",
                      boxSizing: "border-box",
                      transition:
                        "background-color 120ms ease",
                    }}
                    onMouseEnter={(event) => {
                      event.currentTarget.style.background = "#f3f4f6";
                    }}
                    onMouseLeave={(event) => {
                      event.currentTarget.style.background =
                        selectedCity === city ? "#eff6ff" : "#ffffff";
                    }}
                  >
                    {city}
                  </button>
                ))
              ) : (
                <div
                  style={{
                    padding: "16px",
                    color: "#6b7280",
                    fontSize: "14px",
                  }}
                >
                  Niciun oraș găsit
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* =========================
          UNIVERSITATE
      ========================= */}

      <div
        style={{
          position: "relative",
          minWidth: 0,
        }}
      >
        <input
          type="text"
          value={universityQuery}
          placeholder={
            selectedCity
              ? "Alege universitatea"
              : "Alege mai întâi orașul"
          }
          disabled={!selectedCity}
          autoComplete="off"
          onFocus={() => {
            if (selectedCity) {
              setShowUniversitySuggestions(true);
              setShowCitySuggestions(false);
            }
          }}
          onClick={() => {
            if (selectedCity) {
              setShowUniversitySuggestions(true);
              setShowCitySuggestions(false);
            }
          }}
          onChange={(event) => {
            setUniversityQuery(event.target.value);
            setSelectedUniversity(null);

            setShowUniversitySuggestions(true);
            setShowCitySuggestions(false);
          }}
          style={{
            width: "100%",
            boxSizing: "border-box",
            border: "1px solid #e5e7eb",
            borderRadius: "12px",
            padding: "17px",
            fontSize: "15px",
            fontFamily: "inherit",
            fontWeight: "500",
            color: "#111827",
            outline: "none",
            background: selectedCity ? "#ffffff" : "#f9fafb",
            cursor: selectedCity ? "text" : "not-allowed",
            opacity: selectedCity ? 1 : 0.65,
          }}
        />

        {/* DROPDOWN UNIVERSITĂȚI */}

        {showUniversitySuggestions && selectedCity && (
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 8px)",
              left: 0,
              right: 0,
              background: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: "12px",
              boxShadow: "0 12px 30px rgba(0,0,0,0.12)",
              zIndex: 9999,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                maxHeight: "300px",
                overflowY: "auto",
                overflowX: "hidden",
                overscrollBehavior: "contain",
                WebkitOverflowScrolling: "touch",
                scrollbarGutter: "stable",
                scrollBehavior: "smooth",
              }}
            >
              {filteredUniversities.length > 0 ? (
                filteredUniversities.map((university) => (
                  <button
                    key={university.id}
                    type="button"
                    onMouseDown={(event) => {
                      event.preventDefault();
                    }}
                    onClick={() => chooseUniversity(university)}
                    style={{
                      width: "100%",
                      display: "block",
                      border: "none",
                      borderBottom: "1px solid #f3f4f6",
                      background:
                        selectedUniversity?.id === university.id
                          ? "#eff6ff"
                          : "#ffffff",
                      padding: "13px 16px",
                      textAlign: "left",
                      fontFamily: "inherit",
                      cursor: "pointer",
                      boxSizing: "border-box",
                      transition:
                        "background-color 120ms ease",
                    }}
                    onMouseEnter={(event) => {
                      event.currentTarget.style.background = "#f3f4f6";
                    }}
                    onMouseLeave={(event) => {
                      event.currentTarget.style.background =
                        selectedUniversity?.id === university.id
                          ? "#eff6ff"
                          : "#ffffff";
                    }}
                  >
                    <div
                      style={{
                        fontSize: "14px",
                        fontWeight: "700",
                        color: "#111827",
                      }}
                    >
                      {university.short_name || university.name}
                    </div>

                    {university.short_name && (
                      <div
                        style={{
                          fontSize: "12px",
                          color: "#6b7280",
                          marginTop: "4px",
                          lineHeight: "1.4",
                        }}
                      >
                        {university.name}
                      </div>
                    )}
                  </button>
                ))
              ) : (
                <div
                  style={{
                    padding: "16px",
                    color: "#6b7280",
                    fontSize: "14px",
                  }}
                >
                  Nicio universitate găsită
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* =========================
          BUTON CĂUTARE
      ========================= */}

      <button
        type="button"
        onClick={handleSearch}
        disabled={!selectedCity || !selectedUniversity}
        style={{
          border: "none",
          borderRadius: "12px",
          padding: "0 27px",
          minHeight: "54px",
          background:
            selectedCity && selectedUniversity
              ? "#2563eb"
              : "#93b4f5",
          color: "#ffffff",
          fontSize: "16px",
          fontFamily: "inherit",
          fontWeight: "700",
          cursor:
            selectedCity && selectedUniversity
              ? "pointer"
              : "not-allowed",
          whiteSpace: "nowrap",
          transition:
            "background-color 150ms ease, opacity 150ms ease",
        }}
      >
        Vezi chirii
      </button>
    </div>
  );
}
