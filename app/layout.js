import { Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

export const metadata = {
  title: "Student Housing",
  description: "Găsește chirii aproape de universitatea ta",
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
