import Link from "next/link";
import InformationPage from "../components/InformationPage";

export const metadata = { title: "Politica de confidențialitate", alternates: { canonical: "/confidentialitate" } };

export default function PrivacyPage() {
  return (
    <InformationPage title="Politica de confidențialitate">
      <p>Ultima actualizare: <time dateTime="2026-09-23">23 septembrie 2026</time></p>
      <p>Această politică explică modul în care sunt prelucrate datele personale atunci când folosești shaus.ro, ce informații sunt publice și cum îți poți exercita drepturile.</p>

      <h2>1. Operatorul datelor</h2>
      {/* TODO BEFORE PUBLIC LAUNCH:
          Add legal operator details:
          - legal company/operator name
          - registered office/postal address
          - CUI
          - Trade Register number, if applicable
      */}
      <p>Contact general: <a href="mailto:contact@shaus.ro">contact@shaus.ro</a>. Pentru cereri privind datele personale: <a href="mailto:privacy@shaus.ro">privacy@shaus.ro</a>.</p>

      <h2>2. Ce este shaus</h2>
      <p>shaus este o platformă pentru publicarea și găsirea anunțurilor de închiriere. Utilizatorii pot crea conturi, publica și administra anunțuri, salva favorite și, după autentificare, comunica prin mesaje. shaus nu este proprietarul sau chiriașul și nu este parte la contractele de închiriere încheiate între utilizatori.</p>

      <h2>3. Ce date prelucrăm</h2>
      <h3>Cont și autentificare</h3>
      <p>Prelucrăm adresa de email, numele privat din profil, nickname-ul public, telefonul, identificatorul contului Supabase, informații de autentificare și sesiune și momentele relevante ale operațiunilor. Parolele și datele de recuperare sunt gestionate prin Supabase Auth; aplicația nu stochează parolele în tabelele obișnuite pentru profiluri sau anunțuri.</p>
      <h3>Profil</h3>
      <p>Numele din profil este o informație privată a contului. Nickname-ul este identitatea publică folosită pe shaus și devine permanent după alegere, conform regulilor actuale ale produsului. Telefonul este o dată a profilului; publicarea unui anunț necesită un număr valid, care devine și contactul public al anunțului.</p>
      <h3>Anunțuri și localizare</h3>
      <p>Prelucrăm titlul, descrierea, orașul, cartierul, adresa sau strada introduse, caracteristicile proprietății, chiria, garanția, disponibilitatea, fotografiile, nickname-ul și telefonul copiate ca informații de contact, starea anunțului și datele creării sau modificării.</p>
      <p>Coordonatele exacte sunt păstrate pentru administrarea și editarea proprietății. Paginile publice folosesc coordonate aproximative. Adresa sau strada afișată în anunț poate totuși oferi informații despre localizare. Numele real din profil și emailul contului nu sunt destinate afișării drept contact public. Copia informațiilor de contact dintr-un anunț poate rămâne diferită de profil până la actualizarea sa.</p>
      <h3>Fotografii</h3>
      <p>Fotografiile sunt încărcate de utilizatori. Evită imagini cu persoane, documente sau alte date personale care nu sunt necesare. Fișierele originale pot conține metadate încorporate, inclusiv EXIF; shaus nu garantează eliminarea automată a acestora.</p>
      <h3>Mesaje și favorite</h3>
      <p>Pentru mesaje prelucrăm identificatorii participanților, conținutul, momentele trimiterii și starea de citire. Mesajele sunt vizibile participanților la conversație. Pentru favorite păstrăm legătura dintre cont și anunțurile salvate; lista de favorite nu este destinată publicării.</p>
      <h3>Browser și informații tehnice</h3>
      <p>Browserul poate păstra sesiunea Supabase, starea recuperării parolei, informații pentru revenirea la căutare și poziția de derulare, preferința listă/grilă și alegerea de confidențialitate. Găzduirea și serviciile externe pot prelucra adresa IP și metadatele cererilor, necesare comunicării tehnice. Detalii în <Link href="/cookies">Politica privind cookies și tehnologii similare</Link>.</p>
      <h3>Hărți publice și căutarea adresei</h3>
      <p>Harta publică Mapbox se încarcă numai după ce permiți serviciile externe/hărțile prin sistemul de preferințe. Aceasta folosește coordonatele aproximative ale anunțului. Mapbox poate primi informații tehnice și de rețea.</p>
      <p>Separat, când proprietarul tastează activ o adresă în formularul de adăugare sau editare, căutarea trimite interogări către Mapbox Search Box. Pentru geocodare se poate folosi și un serviciu Nominatim/OpenStreetMap de rezervă, apelat de server. Căutarea adresei solicitată de proprietar este distinctă de harta publică și nu este controlată de comutatorul de consimțământ pentru aceasta.</p>

      <h2>4. Scopuri și temeiuri</h2>
      <table>
        <caption>Prelucrări și temeiuri aplicabile</caption>
        <thead><tr><th scope="col">Prelucrare și scop</th><th scope="col">Temei</th></tr></thead>
        <tbody>
          <tr><td>Cont și autentificare: furnizarea accesului solicitat.</td><td>Executarea relației contractuale privind serviciul, inclusiv demersuri cerute înainte de încheierea acesteia.</td></tr>
          <tr><td>Profil, anunțuri, fotografii, căutarea adresei, mesaje și favorite: funcțiile solicitate.</td><td>Executarea serviciului convenit cu utilizatorul.</td></tr>
          <tr><td>Securitate, prevenirea fraudei și abuzului.</td><td>Interesul legitim de a proteja platforma și utilizatorii, evaluat în raport cu drepturile acestora; obligații legale unde se aplică.</td></tr>
          <tr><td>Răspuns la solicitări și suport.</td><td>Executarea serviciului, demersuri la cererea ta sau interesul legitim de a soluționa corespondența, în funcție de solicitare.</td></tr>
          <tr><td>Harta publică interactivă opțională.</td><td>Consimțământ pentru serviciul extern opțional și, unde este necesar, stocarea ori accesarea informațiilor din terminal.</td></tr>
          <tr><td>Cerințe legale și solicitări obligatorii ale autorităților.</td><td>Îndeplinirea obligațiilor legale aplicabile.</td></tr>
        </tbody>
      </table>
      <p>Nu toate prelucrările se bazează pe consimțământ. Datele necesare unei funcții sunt folosite pentru a o furniza; fără ele, funcția respectivă poate să nu fie disponibilă. Refuzarea hărților publice opționale nu împiedică folosirea celorlalte funcții.</p>

      <h2>5. Ce devine public</h2>
      <p>Publicarea unui anunț face accesibile nickname-ul, telefonul de contact, descrierea, fotografiile, adresa sau strada afișată, localizarea aproximativă, prețul, disponibilitatea și caracteristicile proprietății. Alte persoane pot consulta sau copia aceste informații. Nu include date personale inutile în descrieri ori fotografii și publică numai informații pe care ai dreptul să le faci publice.</p>

      <h2>6. Destinatari și furnizori</h2>
      <ul>
        <li><strong>Supabase:</strong> autentificare, bază de date, mesaje în timp real și stocarea fișierelor.</li>
        <li><strong>Vercel:</strong> găzduirea și livrarea site-ului.</li>
        <li><strong>Resend:</strong> livrarea emailurilor tranzacționale de autentificare prin SMTP, inclusiv confirmarea contului și recuperarea parolei.</li>
        <li><strong>Mapbox:</strong> hărți publice opționale după consimțământ și căutarea adreselor inițiată de proprietar.</li>
        <li><strong>Nominatim/OpenStreetMap:</strong> geocodarea de rezervă a adreselor proprietăților.</li>
      </ul>
      <p>Datele pot fi comunicate autorităților atunci când legea impune acest lucru. Informațiile publicate sunt accesibile vizitatorilor, iar mesajele sunt accesibile participanților.</p>
      <p>În funcție de infrastructură și configurare, unii furnizori pot prelucra informații în afara Spațiului Economic European. Acolo unde au loc asemenea transferuri, se aplică garanțiile cerute de legislația privind protecția datelor și acordurile relevante pentru serviciu. Poți solicita informații despre garanțiile aplicabile la privacy@shaus.ro.</p>

      <h2>7. Cât timp păstrăm datele</h2>
      <ul>
        <li><strong>Cont și profil:</strong> cât timp există contul, cu respectarea cerințelor legale și de securitate aplicabile.</li>
        <li><strong>Anunțuri și fotografii:</strong> cât timp sunt menținute de utilizator. Anunțurile inactive pot rămâne disponibile proprietarului pentru reactivare. Ștergerea anunțului sau a contului elimină înregistrările din aplicație potrivit procesului de ștergere implementat.</li>
        <li><strong>Favorite:</strong> până la eliminarea lor sau ștergerea contului.</li>
        <li><strong>Mesaje și conversații:</strong> cât timp există conturile sau conversațiile asociate; ștergerea unui cont poate elimina conversațiile în care acesta participă, inclusiv mesajele celuilalt participant.</li>
        <li><strong>Preferința de confidențialitate:</strong> în browser până la schimbare, ștergerea stocării sau solicitarea unei noi alegeri prin versiunea sistemului de consimțământ.</li>
      </ul>
      <p>Urmărim să nu păstrăm date mai mult decât este necesar scopului. Jurnalele tehnice, copiile de siguranță și cache-urile pot rămâne temporar conform procedurilor de securitate și păstrare ale furnizorilor. Datele necesare unor obligații legale ori apărării unor drepturi pot fi păstrate în limitele legii. Nu promitem ștergerea instantanee a fiecărei copii, inclusiv emailuri deja livrate sau fișiere descărcate de alte persoane.</p>

      <h2>8. Ștergerea contului</h2>
      <p>Poți solicita ștergerea permanentă din <strong>Dashboard → Profilul meu → Șterge contul</strong>. Fluxul elimină contul și profilul, anunțurile proprii și imaginile lor, favoritele, conversațiile și mesajele asociate potrivit regulilor actuale de ștergere, precum și contul Supabase Auth. Operațiunea nu poate fi anulată după finalizare.</p>
      <p>Copiile tehnice de siguranță, jurnalele sau informațiile deja primite ori descărcate de alt utilizator sau furnizor nu dispar neapărat imediat. Pentru întrebări sau dificultăți, scrie la privacy@shaus.ro.</p>

      <h2>9. Drepturile tale</h2>
      <p>În condițiile legii, ai dreptul la acces, rectificare, ștergere, restricționarea prelucrării, opoziție și portabilitate. Aceste drepturi nu sunt absolute; aplicabilitatea lor depinde de prelucrare și de condițiile legale. Poți retrage consimțământul fără să afectezi legalitatea prelucrării anterioare retragerii.</p>
      <p>Trimite cererile la <a href="mailto:privacy@shaus.ro">privacy@shaus.ro</a>. Putem solicita informații de verificare a identității atunci când este rezonabil necesar pentru protejarea contului și a datelor. Răspundem în termenele prevăzute de lege.</p>
      <p>Poți depune o plângere la autoritatea de supraveghere competentă, inclusiv <a href="https://www.dataprotection.ro/">Autoritatea Națională de Supraveghere a Prelucrării Datelor cu Caracter Personal (ANSPDCP)</a> din România.</p>

      <h2>10. Datele copiilor</h2>
      <p>Serviciul nu este conceput în mod special pentru colectarea datelor copiilor. Dacă aflăm că date au fost furnizate într-un mod incompatibil cu cerințele legale aplicabile, vom lua măsuri corespunzătoare.</p>

      <h2>11. Securitate</h2>
      <p>Aplicația folosește autentificare, controale de acces la date, inclusiv politici RLS pentru accesul la rânduri, și separarea accesului proprietarului pentru operațiunile asupra datelor sale. Operațiunile care necesită privilegii administrative sunt realizate pe server. Protecția include transportul securizat și măsurile furnizorilor. Aceste măsuri reduc riscurile, dar nu pot garanta securitatea absolută.</p>

      <h2>12. Actualizări</h2>
      <p>Putem actualiza această politică pentru a reflecta schimbări ale serviciului sau ale cerințelor legale. Data de la început arată versiunea curentă; schimbările importante vor fi comunicate prin mijloace adecvate.</p>
    </InformationPage>
  );
}
