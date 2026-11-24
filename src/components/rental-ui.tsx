// Peças visuais das telas de locação (lista, detalhe, formulário) — estilo v2 "fintech leve".
// Sem estado: podem ser usadas em componentes do servidor e do cliente.
import Link from "next/link";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import type { RentalCalc } from "@/lib/calc";
import { diffDays, inclusiveDays } from "@/lib/dates";
import { Avatar as BaseAvatar, IconBox } from "./ui";

/** Avatar do cliente (usa o Avatar da base; `xl` = maior tamanho da base). */
export function Avatar({ name, size = "md", className = "", tone }: { name: string; size?: "sm" | "md" | "lg" | "xl"; className?: string; tone?: "red" | "navy" | "accent" }) {
  return <BaseAvatar name={name} size={size === "xl" ? "lg" : size} className={className} tone={tone} />;
}

export type TileTone = "brand" | "accent" | "amber" | "green" | "red" | "sky" | "slate" | "navy";

/** Ícone lucide dentro do IconBox da base. */
export function IconTile({ icon: Icon, tone = "brand", size = "md" }: { icon: LucideIcon; tone?: TileTone; size?: "sm" | "md" | "lg" }) {
  return (
    <IconBox tone={tone} size={size}>
      <Icon />
    </IconBox>
  );
}

/* ------------------------------------------------------------------ */
/* Superfícies                                                          */
/* ------------------------------------------------------------------ */

/** Card branco macio (cantos 24px, sem borda dura, sombra difusa). */
export const SOFT = "rounded-[24px] bg-white shadow-[0_1px_2px_rgb(15_18_63/.04),0_10px_30px_-12px_rgb(15_18_63/.12)]";

/** Card com cabeçalho (ícone + título) — blocos do detalhe da locação. */
export function Panel({
  title,
  icon,
  tone = "brand",
  subtitle,
  actions,
  children,
  id,
  className = "",
}: {
  title: string;
  icon: LucideIcon;
  tone?: TileTone;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  id?: string;
  className?: string;
}) {
  return (
    <section id={id} className={`${SOFT} scroll-mt-24 overflow-hidden ${className}`}>
      <header className="flex items-center gap-3 px-4 pt-4 pb-3 sm:px-5 sm:pt-5">
        <IconTile icon={icon} tone={tone} size="lg" />
        <div className="min-w-0 flex-1">
          <h2 className="text-base leading-tight font-semibold tracking-[-0.01em] text-brand-950">{title}</h2>
          {subtitle && <div className="mt-0.5 text-[13px] text-slate-500">{subtitle}</div>}
        </div>
        {actions}
      </header>
      {children}
    </section>
  );
}

/**
 * Cartão-saldo em degradê marinho → azul, com brilho amarelo sutil.
 * Use para o número principal da tela (resumo da lista, saldo da locação, total do formulário).
 */
export function BalanceCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={`on-navy relative isolate overflow-hidden rounded-[28px] bg-[linear-gradient(135deg,var(--color-brand-900)_0%,var(--color-brand-700)_55%,var(--color-brand-600)_100%)] p-5 text-white shadow-[0_20px_40px_-20px_rgb(15_18_63/.55)] sm:p-6 ${className}`}
    >
      <span className="pointer-events-none absolute -top-16 -right-14 -z-10 h-56 w-56 rounded-full bg-[radial-gradient(closest-side,rgb(248_200_10/.22),transparent)]" aria-hidden />
      <span className="pointer-events-none absolute -bottom-24 -left-10 -z-10 h-56 w-56 rounded-full bg-[radial-gradient(closest-side,rgb(143_154_214/.28),transparent)]" aria-hidden />
      <span className="pointer-events-none absolute inset-0 -z-10 rounded-[28px] ring-1 ring-white/10 ring-inset" aria-hidden />
      {children}
    </section>
  );
}

/** Chip translúcido sobre o cartão marinho (ex.: "3 atrasadas"). */
export function GlassChip({ children, dot, className = "" }: { children: ReactNode; dot?: "red" | "accent" | "green" | "sky"; className?: string }) {
  const d = dot === "red" ? "bg-red-400" : dot === "green" ? "bg-emerald-400" : dot === "sky" ? "bg-sky-300" : dot === "accent" ? "bg-accent-400" : "";
  return (
    <span className={`inline-flex min-h-7 items-center gap-1.5 rounded-full bg-white/10 px-2.5 text-[12px] font-semibold whitespace-nowrap text-white/90 ring-1 ring-white/15 ring-inset ${className}`}>
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${d}`} aria-hidden />}
      {children}
    </span>
  );
}

/** Mini-métrica sobre o marinho (rótulo pequeno + valor). */
export function HeroStat({ label, children, tone, className = "" }: { label: string; children: ReactNode; tone?: "red" | "accent" | "green" | "sky"; className?: string }) {
  const dot = tone === "red" ? "bg-red-400" : tone === "green" ? "bg-emerald-400" : tone === "accent" ? "bg-accent-400" : tone === "sky" ? "bg-sky-300" : "bg-white/40";
  return (
    <div className={`min-w-0 ${className}`}>
      <div className="flex items-center gap-1.5 text-[12px] font-medium text-white/65">
        <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} aria-hidden />
        <span className="truncate">{label}</span>
      </div>
      <div className="tnum mt-1 truncate text-lg leading-tight font-bold tracking-[-0.02em] text-white sm:text-xl">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Botões redondos e tiles                                              */
/* ------------------------------------------------------------------ */

const roundCls =
  "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-brand-950 shadow-[0_1px_2px_rgb(15_18_63/.06),0_6px_16px_-8px_rgb(15_18_63/.25)] transition duration-150 hover:bg-slate-50 active:scale-[.94] [&>svg]:h-5 [&>svg]:w-5";

/** Botão redondo branco (voltar, editar, busca) como nas referências. */
export function RoundLink({ href, label, children, className = "" }: { href: string; label: string; children: ReactNode; className?: string }) {
  return (
    <Link href={href} aria-label={label} title={label} className={`${roundCls} ${className}`}>
      {children}
    </Link>
  );
}
export const ROUND_BUTTON = roundCls;

const tileTones = {
  green: "from-emerald-100 to-emerald-50 text-emerald-700",
  brand: "from-brand-100 to-brand-50 text-brand-700",
  accent: "from-accent-200 to-accent-50 text-accent-800",
  amber: "from-amber-100 to-orange-50 text-amber-700",
  sky: "from-sky-100 to-sky-50 text-sky-700",
  violet: "from-violet-100 to-violet-50 text-violet-700",
  rose: "from-rose-100 to-rose-50 text-rose-700",
} as const;
export type QuickTone = keyof typeof tileTones;

/** Classes do tile de ação rápida (para usar em <a>, <Link> ou <button>). */
export function quickTileClass(tone: QuickTone) {
  return `tap group flex min-h-[112px] w-full min-w-0 flex-col justify-between gap-3 rounded-[22px] bg-gradient-to-br p-3.5 text-left transition duration-150 hover:brightness-[1.02] active:scale-[.97] ${tileTones[tone]}`;
}

/** Miolo do tile: ícone em círculo branco + rótulo de duas linhas. */
export function QuickTileBody({ icon: Icon, label, hint }: { icon: LucideIcon; label: ReactNode; hint?: ReactNode }) {
  return (
    <>
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-[0_4px_12px_-6px_rgb(15_18_63/.3)]" aria-hidden>
        <Icon size={20} strokeWidth={2} />
      </span>
      <span className="min-w-0">
        <span className="block text-[14px] leading-tight font-semibold text-brand-950">{label}</span>
        {hint && <span className="mt-0.5 block truncate text-[11.5px] font-medium opacity-80">{hint}</span>}
      </span>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Dados: donut e barras                                                */
/* ------------------------------------------------------------------ */

/** Donut SVG puro. `segments` em valores absolutos; `children` vai no centro. */
export function Donut({
  segments,
  size = 96,
  stroke = 12,
  track = "rgb(255 255 255 / .14)",
  children,
  label,
  className = "",
}: {
  segments: { value: number; color: string }[];
  size?: number;
  stroke?: number;
  track?: string;
  children?: ReactNode;
  label?: string;
  className?: string;
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const total = segments.reduce((s, x) => s + Math.max(0, x.value), 0);
  const gap = segments.filter((s) => s.value > 0).length > 1 ? Math.min(6, circ * 0.02) : 0;
  let offset = 0;
  return (
    <div className={`relative shrink-0 ${className}`} style={{ width: size, height: size }} role="img" aria-label={label}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        {total > 0 &&
          segments.map((s, i) => {
            if (s.value <= 0) return null;
            const len = (s.value / total) * circ;
            const dash = Math.max(0.001, len - gap);
            const el = (
              <circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={s.color}
                strokeWidth={stroke}
                strokeLinecap={gap ? "round" : "butt"}
                strokeDasharray={`${dash} ${circ - dash}`}
                strokeDashoffset={-offset - gap / 2}
              />
            );
            offset += len;
            return el;
          })}
      </svg>
      {children && <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>}
    </div>
  );
}

const BAR_TONES = {
  brand: "bg-gradient-to-r from-brand-400 to-brand-600",
  amber: "bg-gradient-to-r from-amber-300 to-amber-500",
  red: "bg-gradient-to-r from-rose-400 to-red-600",
  green: "bg-gradient-to-r from-emerald-300 to-emerald-500",
  slate: "bg-slate-300",
  yellow: "bg-gradient-to-r from-yellow-300 to-accent-400",
  sky: "bg-gradient-to-r from-sky-300 to-sky-500",
} as const;
export type BarTone = keyof typeof BAR_TONES;

/** Barra arredondada (8px) com trilho suave. */
export function ProgressBar({ value, tone = "brand", className = "", label }: { value: number; tone?: BarTone; className?: string; label?: string }) {
  const pct = Math.max(0, Math.min(100, value * 100));
  return (
    <div
      className={`h-2 overflow-hidden rounded-full bg-slate-100 ${className}`}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      aria-label={label}
    >
      <div className={`h-full rounded-full ${BAR_TONES[tone]}`} style={{ width: `${Math.max(pct, pct > 0 ? 5 : 0)}%` }} />
    </div>
  );
}

export const TEXT_TONES: Record<BarTone, string> = {
  brand: "text-brand-700",
  amber: "text-amber-700",
  red: "text-red-700",
  green: "text-emerald-700",
  slate: "text-slate-500",
  yellow: "text-yellow-800",
  sky: "text-sky-700",
};

/** Situação do prazo para exibir (barra + frase curta). Não muda nenhum cálculo: só lê o que já foi calculado. */
export function deadlineInfo(
  r: { stage: string; startDate: Date; expectedEndDate: Date | null },
  c: Pick<RentalCalc, "overdue" | "overdueDays" | "allReturned" | "nextExpectedEnd" | "outstandingQty">,
  now: Date,
): { pct: number | null; label: string; tone: BarTone } {
  if (r.stage === "CANCELADA") return { pct: null, label: "Cancelada", tone: "slate" };
  if (r.stage === "ENCERRADA") return { pct: 1, label: "Encerrada", tone: "slate" };
  if (r.stage === "ORCAMENTO") {
    const d = diffDays(now, r.startDate);
    const label = d > 1 ? `Retirada em ${d} dias` : d === 1 ? "Retirada amanhã" : d === 0 ? "Retirada hoje" : "Aguardando confirmação";
    return { pct: null, label, tone: "slate" };
  }
  if (c.overdue) return { pct: 1, label: `Atrasada há ${c.overdueDays} ${c.overdueDays === 1 ? "dia" : "dias"}`, tone: "red" };
  if (c.allReturned) return { pct: 1, label: "Tudo devolvido", tone: "yellow" };
  const end = c.nextExpectedEnd ?? r.expectedEndDate;
  if (!end) {
    const on = inclusiveDays(r.startDate, now);
    return { pct: null, label: `Na obra há ${on} ${on === 1 ? "dia" : "dias"}`, tone: "brand" };
  }
  const total = inclusiveDays(r.startDate, end);
  const elapsed = Math.max(0, Math.min(total, inclusiveDays(r.startDate, now)));
  const left = diffDays(now, end);
  const label = left <= 0 ? "Devolução hoje" : left === 1 ? "Devolução amanhã" : `Faltam ${left} dias`;
  return { pct: elapsed / total, label, tone: left <= 2 ? "amber" : "brand" };
}

/** Rótulo pequeno em maiúsculas (11px, tracking 0.08em). */
export function MicroLabel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`text-[11px] font-semibold tracking-[0.08em] text-slate-500 uppercase ${className}`}>{children}</div>;
}

/** Título de seção estilo "Recent Transactions … See all". */
export function SectionTitle({ children, aside, className = "" }: { children: ReactNode; aside?: ReactNode; className?: string }) {
  return (
    <div className={`mb-3 flex items-center justify-between gap-3 px-1 ${className}`}>
      <h2 className="text-[17px] leading-tight font-semibold tracking-[-0.01em] text-brand-950">{children}</h2>
      {aside}
    </div>
  );
}
