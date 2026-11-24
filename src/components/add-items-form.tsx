"use client";
import { useEffect, useMemo, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { Check, Loader2, Minus, Package, PackagePlus, Plus, Search, Sparkles, Trash2, X } from "lucide-react";
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
const OPEN_EVENT = "locar:acrescimo";

/** Tile/atalho que abre a folha de acréscimo (o AddItemsButton da página escuta o evento). */
export function AddItemsTile({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <button type="button" className={className} onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))}>
      {children}
    </button>
  );
}

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
  useEffect(() => {
    const onOpen = () => {
      setDone(false);
      setOpen(true);
    };
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, []);
  return (
    <>
      <button type="button" className="btn-secondary rounded-full px-4" onClick={() => { setDone(false); setOpen(true); }}>
        <PackagePlus size={17} aria-hidden /> Acréscimo de equipamento
      </button>
      {done && (
        <span role="status" className="flex basis-full items-center gap-1.5 rounded-2xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          <Check size={15} aria-hidden /> Acréscimo registrado. O material saiu do estoque.
        </span>
      )}
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

  // Portal no <body>: fora de containers animados (transform), que prenderiam o position: fixed.
  return createPortal(
    <div className="fixed inset-0 z-50 transition-opacity duration-200 starting:opacity-0 flex items-end justify-center bg-brand-950/45 sm:items-center sm:p-6" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-items-title"
        className="flex translate-y-0 transition-[translate,opacity] duration-300 ease-out starting:translate-y-10 starting:opacity-0 motion-reduce:transition-none h-[94dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[32px] bg-[#f6f7fb] pb-[env(safe-area-inset-bottom)] shadow-2xl sm:h-auto sm:max-h-[90dvh] sm:rounded-[32px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-slate-300/80 sm:hidden" aria-hidden />
        <div className="flex items-start gap-3 px-5 pt-3 pb-3 sm:pt-5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-100 to-orange-50 text-amber-700" aria-hidden>
            <PackagePlus size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="add-items-title" className="text-lg leading-tight font-bold tracking-[-0.01em] text-slate-900">Acréscimo de equipamento</h2>
            <p className="mt-0.5 text-xs text-slate-500">Datas próprias; cada acréscimo é devolvido separadamente.</p>
          </div>
          <button type="button" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-slate-600 shadow-[0_2px_8px_-4px_rgb(15_18_63/.3)] hover:text-slate-900 active:scale-95" aria-label="Fechar" onClick={onClose}>
            <X size={20} aria-hidden />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-4 pt-1 pb-4 sm:px-5">
          {/* DATAS */}
          <div className="space-y-3 rounded-[24px] bg-white p-4 shadow-[0_1px_2px_rgb(15_18_63/.04)]">
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
            <div className="flex items-center gap-2">
              <div className="grid flex-1 grid-cols-4 gap-1 rounded-full bg-slate-100 p-1" role="group" aria-label="Prazo rápido">
                {[1, 7, 15, 30].map((d) => {
                  const on = days === d && !!end;
                  return (
                    <button
                      key={d}
                      type="button"
                      aria-pressed={on}
                      className={`min-h-10 rounded-full text-[13px] font-semibold transition-[background-color,color,box-shadow] duration-150 ${
                        on ? "bg-brand-900 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"
                      }`}
                      onClick={() => start && onDatesChange(startDate, toISODate(addDays(start, d - 1)))}
                    >
                      {d === 1 ? "1 dia" : `${d} dias`}
                    </button>
                  );
                })}
              </div>
              {days > 0 && end && (
                <span className="tnum shrink-0 rounded-full bg-brand-50 px-2.5 py-1 text-sm font-bold text-brand-700">
                  {days} {days === 1 ? "dia" : "dias"}
                </span>
              )}
            </div>
          </div>

          {/* ESCOLHIDOS */}
          {rows.length > 0 && (
            <div>
              <div className="mb-2 px-1 text-[13px] font-semibold text-brand-950">Escolhidos</div>
              <ul className="space-y-2">
                {rows.map((r) => {
                  const eq = eqById.get(r.equipmentId);
                  const avail = eq?.availableQty ?? 0;
                  const over = r.qty > avail;
                  return (
                    <li key={r.equipmentId} className="space-y-2.5 rounded-[22px] bg-white px-4 py-3.5 shadow-[0_1px_2px_rgb(15_18_63/.04)] ring-1 ring-amber-200/70 ring-inset">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-slate-900">{eq?.name ?? "?"}</div>
                          <div className={`text-xs ${over ? "font-medium text-red-700" : "text-slate-500"}`}>
                            {avail} disponíveis{over ? " — acima do estoque" : ""}
                          </div>
                        </div>
                        <div className="tnum text-right text-sm font-bold text-slate-900">{money(lineTotal(r))}</div>
                      </div>
                      <div className="grid grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)] items-end gap-2">
                        <div>
                          <div className="label">Qtd.</div>
                          <div className="flex h-12 items-center rounded-full bg-white ring-1 ring-slate-200 ring-inset sm:h-11">
                            <button
                              type="button"
                              className="flex h-full w-10 items-center justify-center rounded-l-full text-slate-600 hover:bg-slate-50"
                              aria-label="Diminuir"
                              onClick={() => (r.qty <= 1 ? setRows((l) => l.filter((x) => x !== r)) : update(r.equipmentId, { qty: r.qty - 1 }))}
                            >
                              {r.qty <= 1 ? <Trash2 size={15} className="text-red-500" aria-hidden /> : <Minus size={16} aria-hidden />}
                            </button>
                            <input
                              className="tnum w-10 border-0 bg-transparent p-0 text-center text-base font-semibold outline-none"
                              inputMode="numeric"
                              value={r.qty}
                              aria-label={`Quantidade de ${eq?.name}`}
                              onChange={(e) => update(r.equipmentId, { qty: Math.max(0, Number(e.target.value.replace(/\D/g, "")) || 0) })}
                              onBlur={() => update(r.equipmentId, { qty: Math.max(1, r.qty) })}
                            />
                            <button
                              type="button"
                              className="flex h-full w-10 items-center justify-center rounded-r-full text-slate-600 hover:bg-slate-50"
                              aria-label="Aumentar"
                              onClick={() => update(r.equipmentId, { qty: r.qty + 1 })}
                            >
                              <Plus size={16} aria-hidden />
                            </button>
                          </div>
                        </div>
                        <div>
                          <div className="label">Período</div>
                          <select
                            className="input px-2.5"
                            value={r.period}
                            aria-label={`Período de ${eq?.name}`}
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
                      {r.priceSource && (
                        <p className="flex items-center gap-1 text-[11px] text-slate-500">
                          <Sparkles size={12} className="text-accent-600" aria-hidden /> Valor sugerido: {r.priceSource}
                        </p>
                      )}
                      {!r.unitPrice && <p className="text-[11px] font-medium text-amber-700">Informe o valor por dia</p>}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* LISTA DE EQUIPAMENTOS */}
          <div>
            <div className="mb-2 px-1 text-[13px] font-semibold text-brand-950">Estoque</div>
            <div className="relative">
              <Search size={18} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-slate-400" aria-hidden />
              <input className="input rounded-full border-0 pl-11 shadow-[0_1px_2px_rgb(15_18_63/.05)]" placeholder="Buscar equipamento…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar equipamento" />
            </div>
            <ul className="mt-2 divide-y divide-slate-100 overflow-hidden rounded-[22px] bg-white shadow-[0_1px_2px_rgb(15_18_63/.04)]">
              {list.map((e) => {
                const chosen = rows.find((r) => r.equipmentId === e.id)?.qty ?? 0;
                const price = e.priceDaily ?? e.priceWeekly ?? e.priceBiweekly ?? e.priceMonthly;
                const none = e.availableQty <= 0;
                return (
                  <li key={e.id}>
                    <button
                      type="button"
                      disabled={none}
                      className="flex w-full items-center gap-3 px-3 py-3 text-left hover:bg-slate-50 active:bg-slate-100 disabled:opacity-50"
                      onClick={() => add(e.id)}
                    >
                      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${chosen > 0 ? "bg-brand-900 text-accent-300" : "bg-slate-100 text-slate-500"}`} aria-hidden>
                        <Package size={18} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-slate-900">{e.name}</span>
                        <span className={`tnum block text-xs ${none ? "text-red-700" : "text-slate-500"}`}>
                          {none ? "sem estoque" : `${e.availableQty} disponíveis`}
                          {price != null ? ` · ${unitMoney(price)}/dia` : ""}
                        </span>
                      </span>
                      {chosen > 0 ? (
                        <span className="tnum flex h-8 min-w-8 items-center justify-center rounded-full bg-accent-400 px-2 text-xs font-bold text-brand-950">{chosen}</span>
                      ) : (
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-brand-600" aria-hidden>
                          <Plus size={18} />
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
              {list.length === 0 && <li className="p-6 text-center text-sm text-slate-500">Nenhum equipamento encontrado.</li>}
            </ul>
          </div>
        </div>

        <div className="space-y-2.5 rounded-t-[28px] bg-white px-5 pt-4 pb-4 shadow-[0_-8px_24px_-16px_rgb(15_18_63/.25)]">
          <div className="flex items-baseline justify-between text-sm">
            <span className="tnum text-slate-500">
              {rows.reduce((s, r) => s + r.qty, 0)} un. · {days || 1} {days === 1 || !days ? "dia" : "dias"}
            </span>
            <span className="tnum text-2xl font-bold tracking-[-0.02em] text-brand-950">{money(total)}</span>
          </div>
          {overStock && <p className="text-xs text-red-700">Há quantidade acima do disponível no estoque.</p>}
          {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800 ring-1 ring-red-200 ring-inset">{error}</p>}
          <button type="button" className="btn-primary btn-lg w-full rounded-full" disabled={pending || !rows.length} onClick={submit}>
            {pending ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Check size={16} aria-hidden />}
            {pending ? "Salvando…" : "Adicionar à locação"}
          </button>
        </div>
      </div>
    </div>
  , document.body);
}
