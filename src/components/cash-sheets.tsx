"use client";
import { useId, useState, useTransition, type ReactNode } from "react";
import { ArrowDownLeft, ArrowUpRight, Check, LoaderCircle, Pencil, Settings2, Trash2 } from "lucide-react";
import { addCashEntry, deleteCashEntry, setCashOpening, updateCashEntry } from "@/app/(app)/financeiro/actions";
import { PAYMENT_METHODS } from "@/lib/expense-categories";
import { FormAlert, Sheet } from "./sheet";

export interface CashEntryValues {
  id: string;
  date: string;
  kind: "ENTRADA" | "SAIDA";
  description: string;
  amount: number;
  method: string | null;
}

const KIND_INFO = {
  ENTRADA: {
    title: "Entrada no caixa",
    subtitle: "Aporte, empréstimo, venda avulsa…",
    icon: ArrowDownLeft,
    iconClass: "bg-emerald-50 text-emerald-600",
    placeholder: "Ex.: aporte do sócio, venda de sucata",
  },
  SAIDA: {
    title: "Saída do caixa",
    subtitle: "Retirada do dono, depósito no banco, ajuste…",
    icon: ArrowUpRight,
    iconClass: "bg-rose-50 text-rose-600",
    placeholder: "Ex.: retirada do dono, pró-labore",
  },
} as const;

export function CashEntryForm({ entry, kind: initialKind, todayISO, onDone, fixedKind = false }: { entry?: CashEntryValues; kind: "ENTRADA" | "SAIDA"; todayISO: string; onDone: () => void; fixedKind?: boolean }) {
  const uid = useId();
  const [kind, setKind] = useState(entry?.kind ?? initialKind);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const id = (s: string) => `${uid}-${s}`;

  const submit = (form: FormData) => {
    setError(null);
    start(async () => {
      const r = entry ? await updateCashEntry(entry.id, form) : await addCashEntry(form);
      if (r.error) setError(r.error);
      else onDone();
    });
  };
  const remove = () => {
    if (!entry || !window.confirm("Excluir esta movimentação? Não dá para desfazer.")) return;
    start(async () => {
      const r = await deleteCashEntry(entry.id);
      if (r.error) setError(r.error);
      else onDone();
    });
  };

  return (
    <form action={submit} className="space-y-5 px-5 pt-1 pb-5 sm:px-6">
      {fixedKind && <input type="hidden" name="kind" value={kind} />}
      <div className={`grid grid-cols-2 gap-1 rounded-full bg-slate-100 p-1 ${fixedKind ? "hidden" : ""}`} role="radiogroup" aria-label="Tipo">
        {(["ENTRADA", "SAIDA"] as const).map((k) => {
          const on = kind === k;
          const Icon = KIND_INFO[k].icon;
          return (
            <label
              key={k}
              className={`flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-full text-sm font-semibold transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-600 ${
                on ? `bg-white shadow-sm ${k === "ENTRADA" ? "text-emerald-700" : "text-rose-700"}` : "text-slate-500"
              }`}
            >
              <input type="radio" name={fixedKind ? undefined : "kind"} value={k} checked={on} onChange={() => setKind(k)} className="sr-only" />
              <Icon className="size-4" strokeWidth={2.2} aria-hidden />
              {k === "ENTRADA" ? "Entrada" : "Saída"}
            </label>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor={id("amount")}>Valor</label>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm font-semibold text-slate-400" aria-hidden>R$</span>
            <input
              id={id("amount")}
              name="amount"
              className="input pl-9 font-semibold tnum"
              inputMode="decimal"
              placeholder="0,00"
              required
              defaultValue={entry ? entry.amount.toFixed(2).replace(".", ",") : ""}
            />
          </div>
        </div>
        <div>
          <label className="label" htmlFor={id("date")}>Data</label>
          <input id={id("date")} type="date" name="date" className="input" required defaultValue={entry?.date ?? todayISO} />
        </div>
      </div>

      <div>
        <label className="label" htmlFor={id("desc")}>Descrição</label>
        <input id={id("desc")} name="description" className="input" maxLength={200} required placeholder={KIND_INFO[kind].placeholder} defaultValue={entry?.description ?? ""} />
      </div>

      <div>
        <label className="label" htmlFor={id("method")}>Forma</label>
        <select id={id("method")} name="method" className="input" defaultValue={entry ? entry.method ?? "" : "Dinheiro"}>
          <option value="">—</option>
          {PAYMENT_METHODS.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
      </div>

      <p className="rounded-[16px] bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-500">
        {fixedKind
          ? "Dinheiro que entrou no caixa sem ser pagamento de locação: aporte, venda avulsa, empréstimo, ajuste. Pagamentos de clientes entram sozinhos pela locação."
          : "Use para o que não é recebimento de locação nem despesa: aporte, retirada do dono, ajuste de diferença. Pagamentos de clientes entram sozinhos pela locação."}
      </p>

      <FormAlert>{error}</FormAlert>
      <div className="flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row-reverse">
        <button className="btn-primary w-full rounded-full sm:w-auto sm:flex-1" disabled={pending}>
          {pending ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Check className="size-4" strokeWidth={2.4} aria-hidden />}
          {pending ? "Salvando…" : entry ? "Salvar alterações" : kind === "ENTRADA" ? "Registrar entrada" : "Registrar saída"}
        </button>
        {entry && (
          <button type="button" className="btn-danger w-full rounded-full sm:w-auto" onClick={remove} disabled={pending}>
            <Trash2 className="size-4" aria-hidden /> Excluir
          </button>
        )}
      </div>
    </form>
  );
}

/** Botão "+ Entrada" / "+ Saída" do caixa. */
export function CashEntryButton({ kind, todayISO, className, children }: { kind: "ENTRADA" | "SAIDA"; todayISO: string; className: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const info = KIND_INFO[kind];
  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        {children}
      </button>
      {open && (
        <Sheet title={info.title} subtitle={info.subtitle} icon={info.icon} iconClass={info.iconClass} onClose={() => setOpen(false)}>
          <CashEntryForm kind={kind} todayISO={todayISO} onDone={() => setOpen(false)} />
        </Sheet>
      )}
    </>
  );
}

/** Botão transparente sobre a linha do extrato (o <li> precisa de `relative`). */
export function CashEntryRowButton({ entry, todayISO, label }: { entry: CashEntryValues; todayISO: string; label: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="absolute inset-0 z-[1] w-full cursor-pointer" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-label={label} />
      {open && (
        <Sheet title="Editar movimentação" subtitle="Altere os dados ou exclua o lançamento" icon={Pencil} onClose={() => setOpen(false)}>
          <CashEntryForm entry={entry} kind={entry.kind} todayISO={todayISO} onDone={() => setOpen(false)} />
        </Sheet>
      )}
    </>
  );
}

/** Configuração do saldo inicial do caixa. */
export function OpeningBalanceButton({
  balance,
  date,
  todayISO,
  className,
  children,
  label = "Saldo inicial do caixa",
}: {
  balance: number;
  date: string | null;
  todayISO: string;
  className: string;
  children?: ReactNode;
  label?: string;
}) {
  const uid = useId();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const submit = (form: FormData) => {
    setError(null);
    start(async () => {
      const r = await setCashOpening(form);
      if (r.error) setError(r.error);
      else setOpen(false);
    });
  };
  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)} aria-label={label} title={label}>
        {children ?? <Settings2 strokeWidth={2} />}
      </button>
      {open && (
        <Sheet title="Saldo inicial do caixa" subtitle="O ponto de partida das contas" icon={Settings2} iconClass="bg-accent-100 text-accent-800" onClose={() => setOpen(false)}>
          <form action={submit} className="space-y-5 px-5 pt-1 pb-5 sm:px-6">
            <div className="rounded-[18px] bg-brand-50/70 px-4 py-3.5 text-[13px] leading-relaxed text-brand-900">
              Conte o dinheiro que a empresa tem hoje (gaveta + conta) e informe aqui com a data. A partir dessa data o sistema
              <strong> soma</strong> os pagamentos recebidos e as entradas, e <strong>subtrai</strong> as despesas e as saídas. Lançamentos com data anterior
              não mexem no saldo. Deixe a data vazia para contar tudo desde o primeiro lançamento.
            </div>
            <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2">
              <div>
                <label className="label" htmlFor={`${uid}-bal`}>Saldo no início do dia</label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm font-semibold text-slate-400" aria-hidden>R$</span>
                  <input
                    id={`${uid}-bal`}
                    name="balance"
                    className="input pl-9 font-semibold tnum"
                    inputMode="decimal"
                    placeholder="0,00"
                    defaultValue={balance ? balance.toFixed(2).replace(".", ",") : ""}
                  />
                </div>
              </div>
              <div>
                <label className="label" htmlFor={`${uid}-date`}>Data de abertura</label>
                <input id={`${uid}-date`} name="date" type="date" className="input" defaultValue={date ?? todayISO} />
              </div>
            </div>
            <FormAlert>{error}</FormAlert>
            <div className="border-t border-slate-100 pt-4">
              <button className="btn-primary w-full rounded-full" disabled={pending}>
                {pending ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Check className="size-4" strokeWidth={2.4} aria-hidden />}
                {pending ? "Salvando…" : "Salvar saldo inicial"}
              </button>
            </div>
          </form>
        </Sheet>
      )}
    </>
  );
}
