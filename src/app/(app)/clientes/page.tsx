import Link from "next/link";
import { Badge, Empty, PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { money } from "@/lib/format";
import { listRentals } from "@/lib/rentals";

export const metadata = { title: "Clientes" };

export default async function ClientesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const term = q.trim();
  const [customers, open] = await Promise.all([
    db.customer.findMany({
      where: term
        ? { OR: [{ name: { contains: term, mode: "insensitive" } }, { phone: { contains: term } }, { responsible: { contains: term, mode: "insensitive" } }] }
        : {},
      orderBy: { name: "asc" },
    }),
    listRentals({ stage: { in: ["ATIVA", "ENCERRADA"] } }),
  ]);
  const balance = new Map<string, number>();
  const onSite = new Map<string, number>();
  for (const r of open) {
    if (r.calc.open > 0.009) balance.set(r.customerId, (balance.get(r.customerId) ?? 0) + r.calc.open);
    if (r.stage === "ATIVA" && r.calc.outstandingQty > 0) onSite.set(r.customerId, (onSite.get(r.customerId) ?? 0) + 1);
  }
  return (
    <>
      <PageHeader title="Clientes" subtitle={`${customers.length} cadastrados`} actions={<Link href="/clientes/novo" className="btn-primary">+ Cliente</Link>} />
      <form className="mb-3">
        <input name="q" defaultValue={term} className="input" type="search" placeholder="Buscar por nome, telefone ou responsável…" />
      </form>
      {customers.length === 0 ? (
        <Empty>Nenhum cliente encontrado.</Empty>
      ) : (
        <div className="card divide-y divide-slate-100 overflow-hidden">
          {customers.map((c) => (
            <Link key={c.id} href={`/clientes/${c.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50">
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">{c.name}</span>
                <span className="block truncate text-xs text-slate-500">{[c.type, c.phone, c.responsible].filter(Boolean).join(" · ")}</span>
              </span>
              <span className="flex shrink-0 flex-col items-end gap-1">
                {balance.get(c.id) ? <span className="text-xs font-semibold text-red-700 tnum">{money(balance.get(c.id))}</span> : null}
                <span className="flex gap-1">
                  {onSite.get(c.id) ? <Badge tone="blue">{onSite.get(c.id)} na obra</Badge> : null}
                  {c.status !== "Ativo" && <Badge tone={c.status === "Parceiro" ? "green" : "red"}>{c.status}</Badge>}
                </span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
