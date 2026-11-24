import Link from "next/link";
import { ChevronRight, HandCoins, HardHat, MessageCircle, Phone, Search, UserPlus, Users } from "lucide-react";
import { Badge } from "@/components/ui";
import { Avatar, EmptyState, Hero, HeroOverlap, HeroStat } from "@/components/screen-kit";
import { db } from "@/lib/db";
import { money, whatsappNumber } from "@/lib/format";
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
  const receivable = [...balance.values()].reduce((a, b) => a + b, 0);

  return (
    <>
      <Hero
        eyebrow="Clientes"
        title="Carteira de clientes"
        subtitle={`${customers.length} ${term ? `encontrado${customers.length === 1 ? "" : "s"} para “${term}”` : `cadastrado${customers.length === 1 ? "" : "s"}`}`}
        actions={
          <Link href="/clientes/novo" className="btn-accent">
            <UserPlus className="size-4" strokeWidth={2.2} aria-hidden /> Cliente
          </Link>
        }
      >
        <div className="grid grid-cols-2 gap-4 sm:max-w-lg">
          <HeroStat label="Com material na obra" icon={HardHat} amount={onSite.size} size="lg" tone="accent" />
          <HeroStat
            label="A receber"
            icon={HandCoins}
            amount={receivable}
            format="money"
            size="lg"
            tone={balance.size ? "red" : "green"}
            hint={balance.size ? `${balance.size} cliente${balance.size === 1 ? "" : "s"} em aberto` : "nada em aberto"}
          />
        </div>
      </Hero>

      <HeroOverlap>
        <form className="card relative mb-4 rounded-[20px] p-2" role="search">
          <Search className="pointer-events-none absolute top-1/2 left-5 size-[18px] -translate-y-1/2 text-slate-400" aria-hidden />
          <input
            name="q"
            defaultValue={term}
            className="input min-h-12 pl-10 ring-0 focus:ring-2"
            type="search"
            placeholder="Buscar por nome, telefone ou responsável…"
            aria-label="Buscar cliente"
          />
        </form>

        {customers.length === 0 ? (
          <div className="card rounded-[20px]">
            <EmptyState
              icon={Users}
              title={term ? "Nenhum cliente encontrado" : "Nenhum cliente ainda"}
              action={
                term ? (
                  <Link href="/clientes" className="btn-secondary">Limpar busca</Link>
                ) : (
                  <Link href="/clientes/novo" className="btn-primary">
                    <UserPlus className="size-4" aria-hidden /> Cadastrar cliente
                  </Link>
                )
              }
            >
              {term ? "Tente outro nome, telefone ou responsável." : "Os clientes também são criados ao digitar um nome novo na locação."}
            </EmptyState>
          </div>
        ) : (
          <ul className="card stagger divide-y divide-slate-100 overflow-hidden rounded-[20px]">
            {customers.map((c) => {
              const wa = whatsappNumber(c.phone);
              const due = balance.get(c.id);
              const sites = onSite.get(c.id);
              return (
                <li key={c.id} className="tap group relative flex min-h-[72px] items-center gap-3 px-4 py-3 hover:bg-slate-50 active:bg-slate-100 sm:px-5">
                  <Avatar name={c.name} />
                  <div className="min-w-0 flex-1">
                    <Link href={`/clientes/${c.id}`} className="block truncate text-[15px] font-semibold text-slate-900 after:absolute after:inset-0 after:content-['']">
                      {c.name}
                    </Link>
                    <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-slate-500">
                      <span className="truncate">{[c.type, c.responsible].filter(Boolean).join(" · ")}</span>
                      {c.phone && (
                        <span className="hidden shrink-0 items-center gap-1 tnum sm:inline-flex">
                          <Phone className="size-3" aria-hidden /> {c.phone}
                        </span>
                      )}
                    </div>
                    {(sites || c.status !== "Ativo") && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {sites ? <Badge tone="sky">{sites} na obra</Badge> : null}
                        {c.status !== "Ativo" && <Badge tone={c.status === "Parceiro" ? "green" : "red"}>{c.status}</Badge>}
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {due ? (
                      <span className="text-right">
                        <span className="block text-sm font-bold text-red-700 tnum">{money(due)}</span>
                        <span className="block text-[11px] text-slate-500">em aberto</span>
                      </span>
                    ) : null}
                    {wa && (
                      <a
                        href={`https://wa.me/${wa}`}
                        target="_blank"
                        rel="noreferrer"
                        className="relative z-10 flex size-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200/70 transition hover:bg-emerald-100 active:scale-95"
                        aria-label={`WhatsApp de ${c.name}`}
                        title={c.phone ?? undefined}
                      >
                        <MessageCircle className="size-[18px]" strokeWidth={2} aria-hidden />
                      </a>
                    )}
                    <ChevronRight className="hidden size-4 text-slate-300 transition-transform group-hover:translate-x-0.5 sm:block" aria-hidden />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </HeroOverlap>
    </>
  );
}
