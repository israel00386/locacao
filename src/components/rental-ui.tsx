// Peças visuais das telas de locação (lista, detalhe, formulário).
// Sem estado: podem ser usadas em componentes do servidor e do cliente.
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import type { RentalCalc } from "@/lib/calc";
import { diffDays, inclusiveDays } from "@/lib/dates";

const AVATAR_TINTS = [
  "bg-brand-100 text-brand-700 ring-brand-200/70",
  "bg-sky-100 text-sky-800 ring-sky-200/70",
  "bg-amber-100 text-amber-800 ring-amber-200/70",
  "bg-emerald-100 text-emerald-800 ring-emerald-200/70",
  "bg-violet-100 text-violet-800 ring-violet-200/70",
  "bg-rose-100 text-rose-800 ring-rose-200/70",
  "bg-teal-100 text-teal-800 ring-teal-200/70",
];

const STOP = new Set(["da", "de", "do", "das", "dos", "e", "ltda", "me", "eireli", "s/a", "sa"]);

export function initials(name: string): string {
  const words = name
    .trim()
    .split(/\s+/)
    .filter((w) => w && !STOP.has(w.toLowerCase()));
  if (!words.length) return "?";
  const first = words[0][0];
  const last = words.length > 1 ? words[words.length - 1][0] : (words[0][1] ?? "");
  return (first + last).toUpperCase();
}

function tintFor(name: string) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_TINTS[h % AVATAR_TINTS.length];
}

/** Avatar com as iniciais do cliente (cor fixa por nome). */
export function Avatar({ name, size = "md", className = "" }: { name: string; size?: "sm" | "md" | "lg" | "xl"; className?: string }) {
  const s = {
    sm: "h-8 w-8 text-[11px] rounded-[10px]",
    md: "h-11 w-11 text-sm rounded-[14px]",
    lg: "h-12 w-12 text-base rounded-2xl",
    xl: "h-14 w-14 text-lg rounded-[18px]",
  }[size];
  return (
    <span className={`flex shrink-0 items-center justify-center font-bold tracking-tight ring-1 ring-inset ${s} ${tintFor(name)} ${className}`} aria-hidden>
      {initials(name)}
    </span>
  );
}

const TILE_TONES = {
  brand: "bg-brand-50 text-brand-600 ring-brand-100",
  accent: "bg-accent-100 text-accent-700 ring-accent-200/70",
  amber: "bg-amber-50 text-amber-700 ring-amber-200/70",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-200/70",
  red: "bg-red-50 text-red-700 ring-red-200/70",
  sky: "bg-sky-50 text-sky-700 ring-sky-200/70",
  slate: "bg-slate-100 text-slate-600 ring-slate-200/70",
  navy: "bg-white/10 text-accent-300 ring-white/15",
} as const;
export type TileTone = keyof typeof TILE_TONES;

/** Ícone dentro de um quadrado arredondado com fundo tinto. */
export function IconTile({ icon: Icon, tone = "brand", size = "md" }: { icon: LucideIcon; tone?: TileTone; size?: "sm" | "md" | "lg" }) {
  const s = { sm: "h-8 w-8 rounded-[10px]", md: "h-9 w-9 rounded-xl", lg: "h-11 w-11 rounded-[14px]" }[size];
  const i = { sm: 16, md: 18, lg: 20 }[size];
  return (
    <span className={`flex shrink-0 items-center justify-center ring-1 ring-inset ${s} ${TILE_TONES[tone]}`} aria-hidden>
      <Icon size={i} strokeWidth={1.9} />
    </span>
  );
}

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
    <section id={id} className={`card scroll-mt-24 overflow-hidden rounded-[20px] ${className}`}>
      <header className="flex items-center gap-3 px-5 pt-4 pb-3">
        <IconTile icon={icon} tone={tone} />
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] leading-tight font-semibold tracking-[-0.01em] text-slate-900">{title}</h2>
          {subtitle && <div className="mt-0.5 text-xs text-slate-500">{subtitle}</div>}
        </div>
        {actions}
      </header>
      {children}
    </section>
  );
}

/** Faixa marinho do topo das telas (degradê + brilho amarelo bem leve). */
export function NavyHero({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`on-navy relative isolate -mx-4 -mt-5 overflow-hidden bg-gradient-to-br from-brand-900 via-brand-900 to-brand-800 px-4 pt-5 text-white lg:mx-0 lg:mt-0 lg:rounded-[28px] lg:px-8 lg:pt-7 lg:shadow-[0_20px_50px_-24px_rgb(8_8_42/.6)] ${className}`}
    >
      <div className="pointer-events-none absolute -top-24 -right-16 -z-10 h-72 w-72 rounded-full bg-[radial-gradient(closest-side,rgb(248_200_10/.16),transparent)]" aria-hidden />
      <div className="pointer-events-none absolute -bottom-32 -left-20 -z-10 h-80 w-80 rounded-full bg-[radial-gradient(closest-side,rgb(58_71_158/.55),transparent)]" aria-hidden />
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.07] [background-image:linear-gradient(rgb(255_255_255/.6)_1px,transparent_1px),linear-gradient(90deg,rgb(255_255_255/.6)_1px,transparent_1px)] [background-size:28px_28px] [mask-image:linear-gradient(to_bottom,black,transparent_85%)]"
        aria-hidden
      />
      {children}
    </div>
  );
}

/** Número-chave dentro da faixa marinho. */
export function HeroStat({ label, children, tone, className = "" }: { label: string; children: ReactNode; tone?: "red" | "accent" | "green"; className?: string }) {
  const dot = tone === "red" ? "bg-red-400" : tone === "green" ? "bg-emerald-400" : tone === "accent" ? "bg-accent-400" : "bg-white/40";
  return (
    <div className={`min-w-0 rounded-2xl bg-white/[0.06] px-3.5 py-3 ${className} ring-1 ring-white/10 backdrop-blur-sm`}>
      <div className="flex items-center gap-1.5 text-[11px] font-medium text-white/65">
        <span className={`h-1.5 w-1.5 rounded-full ${dot}`} aria-hidden />
        <span className="truncate">{label}</span>
      </div>
      <div className="tnum mt-1 truncate text-lg leading-tight font-bold tracking-[-0.02em] text-white sm:text-xl">{children}</div>
    </div>
  );
}

const BAR_TONES = {
  brand: "bg-gradient-to-r from-brand-500 to-brand-600",
  amber: "bg-gradient-to-r from-amber-400 to-amber-500",
  red: "bg-gradient-to-r from-red-500 to-red-600",
  green: "bg-gradient-to-r from-emerald-400 to-emerald-500",
  slate: "bg-slate-300",
  yellow: "bg-gradient-to-r from-yellow-300 to-yellow-400",
} as const;
export type BarTone = keyof typeof BAR_TONES;

export function ProgressBar({ value, tone = "brand", className = "", label }: { value: number; tone?: BarTone; className?: string; label?: string }) {
  const pct = Math.max(0, Math.min(100, value * 100));
  return (
    <div
      className={`h-1.5 overflow-hidden rounded-full bg-slate-100 ${className}`}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      aria-label={label}
    >
      <div className={`h-full rounded-full ${BAR_TONES[tone]}`} style={{ width: `${Math.max(pct, pct > 0 ? 4 : 0)}%` }} />
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
