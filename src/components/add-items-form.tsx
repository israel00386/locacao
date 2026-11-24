"use client";
import { useEffect, useMemo, useState, useTransition } from "react";
import { priceFor, suggestPeriod, suggestUnitPrice } from "@/lib/calc";
import { addDays, inclusiveDays, parseISODate, toISODate, weekday } from "@/lib/dates";
import { money, parseMoney, PERIODS, unitMoney, type Period } from "@/lib/format";
import type { ActionResult, AdditionPayload } from "@/app/(app)/locacoes/actions";
import type { EquipmentOption } from "./rental-form";

interface Row {
  equipmentId: string;
  qty: number;
  unitPrice: string;
  period: Period;
  auto: boolean;
  priceSource?: string;
}

const fmtNum = (n: number) => String(n).replace(".", ",");

/**
 * Acréscimo de equipamento numa locação ativa: retirada e previsão próprias.
 * No celular abre como folha inferior ocupando quase toda a tela.
 */
export function AddItemsButton({
  action,
  equipment,
  customerPrices,
  todayISO,
  rentalStartISO,
  rentalEndISO,
}: {
  action: (payload: AdditionPayload) => Promise<ActionResult>;
  equipment: EquipmentOption[];
  customerPrices: Record<string, number>;
  todayISO: string;
  rentalStartISO: string;
  rentalEndISO: string;
}) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  return (
    <>
      <button type="button" className="btn-secondary" onClick={() => { setDone(false); setOpen(true); }}>
        + Acréscimo de equipamento
      </button>
      {done && <span className="basis-full text-sm text-brand-700">Acréscimo registrado. O material saiu do estoque.</span>}
      {open && (
        <AddItemsSheet
          action={action}
          equipment={equipment}
          customerPrices={customerPrices}
          todayISO={todayISO}
          rentalStartISO={rentalStartISO}
          rentalEndISO={rentalEndISO}
          onClose={() => setOpen(false)}
          onDone={() => {
            setOpen(false);
            setDone(true);
          }}
        />
      )}
    </>
  );
}

function AddItemsSheet({
  action,
  equipment,
  customerPrices,
  todayISO,
  rentalStartISO,
  rentalEndISO,
  onClose,
  onDone,
}: {
  action: (payload: AdditionPayload) => Promise<ActionResult>;
  equipment: EquipmentOption[];
  customerPrices: Record<string, number>;
  todayISO: string;
  rentalStartISO: string;
  rentalEndISO: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const eqById = useMemo(() => new Map(equipment.map((e) => [e.id, e])), [equipment]);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(todayISO < rentalStartISO ? rentalStartISO : todayISO);
  const [endDate, setEndDate] = useState(rentalEndISO && rentalEndISO >= startDate ? rentalEndISO : "");
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");

  const start = parseISODate(startDate);
  const end = parseISODate(endDate);
  const days = start && end && end >= start ? inclusiveDays(start, end) : start && !end ? 1 : 0;

  // Fecha com "voltar" do teclado / Esc e trava a rolagem da página por trás.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  function autoPrice(eqId: string, d: number) {
    const period = suggestPeriod(d || 1);
    const sug = suggestUnitPrice(eqById.get(eqId), customerPrices[eqId], period);
    return { period, unitPrice: sug.unitPrice != null ? fmtNum(sug.unitPrice) : "", priceSource: sug.source };
  }

  function onDatesChange(nextStart: string, nextEnd: string) {
    setStartDate(nextStart);
    setEndDate(nextEnd);
    const s = parseISODate(nextStart);
    const e = parseISODate(nextEnd);
    const d = s && e && e >= s ? inclusiveDays(s, e) : 1;
    setRows((l) => l.map((r) => (r.auto ? { ...r, ...autoPrice(r.equipmentId, d) } : r)));
  }

  function add(eqId: string) {
    setRows((l) => {
      const existing = l.find((r) => r.equipmentId === eqId);
      if (existing) return l.map((r) => (r === existing ? { ...r, qty: r.qty + 1 } : r));
      return [...l, { equipmentId: eqId, qty: 1, auto: true, ...autoPrice(eqId, days) }];
    });
  }

  const update = (eqId: string, patch: Partial<Row>) => setRows((l) => l.map((r) => (r.equipmentId === eqId ? { ...r, ...patch } : r)));
  const lineTotal = (r: Row) => r.qty * parseMoney(r.unitPrice) * (days || 1);
  const total = rows.reduce((s, r) => s + lineTotal(r), 0);
  const overStock = rows.some((r) => r.qty > (eqById.get(r.equipmentId)?.availableQty ?? 0));

  const list = equipment.filter((e) => e.name.toLowerCase().includes(q.trim().toLowerCase()));

  function submit() {
    setError(null);
    if (!rows.length) return setError("Escolha pelo menos um equipamento.");
    if (!startDate) return setError("Informe a data de retirada.");
    if (rows.some((r) => !r.unitPrice)) return setError("Informe o valor por dia de todos os equipamentos.");
    startTransition(async () => {
      const res = await action({
        startDate,
        expectedEndDate: endDate || undefined,
        items: rows.map((r) => ({ equipmentId: r.equipmentId, qty: r.qty, unitPrice: parseMoney(r.unitPrice), period: r.period })),
      });
      if (res?.error) setError(res.error);
      else onDone();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-items-title"
        className="flex h-[94dvh] w-full max-w-lg flex-col rounded-t-3xl bg-white pb-[env(safe-area-inset-bottom)] shadow-xl sm:h-auto sm:max-h-[90dvh] sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
          <div>
            <h2 id="add-items-title" className="text-base font-bold">Acréscimo de equipamento</h2>
            <p className="text-xs text-slate-500">Datas próprias; cada acréscimo é devolvido separadamente.</p>
          </div>
          <button type="button" className="btn-ghost px-3" aria-label="Fechar" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {/* DATAS */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="add-start">Retirada</label>
                <input
                  id="add-start"
                  type="date"
                  className="input"
                  value={startDate}
                  min={rentalStartISO}
                  onChange={(e) => onDatesChange(e.target.value, endDate)}
                />
                {start && <p className="mt-1 text-xs text-slate-500">{weekday(start)}</p>}
              </div>
              <div>
                <label className="label" htmlFor="add-end">Previsão de devolução</label>
                <input
                  id="add-end"
                  type="date"
                  className="input"
                  value={endDate}
                  min={startDate}
                  onChange={(e) => onDatesChange(startDate, e.target.value)}
                />
                {end && <p className="mt-1 text-xs text-slate-500">{weekday(end)}</p>}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-slate-500">Prazo:</span>
              {[1, 7, 15, 30].map((d) => (
                <button
                  key={d}
                  type="button"
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${days === d && end ? "bg-brand-600 text-white ring-brand-600" : "bg-white ring-slate-300"}`}
                  onClick={() => start && onDatesChange(startDate, toISODate(addDays(start, d - 1)))}
                >
                  {d === 1 ? "1 dia" : `${d} dias`}
                </button>
              ))}
              {days > 0 && end && <span className="ml-auto text-sm font-semibold tnum">{days} {days === 1 ? "dia" : "dias"}</span>}
            </div>
          </div>

          {/* ESCOLHIDOS */}
          {rows.length > 0 && (
            <ul className="divide-y divide-slate-100 rounded-2xl ring-1 ring-slate-200">
              {rows.map((r) => {
                const eq = eqById.get(r.equipmentId);
                const avail = eq?.availableQty ?? 0;
                const over = r.qty > avail;
                return (
                  <li key={r.equipmentId} className="space-y-2 px-3 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold">{eq?.name ?? "?"}</div>
                        <div className={`text-xs ${over ? "font-medium text-red-700" : "text-slate-500"}`}>
                          {avail} disponíveis{over ? " — acima do estoque" : ""}
                        </div>
                      </div>
                      <div className="text-right text-sm font-semibold tnum">{money(lineTotal(r))}</div>
                    </div>
                    <div className="grid grid-cols-[auto_1fr_1fr] items-end gap-2">
                      <div>
                        <div className="label">Qtd.</div>
                        <div className="flex items-center rounded-xl ring-1 ring-slate-300">
                          <button
                            type="button"
                            className="px-3 py-2 text-lg leading-none"
                            aria-label="Diminuir"
                            onClick={() => (r.qty <= 1 ? setRows((l) => l.filter((x) => x !== r)) : update(r.equipmentId, { qty: r.qty - 1 }))}
                          >
                            −
                          </button>
                          <input
                            className="w-12 border-0 bg-transparent p-0 text-center text-base outline-none tnum"
                            inputMode="numeric"
                            value={r.qty}
                            aria-label={`Quantidade de ${eq?.name}`}
                            onChange={(e) => update(r.equipmentId, { qty: Math.max(0, Number(e.target.value.replace(/\D/g, "")) || 0) })}
                            onBlur={() => update(r.equipmentId, { qty: Math.max(1, r.qty) })}
                          />
                          <button type="button" className="px-3 py-2 text-lg leading-none" aria-label="Aumentar" onClick={() => update(r.equipmentId, { qty: r.qty + 1 })}>
                            +
                          </button>
                        </div>
                      </div>
                      <div>
                        <div className="label">Período</div>
                        <select
                          className="input"
                          value={r.period}
                          onChange={(e) => {
                            const period = e.target.value as Period;
                            const price = eq ? priceFor(eq, period) : null;
                            update(r.equipmentId, { period, auto: false, ...(price != null ? { unitPrice: fmtNum(price), priceSource: "tabela de preços" } : {}) });
                          }}
                        >
                          {PERIODS.map((p) => (
                            <option key={p.value} value={p.value}>{p.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <div className="label">R$ un./dia</div>
                        <input
                          className="input tnum"
                          inputMode="decimal"
                          value={r.unitPrice}
                          placeholder="0,00"
                          aria-label={`Valor por dia de ${eq?.name}`}
                          onChange={(e) => update(r.equipmentId, { unitPrice: e.target.value, auto: false, priceSource: undefined })}
                        />
                      </div>
                    </div>
                    {r.priceSource && <p className="text-[11px] text-slate-500">Valor sugerido: {r.priceSource}</p>}
                    {!r.unitPrice && <p className="text-[11px] font-medium text-amber-700">Informe o valor por dia</p>}
                  </li>
                );
              })}
            </ul>
          )}

          {/* LISTA DE EQUIPAMENTOS */}
          <div>
            <input className="input" placeholder="Buscar equipamento…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar equipamento" />
            <ul className="mt-2 divide-y divide-slate-100 rounded-2xl ring-1 ring-slate-200">
              {list.map((e) => {
                const chosen = rows.find((r) => r.equipmentId === e.id)?.qty ?? 0;
                const price = e.priceDaily ?? e.priceWeekly ?? e.priceBiweekly ?? e.priceMonthly;
                const none = e.availableQty <= 0;
                return (
                  <li key={e.id}>
                    <button
                      type="button"
                      disabled={none}
                      className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left active:bg-slate-50 disabled:opacity-50"
                      onClick={() => add(e.id)}
                    >
                      <span className="min-w-0">
                        <span className="block text-sm font-medium">{e.name}</span>
                        <span className={`block text-xs ${none ? "text-red-700" : "text-slate-500"}`}>
                          {none ? "sem estoque" : `${e.availableQty} disponíveis`}
                          {price != null ? ` · ${unitMoney(price)}/dia` : ""}
                        </span>
                      </span>
                      {chosen > 0 ? (
                        <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-brand-600 px-2 text-xs font-bold text-white">{chosen}</span>
                      ) : (
                        <span className="text-xl text-brand-600">+</span>
                      )}
                    </button>
                  </li>
                );
              })}
              {list.length === 0 && <li className="p-6 text-center text-sm text-slate-500">Nenhum equipamento encontrado.</li>}
            </ul>
          </div>
        </div>

        <div className="space-y-2 border-t border-slate-100 p-4">
          <div className="flex items-baseline justify-between text-sm">
            <span className="text-slate-500">
              {rows.reduce((s, r) => s + r.qty, 0)} un. · {days || 1} {days === 1 || !days ? "dia" : "dias"}
            </span>
            <span className="text-lg font-bold tnum">{money(total)}</span>
          </div>
          {overStock && <p className="text-xs text-red-700">Há quantidade acima do disponível no estoque.</p>}
          {error && <p className="text-sm text-red-700">{error}</p>}
          <button type="button" className="btn-primary w-full" disabled={pending || !rows.length} onClick={submit}>
            {pending ? "Salvando…" : "Adicionar à locação"}
          </button>
        </div>
      </div>
    </div>
  );
}
