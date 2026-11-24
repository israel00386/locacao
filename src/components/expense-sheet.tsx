"use client";
import { useEffect, useId, useMemo, useState, useTransition, type ReactNode } from "react";
import { createPortal } from "react-dom";
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
function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
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
      <button type="button" aria-label="Fechar" className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div className="relative flex max-h-[92dvh] w-full flex-col rounded-t-2xl bg-white shadow-xl sm:max-w-lg sm:rounded-2xl">
        <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-slate-200 sm:hidden" />
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
          <h2 className="text-base font-semibold">{title}</h2>
          <button type="button" onClick={onClose} className="btn-ghost btn-sm" aria-label="Fechar">✕</button>
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
    <form action={submit} className="space-y-4 p-4">
      <fieldset>
        <legend className="label">Categoria</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {EXPENSE_CATEGORIES.map((c) => (
            <label
              key={c.value}
              className={`flex cursor-pointer flex-col rounded-xl px-3 py-2 text-sm ring-1 transition ${
                category === c.value ? "bg-brand-50 font-semibold text-brand-700 ring-2 ring-brand-500" : "bg-white text-slate-700 ring-slate-300 hover:bg-slate-50"
              }`}
            >
              <input type="radio" name="category" value={c.value} checked={category === c.value} onChange={() => setCategory(c.value)} className="sr-only" />
              <span className="flex items-center gap-1.5">
                <span className={`inline-block size-2 shrink-0 rounded-full ${c.color}`} />
                {c.label}
              </span>
              {c.hint && <span className="text-[11px] font-normal text-slate-500">{c.hint}</span>}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor={id("amount")}>Valor</label>
          <input
            id={id("amount")}
            name="amount"
            className="input tnum"
            inputMode="decimal"
            placeholder="0,00"
            required
            defaultValue={expense ? expense.amount.toFixed(2).replace(".", ",") : ""}
          />
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
          <input
            type="search"
            className="input mb-2"
            placeholder="Buscar locação, cliente ou endereço…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Buscar locação"
          />
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

      {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800 ring-1 ring-red-200">{error}</p>}

      <div className="flex flex-col gap-2 sm:flex-row-reverse">
        <button className="btn-primary w-full sm:w-auto sm:flex-1" disabled={pending}>
          {pending ? "Salvando…" : expense ? "Salvar alterações" : "Adicionar despesa"}
        </button>
        {expense && (
          <button type="button" className="btn-danger w-full sm:w-auto" onClick={remove} disabled={pending}>
            Excluir
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
  children = "+ Nova despesa",
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
        <Sheet title="Nova despesa" onClose={() => setOpen(false)}>
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
    <span className="flex items-center gap-1">
      <button type="button" className="btn-ghost btn-sm" onClick={() => setOpen(true)} disabled={pending}>
        Editar
      </button>
      <button
        type="button"
        className="btn-ghost btn-sm text-red-700 hover:bg-red-50"
        disabled={pending}
        onClick={() => {
          if (!window.confirm("Excluir esta despesa? Não dá para desfazer.")) return;
          start(async () => {
            const r = await deleteExpense(expense.id);
            if (r.error) window.alert(r.error);
          });
        }}
      >
        {pending ? "…" : "Excluir"}
      </button>
      {open && (
        <Sheet title="Editar despesa" onClose={() => setOpen(false)}>
          <ExpenseForm expense={expense} rentals={rentals} todayISO={todayISO} onDone={() => setOpen(false)} />
        </Sheet>
      )}
    </span>
  );
}
