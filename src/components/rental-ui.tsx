// Peças visuais das telas de locação (lista, detalhe, formulário) — complementam a base v2 de ui.tsx
// (BalanceCard, Donut, TopBar, RoundButton, QuickTile, SectionTitle, Chip vêm de lá).
// Sem estado: podem ser usadas em componentes do servidor e do cliente.
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

/** Card branco macio da base v2 (utilitário `card`). */
export const SOFT = "card";

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

const tileTones = {
  emerald: "from-emerald-100 to-emerald-50 text-emerald-700",
  brand: "from-brand-100/90 to-brand-50 text-brand-700",
  accent: "from-accent-200/80 to-accent-50 text-accent-800",
  sky: "from-sky-100 to-sky-50 text-sky-700",
  violet: "from-violet-100 to-violet-50 text-violet-700",
  rose: "from-rose-100 to-rose-50 text-rose-700",
  amber: "from-amber-100 to-orange-50 text-amber-700",
} as const;
export type QuickTone = keyof typeof tileTones;

/**
 * Mesmo visual do <QuickTile/> da base, para quando o tile precisa ser <a target="_blank"> ou <button>
 * (WhatsApp, PDF, abrir a folha de acréscimo).
 */
export function quickTileClass(tone: QuickTone) {
  return `tap group flex min-h-[7.5rem] w-full min-w-0 flex-col justify-between gap-3 rounded-3xl bg-gradient-to-br p-4 text-left transition-[transform,filter] hover:brightness-[1.02] sm:min-h-[8.5rem] sm:p-5 ${tileTones[tone]}`;
}

/** Miolo do tile: ícone em círculo branco + rótulo de duas linhas. */
export function QuickTileBody({ icon: Icon, label, hint }: { icon: LucideIcon; label: ReactNode; hint?: ReactNode }) {
  return (
    <>
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-[0_4px_12px_-6px_rgb(15_18_63/.25)]" aria-hidden>
        <Icon size={20} strokeWidth={2} />
      </span>
      <span className="min-w-0">
        <span className="block text-[15px] leading-tight font-semibold text-brand-950">{label}</span>
        {hint && <span className="mt-0.5 block truncate text-xs text-slate-500">{hint}</span>}
      </span>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Dados: donut e barras                                                */
/* ------------------------------------------------------------------ */

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
