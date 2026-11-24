import { BottomNav, MobileHeader, Sidebar } from "@/components/nav";
import { PageTransition } from "@/components/page-transition";
import { requireUser } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="min-h-dvh lg:pl-64">
      <Sidebar userName={user.name} />
      <MobileHeader userName={user.name} />
      <main className="mx-auto max-w-[1100px] px-4 pt-5 pb-[calc(7rem+env(safe-area-inset-bottom))] lg:px-10 lg:pt-8 lg:pb-12">
        <PageTransition>{children}</PageTransition>
      </main>
      <BottomNav />
    </div>
  );
}
