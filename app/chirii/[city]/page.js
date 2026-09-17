import CityListingsClient from "./CityListingsClient";

function formatCityName(city = "") {
  return decodeURIComponent(String(city))
    .replace(/-/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export async function generateMetadata({ params }) {
  const resolvedParams = await params;

  const citySlug = Array.isArray(resolvedParams?.city)
    ? resolvedParams.city[0]
    : resolvedParams?.city || "";

  const cityName = formatCityName(citySlug);

  return {
    title: `Chirii pentru studenți în ${cityName}`,

    description: `Găsește apartamente, garsoniere și camere de închiriat pentru studenți în ${cityName}. Descoperă chirii disponibile pe shaus.`,

    openGraph: {
      title: `Chirii pentru studenți în ${cityName} | shaus`,
      description: `Descoperă apartamente, garsoniere și camere de închiriat pentru studenți în ${cityName}.`,
      type: "website",
      locale: "ro_RO",
      siteName: "shaus",
    },

    twitter: {
      card: "summary_large_image",
      title: `Chirii pentru studenți în ${cityName} | shaus`,
      description: `Descoperă apartamente, garsoniere și camere de închiriat pentru studenți în ${cityName}.`,
    },

    robots: {
      index: true,
      follow: true,
    },
  };
}

export default function CityPage() {
  return <CityListingsClient />;
}
