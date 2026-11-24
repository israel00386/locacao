import Link from "next/link";
import { Empty, PageHeader, Section, Stat } from "@/components/ui";
import { RentalCard } from "@/components/rental-card";
import { diffDays, fmtDate, today } from "@/lib/dates";
import { money } from "@/lib/format";
import { getStock, listRentals } from "@/lib/rentals";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function PainelPage() {
  const [session, active, quotes, closedOpen, stock] = await Promise.all([
    getSession(),
    listRentals({ stage: "ATIVA" }),
    listRentals({ stage: "ORCAMENTO" }),
    listRentals({ stage: "ENCERRADA" }),
    getStock(),
  ]);
  const now = today();
  const onSite = active.filter((r) => r.calc.outstandingQty > 0);
  const overdue = onSite.filter((r) => r.calc.overdue);
  const dueSoon = onSite.filter((r) => {
    // Próxima previsão entre os itens na obra (acréscimos têm a própria).
    if (!r.calc.nextExpectedEnd || r.calc.overdue) return false;
    const d = diffDays(now, r.calc.nextExpectedEnd);
    return d >= 0 && d <= 3;
  });
  const returnedNotClosed = active.filter((r) => r.calc.allReturned);
  const receivable = [...active, ...closedOpen].reduce((s, r) => s + Math.max(0, r.calc.open), 0);
  const lacking = stock.filter((s) => s.availableQty <= 0 && s.totalQty > 0);

  return (
    <>
      <PageHeader title={`Olá${session?.name ? `, ${session.name.split(" ")[0]}` : ""}`} subtitle={fmtDate(now)} />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Locações na obra" value={onSite.length} />
        <Stat label="Atrasadas" value={overdue.length} tone={overdue.length ? "red" : undefined} />
        <Stat label="Devolvem em até 3 dias" value={dueSoon.length} />
        <Stat label="A receber" value={money(receivable)} tone={receivable > 0 ? "red" : "green"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section
          title={`Atrasadas (${overdue.length})`}
          actions={<Link href="/locacoes?aba=atrasadas" className="text-xs font-medium text-brand-700">ver todas</Link>}
        >
          {overdue.length ? (
            <div className="divide-y divide-slate-100">{overdue.slice(0, 6).map((r) => <RentalCard key={r.id} r={r} />)}</div>
          ) : (
            <p className="px-4 py-6 text-center text-sm text-slate-500">Nenhuma locação atrasada.</p>
          )}
        </Section>

        <Section title={`Devolução prevista para os próximos dias (${dueSoon.length})`}>
          {dueSoon.length ? (
            <div className="divide-y divide-slate-100">{dueSoon.map((r) => <RentalCard key={r.id} r={r} />)}</div>
          ) : (
            <p className="px-4 py-6 text-center text-sm text-slate-500">Nada previsto para os próximos 3 dias.</p>
          )}
        </Section>

        {returnedNotClosed.length > 0 && (
          <Section title={`Material devolvido, falta encerrar (${returnedNotClosed.length})`}>
            <div className="divide-y divide-slate-100">{returnedNotClosed.slice(0, 6).map((r) => <RentalCard key={r.id} r={r} />)}</div>
          </Section>
        )}

        <Section
          title={`Orçamentos aguardando (${quotes.length})`}
          actions={<Link href="/locacoes?aba=orcamentos" className="text-xs font-medium text-brand-700">ver todos</Link>}
        >
          {quotes.length ? (
            <div className="divide-y divide-slate-100">{quotes.slice(0, 5).map((r) => <RentalCard key={r.id} r={r} />)}</div>
          ) : (
            <p className="px-4 py-6 text-center text-sm text-slate-500">Nenhum orçamento em aberto.</p>
          )}
        </Section>

        {lacking.length > 0 && (
          <Section title="Sem estoque disponível" actions={<Link href="/estoque" className="text-xs font-medium text-brand-700">estoque</Link>}>
            <ul className="divide-y divide-slate-100 text-sm">
              {lacking.map((s) => (
                <li key={s.id} className="flex justify-between px-4 py-2">
                  <span>{s.name}</span>
                  <span className="tnum text-slate-500">{s.rentedQty}/{s.totalQty} na obra</span>
                </li>
              ))}
            </ul>
          </Section>
        )}
      </div>

      {active.length === 0 && quotes.length === 0 && (
        <div className="mt-4">
          <Empty>
            Ainda não há locações. <Link href="/locacoes/nova" className="font-semibold text-brand-700">Crie a primeira</Link> ou{" "}
            <Link href="/config/importar" className="font-semibold text-brand-700">importe a planilha</Link>.
          </Empty>
        </div>
      )}
    </>
  );
}
