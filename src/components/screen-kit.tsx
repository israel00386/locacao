import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";
import { CountUp, type CountFormat } from "./count-up";

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
    <section className="on-navy relative -mx-4 -mt-5 overflow-hidden bg-linear-to-br from-brand-900 via-brand-900 to-brand-800 px-4 pt-4 pb-14 text-white lg:mx-0 lg:mt-0 lg:rounded-[28px] lg:px-8 lg:pt-7 lg:pb-16 lg:shadow-[0_18px_40px_-24px_rgb(8_8_42/.7)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(55%_70%_at_100%_0%,rgb(248_200_10/.16),transparent_65%)]" aria-hidden />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_90%_at_0%_100%,rgb(58_71_158/.45),transparent_60%)]" aria-hidden />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05] [background-image:linear-gradient(rgb(255_255_255)_1px,transparent_1px),linear-gradient(90deg,rgb(255_255_255)_1px,transparent_1px)] [background-size:28px_28px] [mask-image:linear-gradient(180deg,black,transparent_85%)]"
        aria-hidden
      />
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
              {eyebrow && <div className="mb-1 text-[11px] font-semibold tracking-[0.08em] text-accent-300 uppercase">{eyebrow}</div>}
              <h1 className="text-[26px] leading-tight font-bold tracking-[-0.02em] break-words sm:text-[28px]">{title}</h1>
              {subtitle && <div className="mt-1 text-sm text-white/65">{subtitle}</div>}
            </div>
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
        {children && <div className="mt-6">{children}</div>}
      </div>
    </section>
  );
}

/** Conteúdo que sobe por cima da borda de baixo do Hero (efeito de camadas). */
export function HeroOverlap({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`relative -mt-9 lg:-mt-10 ${className}`}>{children}</div>;
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
      <div className="flex items-center gap-1.5 text-[12px] font-medium text-white/60">
        {Icon && <Icon className="size-3.5 shrink-0" strokeWidth={2} aria-hidden />}
        <span className="truncate">{label}</span>
      </div>
      <div className={`tnum mt-1 leading-none font-bold tracking-[-0.02em] break-words ${color} ${size === "lg" ? "text-[30px] sm:text-[36px]" : "text-xl sm:text-2xl"}`}>
        {amount != null ? <CountUp value={amount} format={format} /> : value}
      </div>
      {hint && <div className="mt-1.5 text-xs text-white/50">{hint}</div>}
    </div>
  );
}

/** Botão translúcido para usar sobre o marinho. */
export const navyBtn =
  "inline-flex min-h-11 select-none items-center justify-center gap-2 rounded-[14px] bg-white/10 px-4 text-sm font-semibold text-white ring-1 ring-white/15 ring-inset backdrop-blur transition duration-150 hover:bg-white/15 active:scale-[.97] sm:min-h-10";

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

const avatarTones = [
  "bg-brand-100 text-brand-700",
  "bg-sky-100 text-sky-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-800",
  "bg-rose-100 text-rose-700",
  "bg-violet-100 text-violet-700",
  "bg-teal-100 text-teal-700",
];

export function initials(name: string): string {
  const words = name
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w && !/^(de|da|do|dos|das|e)$/i.test(w));
  if (!words.length) return "?";
  return (words[0][0] + (words[1]?.[0] ?? "")).toUpperCase();
}

/** Avatar com as iniciais do nome; a cor sai do próprio nome (sempre a mesma para o mesmo cliente). */
export function Avatar({ name, size = "md", className = "" }: { name: string; size?: "sm" | "md" | "lg" | "xl"; className?: string }) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const tone = avatarTones[h % avatarTones.length];
  const box = { sm: "size-8 text-[11px]", md: "size-10 text-[13px]", lg: "size-12 text-base", xl: "size-14 text-lg" }[size];
  return (
    <span className={`flex shrink-0 items-center justify-center rounded-full font-bold tracking-tight ${box} ${className || tone}`} aria-hidden>
      {initials(name)}
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

/** Estado vazio com ícone grande, texto e ação. */
export function EmptyState({ icon: Icon, title, children, action }: { icon: LucideIcon; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400" aria-hidden>
        <Icon className="size-7" strokeWidth={1.6} />
      </span>
      <div className="mt-3 text-[15px] font-semibold text-slate-800">{title}</div>
      {children && <div className="mt-1 max-w-xs text-sm text-slate-500">{children}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** Card de seção com título e ícone (cabeçalho mais leve que o Section). */
export function Panel({
  title,
  icon: Icon,
  count,
  actions,
  children,
  className = "",
}: {
  title: string;
  icon?: LucideIcon;
  count?: number;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`card overflow-hidden rounded-[20px] ${className}`}>
      <div className="flex min-h-14 items-center justify-between gap-2 px-5 pt-4 pb-2">
        <h2 className="flex min-w-0 items-center gap-2.5 text-[15px] font-semibold tracking-[-0.01em] text-slate-900">
          {Icon && <IconTile icon={Icon} size="sm" tone="brand" />}
          <span className="truncate">{title}</span>
          {count != null && <span className="tnum rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">{count}</span>}
        </h2>
        {actions}
      </div>
      {children}
    </section>
  );
}
