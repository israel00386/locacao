// Categorias de despesa e cálculos simples (funções puras, sem banco: podem ir para o navegador e para os testes).
// As categorias ficam no banco (ExpenseCategory); aqui as funções recebem a lista já carregada.
import { round2 } from "./format";

/** Paleta das categorias (o banco guarda a chave). */
export const CATEGORY_COLORS = ["sky", "indigo", "amber", "rose", "emerald", "slate", "violet", "teal", "orange", "navy"] as const;
export type CategoryColor = (typeof CATEGORY_COLORS)[number];

export interface ColorStyle {
  label: string;
  /** Fundo sólido (barras, pontos de legenda). */
  bar: string;
  /** Ícone em quadrado tingido. */
  tile: string;
  /** Pílula com texto. */
  chip: string;
  /** Cor para SVG (donut). */
  hex: string;
}

// Classes completas escritas por extenso para o Tailwind encontrar.
export const COLOR_STYLES: Record<CategoryColor, ColorStyle> = {
  sky: { label: "Azul-claro", bar: "bg-sky-500", tile: "bg-sky-50 text-sky-600", chip: "bg-sky-50 text-sky-800 ring-sky-200", hex: "#0ea5e9" },
  indigo: { label: "Anil", bar: "bg-indigo-500", tile: "bg-indigo-50 text-indigo-600", chip: "bg-indigo-50 text-indigo-800 ring-indigo-200", hex: "#6366f1" },
  amber: { label: "Âmbar", bar: "bg-amber-400", tile: "bg-amber-50 text-amber-600", chip: "bg-amber-50 text-amber-800 ring-amber-200", hex: "#f59e0b" },
  rose: { label: "Rosa", bar: "bg-rose-500", tile: "bg-rose-50 text-rose-600", chip: "bg-rose-50 text-rose-800 ring-rose-200", hex: "#f43f5e" },
  emerald: { label: "Verde", bar: "bg-emerald-500", tile: "bg-emerald-50 text-emerald-600", chip: "bg-emerald-50 text-emerald-800 ring-emerald-200", hex: "#10b981" },
  slate: { label: "Cinza", bar: "bg-slate-400", tile: "bg-slate-100 text-slate-500", chip: "bg-slate-100 text-slate-700 ring-slate-200", hex: "#94a3b8" },
  violet: { label: "Violeta", bar: "bg-violet-500", tile: "bg-violet-50 text-violet-600", chip: "bg-violet-50 text-violet-800 ring-violet-200", hex: "#8b5cf6" },
  teal: { label: "Verde-água", bar: "bg-teal-500", tile: "bg-teal-50 text-teal-600", chip: "bg-teal-50 text-teal-800 ring-teal-200", hex: "#14b8a6" },
  orange: { label: "Laranja", bar: "bg-orange-500", tile: "bg-orange-50 text-orange-600", chip: "bg-orange-50 text-orange-800 ring-orange-200", hex: "#f97316" },
  navy: { label: "Marinho", bar: "bg-brand-600", tile: "bg-brand-50 text-brand-700", chip: "bg-brand-50 text-brand-800 ring-brand-200", hex: "#1f2b7a" },
};

export function colorStyle(color: string): ColorStyle {
  return COLOR_STYLES[(color in COLOR_STYLES ? color : "slate") as CategoryColor];
}

/** Ícones disponíveis (chave gravada no banco → ícone lucide em src/components/finance-ui.tsx). */
export const CATEGORY_ICON_KEYS = [
  "truck",
  "package",
  "fuel",
  "wrench",
  "cart",
  "tag",
  "hammer",
  "hardhat",
  "car",
  "zap",
  "droplet",
  "phone",
  "wifi",
  "home",
  "users",
  "utensils",
  "receipt",
  "landmark",
  "briefcase",
  "shield",
  "file",
  "wallet",
  "megaphone",
] as const;
export type CategoryIconKey = (typeof CATEGORY_ICON_KEYS)[number];

/** Categoria como vem do banco (só os campos usados nas telas). */
export interface ExpenseCategoryData {
  id: string;
  name: string;
  color: string;
  icon: string;
  isFreight: boolean;
  active: boolean;
  sortOrder: number;
}

/** Usada quando a despesa aponta para uma categoria que não existe mais. */
export const FALLBACK_CATEGORY: ExpenseCategoryData = { id: "OUTROS", name: "Outros", color: "slate", icon: "tag", isFreight: false, active: true, sortOrder: 99 };

export const PAYMENT_METHODS = ["Pix", "Dinheiro", "Cartão", "Transferência", "Outro"] as const;

/** Categoria pelo id; desconhecida → "Outros" (da lista, se existir). */
export function findCategory(categories: readonly ExpenseCategoryData[], id: string): ExpenseCategoryData {
  return categories.find((c) => c.id === id) ?? categories.find((c) => c.id === FALLBACK_CATEGORY.id) ?? FALLBACK_CATEGORY;
}

export function categoryLabel(categories: readonly ExpenseCategoryData[], id: string): string {
  return findCategory(categories, id).name;
}

/** Despesa de frete = categoria marcada "conta como frete". */
export function isFreightCategory(categories: readonly ExpenseCategoryData[], id: string): boolean {
  return categories.some((c) => c.id === id && c.isFreight);
}

/** Ordem de exibição: sortOrder, depois nome. */
export function sortCategories<T extends Pick<ExpenseCategoryData, "sortOrder" | "name">>(list: readonly T[]): T[] {
  return [...list].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "pt-BR"));
}

/** Categorias que aparecem no formulário: as ativas + a atual da despesa (mesmo desativada). */
export function selectableCategories(categories: readonly ExpenseCategoryData[], currentId?: string | null): ExpenseCategoryData[] {
  return sortCategories(categories.filter((c) => c.active || c.id === currentId));
}

export interface CategoryTotal {
  id: string;
  label: string;
  color: string;
  icon: string;
  total: number;
  count: number;
}

/** Total por categoria (só as que têm despesa), do maior para o menor. */
export function totalsByCategory(expenses: { category: string; amount: number }[], categories: readonly ExpenseCategoryData[]): CategoryTotal[] {
  const map = new Map<string, CategoryTotal>();
  for (const e of expenses) {
    const c = findCategory(categories, e.category);
    const row = map.get(c.id) ?? { id: c.id, label: c.name, color: c.color, icon: c.icon, total: 0, count: 0 };
    row.total = round2(row.total + e.amount);
    row.count++;
    map.set(c.id, row);
  }
  return [...map.values()].sort((a, b) => b.total - a.total);
}

export function sumAmounts(rows: { amount: number }[]): number {
  return round2(rows.reduce((s, r) => s + r.amount, 0));
}

/** Lucro do frete de uma locação: taxas/extras cobrados − despesas das categorias de frete. */
export function freightProfit(extras: { amount: number }[], expenses: { category: string; amount: number }[], categories: readonly ExpenseCategoryData[]) {
  const charged = sumAmounts(extras);
  const spent = sumAmounts(expenses.filter((e) => isFreightCategory(categories, e.category)));
  return { charged, spent, profit: round2(charged - spent) };
}

/** Nome de categoria normalizado (espaços) e validado. */
export function normalizeCategoryName(name: string): string {
  return name.replace(/\s+/g, " ").trim();
}
