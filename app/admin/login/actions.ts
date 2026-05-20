"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { readAdminEnv, AdminConfigError } from "@/lib/auth/env";
import { safeEq } from "@/lib/auth/safeEq";
import { loginLimiter } from "@/lib/auth/rateLimit";
import { setSession, clearSession } from "@/lib/auth/session";

export type LoginState = { error?: string };

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const h = await headers();
  const xff = h.get("x-forwarded-for");
  const xffRightmost = xff?.split(",").map((s) => s.trim()).filter(Boolean).pop();
  const ip = h.get("x-real-ip") ?? xffRightmost ?? "anon";

  if (!loginLimiter.check(ip)) {
    await sleep(1_000);
    return { error: "Túl sok próbálkozás. Próbáld újra egy perc múlva." };
  }

  const user = String(formData.get("user") ?? "");
  const password = String(formData.get("password") ?? "");

  let env;
  try {
    env = readAdminEnv();
  } catch (err) {
    if (err instanceof AdminConfigError) {
      return { error: "Admin nincs konfigurálva. Lépj kapcsolatba a fejlesztővel." };
    }
    throw err;
  }

  const [userOk, passOk] = await Promise.all([
    safeEq(user, env.user),
    safeEq(password, env.password),
  ]);

  if (!userOk || !passOk) {
    await sleep(1_000);
    return { error: "Hibás belépés." };
  }

  await setSession(env.user);
  redirect("/admin");
}

export async function logoutAction(): Promise<void> {
  await clearSession();
  redirect("/admin/login");
}
