"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../lib/supabase";
import FavoriteButton from "../../components/FavoriteButton";

export const dynamic = "force-dynamic";

/* =========================
   NORMALIZARE ORAȘ
========================= */

function normalizeCity(value = "") {
  return decodeURIComponent(String(value))
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function formatFallbackCityName(city = "") {
  return decodeURIComponent(city)
    .replace(/-/g, " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}

/* =========================
   DATE
========================= */

function formatDate(date) {
  if (!date) return null;

  try {
    const raw = String(date);

    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      const [year, month, day] = raw
        .split("-")
        .map(Number);

      const parsed = new Date(
        year,
        month - 1,
        day
      );

      if (Number.isNaN(parsed.getTime())) {
        return null;
      }

      return `${String(day).padStart(
        2,
        "0"
      )}/${String(month).padStart(
        2,
        "0"
      )}/${year}`;
    }

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) {
      return null;
    }

    const day = String(
      parsed.getDate()
    ).padStart(2, "0");

    const month = String(
      parsed.getMonth() + 1
    ).padStart(2, "0");

    const year = parsed.getFullYear();

    return `${day}/${month}/${year}`;
  } catch {
    return null;
  }
}

function romanianDateToISO(value) {
  if (!value) return "";

  const parts = value.split("/");

  if (parts.length !== 3) {
    return "";
  }

  const day = parts[0];
  const month = parts[1];
  const year = parts[2];

  return `${year}-${month}-${day}`;
}

function isoDateToRomanian(value) {
  if (
    !value ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return "";
  }

  const [year, month, day] =
    value.split("-");

  return `${day}/${month}/${year}`;
}

/* =========================
   CALENDAR
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

const WEEK_DAYS = [
  "Lu",
  "Ma",
  "Mi",
  "Jo",
  "Vi",
  "Sâ",
  "Du",
];

function getTodayAtMidnight() {
  const now = new Date();

  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );
}

function getCalendarStartDate(year, month) {
  const firstDay = new Date(
    year,
    month,
    1
  );

  /*
    JS:
    Duminică = 0
    Luni = 1

    Noi vrem:
    Luni = 0
    ...
    Duminică = 6
  */

  const mondayIndex =
    (firstDay.getDay() + 6) % 7;

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

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
}

function romanianToLocalDate(value) {
  if (!value) return null;

  if (
    !/^(0[1-9]|[12]\d|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/.test(
      value
    )
  ) {
    return null;
  }

  const [day, month, year] = value
    .split("/")
    .map(Number);

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

/* =========================
   VALIDARE NUMERE
========================= */

function isValidInteger(value, max) {
  if (!value) return true;

  if (!/^[1-9]\d*$/.test(value)) {
    return false;
  }

  const number = Number(value);

  return (
    Number.isInteger(number) &&
    number > 0 &&
    number <= max
  );
}

function numberValue(value) {
  if (!value) return null;

  const number = Number(value);

  if (!Number.isFinite(number)) {
    return null;
  }

  return number;
}

/* =========================
   VALIDARE DATĂ
========================= */

function isValidRomanianDate(value) {
  if (!value) return true;

  if (
    !/^(0[1-9]|[12]\d|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/.test(
      value
    )
  ) {
    return false;
  }

  const [day, month, year] = value
    .split("/")
    .map(Number);

  const date = new Date(
    year,
    month - 1,
    day
  );

  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
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

  const selectedDate =
    romanianToLocalDate(value);

  const initialDate =
    selectedDate || today;

  const [viewYear, setViewYear] =
    useState(initialDate.getFullYear());

  const [viewMonth, setViewMonth] =
    useState(initialDate.getMonth());

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
    viewedMonthStart.getTime() <=
    currentMonthStart.getTime();

  function goPreviousMonth() {
    if (previousMonthDisabled) {
      return;
    }

    const previous = new Date(
      viewYear,
      viewMonth - 1,
      1
    );

    setViewYear(
      previous.getFullYear()
    );

    setViewMonth(
      previous.getMonth()
    );
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

  const calendarStart =
    getCalendarStartDate(
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

    if (
      normalized.getTime() <
      today.getTime()
    ) {
      return;
    }

    onChange(
      dateToRomanian(normalized)
    );

    onClose();
  }

  function selectToday() {
    onChange(
      dateToRomanian(today)
    );

    onClose();
  }

  function clearDate() {
    onChange("");
    onClose();
  }

  return (
    <div
      className="filter-calendar"
      onClick={(event) =>
        event.stopPropagation()
      }
      style={{
        position: "absolute",
        top: "calc(100% + 7px)",
        left: 0,
        zIndex: 100,
        width: "292px",
        boxSizing: "border-box",
        background: "#FFFFFF",
        border: "1px solid #E2E8F0",
        borderRadius: "12px",
        padding: "13px",
        boxShadow:
          "0 14px 35px rgba(15, 23, 42, 0.14)",
      }}
    >
      {/* HEADER CALENDAR */}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent:
            "space-between",
          marginBottom: "12px",
        }}
      >
        <button
          type="button"
          onClick={goPreviousMonth}
          disabled={
            previousMonthDisabled
          }
          aria-label="Luna precedentă"
          style={{
            width: "32px",
            height: "32px",
            border:
              "1px solid #E2E8F0",
            borderRadius: "8px",
            background:
              previousMonthDisabled
                ? "#F8FAFC"
                : "#FFFFFF",
            color:
              previousMonthDisabled
                ? "#CBD5E1"
                : "#172554",
            cursor:
              previousMonthDisabled
                ? "not-allowed"
                : "pointer",
            fontSize: "18px",
            lineHeight: "1",
            display: "flex",
            alignItems: "center",
            justifyContent:
              "center",
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
          {MONTH_NAMES[viewMonth]}{" "}
          {viewYear}
        </div>

        <button
          type="button"
          onClick={goNextMonth}
          aria-label="Luna următoare"
          style={{
            width: "32px",
            height: "32px",
            border:
              "1px solid #E2E8F0",
            borderRadius: "8px",
            background: "#FFFFFF",
            color: "#172554",
            cursor: "pointer",
            fontSize: "18px",
            lineHeight: "1",
            display: "flex",
            alignItems: "center",
            justifyContent:
              "center",
          }}
        >
          ›
        </button>
      </div>

      {/* ZILE SĂPTĂMÂNĂ */}

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(7, 1fr)",
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

      {/* ZILE */}

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(7, 1fr)",
          gap: "3px",
        }}
      >
        {calendarDays.map(
          (date, index) => {
            const normalizedDate =
              new Date(
                date.getFullYear(),
                date.getMonth(),
                date.getDate()
              );

            const isPast =
              normalizedDate.getTime() <
              today.getTime();

            const isCurrentMonth =
              date.getMonth() ===
                viewMonth &&
              date.getFullYear() ===
                viewYear;

            const isSelected =
              isSameCalendarDay(
                date,
                selectedDate
              );

            const isToday =
              isSameCalendarDay(
                date,
                today
              );

            return (
              <button
                key={index}
                type="button"
                disabled={isPast}
                onClick={() =>
                  selectDate(date)
                }
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
                    isSelected ||
                    isToday
                      ? "800"
                      : "600",
                  cursor: isPast
                    ? "not-allowed"
                    : "pointer",
                  opacity:
                    !isCurrentMonth &&
                    !isSelected
                      ? 0.65
                      : 1,
                }}
              >
                {date.getDate()}
              </button>
            );
          }
        )}
      </div>

      {/* ACȚIUNI CALENDAR */}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent:
            "space-between",
          gap: "8px",
          marginTop: "11px",
          paddingTop: "10px",
          borderTop:
            "1px solid #F1F5F9",
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
            border:
              "1px solid #BFDBFE",
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
   PAGINA
========================= */

export default function CityListingsPage() {
  const params = useParams();

  const citySlug =
    Array.isArray(params?.city)
      ? params.city[0]
      : params?.city || "";

  const normalizedRequestedCity =
    normalizeCity(citySlug);

  /* =========================
     DATE PAGINĂ
  ========================= */

  const [listings, setListings] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [loadError, setLoadError] =
    useState("");

  /* =========================
     RESTAURARE POZIȚIE CĂUTARE
  ========================= */

  const scrollRestoredRef =
    useRef(false);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      loading ||
      scrollRestoredRef.current
    ) {
      return;
    }

    const savedUrl =
      sessionStorage.getItem(
        "studenthousing-search-url"
      );

    const savedScroll =
      sessionStorage.getItem(
        "studenthousing-search-scroll"
      );

    const currentUrl =
      window.location.pathname +
      window.location.search;

    if (
      savedUrl === currentUrl &&
      savedScroll !== null
    ) {
      const scrollY =
        Number(savedScroll);

      scrollRestoredRef.current =
        true;

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          window.scrollTo({
            top: Number.isFinite(
              scrollY
            )
              ? scrollY
              : 0,
            left: 0,
            behavior: "auto",
          });
        });
      });
    }
  }, [loading]);

  /* =========================
     FILTRE EDITATE
  ========================= */

  const [minPrice, setMinPrice] =
    useState("");

  const [maxPrice, setMaxPrice] =
    useState("");

  const [rooms, setRooms] =
    useState("");

  const [bedrooms, setBedrooms] =
    useState("");

  const [bathrooms, setBathrooms] =
    useState("");

  const [minSurface, setMinSurface] =
    useState("");

  const [maxSurface, setMaxSurface] =
    useState("");

  const [
    propertyType,
    setPropertyType,
  ] = useState("");

  const [
    furnished,
    setFurnished,
  ] = useState("");

  const [
    listingType,
    setListingType,
  ] = useState("");

  const [
    availableFrom,
    setAvailableFrom,
  ] = useState("");

  const [sort, setSort] =
    useState("newest");

  /* =========================
     CALENDAR
  ========================= */

  const [
    calendarOpen,
    setCalendarOpen,
  ] = useState(false);

  const calendarWrapperRef =
    useRef(null);

  /*
    Închidem calendarul când
    utilizatorul apasă în afara lui.
  */

  useEffect(() => {
    function handleOutsideClick(
      event
    ) {
      if (
        calendarWrapperRef.current &&
        !calendarWrapperRef.current.contains(
          event.target
        )
      ) {
        setCalendarOpen(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handleOutsideClick
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );
    };
  }, []);

  /* =========================
     FILTRE APLICATE

     IMPORTANT:
     lista folosește DOAR
     valorile de aici.
  ========================= */

  const [
    appliedFilters,
    setAppliedFilters,
  ] = useState({
    minPrice: "",
    maxPrice: "",
    rooms: "",
    bedrooms: "",
    bathrooms: "",
    minSurface: "",
    maxSurface: "",
    propertyType: "",
    furnished: "",
    listingType: "",
    availableFrom: "",
    sort: "newest",
  });

  /* =========================
     ERORI
  ========================= */

  const [
    showValidationErrors,
    setShowValidationErrors,
  ] = useState(false);

  const [
    validationErrors,
    setValidationErrors,
  ] = useState([]);

  /* =========================
     ÎNCĂRCARE FILTRE DIN URL
  ========================= */

  useEffect(() => {
    if (
      typeof window === "undefined"
    ) {
      return;
    }

    const searchParams =
      new URLSearchParams(
        window.location.search
      );

    const urlMinPrice =
      searchParams.get("minPrice") ||
      "";

    const urlMaxPrice =
      searchParams.get("maxPrice") ||
      "";

    const urlRooms =
      searchParams.get("rooms") || "";

    const urlBedrooms =
      searchParams.get(
        "bedrooms"
      ) || "";

    const urlBathrooms =
      searchParams.get(
        "bathrooms"
      ) || "";

    const urlMinSurface =
      searchParams.get(
        "minSurface"
      ) || "";

    const urlMaxSurface =
      searchParams.get(
        "maxSurface"
      ) || "";

    const urlPropertyType =
      searchParams.get(
        "propertyType"
      ) || "";

    const urlFurnished =
      searchParams.get(
        "furnished"
      ) || "";

    const urlListingType =
      searchParams.get(
        "listingType"
      ) || "";

    const urlSort =
      searchParams.get("sort") ||
      "newest";

    const urlAvailableFrom =
      searchParams.get(
        "availableFrom"
      ) || "";

    const formattedAvailableFrom =
      isoDateToRomanian(
        urlAvailableFrom
      );

    setMinPrice(urlMinPrice);
    setMaxPrice(urlMaxPrice);
    setRooms(urlRooms);
    setBedrooms(urlBedrooms);
    setBathrooms(urlBathrooms);
    setMinSurface(urlMinSurface);
    setMaxSurface(urlMaxSurface);

    setPropertyType(
      urlPropertyType
    );

    setFurnished(
      urlFurnished
    );

    setListingType(
      urlListingType
    );

    setAvailableFrom(
      formattedAvailableFrom
    );

    setSort(urlSort);

    setAppliedFilters({
      minPrice: urlMinPrice,
      maxPrice: urlMaxPrice,
      rooms: urlRooms,
      bedrooms: urlBedrooms,
      bathrooms: urlBathrooms,
      minSurface: urlMinSurface,
      maxSurface: urlMaxSurface,
      propertyType:
        urlPropertyType,
      furnished:
        urlFurnished,
      listingType:
        urlListingType,
      availableFrom:
        formattedAvailableFrom,
      sort: urlSort,
    });
  }, [citySlug]);

  /* =========================
     ÎNCĂRCARE ANUNȚURI
  ========================= */

  useEffect(() => {
    let cancelled = false;

    async function loadListings() {
      setLoading(true);
      setLoadError("");

      try {
        const {
          data,
          error,
        } = await supabase
          .from("listings")
          .select(`
            id,
            title,
            description,
            city,
            address,
            price_monthly,
            rooms,
            bedrooms,
            bathrooms,
            surface_m2,
            property_type,
            listing_type,
            furnished,
            available_from,
            image_url,
            active,
            created_at
          `)
          .eq("active", true)
          .order(
            "created_at",
            {
              ascending: false,
            }
          );

        if (error) {
          throw error;
        }

        if (cancelled) {
          return;
        }

        /*
          Filtrăm orașul normalizat,
          ca Timișoara / timisoara
          să se potrivească.
        */

        const cityListings =
          (data || []).filter(
            (listing) =>
              normalizeCity(
                listing.city
              ) ===
              normalizedRequestedCity
          );

        setListings(
          cityListings
        );
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.error(
          "Eroare la încărcarea anunțurilor:",
          error
        );

        setListings([]);

        setLoadError(
          "Nu am putut încărca anunțurile."
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadListings();

    return () => {
      cancelled = true;
    };
  }, [
    normalizedRequestedCity,
  ]);

  /* =========================
     NUME ORAȘ
  ========================= */

  const cityName =
    listings[0]?.city ||
    formatFallbackCityName(
      citySlug
    );

  /* =========================
     VALIDARE FILTRE
  ========================= */

  function validateFilters() {
    const errors = [];

    if (
      minPrice &&
      !isValidInteger(
        minPrice,
        100000
      )
    ) {
      errors.push(
        "Prețul minim introdus nu este o valoare corespunzătoare."
      );
    }

    if (
      maxPrice &&
      !isValidInteger(
        maxPrice,
        100000
      )
    ) {
      errors.push(
        "Prețul maxim introdus nu este o valoare corespunzătoare."
      );
    }

    if (
      minSurface &&
      !isValidInteger(
        minSurface,
        10000
      )
    ) {
      errors.push(
        "Suprafața minimă introdusă nu este o valoare corespunzătoare."
      );
    }

    if (
      maxSurface &&
      !isValidInteger(
        maxSurface,
        10000
      )
    ) {
      errors.push(
        "Suprafața maximă introdusă nu este o valoare corespunzătoare."
      );
    }

    if (
      availableFrom &&
      !isValidRomanianDate(
        availableFrom
      )
    ) {
      errors.push(
        "Data disponibilității nu este validă."
      );
    }

    const minimumPrice =
      numberValue(minPrice);

    const maximumPrice =
      numberValue(maxPrice);

    const minimumSurface =
      numberValue(minSurface);

    const maximumSurface =
      numberValue(maxSurface);

    if (
      minimumPrice !== null &&
      maximumPrice !== null &&
      minimumPrice >
        maximumPrice
    ) {
      errors.push(
        "Prețul minim nu poate fi mai mare decât prețul maxim."
      );
    }

    if (
      minimumSurface !== null &&
      maximumSurface !== null &&
      minimumSurface >
        maximumSurface
    ) {
      errors.push(
        "Suprafața minimă nu poate fi mai mare decât suprafața maximă."
      );
    }

    return errors;
  }

  /* =========================
     APLICĂ FILTRELE
  ========================= */

  function handleSubmit(event) {
    event.preventDefault();

    const errors =
      validateFilters();

    setShowValidationErrors(
      true
    );

    setValidationErrors(
      errors
    );

    if (errors.length > 0) {
      return;
    }

    setAppliedFilters({
      minPrice,
      maxPrice,
      rooms,
      bedrooms,
      bathrooms,
      minSurface,
      maxSurface,
      propertyType,
      furnished,
      listingType,
      availableFrom,
      sort,
    });

    const searchParams =
      new URLSearchParams();

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
      searchParams.set(
        "availableFrom",
        romanianDateToISO(
          availableFrom
        )
      );
    }

    if (sort) {
      searchParams.set(
        "sort",
        sort
      );
    }

    const query =
      searchParams.toString();

    const newUrl =
      `/chirii/${citySlug}` +
      (query
        ? `?${query}`
        : "");

    window.history.pushState(
      {},
      "",
      newUrl
    );

    setCalendarOpen(false);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  /* =========================
     RESETARE
  ========================= */

  function resetFilters() {
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

    setAppliedFilters({
      minPrice: "",
      maxPrice: "",
      rooms: "",
      bedrooms: "",
      bathrooms: "",
      minSurface: "",
      maxSurface: "",
      propertyType: "",
      furnished: "",
      listingType: "",
      availableFrom: "",
      sort: "newest",
    });

    setValidationErrors([]);
    setShowValidationErrors(
      false
    );

    window.history.pushState(
      {},
      "",
      `/chirii/${citySlug}`
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  /* =========================
     INPUT NUMERIC
  ========================= */

  function handleIntegerChange(
    value,
    setter
  ) {
    let cleaned = String(
      value
    ).replace(/\D/g, "");

    cleaned = cleaned.replace(
      /^0+/,
      ""
    );

    setter(cleaned);
  }

  /* =========================
     FILTRARE + SORTARE

     DOAR appliedFilters
     modifică rezultatele.
  ========================= */

  const filteredListings =
    useMemo(() => {
      let result = [
        ...listings,
      ];

      const minimumPrice =
        numberValue(
          appliedFilters.minPrice
        );

      const maximumPrice =
        numberValue(
          appliedFilters.maxPrice
        );

      const minimumSurface =
        numberValue(
          appliedFilters.minSurface
        );

      const maximumSurface =
        numberValue(
          appliedFilters.maxSurface
        );

      if (
        minimumPrice !== null
      ) {
        result = result.filter(
          (listing) =>
            Number(
              listing.price_monthly
            ) >= minimumPrice
        );
      }

      if (
        maximumPrice !== null
      ) {
        result = result.filter(
          (listing) =>
            Number(
              listing.price_monthly
            ) <= maximumPrice
        );
      }

      if (
        appliedFilters.rooms
      ) {
        const selectedRooms =
          Number(
            appliedFilters.rooms
          );

        if (
          selectedRooms === 5
        ) {
          result = result.filter(
            (listing) =>
              Number(
                listing.rooms
              ) >= 5
          );
        } else {
          result = result.filter(
            (listing) =>
              Number(
                listing.rooms
              ) === selectedRooms
          );
        }
      }

      if (
        appliedFilters.bedrooms
      ) {
        const selectedBedrooms =
          Number(
            appliedFilters.bedrooms
          );

        if (
          selectedBedrooms === 4
        ) {
          result = result.filter(
            (listing) =>
              Number(
                listing.bedrooms
              ) >= 4
          );
        } else {
          result = result.filter(
            (listing) =>
              Number(
                listing.bedrooms
              ) ===
              selectedBedrooms
          );
        }
      }

      if (
        appliedFilters.bathrooms
      ) {
        const selectedBathrooms =
          Number(
            appliedFilters.bathrooms
          );

        if (
          selectedBathrooms === 3
        ) {
          result = result.filter(
            (listing) =>
              Number(
                listing.bathrooms
              ) >= 3
          );
        } else {
          result = result.filter(
            (listing) =>
              Number(
                listing.bathrooms
              ) ===
              selectedBathrooms
          );
        }
      }
                result = result.filter(
            (listing) =>
              Number(
                listing.bathrooms
              ) >= 3
          );
        } else {
          result = result.filter(
            (listing) =>
              Number(
                listing.bathrooms
              ) ===
              selectedBathrooms
          );
        }
      }

      if (
        minimumSurface !== null
      ) {
        result = result.filter(
          (listing) =>
            Number(
              listing.surface_m2
            ) >= minimumSurface
        );
      }

      if (
        maximumSurface !== null
      ) {
        result = result.filter(
          (listing) =>
            Number(
              listing.surface_m2
            ) <= maximumSurface
        );
      }

      if (
        appliedFilters.propertyType
      ) {
        result = result.filter(
          (listing) =>
            listing.property_type ===
            appliedFilters.propertyType
        );
      }

      if (
        appliedFilters.furnished ===
        "yes"
      ) {
        result = result.filter(
          (listing) =>
            listing.furnished === true
        );
      }

      if (
        appliedFilters.furnished ===
        "no"
      ) {
        result = result.filter(
          (listing) =>
            listing.furnished === false
        );
      }

      if (
        appliedFilters.listingType
      ) {
        result = result.filter(
          (listing) =>
            listing.listing_type ===
            appliedFilters.listingType
        );
      }

      if (
        appliedFilters.availableFrom
      ) {
        const isoDate =
          romanianDateToISO(
            appliedFilters.availableFrom
          );

        if (isoDate) {
          result = result.filter(
            (listing) =>
              listing.available_from &&
              listing.available_from <=
                isoDate
          );
        }
      }

      if (
        appliedFilters.sort ===
        "price_asc"
      ) {
        result.sort(
          (a, b) =>
            Number(
              a.price_monthly
            ) -
            Number(
              b.price_monthly
            )
        );
      }

      if (
        appliedFilters.sort ===
        "price_desc"
      ) {
        result.sort(
          (a, b) =>
            Number(
              b.price_monthly
            ) -
            Number(
              a.price_monthly
            )
        );
      }

      if (
        appliedFilters.sort ===
        "surface_desc"
      ) {
        result.sort(
          (a, b) =>
            Number(
              b.surface_m2 || 0
            ) -
            Number(
              a.surface_m2 || 0
            )
        );
      }

      if (
        appliedFilters.sort ===
        "newest"
      ) {
        result.sort(
          (a, b) =>
            new Date(
              b.created_at
            ).getTime() -
            new Date(
              a.created_at
            ).getTime()
        );
      }

      return result;
    }, [
      listings,
      appliedFilters,
    ]);

  const hasAppliedFilters =
    Boolean(
      appliedFilters.minPrice ||
        appliedFilters.maxPrice ||
        appliedFilters.rooms ||
        appliedFilters.bedrooms ||
        appliedFilters.bathrooms ||
        appliedFilters.minSurface ||
        appliedFilters.maxSurface ||
        appliedFilters.propertyType ||
        appliedFilters.furnished ||
        appliedFilters.listingType ||
        appliedFilters.availableFrom ||
        appliedFilters.sort !==
          "newest"
    );

  /* =========================
     RETURN
     CONTINUĂ ÎN 2/2
  ========================= */

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#F4F7FB",
        color: "#0F172A",
      }}
    >
      {/* HEADER */}

      <header
        style={{
          height: "72px",
          background: "#FFFFFF",
          borderBottom:
            "1px solid #E2E8F0",
          display: "flex",
          alignItems: "center",
          justifyContent:
            "space-between",
          padding: "0 6%",
          boxSizing: "border-box",
        }}
      >
        <a
          href="/"
          style={{
            textDecoration: "none",
            fontSize: "25px",
            fontWeight: "800",
            letterSpacing: "-1px",
          }}
        >
          <span
            style={{
              color: "#172554",
            }}
          >
            Student
          </span>

          <span
            style={{
              color: "#3B82F6",
            }}
          >
            Housing
          </span>
        </a>

        <a
          href="/"
          style={{
            color: "#64748B",
            textDecoration: "none",
            fontSize: "13px",
            fontWeight: "700",
          }}
        >
          Înapoi la căutare
        </a>
      </header>

      {/* CONȚINUT */}

      <section
        style={{
          maxWidth: "1080px",
          margin: "0 auto",
          padding:
            "42px 22px 80px",
          boxSizing: "border-box",
        }}
      >
        {/* TITLU */}

        <div
          style={{
            marginBottom: "24px",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              background: "#EFF6FF",
              color: "#3B82F6",
              borderRadius: "100px",
              padding: "6px 11px",
              fontSize: "11px",
              fontWeight: "800",
              marginBottom: "12px",
            }}
          >
            Chirii pentru studenți
          </div>

          <h1
            style={{
              margin: 0,
              color: "#172554",
              fontSize: "32px",
              lineHeight: "1.15",
              letterSpacing: "-1.1px",
              fontWeight: "800",
            }}
          >
            Chirii în {cityName}
          </h1>

          <p
            style={{
              margin: "9px 0 0",
              color: "#64748B",
              fontSize: "14px",
              lineHeight: "1.6",
            }}
          >
            Descoperă locuințele disponibile
            pentru închiriere în {cityName},
            indiferent de universitatea la care
            studiezi.
          </p>
        </div>

        {/* FILTRE */}

        <form
          onSubmit={handleSubmit}
          style={{
            background: "#FFFFFF",
            border:
              "1px solid #E2E8F0",
            borderRadius: "14px",
            padding: "16px",
            marginBottom: "18px",
            boxShadow:
              "0 5px 20px rgba(15, 23, 42, 0.035)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent:
                "space-between",
              gap: "15px",
              marginBottom: "14px",
            }}
          >
            <div>
              <div
                style={{
                  color: "#172554",
                  fontSize: "15px",
                  fontWeight: "800",
                }}
              >
                Filtre
              </div>

              <div
                style={{
                  color: "#64748B",
                  fontSize: "11px",
                  marginTop: "3px",
                }}
              >
                Găsește proprietatea potrivită
              </div>
            </div>

            <button
              type="button"
              onClick={resetFilters}
              style={{
                border: "none",
                background:
                  "transparent",
                color: "#3B82F6",
                padding: "6px",
                fontFamily:
                  "inherit",
                fontSize: "11px",
                fontWeight: "800",
                cursor: "pointer",
              }}
            >
              Resetează
            </button>
          </div>

          {/* RÂND 1 */}

          <div
            className="filter-grid"
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(4, minmax(0, 1fr))",
              gap: "10px",
            }}
          >
            <div>
              <label
                style={labelStyle}
              >
                Preț minim
              </label>

              <input
                type="text"
                inputMode="numeric"
                value={minPrice}
                onChange={(event) =>
                  handleIntegerChange(
                    event.target.value,
                    setMinPrice
                  )
                }
                placeholder="De la €"
                style={inputStyle}
              />
            </div>

            <div>
              <label
                style={labelStyle}
              >
                Preț maxim
              </label>

              <input
                type="text"
                inputMode="numeric"
                value={maxPrice}
                onChange={(event) =>
                  handleIntegerChange(
                    event.target.value,
                    setMaxPrice
                  )
                }
                placeholder="Până la €"
                style={inputStyle}
              />
            </div>

            <div>
              <label
                style={labelStyle}
              >
                Camere
              </label>

              <select
                value={rooms}
                onChange={(event) =>
                  setRooms(
                    event.target.value
                  )
                }
                style={inputStyle}
              >
                <option value="">
                  Oricare
                </option>

                <option value="1">
                  1 cameră
                </option>

                <option value="2">
                  2 camere
                </option>

                <option value="3">
                  3 camere
                </option>

                <option value="4">
                  4 camere
                </option>

                <option value="5">
                  5+ camere
                </option>
              </select>
            </div>

            <div>
              <label
                style={labelStyle}
              >
                Tip proprietate
              </label>

              <select
                value={propertyType}
                onChange={(event) =>
                  setPropertyType(
                    event.target.value
                  )
                }
                style={inputStyle}
              >
                <option value="">
                  Oricare
                </option>

                <option value="apartment">
                  Apartament
                </option>

                <option value="studio">
                  Garsonieră
                </option>

                <option value="room">
                  Cameră
                </option>

                <option value="house">
                  Casă
                </option>
              </select>
            </div>
          </div>

          {/* RÂND 2 */}

          <div
            className="filter-grid"
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(4, minmax(0, 1fr))",
              gap: "10px",
              marginTop: "10px",
            }}
          >
            <div>
              <label
                style={labelStyle}
              >
                Dormitoare
              </label>

              <select
                value={bedrooms}
                onChange={(event) =>
                  setBedrooms(
                    event.target.value
                  )
                }
                style={inputStyle}
              >
                <option value="">
                  Oricare
                </option>

                <option value="1">
                  1
                </option>

                <option value="2">
                  2
                </option>

                <option value="3">
                  3
                </option>

                <option value="4">
                  4+
                </option>
              </select>
            </div>

            <div>
              <label
                style={labelStyle}
              >
                Băi
              </label>

              <select
                value={bathrooms}
                onChange={(event) =>
                  setBathrooms(
                    event.target.value
                  )
                }
                style={inputStyle}
              >
                <option value="">
                  Oricare
                </option>

                <option value="1">
                  1
                </option>

                <option value="2">
                  2
                </option>

                <option value="3">
                  3+
                </option>
              </select>
            </div>

            <div>
              <label
                style={labelStyle}
              >
                Suprafață minimă
              </label>

              <input
                type="text"
                inputMode="numeric"
                value={minSurface}
                onChange={(event) =>
                  handleIntegerChange(
                    event.target.value,
                    setMinSurface
                  )
                }
                placeholder="De la m²"
                style={inputStyle}
              />
            </div>

            <div>
              <label
                style={labelStyle}
              >
                Suprafață maximă
              </label>

              <input
                type="text"
                inputMode="numeric"
                value={maxSurface}
                onChange={(event) =>
                  handleIntegerChange(
                    event.target.value,
                    setMaxSurface
                  )
                }
                placeholder="Până la m²"
                style={inputStyle}
              />
            </div>
          </div>

          {/* RÂND 3 */}

          <div
            className="filter-grid"
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(4, minmax(0, 1fr))",
              gap: "10px",
              marginTop: "10px",
            }}
          >
            <div>
              <label
                style={labelStyle}
              >
                Mobilat
              </label>

              <select
                value={furnished}
                onChange={(event) =>
                  setFurnished(
                    event.target.value
                  )
                }
                style={inputStyle}
              >
                <option value="">
                  Oricare
                </option>

                <option value="yes">
                  Da
                </option>

                <option value="no">
                  Nu
                </option>
              </select>
            </div>

            <div>
              <label
                style={labelStyle}
              >
                Tip anunț
              </label>

              <select
                value={listingType}
                onChange={(event) =>
                  setListingType(
                    event.target.value
                  )
                }
                style={inputStyle}
              >
                <option value="">
                  Oricare
                </option>

                <option value="rent">
                  Închiriere
                </option>

                <option value="room">
                  Cameră
                </option>
              </select>
            </div>

            {/* CALENDAR DISPONIBIL DE LA */}

            <div
              ref={calendarWrapperRef}
              style={{
                position: "relative",
              }}
            >
              <label
                style={labelStyle}
              >
                Disponibil de la
              </label>

              <button
                type="button"
                onClick={() =>
                  setCalendarOpen(
                    (current) =>
                      !current
                  )
                }
                style={{
                  ...inputStyle,
                  display: "flex",
                  alignItems: "center",
                  justifyContent:
                    "space-between",
                  textAlign: "left",
                  cursor: "pointer",
                  background: "#FFFFFF",
                }}
              >
                <span
                  style={{
                    color: availableFrom
                      ? "#0F172A"
                      : "#94A3B8",
                  }}
                >
                  {availableFrom ||
                    "ZZ/LL/AAAA"}
                </span>

                <span
                  aria-hidden="true"
                  style={{
                    color: "#64748B",
                    fontSize: "15px",
                    lineHeight: 1,
                    marginLeft: "8px",
                  }}
                >
                  ▣
                </span>
              </button>

              {calendarOpen && (
                <DateCalendar
                  value={availableFrom}
                  onChange={
                    setAvailableFrom
                  }
                  onClose={() =>
                    setCalendarOpen(
                      false
                    )
                  }
                />
              )}
            </div>

            <div>
              <label
                style={labelStyle}
              >
                Sortare
              </label>

              <select
                value={sort}
                onChange={(event) =>
                  setSort(
                    event.target.value
                  )
                }
                style={inputStyle}
              >
                <option value="newest">
                  Cele mai noi
                </option>

                <option value="price_asc">
                  Preț crescător
                </option>

                <option value="price_desc">
                  Preț descrescător
                </option>

                <option value="surface_desc">
                  Suprafață descrescător
                </option>
              </select>
            </div>
          </div>

          {/* ERORI */}

          {showValidationErrors &&
            validationErrors.length > 0 && (
              <div
                style={{
                  marginTop: "13px",
                  background: "#FEF2F2",
                  border: "1px solid #FECACA",
                  borderRadius: "10px",
                  padding: "10px 12px",
                }}
              >
                {validationErrors.map(
                  (message, index) => (
                    <div
                      key={index}
                      style={{
                        color: "#B91C1C",
                        fontSize: "11px",
                        lineHeight: "1.6",
                        fontWeight: "700",
                      }}
                    >
                      {message}
                    </div>
                  )
                )}
              </div>
            )}

          {/* BUTON APLICĂ */}

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginTop: "14px",
            }}
          >
            <button
              type="submit"
              style={{
                border: "none",
                background: "#172554",
                color: "#FFFFFF",
                borderRadius: "9px",
                padding: "10px 18px",
                fontFamily: "inherit",
                fontSize: "12px",
                fontWeight: "800",
                cursor: "pointer",
                boxShadow:
                  "0 5px 14px rgba(23, 37, 84, 0.16)",
              }}
            >
              Aplică filtrele
            </button>
          </div>
        </form>

        {/* =========================
            REZUMAT REZULTATE
        ========================= */}

        {!loading && !loadError && (
          <div
            style={{
              minHeight: "35px",
              boxSizing: "border-box",
              background: "#FFFFFF",
              border: "1px solid #E2E8F0",
              borderRadius: "9px",
              padding: "8px 12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
              marginBottom: "11px",
            }}
          >
            <div
              style={{
                color: "#172554",
                fontSize: "11px",
                fontWeight: "800",
              }}
            >
              {filteredListings.length === 1
                ? "1 anunț găsit"
                : `${filteredListings.length} anunțuri găsite`}
            </div>

            <div
              style={{
                color: "#94A3B8",
                fontSize: "10px",
                fontWeight: "700",
              }}
            >
              {appliedFilters.sort === "newest" &&
                "Cele mai noi"}

              {appliedFilters.sort === "price_asc" &&
                "Preț crescător"}

              {appliedFilters.sort === "price_desc" &&
                "Preț descrescător"}

              {appliedFilters.sort === "surface_desc" &&
                "Suprafață descrescător"}
            </div>
          </div>
        )}

        {/* =========================
            LOADING
        ========================= */}

        {loading && (
          <div
            style={{
              background: "#FFFFFF",
              border: "1px solid #E2E8F0",
              borderRadius: "14px",
              padding: "32px 24px",
              textAlign: "center",
              color: "#64748B",
              fontSize: "13px",
              fontWeight: "700",
            }}
          >
            Se încarcă anunțurile...
          </div>
        )}

        {/* =========================
            EROARE
        ========================= */}

        {!loading && loadError && (
          <div
            style={{
              background: "#FFFFFF",
              border: "1px solid #FECACA",
              borderRadius: "14px",
              padding: "32px 24px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                color: "#B91C1C",
                fontSize: "14px",
                fontWeight: "800",
              }}
            >
              {loadError}
            </div>

            <p
              style={{
                margin: "7px 0 0",
                color: "#64748B",
                fontSize: "12px",
              }}
            >
              Încearcă din nou mai târziu.
            </p>
          </div>
        )}

        {/* =========================
            FĂRĂ REZULTATE
        ========================= */}

        {!loading &&
          !loadError &&
          validationErrors.length === 0 &&
          filteredListings.length === 0 && (
            <div
              style={{
                background: "#FFFFFF",
                border: "1px solid #E2E8F0",
                borderRadius: "14px",
                padding: "34px 24px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  color: "#172554",
                  fontSize: "16px",
                  fontWeight: "800",
                }}
              >
                Nu am găsit anunțuri
              </div>

              <p
                style={{
                  margin: "7px auto 0",
                  maxWidth: "500px",
                  color: "#64748B",
                  fontSize: "12px",
                  lineHeight: "1.6",
                }}
              >
                {hasAppliedFilters
                  ? "Încearcă să modifici sau să resetezi filtrele."
                  : `Momentan nu există locuințe active în ${cityName}.`}
              </p>
            </div>
          )}

        {/* =========================
            LISTĂ ANUNȚURI
        ========================= */}

        {!loading &&
          !loadError &&
          validationErrors.length === 0 &&
          filteredListings.length > 0 && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "11px",
              }}
            >
              {filteredListings.map((listing) => {
                const availableDate =
                  formatDate(
                    listing.available_from
                  );

                const createdDate =
                  formatDate(
                    listing.created_at
                  );

                const returnUrl =
                  typeof window !== "undefined"
                    ? `/chirii/${citySlug}${window.location.search}`
                    : `/chirii/${citySlug}`;

                return (
                  <div
                    key={listing.id}
                    className="listing-card"
                    style={{
                      background: "#FFFFFF",
                      border: "1px solid #E2E8F0",
                      borderRadius: "14px",
                      overflow: "hidden",
                      display: "flex",
                      minHeight: "168px",
                      position: "relative",
                      transition:
                        "box-shadow 0.2s ease, border-color 0.2s ease, transform 0.2s ease",
                    }}
                  >
                    {/* FOTO */}

                    <div
                      className="listing-image"
                      style={{
                        width: "235px",
                        minWidth: "235px",
                        height: "168px",
                        background: "#EFF6FF",
                        overflow: "hidden",
                        position: "relative",
                      }}
                    >
                      {listing.image_url ? (
                        <img
                          src={listing.image_url}
                          alt={listing.title}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            display: "block",
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: "100%",
                            height: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#94A3B8",
                            fontSize: "12px",
                            fontWeight: "700",
                          }}
                        >
                          Fără fotografie
                        </div>
                      )}

                      <FavoriteButton
                        listingId={listing.id}
                      />
                    </div>

                    {/* LINK PRINCIPAL */}

                    <a
                      href={`/proprietate/${
                        listing.id
                      }?from=${encodeURIComponent(
                        returnUrl
                      )}`}
                      onClick={() => {
                        if (
                          typeof window ===
                          "undefined"
                        ) {
                          return;
                        }

                        sessionStorage.setItem(
                          "studenthousing-search-url",
                          window.location.pathname +
                            window.location.search
                        );

                        sessionStorage.setItem(
                          "studenthousing-search-scroll",
                          String(window.scrollY)
                        );
                      }}
                      className="listing-main-link"
                      style={{
                        flex: "1",
                        minWidth: "0",
                        display: "flex",
                        textDecoration: "none",
                        color: "inherit",
                      }}
                    >
                      {/* CONȚINUT */}

                      <div
                        className="listing-content"
                        style={{
                          flex: "1",
                          minWidth: "0",
                          padding: "17px 19px",
                          display: "flex",
                          flexDirection: "column",
                          justifyContent:
                            "space-between",
                        }}
                      >
                        <div>
                          <h2
                            style={{
                              margin: 0,
                              color: "#172554",
                              fontSize: "17px",
                              lineHeight: "1.35",
                              fontWeight: "800",
                              overflow: "hidden",
                              textOverflow:
                                "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {listing.title}
                          </h2>

                          <div
                            style={{
                              color: "#64748B",
                              fontSize: "12px",
                              lineHeight: "1.5",
                              marginTop: "6px",
                              overflow: "hidden",
                              textOverflow:
                                "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {listing.city}

                            {listing.address
                              ? ` · ${listing.address}`
                              : ""}
                          </div>

                          {/* DETALII */}

                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              flexWrap: "wrap",
                              gap: "7px",
                              marginTop: "13px",
                            }}
                          >
                            {Number(
                              listing.rooms
                            ) > 0 && (
                              <span
                                style={
                                  detailBadge
                                }
                              >
                                {listing.rooms}{" "}
                                {Number(
                                  listing.rooms
                                ) === 1
                                  ? "cameră"
                                  : "camere"}
                              </span>
                            )}

                            {Number(
                              listing.surface_m2
                            ) > 0 && (
                              <span
                                style={
                                  detailBadge
                                }
                              >
                                {
                                  listing.surface_m2
                                }{" "}
                                m²
                              </span>
                            )}

                            {Number(
                              listing.bedrooms
                            ) > 0 && (
                              <span
                                style={
                                  detailBadge
                                }
                              >
                                {
                                  listing.bedrooms
                                }{" "}
                                {Number(
                                  listing.bedrooms
                                ) === 1
                                  ? "dormitor"
                                  : "dormitoare"}
                              </span>
                            )}

                            {Number(
                              listing.bathrooms
                            ) > 0 && (
                              <span
                                style={
                                  detailBadge
                                }
                              >
                                {
                                  listing.bathrooms
                                }{" "}
                                {Number(
                                  listing.bathrooms
                                ) === 1
                                  ? "baie"
                                  : "băi"}
                              </span>
                            )}

                            {listing.furnished ===
                              true && (
                              <span
                                style={
                                  detailBadge
                                }
                              >
                                Mobilat
                              </span>
                            )}
                          </div>
                        </div>

                        {/* DATE */}

                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            flexWrap: "wrap",
                            marginTop: "13px",
                          }}
                        >
                          {availableDate && (
                            <span
                              style={{
                                color: "#64748B",
                                fontSize: "11px",
                                fontWeight: "700",
                              }}
                            >
                              Disponibil din{" "}
                              {availableDate}
                            </span>
                          )}

                          {createdDate && (
                            <span
                              style={{
                                color: "#94A3B8",
                                fontSize: "10px",
                              }}
                            >
                              Publicat{" "}
                              {createdDate}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* PREȚ */}

                      <div
                        className="listing-price"
                        style={{
                          width: "175px",
                          minWidth: "175px",
                          padding: "17px 19px",
                          boxSizing: "border-box",
                          borderLeft:
                            "1px solid #F1F5F9",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "flex-end",
                          justifyContent: "center",
                        }}
                      >
                        <div
                          style={{
                            color: "#172554",
                            fontSize: "22px",
                            lineHeight: "1",
                            fontWeight: "900",
                            letterSpacing:
                              "-0.7px",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {Number(
                            listing.price_monthly
                          ).toLocaleString(
                            "ro-RO"
                          )}{" "}
                          €
                        </div>

                        <div
                          style={{
                            color: "#64748B",
                            fontSize: "11px",
                            fontWeight: "700",
                            marginTop: "5px",
                          }}
                        >
                          / lună
                        </div>

                        <div
                          style={{
                            color: "#2563EB",
                            fontSize: "11px",
                            fontWeight: "800",
                            marginTop: "16px",
                          }}
                        >
                          Vezi anunțul →
                        </div>
                      </div>
                    </a>
                  </div>
                );
              })}
            </div>
          )}
      </section>

      {/* =========================
          RESPONSIVE + HOVER
      ========================= */}

      <style jsx global>{`
        .listing-card:hover {
          border-color: #bfdbfe !important;
          box-shadow: 0 10px 28px
            rgba(15, 23, 42, 0.07);
          transform: translateY(-1px);
        }

        .listing-main-link:hover h2 {
          color: #2563eb !important;
        }

        input:focus,
        select:focus {
          outline: none;
          border-color: #93c5fd !important;
          box-shadow: 0 0 0 3px
            rgba(59, 130, 246, 0.08);
        }

        .filter-calendar button:not(
            :disabled
          ):hover {
          background: #eff6ff !important;
          color: #2563eb !important;
        }

        @media (max-width: 850px) {
          .filter-grid {
            grid-template-columns:
              repeat(
                2,
                minmax(0, 1fr)
              ) !important;
          }

          .listing-price {
            width: 145px !important;
            min-width: 145px !important;
          }
        }

        @media (max-width: 650px) {
          .filter-grid {
            grid-template-columns:
              1fr !important;
          }

          .filter-calendar {
            width: min(
              292px,
              calc(100vw - 60px)
            ) !important;
          }

          .listing-card {
            flex-direction:
              column !important;
          }

          .listing-image {
            width: 100% !important;
            min-width: 100% !important;
            height: 210px !important;
          }

          .listing-main-link {
            flex-direction:
              column !important;
          }

          .listing-price {
            width: 100% !important;
            min-width: 100% !important;
            border-left:
              none !important;
            border-top:
              1px solid #f1f5f9 !important;
            align-items:
              flex-start !important;
          }

          .listing-content {
            padding: 16px !important;
          }
        }
      `}</style>
    </main>
  );
}

/* =========================
   STILURI
========================= */

const labelStyle = {
  display: "block",
  color: "#475569",
  fontSize: "10px",
  lineHeight: "1.3",
  fontWeight: "800",
  marginBottom: "5px",
};

const inputStyle = {
  width: "100%",
  height: "38px",
  boxSizing: "border-box",
  border: "1px solid #CBD5E1",
  borderRadius: "8px",
  background: "#FFFFFF",
  color: "#0F172A",
  padding: "0 10px",
  fontFamily: "inherit",
  fontSize: "12px",
  fontWeight: "600",
  transition:
    "border-color 0.15s ease, box-shadow 0.15s ease",
};

const detailBadge = {
  display: "inline-flex",
  alignItems: "center",
  minHeight: "25px",
  boxSizing: "border-box",
  background: "#F8FAFC",
  border: "1px solid #E2E8F0",
  borderRadius: "7px",
  padding: "4px 8px",
  color: "#475569",
  fontSize: "10px",
  fontWeight: "800",
  whiteSpace: "nowrap",
};
