"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

export default function SearchBox() {
  const router = useRouter();

  const [universities, setUniversities] = useState([]);
  const [loadingUniversities, setLoadingUniversities] =
    useState(true);

  const [cityQuery, setCityQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [showCitySuggestions, setShowCitySuggestions] =
    useState(false);

  const [universityQuery, setUniversityQuery] = useState("");
  const [selectedUniversity, setSelectedUniversity] =
    useState(null);
  const [
    showUniversitySuggestions,
    setShowUniversitySuggestions,
  ] = useState(false);

  /*
    ÎNCĂRCĂM TOATE UNIVERSITĂȚILE DIN SUPABASE

    Din acest moment, orice universitate nouă introdusă
    în tabela "universities" va apărea automat aici.
  */

  useEffect(() => {
    const loadUniversities = async () => {
      setLoadingUniversities(true);

      const { data, error } = await supabase
        .from("universities")
        .select("id, name, short_name, city")
        .order("city", { ascending: true })
        .order("name", { ascending: true });

      if (error) {
        console.error(
          "Eroare la încărcarea universităților:",
          error
        );

        setUniversities([]);
        setLoadingUniversities(false);
        return;
      }

      setUniversities(data || []);
      setLoadingUniversities(false);
    };

    loadUniversities();
  }, []);

  /*
    NORMALIZARE TEXT

    Permite căutări precum:
    Timisoara -> Timișoara
    Iasi -> Iași
  */

  const normalizeText = (text = "") =>
    text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();

  /*
    CREARE SLUG PENTRU URL
  */

  const slugify = (text = "") =>
    text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  /*
    GENERĂM AUTOMAT ORAȘELE DIN UNIVERSITĂȚILE
    EXISTENTE ÎN SUPABASE
  */

  const cities = useMemo(() => {
    return [
      ...new Set(
        universities
          .map((university) => university.city)
          .filter(Boolean)
      ),
    ].sort((a, b) => a.localeCompare(b, "ro"));
  }, [universities]);

  /*
    FILTRARE ORAȘE
  */

  const filteredCities = useMemo(() => {
    const query = normalizeText(cityQuery);

    if (!query) {
      return cities.slice(0, 8);
    }

    return cities
      .filter((city) =>
        normalizeText(city).includes(query)
      )
      .slice(0, 8);
  }, [cityQuery, cities]);

  /*
    UNIVERSITĂȚILE DIN ORAȘUL SELECTAT
  */

  const universitiesForCity = useMemo(() => {
    if (!selectedCity) {
      return [];
    }

    return universities.filter(
      (university) =>
        university.city === selectedCity
    );
  }, [universities, selectedCity]);

  /*
    FILTRARE UNIVERSITĂȚI
  */

  const filteredUniversities = useMemo(() => {
    const query = normalizeText(universityQuery);

    if (!selectedCity) {
      return [];
    }

    if (!query) {
      return universitiesForCity.slice(0, 8);
    }

    return universitiesForCity
      .filter((university) => {
        const fullText = normalizeText(
          `${university.short_name || ""} ${
            university.name || ""
          }`
        );

        return fullText.includes(query);
      })
      .slice(0, 8);
  }, [
    universityQuery,
    selectedCity,
    universitiesForCity,
  ]);

  /*
    SELECTARE ORAȘ
  */

  const chooseCity = (city) => {
    setSelectedCity(city);
    setCityQuery(city);

    setSelectedUniversity(null);
    setUniversityQuery("");

    setShowCitySuggestions(false);
    setShowUniversitySuggestions(false);
  };

  /*
    SELECTARE UNIVERSITATE
  */

  const chooseUniversity = (university) => {
    setSelectedUniversity(university);

    setUniversityQuery(
      university.short_name
        ? `${university.short_name} — ${university.name}`
        : university.name
    );

    setShowUniversitySuggestions(false);
  };

  /*
    CĂUTARE
  */

  const handleSearch = () => {
    if (!selectedCity || !selectedUniversity) {
      return;
    }

    const citySlug = slugify(selectedCity);

    const universitySlug = slugify(
      selectedUniversity.short_name ||
        selectedUniversity.name
    );

    router.push(
      `/chirii/${citySlug}/${universitySlug}`
    );
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
      {/* ORAȘ */}

      <div style={{ position: "relative" }}>
        <input
          type="text"
          value={cityQuery}
          placeholder={
            loadingUniversities
              ? "Se încarcă orașele..."
              : "Alege orașul"
          }
          disabled={loadingUniversities}
          autoComplete="off"
          onFocus={() => {
            if (!loadingUniversities) {
              setShowCitySuggestions(true);
            }
          }}
          onChange={(event) => {
            setCityQuery(event.target.value);

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
            background: loadingUniversities
              ? "#f9fafb"
              : "#ffffff",
            cursor: loadingUniversities
              ? "wait"
              : "text",
            opacity: loadingUniversities ? 0.7 : 1,
          }}
        />

        {showCitySuggestions &&
          !loadingUniversities && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 8px)",
                left: 0,
                right: 0,
                background: "#ffffff",
                border: "1px solid #e5e7eb",
                borderRadius: "12px",
                boxShadow:
                  "0 12px 30px rgba(0,0,0,0.12)",
                overflow: "hidden",
                zIndex: 50,
              }}
            >
              {filteredCities.length > 0 ? (
                filteredCities.map((city) => (
                  <button
                    key={city}
                    type="button"
                    onMouseDown={(event) =>
                      event.preventDefault()
                    }
                    onClick={() => chooseCity(city)}
                    style={{
                      width: "100%",
                      border: "none",
                      background: "#ffffff",
                      padding: "14px 16px",
                      textAlign: "left",
                      fontFamily: "inherit",
                      fontSize: "14px",
                      fontWeight: "600",
                      color: "#111827",
                      cursor: "pointer",
                      borderBottom:
                        "1px solid #f3f4f6",
                    }}
                  >
                    {city}
                  </button>
                ))
              ) : (
                <div
                  style={{
                    padding: "14px 16px",
                    color: "#6b7280",
                    fontSize: "14px",
                  }}
                >
                  Niciun oraș găsit
                </div>
              )}
            </div>
          )}
      </div>

      {/* UNIVERSITATE */}

      <div style={{ position: "relative" }}>
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
            }
          }}
          onChange={(event) => {
            setUniversityQuery(event.target.value);
            setSelectedUniversity(null);
            setShowUniversitySuggestions(true);
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
            background: selectedCity
              ? "#ffffff"
              : "#f9fafb",
            cursor: selectedCity
              ? "text"
              : "not-allowed",
            opacity: selectedCity ? 1 : 0.65,
          }}
        />

        {showUniversitySuggestions &&
          selectedCity && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 8px)",
                left: 0,
                right: 0,
                background: "#ffffff",
                border: "1px solid #e5e7eb",
                borderRadius: "12px",
                boxShadow:
                  "0 12px 30px rgba(0,0,0,0.12)",
                overflow: "hidden",
                zIndex: 50,
              }}
            >
              {filteredUniversities.length > 0 ? (
                filteredUniversities.map(
                  (university) => (
                    <button
                      key={university.id}
                      type="button"
                      onMouseDown={(event) =>
                        event.preventDefault()
                      }
                      onClick={() =>
                        chooseUniversity(university)
                      }
                      style={{
                        width: "100%",
                        border: "none",
                        background: "#ffffff",
                        padding: "14px 16px",
                        textAlign: "left",
                        fontFamily: "inherit",
                        cursor: "pointer",
                        borderBottom:
                          "1px solid #f3f4f6",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "14px",
                          fontWeight: "700",
                          color: "#111827",
                        }}
                      >
                        {university.short_name ||
                          university.name}
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
                  )
                )
              ) : (
                <div
                  style={{
                    padding: "14px 16px",
                    color: "#6b7280",
                    fontSize: "14px",
                  }}
                >
                  Nicio universitate găsită
                </div>
              )}
            </div>
          )}
      </div>

      {/* BUTON */}

      <button
        type="button"
        onClick={handleSearch}
        disabled={
          !selectedCity || !selectedUniversity
        }
        style={{
          border: "none",
          borderRadius: "12px",
          padding: "0 27px",
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
        }}
      >
        Vezi chirii
      </button>
    </div>
  );
}
