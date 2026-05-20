import { redirect } from "next/navigation";
import { readSession } from "./session";
import { isAdminConfigured } from "./env";

export async function requireAdmin(): Promise<{ sub: string }> {
  if (!isAdminConfigured()) {
    throw new Error("admin not configured (set ADMIN_USER, ADMIN_PASSWORD, SESSION_SECRET)");
  }
  const session = await readSession();
  if (!session) redirect("/admin/login");
  return session;
}
