import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { CountUp, type CountFormat } from "./count-up";
import { Empty } from "./ui";
import "./finance-motion.css";

/*
 * Peças visuais v2 ("fintech leve") das telas de Estoque, Clientes e Financeiro.
 * Sem "use client": servem tanto para componentes do servidor quanto do navegador.
 */

/** Superfície branca macia: cantos grandes, sem borda dura, sombra difusa. */
export const SURFACE = "rounded-[24px] bg-white shadow-[0_1px_2px_rgb(15_18_63/.04),0_12px_32px_-16px_rgb(15_18_63/.16)] lg:rounded-[28px]";

/** Botão redondo branco (busca, voltar, baixar…) como na referência. */
export const ROUND_BTN =
  "press inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-white text-slate-700 shadow-[0_1px_2px_rgb(15_18_63/.05),0_6px_16px_-8px_rgb(15_18_63/.25)] ring-1 ring-slate-900/[.04] hover:text-brand-800 [&>svg]:size-5";

/** Botão em pílula (ação principal do cabeçalho). */
export const PILL_PRIMARY =
  "press inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-brand-900 px-4 text-sm font-semibold whitespace-nowrap text-white shadow-[0_8px_20px_-10px_rgb(15_18_63/.7)] hover:bg-brand-800 disabled:opacity-60 [&>svg]:size-[18px] [&>svg]:shrink-0";
export const PILL_ACCENT =
  "press inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-accent-400 px-4 text-sm font-semibold whitespace-nowrap text-brand-950 shadow-[0_8px_20px_-10px_rgb(185_137_0/.8)] hover:bg-accent-300 disabled:opacity-60 [&>svg]:size-[18px] [&>svg]:shrink-0";
export const PILL_SOFT =
  "press inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-white px-4 text-sm font-semibold whitespace-nowrap text-slate-800 shadow-[0_1px_2px_rgb(15_18_63/.05),0_6px_16px_-8px_rgb(15_18_63/.25)] ring-1 ring-slate-900/[.04] hover:text-brand-800 disabled:opacity-60 [&>svg]:size-[18px] [&>svg]:shrink-0";

/** Degradê marinho → azul com brilho amarelo sutil (cartão de saldo). */
export const NAVY_GRADIENT: CSSProperties = {
  background:
    "radial-gradient(90% 120% at 100% 0%, rgb(248 200 10 / .20), transparent 55%), radial-gradient(70% 90% at 0% 100%, rgb(95 108 187 / .35), transparent 60%), linear-gradient(135deg, var(--color-brand-900) 0%, var(--color-brand-700) 55%, var(--color-brand-600) 100%)",
};

/** Título grande da tela à esquerda e botões redondos à direita (sem faixa marinho). */
export function ScreenHeader({
  back,
  eyebrow,
  title,
  subtitle,
  actions,
  lead,
}: {
  back?: { href: string; label?: string };
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  lead?: ReactNode;
}) {
  return (
    <header className="mb-5 flex flex-wrap items-center justify-between gap-x-3 gap-y-3 lg:mb-7">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {back && (
          <Link href={back.href} className={ROUND_BTN} aria-label={back.label ? `Voltar para ${back.label}` : "Voltar"}>
            <ChevronLeft strokeWidth={2.2} />
          </Link>
        )}
        {lead}
        <div className="min-w-0">
          {eyebrow && <div className="mb-0.5 text-[13px] font-medium text-slate-500">{eyebrow}</div>}
          <h1 className="text-[1.75rem] leading-[1.12] font-bold tracking-[-0.025em] break-words text-brand-950 sm:text-[2rem]">{title}</h1>
          {subtitle && <div className="mt-1 text-sm text-slate-500">{subtitle}</div>}
        </div>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

/** Cartão de saldo em degradê marinho (ref. 2/3). */
export function BalanceCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={`on-navy relative isolate overflow-hidden rounded-[26px] p-5 text-white shadow-[0_22px_44px_-22px_rgb(15_18_63/.75)] sm:p-6 lg:rounded-[30px] lg:p-7 ${className}`}
      style={NAVY_GRADIENT}
    >
      <span className="pointer-events-none absolute -top-16 -right-10 -z-10 size-52 rounded-full border-[18px] border-white/[.05]" aria-hidden />
      <span className="pointer-events-none absolute -right-20 -bottom-24 -z-10 size-64 rounded-full bg-white/[.04]" aria-hidden />
      {children}
    </section>
  );
}

/** Número grande do cartão de saldo. */
export function BigAmount({ amount, format = "money", className = "" }: { amount: number; format?: CountFormat; className?: string }) {
  return (
    <div className={`tnum text-[2rem] leading-none font-bold tracking-[-0.03em] break-words min-[400px]:text-[2.25rem] sm:text-[2.5rem] ${className}`}>
      <CountUp value={amount} format={format} />
    </div>
  );
}

/** Chip de variação/observação sobre o marinho. */
export function GlassChip({ children, tone = "white" }: { children: ReactNode; tone?: "white" | "green" | "red" | "accent" }) {
  const color = { white: "text-white/85", green: "text-emerald-300", red: "text-rose-300", accent: "text-accent-300" }[tone];
  return (
    <span className={`inline-flex min-h-7 items-center gap-1 rounded-full bg-white/10 px-2.5 text-xs font-semibold whitespace-nowrap ring-1 ring-white/15 ring-inset tnum ${color} [&>svg]:size-3.5`}>
      {children}
    </span>
  );
}

const tileTones = {
  brand: "bg-brand-50 text-brand-600",
  navy: "bg-brand-900 text-accent-300",
  sky: "bg-sky-50 text-sky-600",
  green: "bg-emerald-50 text-emerald-600",
  red: "bg-rose-50 text-rose-600",
  amber: "bg-amber-50 text-amber-600",
  violet: "bg-violet-50 text-violet-600",
  slate: "bg-slate-100 text-slate-500",
  accent: "bg-accent-100 text-accent-700",
  white: "bg-white text-brand-800 shadow-[0_4px_12px_-6px_rgb(15_18_63/.3)]",
} as const;
export type TileTone = keyof typeof tileTones;

/** Ícone dentro de um quadrado arredondado tingido. `round` = círculo (listas de transação). */
export function IconTile({
  icon: Icon,
  tone = "brand",
  className = "",
  size = "md",
  round = false,
}: {
  icon: LucideIcon;
  tone?: TileTone | string;
  className?: string;
  size?: "sm" | "md" | "lg";
  round?: boolean;
}) {
  const box = size === "sm" ? "size-8 rounded-[10px]" : size === "lg" ? "size-11 rounded-[14px]" : "size-10 rounded-xl";
  const ic = size === "sm" ? "size-4" : size === "lg" ? "size-5" : "size-[18px]";
  const cls = tone in tileTones ? tileTones[tone as TileTone] : tone;
  return (
    <span className={`flex shrink-0 items-center justify-center ${box} ${round ? "!rounded-full" : ""} ${cls} ${className}`} aria-hidden>
      <Icon className={ic} strokeWidth={1.9} />
    </span>
  );
}

/** Card de métrica (ref. 3 "Assets/Liabilities"): ícone em quadrado, rótulo e número grande. */
export function MetricCard({
  icon,
  tone = "brand",
  label,
  amount,
  value,
  format = "int",
  hint,
  valueClass = "text-brand-950",
  href,
}: {
  icon: LucideIcon;
  tone?: TileTone;
  label: string;
  amount?: number;
  value?: ReactNode;
  format?: CountFormat;
  hint?: ReactNode;
  valueClass?: string;
  href?: string;
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <IconTile icon={icon} tone={tone} />
        {href && <ChevronRight className="size-4 text-slate-300" aria-hidden />}
      </div>
      <div className="mt-3 truncate text-[13px] font-medium text-slate-500">{label}</div>
      <div className={`tnum mt-1 text-[1.25rem] leading-tight font-bold tracking-[-0.02em] break-words min-[400px]:text-[1.375rem] sm:text-[1.625rem] ${valueClass}`}>
        {amount != null ? <CountUp value={amount} format={format} /> : value}
      </div>
      {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
    </>
  );
  return href ? (
    <Link href={href} className={`press block min-w-0 p-4 hover:shadow-[0_18px_38px_-18px_rgb(15_18_63/.3)] sm:p-5 ${SURFACE}`}>
      {body}
    </Link>
  ) : (
    <div className={`min-w-0 p-4 sm:p-5 ${SURFACE}`}>{body}</div>
  );
}

/** Abas em pílulas segmentadas (links). */
export function SegmentedNav({ items, label, className = "" }: { items: { href: string; label: string; active: boolean; icon?: LucideIcon; count?: number }[]; label: string; className?: string }) {
  return (
    <nav aria-label={label} className={`grid auto-cols-fr grid-flow-col gap-1 rounded-full bg-white p-1 shadow-[0_1px_2px_rgb(15_18_63/.04),0_8px_24px_-14px_rgb(15_18_63/.18)] sm:inline-grid ${className}`}>
      {items.map((it) => {
        const Icon = it.icon;
        return (
          <Link
            key={it.href}
            href={it.href}
            scroll={false}
            aria-current={it.active ? "page" : undefined}
            className={`press flex min-h-11 min-w-0 items-center justify-center gap-1.5 rounded-full px-3 text-sm font-semibold whitespace-nowrap transition-colors sm:px-5 ${
              it.active ? "bg-brand-900 text-white shadow-[0_6px_14px_-8px_rgb(15_18_63/.8)]" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
            }`}
          >
            {Icon && <Icon className={`size-4 shrink-0 ${it.active ? "text-accent-300" : ""}`} strokeWidth={2} aria-hidden />}
            <span className="truncate">{it.label}</span>
            {it.count != null && it.count > 0 && (
              <span className={`tnum rounded-full px-1.5 text-[11px] leading-5 ${it.active ? "bg-white/15 text-white" : "bg-slate-100 text-slate-500"}`}>{it.count}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

/** Filtro em pílulas pequenas (dentro de cards). */
export function FilterPills({ items, label }: { items: { href: string; label: string; active: boolean }[]; label: string }) {
  return (
    <nav aria-label={label} className="no-scrollbar inline-flex max-w-full gap-1 overflow-x-auto rounded-full bg-slate-100/90 p-1">
      {items.map((it) => (
        <Link
          key={it.href}
          href={it.href}
          scroll={false}
          aria-current={it.active ? "true" : undefined}
          className={`press flex min-h-9 items-center rounded-full px-3.5 text-[13px] font-semibold whitespace-nowrap transition-colors ${
            it.active ? "bg-white text-brand-900 shadow-[0_2px_8px_-3px_rgb(15_18_63/.25)]" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          {it.label}
        </Link>
      ))}
    </nav>
  );
}

/** Card com título (sem linha dura): cabeçalho leve + conteúdo. */
export function Panel({
  title,
  subtitle,
  icon: Icon,
  iconTone = "brand",
  count,
  actions,
  children,
  className = "",
  id,
}: {
  title: string;
  subtitle?: ReactNode;
  icon?: LucideIcon;
  iconTone?: TileTone;
  count?: number;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={`min-w-0 overflow-hidden ${SURFACE} ${className}`}>
      <div className="flex min-h-[60px] flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 pt-4 pb-2 sm:px-6 sm:pt-5">
        <div className="flex min-w-0 items-center gap-3">
          {Icon && <IconTile icon={Icon} tone={iconTone} size="sm" />}
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-[17px] leading-snug font-bold tracking-[-0.015em] text-brand-950">
              <span className="truncate">{title}</span>
              {count != null && <span className="tnum rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">{count}</span>}
            </h2>
            {subtitle && <p className="text-[13px] text-slate-500">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
      {children}
    </section>
  );
}

/** Título de seção fora de card ("Recent transactions … See all"). */
export function SectionTitle({ title, actions, className = "" }: { title: string; actions?: ReactNode; className?: string }) {
  return (
    <div className={`mb-3 flex items-center justify-between gap-3 ${className}`}>
      <h2 className="text-[17px] font-bold tracking-[-0.015em] text-brand-950">{title}</h2>
      {actions}
    </div>
  );
}

const txTones = {
  in: "text-emerald-600",
  out: "text-rose-600",
  neutral: "text-slate-900",
} as const;

/** Linha estilo "transação": ícone redondo 44px, título, data, valor colorido à direita. */
export function TxRowBody({
  leading,
  title,
  subtitle,
  amount,
  amountTone = "neutral",
  amountSub,
  chevron,
  meta,
}: {
  leading: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  amount?: ReactNode;
  amountTone?: keyof typeof txTones;
  amountSub?: ReactNode;
  chevron?: boolean;
  meta?: ReactNode;
}) {
  return (
    <>
      {leading}
      <span className="min-w-0 flex-1 text-left">
        <span className="block truncate text-[15px] leading-snug font-semibold text-slate-900">{title}</span>
        {subtitle && <span className="mt-0.5 block truncate text-[12.5px] text-slate-500">{subtitle}</span>}
        {meta && <span className="mt-1.5 flex flex-wrap items-center gap-1">{meta}</span>}
      </span>
      {(amount != null || amountSub) && (
        <span className="shrink-0 text-right">
          {amount != null && <span className={`block text-[15px] leading-snug font-bold whitespace-nowrap tnum ${txTones[amountTone]}`}>{amount}</span>}
          {amountSub && <span className="mt-0.5 block text-[11.5px] whitespace-nowrap text-slate-400">{amountSub}</span>}
        </span>
      )}
      {chevron && <ChevronRight className="tap-chevron -mr-1 size-[18px] shrink-0 text-slate-300" strokeWidth={2} aria-hidden />}
    </>
  );
}

export const TX_ROW = "flex min-h-[68px] w-full items-center gap-3 px-4 py-3 sm:px-6";
export const TX_ROW_HOVER = "tap rounded-none hover:bg-slate-50/80 active:bg-slate-100/80";

/** Linha de transação com link opcional. */
export function TxRow({ href, ...props }: Parameters<typeof TxRowBody>[0] & { href?: string }) {
  return href ? (
    <Link href={href} className={`${TX_ROW} ${TX_ROW_HOVER}`}>
      <TxRowBody chevron {...props} />
    </Link>
  ) : (
    <div className={TX_ROW}>
      <TxRowBody {...props} />
    </div>
  );
}

/** Estilo dos atalhos (ref. 2 "Quick Menu"): ícone num círculo branco sobre fundo tinto. */
export const QUICK_TILE =
  "press group flex min-h-[104px] min-w-0 flex-col items-start justify-between gap-3 rounded-[22px] p-3.5 text-left text-[14px] leading-tight font-semibold text-brand-950 sm:min-h-[112px] sm:p-4";

export const QUICK_TONES = {
  green: "bg-linear-to-br from-emerald-50 to-emerald-100/70 hover:from-emerald-100/70",
  red: "bg-linear-to-br from-rose-50 to-rose-100/70 hover:from-rose-100/70",
  brand: "bg-linear-to-br from-brand-50 to-accent-50 hover:from-brand-100/70",
  accent: "bg-linear-to-br from-accent-50 to-accent-100 hover:from-accent-100",
} as const;

export function QuickTileBody({ icon: Icon, label, hint, iconClass = "text-brand-800" }: { icon: LucideIcon; label: ReactNode; hint?: ReactNode; iconClass?: string }) {
  return (
    <>
      <span className={`flex size-10 items-center justify-center rounded-full bg-white shadow-[0_4px_12px_-6px_rgb(15_18_63/.35)] transition-transform duration-200 group-hover:scale-105 ${iconClass}`} aria-hidden>
        <Icon className="size-[19px]" strokeWidth={2.1} />
      </span>
      <span className="min-w-0">
        <span className="block">{label}</span>
        {hint && <span className="mt-0.5 block truncate text-[11.5px] font-medium text-slate-500">{hint}</span>}
      </span>
    </>
  );
}

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
      className={`bar-grow-x flex h-2 w-full gap-[3px] overflow-hidden rounded-full ${dark ? "bg-white/10" : "bg-slate-100"} ${className}`}
      role="img"
      aria-label={`${rented} na obra, ${maintenance} em manutenção, ${free} disponíveis de ${total}`}
    >
      {rented > 0 && <span className={`h-full rounded-full ${dark ? "bg-sky-300" : "bg-sky-500"}`} style={{ width: pct(rented) }} />}
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
    <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-1 text-xs font-semibold text-slate-400 sm:px-6">
      <span className="first-letter:uppercase">{children}</span>
      {right && <span className="tnum">{right}</span>}
    </div>
  );
}
