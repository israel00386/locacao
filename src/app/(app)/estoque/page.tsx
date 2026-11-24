import Link from "next/link";
import { PageHeader, Stat } from "@/components/ui";
import { fmtDate } from "@/lib/dates";
import { unitMoney } from "@/lib/format";
import { getStock } from "@/lib/rentals";

export const metadata = { title: "Estoque" };

export default async function EstoquePage({ searchParams }: { searchParams: Promise<{ inativos?: string }> }) {
  const sp = await searchParams;
  const showInactive = sp.inativos === "1";
  const stock = await getStock({ includeInactive: showInactive });
  const p = (v: number | null) => (v == null ? "—" : unitMoney(v));
  return (
    <>
      <PageHeader
        title="Estoque"
        subtitle="Na obra = locações ativas sem devolução registrada"
        actions={<Link href="/estoque/novo" className="btn-primary">+ Equipamento</Link>}
      />

      <div className="mb-4 grid grid-cols-3 gap-3">
        <Stat label="Unidades" amount={stock.reduce((t, s) => t + s.totalQty, 0)} />
        <Stat label="Na obra" amount={stock.reduce((t, s) => t + s.rentedQty, 0)} />
        <Stat label="Sem estoque" amount={stock.filter((s) => s.active && s.totalQty > 0 && s.availableQty <= 0).length} tone="red" />
      </div>

      {/* Celular: cartões */}
      <div className="card stagger divide-y divide-slate-100 overflow-hidden lg:hidden">
        {stock.map((s) => (
          <Link key={s.id} href={`/estoque/${s.id}`} className={`tap block px-4 py-3 hover:bg-slate-50 active:bg-slate-100 ${s.active ? "" : "opacity-50"}`}>
            <div className="flex items-start justify-between gap-3">
              <span className="text-sm font-semibold">{s.name}</span>
              <span className={`text-sm font-bold tnum ${s.availableQty <= 0 ? "text-red-700" : "text-emerald-700"}`}>{s.availableQty} disp.</span>
            </div>
            <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-slate-500 tnum">
              <span>Total {s.totalQty}</span>
              <span>Na obra {s.rentedQty}</span>
              {s.maintenanceQty > 0 && <span>Manutenção {s.maintenanceQty}</span>}
              <span>Diária {p(s.priceDaily)}</span>
              <span>Mensal {p(s.priceMonthly)}</span>
            </div>
          </Link>
        ))}
      </div>

      {/* Computador: tabela */}
      <div className="card hidden overflow-x-auto lg:block">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Equipamento</th>
              <th className="px-2 py-2 text-right font-medium">Total</th>
              <th className="px-2 py-2 text-right font-medium">Na obra</th>
              <th className="px-2 py-2 text-right font-medium">Manut.</th>
              <th className="px-2 py-2 text-right font-medium">Disponível</th>
              <th className="px-2 py-2 text-right font-medium">Diária</th>
              <th className="px-2 py-2 text-right font-medium">Semana</th>
              <th className="px-2 py-2 text-right font-medium">Quinzena</th>
              <th className="px-2 py-2 text-right font-medium">Mês</th>
              <th className="px-4 py-2 text-right font-medium">Contagem</th>
            </tr>
          </thead>
          <tbody className="stagger divide-y divide-slate-100 tnum">
            {stock.map((s) => (
              <tr key={s.id} className={`hover:bg-slate-50 ${s.active ? "" : "opacity-50"}`}>
                <td className="px-4 py-2">
                  <Link href={`/estoque/${s.id}`} className="font-medium hover:underline">{s.name}</Link>
                </td>
                <td className="px-2 py-2 text-right">{s.totalQty}</td>
                <td className="px-2 py-2 text-right">{s.rentedQty}</td>
                <td className="px-2 py-2 text-right">{s.maintenanceQty || ""}</td>
                <td className={`px-2 py-2 text-right font-semibold ${s.availableQty <= 0 ? "text-red-700" : "text-emerald-700"}`}>{s.availableQty}</td>
                <td className="px-2 py-2 text-right">{p(s.priceDaily)}</td>
                <td className="px-2 py-2 text-right">{p(s.priceWeekly)}</td>
                <td className="px-2 py-2 text-right">{p(s.priceBiweekly)}</td>
                <td className="px-2 py-2 text-right">{p(s.priceMonthly)}</td>
                <td className="px-4 py-2 text-right text-xs text-slate-500">{fmtDate(s.countedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 text-right text-xs">
        <Link href={showInactive ? "/estoque" : "/estoque?inativos=1"} className="inline-flex min-h-10 items-center px-2 text-slate-500 underline">
          {showInactive ? "Esconder inativos" : "Mostrar inativos"}
        </Link>
      </div>
    </>
  );
}
