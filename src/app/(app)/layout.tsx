import { BottomNav, MobileHeader, Sidebar } from "@/components/nav";
import { PageTransition } from "@/components/page-transition";
import { requireUser } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="min-h-dvh lg:pl-[260px]">
      <Sidebar userName={user.name} />
      <MobileHeader userName={user.name} />
      {/* Celular: espaço embaixo para a barra flutuante (68px + 10px + safe-area). */}
      <main className="mx-auto max-w-[1320px] px-4 pt-4 pb-[calc(7.25rem+env(safe-area-inset-bottom))] lg:px-8 lg:pt-8 lg:pb-12 2xl:px-10">
        <PageTransition>{children}</PageTransition>
      </main>
      <BottomNav />
    </div>
  );
}
