import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { AlertTriangle, Archive, FileText, HardHat, Inbox, Layers, Plus, Search, Wallet, X } from "lucide-react";
import { RentalCard } from "@/components/rental-card";
import { HeroStat, NavyHero } from "@/components/rental-ui";
import { CountUp } from "@/components/count-up";
import { db } from "@/lib/db";
import { listRentals } from "@/lib/rentals";
import { money } from "@/lib/format";

export const metadata = { title: "Locações" };

const TABS = [
  { key: "ativas", label: "Na obra", icon: HardHat },
  { key: "atrasadas", label: "Atrasadas", icon: AlertTriangle },
  { key: "receber", label: "A receber", icon: Wallet },
  { key: "orcamentos", label: "Orçamentos", icon: FileText },
  { key: "encerradas", label: "Encerradas", icon: Archive },
  { key: "todas", label: "Todas", icon: Layers },
] as const;

const EMPTY: Record<(typeof TABS)[number]["key"], { title: string; text: string }> = {
  ativas: { title: "Nenhuma locação na obra", text: "Quando o material sair, confirme a locação e ela aparece aqui." },
  atrasadas: { title: "Nenhuma locação atrasada", text: "Tudo dentro do prazo. Bom trabalho!" },
  receber: { title: "Nada a receber", text: "Todas as locações estão quitadas." },
  orcamentos: { title: "Nenhum orçamento aberto", text: "Monte um orçamento e envie pelo WhatsApp." },
  encerradas: { title: "Nenhuma locação encerrada", text: "As locações encerradas ficam guardadas aqui." },
  todas: { title: "Nenhuma locação ainda", text: "Comece pela primeira locação." },
};

export default async function LocacoesPage({ searchParams }: { searchParams: Promise<{ aba?: string; q?: string }> }) {
  const sp = await searchParams;
  const tab = TABS.find((t) => t.key === sp.aba)?.key ?? "ativas";
  const q = (sp.q ?? "").trim();

  const where: Prisma.RentalWhereInput = {};
  if (tab === "ativas" || tab === "atrasadas") where.stage = "ATIVA";
  if (tab === "orcamentos") where.stage = "ORCAMENTO";
  if (tab === "encerradas") where.stage = "ENCERRADA";
  if (tab === "receber") where.stage = { in: ["ATIVA", "ENCERRADA"] };
  if (q) {
    const num = Number(q.replace(/\D/g, ""));
    where.OR = [
      { customer: { name: { contains: q, mode: "insensitive" } } },
      { siteAddress: { contains: q, mode: "insensitive" } },
      ...(num ? [{ number: num }] : []),
    ];
  }

  // Números da faixa do topo e das abas (sem a busca).
  const [list, live, quotes, closed, all] = await Promise.all([
    listRentals(where),
    listRentals({ stage: { in: ["ATIVA", "ENCERRADA"] } }),
    db.rental.count({ where: { stage: "ORCAMENTO" } }),
    db.rental.count({ where: { stage: "ENCERRADA" } }),
    db.rental.count(),
  ]);
  let rows = list;
  if (tab === "atrasadas") rows = rows.filter((r) => r.calc.overdue);
  if (tab === "receber") rows = rows.filter((r) => r.calc.open > 0.009);
  if (tab === "ativas") rows.sort((a, b) => Number(b.calc.overdue) - Number(a.calc.overdue));

  const sum = rows.reduce((s, r) => s + (tab === "receber" ? r.calc.open : r.calc.total), 0);

  const active = live.filter((r) => r.stage === "ATIVA");
  const overdue = active.filter((r) => r.calc.overdue).length;
  const receivableRows = live.filter((r) => r.calc.open > 0.009);
  const receivable = receivableRows.reduce((s, r) => s + r.calc.open, 0);
  const counts: Record<string, number> = {
    ativas: active.length,
    atrasadas: overdue,
    receber: receivableRows.length,
    orcamentos: quotes,
    encerradas: closed,
    todas: all,
  };
  const href = (key: string) => `/locacoes?aba=${key}${q ? `&q=${encodeURIComponent(q)}` : ""}`;

  return (
    <>
      <NavyHero className="pb-20 lg:pb-20">
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold tracking-[0.08em] text-accent-300/90 uppercase">Operação</div>
            <h1 className="mt-1 text-[26px] leading-tight font-bold tracking-[-0.02em] sm:text-[28px]">Locações</h1>
            <p className="mt-1 text-sm text-white/65">
              {active.length} {active.length === 1 ? "locação ativa" : "locações ativas"}
              {overdue > 0 && <span className="text-red-300"> · {overdue} {overdue === 1 ? "atrasada" : "atrasadas"}</span>}
            </p>
          </div>
          <Link href="/locacoes/nova" className="btn-accent hidden shrink-0 lg:inline-flex">
            <Plus size={18} strokeWidth={2.2} aria-hidden /> Nova locação
          </Link>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
          <HeroStat label="Na obra" tone="accent">
            <CountUp value={active.length} />
          </HeroStat>
          <HeroStat label="Atrasadas" tone={overdue ? "red" : undefined}>
            <CountUp value={overdue} />
          </HeroStat>
          <HeroStat label="A receber" tone={receivable > 0 ? "red" : "green"} className="col-span-2 sm:col-span-1">
            <CountUp value={receivable} format="money" />
          </HeroStat>
        </div>
      </NavyHero>

      {/* Busca + abas, sobrepondo a faixa */}
      <div className="relative z-10 -mt-12 space-y-3">
        <form className="card rounded-[20px] p-2" role="search">
          <input type="hidden" name="aba" value={tab} />
          <label className="relative block">
            <span className="sr-only">Buscar locação</span>
            <Search size={18} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-slate-400" aria-hidden />
            <input
              name="q"
              defaultValue={q}
              className="input min-h-12 rounded-[14px] pr-11 pl-11 ring-slate-200"
              placeholder="Cliente, obra ou nº da locação"
              type="search"
              enterKeyHint="search"
            />
            {q && (
              <Link
                href={`/locacoes?aba=${tab}`}
                className="absolute top-1/2 right-2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Limpar busca"
              >
                <X size={16} aria-hidden />
              </Link>
            )}
          </label>
        </form>

        <nav aria-label="Filtrar locações" className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] lg:mx-0 lg:px-0 [&::-webkit-scrollbar]:hidden">
          <div className="inline-flex min-w-max gap-1 rounded-2xl bg-slate-200/60 p-1 ring-1 ring-slate-200/80 ring-inset">
            {TABS.map((t) => {
              const on = tab === t.key;
              const Icon = t.icon;
              const n = counts[t.key];
              return (
                <Link
                  key={t.key}
                  href={href(t.key)}
                  aria-current={on ? "page" : undefined}
                  className={`flex min-h-10 items-center gap-1.5 rounded-xl px-3 text-[13px] font-semibold whitespace-nowrap transition-[background-color,color,box-shadow] duration-150 ${
                    on ? "bg-white text-brand-900 shadow-[var(--shadow-card)] ring-1 ring-slate-200/80" : "text-slate-600 hover:bg-white/60 hover:text-slate-900"
                  }`}
                >
                  <Icon size={15} strokeWidth={2} className={on ? (t.key === "atrasadas" ? "text-red-600" : "text-brand-600") : "text-slate-400"} aria-hidden />
                  {t.label}
                  {n > 0 && (
                    <span
                      className={`tnum rounded-full px-1.5 py-px text-[10.5px] leading-4 font-bold ${
                        t.key === "atrasadas" ? "bg-red-600 text-white" : on ? "bg-brand-600 text-white" : "bg-slate-300/70 text-slate-700"
                      }`}
                    >
                      {n}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>

      {rows.length === 0 ? (
        <div className="card mt-4 flex flex-col items-center rounded-[20px] px-6 py-12 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-500 ring-1 ring-brand-100 ring-inset">
            {q ? <Search size={26} strokeWidth={1.75} aria-hidden /> : <Inbox size={26} strokeWidth={1.75} aria-hidden />}
          </span>
          <h2 className="mt-4 text-base font-semibold text-slate-900">{q ? "Nada encontrado" : EMPTY[tab].title}</h2>
          <p className="mt-1 max-w-xs text-sm text-slate-500">{q ? `Nenhuma locação com “${q}” nesta aba.` : EMPTY[tab].text}</p>
          <Link href="/locacoes/nova" className="btn-primary mt-5">
            <Plus size={18} aria-hidden /> Nova locação
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-5 mb-2.5 flex items-baseline justify-between gap-3 px-1">
            <span className="text-[13px] font-medium text-slate-500">
              {rows.length} {rows.length === 1 ? "locação" : "locações"}
              {q && <> para “{q}”</>}
            </span>
            <span className="text-[13px] text-slate-500">
              {tab === "receber" ? "em aberto" : "total"} <strong className="tnum font-bold text-slate-900">{money(sum)}</strong>
            </span>
          </div>
          <div className="stagger grid grid-cols-1 gap-3 lg:grid-cols-2">
            {rows.map((r) => (
              <RentalCard key={r.id} r={r} variant="card" />
            ))}
          </div>
        </>
      )}
    </>
  );
}
