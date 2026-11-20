"use client";
import { useActionState, useState } from "react";
import type { FormState } from "@/app/(app)/estoque/actions";

type Action = (state: FormState, form: FormData) => Promise<FormState>;

const fmt = (v: number | null) => (v == null ? "" : String(v).replace(".", ","));

export function EquipmentForm({
  action,
  initial,
}: {
  action: Action;
  initial?: { name: string; maintenanceQty: number; priceDaily: number | null; priceWeekly: number | null; priceBiweekly: number | null; priceMonthly: number | null; active: boolean };
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="space-y-3 p-4">
      <div>
        <label className="label" htmlFor="name">Nome</label>
        <input id="name" name="name" className="input" defaultValue={initial?.name} required />
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
      <fieldset>
        <legend className="label">Tabela de preços — valor por unidade por dia</legend>
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
              <label className="mb-1 block text-[11px] text-slate-500" htmlFor={n}>{l}</label>
              <input id={n} name={n} className="input tnum" inputMode="decimal" defaultValue={fmt(v ?? null)} placeholder="R$ 0,00" />
            </div>
          ))}
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Na locação, a faixa é escolhida pela duração e o valor vem daqui. Dá para trocar por um valor especial em cada locação.
        </p>
      </fieldset>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="active" defaultChecked={initial?.active ?? true} className="h-4 w-4 accent-brand-600" />
        Ativo (aparece na lista de locação)
      </label>
      {state.error && <p className="text-sm text-red-700">{state.error}</p>}
      <button className="btn-primary w-full" disabled={pending}>{pending ? "Salvando…" : "Salvar"}</button>
    </form>
  );
}

export function StockEntryForm({ action, todayISO, total }: { action: Action; todayISO: string; total: number }) {
  const [state, formAction, pending] = useActionState(action, {});
  const [kind, setKind] = useState("COMPRA");
  return (
    <form action={formAction} key={state.ok ?? 0} className="space-y-3 p-4">
      <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1 text-sm">
        {[
          ["COMPRA", "Entrada"],
          ["BAIXA", "Baixa"],
          ["RECONTAGEM", "Recontagem"],
        ].map(([v, l]) => (
          <label key={v} className={`cursor-pointer rounded-lg py-1.5 text-center font-medium ${kind === v ? "bg-white shadow-sm" : "text-slate-600"}`}>
            <input type="radio" name="kind" value={v} checked={kind === v} onChange={() => setKind(v)} className="sr-only" />
            {l}
          </label>
        ))}
      </div>
      <p className="text-xs text-slate-500">
        {kind === "COMPRA" && "Material novo que chegou: soma no total."}
        {kind === "BAIXA" && "Material perdido, vendido ou descartado: subtrai do total."}
        {kind === "RECONTAGEM" && `Contou tudo de novo? Informe o total contado (hoje: ${total}).`}
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="qty">{kind === "RECONTAGEM" ? "Total contado" : "Quantidade"}</label>
          <input id="qty" name="qty" className="input tnum" inputMode="numeric" required />
        </div>
        <div>
          <label className="label" htmlFor="sdate">Data</label>
          <input id="sdate" name="date" type="date" className="input" defaultValue={todayISO} />
        </div>
      </div>
      <input name="note" className="input" placeholder="Observação (fornecedor, nota…)" />
      {state.error && <p className="text-sm text-red-700">{state.error}</p>}
      <button className="btn-primary w-full" disabled={pending}>{pending ? "Salvando…" : "Lançar"}</button>
    </form>
  );
}
