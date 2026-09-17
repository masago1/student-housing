"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../lib/supabase";
import FavoriteButton from "../../components/FavoriteButton";

function normalizeCity(value = "") {
  return decodeURIComponent(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-");
}

function formatFallbackCityName(city = "") {
  return decodeURIComponent(city)
    .replace(/-/g, " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}

/* AAAA-LL-ZZ -> ZZ/LL/AAAA */

function formatDate(date) {
  if (!date) return null;

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
}

/* ZZ/LL/AAAA -> AAAA-LL-ZZ */

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

/* Verifică o dată reală */

function validRomanianDate(value) {
  if (!value) return true;

  if (
    !/^(0[1-9]|[12]\d|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/.test(
      value
    )
  ) {
    return false;
  }

  const [
    day,
    month,
    year,
  ] = value.split("/").map(Number);

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

/*
  Acceptăm DOAR:
  1
  20
  200
  2000

  NU:
  0
  0200
  -200
  200.5
  200,5
  abc
*/

function validPositiveInteger(
  value,
  max
) {
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

  return Number.isFinite(number)
    ? number
    : null;
}

export default function CityListingsPage() {
  const params = useParams();

  const citySlug =
    Array.isArray(params?.city)
      ? params.city[0]
      : params?.city || "";

  const normalizedRequestedCity =
    normalizeCity(citySlug);

  const [listings, setListings] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [loadError, setLoadError] =
    useState("");

  /* FILTRE */

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

  const [propertyType, setPropertyType] =
    useState("");

  const [furnished, setFurnished] =
    useState("");

  const [listingType, setListingType] =
    useState("");

  const [availableFrom, setAvailableFrom] =
    useState("");

  const [sort, setSort] =
    useState("newest");

  /*
    Încărcăm filtrele existente din URL.
  */

  useEffect(() => {
    if (!window.location.search) {
      setLoading(false);
      return;
    }

    const searchParams =
      new URLSearchParams(
        window.location.search
      );

    setMinPrice(
      searchParams.get("minPrice") || ""
    );

    setMaxPrice(
      searchParams.get("maxPrice") || ""
    );

    setRooms(
      searchParams.get("rooms") || ""
    );

    setBedrooms(
      searchParams.get("bedrooms") || ""
    );

    setBathrooms(
      searchParams.get("bathrooms") || ""
    );

    setMinSurface(
      searchParams.get("minSurface") || ""
    );

    setMaxSurface(
      searchParams.get("maxSurface") || ""
    );

    setPropertyType(
      searchParams.get("propertyType") || ""
    );

    setFurnished(
      searchParams.get("furnished") || ""
    );

    setListingType(
      searchParams.get("listingType") || ""
    );

    const isoDate =
      searchParams.get("availableFrom") || "";

    if (isoDate) {
      setAvailableFrom(
        isoDate
          .split("-")
          .reverse()
          .join("/")
      );
    }

    setSort(
      searchParams.get("sort") ||
        "newest"
    );
  }, []);

  /*
    LUĂM DOAR ANUNȚURILE ACTIVE.
  */

  useEffect(() => {
    let cancelled = false;

    async function loadListings() {
      setLoading(true);
      setLoadError("");

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
        .order("created_at", {
          ascending: false,
        });

      if (cancelled) return;

      if (error) {
        console.error(
          "Eroare la încărcarea chiriilor:",
          error
        );

        setLoadError(
          "Nu am putut încărca anunțurile."
        );

        setListings([]);
      } else {
        setListings(data || []);
      }

      setLoading(false);
    }

    loadListings();

    return () => {
      cancelled = true;
    };
  }, []);

  /*
    ORAȘUL
  */

  const cityListings =
    useMemo(() => {
      return listings.filter(
        (listing) =>
          normalizeCity(
            listing.city
          ) === normalizedRequestedCity
      );
    }, [
      listings,
      normalizedRequestedCity,
    ]);

  const cityName =
    cityListings.length > 0
      ? cityListings[0].city
      : formatFallbackCityName(
          citySlug
        );

  /*
    VALIDĂRI
  */

  const validationErrors =
    useMemo(() => {
      const errors = [];

      if (
        minPrice &&
        !validPositiveInteger(
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
        !validPositiveInteger(
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
        !validPositiveInteger(
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
        !validPositiveInteger(
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
        !validRomanianDate(
          availableFrom
        )
      ) {
        errors.push(
          "Data disponibilității trebuie introdusă în formatul ZZ/LL/AAAA."
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
    }, [
      minPrice,
      maxPrice,
      minSurface,
      maxSurface,
      availableFrom,
    ]);

  /*
    REZULTATE FILTRATE
  */

  const filteredListings =
    useMemo(() => {
      if (
        validationErrors.length > 0
      ) {
        return cityListings;
      }

      let result = [
        ...cityListings,
      ];

      const minimumPrice =
        numberValue(minPrice);

      const maximumPrice =
        numberValue(maxPrice);

      const minimumSurface =
        numberValue(minSurface);

      const maximumSurface =
        numberValue(maxSurface);

      /*
        PREȚ
      */

      if (minimumPrice !== null) {
        result = result.filter(
          (listing) =>
            Number(
              listing.price_monthly
            ) >= minimumPrice
        );
      }

      if (maximumPrice !== null) {
        result = result.filter(
          (listing) =>
            Number(
              listing.price_monthly
            ) <= maximumPrice
        );
      }

      /*
        CAMERE
      */

      if (rooms) {
        const selectedRooms =
          Number(rooms);

        if (selectedRooms === 5) {
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

      /*
        DORMITOARE
      */

      if (bedrooms) {
        const selectedBedrooms =
          Number(bedrooms);

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
              ) === selectedBedrooms
          );
        }
      }

      /*
        BĂI
      */

      if (bathrooms) {
        const selectedBathrooms =
          Number(bathrooms);

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
              ) === selectedBathrooms
          );
        }
      }

      /*
        SUPRAFAȚĂ
      */

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

      /*
        TIP PROPRIETATE
      */

      if (propertyType) {
        result = result.filter(
          (listing) =>
            listing.property_type ===
            propertyType
        );
      }

      /*
        MOBILAT
      */

      if (furnished === "yes") {
        result = result.filter(
          (listing) =>
            listing.furnished === true
        );
      }

      if (furnished === "no") {
        result = result.filter(
          (listing) =>
            listing.furnished === false
        );
      }

      /*
        TIP ANUNȚ
      */

      if (listingType) {
        result = result.filter(
          (listing) =>
            listing.listing_type ===
            listingType
        );
      }

      /*
        DISPONIBIL DE LA
      */

      if (availableFrom) {
        const isoDate =
          romanianDateToISO(
            availableFrom
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

      /*
        SORTARE
      */

      if (
        sort === "price_asc"
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
        sort === "price_desc"
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
        sort === "surface_desc"
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
        sort === "newest"
      ) {
        result.sort(
          (a, b) =>
            new Date(
              b.created_at
            ) -
            new Date(
              a.created_at
            )
        );
      }

      return result;
    }, [
      cityListings,
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
      validationErrors,
    ]);

  /*
    INPUT NUMERIC

    Aici eliminăm IMEDIAT:
    . , - litere spații

    și nu permitem 0 la început.
  */

  function handleIntegerChange(
    value,
    setter
  ) {
    let cleaned =
      String(value).replace(
        /\D/g,
        ""
      );

    cleaned =
      cleaned.replace(
        /^0+/,
        ""
      );

    setter(cleaned);
  }

  /*
    DATA

    Permitem doar cifre și /
  */

  function handleDateChange(value) {
    let cleaned =
      String(value).replace(
        /[^0-9/]/g,
        ""
      );

    /*
      Nu permitem mai mult de 8 cifre
      plus cele două /
    */

    const digits =
      cleaned.replace(
        /\D/g,
        ""
      );

    if (digits.length > 8) {
      return;
    }

    /*
      Construim automat:
      ZZ/LL/AAAA
    */

    let formatted = "";

    if (digits.length <= 2) {
      formatted = digits;
    } else if (
      digits.length <= 4
    ) {
      formatted =
        digits.slice(0, 2) +
        "/" +
        digits.slice(2);
    } else {
      formatted =
        digits.slice(0, 2) +
        "/" +
        digits.slice(2, 4) +
        "/" +
        digits.slice(4, 8);
    }

    setAvailableFrom(
      formatted
    );
  }

  /*
    SUBMIT

    Păstrăm filtrele în URL.
  */

  function handleSubmit(event) {
    event.preventDefault();

    const params =
      new URLSearchParams();

    if (minPrice)
      params.set(
        "minPrice",
        minPrice
      );

    if (maxPrice)
      params.set(
        "maxPrice",
        maxPrice
      );

    if (rooms)
      params.set(
        "rooms",
        rooms
      );

    if (bedrooms)
      params.set(
        "bedrooms",
        bedrooms
      );

    if (bathrooms)
      params.set(
        "bathrooms",
        bathrooms
      );

    if (minSurface)
      params.set(
        "minSurface",
        minSurface
      );

    if (maxSurface)
      params.set(
        "maxSurface",
        maxSurface
      );

    if (propertyType)
      params.set(
        "propertyType",
        propertyType
      );

    if (furnished)
      params.set(
        "furnished",
        furnished
      );

    if (listingType)
      params.set(
        "listingType",
        listingType
      );

    if (availableFrom) {
      const isoDate =
        romanianDateToISO(
          availableFrom
        );

      if (isoDate) {
        params.set(
          "availableFrom",
          isoDate
        );
      }
    }

    if (sort)
      params.set(
        "sort",
        sort
      );

    const query =
      params.toString();

    const url =
      `/chirii/${citySlug}` +
      (query
        ? `?${query}`
        : "");

    window.history.pushState(
      {},
      "",
      url
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  /*
    RESET
  */

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

  const hasFilters =
    Boolean(
      minPrice ||
        maxPrice ||
        rooms ||
        bedrooms ||
        bathrooms ||
        minSurface ||
        maxSurface ||
        propertyType ||
        furnished ||
        listingType ||
        availableFrom
    );

  /*
    URL DE REVENIRE
  */

  function getPropertyUrl(id) {
    const currentUrl =
      window.location.pathname +
      window.location.search;

    return (
      `/proprietate/${id}` +
      `?from=${encodeURIComponent(
        currentUrl
      )}`
    );
  }

  return (
    <main
      style={{
        minHeight:
          "100vh",
        background:
          "#F4F7FB",
        color:
          "#0F172A",
      }}
    >
      {/* HEADER */}

      <header
        style={{
          height:
            "72px",
          background:
            "#FFFFFF",
          borderBottom:
            "1px solid #E2E8F0",
          display:
            "flex",
          alignItems:
            "center",
          justifyContent:
            "space-between",
          padding:
            "0 6%",
          boxSizing:
            "border-box",
        }}
      >
        <a
          href="/"
          style={{
            textDecoration:
              "none",
            fontSize:
              "25px",
            fontWeight:
              "800",
            letterSpacing:
              "-1px",
          }}
        >
          <span
            style={{
              color:
                "#172554",
            }}
          >
            Student
          </span>

          <span
            style={{
              color:
                "#3B82F6",
            }}
          >
            Housing
          </span>
        </a>

        <a
          href="/"
          style={{
            color:
              "#64748B",
            textDecoration:
              "none",
            fontSize:
              "13px",
            fontWeight:
              "700",
          }}
        >
          Înapoi la căutare
        </a>
      </header>

      {/* CONȚINUT */}

      <section
        style={{
          maxWidth:
            "1080px",
          margin:
            "0 auto",
          padding:
            "42px 22px 80px",
          boxSizing:
            "border-box",
        }}
      >
        {/* TITLU */}

        <div
          style={{
            marginBottom:
              "25px",
          }}
        >
          <div
            style={{
              display:
                "inline-flex",
              alignItems:
                "center",
              background:
                "#EFF6FF",
              color:
                "#3B82F6",
              borderRadius:
                "100px",
              padding:
                "6px 11px",
              fontSize:
                "11px",
              fontWeight:
                "800",
              marginBottom:
                "12px",
            }}
          >
            Chirii pentru studenți
          </div>

          <h1
            style={{
              margin: 0,
              color:
                "#172554",
              fontSize:
                "32px",
              lineHeight:
                "1.15",
              letterSpacing:
                "-1.1px",
              fontWeight:
                "800",
            }}
          >
            Chirii în{" "}
            {cityName}
          </h1>

          <p
            style={{
              margin:
                "9px 0 0",
              color:
                "#64748B",
              fontSize:
                "14px",
              lineHeight:
                "1.6",
            }}
          >
            Descoperă locuințele
            disponibile pentru
            închiriere în{" "}
            {cityName}, indiferent
            de universitatea la care
            studiezi.
          </p>
        </div>

        {/* FILTRE */}

        <form
          onSubmit={
            handleSubmit
          }
          style={{
            background:
              "#FFFFFF",
            border:
              "1px solid #E2E8F0",
            borderRadius:
              "16px",
            padding:
              "20px",
            marginBottom:
              "15px",
            boxShadow:
              "0 5px 18px rgba(15, 23, 42, 0.04)",
          }}
        >
          <div
            style={{
              display:
                "flex",
              alignItems:
                "center",
              justifyContent:
                "space-between",
              gap:
                "15px",
              marginBottom:
                "17px",
            }}
          >
            <div>
              <div
                style={{
                  color:
                    "#172554",
                  fontSize:
                    "16px",
                  fontWeight:
                    "800",
                }}
              >
                Filtre
              </div>

              <div
                style={{
                  color:
                    "#94A3B8",
                  fontSize:
                    "11px",
                  marginTop:
                    "3px",
                }}
              >
                Găsește proprietatea
                potrivită
              </div>
            </div>

            {hasFilters && (
              <button
                type="button"
                onClick={
                  resetFilters
                }
                style={{
                  border:
                    "none",
                  background:
                    "transparent",
                  color:
                    "#64748B",
                  fontFamily:
                    "inherit",
                  fontSize:
                    "11px",
                  fontWeight:
                    "700",
                  cursor:
                    "pointer",
                }}
              >
                Resetează filtrele
              </button>
            )}
          </div>

          {/* RÂND 1 */}

          <div
            className="filters-grid"
            style={{
              display:
                "grid",
              gridTemplateColumns:
                "repeat(4, minmax(0, 1fr))",
              gap:
                "10px",
            }}
          >
            <div>
              <label
                style={
                  labelStyle
                }
              >
                Preț minim
              </label>

              <input
                type="text"
                inputMode="numeric"
                pattern="[1-9][0-9]*"
                placeholder="De la €"
                value={
                  minPrice
                }
                onChange={(event) =>
                  handleIntegerChange(
                    event.target.value,
                    setMinPrice
                  )
                }
                style={
                  inputStyle
                }
              />
            </div>

            <div>
              <label
                style={
                  labelStyle
                }
              >
                Preț maxim
              </label>

              <input
                type="text"
                inputMode="numeric"
                pattern="[1-9][0-9]*"
                placeholder="Până la €"
                value={
                  maxPrice
                }
                onChange={(event) =>
                  handleIntegerChange(
                    event.target.value,
                    setMaxPrice
                  )
                }
                style={
                  inputStyle
                }
              />
            </div>

            <div>
              <label
                style={
                  labelStyle
                }
              >
                Camere
              </label>

              <select
                value={
                  rooms
                }
                onChange={(event) =>
                  setRooms(
                    event.target.value
                  )
                }
                style={
                  inputStyle
                }
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
                style={
                  labelStyle
                }
              >
                Tip proprietate
              </label>

              <select
                value={
                  propertyType
                }
                onChange={(event) =>
                  setPropertyType(
                    event.target.value
                  )
                }
                style={
                  inputStyle
                }
              >
                <option value="">
                  Oricare
                </option>

                <option value="Apartament">
                  Apartament
                </option>

                <option value="Garsonieră">
                  Garsonieră
                </option>

                <option value="Casă">
                  Casă
                </option>

                <option value="Cameră">
                  Cameră
                </option>
              </select>
            </div>
          </div>

          {/* RÂND 2 */}

          <div
            className="filters-grid"
            style={{
              display:
                "grid",
              gridTemplateColumns:
                "repeat(4, minmax(0, 1fr))",
              gap:
                "10px",
              marginTop:
                "10px",
            }}
          >
            <div>
              <label
                style={
                  labelStyle
                }
              >
                Dormitoare
              </label>

              <select
                value={
                  bedrooms
                }
                onChange={(event) =>
                  setBedrooms(
                    event.target.value
                  )
                }
                style={
                  inputStyle
                }
              >
                <option value="">
                  Oricare
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
              <label
                style={
                  labelStyle
                }
              >
                Băi
              </label>

              <select
                value={
                  bathrooms
                }
                onChange={(event) =>
                  setBathrooms(
                    event.target.value
                  )
                }
                style={
                  inputStyle
                }
              >
                <option value="">
                  Oricare
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
              <label
                style={
                  labelStyle
                }
              >
                Suprafață minimă
              </label>

              <input
                type="text"
                inputMode="numeric"
                pattern="[1-9][0-9]*"
                placeholder="De la m²"
                value={
                  minSurface
                }
                onChange={(event) =>
                  handleIntegerChange(
                    event.target.value,
                    setMinSurface
                  )
                }
                style={
                  inputStyle
                }
              />
            </div>

            <div>
              <label
                style={
                  labelStyle
                }
              >
                Suprafață maximă
              </label>

              <input
                type="text"
                inputMode="numeric"
                pattern="[1-9][0-9]*"
                placeholder="Până la m²"
                value={
                  maxSurface
                }
                onChange={(event) =>
                  handleIntegerChange(
                    event.target.value,
                    setMaxSurface
                  )
                }
                style={
                  inputStyle
                }
              />
            </div>
          </div>

          {/* RÂND 3 */}

          <div
            className="filters-grid"
            style={{
              display:
                "grid",
              gridTemplateColumns:
                "repeat(4, minmax(0, 1fr))",
              gap:
                "10px",
              marginTop:
                "10px",
            }}
          >
            <div>
              <label
                style={
                  labelStyle
                }
              >
                Mobilat
              </label>

              <select
                value={
                  furnished
                }
                onChange={(event) =>
                  setFurnished(
                    event.target.value
                  )
                }
                style={
                  inputStyle
                }
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
                style={
                  labelStyle
                }
              >
                Tip anunț
              </label>

              <select
                value={
                  listingType
                }
                onChange={(event) =>
                  setListingType(
                    event.target.value
                  )
                }
                style={
                  inputStyle
                }
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

            <div>
              <label
                style={
                  labelStyle
                }
              >
                Disponibil de la
              </label>

              <input
                type="text"
                inputMode="numeric"
                placeholder="ZZ/LL/AAAA"
                value={
                  availableFrom
                }
                onChange={(event) =>
                  handleDateChange(
                    event.target.value
                  )
                }
                maxLength={10}
                style={
                  inputStyle
                }
              />
            </div>

            <div>
              <label
                style={
                  labelStyle
                }
              >
                Sortare
              </label>

              <select
                value={
                  sort
                }
                onChange={(event) =>
                  setSort(
                    event.target.value
                  )
                }
                style={
                  inputStyle
                }
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

          {/* BUTON */}

          <div
            style={{
              display:
                "flex",
              justifyContent:
                "flex-end",
              marginTop:
                "15px",
            }}
          >
            <button
              type="submit"
              style={{
                border:
                  "none",
                borderRadius:
                  "10px",
                background:
                  "#172554",
                color:
                  "#FFFFFF",
                padding:
                  "12px 23px",
                fontFamily:
                  "inherit",
                fontSize:
                  "13px",
                fontWeight:
                  "800",
                cursor:
                  "pointer",
              }}
            >
              Aplică filtrele
            </button>
          </div>
        </form>

        {/* ERORI */}

        {validationErrors.length >
          0 && (
          <div
            style={{
              background:
                "#FEF2F2",
              border:
                "1px solid #FECACA",
              color:
                "#B91C1C",
              borderRadius:
                "10px",
              padding:
                "12px 14px",
              marginBottom:
                "14px",
              fontSize:
                "12px",
              fontWeight:
                "700",
              lineHeight:
                "1.6",
            }}
          >
            {validationErrors.map(
              (
                error,
                index
              ) => (
                <div
                  key={
                    index
                  }
                >
                  {error}
                </div>
              )
            )}
          </div>
        )}

        {/* REZULTATE */}

        <div
          style={{
            background:
              "#FFFFFF",
            border:
              "1px solid #E2E8F0",
            borderRadius:
              "12px",
            padding:
              "12px 16px",
            marginBottom:
              "14px",
            display:
              "flex",
            alignItems:
              "center",
            justifyContent:
              "space-between",
            gap:
              "15px",
          }}
        >
          <div
            style={{
              color:
                "#0F172A",
              fontSize:
                "13px",
              fontWeight:
                "700",
            }}
          >
            {loading
              ? "Se încarcă..."
              : filteredListings.length ===
                1
              ? "1 anunț găsit"
              : `${filteredListings.length} anunțuri găsite`}
          </div>

          <div
            style={{
              color:
                "#94A3B8",
              fontSize:
                "11px",
              fontWeight:
                "600",
            }}
          >
            {hasFilters
              ? "Filtre aplicate"
              : "Cele mai noi"}
          </div>
        </div>

        {/* EROARE ÎNCĂRCARE */}

        {loadError && (
          <div
            style={{
              background:
                "#FEF2F2",
              border:
                "1px solid #FECACA",
              color:
                "#B91C1C",
              borderRadius:
                "12px",
              padding:
                "16px",
              marginBottom:
                "14px",
              fontSize:
                "13px",
              fontWeight:
                "700",
            }}
          >
            {loadError}
          </div>
        )}

        {/* FĂRĂ REZULTATE */}

        {!loading &&
          !loadError &&
          filteredListings.length ===
            0 &&
          validationErrors.length ===
            0 && (
            <div
              style={{
                background:
                  "#FFFFFF",
                border:
                  "1px solid #E2E8F0",
                borderRadius:
                  "14px",
                padding:
                  "50px 25px",
                textAlign:
                  "center",
              }}
            >
              <div
                style={{
                  color:
                    "#172554",
                  fontSize:
                    "19px",
                  fontWeight:
                    "800",
                }}
              >
                {hasFilters
                  ? "Nu există anunțuri care corespund filtrelor"
                  : `Momentan nu există chirii în ${cityName}`}
              </div>

              <p
                style={{
                  color:
                    "#64748B",
                  fontSize:
                    "13px",
                  margin:
                    "8px 0 0",
                  lineHeight:
                    "1.6",
                }}
              >
                {hasFilters
                  ? "Încearcă să modifici sau să elimini câteva filtre."
                  : "Încearcă din nou mai târziu sau caută într-un alt oraș."}
              </p>

              {hasFilters && (
                <button
                  type="button"
                  onClick={
                    resetFilters
                  }
                  style={{
                    border:
                      "none",
                    background:
                      "transparent",
                    color:
                      "#2563EB",
                    marginTop:
                      "16px",
                    fontFamily:
                      "inherit",
                    fontSize:
                      "12px",
                    fontWeight:
                      "800",
                    cursor:
                      "pointer",
                  }}
                >
                  Resetează filtrele
                </button>
              )}
            </div>
          )}

        {/* LISTA ANUNȚURI */}

        {!loading &&
          validationErrors.length ===
            0 &&
          filteredListings.length >
            0 && (
            <div
              style={{
                display:
                  "flex",
                flexDirection:
                  "column",
                gap:
                  "11px",
              }}
            >
              {filteredListings.map(
                (listing) => {
                  const availableDate =
                    formatDate(
                      listing.available_from
                    );

                  const createdDate =
                    formatDate(
                      listing.created_at
                    );

                  return (
                    <div
                      key={
                        listing.id
                      }
                      className="listing-card"
                      style={{
                        background:
                          "#FFFFFF",
                        border:
                          "1px solid #E2E8F0",
                        borderRadius:
                          "14px",
                        overflow:
                          "hidden",
                        color:
                          "inherit",
                        display:
                          "flex",
                        minHeight:
                          "168px",
                        position:
                          "relative",
                        transition:
                          "box-shadow 0.2s ease, border-color 0.2s ease, transform 0.2s ease",
                      }}
                    >
                      {/* FOTOGRAFIE */}

                      <div
                        className="listing-image"
                        style={{
                          width:
                            "235px",
                          minWidth:
                            "235px",
                          height:
                            "168px",
                          background:
                            "#EFF6FF",
                          overflow:
                            "hidden",
                          position:
                            "relative",
                        }}
                      >
                        {listing.image_url ? (
                          <img
                            src={
                              listing.image_url
                            }
                            alt={
                              listing.title
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
                        ) : (
                          <div
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
                                "#94A3B8",
                              fontSize:
                                "12px",
                              fontWeight:
                                "700",
                            }}
                          >
                            Fără
                            fotografie
                          </div>
                        )}

                        <FavoriteButton
                          listingId={
                            listing.id
                          }
                        />
                      </div>

                      {/* LINK ANUNȚ */}

                      <a
                        href={getPropertyUrl(
                          listing.id
                        )}
                        className="listing-main-link"
                        style={{
                          flex:
                            "1",
                          minWidth:
                            "0",
                          display:
                            "flex",
                          textDecoration:
                            "none",
                          color:
                            "inherit",
                        }}
                      >
                        <div
                          className="listing-content"
                          style={{
                            flex:
                              "1",
                            minWidth:
                              "0",
                            padding:
                              "17px 19px",
                            display:
                              "flex",
                            flexDirection:
                              "column",
                            justifyContent:
                              "space-between",
                          }}
                        >
                          <div>
                            <h2
                              style={{
                                margin:
                                  "0",
                                color:
                                  "#172554",
                                fontSize:
                                  "17px",
                                lineHeight:
                                  "1.35",
                                fontWeight:
                                  "800",
                                overflow:
                                  "hidden",
                                textOverflow:
                                  "ellipsis",
                                whiteSpace:
                                  "nowrap",
                              }}
                            >
                              {
                                listing.title
                              }
                            </h2>

                            <div
                              style={{
                                color:
                                  "#64748B",
                                fontSize:
                                  "12px",
                                lineHeight:
                                  "1.5",
                                marginTop:
                                  "6px",
                                overflow:
                                  "hidden",
                                textOverflow:
                                  "ellipsis",
                                whiteSpace:
                                  "nowrap",
                              }}
                            >
                              {
                                listing.city
                              }

                              {listing.address
                                ? ` · ${listing.address}`
                                : ""}
                            </div>

                            {/* DETALII */}

                            <div
                              style={{
                                display:
                                  "flex",
                                alignItems:
                                  "center",
                                flexWrap:
                                  "wrap",
                                gap:
                                  "7px",
                                marginTop:
                                  "13px",
                              }}
                            >
                              {Number(
                                listing.rooms
                              ) >
                                0 && (
                                <span
                                  style={
                                    detailBadge
                                  }
                                >
                                  {
                                    listing.rooms
                                  }{" "}
                                  {Number(
                                    listing.rooms
                                  ) ===
                                  1
                                    ? "cameră"
                                    : "camere"}
                                </span>
                              )}

                              {Number(
                                listing.surface_m2
                              ) >
                                0 && (
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

                              {Number(
                                listing.bathrooms
                              ) >
                                0 && (
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
                                  ) ===
                                  1
                                    ? "baie"
                                    : "băi"}
                                </span>
                              )}

                              {Number(
                                listing.bedrooms
                              ) >
                                0 && (
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
                                  ) ===
                                  1
                                    ? "dormitor"
                                    : "dormitoare"}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* DATE */}

                          <div
                            style={{
                              display:
                                "flex",
                              alignItems:
                                "center",
                              flexWrap:
                                "wrap",
                              gap:
                                "15px",
                              marginTop:
                                "13px",
                            }}
                          >
                            {availableDate && (
                              <span
                                style={{
                                  color:
                                    "#64748B",
                                  fontSize:
                                    "11px",
                                  fontWeight:
                                    "600",
                                }}
                              >
                                Disponibil
                                din{" "}
                                {
                                  availableDate
                                }
                              </span>
                            )}

                            {createdDate && (
                              <span
                                style={{
                                  color:
                                    "#94A3B8",
                                  fontSize:
                                    "11px",
                                  fontWeight:
                                    "600",
                                }}
                              >
                                Publicat
                                la{" "}
                                {
                                  createdDate
                                }
                              </span>
                            )}
                          </div>
                        </div>

                        {/* PREȚ */}

                        <div
                          className="listing-price"
                          style={{
                            width:
                              "155px",
                            minWidth:
                              "155px",
                            padding:
                              "18px 18px 16px 5px",
                            display:
                              "flex",
                            flexDirection:
                              "column",
                            alignItems:
                              "flex-end",
                            justifyContent:
                              "space-between",
                            boxSizing:
                              "border-box",
                          }}
                        >
                          <div
                            style={{
                              textAlign:
                                "right",
                            }}
                          >
                            <div
                              style={{
                                color:
                                  "#172554",
                                fontSize:
                                  "21px",
                                lineHeight:
                                  "1",
                                fontWeight:
                                  "900",
                                letterSpacing:
                                  "-0.5px",
                                whiteSpace:
                                  "nowrap",
                              }}
                            >
                              {Number(
                                listing.price_monthly
                              ).toLocaleString(
                                "ro-RO"
                              )}
                              €
                            </div>

                            <div
                              style={{
                                color:
                                  "#94A3B8",
                                fontSize:
                                  "10px",
                                fontWeight:
                                  "600",
                                marginTop:
                                  "5px",
                              }}
                            >
                              pe lună
                            </div>
                          </div>

                          <span
                            style={{
                              color:
                                "#3B82F6",
                              fontSize:
                                "11px",
                              fontWeight:
                                "800",
                              whiteSpace:
                                "nowrap",
                            }}
                          >
                            Vezi anunțul →
                          </span>
                        </div>
                      </a>
                    </div>
                  );
                }
              )}
            </div>
          )}
      </section>

      <style>{`
        .listing-card:hover {
          border-color: #BFDBFE !important;
          box-shadow: 0 8px 25px rgba(15, 23, 42, 0.08);
          transform: translateY(-1px);
        }

        input::placeholder {
          color: #94A3B8;
        }

        input:focus,
        select:focus {
          border-color: #93C5FD !important;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.08);
        }

        @media (max-width: 850px) {
          .filters-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
        }

        @media (max-width: 760px) {
          .listing-card {
            flex-direction: column !important;
          }

          .listing-image {
            width: 100% !important;
            min-width: 100% !important;
            height: 210px !important;
          }

          .listing-main-link {
            width: 100% !important;
            flex-direction: column !important;
          }

          .listing-content {
            padding: 16px !important;
          }

          .listing-price {
            width: 100% !important;
            min-width: 100% !important;
            padding: 0 16px 16px !important;
            flex-direction: row !important;
            align-items: flex-end !important;
          }
        }

        @media (max-width: 520px) {
          .filters-grid {
            grid-template-columns: 1fr !important;
          }

          .listing-image {
            height: 190px !important;
          }

          .listing-price {
            align-items: center !important;
          }
        }
      `}</style>
    </main>
  );
}

const labelStyle = {
  display:
    "block",
  color:
    "#475569",
  fontSize:
    "10px",
  fontWeight:
    "800",
  marginBottom:
    "5px",
};

const inputStyle = {
  width:
    "100%",
  height:
    "42px",
  border:
    "1px solid #CBD5E1",
  borderRadius:
    "9px",
  background:
    "#FFFFFF",
  color:
    "#172554",
  padding:
    "0 11px",
  boxSizing:
    "border-box",
  fontFamily:
    "inherit",
  fontSize:
    "12px",
  outline:
    "none",
};

const detailBadge = {
  background:
    "#F8FAFC",
  border:
    "1px solid #E2E8F0",
  color:
    "#475569",
  borderRadius:
    "7px",
  padding:
    "5px 8px",
  fontSize:
    "10px",
  fontWeight:
    "700",
};
