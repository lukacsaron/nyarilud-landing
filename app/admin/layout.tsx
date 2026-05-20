import { requireAdmin } from "@/lib/auth/requireAdmin";
import { AdminShell } from "./AdminShell";
import { ToastProvider } from "./Toast";

export const metadata = { title: "admin" };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();
  return (
    <AdminShell user={session.sub}>
      <ToastProvider>{children}</ToastProvider>
    </AdminShell>
  );
}
