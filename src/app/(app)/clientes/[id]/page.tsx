import Link from "next/link";
import { notFound } from "next/navigation";
import { ClipboardList, HandCoins, HardHat, MapPin, MessageCircle, Phone, Plus, Receipt, StickyNote, Trash2, UserRound, Wallet } from "lucide-react";
import { Avatar, Badge } from "@/components/ui";
import { CustomerForm } from "@/components/customer-form";
import { RentalCard } from "@/components/rental-card";
import { ActionButton } from "@/components/rental-actions";
import { EmptyState, Hero, HeroOverlap, HeroStat, IconTile, Panel, navyBtn } from "@/components/screen-kit";
import { db } from "@/lib/db";
import { money, whatsappNumber } from "@/lib/format";
import { listRentals } from "@/lib/rentals";
import { deleteCustomer, deleteSite, saveCustomer } from "../actions";

export default async function ClientePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (id === "novo") {
    return (
      <>
        <Hero
          back={{ href: "/clientes", label: "Clientes" }}
          eyebrow="Novo cadastro"
          title="Novo cliente"
          subtitle="Os endereços de obra entram sozinhos ao criar locações."
        />
        <HeroOverlap>
          <div className="card mx-auto max-w-2xl">
            <CustomerForm action={saveCustomer.bind(null, null)} />
          </div>
        </HeroOverlap>
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
      <Hero
        back={{ href: "/clientes", label: "Clientes" }}
        lead={<Avatar name={c.name} size="lg" tone="accent" className="shadow-lg shadow-accent-700/30" />}
        title={c.name}
        subtitle={
          <span className="mt-1 flex flex-wrap items-center gap-1.5">
            <Badge>{c.type}</Badge>
            {c.status !== "Ativo" && <Badge tone={c.status === "Parceiro" ? "green" : "red"}>{c.status}</Badge>}
            {c.responsible && (
              <span className="inline-flex items-center gap-1 text-xs text-white/65">
                <UserRound className="size-3.5" aria-hidden /> {c.responsible}
              </span>
            )}
            {c.phone && (
              <span className="inline-flex items-center gap-1 text-xs text-white/65 tnum">
                <Phone className="size-3.5" aria-hidden /> {c.phone}
              </span>
            )}
          </span>
        }
        actions={
          <>
            {wa && (
              <a className={navyBtn} href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer">
                <MessageCircle className="size-4 text-emerald-300" strokeWidth={2.2} aria-hidden /> WhatsApp
              </a>
            )}
            <Link href={`/locacoes/nova?cliente=${c.id}`} className="btn-accent">
              <Plus className="size-4" strokeWidth={2.4} aria-hidden /> Locação
            </Link>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-x-4 gap-y-5 sm:max-w-2xl sm:grid-cols-3">
          <div className="col-span-2 sm:col-span-1">
            <HeroStat label="Na obra" icon={HardHat} amount={onSite} tone="accent" hint={onSite === 1 ? "locação" : "locações"} />
          </div>
          <HeroStat label="Já locou" icon={Receipt} amount={billed} format="money" />
          <HeroStat label="Em aberto" icon={HandCoins} amount={open} format="money" tone={open > 0 ? "red" : "green"} />
        </div>
      </Hero>

      <HeroOverlap className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <Panel title="Locações" icon={ClipboardList} count={rentals.length}>
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
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel title="Resumo financeiro" icon={Wallet}>
            <div className="px-4 pt-4 pb-5 sm:px-5">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <div className="text-xs font-medium text-slate-500">Recebido</div>
                  <div className="text-xl font-bold tracking-tight text-emerald-600 tnum">{money(paid)}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-medium text-slate-500">Em aberto</div>
                  <div className={`text-xl font-bold tracking-tight tnum ${open > 0 ? "text-red-700" : "text-slate-400"}`}>{money(open)}</div>
                </div>
              </div>
              <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-red-100" role="img" aria-label={`${paidPct}% recebido`}>
                <div className="h-full rounded-full bg-linear-to-r from-emerald-500 to-emerald-400" style={{ width: `${paidPct}%` }} />
              </div>
              <dl className="mt-4 space-y-2 border-t border-slate-100 pt-3 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Total locado</dt>
                  <dd className="font-semibold text-slate-900 tnum">{money(billed)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Locações com saldo</dt>
                  <dd className="font-semibold text-slate-900 tnum">{counted.filter((r) => r.calc.open > 0.009).length}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Recebido do total</dt>
                  <dd className="font-semibold text-slate-900 tnum">{paidPct}%</dd>
                </div>
              </dl>
            </div>
          </Panel>

          <Panel title="Obras" icon={MapPin} count={c.sites.length}>
            {c.sites.length ? (
              <ul className="divide-y divide-slate-100">
                {c.sites.map((s) => (
                  <li key={s.id} className="flex min-h-14 items-center gap-3 px-5 py-2.5">
                    <IconTile icon={MapPin} tone="sky" size="sm" />
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
          </Panel>

          {c.notes && (
            <div className="card flex gap-3 border-accent-200 bg-accent-50/60 p-4">
              <IconTile icon={StickyNote} tone="accent" size="sm" />
              <p className="min-w-0 text-sm break-words whitespace-pre-line text-slate-700">{c.notes}</p>
            </div>
          )}

          <Panel title="Dados do cliente" icon={UserRound}>
            <CustomerForm action={saveCustomer.bind(null, c.id)} initial={c} />
          </Panel>

          {rentals.length === 0 && (
            <ActionButton className="btn-danger w-full" confirm="Excluir este cliente?" action={deleteCustomer.bind(null, c.id)}>
              <Trash2 className="size-4" aria-hidden /> Excluir cliente
            </ActionButton>
          )}
        </div>
      </HeroOverlap>
    </>
  );
}
