import Link from "next/link";
import { Boxes, ChevronRight, Eye, EyeOff, HardHat, Package, PackageCheck, PackageX, Plus, Wrench } from "lucide-react";
import { EmptyState, LegendDot, NavyStat, OccupancyBar } from "@/components/screen-kit";
import { Badge, BalanceCard, Chip, IconBox, Section, Stat, TopBar } from "@/components/ui";
import { fmtDate } from "@/lib/dates";
import { unitMoney } from "@/lib/format";
import { getStock } from "@/lib/rentals";

export const metadata = { title: "Estoque" };

const PRICES = [
  ["priceDaily", "Dia"],
  ["priceWeekly", "Sem."],
  ["priceBiweekly", "Quinz."],
  ["priceMonthly", "Mês"],
] as const;

export default async function EstoquePage({ searchParams }: { searchParams: Promise<{ inativos?: string }> }) {
  const sp = await searchParams;
  const showInactive = sp.inativos === "1";
  const stock = await getStock({ includeInactive: showInactive });

  const units = stock.reduce((t, s) => t + s.totalQty, 0);
  const rented = stock.reduce((t, s) => t + s.rentedQty, 0);
  const maintenance = stock.reduce((t, s) => t + s.maintenanceQty, 0);
  const available = Math.max(0, units - rented - maintenance);
  const lacking = stock.filter((s) => s.active && s.totalQty > 0 && s.availableQty <= 0).length;
  const usage = units ? Math.round((rented / units) * 100) : 0;
  // Mais ocupados primeiro (como o "breakdown" da referência).
  const ordered = [...stock].sort((a, b) => Number(b.active) - Number(a.active) || b.rentedQty / Math.max(b.totalQty, 1) - a.rentedQty / Math.max(a.totalQty, 1));

  return (
    <>
      <TopBar
        title="Estoque"
        subtitle={`${stock.length} equipamento${stock.length === 1 ? "" : "s"}`}
        actions={
          <>
            <Link
              href={showInactive ? "/estoque" : "/estoque?inativos=1"}
              className="btn-round"
              aria-label={showInactive ? "Esconder inativos" : "Mostrar inativos"}
              title={showInactive ? "Esconder inativos" : "Mostrar inativos"}
            >
              {showInactive ? <EyeOff className="size-5" strokeWidth={1.9} /> : <Eye className="size-5" strokeWidth={1.9} />}
            </Link>
            <Link href="/estoque/novo" className="btn-primary rounded-full" aria-label="Novo equipamento">
              <Plus className="size-4" strokeWidth={2.4} aria-hidden /> <span className="hidden min-[420px]:inline">Equipamento</span>
            </Link>
          </>
        }
      />

      <div className="mb-4 grid grid-cols-1 gap-4 lg:mb-5 lg:grid-cols-12 lg:gap-5">
        <BalanceCard
          className="lg:col-span-7"
          label="Unidades no estoque"
          icon={<Boxes />}
          amount={units}
          format="int"
          chips={
            <>
              <Chip tone="glass-yellow" icon={<HardHat />}>
                {usage}% na obra
              </Chip>
              <Chip tone="glass">
                {stock.length} equipamento{stock.length === 1 ? "" : "s"}
              </Chip>
            </>
          }
        >
          <OccupancyBar dark total={units} rented={rented} maintenance={maintenance} className="h-2.5" />
          <div className="mt-4 grid grid-cols-3 gap-3">
            <NavyStat label="Na obra" tone="accent">
              {rented.toLocaleString("pt-BR")}
            </NavyStat>
            <NavyStat label="Manutenção">{maintenance.toLocaleString("pt-BR")}</NavyStat>
            <NavyStat label="Disponível" tone="green">
              {available.toLocaleString("pt-BR")}
            </NavyStat>
          </div>
        </BalanceCard>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:col-span-5">
          <Stat label="Disponíveis" icon={<PackageCheck />} tone="green" amount={available} hint="prontas para locar" />
          <Stat label="Sem estoque" icon={<PackageX />} tone={lacking ? "red" : undefined} amount={lacking} hint={lacking ? "equipamentos zerados" : "tudo com saldo"} />
          <p className="col-span-2 card-soft px-4 py-3.5 text-[13px] leading-relaxed text-slate-600 sm:px-5">
            <strong className="text-brand-950">Na obra</strong> = locações ativas sem devolução registrada. Unidades em manutenção não entram no disponível.
          </p>
        </div>
      </div>

      {stock.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Package}
            title="Nenhum equipamento cadastrado"
            action={
              <Link href="/estoque/novo" className="btn-primary rounded-full">
                <Plus className="size-4" aria-hidden /> Cadastrar equipamento
              </Link>
            }
          >
            Cadastre andaimes, escoras, betoneiras… com a quantidade e a tabela de preços.
          </EmptyState>
        </div>
      ) : (
        <Section
          title="Ocupação por equipamento"
          icon={<HardHat />}
          description="Mais ocupados primeiro"
          actions={
            <span className="hidden flex-wrap gap-x-3 text-xs text-slate-500 sm:flex">
              <LegendDot className="bg-sky-400">Na obra</LegendDot>
              <LegendDot className="bg-amber-400">Manutenção</LegendDot>
              <LegendDot className="bg-emerald-500">Livre</LegendDot>
            </span>
          }
        >
          <ul className="grid grid-cols-1 gap-x-2 pb-2 lg:grid-cols-2">
            {ordered.map((s) => {
              const out = s.availableQty <= 0;
              const pct = s.totalQty ? Math.round((s.rentedQty / s.totalQty) * 100) : 0;
              return (
                <li key={s.id} className={`border-t border-slate-100/80 first:border-t-0 lg:[&:nth-child(2)]:border-t-0 ${s.active ? "" : "opacity-60"}`}>
                  <Link href={`/estoque/${s.id}`} className="tap group block px-4 py-4 hover:bg-slate-50/70 sm:px-5">
                    <div className="flex items-center gap-3">
                      <IconBox tone={out ? "rose" : pct >= 70 ? "amber" : "brand"} size="lg">
                        <Package />
                      </IconBox>
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="truncate text-[15px] leading-snug font-semibold text-slate-900">{s.name}</span>
                          {!s.active && <Badge>Inativo</Badge>}
                        </div>
                        <div className="mt-0.5 truncate text-[13px] text-slate-500 tnum">
                          {pct}% na obra · {s.totalQty} no total
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className={`text-[17px] leading-none font-bold tnum ${out ? "text-rose-600" : "text-brand-950"}`}>{s.availableQty}</div>
                        <div className="mt-1 text-[11px] font-medium text-slate-500">livres</div>
                      </div>
                      <ChevronRight className="tap-chevron -mr-1 size-[18px] shrink-0 text-slate-300" aria-hidden />
                    </div>
                    <OccupancyBar total={s.totalQty} rented={s.rentedQty} maintenance={s.maintenanceQty} className="mt-3" />
                    <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-slate-500 tnum">
                      <LegendDot className="bg-sky-400">{s.rentedQty} na obra</LegendDot>
                      {s.maintenanceQty > 0 && <LegendDot className="bg-amber-400">{s.maintenanceQty} manut.</LegendDot>}
                      <span className="ml-auto flex flex-wrap justify-end gap-1">
                        {PRICES.map(([k, l]) =>
                          s[k] == null ? null : (
                            <span key={k} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
                              {l} <strong className="font-semibold text-slate-800">{unitMoney(s[k])}</strong>
                            </span>
                          ),
                        )}
                      </span>
                    </div>
                    <div className="sr-only">Contagem {fmtDate(s.countedAt)}</div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Section>
      )}
    </>
  );
}
