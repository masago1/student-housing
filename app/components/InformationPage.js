import Link from "next/link";
import styles from "./InformationPage.module.css";

export default function InformationPage({ title, children }) {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/" aria-label="shaus — pagina principală">shaus</Link>
      </header>
      <article className={styles.content}>
        <h1>{title}</h1>
        {children}
      </article>
    </main>
  );
}
