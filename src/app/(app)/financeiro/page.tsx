import Link from "next/link";
import { ExpenseItem } from "@/components/expense-list";
import { ExpenseRowActions, NewExpenseButton } from "@/components/expense-sheet";
import { Badge, PageHeader, Section, Stat } from "@/components/ui";
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
  const { month, y, from, to, prev, next, name } = parseMonth(sp.mes);

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
  const maxCategory = Math.max(1, ...byCategory.map((c) => c.total));
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

  return (
    <>
      <PageHeader
        title="Financeiro"
        actions={
          <>
            <a href={`/financeiro/csv?mes=${month}`} className="btn-secondary btn-sm" download>
              Exportar CSV
            </a>
            <NewExpenseButton rentals={rentalOptions} todayISO={today} />
          </>
        }
      />

      <div className="mb-3 flex items-center justify-center gap-3 text-sm">
        <Link href={`/financeiro?mes=${prev}`} className="btn-ghost btn-sm">← anterior</Link>
        <span className="font-semibold">{name[0].toUpperCase() + name.slice(1)} de {y}</span>
        <Link href={`/financeiro?mes=${next}`} className="btn-ghost btn-sm">próximo →</Link>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Stat label={`Recebido em ${name}`} value={money(received)} amount={received} format="money" tone="green" hint={`${payments.length} pagamento${payments.length === 1 ? "" : "s"}`} />
        <Stat label={`Despesas de ${name}`} value={money(spent)} amount={spent} format="money" tone={spent > 0 ? "red" : undefined} hint={`${expenses.length} despesa${expenses.length === 1 ? "" : "s"}`} />
        <Stat label="Saldo do mês" value={money(balance)} amount={balance} format="money" tone={balance > 0 ? "green" : balance < 0 ? "red" : undefined} hint="recebido − despesas" />
        <Stat label="Total a receber" value={money(totalOpen)} amount={totalOpen} format="money" tone={totalOpen > 0 ? "red" : "green"} hint={`${receivable.length} locações`} />
        <Stat label="Já devolvido e não pago" value={money(overdueOpen)} amount={overdueOpen} format="money" hint="cobrar primeiro" tone={overdueOpen > 0 ? "red" : undefined} />
        <Stat label={`Locado em ${name}`} value={money(billed)} amount={billed} format="money" hint={`${startedInMonth.length} locações iniciadas`} />
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Section title={`Despesas de ${name}`} actions={<NewExpenseButton rentals={rentalOptions} todayISO={today} className="btn-secondary btn-sm" />}>
          {byCategory.length > 0 && (
            <div className="space-y-2 border-b border-slate-100 px-4 py-3">
              {byCategory.map((c) => (
                <div key={c.value} className="text-xs">
                  <div className="mb-0.5 flex justify-between gap-3">
                    <span className="font-medium text-slate-700">
                      {c.label} <span className="font-normal text-slate-400">({c.count})</span>
                    </span>
                    <span className="font-semibold tnum">{money(c.total)}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className={`h-full rounded-full ${c.color}`} style={{ width: `${Math.max(2, (c.total / maxCategory) * 100)}%` }} />
                  </div>
                </div>
              ))}
              <div className="flex justify-between gap-3 pt-1 text-sm">
                <span className="font-semibold">Total</span>
                <span className="font-bold text-red-700 tnum">{money(spent)}</span>
              </div>
            </div>
          )}
          {expenses.length ? (
            <ul className="divide-y divide-slate-100">
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
                        <div className="mt-1 text-xs text-slate-500">
                          Lucro do frete:{" "}
                          <span className={`font-semibold tnum ${fp.profit >= 0 ? "text-brand-700" : "text-red-700"}`}>{money(fp.profit)}</span>{" "}
                          <span className="tnum">(cobrado {money(fp.charged)} − frete {money(fp.spent)})</span>
                        </div>
                      )
                    }
                  />
                );
              })}
            </ul>
          ) : (
            <p className="px-4 py-6 text-center text-sm text-slate-500">Nenhuma despesa neste mês.</p>
          )}
        </Section>

        <Section title="Taxas de entrega/extras cobradas">
          {charged.length ? (
            <ul className="divide-y divide-slate-100 text-sm">
              {charged.map((x) => (
                <li key={x.id}>
                  <Link href={`/locacoes/${x.rental.id}`} className="flex justify-between gap-3 px-4 py-2 hover:bg-slate-50">
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{x.description}</span>
                      <span className="block truncate text-xs text-slate-500">
                        {rentalCode(x.rental.number)} · {x.rental.customer.name} · {fmtDate(x.rental.startDate)}
                      </span>
                    </span>
                    <span className="font-semibold text-brand-700 tnum">{money(x.amount)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-4 py-6 text-center text-sm text-slate-500">Nenhuma taxa cobrada nas locações iniciadas neste mês.</p>
          )}
          <div className="space-y-1 border-t border-slate-100 bg-slate-50/60 px-4 py-3 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-slate-600">Cobrado (locações iniciadas no mês)</span>
              <span className="whitespace-nowrap font-semibold text-brand-700 tnum">{money(chargedTotal)}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-slate-600">Gasto com frete (entrega + retirada)</span>
              <span className="whitespace-nowrap font-semibold text-red-700 tnum">− {money(freightSpent)}</span>
            </div>
            <div className="flex justify-between gap-3 border-t border-slate-200 pt-1">
              <span className="font-semibold">Cobrado − gasto</span>
              <span className={`whitespace-nowrap font-bold tnum ${freightDiff >= 0 ? "text-brand-700" : "text-red-700"}`}>{money(freightDiff)}</span>
            </div>
          </div>
        </Section>

        <Section title="A receber por cliente">
          {groups.length ? (
            <ul className="divide-y divide-slate-100">
              {groups.map((g) => (
                <li key={g.id} className="px-4 py-3">
                  <div className="flex justify-between gap-3">
                    <Link href={`/clientes/${g.id}`} className="truncate text-sm font-semibold hover:underline">{g.name}</Link>
                    <span className="text-sm font-bold text-red-700 tnum">{money(g.total)}</span>
                  </div>
                  <ul className="mt-1 space-y-1">
                    {g.rentals.map((r) => {
                      const ps = paymentStatus(r.stage, r.calc);
                      return (
                        <li key={r.id}>
                          <Link href={`/locacoes/${r.id}`} className="flex items-center justify-between gap-3 text-xs text-slate-600 hover:underline">
                            <span className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5">
                              <span>{rentalCode(r.number)} · {fmtDate(r.startDate)}</span>
                              <Badge tone={ps.tone}>{ps.label}</Badge>
                            </span>
                            <span className="tnum">{money(r.calc.open)}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-4 py-6 text-center text-sm text-slate-500">Nada a receber. 🎉</p>
          )}
        </Section>

        <Section title={`Pagamentos de ${name}`}>
          {payments.length ? (
            <ul className="divide-y divide-slate-100 text-sm">
              {payments.map((p) => (
                <li key={p.id}>
                  <Link href={`/locacoes/${p.rentalId}`} className="flex justify-between gap-3 px-4 py-2 hover:bg-slate-50">
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{p.rental.customer.name}</span>
                      <span className="block text-xs text-slate-500">
                        {fmtDate(p.date)} · {rentalCode(p.rental.number)}{p.method ? ` · ${p.method}` : ""}
                      </span>
                    </span>
                    <span className="font-semibold text-brand-700 tnum">{money(Number(p.amount))}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-4 py-6 text-center text-sm text-slate-500">Nenhum pagamento neste mês.</p>
          )}
        </Section>
      </div>
    </>
  );
}
