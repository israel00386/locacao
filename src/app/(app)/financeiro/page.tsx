import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, BarChart3, ChevronLeft, ChevronRight, Download, HandCoins, PieChart, Receipt, Scale, Tag, Truck, Wallet } from "lucide-react";
import { ExpenseItem } from "@/components/expense-list";
import { ExpenseRowActions, NewExpenseButton } from "@/components/expense-sheet";
import { CategoryBreakdown, WeeklyChart, type WeekBucket } from "@/components/finance-ui";
import { Avatar, EmptyState, Hero, HeroOverlap, HeroStat, Panel, navyBtn } from "@/components/screen-kit";
import { Badge, Stat } from "@/components/ui";
import { paymentStatus } from "@/lib/calc";
import { db } from "@/lib/db";
import { fmtDate, todayISO } from "@/lib/dates";
import { FREIGHT_CATEGORIES, freightProfit, getExpenseRentalOptions, getMonthExpenses, sumAmounts, totalsByCategory } from "@/lib/expenses";
import { money, rentalCode } from "@/lib/format";
import { listRentals } from "@/lib/rentals";
import { parseMonth } from "./month";

export const metadata = { title: "Financeiro" };

export default async function FinanceiroPage({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const sp = await searchParams;
  const { month, y, m, from, to, prev, next, name } = parseMonth(sp.mes);

  const [rentals, payments, expenses] = await Promise.all([
    listRentals({ stage: { in: ["ATIVA", "ENCERRADA"] } }),
    db.payment.findMany({
      where: { date: { gte: from, lt: to } },
      include: { rental: { include: { customer: true } } },
      orderBy: { date: "desc" },
    }),
    getMonthExpenses(from, to),
  ]);

  // Lucro do frete: locações com despesa de entrega/retirada neste mês (todas as despesas e extras delas, de qualquer data).
  const freightRentalIds = [...new Set(expenses.filter((e) => e.rentalId && FREIGHT_CATEGORIES.includes(e.category)).map((e) => e.rentalId!))];
  const linkedIds = [...new Set(expenses.map((e) => e.rentalId).filter((x): x is string => !!x))];
  const [rentalOptions, freightExpenses, freightExtras] = await Promise.all([
    getExpenseRentalOptions(linkedIds),
    freightRentalIds.length
      ? db.expense.findMany({ where: { rentalId: { in: freightRentalIds } }, select: { rentalId: true, category: true, amount: true } })
      : Promise.resolve([]),
    freightRentalIds.length
      ? db.rentalExtra.findMany({ where: { rentalId: { in: freightRentalIds } }, select: { rentalId: true, amount: true } })
      : Promise.resolve([]),
  ]);
  const freightByRental = new Map(
    freightRentalIds.map((id) => [
      id,
      freightProfit(
        freightExtras.filter((x) => x.rentalId === id).map((x) => ({ amount: Number(x.amount) })),
        freightExpenses.filter((x) => x.rentalId === id).map((x) => ({ category: x.category, amount: Number(x.amount) })),
      ),
    ]),
  );

  const receivable = rentals.filter((r) => r.calc.open > 0.009);
  const totalOpen = receivable.reduce((s, r) => s + r.calc.open, 0);
  const overdueOpen = receivable.filter((r) => r.calc.overdue || r.stage === "ENCERRADA" || r.calc.allReturned).reduce((s, r) => s + r.calc.open, 0);
  const received = payments.reduce((s, p) => s + Number(p.amount), 0);
  const startedInMonth = rentals.filter((r) => r.startDate >= from && r.startDate < to);
  const billed = startedInMonth.reduce((s, r) => s + r.calc.total, 0);

  const spent = sumAmounts(expenses);
  const balance = Math.round((received - spent) * 100) / 100;
  const byCategory = totalsByCategory(expenses);
  const freightSpent = sumAmounts(expenses.filter((e) => FREIGHT_CATEGORIES.includes(e.category)));

  // Taxas/extras cobrados nas locações iniciadas no mês
  const charged = startedInMonth.flatMap((r) => r.extras.map((x) => ({ id: x.id, rental: r, description: x.description, amount: Number(x.amount) })));
  const chargedTotal = sumAmounts(charged);
  const freightDiff = Math.round((chargedTotal - freightSpent) * 100) / 100;

  // A receber agrupado por cliente
  const byCustomer = new Map<string, { id: string; name: string; total: number; rentals: typeof receivable }>();
  for (const r of receivable) {
    const g = byCustomer.get(r.customerId) ?? { id: r.customerId, name: r.customer.name, total: 0, rentals: [] };
    g.total += r.calc.open;
    g.rentals.push(r);
    byCustomer.set(r.customerId, g);
  }
  const groups = [...byCustomer.values()].sort((a, b) => b.total - a.total);
  const today = todayISO();
  const shownFreight = new Set<string>();

  // Gráfico: recebido × despesas por semana do mês (só agrupamento para exibir).
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const weeks: WeekBucket[] = [];
  for (let start = 1; start <= lastDay; start += 7) {
    const end = Math.min(lastDay, start + 6);
    weeks.push({ label: `${start}–${end}`, received: 0, spent: 0 });
  }
  const weekOf = (day: number) => Math.min(weeks.length - 1, Math.floor((day - 1) / 7));
  for (const p of payments) weeks[weekOf(p.date.getUTCDate())].received += Number(p.amount);
  for (const e of expenses) weeks[weekOf(Number(e.date.slice(8, 10)))].spent += e.amount;
  const monthTitle = `${name[0].toUpperCase() + name.slice(1)} de ${y}`;
  const flow = received + spent;

  return (
    <>
      <Hero
        eyebrow="Financeiro"
        title={
          <span className="flex items-center gap-1.5">
            <Link
              href={`/financeiro?mes=${prev}`}
              className="-ml-2 flex size-10 shrink-0 items-center justify-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white"
              aria-label="Mês anterior"
            >
              <ChevronLeft className="size-5" strokeWidth={2.2} />
            </Link>
            <span className="min-w-0">{monthTitle}</span>
            <Link
              href={`/financeiro?mes=${next}`}
              className="flex size-10 shrink-0 items-center justify-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white"
              aria-label="Próximo mês"
            >
              <ChevronRight className="size-5" strokeWidth={2.2} />
            </Link>
          </span>
        }
        actions={
          <>
            <a href={`/financeiro/csv?mes=${month}`} className={navyBtn} download>
              <Download className="size-4" aria-hidden /> Exportar CSV
            </a>
            <NewExpenseButton rentals={rentalOptions} todayISO={today} className="btn-accent" />
          </>
        }
      >
        <div className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3">
          <div className="col-span-2 sm:col-span-1">
            <HeroStat
              label="Saldo do mês"
              icon={Scale}
              amount={balance}
              format="money"
              size="lg"
              tone={balance < 0 ? "red" : "white"}
              hint="recebido − despesas"
            />
          </div>
          <HeroStat label="Recebido" icon={ArrowDownLeft} amount={received} format="money" tone="green" hint={`${payments.length} pagamento${payments.length === 1 ? "" : "s"}`} />
          <HeroStat label="Despesas" icon={ArrowUpRight} amount={spent} format="money" tone="red" hint={`${expenses.length} despesa${expenses.length === 1 ? "" : "s"}`} />
        </div>
        <div className="mt-5 flex h-2.5 gap-[2px] overflow-hidden rounded-full bg-white/10" role="img" aria-label={`Recebido ${money(received)}, despesas ${money(spent)}`}>
          {received > 0 && <span className="h-full rounded-full bg-emerald-300" style={{ width: `${(received / flow) * 100}%` }} />}
          {spent > 0 && <span className="h-full rounded-full bg-rose-300" style={{ width: `${(spent / flow) * 100}%` }} />}
        </div>
      </Hero>

      <HeroOverlap>
        <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-3">
          <Stat label="Total a receber" value={money(totalOpen)} amount={totalOpen} format="money" tone={totalOpen > 0 ? "red" : "green"} hint={`${receivable.length} locações`} />
          <Stat label="Já devolvido e não pago" value={money(overdueOpen)} amount={overdueOpen} format="money" hint="cobrar primeiro" tone={overdueOpen > 0 ? "red" : undefined} />
          <div className="col-span-2 lg:col-span-1">
            <Stat label={`Locado em ${name}`} value={money(billed)} amount={billed} format="money" hint={`${startedInMonth.length} locações iniciadas`} />
          </div>
        </div>

        <div className="grid items-start gap-4 lg:grid-cols-2">
          <Panel title="Movimento por semana" icon={BarChart3}>
            <WeeklyChart weeks={weeks} />
          </Panel>

          <Panel title="Despesas por categoria" icon={PieChart}>
            {byCategory.length ? (
              <>
                <div className="flex items-baseline justify-between gap-3 px-5 pb-3">
                  <span className="text-xs font-medium text-slate-500">Total gasto em {name}</span>
                  <span className="text-xl font-bold tracking-tight text-slate-900 tnum">{money(spent)}</span>
                </div>
                <CategoryBreakdown rows={byCategory} total={spent} />
              </>
            ) : (
              <EmptyState icon={PieChart} title="Sem despesas neste mês">
                Lance fretes, combustível e manutenção para ver para onde vai o dinheiro.
              </EmptyState>
            )}
          </Panel>

          <Panel
            title={`Despesas de ${name}`}
            icon={Receipt}
            count={expenses.length}
            actions={<NewExpenseButton rentals={rentalOptions} todayISO={today} className="btn-secondary btn-sm" />}
          >
            {expenses.length ? (
              <ul className="divide-y divide-slate-100 border-t border-slate-100">
                {expenses.map((e) => {
                  const fp = e.rentalId && FREIGHT_CATEGORIES.includes(e.category) && !shownFreight.has(e.rentalId) ? freightByRental.get(e.rentalId) : undefined;
                  if (fp) shownFreight.add(e.rentalId!);
                  return (
                    <ExpenseItem
                      key={e.id}
                      expense={e}
                      actions={<ExpenseRowActions expense={e} rentals={rentalOptions} todayISO={today} />}
                      extra={
                        fp && (
                          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-0.5 rounded-[10px] bg-slate-50 px-2.5 py-1.5 text-xs text-slate-500 ring-1 ring-slate-200/70 ring-inset">
                            <span className="font-medium text-slate-600">Lucro do frete</span>
                            <span className={`font-bold tnum ${fp.profit >= 0 ? "text-emerald-700" : "text-red-700"}`}>{money(fp.profit)}</span>
                            <span className="tnum">
                              cobrado {money(fp.charged)} − frete {money(fp.spent)}
                            </span>
                          </div>
                        )
                      }
                    />
                  );
                })}
              </ul>
            ) : (
              <EmptyState
                icon={Receipt}
                title="Nenhuma despesa neste mês"
                action={<NewExpenseButton rentals={rentalOptions} todayISO={today} className="btn-primary" />}
              >
                Registre fretes, combustível, manutenção e compras de material.
              </EmptyState>
            )}
          </Panel>

          <div className="space-y-4">
          <Panel title="Pagamentos recebidos" icon={Wallet} count={payments.length}>
            {payments.length ? (
              <ul className="divide-y divide-slate-100 border-t border-slate-100">
                {payments.map((p) => (
                  <li key={p.id}>
                    <Link href={`/locacoes/${p.rentalId}`} className="tap flex min-h-16 items-center gap-3 px-4 py-3 hover:bg-slate-50 active:bg-slate-100 sm:px-5">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600" aria-hidden>
                        <ArrowDownLeft className="size-[18px]" strokeWidth={2} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-slate-900">{p.rental.customer.name}</span>
                        <span className="block truncate text-xs text-slate-500">
                          <span className="tnum">{fmtDate(p.date)}</span> · {rentalCode(p.rental.number)}
                          {p.method ? ` · ${p.method}` : ""}
                        </span>
                      </span>
                      <span className="shrink-0 text-sm font-bold whitespace-nowrap text-emerald-700 tnum">+ {money(Number(p.amount))}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon={Wallet} title="Nenhum pagamento neste mês">
                Os pagamentos são registrados na tela de cada locação.
              </EmptyState>
            )}
          </Panel>

          <Panel title="A receber por cliente" icon={HandCoins} count={groups.length}>
            {groups.length ? (
              <ul className="divide-y divide-slate-100 border-t border-slate-100">
                {groups.map((g) => (
                  <li key={g.id} className="px-4 py-3.5 sm:px-5">
                    <div className="flex items-center gap-3">
                      <Avatar name={g.name} />
                      <Link href={`/clientes/${g.id}`} className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900 hover:underline">
                        {g.name}
                      </Link>
                      <span className="shrink-0 text-sm font-bold whitespace-nowrap text-red-700 tnum">{money(g.total)}</span>
                    </div>
                    <ul className="mt-2 space-y-1 pl-[52px]">
                      {g.rentals.map((r) => {
                        const ps = paymentStatus(r.stage, r.calc);
                        return (
                          <li key={r.id}>
                            <Link
                              href={`/locacoes/${r.id}`}
                              className="-mx-2 flex min-h-9 items-center justify-between gap-3 rounded-lg px-2 text-xs text-slate-600 hover:bg-slate-50"
                            >
                              <span className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5">
                                <span className="tnum">
                                  {rentalCode(r.number)} · {fmtDate(r.startDate)}
                                </span>
                                <Badge tone={ps.tone}>{ps.label}</Badge>
                              </span>
                              <span className="shrink-0 font-medium tnum">{money(r.calc.open)}</span>
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
          </Panel>

          <Panel title="Taxas de entrega e extras" icon={Truck} count={charged.length}>
            {charged.length ? (
              <ul className="divide-y divide-slate-100 border-t border-slate-100">
                {charged.map((x) => (
                  <li key={x.id}>
                    <Link href={`/locacoes/${x.rental.id}`} className="tap flex min-h-16 items-center gap-3 px-4 py-3 hover:bg-slate-50 active:bg-slate-100 sm:px-5">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600" aria-hidden>
                        <Tag className="size-[18px]" strokeWidth={1.9} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-slate-900">{x.description}</span>
                        <span className="block truncate text-xs text-slate-500">
                          {rentalCode(x.rental.number)} · {x.rental.customer.name} · <span className="tnum">{fmtDate(x.rental.startDate)}</span>
                        </span>
                      </span>
                      <span className="shrink-0 text-sm font-bold whitespace-nowrap text-brand-700 tnum">{money(x.amount)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="border-t border-slate-100 px-5 py-6 text-center text-sm text-slate-500">Nenhuma taxa cobrada nas locações iniciadas neste mês.</p>
            )}
            <dl className="space-y-1.5 border-t border-slate-100 bg-slate-50/70 px-5 py-4 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-slate-600">Cobrado (locações iniciadas no mês)</dt>
                <dd className="font-semibold whitespace-nowrap text-slate-900 tnum">{money(chargedTotal)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-600">Gasto com frete (entrega + retirada)</dt>
                <dd className="font-semibold whitespace-nowrap text-red-700 tnum">− {money(freightSpent)}</dd>
              </div>
              <div className="flex justify-between gap-3 border-t border-slate-200 pt-2">
                <dt className="font-semibold text-slate-900">Cobrado − gasto</dt>
                <dd className={`font-bold whitespace-nowrap tnum ${freightDiff >= 0 ? "text-emerald-700" : "text-red-700"}`}>{money(freightDiff)}</dd>
              </div>
            </dl>
          </Panel>
          </div>
        </div>
      </HeroOverlap>
    </>
  );
}
