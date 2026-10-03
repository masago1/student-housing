export const defaultFilters = {
  minPrice: "", maxPrice: "", rooms: "",
  minSurface: "", maxSurface: "", furnished: "",
  bedrooms: "", bathrooms: "", propertyType: "", listingType: "",
  availableFrom: "", sort: "newest", zone: "",
};

export function readUrlFilters(search) {
  const params = new URLSearchParams(search);
  const filters = { ...defaultFilters };
  for (const key of Object.keys(filters)) {
    filters[key] = params.get(key === "zone" ? "zona" : key) || defaultFilters[key];
  }
  if (filters.listingType === "rent") filters.listingType = "entire";
  // The native mobile date input uses ISO; desktop displays this same date as DD/MM/YYYY.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(filters.availableFrom)) filters.availableFrom = "";
  return filters;
}

export function filtersToSearchParams(filters) {
  const params = new URLSearchParams();
  for (const key of Object.keys(defaultFilters)) {
    if (filters[key]) params.set(key === "zone" ? "zona" : key, filters[key]);
  }
  return params;
}

export function filterListings(listings, filters) {
  // Keep comparisons and numeric coercion identical to CityListingsClient.
  const result = listings.filter((listing) => {
    if (filters.zone && (listing.neighborhoods?.slug || "") !== filters.zone) return false;
    if (filters.minPrice && Number(listing.price_monthly) < Number(filters.minPrice)) return false;
    if (filters.maxPrice && Number(listing.price_monthly) > Number(filters.maxPrice)) return false;
    if (filters.rooms && Number(listing.rooms) !== Number(filters.rooms)) return false;
    if (filters.bedrooms && Number(listing.bedrooms) !== Number(filters.bedrooms)) return false;
    if (filters.bathrooms && Number(listing.bathrooms) !== Number(filters.bathrooms)) return false;
    if (filters.minSurface && Number(listing.surface_m2) < Number(filters.minSurface)) return false;
    if (filters.maxSurface && Number(listing.surface_m2) > Number(filters.maxSurface)) return false;
    if (filters.propertyType && listing.property_type !== filters.propertyType) return false;
    if (filters.listingType && listing.listing_type !== filters.listingType) return false;
    if (filters.furnished === "yes" && listing.furnished !== true) return false;
    if (filters.furnished === "no" && listing.furnished !== false) return false;
    if (filters.availableFrom && (!listing.available_from || listing.available_from > filters.availableFrom)) return false;
    return true;
  });

  return result.sort((a, b) => {
    switch (filters.sort) {
      case "price_asc": return Number(a.price_monthly) - Number(b.price_monthly);
      case "price_desc": return Number(b.price_monthly) - Number(a.price_monthly);
      case "surface_desc": return Number(b.surface_m2 || 0) - Number(a.surface_m2 || 0);
      case "newest":
      default: return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });
}

export function validateFilterValues(filters) {
  for (const [min, max, label, limit] of [
    ["minPrice", "maxPrice", "Prețul", 100000],
    ["minSurface", "maxSurface", "Suprafața", 10000],
  ]) {
    if ([min, max].some((key) => filters[key] &&
      (!/^[1-9]\d*$/.test(filters[key]) || !Number.isInteger(Number(filters[key])) || Number(filters[key]) > limit))) {
      return `${label}: introdu numere întregi între 1 și ${limit}.`;
    }
    if (filters[min] && filters[max] && Number(filters[min]) > Number(filters[max])) {
      return `${label}: valoarea minimă nu poate depăși valoarea maximă.`;
    }
  }
  if (filters.availableFrom) {
    const [year, month, day] = filters.availableFrom.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(filters.availableFrom) ||
      date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
      return "Data disponibilității nu este validă.";
    }
  }
  return "";
}

export function normalizeLocation(value = "") {
  return decodeURIComponent(String(value || "")).normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export function universitiesForCity(universities, city) {
  if (!city) return [];
  const names = [city.name, city.slug].filter(Boolean).map(normalizeLocation);
  return universities.filter(university => {
    if (university.city_id && city.id) return String(university.city_id) === String(city.id);
    return [university.city, university.city_name, university.city_slug]
      .filter(Boolean).some(value => names.includes(normalizeLocation(value)));
  });
}

export function universitySlug(university) {
  return normalizeLocation(university.short_name || university.name);
}

export function findUniversity(universities, value) {
  if (!value) return null;
  return universities.find(item => String(item.id) === String(value) ||
    [item.short_name, item.name].filter(Boolean).some(name => normalizeLocation(name) === normalizeLocation(value))) || null;
}

export function searchUrl(city, university, filters = defaultFilters) {
  const path = `/chirii/${normalizeLocation(city)}${university ? `/${universitySlug(university)}` : ""}`;
  const params = filtersToSearchParams(filters);
  if (params.get("sort") === "newest") params.delete("sort");
  const query = params.toString();
  return `${path}${query ? `?${query}` : ""}`;
}

export function isoDateToRomanian(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return "";
  return value.split("-").reverse().join("/");
}

export function romanianDateToISO(value) {
  return value ? value.split("/").reverse().join("-") : "";
}

export function desktopUrlFilters(search) {
  const filters = readUrlFilters(search);
  return { ...filters, availableFrom: isoDateToRomanian(filters.availableFrom) };
}

export function filterDesktopListings(listings, filters) {
  return filterListings(listings, { ...filters, availableFrom: romanianDateToISO(filters.availableFrom) });
}
