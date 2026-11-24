"use client";
import { useActionState, useRef, useState, useTransition } from "react";
import type { ActionResult } from "@/app/(app)/locacoes/actions";
import { fmtDateShort, inclusiveDays, parseISODate } from "@/lib/dates";

/** Botão que chama uma server action, com confirmação opcional. */
export function ActionButton({
  action,
  children,
  confirm,
  className = "btn-secondary",
}: {
  action: () => Promise<ActionResult | void>;
  children: React.ReactNode;
  confirm?: string;
  className?: string;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <span className="contents">
      <button
        type="button"
        className={className}
        disabled={pending}
        onClick={() => {
          if (confirm && !window.confirm(confirm)) return;
          setError(null);
          start(async () => {
            const r = await action();
            if (r && r.error) setError(r.error);
          });
        }}
      >
        {pending ? "Aguarde…" : children}
      </button>
      {error && <span className="basis-full text-sm text-red-700">{error}</span>}
    </span>
  );
}

export interface ReturnRow {
  id: string;
  name: string;
  outstanding: number;
  suggestedDays: number;
  /** Retirada do item (a do acréscimo, se for acréscimo). AAAA-MM-DD */
  startISO: string;
  addition?: boolean;
}

export function ReturnForm({
  action,
  items,
  todayISO,
  startISO,
}: {
  action: (form: FormData) => Promise<ActionResult>;
  items: ReturnRow[];
  todayISO: string;
  startISO: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [qty, setQty] = useState<Record<string, string>>({});
  const [date, setDate] = useState(todayISO);
  const retDate = parseISODate(date);
  const [state, formAction, pending] = useActionState<ActionResult & { ok?: number }, FormData>(async (_prev, form) => {
    const r = await action(form);
    if (!r.error) {
      setQty({});
      return { ok: Date.now() };
    }
    return r;
  }, {});
  const open = items.filter((i) => i.outstanding > 0);
  if (!open.length) return <p className="px-4 py-4 text-sm text-slate-500">Todo o material já voltou.</p>;
  return (
    <form ref={formRef} action={formAction} className="space-y-3 p-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="label" htmlFor="ret-date">Data da devolução</label>
          <input id="ret-date" type="date" name="date" value={date} onChange={(e) => setDate(e.target.value)} min={startISO} className="input" />
        </div>
        <button
          type="button"
          className="btn-secondary btn-sm mb-1"
          onClick={() => setQty(Object.fromEntries(open.map((i) => [i.id, String(i.outstanding)])))}
        >
          Devolver tudo
        </button>
      </div>
      <ul className="divide-y divide-slate-100 rounded-xl ring-1 ring-slate-200">
        {open.map((i) => (
          <li key={i.id} className="flex flex-wrap items-center gap-2 px-3 py-2.5">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium">{i.name}</div>
              <div className="text-xs text-slate-500">
                {i.outstanding} na obra
                {i.addition ? ` · acréscimo, retirada ${fmtDateShort(parseISODate(i.startISO))}` : ""}
              </div>
            </div>
            <input
              name={`qty_${i.id}`}
              className="input w-20 text-center tnum"
              inputMode="numeric"
              placeholder="0"
              value={qty[i.id] ?? ""}
              onChange={(e) => setQty({ ...qty, [i.id]: e.target.value.replace(/\D/g, "") })}
              aria-label={`Quantidade devolvida de ${i.name}`}
            />
            <details className="basis-full text-xs text-slate-500">
              <summary className="cursor-pointer select-none">Cobrar outro nº de dias</summary>
              <input
                name={`days_${i.id}`}
                className="input mt-1 w-28 tnum"
                inputMode="numeric"
                placeholder={retDate ? `auto: ${inclusiveDays(parseISODate(i.startISO)!, retDate)}` : "automático"}
              />
            </details>
          </li>
        ))}
      </ul>
      <input name="note" className="input" placeholder="Observação (opcional): quem recebeu, avaria…" />
      {state.error && <p className="text-sm text-red-700">{state.error}</p>}
      {state.ok && <p className="text-sm text-brand-700">Devolução registrada. O material voltou para o estoque.</p>}
      <button className="btn-primary w-full" disabled={pending}>
        {pending ? "Registrando…" : "Registrar devolução"}
      </button>
    </form>
  );
}

export function PaymentForm({
  action,
  open,
  todayISO,
}: {
  action: (form: FormData) => Promise<ActionResult>;
  open: number;
  todayISO: string;
}) {
  const [key, setKey] = useState(0);
  const [state, formAction, pending] = useActionState<ActionResult & { ok?: number }, FormData>(async (_prev, form) => {
    const r = await action(form);
    if (!r.error) {
      setKey((k) => k + 1);
      return { ok: Date.now() };
    }
    return r;
  }, {});
  return (
    <form key={key} action={formAction} className="space-y-3 p-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="pay-amount">Valor recebido</label>
          <input
            id="pay-amount"
            name="amount"
            className="input tnum"
            inputMode="decimal"
            defaultValue={open > 0 ? open.toFixed(2).replace(".", ",") : ""}
            placeholder="0,00"
          />
        </div>
        <div>
          <label className="label" htmlFor="pay-date">Data</label>
          <input id="pay-date" type="date" name="date" defaultValue={todayISO} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="pay-method">Forma</label>
          <select id="pay-method" name="method" className="input" defaultValue="Pix">
            <option>Pix</option>
            <option>Dinheiro</option>
            <option>Cartão</option>
            <option>Transferência</option>
            <option>Outro</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="pay-note">Observação</label>
          <input id="pay-note" name="note" className="input" placeholder="opcional" />
        </div>
      </div>
      {state.error && <p className="text-sm text-red-700">{state.error}</p>}
      {state.ok && <p className="text-sm text-brand-700">Pagamento registrado.</p>}
      <button className="btn-primary w-full" disabled={pending}>
        {pending ? "Salvando…" : "Registrar pagamento"}
      </button>
    </form>
  );
}

export function ShareQuote({ url, whatsappUrl }: { url: string; whatsappUrl: string | null }) {
  const [copied, setCopied] = useState(false);
  return (
    <>
      {whatsappUrl ? (
        <a href={whatsappUrl} target="_blank" rel="noreferrer" className="btn-primary">
          Enviar no WhatsApp
        </a>
      ) : (
        <button
          type="button"
          className="btn-primary"
          onClick={async () => {
            if (navigator.share) await navigator.share({ url }).catch(() => {});
            else {
              await navigator.clipboard.writeText(url);
              setCopied(true);
            }
          }}
        >
          {copied ? "Link copiado" : "Compartilhar orçamento"}
        </button>
      )}
      <a href={url} target="_blank" rel="noreferrer" className="btn-secondary">
        Ver orçamento / PDF
      </a>
    </>
  );
}
