import styles from "./admin.module.css";

const ITEMS = [
  { href: "#oldal", label: "Oldal alapok" },
  { href: "#galeria", label: "Galéria" },
  { href: "#sajto", label: "Sajtó" },
  { href: "#nyitva", label: "Nyitvatartás" },
  { href: "#unnepek", label: "Ünnepek" },
];

export function AdminNav() {
  return (
    <nav className={styles.nav} aria-label="Admin szekciók">
      <ul className={styles.navList}>
        {ITEMS.map((item) => (
          <li key={item.href}>
            <a href={item.href} className={styles.navLink}>{item.label}</a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
