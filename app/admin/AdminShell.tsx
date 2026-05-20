import Link from "next/link";
import { logoutAction } from "./login/actions";
import styles from "./admin.module.css";

export function AdminShell({ user, children }: { user: string; children: React.ReactNode }) {
  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <div className={styles.brand}>nyári lúd · admin</div>
        <div className={styles.headerActions}>
          <Link href="/" target="_blank" rel="noopener noreferrer" className={styles.viewLive}>
            View live ↗
          </Link>
          <span className={styles.user}>{user}</span>
          <form action={logoutAction}>
            <button type="submit" className={styles.logout}>Kijelentkezés</button>
          </form>
        </div>
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
