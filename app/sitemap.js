import { supabase } from "./lib/supabase";

export default async function sitemap() {
  const baseUrl = "https://shaus.ro";

  const staticPages = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
  ];

  try {
    // Luăm toate anunțurile active
    const { data: listings, error } = await supabase
      .from("listings")
      .select("id, city, created_at")
      .eq("active", true);

    if (error) {
      console.error("Sitemap listings error:", error);
      return staticPages;
    }

    const activeListings = listings || [];

    // Orașele care au cel puțin un anunț activ
    const cities = [
      ...new Set(
        activeListings
          .map((listing) => listing.city)
          .filter(Boolean)
      ),
    ];

    const cityPages = cities.map((city) => ({
      url: `${baseUrl}/chirii/${slugify(city)}`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    }));

    // Paginile individuale ale proprietăților
    const propertyPages = activeListings.map((listing) => ({
      url: `${baseUrl}/proprietate/${listing.id}`,
      lastModified: listing.created_at
        ? new Date(listing.created_at)
        : new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    }));

    return [
      ...staticPages,
      ...cityPages,
      ...propertyPages,
    ];
  } catch (error) {
    console.error("Sitemap generation error:", error);

    // Homepage-ul rămâne în sitemap chiar dacă Supabase are o problemă
    return staticPages;
  }
}

function slugify(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
