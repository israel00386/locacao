import type { RentalCalc } from "@/lib/calc";
import { fmtDate } from "@/lib/dates";
import { money } from "@/lib/format";

export function PeriodHistory({ periods }: { periods: RentalCalc["periods"] }) {
  if (!periods.length) return null;
  return <section className="my-5 space-y-3" aria-label="Histórico dos períodos">
    <h2 className="text-base font-semibold">Períodos e cobranças</h2>
    <p className="text-xs text-slate-600">Valores contratados preservados. Pagamentos abatem os períodos mais antigos primeiro.</p>
    {periods.map((p) => <article key={p.id} className="avoid-break rounded-xl border border-slate-200 p-3 text-sm">
      <div className="flex flex-wrap justify-between gap-2 font-semibold">
        <span>{p.sequence === 1 ? "Período inicial" : `Renovação ${p.sequence - 1}`} · {fmtDate(p.startDate)} a {fmtDate(p.endDate)}</span>
        <span className={p.overdue ? "text-red-700" : "text-slate-700"}>{p.open <= 0.009 ? "Pago" : p.overdue ? "Atrasado" : "A vencer"}</span>
      </div>
      <p className="mt-1">Vencimento: {fmtDate(p.dueDate)} · Contratado: {money(p.amount)}</p>
      {p.total > p.amount && <p>Dias excedentes: {money(p.total - p.amount)}</p>}
      <p>Pago: {money(p.paid)} · Saldo: {money(p.open)}</p>
      <ul className="mt-2 text-xs text-slate-600">{p.items.map((i) => <li key={i.itemId}>{i.qty} × {i.name}</li>)}</ul>
    </article>)}
  </section>;
}
