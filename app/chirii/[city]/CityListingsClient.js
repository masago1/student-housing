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
import AccountButton from "../../components/AccountButton";

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

function MobileFilterActions({
  onApply,
  onReset,
}) {
  return (
    <div className="mobile-filter-actions">
      <button
        type="button"
        onClick={onReset}
        className="mobile-filter-reset"
      >
        Resetează
      </button>

      <button
        type="button"
        onClick={onApply}
        className="mobile-filter-apply"
      >
        Aplică filtrele
      </button>
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

  const [imageIndexes, setImageIndexes] =
    useState({});

  const [loading, setLoading] =
    useState(true);

  const [loadError, setLoadError] =
    useState("");

  /* =========================
     MOD AFIȘARE LISTĂ / GRID
  ========================= */

  const [viewMode, setViewMode] =
    useState("grid");

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const savedViewMode =
      localStorage.getItem(
        "studenthousing-view-mode"
      );

    if (
      savedViewMode === "list" ||
      savedViewMode === "grid"
    ) {
      setViewMode(savedViewMode);
    }
  }, []);

  function changeViewMode(mode) {
    setViewMode(mode);

    if (typeof window !== "undefined") {
      localStorage.setItem(
        "studenthousing-view-mode",
        mode
      );
    }
  }

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

  const [zone, setZone] =
    useState("");

  /* =========================
     FILTRE MOBILE
  ========================= */

  const [
    mobileFilterOpen,
    setMobileFilterOpen,
  ] = useState("");

  function toggleMobileFilter(filter) {
    setMobileFilterOpen((current) =>
      current === filter ? "" : filter
    );
  }

  function closeMobileFilter() {
    setMobileFilterOpen("");
  }

  function applyMobileFilters() {
    handleSubmit({
      preventDefault() {},
    });
    setMobileFilterOpen("");
  }

  /* =========================
     CALENDAR
  ========================= */

  const [
    calendarOpen,
    setCalendarOpen,
  ] = useState(false);

  const calendarWrapperRef =
    useRef(null);

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
    zone: "",
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

    const rawUrlListingType =
      searchParams.get(
        "listingType"
      ) || "";

    // Homepage-ul folosea anterior `rent`,
    // iar anunțurile folosesc `entire`
    // pentru locuință întreagă.
    const urlListingType =
      rawUrlListingType === "rent"
        ? "entire"
        : rawUrlListingType;

    const urlZone =
      searchParams.get("zona") || "";

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

    setZone(urlZone);

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
      zone: urlZone,
    });
  }, [citySlug]);

  /* =========================
     ÎNCĂRCARE ANUNȚURI + POZE
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
            neighborhood_id,
            neighborhoods (
              id,
              name,
              slug
            ),
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

        const cityListings =
          (data || []).filter(
            (listing) =>
              normalizeCity(
                listing.city
              ) ===
              normalizedRequestedCity
          );

        const listingIds =
          cityListings.map(
            (listing) => listing.id
          );

        let imagesByListing = {};

        if (listingIds.length > 0) {
          const {
            data: listingImages,
            error: listingImagesError,
          } = await supabase
            .from("listing_images")
            .select(
              "listing_id, image_url"
            )
            .in(
              "listing_id",
              listingIds
            );

          if (listingImagesError) {
            throw listingImagesError;
          }

          imagesByListing =
            (
              listingImages || []
            ).reduce(
              (
                accumulator,
                image
              ) => {
                if (
                  !image?.listing_id ||
                  !image?.image_url
                ) {
                  return accumulator;
                }

                if (
                  !accumulator[
                    image.listing_id
                  ]
                ) {
                  accumulator[
                    image.listing_id
                  ] = [];
                }

                if (
                  !accumulator[
                    image.listing_id
                  ].includes(
                    image.image_url
                  )
                ) {
                  accumulator[
                    image.listing_id
                  ].push(
                    image.image_url
                  );
                }

                return accumulator;
              },
              {}
            );
        }

        if (cancelled) {
          return;
        }

        const listingsWithImages =
          cityListings.map(
            (listing) => {
              const galleryImages =
                imagesByListing[
                  listing.id
                ] || [];

              const allImages = [];

              if (listing.image_url) {
                allImages.push(
                  listing.image_url
                );
              }

              galleryImages.forEach(
                (imageUrl) => {
                  if (
                    !allImages.includes(
                      imageUrl
                    )
                  ) {
                    allImages.push(
                      imageUrl
                    );
                  }
                }
              );

              return {
                ...listing,
                images: allImages,
              };
            }
          );

        setListings(
          listingsWithImages
        );

        setImageIndexes({});
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
      zone,
    });

    const searchParams =
      new URLSearchParams();

    if (zone) {
      searchParams.set(
        "zona",
        zone
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
    setZone("");

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
      zone: "",
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
     CARUSEL POZE
  ========================= */

  function changeListingImage(
    listingId,
    direction,
    imageCount
  ) {
    if (imageCount <= 1) {
      return;
    }

    setImageIndexes((current) => {
      const currentIndex =
        current[listingId] || 0;

      const nextIndex =
        (
          currentIndex +
          direction +
          imageCount
        ) % imageCount;

      return {
        ...current,
        [listingId]: nextIndex,
      };
    });
  }
    /* =========================
     FILTRARE + SORTARE
  ========================= */

  const filteredListings =
    useMemo(() => {
      const result = [
        ...listings,
      ].filter((listing) => {
        const price = Number(
          listing.price_monthly
        );

        const listingRooms =
          Number(listing.rooms);

        const listingBedrooms =
          Number(listing.bedrooms);

        const listingBathrooms =
          Number(listing.bathrooms);

        const surface = Number(
          listing.surface_m2
        );

        const listingNeighborhoodSlug =
          listing.neighborhoods?.slug || "";

        if (
          appliedFilters.zone &&
          listingNeighborhoodSlug !==
            appliedFilters.zone
        ) {
          return false;
        }

        if (
          appliedFilters.minPrice &&
          price <
            Number(
              appliedFilters.minPrice
            )
        ) {
          return false;
        }

        if (
          appliedFilters.maxPrice &&
          price >
            Number(
              appliedFilters.maxPrice
            )
        ) {
          return false;
        }

        if (
          appliedFilters.rooms &&
          listingRooms !==
            Number(
              appliedFilters.rooms
            )
        ) {
          return false;
        }

        if (
          appliedFilters.bedrooms &&
          listingBedrooms !==
            Number(
              appliedFilters.bedrooms
            )
        ) {
          return false;
        }

        if (
          appliedFilters.bathrooms &&
          listingBathrooms !==
            Number(
              appliedFilters.bathrooms
            )
        ) {
          return false;
        }

        if (
          appliedFilters.minSurface &&
          surface <
            Number(
              appliedFilters.minSurface
            )
        ) {
          return false;
        }

        if (
          appliedFilters.maxSurface &&
          surface >
            Number(
              appliedFilters.maxSurface
            )
        ) {
          return false;
        }

        if (
          appliedFilters.propertyType &&
          listing.property_type !==
            appliedFilters.propertyType
        ) {
          return false;
        }

        if (
          appliedFilters.listingType &&
          listing.listing_type !==
            appliedFilters.listingType
        ) {
          return false;
        }

        if (
          appliedFilters.furnished ===
            "yes" &&
          listing.furnished !== true
        ) {
          return false;
        }

        if (
          appliedFilters.furnished ===
            "no" &&
          listing.furnished !== false
        ) {
          return false;
        }

        if (
          appliedFilters.availableFrom
        ) {
          if (
            !listing.available_from
          ) {
            return false;
          }

          const selectedISO =
            romanianDateToISO(
              appliedFilters.availableFrom
            );

          if (
            listing.available_from >
            selectedISO
          ) {
            return false;
          }
        }

        return true;
      });

      result.sort((a, b) => {
        switch (
          appliedFilters.sort
        ) {
          case "price_asc":
            return (
              Number(
                a.price_monthly
              ) -
              Number(
                b.price_monthly
              )
            );

          case "price_desc":
            return (
              Number(
                b.price_monthly
              ) -
              Number(
                a.price_monthly
              )
            );

          case "surface_desc":
            return (
              Number(
                b.surface_m2 || 0
              ) -
              Number(
                a.surface_m2 || 0
              )
            );

          case "newest":
          default:
            return (
              new Date(
                b.created_at
              ).getTime() -
              new Date(
                a.created_at
              ).getTime()
            );
        }
      });

      return result;
    }, [
      listings,
      appliedFilters,
    ]);

  /* =========================
     EXISTĂ FILTRE?
  ========================= */

  const hasAppliedFilters =
    Boolean(
      appliedFilters.zone ||
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
          height: "64px",
          boxSizing: "border-box",
          background: "#FFFFFF",
          borderBottom:
            "1px solid #E2E8F0",
          display: "flex",
          alignItems: "center",
          justifyContent:
            "space-between",
          padding: "0 5%",
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
        <a
          href="/"
          style={{
            color: "#172554",
            textDecoration: "none",
            fontSize: "21px",
            fontWeight: "900",
            letterSpacing: "-0.8px",
          }}
        >
          shaus
        </a>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "11px", fontWeight: "800", whiteSpace: "nowrap" }}>
          <AccountButton />
        <a
          href="/adaugaproprietate"
          style={{
            background: "#172554",
            color: "#FFFFFF",
            textDecoration: "none",
            borderRadius: "9px",
            padding: "10px 15px",
            fontSize: "11px",
            fontWeight: "800",
          }}
        >
          + Adaugă anunț
        </a>
        </div>
      </header>

      <section
        style={{
          maxWidth: "1120px",
          margin: "0 auto",
          padding: "28px 20px 60px",
        }}
      >
        {/* TITLU */}

        <div
          style={{
            marginBottom: "18px",
          }}
        >
          <a
            href="/"
            style={{
              color: "#64748B",
              textDecoration: "none",
              fontSize: "11px",
              fontWeight: "700",
            }}
          >
            ← Înapoi la căutare
          </a>

          <h1
            style={{
              margin: "12px 0 0",
              color: "#172554",
              fontSize: "28px",
              lineHeight: "1.15",
              fontWeight: "900",
              letterSpacing: "-1px",
            }}
          >
            Chirii în {cityName}
          </h1>

          <p
            style={{
              margin: "7px 0 0",
              color: "#64748B",
              fontSize: "12px",
              lineHeight: "1.6",
            }}
          >
            Descoperă locuințele
            disponibile și filtrează
            rezultatele după criteriile
            tale.
          </p>
        </div>

        {/* FILTRE */}

        <div className="mobile-filter-bar">
          <div className="mobile-filter-chips">
            <button
              type="button"
              className={`mobile-filter-chip ${
                mobileFilterOpen === "price"
                  ? "mobile-filter-chip-active"
                  : ""
              }`}
              onPointerDown={(event) => {
                event.preventDefault();
                toggleMobileFilter("price");
              }}
            >
              Preț
            </button>

            <button
              type="button"
              className={`mobile-filter-chip ${
                mobileFilterOpen === "rooms"
                  ? "mobile-filter-chip-active"
                  : ""
              }`}
              onPointerDown={(event) => {
                event.preventDefault();
                toggleMobileFilter("rooms");
              }}
            >
              Camere
            </button>

            <button
              type="button"
              className={`mobile-filter-chip ${
                mobileFilterOpen === "surface"
                  ? "mobile-filter-chip-active"
                  : ""
              }`}
              onPointerDown={(event) => {
                event.preventDefault();
                toggleMobileFilter("surface");
              }}
            >
              Suprafață
            </button>

            <button
              type="button"
              className={`mobile-filter-chip ${
                mobileFilterOpen === "furnished"
                  ? "mobile-filter-chip-active"
                  : ""
              }`}
              onPointerDown={(event) => {
                event.preventDefault();
                toggleMobileFilter("furnished");
              }}
            >
              Mobilat
            </button>

            <button
              type="button"
              className={`mobile-filter-chip ${
                mobileFilterOpen === "more"
                  ? "mobile-filter-chip-active"
                  : ""
              }`}
              onPointerDown={(event) => {
                event.preventDefault();
                toggleMobileFilter("more");
              }}
            >
              Mai multe
            </button>
          </div>

          {mobileFilterOpen === "price" && (
            <div className="mobile-filter-panel">
              <div className="mobile-filter-panel-title">
                Preț lunar
              </div>

              <div className="mobile-filter-two-columns">
                <input
                  value={minPrice}
                  onChange={(event) =>
                    handleIntegerChange(
                      event.target.value,
                      setMinPrice
                    )
                  }
                  inputMode="numeric"
                  placeholder="Preț minim"
                  style={inputStyle}
                />

                <input
                  value={maxPrice}
                  onChange={(event) =>
                    handleIntegerChange(
                      event.target.value,
                      setMaxPrice
                    )
                  }
                  inputMode="numeric"
                  placeholder="Preț maxim"
                  style={inputStyle}
                />
              </div>

              <MobileFilterActions
                onApply={applyMobileFilters}
                onReset={resetFilters}
              />
            </div>
          )}

          {mobileFilterOpen === "rooms" && (
            <div className="mobile-filter-panel">
              <div className="mobile-filter-panel-title">
                Număr camere
              </div>

              <select
                value={rooms}
                onChange={(event) =>
                  setRooms(event.target.value)
                }
                style={inputStyle}
              >
                <option value="">Oricâte</option>
                <option value="1">1 cameră</option>
                <option value="2">2 camere</option>
                <option value="3">3 camere</option>
                <option value="4">4 camere</option>
                <option value="5">5+ camere</option>
              </select>

              <MobileFilterActions
                onApply={applyMobileFilters}
                onReset={resetFilters}
              />
            </div>
          )}

          {mobileFilterOpen === "surface" && (
            <div className="mobile-filter-panel">
              <div className="mobile-filter-panel-title">
                Suprafață
              </div>

              <div className="mobile-filter-two-columns">
                <input
                  value={minSurface}
                  onChange={(event) =>
                    handleIntegerChange(
                      event.target.value,
                      setMinSurface
                    )
                  }
                  inputMode="numeric"
                  placeholder="Min. m²"
                  style={inputStyle}
                />

                <input
                  value={maxSurface}
                  onChange={(event) =>
                    handleIntegerChange(
                      event.target.value,
                      setMaxSurface
                    )
                  }
                  inputMode="numeric"
                  placeholder="Max. m²"
                  style={inputStyle}
                />
              </div>

              <MobileFilterActions
                onApply={applyMobileFilters}
                onReset={resetFilters}
              />
            </div>
          )}

          {mobileFilterOpen === "furnished" && (
            <div className="mobile-filter-panel">
              <div className="mobile-filter-panel-title">
                Mobilat
              </div>

              <select
                value={furnished}
                onChange={(event) =>
                  setFurnished(event.target.value)
                }
                style={inputStyle}
              >
                <option value="">Oricare</option>
                <option value="yes">Da, mobilat</option>
                <option value="no">Nu, nemobilat</option>
              </select>

              <MobileFilterActions
                onApply={applyMobileFilters}
                onReset={resetFilters}
              />
            </div>
          )}

          {mobileFilterOpen === "more" && (
            <div className="mobile-filter-panel mobile-more-panel">
              <div className="mobile-filter-panel-title">
                Mai multe filtre
              </div>

              <div className="mobile-filter-field">
                <label style={labelStyle}>
                  Dormitoare
                </label>
                <select
                  value={bedrooms}
                  onChange={(event) =>
                    setBedrooms(event.target.value)
                  }
                  style={inputStyle}
                >
                  <option value="">Oricâte</option>
                  <option value="1">1 dormitor</option>
                  <option value="2">2 dormitoare</option>
                  <option value="3">3 dormitoare</option>
                  <option value="4">4+ dormitoare</option>
                </select>
              </div>

              <div className="mobile-filter-field">
                <label style={labelStyle}>
                  Băi
                </label>
                <select
                  value={bathrooms}
                  onChange={(event) =>
                    setBathrooms(event.target.value)
                  }
                  style={inputStyle}
                >
                  <option value="">Oricâte</option>
                  <option value="1">1 baie</option>
                  <option value="2">2 băi</option>
                  <option value="3">3+ băi</option>
                </select>
              </div>

              <div className="mobile-filter-field">
                <label style={labelStyle}>
                  Tip proprietate
                </label>
                <select
                  value={propertyType}
                  onChange={(event) =>
                    setPropertyType(event.target.value)
                  }
                  style={inputStyle}
                >
                  <option value="">Toate</option>
                  <option value="apartment">Apartament</option>
                  <option value="studio">Garsonieră</option>
                  <option value="house">Casă</option>
                  <option value="room">Cameră</option>
                </select>
              </div>

              <div className="mobile-filter-field">
                <label style={labelStyle}>
                  Disponibil până la
                </label>
                <input
                  type="date"
                  value={romanianDateToISO(availableFrom)}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(event) =>
                    setAvailableFrom(
                      isoDateToRomanian(
                        event.target.value
                      )
                    )
                  }
                  style={inputStyle}
                />
              </div>

              <div className="mobile-filter-field">
                <label style={labelStyle}>
                  Sortare
                </label>
                <select
                  value={sort}
                  onChange={(event) =>
                    setSort(event.target.value)
                  }
                  style={inputStyle}
                >
                  <option value="newest">Cele mai noi</option>
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

              <MobileFilterActions
                onApply={applyMobileFilters}
                onReset={resetFilters}
              />
            </div>
          )}
        </div>

        <form
          className="desktop-filter-form"
          onSubmit={handleSubmit}
          style={{
            background: "#FFFFFF",
            border:
              "1px solid #E2E8F0",
            borderRadius: "14px",
            padding: "16px",
            marginBottom: "12px",
          }}
        >
          <div
            className="filter-grid"
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(4, minmax(0, 1fr))",
              gap: "11px",
            }}
          >
            <div>
              <label style={labelStyle}>
                Preț minim (€)
              </label>

              <input
                value={minPrice}
                onChange={(event) =>
                  handleIntegerChange(
                    event.target.value,
                    setMinPrice
                  )
                }
                inputMode="numeric"
                placeholder="Ex. 250"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>
                Preț maxim (€)
              </label>

              <input
                value={maxPrice}
                onChange={(event) =>
                  handleIntegerChange(
                    event.target.value,
                    setMaxPrice
                  )
                }
                inputMode="numeric"
                placeholder="Ex. 600"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>
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
                  Oricâte
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
              <label style={labelStyle}>
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
                  Oricâte
                </option>
                <option value="1">
                  1 dormitor
                </option>
                <option value="2">
                  2 dormitoare
                </option>
                <option value="3">
                  3 dormitoare
                </option>
                <option value="4">
                  4+ dormitoare
                </option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>
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
                  Oricâte
                </option>
                <option value="1">
                  1 baie
                </option>
                <option value="2">
                  2 băi
                </option>
                <option value="3">
                  3+ băi
                </option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>
                Suprafață minimă (m²)
              </label>

              <input
                value={minSurface}
                onChange={(event) =>
                  handleIntegerChange(
                    event.target.value,
                    setMinSurface
                  )
                }
                inputMode="numeric"
                placeholder="Ex. 30"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>
                Suprafață maximă (m²)
              </label>

              <input
                value={maxSurface}
                onChange={(event) =>
                  handleIntegerChange(
                    event.target.value,
                    setMaxSurface
                  )
                }
                inputMode="numeric"
                placeholder="Ex. 100"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>
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
                  Toate
                </option>
                <option value="apartment">
                  Apartament
                </option>
                <option value="studio">
                  Garsonieră
                </option>
                <option value="house">
                  Casă
                </option>
                <option value="room">
                  Cameră
                </option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>
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
              <label style={labelStyle}>
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
                  Toate
                </option>
                <option value="entire">
                  Locuință întreagă
                </option>
                <option value="room">
                  Cameră
                </option>
              </select>
            </div>

            <div
              ref={calendarWrapperRef}
              style={{
                position: "relative",
              }}
            >
              <label style={labelStyle}>
                Disponibil până la
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
                  cursor: "pointer",
                  textAlign: "left",
                  display: "flex",
                  alignItems: "center",
                  justifyContent:
                    "space-between",
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
                    "Alege data"}
                </span>

                <span>▾</span>
              </button>

              {calendarOpen && (
                <DateCalendar
                  value={
                    availableFrom
                  }
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
              <label style={labelStyle}>
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

          {showValidationErrors &&
            validationErrors.length >
              0 && (
              <div
                style={{
                  marginTop: "12px",
                  padding: "10px 12px",
                  background:
                    "#FEF2F2",
                  border:
                    "1px solid #FECACA",
                  borderRadius: "8px",
                  color: "#B91C1C",
                  fontSize: "11px",
                  fontWeight: "700",
                  lineHeight: "1.6",
                }}
              >
                {validationErrors.map(
                  (error, index) => (
                    <div key={index}>
                      {error}
                    </div>
                  )
                )}
              </div>
            )}

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent:
                "flex-end",
              gap: "8px",
              marginTop: "14px",
            }}
          >
            {hasAppliedFilters && (
              <button
                type="button"
                onClick={resetFilters}
                style={{
                  height: "38px",
                  border:
                    "1px solid #CBD5E1",
                  borderRadius: "8px",
                  background:
                    "#FFFFFF",
                  color: "#475569",
                  padding: "0 13px",
                  fontSize: "10px",
                  fontWeight: "800",
                  cursor: "pointer",
                }}
              >
                Resetează
              </button>
            )}

            <button
              type="submit"
              style={{
                height: "38px",
                border: "none",
                borderRadius: "8px",
                background: "#172554",
                color: "#FFFFFF",
                padding: "0 17px",
                fontSize: "10px",
                fontWeight: "800",
                cursor: "pointer",
                boxShadow:
                  "0 4px 10px rgba(23,37,84,0.14)",
              }}
            >
              Aplică filtrele
            </button>
          </div>
        </form>

        {/* REZULTATE */}

        <div
          style={{
            minHeight: "38px",
            background: "#FFFFFF",
            border:
              "1px solid #E2E8F0",
            borderRadius: "10px",
            padding: "0 13px",
            display: "flex",
            alignItems: "center",
            justifyContent:
              "space-between",
            gap: "10px",
            marginBottom: "12px",
          }}
        >
          <div
            style={{
              color: "#172554",
              fontSize: "10px",
              fontWeight: "800",
            }}
          >
            {loading
              ? "Se încarcă..."
              : `${filteredListings.length} ${
                  filteredListings.length ===
                  1
                    ? "anunț găsit"
                    : "anunțuri găsite"
                }`}
          </div>

          {!loading && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <div
                style={{
                  color: "#94A3B8",
                  fontSize: "9px",
                  fontWeight: "700",
                  marginRight: "2px",
                }}
              >
                {sort === "price_asc"
                  ? "Preț crescător"
                  : sort ===
                    "price_desc"
                  ? "Preț descrescător"
                  : sort ===
                    "surface_desc"
                  ? "Suprafață descrescător"
                  : "Cele mai noi"}
              </div>

              <button
                type="button"
                onClick={() =>
                  changeViewMode("list")
                }
                aria-label="Afișare listă"
                title="Listă"
                style={{
                  width: "30px",
                  height: "30px",
                  border:
                    viewMode === "list"
                      ? "1px solid #172554"
                      : "1px solid #CBD5E1",
                  borderRadius: "7px",
                  background:
                    viewMode === "list"
                      ? "#172554"
                      : "#FFFFFF",
                  color:
                    viewMode === "list"
                      ? "#FFFFFF"
                      : "#64748B",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent:
                    "center",
                  padding: 0,
                  fontFamily: "inherit",
                }}
              >
                <span
                  style={{
                    fontSize: "16px",
                    lineHeight: 1,
                    transform:
                      "translateY(-1px)",
                  }}
                >
                  ☰
                </span>
              </button>

              <button
                type="button"
                onClick={() =>
                  changeViewMode("grid")
                }
                aria-label="Afișare grilă"
                title="Grid"
                style={{
                  width: "30px",
                  height: "30px",
                  border:
                    viewMode === "grid"
                      ? "1px solid #172554"
                      : "1px solid #CBD5E1",
                  borderRadius: "7px",
                  background:
                    viewMode === "grid"
                      ? "#172554"
                      : "#FFFFFF",
                  color:
                    viewMode === "grid"
                      ? "#FFFFFF"
                      : "#64748B",
                  cursor: "pointer",
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(2, 5px)",
                  gridTemplateRows:
                    "repeat(2, 5px)",
                  gap: "2px",
                  placeContent: "center",
                  padding: 0,
                }}
              >
                <span
                  style={{
                    background:
                      "currentColor",
                    borderRadius: "1px",
                  }}
                />
                <span
                  style={{
                    background:
                      "currentColor",
                    borderRadius: "1px",
                  }}
                />
                <span
                  style={{
                    background:
                      "currentColor",
                    borderRadius: "1px",
                  }}
                />
                <span
                  style={{
                    background:
                      "currentColor",
                    borderRadius: "1px",
                  }}
                />
              </button>
            </div>
          )}
        </div>

        {loadError && (
          <div
            style={{
              background: "#FEF2F2",
              border:
                "1px solid #FECACA",
              color: "#B91C1C",
              borderRadius: "10px",
              padding: "13px",
              fontSize: "11px",
              fontWeight: "700",
            }}
          >
            {loadError}
          </div>
        )}

        {!loading &&
          !loadError &&
          filteredListings.length ===
            0 && (
            <div
              style={{
                background: "#FFFFFF",
                border:
                  "1px solid #E2E8F0",
                borderRadius: "12px",
                padding: "32px 18px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  color: "#172554",
                  fontSize: "15px",
                  fontWeight: "900",
                }}
              >
                Nu am găsit proprietăți
              </div>

              <div
                style={{
                  marginTop: "7px",
                  color: "#64748B",
                  fontSize: "11px",
                  lineHeight: "1.6",
                }}
              >
                Încearcă să modifici
                filtrele sau să revii la
                toate anunțurile din
                oraș.
              </div>
            </div>
          )}

        {!loading &&
          !loadError &&
          filteredListings.length >
            0 && (
            <div
              className={
                viewMode === "list"
                  ? "listings-list"
                  : "listings-grid"
              }
              style={{
                display: "grid",
                gridTemplateColumns:
                  viewMode === "list"
                    ? "1fr"
                    : "repeat(3, minmax(0, 1fr))",
                gap: "14px",
              }}
            >
              {filteredListings.map(
                (listing) => {
                  const images =
                    listing.images || [];

                  const imageCount =
                    images.length;

                  const currentImageIndex =
                    imageCount > 0
                      ? Math.min(
                          imageIndexes[
                            listing.id
                          ] || 0,
                          imageCount - 1
                        )
                      : 0;

                  const currentImage =
                    images[
                      currentImageIndex
                    ] || null;

                  const formattedAvailableDate =
                    formatDate(
                      listing.available_from
                    );

                  const listingUrl =
                    `/proprietate/${listing.id}`;

                  return (
                    <article
                      key={listing.id}
                      className={
                        viewMode === "list"
                          ? "listing-card listing-card-list"
                          : "listing-card"
                      }
                      style={{
                        background:
                          "#FFFFFF",
                        border:
                          "1px solid #E2E8F0",
                        borderRadius:
                          "12px",
                        overflow:
                          "hidden",
                        boxShadow:
                          "0 3px 12px rgba(15,23,42,0.05)",
                        display:
                          viewMode === "list"
                            ? "flex"
                            : "block",
                      }}
                    >
                      {/* IMAGINE */}

                      <div
                        className="listing-image-wrap"
                        style={{
                          position:
                            "relative",
                          height:
                            "220px",
                          width:
                            viewMode === "list"
                              ? "340px"
                              : "100%",
                          flexShrink: 0,
                          background:
                            "#E2E8F0",
                          overflow:
                            "hidden",
                        }}
                      >
                        {currentImage ? (
                          <a
                            href={
                              listingUrl
                            }
                            onClick={() => {
                              if (
                                typeof window !==
                                "undefined"
                              ) {
                                sessionStorage.setItem(
                                  "studenthousing-search-url",
                                  window.location.pathname +
                                    window.location.search
                                );

                                sessionStorage.setItem(
                                  "studenthousing-search-scroll",
                                  String(
                                    window.scrollY
                                  )
                                );
                              }
                            }}
                            style={{
                              display:
                                "block",
                              width:
                                "100%",
                              height:
                                "100%",
                            }}
                          >
                            <img
                              src={
                                currentImage
                              }
                              alt={
                                listing.title ||
                                "Proprietate"
                              }
                              style={{
                                width:
                                  "100%",
                                height:
                                  "100%",
                                objectFit:
                                  "cover",
                                display:
                                  "block",
                              }}
                            />
                          </a>
                        ) : (
                          <a
                            href={
                              listingUrl
                            }
                            onClick={() => {
                              if (
                                typeof window !==
                                "undefined"
                              ) {
                                sessionStorage.setItem(
                                  "studenthousing-search-url",
                                  window.location.pathname +
                                    window.location.search
                                );

                                sessionStorage.setItem(
                                  "studenthousing-search-scroll",
                                  String(
                                    window.scrollY
                                  )
                                );
                              }
                            }}
                            style={{
                              width:
                                "100%",
                              height:
                                "100%",
                              display:
                                "flex",
                              alignItems:
                                "center",
                              justifyContent:
                                "center",
                              color:
                                "#64748B",
                              textDecoration:
                                "none",
                              fontSize:
                                "11px",
                              fontWeight:
                                "700",
                            }}
                          >
                            Fără imagine
                          </a>
                        )}

                        {/* FAVORIT */}

                        <div
                          style={{
                            position:
                              "absolute",
                            top: "10px",
                            right:
                              "10px",
                            zIndex: 5,
                          }}
                        >
                          <FavoriteButton
                            listingId={
                              listing.id
                            }
                          />
                        </div>

                        {/* SĂGEȚI */}

                        {imageCount > 1 && (
                          <>
                            <button
                              type="button"
                              aria-label="Imaginea precedentă"
                              onClick={(
                                event
                              ) => {
                                event.preventDefault();
                                event.stopPropagation();

                                changeListingImage(
                                  listing.id,
                                  -1,
                                  imageCount
                                );
                              }}
                              style={{
                                position:
                                  "absolute",
                                left:
                                  "9px",
                                top:
                                  "50%",
                                transform:
                                  "translateY(-50%)",
                                width:
                                  "31px",
                                height:
                                  "31px",
                                border:
                                  "none",
                                borderRadius:
                                  "999px",
                                background:
                                  "rgba(255,255,255,0.92)",
                                color:
                                  "#172554",
                                cursor:
                                  "pointer",
                                fontSize:
                                  "18px",
                                fontWeight:
                                  "900",
                                display:
                                  "flex",
                                alignItems:
                                  "center",
                                justifyContent:
                                  "center",
                                boxShadow:
                                  "0 3px 10px rgba(15,23,42,0.16)",
                                zIndex:
                                  4,
                              }}
                            >
                              ‹
                            </button>

                            <button
                              type="button"
                              aria-label="Imaginea următoare"
                              onClick={(
                                event
                              ) => {
                                event.preventDefault();
                                event.stopPropagation();

                                changeListingImage(
                                  listing.id,
                                  1,
                                  imageCount
                                );
                              }}
                              style={{
                                position:
                                  "absolute",
                                right:
                                  "9px",
                                top:
                                  "50%",
                                transform:
                                  "translateY(-50%)",
                                width:
                                  "31px",
                                height:
                                  "31px",
                                border:
                                  "none",
                                borderRadius:
                                  "999px",
                                background:
                                  "rgba(255,255,255,0.92)",
                                color:
                                  "#172554",
                                cursor:
                                  "pointer",
                                fontSize:
                                  "18px",
                                fontWeight:
                                  "900",
                                display:
                                  "flex",
                                alignItems:
                                  "center",
                                justifyContent:
                                  "center",
                                boxShadow:
                                  "0 3px 10px rgba(15,23,42,0.16)",
                                zIndex:
                                  4,
                              }}
                            >
                              ›
                            </button>

                            <div
                              style={{
                                position:
                                  "absolute",
                                left:
                                  "50%",
                                bottom:
                                  "9px",
                                transform:
                                  "translateX(-50%)",
                                background:
                                  "rgba(15,23,42,0.72)",
                                color:
                                  "#FFFFFF",
                                borderRadius:
                                  "999px",
                                padding:
                                  "4px 8px",
                                fontSize:
                                  "9px",
                                fontWeight:
                                  "800",
                                zIndex:
                                  4,
                              }}
                            >
                              {currentImageIndex +
                                1}
                              /
                              {
                                imageCount
                              }
                            </div>
                          </>
                        )}
                      </div>

                      {/* CONȚINUT */}

                      <div
                        className="listing-card-content"
                        style={{
                          padding:
                            "13px",
                          flex: 1,
                          minWidth: 0,
                        }}
                      >
                        <div
                          style={{
                            display:
                              "flex",
                            alignItems:
                              "flex-start",
                            justifyContent:
                              "space-between",
                            gap:
                              "10px",
                          }}
                        >
                          <div
                            style={{
                              minWidth:
                                0,
                              flex: 1,
                            }}
                          >
                            <a
                              href={
                                listingUrl
                              }
                              onClick={() => {
                                if (
                                  typeof window !==
                                  "undefined"
                                ) {
                                  sessionStorage.setItem(
                                    "studenthousing-search-url",
                                    window.location.pathname +
                                      window.location.search
                                  );

                                  sessionStorage.setItem(
                                    "studenthousing-search-scroll",
                                    String(
                                      window.scrollY
                                    )
                                  );
                                }
                              }}
                              style={{
                                color:
                                  "#172554",
                                textDecoration:
                                  "none",
                              }}
                            >
                              <h2
                                style={{
                                  margin:
                                    0,
                                  fontSize:
                                    "14px",
                                  lineHeight:
                                    "1.35",
                                  fontWeight:
                                    "900",
                                  overflow:
                                    "hidden",
                                  textOverflow:
                                    "ellipsis",
                                  display:
                                    "-webkit-box",
                                  WebkitLineClamp:
                                    2,
                                  WebkitBoxOrient:
                                    "vertical",
                                }}
                              >
                                {listing.title ||
                                  "Proprietate de închiriat"}
                              </h2>
                            </a>

                            <div
                              style={{
                                marginTop:
                                  "5px",
                                color:
                                  "#64748B",
                                fontSize:
                                  "10px",
                                fontWeight:
                                  "600",
                                lineHeight:
                                  "1.45",
                              }}
                            >
                              {listing.neighborhoods
                                ?.name
                                ? `${listing.neighborhoods.name}, `
                                : ""}
                              {
                                listing.city
                              }
                            </div>
                          </div>

                          <div
                            style={{
                              flexShrink:
                                0,
                              color:
                                "#172554",
                              fontSize:
                                "17px",
                              fontWeight:
                                "900",
                              whiteSpace:
                                "nowrap",
                            }}
                          >
                            €
                            {Number(
                              listing.price_monthly ||
                                0
                            ).toLocaleString(
                              "ro-RO"
                            )}
                            <span
                              style={{
                                color:
                                  "#64748B",
                                fontSize:
                                  "9px",
                                fontWeight:
                                  "700",
                              }}
                            >
                              /lună
                            </span>
                          </div>
                        </div>

                        <div
                          style={{
                            display:
                              "flex",
                            flexWrap:
                              "wrap",
                            gap: "6px",
                            marginTop:
                              "11px",
                          }}
                        >
                          {listing.rooms !=
                            null && (
                            <span
                              style={
                                detailChipStyle
                              }
                            >
                              {
                                listing.rooms
                              }{" "}
                              {Number(
                                listing.rooms
                              ) === 1
                                ? "cameră"
                                : "camere"}
                            </span>
                          )}

                          {listing.bedrooms !=
                            null && (
                            <span
                              style={
                                detailChipStyle
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

                          {listing.surface_m2 !=
                            null && (
                            <span
                              style={
                                detailChipStyle
                              }
                            >
                              {
                                listing.surface_m2
                              }{" "}
                              m²
                            </span>
                          )}

                          {listing.furnished ===
                            true && (
                            <span
                              style={
                                detailChipStyle
                              }
                            >
                              Mobilat
                            </span>
                          )}
                        </div>

                        {formattedAvailableDate && (
                          <div
                            style={{
                              marginTop:
                                "10px",
                              color:
                                "#64748B",
                              fontSize:
                                "10px",
                              fontWeight:
                                "700",
                            }}
                          >
                            Disponibil din{" "}
                            {
                              formattedAvailableDate
                            }
                          </div>
                        )}

                        <a
                          href={
                            listingUrl
                          }
                          onClick={() => {
                            if (
                              typeof window !==
                              "undefined"
                            ) {
                              sessionStorage.setItem(
                                "studenthousing-search-url",
                                window.location.pathname +
                                  window.location.search
                              );

                              sessionStorage.setItem(
                                "studenthousing-search-scroll",
                                String(
                                  window.scrollY
                                )
                              );
                            }
                          }}
                          style={{
                            marginTop:
                              "12px",
                            height:
                              "36px",
                            borderRadius:
                              "8px",
                            background:
                              "#172554",
                            color:
                              "#FFFFFF",
                            textDecoration:
                              "none",
                            fontSize:
                              "10px",
                            fontWeight:
                              "800",
                            display:
                              "flex",
                            alignItems:
                              "center",
                            justifyContent:
                              "center",
                          }}
                        >
                          Vezi proprietatea
                        </a>
                      </div>
                    </article>
                  );
                }
              )}
            </div>
          )}
      </section>

      <style jsx global>{`
        .mobile-filter-bar {
          display: none;
        }

        @media (max-width: 900px) {
          .filter-grid {
            grid-template-columns: repeat(
              2,
              minmax(0, 1fr)
            ) !important;
          }

          .listings-grid {
            grid-template-columns: repeat(
              2,
              minmax(0, 1fr)
            ) !important;
          }
        }

        @media (max-width: 620px) {
          .desktop-filter-form {
            display: none !important;
          }

          .mobile-filter-bar {
            display: block;
            position: relative;
            z-index: 20;
            pointer-events: auto;
            margin-bottom: 12px;
          }

          .mobile-filter-chips {
            position: relative;
            z-index: 21;
            display: flex;
            align-items: center;
            gap: 7px;
            overflow-x: auto;
            padding: 1px 1px 5px;
            scrollbar-width: none;
          }

          .mobile-filter-chips::-webkit-scrollbar {
            display: none;
          }

          .mobile-filter-chip {
            flex: 0 0 auto;
            height: 32px;
            padding: 0 12px;
            border: 1px solid #CBD5E1;
            border-radius: 999px;
            background: #FFFFFF;
            color: #172554;
            font-family: inherit;
            font-size: 10px;
            font-weight: 800;
            cursor: pointer;
            white-space: nowrap;
            pointer-events: auto;
            touch-action: manipulation;
            -webkit-tap-highlight-color: transparent;
          }

          .mobile-filter-chip-active {
            border-color: #172554;
            background: #172554;
            color: #FFFFFF;
          }

          .mobile-filter-panel {
            position: relative;
            z-index: 22;
            pointer-events: auto;
            margin-top: 7px;
            padding: 13px;
            background: #FFFFFF;
            border: 1px solid #E2E8F0;
            border-radius: 12px;
            box-shadow: 0 8px 20px rgba(15, 23, 42, 0.08);
          }

          .mobile-more-panel {
            display: flex;
            flex-direction: column;
            gap: 11px;
          }

          .mobile-filter-panel-title {
            color: #172554;
            font-size: 12px;
            font-weight: 900;
            margin-bottom: 1px;
          }

          .mobile-filter-two-columns {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 8px;
          }

          .mobile-filter-field {
            width: 100%;
          }

          .mobile-filter-actions {
            display: flex;
            align-items: center;
            justify-content: flex-end;
            gap: 7px;
            margin-top: 2px;
          }

          .mobile-filter-reset,
          .mobile-filter-apply {
            height: 36px;
            padding: 0 13px;
            border-radius: 8px;
            font-family: inherit;
            font-size: 10px;
            font-weight: 800;
            cursor: pointer;
          }

          .mobile-filter-reset {
            border: 1px solid #CBD5E1;
            background: #FFFFFF;
            color: #475569;
          }

          .mobile-filter-apply {
            border: none;
            background: #172554;
            color: #FFFFFF;
            box-shadow: 0 4px 10px rgba(23, 37, 84, 0.14);
          }

          .filter-grid {
            grid-template-columns: 1fr !important;
          }

          .listings-grid {
            grid-template-columns: 1fr !important;
          }

          .listing-card-list {
            display: block !important;
          }

          .listing-card-list .listing-image-wrap {
            width: 100% !important;
            height: 220px !important;
          }

          .filter-calendar {
            width: min(
              292px,
              calc(100vw - 56px)
            ) !important;
          }
        }
      `}</style>
    </main>
  );
}

/* =========================
   STILURI
========================= */

const inputStyle = {
  width: "100%",
  height: "39px",
  boxSizing: "border-box",
  border: "1px solid #CBD5E1",
  borderRadius: "8px",
  background: "#FFFFFF",
  color: "#0F172A",
  padding: "0 10px",
  fontFamily: "inherit",
  fontSize: "11px",
  fontWeight: "600",
  outline: "none",
};

const labelStyle = {
  display: "block",
  marginBottom: "5px",
  color: "#475569",
  fontSize: "9px",
  fontWeight: "800",
};

const detailChipStyle = {
  display: "inline-flex",
  alignItems: "center",
  minHeight: "24px",
  padding: "0 8px",
  borderRadius: "999px",
  background: "#F1F5F9",
  color: "#475569",
  fontSize: "9px",
  fontWeight: "800",
};
