"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import FavoriteButton from "../../../components/FavoriteButton";

export const dynamic = "force-dynamic";

/* =========================
   NORMALIZARE
========================= */

function normalizeValue(value = "") {
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
    /*
      Pentru valorile de tip YYYY-MM-DD
      construim data local, ca să evităm
      mutarea cu o zi din cauza UTC.
    */

    const raw = String(date);

    if (
      /^\d{4}-\d{2}-\d{2}$/.test(raw)
    ) {
      const [year, month, day] =
        raw.split("-").map(Number);

      const parsed = new Date(
        year,
        month - 1,
        day
      );

      if (
        Number.isNaN(parsed.getTime())
      ) {
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

    if (
      Number.isNaN(parsed.getTime())
    ) {
      return null;
    }

    const day = String(
      parsed.getDate()
    ).padStart(2, "0");

    const month = String(
      parsed.getMonth() + 1
    ).padStart(2, "0");

    const year =
      parsed.getFullYear();

    return `${day}/${month}/${year}`;
  } catch {
    return null;
  }
}

function romanianDateToISO(value) {
  if (!value) return "";

  const parts =
    value.split("/");

  if (parts.length !== 3) {
    return "";
  }

  const day = parts[0];
  const month = parts[1];
  const year = parts[2];

  return `${year}-${month}-${day}`;
}

/* =========================
   VALIDARE NUMERE
========================= */

function isValidInteger(
  value,
  max
) {
  if (!value) return true;

  if (
    !/^[1-9]\d*$/.test(value)
  ) {
    return false;
  }

  const number =
    Number(value);

  return (
    Number.isInteger(number) &&
    number > 0 &&
    number <= max
  );
}

function numberValue(value) {
  if (!value) return null;

  const number =
    Number(value);

  if (
    !Number.isFinite(number)
  ) {
    return null;
  }

  return number;
}

/* =========================
   VALIDARE DATĂ
========================= */

function isValidRomanianDate(
  value
) {
  if (!value) return true;

  if (
    !/^(0[1-9]|[12]\d|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/.test(
      value
    )
  ) {
    return false;
  }

  const [day, month, year] =
    value
      .split("/")
      .map(Number);

  const date = new Date(
    year,
    month - 1,
    day
  );

  return (
    date.getFullYear() === year &&
    date.getMonth() ===
      month - 1 &&
    date.getDate() === day
  );
}

/* =========================
   PAGINA
========================= */

export default function UniversityListingsPage() {
  const params = useParams();

  const citySlug =
    Array.isArray(params?.city)
      ? params.city[0]
      : params?.city || "";

  const universitySlug =
    Array.isArray(params?.university)
      ? params.university[0]
      : params?.university || "";

  const normalizedRequestedCity =
    normalizeValue(citySlug);

  const normalizedRequestedUniversity =
    normalizeValue(universitySlug);

  /* =========================
     DATE PAGINĂ
  ========================= */

  const [listings, setListings] =
    useState([]);

  const [university, setUniversity] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [loadError, setLoadError] =
    useState("");

  /* =========================
     FILTRE EDITATE

     Exact ca pe city/page.js:
     acestea NU filtrează lista.
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
     FILTRE APLICATE

     Lista folosește DOAR
     valorile de aici.

     Acestea se modifică numai
     când apăsăm Aplică filtrele.
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
     ERORI FILTRE
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
     ÎNCĂRCARE DIN URL

     Dacă utilizatorul revine
     pe o pagină care are deja
     filtre în query string,
     le reconstruim.
  ========================= */

  useEffect(() => {
    if (
      typeof window ===
      "undefined"
    ) {
      return;
    }

    const searchParams =
      new URLSearchParams(
        window.location.search
      );

    const urlMinPrice =
      searchParams.get(
        "minPrice"
      ) || "";

    const urlMaxPrice =
      searchParams.get(
        "maxPrice"
      ) || "";

    const urlRooms =
      searchParams.get(
        "rooms"
      ) || "";

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
      searchParams.get(
        "sort"
      ) || "newest";

    const urlAvailableFrom =
      searchParams.get(
        "availableFrom"
      ) || "";

    let formattedAvailableFrom =
      "";

    if (
      /^\d{4}-\d{2}-\d{2}$/.test(
        urlAvailableFrom
      )
    ) {
      const [
        year,
        month,
        day,
      ] =
        urlAvailableFrom.split(
          "-"
        );

      formattedAvailableFrom =
        `${day}/${month}/${year}`;
    }

    setMinPrice(
      urlMinPrice
    );

    setMaxPrice(
      urlMaxPrice
    );

    setRooms(
      urlRooms
    );

    setBedrooms(
      urlBedrooms
    );

    setBathrooms(
      urlBathrooms
    );

    setMinSurface(
      urlMinSurface
    );

    setMaxSurface(
      urlMaxSurface
    );

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

    setSort(
      urlSort
    );

    setAppliedFilters({
      minPrice:
        urlMinPrice,

      maxPrice:
        urlMaxPrice,

      rooms:
        urlRooms,

      bedrooms:
        urlBedrooms,

      bathrooms:
        urlBathrooms,

      minSurface:
        urlMinSurface,

      maxSurface:
        urlMaxSurface,

      propertyType:
        urlPropertyType,

      furnished:
        urlFurnished,

      listingType:
        urlListingType,

      availableFrom:
        formattedAvailableFrom,

      sort:
        urlSort,
    });
  }, [
    citySlug,
    universitySlug,
  ]);

  /* =========================
     ÎNCĂRCARE UNIVERSITATE
     + ANUNȚURILE EI
  ========================= */

  useEffect(() => {
    let cancelled = false;

    async function loadPage() {
      setLoading(true);
      setLoadError("");

      try {
        /*
          1. Încărcăm universitățile.

          Nu presupunem că în DB
          există obligatoriu coloană
          "slug".

          Ruta poate fi:
          /chirii/timisoara/umft

          și o potrivim cu:
          short_name = UMFT
          sau name.
        */

        const {
          data: universitiesData,
          error: universitiesError,
        } = await supabase
          .from("universities")
          .select(
            "id, name, short_name, city"
          );

        if (
          universitiesError
        ) {
          throw universitiesError;
        }

        if (cancelled) {
          return;
        }

        const matchingUniversity =
          (
            universitiesData || []
          ).find(
            (item) => {
              const sameCity =
                normalizeValue(
                  item.city
                ) ===
                normalizedRequestedCity;

              const shortNameMatches =
                normalizeValue(
                  item.short_name
                ) ===
                normalizedRequestedUniversity;

              const nameMatches =
                normalizeValue(
                  item.name
                ) ===
                normalizedRequestedUniversity;

              return (
                sameCity &&
                (
                  shortNameMatches ||
                  nameMatches
                )
              );
            }
          );

        if (
          !matchingUniversity
        ) {
          setUniversity(null);
          setListings([]);
          setLoadError(
            "Universitatea selectată nu a fost găsită."
          );
          setLoading(false);
          return;
        }

        setUniversity(
          matchingUniversity
        );

        /*
          2. Luăm relațiile
          listing_universities
          pentru universitatea aleasă.
        */

        const {
          data: universityLinks,
          error:
            universityLinksError,
        } = await supabase
          .from(
            "listing_universities"
          )
          .select("listing_id")
          .eq(
            "university_id",
            matchingUniversity.id
          );

        if (
          universityLinksError
        ) {
          throw universityLinksError;
        }

        if (cancelled) {
          return;
        }

        const listingIds =
          [
            ...new Set(
              (
                universityLinks ||
                []
              )
                .map(
                  (item) =>
                    item.listing_id
                )
                .filter(Boolean)
            ),
          ];

        /*
          Dacă universitatea nu are
          niciun anunț asociat,
          nu facem query .in([], ...)
        */

        if (
          listingIds.length === 0
        ) {
          setListings([]);
          setLoading(false);
          return;
        }

        /*
          3. Încărcăm anunțurile
          asociate universității.

          Selectăm EXACT câmpurile
          necesare filtrelor din
          city/page.js.
        */

        const {
          data: listingsData,
          error: listingsError,
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
          .in(
            "id",
            listingIds
          )
          .eq(
            "active",
            true
          )
          .order(
            "created_at",
            {
              ascending: false,
            }
          );

        if (
          listingsError
        ) {
          throw listingsError;
        }

        if (cancelled) {
          return;
        }

        /*
          Protecție suplimentară:
          păstrăm numai anunțurile
          din orașul din URL.
        */

        const correctCityListings =
          (
            listingsData || []
          ).filter(
            (listing) =>
              normalizeValue(
                listing.city
              ) ===
              normalizedRequestedCity
          );

        setListings(
          correctCityListings
        );
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.error(
          "Eroare la încărcarea chiriilor universității:",
          error
        );

        setListings([]);
        setUniversity(null);

        setLoadError(
          "Nu am putut încărca anunțurile."
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadPage();

    return () => {
      cancelled = true;
    };
  }, [
    normalizedRequestedCity,
    normalizedRequestedUniversity,
  ]);

  /* =========================
     NUME ORAȘ
  ========================= */

  const cityName =
    university?.city ||
    listings[0]?.city ||
    formatFallbackCityName(
      citySlug
    );

  /* =========================
     NUME UNIVERSITATE
  ========================= */

  const universityName =
    university?.short_name ||
    university?.name ||
    decodeURIComponent(
      universitySlug
    )
      .replace(/-/g, " ")
      .toUpperCase();

  const universityFullName =
    university?.name ||
    universityName;

  /* =========================
     VALIDARE

     Exact ca pe city/page.js.
     Rulează DOAR când apăsăm
     Aplică filtrele.
  ========================= */

  function validateFilters() {
    const errors = [];

    /* PREȚ MINIM */

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

    /* PREȚ MAXIM */

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

    /* SUPRAFAȚĂ MINIMĂ */

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

    /* SUPRAFAȚĂ MAXIMĂ */

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

    /* DATA */

    if (
      availableFrom &&
      !isValidRomanianDate(
        availableFrom
      )
    ) {
      errors.push(
        "Data disponibilității trebuie introdusă în formatul ZZ/LL/AAAA."
      );
    }

    const minimumPrice =
      numberValue(
        minPrice
      );

    const maximumPrice =
      numberValue(
        maxPrice
      );

    const minimumSurface =
      numberValue(
        minSurface
      );

    const maximumSurface =
      numberValue(
        maxSurface
      );

    /* PREȚ MIN > MAX */

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

    /* SUPRAFAȚĂ MIN > MAX */

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

    /*
      IMPORTANT:
      dacă există o eroare,
      NU schimbăm appliedFilters.
      Lista rămâne exact cum era.
    */

    if (
      errors.length > 0
    ) {
      return;
    }

    /*
      Abia după click pe
      Aplică filtrele mutăm
      valorile draft aici.
    */

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

    /*
      Păstrăm filtrele în URL,
      dar rămânem pe ruta:

      /chirii/oras/universitate
    */

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

    const baseUrl =
      `/chirii/${citySlug}/${universitySlug}`;

    const newUrl =
      baseUrl +
      (
        query
          ? `?${query}`
          : ""
      );

    window.history.pushState(
      {},
      "",
      newUrl
    );

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

    setValidationErrors(
      []
    );

    setShowValidationErrors(
      false
    );

    /*
      IMPORTANT:
      resetarea NU scoate
      universitatea din rută.
    */

    window.history.pushState(
      {},
      "",
      `/chirii/${citySlug}/${universitySlug}`
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  /* =========================
     INPUT NUMERIC

     Identic cu city/page.js.

     Acceptă doar cifre.
     Elimină zero-urile de la început.
  ========================= */

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

  /* =========================
     DATA ZZ/LL/AAAA
  ========================= */

  function handleDateChange(
    value
  ) {
    const digits =
      String(value).replace(
        /\D/g,
        ""
      );

    if (
      digits.length > 8
    ) {
      return;
    }

    let formatted = "";

    if (
      digits.length <= 2
    ) {
      formatted =
        digits;
    } else if (
      digits.length <= 4
    ) {
      formatted =
        digits.slice(
          0,
          2
        ) +
        "/" +
        digits.slice(
          2
        );
    } else {
      formatted =
        digits.slice(
          0,
          2
        ) +
        "/" +
        digits.slice(
          2,
          4
        ) +
        "/" +
        digits.slice(
          4,
          8
        );
    }

    setAvailableFrom(
      formatted
    );
  }

  /* =========================
     SORTARE + FILTRARE

     IMPORTANT:
     folosim DOAR appliedFilters.

     Scrierea în casetele de filtre
     NU modifică rezultatele.
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

      /* PREȚ MINIM */

      if (
        minimumPrice !== null
      ) {
        result =
          result.filter(
            (listing) =>
              Number(
                listing.price_monthly
              ) >=
              minimumPrice
          );
      }

      /* PREȚ MAXIM */

      if (
        maximumPrice !== null
      ) {
        result =
          result.filter(
            (listing) =>
              Number(
                listing.price_monthly
              ) <=
              maximumPrice
          );
      }

      /* CAMERE */

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
          result =
            result.filter(
              (listing) =>
                Number(
                  listing.rooms
                ) >= 5
            );
        } else {
          result =
            result.filter(
              (listing) =>
                Number(
                  listing.rooms
                ) ===
                selectedRooms
            );
        }
      }

      /* DORMITOARE */

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
          result =
            result.filter(
              (listing) =>
                Number(
                  listing.bedrooms
                ) >= 4
            );
        } else {
          result =
            result.filter(
              (listing) =>
                Number(
                  listing.bedrooms
                ) ===
                selectedBedrooms
            );
        }
      }

      /* BĂI */

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
          result =
            result.filter(
              (listing) =>
                Number(
                  listing.bathrooms
                ) >= 3
            );
        } else {
          result =
            result.filter(
              (listing) =>
                Number(
                  listing.bathrooms
                ) ===
                selectedBathrooms
            );
        }
      }

      /* SUPRAFAȚĂ MINIMĂ */

      if (
        minimumSurface !== null
      ) {
        result =
          result.filter(
            (listing) =>
              Number(
                listing.surface_m2
              ) >=
              minimumSurface
          );
      }

      /* SUPRAFAȚĂ MAXIMĂ */

      if (
        maximumSurface !== null
      ) {
        result =
          result.filter(
            (listing) =>
              Number(
                listing.surface_m2
              ) <=
              maximumSurface
          );
      }

      /* TIP PROPRIETATE */

      if (
        appliedFilters.propertyType
      ) {
        result =
          result.filter(
            (listing) =>
              listing.property_type ===
              appliedFilters.propertyType
          );
      }

      /* MOBILAT */

      if (
        appliedFilters.furnished ===
        "yes"
      ) {
        result =
          result.filter(
            (listing) =>
              listing.furnished ===
              true
          );
      }

      if (
        appliedFilters.furnished ===
        "no"
      ) {
        result =
          result.filter(
            (listing) =>
              listing.furnished ===
              false
          );
      }

      /* TIP ANUNȚ */

      if (
        appliedFilters.listingType
      ) {
        result =
          result.filter(
            (listing) =>
              listing.listing_type ===
              appliedFilters.listingType
          );
      }

      /* DISPONIBIL DE LA */

      if (
        appliedFilters.availableFrom
      ) {
        const isoDate =
          romanianDateToISO(
            appliedFilters.availableFrom
          );

        if (isoDate) {
          result =
            result.filter(
              (listing) =>
                listing.available_from &&
                listing.available_from <=
                  isoDate
            );
        }
      }

      /* SORTARE PREȚ CRESCĂTOR */

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

      /* SORTARE PREȚ DESCRESCĂTOR */

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

      /* SORTARE SUPRAFAȚĂ */

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

      /* CELE MAI NOI */

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

  /* =========================
     EXISTĂ FILTRE APLICATE?
  ========================= */

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
            Locuințe disponibile pentru studenții de la{" "}
            <strong>
              {universityFullName}
            </strong>
            .
          </p>
        </div>

        {/* =========================
            FILTRE
        ========================= */}

        <form
          onSubmit={
            handleSubmit
          }
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
                Restrânge rezultatele pentru {universityName}
              </div>
            </div>

            <button
              type="button"
              onClick={
                resetFilters
              }
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
                style={
                  labelStyle
                }
              >
                Preț minim (€)
              </label>

              <input
                type="text"
                inputMode="numeric"
                value={minPrice}
                onChange={(
                  event
                ) =>
                  handleIntegerChange(
                    event.target
                      .value,
                    setMinPrice
                  )
                }
                placeholder="Ex: 200"
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
                Preț maxim (€)
              </label>

              <input
                type="text"
                inputMode="numeric"
                value={maxPrice}
                onChange={(
                  event
                ) =>
                  handleIntegerChange(
                    event.target
                      .value,
                    setMaxPrice
                  )
                }
                placeholder="Ex: 700"
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
                value={rooms}
                onChange={(
                  event
                ) =>
                  setRooms(
                    event.target
                      .value
                  )
                }
                style={
                  inputStyle
                }
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
                onChange={(
                  event
                ) =>
                  setPropertyType(
                    event.target
                      .value
                  )
                }
                style={
                  inputStyle
                }
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
                onChange={(
                  event
                ) =>
                  setBedrooms(
                    event.target
                      .value
                  )
                }
                style={
                  inputStyle
                }
              >
                <option value="">
                  Oricâte
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
                onChange={(
                  event
                ) =>
                  setBathrooms(
                    event.target
                      .value
                  )
                }
                style={
                  inputStyle
                }
              >
                <option value="">
                  Oricâte
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
                style={
                  labelStyle
                }
              >
                Suprafață minimă (m²)
              </label>

              <input
                type="text"
                inputMode="numeric"
                value={
                  minSurface
                }
                onChange={(
                  event
                ) =>
                  handleIntegerChange(
                    event.target
                      .value,
                    setMinSurface
                  )
                }
                placeholder="Ex: 30"
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
                Suprafață maximă (m²)
              </label>

              <input
                type="text"
                inputMode="numeric"
                value={
                  maxSurface
                }
                onChange={(
                  event
                ) =>
                  handleIntegerChange(
                    event.target
                      .value,
                    setMaxSurface
                  )
                }
                placeholder="Ex: 100"
                style={
                  inputStyle
                }
              />
            </div>
          </div>

          {/* 2/2 CONTINUĂ DIRECT DE AICI */}
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
                onChange={(
                  event
                ) =>
                  setFurnished(
                    event.target
                      .value
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
                onChange={(
                  event
                ) =>
                  setListingType(
                    event.target
                      .value
                  )
                }
                style={
                  inputStyle
                }
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

                <option value="shared">
                  Cameră în apartament
                </option>
              </select>
            </div>

            <div>
              <label
                style={
                  labelStyle
                }
              >
                Disponibil până la
              </label>

              <input
                type="text"
                inputMode="numeric"
                value={
                  availableFrom
                }
                onChange={(
                  event
                ) =>
                  handleDateChange(
                    event.target
                      .value
                  )
                }
                placeholder="ZZ/LL/AAAA"
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
                Sortează
              </label>

              <select
                value={sort}
                onChange={(
                  event
                ) =>
                  setSort(
                    event.target
                      .value
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

          {/* ERORI */}

          {showValidationErrors &&
            validationErrors.length >
              0 && (
              <div
                style={{
                  marginTop: "13px",
                  background:
                    "#FEF2F2",
                  border:
                    "1px solid #FECACA",
                  borderRadius:
                    "10px",
                  padding:
                    "10px 12px",
                }}
              >
                {validationErrors.map(
                  (
                    message,
                    index
                  ) => (
                    <div
                      key={
                        index
                      }
                      style={{
                        color:
                          "#B91C1C",
                        fontSize:
                          "11px",
                        lineHeight:
                          "1.6",
                        fontWeight:
                          "700",
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
              justifyContent:
                "flex-end",
              marginTop: "14px",
            }}
          >
            <button
              type="submit"
              style={{
                border: "none",
                background:
                  "#2563EB",
                color: "#FFFFFF",
                borderRadius:
                  "9px",
                padding:
                  "10px 18px",
                fontFamily:
                  "inherit",
                fontSize: "12px",
                fontWeight: "800",
                cursor: "pointer",
                boxShadow:
                  "0 5px 14px rgba(37, 99, 235, 0.16)",
              }}
            >
              Aplică filtrele
            </button>
          </div>
        </form>

        {/* =========================
            REZUMAT REZULTATE
        ========================= */}

        {!loading &&
          !loadError && (
            <div
              style={{
                display: "flex",
                alignItems:
                  "center",
                justifyContent:
                  "space-between",
                gap: "12px",
                marginBottom:
                  "13px",
              }}
            >
              <div
                style={{
                  color:
                    "#64748B",
                  fontSize:
                    "12px",
                  fontWeight:
                    "700",
                }}
              >
                {filteredListings.length ===
                1
                  ? "1 anunț găsit"
                  : `${filteredListings.length} anunțuri găsite`}
              </div>

              {hasAppliedFilters && (
                <div
                  style={{
                    color:
                      "#2563EB",
                    fontSize:
                      "11px",
                    fontWeight:
                      "800",
                  }}
                >
                  Filtre active
                </div>
              )}
            </div>
          )}

        {/* =========================
            LOADING
        ========================= */}

        {loading && (
          <div
            style={{
              background:
                "#FFFFFF",
              border:
                "1px solid #E2E8F0",
              borderRadius:
                "14px",
              padding:
                "28px",
              textAlign:
                "center",
              color:
                "#64748B",
              fontSize:
                "13px",
              fontWeight:
                "700",
            }}
          >
            Se încarcă anunțurile...
          </div>
        )}

        {/* =========================
            EROARE ÎNCĂRCARE
        ========================= */}

        {!loading &&
          loadError && (
            <div
              style={{
                background:
                  "#FFFFFF",
                border:
                  "1px solid #FECACA",
                borderRadius:
                  "14px",
                padding:
                  "28px",
                textAlign:
                  "center",
              }}
            >
              <div
                style={{
                  color:
                    "#B91C1C",
                  fontSize:
                    "14px",
                  fontWeight:
                    "800",
                }}
              >
                {loadError}
              </div>

              <p
                style={{
                  margin:
                    "7px 0 0",
                  color:
                    "#64748B",
                  fontSize:
                    "12px",
                }}
              >
                Verifică pagina sau încearcă din nou mai târziu.
              </p>
            </div>
          )}

        {/* =========================
            FĂRĂ REZULTATE
        ========================= */}

        {!loading &&
          !loadError &&
          validationErrors.length ===
            0 &&
          filteredListings.length ===
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
                  "34px 24px",
                textAlign:
                  "center",
              }}
            >
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
                Nu am găsit anunțuri
              </div>

              <p
                style={{
                  margin:
                    "7px auto 0",
                  maxWidth:
                    "500px",
                  color:
                    "#64748B",
                  fontSize:
                    "12px",
                  lineHeight:
                    "1.6",
                }}
              >
                {hasAppliedFilters
                  ? "Încearcă să modifici sau să elimini câteva filtre."
                  : `Momentan nu există locuințe active asociate cu ${universityName}.`}
              </p>
            </div>
          )}

        {/* =========================
            LISTĂ ANUNȚURI
        ========================= */}

        {!loading &&
          !loadError &&
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
                gap: "11px",
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

                  const returnUrl =
                    typeof window !==
                    "undefined"
                      ? `/chirii/${citySlug}/${universitySlug}${window.location.search}`
                      : `/chirii/${citySlug}/${universitySlug}`;

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
                      {/* FOTO */}

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
                            Fără fotografie
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
                        href={`/proprietate/${listing.id}?from=${encodeURIComponent(
                          returnUrl
                        )}`}
                        className="listing-main-link"
                        style={{
                          flex: "1",
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
                        {/* CONȚINUT */}

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

                            {/* CARACTERISTICI */}

                            <div
                              style={{
                                display:
                                  "flex",
                                alignItems:
                                  "center",
                                flexWrap:
                                  "wrap",
                                gap: "7px",
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

                          {/* DISPONIBILITATE */}

                          <div
                            style={{
                              display:
                                "flex",
                              alignItems:
                                "center",
                              gap: "10px",
                              flexWrap:
                                "wrap",
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
                                    "700",
                                }}
                              >
                                Disponibil din{" "}
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
                                    "10px",
                                }}
                              >
                                Publicat{" "}
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
                              "175px",
                            minWidth:
                              "175px",
                            padding:
                              "17px 19px",
                            boxSizing:
                              "border-box",
                            borderLeft:
                              "1px solid #F1F5F9",
                            display:
                              "flex",
                            flexDirection:
                              "column",
                            alignItems:
                              "flex-end",
                            justifyContent:
                              "center",
                          }}
                        >
                          <div
                            style={{
                              color:
                                "#172554",
                              fontSize:
                                "22px",
                              lineHeight:
                                "1",
                              fontWeight:
                                "900",
                              letterSpacing:
                                "-0.7px",
                              whiteSpace:
                                "nowrap",
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
                              color:
                                "#64748B",
                              fontSize:
                                "11px",
                              fontWeight:
                                "700",
                              marginTop:
                                "5px",
                            }}
                          >
                            / lună
                          </div>

                          <div
                            style={{
                              color:
                                "#2563EB",
                              fontSize:
                                "11px",
                              fontWeight:
                                "800",
                              marginTop:
                                "16px",
                            }}
                          >
                            Vezi anunțul →
                          </div>
                        </div>
                      </a>
                    </div>
                  );
                }
              )}
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
            padding:
              16px !important;
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
