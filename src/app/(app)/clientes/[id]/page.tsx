import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, PageHeader, Section, Stat } from "@/components/ui";
import { CustomerForm } from "@/components/customer-form";
import { RentalCard } from "@/components/rental-card";
import { ActionButton } from "@/components/rental-actions";
import { db } from "@/lib/db";
import { money, whatsappNumber } from "@/lib/format";
import { listRentals } from "@/lib/rentals";
import { deleteCustomer, deleteSite, saveCustomer } from "../actions";

export default async function ClientePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (id === "novo") {
    return (
      <>
        <PageHeader title="Novo cliente" back="/clientes" />
        <div className="card"><CustomerForm action={saveCustomer.bind(null, null)} /></div>
      </>
    );
  }
  const c = await db.customer.findUnique({ where: { id }, include: { sites: { orderBy: { createdAt: "desc" } } } });
  if (!c) notFound();
  const rentals = await listRentals({ customerId: id });
  const open = rentals.filter((r) => r.stage === "ATIVA" || r.stage === "ENCERRADA").reduce((s, r) => s + Math.max(0, r.calc.open), 0);
  const billed = rentals.filter((r) => r.stage === "ATIVA" || r.stage === "ENCERRADA").reduce((s, r) => s + r.calc.total, 0);
  const onSite = rentals.filter((r) => r.stage === "ATIVA" && r.calc.outstandingQty > 0).length;
  const wa = whatsappNumber(c.phone);

  return (
    <>
      <PageHeader
        title={c.name}
        back="/clientes"
        subtitle={
          <span className="flex flex-wrap items-center gap-1.5">
            <Badge>{c.type}</Badge>
            {c.status !== "Ativo" && <Badge tone={c.status === "Parceiro" ? "green" : "red"}>{c.status}</Badge>}
          </span>
        }
        actions={
          <>
            {wa && <a className="btn-secondary" href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer">WhatsApp</a>}
            <Link href={`/locacoes/nova?cliente=${c.id}`} className="btn-primary">+ Locação</Link>
          </>
        }
      />
      <div className="mb-4 grid grid-cols-3 gap-3">
        <Stat label="Na obra" value={onSite} />
        <Stat label="Já locou" value={money(billed)} />
        <Stat label="Em aberto" value={money(open)} tone={open > 0 ? "red" : "green"} />
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <Section title={`Locações (${rentals.length})`}>
          {rentals.length ? (
            <div className="divide-y divide-slate-100">{rentals.map((r) => <RentalCard key={r.id} r={r} />)}</div>
          ) : (
            <p className="px-4 py-6 text-center text-sm text-slate-500">Nenhuma locação ainda.</p>
          )}
        </Section>
        <div className="space-y-4">
          <Section title="Dados">
            <CustomerForm action={saveCustomer.bind(null, c.id)} initial={c} />
          </Section>
          <Section title="Endereços de obra usados">
            {c.sites.length ? (
              <ul className="divide-y divide-slate-100 text-sm">
                {c.sites.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-2 px-4 py-2">
                    <span>{s.address}</span>
                    <ActionButton className="text-xs text-red-600 hover:underline" action={deleteSite.bind(null, c.id, s.id)}>remover</ActionButton>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-4 py-4 text-sm text-slate-500">Os endereços aparecem aqui ao criar locações.</p>
            )}
          </Section>
          {rentals.length === 0 && (
            <ActionButton className="btn-danger w-full" confirm="Excluir este cliente?" action={deleteCustomer.bind(null, c.id)}>
              Excluir cliente
            </ActionButton>
          )}
        </div>
      </div>
    </>
  );
}
