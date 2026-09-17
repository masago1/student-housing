"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

export default function AdaugaProprietatePage() {
    const router = useRouter();

    const [user, setUser] = useState(null);
    const [checkingAuth, setCheckingAuth] = useState(true);
    const [publishing, setPublishing] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const [images, setImages] = useState([]);

    const [universities, setUniversities] = useState([]);
    const [selectedUniversityIds, setSelectedUniversityIds] = useState([]);

    const [cities, setCities] = useState([]);
    const [neighborhoods, setNeighborhoods] = useState([]);
    const [loadingLocations, setLoadingLocations] = useState(true);

    const [calendarOpen, setCalendarOpen] = useState(false);
    const [calendarMonth, setCalendarMonth] = useState(
        new Date()
    );

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
        owner_name: "",
        owner_phone: "",
        owner_email: "",
    });

    /* =========================
       AUTENTIFICARE
    ========================= */

    useEffect(() => {
        const checkUser = async () => {
            const {
                data: { user },
                error,
            } = await supabase.auth.getUser();

            if (error || !user) {
                router.replace("/login");
                return;
            }

            setUser(user);

            setForm((current) => ({
                ...current,
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
            const { data, error } = await supabase
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
                return;
            }

            setUniversities(data || []);
        };

        loadUniversities();
    }, []);

    /* =========================
       ORAȘE + CARTIERE
    ========================= */

    useEffect(() => {
        const loadLocations = async () => {
            setLoadingLocations(true);

            const [
                citiesResult,
                neighborhoodsResult,
            ] = await Promise.all([
                supabase
                    .from("cities")
                    .select("id, name, slug")
                    .order("name", {
                        ascending: true,
                    }),

                supabase
                    .from("neighborhoods")
                    .select(
                        "id, city_id, name, slug"
                    )
                    .order("name", {
                        ascending: true,
                    }),
            ]);

            if (citiesResult.error) {
                console.error(
                    "Eroare la încărcarea orașelor:",
                    citiesResult.error
                );
                setCities([]);
            } else {
                setCities(
                    citiesResult.data || []
                );
            }

            if (neighborhoodsResult.error) {
                console.error(
                    "Eroare la încărcarea cartierelor:",
                    neighborhoodsResult.error
                );
                setNeighborhoods([]);
            } else {
                setNeighborhoods(
                    neighborhoodsResult.data || []
                );
            }

            setLoadingLocations(false);
        };

        loadLocations();
    }, []);

    const selectedCity = useMemo(() => {
        return (
            cities.find(
                (city) =>
                    city.name === form.city
            ) || null
        );
    }, [cities, form.city]);

    const neighborhoodsForCity = useMemo(() => {
        if (!selectedCity) {
            return [];
        }

        return neighborhoods.filter(
            (neighborhood) =>
                neighborhood.city_id ===
                selectedCity.id
        );
    }, [neighborhoods, selectedCity]);

    const universitiesForCity = useMemo(() => {
        if (!form.city) {
            return [];
        }

        return universities.filter(
            (university) =>
                university.city === form.city
        );
    }, [universities, form.city]);

    /* =========================
       FORM
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

    const handleCityChange = (event) => {
        const city = event.target.value;

        setForm((current) => ({
            ...current,
            city,
            neighborhood_id: "",
        }));

        setSelectedUniversityIds([]);
    };

    /* =========================
       POZE
    ========================= */

    const handleImages = (event) => {
        setError("");

        const selectedFiles = Array.from(
            event.target.files || []
        );

        if (!selectedFiles.length) {
            return;
        }

        const remainingSlots =
            10 - images.length;

        if (remainingSlots <= 0) {
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

        for (const file of selectedFiles) {
            if (!file.type.startsWith("image/")) {
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
                    URL.createObjectURL(file),
            });
        }

        setImages((current) => [
            ...current,
            ...validFiles,
        ]);

        event.target.value = "";
    };

    const removeImage = (index) => {
        setImages((current) => {
            const image = current[index];

            if (image?.preview) {
                URL.revokeObjectURL(
                    image.preview
                );
            }

            return current.filter(
                (_, i) => i !== index
            );
        });
    };

    /* =========================
       LOGOUT
    ========================= */

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/");
        router.refresh();
    };

    /* =========================
       CLEANUP STORAGE
    ========================= */

    const cleanupUploadedFiles = async (
        paths
    ) => {
        if (!paths.length) {
            return;
        }

        await supabase.storage
            .from("listing-images")
            .remove(paths);
    };

    /* =========================
       CALENDAR
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

    const openCalendar = () => {
        if (form.available_from) {
            const [
                year,
                month,
            ] = form.available_from
                .split("-")
                .map(Number);

            setCalendarMonth(
                new Date(
                    year,
                    month - 1,
                    1
                )
            );
        } else {
            setCalendarMonth(
                new Date()
            );
        }

        setCalendarOpen(
            (current) => !current
        );
    };

    const selectCalendarDate = (
        year,
        month,
        day
    ) => {
        const isoDate =
            `${year}-${String(
                month + 1
            ).padStart(2, "0")}-${String(
                day
            ).padStart(2, "0")}`;

        setForm((current) => ({
            ...current,
            available_from: isoDate,
        }));

        setCalendarOpen(false);
    };

    const calendarYear =
        calendarMonth.getFullYear();

    const calendarMonthIndex =
        calendarMonth.getMonth();

    const firstDay = new Date(
        calendarYear,
        calendarMonthIndex,
        1
    ).getDay();

    const mondayOffset =
        (firstDay + 6) % 7;

    const daysInMonth =
        new Date(
            calendarYear,
            calendarMonthIndex + 1,
            0
        ).getDate();

    const previousCalendarMonth = () => {
        setCalendarMonth(
            new Date(
                calendarYear,
                calendarMonthIndex - 1,
                1
            )
        );
    };

    const nextCalendarMonth = () => {
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

    const handleSubmit = async (
        event
    ) => {
        event.preventDefault();

        setError("");
        setSuccess("");

        if (!user) {
            router.replace("/login");
            return;
        }

        if (!form.title.trim()) {
            setError(
                "Completează titlul anunțului."
            );
            return;
        }

        if (!form.city.trim()) {
            setError(
                "Alege orașul proprietății."
            );
            return;
        }

        if (!form.neighborhood_id) {
            setError(
                "Alege zona / cartierul proprietății."
            );
            return;
        }

        if (!form.address.trim()) {
            setError(
                "Completează adresa proprietății."
            );
            return;
        }

        if (
            !form.price_monthly ||
            Number(form.price_monthly) <= 0
        ) {
            setError(
                "Introdu un preț lunar valid."
            );
            return;
        }

        if (!form.owner_name.trim()) {
            setError(
                "Completează numele persoanei de contact."
            );
            return;
        }

        if (!form.owner_phone.trim()) {
            setError(
                "Completează numărul de telefon."
            );
            return;
        }

        if (!images.length) {
            setError(
                "Adaugă cel puțin o fotografie a proprietății."
            );
            return;
        }

        if (images.length > 10) {
            setError(
                "Poți adăuga maximum 10 fotografii."
            );
            return;
        }

        setPublishing(true);

        let listingId = null;
        const uploadedPaths = [];

        try {
            const listingData = {
                user_id: user.id,

                title: form.title.trim(),

                description:
                    form.description.trim() ||
                    null,

                city: form.city.trim(),

                neighborhood_id:
                    Number(
                        form.neighborhood_id
                    ),

                address:
                    form.address.trim(),

                price_monthly:
                    Number(
                        form.price_monthly
                    ),

                rooms: form.rooms
                    ? Number(form.rooms)
                    : null,

                bedrooms: form.bedrooms
                    ? Number(form.bedrooms)
                    : null,

                bathrooms: form.bathrooms
                    ? Number(form.bathrooms)
                    : null,

                surface_m2:
                    form.surface_m2
                        ? Number(
                              form.surface_m2
                          )
                        : null,

                property_type:
                    form.property_type,

                listing_type: "rent",

                furnished:
                    form.furnished ===
                    "true",

                available_from:
                    form.available_from ||
                    null,

                owner_name:
                    form.owner_name.trim(),

                owner_phone:
                    form.owner_phone.trim(),

                owner_email:
                    form.owner_email.trim() ||
                    user.email ||
                    null,

                active: true,
            };

            const {
                data: createdListing,
                error: listingError,
            } = await supabase
                .from("listings")
                .insert([listingData])
                .select("id")
                .single();

            if (listingError) {
                throw new Error(
                    `Anunțul nu a putut fi creat: ${listingError.message}`
                );
            }

            listingId =
                createdListing.id;

            /* UNIVERSITĂȚI OPȚIONALE */

            if (
                selectedUniversityIds.length >
                0
            ) {
                const universityLinks =
                    selectedUniversityIds.map(
                        (universityId) => ({
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

                if (universityLinkError) {
                    throw new Error(
                        `Universitățile nu au putut fi asociate anunțului: ${universityLinkError.message}`
                    );
                }
            }

            /* POZE */

            const uploadedImages = [];

            for (
                let index = 0;
                index < images.length;
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
                    error: uploadError,
                } = await supabase.storage
                    .from(
                        "listing-images"
                    )
                    .upload(
                        storagePath,
                        file,
                        {
                            cacheControl:
                                "3600",
                            upsert: false,
                            contentType:
                                file.type,
                        }
                    );

                if (uploadError) {
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
                    position: index,
                });
            }

            const {
                error:
                    imagesDatabaseError,
            } = await supabase
                .from("listing_images")
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

            /* COPERTĂ */

            const coverImageUrl =
                uploadedImages[0]
                    ?.image_url ||
                null;

            const {
                error: coverError,
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

            if (coverError) {
                throw new Error(
                    `Coperta anunțului nu a putut fi salvată: ${coverError.message}`
                );
            }

            setSuccess(
                "Proprietatea a fost publicată cu succes."
            );

            setTimeout(() => {
                router.push(
                    "/dashboard"
                );
                router.refresh();
            }, 1000);
        } catch (submitError) {
            console.error(
                submitError
            );

            await cleanupUploadedFiles(
                uploadedPaths
            );

            if (listingId) {
                await supabase
                    .from("listings")
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
                    minHeight: "100vh",
                    background:
                        "#f7f8fa",
                    display: "flex",
                    alignItems:
                        "center",
                    justifyContent:
                        "center",
                    color: "#6b7280",
                    fontSize: "15px",
                    fontWeight:
                        "600",
                }}
            >
                Se verifică autentificarea...
            </main>
        );
    }

    const inputStyle = {
        width: "100%",
        boxSizing: "border-box",
        border: "1px solid #d1d5db",
        borderRadius: "11px",
        padding: "14px 15px",
        fontFamily: "inherit",
        fontSize: "15px",
        color: "#111827",
        background: "#ffffff",
        outline: "none",
    };

    const labelStyle = {
        display: "block",
        fontSize: "14px",
        fontWeight: "700",
        marginBottom: "8px",
        color: "#111827",
    };

    const fieldStyle = {
        marginBottom: "22px",
    };

    return (
        <main
            style={{
                minHeight: "100vh",
                background: "#f7f8fa",
                color: "#111827",
            }}
        >
            <header
                style={{
                    height: "72px",
                    background: "#ffffff",
                    borderBottom:
                        "1px solid #e5e7eb",
                    display: "flex",
                    alignItems:
                        "center",
                    justifyContent:
                        "space-between",
                    padding: "0 7%",
                }}
            >
                <a
                    href="/"
                    style={{
                        color: "#111827",
                        textDecoration:
                            "none",
                        fontSize: "25px",
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
                        display: "flex",
                        alignItems:
                            "center",
                        gap: "18px",
                    }}
                >
                    <span
                        style={{
                            color: "#6b7280",
                            fontSize: "13px",
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
                        gap: "8px",
                        border:
                            "none",
                        background:
                            "transparent",
                        padding: 0,
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
                            margin: 0,
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
                                margin: 0,
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
                                {images.length}
                                /10 fotografii selectate
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
                                                    fontSize:
                                                        "17px",
                                                    fontWeight:
                                                        "800",
                                                    cursor:
                                                        "pointer",
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

                    {/* DETALII */}

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
                            style={
                                fieldStyle
                            }
                        >
                            <label
                                style={
                                    labelStyle
                                }
                            >
                                Tipul proprietății
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
                                <option value="room">
                                    Cameră
                                </option>
                                <option value="house">
                                    Casă
                                </option>
                            </select>
                        </div>

                        <div
                            style={{
                                display:
                                    "grid",
                                gridTemplateColumns:
                                    "1fr 1fr",
                                gap:
                                    "18px",
                                alignItems:
                                    "start",
                            }}
                        >
                            <div>
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
                                                    ? "wait"
                                                    : "pointer",
                                        }}
                                    >
                                        <option value="">
                                            {loadingLocations
                                                ? "Se încarcă orașele..."
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
                                            loadingLocations ||
                                            !neighborhoodsForCity.length
                                        }
                                        style={{
                                            ...inputStyle,
                                            cursor:
                                                !form.city ||
                                                loadingLocations ||
                                                !neighborhoodsForCity.length
                                                    ? "not-allowed"
                                                    : "pointer",
                                        }}
                                    >
                                        <option value="">
                                            {!form.city
                                                ? "Alege mai întâi orașul"
                                                : loadingLocations
                                                  ? "Se încarcă zonele..."
                                                  : "Alege zona / cartierul"}
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
                                style={
                                    fieldStyle
                                }
                            >
                                <label
                                    style={
                                        labelStyle
                                    }
                                >
                                    Universități apropiate (opțional)
                                </label>

                                <div
                                    style={{
                                        border:
                                            "1px solid #d1d5db",
                                        borderRadius:
                                            "11px",
                                        maxHeight:
                                            "230px",
                                        overflowY:
                                            "auto",
                                        padding:
                                            "8px",
                                        background:
                                            form.city
                                                ? "#ffffff"
                                                : "#f9fafb",
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
                                                        />

                                                        <span
                                                            style={{
                                                                fontSize:
                                                                    "14px",
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
                            </div>
                        </div>

                        <div
                            style={{
                                background:
                                    "#eff6ff",
                                border:
                                    "1px solid #dbeafe",
                                color:
                                    "#1e40af",
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
                            Poți selecta una sau mai multe universități apropiate dacă dorești. Este opțional. Anunțul va apărea oricum în căutările generale pentru orașul selectat.
                        </div>

                        <div
                            style={{
                                display:
                                    "grid",
                                gridTemplateColumns:
                                    "1fr 1fr",
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
                                    Preț / lună (€)
                                </label>

                                <input
                                    name="price_monthly"
                                    type="number"
                                    min="1"
                                    step="1"
                                    value={
                                        form.price_monthly
                                    }
                                    onChange={
                                        updateField
                                    }
                                    placeholder="450"
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
                                    Adresa proprietății
                                </label>

                                <input
                                    name="address"
                                    type="text"
                                    value={
                                        form.address
                                    }
                                    onChange={
                                        updateField
                                    }
                                    placeholder="Strada, număr"
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
                                    "1fr 1fr",
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
                                    min="1"
                                    value={
                                        form.rooms
                                    }
                                    onChange={
                                        updateField
                                    }
                                    placeholder="2"
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
                                    placeholder="1"
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
                                    placeholder="1"
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
                                    min="1"
                                    step="0.1"
                                    value={
                                        form.surface_m2
                                    }
                                    onChange={
                                        updateField
                                    }
                                    placeholder="55"
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
                                    "1fr 1fr",
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

                            {/* =========================
                                DATA
                            ========================= */}

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
                                    Disponibil de la
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
                                            display:
                                                "flex",
                                            alignItems:
                                                "center",
                                            justifyContent:
                                                "space-between",
                                        }}
                                    >
                                        <span
                                            style={{
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
                                                : "ZZ/LL/AAAA"}
                                        </span>

                                        <span
                                            style={{
                                                fontSize:
                                                    "17px",
                                                color:
                                                    "#6b7280",
                                            }}
                                        >
                                            📅
                                        </span>
                                    </button>

                                    {calendarOpen && (
                                        <div
                                            style={{
                                                position:
                                                    "absolute",
                                                zIndex:
                                                    1000,
                                                top:
                                                    "calc(100% + 8px)",
                                                right:
                                                    0,
                                                width:
                                                    "310px",
                                                background:
                                                    "#ffffff",
                                                border:
                                                    "1px solid #e5e7eb",
                                                borderRadius:
                                                    "14px",
                                                padding:
                                                    "16px",
                                                boxShadow:
                                                    "0 15px 40px rgba(0,0,0,0.15)",
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
                                                        "14px",
                                                }}
                                            >
                                                <button
                                                    type="button"
                                                    onClick={
                                                        previousCalendarMonth
                                                    }
                                                    style={{
                                                        border:
                                                            "none",
                                                        background:
                                                            "#f3f4f6",
                                                        borderRadius:
                                                            "8px",
                                                        width:
                                                            "34px",
                                                        height:
                                                            "34px",
                                                        cursor:
                                                            "pointer",
                                                        fontSize:
                                                            "20px",
                                                    }}
                                                >
                                                    ‹
                                                </button>

                                                <strong
                                                    style={{
                                                        fontSize:
                                                            "15px",
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
                                                            "#f3f4f6",
                                                        borderRadius:
                                                            "8px",
                                                        width:
                                                            "34px",
                                                        height:
                                                            "34px",
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
                                                        "4px",
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
                                                        day
                                                    ) => (
                                                        <div
                                                            key={
                                                                day
                                                            }
                                                            style={{
                                                                textAlign:
                                                                    "center",
                                                                fontSize:
                                                                    "11px",
                                                                fontWeight:
                                                                    "800",
                                                                color:
                                                                    "#6b7280",
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
                                            </div>

                                            <div
                                                style={{
                                                    display:
                                                        "grid",
                                                    gridTemplateColumns:
                                                        "repeat(7, 1fr)",
                                                    gap:
                                                        "4px",
                                                }}
                                            >
                                                {Array.from(
                                                    {
                                                        length:
                                                            mondayOffset,
                                                    }
                                                ).map(
                                                    (
                                                        _,
                                                        index
                                                    ) => (
                                                        <div
                                                            key={`empty-${index}`}
                                                        />
                                                    )
                                                )}

                                                {Array.from(
                                                    {
                                                        length:
                                                            daysInMonth,
                                                    },
                                                    (
                                                        _,
                                                        index
                                                    ) => {
                                                        const day =
                                                            index +
                                                            1;

                                                        const isoDate =
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

                                                        const selected =
                                                            form.available_from ===
                                                            isoDate;

                                                        return (
                                                            <button
                                                                key={
                                                                    isoDate
                                                                }
                                                                type="button"
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
                                                                        "pointer",
                                                                    background:
                                                                        selected
                                                                            ? "#2563eb"
                                                                            : "#ffffff",
                                                                    color:
                                                                        selected
                                                                            ? "#ffffff"
                                                                            : "#111827",
                                                                    fontWeight:
                                                                        selected
                                                                            ? "800"
                                                                            : "500",
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

                        <div>
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
                                placeholder="Descrie proprietatea, zona, facilitățile și alte informații utile..."
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
                                    "0 0 8px",
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
                                    "0 0 27px",
                                color:
                                    "#6b7280",
                                fontSize:
                                    "14px",
                                lineHeight:
                                    "1.6",
                            }}
                        >
                            Aceste informații vor permite persoanelor interesate să contacteze proprietarul.
                        </p>

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
                                name="owner_name"
                                type="text"
                                value={
                                    form.owner_name
                                }
                                onChange={
                                    updateField
                                }
                                placeholder="Numele proprietarului"
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
                                    "1fr 1fr",
                                gap:
                                    "18px",
                            }}
                        >
                            <div>
                                <label
                                    style={
                                        labelStyle
                                    }
                                >
                                    Telefon
                                </label>

                                <input
                                    name="owner_phone"
                                    type="tel"
                                    value={
                                        form.owner_phone
                                    }
                                    onChange={
                                        updateField
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
                                    name="owner_email"
                                    type="email"
                                    value={
                                        form.owner_email
                                    }
                                    onChange={
                                        updateField
                                    }
                                    placeholder="email@exemplu.ro"
                                    style={
                                        inputStyle
                                    }
                                />
                            </div>
                        </div>
                    </div>

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
                                fontSize:
                                    "14px",
                                lineHeight:
                                    "1.5",
                                marginBottom:
                                    "18px",
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
                                fontSize:
                                    "14px",
                                fontWeight:
                                    "600",
                                marginBottom:
                                    "18px",
                            }}
                        >
                            {success}
                        </div>
                    )}

                    <div
                        style={{
                            background:
                                "#ffffff",
                            border:
                                "1px solid #e5e7eb",
                            borderRadius:
                                "18px",
                            padding:
                                "22px",
                            display:
                                "flex",
                            justifyContent:
                                "space-between",
                            alignItems:
                                "center",
                            gap:
                                "20px",
                        }}
                    >
                        <div>
                            <div
                                style={{
                                    fontSize:
                                        "15px",
                                    fontWeight:
                                        "800",
                                }}
                            >
                                Gata de publicare?
                            </div>

                            <div
                                style={{
                                    color:
                                        "#6b7280",
                                    fontSize:
                                        "13px",
                                    marginTop:
                                        "5px",
                                }}
                            >
                                Verifică informațiile și fotografiile înainte de publicare. Asocierea cu universități este opțională.
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={
                                publishing
                            }
                            style={{
                                border:
                                    "none",
                                borderRadius:
                                    "11px",
                                padding:
                                    "14px 24px",
                                background:
                                    publishing
                                        ? "#374151"
                                        : "#111827",
                                color:
                                    "#ffffff",
                                fontFamily:
                                    "inherit",
                                fontSize:
                                    "14px",
                                fontWeight:
                                    "800",
                                cursor:
                                    publishing
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
        </main>
    );
}
