"use client";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import {
  CalendarRange,
  Check,
  ChevronDown,
  FileText,
  Info,
  Loader2,
  MapPin,
  Minus,
  Package,
  PackagePlus,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  Truck,
  UserPlus,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";
import { priceFor, suggestPeriod, suggestUnitPrice, type PriceTable } from "@/lib/calc";
import { inclusiveDays, parseISODate, toISODate, addDays, weekday } from "@/lib/dates";
import { money, parseMoney, PERIODS, unitMoney, type Period } from "@/lib/format";
import { saveRental, type RentalPayload } from "@/app/(app)/locacoes/actions";
import { Badge, BalanceCard, Chip } from "./ui";
import { Avatar, SOFT } from "./rental-ui";

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

  const units = items.reduce((s, i) => s + i.qty, 0);
  const discountValue = parseMoney(discount);
  const steps = [
    { label: "Cliente", done: !!(customer || newCustomer) },
    { label: "Obra", done: !!siteAddress.trim() },
    { label: "Prazo", done: !!(start && end) },
    { label: "Equipamentos", done: items.length > 0 && items.every((i) => i.unitPrice) },
  ];

  const buttons = (
    <div className="flex gap-2 lg:flex-col-reverse">
      {!initial ? (
        <>
          <button type="button" className="btn-secondary min-w-0 flex-1 rounded-full px-3 lg:min-h-12 lg:flex-none lg:border-white/15 lg:bg-white/10 lg:text-white lg:shadow-none lg:hover:bg-white/15" disabled={pending} onClick={() => submit(false)}>
            <FileText size={16} aria-hidden /> Salvar orçamento
          </button>
          <button type="button" className="btn-accent min-w-0 flex-1 rounded-full px-3 lg:min-h-12 lg:flex-none" disabled={pending} onClick={() => submit(true)}>
            {pending ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Truck size={16} aria-hidden />}
            {pending ? "Salvando…" : "Confirmar locação"}
          </button>
        </>
      ) : (
        <button type="button" className="btn-accent flex-1 rounded-full lg:min-h-12" disabled={pending} onClick={() => submit(false)}>
          {pending ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Check size={16} aria-hidden />}
          {pending ? "Salvando…" : "Salvar alterações"}
        </button>
      )}
    </div>
  );
  const errorBox = error && (
    <p role="alert" className="rounded-2xl bg-red-50 px-3.5 py-2.5 text-sm text-red-800 ring-1 ring-red-200 ring-inset">
      {error}
    </p>
  );

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="min-w-0 space-y-4">
        {/* 1. CLIENTE */}
        <Step n={1} title="Cliente" icon={UserRound} done={steps[0].done}>
          {customer || newCustomer ? (
            <div className="flex items-center gap-3 rounded-[20px] bg-gradient-to-br from-brand-50 to-accent-50/60 p-3">
              <Avatar name={customer?.name ?? newCustomer?.name ?? "?"} />
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold text-slate-900">{customer?.name ?? newCustomer?.name}</div>
                <div className="truncate text-xs text-slate-600">
                  {customer ? [customer.type, customer.phone].filter(Boolean).join(" · ") : "Novo cliente — será cadastrado ao salvar"}
                </div>
              </div>
              <button
                type="button"
                className="btn-sm shrink-0 rounded-full bg-white text-slate-700 shadow-sm hover:bg-slate-50"
                onClick={() => {
                  setCustomerId(undefined);
                  setNewCustomer(null);
                  setCustomerQuery("");
                }}
              >
                <RefreshCw size={14} aria-hidden /> Trocar
              </button>
            </div>
          ) : (
            <div className="relative">
              <Search size={18} className="pointer-events-none absolute top-[0.85rem] left-3.5 text-slate-400 sm:top-3" aria-hidden />
              <input
                className="input rounded-full pl-11"
                placeholder="Digite o nome do cliente…"
                value={customerQuery}
                onChange={(e) => setCustomerQuery(e.target.value)}
                autoFocus={!initial}
                aria-label="Buscar cliente"
              />
              {customerQuery.trim() && (
                <div className="absolute inset-x-0 top-full z-20 mt-2 max-h-80 overflow-auto rounded-[22px] bg-white p-1.5 shadow-[0_24px_48px_-20px_rgb(15_18_63/.35),0_0_0_1px_rgb(15_18_63/.05)]">
                  {matches.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className="flex min-h-12 w-full items-center gap-3 rounded-2xl px-2.5 py-2 text-left hover:bg-slate-50 active:bg-slate-100"
                      onClick={() => {
                        setCustomerId(c.id);
                        if (c.sites.length && !siteAddress) setSiteAddress(c.sites[0]);
                      }}
                    >
                      <Avatar name={c.name} size="sm" />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-slate-900">{c.name}</span>
                        <span className="block truncate text-xs text-slate-500">{[c.type, c.phone].filter(Boolean).join(" · ")}</span>
                      </span>
                    </button>
                  ))}
                  <button
                    type="button"
                    className={`flex min-h-12 w-full items-center gap-3 rounded-2xl px-2.5 py-2.5 text-left text-sm font-semibold text-brand-700 hover:bg-brand-50 ${matches.length ? "mt-1 border-t border-slate-100" : ""}`}
                    onClick={() => setNewCustomer({ name: customerQuery.trim(), phone: "" })}
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-900 text-accent-300" aria-hidden>
                      <UserPlus size={16} />
                    </span>
                    Cadastrar “{customerQuery.trim()}”
                  </button>
                </div>
              )}
            </div>
          )}
          {newCustomer && (
            <div className="mt-3">
              <label className="label" htmlFor="new-phone">Telefone do novo cliente (opcional)</label>
              <input
                id="new-phone"
                className="input"
                inputMode="tel"
                placeholder="(85) 9 9999-9999"
                value={newCustomer.phone}
                onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
              />
            </div>
          )}
        </Step>

        {/* 2. OBRA */}
        <Step n={2} title="Obra" icon={MapPin} done={steps[1].done}>
          <label className="label" htmlFor="site">Endereço da obra</label>
          <input id="site" className="input" value={siteAddress} onChange={(e) => setSiteAddress(e.target.value)} placeholder="Rua, número, bairro, cidade" />
          {customer && customer.sites.length > 0 && (
            <div className="mt-2.5">
              <div className="mb-1.5 text-xs text-slate-500">Obras já usadas por este cliente</div>
              <div className="flex flex-wrap gap-1.5">
                {customer.sites.slice(0, 6).map((s) => {
                  const on = s === siteAddress;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSiteAddress(s)}
                      aria-pressed={on}
                      className={`inline-flex min-h-10 max-w-full items-center gap-1.5 rounded-full px-3.5 text-[12.5px] font-medium transition-colors ${
                        on ? "bg-brand-900 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200/70"
                      }`}
                    >
                      {on ? <Check size={13} className="shrink-0" aria-hidden /> : <MapPin size={13} className="shrink-0 text-slate-400" aria-hidden />}
                      <span className="truncate">{s}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </Step>

        {/* 3. PRAZO */}
        <Step
          n={3}
          title="Prazo"
          icon={CalendarRange}
          done={steps[2].done}
          aside={
            days > 0 && (
              <span className="tnum rounded-full bg-brand-50 px-3 py-1 text-sm font-bold text-brand-700">
                {days} {days === 1 ? "dia" : "dias"}
              </span>
            )
          }
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="start">Retirada</label>
              <input id="start" type="date" className="input" value={startDate} onChange={(e) => onDatesChange(e.target.value, expectedEndDate)} />
              {start && (
                <p className={`mt-1 text-xs ${startIsSunday ? "font-medium text-amber-700" : "text-slate-500"}`}>
                  {startIsSunday ? "Cai num domingo" : weekday(start)}
                </p>
              )}
            </div>
            <div>
              <label className="label" htmlFor="end">Previsão de devolução</label>
              <input id="end" type="date" className="input" value={expectedEndDate} min={startDate} onChange={(e) => onDatesChange(startDate, e.target.value)} />
              {end && <p className={`mt-1 text-xs ${endIsSunday ? "font-medium text-amber-700" : "text-slate-500"}`}>{weekday(end)}</p>}
            </div>
          </div>
          <div className="mt-4 grid grid-cols-4 gap-1 rounded-full bg-slate-100 p-1" role="group" aria-label="Prazo rápido">
            {[1, 7, 15, 30].map((d) => {
              const on = days === d && !!end;
              return (
                <button
                  key={d}
                  type="button"
                  aria-pressed={on}
                  className={`min-h-10 rounded-full text-[13px] font-semibold transition-[background-color,color,box-shadow] duration-150 active:scale-[.97] ${
                    on ? "bg-brand-900 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"
                  }`}
                  onClick={() => start && onDatesChange(startDate, toISODate(addDays(start, d - 1)))}
                >
                  {d === 1 ? "1 dia" : `${d} dias`}
                </button>
              );
            })}
          </div>
        </Step>

        {/* 4. EQUIPAMENTOS */}
        <Step
          n={4}
          title="Equipamentos"
          icon={Package}
          done={steps[3].done}
          flush
          aside={
            items.length > 0 && (
              <button type="button" className="btn-primary btn-sm rounded-full px-3.5" onClick={() => setPicker(true)}>
                <Plus size={15} aria-hidden /> Adicionar
              </button>
            )
          }
        >
          {hasAdditions && (
            <p className="mx-4 mb-3 flex gap-2 rounded-2xl bg-amber-50 sm:mx-5 px-3 py-2.5 text-xs leading-relaxed text-amber-900 ring-1 ring-amber-200/80 ring-inset">
              <Info size={15} className="mt-px shrink-0 text-amber-600" aria-hidden />
              <span>
                Os acréscimos mantêm as próprias datas de retirada e previsão (não mudam com as datas acima). Equipamento adicionado aqui entra com as datas da locação; para outra data, use “Acréscimo de equipamento” na página da locação.
              </span>
            </p>
          )}
          {items.length === 0 ? (
            <div className="px-4 pb-5 sm:px-5">
              <button
                type="button"
                onClick={() => setPicker(true)}
                className="flex w-full flex-col items-center gap-2 rounded-[22px] border-2 border-dashed border-slate-200 bg-slate-50/50 px-4 py-8 text-center transition-colors hover:border-brand-300 hover:bg-brand-50/40"
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-brand-600 to-brand-900 text-accent-300 shadow-lg shadow-brand-900/25" aria-hidden>
                  <PackagePlus size={22} />
                </span>
                <span className="text-sm font-semibold text-slate-900">Adicionar equipamentos</span>
                <span className="text-xs text-slate-500">Toque para escolher do estoque</span>
              </button>
            </div>
          ) : (
            <ul className="space-y-2 px-3 pb-3 sm:px-4">
              {items.map((it) => {
                const eq = eqById.get(it.equipmentId);
                const avail = eq?.availableQty ?? 0;
                const over = it.qty > avail;
                return (
                  <li key={it.key} className={`space-y-3 rounded-[20px] px-3.5 py-3.5 sm:px-4 ${it.addition ? "bg-amber-50/70" : "bg-slate-50"}`}>
                    <div className="flex items-start gap-3">
                      <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white shadow-[0_2px_8px_-4px_rgb(15_18_63/.25)] ${
                          it.addition ? "text-amber-600" : "text-brand-600"
                        }`}
                        aria-hidden
                      >
                        {it.addition ? <PackagePlus size={17} /> : <Package size={17} />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm leading-snug font-semibold text-slate-900">{eq?.name ?? "?"}</div>
                        {it.addition && (
                          <div className="tnum mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-700">
                            <Badge tone="amber">Acréscimo</Badge>
                            retirada {fmtShort(it.addition.startDate)} → previsão {fmtShort(it.addition.expectedEndDate || expectedEndDate)}
                          </div>
                        )}
                        <div className={`mt-0.5 text-xs ${over ? "font-medium text-amber-700" : "text-slate-500"}`}>
                          {avail} disponíveis{over ? " — vai faltar (sublocar?)" : ""}
                        </div>
                      </div>
                      <div className="tnum shrink-0 text-right text-sm font-bold text-slate-900">{money(lineTotal(it))}</div>
                    </div>
                    <div className="grid grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)] items-end gap-2">
                      <div>
                        <div className="label">Qtd.</div>
                        <Stepper
                          value={it.qty}
                          name={eq?.name}
                          onMinus={() => update(it.key, { qty: Math.max(Math.max(1, it.minQty), it.qty - 1) })}
                          onPlus={() => update(it.key, { qty: it.qty + 1 })}
                          onChange={(v) => update(it.key, { qty: v })}
                          onBlur={() => update(it.key, { qty: Math.max(1, it.minQty, it.qty) })}
                        />
                      </div>
                      <div>
                        <div className="label">Período</div>
                        <select
                          className="input px-2.5"
                          value={it.period}
                          aria-label={`Período de ${eq?.name}`}
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
                          className={`input tnum ${!it.unitPrice ? "border-amber-400" : ""}`}
                          inputMode="decimal"
                          value={it.unitPrice}
                          placeholder="0,00"
                          aria-label={`Valor por dia de ${eq?.name}`}
                          onChange={(e) => update(it.key, { unitPrice: e.target.value, auto: false, priceSource: undefined })}
                        />
                      </div>
                    </div>
                    {(it.priceSource || !it.unitPrice) && (
                      <div className="flex flex-wrap gap-x-3 text-[11px]">
                        {it.priceSource && (
                          <span className="inline-flex items-center gap-1 text-slate-500">
                            <Sparkles size={12} className="text-accent-600" aria-hidden /> Valor sugerido: {it.priceSource}
                          </span>
                        )}
                        {!it.unitPrice && <span className="font-medium text-amber-700">Informe o valor por dia</span>}
                      </div>
                    )}
                    <details className="group text-xs text-slate-500">
                      <summary className="inline-flex min-h-8 cursor-pointer list-none items-center gap-1 select-none hover:text-slate-800 [&::-webkit-details-marker]:hidden">
                        <ChevronDown size={14} className="transition-transform group-open:rotate-180" aria-hidden /> Mais opções
                      </summary>
                      <div className="mt-2 flex flex-wrap items-end gap-3">
                        <div>
                          <div className="label">Dias cobrados (vazio = automático)</div>
                          <input
                            className="input w-32 tnum"
                            inputMode="numeric"
                            value={it.daysOverride}
                            onChange={(e) => update(it.key, { daysOverride: e.target.value.replace(/\D/g, "") })}
                            placeholder={String(itemDays(it))}
                          />
                        </div>
                        {it.minQty === 0 ? (
                          <button type="button" className="btn-danger btn-sm" onClick={() => setItems((l) => l.filter((x) => x.key !== it.key))}>
                            <Trash2 size={14} aria-hidden /> Remover
                          </button>
                        ) : (
                          <span className="pb-2">{it.minQty} já devolvidos</span>
                        )}
                      </div>
                    </details>
                  </li>
                );
              })}
              <li>
                <button type="button" onClick={() => setPicker(true)} className="flex min-h-12 w-full items-center justify-center gap-1.5 rounded-[20px] border-2 border-dashed border-slate-200 text-[13px] font-semibold text-brand-700 transition-colors hover:border-brand-300 hover:bg-brand-50/40">
                  <Plus size={15} aria-hidden /> Adicionar outro equipamento
                </button>
              </li>
            </ul>
          )}
        </Step>

        {/* 5. VALORES */}
        <Step n={5} title="Taxas, desconto e observações" icon={Receipt} done={false} optional>
          <div className="space-y-2">
            {extras.map((ex) => (
              <div key={ex.key} className="flex gap-2">
                <input
                  className="input min-w-0 flex-1"
                  value={ex.description}
                  placeholder="Descrição"
                  aria-label="Descrição da taxa"
                  onChange={(e) => setExtras((l) => l.map((x) => (x.key === ex.key ? { ...x, description: e.target.value } : x)))}
                />
                <input
                  className="input w-28 shrink-0 tnum"
                  inputMode="decimal"
                  value={ex.amount}
                  placeholder="R$"
                  aria-label={`Valor de ${ex.description || "taxa"}`}
                  onChange={(e) => setExtras((l) => l.map((x) => (x.key === ex.key ? { ...x, amount: e.target.value } : x)))}
                />
                <button
                  type="button"
                  className="btn-ghost shrink-0 rounded-full px-2.5 text-slate-400 hover:text-red-600"
                  aria-label="Remover taxa"
                  onClick={() => setExtras((l) => l.filter((x) => x.key !== ex.key))}
                >
                  <X size={18} aria-hidden />
                </button>
              </div>
            ))}
          </div>
          <div className={`flex flex-wrap gap-1.5 ${extras.length ? "mt-3" : ""}`}>
            {EXTRA_PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                className="inline-flex min-h-10 items-center gap-1 rounded-full bg-slate-100 px-3.5 text-[12.5px] font-medium text-slate-700 transition-colors hover:bg-slate-200/70 active:scale-[.97]"
                onClick={() => setExtras((l) => [...l, { key: newKey(), description: p, amount: "" }])}
              >
                <Plus size={13} className="text-slate-400" aria-hidden /> {p}
              </button>
            ))}
          </div>
          <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-[180px_1fr]">
            <div>
              <label className="label" htmlFor="disc">Desconto (R$)</label>
              <input id="disc" className="input tnum" inputMode="decimal" value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="0,00" />
            </div>
            <div>
              <label className="label" htmlFor="notes">Observações internas</label>
              <textarea id="notes" className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Só a equipe vê" />
            </div>
          </div>
        </Step>
      </div>

      {/* RESUMO — computador: cartão em degradê fixo na lateral */}
      <aside className="hidden lg:sticky lg:top-6 lg:block">
        <BalanceCard
          label={initial ? "Total" : "Total estimado"}
          value={money(total)}
          chips={
            <Chip tone="glass">
              {units} un. · {days || 1} {days === 1 || !days ? "dia" : "dias"}
            </Chip>
          }
        >
          <ol className="grid grid-cols-4 gap-1.5" aria-label="Etapas">
            {steps.map((st) => (
              <li key={st.label} className="min-w-0">
                <span className={`block h-1.5 rounded-full ${st.done ? "bg-accent-400" : "bg-white/15"}`} aria-hidden />
                <span className={`mt-1.5 block truncate text-[11px] font-medium ${st.done ? "text-white/85" : "text-white/45"}`}>
                  {st.done && <Check size={10} strokeWidth={3} className="mr-0.5 inline align-[-1px]" aria-hidden />}
                  {st.label}
                </span>
              </li>
            ))}
          </ol>

          <dl className="mt-5 space-y-2 rounded-[20px] bg-white/[.07] p-4 text-[13px] ring-1 ring-white/10 ring-inset">
            <div className="flex justify-between gap-3">
              <dt className="text-white/60">Equipamentos</dt>
              <dd className="tnum font-semibold">{money(itemsTotal)}</dd>
            </div>
            {extrasTotal > 0 && (
              <div className="flex justify-between gap-3">
                <dt className="text-white/60">Taxas</dt>
                <dd className="tnum font-semibold">{money(extrasTotal)}</dd>
              </div>
            )}
            {discountValue > 0 && (
              <div className="flex justify-between gap-3">
                <dt className="text-white/60">Desconto</dt>
                <dd className="tnum font-semibold text-emerald-300">− {money(discountValue)}</dd>
              </div>
            )}
            <div className="flex justify-between gap-3 border-t border-dashed border-white/15 pt-2">
              <dt className="font-semibold text-white/85">Total</dt>
              <dd className="tnum font-bold text-accent-300">{money(total)}</dd>
            </div>
          </dl>
          <div className="mt-5 space-y-3">
            {errorBox}
            {buttons}
            {!initial && <p className="text-center text-[11.5px] leading-relaxed text-white/50">Orçamento não tira nada do estoque. Confirme quando o material sair.</p>}
          </div>
        </BalanceCard>
      </aside>

      {/* RESUMO — celular (fixo acima da barra inferior flutuante) */}
      <div className="sticky bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-10 mt-4 lg:hidden">
        <div className="space-y-2.5 rounded-[26px] bg-white/95 p-2.5 shadow-[0_14px_36px_-14px_rgb(15_18_63/.45),0_0_0_1px_rgb(15_18_63/.05)] backdrop-blur-md">
          <div className="flex items-center justify-between gap-3 px-2 pt-0.5">
            <div className="min-w-0">
              <div className="text-[12px] font-medium text-slate-500">Total</div>
              <div className="tnum truncate text-[11.5px] text-slate-400">
                {items.length} {items.length === 1 ? "item" : "itens"} · {days || 1} {days === 1 || !days ? "dia" : "dias"}
                {extrasTotal > 0 && ` · taxas ${money(extrasTotal)}`}
              </div>
            </div>
            <span className="tnum text-[22px] font-bold tracking-[-0.02em] text-brand-950">{money(total)}</span>
          </div>
          {errorBox}
          {buttons}
        </div>
      </div>

      {picker && <EquipmentPicker equipment={equipment} selected={items} onAdd={addEquipment} onClose={() => setPicker(false)} />}
    </div>
  );
}

function Step({
  n,
  title,
  icon: Icon,
  done,
  optional,
  aside,
  flush,
  children,
}: {
  n: number;
  title: string;
  icon: LucideIcon;
  done: boolean;
  optional?: boolean;
  aside?: React.ReactNode;
  /** Conteúdo vai até as bordas (listas). */
  flush?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className={SOFT} aria-labelledby={`step-${n}`}>
      <header className="flex items-center gap-3 px-4 pt-4 pb-3 sm:px-5 sm:pt-5">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[14px] font-bold transition-colors duration-200 ${
            done ? "bg-emerald-500 text-white shadow-sm shadow-emerald-700/30" : "bg-brand-50 text-brand-700"
          }`}
          aria-hidden
        >
          {done ? <Check size={16} strokeWidth={2.75} /> : n}
        </span>
        <div className="min-w-0 flex-1">
          <h2 id={`step-${n}`} className="flex items-center gap-1.5 text-base leading-tight font-semibold tracking-[-0.01em] text-brand-950">
            <Icon size={16} className="text-slate-400" aria-hidden />
            {title}
          </h2>
          {optional && <div className="mt-0.5 text-xs text-slate-500">Opcional</div>}
        </div>
        {aside}
      </header>
      <div className={flush ? "" : "px-4 pb-5 sm:px-5"}>{children}</div>
    </section>
  );
}

function Stepper({
  value,
  name,
  onMinus,
  onPlus,
  onChange,
  onBlur,
}: {
  value: number;
  name?: string;
  onMinus: () => void;
  onPlus: () => void;
  onChange: (v: number) => void;
  onBlur: () => void;
}) {
  return (
    <div className="flex h-12 items-center rounded-full bg-white ring-1 ring-slate-200 ring-inset sm:h-11">
      <button type="button" className="flex h-full w-10 items-center justify-center rounded-l-full text-slate-600 hover:bg-slate-50 active:bg-slate-100" aria-label="Diminuir" onClick={onMinus}>
        <Minus size={16} aria-hidden />
      </button>
      <input
        className="tnum w-11 border-0 bg-transparent p-0 text-center text-base font-semibold text-slate-900 outline-none"
        inputMode="numeric"
        value={value}
        aria-label={`Quantidade de ${name ?? "equipamento"}`}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value.replace(/\D/g, "")) || 0))}
        onBlur={onBlur}
      />
      <button type="button" className="flex h-full w-10 items-center justify-center rounded-r-full text-slate-600 hover:bg-slate-50 active:bg-slate-100" aria-label="Aumentar" onClick={onPlus}>
        <Plus size={16} aria-hidden />
      </button>
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
  const totalChosen = selected.reduce((a, s) => a + s.qty, 0);

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

  // Portal no <body>: fora de containers animados (transform), que prenderiam o position: fixed.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-brand-950/45 transition-opacity duration-200 starting:opacity-0 sm:items-center sm:p-6" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="picker-title"
        className="flex max-h-[88dvh] w-full max-w-lg translate-y-0 flex-col overflow-hidden rounded-t-[32px] bg-[#f6f7fb] pb-[env(safe-area-inset-bottom)] shadow-2xl transition-[translate,opacity] duration-300 ease-out starting:translate-y-10 starting:opacity-0 motion-reduce:transition-none sm:rounded-[32px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-slate-300/80 sm:hidden" aria-hidden />
        <div className="flex items-center justify-between gap-3 px-5 pt-3 pb-3 sm:pt-5">
          <h2 id="picker-title" className="text-xl font-bold tracking-[-0.02em] text-brand-950">Escolher equipamentos</h2>
          <button type="button" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-slate-600 shadow-[0_2px_8px_-4px_rgb(15_18_63/.3)] hover:text-slate-900 active:scale-95" aria-label="Fechar" onClick={onClose}>
            <X size={20} aria-hidden />
          </button>
        </div>
        <div className="px-5 pb-3">
          <div className="relative">
            <Search size={18} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-slate-400" aria-hidden />
            <input className="input rounded-full border-0 pl-11 shadow-[0_1px_2px_rgb(15_18_63/.05)]" placeholder="Buscar equipamento…" value={q} onChange={(e) => setQ(e.target.value)} autoFocus aria-label="Buscar equipamento" />
          </div>
        </div>
        <ul className="mx-3 mb-3 flex-1 divide-y divide-slate-100 overflow-auto rounded-[24px] bg-white px-1.5 shadow-[0_1px_2px_rgb(15_18_63/.04)] sm:mx-4">
          {list.map((e) => {
            const c = count(e.id);
            const price = e.priceDaily ?? e.priceWeekly ?? e.priceBiweekly ?? e.priceMonthly;
            return (
              <li key={e.id}>
                <button type="button" className="flex min-h-16 w-full items-center gap-3 rounded-2xl px-2.5 py-2.5 text-left hover:bg-slate-50 active:bg-slate-100" onClick={() => onAdd(e.id)}>
                  <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors ${c > 0 ? "bg-brand-900 text-accent-300" : "bg-slate-100 text-slate-500"}`} aria-hidden>
                    <Package size={18} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14.5px] font-semibold text-brand-950">{e.name}</span>
                    <span className={`tnum block text-xs ${e.availableQty > 0 ? "text-slate-500" : "font-medium text-amber-700"}`}>
                      {e.availableQty} disponíveis{price != null ? ` · ${unitMoney(price)}/dia` : ""}
                    </span>
                  </span>
                  {c > 0 ? (
                    <span className="tnum flex h-8 min-w-8 items-center justify-center rounded-full bg-accent-400 px-2 text-xs font-bold text-brand-950">{c}</span>
                  ) : (
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-brand-600" aria-hidden>
                      <Plus size={18} />
                    </span>
                  )}
                </button>
              </li>
            );
          })}
          {list.length === 0 && <li className="p-8 text-center text-sm text-slate-500">Nenhum equipamento encontrado.</li>}
        </ul>
        <div className="rounded-t-[28px] bg-white p-4 shadow-[0_-8px_24px_-16px_rgb(15_18_63/.25)]">
          <button type="button" className="btn-primary btn-lg w-full rounded-full" onClick={onClose}>
            <Check size={17} aria-hidden /> {totalChosen > 0 ? `Pronto · ${totalChosen} ${totalChosen === 1 ? "unidade" : "unidades"}` : "Pronto"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
