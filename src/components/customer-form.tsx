"use client";
import { useActionState } from "react";
import { CUSTOMER_STATUSES, CUSTOMER_TYPES } from "@/lib/format";
import type { FormState } from "@/app/(app)/clientes/actions";

export function CustomerForm({
  action,
  initial,
}: {
  action: (s: FormState, f: FormData) => Promise<FormState>;
  initial?: { name: string; responsible: string | null; phone: string | null; type: string; status: string; notes: string | null };
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="space-y-3 p-4">
      <div>
        <label className="label" htmlFor="c-name">Nome (pode incluir a obra, ex.: “Roberto Ferreira - Boi Coto”)</label>
        <input id="c-name" name="name" className="input" defaultValue={initial?.name} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="c-phone">Telefone</label>
          <input id="c-phone" name="phone" className="input" inputMode="tel" defaultValue={initial?.phone ?? ""} />
        </div>
        <div>
          <label className="label" htmlFor="c-resp">Responsável na obra</label>
          <input id="c-resp" name="responsible" className="input" defaultValue={initial?.responsible ?? ""} />
        </div>
        <div>
          <label className="label" htmlFor="c-type">Tipo</label>
          <select id="c-type" name="type" className="input" defaultValue={initial?.type ?? "Cliente"}>
            {CUSTOMER_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="c-status">Situação</label>
          <select id="c-status" name="status" className="input" defaultValue={initial?.status ?? "Ativo"}>
            {CUSTOMER_STATUSES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="label" htmlFor="c-notes">Observações (condição especial, preço combinado…)</label>
        <textarea id="c-notes" name="notes" rows={2} className="input" defaultValue={initial?.notes ?? ""} />
      </div>
      {state.error && <p className="text-sm text-red-700">{state.error}</p>}
      <button className="btn-primary w-full" disabled={pending}>{pending ? "Salvando…" : "Salvar"}</button>
    </form>
  );
}
