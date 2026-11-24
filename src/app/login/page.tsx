import { CalendarClock, HandCoins, Truck } from "lucide-react";
import { Logo } from "@/components/logo";
import { db } from "@/lib/db";
import { LoginForm } from "./form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Entrar" };

const features = [
  { icon: Truck, title: "Material na obra", text: "Saber o que saiu, com quem e até quando." },
  { icon: CalendarClock, title: "Devoluções e atrasos", text: "Avisos do que vence hoje e do que passou do prazo." },
  { icon: HandCoins, title: "A receber", text: "Pagamentos, saldos e orçamentos pelo celular." },
];

export default async function LoginPage() {
  const setup = (await db.user.count()) === 0;
  return (
    <div className="relative min-h-dvh overflow-hidden bg-brand-950 lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:bg-[var(--app-bg)]">
      {/* Lado da marca (no celular é o fundo inteiro) */}
      <div className="on-navy absolute inset-0 overflow-hidden text-white lg:relative lg:inset-auto lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_60%_at_15%_0%,#2a3585_0%,transparent_60%),radial-gradient(70%_50%_at_100%_100%,rgb(248_200_10/.12),transparent_65%),linear-gradient(170deg,#0f123f_0%,#08082a_100%)]" aria-hidden />
        <div className="scaffold-grid pointer-events-none absolute inset-0" aria-hidden />
        <div className="relative hidden lg:block">
          <Logo markClassName="h-12 w-auto" />
        </div>
        <div className="relative hidden max-w-md lg:block">
          <h2 className="text-[2.5rem] leading-[1.1] font-bold tracking-[-0.03em]">
            Sua locadora, <span className="text-accent-400">organizada</span> do pátio à obra.
          </h2>
          <p className="mt-4 text-[17px] leading-relaxed text-white/60">Locações, estoque, clientes e financeiro em um só lugar.</p>
          <ul className="mt-10 space-y-5">
            {features.map((f) => (
              <li key={f.title} className="flex items-start gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-white/[.07] text-accent-400 ring-1 ring-white/10 ring-inset">
                  <f.icon className="h-5 w-5" strokeWidth={1.9} aria-hidden />
                </span>
                <span>
                  <span className="block font-semibold">{f.title}</span>
                  <span className="block text-sm text-white/55">{f.text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative hidden text-sm text-white/40 lg:block">Pacatuba-CE · Locação de equipamentos para construção civil</p>
      </div>

      {/* Formulário */}
      <div className="relative flex min-h-dvh flex-col items-center justify-center px-4 pt-[max(2.5rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))] lg:min-h-0 lg:px-10">
        <div className="page-enter w-full max-w-[400px]">
          <div className="mb-8 flex justify-center lg:hidden">
            <Logo variant="stacked" markClassName="h-20 w-auto drop-shadow-[0_8px_28px_rgb(248_200_10/.3)]" />
          </div>
          <div className="card p-6 shadow-[var(--shadow-float)] sm:p-8 lg:shadow-[var(--shadow-raised)]">
            <div className="mb-6">
              <h1 className="text-[1.625rem] leading-tight font-bold tracking-[-0.02em] text-brand-950">{setup ? "Primeiro acesso" : "Bem-vindo de volta"}</h1>
              <p className="mt-1.5 text-[15px] text-slate-500">{setup ? "Crie o usuário do dono para começar." : "Entre com seu e-mail e senha para continuar."}</p>
            </div>
            <LoginForm setup={setup} />
          </div>
          <p className="mt-6 text-center text-xs text-white/45 lg:text-slate-400">LOCAR Equipamentos · Pacatuba-CE</p>
        </div>
      </div>
    </div>
  );
}
