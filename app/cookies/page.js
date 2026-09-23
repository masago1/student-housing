import Link from "next/link";
import InformationPage from "../components/InformationPage";

export const metadata = { title: "Politica privind cookies și tehnologii similare", alternates: { canonical: "/cookies" } };

export default function CookiesPage() {
  return (
    <InformationPage title="Politica privind cookies și tehnologii similare">
      <p>Ultima actualizare: <time dateTime="2026-09-23">23 septembrie 2026</time></p>
      <p>shaus folosește stocarea din browser pentru funcțiile solicitate și pentru preferințele tale. Cookies sunt informații pe care browserul le poate transmite serverului; localStorage păstrează informații local între vizite, iar sessionStorage le păstrează pentru sesiunea filei. Nu toate aceste tehnologii sunt cookies.</p>
      <h2>1. Stocare necesară și funcțională</h2>
      <p>Unele informații sunt necesare autentificării sau funcțiilor pe care le soliciți; altele memorează o preferință cerută direct de tine. Aceste funcții nu sunt oprite prin refuzarea hărților opționale.</p>
      <table>
        <caption>Exemple de stocare folosite de aplicație</caption>
        <thead><tr><th scope="col">Cheie sau categorie</th><th scope="col">Scop și durată</th></tr></thead>
        <tbody>
          <tr><td>Supabase Auth</td><td>localStorage: păstrează sesiunea de autentificare, conform expirării și reînnoirii acesteia; deconectarea elimină sesiunea locală.</td></tr>
          <tr><td>shaus-password-recovery-user</td><td>sessionStorage: identifică fluxul de recuperare a parolei; este eliminată la încheierea fluxului sau a sesiunii filei.</td></tr>
          <tr><td>shaus-search-url</td><td>sessionStorage: revenirea la căutarea anterioară în sesiunea filei.</td></tr>
          <tr><td>shaus-search-scroll</td><td>sessionStorage: refacerea poziției de derulare a rezultatelor în sesiunea filei.</td></tr>
          <tr><td>shaus-view-mode</td><td>localStorage: preferința listă/grilă, până la schimbare sau ștergerea stocării.</td></tr>
          <tr><td>shaus-consent</td><td>localStorage: alegerea de confidențialitate, până la schimbare, ștergere sau o nouă versiune care solicită alegerea din nou.</td></tr>
        </tbody>
      </table>
      <p>Poți șterge stocarea din setările browserului. Aceasta poate încheia sesiunea sau elimina preferințele salvate. Dacă browserul nu permite memorarea alegerii, preferința se aplică în pagina curentă, dar poate fi cerută din nou la o vizită ulterioară.</p>
      <h2>2. Servicii externe opționale: hărți Mapbox</h2>
      <p>Fără o alegere care permite serviciile externe, hărțile publice Mapbox rămân dezactivate. După acceptare prin banner sau preferințe, acestea se pot încărca automat pe paginile care le includ și afișează localizarea aproximativă a anunțului.</p>
      <p>Mapbox poate primi adresa IP, informații despre browser și cereri tehnice și poate folosi stocare precum cheile mapbox.eventData*. shaus dezactivează opțiunea performanceMetricsCollection, însă aceasta nu oprește toate evenimentele sau prelucrările tehnice Mapbox.</p>
      <p>Căutarea adresei solicitată activ de proprietar în formularele de adăugare sau editare a anunțului este o funcție separată: interogările pot fi trimise către Mapbox Search Box și, prin server, către geocodarea de rezervă Nominatim/OpenStreetMap. Comutatorul hărților publice nu controlează această căutare.</p>
      <h2>3. Ce nu folosim în prezent</h2>
      <p>La data acestei politici, shaus nu folosește intenționat cookies de publicitate, pixeli de publicitate comportamentală, Google Analytics, Meta Pixel sau urmărire pentru marketing și newslettere. Dacă aceste practici se schimbă, politica și opțiunile relevante vor fi actualizate.</p>
      <h2>4. Cum alegi sau schimbi preferințele</h2>
      <ul>
        <li><strong>Acceptă toate:</strong> permite funcțiile necesare și hărțile publice externe opționale.</li>
        <li><strong>Doar necesare:</strong> păstrează dezactivată încărcarea publică Mapbox opțională.</li>
        <li><strong>Preferințe:</strong> permite configurarea alegerii înainte de salvare.</li>
        <li><strong>Preferințe cookies:</strong> butonul din subsol redeschide setările oricând.</li>
      </ul>
      <p>Retragerea acordului oprește afișarea hărții opționale și încărcările viitoare controlate de această alegere. Nu anulează prelucrarea anterioară și nu șterge automat toate datele sau cache-urile deja create de furnizor. Stocarea locală poate fi eliminată separat din browser.</p>
      <h2>5. Date personale și contact</h2>
      <p>Detaliile despre operator, furnizori și drepturile tale sunt în <Link href="/confidentialitate">Politica de confidențialitate</Link>. Pentru întrebări: <a href="mailto:privacy@shaus.ro">privacy@shaus.ro</a>.</p>
    </InformationPage>
  );
}
