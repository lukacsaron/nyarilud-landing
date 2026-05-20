import { requireAdmin } from "@/lib/auth/requireAdmin";
import { AdminShell } from "../AdminShell";
import { ToastProvider } from "../Toast";
import { DirtyTrackerProvider } from "../DirtyTracker";

export const dynamic = "force-dynamic";

export default async function AdminAuthedLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();
  return (
    <AdminShell user={session.sub}>
      <ToastProvider>
        <DirtyTrackerProvider>{children}</DirtyTrackerProvider>
      </ToastProvider>
    </AdminShell>
  );
}
