import {
  Banknote,
  Briefcase,
  Car,
  CircleDollarSign,
  CircleHelp,
  CreditCard,
  Droplets,
  FileText,
  Fuel,
  Hammer,
  HardHat,
  House,
  Landmark,
  Megaphone,
  PackageOpen,
  Phone,
  QrCode,
  Receipt,
  ShieldCheck,
  ShoppingCart,
  Tag,
  Truck,
  Users,
  UtensilsCrossed,
  Wallet,
  Wifi,
  Wrench,
  Zap,
  ArrowLeftRight,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { colorStyle, findCategory, type CategoryIconKey, type ExpenseCategoryData } from "@/lib/expense-categories";
import { money } from "@/lib/format";
import "./finance-motion.css";

/*
 * Peças visuais do Financeiro (sem "use client": servem para o servidor e para as folhas).
 */

/** Chave gravada no banco → ícone lucide (importados um a um). */
export const CATEGORY_ICONS: Record<CategoryIconKey, LucideIcon> = {
  truck: Truck,
  package: PackageOpen,
  fuel: Fuel,
  wrench: Wrench,
  cart: ShoppingCart,
  tag: Tag,
  hammer: Hammer,
  hardhat: HardHat,
  car: Car,
  zap: Zap,
  droplet: Droplets,
  phone: Phone,
  wifi: Wifi,
  home: House,
  users: Users,
  utensils: UtensilsCrossed,
  receipt: Receipt,
  landmark: Landmark,
  briefcase: Briefcase,
  shield: ShieldCheck,
  file: FileText,
  wallet: Wallet,
  megaphone: Megaphone,
};

export function iconFor(key: string): LucideIcon {
  return CATEGORY_ICONS[key as CategoryIconKey] ?? Tag;
}

const tileSizes = {
  sm: "size-8 rounded-[10px] [&>svg]:size-4",
  md: "size-10 rounded-xl [&>svg]:size-[18px]",
  lg: "size-11 rounded-full [&>svg]:size-5",
};

/** Ícone da categoria num quadrado (ou círculo, `lg`) tingido com a cor dela. */
export function CategoryTile({ category, size = "md", className = "" }: { category: Pick<ExpenseCategoryData, "color" | "icon">; size?: keyof typeof tileSizes; className?: string }) {
  const Icon = iconFor(category.icon);
  return (
    <span className={`flex shrink-0 items-center justify-center ${tileSizes[size]} ${colorStyle(category.color).tile} ${className}`} aria-hidden>
      <Icon strokeWidth={1.9} />
    </span>
  );
}

/** Pílula com ícone + nome da categoria. */
export function CategoryChip({ categories, id }: { categories: readonly ExpenseCategoryData[]; id: string }) {
  const c = findCategory(categories, id);
  const Icon = iconFor(c.icon);
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap ring-1 ring-inset ${colorStyle(c.color).chip}`}>
      <Icon className="size-3" strokeWidth={2.2} aria-hidden />
      {c.name}
    </span>
  );
}

/** Ícone para a forma de pagamento. */
export function methodIcon(method: string): LucideIcon {
  const m = method.toLowerCase();
  if (m === "pix") return QrCode;
  if (m === "dinheiro") return Banknote;
  if (m.startsWith("cart")) return CreditCard;
  if (m.startsWith("transf")) return ArrowLeftRight;
  if (m === "sem forma") return CircleHelp;
  return CircleDollarSign;
}

/* ------------------------------------------------------------------ */
/* Donut (SVG puro)                                                     */
/* ------------------------------------------------------------------ */

export interface DonutSlice {
  key: string;
  label: string;
  value: number;
  color: string; // hex
}

/**
 * Rosca em SVG puro. `children` fica no centro (valor total, rótulo).
 * Fatias com um pequeno respiro entre elas, começando no topo.
 */
export function Donut({ slices, size = 220, thickness = 22, children, label }: { slices: DonutSlice[]; size?: number; thickness?: number; children?: ReactNode; label: string }) {
  const total = slices.reduce((s, x) => s + Math.max(0, x.value), 0);
  const r = 50 - thickness / 2 / (size / 100);
  const sw = thickness / (size / 100);
  const C = 2 * Math.PI * r;
  const gap = slices.filter((s) => s.value > 0).length > 1 ? Math.min(1.6, C * 0.012) : 0;
  let offset = 0;
  return (
    <figure className="relative mx-auto aspect-square w-full" style={{ maxWidth: size }}>
      <svg viewBox="0 0 100 100" className="donut-in size-full -rotate-90" role="img" aria-label={label}>
        <circle cx="50" cy="50" r={r} fill="none" stroke="currentColor" strokeWidth={sw} className="text-slate-100" />
        {total > 0 &&
          slices.map((s) => {
            if (s.value <= 0) return null;
            const len = (s.value / total) * C;
            const dash = Math.max(0.4, len - gap);
            const el = (
              <circle
                key={s.key}
                cx="50"
                cy="50"
                r={r}
                fill="none"
                stroke={s.color}
                strokeWidth={sw}
                strokeDasharray={`${dash} ${C - dash}`}
                strokeDashoffset={-offset}
                className="donut-slice"
              >
                <title>{`${s.label}: ${money(s.value)}`}</title>
              </circle>
            );
            offset += len;
            return el;
          })}
      </svg>
      {children && <div className="absolute inset-0 flex flex-col items-center justify-center px-[18%] text-center">{children}</div>}
    </figure>
  );
}

/* ------------------------------------------------------------------ */
/* Barras recebido × despesas                                           */
/* ------------------------------------------------------------------ */

const compact = new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 });
export const shortMoney = (n: number) => (Math.abs(n) >= 1000 ? `R$ ${compact.format(n)}` : `R$ ${Math.round(n)}`);

export interface FlowBucket {
  key: string;
  label: string;
  inflow: number;
  outflow: number;
  current?: boolean;
}

/** Pares de barras arredondadas (pílulas) sobre um trilho claro, como na referência. CSS puro. */
export function FlowBars({ buckets, inLabel = "Recebido", outLabel = "Despesas" }: { buckets: FlowBucket[]; inLabel?: string; outLabel?: string }) {
  const max = Math.max(1, ...buckets.flatMap((b) => [b.inflow, b.outflow]));
  const pct = (v: number) => `${Math.max(v > 0 ? 4 : 0, (v / max) * 100)}%`;
  return (
    <figure>
      <div className="flex h-44 items-stretch gap-1 sm:h-52 sm:gap-3">
        {buckets.map((b) => (
          <div key={b.key} className="group flex min-w-0 flex-1 flex-col items-center">
            <div className="relative flex w-full flex-1 items-end justify-center gap-1 sm:gap-1.5">
              {[
                { v: b.inflow, cls: "from-emerald-500 to-emerald-300", t: inLabel },
                { v: b.outflow, cls: "from-rose-500 to-rose-300", t: outLabel },
              ].map((bar) => (
                <div key={bar.t} className="relative h-full w-2.5 rounded-full bg-slate-100 sm:w-3.5" title={`${bar.t} ${b.label}: ${money(bar.v)}`}>
                  <div className={`bar-grow absolute inset-x-0 bottom-0 rounded-full bg-linear-to-t ${bar.cls}`} style={{ height: pct(bar.v) }} />
                </div>
              ))}
            </div>
            <span className={`mt-2.5 truncate text-[11px] font-semibold capitalize tnum ${b.current ? "text-brand-900" : "text-slate-400"}`}>{b.label}</span>
            {b.current && <span className="mt-1 size-1 rounded-full bg-accent-400" aria-hidden />}
          </div>
        ))}
      </div>
      <figcaption className="sr-only">{buckets.map((b) => `${b.label}: ${inLabel.toLowerCase()} ${money(b.inflow)}, ${outLabel.toLowerCase()} ${money(b.outflow)}.`).join(" ")}</figcaption>
    </figure>
  );
}

/** Linha de "breakdown" (ref. Assets breakdown): ícone, nome, participação, valor e barra. */
export function BreakdownRow({
  leading,
  title,
  sub,
  value,
  valueSub,
  pct,
  barClass,
  bar,
}: {
  leading: ReactNode;
  title: ReactNode;
  sub?: ReactNode;
  value: ReactNode;
  valueSub?: ReactNode;
  pct?: number;
  barClass?: string;
  /** Barra personalizada (substitui a barra simples de `pct`). */
  bar?: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-3">
        {leading}
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] leading-snug font-semibold text-slate-900">{title}</div>
          {sub && <div className="mt-0.5 truncate text-[13px] text-slate-500 tnum">{sub}</div>}
        </div>
        <div className="shrink-0 text-right">
          <div className="text-[15px] leading-snug font-bold whitespace-nowrap text-slate-900 tnum">{value}</div>
          {valueSub && <div className="mt-0.5 text-xs text-slate-500 tnum">{valueSub}</div>}
        </div>
      </div>
      {bar ??
        (pct != null && (
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
            <div className={`bar-grow-x h-full rounded-full ${barClass ?? "bg-brand-600"}`} style={{ width: `${Math.max(pct > 0 ? 2 : 0, Math.min(100, pct))}%` }} />
          </div>
        ))}
    </div>
  );
}
