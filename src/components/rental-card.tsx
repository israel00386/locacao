import Link from "next/link";
import { CalendarDays, ChevronRight, MapPin } from "lucide-react";
import { Badge } from "./ui";
import { Avatar, deadlineInfo, ProgressBar, TEXT_TONES } from "./rental-ui";
import { paymentStatus, situation } from "@/lib/calc";
import { fmtDateShort, today } from "@/lib/dates";
import { money, rentalCode } from "@/lib/format";
import type { RentalWithCalc } from "@/lib/rentals";

const MAX_CHIPS = 3;

/**
 * Locação em lista.
 * - `row` (padrão): linha rica para listas com divisórias (painel).
 * - `card`: cartão independente (tela de Locações).
 */
export function RentalCard({ r, variant = "row" }: { r: RentalWithCalc; variant?: "row" | "card" }) {
  const sit = situation(r.stage, r.calc);
  const fin = paymentStatus(r.stage, r.calc);
  const dl = deadlineInfo(r, r.calc, today());
  const showFin = r.stage !== "ORCAMENTO" && r.stage !== "CANCELADA";
  const partial = r.calc.open > 0.009 && showFin && r.calc.paid > 0;

  const chips = r.items.map((i, idx) => ({ id: i.id, qty: i.qty, name: i.equipment.name, addition: r.calc.items[idx].addition }));
  const shown = chips.slice(0, MAX_CHIPS);
  const rest = chips.length - shown.length;

  const shell =
    variant === "card"
      ? "card rounded-[20px] p-4 transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-raised)] sm:p-5"
      : "px-4 py-4 hover:bg-slate-50/80 active:bg-slate-100/80";

  return (
    <Link href={`/locacoes/${r.id}`} className={`tap group block ${shell}`} aria-label={`${r.customer.name}, ${rentalCode(r.number)}, ${sit.label}`}>
      <div className="flex items-start gap-3">
        <Avatar name={r.customer.name} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-[15px] leading-snug font-semibold text-slate-900">{r.customer.name}</div>
              <div className="mt-0.5 flex min-w-0 items-center gap-1 text-xs text-slate-500">
                <MapPin size={12} strokeWidth={2} className="shrink-0 text-slate-400" aria-hidden />
                <span className="truncate">{r.siteAddress || "Sem endereço"}</span>
              </div>
            </div>
            <div className="shrink-0 text-right">
              <div className="tnum text-[15px] leading-snug font-bold tracking-[-0.01em] text-brand-900">{money(r.calc.total)}</div>
              {partial ? (
                <div className="tnum text-[11px] font-medium text-red-700">falta {money(r.calc.open)}</div>
              ) : (
                <div className="tnum text-[11px] text-slate-400">{rentalCode(r.number)}</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Itens */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {shown.map((c) => (
          <span
            key={c.id}
            className={`inline-flex max-w-full items-center gap-1 truncate rounded-lg px-2 py-1 text-[11.5px] leading-none font-medium ${
              c.addition ? "bg-amber-50 text-amber-800 ring-1 ring-amber-200/70 ring-inset" : "bg-slate-100 text-slate-700"
            }`}
          >
            <span className="tnum font-semibold">{c.addition ? "+" : ""}{c.qty}×</span>
            <span className="truncate">{c.name}</span>
          </span>
        ))}
        {rest > 0 && <span className="inline-flex items-center rounded-lg bg-slate-100 px-2 py-1 text-[11.5px] leading-none font-semibold text-slate-500">+{rest}</span>}
      </div>

      {/* Prazo */}
      <div className="mt-3">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="tnum flex items-center gap-1.5 text-slate-500">
            <CalendarDays size={13} strokeWidth={2} className="text-slate-400" aria-hidden />
            {fmtDateShort(r.startDate)} <span className="text-slate-300">→</span> {fmtDateShort(r.expectedEndDate)}
          </span>
          <span className={`font-semibold ${TEXT_TONES[dl.tone]}`}>{dl.label}</span>
        </div>
        {dl.pct != null && <ProgressBar value={dl.pct} tone={dl.tone} className="mt-1.5" label="Prazo da locação" />}
      </div>

      {/* Situação */}
      <div className="mt-3 flex items-center gap-1.5">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          <Badge tone={sit.tone}>
            {sit.label}
            {r.calc.overdue ? ` ${r.calc.overdueDays}d` : ""}
          </Badge>
          {showFin && <Badge tone={fin.tone}>{fin.label}</Badge>}
          {r.negotiating && <Badge tone="amber">Negociação</Badge>}
        </div>
        {partial && <span className="tnum shrink-0 text-[11px] text-slate-400">{rentalCode(r.number)}</span>}
        <ChevronRight size={18} className="shrink-0 text-slate-300 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-slate-400" aria-hidden />
      </div>
    </Link>
  );
}
