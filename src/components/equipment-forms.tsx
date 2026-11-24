"use client";
import { useActionState, useState } from "react";
import { CalendarDays, Check, ClipboardCheck, LoaderCircle, PackageMinus, PackagePlus } from "lucide-react";
import type { FormState } from "@/app/(app)/estoque/actions";

type Action = (state: FormState, form: FormData) => Promise<FormState>;

const fmt = (v: number | null) => (v == null ? "" : String(v).replace(".", ","));

function FormError({ children }: { children?: string }) {
  if (!children) return null;
  return (
    <p role="alert" className="rounded-[14px] bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-800 ring-1 ring-red-200 ring-inset">
      {children}
    </p>
  );
}

function SubmitButton({ pending, children, pendingText = "Salvando…" }: { pending: boolean; children: React.ReactNode; pendingText?: string }) {
  return (
    <button className="btn-primary w-full rounded-[14px] sm:min-h-11" disabled={pending}>
      {pending ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Check className="size-4" strokeWidth={2.4} aria-hidden />}
      {pending ? pendingText : children}
    </button>
  );
}

export function EquipmentForm({
  action,
  initial,
}: {
  action: Action;
  initial?: { name: string; maintenanceQty: number; priceDaily: number | null; priceWeekly: number | null; priceBiweekly: number | null; priceMonthly: number | null; active: boolean };
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="space-y-5 p-5">
      <div>
        <label className="label" htmlFor="name">Nome do equipamento</label>
        <input id="name" name="name" className="input" defaultValue={initial?.name} placeholder="Ex.: Andaime tubular 1,5 m" required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {!initial && (
          <div>
            <label className="label" htmlFor="totalQty">Quantidade total</label>
            <input id="totalQty" name="totalQty" className="input tnum" inputMode="numeric" defaultValue="0" />
          </div>
        )}
        <div>
          <label className="label" htmlFor="maintenanceQty">Em manutenção</label>
          <input id="maintenanceQty" name="maintenanceQty" className="input tnum" inputMode="numeric" defaultValue={initial?.maintenanceQty ?? 0} />
        </div>
      </div>

      <fieldset className="rounded-[18px] bg-slate-50 p-4 ring-1 ring-slate-200/70 ring-inset">
        <legend className="sr-only">Tabela de preços</legend>
        <div className="mb-3 flex items-baseline justify-between gap-2">
          <span className="text-sm font-semibold text-slate-900">Tabela de preços</span>
          <span className="text-xs text-slate-500">por unidade, por dia</span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(
            [
              ["priceDaily", "Diária", initial?.priceDaily],
              ["priceWeekly", "Semana (7+ dias)", initial?.priceWeekly],
              ["priceBiweekly", "Quinzena (15+)", initial?.priceBiweekly],
              ["priceMonthly", "Mês (30+)", initial?.priceMonthly],
            ] as const
          ).map(([n, l, v]) => (
            <div key={n}>
              <label className="mb-1 block text-xs font-medium text-slate-500" htmlFor={n}>{l}</label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm font-medium text-slate-400" aria-hidden>R$</span>
                <input id={n} name={n} className="input pl-9 tnum" inputMode="decimal" defaultValue={fmt(v ?? null)} placeholder="0,00" />
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs leading-relaxed text-slate-500">
          Na locação, a faixa é escolhida pela duração e o valor vem daqui. Dá para trocar por um valor especial em cada locação.
        </p>
      </fieldset>

      <label className="flex cursor-pointer items-center justify-between gap-4 rounded-[14px] px-1 py-1">
        <span>
          <span className="block text-sm font-semibold text-slate-900">Ativo</span>
          <span className="block text-xs text-slate-500">Aparece na lista ao montar uma locação</span>
        </span>
        <span className="relative inline-flex shrink-0">
          <input type="checkbox" name="active" defaultChecked={initial?.active ?? true} className="peer sr-only" />
          <span className="h-7 w-12 rounded-full bg-slate-300 transition-colors peer-checked:bg-brand-600 peer-focus-visible:ring-4 peer-focus-visible:ring-accent-400/60" aria-hidden />
          <span className="absolute top-1 left-1 size-5 rounded-full bg-white shadow-sm transition-transform duration-200 peer-checked:translate-x-5" aria-hidden />
        </span>
      </label>

      <FormError>{state.error}</FormError>
      <SubmitButton pending={pending}>{initial ? "Salvar alterações" : "Cadastrar equipamento"}</SubmitButton>
    </form>
  );
}

const KINDS = [
  { v: "COMPRA", l: "Entrada", icon: PackagePlus, on: "text-emerald-700", help: "Material novo que chegou: soma no total." },
  { v: "BAIXA", l: "Baixa", icon: PackageMinus, on: "text-rose-700", help: "Material perdido, vendido ou descartado: subtrai do total." },
  { v: "RECONTAGEM", l: "Recontagem", icon: ClipboardCheck, on: "text-brand-700", help: "" },
] as const;

export function StockEntryForm({ action, todayISO, total }: { action: Action; todayISO: string; total: number }) {
  const [state, formAction, pending] = useActionState(action, {});
  const [kind, setKind] = useState("COMPRA");
  const current = KINDS.find((k) => k.v === kind) ?? KINDS[0];
  return (
    <form action={formAction} key={state.ok ?? 0} className="space-y-4 px-5 pt-2 pb-5">
      <div className="grid grid-cols-3 gap-1 rounded-[14px] bg-slate-100 p-1 text-sm" role="radiogroup" aria-label="Tipo de lançamento">
        {KINDS.map((k) => {
          const Icon = k.icon;
          const on = kind === k.v;
          return (
            <label
              key={k.v}
              className={`flex min-h-10 cursor-pointer items-center justify-center gap-1.5 rounded-[10px] px-1 font-semibold transition-all duration-150 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-600 ${
                on ? `bg-white shadow-sm ${k.on}` : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <input type="radio" name="kind" value={k.v} checked={on} onChange={() => setKind(k.v)} className="sr-only" />
              <Icon className="size-4 shrink-0" strokeWidth={2} aria-hidden />
              <span className="truncate">{k.l}</span>
            </label>
          );
        })}
      </div>
      <p className="text-xs text-slate-500">
        {kind === "RECONTAGEM" ? (
          <>
            Contou tudo de novo? Informe o total contado (hoje: <span className="font-semibold text-slate-700 tnum">{total}</span>).
          </>
        ) : (
          current.help
        )}
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="qty">{kind === "RECONTAGEM" ? "Total contado" : "Quantidade"}</label>
          <input id="qty" name="qty" className="input tnum" inputMode="numeric" placeholder="0" required />
        </div>
        <div>
          <label className="label" htmlFor="sdate">
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="size-3.5" aria-hidden /> Data
            </span>
          </label>
          <input id="sdate" name="date" type="date" className="input" defaultValue={todayISO} />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="snote">Observação</label>
        <input id="snote" name="note" className="input" placeholder="Fornecedor, nota fiscal, motivo…" />
      </div>
      <FormError>{state.error}</FormError>
      <SubmitButton pending={pending}>Lançar {current.l.toLowerCase()}</SubmitButton>
    </form>
  );
}
