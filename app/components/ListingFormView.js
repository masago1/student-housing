"use client";
import { formatListingDate, legacyHeatingLabels } from "../lib/listingForm.mjs";

// Shared presentation; each route retains its own data, validation and persistence handlers.
export default function ListingFormView({
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
    form,
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
    neighborhoodsForCity,
    nextCalendarMonth,
    openCalendar,
    previousCalendarMonth,
    publishing,
    removeImage,
    romanianMonths,
    router,
    selectAddressSuggestion,
    selectCalendarDate,
    selectedUniversityIds,
    setAddressSuggestionsOpen,
    setCalendarOpen,
    setForm,
    setSelectedUniversityIds,
    success,
    universitiesForCity,
    updateField,
    user,
    editing = false, disabled = false, imageError = "", addressFieldRef, onAddressFocus, toggleUniversity
}) {
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
                        {editing ? "Editează anunțul" : "Adaugă anunțul"}
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
                        {editing ? "Actualizează informațiile și imaginile anunțului tău." : "Completează informațiile proprietății tale pentru a publica anunțul."}
                    </p>
                </div>

                <form
                    onSubmit={
                        handleSubmit
                    }
                >
                    {/* IMAGINI */}

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
                            Imagini
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
                            Adaugă între 1 și 10 imagini. Prima imagine va fi coperta anunțului.
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
                                {imageError && <p role="alert" style={{ color: "#b91c1c", fontSize: "14px" }}>{imageError}</p>}

                        {images.length >=
                                10
                                    ? "Ai adăugat numărul maxim de imagini"
                                    : "Selectează imagini"}
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
                                {images.length}/10 imagini selectate
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
                                            key={image.id || `${image.file?.name || image.preview}-${index}`}
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
                                                alt={`Imagine ${index + 1}`}
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
                            Detalii anunț
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
                                    ref={addressFieldRef}
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
                                        onClick={onAddressFocus}
                                        name="address"
                                        type="text"
                                        autoComplete="off"
                                        value={form.address}
                                        onChange={
                                            handleAddressChange
                                        }
                                        onFocus={() => {
                                            onAddressFocus?.();
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
                                        placeholder="Strada și numărul"
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
                                                                if (toggleUniversity) return toggleUniversity(university.id);
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
                                            ? formatListingDate(
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

                        <div style={fieldStyle}>
                            <label style={labelStyle}>Tip închiriere</label>
                            <select name="listing_type" value={form.listing_type === "rent" ? "entire" : form.listing_type || "entire"} onChange={updateField} style={inputStyle}>
                                <option value="entire">Locuință întreagă</option>
                                <option value="room">Cameră</option>
                            </select>
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

                                        {form.heating_type && !["Centrala proprie", "Centrala blocului", "Termoficare", "Incalzire electrica", "Pompa de caldura", "Alta"].includes(form.heating_type) &&
                                            <option value={form.heating_type}>{legacyHeatingLabels[form.heating_type] || form.heating_type}</option>}
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
                                {editing ? "Gata de salvare?" : "Gata de publicare?"}
                            </div>

                            <div
                                style={{
                                    color: "#6b7280",
                                    fontSize: "13px",
                                    marginTop: "5px",
                                }}
                            >
                                {editing ? "Verifică informațiile și imaginile înainte de salvare." : "Verifică informațiile și imaginile înainte de publicare. Asocierea cu universități este opțională."}
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={publishing || disabled}
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
                                ? (editing ? "Se salvează..." : "Se publică...")
                                : (editing ? "Salvează modificările" : "Publică anunțul")}
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
