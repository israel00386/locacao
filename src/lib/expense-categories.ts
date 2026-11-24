// Categorias de despesa e cálculos simples (funções puras, sem banco: podem ir para o navegador e para os testes).
import { round2 } from "./format";

export const EXPENSE_CATEGORIES = [
  { value: "ENTREGA", label: "Entrega", hint: "frete de ida", color: "bg-sky-500", chip: "bg-sky-50 text-sky-800 ring-sky-200" },
  { value: "RETIRADA", label: "Retirada", hint: "frete de volta", color: "bg-indigo-500", chip: "bg-indigo-50 text-indigo-800 ring-indigo-200" },
  { value: "COMBUSTIVEL", label: "Combustível", hint: "", color: "bg-amber-500", chip: "bg-amber-50 text-amber-800 ring-amber-200" },
  { value: "MANUTENCAO", label: "Manutenção", hint: "", color: "bg-rose-500", chip: "bg-rose-50 text-rose-800 ring-rose-200" },
  { value: "COMPRA", label: "Compra de material", hint: "", color: "bg-emerald-500", chip: "bg-emerald-50 text-emerald-800 ring-emerald-200" },
  { value: "OUTROS", label: "Outros", hint: "", color: "bg-slate-400", chip: "bg-slate-100 text-slate-700 ring-slate-200" },
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]["value"];

export const EXPENSE_CATEGORY_VALUES = EXPENSE_CATEGORIES.map((c) => c.value) as [ExpenseCategory, ...ExpenseCategory[]];

/** Despesas de frete (entrega e retirada), comparadas com as taxas cobradas do cliente. */
export const FREIGHT_CATEGORIES: readonly string[] = ["ENTREGA", "RETIRADA"];

export const PAYMENT_METHODS = ["Pix", "Dinheiro", "Cartão", "Transferência", "Outro"] as const;

export function expenseCategory(value: string) {
  return EXPENSE_CATEGORIES.find((c) => c.value === value) ?? EXPENSE_CATEGORIES[EXPENSE_CATEGORIES.length - 1];
}

export function categoryLabel(value: string): string {
  return expenseCategory(value).label;
}

export interface CategoryTotal {
  value: ExpenseCategory;
  label: string;
  color: string;
  total: number;
  count: number;
}

/** Total por categoria (só as que têm despesa), do maior para o menor. */
export function totalsByCategory(expenses: { category: string; amount: number }[]): CategoryTotal[] {
  const map = new Map<string, CategoryTotal>();
  for (const e of expenses) {
    const c = expenseCategory(e.category);
    const row = map.get(c.value) ?? { value: c.value, label: c.label, color: c.color, total: 0, count: 0 };
    row.total = round2(row.total + e.amount);
    row.count++;
    map.set(c.value, row);
  }
  return [...map.values()].sort((a, b) => b.total - a.total);
}

export function sumAmounts(rows: { amount: number }[]): number {
  return round2(rows.reduce((s, r) => s + r.amount, 0));
}

/** Lucro do frete de uma locação: taxas/extras cobrados − despesas de entrega e retirada. */
export function freightProfit(extras: { amount: number }[], expenses: { category: string; amount: number }[]) {
  const charged = sumAmounts(extras);
  const spent = sumAmounts(expenses.filter((e) => FREIGHT_CATEGORIES.includes(e.category)));
  return { charged, spent, profit: round2(charged - spent) };
}
