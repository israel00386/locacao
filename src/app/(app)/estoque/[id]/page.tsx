import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader, Section, Stat } from "@/components/ui";
import { EquipmentForm, StockEntryForm } from "@/components/equipment-forms";
import { db } from "@/lib/db";
import { fmtDate, todayISO } from "@/lib/dates";
import { getStock, listRentals } from "@/lib/rentals";
import { addStockEntry, saveEquipment } from "../actions";

const KIND: Record<string, string> = { COMPRA: "Entrada", BAIXA: "Baixa", RECONTAGEM: "Recontagem", MANUTENCAO: "Manutenção" };

export default async function EquipamentoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (id === "novo") {
    return (
      <>
        <PageHeader title="Novo equipamento" back="/estoque" />
        <div className="card">
          <EquipmentForm action={saveEquipment.bind(null, null)} />
        </div>
      </>
    );
  }

  const eq = await db.equipment.findUnique({ where: { id }, include: { stockEntries: { orderBy: [{ date: "desc" }, { createdAt: "desc" }], take: 30 } } });
  if (!eq) notFound();
  const [row] = (await getStock({ includeInactive: true })).filter((s) => s.id === id);
  const onSite = (await listRentals({ stage: "ATIVA", items: { some: { equipmentId: id } } }))
    .map((r) => {
      const qty = r.items.reduce((s, it, idx) => (it.equipmentId === id ? s + r.calc.items[idx].outstandingQty : s), 0);
      return { r, qty };
    })
    .filter((x) => x.qty > 0);

  return (
    <>
      <PageHeader title={eq.name} back="/estoque" subtitle={eq.countedAt ? `Última contagem/entrada: ${fmtDate(eq.countedAt)}` : undefined} />
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Total" value={row.totalQty} />
        <Stat label="Na obra" value={row.rentedQty} />
        <Stat label="Manutenção" value={row.maintenanceQty} />
        <Stat label="Disponível" value={row.availableQty} tone={row.availableQty <= 0 ? "red" : "green"} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <Section title="Entrada, baixa ou recontagem">
            <StockEntryForm action={addStockEntry.bind(null, id)} todayISO={todayISO()} total={eq.totalQty} />
          </Section>
          <Section title="Histórico do total">
            {eq.stockEntries.length ? (
              <ul className="divide-y divide-slate-100 text-sm">
                {eq.stockEntries.map((s) => (
                  <li key={s.id} className="flex justify-between gap-3 px-4 py-2">
                    <span>
                      <span className="font-medium">{KIND[s.kind] ?? s.kind}</span>{" "}
                      <span className="tnum">{s.qtyChange > 0 ? `+${s.qtyChange}` : s.qtyChange}</span>
                      <span className="block text-xs text-slate-500">{fmtDate(s.date)}{s.note ? ` · ${s.note}` : ""}</span>
                    </span>
                    <span className="text-xs text-slate-500 tnum">total {s.totalAfter}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-4 py-4 text-sm text-slate-500">Sem lançamentos ainda.</p>
            )}
          </Section>
        </div>
        <div className="space-y-4">
          <Section title={`Na obra agora (${onSite.length})`}>
            {onSite.length ? (
              <ul className="divide-y divide-slate-100 text-sm">
                {onSite.map(({ r, qty }) => (
                  <li key={r.id}>
                    <Link href={`/locacoes/${r.id}`} className="flex justify-between gap-3 px-4 py-2 hover:bg-slate-50">
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{r.customer.name}</span>
                        <span className="block truncate text-xs text-slate-500">{r.siteAddress}</span>
                      </span>
                      <span className={`font-semibold tnum ${r.calc.overdue ? "text-red-700" : ""}`}>{qty}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-4 py-4 text-sm text-slate-500">Nenhuma unidade na obra.</p>
            )}
          </Section>
          <Section title="Dados e preços">
            <EquipmentForm
              action={saveEquipment.bind(null, id)}
              initial={{
                name: eq.name,
                maintenanceQty: eq.maintenanceQty,
                priceDaily: row.priceDaily,
                priceWeekly: row.priceWeekly,
                priceBiweekly: row.priceBiweekly,
                priceMonthly: row.priceMonthly,
                active: eq.active,
              }}
            />
          </Section>
        </div>
      </div>
    </>
  );
}
