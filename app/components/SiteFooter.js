"use client";

import Link from "next/link";
import { useConsent } from "./ConsentProvider";
import styles from "./SiteFooter.module.css";

const groups = [
  { title: "Despre shaus", links: [["Despre noi", "/despre"], ["Cum funcționează", "/cum-functioneaza"]] },
  { title: "Pentru proprietari", links: [["+ Adaugă anunț", "/adaugaproprietate"], ["Anunțurile tale", "/dashboard?section=listings"]] },
  { title: "Ajutor", links: [["Contact", "/contact"]] },
  { title: "Legal", links: [["Termeni și condiții", "/termeni"], ["Politica de confidențialitate", "/confidentialitate"], ["Cookies", "/cookies"]] },
];

export default function SiteFooter() {
  const { openPreferences, storageError } = useConsent();
  return (
    <footer className={styles.footer}>
      <div className={styles.main}>
        <Link className={styles.brand} href="/" aria-label="shaus — pagina principală">shaus</Link>
        <nav className={styles.columns} aria-label="Navigare subsol">
          {groups.map(({ title, links }) => (
            <section key={title}>
              <h2>{title}</h2>
              <ul>{links.map(([label, href]) => <li key={href}><Link href={href}>{label}</Link></li>)}</ul>
            </section>
          ))}
        </nav>
      </div>
      <div className={styles.bottom}>
        <div className={styles.bar}>
          <span>© 2026 shaus</span>
          <nav aria-label="Informații legale">
            <Link href="/termeni">Termeni și condiții</Link>
            <Link href="/confidentialitate">Politica de confidențialitate</Link>
            <button type="button" onClick={openPreferences}>Preferințe cookies</button>
          </nav>
        </div>
        {storageError && <p className={styles.status} role="status">{storageError}</p>}
      </div>
    </footer>
  );
}
