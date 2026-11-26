"use client";
import { useMemo, useState } from "react";
import { CalendarClock } from "lucide-react";
import { onSiteValue } from "@/lib/calc";
import { addDays, fmtDate, parseISODate, weekday } from "@/lib/dates";
import { money, unitMoney } from "@/lib/format";

export interface OnSiteCalcItem {
  name: string;
  outstandingQty: number;
  unitPrice: number;
  startISO: string;
  daysOverride: number | null;
  returnedValue: number;
}

/**
 * Opcional: quanto o cliente deve pelo material que ainda está na obra, calculado sozinho até uma data
 * (hoje, a previsão ou a data em que a loja vai buscar). Não grava nada: é só a conta.
 */
export function OnSiteCalc({
  items,
  extras,
  discount,
  paid,
  todayISO,
  expectedEndISO,
}: {
  items: OnSiteCalcItem[];
  extras: number;
  discount: number;
  paid: number;
  todayISO: string;
  expectedEndISO: string;
}) {
  const [on, setOn] = useState(false);
  const [until, setUntil] = useState(todayISO);
  const today = parseISODate(todayISO)!;
  const shortcuts = [
    { label: "Hoje", iso: todayISO },
    ...(expectedEndISO && expectedEndISO !== todayISO ? [{ label: "Na previsão", iso: expectedEndISO }] : []),
    { label: "+7 dias", iso: addDays(today, 7).toISOString().slice(0, 10) },
    { label: "+15 dias", iso: addDays(today, 15).toISOString().slice(0, 10) },
  ];

  const result = useMemo(() => {
    const date = parseISODate(until) ?? today;
    return onSiteValue(
      items.map((i) => ({ ...i, start: parseISODate(i.startISO)! })),
      date,
      { extras, discount, paid },
    );
  }, [items, until, extras, discount, paid, today]);
  const untilDate = parseISODate(until) ?? today;

  return (
    <div className="px-4 pb-5 sm:px-5">
      <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3">
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-brand-950">Calcular o que ele deve até a busca</span>
          <span className="block text-xs text-slate-500">Opcional: soma o material na obra até a data escolhida, menos o que já foi pago.</span>
        </span>
        <input type="checkbox" className="peer sr-only" checked={on} onChange={(e) => setOn(e.target.checked)} />
        <span
          aria-hidden
          className="relative h-7 w-12 shrink-0 rounded-full bg-slate-300 transition peer-checked:bg-brand-600 peer-focus-visible:ring-2 peer-focus-visible:ring-brand-600 after:absolute after:top-1 after:left-1 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-5"
        />
      </label>

      {on && (
        <div className="mt-4 space-y-4">
          <div>
            <label className="label" htmlFor="onsite-until">
              Buscar o material em
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <input id="onsite-until" type="date" className="input w-auto min-w-[11rem] flex-none" value={until} onChange={(e) => setUntil(e.target.value || todayISO)} />
              {shortcuts.map((s) => (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => setUntil(s.iso)}
                  className={`min-h-9 rounded-full px-3 text-xs font-semibold transition ${until === s.iso ? "bg-brand-900 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
              <CalendarClock className="size-3.5" aria-hidden /> {weekday(untilDate)}, {fmtDate(untilDate)} — conta o dia da retirada e o dia da busca.
            </p>
          </div>

          <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200/70">
            {result.lines.map((l) => (
              <li key={l.name + l.qty} className="flex items-start justify-between gap-3 px-4 py-2.5">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-slate-900">{l.name}</span>
                  <span className="tnum block text-xs text-slate-500">
                    {l.qty} un. × {unitMoney(l.unitPrice)}/dia × {l.days} {l.days === 1 ? "dia" : "dias"}
                  </span>
                </span>
                <span className="tnum shrink-0 text-sm font-bold text-slate-900">{money(l.value)}</span>
              </li>
            ))}
          </ul>

          <dl className="tnum space-y-1.5 text-sm">
            <Row label="Material na obra" value={money(result.onSiteTotal)} />
            {result.returnedTotal > 0 && <Row label="Já devolvido (cobrado)" value={money(result.returnedTotal)} />}
            {extras !== 0 && <Row label="Taxas e extras" value={money(extras)} />}
            {discount > 0 && <Row label="Desconto" value={`− ${money(discount)}`} />}
            <Row label="Total da locação" value={money(result.total)} strong />
            {result.paid > 0 && <Row label="Já pago" value={`− ${money(result.paid)}`} />}
          </dl>
          <div className={`flex items-center justify-between gap-3 rounded-2xl px-4 py-3 ${result.open > 0.009 ? "bg-red-50 text-red-800" : "bg-emerald-50 text-emerald-800"}`}>
            <span className="text-sm font-semibold">{result.open > 0.009 ? "Falta pagar" : "Quitado"}</span>
            <span className="tnum text-xl font-bold">{money(Math.max(0, result.open))}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 ${strong ? "border-t border-slate-200 pt-1.5 font-bold text-brand-950" : "text-slate-600"}`}>
      <dt>{label}</dt>
      <dd className={strong ? "" : "text-slate-900"}>{value}</dd>
    </div>
  );
}
