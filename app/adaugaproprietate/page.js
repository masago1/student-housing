"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ListingFormView from "../components/ListingFormView";
import { supabase } from "../lib/supabase";
import { isValidRomanianMobilePhone } from "../lib/phone";

export default function AdaugaProprietatePage() {
    const router = useRouter();

    const [user, setUser] = useState(null);
    const [checkingAuth, setCheckingAuth] = useState(true);
    const [publishing, setPublishing] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [images, setImages] = useState([]);

    const [universities, setUniversities] = useState([]);
    const [loadingUniversities, setLoadingUniversities] = useState(true);
    const [selectedUniversityIds, setSelectedUniversityIds] = useState([]);

    const [cities, setCities] = useState([]);
    const [neighborhoods, setNeighborhoods] = useState([]);
    const [loadingLocations, setLoadingLocations] = useState(true);

    /* =========================
       MAPBOX AUTOCOMPLETE
    ========================= */

    const [addressSuggestions, setAddressSuggestions] = useState([]);
    const [loadingAddressSuggestions, setLoadingAddressSuggestions] =
        useState(false);
    const [addressSuggestionsOpen, setAddressSuggestionsOpen] =
        useState(false);
    const [selectedAddressCoordinates, setSelectedAddressCoordinates] =
        useState(null);

    const addressRequestIdRef = useRef(0);
    const mapboxSessionTokenRef = useRef(null);

    const getMapboxSessionToken = () => {
        if (!mapboxSessionTokenRef.current) {
            mapboxSessionTokenRef.current =
                crypto.randomUUID();
        }

        return mapboxSessionTokenRef.current;
    };

    /* =========================
       CALENDAR
    ========================= */

    const [calendarOpen, setCalendarOpen] = useState(false);
    const calendarRef = useRef(null);

    useEffect(() => {
        if (!calendarOpen) return;

        const handleOutsidePointer = (event) => {
            if (calendarRef.current && !calendarRef.current.contains(event.target)) {
                setCalendarOpen(false);
            }
        };
        const handleEscape = (event) => {
            if (event.key === "Escape") setCalendarOpen(false);
        };

        document.addEventListener("pointerdown", handleOutsidePointer, true);
        document.addEventListener("keydown", handleEscape);
        return () => {
            document.removeEventListener("pointerdown", handleOutsidePointer, true);
            document.removeEventListener("keydown", handleEscape);
        };
    }, [calendarOpen]);

    const [calendarMonth, setCalendarMonth] = useState(() => {
        const now = new Date();

        return new Date(
            now.getFullYear(),
            now.getMonth(),
            1
        );
    });

    const [form, setForm] = useState({
        title: "",
        property_type: "apartment",
        listing_type: "rent",
        city: "",
        neighborhood_id: "",
        address: "",
        price_monthly: "",

        rooms: "",
        bedrooms: "",
        bathrooms: "",
        surface_m2: "",

        furnished: "true",
        available_from: "",
        description: "",

        floor: "",
        total_floors: "",
        construction_year: "",
        heating_type: "",

        air_conditioning: "false",
        balcony: "false",
        parking: "false",

        pets_allowed: "false",
        smoking_allowed: "false",

        max_tenants: "",
        deposit_amount: "",
        utilities_included: "false",

        owner_name: "",
        owner_phone: "",
    });

    /* =========================
       AUTENTIFICARE + PROFIL
    ========================= */

    useEffect(() => {
        const checkUser = async () => {
            const {
                data: { user },
                error: authError,
            } = await supabase.auth.getUser();

            if (authError || !user) {
                router.replace("/login");
                return;
            }

            setUser(user);

            const {
                data: profile,
                error: profileError,
            } = await supabase
                .from("profiles")
                .select("nickname, phone")
                .eq("id", user.id)
                .maybeSingle();

            if (profileError) {
                console.error(
                    "Eroare profil:",
                    profileError
                );

                setError(
                    "Profilul nu a putut fi verificat."
                );

                setCheckingAuth(false);

                return;
            }

            const profilePhone =
                profile?.phone?.trim() || "";

            if (!isValidRomanianMobilePhone(profilePhone)) {
                router.replace(
                    "/dashboard?section=profile&required=phone"
                );

                return;
            }

            setForm((current) => ({
                ...current,

                owner_name:
                    profile?.nickname?.trim() ||
                    "",

                owner_phone:
                    profilePhone,

            }));

            setCheckingAuth(false);
        };

        checkUser();

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                if (!session?.user) {
                    router.replace("/login");
                    return;
                }

                setUser(session.user);
            }
        );

        return () => {
            subscription.unsubscribe();
        };
    }, [router]);

    /* =========================
       UNIVERSITĂȚI
    ========================= */

    useEffect(() => {
        const loadUniversities = async () => {
            setLoadingUniversities(true);

            const {
                data,
                error,
            } = await supabase
                .from("universities")
                .select(
                    "id, name, short_name, city"
                )
                .order("city", {
                    ascending: true,
                })
                .order("name", {
                    ascending: true,
                });

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

    /* =========================
       ORAȘE + CARTIERE
    ========================= */

    useEffect(() => {
        const loadLocations = async () => {
            setLoadingLocations(true);

            const {
                data: citiesData,
                error: citiesError,
            } = await supabase
                .from("cities")
                .select("id, name, slug")
                .order("name", {
                    ascending: true,
                });

            if (citiesError) {
                console.error(
                    "Eroare la încărcarea orașelor:",
                    citiesError
                );

                setCities([]);
            } else {
                setCities(
                    citiesData || []
                );
            }

            const {
                data: neighborhoodsData,
                error: neighborhoodsError,
            } = await supabase
                .from("neighborhoods")
                .select(
                    "id, city_id, name, slug"
                )
                .order("name", {
                    ascending: true,
                });

            if (neighborhoodsError) {
                console.error(
                    "Eroare la încărcarea cartierelor:",
                    neighborhoodsError
                );

                setNeighborhoods([]);
            } else {
                setNeighborhoods(
                    neighborhoodsData || []
                );
            }

            setLoadingLocations(false);
        };

        loadLocations();
    }, []);

    /* =========================
       ORAȘ SELECTAT
    ========================= */

    const selectedCity = useMemo(() => {
        if (!form.city) {
            return null;
        }

        return (
            cities.find(
                (city) =>
                    city.name === form.city
            ) || null
        );
    }, [
        cities,
        form.city,
    ]);

    /* =========================
       CARTIERE ORAȘ
    ========================= */

    const neighborhoodsForCity =
        useMemo(() => {
            if (!selectedCity) {
                return [];
            }

            return neighborhoods.filter(
                (neighborhood) =>
                    String(
                        neighborhood.city_id
                    ) ===
                    String(
                        selectedCity.id
                    )
            );
        }, [
            neighborhoods,
            selectedCity,
        ]);

    /* =========================
       UNIVERSITĂȚI ORAȘ
    ========================= */

    const universitiesForCity =
        useMemo(() => {
            if (!form.city) {
                return [];
            }

            return universities.filter(
                (university) =>
                    university.city ===
                    form.city
            );
        }, [
            universities,
            form.city,
        ]);

    /* =========================
       FORMULAR
    ========================= */

    const updateField = (event) => {
        const {
            name,
            value,
        } = event.target;

        setForm((current) => ({
            ...current,
            [name]: value,
        }));
    };

    const handleCityChange = (
        event
    ) => {
        const city =
            event.target.value;

        setForm((current) => ({
            ...current,
            city,
            neighborhood_id: "",
        }));

        setSelectedUniversityIds([]);

        setAddressSuggestions([]);
        setAddressSuggestionsOpen(false);
        setSelectedAddressCoordinates(null);

        mapboxSessionTokenRef.current =
            null;
    };

    /* =========================
       MAPBOX - SCRIERE ADRESĂ
    ========================= */

    const handleAddressChange = (
        event
    ) => {
        const value =
            event.target.value;

        setForm((current) => ({
            ...current,
            address: value,
        }));

        /*
            Dacă proprietarul modifică textul
            după ce a selectat o adresă,
            coordonatele vechi nu mai sunt valide.
        */

        setSelectedAddressCoordinates(
            null
        );

        if (
            value.trim().length < 3
        ) {
            setAddressSuggestions([]);
            setAddressSuggestionsOpen(
                false
            );
            setLoadingAddressSuggestions(
                false
            );
        } else {
            setAddressSuggestionsOpen(
                true
            );
        }
    };

    /* =========================
       MAPBOX - AUTOCOMPLETE
    ========================= */

    useEffect(() => {
        const address =
            form.address.trim();

        const city =
            form.city.trim();

        const mapboxToken =
            process.env
                .NEXT_PUBLIC_MAPBOX_TOKEN;

        /*
            Nu căutăm până nu:
            - avem oraș
            - sunt minimum 3 caractere
            - utilizatorul nu a selectat deja
              o adresă validă
        */

        if (
            !city ||
            address.length < 3 ||
            selectedAddressCoordinates
        ) {
            return;
        }

        if (!mapboxToken) {
            console.error(
                "Lipsește NEXT_PUBLIC_MAPBOX_TOKEN."
            );

            return;
        }

        /*
            ID pentru request.

            Dacă utilizatorul scrie foarte repede,
            ignorăm rezultatele request-urilor vechi.
        */

        const requestId =
            ++addressRequestIdRef.current;

        /*
            Debounce 350ms.
            Nu trimitem request la fiecare tastă
            instantaneu.
        */

        const timer =
            setTimeout(
                async () => {
                    try {
                        setLoadingAddressSuggestions(
                            true
                        );

                        const sessionToken =
                            getMapboxSessionToken();

                        /*
                            Punem și orașul în query
                            pentru rezultate mai relevante.
                        */

                        const searchText =
                            `${address}, ${city}`;

                        const params =
                            new URLSearchParams(
                                {
                                    q:
                                        searchText,

                                    access_token:
                                        mapboxToken,

                                    session_token:
                                        sessionToken,

                                    country:
                                        "RO",

                                    language:
                                        "ro",

                                    limit:
                                        "6",
                                }
                            );

                        const response =
                            await fetch(
                                `https://api.mapbox.com/search/searchbox/v1/suggest?${params.toString()}`,
                                {
                                    method:
                                        "GET",

                                    cache:
                                        "no-store",
                                }
                            );

                        if (
                            !response.ok
                        ) {
                            throw new Error(
                                `Mapbox suggest: ${response.status}`
                            );
                        }

                        const data =
                            await response.json();

                        /*
                            Dacă între timp s-a făcut
                            un request mai nou,
                            nu folosim rezultatele vechi.
                        */

                        if (
                            requestId !==
                            addressRequestIdRef.current
                        ) {
                            return;
                        }

                        setAddressSuggestions(
                            Array.isArray(
                                data?.suggestions
                            )
                                ? data.suggestions
                                : []
                        );

                        setAddressSuggestionsOpen(
                            true
                        );
                    } catch (
                        addressError
                    ) {
                        console.error(
                            "Eroare autocomplete adresă:",
                            addressError
                        );

                        if (
                            requestId ===
                            addressRequestIdRef.current
                        ) {
                            setAddressSuggestions(
                                []
                            );
                        }
                    } finally {
                        if (
                            requestId ===
                            addressRequestIdRef.current
                        ) {
                            setLoadingAddressSuggestions(
                                false
                            );
                        }
                    }
                },
                350
            );

        return () => {
            clearTimeout(timer);
        };
    }, [
        form.address,
        form.city,
        selectedAddressCoordinates,
    ]);

    /* =========================
       MAPBOX - SELECTARE ADRESĂ
    ========================= */

    const selectAddressSuggestion =
        async (suggestion) => {
            const mapboxToken =
                process.env
                    .NEXT_PUBLIC_MAPBOX_TOKEN;

            if (
                !mapboxToken ||
                !suggestion?.mapbox_id
            ) {
                return;
            }

            try {
                setLoadingAddressSuggestions(
                    true
                );

                const sessionToken =
                    getMapboxSessionToken();

                const params =
                    new URLSearchParams(
                        {
                            access_token:
                                mapboxToken,

                            session_token:
                                sessionToken,
                        }
                    );

                /*
                    /retrieve ne dă rezultatul complet
                    și coordonatele adresei selectate.
                */

                const response =
                    await fetch(
                        `https://api.mapbox.com/search/searchbox/v1/retrieve/${encodeURIComponent(
                            suggestion.mapbox_id
                        )}?${params.toString()}`,
                        {
                            method:
                                "GET",

                            cache:
                                "no-store",
                        }
                    );

                if (
                    !response.ok
                ) {
                    throw new Error(
                        `Mapbox retrieve: ${response.status}`
                    );
                }

                const data =
                    await response.json();

                const feature =
                    data?.features?.[0];

                const coordinates =
                    feature?.geometry
                        ?.coordinates;

                /*
                    GeoJSON / Mapbox:
                    [longitude, latitude]
                */

                const longitude =
                    Number(
                        coordinates?.[0]
                    );

                const latitude =
                    Number(
                        coordinates?.[1]
                    );

                if (
                    !Number.isFinite(
                        latitude
                    ) ||
                    !Number.isFinite(
                        longitude
                    )
                ) {
                    throw new Error(
                        "Coordonatele Mapbox nu sunt valide."
                    );
                }

                const properties =
                    feature?.properties ||
                    {};

                /*
                    Preferăm adresa completă furnizată
                    de Mapbox.
                */

                const selectedAddress =
                    properties.full_address ||
                    [
                        properties.name ||
                            suggestion.name,

                        properties.place_formatted ||
                            suggestion.place_formatted,
                    ]
                        .filter(Boolean)
                        .join(", ");

                setForm(
                    (current) => ({
                        ...current,

                        address:
                            selectedAddress ||
                            current.address,
                    })
                );

                setSelectedAddressCoordinates(
                    {
                        latitude,
                        longitude,
                    }
                );

                setAddressSuggestions(
                    []
                );

                setAddressSuggestionsOpen(
                    false
                );

                /*
                    Căutarea s-a terminat.
                    Următoarea adresă va primi
                    un session token nou.
                */

                mapboxSessionTokenRef.current =
                    null;
            } catch (
                addressError
            ) {
                console.error(
                    "Eroare selectare adresă:",
                    addressError
                );

                setError(
                    "Adresa selectată nu a putut fi preluată. Încearcă din nou."
                );
            } finally {
                setLoadingAddressSuggestions(
                    false
                );
            }
        };

    /* =========================
       POZE
    ========================= */

    const handleImages = (
        event
    ) => {
        setError("");

        const selectedFiles =
            Array.from(
                event.target.files || []
            );

        if (
            selectedFiles.length === 0
        ) {
            return;
        }

        const remainingSlots =
            10 - images.length;

        if (
            remainingSlots <= 0
        ) {
            setError(
                "Poți adăuga maximum 10 imagini."
            );

            event.target.value = "";

            return;
        }

        if (
            selectedFiles.length >
            remainingSlots
        ) {
            setError(
                `Poți adăuga maximum 10 imagini. Mai poți selecta ${remainingSlots}.`
            );

            event.target.value = "";

            return;
        }

        const validFiles = [];

        for (
            const file of selectedFiles
        ) {
            if (
                !file.type.startsWith(
                    "image/"
                )
            ) {
                setError(
                    "Poți încărca doar fișiere de tip imagine."
                );

                event.target.value = "";

                return;
            }

            if (
                file.size >
                10 * 1024 * 1024
            ) {
                setError(
                    "Fiecare imagine trebuie să aibă maximum 10 MB."
                );

                event.target.value = "";

                return;
            }

            validFiles.push({
                file,

                preview:
                    URL.createObjectURL(
                        file
                    ),
            });
        }

        setImages((current) => [
            ...current,
            ...validFiles,
        ]);

        event.target.value = "";
    };

    const removeImage = (
        index
    ) => {
        setImages((current) => {
            const imageToRemove =
                current[index];

            if (
                imageToRemove?.preview
            ) {
                URL.revokeObjectURL(
                    imageToRemove.preview
                );
            }

            return current.filter(
                (
                    _,
                    imageIndex
                ) =>
                    imageIndex !==
                    index
            );
        });
    };

    /* =========================
       LOGOUT
    ========================= */

    const handleLogout =
        async () => {
            await supabase.auth.signOut();

            router.push("/");
            router.refresh();
        };

    /* =========================
       CLEANUP STORAGE
    ========================= */

    const cleanupUploadedFiles =
        async (paths) => {
            if (!paths.length) {
                return;
            }

            await supabase.storage
                .from(
                    "listing-images"
                )
                .remove(paths);
        };

    /* =========================
       CALENDAR DISPONIBILITATE
    ========================= */

    const romanianMonths = [
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

    /*
        Format vizual:
        2026-09-17
        devine
        17/09/2026
    */



    /*
        La deschiderea calendarului:
        - dacă avem o dată viitoare selectată,
          mergem la luna acelei date
        - altfel mergem la luna curentă
    */

    const openCalendar = () => {
        const today =
            getTodayAtMidnight();

        if (form.available_from) {
            const [
                year,
                month,
                day,
            ] = form.available_from
                .split("-")
                .map(Number);

            const selectedDate =
                new Date(
                    year,
                    month - 1,
                    day
                );

            if (
                selectedDate >= today
            ) {
                setCalendarMonth(
                    new Date(
                        year,
                        month - 1,
                        1
                    )
                );
            } else {
                setCalendarMonth(
                    new Date(
                        today.getFullYear(),
                        today.getMonth(),
                        1
                    )
                );
            }
        } else {
            setCalendarMonth(
                new Date(
                    today.getFullYear(),
                    today.getMonth(),
                    1
                )
            );
        }

        setCalendarOpen(
            (current) => !current
        );
    };

    /*
        Selectarea unei zile.
        Protecția este dublă:
        1. zilele trecute au disabled în UI
        2. verificăm din nou aici
    */

    const selectCalendarDate = (
        year,
        monthIndex,
        day
    ) => {
        const today =
            getTodayAtMidnight();

        const selectedDate =
            new Date(
                year,
                monthIndex,
                day
            );

        if (
            selectedDate < today
        ) {
            return;
        }

        const isoDate =
            `${year}-${String(
                monthIndex + 1
            ).padStart(
                2,
                "0"
            )}-${String(
                day
            ).padStart(
                2,
                "0"
            )}`;

        setForm((current) => ({
            ...current,

            available_from:
                isoDate,
        }));

        setCalendarOpen(false);
    };

    const calendarYear =
        calendarMonth.getFullYear();

    const calendarMonthIndex =
        calendarMonth.getMonth();

    const firstDayOfMonth =
        new Date(
            calendarYear,
            calendarMonthIndex,
            1
        ).getDay();

    /*
        JS:
        0 = Duminică
        1 = Luni
        ...

        Calendarul nostru:
        0 = Luni
        ...
        6 = Duminică
    */

    const mondayOffset =
        (firstDayOfMonth + 6) % 7;

    const daysInCalendarMonth =
        new Date(
            calendarYear,
            calendarMonthIndex + 1,
            0
        ).getDate();

    const calendarCells = [
        ...Array(mondayOffset).fill(null),
        ...Array.from(
            {
                length:
                    daysInCalendarMonth,
            },
            (
                _,
                index
            ) => index + 1
        ),
    ];

    const getTodayAtMidnight =
        () => {
            const today =
                new Date();

            return new Date(
                today.getFullYear(),
                today.getMonth(),
                today.getDate()
            );
        };

    const currentCalendarMonthStart =
        new Date(
            getTodayAtMidnight().getFullYear(),
            getTodayAtMidnight().getMonth(),
            1
        );

    const displayedCalendarMonthStart =
        new Date(
            calendarYear,
            calendarMonthIndex,
            1
        );

    /*
        Dacă suntem în luna curentă,
        săgeata spre luna anterioară
        va fi dezactivată.
    */

    const canGoToPreviousMonth =
        displayedCalendarMonthStart >
        currentCalendarMonthStart;

    const previousCalendarMonth =
        () => {
            if (
                !canGoToPreviousMonth
            ) {
                return;
            }

            const previousMonth =
                new Date(
                    calendarYear,
                    calendarMonthIndex - 1,
                    1
                );

            if (
                previousMonth <
                currentCalendarMonthStart
            ) {
                return;
            }

            setCalendarMonth(
                previousMonth
            );
        };

    const nextCalendarMonth =
        () => {
            setCalendarMonth(
                new Date(
                    calendarYear,
                    calendarMonthIndex + 1,
                    1
                )
            );
        };

    /* =========================
       PUBLICARE
    ========================= */

    const handleSubmit =
        async (event) => {
            event.preventDefault();

            setError("");
            setSuccess("");

            if (!user) {
                router.replace(
                    "/login"
                );

                return;
            }

            /*
                Verificăm din nou profilul
                chiar înainte de publicare.
            */

            const {
                data: currentProfile,
                error: profileCheckError,
            } = await supabase
                .from("profiles")
                .select("nickname, phone")
                .eq("id", user.id)
                .maybeSingle();

            if (profileCheckError) {
                console.error(
                    "Eroare verificare profil:",
                    profileCheckError
                );

                setError(
                    "Profilul nu a putut fi verificat. Încearcă din nou."
                );

                return;
            }

            const currentPhone =
                currentProfile?.phone?.trim() ||
                "";

            if (!isValidRomanianMobilePhone(currentPhone)) {
                router.push(
                    "/dashboard?section=profile&required=phone"
                );

                return;
            }

            if (
                !form.title.trim()
            ) {
                setError(
                    "Completează titlul anunțului."
                );

                return;
            }

            if (
                !form.city.trim()
            ) {
                setError(
                    "Alege orașul proprietății."
                );

                return;
            }

            if (
                !form.neighborhood_id
            ) {
                setError(
                    "Alege zona / cartierul proprietății."
                );

                return;
            }

            if (
                !form.address.trim()
            ) {
                setError(
                    "Completează adresa proprietății."
                );

                return;
            }

            if (
                !form.price_monthly ||
                Number(
                    form.price_monthly
                ) <= 0
            ) {
                setError(
                    "Introdu un preț lunar valid."
                );

                return;
            }

            if (
                form.available_from
            ) {
                const [
                    year,
                    month,
                    day,
                ] = form.available_from
                    .split("-")
                    .map(Number);

                const selectedDate =
                    new Date(
                        year,
                        month - 1,
                        day
                    );

                if (
                    selectedDate <
                    getTodayAtMidnight()
                ) {
                    setError(
                        "Data disponibilității nu poate fi în trecut."
                    );

                    return;
                }
            }

            if (
                form.floor !== "" &&
                form.total_floors !== "" &&
                Number(form.floor) >
                    Number(
                        form.total_floors
                    )
            ) {
                setError(
                    "Etajul proprietății nu poate fi mai mare decât numărul total de etaje."
                );

                return;
            }

            if (
                form.construction_year !== ""
            ) {
                const year =
                    Number(
                        form.construction_year
                    );

                const currentYear =
                    new Date().getFullYear();

                if (
                    year < 1800 ||
                    year > currentYear
                ) {
                    setError(
                        `Anul construcției trebuie să fie între 1800 și ${currentYear}.`
                    );

                    return;
                }
            }

            if (
                form.max_tenants !== "" &&
                Number(
                    form.max_tenants
                ) <= 0
            ) {
                setError(
                    "Numărul maxim de chiriași trebuie să fie cel puțin 1."
                );

                return;
            }

            if (
                form.deposit_amount !== "" &&
                Number(
                    form.deposit_amount
                ) < 0
            ) {
                setError(
                    "Garanția nu poate avea o valoare negativă."
                );

                return;
            }

            if (
                images.length === 0
            ) {
                setError(
                    "Adaugă cel puțin o imagine a proprietății."
                );

                return;
            }

            if (
                images.length > 10
            ) {
                setError(
                    "Poți adăuga maximum 10 imagini."
                );

                return;
            }

            setPublishing(true);

            let listingId = null;

            const uploadedPaths = [];

            try {
                let latitude =
                    selectedAddressCoordinates
                        ?.latitude;

                let longitude =
                    selectedAddressCoordinates
                        ?.longitude;

                /*
                    Dacă proprietarul a ales o sugestie
                    Mapbox, avem deja coordonatele.

                    Dacă a scris manual fără să aleagă
                    o sugestie, păstrăm /api/geocode
                    ca fallback.
                */

                if (
                    !Number.isFinite(
                        latitude
                    ) ||
                    !Number.isFinite(
                        longitude
                    )
                ) {
                    const geocodeResponse =
                        await fetch(
                            "/api/geocode",
                            {
                                method:
                                    "POST",

                                headers: {
                                    "Content-Type":
                                        "application/json",
                                },

                                body:
                                    JSON.stringify(
                                        {
                                            address:
                                                form.address.trim(),

                                            city:
                                                form.city.trim(),
                                        }
                                    ),
                            }
                        );

                    const geocodeData =
                        await geocodeResponse.json();

                    if (
                        !geocodeResponse.ok
                    ) {
                        throw new Error(
                            geocodeData?.error ||
                                "Adresa proprietății nu a putut fi localizată."
                        );
                    }

                    latitude =
                        Number(
                            geocodeData.latitude
                        );

                    longitude =
                        Number(
                            geocodeData.longitude
                        );
                }

                if (
                    !Number.isFinite(
                        latitude
                    ) ||
                    !Number.isFinite(
                        longitude
                    )
                ) {
                    throw new Error(
                        "Adresa proprietății nu a putut fi localizată corect."
                    );
                }

                const ownerName =
                    currentProfile?.nickname?.trim() ||
                    "";

                const listingData = {
                    user_id:
                        user.id,

                    title:
                        form.title.trim(),

                    description:
                        form.description.trim() ||
                        null,

                    city:
                        form.city.trim(),

                    neighborhood_id:
                        Number(
                            form.neighborhood_id
                        ),

                    address:
                        form.address.trim(),

                    latitude:
                        latitude,

                    longitude:
                        longitude,

                    price_monthly:
                        Number(
                            form.price_monthly
                        ),

                    rooms:
                        form.rooms !== ""
                            ? Number(
                                  form.rooms
                              )
                            : null,

                    bedrooms:
                        form.bedrooms !== ""
                            ? Number(
                                  form.bedrooms
                              )
                            : null,

                    bathrooms:
                        form.bathrooms !== ""
                            ? Number(
                                  form.bathrooms
                              )
                            : null,

                    surface_m2:
                        form.surface_m2 !== ""
                            ? Number(
                                  form.surface_m2
                              )
                            : null,

                    property_type:
                        form.property_type,

                    listing_type: form.listing_type,

                    furnished:
                        form.furnished ===
                        "true",

                    available_from:
                        form.available_from ||
                        null,

                    floor:
                        form.floor !== ""
                            ? Number(
                                  form.floor
                              )
                            : null,

                    total_floors:
                        form.total_floors !== ""
                            ? Number(
                                  form.total_floors
                              )
                            : null,

                    construction_year:
                        form.construction_year !== ""
                            ? Number(
                                  form.construction_year
                              )
                            : null,

                    heating_type:
                        form.heating_type.trim() ||
                        null,

                    air_conditioning:
                        form.air_conditioning ===
                        "true",
                                        balcony:
                        form.balcony ===
                        "true",

                    parking:
                        form.parking ===
                        "true",

                    pets_allowed:
                        form.pets_allowed ===
                        "true",

                    smoking_allowed:
                        form.smoking_allowed ===
                        "true",

                    max_tenants:
                        form.max_tenants !== ""
                            ? Number(
                                  form.max_tenants
                              )
                            : null,

                    deposit_amount:
                        form.deposit_amount !== ""
                            ? Number(
                                  form.deposit_amount
                              )
                            : null,

                    utilities_included:
                        form.utilities_included ===
                        "true",

                    owner_name:
                        ownerName,

                    owner_phone:
                        currentPhone,

                    active:
                        true,
                };

                const {
                    data:
                        createdListing,
                    error:
                        listingError,
                } = await supabase
                    .from(
                        "listings"
                    )
                    .insert([
                        listingData,
                    ])
                    .select("id")
                    .single();

                if (
                    listingError
                ) {
                    throw new Error(
                        `Anunțul nu a putut fi creat: ${listingError.message}`
                    );
                }

                listingId =
                    createdListing.id;

                /* =========================
                   UNIVERSITĂȚI - OPȚIONAL
                ========================= */

                if (
                    selectedUniversityIds.length >
                    0
                ) {
                    const universityLinks =
                        selectedUniversityIds.map(
                            (
                                universityId
                            ) => ({
                                listing_id:
                                    listingId,

                                university_id:
                                    universityId,

                                distance_meters:
                                    null,

                                walking_minutes:
                                    null,
                            })
                        );

                    const {
                        error:
                            universityLinkError,
                    } = await supabase
                        .from(
                            "listing_universities"
                        )
                        .insert(
                            universityLinks
                        );

                    if (
                        universityLinkError
                    ) {
                        throw new Error(
                            `Universitățile nu au putut fi asociate anunțului: ${universityLinkError.message}`
                        );
                    }
                }

                /* =========================
                   POZE
                ========================= */

                const uploadedImages =
                    [];

                for (
                    let index = 0;
                    index <
                    images.length;
                    index++
                ) {
                    const image =
                        images[index];

                    const file =
                        image.file;

                    const extension =
                        file.name
                            .split(".")
                            .pop()
                            ?.toLowerCase() ||
                        "jpg";

                    const safeExtension =
                        extension.replace(
                            /[^a-z0-9]/g,
                            ""
                        ) || "jpg";

                    const fileName =
                        `${Date.now()}-${index}-${crypto.randomUUID()}.${safeExtension}`;

                    const storagePath =
                        `${user.id}/${listingId}/${fileName}`;

                    const {
                        error:
                            uploadError,
                    } =
                        await supabase.storage
                            .from(
                                "listing-images"
                            )
                            .upload(
                                storagePath,
                                file,
                                {
                                    cacheControl:
                                        "3600",

                                    upsert:
                                        false,

                                    contentType:
                                        file.type,
                                }
                            );

                    if (
                        uploadError
                    ) {
                        throw new Error(
                            `Imaginea ${index + 1} nu a putut fi încărcată: ${uploadError.message}`
                        );
                    }

                    uploadedPaths.push(
                        storagePath
                    );

                    const {
                        data:
                            publicUrlData,
                    } =
                        supabase.storage
                            .from(
                                "listing-images"
                            )
                            .getPublicUrl(
                                storagePath
                            );

                    uploadedImages.push({
                        listing_id:
                            listingId,

                        image_url:
                            publicUrlData.publicUrl,

                        storage_path:
                            storagePath,

                        position:
                            index,
                    });
                }

                const {
                    error:
                        imagesDatabaseError,
                } = await supabase
                    .from(
                        "listing_images"
                    )
                    .insert(
                        uploadedImages
                    );

                if (
                    imagesDatabaseError
                ) {
                    throw new Error(
                        `Imaginile nu au putut fi asociate anunțului: ${imagesDatabaseError.message}`
                    );
                }

                const coverImageUrl =
                    uploadedImages[0]
                        ?.image_url ||
                    null;

                const {
                    error:
                        coverError,
                } = await supabase
                    .from(
                        "listings"
                    )
                    .update({
                        image_url:
                            coverImageUrl,
                    })
                    .eq(
                        "id",
                        listingId
                    )
                    .eq(
                        "user_id",
                        user.id
                    );

                if (
                    coverError
                ) {
                    throw new Error(
                        `Coperta anunțului nu a putut fi salvată: ${coverError.message}`
                    );
                }

                setSuccess(
                    "Proprietatea a fost publicată cu succes."
                );

                setTimeout(
                    () => {
                        router.push(
                            "/dashboard"
                        );

                        router.refresh();
                    },
                    1000
                );
            } catch (
                submitError
            ) {
                console.error(
                    submitError
                );

                await cleanupUploadedFiles(
                    uploadedPaths
                );

                if (listingId) {
                    await supabase
                        .from(
                            "listings"
                        )
                        .delete()
                        .eq(
                            "id",
                            listingId
                        )
                        .eq(
                            "user_id",
                            user.id
                        );
                }

                setError(
                    submitError.message ||
                        "A apărut o eroare la publicarea anunțului."
                );

                setPublishing(false);
            }
        };

    /* =========================
       LOADING
    ========================= */

    if (checkingAuth) {
        return (
            <main
                style={{
                    minHeight:
                        "100vh",

                    background:
                        "#f7f8fa",

                    display:
                        "flex",

                    alignItems:
                        "center",

                    justifyContent:
                        "center",

                    color:
                        "#6b7280",

                    fontSize:
                        "15px",

                    fontWeight:
                        "600",
                }}
            >
                Se verifică profilul...
            </main>
        );
    }

    /* =========================
       STILURI
    ========================= */

    return <ListingFormView {...{
        addressSuggestions, addressSuggestionsOpen, calendarCells, calendarMonthIndex, calendarOpen, calendarRef, calendarYear, canGoToPreviousMonth, cities, error, form, getTodayAtMidnight, handleAddressChange, handleCityChange, handleImages, handleLogout, handleSubmit, images, loadingAddressSuggestions, loadingLocations, loadingUniversities, neighborhoodsForCity, nextCalendarMonth, openCalendar, previousCalendarMonth, publishing, removeImage, romanianMonths, router, selectAddressSuggestion, selectCalendarDate, selectedUniversityIds, setAddressSuggestionsOpen, setCalendarOpen, setForm, setSelectedUniversityIds, success, universitiesForCity, updateField, user
    }} />;
}
