import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui";
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
      <PageHeader title={`Editar ${rentalCode(r.number)}`} back={`/locacoes/${r.id}`} />
      <RentalForm customers={customers} equipment={equipment} initial={initial} todayISO={todayISO()} />
    </>
  );
}
