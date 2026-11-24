import Link from "next/link";
import type { ReactNode } from "react";
import { Link2, Plus } from "lucide-react";
import { ExpenseRowActions, NewExpenseButton, type ExpenseRentalOption } from "@/components/expense-sheet";
import { CategoryTile } from "@/components/finance-ui";
import { fmtDate, parseISODate } from "@/lib/dates";
import { findCategory, freightProfit, getCategories, isFreightCategory, sumAmounts, type ExpenseCategoryData } from "@/lib/expenses";
import { money } from "@/lib/format";

/** Mesmo formato de src/lib/expenses.ts (ExpenseRow). */
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

/** Uma linha de despesa (estilo transação). `showRental` mostra o link da locação ligada. */
export function ExpenseItem({
  expense: e,
  categories,
  showRental = true,
  actions,
  extra,
}: {
  expense: ExpenseItemData;
  categories: ExpenseCategoryData[];
  showRental?: boolean;
  actions?: ReactNode;
  extra?: ReactNode;
}) {
  const c = findCategory(categories, e.category);
  return (
    <li className="flex gap-3 px-4 py-3.5 sm:px-5">
      <CategoryTile category={c} size="lg" />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[15px] leading-snug font-semibold break-words text-slate-900">{e.description || c.name}</div>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[13px] text-slate-500">
              {e.description && <span>{c.name}</span>}
              {e.description && <span aria-hidden>·</span>}
              <span className="tnum">{fmtDate(parseISODate(e.date))}</span>
              {e.method && <span>· {e.method}</span>}
            </div>
          </div>
          <span className="shrink-0 pt-px text-[15px] font-bold whitespace-nowrap text-rose-600 tnum">−{money(e.amount)}</span>
        </div>
        {(showRental && e.rental) || actions ? (
          <div className="mt-1.5 flex min-w-0 items-center justify-between gap-2">
            {showRental && e.rental ? (
              <Link
                href={`/locacoes/${e.rental.id}`}
                className="inline-flex min-w-0 items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-700 hover:bg-brand-100"
              >
                <Link2 className="size-3 shrink-0" aria-hidden />
                <span className="truncate">
                  {e.rental.code} · {e.rental.customerName}
                </span>
              </Link>
            ) : (
              <span />
            )}
            {actions}
          </div>
        ) : null}
        {extra}
      </div>
    </li>
  );
}

/**
 * Despesas de uma locação + total (para a página da locação). Busca as categorias sozinha.
 * - `extras`: taxas/extras cobrados do cliente → mostra o "lucro do frete".
 * - `rentalId` + `rentals` + `todayISO`: mostra os botões de nova despesa, editar e excluir.
 */
export async function ExpenseList({
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
  const categories = await getCategories();
  const editable = !!(rentals && todayISO);
  const total = sumAmounts(expenses);
  const hasFreight = expenses.some((e) => isFreightCategory(categories, e.category));
  const freight = extras ? freightProfit(extras, expenses, categories) : null;
  return (
    <div>
      {expenses.length ? (
        <ul className="divide-y divide-slate-100">
          {expenses.map((e) => (
            <ExpenseItem
              key={e.id}
              expense={e}
              categories={categories}
              showRental={false}
              actions={editable ? <ExpenseRowActions expense={e} rentals={rentals!} todayISO={todayISO!} categories={categories} /> : undefined}
            />
          ))}
        </ul>
      ) : (
        <p className="px-4 py-5 text-center text-sm text-slate-500">{emptyText}</p>
      )}
      <div className="space-y-1.5 border-t border-slate-100 bg-slate-50/70 px-4 py-3.5 text-sm sm:px-5">
        <div className="flex justify-between gap-3">
          <span className="text-slate-600">Total de despesas</span>
          <span className="font-bold text-slate-900 tnum">{money(total)}</span>
        </div>
        {freight && (hasFreight || freight.charged > 0) && (
          <>
            <div className="flex justify-between gap-3 text-xs text-slate-500">
              <span>Cobrado − frete</span>
              <span className="whitespace-nowrap tnum">
                {money(freight.charged)} − {money(freight.spent)}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-slate-600">Lucro do frete</span>
              <span className={`font-bold tnum ${freight.profit >= 0 ? "text-brand-700" : "text-red-700"}`}>{money(freight.profit)}</span>
            </div>
          </>
        )}
        {editable && (
          <div className="pt-2">
            <NewExpenseButton rentals={rentals!} todayISO={todayISO!} categories={categories} defaultRentalId={rentalId} className="btn-secondary btn-sm w-full rounded-full sm:w-auto">
              <Plus className="size-4" aria-hidden /> Despesa desta locação
            </NewExpenseButton>
          </div>
        )}
      </div>
    </div>
  );
}
