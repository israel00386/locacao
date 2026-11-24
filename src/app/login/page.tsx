import { CalendarClock, HandCoins, Truck } from "lucide-react";
import { Logo, LogoMark } from "@/components/logo";
import { db } from "@/lib/db";
import { LoginForm } from "./form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Entrar" };

const features = [
  { icon: Truck, title: "Material na obra", text: "O que saiu, com quem e até quando." },
  { icon: CalendarClock, title: "Devoluções e atrasos", text: "Avisos do que vence hoje e do que passou do prazo." },
  { icon: HandCoins, title: "A receber", text: "Pagamentos, saldos e orçamentos pelo celular." },
];

export default async function LoginPage() {
  const setup = (await db.user.count()) === 0;
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-4 lg:p-4">
      {/* Lado da marca (computador): cartão marinho */}
      <div className="card-navy on-navy relative isolate hidden overflow-hidden p-12 lg:flex lg:flex-col lg:justify-between xl:p-16">
        <span className="pointer-events-none absolute -top-32 -right-24 -z-10 h-[26rem] w-[26rem] rounded-full border-[56px] border-white/[.04]" aria-hidden />
        <span className="pointer-events-none absolute -bottom-40 -left-24 -z-10 h-[24rem] w-[24rem] rounded-full bg-white/[.03]" aria-hidden />
        <Logo markClassName="h-12 w-auto" />
        <div className="max-w-md">
          <h2 className="text-[2.75rem] leading-[1.08] font-bold tracking-[-0.035em]">
            Sua locadora, <span className="text-accent-400">organizada</span> do pátio à obra.
          </h2>
          <p className="mt-4 text-[17px] leading-relaxed text-white/65">Locações, estoque, clientes e financeiro em um só lugar.</p>
          <ul className="mt-10 grid gap-3">
            {features.map((f) => (
              <li key={f.title} className="flex items-center gap-4 rounded-[20px] bg-white/[.06] p-3.5 pr-5 ring-1 ring-white/[.08] ring-inset">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent-400 text-brand-950">
                  <f.icon className="h-5 w-5" strokeWidth={2} aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold">{f.title}</span>
                  <span className="block text-sm text-white/60">{f.text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-sm text-white/45">Pacatuba-CE · Locação de equipamentos para construção civil</p>
      </div>

      {/* Formulário */}
      <div className="relative flex min-h-dvh flex-col items-center justify-center px-4 pt-[max(2.5rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))] lg:min-h-0 lg:px-10">
        <div className="page-enter w-full max-w-[420px]">
          <div className="mb-8 flex flex-col items-center text-center lg:hidden">
            <span className="flex h-20 w-20 items-center justify-center rounded-[26px] bg-gradient-to-br from-brand-700 to-brand-950 shadow-[0_18px_36px_-16px_rgb(15_18_63/.7)]">
              <LogoMark className="h-11 w-auto" title={null} />
            </span>
            <div className="mt-4 text-[1.6rem] leading-none font-black tracking-tight text-brand-900">LOCAR</div>
            <div className="mt-1.5 pl-[.4em] text-[.65rem] font-semibold tracking-[.4em] text-brand-600/80">EQUIPAMENTOS</div>
          </div>
          <div className="card p-6 sm:p-8">
            <div className="mb-6">
              <h1 className="text-[1.75rem] leading-tight font-bold tracking-[-0.025em] text-brand-950">{setup ? "Primeiro acesso" : "Bem-vindo de volta"}</h1>
              <p className="mt-1.5 text-[15px] text-slate-500">{setup ? "Crie o usuário do dono para começar." : "Entre com seu e-mail e senha para continuar."}</p>
            </div>
            <LoginForm setup={setup} />
          </div>
          <p className="mt-6 text-center text-xs text-slate-400">LOCAR Equipamentos · Pacatuba-CE</p>
        </div>
      </div>
    </div>
  );
}
