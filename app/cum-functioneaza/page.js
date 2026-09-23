import Link from "next/link";
import InformationPage from "../components/InformationPage";

export const metadata = { title: "Cum funcționează", alternates: { canonical: "/cum-functioneaza" } };

export default function HowItWorksPage() {
  return (
    <InformationPage title="Cum funcționează shaus">
      <h2>Cauți o locuință?</h2>
      <ol>
        <li><strong>Caută.</strong> Alege orașul și consultă anunțurile de închiriere disponibile.</li>
        <li><strong>Filtrează.</strong> Restrânge rezultatele după preferințe, precum prețul, camerele sau cartierul.</li>
        <li><strong>Vezi anunțul.</strong> Consultă fotografiile, prețul, disponibilitatea și detaliile proprietății. Cu un cont, poți salva favorite.</li>
        <li><strong>Contactează proprietarul.</strong> Folosește telefonul afișat sau autentifică-te pentru a trimite un mesaj. Discută și verifică direct condițiile închirierii.</li>
      </ol>
      <h2>Vrei să publici un anunț?</h2>
      <ol>
        <li><strong>Creează cont.</strong> Alege nickname-ul care te va reprezenta public.</li>
        <li><strong>Completează profilul și telefonul.</strong> Pentru publicare este necesar un număr valid, care va fi afișat ca telefon de contact.</li>
        <li><strong>Publică anunțul.</strong> Adaugă informațiile proprietății, adresa, fotografiile, prețul și disponibilitatea.</li>
        <li><strong>Administrează anunțurile și mesajele.</strong> Folosește dashboard-ul pentru actualizări și conversații cu persoanele interesate.</li>
      </ol>
      <p>Poți începe din <Link href="/login">pagina de autentificare</Link>. Pentru ajutor, vezi <Link href="/contact">Contact</Link>.</p>
    </InformationPage>
  );
}
