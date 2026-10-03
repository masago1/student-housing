"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ListingFormView from "../../components/ListingFormView";
import { existingListingImages } from "../../lib/listingForm.mjs";
import { supabase } from "../../lib/supabase";

export default function EditeazaProprietatePage() {
    const router = useRouter();
    const params = useParams();

    const listingId = params?.id;

    const [listingReady, setListingReady] = useState(false);
    const [user, setUser] = useState(null);
    const [ownerContact, setOwnerContact] = useState({ nickname: "", phone: "", email: "" });

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
                        "nickname, phone"
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

                if (mounted) {
                    setOwnerContact({
                        nickname: profileData?.nickname || "",
                        phone: profileData?.phone || "",
                        email: currentUser.email || "",
                    });
                }
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
                    setListingReady(false);
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

                            listing_type: listingData.listing_type || "rent",
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

                    if (imageError) throw imageError;

                    if (
                        mounted
                    ) {
                        setImages(existingListingImages(imageData, listingData.image_url));
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

                    if (universityLinksError) throw universityLinksError;

                    if (
                        mounted
                    ) {
                        setListingReady(true);
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
            if (!listingReady) return;

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

                        listing_type: form.listing_type,
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

    return <ListingFormView editing disabled={!listingReady} imageError={imageError} toggleUniversity={toggleUniversity}
        addressFieldRef={addressFieldRef} onAddressFocus={() => setAddressFieldActive(true)}
        {...{
        addressSuggestions,
        addressSuggestionsOpen,
        calendarCells,
        calendarMonthIndex,
        calendarOpen,
        calendarRef,
        calendarYear,
        canGoToPreviousMonth,
        cities,
        error,
        form: { ...form, owner_name: ownerContact.nickname, owner_phone: ownerContact.phone },
        getTodayAtMidnight,
        handleAddressChange,
        handleCityChange,
        handleImages,
        handleLogout,
        handleSubmit,
        images,
        loadingAddressSuggestions,
        loadingLocations,
        loadingUniversities,
        neighborhoodsForCity: filteredNeighborhoods,
        nextCalendarMonth,
        openCalendar,
        previousCalendarMonth,
        publishing: saving,
        removeImage,
        romanianMonths,
        router,
        selectAddressSuggestion,
        selectCalendarDate: (_year, _month, day) => selectCalendarDay(day),
        selectedUniversityIds,
        setAddressSuggestionsOpen,
        setCalendarOpen,
        setForm,
        setSelectedUniversityIds,
        success,
        universitiesForCity: filteredUniversities,
        updateField: handleChange,
        user
    }} />;
}
