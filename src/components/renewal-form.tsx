"use client";
import { useActionState } from "react";
import type { ActionResult } from "@/app/(app)/locacoes/actions";
import { addDays, fmtDate, parseISODate, toISODate } from "@/lib/dates";

export function RenewalForm({ action, previousEnd, days, amount }: {
  action: (form: FormData) => Promise<ActionResult>;
  previousEnd: string; days: number; amount: number;
}) {
  const [state, formAction, pending] = useActionState<ActionResult & { ok?: boolean }, FormData>(async (_, form) => {
    const result = await action(form);
    return result.error ? result : { ok: true };
  }, {});
  const start = addDays(parseISODate(previousEnd)!, 1);
  const end = toISODate(addDays(start, days - 1));
  return <details id="renovacao" className="rounded-2xl border border-slate-200 p-4">
    <summary className="cursor-pointer font-semibold text-brand-900">Renovar locação</summary>
    <form key={previousEnd} action={formAction} className="mt-4 space-y-4">
      <p className="text-sm text-slate-600">Mantém os equipamentos na obra. O novo período começa em {fmtDate(start)}, no dia seguinte ao anterior. A renovação só ocorre ao confirmar.</p>
      <input type="hidden" name="previousEnd" value={previousEnd} />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="label">Término do novo período<input required type="date" name="endDate" min={toISODate(start)} defaultValue={end} className="input" /></label>
        <label className="label">Vencimento da cobrança<input required type="date" name="dueDate" defaultValue={end} className="input" /></label>
      </div>
      <label className="label">Valor fechado da renovação (R$)<input required name="amount" inputMode="decimal" defaultValue={amount.toFixed(2).replace(".", ",")} className="input" /></label>
      <p className="text-xs text-slate-500">Revise o valor se alterar o prazo. A devolução antecipada mantém o valor contratado. Pagamentos abatem os períodos mais antigos primeiro. Dias excedentes continuam opcionais e só contam após o último período.</p>
      {state.error && <p role="alert" className="text-sm text-red-700">{state.error}</p>}
      {state.ok && <p role="status" className="text-sm text-emerald-700">Renovação registrada. Períodos anteriores preservados.</p>}
      <button disabled={pending} className="btn-primary w-full">{pending ? "Renovando…" : "Confirmar renovação"}</button>
    </form>
  </details>;
}
