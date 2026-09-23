"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
                "Poți adăuga maximum 10 fotografii."
            );

            event.target.value = "";

            return;
        }

        if (
            selectedFiles.length >
            remainingSlots
        ) {
            setError(
                `Poți adăuga maximum 10 fotografii. Mai poți selecta ${remainingSlots}.`
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
                    "Fiecare fotografie trebuie să aibă maximum 10 MB."
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

    const formatRomanianDate = (
        isoDate
    ) => {
        if (!isoDate) {
            return "";
        }

        const [
            year,
            month,
            day,
        ] = isoDate.split("-");

        return `${day}/${month}/${year}`;
    };

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
                    "Adaugă cel puțin o fotografie a proprietății."
                );

                return;
            }

            if (
                images.length > 10
            ) {
                setError(
                    "Poți adăuga maximum 10 fotografii."
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

                    listing_type:
                        "rent",

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
                            `Fotografia ${index + 1} nu a putut fi încărcată: ${uploadError.message}`
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
                        `Fotografiile nu au putut fi asociate anunțului: ${imagesDatabaseError.message}`
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

    const inputStyle = {
        width:
            "100%",

        boxSizing:
            "border-box",

        border:
            "1px solid #d1d5db",

        borderRadius:
            "11px",

        padding:
            "14px 15px",

        fontFamily:
            "inherit",

        fontSize:
            "15px",

        color:
            "#111827",

        background:
            "#ffffff",

        outline:
            "none",
    };

    const labelStyle = {
        display:
            "block",

        fontSize:
            "14px",

        fontWeight:
            "700",

        marginBottom:
            "8px",

        color:
            "#111827",
    };

    const fieldStyle = {
        marginBottom:
            "22px",
    };

    return (
        <main
            style={{
                minHeight:
                    "100vh",

                background:
                    "#f7f8fa",

                color:
                    "#111827",
            }}
        >
            {/* HEADER */}

            <header
                style={{
                    height:
                        "72px",

                    background:
                        "#ffffff",

                    borderBottom:
                        "1px solid #e5e7eb",

                    display:
                        "flex",

                    alignItems:
                        "center",

                    justifyContent:
                        "space-between",

                    padding:
                        "0 7%",
                }}
            >
                <a
                    href="/"
                    style={{
                        color:
                            "#111827",

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
                    shaus
                </a>

                <div
                    style={{
                        display:
                            "flex",

                        alignItems:
                            "center",

                        gap:
                            "18px",
                    }}
                >
                    <span
                        style={{
                            color:
                                "#6b7280",

                            fontSize:
                                "13px",

                            fontWeight:
                                "600",
                        }}
                    >
                        {user?.email}
                    </span>

                    <button
                        type="button"
                        onClick={
                            handleLogout
                        }
                        style={{
                            background:
                                "#ffffff",

                            color:
                                "#111827",

                            border:
                                "1px solid #e5e7eb",

                            borderRadius:
                                "10px",

                            padding:
                                "10px 15px",

                            fontFamily:
                                "inherit",

                            fontSize:
                                "13px",

                            fontWeight:
                                "700",

                            cursor:
                                "pointer",
                        }}
                    >
                        Deconectare
                    </button>
                </div>
            </header>

            {/* PAGINĂ */}

            <section
                style={{
                    maxWidth:
                        "900px",

                    margin:
                        "0 auto",

                    padding:
                        "60px 30px 100px",
                }}
            >
                <button
                    type="button"
                    onClick={() =>
                        router.push(
                            "/dashboard"
                        )
                    }
                    style={{
                        display:
                            "inline-flex",

                        alignItems:
                            "center",

                        gap:
                            "8px",

                        border:
                            "none",

                        background:
                            "transparent",

                        padding:
                            0,

                        marginBottom:
                            "28px",

                        color:
                            "#4b5563",

                        fontFamily:
                            "inherit",

                        fontSize:
                            "14px",

                        fontWeight:
                            "700",

                        cursor:
                            "pointer",
                    }}
                >
                    <span
                        style={{
                            fontSize:
                                "20px",

                            lineHeight:
                                1,
                        }}
                    >
                        ←
                    </span>

                    Înapoi la dashboard
                </button>

                <div
                    style={{
                        marginBottom:
                            "35px",
                    }}
                >
                    <div
                        style={{
                            display:
                                "inline-block",

                            background:
                                "#e8f1ff",

                            color:
                                "#2563eb",

                            padding:
                                "7px 12px",

                            borderRadius:
                                "100px",

                            fontSize:
                                "13px",

                            fontWeight:
                                "700",

                            marginBottom:
                                "16px",
                        }}
                    >
                        Publică o proprietate
                    </div>

                    <h1
                        style={{
                            margin:
                                0,

                            fontSize:
                                "40px",

                            lineHeight:
                                "1.15",

                            letterSpacing:
                                "-1.5px",

                            fontWeight:
                                "800",
                        }}
                    >
                        Adaugă proprietatea
                    </h1>

                    <p
                        style={{
                            margin:
                                "13px 0 0",

                            color:
                                "#6b7280",

                            fontSize:
                                "16px",

                            lineHeight:
                                "1.6",

                            maxWidth:
                                "650px",
                        }}
                    >
                        Completează informațiile proprietății tale pentru a publica anunțul.
                    </p>
                </div>

                <form
                    onSubmit={
                        handleSubmit
                    }
                >
                    {/* FOTOGRAFII */}

                    <div
                        style={{
                            background:
                                "#ffffff",

                            border:
                                "1px solid #e5e7eb",

                            borderRadius:
                                "20px",

                            padding:
                                "32px",

                            boxShadow:
                                "0 12px 35px rgba(17,24,39,0.05)",

                            marginBottom:
                                "22px",
                        }}
                    >
                        <h2
                            style={{
                                margin:
                                    0,

                                fontSize:
                                    "20px",

                                fontWeight:
                                    "800",
                            }}
                        >
                            Fotografii
                        </h2>

                        <p
                            style={{
                                color:
                                    "#6b7280",

                                fontSize:
                                    "14px",

                                lineHeight:
                                    "1.6",

                                margin:
                                    "8px 0 22px",
                            }}
                        >
                            Adaugă între 1 și 10 fotografii. Prima fotografie va fi coperta anunțului.
                        </p>

                        <label
                            style={{
                                display:
                                    "block",

                                border:
                                    "2px dashed #d1d5db",

                                borderRadius:
                                    "14px",

                                padding:
                                    "28px 20px",

                                textAlign:
                                    "center",

                                cursor:
                                    images.length >=
                                    10
                                        ? "not-allowed"
                                        : "pointer",

                                background:
                                    "#fafafa",
                            }}
                        >
                            <input
                                type="file"
                                accept="image/*"
                                multiple
                                disabled={
                                    images.length >=
                                    10
                                }
                                onChange={
                                    handleImages
                                }
                                style={{
                                    display:
                                        "none",
                                }}
                            />

                            <div
                                style={{
                                    fontSize:
                                        "15px",

                                    fontWeight:
                                        "800",

                                    color:
                                        "#111827",
                                }}
                            >
                                {images.length >=
                                10
                                    ? "Ai adăugat numărul maxim de fotografii"
                                    : "Selectează fotografii"}
                            </div>

                            <div
                                style={{
                                    color:
                                        "#6b7280",

                                    fontSize:
                                        "13px",

                                    marginTop:
                                        "7px",
                                }}
                            >
                                {images.length}/10 fotografii selectate
                            </div>
                        </label>

                        {images.length >
                            0 && (
                            <div
                                style={{
                                    display:
                                        "grid",

                                    gridTemplateColumns:
                                        "repeat(auto-fill, minmax(150px, 1fr))",

                                    gap:
                                        "14px",

                                    marginTop:
                                        "22px",
                                }}
                            >
                                {images.map(
                                    (
                                        image,
                                        index
                                    ) => (
                                        <div
                                            key={`${image.file.name}-${index}`}
                                            style={{
                                                position:
                                                    "relative",

                                                borderRadius:
                                                    "12px",

                                                overflow:
                                                    "hidden",

                                                background:
                                                    "#f3f4f6",

                                                aspectRatio:
                                                    "1 / 1",
                                            }}
                                        >
                                            <img
                                                src={
                                                    image.preview
                                                }
                                                alt={`Fotografie ${index + 1}`}
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

                                            {index ===
                                                0 && (
                                                <div
                                                    style={{
                                                        position:
                                                            "absolute",

                                                        left:
                                                            "8px",

                                                        bottom:
                                                            "8px",

                                                        background:
                                                            "#111827",

                                                        color:
                                                            "#ffffff",

                                                        padding:
                                                            "6px 9px",

                                                        borderRadius:
                                                            "7px",

                                                        fontSize:
                                                            "11px",

                                                        fontWeight:
                                                            "800",
                                                    }}
                                                >
                                                    Copertă
                                                </div>
                                            )}

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    removeImage(
                                                        index
                                                    )
                                                }
                                                style={{
                                                    position:
                                                        "absolute",

                                                    top:
                                                        "8px",

                                                    right:
                                                        "8px",

                                                    width:
                                                        "30px",

                                                    height:
                                                        "30px",

                                                    border:
                                                        "none",

                                                    borderRadius:
                                                        "50%",

                                                    background:
                                                        "#ffffff",

                                                    color:
                                                        "#111827",

                                                    fontFamily:
                                                        "inherit",

                                                    fontSize:
                                                        "17px",

                                                    fontWeight:
                                                        "800",

                                                    cursor:
                                                        "pointer",

                                                    boxShadow:
                                                        "0 2px 8px rgba(0,0,0,0.18)",
                                                }}
                                            >
                                                ×
                                            </button>
                                        </div>
                                    )
                                )}
                            </div>
                        )}
                    </div>

                    {/* DETALII PROPRIETATE */}

                    <div
                        style={{
                            background: "#ffffff",
                            border: "1px solid #e5e7eb",
                            borderRadius: "20px",
                            padding: "32px",
                            boxShadow:
                                "0 12px 35px rgba(17,24,39,0.05)",
                            marginBottom: "22px",
                        }}
                    >
                        <h2
                            style={{
                                margin: "0 0 27px",
                                fontSize: "20px",
                                fontWeight: "800",
                            }}
                        >
                            Detalii proprietate
                        </h2>

                        <div style={fieldStyle}>
                            <label style={labelStyle}>
                                Titlul anunțului
                            </label>

                            <input
                                name="title"
                                type="text"
                                value={form.title}
                                onChange={updateField}
                                placeholder="Ex: Apartament 2 camere în Timișoara"
                                style={inputStyle}
                            />
                        </div>

                        <div style={fieldStyle}>
                            <label style={labelStyle}>
                                Tipul proprietății
                            </label>

                            <select
                                name="property_type"
                                value={form.property_type}
                                onChange={updateField}
                                style={inputStyle}
                            >
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

                        {/* ORAȘ + CARTIER + UNIVERSITĂȚI */}

                        <div
                            className="location-grid"
                            style={{
                                display: "grid",
                                gridTemplateColumns:
                                    "1fr 1fr",
                                gap: "18px",
                                alignItems: "start",
                            }}
                        >
                            <div>
                                <div style={fieldStyle}>
                                    <label style={labelStyle}>
                                        Oraș
                                    </label>

                                    <select
                                        value={form.city}
                                        onChange={handleCityChange}
                                        disabled={loadingLocations}
                                        style={{
                                            ...inputStyle,
                                            cursor: loadingLocations
                                                ? "wait"
                                                : "pointer",
                                        }}
                                    >
                                        <option value="">
                                            {loadingLocations
                                                ? "Se încarcă orașele..."
                                                : "Alege orașul"}
                                        </option>

                                        {cities.map((city) => (
                                            <option
                                                key={city.id}
                                                value={city.name}
                                            >
                                                {city.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div style={fieldStyle}>
                                    <label style={labelStyle}>
                                        Zonă / cartier
                                    </label>

                                    <select
                                        name="neighborhood_id"
                                        value={form.neighborhood_id}
                                        onChange={updateField}
                                        disabled={
                                            !form.city ||
                                            loadingLocations
                                        }
                                        style={{
                                            ...inputStyle,
                                            cursor:
                                                !form.city ||
                                                loadingLocations
                                                    ? "not-allowed"
                                                    : "pointer",
                                        }}
                                    >
                                        <option value="">
                                            {!form.city
                                                ? "Alege mai întâi orașul"
                                                : neighborhoodsForCity.length ===
                                                  0
                                                ? "Nu există cartiere introduse"
                                                : "Alege zona / cartierul"}
                                        </option>

                                        {neighborhoodsForCity.map(
                                            (neighborhood) => (
                                                <option
                                                    key={neighborhood.id}
                                                    value={neighborhood.id}
                                                >
                                                    {neighborhood.name}
                                                </option>
                                            )
                                        )}
                                    </select>
                                </div>

                                {/* MAPBOX AUTOCOMPLETE */}

                                <div
                                    style={{
                                        ...fieldStyle,
                                        position:
                                            "relative",
                                    }}
                                >
                                    <label style={labelStyle}>
                                        Adresa proprietății
                                    </label>

                                    <input
                                        name="address"
                                        type="text"
                                        autoComplete="off"
                                        value={form.address}
                                        onChange={
                                            handleAddressChange
                                        }
                                        onFocus={() => {
                                            if (
                                                addressSuggestions.length >
                                                0
                                            ) {
                                                setAddressSuggestionsOpen(
                                                    true
                                                );
                                            }
                                        }}
                                        disabled={
                                            !form.city
                                        }
                                        placeholder={
                                            form.city
                                                ? "Începe să scrii strada și numărul"
                                                : "Alege mai întâi orașul"
                                        }
                                        style={{
                                            ...inputStyle,

                                            cursor:
                                                form.city
                                                    ? "text"
                                                    : "not-allowed",
                                        }}
                                    />

                                    {loadingAddressSuggestions && (
                                        <div
                                            style={{
                                                position:
                                                    "absolute",

                                                right:
                                                    "14px",

                                                top:
                                                    "43px",

                                                fontSize:
                                                    "12px",

                                                color:
                                                    "#6b7280",

                                                zIndex:
                                                    20,
                                            }}
                                        >
                                            Se caută...
                                        </div>
                                    )}

                                    {addressSuggestionsOpen &&
                                        addressSuggestions.length >
                                            0 && (
                                            <div
                                                style={{
                                                    position:
                                                        "absolute",

                                                    top:
                                                        "78px",

                                                    left:
                                                        0,

                                                    right:
                                                        0,

                                                    zIndex:
                                                        100,

                                                    background:
                                                        "#ffffff",

                                                    border:
                                                        "1px solid #e5e7eb",

                                                    borderRadius:
                                                        "12px",

                                                    overflow:
                                                        "hidden",

                                                    boxShadow:
                                                        "0 12px 30px rgba(17,24,39,0.14)",

                                                    maxHeight:
                                                        "280px",

                                                    overflowY:
                                                        "auto",
                                                }}
                                            >
                                                {addressSuggestions.map(
                                                    (
                                                        suggestion,
                                                        index
                                                    ) => (
                                                        <button
                                                            key={
                                                                suggestion.mapbox_id ||
                                                                index
                                                            }
                                                            type="button"
                                                            onMouseDown={(
                                                                event
                                                            ) => {
                                                                event.preventDefault();

                                                                selectAddressSuggestion(
                                                                    suggestion
                                                                );
                                                            }}
                                                            style={{
                                                                width:
                                                                    "100%",

                                                                border:
                                                                    "none",

                                                                borderBottom:
                                                                    index ===
                                                                    addressSuggestions.length -
                                                                        1
                                                                        ? "none"
                                                                        : "1px solid #f3f4f6",

                                                                background:
                                                                    "#ffffff",

                                                                padding:
                                                                    "12px 14px",

                                                                textAlign:
                                                                    "left",

                                                                cursor:
                                                                    "pointer",

                                                                fontFamily:
                                                                    "inherit",
                                                            }}
                                                        >
                                                            <div
                                                                style={{
                                                                    fontSize:
                                                                        "14px",

                                                                    fontWeight:
                                                                        "700",

                                                                    color:
                                                                        "#111827",

                                                                    lineHeight:
                                                                        "1.35",
                                                                }}
                                                            >
                                                                {suggestion.name}
                                                            </div>

                                                            {suggestion.place_formatted && (
                                                                <div
                                                                    style={{
                                                                        marginTop:
                                                                            "3px",

                                                                        fontSize:
                                                                            "12px",

                                                                        color:
                                                                            "#6b7280",

                                                                        lineHeight:
                                                                            "1.4",
                                                                    }}
                                                                >
                                                                    {
                                                                        suggestion.place_formatted
                                                                    }
                                                                </div>
                                                            )}
                                                        </button>
                                                    )
                                                )}
                                            </div>
                                        )}
                                </div>
                            </div>

                            <div style={fieldStyle}>
                                <label style={labelStyle}>
                                    Universități apropiate (opțional)
                                </label>

                                <div
                                    style={{
                                        border:
                                            "1px solid #d1d5db",
                                        borderRadius:
                                            "11px",
                                        background:
                                            form.city
                                                ? "#ffffff"
                                                : "#f9fafb",
                                        maxHeight:
                                            "280px",
                                        minHeight:
                                            "160px",
                                        overflowY:
                                            "auto",
                                        padding:
                                            "8px",
                                        opacity:
                                            form.city
                                                ? 1
                                                : 0.65,
                                    }}
                                >
                                    {!form.city ? (
                                        <div
                                            style={{
                                                padding:
                                                    "8px",
                                                color:
                                                    "#6b7280",
                                                fontSize:
                                                    "14px",
                                            }}
                                        >
                                            Alege mai întâi orașul
                                        </div>
                                    ) : loadingUniversities ? (
                                        <div
                                            style={{
                                                padding:
                                                    "8px",
                                                color:
                                                    "#6b7280",
                                                fontSize:
                                                    "14px",
                                            }}
                                        >
                                            Se încarcă universitățile...
                                        </div>
                                    ) : universitiesForCity.length ===
                                      0 ? (
                                        <div
                                            style={{
                                                padding:
                                                    "8px",
                                                color:
                                                    "#6b7280",
                                                fontSize:
                                                    "14px",
                                            }}
                                        >
                                            Nu există universități disponibile pentru acest oraș.
                                        </div>
                                    ) : (
                                        universitiesForCity.map(
                                            (university) => {
                                                const checked =
                                                    selectedUniversityIds.includes(
                                                        university.id
                                                    );

                                                return (
                                                    <label
                                                        key={
                                                            university.id
                                                        }
                                                        style={{
                                                            display:
                                                                "flex",
                                                            alignItems:
                                                                "flex-start",
                                                            gap:
                                                                "10px",
                                                            padding:
                                                                "10px",
                                                            borderRadius:
                                                                "9px",
                                                            cursor:
                                                                "pointer",
                                                            background:
                                                                checked
                                                                    ? "#eff6ff"
                                                                    : "transparent",
                                                        }}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={
                                                                checked
                                                            }
                                                            onChange={() => {
                                                                setSelectedUniversityIds(
                                                                    (
                                                                        current
                                                                    ) =>
                                                                        current.includes(
                                                                            university.id
                                                                        )
                                                                            ? current.filter(
                                                                                  (
                                                                                      id
                                                                                  ) =>
                                                                                      id !==
                                                                                      university.id
                                                                              )
                                                                            : [
                                                                                  ...current,
                                                                                  university.id,
                                                                              ]
                                                                );
                                                            }}
                                                            style={{
                                                                marginTop:
                                                                    "2px",
                                                                width:
                                                                    "16px",
                                                                height:
                                                                    "16px",
                                                                cursor:
                                                                    "pointer",
                                                            }}
                                                        />

                                                        <span
                                                            style={{
                                                                fontSize:
                                                                    "14px",
                                                                lineHeight:
                                                                    "1.4",
                                                                color:
                                                                    "#111827",
                                                                fontWeight:
                                                                    checked
                                                                        ? "700"
                                                                        : "500",
                                                            }}
                                                        >
                                                            {university.short_name
                                                                ? `${university.short_name} — ${university.name}`
                                                                : university.name}
                                                        </span>
                                                    </label>
                                                );
                                            }
                                        )
                                    )}
                                </div>

                                {form.city &&
                                    selectedUniversityIds.length >
                                        0 && (
                                        <div
                                            style={{
                                                marginTop:
                                                    "8px",
                                                color:
                                                    "#2563eb",
                                                fontSize:
                                                    "12px",
                                                fontWeight:
                                                    "700",
                                            }}
                                        >
                                            {selectedUniversityIds.length ===
                                            1
                                                ? "1 universitate selectată"
                                                : `${selectedUniversityIds.length} universități selectate`}
                                        </div>
                                    )}
                            </div>
                        </div>

                        <div
                            style={{
                                background: "#eff6ff",
                                border:
                                    "1px solid #dbeafe",
                                color: "#1e40af",
                                borderRadius:
                                    "11px",
                                padding:
                                    "12px 14px",
                                fontSize:
                                    "13px",
                                lineHeight:
                                    "1.5",
                                marginBottom:
                                    "22px",
                            }}
                        >
                            Selectează orașul și zona / cartierul proprietății.
                            Universitățile apropiate sunt opționale.
                        </div>

                        {/* PREȚ + DATA DISPONIBILITĂȚII */}
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "1fr 1fr",
                                gap: "18px",
                                alignItems: "start",
                            }}
                        >
                            <div style={fieldStyle}>
                                <label style={labelStyle}>
                                    Preț / lună (€)
                                </label>

                                <input
                                    name="price_monthly"
                                    type="number"
                                    min="1"
                                    step="1"
                                    value={form.price_monthly}
                                    onChange={updateField}
                                    placeholder="450"
                                    style={inputStyle}
                                />
                            </div>

                            <div
                                ref={calendarRef}
                                style={{
                                    ...fieldStyle,
                                    position: "relative",
                                }}
                            >
                                <label style={labelStyle}>
                                    Disponibil de la
                                </label>

                                <button
                                    type="button"
                                    onClick={openCalendar}
                                    style={{
                                        ...inputStyle,
                                        height: "49px",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        textAlign: "left",
                                        cursor: "pointer",
                                        color: form.available_from
                                            ? "#111827"
                                            : "#9ca3af",
                                    }}
                                >
                                    <span>
                                        {form.available_from
                                            ? formatRomanianDate(
                                                  form.available_from
                                              )
                                            : "ZZ/LL/AAAA"}
                                    </span>

                                    <span
                                        style={{
                                            width: "20px",
                                            height: "20px",
                                            display: "inline-flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            color: "#6b7280",
                                        }}
                                    >
                                        ▣
                                    </span>
                                </button>

                                {calendarOpen && (
                                    <div
                                        style={{
                                            position: "absolute",
                                            top: "82px",
                                            left: 0,
                                            width: "100%",
                                            minWidth: "310px",
                                            background: "#ffffff",
                                            border: "1px solid #e5e7eb",
                                            borderRadius: "14px",
                                            padding: "16px",
                                            boxShadow:
                                                "0 18px 45px rgba(17,24,39,0.16)",
                                            zIndex: 100,
                                            boxSizing: "border-box",
                                        }}
                                    >
                                        <div
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent:
                                                    "space-between",
                                                marginBottom: "16px",
                                            }}
                                        >
                                            <button
                                                type="button"
                                                disabled={
                                                    !canGoToPreviousMonth
                                                }
                                                onClick={
                                                    previousCalendarMonth
                                                }
                                                style={{
                                                    width: "36px",
                                                    height: "36px",
                                                    border:
                                                        "1px solid #e5e7eb",
                                                    borderRadius: "9px",
                                                    background: "#ffffff",
                                                    fontSize: "22px",
                                                    lineHeight: 1,
                                                    cursor:
                                                        canGoToPreviousMonth
                                                            ? "pointer"
                                                            : "not-allowed",
                                                    color:
                                                        canGoToPreviousMonth
                                                            ? "#111827"
                                                            : "#d1d5db",
                                                }}
                                            >
                                                ‹
                                            </button>

                                            <div
                                                style={{
                                                    fontSize: "15px",
                                                    fontWeight: "800",
                                                    color: "#111827",
                                                }}
                                            >
                                                {
                                                    romanianMonths[
                                                        calendarMonthIndex
                                                    ]
                                                }{" "}
                                                {calendarYear}
                                            </div>

                                            <button
                                                type="button"
                                                onClick={
                                                    nextCalendarMonth
                                                }
                                                style={{
                                                    width: "36px",
                                                    height: "36px",
                                                    border:
                                                        "1px solid #e5e7eb",
                                                    borderRadius: "9px",
                                                    background: "#ffffff",
                                                    fontSize: "22px",
                                                    lineHeight: 1,
                                                    cursor: "pointer",
                                                    color: "#111827",
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
                                                gap: "5px",
                                                marginBottom: "6px",
                                            }}
                                        >
                                            {[
                                                "Lu",
                                                "Ma",
                                                "Mi",
                                                "Jo",
                                                "Vi",
                                                "Sâ",
                                                "Du",
                                            ].map((dayName) => (
                                                <div
                                                    key={dayName}
                                                    style={{
                                                        textAlign:
                                                            "center",
                                                        fontSize:
                                                            "11px",
                                                        fontWeight:
                                                            "800",
                                                        color:
                                                            "#9ca3af",
                                                        padding:
                                                            "5px 0",
                                                    }}
                                                >
                                                    {dayName}
                                                </div>
                                            ))}
                                        </div>

                                        <div
                                            style={{
                                                display: "grid",
                                                gridTemplateColumns:
                                                    "repeat(7, 1fr)",
                                                gap: "5px",
                                            }}
                                        >
                                            {calendarCells.map(
                                                (day, index) => {
                                                    if (!day) {
                                                        return (
                                                            <div
                                                                key={`empty-${index}`}
                                                                style={{
                                                                    height:
                                                                        "36px",
                                                                }}
                                                            />
                                                        );
                                                    }

                                                    const cellDate =
                                                        new Date(
                                                            calendarYear,
                                                            calendarMonthIndex,
                                                            day
                                                        );

                                                    const disabled =
                                                        cellDate <
                                                        getTodayAtMidnight();

                                                    const selected =
                                                        form.available_from ===
                                                        `${calendarYear}-${String(
                                                            calendarMonthIndex +
                                                                1
                                                        ).padStart(
                                                            2,
                                                            "0"
                                                        )}-${String(
                                                            day
                                                        ).padStart(
                                                            2,
                                                            "0"
                                                        )}`;

                                                    return (
                                                        <button
                                                            key={day}
                                                            type="button"
                                                            disabled={
                                                                disabled
                                                            }
                                                            onClick={() =>
                                                                selectCalendarDate(
                                                                    calendarYear,
                                                                    calendarMonthIndex,
                                                                    day
                                                                )
                                                            }
                                                            style={{
                                                                height:
                                                                    "36px",
                                                                border:
                                                                    selected
                                                                        ? "1px solid #2563eb"
                                                                        : "1px solid transparent",
                                                                borderRadius:
                                                                    "8px",
                                                                background:
                                                                    selected
                                                                        ? "#2563eb"
                                                                        : "#ffffff",
                                                                color:
                                                                    selected
                                                                        ? "#ffffff"
                                                                        : disabled
                                                                        ? "#d1d5db"
                                                                        : "#111827",
                                                                fontSize:
                                                                    "13px",
                                                                fontWeight:
                                                                    selected
                                                                        ? "800"
                                                                        : "600",
                                                                cursor:
                                                                    disabled
                                                                        ? "not-allowed"
                                                                        : "pointer",
                                                            }}
                                                        >
                                                            {day}
                                                        </button>
                                                    );
                                                }
                                            )}
                                        </div>

                                        {form.available_from && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setForm(
                                                        (current) => ({
                                                            ...current,
                                                            available_from:
                                                                "",
                                                        })
                                                    );

                                                    setCalendarOpen(
                                                        false
                                                    );
                                                }}
                                                style={{
                                                    width: "100%",
                                                    marginTop: "13px",
                                                    border:
                                                        "1px solid #e5e7eb",
                                                    borderRadius: "9px",
                                                    background:
                                                        "#ffffff",
                                                    padding:
                                                        "9px 12px",
                                                    fontFamily:
                                                        "inherit",
                                                    fontSize:
                                                        "12px",
                                                    fontWeight:
                                                        "700",
                                                    color:
                                                        "#4b5563",
                                                    cursor:
                                                        "pointer",
                                                }}
                                            >
                                                Șterge data
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* CAMERE */}

                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns:
                                    "repeat(2, minmax(0, 1fr))",
                                gap: "18px",
                            }}
                        >
                            <div style={fieldStyle}>
                                <label style={labelStyle}>
                                    Număr camere
                                </label>

                                <input
                                    name="rooms"
                                    type="number"
                                    min="1"
                                    value={form.rooms}
                                    onChange={updateField}
                                    placeholder="2"
                                    style={inputStyle}
                                />
                            </div>

                            <div style={fieldStyle}>
                                <label style={labelStyle}>
                                    Dormitoare
                                </label>

                                <input
                                    name="bedrooms"
                                    type="number"
                                    min="0"
                                    value={form.bedrooms}
                                    onChange={updateField}
                                    placeholder="1"
                                    style={inputStyle}
                                />
                            </div>

                            <div style={fieldStyle}>
                                <label style={labelStyle}>
                                    Băi
                                </label>

                                <input
                                    name="bathrooms"
                                    type="number"
                                    min="1"
                                    value={form.bathrooms}
                                    onChange={updateField}
                                    placeholder="1"
                                    style={inputStyle}
                                />
                            </div>

                            <div style={fieldStyle}>
                                <label style={labelStyle}>
                                    Suprafață (m²)
                                </label>

                                <input
                                    name="surface_m2"
                                    type="number"
                                    min="1"
                                    value={form.surface_m2}
                                    onChange={updateField}
                                    placeholder="55"
                                    style={inputStyle}
                                />
                            </div>
                        </div>

                        <div style={fieldStyle}>
                            <label style={labelStyle}>
                                Mobilat
                            </label>

                            <select
                                name="furnished"
                                value={form.furnished}
                                onChange={updateField}
                                style={inputStyle}
                            >
                                <option value="true">
                                    Da
                                </option>

                                <option value="false">
                                    Nu
                                </option>
                            </select>
                        </div>

                        {/* DETALII SUPLIMENTARE */}

                        <div
                            style={{
                                marginTop: "8px",
                                paddingTop: "28px",
                                borderTop:
                                    "1px solid #e5e7eb",
                            }}
                        >
                            <h3
                                style={{
                                    margin: "0 0 8px",
                                    fontSize: "17px",
                                    fontWeight: "800",
                                }}
                            >
                                Detalii suplimentare
                            </h3>

                            <p
                                style={{
                                    margin: "0 0 24px",
                                    color: "#6b7280",
                                    fontSize: "14px",
                                    lineHeight: "1.6",
                                }}
                            >
                                Adaugă informații utile pentru studenții
                                interesați de proprietate.
                            </p>

                            <div
                                style={{
                                    display: "grid",
                                    gridTemplateColumns:
                                        "repeat(2, minmax(0, 1fr))",
                                    gap: "18px",
                                }}
                            >
                                <div style={fieldStyle}>
                                    <label style={labelStyle}>
                                        Etaj
                                    </label>

                                    <input
                                        name="floor"
                                        type="number"
                                        min="0"
                                        value={form.floor}
                                        onChange={updateField}
                                        placeholder="3"
                                        style={inputStyle}
                                    />
                                </div>

                                <div style={fieldStyle}>
                                    <label style={labelStyle}>
                                        Număr total de etaje
                                    </label>

                                    <input
                                        name="total_floors"
                                        type="number"
                                        min="0"
                                        value={form.total_floors}
                                        onChange={updateField}
                                        placeholder="6"
                                        style={inputStyle}
                                    />
                                </div>

                                <div style={fieldStyle}>
                                    <label style={labelStyle}>
                                        Anul construcției
                                    </label>

                                    <input
                                        name="construction_year"
                                        type="number"
                                        min="1800"
                                        max={
                                            new Date().getFullYear()
                                        }
                                        value={
                                            form.construction_year
                                        }
                                        onChange={updateField}
                                        placeholder="2018"
                                        style={inputStyle}
                                    />
                                </div>

                                <div style={fieldStyle}>
                                    <label style={labelStyle}>
                                        Tip încălzire
                                    </label>

                                    <select
                                        name="heating_type"
                                        value={
                                            form.heating_type
                                        }
                                        onChange={updateField}
                                        style={inputStyle}
                                    >
                                        <option value="">
                                            Alege tipul de încălzire
                                        </option>

                                        <option value="Centrala proprie">
                                            Centrală proprie
                                        </option>

                                        <option value="Centrala blocului">
                                            Centrală de bloc
                                        </option>

                                        <option value="Termoficare">
                                            Termoficare
                                        </option>

                                        <option value="Incalzire electrica">
                                            Încălzire electrică
                                        </option>

                                        <option value="Pompa de caldura">
                                            Pompă de căldură
                                        </option>

                                        <option value="Alta">
                                            Alta
                                        </option>
                                    </select>
                                </div>

                                <div style={fieldStyle}>
                                    <label style={labelStyle}>
                                        Număr maxim de chiriași
                                    </label>

                                    <input
                                        name="max_tenants"
                                        type="number"
                                        min="1"
                                        value={
                                            form.max_tenants
                                        }
                                        onChange={updateField}
                                        placeholder="2"
                                        style={inputStyle}
                                    />
                                </div>

                                <div style={fieldStyle}>
                                    <label style={labelStyle}>
                                        Garanție (€)
                                    </label>

                                    <input
                                        name="deposit_amount"
                                        type="number"
                                        min="0"
                                        step="1"
                                        value={
                                            form.deposit_amount
                                        }
                                        onChange={updateField}
                                        placeholder="450"
                                        style={inputStyle}
                                    />
                                </div>
                            </div>

                            <div
                                style={{
                                    display: "grid",
                                    gridTemplateColumns:
                                        "repeat(2, minmax(0, 1fr))",
                                    gap: "18px",
                                }}
                            >
                                <div style={fieldStyle}>
                                    <label style={labelStyle}>
                                        Aer condiționat
                                    </label>

                                    <select
                                        name="air_conditioning"
                                        value={
                                            form.air_conditioning
                                        }
                                        onChange={updateField}
                                        style={inputStyle}
                                    >
                                        <option value="false">
                                            Nu
                                        </option>
                                        <option value="true">
                                            Da
                                        </option>
                                    </select>
                                </div>

                                <div style={fieldStyle}>
                                    <label style={labelStyle}>
                                        Balcon
                                    </label>

                                    <select
                                        name="balcony"
                                        value={form.balcony}
                                        onChange={updateField}
                                        style={inputStyle}
                                    >
                                        <option value="false">
                                            Nu
                                        </option>
                                        <option value="true">
                                            Da
                                        </option>
                                    </select>
                                </div>

                                <div style={fieldStyle}>
                                    <label style={labelStyle}>
                                        Parcare
                                    </label>

                                    <select
                                        name="parking"
                                        value={form.parking}
                                        onChange={updateField}
                                        style={inputStyle}
                                    >
                                        <option value="false">
                                            Nu
                                        </option>
                                        <option value="true">
                                            Da
                                        </option>
                                    </select>
                                </div>

                                <div style={fieldStyle}>
                                    <label style={labelStyle}>
                                        Animale de companie acceptate
                                    </label>

                                    <select
                                        name="pets_allowed"
                                        value={
                                            form.pets_allowed
                                        }
                                        onChange={updateField}
                                        style={inputStyle}
                                    >
                                        <option value="false">
                                            Nu
                                        </option>
                                        <option value="true">
                                            Da
                                        </option>
                                    </select>
                                </div>

                                <div style={fieldStyle}>
                                    <label style={labelStyle}>
                                        Fumat permis
                                    </label>

                                    <select
                                        name="smoking_allowed"
                                        value={
                                            form.smoking_allowed
                                        }
                                        onChange={updateField}
                                        style={inputStyle}
                                    >
                                        <option value="false">
                                            Nu
                                        </option>
                                        <option value="true">
                                            Da
                                        </option>
                                    </select>
                                </div>

                                <div style={fieldStyle}>
                                    <label style={labelStyle}>
                                        Utilități incluse în preț
                                    </label>

                                    <select
                                        name="utilities_included"
                                        value={
                                            form.utilities_included
                                        }
                                        onChange={updateField}
                                        style={inputStyle}
                                    >
                                        <option value="false">
                                            Nu
                                        </option>
                                        <option value="true">
                                            Da
                                        </option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* DESCRIERE */}

                        <div
                            style={{
                                marginTop: "8px",
                                paddingTop: "30px",
                                borderTop:
                                    "1px solid #e5e7eb",
                            }}
                        >
                            <label style={labelStyle}>
                                Descriere
                            </label>

                            <textarea
                                name="description"
                                value={form.description}
                                onChange={updateField}
                                placeholder="Descrie proprietatea, zona, facilitățile și alte informații utile..."
                                rows={7}
                                style={{
                                    ...inputStyle,
                                    resize: "vertical",
                                    lineHeight: "1.6",
                                }}
                            />
                        </div>
                    </div>

                    {/* DATE CONTACT DIN PROFIL */}

                    <div
                        style={{
                            background: "#ffffff",
                            border:
                                "1px solid #e5e7eb",
                            borderRadius: "20px",
                            padding: "32px",
                            boxShadow:
                                "0 12px 35px rgba(17,24,39,0.05)",
                            marginBottom: "22px",
                        }}
                    >
                        <h2
                            style={{
                                margin: "0 0 8px",
                                fontSize: "20px",
                                fontWeight: "800",
                            }}
                        >
                            Date de contact
                        </h2>

                        <p
                            style={{
                                margin: "0 0 27px",
                                color: "#6b7280",
                                fontSize: "14px",
                                lineHeight: "1.6",
                            }}
                        >
                            Datele sunt preluate automat din profilul tău.
                        </p>

                        <div style={fieldStyle}>
                            <label style={labelStyle}>
                                Nickname
                            </label>

                            <input
                                type="text"
                                value={form.owner_name}
                                readOnly
                                style={{
                                    ...inputStyle,
                                    background:
                                        "#f9fafb",
                                    color: "#4b5563",
                                }}
                            />
                        </div>

                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns:
                                    "1fr 1fr",
                                gap: "18px",
                            }}
                        >
                            <div>
                                <label style={labelStyle}>
                                    Telefon
                                </label>

                                <input
                                    type="tel"
                                    value={
                                        form.owner_phone
                                    }
                                    readOnly
                                    style={{
                                        ...inputStyle,
                                        background:
                                            "#f9fafb",
                                        color: "#4b5563",
                                    }}
                                />
                            </div>

                            <div>
                                <label style={labelStyle}>
                                    Email
                                </label>

                                <input
                                    type="email"
                                    value={
                                        user?.email || ""
                                    }
                                    readOnly
                                    style={{
                                        ...inputStyle,
                                        background:
                                            "#f9fafb",
                                        color: "#4b5563",
                                    }}
                                />
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() =>
                                router.push(
                                    "/dashboard?section=profile"
                                )
                            }
                            style={{
                                marginTop: "18px",
                                border: "none",
                                background:
                                    "transparent",
                                padding: 0,
                                color: "#2563eb",
                                fontFamily:
                                    "inherit",
                                fontSize: "13px",
                                fontWeight: "700",
                                cursor: "pointer",
                            }}
                        >
                            Modifică datele în Profilul meu →
                        </button>
                    </div>

                    {/* ERORI */}

                    {error && (
                        <div
                            style={{
                                background: "#fef2f2",
                                border:
                                    "1px solid #fecaca",
                                color: "#b91c1c",
                                borderRadius: "12px",
                                padding:
                                    "14px 16px",
                                fontSize: "14px",
                                lineHeight: "1.5",
                                marginBottom: "18px",
                            }}
                        >
                            {error}
                        </div>
                    )}

                    {/* SUCCESS */}

                    {success && (
                        <div
                            style={{
                                background: "#f0fdf4",
                                border:
                                    "1px solid #bbf7d0",
                                color: "#166534",
                                borderRadius: "12px",
                                padding:
                                    "14px 16px",
                                fontSize: "14px",
                                fontWeight: "600",
                                lineHeight: "1.5",
                                marginBottom: "18px",
                            }}
                        >
                            {success}
                        </div>
                    )}

                    {/* PUBLICARE */}

                    <div
                        style={{
                            background: "#ffffff",
                            border:
                                "1px solid #e5e7eb",
                            borderRadius: "18px",
                            padding: "22px",
                            display: "flex",
                            justifyContent:
                                "space-between",
                            alignItems: "center",
                            gap: "20px",
                        }}
                    >
                        <div>
                            <div
                                style={{
                                    fontSize: "15px",
                                    fontWeight: "800",
                                }}
                            >
                                Gata de publicare?
                            </div>

                            <div
                                style={{
                                    color: "#6b7280",
                                    fontSize: "13px",
                                    marginTop: "5px",
                                }}
                            >
                                Verifică informațiile și fotografiile înainte
                                de publicare. Asocierea cu universități este
                                opțională.
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={publishing}
                            style={{
                                border: "none",
                                borderRadius: "11px",
                                padding:
                                    "14px 24px",
                                background: publishing
                                    ? "#374151"
                                    : "#111827",
                                color: "#ffffff",
                                fontFamily:
                                    "inherit",
                                fontSize: "14px",
                                fontWeight: "800",
                                cursor: publishing
                                    ? "not-allowed"
                                    : "pointer",
                                whiteSpace:
                                    "nowrap",
                            }}
                        >
                            {publishing
                                ? "Se publică..."
                                : "Publică anunțul"}
                        </button>
                    </div>
                </form>
            </section>

            <style jsx>{`
                @media (max-width: 760px) {
                    .location-grid {
                        grid-template-columns: 1fr !important;
                    }
                }
            `}</style>
        </main>
    );
}
