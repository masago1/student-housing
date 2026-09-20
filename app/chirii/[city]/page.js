import DeviceRouter from "./DeviceRouter";
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

  const title = `Chirii în ${cityName} – Apartamente și Garsoniere de Închiriat | shaus`;

  const description = `Găsește chirii în ${cityName}: apartamente, garsoniere și camere de închiriat pentru studenți și nu numai. Descoperă proprietăți disponibile pe shaus.`;

  return {
    title,

    description,

    alternates: {
      canonical: `/chirii/${citySlug}`,
    },

    keywords: [
      `chirii ${cityName}`,
      `apartamente de închiriat ${cityName}`,
      `garsoniere de închiriat ${cityName}`,
      `camere de închiriat ${cityName}`,
      `chirie ${cityName}`,
      `cazare studenți ${cityName}`,
      `apartamente ${cityName}`,
      "chirii studenți",
      "shaus",
    ],

    openGraph: {
      title,
      description,
      type: "website",
      locale: "ro_RO",
      siteName: "shaus",
      url: `https://shaus.ro/chirii/${citySlug}`,
    },

    twitter: {
      card: "summary_large_image",
      title,
      description,
    },

    robots: {
      index: true,
      follow: true,
    },
  };
}

export default function CityPage() {
  return <DeviceRouter />;
}
