import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { NavyHero } from "@/components/rental-ui";
import { RentalForm, type InitialRental } from "@/components/rental-form";
import { rentalFormOptions } from "@/lib/form-options";
import { getRental } from "@/lib/rentals";
import { toISODate, todayISO } from "@/lib/dates";
import { rentalCode, type Period } from "@/lib/format";

export const metadata = { title: "Editar locação" };

export default async function EditarLocacaoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await getRental(id);
  if (!r) notFound();
  const { customers, equipment } = await rentalFormOptions(r);
  const initial: InitialRental = {
    id: r.id,
    customerId: r.customerId,
    siteAddress: r.siteAddress,
    startDate: toISODate(r.startDate),
    expectedEndDate: toISODate(r.expectedEndDate),
    discount: Number(r.discount),
    notes: r.notes ?? "",
    stage: r.stage,
    items: r.items.map((i, idx) => ({
      id: i.id,
      equipmentId: i.equipmentId,
      qty: i.qty,
      unitPrice: Number(i.unitPrice),
      period: i.period as Period,
      daysOverride: i.daysOverride,
      returnedQty: r.calc.items[idx].returnedQty,
      addition: i.startDate ? { startDate: toISODate(i.startDate), expectedEndDate: toISODate(i.expectedEndDate) } : undefined,
    })),
    extras: r.extras.map((e) => ({ description: e.description, amount: Number(e.amount) })),
  };
  return (
    <>
      <NavyHero className="pb-16 lg:pb-16">
        <Link
          href={`/locacoes/${r.id}`}
          className="-ml-2 inline-flex min-h-10 items-center gap-1 rounded-xl px-2 text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white"
        >
          <ChevronLeft size={18} aria-hidden /> {rentalCode(r.number)}
        </Link>
        <div className="mt-2 text-[11px] font-semibold tracking-[0.08em] text-accent-300/90 uppercase">
          Editar {r.stage === "ORCAMENTO" ? "orçamento" : "locação"} · {rentalCode(r.number)}
        </div>
        <h1 className="mt-1 text-[26px] leading-tight font-bold tracking-[-0.02em] break-words sm:text-[28px]">{r.customer.name}</h1>
        <p className="mt-1 max-w-xl text-sm text-white/65">Altere cliente, obra, prazo, equipamentos e valores. Devoluções e pagamentos ficam na página da locação.</p>
      </NavyHero>
      <div className="relative z-10 -mt-10">
        <RentalForm customers={customers} equipment={equipment} initial={initial} todayISO={todayISO()} />
      </div>
    </>
  );
}
