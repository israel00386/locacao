import Link from "next/link";
import { ChevronRight, HandCoins, HardHat, MessageCircle, Phone, Search, UserPlus, Users } from "lucide-react";
import { Avatar, Badge, BalanceCard, Chip, SegmentedTabs, Stat, TopBar } from "@/components/ui";
import { EmptyState } from "@/components/screen-kit";
import { db } from "@/lib/db";
import { money, whatsappNumber } from "@/lib/format";
import { listRentals } from "@/lib/rentals";

export const metadata = { title: "Clientes" };

export default async function ClientesPage({ searchParams }: { searchParams: Promise<{ q?: string; f?: string }> }) {
  const { q = "", f = "" } = await searchParams;
  const filter = f === "obra" || f === "aberto" ? f : "todos";
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

  const shown = customers.filter((c) => (filter === "obra" ? onSite.has(c.id) : filter === "aberto" ? balance.has(c.id) : true));
  const qs = (ff: string) => {
    const p = new URLSearchParams();
    if (term) p.set("q", term);
    if (ff !== "todos") p.set("f", ff);
    const t = p.toString();
    return `/clientes${t ? `?${t}` : ""}`;
  };

  return (
    <>
      <TopBar
        title="Clientes"
        subtitle={`${customers.length} ${term ? `encontrado${customers.length === 1 ? "" : "s"} para “${term}”` : `cadastrado${customers.length === 1 ? "" : "s"}`}`}
        actions={
          <Link href="/clientes/novo" className="btn-primary rounded-full">
            <UserPlus className="size-4" strokeWidth={2.2} aria-hidden /> Cliente
          </Link>
        }
      />

      <div className="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5">
        <BalanceCard
          className="lg:col-span-7"
          label="A receber dos clientes"
          icon={<HandCoins />}
          amount={receivable}
          chips={
            <>
              <Chip tone={balance.size ? "glass-red" : "glass"}>{balance.size ? `${balance.size} cliente${balance.size === 1 ? "" : "s"} em aberto` : "nada em aberto"}</Chip>
              <Chip tone="glass-yellow" icon={<HardHat />}>
                {onSite.size} com material na obra
              </Chip>
            </>
          }
        />
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:col-span-5">
          <Stat label="Com material na obra" icon={<HardHat />} amount={onSite.size} hint="clientes" />
          <Stat label="Em aberto" icon={<HandCoins />} tone={balance.size ? "red" : undefined} amount={balance.size} hint="clientes devendo" />
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <form className="relative min-w-0 flex-1" role="search">
          <Search className="pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2 text-slate-400" aria-hidden />
          {filter !== "todos" && <input type="hidden" name="f" value={filter} />}
          <input
            name="q"
            defaultValue={term}
            className="input min-h-[52px] rounded-full border-transparent bg-white pl-11 shadow-[var(--shadow-card)]"
            type="search"
            placeholder="Buscar por nome, telefone ou responsável…"
            aria-label="Buscar cliente"
          />
        </form>
        <SegmentedTabs
          ariaLabel="Filtrar clientes"
          className="w-full sm:w-fit [&>*]:flex-1 sm:[&>*]:flex-none"
          items={[
            { label: "Todos", href: qs("todos") },
            { label: "Na obra", href: qs("obra"), count: onSite.size },
            { label: "Em aberto", href: qs("aberto"), count: balance.size },
          ]}
          active={qs(filter)}
        />
      </div>

        {shown.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={Users}
              title={term || filter !== "todos" ? "Nenhum cliente encontrado" : "Nenhum cliente ainda"}
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
          <ul className="card divide-y divide-slate-100/80 overflow-hidden lg:grid lg:grid-cols-2 lg:divide-y-0">
            {shown.map((c) => {
              const wa = whatsappNumber(c.phone);
              const due = balance.get(c.id);
              const sites = onSite.get(c.id);
              return (
                <li key={c.id} className="tap group relative flex min-h-[76px] items-center gap-3 px-4 py-3 hover:bg-slate-50/70 active:bg-slate-100 sm:px-5 lg:border-b lg:border-slate-100/80">
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
                    {(sites || due || c.status !== "Ativo") && (
                      <div className="mt-1.5 flex flex-wrap items-center gap-1">
                        {due ? <span className="mr-1 text-xs font-bold text-red-700 tnum sm:hidden">{money(due)} em aberto</span> : null}
                        {sites ? <Badge tone="sky">{sites} na obra</Badge> : null}
                        {c.status !== "Ativo" && <Badge tone={c.status === "Parceiro" ? "green" : "red"}>{c.status}</Badge>}
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {due ? (
                      <span className="hidden text-right sm:block">
                        <span className="block text-sm font-bold text-red-700 tnum">{money(due)}</span>
                        <span className="block text-[11px] text-slate-500">em aberto</span>
                      </span>
                    ) : null}
                    {wa && (
                      <a
                        href={`https://wa.me/${wa}`}
                        target="_blank"
                        rel="noreferrer"
                        className="relative z-10 flex size-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200/70 transition hover:bg-emerald-100 active:scale-95"
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
    </>
  );
}
