import { Ellipsis, Fuel, PackageOpen, ShoppingCart, Truck, Wrench, type LucideIcon } from "lucide-react";
import { expenseCategory } from "@/lib/expense-categories";
import { money } from "@/lib/format";

/*
 * Peças visuais do Financeiro (sem "use client": servem para o servidor e para a folha de despesa).
 */

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  ENTREGA: Truck,
  RETIRADA: PackageOpen,
  COMBUSTIVEL: Fuel,
  MANUTENCAO: Wrench,
  COMPRA: ShoppingCart,
  OUTROS: Ellipsis,
};

export function categoryIcon(value: string): LucideIcon {
  return CATEGORY_ICONS[expenseCategory(value).value] ?? Ellipsis;
}

/** Ícone da categoria num quadrado tingido (36px). */
export function CategoryTile({ category, size = "md" }: { category: string; size?: "sm" | "md" }) {
  const c = expenseCategory(category);
  const Icon = categoryIcon(category);
  return (
    <span className={`flex shrink-0 items-center justify-center ${size === "sm" ? "size-8 rounded-[10px]" : "size-10 rounded-xl"} ${c.tile}`} aria-hidden>
      <Icon className={size === "sm" ? "size-4" : "size-[18px]"} strokeWidth={1.9} />
    </span>
  );
}

const compact = new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 });
const short = (n: number) => (Math.abs(n) >= 1000 ? `R$ ${compact.format(n)}` : `R$ ${Math.round(n)}`);

export interface WeekBucket {
  label: string;
  received: number;
  spent: number;
}

/** Barras recebido × despesas por semana do mês (CSS puro, sem biblioteca). */
export function WeeklyChart({ weeks }: { weeks: WeekBucket[] }) {
  const max = Math.max(1, ...weeks.flatMap((w) => [w.received, w.spent]));
  const nice = (() => {
    const p = Math.pow(10, Math.floor(Math.log10(max)));
    const steps = [1, 2, 2.5, 5, 10];
    return (steps.find((s) => s * p >= max) ?? 10) * p;
  })();
  const ticks = [1, 0.5, 0];
  return (
    <figure className="px-4 pt-4 pb-5 sm:px-5">
      <div className="mb-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-[4px] bg-emerald-500" aria-hidden /> Recebido
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-[4px] bg-rose-400" aria-hidden /> Despesas
        </span>
      </div>
      <div className="relative h-44 pl-12">
        {ticks.map((t) => (
          <div key={t} className="absolute right-0 left-12 border-t border-dashed border-slate-200" style={{ bottom: `${t * 100}%` }} aria-hidden>
            <span className="absolute -top-2 -left-12 w-10 text-right text-[10px] text-slate-400 tnum">{t ? short(nice * t) : "0"}</span>
          </div>
        ))}
        <div className="relative flex h-full items-end gap-2 sm:gap-4">
          {weeks.map((w) => (
            <div key={w.label} className="flex h-full flex-1 items-end justify-center gap-1 sm:gap-1.5">
              <div
                className="group relative w-full max-w-7 rounded-t-md bg-linear-to-t from-emerald-600 to-emerald-400 transition-[height] duration-700 ease-out"
                style={{ height: `${(w.received / nice) * 100}%`, minHeight: w.received ? 3 : 0 }}
                title={`Recebido ${w.label}: ${money(w.received)}`}
              />
              <div
                className="group relative w-full max-w-7 rounded-t-md bg-linear-to-t from-rose-500 to-rose-300 transition-[height] duration-700 ease-out"
                style={{ height: `${(w.spent / nice) * 100}%`, minHeight: w.spent ? 3 : 0 }}
                title={`Despesas ${w.label}: ${money(w.spent)}`}
              />
            </div>
          ))}
        </div>
      </div>
      <div className="mt-2 flex gap-2 pl-12 sm:gap-4">
        {weeks.map((w) => (
          <div key={w.label} className="flex-1 text-center text-[11px] font-medium text-slate-500 tnum">
            {w.label}
          </div>
        ))}
      </div>
      <figcaption className="sr-only">
        {weeks.map((w) => `Dias ${w.label}: recebido ${money(w.received)}, despesas ${money(w.spent)}.`).join(" ")}
      </figcaption>
    </figure>
  );
}

/** Barra empilhada das despesas por categoria + lista com ícone, valor e participação. */
export function CategoryBreakdown({ rows, total }: { rows: { value: string; label: string; color: string; total: number; count: number }[]; total: number }) {
  if (!rows.length) return null;
  return (
    <div className="px-4 pb-4 sm:px-5">
      <div className="flex h-3 w-full gap-[2px] overflow-hidden rounded-full bg-slate-100" role="img" aria-label="Despesas por categoria">
        {rows.map((c) => (
          <span key={c.value} className={`h-full ${c.color}`} style={{ width: `${(c.total / Math.max(total, 0.01)) * 100}%` }} title={`${c.label}: ${money(c.total)}`} />
        ))}
      </div>
      <ul className="mt-4 grid gap-y-3">
        {rows.map((c) => (
          <li key={c.value} className="flex items-center gap-3">
            <CategoryTile category={c.value} size="sm" />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-sm font-medium text-slate-800">{c.label}</span>
                <span className="shrink-0 text-sm font-semibold text-slate-900 tnum">{money(c.total)}</span>
              </div>
              <div className="flex items-baseline justify-between gap-2 text-xs text-slate-500 tnum">
                <span>
                  {c.count} lançamento{c.count === 1 ? "" : "s"}
                </span>
                <span>{Math.round((c.total / Math.max(total, 0.01)) * 100)}%</span>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
