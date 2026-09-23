import Link from "next/link";
import InformationPage from "../components/InformationPage";

export const metadata = { title: "Contact", alternates: { canonical: "/contact" } };

export default function ContactPage() {
  return (
    <InformationPage title="Contact">
      <p>Ne poți scrie pentru întrebări despre shaus, ajutor privind contul sau sesizări despre conținut.</p>
      <h2>Contact general</h2>
      <p><a href="mailto:contact@shaus.ro">contact@shaus.ro</a></p>
      <h2>Confidențialitate și date personale</h2>
      <p><a href="mailto:privacy@shaus.ro">privacy@shaus.ro</a></p>
      <p>Informații despre date și exercitarea drepturilor: <Link href="/confidentialitate">Politica de confidențialitate</Link>.</p>
      <h2>Operator</h2>
      <p>Persoană fizică: <strong>[NUME COMPLET OPERATOR]</strong></p>
      <p>Adresă poștală: <strong>[ADRESĂ POȘTALĂ OPERATOR]</strong></p>
      <aside><p><strong>Datele operatorului marcate între paranteze trebuie completate înainte de lansarea publică.</strong></p></aside>
      <h2>Raportarea conținutului</h2>
      <p>Poți raporta un anunț sau alt conținut potențial ilegal ori abuziv la <a href="mailto:contact@shaus.ro">contact@shaus.ro</a>. Include, unde este posibil:</p>
      <ul>
        <li>linkul către anunț sau conținut;</li>
        <li>o explicație clară a problemei;</li>
        <li>numele și adresa ta de email, unde sunt necesare sau aplicabile;</li>
        <li>informațiile care susțin sesizarea, fără date personale inutile;</li>
        <li>o declarație că trimiți sesizarea cu bună-credință și consideri informațiile corecte.</li>
      </ul>
      <p>Aceste detalii ne ajută să identificăm conținutul și să evaluăm sesizarea. Nu trimite parola contului sau alte date de acces.</p>
    </InformationPage>
  );
}
