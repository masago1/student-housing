"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export default function SearchBox({
  universities = [],
  cities = [],
  neighborhoods = [],
}) {
  const router = useRouter();

  /* =========================
     ORAȘ
  ========================= */

  const [cityQuery, setCityQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState(null);
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);

  /* =========================
     CARTIER
  ========================= */

  const [neighborhoodQuery, setNeighborhoodQuery] = useState("");
  const [selectedNeighborhood, setSelectedNeighborhood] = useState(null);
  const [showNeighborhoodSuggestions, setShowNeighborhoodSuggestions] =
    useState(false);

  /* =========================
     UNIVERSITATE
  ========================= */

  const [universityQuery, setUniversityQuery] = useState("");
  const [selectedUniversity, setSelectedUniversity] = useState(null);
  const [showUniversitySuggestions, setShowUniversitySuggestions] =
    useState(false);

  /* =========================
     HELPERS
  ========================= */

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

  const sortedCities = useMemo(() => {
    return [...cities].sort((a, b) =>
      (a.name || "").localeCompare(b.name || "", "ro")
    );
  }, [cities]);

  const filteredCities = useMemo(() => {
    const query = normalizeText(cityQuery);

    if (!query || selectedCity?.name === cityQuery) {
      return sortedCities;
    }

    return sortedCities.filter((city) =>
      normalizeText(city.name).includes(query)
    );
  }, [cityQuery, selectedCity, sortedCities]);

  /* =========================
     CARTIERE PENTRU ORAȘ
  ========================= */

  const neighborhoodsForCity = useMemo(() => {
    if (!selectedCity) {
      return [];
    }

    return neighborhoods
      .filter(
        (neighborhood) =>
          String(neighborhood.city_id) === String(selectedCity.id)
      )
      .sort((a, b) =>
        (a.name || "").localeCompare(b.name || "", "ro")
      );
  }, [neighborhoods, selectedCity]);

  const filteredNeighborhoods = useMemo(() => {
    const query = normalizeText(neighborhoodQuery);

    if (!selectedCity) {
      return [];
    }

    if (!query || selectedNeighborhood?.name === neighborhoodQuery) {
      return neighborhoodsForCity;
    }

    return neighborhoodsForCity.filter((neighborhood) =>
      normalizeText(neighborhood.name).includes(query)
    );
  }, [
    neighborhoodQuery,
    selectedCity,
    selectedNeighborhood,
    neighborhoodsForCity,
  ]);

  /* =========================
     UNIVERSITĂȚI PENTRU ORAȘ
  ========================= */

  const universitiesForCity = useMemo(() => {
    if (!selectedCity) {
      return [];
    }

    return universities.filter(
      (university) => university.city === selectedCity.name
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
    setCityQuery(city.name);

    // Resetăm cartierul când schimbăm orașul
    setSelectedNeighborhood(null);
    setNeighborhoodQuery("");

    // Resetăm universitatea când schimbăm orașul
    setSelectedUniversity(null);
    setUniversityQuery("");

    setShowCitySuggestions(false);
    setShowNeighborhoodSuggestions(false);
    setShowUniversitySuggestions(false);
  };

  /* =========================
     SELECTARE CARTIER
  ========================= */

  const chooseNeighborhood = (neighborhood) => {
    setSelectedNeighborhood(neighborhood);
    setNeighborhoodQuery(neighborhood.name);

    setShowNeighborhoodSuggestions(false);
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
    if (!selectedCity) {
      return;
    }

    const citySlug =
      selectedCity.slug || slugify(selectedCity.name);

    const neighborhoodPart = selectedNeighborhood?.slug
      ? `?zona=${encodeURIComponent(selectedNeighborhood.slug)}`
      : "";

    /*
      FĂRĂ UNIVERSITATE:
      /chirii/timisoara
      sau
      /chirii/timisoara?zona=complex-studentesc
    */

    if (!selectedUniversity) {
      router.push(`/chirii/${citySlug}${neighborhoodPart}`);
      return;
    }

    /*
      CU UNIVERSITATE:
      /chirii/timisoara/umft
      sau
      /chirii/timisoara/umft?zona=complex-studentesc
    */

    const universitySlug = slugify(
      selectedUniversity.short_name || selectedUniversity.name
    );

    router.push(
      `/chirii/${citySlug}/${universitySlug}${neighborhoodPart}`
    );
  };

  /* =========================
     INPUT STYLE
  ========================= */

  const inputStyle = {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid #E2E8F0",
    borderRadius: "12px",
    padding: "17px",
    fontSize: "15px",
    fontFamily: "inherit",
    fontWeight: "500",
    color: "#0F172A",
    outline: "none",
  };

  const dropdownStyle = {
    position: "absolute",
    top: "calc(100% + 8px)",
    left: 0,
    right: 0,
    background: "#ffffff",
    border: "1px solid #E2E8F0",
    borderRadius: "12px",
    boxShadow: "0 12px 30px rgba(15, 23, 42, 0.12)",
    zIndex: 9999,
    overflow: "hidden",
  };

  const dropdownScrollStyle = {
    maxHeight: "300px",
    overflowY: "auto",
    overflowX: "hidden",
    overscrollBehavior: "contain",
    WebkitOverflowScrolling: "touch",
    scrollbarGutter: "stable",
    scrollBehavior: "smooth",
  };

  return (
    <div
      style={{
        maxWidth: "950px",
        margin: "0 auto",
        background: "#ffffff",
        borderRadius: "18px",
        padding: "12px",
        boxShadow: "0 15px 45px rgba(15, 23, 42, 0.10)",
        display: "grid",
        gridTemplateColumns: "1fr 1.6fr auto",
        gridTemplateRows: "auto auto",
        gap: "10px",
        position: "relative",
        textAlign: "left",
        border: "1px solid #E2E8F0",
      }}
    >
      {/* =========================
          ORAȘ
      ========================= */}

      <div
        style={{
          position: "relative",
          minWidth: 0,
          gridColumn: "1",
          gridRow: "1",
        }}
      >
        <input
          type="text"
          value={cityQuery}
          placeholder="Alege orașul"
          autoComplete="off"
          onFocus={() => {
            setShowCitySuggestions(true);
            setShowNeighborhoodSuggestions(false);
            setShowUniversitySuggestions(false);
          }}
          onClick={() => {
            setShowCitySuggestions(true);
            setShowNeighborhoodSuggestions(false);
            setShowUniversitySuggestions(false);
          }}
          onChange={(event) => {
            const value = event.target.value;

            setCityQuery(value);
            setSelectedCity(null);

            setSelectedNeighborhood(null);
            setNeighborhoodQuery("");

            setSelectedUniversity(null);
            setUniversityQuery("");

            setShowCitySuggestions(true);
            setShowNeighborhoodSuggestions(false);
            setShowUniversitySuggestions(false);
          }}
          style={{
            ...inputStyle,
            background: "#ffffff",
          }}
        />

        {/* DROPDOWN ORAȘE */}

        {showCitySuggestions && (
          <div style={dropdownStyle}>
            <div style={dropdownScrollStyle}>
              {filteredCities.length > 0 ? (
                filteredCities.map((city) => (
                  <button
                    key={city.id}
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
                      borderBottom: "1px solid #F1F5F9",
                      background:
                        selectedCity?.id === city.id
                          ? "#EFF6FF"
                          : "#ffffff",
                      padding: "13px 16px",
                      textAlign: "left",
                      fontFamily: "inherit",
                      fontSize: "14px",
                      fontWeight:
                        selectedCity?.id === city.id ? "800" : "600",
                      color:
                        selectedCity?.id === city.id
                          ? "#2563EB"
                          : "#0F172A",
                      cursor: "pointer",
                      boxSizing: "border-box",
                      transition: "background-color 120ms ease",
                    }}
                    onMouseEnter={(event) => {
                      event.currentTarget.style.background = "#F8FAFC";
                    }}
                    onMouseLeave={(event) => {
                      event.currentTarget.style.background =
                        selectedCity?.id === city.id
                          ? "#EFF6FF"
                          : "#ffffff";
                    }}
                  >
                    {city.name}
                  </button>
                ))
              ) : (
                <div
                  style={{
                    padding: "16px",
                    color: "#64748B",
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
          CARTIER
      ========================= */}

      <div
        style={{
          position: "relative",
          minWidth: 0,
          gridColumn: "1",
          gridRow: "2",
        }}
      >
        <input
          type="text"
          value={neighborhoodQuery}
          placeholder={
            selectedCity
              ? "Zonă / cartier (opțional)"
              : "Alege mai întâi orașul"
          }
          disabled={!selectedCity}
          autoComplete="off"
          onFocus={() => {
            if (selectedCity) {
              setShowNeighborhoodSuggestions(true);
              setShowCitySuggestions(false);
              setShowUniversitySuggestions(false);
            }
          }}
          onClick={() => {
            if (selectedCity) {
              setShowNeighborhoodSuggestions(true);
              setShowCitySuggestions(false);
              setShowUniversitySuggestions(false);
            }
          }}
          onChange={(event) => {
            setNeighborhoodQuery(event.target.value);
            setSelectedNeighborhood(null);

            setShowNeighborhoodSuggestions(true);
            setShowCitySuggestions(false);
            setShowUniversitySuggestions(false);
          }}
          style={{
            ...inputStyle,
            background: selectedCity ? "#ffffff" : "#F8FAFC",
            cursor: selectedCity ? "text" : "not-allowed",
            opacity: selectedCity ? 1 : 0.65,
          }}
        />

        {/* DROPDOWN CARTIERE */}

        {showNeighborhoodSuggestions && selectedCity && (
          <div style={dropdownStyle}>
            <div style={dropdownScrollStyle}>
              {/* TOATE ZONELE */}

              <button
                type="button"
                onMouseDown={(event) => {
                  event.preventDefault();
                }}
                onClick={() => {
                  setSelectedNeighborhood(null);
                  setNeighborhoodQuery("");
                  setShowNeighborhoodSuggestions(false);
                }}
                style={{
                  width: "100%",
                  display: "block",
                  border: "none",
                  borderBottom: "1px solid #E2E8F0",
                  background: "#EFF6FF",
                  padding: "14px 16px",
                  textAlign: "left",
                  fontFamily: "inherit",
                  cursor: "pointer",
                  boxSizing: "border-box",
                }}
              >
                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: "800",
                    color: "#2563EB",
                  }}
                >
                  Toate zonele din {selectedCity.name}
                </div>

                <div
                  style={{
                    fontSize: "12px",
                    color: "#64748B",
                    marginTop: "4px",
                    lineHeight: "1.4",
                  }}
                >
                  Fără filtrare după cartier
                </div>
              </button>

              {filteredNeighborhoods.length > 0 ? (
                filteredNeighborhoods.map((neighborhood) => (
                  <button
                    key={neighborhood.id}
                    type="button"
                    onMouseDown={(event) => {
                      event.preventDefault();
                    }}
                    onClick={() => chooseNeighborhood(neighborhood)}
                    style={{
                      width: "100%",
                      minHeight: "46px",
                      display: "block",
                      border: "none",
                      borderBottom: "1px solid #F1F5F9",
                      background:
                        selectedNeighborhood?.id === neighborhood.id
                          ? "#EFF6FF"
                          : "#ffffff",
                      padding: "13px 16px",
                      textAlign: "left",
                      fontFamily: "inherit",
                      fontSize: "14px",
                      fontWeight:
                        selectedNeighborhood?.id === neighborhood.id
                          ? "800"
                          : "600",
                      color:
                        selectedNeighborhood?.id === neighborhood.id
                          ? "#2563EB"
                          : "#0F172A",
                      cursor: "pointer",
                      boxSizing: "border-box",
                      transition: "background-color 120ms ease",
                    }}
                    onMouseEnter={(event) => {
                      event.currentTarget.style.background = "#F8FAFC";
                    }}
                    onMouseLeave={(event) => {
                      event.currentTarget.style.background =
                        selectedNeighborhood?.id === neighborhood.id
                          ? "#EFF6FF"
                          : "#ffffff";
                    }}
                  >
                    {neighborhood.name}
                  </button>
                ))
              ) : (
                <div
                  style={{
                    padding: "16px",
                    color: "#64748B",
                    fontSize: "14px",
                  }}
                >
                  Nicio zonă găsită
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
          gridColumn: "2",
          gridRow: "1 / span 2",
          display: "flex",
          alignItems: "stretch",
        }}
      >
        <input
          type="text"
          value={universityQuery}
          placeholder={
            selectedCity
              ? "Universitate (opțional)"
              : "Alege mai întâi orașul"
          }
          disabled={!selectedCity}
          autoComplete="off"
          onFocus={() => {
            if (selectedCity) {
              setShowUniversitySuggestions(true);
              setShowCitySuggestions(false);
              setShowNeighborhoodSuggestions(false);
            }
          }}
          onClick={() => {
            if (selectedCity) {
              setShowUniversitySuggestions(true);
              setShowCitySuggestions(false);
              setShowNeighborhoodSuggestions(false);
            }
          }}
          onChange={(event) => {
            setUniversityQuery(event.target.value);
            setSelectedUniversity(null);

            setShowUniversitySuggestions(true);
            setShowCitySuggestions(false);
            setShowNeighborhoodSuggestions(false);
          }}
          style={{
            ...inputStyle,
            height: "100%",
            background: selectedCity ? "#ffffff" : "#F8FAFC",
            cursor: selectedCity ? "text" : "not-allowed",
            opacity: selectedCity ? 1 : 0.65,
          }}
        />

        {/* DROPDOWN UNIVERSITĂȚI */}

        {showUniversitySuggestions && selectedCity && (
          <div style={dropdownStyle}>
            <div style={dropdownScrollStyle}>
              {/* TOATE CHIRIILE */}

              <button
                type="button"
                onMouseDown={(event) => {
                  event.preventDefault();
                }}
                onClick={() => {
                  setSelectedUniversity(null);
                  setUniversityQuery("");
                  setShowUniversitySuggestions(false);
                }}
                style={{
                  width: "100%",
                  display: "block",
                  border: "none",
                  borderBottom: "1px solid #E2E8F0",
                  background: "#EFF6FF",
                  padding: "14px 16px",
                  textAlign: "left",
                  fontFamily: "inherit",
                  cursor: "pointer",
                  boxSizing: "border-box",
                }}
              >
                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: "800",
                    color: "#2563EB",
                  }}
                >
                  Toate chiriile din {selectedCity.name}
                </div>

                <div
                  style={{
                    fontSize: "12px",
                    color: "#64748B",
                    marginTop: "4px",
                    lineHeight: "1.4",
                  }}
                >
                  Fără filtrare după universitate
                </div>
              </button>

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
                      borderBottom: "1px solid #F1F5F9",
                      background:
                        selectedUniversity?.id === university.id
                          ? "#EFF6FF"
                          : "#ffffff",
                      padding: "13px 16px",
                      textAlign: "left",
                      fontFamily: "inherit",
                      cursor: "pointer",
                      boxSizing: "border-box",
                      transition: "background-color 120ms ease",
                    }}
                    onMouseEnter={(event) => {
                      event.currentTarget.style.background = "#F8FAFC";
                    }}
                    onMouseLeave={(event) => {
                      event.currentTarget.style.background =
                        selectedUniversity?.id === university.id
                          ? "#EFF6FF"
                          : "#ffffff";
                    }}
                  >
                    <div
                      style={{
                        fontSize: "14px",
                        fontWeight: "700",
                        color: "#0F172A",
                      }}
                    >
                      {university.short_name || university.name}
                    </div>

                    {university.short_name && (
                      <div
                        style={{
                          fontSize: "12px",
                          color: "#64748B",
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
                    color: "#64748B",
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
        disabled={!selectedCity}
        style={{
          gridColumn: "3",
          gridRow: "1 / span 2",
          border: "none",
          borderRadius: "12px",
          padding: "0 27px",
          minHeight: "54px",
          background: selectedCity ? "#172554" : "#94A3B8",
          color: "#ffffff",
          fontSize: "16px",
          fontFamily: "inherit",
          fontWeight: "700",
          cursor: selectedCity ? "pointer" : "not-allowed",
          whiteSpace: "nowrap",
          transition:
            "background-color 150ms ease, opacity 150ms ease",
          boxShadow: selectedCity
            ? "0 6px 16px rgba(23, 37, 84, 0.16)"
            : "none",
        }}
      >
        Vezi chirii
      </button>
    </div>
  );
}
