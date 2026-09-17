"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/* =========================
   CALENDAR ROMÂNESC
========================= */

const MONTH_NAMES = [
  "Ianuarie",
  "Februarie",
  "Martie",
  "Aprilie",
  "Mai",
  "Iunie",
  "Iulie",
  "August",
  "Septembrie",
  "Octombrie",
  "Noiembrie",
  "Decembrie",
];

const WEEK_DAYS = ["Lu", "Ma", "Mi", "Jo", "Vi", "Sâ", "Du"];

function getTodayAtMidnight() {
  const now = new Date();

  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );
}

function getCalendarStartDate(year, month) {
  const firstDay = new Date(year, month, 1);
  const mondayIndex = (firstDay.getDay() + 6) % 7;

  return new Date(
    year,
    month,
    1 - mondayIndex
  );
}

function isSameCalendarDay(a, b) {
  if (!a || !b) return false;

  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function dateToRomanian(date) {
  if (!date) return "";

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
}

function romanianToLocalDate(value) {
  if (!value) return null;

  if (
    !/^(0[1-9]|[12]\d|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/.test(value)
  ) {
    return null;
  }

  const [day, month, year] = value.split("/").map(Number);

  const date = new Date(
    year,
    month - 1,
    day
  );

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

function romanianDateToISO(value) {
  const date = romanianToLocalDate(value);

  if (!date) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/* =========================
   COMPONENTĂ CALENDAR
========================= */

function DateCalendar({
  value,
  onChange,
  onClose,
}) {
  const today = getTodayAtMidnight();
  const selectedDate = romanianToLocalDate(value);
  const initialDate = selectedDate || today;

  const [viewYear, setViewYear] = useState(
    initialDate.getFullYear()
  );

  const [viewMonth, setViewMonth] = useState(
    initialDate.getMonth()
  );

  const currentMonthStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    1
  );

  const viewedMonthStart = new Date(
    viewYear,
    viewMonth,
    1
  );

  const previousMonthDisabled =
    viewedMonthStart.getTime() <= currentMonthStart.getTime();

  function goPreviousMonth() {
    if (previousMonthDisabled) return;

    const previous = new Date(
      viewYear,
      viewMonth - 1,
      1
    );

    setViewYear(previous.getFullYear());
    setViewMonth(previous.getMonth());
  }

  function goNextMonth() {
    const next = new Date(
      viewYear,
      viewMonth + 1,
      1
    );

    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  }

  const calendarStart = getCalendarStartDate(
    viewYear,
    viewMonth
  );

  const calendarDays = [];

  for (let index = 0; index < 42; index++) {
    const date = new Date(
      calendarStart.getFullYear(),
      calendarStart.getMonth(),
      calendarStart.getDate() + index
    );

    calendarDays.push(date);
  }

  function selectDate(date) {
    const normalized = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );

    if (normalized.getTime() < today.getTime()) {
      return;
    }

    onChange(dateToRomanian(normalized));
    onClose();
  }

  function selectToday() {
    onChange(dateToRomanian(today));
    onClose();
  }

  function clearDate() {
    onChange("");
    onClose();
  }

  return (
    <div
      onClick={(event) => event.stopPropagation()}
      style={{
        position: "absolute",
        top: "calc(100% + 7px)",
        left: 0,
        zIndex: 10000,
        width: "292px",
        boxSizing: "border-box",
        background: "#FFFFFF",
        border: "1px solid #E2E8F0",
        borderRadius: "12px",
        padding: "13px",
        boxShadow: "0 14px 35px rgba(15, 23, 42, 0.14)",
      }}
    >
      {/* HEADER CALENDAR */}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "12px",
        }}
      >
        <button
          type="button"
          onClick={goPreviousMonth}
          disabled={previousMonthDisabled}
          aria-label="Luna precedentă"
          style={{
            width: "32px",
            height: "32px",
            border: "1px solid #E2E8F0",
            borderRadius: "8px",
            background: previousMonthDisabled
              ? "#F8FAFC"
              : "#FFFFFF",
            color: previousMonthDisabled
              ? "#CBD5E1"
              : "#172554",
            cursor: previousMonthDisabled
              ? "not-allowed"
              : "pointer",
            fontSize: "18px",
            lineHeight: "1",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          ‹
        </button>

        <div
          style={{
            color: "#172554",
            fontSize: "13px",
            fontWeight: "800",
          }}
        >
          {MONTH_NAMES[viewMonth]} {viewYear}
        </div>

        <button
          type="button"
          onClick={goNextMonth}
          aria-label="Luna următoare"
          style={{
            width: "32px",
            height: "32px",
            border: "1px solid #E2E8F0",
            borderRadius: "8px",
            background: "#FFFFFF",
            color: "#172554",
            cursor: "pointer",
            fontSize: "18px",
            lineHeight: "1",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          ›
        </button>
      </div>

      {/* ZILE SĂPTĂMÂNĂ */}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: "3px",
          marginBottom: "5px",
        }}
      >
        {WEEK_DAYS.map((day) => (
          <div
            key={day}
            style={{
              textAlign: "center",
              color: "#94A3B8",
              fontSize: "9px",
              fontWeight: "800",
              padding: "4px 0",
            }}
          >
            {day}
          </div>
        ))}
      </div>

      {/* ZILE CALENDAR */}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: "3px",
        }}
      >
        {calendarDays.map((date, index) => {
          const normalizedDate = new Date(
            date.getFullYear(),
            date.getMonth(),
            date.getDate()
          );

          const isPast =
            normalizedDate.getTime() < today.getTime();

          const isCurrentMonth =
            date.getMonth() === viewMonth &&
            date.getFullYear() === viewYear;

          const isSelected = isSameCalendarDay(
            date,
            selectedDate
          );

          const isToday = isSameCalendarDay(
            date,
            today
          );

          return (
            <button
              key={index}
              type="button"
              disabled={isPast}
              onClick={() => selectDate(date)}
              style={{
                width: "100%",
                aspectRatio: "1 / 1",
                border: isSelected
                  ? "1px solid #2563EB"
                  : isToday
                  ? "1px solid #93C5FD"
                  : "1px solid transparent",
                borderRadius: "7px",
                background: isSelected
                  ? "#2563EB"
                  : "#FFFFFF",
                color: isSelected
                  ? "#FFFFFF"
                  : isPast
                  ? "#CBD5E1"
                  : !isCurrentMonth
                  ? "#94A3B8"
                  : "#334155",
                fontFamily: "inherit",
                fontSize: "10px",
                fontWeight:
                  isSelected || isToday ? "800" : "600",
                cursor: isPast
                  ? "not-allowed"
                  : "pointer",
                opacity:
                  !isCurrentMonth && !isSelected ? 0.65 : 1,
              }}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>

      {/* ACȚIUNI CALENDAR */}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "8px",
          marginTop: "11px",
          paddingTop: "10px",
          borderTop: "1px solid #F1F5F9",
        }}
      >
        <button
          type="button"
          onClick={clearDate}
          style={{
            border: "none",
            background: "transparent",
            color: "#64748B",
            padding: "5px 2px",
            fontFamily: "inherit",
            fontSize: "10px",
            fontWeight: "800",
            cursor: "pointer",
          }}
        >
          Șterge data
        </button>

        <button
          type="button"
          onClick={selectToday}
          style={{
            border: "1px solid #BFDBFE",
            background: "#EFF6FF",
            color: "#2563EB",
            borderRadius: "7px",
            padding: "6px 9px",
            fontFamily: "inherit",
            fontSize: "10px",
            fontWeight: "800",
            cursor: "pointer",
          }}
        >
          Astăzi
        </button>
      </div>
    </div>
  );
}

/* =========================
   SEARCH BOX
========================= */

export default function SearchBox({
  universities = [],
  cities = [],
  neighborhoods = [],
}) {
  const router = useRouter();

  /* =========================
     ORAȘ / CARTIER / UNIVERSITATE
  ========================= */

  const [cityQuery, setCityQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState(null);
  const [showCitySuggestions, setShowCitySuggestions] =
    useState(false);

  const [neighborhoodQuery, setNeighborhoodQuery] =
    useState("");
  const [selectedNeighborhood, setSelectedNeighborhood] =
    useState(null);
  const [
    showNeighborhoodSuggestions,
    setShowNeighborhoodSuggestions,
  ] = useState(false);

  const [universityQuery, setUniversityQuery] = useState("");
  const [selectedUniversity, setSelectedUniversity] =
    useState(null);
  const [
    showUniversitySuggestions,
    setShowUniversitySuggestions,
  ] = useState(false);

  /* =========================
     FILTRE SUPLIMENTARE
  ========================= */

  const [showMoreFilters, setShowMoreFilters] = useState(false);

  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  const [rooms, setRooms] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [bathrooms, setBathrooms] = useState("");

  const [minSurface, setMinSurface] = useState("");
  const [maxSurface, setMaxSurface] = useState("");

  const [propertyType, setPropertyType] = useState("");
  const [furnished, setFurnished] = useState("");
  const [listingType, setListingType] = useState("");

  const [availableFrom, setAvailableFrom] = useState("");
  const [sort, setSort] = useState("newest");

  const [calendarOpen, setCalendarOpen] = useState(false);

  const calendarWrapperRef = useRef(null);

  /* CLICK OUTSIDE — DOAR ORAȘ + UNIVERSITATE */

  const cityWrapperRef = useRef(null);
  const universityWrapperRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        cityWrapperRef.current &&
        !cityWrapperRef.current.contains(event.target)
      ) {
        setShowCitySuggestions(false);
      }

      if (
        universityWrapperRef.current &&
        !universityWrapperRef.current.contains(event.target)
      ) {
        setShowUniversitySuggestions(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, []);

  /* =========================
     NORMALIZARE
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
      (a.name || "").localeCompare(
        b.name || "",
        "ro"
      )
    );
  }, [cities]);

  const filteredCities = useMemo(() => {
    const query = normalizeText(cityQuery);

    if (
      !query ||
      selectedCity?.name === cityQuery
    ) {
      return sortedCities;
    }

    return sortedCities.filter((city) =>
      normalizeText(city.name).includes(query)
    );
  }, [
    cityQuery,
    selectedCity,
    sortedCities,
  ]);

  /* =========================
     CARTIERE
  ========================= */

  const neighborhoodsForCity = useMemo(() => {
    if (!selectedCity) return [];

    return neighborhoods
      .filter(
        (neighborhood) =>
          String(neighborhood.city_id) ===
          String(selectedCity.id)
      )
      .sort((a, b) =>
        (a.name || "").localeCompare(
          b.name || "",
          "ro"
        )
      );
  }, [
    neighborhoods,
    selectedCity,
  ]);

  const filteredNeighborhoods = useMemo(() => {
    const query = normalizeText(neighborhoodQuery);

    if (!selectedCity) return [];

    if (
      !query ||
      selectedNeighborhood?.name === neighborhoodQuery
    ) {
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
     UNIVERSITĂȚI
  ========================= */

  const universitiesForCity = useMemo(() => {
    if (!selectedCity) return [];

    return universities.filter(
      (university) =>
        university.city === selectedCity.name
    );
  }, [
    universities,
    selectedCity,
  ]);

  const filteredUniversities = useMemo(() => {
    const query = normalizeText(universityQuery);

    if (!selectedCity) return [];

    if (!query || selectedUniversity) {
      return universitiesForCity;
    }

    return universitiesForCity.filter((university) => {
      const searchableText = normalizeText(
        `${university.short_name || ""} ${
          university.name || ""
        }`
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

    setSelectedNeighborhood(null);
    setNeighborhoodQuery("");

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
     INPUT NUMERIC
  ========================= */

  function handleIntegerChange(value, setter) {
    let cleaned = String(value).replace(/\D/g, "");
    cleaned = cleaned.replace(/^0+/, "");

    setter(cleaned);
  }

  /* =========================
     RESET FILTRE
  ========================= */

  function resetMoreFilters() {
    setSelectedNeighborhood(null);
    setNeighborhoodQuery("");

    setMinPrice("");
    setMaxPrice("");
    setRooms("");
    setBedrooms("");
    setBathrooms("");
    setMinSurface("");
    setMaxSurface("");
    setPropertyType("");
    setFurnished("");
    setListingType("");
    setAvailableFrom("");
    setSort("newest");
    setCalendarOpen(false);
  }

  /* =========================
     CĂUTARE
  ========================= */

  const handleSearch = () => {
    if (!selectedCity) return;

    const citySlug =
      selectedCity.slug ||
      slugify(selectedCity.name);

    const searchParams =
      new URLSearchParams();

    if (selectedNeighborhood?.slug) {
      searchParams.set(
        "zona",
        selectedNeighborhood.slug
      );
    }

    if (minPrice) {
      searchParams.set(
        "minPrice",
        minPrice
      );
    }

    if (maxPrice) {
      searchParams.set(
        "maxPrice",
        maxPrice
      );
    }

    if (rooms) {
      searchParams.set(
        "rooms",
        rooms
      );
    }

    if (bedrooms) {
      searchParams.set(
        "bedrooms",
        bedrooms
      );
    }

    if (bathrooms) {
      searchParams.set(
        "bathrooms",
        bathrooms
      );
    }

    if (minSurface) {
      searchParams.set(
        "minSurface",
        minSurface
      );
    }

    if (maxSurface) {
      searchParams.set(
        "maxSurface",
        maxSurface
      );
    }

    if (propertyType) {
      searchParams.set(
        "propertyType",
        propertyType
      );
    }

    if (furnished) {
      searchParams.set(
        "furnished",
        furnished
      );
    }

    if (listingType) {
      searchParams.set(
        "listingType",
        listingType
      );
    }

    if (availableFrom) {
      const isoDate =
        romanianDateToISO(
          availableFrom
        );

      if (isoDate) {
        searchParams.set(
          "availableFrom",
          isoDate
        );
      }
    }

    if (
      sort &&
      sort !== "newest"
    ) {
      searchParams.set(
        "sort",
        sort
      );
    }

    const query =
      searchParams.toString();

    let baseUrl =
      `/chirii/${citySlug}`;

    if (selectedUniversity) {
      const universitySlug =
        slugify(
          selectedUniversity.short_name ||
            selectedUniversity.name
        );

      baseUrl +=
        `/${universitySlug}`;
    }

    router.push(
      query
        ? `${baseUrl}?${query}`
        : baseUrl
    );
  };

  /* =========================
     STILURI
  ========================= */

  const inputStyle = {
    width: "100%",
    height: "54px",
    boxSizing: "border-box",
    border: "1px solid #E2E8F0",
    borderRadius: "12px",
    padding: "0 15px",
    fontSize: "14px",
    fontFamily: "inherit",
    fontWeight: "500",
    color: "#0F172A",
    outline: "none",
    background: "#FFFFFF",
  };

  const labelStyle = {
    display: "block",
    marginBottom: "6px",
    color: "#475569",
    fontSize: "11px",
    fontWeight: "800",
  };

  const dropdownStyle = {
    position: "absolute",
    top: "calc(100% + 7px)",
    left: 0,
    right: 0,
    background: "#FFFFFF",
    border: "1px solid #E2E8F0",
    borderRadius: "12px",
    boxShadow: "0 12px 30px rgba(15, 23, 42, 0.12)",
    zIndex: 9999,
    overflow: "hidden",
  };

  const dropdownScrollStyle = {
    maxHeight: "280px",
    overflowY: "auto",
    overflowX: "hidden",
    overscrollBehavior: "contain",
    WebkitOverflowScrolling: "touch",
    scrollbarGutter: "stable",
  };

  const optionStyle = {
    width: "100%",
    minHeight: "44px",
    display: "block",
    border: "none",
    borderBottom: "1px solid #F1F5F9",
    padding: "12px 15px",
    textAlign: "left",
    fontFamily: "inherit",
    fontSize: "14px",
    fontWeight: "600",
    color: "#0F172A",
    cursor: "pointer",
    boxSizing: "border-box",
  };
     return (
    <div
      style={{
        width: "100%",
        maxWidth: "960px",
        margin: "0 auto",
        background: "#FFFFFF",
        borderRadius: "18px",
        padding: "12px",
        boxSizing: "border-box",
        boxShadow: "0 15px 45px rgba(15, 23, 42, 0.10)",
        border: "1px solid #E2E8F0",
        position: "relative",
        textAlign: "left",
      }}
    >
      {/* =========================
          RÂND PRINCIPAL
      ========================= */}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "210px 1fr 180px 120px",
          gap: "12px",
          alignItems: "center",
        }}
      >
        {/* ORAȘ */}

        <div
          ref={cityWrapperRef}
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
            style={inputStyle}
          />

          {showCitySuggestions && (
            <div style={dropdownStyle}>
              <div style={dropdownScrollStyle}>
                {filteredCities.length > 0 ? (
                  filteredCities.map((city) => (
                    <button
                      key={city.id}
                      type="button"
                      onMouseDown={(event) =>
                        event.preventDefault()
                      }
                      onClick={() => chooseCity(city)}
                      style={{
                        ...optionStyle,
                        background:
                          selectedCity?.id === city.id
                            ? "#EFF6FF"
                            : "#FFFFFF",
                        color:
                          selectedCity?.id === city.id
                            ? "#2563EB"
                            : "#0F172A",
                        fontWeight:
                          selectedCity?.id === city.id
                            ? "800"
                            : "600",
                      }}
                    >
                      {city.name}
                    </button>
                  ))
                ) : (
                  <div
                    style={{
                      padding: "15px",
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

        {/* UNIVERSITATE */}

        <div
          ref={universityWrapperRef}
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
              if (!selectedCity) return;

              setUniversityQuery(event.target.value);
              setSelectedUniversity(null);

              setShowUniversitySuggestions(true);
              setShowCitySuggestions(false);
              setShowNeighborhoodSuggestions(false);
            }}
            style={{
              ...inputStyle,
              background: selectedCity ? "#FFFFFF" : "#F8FAFC",
              cursor: selectedCity ? "text" : "not-allowed",
              opacity: selectedCity ? 1 : 0.65,
            }}
          />

          {showUniversitySuggestions && selectedCity && (
            <div style={dropdownStyle}>
              <div style={dropdownScrollStyle}>
                <button
                  type="button"
                  onMouseDown={(event) =>
                    event.preventDefault()
                  }
                  onClick={() => {
                    setSelectedUniversity(null);
                    setUniversityQuery("");
                    setShowUniversitySuggestions(false);
                  }}
                  style={{
                    ...optionStyle,
                    background: "#EFF6FF",
                    color: "#2563EB",
                    fontWeight: "800",
                  }}
                >
                  <div>
                    Toate chiriile din {selectedCity.name}
                  </div>

                  <div
                    style={{
                      fontSize: "12px",
                      color: "#64748B",
                      marginTop: "3px",
                      fontWeight: "500",
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
                      onMouseDown={(event) =>
                        event.preventDefault()
                      }
                      onClick={() =>
                        chooseUniversity(university)
                      }
                      style={{
                        ...optionStyle,
                        background:
                          selectedUniversity?.id === university.id
                            ? "#EFF6FF"
                            : "#FFFFFF",
                      }}
                    >
                      <div
                        style={{
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
                            marginTop: "3px",
                            lineHeight: "1.35",
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
                      padding: "15px",
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

        {/* MAI MULTE FILTRE */}

        <button
          type="button"
          onClick={() => {
            setShowMoreFilters((current) => !current);

            setShowCitySuggestions(false);
            setShowUniversitySuggestions(false);
            setShowNeighborhoodSuggestions(false);
          }}
          style={{
            ...inputStyle,
            padding: "0 15px",
            background: showMoreFilters ? "#F8FAFC" : "#FFFFFF",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "10px",
            textAlign: "left",
            whiteSpace: "nowrap",
            fontWeight: "700",
          }}
        >
          <span>Mai multe filtre</span>

          <span
            style={{
              fontSize: "16px",
              color: "#64748B",
              transform: showMoreFilters
                ? "rotate(180deg)"
                : "rotate(0deg)",
              transition: "transform 150ms ease",
            }}
          >
            ⌄
          </span>
        </button>

        {/* VEZI CHIRII */}

        <button
          type="button"
          disabled={!selectedCity}
          onClick={handleSearch}
          style={{
            width: "100%",
            height: "54px",
            border: "none",
            borderRadius: "12px",
            padding: "0 15px",
            background: selectedCity ? "#172554" : "#94A3B8",
            color: "#FFFFFF",
            fontSize: "14px",
            fontFamily: "inherit",
            fontWeight: "700",
            cursor: selectedCity ? "pointer" : "not-allowed",
            whiteSpace: "nowrap",
            transition: "background-color 150ms ease",
            boxShadow: selectedCity
              ? "0 6px 16px rgba(23, 37, 84, 0.16)"
              : "none",
          }}
        >
          Vezi chirii
        </button>
      </div>

      {/* =========================
          FILTRE EXTINSE
      ========================= */}

      {showMoreFilters && (
        <div
          style={{
            marginTop: "12px",
            paddingTop: "16px",
            borderTop: "1px solid #E2E8F0",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
              gap: "14px",
            }}
          >
            {/* ZONĂ / CARTIER */}

            <div
              style={{
                position: "relative",
                minWidth: 0,
              }}
            >
              <label style={labelStyle}>Zonă / cartier</label>

              <input
                type="text"
                value={neighborhoodQuery}
                placeholder={
                  selectedCity ? "Toate zonele" : "Alege orașul"
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
                  if (!selectedCity) return;

                  setNeighborhoodQuery(event.target.value);
                  setSelectedNeighborhood(null);
                  setShowNeighborhoodSuggestions(true);
                }}
                style={{
                  ...inputStyle,
                  background: selectedCity ? "#FFFFFF" : "#F8FAFC",
                  cursor: selectedCity ? "text" : "not-allowed",
                  opacity: selectedCity ? 1 : 0.65,
                }}
              />

              {showNeighborhoodSuggestions && selectedCity && (
                <div style={dropdownStyle}>
                  <div style={dropdownScrollStyle}>
                    <button
                      type="button"
                      onMouseDown={(event) =>
                        event.preventDefault()
                      }
                      onClick={() => {
                        setSelectedNeighborhood(null);
                        setNeighborhoodQuery("");
                        setShowNeighborhoodSuggestions(false);
                      }}
                      style={{
                        ...optionStyle,
                        background: "#EFF6FF",
                        color: "#2563EB",
                        fontWeight: "800",
                      }}
                    >
                      Toate zonele
                    </button>

                    {filteredNeighborhoods.length > 0 ? (
                      filteredNeighborhoods.map(
                        (neighborhood) => (
                          <button
                            key={neighborhood.id}
                            type="button"
                            onMouseDown={(event) =>
                              event.preventDefault()
                            }
                            onClick={() =>
                              chooseNeighborhood(neighborhood)
                            }
                            style={{
                              ...optionStyle,
                              background:
                                selectedNeighborhood?.id ===
                                neighborhood.id
                                  ? "#EFF6FF"
                                  : "#FFFFFF",
                              color:
                                selectedNeighborhood?.id ===
                                neighborhood.id
                                  ? "#2563EB"
                                  : "#0F172A",
                              fontWeight:
                                selectedNeighborhood?.id ===
                                neighborhood.id
                                  ? "800"
                                  : "600",
                            }}
                          >
                            {neighborhood.name}
                          </button>
                        )
                      )
                    ) : (
                      <div
                        style={{
                          padding: "15px",
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

            {/* PREȚ MINIM */}

            <div>
              <label style={labelStyle}>Preț minim</label>

              <input
                type="text"
                inputMode="numeric"
                value={minPrice}
                placeholder="De la €"
                onChange={(event) =>
                  handleIntegerChange(
                    event.target.value,
                    setMinPrice
                  )
                }
                style={inputStyle}
              />
            </div>

            {/* PREȚ MAXIM */}

            <div>
              <label style={labelStyle}>Preț maxim</label>

              <input
                type="text"
                inputMode="numeric"
                value={maxPrice}
                placeholder="Până la €"
                onChange={(event) =>
                  handleIntegerChange(
                    event.target.value,
                    setMaxPrice
                  )
                }
                style={inputStyle}
              />
            </div>

            {/* CAMERE */}

            <div>
              <label style={labelStyle}>Camere</label>

              <select
                value={rooms}
                onChange={(event) => setRooms(event.target.value)}
                style={{
                  ...inputStyle,
                  cursor: "pointer",
                }}
              >
                <option value="">Oricare</option>
                <option value="1">1 cameră</option>
                <option value="2">2 camere</option>
                <option value="3">3 camere</option>
                <option value="4">4 camere</option>
                <option value="5">5+ camere</option>
              </select>
            </div>

            {/* TIP PROPRIETATE */}

            <div>
              <label style={labelStyle}>Tip proprietate</label>

              <select
                value={propertyType}
                onChange={(event) =>
                  setPropertyType(event.target.value)
                }
                style={{
                  ...inputStyle,
                  cursor: "pointer",
                }}
              >
                <option value="">Oricare</option>
                <option value="apartment">Apartament</option>
                <option value="studio">Garsonieră</option>
                <option value="room">Cameră</option>
                <option value="house">Casă</option>
              </select>
            </div>

            {/* DORMITOARE */}

            <div>
              <label style={labelStyle}>Dormitoare</label>

              <select
                value={bedrooms}
                onChange={(event) =>
                  setBedrooms(event.target.value)
                }
                style={{
                  ...inputStyle,
                  cursor: "pointer",
                }}
              >
                <option value="">Oricare</option>
                <option value="1">1 dormitor</option>
                <option value="2">2 dormitoare</option>
                <option value="3">3 dormitoare</option>
                <option value="4">4+ dormitoare</option>
              </select>
            </div>

            {/* BĂI */}

            <div>
              <label style={labelStyle}>Băi</label>

              <select
                value={bathrooms}
                onChange={(event) =>
                  setBathrooms(event.target.value)
                }
                style={{
                  ...inputStyle,
                  cursor: "pointer",
                }}
              >
                <option value="">Oricare</option>
                <option value="1">1 baie</option>
                <option value="2">2 băi</option>
                <option value="3">3+ băi</option>
              </select>
            </div>

            {/* SUPRAFAȚĂ MINIMĂ */}

            <div>
              <label style={labelStyle}>Suprafață minimă</label>

              <input
                type="text"
                inputMode="numeric"
                value={minSurface}
                placeholder="De la m²"
                onChange={(event) =>
                  handleIntegerChange(
                    event.target.value,
                    setMinSurface
                  )
                }
                style={inputStyle}
              />
            </div>

            {/* SUPRAFAȚĂ MAXIMĂ */}

            <div>
              <label style={labelStyle}>Suprafață maximă</label>

              <input
                type="text"
                inputMode="numeric"
                value={maxSurface}
                placeholder="Până la m²"
                onChange={(event) =>
                  handleIntegerChange(
                    event.target.value,
                    setMaxSurface
                  )
                }
                style={inputStyle}
              />
            </div>

            {/* MOBILAT */}

            <div>
              <label style={labelStyle}>Mobilat</label>

              <select
                value={furnished}
                onChange={(event) =>
                  setFurnished(event.target.value)
                }
                style={{
                  ...inputStyle,
                  cursor: "pointer",
                }}
              >
                <option value="">Oricare</option>
                <option value="yes">Da</option>
                <option value="no">Nu</option>
              </select>
            </div>

            {/* TIP ANUNȚ */}

            <div>
              <label style={labelStyle}>Tip anunț</label>

              <select
                value={listingType}
                onChange={(event) =>
                  setListingType(event.target.value)
                }
                style={{
                  ...inputStyle,
                  cursor: "pointer",
                }}
              >
                <option value="">Oricare</option>
                <option value="rent">Închiriere</option>
                <option value="room">Cameră</option>
              </select>
            </div>

            {/* DISPONIBIL DE LA */}

            <div
              ref={calendarWrapperRef}
              style={{
                position: "relative",
              }}
            >
              <label style={labelStyle}>Disponibil de la</label>

              <button
                type="button"
                onClick={() =>
                  setCalendarOpen((current) => !current)
                }
                style={{
                  ...inputStyle,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  textAlign: "left",
                }}
              >
                <span
                  style={{
                    color: availableFrom
                      ? "#0F172A"
                      : "#94A3B8",
                  }}
                >
                  {availableFrom || "ZZ/LL/AAAA"}
                </span>

                <span
                  style={{
                    fontSize: "16px",
                    color: "#64748B",
                  }}
                >
                  ▣
                </span>
              </button>

              {calendarOpen && (
                <DateCalendar
                  value={availableFrom}
                  onChange={setAvailableFrom}
                  onClose={() => setCalendarOpen(false)}
                />
              )}
            </div>

            {/* SORTARE */}

            <div>
              <label style={labelStyle}>Sortare</label>

              <select
                value={sort}
                onChange={(event) => setSort(event.target.value)}
                style={{
                  ...inputStyle,
                  cursor: "pointer",
                }}
              >
                <option value="newest">Cele mai noi</option>
                <option value="price_asc">Preț crescător</option>
                <option value="price_desc">Preț descrescător</option>
                <option value="surface_desc">
                  Suprafață descrescător
                </option>
              </select>
            </div>
          </div>

          {/* =========================
              DOAR RESETEAZĂ
          ========================= */}

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-start",
              marginTop: "16px",
              paddingTop: "14px",
              borderTop: "1px solid #F1F5F9",
            }}
          >
            <button
              type="button"
              onClick={resetMoreFilters}
              style={{
                height: "42px",
                padding: "0 15px",
                border: "1px solid #E2E8F0",
                borderRadius: "10px",
                background: "#FFFFFF",
                color: "#475569",
                fontFamily: "inherit",
                fontSize: "13px",
                fontWeight: "700",
                cursor: "pointer",
              }}
            >
              Resetează filtrele
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
