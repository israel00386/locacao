"use client";
import { useEffect, useId, useMemo, useState, useTransition, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Check, LoaderCircle, Pencil, Plus, ReceiptText, Search, Trash2, X } from "lucide-react";
import { categoryIcon } from "@/components/finance-ui";
import { addExpense, deleteExpense, updateExpense } from "@/app/(app)/financeiro/actions";
import { EXPENSE_CATEGORIES, PAYMENT_METHODS } from "@/lib/expense-categories";

export interface ExpenseFormValues {
  id: string;
  date: string;
  category: string;
  description: string;
  amount: number;
  method: string | null;
  rentalId: string | null;
}

export interface ExpenseRentalOption {
  id: string;
  label: string;
}

/** Painel que sobe de baixo no celular e fica centralizado no computador. */
function Sheet({ title, subtitle, onClose, children }: { title: string; subtitle?: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);
  // Portal: fica fora de containers com transform/animação, que quebrariam o position: fixed.
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
      <button
        type="button"
        aria-label="Fechar"
        className="absolute inset-0 animate-[fade-in_.2s_ease-out_backwards] bg-brand-950/45 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div className="relative flex max-h-[92dvh] w-full animate-[rise_.32s_cubic-bezier(.2,.8,.2,1)_backwards] flex-col rounded-t-[28px] bg-white shadow-[0_-12px_40px_-12px_rgb(8_8_42/.35)] sm:max-w-lg sm:rounded-[24px] sm:shadow-2xl">
        <div className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-slate-200 sm:hidden" aria-hidden />
        <div className="flex items-center gap-3 px-5 pt-3 pb-3 sm:pt-5">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600" aria-hidden>
            <ReceiptText className="size-5" strokeWidth={1.9} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg leading-tight font-bold tracking-[-0.01em] text-slate-900">{title}</h2>
            {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-800 active:scale-95"
            aria-label="Fechar"
          >
            <X className="size-[18px]" strokeWidth={2.2} />
          </button>
        </div>
        <div className="overflow-y-auto overscroll-contain pb-[env(safe-area-inset-bottom)]">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

function ExpenseForm({
  expense,
  rentals,
  todayISO,
  defaultRentalId,
  onDone,
}: {
  expense?: ExpenseFormValues;
  rentals: ExpenseRentalOption[];
  todayISO: string;
  defaultRentalId?: string;
  onDone: () => void;
}) {
  const uid = useId();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState(expense?.category ?? "ENTREGA");
  const [rentalId, setRentalId] = useState(expense?.rentalId ?? defaultRentalId ?? "");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q ? rentals.filter((r) => r.label.toLowerCase().includes(q)) : rentals;
    // A locação escolhida continua na lista mesmo quando não bate com a busca.
    const chosen = rentals.find((r) => r.id === rentalId);
    return chosen && !list.includes(chosen) ? [chosen, ...list] : list;
  }, [rentals, search, rentalId]);

  const submit = (form: FormData) => {
    setError(null);
    start(async () => {
      const r = expense ? await updateExpense(expense.id, form) : await addExpense(form);
      if (r.error) setError(r.error);
      else onDone();
    });
  };

  const remove = () => {
    if (!expense || !window.confirm("Excluir esta despesa? Não dá para desfazer.")) return;
    setError(null);
    start(async () => {
      const r = await deleteExpense(expense.id);
      if (r.error) setError(r.error);
      else onDone();
    });
  };

  const id = (s: string) => `${uid}-${s}`;
  return (
    <form action={submit} className="space-y-5 px-5 pt-1 pb-5">
      <fieldset>
        <legend className="label">Categoria</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {EXPENSE_CATEGORIES.map((c) => {
            const Icon = categoryIcon(c.value);
            const on = category === c.value;
            return (
              <label
                key={c.value}
                className={`relative flex min-h-[60px] cursor-pointer items-center gap-2.5 rounded-[14px] px-2.5 py-2 text-sm ring-1 transition duration-150 ring-inset has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-600 active:scale-[.98] ${
                  on ? "bg-brand-50/70 text-brand-900 ring-2 ring-brand-600" : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50"
                }`}
              >
                <input type="radio" name="category" value={c.value} checked={on} onChange={() => setCategory(c.value)} className="sr-only" />
                <span className={`flex size-8 shrink-0 items-center justify-center rounded-[10px] transition-colors ${on ? "bg-brand-600 text-white" : c.tile}`} aria-hidden>
                  <Icon className="size-4" strokeWidth={2} />
                </span>
                <span className="min-w-0">
                  <span className={`block leading-tight ${on ? "font-semibold" : "font-medium"}`}>{c.label}</span>
                  {c.hint && <span className="block truncate text-[11px] font-normal text-slate-500">{c.hint}</span>}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

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
              defaultValue={expense ? expense.amount.toFixed(2).replace(".", ",") : ""}
            />
          </div>
        </div>
        <div>
          <label className="label" htmlFor={id("date")}>Data</label>
          <input id={id("date")} type="date" name="date" className="input" required defaultValue={expense?.date ?? todayISO} />
        </div>
      </div>

      <div>
        <label className="label" htmlFor={id("desc")}>Descrição</label>
        <input id={id("desc")} name="description" className="input" maxLength={300} placeholder="Ex.: frete caminhão, motorista João" defaultValue={expense?.description ?? ""} />
      </div>

      <div>
        <label className="label" htmlFor={id("method")}>Forma de pagamento</label>
        <select id={id("method")} name="method" className="input" defaultValue={expense ? expense.method ?? "" : "Pix"}>
          <option value="">—</option>
          {PAYMENT_METHODS.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="label" htmlFor={id("rental")}>Locação (opcional)</label>
        {rentals.length > 8 && (
          <div className="relative mb-2">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
            <input
              type="search"
              className="input pl-9"
              placeholder="Buscar locação, cliente ou endereço…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Buscar locação"
            />
          </div>
        )}
        <select id={id("rental")} name="rentalId" className="input" value={rentalId} onChange={(e) => setRentalId(e.target.value)}>
          <option value="">Nenhuma (despesa geral)</option>
          {filtered.map((r) => (
            <option key={r.id} value={r.id}>{r.label}</option>
          ))}
        </select>
        {search && filtered.length === 0 && <p className="mt-1 text-xs text-slate-500">Nenhuma locação encontrada.</p>}
        <p className="mt-1 text-xs text-slate-500">Ligue o frete à locação para ver o lucro do frete (taxa cobrada − gasto).</p>
      </div>

      {error && (
        <p role="alert" className="rounded-[14px] bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-800 ring-1 ring-red-200 ring-inset">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row-reverse">
        <button className="btn-primary w-full rounded-[14px] sm:w-auto sm:flex-1" disabled={pending}>
          {pending ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Check className="size-4" strokeWidth={2.4} aria-hidden />}
          {pending ? "Salvando…" : expense ? "Salvar alterações" : "Adicionar despesa"}
        </button>
        {expense && (
          <button type="button" className="btn-danger w-full rounded-[14px] sm:w-auto" onClick={remove} disabled={pending}>
            <Trash2 className="size-4" aria-hidden /> Excluir
          </button>
        )}
      </div>
    </form>
  );
}

/** Botão "+ Nova despesa" que abre o painel com o formulário. */
export function NewExpenseButton({
  rentals,
  todayISO,
  defaultRentalId,
  className = "btn-primary btn-sm",
  children = (
    <>
      <Plus className="size-4" strokeWidth={2.4} aria-hidden /> Nova despesa
    </>
  ),
}: {
  rentals: ExpenseRentalOption[];
  todayISO: string;
  defaultRentalId?: string;
  className?: string;
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        {children}
      </button>
      {open && (
        <Sheet title="Nova despesa" subtitle="Frete, combustível, manutenção, compras…" onClose={() => setOpen(false)}>
          <ExpenseForm rentals={rentals} todayISO={todayISO} defaultRentalId={defaultRentalId} onDone={() => setOpen(false)} />
        </Sheet>
      )}
    </>
  );
}

/** Ações de uma linha da lista: editar (abre o painel) e excluir (com confirmação). */
export function ExpenseRowActions({ expense, rentals, todayISO }: { expense: ExpenseFormValues; rentals: ExpenseRentalOption[]; todayISO: string }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  return (
    <span className="-mr-2 flex shrink-0 items-center">
      <button
        type="button"
        className="flex size-9 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 active:scale-95 disabled:opacity-50"
        onClick={() => setOpen(true)}
        disabled={pending}
        aria-label="Editar"
        title="Editar"
      >
        <Pencil className="size-4" aria-hidden />
      </button>
      <button
        type="button"
        aria-label="Excluir"
        title="Excluir"
        className="flex size-9 items-center justify-center rounded-full text-slate-400 transition hover:bg-red-50 hover:text-red-700 active:scale-95 disabled:opacity-50"
        disabled={pending}
        onClick={() => {
          if (!window.confirm("Excluir esta despesa? Não dá para desfazer.")) return;
          start(async () => {
            const r = await deleteExpense(expense.id);
            if (r.error) window.alert(r.error);
          });
        }}
      >
        {pending ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Trash2 className="size-4" aria-hidden />}
      </button>
      {open && (
        <Sheet title="Editar despesa" subtitle="Altere os dados ou exclua o lançamento" onClose={() => setOpen(false)}>
          <ExpenseForm expense={expense} rentals={rentals} todayISO={todayISO} onDone={() => setOpen(false)} />
        </Sheet>
      )}
    </span>
  );
}
