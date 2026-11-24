import Link from "next/link";
import { CalendarDays, ChevronRight, MapPin } from "lucide-react";
import { Badge } from "./ui";
import { Avatar, deadlineInfo, ProgressBar, SOFT, TEXT_TONES } from "./rental-ui";
import { paymentStatus, situation } from "@/lib/calc";
import { fmtDateShort, today } from "@/lib/dates";
import { money, rentalCode } from "@/lib/format";
import type { RentalWithCalc } from "@/lib/rentals";

const MAX_CHIPS = 3;

/**
 * Locação em lista.
 * - `row` (padrão): linha rica para listas com divisórias (painel, cliente).
 * - `card`: cartão branco macio independente (tela de Locações).
 */
export function RentalCard({ r, variant = "row" }: { r: RentalWithCalc; variant?: "row" | "card" }) {
  const sit = situation(r.stage, r.calc);
  const fin = paymentStatus(r.stage, r.calc);
  const dl = deadlineInfo(r, r.calc, today());
  const showFin = r.stage !== "ORCAMENTO" && r.stage !== "CANCELADA";
  const hasOpen = showFin && r.calc.open > 0.009;

  const chips = r.items.map((i, idx) => ({ id: i.id, qty: i.qty, name: i.equipment.name, addition: r.calc.items[idx].addition }));
  const shown = chips.slice(0, MAX_CHIPS);
  const rest = chips.length - shown.length;
  const isCard = variant === "card";

  const shell = isCard
    ? `${SOFT} flex flex-col p-4 transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-[0_2px_4px_rgb(15_18_63/.05),0_22px_44px_-20px_rgb(15_18_63/.3)] min-[400px]:p-5`
    : "flex flex-col px-4 py-4 hover:bg-slate-50/80 active:bg-slate-100/80 sm:px-5";

  return (
    <Link href={`/locacoes/${r.id}`} className={`tap group block min-w-0 ${shell}`} aria-label={`${r.customer.name}, ${rentalCode(r.number)}, ${sit.label}`}>
      {/* Cliente */}
      <div className="flex items-start gap-3">
        <Avatar name={r.customer.name} tone={r.calc.overdue && r.stage === "ATIVA" ? "red" : undefined} className={isCard ? "h-11! w-11!" : ""} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="truncate text-[15px] leading-snug font-semibold text-brand-950">{r.customer.name}</div>
          </div>
          <div className="mt-0.5 flex min-w-0 items-center gap-1 text-[12.5px] text-slate-500">
            <MapPin size={12} strokeWidth={2} className="shrink-0 text-slate-400" aria-hidden />
            <span className="truncate">{r.siteAddress || "Sem endereço"}</span>
          </div>
        </div>
        <span className="tnum shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[11px] leading-none font-semibold text-slate-500">{rentalCode(r.number)}</span>
      </div>

      {/* Itens */}
      <div className="mt-3.5 flex flex-wrap gap-1.5">
        {shown.map((c) => (
          <span
            key={c.id}
            className={`inline-flex max-w-full items-center gap-1 truncate rounded-full px-2.5 py-1.5 text-[11.5px] leading-none font-medium ${
              c.addition ? "bg-amber-50 text-amber-800" : "bg-slate-100/80 text-slate-700"
            }`}
          >
            <span className="tnum font-bold">{c.addition ? "+" : ""}{c.qty}×</span>
            <span className="truncate">{c.name}</span>
          </span>
        ))}
        {rest > 0 && <span className="inline-flex items-center rounded-full bg-slate-100/80 px-2.5 py-1.5 text-[11.5px] leading-none font-semibold text-slate-500">+{rest}</span>}
      </div>

      {/* Prazo */}
      <div className="mt-3.5">
        <div className="flex items-center justify-between gap-2 text-[12px]">
          <span className="tnum flex min-w-0 items-center gap-1.5 text-slate-500">
            <CalendarDays size={13} strokeWidth={2} className="shrink-0 text-slate-400" aria-hidden />
            <span className="truncate">
              {fmtDateShort(r.startDate)} <span className="text-slate-300">→</span> {fmtDateShort(r.expectedEndDate)}
            </span>
          </span>
          <span className={`shrink-0 font-semibold ${TEXT_TONES[dl.tone]}`}>{dl.label}</span>
        </div>
        {dl.pct != null && <ProgressBar value={dl.pct} tone={dl.tone} className="mt-2" label="Prazo da locação" />}
      </div>

      {/* Valor + situação */}
      <div className="mt-auto flex items-end justify-between gap-3 pt-4">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <Badge tone={sit.tone}>
            {sit.label}
            {r.calc.overdue ? ` ${r.calc.overdueDays}d` : ""}
          </Badge>
          {showFin && <Badge tone={fin.tone}>{fin.label}</Badge>}
          {r.negotiating && <Badge tone="amber">Negociação</Badge>}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <div className="text-right">
            <div className="tnum text-[17px] leading-tight font-bold tracking-[-0.02em] text-brand-950">{money(r.calc.total)}</div>
            {hasOpen && r.calc.paid > 0 ? (
              <div className="tnum text-[11px] font-semibold text-red-600">falta {money(r.calc.open)}</div>
            ) : (
              <div className="text-[11px] text-slate-400">{r.stage === "ORCAMENTO" ? "orçamento" : "total"}</div>
            )}
          </div>
          <ChevronRight size={18} className="-mr-1 shrink-0 text-slate-300 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-slate-400" aria-hidden />
        </div>
      </div>
    </Link>
  );
}
