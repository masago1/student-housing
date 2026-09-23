import Link from "next/link";
import InformationPage from "../components/InformationPage";

export const metadata = { title: "Termeni și condiții", alternates: { canonical: "/termeni" } };

export default function TermsPage() {
  return (
    <InformationPage title="Termeni și condiții">
      <p>Ultima actualizare: <time dateTime="2026-09-23">23 septembrie 2026</time></p>
      <h2>1. Operator și contact</h2>
      <p>shaus.ro este operat de persoana fizică <strong>[NUME COMPLET OPERATOR]</strong>, cu adresa poștală <strong>[ADRESĂ POȘTALĂ OPERATOR]</strong>. Contact: <a href="mailto:contact@shaus.ro">contact@shaus.ro</a>.</p>
      <h2>2. Rolul platformei</h2>
      <p>shaus oferă o platformă tehnică pentru anunțuri de închiriere și comunicare. Utilizatorii publică propriile informații și decid dacă intră într-o relație de închiriere. shaus nu este parte la acordurile dintre ei și nu garantează încheierea unei tranzacții.</p>
      <h2>3. Conturi</h2>
      <p>Furnizează informații corecte, protejează accesul la cont și folosește-l în mod responsabil. Anunță-ne dacă suspectezi acces neautorizat. Răspunzi pentru activitatea ta în limitele legii. Nickname-ul ales este identitatea publică și, conform regulilor actuale, nu poate fi schimbat după alegere. Numele privat și telefonul pot fi gestionate în profil.</p>
      <h2>4. Anunțuri și conținut</h2>
      <p>Publică numai dacă ai dreptul să oferi proprietatea și să folosești conținutul. Informațiile trebuie să fie legale, rezonabil de exacte și să nu inducă deliberat în eroare. Asigură-te că fotografiile respectă drepturile altora și că datele de contact sunt ale tale sau că ești autorizat să le publici.</p>
      <p>Sunt interzise conținutul ilegal, anunțurile frauduloase, ofertele discriminatorii contrare legii, încălcarea drepturilor de autor sau a altor drepturi, malware-ul, phishing-ul, spam-ul, impersonarea și informațiile intenționat false ori înșelătoare.</p>
      <h2>5. Informații publice</h2>
      <p>Prin publicare, datele destinate anunțului devin publice, inclusiv nickname-ul, telefonul de contact, descrierea, fotografiile și informațiile despre proprietate. Nu include date personale inutile. Consultă <Link href="/confidentialitate">Politica de confidențialitate</Link> pentru detalii despre localizare și prelucrarea datelor.</p>
      <h2>6. Mesaje și contact</h2>
      <p>Poți contacta un proprietar prin numărul afișat sau, după autentificare, prin mesageria internă. Utilizatorii răspund pentru propriile comunicări. Mesajele abuzive, amenințătoare, frauduloase sau ilegale nu sunt permise.</p>
      <h2>7. Sesizări și moderare</h2>
      <p>Poți semnala conținut potențial ilegal sau abuziv conform instrucțiunilor din <Link href="/contact">pagina Contact</Link>. Atunci când este justificat de încălcări, riscuri de securitate sau obligații legale, putem elimina ori dezactiva anunțuri, limita accesul sau suspenda ori închide conturi. Măsurile vor ține cont de natura și gravitatea situației și de drepturile persoanelor afectate.</p>
      <p>Putem păstra informații când legea o impune. Unde este aplicabil, vom comunica motivele unei măsuri și vom analiza clarificările primite, în limitele legii și ale nevoilor de securitate.</p>
      <h2>8. Relația de închiriere</h2>
      <p>Evaluează independent proprietatea, persoana cu care discuți, documentele și condițiile închirierii. shaus nu procesează în prezent contractul de închiriere și nu garantează plata sau executarea obligațiilor dintre utilizatori.</p>
      <h2>9. Drepturile asupra conținutului</h2>
      <p>Îți păstrezi drepturile asupra conținutului încărcat. Acordezi shaus o licență limitată, neexclusivă, necesară pentru stocarea, reproducerea tehnică, afișarea și distribuirea prin platformă a conținutului, în scopul funcționării serviciului. Licența încetează la eliminarea conținutului, sub rezerva păstrării tehnice sau legale necesare; aceasta nu transferă proprietatea fotografiilor către shaus.</p>
      <h2>10. Administrarea și ștergerea</h2>
      <p>Îți poți administra și șterge anunțurile din cont. Ștergerea permanentă a contului este disponibilă în Profilul meu, prin Șterge contul. Efectele asupra datelor, conversațiilor și copiilor tehnice sunt descrise în <Link href="/confidentialitate">Politica de confidențialitate</Link>.</p>
      <h2>11. Disponibilitatea serviciului</h2>
      <p>Serviciul poate fi modificat, întrerupt sau temporar indisponibil din cauza mentenanței, defecțiunilor ori nevoilor de securitate. Nu oferim o garanție de disponibilitate neîntreruptă. Vom ține cont de interesele utilizatorilor atunci când planificăm schimbări importante.</p>
      <h2>12. Răspundere</h2>
      <p>Fiecare parte răspunde potrivit legii pentru propriile fapte și obligații. Informațiile utilizatorilor și deciziile de închiriere nu devin garanții oferite de shaus prin simpla publicare. Acest lucru nu exclude răspunderea operatorului acolo unde legea o stabilește și nu limitează drepturile obligatorii ale consumatorilor sau alte drepturi legale care nu pot fi înlăturate prin contract.</p>
      <h2>13. Modificarea termenilor</h2>
      <p>Putem actualiza termenii pentru a reflecta evoluția serviciului ori cerințele legale. Versiunea curentă este datată mai sus. Modificările importante vor fi comunicate adecvat, cu respectarea informării și a celorlalte drepturi aplicabile.</p>
      <h2>14. Legea aplicabilă</h2>
      <p>Acești termeni sunt guvernați de legea română aplicabilă, fără a afecta drepturile obligatorii de care beneficiază consumatorii potrivit legislației aplicabile.</p>
      <h2>15. Întrebări</h2>
      <p>Pentru întrebări privind serviciul sau acești termeni, scrie la <a href="mailto:contact@shaus.ro">contact@shaus.ro</a>.</p>
    </InformationPage>
  );
}
