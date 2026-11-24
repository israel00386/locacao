import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  HandCoins,
  Landmark,
  PieChart,
  Plus,
  Receipt,
  Shapes,
  TrendingDown,
  TrendingUp,
  Truck,
  Wallet,
} from "lucide-react";
import { CashEntryButton, CashEntryRowButton, OpeningBalanceButton } from "@/components/cash-sheets";
import { ExpenseRowButton, NewExpenseButton } from "@/components/expense-sheet";
import { categoryTone, iconFor, methodIcon } from "@/components/finance-ui";
import { DayLabel, EmptyState, MoneyStat, NavyStat, QUICK_TILE_BTN, QUICK_TONES, QuickTileBody } from "@/components/screen-kit";
import { Avatar, Badge, BalanceCard, BarChart, Chip, Donut, IconBox, ProgressRow, Section, SegmentedTabs, Stat, TopBar, TxRow } from "@/components/ui";
import { paymentStatus } from "@/lib/calc";
import { cashSummary, filterStatement, groupByDay, periodSummary, type StatementFilter } from "@/lib/cash";
import { getCashMovements, getCashOpening, getStatement } from "@/lib/cash-data";
import { db } from "@/lib/db";
import { fmtDate, parseISODate, toISODate, todayISO } from "@/lib/dates";
import {
  colorStyle,
  findCategory,
  freightProfit,
  getCategories,
  getExpenseRentalOptions,
  getMonthExpenses,
  isFreightCategory,
  sumAmounts,
  totalsByCategory,
  type ExpenseCategoryData,
} from "@/lib/expenses";
import { money, rentalCode, round2 } from "@/lib/format";
import { listRentals } from "@/lib/rentals";
import { MONTHS, parseMonth } from "./month";

export const metadata = { title: "Financeiro" };

type Tab = "caixa" | "despesas" | "receber";
const TABS: { value: Tab; label: string }[] = [
  { value: "caixa", label: "Caixa" },
  { value: "despesas", label: "Despesas" },
  { value: "receber", label: "A receber" },
];

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
const dayFmt = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" });

function dayLabel(iso: string, today: string) {
  if (iso === today) return "Hoje";
  const y = toISODate(new Date(parseISODate(today)!.getTime() - 86_400_000));
  if (iso === y) return "Ontem";
  return dayFmt.format(parseISODate(iso)!);
}

export default async function FinanceiroPage({ searchParams }: { searchParams: Promise<{ mes?: string; aba?: string; tipo?: string }> }) {
  const sp = await searchParams;
  const tab: Tab = sp.aba === "despesas" || sp.aba === "receber" ? sp.aba : "caixa";
  const { month, y, m, from, to, prev, next, name } = parseMonth(sp.mes);
  const today = todayISO();
  const isCurrentMonth = today.slice(0, 7) === month;

  const href = (p: { aba?: Tab; mes?: string; tipo?: string }) => {
    const q = new URLSearchParams();
    const a = p.aba ?? tab;
    if (a !== "caixa") q.set("aba", a);
    const mm = p.mes ?? month;
    if (mm !== today.slice(0, 7)) q.set("mes", mm);
    if (p.tipo && p.tipo !== "tudo") q.set("tipo", p.tipo);
    const s = q.toString();
    return `/financeiro${s ? `?${s}` : ""}`;
  };

  // Comum a todas as abas: categorias e locações para o botão "+ Despesa".
  const [categories, monthExpenses] = await Promise.all([getCategories(), getMonthExpenses(from, to)]);
  const linkedIds = [...new Set(monthExpenses.map((e) => e.rentalId).filter((x): x is string => !!x))];
  const rentalOptions = await getExpenseRentalOptions(linkedIds);
  const monthTitle = `${cap(name)} de ${y}`;

  return (
    <>
      <TopBar
        eyebrow="Financeiro"
        title={tab === "caixa" ? "Caixa da empresa" : tab === "despesas" ? "Despesas" : "A receber"}
        subtitle={tab === "receber" ? "Saldo das locações em aberto" : `Movimento de ${name} de ${y}`}
        actions={
          <>
            <a href={`/financeiro/csv?mes=${month}`} className="btn-round" download aria-label="Exportar CSV do mês" title="Exportar CSV do mês">
              <Download className="size-5" strokeWidth={1.9} />
            </a>
            <Link href="/financeiro/categorias" className="btn-round" aria-label="Categorias de despesa" title="Categorias de despesa">
              <Shapes className="size-5" strokeWidth={1.9} />
            </Link>
            <NewExpenseButton rentals={rentalOptions} todayISO={today} categories={categories} className="btn-primary hidden rounded-full sm:inline-flex">
              <Plus className="size-4" strokeWidth={2.4} aria-hidden /> Despesa
            </NewExpenseButton>
          </>
        }
      />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 lg:mb-6">
        <SegmentedTabs
          ariaLabel="Seções do financeiro"
          className="w-full sm:w-fit [&>*]:flex-1 sm:[&>*]:flex-none"
          items={TABS.map((t) => ({ label: t.label, href: href({ aba: t.value }) }))}
          active={href({ aba: tab })}
        />
        {tab !== "receber" && (
          <div className="flex w-full items-center justify-between gap-1 rounded-full bg-white p-1 shadow-[var(--shadow-card)] sm:w-auto">
            <Link href={href({ mes: prev })} className="flex size-10 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-800" aria-label="Mês anterior">
              <ChevronLeft className="size-5" strokeWidth={2} />
            </Link>
            <span className="flex min-w-36 items-center justify-center gap-1.5 px-2 text-sm font-semibold text-brand-950">
              <CalendarDays className="size-4 text-slate-400" aria-hidden />
              {monthTitle}
            </span>
            <Link href={href({ mes: next })} className="flex size-10 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-800" aria-label="Próximo mês">
              <ChevronRight className="size-5" strokeWidth={2} />
            </Link>
          </div>
        )}
      </div>

      {tab === "caixa" && (
        <CaixaTab
          {...{ month, y, m, from, to, name, today, isCurrentMonth, categories, rentalOptions, href }}
          filter={sp.tipo === "entradas" || sp.tipo === "saidas" ? sp.tipo : "tudo"}
        />
      )}
      {tab === "despesas" && <DespesasTab {...{ name, from, to, today, categories, rentalOptions }} expenses={monthExpenses} />}
      {tab === "receber" && <ReceberTab />}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Caixa                                                                */
/* ------------------------------------------------------------------ */

async function CaixaTab({
  month,
  y,
  m,
  from,
  to,
  name,
  today,
  isCurrentMonth,
  categories,
  rentalOptions,
  filter,
  href,
}: {
  month: string;
  y: number;
  m: number;
  from: Date;
  to: Date;
  name: string;
  today: string;
  isCurrentMonth: boolean;
  categories: ExpenseCategoryData[];
  rentalOptions: { id: string; label: string }[];
  filter: StatementFilter;
  href: (p: { mes?: string; tipo?: string }) => string;
}) {
  const opening = await getCashOpening();
  // Gráfico: 6 meses até o mês escolhido (recebido × despesas, independente da abertura do caixa).
  const chartFrom = new Date(Date.UTC(y, m - 6, 1));
  const [movements, statement, chartPayments, chartExpenses] = await Promise.all([
    getCashMovements(opening),
    getStatement(from, to),
    db.payment.findMany({ where: { date: { gte: chartFrom, lt: to } }, select: { date: true, amount: true } }),
    db.expense.findMany({ where: { date: { gte: chartFrom, lt: to } }, select: { date: true, amount: true } }),
  ]);

  const fromISO = toISODate(from);
  const toISO = toISODate(to);
  const now = cashSummary(opening, movements);
  const atMonthEnd = cashSummary(opening, movements, toISO);
  const period = periodSummary(movements, fromISO, toISO, opening.date);
  // Mês inteiro, mesmo antes da abertura (para os cartões de entradas/saídas do mês).
  const monthAll = periodSummary(movements.length ? movements : [], fromISO, toISO, null);
  const monthIn = opening.date && opening.date > fromISO ? period : monthAll;

  const buckets = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(Date.UTC(y, m - 6 + i, 1));
    return { key: toISODate(d).slice(0, 7), label: MONTHS[d.getUTCMonth()].slice(0, 3), values: [0, 0] };
  });
  const idx = (d: Date) => buckets.findIndex((b) => b.key === toISODate(d).slice(0, 7));
  for (const p of chartPayments) {
    const i = idx(p.date);
    if (i >= 0) buckets[i].values[0] += Number(p.amount);
  }
  for (const e of chartExpenses) {
    const i = idx(e.date);
    if (i >= 0) buckets[i].values[1] += Number(e.amount);
  }

  const rows = filterStatement(statement, filter);
  const days = groupByDay(rows);
  const flowTotal = monthIn.inflow + monthIn.outflow;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5">
      <BalanceCard
        className="lg:col-span-7"
        label="Saldo atual do caixa"
        icon={<Wallet />}
        amount={now.balance}
        actions={
          <OpeningBalanceButton balance={opening.balance} date={opening.date} todayISO={today} className="btn-round" label="Configurar saldo inicial" />
        }
        chips={
          <>
            <Chip tone="glass" icon={period.net >= 0 ? <TrendingUp /> : <TrendingDown />}>
              {period.net >= 0 ? "+" : "−"}
              {money(Math.abs(period.net))} em {name}
            </Chip>
            <Chip tone="glass">{opening.date ? `desde ${fmtDate(parseISODate(opening.date))}` : "desde o 1º lançamento"}</Chip>
          </>
        }
        footer={
          <div className="flex flex-wrap items-center justify-between gap-2 text-[13px] text-white/70">
            <span>
              Saldo inicial <strong className="text-white tnum">{money(opening.balance)}</strong>
            </span>
            {!isCurrentMonth && (
              <span>
                Fim de {name}: <strong className="text-white tnum">{money(atMonthEnd.balance)}</strong>
              </span>
            )}
          </div>
        }
      >
        <div className="grid grid-cols-2 gap-3 min-[400px]:grid-cols-3">
          <NavyStat label="Entrou" tone="green">
            {money(now.inflow)}
          </NavyStat>
          <NavyStat label="Saiu" tone="red">
            {money(now.outflow)}
          </NavyStat>
          <div className="hidden min-[400px]:block">
            <NavyStat label="Lançamentos">{now.count}</NavyStat>
          </div>
        </div>
      </BalanceCard>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:col-span-5 lg:grid-rows-[auto_1fr]">
        <MoneyStat label={`Entradas em ${name}`} icon={<ArrowDownLeft />} tone="green" amount={monthIn.inflow} hint={`${monthIn.byKind.RECEBIMENTO ? "recebimentos" : "nenhum recebimento"}${monthIn.byKind.ENTRADA ? " + manuais" : ""}`} />
        <MoneyStat label={`Saídas em ${name}`} icon={<ArrowUpRight />} tone="red" amount={monthIn.outflow} hint={`despesas${monthIn.byKind.SAIDA ? " + retiradas" : ""}`} />
        <div className="col-span-2 grid grid-cols-3 gap-2.5 sm:gap-3">
          <CashEntryButton kind="ENTRADA" todayISO={today} className={`${QUICK_TILE_BTN} ${QUICK_TONES.emerald}`}>
            <QuickTileBody icon={ArrowDownLeft} label="Entrada" hint="aporte, ajuste" />
          </CashEntryButton>
          <CashEntryButton kind="SAIDA" todayISO={today} className={`${QUICK_TILE_BTN} ${QUICK_TONES.rose}`}>
            <QuickTileBody icon={ArrowUpRight} label="Saída" hint="retirada do dono" />
          </CashEntryButton>
          <NewExpenseButton rentals={rentalOptions} todayISO={today} categories={categories} className={`${QUICK_TILE_BTN} ${QUICK_TONES.brand}`}>
            <QuickTileBody icon={Receipt} label="Despesa" hint="frete, combustível" />
          </NewExpenseButton>
        </div>
      </div>

      <div className="min-w-0 lg:col-span-7">
<Section title="Recebido × despesas" icon={<TrendingUp />} description="Últimos 6 meses">
        <div className="px-4 pt-1 pb-5 sm:px-5">
          <BarChart
            data={buckets.map((b) => ({ label: b.label, values: b.values.map(round2) }))}
            series={[
              { label: "Recebido", color: "var(--data-emerald)" },
              { label: "Despesas", color: "var(--data-rose)" },
            ]}
            height={170}
            highlight={5}
          />
        </div>
      </Section>
</div>

      <div className="min-w-0 lg:col-span-5">
<Section title="Por forma de pagamento" icon={<Landmark />} description={opening.date ? `Movimento desde ${fmtDate(parseISODate(opening.date))}` : "Movimento desde o início"}>
        {now.byMethod.length ? (
          <ul className="divide-y divide-slate-100 pb-2">
            {now.byMethod.map((r) => {
              const Icon = methodIcon(r.method);
              return (
                <li key={r.method} className="flex min-h-16 items-center gap-3 px-4 py-2.5 sm:px-5">
                  <IconBox tone="brand" size="lg" round>
                    <Icon />
                  </IconBox>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[15px] font-semibold text-slate-900">{r.method}</div>
                    <div className="truncate text-[12.5px] text-slate-500 tnum">
                      +{money(r.inflow)} · −{money(r.outflow)}
                    </div>
                  </div>
                  <div className={`shrink-0 text-[15px] font-bold tnum ${r.net >= 0 ? "text-brand-950" : "text-rose-600"}`}>{money(r.net)}</div>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState icon={Landmark} title="Sem movimento ainda">
            Pagamentos, despesas e movimentações aparecem separados por forma.
          </EmptyState>
        )}
      </Section>
</div>

      <div className="lg:col-span-12">
        <Section
          title={`Extrato de ${name}`}
          icon={<Receipt />}
          description={`${statement.length} lançamento${statement.length === 1 ? "" : "s"} no mês`}
        >
          <div className="px-4 pt-1 pb-3 sm:px-5">
            <SegmentedTabs
              size="sm"
              ariaLabel="Filtrar extrato"
              items={[
                { label: "Tudo", href: href({ tipo: "tudo" }) },
                { label: "Entradas", href: href({ tipo: "entradas" }) },
                { label: "Saídas", href: href({ tipo: "saidas" }) },
              ]}
              active={href({ tipo: filter })}
              className="bg-slate-100 !shadow-none"
            />
          </div>
          {flowTotal > 0 && (
            <div className="px-4 pb-1 sm:px-5">
              <div className="flex h-2 gap-[3px] overflow-hidden rounded-full bg-slate-100" role="img" aria-label={`Entradas ${money(monthIn.inflow)}, saídas ${money(monthIn.outflow)}`}>
                {monthIn.inflow > 0 && <span className="bar-fill h-full rounded-full bg-emerald-500" style={{ width: `${(monthIn.inflow / flowTotal) * 100}%` }} />}
                {monthIn.outflow > 0 && <span className="bar-fill h-full rounded-full bg-rose-400" style={{ width: `${(monthIn.outflow / flowTotal) * 100}%` }} />}
              </div>
            </div>
          )}
          {days.length ? (
            <div className="pb-2">
              {days.map((d) => (
                <div key={d.date}>
                  <DayLabel right={`${d.net >= 0 ? "+" : "−"}${money(Math.abs(d.net))}`}>{dayLabel(d.date, today)}</DayLabel>
                  <ul className="divide-y divide-slate-100/80">
                    {d.rows.map((r) => {
                      if (r.kind === "RECEBIMENTO")
                        return (
                          <li key={r.key}>
                            <TxRow href={r.href} avatar={r.title} title={r.title} subtitle={`Recebimento · ${r.subtitle}`} amount={r.amount} sign="in" meta={r.method ?? undefined} />
                          </li>
                        );
                      if (r.kind === "DESPESA" && r.expense) {
                        const c = findCategory(categories, r.expense.category);
                        const Icon = iconFor(c.icon);
                        return (
                          <li key={r.key} className="relative hover:bg-slate-50/70">
                            <TxRow
                              icon={<Icon />}
                              iconTone={categoryTone(c.color)}
                              title={r.expense.description || c.name}
                              subtitle={[r.expense.description ? c.name : "Despesa", r.subtitle].filter(Boolean).join(" · ")}
                              amount={r.amount}
                              sign="out"
                              meta={r.method ?? undefined}
                            />
                            <ExpenseRowButton expense={r.expense} rentals={rentalOptions} todayISO={today} categories={categories} label={`Editar despesa ${r.expense.description || c.name}`} />
                          </li>
                        );
                      }
                      if (r.entry)
                        return (
                          <li key={r.key} className="relative hover:bg-slate-50/70">
                            <TxRow
                              icon={r.kind === "ENTRADA" ? <ArrowDownLeft /> : <ArrowUpRight />}
                              iconTone={r.kind === "ENTRADA" ? "green" : "rose"}
                              title={r.title}
                              subtitle={r.kind === "ENTRADA" ? "Entrada manual" : "Saída manual"}
                              amount={r.amount}
                              sign={r.kind === "ENTRADA" ? "in" : "out"}
                              meta={r.method ?? undefined}
                            />
                            <CashEntryRowButton entry={r.entry} todayISO={today} label={`Editar movimentação ${r.title}`} />
                          </li>
                        );
                      return null;
                    })}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={Receipt} title={filter === "tudo" ? `Nada lançado em ${name}` : filter === "entradas" ? "Nenhuma entrada neste mês" : "Nenhuma saída neste mês"}>
              Pagamentos registrados nas locações, despesas e movimentações manuais aparecem aqui.
            </EmptyState>
          )}
          {opening.date && opening.date > toISODate(from) && opening.date < toISODate(to) && (
            <p className="mx-4 mb-4 rounded-[14px] bg-accent-50 px-3.5 py-2.5 text-xs text-accent-800 sm:mx-5">
              O caixa abriu em {fmtDate(parseISODate(opening.date))}: lançamentos anteriores aparecem no extrato, mas não entram no saldo.
            </p>
          )}
          {opening.date && opening.date >= toISODate(to) && (
            <p className="mx-4 mb-4 rounded-[14px] bg-accent-50 px-3.5 py-2.5 text-xs text-accent-800 sm:mx-5">
              Este mês é anterior à abertura do caixa ({fmtDate(parseISODate(opening.date))}): os lançamentos não entram no saldo.
            </p>
          )}
        </Section>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Despesas                                                             */
/* ------------------------------------------------------------------ */

async function DespesasTab({
  name,
  from,
  to,
  today,
  categories,
  rentalOptions,
  expenses,
}: {
  name: string;
  from: Date;
  to: Date;
  today: string;
  categories: ExpenseCategoryData[];
  rentalOptions: { id: string; label: string }[];
  expenses: Awaited<ReturnType<typeof getMonthExpenses>>;
}) {
  const freightIds = [...new Set(expenses.filter((e) => e.rentalId && isFreightCategory(categories, e.category)).map((e) => e.rentalId!))];
  const [freightExpenses, freightExtras, charged] = await Promise.all([
    freightIds.length ? db.expense.findMany({ where: { rentalId: { in: freightIds } }, select: { rentalId: true, category: true, amount: true } }) : Promise.resolve([]),
    freightIds.length ? db.rentalExtra.findMany({ where: { rentalId: { in: freightIds } }, select: { rentalId: true, amount: true } }) : Promise.resolve([]),
    // Taxas/extras cobrados nas locações iniciadas no mês
    db.rentalExtra.findMany({
      where: { rental: { stage: { in: ["ATIVA", "ENCERRADA"] }, startDate: { gte: from, lt: to } } },
      select: { id: true, description: true, amount: true, rental: { select: { id: true, number: true, startDate: true, customer: { select: { name: true } } } } },
      orderBy: { rental: { startDate: "desc" } },
    }),
  ]);
  const freightRows = freightIds
    .map((id) => {
      const fp = freightProfit(
        freightExtras.filter((x) => x.rentalId === id).map((x) => ({ amount: Number(x.amount) })),
        freightExpenses.filter((x) => x.rentalId === id).map((x) => ({ category: x.category, amount: Number(x.amount) })),
        categories,
      );
      const e = expenses.find((x) => x.rentalId === id)!;
      return { id, label: `${e.rental!.code} · ${e.rental!.customerName}`, ...fp };
    })
    .sort((a, b) => a.profit - b.profit);

  const spent = sumAmounts(expenses);
  const byCategory = totalsByCategory(expenses, categories);
  const freightSpent = sumAmounts(expenses.filter((e) => isFreightCategory(categories, e.category)));
  const chargedTotal = sumAmounts(charged.map((x) => ({ amount: Number(x.amount) })));
  const freightDiff = round2(chargedTotal - freightSpent);
  const top = byCategory[0];
  // No donut, fatias muito finas (< 4%) viram uma só ("Outras") para não virarem bolinhas sobrepostas.
  const big = byCategory.filter((c) => c.total / Math.max(spent, 0.01) >= 0.04);
  const small = byCategory.filter((c) => !big.includes(c));
  const donutSegments = [
    ...big.map((c) => ({ value: c.total, color: colorStyle(c.color).css, label: c.label })),
    ...(small.length ? [{ value: sumAmounts(small.map((c) => ({ amount: c.total }))), color: "#cbd5e1", label: small.length === 1 ? small[0].label : "Outras" }] : []),
  ];

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5">
      <section className="card relative overflow-hidden p-5 sm:p-6 lg:col-span-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-medium text-slate-500">Gasto em {name}</div>
            <div className="mt-1 text-[2rem] leading-none font-bold tracking-[-0.03em] text-brand-950 tnum">{money(spent)}</div>
          </div>
          <Chip tone="neutral">
            {expenses.length} despesa{expenses.length === 1 ? "" : "s"}
          </Chip>
        </div>
        <div className="mt-5">
          <Donut
            size={230}
            thickness={13}
            segments={donutSegments}
            legend
            centerValue={top ? `${Math.round((top.total / Math.max(spent, 0.01)) * 100)}%` : "—"}
            centerLabel={top ? top.label : "sem despesas"}
            ariaLabel={byCategory.length ? `Despesas por categoria: ${byCategory.map((c) => `${c.label} ${money(c.total)}`).join(", ")}` : "Sem despesas no mês"}
          />
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <NewExpenseButton rentals={rentalOptions} todayISO={today} categories={categories} className="btn-primary rounded-full">
            <Plus className="size-4" strokeWidth={2.4} aria-hidden /> Despesa
          </NewExpenseButton>
          <Link href="/financeiro/categorias" className="btn-secondary rounded-full">
            <Shapes className="size-4" aria-hidden /> Categorias
          </Link>
        </div>
      </section>

      <div className="min-w-0 lg:col-span-7">
<Section title="Por categoria" icon={<PieChart />} description="Para onde foi o dinheiro">
        {byCategory.length ? (
          <div className="space-y-1 pb-3">
            {byCategory.map((c) => {
              const Icon = iconFor(c.icon);
              const pct = (c.total / Math.max(spent, 0.01)) * 100;
              return (
                <ProgressRow
                  key={c.id}
                  icon={<Icon />}
                  iconTone={categoryTone(c.color)}
                  title={c.label}
                  subtitle={`${c.count} lançamento${c.count === 1 ? "" : "s"}`}
                  value={money(c.total)}
                  chip={<Chip tone="neutral">{Math.round(pct)}%</Chip>}
                  percent={pct}
                  color={colorStyle(c.color).css}
                />
              );
            })}
          </div>
        ) : (
          <EmptyState icon={PieChart} title="Sem despesas neste mês">
            Lance fretes, combustível e manutenção para ver para onde vai o dinheiro.
          </EmptyState>
        )}
      </Section>
</div>

      <div className="lg:col-span-7">
        <Section title={`Despesas de ${name}`} icon={<Receipt />} description="Toque numa despesa para editar ou excluir">
          {expenses.length ? (
            <ul className="divide-y divide-slate-100/80 pb-2">
              {expenses.map((e) => {
                const c = findCategory(categories, e.category);
                const Icon = iconFor(c.icon);
                return (
                  <li key={e.id} className="relative hover:bg-slate-50/70">
                    <TxRow
                      icon={<Icon />}
                      iconTone={categoryTone(c.color)}
                      title={e.description || c.name}
                      subtitle={[e.description ? c.name : null, fmtDate(parseISODate(e.date)), e.rental?.code].filter(Boolean).join(" · ")}
                      amount={e.amount}
                      sign="out"
                      meta={e.method ?? undefined}
                    />
                    <ExpenseRowButton expense={e} rentals={rentalOptions} todayISO={today} categories={categories} label={`Editar despesa ${e.description || c.name}`} />
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState
              icon={Receipt}
              title="Nenhuma despesa neste mês"
              action={
                <NewExpenseButton rentals={rentalOptions} todayISO={today} categories={categories} className="btn-primary rounded-full">
                  <Plus className="size-4" strokeWidth={2.4} aria-hidden /> Nova despesa
                </NewExpenseButton>
              }
            >
              Registre fretes, combustível, manutenção e compras de material.
            </EmptyState>
          )}
        </Section>
      </div>

      <div className="space-y-4 lg:col-span-5 lg:space-y-5">
        <Section title="Frete" icon={<Truck />} iconTone="sky" description="Taxas cobradas × gasto com frete no mês">
          <dl className="space-y-2 px-4 pt-1 pb-4 text-sm sm:px-5">
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Cobrado (locações iniciadas no mês)</dt>
              <dd className="font-semibold whitespace-nowrap text-slate-900 tnum">{money(chargedTotal)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Gasto com frete</dt>
              <dd className="font-semibold whitespace-nowrap text-rose-600 tnum">−{money(freightSpent)}</dd>
            </div>
            <div className="flex justify-between gap-3 border-t border-slate-100 pt-2">
              <dt className="font-semibold text-slate-900">Cobrado − gasto</dt>
              <dd className={`font-bold whitespace-nowrap tnum ${freightDiff >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{money(freightDiff)}</dd>
            </div>
          </dl>
          {freightRows.length > 0 && (
            <>
              <div className="px-4 pb-1 text-xs font-semibold text-slate-400 sm:px-5">Lucro do frete por locação</div>
              <ul className="divide-y divide-slate-100/80 pb-2">
                {freightRows.map((f) => (
                  <li key={f.id}>
                    <TxRow
                      href={`/locacoes/${f.id}`}
                      icon={<Truck />}
                      iconTone="sky"
                      title={f.label}
                      subtitle={`cobrado ${money(f.charged)} − frete ${money(f.spent)}`}
                      value={<span className={f.profit >= 0 ? "text-emerald-600" : "text-rose-600"}>{money(f.profit)}</span>}
                    />
                  </li>
                ))}
              </ul>
            </>
          )}
        </Section>

        <Section title="Taxas de entrega e extras" icon={<HandCoins />} iconTone="accent" description="Cobrado nas locações iniciadas no mês">
          {charged.length ? (
            <ul className="divide-y divide-slate-100/80 pb-2">
              {charged.map((x) => (
                <li key={x.id}>
                  <TxRow
                    href={`/locacoes/${x.rental.id}`}
                    avatar={x.rental.customer.name}
                    title={x.description}
                    subtitle={`${rentalCode(x.rental.number)} · ${x.rental.customer.name} · ${fmtDate(x.rental.startDate)}`}
                    value={money(Number(x.amount))}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 pt-1 pb-5 text-sm text-slate-500">Nenhuma taxa cobrada nas locações iniciadas neste mês.</p>
          )}
        </Section>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* A receber                                                            */
/* ------------------------------------------------------------------ */

async function ReceberTab() {
  const rentals = await listRentals({ stage: { in: ["ATIVA", "ENCERRADA"] } });
  const receivable = rentals.filter((r) => r.calc.open > 0.009);
  const totalOpen = receivable.reduce((s, r) => s + r.calc.open, 0);
  const overdueOpen = receivable.filter((r) => r.calc.overdue || r.stage === "ENCERRADA" || r.calc.allReturned).reduce((s, r) => s + r.calc.open, 0);
  const onSiteOpen = totalOpen - overdueOpen;

  const byCustomer = new Map<string, { id: string; name: string; total: number; rentals: typeof receivable }>();
  for (const r of receivable) {
    const g = byCustomer.get(r.customerId) ?? { id: r.customerId, name: r.customer.name, total: 0, rentals: [] };
    g.total += r.calc.open;
    g.rentals.push(r);
    byCustomer.set(r.customerId, g);
  }
  const groups = [...byCustomer.values()].sort((a, b) => b.total - a.total);
  const max = groups[0]?.total ?? 1;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5">
      <BalanceCard
        className="lg:col-span-7"
        label="Total a receber"
        icon={<HandCoins />}
        amount={totalOpen}
        chips={
          <>
            <Chip tone="glass">
              {receivable.length} locaç{receivable.length === 1 ? "ão" : "ões"}
            </Chip>
            <Chip tone="glass">
              {groups.length} cliente{groups.length === 1 ? "" : "s"}
            </Chip>
          </>
        }
      >
        {totalOpen > 0 && (
          <div>
            <div className="flex h-2.5 gap-[3px] overflow-hidden rounded-full bg-white/10">
              {overdueOpen > 0 && <span className="bar-fill h-full rounded-full bg-rose-300" style={{ width: `${(overdueOpen / totalOpen) * 100}%` }} />}
              {onSiteOpen > 0.009 && <span className="bar-fill h-full rounded-full bg-sky-300" style={{ width: `${(onSiteOpen / totalOpen) * 100}%` }} />}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <NavyStat label="Cobrar primeiro" tone="red">
                {money(overdueOpen)}
              </NavyStat>
              <NavyStat label="Ainda na obra">{money(onSiteOpen)}</NavyStat>
            </div>
          </div>
        )}
      </BalanceCard>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:col-span-5">
        <MoneyStat label="Já devolvido e não pago" icon={<Receipt />} tone={overdueOpen > 0 ? "red" : undefined} amount={overdueOpen} hint="atrasadas, devolvidas ou encerradas" />
        <MoneyStat label="Na obra, em aberto" icon={<Truck />} amount={onSiteOpen} hint="cobrar na devolução" />
      </div>

      <div className="lg:col-span-12">
        <Section title="A receber por cliente" icon={<HandCoins />} description="Do maior saldo para o menor">
          {groups.length ? (
            <ul className="grid grid-cols-1 gap-x-6 divide-y divide-slate-100/80 pb-2 lg:grid-cols-2 lg:divide-y-0">
              {groups.map((g) => (
                <li key={g.id} className="px-4 py-3.5 sm:px-5">
                  <Link href={`/clientes/${g.id}`} className="tap -mx-2 flex items-center gap-3 rounded-2xl px-2 py-1 hover:bg-slate-50">
                    <Avatar name={g.name} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-semibold text-slate-900">{g.name}</span>
                      <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <span className="bar-fill block h-full rounded-full bg-rose-400" style={{ width: `${(g.total / max) * 100}%` }} />
                      </span>
                    </span>
                    <span className="shrink-0 text-[15px] font-bold whitespace-nowrap text-red-700 tnum">{money(g.total)}</span>
                    <ChevronRight className="size-4 shrink-0 text-slate-300" aria-hidden />
                  </Link>
                  <ul className="mt-1.5 space-y-0.5 pl-[56px]">
                    {g.rentals.map((r) => {
                      const ps = paymentStatus(r.stage, r.calc);
                      return (
                        <li key={r.id}>
                          <Link href={`/locacoes/${r.id}`} className="-mx-2 flex min-h-10 items-center justify-between gap-3 rounded-xl px-2 text-xs text-slate-600 hover:bg-slate-50">
                            <span className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5">
                              <span className="tnum">
                                {rentalCode(r.number)} · {fmtDate(r.startDate)}
                              </span>
                              <Badge tone={ps.tone}>{ps.label}</Badge>
                            </span>
                            <span className="shrink-0 font-semibold tnum">{money(r.calc.open)}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={HandCoins} title="Nada a receber">
              Todas as locações estão pagas.
            </EmptyState>
          )}
        </Section>
      </div>
    </div>
  );
}
