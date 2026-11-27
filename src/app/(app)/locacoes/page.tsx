import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { AlertTriangle, Archive, ChevronRight, FileText, HardHat, Inbox, Layers, Plus, Search, Wallet, X } from "lucide-react";
import { RentalCard } from "@/components/rental-card";
import { SOFT } from "@/components/rental-ui";
import { BalanceCard, Chip, Donut, SegmentedTabs } from "@/components/ui";
import { CountUp } from "@/components/count-up";
import { db } from "@/lib/db";
import { listRentals } from "@/lib/rentals";
import { money } from "@/lib/format";

export const metadata = { title: "Locações" };

const TABS = [
  { key: "ativas", label: "Na obra", icon: HardHat, tint: "bg-sky-50 text-sky-600" },
  { key: "atrasadas", label: "Atrasadas", icon: AlertTriangle, tint: "bg-red-50 text-red-600" },
  { key: "receber", label: "A receber", icon: Wallet, tint: "bg-emerald-50 text-emerald-600" },
  { key: "orcamentos", label: "Orçamentos", icon: FileText, tint: "bg-violet-50 text-violet-600" },
  { key: "encerradas", label: "Encerradas", icon: Archive, tint: "bg-slate-100 text-slate-500" },
  { key: "todas", label: "Todas", icon: Layers, tint: "bg-brand-50 text-brand-600" },
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
  if (tab === "ativas") where.stage = "ATIVA";
  if (tab === "atrasadas") where.stage = { in: ["ATIVA", "ENCERRADA"] };
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

  // Números do resumo e das abas (sem a busca).
  const [list, live, quotes, closed, all] = await Promise.all([
    listRentals(where),
    listRentals({ stage: { in: ["ATIVA", "ENCERRADA"] } }),
    db.rental.count({ where: { stage: "ORCAMENTO" } }),
    db.rental.count({ where: { stage: "ENCERRADA" } }),
    db.rental.count(),
  ]);
  let rows = list;
  if (tab === "atrasadas") rows = rows.filter((r) => r.calc.attention);
  if (tab === "receber") rows = rows.filter((r) => r.calc.open > 0.009);
  if (tab === "ativas") rows.sort((a, b) => Number(b.calc.attention) - Number(a.calc.attention));

  const sum = rows.reduce((s, r) => s + (tab === "receber" ? r.calc.open : r.calc.total), 0);

  const active = live.filter((r) => r.stage === "ATIVA");
  const overdue = live.filter((r) => r.calc.attention).length;
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
  const onTime = active.filter((r) => !r.calc.attention).length;
  const current = TABS.find((t) => t.key === tab)!;

  const searchForm = (
    <form role="search" className="relative w-full">
      <input type="hidden" name="aba" value={tab} />
      <label className="block">
        <span className="sr-only">Buscar locação</span>
        <Search size={18} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-slate-400" aria-hidden />
        <input
          name="q"
          defaultValue={q}
          className="block min-h-12 w-full rounded-full border-0 bg-white pr-12 pl-11 text-base text-slate-900 shadow-[0_1px_2px_rgb(15_18_63/.05),0_8px_24px_-14px_rgb(15_18_63/.25)] outline-none placeholder:text-slate-400 focus:shadow-[0_0_0_2px_var(--color-brand-600),0_0_0_6px_rgb(248_200_10/.35)] sm:text-sm"
          placeholder="Cliente, obra ou nº da locação"
          type="search"
          enterKeyHint="search"
        />
      </label>
      {q && (
        <Link
          href={`/locacoes?aba=${tab}`}
          className="absolute top-1/2 right-2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          aria-label="Limpar busca"
        >
          <X size={16} aria-hidden />
        </Link>
      )}
    </form>
  );

  return (
    <>
      {/* Topo: título grande + busca (botão redondo no celular, campo macio no tablet/computador) */}
      <header className="mb-5 has-[details[open]]:pb-[60px] md:has-[details[open]]:pb-0 lg:mb-7">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[15px] font-medium text-slate-500">Operação</p>
            <h1 className="text-[1.75rem] leading-[1.15] font-bold tracking-[-0.025em] text-brand-950 sm:text-[2rem]">Locações</h1>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <div className="hidden w-[min(340px,34vw)] md:block">{searchForm}</div>
            <details className="group md:hidden" open={!!q || undefined}>
              <summary className="btn-round cursor-pointer list-none [&::-webkit-details-marker]:hidden" aria-label="Buscar locação">
                <Search className="h-5 w-5 group-open:hidden" strokeWidth={1.9} aria-hidden />
                <X className="hidden h-5 w-5 group-open:block" strokeWidth={1.9} aria-hidden />
              </summary>
              <div className="absolute inset-x-4 z-20 mt-3">{searchForm}</div>
            </details>
            <Link href="/locacoes/nova" className="btn-accent hidden min-h-12 px-5 lg:inline-flex">
              <Plus size={18} strokeWidth={2.4} aria-hidden /> Nova locação
            </Link>
          </div>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:gap-5">
        {/* Resumo em degradê */}
        <BalanceCard
          label="A receber"
          icon={<Wallet aria-hidden />}
          amount={receivable}
          chips={
            <>
              <Chip tone="glass">
                em {receivableRows.length} {receivableRows.length === 1 ? "locação" : "locações"}
              </Chip>
              {overdue > 0 && (
                <Chip tone="glass-red">
                  {overdue} {overdue === 1 ? "atrasada" : "atrasadas"}
                </Chip>
              )}
            </>
          }
          actions={
            <Donut
              size={92}
              thickness={13}
              track="rgb(255 255 255 / .14)"
              className="w-[84px] sm:w-[92px]"
              ariaLabel={`${onTime} em dia, ${overdue} atrasadas, ${quotes} orçamentos`}
              centerValue={onTime + overdue + quotes}
              centerLabel="em acompanhamento"
              segments={[
                { value: onTime, color: "var(--data-sky)", label: "Em dia" },
                { value: overdue, color: "var(--data-rose)", label: "Atrasadas" },
                { value: quotes, color: "var(--data-yellow)", label: "Orçamentos" },
              ]}
            />
          }
          footer={
            <div className="grid grid-cols-3 gap-2">
              <SummaryLink href={href("ativas")} dot="bg-sky-400" label="Em dia" value={onTime} />
              <SummaryLink href={href("atrasadas")} dot="bg-rose-500" label="Atrasadas" value={overdue} />
              <SummaryLink href={href("orcamentos")} dot="bg-accent-400" label="Orçamentos" value={quotes} />
            </div>
          }
        />

        {/* Filtros: pílulas segmentadas roláveis (celular/tablet) */}
        <nav aria-label="Filtrar locações" className="-mx-4 min-w-0 px-4 lg:hidden">
          <SegmentedTabs
            ariaLabel="Filtrar locações"
            active={href(tab)}
            items={TABS.map((t) => ({ label: t.label, href: href(t.key), count: counts[t.key] || undefined }))}
          />
        </nav>

        {/* Filtros: lista "explore" ao lado do resumo (computador) */}
        <nav aria-label="Filtrar locações" className={`${SOFT} hidden p-2 lg:block`}>
          <ul className="grid grid-cols-2 gap-1">
            {TABS.map((t) => {
              const on = tab === t.key;
              const n = counts[t.key];
              const Icon = t.icon;
              return (
                <li key={t.key}>
                  <Link
                    href={href(t.key)}
                    aria-current={on ? "page" : undefined}
                    className={`group flex min-h-[60px] items-center gap-3 rounded-[18px] px-3 transition-colors duration-150 ${
                      on ? "bg-brand-900 text-white" : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${on ? "bg-white/12 text-accent-300" : t.tint}`} aria-hidden>
                      <Icon size={17} strokeWidth={2} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] leading-tight font-semibold">{t.label}</span>
                      <span className={`tnum block text-[12px] ${on ? "text-white/60" : "text-slate-400"}`}>
                        {n} {n === 1 ? "locação" : "locações"}
                      </span>
                    </span>
                    {t.key === "atrasadas" && n > 0 && !on && <span className="h-2 w-2 shrink-0 rounded-full bg-red-500" aria-hidden />}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      {/* Lista */}
      <div className="mt-6 lg:mt-8">
        {rows.length === 0 ? (
          <div className={`${SOFT} flex flex-col items-center px-6 py-12 text-center`}>
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-50 text-brand-500">
              {q ? <Search size={26} strokeWidth={1.75} aria-hidden /> : <Inbox size={26} strokeWidth={1.75} aria-hidden />}
            </span>
            <h2 className="mt-4 text-base font-semibold text-brand-950">{q ? "Nada encontrado" : EMPTY[tab].title}</h2>
            <p className="mt-1 max-w-xs text-sm text-slate-500">{q ? `Nenhuma locação com “${q}” nesta aba.` : EMPTY[tab].text}</p>
            <Link href="/locacoes/nova" className="btn-primary mt-5 rounded-full px-5">
              <Plus size={18} aria-hidden /> Nova locação
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-3 flex items-baseline justify-between gap-3 px-1">
              <h2 className="min-w-0 truncate text-[17px] font-semibold tracking-[-0.01em] text-brand-950">
                {current.label}
                <span className="tnum ml-1.5 text-[13px] font-medium text-slate-400">
                  {rows.length}
                  {q && <> · “{q}”</>}
                </span>
              </h2>
              <span className="shrink-0 text-[13px] text-slate-500">
                {tab === "receber" ? "em aberto" : "total"} <strong className="tnum font-bold text-brand-950">{money(sum)}</strong>
              </span>
            </div>
            <div className="stagger grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 2xl:grid-cols-3">
              {rows.map((r) => (
                <RentalCard key={r.id} r={r} variant="card" />
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}

function SummaryLink({ href, dot, label, value }: { href: string; dot: string; label: string; value: number }) {
  return (
    <Link href={href} className="group -m-1 flex min-w-0 flex-col rounded-xl p-1 transition-colors hover:bg-white/[.06]">
      <span className="flex items-center gap-1.5 text-[12px] font-medium text-white/65">
        <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} aria-hidden />
        <span className="truncate">{label}</span>
      </span>
      <span className="mt-1 flex items-center gap-0.5 text-xl leading-tight font-bold tracking-[-0.02em]">
        <span className="tnum">
          <CountUp value={value} />
        </span>
        <ChevronRight size={15} className="text-white/35 transition-transform group-hover:translate-x-0.5" aria-hidden />
      </span>
    </Link>
  );
}
