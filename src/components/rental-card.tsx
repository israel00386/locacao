import Link from "next/link";
import { Badge } from "./ui";
import { paymentStatus, situation } from "@/lib/calc";
import { fmtDateShort } from "@/lib/dates";
import { money, rentalCode } from "@/lib/format";
import type { RentalWithCalc } from "@/lib/rentals";

export function RentalCard({ r }: { r: RentalWithCalc }) {
  const sit = situation(r.stage, r.calc);
  const fin = paymentStatus(r.stage, r.calc);
  const itemsText = r.items.map((i) => `${i.qty}× ${i.equipment.name}`).join(", ");
  return (
    <Link href={`/locacoes/${r.id}`} className="tap block px-4 py-3 hover:bg-slate-50 active:bg-slate-100">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-semibold">{r.customer.name}</span>
          </div>
          <div className="truncate text-xs text-slate-500">{r.siteAddress || "Sem endereço"}</div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-sm font-semibold tnum">{money(r.calc.total)}</div>
          {r.calc.open > 0.009 && r.stage !== "ORCAMENTO" && r.calc.paid > 0 && (
            <div className="text-[11px] text-red-700 tnum">falta {money(r.calc.open)}</div>
          )}
        </div>
      </div>
      <div className="mt-1.5 truncate text-xs text-slate-600">{itemsText}</div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <Badge tone={sit.tone}>{sit.label}{r.calc.overdue ? ` ${r.calc.overdueDays}d` : ""}</Badge>
        {r.stage !== "ORCAMENTO" && r.stage !== "CANCELADA" && <Badge tone={fin.tone}>{fin.label}</Badge>}
        {r.negotiating && <Badge tone="amber">Negociação</Badge>}
        <span className="ml-auto text-[11px] text-slate-500 tnum">
          {rentalCode(r.number)} · {fmtDateShort(r.startDate)} → {fmtDateShort(r.expectedEndDate)}
        </span>
      </div>
    </Link>
  );
}
