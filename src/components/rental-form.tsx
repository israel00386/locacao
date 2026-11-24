"use client";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { priceFor, suggestPeriod, suggestUnitPrice, type PriceTable } from "@/lib/calc";
import { inclusiveDays, parseISODate, toISODate, addDays, weekday } from "@/lib/dates";
import { money, parseMoney, PERIODS, unitMoney, type Period } from "@/lib/format";
import { saveRental, type RentalPayload } from "@/app/(app)/locacoes/actions";
import { Badge } from "./ui";

export interface CustomerOption {
  id: string;
  name: string;
  phone: string | null;
  type: string;
  sites: string[];
  /** Último valor unitário cobrado deste cliente, por equipamento. */
  prices: Record<string, number>;
}

export interface EquipmentOption extends PriceTable {
  id: string;
  name: string;
  availableQty: number;
  /** Último valor unitário cobrado de qualquer cliente. */
  lastPrice: number | null;
}

export interface InitialRental {
  id: string;
  customerId: string;
  siteAddress: string;
  startDate: string;
  expectedEndDate: string;
  discount: number;
  notes: string;
  stage: string;
  items: {
    id: string;
    equipmentId: string;
    qty: number;
    unitPrice: number;
    period: Period;
    daysOverride: number | null;
    returnedQty: number;
    /** Acréscimo: retirada e previsão próprias (AAAA-MM-DD). Não são editadas aqui e ficam preservadas. */
    addition?: { startDate: string; expectedEndDate: string };
  }[];
  extras: { description: string; amount: number }[];
}

interface ItemState {
  key: string;
  id?: string;
  equipmentId: string;
  qty: number;
  unitPrice: string;
  period: Period;
  daysOverride: string;
  auto: boolean;
  minQty: number;
  priceSource?: string;
  addition?: { startDate: string; expectedEndDate: string };
}

const EXTRA_PRESETS = ["Taxa de entrega", "Mobilização", "Cobrança mínima", "Manutenção"];

let seq = 0;
const newKey = () => `k${++seq}`;
const fmtNum = (n: number) => String(n).replace(".", ",");

export function RentalForm({
  customers,
  equipment,
  initial,
  todayISO,
  defaultCustomerId,
}: {
  customers: CustomerOption[];
  equipment: EquipmentOption[];
  initial?: InitialRental;
  todayISO: string;
  defaultCustomerId?: string;
}) {
  const eqById = useMemo(() => new Map(equipment.map((e) => [e.id, e])), [equipment]);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Cliente
  const [customerId, setCustomerId] = useState<string | undefined>(initial?.customerId ?? defaultCustomerId);
  const [newCustomer, setNewCustomer] = useState<{ name: string; phone: string } | null>(null);
  const [customerQuery, setCustomerQuery] = useState("");
  const customer = customers.find((c) => c.id === customerId);

  // Obra e datas
  const [siteAddress, setSiteAddress] = useState(initial?.siteAddress ?? customers.find((c) => c.id === defaultCustomerId)?.sites[0] ?? "");
  const [startDate, setStartDate] = useState(initial?.startDate ?? todayISO);
  const [expectedEndDate, setExpectedEndDate] = useState(initial?.expectedEndDate ?? "");

  const start = parseISODate(startDate);
  const end = parseISODate(expectedEndDate);
  const days = start && end && end >= start ? inclusiveDays(start, end) : start && !end ? 1 : 0;

  // Itens
  const [items, setItems] = useState<ItemState[]>(
    () =>
      initial?.items.map((i) => ({
        key: newKey(),
        id: i.id,
        equipmentId: i.equipmentId,
        qty: i.qty,
        unitPrice: fmtNum(i.unitPrice),
        period: i.period,
        daysOverride: i.daysOverride ? String(i.daysOverride) : "",
        auto: false,
        minQty: i.returnedQty,
        addition: i.addition,
      })) ?? [],
  );
  const [extras, setExtras] = useState(
    () => initial?.extras.map((e) => ({ key: newKey(), description: e.description, amount: fmtNum(e.amount) })) ?? [],
  );
  const [discount, setDiscount] = useState(initial?.discount ? fmtNum(initial.discount) : "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [picker, setPicker] = useState(false);

  // Trocou o cliente: refaz os valores sugeridos dos itens que não foram editados à mão.
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    setItems((list) => list.map((it) => (it.auto ? { ...it, ...autoPrice(it.equipmentId, days) } : it)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  // Prioridade: último valor deste cliente → tabela de preços → último valor cobrado de qualquer cliente.
  function autoPrice(eqId: string, d: number): { period: Period; unitPrice: string; priceSource?: string } {
    const period = suggestPeriod(d || 1);
    const sug = suggestUnitPrice(eqById.get(eqId), customer?.prices[eqId], period);
    return { period, unitPrice: sug.unitPrice != null ? fmtNum(sug.unitPrice) : "", priceSource: sug.source };
  }

  function onDatesChange(nextStart: string, nextEnd: string) {
    setStartDate(nextStart);
    setExpectedEndDate(nextEnd);
    const s = parseISODate(nextStart);
    const e = parseISODate(nextEnd);
    const d = s && e && e >= s ? inclusiveDays(s, e) : 1;
    setItems((list) => list.map((it) => (it.auto ? { ...it, ...autoPrice(it.equipmentId, d) } : it)));
  }

  function addEquipment(eqId: string) {
    setItems((list) => {
      const existing = list.find((i) => i.equipmentId === eqId && !i.id);
      if (existing) return list.map((i) => (i === existing ? { ...i, qty: i.qty + 1 } : i));
      return [...list, { key: newKey(), equipmentId: eqId, qty: 1, daysOverride: "", auto: true, minQty: 0, ...autoPrice(eqId, days) }];
    });
  }

  const update = (key: string, patch: Partial<ItemState>) => setItems((l) => l.map((i) => (i.key === key ? { ...i, ...patch } : i)));

  // Acréscimo conta da própria retirada até a própria previsão (ou a da locação).
  const itemDays = (i: ItemState) => {
    if (!i.addition) return days || 1;
    const s = parseISODate(i.addition.startDate);
    const e = parseISODate(i.addition.expectedEndDate) ?? end;
    return s && e && e >= s ? inclusiveDays(s, e) : 1;
  };
  const lineTotal = (i: ItemState) => i.qty * parseMoney(i.unitPrice) * (Number(i.daysOverride) || itemDays(i));
  const hasAdditions = items.some((i) => i.addition);
  const fmtShort = (iso: string) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : "—");
  const itemsTotal = items.reduce((s, i) => s + lineTotal(i), 0);
  const extrasTotal = extras.reduce((s, e) => s + parseMoney(e.amount), 0);
  const total = itemsTotal + extrasTotal - parseMoney(discount);

  const startIsSunday = start && start.getUTCDay() === 0;
  const endIsSunday = end && end.getUTCDay() === 0;

  function submit(confirm: boolean) {
    setError(null);
    const payload: RentalPayload = {
      id: initial?.id,
      customerId: newCustomer ? undefined : customerId,
      newCustomer: newCustomer ? { name: newCustomer.name, phone: newCustomer.phone } : undefined,
      siteAddress,
      startDate,
      expectedEndDate: expectedEndDate || undefined,
      items: items.map((i) => ({
        id: i.id,
        equipmentId: i.equipmentId,
        qty: i.qty,
        unitPrice: parseMoney(i.unitPrice),
        period: i.period,
        daysOverride: i.daysOverride ? Math.round(Number(i.daysOverride)) : null,
      })),
      extras: extras.filter((e) => e.description.trim()).map((e) => ({ description: e.description, amount: parseMoney(e.amount) })),
      discount: parseMoney(discount),
      notes,
      confirm,
    };
    if (!payload.customerId && !payload.newCustomer) return setError("Escolha o cliente.");
    if (!payload.items.length) return setError("Adicione pelo menos um equipamento.");
    startTransition(async () => {
      const res = await saveRental(payload);
      if (res?.error) setError(res.error);
    });
  }

  const matches = customerQuery.trim()
    ? customers.filter((c) => c.name.toLowerCase().includes(customerQuery.trim().toLowerCase())).slice(0, 8)
    : [];

  return (
    <div className="space-y-4">
      {/* CLIENTE */}
      <div className="card p-4">
        <div className="label">Cliente</div>
        {customer || newCustomer ? (
          <div className="flex items-start justify-between gap-3 rounded-xl bg-brand-50 px-3 py-2.5">
            <div className="min-w-0">
              <div className="truncate font-semibold">{customer?.name ?? newCustomer?.name}</div>
              <div className="text-xs text-slate-600">
                {customer ? [customer.type, customer.phone].filter(Boolean).join(" · ") : "Novo cliente"}
              </div>
            </div>
            <button
              type="button"
              className="btn-ghost btn-sm"
              onClick={() => {
                setCustomerId(undefined);
                setNewCustomer(null);
                setCustomerQuery("");
              }}
            >
              Trocar
            </button>
          </div>
        ) : (
          <div className="relative">
            <input
              className="input"
              placeholder="Digite o nome do cliente…"
              value={customerQuery}
              onChange={(e) => setCustomerQuery(e.target.value)}
              autoFocus={!initial}
            />
            {customerQuery.trim() && (
              <div className="absolute inset-x-0 top-full z-20 mt-1 max-h-72 overflow-auto rounded-xl bg-white shadow-lg ring-1 ring-slate-200">
                {matches.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className="block w-full px-3 py-2.5 text-left hover:bg-slate-50"
                    onClick={() => {
                      setCustomerId(c.id);
                      if (c.sites.length && !siteAddress) setSiteAddress(c.sites[0]);
                    }}
                  >
                    <div className="text-sm font-medium">{c.name}</div>
                    <div className="text-xs text-slate-500">{[c.type, c.phone].filter(Boolean).join(" · ")}</div>
                  </button>
                ))}
                <button
                  type="button"
                  className="block w-full border-t border-slate-100 px-3 py-2.5 text-left text-sm font-semibold text-brand-700 hover:bg-brand-50"
                  onClick={() => setNewCustomer({ name: customerQuery.trim(), phone: "" })}
                >
                  + Cadastrar “{customerQuery.trim()}”
                </button>
              </div>
            )}
          </div>
        )}
        {newCustomer && (
          <div className="mt-3">
            <label className="label">Telefone do novo cliente (opcional)</label>
            <input
              className="input"
              inputMode="tel"
              placeholder="(85) 9 9999-9999"
              value={newCustomer.phone}
              onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
            />
          </div>
        )}
      </div>

      {/* OBRA E DATAS */}
      <div className="card space-y-3 p-4">
        <div>
          <label className="label" htmlFor="site">Obra / endereço</label>
          <input id="site" className="input" value={siteAddress} onChange={(e) => setSiteAddress(e.target.value)} placeholder="Rua, número, bairro, cidade" />
          {customer && customer.sites.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {customer.sites.slice(0, 6).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSiteAddress(s)}
                  className={`max-w-full truncate rounded-full px-2.5 py-1 text-xs ring-1 ${
                    s === siteAddress ? "bg-brand-600 text-white ring-brand-600" : "bg-white text-slate-700 ring-slate-300"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="start">Retirada</label>
            <input id="start" type="date" className="input" value={startDate} onChange={(e) => onDatesChange(e.target.value, expectedEndDate)} />
            {startIsSunday && <p className="mt-1 text-xs text-amber-700">Cai num domingo</p>}
          </div>
          <div>
            <label className="label" htmlFor="end">Previsão de devolução</label>
            <input id="end" type="date" className="input" value={expectedEndDate} min={startDate} onChange={(e) => onDatesChange(startDate, e.target.value)} />
            {end && <p className={`mt-1 text-xs ${endIsSunday ? "text-amber-700" : "text-slate-500"}`}>{weekday(end)}</p>}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-slate-500">Prazo:</span>
          {[1, 7, 15, 30].map((d) => (
            <button
              key={d}
              type="button"
              className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${days === d ? "bg-brand-600 text-white ring-brand-600" : "bg-white ring-slate-300"}`}
              onClick={() => start && onDatesChange(startDate, toISODate(addDays(start, d - 1)))}
            >
              {d === 1 ? "1 dia" : `${d} dias`}
            </button>
          ))}
          {days > 0 && <span className="ml-auto text-sm font-semibold tnum">{days} {days === 1 ? "dia" : "dias"}</span>}
        </div>
      </div>

      {/* EQUIPAMENTOS */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-semibold">Equipamentos</h2>
          <button type="button" className="btn-primary btn-sm" onClick={() => setPicker(true)}>
            + Adicionar
          </button>
        </div>
        {hasAdditions && (
          <p className="border-b border-slate-100 bg-amber-50 px-4 py-2 text-xs text-amber-800">
            Os acréscimos mantêm as próprias datas de retirada e previsão (não mudam com as datas acima). Equipamento adicionado aqui entra com as datas da locação; para outra data, use “+ Acréscimo de equipamento” na página da locação.
          </p>
        )}
        {items.length === 0 ? (
          <button type="button" onClick={() => setPicker(true)} className="block w-full px-4 py-8 text-center text-sm text-slate-500">
            Nenhum equipamento. Toque para adicionar.
          </button>
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((it) => {
              const eq = eqById.get(it.equipmentId);
              const avail = eq?.availableQty ?? 0;
              const over = it.qty > avail;
              return (
                <li key={it.key} className="space-y-2 px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold">{eq?.name ?? "?"}</div>
                      {it.addition && (
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-700 tnum">
                          <Badge tone="amber">Acréscimo</Badge>
                          retirada {fmtShort(it.addition.startDate)} → previsão {fmtShort(it.addition.expectedEndDate || expectedEndDate)}
                        </div>
                      )}
                      <div className={`text-xs ${over ? "font-medium text-amber-700" : "text-slate-500"}`}>
                        {avail} disponíveis{over ? " — vai faltar (sublocar?)" : ""}
                      </div>
                    </div>
                    <div className="text-right text-sm font-semibold tnum">{money(lineTotal(it))}</div>
                  </div>
                  <div className="grid grid-cols-[auto_1fr_1fr] items-end gap-2">
                    <div>
                      <div className="label">Qtd.</div>
                      <div className="flex items-center rounded-xl ring-1 ring-slate-300">
                        <button type="button" className="px-3 py-2 text-lg leading-none" onClick={() => update(it.key, { qty: Math.max(Math.max(1, it.minQty), it.qty - 1) })}>
                          −
                        </button>
                        <input
                          className="w-12 border-0 bg-transparent p-0 text-center text-base outline-none tnum"
                          inputMode="numeric"
                          value={it.qty}
                          onChange={(e) => update(it.key, { qty: Math.max(0, Number(e.target.value.replace(/\D/g, "")) || 0) })}
                          onBlur={() => update(it.key, { qty: Math.max(1, it.minQty, it.qty) })}
                        />
                        <button type="button" className="px-3 py-2 text-lg leading-none" onClick={() => update(it.key, { qty: it.qty + 1 })}>
                          +
                        </button>
                      </div>
                    </div>
                    <div>
                      <div className="label">Período</div>
                      <select
                        className="input"
                        value={it.period}
                        onChange={(e) => {
                          const period = e.target.value as Period;
                          const price = eq ? priceFor(eq, period) : null;
                          update(it.key, { period, auto: false, ...(price != null ? { unitPrice: fmtNum(price), priceSource: "tabela de preços" } : {}) });
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
                        value={it.unitPrice}
                        placeholder="0,00"
                        onChange={(e) => update(it.key, { unitPrice: e.target.value, auto: false, priceSource: undefined })}
                      />
                    </div>
                  </div>
                  {it.priceSource && <p className="text-[11px] text-slate-500">Valor sugerido: {it.priceSource}</p>}
                  {!it.unitPrice && <p className="text-[11px] font-medium text-amber-700">Informe o valor por dia</p>}
                  <details className="text-xs text-slate-500">
                    <summary className="cursor-pointer select-none">Mais opções</summary>
                    <div className="mt-2 flex flex-wrap items-end gap-3">
                      <div>
                        <div className="label">Dias cobrados (vazio = automático)</div>
                        <input className="input w-32 tnum" inputMode="numeric" value={it.daysOverride} onChange={(e) => update(it.key, { daysOverride: e.target.value.replace(/\D/g, "") })} placeholder={String(itemDays(it))} />
                      </div>
                      {it.minQty === 0 ? (
                        <button type="button" className="btn-danger btn-sm" onClick={() => setItems((l) => l.filter((x) => x.key !== it.key))}>
                          Remover
                        </button>
                      ) : (
                        <span>{it.minQty} já devolvidos</span>
                      )}
                    </div>
                  </details>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* ACRÉSCIMOS E DESCONTO */}
      <div className="card space-y-3 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Taxas e cobranças extras</h2>
        </div>
        {extras.map((ex) => (
          <div key={ex.key} className="flex gap-2">
            <input className="input flex-1" value={ex.description} placeholder="Descrição" onChange={(e) => setExtras((l) => l.map((x) => (x.key === ex.key ? { ...x, description: e.target.value } : x)))} />
            <input className="input w-28 tnum" inputMode="decimal" value={ex.amount} placeholder="R$" onChange={(e) => setExtras((l) => l.map((x) => (x.key === ex.key ? { ...x, amount: e.target.value } : x)))} />
            <button type="button" className="btn-ghost px-2" aria-label="Remover taxa" onClick={() => setExtras((l) => l.filter((x) => x.key !== ex.key))}>
              ✕
            </button>
          </div>
        ))}
        <div className="flex flex-wrap gap-1.5">
          {EXTRA_PRESETS.map((p) => (
            <button key={p} type="button" className="rounded-full bg-white px-2.5 py-1 text-xs ring-1 ring-slate-300" onClick={() => setExtras((l) => [...l, { key: newKey(), description: p, amount: "" }])}>
              + {p}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-3">
          <div>
            <label className="label" htmlFor="disc">Desconto (R$)</label>
            <input id="disc" className="input tnum" inputMode="decimal" value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="0,00" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="notes">Observações internas</label>
          <textarea id="notes" className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>

      {/* RESUMO */}
      <div className="sticky bottom-20 z-10 lg:bottom-4">
        <div className="card space-y-3 p-4 shadow-lg">
          <div className="flex items-baseline justify-between text-sm">
            <span className="text-slate-500">
              {items.length} {items.length === 1 ? "item" : "itens"} · {days || 1} {days === 1 ? "dia" : "dias"}
              {extrasTotal > 0 && ` · taxas ${money(extrasTotal)}`}
            </span>
            <span className="text-lg font-bold tnum">{money(total)}</span>
          </div>
          {error && <p className="text-sm text-red-700">{error}</p>}
          <div className="flex gap-2">
            {!initial ? (
              <>
                <button type="button" className="btn-secondary flex-1" disabled={pending} onClick={() => submit(false)}>
                  Salvar orçamento
                </button>
                <button type="button" className="btn-primary flex-1" disabled={pending} onClick={() => submit(true)}>
                  {pending ? "Salvando…" : "Confirmar locação"}
                </button>
              </>
            ) : (
              <button type="button" className="btn-primary flex-1" disabled={pending} onClick={() => submit(false)}>
                {pending ? "Salvando…" : "Salvar alterações"}
              </button>
            )}
          </div>
        </div>
      </div>

      {picker && (
        <EquipmentPicker
          equipment={equipment}
          selected={items}
          onAdd={addEquipment}
          onClose={() => setPicker(false)}
        />
      )}
    </div>
  );
}

function EquipmentPicker({
  equipment,
  selected,
  onAdd,
  onClose,
}: {
  equipment: EquipmentOption[];
  selected: ItemState[];
  onAdd: (id: string) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const list = equipment.filter((e) => e.name.toLowerCase().includes(q.trim().toLowerCase()));
  const count = (id: string) => selected.filter((s) => s.equipmentId === id).reduce((a, s) => a + s.qty, 0);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 sm:items-center" onClick={onClose}>
      <div
        className="flex max-h-[85dvh] w-full max-w-lg flex-col rounded-t-3xl bg-white pb-[env(safe-area-inset-bottom)] shadow-xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-slate-100 p-4">
          <input className="input" placeholder="Buscar equipamento…" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
          <button type="button" className="btn-primary" onClick={onClose}>
            Pronto
          </button>
        </div>
        <ul className="flex-1 divide-y divide-slate-100 overflow-auto">
          {list.map((e) => {
            const c = count(e.id);
            const price = e.priceDaily ?? e.priceWeekly ?? e.priceBiweekly ?? e.priceMonthly;
            return (
              <li key={e.id}>
                <button type="button" className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left active:bg-slate-50" onClick={() => onAdd(e.id)}>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{e.name}</span>
                    <span className={`block text-xs ${e.availableQty > 0 ? "text-slate-500" : "text-amber-700"}`}>
                      {e.availableQty} disponíveis{price != null ? ` · ${unitMoney(price)}/dia` : ""}
                    </span>
                  </span>
                  {c > 0 ? (
                    <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-brand-600 px-2 text-xs font-bold text-white">{c}</span>
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
  );
}
