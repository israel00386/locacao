import { BottomNav, Sidebar } from "@/components/nav";
import { requireUser } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="min-h-dvh">
      <Sidebar userName={user.name} />
      <main className="mx-auto max-w-5xl px-4 pb-28 pt-5 lg:ml-60 lg:px-8 lg:pb-10 lg:pt-8">{children}</main>
      <BottomNav />
    </div>
  );
}
