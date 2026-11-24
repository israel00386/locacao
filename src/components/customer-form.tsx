"use client";
import { useActionState } from "react";
import { Check, LoaderCircle, Phone } from "lucide-react";
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
    <form action={formAction} className="space-y-4 p-5">
      <div>
        <label className="label" htmlFor="c-name">Nome</label>
        <input id="c-name" name="name" className="input" defaultValue={initial?.name} placeholder="Ex.: Roberto Ferreira - Boi Coto" aria-describedby="c-name-hint" required />
        <p id="c-name-hint" className="mt-1 text-xs text-slate-500">Pode incluir a obra, para diferenciar clientes com o mesmo nome.</p>
      </div>
      <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2">
        <div>
          <label className="label" htmlFor="c-phone">Telefone / WhatsApp</label>
          <div className="relative">
            <Phone className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
            <input id="c-phone" name="phone" className="input pl-9 tnum" inputMode="tel" autoComplete="tel" placeholder="(85) 99999-9999" defaultValue={initial?.phone ?? ""} />
          </div>
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
        <label className="label" htmlFor="c-notes">Observações</label>
        <textarea id="c-notes" name="notes" rows={3} className="input resize-y" placeholder="Condição especial, preço combinado…" defaultValue={initial?.notes ?? ""} />
      </div>
      {state.error && (
        <p role="alert" className="rounded-[14px] bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-800 ring-1 ring-red-200 ring-inset">
          {state.error}
        </p>
      )}
      <button className="btn-primary w-full rounded-[14px] sm:min-h-11" disabled={pending}>
        {pending ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Check className="size-4" strokeWidth={2.4} aria-hidden />}
        {pending ? "Salvando…" : initial ? "Salvar alterações" : "Cadastrar cliente"}
      </button>
    </form>
  );
}
