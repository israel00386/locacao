import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Empty } from "./ui";
import "./finance-motion.css";

/*
 * Peças das telas de Estoque, Clientes e Financeiro que o design system (ui.tsx) não tem.
 * O visual base (TopBar, BalanceCard, Stat, Section, TxRow, ProgressRow, Donut, BarChart, SegmentedTabs…)
 * vem de src/components/ui.tsx. Sem "use client": servem para servidor e navegador.
 */

/** Mesmo visual do <QuickTile> do ui.tsx, para usar em <button> (abre folhas). */
export const QUICK_TILE_BTN =
  "tap group flex min-h-[7.5rem] w-full min-w-0 flex-col justify-between gap-3 rounded-3xl bg-gradient-to-br p-4 text-left transition-[transform,filter] hover:brightness-[1.02] sm:min-h-[8.5rem] sm:p-5";
export const QUICK_TONES = {
  brand: "from-brand-100/90 to-brand-50 text-brand-700",
  accent: "from-accent-200/80 to-accent-50 text-accent-800",
  emerald: "from-emerald-100 to-emerald-50 text-emerald-700",
  rose: "from-rose-100 to-rose-50 text-rose-700",
  violet: "from-violet-100 to-violet-50 text-violet-700",
  sky: "from-sky-100 to-sky-50 text-sky-700",
} as const;

export function QuickTileBody({ icon: Icon, label, hint }: { icon: LucideIcon; label: ReactNode; hint?: ReactNode }) {
  return (
    <>
      <span className="flex size-11 items-center justify-center rounded-full bg-white shadow-[0_4px_12px_-6px_rgb(15_18_63/.25)]" aria-hidden>
        <Icon className="size-5" strokeWidth={2} />
      </span>
      <span className="min-w-0">
        <span className="block text-[15px] leading-tight font-semibold text-brand-950">{label}</span>
        {hint && <span className="mt-0.5 block truncate text-xs text-slate-500">{hint}</span>}
      </span>
    </>
  );
}

/** Botão em pílula com texto, para cabeçalhos (ao lado dos botões redondos). */
export const PILL_BTN = "btn-primary rounded-full";
export const PILL_ACCENT = "btn-accent rounded-full";

/** Barra de ocupação do estoque: na obra (azul claro) · manutenção (âmbar) · disponível (verde). */
export function OccupancyBar({
  total,
  rented,
  maintenance,
  dark = false,
  className = "",
}: {
  total: number;
  rented: number;
  maintenance: number;
  dark?: boolean;
  className?: string;
}) {
  const base = Math.max(total, rented + maintenance, 1);
  const free = Math.max(0, total - rented - maintenance);
  const pct = (n: number) => `${(n / base) * 100}%`;
  return (
    <div
      className={`bar-fill flex h-2 w-full gap-[3px] overflow-hidden rounded-full ${dark ? "bg-white/10" : "bg-slate-100"} ${className}`}
      role="img"
      aria-label={`${rented} na obra, ${maintenance} em manutenção, ${free} disponíveis de ${total}`}
    >
      {rented > 0 && <span className={`h-full rounded-full ${dark ? "bg-sky-300" : "bg-sky-400"}`} style={{ width: pct(rented) }} />}
      {maintenance > 0 && <span className={`h-full rounded-full ${dark ? "bg-amber-300" : "bg-amber-400"}`} style={{ width: pct(maintenance) }} />}
      {free > 0 && <span className={`h-full rounded-full ${dark ? "bg-emerald-300" : "bg-emerald-500"}`} style={{ width: pct(free) }} />}
    </div>
  );
}

export function LegendDot({ className, children }: { className: string; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span className={`size-2 rounded-full ${className}`} aria-hidden />
      {children}
    </span>
  );
}

/** Estado vazio dentro de um card (usa o <Empty plain> do design system). */
export function EmptyState({ icon: Icon, title, children, action }: { icon: LucideIcon; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <Empty plain icon={<Icon strokeWidth={1.75} />} title={title} action={action}>
      {children}
    </Empty>
  );
}

/** Divisor de dia no extrato ("Hoje", "Ontem", "seg., 18 de nov."). */
export function DayLabel({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-1 text-xs font-semibold text-slate-400 sm:px-5">
      <span className="first-letter:uppercase">{children}</span>
      {right && <span className="tnum">{right}</span>}
    </div>
  );
}

/** Pequeno par rótulo/valor em cima do marinho. */
export function NavyStat({ label, children, tone = "white" }: { label: string; children: ReactNode; tone?: "white" | "green" | "red" | "accent" }) {
  const color = { white: "text-white", green: "text-emerald-300", red: "text-rose-300", accent: "text-accent-300" }[tone];
  return (
    <div className="min-w-0">
      <div className="truncate text-[12.5px] font-medium text-white/60">{label}</div>
      <div className={`tnum mt-0.5 truncate text-base font-bold tracking-[-0.01em] sm:text-lg ${color}`}>{children}</div>
    </div>
  );
}
