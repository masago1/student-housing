"use client";

import { useEffect, useState } from "react";
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
    furnished: "true",
    available_from: "",
    description: "",
    owner_name: "",
    owner_phone: "",
    owner_email: "",
  });

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
        owner_email: current.owner_email || user.email || "",
      }));

      setCheckingAuth(false);
    };

    checkUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        router.replace("/login");
        return;
      }

      setUser(session.user);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  useEffect(() => {
    return () => {
      images.forEach((image) => {
        URL.revokeObjectURL(image.preview);
      });
    };
  }, [images]);

  const updateField = (event) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleImages = (event) => {
    setError("");

    const selectedFiles = Array.from(event.target.files || []);

    if (selectedFiles.length === 0) {
      return;
    }

    const remainingSlots = 10 - images.length;

    if (remainingSlots <= 0) {
      setError("Poți adăuga maximum 10 fotografii.");
      event.target.value = "";
      return;
    }

    if (selectedFiles.length > remainingSlots) {
      setError(
        `Poți adăuga maximum 10 fotografii. Mai poți selecta ${remainingSlots}.`
      );
      event.target.value = "";
      return;
    }

    const validFiles = [];

    for (const file of selectedFiles) {
      if (!file.type.startsWith("image/")) {
        setError("Poți încărca doar fișiere de tip imagine.");
        event.target.value = "";
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        setError(
          "Fiecare fotografie trebuie să aibă maximum 10 MB."
        );
        event.target.value = "";
        return;
      }

      validFiles.push({
        file,
        preview: URL.createObjectURL(file),
      });
    }

    setImages((current) => [...current, ...validFiles]);

    event.target.value = "";
  };

  const removeImage = (index) => {
    setImages((current) => {
      const imageToRemove = current[index];

      if (imageToRemove?.preview) {
        URL.revokeObjectURL(imageToRemove.preview);
      }

      return current.filter((_, imageIndex) => imageIndex !== index);
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  const cleanupUploadedFiles = async (paths) => {
    if (!paths.length) return;

    await supabase.storage
      .from("listing-images")
      .remove(paths);
  };

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
      setError("Completează orașul.");
      return;
    }

    if (!form.address.trim()) {
      setError("Completează adresa proprietății.");
      return;
    }

    if (!form.price_monthly || Number(form.price_monthly) <= 0) {
      setError("Introdu un preț lunar valid.");
      return;
    }

    if (!form.owner_name.trim()) {
      setError("Completează numele persoanei de contact.");
      return;
    }

    if (!form.owner_phone.trim()) {
      setError("Completează numărul de telefon.");
      return;
    }

    if (images.length === 0) {
      setError("Adaugă cel puțin o fotografie a proprietății.");
      return;
    }

    if (images.length > 10) {
      setError("Poți adăuga maximum 10 fotografii.");
      return;
    }

    setPublishing(true);

    let listingId = null;
    const uploadedPaths = [];

    try {
      /*
        1. CREĂM ANUNȚUL
      */

      const listingData = {
        user_id: user.id,
        title: form.title.trim(),
        description: form.description.trim() || null,
        city: form.city.trim(),
        address: form.address.trim(),
        price_monthly: Number(form.price_monthly),

        rooms: form.rooms ? Number(form.rooms) : null,

        bedrooms: form.bedrooms
          ? Number(form.bedrooms)
          : null,

        bathrooms: form.bathrooms
          ? Number(form.bathrooms)
          : null,

        surface_m2: form.surface_m2
          ? Number(form.surface_m2)
          : null,

        property_type: form.property_type,
        listing_type: "rent",
        furnished: form.furnished === "true",

        available_from: form.available_from || null,

        owner_name: form.owner_name.trim(),
        owner_phone: form.owner_phone.trim(),

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

      listingId = createdListing.id;

      /*
        2. ÎNCĂRCĂM CELE MAXIMUM 10 POZE
      */

      const uploadedImages = [];

      for (let index = 0; index < images.length; index++) {
        const image = images[index];
        const file = image.file;

        const extension =
          file.name.split(".").pop()?.toLowerCase() || "jpg";

        const safeExtension = extension.replace(
          /[^a-z0-9]/g,
          ""
        );

        const fileName = `${Date.now()}-${index}-${crypto.randomUUID()}.${safeExtension}`;

        const storagePath =
          `${user.id}/${listingId}/${fileName}`;

        const { error: uploadError } =
          await supabase.storage
            .from("listing-images")
            .upload(storagePath, file, {
              cacheControl: "3600",
              upsert: false,
              contentType: file.type,
            });

        if (uploadError) {
          throw new Error(
            `Fotografia ${index + 1} nu a putut fi încărcată: ${uploadError.message}`
          );
        }

        uploadedPaths.push(storagePath);

        const { data: publicUrlData } =
          supabase.storage
            .from("listing-images")
            .getPublicUrl(storagePath);

        const publicUrl = publicUrlData.publicUrl;

        uploadedImages.push({
          listing_id: listingId,
          image_url: publicUrl,
          storage_path: storagePath,
          position: index,
        });
      }

      /*
        3. SALVĂM POZELE ÎN listing_images
      */

      const { error: imagesDatabaseError } =
        await supabase
          .from("listing_images")
          .insert(uploadedImages);

      if (imagesDatabaseError) {
        throw new Error(
          `Fotografiile nu au putut fi asociate anunțului: ${imagesDatabaseError.message}`
        );
      }

      /*
        4. PRIMA POZĂ DEVINE COPERTA
      */

      const coverImageUrl =
        uploadedImages[0]?.image_url || null;

      const { error: coverError } =
        await supabase
          .from("listings")
          .update({
            image_url: coverImageUrl,
          })
          .eq("id", listingId)
          .eq("user_id", user.id);

      if (coverError) {
        throw new Error(
          `Coperta anunțului nu a putut fi salvată: ${coverError.message}`
        );
      }

      /*
        5. SUCCES
      */

      images.forEach((image) => {
        URL.revokeObjectURL(image.preview);
      });

      setImages([]);

      setForm({
        title: "",
        property_type: "apartment",
        city: "",
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
        owner_email: user.email || "",
      });

      setSuccess(
        "Proprietatea și fotografiile au fost publicate cu succes."
      );
    } catch (submitError) {
      console.error(submitError);

      /*
        Dacă upload-ul eșuează la jumătate,
        curățăm fișierele deja încărcate și
        ștergem anunțul incomplet.
      */

      await cleanupUploadedFiles(uploadedPaths);

      if (listingId) {
        await supabase
          .from("listings")
          .delete()
          .eq("id", listingId)
          .eq("user_id", user.id);
      }

      setError(
        submitError.message ||
          "A apărut o eroare la publicarea anunțului."
      );
    } finally {
      setPublishing(false);
    }
  };

  if (checkingAuth) {
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
      {/* HEADER */}

      <header
        style={{
          height: "72px",
          background: "#ffffff",
          borderBottom: "1px solid #e5e7eb",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
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
              border: "1px solid #e5e7eb",
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

      {/* CONTENT */}

      <section
        style={{
          maxWidth: "900px",
          margin: "0 auto",
          padding: "60px 30px 100px",
        }}
      >
        <div
          style={{
            marginBottom: "35px",
          }}
        >
          <div
            style={{
              display: "inline-block",
              background: "#e8f1ff",
              color: "#2563eb",
              padding: "7px 12px",
              borderRadius: "100px",
              fontSize: "13px",
              fontWeight: "700",
              marginBottom: "16px",
            }}
          >
            Publică o proprietate
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
            Adaugă proprietatea
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
            Completează informațiile proprietății tale pentru a publica
            anunțul.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* FOTOGRAFII */}

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
                margin: 0,
                fontSize: "20px",
                fontWeight: "800",
              }}
            >
              Fotografii
            </h2>

            <p
              style={{
                color: "#6b7280",
                fontSize: "14px",
                lineHeight: "1.6",
                margin: "8px 0 22px",
              }}
            >
              Adaugă între 1 și 10 fotografii. Prima fotografie va fi
              coperta anunțului.
            </p>

            <label
              style={{
                display: "block",
                border: "2px dashed #d1d5db",
                borderRadius: "14px",
                padding: "28px 20px",
                textAlign: "center",
                cursor:
                  images.length >= 10
                    ? "not-allowed"
                    : "pointer",
                background: "#fafafa",
              }}
            >
              <input
                type="file"
                accept="image/*"
                multiple
                disabled={images.length >= 10}
                onChange={handleImages}
                style={{
                  display: "none",
                }}
              />

              <div
                style={{
                  fontSize: "15px",
                  fontWeight: "800",
                  color: "#111827",
                }}
              >
                {images.length >= 10
                  ? "Ai adăugat numărul maxim de fotografii"
                  : "Selectează fotografii"}
              </div>

              <div
                style={{
                  color: "#6b7280",
                  fontSize: "13px",
                  marginTop: "7px",
                }}
              >
                {images.length}/10 fotografii selectate
              </div>
            </label>

            {images.length > 0 && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fill, minmax(150px, 1fr))",
                  gap: "14px",
                  marginTop: "22px",
                }}
              >
                {images.map((image, index) => (
                  <div
                    key={`${image.file.name}-${index}`}
                    style={{
                      position: "relative",
                      borderRadius: "12px",
                      overflow: "hidden",
                      background: "#f3f4f6",
                      aspectRatio: "1 / 1",
                    }}
                  >
                    <img
                      src={image.preview}
                      alt={`Fotografie ${index + 1}`}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        display: "block",
                      }}
                    />

                    {index === 0 && (
                      <div
                        style={{
                          position: "absolute",
                          left: "8px",
                          bottom: "8px",
                          background: "#111827",
                          color: "#ffffff",
                          padding: "6px 9px",
                          borderRadius: "7px",
                          fontSize: "11px",
                          fontWeight: "800",
                        }}
                      >
                        Copertă
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      style={{
                        position: "absolute",
                        top: "8px",
                        right: "8px",
                        width: "30px",
                        height: "30px",
                        border: "none",
                        borderRadius: "50%",
                        background: "#ffffff",
                        color: "#111827",
                        fontFamily: "inherit",
                        fontSize: "17px",
                        fontWeight: "800",
                        cursor: "pointer",
                        boxShadow:
                          "0 2px 8px rgba(0,0,0,0.18)",
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
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
                placeholder="Ex: Apartament 2 camere aproape de UMFT"
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
                <option value="apartment">Apartament</option>
                <option value="studio">Garsonieră</option>
                <option value="room">Cameră</option>
                <option value="house">Casă</option>
              </select>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "18px",
              }}
            >
              <div style={fieldStyle}>
                <label style={labelStyle}>Oraș</label>

                <input
                  name="city"
                  type="text"
                  value={form.city}
                  onChange={updateField}
                  placeholder="Timișoara"
                  style={inputStyle}
                />
              </div>

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
                placeholder="Strada, număr"
                style={inputStyle}
              />
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
                <label style={labelStyle}>Camere</label>

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
                <label style={labelStyle}>Dormitoare</label>

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
                <label style={labelStyle}>Băi</label>

                <input
                  name="bathrooms"
                  type="number"
                  min="0"
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
                  step="0.1"
                  value={form.surface_m2}
                  onChange={updateField}
                  placeholder="55"
                  style={inputStyle}
                />
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "18px",
              }}
            >
              <div style={fieldStyle}>
                <label style={labelStyle}>Mobilat</label>

                <select
                  name="furnished"
                  value={form.furnished}
                  onChange={updateField}
                  style={inputStyle}
                >
                  <option value="true">Da</option>
                  <option value="false">Nu</option>
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

            <div>
              <label style={labelStyle}>Descriere</label>

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

          {/* CONTACT */}

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
              Aceste informații vor permite persoanelor interesate să
              contacteze proprietarul.
            </p>

            <div style={fieldStyle}>
              <label style={labelStyle}>Nume</label>

              <input
                name="owner_name"
                type="text"
                value={form.owner_name}
                onChange={updateField}
                placeholder="Numele proprietarului"
                style={inputStyle}
              />
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "18px",
              }}
            >
              <div>
                <label style={labelStyle}>Telefon</label>

                <input
                  name="owner_phone"
                  type="tel"
                  value={form.owner_phone}
                  onChange={updateField}
                  placeholder="07xx xxx xxx"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Email</label>

                <input
                  name="owner_email"
                  type="email"
                  value={form.owner_email}
                  onChange={updateField}
                  placeholder="email@exemplu.ro"
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

          {/* PUBLICARE */}

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
                Gata de publicare?
              </div>

              <div
                style={{
                  color: "#6b7280",
                  fontSize: "13px",
                  marginTop: "5px",
                }}
              >
                Verifică informațiile și fotografiile înainte de
                publicare.
              </div>
            </div>

            <button
              type="submit"
              disabled={publishing}
              style={{
                border: "none",
                borderRadius: "11px",
                padding: "14px 24px",
                background: publishing
                  ? "#374151"
                  : "#111827",
                color: "#ffffff",
                fontFamily: "inherit",
                fontSize: "14px",
                fontWeight: "800",
                cursor: publishing
                  ? "not-allowed"
                  : "pointer",
                whiteSpace: "nowrap",
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
