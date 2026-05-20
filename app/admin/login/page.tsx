"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "./actions";
import styles from "./login.module.css";

const initial: LoginState = {};

export default function LoginPage() {
  const [state, action, pending] = useActionState(loginAction, initial);
  return (
    <main className={styles.wrap}>
      <form action={action} className={styles.card}>
        <h1 className={styles.title}>nyári lúd · admin</h1>
        <label className={styles.label}>
          Felhasználó
          <input name="user" autoComplete="username" required className={styles.input} />
        </label>
        <label className={styles.label}>
          Jelszó
          <input name="password" type="password" autoComplete="current-password" required className={styles.input} />
        </label>
        {state.error && <p className={styles.error} role="alert">{state.error}</p>}
        <button type="submit" disabled={pending} className={styles.button}>
          {pending ? "Belépés..." : "Belépés"}
        </button>
      </form>
    </main>
  );
}
