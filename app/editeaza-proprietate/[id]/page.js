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
    const [imageError, setImageError] = useState("");

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

    const addressFieldRef =
        useRef(null);

    const [addressFieldActive, setAddressFieldActive] =
        useState(false);

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
       ÎNCARCĂ ANUNȚUL
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
                            listingData,
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
                        !listingData
                    ) {
                        throw new Error(
                            "Anunțul nu a fost găsit sau nu îți aparține."
                        );
                    }

                    if (
                        !mounted
                    ) {
                        return;
                    }

                    setForm(
                        (current) => ({
                            ...current,

                            title:
                                listingData.title ||
                                "",

                            property_type:
                                listingData.property_type ||
                                "apartment",

                            city:
                                listingData.city ||
                                "",

                            neighborhood_id:
                                listingData.neighborhood_id
                                    ? String(
                                          listingData.neighborhood_id
                                      )
                                    : "",

                            address:
                                listingData.address ||
                                "",

                            price_monthly:
                                listingData.price_monthly !=
                                null
                                    ? String(
                                          listingData.price_monthly
                                      )
                                    : "",

                            rooms:
                                listingData.rooms !=
                                null
                                    ? String(
                                          listingData.rooms
                                      )
                                    : "",

                            bedrooms:
                                listingData.bedrooms !=
                                null
                                    ? String(
                                          listingData.bedrooms
                                      )
                                    : "",

                            bathrooms:
                                listingData.bathrooms !=
                                null
                                    ? String(
                                          listingData.bathrooms
                                      )
                                    : "",

                            surface_m2:
                                listingData.surface_m2 !=
                                null
                                    ? String(
                                          listingData.surface_m2
                                      )
                                    : "",

                            furnished:
                                listingData.furnished
                                    ? "true"
                                    : "false",

                            available_from:
                                listingData.available_from ||
                                "",

                            description:
                                listingData.description ||
                                "",

                            floor:
                                listingData.floor !=
                                null
                                    ? String(
                                          listingData.floor
                                      )
                                    : "",

                            total_floors:
                                listingData.total_floors !=
                                null
                                    ? String(
                                          listingData.total_floors
                                      )
                                    : "",

                            construction_year:
                                listingData.construction_year !=
                                null
                                    ? String(
                                          listingData.construction_year
                                      )
                                    : "",

                            heating_type:
                                listingData.heating_type ||
                                "",

                            air_conditioning:
                                listingData.air_conditioning
                                    ? "true"
                                    : "false",

                            balcony:
                                listingData.balcony
                                    ? "true"
                                    : "false",

                            parking:
                                listingData.parking
                                    ? "true"
                                    : "false",

                            pets_allowed:
                                listingData.pets_allowed
                                    ? "true"
                                    : "false",

                            smoking_allowed:
                                listingData.smoking_allowed
                                    ? "true"
                                    : "false",

                            max_tenants:
                                listingData.max_tenants !=
                                null
                                    ? String(
                                          listingData.max_tenants
                                      )
                                    : "",

                            deposit_amount:
                                listingData.deposit_amount !=
                                null
                                    ? String(
                                          listingData.deposit_amount
                                      )
                                    : "",

                            utilities_included:
                                listingData.utilities_included
                                    ? "true"
                                    : "false",

                            owner_name:
                                listingData.owner_name ||
                                current.owner_name ||
                                "",

                            owner_phone:
                                listingData.owner_phone ||
                                current.owner_phone ||
                                "",

                            owner_email:
                                listingData.owner_email ||
                                current.owner_email ||
                                "",
                        })
                    );

                    if (
                        Number.isFinite(
                            Number(
                                listingData.latitude
                            )
                        ) &&
                        Number.isFinite(
                            Number(
                                listingData.longitude
                            )
                        )
                    ) {
                        setSelectedAddressCoordinates(
                            {
                                latitude:
                                    Number(
                                        listingData.latitude
                                    ),

                                longitude:
                                    Number(
                                        listingData.longitude
                                    ),
                            }
                        );
                    } else {
                        setSelectedAddressCoordinates(
                            null
                        );
                    }

                    const {
                        data:
                            imageData,
                        error:
                            imageError,
                    } =
                        await supabase
                            .from(
                                "listing_images"
                            )
                            .select(
  "id, image_url, storage_path"
)
.eq(
  "listing_id",
  listingId
);

                    if (
                        imageError
                    ) {
                        console.error(
                            "Eroare imagini:",
                            imageError
                        );
                    }

                    if (
                        mounted
                    ) {
                        setImages(
                            (
                                imageData ||
                                []
                            ).map(
                                (
                                    image
                                ) => ({
                                    id: image.id,

existing: true,

image_url:
  image.image_url,

storage_path:
  image.storage_path,

file:
  null,

preview:
  image.image_url,
                                })
                            )
                        );
                    }

                    const {
                        data:
                            universityLinks,
                        error:
                            universityLinksError,
                    } =
                        await supabase
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
                        console.error(
                            "Eroare universități anunț:",
                            universityLinksError
                        );
                    }

                    if (
                        mounted
                    ) {
                        setSelectedUniversityIds(
                            (
                                universityLinks ||
                                []
                            ).map(
                                (
                                    link
                                ) =>
                                    link.university_id
                            )
                        );
                    }
                } catch (
                    listingLoadError
                ) {
                    console.error(
                        "Eroare încărcare anunț:",
                        listingLoadError
                    );

                    if (
                        mounted
                    ) {
                        setError(
                            listingLoadError?.message ||
                                "Nu am putut încărca anunțul."
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
       FILTRARE UNIVERSITĂȚI
    ========================= */

    const filteredUniversities =
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
                    )
                        .trim()
                        .toLowerCase() ===
                    String(
                        form.city ||
                            ""
                    )
                        .trim()
                        .toLowerCase()
            );
        }, [
            universities,
            form.city,
        ]);

    /* =========================
       ORAȘ SELECTAT
    ========================= */

    const selectedCity =
        useMemo(() => {
            if (
                !form.city
            ) {
                return null;
            }

            return (
                cities.find(
                    (
                        city
                    ) =>
                        String(
                            city.name ||
                                ""
                        )
                            .trim()
                            .toLowerCase() ===
                        String(
                            form.city ||
                                ""
                        )
                            .trim()
                            .toLowerCase()
                ) || null
            );
        }, [
            cities,
            form.city,
        ]);

    /* =========================
       CARTIERE FILTRATE
    ========================= */

    const filteredNeighborhoods =
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

    /* =========================
       INPUTURI GENERALE
    ========================= */

    const handleChange = (
        event
    ) => {
        const {
            name,
            value,
        } =
            event.target;

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

    /* =========================
       SCHIMBARE ORAȘ
    ========================= */

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

        setAddressFieldActive(
            true
        );

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
        const handleClickOutsideAddress = (event) => {
            if (
                addressFieldRef.current &&
                !addressFieldRef.current.contains(event.target)
            ) {
                setAddressSuggestionsOpen(false);
                setAddressFieldActive(false);
            }
        };

        document.addEventListener(
            "mousedown",
            handleClickOutsideAddress
        );

        return () => {
            document.removeEventListener(
                "mousedown",
                handleClickOutsideAddress
            );
        };
    }, []);

    useEffect(() => {
        if (!addressFieldActive) {
            setAddressSuggestionsOpen(false);
            return;
        }

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
        addressFieldActive,
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

                setAddressFieldActive(
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

        // Validate before creating previews or adding any new files to state.
        for (const file of selectedFiles) {
            if (!file.type.startsWith("image/")) {
                setImageError("Poți încărca doar fișiere de tip imagine.");
                event.target.value = "";
                return;
            }

            if (file.size > 10 * 1024 * 1024) {
                setImageError("Fiecare fotografie trebuie să aibă maximum 10 MB.");
                event.target.value = "";
                return;
            }
        }

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
            setImageError(
                "Poți avea maximum 10 fotografii."
            );
        } else {
            setImageError(
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

    const selectCalendarDay =
        (
            day
        ) => {
            if (
                !day
            ) {
                return;
            }

            const selectedDate =
                new Date(
                    calendarYear,
                    calendarMonthIndex,
                    day
                );

            const today =
                getTodayAtMidnight();

            if (
                selectedDate <
                today
            ) {
                return;
            }

            const month =
                String(
                    calendarMonthIndex +
                        1
                ).padStart(
                    2,
                    "0"
                );

            const dayString =
                String(
                    day
                ).padStart(
                    2,
                    "0"
                );

            setForm(
                (
                    current
                ) => ({
                    ...current,

                    available_from:
                        `${calendarYear}-${month}-${dayString}`,
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
       UNIVERSITĂȚI SELECTATE
    ========================= */

    const toggleUniversity =
        (
            universityId
        ) => {
            setSelectedUniversityIds(
                (
                    current
                ) => {
                    if (
                        current.includes(
                            universityId
                        )
                    ) {
                        return current.filter(
                            (
                                id
                            ) =>
                                id !==
                                universityId
                        );
                    }

                    return [
                        ...current,
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
        };

    /* =========================
       VALIDARE
    ========================= */

    const validateForm =
        () => {
            if (
                !form.title.trim()
            ) {
                return "Completează titlul anunțului.";
            }

            if (
                !form.city
            ) {
                return "Selectează orașul.";
            }

            if (
                !form.address.trim()
            ) {
                return "Completează adresa.";
            }

            if (
                !selectedAddressCoordinates
            ) {
                return "Selectează adresa din sugestiile afișate pentru a confirma locația.";
            }

            if (
                !form.price_monthly ||
                Number(
                    form.price_monthly
                ) <= 0
            ) {
                return "Completează un preț lunar valid.";
            }

            if (
                !form.rooms ||
                Number(
                    form.rooms
                ) <= 0
            ) {
                return "Completează numărul de camere.";
            }

            if (
                !form.surface_m2 ||
                Number(
                    form.surface_m2
                ) <= 0
            ) {
                return "Completează suprafața utilă.";
            }

            if (
                images.length ===
                0
            ) {
                return "Anunțul trebuie să aibă cel puțin o fotografie.";
            }

            return "";
        };

    /* =========================
       SALVARE
    ========================= */

    const handleSubmit =
        async (
            event
        ) => {
            event.preventDefault();

            if (
                saving
            ) {
                return;
            }

            setError(
                ""
            );

            setSuccess(
                ""
            );

            const validationError =
                validateForm();

            if (
                validationError
            ) {
                setError(
                    validationError
                );

                window.scrollTo(
                    {
                        top:
                            0,

                        behavior:
                            "smooth",
                    }
                );

                return;
            }

            if (
                !user ||
                !listingId
            ) {
                setError(
                    "Nu am putut identifica utilizatorul sau anunțul."
                );

                return;
            }

            setSaving(
                true
            );

            const uploadedPaths =
                [];

            try {
                const listingPayload =
                    {
                        title:
                            form.title.trim(),

                        property_type:
                            form.property_type,

                        city:
                            form.city,

                        neighborhood_id:
                            form.neighborhood_id
                                ? Number(
                                      form.neighborhood_id
                                  )
                                : null,

                        address:
                            form.address.trim(),

                        latitude:
                            selectedAddressCoordinates.latitude,

                        longitude:
                            selectedAddressCoordinates.longitude,

                        price_monthly:
                            Number(
                                form.price_monthly
                            ),

                        rooms:
                            form.rooms
                                ? Number(
                                      form.rooms
                                  )
                                : null,

                        bedrooms:
                            form.bedrooms
                                ? Number(
                                      form.bedrooms
                                  )
                                : null,

                        bathrooms:
                            form.bathrooms
                                ? Number(
                                      form.bathrooms
                                  )
                                : null,

                        surface_m2:
                            form.surface_m2
                                ? Number(
                                      form.surface_m2
                                  )
                                : null,

                        furnished:
                            form.furnished ===
                            "true",

                        available_from:
                            form.available_from ||
                            null,

                        description:
                            form.description.trim(),

                        floor:
                            form.floor !==
                            ""
                                ? Number(
                                      form.floor
                                  )
                                : null,

                        total_floors:
                            form.total_floors !==
                            ""
                                ? Number(
                                      form.total_floors
                                  )
                                : null,

                        construction_year:
                            form.construction_year
                                ? Number(
                                      form.construction_year
                                  )
                                : null,

                        heating_type:
                            form.heating_type ||
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
                            form.max_tenants
                                ? Number(
                                      form.max_tenants
                                  )
                                : null,

                        deposit_amount:
                            form.deposit_amount
                                ? Number(
                                      form.deposit_amount
                                  )
                                : null,

                        utilities_included:
                            form.utilities_included ===
                            "true",

                        owner_name:
                            form.owner_name.trim(),

                        owner_phone:
                            form.owner_phone.trim(),

                        owner_email:
                            form.owner_email.trim(),
                    };

                const {
                    error:
                        updateListingError,
                } =
                    await supabase
                        .from(
                            "listings"
                        )
                        .update(
                            listingPayload
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
                    updateListingError
                ) {
                    throw new Error(
                        `Anunțul nu a putut fi actualizat: ${updateListingError.message}`
                    );
                }

                /* =========================
                   UNIVERSITĂȚI
                ========================= */

                const uniqueUniversityIds =
                    [
                        ...new Set(
                            selectedUniversityIds
                        ),
                    ];

                const {
                    data:
                        existingUniversityLinks,
                    error:
                        existingUniversityLinksError,
                } =
                    await supabase
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
                        `Asocierile cu universitățile nu au putut fi citite: ${existingUniversityLinksError.message}`
                    );
                }

                const existingUniversityIds =
                    (
                        existingUniversityLinks ||
                        []
                    ).map(
                        (
                            link
                        ) =>
                            link.university_id
                    );

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
                    } =
                        await supabase
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
                    } =
                        await supabase
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
                        } =
                            await supabase
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

                            
                        }
                    );
                }

                if (
                    uploadedImages.length >
                    0
                ) {
                    const {
                        error:
                            insertImagesError,
                    } =
                        await supabase
                            .from(
                                "listing_images"
                            )
                            .insert(
                                uploadedImages
                            );

                    if (
                        insertImagesError
                    ) {
                        throw new Error(
                            `Fotografiile noi nu au putut fi salvate: ${insertImagesError.message}`
                        );
                    }
                }

                /* =========================
                   ORDINE IMAGINI EXISTENTE
                ========================= */

                for (
                    let index = 0;
                    index <
                    existingImages.length;
                    index++
                ) {
                    const image =
                        existingImages[
                            index
                        ];

                    if (
                        !image.id
                    ) {
                        continue;
                    }

                    const {
                        error:
                            orderError,
                    } =
                        await supabase
                            .from(
                                "listing_images"
                            )
                            .update(
                                {
                                   
                                }
                            )
                            .eq(
                                "id",
                                image.id
                            )
                            .eq(
                                "listing_id",
                                listingId
                            );

                    if (
                        orderError
                    ) {
                        console.error(
                            "Eroare actualizare ordine fotografie:",
                            orderError
                        );
                    }
                }

                /* =========================
                   IMAGE_URL PRINCIPAL
                ========================= */

                let primaryImageUrl =
                    "";

                if (
                    existingImages.length >
                    0
                ) {
                    primaryImageUrl =
                        existingImages[0]
                            .image_url ||
                        existingImages[0]
                            .preview ||
                        "";
                } else if (
                    uploadedImages.length >
                    0
                ) {
                    primaryImageUrl =
                        uploadedImages[0]
                            .image_url ||
                        "";
                }

                const {
                    error:
                        primaryImageError,
                } =
                    await supabase
                        .from(
                            "listings"
                        )
                        .update(
                            {
                                image_url:
                                    primaryImageUrl ||
                                    null,
                            }
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
                    primaryImageError
                ) {
                    console.error(
                        "Eroare actualizare imagine principală:",
                        primaryImageError
                    );
                }

                setRemovedExistingImages(
                    []
                );

                setSuccess(
                    "Anunțul a fost actualizat cu succes."
                );

                setTimeout(
                    () => {
                        router.push(
                            "/dashboard"
                        );

                        router.refresh();
                    },
                    700
                );
            } catch (
                submitError
            ) {
                console.error(
                    "Eroare actualizare anunț:",
                    submitError
                );

                await cleanupUploadedFiles(
                    uploadedPaths
                );

                setError(
                    submitError?.message ||
                        "Anunțul nu a putut fi actualizat."
                );

                window.scrollTo(
                    {
                        top:
                            0,

                        behavior:
                            "smooth",
                    }
                );
            } finally {
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
                        "#F8FAFC",

                    display:
                        "flex",

                    alignItems:
                        "center",

                    justifyContent:
                        "center",

                    padding:
                        "24px",

                    fontFamily:
                        "Arial, sans-serif",
                }}
            >
                <div
                    style={{
                        color:
                            "#64748B",

                        fontSize:
                            "15px",

                        fontWeight:
                            "700",
                    }}
                >
                    Se încarcă
                    anunțul...
                </div>
            </main>
        );
    }

    /* =========================
       STILURI
    ========================= */

    const inputStyle = {
        width:
            "100%",

        height:
            "52px",

        boxSizing:
            "border-box",

        border:
            "1px solid #DCE3EC",

        borderRadius:
            "10px",

        background:
            "#FFFFFF",

        padding:
            "0 14px",

        color:
            "#0F172A",

        fontSize:
            "14px",

        fontFamily:
            "inherit",

        outline:
            "none",
    };

    const textareaStyle = {
        width:
            "100%",

        minHeight:
            "150px",

        boxSizing:
            "border-box",

        border:
            "1px solid #DCE3EC",

        borderRadius:
            "10px",

        background:
            "#FFFFFF",

        padding:
            "14px",

        color:
            "#0F172A",

        fontSize:
            "14px",

        fontFamily:
            "inherit",

        outline:
            "none",

        resize:
            "vertical",
    };

    const labelStyle = {
        display:
            "block",

        marginBottom:
            "7px",

        color:
            "#334155",

        fontSize:
            "13px",

        fontWeight:
            "700",
    };

    const sectionStyle = {
        background:
            "#FFFFFF",

        border:
            "1px solid #E2E8F0",

        borderRadius:
            "16px",

        padding:
            "22px",

        marginBottom:
            "18px",
    };

    /* =========================
       UI
    ========================= */

    return (
        <main
            style={{
                minHeight:
                    "100vh",

                background:
                    "#F8FAFC",

                fontFamily:
                    "Arial, sans-serif",

                color:
                    "#0F172A",
            }}
        >
            {/* HEADER */}

            <header
                style={{
                    background:
                        "#FFFFFF",

                    borderBottom:
                        "1px solid #E2E8F0",

                    position:
                        "sticky",

                    top:
                        0,

                    zIndex:
                        100,
                }}
            >
                <div
                    style={{
                        maxWidth:
                            "1180px",

                        margin:
                            "0 auto",

                        padding:
                            "0 24px",

                        height:
                            "72px",

                        display:
                            "flex",

                        alignItems:
                            "center",

                        justifyContent:
                            "space-between",
                    }}
                >
                    <button
                        type="button"

                        onClick={() =>
                            router.push(
                                "/"
                            )
                        }

                        style={{
                            border:
                                "none",

                            background:
                                "transparent",

                            padding:
                                0,

                            cursor:
                                "pointer",

                            color:
                                "#172554",

                            fontSize:
                                "26px",

                            fontWeight:
                                "900",

                            letterSpacing:
                                "-1px",
                        }}
                    >
                        shaus
                    </button>

                    <div
                        style={{
                            display:
                                "flex",

                            alignItems:
                                "center",

                            gap:
                                "10px",
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
                                height:
                                    "42px",

                                padding:
                                    "0 15px",

                                border:
                                    "1px solid #DCE3EC",

                                borderRadius:
                                    "10px",

                                background:
                                    "#FFFFFF",

                                color:
                                    "#334155",

                                fontSize:
                                    "13px",

                                fontWeight:
                                    "700",

                                cursor:
                                    "pointer",
                            }}
                        >
                            Contul meu
                        </button>

                        <button
                            type="button"

                            onClick={
                                handleLogout
                            }

                            style={{
                                height:
                                    "42px",

                                padding:
                                    "0 15px",

                                border:
                                    "none",

                                borderRadius:
                                    "10px",

                                background:
                                    "#172554",

                                color:
                                    "#FFFFFF",

                                fontSize:
                                    "13px",

                                fontWeight:
                                    "700",

                                cursor:
                                    "pointer",
                            }}
                        >
                            Ieși din cont
                        </button>
                    </div>
                </div>
            </header>

            {/* CONTENT */}

            <div
                style={{
                    maxWidth:
                        "980px",

                    margin:
                        "0 auto",

                    padding:
                        "34px 24px 60px",
                }}
            >
                <div
                    style={{
                        marginBottom:
                            "24px",
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
                            border:
                                "none",

                            background:
                                "transparent",

                            padding:
                                0,

                            marginBottom:
                                "12px",

                            color:
                                "#64748B",

                            fontSize:
                                "13px",

                            fontWeight:
                                "700",

                            cursor:
                                "pointer",
                        }}
                    >
                        ← Înapoi la
                        dashboard
                    </button>

                    <h1
                        style={{
                            margin:
                                0,

                            color:
                                "#172554",

                            fontSize:
                                "30px",

                            fontWeight:
                                "900",

                            letterSpacing:
                                "-0.7px",
                        }}
                    >
                        Editează
                        proprietatea
                    </h1>

                    <p
                        style={{
                            margin:
                                "8px 0 0",

                            color:
                                "#64748B",

                            fontSize:
                                "14px",

                            lineHeight:
                                "1.6",
                        }}
                    >
                        Modifică
                        informațiile
                        anunțului și
                        salvează
                        schimbările.
                    </p>
                </div>

                {error && (
                    <div
                        style={{
                            marginBottom:
                                "18px",

                            padding:
                                "13px 15px",

                            border:
                                "1px solid #FECACA",

                            borderRadius:
                                "10px",

                            background:
                                "#FEF2F2",

                            color:
                                "#B91C1C",

                            fontSize:
                                "13px",

                            fontWeight:
                                "700",

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
                            marginBottom:
                                "18px",

                            padding:
                                "13px 15px",

                            border:
                                "1px solid #BBF7D0",

                            borderRadius:
                                "10px",

                            background:
                                "#F0FDF4",

                            color:
                                "#166534",

                            fontSize:
                                "13px",

                            fontWeight:
                                "700",

                            lineHeight:
                                "1.5",
                        }}
                    >
                        {success}
                    </div>
                )}

                <form
                    onSubmit={
                        handleSubmit
                    }
                >
                    {/* =========================
                        INFORMAȚII DE BAZĂ
                    ========================= */}

                    <section
                        style={
                            sectionStyle
                        }
                    >
                        <div
                            style={{
                                marginBottom:
                                    "18px",
                            }}
                        >
                            <h2
                                style={{
                                    margin:
                                        0,

                                    color:
                                        "#172554",

                                    fontSize:
                                        "18px",

                                    fontWeight:
                                        "900",
                                }}
                            >
                                Informații
                                de bază
                            </h2>

                            <p
                                style={{
                                    margin:
                                        "5px 0 0",

                                    color:
                                        "#64748B",

                                    fontSize:
                                        "13px",
                                }}
                            >
                                Datele
                                principale
                                ale
                                proprietății.
                            </p>
                        </div>

                        <div
                            style={{
                                display:
                                    "grid",

                                gridTemplateColumns:
                                    "2fr 1fr",

                                gap:
                                    "16px",

                                marginBottom:
                                    "16px",
                            }}
                        >
                            <div>
                                <label
                                    style={
                                        labelStyle
                                    }
                                >
                                    Titlu
                                </label>

                                <input
                                    type="text"

                                    name="title"

                                    value={
                                        form.title
                                    }

                                    onChange={
                                        handleChange
                                    }

                                    placeholder="Ex: Apartament 2 camere aproape de centru"

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
                                    Tip
                                    proprietate
                                </label>

                                <select
                                    name="property_type"

                                    value={
                                        form.property_type
                                    }

                                    onChange={
                                        handleChange
                                    }

                                    style={{
                                        ...inputStyle,

                                        cursor:
                                            "pointer",
                                    }}
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
                        </div>

                        <div
                            style={{
                                display:
                                    "grid",

                                gridTemplateColumns:
                                    "repeat(4, 1fr)",

                                gap:
                                    "16px",
                            }}
                        >
                            <div>
                                <label
                                    style={
                                        labelStyle
                                    }
                                >
                                    Preț
                                    lunar
                                    (€)
                                </label>

                                <input
                                    type="number"

                                    name="price_monthly"

                                    value={
                                        form.price_monthly
                                    }

                                    onChange={
                                        handleChange
                                    }

                                    min="1"

                                    placeholder="450"

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

                                <input
                                    type="number"

                                    name="rooms"

                                    value={
                                        form.rooms
                                    }

                                    onChange={
                                        handleChange
                                    }

                                    min="1"

                                    placeholder="2"

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
                                    Dormitoare
                                </label>

                                <input
                                    type="number"

                                    name="bedrooms"

                                    value={
                                        form.bedrooms
                                    }

                                    onChange={
                                        handleChange
                                    }

                                    min="0"

                                    placeholder="1"

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
                                    Băi
                                </label>

                                <input
                                    type="number"

                                    name="bathrooms"

                                    value={
                                        form.bathrooms
                                    }

                                    onChange={
                                        handleChange
                                    }

                                    min="0"

                                    placeholder="1"

                                    style={
                                        inputStyle
                                    }
                                />
                            </div>
                        </div>
                    </section>

                    {/* =========================
                        LOCAȚIE
                    ========================= */}

                    <section
                        style={
                            sectionStyle
                        }
                    >
                        <div
                            style={{
                                marginBottom:
                                    "18px",
                            }}
                        >
                            <h2
                                style={{
                                    margin:
                                        0,

                                    color:
                                        "#172554",

                                    fontSize:
                                        "18px",

                                    fontWeight:
                                        "900",
                                }}
                            >
                                Locație
                            </h2>

                            <p
                                style={{
                                    margin:
                                        "5px 0 0",

                                    color:
                                        "#64748B",

                                    fontSize:
                                        "13px",
                                }}
                            >
                                Alege
                                orașul,
                                cartierul și
                                adresa
                                proprietății.
                            </p>
                        </div>

                        <div
                            style={{
                                display:
                                    "grid",

                                gridTemplateColumns:
                                    "1fr 1fr",

                                gap:
                                    "16px",

                                marginBottom:
                                    "16px",
                            }}
                        >
                            <div>
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

                                    style={{
                                        ...inputStyle,

                                        cursor:
                                            loadingLocations
                                                ? "not-allowed"
                                                : "pointer",
                                    }}
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

                            <div>
                                <label
                                    style={
                                        labelStyle
                                    }
                                >
                                    Zonă /
                                    cartier
                                </label>

                                <select
                                    name="neighborhood_id"

                                    value={
                                        form.neighborhood_id
                                    }

                                    onChange={
                                        handleChange
                                    }

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
                                        Toate
                                        zonele
                                    </option>

                                    {filteredNeighborhoods.map(
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

                        {/* ADRESĂ */}

                        <div
                            ref={
                                addressFieldRef
                            }

                            style={{
                                position:
                                    "relative",

                                zIndex:
                                    50,
                            }}
                        >
                            <label
                                style={
                                    labelStyle
                                }
                            >
                                Adresa
                                exactă
                            </label>

                            <input
                                type="text"

                                name="address"

                                value={
                                    form.address
                                }

                                onChange={
                                    handleAddressChange
                                }

                                onFocus={() => {
                                    setAddressFieldActive(
                                        true
                                    );

                                    if (
                                        addressSuggestions.length >
                                        0
                                    ) {
                                        setAddressSuggestionsOpen(
                                            true
                                        );
                                    }
                                }}

                                onClick={() => {
                                    setAddressFieldActive(
                                        true
                                    );

                                    if (
                                        addressSuggestions.length >
                                        0
                                    ) {
                                        setAddressSuggestionsOpen(
                                            true
                                        );
                                    }
                                }}

                                autoComplete="off"

                                placeholder="Ex: Strada Exemplu 10"

                                style={
                                    inputStyle
                                }
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

                                        color:
                                            "#64748B",

                                        fontSize:
                                            "11px",

                                        fontWeight:
                                            "700",

                                        pointerEvents:
                                            "none",
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
                                                "calc(100% + 6px)",

                                            left:
                                                0,

                                            right:
                                                0,

                                            background:
                                                "#FFFFFF",

                                            border:
                                                "1px solid #DCE3EC",

                                            borderRadius:
                                                "10px",

                                            boxShadow:
                                                "0 14px 30px rgba(15, 23, 42, 0.12)",

                                            overflow:
                                                "hidden",

                                            zIndex:
                                                1000,
                                        }}
                                    >
                                        {addressSuggestions.map(
                                            (
                                                suggestion,
                                                index
                                            ) => {
                                                const primaryText =
                                                    suggestion.name ||
                                                    suggestion.full_address ||
                                                    "Adresă";

                                                const secondaryText =
                                                    suggestion.full_address &&
                                                    suggestion.full_address !==
                                                        primaryText
                                                        ? suggestion.full_address
                                                        : suggestion.place_formatted ||
                                                          "";

                                                return (
                                                    <button
                                                        key={
                                                            suggestion.mapbox_id ||
                                                            `${primaryText}-${index}`
                                                        }

                                                        type="button"

                                                        onMouseDown={(
                                                            event
                                                        ) => {
                                                            event.preventDefault();
                                                        }}

                                                        onClick={() =>
                                                            selectAddressSuggestion(
                                                                suggestion
                                                            )
                                                        }

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
                                                                    : "1px solid #EEF2F7",

                                                            background:
                                                                "#FFFFFF",

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
                                                                color:
                                                                    "#0F172A",

                                                                fontSize:
                                                                    "13px",

                                                                fontWeight:
                                                                    "800",

                                                                lineHeight:
                                                                    "1.35",
                                                            }}
                                                        >
                                                            {
                                                                primaryText
                                                            }
                                                        </div>

                                                        {secondaryText && (
                                                            <div
                                                                style={{
                                                                    marginTop:
                                                                        "3px",

                                                                    color:
                                                                        "#64748B",

                                                                    fontSize:
                                                                        "11px",

                                                                    lineHeight:
                                                                        "1.4",
                                                                }}
                                                            >
                                                                {
                                                                    secondaryText
                                                                }
                                                            </div>
                                                        )}
                                                    </button>
                                                );
                                            }
                                        )}
                                    </div>
                                )}
                        </div>

                        {selectedAddressCoordinates && (
                            <div
                                style={{
                                    marginTop:
                                        "10px",

                                    color:
                                        "#15803D",

                                    fontSize:
                                        "12px",

                                    fontWeight:
                                        "700",
                                }}
                            >
                                ✓ Locația
                                adresei este
                                confirmată.
                            </div>
                        )}
                    </section>

                    {/* =========================
                        DETALII PROPRIETATE
                    ========================= */}

                    <section
                        style={
                            sectionStyle
                        }
                    >
                        <div
                            style={{
                                marginBottom:
                                    "18px",
                            }}
                        >
                            <h2
                                style={{
                                    margin:
                                        0,

                                    color:
                                        "#172554",

                                    fontSize:
                                        "18px",

                                    fontWeight:
                                        "900",
                                }}
                            >
                                Detalii
                                proprietate
                            </h2>

                            <p
                                style={{
                                    margin:
                                        "5px 0 0",

                                    color:
                                        "#64748B",

                                    fontSize:
                                        "13px",
                                }}
                            >
                                Completează
                                caracteristicile
                                locuinței.
                            </p>
                        </div>

                        <div
                            style={{
                                display:
                                    "grid",

                                gridTemplateColumns:
                                    "repeat(3, 1fr)",

                                gap:
                                    "16px",

                                marginBottom:
                                    "16px",
                            }}
                        >
                            <div>
                                <label
                                    style={
                                        labelStyle
                                    }
                                >
                                    Suprafață
                                    utilă (m²)
                                </label>

                                <input
                                    type="number"

                                    name="surface_m2"

                                    value={
                                        form.surface_m2
                                    }

                                    onChange={
                                        handleChange
                                    }

                                    min="1"

                                    placeholder="55"

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
                                    Etaj
                                </label>

                                <input
                                    type="number"

                                    name="floor"

                                    value={
                                        form.floor
                                    }

                                    onChange={
                                        handleChange
                                    }

                                    placeholder="2"

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
                                    Număr
                                    total
                                    etaje
                                </label>

                                <input
                                    type="number"

                                    name="total_floors"

                                    value={
                                        form.total_floors
                                    }

                                    onChange={
                                        handleChange
                                    }

                                    min="0"

                                    placeholder="4"

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
                                    "repeat(3, 1fr)",

                                gap:
                                    "16px",

                                marginBottom:
                                    "16px",
                            }}
                        >
                            <div>
                                <label
                                    style={
                                        labelStyle
                                    }
                                >
                                    An
                                    construcție
                                </label>

                                <input
                                    type="number"

                                    name="construction_year"

                                    value={
                                        form.construction_year
                                    }

                                    onChange={
                                        handleChange
                                    }

                                    min="1800"

                                    max={
                                        new Date().getFullYear()
                                    }

                                    placeholder="2018"

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
                                    Mobilat
                                </label>

                                <select
                                    name="furnished"

                                    value={
                                        form.furnished
                                    }

                                    onChange={
                                        handleChange
                                    }

                                    style={{
                                        ...inputStyle,

                                        cursor:
                                            "pointer",
                                    }}
                                >
                                    <option value="true">
                                        Da
                                    </option>

                                    <option value="false">
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
                                    Tip
                                    încălzire
                                </label>

                                <select
                                    name="heating_type"

                                    value={
                                        form.heating_type
                                    }

                                    onChange={
                                        handleChange
                                    }

                                    style={{
                                        ...inputStyle,

                                        cursor:
                                            "pointer",
                                    }}
                                >
                                    <option value="">
                                        Nespecificat
                                    </option>

                                    <option value="central">
                                        Centrală
                                        proprie
                                    </option>

                                    <option value="district">
                                        Termoficare
                                    </option>

                                    <option value="electric">
                                        Electrică
                                    </option>

                                    <option value="gas">
                                        Gaz
                                    </option>

                                    <option value="other">
                                        Alt tip
                                    </option>
                                </select>
                            </div>
                        </div>

                        <div
                            style={{
                                display:
                                    "grid",

                                gridTemplateColumns:
                                    "repeat(3, 1fr)",

                                gap:
                                    "16px",
                            }}
                        >
                            <div>
                                <label
                                    style={
                                        labelStyle
                                    }
                                >
                                    Aer
                                    condiționat
                                </label>

                                <select
                                    name="air_conditioning"

                                    value={
                                        form.air_conditioning
                                    }

                                    onChange={
                                        handleChange
                                    }

                                    style={{
                                        ...inputStyle,

                                        cursor:
                                            "pointer",
                                    }}
                                >
                                    <option value="false">
                                        Nu
                                    </option>

                                    <option value="true">
                                        Da
                                    </option>
                                </select>
                            </div>

                            <div>
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
                                        handleChange
                                    }

                                    style={{
                                        ...inputStyle,

                                        cursor:
                                            "pointer",
                                    }}
                                >
                                    <option value="false">
                                        Nu
                                    </option>

                                    <option value="true">
                                        Da
                                    </option>
                                </select>
                            </div>

                            <div>
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
                                        handleChange
                                    }

                                    style={{
                                        ...inputStyle,

                                        cursor:
                                            "pointer",
                                    }}
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
                    </section>

                    {/* =========================
                        DISPONIBILITATE
                    ========================= */}

                    <section
                        style={
                            sectionStyle
                        }
                    >
                        <div
                            style={{
                                marginBottom:
                                    "18px",
                            }}
                        >
                            <h2
                                style={{
                                    margin:
                                        0,

                                    color:
                                        "#172554",

                                    fontSize:
                                        "18px",

                                    fontWeight:
                                        "900",
                                }}
                            >
                                Disponibilitate
                                și condiții
                            </h2>

                            <p
                                style={{
                                    margin:
                                        "5px 0 0",

                                    color:
                                        "#64748B",

                                    fontSize:
                                        "13px",
                                }}
                            >
                                Data
                                disponibilității
                                și condițiile
                                proprietății.
                            </p>
                        </div>

                        <div
                            style={{
                                display:
                                    "grid",

                                gridTemplateColumns:
                                    "repeat(3, 1fr)",

                                gap:
                                    "16px",

                                marginBottom:
                                    "16px",
                            }}
                        >
                            <div
                                ref={calendarRef}
                                style={{
                                    position:
                                        "relative",
                                }}
                            >
                                <label
                                    style={
                                        labelStyle
                                    }
                                >
                                    Disponibil
                                    de la
                                </label>

                                <button
                                    type="button"

                                    onClick={
                                        openCalendar
                                    }

                                    style={{
                                        ...inputStyle,

                                        cursor:
                                            "pointer",

                                        textAlign:
                                            "left",

                                        display:
                                            "flex",

                                        alignItems:
                                            "center",

                                        justifyContent:
                                            "space-between",

                                        color:
                                            form.available_from
                                                ? "#0F172A"
                                                : "#94A3B8",
                                    }}
                                >
                                    <span>
                                        {form.available_from
                                            ? formatRomanianDate(
                                                  form.available_from
                                              )
                                            : "ZZ/LL/AAAA"}
                                    </span>

                                    <span>
                                        ▣
                                    </span>
                                </button>

                                {calendarOpen && (
                                    <div
                                        style={{
                                            position:
                                                "absolute",

                                            top:
                                                "calc(100% + 7px)",

                                            left:
                                                0,

                                            zIndex:
                                                1000,

                                            width:
                                                "292px",

                                            boxSizing:
                                                "border-box",

                                            background:
                                                "#FFFFFF",

                                            border:
                                                "1px solid #E2E8F0",

                                            borderRadius:
                                                "12px",

                                            padding:
                                                "13px",

                                            boxShadow:
                                                "0 14px 35px rgba(15, 23, 42, 0.14)",
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
                                                    "12px",
                                            }}
                                        >
                                            <button
                                                type="button"

                                                onClick={
                                                    previousCalendarMonth
                                                }

                                                disabled={
                                                    !canGoToPreviousMonth
                                                }

                                                style={{
                                                    width:
                                                        "32px",

                                                    height:
                                                        "32px",

                                                    border:
                                                        "1px solid #E2E8F0",

                                                    borderRadius:
                                                        "8px",

                                                    background:
                                                        !canGoToPreviousMonth
                                                            ? "#F8FAFC"
                                                            : "#FFFFFF",

                                                    color:
                                                        !canGoToPreviousMonth
                                                            ? "#CBD5E1"
                                                            : "#172554",

                                                    cursor:
                                                        !canGoToPreviousMonth
                                                            ? "not-allowed"
                                                            : "pointer",

                                                    fontSize:
                                                        "18px",
                                                }}
                                            >
                                                ‹
                                            </button>

                                            <div
                                                style={{
                                                    color:
                                                        "#172554",

                                                    fontSize:
                                                        "13px",

                                                    fontWeight:
                                                        "800",
                                                }}
                                            >
                                                {
                                                    romanianMonths[
                                                        calendarMonthIndex
                                                    ]
                                                }{" "}
                                                {
                                                    calendarYear
                                                }
                                            </div>

                                            <button
                                                type="button"

                                                onClick={
                                                    nextCalendarMonth
                                                }

                                                style={{
                                                    width:
                                                        "32px",

                                                    height:
                                                        "32px",

                                                    border:
                                                        "1px solid #E2E8F0",

                                                    borderRadius:
                                                        "8px",

                                                    background:
                                                        "#FFFFFF",

                                                    color:
                                                        "#172554",

                                                    cursor:
                                                        "pointer",

                                                    fontSize:
                                                        "18px",
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
                                                    "3px",

                                                marginBottom:
                                                    "5px",
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
                                                    dayName
                                                ) => (
                                                    <div
                                                        key={
                                                            dayName
                                                        }

                                                        style={{
                                                            textAlign:
                                                                "center",

                                                            color:
                                                                "#94A3B8",

                                                            fontSize:
                                                                "9px",

                                                            fontWeight:
                                                                "800",

                                                            padding:
                                                                "4px 0",
                                                        }}
                                                    >
                                                        {
                                                            dayName
                                                        }
                                                    </div>
                                                )
                                            )}
                                        </div>

                                        <div
                                            style={{
                                                display:
                                                    "grid",

                                                gridTemplateColumns:
                                                    "repeat(7, 1fr)",

                                                gap:
                                                    "3px",
                                            }}
                                        >
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
                                                                key={
                                                                    `empty-${index}`
                                                                }
                                                            />
                                                        );
                                                    }

                                                    const cellDate =
                                                        new Date(
                                                            calendarYear,
                                                            calendarMonthIndex,
                                                            day
                                                        );

                                                    const today =
                                                        getTodayAtMidnight();

                                                    const disabled =
                                                        cellDate <
                                                        today;

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
                                                                selectCalendarDay(
                                                                    day
                                                                )
                                                            }

                                                            style={{
                                                                width:
                                                                    "100%",

                                                                aspectRatio:
                                                                    "1 / 1",

                                                                border:
                                                                    selected
                                                                        ? "1px solid #2563EB"
                                                                        : "1px solid transparent",

                                                                borderRadius:
                                                                    "7px",

                                                                background:
                                                                    selected
                                                                        ? "#2563EB"
                                                                        : "#FFFFFF",

                                                                color:
                                                                    selected
                                                                        ? "#FFFFFF"
                                                                        : disabled
                                                                        ? "#CBD5E1"
                                                                        : "#334155",

                                                                fontFamily:
                                                                    "inherit",

                                                                fontSize:
                                                                    "10px",

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
                                                            {
                                                                day
                                                            }
                                                        </button>
                                                    );
                                                }
                                            )}
                                        </div>

                                        <div
                                            style={{
                                                display:
                                                    "flex",

                                                justifyContent:
                                                    "space-between",

                                                alignItems:
                                                    "center",

                                                gap:
                                                    "8px",

                                                marginTop:
                                                    "11px",

                                                paddingTop:
                                                    "10px",

                                                borderTop:
                                                    "1px solid #F1F5F9",
                                            }}
                                        >
                                            <button
                                                type="button"

                                                onClick={() => {
                                                    setForm(
                                                        (
                                                            current
                                                        ) => ({
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
                                                    border:
                                                        "none",

                                                    background:
                                                        "transparent",

                                                    color:
                                                        "#64748B",

                                                    padding:
                                                        "5px 2px",

                                                    fontFamily:
                                                        "inherit",

                                                    fontSize:
                                                        "10px",

                                                    fontWeight:
                                                        "800",

                                                    cursor:
                                                        "pointer",
                                                }}
                                            >
                                                Șterge
                                                data
                                            </button>

                                            <button
                                                type="button"

                                                onClick={() => {
                                                    const today =
                                                        getTodayAtMidnight();

                                                    const year =
                                                        today.getFullYear();

                                                    const month =
                                                        String(
                                                            today.getMonth() +
                                                                1
                                                        ).padStart(
                                                            2,
                                                            "0"
                                                        );

                                                    const day =
                                                        String(
                                                            today.getDate()
                                                        ).padStart(
                                                            2,
                                                            "0"
                                                        );

                                                    setForm(
                                                        (
                                                            current
                                                        ) => ({
                                                            ...current,

                                                            available_from:
                                                                `${year}-${month}-${day}`,
                                                        })
                                                    );

                                                    setCalendarOpen(
                                                        false
                                                    );
                                                }}

                                                style={{
                                                    border:
                                                        "1px solid #BFDBFE",

                                                    background:
                                                        "#EFF6FF",

                                                    color:
                                                        "#2563EB",

                                                    borderRadius:
                                                        "7px",

                                                    padding:
                                                        "6px 9px",

                                                    fontFamily:
                                                        "inherit",

                                                    fontSize:
                                                        "10px",

                                                    fontWeight:
                                                        "800",

                                                    cursor:
                                                        "pointer",
                                                }}
                                            >
                                                Astăzi
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label
                                    style={
                                        labelStyle
                                    }
                                >
                                    Număr
                                    maxim
                                    chiriași
                                </label>

                                <input
                                    type="number"

                                    name="max_tenants"

                                    value={
                                        form.max_tenants
                                    }

                                    onChange={
                                        handleChange
                                    }

                                    min="1"

                                    placeholder="2"

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
                                    Garanție
                                    (€)
                                </label>

                                <input
                                    type="number"

                                    name="deposit_amount"

                                    value={
                                        form.deposit_amount
                                    }

                                    onChange={
                                        handleChange
                                    }

                                    min="0"

                                    placeholder="450"

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
                                    "repeat(3, 1fr)",

                                gap:
                                    "16px",
                            }}
                        >
                            <div>
                                <label
                                    style={
                                        labelStyle
                                    }
                                >
                                    Animale
                                    acceptate
                                </label>

                                <select
                                    name="pets_allowed"

                                    value={
                                        form.pets_allowed
                                    }

                                    onChange={
                                        handleChange
                                    }

                                    style={{
                                        ...inputStyle,

                                        cursor:
                                            "pointer",
                                    }}
                                >
                                    <option value="false">
                                        Nu
                                    </option>

                                    <option value="true">
                                        Da
                                    </option>
                                </select>
                            </div>

                            <div>
                                <label
                                    style={
                                        labelStyle
                                    }
                                >
                                    Fumat
                                    permis
                                </label>

                                <select
                                    name="smoking_allowed"

                                    value={
                                        form.smoking_allowed
                                    }

                                    onChange={
                                        handleChange
                                    }

                                    style={{
                                        ...inputStyle,

                                        cursor:
                                            "pointer",
                                    }}
                                >
                                    <option value="false">
                                        Nu
                                    </option>

                                    <option value="true">
                                        Da
                                    </option>
                                </select>
                            </div>

                            <div>
                                <label
                                    style={
                                        labelStyle
                                    }
                                >
                                    Utilități
                                    incluse
                                </label>

                                <select
                                    name="utilities_included"

                                    value={
                                        form.utilities_included
                                    }

                                    onChange={
                                        handleChange
                                    }

                                    style={{
                                        ...inputStyle,

                                        cursor:
                                            "pointer",
                                    }}
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
                    </section>
                    {/* =========================
                        UNIVERSITĂȚI
                    ========================= */}

                    <section
                        style={
                            sectionStyle
                        }
                    >
                        <div
                            style={{
                                marginBottom:
                                    "18px",
                            }}
                        >
                            <h2
                                style={{
                                    margin:
                                        0,

                                    color:
                                        "#172554",

                                    fontSize:
                                        "18px",

                                    fontWeight:
                                        "900",
                                }}
                            >
                                Universități
                                apropiate
                            </h2>

                            <p
                                style={{
                                    margin:
                                        "5px 0 0",

                                    color:
                                        "#64748B",

                                    fontSize:
                                        "13px",

                                    lineHeight:
                                        "1.5",
                                }}
                            >
                                Poți asocia
                                anunțul cu una
                                sau mai multe
                                universități
                                din oraș.
                            </p>
                        </div>

                        {!form.city ? (
                            <div
                                style={{
                                    padding:
                                        "14px",

                                    border:
                                        "1px dashed #CBD5E1",

                                    borderRadius:
                                        "10px",

                                    color:
                                        "#64748B",

                                    fontSize:
                                        "13px",
                                }}
                            >
                                Selectează
                                mai întâi
                                orașul.
                            </div>
                        ) : loadingUniversities ? (
                            <div
                                style={{
                                    color:
                                        "#64748B",

                                    fontSize:
                                        "13px",
                                }}
                            >
                                Se încarcă
                                universitățile...
                            </div>
                        ) : filteredUniversities.length ===
                          0 ? (
                            <div
                                style={{
                                    padding:
                                        "14px",

                                    border:
                                        "1px dashed #CBD5E1",

                                    borderRadius:
                                        "10px",

                                    color:
                                        "#64748B",

                                    fontSize:
                                        "13px",
                                }}
                            >
                                Nu există
                                universități
                                disponibile
                                pentru acest
                                oraș.
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
                                {filteredUniversities.map(
                                    (
                                        university
                                    ) => {
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
                                                        "12px",

                                                    border:
                                                        checked
                                                            ? "1px solid #93C5FD"
                                                            : "1px solid #E2E8F0",

                                                    borderRadius:
                                                        "10px",

                                                    background:
                                                        checked
                                                            ? "#EFF6FF"
                                                            : "#FFFFFF",

                                                    cursor:
                                                        "pointer",
                                                }}
                                            >
                                                <input
                                                    type="checkbox"

                                                    checked={
                                                        checked
                                                    }

                                                    onChange={() =>
                                                        toggleUniversity(
                                                            university.id
                                                        )
                                                    }

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
                                                        minWidth:
                                                            0,
                                                    }}
                                                >
                                                    <span
                                                        style={{
                                                            display:
                                                                "block",

                                                            color:
                                                                "#0F172A",

                                                            fontSize:
                                                                "13px",

                                                            fontWeight:
                                                                "800",

                                                            lineHeight:
                                                                "1.4",
                                                        }}
                                                    >
                                                        {university.short_name ||
                                                            university.name}
                                                    </span>

                                                    {university.short_name &&
                                                        university.name && (
                                                            <span
                                                                style={{
                                                                    display:
                                                                        "block",

                                                                    marginTop:
                                                                        "2px",

                                                                    color:
                                                                        "#64748B",

                                                                    fontSize:
                                                                        "11px",

                                                                    lineHeight:
                                                                        "1.4",
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
                    </section>

                    {/* =========================
                        DESCRIERE
                    ========================= */}

                    <section
                        style={
                            sectionStyle
                        }
                    >
                        <div
                            style={{
                                marginBottom:
                                    "18px",
                            }}
                        >
                            <h2
                                style={{
                                    margin:
                                        0,

                                    color:
                                        "#172554",

                                    fontSize:
                                        "18px",

                                    fontWeight:
                                        "900",
                                }}
                            >
                                Descriere
                            </h2>

                            <p
                                style={{
                                    margin:
                                        "5px 0 0",

                                    color:
                                        "#64748B",

                                    fontSize:
                                        "13px",
                                }}
                            >
                                Prezintă
                                proprietatea
                                cât mai clar
                                pentru
                                studenți.
                            </p>
                        </div>

                        <textarea
                            name="description"

                            value={
                                form.description
                            }

                            onChange={
                                handleChange
                            }

                            placeholder="Descrie proprietatea, facilitățile, zona, transportul și orice alte informații utile..."

                            style={
                                textareaStyle
                            }
                        />
                    </section>

                    {/* =========================
                        FOTOGRAFII
                    ========================= */}

                    <section
                        style={
                            sectionStyle
                        }
                    >
                        <div
                            style={{
                                marginBottom:
                                    "18px",
                            }}
                        >
                            <h2
                                style={{
                                    margin:
                                        0,

                                    color:
                                        "#172554",

                                    fontSize:
                                        "18px",

                                    fontWeight:
                                        "900",
                                }}
                            >
                                Fotografii
                            </h2>

                            <p
                                style={{
                                    margin:
                                        "5px 0 0",

                                    color:
                                        "#64748B",

                                    fontSize:
                                        "13px",

                                    lineHeight:
                                        "1.5",
                                }}
                            >
                                Poți păstra
                                fotografiile
                                existente,
                                elimina unele
                                sau adăuga
                                altele noi.
                                Maximum 10
                                fotografii.
                            </p>
                        </div>

                        <label
                            style={{
                                display:
                                    "flex",

                                alignItems:
                                    "center",

                                justifyContent:
                                    "center",

                                minHeight:
                                    "110px",

                                padding:
                                    "18px",

                                border:
                                    "1px dashed #94A3B8",

                                borderRadius:
                                    "12px",

                                background:
                                    "#F8FAFC",

                                cursor:
                                    images.length >=
                                    10
                                        ? "not-allowed"
                                        : "pointer",

                                opacity:
                                    images.length >=
                                    10
                                        ? 0.6
                                        : 1,

                                textAlign:
                                    "center",
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

                            <div>
                                <div
                                    style={{
                                        color:
                                            "#172554",

                                        fontSize:
                                            "14px",

                                        fontWeight:
                                            "800",
                                    }}
                                >
                                    {images.length >=
                                    10
                                        ? "Ai ajuns la limita de 10 fotografii"
                                        : "Adaugă fotografii"}
                                </div>

                                <div
                                    style={{
                                        marginTop:
                                            "5px",

                                        color:
                                            "#64748B",

                                        fontSize:
                                            "12px",
                                    }}
                                >
                                    {images.length}/10
                                    fotografii
                                </div>
                            </div>
                        </label>

                        {images.length >
                            0 && (
                            <div
                                style={{
                                    display:
                                        "grid",

                                    gridTemplateColumns:
                                        "repeat(4, minmax(0, 1fr))",

                                    gap:
                                        "12px",

                                    marginTop:
                                        "16px",
                                }}
                            >
                                {images.map(
                                    (
                                        image,
                                        index
                                    ) => (
                                        <div
                                            key={
                                                image.id ||
                                                image.preview ||
                                                index
                                            }

                                            style={{
                                                position:
                                                    "relative",

                                                aspectRatio:
                                                    "4 / 3",

                                                border:
                                                    "1px solid #E2E8F0",

                                                borderRadius:
                                                    "10px",

                                                overflow:
                                                    "hidden",

                                                background:
                                                    "#F1F5F9",
                                            }}
                                        >
                                            <img
                                                src={
                                                    image.image_url ||
                                                    image.preview
                                                }

                                                alt={`Fotografie ${
                                                    index +
                                                    1
                                                }`}

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

                                                        top:
                                                            "8px",

                                                        left:
                                                            "8px",

                                                        padding:
                                                            "5px 8px",

                                                        borderRadius:
                                                            "7px",

                                                        background:
                                                            "rgba(15, 23, 42, 0.82)",

                                                        color:
                                                            "#FFFFFF",

                                                        fontSize:
                                                            "10px",

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

                                                aria-label={`Șterge fotografia ${
                                                    index +
                                                    1
                                                }`}

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

                                                    display:
                                                        "flex",

                                                    alignItems:
                                                        "center",

                                                    justifyContent:
                                                        "center",

                                                    border:
                                                        "none",

                                                    borderRadius:
                                                        "50%",

                                                    background:
                                                        "rgba(255, 255, 255, 0.94)",

                                                    color:
                                                        "#B91C1C",

                                                    fontSize:
                                                        "16px",

                                                    fontWeight:
                                                        "900",

                                                    cursor:
                                                        "pointer",

                                                    boxShadow:
                                                        "0 2px 8px rgba(15, 23, 42, 0.16)",
                                                }}
                                            >
                                                ×
                                            </button>
                                        </div>
                                    )
                                )}
                            </div>
                        )}
                        {imageError && (
                            <div
                                role="alert"
                                style={{
                                    marginTop: "16px",
                                    padding: "13px 15px",
                                    border: "1px solid #FECACA",
                                    borderRadius: "10px",
                                    background: "#FEF2F2",
                                    color: "#B91C1C",
                                    fontSize: "13px",
                                    fontWeight: "700",
                                    lineHeight: "1.5",
                                    overflowWrap: "anywhere",
                                    minWidth: 0,
                                }}
                            >
                                {imageError}
                            </div>
                        )}
                    </section>

                    {/* =========================
                        DATE CONTACT
                    ========================= */}

                    <section
                        style={
                            sectionStyle
                        }
                    >
                        <div
                            style={{
                                marginBottom:
                                    "18px",
                            }}
                        >
                            <h2
                                style={{
                                    margin:
                                        0,

                                    color:
                                        "#172554",

                                    fontSize:
                                        "18px",

                                    fontWeight:
                                        "900",
                                }}
                            >
                                Date de
                                contact
                            </h2>

                            <p
                                style={{
                                    margin:
                                        "5px 0 0",

                                    color:
                                        "#64748B",

                                    fontSize:
                                        "13px",
                                }}
                            >
                                Informațiile
                                prin care
                                studenții te
                                pot contacta.
                            </p>
                        </div>

                        <div
                            style={{
                                display:
                                    "grid",

                                gridTemplateColumns:
                                    "repeat(3, 1fr)",

                                gap:
                                    "16px",
                            }}
                        >
                            <div>
                                <label
                                    style={
                                        labelStyle
                                    }
                                >
                                    Nume
                                </label>

                                <input
                                    type="text"

                                    name="owner_name"

                                    value={
                                        form.owner_name
                                    }

                                    onChange={
                                        handleChange
                                    }

                                    placeholder="Numele proprietarului"

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
                                    Telefon
                                </label>

                                <input
                                    type="tel"

                                    name="owner_phone"

                                    value={
                                        form.owner_phone
                                    }

                                    onChange={
                                        handleChange
                                    }

                                    placeholder="07xx xxx xxx"

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
                                    Email
                                </label>

                                <input
                                    type="email"

                                    name="owner_email"

                                    value={
                                        form.owner_email
                                    }

                                    onChange={
                                        handleChange
                                    }

                                    placeholder="email@exemplu.ro"

                                    style={
                                        inputStyle
                                    }
                                />
                            </div>
                        </div>
                    </section>

                    {/* =========================
                        BUTOANE
                    ========================= */}

                    <div
                        style={{
                            display:
                                "flex",

                            alignItems:
                                "center",

                            justifyContent:
                                "flex-end",

                            gap:
                                "12px",

                            marginTop:
                                "22px",
                        }}
                    >
                        <button
                            type="button"

                            onClick={() =>
                                router.push(
                                    "/dashboard"
                                )
                            }

                            disabled={
                                saving
                            }

                            style={{
                                height:
                                    "48px",

                                padding:
                                    "0 20px",

                                border:
                                    "1px solid #DCE3EC",

                                borderRadius:
                                    "10px",

                                background:
                                    "#FFFFFF",

                                color:
                                    "#475569",

                                fontFamily:
                                    "inherit",

                                fontSize:
                                    "13px",

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
                            Renunță
                        </button>

                        <button
                            type="submit"

                            disabled={
                                saving
                            }

                            style={{
                                minWidth:
                                    "190px",

                                height:
                                    "48px",

                                padding:
                                    "0 22px",

                                border:
                                    "none",

                                borderRadius:
                                    "10px",

                                background:
                                    saving
                                        ? "#94A3B8"
                                        : "#172554",

                                color:
                                    "#FFFFFF",

                                fontFamily:
                                    "inherit",

                                fontSize:
                                    "13px",

                                fontWeight:
                                    "800",

                                cursor:
                                    saving
                                        ? "not-allowed"
                                        : "pointer",
                            }}
                        >
                            {saving
                                ? "Se salvează..."
                                : "Salvează modificările"}
                        </button>
                    </div>
                </form>
            </div>

            {/* =========================
                RESPONSIVE
            ========================= */}

            <style jsx global>{`
                @media (max-width: 820px) {
                    main form section > div[style*="grid-template-columns: 2fr 1fr"],
                    main form section > div[style*="grid-template-columns: repeat(4"],
                    main form section > div[style*="grid-template-columns: repeat(3"],
                    main form section > div[style*="grid-template-columns: 1fr 1fr"],
                    main form section > div[style*="grid-template-columns: repeat(2"] {
                        grid-template-columns: 1fr !important;
                    }
                }

                @media (max-width: 620px) {
                    main header > div {
                        padding-left: 16px !important;
                        padding-right: 16px !important;
                    }

                    main header > div > div {
                        gap: 6px !important;
                    }

                    main header button {
                        padding-left: 10px !important;
                        padding-right: 10px !important;
                    }

                    main > div {
                        padding-left: 14px !important;
                        padding-right: 14px !important;
                    }

                    main form section {
                        padding: 16px !important;
                    }

                    main form section > div[style*="grid-template-columns"] {
                        grid-template-columns: 1fr !important;
                    }

                    main form + div {
                        flex-direction: column !important;
                    }
                }
            `}</style>
        </main>
    );
}
