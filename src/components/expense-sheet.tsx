"use client";
import Link from "next/link";
import { useId, useMemo, useState, useTransition, type ReactNode } from "react";
import { Check, LoaderCircle, Pencil, Plus, Search, Settings2, Trash2 } from "lucide-react";
import { addExpense, deleteExpense, updateExpense } from "@/app/(app)/financeiro/actions";
import { colorStyle, PAYMENT_METHODS, selectableCategories, type ExpenseCategoryData } from "@/lib/expense-categories";
import { InlineCategoryCreator } from "./category-sheet";
import { iconFor } from "./finance-ui";
import { FormAlert, Sheet } from "./sheet";

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

interface Common {
  rentals: ExpenseRentalOption[];
  todayISO: string;
  /** Todas as categorias do banco (o formulário mostra as ativas + a atual). */
  categories: ExpenseCategoryData[];
}

function ExpenseForm({ expense, rentals, todayISO, categories, defaultRentalId, onDone }: Common & { expense?: ExpenseFormValues; defaultRentalId?: string; onDone: () => void }) {
  const uid = useId();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // Categorias criadas aqui aparecem antes do servidor devolver a lista nova.
  const [created, setCreated] = useState<ExpenseCategoryData[]>([]);
  const list = useMemo(() => {
    const all = [...categories, ...created.filter((c) => !categories.some((x) => x.id === c.id))];
    return selectableCategories(all, expense?.category);
  }, [categories, created, expense?.category]);
  const [category, setCategory] = useState(expense?.category ?? list[0]?.id ?? "");
  const [creating, setCreating] = useState(false);
  const [rentalId, setRentalId] = useState(expense?.rentalId ?? defaultRentalId ?? "");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const l = q ? rentals.filter((r) => r.label.toLowerCase().includes(q)) : rentals;
    // A locação escolhida continua na lista mesmo quando não bate com a busca.
    const chosen = rentals.find((r) => r.id === rentalId);
    return chosen && !l.includes(chosen) ? [chosen, ...l] : l;
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
    <form action={submit} className="space-y-5 px-5 pt-1 pb-5 sm:px-6">
      <fieldset>
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <legend className="label mb-0">Categoria</legend>
          <Link href="/financeiro/categorias" className="inline-flex min-h-9 items-center gap-1 rounded-full px-2 text-xs font-semibold text-brand-600 hover:bg-brand-50">
            <Settings2 className="size-3.5" aria-hidden /> Gerenciar
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {list.map((c) => {
            const Icon = iconFor(c.icon);
            const on = category === c.id;
            return (
              <label
                key={c.id}
                className={`relative flex min-h-[56px] cursor-pointer items-center gap-2.5 rounded-[16px] px-2.5 py-2 text-sm transition duration-150 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-600 active:scale-[.98] ${
                  on ? "bg-brand-50/80 text-brand-950 ring-2 ring-brand-600 ring-inset" : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <input type="radio" name="category" value={c.id} checked={on} onChange={() => setCategory(c.id)} className="sr-only" />
                <span className={`flex size-9 shrink-0 items-center justify-center rounded-full transition-colors ${on ? "bg-brand-900 text-accent-300" : colorStyle(c.color).tile}`} aria-hidden>
                  <Icon className="size-4" strokeWidth={2} />
                </span>
                <span className={`min-w-0 leading-tight break-words ${on ? "font-semibold" : "font-medium"}`}>
                  {c.name}
                  {!c.active && <span className="block text-[11px] font-normal text-slate-500">desativada</span>}
                </span>
              </label>
            );
          })}
          {!creating && (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="flex min-h-[56px] items-center gap-2.5 rounded-[16px] border-2 border-dashed border-slate-200 px-2.5 py-2 text-left text-sm font-semibold text-slate-500 transition hover:border-violet-300 hover:bg-violet-50/50 hover:text-violet-800 active:scale-[.98]"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-violet-50 text-violet-600" aria-hidden>
                <Plus className="size-4" strokeWidth={2.4} />
              </span>
              Nova categoria
            </button>
          )}
        </div>
        {creating && (
          <InlineCategoryCreator
            onCancel={() => setCreating(false)}
            onCreated={(c) => {
              setCreated((l) => [...l, c]);
              setCategory(c.id);
              setCreating(false);
            }}
          />
        )}
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

      <FormAlert>{error}</FormAlert>

      <div className="flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row-reverse">
        <button className="btn-primary w-full rounded-full sm:w-auto sm:flex-1" disabled={pending || creating}>
          {pending ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Check className="size-4" strokeWidth={2.4} aria-hidden />}
          {pending ? "Salvando…" : expense ? "Salvar alterações" : "Adicionar despesa"}
        </button>
        {expense && (
          <button type="button" className="btn-danger w-full rounded-full sm:w-auto" onClick={remove} disabled={pending}>
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
  categories,
  defaultRentalId,
  className = "btn-primary btn-sm",
  children = (
    <>
      <Plus className="size-4" strokeWidth={2.4} aria-hidden /> Nova despesa
    </>
  ),
}: Common & {
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
        <Sheet title="Nova despesa" subtitle="Frete, combustível, manutenção, compras…" icon={Plus} iconClass="bg-rose-50 text-rose-600" onClose={() => setOpen(false)}>
          <ExpenseForm rentals={rentals} todayISO={todayISO} categories={categories} defaultRentalId={defaultRentalId} onDone={() => setOpen(false)} />
        </Sheet>
      )}
    </>
  );
}

/** Ações de uma linha da lista: editar (abre o painel) e excluir (com confirmação). */
export function ExpenseRowActions({ expense, rentals, todayISO, categories }: Common & { expense: ExpenseFormValues }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  return (
    <span className="-mr-2 flex shrink-0 items-center">
      <button
        type="button"
        className="flex size-10 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 active:scale-95 disabled:opacity-50"
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
        className="flex size-10 items-center justify-center rounded-full text-slate-400 transition hover:bg-red-50 hover:text-red-700 active:scale-95 disabled:opacity-50"
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
        <Sheet title="Editar despesa" subtitle="Altere os dados ou exclua o lançamento" icon={Pencil} onClose={() => setOpen(false)}>
          <ExpenseForm expense={expense} rentals={rentals} todayISO={todayISO} categories={categories} onDone={() => setOpen(false)} />
        </Sheet>
      )}
    </span>
  );
}

/**
 * Botão transparente que cobre a linha inteira (o <li> precisa de `relative`) e abre a edição.
 * Assim a linha usa o <TxRow> do design system sem aninhar elementos interativos.
 */
export function ExpenseRowButton({ expense, rentals, todayISO, categories, label }: Common & { expense: ExpenseFormValues; label: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="absolute inset-0 z-[1] w-full cursor-pointer" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-label={label} />
      {open && (
        <Sheet title="Editar despesa" subtitle="Altere os dados ou exclua o lançamento" icon={Pencil} onClose={() => setOpen(false)}>
          <ExpenseForm expense={expense} rentals={rentals} todayISO={todayISO} categories={categories} onDone={() => setOpen(false)} />
        </Sheet>
      )}
    </>
  );
}
