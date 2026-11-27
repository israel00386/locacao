"use client";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, CircleCheck, ExternalLink, Link2, Loader2, MessageCircle, Share2, Undo2 } from "lucide-react";
import type { ActionResult } from "@/app/(app)/locacoes/actions";
import { fmtDateShort, inclusiveDays, parseISODate, weekday } from "@/lib/dates";
import { returnDaysFor } from "@/lib/calc";
import { money } from "@/lib/format";

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
        aria-busy={pending || undefined}
        onClick={() => {
          if (confirm && !window.confirm(confirm)) return;
          setError(null);
          start(async () => {
            const r = await action();
            if (r && r.error) setError(r.error);
          });
        }}
      >
        {pending ? (
          <>
            <Loader2 size={16} className="animate-spin" aria-hidden /> Aguarde…
          </>
        ) : (
          children
        )}
      </button>
      {error && <span className="basis-full text-sm text-red-700">{error}</span>}
    </span>
  );
}

function FormMessage({ error, ok }: { error?: string; ok?: string | false }) {
  if (error) return <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800 ring-1 ring-red-200 ring-inset">{error}</p>;
  if (ok)
    return (
      <p className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800 ring-1 ring-emerald-200 ring-inset">
        <CircleCheck size={16} className="shrink-0" aria-hidden /> {ok}
      </p>
    );
  return null;
}

export interface ReturnRow {
  id: string;
  name: string;
  outstanding: number;
  suggestedDays: number;
  /** Retirada do item (a do acréscimo, se for acréscimo). AAAA-MM-DD */
  startISO: string;
  /** Previsão do item (AAAA-MM-DD ou vazio): sem cobrar excedentes, a conta automática para nela. */
  endISO?: string;
  addition?: boolean;
}

export function ReturnForm({
  action,
  items,
  todayISO,
  startISO,
  chargeOverdue = false,
  fixedPeriods = false,
}: {
  action: (form: FormData) => Promise<ActionResult>;
  items: ReturnRow[];
  todayISO: string;
  startISO: string;
  chargeOverdue?: boolean;
  fixedPeriods?: boolean;
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
  if (!open.length)
    return (
      <div className="flex items-center gap-3 px-4 pb-5 text-sm text-slate-600 sm:px-5">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200 ring-inset">
          <Check size={16} aria-hidden />
        </span>
        Todo o material já voltou.
      </div>
    );
  const chosen = open.reduce((s, i) => s + (Number(qty[i.id]) || 0), 0);
  const allSet = open.every((i) => qty[i.id] === String(i.outstanding));
  return (
    <form ref={formRef} action={formAction} className="space-y-4 px-4 pb-5 sm:px-5">
      <div className="grid grid-cols-[1fr_auto] items-end gap-3">
        <div>
          <label className="label" htmlFor="ret-date">Data da devolução</label>
          <input id="ret-date" type="date" name="date" value={date} onChange={(e) => setDate(e.target.value)} min={startISO} className="input" />
        </div>
        <button
          type="button"
          className={`btn-sm mb-0.5 min-h-11 rounded-full px-3.5 sm:min-h-10 ${allSet ? "btn-primary" : "btn-secondary"}`}
          onClick={() => setQty(allSet ? {} : Object.fromEntries(open.map((i) => [i.id, String(i.outstanding)])))}
          aria-pressed={allSet}
        >
          {allSet ? <Check size={15} aria-hidden /> : <Undo2 size={15} aria-hidden />}
          Devolver tudo
        </button>
      </div>
      {retDate && <p className="-mt-2 text-xs text-slate-500">{weekday(retDate)}</p>}
      <ul className="space-y-2">
        {open.map((i) => {
          const v = Number(qty[i.id]) || 0;
          const over = v > i.outstanding;
          return (
            <li key={i.id} className={`rounded-[20px] px-3.5 py-3 transition-colors ${v > 0 ? "bg-brand-50 ring-1 ring-brand-100 ring-inset" : "bg-slate-50"}`}>
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-slate-900">
                    {i.name}
                    {i.addition && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold tracking-wide text-amber-800 uppercase">Acréscimo</span>
                    )}
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    <span className="tnum font-medium text-slate-700">{i.outstanding}</span> na obra
                    {i.addition ? ` · retirada ${fmtDateShort(parseISODate(i.startISO))}` : ""}
                  </div>
                </div>
                <div className={`flex items-center rounded-full bg-white shadow-[0_1px_2px_rgb(15_18_63/.05)] ring-1 ring-inset ${over ? "ring-red-300" : "ring-slate-200"}`}>
                  <input
                    name={`qty_${i.id}`}
                    className="tnum h-11 w-14 rounded-l-full border-0 bg-transparent px-0 text-center text-base font-semibold text-slate-900 outline-none placeholder:font-normal placeholder:text-slate-300"
                    inputMode="numeric"
                    placeholder="0"
                    value={qty[i.id] ?? ""}
                    onChange={(e) => setQty({ ...qty, [i.id]: e.target.value.replace(/\D/g, "") })}
                    aria-label={`Quantidade devolvida de ${i.name}`}
                  />
                  <span className="tnum pr-3 text-xs text-slate-400">/ {i.outstanding}</span>
                </div>
              </div>
              {!fixedPeriods && <details className="group mt-1.5 text-xs text-slate-500">
                <summary className="inline-flex min-h-8 cursor-pointer list-none items-center gap-1 select-none hover:text-slate-800 [&::-webkit-details-marker]:hidden">
                  <ChevronDown size={14} className="transition-transform group-open:rotate-180" aria-hidden />
                  Cobrar outro nº de dias
                </summary>
                <input
                  name={`days_${i.id}`}
                  className="input mt-1 w-32 tnum"
                  inputMode="numeric"
                  placeholder={retDate ? `auto: ${returnDaysFor(parseISODate(i.startISO)!, parseISODate(i.endISO), retDate, chargeOverdue)}` : "automático"}
                />
              </details>}
            </li>
          );
        })}
      </ul>
      <input name="note" className="input" placeholder="Observação (opcional): quem recebeu, avaria…" />
      <FormMessage error={state.error} ok={!!state.ok && "Devolução registrada. O material voltou para o estoque."} />
      <button className="btn-primary btn-lg w-full rounded-full" disabled={pending}>
        {pending ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Undo2 size={16} aria-hidden />}
        {pending ? "Registrando…" : chosen > 0 ? `Registrar devolução de ${chosen} ${chosen === 1 ? "unidade" : "unidades"}` : "Registrar devolução"}
      </button>
    </form>
  );
}

const METHODS = ["Pix", "Dinheiro", "Cartão", "Transferência", "Outro"];

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
    <form key={key} action={formAction} className="space-y-4 px-4 pt-2 pb-5 sm:px-5">
      <div>
        <label className="label" htmlFor="pay-amount">Valor recebido</label>
        <div className="relative">
          <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-sm font-semibold text-slate-400">R$</span>
          <input
            id="pay-amount"
            name="amount"
            className="input tnum min-h-14 rounded-[18px] pl-12 text-xl! font-bold tracking-[-0.01em]"
            inputMode="decimal"
            defaultValue={open > 0 ? open.toFixed(2).replace(".", ",") : ""}
            placeholder="0,00"
          />
        </div>
        {open > 0 && <p className="mt-1 text-xs text-slate-500">Em aberto: {money(open)}</p>}
      </div>
      <fieldset>
        <legend className="label">Forma</legend>
        <div className="flex flex-wrap gap-1.5">
          {METHODS.map((m) => (
            <label key={m} className="cursor-pointer">
              <input type="radio" name="method" value={m} defaultChecked={m === "Pix"} className="peer sr-only" />
              <span className="inline-flex min-h-10 items-center rounded-full bg-slate-100 px-3.5 text-[13px] font-semibold text-slate-600 transition-colors peer-checked:bg-brand-900 peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand-600 hover:bg-slate-200/70 peer-checked:hover:bg-brand-800">
                {m}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="pay-date">Data</label>
          <input id="pay-date" type="date" name="date" defaultValue={todayISO} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="pay-note">Observação</label>
          <input id="pay-note" name="note" className="input" placeholder="opcional" />
        </div>
      </div>
      <FormMessage error={state.error} ok={!!state.ok && "Pagamento registrado."} />
      <button className="btn-primary btn-lg w-full rounded-full" disabled={pending}>
        {pending ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Check size={16} aria-hidden />}
        {pending ? "Salvando…" : "Registrar pagamento"}
      </button>
    </form>
  );
}

/**
 * Enviar / ver o orçamento.
 * `tone="navy"`: botões sobre a faixa marinho. `tone="light"`: sobre fundo claro.
 */
export function ShareQuote({
  url,
  whatsappUrl,
  tone = "light",
  showView = true,
  className = "",
  mainClass,
}: {
  url: string;
  whatsappUrl: string | null;
  tone?: "navy" | "light";
  showView?: boolean;
  className?: string;
  /** Troca o estilo do botão principal (ex.: secundário na barra do celular). */
  mainClass?: string;
}) {
  const [copied, setCopied] = useState(false);
  const main = mainClass ?? (tone === "navy" ? "btn-accent" : "btn-primary");
  const second =
    tone === "navy" ? "btn bg-white/10 text-white ring-1 ring-white/20 ring-inset hover:bg-white/15 active:bg-white/20" : "btn-secondary";
  return (
    <>
      {whatsappUrl ? (
        <a href={whatsappUrl} target="_blank" rel="noreferrer" className={`${main} ${className}`}>
          <MessageCircle size={17} aria-hidden /> Enviar no WhatsApp
        </a>
      ) : (
        <button
          type="button"
          className={`${main} ${className}`}
          onClick={async () => {
            if (navigator.share) await navigator.share({ url }).catch(() => {});
            else {
              await navigator.clipboard.writeText(url);
              setCopied(true);
            }
          }}
        >
          {copied ? <Link2 size={17} aria-hidden /> : <Share2 size={17} aria-hidden />}
          {copied ? "Link copiado" : "Compartilhar documento"}
        </button>
      )}
      {showView && (
        <a href={url} target="_blank" rel="noreferrer" className={`${second} ${className}`}>
          <ExternalLink size={16} aria-hidden /> Ver documento / PDF
        </a>
      )}
    </>
  );
}

/**
 * Barra de ações fixa no celular, logo acima da barra inferior flutuante (~88px + safe-area).
 * Portal no <body>: fora do container animado da página (transform prende o position: fixed).
 */
export function MobileActionBar({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(
    <div className="no-print pointer-events-none fixed inset-x-0 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-20 px-3 lg:hidden">
      <div className="pointer-events-auto mx-auto flex max-w-lg gap-2 rounded-full bg-white/95 p-1.5 shadow-[0_12px_32px_-12px_rgb(15_18_63/.4),0_0_0_1px_rgb(15_18_63/.05)] backdrop-blur-md [&>*]:min-w-0 [&>*]:flex-1">
        {children}
      </div>
    </div>,
    document.body,
  );
}
