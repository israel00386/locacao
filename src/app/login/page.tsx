import { Logo } from "@/components/logo";
import { db } from "@/lib/db";
import { LoginForm } from "./form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Entrar" };

export default async function LoginPage() {
  const setup = (await db.user.count()) === 0;
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-brand-950 px-4 pt-[max(2rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(110%_70%_at_50%_20%,#26317a_0%,#141a52_40%,#08082a_85%)]"
        aria-hidden
      />
      <div className="page-enter relative w-full max-w-sm">
        <div className="mb-7 text-center">
          <Logo variant="stacked" markClassName="h-24 w-auto drop-shadow-[0_6px_24px_rgb(248_200_10/.25)]" />
        </div>
        <div className="card p-5 shadow-2xl shadow-black/30 sm:p-6">
          <h1 className="text-lg font-bold text-brand-900">{setup ? "Primeiro acesso" : "Entrar"}</h1>
          <p className="mb-4 text-sm text-slate-500">{setup ? "Crie o usuário do dono para começar." : "Use seu e-mail e senha para continuar."}</p>
          <LoginForm setup={setup} />
        </div>
        <p className="mt-6 text-center text-xs text-white/50">Locação de equipamentos para obra · Pacatuba-CE</p>
      </div>
    </div>
  );
}
