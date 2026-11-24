import Link from "next/link";
import { notFound } from "next/navigation";
import { ClipboardList, HandCoins, HardHat, MapPin, MessageCircle, Phone, Plus, Receipt, StickyNote, Trash2, UserRound, Wallet } from "lucide-react";
import { Avatar, Badge, BalanceCard, Chip, IconBox, Section, TopBar } from "@/components/ui";
import { CustomerForm } from "@/components/customer-form";
import { RentalCard } from "@/components/rental-card";
import { ActionButton } from "@/components/rental-actions";
import { EmptyState, NavyStat } from "@/components/screen-kit";
import { db } from "@/lib/db";
import { money, whatsappNumber } from "@/lib/format";
import { listRentals } from "@/lib/rentals";
import { deleteCustomer, deleteSite, saveCustomer } from "../actions";

export default async function ClientePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (id === "novo") {
    return (
      <>
        <TopBar back="/clientes" eyebrow="Novo cadastro" title="Novo cliente" subtitle="Os endereços de obra entram sozinhos ao criar locações." />
        <div className="card mx-auto max-w-2xl">
          <CustomerForm action={saveCustomer.bind(null, null)} />
        </div>
      </>
    );
  }
  const c = await db.customer.findUnique({ where: { id }, include: { sites: { orderBy: { createdAt: "desc" } } } });
  if (!c) notFound();
  const rentals = await listRentals({ customerId: id });
  const counted = rentals.filter((r) => r.stage === "ATIVA" || r.stage === "ENCERRADA");
  const open = counted.reduce((s, r) => s + Math.max(0, r.calc.open), 0);
  const billed = counted.reduce((s, r) => s + r.calc.total, 0);
  const paid = counted.reduce((s, r) => s + r.calc.paid, 0);
  const onSite = rentals.filter((r) => r.stage === "ATIVA" && r.calc.outstandingQty > 0).length;
  const wa = whatsappNumber(c.phone);
  const paidPct = paid + open > 0 ? Math.min(100, Math.round((paid / (paid + open)) * 100)) : 100;

  return (
    <>
      <TopBar
        back="/clientes"
        eyebrow={c.type}
        title={c.name}
        subtitle={
          <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px]">
            {c.status !== "Ativo" && <Badge tone={c.status === "Parceiro" ? "green" : "red"}>{c.status}</Badge>}
            {c.responsible && (
              <span className="inline-flex items-center gap-1">
                <UserRound className="size-3.5" aria-hidden /> {c.responsible}
              </span>
            )}
            {c.phone && (
              <span className="inline-flex items-center gap-1 tnum">
                <Phone className="size-3.5" aria-hidden /> {c.phone}
              </span>
            )}
          </span>
        }
        actions={
          <>
            {wa && (
              <a className="btn-round text-emerald-600" href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" aria-label="WhatsApp" title="WhatsApp">
                <MessageCircle className="size-5" strokeWidth={2} />
              </a>
            )}
            <Link href={`/locacoes/nova?cliente=${c.id}`} className="btn-primary rounded-full">
              <Plus className="size-4" strokeWidth={2.4} aria-hidden /> Locação
            </Link>
          </>
        }
      />

      <BalanceCard
        className="mb-4 lg:mb-5"
        label="Em aberto"
        icon={<HandCoins />}
        amount={open}
        actions={<Avatar name={c.name} size="lg" tone="accent" className="hidden shadow-lg shadow-accent-700/30 sm:inline-flex" />}
        chips={
          <>
            <Chip tone={open > 0.009 ? "glass-red" : "glass"}>{open > 0.009 ? `${100 - paidPct}% a receber` : "Tudo pago"}</Chip>
            <Chip tone="glass-yellow" icon={<HardHat />}>
              {onSite} na obra
            </Chip>
          </>
        }
      >
        <div className="h-2.5 overflow-hidden rounded-full bg-white/10" role="img" aria-label={`${paidPct}% recebido`}>
          <div className="bar-fill h-full rounded-full bg-emerald-300" style={{ width: `${paidPct}%` }} />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 min-[400px]:grid-cols-3">
          <NavyStat label="Já locou">{money(billed)}</NavyStat>
          <NavyStat label="Recebido" tone="green">
            {money(paid)}
          </NavyStat>
          <div className="hidden min-[400px]:block">
            <NavyStat label="Locações">{rentals.length}</NavyStat>
          </div>
        </div>
      </BalanceCard>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-5">
        <div className="space-y-4">
          <Section title="Locações" icon={<ClipboardList />} description={`${rentals.length} no histórico`}>
            {rentals.length ? (
              <div className="divide-y divide-slate-100">
                {rentals.map((r) => (
                  <RentalCard key={r.id} r={r} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={ClipboardList}
                title="Nenhuma locação ainda"
                action={
                  <Link href={`/locacoes/nova?cliente=${c.id}`} className="btn-primary">
                    <Plus className="size-4" aria-hidden /> Nova locação
                  </Link>
                }
              >
                As locações deste cliente aparecem aqui, com a situação do material e do pagamento.
              </EmptyState>
            )}
          </Section>
        </div>

        <div className="space-y-4">

          <Section title="Obras" icon={<MapPin />} iconTone="sky" description={c.sites.length ? `${c.sites.length} endereço${c.sites.length === 1 ? "" : "s"}` : undefined}>
            {c.sites.length ? (
              <ul className="divide-y divide-slate-100">
                {c.sites.map((s) => (
                  <li key={s.id} className="flex min-h-14 items-center gap-3 px-4 py-2.5 sm:px-5">
                    <IconBox tone="sky" size="md" round><MapPin /></IconBox>
                    <span className="min-w-0 flex-1 text-sm break-words text-slate-800">{s.address}</span>
                    <ActionButton
                      className="btn-ghost btn-sm shrink-0 text-slate-400 hover:bg-red-50 hover:text-red-700"
                      action={deleteSite.bind(null, c.id, s.id)}
                    >
                      <Trash2 className="size-4" aria-hidden />
                      <span className="sr-only">Remover endereço</span>
                    </ActionButton>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-5 text-sm text-slate-500">Os endereços aparecem aqui ao criar locações.</p>
            )}
          </Section>

          {c.notes && (
            <div className="card-soft flex gap-3 p-4">
              <IconBox tone="accent" size="md" round><StickyNote /></IconBox>
              <p className="min-w-0 text-sm break-words whitespace-pre-line text-slate-700">{c.notes}</p>
            </div>
          )}

          <Section title="Dados do cliente" icon={<UserRound />}>
            <CustomerForm action={saveCustomer.bind(null, c.id)} initial={c} />
          </Section>

          {rentals.length === 0 && (
            <ActionButton className="btn-danger w-full rounded-full" confirm="Excluir este cliente?" action={deleteCustomer.bind(null, c.id)}>
              <Trash2 className="size-4" aria-hidden /> Excluir cliente
            </ActionButton>
          )}
        </div>
      </div>
    </>
  );
}
