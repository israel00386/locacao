import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftRight, Boxes, ChevronRight, ClipboardCheck, HardHat, History, MapPin, Package, PackageMinus, PackagePlus, PackageCheck, Tags, Wrench } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Avatar, Badge } from "@/components/ui";
import { EquipmentForm, StockEntryForm } from "@/components/equipment-forms";
import { EmptyState, Hero, HeroOverlap, HeroStat, LegendDot, OccupancyBar, Panel } from "@/components/screen-kit";
import { db } from "@/lib/db";
import { fmtDate, todayISO } from "@/lib/dates";
import { getStock, listRentals } from "@/lib/rentals";
import { addStockEntry, saveEquipment } from "../actions";

const KIND: Record<string, { label: string; icon: LucideIcon; dot: string; pill: string }> = {
  COMPRA: { label: "Entrada", icon: PackagePlus, dot: "bg-emerald-500 text-white", pill: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  BAIXA: { label: "Baixa", icon: PackageMinus, dot: "bg-rose-500 text-white", pill: "bg-rose-50 text-rose-700 ring-rose-200" },
  RECONTAGEM: { label: "Recontagem", icon: ClipboardCheck, dot: "bg-brand-600 text-white", pill: "bg-brand-50 text-brand-700 ring-brand-200" },
  MANUTENCAO: { label: "Manutenção", icon: Wrench, dot: "bg-amber-400 text-brand-950", pill: "bg-amber-50 text-amber-800 ring-amber-200" },
};

export default async function EquipamentoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (id === "novo") {
    return (
      <>
        <Hero
          back={{ href: "/estoque", label: "Estoque" }}
          eyebrow="Novo cadastro"
          title="Novo equipamento"
          subtitle="Nome, quantidade e tabela de preços. O estoque inicial entra no histórico."
        />
        <HeroOverlap>
          <div className="card mx-auto max-w-2xl">
            <EquipmentForm action={saveEquipment.bind(null, null)} />
          </div>
        </HeroOverlap>
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
      <Hero
        back={{ href: "/estoque", label: "Estoque" }}
        eyebrow="Equipamento"
        title={eq.name}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            {!eq.active && <Badge>Inativo</Badge>}
            {eq.countedAt ? `Última contagem ou entrada em ${fmtDate(eq.countedAt)}` : "Sem contagem registrada"}
          </span>
        }
        lead={
          <span className="hidden size-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-accent-300 ring-1 ring-white/15 ring-inset sm:flex" aria-hidden>
            <Package className="size-7" strokeWidth={1.6} />
          </span>
        }
      >
        <div className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-4">
          <HeroStat label="Disponível" icon={PackageCheck} amount={row.availableQty} size="lg" tone={row.availableQty <= 0 ? "red" : "green"} />
          <HeroStat label="Total" icon={Boxes} amount={row.totalQty} size="lg" />
          <HeroStat label="Na obra" icon={HardHat} amount={row.rentedQty} tone="accent" hint={`${onSite.length} locaç${onSite.length === 1 ? "ão" : "ões"}`} />
          <HeroStat label="Manutenção" icon={Wrench} amount={row.maintenanceQty} />
        </div>
        <OccupancyBar dark total={row.totalQty} rented={row.rentedQty} maintenance={row.maintenanceQty} className="mt-5 h-2.5" />
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/60">
          <LegendDot className="bg-sky-300">Na obra</LegendDot>
          <LegendDot className="bg-amber-300">Manutenção</LegendDot>
          <LegendDot className="bg-emerald-300">Disponível</LegendDot>
        </div>
      </Hero>

      <HeroOverlap className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <Panel title="Movimentar estoque" icon={ArrowLeftRight}>
            <StockEntryForm action={addStockEntry.bind(null, id)} todayISO={todayISO()} total={eq.totalQty} />
          </Panel>

          <Panel title="Histórico do total" icon={History} count={eq.stockEntries.length}>
            {eq.stockEntries.length ? (
              <ol className="px-4 pt-4 pb-4 sm:px-5">
                {eq.stockEntries.map((s, i) => {
                  const k = KIND[s.kind] ?? KIND.RECONTAGEM;
                  const Icon = k.icon;
                  const last = i === eq.stockEntries.length - 1;
                  return (
                    <li key={s.id} className="relative flex gap-3.5 pb-4 last:pb-0">
                      {!last && <span className="absolute top-9 bottom-0 left-[15px] w-px bg-slate-200" aria-hidden />}
                      <span className={`relative z-[1] flex size-8 shrink-0 items-center justify-center rounded-full ring-4 ring-white ${k.dot}`} aria-hidden>
                        <Icon className="size-4" strokeWidth={2} />
                      </span>
                      <div className="min-w-0 flex-1 pt-0.5">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="text-sm font-semibold text-slate-900">{k.label ?? s.kind}</span>
                          <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-bold ring-1 ring-inset tnum ${k.pill}`}>
                            {s.qtyChange > 0 ? `+${s.qtyChange}` : s.qtyChange === 0 ? "±0" : s.qtyChange}
                          </span>
                          <span className="ml-auto text-xs text-slate-500 tnum">total {s.totalAfter}</span>
                        </div>
                        <div className="mt-0.5 text-xs text-slate-500">
                          <span className="tnum">{fmtDate(s.date)}</span>
                          {s.note && <span className="break-words"> · {s.note}</span>}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <EmptyState icon={History} title="Sem lançamentos ainda">
                Entradas, baixas e recontagens aparecem aqui com data e observação.
              </EmptyState>
            )}
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel title="Na obra agora" icon={HardHat} count={onSite.length}>
            {onSite.length ? (
              <ul className="divide-y divide-slate-100">
                {onSite.map(({ r, qty }) => (
                  <li key={r.id}>
                    <Link href={`/locacoes/${r.id}`} className="tap group flex min-h-16 items-center gap-3 px-5 py-3 hover:bg-slate-50 active:bg-slate-100">
                      <Avatar name={r.customer.name} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-slate-900">{r.customer.name}</span>
                        <span className="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-500">
                          <MapPin className="size-3 shrink-0" aria-hidden />
                          <span className="truncate">{r.siteAddress || "Sem endereço"}</span>
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className={`block text-base leading-none font-bold tnum ${r.calc.overdue ? "text-red-700" : "text-slate-900"}`}>{qty}</span>
                        <span className={`mt-1 block text-[11px] font-medium ${r.calc.overdue ? "text-red-600" : "text-slate-500"}`}>
                          {r.calc.overdue ? "atrasada" : "unid."}
                        </span>
                      </span>
                      <ChevronRight className="size-4 shrink-0 text-slate-300" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon={HardHat} title="Nenhuma unidade na obra">
                Quando uma locação ativa levar este equipamento, ela aparece aqui.
              </EmptyState>
            )}
          </Panel>

          <Panel title="Dados e preços" icon={Tags}>
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
          </Panel>
        </div>
      </HeroOverlap>
    </>
  );
}
