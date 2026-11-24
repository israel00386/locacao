import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";
import { CountUp, type CountFormat } from "./count-up";
import { Empty, Section } from "./ui";

/*
 * Peças visuais das telas de Estoque, Clientes e Financeiro.
 * Sem "use client": servem tanto para componentes do servidor quanto do navegador.
 */

/** Faixa marinho do topo da tela (no celular encosta no cabeçalho; no computador vira um card arredondado). */
export function Hero({
  back,
  eyebrow,
  title,
  subtitle,
  lead,
  actions,
  children,
}: {
  back?: { href: string; label?: string };
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  lead?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section className="on-navy hero-bg relative -mx-4 -mt-5 overflow-hidden px-5 pt-5 pb-16 text-white lg:mx-0 lg:mt-0 lg:rounded-[28px] lg:px-9 lg:pt-8 lg:pb-[4.5rem]">
      <div className="scaffold-grid pointer-events-none absolute inset-0" aria-hidden />
      <div className="relative">
        {back && (
          <Link
            href={back.href}
            className="-ml-2 mb-2 inline-flex min-h-10 items-center gap-1 rounded-xl px-2 text-sm font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            <ChevronLeft className="size-4" strokeWidth={2} aria-hidden />
            {back.label ?? "Voltar"}
          </Link>
        )}
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
          <div className="flex min-w-0 max-w-full items-center gap-3.5">
            {lead}
            <div className="min-w-0">
              {eyebrow && <div className="micro mb-2 text-accent-300/90">{eyebrow}</div>}
              <h1 className="text-[1.75rem] leading-[1.15] font-bold tracking-[-0.02em] break-words sm:text-[2rem]">{title}</h1>
              {subtitle && <div className="mt-1.5 text-[15px] text-white/65">{subtitle}</div>}
            </div>
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
        {children && <div className="mt-6 lg:mt-8">{children}</div>}
      </div>
    </section>
  );
}

/** Conteúdo que sobe por cima da borda de baixo do Hero (efeito de camadas). */
export function HeroOverlap({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`relative -mt-10 lg:-mt-12 ${className}`}>{children}</div>;
}

/** Número grande dentro do Hero. */
export function HeroStat({
  label,
  icon: Icon,
  amount,
  value,
  format = "int",
  hint,
  tone = "white",
  size = "md",
}: {
  label: string;
  icon?: LucideIcon;
  amount?: number;
  value?: ReactNode;
  format?: CountFormat;
  hint?: ReactNode;
  tone?: "white" | "green" | "red" | "accent";
  size?: "md" | "lg";
}) {
  const color = { white: "text-white", green: "text-emerald-300", red: "text-rose-300", accent: "text-accent-300" }[tone];
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5 text-[13px] font-medium text-white/60">
        {Icon && <Icon className="size-3.5 shrink-0" strokeWidth={2} aria-hidden />}
        <span className="truncate">{label}</span>
      </div>
      <div className={`tnum mt-1 leading-none font-bold tracking-[-0.02em] break-words ${color} ${size === "lg" ? "text-[1.75rem] min-[420px]:text-[2rem] sm:text-[2.5rem] tracking-[-0.03em]" : "text-lg min-[420px]:text-xl sm:text-2xl"}`}>
        {amount != null ? <CountUp value={amount} format={format} /> : value}
      </div>
      {hint && <div className="mt-2 text-[13px] text-white/55">{hint}</div>}
    </div>
  );
}

/** Botão translúcido para usar sobre o marinho (utility do design system). */
export const navyBtn = "btn-glass";

const tileTones = {
  brand: "bg-brand-50 text-brand-600",
  sky: "bg-sky-50 text-sky-600",
  green: "bg-emerald-50 text-emerald-600",
  red: "bg-rose-50 text-rose-600",
  amber: "bg-amber-50 text-amber-600",
  slate: "bg-slate-100 text-slate-500",
  accent: "bg-accent-100 text-accent-700",
} as const;
export type TileTone = keyof typeof tileTones;

/** Ícone dentro de um quadrado arredondado tingido (36px por padrão). */
export function IconTile({ icon: Icon, tone = "brand", className = "", size = "md" }: { icon: LucideIcon; tone?: TileTone | string; className?: string; size?: "sm" | "md" | "lg" }) {
  const box = size === "sm" ? "size-8 rounded-[10px]" : size === "lg" ? "size-11 rounded-[14px]" : "size-9 rounded-xl";
  const ic = size === "sm" ? "size-4" : size === "lg" ? "size-5" : "size-[18px]";
  const cls = tone in tileTones ? tileTones[tone as TileTone] : tone;
  return (
    <span className={`flex shrink-0 items-center justify-center ${box} ${cls} ${className}`} aria-hidden>
      <Icon className={ic} strokeWidth={1.9} />
    </span>
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
      className={`flex h-2 w-full gap-[2px] overflow-hidden rounded-full ${dark ? "bg-white/10" : "bg-slate-100"} ${className}`}
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

/** Estado vazio dentro de um card/seção (usa o <Empty plain> do design system). */
export function EmptyState({ icon: Icon, title, children, action }: { icon: LucideIcon; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <Empty plain icon={<Icon strokeWidth={1.75} />} title={title} action={action}>
      {children}
    </Empty>
  );
}

/** <Section> do design system com ícone lucide e contador opcional. */
export function Panel({
  title,
  icon: Icon,
  count,
  actions,
  children,
}: {
  title: string;
  icon?: LucideIcon;
  count?: number;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const right =
    count != null || actions ? (
      <div className="flex items-center gap-2">
        {count != null && <span className="tnum rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">{count}</span>}
        {actions}
      </div>
    ) : undefined;
  return (
    <Section title={title} icon={Icon ? <Icon /> : undefined} actions={right}>
      {children}
    </Section>
  );
}
