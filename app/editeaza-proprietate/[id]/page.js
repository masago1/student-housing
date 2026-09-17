"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function EditeazaProprietatePage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id;

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [universities, setUniversities] = useState([]);
  const [selectedUniversityIds, setSelectedUniversityIds] = useState([]);

  const [form, setForm] = useState({
    title: "",
    property_type: "apartment",
    city: "",
    address: "",
    price_monthly: "",

    rooms: "",
    bedrooms: "",
    bathrooms: "",
    surface_m2: "",

    floor: "",
    total_floors: "",
    construction_year: "",
    heating_type: "",

    furnished: "true",
    air_conditioning: "false",
    balcony: "false",
    parking: "false",

    pets_allowed: "false",
    smoking_allowed: "false",
    max_tenants: "",
    deposit_amount: "",
    utilities_included: "false",

    available_from: "",
    description: "",

    owner_name: "",
    owner_phone: "",
    owner_email: "",
  });

  /* =========================
     ÎNCĂRCARE
  ========================= */

  useEffect(() => {
    if (!id) return;

    const loadPage = async () => {
      setLoading(true);
      setError("");

      try {
        /* UTILIZATOR */

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          router.replace("/login");
          return;
        }

        setUser(user);

        /* UNIVERSITĂȚI */

        const {
          data: universitiesData,
          error: universitiesError,
        } = await supabase
          .from("universities")
          .select("id, name, short_name, city")
          .order("city", { ascending: true })
          .order("name", { ascending: true });

        if (universitiesError) {
          throw new Error(
            "Universitățile nu au putut fi încărcate."
          );
        }

        setUniversities(universitiesData || []);

        /* ANUNȚ */

        const {
          data: listing,
          error: listingError,
        } = await supabase
          .from("listings")
          .select(`
            id,
            user_id,
            title,
            property_type,
            city,
            address,
            price_monthly,
            rooms,
            bedrooms,
            bathrooms,
            surface_m2,
            floor,
            total_floors,
            construction_year,
            heating_type,
            furnished,
            air_conditioning,
            balcony,
            parking,
            pets_allowed,
            smoking_allowed,
            max_tenants,
            deposit_amount,
            utilities_included,
            available_from,
            description,
            owner_name,
            owner_phone,
            owner_email,
            active
          `)
          .eq("id", id)
          .eq("user_id", user.id)
          .single();

        if (listingError || !listing) {
          throw new Error(
            "Anunțul nu a fost găsit sau nu îți aparține."
          );
        }

        setForm({
          title: listing.title || "",

          property_type:
            listing.property_type || "apartment",

          city: listing.city || "",

          address: listing.address || "",

          price_monthly:
            listing.price_monthly ?? "",

          rooms:
            listing.rooms ?? "",

          bedrooms:
            listing.bedrooms ?? "",

          bathrooms:
            listing.bathrooms ?? "",

          surface_m2:
            listing.surface_m2 ?? "",

          floor:
            listing.floor ?? "",

          total_floors:
            listing.total_floors ?? "",

          construction_year:
            listing.construction_year ?? "",

          heating_type:
            listing.heating_type || "",

          furnished:
            listing.furnished === false
              ? "false"
              : "true",

          air_conditioning:
            listing.air_conditioning === true
              ? "true"
              : "false",

          balcony:
            listing.balcony === true
              ? "true"
              : "false",

          parking:
            listing.parking === true
              ? "true"
              : "false",

          pets_allowed:
            listing.pets_allowed === true
              ? "true"
              : "false",

          smoking_allowed:
            listing.smoking_allowed === true
              ? "true"
              : "false",

          max_tenants:
            listing.max_tenants ?? "",

          deposit_amount:
            listing.deposit_amount ?? "",

          utilities_included:
            listing.utilities_included === true
              ? "true"
              : "false",

          available_from:
            listing.available_from || "",

          description:
            listing.description || "",

          owner_name:
            listing.owner_name || "",

          owner_phone:
            listing.owner_phone || "",

          owner_email:
            listing.owner_email ||
            user.email ||
            "",
        });

        /* UNIVERSITĂȚILE ANUNȚULUI */

        const {
          data: universityLinks,
          error: universityLinksError,
        } = await supabase
          .from("listing_universities")
          .select("university_id")
          .eq("listing_id", id);

        if (universityLinksError) {
          throw new Error(
            "Universitățile asociate anunțului nu au putut fi încărcate."
          );
        }

        setSelectedUniversityIds(
          (universityLinks || []).map(
            (item) => item.university_id
          )
        );
      } catch (loadError) {
        console.error(loadError);

        setError(
          loadError.message ||
            "A apărut o eroare la încărcarea anunțului."
        );
      } finally {
        setLoading(false);
      }
    };

    loadPage();
  }, [id, router]);

  /* =========================
     ORAȘE
  ========================= */

  const cities = useMemo(() => {
    return [
      ...new Set(
        universities
          .map((university) => university.city)
          .filter(Boolean)
      ),
    ].sort((a, b) => a.localeCompare(b, "ro"));
  }, [universities]);

  const universitiesForCity = useMemo(() => {
    if (!form.city) return [];

    return universities.filter(
      (university) =>
        university.city === form.city
    );
  }, [universities, form.city]);

  /* =========================
     FORMULAR
  ========================= */

  const updateField = (event) => {
    const { name, value } = event.target;

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
    }));

    setSelectedUniversityIds([]);
  };

  const toggleUniversity = (universityId) => {
    setSelectedUniversityIds((current) =>
      current.includes(universityId)
        ? current.filter(
            (currentId) =>
              currentId !== universityId
          )
        : [...current, universityId]
    );
  };

  /* =========================
     SALVARE
  ========================= */

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!user) {
      router.replace("/login");
      return;
    }

    if (!form.title.trim()) {
      setError("Completează titlul anunțului.");
      return;
    }

    if (!form.city.trim()) {
      setError("Alege orașul proprietății.");
      return;
    }

    if (!form.address.trim()) {
      setError("Completează adresa proprietății.");
      return;
    }

    if (
      !form.price_monthly ||
      Number(form.price_monthly) <= 0
    ) {
      setError("Introdu un preț lunar valid.");
      return;
    }

    /* ETAJ */

    if (
      form.floor !== "" &&
      form.total_floors !== "" &&
      Number(form.floor) >
        Number(form.total_floors)
    ) {
      setError(
        "Etajul proprietății nu poate fi mai mare decât numărul total de etaje."
      );
      return;
    }

    /* AN CONSTRUCȚIE */

    if (form.construction_year !== "") {
      const year = Number(
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

    /* MAX CHIRIAȘI */

    if (
      form.max_tenants !== "" &&
      Number(form.max_tenants) <= 0
    ) {
      setError(
        "Numărul maxim de chiriași trebuie să fie mai mare decât 0."
      );
      return;
    }

    /* GARANȚIE */

    if (
      form.deposit_amount !== "" &&
      Number(form.deposit_amount) < 0
    ) {
      setError(
        "Garanția nu poate avea o valoare negativă."
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

    setSaving(true);

    try {
      /* ACTUALIZARE ANUNȚ */

      const listingData = {
        title:
          form.title.trim(),

        description:
          form.description.trim() || null,

        city:
          form.city.trim(),

        address:
          form.address.trim(),

        price_monthly:
          Number(form.price_monthly),

        rooms:
          form.rooms !== ""
            ? Number(form.rooms)
            : null,

        bedrooms:
          form.bedrooms !== ""
            ? Number(form.bedrooms)
            : null,

        bathrooms:
          form.bathrooms !== ""
            ? Number(form.bathrooms)
            : null,

        surface_m2:
          form.surface_m2 !== ""
            ? Number(form.surface_m2)
            : null,

        property_type:
          form.property_type,

        furnished:
          form.furnished === "true",

        floor:
          form.floor !== ""
            ? Number(form.floor)
            : null,

        total_floors:
          form.total_floors !== ""
            ? Number(form.total_floors)
            : null,

        construction_year:
          form.construction_year !== ""
            ? Number(form.construction_year)
            : null,

        heating_type:
          form.heating_type.trim() || null,

        air_conditioning:
          form.air_conditioning === "true",

        balcony:
          form.balcony === "true",

        parking:
          form.parking === "true",

        pets_allowed:
          form.pets_allowed === "true",

        smoking_allowed:
          form.smoking_allowed === "true",

        max_tenants:
          form.max_tenants !== ""
            ? Number(form.max_tenants)
            : null,

        deposit_amount:
          form.deposit_amount !== ""
            ? Number(form.deposit_amount)
            : null,

        utilities_included:
          form.utilities_included === "true",

        available_from:
          form.available_from || null,

        owner_name:
          form.owner_name.trim(),

        owner_phone:
          form.owner_phone.trim(),

        owner_email:
          form.owner_email.trim() ||
          user.email ||
          null,
      };

      const { error: updateError } =
        await supabase
          .from("listings")
          .update(listingData)
          .eq("id", id)
          .eq("user_id", user.id);

      if (updateError) {
        throw new Error(
          `Anunțul nu a putut fi actualizat: ${updateError.message}`
        );
      }

      /* UNIVERSITĂȚI
         Sunt opționale.
         Ștergem asocierile existente,
         apoi le recreăm doar dacă există selecții.
      */

      const {
        error: deleteUniversitiesError,
      } = await supabase
        .from("listing_universities")
        .delete()
        .eq("listing_id", id);

      if (deleteUniversitiesError) {
        throw new Error(
          `Asocierile vechi cu universitățile nu au putut fi actualizate: ${deleteUniversitiesError.message}`
        );
      }

      if (selectedUniversityIds.length > 0) {
        const universityLinks =
          selectedUniversityIds.map(
            (universityId) => ({
              listing_id: id,
              university_id: universityId,
              distance_meters: null,
              walking_minutes: null,
            })
          );

        const {
          error: insertUniversitiesError,
        } = await supabase
          .from("listing_universities")
          .insert(universityLinks);

        if (insertUniversitiesError) {
          throw new Error(
            `Universitățile nu au putut fi salvate: ${insertUniversitiesError.message}`
          );
        }
      }

      setSuccess(
        "Modificările au fost salvate cu succes."
      );

      setTimeout(() => {
        router.push(
          `/proprietate/${id}`
        );
        router.refresh();
      }, 900);
    } catch (saveError) {
      console.error(saveError);

      setError(
        saveError.message ||
          "A apărut o eroare la salvarea modificărilor."
      );
    } finally {
      setSaving(false);
    }
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
     LOADING
  ========================= */

  if (loading) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#f7f8fa",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#6b7280",
          fontSize: "15px",
          fontWeight: "600",
        }}
      >
        Se încarcă anunțul...
      </main>
    );
  }

  /* =========================
     STILURI
  ========================= */

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

  const cardStyle = {
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "20px",
    padding: "32px",
    boxShadow:
      "0 12px 35px rgba(17,24,39,0.05)",
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
      {/* HEADER */}

      <header
        style={{
          height: "72px",
          background: "#ffffff",
          borderBottom:
            "1px solid #e5e7eb",
          display: "flex",
          alignItems: "center",
          justifyContent:
            "space-between",
          padding: "0 7%",
        }}
      >
        <a
          href="/"
          style={{
            color: "#111827",
            textDecoration: "none",
            fontSize: "25px",
            fontWeight: "800",
            letterSpacing: "-1px",
          }}
        >
          StudentHousing
        </a>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "18px",
          }}
        >
          <span
            style={{
              color: "#6b7280",
              fontSize: "13px",
              fontWeight: "600",
            }}
          >
            {user?.email}
          </span>

          <button
            type="button"
            onClick={handleLogout}
            style={{
              background: "#ffffff",
              color: "#111827",
              border:
                "1px solid #e5e7eb",
              borderRadius: "10px",
              padding: "10px 15px",
              fontFamily: "inherit",
              fontSize: "13px",
              fontWeight: "700",
              cursor: "pointer",
            }}
          >
            Deconectare
          </button>
        </div>
      </header>

      {/* PAGINA */}

      <section
        style={{
          maxWidth: "900px",
          margin: "0 auto",
          padding: "60px 30px 100px",
        }}
      >
        <button
          type="button"
          onClick={() =>
            router.push("/dashboard")
          }
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            border: "none",
            background: "transparent",
            padding: 0,
            marginBottom: "28px",
            color: "#4b5563",
            fontFamily: "inherit",
            fontSize: "14px",
            fontWeight: "700",
            cursor: "pointer",
          }}
        >
          <span
            style={{
              fontSize: "20px",
              lineHeight: 1,
            }}
          >
            ←
          </span>

          Înapoi la dashboard
        </button>

        <div
          style={{
            marginBottom: "35px",
          }}
        >
          <div
            style={{
              display: "inline-block",
              background: "#fff7ed",
              color: "#c2410c",
              padding: "7px 12px",
              borderRadius: "100px",
              fontSize: "13px",
              fontWeight: "700",
              marginBottom: "16px",
            }}
          >
            Editare anunț
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: "40px",
              lineHeight: "1.15",
              letterSpacing: "-1.5px",
              fontWeight: "800",
            }}
          >
            Editează proprietatea
          </h1>

          <p
            style={{
              margin: "13px 0 0",
              color: "#6b7280",
              fontSize: "16px",
              lineHeight: "1.6",
              maxWidth: "650px",
            }}
          >
            Modifică informațiile anunțului și
            salvează schimbările.
          </p>
        </div>

        {error && (
          <div
            style={{
              background: "#fef2f2",
              border:
                "1px solid #fecaca",
              color: "#b91c1c",
              borderRadius: "12px",
              padding: "14px 16px",
              fontSize: "14px",
              lineHeight: "1.5",
              marginBottom: "18px",
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* DETALII PRINCIPALE */}

          <div style={cardStyle}>
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

            {/* ORAȘ + UNIVERSITĂȚI */}

            <div
              className="edit-grid-2"
              style={{
                display: "grid",
                gridTemplateColumns:
                  "1fr 1fr",
                gap: "18px",
              }}
            >
              <div style={fieldStyle}>
                <label style={labelStyle}>
                  Oraș
                </label>

                <select
                  value={form.city}
                  onChange={handleCityChange}
                  style={inputStyle}
                >
                  <option value="">
                    Alege orașul
                  </option>

                  {cities.map((city) => (
                    <option
                      key={city}
                      value={city}
                    >
                      {city}
                    </option>
                  ))}
                </select>
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>
                  Universități apropiate
                </label>

                <div
                  style={{
                    border:
                      "1px solid #d1d5db",
                    borderRadius: "11px",
                    background: form.city
                      ? "#ffffff"
                      : "#f9fafb",
                    maxHeight: "230px",
                    overflowY: "auto",
                    padding: "8px",
                    opacity: form.city
                      ? 1
                      : 0.65,
                  }}
                >
                  {!form.city ? (
                    <div
                      style={{
                        padding: "8px",
                        color: "#6b7280",
                        fontSize: "14px",
                      }}
                    >
                      Alege mai întâi orașul
                    </div>
                  ) : universitiesForCity.length ===
                    0 ? (
                    <div
                      style={{
                        padding: "8px",
                        color: "#6b7280",
                        fontSize: "14px",
                      }}
                    >
                      Nu există universități
                      disponibile pentru acest
                      oraș.
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
                            key={university.id}
                            style={{
                              display: "flex",
                              alignItems:
                                "flex-start",
                              gap: "10px",
                              padding: "10px",
                              borderRadius:
                                "9px",
                              cursor: "pointer",
                              background:
                                checked
                                  ? "#eff6ff"
                                  : "transparent",
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() =>
                                toggleUniversity(
                                  university.id
                                )
                              }
                              style={{
                                marginTop:
                                  "2px",
                                width: "16px",
                                height: "16px",
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
                        marginTop: "8px",
                        color: "#2563eb",
                        fontSize: "12px",
                        fontWeight: "700",
                      }}
                    >
                      {selectedUniversityIds.length ===
                      1
                        ? "1 universitate selectată"
                        : `${selectedUniversityIds.length} universități selectate`}
                    </div>
                  )}

                <div
                  style={{
                    marginTop: "8px",
                    color: "#9ca3af",
                    fontSize: "12px",
                    lineHeight: "1.5",
                  }}
                >
                  Selectarea unei universități este
                  opțională.
                </div>
              </div>
            </div>

            {/* PREȚ + ADRESĂ */}

            <div
              className="edit-grid-2"
              style={{
                display: "grid",
                gridTemplateColumns:
                  "1fr 1fr",
                gap: "18px",
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
                  style={inputStyle}
                />
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>
                  Adresa proprietății
                </label>

                <input
                  name="address"
                  type="text"
                  value={form.address}
                  onChange={updateField}
                  style={inputStyle}
                />
              </div>
            </div>

            {/* CAMERE / DORMITOARE / BĂI / SUPRAFAȚĂ */}

            <div
              className="edit-grid-2"
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(2, minmax(0, 1fr))",
                gap: "18px",
              }}
            >
              <div style={fieldStyle}>
                <label style={labelStyle}>
                  Camere
                </label>

                <input
                  name="rooms"
                  type="number"
                  min="1"
                  value={form.rooms}
                  onChange={updateField}
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
                  min="0"
                  value={form.bathrooms}
                  onChange={updateField}
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
                  step="0.1"
                  value={form.surface_m2}
                  onChange={updateField}
                  style={inputStyle}
                />
              </div>
            </div>

            {/* MOBILAT + DISPONIBILITATE */}

            <div
              className="edit-grid-2"
              style={{
                display: "grid",
                gridTemplateColumns:
                  "1fr 1fr",
                gap: "18px",
              }}
            >
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

              <div style={fieldStyle}>
                <label style={labelStyle}>
                  Disponibil de la
                </label>

                <input
                  name="available_from"
                  type="date"
                  value={form.available_from}
                  onChange={updateField}
                  style={inputStyle}
                />
              </div>
            </div>

            {/* DESCRIERE */}

            <div>
              <label style={labelStyle}>
                Descriere
              </label>

              <textarea
                name="description"
                value={form.description}
                onChange={updateField}
                rows={7}
                style={{
                  ...inputStyle,
                  resize: "vertical",
                  lineHeight: "1.6",
                }}
              />
            </div>
          </div>

          {/* CONTINUĂ DIRECT CU PARTEA 2/2 */}
          {/* DETALII SUPLIMENTARE */}

          <div style={cardStyle}>
            <h2
              style={{
                margin: "0 0 8px",
                fontSize: "20px",
                fontWeight: "800",
              }}
            >
              Detalii suplimentare
            </h2>

            <p
              style={{
                margin: "0 0 27px",
                color: "#6b7280",
                fontSize: "14px",
                lineHeight: "1.6",
              }}
            >
              Actualizează caracteristicile proprietății și
              condițiile de închiriere.
            </p>

            {/* ETAJ + ETAJE TOTALE */}

            <div
              className="edit-grid-2"
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
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
                  style={inputStyle}
                  placeholder="Ex: 3"
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
                  style={inputStyle}
                  placeholder="Ex: 8"
                />
              </div>
            </div>

            {/* AN CONSTRUCȚIE + ÎNCĂLZIRE */}

            <div
              className="edit-grid-2"
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "18px",
              }}
            >
              <div style={fieldStyle}>
                <label style={labelStyle}>
                  Anul construcției
                </label>

                <input
                  name="construction_year"
                  type="number"
                  min="1800"
                  max={new Date().getFullYear()}
                  value={form.construction_year}
                  onChange={updateField}
                  style={inputStyle}
                  placeholder="Ex: 2018"
                />
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>
                  Tip încălzire
                </label>

                <select
                  name="heating_type"
                  value={form.heating_type}
                  onChange={updateField}
                  style={inputStyle}
                >
                  <option value="">
                    Nespecificat
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
                    Altă variantă
                  </option>
                </select>
              </div>
            </div>

            {/* AC + BALCON */}

            <div
              className="edit-grid-2"
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "18px",
              }}
            >
              <div style={fieldStyle}>
                <label style={labelStyle}>
                  Aer condiționat
                </label>

                <select
                  name="air_conditioning"
                  value={form.air_conditioning}
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
                  <option value="true">
                    Da
                  </option>

                  <option value="false">
                    Nu
                  </option>
                </select>
              </div>
            </div>

            {/* PARCARE + ANIMALE */}

            <div
              className="edit-grid-2"
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "18px",
              }}
            >
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
                  <option value="true">
                    Da
                  </option>

                  <option value="false">
                    Nu
                  </option>
                </select>
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>
                  Animale de companie acceptate
                </label>

                <select
                  name="pets_allowed"
                  value={form.pets_allowed}
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
            </div>

            {/* FUMAT + UTILITĂȚI */}

            <div
              className="edit-grid-2"
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "18px",
              }}
            >
              <div style={fieldStyle}>
                <label style={labelStyle}>
                  Fumat permis
                </label>

                <select
                  name="smoking_allowed"
                  value={form.smoking_allowed}
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

              <div style={fieldStyle}>
                <label style={labelStyle}>
                  Utilități incluse în preț
                </label>

                <select
                  name="utilities_included"
                  value={form.utilities_included}
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
            </div>

            {/* MAX CHIRIAȘI + GARANȚIE */}

            <div
              className="edit-grid-2"
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "18px",
              }}
            >
              <div style={fieldStyle}>
                <label style={labelStyle}>
                  Număr maxim de chiriași
                </label>

                <input
                  name="max_tenants"
                  type="number"
                  min="1"
                  value={form.max_tenants}
                  onChange={updateField}
                  style={inputStyle}
                  placeholder="Ex: 2"
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
                  value={form.deposit_amount}
                  onChange={updateField}
                  style={inputStyle}
                  placeholder="Opțional"
                />

                <div
                  style={{
                    marginTop: "7px",
                    color: "#9ca3af",
                    fontSize: "12px",
                    lineHeight: "1.4",
                  }}
                >
                  Lasă necompletat dacă nu dorești să
                  specifici garanția.
                </div>
              </div>
            </div>
          </div>

          {/* CONTACT */}

          <div style={cardStyle}>
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
              Modifică datele prin care persoanele
              interesate te pot contacta.
            </p>

            <div style={fieldStyle}>
              <label style={labelStyle}>
                Nume
              </label>

              <input
                name="owner_name"
                type="text"
                value={form.owner_name}
                onChange={updateField}
                style={inputStyle}
              />
            </div>

            <div
              className="edit-grid-2"
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "18px",
              }}
            >
              <div>
                <label style={labelStyle}>
                  Telefon
                </label>

                <input
                  name="owner_phone"
                  type="tel"
                  value={form.owner_phone}
                  onChange={updateField}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>
                  Email
                </label>

                <input
                  name="owner_email"
                  type="email"
                  value={form.owner_email}
                  onChange={updateField}
                  style={inputStyle}
                />
              </div>
            </div>
          </div>

          {/* MESAJE */}

          {error && (
            <div
              style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#b91c1c",
                borderRadius: "12px",
                padding: "14px 16px",
                fontSize: "14px",
                lineHeight: "1.5",
                marginBottom: "18px",
              }}
            >
              {error}
            </div>
          )}

          {success && (
            <div
              style={{
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                color: "#166534",
                borderRadius: "12px",
                padding: "14px 16px",
                fontSize: "14px",
                fontWeight: "600",
                lineHeight: "1.5",
                marginBottom: "18px",
              }}
            >
              {success}
            </div>
          )}

          {/* SALVARE */}

          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: "18px",
              padding: "22px",
              display: "flex",
              justifyContent: "space-between",
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
                Salvezi modificările?
              </div>

              <div
                style={{
                  color: "#6b7280",
                  fontSize: "13px",
                  marginTop: "5px",
                  lineHeight: "1.5",
                }}
              >
                Modificările vor fi aplicate
                anunțului existent.
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              style={{
                border: "none",
                borderRadius: "11px",
                padding: "14px 24px",
                background: saving
                  ? "#374151"
                  : "#111827",
                color: "#ffffff",
                fontFamily: "inherit",
                fontSize: "14px",
                fontWeight: "800",
                cursor: saving
                  ? "not-allowed"
                  : "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {saving
                ? "Se salvează..."
                : "Salvează modificările"}
            </button>
          </div>
        </form>
      </section>

      <style>{`
        @media (max-width: 700px) {
          .edit-grid-2 {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </main>
  );
}
