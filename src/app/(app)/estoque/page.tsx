import Link from "next/link";
import { Boxes, ChevronRight, Eye, EyeOff, HardHat, Package, PackageX, Plus, Wrench } from "lucide-react";
import { Badge } from "@/components/ui";
import { EmptyState, Hero, HeroOverlap, HeroStat, LegendDot, OccupancyBar } from "@/components/screen-kit";
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
  const lacking = stock.filter((s) => s.active && s.totalQty > 0 && s.availableQty <= 0).length;
  const usage = units ? Math.round((rented / units) * 100) : 0;

  return (
    <>
      <Hero
        eyebrow="Estoque"
        title="Equipamentos"
        subtitle="Na obra = locações ativas sem devolução registrada"
        actions={
          <Link href="/estoque/novo" className="btn-accent">
            <Plus className="size-4" strokeWidth={2.2} aria-hidden /> Equipamento
          </Link>
        }
      >
        <div className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-4">
          <HeroStat label="Unidades" icon={Boxes} amount={units} size="lg" hint={`${stock.length} equipamento${stock.length === 1 ? "" : "s"}`} />
          <HeroStat label="Na obra" icon={HardHat} amount={rented} size="lg" tone="accent" hint={`${usage}% do total`} />
          <HeroStat label="Manutenção" icon={Wrench} amount={maintenance} />
          <HeroStat label="Sem estoque" icon={PackageX} amount={lacking} tone={lacking ? "red" : "white"} hint={lacking ? "equipamentos zerados" : "tudo com saldo"} />
        </div>
        <OccupancyBar dark total={units} rented={rented} maintenance={maintenance} className="mt-5 h-2.5" />
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/60">
          <LegendDot className="bg-sky-300">Na obra</LegendDot>
          <LegendDot className="bg-amber-300">Manutenção</LegendDot>
          <LegendDot className="bg-emerald-300">Disponível</LegendDot>
        </div>
      </Hero>

      <HeroOverlap>
        {stock.length === 0 ? (
          <div className="card rounded-[20px]">
            <EmptyState
              icon={Package}
              title="Nenhum equipamento cadastrado"
              action={
                <Link href="/estoque/novo" className="btn-primary">
                  <Plus className="size-4" aria-hidden /> Cadastrar equipamento
                </Link>
              }
            >
              Cadastre andaimes, escoras, betoneiras… com a quantidade e a tabela de preços.
            </EmptyState>
          </div>
        ) : (
          <ul className="stagger grid gap-3 lg:grid-cols-2">
            {stock.map((s) => {
              const out = s.availableQty <= 0;
              return (
                <li key={s.id} className={s.active ? "" : "opacity-60"}>
                  <Link
                    href={`/estoque/${s.id}`}
                    className="tap group card block h-full rounded-[20px] p-4 transition-shadow hover:shadow-[var(--shadow-raised)] sm:p-5"
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${out ? "bg-rose-50 text-rose-600" : "bg-brand-50 text-brand-600"}`}
                        aria-hidden
                      >
                        <Package className="size-5" strokeWidth={1.8} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-[15px] font-semibold text-slate-900">{s.name}</span>
                          {!s.active && <Badge>Inativo</Badge>}
                        </div>
                        <div className="mt-0.5 text-xs text-slate-500 tnum">
                          {s.totalQty} no total · contagem {fmtDate(s.countedAt)}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className={`text-xl leading-none font-bold tracking-tight tnum ${out ? "text-rose-600" : "text-emerald-600"}`}>{s.availableQty}</div>
                        <div className="mt-1 text-[11px] font-medium text-slate-500">disponíveis</div>
                      </div>
                      <ChevronRight className="mt-2 -mr-1 size-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5" aria-hidden />
                    </div>

                    <OccupancyBar total={s.totalQty} rented={s.rentedQty} maintenance={s.maintenanceQty} className="mt-4" />
                    <div className="mt-2 flex flex-wrap gap-x-3.5 gap-y-1 text-xs text-slate-500 tnum">
                      <LegendDot className="bg-sky-500">{s.rentedQty} na obra</LegendDot>
                      {s.maintenanceQty > 0 && <LegendDot className="bg-amber-400">{s.maintenanceQty} manutenção</LegendDot>}
                      <LegendDot className="bg-emerald-500">{Math.max(0, s.availableQty)} livres</LegendDot>
                    </div>

                    <div className="mt-3.5 flex flex-wrap gap-1.5">
                      {PRICES.map(([k, l]) => (
                        <span
                          key={k}
                          className={`inline-flex items-baseline gap-1 rounded-lg px-2 py-1 text-[11px] ring-1 ring-inset tnum ${
                            s[k] == null ? "bg-white text-slate-400 ring-slate-200" : "bg-slate-50 text-slate-700 ring-slate-200/80"
                          }`}
                        >
                          <span className="font-medium text-slate-500">{l}</span>
                          <span className="font-semibold">{s[k] == null ? "—" : unitMoney(s[k])}</span>
                        </span>
                      ))}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        <div className="mt-4 flex justify-center">
          <Link href={showInactive ? "/estoque" : "/estoque?inativos=1"} className="btn-ghost btn-sm text-slate-500">
            {showInactive ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
            {showInactive ? "Esconder inativos" : "Mostrar inativos"}
          </Link>
        </div>
      </HeroOverlap>
    </>
  );
}
