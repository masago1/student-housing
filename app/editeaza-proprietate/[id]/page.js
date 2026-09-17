"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function EditeazaProprietatePage() {
    const router = useRouter();
    const params = useParams();

    const listingId = params?.id;

    const [user, setUser] = useState(null);

    const [checkingAuth, setCheckingAuth] =
        useState(true);

    const [loadingListing, setLoadingListing] =
        useState(true);

    const [saving, setSaving] =
        useState(false);

    const [error, setError] =
        useState("");

    const [success, setSuccess] =
        useState("");

    const [images, setImages] =
        useState([]);

    const [
        removedExistingImages,
        setRemovedExistingImages,
    ] = useState([]);

    const [universities, setUniversities] =
        useState([]);

    const [
        loadingUniversities,
        setLoadingUniversities,
    ] = useState(true);

    const [
        selectedUniversityIds,
        setSelectedUniversityIds,
    ] = useState([]);

    const [cities, setCities] =
        useState([]);

    const [
        neighborhoods,
        setNeighborhoods,
    ] = useState([]);

    const [
        loadingLocations,
        setLoadingLocations,
    ] = useState(true);

    const [
        addressSuggestions,
        setAddressSuggestions,
    ] = useState([]);

    const [
        addressSuggestionsOpen,
        setAddressSuggestionsOpen,
    ] = useState(false);

    const [
        loadingAddressSuggestions,
        setLoadingAddressSuggestions,
    ] = useState(false);

    const [
        selectedAddressCoordinates,
        setSelectedAddressCoordinates,
    ] = useState(null);

    const mapboxSessionTokenRef =
        useRef(null);

    const addressAbortControllerRef =
        useRef(null);

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

    const [calendarOpen, setCalendarOpen] =
        useState(false);

    const [calendarYear, setCalendarYear] =
        useState(
            new Date().getFullYear()
        );

    const [
        calendarMonthIndex,
        setCalendarMonthIndex,
    ] = useState(
        new Date().getMonth()
    );

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

    /* =========================
       AUTH + PROFIL
    ========================= */

    useEffect(() => {
        let mounted = true;

        const checkUser = async () => {
            try {
                const {
                    data: {
                        user:
                            currentUser,
                    },
                } =
                    await supabase.auth.getUser();

                if (!mounted) {
                    return;
                }

                if (
                    !currentUser
                ) {
                    router.replace(
                        "/login"
                    );

                    return;
                }

                setUser(
                    currentUser
                );

                const {
                    data:
                        profileData,
                    error:
                        profileError,
                } = await supabase
                    .from(
                        "profiles"
                    )
                    .select(
                        "name, phone"
                    )
                    .eq(
                        "id",
                        currentUser.id
                    )
                    .maybeSingle();

                if (
                    profileError
                ) {
                    console.error(
                        "Eroare profil:",
                        profileError
                    );
                }

                if (
                    !profileData
                        ?.phone
                        ?.trim()
                ) {
                    router.replace(
                        "/dashboard?section=profile&required=phone"
                    );

                    return;
                }

                setForm(
                    (current) => ({
                        ...current,

                        owner_name:
                            profileData
                                ?.name ||
                            currentUser
                                .user_metadata
                                ?.name ||
                            "",

                        owner_phone:
                            profileData
                                ?.phone ||
                            "",

                        owner_email:
                            currentUser.email ||
                            "",
                    })
                );
            } catch (
                authError
            ) {
                console.error(
                    "Eroare autentificare:",
                    authError
                );

                if (
                    mounted
                ) {
                    setError(
                        "Nu am putut verifica autentificarea."
                    );
                }
            } finally {
                if (
                    mounted
                ) {
                    setCheckingAuth(
                        false
                    );
                }
            }
        };

        checkUser();

        return () => {
            mounted = false;
        };
    }, [router]);

    /* =========================
       UNIVERSITĂȚI
    ========================= */

    useEffect(() => {
        let mounted = true;

        const loadUniversities =
            async () => {
                try {
                    setLoadingUniversities(
                        true
                    );

                    const {
                        data,
                        error:
                            universitiesError,
                    } =
                        await supabase
                            .from(
                                "universities"
                            )
                            .select(
                                "*"
                            )
                            .order(
                                "name",
                                {
                                    ascending:
                                        true,
                                }
                            );

                    if (
                        universitiesError
                    ) {
                        throw universitiesError;
                    }

                    if (
                        mounted
                    ) {
                        setUniversities(
                            data ||
                                []
                        );
                    }
                } catch (
                    universitiesLoadError
                ) {
                    console.error(
                        "Eroare universități:",
                        universitiesLoadError
                    );

                    if (
                        mounted
                    ) {
                        setUniversities(
                            []
                        );
                    }
                } finally {
                    if (
                        mounted
                    ) {
                        setLoadingUniversities(
                            false
                        );
                    }
                }
            };

        loadUniversities();

        return () => {
            mounted = false;
        };
    }, []);

    /* =========================
       ORAȘE + CARTIERE
    ========================= */

    useEffect(() => {
        let mounted = true;

        const loadLocations =
            async () => {
                try {
                    setLoadingLocations(
                        true
                    );

                    const [
                        citiesResult,
                        neighborhoodsResult,
                    ] =
                        await Promise.all(
                            [
                                supabase
                                    .from(
                                        "cities"
                                    )
                                    .select(
                                        "*"
                                    )
                                    .order(
                                        "name",
                                        {
                                            ascending:
                                                true,
                                        }
                                    ),

                                supabase
                                    .from(
                                        "neighborhoods"
                                    )
                                    .select(
                                        "*"
                                    )
                                    .order(
                                        "name",
                                        {
                                            ascending:
                                                true,
                                        }
                                    ),
                            ]
                        );

                    if (
                        citiesResult.error
                    ) {
                        throw citiesResult.error;
                    }

                    if (
                        neighborhoodsResult.error
                    ) {
                        throw neighborhoodsResult.error;
                    }

                    if (
                        mounted
                    ) {
                        setCities(
                            citiesResult.data ||
                                []
                        );

                        setNeighborhoods(
                            neighborhoodsResult.data ||
                                []
                        );
                    }
                } catch (
                    locationsError
                ) {
                    console.error(
                        "Eroare locații:",
                        locationsError
                    );

                    if (
                        mounted
                    ) {
                        setCities(
                            []
                        );

                        setNeighborhoods(
                            []
                        );
                    }
                } finally {
                    if (
                        mounted
                    ) {
                        setLoadingLocations(
                            false
                        );
                    }
                }
            };

        loadLocations();

        return () => {
            mounted = false;
        };
    }, []);

    /* =========================
       ÎNCĂRCARE ANUNȚ
    ========================= */

    useEffect(() => {
        if (
            checkingAuth ||
            !user ||
            !listingId
        ) {
            return;
        }

        let mounted = true;

        const loadListing =
            async () => {
                try {
                    setLoadingListing(
                        true
                    );

                    setError(
                        ""
                    );

                    const {
                        data:
                            listing,
                        error:
                            listingError,
                    } =
                        await supabase
                            .from(
                                "listings"
                            )
                            .select(
                                "*"
                            )
                            .eq(
                                "id",
                                listingId
                            )
                            .eq(
                                "user_id",
                                user.id
                            )
                            .maybeSingle();

                    if (
                        listingError
                    ) {
                        throw listingError;
                    }

                    if (
                        !listing
                    ) {
                        throw new Error(
                            "Anunțul nu a fost găsit sau nu îți aparține."
                        );
                    }

                    const [
                        imagesResult,
                        universitiesResult,
                    ] =
                        await Promise.all(
                            [
                                supabase
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
                                            ascending:
                                                true,
                                        }
                                    ),

                                supabase
                                    .from(
                                        "listing_universities"
                                    )
                                    .select(
                                        "university_id"
                                    )
                                    .eq(
                                        "listing_id",
                                        listingId
                                    ),
                            ]
                        );

                    if (
                        imagesResult.error
                    ) {
                        throw imagesResult.error;
                    }

                    if (
                        universitiesResult.error
                    ) {
                        throw universitiesResult.error;
                    }

                    if (
                        !mounted
                    ) {
                        return;
                    }

                    setForm(
                        (
                            current
                        ) => ({
                            ...current,

                            title:
                                listing.title ||
                                "",

                            property_type:
                                listing.property_type ||
                                "apartment",

                            city:
                                listing.city ||
                                "",

                            neighborhood_id:
                                listing.neighborhood_id !=
                                null
                                    ? String(
                                          listing.neighborhood_id
                                      )
                                    : "",

                            address:
                                listing.address ||
                                "",

                            price_monthly:
                                listing.price_monthly !=
                                null
                                    ? String(
                                          listing.price_monthly
                                      )
                                    : "",

                            rooms:
                                listing.rooms !=
                                null
                                    ? String(
                                          listing.rooms
                                      )
                                    : "",

                            bedrooms:
                                listing.bedrooms !=
                                null
                                    ? String(
                                          listing.bedrooms
                                      )
                                    : "",

                            bathrooms:
                                listing.bathrooms !=
                                null
                                    ? String(
                                          listing.bathrooms
                                      )
                                    : "",

                            surface_m2:
                                listing.surface_m2 !=
                                null
                                    ? String(
                                          listing.surface_m2
                                      )
                                    : "",

                            furnished:
                                listing.furnished
                                    ? "true"
                                    : "false",

                            available_from:
                                listing.available_from ||
                                "",

                            description:
                                listing.description ||
                                "",

                            floor:
                                listing.floor !=
                                null
                                    ? String(
                                          listing.floor
                                      )
                                    : "",

                            total_floors:
                                listing.total_floors !=
                                null
                                    ? String(
                                          listing.total_floors
                                      )
                                    : "",

                            construction_year:
                                listing.construction_year !=
                                null
                                    ? String(
                                          listing.construction_year
                                      )
                                    : "",

                            heating_type:
                                listing.heating_type ||
                                "",

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
                                listing.max_tenants !=
                                null
                                    ? String(
                                          listing.max_tenants
                                      )
                                    : "",

                            deposit_amount:
                                listing.deposit_amount !=
                                null
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
                                current.owner_name,

                            owner_phone:
                                listing.owner_phone ||
                                current.owner_phone,

                            owner_email:
                                listing.owner_email ||
                                current.owner_email,
                        })
                    );

                    const latitude =
                        Number(
                            listing.latitude
                        );

                    const longitude =
                        Number(
                            listing.longitude
                        );

                    if (
                        Number.isFinite(
                            latitude
                        ) &&
                        Number.isFinite(
                            longitude
                        )
                    ) {
                        setSelectedAddressCoordinates(
                            {
                                latitude,
                                longitude,
                            }
                        );
                    } else {
                        setSelectedAddressCoordinates(
                            null
                        );
                    }

                    setImages(
                        (
                            imagesResult.data ||
                            []
                        ).map(
                            (
                                image
                            ) => ({
                                id:
                                    image.id,

                                image_url:
                                    image.image_url,

                                storage_path:
                                    image.storage_path,

                                position:
                                    image.position,

                                existing:
                                    true,
                            })
                        )
                    );

                    /*
                        DEDUPLICĂM și ID-urile
                        încărcate din baza de date.
                    */

                    const loadedUniversityIds =
                        [
                            ...new Set(
                                (
                                    universitiesResult.data ||
                                    []
                                ).map(
                                    (
                                        item
                                    ) =>
                                        String(
                                            item.university_id
                                        )
                                )
                            ),
                        ];

                    setSelectedUniversityIds(
                        loadedUniversityIds
                    );

                    setRemovedExistingImages(
                        []
                    );
                } catch (
                    loadError
                ) {
                    console.error(
                        "Eroare încărcare anunț:",
                        loadError
                    );

                    if (
                        mounted
                    ) {
                        setError(
                            loadError.message ||
                                "Anunțul nu a putut fi încărcat."
                        );
                    }
                } finally {
                    if (
                        mounted
                    ) {
                        setLoadingListing(
                            false
                        );
                    }
                }
            };

        loadListing();

        return () => {
            mounted = false;
        };
    }, [
        checkingAuth,
        user,
        listingId,
    ]);

    /* =========================
       DATE DERIVATE
    ========================= */

    const selectedCity =
        useMemo(() => {
            return (
                cities.find(
                    (city) =>
                        String(
                            city.name
                        ).toLowerCase() ===
                        String(
                            form.city
                        ).toLowerCase()
                ) || null
            );
        }, [
            cities,
            form.city,
        ]);

    const neighborhoodsForCity =
        useMemo(() => {
            if (
                !selectedCity
            ) {
                return [];
            }

            return neighborhoods.filter(
                (
                    neighborhood
                ) =>
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

    const universitiesForCity =
        useMemo(() => {
            if (
                !form.city
            ) {
                return [];
            }

            return universities.filter(
                (
                    university
                ) =>
                    String(
                        university.city ||
                            ""
                    ).toLowerCase() ===
                    String(
                        form.city
                    ).toLowerCase()
            );
        }, [
            universities,
            form.city,
        ]);

    /* =========================
       FORM
    ========================= */

    const updateField = (
        event
    ) => {
        const {
            name,
            value,
        } = event.target;

        setForm(
            (current) => ({
                ...current,

                [name]:
                    value,
            })
        );

        setError(
            ""
        );

        setSuccess(
            ""
        );
    };

    const handleCityChange = (
        event
    ) => {
        const value =
            event.target.value;

        setForm(
            (current) => ({
                ...current,

                city:
                    value,

                neighborhood_id:
                    "",

                address:
                    "",
            })
        );

        setSelectedUniversityIds(
            []
        );

        setAddressSuggestions(
            []
        );

        setAddressSuggestionsOpen(
            false
        );

        setSelectedAddressCoordinates(
            null
        );

        mapboxSessionTokenRef.current =
            null;

        setError(
            ""
        );

        setSuccess(
            ""
        );
    };

    /* =========================
       MAPBOX - ADRESĂ
    ========================= */

    const handleAddressChange = (
        event
    ) => {
        const value =
            event.target.value;

        setForm(
            (current) => ({
                ...current,

                address:
                    value,
            })
        );

        /*
            Dacă utilizatorul schimbă textul
            după ce a fost selectată o adresă,
            coordonatele vechi nu mai sunt valide.
        */

        setSelectedAddressCoordinates(
            null
        );

        setSuccess(
            ""
        );

        setError(
            ""
        );
    };

    useEffect(() => {
        const address =
            form.address.trim();

        const city =
            form.city.trim();

        if (
            !address ||
            !city ||
            address.length < 3
        ) {
            setAddressSuggestions(
                []
            );

            setAddressSuggestionsOpen(
                false
            );

            setLoadingAddressSuggestions(
                false
            );

            return;
        }

        const mapboxToken =
            process.env
                .NEXT_PUBLIC_MAPBOX_TOKEN;

        if (
            !mapboxToken
        ) {
            setAddressSuggestions(
                []
            );

            setAddressSuggestionsOpen(
                false
            );

            return;
        }

        const timeoutId =
            setTimeout(
                async () => {
                    try {
                        if (
                            addressAbortControllerRef.current
                        ) {
                            addressAbortControllerRef.current.abort();
                        }

                        const controller =
                            new AbortController();

                        addressAbortControllerRef.current =
                            controller;

                        if (
                            !mapboxSessionTokenRef.current
                        ) {
                            mapboxSessionTokenRef.current =
                                crypto.randomUUID();
                        }

                        setLoadingAddressSuggestions(
                            true
                        );

                        const query =
                            `${address}, ${city}`;

                        const searchParams =
                            new URLSearchParams(
                                {
                                    q:
                                        query,

                                    access_token:
                                        mapboxToken,

                                    session_token:
                                        mapboxSessionTokenRef.current,

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
                                `https://api.mapbox.com/search/searchbox/v1/suggest?${searchParams.toString()}`,
                                {
                                    signal:
                                        controller.signal,
                                }
                            );

                        if (
                            !response.ok
                        ) {
                            throw new Error(
                                "Mapbox suggest error"
                            );
                        }

                        const data =
                            await response.json();

                        const suggestions =
                            Array.isArray(
                                data?.suggestions
                            )
                                ? data.suggestions
                                : [];

                        setAddressSuggestions(
                            suggestions
                        );

                        setAddressSuggestionsOpen(
                            suggestions.length >
                                0
                        );
                    } catch (
                        suggestError
                    ) {
                        if (
                            suggestError?.name ===
                            "AbortError"
                        ) {
                            return;
                        }

                        console.error(
                            "Eroare sugestii adresă:",
                            suggestError
                        );

                        setAddressSuggestions(
                            []
                        );

                        setAddressSuggestionsOpen(
                            false
                        );
                    } finally {
                        setLoadingAddressSuggestions(
                            false
                        );
                    }
                },
                350
            );

        return () => {
            clearTimeout(
                timeoutId
            );
        };
    }, [
        form.address,
        form.city,
    ]);

    const selectAddressSuggestion =
        async (
            suggestion
        ) => {
            try {
                const mapboxToken =
                    process.env
                        .NEXT_PUBLIC_MAPBOX_TOKEN;

                if (
                    !mapboxToken ||
                    !suggestion?.mapbox_id
                ) {
                    return;
                }

                if (
                    !mapboxSessionTokenRef.current
                ) {
                    mapboxSessionTokenRef.current =
                        crypto.randomUUID();
                }

                setLoadingAddressSuggestions(
                    true
                );

                const retrieveParams =
                    new URLSearchParams(
                        {
                            access_token:
                                mapboxToken,

                            session_token:
                                mapboxSessionTokenRef.current,
                        }
                    );

                const response =
                    await fetch(
                        `https://api.mapbox.com/search/searchbox/v1/retrieve/${encodeURIComponent(
                            suggestion.mapbox_id
                        )}?${retrieveParams.toString()}`
                    );

                if (
                    !response.ok
                ) {
                    throw new Error(
                        "Adresa selectată nu a putut fi încărcată."
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
                        "Coordonatele adresei selectate nu sunt valide."
                    );
                }

                const fullAddress =
                    feature?.properties
                        ?.full_address ||
                    feature?.properties
                        ?.name ||
                    suggestion
                        ?.full_address ||
                    suggestion
                        ?.name ||
                    form.address;

                setForm(
                    (current) => ({
                        ...current,

                        address:
                            fullAddress,
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

                setError(
                    ""
                );
            } catch (
                retrieveError
            ) {
                console.error(
                    "Eroare selectare adresă:",
                    retrieveError
                );

                setSelectedAddressCoordinates(
                    null
                );

                setError(
                    "Adresa selectată nu a putut fi localizată. O poți introduce manual."
                );
            } finally {
                setLoadingAddressSuggestions(
                    false
                );
            }
        };

    /* =========================
       IMAGINI
    ========================= */

    const handleImages = (
        event
    ) => {
        const files =
            Array.from(
                event.target.files ||
                    []
            );

        if (
            files.length === 0
        ) {
            return;
        }

        const availableSlots =
            Math.max(
                0,
                10 -
                    images.length
            );

        const selectedFiles =
            files.slice(
                0,
                availableSlots
            );

        const newImages =
            selectedFiles.map(
                (
                    file
                ) => ({
                    file,

                    preview:
                        URL.createObjectURL(
                            file
                        ),

                    existing:
                        false,
                })
            );

        setImages(
            (current) => [
                ...current,
                ...newImages,
            ]
        );

        if (
            files.length >
            availableSlots
        ) {
            setError(
                "Poți avea maximum 10 fotografii."
            );
        } else {
            setError(
                ""
            );
        }

        event.target.value =
            "";
    };

    const removeImage = (
        index
    ) => {
        setImages(
            (current) => {
                const image =
                    current[index];

                if (
                    !image
                ) {
                    return current;
                }

                if (
                    image.existing
                ) {
                    setRemovedExistingImages(
                        (
                            removed
                        ) => [
                            ...removed,
                            image,
                        ]
                    );
                } else if (
                    image.preview
                ) {
                    URL.revokeObjectURL(
                        image.preview
                    );
                }

                return current.filter(
                    (
                        _,
                        currentIndex
                    ) =>
                        currentIndex !==
                        index
                );
            }
        );

        setError(
            ""
        );

        setSuccess(
            ""
        );
    };

    useEffect(() => {
        return () => {
            images.forEach(
                (
                    image
                ) => {
                    if (
                        !image.existing &&
                        image.preview
                    ) {
                        URL.revokeObjectURL(
                            image.preview
                        );
                    }
                }
            );
        };
    }, [images]);

    const cleanupUploadedFiles =
        async (
            paths
        ) => {
            if (
                !Array.isArray(
                    paths
                ) ||
                paths.length ===
                    0
            ) {
                return;
            }

            try {
                await supabase.storage
                    .from(
                        "listing-images"
                    )
                    .remove(
                        paths
                    );
            } catch (
                cleanupError
            ) {
                console.error(
                    "Eroare cleanup imagini:",
                    cleanupError
                );
            }
        };

    /* =========================
       LOGOUT
    ========================= */

    const handleLogout =
        async () => {
            await supabase.auth.signOut();

            router.push(
                "/"
            );

            router.refresh();
        };

    /* =========================
       CALENDAR
    ========================= */

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

    const openCalendar =
        () => {
            if (
                form.available_from
            ) {
                const [
                    year,
                    month,
                ] =
                    form.available_from
                        .split("-")
                        .map(
                            Number
                        );

                if (
                    year &&
                    month
                ) {
                    setCalendarYear(
                        year
                    );

                    setCalendarMonthIndex(
                        month - 1
                    );
                }
            } else {
                const today =
                    new Date();

                setCalendarYear(
                    today.getFullYear()
                );

                setCalendarMonthIndex(
                    today.getMonth()
                );
            }

            setCalendarOpen(
                (
                    current
                ) =>
                    !current
            );
        };

    const formatRomanianDate =
        (
            dateString
        ) => {
            if (
                !dateString
            ) {
                return "";
            }

            const [
                year,
                month,
                day,
            ] =
                dateString
                    .split("-")
                    .map(
                        Number
                    );

            if (
                !year ||
                !month ||
                !day
            ) {
                return dateString;
            }

            return `${day} ${romanianMonths[
                month - 1
            ].toLowerCase()} ${year}`;
        };

    const daysInCalendarMonth =
        new Date(
            calendarYear,
            calendarMonthIndex +
                1,
            0
        ).getDate();

    const firstDayOfCalendarMonth =
        new Date(
            calendarYear,
            calendarMonthIndex,
            1
        ).getDay();

    const mondayBasedFirstDay =
        (
            firstDayOfCalendarMonth +
            6
        ) %
        7;

    const calendarCells = [
        ...Array(
            mondayBasedFirstDay
        ).fill(null),

        ...Array.from(
            {
                length:
                    daysInCalendarMonth,
            },

            (
                _,
                index
            ) =>
                index + 1
        ),
    ];

    const currentMonthStart =
        new Date(
            calendarYear,
            calendarMonthIndex,
            1
        );

    const todayMonthStart =
        new Date(
            new Date().getFullYear(),
            new Date().getMonth(),
            1
        );

    const canGoToPreviousMonth =
        currentMonthStart >
        todayMonthStart;

    const previousCalendarMonth =
        () => {
            if (
                !canGoToPreviousMonth
            ) {
                return;
            }

            if (
                calendarMonthIndex ===
                0
            ) {
                setCalendarMonthIndex(
                    11
                );

                setCalendarYear(
                    (
                        current
                    ) =>
                        current -
                        1
                );
            } else {
                setCalendarMonthIndex(
                    (
                        current
                    ) =>
                        current -
                        1
                );
            }
        };

    const nextCalendarMonth =
        () => {
            if (
                calendarMonthIndex ===
                11
            ) {
                setCalendarMonthIndex(
                    0
                );

                setCalendarYear(
                    (
                        current
                    ) =>
                        current +
                        1
                );
            } else {
                setCalendarMonthIndex(
                    (
                        current
                    ) =>
                        current +
                        1
                );
            }
        };

    const selectCalendarDate =
        (
            year,
            monthIndex,
            day
        ) => {
            const selectedDate =
                new Date(
                    year,
                    monthIndex,
                    day
                );

            if (
                selectedDate <
                getTodayAtMidnight()
            ) {
                return;
            }

            const value =
                `${year}-${String(
                    monthIndex +
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

            setForm(
                (current) => ({
                    ...current,

                    available_from:
                        value,
                })
            );

            setCalendarOpen(
                false
            );

            setError(
                ""
            );

            setSuccess(
                ""
            );
        };

    /* =========================
       SALVARE MODIFICĂRI
    ========================= */

    const handleSubmit =
        async (
            event
        ) => {
            event.preventDefault();

            setError(
                ""
            );

            setSuccess(
                ""
            );

            if (
                !user ||
                !listingId
            ) {
                setError(
                    "Nu am putut identifica utilizatorul sau anunțul."
                );

                return;
            }

            const {
                data:
                    currentProfile,
                error:
                    currentProfileError,
            } = await supabase
                .from(
                    "profiles"
                )
                .select(
                    "name, phone"
                )
                .eq(
                    "id",
                    user.id
                )
                .maybeSingle();

            if (
                currentProfileError
            ) {
                setError(
                    "Profilul nu a putut fi verificat."
                );

                return;
            }

            const currentPhone =
                currentProfile
                    ?.phone
                    ?.trim() ||
                "";

            if (
                !currentPhone
            ) {
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

                /*
                    Eliminăm duplicatele înainte
                    de orice operație.
                */

                const uniqueUniversityIds = [
                    ...new Set(
                        selectedUniversityIds.map(
                            (
                                universityId
                            ) =>
                                String(
                                    universityId
                                )
                        )
                    ),
                ];

                /*
                    Citim asocierile care există
                    deja în baza de date.
                */

                const {
                    data:
                        existingUniversityLinks,
                    error:
                        existingUniversityLinksError,
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
                    existingUniversityLinksError
                ) {
                    throw new Error(
                        `Universitățile existente nu au putut fi verificate: ${existingUniversityLinksError.message}`
                    );
                }

                const existingUniversityIds = [
                    ...new Set(
                        (
                            existingUniversityLinks ||
                            []
                        ).map(
                            (
                                item
                            ) =>
                                String(
                                    item.university_id
                                )
                        )
                    ),
                ];

                /*
                    Ștergem DOAR universitățile
                    care au fost debifate.
                */

                const universityIdsToDelete =
                    existingUniversityIds.filter(
                        (
                            universityId
                        ) =>
                            !uniqueUniversityIds.includes(
                                universityId
                            )
                    );

                if (
                    universityIdsToDelete.length >
                    0
                ) {
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
                        )
                        .in(
                            "university_id",
                            universityIdsToDelete
                        );

                    if (
                        deleteUniversitiesError
                    ) {
                        throw new Error(
                            `Universitățile eliminate nu au putut fi actualizate: ${deleteUniversitiesError.message}`
                        );
                    }
                }

                /*
                    Inserăm DOAR universitățile
                    care nu există deja.

                    Asta elimină eroarea:
                    duplicate key value violates
                    unique constraint.
                */

                const universityIdsToInsert =
                    uniqueUniversityIds.filter(
                        (
                            universityId
                        ) =>
                            !existingUniversityIds.includes(
                                universityId
                            )
                    );

                if (
                    universityIdsToInsert.length >
                    0
                ) {
                    const universityLinks =
                        universityIdsToInsert.map(
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
                            `Universitățile nu au putut fi actualizate: ${universityLinkError.message}`
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
                                (
                                    image
                                ) =>
                                    image.id
                            )
                            .filter(
                                Boolean
                            );

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
                                (
                                    image
                                ) =>
                                    image.storage_path
                            )
                            .filter(
                                Boolean
                            );

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
                        (
                            image
                        ) =>
                            !image.existing &&
                            image.file
                    );

                const existingImages =
                    images.filter(
                        (
                            image
                        ) =>
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
                        newImages[
                            index
                        ];

                    const file =
                        image.file;

                    const extension =
                        file.name
                            .split(
                                "."
                            )
                            .pop()
                            ?.toLowerCase() ||
                        "jpg";

                    const safeExtension =
                        extension.replace(
                            /[^a-z0-9]/g,
                            ""
                        ) ||
                        "jpg";

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

                    uploadedImages.push(
                        {
                            listing_id:
                                listingId,

                            image_url:
                                publicUrlData.publicUrl,

                            storage_path:
                                storagePath,

                            position:
                                existingImages.length +
                                index,
                        }
                    );
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
                            ascending:
                                true,
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
                        finalImages[
                            index
                        ];

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

                setSaving(
                    false
                );
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

                                    <option value="house">
                                        Casă
                                    </option>

                                    <option value="studio">
                                        Garsonieră
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
                                    min="0"
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
                                        Selectează orașul
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
                                        Selectează zona
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
                                autoComplete="off"
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
                                placeholder="Ex: Strada Arieș 10"
                                style={
                                    inputStyle
                                }
                            />

                            {loadingAddressSuggestions && (
                                <div
                                    style={{
                                        color:
                                            "#6b7280",

                                        fontSize:
                                            "12px",

                                        marginTop:
                                            "7px",
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

                                            zIndex:
                                                30,

                                            left:
                                                0,

                                            right:
                                                0,

                                            top:
                                                "78px",

                                            background:
                                                "#ffffff",

                                            border:
                                                "1px solid #e5e7eb",

                                            borderRadius:
                                                "12px",

                                            overflow:
                                                "hidden",

                                            boxShadow:
                                                "0 15px 35px rgba(0,0,0,0.12)",
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
                                                            index ===
                                                            addressSuggestions.length -
                                                                1
                                                                ? "none"
                                                                : "1px solid #f3f4f6",

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
                                                            suggestion.full_address}
                                                    </div>

                                                    {(suggestion.full_address ||
                                                        suggestion.place_formatted) && (
                                                        <div
                                                            style={{
                                                                color:
                                                                    "#6b7280",

                                                                fontSize:
                                                                    "12px",

                                                                marginTop:
                                                                    "4px",
                                                            }}
                                                        >
                                                            {suggestion.full_address ||
                                                                suggestion.place_formatted}
                                                        </div>
                                                    )}
                                                </button>
                                            )
                                        )}
                                    </div>
                                )}

                            <div
                                style={{
                                    color:
                                        "#6b7280",

                                    fontSize:
                                        "12px",

                                    lineHeight:
                                        "1.5",

                                    marginTop:
                                        "7px",
                                }}
                            >
                                Introdu strada și numărul proprietății.
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
                                    Suprafață m²
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
                                    Total etaje
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
                                    Mobilat
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

                        {/* DATA DISPONIBILITATE */}

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
                                Disponibil de la
                            </label>

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

                                    color:
                                        form.available_from
                                            ? "#111827"
                                            : "#9ca3af",
                                }}
                            >
                                {form.available_from
                                    ? formatRomanianDate(
                                          form.available_from
                                      )
                                    : "Selectează data"}
                            </button>

                            {calendarOpen && (
                                <div
                                    style={{
                                        position:
                                            "absolute",

                                        zIndex:
                                            40,

                                        top:
                                            "82px",

                                        left:
                                            0,

                                        width:
                                            "330px",

                                        background:
                                            "#ffffff",

                                        border:
                                            "1px solid #e5e7eb",

                                        borderRadius:
                                            "15px",

                                        padding:
                                            "17px",

                                        boxShadow:
                                            "0 18px 40px rgba(0,0,0,0.15)",
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

                                            marginBottom:
                                                "15px",
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

                                                fontSize:
                                                    "20px",

                                                cursor:
                                                    canGoToPreviousMonth
                                                        ? "pointer"
                                                        : "not-allowed",

                                                opacity:
                                                    canGoToPreviousMonth
                                                        ? 1
                                                        : 0.3,
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

                                                fontSize:
                                                    "20px",

                                                cursor:
                                                    "pointer",
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

                                            fontSize:
                                                "12px",
                                        }}
                                    >
                                        {[
                                            "L",
                                            "Ma",
                                            "Mi",
                                            "J",
                                            "V",
                                            "S",
                                            "D",
                                        ].map(
                                            (
                                                day
                                            ) => (
                                                <div
                                                    key={
                                                        day
                                                    }
                                                    style={{
                                                        color:
                                                            "#9ca3af",

                                                        fontWeight:
                                                            "700",

                                                        padding:
                                                            "6px 0",
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
                                                    !day
                                                ) {
                                                    return (
                                                        <div
                                                            key={`empty-${index}`}
                                                        />
                                                    );
                                                }

                                                const date =
                                                    new Date(
                                                        calendarYear,
                                                        calendarMonthIndex,
                                                        day
                                                    );

                                                const disabled =
                                                    date <
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
                                                            height:
                                                                "34px",

                                                            border:
                                                                "none",

                                                            borderRadius:
                                                                "8px",

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

                                                            cursor:
                                                                disabled
                                                                    ? "not-allowed"
                                                                    : "pointer",

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
                                placeholder="Descrie proprietatea..."
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

                    {/* FACILITĂȚI */}

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
                                    "0 0 25px",

                                fontSize:
                                    "20px",

                                fontWeight:
                                    "800",
                            }}
                        >
                            Facilități și reguli
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
                            {[
                                [
                                    "air_conditioning",
                                    "Aer condiționat",
                                ],
                                [
                                    "balcony",
                                    "Balcon",
                                ],
                                [
                                    "parking",
                                    "Parcare",
                                ],
                                [
                                    "pets_allowed",
                                    "Animale acceptate",
                                ],
                                [
                                    "smoking_allowed",
                                    "Fumat permis",
                                ],
                                [
                                    "utilities_included",
                                    "Utilități incluse",
                                ],
                            ].map(
                                ([
                                    name,
                                    label,
                                ]) => (
                                    <div
                                        key={
                                            name
                                        }
                                        style={
                                            fieldStyle
                                        }
                                    >
                                        <label
                                            style={
                                                labelStyle
                                            }
                                        >
                                            {
                                                label
                                            }
                                        </label>

                                        <select
                                            name={
                                                name
                                            }
                                            value={
                                                form[
                                                    name
                                                ]
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
                                )
                            )}
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
                                    Număr maxim chiriași
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
                        </div>
                    </div>

                    {/* UNIVERSITĂȚI */}

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
                            Universități apropiate
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
                            Opțional. Poți asocia proprietatea cu una sau mai multe universități.
                        </p>

                        {loadingUniversities ? (
                            <div
                                style={{
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
                                    color:
                                        "#6b7280",

                                    fontSize:
                                        "14px",
                                }}
                            >
                                Nu există universități disponibile pentru orașul selectat.
                            </div>
                        ) : (
                            <div
                                style={{
                                    display:
                                        "grid",

                                    gap:
                                        "10px",
                                }}
                            >
                                {universitiesForCity.map(
                                    (
                                        university
                                    ) => {
                                        const universityId =
                                            String(
                                                university.id
                                            );

                                        const checked =
                                            selectedUniversityIds.includes(
                                                universityId
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
                                                        "center",

                                                    gap:
                                                        "11px",

                                                    padding:
                                                        "13px 14px",

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
                                                            ? "#f5f9ff"
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
                                                                const normalized =
                                                                    [
                                                                        ...new Set(
                                                                            current.map(
                                                                                (
                                                                                    id
                                                                                ) =>
                                                                                    String(
                                                                                        id
                                                                                    )
                                                                            )
                                                                        ),
                                                                    ];

                                                                if (
                                                                    normalized.includes(
                                                                        universityId
                                                                    )
                                                                ) {
                                                                    return normalized.filter(
                                                                        (
                                                                            id
                                                                        ) =>
                                                                            id !==
                                                                            universityId
                                                                    );
                                                                }

                                                                return [
                                                                    ...normalized,
                                                                    universityId,
                                                                ];
                                                            }
                                                        );

                                                        setError(
                                                            ""
                                                        );

                                                        setSuccess(
                                                            ""
                                                        );
                                                    }}
                                                />

                                                <span
                                                    style={{
                                                        fontSize:
                                                            "14px",

                                                        fontWeight:
                                                            "700",

                                                        color:
                                                            "#111827",
                                                    }}
                                                >
                                                    {
                                                        university.name
                                                    }
                                                </span>
                                            </label>
                                        );
                                    }
                                )}
                            </div>
                        )}
                    </div>

                    {/* CONTACT */}

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
                                    "0 0 25px",

                                fontSize:
                                    "20px",

                                fontWeight:
                                    "800",
                            }}
                        >
                            Date de contact
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
                        </div>

                        <div
                            style={{
                                ...fieldStyle,

                                marginBottom:
                                    0,
                            }}
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

                    {/* MESAJE */}

                    {error && (
                        <div
                            style={{
                                background:
                                    "#fff1f2",

                                border:
                                    "1px solid #fecdd3",

                                color:
                                    "#be123c",

                                padding:
                                    "14px 16px",

                                borderRadius:
                                    "11px",

                                marginBottom:
                                    "16px",

                                fontSize:
                                    "14px",

                                lineHeight:
                                    "1.5",

                                fontWeight:
                                    "600",
                            }}
                        >
                            {error}
                        </div>
                    )}

                    {success && (
                        <div
                            style={{
                                background:
                                    "#ecfdf5",

                                border:
                                    "1px solid #a7f3d0",

                                color:
                                    "#047857",

                                padding:
                                    "14px 16px",

                                borderRadius:
                                    "11px",

                                marginBottom:
                                    "16px",

                                fontSize:
                                    "14px",

                                lineHeight:
                                    "1.5",

                                fontWeight:
                                    "600",
                            }}
                        >
                            {
                                success
                            }
                        </div>
                    )}

                    {/* BUTOANE */}

                    <div
                        style={{
                            display:
                                "flex",

                            justifyContent:
                                "flex-end",

                            gap:
                                "12px",

                            marginTop:
                                "25px",
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
                                    "14px 20px",

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
                                    "14px 22px",

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
