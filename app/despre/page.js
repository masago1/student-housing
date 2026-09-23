import Link from "next/link";
import InformationPage from "../components/InformationPage";

export const metadata = { title: "Despre shaus", alternates: { canonical: "/despre" } };

export default function AboutPage() {
  return (
    <InformationPage title="Despre shaus">
      <p>shaus este o platformă pentru găsirea și publicarea anunțurilor de închiriere.</p>
      <h2>Pentru cei care caută o locuință</h2>
      <p>Poți căuta și filtra anunțuri, consulta paginile proprietăților, fotografiile și detaliile oferite de proprietari. Telefonul din anunț și mesageria pentru utilizatorii autentificați te ajută să iei legătura cu aceștia.</p>
      <h2>Pentru proprietari</h2>
      <p>Poți publica și administra anunțuri din cont, actualiza informațiile și discuta cu persoanele interesate prin mesaje.</p>
      <p>Vezi <Link href="/cum-functioneaza">cum funcționează shaus</Link> sau <Link href="/contact">contactează-ne</Link> dacă ai întrebări.</p>
    </InformationPage>
  );
}
