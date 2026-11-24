import Link from "next/link";
import type { ReactNode } from "react";

import type { Tone } from "@/lib/calc";
import { CountUp, type CountFormat } from "./count-up";

// Cores de status pedidas pelo cliente.
const tones: Record<Tone, string> = {
  gray: "bg-slate-100 text-slate-700 ring-slate-200", // A vencer (cinza claro)
  sky: "bg-sky-100 text-sky-800 ring-sky-200", // Na obra (azul claro)
  yellow: "bg-yellow-100 text-yellow-800 ring-yellow-200", // Devolvido (amarelo claro)
  green: "bg-green-600 text-white ring-green-600", // Pago (verde)
  blue: "bg-blue-600 text-white ring-blue-600", // Finalizado (azul)
  red: "bg-red-600 text-white ring-red-600", // Atrasado (vermelho)
  amber: "bg-amber-50 text-amber-800 ring-amber-200",
};

export function Badge({ tone = "gray", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function PageHeader({ title, subtitle, back, actions }: { title: string; subtitle?: ReactNode; back?: string; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0 max-w-full">
        {back && (
          <Link href={back} className="-ml-2 mb-1 inline-flex min-h-10 items-center gap-1 rounded-lg px-2 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800">
            ← Voltar
          </Link>
        )}
        <h1 className="truncate text-2xl font-extrabold tracking-tight text-brand-900 sm:text-[1.7rem]">{title}</h1>
        {subtitle && <div className="mt-1 text-sm text-slate-500">{subtitle}</div>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

/**
 * Indicador numérico. `value` continua aceitando texto já formatado;
 * com `amount` (número) o valor é animado (contagem) no formato `format`.
 */
export function Stat({
  label,
  value,
  amount,
  format = "int",
  hint,
  tone,
}: {
  label: string;
  value?: ReactNode;
  amount?: number;
  format?: CountFormat;
  hint?: ReactNode;
  tone?: "red" | "green";
}) {
  const color = tone === "red" ? "text-red-700" : tone === "green" ? "text-emerald-700" : "text-brand-900";
  const bar = tone === "red" ? "bg-red-500" : tone === "green" ? "bg-emerald-500" : "bg-accent-400";
  return (
    <div className="card relative overflow-hidden p-4">
      <span className={`absolute inset-y-0 left-0 w-1 ${bar}`} aria-hidden />
      <div className="text-xs font-semibold text-slate-500">{label}</div>
      <div className={`tnum mt-1 text-lg leading-tight font-extrabold tracking-tight break-words min-[400px]:text-xl sm:text-2xl ${color}`}>
        {amount != null ? <CountUp value={amount} format={format} /> : value}
      </div>
      {hint && <div className="mt-0.5 text-xs text-slate-500">{hint}</div>}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="card px-6 py-10 text-center text-sm text-slate-500">{children}</div>;
}

export function Section({ title, actions, children }: { title: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <section className="card overflow-hidden">
      <div className="flex min-h-12 items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/60 px-4 py-2.5">
        <h2 className="flex items-center gap-2 text-sm font-bold text-brand-900">
          <span className="h-3.5 w-1 rounded-full bg-accent-400" aria-hidden />
          {title}
        </h2>
        {actions}
      </div>
      {children}
    </section>
  );
}

export function Flash({ message, tone = "green" }: { message?: string | null; tone?: "green" | "red" }) {
  if (!message) return null;
  const cls = tone === "red" ? "bg-red-50 text-red-800 ring-red-200" : "bg-emerald-50 text-emerald-800 ring-emerald-200";
  return <div className={`mb-4 rounded-xl px-4 py-3 text-sm ring-1 ${cls}`}>{message}</div>;
}
