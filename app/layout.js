import "mapbox-gl/dist/mapbox-gl.css";
import { Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

export const metadata = {
  title: {
    default: "shaus | Chirii pentru studenți",
    template: "%s | shaus",
  },

  description:
    "Găsește apartamente, garsoniere și camere de închiriat pentru studenți. Descoperă chirii în orașul tău și în apropierea universității.",

  applicationName: "shaus",

  keywords: [
    "chirii studenți",
    "chirii pentru studenți",
    "apartamente de închiriat",
    "garsoniere de închiriat",
    "camere de închiriat",
    "chirie universitate",
    "cazare studenți",
    "shaus",
  ],

  authors: [
    {
      name: "shaus",
    },
  ],

  creator: "shaus",
  publisher: "shaus",

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },

  openGraph: {
    type: "website",
    locale: "ro_RO",
    siteName: "shaus",
    title: "shaus | Chirii pentru studenți",
    description:
      "Găsește apartamente, garsoniere și camere de închiriat pentru studenți.",
  },

  twitter: {
    card: "summary_large_image",
    title: "shaus | Chirii pentru studenți",
    description:
      "Găsește apartamente, garsoniere și camere de închiriat pentru studenți.",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="ro">
      <body
        className={inter.className}
        style={{
          margin: 0,
          padding: 0,
          WebkitFontSmoothing: "antialiased",
          MozOsxFontSmoothing: "grayscale",
          textRendering: "optimizeLegibility",
        }}
      >
        {children}
      </body>
    </html>
  );
}
