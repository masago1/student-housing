"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function EditeazaProprietatePage() {
    const router = useRouter();
    const params = useParams();

    const listingId = params?.id;

    const [user, setUser] = useState(null);
    const [checkingAuth, setCheckingAuth] = useState(true);
    const [loadingListing, setLoadingListing] = useState(true);
    const [saving, setSaving] = useState(false);

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    /*
        images poate conține două tipuri:

        1. fotografie deja existentă:
        {
            id,
            image_url,
            storage_path,
            position,
            existing: true
        }

        2. fotografie nou selectată:
        {
            file,
            preview,
            existing: false
        }
    */

    const [images, setImages] = useState([]);
    const [removedExistingImages, setRemovedExistingImages] =
        useState([]);

    const [universities, setUniversities] = useState([]);
    const [loadingUniversities, setLoadingUniversities] =
        useState(true);

    const [selectedUniversityIds, setSelectedUniversityIds] =
        useState([]);

    const [cities, setCities] = useState([]);
    const [neighborhoods, setNeighborhoods] = useState([]);
    const [loadingLocations, setLoadingLocations] =
        useState(true);

    /* =========================
       MAPBOX AUTOCOMPLETE
    ========================= */

    const [addressSuggestions, setAddressSuggestions] =
        useState([]);

    const [
        loadingAddressSuggestions,
        setLoadingAddressSuggestions,
    ] = useState(false);

    const [
        addressSuggestionsOpen,
        setAddressSuggestionsOpen,
    ] = useState(false);

    const [
        selectedAddressCoordinates,
        setSelectedAddressCoordinates,
    ] = useState(null);

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

    const [calendarOpen, setCalendarOpen] =
        useState(false);

    const [calendarMonth, setCalendarMonth] =
        useState(() => {
            const now = new Date();

            return new Date(
                now.getFullYear(),
                now.getMonth(),
                1
            );
        });

    /* =========================
       FORMULAR
    ========================= */

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
        owner_email: "",
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
                .select("name, phone")
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

            if (!profilePhone) {
                router.replace(
                    "/dashboard?section=profile&required=phone"
                );

                return;
            }

            setForm((current) => ({
                ...current,

                owner_name:
                    current.owner_name ||
                    profile?.name ||
                    user.user_metadata?.name ||
                    "",

                owner_phone:
                    profilePhone,

                owner_email:
                    current.owner_email ||
                    user.email ||
                    "",
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
       ÎNCĂRCARE ANUNȚ EXISTENT
    ========================= */

    useEffect(() => {
        if (
            checkingAuth ||
            !user ||
            !listingId
        ) {
            return;
        }

        const loadListing = async () => {
            setLoadingListing(true);
            setError("");

            try {
                const {
                    data: listing,
                    error: listingError,
                } = await supabase
                    .from("listings")
                    .select("*")
                    .eq("id", listingId)
                    .eq("user_id", user.id)
                    .maybeSingle();

                if (listingError) {
                    throw listingError;
                }

                if (!listing) {
                    setError(
                        "Anunțul nu există sau nu ai permisiunea să îl editezi."
                    );

                    setLoadingListing(false);
                    return;
                }

                setForm({
                    title:
                        listing.title || "",

                    property_type:
                        listing.property_type ||
                        "apartment",

                    city:
                        listing.city || "",

                    neighborhood_id:
                        listing.neighborhood_id != null
                            ? String(
                                  listing.neighborhood_id
                              )
                            : "",

                    address:
                        listing.address || "",

                    price_monthly:
                        listing.price_monthly != null
                            ? String(
                                  listing.price_monthly
                              )
                            : "",

                    rooms:
                        listing.rooms != null
                            ? String(listing.rooms)
                            : "",

                    bedrooms:
                        listing.bedrooms != null
                            ? String(
                                  listing.bedrooms
                              )
                            : "",

                    bathrooms:
                        listing.bathrooms != null
                            ? String(
                                  listing.bathrooms
                              )
                            : "",

                    surface_m2:
                        listing.surface_m2 != null
                            ? String(
                                  listing.surface_m2
                              )
                            : "",

                    furnished:
                        listing.furnished
                            ? "true"
                            : "false",

                    available_from:
                        listing.available_from
                            ? String(
                                  listing.available_from
                              ).slice(0, 10)
                            : "",

                    description:
                        listing.description || "",

                    floor:
                        listing.floor != null
                            ? String(
                                  listing.floor
                              )
                            : "",

                    total_floors:
                        listing.total_floors != null
                            ? String(
                                  listing.total_floors
                              )
                            : "",

                    construction_year:
                        listing.construction_year != null
                            ? String(
                                  listing.construction_year
                              )
                            : "",

                    heating_type:
                        listing.heating_type || "",

                    air_conditioning:
                        listing.air_conditioning
                            ? "true"
                            : "false",

                    balcony:
                        listing.balcony
                            ? "true"
                            : "false",

                    parking:
                        listing.parking
                            ? "true"
                            : "false",

                    pets_allowed:
                        listing.pets_allowed
                            ? "true"
                            : "false",

                    smoking_allowed:
                        listing.smoking_allowed
                            ? "true"
                            : "false",

                    max_tenants:
                        listing.max_tenants != null
                            ? String(
                                  listing.max_tenants
                              )
                            : "",

                    deposit_amount:
                        listing.deposit_amount != null
                            ? String(
                                  listing.deposit_amount
                              )
                            : "",

                    utilities_included:
                        listing.utilities_included
                            ? "true"
                            : "false",

                    owner_name:
                        listing.owner_name ||
                        user.user_metadata?.name ||
                        "",

                    owner_phone:
                        listing.owner_phone || "",

                    owner_email:
                        listing.owner_email ||
                        user.email ||
                        "",
                });

                const existingLatitude =
                    Number(
                        listing.latitude
                    );

                const existingLongitude =
                    Number(
                        listing.longitude
                    );

                if (
                    Number.isFinite(
                        existingLatitude
                    ) &&
                    Number.isFinite(
                        existingLongitude
                    )
                ) {
                    setSelectedAddressCoordinates({
                        latitude:
                            existingLatitude,

                        longitude:
                            existingLongitude,
                    });
                } else {
                    setSelectedAddressCoordinates(
                        null
                    );
                }

                /* =========================
                   POZE EXISTENTE
                ========================= */

                const {
                    data: existingImages,
                    error: imagesError,
                } = await supabase
                    .from("listing_images")
                    .select(
                        "id, image_url, storage_path, position"
                    )
                    .eq(
                        "listing_id",
                        listingId
                    )
                    .order(
                        "position",
                        {
                            ascending: true,
                        }
                    );

                if (imagesError) {
                    throw imagesError;
                }

                setImages(
                    (existingImages || []).map(
                        (image) => ({
                            ...image,
                            existing: true,
                        })
                    )
                );

                /* =========================
                   UNIVERSITĂȚI EXISTENTE
                ========================= */

                const {
                    data: universityLinks,
                    error: universityLinksError,
                } = await supabase
                    .from(
                        "listing_universities"
                    )
                    .select(
                        "university_id"
                    )
                    .eq(
                        "listing_id",
                        listingId
                    );

                if (
                    universityLinksError
                ) {
                    throw universityLinksError;
                }

                setSelectedUniversityIds(
                    (
                        universityLinks ||
                        []
                    ).map(
                        (link) =>
                            link.university_id
                    )
                );
            } catch (loadError) {
                console.error(
                    "Eroare încărcare anunț:",
                    loadError
                );

                setError(
                    "Anunțul nu a putut fi încărcat."
                );
            } finally {
                setLoadingListing(false);
            }
        };

        loadListing();
    }, [
        checkingAuth,
        user,
        listingId,
    ]);

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
                    city.name ===
                    form.city
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

        setSelectedAddressCoordinates(
            null
        );

        setAddressSuggestions([]);
        setAddressSuggestionsOpen(false);

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

        const requestId =
            ++addressRequestIdRef.current;

        const timer =
            setTimeout(
                async () => {
                    try {
                        setLoadingAddressSuggestions(
                            true
                        );

                        const sessionToken =
                            getMapboxSessionToken();

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
       POZE NOI
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
                "Poți avea maximum 10 fotografii."
            );

            event.target.value = "";
            return;
        }

        if (
            selectedFiles.length >
            remainingSlots
        ) {
            setError(
                `Poți avea maximum 10 fotografii. Mai poți selecta ${remainingSlots}.`
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

                existing: false,
            });
        }

        setImages((current) => [
            ...current,
            ...validFiles,
        ]);

        event.target.value = "";
    };

    /* =========================
       ȘTERGERE POZĂ
    ========================= */

    const removeImage = (
        index
    ) => {
        setImages((current) => {
            const imageToRemove =
                current[index];

            if (
                imageToRemove?.existing
            ) {
                setRemovedExistingImages(
                    (removed) => [
                        ...removed,
                        imageToRemove,
                    ]
                );
            }

            if (
                !imageToRemove?.existing &&
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
       CLEANUP POZE NOI
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
        IMPORTANT:
        această funcție trebuie definită înainte
        de openCalendar.
    */

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

    const mondayOffset =
        (firstDayOfMonth + 6) % 7;

    const daysInCalendarMonth =
        new Date(
            calendarYear,
            calendarMonthIndex + 1,
            0
        ).getDate();

    const calendarCells = [
        ...Array(
            mondayOffset
        ).fill(null),

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
       SALVARE MODIFICĂRI
    ========================= */

    const handleSubmit =
        async (event) => {
            event.preventDefault();

            setError("");
            setSuccess("");

            if (
                !user ||
                !listingId
            ) {
                router.replace(
                    "/login"
                );

                return;
            }

            const {
                data: currentProfile,
                error: profileCheckError,
            } = await supabase
                .from("profiles")
                .select("name, phone")
                .eq("id", user.id)
                .maybeSingle();

            if (
                profileCheckError
            ) {
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

            if (!currentPhone) {
                router.push(
                    "/dashboard?section=profile&required=phone"
                );

                return;
            }

            /* =========================
               VALIDĂRI
            ========================= */
                  if (!form.title.trim()) {
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

            /*
                La editare nu blocăm salvarea dacă
                available_from este o dată veche deja
                existentă în anunț.

                Calendarul nu permite selectarea unei
                date noi din trecut.
            */

            if (
                form.floor !== "" &&
                form.total_floors !== "" &&
                Number(
                    form.floor
                ) >
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
                form.construction_year !==
                ""
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
                form.deposit_amount !==
                    "" &&
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
                    "Anunțul trebuie să aibă cel puțin o fotografie."
                );

                return;
            }

            if (
                images.length > 10
            ) {
                setError(
                    "Poți avea maximum 10 fotografii."
                );

                return;
            }

            setSaving(true);

            /*
                Reținem pozele NOI încărcate
                în această salvare.

                Dacă apare o eroare înainte
                de finalizare, le putem șterge
                din Storage.
            */

            const uploadedPaths = [];

            try {
                /* =========================
                   COORDONATE
                ========================= */

                let latitude =
                    selectedAddressCoordinates
                        ?.latitude;

                let longitude =
                    selectedAddressCoordinates
                        ?.longitude;

                /*
                    Dacă adresa nu a fost schimbată,
                    avem coordonatele vechi încărcate
                    la început.

                    Dacă a fost schimbată și utilizatorul
                    a ales o sugestie Mapbox, avem noile
                    coordonate.

                    Dacă a scris manual, folosim fallback-ul
                    /api/geocode.
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
                    currentProfile?.name?.trim() ||
                    form.owner_name.trim() ||
                    user.user_metadata?.name ||
                    "";

                /* =========================
                   DATE ANUNȚ
                ========================= */

                const listingData = {
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
                        form.construction_year !==
                        ""
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

                    owner_email:
                        user.email ||
                        null,
                };

                /* =========================
                   UPDATE ANUNȚ
                ========================= */

                const {
                    error:
                        listingUpdateError,
                } = await supabase
                    .from("listings")
                    .update(
                        listingData
                    )
                    .eq(
                        "id",
                        listingId
                    )
                    .eq(
                        "user_id",
                        user.id
                    );

                if (
                    listingUpdateError
                ) {
                    throw new Error(
                        `Anunțul nu a putut fi actualizat: ${listingUpdateError.message}`
                    );
                }

                /* =========================
                   UNIVERSITĂȚI
                ========================= */

                const {
                    error:
                        deleteUniversitiesError,
                } = await supabase
                    .from(
                        "listing_universities"
                    )
                    .delete()
                    .eq(
                        "listing_id",
                        listingId
                    );

                if (
                    deleteUniversitiesError
                ) {
                    throw new Error(
                        `Asocierile vechi cu universitățile nu au putut fi actualizate: ${deleteUniversitiesError.message}`
                    );
                }

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
                   ȘTERGERE POZE VECHI
                ========================= */

                if (
                    removedExistingImages.length >
                    0
                ) {
                    const imageIdsToDelete =
                        removedExistingImages
                            .map(
                                (image) =>
                                    image.id
                            )
                            .filter(Boolean);

                    if (
                        imageIdsToDelete.length >
                        0
                    ) {
                        const {
                            error:
                                deleteImagesDatabaseError,
                        } = await supabase
                            .from(
                                "listing_images"
                            )
                            .delete()
                            .in(
                                "id",
                                imageIdsToDelete
                            )
                            .eq(
                                "listing_id",
                                listingId
                            );

                        if (
                            deleteImagesDatabaseError
                        ) {
                            throw new Error(
                                `Fotografiile eliminate nu au putut fi șterse: ${deleteImagesDatabaseError.message}`
                            );
                        }
                    }

                    const storagePathsToDelete =
                        removedExistingImages
                            .map(
                                (image) =>
                                    image.storage_path
                            )
                            .filter(Boolean);

                    if (
                        storagePathsToDelete.length >
                        0
                    ) {
                        const {
                            error:
                                storageDeleteError,
                        } =
                            await supabase.storage
                                .from(
                                    "listing-images"
                                )
                                .remove(
                                    storagePathsToDelete
                                );

                        if (
                            storageDeleteError
                        ) {
                            console.error(
                                "Eroare ștergere fotografii din Storage:",
                                storageDeleteError
                            );
                        }
                    }
                }

                /* =========================
                   POZE NOI
                ========================= */

                const newImages =
                    images.filter(
                        (image) =>
                            !image.existing &&
                            image.file
                    );

                const existingImages =
                    images.filter(
                        (image) =>
                            image.existing
                    );

                const uploadedImages =
                    [];

                for (
                    let index = 0;
                    index <
                    newImages.length;
                    index++
                ) {
                    const image =
                        newImages[index];

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
                            `Fotografia nouă ${index + 1} nu a putut fi încărcată: ${uploadError.message}`
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
                            existingImages.length +
                            index,
                    });
                }

                if (
                    uploadedImages.length >
                    0
                ) {
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
                            `Fotografiile noi nu au putut fi asociate anunțului: ${imagesDatabaseError.message}`
                        );
                    }
                }

                /* =========================
                   REORDONARE POZE
                ========================= */

                const {
                    data:
                        finalImages,
                    error:
                        finalImagesError,
                } = await supabase
                    .from(
                        "listing_images"
                    )
                    .select(
                        "id, image_url, storage_path, position"
                    )
                    .eq(
                        "listing_id",
                        listingId
                    )
                    .order(
                        "position",
                        {
                            ascending: true,
                        }
                    );

                if (
                    finalImagesError
                ) {
                    throw new Error(
                        `Lista finală de fotografii nu a putut fi încărcată: ${finalImagesError.message}`
                    );
                }

                for (
                    let index = 0;
                    index <
                    (
                        finalImages ||
                        []
                    ).length;
                    index++
                ) {
                    const image =
                        finalImages[index];

                    if (
                        image.position !==
                        index
                    ) {
                        const {
                            error:
                                positionError,
                        } = await supabase
                            .from(
                                "listing_images"
                            )
                            .update({
                                position:
                                    index,
                            })
                            .eq(
                                "id",
                                image.id
                            )
                            .eq(
                                "listing_id",
                                listingId
                            );

                        if (
                            positionError
                        ) {
                            throw new Error(
                                `Ordinea fotografiilor nu a putut fi actualizată: ${positionError.message}`
                            );
                        }
                    }
                }

                const coverImageUrl =
                    finalImages?.[0]
                        ?.image_url ||
                    null;

                /* =========================
                   ACTUALIZARE COPERTĂ
                ========================= */

                const {
                    error:
                        coverError,
                } = await supabase
                    .from("listings")
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
                        `Coperta anunțului nu a putut fi actualizată: ${coverError.message}`
                    );
                }

                setRemovedExistingImages(
                    []
                );

                setSuccess(
                    "Modificările au fost salvate cu succes."
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
                    "Eroare salvare anunț:",
                    submitError
                );

                await cleanupUploadedFiles(
                    uploadedPaths
                );

                setError(
                    submitError.message ||
                        "A apărut o eroare la salvarea modificărilor."
                );

                setSaving(false);
            }
        };

    /* =========================
       LOADING
    ========================= */

    if (
        checkingAuth ||
        loadingListing
    ) {
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
                {checkingAuth
                    ? "Se verifică profilul..."
                    : "Se încarcă anunțul..."}
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
                    StudentHousing
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
                        Editează proprietatea
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
                        Editează anunțul
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
                        Modifică informațiile proprietății și salvează schimbările.
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
                            Poți păstra fotografiile existente, le poți șterge sau poți adăuga altele noi. Prima fotografie este coperta anunțului.
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
                                    ? "Ai numărul maxim de fotografii"
                                    : "Adaugă fotografii"}
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
                                {images.length}/10 fotografii
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
                                            key={
                                                image.existing
                                                    ? `existing-${image.id}`
                                                    : `new-${image.file?.name}-${index}`
                                            }
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
                                                    image.existing
                                                        ? image.image_url
                                                        : image.preview
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
                                    "0 0 27px",

                                fontSize:
                                    "20px",

                                fontWeight:
                                    "800",
                            }}
                        >
                            Detalii proprietate
                        </h2>

                        <div
                            style={
                                fieldStyle
                            }
                        >
                            <label
                                style={
                                    labelStyle
                                }
                            >
                                Titlul anunțului
                            </label>

                            <input
                                name="title"
                                type="text"
                                value={
                                    form.title
                                }
                                onChange={
                                    updateField
                                }
                                placeholder="Ex: Apartament 2 camere în Timișoara"
                                style={
                                    inputStyle
                                }
                            />
                        </div>

                        <div
                            style={{
                                display:
                                    "grid",

                                gridTemplateColumns:
                                    "repeat(2, minmax(0, 1fr))",

                                gap:
                                    "18px",
                            }}
                        >
                            <div
                                style={
                                    fieldStyle
                                }
                            >
                                <label
                                    style={
                                        labelStyle
                                    }
                                >
                                    Tip proprietate
                                </label>

                                <select
                                    name="property_type"
                                    value={
                                        form.property_type
                                    }
                                    onChange={
                                        updateField
                                    }
                                    style={
                                        inputStyle
                                    }
                                >
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

                            <div
                                style={
                                    fieldStyle
                                }
                            >
                                <label
                                    style={
                                        labelStyle
                                    }
                                >
                                    Preț lunar (€)
                                </label>

                                <input
                                    name="price_monthly"
                                    type="number"
                                    min="1"
                                    value={
                                        form.price_monthly
                                    }
                                    onChange={
                                        updateField
                                    }
                                    placeholder="Ex: 450"
                                    style={
                                        inputStyle
                                    }
                                />
                            </div>
                        </div>

                        <div
                            style={{
                                display:
                                    "grid",

                                gridTemplateColumns:
                                    "repeat(4, minmax(0, 1fr))",

                                gap:
                                    "18px",
                            }}
                        >
                            <div
                                style={
                                    fieldStyle
                                }
                            >
                                <label
                                    style={
                                        labelStyle
                                    }
                                >
                                    Camere
                                </label>

                                <input
                                    name="rooms"
                                    type="number"
                                    min="0"
                                    value={
                                        form.rooms
                                    }
                                    onChange={
                                        updateField
                                    }
                                    style={
                                        inputStyle
                                    }
                                />
                            </div>

                            <div
                                style={
                                    fieldStyle
                                }
                            >
                                <label
                                    style={
                                        labelStyle
                                    }
                                >
                                    Dormitoare
                                </label>

                                <input
                                    name="bedrooms"
                                    type="number"
                                    min="0"
                                    value={
                                        form.bedrooms
                                    }
                                    onChange={
                                        updateField
                                    }
                                    style={
                                        inputStyle
                                    }
                                />
                            </div>

                            <div
                                style={
                                    fieldStyle
                                }
                            >
                                <label
                                    style={
                                        labelStyle
                                    }
                                >
                                    Băi
                                </label>

                                <input
                                    name="bathrooms"
                                    type="number"
                                    min="0"
                                    value={
                                        form.bathrooms
                                    }
                                    onChange={
                                        updateField
                                    }
                                    style={
                                        inputStyle
                                    }
                                />
                            </div>

                            <div
                                style={
                                    fieldStyle
                                }
                            >
                                <label
                                    style={
                                        labelStyle
                                    }
                                >
                                    Suprafață (m²)
                                </label>

                                <input
                                    name="surface_m2"
                                    type="number"
                                    min="0"
                                    value={
                                        form.surface_m2
                                    }
                                    onChange={
                                        updateField
                                    }
                                    style={
                                        inputStyle
                                    }
                                />
                            </div>
                        </div>

                        <div
                            style={{
                                display:
                                    "grid",

                                gridTemplateColumns:
                                    "repeat(2, minmax(0, 1fr))",

                                gap:
                                    "18px",
                            }}
                        >
                            <div
                                style={
                                    fieldStyle
                                }
                            >
                                <label
                                    style={
                                        labelStyle
                                    }
                                >
                                    Mobilată
                                </label>

                                <select
                                    name="furnished"
                                    value={
                                        form.furnished
                                    }
                                    onChange={
                                        updateField
                                    }
                                    style={
                                        inputStyle
                                    }
                                >
                                    <option value="true">
                                        Da
                                    </option>

                                    <option value="false">
                                        Nu
                                    </option>
                                </select>
                            </div>

                            <div
                                style={
                                    fieldStyle
                                }
                            >
                                <label
                                    style={
                                        labelStyle
                                    }
                                >
                                    Disponibilă din
                                </label>

                                <div
                                    style={{
                                        position:
                                            "relative",
                                    }}
                                >
                                    <button
                                        type="button"
                                        onClick={
                                            openCalendar
                                        }
                                        style={{
                                            ...inputStyle,

                                            textAlign:
                                                "left",

                                            cursor:
                                                "pointer",

                                            minHeight:
                                                "50px",
                                        }}
                                    >
                                        {form.available_from
                                            ? formatRomanianDate(
                                                  form.available_from
                                              )
                                            : "Alege data"}
                                    </button>

                                    {calendarOpen && (
                                        <div
                                            style={{
                                                position:
                                                    "absolute",

                                                top:
                                                    "calc(100% + 8px)",

                                                left:
                                                    0,

                                                zIndex:
                                                    50,

                                                width:
                                                    "320px",

                                                maxWidth:
                                                    "100%",

                                                background:
                                                    "#ffffff",

                                                border:
                                                    "1px solid #e5e7eb",

                                                borderRadius:
                                                    "14px",

                                                boxShadow:
                                                    "0 15px 40px rgba(17,24,39,0.15)",

                                                padding:
                                                    "16px",
                                            }}
                                        >
                                            <div
                                                style={{
                                                    display:
                                                        "flex",

                                                    justifyContent:
                                                        "space-between",

                                                    alignItems:
                                                        "center",

                                                    marginBottom:
                                                        "14px",
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
                                                        border:
                                                            "none",

                                                        background:
                                                            "transparent",

                                                        cursor:
                                                            canGoToPreviousMonth
                                                                ? "pointer"
                                                                : "not-allowed",

                                                        opacity:
                                                            canGoToPreviousMonth
                                                                ? 1
                                                                : 0.35,

                                                        fontSize:
                                                            "20px",
                                                    }}
                                                >
                                                    ‹
                                                </button>

                                                <strong>
                                                    {
                                                        romanianMonths[
                                                            calendarMonthIndex
                                                        ]
                                                    }{" "}
                                                    {
                                                        calendarYear
                                                    }
                                                </strong>

                                                <button
                                                    type="button"
                                                    onClick={
                                                        nextCalendarMonth
                                                    }
                                                    style={{
                                                        border:
                                                            "none",

                                                        background:
                                                            "transparent",

                                                        cursor:
                                                            "pointer",

                                                        fontSize:
                                                            "20px",
                                                    }}
                                                >
                                                    ›
                                                </button>
                                            </div>

                                            <div
                                                style={{
                                                    display:
                                                        "grid",

                                                    gridTemplateColumns:
                                                        "repeat(7, 1fr)",

                                                    gap:
                                                        "5px",

                                                    textAlign:
                                                        "center",
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
                                                ].map(
                                                    (
                                                        day
                                                    ) => (
                                                        <div
                                                            key={
                                                                day
                                                            }
                                                            style={{
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
                                                            {
                                                                day
                                                            }
                                                        </div>
                                                    )
                                                )}

                                                {calendarCells.map(
                                                    (
                                                        day,
                                                        index
                                                    ) => {
                                                        if (
                                                            day ===
                                                            null
                                                        ) {
                                                            return (
                                                                <div
                                                                    key={`empty-${index}`}
                                                                />
                                                            );
                                                        }

                                                        const currentDate =
                                                            new Date(
                                                                calendarYear,
                                                                calendarMonthIndex,
                                                                day
                                                            );

                                                        const disabled =
                                                            currentDate <
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
                                                                key={
                                                                    day
                                                                }
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
                                                                    border:
                                                                        "none",

                                                                    borderRadius:
                                                                        "8px",

                                                                    padding:
                                                                        "8px 0",

                                                                    cursor:
                                                                        disabled
                                                                            ? "not-allowed"
                                                                            : "pointer",

                                                                    background:
                                                                        selected
                                                                            ? "#111827"
                                                                            : "transparent",

                                                                    color:
                                                                        selected
                                                                            ? "#ffffff"
                                                                            : disabled
                                                                              ? "#d1d5db"
                                                                              : "#111827",

                                                                    fontFamily:
                                                                        "inherit",

                                                                    fontWeight:
                                                                        selected
                                                                            ? "800"
                                                                            : "600",
                                                                }}
                                                            >
                                                                {
                                                                    day
                                                                }
                                                            </button>
                                                        );
                                                    }
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div
                            style={
                                fieldStyle
                            }
                        >
                            <label
                                style={
                                    labelStyle
                                }
                            >
                                Descriere
                            </label>

                            <textarea
                                name="description"
                                value={
                                    form.description
                                }
                                onChange={
                                    updateField
                                }
                                placeholder="Descrie proprietatea, facilitățile, zona și orice alte informații utile..."
                                rows={7}
                                style={{
                                    ...inputStyle,

                                    resize:
                                        "vertical",

                                    lineHeight:
                                        "1.6",
                                }}
                            />
                        </div>
                    </div>

                    {/* LOCAȚIE */}

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
                                    "0 0 27px",

                                fontSize:
                                    "20px",

                                fontWeight:
                                    "800",
                            }}
                        >
                            Locație
                        </h2>

                        <div
                            style={{
                                display:
                                    "grid",

                                gridTemplateColumns:
                                    "repeat(2, minmax(0, 1fr))",

                                gap:
                                    "18px",
                            }}
                        >
                            <div
                                style={
                                    fieldStyle
                                }
                            >
                                <label
                                    style={
                                        labelStyle
                                    }
                                >
                                    Oraș
                                </label>

                                <select
                                    name="city"
                                    value={
                                        form.city
                                    }
                                    onChange={
                                        handleCityChange
                                    }
                                    disabled={
                                        loadingLocations
                                    }
                                    style={
                                        inputStyle
                                    }
                                >
                                    <option value="">
                                        {loadingLocations
                                            ? "Se încarcă..."
                                            : "Alege orașul"}
                                    </option>

                                    {cities.map(
                                        (
                                            city
                                        ) => (
                                            <option
                                                key={
                                                    city.id
                                                }
                                                value={
                                                    city.name
                                                }
                                            >
                                                {
                                                    city.name
                                                }
                                            </option>
                                        )
                                    )}
                                </select>
                            </div>

                            <div
                                style={
                                    fieldStyle
                                }
                            >
                                <label
                                    style={
                                        labelStyle
                                    }
                                >
                                    Zonă / cartier
                                </label>

                                <select
                                    name="neighborhood_id"
                                    value={
                                        form.neighborhood_id
                                    }
                                    onChange={
                                        updateField
                                    }
                                    disabled={
                                        !form.city ||
                                        loadingLocations
                                    }
                                    style={
                                        inputStyle
                                    }
                                >
                                    <option value="">
                                        {!form.city
                                            ? "Alege mai întâi orașul"
                                            : "Alege zona"}
                                    </option>

                                    {neighborhoodsForCity.map(
                                        (
                                            neighborhood
                                        ) => (
                                            <option
                                                key={
                                                    neighborhood.id
                                                }
                                                value={
                                                    neighborhood.id
                                                }
                                            >
                                                {
                                                    neighborhood.name
                                                }
                                            </option>
                                        )
                                    )}
                                </select>
                            </div>
                        </div>

                        <div
                            style={{
                                ...fieldStyle,

                                position:
                                    "relative",
                            }}
                        >
                            <label
                                style={
                                    labelStyle
                                }
                            >
                                Adresa exactă
                            </label>

                            <input
                                name="address"
                                type="text"
                                value={
                                    form.address
                                }
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
                                placeholder="Ex: Strada Exemplu nr. 10"
                                autoComplete="off"
                                style={
                                    inputStyle
                                }
                            />

                            {loadingAddressSuggestions && (
                                <div
                                    style={{
                                        marginTop:
                                            "7px",

                                        color:
                                            "#6b7280",

                                        fontSize:
                                            "12px",
                                    }}
                                >
                                    Se caută adresa...
                                </div>
                            )}

                            {addressSuggestionsOpen &&
                                addressSuggestions.length >
                                    0 && (
                                    <div
                                        style={{
                                            position:
                                                "absolute",

                                            left:
                                                0,

                                            right:
                                                0,

                                            top:
                                                "78px",

                                            zIndex:
                                                60,

                                            background:
                                                "#ffffff",

                                            border:
                                                "1px solid #e5e7eb",

                                            borderRadius:
                                                "12px",

                                            boxShadow:
                                                "0 15px 40px rgba(17,24,39,0.15)",

                                            overflow:
                                                "hidden",
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
                                                    onClick={() =>
                                                        selectAddressSuggestion(
                                                            suggestion
                                                        )
                                                    }
                                                    style={{
                                                        display:
                                                            "block",

                                                        width:
                                                            "100%",

                                                        textAlign:
                                                            "left",

                                                        border:
                                                            "none",

                                                        borderBottom:
                                                            index <
                                                            addressSuggestions.length -
                                                                1
                                                                ? "1px solid #f3f4f6"
                                                                : "none",

                                                        background:
                                                            "#ffffff",

                                                        padding:
                                                            "13px 15px",

                                                        cursor:
                                                            "pointer",

                                                        fontFamily:
                                                            "inherit",
                                                    }}
                                                >
                                                    <div
                                                        style={{
                                                            color:
                                                                "#111827",

                                                            fontSize:
                                                                "14px",

                                                            fontWeight:
                                                                "700",
                                                        }}
                                                    >
                                                        {suggestion.name ||
                                                            suggestion.full_address ||
                                                            "Adresă"}
                                                    </div>

                                                    {(suggestion.place_formatted ||
                                                        suggestion.full_address) && (
                                                        <div
                                                            style={{
                                                                color:
                                                                    "#6b7280",

                                                                fontSize:
                                                                    "12px",

                                                                marginTop:
                                                                    "3px",
                                                            }}
                                                        >
                                                            {suggestion.place_formatted ||
                                                                suggestion.full_address}
                                                        </div>
                                                    )}
                                                </button>
                                            )
                                        )}
                                    </div>
                                )}

                            <div
                                style={{
                                    marginTop:
                                        "8px",

                                    color:
                                        "#6b7280",

                                    fontSize:
                                        "12px",

                                    lineHeight:
                                        "1.5",
                                }}
                            >
                                Începe să scrii strada și numărul. Dacă adresa nu apare în sugestii, o poți introduce manual.
                            </div>
                        </div>

                        {/* UNIVERSITĂȚI */}

                        <div
                            style={
                                fieldStyle
                            }
                        >
                            <label
                                style={
                                    labelStyle
                                }
                            >
                                Universități apropiate
                            </label>

                            <div
                                style={{
                                    color:
                                        "#6b7280",

                                    fontSize:
                                        "13px",

                                    lineHeight:
                                        "1.5",

                                    marginBottom:
                                        "12px",
                                }}
                            >
                                Opțional. Poți selecta una sau mai multe universități.
                            </div>

                            {loadingUniversities ? (
                                <div
                                    style={{
                                        color:
                                            "#6b7280",

                                        fontSize:
                                            "13px",
                                    }}
                                >
                                    Se încarcă universitățile...
                                </div>
                            ) : !form.city ? (
                                <div
                                    style={{
                                        color:
                                            "#6b7280",

                                        fontSize:
                                            "13px",
                                    }}
                                >
                                    Alege mai întâi orașul.
                                </div>
                            ) : universitiesForCity.length ===
                              0 ? (
                                <div
                                    style={{
                                        color:
                                            "#6b7280",

                                        fontSize:
                                            "13px",
                                    }}
                                >
                                    Nu există universități disponibile pentru acest oraș.
                                </div>
                            ) : (
                                <div
                                    style={{
                                        display:
                                            "grid",

                                        gridTemplateColumns:
                                            "repeat(2, minmax(0, 1fr))",

                                        gap:
                                            "10px",
                                    }}
                                >
                                    {universitiesForCity.map(
                                        (
                                            university
                                        ) => {
                                            const checked =
                                                selectedUniversityIds.some(
                                                    (
                                                        id
                                                    ) =>
                                                        String(
                                                            id
                                                        ) ===
                                                        String(
                                                            university.id
                                                        )
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
                                                            "12px",

                                                        border:
                                                            checked
                                                                ? "1px solid #2563eb"
                                                                : "1px solid #e5e7eb",

                                                        borderRadius:
                                                            "11px",

                                                        cursor:
                                                            "pointer",

                                                        background:
                                                            checked
                                                                ? "#eff6ff"
                                                                : "#ffffff",
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
                                                                ) => {
                                                                    const exists =
                                                                        current.some(
                                                                            (
                                                                                id
                                                                            ) =>
                                                                                String(
                                                                                    id
                                                                                ) ===
                                                                                String(
                                                                                    university.id
                                                                                )
                                                                        );

                                                                    if (
                                                                        exists
                                                                    ) {
                                                                        return current.filter(
                                                                            (
                                                                                id
                                                                            ) =>
                                                                                String(
                                                                                    id
                                                                                ) !==
                                                                                String(
                                                                                    university.id
                                                                                )
                                                                        );
                                                                    }

                                                                    return [
                                                                        ...current,
                                                                        university.id,
                                                                    ];
                                                                }
                                                            );
                                                        }}
                                                    />

                                                    <span>
                                                        <span
                                                            style={{
                                                                display:
                                                                    "block",

                                                                color:
                                                                    "#111827",

                                                                fontSize:
                                                                    "13px",

                                                                fontWeight:
                                                                    "700",
                                                            }}
                                                        >
                                                            {university.short_name ||
                                                                university.name}
                                                        </span>

                                                        {university.short_name && (
                                                            <span
                                                                style={{
                                                                    display:
                                                                        "block",

                                                                    color:
                                                                        "#6b7280",

                                                                    fontSize:
                                                                        "11px",

                                                                    marginTop:
                                                                        "2px",
                                                                }}
                                                            >
                                                                {
                                                                    university.name
                                                                }
                                                            </span>
                                                        )}
                                                    </span>
                                                </label>
                                            );
                                        }
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* DETALII SUPLIMENTARE */}

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
                                    "0 0 27px",

                                fontSize:
                                    "20px",

                                fontWeight:
                                    "800",
                            }}
                        >
                            Detalii suplimentare
                        </h2>

                        <div
                            style={{
                                display:
                                    "grid",

                                gridTemplateColumns:
                                    "repeat(2, minmax(0, 1fr))",

                                gap:
                                    "18px",
                            }}
                        >
                            <div
                                style={
                                    fieldStyle
                                }
                            >
                                <label
                                    style={
                                        labelStyle
                                    }
                                >
                                    Etaj
                                </label>

                                <input
                                    name="floor"
                                    type="number"
                                    value={
                                        form.floor
                                    }
                                    onChange={
                                        updateField
                                    }
                                    style={
                                        inputStyle
                                    }
                                />
                            </div>

                            <div
                                style={
                                    fieldStyle
                                }
                            >
                                <label
                                    style={
                                        labelStyle
                                    }
                                >
                                    Număr total de etaje
                                </label>

                                <input
                                    name="total_floors"
                                    type="number"
                                    min="0"
                                    value={
                                        form.total_floors
                                    }
                                    onChange={
                                        updateField
                                    }
                                    style={
                                        inputStyle
                                    }
                                />
                            </div>

                            <div
                                style={
                                    fieldStyle
                                }
                            >
                                <label
                                    style={
                                        labelStyle
                                    }
                                >
                                    An construcție
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
                                    onChange={
                                        updateField
                                    }
                                    style={
                                        inputStyle
                                    }
                                />
                            </div>

                            <div
                                style={
                                    fieldStyle
                                }
                            >
                                <label
                                    style={
                                        labelStyle
                                    }
                                >
                                    Tip încălzire
                                </label>

                                <input
                                    name="heating_type"
                                    type="text"
                                    value={
                                        form.heating_type
                                    }
                                    onChange={
                                        updateField
                                    }
                                    placeholder="Ex: Centrală proprie"
                                    style={
                                        inputStyle
                                    }
                                />
                            </div>
                        </div>

                        <div
                            style={{
                                display:
                                    "grid",

                                gridTemplateColumns:
                                    "repeat(3, minmax(0, 1fr))",

                                gap:
                                    "18px",
                            }}
                        >
                            <div
                                style={
                                    fieldStyle
                                }
                            >
                                <label
                                    style={
                                        labelStyle
                                    }
                                >
                                    Aer condiționat
                                </label>

                                <select
                                    name="air_conditioning"
                                    value={
                                        form.air_conditioning
                                    }
                                    onChange={
                                        updateField
                                    }
                                    style={
                                        inputStyle
                                    }
                                >
                                    <option value="false">
                                        Nu
                                    </option>

                                    <option value="true">
                                        Da
                                    </option>
                                </select>
                            </div>

                            <div
                                style={
                                    fieldStyle
                                }
                            >
                                <label
                                    style={
                                        labelStyle
                                    }
                                >
                                    Balcon
                                </label>

                                <select
                                    name="balcony"
                                    value={
                                        form.balcony
                                    }
                                    onChange={
                                        updateField
                                    }
                                    style={
                                        inputStyle
                                    }
                                >
                                    <option value="false">
                                        Nu
                                    </option>

                                    <option value="true">
                                        Da
                                    </option>
                                </select>
                            </div>

                            <div
                                style={
                                    fieldStyle
                                }
                            >
                                <label
                                    style={
                                        labelStyle
                                    }
                                >
                                    Parcare
                                </label>

                                <select
                                    name="parking"
                                    value={
                                        form.parking
                                    }
                                    onChange={
                                        updateField
                                    }
                                    style={
                                        inputStyle
                                    }
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

                        <div
                            style={{
                                display:
                                    "grid",

                                gridTemplateColumns:
                                    "repeat(2, minmax(0, 1fr))",

                                gap:
                                    "18px",
                            }}
                        >
                            <div
                                style={
                                    fieldStyle
                                }
                            >
                                <label
                                    style={
                                        labelStyle
                                    }
                                >
                                    Animale permise
                                </label>

                                <select
                                    name="pets_allowed"
                                    value={
                                        form.pets_allowed
                                    }
                                    onChange={
                                        updateField
                                    }
                                    style={
                                        inputStyle
                                    }
                                >
                                    <option value="false">
                                        Nu
                                    </option>

                                    <option value="true">
                                        Da
                                    </option>
                                </select>
                            </div>

                            <div
                                style={
                                    fieldStyle
                                }
                            >
                                <label
                                    style={
                                        labelStyle
                                    }
                                >
                                    Fumat permis
                                </label>

                                <select
                                    name="smoking_allowed"
                                    value={
                                        form.smoking_allowed
                                    }
                                    onChange={
                                        updateField
                                    }
                                    style={
                                        inputStyle
                                    }
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

                        <div
                            style={{
                                display:
                                    "grid",

                                gridTemplateColumns:
                                    "repeat(3, minmax(0, 1fr))",

                                gap:
                                    "18px",
                            }}
                        >
                            <div
                                style={
                                    fieldStyle
                                }
                            >
                                <label
                                    style={
                                        labelStyle
                                    }
                                >
                                    Max. chiriași
                                </label>

                                <input
                                    name="max_tenants"
                                    type="number"
                                    min="1"
                                    value={
                                        form.max_tenants
                                    }
                                    onChange={
                                        updateField
                                    }
                                    style={
                                        inputStyle
                                    }
                                />
                            </div>

                            <div
                                style={
                                    fieldStyle
                                }
                            >
                                <label
                                    style={
                                        labelStyle
                                    }
                                >
                                    Garanție (€)
                                </label>

                                <input
                                    name="deposit_amount"
                                    type="number"
                                    min="0"
                                    value={
                                        form.deposit_amount
                                    }
                                    onChange={
                                        updateField
                                    }
                                    style={
                                        inputStyle
                                    }
                                />
                            </div>

                            <div
                                style={
                                    fieldStyle
                                }
                            >
                                <label
                                    style={
                                        labelStyle
                                    }
                                >
                                    Utilități incluse
                                </label>

                                <select
                                    name="utilities_included"
                                    value={
                                        form.utilities_included
                                    }
                                    onChange={
                                        updateField
                                    }
                                    style={
                                        inputStyle
                                    }
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

                    {/* DATE CONTACT */}

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
                                    "0 0 10px",

                                fontSize:
                                    "20px",

                                fontWeight:
                                    "800",
                            }}
                        >
                            Date de contact
                        </h2>

                        <p
                            style={{
                                margin:
                                    "0 0 25px",

                                color:
                                    "#6b7280",

                                fontSize:
                                    "13px",

                                lineHeight:
                                    "1.6",
                            }}
                        >
                            Datele de contact sunt preluate din profilul tău.
                        </p>

                        <div
                            style={{
                                display:
                                    "grid",

                                gridTemplateColumns:
                                    "repeat(3, minmax(0, 1fr))",

                                gap:
                                    "18px",
                            }}
                        >
                            <div
                                style={
                                    fieldStyle
                                }
                            >
                                <label
                                    style={
                                        labelStyle
                                    }
                                >
                                    Nume
                                </label>

                                <input
                                    type="text"
                                    value={
                                        form.owner_name
                                    }
                                    readOnly
                                    style={{
                                        ...inputStyle,

                                        background:
                                            "#f9fafb",

                                        color:
                                            "#6b7280",
                                    }}
                                />
                            </div>

                            <div
                                style={
                                    fieldStyle
                                }
                            >
                                <label
                                    style={
                                        labelStyle
                                    }
                                >
                                    Telefon
                                </label>

                                <input
                                    type="text"
                                    value={
                                        form.owner_phone
                                    }
                                    readOnly
                                    style={{
                                        ...inputStyle,

                                        background:
                                            "#f9fafb",

                                        color:
                                            "#6b7280",
                                    }}
                                />
                            </div>

                            <div
                                style={
                                    fieldStyle
                                }
                            >
                                <label
                                    style={
                                        labelStyle
                                    }
                                >
                                    Email
                                </label>

                                <input
                                    type="email"
                                    value={
                                        form.owner_email
                                    }
                                    readOnly
                                    style={{
                                        ...inputStyle,

                                        background:
                                            "#f9fafb",

                                        color:
                                            "#6b7280",
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* MESAJE */}

                    {error && (
                        <div
                            style={{
                                background:
                                    "#fef2f2",

                                border:
                                    "1px solid #fecaca",

                                color:
                                    "#b91c1c",

                                borderRadius:
                                    "12px",

                                padding:
                                    "14px 16px",

                                marginBottom:
                                    "18px",

                                fontSize:
                                    "14px",

                                fontWeight:
                                    "600",

                                lineHeight:
                                    "1.5",
                            }}
                        >
                            {error}
                        </div>
                    )}

                    {success && (
                        <div
                            style={{
                                background:
                                    "#f0fdf4",

                                border:
                                    "1px solid #bbf7d0",

                                color:
                                    "#166534",

                                borderRadius:
                                    "12px",

                                padding:
                                    "14px 16px",

                                marginBottom:
                                    "18px",

                                fontSize:
                                    "14px",

                                fontWeight:
                                    "600",

                                lineHeight:
                                    "1.5",
                            }}
                        >
                            {success}
                        </div>
                    )}

                    {/* BUTOANE */}

                    <div
                        style={{
                            display:
                                "flex",

                            justifyContent:
                                "flex-end",

                            alignItems:
                                "center",

                            gap:
                                "12px",

                            marginTop:
                                "28px",
                        }}
                    >
                        <button
                            type="button"
                            disabled={
                                saving
                            }
                            onClick={() =>
                                router.push(
                                    "/dashboard"
                                )
                            }
                            style={{
                                border:
                                    "1px solid #d1d5db",

                                background:
                                    "#ffffff",

                                color:
                                    "#111827",

                                borderRadius:
                                    "11px",

                                padding:
                                    "13px 20px",

                                fontFamily:
                                    "inherit",

                                fontSize:
                                    "14px",

                                fontWeight:
                                    "800",

                                cursor:
                                    saving
                                        ? "not-allowed"
                                        : "pointer",

                                opacity:
                                    saving
                                        ? 0.6
                                        : 1,
                            }}
                        >
                            Anulează
                        </button>

                        <button
                            type="submit"
                            disabled={
                                saving
                            }
                            style={{
                                border:
                                    "none",

                                background:
                                    "#111827",

                                color:
                                    "#ffffff",

                                borderRadius:
                                    "11px",

                                padding:
                                    "13px 22px",

                                fontFamily:
                                    "inherit",

                                fontSize:
                                    "14px",

                                fontWeight:
                                    "800",

                                cursor:
                                    saving
                                        ? "not-allowed"
                                        : "pointer",

                                opacity:
                                    saving
                                        ? 0.7
                                        : 1,
                            }}
                        >
                            {saving
                                ? "Se salvează..."
                                : "Salvează modificările"}
                        </button>
                    </div>
                </form>
            </section>
        </main>
    );
}
