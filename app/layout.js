export const metadata = {
  title: "Student Housing",
  description: "Găsește chirii aproape de universitatea ta",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ro">
      <body>{children}</body>
    </html>
  );
}
