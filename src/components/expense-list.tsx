import Link from "next/link";
import type { ReactNode } from "react";
import { ExpenseRowActions, NewExpenseButton, type ExpenseRentalOption } from "@/components/expense-sheet";
import { fmtDate, parseISODate } from "@/lib/dates";
import { expenseCategory, FREIGHT_CATEGORIES, freightProfit, sumAmounts } from "@/lib/expense-categories";
import { money } from "@/lib/format";

/** Mesmo formato de src/lib/expenses.ts (ExpenseRow), repetido aqui para não puxar o banco para o componente. */
export interface ExpenseItemData {
  id: string;
  date: string;
  category: string;
  description: string;
  amount: number;
  method: string | null;
  rentalId: string | null;
  rental: { id: string; code: string; customerName: string } | null;
}

export function CategoryChip({ category }: { category: string }) {
  const c = expenseCategory(category);
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${c.chip}`}>
      {c.label}
    </span>
  );
}

/** Uma linha de despesa. `showRental` mostra o link da locação ligada (no financeiro). */
export function ExpenseItem({ expense: e, showRental = true, actions, extra }: { expense: ExpenseItemData; showRental?: boolean; actions?: ReactNode; extra?: ReactNode }) {
  return (
    <li className="px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <CategoryChip category={e.category} />
            <span className="text-xs text-slate-500 tnum">{fmtDate(parseISODate(e.date))}</span>
            {e.method && <span className="text-xs text-slate-500">· {e.method}</span>}
          </div>
          {e.description && <div className="mt-1 text-sm font-medium break-words">{e.description}</div>}
          {showRental && e.rental && (
            <Link href={`/locacoes/${e.rental.id}`} className="mt-0.5 block truncate text-xs text-brand-700 hover:underline">
              {e.rental.code} · {e.rental.customerName}
            </Link>
          )}
          {extra}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="text-sm font-bold text-red-700 tnum">− {money(e.amount)}</span>
          {actions}
        </div>
      </div>
    </li>
  );
}

/**
 * Despesas de uma locação + total (para a página da locação).
 * - `extras`: taxas/extras cobrados do cliente → mostra o "lucro do frete".
 * - `rentalId` + `rentals` + `todayISO`: mostra os botões de nova despesa, editar e excluir.
 */
export function ExpenseList({
  expenses,
  extras,
  rentalId,
  rentals,
  todayISO,
  emptyText = "Nenhuma despesa ligada a esta locação.",
}: {
  expenses: ExpenseItemData[];
  extras?: { amount: number }[];
  rentalId?: string;
  rentals?: ExpenseRentalOption[];
  todayISO?: string;
  emptyText?: string;
}) {
  const editable = !!(rentals && todayISO);
  const total = sumAmounts(expenses);
  const hasFreight = expenses.some((e) => FREIGHT_CATEGORIES.includes(e.category));
  const freight = extras ? freightProfit(extras, expenses) : null;
  return (
    <div>
      {expenses.length ? (
        <ul className="divide-y divide-slate-100">
          {expenses.map((e) => (
            <ExpenseItem
              key={e.id}
              expense={e}
              showRental={false}
              actions={editable ? <ExpenseRowActions expense={e} rentals={rentals!} todayISO={todayISO!} /> : undefined}
            />
          ))}
        </ul>
      ) : (
        <p className="px-4 py-5 text-center text-sm text-slate-500">{emptyText}</p>
      )}
      <div className="space-y-1 border-t border-slate-100 bg-slate-50/60 px-4 py-3 text-sm">
        <div className="flex justify-between gap-3">
          <span className="text-slate-600">Total de despesas</span>
          <span className="font-bold text-red-700 tnum">{money(total)}</span>
        </div>
        {freight && (hasFreight || freight.charged > 0) && (
          <>
            <div className="flex justify-between gap-3 text-xs text-slate-500">
              <span>Cobrado − frete</span>
              <span className="whitespace-nowrap tnum">{money(freight.charged)} − {money(freight.spent)}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-slate-600">Lucro do frete</span>
              <span className={`font-bold tnum ${freight.profit >= 0 ? "text-brand-700" : "text-red-700"}`}>{money(freight.profit)}</span>
            </div>
          </>
        )}
        {editable && (
          <div className="pt-2">
            <NewExpenseButton rentals={rentals!} todayISO={todayISO!} defaultRentalId={rentalId} className="btn-secondary btn-sm w-full sm:w-auto">
              + Despesa desta locação
            </NewExpenseButton>
          </div>
        )}
      </div>
    </div>
  );
}
