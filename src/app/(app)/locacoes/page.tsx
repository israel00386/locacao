import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { Empty, PageHeader } from "@/components/ui";
import { RentalCard } from "@/components/rental-card";
import { listRentals } from "@/lib/rentals";
import { money } from "@/lib/format";

export const metadata = { title: "Locações" };

const TABS = [
  { key: "ativas", label: "Na obra" },
  { key: "atrasadas", label: "Atrasadas" },
  { key: "receber", label: "A receber" },
  { key: "orcamentos", label: "Orçamentos" },
  { key: "encerradas", label: "Encerradas" },
  { key: "todas", label: "Todas" },
] as const;

export default async function LocacoesPage({ searchParams }: { searchParams: Promise<{ aba?: string; q?: string }> }) {
  const sp = await searchParams;
  const tab = TABS.find((t) => t.key === sp.aba)?.key ?? "ativas";
  const q = (sp.q ?? "").trim();

  const where: Prisma.RentalWhereInput = {};
  if (tab === "ativas" || tab === "atrasadas") where.stage = "ATIVA";
  if (tab === "orcamentos") where.stage = "ORCAMENTO";
  if (tab === "encerradas") where.stage = "ENCERRADA";
  if (tab === "receber") where.stage = { in: ["ATIVA", "ENCERRADA"] };
  if (q) {
    const num = Number(q.replace(/\D/g, ""));
    where.OR = [
      { customer: { name: { contains: q, mode: "insensitive" } } },
      { siteAddress: { contains: q, mode: "insensitive" } },
      ...(num ? [{ number: num }] : []),
    ];
  }

  let rows = await listRentals(where);
  if (tab === "atrasadas") rows = rows.filter((r) => r.calc.overdue);
  if (tab === "receber") rows = rows.filter((r) => r.calc.open > 0.009);
  if (tab === "ativas") rows.sort((a, b) => Number(b.calc.overdue) - Number(a.calc.overdue));

  const sum = rows.reduce((s, r) => s + (tab === "receber" ? r.calc.open : r.calc.total), 0);

  return (
    <>
      <PageHeader
        title="Locações"
        actions={<Link href="/locacoes/nova" className="btn-primary hidden lg:inline-flex">+ Nova locação</Link>}
      />
      <form className="mb-3">
        <input type="hidden" name="aba" value={tab} />
        <input name="q" defaultValue={q} className="input" placeholder="Buscar por cliente, obra ou número…" type="search" />
      </form>
      <div className="-mx-4 mb-3 flex gap-1.5 overflow-x-auto px-4 pb-1 lg:mx-0 lg:px-0">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/locacoes?aba=${t.key}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium ring-1 ${
              tab === t.key ? "bg-brand-600 text-white ring-brand-600" : "bg-white text-slate-700 ring-slate-300"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>
      {rows.length === 0 ? (
        <Empty>Nada por aqui.</Empty>
      ) : (
        <>
          <div className="mb-2 text-xs text-slate-500">
            {rows.length} {rows.length === 1 ? "locação" : "locações"} · {tab === "receber" ? "em aberto" : "total"} {money(sum)}
          </div>
          <div className="card divide-y divide-slate-100 overflow-hidden">
            {rows.map((r) => (
              <RentalCard key={r.id} r={r} />
            ))}
          </div>
        </>
      )}
    </>
  );
}
