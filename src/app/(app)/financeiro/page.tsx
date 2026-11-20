import Link from "next/link";
import { PageHeader, Section, Stat } from "@/components/ui";
import { db } from "@/lib/db";
import { fmtDate, todayISO } from "@/lib/dates";
import { money, rentalCode } from "@/lib/format";
import { listRentals } from "@/lib/rentals";

export const metadata = { title: "Financeiro" };

const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

export default async function FinanceiroPage({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const sp = await searchParams;
  const month = /^\d{4}-\d{2}$/.test(sp.mes ?? "") ? sp.mes! : todayISO().slice(0, 7);
  const [y, m] = month.split("-").map(Number);
  const from = new Date(Date.UTC(y, m - 1, 1));
  const to = new Date(Date.UTC(y, m, 1));
  const prev = `${m === 1 ? y - 1 : y}-${String(m === 1 ? 12 : m - 1).padStart(2, "0")}`;
  const next = `${m === 12 ? y + 1 : y}-${String(m === 12 ? 1 : m + 1).padStart(2, "0")}`;

  const [rentals, payments] = await Promise.all([
    listRentals({ stage: { in: ["ATIVA", "ENCERRADA"] } }),
    db.payment.findMany({
      where: { date: { gte: from, lt: to } },
      include: { rental: { include: { customer: true } } },
      orderBy: { date: "desc" },
    }),
  ]);

  const receivable = rentals.filter((r) => r.calc.open > 0.009);
  const totalOpen = receivable.reduce((s, r) => s + r.calc.open, 0);
  const overdueOpen = receivable.filter((r) => r.calc.overdue || r.stage === "ENCERRADA" || r.calc.allReturned).reduce((s, r) => s + r.calc.open, 0);
  const received = payments.reduce((s, p) => s + Number(p.amount), 0);
  const startedInMonth = rentals.filter((r) => r.startDate >= from && r.startDate < to);
  const billed = startedInMonth.reduce((s, r) => s + r.calc.total, 0);

  // A receber agrupado por cliente
  const byCustomer = new Map<string, { id: string; name: string; total: number; rentals: typeof receivable }>();
  for (const r of receivable) {
    const g = byCustomer.get(r.customerId) ?? { id: r.customerId, name: r.customer.name, total: 0, rentals: [] };
    g.total += r.calc.open;
    g.rentals.push(r);
    byCustomer.set(r.customerId, g);
  }
  const groups = [...byCustomer.values()].sort((a, b) => b.total - a.total);

  return (
    <>
      <PageHeader title="Financeiro" />
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Total a receber" value={money(totalOpen)} tone={totalOpen > 0 ? "red" : "green"} hint={`${receivable.length} locações`} />
        <Stat label="Já devolvido e não pago" value={money(overdueOpen)} hint="cobrar primeiro" tone={overdueOpen > 0 ? "red" : undefined} />
        <Stat label={`Recebido em ${MONTHS[m - 1]}`} value={money(received)} tone="green" hint={`${payments.length} pagamentos`} />
        <Stat label={`Locado em ${MONTHS[m - 1]}`} value={money(billed)} hint={`${startedInMonth.length} locações iniciadas`} />
      </div>

      <div className="mb-3 flex items-center justify-center gap-3 text-sm">
        <Link href={`/financeiro?mes=${prev}`} className="btn-ghost btn-sm">← anterior</Link>
        <span className="font-semibold capitalize">{MONTHS[m - 1]} de {y}</span>
        <Link href={`/financeiro?mes=${next}`} className="btn-ghost btn-sm">próximo →</Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="A receber por cliente">
          {groups.length ? (
            <ul className="divide-y divide-slate-100">
              {groups.map((g) => (
                <li key={g.id} className="px-4 py-3">
                  <div className="flex justify-between gap-3">
                    <Link href={`/clientes/${g.id}`} className="truncate text-sm font-semibold hover:underline">{g.name}</Link>
                    <span className="text-sm font-bold text-red-700 tnum">{money(g.total)}</span>
                  </div>
                  <ul className="mt-1 space-y-0.5">
                    {g.rentals.map((r) => (
                      <li key={r.id}>
                        <Link href={`/locacoes/${r.id}`} className="flex justify-between gap-3 text-xs text-slate-600 hover:underline">
                          <span className="truncate">
                            {rentalCode(r.number)} · {fmtDate(r.startDate)} · {r.stage === "ENCERRADA" ? "encerrada" : r.calc.allReturned ? "devolvida" : r.calc.overdue ? "atrasada" : "na obra"}
                          </span>
                          <span className="tnum">{money(r.calc.open)}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-4 py-6 text-center text-sm text-slate-500">Nada a receber. 🎉</p>
          )}
        </Section>

        <Section title={`Pagamentos de ${MONTHS[m - 1]}`}>
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
