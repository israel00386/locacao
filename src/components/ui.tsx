import Link from "next/link";
import type { ReactNode } from "react";

type Tone = "gray" | "blue" | "red" | "amber" | "green";
const tones: Record<Tone, string> = {
  gray: "bg-slate-100 text-slate-700 ring-slate-200",
  blue: "bg-sky-50 text-sky-800 ring-sky-200",
  red: "bg-red-50 text-red-700 ring-red-200",
  amber: "bg-amber-50 text-amber-800 ring-amber-200",
  green: "bg-brand-50 text-brand-700 ring-brand-100",
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
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        {back && (
          <Link href={back} className="mb-1 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
            ← Voltar
          </Link>
        )}
        <h1 className="truncate text-xl font-bold tracking-tight sm:text-2xl">{title}</h1>
        {subtitle && <div className="mt-0.5 text-sm text-slate-500">{subtitle}</div>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Stat({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: ReactNode; tone?: "red" | "green" }) {
  const color = tone === "red" ? "text-red-700" : tone === "green" ? "text-brand-700" : "text-slate-900";
  return (
    <div className="card p-4">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className={`tnum mt-1 text-xl font-bold sm:text-2xl ${color}`}>{value}</div>
      {hint && <div className="mt-0.5 text-xs text-slate-500">{hint}</div>}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="card p-8 text-center text-sm text-slate-500">{children}</div>;
}

export function Section({ title, actions, children }: { title: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <section className="card overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
        {actions}
      </div>
      {children}
    </section>
  );
}

export function Flash({ message, tone = "green" }: { message?: string | null; tone?: "green" | "red" }) {
  if (!message) return null;
  const cls = tone === "red" ? "bg-red-50 text-red-800 ring-red-200" : "bg-brand-50 text-brand-800 ring-brand-100";
  return <div className={`mb-4 rounded-xl px-4 py-3 text-sm ring-1 ${cls}`}>{message}</div>;
}
